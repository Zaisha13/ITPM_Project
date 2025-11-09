<?php

include_once(__DIR__ . '/config.php');

// ⚙️ Set environment-based error display
if (APP_ENV === 'development') {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

$host = "localhost";
$username = "root";
$password = "";
$database = "itpm_db"; 

try {
    $conn = new PDO("mysql:host=$host;dbname=$database;charset=utf8", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die(json_encode([
        "status" => "error",
        "message" => "Database connection failed: " . $e->getMessage()
    ]));
}
?>
