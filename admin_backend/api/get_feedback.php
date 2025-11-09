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

/* ========== 1. AUTH (Optional - can be removed if admin auth is handled elsewhere) ========== */
// Uncomment if you need session-based admin auth
// $adminID = $_SESSION['adminID'] ?? null;
// if (!$adminID) {
//     echo json_encode(['status' => 'error', 'message' => 'Unauthenticated']);
//     ob_end_flush();
//     exit;
// }

/* ========== 2. FETCH ALL FEEDBACK ========== */
try {
    $sql = "
        SELECT 
            f.Feedback_ID,
            f.OrderID,
            f.RatingScaleID,
            rs.ScaleValue,
            rs.Description AS RatingDescription,
            f.Comments,
            f.Feedback_Date,
            o.OrderID AS OrderID_Check,
            c.FirstName,
            c.LastName,
            c.Phone,
            o.TotalAmount,
            o.CreatedAt AS OrderDate,
            os.OrderStatusName,
            ot.OrderTypeName
        FROM tbl_feedback f
        INNER JOIN tbl_rating_scale rs ON f.RatingScaleID = rs.RatingScaleID
        INNER JOIN tbl_orders o ON f.OrderID = o.OrderID
        INNER JOIN tbl_customer c ON o.CustomerID = c.CustomerID
        LEFT JOIN tbl_order_status os ON o.OrderStatusID = os.OrderStatusID
        LEFT JOIN tbl_order_type ot ON o.OrderTypeID = ot.OrderTypeID
        ORDER BY f.Feedback_Date DESC
    ";
    
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $feedback = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Return empty array if no feedback found (not an error)
    echo json_encode([
        'success' => true,
        'data' => $feedback ? $feedback : [],
        'count' => count($feedback)
    ]);
    
} catch (PDOException $e) {
    error_log("GET FEEDBACK ERROR: " . $e->getMessage());
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to fetch feedback: ' . $e->getMessage()
    ]);
}

ob_end_flush();
?>

