<?php
declare(strict_types=1);

function getProductionDB(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;

    $host = getenv('PRODUCTION_DB_HOST') ?: '127.0.0.1';
    $name = getenv('PRODUCTION_DB_NAME') ?: 'team3production';
    $user = getenv('PRODUCTION_DB_USER') ?: 'root';
    $pass = getenv('PRODUCTION_DB_PASSWORD') ?: '';
    $pdo = new PDO(
        "mysql:host={$host};dbname={$name};charset=utf8mb4",
        $user,
        $pass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
    return $pdo;
}

/**
 * Production -> Finance integration.
 *
 * Every costing record Production flagged with sent_to_finance = 1 is recorded here as a
 * Financial Transaction (transaction_type = "Production") carrying the data Finance needs:
 *   Production ID   -> reference_no / costing_id link
 *   Product ID/Name -> description
 *   Quantity Produced / Production Date -> description
 *   Material / Labor / Overhead / Total cost -> description (amount = recorded cost = total)
 *
 * In return, Production gets the Financial Transaction ID and its status written back into
 * production_costing (finance_transaction_id, finance_status) so the Costing page can show the
 * financial record the cost was booked under.
 *
 * Matching is keyed on financial_transactions.costing_id. If a record loses its costing link
 * (e.g. after a legacy full-save that re-inserts rows without it), it is found again by its
 * reference_no (the Production order ID) and the link is repaired, so this stays idempotent —
 * running it repeatedly never creates duplicate Production transactions.
 *
 * Every Production transaction is also mirrored once into accounts_payable: the production
 * cost booked to Finance is money Finance owes for that production order. The payable is
 * keyed on the same order reference (invoice_no = e.g. "PO-1042", vendor = the internal
 * "Production Department" supplier) and is created only when absent, so Finance's own
 * payment status (Pending / Partial / Paid) is never overwritten by the reconciliation.
 */
function reconcileProductionToFinance(): int
{
    $production = getProductionDB();
    $rows = $production->query(
        'SELECT pc.costing_id, pc.order_id, pc.materials_cost, pc.labor_cost, pc.overhead_cost,
                pc.total_cost, pc.calculated_at,
                po.product_id, po.quantity AS ordered_qty, po.start_date,
                p.product_name,
                (SELECT qc.produced_qty FROM quality_checks qc
                  WHERE qc.order_id = pc.order_id ORDER BY qc.qc_id DESC LIMIT 1) AS produced_qty
         FROM production_costing pc
         JOIN production_orders po ON po.order_id = pc.order_id
         JOIN products p ON p.product_id = po.product_id
         WHERE pc.sent_to_finance = 1
         ORDER BY pc.costing_id'
    )->fetchAll(PDO::FETCH_ASSOC);
    if (!$rows) {
        return 0;
    }

    $finance = db();
    $recorded = [];            // costing_id => [transaction_id, status]
    $finance->beginTransaction();
    try {
        // Lock the matching row (or the gap where it would go) so two Finance
        // tabs refreshing at once cannot both insert the same costing. Matching
        // on the order reference also repairs rows that lost their costing link
        // in an older full-save, instead of adding a second copy.
        $find = $finance->prepare(
            'SELECT transaction_id FROM financial_transactions
             WHERE costing_id = ?
                OR (transaction_type = "Production" AND reference_no = ?)
             ORDER BY transaction_id LIMIT 1
             FOR UPDATE'
        );
        $update = $finance->prepare(
            'UPDATE financial_transactions
             SET costing_id = ?, amount = ?, transaction_date = ?, reference_no = ?,
                 status = "Completed", description = ?
             WHERE transaction_id = ?'
        );
        $insert = $finance->prepare(
            'INSERT INTO financial_transactions
             (costing_id, transaction_type, amount, transaction_date, reference_no, status, description)
             VALUES (?, "Production", ?, ?, ?, "Completed", ?)'
        );

        // Accounts Payable mirror: one internal supplier for production costs,
        // created on first use.
        $supplierName = 'Production Department';
        $supSel = $finance->prepare('SELECT supplier_id FROM suppliers WHERE supplier_name = ? LIMIT 1');
        $supIns = $finance->prepare('INSERT INTO suppliers (supplier_name) VALUES (?)');
        $supSel->execute([$supplierName]);
        $supplierId = (int)($supSel->fetchColumn() ?: 0);
        if ($supplierId === 0) {
            $supIns->execute([$supplierName]);
            $supplierId = (int)$finance->lastInsertId();
        }
        $apFind = $finance->prepare('SELECT ap_id FROM accounts_payable WHERE invoice_no = ? LIMIT 1 FOR UPDATE');
        $apIns = $finance->prepare(
            'INSERT INTO accounts_payable
             (supplier_id, invoice_no, amount, cost_of_goods, due_date, status)
             VALUES (?, ?, ?, ?, ?, "Pending")'
        );

        foreach ($rows as $row) {
            $costingId = (int)$row['costing_id'];
            $orderId = (string)$row['order_id'];
            $qty = $row['produced_qty'] !== null
                ? (int)$row['produced_qty']
                : (int)$row['ordered_qty'];
            $productionDate = $row['start_date'] ?: date('Y-m-d', (int)strtotime((string)$row['calculated_at']));
            $costingDate = date('Y-m-d', (int)strtotime((string)$row['calculated_at']));

            $description = sprintf(
                'Production costing for %s (%s, product #%d), quantity %d, production date %s — materials %.2f, labor %.2f, overhead %.2f, total %.2f',
                $orderId,
                (string)$row['product_name'],
                (int)$row['product_id'],
                $qty,
                $productionDate,
                (float)$row['materials_cost'],
                (float)$row['labor_cost'],
                (float)$row['overhead_cost'],
                (float)$row['total_cost']
            );

            $find->execute([$costingId, $orderId]);
            $existing = $find->fetch();
            $transactionId = (int)($existing['transaction_id'] ?? 0);
            $values = [
                (float)$row['total_cost'],
                $costingDate,
                $orderId,
                $description,
            ];
            if ($transactionId > 0) {
                $update->execute([$costingId, ...$values, $transactionId]);
            } else {
                $insert->execute([$costingId, ...$values]);
                $transactionId = (int)$finance->lastInsertId();
                // A brand-new Production transaction goes to the notification
                // feed too. Audited with the signed-in Finance user (reconciliation
                // calls without a session stay silent, matching audit()'s rule).
                $au = $_SESSION['user'] ?? null;
                if (is_array($au) && (int)($au['id'] ?? 0) > 0) {
                    audit(
                        (int)$au['id'], (string)($au['email'] ?? ''), (string)($au['role'] ?? ''),
                        'transaction', 'financial_transactions', $transactionId,
                        sprintf('Recorded transaction %s — Production costing (₱%s, Completed)',
                            $orderId, number_format((float)$row['total_cost'], 2))
                    );
                }
            }
            $recorded[$costingId] = [$transactionId, 'Completed'];

            // Mirror the costing into Accounts Payable (insert-once): the
            // production cost is money Finance owes for the order, so it must
            // show up in Accounts Payable next to the Financial Transaction.
            // Existing payables are left untouched so a payment status set by
            // Finance (Partial / Paid) is never reset by this reconciliation.
            $apFind->execute([$orderId]);
            if (!$apFind->fetch()) {
                $apIns->execute([
                    $supplierId,
                    $orderId,
                    (float)$row['total_cost'],
                    (float)$row['total_cost'],
                    date('Y-m-d', (int)strtotime($costingDate . ' +30 days')),
                ]);
            }
        }
        $finance->commit();
    } catch (Throwable $e) {
        $finance->rollBack();
        throw $e;
    }

    // Give Production the Financial Transaction ID + status of the records above.
    // Best effort: a failed write-back must not corrupt the Finance ledger.
    $writeBack = $production->prepare(
        'UPDATE production_costing
         SET finance_transaction_id = ?, finance_status = ?
         WHERE costing_id = ?'
    );
    foreach ($recorded as $costingId => $entry) {
        try {
            $writeBack->execute([$entry[0], $entry[1], $costingId]);
        } catch (Throwable $e) {
            error_log('Production finance write-back failed for costing ' . $costingId . ': ' . $e->getMessage());
        }
    }

    return count($recorded);
}
