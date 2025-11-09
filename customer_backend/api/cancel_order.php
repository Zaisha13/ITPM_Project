<?php
ob_start();
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . (defined('API_ALLOWED_ORIGIN') ? API_ALLOWED_ORIGIN : '*'));
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); ob_end_flush(); exit; }

// Database connection
include_once(__DIR__ . '/../../includes/db_connection.php');
if (!$conn instanceof PDO) { echo json_encode(["status"=>"error","message"=>"DB connection failed"]); ob_end_flush(); exit; }

// ✅ Must come from active session
$accountID = $_SESSION['accountID'] ?? null;
if (empty($accountID)) {
    echo json_encode(["status" => "error", "message" => "User not logged in"]);
    exit;
}

// Decode JSON request
$data = json_decode(file_get_contents('php://input'), true);
if (json_last_error() !== JSON_ERROR_NONE) { echo json_encode(["status" => "error", "message" => "Invalid JSON input"]); ob_end_flush(); exit; }

$orderID = $data['orderID'] ?? '';
if (empty($orderID)) {
    echo json_encode(["status" => "error", "message" => "Order ID is required"]);
    exit;
}

try {
    // ✅ Step 1: Verify if the order belongs to this logged-in account
    $stmtCheck = $conn->prepare("
        SELECT o.OrderID, o.OrderStatusID, o.PaymentStatusID, c.AccountID
        FROM tbl_orders o
        INNER JOIN tbl_customer c ON o.CustomerID = c.CustomerID
        WHERE o.OrderID = :orderID AND c.AccountID = :accountID
    ");
    $stmtCheck->execute([':orderID' => $orderID, ':accountID' => $accountID]);
    $order = $stmtCheck->fetch(PDO::FETCH_ASSOC);

    if (!$order) {
        echo json_encode(["status" => "error", "message" => "Order not found or not owned by user"]);
        exit;
    }

    // ✅ Step 2: Check cancellable status (For Approval, Confirmed, Pending)
    $cancellableStatuses = [1, 2, 3];
    if (!in_array($order['OrderStatusID'], $cancellableStatuses)) {
        echo json_encode(["status" => "error", "message" => "Order cannot be cancelled"]);
        exit;
    }

    // ✅ Step 3: Cancel order + payment and restock brand new containers
    $conn->beginTransaction();
    $stmtUpdate = $conn->prepare("
        UPDATE tbl_orders
        SET OrderStatusID = 8,   -- Cancelled (tbl_order_status)
            PaymentStatusID = 4, -- Cancelled (tbl_payment_status)
            UpdatedAt = NOW()
        WHERE OrderID = :orderID
    ");
    $stmtUpdate->execute([':orderID' => $orderID]);

    if ($stmtUpdate->rowCount() === 0) {
        $conn->rollBack();
        echo json_encode(["status" => "error", "message" => "Failed to cancel order"]);
        exit;
    }

    // Restock for Brand New items only (OrderCategoryID = 2)
    $stmtDetails = $conn->prepare("SELECT ContainerTypeID, OrderCategoryID, Quantity FROM tbl_order_details WHERE OrderID = :oid");
    $stmtDetails->execute([':oid' => $orderID]);
    $rows = $stmtDetails->fetchAll(PDO::FETCH_ASSOC);

    if ($rows) {
        $stmtRestock = $conn->prepare("UPDATE tbl_container_count SET Stock = Stock + :qty WHERE ContainerTypeID = :ctid");
        foreach ($rows as $r) {
            if ((int)$r['OrderCategoryID'] === 2) {
                $stmtRestock->execute([':qty' => (int)$r['Quantity'], ':ctid' => (int)$r['ContainerTypeID']]);
            }
        }
    }

    $conn->commit();

    // ✅ Step 4: Response
    echo json_encode([
        "success" => true,
        "message" => "Order cancelled and inventory restocked",
        "orderID" => $orderID,
        "orderStatus" => "Cancelled",
        "paymentStatus" => "Cancelled"
    ]);
} catch (PDOException $e) {
    if ($conn->inTransaction()) $conn->rollBack();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Cancellation failed: " . $e->getMessage()]);
}
ob_end_flush();
?>
