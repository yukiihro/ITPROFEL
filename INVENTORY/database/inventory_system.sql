
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


;
;
;
;




CREATE TABLE `app_migrations` (
  `name` varchar(100) NOT NULL,
  `applied_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


INSERT INTO `app_migrations` (`name`, `applied_at`) VALUES
('catalog_v1', '2026-11-14 17:58:16'),
('finished_goods_all_sizes_v2', '2026-11-14 17:58:17'),
('finished_goods_four_items_v1', '2026-11-14 17:58:16'),
('finished_goods_individual_sizes_v1', '2026-11-14 17:58:16'),
('secondary_raw_material_stock_50_v1', '2026-11-14 17:58:17'),
('transfer_completed_to_delivered_v1', '2026-11-14 17:58:16');



CREATE TABLE `categories` (
  `id` int(11) NOT NULL,
  `category_name` varchar(100) NOT NULL,
  `status` enum('Active','Inactive') NOT NULL DEFAULT 'Active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


INSERT INTO `categories` (`id`, `category_name`, `status`) VALUES
(1, 'Footwear', 'Active'),
(2, 'Shoes', 'Active'),
(7, 'Raw Materials', 'Active');



CREATE TABLE `deliveries` (
  `id` int(11) NOT NULL,
  `request_id` int(11) NOT NULL,
  `status` enum('To Ship','Out for Delivery','Partially Delivered','Delivered','Accepted') NOT NULL DEFAULT 'To Ship',
  `expected_days` varchar(30) NOT NULL DEFAULT '2-3 days',
  `expected_date` date DEFAULT NULL,
  `shipped_date` date DEFAULT NULL,
  `out_for_delivery_date` date DEFAULT NULL,
  `delivered_date` date DEFAULT NULL,
  `received_date` date DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `receipt_confirmed_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


INSERT INTO `deliveries` (`id`, `request_id`, `status`, `expected_days`, `expected_date`, `shipped_date`, `out_for_delivery_date`, `delivered_date`, `received_date`, `remarks`, `updated_at`, `receipt_confirmed_at`) VALUES
(1, 1, 'Delivered', '5-7 days', NULL, '2026-11-15', '2026-11-15', '2026-11-15', '2026-11-15', NULL, '2026-11-14 18:07:05', '2026-11-15 02:07:05'),
(3, 2, 'Delivered', '2-3 days', '2026-11-15', '2026-11-15', '2026-11-15', '2026-11-15', '2026-11-15', NULL, '2026-11-14 18:04:25', NULL),
(4, 3, 'Delivered', '2-3 days', '2026-11-15', '2026-11-15', '2026-11-15', '2026-11-15', '2026-11-15', NULL, '2026-11-14 18:04:31', NULL),
(5, 4, 'Delivered', '2-3 days', '2026-11-15', '2026-11-15', '2026-11-15', '2026-11-15', '2026-11-15', NULL, '2026-11-14 18:04:27', NULL),
(6, 5, 'Delivered', '2-3 days', '2026-11-15', '2026-11-15', '2026-11-15', '2026-11-15', '2026-11-15', NULL, '2026-11-14 18:04:33', NULL),
(7, 6, 'Delivered', '2-3 days', '2026-11-15', '2026-11-15', '2026-11-15', '2026-11-15', '2026-11-15', NULL, '2026-11-14 18:04:35', NULL);



CREATE TABLE `delivery_receipts` (
  `id` int(11) NOT NULL,
  `dr_number` varchar(50) NOT NULL,
  `delivery_id` int(11) NOT NULL,
  `request_id` int(11) NOT NULL,
  `receipt_date` date NOT NULL,
  `received_by` varchar(150) NOT NULL DEFAULT '',
  `received_date` date DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


INSERT INTO `delivery_receipts` (`id`, `dr_number`, `delivery_id`, `request_id`, `receipt_date`, `received_by`, `received_date`, `remarks`, `created_at`) VALUES
(1, 'DR-20261114190425-3', 3, 2, '2026-11-15', 'Production Team', '2026-11-15', NULL, '2026-11-14 18:04:25'),
(2, 'DR-20261114190427-5', 5, 4, '2026-11-15', 'Production Team', '2026-11-15', NULL, '2026-11-14 18:04:27'),
(3, 'DR-20261114190431-4', 4, 3, '2026-11-15', 'Production Team', '2026-11-15', NULL, '2026-11-14 18:04:31'),
(4, 'DR-20261114190433-6', 6, 5, '2026-11-15', 'Production Team', '2026-11-15', NULL, '2026-11-14 18:04:33'),
(5, 'DR-20261114190435-7', 7, 6, '2026-11-15', 'Production Team', '2026-11-15', NULL, '2026-11-14 18:04:35'),
(6, 'DR-20261114190705-1', 1, 1, '2026-11-15', 'Suficiencia Andrew C', '2026-11-15', NULL, '2026-11-14 18:07:05');



CREATE TABLE `finished_goods` (
  `fg_id` int(11) NOT NULL,
  `item_code` varchar(50) NOT NULL,
  `item_name` varchar(150) NOT NULL,
  `brand` varchar(100) DEFAULT '',
  `size` varchar(30) DEFAULT '',
  `category_id` int(11) NOT NULL,
  `unit` varchar(30) NOT NULL,
  `description` text DEFAULT NULL,
  `reorder_level` int(11) NOT NULL DEFAULT 0,
  `status` enum('Active','Inactive') NOT NULL DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `quantity` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


INSERT INTO `finished_goods` (`fg_id`, `item_code`, `item_name`, `brand`, `size`, `category_id`, `unit`, `description`, `reorder_level`, `status`, `created_at`, `quantity`) VALUES
(17, 'FG-001', 'Quick Step Classic Low', 'Quick Step', '26', 1, 'pairs', 'Quick Step footwear product', 10, 'Active', '2026-11-14 17:58:16', 100),
(18, 'FG-002', 'Quick Step Street Runner', 'Quick Step', '26', 1, 'pairs', 'Quick Step footwear product', 10, 'Active', '2026-11-14 17:58:16', 100),
(19, 'FG-003', 'Quick Step Court Flex', 'Quick Step', '26', 1, 'pairs', 'Quick Step footwear product', 10, 'Active', '2026-11-14 17:58:16', 100),
(20, 'FG-004', 'Quick Step Urban Walk', 'Quick Step', '26', 1, 'pairs', 'Quick Step footwear product', 10, 'Active', '2026-11-14 17:58:16', 100),
(21, 'FG-001-S27', 'Quick Step Classic Low', 'Quick Step', '27', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(22, 'FG-001-S28', 'Quick Step Classic Low', 'Quick Step', '28', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(23, 'FG-001-S29', 'Quick Step Classic Low', 'Quick Step', '29', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(24, 'FG-001-S30', 'Quick Step Classic Low', 'Quick Step', '30', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(25, 'FG-001-S31', 'Quick Step Classic Low', 'Quick Step', '31', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(26, 'FG-001-S32', 'Quick Step Classic Low', 'Quick Step', '32', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(27, 'FG-001-S33', 'Quick Step Classic Low', 'Quick Step', '33', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(28, 'FG-001-S34', 'Quick Step Classic Low', 'Quick Step', '34', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(29, 'FG-001-S35', 'Quick Step Classic Low', 'Quick Step', '35', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(30, 'FG-001-S36', 'Quick Step Classic Low', 'Quick Step', '36', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(31, 'FG-001-S37', 'Quick Step Classic Low', 'Quick Step', '37', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(32, 'FG-001-S38', 'Quick Step Classic Low', 'Quick Step', '38', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(33, 'FG-001-S39', 'Quick Step Classic Low', 'Quick Step', '39', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(34, 'FG-001-S40', 'Quick Step Classic Low', 'Quick Step', '40', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(35, 'FG-001-S41', 'Quick Step Classic Low', 'Quick Step', '41', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(36, 'FG-001-S42', 'Quick Step Classic Low', 'Quick Step', '42', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(37, 'FG-001-S43', 'Quick Step Classic Low', 'Quick Step', '43', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(38, 'FG-001-S44', 'Quick Step Classic Low', 'Quick Step', '44', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(39, 'FG-001-S45', 'Quick Step Classic Low', 'Quick Step', '45', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(40, 'FG-002-S27', 'Quick Step Street Runner', 'Quick Step', '27', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(41, 'FG-002-S28', 'Quick Step Street Runner', 'Quick Step', '28', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(42, 'FG-002-S29', 'Quick Step Street Runner', 'Quick Step', '29', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 105),
(43, 'FG-002-S30', 'Quick Step Street Runner', 'Quick Step', '30', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(44, 'FG-002-S31', 'Quick Step Street Runner', 'Quick Step', '31', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(45, 'FG-002-S32', 'Quick Step Street Runner', 'Quick Step', '32', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(46, 'FG-002-S33', 'Quick Step Street Runner', 'Quick Step', '33', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(47, 'FG-002-S34', 'Quick Step Street Runner', 'Quick Step', '34', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(48, 'FG-002-S35', 'Quick Step Street Runner', 'Quick Step', '35', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(49, 'FG-002-S36', 'Quick Step Street Runner', 'Quick Step', '36', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(50, 'FG-002-S37', 'Quick Step Street Runner', 'Quick Step', '37', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(51, 'FG-002-S38', 'Quick Step Street Runner', 'Quick Step', '38', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(52, 'FG-002-S39', 'Quick Step Street Runner', 'Quick Step', '39', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(53, 'FG-002-S40', 'Quick Step Street Runner', 'Quick Step', '40', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(54, 'FG-002-S41', 'Quick Step Street Runner', 'Quick Step', '41', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(55, 'FG-002-S42', 'Quick Step Street Runner', 'Quick Step', '42', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(56, 'FG-002-S43', 'Quick Step Street Runner', 'Quick Step', '43', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(57, 'FG-002-S44', 'Quick Step Street Runner', 'Quick Step', '44', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(58, 'FG-002-S45', 'Quick Step Street Runner', 'Quick Step', '45', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(59, 'FG-003-S27', 'Quick Step Court Flex', 'Quick Step', '27', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(60, 'FG-003-S28', 'Quick Step Court Flex', 'Quick Step', '28', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(61, 'FG-003-S29', 'Quick Step Court Flex', 'Quick Step', '29', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(62, 'FG-003-S30', 'Quick Step Court Flex', 'Quick Step', '30', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(63, 'FG-003-S31', 'Quick Step Court Flex', 'Quick Step', '31', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(64, 'FG-003-S32', 'Quick Step Court Flex', 'Quick Step', '32', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(65, 'FG-003-S33', 'Quick Step Court Flex', 'Quick Step', '33', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(66, 'FG-003-S34', 'Quick Step Court Flex', 'Quick Step', '34', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(67, 'FG-003-S35', 'Quick Step Court Flex', 'Quick Step', '35', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(68, 'FG-003-S36', 'Quick Step Court Flex', 'Quick Step', '36', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(69, 'FG-003-S37', 'Quick Step Court Flex', 'Quick Step', '37', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(70, 'FG-003-S38', 'Quick Step Court Flex', 'Quick Step', '38', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(71, 'FG-003-S39', 'Quick Step Court Flex', 'Quick Step', '39', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(72, 'FG-003-S40', 'Quick Step Court Flex', 'Quick Step', '40', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(73, 'FG-003-S41', 'Quick Step Court Flex', 'Quick Step', '41', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(74, 'FG-003-S42', 'Quick Step Court Flex', 'Quick Step', '42', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(75, 'FG-003-S43', 'Quick Step Court Flex', 'Quick Step', '43', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(76, 'FG-003-S44', 'Quick Step Court Flex', 'Quick Step', '44', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(77, 'FG-003-S45', 'Quick Step Court Flex', 'Quick Step', '45', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(78, 'FG-004-S27', 'Quick Step Urban Walk', 'Quick Step', '27', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(79, 'FG-004-S28', 'Quick Step Urban Walk', 'Quick Step', '28', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(80, 'FG-004-S29', 'Quick Step Urban Walk', 'Quick Step', '29', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(81, 'FG-004-S30', 'Quick Step Urban Walk', 'Quick Step', '30', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(82, 'FG-004-S31', 'Quick Step Urban Walk', 'Quick Step', '31', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(83, 'FG-004-S32', 'Quick Step Urban Walk', 'Quick Step', '32', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(84, 'FG-004-S33', 'Quick Step Urban Walk', 'Quick Step', '33', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(85, 'FG-004-S34', 'Quick Step Urban Walk', 'Quick Step', '34', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(86, 'FG-004-S35', 'Quick Step Urban Walk', 'Quick Step', '35', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(87, 'FG-004-S36', 'Quick Step Urban Walk', 'Quick Step', '36', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(88, 'FG-004-S37', 'Quick Step Urban Walk', 'Quick Step', '37', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(89, 'FG-004-S38', 'Quick Step Urban Walk', 'Quick Step', '38', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(90, 'FG-004-S39', 'Quick Step Urban Walk', 'Quick Step', '39', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(91, 'FG-004-S40', 'Quick Step Urban Walk', 'Quick Step', '40', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(92, 'FG-004-S41', 'Quick Step Urban Walk', 'Quick Step', '41', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(93, 'FG-004-S42', 'Quick Step Urban Walk', 'Quick Step', '42', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(94, 'FG-004-S43', 'Quick Step Urban Walk', 'Quick Step', '43', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(95, 'FG-004-S44', 'Quick Step Urban Walk', 'Quick Step', '44', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100),
(96, 'FG-004-S45', 'Quick Step Urban Walk', 'Quick Step', '45', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16', 100);



CREATE TABLE `inventory` (
  `id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `warehouse_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


INSERT INTO `inventory` (`id`, `item_id`, `warehouse_id`, `quantity`) VALUES
(1, 1, 1, 45),
(2, 1, 2, 50),
(3, 2, 1, 50),
(4, 2, 2, 50),
(5, 3, 1, 50),
(6, 3, 2, 50),
(7, 4, 1, 50),
(8, 4, 2, 50),
(9, 5, 1, 50),
(10, 5, 2, 50),
(11, 6, 1, 50),
(12, 6, 2, 50),
(13, 7, 1, 45),
(14, 7, 2, 50),
(15, 8, 1, 45),
(16, 8, 2, 50),
(17, 9, 1, 50),
(18, 9, 2, 50),
(19, 10, 1, 50),
(20, 10, 2, 50),
(21, 11, 1, 50),
(22, 11, 2, 50),
(23, 12, 1, 45),
(24, 12, 2, 50),
(25, 13, 1, 50),
(26, 13, 2, 50),
(27, 14, 1, 50),
(28, 14, 2, 50),
(29, 15, 1, 50),
(30, 15, 2, 50),
(31, 16, 1, 45),
(32, 16, 2, 50),
(33, 17, 1, 50),
(34, 17, 2, 50),
(35, 18, 1, 50),
(36, 18, 2, 50),
(37, 19, 1, 50),
(38, 19, 2, 50),
(39, 20, 1, 50),
(40, 20, 2, 50),
(43, 21, 1, 50),
(44, 21, 2, 50),
(45, 22, 1, 50),
(46, 22, 2, 50),
(47, 23, 1, 50),
(48, 23, 2, 50),
(49, 24, 1, 50),
(50, 24, 2, 50),
(51, 25, 1, 50),
(52, 25, 2, 50),
(53, 26, 1, 50),
(54, 26, 2, 50),
(55, 27, 1, 50),
(56, 27, 2, 50),
(57, 28, 1, 50),
(58, 28, 2, 50),
(59, 29, 1, 50),
(60, 29, 2, 50),
(61, 30, 1, 50),
(62, 30, 2, 50),
(63, 31, 1, 50),
(64, 31, 2, 50),
(65, 32, 1, 50),
(66, 32, 2, 50),
(67, 33, 1, 50),
(68, 33, 2, 50),
(69, 34, 1, 50),
(70, 34, 2, 50),
(71, 35, 1, 50),
(72, 35, 2, 50),
(73, 36, 1, 50),
(74, 36, 2, 50),
(75, 37, 1, 50),
(76, 37, 2, 50),
(77, 38, 1, 50),
(78, 38, 2, 50),
(79, 39, 1, 50),
(80, 39, 2, 50),
(83, 40, 1, 50),
(84, 40, 2, 50),
(85, 41, 1, 50),
(86, 41, 2, 50),
(87, 42, 1, 55),
(88, 42, 2, 50),
(89, 43, 1, 50),
(90, 43, 2, 50),
(91, 44, 1, 50),
(92, 44, 2, 50),
(93, 45, 1, 50),
(94, 45, 2, 50),
(95, 46, 1, 50),
(96, 46, 2, 50),
(97, 47, 1, 50),
(98, 47, 2, 50),
(99, 48, 1, 50),
(100, 48, 2, 50),
(101, 49, 1, 50),
(102, 49, 2, 50),
(103, 50, 1, 50),
(104, 50, 2, 50),
(105, 51, 1, 50),
(106, 51, 2, 50),
(107, 52, 1, 50),
(108, 52, 2, 50),
(109, 53, 1, 50),
(110, 53, 2, 50),
(111, 54, 1, 50),
(112, 54, 2, 50),
(113, 55, 1, 50),
(114, 55, 2, 50),
(115, 56, 1, 50),
(116, 56, 2, 50),
(117, 57, 1, 50),
(118, 57, 2, 50),
(119, 58, 1, 50),
(120, 58, 2, 50),
(123, 59, 1, 50),
(124, 59, 2, 50),
(125, 60, 1, 50),
(126, 60, 2, 50),
(127, 61, 1, 50),
(128, 61, 2, 50),
(129, 62, 1, 50),
(130, 62, 2, 50),
(131, 63, 1, 50),
(132, 63, 2, 50),
(133, 64, 1, 50),
(134, 64, 2, 50),
(135, 65, 1, 50),
(136, 65, 2, 50),
(137, 66, 1, 50),
(138, 66, 2, 50),
(139, 67, 1, 50),
(140, 67, 2, 50),
(141, 68, 1, 50),
(142, 68, 2, 50),
(143, 69, 1, 50),
(144, 69, 2, 50),
(145, 70, 1, 50),
(146, 70, 2, 50),
(147, 71, 1, 50),
(148, 71, 2, 50),
(149, 72, 1, 50),
(150, 72, 2, 50),
(151, 73, 1, 50),
(152, 73, 2, 50),
(153, 74, 1, 50),
(154, 74, 2, 50),
(155, 75, 1, 50),
(156, 75, 2, 50),
(157, 76, 1, 50),
(158, 76, 2, 50),
(159, 77, 1, 50),
(160, 77, 2, 50),
(163, 78, 1, 50),
(164, 78, 2, 50),
(165, 79, 1, 50),
(166, 79, 2, 50),
(167, 80, 1, 50),
(168, 80, 2, 50),
(169, 81, 1, 50),
(170, 81, 2, 50),
(171, 82, 1, 50),
(172, 82, 2, 50),
(173, 83, 1, 50),
(174, 83, 2, 50),
(175, 84, 1, 50),
(176, 84, 2, 50),
(177, 85, 1, 50),
(178, 85, 2, 50),
(179, 86, 1, 50),
(180, 86, 2, 50),
(181, 87, 1, 50),
(182, 87, 2, 50),
(183, 88, 1, 50),
(184, 88, 2, 50),
(185, 89, 1, 50),
(186, 89, 2, 50),
(187, 90, 1, 50),
(188, 90, 2, 50),
(189, 91, 1, 50),
(190, 91, 2, 50),
(191, 92, 1, 50),
(192, 92, 2, 50),
(193, 93, 1, 50),
(194, 93, 2, 50),
(195, 94, 1, 50),
(196, 94, 2, 50),
(197, 95, 1, 50),
(198, 95, 2, 50),
(199, 96, 1, 50),
(200, 96, 2, 50);

DELIMITER $$
CREATE TRIGGER `trg_inventory_ad` AFTER DELETE ON `inventory` FOR EACH ROW BEGIN
  UPDATE finished_goods SET quantity=(SELECT COALESCE(SUM(inv.quantity),0) FROM inventory inv WHERE inv.item_id=OLD.item_id) WHERE fg_id=OLD.item_id;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_inventory_ai` AFTER INSERT ON `inventory` FOR EACH ROW BEGIN
  UPDATE finished_goods SET quantity=(SELECT COALESCE(SUM(inv.quantity),0) FROM inventory inv WHERE inv.item_id=NEW.item_id) WHERE fg_id=NEW.item_id;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_inventory_au` AFTER UPDATE ON `inventory` FOR EACH ROW BEGIN
  UPDATE finished_goods SET quantity=(SELECT COALESCE(SUM(inv.quantity),0) FROM inventory inv WHERE inv.item_id=OLD.item_id) WHERE fg_id=OLD.item_id;
  IF NEW.item_id<>OLD.item_id THEN
    UPDATE finished_goods SET quantity=(SELECT COALESCE(SUM(inv.quantity),0) FROM inventory inv WHERE inv.item_id=NEW.item_id) WHERE fg_id=NEW.item_id;
  END IF;
END
$$
DELIMITER ;



CREATE TABLE `items` (
  `id` int(11) NOT NULL,
  `item_code` varchar(50) NOT NULL,
  `item_name` varchar(150) NOT NULL,
  `brand` varchar(100) DEFAULT '',
  `supplier_name` varchar(150) DEFAULT '',
  `size` varchar(30) DEFAULT '',
  `item_type` enum('Raw Material','Finished Good') NOT NULL,
  `category_id` int(11) NOT NULL,
  `unit` varchar(30) NOT NULL,
  `description` text DEFAULT NULL,
  `reorder_level` int(11) NOT NULL DEFAULT 0,
  `status` enum('Active','Inactive') NOT NULL DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


INSERT INTO `items` (`id`, `item_code`, `item_name`, `brand`, `supplier_name`, `size`, `item_type`, `category_id`, `unit`, `description`, `reorder_level`, `status`, `created_at`) VALUES
(1, 'RM-001', 'Full-Grain Leather', '', 'Marikina Hide & Leather Co.', '', 'Raw Material', 7, 'square feet', 'Shoe manufacturing raw material', 10, 'Active', '2026-11-14 17:58:16'),
(2, 'RM-002', 'Black Leather', '', 'Marikina Hide & Leather Co.', '', 'Raw Material', 7, 'square feet', 'Shoe manufacturing raw material', 10, 'Active', '2026-11-14 17:58:16'),
(3, 'RM-003', 'Nubuck Leather', '', '2Cordillera Leather Works', '', 'Raw Material', 7, 'square feet', 'Shoe manufacturing raw material', 10, 'Active', '2026-11-14 17:58:16'),
(4, 'RM-004', 'Mesh Fabric', '', 'SynthHide Textile Corp.', '', 'Raw Material', 7, 'meters', 'Shoe manufacturing raw material', 10, 'Active', '2026-11-14 17:58:16'),
(5, 'RM-005', 'Canvas Fabric', '', 'SynthHide Textile Corp.', '', 'Raw Material', 7, 'meters', 'Shoe manufacturing raw material', 10, 'Active', '2026-11-14 17:58:16'),
(6, 'RM-006', 'PU Leather', '', 'SynthHide Textile Corp.', '', 'Raw Material', 7, 'meters', 'Shoe manufacturing raw material', 10, 'Active', '2026-11-14 17:58:16'),
(7, 'RM-007', 'Rubber Sole', '', 'SoleTech Rubber Manufacturing', '', 'Raw Material', 7, 'pairs', 'Shoe manufacturing raw material', 10, 'Active', '2026-11-14 17:58:16'),
(8, 'RM-008', 'EVA Foam Sheets', '', 'SoleTech Rubber Manufacturing', '', 'Raw Material', 7, 'pairs', 'Shoe manufacturing raw material', 10, 'Active', '2026-11-14 17:58:16'),
(9, 'RM-009', 'Foam Insole', '', 'SoleTech Rubber Manufacturing', '', 'Raw Material', 7, 'pairs', 'Shoe manufacturing raw material', 10, 'Active', '2026-11-14 17:58:16'),
(10, 'RM-010', 'Metal Eyelets', '', 'MetalCraft Shoe Hardware', '', 'Raw Material', 7, 'gross', 'Shoe manufacturing raw material', 10, 'Active', '2026-11-14 17:58:16'),
(11, 'RM-011', 'Metal Buckles', '', 'MetalCraft Shoe Hardware', '', 'Raw Material', 7, 'pieces', 'Shoe manufacturing raw material', 10, 'Active', '2026-11-14 17:58:16'),
(12, 'RM-012', 'Shoelaces', '', 'MetalCraft Shoe Hardware', '', 'Raw Material', 7, 'pieces', 'Shoe manufacturing raw material', 10, 'Active', '2026-11-14 17:58:16'),
(13, 'RM-013', 'Shoe Boxes', '', 'EcoBox Packaging Solutions', '', 'Raw Material', 7, 'pieces', 'Shoe manufacturing raw material', 10, 'Active', '2026-11-14 17:58:16'),
(14, 'RM-014', 'Tissue Paper Rolls', '', 'EcoBox Packaging Solutions', '', 'Raw Material', 7, 'pieces', 'Shoe manufacturing raw material', 10, 'Active', '2026-11-14 17:58:16'),
(15, 'RM-015', 'Packaging Tape', '', 'EcoBox Packaging Solutions', '', 'Raw Material', 7, 'rolls', 'Shoe manufacturing raw material', 10, 'Active', '2026-11-14 17:58:16'),
(16, 'RM-016', 'Shoe Adhesive', '', 'SynthHide Textile Corp.', '', 'Raw Material', 7, 'liters', 'Shoe manufacturing raw material', 10, 'Active', '2026-11-14 17:58:16'),
(17, 'FG-001', 'Quick Step Classic Low', 'Quick Step', '', '26', 'Finished Good', 1, 'pairs', 'Quick Step footwear product', 10, 'Active', '2026-11-14 17:58:16'),
(18, 'FG-002', 'Quick Step Street Runner', 'Quick Step', '', '26', 'Finished Good', 1, 'pairs', 'Quick Step footwear product', 10, 'Active', '2026-11-14 17:58:16'),
(19, 'FG-003', 'Quick Step Court Flex', 'Quick Step', '', '26', 'Finished Good', 1, 'pairs', 'Quick Step footwear product', 10, 'Active', '2026-11-14 17:58:16'),
(20, 'FG-004', 'Quick Step Urban Walk', 'Quick Step', '', '26', 'Finished Good', 1, 'pairs', 'Quick Step footwear product', 10, 'Active', '2026-11-14 17:58:16'),
(21, 'FG-001-S27', 'Quick Step Classic Low', 'Quick Step', '', '27', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(22, 'FG-001-S28', 'Quick Step Classic Low', 'Quick Step', '', '28', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(23, 'FG-001-S29', 'Quick Step Classic Low', 'Quick Step', '', '29', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(24, 'FG-001-S30', 'Quick Step Classic Low', 'Quick Step', '', '30', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(25, 'FG-001-S31', 'Quick Step Classic Low', 'Quick Step', '', '31', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(26, 'FG-001-S32', 'Quick Step Classic Low', 'Quick Step', '', '32', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(27, 'FG-001-S33', 'Quick Step Classic Low', 'Quick Step', '', '33', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(28, 'FG-001-S34', 'Quick Step Classic Low', 'Quick Step', '', '34', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(29, 'FG-001-S35', 'Quick Step Classic Low', 'Quick Step', '', '35', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(30, 'FG-001-S36', 'Quick Step Classic Low', 'Quick Step', '', '36', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(31, 'FG-001-S37', 'Quick Step Classic Low', 'Quick Step', '', '37', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(32, 'FG-001-S38', 'Quick Step Classic Low', 'Quick Step', '', '38', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(33, 'FG-001-S39', 'Quick Step Classic Low', 'Quick Step', '', '39', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(34, 'FG-001-S40', 'Quick Step Classic Low', 'Quick Step', '', '40', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(35, 'FG-001-S41', 'Quick Step Classic Low', 'Quick Step', '', '41', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(36, 'FG-001-S42', 'Quick Step Classic Low', 'Quick Step', '', '42', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(37, 'FG-001-S43', 'Quick Step Classic Low', 'Quick Step', '', '43', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(38, 'FG-001-S44', 'Quick Step Classic Low', 'Quick Step', '', '44', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(39, 'FG-001-S45', 'Quick Step Classic Low', 'Quick Step', '', '45', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(40, 'FG-002-S27', 'Quick Step Street Runner', 'Quick Step', '', '27', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(41, 'FG-002-S28', 'Quick Step Street Runner', 'Quick Step', '', '28', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(42, 'FG-002-S29', 'Quick Step Street Runner', 'Quick Step', '', '29', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(43, 'FG-002-S30', 'Quick Step Street Runner', 'Quick Step', '', '30', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(44, 'FG-002-S31', 'Quick Step Street Runner', 'Quick Step', '', '31', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(45, 'FG-002-S32', 'Quick Step Street Runner', 'Quick Step', '', '32', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(46, 'FG-002-S33', 'Quick Step Street Runner', 'Quick Step', '', '33', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(47, 'FG-002-S34', 'Quick Step Street Runner', 'Quick Step', '', '34', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(48, 'FG-002-S35', 'Quick Step Street Runner', 'Quick Step', '', '35', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(49, 'FG-002-S36', 'Quick Step Street Runner', 'Quick Step', '', '36', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(50, 'FG-002-S37', 'Quick Step Street Runner', 'Quick Step', '', '37', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(51, 'FG-002-S38', 'Quick Step Street Runner', 'Quick Step', '', '38', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(52, 'FG-002-S39', 'Quick Step Street Runner', 'Quick Step', '', '39', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(53, 'FG-002-S40', 'Quick Step Street Runner', 'Quick Step', '', '40', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(54, 'FG-002-S41', 'Quick Step Street Runner', 'Quick Step', '', '41', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(55, 'FG-002-S42', 'Quick Step Street Runner', 'Quick Step', '', '42', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(56, 'FG-002-S43', 'Quick Step Street Runner', 'Quick Step', '', '43', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(57, 'FG-002-S44', 'Quick Step Street Runner', 'Quick Step', '', '44', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(58, 'FG-002-S45', 'Quick Step Street Runner', 'Quick Step', '', '45', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(59, 'FG-003-S27', 'Quick Step Court Flex', 'Quick Step', '', '27', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(60, 'FG-003-S28', 'Quick Step Court Flex', 'Quick Step', '', '28', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(61, 'FG-003-S29', 'Quick Step Court Flex', 'Quick Step', '', '29', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(62, 'FG-003-S30', 'Quick Step Court Flex', 'Quick Step', '', '30', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(63, 'FG-003-S31', 'Quick Step Court Flex', 'Quick Step', '', '31', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(64, 'FG-003-S32', 'Quick Step Court Flex', 'Quick Step', '', '32', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(65, 'FG-003-S33', 'Quick Step Court Flex', 'Quick Step', '', '33', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(66, 'FG-003-S34', 'Quick Step Court Flex', 'Quick Step', '', '34', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(67, 'FG-003-S35', 'Quick Step Court Flex', 'Quick Step', '', '35', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(68, 'FG-003-S36', 'Quick Step Court Flex', 'Quick Step', '', '36', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(69, 'FG-003-S37', 'Quick Step Court Flex', 'Quick Step', '', '37', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(70, 'FG-003-S38', 'Quick Step Court Flex', 'Quick Step', '', '38', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(71, 'FG-003-S39', 'Quick Step Court Flex', 'Quick Step', '', '39', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(72, 'FG-003-S40', 'Quick Step Court Flex', 'Quick Step', '', '40', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(73, 'FG-003-S41', 'Quick Step Court Flex', 'Quick Step', '', '41', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(74, 'FG-003-S42', 'Quick Step Court Flex', 'Quick Step', '', '42', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(75, 'FG-003-S43', 'Quick Step Court Flex', 'Quick Step', '', '43', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(76, 'FG-003-S44', 'Quick Step Court Flex', 'Quick Step', '', '44', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(77, 'FG-003-S45', 'Quick Step Court Flex', 'Quick Step', '', '45', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(78, 'FG-004-S27', 'Quick Step Urban Walk', 'Quick Step', '', '27', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(79, 'FG-004-S28', 'Quick Step Urban Walk', 'Quick Step', '', '28', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(80, 'FG-004-S29', 'Quick Step Urban Walk', 'Quick Step', '', '29', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(81, 'FG-004-S30', 'Quick Step Urban Walk', 'Quick Step', '', '30', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(82, 'FG-004-S31', 'Quick Step Urban Walk', 'Quick Step', '', '31', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(83, 'FG-004-S32', 'Quick Step Urban Walk', 'Quick Step', '', '32', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(84, 'FG-004-S33', 'Quick Step Urban Walk', 'Quick Step', '', '33', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(85, 'FG-004-S34', 'Quick Step Urban Walk', 'Quick Step', '', '34', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(86, 'FG-004-S35', 'Quick Step Urban Walk', 'Quick Step', '', '35', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(87, 'FG-004-S36', 'Quick Step Urban Walk', 'Quick Step', '', '36', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(88, 'FG-004-S37', 'Quick Step Urban Walk', 'Quick Step', '', '37', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(89, 'FG-004-S38', 'Quick Step Urban Walk', 'Quick Step', '', '38', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(90, 'FG-004-S39', 'Quick Step Urban Walk', 'Quick Step', '', '39', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(91, 'FG-004-S40', 'Quick Step Urban Walk', 'Quick Step', '', '40', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(92, 'FG-004-S41', 'Quick Step Urban Walk', 'Quick Step', '', '41', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(93, 'FG-004-S42', 'Quick Step Urban Walk', 'Quick Step', '', '42', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(94, 'FG-004-S43', 'Quick Step Urban Walk', 'Quick Step', '', '43', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(95, 'FG-004-S44', 'Quick Step Urban Walk', 'Quick Step', '', '44', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16'),
(96, 'FG-004-S45', 'Quick Step Urban Walk', 'Quick Step', '', '45', 'Finished Good', 1, 'pairs', 'Quick Step footwear demo inventory record', 10, 'Active', '2026-11-14 17:58:16');

DELIMITER $$
CREATE TRIGGER `trg_items_ai` AFTER INSERT ON `items` FOR EACH ROW BEGIN
  IF NEW.item_type='Raw Material' THEN
    INSERT IGNORE INTO raw_materials(id,item_code,item_name,brand,supplier_name,category_id,unit,description,reorder_level,status,created_at)
    VALUES(NEW.id,NEW.item_code,NEW.item_name,NEW.brand,NEW.supplier_name,NEW.category_id,NEW.unit,NEW.description,NEW.reorder_level,NEW.status,NEW.created_at);
  ELSE
    INSERT IGNORE INTO finished_goods(fg_id,item_code,item_name,brand,size,category_id,unit,description,reorder_level,status,created_at,quantity)
    VALUES(NEW.id,NEW.item_code,NEW.item_name,NEW.brand,NEW.size,NEW.category_id,NEW.unit,NEW.description,NEW.reorder_level,NEW.status,NEW.created_at,0);
  END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_items_au` AFTER UPDATE ON `items` FOR EACH ROW BEGIN
  DELETE FROM raw_materials WHERE id=OLD.id;
  DELETE FROM finished_goods WHERE fg_id=OLD.id;
  IF NEW.item_type='Raw Material' THEN
    INSERT IGNORE INTO raw_materials(id,item_code,item_name,brand,supplier_name,category_id,unit,description,reorder_level,status,created_at)
    VALUES(NEW.id,NEW.item_code,NEW.item_name,NEW.brand,NEW.supplier_name,NEW.category_id,NEW.unit,NEW.description,NEW.reorder_level,NEW.status,NEW.created_at);
  ELSE
    INSERT IGNORE INTO finished_goods(fg_id,item_code,item_name,brand,size,category_id,unit,description,reorder_level,status,created_at,quantity)
    VALUES(NEW.id,NEW.item_code,NEW.item_name,NEW.brand,NEW.size,NEW.category_id,NEW.unit,NEW.description,NEW.reorder_level,NEW.status,NEW.created_at,COALESCE((SELECT SUM(quantity) FROM inventory WHERE item_id=NEW.id),0));
  END IF;
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `trg_items_bd` BEFORE DELETE ON `items` FOR EACH ROW BEGIN
  DELETE FROM raw_materials WHERE id=OLD.id;
  DELETE FROM finished_goods WHERE fg_id=OLD.id;
END
$$
DELIMITER ;



CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `title` varchar(150) NOT NULL,
  `message` varchar(500) NOT NULL,
  `type` varchar(50) NOT NULL DEFAULT 'transaction',
  `actor_user_id` int(11) DEFAULT NULL,
  `recipient_user_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


INSERT INTO `notifications` (`id`, `title`, `message`, `type`, `actor_user_id`, `recipient_user_id`, `created_at`) VALUES
(1, 'New Request', 'Request REQ-2026111418595560 with 1 item(s) was submitted for Production.', 'request', 3, 1, '2026-11-14 17:59:55'),
(2, 'New Request', 'Request REQ-2026111418595560 with 1 item(s) was submitted for Production.', 'request', 3, 6, '2026-11-14 17:59:55'),
(3, 'Approved', 'Request REQ-2026111418595560 was processed by Production. Approved: 5; rejected: 0. Destination: Production.', 'request', NULL, 3, '2026-11-14 18:00:09'),
(4, 'Approved', 'Request REQ-2026111418595560 was processed by Production. Approved: 5; rejected: 0. Destination: Production.', 'request', NULL, 1, '2026-11-14 18:00:09'),
(5, 'Approved', 'Request REQ-2026111418595560 was processed by Production. Approved: 5; rejected: 0. Destination: Production.', 'request', NULL, 3, '2026-11-14 18:00:09'),
(6, 'Approved', 'Request REQ-2026111418595560 was processed by Production. Approved: 5; rejected: 0. Destination: Production.', 'request', NULL, 6, '2026-11-14 18:00:09'),
(7, 'New Request', 'Request REQ-2026111419032211 was submitted by Production for Production.', 'request', NULL, 1, '2026-11-14 18:03:22'),
(8, 'New Request', 'Request REQ-2026111419032211 was submitted by Production for Production.', 'request', NULL, 3, '2026-11-14 18:03:22'),
(9, 'New Request', 'Request REQ-2026111419032211 was submitted by Production for Production.', 'request', NULL, 6, '2026-11-14 18:03:22'),
(10, 'New Request', 'Request REQ-2026111419032236 was submitted by Production for Production.', 'request', NULL, 1, '2026-11-14 18:03:22'),
(11, 'New Request', 'Request REQ-2026111419032236 was submitted by Production for Production.', 'request', NULL, 3, '2026-11-14 18:03:22'),
(12, 'New Request', 'Request REQ-2026111419032236 was submitted by Production for Production.', 'request', NULL, 6, '2026-11-14 18:03:22'),
(13, 'New Request', 'Request REQ-2026111419032298 was submitted by Production for Production.', 'request', NULL, 1, '2026-11-14 18:03:22'),
(14, 'New Request', 'Request REQ-2026111419032298 was submitted by Production for Production.', 'request', NULL, 3, '2026-11-14 18:03:22'),
(15, 'New Request', 'Request REQ-2026111419032298 was submitted by Production for Production.', 'request', NULL, 6, '2026-11-14 18:03:22'),
(16, 'New Request', 'Request REQ-2026111419032232 was submitted by Production for Production.', 'request', NULL, 1, '2026-11-14 18:03:22'),
(17, 'New Request', 'Request REQ-2026111419032232 was submitted by Production for Production.', 'request', NULL, 3, '2026-11-14 18:03:22'),
(18, 'New Request', 'Request REQ-2026111419032232 was submitted by Production for Production.', 'request', NULL, 6, '2026-11-14 18:03:22'),
(19, 'New Request', 'Request REQ-2026111419032235 was submitted by Production for Production.', 'request', NULL, 1, '2026-11-14 18:03:22'),
(20, 'New Request', 'Request REQ-2026111419032235 was submitted by Production for Production.', 'request', NULL, 3, '2026-11-14 18:03:22'),
(21, 'New Request', 'Request REQ-2026111419032235 was submitted by Production for Production.', 'request', NULL, 6, '2026-11-14 18:03:22'),
(22, 'Approved', 'Request REQ-2026111419032235: 5 approved, 0 remaining balance.', 'request', 3, 1, '2026-11-14 18:03:30'),
(23, 'Approved', 'Request REQ-2026111419032235: 5 approved, 0 remaining balance.', 'request', 3, 6, '2026-11-14 18:03:30'),
(24, 'Approved', 'Request REQ-2026111419032232: 5 approved, 0 remaining balance.', 'request', 3, 1, '2026-11-14 18:03:33'),
(25, 'Approved', 'Request REQ-2026111419032232: 5 approved, 0 remaining balance.', 'request', 3, 6, '2026-11-14 18:03:33'),
(26, 'Approved', 'Request REQ-2026111419032298: 5 approved, 0 remaining balance.', 'request', 3, 1, '2026-11-14 18:03:37'),
(27, 'Approved', 'Request REQ-2026111419032298: 5 approved, 0 remaining balance.', 'request', 3, 6, '2026-11-14 18:03:37'),
(28, 'Approved', 'Request REQ-2026111419032236: 5 approved, 0 remaining balance.', 'request', 3, 1, '2026-11-14 18:03:41'),
(29, 'Approved', 'Request REQ-2026111419032236: 5 approved, 0 remaining balance.', 'request', 3, 6, '2026-11-14 18:03:41'),
(30, 'Approved', 'Request REQ-2026111419032211: 5 approved, 0 remaining balance.', 'request', 3, 1, '2026-11-14 18:03:45'),
(31, 'Approved', 'Request REQ-2026111419032211: 5 approved, 0 remaining balance.', 'request', 3, 6, '2026-11-14 18:03:45'),
(32, 'Delivery Update', 'Delivery REQ-2026111419032211 is Out for Delivery.', 'delivery', 3, 1, '2026-11-14 18:03:52'),
(33, 'Delivery Update', 'Delivery REQ-2026111419032211 is Out for Delivery.', 'delivery', 3, 6, '2026-11-14 18:03:52'),
(34, 'Delivery Update', 'Delivery REQ-2026111419032236 is Out for Delivery.', 'delivery', 3, 1, '2026-11-14 18:03:56'),
(35, 'Delivery Update', 'Delivery REQ-2026111419032236 is Out for Delivery.', 'delivery', 3, 6, '2026-11-14 18:03:56'),
(36, 'Delivery Update', 'Delivery REQ-2026111419032298 is Out for Delivery.', 'delivery', 3, 1, '2026-11-14 18:04:00'),
(37, 'Delivery Update', 'Delivery REQ-2026111419032298 is Out for Delivery.', 'delivery', 3, 6, '2026-11-14 18:04:00'),
(38, 'Delivery Update', 'Delivery REQ-2026111419032232 is Out for Delivery.', 'delivery', 3, 1, '2026-11-14 18:04:04'),
(39, 'Delivery Update', 'Delivery REQ-2026111419032232 is Out for Delivery.', 'delivery', 3, 6, '2026-11-14 18:04:04'),
(40, 'Delivery Update', 'Delivery REQ-2026111419032235 is Out for Delivery.', 'delivery', 3, 1, '2026-11-14 18:04:09'),
(41, 'Delivery Update', 'Delivery REQ-2026111419032235 is Out for Delivery.', 'delivery', 3, 6, '2026-11-14 18:04:09'),
(42, 'Delivery Accepted', 'The Production team accepted request REQ-2026111419032211. Destination: Production.', 'delivery', NULL, 1, '2026-11-14 18:04:25'),
(43, 'Delivery Accepted', 'The Production team accepted request REQ-2026111419032211. Destination: Production.', 'delivery', NULL, 3, '2026-11-14 18:04:25'),
(44, 'Delivery Accepted', 'The Production team accepted request REQ-2026111419032211. Destination: Production.', 'delivery', NULL, 6, '2026-11-14 18:04:25'),
(45, 'Delivery Accepted', 'The Production team accepted request REQ-2026111419032298. Destination: Production.', 'delivery', NULL, 1, '2026-11-14 18:04:27'),
(46, 'Delivery Accepted', 'The Production team accepted request REQ-2026111419032298. Destination: Production.', 'delivery', NULL, 3, '2026-11-14 18:04:27'),
(47, 'Delivery Accepted', 'The Production team accepted request REQ-2026111419032298. Destination: Production.', 'delivery', NULL, 6, '2026-11-14 18:04:27'),
(48, 'Delivery Accepted', 'The Production team accepted request REQ-2026111419032236. Destination: Production.', 'delivery', NULL, 1, '2026-11-14 18:04:31'),
(49, 'Delivery Accepted', 'The Production team accepted request REQ-2026111419032236. Destination: Production.', 'delivery', NULL, 3, '2026-11-14 18:04:31'),
(50, 'Delivery Accepted', 'The Production team accepted request REQ-2026111419032236. Destination: Production.', 'delivery', NULL, 6, '2026-11-14 18:04:31'),
(51, 'Delivery Accepted', 'The Production team accepted request REQ-2026111419032232. Destination: Production.', 'delivery', NULL, 1, '2026-11-14 18:04:33'),
(52, 'Delivery Accepted', 'The Production team accepted request REQ-2026111419032232. Destination: Production.', 'delivery', NULL, 3, '2026-11-14 18:04:33'),
(53, 'Delivery Accepted', 'The Production team accepted request REQ-2026111419032232. Destination: Production.', 'delivery', NULL, 6, '2026-11-14 18:04:33'),
(54, 'Delivery Accepted', 'The Production team accepted request REQ-2026111419032235. Destination: Production.', 'delivery', NULL, 1, '2026-11-14 18:04:35'),
(55, 'Delivery Accepted', 'The Production team accepted request REQ-2026111419032235. Destination: Production.', 'delivery', NULL, 3, '2026-11-14 18:04:35'),
(56, 'Delivery Accepted', 'The Production team accepted request REQ-2026111419032235. Destination: Production.', 'delivery', NULL, 6, '2026-11-14 18:04:35'),
(57, 'Delivery Update', 'The Production team updated delivery REQ-2026111418595560. Current status: Out for Delivery. Destination: Production.', 'delivery', NULL, 3, '2026-11-14 18:07:01'),
(58, 'Delivery Update', 'Delivery REQ-2026111418595560 status: Out for Delivery. Destination: Production.', 'delivery', NULL, 1, '2026-11-14 18:07:01'),
(59, 'Delivery Update', 'Delivery REQ-2026111418595560 status: Out for Delivery. Destination: Production.', 'delivery', NULL, 3, '2026-11-14 18:07:01'),
(60, 'Delivery Update', 'Delivery REQ-2026111418595560 status: Out for Delivery. Destination: Production.', 'delivery', NULL, 6, '2026-11-14 18:07:01'),
(61, 'Delivery Complete', 'Delivery REQ-2026111418595560 is complete.', 'delivery', 3, 1, '2026-11-14 18:07:05'),
(62, 'Delivery Complete', 'Delivery REQ-2026111418595560 is complete.', 'delivery', 3, 6, '2026-11-14 18:07:05');



CREATE TABLE `notification_reads` (
  `notification_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `read_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


INSERT INTO `notification_reads` (`notification_id`, `user_id`, `read_at`) VALUES
(3, 3, '2026-11-14 18:02:09'),
(5, 3, '2026-11-14 18:02:09'),
(8, 3, '2026-11-14 19:26:28'),
(11, 3, '2026-11-14 19:26:28'),
(14, 3, '2026-11-14 19:26:28'),
(17, 3, '2026-11-14 19:26:28'),
(20, 3, '2026-11-14 19:26:28'),
(43, 3, '2026-11-14 19:26:28'),
(46, 3, '2026-11-14 19:26:28'),
(49, 3, '2026-11-14 19:26:28'),
(52, 3, '2026-11-14 19:26:28'),
(55, 3, '2026-11-14 19:26:28'),
(57, 3, '2026-11-14 19:26:28'),
(59, 3, '2026-11-14 19:26:28');



CREATE TABLE `raw_materials` (
  `id` int(11) NOT NULL,
  `item_code` varchar(50) NOT NULL,
  `item_name` varchar(150) NOT NULL,
  `brand` varchar(100) DEFAULT '',
  `supplier_name` varchar(150) DEFAULT '',
  `category_id` int(11) NOT NULL,
  `unit` varchar(30) NOT NULL,
  `description` text DEFAULT NULL,
  `reorder_level` int(11) NOT NULL DEFAULT 0,
  `status` enum('Active','Inactive') NOT NULL DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


INSERT INTO `raw_materials` (`id`, `item_code`, `item_name`, `brand`, `supplier_name`, `category_id`, `unit`, `description`, `reorder_level`, `status`, `created_at`) VALUES
(1, 'RM-001', 'Full-Grain Leather', '', 'Marikina Hide & Leather Co.', 7, 'square feet', 'Shoe manufacturing raw material', 10, 'Active', '2026-11-14 17:58:16'),
(2, 'RM-002', 'Black Leather', '', 'Marikina Hide & Leather Co.', 7, 'square feet', 'Shoe manufacturing raw material', 10, 'Active', '2026-11-14 17:58:16'),
(3, 'RM-003', 'Nubuck Leather', '', '2Cordillera Leather Works', 7, 'square feet', 'Shoe manufacturing raw material', 10, 'Active', '2026-11-14 17:58:16'),
(4, 'RM-004', 'Mesh Fabric', '', 'SynthHide Textile Corp.', 7, 'meters', 'Shoe manufacturing raw material', 10, 'Active', '2026-11-14 17:58:16'),
(5, 'RM-005', 'Canvas Fabric', '', 'SynthHide Textile Corp.', 7, 'meters', 'Shoe manufacturing raw material', 10, 'Active', '2026-11-14 17:58:16'),
(6, 'RM-006', 'PU Leather', '', 'SynthHide Textile Corp.', 7, 'meters', 'Shoe manufacturing raw material', 10, 'Active', '2026-11-14 17:58:16'),
(7, 'RM-007', 'Rubber Sole', '', 'SoleTech Rubber Manufacturing', 7, 'pairs', 'Shoe manufacturing raw material', 10, 'Active', '2026-11-14 17:58:16'),
(8, 'RM-008', 'EVA Foam Sheets', '', 'SoleTech Rubber Manufacturing', 7, 'pairs', 'Shoe manufacturing raw material', 10, 'Active', '2026-11-14 17:58:16'),
(9, 'RM-009', 'Foam Insole', '', 'SoleTech Rubber Manufacturing', 7, 'pairs', 'Shoe manufacturing raw material', 10, 'Active', '2026-11-14 17:58:16'),
(10, 'RM-010', 'Metal Eyelets', '', 'MetalCraft Shoe Hardware', 7, 'gross', 'Shoe manufacturing raw material', 10, 'Active', '2026-11-14 17:58:16'),
(11, 'RM-011', 'Metal Buckles', '', 'MetalCraft Shoe Hardware', 7, 'pieces', 'Shoe manufacturing raw material', 10, 'Active', '2026-11-14 17:58:16'),
(12, 'RM-012', 'Shoelaces', '', 'MetalCraft Shoe Hardware', 7, 'pieces', 'Shoe manufacturing raw material', 10, 'Active', '2026-11-14 17:58:16'),
(13, 'RM-013', 'Shoe Boxes', '', 'EcoBox Packaging Solutions', 7, 'pieces', 'Shoe manufacturing raw material', 10, 'Active', '2026-11-14 17:58:16'),
(14, 'RM-014', 'Tissue Paper Rolls', '', 'EcoBox Packaging Solutions', 7, 'pieces', 'Shoe manufacturing raw material', 10, 'Active', '2026-11-14 17:58:16'),
(15, 'RM-015', 'Packaging Tape', '', 'EcoBox Packaging Solutions', 7, 'rolls', 'Shoe manufacturing raw material', 10, 'Active', '2026-11-14 17:58:16'),
(16, 'RM-016', 'Shoe Adhesive', '', 'SynthHide Textile Corp.', 7, 'liters', 'Shoe manufacturing raw material', 10, 'Active', '2026-11-14 17:58:16');



CREATE TABLE `requests` (
  `id` int(11) NOT NULL,
  `request_number` varchar(50) NOT NULL,
  `requested_by` int(11) DEFAULT NULL,
  `requester_team` varchar(50) DEFAULT NULL,
  `request_date` date NOT NULL,
  `status` enum('Pending','Partially Approved','Approved','Disapproved') NOT NULL DEFAULT 'Pending',
  `remarks` text DEFAULT NULL,
  `recipient_name` varchar(150) NOT NULL DEFAULT '',
  `recipient_gmail` varchar(190) NOT NULL DEFAULT '',
  `destination` enum('Production','Sales','Procurement') DEFAULT NULL,
  `po_number` varchar(100) NOT NULL DEFAULT '',
  `expected_receive_date` date DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


INSERT INTO `requests` (`id`, `request_number`, `requested_by`, `requester_team`, `request_date`, `status`, `remarks`, `recipient_name`, `recipient_gmail`, `destination`, `po_number`, `expected_receive_date`, `approved_by`, `approved_at`, `created_at`) VALUES
(1, 'REQ-2026111418595560', 3, 'Inventory', '2026-11-15', 'Approved', '', 'Andrew', 'andrewsuficiencia09@gmail.com', 'Production', 'PO-1042', NULL, NULL, '2026-11-15 02:00:09', '2026-11-14 17:59:55'),
(2, 'REQ-2026111419032211', NULL, 'Production', '2026-11-15', 'Approved', 'Production PO-1042 — material request | Size: 29 cm (by Production Staff) | Email: team3production@gmail.com', 'TEAM 3', 'team3production@gmail.com', 'Production', 'PO-1042', '2026-11-15', 3, '2026-11-15 02:03:45', '2026-11-14 18:03:22'),
(3, 'REQ-2026111419032236', NULL, 'Production', '2026-11-15', 'Approved', 'Production PO-1042 — material request | Size: 29 cm (by Production Staff) | Email: team3production@gmail.com', 'TEAM 3', 'team3production@gmail.com', 'Production', 'PO-1042', '2026-11-15', 3, '2026-11-15 02:03:41', '2026-11-14 18:03:22'),
(4, 'REQ-2026111419032298', NULL, 'Production', '2026-11-15', 'Approved', 'Production PO-1042 — material request | Size: 29 cm (by Production Staff) | Email: team3production@gmail.com', 'TEAM 3', 'team3production@gmail.com', 'Production', 'PO-1042', '2026-11-15', 3, '2026-11-15 02:03:37', '2026-11-14 18:03:22'),
(5, 'REQ-2026111419032232', NULL, 'Production', '2026-11-15', 'Approved', 'Production PO-1042 — material request | Size: 29 cm (by Production Staff) | Email: team3production@gmail.com', 'TEAM 3', 'team3production@gmail.com', 'Production', 'PO-1042', '2026-11-15', 3, '2026-11-15 02:03:33', '2026-11-14 18:03:22'),
(6, 'REQ-2026111419032235', NULL, 'Production', '2026-11-15', 'Approved', 'Production PO-1042 — material request | Size: 29 cm (by Production Staff) | Email: team3production@gmail.com', 'TEAM 3', 'team3production@gmail.com', 'Production', 'PO-1042', '2026-11-15', 3, '2026-11-15 02:03:30', '2026-11-14 18:03:22');



CREATE TABLE `request_items` (
  `id` int(11) NOT NULL,
  `request_id` int(11) NOT NULL,
  `item_id` int(11) DEFAULT NULL,
  `item_name` varchar(150) NOT NULL,
  `size` varchar(30) DEFAULT '',
  `warehouse_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `approved_quantity` int(11) NOT NULL DEFAULT 0,
  `rejected_quantity` int(11) NOT NULL DEFAULT 0,
  `rejection_reason` varchar(255) DEFAULT '',
  `delivered_quantity` int(11) NOT NULL DEFAULT 0,
  `accepted_quantity` int(11) NOT NULL DEFAULT 0,
  `inspection_accepted_quantity` int(11) NOT NULL DEFAULT 0,
  `inspection_rejected_quantity` int(11) NOT NULL DEFAULT 0,
  `inspection_rejection_reason` varchar(500) DEFAULT '',
  `unit` varchar(30) DEFAULT 'pcs'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


INSERT INTO `request_items` (`id`, `request_id`, `item_id`, `item_name`, `size`, `warehouse_id`, `quantity`, `approved_quantity`, `rejected_quantity`, `rejection_reason`, `delivered_quantity`, `accepted_quantity`, `inspection_accepted_quantity`, `inspection_rejected_quantity`, `inspection_rejection_reason`, `unit`) VALUES
(1, 1, 42, 'Quick Step Street Runner', '29', 1, 5, 5, 0, '', 5, 5, 5, 0, '', 'pairs'),
(2, 2, 8, 'EVA Foam Sheets', '', 1, 5, 5, 0, '', 5, 5, 5, 0, '', 'pairs'),
(3, 3, 1, 'Full-Grain Leather', '', 1, 5, 5, 0, '', 5, 5, 5, 0, '', 'square feet'),
(4, 4, 7, 'Rubber Sole', '', 1, 5, 5, 0, '', 5, 5, 5, 0, '', 'pairs'),
(5, 5, 16, 'Shoe Adhesive', '', 1, 5, 5, 0, '', 5, 5, 5, 0, '', 'liters'),
(6, 6, 12, 'Shoelaces', '', 1, 5, 5, 0, '', 5, 5, 5, 0, '', 'pieces');



CREATE TABLE `sales_returns` (
  `id` int(11) NOT NULL,
  `return_number` varchar(80) NOT NULL,
  `sales_reference` varchar(100) NOT NULL DEFAULT '',
  `customer_name` varchar(180) NOT NULL DEFAULT '',
  `return_date` date NOT NULL,
  `source_team` varchar(30) NOT NULL DEFAULT 'Sales',
  `remarks` text DEFAULT NULL,
  `status` enum('Pending','Pending Inspection','Partially Received','Partially Accepted','Received','Completed','Rejected') NOT NULL DEFAULT 'Pending',
  `submitted_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `inspected_by` int(11) DEFAULT NULL,
  `inspected_at` datetime DEFAULT NULL,
  `received_at` datetime DEFAULT NULL,
  `received_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



CREATE TABLE `sales_return_items` (
  `id` int(11) NOT NULL,
  `sales_return_id` int(11) NOT NULL,
  `return_id` int(11) DEFAULT NULL,
  `item_id` int(11) NOT NULL,
  `item_name` varchar(150) NOT NULL DEFAULT '',
  `size` varchar(30) NOT NULL DEFAULT '',
  `quantity` decimal(12,2) NOT NULL,
  `accepted_quantity` decimal(12,2) NOT NULL DEFAULT 0.00,
  `rejected_quantity` int(11) NOT NULL DEFAULT 0,
  `reason` varchar(255) NOT NULL DEFAULT '',
  `damage_description` varchar(1000) NOT NULL DEFAULT '',
  `photo_path` varchar(255) NOT NULL DEFAULT '',
  `warehouse_id` int(11) DEFAULT NULL,
  `inspection_remarks` varchar(1000) DEFAULT NULL,
  `inspected_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



CREATE TABLE `stock_adjustments` (
  `id` int(11) NOT NULL,
  `adjustment_number` varchar(50) NOT NULL,
  `item_id` int(11) NOT NULL,
  `warehouse_id` int(11) NOT NULL,
  `current_quantity` int(11) NOT NULL DEFAULT 0,
  `adjusted_quantity` int(11) NOT NULL DEFAULT 0,
  `difference` decimal(12,2) NOT NULL DEFAULT 0.00,
  `reason` varchar(150) DEFAULT '',
  `remarks` text DEFAULT NULL,
  `date` date NOT NULL,
  `user_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



CREATE TABLE `stock_in` (
  `id` int(11) NOT NULL,
  `stock_in_number` varchar(50) NOT NULL,
  `item_id` int(11) NOT NULL,
  `warehouse_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `unit` varchar(30) NOT NULL DEFAULT '',
  `supplier` varchar(150) DEFAULT '',
  `reference_number` varchar(100) DEFAULT '',
  `remarks` text DEFAULT NULL,
  `date` date NOT NULL,
  `user_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


INSERT INTO `stock_in` (`id`, `stock_in_number`, `item_id`, `warehouse_id`, `quantity`, `unit`, `supplier`, `reference_number`, `remarks`, `date`, `user_id`) VALUES
(1, 'SIN-1-1-5', 42, 1, 5, 'pairs', '', 'REQ-2026111418595560', 'Received from Production; Request REQ-2026111418595560; P.O. PO-1042; accepted quantity cumulative 5', '2026-11-14', 3);



CREATE TABLE `stock_movements` (
  `id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `warehouse_id` int(11) NOT NULL,
  `movement_type` varchar(40) NOT NULL,
  `quantity` int(11) NOT NULL,
  `unit` varchar(30) DEFAULT NULL,
  `reference_number` varchar(100) DEFAULT '',
  `remarks` text DEFAULT NULL,
  `date` date NOT NULL,
  `user_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


INSERT INTO `stock_movements` (`id`, `item_id`, `warehouse_id`, `movement_type`, `quantity`, `unit`, `reference_number`, `remarks`, `date`, `user_id`) VALUES
(1, 1, 1, 'STOCK IN', 50, NULL, 'OPENING-CATALOG-1', 'Opening stock - catalog setup', '2000-01-01', NULL),
(2, 1, 2, 'STOCK IN', 50, NULL, 'OPENING-CATALOG-SECONDARY-1', 'Opening stock - catalog setup', '2000-01-01', NULL),
(3, 2, 1, 'STOCK IN', 50, NULL, 'OPENING-CATALOG-2', 'Opening stock - catalog setup', '2000-01-01', NULL),
(4, 2, 2, 'STOCK IN', 50, NULL, 'OPENING-CATALOG-SECONDARY-2', 'Opening stock - catalog setup', '2000-01-01', NULL),
(5, 3, 1, 'STOCK IN', 50, NULL, 'OPENING-CATALOG-3', 'Opening stock - catalog setup', '2000-01-01', NULL),
(6, 3, 2, 'STOCK IN', 50, NULL, 'OPENING-CATALOG-SECONDARY-3', 'Opening stock - catalog setup', '2000-01-01', NULL),
(7, 4, 1, 'STOCK IN', 50, NULL, 'OPENING-CATALOG-4', 'Opening stock - catalog setup', '2000-01-01', NULL),
(8, 4, 2, 'STOCK IN', 50, NULL, 'OPENING-CATALOG-SECONDARY-4', 'Opening stock - catalog setup', '2000-01-01', NULL),
(9, 5, 1, 'STOCK IN', 50, NULL, 'OPENING-CATALOG-5', 'Opening stock - catalog setup', '2000-01-01', NULL),
(10, 5, 2, 'STOCK IN', 50, NULL, 'OPENING-CATALOG-SECONDARY-5', 'Opening stock - catalog setup', '2000-01-01', NULL),
(11, 6, 1, 'STOCK IN', 50, NULL, 'OPENING-CATALOG-6', 'Opening stock - catalog setup', '2000-01-01', NULL),
(12, 6, 2, 'STOCK IN', 50, NULL, 'OPENING-CATALOG-SECONDARY-6', 'Opening stock - catalog setup', '2000-01-01', NULL),
(13, 7, 1, 'STOCK IN', 50, NULL, 'OPENING-CATALOG-7', 'Opening stock - catalog setup', '2000-01-01', NULL),
(14, 7, 2, 'STOCK IN', 50, NULL, 'OPENING-CATALOG-SECONDARY-7', 'Opening stock - catalog setup', '2000-01-01', NULL),
(15, 8, 1, 'STOCK IN', 50, NULL, 'OPENING-CATALOG-8', 'Opening stock - catalog setup', '2000-01-01', NULL),
(16, 8, 2, 'STOCK IN', 50, NULL, 'OPENING-CATALOG-SECONDARY-8', 'Opening stock - catalog setup', '2000-01-01', NULL),
(17, 9, 1, 'STOCK IN', 50, NULL, 'OPENING-CATALOG-9', 'Opening stock - catalog setup', '2000-01-01', NULL),
(18, 9, 2, 'STOCK IN', 50, NULL, 'OPENING-CATALOG-SECONDARY-9', 'Opening stock - catalog setup', '2000-01-01', NULL),
(19, 10, 1, 'STOCK IN', 50, NULL, 'OPENING-CATALOG-10', 'Opening stock - catalog setup', '2000-01-01', NULL),
(20, 10, 2, 'STOCK IN', 50, NULL, 'OPENING-CATALOG-SECONDARY-10', 'Opening stock - catalog setup', '2000-01-01', NULL),
(21, 11, 1, 'STOCK IN', 50, NULL, 'OPENING-CATALOG-11', 'Opening stock - catalog setup', '2000-01-01', NULL),
(22, 11, 2, 'STOCK IN', 50, NULL, 'OPENING-CATALOG-SECONDARY-11', 'Opening stock - catalog setup', '2000-01-01', NULL),
(23, 12, 1, 'STOCK IN', 50, NULL, 'OPENING-CATALOG-12', 'Opening stock - catalog setup', '2000-01-01', NULL),
(24, 12, 2, 'STOCK IN', 50, NULL, 'OPENING-CATALOG-SECONDARY-12', 'Opening stock - catalog setup', '2000-01-01', NULL),
(25, 13, 1, 'STOCK IN', 50, NULL, 'OPENING-CATALOG-13', 'Opening stock - catalog setup', '2000-01-01', NULL),
(26, 13, 2, 'STOCK IN', 50, NULL, 'OPENING-CATALOG-SECONDARY-13', 'Opening stock - catalog setup', '2000-01-01', NULL),
(27, 14, 1, 'STOCK IN', 50, NULL, 'OPENING-CATALOG-14', 'Opening stock - catalog setup', '2000-01-01', NULL),
(28, 14, 2, 'STOCK IN', 50, NULL, 'OPENING-CATALOG-SECONDARY-14', 'Opening stock - catalog setup', '2000-01-01', NULL),
(29, 15, 1, 'STOCK IN', 50, NULL, 'OPENING-CATALOG-15', 'Opening stock - catalog setup', '2000-01-01', NULL),
(30, 15, 2, 'STOCK IN', 50, NULL, 'OPENING-CATALOG-SECONDARY-15', 'Opening stock - catalog setup', '2000-01-01', NULL),
(31, 16, 1, 'STOCK IN', 50, NULL, 'OPENING-CATALOG-16', 'Opening stock - catalog setup', '2000-01-01', NULL),
(32, 16, 2, 'STOCK IN', 50, NULL, 'OPENING-CATALOG-SECONDARY-16', 'Opening stock - catalog setup', '2000-01-01', NULL),
(33, 17, 1, 'STOCK IN', 50, 'pairs', 'OPENING-CATALOG-17-1', 'Opening stock - catalog setup', '2000-01-01', NULL),
(34, 17, 2, 'STOCK IN', 50, 'pairs', 'OPENING-CATALOG-17-2', 'Opening stock - catalog setup', '2000-01-01', NULL),
(35, 18, 1, 'STOCK IN', 50, 'pairs', 'OPENING-CATALOG-18-1', 'Opening stock - catalog setup', '2000-01-01', NULL),
(36, 18, 2, 'STOCK IN', 50, 'pairs', 'OPENING-CATALOG-18-2', 'Opening stock - catalog setup', '2000-01-01', NULL),
(37, 19, 1, 'STOCK IN', 50, 'pairs', 'OPENING-CATALOG-19-1', 'Opening stock - catalog setup', '2000-01-01', NULL),
(38, 19, 2, 'STOCK IN', 50, 'pairs', 'OPENING-CATALOG-19-2', 'Opening stock - catalog setup', '2000-01-01', NULL),
(39, 20, 1, 'STOCK IN', 50, 'pairs', 'OPENING-CATALOG-20-1', 'Opening stock - catalog setup', '2000-01-01', NULL),
(40, 20, 2, 'STOCK IN', 50, 'pairs', 'OPENING-CATALOG-20-2', 'Opening stock - catalog setup', '2000-01-01', NULL),
(41, 17, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-17-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(42, 17, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-17-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(43, 21, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-21-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(44, 21, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-21-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(45, 22, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-22-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(46, 22, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-22-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(47, 23, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-23-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(48, 23, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-23-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(49, 24, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-24-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(50, 24, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-24-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(51, 25, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-25-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(52, 25, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-25-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(53, 26, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-26-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(54, 26, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-26-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(55, 27, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-27-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(56, 27, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-27-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(57, 28, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-28-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(58, 28, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-28-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(59, 29, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-29-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(60, 29, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-29-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(61, 30, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-30-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(62, 30, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-30-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(63, 31, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-31-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(64, 31, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-31-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(65, 32, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-32-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(66, 32, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-32-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(67, 33, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-33-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(68, 33, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-33-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(69, 34, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-34-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(70, 34, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-34-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(71, 35, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-35-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(72, 35, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-35-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(73, 36, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-36-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(74, 36, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-36-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(75, 37, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-37-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(76, 37, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-37-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(77, 38, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-38-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(78, 38, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-38-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(79, 39, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-39-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(80, 39, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-39-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(81, 18, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-18-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(82, 18, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-18-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(83, 40, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-40-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(84, 40, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-40-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(85, 41, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-41-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(86, 41, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-41-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(87, 42, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-42-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(88, 42, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-42-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(89, 43, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-43-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(90, 43, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-43-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(91, 44, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-44-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(92, 44, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-44-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(93, 45, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-45-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(94, 45, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-45-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(95, 46, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-46-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(96, 46, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-46-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(97, 47, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-47-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(98, 47, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-47-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(99, 48, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-48-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(100, 48, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-48-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(101, 49, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-49-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(102, 49, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-49-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(103, 50, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-50-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(104, 50, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-50-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(105, 51, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-51-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(106, 51, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-51-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(107, 52, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-52-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(108, 52, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-52-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(109, 53, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-53-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(110, 53, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-53-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(111, 54, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-54-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(112, 54, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-54-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(113, 55, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-55-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(114, 55, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-55-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(115, 56, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-56-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(116, 56, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-56-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(117, 57, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-57-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(118, 57, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-57-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(119, 58, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-58-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(120, 58, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-58-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(121, 19, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-19-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(122, 19, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-19-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(123, 59, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-59-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(124, 59, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-59-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(125, 60, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-60-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(126, 60, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-60-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(127, 61, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-61-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(128, 61, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-61-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(129, 62, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-62-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(130, 62, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-62-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(131, 63, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-63-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(132, 63, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-63-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(133, 64, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-64-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(134, 64, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-64-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(135, 65, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-65-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(136, 65, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-65-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(137, 66, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-66-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(138, 66, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-66-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(139, 67, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-67-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(140, 67, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-67-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(141, 68, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-68-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(142, 68, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-68-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(143, 69, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-69-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(144, 69, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-69-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(145, 70, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-70-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(146, 70, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-70-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(147, 71, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-71-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(148, 71, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-71-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(149, 72, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-72-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(150, 72, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-72-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(151, 73, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-73-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(152, 73, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-73-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(153, 74, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-74-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(154, 74, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-74-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(155, 75, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-75-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(156, 75, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-75-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(157, 76, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-76-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(158, 76, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-76-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(159, 77, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-77-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(160, 77, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-77-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(161, 20, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-20-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(162, 20, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-20-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(163, 78, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-78-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(164, 78, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-78-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(165, 79, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-79-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(166, 79, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-79-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(167, 80, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-80-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(168, 80, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-80-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(169, 81, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-81-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(170, 81, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-81-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(171, 82, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-82-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(172, 82, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-82-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(173, 83, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-83-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(174, 83, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-83-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(175, 84, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-84-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(176, 84, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-84-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(177, 85, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-85-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(178, 85, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-85-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(179, 86, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-86-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(180, 86, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-86-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(181, 87, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-87-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(182, 87, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-87-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(183, 88, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-88-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(184, 88, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-88-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(185, 89, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-89-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(186, 89, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-89-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(187, 90, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-90-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(188, 90, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-90-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(189, 91, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-91-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(190, 91, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-91-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(191, 92, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-92-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(192, 92, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-92-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(193, 93, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-93-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(194, 93, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-93-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(195, 94, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-94-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(196, 94, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-94-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(197, 95, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-95-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(198, 95, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-95-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(199, 96, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-96-1', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(200, 96, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-96-2', 'Opening demo stock by individual shoe size', '2000-01-01', NULL),
(201, 17, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-17-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(202, 17, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-17-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(203, 21, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-21-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(204, 21, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-21-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(205, 22, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-22-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(206, 22, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-22-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(207, 23, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-23-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(208, 23, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-23-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(209, 24, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-24-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(210, 24, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-24-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(211, 25, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-25-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(212, 25, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-25-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(213, 26, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-26-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(214, 26, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-26-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(215, 27, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-27-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(216, 27, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-27-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(217, 28, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-28-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(218, 28, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-28-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(219, 29, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-29-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(220, 29, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-29-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(221, 30, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-30-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(222, 30, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-30-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(223, 31, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-31-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(224, 31, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-31-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(225, 32, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-32-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(226, 32, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-32-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(227, 33, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-33-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(228, 33, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-33-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(229, 34, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-34-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(230, 34, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-34-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(231, 35, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-35-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(232, 35, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-35-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(233, 36, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-36-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(234, 36, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-36-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(235, 37, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-37-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(236, 37, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-37-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(237, 38, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-38-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(238, 38, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-38-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(239, 39, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-39-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(240, 39, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-39-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(241, 18, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-18-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(242, 18, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-18-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(243, 40, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-40-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(244, 40, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-40-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(245, 41, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-41-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(246, 41, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-41-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(247, 42, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-42-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(248, 42, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-42-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(249, 43, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-43-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(250, 43, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-43-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(251, 44, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-44-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(252, 44, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-44-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(253, 45, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-45-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(254, 45, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-45-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(255, 46, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-46-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(256, 46, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-46-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(257, 47, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-47-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(258, 47, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-47-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(259, 48, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-48-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(260, 48, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-48-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(261, 49, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-49-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(262, 49, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-49-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(263, 50, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-50-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(264, 50, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-50-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(265, 51, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-51-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(266, 51, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-51-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(267, 52, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-52-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(268, 52, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-52-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(269, 53, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-53-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(270, 53, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-53-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(271, 54, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-54-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(272, 54, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-54-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(273, 55, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-55-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(274, 55, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-55-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(275, 56, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-56-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(276, 56, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-56-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(277, 57, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-57-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(278, 57, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-57-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(279, 58, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-58-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(280, 58, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-58-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(281, 19, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-19-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(282, 19, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-19-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(283, 59, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-59-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(284, 59, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-59-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(285, 60, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-60-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(286, 60, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-60-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(287, 61, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-61-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(288, 61, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-61-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(289, 62, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-62-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(290, 62, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-62-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(291, 63, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-63-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(292, 63, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-63-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(293, 64, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-64-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(294, 64, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-64-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(295, 65, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-65-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(296, 65, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-65-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(297, 66, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-66-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(298, 66, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-66-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(299, 67, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-67-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(300, 67, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-67-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(301, 68, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-68-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(302, 68, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-68-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(303, 69, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-69-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(304, 69, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-69-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(305, 70, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-70-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(306, 70, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-70-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(307, 71, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-71-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(308, 71, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-71-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(309, 72, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-72-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(310, 72, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-72-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(311, 73, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-73-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(312, 73, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-73-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(313, 74, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-74-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(314, 74, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-74-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(315, 75, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-75-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(316, 75, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-75-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(317, 76, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-76-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(318, 76, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-76-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(319, 77, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-77-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(320, 77, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-77-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(321, 20, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-20-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(322, 20, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-20-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(323, 78, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-78-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(324, 78, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-78-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(325, 79, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-79-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(326, 79, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-79-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(327, 80, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-80-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(328, 80, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-80-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(329, 81, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-81-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(330, 81, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-81-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(331, 82, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-82-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(332, 82, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-82-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(333, 83, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-83-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(334, 83, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-83-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(335, 84, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-84-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(336, 84, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-84-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(337, 85, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-85-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(338, 85, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-85-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(339, 86, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-86-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(340, 86, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-86-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(341, 87, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-87-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(342, 87, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-87-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(343, 88, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-88-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(344, 88, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-88-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(345, 89, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-89-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(346, 89, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-89-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(347, 90, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-90-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(348, 90, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-90-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(349, 91, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-91-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(350, 91, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-91-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(351, 92, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-92-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(352, 92, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-92-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(353, 93, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-93-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(354, 93, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-93-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(355, 94, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-94-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(356, 94, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-94-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(357, 95, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-95-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(358, 95, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-95-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(359, 96, 1, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-96-1', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(360, 96, 2, 'STOCK IN', 50, 'pairs', 'OPENING-SIZE-V2-96-2', 'Sample opening inventory by shoe size', '2000-01-01', NULL),
(65961, 12, 1, 'STOCK OUT', 5, NULL, 'REQ-2026111419032235', 'Stock out for approved quantity', '2026-11-14', 3),
(66602, 16, 1, 'STOCK OUT', 5, NULL, 'REQ-2026111419032232', 'Stock out for approved quantity', '2026-11-14', 3),
(67243, 7, 1, 'STOCK OUT', 5, NULL, 'REQ-2026111419032298', 'Stock out for approved quantity', '2026-11-14', 3),
(67884, 1, 1, 'STOCK OUT', 5, NULL, 'REQ-2026111419032236', 'Stock out for approved quantity', '2026-11-14', 3),
(68365, 8, 1, 'STOCK OUT', 5, NULL, 'REQ-2026111419032211', 'Stock out for approved quantity', '2026-11-14', 3),
(95406, 42, 1, 'STOCK IN', 5, 'pairs', 'REQ-2026111418595560', 'Received from Production; Request REQ-2026111418595560; P.O. PO-1042; accepted quantity cumulative 5', '2026-11-14', 3);



CREATE TABLE `stock_out` (
  `id` int(11) NOT NULL,
  `stock_out_number` varchar(50) NOT NULL,
  `item_id` int(11) NOT NULL,
  `warehouse_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `purpose` varchar(150) DEFAULT '',
  `destination` enum('Sales','Production','Procurement') DEFAULT NULL,
  `reference_number` varchar(100) DEFAULT '',
  `remarks` text DEFAULT NULL,
  `date` date NOT NULL,
  `user_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


INSERT INTO `stock_out` (`id`, `stock_out_number`, `item_id`, `warehouse_id`, `quantity`, `purpose`, `destination`, `reference_number`, `remarks`, `date`, `user_id`) VALUES
(1, 'SOUT-20261114190330-6-1', 12, 1, 5, 'Approved Request', 'Production', 'REQ-2026111419032235', 'Automatic stock out for approved request - Main Warehouse', '2026-11-14', 3),
(2, 'SOUT-20261114190333-5-1', 16, 1, 5, 'Approved Request', 'Production', 'REQ-2026111419032232', 'Automatic stock out for approved request - Main Warehouse', '2026-11-14', 3),
(3, 'SOUT-20261114190337-4-1', 7, 1, 5, 'Approved Request', 'Production', 'REQ-2026111419032298', 'Automatic stock out for approved request - Main Warehouse', '2026-11-14', 3),
(4, 'SOUT-20261114190341-3-1', 1, 1, 5, 'Approved Request', 'Production', 'REQ-2026111419032236', 'Automatic stock out for approved request - Main Warehouse', '2026-11-14', 3),
(5, 'SOUT-20261114190345-2-1', 8, 1, 5, 'Approved Request', 'Production', 'REQ-2026111419032211', 'Automatic stock out for approved request - Main Warehouse', '2026-11-14', 3);



CREATE TABLE `stock_transfers` (
  `id` int(11) NOT NULL,
  `transfer_number` varchar(50) NOT NULL,
  `item_id` int(11) NOT NULL,
  `from_warehouse` int(11) NOT NULL,
  `to_warehouse` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `reason` varchar(150) DEFAULT '',
  `remarks` text DEFAULT NULL,
  `date` date NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `status` enum('Pending','Completed','Cancelled','Delivered') NOT NULL DEFAULT 'Delivered'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



CREATE TABLE `stock_transfer_items` (
  `id` int(11) NOT NULL,
  `transfer_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



CREATE TABLE `supplier_rejections` (
  `id` int(11) NOT NULL,
  `request_id` int(11) NOT NULL,
  `delivery_id` int(11) NOT NULL,
  `report_number` varchar(40) DEFAULT NULL,
  `po_number` varchar(100) NOT NULL DEFAULT '',
  `supplier_name` varchar(150) NOT NULL DEFAULT '',
  `supplier_gmail` varchar(190) NOT NULL DEFAULT '',
  `received_date` date NOT NULL,
  `attachment_names` text DEFAULT NULL,
  `report_status` enum('Pending','Email Sent','Supplier Response') NOT NULL DEFAULT 'Pending',
  `supplier_response` text DEFAULT NULL,
  `email_sent_at` datetime DEFAULT NULL,
  `supplier_response_at` datetime DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



CREATE TABLE `supplier_rejection_items` (
  `id` int(11) NOT NULL,
  `rejection_id` int(11) NOT NULL,
  `request_item_id` int(11) DEFAULT NULL,
  `item_name` varchar(150) NOT NULL,
  `ordered_quantity` int(11) NOT NULL DEFAULT 0,
  `delivered_quantity` int(11) NOT NULL DEFAULT 0,
  `accepted_quantity` int(11) NOT NULL DEFAULT 0,
  `rejected_quantity` int(11) NOT NULL DEFAULT 0,
  `unit` varchar(30) NOT NULL DEFAULT 'pcs',
  `rejection_reason` varchar(500) DEFAULT '',
  `item_action` varchar(30) NOT NULL DEFAULT 'Inspection Reject'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `username` varchar(80) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('ADMIN','USER') NOT NULL DEFAULT 'USER',
  `position` varchar(120) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


INSERT INTO `users` (`id`, `full_name`, `email`, `username`, `password`, `role`, `position`, `created_at`) VALUES
(1, 'Admin', 'admin@inventory.local', 'admin', '$2y$12$JyHQtJmXH9hWrIVVsP3d1uSPoSn62ORz9TAz46idnZPiXw0ReTQYm', 'ADMIN', NULL, '2026-11-14 17:58:15'),
(3, 'Suficiencia Andrew C', 'suficiencia@inventory.local', 'suficiencia', '$2y$12$GZC9hXynhQfDzVb0zQ2ur.rMdFlwIw/5zZnlzE78ETOq2PJkZ3skq', 'ADMIN', 'Warehouse Manager', '2026-11-14 17:58:15'),
(4, 'Riel Jurado', 'jurado@inventory.local', 'jurado', '$2y$12$CHgKhdeFHpoZ4U.wrwuPGulr/7u435KxqmGTFGUPKgLSdYYJiUPle', 'USER', 'Inventory Staff / Clerk', '2026-11-14 17:58:15'),
(5, 'Banisil, Ferdausi', 'banisil@inventory.local', 'banisil', '$2y$12$lIv0DE7oqRUsKfuX9rqrKuJxAXm3saEhkhv4vimNRdOYAhhCeYtRC', 'USER', 'Warehouse Staff / Associate', '2026-11-14 17:58:15'),
(6, 'Paje Meynard', 'paje@inventory.local', 'paje', '$2y$12$B3a0yI9qlDV/Yj0CaGdbH.ZbzMcT6yO7ewQbjJ7wzNMnbMfySmHki', 'ADMIN', 'Inventory Controller / Analyst', '2026-11-14 17:58:15'),
(7, 'Mendoza Franz Gian T.', 'mendoza@inventory.local', 'mendoza', '$2y$12$snEPb/7FKtjcxmfMBthY.OV3o5aXrRdIIvkkA0N2s9Uz2Kn0Z0rL.', 'USER', 'Picker and Packer', '2026-11-14 17:58:15'),
(8, 'Pompa, Eric Joseph F.', 'pompa@inventory.local', 'pompa', '$2y$12$kOAIT.ws9rddrw4CPsMMROggmnBKZgy6I2eiBFLerXoUATm/seq7S', 'USER', 'Shipping and Receiving Clerk', '2026-11-14 17:58:15');



CREATE TABLE `warehouses` (
  `id` int(11) NOT NULL,
  `warehouse_code` varchar(30) NOT NULL,
  `warehouse_name` varchar(100) NOT NULL,
  `location` varchar(150) DEFAULT '',
  `manager` varchar(100) DEFAULT '',
  `contact_number` varchar(50) DEFAULT '',
  `status` enum('Active','Inactive') NOT NULL DEFAULT 'Active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


INSERT INTO `warehouses` (`id`, `warehouse_code`, `warehouse_name`, `location`, `manager`, `contact_number`, `status`) VALUES
(1, 'WH-MAIN', 'Main Warehouse', 'Main Storage', 'Andrew Suficiencia', '', 'Active'),
(2, 'WH-SECONDARY', 'Secondary Warehouse', 'Secondary Storage', 'Meynard Paje', '', 'Active');


ALTER TABLE `app_migrations`
  ADD PRIMARY KEY (`name`);

ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `category_name` (`category_name`);

ALTER TABLE `deliveries`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `request_id` (`request_id`);

ALTER TABLE `delivery_receipts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `dr_number` (`dr_number`),
  ADD UNIQUE KEY `delivery_id` (`delivery_id`),
  ADD KEY `fk_dr_request` (`request_id`);

ALTER TABLE `finished_goods`
  ADD PRIMARY KEY (`fg_id`),
  ADD UNIQUE KEY `item_code` (`item_code`),
  ADD KEY `fk_fg_category` (`category_id`);

ALTER TABLE `inventory`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_inventory_item_warehouse` (`item_id`,`warehouse_id`),
  ADD KEY `fk_inventory_warehouse` (`warehouse_id`);

ALTER TABLE `items`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `item_code` (`item_code`),
  ADD KEY `fk_items_category` (`category_id`);

ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_notifications_created` (`created_at`),
  ADD KEY `fk_notification_actor` (`actor_user_id`),
  ADD KEY `idx_notifications_recipient` (`recipient_user_id`,`created_at`);

ALTER TABLE `notification_reads`
  ADD PRIMARY KEY (`notification_id`,`user_id`),
  ADD KEY `fk_notification_read_user` (`user_id`);

ALTER TABLE `raw_materials`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `item_code` (`item_code`),
  ADD KEY `fk_raw_category` (`category_id`);

ALTER TABLE `requests`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `request_number` (`request_number`),
  ADD KEY `fk_request_user` (`requested_by`),
  ADD KEY `fk_request_approved` (`approved_by`);

ALTER TABLE `request_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_requestitem_request` (`request_id`),
  ADD KEY `fk_requestitem_item` (`item_id`),
  ADD KEY `fk_requestitem_warehouse` (`warehouse_id`);

ALTER TABLE `sales_returns`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `return_number` (`return_number`),
  ADD KEY `idx_sales_returns_status` (`status`);

ALTER TABLE `sales_return_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_sales_return_item_return` (`return_id`),
  ADD KEY `fk_sales_return_item_item` (`item_id`),
  ADD KEY `fk_sales_return_item_warehouse` (`warehouse_id`),
  ADD KEY `idx_sri_sales_return_id` (`sales_return_id`);

ALTER TABLE `stock_adjustments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `adjustment_number` (`adjustment_number`),
  ADD KEY `fk_adjustment_item` (`item_id`),
  ADD KEY `fk_adjustment_warehouse` (`warehouse_id`),
  ADD KEY `fk_adjustment_user` (`user_id`);

ALTER TABLE `stock_in`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `stock_in_number` (`stock_in_number`),
  ADD KEY `fk_stockin_item` (`item_id`),
  ADD KEY `fk_stockin_warehouse` (`warehouse_id`),
  ADD KEY `fk_stockin_user` (`user_id`);

ALTER TABLE `stock_movements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_movement_item` (`item_id`),
  ADD KEY `fk_movement_warehouse` (`warehouse_id`),
  ADD KEY `fk_movement_user` (`user_id`);

ALTER TABLE `stock_out`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `stock_out_number` (`stock_out_number`),
  ADD KEY `fk_stockout_item` (`item_id`),
  ADD KEY `fk_stockout_warehouse` (`warehouse_id`),
  ADD KEY `fk_stockout_user` (`user_id`);

ALTER TABLE `stock_transfers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `transfer_number` (`transfer_number`),
  ADD KEY `fk_transfer_item` (`item_id`),
  ADD KEY `fk_transfer_from` (`from_warehouse`),
  ADD KEY `fk_transfer_to` (`to_warehouse`),
  ADD KEY `fk_transfer_user` (`user_id`);

ALTER TABLE `stock_transfer_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_transfer_items_transfer` (`transfer_id`),
  ADD KEY `fk_transfer_items_item` (`item_id`);

ALTER TABLE `supplier_rejections`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_supplier_rejection_delivery` (`delivery_id`),
  ADD UNIQUE KEY `uq_supplier_rejection_report` (`report_number`),
  ADD KEY `fk_supplier_rejection_request` (`request_id`),
  ADD KEY `fk_supplier_rejection_user` (`created_by`);

ALTER TABLE `supplier_rejection_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_sri_rejection` (`rejection_id`),
  ADD KEY `fk_sri_request_item` (`request_item_id`);

ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `username` (`username`);

ALTER TABLE `warehouses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `warehouse_code` (`warehouse_code`);


ALTER TABLE `categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

ALTER TABLE `deliveries`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

ALTER TABLE `delivery_receipts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

ALTER TABLE `inventory`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=378;

ALTER TABLE `items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=97;

ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=63;

ALTER TABLE `requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

ALTER TABLE `request_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

ALTER TABLE `sales_returns`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `sales_return_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `stock_adjustments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `stock_in`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

ALTER TABLE `stock_movements`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=331407;

ALTER TABLE `stock_out`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

ALTER TABLE `stock_transfers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `stock_transfer_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `supplier_rejections`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `supplier_rejection_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

ALTER TABLE `warehouses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;


ALTER TABLE `deliveries`
  ADD CONSTRAINT `fk_delivery_request` FOREIGN KEY (`request_id`) REFERENCES `requests` (`id`) ON DELETE CASCADE;

ALTER TABLE `delivery_receipts`
  ADD CONSTRAINT `fk_dr_delivery` FOREIGN KEY (`delivery_id`) REFERENCES `deliveries` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_dr_request` FOREIGN KEY (`request_id`) REFERENCES `requests` (`id`) ON DELETE CASCADE;

ALTER TABLE `finished_goods`
  ADD CONSTRAINT `fk_fg_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`);

ALTER TABLE `inventory`
  ADD CONSTRAINT `fk_inventory_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  ADD CONSTRAINT `fk_inventory_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`);

ALTER TABLE `items`
  ADD CONSTRAINT `fk_items_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`);

ALTER TABLE `notifications`
  ADD CONSTRAINT `fk_notification_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

ALTER TABLE `notification_reads`
  ADD CONSTRAINT `fk_notification_read_notification` FOREIGN KEY (`notification_id`) REFERENCES `notifications` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_notification_read_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `raw_materials`
  ADD CONSTRAINT `fk_raw_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`);

ALTER TABLE `requests`
  ADD CONSTRAINT `fk_request_approved` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_request_user` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

ALTER TABLE `request_items`
  ADD CONSTRAINT `fk_requestitem_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_requestitem_request` FOREIGN KEY (`request_id`) REFERENCES `requests` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_requestitem_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`);

ALTER TABLE `sales_return_items`
  ADD CONSTRAINT `fk_sales_return_item_header` FOREIGN KEY (`sales_return_id`) REFERENCES `sales_returns` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_sales_return_item_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  ADD CONSTRAINT `fk_sales_return_item_return` FOREIGN KEY (`return_id`) REFERENCES `sales_returns` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_sales_return_item_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`);

ALTER TABLE `stock_adjustments`
  ADD CONSTRAINT `fk_adjustment_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  ADD CONSTRAINT `fk_adjustment_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_adjustment_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`);

ALTER TABLE `stock_in`
  ADD CONSTRAINT `fk_stockin_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  ADD CONSTRAINT `fk_stockin_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_stockin_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`);

ALTER TABLE `stock_movements`
  ADD CONSTRAINT `fk_movement_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  ADD CONSTRAINT `fk_movement_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_movement_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`);

ALTER TABLE `stock_out`
  ADD CONSTRAINT `fk_stockout_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  ADD CONSTRAINT `fk_stockout_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_stockout_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`);

ALTER TABLE `stock_transfers`
  ADD CONSTRAINT `fk_transfer_from` FOREIGN KEY (`from_warehouse`) REFERENCES `warehouses` (`id`),
  ADD CONSTRAINT `fk_transfer_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  ADD CONSTRAINT `fk_transfer_to` FOREIGN KEY (`to_warehouse`) REFERENCES `warehouses` (`id`),
  ADD CONSTRAINT `fk_transfer_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

ALTER TABLE `stock_transfer_items`
  ADD CONSTRAINT `fk_transfer_items_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  ADD CONSTRAINT `fk_transfer_items_transfer` FOREIGN KEY (`transfer_id`) REFERENCES `stock_transfers` (`id`) ON DELETE CASCADE;

ALTER TABLE `supplier_rejections`
  ADD CONSTRAINT `fk_supplier_rejection_delivery` FOREIGN KEY (`delivery_id`) REFERENCES `deliveries` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_supplier_rejection_request` FOREIGN KEY (`request_id`) REFERENCES `requests` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_supplier_rejection_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

ALTER TABLE `supplier_rejection_items`
  ADD CONSTRAINT `fk_sri_rejection` FOREIGN KEY (`rejection_id`) REFERENCES `supplier_rejections` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_sri_request_item` FOREIGN KEY (`request_item_id`) REFERENCES `request_items` (`id`) ON DELETE SET NULL;
COMMIT;

;
;
;
