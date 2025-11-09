-- Create system configuration table
CREATE TABLE IF NOT EXISTS `tbl_system_config` (
  `ConfigID` int(11) NOT NULL AUTO_INCREMENT,
  `ConfigKey` varchar(100) NOT NULL,
  `ConfigValue` text NOT NULL,
  `UpdatedAt` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `UpdatedBy` int(11) DEFAULT NULL,
  PRIMARY KEY (`ConfigID`),
  UNIQUE KEY `UC_ConfigKey` (`ConfigKey`),
  KEY `FK_UpdatedBy` (`UpdatedBy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Insert default values
INSERT INTO `tbl_system_config` (`ConfigKey`, `ConfigValue`) VALUES
('daily_order_limit', '300'),
('available_capacity', '300'),
('opening_time', '08:00'),
('closing_time', '17:00'),
('operating_days', '["monday","tuesday","wednesday","thursday","friday","saturday"]'),
('maintenance_active', '0'),
('maintenance_title', ''),
('maintenance_message', ''),
('maintenance_start_date', ''),
('maintenance_end_date', ''),
('business_name', 'Water Avenue'),
('business_email', ''),
('business_phone', ''),
('business_address', ''),
('business_website', '')
ON DUPLICATE KEY UPDATE `ConfigValue` = VALUES(`ConfigValue`);



