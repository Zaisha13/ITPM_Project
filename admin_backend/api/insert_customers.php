<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Methods: POST");


include_once(__DIR__ . '/../../includes/db_connection.php');
if (!$conn) {
    die(json_encode(["status" => "error", "message" => "Database connection failed."]));
}


// Get the raw POST data
$data = json_decode(file_get_contents("php://input"), true);

// Validate required fields
if (empty($data['FirstName']) || empty($data['LastName'])) {
    echo json_encode(["status" => "error", "message" => "Missing required fields"]);
    exit;
}

// Handle optional AccountID (set to NULL if not provided or empty)
$accountID = isset($data['AccountID']) && !empty($data['AccountID']) ? $data['AccountID'] : null;

// Prepare insert query
$query = "INSERT INTO tbl_customer 
          (CustomerTypeID, AccountID, FirstName, LastName, Phone, HouseAddress, CreatedAt)
          VALUES (:CustomerTypeID, :AccountID, :FirstName, :LastName, :Phone, :HouseAddress, NOW())";

$stmt = $conn->prepare($query);

// Bind parameters
$stmt->bindParam(":CustomerTypeID", $data['CustomerTypeID']);
$stmt->bindParam(":AccountID", $accountID);
$stmt->bindParam(":FirstName", $data['FirstName']);
$stmt->bindParam(":LastName", $data['LastName']);
$stmt->bindParam(":Phone", $data['Phone']);
$stmt->bindParam(":HouseAddress", $data['HouseAddress']);

// Execute
if ($stmt->execute()) {
    echo json_encode([
        "status" => "success", 
        "message" => "Customer added successfully.",
        "CustomerID" => $conn->lastInsertId()
    ]);
} else {
    echo json_encode(["status" => "error", "message" => "Failed to add customer."]);
}
?>
