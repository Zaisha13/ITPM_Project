<?php
ob_start();
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . (defined('API_ALLOWED_ORIGIN') ? API_ALLOWED_ORIGIN : '*'));
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); ob_end_flush(); exit; }

// ------------> ORDER HISTORY <---------------

// Include database connection
include_once(__DIR__ . '/../../includes/db_connection.php');

// Check if connection is established
if (!$conn) { echo json_encode(["status" => "error", "message" => "Database connection failed."]); ob_end_flush(); exit; }

try {
    // Use the existing $conn from db_connection.php
    $pdo = $conn; // Reuse the existing connection instead of creating a new one

    // Get CustomerID from GET request (or session, adjust as needed)
    $customerId = isset($_GET['CustomerID']) ? (int)$_GET['CustomerID'] : null;

    if (!$customerId) {
        echo json_encode(['error' => 'Customer ID is required']);
        ob_end_flush(); exit;
    }

    // Prepare and execute query to get order history
    $stmt = $pdo->prepare("
        SELECT 
            o.OrderID,
            o.CreatedAt,
            os.OrderStatusName,
            COALESCE(SUM(
                CASE 
                    WHEN oc.OrderCategoryName IN ('Refill', 'Online') THEN od.Quantity * ct.RefillPrice
                    WHEN oc.OrderCategoryName IN ('Brand New', 'New Gallon') THEN od.Quantity * ct.NewContainerPrice
                    ELSE 0
                END
            ), 0) AS Total
        FROM tbl_orders o
        LEFT JOIN tbl_customer c ON o.CustomerID = c.CustomerID
        LEFT JOIN tbl_order_details od ON o.OrderID = od.OrderID
        LEFT JOIN tbl_container_type ct ON od.ContainerTypeID = ct.ContainerTypeID
        LEFT JOIN tbl_order_category oc ON od.OrderCategoryID = oc.OrderCategoryID
        LEFT JOIN tbl_order_status os ON o.OrderStatusID = os.OrderStatusID
        WHERE o.CustomerID = :customerId
        GROUP BY o.OrderID, o.CreatedAt, os.OrderStatusName
    ");
    $stmt->bindParam(':customerId', $customerId, PDO::PARAM_INT);
    $stmt->execute();

    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($orders)) {
        echo json_encode(['message' => 'No orders found']);
        exit;
    }

    // Format the response
    $response = [
        'orders' => array_map(function ($order) {
            return [
                'OrderID' => $order['OrderID'],
                'Date' => $order['CreatedAt'],
                'Total' => number_format($order['Total'], 2),
                'Status' => $order['OrderStatusName']
            ];
        }, $orders)
    ];

    echo json_encode($response);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}

// No need to close $pdo as $conn is managed by db_connection.php
ob_end_flush();
?>