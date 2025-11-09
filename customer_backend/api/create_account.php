<?php
ob_start();
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . (defined('API_ALLOWED_ORIGIN') ? API_ALLOWED_ORIGIN : '*'));
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); ob_end_flush(); exit; }


// ACCOUNT REGISTER

// Database connection
include_once(__DIR__ . '/../../includes/db_connection.php');
if (!$conn instanceof PDO) { echo json_encode(["status"=>"error","message"=>"DB connection failed"]); ob_end_flush(); exit; }

// Get input data from POST request
$data = json_decode(file_get_contents('php://input'), true);
if (json_last_error() !== JSON_ERROR_NONE) {
    echo json_encode(["status" => "error", "message" => "Invalid JSON input"]);
    ob_end_flush(); exit;
}

$firstName = trim($data['firstName'] ?? '');
$lastName = trim($data['lastName'] ?? '');
$username = trim($data['username'] ?? '');
$email = trim($data['email'] ?? '');
$phone = trim($data['phone'] ?? '');
$address = trim($data['address'] ?? '');
$password = $data['password'] ?? '';
$retypePassword = $data['retypePassword'] ?? '';
$customerType = $data['customerType'] ?? 'Regular'; // Default to Regular if not provided

// Validate required fields
if (empty($firstName) || empty($lastName) || empty($username) || empty($email) || empty($phone) || empty($address) || empty($password) || empty($retypePassword)) {
    echo json_encode(["status" => "error", "message" => "All fields are required"]);
    exit;
}

// Validate password match
if ($password !== $retypePassword) {
    echo json_encode(["status" => "error", "message" => "Passwords do not match"]);
    exit;
}

// Validate uniqueness upfront for clearer messages
try {
    // Username
    $stmtChk = $conn->prepare("SELECT 1 FROM tbl_account WHERE Username = :u LIMIT 1");
    $stmtChk->execute([':u' => $username]);
    if ($stmtChk->fetch()) {
        echo json_encode(["status" => "error", "message" => "Username already exists"]);
        exit;
    }
    // Email
    $stmtChk = $conn->prepare("SELECT 1 FROM tbl_account WHERE Email = :e LIMIT 1");
    $stmtChk->execute([':e' => $email]);
    if ($stmtChk->fetch()) {
        echo json_encode(["status" => "error", "message" => "Email already registered"]);
        exit;
    }
    // Phone
    $stmtChk = $conn->prepare("SELECT 1 FROM tbl_customer WHERE Phone = :p LIMIT 1");
    $stmtChk->execute([':p' => $phone]);
    if ($stmtChk->fetch()) {
        echo json_encode(["status" => "error", "message" => "Phone already registered"]);
        exit;
    }
} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Validation failed: " . $e->getMessage()]);
    exit;
}

// Hash the password
$hashedPassword = password_hash($password, PASSWORD_BCRYPT);

// Begin transaction
$conn->beginTransaction();

try {
    // Insert into tbl_account
    $stmtAccount = $conn->prepare("INSERT INTO tbl_account (Username, Email, PasswordHash, Role, CreatedAt, UpdatedAt) VALUES (:username, :email, :password, :role, NOW(), NOW())");
    $stmtAccount->execute([
        ':username' => $username,
        ':email' => $email,
        ':password' => $hashedPassword,
        ':role' => 'Customer'
    ]);
    $accountID = $conn->lastInsertId();

    // Insert into tbl_customer
    $stmtCustomer = $conn->prepare("INSERT INTO tbl_customer (CustomerTypeID, AccountID, FirstName, LastName, Phone, HouseAddress, CreatedAt, UpdatedAt) VALUES (:customerTypeID, :accountID, :firstName, :lastName, :phone, :address, NOW(), NOW())");
    $customerTypeID = ($customerType === 'Dealer') ? 2 : 1; // 1 for Regular, 2 for Dealer
    $stmtCustomer->execute([
        ':customerTypeID' => $customerTypeID,
        ':accountID' => $accountID,
        ':firstName' => $firstName,
        ':lastName' => $lastName,
        ':phone' => $phone,
        ':address' => $address
    ]);

    $conn->commit();
    echo json_encode(["success" => true, "message" => "Account created successfully", "accountID" => $accountID]);
} catch (PDOException $e) {
    $conn->rollBack();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Account creation failed: " . $e->getMessage()]);
}
ob_end_flush();
?>