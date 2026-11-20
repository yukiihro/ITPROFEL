<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';
requireSalesWorkspace();
$pdo = getDB();

$pageTitle = 'Accounts Receivable';
include __DIR__ . '/includes/header.php';

// Receivables are derived live from unpaid/partially-paid invoices,
// so this list is always in sync with Sales Invoices and Collection.
$search = trim($_GET['search'] ?? '');
$sql = "SELECT i.invoice_no, c.customer_name AS customer_name, i.invoice_date, GREATEST(i.total_amount-i.amount_paid,0) AS amount_due, DATE_ADD(i.invoice_date,INTERVAL 30 DAY) AS due_date FROM sales_invoices i JOIN sales_orders o ON o.so_id=i.order_id JOIN customers c ON c.cus_id=o.customer_id WHERE i.status NOT IN ('Paid','Returned')";
$params = [];
if ($search !== '') {
    $sql .= ' AND (i.invoice_no LIKE ? OR c.customer_name LIKE ?)';
    $like = '%' . $search . '%';
    $params = [$like, $like];
}
$sql .= ' ORDER BY due_date ASC';
$st = $pdo->prepare($sql);
$st->execute($params);
$rows = $st->fetchAll();
?>
<div class="page-toolbar">
    <p class="muted" style="color: white;">Monitor amounts owed by customers and flag overdue invoices.</p><a class="primary-btn" href="invoices.php?section=billing">+ Create Invoice</a>
</div>
<div class="module-search">
    <form method="GET"><input type="hidden" name="section" value="billing"><input type="search" name="search" value="<?= htmlspecialchars($search) ?>" placeholder="Search invoices or customers..."><button class="secondary-btn" type="submit">Search</button><?php if ($search !== ''): ?><a class="text-link" href="receivables.php?section=billing">Clear</a><?php endif; ?></form>
</div>

<div class="panel">
    <div class="table-wrap">
        <table>
            <thead>
                <tr>
                    <th>Invoice No</th>
                    <th>Customer Name</th>
                    <th>Amount Due</th>
                    <th>Due Date</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                <?php if (!$rows): ?><tr class="empty-row">
                        <td colspan="5">No outstanding receivables. Every invoice is fully paid.</td>
                    </tr><?php endif; ?>
                <?php foreach ($rows as $r):
                    $overdue = strtotime($r['due_date']) < strtotime('today');
                    $status = $overdue ? 'Overdue' : 'Current';
                ?>
                    <tr>
                        <td><b><?= htmlspecialchars($r['invoice_no']) ?></b></td>
                        <td><?= htmlspecialchars($r['customer_name']) ?></td>
                        <td><?= peso((float) $r['amount_due']) ?></td>
                        <td><?= niceDate($r['due_date']) ?></td>
                        <td><span class="badge <?= badgeClass($status) ?>"><?= $status ?></span></td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>

<?php include __DIR__ . '/includes/footer.php'; ?>
