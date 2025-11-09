<?php
//DRAFT

// update_order.php (for updating order statuses and basic fields like TotalAmount).

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *"); // Restrict in production
header("Access-Control-Allow-Methods: PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Include your existing database connection
include_once(__DIR__ . '/../../includes/db_connection.php');
if (!$conn) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database connection failed."]);
    exit;
}

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Only allow PUT requests
if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

// Parse JSON input
$input = json_decode(file_get_contents('php://input'), true);
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

// Validate required fields (OrderID and at least one update field)
if (!isset($input['OrderID']) || !is_numeric($input['OrderID'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Order ID is required and must be a number']);
    exit;
}

$order_id = (int)$input['OrderID'];

$allowed_fields = [
    'OrderStatusID', 'PaymentStatusID', 'TotalAmount', 'MOPID', 
    'ReceivingMethodID', 'OrderTypeID', // Add other updatable fields as needed
];
$update_data = array_intersect_key($input, array_flip($allowed_fields));

if (empty($update_data)) {
    http_response_code(400);
    echo json_encode(['error' => 'No fields to update']);
    exit;
}

// Build dynamic UPDATE query
$set_clauses = [];
$params = [':order_id' => $order_id];
foreach ($update_data as $field => $value) {
    $set_clauses[] = "$field = :$field";
    $params[":$field"] = $value;
}
$set_clauses[] = "UpdatedAt = CURRENT_TIMESTAMP"; // Always update timestamp

$sql = "UPDATE tbl_orders SET " . implode(', ', $set_clauses) . " WHERE OrderID = :order_id";

// Execute the update
try {
    $stmt = $conn->prepare($sql);
    $stmt->execute($params);

    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Order not found']);
        exit;
    }
    
    // If order status was changed to "Confirmed", recalculate available capacity
    if (isset($update_data['OrderStatusID'])) {
        // Check if the new status is "Confirmed"
        $statusStmt = $conn->prepare("
            SELECT OrderStatusName FROM tbl_order_status WHERE OrderStatusID = ?
        ");
        $statusStmt->execute([$update_data['OrderStatusID']]);
        $statusResult = $statusStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($statusResult && strtolower($statusResult['OrderStatusName']) === 'confirmed') {
            // Recalculate available capacity
            $today = date('Y-m-d');
            
            // Get daily limit
            $limitStmt = $conn->prepare("SELECT ConfigValue FROM tbl_system_config WHERE ConfigKey = 'daily_order_limit'");
            $limitStmt->execute();
            $limitResult = $limitStmt->fetch(PDO::FETCH_ASSOC);
            $dailyLimit = (int)($limitResult['ConfigValue'] ?? 300);
            
            // Count confirmed orders for today
            $capacityStmt = $conn->prepare("
                SELECT COUNT(DISTINCT o.OrderID) as confirmed_count
                FROM tbl_orders o
                WHERE DATE(o.CreatedAt) = ?
                AND o.OrderStatusID = (
                    SELECT OrderStatusID FROM tbl_order_status WHERE OrderStatusName = 'Confirmed'
                    LIMIT 1
                )
            ");
            $capacityStmt->execute([$today]);
            $capacityResult = $capacityStmt->fetch(PDO::FETCH_ASSOC);
            $confirmedCount = (int)($capacityResult['confirmed_count'] ?? 0);
            
            $availableCapacity = max(0, $dailyLimit - $confirmedCount);
            
            // Update available capacity
            $updateCapacityStmt = $conn->prepare("
                INSERT INTO tbl_system_config (ConfigKey, ConfigValue) 
                VALUES ('available_capacity', ?)
                ON DUPLICATE KEY UPDATE ConfigValue = ?
            ");
            $updateCapacityStmt->execute([$availableCapacity, $availableCapacity]);
        }
    }

    echo json_encode(['success' => true, 'message' => 'Order updated successfully']);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Update failed: ' . $e->getMessage()]);
}
?>