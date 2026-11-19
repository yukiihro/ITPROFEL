
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `team3production` DEFAULT CHARACTER SET utf8mb4;
USE `team3production`;

CREATE TABLE IF NOT EXISTS `items` (`id` INT NOT NULL, `item_code` VARCHAR(50) NOT NULL, `item_name` VARCHAR(150) NOT NULL, `item_type` VARCHAR(30) NOT NULL DEFAULT '', `size` VARCHAR(30) NOT NULL DEFAULT '', `unit` VARCHAR(30) NOT NULL DEFAULT 'pcs', `reorder_level` INT NOT NULL DEFAULT 0, `status` VARCHAR(20) NOT NULL DEFAULT 'Active', PRIMARY KEY (`id`), UNIQUE KEY `uq_items_code` (`item_code`)) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS `warehouses` (`id` INT NOT NULL, `warehouse_name` VARCHAR(100) NOT NULL DEFAULT '', `location` VARCHAR(150) NOT NULL DEFAULT '', PRIMARY KEY (`id`)) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS `requests` (`id` INT NOT NULL, `request_number` VARCHAR(50) NOT NULL, `requester_team` VARCHAR(50) NOT NULL DEFAULT '', `destination` VARCHAR(50) NOT NULL DEFAULT '', `status` VARCHAR(30) NOT NULL DEFAULT 'Pending', `delivery_status` VARCHAR(30) NULL DEFAULT NULL, `expected_days` VARCHAR(50) NULL DEFAULT NULL, `expected_date` DATE NULL DEFAULT NULL, `recipient_name` VARCHAR(255) NULL DEFAULT NULL, `recipient_gmail` VARCHAR(150) NULL DEFAULT NULL, `remarks` TEXT NULL, `po_number` VARCHAR(100) NULL DEFAULT NULL, `request_date` DATE NULL DEFAULT NULL, `expected_receive_date` DATE NULL DEFAULT NULL, `approved_at` DATETIME NULL DEFAULT NULL, `created_at` DATETIME NULL DEFAULT NULL, `synced_at` DATETIME NULL DEFAULT NULL, PRIMARY KEY (`id`), UNIQUE KEY `uq_requests_number` (`request_number`), KEY `ix_requests_status` (`status`)) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS `request_items` (`id` INT NOT NULL, `request_id` INT NOT NULL, `item_id` INT NULL DEFAULT NULL, `item_name` VARCHAR(150) NOT NULL DEFAULT '', `size` VARCHAR(30) NOT NULL DEFAULT '', `unit` VARCHAR(30) NOT NULL DEFAULT 'pcs', `quantity` DECIMAL(12,2) NOT NULL DEFAULT 0, `approved_quantity` DECIMAL(12,2) NOT NULL DEFAULT 0, `delivered_quantity` DECIMAL(12,2) NOT NULL DEFAULT 0, `accepted_quantity` DECIMAL(12,2) NOT NULL DEFAULT 0, PRIMARY KEY (`id`), KEY `ix_ri_request` (`request_id`), KEY `ix_ri_item` (`item_id`)) ENGINE=InnoDB;



CREATE TABLE IF NOT EXISTS `production_users` (
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

CREATE TABLE IF NOT EXISTS `material_costs` (
  `item_id`    INT NOT NULL,
  `cost_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`item_id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `production_material_stock` (
  `item_id`    INT NOT NULL COMMENT 'FK -> items.id (inventory Raw Material)',
  `quantity`   DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`item_id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `products` (
  `product_id`      INT NOT NULL AUTO_INCREMENT,
  `item_id`         INT NOT NULL COMMENT 'FK -> items.id (inventory Finished Good)',
  `product_name`    VARCHAR(100) NOT NULL,
  `unit_of_measure` VARCHAR(20) NOT NULL DEFAULT 'pairs',
  PRIMARY KEY (`product_id`),
  UNIQUE KEY `uq_products_item` (`item_id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `bill_of_materials` (
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

CREATE TABLE IF NOT EXISTS `production_orders` (
  `order_id`   VARCHAR(10) NOT NULL COMMENT 'e.g. PO-1042',
  `product_id` INT NOT NULL,
  `quantity`   INT NOT NULL,
  `shoe_size_cm` DECIMAL(3,1) DEFAULT NULL COMMENT 'shoe size in centimetres, e.g. 26.5',
  `start_date` DATE NOT NULL,
  `priority`   ENUM('normal','urgent') NOT NULL DEFAULT 'normal',
  `status`     ENUM('planning','materials','production','quality_check','completed') NOT NULL DEFAULT 'planning',
  `eta_label`  VARCHAR(30) DEFAULT NULL COMMENT 'e.g. "3 days" — free-text estimate from the New Order form',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `request_id` INT NULL DEFAULT NULL COMMENT 'local copy of the Inventory product request this order was made for',
  PRIMARY KEY (`order_id`),
  KEY `fk_orders_product` (`product_id`),
  CONSTRAINT `fk_orders_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `material_requests` (
  `request_id`           INT NOT NULL AUTO_INCREMENT,
  `order_id`             VARCHAR(10) NOT NULL,
  `material_id`          INT NOT NULL COMMENT 'FK -> items.id (inventory Raw Material)',
  `quantity`             VARCHAR(40) NOT NULL COMMENT 'e.g. "200 pairs"',
  `qty_value`            DECIMAL(12,2) NOT NULL COMMENT 'numeric portion, used for stock math',
  `priority`             ENUM('normal','urgent') NOT NULL DEFAULT 'normal',
  `status`               ENUM('pending','approved','issued','rejected') NOT NULL DEFAULT 'pending',
  `inventory_request_id` INT DEFAULT NULL COMMENT 'FK -> inventory requests.id (mirror request seen by Inventory)',
  `inventory_request_number` VARCHAR(50) NULL DEFAULT NULL COMMENT 'REQ-... number Inventory gave when the request was filed through its API',
  `approved_qty` DECIMAL(12,2) NULL DEFAULT NULL,
  `accepted_qty` DECIMAL(12,2) NULL DEFAULT NULL,
  `requested_at`         DATETIME DEFAULT CURRENT_TIMESTAMP,
  `issued_at`            DATETIME DEFAULT NULL COMMENT 'when Inventory delivered (issued) the material to production',
  PRIMARY KEY (`request_id`),
  KEY `fk_reqs_order` (`order_id`),
  KEY `fk_reqs_material` (`material_id`),
  KEY `fk_reqs_inv_request` (`inventory_request_id`),
  CONSTRAINT `fk_reqs_order` FOREIGN KEY (`order_id`) REFERENCES `production_orders` (`order_id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `checklist_items` (
  `order_id`    VARCHAR(10) NOT NULL,
  `material_id` INT NOT NULL,
  `ready`       TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`order_id`, `material_id`),
  KEY `fk_checklist_material` (`material_id`),
  CONSTRAINT `fk_checklist_order` FOREIGN KEY (`order_id`) REFERENCES `production_orders` (`order_id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `production_monitoring` (
  `monitoring_id`    INT NOT NULL AUTO_INCREMENT,
  `order_id`         VARCHAR(10) NOT NULL,
  `progress_percent` TINYINT NOT NULL DEFAULT 0,
  `updated_at`       DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`monitoring_id`),
  UNIQUE KEY `uq_monitoring_order` (`order_id`),
  CONSTRAINT `fk_monitoring_order` FOREIGN KEY (`order_id`) REFERENCES `production_orders` (`order_id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `production_costing` (
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

CREATE TABLE IF NOT EXISTS `finished_goods` (
  `fg_id`        INT NOT NULL AUTO_INCREMENT,
  `order_id`     VARCHAR(10) NOT NULL,
  `product_id`   INT NOT NULL,
  `item_code`    VARCHAR(50) NOT NULL COMMENT 'items.item_code of the inventory Finished Good',
  `produced_qty` INT NOT NULL,
  `accepted_qty` INT NOT NULL,
  `rejected_qty` INT NOT NULL,
  `status`       ENUM('ready','sent_to_inventory') NOT NULL DEFAULT 'ready',
  `sent_at`      DATETIME DEFAULT NULL,
  `request_qty`  INT NULL DEFAULT NULL,
  `excess_qty`   INT NULL DEFAULT NULL,
  `request_id`   INT NULL DEFAULT NULL,
  PRIMARY KEY (`fg_id`),
  UNIQUE KEY `uq_fg_order` (`order_id`),
  KEY `fk_fg_order` (`order_id`),
  KEY `fk_fg_product` (`product_id`),
  CONSTRAINT `fk_fg_order` FOREIGN KEY (`order_id`) REFERENCES `production_orders` (`order_id`),
  CONSTRAINT `fk_fg_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `quality_checks` (
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

CREATE TABLE IF NOT EXISTS `notifications` (
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

CREATE TABLE IF NOT EXISTS `activity_log` (
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

CREATE TABLE IF NOT EXISTS `production_login_attempts` (
  `id`           INT NOT NULL AUTO_INCREMENT,
  `username`     VARCHAR(100) NOT NULL,
  `ip`           VARCHAR(64)  NOT NULL,
  `attempted_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_login_user` (`username`,`attempted_at`),
  KEY `ix_login_ip` (`ip`,`attempted_at`)
) ENGINE=InnoDB;

INSERT INTO `production_users` (`full_name`,`username`,`email`,`password`,`role`)
SELECT * FROM (
  SELECT 'Production Supervisor' AS full_name,'supervisor' AS username,'supervisor@team3.local' AS email,'$2y$10$KijKjeXORIZhQjVpyLrpPOliZCENkgsDfjd1O98GAPTfAy9IYOarO' AS password,'production_supervisor' AS role UNION ALL
  SELECT 'Production Staff','staff','staff@team3.local','$2y$10$Hyb5t8jBwsNPG4tFLozju.6uvuUQWHhHQK13EOjS3REc0x7x4THRm','production_staff'
) seed WHERE NOT EXISTS (SELECT 1 FROM `production_users`);

SET FOREIGN_KEY_CHECKS = 1;
