<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

include_once(__DIR__ . '/../../includes/db_connection.php');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);
if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode(["error" => "Method Not Allowed"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
if (empty($data['OrderDetailID'])) {
    http_response_code(400);
    echo json_encode(["error" => "OrderDetailID is required"]);
    exit;
}

try {
    $conn->beginTransaction();

    $orderDetailID = (int)$data['OrderDetailID'];

    // Fetch details before deleting
    $stmt = $conn->prepare("
        SELECT OrderID, ContainerTypeID, OrderCategoryID, Quantity
        FROM tbl_order_details
        WHERE OrderDetailID = ?
    ");
    $stmt->execute([$orderDetailID]);
    $detail = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$detail) {
        throw new Exception("OrderDetailID $orderDetailID not found.");
    }

    $containerTypeID = (int)$detail['ContainerTypeID'];
    $orderCategoryID = (int)$detail['OrderCategoryID'];
    $quantity = (int)$detail['Quantity'];
    $orderID = (int)$detail['OrderID'];

    // 🟢 Restore stock only if it's a NEW container purchase
    if ($orderCategoryID == 2) {
        $restoreStock = $conn->prepare("
            UPDATE tbl_container_count
            SET Stock = Stock + :qty
            WHERE ContainerTypeID = :containerID
        ");
        $restoreStock->execute([
            ':qty' => $quantity,
            ':containerID' => $containerTypeID
        ]);
    }

    // 🗑 Delete the order detail
    $delete = $conn->prepare("DELETE FROM tbl_order_details WHERE OrderDetailID = ?");
    $delete->execute([$orderDetailID]);

    // 🧮 Recalculate total amount for the order
    $totalStmt = $conn->prepare("
        SELECT SUM(
            CASE
                WHEN d.OrderCategoryID = 1 THEN t.RefillPrice * d.Quantity
                WHEN d.OrderCategoryID = 2 THEN t.NewContainerPrice * d.Quantity
                ELSE 0
            END
        ) AS newTotal
        FROM tbl_order_details d
        JOIN tbl_container_type t ON d.ContainerTypeID = t.ContainerTypeID
        WHERE d.OrderID = ?
    ");
    $totalStmt->execute([$orderID]);
    $newTotal = (float)$totalStmt->fetchColumn();

    $updateOrder = $conn->prepare("
        UPDATE tbl_orders
        SET TotalAmount = :total, UpdatedAt = NOW()
        WHERE OrderID = :orderID
    ");
    $updateOrder->execute([
        ':total' => $newTotal,
        ':orderID' => $orderID
    ]);

    $conn->commit();
    echo json_encode([
        "success" => true,
        "message" => "Order detail deleted successfully.",
        "OrderID" => $orderID,
        "RecalculatedTotal" => $newTotal
    ]);

} catch (Exception $e) {
    $conn->rollBack();
    http_response_code(400);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
