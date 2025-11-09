<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type");

include_once(__DIR__ . '/../../includes/db_connection.php');

try {
    $type = isset($_GET['type']) ? $_GET['type'] : 'all';
    
    // Get all config values
    $stmt = $conn->prepare("SELECT ConfigKey, ConfigValue FROM tbl_system_config");
    $stmt->execute();
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $config = [];
    foreach ($results as $row) {
        $config[$row['ConfigKey']] = $row['ConfigValue'];
    }
    
    // Calculate available capacity based on confirmed orders today
    if (isset($config['daily_order_limit'])) {
        $dailyLimit = (int)$config['daily_order_limit'];
        
        // Count confirmed orders for today
        $today = date('Y-m-d');
        $capacityStmt = $conn->prepare("
            SELECT COUNT(DISTINCT o.OrderID) as confirmed_count
            FROM tbl_orders o
            WHERE DATE(o.CreatedAt) = ?
            AND o.OrderStatusID = (
                SELECT OrderStatusID FROM tbl_order_status WHERE OrderStatusName = 'Confirmed'
                LIMIT 1
            )
        ");
        $capacityStmt->execute([$today]);
        $capacityResult = $capacityStmt->fetch(PDO::FETCH_ASSOC);
        $confirmedCount = (int)($capacityResult['confirmed_count'] ?? 0);
        
        $availableCapacity = max(0, $dailyLimit - $confirmedCount);
        $config['available_capacity'] = (string)$availableCapacity;
    }
    
    // Format response based on type
    if ($type === 'capacity') {
        echo json_encode([
            'success' => true,
            'config' => [
                'total' => $config['daily_order_limit'] ?? '300',
                'available' => $config['available_capacity'] ?? '300'
            ]
        ]);
    } else if ($type === 'operating_hours') {
        $operatingDays = json_decode($config['operating_days'] ?? '[]', true);
        echo json_encode([
            'success' => true,
            'config' => [
                'openingTime' => $config['opening_time'] ?? '08:00',
                'closingTime' => $config['closing_time'] ?? '17:00',
                'operatingDays' => $operatingDays
            ]
        ]);
    } else if ($type === 'maintenance') {
        $maintenanceNotices = [];
        if (!empty($config['maintenance_notices'])) {
            $decoded = json_decode($config['maintenance_notices'], true);
            if (is_array($decoded)) {
                $maintenanceNotices = $decoded;
            }
        }

        // Backward compatibility: if legacy maintenance fields exist but no notice list yet
        if (empty($maintenanceNotices) && (
            !empty($config['maintenance_title']) ||
            !empty($config['maintenance_message'])
        )) {
            $maintenanceNotices[] = [
                'id' => $config['maintenance_id'] ?? uniqid('legacy_', true),
                'title' => $config['maintenance_title'] ?? '',
                'message' => $config['maintenance_message'] ?? '',
                'startDate' => $config['maintenance_start_date'] ?? '',
                'endDate' => $config['maintenance_end_date'] ?? '',
                'createdAt' => $config['maintenance_created_at'] ?? date('c')
            ];
        }

        echo json_encode([
            'success' => true,
            'config' => [
                'notices' => $maintenanceNotices
            ]
        ]);
    } else {
        // Return all config
        echo json_encode([
            'success' => true,
            'config' => $config
        ]);
    }
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error fetching system config: ' . $e->getMessage()
    ]);
}
?>



