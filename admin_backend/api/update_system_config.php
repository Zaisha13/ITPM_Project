<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

include_once(__DIR__ . '/../../includes/db_connection.php');

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['type'])) {
        throw new Exception('Invalid request data');
    }
    
    $type = $input['type'];
    $conn->beginTransaction();
    
    try {
        if ($type === 'capacity') {
            $dailyLimit = isset($input['dailyOrderLimit']) ? (int)$input['dailyOrderLimit'] : 300;
            
            // Update daily order limit
            $stmt = $conn->prepare("
                INSERT INTO tbl_system_config (ConfigKey, ConfigValue) 
                VALUES ('daily_order_limit', ?)
                ON DUPLICATE KEY UPDATE ConfigValue = ?
            ");
            $stmt->execute([$dailyLimit, $dailyLimit]);
            
            // Recalculate available capacity
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
            
            $stmt = $conn->prepare("
                INSERT INTO tbl_system_config (ConfigKey, ConfigValue) 
                VALUES ('available_capacity', ?)
                ON DUPLICATE KEY UPDATE ConfigValue = ?
            ");
            $stmt->execute([$availableCapacity, $availableCapacity]);
            
        } else if ($type === 'operating_hours') {
            $openingTime = $input['openingTime'] ?? '08:00';
            $closingTime = $input['closingTime'] ?? '17:00';
            $operatingDays = isset($input['operatingDays']) ? json_encode($input['operatingDays']) : '[]';
            
            $stmt = $conn->prepare("
                INSERT INTO tbl_system_config (ConfigKey, ConfigValue) 
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE ConfigValue = ?
            ");
            
            $stmt->execute(['opening_time', $openingTime, $openingTime]);
            $stmt->execute(['closing_time', $closingTime, $closingTime]);
            $stmt->execute(['operating_days', $operatingDays, $operatingDays]);
            
        } else if ($type === 'maintenance') {
            $notices = [];

            if (isset($input['maintenanceNotices']) && is_array($input['maintenanceNotices'])) {
                foreach ($input['maintenanceNotices'] as $notice) {
                    if (!is_array($notice)) {
                        continue;
                    }

                    $id = isset($notice['id']) && is_string($notice['id']) && $notice['id'] !== ''
                        ? $notice['id']
                        : uniqid('notice_', true);

                    $notices[] = [
                        'id' => $id,
                        'title' => isset($notice['title']) ? (string)$notice['title'] : '',
                        'message' => isset($notice['message']) ? (string)$notice['message'] : '',
                        'startDate' => isset($notice['startDate']) ? (string)$notice['startDate'] : '',
                        'endDate' => isset($notice['endDate']) ? (string)$notice['endDate'] : '',
                        'createdAt' => isset($notice['createdAt']) ? (string)$notice['createdAt'] : date('c')
                    ];
                }
            } else {
                // Legacy payload support (single notice fields)
                $legacyTitle = $input['maintenanceTitle'] ?? '';
                $legacyMessage = $input['maintenanceMessage'] ?? '';
                $legacyStart = $input['maintenanceStartDate'] ?? '';
                $legacyEnd = $input['maintenanceEndDate'] ?? '';
                $legacyActive = isset($input['maintenanceActive']) && $input['maintenanceActive'];

                if ($legacyActive && ($legacyTitle !== '' || $legacyMessage !== '')) {
                    $notices[] = [
                        'id' => uniqid('notice_', true),
                        'title' => (string)$legacyTitle,
                        'message' => (string)$legacyMessage,
                        'startDate' => (string)$legacyStart,
                        'endDate' => (string)$legacyEnd,
                        'createdAt' => date('c')
                    ];
                }
            }

            $noticeJson = json_encode($notices, JSON_UNESCAPED_UNICODE);
            if ($noticeJson === false) {
                throw new Exception('Failed to encode maintenance notices');
            }

            $stmt = $conn->prepare("
                INSERT INTO tbl_system_config (ConfigKey, ConfigValue) 
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE ConfigValue = ?
            ");

            $stmt->execute(['maintenance_notices', $noticeJson, $noticeJson]);

            // Maintain legacy fields for backward compatibility
            $primaryNotice = !empty($notices) ? $notices[count($notices) - 1] : null;
            $legacyActive = $primaryNotice ? '1' : '0';
            $legacyTitle = $primaryNotice['title'] ?? '';
            $legacyMessage = $primaryNotice['message'] ?? '';
            $legacyStartDate = $primaryNotice['startDate'] ?? '';
            $legacyEndDate = $primaryNotice['endDate'] ?? '';
            $legacyId = $primaryNotice['id'] ?? '';
            $legacyCreatedAt = $primaryNotice['createdAt'] ?? '';

            $stmt->execute(['maintenance_active', $legacyActive, $legacyActive]);
            $stmt->execute(['maintenance_title', $legacyTitle, $legacyTitle]);
            $stmt->execute(['maintenance_message', $legacyMessage, $legacyMessage]);
            $stmt->execute(['maintenance_start_date', $legacyStartDate, $legacyStartDate]);
            $stmt->execute(['maintenance_end_date', $legacyEndDate, $legacyEndDate]);
            $stmt->execute(['maintenance_id', $legacyId, $legacyId]);
            $stmt->execute(['maintenance_created_at', $legacyCreatedAt, $legacyCreatedAt]);
            
        } else if ($type === 'contact') {
            $businessName = $input['businessName'] ?? '';
            $businessEmail = $input['businessEmail'] ?? '';
            $businessPhone = $input['businessPhone'] ?? '';
            $businessAddress = $input['businessAddress'] ?? '';
            $businessWebsite = $input['businessWebsite'] ?? '';
            
            $stmt = $conn->prepare("
                INSERT INTO tbl_system_config (ConfigKey, ConfigValue) 
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE ConfigValue = ?
            ");
            
            $stmt->execute(['business_name', $businessName, $businessName]);
            $stmt->execute(['business_email', $businessEmail, $businessEmail]);
            $stmt->execute(['business_phone', $businessPhone, $businessPhone]);
            $stmt->execute(['business_address', $businessAddress, $businessAddress]);
            $stmt->execute(['business_website', $businessWebsite, $businessWebsite]);
        }
        
        $conn->commit();
        
        echo json_encode([
            'success' => true,
            'message' => 'System configuration updated successfully'
        ]);
        
    } catch (Exception $e) {
        $conn->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error updating system config: ' . $e->getMessage()
    ]);
}
?>



