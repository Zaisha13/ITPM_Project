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
if (!$conn instanceof PDO) { echo json_encode(["status"=>"error","message"=>"DB connection failed"]); ob_end_flush(); exit; }
$accountID = $_SESSION['accountID'] ?? null; // Example: Assume accountID is stored in session after login
if (empty($accountID)) { echo json_encode(["status" => "error", "message" => "Account ID not found in session"]); ob_end_flush(); exit; }

// Get input data from POST request
$data = json_decode(file_get_contents('php://input'), true);
if (json_last_error() !== JSON_ERROR_NONE) { echo json_encode(["status" => "error", "message" => "Invalid JSON input"]); ob_end_flush(); exit; }

$firstName = $data['firstName'] ?? '';
$lastName = $data['lastName'] ?? '';
$username = $data['username'] ?? '';
$email = $data['email'] ?? '';
$phone = $data['phone'] ?? '';
$address = $data['address'] ?? '';
$password = $data['password'] ?? '';
$retypePassword = $data['retypePassword'] ?? '';
$currentPassword = $data['currentPassword'] ?? '';
$customerType = $data['customerType'] ?? '';

// Validate required fields (allow password empty for no-change)
if (empty($firstName) || empty($lastName) || empty($username) || empty($email) || empty($phone) || empty($address)) {
    echo json_encode(["status" => "error", "message" => "Missing required profile fields"]);
    exit;
}

// If password provided, validate current + match
if ($password !== '' || $retypePassword !== '') {
    if ($password !== $retypePassword) {
        echo json_encode(["status" => "error", "message" => "Passwords do not match"]);
        exit;
    }
    // Verify current password
    $stmtPwd = $conn->prepare("SELECT PasswordHash FROM tbl_account WHERE AccountID = :id LIMIT 1");
    $stmtPwd->execute([':id' => $accountID]);
    $rowPwd = $stmtPwd->fetch(PDO::FETCH_ASSOC);
    if (!$rowPwd || !password_verify($currentPassword, $rowPwd['PasswordHash'])) {
        echo json_encode(["status" => "error", "message" => "Current password is incorrect"]);
        exit;
    }
}

// Hash the password if provided
$hashedPassword = $password !== '' ? password_hash($password, PASSWORD_BCRYPT) : null;

// Begin transaction
$conn->beginTransaction();

try {
    // Uniqueness checks excluding this account
    $stmtChk = $conn->prepare("SELECT 1 FROM tbl_account WHERE Username = :u AND AccountID <> :id LIMIT 1");
    $stmtChk->execute([':u' => $username, ':id' => $accountID]);
    if ($stmtChk->fetch()) {
        throw new PDOException('Username already exists');
    }
    $stmtChk = $conn->prepare("SELECT 1 FROM tbl_account WHERE Email = :e AND AccountID <> :id LIMIT 1");
    $stmtChk->execute([':e' => $email, ':id' => $accountID]);
    if ($stmtChk->fetch()) {
        throw new PDOException('Email already registered');
    }

    // Get existing customerTypeID to preserve it
    $stmtGetCustomer = $conn->prepare("SELECT CustomerTypeID FROM tbl_customer WHERE AccountID = :accountID");
    $stmtGetCustomer->execute([':accountID' => $accountID]);
    $customer = $stmtGetCustomer->fetch(PDO::FETCH_ASSOC);
    if (!$customer) {
        throw new PDOException("Customer record not found for account ID $accountID");
    }
    // Determine intended CustomerTypeID (if provided)
    $customerTypeID = $customer['CustomerTypeID'];
    if ($customerType !== '') {
        $customerTypeID = (strtolower($customerType) === 'dealer') ? 2 : 1;
    }

    // Update tbl_account (conditionally update password)
    if ($hashedPassword) {
        $stmtAccount = $conn->prepare("UPDATE tbl_account SET Username = :username, Email = :email, PasswordHash = :password, UpdatedAt = NOW() WHERE AccountID = :accountID");
        $stmtAccount->execute([
            ':username' => $username,
            ':email' => $email,
            ':password' => $hashedPassword,
            ':accountID' => $accountID
        ]);
    } else {
        $stmtAccount = $conn->prepare("UPDATE tbl_account SET Username = :username, Email = :email, UpdatedAt = NOW() WHERE AccountID = :accountID");
        $stmtAccount->execute([
            ':username' => $username,
            ':email' => $email,
            ':accountID' => $accountID
        ]);
    }

    // Update tbl_customer (preserve CustomerTypeID)
    // Ensure phone uniqueness across customers (excluding this account's customer)
    $stmtChkPhone = $conn->prepare("SELECT 1 FROM tbl_customer WHERE Phone = :p AND AccountID <> :accountID LIMIT 1");
    $stmtChkPhone->execute([':p' => $phone, ':accountID' => $accountID]);
    if ($stmtChkPhone->fetch()) {
        throw new PDOException('Phone already registered');
    }

    $stmtCustomer = $conn->prepare("UPDATE tbl_customer SET FirstName = :firstName, LastName = :lastName, Phone = :phone, HouseAddress = :address, CustomerTypeID = :ctype, UpdatedAt = NOW() WHERE AccountID = :accountID");
    $stmtCustomer->execute([
        ':accountID' => $accountID,
        ':firstName' => $firstName,
        ':lastName' => $lastName,
        ':phone' => $phone,
        ':address' => $address,
        ':ctype' => $customerTypeID
    ]);

    $conn->commit();
    echo json_encode(["success" => true, "message" => "Account updated successfully"]);
} catch (PDOException $e) {
    $conn->rollBack();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Account update failed: " . $e->getMessage()]);
}
ob_end_flush();
?>