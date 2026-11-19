-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 15, 2026 at 06:45 AM
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
(63, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-10-27 04:09:26'),
(64, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-10-27 13:34:41'),
(65, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-10-27 13:36:42'),
(66, 2, 'Export', 'Purchase Order', 6, 'Exported PO-4006 as PDF', '2026-10-27 13:46:17'),
(67, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-10-27 13:46:50'),
(68, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-10-27 13:47:31'),
(69, 2, 'Create', 'Sales Return', 2, 'Created RET-002', '2026-10-27 13:56:07'),
(70, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-10-27 14:19:39'),
(71, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-10-28 11:38:29'),
(72, 2, 'Create', 'Quotation', 12, 'Created QT-2012 for customer order REQ-3017', '2026-10-29 01:24:29'),
(73, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-10-29 01:24:39'),
(74, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-10-29 06:22:05'),
(75, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-10-30 07:47:34'),
(76, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-10-30 08:11:57'),
(77, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-10-30 08:52:59'),
(78, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-10-31 09:04:26'),
(79, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-01 02:27:40'),
(80, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-01 02:28:21'),
(81, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-01 02:37:19'),
(82, 2, 'Create', 'Quotation', 13, 'Created QT-2013 for customer order REQ-3018', '2026-11-03 06:17:51'),
(83, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-03 06:18:31'),
(84, 1, 'Create', 'Inventory Stock Request', 13, 'Requested Inventory stock for quotation QT-2013', '2026-11-03 06:18:38'),
(85, 1, 'Approve', 'Quotation', 13, 'Sales Admin approved quotation QT-2013', '2026-11-03 06:19:35'),
(86, 2, 'Create', 'Sales Order', NULL, 'Created SO-1005 from PO-4007', '2026-11-03 06:21:23'),
(87, 1, 'Approve', 'Sales Order', 5, 'Approved SO-1005 -> DEL-705 (Team Sales Inventory deducted)', '2026-11-03 06:21:32'),
(88, 2, 'Update', 'Delivery', 5, 'Delivery status set to In Transit', '2026-11-03 06:23:33'),
(89, 2, 'Update', 'Delivery', 5, 'Delivery status set to Delivered', '2026-11-03 06:23:38'),
(90, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-03 06:49:00'),
(91, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-03 06:50:09'),
(92, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-03 07:05:07'),
(93, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-05 09:25:20'),
(94, 2, 'Export', 'Purchase Order', 7, 'Exported PO-4007 as PDF', '2026-11-05 10:05:44'),
(95, 2, 'Create', 'Quotation', 14, 'Created QT-2014 for customer order REQ-3019', '2026-11-05 10:09:34'),
(96, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-05 10:09:51'),
(97, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-05 10:11:48'),
(98, 2, 'Create', 'Quotation', 15, 'Created QT-2015 for customer order REQ-3020', '2026-11-05 10:12:10'),
(99, 2, 'Export', 'Purchase Order', 8, 'Exported PO-4008 as PDF', '2026-11-05 10:15:11'),
(100, 2, 'Create', 'Sales Order', NULL, 'Created SO-1006 from PO-4008', '2026-11-05 10:15:22'),
(101, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-06 03:26:54'),
(102, 2, 'Create', 'Quotation', 16, 'Created QT-2016 for customer order REQ-3021', '2026-11-06 03:36:18'),
(103, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-06 03:36:53'),
(104, 2, 'Create', 'Sales Order', NULL, 'Created SO-1007 from PO-4010', '2026-11-06 03:40:49'),
(105, 2, 'Create', 'Sales Order', NULL, 'Created SO-1008 from PO-4009', '2026-11-06 03:40:52'),
(106, 1, 'Approve', 'Sales Order', 8, 'Approved SO-1008 -> DEL-706 (Team Sales Inventory deducted)', '2026-11-06 03:41:08'),
(107, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-06 04:07:23'),
(108, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-06 04:09:36'),
(109, 2, 'Create', 'Sales Order', NULL, 'Created SO-1009 from PO-4006', '2026-11-06 06:05:37'),
(110, 2, 'Create', 'Sales Order', NULL, 'Created SO-1010 from PO-4005', '2026-11-06 06:09:47'),
(111, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-06 07:33:29'),
(112, 2, 'Update', 'Delivery', 6, 'Delivery status set to Delivered', '2026-11-06 07:37:06'),
(113, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-06 08:58:43'),
(114, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-06 09:09:51'),
(115, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-06 09:10:10'),
(116, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-06 09:10:27'),
(117, 1, 'Create', 'Inventory Stock Request', 39, 'Created finished-goods stock request REQ-SALES-030', '2026-11-06 09:13:51'),
(118, 1, 'Create', 'Inventory Stock Request', 40, 'Created finished-goods stock request REQ-SALES-031', '2026-11-06 09:15:37'),
(119, 1, 'Create', 'Inventory Stock Request', 41, 'Created finished-goods stock request REQ-SALES-032', '2026-11-06 09:22:59'),
(120, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-06 12:02:03'),
(121, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-06 14:41:34'),
(122, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-06 14:55:17'),
(123, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-06 23:51:38'),
(124, 2, 'Create', 'Quotation', 17, 'Created QT-2017 for customer order REQ-3022', '2026-11-07 00:03:02'),
(125, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-07 00:04:05'),
(126, 1, 'Approve', 'Quotation', 17, 'Sales Admin approved quotation QT-2017', '2026-11-07 00:04:10'),
(127, 2, 'Create', 'Sales Order', NULL, 'Created SO-1011 from PO-4011', '2026-11-07 00:04:25'),
(128, 1, 'Approve', 'Sales Order', 11, 'Approved SO-1011 -> DEL-707 (Team Sales Inventory deducted)', '2026-11-07 00:04:33'),
(129, 2, 'Update', 'Delivery', 7, 'Delivery status set to Delivered', '2026-11-07 00:05:18'),
(130, 1, 'Create', 'Inventory Stock Request', 42, 'Created specific stock request REQ-SALES-033', '2026-11-07 00:05:47'),
(131, 1, 'Create', 'Inventory Stock Request', 43, 'Created specific stock request REQ-SALES-034', '2026-11-07 00:07:19'),
(132, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-07 06:11:49'),
(133, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-07 06:19:51'),
(134, 2, 'Create', 'Quotation', 18, 'Created QT-2018 for customer order REQ-3024', '2026-11-07 06:20:15'),
(135, 1, 'Create', 'Inventory Stock Request', 18, 'Requested Inventory stock for quotation QT-2018', '2026-11-07 06:20:34'),
(136, 1, 'Approve', 'Quotation', 18, 'Sales Admin approved quotation QT-2018', '2026-11-07 06:21:54'),
(137, 2, 'Create', 'Sales Order', NULL, 'Created SO-1012 from PO-4012', '2026-11-07 06:22:35'),
(138, 1, 'Approve', 'Sales Order', 12, 'Approved SO-1012 -> DEL-708 (Team Sales Inventory deducted)', '2026-11-07 06:22:58'),
(139, 2, 'Update', 'Delivery', 8, 'Delivery status set to Delivered', '2026-11-07 06:25:07'),
(140, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-07 12:05:47'),
(141, 1, 'Approve', 'Customer Account', 5, 'Approved Hero Nemo', '2026-11-07 12:13:32'),
(142, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-07 12:21:31'),
(143, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-07 12:22:18'),
(144, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-08 01:57:52'),
(145, 2, 'Create', 'Quotation', 19, 'Created QT-2019 for customer order REQ-3025', '2026-11-08 02:17:52'),
(146, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-08 02:18:14'),
(147, 2, 'Create', 'Sales Order', NULL, 'Created SO-1013 from PO-4013', '2026-11-08 02:22:58'),
(148, 1, 'Approve', 'Sales Order', 13, 'Approved SO-1013 -> DEL-709 (Team Sales Inventory deducted)', '2026-11-08 02:23:10'),
(149, 2, 'Update', 'Delivery', 9, 'Delivery status set to Delivered', '2026-11-08 02:23:51'),
(150, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-09 12:18:42'),
(151, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-09 13:02:39'),
(152, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-09 13:22:55'),
(153, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-09 13:41:08'),
(154, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-09 14:26:03'),
(155, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-09 14:28:19'),
(156, 1, 'Create', 'Inventory Stock Request', 10, 'Created finished-goods stock request REQ-SALES-20261109152839-7ADF0769', '2026-11-09 14:28:39'),
(157, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-09 14:29:34'),
(158, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-09 14:43:18'),
(159, 1, 'Create', 'Inventory Stock Request', 11, 'Created finished-goods stock request REQ-SALES-20261109154342-87E7717F', '2026-11-09 14:43:42'),
(160, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-09 14:44:05'),
(161, 1, 'Create', 'Inventory Stock Request', 12, 'Created finished-goods stock request REQ-SALES-20261109154830-80A6C7B7', '2026-11-09 14:48:30'),
(162, 1, 'Create', 'Inventory Stock Request', 13, 'Created finished-goods stock request REQ-SALES-20261109155219-0380BF69', '2026-11-09 14:52:19'),
(163, 1, 'Create', 'Inventory Stock Request', 14, 'Created finished-goods stock request REQ-SALES-20261110043658-FA58049C', '2026-11-10 03:36:58'),
(164, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-10 04:29:28'),
(165, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-10 05:30:34'),
(166, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-10 06:09:23'),
(167, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-10 06:14:32'),
(168, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-10 06:20:41'),
(169, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-10 06:36:33'),
(170, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-10 06:37:33'),
(171, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-10 06:45:36'),
(172, 2, 'Create', 'Quotation', 20, 'Created QT-2020 for customer order REQ-3026', '2026-11-10 06:57:15'),
(173, 2, 'Create', 'Quotation', 21, 'Created QT-2021 for customer order REQ-3027', '2026-11-10 06:58:58'),
(174, 2, 'Create', 'Quotation', 22, 'Created QT-2022 for customer order REQ-3028', '2026-11-10 07:18:58'),
(175, 1, 'Create', 'Inventory Stock Request', 20, 'Created finished-goods stock request REQ-2026111009220281', '2026-11-10 08:22:02'),
(176, 1, 'Create', 'Inventory Stock Request', 21, 'Created finished-goods stock request REQ-2026111009395473', '2026-11-10 08:39:54'),
(177, 2, 'Create', 'Sales Order', NULL, 'Created SO-1014 from PO-4014', '2026-11-10 08:47:27'),
(178, 1, 'Approve', 'Sales Order', 14, 'Approved SO-1014 -> DEL-710 (Team Sales Inventory deducted)', '2026-11-10 08:47:33'),
(179, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-10 09:54:51'),
(180, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-10 11:06:17'),
(181, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-10 11:06:34'),
(182, 2, 'Update', 'Inventory', 1, 'Updated fixed price for inventory item 1', '2026-11-10 11:07:03'),
(183, 2, 'Update', 'Inventory', 3, 'Updated fixed price for inventory item 3', '2026-11-10 11:07:08'),
(184, 2, 'Update', 'Inventory', 2, 'Updated fixed price for inventory item 2', '2026-11-10 11:07:11'),
(185, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-10 11:16:42'),
(186, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-10 12:11:28'),
(187, 2, 'Export', 'Purchase Order', 14, 'Exported PO-4014 as PDF', '2026-11-10 12:11:37'),
(188, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-10 12:59:10'),
(189, 1, 'Approve', 'Customer Account', 6, 'Approved John Darwin Ilagan', '2026-11-10 12:59:16'),
(190, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-11 12:15:34'),
(191, 2, 'Create', 'Quotation', 23, 'Created QT-2023 for customer order REQ-3030', '2026-11-11 12:46:31'),
(192, 2, 'Create', 'Sales Order', NULL, 'Created SO-1015 from PO-4015', '2026-11-11 12:48:50'),
(193, 1, 'Approve', 'Sales Order', 15, 'Approved SO-1015 -> DEL-711 (Team Sales Inventory deducted)', '2026-11-11 12:48:56'),
(194, 2, 'Update', 'Delivery', 11, 'Delivery status set to Delivered', '2026-11-11 12:50:02'),
(195, 2, 'Update', 'Delivery', 10, 'Delivery status set to Delivered', '2026-11-11 12:50:03'),
(196, 2, 'Create', 'Quotation', 24, 'Created QT-2024 for customer order REQ-3031', '2026-11-11 12:57:29'),
(197, 2, 'Create', 'Sales Order', NULL, 'Created SO-1016 from PO-4016', '2026-11-11 12:58:03'),
(198, 1, 'Approve', 'Sales Order', 16, 'Approved SO-1016 -> DEL-712 (Team Sales Inventory deducted)', '2026-11-11 12:58:08'),
(199, 1, 'Create', 'Inventory Stock Request', 22, 'Created finished-goods stock request REQ-2026111113582954', '2026-11-11 12:58:29'),
(200, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-12 01:02:57'),
(201, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-12 02:00:57'),
(202, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-12 02:02:28'),
(203, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-12 02:02:48'),
(204, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-12 12:32:27'),
(205, 1, 'Create', 'Inventory Stock Request', 5, 'Created finished-goods stock request REQ-2026111213410533', '2026-11-12 12:41:05'),
(206, 1, 'Create', 'Inventory Stock Request', 6, 'Created finished-goods stock request REQ-2026111213492418', '2026-11-12 12:49:24'),
(207, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-12 12:49:58'),
(208, 2, 'Create', 'Quotation', 25, 'Created QT-2025 for customer order REQ-3032', '2026-11-12 13:18:51'),
(209, 2, 'Create', 'Quotation', 26, 'Created QT-2026 for customer order REQ-3033', '2026-11-12 13:58:12'),
(210, 1, 'Create', 'Purchase Order Stock Request', 18, 'Requested 1 pairs for PO-4018 from Inventory. Request REQ-2026111214584499', '2026-11-12 13:58:44'),
(211, 2, 'Create', 'Quotation', 27, 'Created QT-2027 for customer order REQ-3034', '2026-11-12 14:03:01'),
(212, 1, 'Create', 'Purchase Order Stock Request', 19, 'Requested the full PO quantity of 3 pairs for PO-4019 from Inventory. Request REQ-2026111215032661', '2026-11-12 14:03:26'),
(213, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-12 14:32:19'),
(214, 1, 'Create', 'Inventory Stock Request', 9, 'Created finished-goods stock request REQ-2026111215342754', '2026-11-12 14:34:27'),
(215, 1, 'Create', 'Inventory Stock Request', 10, 'Created finished-goods stock request REQ-2026111215342777', '2026-11-12 14:34:27'),
(216, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-13 07:07:05'),
(217, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-13 07:08:31'),
(218, 2, 'Create', 'Quotation', 28, 'Created QT-2028 for customer order REQ-3035', '2026-11-13 07:08:44'),
(219, 2, 'Create', 'Sales Order', NULL, 'Created SO-1017 from PO-4020', '2026-11-13 07:10:04'),
(220, 1, 'Approve', 'Sales Order', 17, 'Approved SO-1017 -> DEL-713 (Team Sales Inventory deducted)', '2026-11-13 07:10:20'),
(221, 2, 'Create', 'Quotation', 29, 'Created QT-2029 for customer order REQ-3036', '2026-11-13 07:14:41'),
(222, 2, 'Create', 'Sales Order', NULL, 'Created SO-1018 from PO-4021', '2026-11-13 07:16:37'),
(223, 1, 'Approve', 'Sales Order', 18, 'Approved SO-1018 -> DEL-714 (Team Sales Inventory deducted)', '2026-11-13 07:17:03'),
(224, 2, 'Update', 'Delivery', 14, 'Delivery status set to Delivered', '2026-11-13 07:18:28'),
(225, 2, 'Update', 'Delivery', 13, 'Delivery status set to In Transit', '2026-11-13 07:18:33'),
(226, 2, 'Update', 'Delivery', 13, 'Delivery status set to Delivered', '2026-11-13 07:18:35'),
(227, 2, 'Update', 'Delivery', 12, 'Delivery status set to In Transit', '2026-11-13 07:18:36'),
(228, 2, 'Update', 'Delivery', 12, 'Delivery status set to Delivered', '2026-11-13 07:18:37'),
(229, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-13 07:45:52'),
(230, 2, 'Create', 'Quotation', 30, 'Created QT-2030 for customer order REQ-3037', '2026-11-13 07:47:12'),
(231, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-13 07:47:54'),
(232, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-13 07:50:09'),
(233, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-13 07:50:56'),
(234, 1, 'Create', 'Purchase Order Stock Request', 22, 'Requested the full PO quantity of 3 pairs for PO-4022 from Inventory. Request REQ-2026111308511910', '2026-11-13 07:51:19'),
(235, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-13 07:53:45'),
(236, 2, 'Create', 'Sales Order', NULL, 'Created SO-1019 from PO-4022', '2026-11-13 07:53:54'),
(237, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-13 07:55:53'),
(238, 1, 'Approve', 'Sales Order', 19, 'Approved SO-1019 -> DEL-715 (Team Sales Inventory deducted)', '2026-11-13 07:56:13'),
(239, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-13 07:56:41'),
(240, 2, 'Update', 'Delivery', 15, 'Delivery status set to Delivered', '2026-11-13 07:59:35'),
(241, 2, 'Update', 'Delivery', 15, 'Delivery status set to Delivered', '2026-11-13 07:59:41'),
(242, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-13 13:16:31'),
(243, 1, 'Create', 'Inventory Stock Request', 12, 'Created finished-goods stock request REQ-2026111314164029', '2026-11-13 13:16:40'),
(244, 1, 'Create', 'Inventory Stock Request', 13, 'Created finished-goods stock request REQ-2026111314293370', '2026-11-13 13:29:33'),
(245, 1, 'Create', 'Inventory Stock Request', 14, 'Created finished-goods stock request REQ-2026111314313498', '2026-11-13 13:31:34'),
(246, 1, 'Create', 'Inventory Stock Request', 1, 'Created finished-goods stock request REQ-2026111314482252', '2026-11-13 13:48:22'),
(247, 1, 'Create', 'Inventory Stock Request', 2, 'Created finished-goods stock request REQ-2026111315065787', '2026-11-13 14:06:58'),
(248, 1, 'Create', 'Inventory Stock Request', 3, 'Created finished-goods stock request REQ-2026111315120343', '2026-11-13 14:12:03'),
(249, 1, 'Approve', 'Inventory Delivery', 3, 'Approved receipt for Inventory request REQ-2026111315120343 (DR-20261113151243-5)', '2026-11-13 14:12:43'),
(250, 2, 'Create', 'Quotation', 31, 'Created QT-2031 for customer order REQ-3038', '2026-11-13 14:21:09'),
(251, 1, 'Create', 'Purchase Order Stock Request', 23, 'Requested the full PO quantity of 10 pairs for PO-4023 from Inventory. Request REQ-2026111315215624', '2026-11-13 14:21:56'),
(252, 1, 'Approve', 'Inventory Delivery', 2, 'Approved receipt for Inventory request REQ-2026111315065787 (DR-20261113153204-3)', '2026-11-13 14:32:04'),
(253, 1, 'Approve', 'Inventory Delivery', 1, 'Approved receipt for Inventory request REQ-2026111314482252 (DR-20261113153206-1)', '2026-11-13 14:32:07'),
(254, 1, 'Approve', 'Inventory Delivery', 4, 'Approved receipt for Inventory request REQ-2026111315215624 (DR-20261113153544-7)', '2026-11-13 14:35:44'),
(255, 1, 'Create', 'Inventory Stock Request', 5, 'Created finished-goods stock request REQ-2026111316063324', '2026-11-13 15:06:33'),
(256, 1, 'Approve', 'Inventory Delivery', 5, 'Approved receipt for Inventory request REQ-2026111316063324 (DR-20261113160718-9)', '2026-11-13 15:07:18'),
(257, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-13 15:07:43'),
(258, 2, 'Create', 'Quotation', 32, 'Created QT-2032 for customer order REQ-3039', '2026-11-13 16:06:32'),
(259, 2, 'Create', 'Sales Order', NULL, 'Created SO-1020 from PO-4024', '2026-11-13 16:06:58'),
(260, 1, 'Approve', 'Sales Order', 20, 'Approved SO-1020 -> DEL-716 (Team Sales Inventory deducted)', '2026-11-13 16:07:04'),
(261, 2, 'Update', 'Delivery', 16, 'Delivery status set to Delivered', '2026-11-13 16:07:15'),
(262, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-14 06:40:50'),
(263, 2, 'Create', 'Quotation', 33, 'Created QT-2033 for customer order REQ-3040', '2026-11-14 06:45:54'),
(264, 2, 'Create', 'Sales Order', NULL, 'Created SO-1021 from PO-4025', '2026-11-14 06:47:09'),
(265, 1, 'Approve', 'Sales Order', 21, 'Approved SO-1021 -> DEL-717 (Team Sales Inventory deducted)', '2026-11-14 06:47:15'),
(266, 2, 'Update', 'Delivery', 17, 'Delivery status set to In Transit', '2026-11-14 06:47:36'),
(267, 2, 'Create', 'Quotation', 34, 'Created QT-2034 for customer order REQ-3041', '2026-11-14 06:49:37'),
(268, 1, 'Create', 'Purchase Order Stock Request', 26, 'Requested the full PO quantity of 5 pairs for PO-4026 from Inventory. Request REQ-2026111407500689', '2026-11-14 06:50:06'),
(269, 1, 'Approve', 'Inventory Delivery', 6, 'Approved receipt for Inventory request REQ-2026111407500689 (DR-20261114075125-13)', '2026-11-14 06:51:25'),
(270, 2, 'Create', 'Sales Order', NULL, 'Created SO-1022 from PO-4026', '2026-11-14 06:52:04'),
(271, 1, 'Approve', 'Sales Order', 22, 'Approved SO-1022 -> DEL-718 (Team Sales Inventory deducted)', '2026-11-14 06:52:11'),
(272, 2, 'Create', 'Quotation', 35, 'Created QT-2035 for customer order REQ-3042', '2026-11-14 06:52:58'),
(273, 1, 'Create', 'Purchase Order Stock Request', 27, 'Requested the full PO quantity of 5 pairs for PO-4027 from Inventory. Request REQ-2026111407532197', '2026-11-14 06:53:21'),
(274, 1, 'Approve', 'Inventory Delivery', 7, 'Approved receipt for Inventory request REQ-2026111407532197 (DR-20261114075504-15)', '2026-11-14 06:55:04'),
(275, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-14 10:25:26'),
(276, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-14 12:43:02'),
(277, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-14 13:49:02'),
(278, 2, 'Create', 'Quotation', 36, 'Created QT-2036 for customer order REQ-3044', '2026-11-14 13:49:38'),
(279, 2, 'Create', 'Quotation', 37, 'Created QT-2037 for customer order REQ-3045', '2026-11-14 13:50:38'),
(280, 2, 'Create', 'Quotation', 38, 'Created QT-2038 for customer order REQ-3046', '2026-11-14 14:52:45'),
(281, 2, 'Create', 'Quotation', 39, 'Created QT-2039 for customer order REQ-3047', '2026-11-14 14:58:17'),
(282, 1, 'Create', 'Purchase Order Stock Request', 30, 'Requested the full PO quantity of 6 pairs for PO-4030 from Inventory. Request REQ-2026111415583154', '2026-11-14 14:58:31'),
(283, 1, 'Approve', 'Inventory Delivery', 8, 'Approved receipt for Inventory request REQ-2026111415583154 (DR-20261114155859-18)', '2026-11-14 14:59:00'),
(284, 2, 'Create', 'Sales Order', NULL, 'Created SO-1023 from PO-4030', '2026-11-14 14:59:31'),
(285, 1, 'Approve', 'Sales Order', 23, 'Approved SO-1023 -> DEL-719 (Team Sales Inventory deducted)', '2026-11-14 14:59:39'),
(286, 2, 'Update', 'Delivery', 19, 'Delivery status set to Delivered', '2026-11-14 14:59:46'),
(287, 2, 'Create', 'Quotation', 40, 'Created QT-2040 for customer order REQ-3048', '2026-11-14 15:13:35'),
(288, 1, 'Create', 'Purchase Order Stock Request', 31, 'Requested the full PO quantity of 6 pairs for PO-4031 from Inventory. Request REQ-2026111416135689', '2026-11-14 15:13:56'),
(289, 1, 'Approve', 'Inventory Delivery', 9, 'Approved receipt for Inventory request REQ-2026111416135689 (DR-20261114161429-20)', '2026-11-14 15:14:29'),
(290, 2, 'Create', 'Sales Order', NULL, 'Created SO-1024 from PO-4031', '2026-11-14 15:14:44'),
(291, 1, 'Approve', 'Sales Order', 24, 'Approved SO-1024 -> DEL-720 (Team Sales Inventory deducted)', '2026-11-14 15:14:47'),
(292, 2, 'Create', 'Quotation', 41, 'Created QT-2041 for customer order REQ-3049', '2026-11-14 15:20:43'),
(293, 1, 'Create', 'Purchase Order Stock Request', 32, 'Requested the full PO quantity of 6 pairs for PO-4032 from Inventory. Request REQ-2026111416210079', '2026-11-14 15:21:00'),
(294, 2, 'Create', 'Quotation', 42, 'Created QT-2042 for customer order REQ-3050', '2026-11-14 15:22:43'),
(295, 1, 'Create', 'Purchase Order Stock Request', 33, 'Requested the full PO quantity of 6 pairs for PO-4033 from Inventory. Request REQ-2026111416230153', '2026-11-14 15:23:01'),
(296, 2, 'Create', 'Quotation', 43, 'Created QT-2043 for customer order REQ-3051', '2026-11-14 15:30:19'),
(297, 1, 'Create', 'Purchase Order Stock Request', 34, 'Requested the full PO quantity of 6 pairs for PO-4034 from Inventory. Request REQ-2026111416303264', '2026-11-14 15:30:32'),
(298, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-15 01:15:25'),
(299, 2, 'Update', 'Delivery', 18, 'Delivery status set to In Transit', '2026-11-15 01:15:46'),
(300, 2, 'Update', 'Delivery', 20, 'Delivery status set to In Transit', '2026-11-15 01:15:47'),
(301, 0, 'Sign In', 'Authentication', NULL, 'User signed in', '2026-11-15 05:35:11');

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
  `method` enum('Cash','GCash','Bank Transfer','Cash on Delivery','Debit','Credit','Debit/Credit Card') NOT NULL DEFAULT 'Cash',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `collections`
--

INSERT INTO `collections` (`col_id`, `collection_no`, `invoice_id`, `collection_date`, `due_date`, `amount`, `method`, `created_at`) VALUES
(1, 'COL-0001', 1, '2026-10-04', '2026-11-03', 12000.00, 'GCash', '2026-10-09 04:13:58'),
(2, 'COL-502', 2, '2026-10-09', '2026-11-08', 150000.00, 'Cash', '2026-10-09 06:02:57'),
(3, 'COL-503', 3, '2026-10-09', '2026-11-08', 150018.00, 'Cash', '2026-10-09 06:53:04'),
(4, 'COL-504', 4, '2026-10-09', '2026-11-08', 150000.00, 'Bank Transfer', '2026-10-09 20:27:01'),
(5, 'COL-505', 5, '2026-11-03', '2026-12-03', 10500.00, 'Cash', '2026-11-03 06:23:25'),
(6, 'COL-506', 7, '2026-11-07', '2026-12-07', 2500.00, 'Cash', '2026-11-07 00:05:12'),
(7, 'COL-507', 8, '2026-11-07', '2026-12-07', 12400.00, 'Cash', '2026-11-07 06:24:48'),
(8, 'COL-508', 9, '2026-11-08', '2026-11-08', 2500.00, 'GCash', '2026-11-08 02:23:45'),
(9, 'COL-509', 10, '2026-11-10', '2026-11-10', 2500.00, 'Cash', '2026-11-10 08:48:16'),
(10, 'COL-510', 6, '2026-11-10', '2026-11-10', 500.00, 'Cash', '2026-11-10 08:53:07'),
(11, 'COL-511', 6, '2026-11-10', '2026-11-10', 500.00, 'Cash', '2026-11-10 08:53:12'),
(12, 'COL-512', 6, '2026-11-10', '2026-11-10', 500.00, 'Cash', '2026-11-10 08:53:38'),
(13, 'COL-513', 6, '2026-11-10', '2026-11-10', 50.00, 'Cash', '2026-11-10 08:54:00'),
(14, 'COL-514', 6, '2026-11-10', '2026-11-10', 3450.00, 'Cash', '2026-11-10 11:58:01'),
(15, 'COL-515', 11, '2026-11-11', '2026-11-11', 2554.36, 'GCash', '2026-11-11 12:49:37'),
(16, 'COL-516', 13, '2026-11-13', '2026-11-13', 2300.00, 'GCash', '2026-11-13 07:13:01'),
(17, 'COL-517', 15, '2026-11-13', '2026-11-13', 6954.36, 'Cash', '2026-11-13 07:58:49'),
(18, 'COL-518', 16, '2026-11-22', '2026-11-22', 11554.36, 'GCash', '2026-11-13 16:07:48'),
(19, 'COL-519', 18, '2026-11-14', '2026-11-14', 23054.36, 'GCash', '2026-11-14 07:58:53'),
(20, 'COL-520', 19, '2026-11-14', '2026-11-14', 21054.36, 'GCash', '2026-11-14 15:00:15'),
(21, 'COL-521', 20, '2026-11-14', '2026-11-14', 21054.36, 'GCash', '2026-11-14 15:15:08'),
(22, 'COL-522', 17, '2026-11-14', '2026-12-14', 13854.36, 'Cash', '2026-11-14 17:42:32'),
(23, 'COL-b868f49a5f2d288bd2461a9677', 14, '2026-11-15', NULL, 300.00, 'Debit/Credit Card', '2026-11-14 17:56:11'),
(24, 'COL-49361dc52a0385581d49af59f4', 14, '2026-11-15', NULL, 20.00, 'Debit/Credit Card', '2026-11-14 18:01:05');

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
  `status` enum('Active','Inactive') NOT NULL DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `customers`
--

INSERT INTO `customers` (`cus_id`, `customer_code`, `customer_name`, `phone`, `email`, `address`, `city`, `province`, `payment_terms`, `status`, `created_at`, `updated_at`) VALUES
(1, 'CUS-001', 'HardRold', '+6309171234567', 'banaagstudio@gmail.com', 'Santa Elena', 'City of San Pablo', 'Laguna', '30 Days', 'Active', '2026-10-09 04:13:58', '2026-11-11 12:42:31'),
(2, 'CUS-002', 'Ilagan Print Co.', '09181234567', 'ilaganprint@gmail.com', 'Maharlika Highway', 'San Pablo City', 'Laguna', '30 Days', 'Active', '2026-10-09 04:13:58', '2026-10-09 04:13:58'),
(3, 'CUS-003', 'San Pablo Supplies', '09191234567', 'sanpablosupplies@gmail.com', 'Barangay San Rafael', 'San Pablo City', 'Laguna', '15 Days', 'Active', '2026-10-09 04:13:58', '2026-10-09 04:13:58'),
(4, 'CUS-004', 'asdasdasd', '09171234567', 'justinebundalian76@gmail.com', 'Sta. Elena', NULL, NULL, '30 Days', 'Active', '2026-10-26 07:51:22', '2026-10-26 07:51:22'),
(5, 'CUS-005', 'Kevin Calica', '09915548862', 'kevincalica@gmail.com', 'Tondo', 'San Pablo City', 'Dolores', '30 Days', 'Active', '2026-11-07 06:18:16', '2026-11-10 12:15:09'),
(6, 'CUS-006', 'Hero Nemo', '09171234567', 'justineuchiha@gmail.com', 'Sta. Elena', 'San Pablo City', 'Laguna', '30 Days', 'Active', '2026-11-07 12:12:55', '2026-11-10 12:15:18'),
(7, 'CUS-007', 'John Darwin Ilagan', '+639563844214', 'windelali@gmail.com', 'Rosario', 'Malinao', 'Aklan', '30 Days', 'Active', '2026-11-10 12:58:39', '2026-11-10 12:59:16');

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
  `size` varchar(30) DEFAULT NULL,
  `quantity` int(10) UNSIGNED NOT NULL,
  `shipping_fee` decimal(12,2) NOT NULL DEFAULT 0.00,
  `notes` varchar(500) DEFAULT NULL,
  `status` enum('Pending Quotation','Quotation Sent','Quotation Approved','Quotation Rejected','Converted','Cancelled') NOT NULL DEFAULT 'Pending Quotation',
  `quotation_id` int(10) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `customer_order_requests`
--

INSERT INTO `customer_order_requests` (`req_id`, `request_no`, `customer_id`, `request_date`, `product_code`, `size`, `quantity`, `shipping_fee`, `notes`, `status`, `quotation_id`, `created_at`, `updated_at`) VALUES
(1, 'REQ-0001', 1, '2026-10-01', 'FG-001', NULL, 10, 0.00, 'Customer requested standard packaging.', 'Pending Quotation', NULL, '2026-10-09 04:13:58', '2026-10-09 04:13:58'),
(2, 'REQ-0002', 2, '2026-10-02', 'FG-002', NULL, 20, 0.00, 'Customer needs the items before the end of the month.', 'Pending Quotation', NULL, '2026-10-09 04:13:58', '2026-10-09 04:13:58'),
(3, 'REQ-0003', 3, '2026-10-03', 'FG-003', NULL, 15, 0.00, 'Please confirm stock availability.', 'Pending Quotation', NULL, '2026-10-09 04:13:58', '2026-10-09 04:13:58'),
(6, 'REQ-3004', 1, '2026-10-09', 'SH-003', NULL, 3, 0.00, '', 'Quotation Sent', 3, '2026-10-09 05:59:54', '2026-10-09 06:00:04'),
(7, 'REQ-3007', 1, '2026-10-09', 'SH-001', NULL, 3, 0.00, '', 'Converted', 4, '2026-10-09 06:00:46', '2026-10-09 06:01:52'),
(8, 'REQ-3008', 1, '2026-10-09', 'SH-002', NULL, 3, 0.00, '', 'Quotation Sent', 5, '2026-10-09 06:09:13', '2026-10-09 06:09:22'),
(9, 'REQ-3009', 1, '2026-10-09', 'SH-001', NULL, 1, 0.00, '', 'Pending Quotation', NULL, '2026-10-09 06:24:34', '2026-10-09 06:24:34'),
(10, 'REQ-3010', 1, '2026-10-09', 'SH-002', NULL, 3, 0.00, '', 'Converted', 6, '2026-10-09 06:49:20', '2026-10-09 06:51:46'),
(11, 'REQ-3011', 1, '2026-10-10', 'SH-003', NULL, 1, 0.00, '', 'Pending Quotation', NULL, '2026-10-09 20:22:10', '2026-10-09 20:22:10'),
(12, 'REQ-3012', 1, '2026-10-10', 'SH-002', NULL, 3, 0.00, '', 'Pending Quotation', NULL, '2026-10-09 20:23:16', '2026-10-09 20:23:16'),
(13, 'REQ-3013', 1, '2026-10-10', 'SH-003', NULL, 3, 0.00, '', 'Converted', 7, '2026-10-09 20:23:34', '2026-10-09 20:25:33'),
(14, 'REQ-3014', 1, '2026-10-10', 'SH-003', NULL, 3, 0.00, '', 'Converted', 8, '2026-10-10 05:21:54', '2026-10-10 05:23:01'),
(15, 'REQ-3015', 1, '2026-10-10', 'SH-003', NULL, 3, 0.00, '', 'Quotation Sent', 9, '2026-10-10 05:24:26', '2026-10-10 05:25:16'),
(16, 'REQ-3016', 1, '2026-10-11', 'SH-001', NULL, 3, 0.00, '', 'Converted', 10, '2026-10-10 23:42:30', '2026-10-10 23:43:49'),
(17, 'REQ-3017', 1, '2026-10-29', 'SH-001', NULL, 2, 0.00, 'Hello', 'Quotation Sent', 12, '2026-10-29 01:23:46', '2026-10-29 01:24:29'),
(18, 'REQ-3018', 1, '2026-11-03', 'SH-003', NULL, 3, 0.00, '', 'Converted', 13, '2026-11-03 06:17:15', '2026-11-03 06:20:57'),
(19, 'REQ-3019', 1, '2026-11-05', 'SH-001', NULL, 2, 0.00, '', 'Converted', 14, '2026-11-05 10:08:43', '2026-11-05 10:14:47'),
(20, 'REQ-3020', 1, '2026-11-05', 'SH-003', NULL, 2, 0.00, '', 'Converted', 15, '2026-11-05 10:11:04', '2026-11-06 03:40:38'),
(21, 'REQ-3021', 1, '2026-11-06', 'SH-003', NULL, 2, 0.00, '', 'Converted', 16, '2026-11-06 03:36:08', '2026-11-06 03:40:35'),
(22, 'REQ-3022', 1, '2026-11-07', 'SH-001', NULL, 1, 0.00, '', 'Converted', 17, '2026-11-07 00:02:47', '2026-11-07 00:04:21'),
(23, 'REQ-3023', 1, '2026-11-07', 'SH-003', NULL, 5, 0.00, '', 'Pending Quotation', NULL, '2026-11-07 06:15:44', '2026-11-07 06:15:44'),
(24, 'REQ-3024', 5, '2026-11-07', 'SH-003', NULL, 5, 0.00, 'yung kakasya sakin salamat!', 'Converted', 18, '2026-11-07 06:18:56', '2026-11-07 06:22:28'),
(25, 'REQ-3025', 1, '2026-11-08', 'SH-003', NULL, 1, 0.00, '', 'Converted', 19, '2026-11-08 02:17:35', '2026-11-08 02:22:48'),
(26, 'REQ-3026', 1, '2026-11-10', 'SH-001', NULL, 1, 0.00, '', 'Converted', 20, '2026-11-10 06:56:54', '2026-11-10 08:47:17'),
(27, 'REQ-3027', 1, '2026-11-10', 'SH-003', NULL, 2, 0.00, '', 'Quotation Sent', 21, '2026-11-10 06:58:39', '2026-11-10 06:58:58'),
(28, 'REQ-3028', 1, '2026-11-10', 'SH-003', NULL, 2, 0.00, '', 'Quotation Sent', 22, '2026-11-10 07:18:46', '2026-11-10 07:18:58'),
(29, 'REQ-3029', 1, '2026-11-10', 'SH-003', NULL, 2, 0.00, '', 'Pending Quotation', NULL, '2026-11-10 10:35:06', '2026-11-10 10:35:06'),
(30, 'REQ-3030', 1, '2026-11-11', 'SH-003', NULL, 1, 54.36, '', 'Converted', 23, '2026-11-11 12:46:20', '2026-11-11 12:48:44'),
(31, 'REQ-3031', 1, '2026-11-11', 'SH-001', NULL, 1, 54.36, '', 'Converted', 24, '2026-11-11 12:57:20', '2026-11-11 12:57:57'),
(32, 'REQ-3032', 1, '2026-11-12', 'FG-001-S27', NULL, 1, 54.36, '', 'Converted', 25, '2026-11-12 13:18:39', '2026-11-12 13:19:31'),
(33, 'REQ-3033', 1, '2026-11-12', 'FG-001-S27', NULL, 3, 54.36, '', 'Converted', 26, '2026-11-12 13:58:01', '2026-11-12 13:58:36'),
(34, 'REQ-3034', 1, '2026-11-12', 'FG-001-S27', NULL, 3, 54.36, '', 'Converted', 27, '2026-11-12 14:02:43', '2026-11-12 14:03:20'),
(35, 'REQ-3035', 1, '2026-11-13', 'FG-001-S27', NULL, 2, 54.36, '', 'Converted', 28, '2026-11-13 07:08:03', '2026-11-13 07:09:51'),
(36, 'REQ-3036', 1, '2026-11-13', 'FG-001-S27', NULL, 3, 54.36, '', 'Converted', 29, '2026-11-13 07:14:02', '2026-11-13 07:16:11'),
(37, 'REQ-3037', 1, '2026-11-13', 'FG-001-S27', NULL, 3, 54.36, 'gdeydgieiebhc', 'Converted', 30, '2026-11-13 07:37:54', '2026-11-13 07:49:57'),
(38, 'REQ-3038', 1, '2026-11-13', 'FG-001-S34', NULL, 10, 54.36, 'Holy Cow, pede na makabili ng motor dyan kumpadre', 'Converted', 31, '2026-11-13 14:20:56', '2026-11-13 14:21:50'),
(39, 'REQ-3039', 1, '2026-11-14', 'FG-001-S27', NULL, 5, 54.36, '', 'Converted', 32, '2026-11-13 16:06:17', '2026-11-13 16:06:54'),
(40, 'REQ-3040', 1, '2026-11-14', 'FG-001-S29', NULL, 3, 54.36, '', 'Converted', 33, '2026-11-14 06:40:46', '2026-11-14 06:47:02'),
(41, 'REQ-3041', 1, '2026-11-14', 'FG-001-S29', NULL, 5, 54.36, '', 'Converted', 34, '2026-11-14 06:49:06', '2026-11-14 06:49:51'),
(42, 'REQ-3042', 1, '2026-11-14', 'FG-001-S29', NULL, 5, 54.36, '', 'Converted', 35, '2026-11-14 06:52:46', '2026-11-14 06:53:08'),
(43, 'REQ-3043', 1, '2026-11-14', 'FG-001-S29', NULL, 6, 54.36, '', 'Pending Quotation', NULL, '2026-11-14 13:48:44', '2026-11-14 13:48:44'),
(44, 'REQ-3044', 1, '2026-11-14', 'FG-001-S28', NULL, 6, 54.36, '', 'Quotation Sent', 36, '2026-11-14 13:49:27', '2026-11-14 13:49:38'),
(45, 'REQ-3045', 1, '2026-11-14', 'FG-001-S28', NULL, 6, 54.36, '', 'Converted', 37, '2026-11-14 13:50:25', '2026-11-14 13:50:45'),
(46, 'REQ-3046', 1, '2026-11-14', 'FG-001-S28', NULL, 6, 54.36, '', 'Converted', 38, '2026-11-14 14:52:30', '2026-11-14 14:53:06'),
(47, 'REQ-3047', 1, '2026-11-14', 'FG-001-S28', '28', 6, 54.36, '', 'Converted', 39, '2026-11-14 14:58:04', '2026-11-14 14:58:26'),
(48, 'REQ-3048', 1, '2026-11-14', 'FG-001-S28', '28', 6, 54.36, '', 'Converted', 40, '2026-11-14 15:13:20', '2026-11-14 15:13:47'),
(49, 'REQ-3049', 1, '2026-11-14', 'FG-001-S28', '28', 6, 54.36, '', 'Converted', 41, '2026-11-14 15:20:34', '2026-11-14 15:20:53'),
(50, 'REQ-3050', 1, '2026-11-14', 'FG-001-S28', '28', 6, 54.36, '', 'Converted', 42, '2026-11-14 15:22:34', '2026-11-14 15:22:56'),
(51, 'REQ-3051', 1, '2026-11-14', 'FG-001-S28', '28', 6, 54.36, '', 'Converted', 43, '2026-11-14 15:30:02', '2026-11-14 15:30:28');

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
(4, 'DEL-704', 4, '2026-10-10', 'Delivered', 1, '2026-10-09 20:25:59'),
(5, 'DEL-705', 5, '2026-11-03', 'Delivered', 1, '2026-11-03 06:21:32'),
(6, 'DEL-706', 8, '2026-11-06', 'Delivered', 1, '2026-11-06 03:41:08'),
(7, 'DEL-707', 11, '2026-11-07', 'Delivered', 1, '2026-11-07 00:04:33'),
(8, 'DEL-708', 12, '2026-11-07', 'Delivered', 1, '2026-11-07 06:22:58'),
(9, 'DEL-709', 13, '2026-11-08', 'Delivered', 1, '2026-11-08 02:23:10'),
(10, 'DEL-710', 14, '2026-11-10', 'Delivered', 1, '2026-11-10 08:47:33'),
(11, 'DEL-711', 15, '2026-11-11', 'Delivered', 1, '2026-11-11 12:48:56'),
(12, 'DEL-712', 16, '2026-11-11', 'Delivered', 1, '2026-11-11 12:58:08'),
(13, 'DEL-713', 17, '2026-11-13', 'Delivered', 1, '2026-11-13 07:10:20'),
(14, 'DEL-714', 18, '2026-11-13', 'Delivered', 1, '2026-11-13 07:17:03'),
(15, 'DEL-715', 19, '2026-11-13', 'Delivered', 1, '2026-11-13 07:56:13'),
(16, 'DEL-716', 20, '2026-11-14', 'Delivered', 1, '2026-11-13 16:07:04'),
(17, 'DEL-717', 21, '2026-11-14', 'In Transit', 1, '2026-11-14 06:47:15'),
(18, 'DEL-718', 22, '2026-11-14', 'In Transit', 1, '2026-11-14 06:52:11'),
(19, 'DEL-719', 23, '2026-11-14', 'Delivered', 1, '2026-11-14 14:59:39'),
(20, 'DEL-720', 24, '2026-11-14', 'In Transit', 1, '2026-11-14 15:14:47');

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

--
-- Dumping data for table `gateway_payment_events`
--

INSERT INTO `gateway_payment_events` (`event_id`, `transaction_ref`, `invoice_id`, `amount_centavos`, `payment_method`, `status`, `created_at`) VALUES
('95075235e6e577f9ce892b857857d908', 'PG-07C93DDA9E698049', 14, 2000, 'CARD', 'SUCCESS', '2026-11-14 18:01:05'),
('ac4ff60e0d6b5ccc529e71a41650e813', 'PG-F382A51892402FE2', 14, 30000, 'CARD', 'SUCCESS', '2026-11-14 17:56:11');

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
  `unit_price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `reorder_level` decimal(12,2) NOT NULL DEFAULT 0.00,
  `status` enum('Active','Inactive') NOT NULL DEFAULT 'Active',
  `last_updated` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `inventory`
--

INSERT INTO `inventory` (`inventory_id`, `product_code`, `product_name`, `brand`, `size`, `unit`, `stock_quantity`, `unit_price`, `reorder_level`, `status`, `last_updated`, `created_at`) VALUES
(24, 'FG-001-S27', 'Quick Step Classic Low', '', '', 'pairs', 7.00, 2300.00, 0.00, 'Active', '2026-11-14 00:08:23', '2026-11-12 12:49:59'),
(28, 'FG-001-S29', 'Quick Step Classic Low', '', '', 'pairs', 10.00, 4600.00, 0.00, 'Active', '2026-11-14 15:59:15', '2026-11-13 13:35:16'),
(31, 'FG-001-S28', 'Quick Step Classic Low', '', '', 'pairs', 2.00, 3500.00, 0.00, 'Active', '2026-11-14 23:14:47', '2026-11-13 14:07:30'),
(32, 'FG-001-S34', 'Quick Step Classic Low', '', '', 'pairs', 13.00, 7000.00, 0.00, 'Active', '2026-11-13 22:35:44', '2026-11-13 14:12:43'),
(34, 'FG-003-S42', 'Quick Step Court Flex', '', '', 'pairs', 10.00, 2500.00, 0.00, 'Active', '2026-11-13 23:22:01', '2026-11-13 15:07:18');

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

--
-- Dumping data for table `inventory_delivery_approvals`
--

INSERT INTO `inventory_delivery_approvals` (`approval_id`, `inventory_request_number`, `inventory_delivery_id`, `inventory_request_status`, `inventory_delivery_status`, `items_json`, `approval_status`, `inventory_receipt_number`, `approved_by`, `approved_at`, `created_at`, `updated_at`) VALUES
(1, 'REQ-2026111314482252', 1, 'Approved', 'Delivered', '[{\"request_item_id\":1,\"item_id\":21,\"item_name\":\"Quick Step Classic Low\",\"requested_quantity\":3,\"approved_quantity\":3,\"delivered_quantity\":3,\"accepted_quantity\":0,\"unit\":\"pairs\",\"remaining_quantity\":3}]', 'Approved', 'DR-20261113153206-1', 1, '2026-11-13 22:32:07', '2026-11-13 14:06:05', '2026-11-13 14:32:07'),
(2, 'REQ-2026111315065787', 3, 'Approved', 'Delivered', '[{\"request_item_id\":2,\"item_id\":22,\"item_name\":\"Quick Step Classic Low\",\"requested_quantity\":2,\"approved_quantity\":2,\"delivered_quantity\":2,\"accepted_quantity\":0,\"unit\":\"pairs\",\"remaining_quantity\":2}]', 'Approved', 'DR-20261113153204-3', 1, '2026-11-13 22:32:04', '2026-11-13 14:07:45', '2026-11-13 14:32:04'),
(3, 'REQ-2026111315120343', 5, 'Approved', 'Delivered', '[{\"request_item_id\":3,\"item_id\":28,\"item_name\":\"Quick Step Classic Low\",\"requested_quantity\":3,\"approved_quantity\":3,\"delivered_quantity\":3,\"accepted_quantity\":0,\"unit\":\"pairs\",\"remaining_quantity\":3}]', 'Approved', 'DR-20261113151243-5', 1, '2026-11-13 22:12:43', '2026-11-13 14:12:36', '2026-11-13 14:12:43'),
(4, 'REQ-2026111315215624', 7, 'Approved', 'Delivered', '[{\"request_item_id\":4,\"item_id\":28,\"item_name\":\"Quick Step Classic Low\",\"requested_quantity\":10,\"approved_quantity\":10,\"delivered_quantity\":10,\"accepted_quantity\":0,\"unit\":\"pairs\",\"remaining_quantity\":10}]', 'Approved', 'DR-20261113153544-7', 1, '2026-11-13 22:35:44', '2026-11-13 14:35:40', '2026-11-13 14:35:44'),
(5, 'REQ-2026111316063324', 9, 'Approved', 'Delivered', '[{\"request_item_id\":5,\"item_id\":74,\"item_name\":\"Quick Step Court Flex\",\"requested_quantity\":10,\"approved_quantity\":10,\"delivered_quantity\":10,\"accepted_quantity\":0,\"unit\":\"pairs\",\"remaining_quantity\":10}]', 'Approved', 'DR-20261113160718-9', 1, '2026-11-13 23:07:18', '2026-11-13 15:07:15', '2026-11-13 15:07:18'),
(6, 'REQ-2026111407500689', 13, 'Approved', 'Delivered', '[{\"request_item_id\":8,\"item_id\":23,\"item_name\":\"Quick Step Classic Low\",\"requested_quantity\":5,\"approved_quantity\":5,\"delivered_quantity\":5,\"accepted_quantity\":0,\"unit\":\"pairs\",\"remaining_quantity\":5}]', 'Approved', 'DR-20261114075125-13', 1, '2026-11-14 14:51:25', '2026-11-14 06:51:06', '2026-11-14 06:51:25'),
(7, 'REQ-2026111407532197', 15, 'Approved', 'Delivered', '[{\"request_item_id\":9,\"item_id\":23,\"item_name\":\"Quick Step Classic Low\",\"requested_quantity\":5,\"approved_quantity\":5,\"delivered_quantity\":5,\"accepted_quantity\":0,\"unit\":\"pairs\",\"remaining_quantity\":5}]', 'Approved', 'DR-20261114075504-15', 1, '2026-11-14 14:55:04', '2026-11-14 06:55:01', '2026-11-14 06:55:04'),
(8, 'REQ-2026111415583154', 18, 'Approved', 'Delivered', '[{\"request_item_id\":11,\"item_id\":22,\"item_name\":\"Quick Step Classic Low\",\"requested_quantity\":6,\"approved_quantity\":6,\"delivered_quantity\":6,\"accepted_quantity\":0,\"unit\":\"pairs\",\"size\":\"28\",\"item_type\":\"Finished Good\",\"item_master_size\":\"28\",\"remaining_quantity\":6}]', 'Approved', 'DR-20261114155859-18', 1, '2026-11-14 22:59:00', '2026-11-14 14:58:54', '2026-11-14 14:59:00'),
(9, 'REQ-2026111416135689', 20, 'Approved', 'Delivered', '[{\"request_item_id\":12,\"item_id\":22,\"item_name\":\"Quick Step Classic Low\",\"requested_quantity\":6,\"approved_quantity\":6,\"delivered_quantity\":6,\"accepted_quantity\":0,\"unit\":\"pairs\",\"size\":\"28\",\"item_type\":\"Finished Good\",\"item_master_size\":\"28\",\"remaining_quantity\":6}]', 'Approved', 'DR-20261114161429-20', 1, '2026-11-14 23:14:29', '2026-11-14 15:14:27', '2026-11-14 15:14:29');

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
  `request_status` enum('Requested','Inventory Approved','Stocked Out','Approved','Rejected') NOT NULL DEFAULT 'Requested',
  `requested_at` datetime NOT NULL DEFAULT current_timestamp(),
  `inventory_approved_at` datetime DEFAULT NULL,
  `stocked_out_at` datetime DEFAULT NULL,
  `reviewed_by` int(10) UNSIGNED DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `source_reference` varchar(100) DEFAULT NULL,
  `remarks` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `inventory_stockout_approvals`
--

INSERT INTO `inventory_stockout_approvals` (`id`, `inventory_request_id`, `inventory_request_number`, `inventory_stock_out_id`, `stock_out_number`, `product_code`, `product_name`, `quantity`, `unit`, `destination`, `request_status`, `requested_at`, `inventory_approved_at`, `stocked_out_at`, `reviewed_by`, `reviewed_at`, `source_reference`, `remarks`, `created_at`) VALUES
(1, 18, 'REQ-SALES-20261109154830-80A6C7B7', 6, 'SOUT-20261109154841-12-1', 'SH-001', 'Classic Black Sneakers', 2.00, 'pairs', 'Sales', 'Approved', '2026-10-09 12:14:36', '2026-10-08 16:49:57', '2026-11-09 00:00:00', NULL, '2026-11-06 17:22:09', 'REQ-SALES-009', 'Imported from Inventory System stock-out. Inventory System approved and stock-out completed; quantity added to Team Sales Inventory.', '2026-10-09 04:14:36'),
(2, 19, 'REQ-SALES-20261109154342-87E7717F', 5, 'SOUT-20261109154354-11-1', 'SH-001', 'Classic Black Sneakers', 3.00, 'pairs', 'Sales', 'Approved', '2026-10-09 12:14:36', '2026-10-08 16:46:20', '2026-11-09 00:00:00', NULL, '2026-11-06 17:22:09', 'REQ-SALES-010', 'Imported from Inventory System stock-out. Inventory System approved and stock-out completed; quantity added to Team Sales Inventory.', '2026-10-09 04:14:36'),
(3, 13, 'REQ-SALES-20261109152839-7ADF0769', 4, 'SOUT-20261109152903-10-1', 'SH-001', 'Classic Black Sneakers', 3.00, 'pairs', 'Sales', 'Approved', '2026-10-09 12:14:36', '2026-10-08 16:22:47', '2026-11-09 00:00:00', NULL, '2026-11-06 17:22:09', 'REQ-SALES-004', 'Imported from Inventory System stock-out. Inventory System approved and stock-out completed; quantity added to Team Sales Inventory.', '2026-10-09 04:14:36'),
(4, 26, 'REQ-SALES-017', NULL, NULL, 'SH-003', 'Red Runner Shoes', 10.00, 'pairs', 'Sales', 'Requested', '2026-10-09 14:04:34', NULL, NULL, NULL, NULL, 'QT-2003', 'Requested for QT-2003', '2026-10-09 06:04:34'),
(5, 27, 'REQ-SALES-018', NULL, NULL, 'SH-002', 'White Court Shoes', 12.00, 'pairs', 'Sales', 'Requested', '2026-10-09 14:09:54', NULL, NULL, NULL, NULL, 'QT-2005', 'Requested for QT-2005', '2026-10-09 06:09:54'),
(6, 28, 'REQ-SALES-019', NULL, NULL, 'SH-002', 'White Court Shoes', 12.00, 'pairs', 'Sales', 'Requested', '2026-10-09 14:09:59', NULL, NULL, NULL, NULL, 'QT-2005', 'Requested for QT-2005', '2026-10-09 06:09:59'),
(7, 29, 'REQ-SALES-020', NULL, NULL, 'SH-002', 'White Court Shoes', 12.00, 'pairs', 'Sales', 'Rejected', '2026-10-09 14:50:12', '2026-11-07 20:18:34', NULL, NULL, NULL, 'QT-2005', 'Requested for QT-2005', '2026-10-09 06:50:12'),
(8, 30, 'REQ-SALES-021', NULL, NULL, 'SH-002', 'White Court Shoes', 12.00, 'pairs', 'Sales', 'Rejected', '2026-10-09 14:50:15', '2026-11-07 20:18:31', NULL, NULL, NULL, 'QT-2005', 'Requested for QT-2005', '2026-10-09 06:50:15'),
(9, 31, 'REQ-SALES-20261109155219-0380BF69', 7, 'SOUT-20261109155238-13-1', 'SH-001', 'Classic Black Sneakers', 2.00, 'pairs', 'Sales', 'Approved', '2026-10-09 14:50:20', '2026-10-09 14:50:45', '2026-11-09 00:00:00', NULL, '2026-10-09 14:50:51', 'QT-2006', 'Requested for QT-2006 Inventory System approved and stock-out completed; quantity added to Team Sales Inventory.', '2026-10-09 06:50:20'),
(10, 32, 'REQ-SALES-20261110043658-FA58049C', 8, 'SOUT-20261110043836-14-1', 'SH-001', 'Classic Black Sneakers', 2.00, 'pairs', 'Sales', 'Approved', '2026-10-10 04:24:09', '2026-10-10 04:24:36', '2026-11-10 00:00:00', NULL, '2026-10-10 04:24:51', 'QT-2007', 'Requested for QT-2007 Inventory System approved and stock-out completed; quantity added to Team Sales Inventory.', '2026-10-09 20:24:09'),
(11, 33, 'REQ-SALES-20261110081908-4A80AC57', 9, 'SOUT-20261110081918-16-1', 'SH-003', 'Red Runner Shoes', 2.00, 'pairs', 'Sales', 'Approved', '2026-10-10 13:22:16', '2026-10-10 13:22:58', '2026-11-10 00:00:00', NULL, '2026-10-10 13:23:10', 'QT-2008', 'Requested for QT-2008 Inventory System approved and stock-out completed; quantity added to Team Sales Inventory.', '2026-10-10 05:22:16'),
(12, 34, 'REQ-SALES-025', NULL, NULL, 'SH-001', 'Classic Black Sneakers', 2.00, 'pairs', 'Sales', 'Rejected', '2026-10-27 09:52:15', '2026-11-07 20:18:29', NULL, NULL, NULL, 'Specific stock request from Sales Approval', 'Requested for Specific stock request from Sales Approval', '2026-10-27 01:52:15'),
(13, 35, 'REQ-SALES-026', 10, 'SOUT-20261103071913-35-1', 'SH-003', 'Red Runner Shoes', 3.00, 'pairs', 'Sales', 'Approved', '2026-11-03 14:18:38', '2026-11-03 14:19:13', '2026-11-03 00:00:00', NULL, '2026-11-03 14:19:20', 'QT-2013', 'Requested for QT-2013 Inventory System approved and stock-out completed; quantity added to Team Sales Inventory.', '2026-11-03 06:18:38'),
(14, 36, 'REQ-SALES-027', 11, 'SOUT-20261106043936-36-1', 'SH-003', 'Red Runner Shoes', 2.00, 'pairs', 'Sales', 'Approved', '2026-11-06 11:38:19', '2026-11-06 11:39:36', '2026-11-06 00:00:00', NULL, '2026-11-06 11:39:57', 'QT-2016', 'Requested for QT-2016 Inventory System approved and stock-out completed; quantity added to Team Sales Inventory.', '2026-11-06 03:38:19'),
(15, 37, 'REQ-SALES-028', NULL, NULL, 'SH-003', 'Red Runner Shoes', 2.00, 'pairs', 'Sales', 'Rejected', '2026-11-06 11:41:09', '2026-11-07 20:18:27', NULL, NULL, NULL, 'SO-1007', 'Requested for SO-1007', '2026-11-06 03:41:09'),
(16, 38, 'REQ-SALES-029', NULL, NULL, 'SH-003', 'Red Runner Shoes', 2.00, 'pairs', 'Sales', 'Rejected', '2026-11-06 11:41:18', '2026-11-07 20:18:25', NULL, NULL, NULL, 'SO-1007', 'Requested for SO-1007', '2026-11-06 03:41:18'),
(17, 39, 'REQ-SALES-030', 12, 'SOUT-20261106101435-39-1', 'SH-001', 'Classic Black Sneakers', 2.00, 'pairs', 'Sales', 'Approved', '2026-11-06 17:13:51', '2026-11-06 17:14:35', '2026-11-06 00:00:00', NULL, '2026-11-06 17:14:39', 'Specific finished-goods stock request from Sales Admin', 'Requested for Specific finished-goods stock request from Sales Admin Inventory System approved and stock-out completed; quantity added to Team Sales Inventory.', '2026-11-06 09:13:51'),
(18, 40, 'REQ-SALES-031', 13, 'SOUT-20261106101555-40-1', 'SH-003', 'Red Runner Shoes', 2.00, 'pairs', 'Sales', 'Approved', '2026-11-06 17:15:37', '2026-11-06 17:15:55', '2026-11-06 00:00:00', NULL, '2026-11-06 17:15:58', 'Specific finished-goods stock request from Sales Admin', 'Requested for Specific finished-goods stock request from Sales Admin Inventory System approved and stock-out completed; quantity added to Team Sales Inventory.', '2026-11-06 09:15:37'),
(32, 25, 'REQ-SALES-016', NULL, NULL, 'SH-001', 'Classic Black Sneakers', 1.00, 'pairs', 'Sales', 'Requested', '2026-10-08 00:00:00', NULL, NULL, NULL, NULL, 'REQ-SALES-016', 'Stock-out requested by Team Sales because Team Sales inventory is insufficient. Reference: QT-2039', '2026-11-06 09:22:09'),
(33, 24, 'REQ-SALES-015', NULL, NULL, 'SH-001', 'Classic Black Sneakers', 2.00, 'pairs', 'Sales', 'Requested', '2026-10-08 00:00:00', NULL, NULL, NULL, NULL, 'REQ-SALES-015', 'Stock-out requested by Team Sales because Team Sales inventory is insufficient. Reference: QT-2038', '2026-11-06 09:22:09'),
(34, 23, 'REQ-SALES-014', NULL, NULL, 'SH-001', 'Classic Black Sneakers', 20.00, 'pairs', 'Sales', 'Requested', '2026-10-08 00:00:00', NULL, NULL, NULL, NULL, 'REQ-SALES-014', 'Stock-out requested by Team Sales because Team Sales inventory is insufficient. Reference: pahinge', '2026-11-06 09:22:09'),
(35, 22, 'REQ-SALES-013', NULL, NULL, 'SH-001', 'Classic Black Sneakers', 20.00, 'pairs', 'Sales', 'Requested', '2026-10-08 00:00:00', NULL, NULL, NULL, NULL, 'REQ-SALES-013', 'Stock-out requested by Team Sales because Team Sales inventory is insufficient. Reference: pahinge', '2026-11-06 09:22:09'),
(36, 21, 'REQ-SALES-012', NULL, NULL, 'SH-001', 'Classic Black Sneakers', 5.00, 'pairs', 'Sales', 'Requested', '2026-10-08 00:00:00', NULL, NULL, NULL, NULL, 'REQ-SALES-012', 'Stock-out requested by Team Sales because Team Sales inventory is insufficient. Reference: QT-2037', '2026-11-06 09:22:09'),
(37, 20, 'REQ-SALES-011', NULL, NULL, 'SH-001', 'Classic Black Sneakers', 5.00, 'pairs', 'Sales', 'Requested', '2026-10-08 00:00:00', NULL, NULL, NULL, NULL, 'REQ-SALES-011', 'Stock-out requested by Team Sales because Team Sales inventory is insufficient. Reference: SO-1020', '2026-11-06 09:22:09'),
(38, 17, 'REQ-SALES-008', NULL, NULL, 'SH-001', 'Classic Black Sneakers', 5.00, 'pairs', 'Sales', 'Rejected', '2026-10-08 00:00:00', '2026-11-07 20:18:36', NULL, NULL, NULL, 'REQ-SALES-008', 'Incoming stock request from Team Sales because Team Sales inventory is insufficient. Reference: QT-2035', '2026-11-06 09:22:09'),
(39, 16, 'REQ-SALES-007', NULL, NULL, 'SH-001', 'Classic Black Sneakers', 5.00, 'pairs', 'Sales', 'Rejected', '2026-10-08 00:00:00', '2026-11-07 20:18:38', NULL, NULL, NULL, 'REQ-SALES-007', 'Incoming stock request from Team Sales because Team Sales inventory is insufficient. Reference: QT-2035', '2026-11-06 09:22:09'),
(40, 15, 'REQ-SALES-006', NULL, NULL, 'SH-001', 'Classic Black Sneakers', 5.00, 'pairs', 'Sales', 'Rejected', '2026-10-08 00:00:00', '2026-11-07 20:18:39', NULL, NULL, NULL, 'REQ-SALES-006', 'Incoming stock request from Team Sales because Team Sales inventory is insufficient. Reference: QT-2035', '2026-11-06 09:22:09'),
(41, 14, 'REQ-SALES-005', NULL, NULL, 'SH-001', 'Classic Black Sneakers', 5.00, 'pairs', 'Sales', 'Rejected', '2026-10-08 00:00:00', '2026-11-07 20:18:42', NULL, NULL, NULL, 'REQ-SALES-005', 'Incoming stock request from Team Sales because Team Sales inventory is insufficient. Reference: QT-2035', '2026-11-06 09:22:09'),
(42, 12, 'REQ-SALES-003', NULL, NULL, 'SH-001', 'Classic Black Sneakers', 6.00, 'pairs', 'Sales', 'Requested', '2026-10-08 00:00:00', NULL, NULL, NULL, NULL, 'REQ-SALES-003', 'Incoming stock request from Team Sales because Team Sales inventory is insufficient. Reference: QT-2034', '2026-11-06 09:22:09'),
(43, 11, 'REQ-SALES-002', NULL, NULL, 'SH-001', 'Classic Black Sneakers', 10.00, 'pairs', 'Sales', 'Requested', '2026-10-08 00:00:00', NULL, NULL, NULL, NULL, 'REQ-SALES-002', 'Incoming stock request from Team Sales because Team Sales inventory is insufficient. Reference: QT-2033', '2026-11-06 09:22:09'),
(44, 7, 'REQ-SALES-001', NULL, NULL, 'SH-001', 'Classic Black Sneakers', 10.00, 'pairs', 'Sales', 'Requested', '2026-10-08 00:00:00', NULL, NULL, NULL, NULL, 'REQ-SALES-001', 'Stock-out requested by Team Sales because Team Sales inventory is insufficient. Reference: QT-2033', '2026-11-06 09:22:09'),
(45, 41, 'REQ-SALES-032', 14, 'SOUT-20261106102324-41-1', 'SH-001', 'Classic Black Sneakers', 1.00, 'pairs', 'Sales', 'Approved', '2026-11-06 17:22:59', '2026-11-06 17:23:24', '2026-11-06 00:00:00', NULL, '2026-11-06 17:23:27', 'Specific finished-goods stock request from Sales Admin', 'Requested for Specific finished-goods stock request from Sales Admin Inventory System approved and stock-out completed; quantity added to Team Sales Inventory.', '2026-11-06 09:22:59'),
(46, 42, 'REQ-SALES-033', 15, 'SOUT-20261107010713-42-1', 'SH-001', 'Classic Black Sneakers', 3.00, 'pairs', 'Sales', 'Approved', '2026-11-07 08:05:47', '2026-11-07 08:07:13', '2026-11-07 00:00:00', NULL, '2026-11-07 08:07:19', 'Specific stock request from Sales Approval', 'Requested for Specific stock request from Sales Approval Inventory System approved and stock-out completed; quantity added to Team Sales Inventory.', '2026-11-07 00:05:47'),
(47, 43, 'REQ-SALES-034', NULL, NULL, 'SH-001', 'Classic Black Sneakers', 3.00, 'pairs', 'Sales', 'Rejected', '2026-11-07 08:07:19', '2026-11-07 20:18:22', NULL, NULL, NULL, 'Specific stock request from Sales Approval', 'Requested for Specific stock request from Sales Approval', '2026-11-07 00:07:19'),
(48, 44, 'REQ-SALES-035', 16, 'SOUT-20261107072125-44-1', 'SH-003', 'Red Runner Shoes', 5.00, 'pairs', 'Sales', 'Approved', '2026-11-07 14:20:34', '2026-11-07 14:21:25', '2026-11-07 00:00:00', NULL, '2026-11-07 14:21:40', 'QT-2018', 'Requested for QT-2018 Inventory System approved and stock-out completed; quantity added to Team Sales Inventory.', '2026-11-07 06:20:34'),
(49, 10, 'REQ-SALES-20261109152839-7ADF0769', NULL, NULL, 'SH-001', 'Classic Black Sneakers', 3.00, 'pairs', 'Sales', 'Approved', '2026-11-09 22:28:39', '2026-11-09 22:29:03', '2026-11-09 22:29:03', NULL, NULL, 'penge', 'Requested for penge', '2026-11-09 14:28:39'),
(50, 11, 'REQ-SALES-20261109154342-87E7717F', NULL, NULL, 'SH-001', 'Classic Black Sneakers', 3.00, 'pairs', 'Sales', 'Approved', '2026-11-09 22:43:42', '2026-11-09 22:43:54', '2026-11-09 22:43:54', NULL, NULL, 'penge', 'Requested for penge', '2026-11-09 14:43:42'),
(51, 12, 'REQ-SALES-20261109154830-80A6C7B7', NULL, NULL, 'SH-001', 'Classic Black Sneakers', 2.00, 'pairs', 'Sales', 'Approved', '2026-11-09 22:48:30', '2026-11-09 22:48:41', '2026-11-09 22:48:41', NULL, NULL, 'penge', 'Requested for penge', '2026-11-09 14:48:30'),
(52, 13, 'REQ-SALES-20261109155219-0380BF69', NULL, NULL, 'SH-001', 'Classic Black Sneakers', 2.00, 'pairs', 'Sales', 'Approved', '2026-11-09 22:52:19', '2026-11-09 22:52:38', '2026-11-09 22:52:38', NULL, NULL, 'penge', 'Requested for penge', '2026-11-09 14:52:19'),
(53, 14, 'REQ-SALES-20261110043658-FA58049C', NULL, NULL, 'SH-001', 'Classic Black Sneakers', 2.00, 'pairs', 'Sales', 'Approved', '2026-11-10 11:36:58', '2026-11-10 11:38:36', '2026-11-10 11:38:36', NULL, NULL, 'Specific finished-goods stock request from Sales Admin', 'Requested for Specific finished-goods stock request from Sales Admin', '2026-11-10 03:36:58'),
(54, 15, 'REQ-SALES-20261110075906-3B38FC03', NULL, NULL, 'SH-003', 'Red Runner Shoes', 1.00, 'pairs', 'Sales', 'Requested', '2026-11-10 14:59:06', NULL, NULL, NULL, NULL, 'QT-2021', 'Requested for QT-2021', '2026-11-10 06:59:06'),
(55, 16, 'REQ-SALES-20261110081908-4A80AC57', NULL, NULL, 'SH-003', 'Red Runner Shoes', 2.00, 'pairs', 'Sales', 'Approved', '2026-11-10 15:19:08', '2026-11-10 15:19:18', '2026-11-10 15:19:18', NULL, NULL, 'QT-2022', 'Requested for QT-2022', '2026-11-10 07:19:08'),
(56, 17, 'REQ-SALES-20261110081923-A556159E', NULL, NULL, 'SH-003', 'Red Runner Shoes', 2.00, 'pairs', 'Sales', 'Requested', '2026-11-10 15:19:23', NULL, NULL, NULL, NULL, 'QT-2022', 'Requested for QT-2022', '2026-11-10 07:19:23'),
(57, 9, 'REQ-DEMO-SALES-20261109', NULL, NULL, 'SH-001', 'Classic Runner', 20.00, 'pairs', 'Sales', 'Inventory Approved', '2026-11-09 00:00:00', NULL, NULL, NULL, NULL, 'REQ-DEMO-SALES-20261109', 'DEMO SAMPLE - safe to remove Demo approval had no Inventory stock-out; 20 units removed from Sales stock.', '2026-11-10 08:08:04'),
(58, 20, 'REQ-2026111009220281', NULL, NULL, 'SH-003', 'Red Runner Shoes', 5.00, 'pairs', 'Sales', 'Approved', '2026-11-10 16:22:02', '2026-11-10 16:22:28', '2026-11-10 16:22:28', NULL, NULL, 'Specific finished-goods stock request from Sales Admin', 'Requested for Specific finished-goods stock request from Sales Admin', '2026-11-10 08:22:02'),
(59, 21, 'REQ-2026111009395473', NULL, NULL, 'SH-002', 'White Court Shoes', 3.00, 'pairs', 'Sales', 'Approved', '2026-11-10 16:39:54', '2026-11-10 16:40:04', '2026-11-10 16:40:04', NULL, NULL, 'Specific finished-goods stock request from Sales Admin', 'Requested for Specific finished-goods stock request from Sales Admin', '2026-11-10 08:39:54'),
(60, 22, 'REQ-2026111113582954', NULL, NULL, 'SH-001', 'Classic Black Sneakers', 5.00, 'pairs', 'Sales', 'Approved', '2026-11-11 20:58:29', '2026-11-11 20:58:55', '2026-11-11 20:58:55', NULL, NULL, 'penge', 'Requested for penge', '2026-11-11 12:58:29'),
(61, 5, 'REQ-2026111213410533', NULL, NULL, 'FG-001-S27', 'Quick Step Classic Low', 3.00, 'pairs', 'Sales', 'Requested', '2026-11-12 20:41:05', NULL, NULL, NULL, NULL, 'penge', 'Requested for penge', '2026-11-12 12:41:05'),
(62, 6, 'REQ-2026111213492418', NULL, NULL, 'FG-001-S27', 'Quick Step Classic Low', 2.00, 'pairs', 'Sales', 'Approved', '2026-11-12 20:49:24', '2026-11-12 20:49:50', '2026-11-12 20:49:50', NULL, NULL, 'penge', 'Requested for penge', '2026-11-12 12:49:24'),
(63, 7, 'SALES-RETURN-RET-10', NULL, NULL, 'FG-001-S27', 'Quick Step Classic Low', 5.00, 'pairs', 'Sales', 'Approved', '2026-11-12 21:58:44', NULL, NULL, NULL, NULL, 'PO-4018', 'Requested for PO-4018', '2026-11-12 13:58:44'),
(64, 8, 'REQ-2026111215032661', NULL, NULL, 'FG-001-S27', 'Quick Step Classic Low', 3.00, 'pairs', 'Sales', 'Approved', '2026-11-12 22:03:26', '2026-11-12 22:03:37', '2026-11-12 22:03:37', NULL, NULL, 'PO-4019', 'Requested for PO-4019', '2026-11-12 14:03:26'),
(65, 9, 'REQ-2026111215342754', NULL, NULL, 'FG-001-S28', 'Quick Step Classic Low', 4.00, 'pairs', 'Sales', 'Requested', '2026-11-12 22:34:27', NULL, NULL, NULL, NULL, 'penge', 'Requested for penge', '2026-11-12 14:34:27'),
(66, 10, 'REQ-2026111215342777', NULL, NULL, 'FG-001-S28', 'Quick Step Classic Low', 4.00, 'pairs', 'Sales', 'Requested', '2026-11-12 22:34:27', NULL, NULL, NULL, NULL, 'penge', 'Requested for penge', '2026-11-12 14:34:27'),
(67, 11, 'REQ-2026111308511910', NULL, NULL, 'FG-001-S27', 'Quick Step Classic Low', 3.00, 'pairs', 'Sales', 'Approved', '2026-11-13 15:51:19', '2026-11-13 15:53:17', '2026-11-13 15:53:17', NULL, NULL, 'PO-4022', 'Requested for PO-4022', '2026-11-13 07:51:19'),
(68, 12, 'REQ-2026111314164029', NULL, NULL, 'FG-001-S27', 'Quick Step Classic Low', 2.00, 'pairs', 'Sales', 'Approved', '2026-11-13 21:16:40', '2026-11-13 21:17:00', '2026-11-13 21:17:00', NULL, NULL, 'Specific finished-goods stock request from Sales Admin', 'Requested for Specific finished-goods stock request from Sales Admin', '2026-11-13 13:16:40'),
(69, 13, 'REQ-2026111314293370', NULL, NULL, 'FG-001-S27', 'Quick Step Classic Low', 2.00, 'pairs', 'Sales', 'Approved', '2026-11-13 21:29:33', '2026-11-13 21:29:43', '2026-11-13 21:29:43', NULL, NULL, 'Specific finished-goods stock request from Sales Admin', 'Requested for Specific finished-goods stock request from Sales Admin', '2026-11-13 13:29:33'),
(70, 14, 'REQ-2026111314313498', NULL, NULL, 'FG-001-S29', 'Quick Step Classic Low', 3.00, 'pairs', 'Sales', 'Approved', '2026-11-13 21:31:34', '2026-11-13 21:31:43', '2026-11-13 21:31:43', NULL, NULL, 'Specific finished-goods stock request from Sales Admin', 'Requested for Specific finished-goods stock request from Sales Admin', '2026-11-13 13:31:34'),
(71, 1, 'REQ-2026111314482252', NULL, NULL, 'FG-001-S27', 'Quick Step Classic Low', 3.00, 'pairs', 'Sales', 'Approved', '2026-11-13 21:48:22', '2026-11-13 21:48:42', '2026-11-13 21:48:42', NULL, NULL, 'Specific finished-goods stock request from Sales Admin', 'Requested for Specific finished-goods stock request from Sales Admin', '2026-11-13 13:48:22'),
(72, 2, 'REQ-2026111315065787', NULL, NULL, 'FG-001-S28', 'Quick Step Classic Low', 2.00, 'pairs', 'Sales', 'Approved', '2026-11-13 22:06:58', '2026-11-13 22:07:10', '2026-11-13 22:07:10', NULL, NULL, 'penge', 'Requested for penge', '2026-11-13 14:06:58'),
(73, 3, 'REQ-2026111315120343', NULL, NULL, 'FG-001-S34', 'Quick Step Classic Low', 3.00, 'pairs', 'Sales', 'Approved', '2026-11-13 22:12:03', '2026-11-13 22:12:25', '2026-11-13 22:12:25', NULL, NULL, 'penge', 'Requested for penge', '2026-11-13 14:12:03'),
(74, 4, 'REQ-2026111315215624', NULL, NULL, 'FG-001-S34', 'Quick Step Classic Low', 10.00, 'pairs', 'Sales', 'Approved', '2026-11-13 22:21:56', '2026-11-13 22:25:49', '2026-11-13 22:25:49', NULL, NULL, 'PO-4023', 'Requested for PO-4023', '2026-11-13 14:21:56'),
(75, 5, 'REQ-2026111316063324', NULL, NULL, 'FG-003-S42', 'Quick Step Court Flex', 10.00, 'pairs', 'Sales', 'Approved', '2026-11-13 23:06:33', '2026-11-13 23:06:42', '2026-11-13 23:06:42', NULL, NULL, 'penge', 'Requested for penge', '2026-11-13 15:06:33'),
(76, 8, 'REQ-2026111407500689', NULL, NULL, 'FG-001-S29', 'Quick Step Classic Low', 5.00, 'pairs', 'Sales', 'Approved', '2026-11-14 14:50:06', '2026-11-14 14:50:20', '2026-11-14 14:50:20', NULL, NULL, 'PO-4026', 'Requested for PO-4026', '2026-11-14 06:50:06'),
(77, 9, 'REQ-2026111407532197', NULL, NULL, 'FG-001-S29', 'Quick Step Classic Low', 5.00, 'pairs', 'Sales', 'Approved', '2026-11-14 14:53:21', '2026-11-14 14:53:51', '2026-11-14 14:53:51', NULL, NULL, 'PO-4027', 'Requested for PO-4027', '2026-11-14 06:53:21'),
(78, 10, 'SALES-RETURN-RET-12', NULL, NULL, 'FG-001-S29', 'Quick Step Classic Low', 5.00, 'pairs', 'Sales', 'Approved', '2026-11-14 00:00:00', NULL, NULL, NULL, NULL, 'SALES-RETURN-RET-12', 'Customer return approved by Sales. broken', '2026-11-14 07:59:15'),
(79, 11, 'REQ-2026111415583154', NULL, NULL, 'FG-001-S28', 'Quick Step Classic Low', 6.00, 'pairs', 'Sales', 'Approved', '2026-11-14 22:58:31', '2026-11-14 22:58:40', '2026-11-14 22:58:40', NULL, NULL, 'PO-4030', 'Requested for PO-4030', '2026-11-14 14:58:31'),
(80, 12, 'REQ-2026111416135689', NULL, NULL, 'FG-001-S28', 'Quick Step Classic Low', 6.00, 'pairs', 'Sales', 'Approved', '2026-11-14 23:13:56', '2026-11-14 23:14:05', '2026-11-14 23:14:05', NULL, NULL, 'PO-4031', 'Requested for PO-4031', '2026-11-14 15:13:56'),
(81, 3, 'REQ-2026111416210079', NULL, NULL, 'FG-001-S28', 'Quick Step Classic Low', 6.00, 'pairs', 'Sales', 'Inventory Approved', '2026-11-14 23:21:00', '2026-11-14 23:21:16', NULL, NULL, NULL, 'PO-4032', 'Requested for PO-4032', '2026-11-14 15:21:00'),
(82, 4, 'REQ-2026111416230153', NULL, NULL, 'FG-001-S28', 'Quick Step Classic Low', 6.00, 'pairs', 'Sales', 'Inventory Approved', '2026-11-14 23:23:01', '2026-11-14 23:23:10', NULL, NULL, NULL, 'PO-4033', 'Requested for PO-4033', '2026-11-14 15:23:01'),
(83, 5, 'REQ-2026111416303264', NULL, NULL, 'FG-001-S28', 'Quick Step Classic Low', 6.00, 'pairs', 'Sales', 'Inventory Approved', '2026-11-14 23:30:32', '2026-11-14 23:30:41', NULL, NULL, NULL, 'PO-4034', 'Requested for PO-4034', '2026-11-14 15:30:32');

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
  `size` varchar(30) DEFAULT NULL,
  `inventory_product_id` varchar(60) DEFAULT NULL,
  `quantity` int(10) UNSIGNED NOT NULL,
  `total_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `order_date` date NOT NULL,
  `status` enum('Open','Converted','Cancelled') NOT NULL DEFAULT 'Open',
  `converted_order_no` varchar(30) DEFAULT NULL,
  `converted_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `purchase_orders`
--

INSERT INTO `purchase_orders` (`po_id`, `po_no`, `quotation_id`, `customer_id`, `product_code`, `size`, `inventory_product_id`, `quantity`, `total_amount`, `order_date`, `status`, `converted_order_no`, `converted_at`, `created_at`) VALUES
(1, 'PO-0001', 2, 2, 'FG-002', NULL, '2', 20, 12000.00, '2026-10-03', 'Converted', 'SO-0001', '2026-10-03 11:00:00', '2026-10-09 04:13:58'),
(2, 'PO-4002', 4, 1, 'SH-001', NULL, NULL, 3, 150000.00, '2026-10-09', 'Converted', 'SO-1002', '2026-10-09 14:01:55', '2026-10-09 06:01:52'),
(3, 'PO-4003', 6, 1, 'SH-002', NULL, NULL, 3, 150018.00, '2026-10-09', 'Converted', 'SO-1003', '2026-10-09 14:51:51', '2026-10-09 06:51:46'),
(4, 'PO-4004', 7, 1, 'SH-003', NULL, NULL, 3, 150000.00, '2026-10-10', 'Converted', 'SO-1004', '2026-10-10 04:25:45', '2026-10-09 20:25:33'),
(5, 'PO-4005', 8, 1, 'SH-003', NULL, NULL, 3, 436668.00, '2026-10-10', 'Converted', 'SO-1010', '2026-11-06 14:09:47', '2026-10-10 05:23:01'),
(6, 'PO-4006', 10, 1, 'SH-001', NULL, '1', 3, 150006.00, '2026-10-11', 'Converted', 'SO-1009', '2026-11-06 14:05:37', '2026-10-10 23:43:49'),
(7, 'PO-4007', 13, 1, 'SH-003', NULL, '3', 3, 10500.00, '2026-11-03', 'Converted', 'SO-1005', '2026-11-03 14:21:23', '2026-11-03 06:20:57'),
(8, 'PO-4008', 14, 1, 'SH-001', NULL, '1', 2, 5000.00, '2026-11-05', 'Converted', 'SO-1006', '2026-11-05 18:15:22', '2026-11-05 10:14:47'),
(9, 'PO-4009', 16, 1, 'SH-003', NULL, '3', 2, 5000.00, '2026-11-06', 'Converted', 'SO-1008', '2026-11-06 11:40:52', '2026-11-06 03:40:35'),
(10, 'PO-4010', 15, 1, 'SH-003', NULL, '3', 2, 5000.00, '2026-11-06', 'Converted', 'SO-1007', '2026-11-06 11:40:49', '2026-11-06 03:40:38'),
(11, 'PO-4011', 17, 1, 'SH-001', NULL, '1', 1, 2500.00, '2026-11-07', 'Converted', 'SO-1011', '2026-11-07 08:04:25', '2026-11-07 00:04:21'),
(12, 'PO-4012', 18, 5, 'SH-003', NULL, '3', 5, 12500.00, '2026-11-07', 'Converted', 'SO-1012', '2026-11-07 14:22:35', '2026-11-07 06:22:28'),
(13, 'PO-4013', 19, 1, 'SH-003', NULL, '3', 1, 2500.00, '2026-11-08', 'Converted', 'SO-1013', '2026-11-08 10:22:58', '2026-11-08 02:22:48'),
(14, 'PO-4014', 20, 1, 'SH-001', NULL, '1', 1, 2500.00, '2026-11-10', 'Converted', 'SO-1014', '2026-11-10 16:47:27', '2026-11-10 08:47:17'),
(15, 'PO-4015', 23, 1, 'SH-003', NULL, NULL, 1, 2554.36, '2026-11-11', 'Converted', 'SO-1015', '2026-11-11 20:48:50', '2026-11-11 12:48:44'),
(16, 'PO-4016', 24, 1, 'SH-001', NULL, NULL, 1, 2554.36, '2026-11-11', 'Converted', 'SO-1016', '2026-11-11 20:58:03', '2026-11-11 12:57:57'),
(17, 'PO-4017', 25, 1, 'FG-001-S27', NULL, NULL, 1, 2354.36, '2026-11-12', 'Open', NULL, NULL, '2026-11-12 13:19:31'),
(18, 'PO-4018', 26, 1, 'FG-001-S27', NULL, NULL, 3, 6954.36, '2026-11-12', 'Open', NULL, NULL, '2026-11-12 13:58:36'),
(19, 'PO-4019', 27, 1, 'FG-001-S27', NULL, NULL, 3, 6954.36, '2026-11-12', 'Open', NULL, NULL, '2026-11-12 14:03:20'),
(20, 'PO-4020', 28, 1, 'FG-001-S27', NULL, NULL, 2, 4654.36, '2026-11-13', 'Converted', 'SO-1017', '2026-11-13 15:10:04', '2026-11-13 07:09:51'),
(21, 'PO-4021', 29, 1, 'FG-001-S27', NULL, NULL, 3, 6954.36, '2026-11-13', 'Converted', 'SO-1018', '2026-11-13 15:16:37', '2026-11-13 07:16:11'),
(22, 'PO-4022', 30, 1, 'FG-001-S27', NULL, NULL, 3, 6954.36, '2026-11-13', 'Converted', 'SO-1019', '2026-11-13 15:53:54', '2026-11-13 07:49:57'),
(23, 'PO-4023', 31, 1, 'FG-001-S34', NULL, NULL, 10, 70054.36, '2026-11-13', 'Open', NULL, NULL, '2026-11-13 14:21:50'),
(24, 'PO-4024', 32, 1, 'FG-001-S27', NULL, NULL, 5, 11554.36, '2026-11-14', 'Converted', 'SO-1020', '2026-11-14 00:06:58', '2026-11-13 16:06:54'),
(25, 'PO-4025', 33, 1, 'FG-001-S29', NULL, NULL, 3, 13854.36, '2026-11-14', 'Converted', 'SO-1021', '2026-11-14 14:47:09', '2026-11-14 06:47:02'),
(26, 'PO-4026', 34, 1, 'FG-001-S29', NULL, NULL, 5, 23054.36, '2026-11-14', 'Converted', 'SO-1022', '2026-11-14 14:52:04', '2026-11-14 06:49:51'),
(27, 'PO-4027', 35, 1, 'FG-001-S29', NULL, NULL, 5, 23054.36, '2026-11-14', 'Open', NULL, NULL, '2026-11-14 06:53:08'),
(28, 'PO-4028', 37, 1, 'FG-001-S28', NULL, NULL, 6, 21054.36, '2026-11-14', 'Open', NULL, NULL, '2026-11-14 13:50:45'),
(29, 'PO-4029', 38, 1, 'FG-001-S28', NULL, NULL, 6, 21054.36, '2026-11-14', 'Open', NULL, NULL, '2026-11-14 14:53:06'),
(30, 'PO-4030', 39, 1, 'FG-001-S28', '28', NULL, 6, 21054.36, '2026-11-14', 'Converted', 'SO-1023', '2026-11-14 22:59:31', '2026-11-14 14:58:26'),
(31, 'PO-4031', 40, 1, 'FG-001-S28', '28', NULL, 6, 21054.36, '2026-11-14', 'Converted', 'SO-1024', '2026-11-14 23:14:44', '2026-11-14 15:13:47'),
(32, 'PO-4032', 41, 1, 'FG-001-S28', '28', NULL, 6, 21054.36, '2026-11-14', 'Open', NULL, NULL, '2026-11-14 15:20:53'),
(33, 'PO-4033', 42, 1, 'FG-001-S28', '28', NULL, 6, 21054.36, '2026-11-14', 'Open', NULL, NULL, '2026-11-14 15:22:56'),
(34, 'PO-4034', 43, 1, 'FG-001-S28', '28', NULL, 6, 21054.36, '2026-11-14', 'Open', NULL, NULL, '2026-11-14 15:30:28');

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
  `status` enum('Unpaid','Partially Paid','Paid','Returned') NOT NULL DEFAULT 'Unpaid',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sales_invoices`
--

INSERT INTO `sales_invoices` (`inv_id`, `invoice_no`, `order_id`, `invoice_date`, `total_amount`, `amount_paid`, `status`, `created_at`) VALUES
(1, 'INV-0001', 1, '2026-10-04', 11400.00, 12000.00, 'Paid', '2026-10-09 04:13:58'),
(2, 'INV-3002', 2, '2026-10-09', 150000.00, 150000.00, 'Paid', '2026-10-09 06:02:41'),
(3, 'INV-3003', 3, '2026-10-09', 150018.00, 150018.00, 'Paid', '2026-10-09 06:52:32'),
(4, 'INV-3004', 4, '2026-10-09', 150000.00, 150000.00, 'Paid', '2026-10-09 20:26:36'),
(5, 'INV-3005', 5, '2026-11-03', 8000.00, 10500.00, 'Paid', '2026-11-03 06:22:54'),
(6, 'INV-3006', 8, '2026-11-06', 5000.00, 5000.00, 'Paid', '2026-11-06 03:41:08'),
(7, 'INV-3007', 11, '2026-11-07', 2500.00, 2500.00, 'Paid', '2026-11-07 00:05:04'),
(8, 'INV-3008', 12, '2026-11-07', 12500.00, 12400.00, 'Partially Paid', '2026-11-07 06:23:23'),
(9, 'INV-3009', 13, '2026-11-08', 2500.00, 2500.00, 'Paid', '2026-11-08 02:23:10'),
(10, 'INV-3010', 14, '2026-11-10', 0.00, 2500.00, 'Returned', '2026-11-10 08:47:33'),
(11, 'INV-3011', 15, '2026-11-11', 0.00, 2554.36, 'Returned', '2026-11-11 12:48:56'),
(12, 'INV-3012', 16, '2026-11-11', 2554.36, 0.00, 'Unpaid', '2026-11-11 12:58:08'),
(13, 'INV-3013', 17, '2026-11-13', 4654.36, 2300.00, 'Partially Paid', '2026-11-13 07:10:20'),
(14, 'INV-3014', 18, '2026-11-13', 4354.36, 320.00, 'Partially Paid', '2026-11-13 07:17:03'),
(15, 'INV-3015', 19, '2026-11-13', 4454.36, 6954.36, 'Paid', '2026-11-13 07:56:13'),
(16, 'INV-3016', 20, '2026-11-14', 0.00, 11554.36, 'Returned', '2026-11-13 16:07:04'),
(17, 'INV-3017', 21, '2026-11-14', 13554.36, 13854.36, 'Paid', '2026-11-14 06:47:15'),
(18, 'INV-3018', 22, '2026-11-14', 20500.00, 23054.36, 'Paid', '2026-11-14 06:52:11'),
(19, 'INV-3019', 23, '2026-11-14', 0.00, 21054.36, 'Returned', '2026-11-14 14:59:39'),
(20, 'INV-3020', 24, '2026-11-14', 0.00, 21054.36, 'Returned', '2026-11-14 15:14:47');

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
  `size` varchar(30) DEFAULT NULL,
  `quantity` int(10) UNSIGNED DEFAULT NULL,
  `total_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `status` enum('Pending','Processing','Invoiced','Completed','Cancelled','Returned') NOT NULL DEFAULT 'Pending',
  `admin_status` enum('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  `payment_method` enum('GCash','Bank Transfer','Cash on Delivery','Debit','Credit','Debit/Credit Card') NOT NULL DEFAULT 'Cash on Delivery',
  `payment_status` enum('Pending','Partially Paid','Paid','Failed') NOT NULL DEFAULT 'Pending',
  `payment_reference` varchar(100) DEFAULT NULL,
  `receipt_no` varchar(30) DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sales_orders`
--

INSERT INTO `sales_orders` (`so_id`, `order_no`, `quotation_id`, `customer_id`, `order_date`, `product_code`, `size`, `quantity`, `total_amount`, `status`, `admin_status`, `payment_method`, `payment_status`, `payment_reference`, `receipt_no`, `paid_at`, `created_at`) VALUES
(1, 'SO-0001', 2, 2, '2026-10-03', 'FG-002', NULL, 20, 12000.00, 'Returned', 'Approved', 'GCash', 'Paid', 'GC-20261003-001', 'RCPT-0001', '2026-10-03 12:00:00', '2026-10-09 04:13:58'),
(2, 'SO-1002', 4, 1, '2026-10-09', 'SH-001', NULL, 3, 150000.00, 'Completed', 'Approved', 'Cash on Delivery', 'Paid', NULL, NULL, '2026-10-09 14:02:57', '2026-10-09 06:01:55'),
(3, 'SO-1003', 6, 1, '2026-10-09', 'SH-002', NULL, 3, 150018.00, 'Completed', 'Approved', 'Cash on Delivery', 'Paid', NULL, NULL, '2026-10-09 14:53:04', '2026-10-09 06:51:51'),
(4, 'SO-1004', 7, 1, '2026-10-09', 'SH-003', NULL, 3, 150000.00, 'Completed', 'Approved', 'Cash on Delivery', 'Paid', NULL, NULL, '2026-10-10 04:27:01', '2026-10-09 20:25:45'),
(5, 'SO-1005', 13, 1, '2026-11-03', 'SH-003', NULL, 3, 10500.00, 'Returned', 'Approved', 'Cash on Delivery', 'Paid', NULL, NULL, '2026-11-03 14:23:25', '2026-11-03 06:21:23'),
(6, 'SO-1006', 14, 1, '2026-11-05', 'SH-001', NULL, 2, 5000.00, 'Pending', 'Approved', '', 'Pending', NULL, NULL, NULL, '2026-11-05 10:15:22'),
(7, 'SO-1007', 15, 1, '2026-11-06', 'SH-003', NULL, 2, 5000.00, 'Cancelled', 'Rejected', '', 'Pending', NULL, NULL, NULL, '2026-11-06 03:40:49'),
(8, 'SO-1008', 16, 1, '2026-11-06', 'SH-003', NULL, 2, 5000.00, 'Invoiced', 'Approved', '', 'Paid', NULL, NULL, NULL, '2026-11-06 03:40:52'),
(9, 'SO-1009', 10, 1, '2026-11-06', 'SH-001', NULL, 3, 150006.00, 'Cancelled', 'Rejected', '', 'Pending', NULL, NULL, NULL, '2026-11-06 06:05:37'),
(10, 'SO-1010', 8, 1, '2026-11-06', 'SH-003', NULL, 3, 436668.00, 'Cancelled', 'Rejected', '', 'Pending', NULL, NULL, NULL, '2026-11-06 06:09:47'),
(11, 'SO-1011', 17, 1, '2026-11-07', 'SH-001', NULL, 1, 2500.00, 'Completed', 'Approved', 'Cash on Delivery', 'Paid', NULL, NULL, '2026-11-07 08:05:12', '2026-11-07 00:04:25'),
(12, 'SO-1012', 18, 5, '2026-11-07', 'SH-003', NULL, 5, 12500.00, 'Invoiced', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-11-07 06:22:35'),
(13, 'SO-1013', 19, 1, '2026-11-08', 'SH-003', NULL, 1, 2500.00, 'Completed', 'Approved', '', 'Paid', NULL, NULL, '2026-11-08 10:23:51', '2026-11-08 02:22:58'),
(14, 'SO-1014', 20, 1, '2026-11-10', 'SH-001', NULL, 1, 2500.00, 'Returned', 'Approved', '', 'Paid', NULL, NULL, NULL, '2026-11-10 08:47:27'),
(15, 'SO-1015', 23, 1, '2026-11-11', 'SH-003', NULL, 1, 2554.36, 'Returned', 'Approved', '', 'Paid', NULL, NULL, '2026-11-11 20:50:02', '2026-11-11 12:48:50'),
(16, 'SO-1016', 24, 1, '2026-11-11', 'SH-001', NULL, 1, 2554.36, 'Invoiced', 'Approved', '', 'Pending', NULL, NULL, NULL, '2026-11-11 12:58:03'),
(17, 'SO-1017', 28, 1, '2026-11-13', 'FG-001-S27', NULL, 2, 4654.36, 'Invoiced', 'Approved', '', '', NULL, NULL, NULL, '2026-11-13 07:10:04'),
(18, 'SO-1018', 29, 1, '2026-11-13', 'FG-001-S27', NULL, 3, 6954.36, 'Returned', 'Approved', 'Debit/Credit Card', 'Partially Paid', 'PG-07C93DDA9E698049', NULL, NULL, '2026-11-13 07:16:37'),
(19, 'SO-1019', 30, 1, '2026-11-13', 'FG-001-S27', NULL, 3, 6954.36, 'Returned', 'Approved', '', 'Paid', NULL, NULL, '2026-11-13 15:59:35', '2026-11-13 07:53:54'),
(20, 'SO-1020', 32, 1, '2026-11-13', 'FG-001-S27', NULL, 5, 11554.36, 'Returned', 'Approved', '', 'Paid', NULL, NULL, NULL, '2026-11-13 16:06:58'),
(21, 'SO-1021', 33, 1, '2026-11-14', 'FG-001-S29', NULL, 3, 13854.36, 'Returned', 'Approved', 'Debit/Credit Card', 'Paid', 'PG-12518C70212D8DF4', NULL, '2026-11-15 01:42:32', '2026-11-14 06:47:09'),
(22, 'SO-1022', 34, 1, '2026-11-14', 'FG-001-S29', NULL, 5, 23054.36, 'Returned', 'Approved', '', 'Paid', NULL, NULL, '2026-11-15 09:15:46', '2026-11-14 06:52:04'),
(23, 'SO-1023', 39, 1, '2026-11-14', 'FG-001-S28', '28', 6, 21054.36, 'Returned', 'Approved', '', 'Paid', NULL, NULL, NULL, '2026-11-14 14:59:31'),
(24, 'SO-1024', 40, 1, '2026-11-14', 'FG-001-S28', '28', 6, 21054.36, 'Returned', 'Approved', '', 'Paid', NULL, NULL, NULL, '2026-11-14 15:14:44');

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
  `size` varchar(30) DEFAULT NULL,
  `fg_id` int(10) DEFAULT NULL,
  `quantity` int(10) UNSIGNED DEFAULT NULL,
  `inventory_quantity` int(10) UNSIGNED DEFAULT NULL,
  `inventory_checked_at` datetime DEFAULT NULL,
  `inventory_status` enum('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  `customer_status` enum('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  `total_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `shipping_fee` decimal(12,2) NOT NULL DEFAULT 0.00,
  `status` enum('Pending','Approved','Rejected','Expired') NOT NULL DEFAULT 'Pending',
  `admin_status` enum('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  `payment_method` enum('GCash','Bank Transfer','Cash on Delivery','Debit','Credit','Debit/Credit Card') NOT NULL DEFAULT 'Cash on Delivery',
  `payment_status` enum('Pending','Partially Paid','Paid','Failed') NOT NULL DEFAULT 'Pending',
  `payment_reference` varchar(100) DEFAULT NULL,
  `receipt_no` varchar(30) DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sales_quotations`
--

INSERT INTO `sales_quotations` (`sq_id`, `quotation_no`, `customer_id`, `source_request_id`, `quotation_date`, `valid_until`, `product_code`, `size`, `fg_id`, `quantity`, `inventory_quantity`, `inventory_checked_at`, `inventory_status`, `customer_status`, `total_amount`, `shipping_fee`, `status`, `admin_status`, `payment_method`, `payment_status`, `payment_reference`, `receipt_no`, `paid_at`, `created_at`) VALUES
(1, 'QT-2000', 1, 1, '2026-10-01', '2026-10-15', 'FG-001', NULL, 1, 10, 50, '2026-10-01 09:00:00', 'Approved', 'Pending', 5000.00, 0.00, 'Rejected', 'Rejected', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-10-09 04:13:58'),
(2, 'QT-2001', 2, 2, '2026-10-02', '2026-10-16', 'FG-002', NULL, 2, 20, 100, '2026-10-02 10:00:00', 'Approved', 'Approved', 12000.00, 0.00, 'Approved', 'Approved', 'GCash', 'Paid', NULL, NULL, NULL, '2026-10-09 04:13:58'),
(3, 'QT-2003', 1, 6, '2026-10-09', '2026-10-22', 'SH-003', NULL, 3, 3, 0, '2026-10-09 14:04:34', 'Pending', 'Pending', 150015.00, 0.00, 'Rejected', 'Rejected', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-10-09 06:00:04'),
(4, 'QT-2004', 1, 7, '2026-10-09', '2026-10-14', 'SH-001', NULL, 1, 3, 15, '2026-10-09 14:01:38', 'Approved', 'Approved', 150000.00, 0.00, 'Approved', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-10-09 06:01:29'),
(5, 'QT-2005', 1, 8, '2026-10-09', '2026-10-22', 'SH-002', NULL, 2, 3, 12, '2026-10-10 13:23:27', 'Approved', 'Pending', 1500000.00, 0.00, 'Expired', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-10-09 06:09:22'),
(6, 'QT-2006', 1, 10, '2026-10-09', '2026-10-22', 'SH-002', NULL, 2, 3, 15, '2026-10-09 14:51:14', 'Approved', 'Approved', 150018.00, 0.00, 'Approved', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-10-09 06:50:00'),
(7, 'QT-2007', 1, 13, '2026-10-09', '2026-10-15', 'SH-003', NULL, 3, 3, 5, '2026-10-10 04:25:00', 'Approved', 'Approved', 150000.00, 0.00, 'Approved', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-10-09 20:23:53'),
(8, 'QT-2008', 1, 14, '2026-10-10', '2026-10-15', 'SH-003', NULL, 3, 3, 5, '2026-10-10 13:23:15', 'Approved', 'Approved', 436668.00, 0.00, 'Approved', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-10-10 05:22:07'),
(9, 'QT-2009', 1, 15, '2026-10-10', '2026-10-14', 'SH-003', NULL, 3, 3, 5, '2026-10-10 13:25:35', 'Approved', 'Pending', 90063.00, 0.00, 'Expired', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-10-10 05:25:16'),
(10, 'QT-2010', 1, 16, '2026-10-11', '2026-10-15', 'SH-001', NULL, 1, 3, 12, '2026-10-11 07:43:25', 'Approved', 'Approved', 150006.00, 0.00, 'Approved', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-10-10 23:42:50'),
(11, 'QT-2011', 4, NULL, '2026-10-26', '2026-10-02', NULL, NULL, NULL, NULL, NULL, NULL, 'Pending', 'Pending', 2000.00, 0.00, 'Rejected', 'Rejected', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-10-26 07:51:45'),
(12, 'QT-2012', 1, 17, '2026-10-29', '2026-11-06', 'SH-001', NULL, 1, 2, 12, '2026-10-29 09:24:29', 'Approved', 'Pending', 4000.00, 0.00, 'Rejected', 'Rejected', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-10-29 01:24:29'),
(13, 'QT-2013', 1, 18, '2026-11-03', '2026-11-18', 'SH-003', NULL, 3, 3, 3, '2026-11-03 14:19:35', 'Approved', 'Approved', 10500.00, 0.00, 'Approved', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-11-03 06:17:51'),
(14, 'QT-2014', 1, 19, '2026-11-05', '2026-11-18', 'SH-001', NULL, 1, 2, 12, '2026-11-05 18:12:34', 'Approved', 'Approved', 5000.00, 0.00, 'Approved', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-11-05 10:09:34'),
(15, 'QT-2015', 1, 20, '2026-11-05', '2026-11-18', 'SH-003', NULL, 3, 2, 2, '2026-11-06 11:40:09', 'Approved', 'Approved', 5000.00, 0.00, 'Approved', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-11-05 10:12:10'),
(16, 'QT-2016', 1, 21, '2026-11-06', '2026-11-19', 'SH-003', NULL, 3, 2, 2, '2026-11-06 11:40:01', 'Approved', 'Approved', 5000.00, 0.00, 'Approved', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-11-06 03:36:18'),
(17, 'QT-2017', 1, 22, '2026-11-07', '2026-11-12', 'SH-001', NULL, 1, 1, 15, '2026-11-07 08:04:10', 'Approved', 'Approved', 2500.00, 0.00, 'Approved', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-11-07 00:03:02'),
(18, 'QT-2018', 5, 24, '2026-11-07', '2026-11-18', 'SH-003', NULL, 3, 5, 7, '2026-11-07 14:21:54', 'Approved', 'Approved', 12500.00, 0.00, 'Approved', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-11-07 06:20:15'),
(19, 'QT-2019', 1, 25, '2026-11-08', '2026-11-30', 'SH-003', NULL, 3, 1, 2, '2026-11-08 10:18:19', 'Approved', 'Approved', 2500.00, 0.00, 'Approved', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-11-08 02:17:52'),
(20, 'QT-2020', 1, 26, '2026-11-10', '2026-11-27', 'SH-001', NULL, 1, 1, 17, '2026-11-10 14:57:30', 'Approved', 'Approved', 2500.00, 0.00, 'Approved', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-11-10 06:57:15'),
(21, 'QT-2021', 1, 27, '2026-11-10', '2026-11-27', 'SH-003', NULL, 3, 2, 1, '2026-11-10 14:59:06', 'Pending', 'Pending', 5000.00, 0.00, 'Rejected', 'Rejected', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-11-10 06:58:58'),
(22, 'QT-2022', 1, 28, '2026-11-10', '2026-11-20', 'SH-003', NULL, 3, 2, 1, '2026-11-10 15:19:23', 'Pending', 'Pending', 5000.00, 0.00, 'Rejected', 'Rejected', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-11-10 07:18:58'),
(23, 'QT-2023', 1, 30, '2026-11-11', '2026-11-24', 'SH-003', NULL, NULL, 1, 8, '2026-11-11 20:47:50', 'Approved', 'Approved', 2554.36, 54.36, 'Approved', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-11-11 12:46:31'),
(24, 'QT-2024', 1, 31, '2026-11-11', '2026-11-19', 'SH-001', NULL, NULL, 1, 28, '2026-11-11 20:57:41', 'Approved', 'Approved', 2554.36, 54.36, 'Approved', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-11-11 12:57:29'),
(25, 'QT-2025', 1, 32, '2026-11-12', '2026-11-19', 'FG-001-S27', NULL, NULL, 1, 2, '2026-11-12 21:19:10', 'Approved', 'Approved', 2354.36, 54.36, 'Approved', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-11-12 13:18:51'),
(26, 'QT-2026', 1, 33, '2026-11-12', '2026-11-13', 'FG-001-S27', NULL, NULL, 3, 2, '2026-11-12 21:58:23', 'Pending', 'Approved', 6954.36, 54.36, 'Approved', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-11-12 13:58:12'),
(27, 'QT-2027', 1, 34, '2026-11-12', '2026-11-19', 'FG-001-S27', NULL, NULL, 3, 2, '2026-11-12 22:03:09', 'Pending', 'Approved', 6954.36, 54.36, 'Approved', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-11-12 14:03:01'),
(28, 'QT-2028', 1, 35, '2026-11-13', '2026-11-26', 'FG-001-S27', NULL, NULL, 2, 5, '2026-11-13 15:08:54', 'Approved', 'Approved', 4654.36, 54.36, 'Approved', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-11-13 07:08:44'),
(29, 'QT-2029', 1, 36, '2026-11-13', '2026-11-19', 'FG-001-S27', NULL, NULL, 3, 3, '2026-11-13 15:15:49', 'Approved', 'Approved', 6954.36, 54.36, 'Approved', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-11-13 07:14:40'),
(30, 'QT-2030', 1, 37, '2026-11-13', '2026-12-01', 'FG-001-S27', NULL, NULL, 3, 0, '2026-11-13 15:48:33', 'Pending', 'Approved', 6954.36, 54.36, 'Approved', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-11-13 07:47:12'),
(31, 'QT-2031', 1, 38, '2026-11-13', '2026-11-18', 'FG-001-S34', NULL, NULL, 10, 3, '2026-11-13 22:21:43', 'Pending', 'Approved', 70054.36, 54.36, 'Approved', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-11-13 14:21:09'),
(32, 'QT-2032', 1, 39, '2026-11-13', '2026-11-21', 'FG-001-S27', NULL, NULL, 5, 7, '2026-11-14 00:06:43', 'Approved', 'Approved', 11554.36, 54.36, 'Approved', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-11-13 16:06:32'),
(33, 'QT-2033', 1, 40, '2026-11-14', '2026-11-26', 'FG-001-S29', NULL, NULL, 3, 3, '2026-11-14 14:46:01', 'Approved', 'Approved', 13854.36, 54.36, 'Approved', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-11-14 06:45:54'),
(34, 'QT-2034', 1, 41, '2026-11-14', '2026-11-20', 'FG-001-S29', NULL, NULL, 5, 0, '2026-11-14 14:49:47', 'Pending', 'Approved', 23054.36, 54.36, 'Approved', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-11-14 06:49:37'),
(35, 'QT-2035', 1, 42, '2026-11-14', '2026-11-19', 'FG-001-S29', NULL, NULL, 5, 0, '2026-11-14 14:53:03', 'Pending', 'Approved', 23054.36, 54.36, 'Approved', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-11-14 06:52:58'),
(36, 'QT-2036', 1, 44, '2026-11-14', '2026-11-13', 'FG-001-S28', NULL, NULL, 6, 2, '2026-11-14 21:49:43', 'Pending', 'Pending', 21054.36, 54.36, 'Expired', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-11-14 13:49:38'),
(37, 'QT-2037', 1, 45, '2026-11-14', '2026-11-30', 'FG-001-S28', NULL, NULL, 6, 2, '2026-11-14 21:50:41', 'Pending', 'Approved', 21054.36, 54.36, 'Approved', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-11-14 13:50:38'),
(38, 'QT-2038', 1, 46, '2026-11-14', '2026-11-30', 'FG-001-S28', NULL, NULL, 6, 2, '2026-11-14 22:52:50', 'Pending', 'Approved', 21054.36, 54.36, 'Approved', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-11-14 14:52:45'),
(39, 'QT-2039', 1, 47, '2026-11-14', '2026-11-30', 'FG-001-S28', '28', NULL, 6, 2, '2026-11-14 22:58:20', 'Pending', 'Approved', 21054.36, 54.36, 'Approved', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-11-14 14:58:17'),
(40, 'QT-2040', 1, 48, '2026-11-14', '2026-11-24', 'FG-001-S28', '28', NULL, 6, 2, '2026-11-14 23:13:42', 'Pending', 'Approved', 21054.36, 54.36, 'Approved', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-11-14 15:13:35'),
(41, 'QT-2041', 1, 49, '2026-11-14', '2026-11-30', 'FG-001-S28', '28', NULL, 6, 2, '2026-11-14 23:20:48', 'Pending', 'Approved', 21054.36, 54.36, 'Approved', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-11-14 15:20:43'),
(42, 'QT-2042', 1, 50, '2026-11-14', '2026-11-25', 'FG-001-S28', '28', NULL, 6, 2, '2026-11-14 23:22:52', 'Pending', 'Approved', 21054.36, 54.36, 'Approved', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-11-14 15:22:43'),
(43, 'QT-2043', 1, 51, '2026-11-14', '2026-11-18', 'FG-001-S28', '28', NULL, 6, 2, '2026-11-14 23:30:22', 'Pending', 'Approved', 21054.36, 54.36, 'Approved', 'Approved', 'Cash on Delivery', 'Pending', NULL, NULL, NULL, '2026-11-14 15:30:19');

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
  `return_quantity` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `total_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `damage_photo` mediumblob DEFAULT NULL,
  `damage_photo_mime` varchar(20) DEFAULT NULL,
  `status` enum('Pending','Approved','Rejected','Completed') NOT NULL DEFAULT 'Pending',
  `admin_status` enum('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  `inventory_sync_status` enum('Not Sent','Pending','Sent','Failed') NOT NULL DEFAULT 'Not Sent',
  `inventory_sync_error` text DEFAULT NULL,
  `inventory_synced_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sales_returns`
--

INSERT INTO `sales_returns` (`ret_id`, `return_no`, `order_id`, `return_date`, `reason`, `return_quantity`, `total_amount`, `damage_photo`, `damage_photo_mime`, `status`, `admin_status`, `inventory_sync_status`, `inventory_sync_error`, `inventory_synced_at`, `created_at`) VALUES
(1, 'RET-0001', 1, '2026-10-05', 'Customer reported damaged packaging.', 1, 600.00, NULL, NULL, 'Approved', 'Approved', 'Not Sent', NULL, NULL, '2026-10-09 04:13:58'),
(2, 'RET-002', 4, '2026-10-27', 'Wews', 1, 0.00, NULL, NULL, 'Rejected', 'Rejected', 'Not Sent', NULL, NULL, '2026-10-27 13:56:07'),
(3, 'RET-4', 5, '2026-11-03', 'broken', 1, 10500.00, NULL, NULL, 'Rejected', 'Rejected', 'Not Sent', NULL, NULL, '2026-11-03 06:59:27'),
(4, 'RET-5', 4, '2026-11-03', 'broken', 1, 400.00, NULL, NULL, 'Rejected', 'Rejected', 'Not Sent', NULL, NULL, '2026-11-03 07:00:41'),
(5, 'RET-6', 14, '2026-11-11', 'sira', 1, 2500.00, NULL, NULL, 'Approved', 'Approved', 'Not Sent', NULL, NULL, '2026-11-10 08:55:59'),
(6, 'RET-7', 19, '2026-11-13', 'napaglumaan na', 1, 2500.00, NULL, NULL, 'Approved', 'Approved', 'Not Sent', NULL, NULL, '2026-11-13 14:50:48'),
(7, 'RET-8', 18, '2026-11-13', 'napaglumaan na', 3, 2600.00, NULL, NULL, 'Approved', 'Approved', 'Sent', NULL, '2026-11-14 00:02:10', '2026-11-13 15:56:54'),
(8, 'RET-9', 5, '2026-11-13', 'napaglumaan na', 3, 2500.00, NULL, NULL, 'Approved', 'Approved', 'Failed', 'The returned product code was not found as an active Inventory finished good: SH-003', NULL, '2026-11-13 16:05:39'),
(9, 'RET-10', 20, '2026-11-13', 'broken', 5, 11554.36, NULL, NULL, 'Approved', 'Approved', 'Sent', NULL, '2026-11-14 00:08:23', '2026-11-13 16:08:18'),
(10, 'RET-11', 15, '2026-11-14', 'broken', 1, 2554.36, NULL, NULL, 'Approved', 'Approved', 'Failed', 'The returned product code was not found as an active Inventory finished good: SH-003', NULL, '2026-11-14 07:56:45'),
(11, 'RET-12', 22, '2026-11-14', 'broken', 5, 2554.36, NULL, NULL, 'Approved', 'Approved', 'Sent', NULL, '2026-11-14 15:59:15', '2026-11-14 07:59:08'),
(12, 'RET-13', 23, '2026-11-14', 'broken', 6, 21054.36, NULL, NULL, 'Approved', 'Approved', 'Failed', 'Method not allowed.', NULL, '2026-11-14 15:00:30'),
(13, 'RET-14', 24, '2026-11-14', 'Wews', 6, 21054.36, NULL, NULL, 'Approved', 'Approved', 'Failed', 'Unable to register this Sales return in Inventory.', NULL, '2026-11-14 15:15:21'),
(14, 'RET-15', 21, '2026-11-15', 'broken', 1, 300.00, NULL, NULL, 'Approved', 'Approved', 'Failed', 'Submit between 1 and 20 returned items.', NULL, '2026-11-15 05:35:02');

-- --------------------------------------------------------

--
-- Table structure for table `sales_settings`
--

CREATE TABLE `sales_settings` (
  `setting_key` varchar(60) NOT NULL,
  `setting_value` decimal(12,2) NOT NULL DEFAULT 0.00,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sales_settings`
--

INSERT INTO `sales_settings` (`setting_key`, `setting_value`, `updated_at`) VALUES
('shipping_fee', 35.00, '2026-11-10 11:18:27'),
('shipping_rate_per_km', 10.00, '2026-11-10 13:43:37');

-- --------------------------------------------------------

--
-- Table structure for table `sales_shipping_distance_cache`
--

CREATE TABLE `sales_shipping_distance_cache` (
  `cache_key` char(64) NOT NULL,
  `distance_meters` int(10) UNSIGNED NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sales_shipping_distance_cache`
--

INSERT INTO `sales_shipping_distance_cache` (`cache_key`, `distance_meters`, `updated_at`) VALUES
('387dd060f4a7a13f49e794fd1b894215b0a7e8e710a8c05bb6d64619ebe02f46', 367617, '2026-11-12 01:06:40'),
('df213d28130a92711039feb3f6ff35ba73193425b98f956bb6f7995461099781', 5436, '2026-11-11 12:42:51');

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
  `account_status` enum('Pending','Approved','Rejected') NOT NULL DEFAULT 'Approved',
  `avatar_path` varchar(255) DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `full_name`, `username`, `password`, `role`, `customer_id`, `status`, `account_status`, `avatar_path`, `last_login`, `created_at`, `updated_at`) VALUES
(1, 'Ryzza Mae', 'salesadmin', '$2y$10$xKsjFtJ3esppT.rjOD4MwuNrnjy9S8TFX2tNaMHLgLD9W0vsL2si2', 'Sales Admin', NULL, 'Active', 'Approved', 'assets/uploads/avatars/user_1_7036706f41d6.jpg', '2026-11-15 13:35:11', '2026-10-09 04:13:58', '2026-11-15 05:35:11'),
(2, 'Heronemo', 'salesstaff', '$2y$10$8h4b4Zpgc5XdQOiqtC1BOeHvcqjFNXdFpZINwfbY2KdkIjd.TdnBG', 'Sales Staff', NULL, 'Inactive', 'Approved', 'assets/uploads/avatars/user_2_2a199686be88.jpg', '2026-11-15 09:15:25', '2026-10-09 04:13:58', '2026-11-15 01:15:25'),
(3, 'HardRold', 'customer', '$2y$10$xKsjFtJ3esppT.rjOD4MwuNrnjy9S8TFX2tNaMHLgLD9W0vsL2si2', 'Customer', 1, 'Active', 'Approved', NULL, '2026-10-29 08:40:35', '2026-10-09 04:13:58', '2026-10-29 01:29:00'),
(4, 'Kevin Calica', 'kevincalica', '$2y$10$Iq27i.cqjMOdHuagBThrTeplrzsLiqmcI3fjcjYBkx8WdbA5OYVOC', 'Customer', 5, 'Active', 'Approved', NULL, NULL, '2026-11-07 06:18:16', '2026-11-07 06:18:16'),
(5, 'Hero Nemo', 'Heronemo', '$2y$10$7kE1PfP32kwH04uxSE82EuKeSSs7V0cbdLqV.U5brFFZWpXTcmrTG', 'Customer', 6, 'Active', 'Approved', 'assets/uploads/avatars/customer_5_54dd8710be42efff.png', NULL, '2026-11-07 12:12:55', '2026-11-07 12:16:59'),
(6, 'John Darwin Ilagan', 'Windel', '$2y$10$3ZTSkGNV.QYsseTZ8rAiN.c9TDazblm0VIiAF8Q/ddmlBSQUdi4Q6', 'Customer', 7, 'Active', 'Approved', NULL, NULL, '2026-11-10 12:58:39', '2026-11-10 12:59:16'),
(7, 'Sales Administrator', 'salesadmin@gmail.com', '$2y$10$H44qoMJvV6zHyR7YQokquuAu/.86d9BnmhM4MRJ9Clyti06lESsCG', 'Sales Admin', NULL, 'Active', 'Approved', NULL, NULL, '2026-11-11 13:40:47', '2026-11-14 06:28:49');

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
-- Dumping data for table `user_notifications`
--

INSERT INTO `user_notifications` (`notification_id`, `user_id`, `event_key`, `title`, `message`, `link`, `created_at`, `read_at`) VALUES
(1, 1, 'quotation-pending:20', 'Quotation awaiting approval', 'Quotation QT-2020 for HardRold (SH-001 × 1) is awaiting review.', 'sales_quotation_approval.php', '2026-11-10 06:57:15', '2026-11-10 16:47:42'),
(2, 1, 'quotation-pending:21', 'Quotation awaiting approval', 'Quotation QT-2021 for HardRold (SH-003 × 2) is awaiting review.', 'sales_quotation_approval.php', '2026-11-10 06:58:58', '2026-11-10 16:47:42'),
(3, 1, 'quotation-pending:22', 'Quotation awaiting approval', 'Quotation QT-2022 for HardRold (SH-003 × 2) is awaiting review.', 'sales_quotation_approval.php', '2026-11-10 07:18:58', '2026-11-10 16:47:42'),
(4, 1, 'inventory-approved:16:SH-003', 'Inventory request approved', 'REQ-SALES-20261110081908-4A80AC57 was approved by Inventory: Red Runner Shoes (2 pairs).', 'inventory_stockout_approval.php', '2026-11-10 07:19:23', '2026-11-10 16:47:42'),
(5, 1, 'inventory-approved:9:SH-001', 'Inventory request approved', 'REQ-DEMO-SALES-20261109 was approved by Inventory: Classic Runner (20 pairs).', 'inventory_stockout_approval.php', '2026-11-10 08:08:04', '2026-11-10 16:47:42'),
(6, 1, 'inventory-approved:20:SH-003', 'Inventory request approved', 'REQ-2026111009220281 was approved by Inventory: Red Runner Shoes (5 pairs).', 'inventory_stockout_approval.php', '2026-11-10 08:22:33', '2026-11-10 16:47:42'),
(7, 1, 'inventory-approved:21:SH-002', 'Inventory request approved', 'REQ-2026111009395473 was approved by Inventory: White Court Shoes (3 pairs).', 'inventory_stockout_approval.php', '2026-11-10 08:40:10', '2026-11-10 16:47:42'),
(8, 1, 'sales-order-pending:14', 'Sales order awaiting approval', 'Sales Order SO-1014 for HardRold (SH-001 × 1) is awaiting review.', 'sales_order_approval.php', '2026-11-10 08:47:27', '2026-11-10 16:47:42'),
(9, 1, 'sales-return-pending:5', 'Sales return awaiting approval', 'HardRold submitted Sales Return RET-6 for order SO-1014.', 'sales_return_approval.php', '2026-11-10 08:55:59', '2026-11-11 20:43:10'),
(10, 1, 'quotation-pending:23', 'Quotation awaiting approval', 'Quotation QT-2023 for HardRold (SH-003 × 1) is awaiting review.', 'sales_quotation_approval.php', '2026-11-11 12:46:31', '2026-11-12 21:42:39'),
(11, 1, 'sales-order-pending:15', 'Sales order awaiting approval', 'Sales Order SO-1015 for HardRold (SH-003 × 1) is awaiting review.', 'sales_order_approval.php', '2026-11-11 12:48:50', '2026-11-12 21:42:39'),
(12, 1, 'quotation-pending:24', 'Quotation awaiting approval', 'Quotation QT-2024 for HardRold (SH-001 × 1) is awaiting review.', 'sales_quotation_approval.php', '2026-11-11 12:57:29', '2026-11-12 21:42:39'),
(13, 1, 'sales-order-pending:16', 'Sales order awaiting approval', 'Sales Order SO-1016 for HardRold (SH-001 × 1) is awaiting review.', 'sales_order_approval.php', '2026-11-11 12:58:03', '2026-11-12 21:42:39'),
(14, 1, 'inventory-approved:22:SH-001', 'Inventory request approved', 'REQ-2026111113582954 was approved by Inventory: Classic Black Sneakers (5 pairs).', 'inventory_stockout_approval.php', '2026-11-11 12:59:01', '2026-11-11 20:59:03'),
(15, 1, 'inventory-approved:6:FG-001-S27', 'Inventory request approved', 'REQ-2026111213492418 was approved by Inventory: Quick Step Classic Low (2 pairs).', 'inventory_stockout_approval.php', '2026-11-12 12:49:59', '2026-11-12 21:42:39'),
(16, 7, 'inventory-approved:6:FG-001-S27', 'Inventory request approved', 'REQ-2026111213492418 was approved by Inventory: Quick Step Classic Low (2 pairs).', 'inventory_stockout_approval.php', '2026-11-12 12:49:59', NULL),
(17, 1, 'quotation-pending:25', 'Quotation awaiting approval', 'Quotation QT-2025 for HardRold (FG-001-S27 × 1) is awaiting review.', 'sales_quotation_approval.php', '2026-11-12 13:18:51', '2026-11-12 21:42:35'),
(18, 7, 'quotation-pending:25', 'Quotation awaiting approval', 'Quotation QT-2025 for HardRold (FG-001-S27 × 1) is awaiting review.', 'sales_quotation_approval.php', '2026-11-12 13:18:51', NULL),
(19, 1, 'quotation-pending:26', 'Quotation awaiting approval', 'Quotation QT-2026 for HardRold (FG-001-S27 × 3) is awaiting review.', 'sales_quotation_approval.php', '2026-11-12 13:58:12', '2026-11-12 22:36:18'),
(20, 7, 'quotation-pending:26', 'Quotation awaiting approval', 'Quotation QT-2026 for HardRold (FG-001-S27 × 3) is awaiting review.', 'sales_quotation_approval.php', '2026-11-12 13:58:12', NULL),
(21, 1, 'quotation-pending:27', 'Quotation awaiting approval', 'Quotation QT-2027 for HardRold (FG-001-S27 × 3) is awaiting review.', 'sales_quotation_approval.php', '2026-11-12 14:03:01', '2026-11-12 22:36:18'),
(22, 7, 'quotation-pending:27', 'Quotation awaiting approval', 'Quotation QT-2027 for HardRold (FG-001-S27 × 3) is awaiting review.', 'sales_quotation_approval.php', '2026-11-12 14:03:01', NULL),
(23, 1, 'inventory-approved:8:FG-001-S27', 'Inventory request approved', 'REQ-2026111215032661 was approved by Inventory: Quick Step Classic Low (3 pairs).', 'inventory_stockout_approval.php', '2026-11-12 14:03:42', '2026-11-12 22:03:43'),
(24, 7, 'inventory-approved:8:FG-001-S27', 'Inventory request approved', 'REQ-2026111215032661 was approved by Inventory: Quick Step Classic Low (3 pairs).', 'inventory_stockout_approval.php', '2026-11-12 14:03:42', NULL),
(25, 1, 'quotation-pending:28', 'Quotation awaiting approval', 'Quotation QT-2028 for HardRold (FG-001-S27 × 2) is awaiting review.', 'sales_quotation_approval.php', '2026-11-13 07:08:44', '2026-11-13 22:07:00'),
(26, 7, 'quotation-pending:28', 'Quotation awaiting approval', 'Quotation QT-2028 for HardRold (FG-001-S27 × 2) is awaiting review.', 'sales_quotation_approval.php', '2026-11-13 07:08:44', NULL),
(27, 1, 'sales-order-pending:17', 'Sales order awaiting approval', 'Sales Order SO-1017 for HardRold (FG-001-S27 × 2) is awaiting review.', 'sales_order_approval.php', '2026-11-13 07:10:04', '2026-11-13 22:07:00'),
(28, 7, 'sales-order-pending:17', 'Sales order awaiting approval', 'Sales Order SO-1017 for HardRold (FG-001-S27 × 2) is awaiting review.', 'sales_order_approval.php', '2026-11-13 07:10:04', NULL),
(29, 1, 'quotation-pending:29', 'Quotation awaiting approval', 'Quotation QT-2029 for HardRold (FG-001-S27 × 3) is awaiting review.', 'sales_quotation_approval.php', '2026-11-13 07:14:41', '2026-11-13 22:07:00'),
(30, 7, 'quotation-pending:29', 'Quotation awaiting approval', 'Quotation QT-2029 for HardRold (FG-001-S27 × 3) is awaiting review.', 'sales_quotation_approval.php', '2026-11-13 07:14:41', NULL),
(31, 1, 'sales-order-pending:18', 'Sales order awaiting approval', 'Sales Order SO-1018 for HardRold (FG-001-S27 × 3) is awaiting review.', 'sales_order_approval.php', '2026-11-13 07:16:37', '2026-11-13 22:07:00'),
(32, 7, 'sales-order-pending:18', 'Sales order awaiting approval', 'Sales Order SO-1018 for HardRold (FG-001-S27 × 3) is awaiting review.', 'sales_order_approval.php', '2026-11-13 07:16:37', NULL),
(33, 1, 'quotation-pending:30', 'Quotation awaiting approval', 'Quotation QT-2030 for HardRold (FG-001-S27 × 3) is awaiting review.', 'sales_quotation_approval.php', '2026-11-13 07:47:12', '2026-11-13 22:07:00'),
(34, 7, 'quotation-pending:30', 'Quotation awaiting approval', 'Quotation QT-2030 for HardRold (FG-001-S27 × 3) is awaiting review.', 'sales_quotation_approval.php', '2026-11-13 07:47:12', NULL),
(35, 1, 'inventory-approved:11:FG-001-S27', 'Inventory request approved', 'REQ-2026111308511910 was approved by Inventory: Quick Step Classic Low (3 pairs).', 'inventory_stockout_approval.php', '2026-11-13 07:53:26', '2026-11-13 22:07:00'),
(36, 7, 'inventory-approved:11:FG-001-S27', 'Inventory request approved', 'REQ-2026111308511910 was approved by Inventory: Quick Step Classic Low (3 pairs).', 'inventory_stockout_approval.php', '2026-11-13 07:53:26', NULL),
(37, 1, 'sales-order-pending:19', 'Sales order awaiting approval', 'Sales Order SO-1019 for HardRold (FG-001-S27 × 3) is awaiting review.', 'sales_order_approval.php', '2026-11-13 07:53:54', '2026-11-13 22:07:00'),
(38, 7, 'sales-order-pending:19', 'Sales order awaiting approval', 'Sales Order SO-1019 for HardRold (FG-001-S27 × 3) is awaiting review.', 'sales_order_approval.php', '2026-11-13 07:53:54', NULL),
(39, 1, 'inventory-approved:12:FG-001-S27', 'Inventory request approved', 'REQ-2026111314164029 was approved by Inventory: Quick Step Classic Low (2 pairs).', 'inventory_stockout_approval.php', '2026-11-13 13:17:04', '2026-11-13 21:17:08'),
(40, 7, 'inventory-approved:12:FG-001-S27', 'Inventory request approved', 'REQ-2026111314164029 was approved by Inventory: Quick Step Classic Low (2 pairs).', 'inventory_stockout_approval.php', '2026-11-13 13:17:04', NULL),
(41, 1, 'inventory-approved:13:FG-001-S27', 'Inventory request approved', 'REQ-2026111314293370 was approved by Inventory: Quick Step Classic Low (2 pairs).', 'inventory_stockout_approval.php', '2026-11-13 13:29:49', '2026-11-13 21:29:52'),
(42, 7, 'inventory-approved:13:FG-001-S27', 'Inventory request approved', 'REQ-2026111314293370 was approved by Inventory: Quick Step Classic Low (2 pairs).', 'inventory_stockout_approval.php', '2026-11-13 13:29:49', NULL),
(43, 1, 'inventory-approved:14:FG-001-S29', 'Inventory request approved', 'REQ-2026111314313498 was approved by Inventory: Quick Step Classic Low (3 pairs).', 'inventory_stockout_approval.php', '2026-11-13 13:31:46', '2026-11-13 22:07:00'),
(44, 7, 'inventory-approved:14:FG-001-S29', 'Inventory request approved', 'REQ-2026111314313498 was approved by Inventory: Quick Step Classic Low (3 pairs).', 'inventory_stockout_approval.php', '2026-11-13 13:31:46', NULL),
(45, 1, 'inventory-approved:1:FG-001-S27', 'Inventory request approved', 'REQ-2026111314482252 was approved by Inventory: Quick Step Classic Low (3 pairs).', 'inventory_stockout_approval.php', '2026-11-13 13:48:47', '2026-11-13 22:07:00'),
(46, 7, 'inventory-approved:1:FG-001-S27', 'Inventory request approved', 'REQ-2026111314482252 was approved by Inventory: Quick Step Classic Low (3 pairs).', 'inventory_stockout_approval.php', '2026-11-13 13:48:47', NULL),
(47, 1, 'inventory-delivery-pending:REQ-2026111314482252', 'Inventory delivery awaiting Sales confirmation', 'Inventory reports REQ-2026111314482252 as Out for Delivery. Review and approve receipt in Sales.', 'inventory_delivery_approval.php', '2026-11-13 14:06:05', '2026-11-13 22:07:00'),
(48, 7, 'inventory-delivery-pending:REQ-2026111314482252', 'Inventory delivery awaiting Sales confirmation', 'Inventory reports REQ-2026111314482252 as Out for Delivery. Review and approve receipt in Sales.', 'inventory_delivery_approval.php', '2026-11-13 14:06:05', NULL),
(49, 1, 'inventory-approved:2:FG-001-S28', 'Inventory request approved', 'REQ-2026111315065787 was approved by Inventory: Quick Step Classic Low (2 pairs).', 'inventory_stockout_approval.php', '2026-11-13 14:07:30', '2026-11-14 14:46:06'),
(50, 7, 'inventory-approved:2:FG-001-S28', 'Inventory request approved', 'REQ-2026111315065787 was approved by Inventory: Quick Step Classic Low (2 pairs).', 'inventory_stockout_approval.php', '2026-11-13 14:07:30', NULL),
(51, 1, 'inventory-delivery-pending:REQ-2026111315065787', 'Inventory delivery awaiting Sales confirmation', 'Inventory reports REQ-2026111315065787 as Out for Delivery. Review and approve receipt in Sales.', 'inventory_delivery_approval.php', '2026-11-13 14:07:45', '2026-11-14 14:46:06'),
(52, 7, 'inventory-delivery-pending:REQ-2026111315065787', 'Inventory delivery awaiting Sales confirmation', 'Inventory reports REQ-2026111315065787 as Out for Delivery. Review and approve receipt in Sales.', 'inventory_delivery_approval.php', '2026-11-13 14:07:45', NULL),
(53, 1, 'inventory-delivery-pending:REQ-2026111315120343', 'Inventory delivery awaiting Sales confirmation', 'Inventory reports REQ-2026111315120343 as Out for Delivery. Review and approve receipt in Sales.', 'inventory_delivery_approval.php', '2026-11-13 14:12:36', '2026-11-14 14:46:06'),
(54, 7, 'inventory-delivery-pending:REQ-2026111315120343', 'Inventory delivery awaiting Sales confirmation', 'Inventory reports REQ-2026111315120343 as Out for Delivery. Review and approve receipt in Sales.', 'inventory_delivery_approval.php', '2026-11-13 14:12:36', NULL),
(55, 1, 'inventory-approved:3:FG-001-S34', 'Inventory request approved', 'REQ-2026111315120343 was approved by Inventory: Quick Step Classic Low (3 pairs).', 'inventory_stockout_approval.php', '2026-11-13 14:12:36', '2026-11-14 14:46:06'),
(56, 7, 'inventory-approved:3:FG-001-S34', 'Inventory request approved', 'REQ-2026111315120343 was approved by Inventory: Quick Step Classic Low (3 pairs).', 'inventory_stockout_approval.php', '2026-11-13 14:12:36', NULL),
(57, 1, 'quotation-pending:31', 'Quotation awaiting approval', 'Quotation QT-2031 for HardRold (FG-001-S34 × 10) is awaiting review.', 'sales_quotation_approval.php', '2026-11-13 14:21:09', '2026-11-14 14:46:06'),
(58, 7, 'quotation-pending:31', 'Quotation awaiting approval', 'Quotation QT-2031 for HardRold (FG-001-S34 × 10) is awaiting review.', 'sales_quotation_approval.php', '2026-11-13 14:21:09', NULL),
(59, 1, 'inventory-approved:4:FG-001-S34', 'Inventory request approved', 'REQ-2026111315215624 was approved by Inventory: Quick Step Classic Low (10 pairs).', 'inventory_stockout_approval.php', '2026-11-13 14:26:00', '2026-11-13 22:34:33'),
(60, 7, 'inventory-approved:4:FG-001-S34', 'Inventory request approved', 'REQ-2026111315215624 was approved by Inventory: Quick Step Classic Low (10 pairs).', 'inventory_stockout_approval.php', '2026-11-13 14:26:00', NULL),
(61, 1, 'inventory-delivery-pending:REQ-2026111315215624', 'Inventory delivery awaiting Sales confirmation', 'Inventory reports REQ-2026111315215624 as Out for Delivery. Review and approve receipt in Sales.', 'inventory_delivery_approval.php', '2026-11-13 14:35:40', '2026-11-14 14:46:06'),
(62, 7, 'inventory-delivery-pending:REQ-2026111315215624', 'Inventory delivery awaiting Sales confirmation', 'Inventory reports REQ-2026111315215624 as Out for Delivery. Review and approve receipt in Sales.', 'inventory_delivery_approval.php', '2026-11-13 14:35:40', NULL),
(63, 1, 'sales-return-pending:6', 'Sales return awaiting approval', 'HardRold submitted Sales Return RET-7 for order SO-1019.', 'sales_return_approval.php', '2026-11-13 14:50:48', '2026-11-14 14:46:06'),
(64, 7, 'sales-return-pending:6', 'Sales return awaiting approval', 'HardRold submitted Sales Return RET-7 for order SO-1019.', 'sales_return_approval.php', '2026-11-13 14:50:48', NULL),
(65, 1, 'inventory-delivery-pending:REQ-2026111316063324', 'Inventory delivery awaiting Sales confirmation', 'Inventory reports REQ-2026111316063324 as Out for Delivery. Review and approve receipt in Sales.', 'inventory_delivery_approval.php', '2026-11-13 15:07:15', '2026-11-14 14:46:06'),
(66, 7, 'inventory-delivery-pending:REQ-2026111316063324', 'Inventory delivery awaiting Sales confirmation', 'Inventory reports REQ-2026111316063324 as Out for Delivery. Review and approve receipt in Sales.', 'inventory_delivery_approval.php', '2026-11-13 15:07:15', NULL),
(67, 1, 'inventory-approved:5:FG-003-S42', 'Inventory request approved', 'REQ-2026111316063324 was approved by Inventory: Quick Step Court Flex (10 pairs).', 'inventory_stockout_approval.php', '2026-11-13 15:07:15', '2026-11-14 14:46:06'),
(68, 7, 'inventory-approved:5:FG-003-S42', 'Inventory request approved', 'REQ-2026111316063324 was approved by Inventory: Quick Step Court Flex (10 pairs).', 'inventory_stockout_approval.php', '2026-11-13 15:07:15', NULL),
(69, 1, 'sales-return-pending:7', 'Sales return awaiting approval', 'HardRold submitted Sales Return RET-8 for order SO-1018.', 'sales_return_approval.php', '2026-11-13 15:56:54', '2026-11-14 14:46:06'),
(70, 7, 'sales-return-pending:7', 'Sales return awaiting approval', 'HardRold submitted Sales Return RET-8 for order SO-1018.', 'sales_return_approval.php', '2026-11-13 15:56:54', NULL),
(71, 1, 'sales-return-pending:8', 'Sales return awaiting approval', 'HardRold submitted Sales Return RET-9 for order SO-1005.', 'sales_return_approval.php', '2026-11-13 16:05:39', '2026-11-14 14:46:06'),
(72, 7, 'sales-return-pending:8', 'Sales return awaiting approval', 'HardRold submitted Sales Return RET-9 for order SO-1005.', 'sales_return_approval.php', '2026-11-13 16:05:39', NULL),
(73, 1, 'quotation-pending:32', 'Quotation awaiting approval', 'Quotation QT-2032 for HardRold (FG-001-S27 × 5) is awaiting review.', 'sales_quotation_approval.php', '2026-11-13 16:06:32', '2026-11-14 14:46:06'),
(74, 7, 'quotation-pending:32', 'Quotation awaiting approval', 'Quotation QT-2032 for HardRold (FG-001-S27 × 5) is awaiting review.', 'sales_quotation_approval.php', '2026-11-13 16:06:32', NULL),
(75, 1, 'sales-order-pending:20', 'Sales order awaiting approval', 'Sales Order SO-1020 for HardRold (FG-001-S27 × 5) is awaiting review.', 'sales_order_approval.php', '2026-11-13 16:06:58', '2026-11-14 14:46:06'),
(76, 7, 'sales-order-pending:20', 'Sales order awaiting approval', 'Sales Order SO-1020 for HardRold (FG-001-S27 × 5) is awaiting review.', 'sales_order_approval.php', '2026-11-13 16:06:58', NULL),
(77, 1, 'sales-return-pending:9', 'Sales return awaiting approval', 'HardRold submitted Sales Return RET-10 for order SO-1020.', 'sales_return_approval.php', '2026-11-13 16:08:18', '2026-11-14 14:46:06'),
(78, 7, 'sales-return-pending:9', 'Sales return awaiting approval', 'HardRold submitted Sales Return RET-10 for order SO-1020.', 'sales_return_approval.php', '2026-11-13 16:08:18', NULL),
(79, 1, 'inventory-approved:7:FG-001-S27', 'Inventory request approved', 'SALES-RETURN-RET-10 was approved by Inventory: Quick Step Classic Low (5 pairs).', 'inventory_stockout_approval.php', '2026-11-13 16:08:23', '2026-11-14 14:46:06'),
(80, 7, 'inventory-approved:7:FG-001-S27', 'Inventory request approved', 'SALES-RETURN-RET-10 was approved by Inventory: Quick Step Classic Low (5 pairs).', 'inventory_stockout_approval.php', '2026-11-13 16:08:23', NULL),
(81, 1, 'quotation-pending:33', 'Quotation awaiting approval', 'Quotation QT-2033 for HardRold (FG-001-S29 × 3) is awaiting review.', 'sales_quotation_approval.php', '2026-11-14 06:45:54', '2026-11-14 14:46:06'),
(82, 7, 'quotation-pending:33', 'Quotation awaiting approval', 'Quotation QT-2033 for HardRold (FG-001-S29 × 3) is awaiting review.', 'sales_quotation_approval.php', '2026-11-14 06:45:54', NULL),
(83, 1, 'sales-order-pending:21', 'Sales order awaiting approval', 'Sales Order SO-1021 for HardRold (FG-001-S29 × 3) is awaiting review.', 'sales_order_approval.php', '2026-11-14 06:47:09', '2026-11-14 18:25:31'),
(84, 7, 'sales-order-pending:21', 'Sales order awaiting approval', 'Sales Order SO-1021 for HardRold (FG-001-S29 × 3) is awaiting review.', 'sales_order_approval.php', '2026-11-14 06:47:09', NULL),
(85, 1, 'quotation-pending:34', 'Quotation awaiting approval', 'Quotation QT-2034 for HardRold (FG-001-S29 × 5) is awaiting review.', 'sales_quotation_approval.php', '2026-11-14 06:49:37', '2026-11-14 18:25:31'),
(86, 7, 'quotation-pending:34', 'Quotation awaiting approval', 'Quotation QT-2034 for HardRold (FG-001-S29 × 5) is awaiting review.', 'sales_quotation_approval.php', '2026-11-14 06:49:37', NULL),
(87, 1, 'inventory-delivery-pending:REQ-2026111407500689', 'Inventory delivery awaiting Sales confirmation', 'Inventory reports REQ-2026111407500689 as Out for Delivery. Review and approve receipt in Sales.', 'inventory_delivery_approval.php', '2026-11-14 06:51:06', '2026-11-14 18:25:31'),
(88, 7, 'inventory-delivery-pending:REQ-2026111407500689', 'Inventory delivery awaiting Sales confirmation', 'Inventory reports REQ-2026111407500689 as Out for Delivery. Review and approve receipt in Sales.', 'inventory_delivery_approval.php', '2026-11-14 06:51:06', NULL),
(89, 1, 'inventory-approved:8:FG-001-S29', 'Inventory request approved', 'REQ-2026111407500689 was approved by Inventory: Quick Step Classic Low (5 pairs).', 'inventory_stockout_approval.php', '2026-11-14 06:51:06', '2026-11-14 18:25:31'),
(90, 7, 'inventory-approved:8:FG-001-S29', 'Inventory request approved', 'REQ-2026111407500689 was approved by Inventory: Quick Step Classic Low (5 pairs).', 'inventory_stockout_approval.php', '2026-11-14 06:51:06', NULL),
(91, 1, 'sales-order-pending:22', 'Sales order awaiting approval', 'Sales Order SO-1022 for HardRold (FG-001-S29 × 5) is awaiting review.', 'sales_order_approval.php', '2026-11-14 06:52:04', '2026-11-14 18:25:31'),
(92, 7, 'sales-order-pending:22', 'Sales order awaiting approval', 'Sales Order SO-1022 for HardRold (FG-001-S29 × 5) is awaiting review.', 'sales_order_approval.php', '2026-11-14 06:52:04', NULL),
(93, 1, 'quotation-pending:35', 'Quotation awaiting approval', 'Quotation QT-2035 for HardRold (FG-001-S29 × 5) is awaiting review.', 'sales_quotation_approval.php', '2026-11-14 06:52:58', '2026-11-14 18:25:31'),
(94, 7, 'quotation-pending:35', 'Quotation awaiting approval', 'Quotation QT-2035 for HardRold (FG-001-S29 × 5) is awaiting review.', 'sales_quotation_approval.php', '2026-11-14 06:52:58', NULL),
(95, 1, 'inventory-approved:9:FG-001-S29', 'Inventory request approved', 'REQ-2026111407532197 was approved by Inventory: Quick Step Classic Low (5 pairs).', 'inventory_stockout_approval.php', '2026-11-14 06:54:23', '2026-11-14 18:25:31'),
(96, 7, 'inventory-approved:9:FG-001-S29', 'Inventory request approved', 'REQ-2026111407532197 was approved by Inventory: Quick Step Classic Low (5 pairs).', 'inventory_stockout_approval.php', '2026-11-14 06:54:23', NULL),
(97, 1, 'inventory-delivery-pending:REQ-2026111407532197', 'Inventory delivery awaiting Sales confirmation', 'Inventory reports REQ-2026111407532197 as Out for Delivery. Review and approve receipt in Sales.', 'inventory_delivery_approval.php', '2026-11-14 06:55:01', '2026-11-14 18:25:31'),
(98, 7, 'inventory-delivery-pending:REQ-2026111407532197', 'Inventory delivery awaiting Sales confirmation', 'Inventory reports REQ-2026111407532197 as Out for Delivery. Review and approve receipt in Sales.', 'inventory_delivery_approval.php', '2026-11-14 06:55:01', NULL),
(99, 1, 'sales-return-pending:10', 'Sales return awaiting approval', 'HardRold submitted Sales Return RET-11 for order SO-1015.', 'sales_return_approval.php', '2026-11-14 07:56:45', '2026-11-14 18:25:31'),
(100, 7, 'sales-return-pending:10', 'Sales return awaiting approval', 'HardRold submitted Sales Return RET-11 for order SO-1015.', 'sales_return_approval.php', '2026-11-14 07:56:45', NULL),
(101, 1, 'sales-return-pending:11', 'Sales return awaiting approval', 'HardRold submitted Sales Return RET-12 for order SO-1022.', 'sales_return_approval.php', '2026-11-14 07:59:08', '2026-11-14 18:25:31'),
(102, 7, 'sales-return-pending:11', 'Sales return awaiting approval', 'HardRold submitted Sales Return RET-12 for order SO-1022.', 'sales_return_approval.php', '2026-11-14 07:59:08', NULL),
(103, 1, 'inventory-approved:10:FG-001-S29', 'Inventory request approved', 'SALES-RETURN-RET-12 was approved by Inventory: Quick Step Classic Low (5 pairs).', 'inventory_stockout_approval.php', '2026-11-14 07:59:15', '2026-11-14 18:25:31'),
(104, 7, 'inventory-approved:10:FG-001-S29', 'Inventory request approved', 'SALES-RETURN-RET-12 was approved by Inventory: Quick Step Classic Low (5 pairs).', 'inventory_stockout_approval.php', '2026-11-14 07:59:15', NULL),
(105, 1, 'quotation-pending:36', 'Quotation awaiting approval', 'Quotation QT-2036 for HardRold (FG-001-S28 × 6) is awaiting review.', 'sales_quotation_approval.php', '2026-11-14 13:49:38', '2026-11-15 02:12:52'),
(106, 7, 'quotation-pending:36', 'Quotation awaiting approval', 'Quotation QT-2036 for HardRold (FG-001-S28 × 6) is awaiting review.', 'sales_quotation_approval.php', '2026-11-14 13:49:38', NULL),
(107, 1, 'quotation-pending:37', 'Quotation awaiting approval', 'Quotation QT-2037 for HardRold (FG-001-S28 × 6) is awaiting review.', 'sales_quotation_approval.php', '2026-11-14 13:50:38', '2026-11-15 02:12:52'),
(108, 7, 'quotation-pending:37', 'Quotation awaiting approval', 'Quotation QT-2037 for HardRold (FG-001-S28 × 6) is awaiting review.', 'sales_quotation_approval.php', '2026-11-14 13:50:38', NULL),
(109, 1, 'quotation-pending:38', 'Quotation awaiting approval', 'Quotation QT-2038 for HardRold (FG-001-S28 × 6) is awaiting review.', 'sales_quotation_approval.php', '2026-11-14 14:52:45', '2026-11-15 02:12:52'),
(110, 7, 'quotation-pending:38', 'Quotation awaiting approval', 'Quotation QT-2038 for HardRold (FG-001-S28 × 6) is awaiting review.', 'sales_quotation_approval.php', '2026-11-14 14:52:45', NULL),
(111, 1, 'quotation-pending:39', 'Quotation awaiting approval', 'Quotation QT-2039 for HardRold (FG-001-S28 × 6) is awaiting review.', 'sales_quotation_approval.php', '2026-11-14 14:58:17', '2026-11-15 02:12:52'),
(112, 7, 'quotation-pending:39', 'Quotation awaiting approval', 'Quotation QT-2039 for HardRold (FG-001-S28 × 6) is awaiting review.', 'sales_quotation_approval.php', '2026-11-14 14:58:17', NULL),
(113, 1, 'inventory-approved:11:FG-001-S28', 'Inventory request approved', 'REQ-2026111415583154 was approved by Inventory: Quick Step Classic Low (6 pairs).', 'inventory_stockout_approval.php', '2026-11-14 14:58:52', '2026-11-15 02:12:52'),
(114, 7, 'inventory-approved:11:FG-001-S28', 'Inventory request approved', 'REQ-2026111415583154 was approved by Inventory: Quick Step Classic Low (6 pairs).', 'inventory_stockout_approval.php', '2026-11-14 14:58:52', NULL),
(115, 1, 'inventory-delivery-pending:REQ-2026111415583154', 'Inventory delivery awaiting Sales confirmation', 'Inventory reports REQ-2026111415583154 as Out for Delivery. Review and approve receipt in Sales.', 'inventory_delivery_approval.php', '2026-11-14 14:58:54', '2026-11-15 02:12:52'),
(116, 7, 'inventory-delivery-pending:REQ-2026111415583154', 'Inventory delivery awaiting Sales confirmation', 'Inventory reports REQ-2026111415583154 as Out for Delivery. Review and approve receipt in Sales.', 'inventory_delivery_approval.php', '2026-11-14 14:58:54', NULL),
(117, 1, 'sales-order-pending:23', 'Sales order awaiting approval', 'Sales Order SO-1023 for HardRold (FG-001-S28 · Size 28 × 6) is awaiting review.', 'sales_order_approval.php', '2026-11-14 14:59:31', '2026-11-15 02:12:52'),
(118, 7, 'sales-order-pending:23', 'Sales order awaiting approval', 'Sales Order SO-1023 for HardRold (FG-001-S28 · Size 28 × 6) is awaiting review.', 'sales_order_approval.php', '2026-11-14 14:59:31', NULL),
(119, 1, 'sales-return-pending:12', 'Sales return awaiting approval', 'HardRold submitted Sales Return RET-13 for order SO-1023.', 'sales_return_approval.php', '2026-11-14 15:00:30', '2026-11-15 02:12:52'),
(120, 7, 'sales-return-pending:12', 'Sales return awaiting approval', 'HardRold submitted Sales Return RET-13 for order SO-1023.', 'sales_return_approval.php', '2026-11-14 15:00:30', NULL),
(121, 1, 'quotation-pending:40', 'Quotation awaiting approval', 'Quotation QT-2040 for HardRold (FG-001-S28 × 6) is awaiting review.', 'sales_quotation_approval.php', '2026-11-14 15:13:35', '2026-11-15 02:12:52'),
(122, 7, 'quotation-pending:40', 'Quotation awaiting approval', 'Quotation QT-2040 for HardRold (FG-001-S28 × 6) is awaiting review.', 'sales_quotation_approval.php', '2026-11-14 15:13:35', NULL),
(123, 1, 'inventory-approved:12:FG-001-S28', 'Inventory request approved', 'REQ-2026111416135689 was approved by Inventory: Quick Step Classic Low (6 pairs).', 'inventory_stockout_approval.php', '2026-11-14 15:14:17', '2026-11-15 02:12:52'),
(124, 7, 'inventory-approved:12:FG-001-S28', 'Inventory request approved', 'REQ-2026111416135689 was approved by Inventory: Quick Step Classic Low (6 pairs).', 'inventory_stockout_approval.php', '2026-11-14 15:14:17', NULL),
(125, 1, 'inventory-delivery-pending:REQ-2026111416135689', 'Inventory delivery awaiting Sales confirmation', 'Inventory reports REQ-2026111416135689 as Out for Delivery. Review and approve receipt in Sales.', 'inventory_delivery_approval.php', '2026-11-14 15:14:27', '2026-11-15 02:12:52'),
(126, 7, 'inventory-delivery-pending:REQ-2026111416135689', 'Inventory delivery awaiting Sales confirmation', 'Inventory reports REQ-2026111416135689 as Out for Delivery. Review and approve receipt in Sales.', 'inventory_delivery_approval.php', '2026-11-14 15:14:27', NULL),
(127, 1, 'sales-order-pending:24', 'Sales order awaiting approval', 'Sales Order SO-1024 for HardRold (FG-001-S28 · Size 28 × 6) is awaiting review.', 'sales_order_approval.php', '2026-11-14 15:14:44', '2026-11-15 02:12:52'),
(128, 7, 'sales-order-pending:24', 'Sales order awaiting approval', 'Sales Order SO-1024 for HardRold (FG-001-S28 · Size 28 × 6) is awaiting review.', 'sales_order_approval.php', '2026-11-14 15:14:44', NULL),
(129, 1, 'sales-return-pending:13', 'Sales return awaiting approval', 'HardRold submitted Sales Return RET-14 for order SO-1024.', 'sales_return_approval.php', '2026-11-14 15:15:21', '2026-11-15 02:12:52'),
(130, 7, 'sales-return-pending:13', 'Sales return awaiting approval', 'HardRold submitted Sales Return RET-14 for order SO-1024.', 'sales_return_approval.php', '2026-11-14 15:15:21', NULL),
(131, 1, 'quotation-pending:41', 'Quotation awaiting approval', 'Quotation QT-2041 for HardRold (FG-001-S28 × 6) is awaiting review.', 'sales_quotation_approval.php', '2026-11-14 15:20:43', '2026-11-15 02:12:52'),
(132, 7, 'quotation-pending:41', 'Quotation awaiting approval', 'Quotation QT-2041 for HardRold (FG-001-S28 × 6) is awaiting review.', 'sales_quotation_approval.php', '2026-11-14 15:20:43', NULL),
(133, 1, 'inventory-approved:3:FG-001-S28', 'Inventory request approved', 'REQ-2026111416210079 was approved by Inventory: Quick Step Classic Low (6 pairs).', 'inventory_stockout_approval.php', '2026-11-14 15:21:26', '2026-11-15 02:12:52'),
(134, 7, 'inventory-approved:3:FG-001-S28', 'Inventory request approved', 'REQ-2026111416210079 was approved by Inventory: Quick Step Classic Low (6 pairs).', 'inventory_stockout_approval.php', '2026-11-14 15:21:26', NULL),
(135, 1, 'quotation-pending:42', 'Quotation awaiting approval', 'Quotation QT-2042 for HardRold (FG-001-S28 × 6) is awaiting review.', 'sales_quotation_approval.php', '2026-11-14 15:22:43', '2026-11-15 02:12:52'),
(136, 7, 'quotation-pending:42', 'Quotation awaiting approval', 'Quotation QT-2042 for HardRold (FG-001-S28 × 6) is awaiting review.', 'sales_quotation_approval.php', '2026-11-14 15:22:43', NULL),
(137, 1, 'inventory-approved:4:FG-001-S28', 'Inventory request approved', 'REQ-2026111416230153 was approved by Inventory: Quick Step Classic Low (6 pairs).', 'inventory_stockout_approval.php', '2026-11-14 15:25:01', '2026-11-15 02:12:52'),
(138, 7, 'inventory-approved:4:FG-001-S28', 'Inventory request approved', 'REQ-2026111416230153 was approved by Inventory: Quick Step Classic Low (6 pairs).', 'inventory_stockout_approval.php', '2026-11-14 15:25:01', NULL),
(139, 1, 'quotation-pending:43', 'Quotation awaiting approval', 'Quotation QT-2043 for HardRold (FG-001-S28 × 6) is awaiting review.', 'sales_quotation_approval.php', '2026-11-14 15:30:19', '2026-11-15 02:12:52'),
(140, 7, 'quotation-pending:43', 'Quotation awaiting approval', 'Quotation QT-2043 for HardRold (FG-001-S28 × 6) is awaiting review.', 'sales_quotation_approval.php', '2026-11-14 15:30:19', NULL),
(141, 1, 'inventory-approved:5:FG-001-S28', 'Inventory request approved', 'REQ-2026111416303264 was approved by Inventory: Quick Step Classic Low (6 pairs).', 'inventory_stockout_approval.php', '2026-11-14 15:44:32', '2026-11-15 02:12:52'),
(142, 7, 'inventory-approved:5:FG-001-S28', 'Inventory request approved', 'REQ-2026111416303264 was approved by Inventory: Quick Step Classic Low (6 pairs).', 'inventory_stockout_approval.php', '2026-11-14 15:44:32', NULL),
(143, 1, 'sales-return-pending:14', 'Sales return awaiting approval', 'HardRold submitted Sales Return RET-15 for order SO-1021.', 'sales_return_approval.php', '2026-11-15 05:35:02', NULL),
(144, 7, 'sales-return-pending:14', 'Sales return awaiting approval', 'HardRold submitted Sales Return RET-15 for order SO-1021.', 'sales_return_approval.php', '2026-11-15 05:35:02', NULL);

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
-- Indexes for table `demo_payment_attempts`
--
ALTER TABLE `demo_payment_attempts`
  ADD PRIMARY KEY (`demo_payment_id`),
  ADD UNIQUE KEY `uq_demo_payment_reference` (`reference_no`),
  ADD KEY `idx_demo_payment_invoice` (`invoice_id`,`demo_payment_id`),
  ADD KEY `idx_demo_payment_status` (`status`,`created_at`),
  ADD KEY `fk_demo_payment_order` (`order_id`),
  ADD KEY `fk_demo_payment_customer` (`customer_id`);

--
-- Indexes for table `gateway_payment_events`
--
ALTER TABLE `gateway_payment_events`
  ADD PRIMARY KEY (`event_id`),
  ADD UNIQUE KEY `uq_gateway_transaction_ref` (`transaction_ref`),
  ADD KEY `idx_gateway_payment_invoice` (`invoice_id`);

--
-- Indexes for table `inventory`
--
ALTER TABLE `inventory`
  ADD PRIMARY KEY (`inventory_id`),
  ADD UNIQUE KEY `uq_team_sales_inventory_product` (`product_code`),
  ADD KEY `idx_team_sales_inventory_status` (`status`);

--
-- Indexes for table `inventory_delivery_approvals`
--
ALTER TABLE `inventory_delivery_approvals`
  ADD PRIMARY KEY (`approval_id`),
  ADD UNIQUE KEY `uq_inventory_delivery_request` (`inventory_request_number`),
  ADD KEY `idx_inventory_delivery_approval_status` (`approval_status`,`created_at`);

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
-- Indexes for table `payment_gateway_transactions`
--
ALTER TABLE `payment_gateway_transactions`
  ADD PRIMARY KEY (`gateway_transaction_id`),
  ADD UNIQUE KEY `uq_payment_gateway_reference` (`reference_no`),
  ADD UNIQUE KEY `uq_payment_gateway_session` (`checkout_session_id`),
  ADD KEY `idx_payment_gateway_invoice_status` (`invoice_id`,`status`),
  ADD KEY `idx_payment_gateway_customer_created` (`customer_id`,`created_at`),
  ADD KEY `fk_payment_gateway_order` (`order_id`);

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
-- Indexes for table `sales_settings`
--
ALTER TABLE `sales_settings`
  ADD PRIMARY KEY (`setting_key`);

--
-- Indexes for table `sales_shipping_distance_cache`
--
ALTER TABLE `sales_shipping_distance_cache`
  ADD PRIMARY KEY (`cache_key`);

--
-- Indexes for table `sales_shipping_rates`
--
ALTER TABLE `sales_shipping_rates`
  ADD PRIMARY KEY (`rate_id`),
  ADD UNIQUE KEY `uq_shipping_destination` (`province`,`city`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `uq_users_customer_id` (`customer_id`);

--
-- Indexes for table `user_notifications`
--
ALTER TABLE `user_notifications`
  ADD PRIMARY KEY (`notification_id`),
  ADD UNIQUE KEY `uq_user_notifications_event` (`user_id`,`event_key`),
  ADD KEY `idx_user_notifications_unread` (`user_id`,`read_at`,`created_at`);

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
  MODIFY `log_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=302;

--
-- AUTO_INCREMENT for table `collections`
--
ALTER TABLE `collections`
  MODIFY `col_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT for table `customers`
--
ALTER TABLE `customers`
  MODIFY `cus_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `customer_balance`
--
ALTER TABLE `customer_balance`
  MODIFY `cb_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `customer_order_requests`
--
ALTER TABLE `customer_order_requests`
  MODIFY `req_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=52;

--
-- AUTO_INCREMENT for table `deliveries`
--
ALTER TABLE `deliveries`
  MODIFY `del_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `demo_payment_attempts`
--
ALTER TABLE `demo_payment_attempts`
  MODIFY `demo_payment_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `inventory`
--
ALTER TABLE `inventory`
  MODIFY `inventory_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- AUTO_INCREMENT for table `inventory_delivery_approvals`
--
ALTER TABLE `inventory_delivery_approvals`
  MODIFY `approval_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `inventory_stockout_approvals`
--
ALTER TABLE `inventory_stockout_approvals`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=84;

--
-- AUTO_INCREMENT for table `payment_gateway_transactions`
--
ALTER TABLE `payment_gateway_transactions`
  MODIFY `gateway_transaction_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  MODIFY `po_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=35;

--
-- AUTO_INCREMENT for table `sales_invoices`
--
ALTER TABLE `sales_invoices`
  MODIFY `inv_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `sales_orders`
--
ALTER TABLE `sales_orders`
  MODIFY `so_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT for table `sales_quotations`
--
ALTER TABLE `sales_quotations`
  MODIFY `sq_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=44;

--
-- AUTO_INCREMENT for table `sales_returns`
--
ALTER TABLE `sales_returns`
  MODIFY `ret_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `sales_shipping_rates`
--
ALTER TABLE `sales_shipping_rates`
  MODIFY `rate_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `user_notifications`
--
ALTER TABLE `user_notifications`
  MODIFY `notification_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=145;

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
-- Constraints for table `demo_payment_attempts`
--
ALTER TABLE `demo_payment_attempts`
  ADD CONSTRAINT `fk_demo_payment_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`cus_id`),
  ADD CONSTRAINT `fk_demo_payment_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `sales_invoices` (`inv_id`),
  ADD CONSTRAINT `fk_demo_payment_order` FOREIGN KEY (`order_id`) REFERENCES `sales_orders` (`so_id`);

--
-- Constraints for table `gateway_payment_events`
--
ALTER TABLE `gateway_payment_events`
  ADD CONSTRAINT `fk_gateway_payment_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `sales_invoices` (`inv_id`);

--
-- Constraints for table `payment_gateway_transactions`
--
ALTER TABLE `payment_gateway_transactions`
  ADD CONSTRAINT `fk_payment_gateway_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`cus_id`),
  ADD CONSTRAINT `fk_payment_gateway_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `sales_invoices` (`inv_id`),
  ADD CONSTRAINT `fk_payment_gateway_order` FOREIGN KEY (`order_id`) REFERENCES `sales_orders` (`so_id`);

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
