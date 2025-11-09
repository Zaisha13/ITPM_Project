<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

include_once(__DIR__ . '/../../includes/db_connection.php');
if (!$conn) {
    die(json_encode(["status" => "error", "message" => "Database connection failed."]));
}



try {
    $query = "
        SELECT 
            c.CustomerID,
            CASE 
                WHEN c.AccountID IS NULL THEN 'No account'
                ELSE (c.AccountID)
            END AS AccountID,
            c.FirstName,
            c.LastName,
            c.Phone,
            c.HouseAddress,
            c.CreatedAt,
            t.CustomerTypeName
        FROM tbl_customer AS c
        INNER JOIN tbl_customer_type AS t
            ON c.CustomerTypeID = t.CustomerTypeID
        ORDER BY c.CreatedAt DESC
    ";

    $stmt = $conn->prepare($query);
    $stmt->execute();
    $result = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "status" => "success",
        "data" => $result
    ]);
} catch (PDOException $e) {
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ]);
}
?>
