<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';
requireSalesWorkspace();
$pdo = getDB();

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $invoiceId = (int) ($_POST['invoice_id'] ?? 0);
    $date = $_POST['collection_date'] ?? '';
    $dueDate = $_POST['due_date'] ?? '';
    $amount = (float) ($_POST['amount'] ?? 0);
    $method = in_array($_POST['method'] ?? '', supportedPaymentMethods(), true) ? $_POST['method'] : 'Cash';

    if (!$invoiceId || !$date || !$dueDate || $amount <= 0) {
        $error = 'Invoice, collection date, due date, and an amount greater than 0 are required.';
    } else {
        $invStmt = $pdo->prepare('SELECT total_amount, amount_paid FROM sales_invoices WHERE inv_id = ?');
        $invStmt->execute([$invoiceId]);
        $invoice = $invStmt->fetch();

        if (!$invoice) {
            $error = 'Selected invoice was not found.';
        } elseif ($amount > max(0, (float)$invoice['total_amount'] - (float)$invoice['amount_paid'])) {
            $error = 'Collection amount cannot be greater than the remaining invoice balance.';
        } else {
            $pdo->beginTransaction();
            try {
                $collectionNo = nextDocNo($pdo, 'collections', 'COL-', 500);
                $pdo->prepare('INSERT INTO collections (collection_no, invoice_id, collection_date, due_date, amount, method) VALUES (?,?,?,?,?,?)')
                    ->execute([$collectionNo, $invoiceId, $date, $dueDate, $amount, $method]);

                $newPaid = (float) $invoice['amount_paid'] + $amount;

                $newStatus = $newPaid >= (float) $invoice['total_amount']
                    ? 'Paid'
                    : 'Partially Paid';

                $pdo->prepare('
                    UPDATE sales_invoices 
                    SET amount_paid = ?, status = ? 
                    WHERE inv_id = ?
                ')->execute([
                    $newPaid,
                    $newStatus,
                    $invoiceId
                ]);

                // Sync the Sales Order. It becomes Completed only when
                // the invoice is fully Paid AND the delivery is Delivered.
                $orderStmt = $pdo->prepare('SELECT order_id FROM sales_invoices WHERE inv_id = ?');
                $orderStmt->execute([$invoiceId]);
                $orderId = (int)$orderStmt->fetchColumn();

                if ($orderId > 0) {
                    syncSalesOrderCompletion($pdo, $orderId);
                }

                $pdo->commit();
                header('Location: collection.php?section=billing&added=1');
                exit;
            } catch (Throwable $e) {
                $pdo->rollBack();
                $error = 'Could not save collection: ' . $e->getMessage();
            }
        }
    }
}

$pageTitle = 'Collection';
include __DIR__ . '/includes/header.php';

$search = trim($_GET['search'] ?? '');
$sql = 'SELECT col.*, i.invoice_no, c.customer_name AS customer_name FROM collections col JOIN sales_invoices i ON i.inv_id=col.invoice_id JOIN sales_orders o ON o.so_id=i.order_id JOIN customers c ON c.cus_id=o.customer_id';
$params = [];
if ($search !== '') {
    $sql .= ' WHERE col.collection_no LIKE ? OR i.invoice_no LIKE ? OR c.customer_name LIKE ? OR col.method LIKE ?';
    $like = '%' . $search . '%';
    $params = [$like, $like, $like, $like];
}
$sql .= ' ORDER BY col.col_id DESC';
$st = $pdo->prepare($sql);
$st->execute($params);
$rows = $st->fetchAll();

$openInvoices = $pdo->query("
    SELECT i.inv_id, i.invoice_no, i.invoice_date,
           DATE_ADD(i.invoice_date, INTERVAL 30 DAY) AS due_date,
           GREATEST(i.total_amount - i.amount_paid,0) AS balance,
           c.customer_name AS customer_name
    FROM sales_invoices i
    JOIN sales_orders o ON o.so_id = i.order_id
    JOIN customers c ON c.cus_id = o.customer_id
    WHERE i.status NOT IN ('Paid','Returned')
    ORDER BY i.inv_id DESC
")->fetchAll();
?>
<div class="page-toolbar">
    <p class="muted" style="color:white;">Record customer payments and the invoice due date for Finance.</p><button class="primary-btn" data-open-modal="addCollectionModal">+ Record Payment</button>
</div>
<div class="module-search">
    <form method="GET"><input type="hidden" name="section" value="billing"><input type="search" name="search" value="<?= htmlspecialchars($search) ?>" placeholder="Search collections, invoices, customers, or method..."><button class="secondary-btn" type="submit">Search</button><?php if ($search !== ''): ?><a class="text-link" href="collection.php?section=billing">Clear</a><?php endif; ?></form>
</div>

<?php if (!empty($_GET['added'])): ?><div class="alert success">Payment recorded successfully.</div><?php endif; ?>
<?php if ($error): ?><div class="alert error"><?= htmlspecialchars($error) ?></div><?php endif; ?>

<div class="panel">
    <div class="table-wrap">
        <table>
            <thead>
                <tr>
                    <th>Collection No</th>
                    <th>Customer Name</th>
                    <th>Invoice No</th>
                    <th>Amount</th>
                    <th>Collection Date</th>
                    <th>Due Date</th>
                    <th>Method</th>
                    <th>Receipt</th>
                </tr>
            </thead>
            <tbody>
                <?php if (!$rows): ?><tr class="empty-row">
                        <td colspan="8">No payments recorded yet.</td>
                    </tr><?php endif; ?>
                <?php foreach ($rows as $r):
                    $late = !empty($r['due_date']) && strtotime($r['collection_date']) > strtotime($r['due_date']);
                ?>
                    <tr>
                        <td><b><?= htmlspecialchars($r['collection_no']) ?></b></td>
                        <td><?= htmlspecialchars($r['customer_name']) ?></td>
                        <td><?= htmlspecialchars($r['invoice_no']) ?></td>
                        <td><?= peso((float)$r['amount']) ?></td>
                        <td><?= niceDate($r['collection_date']) ?></td>
                        <td><?= niceDate($r['due_date']) ?> <?= $late ? '<span class="badge danger">Late</span>' : '<span class="badge success">On time</span>' ?></td>
                        <td><span class="badge info"><?= htmlspecialchars($r['method']) ?></span></td>
                        <td><a class="table-action" target="_blank" rel="noopener" href="document_export.php?type=receipt&amp;id=<?= (int)$r['col_id'] ?>">View / Print PDF</a></td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>

<div class="modal-backdrop" id="addCollectionModal" aria-hidden="true">
    <div class="profile-modal entry-modal" role="dialog" aria-modal="true">
        <button class="modal-close" type="button" aria-label="Close" data-close-modal>×</button>
        <p class="eyebrow">BILLING / FINANCE</p>
        <h2>Record Payment</h2>
        <?php if (!$openInvoices): ?><p class="modal-subtitle">There are no unpaid invoices to collect against right now.</p><?php else: ?>
            <form method="POST" class="entry-form">
                <label>Invoice<select name="invoice_id" id="collectionInvoice" required>
                        <option value="">Select invoice</option>
                        <?php foreach ($openInvoices as $i): ?><option value="<?= (int)$i['inv_id'] ?>" data-due="<?= htmlspecialchars($i['due_date']) ?>"><?= htmlspecialchars($i['invoice_no']) ?> — <?= htmlspecialchars($i['customer_name']) ?> (<?= peso((float)$i['balance']) ?> due)</option><?php endforeach; ?>
                    </select></label>
                <label>Amount (₱)<input type="number" step="0.01" min="0.01" name="amount" required></label>
                <label>Collection Date<input type="date" name="collection_date" value="<?= date('Y-m-d') ?>" required></label>
                <label>Due Date<input type="date" name="due_date" id="collectionDueDate" required></label>
                <label>Method<select name="method">
                        <option>Cash</option>
                        <option>GCash</option>
                        <option>Bank Transfer</option>
                    </select></label>
                <div class="modal-actions"><button type="button" class="secondary-btn" data-close-modal>Cancel</button><button type="submit" class="primary-btn">Save Payment</button></div>
            </form><?php endif; ?>
    </div>
</div>
<script>
    document.getElementById('collectionInvoice')?.addEventListener('change', function() {
        const due = this.options[this.selectedIndex]?.dataset.due || '';
        const input = document.getElementById('collectionDueDate');
        if (input) input.value = due;
    });
</script>
<?php include __DIR__ . '/includes/footer.php'; ?>
