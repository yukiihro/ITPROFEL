-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Nov 18, 2026 at 03:49 PM
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
-- Database: `team_sales`
--

-- --------------------------------------------------------

--
-- Table structure for table `account_receivable`
--

CREATE TABLE `account_receivable` (
  `ar_id` int(10) UNSIGNED NOT NULL,
  `invoice_id` int(10) UNSIGNED NOT NULL,
  `customer_id` int(10) UNSIGNED NOT NULL,
  `amount_due` decimal(12,2) NOT NULL DEFAULT 0.00,
  `due_date` date NOT NULL,
  `status` enum('Current','Overdue','Paid') NOT NULL DEFAULT 'Current',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `account_receivable`
--

INSERT INTO `account_receivable` (`ar_id`, `invoice_id`, `customer_id`, `amount_due`, `due_date`, `status`, `created_at`) VALUES
(1, 1, 2, 12000.00, '2026-11-03', 'Paid', '2026-10-09 04:13:58');

-- --------------------------------------------------------

--
-- Table structure for table `activity_logs`
--

CREATE TABLE `activity_logs` (
  `log_id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `action` varchar(80) NOT NULL,
  `module` varchar(80) NOT NULL,
  `record_id` int(10) UNSIGNED DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `activity_logs`
--

INSERT INTO `activity_logs` (`log_id`, `user_id`, `action`, `module`, `record_id`, `description`, `created_at`) VALUES
(1, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-10-09 05:59:21'),
(2, 3, 'Create', 'Customer Order Request', 6, 'Customer submitted REQ-3004 for SH-003', '2026-10-09 05:59:54'),
(3, 1, 'Create', 'Quotation', 3, 'Created QT-2003 for customer order REQ-3004', '2026-10-09 06:00:04'),
(4, 3, 'Create', 'Customer Order Request', 7, 'Customer submitted REQ-3007 for SH-001', '2026-10-09 06:00:46'),
(5, 1, 'Create', 'Quotation', 4, 'Created QT-2004 for customer order REQ-3007', '2026-10-09 06:01:29'),
(6, 1, 'Approve', 'Quotation', 4, 'Sales Admin approved quotation QT-2004', '2026-10-09 06:01:38'),
(7, 3, 'Approved', 'Quotation', 4, 'Customer Approved quotation QT-2004 -> Purchase Order PO-4002', '2026-10-09 06:01:52'),
(8, 1, 'Create', 'Sales Order', NULL, 'Created SO-1002 from PO-4002', '2026-10-09 06:01:55'),
(9, 1, 'Approve', 'Sales Order', 2, 'Approved SO-1002 -> DEL-702 (Team Sales Inventory deducted)', '2026-10-09 06:02:23'),
(10, 1, 'Update', 'Delivery', 2, 'Delivery status set to Delivered', '2026-10-09 06:03:06'),
(11, 1, 'Create', 'Inventory Stock Request', 3, 'Requested Inventory stock for quotation QT-2003', '2026-10-09 06:04:34'),
(12, 3, 'Create', 'Customer Order Request', 8, 'Customer submitted REQ-3008 for SH-002', '2026-10-09 06:09:13'),
(13, 1, 'Create', 'Quotation', 5, 'Created QT-2005 for customer order REQ-3008', '2026-10-09 06:09:22'),
(14, 1, 'Create', 'Inventory Stock Request', 5, 'Requested Inventory stock for quotation QT-2005', '2026-10-09 06:09:54'),
(15, 1, 'Create', 'Inventory Stock Request', 5, 'Requested Inventory stock for quotation QT-2005', '2026-10-09 06:09:59'),
(16, 3, 'Create', 'Customer Order Request', 9, 'Customer submitted REQ-3009 for SH-001', '2026-10-09 06:24:34'),
(17, 3, 'Create', 'Customer Order Request', 10, 'Customer submitted REQ-3010 for SH-002', '2026-10-09 06:49:20'),
(18, 1, 'Create', 'Quotation', 6, 'Created QT-2006 for customer order REQ-3010', '2026-10-09 06:50:00'),
(19, 1, 'Create', 'Inventory Stock Request', 5, 'Requested Inventory stock for quotation QT-2005', '2026-10-09 06:50:12'),
(20, 1, 'Create', 'Inventory Stock Request', 5, 'Requested Inventory stock for quotation QT-2005', '2026-10-09 06:50:15'),
(21, 1, 'Create', 'Inventory Stock Request', 6, 'Requested Inventory stock for quotation QT-2006', '2026-10-09 06:50:20'),
(22, 1, 'Approve', 'Quotation', 6, 'Sales Admin approved quotation QT-2006', '2026-10-09 06:51:14'),
(23, 3, 'Approved', 'Quotation', 6, 'Customer Approved quotation QT-2006 -> Purchase Order PO-4003', '2026-10-09 06:51:46'),
(24, 1, 'Create', 'Sales Order', NULL, 'Created SO-1003 from PO-4003', '2026-10-09 06:51:51'),
(25, 1, 'Approve', 'Sales Order', 3, 'Approved SO-1003 -> DEL-703 (Team Sales Inventory deducted)', '2026-10-09 06:52:11'),
(26, 1, 'Update', 'Delivery', 3, 'Delivery status set to Delivered', '2026-10-09 06:53:21'),
(27, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-10-09 08:32:42'),
(28, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-10-09 20:17:34'),
(29, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-10-09 20:18:01'),
(30, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-10-09 20:20:28'),
(31, 3, 'Create', 'Customer Order Request', 11, 'Customer submitted REQ-3011 for SH-003', '2026-10-09 20:22:10'),
(32, 3, 'Create', 'Customer Order Request', 12, 'Customer submitted REQ-3012 for SH-002', '2026-10-09 20:23:16'),
(33, 3, 'Create', 'Customer Order Request', 13, 'Customer submitted REQ-3013 for SH-003', '2026-10-09 20:23:34'),
(34, 2, 'Create', 'Quotation', 7, 'Created QT-2007 for customer order REQ-3013', '2026-10-09 20:23:53'),
(35, 1, 'Create', 'Inventory Stock Request', 7, 'Requested Inventory stock for quotation QT-2007', '2026-10-09 20:24:09'),
(36, 1, 'Approve', 'Quotation', 7, 'Sales Admin approved quotation QT-2007', '2026-10-09 20:25:00'),
(37, 3, 'Approved', 'Quotation', 7, 'Customer Approved quotation QT-2007 -> Purchase Order PO-4004', '2026-10-09 20:25:33'),
(38, 2, 'Create', 'Sales Order', NULL, 'Created SO-1004 from PO-4004', '2026-10-09 20:25:45'),
(39, 1, 'Approve', 'Sales Order', 4, 'Approved SO-1004 -> DEL-704 (Team Sales Inventory deducted)', '2026-10-09 20:25:59'),
(40, 2, 'Update', 'Delivery', 4, 'Delivery status set to In Transit', '2026-10-09 20:26:12'),
(41, 2, 'Update', 'Delivery', 4, 'Delivery status set to Delivered', '2026-10-09 20:27:13'),
(42, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-10-10 05:20:19'),
(43, 3, 'Create', 'Customer Order Request', 14, 'Customer submitted REQ-3014 for SH-003', '2026-10-10 05:21:54'),
(44, 2, 'Create', 'Quotation', 8, 'Created QT-2008 for customer order REQ-3014', '2026-10-10 05:22:07'),
(45, 1, 'Create', 'Inventory Stock Request', 8, 'Requested Inventory stock for quotation QT-2008', '2026-10-10 05:22:16'),
(46, 3, 'Approved', 'Quotation', 8, 'Customer Approved quotation QT-2008 -> Purchase Order PO-4005', '2026-10-10 05:23:01'),
(47, 1, 'Approve', 'Quotation', 8, 'Sales Admin approved quotation QT-2008', '2026-10-10 05:23:15'),
(48, 1, 'Approve', 'Quotation', 5, 'Sales Admin approved quotation QT-2005', '2026-10-10 05:23:27'),
(49, 3, 'Create', 'Customer Order Request', 15, 'Customer submitted REQ-3015 for SH-003', '2026-10-10 05:24:26'),
(50, 2, 'Create', 'Quotation', 9, 'Created QT-2009 for customer order REQ-3015', '2026-10-10 05:25:16'),
(51, 1, 'Approve', 'Quotation', 9, 'Sales Admin approved quotation QT-2009', '2026-10-10 05:25:35'),
(52, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-10-10 05:26:11'),
(53, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-10-10 23:39:18'),
(54, 3, 'Create', 'Customer Order Request', 16, 'Customer submitted REQ-3016 for SH-001', '2026-10-10 23:42:30'),
(55, 2, 'Create', 'Quotation', 10, 'Created QT-2010 for customer order REQ-3016', '2026-10-10 23:42:50'),
(56, 1, 'Approve', 'Quotation', 10, 'Sales Admin approved quotation QT-2010', '2026-10-10 23:43:25'),
(57, 3, 'Approved', 'Quotation', 10, 'Customer Approved quotation QT-2010 -> Purchase Order PO-4006', '2026-10-10 23:43:49'),
(58, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-10-26 23:19:51'),
(59, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-10-26 23:20:23'),
(60, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-10-26 23:32:53'),
(61, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-10-27 01:51:12'),
(62, 1, 'Create', 'Inventory Stock Request', 34, 'Created specific stock request REQ-SALES-025', '2026-10-27 01:52:15'),
(63, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-10-27 04:09:26');

-- --------------------------------------------------------

--
-- Table structure for table `collections`
--

CREATE TABLE `collections` (
  `col_id` int(10) UNSIGNED NOT NULL,
  `collection_no` varchar(30) NOT NULL,
  `invoice_id` int(10) UNSIGNED NOT NULL,
  `collection_date` date NOT NULL,
  `due_date` date DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `method` enum('Cash','GCash','Bank Transfer') NOT NULL DEFAULT 'Cash',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `collections`
--

INSERT INTO `collections` (`col_id`, `collection_no`, `invoice_id`, `collection_date`, `due_date`, `amount`, `method`, `created_at`) VALUES
(1, 'COL-0001', 1, '2026-10-04', '2026-11-03', 12000.00, 'GCash', '2026-10-09 04:13:58'),
(2, 'COL-502', 2, '2026-10-09', '2026-11-08', 150000.00, 'Cash', '2026-10-09 06:02:57'),
(3, 'COL-503', 3, '2026-10-09', '2026-11-08', 150018.00, 'Cash', '2026-10-09 06:53:04'),
(4, 'COL-504', 4, '2026-10-09', '2026-11-08', 150000.00, 'Bank Transfer', '2026-10-09 20:27:01');

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

CREATE TABLE `customers` (
  `cus_id` int(10) UNSIGNED NOT NULL,
  `customer_code` varchar(30) NOT NULL,
  `customer_name` varchar(120) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `province` varchar(100) DEFAULT NULL,
  `payment_terms` varchar(60) NOT NULL DEFAULT '30 Days',
  `credit_limit` decimal(12,2) NOT NULL DEFAULT 0.00,
  `status` enum('Active','Inactive') NOT NULL DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `customers`
--

INSERT INTO `customers` (`cus_id`, `customer_code`, `customer_name`, `phone`, `email`, `address`, `city`, `province`, `payment_terms`, `credit_limit`, `status`, `created_at`, `updated_at`) VALUES
(1, 'CUS-001', 'Banaag Studio', '09171234567', 'banaagstudio@gmail.com', 'Rizal Avenue', 'San Pablo City', 'Laguna', '30 Days', 50000.00, 'Active', '2026-10-09 04:13:58', '2026-10-09 04:13:58'),
(2, 'CUS-002', 'Ilagan Print Co.', '09181234567', 'ilaganprint@gmail.com', 'Maharlika Highway', 'San Pablo City', 'Laguna', '30 Days', 75000.00, 'Active', '2026-10-09 04:13:58', '2026-10-09 04:13:58'),
(3, 'CUS-003', 'San Pablo Supplies', '09191234567', 'sanpablosupplies@gmail.com', 'Barangay San Rafael', 'San Pablo City', 'Laguna', '15 Days', 100000.00, 'Active', '2026-10-09 04:13:58', '2026-10-09 04:13:58'),
(4, 'CUS-004', 'asdasdasd', '09171234567', 'justinebundalian76@gmail.com', 'Sta. Elena', NULL, NULL, '30 Days', 0.00, 'Active', '2026-10-26 07:51:22', '2026-10-26 07:51:22');

-- --------------------------------------------------------

--
-- Table structure for table `customer_balance`
--

CREATE TABLE `customer_balance` (
  `cb_id` int(10) UNSIGNED NOT NULL,
  `customer_id` int(10) UNSIGNED NOT NULL,
  `total_billed` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total_paid` decimal(12,2) NOT NULL DEFAULT 0.00,
  `outstanding_balance` decimal(12,2) NOT NULL DEFAULT 0.00,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `customer_balance`
--

INSERT INTO `customer_balance` (`cb_id`, `customer_id`, `total_billed`, `total_paid`, `outstanding_balance`, `updated_at`) VALUES
(1, 1, 5000.00, 0.00, 5000.00, '2026-10-09 04:13:58'),
(2, 2, 12000.00, 12000.00, 0.00, '2026-10-09 04:13:58'),
(3, 3, 0.00, 0.00, 0.00, '2026-10-09 04:13:58');

-- --------------------------------------------------------

--
-- Table structure for table `customer_order_requests`
--

CREATE TABLE `customer_order_requests` (
  `req_id` int(10) UNSIGNED NOT NULL,
  `request_no` varchar(30) NOT NULL,
  `customer_id` int(10) UNSIGNED NOT NULL,
  `request_date` date NOT NULL,
  `product_code` varchar(40) NOT NULL,
  `quantity` int(10) UNSIGNED NOT NULL,
  `notes` varchar(500) DEFAULT NULL,
  `status` enum('Pending Quotation','Quotation Sent','Quotation Approved','Quotation Rejected','Converted','Cancelled') NOT NULL DEFAULT 'Pending Quotation',
  `quotation_id` int(10) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `size` varchar(30) DEFAULT NULL,
  `shipping_fee` decimal(12,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `customer_order_requests`
--

INSERT INTO `customer_order_requests` (`req_id`, `request_no`, `customer_id`, `request_date`, `product_code`, `quantity`, `notes`, `status`, `quotation_id`, `created_at`, `updated_at`, `size`, `shipping_fee`) VALUES
(1, 'REQ-0001', 1, '2026-10-01', 'FG-001', 10, 'Customer requested standard packaging.', 'Pending Quotation', NULL, '2026-10-09 04:13:58', '2026-10-09 04:13:58', NULL, 0.00),
(2, 'REQ-0002', 2, '2026-10-02', 'FG-002', 20, 'Customer needs the items before the end of the month.', 'Pending Quotation', NULL, '2026-10-09 04:13:58', '2026-10-09 04:13:58', NULL, 0.00),
(3, 'REQ-0003', 3, '2026-10-03', 'FG-003', 15, 'Please confirm stock availability.', 'Pending Quotation', NULL, '2026-10-09 04:13:58', '2026-10-09 04:13:58', NULL, 0.00),
(6, 'REQ-3004', 1, '2026-10-09', 'SH-003', 3, '', 'Quotation Sent', 3, '2026-10-09 05:59:54', '2026-10-09 06:00:04', NULL, 0.00),
(7, 'REQ-3007', 1, '2026-10-09', 'SH-001', 3, '', 'Converted', 4, '2026-10-09 06:00:46', '2026-10-09 06:01:52', NULL, 0.00),
(8, 'REQ-3008', 1, '2026-10-09', 'SH-002', 3, '', 'Quotation Sent', 5, '2026-10-09 06:09:13', '2026-10-09 06:09:22', NULL, 0.00),
(9, 'REQ-3009', 1, '2026-10-09', 'SH-001', 1, '', 'Pending Quotation', NULL, '2026-10-09 06:24:34', '2026-10-09 06:24:34', NULL, 0.00),
(10, 'REQ-3010', 1, '2026-10-09', 'SH-002', 3, '', 'Converted', 6, '2026-10-09 06:49:20', '2026-10-09 06:51:46', NULL, 0.00),
(11, 'REQ-3011', 1, '2026-10-10', 'SH-003', 1, '', 'Pending Quotation', NULL, '2026-10-09 20:22:10', '2026-10-09 20:22:10', NULL, 0.00),
(12, 'REQ-3012', 1, '2026-10-10', 'SH-002', 3, '', 'Pending Quotation', NULL, '2026-10-09 20:23:16', '2026-10-09 20:23:16', NULL, 0.00),
(13, 'REQ-3013', 1, '2026-10-10', 'SH-003', 3, '', 'Converted', 7, '2026-10-09 20:23:34', '2026-10-09 20:25:33', NULL, 0.00),
(14, 'REQ-3014', 1, '2026-10-10', 'SH-003', 3, '', 'Converted', 8, '2026-10-10 05:21:54', '2026-10-10 05:23:01', NULL, 0.00),
(15, 'REQ-3015', 1, '2026-10-10', 'SH-003', 3, '', 'Quotation Sent', 9, '2026-10-10 05:24:26', '2026-10-10 05:25:16', NULL, 0.00),
(16, 'REQ-3016', 1, '2026-10-11', 'SH-001', 3, '', 'Converted', 10, '2026-10-10 23:42:30', '2026-10-10 23:43:49', NULL, 0.00);

-- --------------------------------------------------------

--
-- Table structure for table `deliveries`
--

CREATE TABLE `deliveries` (
  `del_id` int(10) UNSIGNED NOT NULL,
  `delivery_no` varchar(30) NOT NULL,
  `order_id` int(10) UNSIGNED NOT NULL,
  `delivery_date` date NOT NULL,
  `status` enum('Preparing','In Transit','Delivered') NOT NULL DEFAULT 'Preparing',
  `inventory_deducted` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `deliveries`
--

INSERT INTO `deliveries` (`del_id`, `delivery_no`, `order_id`, `delivery_date`, `status`, `inventory_deducted`, `created_at`) VALUES
(1, 'DEL-0001', 1, '2026-10-04', 'Delivered', 1, '2026-10-09 04:13:58'),
(2, 'DEL-702', 2, '2026-10-09', 'Delivered', 1, '2026-10-09 06:02:23'),
(3, 'DEL-703', 3, '2026-10-09', 'Delivered', 1, '2026-10-09 06:52:11'),
(4, 'DEL-704', 4, '2026-10-10', 'Delivered', 1, '2026-10-09 20:25:59');

-- --------------------------------------------------------

--
-- Table structure for table `demo_payment_attempts`
--

CREATE TABLE `demo_payment_attempts` (
  `demo_payment_id` int(10) UNSIGNED NOT NULL,
  `reference_no` varchar(40) NOT NULL,
  `invoice_id` int(10) UNSIGNED NOT NULL,
  `order_id` int(10) UNSIGNED NOT NULL,
  `customer_id` int(10) UNSIGNED NOT NULL,
  `method` enum('Cash on Delivery','Debit','Credit','GCash') NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `status` enum('Pending','Simulated Paid','Simulated Failed','COD Due','COD Collected (Simulated)') NOT NULL,
  `simulated_auth_code` varchar(40) DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `completed_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `gateway_payment_events`
--

CREATE TABLE `gateway_payment_events` (
  `event_id` char(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `transaction_ref` varchar(50) NOT NULL,
  `invoice_id` int(10) UNSIGNED NOT NULL,
  `amount_centavos` bigint(20) UNSIGNED NOT NULL,
  `payment_method` enum('GCASH','CARD') NOT NULL,
  `status` enum('SUCCESS','FAILED') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `inventory`
--

CREATE TABLE `inventory` (
  `inventory_id` int(10) UNSIGNED NOT NULL,
  `product_code` varchar(50) NOT NULL,
  `product_name` varchar(150) NOT NULL,
  `brand` varchar(100) DEFAULT '',
  `size` varchar(30) DEFAULT '',
  `unit` varchar(30) NOT NULL DEFAULT 'pcs',
  `stock_quantity` decimal(12,2) NOT NULL DEFAULT 0.00,
  `reorder_level` decimal(12,2) NOT NULL DEFAULT 0.00,
  `status` enum('Active','Inactive') NOT NULL DEFAULT 'Active',
  `last_updated` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `unit_price` decimal(12,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `inventory`
--

INSERT INTO `inventory` (`inventory_id`, `product_code`, `product_name`, `brand`, `size`, `unit`, `stock_quantity`, `reorder_level`, `status`, `last_updated`, `created_at`, `unit_price`) VALUES
(1, 'SH-001', 'Classic Black Sneakers', '', '', 'pairs', 12.00, 0.00, 'Active', '2026-10-09 14:02:23', '2026-10-09 04:14:36', 0.00),
(4, 'SH-002', 'White Court Shoes', '', '', 'pairs', 12.00, 0.00, 'Active', '2026-10-09 14:52:11', '2026-10-09 06:50:51', 0.00),
(5, 'SH-003', 'Red Runner Shoes', '', '', 'pairs', 5.00, 0.00, 'Active', '2026-10-10 13:23:10', '2026-10-09 20:24:51', 0.00);

-- --------------------------------------------------------

--
-- Table structure for table `inventory_delivery_approvals`
--

CREATE TABLE `inventory_delivery_approvals` (
  `approval_id` bigint(20) UNSIGNED NOT NULL,
  `inventory_request_number` varchar(50) NOT NULL,
  `inventory_delivery_id` int(11) DEFAULT NULL,
  `inventory_request_status` varchar(30) NOT NULL,
  `inventory_delivery_status` varchar(40) NOT NULL,
  `items_json` longtext NOT NULL,
  `approval_status` enum('Pending','Approved') NOT NULL DEFAULT 'Pending',
  `inventory_receipt_number` varchar(50) DEFAULT NULL,
  `approved_by` int(10) UNSIGNED DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `inventory_stockout_approvals`
--

CREATE TABLE `inventory_stockout_approvals` (
  `id` int(10) UNSIGNED NOT NULL,
  `inventory_request_id` int(10) DEFAULT NULL,
  `inventory_request_number` varchar(50) DEFAULT NULL,
  `inventory_stock_out_id` int(10) DEFAULT NULL,
  `stock_out_number` varchar(50) DEFAULT NULL,
  `product_code` varchar(50) NOT NULL,
  `product_name` varchar(150) NOT NULL,
  `quantity` decimal(12,2) NOT NULL,
  `unit` varchar(30) NOT NULL DEFAULT 'pcs',
  `destination` varchar(30) NOT NULL DEFAULT 'Sales',
  `request_status` enum('Requested','Stocked Out','Approved','Rejected') NOT NULL DEFAULT 'Requested',
  `requested_at` datetime NOT NULL DEFAULT current_timestamp(),
  `stocked_out_at` datetime DEFAULT NULL,
  `reviewed_by` int(10) UNSIGNED DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `source_reference` varchar(100) DEFAULT NULL,
  `remarks` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `inventory_approved_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `inventory_stockout_approvals`
--

INSERT INTO `inventory_stockout_approvals` (`id`, `inventory_request_id`, `inventory_request_number`, `inventory_stock_out_id`, `stock_out_number`, `product_code`, `product_name`, `quantity`, `unit`, `destination`, `request_status`, `requested_at`, `stocked_out_at`, `reviewed_by`, `reviewed_at`, `source_reference`, `remarks`, `created_at`, `inventory_approved_at`) VALUES
(1, NULL, 'REQ-SALES-009', 6, 'SOUT-20261008104957-18-1', 'SH-001', 'Classic Black Sneakers', 5.00, 'pairs', 'Sales', 'Approved', '2026-10-09 12:14:36', '2026-10-08 00:00:00', NULL, '2026-10-09 12:14:36', 'REQ-SALES-009', 'Imported from Inventory System stock-out. Inventory System approved and stock-out completed; quantity added to Team Sales Inventory.', '2026-10-09 04:14:36', NULL),
(2, NULL, 'REQ-SALES-010', 5, 'SOUT-20261008104620-19-1', 'SH-001', 'Classic Black Sneakers', 5.00, 'pairs', 'Sales', 'Approved', '2026-10-09 12:14:36', '2026-10-08 00:00:00', NULL, '2026-10-09 12:14:36', 'REQ-SALES-010', 'Imported from Inventory System stock-out. Inventory System approved and stock-out completed; quantity added to Team Sales Inventory.', '2026-10-09 04:14:36', NULL),
(3, NULL, 'REQ-SALES-004', 4, 'SOUT-20261008102247-13-1', 'SH-001', 'Classic Black Sneakers', 5.00, 'pairs', 'Sales', 'Approved', '2026-10-09 12:14:36', '2026-10-08 00:00:00', NULL, '2026-10-09 12:14:36', 'REQ-SALES-004', 'Imported from Inventory System stock-out. Inventory System approved and stock-out completed; quantity added to Team Sales Inventory.', '2026-10-09 04:14:36', NULL),
(4, 26, 'REQ-SALES-017', NULL, NULL, 'SH-003', 'Red Runner Shoes', 10.00, 'pairs', 'Sales', 'Requested', '2026-10-09 14:04:34', NULL, NULL, NULL, 'QT-2003', 'Requested for QT-2003', '2026-10-09 06:04:34', NULL),
(5, 27, 'REQ-SALES-018', NULL, NULL, 'SH-002', 'White Court Shoes', 12.00, 'pairs', 'Sales', 'Requested', '2026-10-09 14:09:54', NULL, NULL, NULL, 'QT-2005', 'Requested for QT-2005', '2026-10-09 06:09:54', NULL),
(6, 28, 'REQ-SALES-019', NULL, NULL, 'SH-002', 'White Court Shoes', 12.00, 'pairs', 'Sales', 'Requested', '2026-10-09 14:09:59', NULL, NULL, NULL, 'QT-2005', 'Requested for QT-2005', '2026-10-09 06:09:59', NULL),
(7, 29, 'REQ-SALES-020', NULL, NULL, 'SH-002', 'White Court Shoes', 12.00, 'pairs', 'Sales', 'Requested', '2026-10-09 14:50:12', NULL, NULL, NULL, 'QT-2005', 'Requested for QT-2005', '2026-10-09 06:50:12', NULL),
(8, 30, 'REQ-SALES-021', NULL, NULL, 'SH-002', 'White Court Shoes', 12.00, 'pairs', 'Sales', 'Requested', '2026-10-09 14:50:15', NULL, NULL, NULL, 'QT-2005', 'Requested for QT-2005', '2026-10-09 06:50:15', NULL),
(9, 31, 'REQ-SALES-022', 7, 'SOUT-20261009085045-31-1', 'SH-002', 'White Court Shoes', 15.00, 'pairs', 'Sales', 'Approved', '2026-10-09 14:50:20', '2026-10-09 00:00:00', NULL, '2026-10-09 14:50:51', 'QT-2006', 'Requested for QT-2006 Inventory System approved and stock-out completed; quantity added to Team Sales Inventory.', '2026-10-09 06:50:20', NULL),
(10, 32, 'REQ-SALES-023', 8, 'SOUT-20261009222436-32-1', 'SH-003', 'Red Runner Shoes', 5.00, 'pairs', 'Sales', 'Approved', '2026-10-10 04:24:09', '2026-10-09 00:00:00', NULL, '2026-10-10 04:24:51', 'QT-2007', 'Requested for QT-2007 Inventory System approved and stock-out completed; quantity added to Team Sales Inventory.', '2026-10-09 20:24:09', NULL),
(11, 33, 'REQ-SALES-024', 9, 'SOUT-20261010072258-33-1', 'SH-003', 'Red Runner Shoes', 3.00, 'pairs', 'Sales', 'Approved', '2026-10-10 13:22:16', '2026-10-10 00:00:00', NULL, '2026-10-10 13:23:10', 'QT-2008', 'Requested for QT-2008 Inventory System approved and stock-out completed; quantity added to Team Sales Inventory.', '2026-10-10 05:22:16', NULL),
(12, 34, 'REQ-SALES-025', NULL, NULL, 'SH-001', 'Classic Black Sneakers', 2.00, 'pairs', 'Sales', 'Requested', '2026-10-27 09:52:15', NULL, NULL, NULL, 'Specific stock request from Sales Approval', 'Requested for Specific stock request from Sales Approval', '2026-10-27 01:52:15', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `payment_gateway_transactions`
--

CREATE TABLE `payment_gateway_transactions` (
  `gateway_transaction_id` bigint(20) UNSIGNED NOT NULL,
  `reference_no` varchar(80) NOT NULL,
  `checkout_session_id` varchar(100) NOT NULL,
  `checkout_url` varchar(500) NOT NULL,
  `invoice_id` int(10) UNSIGNED NOT NULL,
  `order_id` int(10) UNSIGNED NOT NULL,
  `customer_id` int(10) UNSIGNED NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `currency` char(3) NOT NULL DEFAULT 'PHP',
  `status` enum('Pending','Paid','Failed','Cancelled') NOT NULL DEFAULT 'Pending',
  `payment_id` varchar(100) DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `purchase_orders`
--

CREATE TABLE `purchase_orders` (
  `po_id` int(10) UNSIGNED NOT NULL,
  `po_no` varchar(30) NOT NULL,
  `quotation_id` int(10) UNSIGNED NOT NULL,
  `customer_id` int(10) UNSIGNED NOT NULL,
  `product_code` varchar(40) NOT NULL,
  `inventory_product_id` varchar(60) DEFAULT NULL,
  `quantity` int(10) UNSIGNED NOT NULL,
  `total_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `order_date` date NOT NULL,
  `status` enum('Open','Converted','Cancelled') NOT NULL DEFAULT 'Open',
  `converted_order_no` varchar(30) DEFAULT NULL,
  `converted_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `size` varchar(30) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `purchase_orders`
--

INSERT INTO `purchase_orders` (`po_id`, `po_no`, `quotation_id`, `customer_id`, `product_code`, `inventory_product_id`, `quantity`, `total_amount`, `order_date`, `status`, `converted_order_no`, `converted_at`, `created_at`, `size`) VALUES
(1, 'PO-0001', 2, 2, 'FG-002', '2', 20, 12000.00, '2026-10-03', 'Converted', 'SO-0001', '2026-10-03 11:00:00', '2026-10-09 04:13:58', NULL),
(2, 'PO-4002', 4, 1, 'SH-001', NULL, 3, 150000.00, '2026-10-09', 'Converted', 'SO-1002', '2026-10-09 14:01:55', '2026-10-09 06:01:52', NULL),
(3, 'PO-4003', 6, 1, 'SH-002', NULL, 3, 150018.00, '2026-10-09', 'Converted', 'SO-1003', '2026-10-09 14:51:51', '2026-10-09 06:51:46', NULL),
(4, 'PO-4004', 7, 1, 'SH-003', NULL, 3, 150000.00, '2026-10-10', 'Converted', 'SO-1004', '2026-10-10 04:25:45', '2026-10-09 20:25:33', NULL),
(5, 'PO-4005', 8, 1, 'SH-003', NULL, 3, 436668.00, '2026-10-10', 'Open', NULL, NULL, '2026-10-10 05:23:01', NULL),
(6, 'PO-4006', 10, 1, 'SH-001', '1', 3, 150006.00, '2026-10-11', 'Open', NULL, NULL, '2026-10-10 23:43:49', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `sales_invoices`
--

CREATE TABLE `sales_invoices` (
  `inv_id` int(10) UNSIGNED NOT NULL,
  `invoice_no` varchar(30) NOT NULL,
  `order_id` int(10) UNSIGNED NOT NULL,
  `invoice_date` date NOT NULL,
  `total_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `amount_paid` decimal(12,2) NOT NULL DEFAULT 0.00,
  `status` enum('Unpaid','Partially Paid','Paid') NOT NULL DEFAULT 'Unpaid',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sales_invoices`
--

INSERT INTO `sales_invoices` (`inv_id`, `invoice_no`, `order_id`, `invoice_date`, `total_amount`, `amount_paid`, `status`, `created_at`) VALUES
(1, 'INV-0001', 1, '2026-10-04', 12000.00, 12000.00, 'Paid', '2026-10-09 04:13:58'),
(2, 'INV-3002', 2, '2026-10-09', 150000.00, 150000.00, 'Paid', '2026-10-09 06:02:41'),
(3, 'INV-3003', 3, '2026-10-09', 150018.00, 150018.00, 'Paid', '2026-10-09 06:52:32'),
(4, 'INV-3004', 4, '2026-10-09', 150000.00, 150000.00, 'Paid', '2026-10-09 20:26:36');

-- --------------------------------------------------------

--
-- Table structure for table `sales_orders`
--

CREATE TABLE `sales_orders` (
  `so_id` int(10) UNSIGNED NOT NULL,
  `order_no` varchar(30) NOT NULL,
  `quotation_id` int(10) UNSIGNED DEFAULT NULL,
  `customer_id` int(10) UNSIGNED NOT NULL,
  `order_date` date NOT NULL,
  `product_code` varchar(40) DEFAULT NULL,
  `quantity` int(10) UNSIGNED DEFAULT NULL,
  `total_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `status` enum('Pending','Processing','Invoiced','Completed','Cancelled') NOT NULL DEFAULT 'Pending',
  `admin_status` enum('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  `payment_method` enum('GCash','Bank Transfer','Cash on Delivery') NOT NULL DEFAULT 'Cash on Delivery',
  `payment_status` enum('Pending','Paid','Failed') NOT NULL DEFAULT 'Pending',
  `payment_reference` varchar(100) DEFAULT NULL,
  `receipt_no` varchar(30) DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `size` varchar(30) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sales_orders`
--

INSERT INTO `sales_orders` (`so_id`, `order_no`, `quotation_id`, `customer_id`, `order_date`, `product_code`, `quantity`, `total_amount`, `status`, `admin_status`, `payment_method`, `payment_status`, `payment_reference`, `receipt_no`, `paid_at`, `created_at`, `size`) VALUES
(1, 'SO-0001', 2, 2, '2026-10-03', 'FG-002', 20, 12000.00, 'Completed', 'Approved', 'GCash', 'Paid', 'GC-20261003-001', 'RCPT-0001', '2026-10-03 12:00:00', '2026-10-09 04:13:58', NULL),
(2, 'SO-1002', 4, 1, '2026-10-09', 'SH-001', 3, 150000.00, 'Completed', 'Approved', 'Cash on Delivery', 'Paid', NULL, NULL, '2026-10-09 14:02:57', '2026-10-09 06:01:55', NULL),
(3, 'SO-1003', 6, 1, '2026-10-09', 'SH-002', 3, 150018.00, 'Completed', 'Approved', 'Cash on Delivery', 'Paid', NULL, NULL, '2026-10-09 14:53:04', '2026-10-09 06:51:51', NULL),
(4, 'SO-1004', 7, 1, '2026-10-09', 'SH-003', 3, 150000.00, 'Completed', 'Approved', 'Cash on Delivery', 'Paid', NULL, NULL, '2026-10-10 04:27:01', '2026-10-09 20:25:45', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `sales_quotations`
--

CREATE TABLE `sales_quotations` (
  `sq_id` int(10) UNSIGNED NOT NULL,
  `quotation_no` varchar(30) NOT NULL,
  `customer_id` int(10) UNSIGNED NOT NULL,
  `source_request_id` int(10) UNSIGNED DEFAULT NULL,
  `quotation_date` date NOT NULL,
  `valid_until` date DEFAULT NULL,
  `product_code` varchar(40) DEFAULT NULL,
  `fg_id` int(10) DEFAULT NULL,
  `quantity` int(10) UNSIGNED DEFAULT NULL,
  `inventory_quantity` int(10) UNSIGNED DEFAULT NULL,
  `inventory_checked_at` datetime DEFAULT NULL,
  `inventory_status` enum('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  `customer_status` enum('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  `total_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `status` enum('Pending','Approved','Rejected','Expired') NOT NULL DEFAULT 'Pending',
  `admin_status` enum('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  `payment_method` enum('GCash','Bank Transfer','Cash on Delivery') NOT NULL DEFAULT 'Cash on Delivery',
  `payment_status` enum('Pending','Paid','Failed') NOT NULL DEFAULT 'Pending',
  `payment_reference` varchar(100) DEFAULT NULL,
  `receipt_no` varchar(30) DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `size` varchar(30) DEFAULT NULL,
  `shipping_fee` decimal(12,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sales_quotations`
--

INSERT INTO `sales_quotations` (`sq_id`, `quotation_no`, `customer_id`, `source_request_id`, `quotation_date`, `valid_until`, `product_code`, `fg_id`, `quantity`, `inventory_quantity`, `inventory_checked_at`, `inventory_status`, `customer_status`, `total_amount`, `status`, `admin_status`, `payment_method`, `payment_status`, `payment_reference`, `receipt_no`, `paid_at`, `created_at`, `size`, `shipping_fee`) VALUES
(1, 'QT-2000', 1, 1, '2026-10-01', '2026-10-15', 'FG-001', 1, 10, 50, '2026-10-01 09:00:00', 'Approved', 'Pending', 5000.00, 'Rejected', 'Rejected', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-10-09 04:13:58', NULL, 0.00),
(2, 'QT-2001', 2, 2, '2026-10-02', '2026-10-16', 'FG-002', 2, 20, 100, '2026-10-02 10:00:00', 'Approved', 'Approved', 12000.00, 'Approved', 'Approved', 'GCash', 'Paid', NULL, NULL, NULL, '2026-10-09 04:13:58', NULL, 0.00),
(3, 'QT-2003', 1, 6, '2026-10-09', '2026-10-22', 'SH-003', 3, 3, 0, '2026-10-09 14:04:34', 'Pending', 'Pending', 150015.00, 'Rejected', 'Rejected', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-10-09 06:00:04', NULL, 0.00),
(4, 'QT-2004', 1, 7, '2026-10-09', '2026-10-14', 'SH-001', 1, 3, 15, '2026-10-09 14:01:38', 'Approved', 'Approved', 150000.00, 'Approved', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-10-09 06:01:29', NULL, 0.00),
(5, 'QT-2005', 1, 8, '2026-10-09', '2026-10-22', 'SH-002', 2, 3, 12, '2026-10-10 13:23:27', 'Approved', 'Pending', 1500000.00, 'Expired', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-10-09 06:09:22', NULL, 0.00),
(6, 'QT-2006', 1, 10, '2026-10-09', '2026-10-22', 'SH-002', 2, 3, 15, '2026-10-09 14:51:14', 'Approved', 'Approved', 150018.00, 'Approved', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-10-09 06:50:00', NULL, 0.00),
(7, 'QT-2007', 1, 13, '2026-10-09', '2026-10-15', 'SH-003', 3, 3, 5, '2026-10-10 04:25:00', 'Approved', 'Approved', 150000.00, 'Approved', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-10-09 20:23:53', NULL, 0.00),
(8, 'QT-2008', 1, 14, '2026-10-10', '2026-10-15', 'SH-003', 3, 3, 5, '2026-10-10 13:23:15', 'Approved', 'Approved', 436668.00, 'Approved', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-10-10 05:22:07', NULL, 0.00),
(9, 'QT-2009', 1, 15, '2026-10-10', '2026-10-14', 'SH-003', 3, 3, 5, '2026-10-10 13:25:35', 'Approved', 'Pending', 90063.00, 'Expired', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-10-10 05:25:16', NULL, 0.00),
(10, 'QT-2010', 1, 16, '2026-10-11', '2026-10-15', 'SH-001', 1, 3, 12, '2026-10-11 07:43:25', 'Approved', 'Approved', 150006.00, 'Approved', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-10-10 23:42:50', NULL, 0.00),
(11, 'QT-2011', 4, NULL, '2026-10-26', '2026-10-02', NULL, NULL, NULL, NULL, NULL, 'Pending', 'Pending', 2000.00, 'Pending', 'Pending', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-10-26 07:51:45', NULL, 0.00);

-- --------------------------------------------------------

--
-- Table structure for table `sales_returns`
--

CREATE TABLE `sales_returns` (
  `ret_id` int(10) UNSIGNED NOT NULL,
  `return_no` varchar(30) NOT NULL,
  `order_id` int(10) UNSIGNED NOT NULL,
  `return_date` date NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `total_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `status` enum('Pending','Approved','Rejected','Completed') NOT NULL DEFAULT 'Pending',
  `admin_status` enum('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `return_quantity` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `damage_photo` mediumblob DEFAULT NULL,
  `damage_photo_mime` varchar(20) DEFAULT NULL,
  `inventory_sync_status` enum('Not Sent','Pending','Sent','Failed') NOT NULL DEFAULT 'Not Sent',
  `inventory_sync_error` text DEFAULT NULL,
  `inventory_synced_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sales_returns`
--

INSERT INTO `sales_returns` (`ret_id`, `return_no`, `order_id`, `return_date`, `reason`, `total_amount`, `status`, `admin_status`, `created_at`, `return_quantity`, `damage_photo`, `damage_photo_mime`, `inventory_sync_status`, `inventory_sync_error`, `inventory_synced_at`) VALUES
(1, 'RET-0001', 1, '2026-10-05', 'Customer reported damaged packaging.', 600.00, 'Approved', 'Approved', '2026-10-09 04:13:58', 1, NULL, NULL, 'Not Sent', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `sales_settings`
--

CREATE TABLE `sales_settings` (
  `setting_key` varchar(60) NOT NULL,
  `setting_value` decimal(12,2) NOT NULL DEFAULT 0.00,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sales_shipping_distance_cache`
--

CREATE TABLE `sales_shipping_distance_cache` (
  `cache_key` char(64) NOT NULL,
  `distance_meters` int(10) UNSIGNED NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sales_shipping_rates`
--

CREATE TABLE `sales_shipping_rates` (
  `rate_id` int(10) UNSIGNED NOT NULL,
  `province` varchar(100) NOT NULL,
  `city` varchar(100) NOT NULL,
  `shipping_fee` decimal(12,2) NOT NULL DEFAULT 0.00,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(10) UNSIGNED NOT NULL,
  `full_name` varchar(120) NOT NULL,
  `username` varchar(60) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('Sales Admin','Sales Staff','Customer') NOT NULL DEFAULT 'Sales Staff',
  `customer_id` int(10) UNSIGNED DEFAULT NULL,
  `status` enum('Active','Inactive') NOT NULL DEFAULT 'Active',
  `avatar_path` varchar(255) DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `account_status` enum('Pending','Approved','Rejected') NOT NULL DEFAULT 'Approved'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `full_name`, `username`, `password`, `role`, `customer_id`, `status`, `avatar_path`, `last_login`, `created_at`, `updated_at`, `account_status`) VALUES
(0, 'Sales Administrator', 'salesadmin@gmail.com', '$2y$10$wKUdbJeTzpNrSaiLgs8VF.Fdy3PFeOXBGjVvTvEzZ5f0JVO.l5xPe', 'Sales Admin', NULL, 'Active', NULL, '2026-11-12 23:04:28', '2026-11-09 21:21:13', '2026-11-17 05:08:51', 'Approved'),
(1, 'Sales Admin User', 'salesadmin', '$2y$10$xKsjFtJ3esppT.rjOD4MwuNrnjy9S8TFX2tNaMHLgLD9W0vsL2si2', 'Sales Admin', NULL, 'Active', NULL, '2026-10-27 09:51:12', '2026-10-09 04:13:58', '2026-10-27 01:51:12', 'Approved'),
(2, '', 'salesstaff', '$2y$10$xKsjFtJ3esppT.rjOD4MwuNrnjy9S8TFX2tNaMHLgLD9W0vsL2si2', 'Sales Staff', NULL, 'Inactive', 'assets/uploads/avatars/user_2_e61f52ae7d4b.jpg', '2026-10-27 12:09:26', '2026-10-09 04:13:58', '2026-10-27 04:09:26', 'Approved'),
(3, 'Customer User', 'customer', '$2y$10$xKsjFtJ3esppT.rjOD4MwuNrnjy9S8TFX2tNaMHLgLD9W0vsL2si2', 'Customer', 1, 'Active', NULL, '2026-10-11 07:48:58', '2026-10-09 04:13:58', '2026-10-10 23:48:58', 'Approved');

-- --------------------------------------------------------

--
-- Table structure for table `user_notifications`
--

CREATE TABLE `user_notifications` (
  `notification_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `event_key` varchar(160) NOT NULL,
  `title` varchar(120) NOT NULL,
  `message` varchar(255) NOT NULL,
  `link` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `read_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `account_receivable`
--
ALTER TABLE `account_receivable`
  ADD PRIMARY KEY (`ar_id`),
  ADD KEY `invoice_id` (`invoice_id`),
  ADD KEY `customer_id` (`customer_id`);

--
-- Indexes for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD PRIMARY KEY (`log_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `module_record` (`module`,`record_id`);

--
-- Indexes for table `collections`
--
ALTER TABLE `collections`
  ADD PRIMARY KEY (`col_id`),
  ADD UNIQUE KEY `collection_no` (`collection_no`),
  ADD KEY `invoice_id` (`invoice_id`);

--
-- Indexes for table `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`cus_id`),
  ADD UNIQUE KEY `customer_code` (`customer_code`);

--
-- Indexes for table `customer_balance`
--
ALTER TABLE `customer_balance`
  ADD PRIMARY KEY (`cb_id`),
  ADD UNIQUE KEY `customer_id` (`customer_id`);

--
-- Indexes for table `customer_order_requests`
--
ALTER TABLE `customer_order_requests`
  ADD PRIMARY KEY (`req_id`),
  ADD UNIQUE KEY `uq_customer_request_no` (`request_no`),
  ADD KEY `idx_customer_request_customer` (`customer_id`);

--
-- Indexes for table `deliveries`
--
ALTER TABLE `deliveries`
  ADD PRIMARY KEY (`del_id`),
  ADD UNIQUE KEY `delivery_no` (`delivery_no`),
  ADD KEY `order_id` (`order_id`);

--
-- Indexes for table `inventory`
--
ALTER TABLE `inventory`
  ADD PRIMARY KEY (`inventory_id`),
  ADD UNIQUE KEY `uq_team_sales_inventory_product` (`product_code`),
  ADD KEY `idx_team_sales_inventory_status` (`status`);

--
-- Indexes for table `inventory_stockout_approvals`
--
ALTER TABLE `inventory_stockout_approvals`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_team_sales_inventory_stockout` (`inventory_stock_out_id`),
  ADD KEY `idx_team_sales_inventory_request` (`inventory_request_number`),
  ADD KEY `idx_team_sales_stockout_status` (`request_status`),
  ADD KEY `idx_team_sales_stockout_product` (`product_code`),
  ADD KEY `idx_team_sales_stockout_reviewer` (`reviewed_by`),
  ADD KEY `idx_team_sales_stockout_reference` (`source_reference`);

--
-- Indexes for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  ADD PRIMARY KEY (`po_id`),
  ADD UNIQUE KEY `po_no` (`po_no`),
  ADD KEY `quotation_id` (`quotation_id`),
  ADD KEY `customer_id` (`customer_id`);

--
-- Indexes for table `sales_invoices`
--
ALTER TABLE `sales_invoices`
  ADD PRIMARY KEY (`inv_id`),
  ADD UNIQUE KEY `invoice_no` (`invoice_no`),
  ADD KEY `order_id` (`order_id`);

--
-- Indexes for table `sales_orders`
--
ALTER TABLE `sales_orders`
  ADD PRIMARY KEY (`so_id`),
  ADD UNIQUE KEY `order_no` (`order_no`),
  ADD UNIQUE KEY `receipt_no` (`receipt_no`),
  ADD KEY `quotation_id` (`quotation_id`),
  ADD KEY `customer_id` (`customer_id`);

--
-- Indexes for table `sales_quotations`
--
ALTER TABLE `sales_quotations`
  ADD PRIMARY KEY (`sq_id`),
  ADD UNIQUE KEY `uq_sales_quotation_no` (`quotation_no`),
  ADD KEY `idx_sales_quotation_customer` (`customer_id`),
  ADD KEY `idx_sales_quotation_fg_id` (`fg_id`);

--
-- Indexes for table `sales_returns`
--
ALTER TABLE `sales_returns`
  ADD PRIMARY KEY (`ret_id`),
  ADD UNIQUE KEY `return_no` (`return_no`),
  ADD KEY `order_id` (`order_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `uq_users_customer_id` (`customer_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `account_receivable`
--
ALTER TABLE `account_receivable`
  MODIFY `ar_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `activity_logs`
--
ALTER TABLE `activity_logs`
  MODIFY `log_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=64;

--
-- AUTO_INCREMENT for table `collections`
--
ALTER TABLE `collections`
  MODIFY `col_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `customers`
--
ALTER TABLE `customers`
  MODIFY `cus_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `customer_balance`
--
ALTER TABLE `customer_balance`
  MODIFY `cb_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `customer_order_requests`
--
ALTER TABLE `customer_order_requests`
  MODIFY `req_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `deliveries`
--
ALTER TABLE `deliveries`
  MODIFY `del_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `inventory`
--
ALTER TABLE `inventory`
  MODIFY `inventory_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `inventory_stockout_approvals`
--
ALTER TABLE `inventory_stockout_approvals`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  MODIFY `po_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `sales_invoices`
--
ALTER TABLE `sales_invoices`
  MODIFY `inv_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `sales_orders`
--
ALTER TABLE `sales_orders`
  MODIFY `so_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `sales_quotations`
--
ALTER TABLE `sales_quotations`
  MODIFY `sq_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `sales_returns`
--
ALTER TABLE `sales_returns`
  MODIFY `ret_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=51;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `account_receivable`
--
ALTER TABLE `account_receivable`
  ADD CONSTRAINT `account_receivable_ibfk_1` FOREIGN KEY (`invoice_id`) REFERENCES `sales_invoices` (`inv_id`),
  ADD CONSTRAINT `account_receivable_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`cus_id`);

--
-- Constraints for table `collections`
--
ALTER TABLE `collections`
  ADD CONSTRAINT `collections_ibfk_1` FOREIGN KEY (`invoice_id`) REFERENCES `sales_invoices` (`inv_id`);

--
-- Constraints for table `customer_balance`
--
ALTER TABLE `customer_balance`
  ADD CONSTRAINT `customer_balance_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`cus_id`);

--
-- Constraints for table `customer_order_requests`
--
ALTER TABLE `customer_order_requests`
  ADD CONSTRAINT `customer_order_requests_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`cus_id`);

--
-- Constraints for table `deliveries`
--
ALTER TABLE `deliveries`
  ADD CONSTRAINT `deliveries_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `sales_orders` (`so_id`);

--
-- Constraints for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  ADD CONSTRAINT `purchase_orders_ibfk_1` FOREIGN KEY (`quotation_id`) REFERENCES `sales_quotations` (`sq_id`),
  ADD CONSTRAINT `purchase_orders_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`cus_id`);

--
-- Constraints for table `sales_invoices`
--
ALTER TABLE `sales_invoices`
  ADD CONSTRAINT `sales_invoices_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `sales_orders` (`so_id`);

--
-- Constraints for table `sales_orders`
--
ALTER TABLE `sales_orders`
  ADD CONSTRAINT `sales_orders_ibfk_1` FOREIGN KEY (`quotation_id`) REFERENCES `sales_quotations` (`sq_id`),
  ADD CONSTRAINT `sales_orders_ibfk_2` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`cus_id`);

--
-- Constraints for table `sales_quotations`
--
ALTER TABLE `sales_quotations`
  ADD CONSTRAINT `sales_quotations_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`cus_id`);

--
-- Constraints for table `sales_returns`
--
ALTER TABLE `sales_returns`
  ADD CONSTRAINT `sales_returns_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `sales_orders` (`so_id`);

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`cus_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
