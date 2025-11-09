<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Methods: POST");

include_once(__DIR__ . '/../../includes/db_connection.php');
if (!$conn) {
    die(json_encode(["status" => "error", "message" => "Database connection failed."]));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    // ==========================================
    // 1️⃣ VALIDATION
    // ==========================================
    if (empty($data['order']['items'])) {
        echo json_encode(['success' => false, 'error' => 'Order items are required']);
        exit;
    }

    if (!isset($data['customer']['customerId']) || $data['customer']['customerId'] === null) {
        if (
            empty($data['customer']['firstName']) ||
            empty($data['customer']['lastName']) ||
            empty($data['customer']['phone']) ||
            empty($data['order']['deliveryAddress'])
        ) {
            echo json_encode(['success' => false, 'error' => 'Missing required customer details']);
            exit;
        }
    }

    try {
        $conn->beginTransaction();

        // ==========================================
        // 2️⃣ HANDLE CUSTOMER
        // ==========================================
        $customer = $data['customer'];
        $order = $data['order'];
        $isManualEntry = isset($data['isManualEntry']) && $data['isManualEntry'] === true;

        if (!isset($customer['customerId']) || $customer['customerId'] === null) {
            // ➕ NEW CUSTOMER (walk-in, first order)
            $firstAddress = $order['deliveryAddress']; // single address input
            $customerTypeId = $customer['customerTypeId'] ?? null;
            if ($isManualEntry) {
                $customerTypeId = 3;
            } elseif (!$customerTypeId) {
                $customerTypeId = 1;
            }

            $stmt = $conn->prepare("
                INSERT INTO tbl_customer (CustomerTypeID, AccountID, FirstName, LastName, Phone, HouseAddress)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $customerTypeId,
                null,
                $customer['firstName'],
                $customer['lastName'],
                $customer['phone'],
                $firstAddress
            ]);
            $customerId = $conn->lastInsertId();

            // Also store this as a delivery address for reusability
            $stmt = $conn->prepare("
                INSERT INTO tbl_delivery_details (CustomerID, DeliveryAddress)
                VALUES (?, ?)
            ");
            $stmt->execute([$customerId, $firstAddress]);
            $deliveryDetailId = $conn->lastInsertId();

        } else {
            // ♻️ EXISTING CUSTOMER (autofilled)
            $customerId = (int)$customer['customerId'];
            $stmt = $conn->prepare("SELECT * FROM tbl_customer WHERE CustomerID = ?");
            $stmt->execute([$customerId]);
            $existingCustomer = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$existingCustomer) {
                throw new Exception("Customer ID {$customerId} not found");
            }

            // Use provided address or fallback to stored one
            $deliveryAddr = $order['deliveryAddress'] ?? $existingCustomer['HouseAddress'];

            // Check if this address already exists for this customer
            $stmt = $conn->prepare("
                SELECT DeliveryDetailID FROM tbl_delivery_details
                WHERE CustomerID = ? AND DeliveryAddress = ?
            ");
            $stmt->execute([$customerId, $deliveryAddr]);
            $deliveryDetailId = $stmt->fetchColumn();

            if (!$deliveryDetailId) {
                // Insert new delivery address (but don’t change HouseAddress)
                $stmt = $conn->prepare("
                    INSERT INTO tbl_delivery_details (CustomerID, DeliveryAddress)
                    VALUES (?, ?)
                ");
                $stmt->execute([$customerId, $deliveryAddr]);
                $deliveryDetailId = $conn->lastInsertId();
            }
        }

        // ==========================================
        // 3️⃣ CALCULATE TOTAL
        // ==========================================
        $total = 0.0;
        foreach ($order['items'] as $item) {
            $priceCol = ($item['orderCategoryId'] == 1) ? 'RefillPrice' : 'NewContainerPrice';
            $stmt = $conn->prepare("SELECT $priceCol AS price FROM tbl_container_type WHERE ContainerTypeID = ?");
            $stmt->execute([$item['containerTypeId']]);
            $price = $stmt->fetchColumn();

            if ($price === false) {
                throw new Exception("Invalid ContainerTypeID: {$item['containerTypeId']}");
            }

            if ($item['orderCategoryId'] == 2 && $item['containerTypeId'] == 3) {
                throw new Exception("New purchases are not available for Small containers");
            }

            $total += $price * $item['quantity'];

            // Deduct stock if it's a new container
            if ($item['orderCategoryId'] == 2) {
                $stmtStock = $conn->prepare("SELECT Stock FROM tbl_container_count WHERE ContainerTypeID = ? FOR UPDATE");
                $stmtStock->execute([$item['containerTypeId']]);
                $stock = $stmtStock->fetchColumn();

                if ($stock === false || $stock < $item['quantity']) {
                    throw new Exception("Insufficient stock for ContainerTypeID {$item['containerTypeId']}");
                }

                $conn->prepare("UPDATE tbl_container_count SET Stock = Stock - ? WHERE ContainerTypeID = ?")
                     ->execute([$item['quantity'], $item['containerTypeId']]);
            }
        }

        // ==========================================
        // 4️⃣ CALCULATE ORDERDATE
        // ==========================================
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

        // ==========================================
        // 5️⃣ INSERT ORDER
        // ==========================================
        // For manual order entry (admin), set OrderTypeID to 1 (Walk-in) and OrderStatusID to 3 (Pending)
        // For online orders, use provided orderTypeId and OrderStatusID 1 (For Approval)
        $orderTypeId = $isManualEntry ? 1 : ($order['orderTypeId'] ?? 1); // 1 = Walk-in, 2 = Online
        $orderStatusId = $isManualEntry ? 3 : 1; // 3 = Pending (no approval needed), 1 = For Approval
        
        $stmt = $conn->prepare("
            INSERT INTO tbl_orders 
                (CustomerID, DeliveryDetailID, OrderTypeID, OrderStatusID, ReceivingMethodID, MOPID, PaymentStatusID, TotalAmount, OrderDate)
            VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
        ");
        $stmt->execute([
            $customerId,
            $deliveryDetailId,
            $orderTypeId,
            $orderStatusId,
            $order['receivingMethodId'],
            $order['mopId'],
            $total,
            $orderDate
        ]);
        $orderId = $conn->lastInsertId();

        // ==========================================
        // 6️⃣ INSERT ORDER DETAILS
        // ==========================================
        foreach ($order['items'] as $item) {
            $stmt = $conn->prepare("
                INSERT INTO tbl_order_details (OrderID, ContainerTypeID, OrderCategoryID, Quantity)
                VALUES (?, ?, ?, ?)
            ");
            $stmt->execute([$orderId, $item['containerTypeId'], $item['orderCategoryId'], $item['quantity']]);
        }

        // ==========================================
        // ✅ COMMIT TRANSACTION
        // ==========================================
        $conn->commit();
        echo json_encode([
            'success' => true,
            'orderId' => $orderId,
            'customerId' => $customerId,
            'deliveryDetailId' => $deliveryDetailId,
            'totalAmount' => $total
        ]);

    } catch (Exception $e) {
        $conn->rollBack();
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}
?>
