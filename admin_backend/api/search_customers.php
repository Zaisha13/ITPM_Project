<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

include_once(__DIR__ . '/../../includes/db_connection.php');
if (!$conn) {
    die(json_encode(["status" => "error", "message" => "Database connection failed."]));
}

try {
    $query = isset($_GET['q']) ? trim($_GET['q']) : '';
    
    if (empty($query)) {
        echo json_encode([
            "status" => "success",
            "data" => []
        ]);
        exit;
    }
    
    // Search by username, email, or name (FirstName, LastName)
    $searchTerm = "%{$query}%";
    $exactSearchTerm = $query; // For exact match searches
    
    $stmt = $conn->prepare("
        SELECT 
            c.CustomerID,
            c.FirstName,
            c.LastName,
            c.Phone,
            c.HouseAddress,
            c.AccountID,
            c.CustomerTypeID,
            t.CustomerTypeName,
            a.Email,
            a.Username
        FROM tbl_customer AS c
        INNER JOIN tbl_customer_type AS t
            ON c.CustomerTypeID = t.CustomerTypeID
        LEFT JOIN tbl_account AS a
            ON c.AccountID = a.AccountID
        WHERE 
            a.Username LIKE :search
            OR a.Email LIKE :search
            OR c.FirstName LIKE :search
            OR c.LastName LIKE :search
            OR CONCAT(c.FirstName, ' ', c.LastName) LIKE :search
            OR c.Phone LIKE :search
        ORDER BY 
            CASE 
                WHEN a.Username = :exactSearch THEN 1
                WHEN a.Email = :exactSearch THEN 2
                WHEN c.Phone = :exactSearch THEN 3
                WHEN a.Username LIKE :search THEN 4
                WHEN a.Email LIKE :search THEN 5
                WHEN c.Phone LIKE :search THEN 6
                ELSE 7
            END,
            c.CreatedAt DESC
        LIMIT 10
    ");
    
    $stmt->execute([
        ':search' => $searchTerm,
        ':exactSearch' => $exactSearchTerm
    ]);
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


