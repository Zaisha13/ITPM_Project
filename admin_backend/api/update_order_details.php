<?php
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

// Validate required fields
if (!isset($input['OrderID']) || !is_numeric($input['OrderID'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Order ID is required and must be a number']);
    exit;
}

$order_id = (int)$input['OrderID'];
$slim_quantity = isset($input['SlimQuantity']) ? (int)$input['SlimQuantity'] : 0;
$round_quantity = isset($input['RoundQuantity']) ? (int)$input['RoundQuantity'] : 0;
$small_quantity = isset($input['SmallQuantity']) ? (int)$input['SmallQuantity'] : 0;
$original_slim = isset($input['OriginalSlimQuantity']) ? (int)$input['OriginalSlimQuantity'] : 0;
$original_round = isset($input['OriginalRoundQuantity']) ? (int)$input['OriginalRoundQuantity'] : 0;
$original_small = isset($input['OriginalSmallQuantity']) ? (int)$input['OriginalSmallQuantity'] : 0;
$slim_refill_count = isset($input['SlimRefillCount']) ? (int)$input['SlimRefillCount'] : 0;
$round_refill_count = isset($input['RoundRefillCount']) ? (int)$input['RoundRefillCount'] : 0;
$small_refill_count = isset($input['SmallRefillCount']) ? (int)$input['SmallRefillCount'] : 0;
$original_slim_refill = isset($input['OriginalSlimRefillCount']) ? (int)$input['OriginalSlimRefillCount'] : 0;
$original_round_refill = isset($input['OriginalRoundRefillCount']) ? (int)$input['OriginalRoundRefillCount'] : 0;
$original_small_refill = isset($input['OriginalSmallRefillCount']) ? (int)$input['OriginalSmallRefillCount'] : 0;

if ($slim_quantity < 0 || $round_quantity < 0 || $small_quantity < 0 || $slim_refill_count < 0 || $round_refill_count < 0 || $small_refill_count < 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Quantities and refill counts cannot be negative']);
    exit;
}

// Fetch original TotalAmount
try {
    $stmt = $conn->prepare("SELECT TotalAmount FROM tbl_orders WHERE OrderID = :order_id");
    $stmt->execute([':order_id' => $order_id]);
    $original_order = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$original_order) {
        http_response_code(404);
        echo json_encode(['error' => 'Order not found']);
        exit;
    }

    $original_total = $original_order['TotalAmount'];
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch order: ' . $e->getMessage']);
    exit;
}

// Fetch container prices
try {
    $stmt = $conn->prepare("SELECT ContainerTypeID, ContainerTypeName, RefillPrice, NewContainerPrice FROM tbl_container_type WHERE ContainerTypeName IN ('Slim', 'Round', 'Small')");
    $stmt->execute();
    $containers = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $prices = [];
    foreach ($containers as $container) {
        $prices[$container['ContainerTypeName']] = [
            'RefillPrice' => $container['RefillPrice'],
            'NewContainerPrice' => $container['NewContainerPrice'] ?? 0,
            'ContainerTypeID' => $container['ContainerTypeID']
        ];
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch prices: ' . $e->getMessage']);
    exit;
}

// Calculate differences
$slim_diff = $slim_quantity - $original_slim;
$round_diff = $round_quantity - $original_round;
$small_diff = $small_quantity - $original_small;
$slim_refill_diff = $slim_refill_count - $original_slim_refill;
$round_refill_diff = $round_refill_count - $original_round_refill;
$small_refill_diff = $small_refill_count - $original_small_refill;

// Calculate new TotalAmount
$new_total = $original_total;
$new_total -= ($original_slim * $prices['Slim']['RefillPrice']) + ($original_round * $prices['Round']['RefillPrice']) + ($original_small * $prices['Small']['RefillPrice']);
$new_total -= ($original_slim * $prices['Slim']['NewContainerPrice']) + ($original_round * $prices['Round']['NewContainerPrice']) + ($original_small * $prices['Small']['NewContainerPrice']);
$new_total -= ($original_slim_refill * $prices['Slim']['RefillPrice']) + ($original_round_refill * $prices['Round']['RefillPrice']) + ($original_small_refill * $prices['Small']['RefillPrice']);
$new_total += ($slim_quantity * $prices['Slim']['RefillPrice']) + ($round_quantity * $prices['Round']['RefillPrice']) + ($small_quantity * $prices['Small']['RefillPrice']);
$new_total += ($slim_quantity * $prices['Slim']['NewContainerPrice']) + ($round_quantity * $prices['Round']['NewContainerPrice']) + ($small_quantity * $prices['Small']['NewContainerPrice']);
$new_total += ($slim_refill_count * $prices['Slim']['RefillPrice']) + ($round_refill_count * $prices['Round']['RefillPrice']) + ($small_refill_count * $prices['Small']['RefillPrice']);

// Update order TotalAmount and container stock
try {
    $conn->beginTransaction();
    $stmt = $conn->prepare("UPDATE tbl_orders SET TotalAmount = :total, UpdatedAt = CURRENT_TIMESTAMP WHERE OrderID = :order_id");
    $stmt->execute([':total' => $new_total, ':order_id' => $order_id]);

    $stock_updates = [];
    if ($slim_diff != 0) {
        $stmt = $conn->prepare("UPDATE tbl_container_count SET Stock = Stock + :diff WHERE ContainerTypeID = :container_id");
        $stmt->execute([':diff' => -$slim_diff, ':container_id' => $prices['Slim']['ContainerTypeID']]);
        $stock_updates[] = "Slim stock adjusted by " . -$slim_diff;
    }
    if ($round_diff != 0) {
        $stmt = $conn->prepare("UPDATE tbl_container_count SET Stock = Stock + :diff WHERE ContainerTypeID = :container_id");
        $stmt->execute([':diff' => -$round_diff, ':container_id' => $prices['Round']['ContainerTypeID']]);
        $stock_updates[] = "Round stock adjusted by " . -$round_diff;
    }
    if ($small_diff != 0) {
        $stmt = $conn->prepare("UPDATE tbl_container_count SET Stock = Stock + :diff WHERE ContainerTypeID = :container_id");
        $stmt->execute([':diff' => -$small_diff, ':container_id' => $prices['Small']['ContainerTypeID']]);
        $stock_updates[] = "Small stock adjusted by " . -$small_diff;
    }

    $conn->commit();
    echo json_encode(['success' => true, 'message' => 'Order details updated successfully', 'updates' => $stock_updates, 'new_total' => $new_total]);
} catch (PDOException $e) {
    $conn->rollBack();
    http_response_code(500);
    echo json_encode(['error' => 'Update failed: ' . $e->getMessage']);
    exit;
}

// Check stock levels
try {
    $stmt = $conn->prepare("SELECT ContainerTypeName, Stock FROM tbl_container_count JOIN tbl_container_type ON tbl_container_count.ContainerTypeID = tbl_container_type.ContainerTypeID");
    $stmt->execute();
    $stocks = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($stocks as $stock) {
        if ($stock['Stock'] < 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Insufficient stock for ' . $stock['ContainerTypeName']]);
            exit;
        }
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Stock check failed: ' . $e->getMessage']);
    exit;
}
?>