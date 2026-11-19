-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 18, 2026 at 11:46 PM
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
-- Database: `uniprocur2`
--

-- --------------------------------------------------------

--
-- Table structure for table `buyer_invoice_demo_approvals`
--

CREATE TABLE `buyer_invoice_demo_approvals` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `invoice_id` int(11) NOT NULL,
  `po_id` int(11) NOT NULL,
  `buyer_id` int(11) NOT NULL,
  `gr_receipt_count` int(10) UNSIGNED NOT NULL,
  `po_total_pre_vat` decimal(12,2) NOT NULL,
  `invoice_total_pre_vat` decimal(12,2) NOT NULL,
  `result` varchar(32) NOT NULL DEFAULT 'demo_ready',
  `verified_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `buyer_invoice_demo_approvals`
--

INSERT INTO `buyer_invoice_demo_approvals` (`id`, `invoice_id`, `po_id`, `buyer_id`, `gr_receipt_count`, `po_total_pre_vat`, `invoice_total_pre_vat`, `result`, `verified_at`) VALUES
(1, 1, 4, 1, 2, 2350.00, 2350.00, 'demo_ready', '2026-11-12 17:46:04'),
(2, 2, 7, 1, 1, 250.00, 250.00, 'demo_ready', '2026-11-16 17:12:14'),
(3, 3, 8, 1, 1, 2650.00, 2650.00, 'demo_ready', '2026-11-17 14:02:21'),
(4, 5, 9, 1, 1, 12500.00, 12500.00, 'demo_ready', '2026-11-17 16:05:27');

-- --------------------------------------------------------

--
-- Table structure for table `buyer_invoice_source_local`
--

CREATE TABLE `buyer_invoice_source_local` (
  `invoice_id` int(11) NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `supplier_invoice_reference` varchar(80) NOT NULL,
  `source_kind` varchar(20) NOT NULL DEFAULT 'demo',
  `source_notes` varchar(255) NOT NULL DEFAULT '',
  `document_checked` tinyint(1) NOT NULL DEFAULT 0,
  `match_status` varchar(24) NOT NULL DEFAULT 'unverified',
  `match_summary` varchar(500) NOT NULL DEFAULT '',
  `verified_at` datetime DEFAULT NULL,
  `verified_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `buyer_invoice_source_local`
--

INSERT INTO `buyer_invoice_source_local` (`invoice_id`, `supplier_id`, `supplier_invoice_reference`, `source_kind`, `source_notes`, `document_checked`, `match_status`, `match_summary`, `verified_at`, `verified_by`, `created_at`) VALUES
(1, 1, 'DEMO-SUP-0004', 'demo', '', 0, 'demo_ready', 'CLASSROOM SIMULATION ONLY: PO, actual local GR and demo invoice numbers match. No genuine supplier document verified; never post this record to real Finance.', '2026-11-13 01:46:04', 1, '2026-11-12 12:43:35'),
(2, 4, 'DEMO-SUP-001', 'demo', '', 0, 'demo_ready', 'CLASSROOM SIMULATION ONLY: data matched; not eligible for real Finance posting', '2026-11-17 01:12:24', 1, '2026-11-16 17:12:02'),
(3, 4, 'SIM-PO-2026-0008', 'demo', 'DEFENSE_SIM_V8:', 0, 'demo_ready', 'CLASSROOM SIMULATION ONLY: PO, actual local GR and demo invoice numbers match. No genuine supplier document verified; never post this record to real Finance.', '2026-11-17 22:02:21', 1, '2026-11-17 14:02:20'),
(4, 4, '123', 'supplier_document', '', 1, 'unverified', '', NULL, NULL, '2026-11-17 14:03:19'),
(5, 4, 'SIM-PO-2026-0009', 'demo', 'DEFENSE_SIM_V8:', 0, 'demo_ready', 'CLASSROOM SIMULATION ONLY: PO, actual local GR and demo invoice numbers match. No genuine supplier document verified; never post this record to real Finance.', '2026-11-18 00:05:27', 1, '2026-11-17 16:05:25'),
(6, 4, '234', 'supplier_document', '', 1, 'matched', '3-way match passed; manually checked supplier document', '2026-11-18 01:06:36', 1, '2026-11-17 17:06:35'),
(8, 4, '1234', 'supplier_document', '', 1, 'unverified', '', NULL, NULL, '2026-11-18 16:23:10'),
(10, 4, '12345', 'supplier_document', '12345', 1, 'matched', '3-way match passed; manually checked supplier document', '2026-11-19 05:01:43', 1, '2026-11-18 20:23:07'),
(11, 4, '123456789', 'supplier_document', '', 1, 'matched', '3-way match passed; manually checked supplier document', '2026-11-19 06:18:21', 1, '2026-11-18 22:06:52'),
(12, 4, '123456', 'supplier_document', '', 1, 'matched', '3-way match passed; manually checked supplier document', '2026-11-19 06:32:49', 1, '2026-11-18 22:32:49'),
(13, 1, '1234567', 'supplier_document', '', 1, 'matched', '3-way match passed; manually checked supplier document', '2026-11-19 06:41:11', 1, '2026-11-18 22:41:11');

-- --------------------------------------------------------

--
-- Table structure for table `buyer_settings`
--

CREATE TABLE `buyer_settings` (
  `buyer_id` int(11) NOT NULL,
  `contact_number` varchar(32) NOT NULL DEFAULT '',
  `notify_pr` tinyint(1) NOT NULL DEFAULT 1,
  `notify_rfq` tinyint(1) NOT NULL DEFAULT 1,
  `notify_po` tinyint(1) NOT NULL DEFAULT 1,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `finance_procurement_invoice_inbox`
--

CREATE TABLE `finance_procurement_invoice_inbox` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `request_ref` char(32) NOT NULL,
  `request_version` int(10) UNSIGNED NOT NULL,
  `snapshot_sha256` char(64) NOT NULL,
  `invoice_number` varchar(64) NOT NULL,
  `supplier_invoice_reference` varchar(100) NOT NULL,
  `po_number` varchar(50) NOT NULL,
  `supplier_name` varchar(120) NOT NULL,
  `amount_pre_vat` decimal(14,2) NOT NULL,
  `due_date` date NOT NULL,
  `received_by` varchar(100) NOT NULL,
  `ack_state` enum('local_received','acknowledged') NOT NULL DEFAULT 'local_received',
  `received_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `acknowledged_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `inventory_request_pr_links`
--

CREATE TABLE `inventory_request_pr_links` (
  `id` int(11) NOT NULL,
  `inventory_request_number` varchar(80) NOT NULL,
  `pr_id` int(11) NOT NULL,
  `buyer_id` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `inventory_request_pr_links`
--

INSERT INTO `inventory_request_pr_links` (`id`, `inventory_request_number`, `pr_id`, `buyer_id`, `created_at`) VALUES
(1, 'REQ-2026111120314593', 28, 1, '2026-11-12 04:23:30'),
(2, 'REQ-2026111512435464', 37, 1, '2026-11-15 19:44:22'),
(3, 'REQ-2026111512452028', 38, 1, '2026-11-15 19:45:33'),
(4, 'REQ-2026111617500695', 44, 1, '2026-11-17 00:50:42'),
(5, 'REQ-2026111714562556', 45, 1, '2026-11-17 21:56:45'),
(6, 'REQ-2026111715103858', 46, 1, '2026-11-17 23:55:44'),
(7, 'REQ-2026111717221393', 47, 1, '2026-11-18 00:22:36'),
(8, 'REQ-2026111717345161', 48, 1, '2026-11-18 00:35:25'),
(9, 'REQ-2026111814193573', 49, 1, '2026-11-18 21:19:56'),
(10, 'REQ-2026111814370180', 50, 1, '2026-11-18 21:37:18'),
(11, 'REQ-2026111817172854', 51, 1, '2026-11-19 00:17:56'),
(12, 'REQ-2026111821040164', 52, 1, '2026-11-19 04:04:36'),
(13, 'REQ-2026111822361366', 53, 1, '2026-11-19 05:36:28'),
(14, 'REQ-2026111823283196', 54, 1, '2026-11-19 06:28:54'),
(15, 'REQ-2026111823341976', 55, 1, '2026-11-19 06:34:33');

-- --------------------------------------------------------

--
-- Table structure for table `invoices`
--

CREATE TABLE `invoices` (
  `id` int(11) NOT NULL,
  `invoice_number` varchar(30) NOT NULL,
  `po_id` int(11) NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `created_by` int(11) NOT NULL,
  `invoice_date` date NOT NULL,
  `due_date` date NOT NULL,
  `total_amount` decimal(12,2) NOT NULL,
  `status` varchar(20) DEFAULT 'pending_match',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `invoices`
--

INSERT INTO `invoices` (`id`, `invoice_number`, `po_id`, `supplier_id`, `created_by`, `invoice_date`, `due_date`, `total_amount`, `status`, `created_at`) VALUES
(1, 'INV-2026-0001', 4, 1, 1, '2026-11-12', '2026-12-12', 2350.00, 'ready_to_post', '2026-11-12 12:43:35'),
(2, 'INV-2026-0002', 7, 4, 1, '2026-11-17', '2026-12-17', 250.00, 'ready_to_post', '2026-11-16 17:12:02'),
(3, 'INV-2026-0003', 8, 4, 1, '2026-11-17', '2026-12-17', 2650.00, 'ready_to_post', '2026-11-17 14:02:20'),
(4, 'INV-2026-0004', 8, 4, 1, '2026-11-17', '2026-12-17', 2650.00, 'ready_to_post', '2026-11-17 14:03:19'),
(5, 'INV-2026-0005', 9, 4, 1, '2026-11-18', '2026-12-18', 12500.00, 'ready_to_post', '2026-11-17 16:05:25'),
(6, 'INV-2026-0006', 9, 4, 1, '2026-11-18', '2026-12-18', 12500.00, 'ready_to_post', '2026-11-17 17:06:35'),
(7, 'INV-2026-0007', 11, 4, 1, '2026-11-19', '2026-12-19', 4650.00, 'pending_match', '2026-11-18 16:21:33'),
(8, 'INV-2026-0008', 11, 4, 1, '2026-11-19', '2026-12-19', 2325.00, 'pending_match', '2026-11-18 16:23:10'),
(9, 'INV-2026-0009', 12, 4, 1, '2026-11-19', '2026-12-19', 4650.00, 'pending_match', '2026-11-18 20:22:54'),
(10, 'INV-2026-0010', 12, 4, 1, '2026-11-19', '2026-12-19', 4185.00, 'posted', '2026-11-18 20:23:07'),
(11, 'INV-2026-0011', 13, 4, 1, '2026-11-19', '2026-12-19', 1775.00, 'ready_to_post', '2026-11-18 22:06:52'),
(12, 'INV-2026-0012', 14, 4, 1, '2026-11-19', '2026-12-19', 16000.00, 'posted', '2026-11-18 22:32:49'),
(13, 'INV-2026-0013', 15, 1, 1, '2026-11-19', '2026-12-19', 9700.00, 'ready_to_post', '2026-11-18 22:41:11');

-- --------------------------------------------------------

--
-- Table structure for table `invoice_items`
--

CREATE TABLE `invoice_items` (
  `id` int(11) NOT NULL,
  `invoice_id` int(11) NOT NULL,
  `po_item_id` int(11) DEFAULT NULL,
  `item_name` varchar(200) NOT NULL,
  `unit` varchar(20) NOT NULL,
  `qty_billed` decimal(10,2) NOT NULL CHECK (`qty_billed` > 0),
  `unit_price` decimal(10,2) NOT NULL,
  `subtotal` decimal(12,2) GENERATED ALWAYS AS (`qty_billed` * `unit_price`) STORED
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `invoice_items`
--

INSERT INTO `invoice_items` (`id`, `invoice_id`, `po_item_id`, `item_name`, `unit`, `qty_billed`, `unit_price`) VALUES
(3, 1, 4, 'Black Leather', 'square feet', 10.00, 235.00),
(5, 2, 7, 'EVA Foam Sheets', 'pairs', 2.00, 125.00),
(6, 3, 8, 'Shoelaces', 'pieces', 100.00, 26.50),
(7, 4, 8, 'Shoelaces', 'pieces', 100.00, 26.50),
(8, 5, 9, 'EVA Foam Sheets', 'pairs', 100.00, 125.00),
(9, 6, 9, 'EVA Foam Sheets', 'pairs', 100.00, 125.00),
(10, 7, 11, 'Packaging Tape', 'rolls', 100.00, 46.50),
(13, 8, 11, 'Packaging Tape', 'rolls', 50.00, 46.50),
(14, 9, 12, 'Packaging Tape', 'rolls', 90.00, 46.50),
(23, 10, 12, 'Packaging Tape', 'rolls', 90.00, 46.50),
(27, 11, 13, 'Metal Buckles', 'pieces', 50.00, 35.50),
(28, 12, 14, 'Foam Insole', 'pairs', 50.00, 320.00),
(29, 13, 15, 'Canvas Fabric', 'meters', 100.00, 97.00);

-- --------------------------------------------------------

--
-- Table structure for table `manager_settings`
--

CREATE TABLE `manager_settings` (
  `user_id` int(11) NOT NULL,
  `contact_number` varchar(32) DEFAULT NULL,
  `notify_pr` tinyint(1) NOT NULL DEFAULT 1,
  `notify_rfq` tinyint(1) NOT NULL DEFAULT 1,
  `notify_deadline` tinyint(1) NOT NULL DEFAULT 0,
  `notify_po` tinyint(1) NOT NULL DEFAULT 1,
  `notify_daily` tinyint(1) NOT NULL DEFAULT 0,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `manager_settings`
--

INSERT INTO `manager_settings` (`user_id`, `contact_number`, `notify_pr`, `notify_rfq`, `notify_deadline`, `notify_po`, `notify_daily`, `updated_at`) VALUES
(2, NULL, 1, 1, 0, 1, 0, '2026-11-10 10:03:16');

-- --------------------------------------------------------

--
-- Table structure for table `po_demo_tracking`
--

CREATE TABLE `po_demo_tracking` (
  `po_id` int(11) NOT NULL,
  `issued_at` datetime NOT NULL,
  `confirmed_at` datetime DEFAULT NULL,
  `inventory_accepted_at` datetime DEFAULT NULL,
  `accepted_source` varchar(32) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `po_demo_tracking`
--

INSERT INTO `po_demo_tracking` (`po_id`, `issued_at`, `confirmed_at`, `inventory_accepted_at`, `accepted_source`) VALUES
(1, '2026-11-08 06:11:32', '2026-11-13 09:34:15', NULL, NULL),
(2, '2026-11-09 01:23:36', '2026-11-09 15:32:31', NULL, NULL),
(3, '2026-11-09 02:11:10', '2026-11-12 22:26:50', NULL, NULL),
(4, '2026-11-12 12:38:38', '2026-11-12 12:39:02', '2026-11-12 14:41:34', 'inventory_local_real'),
(5, '2026-11-13 22:05:10', '2026-11-13 22:10:11', NULL, NULL),
(7, '2026-11-17 00:56:00', '2026-11-17 00:56:38', NULL, NULL),
(8, '2026-11-17 21:58:57', '2026-11-17 21:59:14', NULL, NULL),
(9, '2026-11-18 00:02:42', '2026-11-18 00:03:14', NULL, NULL),
(10, '2026-11-18 01:04:42', '2026-11-18 01:05:02', NULL, NULL),
(11, '2026-11-19 00:19:51', '2026-11-19 00:20:51', NULL, NULL),
(12, '2026-11-19 04:06:17', '2026-11-19 04:06:52', NULL, NULL),
(13, '2026-11-19 05:38:16', '2026-11-19 05:38:44', NULL, NULL),
(14, '2026-11-19 06:30:45', '2026-11-19 06:30:59', NULL, NULL),
(15, '2026-11-19 06:36:29', '2026-11-19 06:36:46', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `po_items`
--

CREATE TABLE `po_items` (
  `id` int(11) NOT NULL,
  `po_id` int(11) NOT NULL,
  `supplier_item_id` int(11) DEFAULT NULL,
  `item_name` varchar(200) NOT NULL,
  `unit` varchar(20) NOT NULL,
  `qty_ordered` decimal(10,2) NOT NULL CHECK (`qty_ordered` > 0),
  `qty_received` decimal(10,2) DEFAULT 0.00,
  `unit_price` decimal(10,2) NOT NULL,
  `subtotal` decimal(12,2) GENERATED ALWAYS AS (`qty_ordered` * `unit_price`) STORED,
  `delivery_status` varchar(20) DEFAULT 'pending' CHECK (`delivery_status` in ('pending','partial','complete')),
  `updated_by` int(11) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `po_items`
--

INSERT INTO `po_items` (`id`, `po_id`, `supplier_item_id`, `item_name`, `unit`, `qty_ordered`, `qty_received`, `unit_price`, `delivery_status`, `updated_by`, `updated_at`) VALUES
(1, 1, 123, 'Tissue Paper Rolls', 'pieces', 165.00, 0.00, 0.86, 'pending', NULL, NULL),
(2, 2, 19, 'Canvas Fabric', 'meters', 100.00, 0.00, 97.00, 'pending', NULL, NULL),
(3, 3, 43, 'Mesh Fabric', 'meters', 100.00, 0.00, 127.00, 'pending', NULL, NULL),
(4, 4, 47, 'Black Leather', 'square feet', 10.00, 10.00, 235.00, 'pending', NULL, NULL),
(5, 5, 76, 'Metal Buckles', 'pieces', 100.00, 0.00, 35.00, 'pending', NULL, NULL),
(6, 6, 50, 'Black Leather', 'square feet', 31313.00, 0.00, 238.00, 'pending', NULL, NULL),
(7, 7, 57, 'EVA Foam Sheets', 'pairs', 2.00, 2.00, 125.00, 'complete', NULL, NULL),
(8, 8, 117, 'Shoelaces', 'pieces', 100.00, 100.00, 26.50, 'complete', NULL, NULL),
(9, 9, 57, 'EVA Foam Sheets', 'pairs', 100.00, 100.00, 125.00, 'complete', NULL, NULL),
(10, 10, 102, 'Shoe Adhesive', 'liters', 100.00, 0.00, 152.00, 'pending', NULL, NULL),
(11, 11, 92, 'Packaging Tape', 'rolls', 100.00, 100.00, 46.50, 'complete', NULL, NULL),
(12, 12, 92, 'Packaging Tape', 'rolls', 100.00, 90.00, 46.50, 'partial', NULL, NULL),
(13, 13, 79, 'Metal Buckles', 'pieces', 100.00, 50.00, 35.50, 'partial', NULL, NULL),
(14, 14, 63, 'Foam Insole', 'pairs', 100.00, 50.00, 320.00, 'partial', NULL, NULL),
(15, 15, 19, 'Canvas Fabric', 'meters', 100.00, 100.00, 97.00, 'complete', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `procurement_audit_logs`
--

CREATE TABLE `procurement_audit_logs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `event_time` datetime(6) NOT NULL,
  `actor_user_id` int(11) NOT NULL,
  `actor_name` varchar(120) NOT NULL,
  `actor_role` varchar(32) NOT NULL,
  `module_name` varchar(64) NOT NULL,
  `action_name` varchar(40) NOT NULL,
  `reference_number` varchar(70) NOT NULL,
  `description` varchar(500) NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `procurement_audit_logs`
--

INSERT INTO `procurement_audit_logs` (`id`, `event_time`, `actor_user_id`, `actor_name`, `actor_role`, `module_name`, `action_name`, `reference_number`, `description`, `ip_address`) VALUES
(1, '2026-11-10 16:20:14.554450', 1, 'Clark Almeda', 'buyer', 'Purchase Request', 'Submitted', 'PR-2026-0027', 'Purchase Request PR-2026-0027 submitted.', '::1'),
(2, '2026-11-12 12:37:25.192199', 1, 'Clark Almeda', 'buyer', 'RFQ', 'Submitted', 'RFQ-0028', 'RFQ RFQ-0028 created for PR-2026-0028.', '::1'),
(3, '2026-11-12 22:22:02.412367', 1, 'Clark Almeda', 'buyer', 'RFQ', 'Submitted', 'RFQ-0025', 'RFQ RFQ-0025 created for PR-2026-0025.', '::1'),
(4, '2026-11-13 14:41:28.572205', 1, 'Clark Almeda', 'buyer', 'Purchase Request', 'Submitted', 'PR-2026-0029', 'Purchase Request PR-2026-0029 submitted.', '::1'),
(5, '2026-11-13 15:21:14.613109', 1, 'Clark Almeda', 'buyer', 'Purchase Request', 'Submitted', 'PR-2026-0030', 'Purchase Request PR-2026-0030 submitted.', '::1'),
(6, '2026-11-13 15:32:40.388256', 1, 'Clark Almeda', 'buyer', 'RFQ', 'Submitted', 'RFQ-0030', 'RFQ RFQ-0030 created for PR-2026-0030.', '::1'),
(7, '2026-11-13 18:15:40.694124', 1, 'Clark Almeda', 'buyer', 'Purchase Request', 'Resubmitted', 'PR-2026-0026', 'Rejected PR resubmitted to Manager; the prior rejection is archived.', '::1'),
(8, '2026-11-13 18:20:44.255425', 1, 'Clark Almeda', 'buyer', 'Purchase Request', 'Resubmitted', 'PR-2026-0009', 'Rejected PR resubmitted to Manager; the prior rejection is archived.', '::1'),
(9, '2026-11-13 18:22:44.837102', 1, 'Clark Almeda', 'buyer', 'Purchase Request', 'Submitted', 'PR-2026-0031', 'Purchase Request PR-2026-0031 submitted.', '::1'),
(10, '2026-11-13 18:23:46.083442', 1, 'Clark Almeda', 'buyer', 'Purchase Request', 'Resubmitted', 'PR-2026-0031', 'Rejected PR resubmitted to Manager; the prior rejection is archived.', '::1'),
(11, '2026-11-13 18:24:45.936305', 1, 'Clark Almeda', 'buyer', 'Purchase Request', 'Resubmitted', 'PR-2026-0029', 'Rejected PR resubmitted to Manager; the prior rejection is archived.', '::1'),
(12, '2026-11-13 18:32:33.743588', 1, 'Clark Almeda', 'buyer', 'Purchase Request', 'Submitted', 'PR-2026-0032', 'Purchase Request PR-2026-0032 submitted.', '::1'),
(13, '2026-11-13 18:33:45.979357', 1, 'Clark Almeda', 'buyer', 'Purchase Request', 'Resubmitted', 'PR-2026-0032', 'Rejected PR resubmitted to Manager; the prior rejection is archived.', '::1'),
(14, '2026-11-13 18:42:57.740118', 1, 'Clark Almeda', 'buyer', 'Purchase Request', 'PR Archived', 'PR-2026-0032', 'Buyer removed rejected PR from active lists (soft delete). Original PR, items and Manager decisions retained for audit.', '::1'),
(15, '2026-11-13 18:50:41.813049', 1, 'Clark Almeda', 'buyer', 'Purchase Request', 'PR Archived', 'PR-2026-0008', 'Buyer removed rejected PR from active lists (soft delete). Original PR, items and Manager decisions retained for audit.', '::1'),
(16, '2026-11-13 19:16:04.315519', 1, 'Clark Almeda', 'buyer', 'Purchase Request', 'Submitted', 'PR-2026-0033', 'Purchase Request PR-2026-0033 submitted.', '::1'),
(17, '2026-11-13 21:26:18.139637', 1, 'Clark Almeda', 'buyer', 'RFQ', 'Submitted', 'RFQ-0033', 'RFQ RFQ-0033 created for PR-2026-0033.', '::1'),
(18, '2026-11-13 21:26:48.735572', 1, 'Clark Almeda', 'buyer', 'Purchase Request', 'Submitted', 'PR-2026-0034', 'Purchase Request PR-2026-0034 submitted.', '::1'),
(19, '2026-11-13 21:27:30.655460', 1, 'Clark Almeda', 'buyer', 'RFQ', 'Submitted', 'RFQ-0034', 'RFQ RFQ-0034 created for PR-2026-0034.', '::1'),
(20, '2026-11-15 00:23:48.677252', 1, 'Buyer', 'buyer', 'Purchase Request', 'Submitted', 'PR-2026-0035', 'Purchase Request PR-2026-0035 submitted.', '::1'),
(21, '2026-11-15 21:35:17.892286', 1, 'Buyer', 'buyer', 'Purchase Request', 'Submitted', 'PR-2026-0039', 'Purchase Request PR-2026-0039 submitted.', '::1'),
(22, '2026-11-15 22:04:38.777797', 1, 'Buyer', 'buyer', 'Purchase Request', 'Submitted', 'PR-2026-0040', 'Purchase Request PR-2026-0040 submitted.', '::1'),
(23, '2026-11-15 22:05:26.080727', 1, 'Buyer', 'buyer', 'RFQ', 'Submitted', 'RFQ-0040', 'RFQ RFQ-0040 created for PR-2026-0040.', '::1'),
(24, '2026-11-15 22:12:32.976136', 1, 'Buyer', 'buyer', 'Purchase Request', 'Submitted', 'PR-2026-0041', 'Purchase Request PR-2026-0041 submitted.', '::1'),
(25, '2026-11-15 22:15:50.216456', 1, 'Buyer', 'buyer', 'Purchase Request', 'Submitted', 'PR-2026-0042', 'Purchase Request PR-2026-0042 submitted.', '::1'),
(26, '2026-11-15 22:16:37.748410', 1, 'Buyer', 'buyer', 'RFQ', 'Submitted', 'RFQ-0042', 'RFQ RFQ-0042 created for PR-2026-0042.', '::1'),
(27, '2026-11-15 22:18:52.526514', 1, 'Buyer', 'buyer', 'Purchase Request', 'Submitted', 'PR-2026-0043', 'Purchase Request PR-2026-0043 submitted.', '::1'),
(28, '2026-11-15 22:19:33.798367', 1, 'Buyer', 'buyer', 'RFQ', 'Submitted', 'RFQ-0043', 'RFQ RFQ-0043 created for PR-2026-0043.', '::1'),
(29, '2026-11-17 00:50:50.073968', 1, 'Buyer', 'buyer', 'Purchase Request', 'Submitted', 'PR-2026-0044', 'Purchase Request PR-2026-0044 submitted.', '::1'),
(30, '2026-11-17 00:51:37.510761', 1, 'Buyer', 'buyer', 'RFQ', 'Submitted', 'RFQ-0044', 'RFQ RFQ-0044 created for PR-2026-0044.', '::1'),
(31, '2026-11-17 21:56:49.054450', 1, 'Buyer', 'buyer', 'Purchase Request', 'Submitted', 'PR-2026-0045', 'Purchase Request PR-2026-0045 submitted.', '::1'),
(32, '2026-11-17 21:57:21.609623', 1, 'Buyer', 'buyer', 'RFQ', 'Submitted', 'RFQ-0045', 'RFQ RFQ-0045 created for PR-2026-0045.', '::1'),
(33, '2026-11-17 23:55:46.277267', 1, 'Buyer', 'buyer', 'Purchase Request', 'Submitted', 'PR-2026-0046', 'Purchase Request PR-2026-0046 submitted.', '::1'),
(34, '2026-11-17 23:56:47.232131', 1, 'Buyer', 'buyer', 'RFQ', 'Submitted', 'RFQ-0046', 'RFQ RFQ-0046 created for PR-2026-0046.', '::1'),
(35, '2026-11-18 00:22:37.860349', 1, 'Buyer', 'buyer', 'Purchase Request', 'Submitted', 'PR-2026-0047', 'Purchase Request PR-2026-0047 submitted.', '::1'),
(36, '2026-11-18 00:25:11.871409', 1, 'Buyer', 'buyer', 'RFQ', 'Submitted', 'RFQ-0047', 'RFQ RFQ-0047 created for PR-2026-0047.', '::1'),
(37, '2026-11-18 00:35:28.648350', 1, 'Buyer', 'buyer', 'Purchase Request', 'Submitted', 'PR-2026-0048', 'Purchase Request PR-2026-0048 submitted.', '::1'),
(38, '2026-11-18 00:36:15.378151', 1, 'Buyer', 'buyer', 'RFQ', 'Submitted', 'RFQ-0048', 'RFQ RFQ-0048 created for PR-2026-0048.', '::1'),
(39, '2026-11-19 00:18:00.655532', 1, 'Buyer', 'buyer', 'Purchase Request', 'Submitted', 'PR-2026-0051', 'Purchase Request PR-2026-0051 submitted.', '::1'),
(40, '2026-11-19 00:18:46.199727', 1, 'Buyer', 'buyer', 'RFQ', 'Submitted', 'RFQ-0051', 'RFQ RFQ-0051 created for PR-2026-0051.', '::1'),
(41, '2026-11-19 04:04:38.594702', 1, 'Buyer', 'buyer', 'Purchase Request', 'Submitted', 'PR-2026-0052', 'Purchase Request PR-2026-0052 submitted.', '::1'),
(42, '2026-11-19 04:05:20.161374', 1, 'Buyer', 'buyer', 'RFQ', 'Submitted', 'RFQ-0052', 'RFQ RFQ-0052 created for PR-2026-0052.', '::1'),
(43, '2026-11-19 05:36:31.281523', 1, 'Buyer', 'buyer', 'Purchase Request', 'Submitted', 'PR-2026-0053', 'Purchase Request PR-2026-0053 submitted.', '::1'),
(44, '2026-11-19 05:37:10.424998', 1, 'Buyer', 'buyer', 'RFQ', 'Submitted', 'RFQ-0053', 'RFQ RFQ-0053 created for PR-2026-0053.', '::1'),
(45, '2026-11-19 06:28:58.442439', 1, 'Buyer', 'buyer', 'Purchase Request', 'Submitted', 'PR-2026-0054', 'Purchase Request PR-2026-0054 submitted.', '::1'),
(46, '2026-11-19 06:29:38.313693', 1, 'Buyer', 'buyer', 'RFQ', 'Submitted', 'RFQ-0054', 'RFQ RFQ-0054 created for PR-2026-0054.', '::1'),
(47, '2026-11-19 06:34:35.097908', 1, 'Buyer', 'buyer', 'Purchase Request', 'Submitted', 'PR-2026-0055', 'Purchase Request PR-2026-0055 submitted.', '::1'),
(48, '2026-11-19 06:35:23.621421', 1, 'Buyer', 'buyer', 'RFQ', 'Submitted', 'RFQ-0055', 'RFQ RFQ-0055 created for PR-2026-0055.', '::1');

-- --------------------------------------------------------

--
-- Table structure for table `procurement_buyer_notification_reads`
--

CREATE TABLE `procurement_buyer_notification_reads` (
  `buyer_id` int(11) NOT NULL,
  `event_key` varchar(120) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `read_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `procurement_buyer_notification_reads`
--

INSERT INTO `procurement_buyer_notification_reads` (`buyer_id`, `event_key`, `read_at`) VALUES
(1, 'gr:2', '2026-11-13 08:45:30'),
(1, 'gr:1', '2026-11-13 08:47:54'),
(1, 'fin:1', '2026-11-13 09:05:01'),
(1, 'podecision:2', '2026-11-13 09:34:24'),
(1, 'fin:7', '2026-11-17 00:55:49'),
(1, 'fin:8', '2026-11-17 21:58:47'),
(1, 'gr:4', '2026-11-19 03:31:09'),
(1, 'gmail:1a1f04eb246f400d', '2026-11-19 04:20:56');

-- --------------------------------------------------------

--
-- Table structure for table `procurement_finance_invoice_events`
--

CREATE TABLE `procurement_finance_invoice_events` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `handoff_id` bigint(20) UNSIGNED NOT NULL,
  `invoice_id` int(11) NOT NULL,
  `request_version` int(10) UNSIGNED NOT NULL,
  `event_kind` varchar(20) NOT NULL,
  `decision_reference` varchar(100) DEFAULT NULL,
  `actor_ref` varchar(100) NOT NULL,
  `note` varchar(500) NOT NULL DEFAULT '',
  `recorded_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `procurement_finance_invoice_events`
--

INSERT INTO `procurement_finance_invoice_events` (`id`, `handoff_id`, `invoice_id`, `request_version`, `event_kind`, `decision_reference`, `actor_ref`, `note`, `recorded_at`) VALUES
(1, 1, 4, 1, 'submitted', NULL, 'buyer:1', 'Verified local numerical 3-way match; buyer-declared document review. Tax and genuine documents require Finance review.', '2026-11-17 22:03:33'),
(2, 2, 5, 1, 'submitted', NULL, 'buyer:1', 'INTERNAL REFERENCE REVIEW ONLY: no genuine supplier invoice document. Never post to real Accounts Payable.', '2026-11-18 00:13:17'),
(3, 3, 6, 1, 'submitted', NULL, 'buyer:1', 'Verified local numerical 3-way match; buyer-declared document review. Tax and genuine documents require Finance review.', '2026-11-18 01:06:41'),
(4, 4, 10, 1, 'submitted', NULL, 'buyer:1', 'Verified local numerical 3-way match; buyer-declared document review. Tax and genuine documents require Finance review.', '2026-11-19 05:25:52'),
(5, 4, 10, 1, 'received', 'fin-ap-recv-1671307fb28ad30c01844e96e73a92ad-7251ed9f', 'finance-admin-5', 'Received by Finance AP inbox. No accounting entry, tax verification, or payment created.', '2026-11-19 05:26:21'),
(6, 4, 10, 1, 'posted', 'fin-ap-post-1671307fb28ad30c01844e96e73a92ad-8ed11b92', 'finance-admin-5', 'Posted to Finance accounting (accounts_payable AP-65, recorded as Unpaid). VAT 12.00% confirmed by Finance.', '2026-11-19 05:26:27'),
(7, 5, 12, 1, 'submitted', NULL, 'buyer:1', 'Verified local numerical 3-way match; buyer-declared document review. Tax and genuine documents require Finance review.', '2026-11-19 06:32:58'),
(8, 5, 12, 1, 'received', 'fin-ap-recv-ad348cb7faefba89efe327a57ce2d6ae-5f43f689', 'finance-admin-5', 'Received by Finance AP inbox. No accounting entry, tax verification, or payment created.', '2026-11-19 06:33:21'),
(9, 5, 12, 1, 'posted', 'fin-ap-post-ad348cb7faefba89efe327a57ce2d6ae-62522c02', 'finance-admin-5', 'Posted to Finance accounting (accounts_payable AP-66, recorded as Unpaid). VAT 12.00% confirmed by Finance.', '2026-11-19 06:33:22'),
(10, 6, 13, 1, 'submitted', NULL, 'buyer:1', 'Verified local numerical 3-way match; buyer-declared document review. Tax and genuine documents require Finance review.', '2026-11-19 06:41:26');

-- --------------------------------------------------------

--
-- Table structure for table `procurement_finance_invoice_handoffs`
--

CREATE TABLE `procurement_finance_invoice_handoffs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `invoice_id` int(11) NOT NULL,
  `invoice_number` varchar(64) NOT NULL,
  `po_id` int(11) NOT NULL,
  `buyer_id` int(11) NOT NULL,
  `request_ref` char(32) NOT NULL,
  `request_version` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `handoff_status` varchar(20) NOT NULL DEFAULT 'pending',
  `snapshot_sha256` char(64) NOT NULL,
  `snapshot_json` longtext NOT NULL,
  `submitted_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp(),
  `finance_reference` varchar(100) DEFAULT NULL,
  `finance_reviewer` varchar(100) DEFAULT NULL,
  `finance_note` varchar(500) DEFAULT NULL,
  `decision_reference` varchar(100) DEFAULT NULL,
  `decided_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `procurement_finance_invoice_handoffs`
--

INSERT INTO `procurement_finance_invoice_handoffs` (`id`, `invoice_id`, `invoice_number`, `po_id`, `buyer_id`, `request_ref`, `request_version`, `handoff_status`, `snapshot_sha256`, `snapshot_json`, `submitted_at`, `updated_at`, `finance_reference`, `finance_reviewer`, `finance_note`, `decision_reference`, `decided_at`) VALUES
(1, 4, 'INV-2026-0004', 8, 1, '703c47b97bf6a2bded4c619b214a0a64', 1, 'pending', '0b1aa1f27ffde2e48c645396d82364214e1ce96acda2ede8d52cc102de8b763f', '{\"invoice_number\":\"INV-2026-0004\",\"supplier_invoice_reference\":\"123\",\"po_number\":\"PO-2026-0008\",\"supplier\":{\"id\":4,\"name\":\"SoleTech Rubber Manufacturing\",\"payment_terms\":\"Net 30\"},\"invoice_date\":\"2026-11-17\",\"due_date\":\"2026-12-17\",\"amount_pre_vat\":\"2650.00\",\"tax_status\":\"NOT_VERIFIED_PRE_VAT_ONLY\",\"document_review\":\"BUYER_DECLARED_REVIEW_NOT_INDEPENDENT_DOCUMENT_AUTHENTICATION\",\"three_way_match\":\"RECHECKED_AGAINST_VERIFIED_INVENTORY_DR_SNAPSHOTS\",\"goods_receipts\":[{\"goods_receipt_number\":\"DR-20261117150201-17\",\"received_date\":\"2026-11-17\"}],\"items\":[{\"po_item_id\":8,\"item_name\":\"Shoelaces\",\"unit\":\"pieces\",\"ordered_qty\":\"100.00\",\"received_qty\":\"100.00\",\"billed_qty\":\"100.00\",\"unit_price_pre_vat\":\"26.50\",\"line_total_pre_vat\":\"2650.00\"}]}', '2026-11-17 22:03:33', '2026-11-17 22:03:33', NULL, NULL, NULL, NULL, NULL),
(2, 5, 'INV-2026-0005', 9, 1, '256b803dd55d3f6e2023d2999788272d', 1, 'pending', 'c166837e2a172b1e2f07a4ee2728187439ea2ff8521cd64440f4e70c17c3b8d5', '{\"invoice_number\":\"INV-2026-0005\",\"supplier_invoice_reference\":\"SIM-PO-2026-0009\",\"po_number\":\"PO-2026-0009\",\"supplier\":{\"id\":4,\"name\":\"SoleTech Rubber Manufacturing\",\"payment_terms\":\"Net 30\"},\"invoice_date\":\"2026-11-18\",\"due_date\":\"2026-12-18\",\"amount_pre_vat\":\"12500.00\",\"tax_status\":\"NOT_VERIFIED_PRE_VAT_ONLY\",\"document_review\":\"INTERNAL_REFERENCE_REVIEW_ONLY_NO_SUPPLIER_DOCUMENT\",\"three_way_match\":\"RECHECKED_AGAINST_VERIFIED_INVENTORY_DR_SNAPSHOTS\",\"goods_receipts\":[{\"goods_receipt_number\":\"DR-20261117170502-20\",\"received_date\":\"2026-11-18\"}],\"items\":[{\"po_item_id\":9,\"item_name\":\"EVA Foam Sheets\",\"unit\":\"pairs\",\"ordered_qty\":\"100.00\",\"received_qty\":\"100.00\",\"billed_qty\":\"100.00\",\"unit_price_pre_vat\":\"125.00\",\"line_total_pre_vat\":\"12500.00\"}],\"invoice_source_kind\":\"demo\",\"finance_posting_allowed\":false,\"review_only\":true}', '2026-11-18 00:13:17', '2026-11-18 00:13:17', NULL, NULL, NULL, NULL, NULL),
(3, 6, 'INV-2026-0006', 9, 1, 'd5a7a921f4c9bbd2aa82019963dbb828', 1, 'pending', '9b7429e9f63840edf916869b6f90af0eb5d60c0057271c1941406a311fd8c387', '{\"invoice_number\":\"INV-2026-0006\",\"supplier_invoice_reference\":\"234\",\"po_number\":\"PO-2026-0009\",\"supplier\":{\"id\":4,\"name\":\"SoleTech Rubber Manufacturing\",\"payment_terms\":\"Net 30\"},\"invoice_date\":\"2026-11-18\",\"due_date\":\"2026-12-18\",\"amount_pre_vat\":\"12500.00\",\"tax_status\":\"NOT_VERIFIED_PRE_VAT_ONLY\",\"document_review\":\"BUYER_DECLARED_REVIEW_NOT_INDEPENDENT_DOCUMENT_AUTHENTICATION\",\"three_way_match\":\"RECHECKED_AGAINST_VERIFIED_INVENTORY_DR_SNAPSHOTS\",\"goods_receipts\":[{\"goods_receipt_number\":\"DR-20261117170502-20\",\"received_date\":\"2026-11-18\"}],\"items\":[{\"po_item_id\":9,\"item_name\":\"EVA Foam Sheets\",\"unit\":\"pairs\",\"ordered_qty\":\"100.00\",\"received_qty\":\"100.00\",\"billed_qty\":\"100.00\",\"unit_price_pre_vat\":\"125.00\",\"line_total_pre_vat\":\"12500.00\"}]}', '2026-11-18 01:06:41', '2026-11-18 01:06:41', NULL, NULL, NULL, NULL, NULL),
(4, 10, 'INV-2026-0010', 12, 1, '1671307fb28ad30c01844e96e73a92ad', 1, 'posted', 'd35597e7fd5847245f79f21b6cdba463f1eb5d2d4a5a8448db04dd2ae5aa60b5', '{\"invoice_number\":\"INV-2026-0010\",\"supplier_invoice_reference\":\"12345\",\"po_number\":\"PO-2026-0012\",\"supplier\":{\"id\":4,\"name\":\"SoleTech Rubber Manufacturing\",\"payment_terms\":\"Net 30\"},\"invoice_date\":\"2026-11-19\",\"due_date\":\"2026-12-19\",\"amount_pre_vat\":\"4185.00\",\"original_po_amount_pre_vat\":\"4650.00\",\"tax_status\":\"NOT_VERIFIED_PRE_VAT_ONLY\",\"document_review\":\"BUYER_DECLARED_REVIEW_NOT_INDEPENDENT_DOCUMENT_AUTHENTICATION\",\"three_way_match\":\"BUYER_TRANSCRIBED_INVENTORY_EMAIL_PO_INVOICE_MATCH\",\"receipt_policy\":\"BILLED_ACCEPTED_QUANTITIES_FROM_INVENTORY_EMAIL_REJECTED_EXCLUDED\",\"inventory_email_report\":{\"subject\":\"Rejected Items Notice - PO-2026-0012\",\"sender\":\"kmbrlydetaunan@gmail.com\",\"delivery_reference\":\"DR-20261118210805-34\",\"received_date\":\"2026-11-19\",\"revision\":4,\"buyer_id\":1,\"buyer_checked_email\":true,\"note\":\"Inventory verified receipt DR-20261118210805-34. Packaging Tape: 100 delivered, 90 accepted, 10 rejected. Inspect original Inventory email for any rejection reason.\"},\"discrepancy_resolution\":{\"case_id\":2,\"resolved_at\":\"2026-11-19 04:53:06\",\"note\":\"Reviewed linked Inventory receiving evidence and the corrected supplier invoice for PO-2026-0012. The corrected billed quantities and approved PO prices passed the server-side 3-way match.\"},\"goods_receipts\":[],\"items\":[{\"po_item_id\":12,\"item_name\":\"Packaging Tape\",\"unit\":\"rolls\",\"ordered_qty\":\"100.00\",\"received_qty\":\"90.00\",\"rejected_qty\":\"10.00\",\"delivered_qty\":\"100.00\",\"billed_qty\":\"90.00\",\"unit_price_pre_vat\":\"46.50\",\"line_total_pre_vat\":\"4185.00\"}]}', '2026-11-19 05:25:52', '2026-11-19 05:26:27', 'AP-65', 'finance-admin-5', 'Posted to Finance accounting (accounts_payable AP-65, recorded as Unpaid). VAT 12.00% confirmed by Finance.', 'fin-ap-post-1671307fb28ad30c01844e96e73a92ad-8ed11b92', '2026-11-19 05:26:27'),
(5, 12, 'INV-2026-0012', 14, 1, 'ad348cb7faefba89efe327a57ce2d6ae', 1, 'posted', 'a06c47dd1c1a49a34adbe61067a83bcbdefa5d4f423f618bc4e5edc119c77920', '{\"invoice_number\":\"INV-2026-0012\",\"supplier_invoice_reference\":\"123456\",\"po_number\":\"PO-2026-0014\",\"supplier\":{\"id\":4,\"name\":\"SoleTech Rubber Manufacturing\",\"payment_terms\":\"Net 30\"},\"invoice_date\":\"2026-11-19\",\"due_date\":\"2026-12-19\",\"amount_pre_vat\":\"16000.00\",\"original_po_amount_pre_vat\":\"32000.00\",\"tax_status\":\"NOT_VERIFIED_PRE_VAT_ONLY\",\"document_review\":\"BUYER_DECLARED_REVIEW_NOT_INDEPENDENT_DOCUMENT_AUTHENTICATION\",\"three_way_match\":\"RECHECKED_AGAINST_VERIFIED_INVENTORY_DR_SNAPSHOTS\",\"receipt_policy\":\"ACCEPTED_QUANTITY_ONLY_REJECTED_QUANTITY_EXCLUDED\",\"discrepancy_resolution\":{\"case_id\":null,\"resolved_at\":null,\"note\":\"No invoice mismatch was recorded. Verified rejected items remain in the Inventory GR.\",\"inventory_gmail_reference\":null},\"goods_receipts\":[{\"goods_receipt_number\":\"DR-20261118233206-40\",\"received_date\":\"2026-11-19\"}],\"items\":[{\"po_item_id\":14,\"item_name\":\"Foam Insole\",\"unit\":\"pairs\",\"ordered_qty\":\"100.00\",\"received_qty\":\"50.00\",\"rejected_qty\":\"50.00\",\"delivered_qty\":\"100.00\",\"billed_qty\":\"50.00\",\"unit_price_pre_vat\":\"320.00\",\"line_total_pre_vat\":\"16000.00\"}]}', '2026-11-19 06:32:58', '2026-11-19 06:33:22', 'AP-66', 'finance-admin-5', 'Posted to Finance accounting (accounts_payable AP-66, recorded as Unpaid). VAT 12.00% confirmed by Finance.', 'fin-ap-post-ad348cb7faefba89efe327a57ce2d6ae-62522c02', '2026-11-19 06:33:22'),
(6, 13, 'INV-2026-0013', 15, 1, 'c49de1a0844b3c6c4ae254953a78f879', 1, 'pending', '47aa844ca7947e7e3f0b2682ee44cbcf3194a275dc08cb70e31e49123f2b9bf3', '{\"invoice_number\":\"INV-2026-0013\",\"supplier_invoice_reference\":\"1234567\",\"po_number\":\"PO-2026-0015\",\"supplier\":{\"id\":1,\"name\":\"Marikina Hide & Leather Co.\",\"payment_terms\":\"Net 30\"},\"invoice_date\":\"2026-11-19\",\"due_date\":\"2026-12-19\",\"amount_pre_vat\":\"9700.00\",\"tax_status\":\"NOT_VERIFIED_PRE_VAT_ONLY\",\"document_review\":\"BUYER_DECLARED_REVIEW_NOT_INDEPENDENT_DOCUMENT_AUTHENTICATION\",\"three_way_match\":\"RECHECKED_AGAINST_VERIFIED_INVENTORY_DR_SNAPSHOTS\",\"goods_receipts\":[{\"goods_receipt_number\":\"DR-20261118233710-43\",\"received_date\":\"2026-11-19\"}],\"items\":[{\"po_item_id\":15,\"item_name\":\"Canvas Fabric\",\"unit\":\"meters\",\"ordered_qty\":\"100.00\",\"received_qty\":\"100.00\",\"billed_qty\":\"100.00\",\"unit_price_pre_vat\":\"97.00\",\"line_total_pre_vat\":\"9700.00\"}]}', '2026-11-19 06:41:26', '2026-11-19 06:41:26', NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `procurement_finance_quotes`
--

CREATE TABLE `procurement_finance_quotes` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `rfq_id` int(11) NOT NULL,
  `quote_id` int(11) NOT NULL,
  `buyer_id` int(11) NOT NULL,
  `review_status` varchar(20) NOT NULL DEFAULT 'pending' CHECK (`review_status` in ('pending','approved','rejected')),
  `submitted_at` datetime NOT NULL DEFAULT current_timestamp(),
  `reviewed_at` datetime DEFAULT NULL,
  `reviewed_by` int(11) DEFAULT NULL,
  `review_note` varchar(500) DEFAULT NULL,
  `request_version` int(11) NOT NULL DEFAULT 1,
  `submitted_quote_total` decimal(15,2) DEFAULT NULL,
  `reviewer_ref` varchar(100) DEFAULT NULL,
  `decision_reference` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `procurement_finance_quotes`
--

INSERT INTO `procurement_finance_quotes` (`id`, `rfq_id`, `quote_id`, `buyer_id`, `review_status`, `submitted_at`, `reviewed_at`, `reviewed_by`, `review_note`, `request_version`, `submitted_quote_total`, `reviewer_ref`, `decision_reference`) VALUES
(1, 12, 34, 1, 'approved', '2026-11-13 00:09:21', '2026-11-13 09:04:08', NULL, 'LOCAL CLASSROOM INTEGRATION TEST ONLY. No Finance team connection.', 1, 262000.00, 'finance-local-test', 'FINTEST-20261113090408-266ce1ff'),
(2, 13, 40, 1, 'approved', '2026-11-13 15:39:54', '2026-11-13 21:51:45', NULL, '', 1, 1250.00, 'financeadmin@gmail.com', 'FIN-20261113145145-2e4b9f6ca8ce'),
(3, 15, 50, 1, 'approved', '2026-11-13 21:28:14', '2026-11-13 21:52:47', NULL, '', 1, 3500.00, 'financeadmin@gmail.com', 'FIN-20261113145247-aba7517d5384'),
(4, 14, 42, 1, 'approved', '2026-11-13 21:36:54', '2026-11-15 22:11:41', NULL, '', 1, 238.00, 'financeadmin@gmail.com', 'FIN-20261115151141-5c50ab6d6b7b'),
(5, 17, 53, 1, 'approved', '2026-11-15 22:16:53', '2026-11-15 22:17:14', NULL, '', 1, 1056.00, 'financeadmin@gmail.com', 'FIN-20261115151714-018fad497f5b'),
(6, 18, 55, 1, 'approved', '2026-11-15 22:19:44', '2026-11-15 22:20:03', NULL, '', 1, 7452494.00, 'financeadmin@gmail.com', 'FIN-20261115152003-f55293c4f2cf'),
(7, 19, 57, 1, 'approved', '2026-11-17 00:51:49', '2026-11-17 00:55:13', NULL, '', 1, 250.00, 'financeadmin@gmail.com', 'FIN-20261116175513-609164fa'),
(8, 20, 59, 1, 'approved', '2026-11-17 21:57:57', '2026-11-17 21:58:33', NULL, '', 1, 2650.00, 'financeadmin@gmail.com', 'FIN-20261117145833-db4db4ab'),
(9, 21, 61, 1, 'approved', '2026-11-17 23:57:05', '2026-11-17 23:57:20', NULL, '', 1, 12500.00, 'financeadmin@gmail.com', 'FIN-20261117165720-2a35f713'),
(10, 22, 68, 1, 'approved', '2026-11-18 00:25:51', '2026-11-18 00:26:12', NULL, '', 1, 2600.00, 'financeadmin@gmail.com', 'FIN-20261117172612-1b5af296'),
(11, 23, 74, 1, 'approved', '2026-11-18 00:36:45', '2026-11-18 00:37:21', NULL, '', 1, 15200.00, 'financeadmin@gmail.com', 'FIN-20261117173721-35cb691c'),
(12, 24, 75, 1, 'approved', '2026-11-19 00:19:04', '2026-11-19 00:19:33', NULL, '', 1, 4650.00, 'financeadmin@gmail.com', 'FIN-20261118171933-4f4a6195'),
(13, 25, 78, 1, 'approved', '2026-11-19 04:05:40', '2026-11-19 04:05:55', NULL, '', 1, 4650.00, 'financeadmin@gmail.com', 'FIN-20261118210555-b963617e'),
(14, 26, 81, 1, 'approved', '2026-11-19 05:37:39', '2026-11-19 05:37:54', NULL, '', 1, 3550.00, 'financeadmin@gmail.com', 'FIN-20261118223754-1b184719'),
(15, 27, 85, 1, 'approved', '2026-11-19 06:29:59', '2026-11-19 06:30:26', NULL, '', 1, 32000.00, 'financeadmin@gmail.com', 'FIN-20261118233026-53e21abd'),
(16, 28, 92, 1, 'approved', '2026-11-19 06:35:59', '2026-11-19 06:36:16', NULL, '', 1, 9700.00, 'financeadmin@gmail.com', 'FIN-20261118233616-7953ebc1');

-- --------------------------------------------------------

--
-- Table structure for table `procurement_finance_quote_decisions`
--

CREATE TABLE `procurement_finance_quote_decisions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `finance_request_id` bigint(20) UNSIGNED NOT NULL,
  `request_version` int(11) NOT NULL,
  `rfq_id` int(11) NOT NULL,
  `quote_id` int(11) NOT NULL,
  `decision` enum('approved','rejected') NOT NULL,
  `decision_reference` varchar(100) NOT NULL,
  `reviewer_ref` varchar(100) NOT NULL,
  `note` varchar(500) DEFAULT NULL,
  `recorded_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `procurement_finance_quote_decisions`
--

INSERT INTO `procurement_finance_quote_decisions` (`id`, `finance_request_id`, `request_version`, `rfq_id`, `quote_id`, `decision`, `decision_reference`, `reviewer_ref`, `note`, `recorded_at`) VALUES
(1, 1, 1, 12, 34, 'approved', 'FINTEST-20261113090408-266ce1ff', 'finance-local-test', 'LOCAL CLASSROOM INTEGRATION TEST ONLY. No Finance team connection.', '2026-11-13 09:04:08'),
(2, 2, 1, 13, 40, 'approved', 'FIN-20261113145145-2e4b9f6ca8ce', 'financeadmin@gmail.com', '', '2026-11-13 21:51:45'),
(3, 3, 1, 15, 50, 'approved', 'FIN-20261113145247-aba7517d5384', 'financeadmin@gmail.com', '', '2026-11-13 21:52:47'),
(4, 4, 1, 14, 42, 'approved', 'FIN-20261115151141-5c50ab6d6b7b', 'financeadmin@gmail.com', '', '2026-11-15 22:11:41'),
(5, 5, 1, 17, 53, 'approved', 'FIN-20261115151714-018fad497f5b', 'financeadmin@gmail.com', '', '2026-11-15 22:17:14'),
(6, 6, 1, 18, 55, 'approved', 'FIN-20261115152003-f55293c4f2cf', 'financeadmin@gmail.com', '', '2026-11-15 22:20:03'),
(7, 7, 1, 19, 57, 'approved', 'FIN-20261116175513-609164fa', 'financeadmin@gmail.com', '', '2026-11-17 00:55:13'),
(8, 8, 1, 20, 59, 'approved', 'FIN-20261117145833-db4db4ab', 'financeadmin@gmail.com', '', '2026-11-17 21:58:33'),
(9, 9, 1, 21, 61, 'approved', 'FIN-20261117165720-2a35f713', 'financeadmin@gmail.com', '', '2026-11-17 23:57:20'),
(10, 10, 1, 22, 68, 'approved', 'FIN-20261117172612-1b5af296', 'financeadmin@gmail.com', '', '2026-11-18 00:26:12'),
(11, 11, 1, 23, 74, 'approved', 'FIN-20261117173721-35cb691c', 'financeadmin@gmail.com', '', '2026-11-18 00:37:21'),
(12, 12, 1, 24, 75, 'approved', 'FIN-20261118171933-4f4a6195', 'financeadmin@gmail.com', '', '2026-11-19 00:19:33'),
(13, 13, 1, 25, 78, 'approved', 'FIN-20261118210555-b963617e', 'financeadmin@gmail.com', '', '2026-11-19 04:05:55'),
(14, 14, 1, 26, 81, 'approved', 'FIN-20261118223754-1b184719', 'financeadmin@gmail.com', '', '2026-11-19 05:37:54'),
(15, 15, 1, 27, 85, 'approved', 'FIN-20261118233026-53e21abd', 'financeadmin@gmail.com', '', '2026-11-19 06:30:26'),
(16, 16, 1, 28, 92, 'approved', 'FIN-20261118233616-7953ebc1', 'financeadmin@gmail.com', '', '2026-11-19 06:36:16');

-- --------------------------------------------------------

--
-- Table structure for table `procurement_finance_rfq_approvals`
--

CREATE TABLE `procurement_finance_rfq_approvals` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `rfq_id` int(11) NOT NULL,
  `decision` enum('approved','rejected') NOT NULL,
  `decision_reference` varchar(100) NOT NULL,
  `reviewer_ref` varchar(100) NOT NULL,
  `note` varchar(500) DEFAULT NULL,
  `decided_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `procurement_finance_rfq_approvals`
--

INSERT INTO `procurement_finance_rfq_approvals` (`id`, `rfq_id`, `decision`, `decision_reference`, `reviewer_ref`, `note`, `decided_at`) VALUES
(1, 11, 'approved', 'FIN-20261113075258-0def8f8a', 'financeadmin@gmail.com', '', '2026-11-13 14:52:58');

-- --------------------------------------------------------

--
-- Table structure for table `procurement_inventory_receipts`
--

CREATE TABLE `procurement_inventory_receipts` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `po_id` int(11) NOT NULL,
  `po_number` varchar(30) NOT NULL,
  `request_number` varchar(80) NOT NULL,
  `receipt_number` varchar(80) NOT NULL,
  `receipt_date` date NOT NULL,
  `verified_at` datetime NOT NULL DEFAULT current_timestamp(),
  `snapshot_hash` char(64) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `procurement_inventory_receipts`
--

INSERT INTO `procurement_inventory_receipts` (`id`, `po_id`, `po_number`, `request_number`, `receipt_number`, `receipt_date`, `verified_at`, `snapshot_hash`) VALUES
(1, 7, 'PO-2026-0007', 'REQ-2026111617500695', 'DR-20261116175746-13', '2026-11-17', '2026-11-17 01:09:51', 'b7df2bb3bd536bef2bc417ea88177e62e31c662391d0d2a9c8269a6973a76c08'),
(2, 8, 'PO-2026-0008', 'REQ-2026111714562556', 'DR-20261117150201-17', '2026-11-17', '2026-11-17 22:02:01', '9983e2cc0fb9877c78ab82bb55e7feec23929a1e1d95c582feafbf8a686748a2'),
(3, 9, 'PO-2026-0009', 'REQ-2026111715103858', 'DR-20261117170502-20', '2026-11-18', '2026-11-18 00:05:02', 'ca5242f8ffad1f836e06e3d4c6be73373cbd9b05bfc04acad8efb7068fc75281'),
(4, 11, 'PO-2026-0011', 'REQ-2026111817172854', 'DR-20261118172108-31', '2026-11-19', '2026-11-19 00:21:08', 'da0cabfc9dd5eebc586ff522ae0acebdde62b27318e62d55dd6fbcb7df29723a'),
(5, 12, 'PO-2026-0012', 'REQ-2026111821040164', 'DR-20261118210805-34', '2026-11-19', '2026-11-19 04:08:05', 'df49301862f9c7b1d7645580c217190fe8945964250a636413be0d8194b62db4'),
(6, 13, 'PO-2026-0013', 'REQ-2026111822361366', 'DR-20261118224004-37', '2026-11-19', '2026-11-19 05:40:05', 'd7a3291d1532d4c0790b3ec37bb2c987c2400ac01784ec52a0f778981a01fd37'),
(7, 14, 'PO-2026-0014', 'REQ-2026111823283196', 'DR-20261118233206-40', '2026-11-19', '2026-11-19 06:32:07', 'd79374400c2d9fafd1db43d1f15ee729e8df335365d9a64c93ced942fe51c581'),
(8, 15, 'PO-2026-0015', 'REQ-2026111823341976', 'DR-20261118233710-43', '2026-11-19', '2026-11-19 06:37:10', '4427ce507e6e7222fb5d3b590744000fd3cfbdd89a33383beae5400cde7af31a');

-- --------------------------------------------------------

--
-- Table structure for table `procurement_inventory_receipt_items`
--

CREATE TABLE `procurement_inventory_receipt_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `receipt_id` bigint(20) UNSIGNED NOT NULL,
  `po_item_id` int(11) NOT NULL,
  `delivered_qty` decimal(10,2) NOT NULL,
  `accepted_qty` decimal(10,2) NOT NULL,
  `rejected_qty` decimal(10,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `procurement_inventory_receipt_items`
--

INSERT INTO `procurement_inventory_receipt_items` (`id`, `receipt_id`, `po_item_id`, `delivered_qty`, `accepted_qty`, `rejected_qty`) VALUES
(1, 1, 7, 2.00, 2.00, 0.00),
(2, 2, 8, 100.00, 100.00, 0.00),
(3, 3, 9, 100.00, 100.00, 0.00),
(4, 4, 11, 100.00, 100.00, 0.00),
(5, 5, 12, 100.00, 90.00, 10.00),
(6, 6, 13, 100.00, 50.00, 50.00),
(7, 7, 14, 100.00, 50.00, 50.00),
(8, 8, 15, 100.00, 100.00, 0.00);

-- --------------------------------------------------------

--
-- Table structure for table `procurement_inventory_receiving_warehouses`
--

CREATE TABLE `procurement_inventory_receiving_warehouses` (
  `inventory_request_number` varchar(80) NOT NULL,
  `pr_id` int(11) NOT NULL,
  `inventory_warehouse_id` int(11) NOT NULL,
  `warehouse_code` varchar(30) NOT NULL,
  `warehouse_name` varchar(100) NOT NULL,
  `warehouse_location` varchar(150) NOT NULL DEFAULT '',
  `recipient_name` varchar(150) NOT NULL DEFAULT '',
  `recipient_gmail` varchar(150) NOT NULL DEFAULT '',
  `expected_days` varchar(50) NOT NULL DEFAULT '',
  `expected_receive_date` date DEFAULT NULL,
  `original_remarks` text DEFAULT NULL,
  `recorded_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `procurement_inventory_receiving_warehouses`
--

INSERT INTO `procurement_inventory_receiving_warehouses` (`inventory_request_number`, `pr_id`, `inventory_warehouse_id`, `warehouse_code`, `warehouse_name`, `warehouse_location`, `recipient_name`, `recipient_gmail`, `expected_days`, `expected_receive_date`, `original_remarks`, `recorded_at`) VALUES
('REQ-2026111715103858', 46, 1, 'WH-MAIN', 'Main Warehouse', 'Main Storage', 'Procurement Team12', 'sydneyaustria796@gmail.com', '2-3 days', NULL, '', '2026-11-17 15:55:44'),
('REQ-2026111717221393', 47, 2, 'WH-SECONDARY', 'Secondary Warehouse', 'Secondary Storage', 'Procurement Team12', 'sufficiencia@gmail.com', '5-7 days', NULL, '', '2026-11-17 16:22:36'),
('REQ-2026111717345161', 48, 1, 'WH-MAIN', 'Main Warehouse', 'Main Storage', 'Procurement Team12', 'sufficiencia@gmail.com', '2-3 days', NULL, '', '2026-11-17 16:35:25'),
('REQ-2026111814193573', 49, 2, 'WH-SECONDARY', 'Secondary Warehouse', 'Secondary Storage', 'Procurement Team12', 'sufficiencia@gmail.com', '5-7 days', NULL, '', '2026-11-18 13:19:56'),
('REQ-2026111814370180', 50, 2, 'WH-SECONDARY', 'Secondary Warehouse', 'Secondary Storage', 'Procurement Team12', 'sufficiencia@gmail.com', '3-5 days', NULL, 'I need this to deliver in 3-5 days', '2026-11-18 13:37:18'),
('REQ-2026111817172854', 51, 1, 'WH-MAIN', 'Main Warehouse', 'Main Storage', 'adsasdaa', 'sufficiencia@gmail.com', '2-3 days', NULL, '', '2026-11-18 16:17:56'),
('REQ-2026111821040164', 52, 2, 'WH-SECONDARY', 'Secondary Warehouse', 'Secondary Storage', 'Procurement Team', 'plspofficial@plsp.edu.ph', '2-3 days', NULL, '', '2026-11-18 20:04:36'),
('REQ-2026111822361366', 53, 1, 'WH-MAIN', 'Main Warehouse', 'Main Storage', 'Procurement Team', 'plspofficial@plsp.edu.ph', '2-3 days', NULL, '', '2026-11-18 21:36:28'),
('REQ-2026111823283196', 54, 2, 'WH-SECONDARY', 'Secondary Warehouse', 'Secondary Storage', 'Procurement Team', 'plspofficial@plsp.edu.ph', '2-3 days', NULL, '', '2026-11-18 22:28:54'),
('REQ-2026111823341976', 55, 2, 'WH-SECONDARY', 'Secondary Warehouse', 'Secondary Storage', 'Procurement Team', 'plspofficial@plsp.edu.ph', '2-3 days', NULL, '', '2026-11-18 22:34:33');

-- --------------------------------------------------------

--
-- Table structure for table `procurement_inventory_sync_outbox`
--

CREATE TABLE `procurement_inventory_sync_outbox` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `event_type` varchar(24) NOT NULL,
  `source_id` int(11) NOT NULL,
  `request_number` varchar(80) NOT NULL,
  `po_number` varchar(30) DEFAULT NULL,
  `status` varchar(12) NOT NULL DEFAULT 'pending',
  `attempts` int(11) NOT NULL DEFAULT 0,
  `last_error` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `last_attempt_at` datetime DEFAULT NULL,
  `delivered_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `procurement_inventory_sync_outbox`
--

INSERT INTO `procurement_inventory_sync_outbox` (`id`, `event_type`, `source_id`, `request_number`, `po_number`, `status`, `attempts`, `last_error`, `created_at`, `last_attempt_at`, `delivered_at`) VALUES
(1, 'pr_approved', 44, 'REQ-2026111617500695', NULL, 'sent', 1, NULL, '2026-11-17 00:51:12', '2026-11-17 00:51:12', '2026-11-17 00:51:12'),
(2, 'po_approved', 7, 'REQ-2026111617500695', 'PO-2026-0007', 'sent', 1, NULL, '2026-11-17 00:56:38', '2026-11-17 00:56:38', '2026-11-17 00:56:38'),
(3, 'pr_approved', 45, 'REQ-2026111714562556', NULL, 'sent', 1, NULL, '2026-11-17 21:57:01', '2026-11-17 21:57:01', '2026-11-17 21:57:01'),
(4, 'po_approved', 8, 'REQ-2026111714562556', 'PO-2026-0008', 'sent', 1, NULL, '2026-11-17 21:59:14', '2026-11-17 21:59:14', '2026-11-17 21:59:14'),
(5, 'pr_approved', 46, 'REQ-2026111715103858', NULL, 'sent', 1, NULL, '2026-11-17 23:56:02', '2026-11-17 23:56:02', '2026-11-17 23:56:02'),
(6, 'po_approved', 9, 'REQ-2026111715103858', 'PO-2026-0009', 'sent', 1, NULL, '2026-11-18 00:03:14', '2026-11-18 00:03:14', '2026-11-18 00:03:14'),
(7, 'pr_approved', 47, 'REQ-2026111717221393', NULL, 'sent', 1, NULL, '2026-11-18 00:22:54', '2026-11-18 00:22:54', '2026-11-18 00:22:54'),
(8, 'pr_approved', 48, 'REQ-2026111717345161', NULL, 'sent', 1, NULL, '2026-11-18 00:35:42', '2026-11-18 00:35:42', '2026-11-18 00:35:42'),
(9, 'po_approved', 10, 'REQ-2026111717345161', 'PO-2026-0010', 'sent', 1, NULL, '2026-11-18 01:05:02', '2026-11-18 01:05:03', '2026-11-18 01:05:03'),
(10, 'pr_approved', 51, 'REQ-2026111817172854', NULL, 'sent', 1, NULL, '2026-11-19 00:18:22', '2026-11-19 00:18:22', '2026-11-19 00:18:22'),
(11, 'po_approved', 11, 'REQ-2026111817172854', 'PO-2026-0011', 'sent', 1, NULL, '2026-11-19 00:20:51', '2026-11-19 00:20:51', '2026-11-19 00:20:51'),
(12, 'pr_approved', 52, 'REQ-2026111821040164', NULL, 'sent', 1, NULL, '2026-11-19 04:04:50', '2026-11-19 04:04:50', '2026-11-19 04:04:50'),
(13, 'po_approved', 12, 'REQ-2026111821040164', 'PO-2026-0012', 'sent', 1, NULL, '2026-11-19 04:06:52', '2026-11-19 04:06:52', '2026-11-19 04:06:52'),
(14, 'pr_approved', 53, 'REQ-2026111822361366', NULL, 'sent', 1, NULL, '2026-11-19 05:36:45', '2026-11-19 05:36:45', '2026-11-19 05:36:45'),
(15, 'po_approved', 13, 'REQ-2026111822361366', 'PO-2026-0013', 'sent', 1, NULL, '2026-11-19 05:38:44', '2026-11-19 05:38:44', '2026-11-19 05:38:44'),
(16, 'pr_approved', 54, 'REQ-2026111823283196', NULL, 'sent', 1, NULL, '2026-11-19 06:29:11', '2026-11-19 06:29:11', '2026-11-19 06:29:11'),
(17, 'po_approved', 14, 'REQ-2026111823283196', 'PO-2026-0014', 'sent', 1, NULL, '2026-11-19 06:30:59', '2026-11-19 06:30:59', '2026-11-19 06:30:59'),
(18, 'pr_approved', 55, 'REQ-2026111823341976', NULL, 'sent', 1, NULL, '2026-11-19 06:34:50', '2026-11-19 06:34:50', '2026-11-19 06:34:50'),
(19, 'po_approved', 15, 'REQ-2026111823341976', 'PO-2026-0015', 'sent', 1, NULL, '2026-11-19 06:36:46', '2026-11-19 06:36:46', '2026-11-19 06:36:46');

-- --------------------------------------------------------

--
-- Table structure for table `procurement_invoice_discrepancies`
--

CREATE TABLE `procurement_invoice_discrepancies` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `invoice_id` int(11) NOT NULL,
  `po_id` int(11) NOT NULL,
  `buyer_id` int(11) NOT NULL,
  `reasons_json` text NOT NULL,
  `buyer_notes` text NOT NULL,
  `gmail_reference` varchar(200) DEFAULT NULL,
  `evidence_json` longtext NOT NULL,
  `status` varchar(16) NOT NULL DEFAULT 'open',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `resolved_at` datetime DEFAULT NULL,
  `resolved_by` int(11) DEFAULT NULL,
  `resolution_note` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `procurement_invoice_discrepancies`
--

INSERT INTO `procurement_invoice_discrepancies` (`id`, `invoice_id`, `po_id`, `buyer_id`, `reasons_json`, `buyer_notes`, `gmail_reference`, `evidence_json`, `status`, `created_at`, `resolved_at`, `resolved_by`, `resolution_note`) VALUES
(1, 8, 11, 1, '[\"quantity_mismatch\"]', 'sadasdasdasdasdas', '', '[{\"po_item_id\":11,\"item_name\":\"Packaging Tape\",\"unit\":\"rolls\",\"qty_ordered\":\"100.00\",\"qty_received\":\"100.00\",\"verified_delivered\":\"100.00\",\"verified_accepted\":\"100.00\",\"verified_rejected\":\"0.00\"}]', 'open', '2026-11-19 00:48:38', NULL, NULL, NULL),
(2, 10, 12, 1, '[\"quantity_mismatch\"]', 'adadasdasadadasdweawdsadas', '', '[{\"po_item_id\":12,\"item_name\":\"Packaging Tape\",\"unit\":\"rolls\",\"qty_ordered\":\"100.00\",\"qty_received\":\"90.00\",\"unit_price\":\"46.50\",\"verified_delivered\":\"100.00\",\"verified_accepted\":\"90.00\",\"verified_rejected\":\"10.00\"}]', 'resolved', '2026-11-19 04:24:40', '2026-11-19 04:53:06', 1, 'Reviewed linked Inventory receiving evidence and the corrected supplier invoice for PO-2026-0012. The corrected billed quantities and approved PO prices passed the server-side 3-way match.'),
(3, 11, 13, 1, '[\"damaged_goods\"]', 'asdasdsfadasdasdsa', '', '[{\"po_item_id\":13,\"item_name\":\"Metal Buckles\",\"unit\":\"pieces\",\"qty_ordered\":\"100.00\",\"qty_received\":\"50.00\",\"unit_price\":\"35.50\",\"verified_delivered\":\"100.00\",\"verified_accepted\":\"50.00\",\"verified_rejected\":\"50.00\"}]', 'resolved', '2026-11-19 06:07:31', '2026-11-19 06:07:53', 1, 'Reviewed linked Inventory receiving evidence and the corrected supplier invoice for PO-2026-0013. The corrected billed quantities and approved PO prices passed the server-side 3-way match.');

-- --------------------------------------------------------

--
-- Table structure for table `procurement_invoice_email_receipts`
--

CREATE TABLE `procurement_invoice_email_receipts` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `invoice_id` int(11) NOT NULL,
  `po_id` int(11) NOT NULL,
  `buyer_id` int(11) NOT NULL,
  `gmail_subject` varchar(200) NOT NULL,
  `sender_email` varchar(200) NOT NULL,
  `delivery_reference` varchar(100) NOT NULL,
  `received_date` date NOT NULL,
  `buyer_note` varchar(1000) NOT NULL,
  `inventory_email_reviewed` tinyint(1) NOT NULL DEFAULT 0,
  `revision` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `procurement_invoice_email_receipts`
--

INSERT INTO `procurement_invoice_email_receipts` (`id`, `invoice_id`, `po_id`, `buyer_id`, `gmail_subject`, `sender_email`, `delivery_reference`, `received_date`, `buyer_note`, `inventory_email_reviewed`, `revision`, `created_at`, `updated_at`) VALUES
(1, 10, 12, 1, 'Rejected Items Notice - PO-2026-0012', 'kmbrlydetaunan@gmail.com', 'DR-20261118210805-34', '2026-11-19', 'Inventory verified receipt DR-20261118210805-34. Packaging Tape: 100 delivered, 90 accepted, 10 rejected. Inspect original Inventory email for any rejection reason.', 1, 4, '2026-11-18 20:24:41', '2026-11-18 20:25:29'),
(2, 11, 13, 1, 'Rejected Items Notice - PO-2026-0012', 'kmbrlydetaunan@gmail.com', 'DR-20261118224004-37', '2026-11-19', 'Inventory verified receipt DR-20261118224004-37. Metal Buckles: 100 delivered, 50 accepted, 50 rejected. Inspect original Inventory email for any rejection reason.', 1, 1, '2026-11-18 22:07:31', '2026-11-18 22:07:31');

-- --------------------------------------------------------

--
-- Table structure for table `procurement_invoice_email_receipt_audit`
--

CREATE TABLE `procurement_invoice_email_receipt_audit` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `report_id` bigint(20) UNSIGNED NOT NULL,
  `revision` int(10) UNSIGNED NOT NULL,
  `action` varchar(32) NOT NULL,
  `actor_buyer_id` int(11) NOT NULL,
  `evidence_json` longtext NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `procurement_invoice_email_receipt_audit`
--

INSERT INTO `procurement_invoice_email_receipt_audit` (`id`, `report_id`, `revision`, `action`, `actor_buyer_id`, `evidence_json`, `created_at`) VALUES
(1, 1, 1, 'created', 1, '{\"invoice_number\":\"INV-2026-0010\",\"po_number\":\"PO-2026-0012\",\"email\":{\"subject\":\"Rejected Items Notice - PO-2026-0012\",\"sender\":\"kmbrlydetaunan@gmail.com\",\"delivery_reference\":\"DR-20261118210805-34\",\"received_date\":\"2026-11-19\",\"note\":\"Inventory verified receipt DR-20261118210805-34. Packaging Tape: 100 delivered, 90 accepted, 10 rejected. Inspect original Inventory email for any rejection reason.\"},\"items\":[{\"po_item_id\":12,\"delivered_qty\":\"100.00\",\"accepted_qty\":\"90.00\",\"rejected_qty\":\"10.00\"}],\"automatic_invoice_draft\":{\"previous_amount_pre_vat\":\"4650.00\",\"new_amount_pre_vat\":\"4185.00\",\"lines\":[{\"po_item_id\":12,\"item_name\":\"Packaging Tape\",\"unit\":\"rolls\",\"qty_billed\":\"90.00\",\"unit_price\":\"46.50\",\"line_total\":\"4185.00\"}],\"supplier_document_verified\":false}}', '2026-11-18 20:24:41'),
(2, 1, 2, 'updated', 1, '{\"invoice_number\":\"INV-2026-0010\",\"po_number\":\"PO-2026-0012\",\"email\":{\"subject\":\"Rejected Items Notice - PO-2026-0012\",\"sender\":\"kmbrlydetaunan@gmail.com\",\"delivery_reference\":\"DR-20261118210805-34\",\"received_date\":\"2026-11-19\",\"note\":\"Inventory verified receipt DR-20261118210805-34. Packaging Tape: 100 delivered, 90 accepted, 10 rejected. Inspect original Inventory email for any rejection reason.\"},\"items\":[{\"po_item_id\":12,\"delivered_qty\":\"100.00\",\"accepted_qty\":\"90.00\",\"rejected_qty\":\"10.00\"}],\"automatic_invoice_draft\":{\"previous_amount_pre_vat\":\"4185.00\",\"new_amount_pre_vat\":\"4185.00\",\"lines\":[{\"po_item_id\":12,\"item_name\":\"Packaging Tape\",\"unit\":\"rolls\",\"qty_billed\":\"90.00\",\"unit_price\":\"46.50\",\"line_total\":\"4185.00\"}],\"supplier_document_verified\":false}}', '2026-11-18 20:25:07'),
(3, 1, 3, 'updated', 1, '{\"invoice_number\":\"INV-2026-0010\",\"po_number\":\"PO-2026-0012\",\"email\":{\"subject\":\"Rejected Items Notice - PO-2026-0012\",\"sender\":\"kmbrlydetaunan@gmail.com\",\"delivery_reference\":\"DR-20261118210805-34\",\"received_date\":\"2026-11-19\",\"note\":\"Inventory verified receipt DR-20261118210805-34. Packaging Tape: 100 delivered, 90 accepted, 10 rejected. Inspect original Inventory email for any rejection reason.\"},\"items\":[{\"po_item_id\":12,\"delivered_qty\":\"100.00\",\"accepted_qty\":\"90.00\",\"rejected_qty\":\"10.00\"}],\"automatic_invoice_draft\":{\"previous_amount_pre_vat\":\"4185.00\",\"new_amount_pre_vat\":\"4185.00\",\"lines\":[{\"po_item_id\":12,\"item_name\":\"Packaging Tape\",\"unit\":\"rolls\",\"qty_billed\":\"90.00\",\"unit_price\":\"46.50\",\"line_total\":\"4185.00\"}],\"supplier_document_verified\":false}}', '2026-11-18 20:25:13'),
(4, 1, 4, 'updated', 1, '{\"invoice_number\":\"INV-2026-0010\",\"po_number\":\"PO-2026-0012\",\"email\":{\"subject\":\"Rejected Items Notice - PO-2026-0012\",\"sender\":\"kmbrlydetaunan@gmail.com\",\"delivery_reference\":\"DR-20261118210805-34\",\"received_date\":\"2026-11-19\",\"note\":\"Inventory verified receipt DR-20261118210805-34. Packaging Tape: 100 delivered, 90 accepted, 10 rejected. Inspect original Inventory email for any rejection reason.\"},\"items\":[{\"po_item_id\":12,\"delivered_qty\":\"100.00\",\"accepted_qty\":\"90.00\",\"rejected_qty\":\"10.00\"}],\"automatic_invoice_draft\":{\"previous_amount_pre_vat\":\"4185.00\",\"new_amount_pre_vat\":\"4185.00\",\"lines\":[{\"po_item_id\":12,\"item_name\":\"Packaging Tape\",\"unit\":\"rolls\",\"qty_billed\":\"90.00\",\"unit_price\":\"46.50\",\"line_total\":\"4185.00\"}],\"supplier_document_verified\":false}}', '2026-11-18 20:25:29'),
(5, 2, 1, 'created', 1, '{\"invoice_number\":\"INV-2026-0011\",\"po_number\":\"PO-2026-0013\",\"email\":{\"subject\":\"Rejected Items Notice - PO-2026-0012\",\"sender\":\"kmbrlydetaunan@gmail.com\",\"delivery_reference\":\"DR-20261118224004-37\",\"received_date\":\"2026-11-19\",\"note\":\"Inventory verified receipt DR-20261118224004-37. Metal Buckles: 100 delivered, 50 accepted, 50 rejected. Inspect original Inventory email for any rejection reason.\"},\"items\":[{\"po_item_id\":13,\"delivered_qty\":\"100.00\",\"accepted_qty\":\"50.00\",\"rejected_qty\":\"50.00\"}],\"automatic_invoice_draft\":{\"previous_amount_pre_vat\":\"1775.00\",\"new_amount_pre_vat\":\"1775.00\",\"lines\":[{\"po_item_id\":13,\"item_name\":\"Metal Buckles\",\"unit\":\"pieces\",\"qty_billed\":\"50.00\",\"unit_price\":\"35.50\",\"line_total\":\"1775.00\"}],\"supplier_document_verified\":false}}', '2026-11-18 22:07:31');

-- --------------------------------------------------------

--
-- Table structure for table `procurement_invoice_email_receipt_items`
--

CREATE TABLE `procurement_invoice_email_receipt_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `report_id` bigint(20) UNSIGNED NOT NULL,
  `po_item_id` int(11) NOT NULL,
  `delivered_qty` decimal(10,2) NOT NULL,
  `accepted_qty` decimal(10,2) NOT NULL,
  `rejected_qty` decimal(10,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `procurement_invoice_email_receipt_items`
--

INSERT INTO `procurement_invoice_email_receipt_items` (`id`, `report_id`, `po_item_id`, `delivered_qty`, `accepted_qty`, `rejected_qty`) VALUES
(4, 1, 12, 100.00, 90.00, 10.00),
(5, 2, 13, 100.00, 50.00, 50.00);

-- --------------------------------------------------------

--
-- Table structure for table `procurement_manager_notification_reads`
--

CREATE TABLE `procurement_manager_notification_reads` (
  `manager_id` int(11) NOT NULL,
  `event_key` varchar(120) NOT NULL,
  `read_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `procurement_manager_notification_reads`
--

INSERT INTO `procurement_manager_notification_reads` (`manager_id`, `event_key`, `read_at`) VALUES
(2, 'posubmit:1', '2026-11-13 09:32:55');

-- --------------------------------------------------------

--
-- Table structure for table `procurement_po_notification_events`
--

CREATE TABLE `procurement_po_notification_events` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `po_id` int(11) NOT NULL,
  `po_number` varchar(40) NOT NULL,
  `buyer_id` int(11) NOT NULL,
  `manager_id` int(11) DEFAULT NULL,
  `event_type` varchar(20) NOT NULL,
  `origin` varchar(20) NOT NULL DEFAULT 'workflow',
  `recorded_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `procurement_po_notification_events`
--

INSERT INTO `procurement_po_notification_events` (`id`, `po_id`, `po_number`, `buyer_id`, `manager_id`, `event_type`, `origin`, `recorded_at`) VALUES
(1, 1, 'PO-2026-0001', 1, NULL, 'submitted', 'backfill', '2026-11-13 09:29:00'),
(2, 1, 'PO-2026-0001', 1, 2, 'approved', 'workflow', '2026-11-13 09:34:15'),
(3, 5, 'PO-2026-0005', 1, NULL, 'submitted', 'workflow', '2026-11-13 22:05:10'),
(4, 5, 'PO-2026-0005', 1, 2, 'approved', 'workflow', '2026-11-13 22:10:11'),
(5, 6, 'PO-2026-0006', 1, NULL, 'submitted', 'workflow', '2026-11-15 22:20:13'),
(6, 7, 'PO-2026-0007', 1, NULL, 'submitted', 'workflow', '2026-11-17 00:56:00'),
(7, 7, 'PO-2026-0007', 1, 2, 'approved', 'workflow', '2026-11-17 00:56:38'),
(8, 8, 'PO-2026-0008', 1, NULL, 'submitted', 'workflow', '2026-11-17 21:58:57'),
(9, 8, 'PO-2026-0008', 1, 2, 'approved', 'workflow', '2026-11-17 21:59:14'),
(10, 9, 'PO-2026-0009', 1, NULL, 'submitted', 'workflow', '2026-11-18 00:02:42'),
(11, 9, 'PO-2026-0009', 1, 2, 'approved', 'workflow', '2026-11-18 00:03:14'),
(12, 10, 'PO-2026-0010', 1, NULL, 'submitted', 'workflow', '2026-11-18 01:04:42'),
(13, 10, 'PO-2026-0010', 1, 2, 'approved', 'workflow', '2026-11-18 01:05:02'),
(14, 11, 'PO-2026-0011', 1, NULL, 'submitted', 'workflow', '2026-11-19 00:19:51'),
(15, 11, 'PO-2026-0011', 1, 2, 'approved', 'workflow', '2026-11-19 00:20:51'),
(16, 12, 'PO-2026-0012', 1, NULL, 'submitted', 'workflow', '2026-11-19 04:06:17'),
(17, 12, 'PO-2026-0012', 1, 2, 'approved', 'workflow', '2026-11-19 04:06:52'),
(18, 13, 'PO-2026-0013', 1, NULL, 'submitted', 'workflow', '2026-11-19 05:38:16'),
(19, 13, 'PO-2026-0013', 1, 2, 'approved', 'workflow', '2026-11-19 05:38:44'),
(20, 14, 'PO-2026-0014', 1, NULL, 'submitted', 'workflow', '2026-11-19 06:30:45'),
(21, 14, 'PO-2026-0014', 1, 2, 'approved', 'workflow', '2026-11-19 06:30:59'),
(22, 15, 'PO-2026-0015', 1, NULL, 'submitted', 'workflow', '2026-11-19 06:36:29'),
(23, 15, 'PO-2026-0015', 1, 2, 'approved', 'workflow', '2026-11-19 06:36:46');

-- --------------------------------------------------------

--
-- Table structure for table `procurement_pr_item_descriptions`
--

CREATE TABLE `procurement_pr_item_descriptions` (
  `item_id` int(11) NOT NULL,
  `pr_id` int(11) NOT NULL,
  `description` varchar(1500) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `procurement_pr_rejection_history`
--

CREATE TABLE `procurement_pr_rejection_history` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `pr_id` int(11) NOT NULL,
  `pr_number` varchar(70) NOT NULL,
  `manager_id` int(11) DEFAULT NULL,
  `rejected_at` datetime DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `manager_remarks` text DEFAULT NULL,
  `revised_by` int(11) NOT NULL,
  `revised_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `procurement_pr_rejection_history`
--

INSERT INTO `procurement_pr_rejection_history` (`id`, `pr_id`, `pr_number`, `manager_id`, `rejected_at`, `rejection_reason`, `manager_remarks`, `revised_by`, `revised_at`) VALUES
(1, 26, 'PR-2026-0026', 2, '2026-11-13 12:44:17', 'asdsa', 'asdsa', 1, '2026-11-13 18:15:40'),
(2, 9, 'PR-2026-0009', 2, '2026-11-03 11:27:57', '', NULL, 1, '2026-11-13 18:20:44'),
(3, 31, 'PR-2026-0031', 2, '2026-11-13 18:22:59', '', NULL, 1, '2026-11-13 18:23:46'),
(4, 29, 'PR-2026-0029', 2, '2026-11-13 18:24:18', '', NULL, 1, '2026-11-13 18:24:45'),
(5, 32, 'PR-2026-0032', 2, '2026-11-13 18:32:59', '', NULL, 1, '2026-11-13 18:33:45');

-- --------------------------------------------------------

--
-- Table structure for table `procurement_pr_revision_baselines`
--

CREATE TABLE `procurement_pr_revision_baselines` (
  `pr_id` int(11) NOT NULL,
  `needed_by` date NOT NULL,
  `purpose` text NOT NULL,
  `items_json` longtext NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `procurement_support_tickets`
--

CREATE TABLE `procurement_support_tickets` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `requester_user_id` int(11) NOT NULL,
  `requester_name` varchar(150) NOT NULL,
  `requester_role` varchar(30) NOT NULL,
  `category` varchar(80) NOT NULL,
  `reference_number` varchar(80) DEFAULT NULL,
  `subject` text NOT NULL,
  `status` enum('open','in_progress','resolved') NOT NULL DEFAULT 'open',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `procurement_support_ticket_files`
--

CREATE TABLE `procurement_support_ticket_files` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `ticket_id` bigint(20) UNSIGNED NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `storage_name` varchar(90) NOT NULL,
  `mime_type` varchar(120) NOT NULL,
  `file_size` int(10) UNSIGNED NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pr_items`
--

CREATE TABLE `pr_items` (
  `id` int(11) NOT NULL,
  `pr_id` int(11) NOT NULL,
  `item_code` varchar(30) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `item_name` varchar(200) NOT NULL,
  `unit` varchar(20) NOT NULL,
  `qty` decimal(10,2) NOT NULL CHECK (`qty` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pr_items`
--

INSERT INTO `pr_items` (`id`, `pr_id`, `item_code`, `category`, `item_name`, `unit`, `qty`) VALUES
(1, 1, NULL, NULL, 'Full-Grain Leather', 'sq. ft.', 100.00),
(2, 1, NULL, NULL, 'Mesh Fabric', 'meters', 100.00),
(3, 2, 'LEA-0001', 'Leather', 'Full-Grain Leather', 'square feet', 1.00),
(4, 3, 'LEA-0002', 'Leather', 'Suede Leather', 'square feet', 1.00),
(5, 4, 'TEX-0001', 'Textile', 'Mesh Fabric', 'meters', 1.00),
(6, 5, 'TEX-0001', 'Textile', 'Mesh Fabric', 'piece', 0.06),
(7, 6, 'LEA-0001', 'Leather', 'Full-Grain Leather', 'pair', 1.00),
(8, 7, 'LEA-0001', 'Leather', 'Full-Grain Leather', 'square feet', 2.00),
(9, 8, 'LEA-0003', 'Leather', 'Nubuck Leather', 'square feet', 1.00),
(11, 10, 'TEX-0003', 'Textile', 'Canvas Fabric', 'meters', 1.00),
(12, 11, 'PKG-0001', 'Packaging', 'Shoe Boxes', 'pieces', 5.00),
(13, 12, 'HAR-0002', 'Hardware', 'Metal Buckles', 'pieces', 5.00),
(14, 13, 'LEA-0001', 'Leather', 'Full-Grain Leather', 'square feet', 1.00),
(15, 14, 'ADH-0001', 'Adhesive', 'Rubber Cement / Shoe Adhesive', 'liters', 1.00),
(16, 15, 'TEX-0003', 'Textile', 'Canvas Fabric', 'meters', 100.00),
(17, 15, 'TEX-0004', 'Synthetic', 'PU Leather', 'meters', 80.00),
(18, 15, 'LEA-0003', 'Leather', 'Nubuck Leather', 'square feet', 60.00),
(19, 16, 'ADH-0001', 'Adhesive', 'Shoe Adhesive', 'liters', 1.00),
(20, 17, 'COM-0001', 'Components', 'Rubber Sole', 'pairs', 12.00),
(21, 18, 'HAR-0002', 'Hardware', 'Metal Buckles', 'pieces', 58.00),
(22, 19, 'PKG-0002', 'Packaging', 'Tissue Paper Rolls', 'pieces', 165.00),
(23, 20, 'TEX-0001', 'Textile', 'Mesh Fabric', 'meters', 100.00),
(24, 21, 'COM-0002', 'Components', 'EVA Foam Sheets', 'pairs', 13.00),
(25, 22, 'TEX-0003', 'Textile', 'Canvas Fabric', 'meters', 100.00),
(26, 23, 'PKG-0002', 'Packaging', 'Tissue Paper Rolls', 'pieces', 500.00),
(27, 24, 'LEA-0001', 'Leather', 'Full-Grain Leather', 'square feet', 1000.00),
(28, 25, 'LEA-0003', 'Leather', 'Nubuck Leather', 'square feet', 1000.00),
(30, 27, 'PKG-0001', 'Packaging', 'Shoe Boxes', 'pieces', 100.00),
(31, 28, 'LEA-0004', 'Leather', 'Black Leather', 'square feet', 10.00),
(40, 30, 'COM-0002', 'Components', 'EVA Foam Sheets', 'pairs', 10.00),
(41, 26, 'HAR-0004', 'Hardware', 'Shoelaces', 'pieces', 99.00),
(42, 26, 'LEA-0001', 'Leather', 'Full-Grain Leather', 'square feet', 100.00),
(43, 9, 'LEA-0001', 'Leather', 'Full-Grain Leather', 'square feet', 1.00),
(45, 31, 'LEA-0001', 'Leather', 'Full-Grain Leather', 'square feet', 1.00),
(46, 31, 'LEA-0004', 'Leather', 'Black Leather', 'square feet', 11.00),
(47, 29, 'TEX-0004', 'Synthetic', 'PU Leather', 'meters', 1.00),
(48, 29, 'COM-0001', 'Components', 'Rubber Sole', 'pairs', 1.00),
(49, 29, 'COM-0002', 'Components', 'EVA Foam Sheets', 'pairs', 1.00),
(50, 29, 'HAR-0004', 'Hardware', 'Shoelaces', 'pieces', 1.00),
(51, 29, 'PKG-0001', 'Packaging', 'Shoe Boxes', 'pieces', 1.00),
(52, 29, 'ADH-0001', 'Adhesive', 'Shoe Adhesive', 'liters', 1.00),
(53, 29, 'PKG-0003', 'Packaging', 'Packaging Tape', 'rolls', 1.00),
(55, 32, 'HAR-0004', 'Hardware', 'Shoelaces', 'pieces', 11.00),
(56, 32, 'LEA-0004', 'Leather', 'Black Leather', 'square feet', 11.00),
(57, 33, 'LEA-0004', 'Leather', 'Black Leather', 'square feet', 1.00),
(58, 34, 'HAR-0002', 'Hardware', 'Metal Buckles', 'pieces', 100.00),
(76, 35, 'LEA-0001', 'Leather', 'Full-Grain Leather', 'square feet', 1.00),
(77, 35, 'LEA-0001', 'Leather', 'Full-Grain Leather', 'square feet', 1.00),
(78, 35, 'LEA-0004', 'Leather', 'Black Leather', 'square feet', 1.00),
(79, 37, 'LEA-0004', 'Leather', 'Black Leather', 'square feet', 10.00),
(80, 38, '', 'Raw Materials', 'Tissue Paper Rolls', 'pieces', 10.00),
(81, 39, 'TEX-0001', 'Textile', 'Mesh Fabric', 'meters', 10.00),
(82, 40, 'TEX-0004', 'Synthetic', 'PU Leather', 'meters', 12.00),
(83, 41, 'LEA-0004', 'Leather', 'Black Leather', 'square feet', 11.00),
(84, 42, 'TEX-0003', 'Textile', 'Canvas Fabric', 'meters', 11.00),
(85, 43, 'LEA-0004', 'Leather', 'Black Leather', 'square feet', 31313.00),
(87, 44, '', 'Raw Materials', 'EVA Foam Sheets', 'pairs', 2.00),
(89, 45, '', 'Raw Materials', 'Shoelaces', 'pieces', 100.00),
(91, 46, '', 'Raw Materials', 'EVA Foam Sheets', 'pairs', 100.00),
(93, 47, '', 'Raw Materials', 'Shoelaces', 'pieces', 100.00),
(95, 48, '', 'Raw Materials', 'Shoe Adhesive', 'liters', 100.00),
(96, 49, '', 'Raw Materials', 'Tissue Paper Rolls', 'pieces', 100.00),
(97, 50, '', 'Raw Materials', 'Tissue Paper Rolls', 'pieces', 100.00),
(99, 51, '', 'Raw Materials', 'Packaging Tape', 'rolls', 100.00),
(101, 52, '', 'Raw Materials', 'Packaging Tape', 'rolls', 100.00),
(103, 53, '', 'Raw Materials', 'Metal Buckles', 'pieces', 100.00),
(105, 54, '', 'Raw Materials', 'Foam Insole', 'pairs', 100.00),
(107, 55, '', 'Raw Materials', 'Canvas Fabric', 'meters', 100.00);

-- --------------------------------------------------------

--
-- Table structure for table `purchase_orders`
--

CREATE TABLE `purchase_orders` (
  `id` int(11) NOT NULL,
  `po_number` varchar(30) NOT NULL,
  `rfq_id` int(11) DEFAULT NULL,
  `rfq_quote_id` int(11) DEFAULT NULL,
  `supplier_id` int(11) NOT NULL,
  `created_by` int(11) NOT NULL,
  `order_date` date NOT NULL,
  `expected_delivery` date DEFAULT NULL,
  `delivery_address` varchar(255) DEFAULT NULL,
  `notes_to_supplier` text DEFAULT NULL,
  `total_amount` decimal(12,2) NOT NULL,
  `status` varchar(20) DEFAULT 'issued',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `purchase_orders`
--

INSERT INTO `purchase_orders` (`id`, `po_number`, `rfq_id`, `rfq_quote_id`, `supplier_id`, `created_by`, `order_date`, `expected_delivery`, `delivery_address`, `notes_to_supplier`, `total_amount`, `status`, `created_at`) VALUES
(1, 'PO-2026-0001', 7, 20, 4, 1, '2026-11-08', '2026-12-16', 'Second Warehouse — Palina, Nagcarlan, Laguna', '', 141.90, 'approved', '2026-11-07 22:11:32'),
(2, 'PO-2026-0002', 9, 25, 1, 1, '2026-11-09', '2026-11-19', 'Main Warehouse — Brgy. II-C, San Pablo City, Laguna', '', 9700.00, 'approved', '2026-11-08 17:23:36'),
(3, 'PO-2026-0003', 8, 22, 4, 1, '2026-11-09', '2026-12-08', 'Main Warehouse — Brgy. II-C, San Pablo City, Laguna', '', 12700.00, 'approved', '2026-11-08 18:11:10'),
(4, 'PO-2026-0004', 11, 33, 1, 1, '2026-11-12', '2026-11-15', 'Main Warehouse — Brgy. II-C, San Pablo City, Laguna', '', 2350.00, 'received', '2026-11-12 04:38:38'),
(5, 'PO-2026-0005', 15, 50, 1, 1, '2026-11-13', '2026-11-14', 'Main Warehouse — Brgy. II-C, San Pablo City, Laguna', '', 3500.00, 'approved', '2026-11-13 14:05:10'),
(6, 'PO-2026-0006', 18, 55, 4, 1, '2026-11-15', '2026-11-18', 'Main Warehouse — Brgy. II-C, San Pablo City, Laguna', '', 7452494.00, 'pending_approval', '2026-11-15 14:20:13'),
(7, 'PO-2026-0007', 19, 57, 4, 1, '2026-11-17', '2026-11-17', 'Main Warehouse — Brgy. II-C, San Pablo City, Laguna', '', 250.00, 'received', '2026-11-16 16:56:00'),
(8, 'PO-2026-0008', 20, 59, 4, 1, '2026-11-17', '2026-11-20', 'Main Warehouse — Brgy. II-C, San Pablo City, Laguna', '', 2650.00, 'received', '2026-11-17 13:58:57'),
(9, 'PO-2026-0009', 21, 61, 4, 1, '2026-11-18', '2026-11-19', 'Main Warehouse, Brgy. II-C, San Pablo City, Laguna', '', 12500.00, 'received', '2026-11-17 16:02:42'),
(10, 'PO-2026-0010', 23, 74, 1, 1, '2026-11-18', '2026-11-18', 'Main Warehouse, Brgy. II-C, San Pablo City, Laguna', '', 15200.00, 'approved', '2026-11-17 17:04:42'),
(11, 'PO-2026-0011', 24, 75, 4, 1, '2026-11-19', '2026-11-19', 'Main Warehouse - Brgy. II-C, San Pablo City, Laguna', '', 4650.00, 'received', '2026-11-18 16:19:51'),
(12, 'PO-2026-0012', 25, 78, 4, 1, '2026-11-19', '2026-11-19', 'Second Warehouse - Palina, Nagcarlan, Laguna', '', 4650.00, 'partial', '2026-11-18 20:06:17'),
(13, 'PO-2026-0013', 26, 81, 4, 1, '2026-11-19', '2026-11-19', 'Main Warehouse - Brgy. II-C, San Pablo City, Laguna', '', 3550.00, 'partial', '2026-11-18 21:38:16'),
(14, 'PO-2026-0014', 27, 85, 4, 1, '2026-11-19', '2026-11-19', 'Second Warehouse - Palina, Nagcarlan, Laguna', '', 32000.00, 'partial', '2026-11-18 22:30:45'),
(15, 'PO-2026-0015', 28, 92, 1, 1, '2026-11-19', '2026-11-19', 'Second Warehouse - Palina, Nagcarlan, Laguna', '', 9700.00, 'received', '2026-11-18 22:36:29');

-- --------------------------------------------------------

--
-- Table structure for table `purchase_requisitions`
--

CREATE TABLE `purchase_requisitions` (
  `id` int(11) NOT NULL,
  `pr_number` varchar(30) NOT NULL,
  `created_by` int(11) NOT NULL,
  `department` varchar(100) NOT NULL,
  `purpose` text NOT NULL,
  `needed_by` date NOT NULL,
  `status` varchar(20) DEFAULT 'draft' CHECK (`status` in ('draft','submitted','approved','rejected','closed')),
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `manager_remarks` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `purchase_requisitions`
--

INSERT INTO `purchase_requisitions` (`id`, `pr_number`, `created_by`, `department`, `purpose`, `needed_by`, `status`, `approved_by`, `approved_at`, `rejection_reason`, `manager_remarks`, `created_at`) VALUES
(1, 'PR-2026-0001', 1, 'Procurement', 'Monthly raw material replenishment for Q4 production.', '2026-10-05', 'approved', 2, '2026-09-25 03:00:00', NULL, NULL, '2026-09-20 02:30:00'),
(2, 'PR-2026-0002', 1, 'Procurement', 'Q4 production materials for sneaker line (Style #SN-2026).', '2026-10-25', 'submitted', NULL, NULL, NULL, NULL, '2026-10-30 15:22:53'),
(3, 'PR-2026-0003', 1, 'Procurement', 'Q4 production materials for sneaker line (Style #SN-2026).', '2026-10-25', 'submitted', NULL, NULL, NULL, NULL, '2026-10-30 15:24:19'),
(4, 'PR-2026-0004', 1, 'Procurement', 'Q4 production materials for sneaker line (Style #SN-2026).', '2026-10-25', 'submitted', NULL, NULL, NULL, NULL, '2026-10-30 15:29:03'),
(5, 'PR-2026-0005', 1, 'Procurement', 'Q4 production materials for sneaker line (Style #SN-2026).', '2026-10-25', 'submitted', NULL, NULL, NULL, NULL, '2026-11-01 13:40:59'),
(6, 'PR-2026-0006', 1, 'Procurement', 'Q4 production materials for sneaker line (Style #SN-2026).', '2026-10-25', 'submitted', NULL, NULL, NULL, NULL, '2026-11-01 13:56:51'),
(7, 'PR-2026-0007', 1, 'Procurement', 'Q4 production materials for sneaker line (Style #SN-2026).', '2026-10-25', 'submitted', NULL, NULL, NULL, NULL, '2026-11-01 14:59:59'),
(8, 'PR-2026-0008', 1, 'Procurement', 'Q4 production materials for sneaker line (Style #SN-2026).', '2026-10-25', 'rejected', 2, '2026-11-03 03:35:04', '', NULL, '2026-11-01 15:00:49'),
(9, 'PR-2026-0009', 1, 'Procurement', 'Q4 production materials for sneaker line (Style #SN-2026).', '2026-11-27', 'submitted', NULL, NULL, NULL, NULL, '2026-11-01 15:12:22'),
(10, 'PR-2026-0010', 1, 'Procurement', 'Q4 production materials for sneaker line (Style #SN-2026).', '2026-10-25', 'submitted', NULL, NULL, NULL, NULL, '2026-11-01 16:03:43'),
(11, 'PR-2026-0011', 1, 'Procurement', 'Q4 production materials for sneaker line (Style #SN-2026).', '2026-10-25', 'approved', 2, '2026-11-02 18:44:50', NULL, NULL, '2026-11-02 04:51:42'),
(12, 'PR-2026-0012', 1, 'Procurement', 'Q4 production materials for sneaker line (Style #SN-2026).', '2026-10-25', 'approved', 2, '2026-11-02 18:26:54', NULL, NULL, '2026-11-02 04:52:16'),
(13, 'PR-2026-0013', 1, 'Procurement', 'Q4 production materials for sneaker line (Style #SN-2026).', '2026-10-25', 'submitted', NULL, NULL, NULL, NULL, '2026-11-05 05:37:31'),
(14, 'PR-2026-0014', 1, 'Procurement', 'Q4 production materials for sneaker line (Style #SN-2026).', '2026-10-25', 'approved', 2, '2026-11-06 13:33:57', NULL, NULL, '2026-11-06 13:32:42'),
(15, 'PR-2026-0015', 1, 'Procurement', 'Q4 production materials for sneaker line (Style #SN-2026).', '2026-10-25', 'approved', 2, '2026-11-07 01:07:35', NULL, NULL, '2026-11-07 01:05:17'),
(16, 'PR-2026-0016', 1, 'Procurement', 'Q4 production materials for sneaker line (Style #SN-2026).', '2026-10-25', 'approved', 2, '2026-11-07 20:22:07', NULL, NULL, '2026-11-07 19:58:26'),
(17, 'PR-2026-0017', 1, 'Procurement', 'Q4 production materials for sneaker line (Style #SN-2026).', '2026-10-25', 'submitted', NULL, NULL, NULL, NULL, '2026-11-07 20:00:05'),
(18, 'PR-2026-0018', 1, 'Procurement', 'Q4 production materials for sneaker line (Style #SN-2026).', '2026-10-25', 'approved', 2, '2026-11-07 20:43:10', NULL, NULL, '2026-11-07 20:42:53'),
(19, 'PR-2026-0019', 1, 'Procurement', 'Q4 production materials for sneaker line (Style #SN-2026).', '2026-10-25', 'approved', 2, '2026-11-07 21:31:33', NULL, NULL, '2026-11-07 21:30:50'),
(20, 'PR-2026-0020', 1, 'Procurement', 'Q4 production materials for sneaker line (Style #SN-2026).', '2026-10-25', 'approved', 2, '2026-11-08 13:07:44', NULL, NULL, '2026-11-08 13:03:09'),
(21, 'PR-2026-0021', 1, 'Procurement', 'Q4 production materials for sneaker line (Style #SN-2026).', '2026-10-25', 'submitted', NULL, NULL, NULL, NULL, '2026-11-08 16:52:28'),
(22, 'PR-2026-0022', 1, 'Procurement', 'Q4 production materials for sneaker line (Style #SN-2026).', '2026-10-25', 'approved', 2, '2026-11-08 16:53:48', NULL, NULL, '2026-11-08 16:52:58'),
(23, 'PR-2026-0023', 1, 'Procurement', 'Q4 production materials for sneaker line (Style #SN-2026).', '2026-10-25', 'approved', 2, '2026-11-10 07:46:57', NULL, NULL, '2026-11-10 07:46:20'),
(24, 'PR-2026-0024', 1, 'Procurement', 'Q4 production materials for sneaker line (Style #SN-2026).', '2026-10-25', 'approved', 2, '2026-11-10 07:55:28', NULL, NULL, '2026-11-10 07:55:19'),
(25, 'PR-2026-0025', 1, 'Procurement', 'Q4 production materials for sneaker line (Style #SN-2026).', '2026-10-25', 'approved', 2, '2026-11-10 08:08:15', NULL, NULL, '2026-11-10 08:08:02'),
(26, 'PR-2026-0026', 1, 'Procurement', 'Q4 production materials for sneaker line (Style #SN-2026).', '2026-11-20', 'submitted', NULL, NULL, NULL, NULL, '2026-11-10 08:14:49'),
(27, 'PR-2026-0027', 1, 'Procurement', 'Q4 production materials for sneaker line (Style #SN-2026).', '2026-10-25', 'approved', 2, '2026-11-13 04:44:02', NULL, 'sdfsdfsd', '2026-11-10 08:20:14'),
(28, 'PR-2026-0028', 1, 'Procurement', 'Purchase of raw materials requested by Inventory (REQ-2026111120314593).', '2026-11-15', 'approved', 2, '2026-11-12 04:33:21', NULL, NULL, '2026-11-11 20:23:30'),
(29, 'PR-2026-0029', 1, 'Procurement', 'Q4 production materials for sneaker line (Style #SN-2026).', '2026-11-19', 'approved', 2, '2026-11-13 10:25:03', NULL, NULL, '2026-11-13 06:41:28'),
(30, 'PR-2026-0030', 1, 'Procurement', 'Q4 production materials for sneaker line (Style #SN-2026).', '2026-10-25', 'approved', 2, '2026-11-13 07:31:14', NULL, NULL, '2026-11-13 07:21:14'),
(31, 'PR-2026-0031', 1, 'Procurement', 'Q4 production materials for sneaker line (Style #SN-2026).', '2026-11-20', 'approved', 2, '2026-11-13 10:28:11', NULL, NULL, '2026-11-13 10:22:44'),
(32, 'PR-2026-0032', 1, 'Procurement', 'Q4 production materials for sneaker line (Style #SN-2026).', '2026-11-20', 'rejected', 2, '2026-11-13 10:34:04', '', NULL, '2026-11-13 10:32:33'),
(33, 'PR-2026-0033', 1, 'Procurement', 'Q4 production materials for sneaker line (Style #SN-2026).', '2026-11-27', 'approved', 2, '2026-11-13 11:17:31', NULL, NULL, '2026-11-13 11:16:04'),
(34, 'PR-2026-0034', 1, 'Procurement', 'Q4 production materials for sneaker line (Style #SN-2026).', '2026-11-14', 'approved', 2, '2026-11-13 13:27:01', NULL, NULL, '2026-11-13 13:26:48'),
(35, 'PR-2026-0035', 1, 'Procurement', 'Q4 production materials for sneaker line (Style #SN-2026).', '2026-11-18', 'submitted', NULL, NULL, NULL, NULL, '2026-11-14 15:36:05'),
(37, 'PR-2026-0037', 1, 'Procurement', 'Purchase of raw materials requested by Inventory (REQ-2026111512435464).', '2026-11-17', 'draft', NULL, NULL, NULL, NULL, '2026-11-15 11:44:22'),
(38, 'PR-2026-0038', 1, 'Procurement', 'Purchase of raw materials requested by Inventory (REQ-2026111512452028).', '2026-11-18', 'draft', NULL, NULL, NULL, NULL, '2026-11-15 11:45:33'),
(39, 'PR-2026-0039', 1, 'Procurement', 'Q4 production materials for sneaker line (Style #SN-2026).', '2026-11-19', 'approved', 2, '2026-11-15 13:35:30', NULL, NULL, '2026-11-15 13:35:17'),
(40, 'PR-2026-0040', 1, 'Procurement', 'Q4 production materials for sneaker line (Style #SN-2026).', '2026-11-17', 'approved', 2, '2026-11-15 14:04:49', NULL, NULL, '2026-11-15 14:04:38'),
(41, 'PR-2026-0041', 1, 'Procurement', 'Q4 production materials for sneaker line (Style #SN-2026).', '2026-12-03', 'submitted', NULL, NULL, NULL, NULL, '2026-11-15 14:12:32'),
(42, 'PR-2026-0042', 1, 'Procurement', 'Q4 production materials for sneaker line (Style #SN-2026).', '2026-11-18', 'approved', 2, '2026-11-15 14:16:16', NULL, NULL, '2026-11-15 14:15:50'),
(43, 'PR-2026-0043', 1, 'Procurement', 'Q4 production materials for sneaker line (Style #SN-2026).', '2026-11-26', 'approved', 2, '2026-11-15 14:19:03', NULL, NULL, '2026-11-15 14:18:52'),
(44, 'PR-2026-0044', 1, 'Procurement', 'Purchase of raw materials requested by Inventory (REQ-2026111617500695).', '2026-11-17', 'approved', 2, '2026-11-16 16:51:12', NULL, NULL, '2026-11-16 16:50:42'),
(45, 'PR-2026-0045', 1, 'Procurement', 'Purchase of raw materials requested by Inventory (REQ-2026111714562556).', '2026-11-20', 'approved', 2, '2026-11-17 13:57:01', NULL, NULL, '2026-11-17 13:56:45'),
(46, 'PR-2026-0046', 1, 'Procurement', 'Purchase of raw materials requested by Inventory (REQ-2026111715103858).', '2026-11-20', 'approved', 2, '2026-11-17 15:56:02', NULL, NULL, '2026-11-17 15:55:44'),
(47, 'PR-2026-0047', 1, 'Procurement', 'Purchase of raw materials requested by Inventory (REQ-2026111717221393).', '2026-11-23', 'approved', 2, '2026-11-17 16:22:54', NULL, NULL, '2026-11-17 16:22:36'),
(48, 'PR-2026-0048', 1, 'Procurement', 'Purchase of raw materials requested by Inventory (REQ-2026111717345161).', '2026-11-21', 'approved', 2, '2026-11-17 16:35:42', NULL, NULL, '2026-11-17 16:35:25'),
(49, 'PR-2026-0049', 1, 'Procurement', 'Purchase of raw materials requested by Inventory (REQ-2026111814193573).', '2026-11-18', 'draft', NULL, NULL, NULL, NULL, '2026-11-18 13:19:56'),
(50, 'PR-2026-0050', 1, 'Procurement', 'Inventory request REQ-2026111814370180: I need this to deliver in 3-5 days', '2026-11-18', 'draft', NULL, NULL, NULL, NULL, '2026-11-18 13:37:18'),
(51, 'PR-2026-0051', 1, 'Procurement', 'Purchase of raw materials requested by Inventory (REQ-2026111817172854).', '2026-11-20', 'approved', 2, '2026-11-18 16:18:22', NULL, NULL, '2026-11-18 16:17:56'),
(52, 'PR-2026-0052', 1, 'Procurement', 'Purchase of raw materials requested by Inventory (REQ-2026111821040164).', '2026-11-22', 'approved', 2, '2026-11-18 20:04:50', NULL, NULL, '2026-11-18 20:04:36'),
(53, 'PR-2026-0053', 1, 'Procurement', 'Purchase of raw materials requested by Inventory (REQ-2026111822361366).', '2026-11-22', 'approved', 2, '2026-11-18 21:36:45', NULL, NULL, '2026-11-18 21:36:28'),
(54, 'PR-2026-0054', 1, 'Procurement', 'Purchase of raw materials requested by Inventory (REQ-2026111823283196).', '2026-11-22', 'approved', 2, '2026-11-18 22:29:11', NULL, NULL, '2026-11-18 22:28:54'),
(55, 'PR-2026-0055', 1, 'Procurement', 'Purchase of raw materials requested by Inventory (REQ-2026111823341976).', '2026-11-22', 'approved', 2, '2026-11-18 22:34:50', NULL, NULL, '2026-11-18 22:34:33');

-- --------------------------------------------------------

--
-- Table structure for table `purchase_requisition_attachments`
--

CREATE TABLE `purchase_requisition_attachments` (
  `id` int(11) NOT NULL,
  `pr_id` int(11) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `stored_name` varchar(255) NOT NULL,
  `mime_type` varchar(150) DEFAULT NULL,
  `file_size` bigint(20) UNSIGNED NOT NULL DEFAULT 0,
  `relative_path` varchar(500) NOT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `rfqs`
--

CREATE TABLE `rfqs` (
  `id` int(11) NOT NULL,
  `rfq_number` varchar(30) NOT NULL,
  `pr_id` int(11) NOT NULL,
  `created_by` int(11) NOT NULL,
  `deadline` date NOT NULL,
  `warehouse_value` varchar(20) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'open' CHECK (`status` in ('open','compared','awarded','cancelled')),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `deadline_time` time DEFAULT NULL,
  `priority` varchar(10) NOT NULL DEFAULT 'Normal',
  `available_budget` decimal(15,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `rfqs`
--

INSERT INTO `rfqs` (`id`, `rfq_number`, `pr_id`, `created_by`, `deadline`, `warehouse_value`, `status`, `created_at`, `deadline_time`, `priority`, `available_budget`) VALUES
(1, 'RFQ-0015', 15, 1, '2026-11-18', NULL, 'awarded', '2026-11-07 02:21:57', NULL, 'Normal', NULL),
(2, 'RFQ-0012', 12, 1, '2026-09-30', NULL, 'compared', '2026-11-07 02:26:40', NULL, 'Normal', NULL),
(3, 'RFQ-0001', 1, 1, '2026-12-01', NULL, 'awarded', '2026-11-07 02:35:28', NULL, 'Normal', NULL),
(4, 'RFQ-0016', 16, 1, '2026-12-18', NULL, 'awarded', '2026-11-07 20:27:29', NULL, 'Normal', NULL),
(5, 'RFQ-0018', 18, 1, '2026-12-18', NULL, 'awarded', '2026-11-07 20:43:56', NULL, 'Normal', NULL),
(6, 'RFQ-0011', 11, 1, '2026-12-18', 'second', 'open', '2026-11-07 21:18:15', NULL, 'Normal', NULL),
(7, 'RFQ-0019', 19, 1, '2026-12-16', 'second', 'awarded', '2026-11-07 21:32:27', NULL, 'Normal', NULL),
(8, 'RFQ-0020', 20, 1, '2026-12-08', 'main', 'awarded', '2026-11-08 13:08:07', NULL, 'Normal', NULL),
(9, 'RFQ-0022', 22, 1, '2026-11-19', 'main', 'awarded', '2026-11-08 16:54:21', NULL, 'Normal', NULL),
(10, 'RFQ-0023', 23, 1, '2026-11-27', 'second', 'compared', '2026-11-10 07:47:29', NULL, 'Normal', NULL),
(11, 'RFQ-0028', 28, 1, '2026-11-15', 'main', 'awarded', '2026-11-12 04:37:25', NULL, 'Normal', NULL),
(12, 'RFQ-0025', 25, 1, '2026-11-26', 'main', 'awarded', '2026-11-12 14:22:02', NULL, 'Normal', NULL),
(13, 'RFQ-0030', 30, 1, '2026-11-21', 'main', 'compared', '2026-11-13 07:32:40', '19:00:00', 'Normal', NULL),
(14, 'RFQ-0033', 33, 1, '2026-11-14', 'main', 'compared', '2026-11-13 13:26:18', '17:00:00', 'Normal', NULL),
(15, 'RFQ-0034', 34, 1, '2026-11-14', 'main', 'awarded', '2026-11-13 13:27:30', '17:00:00', 'Normal', NULL),
(16, 'RFQ-0040', 40, 1, '2026-11-18', 'main', 'open', '2026-11-15 14:05:26', '17:00:00', 'Normal', NULL),
(17, 'RFQ-0042', 42, 1, '2026-11-17', 'main', 'compared', '2026-11-15 14:16:37', '17:00:00', 'Normal', NULL),
(18, 'RFQ-0043', 43, 1, '2026-11-18', 'main', 'awarded', '2026-11-15 14:19:33', '17:00:00', 'Normal', NULL),
(19, 'RFQ-0044', 44, 1, '2026-11-17', 'main', 'awarded', '2026-11-16 16:51:37', '17:00:00', 'Normal', NULL),
(20, 'RFQ-0045', 45, 1, '2026-11-20', 'main', 'awarded', '2026-11-17 13:57:21', '17:00:00', 'Normal', NULL),
(21, 'RFQ-0046', 46, 1, '2026-11-19', 'main', 'awarded', '2026-11-17 15:56:47', '17:00:00', 'Normal', NULL),
(22, 'RFQ-0047', 47, 1, '2026-11-18', 'second', 'awarded', '2026-11-17 16:25:11', '17:00:00', 'Normal', NULL),
(23, 'RFQ-0048', 48, 1, '2026-11-18', 'main', 'awarded', '2026-11-17 16:36:15', '17:00:00', 'Normal', NULL),
(24, 'RFQ-0051', 51, 1, '2026-11-19', 'main', 'awarded', '2026-11-18 16:18:46', '17:00:00', 'Normal', NULL),
(25, 'RFQ-0052', 52, 1, '2026-11-19', 'second', 'awarded', '2026-11-18 20:05:20', '17:00:00', 'Normal', NULL),
(26, 'RFQ-0053', 53, 1, '2026-11-19', 'main', 'awarded', '2026-11-18 21:37:10', '17:00:00', 'Normal', NULL),
(27, 'RFQ-0054', 54, 1, '2026-11-19', 'second', 'awarded', '2026-11-18 22:29:38', '17:00:00', 'Normal', NULL),
(28, 'RFQ-0055', 55, 1, '2026-11-19', 'second', 'awarded', '2026-11-18 22:35:23', '17:00:00', 'Normal', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `rfq_quotes`
--

CREATE TABLE `rfq_quotes` (
  `id` int(11) NOT NULL,
  `rfq_id` int(11) NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `total_amount` decimal(12,2) DEFAULT 0.00,
  `is_winner` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `rfq_quotes`
--

INSERT INTO `rfq_quotes` (`id`, `rfq_id`, `supplier_id`, `total_amount`, `is_winner`) VALUES
(1, 1, 4, 37240.00, 1),
(2, 1, 2, 37080.00, 0),
(3, 2, 4, 177.50, NULL),
(4, 2, 6, 177.50, NULL),
(5, 2, 3, 172.50, NULL),
(6, 3, 4, 36900.00, 1),
(7, 3, 2, 36800.00, 0),
(8, 4, 4, 150.00, 1),
(9, 4, 6, 150.00, 0),
(10, 4, 2, 155.00, 0),
(11, 4, 3, 151.00, 0),
(12, 5, 4, 2059.00, 0),
(13, 5, 6, 2059.00, 0),
(14, 5, 2, 2088.00, 0),
(15, 5, 5, 2001.00, 0),
(16, 5, 3, 2001.00, 0),
(17, 5, 1, 2030.00, 1),
(18, 6, 4, NULL, NULL),
(19, 6, 2, NULL, NULL),
(20, 7, 4, 141.90, 1),
(21, 7, 2, 145.20, 0),
(22, 8, 4, 12700.00, 1),
(23, 8, 2, 13000.00, 0),
(24, 9, 2, 9800.00, 0),
(25, 9, 1, 9700.00, 1),
(26, 10, 4, 430.00, NULL),
(27, 10, 2, 440.00, NULL),
(28, 11, 4, 2380.00, 0),
(29, 11, 6, 2380.00, 0),
(30, 11, 2, 2500.00, 0),
(31, 11, 5, 2450.00, 0),
(32, 11, 3, 2400.00, 0),
(33, 11, 1, 2350.00, 1),
(34, 12, 4, 262000.00, 1),
(35, 12, 6, 262000.00, 0),
(36, 12, 2, 252000.00, 0),
(37, 12, 5, 264000.00, 0),
(38, 12, 3, 258000.00, 0),
(39, 12, 1, 260000.00, 0),
(40, 13, 4, 1250.00, NULL),
(41, 13, 2, 1300.00, NULL),
(42, 14, 4, 238.00, NULL),
(43, 14, 6, 238.00, NULL),
(44, 14, 2, 250.00, NULL),
(45, 15, 4, 3550.00, 0),
(46, 15, 6, 3550.00, 0),
(47, 15, 2, 3600.00, 0),
(48, 15, 5, 3450.00, 0),
(49, 15, 3, 3450.00, 0),
(50, 15, 1, 3500.00, 1),
(51, 16, 4, NULL, NULL),
(52, 16, 2, NULL, NULL),
(53, 17, 4, 1056.00, NULL),
(54, 17, 2, 1078.00, NULL),
(55, 18, 4, 7452494.00, 1),
(56, 18, 2, 7828250.00, 0),
(57, 19, 4, 250.00, 1),
(58, 19, 2, 260.00, 0),
(59, 20, 4, 2650.00, 1),
(60, 20, 2, 2700.00, 0),
(61, 21, 4, 12500.00, 1),
(62, 21, 2, 13000.00, 0),
(63, 22, 4, 2650.00, 0),
(64, 22, 6, 2650.00, 0),
(65, 22, 2, 2700.00, 0),
(66, 22, 5, 2550.00, 0),
(67, 22, 3, 2550.00, 0),
(68, 22, 1, 2600.00, 1),
(69, 23, 4, 15000.00, 0),
(70, 23, 6, 15000.00, 0),
(71, 23, 2, 15500.00, 0),
(72, 23, 5, 15200.00, 0),
(73, 23, 3, 15100.00, 0),
(74, 23, 1, 15200.00, 1),
(75, 24, 4, 4650.00, 1),
(76, 24, 6, 4650.00, 0),
(77, 24, 2, 4800.00, 0),
(78, 25, 4, 4650.00, 1),
(79, 25, 6, 4650.00, 0),
(80, 25, 2, 4800.00, 0),
(81, 26, 4, 3550.00, 1),
(82, 26, 6, 3550.00, 0),
(83, 26, 2, 3600.00, 0),
(84, 26, 3, 3450.00, 0),
(85, 27, 4, 32000.00, 1),
(86, 27, 2, 32200.00, 0),
(87, 28, 4, 9600.00, 0),
(88, 28, 6, 9600.00, 0),
(89, 28, 2, 9800.00, 0),
(90, 28, 5, 9700.00, 0),
(91, 28, 3, 9500.00, 0),
(92, 28, 1, 9700.00, 1);

-- --------------------------------------------------------

--
-- Table structure for table `rfq_quote_items`
--

CREATE TABLE `rfq_quote_items` (
  `id` int(11) NOT NULL,
  `rfq_quote_id` int(11) NOT NULL,
  `supplier_item_id` int(11) NOT NULL,
  `item_name` varchar(200) NOT NULL,
  `unit` varchar(20) NOT NULL,
  `qty` decimal(10,2) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `subtotal` decimal(12,2) GENERATED ALWAYS AS (`qty` * `unit_price`) STORED
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `rfq_quote_items`
--

INSERT INTO `rfq_quote_items` (`id`, `rfq_quote_id`, `supplier_item_id`, `item_name`, `unit`, `qty`, `unit_price`) VALUES
(1, 6, 42, 'Full-Grain Leather', 'sq. ft.', 100.00, 242.00),
(2, 6, 43, 'Mesh Fabric', 'meters', 100.00, 127.00),
(3, 7, 40, 'Full-Grain Leather', 'sq. ft.', 100.00, 240.00),
(4, 7, 41, 'Mesh Fabric', 'meters', 100.00, 128.00),
(5, 3, 79, 'Metal Buckles', 'pieces', 5.00, 35.50),
(6, 4, 81, 'Metal Buckles', 'pieces', 5.00, 35.50),
(7, 5, 78, 'Metal Buckles', 'pieces', 5.00, 34.50),
(8, 1, 21, 'Canvas Fabric', 'meters', 100.00, 96.00),
(9, 1, 28, 'PU Leather', 'meters', 80.00, 149.00),
(10, 1, 35, 'Nubuck Leather', 'square feet', 60.00, 262.00),
(11, 2, 20, 'Canvas Fabric', 'meters', 100.00, 98.00),
(12, 2, 27, 'PU Leather', 'meters', 80.00, 152.00),
(13, 2, 34, 'Nubuck Leather', 'square feet', 60.00, 252.00),
(14, 8, 105, 'Shoe Adhesive', 'liters', 1.00, 150.00),
(15, 9, 107, 'Shoe Adhesive', 'liters', 1.00, 150.00),
(16, 10, 103, 'Shoe Adhesive', 'liters', 1.00, 155.00),
(17, 11, 104, 'Shoe Adhesive', 'liters', 1.00, 151.00),
(18, 12, 79, 'Metal Buckles', 'pieces', 58.00, 35.50),
(19, 13, 81, 'Metal Buckles', 'pieces', 58.00, 35.50),
(20, 14, 77, 'Metal Buckles', 'pieces', 58.00, 36.00),
(21, 15, 80, 'Metal Buckles', 'pieces', 58.00, 34.50),
(22, 16, 78, 'Metal Buckles', 'pieces', 58.00, 34.50),
(23, 17, 76, 'Metal Buckles', 'pieces', 58.00, 35.00),
(24, 20, 123, 'Tissue Paper Rolls', 'pieces', 165.00, 0.86),
(25, 21, 121, 'Tissue Paper Rolls', 'pieces', 165.00, 0.88),
(26, 24, 20, 'Canvas Fabric', 'meters', 100.00, 98.00),
(27, 25, 19, 'Canvas Fabric', 'meters', 100.00, 97.00),
(28, 22, 43, 'Mesh Fabric', 'meters', 100.00, 127.00),
(29, 23, 41, 'Mesh Fabric', 'meters', 100.00, 130.00),
(30, 28, 50, 'Black Leather', 'square feet', 10.00, 238.00),
(31, 29, 52, 'Black Leather', 'square feet', 10.00, 238.00),
(32, 30, 48, 'Black Leather', 'square feet', 10.00, 250.00),
(33, 31, 51, 'Black Leather', 'square feet', 10.00, 245.00),
(34, 32, 49, 'Black Leather', 'square feet', 10.00, 240.00),
(35, 33, 47, 'Black Leather', 'square feet', 10.00, 235.00),
(36, 26, 123, 'Tissue Paper Rolls', 'pieces', 500.00, 0.86),
(37, 27, 121, 'Tissue Paper Rolls', 'pieces', 500.00, 0.88),
(38, 34, 35, 'Nubuck Leather', 'square feet', 1000.00, 262.00),
(39, 35, 37, 'Nubuck Leather', 'square feet', 1000.00, 262.00),
(40, 36, 34, 'Nubuck Leather', 'square feet', 1000.00, 252.00),
(41, 37, 36, 'Nubuck Leather', 'square feet', 1000.00, 264.00),
(42, 38, 88, 'Nubuck Leather', 'square feet', 1000.00, 258.00),
(43, 39, 33, 'Nubuck Leather', 'square feet', 1000.00, 260.00),
(44, 40, 57, 'EVA Foam Sheets', 'pairs', 10.00, 125.00),
(45, 41, 55, 'EVA Foam Sheets', 'pairs', 10.00, 130.00),
(46, 45, 79, 'Metal Buckles', 'pieces', 100.00, 35.50),
(47, 46, 81, 'Metal Buckles', 'pieces', 100.00, 35.50),
(48, 47, 77, 'Metal Buckles', 'pieces', 100.00, 36.00),
(49, 48, 80, 'Metal Buckles', 'pieces', 100.00, 34.50),
(50, 49, 78, 'Metal Buckles', 'pieces', 100.00, 34.50),
(51, 50, 76, 'Metal Buckles', 'pieces', 100.00, 35.00),
(52, 42, 50, 'Black Leather', 'square feet', 1.00, 238.00),
(53, 43, 52, 'Black Leather', 'square feet', 1.00, 238.00),
(54, 44, 48, 'Black Leather', 'square feet', 1.00, 250.00),
(55, 53, 21, 'Canvas Fabric', 'meters', 11.00, 96.00),
(56, 54, 20, 'Canvas Fabric', 'meters', 11.00, 98.00),
(57, 55, 50, 'Black Leather', 'square feet', 31313.00, 238.00),
(58, 56, 48, 'Black Leather', 'square feet', 31313.00, 250.00),
(59, 57, 57, 'EVA Foam Sheets', 'pairs', 2.00, 125.00),
(60, 58, 55, 'EVA Foam Sheets', 'pairs', 2.00, 130.00),
(61, 59, 117, 'Shoelaces', 'pieces', 100.00, 26.50),
(62, 60, 115, 'Shoelaces', 'pieces', 100.00, 27.00),
(63, 61, 57, 'EVA Foam Sheets', 'pairs', 100.00, 125.00),
(64, 62, 55, 'EVA Foam Sheets', 'pairs', 100.00, 130.00),
(65, 63, 117, 'Shoelaces', 'pieces', 100.00, 26.50),
(66, 64, 119, 'Shoelaces', 'pieces', 100.00, 26.50),
(67, 65, 115, 'Shoelaces', 'pieces', 100.00, 27.00),
(68, 66, 118, 'Shoelaces', 'pieces', 100.00, 25.50),
(69, 67, 116, 'Shoelaces', 'pieces', 100.00, 25.50),
(70, 68, 114, 'Shoelaces', 'pieces', 100.00, 26.00),
(71, 69, 105, 'Shoe Adhesive', 'liters', 100.00, 150.00),
(72, 70, 107, 'Shoe Adhesive', 'liters', 100.00, 150.00),
(73, 71, 103, 'Shoe Adhesive', 'liters', 100.00, 155.00),
(74, 72, 106, 'Shoe Adhesive', 'liters', 100.00, 152.00),
(75, 73, 104, 'Shoe Adhesive', 'liters', 100.00, 151.00),
(76, 74, 102, 'Shoe Adhesive', 'liters', 100.00, 152.00),
(77, 75, 92, 'Packaging Tape', 'rolls', 100.00, 46.50),
(78, 76, 94, 'Packaging Tape', 'rolls', 100.00, 46.50),
(79, 77, 90, 'Packaging Tape', 'rolls', 100.00, 48.00),
(80, 78, 92, 'Packaging Tape', 'rolls', 100.00, 46.50),
(81, 79, 94, 'Packaging Tape', 'rolls', 100.00, 46.50),
(82, 80, 90, 'Packaging Tape', 'rolls', 100.00, 48.00),
(83, 81, 79, 'Metal Buckles', 'pieces', 100.00, 35.50),
(84, 82, 81, 'Metal Buckles', 'pieces', 100.00, 35.50),
(85, 83, 77, 'Metal Buckles', 'pieces', 100.00, 36.00),
(86, 84, 78, 'Metal Buckles', 'pieces', 100.00, 34.50),
(87, 85, 63, 'Foam Insole', 'pairs', 100.00, 320.00),
(88, 86, 61, 'Foam Insole', 'pairs', 100.00, 322.00),
(89, 87, 21, 'Canvas Fabric', 'meters', 100.00, 96.00),
(90, 88, 23, 'Canvas Fabric', 'meters', 100.00, 96.00),
(91, 89, 20, 'Canvas Fabric', 'meters', 100.00, 98.00),
(92, 90, 22, 'Canvas Fabric', 'meters', 100.00, 97.00),
(93, 91, 53, 'Canvas Fabric', 'meters', 100.00, 95.00),
(94, 92, 19, 'Canvas Fabric', 'meters', 100.00, 97.00);

-- --------------------------------------------------------

--
-- Table structure for table `suppliers`
--

CREATE TABLE `suppliers` (
  `id` int(11) NOT NULL,
  `name` varchar(200) NOT NULL,
  `category` varchar(100) NOT NULL,
  `contact_person` varchar(100) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `rating` decimal(3,1) DEFAULT 0.0,
  `lead_time_days` int(11) DEFAULT 0,
  `payment_terms` varchar(50) DEFAULT 'Net 30',
  `status` varchar(20) DEFAULT 'Active',
  `is_active` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `suppliers`
--

INSERT INTO `suppliers` (`id`, `name`, `category`, `contact_person`, `phone`, `email`, `rating`, `lead_time_days`, `payment_terms`, `status`, `is_active`) VALUES
(1, 'Marikina Hide & Leather Co.', 'Leather Supplier', 'Ramon Villanueva', NULL, NULL, 4.9, 7, 'Net 30', 'Active', 1),
(2, 'Cordillera Leather Works', 'Leather Supplier', 'Elena Bautista', NULL, NULL, 4.7, 9, 'Net 45', 'Active', 1),
(3, 'SynthHide Textile Corp.', 'Textile Supplier', 'Michael Tan', NULL, NULL, 4.8, 7, 'Net 30', 'Active', 1),
(4, 'SoleTech Rubber Manufacturing', 'Sole Supplier', 'Mario Lim', NULL, NULL, 4.8, 8, 'Net 30', 'Active', 1),
(5, 'MetalCraft Shoe Hardware', 'Shoe Hardware', 'Victor Reyes', NULL, NULL, 4.4, 6, 'Net 30', 'Active', 1),
(6, 'EcoBox Packaging Solutions', 'Packaging Supplier', 'Rodel Mercado', NULL, NULL, 4.6, 7, 'Net 30', 'Active', 1);

-- --------------------------------------------------------

--
-- Table structure for table `supplier_items`
--

CREATE TABLE `supplier_items` (
  `id` int(11) NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `item_name` varchar(200) NOT NULL,
  `unit` varchar(20) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `supplier_items`
--

INSERT INTO `supplier_items` (`id`, `supplier_id`, `item_name`, `unit`, `unit_price`, `is_active`) VALUES
(1, 1, 'Leather Swatches', 'pack', 450.00, 1),
(2, 1, 'Leather Hides', 'sq.ft.', 1200.00, 1),
(3, 1, 'Leather Rolls', 'roll', 850.00, 1),
(4, 2, 'Leather Swatches', 'pack', 480.00, 1),
(5, 2, 'Leather Hides', 'sq.ft.', 1250.00, 1),
(6, 2, 'Distressed Leather', 'sq.ft.', 1150.00, 1),
(7, 3, 'Canvas Fabric', 'meter', 95.00, 0),
(8, 3, 'PU Leather', 'meter', 145.00, 0),
(9, 3, 'Nubuck Leather', 'sq.ft.', 258.00, 0),
(10, 4, 'Footwear Insole', 'pair', 45.00, 1),
(11, 4, 'Shoe Last', 'piece', 150.00, 1),
(12, 4, 'Shoe Outsole', 'pair', 110.00, 1),
(13, 5, 'Metal Eyelets', 'box', 15.00, 1),
(14, 5, 'Metal Hooks', 'box', 20.00, 1),
(15, 5, 'Shoelaces', 'pair', 30.00, 1),
(16, 6, 'Shoe Box', 'piece', 25.00, 1),
(17, 6, 'Kraft Paper', 'roll', 35.00, 1),
(18, 6, 'Packaging Tape', 'roll', 50.00, 0),
(19, 1, 'Canvas Fabric', 'meters', 97.00, 1),
(20, 2, 'Canvas Fabric', 'meters', 98.00, 1),
(21, 4, 'Canvas Fabric', 'meters', 96.00, 1),
(22, 5, 'Canvas Fabric', 'meters', 97.00, 1),
(23, 6, 'Canvas Fabric', 'meters', 96.00, 1),
(26, 1, 'PU Leather', 'meters', 148.00, 1),
(27, 2, 'PU Leather', 'meters', 152.00, 1),
(28, 4, 'PU Leather', 'meters', 149.00, 1),
(29, 5, 'PU Leather', 'meters', 147.00, 1),
(30, 6, 'PU Leather', 'meters', 149.00, 1),
(33, 1, 'Nubuck Leather', 'square feet', 260.00, 1),
(34, 2, 'Nubuck Leather', 'square feet', 252.00, 1),
(35, 4, 'Nubuck Leather', 'square feet', 262.00, 1),
(36, 5, 'Nubuck Leather', 'square feet', 264.00, 1),
(37, 6, 'Nubuck Leather', 'square feet', 262.00, 1),
(40, 2, 'Full-Grain Leather', 'sq. ft.', 240.00, 0),
(41, 2, 'Mesh Fabric', 'meters', 130.00, 1),
(42, 4, 'Full-Grain Leather', 'sq. ft.', 242.00, 0),
(43, 4, 'Mesh Fabric', 'meters', 127.00, 1),
(47, 1, 'Black Leather', 'square feet', 235.00, 1),
(48, 2, 'Black Leather', 'square feet', 250.00, 1),
(49, 3, 'Black Leather', 'square feet', 240.00, 1),
(50, 4, 'Black Leather', 'square feet', 238.00, 1),
(51, 5, 'Black Leather', 'square feet', 245.00, 1),
(52, 6, 'Black Leather', 'square feet', 238.00, 1),
(53, 3, 'Canvas Fabric', 'meters', 95.00, 1),
(54, 1, 'EVA Foam Sheets', 'pairs', 128.00, 1),
(55, 2, 'EVA Foam Sheets', 'pairs', 130.00, 1),
(56, 3, 'EVA Foam Sheets', 'pairs', 126.00, 1),
(57, 4, 'EVA Foam Sheets', 'pairs', 125.00, 1),
(58, 5, 'EVA Foam Sheets', 'pairs', 128.00, 1),
(59, 6, 'EVA Foam Sheets', 'pairs', 125.00, 1),
(60, 1, 'Foam Insole', 'pairs', 318.00, 1),
(61, 2, 'Foam Insole', 'pairs', 322.00, 1),
(62, 3, 'Foam Insole', 'pairs', 316.00, 1),
(63, 4, 'Foam Insole', 'pairs', 320.00, 1),
(64, 5, 'Foam Insole', 'pairs', 315.00, 1),
(65, 6, 'Foam Insole', 'pairs', 320.00, 1),
(66, 1, 'Full-Grain Leather', 'square feet', 240.00, 1),
(67, 2, 'Full-Grain Leather', 'square feet', 235.00, 1),
(68, 3, 'Full-Grain Leather', 'square feet', 245.00, 1),
(69, 4, 'Full-Grain Leather', 'square feet', 242.00, 1),
(70, 5, 'Full-Grain Leather', 'square feet', 244.00, 1),
(71, 6, 'Full-Grain Leather', 'square feet', 242.00, 1),
(72, 1, 'Mesh Fabric', 'meters', 128.00, 1),
(73, 3, 'Mesh Fabric', 'meters', 125.00, 1),
(74, 5, 'Mesh Fabric', 'meters', 129.00, 1),
(75, 6, 'Mesh Fabric', 'meters', 127.00, 1),
(76, 1, 'Metal Buckles', 'pieces', 35.00, 1),
(77, 2, 'Metal Buckles', 'pieces', 36.00, 1),
(78, 3, 'Metal Buckles', 'pieces', 34.50, 1),
(79, 4, 'Metal Buckles', 'pieces', 35.50, 1),
(80, 5, 'Metal Buckles', 'pieces', 34.50, 1),
(81, 6, 'Metal Buckles', 'pieces', 35.50, 1),
(82, 1, 'Metal Eyelets', 'gross', 82.00, 1),
(83, 2, 'Metal Eyelets', 'gross', 85.00, 1),
(84, 3, 'Metal Eyelets', 'gross', 81.00, 1),
(85, 4, 'Metal Eyelets', 'gross', 83.00, 1),
(86, 5, 'Metal Eyelets', 'gross', 80.00, 1),
(87, 6, 'Metal Eyelets', 'gross', 83.00, 1),
(88, 3, 'Nubuck Leather', 'square feet', 258.00, 1),
(89, 1, 'Packaging Tape', 'rolls', 46.00, 1),
(90, 2, 'Packaging Tape', 'rolls', 48.00, 1),
(91, 3, 'Packaging Tape', 'rolls', 45.50, 1),
(92, 4, 'Packaging Tape', 'rolls', 46.50, 1),
(93, 5, 'Packaging Tape', 'rolls', 46.00, 1),
(94, 6, 'Packaging Tape', 'rolls', 46.50, 1),
(95, 3, 'PU Leather', 'meters', 145.00, 1),
(96, 1, 'Rubber Sole', 'pairs', 510.00, 1),
(97, 2, 'Rubber Sole', 'pairs', 515.00, 1),
(98, 3, 'Rubber Sole', 'pairs', 508.00, 1),
(99, 4, 'Rubber Sole', 'pairs', 505.00, 1),
(100, 5, 'Rubber Sole', 'pairs', 512.00, 1),
(101, 6, 'Rubber Sole', 'pairs', 505.00, 1),
(102, 1, 'Shoe Adhesive', 'liters', 152.00, 1),
(103, 2, 'Shoe Adhesive', 'liters', 155.00, 1),
(104, 3, 'Shoe Adhesive', 'liters', 151.00, 1),
(105, 4, 'Shoe Adhesive', 'liters', 150.00, 1),
(106, 5, 'Shoe Adhesive', 'liters', 152.00, 1),
(107, 6, 'Shoe Adhesive', 'liters', 150.00, 1),
(108, 1, 'Shoe Boxes (Eco Friendly)', 'pieces', 12.50, 1),
(109, 2, 'Shoe Boxes (Eco Friendly)', 'pieces', 13.00, 1),
(110, 3, 'Shoe Boxes (Eco Friendly)', 'pieces', 12.30, 1),
(111, 4, 'Shoe Boxes (Eco Friendly)', 'pieces', 12.40, 1),
(112, 5, 'Shoe Boxes (Eco Friendly)', 'pieces', 12.60, 1),
(113, 6, 'Shoe Boxes (Eco Friendly)', 'pieces', 12.40, 1),
(114, 1, 'Shoelaces', 'pieces', 26.00, 1),
(115, 2, 'Shoelaces', 'pieces', 27.00, 1),
(116, 3, 'Shoelaces', 'pieces', 25.50, 1),
(117, 4, 'Shoelaces', 'pieces', 26.50, 1),
(118, 5, 'Shoelaces', 'pieces', 25.50, 1),
(119, 6, 'Shoelaces', 'pieces', 26.50, 1),
(120, 1, 'Tissue Paper Rolls', 'pieces', 0.86, 1),
(121, 2, 'Tissue Paper Rolls', 'pieces', 0.88, 1),
(122, 3, 'Tissue Paper Rolls', 'pieces', 0.85, 1),
(123, 4, 'Tissue Paper Rolls', 'pieces', 0.86, 1),
(124, 5, 'Tissue Paper Rolls', 'pieces', 0.86, 1),
(125, 6, 'Tissue Paper Rolls', 'pieces', 0.86, 1);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `hr_employee_id` int(11) NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `email` varchar(255) NOT NULL,
  `role` varchar(20) NOT NULL CHECK (`role` in ('buyer','manager','clerk')),
  `department` varchar(100) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `hr_employee_id`, `full_name`, `email`, `role`, `department`, `is_active`, `created_at`) VALUES
(1, 12, 'Buyer', 'prbuyer@gmail.com', 'buyer', 'Procurement', 1, '2026-10-30 12:14:50'),
(2, 11, 'Carlo Diaz', 'prmanager@gmail.com', 'manager', 'Procurement', 1, '2026-10-30 12:14:50'),
(3, 102, 'Pedro Reyes', 'pedro@company.com', 'clerk', 'Warehouse', 1, '2026-10-30 12:14:50');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `buyer_invoice_demo_approvals`
--
ALTER TABLE `buyer_invoice_demo_approvals`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_invoice_demo_audit` (`invoice_id`,`verified_at`),
  ADD KEY `idx_buyer_demo_audit` (`buyer_id`,`verified_at`);

--
-- Indexes for table `buyer_invoice_source_local`
--
ALTER TABLE `buyer_invoice_source_local`
  ADD PRIMARY KEY (`invoice_id`),
  ADD UNIQUE KEY `uq_supplier_invoice_local` (`supplier_id`,`supplier_invoice_reference`),
  ADD KEY `idx_invoice_source_kind` (`source_kind`);

--
-- Indexes for table `buyer_settings`
--
ALTER TABLE `buyer_settings`
  ADD PRIMARY KEY (`buyer_id`);

--
-- Indexes for table `finance_procurement_invoice_inbox`
--
ALTER TABLE `finance_procurement_invoice_inbox`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_fin_proc_request` (`request_ref`),
  ADD UNIQUE KEY `uq_fin_proc_invoice` (`invoice_number`),
  ADD KEY `idx_fin_proc_ack` (`ack_state`);

--
-- Indexes for table `inventory_request_pr_links`
--
ALTER TABLE `inventory_request_pr_links`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_inventory_request_number` (`inventory_request_number`),
  ADD UNIQUE KEY `uq_pr_id` (`pr_id`),
  ADD KEY `idx_buyer_id` (`buyer_id`);

--
-- Indexes for table `invoices`
--
ALTER TABLE `invoices`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `invoice_number` (`invoice_number`),
  ADD KEY `po_id` (`po_id`),
  ADD KEY `supplier_id` (`supplier_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `invoice_items`
--
ALTER TABLE `invoice_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `invoice_id` (`invoice_id`),
  ADD KEY `po_item_id` (`po_item_id`);

--
-- Indexes for table `manager_settings`
--
ALTER TABLE `manager_settings`
  ADD PRIMARY KEY (`user_id`);

--
-- Indexes for table `po_demo_tracking`
--
ALTER TABLE `po_demo_tracking`
  ADD PRIMARY KEY (`po_id`);

--
-- Indexes for table `po_items`
--
ALTER TABLE `po_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `po_id` (`po_id`),
  ADD KEY `supplier_item_id` (`supplier_item_id`),
  ADD KEY `updated_by` (`updated_by`);

--
-- Indexes for table `procurement_audit_logs`
--
ALTER TABLE `procurement_audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_proc_audit_time` (`event_time`,`id`),
  ADD KEY `idx_proc_audit_actor` (`actor_user_id`,`event_time`),
  ADD KEY `idx_proc_audit_role_action` (`actor_role`,`action_name`,`event_time`),
  ADD KEY `idx_proc_audit_module` (`module_name`,`event_time`);

--
-- Indexes for table `procurement_buyer_notification_reads`
--
ALTER TABLE `procurement_buyer_notification_reads`
  ADD PRIMARY KEY (`buyer_id`,`event_key`),
  ADD KEY `idx_notification_reads_buyer` (`buyer_id`,`read_at`);

--
-- Indexes for table `procurement_finance_invoice_events`
--
ALTER TABLE `procurement_finance_invoice_events`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_fih_decision_ref` (`decision_reference`),
  ADD KEY `idx_fih_events_handoff` (`handoff_id`,`recorded_at`),
  ADD KEY `idx_fih_events_invoice` (`invoice_id`,`recorded_at`);

--
-- Indexes for table `procurement_finance_invoice_handoffs`
--
ALTER TABLE `procurement_finance_invoice_handoffs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_fih_invoice` (`invoice_id`),
  ADD UNIQUE KEY `uq_fih_request` (`request_ref`),
  ADD KEY `idx_fih_status` (`handoff_status`,`submitted_at`),
  ADD KEY `idx_fih_buyer` (`buyer_id`,`submitted_at`);

--
-- Indexes for table `procurement_finance_quotes`
--
ALTER TABLE `procurement_finance_quotes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_finance_request_rfq` (`rfq_id`),
  ADD KEY `idx_finance_status` (`review_status`,`submitted_at`),
  ADD KEY `fk_finance_req_quote` (`quote_id`),
  ADD KEY `fk_finance_req_buyer` (`buyer_id`);

--
-- Indexes for table `procurement_finance_quote_decisions`
--
ALTER TABLE `procurement_finance_quote_decisions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_finance_decision_request_round` (`finance_request_id`,`request_version`),
  ADD UNIQUE KEY `uq_finance_decision_ref` (`decision_reference`),
  ADD KEY `idx_finance_decision_rfq` (`rfq_id`,`recorded_at`);

--
-- Indexes for table `procurement_finance_rfq_approvals`
--
ALTER TABLE `procurement_finance_rfq_approvals`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `rfq_id` (`rfq_id`);

--
-- Indexes for table `procurement_inventory_receipts`
--
ALTER TABLE `procurement_inventory_receipts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_inventory_receipt` (`request_number`,`receipt_number`),
  ADD KEY `idx_verified_po` (`po_id`);

--
-- Indexes for table `procurement_inventory_receipt_items`
--
ALTER TABLE `procurement_inventory_receipt_items`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_receipt_po_line` (`receipt_id`,`po_item_id`),
  ADD KEY `idx_receipt_po_line` (`po_item_id`);

--
-- Indexes for table `procurement_inventory_receiving_warehouses`
--
ALTER TABLE `procurement_inventory_receiving_warehouses`
  ADD PRIMARY KEY (`inventory_request_number`),
  ADD UNIQUE KEY `uq_inventory_receiving_pr` (`pr_id`);

--
-- Indexes for table `procurement_inventory_sync_outbox`
--
ALTER TABLE `procurement_inventory_sync_outbox`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_inventory_event` (`event_type`,`source_id`);

--
-- Indexes for table `procurement_invoice_discrepancies`
--
ALTER TABLE `procurement_invoice_discrepancies`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_invoice_status` (`invoice_id`,`status`),
  ADD KEY `idx_po` (`po_id`),
  ADD KEY `fk_invoice_discrepancy_buyer` (`buyer_id`);

--
-- Indexes for table `procurement_invoice_email_receipts`
--
ALTER TABLE `procurement_invoice_email_receipts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_inv_email_invoice` (`invoice_id`),
  ADD KEY `idx_inv_email_po` (`po_id`);

--
-- Indexes for table `procurement_invoice_email_receipt_audit`
--
ALTER TABLE `procurement_invoice_email_receipt_audit`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_inv_email_revision` (`report_id`,`revision`);

--
-- Indexes for table `procurement_invoice_email_receipt_items`
--
ALTER TABLE `procurement_invoice_email_receipt_items`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_inv_email_report_item` (`report_id`,`po_item_id`);

--
-- Indexes for table `procurement_manager_notification_reads`
--
ALTER TABLE `procurement_manager_notification_reads`
  ADD PRIMARY KEY (`manager_id`,`event_key`);

--
-- Indexes for table `procurement_po_notification_events`
--
ALTER TABLE `procurement_po_notification_events`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_po_event_type` (`po_id`,`event_type`),
  ADD KEY `idx_po_notify_buyer` (`buyer_id`,`event_type`,`recorded_at`),
  ADD KEY `idx_po_notify_event` (`event_type`,`recorded_at`);

--
-- Indexes for table `procurement_pr_item_descriptions`
--
ALTER TABLE `procurement_pr_item_descriptions`
  ADD PRIMARY KEY (`item_id`),
  ADD KEY `idx_pr_item_descriptions` (`pr_id`);

--
-- Indexes for table `procurement_pr_rejection_history`
--
ALTER TABLE `procurement_pr_rejection_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_pr_history` (`pr_id`,`id`);

--
-- Indexes for table `procurement_pr_revision_baselines`
--
ALTER TABLE `procurement_pr_revision_baselines`
  ADD PRIMARY KEY (`pr_id`);

--
-- Indexes for table `procurement_support_tickets`
--
ALTER TABLE `procurement_support_tickets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_requester_created` (`requester_user_id`,`created_at`),
  ADD KEY `idx_ticket_status` (`status`);

--
-- Indexes for table `procurement_support_ticket_files`
--
ALTER TABLE `procurement_support_ticket_files`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ticket_id` (`ticket_id`);

--
-- Indexes for table `pr_items`
--
ALTER TABLE `pr_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `pr_id` (`pr_id`);

--
-- Indexes for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `po_number` (`po_number`),
  ADD KEY `rfq_id` (`rfq_id`),
  ADD KEY `rfq_quote_id` (`rfq_quote_id`),
  ADD KEY `supplier_id` (`supplier_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `purchase_requisitions`
--
ALTER TABLE `purchase_requisitions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `pr_number` (`pr_number`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `approved_by` (`approved_by`);

--
-- Indexes for table `purchase_requisition_attachments`
--
ALTER TABLE `purchase_requisition_attachments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_pr_attachments_pr_id` (`pr_id`);

--
-- Indexes for table `rfqs`
--
ALTER TABLE `rfqs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `rfq_number` (`rfq_number`),
  ADD KEY `pr_id` (`pr_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `rfq_quotes`
--
ALTER TABLE `rfq_quotes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uk_rfq_supplier` (`rfq_id`,`supplier_id`),
  ADD KEY `supplier_id` (`supplier_id`);

--
-- Indexes for table `rfq_quote_items`
--
ALTER TABLE `rfq_quote_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `rfq_quote_id` (`rfq_quote_id`),
  ADD KEY `supplier_item_id` (`supplier_item_id`);

--
-- Indexes for table `suppliers`
--
ALTER TABLE `suppliers`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `supplier_items`
--
ALTER TABLE `supplier_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `supplier_id` (`supplier_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `hr_employee_id` (`hr_employee_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `buyer_invoice_demo_approvals`
--
ALTER TABLE `buyer_invoice_demo_approvals`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `finance_procurement_invoice_inbox`
--
ALTER TABLE `finance_procurement_invoice_inbox`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `inventory_request_pr_links`
--
ALTER TABLE `inventory_request_pr_links`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `invoices`
--
ALTER TABLE `invoices`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `invoice_items`
--
ALTER TABLE `invoice_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;

--
-- AUTO_INCREMENT for table `po_items`
--
ALTER TABLE `po_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `procurement_audit_logs`
--
ALTER TABLE `procurement_audit_logs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=49;

--
-- AUTO_INCREMENT for table `procurement_finance_invoice_events`
--
ALTER TABLE `procurement_finance_invoice_events`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `procurement_finance_invoice_handoffs`
--
ALTER TABLE `procurement_finance_invoice_handoffs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `procurement_finance_quotes`
--
ALTER TABLE `procurement_finance_quotes`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `procurement_finance_quote_decisions`
--
ALTER TABLE `procurement_finance_quote_decisions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `procurement_finance_rfq_approvals`
--
ALTER TABLE `procurement_finance_rfq_approvals`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `procurement_inventory_receipts`
--
ALTER TABLE `procurement_inventory_receipts`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `procurement_inventory_receipt_items`
--
ALTER TABLE `procurement_inventory_receipt_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `procurement_inventory_sync_outbox`
--
ALTER TABLE `procurement_inventory_sync_outbox`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `procurement_invoice_discrepancies`
--
ALTER TABLE `procurement_invoice_discrepancies`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `procurement_invoice_email_receipts`
--
ALTER TABLE `procurement_invoice_email_receipts`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `procurement_invoice_email_receipt_audit`
--
ALTER TABLE `procurement_invoice_email_receipt_audit`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `procurement_invoice_email_receipt_items`
--
ALTER TABLE `procurement_invoice_email_receipt_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `procurement_po_notification_events`
--
ALTER TABLE `procurement_po_notification_events`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `procurement_pr_rejection_history`
--
ALTER TABLE `procurement_pr_rejection_history`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `procurement_support_tickets`
--
ALTER TABLE `procurement_support_tickets`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `procurement_support_ticket_files`
--
ALTER TABLE `procurement_support_ticket_files`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pr_items`
--
ALTER TABLE `pr_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=108;

--
-- AUTO_INCREMENT for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `purchase_requisitions`
--
ALTER TABLE `purchase_requisitions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=56;

--
-- AUTO_INCREMENT for table `purchase_requisition_attachments`
--
ALTER TABLE `purchase_requisition_attachments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `rfqs`
--
ALTER TABLE `rfqs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT for table `rfq_quotes`
--
ALTER TABLE `rfq_quotes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=93;

--
-- AUTO_INCREMENT for table `rfq_quote_items`
--
ALTER TABLE `rfq_quote_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=95;

--
-- AUTO_INCREMENT for table `suppliers`
--
ALTER TABLE `suppliers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `supplier_items`
--
ALTER TABLE `supplier_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=126;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `invoices`
--
ALTER TABLE `invoices`
  ADD CONSTRAINT `invoices_ibfk_1` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders` (`id`),
  ADD CONSTRAINT `invoices_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
  ADD CONSTRAINT `invoices_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `invoice_items`
--
ALTER TABLE `invoice_items`
  ADD CONSTRAINT `invoice_items_ibfk_1` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `invoice_items_ibfk_2` FOREIGN KEY (`po_item_id`) REFERENCES `po_items` (`id`);

--
-- Constraints for table `po_items`
--
ALTER TABLE `po_items`
  ADD CONSTRAINT `po_items_ibfk_1` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `po_items_ibfk_2` FOREIGN KEY (`supplier_item_id`) REFERENCES `supplier_items` (`id`),
  ADD CONSTRAINT `po_items_ibfk_3` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `procurement_finance_quotes`
--
ALTER TABLE `procurement_finance_quotes`
  ADD CONSTRAINT `fk_finance_req_buyer` FOREIGN KEY (`buyer_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_finance_req_quote` FOREIGN KEY (`quote_id`) REFERENCES `rfq_quotes` (`id`),
  ADD CONSTRAINT `fk_finance_req_rfq` FOREIGN KEY (`rfq_id`) REFERENCES `rfqs` (`id`);

--
-- Constraints for table `procurement_finance_quote_decisions`
--
ALTER TABLE `procurement_finance_quote_decisions`
  ADD CONSTRAINT `fk_finance_decision_request` FOREIGN KEY (`finance_request_id`) REFERENCES `procurement_finance_quotes` (`id`);

--
-- Constraints for table `procurement_inventory_receipt_items`
--
ALTER TABLE `procurement_inventory_receipt_items`
  ADD CONSTRAINT `fk_uniprocur_verified_receipt` FOREIGN KEY (`receipt_id`) REFERENCES `procurement_inventory_receipts` (`id`);

--
-- Constraints for table `procurement_invoice_discrepancies`
--
ALTER TABLE `procurement_invoice_discrepancies`
  ADD CONSTRAINT `fk_invoice_discrepancy_buyer` FOREIGN KEY (`buyer_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_invoice_discrepancy_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`),
  ADD CONSTRAINT `fk_invoice_discrepancy_po` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders` (`id`);

--
-- Constraints for table `procurement_support_ticket_files`
--
ALTER TABLE `procurement_support_ticket_files`
  ADD CONSTRAINT `fk_support_ticket_file` FOREIGN KEY (`ticket_id`) REFERENCES `procurement_support_tickets` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `pr_items`
--
ALTER TABLE `pr_items`
  ADD CONSTRAINT `pr_items_ibfk_1` FOREIGN KEY (`pr_id`) REFERENCES `purchase_requisitions` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  ADD CONSTRAINT `purchase_orders_ibfk_1` FOREIGN KEY (`rfq_id`) REFERENCES `rfqs` (`id`),
  ADD CONSTRAINT `purchase_orders_ibfk_2` FOREIGN KEY (`rfq_quote_id`) REFERENCES `rfq_quotes` (`id`),
  ADD CONSTRAINT `purchase_orders_ibfk_3` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`),
  ADD CONSTRAINT `purchase_orders_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `purchase_requisitions`
--
ALTER TABLE `purchase_requisitions`
  ADD CONSTRAINT `purchase_requisitions_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `purchase_requisitions_ibfk_2` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `purchase_requisition_attachments`
--
ALTER TABLE `purchase_requisition_attachments`
  ADD CONSTRAINT `fk_pr_attachments_pr` FOREIGN KEY (`pr_id`) REFERENCES `purchase_requisitions` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `rfqs`
--
ALTER TABLE `rfqs`
  ADD CONSTRAINT `rfqs_ibfk_1` FOREIGN KEY (`pr_id`) REFERENCES `purchase_requisitions` (`id`),
  ADD CONSTRAINT `rfqs_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `rfq_quotes`
--
ALTER TABLE `rfq_quotes`
  ADD CONSTRAINT `rfq_quotes_ibfk_1` FOREIGN KEY (`rfq_id`) REFERENCES `rfqs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `rfq_quotes_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`);

--
-- Constraints for table `rfq_quote_items`
--
ALTER TABLE `rfq_quote_items`
  ADD CONSTRAINT `rfq_quote_items_ibfk_1` FOREIGN KEY (`rfq_quote_id`) REFERENCES `rfq_quotes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `rfq_quote_items_ibfk_2` FOREIGN KEY (`supplier_item_id`) REFERENCES `supplier_items` (`id`);

--
-- Constraints for table `supplier_items`
--
ALTER TABLE `supplier_items`
  ADD CONSTRAINT `supplier_items_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
