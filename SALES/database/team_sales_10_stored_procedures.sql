-- ============================================================
-- TEAM_SALES: 10 essential stored procedures
-- Target: MariaDB 10.4.32
-- Based on the uploaded team_sales schema.
-- Run after creating the required views.
-- ============================================================

USE `team_sales`;

DROP PROCEDURE IF EXISTS `sp_get_customer_order_history`;
DROP PROCEDURE IF EXISTS `sp_get_customer_quotations`;
DROP PROCEDURE IF EXISTS `sp_get_invoice_collection_history`;
DROP PROCEDURE IF EXISTS `sp_get_overdue_receivables`;
DROP PROCEDURE IF EXISTS `sp_get_inventory_reorder_list`;
DROP PROCEDURE IF EXISTS `sp_create_order_from_approved_quotation`;
DROP PROCEDURE IF EXISTS `sp_record_invoice_collection`;
DROP PROCEDURE IF EXISTS `sp_update_sales_order_status`;
DROP PROCEDURE IF EXISTS `sp_update_delivery_status`;
DROP PROCEDURE IF EXISTS `sp_review_sales_return`;

DELIMITER //

-- 1. Retrieve all orders belonging to a selected customer.
CREATE PROCEDURE `sp_get_customer_order_history`(IN p_customer_id INT UNSIGNED)
BEGIN
    SELECT *
    FROM vw_sales_order_details
    WHERE customer_id = p_customer_id
    ORDER BY order_date DESC, so_id DESC;
END//

-- 2. Retrieve quotations belonging to a selected customer.
CREATE PROCEDURE `sp_get_customer_quotations`(IN p_customer_id INT UNSIGNED)
BEGIN
    SELECT *
    FROM vw_quotation_details
    WHERE customer_id = p_customer_id
    ORDER BY quotation_date DESC, sq_id DESC;
END//

-- 3. Retrieve an invoice together with its collection/payment records.
CREATE PROCEDURE `sp_get_invoice_collection_history`(IN p_invoice_id INT UNSIGNED)
BEGIN
    SELECT *
    FROM vw_invoice_details
    WHERE inv_id = p_invoice_id;

    SELECT
        col_id,
        collection_no,
        invoice_id,
        collection_date,
        amount,
        method,
        created_at
    FROM vw_collection_details
    WHERE invoice_id = p_invoice_id
    ORDER BY collection_date DESC, col_id DESC;
END//

-- 4. List receivables whose due date has passed and which are not paid.
CREATE PROCEDURE `sp_get_overdue_receivables`()
BEGIN
    SELECT *
    FROM vw_accounts_receivable_details
    WHERE receivable_status <> 'Paid'
      AND due_date < CURDATE()
    ORDER BY due_date ASC, customer_name ASC;
END//

-- 5. List inventory items at or below their reorder level.
CREATE PROCEDURE `sp_get_inventory_reorder_list`()
BEGIN
    SELECT *
    FROM vw_inventory_reorder_status
    WHERE product_status = 'Active'
      AND stock_quantity <= reorder_level
    ORDER BY stock_quantity ASC, product_name ASC;
END//

-- 6. Create a sales order only from a fully approved quotation.
-- The procedure prevents creating a second order from the same quotation.
CREATE PROCEDURE `sp_create_order_from_approved_quotation`(
    IN p_quotation_id INT UNSIGNED,
    IN p_order_no VARCHAR(30),
    IN p_order_date DATE
)
BEGIN
    DECLARE v_customer_id INT UNSIGNED DEFAULT NULL;
    DECLARE v_product_code VARCHAR(40) DEFAULT NULL;
    DECLARE v_size VARCHAR(30) DEFAULT NULL;
    DECLARE v_quantity INT UNSIGNED DEFAULT NULL;
    DECLARE v_total_amount DECIMAL(12,2) DEFAULT NULL;
    DECLARE v_payment_method VARCHAR(30) DEFAULT NULL;
    DECLARE v_quotation_count INT DEFAULT 0;
    DECLARE v_existing_order_count INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_order_no IS NULL OR TRIM(p_order_no) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Order number is required.';
    END IF;

    IF p_order_date IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Order date is required.';
    END IF;

    START TRANSACTION;

    SELECT COUNT(*) INTO v_quotation_count
    FROM sales_quotations
    WHERE sq_id = p_quotation_id;

    IF v_quotation_count = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Quotation was not found.';
    END IF;

    SELECT COUNT(*) INTO v_existing_order_count
    FROM sales_orders
    WHERE quotation_id = p_quotation_id;

    IF v_existing_order_count > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'An order already exists for this quotation.';
    END IF;

    SELECT
        customer_id,
        product_code,
        size,
        quantity,
        total_amount + shipping_fee,
        payment_method
    INTO
        v_customer_id,
        v_product_code,
        v_size,
        v_quantity,
        v_total_amount,
        v_payment_method
    FROM sales_quotations
    WHERE sq_id = p_quotation_id
      AND status = 'Approved'
      AND admin_status = 'Approved'
      AND customer_status = 'Approved'
      AND inventory_status = 'Approved'
    FOR UPDATE;

    IF v_customer_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Quotation must be approved by the customer, admin, and inventory before conversion.';
    END IF;

    INSERT INTO sales_orders (
        order_no,
        quotation_id,
        customer_id,
        order_date,
        product_code,
        size,
        quantity,
        total_amount,
        status,
        admin_status,
        payment_method,
        payment_status
    ) VALUES (
        p_order_no,
        p_quotation_id,
        v_customer_id,
        p_order_date,
        v_product_code,
        v_size,
        v_quantity,
        v_total_amount,
        'Pending',
        'Pending',
        v_payment_method,
        'Pending'
    );

    COMMIT;

    SELECT *
    FROM sales_orders
    WHERE so_id = LAST_INSERT_ID();
END//

-- 7. Record a collection against an invoice and refresh related balances.
-- Prevents zero/negative payments, payments against returned invoices,
-- and payments that exceed the remaining invoice balance.
CREATE PROCEDURE `sp_record_invoice_collection`(
    IN p_invoice_id INT UNSIGNED,
    IN p_collection_no VARCHAR(30),
    IN p_collection_date DATE,
    IN p_amount DECIMAL(12,2),
    IN p_method VARCHAR(30)
)
BEGIN
    DECLARE v_customer_id INT UNSIGNED DEFAULT NULL;
    DECLARE v_total_amount DECIMAL(12,2) DEFAULT 0.00;
    DECLARE v_amount_paid DECIMAL(12,2) DEFAULT 0.00;
    DECLARE v_invoice_status VARCHAR(30) DEFAULT NULL;
    DECLARE v_new_paid DECIMAL(12,2) DEFAULT 0.00;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_collection_no IS NULL OR TRIM(p_collection_no) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Collection number is required.';
    END IF;
    IF p_collection_date IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Collection date is required.';
    END IF;
    IF p_amount IS NULL OR p_amount <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Collection amount must be greater than zero.';
    END IF;
    IF p_method IS NULL OR p_method NOT IN ('Cash', 'GCash', 'Bank Transfer', 'Debit', 'Credit', 'Debit/Credit Card') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid collection payment method.';
    END IF;

    START TRANSACTION;

    SELECT
        so.customer_id,
        si.total_amount,
        si.amount_paid,
        si.status
    INTO
        v_customer_id,
        v_total_amount,
        v_amount_paid,
        v_invoice_status
    FROM sales_invoices si
    INNER JOIN sales_orders so ON so.so_id = si.order_id
    WHERE si.inv_id = p_invoice_id
    FOR UPDATE;

    IF v_customer_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invoice was not found.';
    END IF;
    IF v_invoice_status = 'Returned' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot collect payment for a returned invoice.';
    END IF;

    SET v_new_paid = v_amount_paid + p_amount;
    IF v_new_paid > v_total_amount THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Collection exceeds the remaining invoice balance.';
    END IF;

    INSERT INTO collections (
        collection_no,
        invoice_id,
        collection_date,
        amount,
        method
    ) VALUES (
        p_collection_no,
        p_invoice_id,
        p_collection_date,
        p_amount,
        p_method
    );

    UPDATE sales_invoices
    SET amount_paid = v_new_paid,
        status = CASE
            WHEN v_new_paid >= v_total_amount THEN 'Paid'
            WHEN v_new_paid > 0 THEN 'Partially Paid'
            ELSE 'Unpaid'
        END
    WHERE inv_id = p_invoice_id;

    UPDATE account_receivable
    SET amount_due = GREATEST(v_total_amount - v_new_paid, 0.00),
        status = CASE
            WHEN v_new_paid >= v_total_amount THEN 'Paid'
            WHEN due_date < CURDATE() THEN 'Overdue'
            ELSE 'Current'
        END
    WHERE invoice_id = p_invoice_id;

    INSERT INTO customer_balance (
        customer_id,
        total_billed,
        total_paid,
        outstanding_balance
    )
    SELECT
        v_customer_id,
        COALESCE(SUM(total_amount), 0.00),
        COALESCE(SUM(amount_paid), 0.00),
        COALESCE(SUM(total_amount - amount_paid), 0.00)
    FROM sales_invoices si
    INNER JOIN sales_orders so ON so.so_id = si.order_id
    WHERE so.customer_id = v_customer_id
      AND si.status <> 'Returned'
    ON DUPLICATE KEY UPDATE
        total_billed = VALUES(total_billed),
        total_paid = VALUES(total_paid),
        outstanding_balance = VALUES(outstanding_balance);

    COMMIT;

    SELECT *
    FROM sales_invoices
    WHERE inv_id = p_invoice_id;
END//

-- 8. Update a sales order's operational status.
CREATE PROCEDURE `sp_update_sales_order_status`(
    IN p_order_id INT UNSIGNED,
    IN p_new_status VARCHAR(20)
)
BEGIN
    DECLARE v_order_count INT DEFAULT 0;

    IF p_new_status IS NULL OR p_new_status NOT IN ('Pending', 'Processing', 'Invoiced', 'Completed', 'Cancelled', 'Returned') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid sales order status.';
    END IF;

    SELECT COUNT(*) INTO v_order_count
    FROM sales_orders
    WHERE so_id = p_order_id;

    IF v_order_count = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Order was not found.';
    END IF;

    UPDATE sales_orders
    SET status = p_new_status
    WHERE so_id = p_order_id;

    SELECT * FROM sales_orders WHERE so_id = p_order_id;
END//

-- 9. Update a delivery's tracking status.
-- This intentionally does not change inventory quantities or the
-- inventory_deducted flag; inventory deduction should remain in the
-- existing inventory integration workflow.
CREATE PROCEDURE `sp_update_delivery_status`(
    IN p_delivery_id INT UNSIGNED,
    IN p_new_status VARCHAR(20)
)
BEGIN
    DECLARE v_delivery_count INT DEFAULT 0;

    IF p_new_status IS NULL OR p_new_status NOT IN ('Preparing', 'In Transit', 'Delivered') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid delivery status.';
    END IF;

    SELECT COUNT(*) INTO v_delivery_count
    FROM deliveries
    WHERE del_id = p_delivery_id;

    IF v_delivery_count = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Delivery was not found.';
    END IF;

    UPDATE deliveries
    SET status = p_new_status
    WHERE del_id = p_delivery_id;

    SELECT * FROM deliveries WHERE del_id = p_delivery_id;
END//

-- 10. Approve or reject a sales return during admin review.
CREATE PROCEDURE `sp_review_sales_return`(
    IN p_return_id INT UNSIGNED,
    IN p_decision VARCHAR(20)
)
BEGIN
    IF p_decision NOT IN ('Approved', 'Rejected') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Decision must be Approved or Rejected.';
    END IF;

    UPDATE sales_returns
    SET status = p_decision,
        admin_status = p_decision
    WHERE ret_id = p_return_id
      AND admin_status = 'Pending';

    IF ROW_COUNT() = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Return was not found or has already been reviewed.';
    END IF;

    SELECT * FROM sales_returns WHERE ret_id = p_return_id;
END//

DELIMITER ;

-- ------------------------------------------------------------
