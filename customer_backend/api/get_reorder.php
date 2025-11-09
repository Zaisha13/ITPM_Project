<?php
ob_start();
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . (defined('API_ALLOWED_ORIGIN') ? API_ALLOWED_ORIGIN : '*'));
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); ob_end_flush(); exit; }

// ORDER INFO AND DETAILS ARE FETCHED TO ORDER FORM (add_order.php)


include_once(__DIR__ . '/../../includes/db_connection.php');
if (!$conn) { echo json_encode(["status"=>"error","message"=>"DB connection failed"]); ob_end_flush(); exit; }

// Get OrderID from request
$OrderID = isset($_GET['OrderID']) ? (int)$_GET['OrderID'] : null;
if (!$OrderID) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing or invalid OrderID']);
    ob_end_flush(); exit;
}

// Map order category ID -> UI-friendly name
$orderCategoryMap = [
    1 => 'Refill',
    2 => 'Brand New'
];

// UI-to-DB and DB-to-UI container mapping
$uiToDbContainerMap = [1 => 2, 2 => 1, 3 => 3]; // UI: Round=1, Slim=2, Wilkins=3 -> DB: Slim=1, Round=2, Wilkins=3
$dbToUiContainerMap = array_flip($uiToDbContainerMap);

try {
    // 1) Fetch order details from tbl_orders
    $stmt = $conn->prepare("SELECT o.CustomerID, o.DeliveryDetailID, o.MOPID, o.ReceivingMethodID, 
                           d.DeliveryAddress, o.OrderStatusID 
                            FROM tbl_orders o 
                            LEFT JOIN tbl_delivery_details d ON o.DeliveryDetailID = d.DeliveryDetailID 
                            WHERE o.OrderID = ?");
    $stmt->execute([$OrderID]);
    $order = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$order) {
        throw new Exception('Order not found or not completed');
    }

    // 2) Fetch order details from tbl_order_details
    $stmt = $conn->prepare("SELECT ContainerTypeID, OrderCategoryID, Quantity 
                            FROM tbl_order_details 
                            WHERE OrderID = ?");
    $stmt->execute([$OrderID]);
    $orderDetails = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($orderDetails)) {
        throw new Exception('No order details found');
    }

    // 3) Prepare response data compatible with add_order.php
    $items = [];
    foreach ($orderDetails as $detail) {
        $uiContainerID = $dbToUiContainerMap[$detail['ContainerTypeID']] ?? $detail['ContainerTypeID'];
        $items[] = [
            'containerTypeID' => $uiContainerID,
            'orderCategory' => $orderCategoryMap[$detail['OrderCategoryID']] ?? 'Brand New',
            'quantity' => (int)$detail['Quantity']
        ];
    }

    $response = [
        'success' => true,
        'customerID' => $order['CustomerID'],
        'useHouseAddress' => false, // Force use of provided delivery address for flexibility
        'deliveryAddress' => $order['DeliveryAddress'],
        'mopID' => $order['MOPID'],
        'receivingMethodID' => $order['ReceivingMethodID'],
        'items' => $items
    ];

    echo json_encode($response);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Error fetching reorder data', 'error' => $e->getMessage()]);
}
ob_end_flush();