-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Schema-only copy with three local test accounts
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
-- Schema-only database: `team_sales`
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
  `method` enum('Cash','GCash','Bank Transfer','Debit','Credit','Debit/Credit Card') NOT NULL DEFAULT 'Cash',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--

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
-- Seed data for table `customers` (minimal linked account only)
--
INSERT INTO `customers` (`cus_id`, `customer_code`, `customer_name`, `phone`, `email`, `address`, `city`, `province`, `payment_terms`, `status`) VALUES
(1, 'CUS-001', 'Customer User', NULL, NULL, NULL, NULL, NULL, '30 Days', 'Active');

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
  `method` enum('Debit','Credit','GCash') NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `status` enum('Pending','Simulated Paid','Simulated Failed') NOT NULL,
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
  `payment_method` enum('GCash','Bank Transfer','Debit','Credit','Debit/Credit Card') NOT NULL DEFAULT 'GCash',
  `payment_status` enum('Pending','Partially Paid','Paid','Failed') NOT NULL DEFAULT 'Pending',
  `payment_reference` varchar(100) DEFAULT NULL,
  `receipt_no` varchar(30) DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--

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
  `payment_method` enum('GCash','Bank Transfer','Debit','Credit','Debit/Credit Card') NOT NULL DEFAULT 'GCash',
  `payment_status` enum('Pending','Partially Paid','Paid','Failed') NOT NULL DEFAULT 'Pending',
  `payment_reference` varchar(100) DEFAULT NULL,
  `receipt_no` varchar(30) DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--

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
-- Seed data for table `users` (local testing accounts; change these passwords before deployment)
-- Default password for all three accounts: 123456
INSERT INTO `users` (`user_id`, `full_name`, `username`, `password`, `role`, `customer_id`, `status`, `account_status`) VALUES
(1, 'Sales Admin', 'salesadmin', '$2y$10$sgWGh/XqWVuFCwBLVqZK5uK9DQdz34FxNknLOBncPOpfAa3EvCmCW', 'Sales Admin', NULL, 'Active', 'Approved'),
(2, 'Sales Staff', 'salesstaff', '$2y$10$sgWGh/XqWVuFCwBLVqZK5uK9DQdz34FxNknLOBncPOpfAa3EvCmCW', 'Sales Staff', NULL, 'Active', 'Approved'),
(3, 'Customer User', 'customer', '$2y$10$sgWGh/XqWVuFCwBLVqZK5uK9DQdz34FxNknLOBncPOpfAa3EvCmCW', 'Customer', 1, 'Active', 'Approved');

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
  MODIFY `ar_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

--
-- AUTO_INCREMENT for table `activity_logs`
--
ALTER TABLE `activity_logs`
  MODIFY `log_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

--
-- AUTO_INCREMENT for table `collections`
--
ALTER TABLE `collections`
  MODIFY `col_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

--
-- AUTO_INCREMENT for table `customers`
--
ALTER TABLE `customers`
  MODIFY `cus_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

--
-- AUTO_INCREMENT for table `customer_balance`
--
ALTER TABLE `customer_balance`
  MODIFY `cb_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

--
-- AUTO_INCREMENT for table `customer_order_requests`
--
ALTER TABLE `customer_order_requests`
  MODIFY `req_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

--
-- AUTO_INCREMENT for table `deliveries`
--
ALTER TABLE `deliveries`
  MODIFY `del_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

--
-- AUTO_INCREMENT for table `demo_payment_attempts`
--
ALTER TABLE `demo_payment_attempts`
  MODIFY `demo_payment_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `inventory`
--
ALTER TABLE `inventory`
  MODIFY `inventory_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

--
-- AUTO_INCREMENT for table `inventory_delivery_approvals`
--
ALTER TABLE `inventory_delivery_approvals`
  MODIFY `approval_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

--
-- AUTO_INCREMENT for table `inventory_stockout_approvals`
--
ALTER TABLE `inventory_stockout_approvals`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

--
-- AUTO_INCREMENT for table `payment_gateway_transactions`
--
ALTER TABLE `payment_gateway_transactions`
  MODIFY `gateway_transaction_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `purchase_orders`
--
ALTER TABLE `purchase_orders`
  MODIFY `po_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

--
-- AUTO_INCREMENT for table `sales_invoices`
--
ALTER TABLE `sales_invoices`
  MODIFY `inv_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

--
-- AUTO_INCREMENT for table `sales_orders`
--
ALTER TABLE `sales_orders`
  MODIFY `so_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

--
-- AUTO_INCREMENT for table `sales_quotations`
--
ALTER TABLE `sales_quotations`
  MODIFY `sq_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

--
-- AUTO_INCREMENT for table `sales_returns`
--
ALTER TABLE `sales_returns`
  MODIFY `ret_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

--
-- AUTO_INCREMENT for table `sales_shipping_rates`
--
ALTER TABLE `sales_shipping_rates`
  MODIFY `rate_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

--
-- AUTO_INCREMENT for table `user_notifications`
--
ALTER TABLE `user_notifications`
  MODIFY `notification_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1;

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
