<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

include_once(__DIR__ . '/../../includes/db_connection.php');

try {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['containerTypeID']) || !isset($data['quantity'])) {
        echo json_encode([
            'success' => false,
            'message' => 'Missing required fields: containerTypeID and quantity'
        ]);
        exit;
    }
    
    $containerTypeID = (int)$data['containerTypeID'];
    $quantity = (int)$data['quantity'];
    
    if ($quantity <= 0) {
        echo json_encode([
            'success' => false,
            'message' => 'Quantity must be greater than 0'
        ]);
        exit;
    }
    
    $conn->beginTransaction();
    
    // Get current stock
    $checkStmt = $conn->prepare("
        SELECT Stock FROM tbl_container_count 
        WHERE ContainerTypeID = ? FOR UPDATE
    ");
    $checkStmt->execute([$containerTypeID]);
    $currentStock = $checkStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$currentStock) {
        // Create stock record if it doesn't exist
        $insertStmt = $conn->prepare("
            INSERT INTO tbl_container_count (ContainerTypeID, Stock)
            VALUES (?, ?)
        ");
        $insertStmt->execute([$containerTypeID, $quantity]);
        $stockBefore = 0;
        $stockAfter = $quantity;
    } else {
        $stockBefore = (int)$currentStock['Stock'];
        $stockAfter = $stockBefore + $quantity;
        
        // Update stock
        $updateStmt = $conn->prepare("
            UPDATE tbl_container_count 
            SET Stock = Stock + ?
            WHERE ContainerTypeID = ?
        ");
        $updateStmt->execute([$quantity, $containerTypeID]);
    }
    
    $conn->commit();
    
    echo json_encode([
        'success' => true,
        'message' => 'Stock updated successfully',
        'data' => [
            'stockBefore' => $stockBefore,
            'stockAfter' => $stockAfter,
            'quantityAdded' => $quantity
        ]
    ]);
    
} catch (Exception $e) {
    $conn->rollBack();
    echo json_encode([
        'success' => false,
        'message' => 'Error updating stock: ' . $e->getMessage()
    ]);
}
?>

