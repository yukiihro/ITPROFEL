<?php
/**
 * UniProcur v10 -- read-only verified Inventory receipt autofill for Buyer invoice discrepancy.
 * Only Procurement's previously authenticated/synced Inventory receipts are trusted.
 * Never reads Gmail, never alters stock, invoice, Finance, or receipt records.
 */
declare(strict_types=1);
require_once __DIR__ . '/buyer-po-common.php';
require_once __DIR__ . '/finance-invoice-handoff-common.php';
header('X-Content-Type-Options: nosniff');

try {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
        buyerPoJson(405, ['success' => false, 'message' => 'GET only.']);
    }
    $number = $_GET['invoice_number'] ?? '';
    if (!is_string($number) || !preg_match('/\A[A-Za-z0-9][A-Za-z0-9._-]{0,63}\z/D', $number)) {
        buyerPoJson(422, ['success' => false, 'message' => 'Valid invoice number required.']);
    }
    $buyer = buyerPoIdentity($conn);
    $inv = fihInvoice($conn, $number, (int)$buyer['id']);
    if (!$inv) buyerPoJson(404, ['success' => false, 'message' => 'Invoice not found for this Buyer.']);
    $poId = (int)$inv['po_id'];
    $response = [
        'success' => true,
        'invoice_number' => $number,
        'po_number' => (string)$inv['po_number'],
        'can_prefill' => false,
        'source' => 'Procurement-verified Inventory receipt snapshot',
        'message' => 'No verified Inventory receipt has been linked to this invoice yet.'
    ];

    $tables = $conn->query("SELECT COUNT(*) AS n FROM information_schema.TABLES
        WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN
        ('procurement_inventory_receipts','procurement_inventory_receipt_items')");
    if ((int)($tables->fetch_assoc()['n'] ?? 0) !== 2) {
        $response['message'] = 'Verified Inventory receipt tables are missing. Apply Inventory integration migration first.';
        buyerPoJson(200, $response);
    }

    $s = $conn->prepare('SELECT id,receipt_number,receipt_date FROM procurement_inventory_receipts WHERE po_id=? ORDER BY id DESC');
    $s->bind_param('i', $poId); $s->execute();
    $receipts = $s->get_result()->fetch_all(MYSQLI_ASSOC); $s->close();
    if (count($receipts) !== 1) {
        if (count($receipts) > 1) {
            $response['message'] = 'Multiple verified receipts exist for this PO; automatic allocation needs manual reconciliation.';
        }
        buyerPoJson(200, $response);
    }
    $receipt = $receipts[0];
    $s = $conn->prepare('SELECT pi.id AS po_item_id, pi.item_name, pi.unit, pi.qty_ordered,
            ri.delivered_qty, ri.accepted_qty, ri.rejected_qty
        FROM po_items pi
        LEFT JOIN procurement_inventory_receipt_items ri ON ri.po_item_id=pi.id AND ri.receipt_id=?
        WHERE pi.po_id=? ORDER BY pi.id');
    $rid = (int)$receipt['id'];
    $s->bind_param('ii', $rid, $poId); $s->execute();
    $lines = $s->get_result()->fetch_all(MYSQLI_ASSOC); $s->close();
    if (!$lines) {
        $response['message'] = 'This purchase order has no item lines.';
        buyerPoJson(200, $response);
    }
    $hasRejected = false;
    $allCompatible = true;
    $map = [];
    foreach ($lines as $line) {
        if ($line['delivered_qty'] === null || $line['accepted_qty'] === null || $line['rejected_qty'] === null) {
            $allCompatible = false; break;
        }
        $d = (float)$line['delivered_qty'];
        $a = (float)$line['accepted_qty'];
        $r = (float)$line['rejected_qty'];
        $ordered = (float)$line['qty_ordered'];
        // v7's email evidence saver currently requires a complete delivery,
        // delivered = accepted + rejected, and a nonzero accepted quantity for invoice draft.
        if (!is_finite($d) || !is_finite($a) || !is_finite($r) ||
            $d <= 0 || $a <= 0 || $r < 0 ||
            abs($d - $ordered) > 0.001 || abs($d - $a - $r) > 0.001) {
            $allCompatible = false; break;
        }
        $hasRejected = $hasRejected || $r > 0.001;
        $map[] = [
            'po_item_id' => (int)$line['po_item_id'],
            'item_name' => (string)$line['item_name'],
            'unit' => (string)$line['unit'],
            'ordered_qty' => $ordered,
            'delivered_qty' => $d,
            'accepted_qty' => $a,
            'rejected_qty' => $r
        ];
    }
    if (!$allCompatible || !$hasRejected) {
        $response['message'] = !$allCompatible
            ? 'Verified Inventory receipt found, but this v7 workflow only supports complete deliveries with accepted units on every line. Reconcile this PO before saving.'
            : 'Verified Inventory receipt has no rejected units to report.';
        buyerPoJson(200, $response);
    }
    $date = substr((string)$receipt['receipt_date'], 0, 10);
    if (!preg_match('/\A\d{4}-\d{2}-\d{2}\z/D', $date) ||
        !checkdate((int)substr($date,5,2),(int)substr($date,8,2),(int)substr($date,0,4))) {
        $response['message'] = 'Verified Inventory receipt date is invalid.';
        buyerPoJson(200, $response);
    }
    $reference = (string)$receipt['receipt_number'];
    if (!preg_match('/\ADR-[A-Za-z0-9-]{1,76}\z/D', $reference)) {
        $response['message'] = 'Verified Inventory Delivery Receipt reference is invalid.';
        buyerPoJson(200, $response);
    }
    $response['can_prefill'] = true;
    $response['message'] = 'Verified Inventory DR matched to this invoice. Review the corresponding email for the inspection reason.';
    $response['receipt'] = ['reference' => $reference, 'received_date' => $date, 'items' => $map];
    buyerPoJson(200, $response);
} catch (Throwable $error) {
    error_log('Buyer Inventory GR autofill v10: '.$error->getMessage());
    buyerPoJson(500, ['success' => false, 'message' => 'Could not load verified Inventory receipt. Check PHP/MySQL logs.']);
}
