<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

include_once(__DIR__ . '/../../includes/db_connection.php');

if (!$conn) {
    echo json_encode(["status" => "error", "message" => "Database connection failed."]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);
if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode(["error" => "Method Not Allowed"]);
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

try {
    $conn->beginTransaction();

    // 🟢 1. Fetch delivery ID (for reference only, not deletion)
    $getDelivery = $conn->prepare("
        SELECT DeliveryDetailID FROM tbl_orders WHERE OrderID = ?
    ");
    $getDelivery->execute([$orderID]);
    $deliveryDetailID = $getDelivery->fetchColumn();

    if (!$deliveryDetailID) {
        throw new Exception("No delivery linked to OrderID $orderID");
    }

    // 🟢 2. Fetch order details for stock restoration
    $detailsStmt = $conn->prepare("
        SELECT ContainerTypeID, OrderCategoryID, Quantity
        FROM tbl_order_details
        WHERE OrderID = ?
    ");
    $detailsStmt->execute([$orderID]);
    $details = $detailsStmt->fetchAll(PDO::FETCH_ASSOC);

    // 🟢 3. Restore stock for new container purchases
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

    // 🟢 4. Delete order details
    $deleteDetails = $conn->prepare("DELETE FROM tbl_order_details WHERE OrderID = ?");
    $deleteDetails->execute([$orderID]);

    // 🟢 5. Delete the order record (but keep delivery detail intact)
    $deleteOrder = $conn->prepare("DELETE FROM tbl_orders WHERE OrderID = ?");
    $deleteOrder->execute([$orderID]);

    if ($deleteOrder->rowCount() === 0) {
        throw new Exception("OrderID $orderID not found in tbl_orders.");
    }

    $conn->commit();

    echo json_encode([
        "success" => true,
        "message" => "Order and its details deleted successfully. Delivery address kept for reuse.",
        "OrderID" => $orderID,
        "DeliveryDetailID" => $deliveryDetailID
    ]);

} catch (Exception $e) {
    $conn->rollBack();
    http_response_code(400);
    echo json_encode(["error" => $e->getMessage()]);
}
?>
