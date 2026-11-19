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
-- Database: `finance_hr`
--

-- --------------------------------------------------------

--
-- Table structure for table `accounts`
--

CREATE TABLE `accounts` (
  `account_id` int(11) NOT NULL,
  `employee_id` int(11) NOT NULL,
  `username` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `position` varchar(50) NOT NULL DEFAULT 'staff',
  `status` varchar(20) NOT NULL DEFAULT 'Active',
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `accounts`
--

INSERT INTO `accounts` (`account_id`, `employee_id`, `username`, `password`, `position`, `status`, `created_at`) VALUES
(4, 4, 'admin26@gmail.com', '$2y$10$A7tZ73/kJ2gA/BA0BmIG.ur63bVZePyRMFrE/z/x1.Zw91kn90tRW', 'Admin', 'Active', '2026-11-10 05:19:43'),
(5, 5, 'financeadmin@gmail.com', '$2y$10$A7tZ73/kJ2gA/BA0BmIG.ur63bVZePyRMFrE/z/x1.Zw91kn90tRW', 'Admin', 'Active', '2026-11-10 05:19:43'),
(6, 6, 'salesadmin@gmail.com', '$2y$10$A7tZ73/kJ2gA/BA0BmIG.ur63bVZePyRMFrE/z/x1.Zw91kn90tRW', 'Admin', 'Active', '2026-11-13 12:14:12'),
(11, 11, 'prmanager@gmail.com', '$2y$10$47EuBE9cCRYwI3qH0b.GKerfRfyCJk1mt5IBvmQQVCAPZpz3BWb66', 'Manager', 'Active', '2026-11-13 12:24:33'),
(12, 12, 'prbuyer@gmail.com', '$2y$10$76/LoVzeYDM3LlXfd8LFz.w.lGoSHTgVC/sJ2vVBsxl7VArh2dJ9i', 'Buyer', 'Active', '2026-11-13 12:25:22'),
(15, 15, 'invstaff@gmail.com', '$2y$10$vkjQEhmNo1uCUZ.mijUPxOufoQNZO17QCBJo/ftWgNS1KxWERgFWu', 'Warehouse Manager', 'Active', '2026-11-14 22:01:17'),
(16, 16, 'inventoryadmin@gmail.com', '$2y$10$kIHFLmK1lkc2ibWEYZT3XejxFM4Us2eZeAGxXkxIFc9F9w2D6gweu', 'Inventory Controller', 'Active', '2026-11-14 22:09:58'),
(17, 17, 'suficiencia@inventory.local', '$2y$10$Rd/M3NhOk8Cyt3sBWOVlWurpERu7HuNYSU.pNdbY5m47aeHW/pJYG', 'Warehouse Manager', 'Active', '2026-11-14 23:35:45'),
(18, 18, 'jurado@inventory.local', '$2y$10$XV9bDRfgfEYaV2n7hx1qxO8F0F88PRlO.ugGq/vsCxXwNAv5T700a', 'Inventory Staff / Clerk', 'Active', '2026-11-14 23:35:45'),
(19, 19, 'banisil@inventory.local', '$2y$10$vAtEMaX4w05fEZbzuB7DHOIeLPftG5SaxR1QvnA8U5rbYcidWpUTG', 'Warehouse Staff / Associate', 'Active', '2026-11-14 23:35:45'),
(20, 20, 'paje@inventory.local', '$2y$10$OyELQjLJ4/hGRfqUOv0af.k1mWWg7LNqAG4godB3oEkF73FUCCpoq', 'Inventory Controller / Analyst', 'Active', '2026-11-14 23:35:45'),
(21, 21, 'mendoza@inventory.local', '$2y$10$XV9bDRfgfEYaV2n7hx1qxO8F0F88PRlO.ugGq/vsCxXwNAv5T700a', 'Picker and Packer', 'Active', '2026-11-14 23:35:45'),
(22, 22, 'pompa@inventory.local', '$2y$10$XV9bDRfgfEYaV2n7hx1qxO8F0F88PRlO.ugGq/vsCxXwNAv5T700a', 'Shipping and Receiving Clerk', 'Active', '2026-11-14 23:35:45'),
(25, 25, 'testinventory@gmail.com', '$2y$10$Wr9ePo0yYS1ytKf5KYIuJe45iSDzfv8SaHaaf3gx0s7/FoJ2giuCi', 'Warehouse Manager', 'Active', '2026-11-15 18:31:31'),
(29, 29, 'productionsupervisor@gmail.com', '$2y$10$29Qr45p8sJnFVOxDnpmDiOuJVta0Y7CuKlWGb.OrlORjRyZtGBqMO', 'Supervisor', 'Active', '2026-11-16 23:08:26');

-- --------------------------------------------------------

--
-- Table structure for table `accounts_payable`
--

CREATE TABLE `accounts_payable` (
  `ap_id` int(11) NOT NULL,
  `supplier_id` int(11) NOT NULL,
  `po_id` int(11) DEFAULT NULL,
  `expense_id` int(11) DEFAULT NULL,
  `invoice_no` varchar(50) DEFAULT NULL,
  `po_number` varchar(50) DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `cost_of_goods` decimal(12,2) NOT NULL,
  `due_date` date DEFAULT NULL,
  `status` varchar(20) DEFAULT 'Pending',
  `payment_id` int(11) DEFAULT NULL,
  `quotation_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `accounts_payable`
--

INSERT INTO `accounts_payable` (`ap_id`, `supplier_id`, `po_id`, `expense_id`, `invoice_no`, `po_number`, `amount`, `cost_of_goods`, `due_date`, `status`, `payment_id`, `quotation_id`) VALUES
(105, 15, NULL, NULL, 'INV-2026-0004', 'PO-2026-0008', 2968.00, 2650.00, '2026-12-17', 'Paid', 10, NULL),
(106, 14, NULL, NULL, 'PO-1042', NULL, 25063.00, 25063.00, '2026-12-10', 'Pending', NULL, NULL),
(107, 14, NULL, NULL, 'PO-1043', NULL, 24163.00, 24163.00, '2026-12-15', 'Pending', NULL, NULL),
(108, 14, NULL, NULL, 'PO-1044', NULL, 933.00, 933.00, '2026-12-17', 'Pending', NULL, NULL),
(109, 15, NULL, NULL, 'INV-2026-0006', 'PO-2026-0009', 14000.00, 12500.00, '2026-12-18', 'Paid', NULL, NULL),
(110, 15, NULL, NULL, 'INV-2026-0005', 'PO-2026-0009', 14000.00, 12500.00, '2026-12-18', 'Paid', 5, NULL),
(111, 17, NULL, NULL, 'INV-2026-0007', 'PO-2026-0011', 95.20, 85.00, '2026-12-18', 'Paid', 11, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `accounts_receivable`
--

CREATE TABLE `accounts_receivable` (
  `ar_id` int(11) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `sales_id` int(11) DEFAULT NULL,
  `expense_id` int(11) DEFAULT NULL,
  `invoice_no` varchar(50) DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `due_date` date DEFAULT NULL,
  `status` varchar(20) DEFAULT 'Pending',
  `payment_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `accounts_receivable`
--

INSERT INTO `accounts_receivable` (`ar_id`, `customer_id`, `sales_id`, `expense_id`, `invoice_no`, `amount`, `due_date`, `status`, `payment_id`) VALUES
(101, 1, 1, NULL, 'INV-0001', 12000.00, '2026-11-03', 'Paid', 1),
(102, 2, 2, NULL, 'INV-3002', 150000.00, '2026-11-08', 'Paid', 2),
(103, 2, 3, NULL, 'INV-3003', 150018.00, '2026-11-08', 'Paid', 3),
(104, 2, 4, NULL, 'INV-3004', 150000.00, '2026-11-08', 'Paid', 4);

-- --------------------------------------------------------

--
-- Table structure for table `attendance`
--

CREATE TABLE `attendance` (
  `attendance_id` int(11) NOT NULL,
  `employee_id` int(11) NOT NULL,
  `attendance_date` date NOT NULL,
  `time_in` time DEFAULT NULL,
  `time_out` time DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  `overtime_hours` decimal(5,2) NOT NULL DEFAULT 0.00,
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `attendance`
--

INSERT INTO `attendance` (`attendance_id`, `employee_id`, `attendance_date`, `time_in`, `time_out`, `status`, `overtime_hours`, `notes`) VALUES
(28, 11, '2026-11-13', '08:00:00', '17:00:00', 'Present', 0.00, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `audit_trail`
--

CREATE TABLE `audit_trail` (
  `log_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `action` varchar(50) NOT NULL,
  `module` varchar(50) NOT NULL,
  `record_id` int(11) DEFAULT NULL,
  `old_value` text DEFAULT NULL,
  `new_value` text DEFAULT NULL,
  `timestamp` datetime NOT NULL DEFAULT current_timestamp(),
  `description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `audit_trail`
--

INSERT INTO `audit_trail` (`log_id`, `user_id`, `action`, `module`, `record_id`, `old_value`, `new_value`, `timestamp`, `description`) VALUES
(1, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-10 05:19:43', ''),
(2, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-10 05:19:52', ''),
(3, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-10 05:21:23', ''),
(4, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-10 05:21:42', ''),
(5, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-10 05:21:45', ''),
(6, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-10 05:23:07', ''),
(7, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-10 05:23:13', ''),
(8, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-10 05:26:31', ''),
(9, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-10 05:28:03', ''),
(10, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-10 05:28:14', ''),
(11, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-10 05:32:04', ''),
(12, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-10 05:32:07', ''),
(13, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-10 12:17:48', ''),
(14, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-10 12:27:44', ''),
(15, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-10 12:28:07', ''),
(16, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-10 12:28:11', ''),
(17, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-10 12:56:59', ''),
(18, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-10 12:58:02', ''),
(19, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-10 12:58:51', ''),
(20, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-10 16:33:26', ''),
(21, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-10 16:33:31', ''),
(22, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-10 16:35:28', ''),
(23, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-10 16:35:34', ''),
(24, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-10 16:37:34', ''),
(25, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-10 16:37:48', ''),
(26, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-10 16:45:29', ''),
(27, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-10 17:00:23', ''),
(28, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-10 17:04:39', ''),
(29, 4, 'save', 'store', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-10 17:26:48', 'Updated HR data: 5 employees, 7 payroll rows'),
(30, 4, 'save', 'store', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-10 17:30:25', 'Updated HR data: 5 employees, 7 payroll rows'),
(31, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-10 20:56:59', ''),
(32, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-10 21:04:08', ''),
(33, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-11 15:41:45', ''),
(34, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-11 15:41:46', ''),
(35, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-11 15:41:47', ''),
(36, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-11 15:41:47', ''),
(37, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-11 15:41:48', ''),
(38, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-11 15:41:49', ''),
(39, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-11 15:41:49', ''),
(40, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-11 15:41:50', ''),
(41, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-11 15:47:03', ''),
(42, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-11 15:47:08', ''),
(43, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-11 15:52:44', ''),
(44, 4, 'thirteenth_month_save', 'thirteenth_month_pay', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-11 16:17:16', 'Posted 3 13th month pay record(s)'),
(45, 4, 'thirteenth_month_save', 'thirteenth_month_pay', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-11 16:17:33', 'Posted 3 13th month pay record(s)'),
(46, 4, 'thirteenth_month_save', 'thirteenth_month_pay', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-11 16:20:13', 'Posted 1 13th month pay record(s)'),
(47, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-12 16:55:00', ''),
(48, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-12 16:55:00', ''),
(49, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-12 16:55:50', ''),
(50, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-12 17:00:17', ''),
(51, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-12 17:03:03', ''),
(52, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-12 17:03:12', ''),
(53, 4, 'thirteenth_month_save', 'thirteenth_month_pay', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-12 17:07:21', 'Posted 3 13th month pay record(s)'),
(54, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-12 17:07:51', ''),
(55, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-12 17:54:00', ''),
(56, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 12:10:55', ''),
(57, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 12:14:25', ''),
(58, 4, 'create_account', 'account', 8, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 12:16:40', 'Proc Buyer Test · Procurement Buyer'),
(59, 4, 'create_account', 'account', 9, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 12:19:03', 'Proc Manager Test · Procurement Manager'),
(61, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 12:19:59', ''),
(62, 4, 'create_account', 'account', 10, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 12:21:14', 'Proc Buyer Test 2 · Procurement Buyer'),
(64, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 12:22:48', ''),
(65, 4, 'create_account', 'account', 11, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 12:24:33', 'Procurement Manager · Procurement Manager'),
(66, 4, 'create_account', 'account', 12, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 12:25:22', 'Procurement Buyer · Procurement Buyer'),
(67, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 12:25:25', ''),
(68, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-13 12:25:49', ''),
(70, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 12:30:58', ''),
(71, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-13 12:35:26', ''),
(72, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-13 12:36:40', ''),
(73, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-13 12:36:41', ''),
(74, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-13 13:39:41', ''),
(75, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-13 13:40:34', ''),
(76, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 13:40:48', ''),
(77, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-13 13:48:29', ''),
(78, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-13 13:49:29', ''),
(79, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-13 13:50:24', ''),
(81, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 13:52:49', ''),
(82, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-13 13:53:51', ''),
(83, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-13 14:22:26', ''),
(84, 5, 'approve', 'quotation', 2, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-13 14:27:55', 'Approved quotation request RFQ-0028'),
(85, 5, 'reject', 'quotation', 3, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-13 14:28:33', 'Rejected quotation request RFQ-0023 — Test rejection — budget not available this cycle.'),
(86, 5, 'approve', 'quotation', 11, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-13 14:37:23', 'Approved quotation request RFQ-0028 — created PO-2026-0005'),
(87, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-13 14:43:08', ''),
(88, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-13 14:43:20', ''),
(89, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-13 14:43:43', ''),
(90, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-13 14:44:55', ''),
(91, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-13 14:45:33', ''),
(92, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-13 14:45:33', ''),
(93, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-13 14:46:50', ''),
(94, 4, 'save', 'store', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 14:51:12', 'Updated HR data: 5 employees, 1 attendance rows, 6 payroll rows'),
(95, 4, 'save', 'store', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 14:52:04', 'Updated HR data: 5 employees, 2 attendance rows, 6 payroll rows'),
(96, 5, 'approve', 'quotation', 11, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-13 14:52:58', 'Approved quotation request RFQ-0028'),
(97, 4, 'save', 'store', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 14:53:21', 'Updated HR data: 5 employees, 2 attendance rows, 6 payroll rows'),
(98, 4, 'save', 'store', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 14:53:41', 'Updated HR data: 5 employees, 3 attendance rows, 6 payroll rows'),
(99, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-13 14:54:29', ''),
(100, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 14:54:42', ''),
(101, 4, 'save', 'store', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 15:00:22', 'Updated HR data: 5 employees, 3 attendance rows, 1 leave rows, 6 payroll rows'),
(102, 4, 'save', 'store', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 15:02:12', 'Updated HR data: 5 employees, 3 attendance rows, 1 leave rows, 6 payroll rows'),
(103, 4, 'set_status', 'account', 4, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 15:03:00', 'Inactive'),
(104, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 15:03:07', ''),
(105, 4, 'set_status', 'account', 4, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 15:04:16', 'Active'),
(106, 4, 'save', 'store', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 15:04:55', 'Updated HR data: 6 employees, 1 attendance rows'),
(107, 4, 'save', 'store', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 15:05:18', 'Updated HR data: 6 employees, 1 attendance rows'),
(108, 4, 'save', 'store', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 15:05:26', 'Updated HR data: 6 employees, 1 attendance rows'),
(109, 4, 'save', 'store', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 15:05:33', 'Updated HR data: 6 employees, 1 attendance rows'),
(110, 4, 'save', 'store', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 15:05:42', 'Updated HR data: 6 employees, 1 attendance rows'),
(111, 4, 'save', 'store', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 15:05:48', 'Updated HR data: 6 employees, 1 attendance rows'),
(112, 4, 'save', 'store', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 15:05:56', 'Updated HR data: 6 employees, 1 attendance rows'),
(113, 4, 'set_status', 'account', 4, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 15:07:07', 'Inactive'),
(114, 4, 'set_status', 'account', 4, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 15:07:23', 'Active'),
(115, 4, 'set_status', 'account', 6, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 15:10:18', 'Inactive'),
(116, 4, 'set_status', 'account', 6, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 15:10:45', 'Active'),
(117, 4, 'set_status', 'account', 7, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 15:12:18', 'Inactive'),
(118, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 15:13:21', ''),
(119, 4, 'set_status', 'account', 7, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 15:15:16', 'Active'),
(120, 4, 'set_status', 'account', 6, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 15:15:25', 'Inactive'),
(121, 4, 'set_status', 'account', 6, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 15:15:47', 'Active'),
(122, 4, 'save', 'store', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 15:16:03', 'Updated HR data: 6 employees, 1 attendance rows, 1 payroll rows'),
(123, 4, 'save', 'store', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 15:17:25', 'Updated HR data: 6 employees, 1 attendance rows, 2 payroll rows'),
(124, 4, 'thirteenth_month_save', 'thirteenth_month_pay', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 15:50:51', 'Posted 6 13th month pay record(s)'),
(125, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 16:02:28', ''),
(126, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-13 16:02:46', ''),
(127, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-13 16:02:46', ''),
(128, 4, 'save', 'store', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 16:04:32', 'Updated HR data: 6 employees, 1 attendance rows, 1 leave rows, 2 payroll rows'),
(129, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-13 16:04:49', ''),
(130, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 16:04:59', ''),
(131, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-13 16:05:20', ''),
(132, 4, 'save', 'store', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 16:05:30', 'Updated HR data: 6 employees, 1 attendance rows, 2 leave rows, 2 payroll rows'),
(133, 4, 'save_access', 'account', 6, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 16:07:10', 'Updated page access'),
(134, 4, 'save_access', 'account', 6, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 16:08:11', 'Updated page access'),
(135, 4, 'save_access', 'account', 6, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 16:08:35', 'Updated page access'),
(136, 4, 'save_access', 'account', 6, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 16:09:58', 'Updated page access'),
(137, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 16:13:52', ''),
(138, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-13 16:14:00', ''),
(139, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-13 16:14:00', ''),
(140, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-13 16:28:19', ''),
(141, 5, 'save', 'store', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-13 16:30:47', 'Updated Finance data (transactions: 21)'),
(142, 5, 'save', 'store', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-13 16:32:28', 'Updated Finance data (receivables: 16)'),
(143, 5, 'save', 'store', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-13 16:32:28', 'Updated Finance data (expenses: 12)'),
(144, 5, 'save', 'store', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-13 16:32:59', 'Updated Finance data (payables: 1)'),
(145, 5, 'save', 'store', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-13 16:35:45', 'Updated Finance data (payables: 13)'),
(146, 5, 'save', 'store', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-13 16:36:05', 'Updated Finance data (transactions: 1)'),
(147, 5, 'save', 'store', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-13 16:36:05', 'Updated Finance data (receivables: 4)'),
(148, 5, 'save', 'store', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-13 16:36:05', 'Updated Finance data (expenses: 0)'),
(149, 5, 'save', 'store', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-13 16:36:05', 'Updated Finance data (payables: 0)'),
(150, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-13 16:39:50', ''),
(151, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-13 16:40:17', ''),
(152, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 16:40:25', ''),
(153, 5, 'save', 'store', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-13 16:46:14', 'Updated Finance data (transactions: 21)'),
(154, 5, 'save', 'store', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-13 16:46:15', 'Updated Finance data (receivables: 16)'),
(155, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 16:52:32', ''),
(156, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 16:53:34', ''),
(157, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-13 16:53:35', ''),
(158, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-13 17:14:48', ''),
(159, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-13 20:49:53', ''),
(160, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-13 20:58:32', ''),
(161, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-13 23:46:37', ''),
(162, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-13 23:46:46', ''),
(163, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-13 23:54:14', ''),
(164, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-13 23:55:17', ''),
(165, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-14 00:16:20', ''),
(166, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-14 00:21:32', ''),
(167, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-14 00:21:44', ''),
(168, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-14 00:21:51', ''),
(169, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-14 00:25:09', ''),
(170, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-14 00:26:18', ''),
(171, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-14 00:26:51', ''),
(172, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-14 00:27:58', ''),
(173, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-14 00:28:49', ''),
(174, 5, 'approve', 'quotation', 5, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-14 00:29:08', 'Approved quotation request RFQ-0029'),
(175, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-14 00:29:23', ''),
(176, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-14 00:30:07', ''),
(177, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-14 00:31:22', ''),
(178, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-14 00:32:00', ''),
(179, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-14 15:15:48', ''),
(180, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-14 15:24:59', ''),
(181, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-14 15:26:12', ''),
(182, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-14 22:01:27', ''),
(183, 15, 'login', 'auth', NULL, NULL, 'invstaff@gmail.com|Inventory Warehouse Manager', '2026-11-14 22:03:31', ''),
(184, 15, 'login', 'auth', NULL, NULL, 'invstaff@gmail.com|Inventory Warehouse Manager', '2026-11-14 22:07:33', ''),
(185, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-14 22:07:43', ''),
(186, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-14 22:07:50', ''),
(187, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-14 22:07:54', ''),
(188, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-14 22:08:52', ''),
(189, 4, 'create_account', 'account', 16, NULL, 'admin26@gmail.com|HR Admin', '2026-11-14 22:09:58', 'Inventory Admin · Inventory Admin'),
(190, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-14 22:10:12', ''),
(191, 16, 'login', 'auth', NULL, NULL, 'inventoryadmin@gmail.com|Inventory Admin', '2026-11-14 22:10:20', ''),
(192, 16, 'login', 'auth', NULL, NULL, 'inventoryadmin@gmail.com|Inventory Admin', '2026-11-14 22:13:43', ''),
(193, 15, 'login', 'auth', NULL, NULL, 'invstaff@gmail.com|Inventory Warehouse Manager', '2026-11-14 22:18:54', ''),
(194, 16, 'login', 'auth', NULL, NULL, 'inventoryadmin@gmail.com|Inventory Admin', '2026-11-14 22:23:49', ''),
(195, 15, 'login', 'auth', NULL, NULL, 'invstaff@gmail.com|Inventory Warehouse Manager', '2026-11-14 22:27:53', ''),
(196, 16, 'login', 'auth', NULL, NULL, 'inventoryadmin@gmail.com|Inventory Admin', '2026-11-14 22:36:44', ''),
(197, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-14 23:22:23', ''),
(198, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-14 23:30:04', ''),
(199, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-14 23:31:47', ''),
(200, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-14 23:32:13', ''),
(201, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-14 23:33:21', ''),
(202, 17, 'login', 'auth', NULL, NULL, 'suficiencia@inventory.local|Inventory Warehouse Manager', '2026-11-14 23:35:54', ''),
(203, 17, 'logout', 'auth', NULL, NULL, 'suficiencia@inventory.local|Inventory Warehouse Manager', '2026-11-14 23:36:10', ''),
(204, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-14 23:38:07', ''),
(205, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-14 23:38:31', ''),
(206, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-14 23:38:31', ''),
(207, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-14 23:38:32', ''),
(208, 4, 'reset_password', 'account', 20, NULL, 'admin26@gmail.com|HR Admin', '2026-11-14 23:38:53', ''),
(209, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-14 23:39:04', ''),
(210, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-14 23:39:29', ''),
(211, 4, 'reset_password', 'account', 19, NULL, 'admin26@gmail.com|HR Admin', '2026-11-14 23:39:46', ''),
(212, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-14 23:39:53', ''),
(213, 19, 'login', 'auth', NULL, NULL, 'banisil@inventory.local|Inventory Warehouse Staff / Associate', '2026-11-14 23:40:04', ''),
(214, 19, 'login', 'auth', NULL, NULL, 'banisil@inventory.local|Inventory Warehouse Staff / Associate', '2026-11-14 23:40:05', ''),
(215, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-14 23:41:36', ''),
(216, 4, 'reset_password', 'account', 17, NULL, 'admin26@gmail.com|HR Admin', '2026-11-14 23:41:43', ''),
(217, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-14 23:42:53', ''),
(218, 16, 'login', 'auth', NULL, NULL, 'inventoryadmin@gmail.com|Inventory Inventory Controller', '2026-11-14 23:43:01', ''),
(219, 16, 'login', 'auth', NULL, NULL, 'inventoryadmin@gmail.com|Inventory Inventory Controller', '2026-11-14 23:43:02', ''),
(220, 19, 'login', 'auth', NULL, NULL, 'banisil@inventory.local|Inventory Warehouse Staff / Associate', '2026-11-14 23:43:17', ''),
(221, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-15 00:01:47', ''),
(222, 4, 'reset_password', 'account', 17, NULL, 'admin26@gmail.com|HR Admin', '2026-11-15 00:02:05', ''),
(223, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-15 00:03:45', ''),
(224, 17, 'login', 'auth', NULL, NULL, 'suficiencia@inventory.local|Inventory Warehouse Manager', '2026-11-15 00:03:54', ''),
(225, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-15 00:05:07', ''),
(226, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-15 00:18:43', ''),
(227, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-15 00:49:26', ''),
(228, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-15 00:50:30', ''),
(232, 6, 'login', 'auth', NULL, NULL, 'salesadmin@gmail.com|Sales Admin', '2026-11-15 00:53:32', ''),
(237, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-15 01:03:07', ''),
(238, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-15 01:08:18', ''),
(239, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-15 01:33:17', ''),
(240, 15, 'login', 'auth', NULL, NULL, 'invstaff@gmail.com|Inventory Warehouse Manager', '2026-11-15 04:14:33', ''),
(241, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-15 04:15:23', ''),
(242, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-15 04:15:29', ''),
(243, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-15 04:16:14', ''),
(244, 17, 'login', 'auth', NULL, NULL, 'suficiencia@inventory.local|Inventory Warehouse Manager', '2026-11-15 04:16:29', ''),
(245, 17, 'login', 'auth', NULL, NULL, 'suficiencia@inventory.local|Inventory Warehouse Manager', '2026-11-15 04:16:40', ''),
(246, 17, 'login', 'auth', NULL, NULL, 'suficiencia@inventory.local|Inventory Warehouse Manager', '2026-11-15 04:17:57', ''),
(247, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-15 18:23:51', ''),
(248, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-15 18:23:51', ''),
(249, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-15 18:23:51', ''),
(250, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-15 18:23:51', ''),
(251, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-15 18:26:45', ''),
(252, 4, 'create_account', 'account', 24, NULL, 'admin26@gmail.com|HR Admin', '2026-11-15 18:26:45', 'API Verify Test · Inventory Inventory Staff'),
(253, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-15 18:30:54', ''),
(254, 4, 'create_account', 'account', 25, NULL, 'admin26@gmail.com|HR Admin', '2026-11-15 18:31:31', 'test · Inventory Warehouse Manager'),
(255, 4, 'reset_password', 'account', 16, NULL, 'admin26@gmail.com|HR Admin', '2026-11-15 19:01:52', ''),
(256, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-15 19:01:58', ''),
(257, 16, 'login', 'auth', NULL, NULL, 'inventoryadmin@gmail.com|Inventory Inventory Controller', '2026-11-15 19:02:06', ''),
(258, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-15 19:02:18', ''),
(259, 4, 'reset_password', 'account', 17, NULL, 'admin26@gmail.com|HR Admin', '2026-11-15 19:02:41', ''),
(260, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-15 19:02:50', ''),
(261, 17, 'login', 'auth', NULL, NULL, 'suficiencia@inventory.local|Inventory Warehouse Manager', '2026-11-15 19:02:56', ''),
(262, 17, 'login', 'auth', NULL, NULL, 'suficiencia@inventory.local|Inventory Warehouse Manager', '2026-11-15 19:06:14', ''),
(263, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-15 19:08:22', ''),
(264, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-15 19:09:03', ''),
(265, 17, 'login', 'auth', NULL, NULL, 'suficiencia@inventory.local|Inventory Warehouse Manager', '2026-11-15 19:10:30', ''),
(267, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-15 19:53:34', ''),
(268, 4, 'reset_password', 'account', 16, NULL, 'admin26@gmail.com|HR Admin', '2026-11-15 19:53:46', ''),
(269, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-15 19:53:58', ''),
(270, 16, 'login', 'auth', NULL, NULL, 'inventoryadmin@gmail.com|Inventory Inventory Controller', '2026-11-15 19:54:07', ''),
(271, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-15 19:56:39', ''),
(272, 15, 'login', 'auth', NULL, NULL, 'invstaff@gmail.com|Inventory Warehouse Manager', '2026-11-15 19:58:11', ''),
(273, 21, 'login', 'auth', NULL, NULL, 'mendoza@inventory.local|Inventory Picker and Packer', '2026-11-15 19:58:56', ''),
(274, 15, 'login', 'auth', NULL, NULL, 'invstaff@gmail.com|Inventory Warehouse Manager', '2026-11-15 20:00:03', ''),
(275, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-15 20:00:37', ''),
(276, 16, 'login', 'auth', NULL, NULL, 'inventoryadmin@gmail.com|Inventory Inventory Controller', '2026-11-15 20:00:41', ''),
(277, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-15 20:13:23', ''),
(278, 4, 'create_account', 'account', 26, NULL, 'admin26@gmail.com|HR Admin', '2026-11-15 20:13:23', 'Bridge Test Prod · Production Staff'),
(281, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-15 20:15:06', ''),
(284, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-15 20:20:48', ''),
(285, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-15 20:20:48', ''),
(286, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-15 20:20:53', ''),
(287, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-15 20:20:59', ''),
(288, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-15 20:23:52', ''),
(289, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-15 20:26:16', ''),
(290, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-15 20:29:38', ''),
(292, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-15 20:30:45', ''),
(293, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-15 20:37:47', ''),
(295, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-15 20:40:32', ''),
(296, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-15 20:41:30', ''),
(297, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-15 20:41:45', ''),
(298, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-15 20:43:01', ''),
(299, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-15 20:43:10', ''),
(300, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-15 20:55:06', ''),
(301, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-15 20:55:22', ''),
(302, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-15 20:55:38', ''),
(303, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-15 20:57:55', ''),
(304, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-15 20:58:01', ''),
(305, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-15 20:58:38', ''),
(306, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-15 21:03:22', ''),
(307, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-15 21:03:23', ''),
(308, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-15 21:03:53', ''),
(309, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-15 21:04:08', ''),
(310, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-15 21:04:25', ''),
(311, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-15 21:04:26', ''),
(312, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-15 21:04:33', ''),
(313, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-15 21:09:01', ''),
(314, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-15 21:09:02', ''),
(315, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-15 21:09:43', ''),
(316, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-15 21:09:52', ''),
(317, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-15 21:12:41', ''),
(318, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-15 21:15:52', ''),
(319, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-15 21:15:53', ''),
(320, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-15 21:17:00', ''),
(321, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-15 21:17:21', ''),
(322, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-15 21:19:31', ''),
(323, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-15 21:19:54', ''),
(324, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-15 21:20:49', ''),
(325, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-15 21:23:45', ''),
(326, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-15 21:24:14', ''),
(327, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-15 21:26:48', ''),
(328, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-15 21:27:04', ''),
(329, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-15 21:27:21', ''),
(330, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-15 21:27:53', ''),
(331, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-15 21:27:53', ''),
(332, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-15 21:32:29', ''),
(333, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-15 21:34:22', ''),
(334, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-15 21:36:54', ''),
(335, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-15 21:37:18', ''),
(336, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-15 21:39:12', ''),
(337, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-15 21:43:47', ''),
(338, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-15 21:45:01', ''),
(339, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-15 21:58:54', ''),
(340, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-15 21:58:55', ''),
(341, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-15 21:59:58', ''),
(342, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-15 21:59:59', ''),
(343, 5, 'approve', 'quotation', 6, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-15 22:00:07', 'Approved quotation request RFQ-0030'),
(344, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-15 22:15:03', ''),
(345, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-15 22:32:55', ''),
(346, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-15 22:41:27', ''),
(347, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-15 22:41:53', ''),
(348, 6, 'login', 'auth', NULL, NULL, 'salesadmin@gmail.com|Sales Admin', '2026-11-15 22:41:59', ''),
(349, 6, 'login', 'auth', NULL, NULL, 'salesadmin@gmail.com|Sales Admin', '2026-11-15 22:42:56', ''),
(350, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-15 22:46:06', ''),
(351, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-15 22:47:46', ''),
(352, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-15 22:49:43', ''),
(353, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-15 23:01:31', ''),
(354, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-15 23:18:00', ''),
(355, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-15 23:22:20', ''),
(356, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-15 23:22:20', ''),
(357, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-15 23:37:49', ''),
(358, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-15 23:38:00', ''),
(359, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-15 23:38:28', ''),
(360, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-15 23:41:05', ''),
(361, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-15 23:47:43', ''),
(362, 5, 'approve', 'quotation', 10, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-15 23:47:52', 'Approved quotation request RFQ-0023'),
(363, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-16 00:13:32', ''),
(364, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-16 00:13:40', ''),
(365, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-16 00:14:53', ''),
(366, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-16 00:15:03', ''),
(367, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-16 20:51:35', ''),
(368, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-16 20:58:43', ''),
(369, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-16 21:06:21', ''),
(370, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-16 21:12:32', ''),
(371, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-16 21:22:14', ''),
(372, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-16 21:22:36', ''),
(373, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-16 21:22:47', ''),
(374, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-16 21:23:25', ''),
(375, 4, 'create_account', 'account', 28, NULL, 'admin26@gmail.com|HR Admin', '2026-11-16 21:23:26', 'Defaults Test · Production Staff'),
(376, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-16 21:47:13', ''),
(377, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-16 21:47:20', ''),
(378, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-16 21:49:37', ''),
(379, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-16 21:49:50', ''),
(380, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-16 21:51:31', ''),
(381, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-16 21:51:37', ''),
(382, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-16 21:52:04', ''),
(383, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-16 21:52:08', ''),
(384, 4, 'reset_password', 'account', 25, NULL, 'admin26@gmail.com|HR Admin', '2026-11-16 21:52:35', ''),
(385, 4, 'save', 'store', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-16 21:53:27', 'Updated HR data: 14 employees, 1 attendance rows, 2 leave rows, 2 payroll rows'),
(386, 4, 'save', 'store', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-16 21:53:37', 'Updated HR data: 14 employees, 1 attendance rows, 2 leave rows, 2 payroll rows'),
(387, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-16 21:57:49', ''),
(388, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-16 21:57:55', ''),
(389, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-16 22:02:01', ''),
(390, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-16 22:05:23', ''),
(391, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-16 22:05:35', ''),
(392, 4, 'thirteenth_month_save', 'thirteenth_month_pay', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-16 22:09:24', 'Posted 14 13th month pay record(s)'),
(393, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-16 22:22:29', ''),
(394, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-16 22:22:35', ''),
(395, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-16 22:35:14', ''),
(396, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-16 22:35:22', ''),
(397, 4, 'create_account', 'account', 29, NULL, 'admin26@gmail.com|HR Admin', '2026-11-16 23:08:26', 'Production Supervisor · Production Supervisor'),
(398, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-16 23:08:47', ''),
(399, 29, 'login', 'auth', NULL, NULL, 'productionsupervisor@gmail.com|Production Supervisor', '2026-11-16 23:08:55', ''),
(400, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-16 23:51:53', ''),
(401, 15, 'login', 'auth', NULL, NULL, 'invstaff@gmail.com|Inventory Warehouse Manager', '2026-11-16 23:52:42', ''),
(402, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-16 23:54:12', ''),
(403, 4, 'reset_password', 'account', 17, NULL, 'admin26@gmail.com|HR Admin', '2026-11-16 23:54:23', ''),
(404, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-16 23:54:41', ''),
(405, 17, 'login', 'auth', NULL, NULL, 'suficiencia@inventory.local|Inventory Warehouse Manager', '2026-11-16 23:54:46', ''),
(406, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-17 00:20:58', ''),
(407, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-17 00:22:11', ''),
(408, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 00:22:18', ''),
(409, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 00:23:08', ''),
(410, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 00:23:14', ''),
(411, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 00:24:12', ''),
(412, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 00:24:46', ''),
(413, 15, 'login', 'auth', NULL, NULL, 'invstaff@gmail.com|Inventory Warehouse Manager', '2026-11-17 00:27:54', ''),
(414, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-17 00:29:07', ''),
(415, 17, 'login', 'auth', NULL, NULL, 'suficiencia@inventory.local|Inventory Warehouse Manager', '2026-11-17 00:29:41', ''),
(416, 17, 'login', 'auth', NULL, NULL, 'suficiencia@inventory.local|Inventory Warehouse Manager', '2026-11-17 00:30:51', ''),
(417, 17, 'login', 'auth', NULL, NULL, 'suficiencia@inventory.local|Inventory Warehouse Manager', '2026-11-17 00:41:32', ''),
(418, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-17 00:43:42', ''),
(419, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-17 00:44:17', ''),
(420, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-17 00:44:46', ''),
(421, 17, 'login', 'auth', NULL, NULL, 'suficiencia@inventory.local|Inventory Warehouse Manager', '2026-11-17 00:49:43', ''),
(422, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-17 00:50:35', ''),
(423, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-17 00:50:58', ''),
(424, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-17 00:51:24', ''),
(425, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 00:52:11', ''),
(426, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 00:53:58', ''),
(427, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 00:54:11', ''),
(428, 5, 'approve', 'quotation', 7, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 00:55:13', 'Approved quotation request RFQ-0044'),
(429, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 00:55:19', ''),
(430, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-17 00:55:37', ''),
(431, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-17 00:56:28', ''),
(432, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-17 00:56:51', ''),
(433, 17, 'login', 'auth', NULL, NULL, 'suficiencia@inventory.local|Inventory Warehouse Manager', '2026-11-17 00:57:27', ''),
(434, 17, 'login', 'auth', NULL, NULL, 'suficiencia@inventory.local|Inventory Warehouse Manager', '2026-11-17 00:57:58', ''),
(435, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-17 00:58:25', ''),
(436, 17, 'login', 'auth', NULL, NULL, 'suficiencia@inventory.local|Inventory Warehouse Manager', '2026-11-17 01:00:08', ''),
(437, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-17 01:02:21', ''),
(438, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-17 01:10:02', ''),
(439, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-17 01:10:07', ''),
(440, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-17 01:29:14', ''),
(441, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 01:30:26', ''),
(442, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 01:30:56', ''),
(443, 6, 'login', 'auth', NULL, NULL, 'salesadmin@gmail.com|Sales Admin', '2026-11-17 01:33:53', ''),
(444, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-17 02:39:46', ''),
(445, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-17 02:40:02', ''),
(446, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-17 02:40:46', ''),
(447, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-17 02:41:57', ''),
(448, 4, 'reset_password', 'account', 17, NULL, 'admin26@gmail.com|HR Admin', '2026-11-17 02:42:07', ''),
(449, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-17 02:42:16', ''),
(450, 17, 'login', 'auth', NULL, NULL, 'suficiencia@inventory.local|Inventory Warehouse Manager', '2026-11-17 02:42:26', ''),
(451, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-17 02:43:33', ''),
(452, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-17 02:43:52', ''),
(453, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-17 02:44:16', ''),
(454, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 02:45:14', ''),
(455, 5, 'approve', 'quotation', 8, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 02:45:19', 'Approved quotation request RFQ-0045'),
(456, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 02:45:26', ''),
(457, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-17 02:45:31', ''),
(458, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-17 02:46:29', ''),
(459, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-17 02:46:51', ''),
(460, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 02:54:28', ''),
(461, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 02:56:07', ''),
(462, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 02:56:18', ''),
(463, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 02:57:05', ''),
(464, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 02:58:23', ''),
(465, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-17 02:58:38', ''),
(466, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-17 03:01:57', ''),
(467, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 03:03:34', ''),
(468, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 03:08:32', ''),
(469, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 03:09:11', ''),
(470, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 03:09:22', ''),
(471, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-17 03:09:33', ''),
(472, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 03:09:34', ''),
(473, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 03:11:26', '');
INSERT INTO `audit_trail` (`log_id`, `user_id`, `action`, `module`, `record_id`, `old_value`, `new_value`, `timestamp`, `description`) VALUES
(474, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-17 03:11:31', ''),
(475, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 03:12:16', ''),
(476, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 03:13:58', ''),
(477, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 03:32:01', ''),
(478, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-17 03:35:52', ''),
(479, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-17 03:36:07', ''),
(480, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 03:38:32', ''),
(481, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-17 03:38:54', ''),
(482, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-17 03:39:16', ''),
(483, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-17 03:39:27', ''),
(484, 4, 'reset_password', 'account', 17, NULL, 'admin26@gmail.com|HR Admin', '2026-11-17 03:39:38', ''),
(485, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-17 03:39:52', ''),
(486, 17, 'login', 'auth', NULL, NULL, 'suficiencia@inventory.local|Inventory Warehouse Manager', '2026-11-17 03:40:02', ''),
(487, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 03:41:17', ''),
(488, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 03:41:21', ''),
(489, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 03:41:31', ''),
(490, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-17 03:41:34', ''),
(491, 4, 'reset_password', 'account', 17, NULL, 'admin26@gmail.com|HR Admin', '2026-11-17 03:41:48', ''),
(492, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-17 03:41:58', ''),
(493, 17, 'login', 'auth', NULL, NULL, 'suficiencia@inventory.local|Inventory Warehouse Manager', '2026-11-17 03:42:04', ''),
(494, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-17 03:42:50', ''),
(495, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-17 03:43:07', ''),
(496, 5, 'approve', 'quotation', 9, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 03:43:50', 'Approved quotation request RFQ-0046'),
(497, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-17 03:44:31', ''),
(498, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-17 03:44:45', ''),
(499, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 03:54:10', ''),
(500, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 03:54:30', ''),
(501, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 03:56:16', ''),
(502, 5, 'save', 'store', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 03:56:17', 'Updated Finance data (expenses: 0, transactions: 4, receivables: 4, payables: 4, cashBank: 1)'),
(503, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 03:57:42', ''),
(504, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 03:57:48', ''),
(505, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 03:58:18', ''),
(506, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 04:03:12', ''),
(507, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-17 04:03:22', ''),
(508, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-17 04:05:57', ''),
(509, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-17 04:08:36', ''),
(510, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-17 13:08:51', ''),
(511, 6, 'login', 'auth', NULL, NULL, 'salesadmin@gmail.com|Sales Admin', '2026-11-17 13:34:37', ''),
(512, 6, 'login', 'auth', NULL, NULL, 'salesadmin@gmail.com|Sales Admin', '2026-11-17 13:34:49', ''),
(513, 6, 'login', 'auth', NULL, NULL, 'salesadmin@gmail.com|Sales Admin', '2026-11-17 13:39:00', ''),
(514, 6, 'login', 'auth', NULL, NULL, 'salesadmin@gmail.com|Sales Admin', '2026-11-17 13:40:34', ''),
(515, 6, 'login', 'auth', NULL, NULL, 'salesadmin@gmail.com|Sales Admin', '2026-11-17 13:40:51', ''),
(516, 6, 'login', 'auth', NULL, NULL, 'salesadmin@gmail.com|Sales Admin', '2026-11-17 13:41:02', ''),
(517, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-17 13:44:47', ''),
(518, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 13:44:58', ''),
(519, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 13:56:56', ''),
(520, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 13:57:32', ''),
(521, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 14:47:03', ''),
(522, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 15:02:12', ''),
(523, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-17 15:02:50', ''),
(524, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-17 15:02:52', ''),
(525, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-17 15:04:01', ''),
(526, 4, 'reset_password', 'account', 17, NULL, 'admin26@gmail.com|HR Admin', '2026-11-17 15:04:14', ''),
(527, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-17 15:04:24', ''),
(528, 17, 'login', 'auth', NULL, NULL, 'suficiencia@inventory.local|Inventory Warehouse Manager', '2026-11-17 15:04:32', ''),
(529, 17, 'login', 'auth', NULL, NULL, 'suficiencia@inventory.local|Inventory Warehouse Manager', '2026-11-17 15:08:06', ''),
(530, 17, 'login', 'auth', NULL, NULL, 'suficiencia@inventory.local|Inventory Warehouse Manager', '2026-11-17 15:11:44', ''),
(531, 17, 'login', 'auth', NULL, NULL, 'suficiencia@inventory.local|Inventory Warehouse Manager', '2026-11-17 15:17:43', ''),
(532, 17, 'login', 'auth', NULL, NULL, 'suficiencia@inventory.local|Inventory Warehouse Manager', '2026-11-17 15:21:24', ''),
(533, 17, 'login', 'auth', NULL, NULL, 'suficiencia@inventory.local|Inventory Warehouse Manager', '2026-11-17 15:32:04', ''),
(534, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-17 15:36:25', ''),
(535, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-17 15:37:23', ''),
(536, 6, 'login', 'auth', NULL, NULL, 'salesadmin@gmail.com|Sales Admin', '2026-11-17 17:18:49', ''),
(537, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 17:19:03', ''),
(538, 6, 'login', 'auth', NULL, NULL, 'salesadmin@gmail.com|Sales Admin', '2026-11-17 17:22:22', ''),
(539, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 18:30:03', ''),
(540, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 18:31:01', ''),
(541, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 18:33:51', ''),
(542, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 18:39:52', ''),
(543, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-17 18:40:25', ''),
(544, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-17 18:42:43', ''),
(545, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 18:43:14', ''),
(546, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 20:43:53', ''),
(547, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 20:58:17', ''),
(548, 6, 'login', 'auth', NULL, NULL, 'salesadmin@gmail.com|Sales Admin', '2026-11-17 20:58:27', ''),
(549, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 21:22:38', ''),
(550, 5, 'payroll_pay', 'payroll', 53, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 21:22:44', 'PR-053'),
(551, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 21:29:14', ''),
(552, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-17 21:29:21', ''),
(553, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-17 21:29:35', ''),
(554, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 21:29:40', ''),
(555, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 21:36:24', ''),
(556, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-17 21:36:34', ''),
(557, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-17 21:36:43', ''),
(558, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 21:36:52', ''),
(559, 5, 'payroll_pay', 'payroll', 52, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 22:49:16', 'PR-052'),
(560, 5, 'save', 'store', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 22:53:23', 'Updated Finance data (payables: 1)'),
(561, 5, 'save', 'store', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 22:54:25', 'Updated Finance data (payables: 1)'),
(562, 5, 'save', 'store', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 22:54:37', 'Updated Finance data (payables: 1)'),
(563, 5, 'save', 'store', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 22:54:46', 'Updated Finance data (payables: 1)'),
(564, 5, 'save', 'store', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 22:54:56', 'Updated Finance data (payables: 1)'),
(565, 5, 'save', 'store', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-17 22:56:00', 'Updated Finance data (payables: 1)'),
(566, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 01:05:21', ''),
(567, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 01:05:21', ''),
(568, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 01:05:21', ''),
(569, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 01:05:21', ''),
(570, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 01:05:21', ''),
(571, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 01:05:21', ''),
(572, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 01:05:21', ''),
(573, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 01:05:21', ''),
(574, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 01:05:21', ''),
(575, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 01:05:22', ''),
(576, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 01:05:22', ''),
(577, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 01:40:57', ''),
(578, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 01:41:06', ''),
(579, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 01:43:20', ''),
(580, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 01:43:48', ''),
(581, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-18 01:47:38', ''),
(582, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 01:48:58', ''),
(583, 17, 'login', 'auth', NULL, NULL, 'suficiencia@inventory.local|Inventory Warehouse Manager', '2026-11-18 01:49:32', ''),
(584, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-18 01:49:47', ''),
(585, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-18 01:50:56', ''),
(586, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-18 01:51:17', ''),
(587, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 01:51:44', ''),
(588, 5, 'approve', 'quotation', 21, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 01:51:48', 'Approved quotation request RFQ-0046'),
(589, 5, 'approve', 'quotation', 9, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 01:52:29', 'Approved quotation request RFQ-0046'),
(590, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-18 01:52:59', ''),
(591, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-18 01:53:19', ''),
(592, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 01:54:01', ''),
(593, 17, 'login', 'auth', NULL, NULL, 'suficiencia@inventory.local|Inventory Warehouse Manager', '2026-11-18 01:54:08', ''),
(594, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 01:54:44', ''),
(595, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 01:55:40', ''),
(596, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 01:55:47', ''),
(597, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 02:03:14', ''),
(598, 5, 'save', 'store', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 02:09:57', 'Updated Finance data (transactions: 7, receivables: 4, payables: 5, cashBank: 1)'),
(599, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 02:10:36', ''),
(600, 17, 'login', 'auth', NULL, NULL, 'suficiencia@inventory.local|Inventory Warehouse Manager', '2026-11-18 02:10:50', ''),
(601, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-18 02:13:54', ''),
(602, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-18 02:14:19', ''),
(603, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 02:14:40', ''),
(604, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-18 02:35:10', ''),
(605, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-18 02:39:01', ''),
(606, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-18 02:41:14', ''),
(607, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 02:41:17', ''),
(608, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 02:41:45', ''),
(609, 17, 'login', 'auth', NULL, NULL, 'suficiencia@inventory.local|Inventory Warehouse Manager', '2026-11-18 02:41:50', ''),
(610, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-18 02:42:40', ''),
(611, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-18 02:42:58', ''),
(612, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 02:43:38', ''),
(613, 5, 'approve', 'quotation', 12, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 02:43:42', 'Approved quotation request RFQ-0050'),
(614, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 02:43:55', ''),
(615, 17, 'login', 'auth', NULL, NULL, 'suficiencia@inventory.local|Inventory Warehouse Manager', '2026-11-18 02:44:02', ''),
(616, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-18 02:45:45', ''),
(617, 17, 'login', 'auth', NULL, NULL, 'suficiencia@inventory.local|Inventory Warehouse Manager', '2026-11-18 03:12:25', ''),
(618, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-18 03:14:06', ''),
(619, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-18 03:14:58', ''),
(620, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-18 03:15:24', ''),
(621, 17, 'login', 'auth', NULL, NULL, 'suficiencia@inventory.local|Inventory Warehouse Manager', '2026-11-18 03:15:56', ''),
(622, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 03:16:20', ''),
(623, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 03:18:31', ''),
(624, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 03:22:36', ''),
(625, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 03:22:42', ''),
(626, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 03:28:54', ''),
(627, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 03:29:53', ''),
(628, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 03:30:36', ''),
(629, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 03:31:38', ''),
(630, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-18 03:31:44', ''),
(631, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 03:32:17', ''),
(632, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 03:36:31', ''),
(633, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 03:40:27', ''),
(634, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 03:40:43', ''),
(635, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 03:41:20', ''),
(636, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 03:45:43', ''),
(637, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 03:47:35', ''),
(638, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 03:49:04', ''),
(639, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 03:49:32', ''),
(640, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 04:31:36', ''),
(641, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 04:31:54', ''),
(642, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-18 04:32:02', ''),
(643, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 04:35:02', ''),
(644, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 04:36:31', ''),
(645, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-18 04:36:52', ''),
(646, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-18 04:37:27', ''),
(647, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-18 04:37:30', ''),
(648, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 04:37:35', ''),
(649, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 08:58:10', ''),
(650, 5, 'save', 'store', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 09:03:09', 'Updated Finance data (transactions: 7, receivables: 4, payables: 5, cashBank: 1)'),
(651, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 09:49:46', ''),
(652, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-18 09:49:53', ''),
(653, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-18 10:04:12', ''),
(654, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 10:04:21', ''),
(655, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 10:04:25', ''),
(656, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-18 10:04:38', ''),
(657, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-18 10:05:44', ''),
(658, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 10:05:50', ''),
(659, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 10:11:33', ''),
(660, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-18 10:11:38', ''),
(661, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-18 15:35:13', ''),
(662, 17, 'login', 'auth', NULL, NULL, 'suficiencia@inventory.local|Inventory Warehouse Manager', '2026-11-18 15:36:16', ''),
(663, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-18 15:36:58', ''),
(664, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 15:42:49', ''),
(665, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 15:47:20', ''),
(666, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-18 15:47:29', ''),
(667, 4, 'save', 'store', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-18 15:47:56', 'Updated HR data: 15 employees, 1 attendance rows, 2 leave rows, 3 payroll rows'),
(668, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-18 15:48:04', ''),
(669, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 15:48:11', ''),
(670, 5, 'save', 'store', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 16:03:18', 'Updated Finance data (expenses: 1, transactions: 7, receivables: 4, payables: 5, cashBank: 1)'),
(671, 5, 'approve', 'expense', 25, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 16:03:25', 'Approved expense #25 (Office supplies) — ₱1,000.00'),
(672, 5, 'save', 'store', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 16:03:25', 'Updated Finance data (expenses: 1, transactions: 7, receivables: 4, payables: 5, cashBank: 1)'),
(673, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-18 20:31:24', ''),
(674, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-18 20:38:30', ''),
(675, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-18 20:41:30', ''),
(676, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-18 20:41:36', ''),
(677, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-18 21:15:44', ''),
(678, 4, 'reset_password', 'account', 17, NULL, 'admin26@gmail.com|HR Admin', '2026-11-18 21:15:56', ''),
(679, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-18 21:16:14', ''),
(680, 17, 'login', 'auth', NULL, NULL, 'suficiencia@inventory.local|Inventory Warehouse Manager', '2026-11-18 21:16:20', ''),
(681, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-18 21:16:53', ''),
(682, 17, 'login', 'auth', NULL, NULL, 'suficiencia@inventory.local|Inventory Warehouse Manager', '2026-11-18 21:22:34', ''),
(683, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-18 21:22:55', ''),
(684, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-18 21:22:55', ''),
(685, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 21:46:39', ''),
(686, 5, 'receive', 'procurement_invoice', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 21:46:48', 'Received Procurement invoice INV-2026-0006 from SoleTech Rubber Manufacturing (₱12,500.00, PO PO-2026-0009, due 2026-12-18)'),
(687, 5, 'post', 'procurement_invoice', 90, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 21:46:56', 'Posted Procurement invoice INV-2026-0006 from SoleTech Rubber Manufacturing to Accounts Payable AP-90 (₱14,000.00 incl. VAT 12%, PO PO-2026-0009) — recorded as Paid'),
(688, 4, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-18 21:47:22', ''),
(689, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-18 21:47:24', ''),
(690, 4, 'reset_password', 'account', 17, NULL, 'admin26@gmail.com|HR Admin', '2026-11-18 21:47:40', ''),
(691, 4, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-11-18 21:47:50', ''),
(692, 17, 'login', 'auth', NULL, NULL, 'suficiencia@inventory.local|Inventory Warehouse Manager', '2026-11-18 21:48:01', ''),
(693, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 21:49:13', ''),
(694, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 21:49:26', ''),
(695, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-18 21:49:39', ''),
(696, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-18 21:50:06', ''),
(697, 5, 'approve', 'quotation', 12, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 21:51:32', 'Approved quotation request RFQ-0052'),
(698, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-18 21:52:13', ''),
(699, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-18 21:52:35', ''),
(700, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-18 21:52:56', ''),
(701, 5, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 22:02:22', ''),
(702, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-18 22:02:28', ''),
(703, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 22:02:59', ''),
(704, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 22:14:52', ''),
(705, 5, 'receive', 'procurement_invoice', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 22:14:59', 'Received Procurement invoice INV-2026-0005 from SoleTech Rubber Manufacturing (₱12,500.00, PO PO-2026-0009, due 2026-12-18)'),
(706, 5, 'post', 'procurement_invoice', 91, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 22:14:59', 'Posted Procurement invoice INV-2026-0005 from SoleTech Rubber Manufacturing to Accounts Payable AP-91 (₱14,000.00 incl. VAT 12%, PO PO-2026-0009) — recorded as Paid'),
(707, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 22:15:36', ''),
(708, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 22:16:11', ''),
(709, 5, 'receive', 'procurement_invoice', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 22:16:11', 'Received Procurement invoice INV-2026-0005 from SoleTech Rubber Manufacturing (₱12,500.00, PO PO-2026-0009, due 2026-12-18)'),
(710, 5, 'post', 'procurement_invoice', 92, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 22:16:11', 'Posted Procurement invoice INV-2026-0005 from SoleTech Rubber Manufacturing to Accounts Payable AP-92 (₱14,000.00 incl. VAT 12%, PO PO-2026-0009) — recorded as Paid'),
(711, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 22:16:40', ''),
(712, 5, 'receive', 'procurement_invoice', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 22:16:40', 'Received Procurement invoice INV-2026-0005 from SoleTech Rubber Manufacturing (₱12,500.00, PO PO-2026-0009, due 2026-12-18)'),
(713, 5, 'post', 'procurement_invoice', 93, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 22:16:40', 'Posted Procurement invoice INV-2026-0005 from SoleTech Rubber Manufacturing to Accounts Payable AP-93 (₱14,000.00 incl. VAT 12%, PO PO-2026-0009) — recorded as Paid'),
(714, 12, 'login', 'auth', NULL, NULL, 'prbuyer@gmail.com|Procurement Buyer', '2026-11-18 22:22:41', ''),
(715, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 22:23:47', ''),
(716, 5, 'receive', 'procurement_invoice', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 22:23:47', 'Received Procurement invoice INV-2026-0005 from SoleTech Rubber Manufacturing (₱12,500.00, PO PO-2026-0009, due 2026-12-18)'),
(717, 5, 'post', 'procurement_invoice', 94, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 22:23:47', 'Posted Procurement invoice INV-2026-0005 from SoleTech Rubber Manufacturing to Accounts Payable AP-94 (₱14,000.00 incl. VAT 12%, PO PO-2026-0009) — recorded as Unpaid'),
(718, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 22:28:40', ''),
(719, 5, 'receive', 'procurement_invoice', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 22:33:48', 'Received Procurement invoice INV-2026-0005 from SoleTech Rubber Manufacturing (₱12,500.00, PO PO-2026-0009, due 2026-12-18)'),
(720, 5, 'post', 'procurement_invoice', 95, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 22:33:53', 'Posted Procurement invoice INV-2026-0005 from SoleTech Rubber Manufacturing to Accounts Payable AP-95 (₱14,000.00 incl. VAT 12%, PO PO-2026-0009) — recorded as Unpaid'),
(721, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 22:35:45', ''),
(722, 5, 'receive', 'procurement_invoice', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 22:35:45', 'Received Procurement invoice INV-2026-0005 from SoleTech Rubber Manufacturing (₱12,500.00, PO PO-2026-0009, due 2026-12-18)'),
(723, 5, 'post', 'procurement_invoice', 96, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 22:35:45', 'Posted Procurement invoice INV-2026-0005 from SoleTech Rubber Manufacturing to Accounts Payable AP-96 (₱14,000.00 incl. VAT 12%, PO PO-2026-0009) — recorded as Unpaid'),
(724, 5, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 22:40:06', ''),
(725, 5, 'receive', 'procurement_invoice', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 22:40:06', 'Received Procurement invoice INV-2026-0007 from SynthHide Textile Corp. (₱85.00, PO PO-2026-0011, due 2026-12-18)'),
(726, 5, 'post', 'procurement_invoice', 97, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 22:40:06', 'Posted Procurement invoice INV-2026-0007 from SynthHide Textile Corp. to Accounts Payable AP-97 (₱95.20 incl. VAT 12%, PO PO-2026-0011) — recorded as Unpaid'),
(727, 5, 'transaction', 'financial_transactions', 95, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 22:42:37', 'Recorded transaction INV-2026-0007 — Accounts Payable (₱95.20, Completed)'),
(728, 5, 'save', 'store', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 22:42:37', 'Updated Finance data (expenses: 1, transactions: 8, receivables: 4, payables: 7, cashBank: 1)'),
(729, 5, 'save', 'store', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-11-18 22:42:46', 'Updated Finance data (expenses: 1, transactions: 9, receivables: 4, payables: 7, cashBank: 1)'),
(730, 11, 'login', 'auth', NULL, NULL, 'prmanager@gmail.com|Procurement Manager', '2026-11-18 22:45:07', '');

-- --------------------------------------------------------

--
-- Table structure for table `cash_bank`
--

CREATE TABLE `cash_bank` (
  `account_id` int(11) NOT NULL,
  `account_name` varchar(100) NOT NULL,
  `account_type` varchar(50) DEFAULT NULL,
  `bank_name` varchar(100) DEFAULT NULL,
  `account_no` varchar(50) DEFAULT NULL,
  `balance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `cash_bank`
--

INSERT INTO `cash_bank` (`account_id`, `account_name`, `account_type`, `bank_name`, `account_no`, `balance`, `description`) VALUES
(21, 'Main Cash Account', 'Cash', NULL, NULL, 100000.00, 'Main company cash account'),
(22, 'DEVS Bank Account', 'Bank', 'DEVS Bank', NULL, 100000.00, 'DEVS Bank Account');

-- --------------------------------------------------------

--
-- Table structure for table `charts_of_accounts`
--

CREATE TABLE `charts_of_accounts` (
  `account_id` int(11) NOT NULL,
  `account_code` varchar(30) NOT NULL,
  `account_name` varchar(100) NOT NULL,
  `account_type` varchar(50) DEFAULT NULL,
  `normal_balance` enum('Debit','Credit') DEFAULT NULL,
  `status` enum('Active','Inactive') DEFAULT 'Active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `charts_of_accounts`
--

INSERT INTO `charts_of_accounts` (`account_id`, `account_code`, `account_name`, `account_type`, `normal_balance`, `status`, `created_at`, `updated_at`, `description`) VALUES
(1, '1000', 'Cash', 'Asset', NULL, 'Active', '2026-10-04 16:15:44', '2026-10-04 16:15:44', 'Company cash'),
(2, '1100', 'Bank', 'Asset', NULL, 'Active', '2026-10-04 16:15:44', '2026-10-04 16:15:44', 'Company bank accounts'),
(3, '2000', 'Accounts Payable', 'Liability', NULL, 'Active', '2026-10-04 16:15:44', '2026-10-04 16:15:44', 'Amounts owed to suppliers'),
(4, '3000', 'Capital', 'Equity', NULL, 'Active', '2026-10-04 16:15:44', '2026-10-04 16:15:44', 'Owner/company capital'),
(5, '4000', 'Revenue', 'Income', NULL, 'Active', '2026-10-04 16:15:44', '2026-10-04 16:15:44', 'Company revenue'),
(6, '5000', 'Expenses', 'Expense', NULL, 'Active', '2026-10-04 16:15:44', '2026-10-04 16:15:44', 'Company expenses');

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

CREATE TABLE `customers` (
  `customer_id` int(11) NOT NULL,
  `customer_name` varchar(100) NOT NULL,
  `contact_info` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `customers`
--

INSERT INTO `customers` (`customer_id`, `customer_name`, `contact_info`, `address`) VALUES
(1, 'Ilagan Print Co.', NULL, NULL),
(2, 'Banaag Studio', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `departments`
--

CREATE TABLE `departments` (
  `department_id` int(11) NOT NULL,
  `department_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `departments`
--

INSERT INTO `departments` (`department_id`, `department_name`, `description`) VALUES
(1, 'Finance', 'Finance and accounting department'),
(2, 'Human Resources', 'Human resources department'),
(3, 'Administration', 'Company administration'),
(4, 'Information Technology', 'IT department'),
(5, 'Procurement', 'Procurement department'),
(6, 'Inventory', 'Inventory department'),
(7, 'Sales', 'Sales department'),
(8, 'Production', 'Production department');

-- --------------------------------------------------------

--
-- Table structure for table `employees`
--

CREATE TABLE `employees` (
  `employee_id` int(11) NOT NULL,
  `employee_no` varchar(20) DEFAULT NULL,
  `first_name` varchar(50) DEFAULT NULL,
  `last_name` varchar(50) DEFAULT NULL,
  `name` varchar(100) NOT NULL,
  `contact_info` varchar(255) DEFAULT NULL,
  `position` varchar(100) DEFAULT NULL,
  `department` int(11) DEFAULT NULL,
  `employment_status` varchar(50) NOT NULL DEFAULT 'Active',
  `basic_salary` decimal(12,2) NOT NULL DEFAULT 0.00,
  `hire_date` date DEFAULT NULL,
  `date_hired` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `employees`
--

INSERT INTO `employees` (`employee_id`, `employee_no`, `first_name`, `last_name`, `name`, `contact_info`, `position`, `department`, `employment_status`, `basic_salary`, `hire_date`, `date_hired`) VALUES
(4, 'EMP-004', NULL, NULL, 'HR Administrator', '', 'Admin', 2, 'Active', 10000.00, NULL, '2026-11-10'),
(5, 'EMP-005', NULL, NULL, 'Finance Administrator', '', 'Admin', 1, 'Active', 500.00, NULL, '2026-11-10'),
(6, 'EMP-006', NULL, NULL, 'Sales Administrator', '', 'Admin', 7, 'Active', 1000.00, NULL, '2026-11-13'),
(11, 'EMP-011', NULL, NULL, 'Procurement Manager', '09123456789', 'Staff', 5, 'Active', 5500.00, NULL, '2026-11-13'),
(12, 'EMP-012', NULL, NULL, 'Procurement Buyer', '09123456789', 'Staff', 5, 'Active', 11000.00, NULL, '2026-11-13'),
(15, NULL, NULL, NULL, 'Inventory Staff', '', 'Warehouse Manager', 6, 'Active', 0.00, '2026-11-14', '2026-11-14'),
(16, NULL, NULL, NULL, 'Inventory Admin', '09123456789', 'Inventory Controller', 6, 'Active', 0.00, NULL, '2026-11-14'),
(17, NULL, 'Suficiencia', 'Andrew C', 'Suficiencia Andrew C', '', 'Warehouse Manager', 6, 'Active', 0.00, '2026-11-14', '2026-11-14'),
(18, NULL, 'Riel', 'Jurado', 'Riel Jurado', '', 'Inventory Staff / Clerk', 6, 'Active', 0.00, '2026-11-14', '2026-11-14'),
(19, NULL, 'Ferdausi', 'Banisil', 'Banisil, Ferdausi', '', 'Warehouse Staff / Associate', 6, 'Active', 0.00, '2026-11-14', '2026-11-14'),
(20, NULL, 'Paje', 'Meynard', 'Paje Meynard', '', 'Inventory Controller / Analyst', 6, 'Active', 0.00, '2026-11-14', '2026-11-14'),
(21, NULL, 'Mendoza', 'Franz Gian T.', 'Mendoza Franz Gian T.', '', 'Picker and Packer', 6, 'Active', 0.00, '2026-11-14', '2026-11-14'),
(22, NULL, 'Eric Joseph F.', 'Pompa', 'Pompa, Eric Joseph F.', '', 'Shipping and Receiving Clerk', 6, 'Active', 0.00, '2026-11-14', '2026-11-14'),
(25, NULL, NULL, NULL, 'test', '09123456789', 'Warehouse Manager', 6, 'Active', 0.00, NULL, '2026-11-15'),
(29, NULL, NULL, NULL, 'Production Supervisor', '09123456789', 'Supervisor', 8, 'Active', 0.00, NULL, '2026-11-16');

-- --------------------------------------------------------

--
-- Table structure for table `expenses`
--

CREATE TABLE `expenses` (
  `expense_id` int(11) NOT NULL,
  `department_id` int(11) DEFAULT NULL,
  `expense_category` varchar(100) DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `expense_date` date DEFAULT NULL,
  `description` text DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `receipt_reference` varchar(100) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'Pending',
  `voucher_no` varchar(64) DEFAULT NULL,
  `payment_method` varchar(64) DEFAULT NULL,
  `reference_no` varchar(128) DEFAULT NULL,
  `receipt_name` varchar(255) DEFAULT NULL,
  `receipt_data` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `expenses`
--

INSERT INTO `expenses` (`expense_id`, `department_id`, `expense_category`, `amount`, `expense_date`, `description`, `department`, `receipt_reference`, `status`, `voucher_no`, `payment_method`, `reference_no`, `receipt_name`, `receipt_data`) VALUES
(28, NULL, 'Office supplies', 1000.00, '2026-11-18', 'National Bookstore', NULL, NULL, 'Approved', 'EV-20261118-001', 'Bank Transfer', '', '', '');

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
  `acknowledged_at` timestamp NULL DEFAULT NULL,
  `vat_rate` decimal(5,2) DEFAULT NULL,
  `vat_amount` decimal(14,2) DEFAULT NULL,
  `amount_total` decimal(14,2) DEFAULT NULL,
  `posted_ap_id` int(11) DEFAULT NULL,
  `posted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `finance_procurement_invoice_inbox`
--

INSERT INTO `finance_procurement_invoice_inbox` (`id`, `request_ref`, `request_version`, `snapshot_sha256`, `invoice_number`, `supplier_invoice_reference`, `po_number`, `supplier_name`, `amount_pre_vat`, `due_date`, `received_by`, `ack_state`, `received_at`, `acknowledged_at`, `vat_rate`, `vat_amount`, `amount_total`, `posted_ap_id`, `posted_at`) VALUES
(3, '703c47b97bf6a2bded4c619b214a0a64', 1, '0b1aa1f27ffde2e48c645396d82364214e1ce96acda2ede8d52cc102de8b763f', 'INV-2026-0004', '123', 'PO-2026-0008', 'SoleTech Rubber Manufacturing', 2650.00, '2026-12-17', 'finance-admin-5', 'acknowledged', '2026-11-17 19:19:12', '2026-11-17 19:19:12', 12.00, 318.00, 2968.00, 71, '2026-11-18 03:24:36'),
(8, 'd5a7a921f4c9bbd2aa82019963dbb828', 1, '9b7429e9f63840edf916869b6f90af0eb5d60c0057271c1941406a311fd8c387', 'INV-2026-0006', '234', 'PO-2026-0009', 'SoleTech Rubber Manufacturing', 12500.00, '2026-12-18', 'finance-admin-5', 'acknowledged', '2026-11-18 13:46:48', '2026-11-18 13:46:48', 12.00, 1500.00, 14000.00, 90, '2026-11-18 21:46:56'),
(14, '256b803dd55d3f6e2023d2999788272d', 1, 'c166837e2a172b1e2f07a4ee2728187439ea2ff8521cd64440f4e70c17c3b8d5', 'INV-2026-0005', 'SIM-PO-2026-0009', 'PO-2026-0009', 'SoleTech Rubber Manufacturing', 12500.00, '2026-12-18', 'finance-admin-5', 'acknowledged', '2026-11-18 14:35:45', '2026-11-18 14:35:45', 12.00, 1500.00, 14000.00, 96, '2026-11-18 22:35:45'),
(15, '522454680fae100dad9e9fa06849ed99', 1, '5ab861957a6c3a8d20e25930c2a4565167aef44b3aabead76e7c671d528a873f', 'INV-2026-0007', '123', 'PO-2026-0011', 'SynthHide Textile Corp.', 85.00, '2026-12-18', 'finance-admin-5', 'acknowledged', '2026-11-18 14:40:06', '2026-11-18 14:40:06', 12.00, 10.20, 95.20, 97, '2026-11-18 22:40:06');

-- --------------------------------------------------------

--
-- Table structure for table `financial_reports`
--

CREATE TABLE `financial_reports` (
  `report_id` int(11) NOT NULL,
  `report_type` varchar(50) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `generated_at` datetime DEFAULT current_timestamp(),
  `created_by` varchar(100) DEFAULT NULL,
  `account_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `financial_transactions`
--

CREATE TABLE `financial_transactions` (
  `transaction_id` int(11) NOT NULL,
  `payroll_id` int(11) DEFAULT NULL,
  `expense_id` int(11) DEFAULT NULL,
  `costing_id` int(11) DEFAULT NULL,
  `account_id` int(11) DEFAULT NULL,
  `transaction_type` varchar(50) DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `transaction_date` date DEFAULT NULL,
  `payment_method` varchar(50) DEFAULT NULL,
  `reference_no` varchar(100) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'Pending',
  `description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `financial_transactions`
--

INSERT INTO `financial_transactions` (`transaction_id`, `payroll_id`, `expense_id`, `costing_id`, `account_id`, `transaction_type`, `amount`, `transaction_date`, `payment_method`, `reference_no`, `status`, `description`) VALUES
(103, NULL, NULL, NULL, 2, 'Procurement', 14000.00, '2026-11-18', NULL, 'INV-2026-0005', 'Completed', 'Accounts Payable'),
(104, NULL, NULL, NULL, 2, 'Procure', 2968.00, '2026-11-18', NULL, 'INV-2026-0004', 'Completed', 'Supplier Pay'),
(105, NULL, NULL, 3, NULL, 'Production', 933.00, '2026-11-17', NULL, 'PO-1044', 'Completed', 'Production costing for PO-1044 (Quick Step Classic Low, product #4), quantity 2, production date 2026-11-17 — materials 733.00, labor 100.00, overhead 100.00, total 933.00'),
(106, NULL, NULL, 2, NULL, 'Production', 24163.00, '2026-11-15', NULL, 'PO-1043', 'Completed', 'Production costing for PO-1043 (Black Leather, product #2), quantity 50, production date 2026-11-15 — materials 23063.00, labor 100.00, overhead 1000.00, total 24163.00'),
(107, NULL, NULL, 1, NULL, 'Production', 25063.00, '2026-11-10', NULL, 'PO-1042', 'Completed', 'Production costing for PO-1042 (Full-Grain Leather, product #1), quantity 50, production date 2026-11-10 — materials 23063.00, labor 1000.00, overhead 1000.00, total 25063.00'),
(108, NULL, NULL, NULL, NULL, 'Procure', 166.88, '2026-11-17', NULL, 'INV-2026-0005', 'Completed', 'Supplier Pay'),
(109, 56, NULL, NULL, NULL, 'HR', 10230.43, '2026-11-17', NULL, 'PR-053', 'Completed', 'Payroll — HR Administrator (November 15–30, 2026)'),
(110, 55, NULL, NULL, NULL, 'HR', 460.00, '2026-11-17', NULL, 'PR-052', 'Completed', 'Payroll — Finance Administrator (November 15–30, 2026)'),
(111, NULL, NULL, NULL, 2, 'Procurement', 95.20, '2026-11-18', NULL, 'INV-2026-0007', 'Completed', 'Accounts Payable');

-- --------------------------------------------------------

--
-- Table structure for table `forgot_password`
--

CREATE TABLE `forgot_password` (
  `reset_id` int(11) NOT NULL,
  `account_id` int(11) NOT NULL,
  `reset_token` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `government_contributions`
--

CREATE TABLE `government_contributions` (
  `contribution_id` int(11) NOT NULL,
  `payroll_id` int(11) NOT NULL,
  `sss_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `philhealth_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `pagibig_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `contribution_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `leave_requests`
--

CREATE TABLE `leave_requests` (
  `leave_id` int(11) NOT NULL,
  `employee_id` int(11) NOT NULL,
  `leave_type` varchar(50) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `status` varchar(20) DEFAULT 'Pending',
  `approved_by` varchar(100) DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `leave_requests`
--

INSERT INTO `leave_requests` (`leave_id`, `employee_id`, `leave_type`, `start_date`, `end_date`, `reason`, `status`, `approved_by`, `created_at`) VALUES
(10, 4, 'Vacation Leave', '2026-11-13', '2026-11-21', 'No reason provided', 'Pending', NULL, '2026-11-18 15:47:56'),
(11, 6, 'Vacation Leave', '2026-11-07', '2026-11-14', 'No reason provided', 'Approved', NULL, '2026-11-18 15:47:56');

-- --------------------------------------------------------

--
-- Table structure for table `notification_reads`
--

CREATE TABLE `notification_reads` (
  `user_id` int(11) NOT NULL,
  `log_id` int(11) NOT NULL,
  `read_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `notification_reads`
--

INSERT INTO `notification_reads` (`user_id`, `log_id`, `read_at`) VALUES
(5, 84, '2026-11-13 22:07:59'),
(5, 85, '2026-11-13 22:07:59'),
(5, 86, '2026-11-13 22:07:59'),
(5, 96, '2026-11-13 22:07:59'),
(5, 174, '2026-11-14 00:55:45'),
(5, 343, '2026-11-17 03:56:45'),
(5, 362, '2026-11-17 03:56:45'),
(5, 428, '2026-11-17 03:56:45'),
(5, 455, '2026-11-17 03:10:27'),
(5, 496, '2026-11-17 03:56:41'),
(5, 550, '2026-11-17 21:31:28'),
(5, 559, '2026-11-18 09:44:13'),
(5, 588, '2026-11-18 09:44:13'),
(5, 589, '2026-11-18 09:44:13'),
(5, 613, '2026-11-18 09:43:16');

-- --------------------------------------------------------

--
-- Table structure for table `page_access_defaults`
--

CREATE TABLE `page_access_defaults` (
  `department_id` tinyint(3) UNSIGNED NOT NULL,
  `position` varchar(50) NOT NULL DEFAULT '',
  `page_key` varchar(40) NOT NULL,
  `allowed` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `page_access_defaults`
--

INSERT INTO `page_access_defaults` (`department_id`, `position`, `page_key`, `allowed`) VALUES
(8, 'Staff', 'pageAccess', 1),
(8, 'Staff', 'prodAccounts', 0),
(8, 'Staff', 'prodBom', 1),
(8, 'Staff', 'prodCosting', 1),
(8, 'Staff', 'prodDashboard', 1),
(8, 'Staff', 'prodDeliveryMonitoring', 1),
(8, 'Staff', 'prodFinishedGoods', 1),
(8, 'Staff', 'prodHistory', 1),
(8, 'Staff', 'prodInvAddStock', 1),
(8, 'Staff', 'prodInvSetStock', 0),
(8, 'Staff', 'prodMaterialIssuance', 1),
(8, 'Staff', 'prodMaterialsChecklist', 1),
(8, 'Staff', 'prodMaterialsSchedule', 1),
(8, 'Staff', 'prodMonitoring', 1),
(8, 'Staff', 'prodOrderDetails', 1),
(8, 'Staff', 'prodOrders', 1),
(8, 'Staff', 'prodQcApprove', 0),
(8, 'Staff', 'prodQcView', 1),
(8, 'Staff', 'prodSupervisorDashboard', 0),
(8, 'Supervisor', 'pageAccess', 1),
(8, 'Supervisor', 'prodAccounts', 1),
(8, 'Supervisor', 'prodBom', 1),
(8, 'Supervisor', 'prodCosting', 1),
(8, 'Supervisor', 'prodDashboard', 1),
(8, 'Supervisor', 'prodDeliveryMonitoring', 1),
(8, 'Supervisor', 'prodFinishedGoods', 1),
(8, 'Supervisor', 'prodHistory', 1),
(8, 'Supervisor', 'prodInvAddStock', 1),
(8, 'Supervisor', 'prodInvSetStock', 1),
(8, 'Supervisor', 'prodMaterialIssuance', 1),
(8, 'Supervisor', 'prodMaterialsChecklist', 0),
(8, 'Supervisor', 'prodMaterialsSchedule', 1),
(8, 'Supervisor', 'prodMonitoring', 1),
(8, 'Supervisor', 'prodOrderDetails', 1),
(8, 'Supervisor', 'prodOrders', 1),
(8, 'Supervisor', 'prodQcApprove', 1),
(8, 'Supervisor', 'prodQcView', 1),
(8, 'Supervisor', 'prodSupervisorDashboard', 1);

-- --------------------------------------------------------

--
-- Table structure for table `payment_transactions`
--

CREATE TABLE `payment_transactions` (
  `transaction_id` int(11) NOT NULL,
  `account_id` int(11) NOT NULL,
  `payment_type` varchar(50) DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `transaction_date` date DEFAULT NULL,
  `reference_no` varchar(100) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'Pending',
  `description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payment_transactions`
--

INSERT INTO `payment_transactions` (`transaction_id`, `account_id`, `payment_type`, `amount`, `transaction_date`, `reference_no`, `status`, `description`) VALUES
(1, 21, 'GCash', 12000.00, '2026-10-04', 'COL-0001', 'Completed', 'Sales collection for INV-0001 / Ilagan Print Co.'),
(2, 21, 'Cash', 150000.00, '2026-10-09', 'COL-502', 'Completed', 'Sales collection for INV-3002 / Banaag Studio'),
(3, 21, 'Cash', 150018.00, '2026-10-09', 'COL-503', 'Completed', 'Sales collection for INV-3003 / Banaag Studio'),
(4, 21, 'Bank Transfer', 150000.00, '2026-10-09', 'COL-504', 'Completed', 'Sales collection for INV-3004 / Banaag Studio'),
(5, 21, 'Bank Transfer', 166.88, '2026-11-17', 'INV-2026-0005', 'Completed', 'AP settlement for INV-2026-0005 · SoleTech Rubber Manufacturing'),
(10, 21, 'Bank Transfer', 2968.00, '2026-11-18', 'INV-2026-0004', 'Completed', 'AP settlement for INV-2026-0004 · SoleTech Rubber Manufacturing'),
(11, 21, 'Bank Transfer', 95.20, '2026-11-18', 'INV-2026-0007', 'Completed', 'AP settlement for INV-2026-0007 · SynthHide Textile Corp.');

-- --------------------------------------------------------

--
-- Table structure for table `payroll`
--

CREATE TABLE `payroll` (
  `payroll_id` int(11) NOT NULL,
  `employee_id` int(11) NOT NULL,
  `payroll_period` varchar(50) NOT NULL,
  `basic_salary` decimal(12,2) NOT NULL DEFAULT 0.00,
  `overtime` decimal(12,2) NOT NULL DEFAULT 0.00,
  `absences` decimal(12,2) NOT NULL DEFAULT 0.00,
  `deductions` decimal(12,2) NOT NULL DEFAULT 0.00,
  `gross_salary` decimal(12,2) NOT NULL DEFAULT 0.00,
  `net_salary` decimal(12,2) NOT NULL DEFAULT 0.00,
  `status` varchar(20) DEFAULT 'Pending',
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payroll`
--

INSERT INTO `payroll` (`payroll_id`, `employee_id`, `payroll_period`, `basic_salary`, `overtime`, `absences`, `deductions`, `gross_salary`, `net_salary`, `status`, `created_at`) VALUES
(54, 6, 'November 15–30, 2026', 1000.00, 0.00, 0.00, 0.00, 1000.00, 1000.00, 'Pending', '2026-11-18 15:47:56'),
(55, 5, 'November 15–30, 2026', 500.00, 0.00, 0.00, 40.00, 500.00, 460.00, 'Paid', '2026-11-18 15:47:56'),
(56, 4, 'November 15–30, 2026', 10000.00, 270.43, 0.00, 40.00, 10270.43, 10230.43, 'Paid', '2026-11-18 15:47:56');

-- --------------------------------------------------------

--
-- Table structure for table `payroll_deductions`
--

CREATE TABLE `payroll_deductions` (
  `deduction_id` int(11) NOT NULL,
  `payroll_id` int(11) NOT NULL,
  `deduction_type` varchar(50) NOT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payroll_history`
--

CREATE TABLE `payroll_history` (
  `history_id` int(11) NOT NULL,
  `payroll_id` int(11) NOT NULL,
  `previous_net_salary` decimal(12,2) DEFAULT NULL,
  `new_net_salary` decimal(12,2) DEFAULT NULL,
  `change_date` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payroll_payment`
--

CREATE TABLE `payroll_payment` (
  `payment_id` int(11) NOT NULL,
  `payroll_id` int(11) NOT NULL,
  `payment_transaction_id` int(11) DEFAULT NULL,
  `payment_method` varchar(50) DEFAULT NULL,
  `reference_no` varchar(100) DEFAULT NULL,
  `payment_date` date DEFAULT NULL,
  `status` varchar(20) DEFAULT 'Pending'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `suppliers`
--

CREATE TABLE `suppliers` (
  `supplier_id` int(11) NOT NULL,
  `supplier_name` varchar(200) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `suppliers`
--

INSERT INTO `suppliers` (`supplier_id`, `supplier_name`) VALUES
(14, 'Production Department'),
(15, 'SoleTech Rubber Manufacturing'),
(16, 'Test Vendor'),
(17, 'SynthHide Textile Corp.');

-- --------------------------------------------------------

--
-- Table structure for table `supplier_quotations`
--

CREATE TABLE `supplier_quotations` (
  `quotation_id` int(11) NOT NULL,
  `request_for_quotation_id` int(11) NOT NULL,
  `requested_by` varchar(150) NOT NULL,
  `requested_date` date NOT NULL,
  `required_date` date NOT NULL,
  `priority_level` enum('Normal','High','Urgent') DEFAULT 'Normal',
  `estimated_cost` decimal(12,2) NOT NULL DEFAULT 0.00,
  `available_budget` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total_price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `delivery_time` varchar(100) DEFAULT NULL,
  `payment_terms` varchar(255) DEFAULT NULL,
  `request_status` enum('Pending','Under Review','Approved','Rejected') DEFAULT 'Pending',
  `quotation_status` enum('Pending','Selected','Rejected','Expired') DEFAULT 'Pending',
  `quotation_date` date DEFAULT NULL,
  `validity_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `thirteenth_month_pay`
--

CREATE TABLE `thirteenth_month_pay` (
  `thirteenth_id` int(11) NOT NULL,
  `payroll_id` int(11) DEFAULT NULL,
  `employee_id` int(11) DEFAULT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `payment_date` date DEFAULT NULL,
  `status` varchar(20) DEFAULT 'Pending'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `thirteenth_month_pay`
--

INSERT INTO `thirteenth_month_pay` (`thirteenth_id`, `payroll_id`, `employee_id`, `amount`, `payment_date`, `status`) VALUES
(19, NULL, 6, 1000.00, NULL, 'Pending'),
(20, NULL, 11, 5500.00, NULL, 'Pending'),
(21, NULL, 12, 11000.00, NULL, 'Pending'),
(22, NULL, 15, 0.00, NULL, 'Pending'),
(23, NULL, 16, 0.00, NULL, 'Pending'),
(24, NULL, 17, 0.00, NULL, 'Pending'),
(25, NULL, 18, 0.00, NULL, 'Pending'),
(26, NULL, 19, 0.00, NULL, 'Pending'),
(27, NULL, 20, 0.00, NULL, 'Pending'),
(28, NULL, 21, 0.00, NULL, 'Pending'),
(29, NULL, 22, 0.00, NULL, 'Pending'),
(30, NULL, 25, 0.00, NULL, 'Pending');

-- --------------------------------------------------------

--
-- Table structure for table `user_page_access`
--

CREATE TABLE `user_page_access` (
  `account_id` int(11) NOT NULL,
  `page_key` varchar(40) NOT NULL,
  `allowed` tinyint(1) NOT NULL DEFAULT 1,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_page_access`
--

INSERT INTO `user_page_access` (`account_id`, `page_key`, `allowed`, `updated_at`) VALUES
(29, 'pageAccess', 1, '2026-11-16 23:08:26'),
(29, 'prodAccounts', 1, '2026-11-16 23:08:26'),
(29, 'prodBom', 1, '2026-11-16 23:08:26'),
(29, 'prodCosting', 1, '2026-11-16 23:08:26'),
(29, 'prodDashboard', 1, '2026-11-16 23:08:26'),
(29, 'prodDeliveryMonitoring', 1, '2026-11-16 23:08:26'),
(29, 'prodFinishedGoods', 1, '2026-11-16 23:08:26'),
(29, 'prodHistory', 1, '2026-11-16 23:08:26'),
(29, 'prodInvAddStock', 1, '2026-11-16 23:08:26'),
(29, 'prodInvSetStock', 1, '2026-11-16 23:08:26'),
(29, 'prodMaterialIssuance', 1, '2026-11-16 23:08:26'),
(29, 'prodMaterialsChecklist', 0, '2026-11-16 23:08:26'),
(29, 'prodMaterialsSchedule', 1, '2026-11-16 23:08:26'),
(29, 'prodMonitoring', 1, '2026-11-16 23:08:26'),
(29, 'prodOrderDetails', 1, '2026-11-16 23:08:26'),
(29, 'prodOrders', 1, '2026-11-16 23:08:26'),
(29, 'prodQcApprove', 1, '2026-11-16 23:08:26'),
(29, 'prodQcView', 1, '2026-11-16 23:08:26'),
(29, 'prodSupervisorDashboard', 1, '2026-11-16 23:08:26');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `accounts`
--
ALTER TABLE `accounts`
  ADD PRIMARY KEY (`account_id`),
  ADD UNIQUE KEY `unique_username` (`username`),
  ADD UNIQUE KEY `unique_employee_account` (`employee_id`),
  ADD KEY `idx_accounts_employee` (`employee_id`);

--
-- Indexes for table `accounts_payable`
--
ALTER TABLE `accounts_payable`
  ADD PRIMARY KEY (`ap_id`),
  ADD UNIQUE KEY `uq_ap_quotation` (`quotation_id`),
  ADD KEY `idx_ap_supplier` (`supplier_id`),
  ADD KEY `idx_ap_expense` (`expense_id`),
  ADD KEY `idx_ap_payment` (`payment_id`);

--
-- Indexes for table `accounts_receivable`
--
ALTER TABLE `accounts_receivable`
  ADD PRIMARY KEY (`ar_id`),
  ADD KEY `idx_ar_customer` (`customer_id`),
  ADD KEY `idx_ar_expense` (`expense_id`),
  ADD KEY `idx_ar_payment` (`payment_id`);

--
-- Indexes for table `attendance`
--
ALTER TABLE `attendance`
  ADD PRIMARY KEY (`attendance_id`),
  ADD UNIQUE KEY `unique_employee_attendance` (`employee_id`,`attendance_date`),
  ADD KEY `idx_attendance_employee` (`employee_id`);

--
-- Indexes for table `audit_trail`
--
ALTER TABLE `audit_trail`
  ADD PRIMARY KEY (`log_id`),
  ADD KEY `idx_audit_user` (`user_id`),
  ADD KEY `idx_audit_module` (`module`),
  ADD KEY `idx_audit_record` (`record_id`);

--
-- Indexes for table `cash_bank`
--
ALTER TABLE `cash_bank`
  ADD PRIMARY KEY (`account_id`);

--
-- Indexes for table `charts_of_accounts`
--
ALTER TABLE `charts_of_accounts`
  ADD PRIMARY KEY (`account_id`),
  ADD UNIQUE KEY `unique_account_code` (`account_code`);

--
-- Indexes for table `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`customer_id`);

--
-- Indexes for table `departments`
--
ALTER TABLE `departments`
  ADD PRIMARY KEY (`department_id`),
  ADD UNIQUE KEY `unique_department_name` (`department_name`);

--
-- Indexes for table `employees`
--
ALTER TABLE `employees`
  ADD PRIMARY KEY (`employee_id`),
  ADD KEY `idx_employees_department` (`department`);

--
-- Indexes for table `expenses`
--
ALTER TABLE `expenses`
  ADD PRIMARY KEY (`expense_id`);

--
-- Indexes for table `finance_procurement_invoice_inbox`
--
ALTER TABLE `finance_procurement_invoice_inbox`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_fin_proc_request` (`request_ref`),
  ADD UNIQUE KEY `uq_fin_proc_invoice` (`invoice_number`),
  ADD KEY `idx_fin_proc_ack` (`ack_state`);

--
-- Indexes for table `financial_reports`
--
ALTER TABLE `financial_reports`
  ADD PRIMARY KEY (`report_id`),
  ADD KEY `idx_financial_reports_account` (`account_id`);

--
-- Indexes for table `financial_transactions`
--
ALTER TABLE `financial_transactions`
  ADD PRIMARY KEY (`transaction_id`),
  ADD KEY `idx_financial_payroll` (`payroll_id`),
  ADD KEY `idx_financial_expense` (`expense_id`),
  ADD KEY `idx_financial_account` (`account_id`);

--
-- Indexes for table `forgot_password`
--
ALTER TABLE `forgot_password`
  ADD PRIMARY KEY (`reset_id`),
  ADD UNIQUE KEY `unique_reset_token` (`reset_token`),
  ADD KEY `idx_forgot_password_account` (`account_id`);

--
-- Indexes for table `government_contributions`
--
ALTER TABLE `government_contributions`
  ADD PRIMARY KEY (`contribution_id`),
  ADD KEY `idx_contribution_payroll` (`payroll_id`);

--
-- Indexes for table `leave_requests`
--
ALTER TABLE `leave_requests`
  ADD PRIMARY KEY (`leave_id`),
  ADD KEY `idx_leave_employee` (`employee_id`);

--
-- Indexes for table `notification_reads`
--
ALTER TABLE `notification_reads`
  ADD PRIMARY KEY (`user_id`,`log_id`);

--
-- Indexes for table `page_access_defaults`
--
ALTER TABLE `page_access_defaults`
  ADD PRIMARY KEY (`department_id`,`position`,`page_key`);

--
-- Indexes for table `payment_transactions`
--
ALTER TABLE `payment_transactions`
  ADD PRIMARY KEY (`transaction_id`),
  ADD KEY `idx_payment_account` (`account_id`);

--
-- Indexes for table `payroll`
--
ALTER TABLE `payroll`
  ADD PRIMARY KEY (`payroll_id`),
  ADD KEY `idx_payroll_employee` (`employee_id`);

--
-- Indexes for table `payroll_deductions`
--
ALTER TABLE `payroll_deductions`
  ADD PRIMARY KEY (`deduction_id`),
  ADD KEY `idx_payroll_deduction_payroll` (`payroll_id`);

--
-- Indexes for table `payroll_history`
--
ALTER TABLE `payroll_history`
  ADD PRIMARY KEY (`history_id`),
  ADD KEY `idx_history_payroll` (`payroll_id`);

--
-- Indexes for table `payroll_payment`
--
ALTER TABLE `payroll_payment`
  ADD PRIMARY KEY (`payment_id`),
  ADD KEY `idx_payroll_payment_payroll` (`payroll_id`),
  ADD KEY `idx_payroll_payment_transaction` (`payment_transaction_id`);

--
-- Indexes for table `suppliers`
--
ALTER TABLE `suppliers`
  ADD PRIMARY KEY (`supplier_id`);

--
-- Indexes for table `supplier_quotations`
--
ALTER TABLE `supplier_quotations`
  ADD PRIMARY KEY (`quotation_id`),
  ADD KEY `idx_request_for_quotation` (`request_for_quotation_id`);

--
-- Indexes for table `thirteenth_month_pay`
--
ALTER TABLE `thirteenth_month_pay`
  ADD PRIMARY KEY (`thirteenth_id`),
  ADD KEY `idx_thirteenth_payroll` (`payroll_id`),
  ADD KEY `idx_thirteenth_employee` (`employee_id`);

--
-- Indexes for table `user_page_access`
--
ALTER TABLE `user_page_access`
  ADD PRIMARY KEY (`account_id`,`page_key`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `accounts`
--
ALTER TABLE `accounts`
  MODIFY `account_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;

--
-- AUTO_INCREMENT for table `accounts_payable`
--
ALTER TABLE `accounts_payable`
  MODIFY `ap_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=112;

--
-- AUTO_INCREMENT for table `accounts_receivable`
--
ALTER TABLE `accounts_receivable`
  MODIFY `ar_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=105;

--
-- AUTO_INCREMENT for table `attendance`
--
ALTER TABLE `attendance`
  MODIFY `attendance_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT for table `audit_trail`
--
ALTER TABLE `audit_trail`
  MODIFY `log_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=731;

--
-- AUTO_INCREMENT for table `cash_bank`
--
ALTER TABLE `cash_bank`
  MODIFY `account_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT for table `charts_of_accounts`
--
ALTER TABLE `charts_of_accounts`
  MODIFY `account_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `customers`
--
ALTER TABLE `customers`
  MODIFY `customer_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `departments`
--
ALTER TABLE `departments`
  MODIFY `department_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `employees`
--
ALTER TABLE `employees`
  MODIFY `employee_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;

--
-- AUTO_INCREMENT for table `expenses`
--
ALTER TABLE `expenses`
  MODIFY `expense_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT for table `finance_procurement_invoice_inbox`
--
ALTER TABLE `finance_procurement_invoice_inbox`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `financial_reports`
--
ALTER TABLE `financial_reports`
  MODIFY `report_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `financial_transactions`
--
ALTER TABLE `financial_transactions`
  MODIFY `transaction_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=112;

--
-- AUTO_INCREMENT for table `forgot_password`
--
ALTER TABLE `forgot_password`
  MODIFY `reset_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `government_contributions`
--
ALTER TABLE `government_contributions`
  MODIFY `contribution_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `leave_requests`
--
ALTER TABLE `leave_requests`
  MODIFY `leave_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `payment_transactions`
--
ALTER TABLE `payment_transactions`
  MODIFY `transaction_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `payroll`
--
ALTER TABLE `payroll`
  MODIFY `payroll_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=57;

--
-- AUTO_INCREMENT for table `payroll_deductions`
--
ALTER TABLE `payroll_deductions`
  MODIFY `deduction_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=59;

--
-- AUTO_INCREMENT for table `payroll_history`
--
ALTER TABLE `payroll_history`
  MODIFY `history_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payroll_payment`
--
ALTER TABLE `payroll_payment`
  MODIFY `payment_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `suppliers`
--
ALTER TABLE `suppliers`
  MODIFY `supplier_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `supplier_quotations`
--
ALTER TABLE `supplier_quotations`
  MODIFY `quotation_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `thirteenth_month_pay`
--
ALTER TABLE `thirteenth_month_pay`
  MODIFY `thirteenth_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `accounts`
--
ALTER TABLE `accounts`
  ADD CONSTRAINT `fk_accounts_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON UPDATE CASCADE;

--
-- Constraints for table `accounts_payable`
--
ALTER TABLE `accounts_payable`
  ADD CONSTRAINT `fk_ap_expense` FOREIGN KEY (`expense_id`) REFERENCES `expenses` (`expense_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ap_payment` FOREIGN KEY (`payment_id`) REFERENCES `payment_transactions` (`transaction_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ap_quotation` FOREIGN KEY (`quotation_id`) REFERENCES `supplier_quotations` (`quotation_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ap_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`) ON UPDATE CASCADE;

--
-- Constraints for table `accounts_receivable`
--
ALTER TABLE `accounts_receivable`
  ADD CONSTRAINT `fk_ar_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ar_expense` FOREIGN KEY (`expense_id`) REFERENCES `expenses` (`expense_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ar_payment` FOREIGN KEY (`payment_id`) REFERENCES `payment_transactions` (`transaction_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `attendance`
--
ALTER TABLE `attendance`
  ADD CONSTRAINT `fk_attendance_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `audit_trail`
--
ALTER TABLE `audit_trail`
  ADD CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`) REFERENCES `accounts` (`account_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `employees`
--
ALTER TABLE `employees`
  ADD CONSTRAINT `fk_employees_department` FOREIGN KEY (`department`) REFERENCES `departments` (`department_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `financial_reports`
--
ALTER TABLE `financial_reports`
  ADD CONSTRAINT `fk_financial_reports_account` FOREIGN KEY (`account_id`) REFERENCES `charts_of_accounts` (`account_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `financial_transactions`
--
ALTER TABLE `financial_transactions`
  ADD CONSTRAINT `fk_financial_account` FOREIGN KEY (`account_id`) REFERENCES `charts_of_accounts` (`account_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_financial_expense` FOREIGN KEY (`expense_id`) REFERENCES `expenses` (`expense_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_financial_payroll` FOREIGN KEY (`payroll_id`) REFERENCES `payroll` (`payroll_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `forgot_password`
--
ALTER TABLE `forgot_password`
  ADD CONSTRAINT `fk_forgot_password_account` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`account_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `government_contributions`
--
ALTER TABLE `government_contributions`
  ADD CONSTRAINT `fk_contribution_payroll` FOREIGN KEY (`payroll_id`) REFERENCES `payroll` (`payroll_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `leave_requests`
--
ALTER TABLE `leave_requests`
  ADD CONSTRAINT `fk_leave_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `payment_transactions`
--
ALTER TABLE `payment_transactions`
  ADD CONSTRAINT `fk_payment_cash_bank` FOREIGN KEY (`account_id`) REFERENCES `cash_bank` (`account_id`) ON UPDATE CASCADE;

--
-- Constraints for table `payroll`
--
ALTER TABLE `payroll`
  ADD CONSTRAINT `fk_payroll_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `payroll_deductions`
--
ALTER TABLE `payroll_deductions`
  ADD CONSTRAINT `fk_payroll_deduction_payroll` FOREIGN KEY (`payroll_id`) REFERENCES `payroll` (`payroll_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `payroll_history`
--
ALTER TABLE `payroll_history`
  ADD CONSTRAINT `fk_history_payroll` FOREIGN KEY (`payroll_id`) REFERENCES `payroll` (`payroll_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `payroll_payment`
--
ALTER TABLE `payroll_payment`
  ADD CONSTRAINT `fk_payroll_payment_payroll` FOREIGN KEY (`payroll_id`) REFERENCES `payroll` (`payroll_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_payroll_payment_transaction` FOREIGN KEY (`payment_transaction_id`) REFERENCES `payment_transactions` (`transaction_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `thirteenth_month_pay`
--
ALTER TABLE `thirteenth_month_pay`
  ADD CONSTRAINT `fk_thirteenth_payroll` FOREIGN KEY (`payroll_id`) REFERENCES `payroll` (`payroll_id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
