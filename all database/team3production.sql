-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Nov 18, 2026 at 03:48 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `team3production`
--

-- --------------------------------------------------------

--
-- Table structure for table `activity_log`
--

CREATE TABLE `activity_log` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(255) NOT NULL COMMENT 'e.g. "created PO-1050" — already human-readable',
  `order_id` varchar(10) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `activity_log`
--

INSERT INTO `activity_log` (`id`, `user_id`, `action`, `order_id`, `created_at`) VALUES
(1, 4, 'created PO-1042 — Classic Black Sneakers size 25 cm x50', 'PO-1042', '2026-11-10 12:56:06'),
(2, 4, 'calculated costing for PO-1042', 'PO-1042', '2026-11-10 12:56:45'),
(3, 4, 'sent costing for PO-1042 to Team 5 — Finance', 'PO-1042', '2026-11-10 12:56:48'),
(4, 4, 'created PO-1043 — White Court Shoes size 25.5 cm x50', 'PO-1043', '2026-11-15 20:30:17'),
(5, 4, 'calculated costing for PO-1043', 'PO-1043', '2026-11-15 20:30:29'),
(6, 4, 'sent costing for PO-1043 to Team 5 — Finance', 'PO-1043', '2026-11-15 20:30:32'),
(7, 7, 'requested 122 pairs of Foam Insole for PO-1043 (Inventory REQ-2026111617273926)', 'PO-1043', '2026-11-17 00:27:39'),
(8, 7, 'rejected material request #1 for PO-1043', 'PO-1043', '2026-11-17 00:31:29'),
(9, 7, 'requested 200 pairs of Foam Insole for PO-1042 (Inventory REQ-2026111617313693)', 'PO-1042', '2026-11-17 00:31:37'),
(10, 7, 'rejected material request #2 for PO-1042', 'PO-1042', '2026-11-17 00:35:21'),
(11, 7, 'requested 5 meters of Black Leather for PO-1043 (Inventory REQ-2026111617353695)', 'PO-1043', '2026-11-17 00:35:36'),
(12, 7, 'issued material request #3 for PO-1043', 'PO-1043', '2026-11-17 00:36:19'),
(13, 7, 'created PO-1044 — Quick Step Classic Low size 23 cm x2', 'PO-1044', '2026-11-17 01:30:03'),
(14, 7, 'calculated costing for PO-1044', 'PO-1044', '2026-11-17 01:30:13'),
(15, 7, 'sent costing for PO-1044 to Team 5 — Finance', 'PO-1044', '2026-11-17 01:30:16'),
(16, 7, 'requested 20 meters of PU Leather for PO-1043 (Inventory REQ-2026111708033351)', 'PO-1043', '2026-11-17 15:03:33'),
(17, 7, 'issued material request #4 for PO-1043', 'PO-1043', '2026-11-17 15:20:55');

-- --------------------------------------------------------

--
-- Table structure for table `bill_of_materials`
--

CREATE TABLE `bill_of_materials` (
  `bom_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `material_id` int(11) NOT NULL COMMENT 'FK -> items.id (inventory Raw Material)',
  `qty_per_unit` decimal(10,2) NOT NULL,
  `unit` varchar(30) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `bill_of_materials`
--

INSERT INTO `bill_of_materials` (`bom_id`, `product_id`, `material_id`, `qty_per_unit`, `unit`) VALUES
(1, 1, 4, 0.50, 'meters'),
(2, 1, 5, 1.00, 'pairs'),
(3, 1, 6, 1.00, 'pairs'),
(4, 1, 7, 1.00, 'pairs'),
(5, 1, 8, 0.05, 'bottles'),
(6, 2, 4, 0.50, 'meters'),
(7, 2, 5, 1.00, 'pairs'),
(8, 2, 6, 1.00, 'pairs'),
(9, 2, 7, 1.00, 'pairs'),
(10, 2, 8, 0.05, 'bottles'),
(16, 4, 1, 0.50, 'square feet'),
(17, 4, 7, 1.00, 'pairs'),
(18, 4, 8, 1.00, 'pairs'),
(19, 4, 12, 1.00, 'pieces'),
(20, 4, 16, 0.05, 'liters'),
(21, 5, 1, 0.50, 'square feet'),
(22, 5, 7, 1.00, 'pairs'),
(23, 5, 8, 1.00, 'pairs'),
(24, 5, 12, 1.00, 'pieces'),
(25, 5, 16, 0.05, 'liters'),
(26, 6, 1, 0.50, 'square feet'),
(27, 6, 7, 1.00, 'pairs'),
(28, 6, 8, 1.00, 'pairs'),
(29, 6, 12, 1.00, 'pieces'),
(30, 6, 16, 0.05, 'liters'),
(31, 7, 1, 0.50, 'square feet'),
(32, 7, 7, 1.00, 'pairs'),
(33, 7, 8, 1.00, 'pairs'),
(34, 7, 12, 1.00, 'pieces'),
(35, 7, 16, 0.05, 'liters');

-- --------------------------------------------------------

--
-- Table structure for table `checklist_items`
--

CREATE TABLE `checklist_items` (
  `order_id` varchar(10) NOT NULL,
  `material_id` int(11) NOT NULL,
  `ready` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `checklist_items`
--

INSERT INTO `checklist_items` (`order_id`, `material_id`, `ready`) VALUES
('PO-1042', 4, 0),
('PO-1042', 5, 0),
('PO-1042', 6, 0),
('PO-1042', 7, 0),
('PO-1042', 8, 0),
('PO-1043', 4, 0),
('PO-1043', 5, 0),
('PO-1043', 6, 0),
('PO-1043', 7, 0),
('PO-1043', 8, 0),
('PO-1044', 1, 0),
('PO-1044', 7, 0),
('PO-1044', 8, 0),
('PO-1044', 12, 0),
('PO-1044', 16, 0);

-- --------------------------------------------------------

--
-- Stand-in structure for view `delivery_finished_goods`
-- (See below for the actual view)
--
CREATE TABLE `delivery_finished_goods` (
`order_id` varchar(10)
,`item_code` varchar(50)
,`product` varchar(100)
,`produced_qty` int(11)
,`accepted_qty` int(11)
,`rejected_qty` int(11)
,`delivery_status` varchar(9)
,`delivered_at` datetime
,`sort_group` int(1)
,`record_id` int(11)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `delivery_raw_materials`
-- (See below for the actual view)
--
CREATE TABLE `delivery_raw_materials` (
`request_id` int(11)
,`order_id` varchar(10)
,`material` varchar(150)
,`quantity` varchar(40)
,`priority` enum('normal','urgent')
,`requested_at` datetime
,`issued_at` datetime
,`delivery_status` enum('pending','approved','issued','rejected')
);

-- --------------------------------------------------------

--
-- Table structure for table `finished_goods`
--

CREATE TABLE `finished_goods` (
  `fg_id` int(11) NOT NULL,
  `order_id` varchar(10) NOT NULL,
  `product_id` int(11) NOT NULL,
  `item_code` varchar(50) NOT NULL COMMENT 'items.item_code of the inventory Finished Good',
  `produced_qty` int(11) NOT NULL,
  `accepted_qty` int(11) NOT NULL,
  `rejected_qty` int(11) NOT NULL,
  `status` enum('ready','sent_to_inventory') NOT NULL DEFAULT 'ready',
  `sent_at` datetime DEFAULT NULL,
  `request_qty` int(11) DEFAULT NULL,
  `excess_qty` int(11) DEFAULT NULL,
  `request_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `items`
--

CREATE TABLE `items` (
  `id` int(11) NOT NULL,
  `item_code` varchar(50) NOT NULL,
  `item_name` varchar(150) NOT NULL,
  `item_type` varchar(30) NOT NULL DEFAULT '',
  `size` varchar(30) NOT NULL DEFAULT '',
  `unit` varchar(30) NOT NULL DEFAULT 'pcs',
  `reorder_level` int(11) NOT NULL DEFAULT 0,
  `status` varchar(20) NOT NULL DEFAULT 'Active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `items`
--

INSERT INTO `items` (`id`, `item_code`, `item_name`, `item_type`, `size`, `unit`, `reorder_level`, `status`) VALUES
(1, 'RM-001', 'Full-Grain Leather', 'Raw Material', '', 'square feet', 0, 'Active'),
(2, 'RM-002', 'Black Leather', 'Raw Material', '', 'square feet', 0, 'Active'),
(3, 'RM-003', 'Nubuck Leather', 'Raw Material', '', 'square feet', 0, 'Active'),
(4, 'RM-004', 'Mesh Fabric', 'Raw Material', '', 'meters', 0, 'Active'),
(5, 'RM-005', 'Canvas Fabric', 'Raw Material', '', 'meters', 0, 'Active'),
(6, 'RM-006', 'PU Leather', 'Raw Material', '', 'meters', 0, 'Active'),
(7, 'RM-007', 'Rubber Sole', 'Raw Material', '', 'pairs', 0, 'Active'),
(8, 'RM-008', 'EVA Foam Sheets', 'Raw Material', '', 'pairs', 0, 'Active'),
(9, 'RM-009', 'Foam Insole', 'Raw Material', '', 'pairs', 0, 'Active'),
(10, 'RM-010', 'Metal Eyelets', 'Raw Material', '', 'gross', 0, 'Active'),
(11, 'RM-011', 'Metal Buckles', 'Raw Material', '', 'pieces', 0, 'Active'),
(12, 'RM-012', 'Shoelaces', 'Raw Material', '', 'pieces', 0, 'Active'),
(13, 'RM-013', 'Shoe Boxes', 'Raw Material', '', 'pieces', 0, 'Active'),
(14, 'RM-014', 'Tissue Paper Rolls', 'Raw Material', '', 'pieces', 0, 'Active'),
(15, 'RM-015', 'Packaging Tape', 'Raw Material', '', 'rolls', 0, 'Active'),
(16, 'RM-016', 'Shoe Adhesive', 'Raw Material', '', 'liters', 0, 'Active'),
(17, 'FG-001', 'Quick Step Classic Low', 'Finished Good', '26', 'pairs', 0, 'Active'),
(18, 'FG-002', 'Quick Step Street Runner', 'Finished Good', '26', 'pairs', 0, 'Active'),
(19, 'FG-003', 'Quick Step Court Flex', 'Finished Good', '26', 'pairs', 0, 'Active'),
(20, 'FG-004', 'Quick Step Urban Walk', 'Finished Good', '26', 'pairs', 0, 'Active'),
(21, 'FG-001-S27', 'Quick Step Classic Low', 'Finished Good', '27', 'pairs', 0, 'Active'),
(22, 'FG-001-S28', 'Quick Step Classic Low', 'Finished Good', '28', 'pairs', 0, 'Active'),
(23, 'FG-001-S29', 'Quick Step Classic Low', 'Finished Good', '29', 'pairs', 0, 'Active'),
(24, 'FG-001-S30', 'Quick Step Classic Low', 'Finished Good', '30', 'pairs', 0, 'Active'),
(25, 'FG-001-S31', 'Quick Step Classic Low', 'Finished Good', '31', 'pairs', 0, 'Active'),
(26, 'FG-001-S32', 'Quick Step Classic Low', 'Finished Good', '32', 'pairs', 0, 'Active'),
(27, 'FG-001-S33', 'Quick Step Classic Low', 'Finished Good', '33', 'pairs', 0, 'Active'),
(28, 'FG-001-S34', 'Quick Step Classic Low', 'Finished Good', '34', 'pairs', 0, 'Active'),
(29, 'FG-001-S35', 'Quick Step Classic Low', 'Finished Good', '35', 'pairs', 0, 'Active'),
(30, 'FG-001-S36', 'Quick Step Classic Low', 'Finished Good', '36', 'pairs', 0, 'Active'),
(31, 'FG-001-S37', 'Quick Step Classic Low', 'Finished Good', '37', 'pairs', 0, 'Active'),
(32, 'FG-001-S38', 'Quick Step Classic Low', 'Finished Good', '38', 'pairs', 0, 'Active'),
(33, 'FG-001-S39', 'Quick Step Classic Low', 'Finished Good', '39', 'pairs', 0, 'Active'),
(34, 'FG-001-S40', 'Quick Step Classic Low', 'Finished Good', '40', 'pairs', 0, 'Active'),
(35, 'FG-001-S41', 'Quick Step Classic Low', 'Finished Good', '41', 'pairs', 0, 'Active'),
(36, 'FG-001-S42', 'Quick Step Classic Low', 'Finished Good', '42', 'pairs', 0, 'Active'),
(37, 'FG-001-S43', 'Quick Step Classic Low', 'Finished Good', '43', 'pairs', 0, 'Active'),
(38, 'FG-001-S44', 'Quick Step Classic Low', 'Finished Good', '44', 'pairs', 0, 'Active'),
(39, 'FG-001-S45', 'Quick Step Classic Low', 'Finished Good', '45', 'pairs', 0, 'Active'),
(40, 'FG-002-S27', 'Quick Step Street Runner', 'Finished Good', '27', 'pairs', 0, 'Active'),
(41, 'FG-002-S28', 'Quick Step Street Runner', 'Finished Good', '28', 'pairs', 0, 'Active'),
(42, 'FG-002-S29', 'Quick Step Street Runner', 'Finished Good', '29', 'pairs', 0, 'Active'),
(43, 'FG-002-S30', 'Quick Step Street Runner', 'Finished Good', '30', 'pairs', 0, 'Active'),
(44, 'FG-002-S31', 'Quick Step Street Runner', 'Finished Good', '31', 'pairs', 0, 'Active'),
(45, 'FG-002-S32', 'Quick Step Street Runner', 'Finished Good', '32', 'pairs', 0, 'Active'),
(46, 'FG-002-S33', 'Quick Step Street Runner', 'Finished Good', '33', 'pairs', 0, 'Active'),
(47, 'FG-002-S34', 'Quick Step Street Runner', 'Finished Good', '34', 'pairs', 0, 'Active'),
(48, 'FG-002-S35', 'Quick Step Street Runner', 'Finished Good', '35', 'pairs', 0, 'Active'),
(49, 'FG-002-S36', 'Quick Step Street Runner', 'Finished Good', '36', 'pairs', 0, 'Active'),
(50, 'FG-002-S37', 'Quick Step Street Runner', 'Finished Good', '37', 'pairs', 0, 'Active'),
(51, 'FG-002-S38', 'Quick Step Street Runner', 'Finished Good', '38', 'pairs', 0, 'Active'),
(52, 'FG-002-S39', 'Quick Step Street Runner', 'Finished Good', '39', 'pairs', 0, 'Active'),
(53, 'FG-002-S40', 'Quick Step Street Runner', 'Finished Good', '40', 'pairs', 0, 'Active'),
(54, 'FG-002-S41', 'Quick Step Street Runner', 'Finished Good', '41', 'pairs', 0, 'Active'),
(55, 'FG-002-S42', 'Quick Step Street Runner', 'Finished Good', '42', 'pairs', 0, 'Active'),
(56, 'FG-002-S43', 'Quick Step Street Runner', 'Finished Good', '43', 'pairs', 0, 'Active'),
(57, 'FG-002-S44', 'Quick Step Street Runner', 'Finished Good', '44', 'pairs', 0, 'Active'),
(58, 'FG-002-S45', 'Quick Step Street Runner', 'Finished Good', '45', 'pairs', 0, 'Active'),
(59, 'FG-003-S27', 'Quick Step Court Flex', 'Finished Good', '27', 'pairs', 0, 'Active'),
(60, 'FG-003-S28', 'Quick Step Court Flex', 'Finished Good', '28', 'pairs', 0, 'Active'),
(61, 'FG-003-S29', 'Quick Step Court Flex', 'Finished Good', '29', 'pairs', 0, 'Active'),
(62, 'FG-003-S30', 'Quick Step Court Flex', 'Finished Good', '30', 'pairs', 0, 'Active'),
(63, 'FG-003-S31', 'Quick Step Court Flex', 'Finished Good', '31', 'pairs', 0, 'Active'),
(64, 'FG-003-S32', 'Quick Step Court Flex', 'Finished Good', '32', 'pairs', 0, 'Active'),
(65, 'FG-003-S33', 'Quick Step Court Flex', 'Finished Good', '33', 'pairs', 0, 'Active'),
(66, 'FG-003-S34', 'Quick Step Court Flex', 'Finished Good', '34', 'pairs', 0, 'Active'),
(67, 'FG-003-S35', 'Quick Step Court Flex', 'Finished Good', '35', 'pairs', 0, 'Active'),
(68, 'FG-003-S36', 'Quick Step Court Flex', 'Finished Good', '36', 'pairs', 0, 'Active'),
(69, 'FG-003-S37', 'Quick Step Court Flex', 'Finished Good', '37', 'pairs', 0, 'Active'),
(70, 'FG-003-S38', 'Quick Step Court Flex', 'Finished Good', '38', 'pairs', 0, 'Active'),
(71, 'FG-003-S39', 'Quick Step Court Flex', 'Finished Good', '39', 'pairs', 0, 'Active'),
(72, 'FG-003-S40', 'Quick Step Court Flex', 'Finished Good', '40', 'pairs', 0, 'Active'),
(73, 'FG-003-S41', 'Quick Step Court Flex', 'Finished Good', '41', 'pairs', 0, 'Active'),
(74, 'FG-003-S42', 'Quick Step Court Flex', 'Finished Good', '42', 'pairs', 0, 'Active'),
(75, 'FG-003-S43', 'Quick Step Court Flex', 'Finished Good', '43', 'pairs', 0, 'Active'),
(76, 'FG-003-S44', 'Quick Step Court Flex', 'Finished Good', '44', 'pairs', 0, 'Active'),
(77, 'FG-003-S45', 'Quick Step Court Flex', 'Finished Good', '45', 'pairs', 0, 'Active'),
(78, 'FG-004-S27', 'Quick Step Urban Walk', 'Finished Good', '27', 'pairs', 0, 'Active'),
(79, 'FG-004-S28', 'Quick Step Urban Walk', 'Finished Good', '28', 'pairs', 0, 'Active'),
(80, 'FG-004-S29', 'Quick Step Urban Walk', 'Finished Good', '29', 'pairs', 0, 'Active'),
(81, 'FG-004-S30', 'Quick Step Urban Walk', 'Finished Good', '30', 'pairs', 0, 'Active'),
(82, 'FG-004-S31', 'Quick Step Urban Walk', 'Finished Good', '31', 'pairs', 0, 'Active'),
(83, 'FG-004-S32', 'Quick Step Urban Walk', 'Finished Good', '32', 'pairs', 0, 'Active'),
(84, 'FG-004-S33', 'Quick Step Urban Walk', 'Finished Good', '33', 'pairs', 0, 'Active'),
(85, 'FG-004-S34', 'Quick Step Urban Walk', 'Finished Good', '34', 'pairs', 0, 'Active'),
(86, 'FG-004-S35', 'Quick Step Urban Walk', 'Finished Good', '35', 'pairs', 0, 'Active'),
(87, 'FG-004-S36', 'Quick Step Urban Walk', 'Finished Good', '36', 'pairs', 0, 'Active'),
(88, 'FG-004-S37', 'Quick Step Urban Walk', 'Finished Good', '37', 'pairs', 0, 'Active'),
(89, 'FG-004-S38', 'Quick Step Urban Walk', 'Finished Good', '38', 'pairs', 0, 'Active'),
(90, 'FG-004-S39', 'Quick Step Urban Walk', 'Finished Good', '39', 'pairs', 0, 'Active'),
(91, 'FG-004-S40', 'Quick Step Urban Walk', 'Finished Good', '40', 'pairs', 0, 'Active'),
(92, 'FG-004-S41', 'Quick Step Urban Walk', 'Finished Good', '41', 'pairs', 0, 'Active'),
(93, 'FG-004-S42', 'Quick Step Urban Walk', 'Finished Good', '42', 'pairs', 0, 'Active'),
(94, 'FG-004-S43', 'Quick Step Urban Walk', 'Finished Good', '43', 'pairs', 0, 'Active'),
(95, 'FG-004-S44', 'Quick Step Urban Walk', 'Finished Good', '44', 'pairs', 0, 'Active'),
(96, 'FG-004-S45', 'Quick Step Urban Walk', 'Finished Good', '45', 'pairs', 0, 'Active');

-- --------------------------------------------------------

--
-- Table structure for table `material_costs`
--

CREATE TABLE `material_costs` (
  `item_id` int(11) NOT NULL,
  `cost_price` decimal(12,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `material_costs`
--

INSERT INTO `material_costs` (`item_id`, `cost_price`) VALUES
(1, 450.00),
(2, 450.00),
(3, 450.00),
(4, 450.00),
(5, 180.00),
(6, 12.00),
(7, 40.00),
(8, 85.00),
(9, 40.00),
(10, 50.00),
(11, 50.00),
(12, 12.00),
(13, 50.00),
(14, 50.00),
(15, 50.00),
(16, 85.00);

-- --------------------------------------------------------

--
-- Table structure for table `material_requests`
--

CREATE TABLE `material_requests` (
  `request_id` int(11) NOT NULL,
  `order_id` varchar(10) NOT NULL,
  `material_id` int(11) NOT NULL COMMENT 'FK -> items.id (inventory Raw Material)',
  `quantity` varchar(40) NOT NULL COMMENT 'e.g. "200 pairs"',
  `qty_value` decimal(12,2) NOT NULL COMMENT 'numeric portion, used for stock math',
  `priority` enum('normal','urgent') NOT NULL DEFAULT 'normal',
  `status` enum('pending','approved','issued','rejected') NOT NULL DEFAULT 'pending',
  `inventory_request_id` int(11) DEFAULT NULL COMMENT 'FK -> inventory requests.id (mirror request seen by Inventory)',
  `requested_at` datetime DEFAULT current_timestamp(),
  `issued_at` datetime DEFAULT NULL COMMENT 'when Inventory delivered (issued) the material to production',
  `stockout_baseline` int(11) DEFAULT NULL,
  `inventory_request_number` varchar(50) DEFAULT NULL,
  `approved_qty` decimal(12,2) DEFAULT NULL,
  `accepted_qty` decimal(12,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `material_requests`
--

INSERT INTO `material_requests` (`request_id`, `order_id`, `material_id`, `quantity`, `qty_value`, `priority`, `status`, `inventory_request_id`, `requested_at`, `issued_at`, `stockout_baseline`, `inventory_request_number`, `approved_qty`, `accepted_qty`) VALUES
(1, 'PO-1043', 7, '122 pairs', 122.00, 'normal', 'rejected', 7, '2026-11-17 00:27:39', NULL, NULL, 'REQ-2026111617273926', NULL, NULL),
(2, 'PO-1042', 7, '200 pairs', 200.00, 'normal', 'rejected', 8, '2026-11-17 00:31:37', NULL, NULL, 'REQ-2026111617313693', NULL, NULL),
(3, 'PO-1043', 4, '5 meters', 5.00, 'normal', 'issued', 9, '2026-11-17 00:35:36', '2026-11-17 00:36:19', NULL, 'REQ-2026111617353695', 5.00, 5.00),
(4, 'PO-1043', 6, '20 meters', 20.00, 'normal', 'issued', 11, '2026-11-17 15:03:33', '2026-11-17 15:20:55', NULL, 'REQ-2026111708033351', 20.00, 20.00);

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `type` enum('warning','success','done','info','qc') NOT NULL,
  `message` varchar(255) NOT NULL,
  `order_id` varchar(10) DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `type`, `message`, `order_id`, `is_read`, `created_at`) VALUES
(1, 'info', 'Costing for PO-1042 sent to Team 5 — Finance', 'PO-1042', 0, '2026-11-10 12:56:48'),
(2, 'info', 'Costing for PO-1043 sent to Team 5 — Finance', 'PO-1043', 0, '2026-11-15 20:30:32'),
(3, 'warning', 'Material request #1 for PO-1043 was cancelled', 'PO-1043', 0, '2026-11-17 00:31:29'),
(4, 'warning', 'Material request #2 for PO-1042 was cancelled', 'PO-1042', 0, '2026-11-17 00:35:21'),
(5, 'info', 'Inventory approved 5 of Black Leather for PO-1043 — you can accept it in Material issuance once Inventory marks it Out for Delivery', 'PO-1043', 0, '2026-11-17 00:36:12'),
(6, 'success', 'Received 5 of Black Leather from Inventory for PO-1043 — added to Materials inventory', 'PO-1043', 0, '2026-11-17 00:36:19'),
(7, 'info', 'Costing for PO-1044 sent to Team 5 — Finance', 'PO-1044', 0, '2026-11-17 01:30:16'),
(8, 'info', 'Inventory approved 20 of PU Leather for PO-1043 — you can accept it in Material issuance once Inventory marks it Out for Delivery', 'PO-1043', 0, '2026-11-17 15:05:35'),
(9, 'success', 'Received 20 of PU Leather from Inventory for PO-1043 — added to Materials inventory', 'PO-1043', 0, '2026-11-17 15:20:55');

-- --------------------------------------------------------

--
-- Table structure for table `production_costing`
--

CREATE TABLE `production_costing` (
  `costing_id` int(11) NOT NULL,
  `order_id` varchar(10) NOT NULL,
  `materials_cost` decimal(12,2) NOT NULL DEFAULT 0.00,
  `labor_cost` decimal(12,2) NOT NULL DEFAULT 0.00,
  `overhead_cost` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total_cost` decimal(12,2) NOT NULL DEFAULT 0.00,
  `sent_to_finance` tinyint(1) NOT NULL DEFAULT 0,
  `calculated_at` datetime DEFAULT current_timestamp(),
  `sent_at` datetime DEFAULT NULL,
  `finance_transaction_id` int(11) DEFAULT NULL COMMENT 'financial_transactions.transaction_id once Finance recorded it',
  `finance_status` varchar(30) DEFAULT NULL COMMENT 'Finance transaction status, e.g. Completed'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `production_costing`
--

INSERT INTO `production_costing` (`costing_id`, `order_id`, `materials_cost`, `labor_cost`, `overhead_cost`, `total_cost`, `sent_to_finance`, `calculated_at`, `sent_at`, `finance_transaction_id`, `finance_status`) VALUES
(1, 'PO-1042', 23063.00, 1000.00, 1000.00, 25063.00, 1, '2026-11-10 12:56:45', '2026-11-10 12:56:48', 107, 'Completed'),
(2, 'PO-1043', 23063.00, 100.00, 1000.00, 24163.00, 1, '2026-11-15 20:30:29', '2026-11-15 20:30:32', 106, 'Completed'),
(3, 'PO-1044', 733.00, 100.00, 100.00, 933.00, 1, '2026-11-17 01:30:13', '2026-11-17 01:30:16', 105, 'Completed');

-- --------------------------------------------------------

--
-- Table structure for table `production_login_attempts`
--

CREATE TABLE `production_login_attempts` (
  `id` int(11) NOT NULL,
  `username` varchar(100) NOT NULL,
  `ip` varchar(64) NOT NULL,
  `attempted_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `production_material_stock`
--

CREATE TABLE `production_material_stock` (
  `item_id` int(11) NOT NULL COMMENT 'FK -> items.id (inventory Raw Material)',
  `quantity` decimal(12,2) NOT NULL DEFAULT 0.00,
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `production_material_stock`
--

INSERT INTO `production_material_stock` (`item_id`, `quantity`, `updated_at`) VALUES
(4, 5.00, '2026-11-17 00:36:19'),
(6, 20.00, '2026-11-17 15:20:55');

-- --------------------------------------------------------

--
-- Table structure for table `production_monitoring`
--

CREATE TABLE `production_monitoring` (
  `monitoring_id` int(11) NOT NULL,
  `order_id` varchar(10) NOT NULL,
  `progress_percent` tinyint(4) NOT NULL DEFAULT 0,
  `updated_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `production_monitoring`
--

INSERT INTO `production_monitoring` (`monitoring_id`, `order_id`, `progress_percent`, `updated_at`) VALUES
(1, 'PO-1042', 10, '2026-11-10 12:56:06'),
(2, 'PO-1043', 10, '2026-11-15 20:30:17'),
(3, 'PO-1044', 10, '2026-11-17 01:30:03');

-- --------------------------------------------------------

--
-- Table structure for table `production_orders`
--

CREATE TABLE `production_orders` (
  `order_id` varchar(10) NOT NULL COMMENT 'e.g. PO-1042',
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `shoe_size_cm` decimal(3,1) DEFAULT NULL COMMENT 'shoe size in centimetres, e.g. 26.5',
  `start_date` date NOT NULL,
  `priority` enum('normal','urgent') NOT NULL DEFAULT 'normal',
  `status` enum('planning','materials','production','quality_check','completed') NOT NULL DEFAULT 'planning',
  `eta_label` varchar(30) DEFAULT NULL COMMENT 'e.g. "3 days" — free-text estimate from the New Order form',
  `created_at` datetime DEFAULT current_timestamp(),
  `request_id` int(11) DEFAULT NULL,
  `delivered_on_approval` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `production_orders`
--

INSERT INTO `production_orders` (`order_id`, `product_id`, `quantity`, `shoe_size_cm`, `start_date`, `priority`, `status`, `eta_label`, `created_at`, `request_id`, `delivered_on_approval`) VALUES
('PO-1042', 1, 50, 25.0, '2026-11-10', 'normal', 'planning', '3 days', '2026-11-10 12:56:06', NULL, 0),
('PO-1043', 2, 50, 25.5, '2026-11-15', 'normal', 'planning', '3 days', '2026-11-15 20:30:17', NULL, 0),
('PO-1044', 4, 2, 23.0, '2026-11-17', 'normal', 'planning', '2 days', '2026-11-17 01:30:03', NULL, 0);

-- --------------------------------------------------------

--
-- Table structure for table `production_users`
--

CREATE TABLE `production_users` (
  `id` int(11) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('production_staff','production_supervisor') NOT NULL DEFAULT 'production_staff',
  `status` enum('Active','Inactive') NOT NULL DEFAULT 'Active',
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `production_users`
--

INSERT INTO `production_users` (`id`, `full_name`, `username`, `email`, `password`, `role`, `status`, `created_at`) VALUES
(1, 'Production Supervisor', 'supervisor', 'supervisor@team3.local', '$2y$10$KijKjeXORIZhQjVpyLrpPOliZCENkgsDfjd1O98GAPTfAy9IYOarO', 'production_supervisor', 'Active', '2026-11-10 12:54:40'),
(2, 'Production Staff', 'staff', 'staff@team3.local', '$2y$10$Hyb5t8jBwsNPG4tFLozju.6uvuUQWHhHQK13EOjS3REc0x7x4THRm', 'production_staff', 'Active', '2026-11-10 12:54:40'),
(7, 'Production Supervisor', 'productionsupervisor@gmail.com', 'productionsupervisor@gmail.com', '$2y$10$MRUpzBQNvlVEWnZ1h35oquzDc.KWg.4DRxKvGcbFjzcArSdo8OHaq', 'production_supervisor', 'Active', '2026-11-16 23:08:55');

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `product_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL COMMENT 'FK -> items.id (inventory Finished Good)',
  `product_name` varchar(100) NOT NULL,
  `unit_of_measure` varchar(20) NOT NULL DEFAULT 'pairs'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`product_id`, `item_id`, `product_name`, `unit_of_measure`) VALUES
(1, 1, 'Full-Grain Leather', 'pairs'),
(2, 2, 'Black Leather', 'pairs'),
(4, 17, 'Quick Step Classic Low', 'pairs'),
(5, 18, 'Quick Step Street Runner', 'pairs'),
(6, 19, 'Quick Step Court Flex', 'pairs'),
(7, 20, 'Quick Step Urban Walk', 'pairs');

-- --------------------------------------------------------

--
-- Table structure for table `quality_checks`
--

CREATE TABLE `quality_checks` (
  `qc_id` int(11) NOT NULL,
  `order_id` varchar(10) NOT NULL,
  `produced_qty` int(11) NOT NULL,
  `accepted_qty` int(11) DEFAULT NULL,
  `rejected_qty` int(11) DEFAULT NULL,
  `status` enum('pending_review','reviewed') NOT NULL DEFAULT 'pending_review',
  `reviewed_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `requests`
--

CREATE TABLE `requests` (
  `id` int(11) NOT NULL,
  `request_number` varchar(50) NOT NULL,
  `requester_team` varchar(50) NOT NULL DEFAULT '',
  `destination` varchar(50) NOT NULL DEFAULT '',
  `status` varchar(30) NOT NULL DEFAULT 'Pending',
  `delivery_status` varchar(30) DEFAULT NULL,
  `expected_days` varchar(50) DEFAULT NULL,
  `expected_date` date DEFAULT NULL,
  `recipient_name` varchar(255) DEFAULT NULL,
  `recipient_gmail` varchar(150) DEFAULT NULL,
  `remarks` text DEFAULT NULL,
  `po_number` varchar(100) DEFAULT NULL,
  `request_date` date DEFAULT NULL,
  `expected_receive_date` date DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `synced_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `requests`
--

INSERT INTO `requests` (`id`, `request_number`, `requester_team`, `destination`, `status`, `delivery_status`, `expected_days`, `expected_date`, `recipient_name`, `recipient_gmail`, `remarks`, `po_number`, `request_date`, `expected_receive_date`, `approved_at`, `created_at`, `synced_at`) VALUES
(1, 'REQ-2026111418595560', 'Inventory', 'Production', 'Approved', 'Delivered', '5-7 days', NULL, 'Andrew', 'andrewsuficiencia09@gmail.com', '', 'PO-1042', '2026-11-15', NULL, '2026-11-15 02:00:09', '2026-11-15 01:59:55', '2026-11-17 18:21:53'),
(2, 'REQ-2026111419032211', 'Production', 'Production', 'Approved', 'Delivered', '2-3 days', '2026-11-15', 'TEAM 3', 'team3production@gmail.com', 'Production PO-1042 — material request | Size: 29 cm (by Production Staff) | Email: team3production@gmail.com', 'PO-1042', '2026-11-15', '2026-11-15', '2026-11-15 02:03:45', '2026-11-15 02:03:22', '2026-11-17 18:21:53'),
(3, 'REQ-2026111419032236', 'Production', 'Production', 'Approved', 'Delivered', '2-3 days', '2026-11-15', 'TEAM 3', 'team3production@gmail.com', 'Production PO-1042 — material request | Size: 29 cm (by Production Staff) | Email: team3production@gmail.com', 'PO-1042', '2026-11-15', '2026-11-15', '2026-11-15 02:03:41', '2026-11-15 02:03:22', '2026-11-17 18:21:53'),
(4, 'REQ-2026111419032298', 'Production', 'Production', 'Approved', 'Delivered', '2-3 days', '2026-11-15', 'TEAM 3', 'team3production@gmail.com', 'Production PO-1042 — material request | Size: 29 cm (by Production Staff) | Email: team3production@gmail.com', 'PO-1042', '2026-11-15', '2026-11-15', '2026-11-15 02:03:37', '2026-11-15 02:03:22', '2026-11-17 18:21:53'),
(5, 'REQ-2026111419032232', 'Production', 'Production', 'Approved', 'Delivered', '2-3 days', '2026-11-15', 'TEAM 3', 'team3production@gmail.com', 'Production PO-1042 — material request | Size: 29 cm (by Production Staff) | Email: team3production@gmail.com', 'PO-1042', '2026-11-15', '2026-11-15', '2026-11-15 02:03:33', '2026-11-15 02:03:22', '2026-11-17 18:21:53'),
(6, 'REQ-2026111419032235', 'Production', 'Production', 'Approved', 'Delivered', '2-3 days', '2026-11-15', 'TEAM 3', 'team3production@gmail.com', 'Production PO-1042 — material request | Size: 29 cm (by Production Staff) | Email: team3production@gmail.com', 'PO-1042', '2026-11-15', '2026-11-15', '2026-11-15 02:03:30', '2026-11-15 02:03:22', '2026-11-17 18:21:53'),
(11, 'REQ-2026111708033351', 'Production', 'Production', 'Approved', 'Delivered', '2-3 days', '2026-11-17', 'TEAM 3', 'team3production@gmail.com', 'Production PO-1043 — material request | Size: 25.5 cm (by Production Supervisor) | Email: team3production@gmail.com', 'PO-1043', '2026-11-17', '2026-11-17', '2026-11-17 15:05:18', '2026-11-17 15:03:33', '2026-11-17 18:21:53');

-- --------------------------------------------------------

--
-- Table structure for table `request_items`
--

CREATE TABLE `request_items` (
  `id` int(11) NOT NULL,
  `request_id` int(11) NOT NULL,
  `item_id` int(11) DEFAULT NULL,
  `item_name` varchar(150) NOT NULL DEFAULT '',
  `size` varchar(30) NOT NULL DEFAULT '',
  `unit` varchar(30) NOT NULL DEFAULT 'pcs',
  `quantity` decimal(12,2) NOT NULL DEFAULT 0.00,
  `approved_quantity` decimal(12,2) NOT NULL DEFAULT 0.00,
  `delivered_quantity` decimal(12,2) NOT NULL DEFAULT 0.00,
  `accepted_quantity` decimal(12,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `request_items`
--

INSERT INTO `request_items` (`id`, `request_id`, `item_id`, `item_name`, `size`, `unit`, `quantity`, `approved_quantity`, `delivered_quantity`, `accepted_quantity`) VALUES
(1, 1, 42, 'Quick Step Street Runner', '29', 'pairs', 5.00, 5.00, 5.00, 5.00),
(2, 2, 8, 'EVA Foam Sheets', '', 'pairs', 5.00, 5.00, 5.00, 5.00),
(3, 3, 1, 'Full-Grain Leather', '', 'square feet', 5.00, 5.00, 5.00, 5.00),
(4, 4, 7, 'Rubber Sole', '', 'pairs', 5.00, 5.00, 5.00, 5.00),
(5, 5, 16, 'Shoe Adhesive', '', 'liters', 5.00, 5.00, 5.00, 5.00),
(6, 6, 12, 'Shoelaces', '', 'pieces', 5.00, 5.00, 5.00, 5.00),
(11, 11, 6, 'PU Leather', '', 'meters', 20.00, 20.00, 20.00, 20.00);

-- --------------------------------------------------------

--
-- Table structure for table `warehouses`
--

CREATE TABLE `warehouses` (
  `id` int(11) NOT NULL,
  `warehouse_name` varchar(100) NOT NULL DEFAULT '',
  `location` varchar(150) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `warehouses`
--

INSERT INTO `warehouses` (`id`, `warehouse_name`, `location`) VALUES
(1, 'Main Warehouse', 'Main Storage'),
(2, 'Secondary Warehouse', 'Secondary Storage');

-- --------------------------------------------------------

--
-- Structure for view `delivery_finished_goods`
--
DROP TABLE IF EXISTS `delivery_finished_goods`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `delivery_finished_goods`  AS SELECT `qc`.`order_id` AS `order_id`, convert(`i`.`item_code` using utf8mb4) FROM (((`quality_checks` `qc` join `production_orders` `po` on(`po`.`order_id` = `qc`.`order_id`)) join `products` `p` on(`p`.`product_id` = `po`.`product_id`)) join `items` `i` on(`i`.`id` = `p`.`item_id`)) WHERE `qc`.`status` = 'pending_review'union all select `fg`.`order_id` AS `order_id`,convert(`fg`.`item_code` using utf8mb4) collate utf8mb4_unicode_ci AS `CONVERT(fg.item_code USING utf8mb4) COLLATE utf8mb4_unicode_ci`,convert(`p`.`product_name` using utf8mb4) collate utf8mb4_unicode_ci AS `CONVERT(p.product_name USING utf8mb4) COLLATE utf8mb4_unicode_ci`,`fg`.`produced_qty` AS `produced_qty`,`fg`.`accepted_qty` AS `accepted_qty`,`fg`.`rejected_qty` AS `rejected_qty`,case `fg`.`status` when 'sent_to_inventory' then 'delivered' else 'awaiting' end AS `Name_exp_7`,`fg`.`sent_at` AS `sent_at`,1 AS `1`,`fg`.`fg_id` AS `fg_id` from (`finished_goods` `fg` join `products` `p` on(`p`.`product_id` = `fg`.`product_id`))  ;

-- --------------------------------------------------------

--
-- Structure for view `delivery_raw_materials`
--
DROP TABLE IF EXISTS `delivery_raw_materials`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `delivery_raw_materials`  AS SELECT `mr`.`request_id` AS `request_id`, `mr`.`order_id` AS `order_id`, `i`.`item_name` AS `material`, `mr`.`quantity` AS `quantity`, `mr`.`priority` AS `priority`, `mr`.`requested_at` AS `requested_at`, `mr`.`issued_at` AS `issued_at`, `mr`.`status` AS `delivery_status` FROM (`material_requests` `mr` join `items` `i` on(`i`.`id` = `mr`.`material_id`)) ;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `activity_log`
--
ALTER TABLE `activity_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_activity_user` (`user_id`),
  ADD KEY `fk_activity_order` (`order_id`);

--
-- Indexes for table `bill_of_materials`
--
ALTER TABLE `bill_of_materials`
  ADD PRIMARY KEY (`bom_id`),
  ADD UNIQUE KEY `uq_bom_product_material` (`product_id`,`material_id`),
  ADD KEY `fk_bom_product` (`product_id`),
  ADD KEY `fk_bom_material` (`material_id`);

--
-- Indexes for table `checklist_items`
--
ALTER TABLE `checklist_items`
  ADD PRIMARY KEY (`order_id`,`material_id`),
  ADD KEY `fk_checklist_material` (`material_id`);

--
-- Indexes for table `finished_goods`
--
ALTER TABLE `finished_goods`
  ADD PRIMARY KEY (`fg_id`),
  ADD UNIQUE KEY `uq_fg_order` (`order_id`),
  ADD KEY `fk_fg_order` (`order_id`),
  ADD KEY `fk_fg_product` (`product_id`);

--
-- Indexes for table `items`
--
ALTER TABLE `items`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_items_code` (`item_code`);

--
-- Indexes for table `material_costs`
--
ALTER TABLE `material_costs`
  ADD PRIMARY KEY (`item_id`);

--
-- Indexes for table `material_requests`
--
ALTER TABLE `material_requests`
  ADD PRIMARY KEY (`request_id`),
  ADD KEY `fk_reqs_order` (`order_id`),
  ADD KEY `fk_reqs_material` (`material_id`),
  ADD KEY `fk_reqs_inv_request` (`inventory_request_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_notif_order` (`order_id`);

--
-- Indexes for table `production_costing`
--
ALTER TABLE `production_costing`
  ADD PRIMARY KEY (`costing_id`),
  ADD KEY `fk_costing_order` (`order_id`);

--
-- Indexes for table `production_login_attempts`
--
ALTER TABLE `production_login_attempts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ix_login_user` (`username`,`attempted_at`),
  ADD KEY `ix_login_ip` (`ip`,`attempted_at`);

--
-- Indexes for table `production_material_stock`
--
ALTER TABLE `production_material_stock`
  ADD PRIMARY KEY (`item_id`);

--
-- Indexes for table `production_monitoring`
--
ALTER TABLE `production_monitoring`
  ADD PRIMARY KEY (`monitoring_id`),
  ADD UNIQUE KEY `uq_monitoring_order` (`order_id`);

--
-- Indexes for table `production_orders`
--
ALTER TABLE `production_orders`
  ADD PRIMARY KEY (`order_id`),
  ADD KEY `fk_orders_product` (`product_id`);

--
-- Indexes for table `production_users`
--
ALTER TABLE `production_users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_pusers_username` (`username`),
  ADD UNIQUE KEY `uq_pusers_email` (`email`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`product_id`),
  ADD UNIQUE KEY `uq_products_item` (`item_id`);

--
-- Indexes for table `quality_checks`
--
ALTER TABLE `quality_checks`
  ADD PRIMARY KEY (`qc_id`),
  ADD UNIQUE KEY `uq_qc_order` (`order_id`);

--
-- Indexes for table `requests`
--
ALTER TABLE `requests`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_requests_number` (`request_number`),
  ADD KEY `ix_requests_status` (`status`);

--
-- Indexes for table `request_items`
--
ALTER TABLE `request_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ix_ri_request` (`request_id`),
  ADD KEY `ix_ri_item` (`item_id`);

--
-- Indexes for table `warehouses`
--
ALTER TABLE `warehouses`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `activity_log`
--
ALTER TABLE `activity_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `bill_of_materials`
--
ALTER TABLE `bill_of_materials`
  MODIFY `bom_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

--
-- AUTO_INCREMENT for table `finished_goods`
--
ALTER TABLE `finished_goods`
  MODIFY `fg_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `material_requests`
--
ALTER TABLE `material_requests`
  MODIFY `request_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `production_costing`
--
ALTER TABLE `production_costing`
  MODIFY `costing_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `production_login_attempts`
--
ALTER TABLE `production_login_attempts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `production_monitoring`
--
ALTER TABLE `production_monitoring`
  MODIFY `monitoring_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `production_users`
--
ALTER TABLE `production_users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `product_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `quality_checks`
--
ALTER TABLE `quality_checks`
  MODIFY `qc_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `activity_log`
--
ALTER TABLE `activity_log`
  ADD CONSTRAINT `fk_activity_order` FOREIGN KEY (`order_id`) REFERENCES `production_orders` (`order_id`) ON DELETE SET NULL;

--
-- Constraints for table `bill_of_materials`
--
ALTER TABLE `bill_of_materials`
  ADD CONSTRAINT `fk_bom_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`);

--
-- Constraints for table `checklist_items`
--
ALTER TABLE `checklist_items`
  ADD CONSTRAINT `fk_checklist_order` FOREIGN KEY (`order_id`) REFERENCES `production_orders` (`order_id`);

--
-- Constraints for table `finished_goods`
--
ALTER TABLE `finished_goods`
  ADD CONSTRAINT `fk_fg_order` FOREIGN KEY (`order_id`) REFERENCES `production_orders` (`order_id`),
  ADD CONSTRAINT `fk_fg_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`);

--
-- Constraints for table `material_requests`
--
ALTER TABLE `material_requests`
  ADD CONSTRAINT `fk_reqs_order` FOREIGN KEY (`order_id`) REFERENCES `production_orders` (`order_id`);

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `fk_notif_order` FOREIGN KEY (`order_id`) REFERENCES `production_orders` (`order_id`);

--
-- Constraints for table `production_costing`
--
ALTER TABLE `production_costing`
  ADD CONSTRAINT `fk_costing_order` FOREIGN KEY (`order_id`) REFERENCES `production_orders` (`order_id`);

--
-- Constraints for table `production_monitoring`
--
ALTER TABLE `production_monitoring`
  ADD CONSTRAINT `fk_monitoring_order` FOREIGN KEY (`order_id`) REFERENCES `production_orders` (`order_id`);

--
-- Constraints for table `production_orders`
--
ALTER TABLE `production_orders`
  ADD CONSTRAINT `fk_orders_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`);

--
-- Constraints for table `quality_checks`
--
ALTER TABLE `quality_checks`
  ADD CONSTRAINT `fk_qc_order` FOREIGN KEY (`order_id`) REFERENCES `production_orders` (`order_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
