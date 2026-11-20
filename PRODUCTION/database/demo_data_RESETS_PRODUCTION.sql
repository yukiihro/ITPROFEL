
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `team3production` DEFAULT CHARACTER SET utf8mb4;
USE `team3production`;

CREATE TABLE IF NOT EXISTS `items` (`id` INT NOT NULL, `item_code` VARCHAR(50) NOT NULL, `item_name` VARCHAR(150) NOT NULL, `item_type` VARCHAR(30) NOT NULL DEFAULT '', `size` VARCHAR(30) NOT NULL DEFAULT '', `unit` VARCHAR(30) NOT NULL DEFAULT 'pcs', `reorder_level` INT NOT NULL DEFAULT 0, `status` VARCHAR(20) NOT NULL DEFAULT 'Active', PRIMARY KEY (`id`), UNIQUE KEY `uq_items_code` (`item_code`)) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS `warehouses` (`id` INT NOT NULL, `warehouse_name` VARCHAR(100) NOT NULL DEFAULT '', `location` VARCHAR(150) NOT NULL DEFAULT '', PRIMARY KEY (`id`)) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS `requests` (`id` INT NOT NULL, `request_number` VARCHAR(50) NOT NULL, `requester_team` VARCHAR(50) NOT NULL DEFAULT '', `destination` VARCHAR(50) NOT NULL DEFAULT '', `status` VARCHAR(30) NOT NULL DEFAULT 'Pending', `delivery_status` VARCHAR(30) NULL DEFAULT NULL, `expected_days` VARCHAR(50) NULL DEFAULT NULL, `expected_date` DATE NULL DEFAULT NULL, `recipient_name` VARCHAR(255) NULL DEFAULT NULL, `recipient_gmail` VARCHAR(150) NULL DEFAULT NULL, `remarks` TEXT NULL, `po_number` VARCHAR(100) NULL DEFAULT NULL, `request_date` DATE NULL DEFAULT NULL, `expected_receive_date` DATE NULL DEFAULT NULL, `approved_at` DATETIME NULL DEFAULT NULL, `created_at` DATETIME NULL DEFAULT NULL, `synced_at` DATETIME NULL DEFAULT NULL, PRIMARY KEY (`id`), UNIQUE KEY `uq_requests_number` (`request_number`), KEY `ix_requests_status` (`status`)) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS `request_items` (`id` INT NOT NULL, `request_id` INT NOT NULL, `item_id` INT NULL DEFAULT NULL, `item_name` VARCHAR(150) NOT NULL DEFAULT '', `size` VARCHAR(30) NOT NULL DEFAULT '', `unit` VARCHAR(30) NOT NULL DEFAULT 'pcs', `quantity` DECIMAL(12,2) NOT NULL DEFAULT 0, `approved_quantity` DECIMAL(12,2) NOT NULL DEFAULT 0, `delivered_quantity` DECIMAL(12,2) NOT NULL DEFAULT 0, `accepted_quantity` DECIMAL(12,2) NOT NULL DEFAULT 0, PRIMARY KEY (`id`), KEY `ix_ri_request` (`request_id`), KEY `ix_ri_item` (`item_id`)) ENGINE=InnoDB;



DROP TABLE IF EXISTS `activity_log`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `quality_checks`;
DROP TABLE IF EXISTS `finished_goods`;
DROP TABLE IF EXISTS `production_costing`;
DROP TABLE IF EXISTS `production_monitoring`;
DROP TABLE IF EXISTS `checklist_items`;
DROP TABLE IF EXISTS `material_requests`;
DROP TABLE IF EXISTS `production_orders`;
DROP TABLE IF EXISTS `bill_of_materials`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `production_material_stock`;
DROP TABLE IF EXISTS `material_costs`;
DROP TABLE IF EXISTS `production_users`;
DROP TABLE IF EXISTS `production_login_attempts`;

CREATE TABLE `production_users` (
  `id`         INT NOT NULL AUTO_INCREMENT,
  `full_name`  VARCHAR(100) NOT NULL,
  `username`   VARCHAR(50)  NOT NULL,
  `email`      VARCHAR(100) NOT NULL,
  `password`   VARCHAR(255) NOT NULL,
  `role`       ENUM('production_staff','production_supervisor') NOT NULL DEFAULT 'production_staff',
  `status`     ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pusers_username` (`username`),
  UNIQUE KEY `uq_pusers_email` (`email`)
) ENGINE=InnoDB;

CREATE TABLE `material_costs` (
  `item_id`    INT NOT NULL,
  `cost_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`item_id`)
) ENGINE=InnoDB;

CREATE TABLE `production_material_stock` (
  `item_id`    INT NOT NULL COMMENT 'FK -> items.id (inventory Raw Material)',
  `quantity`   DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`item_id`)
) ENGINE=InnoDB;

CREATE TABLE `products` (
  `product_id`      INT NOT NULL AUTO_INCREMENT,
  `item_id`         INT NOT NULL COMMENT 'FK -> items.id (inventory Finished Good)',
  `product_name`    VARCHAR(100) NOT NULL,
  `unit_of_measure` VARCHAR(20) NOT NULL DEFAULT 'pairs',
  PRIMARY KEY (`product_id`),
  UNIQUE KEY `uq_products_item` (`item_id`)
) ENGINE=InnoDB;

CREATE TABLE `bill_of_materials` (
  `bom_id`       INT NOT NULL AUTO_INCREMENT,
  `product_id`   INT NOT NULL,
  `material_id`  INT NOT NULL COMMENT 'FK -> items.id (inventory Raw Material)',
  `qty_per_unit` DECIMAL(10,2) NOT NULL,
  `unit`         VARCHAR(30) NOT NULL,
  PRIMARY KEY (`bom_id`),
  UNIQUE KEY `uq_bom_product_material` (`product_id`,`material_id`),
  KEY `fk_bom_product` (`product_id`),
  KEY `fk_bom_material` (`material_id`),
  CONSTRAINT `fk_bom_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`)
) ENGINE=InnoDB;

CREATE TABLE `production_orders` (
  `order_id`   VARCHAR(10) NOT NULL COMMENT 'e.g. PO-1042',
  `product_id` INT NOT NULL,
  `quantity`   INT NOT NULL,
  `shoe_size_cm` DECIMAL(3,1) DEFAULT NULL COMMENT 'shoe size in centimetres, e.g. 26.5',
  `start_date` DATE NOT NULL,
  `priority`   ENUM('normal','urgent') NOT NULL DEFAULT 'normal',
  `status`     ENUM('planning','materials','production','quality_check','completed') NOT NULL DEFAULT 'planning',
  `eta_label`  VARCHAR(30) DEFAULT NULL COMMENT 'e.g. "3 days" — free-text estimate from the New Order form',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`order_id`),
  KEY `fk_orders_product` (`product_id`),
  CONSTRAINT `fk_orders_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`)
) ENGINE=InnoDB;

CREATE TABLE `material_requests` (
  `request_id`           INT NOT NULL AUTO_INCREMENT,
  `order_id`             VARCHAR(10) NOT NULL,
  `material_id`          INT NOT NULL COMMENT 'FK -> items.id (inventory Raw Material)',
  `quantity`             VARCHAR(40) NOT NULL COMMENT 'e.g. "200 pairs"',
  `qty_value`            DECIMAL(12,2) NOT NULL COMMENT 'numeric portion, used for stock math',
  `priority`             ENUM('normal','urgent') NOT NULL DEFAULT 'normal',
  `status`               ENUM('pending','approved','issued','rejected') NOT NULL DEFAULT 'pending',
  `inventory_request_id` INT DEFAULT NULL COMMENT 'FK -> inventory requests.id (mirror request seen by Inventory)',
  `requested_at`         DATETIME DEFAULT CURRENT_TIMESTAMP,
  `issued_at`            DATETIME DEFAULT NULL COMMENT 'when Inventory delivered (issued) the material to production',
  PRIMARY KEY (`request_id`),
  KEY `fk_reqs_order` (`order_id`),
  KEY `fk_reqs_material` (`material_id`),
  KEY `fk_reqs_inv_request` (`inventory_request_id`),
  CONSTRAINT `fk_reqs_order` FOREIGN KEY (`order_id`) REFERENCES `production_orders` (`order_id`)
) ENGINE=InnoDB;

CREATE TABLE `checklist_items` (
  `order_id`    VARCHAR(10) NOT NULL,
  `material_id` INT NOT NULL,
  `ready`       TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`order_id`, `material_id`),
  KEY `fk_checklist_material` (`material_id`),
  CONSTRAINT `fk_checklist_order` FOREIGN KEY (`order_id`) REFERENCES `production_orders` (`order_id`)
) ENGINE=InnoDB;

CREATE TABLE `production_monitoring` (
  `monitoring_id`    INT NOT NULL AUTO_INCREMENT,
  `order_id`         VARCHAR(10) NOT NULL,
  `progress_percent` TINYINT NOT NULL DEFAULT 0,
  `updated_at`       DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`monitoring_id`),
  UNIQUE KEY `uq_monitoring_order` (`order_id`),
  CONSTRAINT `fk_monitoring_order` FOREIGN KEY (`order_id`) REFERENCES `production_orders` (`order_id`)
) ENGINE=InnoDB;

CREATE TABLE `production_costing` (
  `costing_id`      INT NOT NULL AUTO_INCREMENT,
  `order_id`        VARCHAR(10) NOT NULL,
  `materials_cost`  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `labor_cost`      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `overhead_cost`   DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_cost`      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `sent_to_finance` TINYINT(1) NOT NULL DEFAULT 0,
  `calculated_at`   DATETIME DEFAULT CURRENT_TIMESTAMP,
  `sent_at`         DATETIME DEFAULT NULL,
  PRIMARY KEY (`costing_id`),
  KEY `fk_costing_order` (`order_id`),
  CONSTRAINT `fk_costing_order` FOREIGN KEY (`order_id`) REFERENCES `production_orders` (`order_id`)
) ENGINE=InnoDB;

CREATE TABLE `finished_goods` (
  `fg_id`        INT NOT NULL AUTO_INCREMENT,
  `order_id`     VARCHAR(10) NOT NULL,
  `product_id`   INT NOT NULL,
  `item_code`    VARCHAR(50) NOT NULL COMMENT 'items.item_code of the inventory Finished Good',
  `produced_qty` INT NOT NULL,
  `accepted_qty` INT NOT NULL,
  `rejected_qty` INT NOT NULL,
  `status`       ENUM('ready','sent_to_inventory') NOT NULL DEFAULT 'ready',
  `sent_at`      DATETIME DEFAULT NULL,
  PRIMARY KEY (`fg_id`),
  UNIQUE KEY `uq_fg_order` (`order_id`),
  KEY `fk_fg_order` (`order_id`),
  KEY `fk_fg_product` (`product_id`),
  CONSTRAINT `fk_fg_order` FOREIGN KEY (`order_id`) REFERENCES `production_orders` (`order_id`),
  CONSTRAINT `fk_fg_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`)
) ENGINE=InnoDB;

CREATE TABLE `quality_checks` (
  `qc_id`        INT NOT NULL AUTO_INCREMENT,
  `order_id`     VARCHAR(10) NOT NULL,
  `produced_qty` INT NOT NULL,
  `accepted_qty` INT DEFAULT NULL,
  `rejected_qty` INT DEFAULT NULL,
  `status`       ENUM('pending_review','reviewed') NOT NULL DEFAULT 'pending_review',
  `reviewed_at`  DATETIME DEFAULT NULL,
  PRIMARY KEY (`qc_id`),
  UNIQUE KEY `uq_qc_order` (`order_id`),
  CONSTRAINT `fk_qc_order` FOREIGN KEY (`order_id`) REFERENCES `production_orders` (`order_id`)
) ENGINE=InnoDB;

CREATE TABLE `notifications` (
  `id`         INT NOT NULL AUTO_INCREMENT,
  `type`       ENUM('warning','success','done','info','qc') NOT NULL,
  `message`    VARCHAR(255) NOT NULL,
  `order_id`   VARCHAR(10) DEFAULT NULL,
  `is_read`    TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_notif_order` (`order_id`),
  CONSTRAINT `fk_notif_order` FOREIGN KEY (`order_id`) REFERENCES `production_orders` (`order_id`)
) ENGINE=InnoDB;

CREATE TABLE `activity_log` (
  `id`         INT NOT NULL AUTO_INCREMENT,
  `user_id`    INT DEFAULT NULL,
  `action`     VARCHAR(255) NOT NULL COMMENT 'e.g. "created PO-1050" — already human-readable',
  `order_id`   VARCHAR(10) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_activity_user` (`user_id`),
  KEY `fk_activity_order` (`order_id`),
  CONSTRAINT `fk_activity_order` FOREIGN KEY (`order_id`) REFERENCES `production_orders` (`order_id`) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE OR REPLACE VIEW `delivery_raw_materials` AS
SELECT mr.request_id, mr.order_id, i.item_name AS material, mr.quantity, mr.priority,
       mr.requested_at, mr.issued_at, mr.status AS delivery_status
FROM `material_requests` mr
JOIN `items` i ON i.id = mr.material_id;

CREATE OR REPLACE VIEW `delivery_finished_goods` AS
SELECT qc.order_id,
       CONVERT(i.item_code USING utf8mb4) COLLATE utf8mb4_unicode_ci AS item_code,
       CONVERT(p.product_name USING utf8mb4) COLLATE utf8mb4_unicode_ci AS product,
       qc.produced_qty, NULL AS accepted_qty, NULL AS rejected_qty,
       'in_qc' AS delivery_status, NULL AS delivered_at, 0 AS sort_group, qc.qc_id AS record_id
FROM `quality_checks` qc
JOIN `production_orders` po ON po.order_id = qc.order_id
JOIN `products` p ON p.product_id = po.product_id
JOIN `items` i ON i.id = p.item_id
WHERE qc.status = 'pending_review'
UNION ALL
SELECT fg.order_id,
       CONVERT(fg.item_code USING utf8mb4) COLLATE utf8mb4_unicode_ci,
       CONVERT(p.product_name USING utf8mb4) COLLATE utf8mb4_unicode_ci,
       fg.produced_qty, fg.accepted_qty, fg.rejected_qty,
       CASE fg.status WHEN 'sent_to_inventory' THEN 'delivered' ELSE 'awaiting' END,
       fg.sent_at, 1, fg.fg_id
FROM `finished_goods` fg
JOIN `products` p ON p.product_id = fg.product_id;



DROP TEMPORARY TABLE IF EXISTS `seed_items`;
CREATE TEMPORARY TABLE `seed_items` AS
SELECT i.id, i.item_name, i.unit, i.item_code AS real_code,
  CASE WHEN LOWER(i.item_type) LIKE '%finish%'
    THEN CONCAT('SH-00', (SELECT COUNT(*) FROM `items` x WHERE LOWER(x.item_type) LIKE '%finish%' AND (x.status IS NULL OR x.status='' OR LOWER(x.status)='active') AND x.id <= i.id))
    ELSE CONCAT('RM-00', (SELECT COUNT(*) FROM `items` x WHERE LOWER(x.item_type) LIKE '%raw%' AND (x.status IS NULL OR x.status='' OR LOWER(x.status)='active') AND x.id <= i.id))
  END AS seed_code
FROM `items` i
WHERE (i.status IS NULL OR i.status='' OR LOWER(i.status)='active') AND (LOWER(i.item_type) LIKE '%finish%' OR LOWER(i.item_type) LIKE '%raw%');


INSERT INTO `production_users` (`full_name`,`username`,`email`,`password`,`role`) VALUES
('Production Supervisor','supervisor','supervisor@team3.local','$2y$10$KijKjeXORIZhQjVpyLrpPOliZCENkgsDfjd1O98GAPTfAy9IYOarO','production_supervisor'),
('Production Staff','staff','staff@team3.local','$2y$10$Hyb5t8jBwsNPG4tFLozju.6uvuUQWHhHQK13EOjS3REc0x7x4THRm','production_staff');

INSERT INTO `material_costs` (`item_id`,`cost_price`)
SELECT id, CASE seed_code
  WHEN 'RM-001' THEN 450.00
  WHEN 'RM-002' THEN 180.00
  WHEN 'RM-003' THEN 12.00
  WHEN 'RM-004' THEN 40.00
  WHEN 'RM-005' THEN 85.00
END
FROM `seed_items` WHERE seed_code IN ('RM-001','RM-002','RM-003','RM-004','RM-005');

INSERT INTO `products` (`product_id`,`item_id`,`product_name`,`unit_of_measure`)
SELECT 1, id, item_name, unit FROM `seed_items` WHERE seed_code = 'SH-001';
INSERT INTO `products` (`product_id`,`item_id`,`product_name`,`unit_of_measure`)
SELECT 2, id, item_name, unit FROM `seed_items` WHERE seed_code = 'SH-002';
INSERT INTO `products` (`product_id`,`item_id`,`product_name`,`unit_of_measure`)
SELECT 3, id, item_name, unit FROM `seed_items` WHERE seed_code = 'SH-003';

INSERT IGNORE INTO `bill_of_materials` (`product_id`,`material_id`,`qty_per_unit`,`unit`)
SELECT b.product_id, i.id, b.qty, i.unit
FROM (
  SELECT 1 AS product_id, 'RM-001' AS code, 0.50 AS qty UNION ALL
  SELECT 1, 'RM-002', 1    UNION ALL SELECT 1, 'RM-003', 1    UNION ALL
  SELECT 1, 'RM-004', 1    UNION ALL SELECT 1, 'RM-005', 0.05 UNION ALL
  SELECT 2, 'RM-001', 0.60 UNION ALL SELECT 2, 'RM-002', 1    UNION ALL
  SELECT 2, 'RM-003', 1    UNION ALL SELECT 2, 'RM-004', 1    UNION ALL
  SELECT 2, 'RM-005', 0.04 UNION ALL
  SELECT 3, 'RM-001', 0.45 UNION ALL SELECT 3, 'RM-002', 1    UNION ALL
  SELECT 3, 'RM-003', 1    UNION ALL SELECT 3, 'RM-004', 1    UNION ALL
  SELECT 3, 'RM-005', 0.06
) b JOIN `seed_items` i ON i.seed_code = b.code;

INSERT INTO `products` (`item_id`,`product_name`,`unit_of_measure`)
SELECT i.id, i.item_name, COALESCE(NULLIF(i.unit,''),'pairs') FROM `items` i
WHERE LOWER(i.item_type) LIKE '%finish%' AND (i.status IS NULL OR i.status='' OR LOWER(i.status)='active')
  AND i.id NOT IN (SELECT item_id FROM `products`);
INSERT IGNORE INTO `bill_of_materials` (`product_id`,`material_id`,`qty_per_unit`,`unit`)
SELECT p.product_id, b1.material_id, b1.qty_per_unit, b1.unit
FROM `products` p JOIN `bill_of_materials` b1 ON b1.product_id = 1
WHERE p.product_id > 3 AND p.product_id NOT IN (SELECT product_id FROM (SELECT product_id FROM `bill_of_materials`) z);

INSERT INTO `production_orders` (`order_id`,`product_id`,`quantity`,`shoe_size_cm`,`start_date`,`priority`,`status`,`eta_label`,`created_at`) VALUES
('PO-1042',1,20,26.0,'2026-09-02','normal','production','3 days','2026-09-02 08:00:00'),
('PO-1041',3,30,27.0,'2026-09-03','urgent','materials','5 days','2026-09-03 08:00:00'),
('PO-1043',2,15,25.5,'2026-09-08','normal','planning','4 days','2026-09-08 08:00:00'),
('PO-1040',2,15,27.0,'2026-08-29','normal','quality_check','3 days','2026-08-29 08:00:00'),
('PO-1039',1,40,26.5,'2026-08-17','normal','completed','3 days','2026-08-17 08:00:00'),
('PO-1038',3,25,25.0,'2026-08-25','normal','quality_check','4 days','2026-08-25 08:00:00');

INSERT INTO `material_requests` (`order_id`,`material_id`,`quantity`,`qty_value`,`priority`,`status`)
SELECT r.order_id, i.id, CONCAT(TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM CAST(r.qty AS CHAR))), ' ', i.unit), r.qty, r.priority, r.status
FROM (
  SELECT 'PO-1042' AS order_id, 'RM-002' AS code, 20.00 AS qty, 'normal' AS priority, 'issued'   AS status UNION ALL
  SELECT 'PO-1042', 'RM-001', 10.00, 'normal', 'pending'  UNION ALL
  SELECT 'PO-1041', 'RM-001', 13.50, 'urgent', 'approved' UNION ALL
  SELECT 'PO-1041', 'RM-002', 30.00, 'urgent', 'pending'  UNION ALL
  SELECT 'PO-1041', 'RM-004', 30.00, 'urgent', 'rejected'
) r JOIN `seed_items` i ON i.seed_code = r.code;

INSERT INTO `production_material_stock` (`item_id`,`quantity`)
SELECT material_id, SUM(qty_value) FROM `material_requests` WHERE status='issued' GROUP BY material_id;

UPDATE `material_requests` SET `issued_at`='2026-09-04 09:00:00' WHERE `status`='issued';

INSERT INTO `checklist_items` (`order_id`,`material_id`,`ready`)
SELECT po.order_id, bm.material_id,
  CASE WHEN (po.order_id = 'PO-1042' AND i.seed_code = 'RM-002')
         OR (po.order_id = 'PO-1041' AND i.seed_code = 'RM-001') THEN 1 ELSE 0 END
FROM `production_orders` po
JOIN `bill_of_materials` bm ON bm.product_id = po.product_id
JOIN `seed_items` i ON i.id = bm.material_id
WHERE po.order_id IN ('PO-1042','PO-1041','PO-1043');

INSERT INTO `production_monitoring` (`order_id`,`progress_percent`) VALUES
('PO-1042',65),('PO-1041',33),('PO-1043',10),('PO-1038',100),('PO-1040',100),('PO-1039',100);

INSERT INTO `quality_checks` (`order_id`,`produced_qty`,`accepted_qty`,`rejected_qty`,`status`,`reviewed_at`) VALUES
('PO-1038',25,NULL,NULL,'pending_review',NULL),
('PO-1040',15,14,1,'reviewed','2026-09-01 10:00:00'),
('PO-1039',40,38,2,'reviewed','2026-08-20 10:00:00');

INSERT INTO `production_costing` (`order_id`,`materials_cost`,`labor_cost`,`overhead_cost`,`total_cost`,`calculated_at`)
SELECT po.order_id, ROUND(SUM(bm.qty_per_unit * po.quantity * mc.cost_price)),
       CASE po.order_id WHEN 'PO-1040' THEN 6000 ELSE 8000 END,
       CASE po.order_id WHEN 'PO-1040' THEN 2000 ELSE 2400 END,
       ROUND(SUM(bm.qty_per_unit * po.quantity * mc.cost_price))
         + CASE po.order_id WHEN 'PO-1040' THEN 8000 ELSE 10400 END,
       CASE po.order_id WHEN 'PO-1040' THEN '2026-09-01 11:00:00' ELSE '2026-08-20 11:00:00' END
FROM `production_orders` po
JOIN `bill_of_materials` bm ON bm.product_id = po.product_id
JOIN `material_costs` mc ON mc.item_id = bm.material_id
WHERE po.order_id IN ('PO-1040','PO-1039')
GROUP BY po.order_id;

INSERT INTO `finished_goods` (`order_id`,`product_id`,`item_code`,`produced_qty`,`accepted_qty`,`rejected_qty`,`status`,`sent_at`)
SELECT 'PO-1040', 2, real_code, 15, 14, 1, 'ready', NULL FROM `seed_items` WHERE seed_code = 'SH-002';
INSERT INTO `finished_goods` (`order_id`,`product_id`,`item_code`,`produced_qty`,`accepted_qty`,`rejected_qty`,`status`,`sent_at`)
SELECT 'PO-1039', 1, real_code, 40, 38, 2, 'sent_to_inventory', '2026-08-20 12:00:00' FROM `seed_items` WHERE seed_code = 'SH-001';

INSERT INTO `notifications` (`type`,`message`,`order_id`,`is_read`) VALUES
('warning','Rubber soles needed for PO-1041','PO-1041',0),
('qc','PO-1038 is pending quality review','PO-1038',0),
('done','PO-1040 marked complete','PO-1040',1);

DROP TEMPORARY TABLE IF EXISTS `seed_items`;
SET FOREIGN_KEY_CHECKS = 1;
