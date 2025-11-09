<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *"); 
header("Access-Control-Allow-Methods: PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

include_once(__DIR__ . '/../../includes/db_connection.php');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);
if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

$input = json_decode(file_get_contents("php://input"), true);
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid JSON"]);
    exit;
}

if (empty($input['OrderID']) || !is_numeric($input['OrderID'])) {
    http_response_code(400);
    echo json_encode(["error" => "OrderID is required and must be numeric"]);
    exit;
}

$orderID = (int)$input['OrderID'];
$orderDetails = $input['OrderDetails'] ?? [];

// Optional fields
$orderStatusID = $input['OrderStatusID'] ?? null;
$paymentStatusID = $input['PaymentStatusID'] ?? null;
$mopID = $input['MOPID'] ?? null;
$receivingMethodID = $input['ReceivingMethodID'] ?? null;
$orderTypeID = $input['OrderTypeID'] ?? null;

try {
    $conn->beginTransaction();

    // ✅ 1. Check if the order exists
    $checkOrder = $conn->prepare("SELECT OrderStatusID FROM tbl_orders WHERE OrderID = ?");
    $checkOrder->execute([$orderID]);
    $existingOrder = $checkOrder->fetch(PDO::FETCH_ASSOC);
    if (!$existingOrder) {
        throw new Exception("OrderID $orderID not found.");
    }

    // ✅ 2. If setting status to CANCELLED (8)
    if ($orderStatusID == 8) {
        // Fetch all order details for this order
        $getDetails = $conn->prepare("
            SELECT ContainerTypeID, OrderCategoryID, Quantity
            FROM tbl_order_details
            WHERE OrderID = ?
        ");
        $getDetails->execute([$orderID]);
        $details = $getDetails->fetchAll(PDO::FETCH_ASSOC);

        // 🟢 Restore stock for all new container purchases
        foreach ($details as $d) {
            if ((int)$d['OrderCategoryID'] === 2) {
                $restore = $conn->prepare("
                    UPDATE tbl_container_count
                    SET Stock = Stock + :qty
                    WHERE ContainerTypeID = :containerID
                ");
                $restore->execute([
                    ':qty' => (int)$d['Quantity'],
                    ':containerID' => (int)$d['ContainerTypeID']
                ]);
            }
        }

        // 🟢 Update order to reflect cancellation (soft delete)
        $cancelOrder = $conn->prepare("
            UPDATE tbl_orders
            SET 
                OrderStatusID = 8,
                PaymentStatusID = NULL,
                UpdatedAt = NOW()
            WHERE OrderID = :orderID
        ");
        $cancelOrder->execute([':orderID' => $orderID]);

        $conn->commit();

        echo json_encode([
            "success" => true,
            "message" => "Order cancelled successfully (soft delete). Stock restored for new containers.",
            "OrderID" => $orderID
        ]);
        exit;
    }

    // ✅ 3. Otherwise, handle normal updates
    $updateOrderSQL = "
        UPDATE tbl_orders 
        SET 
            OrderStatusID = COALESCE(:OrderStatusID, OrderStatusID),
            PaymentStatusID = COALESCE(:PaymentStatusID, PaymentStatusID),
            MOPID = COALESCE(:MOPID, MOPID),
            ReceivingMethodID = COALESCE(:ReceivingMethodID, ReceivingMethodID),
            OrderTypeID = COALESCE(:OrderTypeID, OrderTypeID),
            UpdatedAt = NOW()
        WHERE OrderID = :OrderID
    ";
    $stmt = $conn->prepare($updateOrderSQL);
    $stmt->execute([
        ':OrderStatusID' => $orderStatusID,
        ':PaymentStatusID' => $paymentStatusID,
        ':MOPID' => $mopID,
        ':ReceivingMethodID' => $receivingMethodID,
        ':OrderTypeID' => $orderTypeID,
        ':OrderID' => $orderID
    ]);

    // ✅ 4. Handle order details update / insert (for active orders)
    $quantityChanged = false;
    $newTotal = 0;

    foreach ($orderDetails as $detail) {
        if (!isset($detail['ContainerTypeID'], $detail['OrderCategoryID'], $detail['Quantity'])) continue;

        $orderDetailID = $detail['OrderDetailID'] ?? null;
        $containerTypeID = (int)$detail['ContainerTypeID'];
        $orderCategoryID = (int)$detail['OrderCategoryID'];
        $newQty = (int)$detail['Quantity'];

        // 🟢 UPDATE existing detail
        if (!empty($orderDetailID)) {
            $stmt = $conn->prepare("SELECT Quantity FROM tbl_order_details WHERE OrderDetailID = ?");
            $stmt->execute([$orderDetailID]);
            $oldRow = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$oldRow) continue;

            $oldQty = (int)$oldRow['Quantity'];
            if ($newQty === $oldQty) continue;

            $quantityChanged = true;
            $diff = $newQty - $oldQty;

            if ($orderCategoryID == 2) {
                $checkStock = $conn->prepare("
                    SELECT Stock FROM tbl_container_count WHERE ContainerTypeID = :containerID FOR UPDATE
                ");
                $checkStock->execute([':containerID' => $containerTypeID]);
                $stockRow = $checkStock->fetch(PDO::FETCH_ASSOC);

                if (!$stockRow) {
                    throw new Exception("ContainerTypeID $containerTypeID not found in tbl_container_count.");
                }

                $currentStock = (int)$stockRow['Stock'];
                if ($diff > 0 && $currentStock < $diff) {
                    throw new Exception("Not enough stock for ContainerTypeID $containerTypeID. Available: $currentStock, Requested: $diff");
                }

                $stockStmt = $conn->prepare("
                    UPDATE tbl_container_count 
                    SET Stock = Stock - :diff 
                    WHERE ContainerTypeID = :containerID
                ");
                $stockStmt->execute([
                    ':diff' => $diff,
                    ':containerID' => $containerTypeID
                ]);
            }

            $updateDetail = $conn->prepare("
                UPDATE tbl_order_details 
                SET Quantity = :qty, CreatedAt = NOW() 
                WHERE OrderDetailID = :detailID
            ");
            $updateDetail->execute([
                ':qty' => $newQty,
                ':detailID' => $orderDetailID
            ]);
        }
        // 🆕 INSERT new detail
        else {
            $quantityChanged = true;
            if ($orderCategoryID == 2) {
                $checkStock = $conn->prepare("
                    SELECT Stock FROM tbl_container_count WHERE ContainerTypeID = :containerID FOR UPDATE
                ");
                $checkStock->execute([':containerID' => $containerTypeID]);
                $stockRow = $checkStock->fetch(PDO::FETCH_ASSOC);
                if (!$stockRow) {
                    throw new Exception("ContainerTypeID $containerTypeID not found in tbl_container_count.");
                }

                $currentStock = (int)$stockRow['Stock'];
                if ($currentStock < $newQty) {
                    throw new Exception("Not enough stock for ContainerTypeID $containerTypeID. Available: $currentStock, Requested: $newQty");
                }
            }

            $insertDetail = $conn->prepare("
                INSERT INTO tbl_order_details (OrderID, ContainerTypeID, OrderCategoryID, Quantity, CreatedAt)
                VALUES (:orderID, :containerID, :categoryID, :qty, NOW())
            ");
            $insertDetail->execute([
                ':orderID' => $orderID,
                ':containerID' => $containerTypeID,
                ':categoryID' => $orderCategoryID,
                ':qty' => $newQty
            ]);

            if ($orderCategoryID == 2) {
                $stockStmt = $conn->prepare("
                    UPDATE tbl_container_count 
                    SET Stock = Stock - :qty 
                    WHERE ContainerTypeID = :containerID
                ");
                $stockStmt->execute([
                    ':qty' => $newQty,
                    ':containerID' => $containerTypeID
                ]);
            }
        }
    }

    // ✅ 5. Recalculate total only if something changed
    if ($quantityChanged) {
        $getDetails = $conn->prepare("
            SELECT d.Quantity, d.OrderCategoryID, d.ContainerTypeID,
                CASE 
                    WHEN d.OrderCategoryID = 1 THEN t.RefillPrice
                    WHEN d.OrderCategoryID = 2 THEN t.NewContainerPrice
                    ELSE 0 END AS price
            FROM tbl_order_details d
            JOIN tbl_container_type t ON d.ContainerTypeID = t.ContainerTypeID
            WHERE d.OrderID = ?
        ");
        $getDetails->execute([$orderID]);
        $details = $getDetails->fetchAll(PDO::FETCH_ASSOC);

        foreach ($details as $d) {
            $newTotal += ((float)$d['price']) * ((int)$d['Quantity']);
        }

        $updateTotal = $conn->prepare("
            UPDATE tbl_orders SET TotalAmount = ?, UpdatedAt = NOW() WHERE OrderID = ?
        ");
        $updateTotal->execute([$newTotal, $orderID]);
    }

    $conn->commit();

    echo json_encode([
        "success" => true,
        "message" => $quantityChanged
            ? "Order updated successfully (quantities or new items changed)."
            : "Order statuses updated successfully (no quantity changes).",
        "OrderID" => $orderID,
        "RecalculatedTotal" => $quantityChanged ? $newTotal : "No change"
    ]);

} catch (Exception $e) {
    $conn->rollBack();
    http_response_code(400);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
