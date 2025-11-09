<?php
ob_start();
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . (defined('API_ALLOWED_ORIGIN') ? API_ALLOWED_ORIGIN : '*'));
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); ob_end_flush(); exit; }

// Database connection
include_once(__DIR__ . '/../../includes/db_connection.php');
if (!$conn) { echo json_encode(["status"=>"error","message"=>"DB connection failed"]); ob_end_flush(); exit; }

// Get input data from POST request
$data = json_decode(file_get_contents('php://input'), true);
if (json_last_error() !== JSON_ERROR_NONE) {
    echo json_encode(["status" => "error", "message" => "Invalid JSON input"]);
    ob_end_flush(); exit;
}

$usernameOrEmail = $data['usernameOrEmail'] ?? '';
$password = $data['password'] ?? '';

// Validate required fields
if (empty($usernameOrEmail) || empty($password)) {
    echo json_encode(["status" => "error", "message" => "Username/Email and password are required"]);
    exit;
}

try {
    // Check if input is an email or username
    $field = filter_var($usernameOrEmail, FILTER_VALIDATE_EMAIL) ? 'Email' : 'Username';
    $stmt = $conn->prepare("SELECT AccountID, Username, Email, PasswordHash, Role FROM tbl_account WHERE $field = :value LIMIT 1");
    $stmt->execute([':value' => $usernameOrEmail]);
    $account = $stmt->fetch(PDO::FETCH_ASSOC);

    // Enforce correct password (no dev bypass)
    if ($account && password_verify($password, $account['PasswordHash'])) {
        // Successful login
        // Set session for subsequent authenticated actions
        $_SESSION['accountID'] = (int)$account['AccountID'];

        // Fetch linked customer profile
        $stmtProfile = $conn->prepare("SELECT CustomerID, FirstName, LastName, Phone, HouseAddress, CustomerTypeID FROM tbl_customer WHERE AccountID = :accountID LIMIT 1");
        $stmtProfile->execute([':accountID' => $account['AccountID']]);
        $customer = $stmtProfile->fetch(PDO::FETCH_ASSOC) ?: null;

        unset($account['PasswordHash']); // Remove password hash from response for security

        echo json_encode([
            "status" => "success",
            "message" => "Login successful",
            "account" => $account,
            "customer" => $customer
        ]);
    } else {
        echo json_encode(["status" => "error", "message" => "Invalid username/email or password"]);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Login failed: " . $e->getMessage()]);
}
ob_end_flush();
?>