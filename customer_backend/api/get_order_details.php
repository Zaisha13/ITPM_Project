<?php
ob_start();
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . (defined('API_ALLOWED_ORIGIN') ? API_ALLOWED_ORIGIN : '*'));
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); ob_end_flush(); exit; }

// ORDER DETAILS OF AN ORDER FROM ORDER HISTORY (PER ROW = ONE ORDER ID = HAS ORDER DETAILS WHEN CLICKED)

// Include database connection
include_once(__DIR__ . '/../../includes/db_connection.php');

// Check if connection is established
if (!$conn) { echo json_encode(["status" => "error", "message" => "Database connection failed."]); ob_end_flush(); exit; }

try {
    // Use the existing $conn from db_connection.php
    $pdo = $conn; // Reuse the existing connection instead of creating a new one

    // Get OrderID from GET request
    $orderId = isset($_GET['OrderID']) ? (int)$_GET['OrderID'] : null;

    if (!$orderId) {
        echo json_encode(['error' => 'Order ID is required']);
        ob_end_flush(); exit;
    }

    // Prepare and execute query to get order details
    $stmt = $pdo->prepare("
        SELECT 
            o.OrderID,
            o.CreatedAt,
            dd.DeliveryAddress,
            ps.PaymentStatusName,
            os.OrderStatusName,
            od.Quantity,
            ct.ContainerTypeName,
            ct.RefillPrice,
            ct.NewContainerPrice,
            oc.OrderCategoryName
        FROM tbl_orders o
        LEFT JOIN tbl_delivery_details dd ON o.DeliveryDetailID = dd.DeliveryDetailID
        LEFT JOIN tbl_payment_status ps ON o.PaymentStatusID = ps.PaymentStatusID
        LEFT JOIN tbl_order_status os ON o.OrderStatusID = os.OrderStatusID
        LEFT JOIN tbl_order_details od ON o.OrderID = od.OrderID
        LEFT JOIN tbl_container_type ct ON od.ContainerTypeID = ct.ContainerTypeID
        LEFT JOIN tbl_order_category oc ON od.OrderCategoryID = oc.OrderCategoryID
        WHERE o.OrderID = :orderId
    ");
    $stmt->bindParam(':orderId', $orderId, PDO::PARAM_INT);
    $stmt->execute();

    $orderDetails = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($orderDetails)) {
        echo json_encode(['error' => 'Order not found']);
        exit;
    }

    // Format the response
    $response = [
        'OrderID' => $orderDetails[0]['OrderID'],
        'Date' => $orderDetails[0]['CreatedAt'],
        //'CustomerName' => $orderDetails[0]['FirstName'] . ' ' . $orderDetails[0]['LastName'],
        'DeliveryAddress' => $orderDetails[0]['DeliveryAddress'],
        'PaymentStatus' => $orderDetails[0]['PaymentStatusName'],
        'OrderStatus' => $orderDetails[0]['OrderStatusName'],
        //'OrderType' => $orderDetails[0]['OrderTypeName'],
        'Items' => [],
        'TotalAmount' => 0.00
    ];

    // Aggregate items and calculate subtotals
    foreach ($orderDetails as $detail) {
        $price = 0.00;
        if (in_array($detail['OrderCategoryName'], ['Refill', 'Online'])) { // Treat Online as Refill if applicable
            $price = $detail['RefillPrice'] ?? 0.00; // Use RefillPrice, default to 0 if null
        } elseif (in_array($detail['OrderCategoryName'], ['Brand New', 'New Gallon'])) { // Handle New Gallon as Brand New
            $price = $detail['NewContainerPrice'] ?? 0.00; // Use NewContainerPrice, default to 0 if null
        }

        $subtotal = $price * ($detail['Quantity'] ?? 1); // Default Quantity to 1 if null

        $response['Items'][] = [
            'ContainerType' => $detail['ContainerTypeName'],
            'Quantity' => $detail['Quantity'] ?? 1,
            'Price' => number_format($price, 2),
            'Subtotal' => number_format($subtotal, 2),
            'ItemType' => $detail['OrderCategoryName'] // Use the actual category name
        ];

        // Add to total amount
        $response['TotalAmount'] += $subtotal;
    }

    // Format TotalAmount to 2 decimal places
    $response['TotalAmount'] = number_format($response['TotalAmount'], 2);

    echo json_encode($response);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}

// No need to close $pdo as $conn is managed by db_connection.php
ob_end_flush();
?>