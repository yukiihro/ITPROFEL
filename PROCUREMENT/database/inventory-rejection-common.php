<?php
/** Shared, authenticated Inventory rejection reconciliation (HTTP callback and CLI). */
declare(strict_types=1);
require_once __DIR__ . '/uniprocur-inventory-receipt-core.php';

function rejectionRowsMatch(float $a, float $b): bool {
    return abs($a - $b) < 0.001;
}
function rejectionAuditReady(mysqli $db): bool {
    $r = $db->query("SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='procurement_inventory_receipt_revisions'");
    return (int)($r->fetch_assoc()['n'] ?? 0) === 1;
}
function reconcileRejection(mysqli $db, string $requestNumber, string $poNumber, int $reportId): array {
    if (!uniReceiptSchemaReady($db) || !rejectionAuditReady($db)) {
        throw new DomainException('Import PROCUREMENT/database/migrations/20261121_post_receipt_rejection_revision.sql into Procurement MySQL first.');
    }
    $requestResult = uniInventoryCall('requests', 'GET', [], ['request_number' => $requestNumber]);
    $request = null;
    foreach (($requestResult['data'] ?? []) as $candidate) {
        if (is_array($candidate) && ($candidate['request_number'] ?? '') === $requestNumber) {
            $request = $candidate;
            break;
        }
    }
    if (!$request || strcasecmp((string)($request['requester_team'] ?? ''), 'Inventory') !== 0 ||
        strcasecmp((string)($request['destination'] ?? ''), 'Procurement') !== 0 ||
        (string)($request['po_number'] ?? '') !== $poNumber) {
        throw new DomainException('The Inventory request is not linked to this Procurement PO.');
    }
    $drResult = uniInventoryCall('receipts', 'GET', [], ['request_number' => $requestNumber]);
    $dr = $drResult['data'] ?? null;
    if (!is_array($dr) || (string)($dr['request_number'] ?? '') !== $requestNumber ||
        (string)($dr['delivery_status'] ?? '') !== 'Delivered' ||
        !preg_match('/\ADR-[A-Za-z0-9-]{1,76}\z/', (string)($dr['dr_number'] ?? '')) ||
        empty($dr['items']) || !is_array($dr['items'])) {
        throw new DomainException('A verified and confirmed Inventory Delivery Receipt is required.');
    }
    $reportResponse = uniInventoryCall('rejections', 'GET', [], ['report_id' => $reportId]);
    $report = $reportResponse['data'] ?? null;
    if (!is_array($report) || (int)($report['id'] ?? 0) !== $reportId ||
        (string)($report['request_number'] ?? '') !== $requestNumber ||
        (string)($report['po_number'] ?? '') !== $poNumber ||
        (string)($report['dr_number'] ?? '') !== (string)$dr['dr_number'] ||
        !preg_match('/\ARR-[A-Za-z0-9-]{1,76}\z/', (string)($report['report_number'] ?? '')) ||
        empty($report['items']) || !is_array($report['items'])) {
        throw new DomainException('Authenticated Inventory rejection report does not match this PO and Delivery Receipt.');
    }

    // Validate the rejected lines from Inventory's separate persisted report.
    $rejectedByKey = [];
    foreach ($report['items'] as $line) {
        if (!is_array($line)) throw new DomainException('Invalid rejected-item report line.');
        $key = uniReceiptItemKey((string)($line['item_name'] ?? ''), (string)($line['unit'] ?? ''));
        $qty = (float)($line['rejected_quantity'] ?? -1);
        if (isset($rejectedByKey[$key]) || !is_finite($qty) || $qty <= 0 ||
            trim((string)($line['rejection_reason'] ?? '')) === '') {
            throw new DomainException('Duplicate, invalid, or unexplained rejection in Inventory.');
        }
        $rejectedByKey[$key] = $qty;
    }

    $db->begin_transaction();
    try {
        $q = $db->prepare('SELECT po.id,po.status FROM purchase_orders po JOIN rfqs r ON r.id=po.rfq_id JOIN inventory_request_pr_links l ON l.pr_id=r.pr_id WHERE po.po_number=? AND l.inventory_request_number=? LIMIT 1 FOR UPDATE');
        $q->bind_param('ss', $poNumber, $requestNumber);
        $q->execute();
        $po = $q->get_result()->fetch_assoc();
        $q->close();
        if (!$po || !in_array(strtolower((string)$po['status']), ['received', 'partial'], true)) {
            throw new DomainException('The linked PO must already have a verified Inventory receipt.');
        }
        $poId = (int)$po['id'];
        $q = $db->prepare('SELECT id,snapshot_hash FROM procurement_inventory_receipts WHERE po_id=? AND request_number=? AND receipt_number=? LIMIT 1 FOR UPDATE');
        $drNumber = (string)$dr['dr_number'];
        $q->bind_param('iss', $poId, $requestNumber, $drNumber);
        $q->execute();
        $receipt = $q->get_result()->fetch_assoc();
        $q->close();
        if (!$receipt) throw new DomainException('Original verified Goods Receipt not found. Reconcile the original DR first.');
        $receiptId = (int)$receipt['id'];
        $q = $db->prepare('SELECT id,item_name,unit,qty_ordered FROM po_items WHERE po_id=? ORDER BY id FOR UPDATE');
        $q->bind_param('i', $poId);
        $q->execute();
        $orders = $q->get_result()->fetch_all(MYSQLI_ASSOC);
        $q->close();
        $q = $db->prepare('SELECT po_item_id,delivered_qty,accepted_qty,rejected_qty FROM procurement_inventory_receipt_items WHERE receipt_id=? FOR UPDATE');
        $q->bind_param('i', $receiptId);
        $q->execute();
        $oldLines = $q->get_result()->fetch_all(MYSQLI_ASSOC);
        $q->close();
        if (!$orders || count($orders) !== count($oldLines) || count($orders) !== count($dr['items'])) {
            throw new DomainException('PO / Inventory DR item counts differ. Manual reconciliation required.');
        }
        $orderByKey = [];
        $oldById = [];
        foreach ($orders as $order) {
            $key = uniReceiptItemKey((string)$order['item_name'], (string)$order['unit']);
            if (isset($orderByKey[$key])) throw new DomainException('Duplicate PO item name and unit.');
            $orderByKey[$key] = $order;
        }
        foreach ($oldLines as $old) $oldById[(int)$old['po_item_id']] = $old;
        $newLines = [];
        $allFull = true;
        foreach ($dr['items'] as $line) {
            if (!is_array($line)) throw new DomainException('Invalid Inventory DR line.');
            $key = uniReceiptItemKey((string)($line['item_name'] ?? ''), (string)($line['unit'] ?? ''));
            if (!isset($orderByKey[$key])) throw new DomainException('Inventory item does not match the PO: ' . substr($key, 0, 100));
            $order = $orderByKey[$key];
            unset($orderByKey[$key]);
            $id = (int)$order['id'];
            $old = $oldById[$id] ?? null;
            if (!$old) throw new DomainException('Verified GR item mapping is incomplete.');
            $delivered = (float)($line['delivered_quantity'] ?? -1);
            $accepted = (float)($line['accepted_quantity'] ?? -1);
            $ordered = (float)$order['qty_ordered'];
            $rejected = $delivered - $accepted;
            if (!is_finite($delivered) || !is_finite($accepted) || $delivered < 0 || $accepted < 0 ||
                $accepted > $delivered + 0.001 || $delivered > $ordered + 0.001 ||
                !rejectionRowsMatch($delivered, (float)$old['delivered_qty'])) {
                throw new DomainException('Physical delivery changed after confirmation; this action is only for rejection adjustments.');
            }
            $reportedRejected = $rejectedByKey[$key] ?? 0.0;
            if (!rejectionRowsMatch($rejected, $reportedRejected)) {
                throw new DomainException('Inventory rejection report differs from current accepted/rejected quantities.');
            }
            unset($rejectedByKey[$key]);
            $allFull = $allFull && rejectionRowsMatch($accepted, $ordered);
            // Match the original core's canonical snapshot structure and ordering.
            $newLines[] = ['id' => $id, 'accepted' => $accepted, 'delivered' => $delivered, 'rejected' => max(0, $rejected)];
        }
        if ($orderByKey || $rejectedByKey) throw new DomainException('Unmatched rejection or PO items.');
        $jsonNew = json_encode($newLines, JSON_THROW_ON_ERROR);
        $newHash = hash('sha256', $jsonNew);
        $oldHash = (string)$receipt['snapshot_hash'];
        if (hash_equals($oldHash, $newHash)) {
            $db->commit();
            return ['po_number' => $poNumber, 'receipt_number' => $drNumber, 'status' => $po['status'], 'already_recorded' => true];
        }
        $jsonOld = json_encode($oldLines, JSON_THROW_ON_ERROR);
        $reportNumber = (string)$report['report_number'];
        $q = $db->prepare('INSERT INTO procurement_inventory_receipt_revisions (receipt_id,report_number,previous_snapshot_hash,new_snapshot_hash,before_snapshot_json,after_snapshot_json) VALUES (?,?,?,?,?,?)');
        $q->bind_param('isssss', $receiptId, $reportNumber, $oldHash, $newHash, $jsonOld, $jsonNew);
        $q->execute();
        $q->close();
        $q = $db->prepare('UPDATE procurement_inventory_receipt_items SET delivered_qty=?,accepted_qty=?,rejected_qty=? WHERE receipt_id=? AND po_item_id=?');
        $poLine = $db->prepare('UPDATE po_items SET qty_received=?,delivery_status=? WHERE po_id=? AND id=?');
        foreach ($newLines as $line) {
            $id = $line['id']; $delivered = $line['delivered']; $accepted = $line['accepted']; $rejected = $line['rejected'];
            $q->bind_param('dddii', $delivered, $accepted, $rejected, $receiptId, $id);
            $q->execute();
            $ordered = null;
            foreach ($orders as $order) { if ((int)$order['id'] === $id) { $ordered = (float)$order['qty_ordered']; break; } }
            $state = rejectionRowsMatch($accepted, (float)$ordered) ? 'complete' : ($accepted > 0 ? 'partial' : 'pending');
            $poLine->bind_param('dsii', $accepted, $state, $poId, $id);
            $poLine->execute();
        }
        $q->close(); $poLine->close();
        $q = $db->prepare('UPDATE procurement_inventory_receipts SET snapshot_hash=? WHERE id=?');
        $q->bind_param('si', $newHash, $receiptId); $q->execute(); $q->close();
        $newStatus = $allFull ? 'received' : 'partial';
        $q = $db->prepare('UPDATE purchase_orders SET status=? WHERE id=?');
        $q->bind_param('si', $newStatus, $poId); $q->execute(); $q->close();
        // Any local invoice not handed off to Finance must be reviewed again.
        // Existing Finance handoffs cannot be changed or recalled automatically.
        $db->query("UPDATE invoices i SET i.status='discrepancy' WHERE i.po_id=" . $poId . " AND i.status IN ('ready_to_post','pending_match') AND NOT EXISTS (SELECT 1 FROM procurement_finance_invoice_handoffs h WHERE h.invoice_id=i.id)");
        $db->query("UPDATE buyer_invoice_source_local src JOIN invoices i ON i.id=src.invoice_id SET src.match_status='unverified',src.match_summary='Inventory rejected items after DR; reverify accepted quantities before Finance.',src.verified_at=NULL,src.verified_by=NULL WHERE i.po_id=" . $poId . " AND i.status='discrepancy' AND NOT EXISTS (SELECT 1 FROM procurement_finance_invoice_handoffs h WHERE h.invoice_id=i.id)");
        $db->commit();
        return ['po_number' => $poNumber, 'receipt_number' => $drNumber, 'status' => $newStatus,
            'already_recorded' => false, 'rejection_report' => $reportNumber,
            'invoice_note' => 'Reverify any existing invoice; Finance handoffs require manual review.'];
    } catch (Throwable $error) {
        $db->rollback();
        throw $error;
    }
}

