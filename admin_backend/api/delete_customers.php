<?php
// Set response headers
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: DELETE");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Methods, Authorization, X-Requested-With");

include_once(__DIR__ . '/../../includes/db_connection.php');

if (!$conn) {
    echo json_encode(["status" => "error", "message" => "Database connection failed."]);
    exit;
}

// Get raw input (JSON)
$data = json_decode(file_get_contents("php://input"), true);

// Validate input
if (empty($data['CustomerID'])) {
    echo json_encode(["status" => "error", "message" => "CustomerID is required."]);
    exit;
}

try {
    // Prepare delete query
    $query = "DELETE FROM tbl_customer WHERE CustomerID = :CustomerID";
    $stmt = $conn->prepare($query);
    $stmt->bindParam(":CustomerID", $data['CustomerID'], PDO::PARAM_INT);

    if ($stmt->execute()) {
        if ($stmt->rowCount() > 0) {
            echo json_encode(["status" => "success", "message" => "Customer deleted successfully."]);
        } else {
            echo json_encode(["status" => "error", "message" => "No customer found with that ID."]);
        }
    } else {
        echo json_encode(["status" => "error", "message" => "Failed to delete customer."]);
    }
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}

// Close connection
$conn = null;
?>
