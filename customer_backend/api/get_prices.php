<?php
ob_start();
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . (defined('API_ALLOWED_ORIGIN') ? API_ALLOWED_ORIGIN : '*'));
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); ob_end_flush(); exit; }

include_once(__DIR__ . '/../../includes/db_connection.php');
if (!$conn instanceof PDO) { echo json_encode(["status"=>"error","message"=>"DB connection failed"]); ob_end_flush(); exit; }

try {
  $stmt = $conn->query("SELECT ContainerTypeID, ContainerTypeName, RefillPrice, NewContainerPrice FROM tbl_container_type");
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  echo json_encode(['status'=>'success','data'=>$rows]);
} catch (PDOException $e) {
  http_response_code(500);
  echo json_encode(['status'=>'error','message'=>$e->getMessage()]);
}
ob_end_flush();
?>

