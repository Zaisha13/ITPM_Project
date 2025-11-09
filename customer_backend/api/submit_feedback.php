<?php
ob_start();
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . (defined('API_ALLOWED_ORIGIN') ? API_ALLOWED_ORIGIN : '*'));
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    ob_end_flush();
    exit;
}

require_once __DIR__ . '/../../includes/db_connection.php';
if (!$conn instanceof PDO) {
    echo json_encode(['status' => 'error', 'message' => 'DB connection failed']);
    ob_end_flush();
    exit;
}

/* ========== 1. AUTH ========== */
$accountID = $_SESSION['accountID'] ?? null;
if (!$accountID) {
    echo json_encode(['status' => 'error', 'message' => 'Unauthenticated']);
    ob_end_flush();
    exit;
}

/* ========== 2. INPUT ========== */
$data = json_decode(file_get_contents('php://input'), true);
if (json_last_error() !== JSON_ERROR_NONE) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid JSON']);
    ob_end_flush();
    exit;
}

$orderID  = (int)($data['orderID'] ?? 0);
$rating   = (int)($data['rating'] ?? 0);
$comments = trim($data['comments'] ?? '');

if ($orderID < 1 || $rating < 1 || $rating > 5) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid orderID or rating']);
    ob_end_flush();
    exit;
}

/* ========== 3. VERIFY ORDER: OWNED + COMPLETED ========== */
try {
    $sql = "
        SELECT o.OrderID, o.OrderStatusID
        FROM tbl_orders o
        JOIN tbl_customer c ON o.CustomerID = c.CustomerID
        WHERE o.OrderID = :orderID AND c.AccountID = :accountID
        LIMIT 1
    ";
    $stmt = $conn->prepare($sql);
    $stmt->execute([':orderID' => $orderID, ':accountID' => $accountID]);
    $order = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$order) {
    echo json_encode(['status' => 'error', 'message' => 'Order not found or not yours']);
    ob_end_flush();
    exit;
    }

    if ((int)$order['OrderStatusID'] !== 7) {
    echo json_encode(['status' => 'error', 'message' => 'Feedback only allowed for Completed orders']);
    ob_end_flush();
    exit;
    }
} catch (Throwable $e) {
    error_log("Verify error: " . $e->getMessage());
    echo json_encode(['status' => 'error', 'message' => 'Verification failed']);
    ob_end_flush();
    exit;
}

/* ========== 4. INSERT FEEDBACK (Multiple allowed per order) ========== */
try {
    $insertSql = "
        INSERT INTO tbl_feedback 
            (OrderID, RatingScaleID, Comments, Feedback_Date)
        VALUES 
            (:orderID, :ratingScaleID, :comments, NOW())
    ";

    $insertStmt = $conn->prepare($insertSql);
    $insertStmt->execute([
        ':orderID'       => $orderID,
        ':ratingScaleID' => $rating,
        ':comments'      => $comments
    ]);

    echo json_encode([
        'success' => true,
        'message' => 'Thank you! Your feedback has been saved.'
    ]);

} catch (PDOException $e) {
    error_log("INSERT ERROR: " . $e->getMessage());
    echo json_encode(['status' => 'error', 'message' => 'Failed to save feedback: ' . $e->getMessage()]);
}

ob_end_flush();
?>