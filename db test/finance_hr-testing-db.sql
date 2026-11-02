-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 05, 2026 at 06:37 PM
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
  `email` varchar(150) DEFAULT NULL,
  `full_name` varchar(150) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `position` varchar(50) NOT NULL DEFAULT 'staff',
  `department` varchar(50) DEFAULT NULL,
  `role` varchar(50) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'Active',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `approved_by` varchar(150) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `rejected_by` varchar(150) DEFAULT NULL,
  `rejected_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `accounts`
--

INSERT INTO `accounts` (`account_id`, `employee_id`, `username`, `email`, `full_name`, `password`, `position`, `department`, `role`, `phone`, `status`, `created_at`, `approved_by`, `approved_at`, `rejected_by`, `rejected_at`) VALUES
(1, 1, 'juan.miguel.mendoza@devs.com', 'juan.miguel.mendoza@devs.com', 'Juan Miguel Mendoza', '$2y$10$cGA61898uI4/mKoRiCGTDO7uakU7O8.rolzWpwEAQseOQZPVdJdOK', 'Staff', 'Finance', 'Finance Staff', '', 'Active', '2026-10-03 19:22:11', NULL, NULL, NULL, NULL),
(5, 3, 'jay.marasigan@devs.com', 'jay.marasigan@devs.com', 'Jay Marasigan', '$2y$10$e0MYzXyjpJS7Pd0RVvHwHe1HlCkwWi0aRz4r0mNq1aYkEqQ5cJfZa', 'Staff', 'Finance', 'Finance Staff', '', 'Active', '2026-10-05 08:58:30', NULL, NULL, NULL, NULL),
(6, 4, 'clark@devs.com', 'clark@devs.com', 'Clark', '$2y$10$ucAYvcK6LYOXmXtZMePd0uzRm7m5cxnhZn0iJtb9zbLPl8M6cpyFq', 'Staff', 'Finance', 'Finance Staff', NULL, 'Active', '2026-10-05 13:30:34', NULL, NULL, NULL, NULL),
(7, 5, 'finance.admin@devs.com', 'finance.admin@devs.com', 'finance admin', '$2y$10$596k27Tes2H6puxEJ2Vf0uYrR3Ht0jKfnog9pG1W1pb.KNR9gGFUG', 'Admin', 'Finance', 'Finance Admin', NULL, 'Active', '2026-10-05 13:45:18', NULL, NULL, NULL, NULL),
(11, 6, 'administrator@devs.com', 'administrator@devs.com', 'Administrator', '$2a$10$.9FD/zGf1Xod.KNkXDMRO.vpSpIZnOZYeU4XR/ycxSgB7lYebG5Ti', 'Admin', 'HR', 'HR Admin', NULL, 'Active', '2026-10-05 13:51:15', NULL, NULL, NULL, NULL),
(13, 15, 'lancenuke@gmail.com', 'lancenuke@gmail.com', 'Lance Nuecaa', '$2y$10$eMWxNONDhZrLmjohwRu6mOCF80QFgklta47Y9ykutJlHaNZYqi8oK', 'Staff', 'Finance', 'Finance Staff', NULL, 'Active', '2026-10-05 19:31:50', NULL, NULL, NULL, NULL),
(14, 16, 'admin26@gmail.com', 'admin26@gmail.com', 'Administrator', '$2a$10$.9FD/zGf1Xod.KNkXDMRO.vpSpIZnOZYeU4XR/ycxSgB7lYebG5Ti', 'Admin', 'HR', 'HR Admin', NULL, 'Active', '2026-10-05 19:33:24', NULL, NULL, NULL, NULL),
(15, 17, 'lanceyboi@gmail.com', 'lanceyboi@gmail.com', 'Lance Nueca', '$2y$10$T68LeZatmnkmmaiyStd4p.PkyddXBO0DVRn2INi7jvLmn2.DaWNgC', 'Staff', 'Finance', 'Finance Staff', NULL, 'Active', '2026-10-06 00:24:02', NULL, NULL, NULL, NULL);

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
  `amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `due_date` date DEFAULT NULL,
  `status` varchar(20) DEFAULT 'Pending',
  `payment_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `accounts_payable`
--

INSERT INTO `accounts_payable` (`ap_id`, `supplier_id`, `po_id`, `expense_id`, `invoice_no`, `amount`, `due_date`, `status`, `payment_id`) VALUES
(5, 1, NULL, NULL, 'BILL-2026-130', 45000.00, '2026-10-10', 'Paid', NULL),
(6, 3, NULL, NULL, 'BILL-2026-115', 16400.00, '2026-09-18', 'Due', NULL),
(7, 2, NULL, NULL, 'BILL-2026-121', 28500.00, '2026-09-28', 'For review', NULL),
(8, 1, NULL, NULL, 'BILL-2026-118', 72000.00, '2026-09-22', 'Approved', NULL);

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
(5, 1, NULL, NULL, 'INV-2026-050', 45000.00, '2026-10-15', 'Paid', NULL),
(6, 3, NULL, NULL, 'INV-2026-036', 105000.00, '2026-09-08', 'Overdue', NULL),
(7, 2, NULL, NULL, 'INV-2026-044', 96000.00, '2026-09-25', 'Open', NULL),
(8, 1, NULL, NULL, 'INV-2026-041', 185000.00, '2026-09-20', 'Open', NULL);

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
(206, 6, '2026-10-05', '08:10:00', '17:00:00', 'Present', 0.00, NULL),
(207, 5, '2026-10-05', '07:58:00', '17:05:00', 'Present', 0.00, NULL),
(208, 4, '2026-10-05', NULL, NULL, 'On Leave', 0.00, NULL),
(209, 3, '2026-10-05', '08:45:00', '17:00:00', 'Late', 0.00, NULL),
(210, 1, '2026-10-05', '08:02:00', '17:10:00', 'Present', 0.00, NULL),
(211, 5, '2026-10-04', '08:00:00', '17:00:00', 'Present', 0.00, NULL),
(212, 1, '2026-10-04', '08:05:00', '17:00:00', 'Present', 0.00, NULL),
(213, 3, '2026-10-03', '08:50:00', '17:00:00', 'Late', 0.00, NULL),
(214, 1, '2026-10-03', '08:01:00', '17:00:00', 'Present', 0.00, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `audit_trail`
--

CREATE TABLE `audit_trail` (
  `log_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
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
(1, 6, 'register', 'account', 6, NULL, 'clark@gmail.com|Finance Staff', '2026-10-05 13:30:34', 'Finance Staff / Pending'),
(2, 6, 'login', 'auth', NULL, NULL, 'clark@gmail.com|Finance Staff', '2026-10-05 13:35:35', ''),
(3, 6, 'logout', 'auth', NULL, NULL, 'clark@gmail.com|Finance Staff', '2026-10-05 13:44:46', ''),
(4, 7, 'register', 'account', 7, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-10-05 13:45:18', 'Finance Admin / Pending'),
(5, 11, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 13:51:33', ''),
(6, 11, 'approve_user', 'account', 7, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 13:51:38', ''),
(7, 11, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 13:51:40', ''),
(8, 7, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-10-05 13:51:45', ''),
(9, 7, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-10-05 13:52:29', ''),
(10, 11, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 13:52:51', ''),
(11, 11, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 13:53:51', ''),
(12, 11, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 13:54:23', ''),
(13, 11, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 13:54:27', ''),
(14, 11, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 13:56:40', ''),
(15, 11, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 13:56:40', ''),
(16, 11, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 14:09:53', ''),
(17, 7, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-10-05 14:09:58', ''),
(18, 7, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-10-05 14:21:25', ''),
(19, 11, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 14:21:29', ''),
(20, 11, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 14:21:44', ''),
(21, 11, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 14:22:51', ''),
(22, 7, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-10-05 14:26:13', ''),
(23, 7, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-10-05 14:26:49', ''),
(24, 11, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 14:41:57', ''),
(25, 7, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-10-05 14:42:03', ''),
(26, 7, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-10-05 14:51:09', ''),
(27, 11, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 14:51:14', ''),
(28, 11, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 15:09:28', ''),
(29, 7, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-10-05 15:09:34', ''),
(30, 12, 'register', 'account', 12, NULL, 'persdaynaperdaypahipakagad@gmail.com|Finance Admin', '2026-10-05 16:24:08', 'Finance Admin / Pending'),
(31, 11, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 16:25:09', ''),
(32, 11, 'approve_user', 'account', 12, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 16:25:16', ''),
(33, 12, 'login', 'auth', NULL, NULL, 'persdaynaperdaypahipakagad@gmail.com|Finance Admin', '2026-10-05 16:25:21', ''),
(34, 11, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 16:25:26', ''),
(35, 11, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 16:26:47', ''),
(36, 11, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 16:56:07', ''),
(37, 11, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 17:49:26', ''),
(38, 11, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 17:49:29', ''),
(39, 11, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 17:56:01', ''),
(40, 7, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-10-05 17:56:05', ''),
(41, 7, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-10-05 17:56:54', ''),
(42, 11, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 17:56:57', ''),
(43, 11, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 17:58:42', ''),
(44, 11, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 17:58:48', ''),
(45, 11, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 17:58:48', ''),
(46, 11, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 17:59:00', ''),
(47, 7, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-10-05 17:59:06', ''),
(48, 7, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-10-05 17:59:16', ''),
(49, 11, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 17:59:22', ''),
(50, 11, 'reset_password', 'account', 1, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 18:04:08', ''),
(51, 11, 'save', 'store', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 18:34:15', 'Updated HR data: 6 employees, 11 attendance rows, 5 leave rows, 9 payroll rows'),
(52, 11, 'save', 'store', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 18:43:58', 'Updated HR data: 6 employees, 11 attendance rows, 5 leave rows, 9 payroll rows'),
(53, 11, 'save', 'store', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 18:55:08', 'Updated HR data: 6 employees, 11 attendance rows, 5 leave rows, 9 payroll rows'),
(54, 11, 'save', 'store', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 18:55:36', 'Updated HR data: 6 employees, 11 attendance rows, 5 leave rows, 9 payroll rows'),
(55, 11, 'save', 'store', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 18:55:56', 'Updated HR data: 6 employees, 11 attendance rows, 5 leave rows, 9 payroll rows'),
(56, 11, 'save', 'store', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 18:57:42', 'Updated HR data: 6 employees, 11 attendance rows, 5 leave rows, 9 payroll rows'),
(57, 11, 'save', 'store', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 18:58:05', 'Updated HR data: 6 employees, 11 attendance rows, 5 leave rows, 9 payroll rows'),
(58, 11, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 19:00:15', ''),
(59, 7, 'login', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-10-05 19:00:22', ''),
(60, 7, 'save', 'store', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-10-05 19:00:50', 'Updated finance data'),
(61, 7, 'logout', 'auth', NULL, NULL, 'financeadmin@gmail.com|Finance Admin', '2026-10-05 19:04:19', ''),
(62, 11, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 19:04:22', ''),
(63, 11, 'create_account', 'account', 13, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 19:31:50', 'Lance Nuecaa · Finance Staff'),
(64, 11, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 19:31:54', ''),
(65, 13, 'login', 'auth', NULL, NULL, 'lancenuke@gmail.com|Finance Staff', '2026-10-05 19:32:02', ''),
(66, 13, 'logout', 'auth', NULL, NULL, 'lancenuke@gmail.com|Finance Staff', '2026-10-05 19:32:08', ''),
(67, 14, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 19:36:52', ''),
(68, 14, 'reset_password', 'account', 13, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 19:37:16', ''),
(69, 14, 'reset_password', 'account', 1, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 19:40:12', ''),
(70, 14, 'logout', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 19:41:09', ''),
(71, 14, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 19:41:15', ''),
(72, 14, 'save', 'store', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 19:41:41', 'Updated HR data: 8 employees, 11 attendance rows, 5 leave rows, 9 payroll rows'),
(73, 14, 'save', 'store', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 19:41:44', 'Updated HR data: 8 employees, 11 attendance rows, 5 leave rows, 9 payroll rows'),
(74, 14, 'save_access_bulk', 'account', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 20:00:37', 'Position=Admin · Department=Finance · 1 user(s)'),
(75, 14, 'save_access_bulk', 'account', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-05 20:00:59', 'Position=All · Department=All · 8 user(s)'),
(76, 14, 'login', 'auth', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-06 00:21:32', ''),
(77, 14, 'set_status', 'account', 3, NULL, 'admin26@gmail.com|HR Admin', '2026-10-06 00:23:04', 'Inactive'),
(78, 14, 'save', 'store', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-06 00:23:13', 'Updated HR data: 7 employees, 9 attendance rows, 4 leave rows, 7 payroll rows'),
(79, 14, 'create_account', 'account', 15, NULL, 'admin26@gmail.com|HR Admin', '2026-10-06 00:24:02', 'Lance Nueca · Finance Staff'),
(80, 14, 'save', 'store', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-06 00:24:19', 'Updated HR data: 8 employees, 9 attendance rows, 4 leave rows, 7 payroll rows'),
(81, 15, 'login', 'auth', NULL, NULL, 'lanceyboi@gmail.com|Finance Staff', '2026-10-06 00:26:20', ''),
(82, 14, 'save_access_bulk', 'account', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-06 00:26:34', 'Position=All · Department=Finance · 6 user(s)'),
(83, 14, 'save_access_bulk', 'account', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-06 00:26:50', 'Position=All · Department=Finance · 6 user(s)'),
(84, 14, 'save', 'store', NULL, NULL, 'admin26@gmail.com|HR Admin', '2026-10-06 00:28:42', 'Updated HR data: 8 employees, 9 attendance rows, 4 leave rows, 7 payroll rows');

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
(4, 'Main Cash Account', 'Cash', NULL, NULL, 100000.00, 'Main company cash account'),
(5, 'BDO Operating', 'Bank', 'BDO', '1234-5678-9012', 1245000.00, 'Main operating account'),
(6, 'Petty Cash', 'Cash', NULL, NULL, 25000.00, 'Office petty cash');

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
  `parent_account_id` int(11) DEFAULT NULL,
  `description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `charts_of_accounts`
--

INSERT INTO `charts_of_accounts` (`account_id`, `account_code`, `account_name`, `account_type`, `normal_balance`, `status`, `created_at`, `updated_at`, `parent_account_id`, `description`) VALUES
(1, '1000', 'Cash', 'Asset', NULL, 'Active', '2026-10-04 16:15:44', '2026-10-04 16:15:44', NULL, 'Company cash'),
(2, '1100', 'Bank', 'Asset', NULL, 'Active', '2026-10-04 16:15:44', '2026-10-04 16:15:44', NULL, 'Company bank accounts'),
(3, '2000', 'Accounts Payable', 'Liability', NULL, 'Active', '2026-10-04 16:15:44', '2026-10-04 16:15:44', NULL, 'Amounts owed to suppliers'),
(4, '3000', 'Capital', 'Equity', NULL, 'Active', '2026-10-04 16:15:44', '2026-10-04 16:15:44', NULL, 'Owner/company capital'),
(5, '4000', 'Revenue', 'Income', NULL, 'Active', '2026-10-04 16:15:44', '2026-10-04 16:15:44', NULL, 'Company revenue'),
(6, '5000', 'Expenses', 'Expense', NULL, 'Active', '2026-10-04 16:15:44', '2026-10-04 16:15:44', NULL, 'Company expenses');

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
(1, 'Northstar Digital', 'northstar@example.com', 'Makati City'),
(2, 'Cedar & Co.', 'cedar@example.com', 'Pasig City'),
(3, 'Mabini Retail Group', 'mabini@example.com', 'Quezon City');

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
(3, 'Administration', 'Administrative department'),
(4, 'Information Technology', 'Information technology department');

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
  `email` varchar(150) DEFAULT NULL,
  `contact_info` varchar(255) DEFAULT NULL,
  `position` varchar(100) DEFAULT NULL,
  `position_label` varchar(100) DEFAULT NULL,
  `department` int(11) DEFAULT NULL,
  `department_label` varchar(100) DEFAULT NULL,
  `employment_status` varchar(50) NOT NULL DEFAULT 'Active',
  `basic_salary` decimal(12,2) NOT NULL DEFAULT 0.00,
  `hire_date` date DEFAULT NULL,
  `date_hired` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `employees`
--

INSERT INTO `employees` (`employee_id`, `employee_no`, `first_name`, `last_name`, `name`, `email`, `contact_info`, `position`, `position_label`, `department`, `department_label`, `employment_status`, `basic_salary`, `hire_date`, `date_hired`) VALUES
(1, NULL, NULL, NULL, 'Juan Miguel Mendoza', 'juan@devs.com', '09123456789', 'Staff', 'Staff', 1, 'Finance', 'Active', 25000.00, NULL, '2026-01-10'),
(3, NULL, NULL, NULL, 'Jay Marasigan', 'jay@devs.com', '09112223333', 'Staff', 'Staff', 2, 'HR', 'Active', 30000.00, NULL, '2026-02-01'),
(4, NULL, NULL, NULL, 'Clark', 'clark@gmail.com', '', 'Staff', 'Staff', 1, 'Finance', 'Active', 0.00, NULL, '2026-10-05'),
(5, NULL, NULL, NULL, 'finance admin', 'financeadmin@gmail.com', '', 'Admin', 'Admin', 1, 'Finance', 'Active', 0.00, NULL, '2026-10-05'),
(6, NULL, NULL, NULL, 'Administrator', 'admin26@gmail.com', '', 'Admin', 'Admin', 2, 'HR', 'Active', 0.00, NULL, '2026-10-05'),
(15, NULL, NULL, NULL, 'Lance Nuecaa', 'lancenuke@gmail.com', '09123456789', 'Staff', 'Staff', 1, 'Finance', 'Active', 10000.00, NULL, '2026-10-05'),
(16, NULL, NULL, NULL, 'Administrator', 'admin26@gmail.com', '', 'Admin', 'Admin', 2, 'HR', 'Active', 0.00, NULL, '2026-10-05'),
(17, NULL, NULL, NULL, 'Lance Nueca', 'lanceyboi@gmail.com', '09123456789', 'Staff', 'Staff', 1, 'Finance', 'Active', 100000.00, NULL, '2026-10-06');

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
  `status` varchar(20) DEFAULT 'Pending'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `expenses`
--

INSERT INTO `expenses` (`expense_id`, `department_id`, `expense_category`, `amount`, `expense_date`, `description`, `department`, `receipt_reference`, `status`) VALUES
(6, NULL, 'Office supplies', 4500.00, '2026-10-03', 'National Bookstore', NULL, NULL, 'Approved'),
(7, NULL, 'Utilities', 9800.00, '2026-10-02', 'Metro Utilities', NULL, NULL, 'Pending'),
(8, NULL, 'Travel and representation', 18400.00, '2026-09-10', 'Various vendors', NULL, NULL, 'For review'),
(9, NULL, 'Software subscriptions', 28500.00, '2026-09-12', 'Cloud Services PH', NULL, NULL, 'Approved'),
(10, NULL, 'Office lease', 72000.00, '2026-09-16', 'Makati Properties', NULL, NULL, 'Posted');

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
(3, NULL, NULL, NULL, NULL, 'Debit', 40000.00, '2026-09-17', NULL, 'COL-001', 'Completed', 'Customer collection — Northstar Digital'),
(4, NULL, NULL, NULL, NULL, 'Debit', 185000.00, '2026-09-17', NULL, 'PAY-001', 'Completed', 'Supplier payment — Makati Properties'),
(5, NULL, NULL, NULL, NULL, 'Procure', 1.00, '2026-10-05', NULL, 'PAY-002', 'Completed', 'Supplier Pay');

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
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `leave_requests`
--

INSERT INTO `leave_requests` (`leave_id`, `employee_id`, `leave_type`, `start_date`, `end_date`, `reason`, `status`, `approved_by`, `created_at`) VALUES
(78, 1, 'Sick Leave', '2026-09-25', '2026-09-26', 'Medical checkup', 'Approved', NULL, '2026-10-06 00:28:42'),
(79, 6, 'Emergency Leave', '2026-09-30', '2026-09-30', 'Family emergency', 'Rejected', NULL, '2026-10-06 00:28:42'),
(80, 5, 'Vacation Leave', '2026-10-19', '2026-10-21', 'Personal vacation', 'Rejected', NULL, '2026-10-06 00:28:42'),
(81, 3, 'Sick Leave', '2026-10-05', '2026-10-05', 'Fever', 'Approved', NULL, '2026-10-06 00:28:42');

-- --------------------------------------------------------

--
-- Table structure for table `page_access`
--

CREATE TABLE `page_access` (
  `user_id` int(11) NOT NULL,
  `page_key` varchar(80) NOT NULL,
  `allowed` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `page_access`
--

INSERT INTO `page_access` (`user_id`, `page_key`, `allowed`) VALUES
(1, 'cashBank', 1),
(1, 'chartAccounts', 1),
(1, 'dashboard', 1),
(1, 'expenses', 1),
(1, 'financialReports', 1),
(1, 'financialTransactions', 1),
(1, 'pageAccess', 1),
(1, 'payables', 1),
(1, 'paymentManagement', 1),
(1, 'receivables', 1),
(1, 'settings', 1),
(5, 'cashBank', 1),
(5, 'chartAccounts', 1),
(5, 'dashboard', 1),
(5, 'expenses', 1),
(5, 'financialReports', 1),
(5, 'financialTransactions', 1),
(5, 'pageAccess', 1),
(5, 'payables', 1),
(5, 'paymentManagement', 1),
(5, 'receivables', 1),
(5, 'settings', 1),
(6, 'cashBank', 1),
(6, 'chartAccounts', 1),
(6, 'dashboard', 1),
(6, 'expenses', 1),
(6, 'financialReports', 1),
(6, 'financialTransactions', 1),
(6, 'pageAccess', 1),
(6, 'payables', 1),
(6, 'paymentManagement', 1),
(6, 'receivables', 1),
(6, 'settings', 1),
(7, 'cashBank', 1),
(7, 'chartAccounts', 1),
(7, 'dashboard', 1),
(7, 'expenses', 1),
(7, 'financialReports', 1),
(7, 'financialTransactions', 1),
(7, 'pageAccess', 1),
(7, 'payables', 1),
(7, 'paymentManagement', 1),
(7, 'receivables', 1),
(7, 'settings', 1),
(11, '13thmonth', 1),
(11, 'attendance', 1),
(11, 'cashBank', 1),
(11, 'chartAccounts', 1),
(11, 'contribution', 1),
(11, 'dashboard', 1),
(11, 'deductions', 1),
(11, 'employees', 1),
(11, 'expenses', 1),
(11, 'financialReports', 1),
(11, 'financialTransactions', 1),
(11, 'leave', 1),
(11, 'pageAccess', 1),
(11, 'payables', 1),
(11, 'paymentManagement', 1),
(11, 'payroll', 1),
(11, 'receivables', 1),
(11, 'settings', 1),
(13, 'cashBank', 1),
(13, 'chartAccounts', 1),
(13, 'dashboard', 1),
(13, 'expenses', 1),
(13, 'financialReports', 1),
(13, 'financialTransactions', 1),
(13, 'pageAccess', 1),
(13, 'payables', 1),
(13, 'paymentManagement', 1),
(13, 'receivables', 1),
(13, 'settings', 1),
(14, '13thmonth', 1),
(14, 'attendance', 1),
(14, 'cashBank', 1),
(14, 'chartAccounts', 1),
(14, 'contribution', 1),
(14, 'dashboard', 1),
(14, 'deductions', 1),
(14, 'employees', 1),
(14, 'expenses', 1),
(14, 'financialReports', 1),
(14, 'financialTransactions', 1),
(14, 'leave', 1),
(14, 'pageAccess', 1),
(14, 'payables', 1),
(14, 'paymentManagement', 1),
(14, 'payroll', 1),
(14, 'receivables', 1),
(14, 'settings', 1),
(15, 'cashBank', 1),
(15, 'chartAccounts', 1),
(15, 'dashboard', 1),
(15, 'expenses', 1),
(15, 'financialReports', 1),
(15, 'financialTransactions', 1),
(15, 'pageAccess', 1),
(15, 'payables', 1),
(15, 'paymentManagement', 1),
(15, 'receivables', 1),
(15, 'settings', 1);

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
(1, 2, 'Supplier Payment', 72000.00, '2026-09-22', 'PAY-2026-001', 'Completed', 'Makati Properties lease'),
(2, 2, 'Customer Collection', 45000.00, '2026-10-15', 'COL-2026-014', 'Completed', 'Northstar Digital'),
(3, 1, 'Expense Payment', 4500.00, '2026-10-03', 'EXP-2026-005', 'Completed', 'Office supplies'),
(4, 2, 'Payroll Payment', 85000.00, '2026-09-30', 'PR-2026-009', 'Completed', 'September payroll release');

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
(105, 5, 'October 1–15, 2026', 0.00, 0.00, 0.00, 7800.00, 55000.00, 47200.00, 'Processed', '2026-10-06 00:28:42'),
(106, 3, 'October 1–15, 2026', 0.00, 0.00, 0.00, 9428.00, 48000.00, 38572.00, 'Processed', '2026-10-06 00:28:42'),
(107, 1, 'October 1–15, 2026', 0.00, 0.00, 0.00, 12400.00, 85000.00, 72600.00, 'Processed', '2026-10-06 00:28:42'),
(108, 5, 'September 15–30, 2026', 0.00, 0.00, 0.00, 7800.00, 55200.00, 47400.00, 'Processed', '2026-10-06 00:28:42'),
(109, 4, 'September 15–30, 2026', 0.00, 0.00, 0.00, 5100.00, 38000.00, 32900.00, 'On Hold', '2026-10-06 00:28:42'),
(110, 3, 'September 15–30, 2026', 0.00, 0.00, 0.00, 6700.00, 45600.00, 38900.00, 'Processed', '2026-10-06 00:28:42'),
(111, 1, 'September 15–30, 2026', 0.00, 0.00, 0.00, 16946.00, 85500.00, 68554.00, 'Processed', '2026-10-06 00:28:42');

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
-- Table structure for table `settings`
--

CREATE TABLE `settings` (
  `id` int(11) NOT NULL,
  `company` varchar(150) DEFAULT 'D.E.V.S Management Inc.',
  `currency` varchar(20) DEFAULT 'PHP (₱)',
  `cycle` varchar(60) DEFAULT 'October 1–15, 2026',
  `days` varchar(40) DEFAULT '5 days (Mon–Fri)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `settings`
--

INSERT INTO `settings` (`id`, `company`, `currency`, `cycle`, `days`) VALUES
(1, 'D.E.V.S Management Inc.', 'PHP (₱)', 'October 1–15, 2026', '5 days (Mon–Fri)');

-- --------------------------------------------------------

--
-- Table structure for table `suppliers`
--

CREATE TABLE `suppliers` (
  `supplier_id` int(11) NOT NULL,
  `supplier_name` varchar(100) NOT NULL,
  `contact_info` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `suppliers`
--

INSERT INTO `suppliers` (`supplier_id`, `supplier_name`, `contact_info`, `address`) VALUES
(1, 'Makati Properties', 'lease@makati.example', 'Makati CBD'),
(2, 'Cloud Services PH', 'billing@cloudph.example', 'Taguig'),
(3, 'Metro Utilities', 'billing@metro.example', 'Manila');

-- --------------------------------------------------------

--
-- Table structure for table `thirteenth_month_pay`
--

CREATE TABLE `thirteenth_month_pay` (
  `thirteenth_id` int(11) NOT NULL,
  `payroll_id` int(11) NOT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `payment_date` date DEFAULT NULL,
  `status` varchar(20) DEFAULT 'Pending'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
  ADD UNIQUE KEY `unique_email` (`email`),
  ADD KEY `idx_accounts_employee` (`employee_id`);

--
-- Indexes for table `accounts_payable`
--
ALTER TABLE `accounts_payable`
  ADD PRIMARY KEY (`ap_id`),
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
  ADD UNIQUE KEY `unique_account_code` (`account_code`),
  ADD KEY `idx_charts_parent` (`parent_account_id`);

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
-- Indexes for table `page_access`
--
ALTER TABLE `page_access`
  ADD PRIMARY KEY (`user_id`,`page_key`);

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
-- Indexes for table `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `suppliers`
--
ALTER TABLE `suppliers`
  ADD PRIMARY KEY (`supplier_id`);

--
-- Indexes for table `thirteenth_month_pay`
--
ALTER TABLE `thirteenth_month_pay`
  ADD PRIMARY KEY (`thirteenth_id`),
  ADD KEY `idx_thirteenth_payroll` (`payroll_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `accounts`
--
ALTER TABLE `accounts`
  MODIFY `account_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `accounts_payable`
--
ALTER TABLE `accounts_payable`
  MODIFY `ap_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `accounts_receivable`
--
ALTER TABLE `accounts_receivable`
  MODIFY `ar_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `attendance`
--
ALTER TABLE `attendance`
  MODIFY `attendance_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=215;

--
-- AUTO_INCREMENT for table `audit_trail`
--
ALTER TABLE `audit_trail`
  MODIFY `log_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=85;

--
-- AUTO_INCREMENT for table `cash_bank`
--
ALTER TABLE `cash_bank`
  MODIFY `account_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `charts_of_accounts`
--
ALTER TABLE `charts_of_accounts`
  MODIFY `account_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `customers`
--
ALTER TABLE `customers`
  MODIFY `customer_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `departments`
--
ALTER TABLE `departments`
  MODIFY `department_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `employees`
--
ALTER TABLE `employees`
  MODIFY `employee_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `expenses`
--
ALTER TABLE `expenses`
  MODIFY `expense_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `financial_reports`
--
ALTER TABLE `financial_reports`
  MODIFY `report_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `financial_transactions`
--
ALTER TABLE `financial_transactions`
  MODIFY `transaction_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `forgot_password`
--
ALTER TABLE `forgot_password`
  MODIFY `reset_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `government_contributions`
--
ALTER TABLE `government_contributions`
  MODIFY `contribution_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `leave_requests`
--
ALTER TABLE `leave_requests`
  MODIFY `leave_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=82;

--
-- AUTO_INCREMENT for table `payment_transactions`
--
ALTER TABLE `payment_transactions`
  MODIFY `transaction_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `payroll`
--
ALTER TABLE `payroll`
  MODIFY `payroll_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=112;

--
-- AUTO_INCREMENT for table `payroll_deductions`
--
ALTER TABLE `payroll_deductions`
  MODIFY `deduction_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `payroll_history`
--
ALTER TABLE `payroll_history`
  MODIFY `history_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `payroll_payment`
--
ALTER TABLE `payroll_payment`
  MODIFY `payment_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `settings`
--
ALTER TABLE `settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `suppliers`
--
ALTER TABLE `suppliers`
  MODIFY `supplier_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `thirteenth_month_pay`
--
ALTER TABLE `thirteenth_month_pay`
  MODIFY `thirteenth_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `accounts`
--
ALTER TABLE `accounts`
  ADD CONSTRAINT `fk_accounts_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON UPDATE CASCADE;

--
-- Constraints for table `employees`
--
ALTER TABLE `employees`
  ADD CONSTRAINT `fk_employees_department` FOREIGN KEY (`department`) REFERENCES `departments` (`department_id`) ON DELETE SET NULL ON UPDATE CASCADE;

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
-- Constraints for table `page_access`
--
ALTER TABLE `page_access`
  ADD CONSTRAINT `fk_page_access_user` FOREIGN KEY (`user_id`) REFERENCES `accounts` (`account_id`) ON DELETE CASCADE ON UPDATE CASCADE;

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
  ADD CONSTRAINT `fk_payroll_payment_payroll` FOREIGN KEY (`payroll_id`) REFERENCES `payroll` (`payroll_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `thirteenth_month_pay`
--
ALTER TABLE `thirteenth_month_pay`
  ADD CONSTRAINT `fk_thirteenth_payroll` FOREIGN KEY (`payroll_id`) REFERENCES `payroll` (`payroll_id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
