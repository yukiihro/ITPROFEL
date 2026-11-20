<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';
requireSalesWorkspace();
$pdo = getDB();

$error = '';
$notice = '';

$pageTitle = 'Sales Orders';
include __DIR__ . '/includes/header.php';

$search = trim($_GET['search'] ?? '');
$sql = 'SELECT o.*, c.customer_name AS customer_name, (SELECT d.delivery_no FROM deliveries d WHERE d.order_id = o.so_id LIMIT 1) AS delivery_no, (SELECT i.invoice_no FROM sales_invoices i WHERE i.order_id = o.so_id LIMIT 1) AS invoice_no FROM sales_orders o JOIN customers c ON c.cus_id = o.customer_id';
$params = [];
if ($search !== '') {
    $sql .= ' WHERE o.order_no LIKE ? OR c.customer_name LIKE ? OR o.product_code LIKE ? OR o.status LIKE ?';
    $like = '%' . $search . '%';
    $params = [$like, $like, $like, $like];
}
$sql .= ' ORDER BY o.so_id DESC';
$st = $pdo->prepare($sql);
$st->execute($params);
$rows = $st->fetchAll();
?>
<div class="page-toolbar">
    <p class="muted" style="color: white;">Sales Orders are created from Purchase Orders. The Sales Admin approves each order, which converts it to a Delivery; the Sales Admin then continues billing and collection.</p>
</div>
<div class="module-search">
    <form method="GET"><input type="hidden" name="section" value="core"><input type="search" name="search" value="<?= htmlspecialchars($search) ?>" placeholder="Search sales orders, customers, products, or status..."><button class="secondary-btn" type="submit">Search</button><?php if ($search !== ''): ?><a class="text-link" href="orders.php?section=core">Clear</a><?php endif; ?></form>
</div>

<?php if (!empty($_GET['added'])): ?><div class="alert success">Sales order created successfully.</div><?php endif; ?>
<?php if ($error): ?><div class="alert error"><?= htmlspecialchars($error) ?></div><?php endif; ?>

<div class="panel">
    <div class="table-wrap">
        <table>
            <thead>
                <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Product</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Admin Approval</th>
                    <th>Next Step</th>
                </tr>
            </thead>
            <tbody>
                <?php if (!$rows): ?><tr class="empty-row">
                        <td colspan="9">No sales orders yet. Create one from a Purchase Order.</td>
                    </tr><?php endif; ?>
                <?php foreach ($rows as $r): ?>
                    <tr>
                        <td><b><?= htmlspecialchars($r['order_no']) ?></b></td>
                        <td><?= htmlspecialchars($r['customer_name']) ?></td>
                        <td><?= niceDate($r['order_date']) ?></td>
                        <td><?= $r['product_code'] ? htmlspecialchars($r['product_code']) . (!empty($r['size']) ? ' · Size ' . htmlspecialchars($r['size']) : '') . ' × ' . (int) $r['quantity'] : '—' ?></td>
                        <td><?= peso((float) $r['total_amount']) ?></td>
                        <td><span class="badge <?= badgeClass($r['status']) ?>"><?= htmlspecialchars($r['status']) ?></span></td>
                        <td><span class="badge <?= badgeClass($r['payment_status'] ?? 'Pending') ?>"><?= htmlspecialchars($r['payment_status'] ?? 'Pending') ?></span></td>
                        <td><span class="badge <?= badgeClass($r['admin_status']) ?>"><?= htmlspecialchars($r['admin_status']) ?></span></td>
                        <td class="order-action-cell">
                            <?php if ($r['status'] === 'Returned'): ?>
                            <?php elseif ($r['admin_status'] === 'Pending' && $r['status'] !== 'Cancelled'): ?>
                                <small>Waiting for Sales Admin approval</small>
                            <?php elseif ($r['admin_status'] === 'Rejected'): ?>
                                <small>Rejected by Sales Admin</small>
                            <?php elseif ($r['status'] === 'Completed'): ?>
                                <small>Completed: Paid and delivered</small>
                            <?php elseif (!empty($r['invoice_no'])): ?>
                                <small>Invoiced: <?= htmlspecialchars($r['invoice_no']) ?></small>
                            <?php else: ?>
                                <small>Delivery <?= htmlspecialchars($r['delivery_no'] ?? '—') ?></small>
                            <?php endif; ?>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>


<script>
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.table-wrap table').forEach(function (table, index) {
    if (table.dataset.filterReady === '1') return;
    table.dataset.filterReady = '1';
    const wrap = table.closest('.table-wrap');
    if (!wrap) return;
    const box = document.createElement('div');
    box.className = 'module-search';
    box.style.marginBottom = '12px';
    box.innerHTML = '<input type="search" class="table-filter" placeholder="Filter this table..." aria-label="Filter this table">';
    wrap.parentNode.insertBefore(box, wrap);
    const input = box.querySelector('input');
    input.addEventListener('input', function () {
      const term = this.value.trim().toLowerCase();
      table.querySelectorAll('tbody tr').forEach(function (row) {
        if (row.classList.contains('empty-row')) return;
        row.style.display = !term || row.textContent.toLowerCase().includes(term) ? '' : 'none';
      });
    });
  });
});
</script>

<?php include __DIR__ . '/includes/footer.php'; ?>
