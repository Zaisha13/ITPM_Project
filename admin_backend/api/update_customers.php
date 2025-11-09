<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: PUT");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once(__DIR__ . '/../../includes/db_connection.php');
if (!$conn) {
    die(json_encode(["status" => "error", "message" => "Database connection failed."]));
}

$data = json_decode(file_get_contents("php://input"), true);

// Validate that CustomerID is provided
if (empty($data['CustomerID'])) {
    echo json_encode(["status" => "error", "message" => "CustomerID is required."]);
    exit;
}

// List of allowed fields that can be updated
$allowedFields = ['CustomerTypeID', 'AccountID', 'FirstName', 'LastName', 'Phone', 'HouseAddress'];

// Build the SET part dynamically
$setParts = [];
$params = [];
foreach ($allowedFields as $field) {
    if (isset($data[$field])) {
        $setParts[] = "$field = :$field";
        $params[":$field"] = $data[$field];
    }
}

// Add UpdatedAt timestamp
$setParts[] = "UpdatedAt = NOW()";

// If no valid fields provided
if (count($setParts) === 1) { // only UpdatedAt
    echo json_encode(["status" => "error", "message" => "No valid fields provided for update."]);
    exit;
}

// Combine into SQL query
$query = "UPDATE tbl_customer SET " . implode(", ", $setParts) . " WHERE CustomerID = :CustomerID";
$params[":CustomerID"] = $data['CustomerID'];

// Prepare and execute
$stmt = $conn->prepare($query);
if ($stmt->execute($params)) {
    echo json_encode(["status" => "success", "message" => "Customer updated successfully."]);
} else {
    echo json_encode(["status" => "error", "message" => "Failed to update customer."]);
}
?>
