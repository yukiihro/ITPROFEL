<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';


requireSalesWorkspace();

$pdo = getDB();
$pageTitle = 'Billing & Finance';
$error = '';
$notice = '';
$section = $_GET['section'] ?? 'billing';
$section = in_array($section, ['billing', 'payment'], true) ? $section : 'billing';

/* =========================================================
   RECORD COLLECTION FROM THE BILLING RECEIPT
   ========================================================= */
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'record_collection') {
    $invoiceId = (int)($_POST['invoice_id'] ?? 0);
    $collectionDate = $_POST['collection_date'] ?? '';
    $dueDate = $_POST['due_date'] ?? '';
    $amount = (float)($_POST['amount'] ?? 0);
    $allowedMethods = supportedPaymentMethods();
    $method = in_array($_POST['method'] ?? '', $allowedMethods, true) ? $_POST['method'] : 'Cash';

    if (!$invoiceId || !$collectionDate || !$dueDate || $amount <= 0) {
        $error = 'Invoice, dates, and an amount greater than 0 are required.';
    } else {
        $stmt = $pdo->prepare("
            SELECT i.inv_id, i.invoice_no, i.total_amount, i.amount_paid
            FROM sales_invoices i
            WHERE i.inv_id = ?
            LIMIT 1
        ");
        $stmt->execute([$invoiceId]);
        $invoice = $stmt->fetch();

        if (!$invoice) {
            $error = 'Selected invoice was not found.';
        } else {
            $remaining = max(0, (float)$invoice['total_amount'] - (float)$invoice['amount_paid']);

            if ($amount > $remaining) {
                $error = 'Collection amount cannot be greater than the remaining Accounts Receivable.';
            } else {
                try {
                    $pdo->beginTransaction();

                    $collectionNo = nextDocNo($pdo, 'collections', 'COL-', 500);

                    $pdo->prepare("
                        INSERT INTO collections
                        (collection_no, invoice_id, collection_date, due_date, amount, method)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ")->execute([
                        $collectionNo,
                        $invoiceId,
                        $collectionDate,
                        $dueDate,
                        $amount,
                        $method
                    ]);

                    $newPaid = (float)$invoice['amount_paid'] + $amount;
                    $newStatus = $newPaid >= (float)$invoice['total_amount']
                        ? 'Paid'
                        : 'Partially Paid';

                    $pdo->prepare("
                        UPDATE sales_invoices
                        SET amount_paid = ?, status = ?
                        WHERE inv_id = ?
                    ")->execute([$newPaid, $newStatus, $invoiceId]);

                    // Sync Sales Order. Completed requires both Paid and Delivered.
                    $orderStmt = $pdo->prepare('SELECT order_id FROM sales_invoices WHERE inv_id = ?');
                    $orderStmt->execute([$invoiceId]);
                    $orderId = (int)$orderStmt->fetchColumn();
                    if ($orderId > 0) {
                        syncSalesOrderCompletion($pdo, $orderId);
                    }

                    $pdo->commit();

                    header('Location: customer_account.php?section=billing&added=1');
                    exit;
                } catch (Throwable $e) {
                    if ($pdo->inTransaction()) {
                        $pdo->rollBack();
                    }
                    $error = 'Could not save collection: ' . $e->getMessage();
                }
            }
        }
    }
}

if (!empty($_GET['added'])) {
    $notice = 'Collection recorded successfully. The Accounts Receivable and collection records were updated.';
}

/* =========================================================
   SEARCH
   ========================================================= */
$search = trim($_GET['search'] ?? '');

$where = '';
$params = [];

if ($search !== '') {
    $where = "
        WHERE i.invoice_no LIKE ?
           OR c.customer_name LIKE ?
           OR c.customer_code LIKE ?
    ";
    $like = '%' . $search . '%';
    $params = [$like, $like, $like];
}

/* =========================================================
   BILLING RECEIPTS
   One receipt contains:
   - Accounts Receivable
   - Collection history
   ========================================================= */
$sql = "
    SELECT
        i.inv_id AS invoice_id,
        i.invoice_no,
        i.invoice_date,
        i.total_amount,
        i.amount_paid,
        i.status AS invoice_status,
        o.order_no,
        c.cus_id AS customer_id,
        c.customer_code,
        c.customer_name,
        c.payment_terms,
        DATE_ADD(i.invoice_date, INTERVAL 30 DAY) AS due_date
    FROM sales_invoices i
    JOIN sales_orders o
        ON o.so_id = i.order_id
    JOIN customers c
        ON c.cus_id = o.customer_id
    $where
    ORDER BY i.invoice_date DESC, i.inv_id DESC
";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$receipts = $stmt->fetchAll();

/* Collection history for all visible invoices. */
$collectionsByInvoice = [];
if ($receipts) {
    $ids = array_map(static fn($r) => (int)$r['invoice_id'], $receipts);
    $placeholders = implode(',', array_fill(0, count($ids), '?'));

    $collectionStmt = $pdo->prepare("
        SELECT col_id, collection_no, invoice_id, collection_date, due_date, amount, method
        FROM collections
        WHERE invoice_id IN ($placeholders)
        ORDER BY collection_date DESC, col_id DESC
    ");
    $collectionStmt->execute($ids);

    foreach ($collectionStmt->fetchAll() as $row) {
        $collectionsByInvoice[(int)$row['invoice_id']][] = $row;
    }
}
include __DIR__ . '/includes/header.php'; ?>


<div class="billing-workspace">
    <div class="billing-hero">
        <div>
            <p class="eyebrow light">BILLING / FINANCE</p>
            <h2>Payment</h2>
            <p>Accounts Receivable and Collection are kept together on one billing receipt.</p>
        </div>
    </div>

    <?php if ($notice): ?>
        <div class="alert success"><?= htmlspecialchars($notice) ?></div>
    <?php endif; ?>

    <?php if ($error): ?>
        <div class="alert error"><?= htmlspecialchars($error) ?></div>
    <?php endif; ?>

    <div class="module-search">
        <form method="GET">
            <input type="hidden" name="section" value="billing">
            <input type="search" name="search" value="<?= htmlspecialchars($search) ?>" placeholder="Search invoice, customer, or customer code...">
            <button class="secondary-btn" type="submit">Search</button>
            <?php if ($search !== ''): ?>
                <a class="text-link" href="customer_account.php?section=billing">Clear</a>
            <?php endif; ?>
        </form>
    </div>

    <?php if (!$receipts): ?>
        <div class="panel billing-empty">
            <strong>No billing receipts found.</strong>
            <span>Create a Sales Invoice first, then it will appear here as one combined Billing &amp; Finance receipt.</span>
        </div>
    <?php endif; ?>

    <div class="billing-list-panel panel">
        <div class="table-wrap">
            <table class="data-table filterable-table">
                <thead>
                    <tr>
                        <th>Invoice</th>
                        <th>Customer</th>
                        <th>Date</th>
                        <th>Total</th>
                        <th>Paid</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (!$receipts): ?><tr>
                            <td colspan="7" class="empty-row">No billing records found.</td>
                        </tr><?php endif; ?>
                    <?php foreach ($receipts as $receipt):
                        $invoiceId = (int)$receipt['invoice_id'];
                        $total = (float)$receipt['total_amount'];
                        $paid = (float)$receipt['amount_paid'];
                        $due = max(0, $total - $paid);
                        $status = $due <= 0.00001 ? 'Paid' : ($paid > 0 ? 'Partially Paid' : 'Unpaid');
                    ?>
                        <tr>
                            <td><strong><?= htmlspecialchars($receipt['invoice_no']) ?></strong></td>
                            <td><?= htmlspecialchars($receipt['customer_name']) ?><br><small><?= htmlspecialchars($receipt['customer_code']) ?></small></td>
                            <td><?= niceDate($receipt['invoice_date']) ?></td>
                            <td><?= peso($total) ?></td>
                            <td><?= peso($paid) ?></td>
                            <td><span class="badge <?= $status === 'Paid' ? 'success' : ($status === 'Partially Paid' ? 'warning' : 'danger') ?>"><?= $status ?></span></td>
                            <td><button type="button" class="secondary-btn" data-open-billing="<?= $invoiceId ?>">View Receipt</button></td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>

    <?php foreach ($receipts as $receipt):
        $invoiceId = (int)$receipt['invoice_id'];
        $total = (float)$receipt['total_amount'];
        $paid = (float)$receipt['amount_paid'];
        $amountDue = max(0, $total - $paid);
        $status = $amountDue <= 0.00001 ? 'Paid' : ($paid > 0 ? 'Partially Paid' : 'Unpaid');
        $receiptCollections = $collectionsByInvoice[$invoiceId] ?? [];
    ?>
        <div class="modal-backdrop" id="billingReceipt<?= $invoiceId ?>" aria-hidden="true">
            <div class="profile-modal entry-modal" style="max-width:980px;max-height:90vh;overflow:auto">
                <button class="modal-close" type="button" data-close-modal>×</button>
                <p class="eyebrow">BILLING / FINANCE</p>
                <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start">
                    <div>
                        <h2 style="margin:0"><?= htmlspecialchars($receipt['customer_name']) ?></h2>
                        <p class="muted">Invoice <?= htmlspecialchars($receipt['invoice_no']) ?> · Sales Order <?= htmlspecialchars($receipt['order_no']) ?> · Customer Code <?= htmlspecialchars($receipt['customer_code']) ?></p>
                    </div>
                    <span class="badge <?= $status === 'Paid' ? 'success' : ($status === 'Partially Paid' ? 'warning' : 'danger') ?>"><?= $status ?></span>
                </div>
                <p><a class="secondary-btn" target="_blank" rel="noopener" href="document_export.php?type=invoice&amp;id=<?= $invoiceId ?>">View / Print Sales Invoice PDF</a></p>
                <div class="receipt-detail-grid" style="margin-top:20px">
                    <div><span>Invoice Date</span><strong><?= niceDate($receipt['invoice_date']) ?></strong></div>
                    <div><span>Due Date</span><strong><?= niceDate($receipt['due_date']) ?></strong></div>
                    <div><span>Total</span><strong><?= peso($total) ?></strong></div>
                    <div><span>Amount Paid</span><strong><?= peso($paid) ?></strong></div>
                    <div><span>Amount Due</span><strong><?= peso($amountDue) ?></strong></div>
                    <div><span>Payment Terms</span><strong><?= htmlspecialchars($receipt['payment_terms'] ?: '30 Days') ?></strong></div>
                </div>
                <div class="receipt-section" style="margin-top:20px">
                    <div class="receipt-section-title">COLLECTION HISTORY</div>
                    <?php if ($receiptCollections): foreach ($receiptCollections as $collection): ?>
                            <div class="receipt-collection-row">
                                <div><span>Collection No.</span><strong><?= htmlspecialchars($collection['collection_no']) ?></strong></div>
                                <div><span>Date</span><strong><?= niceDate($collection['collection_date']) ?></strong></div>
                                <div><span>Method</span><strong><?= htmlspecialchars($collection['method']) ?></strong></div>
                                <div><span>Amount</span><strong><?= peso((float)$collection['amount']) ?></strong></div>
                                <div><a class="table-action" target="_blank" rel="noopener" href="document_export.php?type=receipt&amp;id=<?= (int)$collection['col_id'] ?>">View / Print Receipt PDF</a></div>
                            </div>
                        <?php endforeach;
                    else: ?><p class="empty-text">No collection recorded.</p><?php endif; ?>
                </div>
            </div>
        </div>
    <?php endforeach; ?>

    <script>
        document.querySelectorAll('[data-open-billing]').forEach(b => b.addEventListener('click', () => {
            const m = document.getElementById('billingReceipt' + b.dataset.openBilling);
            if (m) {
                m.classList.add('open');
                m.setAttribute('aria-hidden', 'false')
            }
        }));
        document.querySelectorAll('[data-close-modal]').forEach(b => b.addEventListener('click', () => {
            const m = b.closest('.modal-backdrop');
            if (m) {
                m.classList.remove('open');
                m.setAttribute('aria-hidden', 'true')
            }
        }));
        document.querySelectorAll('.modal-backdrop').forEach(m => m.addEventListener('click', e => {
            if (e.target === m) {
                m.classList.remove('open');
                m.setAttribute('aria-hidden', 'true')
            }
        }));
    </script>

</div>
<?php include __DIR__ . '/includes/footer.php'; ?>