<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type");

include_once(__DIR__ . '/../../includes/db_connection.php');

try {
    $containerTypeID = isset($_GET['containerTypeID']) ? (int)$_GET['containerTypeID'] : null;
    
    if ($containerTypeID !== null) {
        // Get stock for specific container type
        $stmt = $conn->prepare("
            SELECT 
                cc.CountID,
                cc.ContainerTypeID,
                cc.Stock,
                ct.ContainerTypeName
            FROM tbl_container_count cc
            JOIN tbl_container_type ct ON cc.ContainerTypeID = ct.ContainerTypeID
            WHERE cc.ContainerTypeID = ?
        ");
        $stmt->execute([$containerTypeID]);
        $stock = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$stock) {
            echo json_encode([
                'success' => false,
                'message' => 'Container type not found'
            ]);
            exit;
        }
        
        echo json_encode([
            'success' => true,
            'data' => [
                'stock' => $stock
            ]
        ]);
    } else {
        // Get all container stocks
        $stmt = $conn->prepare("
            SELECT 
                cc.CountID,
                cc.ContainerTypeID,
                cc.Stock,
                ct.ContainerTypeName
            FROM tbl_container_count cc
            JOIN tbl_container_type ct ON cc.ContainerTypeID = ct.ContainerTypeID
            ORDER BY cc.ContainerTypeID
        ");
        $stmt->execute();
        $stocks = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => $stocks
        ]);
    }
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching stock: ' . $e->getMessage()
    ]);
}
?>

