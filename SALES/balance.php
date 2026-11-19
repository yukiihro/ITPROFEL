<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';
requireSalesWorkspace();
$pdo = getDB();

$pageTitle = 'Customer Balance';
include __DIR__ . '/includes/header.php';

// Billed / paid / outstanding are computed live from invoices + collections,
// so the balance is always accurate without a separate table to keep in sync.
$search = trim($_GET['search'] ?? '');
$sql = "SELECT c.customer_name, COALESCE(SUM(i.total_amount),0) AS total_billed, COALESCE(SUM(i.amount_paid),0) AS total_paid, COALESCE(SUM(GREATEST(i.total_amount-i.amount_paid,0)),0) AS outstanding FROM customers c LEFT JOIN sales_orders o ON o.customer_id=c.cus_id LEFT JOIN sales_invoices i ON i.order_id=o.so_id GROUP BY c.cus_id,c.customer_name HAVING total_billed>0";
$params = [];
if ($search !== '') {
    $sql .= ' AND c.customer_name LIKE ?';
    $params = ['%' . $search . '%'];
}
$sql .= ' ORDER BY outstanding DESC,total_billed DESC';
$st = $pdo->prepare($sql);
$st->execute($params);
$rows = $st->fetchAll();
?>
<div class="page-toolbar">
    <p class="muted" style="color: white;">View the running billing, payment, and outstanding balance for each customer.</p>
</div>
<div class="module-search">
    <form method="GET"><input type="hidden" name="section" value="billing"><input type="search" name="search" value="<?= htmlspecialchars($search) ?>" placeholder="Search customer balance by customer name..."><button class="secondary-btn" type="submit">Search</button><?php if ($search !== ''): ?><a class="text-link" href="balance.php?section=billing">Clear</a><?php endif; ?></form>
</div>
<div class="panel">
    <div class="table-wrap">
        <table>
            <thead>
                <tr>
                    <th>Customer</th>
                    <th>Total Billed</th>
                    <th>Total Paid</th>
                    <th>Outstanding Balance</th>
                </tr>
            </thead>
            <tbody>
                <?php if (!$rows): ?><tr class="empty-row">
                        <td colspan="4">No billing activity yet. Create an invoice to see balances here.</td>
                    </tr><?php endif; ?>
                <?php foreach ($rows as $r): $isZero = (float) $r['outstanding'] <= 0; ?>
                    <tr>
                        <td><b><?= htmlspecialchars($r['customer_name']) ?></b></td>
                        <td><?= peso((float) $r['total_billed']) ?></td>
                        <td><?= peso((float) $r['total_paid']) ?></td>
                        <td><span class="badge <?= $isZero ? 'success' : 'warning' ?>"><?= peso((float) $r['outstanding']) ?></span></td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>
<?php include __DIR__ . '/includes/footer.php'; ?>
