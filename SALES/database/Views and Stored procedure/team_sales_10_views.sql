-- ============================================================
-- TEAM_SALES: 10 essential SQL views
-- Target: MariaDB 10.4.32
-- Based on the uploaded team_sales schema.
-- ============================================================

USE `team_sales`;

DROP VIEW IF EXISTS `vw_customer_directory`;
CREATE VIEW `vw_customer_directory` AS
SELECT
    c.cus_id,
    c.customer_code,
    c.customer_name,
    c.phone,
    c.email,
    c.address,
    c.city,
    c.province,
    c.payment_terms,
    c.status AS customer_status,
    COALESCE(cb.total_billed, 0.00) AS total_billed,
    COALESCE(cb.total_paid, 0.00) AS total_paid,
    COALESCE(cb.outstanding_balance, 0.00) AS outstanding_balance,
    c.created_at,
    c.updated_at
FROM customers c
LEFT JOIN customer_balance cb ON cb.customer_id = c.cus_id;

DROP VIEW IF EXISTS `vw_sales_order_details`;
CREATE VIEW `vw_sales_order_details` AS
SELECT
    so.so_id,
    so.order_no,
    so.order_date,
    so.customer_id,
    c.customer_code,
    c.customer_name,
    so.quotation_id,
    sq.quotation_no,
    so.product_code,
    so.size,
    so.quantity,
    so.total_amount,
    so.status AS order_status,
    so.admin_status,
    so.payment_method,
    so.payment_status,
    so.payment_reference,
    so.receipt_no,
    so.paid_at,
    so.created_at
FROM sales_orders so
INNER JOIN customers c ON c.cus_id = so.customer_id
LEFT JOIN sales_quotations sq ON sq.sq_id = so.quotation_id;

DROP VIEW IF EXISTS `vw_quotation_details`;
CREATE VIEW `vw_quotation_details` AS
SELECT
    sq.sq_id,
    sq.quotation_no,
    sq.customer_id,
    c.customer_code,
    c.customer_name,
    sq.source_request_id,
    cor.request_no,
    cor.status AS request_status,
    sq.quotation_date,
    sq.valid_until,
    sq.product_code,
    sq.size,
    sq.quantity,
    sq.inventory_quantity,
    sq.inventory_status,
    sq.customer_status,
    sq.total_amount,
    sq.shipping_fee,
    sq.status AS quotation_status,
    sq.admin_status,
    sq.payment_method,
    sq.payment_status,
    sq.created_at
FROM sales_quotations sq
INNER JOIN customers c ON c.cus_id = sq.customer_id
LEFT JOIN customer_order_requests cor ON cor.req_id = sq.source_request_id;

DROP VIEW IF EXISTS `vw_invoice_details`;
CREATE VIEW `vw_invoice_details` AS
SELECT
    si.inv_id,
    si.invoice_no,
    si.order_id,
    so.order_no,
    so.customer_id,
    c.customer_code,
    c.customer_name,
    si.invoice_date,
    si.total_amount,
    si.amount_paid,
    (si.total_amount - si.amount_paid) AS balance_due,
    si.status AS invoice_status,
    COALESCE(collected.total_collected, 0.00) AS total_collected_from_collections,
    si.created_at
FROM sales_invoices si
INNER JOIN sales_orders so ON so.so_id = si.order_id
INNER JOIN customers c ON c.cus_id = so.customer_id
LEFT JOIN (
    SELECT invoice_id, SUM(amount) AS total_collected
    FROM collections
    GROUP BY invoice_id
) collected ON collected.invoice_id = si.inv_id;

DROP VIEW IF EXISTS `vw_accounts_receivable_details`;
CREATE VIEW `vw_accounts_receivable_details` AS
SELECT
    ar.ar_id,
    ar.invoice_id,
    si.invoice_no,
    si.invoice_date,
    ar.customer_id,
    c.customer_code,
    c.customer_name,
    ar.amount_due,
    ar.due_date,
    ar.status AS receivable_status,
    CASE
        WHEN ar.status = 'Paid' THEN 0
        WHEN ar.due_date < CURDATE() THEN DATEDIFF(CURDATE(), ar.due_date)
        ELSE 0
    END AS days_overdue,
    ar.created_at
FROM account_receivable ar
INNER JOIN sales_invoices si ON si.inv_id = ar.invoice_id
INNER JOIN customers c ON c.cus_id = ar.customer_id;

DROP VIEW IF EXISTS `vw_collection_details`;
CREATE VIEW `vw_collection_details` AS
SELECT
    col.col_id,
    col.collection_no,
    col.invoice_id,
    si.invoice_no,
    si.order_id,
    so.order_no,
    so.customer_id,
    c.customer_code,
    c.customer_name,
    col.collection_date,
    col.due_date,
    col.amount,
    col.method,
    col.created_at
FROM collections col
INNER JOIN sales_invoices si ON si.inv_id = col.invoice_id
INNER JOIN sales_orders so ON so.so_id = si.order_id
INNER JOIN customers c ON c.cus_id = so.customer_id;

DROP VIEW IF EXISTS `vw_delivery_tracking`;
CREATE VIEW `vw_delivery_tracking` AS
SELECT
    d.del_id,
    d.delivery_no,
    d.order_id,
    so.order_no,
    so.customer_id,
    c.customer_code,
    c.customer_name,
    c.phone,
    c.address,
    c.city,
    c.province,
    d.delivery_date,
    d.status AS delivery_status,
    d.inventory_deducted,
    d.created_at
FROM deliveries d
INNER JOIN sales_orders so ON so.so_id = d.order_id
INNER JOIN customers c ON c.cus_id = so.customer_id;

DROP VIEW IF EXISTS `vw_sales_return_details`;
CREATE VIEW `vw_sales_return_details` AS
SELECT
    sr.ret_id,
    sr.return_no,
    sr.order_id,
    so.order_no,
    so.customer_id,
    c.customer_code,
    c.customer_name,
    so.product_code,
    so.size,
    sr.return_date,
    sr.reason,
    sr.return_quantity,
    sr.total_amount,
    sr.status AS return_status,
    sr.admin_status,
    sr.inventory_sync_status,
    sr.inventory_sync_error,
    sr.inventory_synced_at,
    sr.created_at
FROM sales_returns sr
INNER JOIN sales_orders so ON so.so_id = sr.order_id
INNER JOIN customers c ON c.cus_id = so.customer_id;

DROP VIEW IF EXISTS `vw_inventory_reorder_status`;
CREATE VIEW `vw_inventory_reorder_status` AS
SELECT
    i.inventory_id,
    i.product_code,
    i.product_name,
    i.brand,
    i.size,
    i.unit,
    i.stock_quantity,
    i.unit_price,
    i.reorder_level,
    CASE
        WHEN i.stock_quantity <= 0 THEN 'Out of Stock'
        WHEN i.stock_quantity <= i.reorder_level THEN 'Low Stock'
        ELSE 'Sufficient Stock'
    END AS stock_status,
    i.status AS product_status,
    i.last_updated
FROM inventory i;

DROP VIEW IF EXISTS `vw_monthly_sales_summary`;
CREATE VIEW `vw_monthly_sales_summary` AS
SELECT
    YEAR(si.invoice_date) AS sales_year,
    MONTH(si.invoice_date) AS sales_month,
    COUNT(si.inv_id) AS invoice_count,
    SUM(si.total_amount) AS total_invoiced,
    SUM(si.amount_paid) AS total_paid,
    SUM(si.total_amount - si.amount_paid) AS total_outstanding
FROM sales_invoices si
WHERE si.status <> 'Returned'
GROUP BY YEAR(si.invoice_date), MONTH(si.invoice_date);

-- ------------------------------------------------------------
