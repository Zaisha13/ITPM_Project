<?php
ob_start();
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . (defined('API_ALLOWED_ORIGIN') ? API_ALLOWED_ORIGIN : '*'));
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); ob_end_flush(); exit; }

include_once(__DIR__ . '/../../includes/db_connection.php');
if (!$conn instanceof PDO) { echo json_encode(["status"=>"error","message"=>"DB connection failed"]); ob_end_flush(); exit; }
$accountID = $_SESSION['accountID'] ?? null;
if (!$accountID) {
    echo json_encode(["authenticated" => false]);
    exit;
}

try {
    $stmtAcc = $conn->prepare("SELECT AccountID, Username, Email, Role FROM tbl_account WHERE AccountID = :id LIMIT 1");
    $stmtAcc->execute([':id' => $accountID]);
    $account = $stmtAcc->fetch(PDO::FETCH_ASSOC);
    if (!$account) {
        echo json_encode(["authenticated" => false]);
        exit;
    }

    $stmtCust = $conn->prepare("SELECT CustomerID, FirstName, LastName, Phone, HouseAddress, CustomerTypeID FROM tbl_customer WHERE AccountID = :id LIMIT 1");
    $stmtCust->execute([':id' => $accountID]);
    $customer = $stmtCust->fetch(PDO::FETCH_ASSOC) ?: null;

    echo json_encode([
        "authenticated" => true,
        "account" => $account,
        "customer" => $customer
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
ob_end_flush();
?>

