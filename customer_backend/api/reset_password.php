<?php
// THIS IS NOT PART OF THE UI, I JUST INCLUDED FOR ME WHEN I FORGOT THE PASSWORD OF MY TESTING PHASE

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Include your database connection
include_once(__DIR__ . '/../../includes/db_connection.php');

// Check database connection
if (!$conn instanceof PDO) {
    echo json_encode(["status" => "error", "message" => "Database connection failed."]);
    exit;
}

// Read JSON input
$input = json_decode(file_get_contents("php://input"), true);
if (json_last_error() !== JSON_ERROR_NONE) {
    echo json_encode(["status" => "error", "message" => "Invalid JSON format."]);
    exit;
}

// Get values from body
$email = $input['email'] ?? null;
$accountID = $input['accountID'] ?? null;
$newPassword = $input['newPassword'] ?? null;

// Validate input
if (empty($newPassword)) {
    echo json_encode(["status" => "error", "message" => "New password is required."]);
    exit;
}

// Hash the new password securely
$hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT);

try {
    // Determine lookup field (email or accountID)
    if (!empty($email)) {
        $stmt = $conn->prepare("UPDATE tbl_account SET PasswordHash = :hash, UpdatedAt = NOW() WHERE Email = :email");
        $stmt->execute([
            ':hash' => $hashedPassword,
            ':email' => $email
        ]);
    } elseif (!empty($accountID)) {
        $stmt = $conn->prepare("UPDATE tbl_account SET PasswordHash = :hash, UpdatedAt = NOW() WHERE AccountID = :id");
        $stmt->execute([
            ':hash' => $hashedPassword,
            ':id' => $accountID
        ]);
    } else {
        echo json_encode(["status" => "error", "message" => "Please provide either email or accountID."]);
        exit;
    }

    // Check if any record was updated
    if ($stmt->rowCount() > 0) {
        echo json_encode([
            "status" => "success",
            "message" => "Password reset successfully.",
            "newPassword" => $newPassword // show only for testing — remove in production
        ]);
    } else {
        echo json_encode(["status" => "error", "message" => "No matching account found."]);
    }

} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
}
?>
