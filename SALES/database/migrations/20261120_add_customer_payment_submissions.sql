USE team_sales;

CREATE TABLE IF NOT EXISTS customer_payment_submissions (
    submission_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    invoice_id INT UNSIGNED NOT NULL,
    customer_id INT UNSIGNED NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    payment_method ENUM('GCash','Debit/Credit Card') NOT NULL,
    reference_no VARCHAR(100) NOT NULL,
    receipt_name VARCHAR(255) NOT NULL,
    receipt_path VARCHAR(100) NOT NULL,
    receipt_mime VARCHAR(50) NOT NULL,
    status ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
    review_note VARCHAR(500) DEFAULT NULL,
    reviewed_by INT UNSIGNED DEFAULT NULL,
    reviewed_at DATETIME DEFAULT NULL,
    collection_no VARCHAR(30) DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (submission_id),
    UNIQUE KEY uq_customer_payment_reference (payment_method, reference_no),
    UNIQUE KEY uq_customer_payment_collection (collection_no),
    KEY idx_customer_payment_invoice_status (invoice_id, status),
    KEY idx_customer_payment_customer (customer_id, submission_id),
    CONSTRAINT fk_customer_payment_invoice
        FOREIGN KEY (invoice_id) REFERENCES sales_invoices (inv_id),
    CONSTRAINT fk_customer_payment_customer
        FOREIGN KEY (customer_id) REFERENCES customers (cus_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
