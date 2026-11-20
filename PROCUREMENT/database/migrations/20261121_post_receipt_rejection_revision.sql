-- Run once on the Procurement MySQL database, not Inventory's database.
-- Records immutable before/after evidence of authenticated, post-DR inspection updates.
-- The current verified GR rows remain the effective receipt quantities consumed by
-- the Procurement Order Tracking and Invoice modules.
CREATE TABLE IF NOT EXISTS procurement_inventory_receipt_revisions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    receipt_id INT NOT NULL,
    report_number VARCHAR(96) NOT NULL,
    previous_snapshot_hash CHAR(64) NOT NULL,
    new_snapshot_hash CHAR(64) NOT NULL,
    before_snapshot_json LONGTEXT NOT NULL,
    after_snapshot_json LONGTEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_receipt_revision (receipt_id, created_at),
    INDEX idx_rejection_report (report_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
