<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';
requireSalesWorkspace();
$pdo = getDB();

$error = '';
$notice = '';

// Deliveries are created automatically when the Sales Admin approves a Sales Order
// (see convertOrderToDelivery() in includes/functions.php). Staff only track shipping status here.
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $deliveryId = (int) ($_POST['delivery_id'] ?? 0);
    $status = $_POST['status'] ?? '';
    if (!$deliveryId || !in_array($status, ['Preparing', 'In Transit', 'Delivered'], true)) {
        $error = 'Invalid delivery update.';
    } else {
        $deliveryStmt = $pdo->prepare('SELECT order_id FROM deliveries WHERE del_id = ?');
        $deliveryStmt->execute([$deliveryId]);
        $orderId = (int)$deliveryStmt->fetchColumn();

        $pdo->prepare('UPDATE deliveries SET status = ? WHERE del_id = ?')->execute([$status, $deliveryId]);

        // Sync Sales Order. Completed requires both Paid and Delivered.
        if ($orderId > 0) {
            syncSalesOrderCompletion($pdo, $orderId);
        }

        logActivity($pdo, 'Update', 'Delivery', 'Delivery status set to ' . $status, $deliveryId);
        $notice = 'Delivery status updated.';
    }
}

$pageTitle = 'Delivery';
include __DIR__ . '/includes/header.php';

$search = trim($_GET['search'] ?? '');
$sql = 'SELECT d.*, o.order_no, o.product_code, o.quantity, c.customer_name AS customer_name
        FROM deliveries d JOIN sales_orders o ON o.so_id=d.order_id JOIN customers c ON c.cus_id=o.customer_id';
$params = [];
if ($search !== '') {
    $sql .= ' WHERE d.delivery_no LIKE ? OR o.order_no LIKE ? OR c.customer_name LIKE ? OR d.status LIKE ?';
    $like = '%' . $search . '%';
    $params = [$like, $like, $like, $like];
}
$sql .= ' ORDER BY d.del_id DESC';
$st = $pdo->prepare($sql);
$st->execute($params);
$rows = $st->fetchAll();
?>
<div class="page-toolbar"><p class="muted" style="color: white;">Deliveries are created automatically when the Sales Admin approves a Sales Order. Inventory is deducted at that moment.</p></div>
<div class="module-search"><form method="GET"><input type="hidden" name="section" value="core"><input type="search" name="search" value="<?= htmlspecialchars($search) ?>" placeholder="Search deliveries, orders, customers, or status..."><button class="secondary-btn" type="submit">Search</button><?php if ($search !== ''): ?><a class="text-link" href="delivery.php?section=core">Clear</a><?php endif; ?></form></div>

<?php if ($notice): ?><div class="alert success"><?= htmlspecialchars($notice) ?></div><?php endif; ?>
<?php if ($error): ?><div class="alert error"><?= htmlspecialchars($error) ?></div><?php endif; ?>

<div class="panel"><div class="table-wrap"><table><thead><tr><th>Delivery No</th><th>Order No</th><th>Customer Name</th><th>Product</th><th>Date</th><th>Inventory</th><th>Status</th><th>Delivery Receipt</th><th>Update</th></tr></thead><tbody>
<?php if (!$rows): ?><tr class="empty-row"><td colspan="9">No deliveries yet. They appear after the Sales Admin approves a Sales Order.</td></tr><?php endif; ?>
<?php foreach ($rows as $r): ?>
    <tr>
        <td><b><?= htmlspecialchars($r['delivery_no']) ?></b></td>
        <td><?= htmlspecialchars($r['order_no']) ?></td>
        <td><?= htmlspecialchars($r['customer_name']) ?></td>
        <td><?= $r['product_code'] ? htmlspecialchars($r['product_code']) . ' × ' . (int)$r['quantity'] : '—' ?></td>
        <td><?= niceDate($r['delivery_date']) ?></td>
        <td><?= !empty($r['inventory_deducted']) ? '<span class="badge success">Deducted</span>' : '<span class="badge neutral">Not deducted</span>' ?></td>
        <td><span class="badge <?= badgeClass($r['status']) ?>"><?= htmlspecialchars($r['status']) ?></span></td>
        <td><a class="table-action" target="_blank" rel="noopener" href="document_export.php?type=delivery&amp;id=<?= (int)$r['del_id'] ?>">View / Print PDF</a></td>
        <td>
            <?php if ($r['status'] !== 'Delivered'): ?>
            <form method="POST" class="inline-actions">
                <input type="hidden" name="delivery_id" value="<?= (int)$r['del_id'] ?>">
                <?php if ($r['status'] === 'Preparing'): ?><button class="table-action" name="status" value="In Transit">Mark In Transit</button><?php endif; ?>
                <button class="table-action" name="status" value="Delivered">Mark Delivered</button>
            </form>
            <?php else: ?>—<?php endif; ?>
        </td>
    </tr>
<?php endforeach; ?>
</tbody></table></div></div>

<?php include __DIR__ . '/includes/footer.php'; ?>
