<?php
/** Shared guard for recorded, unresolved Procurement invoice discrepancies. */
declare(strict_types=1);

function invoiceDiscrepancyHasOpen(mysqli $db, int $invoiceId): bool {
    // Intentionally fail closed when the migration is missing; never silently post invoices.
    $stmt = $db->prepare("SELECT id FROM procurement_invoice_discrepancies
                          WHERE invoice_id=? AND status='open' LIMIT 1");
    $stmt->bind_param('i', $invoiceId);
    $stmt->execute();
    $exists = (bool) $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return $exists;
}
function invoiceDiscrepancyAssertClear(mysqli $db, int $invoiceId): void {
    if (invoiceDiscrepancyHasOpen($db, $invoiceId)) {
        throw new DomainException('Invoice is ON HOLD due to an unresolved Inventory/Procurement discrepancy. Resolve and reverify before Finance handoff.');
    }
}
