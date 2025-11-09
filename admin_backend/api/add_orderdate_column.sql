-- Add OrderDate column to tbl_orders table
-- This column stores the date the order should be processed on,
-- based on operating hours (8am-5pm)

ALTER TABLE `tbl_orders` 
ADD COLUMN `OrderDate` DATE NULL AFTER `DeliveryDetailID`;

-- Update existing orders: set OrderDate to DATE(CreatedAt) for existing records
UPDATE `tbl_orders` 
SET `OrderDate` = DATE(`CreatedAt`)
WHERE `OrderDate` IS NULL;

-- Make OrderDate NOT NULL after backfilling
ALTER TABLE `tbl_orders` 
MODIFY COLUMN `OrderDate` DATE NOT NULL;

-- Add index for faster queries by OrderDate
CREATE INDEX `idx_orderdate` ON `tbl_orders` (`OrderDate`);


