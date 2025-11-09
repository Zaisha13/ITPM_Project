<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type");

include_once(__DIR__ . '/../../includes/db_connection.php');

try {
    // Get optional date parameter to filter by OrderDate
    $orderDate = isset($_GET['orderDate']) ? $_GET['orderDate'] : null;
    
    // ✅ Fetch orders with "For Approval" status (OrderStatusID = 1) for dashboard
    // These orders are filtered by OrderDate (the date they should be processed on)
    $sql = "
        SELECT 
            o.OrderID,
            CONCAT(c.FirstName, ' ', c.LastName) AS CustomerName,
            a.Username AS CustomerUsername,
            ct.CustomerTypeName,
            o.TotalAmount,
            o.CreatedAt,
            o.UpdatedAt,
            o.OrderDate,
            os.OrderStatusName,
            rm.ReceivingMethodName,
            mop.MOPName,
            COALESCE(ps.PaymentStatusName, 'Cancelled') AS PaymentStatusName,
            o.OrderTypeID,
            ot.OrderTypeName,
            dd.DeliveryAddress
        FROM tbl_orders o
        JOIN tbl_customer c ON o.CustomerID = c.CustomerID
        LEFT JOIN tbl_account a ON c.AccountID = a.AccountID
        JOIN tbl_customer_type ct ON c.CustomerTypeID = ct.CustomerTypeID
        LEFT JOIN tbl_order_status os ON o.OrderStatusID = os.OrderStatusID
        LEFT JOIN tbl_receiving_method rm ON o.ReceivingMethodID = rm.ReceivingMethodID
        LEFT JOIN tbl_mop mop ON o.MOPID = mop.MOPID
        LEFT JOIN tbl_payment_status ps ON o.PaymentStatusID = ps.PaymentStatusID
        LEFT JOIN tbl_order_type ot ON o.OrderTypeID = ot.OrderTypeID
        LEFT JOIN tbl_delivery_details dd ON o.DeliveryDetailID = dd.DeliveryDetailID
        WHERE o.OrderStatusID = 1
    ";
    
    $params = [];
    
    // If orderDate is provided, filter by that specific date
    if ($orderDate) {
        $sql .= " AND o.OrderDate = ?";
        $params[] = $orderDate;
    }
    
    $sql .= " ORDER BY o.OrderDate ASC, o.OrderID DESC";
    
    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // ✅ Include order details for each order
    foreach ($orders as &$order) {
        $detailsSQL = "
            SELECT 
                d.OrderDetailID,
                d.Quantity,
                ct.ContainerTypeName,
                oc.OrderCategoryName,
                CASE 
                    WHEN d.OrderCategoryID = 1 THEN t.RefillPrice
                    WHEN d.OrderCategoryID = 2 THEN t.NewContainerPrice
                    ELSE 0 END AS UnitPrice,
                (CASE 
                    WHEN d.OrderCategoryID = 1 THEN t.RefillPrice
                    WHEN d.OrderCategoryID = 2 THEN t.NewContainerPrice
                    ELSE 0 END) * d.Quantity AS Subtotal
            FROM tbl_order_details d
            JOIN tbl_container_type t ON d.ContainerTypeID = t.ContainerTypeID
            JOIN tbl_order_category oc ON d.OrderCategoryID = oc.OrderCategoryID
            JOIN tbl_container_type ct ON d.ContainerTypeID = ct.ContainerTypeID
            WHERE d.OrderID = ?
        ";
        $detailsStmt = $conn->prepare($detailsSQL);
        $detailsStmt->execute([$order['OrderID']]);
        $order['OrderDetails'] = $detailsStmt->fetchAll(PDO::FETCH_ASSOC);
    }

    echo json_encode([
        "success" => true,
        "count" => count($orders),
        "data" => $orders
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
?>


