<?php
ob_start();
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . (defined('API_ALLOWED_ORIGIN') ? API_ALLOWED_ORIGIN : '*'));
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); ob_end_flush(); exit; }

// ORDER FORM 

include_once(__DIR__ . '/../../includes/db_connection.php');
if (!$conn) { echo json_encode(["status"=>"error","message"=>"DB connection failed"]); ob_end_flush(); exit; }

// Read JSON body
$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON body']);
    ob_end_flush(); exit;
}

/*
Expected JSON shape:
{
  "customerID": 5,
  "useHouseAddress": true,
  "deliveryAddress": "some other addr",
  "mopID": 2,
  "receivingMethodID": 2,
  "items": [
    { "containerTypeID": 1, "orderCategory": "Refill", "quantity": 2 },
    { "containerTypeID": 2, "orderCategory": "New Gallon", "quantity": 1 },
    { "containerTypeID": 3, "orderCategory": "Refill", "quantity": 2 }
  ]
}
*/

$required = ['customerID','mopID','receivingMethodID','items'];
foreach ($required as $r) {
    if (!isset($input[$r])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => "Missing required field: $r"]);
        exit;
    }
}

$customerID = (int)$input['customerID'];
$mopID = (int)$input['mopID'];
$receivingMethodID = (int)$input['receivingMethodID'];
$items = $input['items'];
$useHouseAddress = !empty($input['useHouseAddress']);
$providedDeliveryAddress = isset($input['deliveryAddress']) ? trim($input['deliveryAddress']) : null;

if (!is_array($items) || count($items) === 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Items must be a non-empty array']);
    exit;
}

// Map order category name -> ID as in tbl_order_category (Refill=1, New Gallon=2)
$orderCategoryMap = [
    'Refill' => 1,
    'New Gallon' => 2,
    'NewGallon' => 2,
    'Brand New' => 2,
    'brand new' => 2
];

// ✅ UI box-to-database container mapping
// UI: 1 = Round, 2 = Slim, 3 = Wilkins (Small)
// DB: 1 = Slim, 2 = Round, 3 = Wilkins
$uiToDbContainerMap = [
    1 => 2, // Box 1 (Round) → DB ID 2
    2 => 1, // Box 2 (Slim)  → DB ID 1
    3 => 3  // Box 3 (Wilkins Small) → DB ID 3
];

try {
    $conn->beginTransaction();

    // 1) Validate existence of the referenced IDs: customer, mop, receivingMethod
    $stmt = $conn->prepare("SELECT CustomerID, HouseAddress FROM tbl_customer WHERE CustomerID = ?");
    $stmt->execute([$customerID]);
    $customer = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$customer) {
        throw new Exception('Customer not found');
    }

    $stmt = $conn->prepare("SELECT MOPID FROM tbl_mop WHERE MOPID = ?");
    $stmt->execute([$mopID]);
    if (!$stmt->fetch()) throw new Exception('Invalid mopID');

    $stmt = $conn->prepare("SELECT ReceivingMethodID FROM tbl_receiving_method WHERE ReceivingMethodID = ?");
    $stmt->execute([$receivingMethodID]);
    if (!$stmt->fetch()) throw new Exception('Invalid receivingMethodID');

    // 2) Resolve delivery address: either customer's HouseAddress or providedDeliveryAddress
    if ($useHouseAddress) {
        $deliveryAddress = $customer['HouseAddress'];
        if (empty($deliveryAddress)) throw new Exception('Customer has no HouseAddress in profile');
    } else {
        if (empty($providedDeliveryAddress)) {
            throw new Exception('Delivery address required when useHouseAddress is false');
        }
        $deliveryAddress = $providedDeliveryAddress;
    }

    // 3) Check if that delivery address already exists for this customer -> reuse DeliveryDetailID
    $stmt = $conn->prepare("SELECT DeliveryDetailID FROM tbl_delivery_details WHERE CustomerID = ? AND DeliveryAddress = ? LIMIT 1");
    $stmt->execute([$customerID, $deliveryAddress]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row) {
        $deliveryDetailID = (int)$row['DeliveryDetailID'];
    } else {
        $stmt = $conn->prepare("INSERT INTO tbl_delivery_details (CustomerID, DeliveryAddress) VALUES (?, ?)");
        $stmt->execute([$customerID, $deliveryAddress]);
        $deliveryDetailID = (int)$conn->lastInsertId();
    }

    // 4) Calculate total amount and prepare order_details data
    $totalAmount = 0.00;
    $orderDetailsRows = [];

    $priceStmt = $conn->prepare("SELECT ContainerTypeID, RefillPrice, NewContainerPrice FROM tbl_container_type WHERE ContainerTypeID = ?");

    foreach ($items as $idx => $it) {
        if (!isset($it['containerTypeID']) || !isset($it['orderCategory']) || !isset($it['quantity'])) {
            throw new Exception("Each item must contain containerTypeID, orderCategory and quantity (problem at index $idx)");
        }

        // 🔁 Convert UI container type to real DB ID
        $uiID = (int)$it['containerTypeID'];
        $ctid = isset($uiToDbContainerMap[$uiID]) ? $uiToDbContainerMap[$uiID] : $uiID;

        $catRaw = $it['orderCategory'];
        $qty = (int)$it['quantity'];
        if ($qty <= 0) throw new Exception("Quantity must be >= 1 (index $idx)");

        // Map order category
        $catID = is_numeric($catRaw)
            ? (int)$catRaw
            : ($orderCategoryMap[trim($catRaw)] ?? null);
        if (!$catID) throw new Exception("Unknown orderCategory '{$catRaw}' at item index $idx");

        // Fetch price
        $priceStmt->execute([$ctid]);
        $priceRow = $priceStmt->fetch(PDO::FETCH_ASSOC);
        if (!$priceRow) throw new Exception("ContainerTypeID {$ctid} not found (index $idx)");

        if ($catID === 1) { // Refill
            $unit = (float)$priceRow['RefillPrice'];
        } else { // New Gallon (2)
            if ($priceRow['NewContainerPrice'] === null) {
                throw new Exception("NewContainerPrice not set for containerTypeID {$ctid} (index $idx)");
            }
            $unit = (float)$priceRow['NewContainerPrice'];
        }

        $lineTotal = $unit * $qty;
        $totalAmount += $lineTotal;

        $orderDetailsRows[] = [
            'containerTypeID' => $ctid,
            'orderCategoryID' => $catID,
            'quantity' => $qty
        ];
    }

    // 5) Calculate OrderDate based on operating hours (8am-5pm)
    // Business Rules:
    // - Orders placed after 5pm (17:00) to 11:59pm -> OrderDate = next day
    // - Orders placed from 12am (00:00) to before 8am (08:00) -> OrderDate = current day
    // - Orders placed from 8am (08:00) to 5pm (17:00) -> OrderDate = current day
    $now = new DateTime('now', new DateTimeZone('Asia/Manila')); // Adjust timezone as needed
    $currentHour = (int)$now->format('H');
    $currentDate = clone $now;
    
    // If order is placed after 5pm (17:00), set OrderDate to next day
    if ($currentHour >= 17) {
        $currentDate->modify('+1 day');
    }
    // Otherwise, OrderDate = current day (covers 12am-7:59am and 8am-4:59pm)
    
    $orderDate = $currentDate->format('Y-m-d');

    // 6) Insert into tbl_orders
    $orderTypeID = 2; // Online
    $orderStatusID = 1; // For Approval
    $paymentStatusID = 1; // Pending

    $insertOrderSql = "INSERT INTO tbl_orders 
        (CustomerID, OrderTypeID, OrderStatusID, ReceivingMethodID, MOPID, PaymentStatusID, TotalAmount, DeliveryDetailID, OrderDate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($insertOrderSql);
    $stmt->execute([
        $customerID, $orderTypeID, $orderStatusID, $receivingMethodID, $mopID, $paymentStatusID, number_format($totalAmount, 2, '.', ''), $deliveryDetailID, $orderDate
    ]);
    $orderID = (int)$conn->lastInsertId();

    // 7) Insert order details
    $insertDetailStmt = $conn->prepare("INSERT INTO tbl_order_details (OrderID, ContainerTypeID, OrderCategoryID, Quantity) VALUES (?, ?, ?, ?)");
    foreach ($orderDetailsRows as $r) {
        $insertDetailStmt->execute([$orderID, $r['containerTypeID'], $r['orderCategoryID'], $r['quantity']]);
    }

    // 8) Update container stock for each 'New Gallon' item (OrderCategoryID = 2)
    // Use conditional UPDATE to ensure stock doesn't go negative; if not enough stock, throw error.
    $updateStockStmt = $conn->prepare("
        UPDATE tbl_container_count
        SET Stock = Stock - ?
        WHERE ContainerTypeID = ? AND Stock >= ?
    ");

    foreach ($orderDetailsRows as $r) {
        if ($r['orderCategoryID'] === 2) { // New container purchase
            // Execute update
            $updateStockStmt->execute([$r['quantity'], $r['containerTypeID'], $r['quantity']]);
            // If rowCount == 0, either row doesn't exist or not enough stock
            if ($updateStockStmt->rowCount() === 0) {
                // To give a clearer error, check if a row exists at all
                $chk = $conn->prepare("SELECT Stock FROM tbl_container_count WHERE ContainerTypeID = ?");
                $chk->execute([$r['containerTypeID']]);
                $exists = $chk->fetch(PDO::FETCH_ASSOC);
                if (!$exists) {
                    throw new Exception("Stock record not found for container ID {$r['containerTypeID']}");
                } else {
                    throw new Exception("Not enough stock for container ID {$r['containerTypeID']}. Available: {$exists['Stock']}, required: {$r['quantity']}");
                }
            }
        }
    }

    $conn->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Order created and stock updated',
        'orderID' => $orderID,
        'totalAmount' => number_format($totalAmount, 2, '.', '')
    ]);

} catch (Exception $e) {
    if ($conn->inTransaction()) $conn->rollBack();
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Error creating order', 'error' => $e->getMessage()]);
}
ob_end_flush();
