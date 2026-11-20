<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';
requireSalesWorkspace();
$pdo = getDB();

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $orderId = (int) ($_POST['order_id'] ?? 0);
    $reason = trim($_POST['reason'] ?? '');
    $date = $_POST['return_date'] ?? '';
    $total = (float) ($_POST['total_amount'] ?? 0);
    $returnQuantity = filter_var($_POST['return_quantity'] ?? null, FILTER_VALIDATE_INT);

    if (!$orderId || !$date || $reason === '' || $total <= 0 || !$returnQuantity || $returnQuantity < 1) {
        $error = 'Order, reason, return date, return quantity, and a return amount greater than 0 are required.';
    } else {
        try {
            $damagePhoto = readSalesReturnDamagePhoto($_FILES['damage_photo'] ?? []);
            $pdo->beginTransaction();
            $orderStmt = $pdo->prepare("SELECT o.quantity,o.status FROM sales_orders o JOIN sales_invoices i ON i.order_id=o.so_id WHERE o.so_id=? FOR UPDATE");
            $orderStmt->execute([$orderId]);
            $orderRow = $orderStmt->fetch(PDO::FETCH_ASSOC) ?: [];
            $orderQuantity = (int)($orderRow['quantity'] ?? 0);
            if ($orderQuantity < 1) throw new RuntimeException('The selected order does not have a valid returnable quantity.');
            $orderStatus = (string)($orderRow['status'] ?? '');
            $activeReturn = $pdo->prepare("SELECT return_no FROM sales_returns WHERE order_id=? AND admin_status IN ('Pending','Approved') ORDER BY ret_id DESC LIMIT 1");
            $activeReturn->execute([$orderId]);
            if ($orderStatus === 'Returned' || $activeReturn->fetchColumn()) throw new RuntimeException('This order already has a pending or approved Sales return.');
            if ($returnQuantity > $orderQuantity) throw new RuntimeException('Return quantity exceeds the order quantity (' . $orderQuantity . ').');

            $returnNo = nextDocNo($pdo, 'sales_returns', 'RET-', 0, 3);
            $stmt = $pdo->prepare("INSERT INTO sales_returns (return_no, order_id, return_date, reason, return_quantity, total_amount, damage_photo, damage_photo_mime, status) VALUES (?,?,?,?,?,?,?,?, 'Pending')");
            $stmt->execute([$returnNo, $orderId, $date, $reason, $returnQuantity, $total, $damagePhoto['binary'], $damagePhoto['mime']]);
            $returnId = (int)$pdo->lastInsertId();
            notifySalesAdminsPendingApproval(
                $pdo,
                'sales-return-pending:' . $returnId,
                'Sales return awaiting approval',
                'Sales Return ' . $returnNo . ' is awaiting review.',
                'sales_return_approval.php'
            );
            $pdo->commit();
            logActivity($pdo, 'Create', 'Sales Return', 'Created ' . $returnNo, $returnId);
            header('Location: returns.php?section=core&added=1');
            exit;
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            $error = $e instanceof RuntimeException ? $e->getMessage() : 'Could not submit the sales return: ' . $e->getMessage();
        }
    }
}

$pageTitle = 'Sales Returns';
include __DIR__ . '/includes/header.php';

$search=trim($_GET['search']??''); $sql='SELECT r.ret_id,r.return_no,r.return_date,r.reason,r.return_quantity,r.total_amount,r.status,r.admin_status,r.inventory_sync_status,r.inventory_sync_error,o.order_no,o.product_code,c.customer_name AS customer_name FROM sales_returns r JOIN sales_orders o ON o.so_id=r.order_id JOIN customers c ON c.cus_id=o.customer_id'; $params=[]; if($search!==''){ $sql.=' WHERE r.return_no LIKE ? OR o.order_no LIKE ? OR c.customer_name LIKE ? OR r.reason LIKE ? OR r.status LIKE ?'; $like='%'.$search.'%'; $params=[$like,$like,$like,$like,$like]; } $sql.=' ORDER BY r.ret_id DESC'; $st=$pdo->prepare($sql); $st->execute($params); $rows=$st->fetchAll();
$orders = $pdo->query("SELECT o.so_id,o.order_no,o.product_code,o.quantity,c.customer_name AS customer_name FROM sales_orders o JOIN sales_invoices i ON i.order_id=o.so_id JOIN customers c ON c.cus_id=o.customer_id WHERE o.quantity>0 AND o.status<>'Returned' AND NOT EXISTS (SELECT 1 FROM sales_returns r WHERE r.order_id=o.so_id AND r.admin_status IN ('Pending','Approved')) ORDER BY o.so_id DESC")->fetchAll();
?>
<div class="page-toolbar"><p class="muted" style="color: white;">Record and review products returned after a sale.</p><button class="primary-btn" data-open-modal="addReturnModal">+ New Sales Return</button></div>
<div class="module-search"><form method="GET"><input type="hidden" name="section" value="core"><input type="search" name="search" value="<?= htmlspecialchars($search) ?>" placeholder="Search returns, orders, customers, reason, or status..."><button class="secondary-btn" type="submit">Search</button><?php if($search!==''): ?><a class="text-link" href="returns.php?section=core">Clear</a><?php endif; ?></form></div>

<?php if (!empty($_GET['added'])): ?><div class="alert success">Sales return recorded successfully.</div><?php endif; ?>
<?php if ($error): ?><div class="alert error"><?= htmlspecialchars($error) ?></div><?php endif; ?>

<div class="panel"><div class="table-wrap"><table><thead><tr><th>Return</th><th>Order</th><th>Customer Name</th><th>Product / Quantity</th><th>Reason</th><th>Date</th><th>Status</th><th>Admin Approval</th><th>Inventory</th></tr></thead><tbody>
<?php if (!$rows): ?><tr class="empty-row"><td colspan="9">No sales returns yet.</td></tr><?php endif; ?>
<?php foreach ($rows as $r): ?>
    <tr>
        <td><b><?= htmlspecialchars($r['return_no']) ?></b></td>
        <td><?= htmlspecialchars($r['order_no']) ?></td>
        <td><?= htmlspecialchars($r['customer_name']) ?></td>
        <td><?= htmlspecialchars((string)$r['product_code']) ?> × <?= (int)($r['return_quantity'] ?? 1) ?></td>
        <td><?= htmlspecialchars($r['reason']) ?></td>
        <td><?= niceDate($r['return_date']) ?></td>
        <td><span class="badge <?= badgeClass($r['status']) ?>"><?= htmlspecialchars($r['status']) ?></span></td><td><span class="badge <?= badgeClass($r['admin_status'] ?? 'Pending') ?>"><?= htmlspecialchars($r['admin_status'] ?? 'Pending') ?></span></td>
        <td><span class="badge <?= badgeClass($r['inventory_sync_status'] ?? 'Not Sent') ?>"><?= htmlspecialchars($r['inventory_sync_status'] ?? 'Not Sent') ?></span><?php if (!empty($r['inventory_sync_error'])): ?><br><small><?= htmlspecialchars($r['inventory_sync_error']) ?></small><?php endif; ?></td>
    </tr>
<?php endforeach; ?>
</tbody></table></div></div>

<div class="modal-backdrop" id="addReturnModal" aria-hidden="true">
    <div class="profile-modal entry-modal" role="dialog" aria-modal="true" aria-labelledby="addReturnTitle">
        <button class="modal-close" type="button" aria-label="Close" data-close-modal>×</button>
        <p class="eyebrow">CORE SALES</p>
        <h2 id="addReturnTitle">New Sales Return</h2>
        <form method="POST" enctype="multipart/form-data" class="entry-form">
            <label>Sales Order
                <select name="order_id" id="returnOrderSelect" required <?= !$orders ? 'disabled' : '' ?>>
                    <option value="">Select order</option>
                    <?php foreach ($orders as $o): ?><option value="<?= $o['so_id'] ?>" data-max-quantity="<?= (int)$o['quantity'] ?>"><?= htmlspecialchars($o['order_no'] . ' — ' . $o['customer_name'] . ' — ' . $o['product_code'] . ' (' . $o['quantity'] . ' available)') ?></option><?php endforeach; ?>
                </select>
                <?php if (!$orders): ?><small class="muted">No eligible orders. Orders with a pending or approved return cannot be selected again.</small><?php endif; ?>
            </label>
            <label>Returned Quantity
                <input type="number" name="return_quantity" id="returnQuantity" min="1" max="1" value="1" required <?= !$orders ? 'disabled' : '' ?>>
            </label>
            <label>Reason
                <input type="text" name="reason" required>
            </label>
            <label>Damage Photo
                <input type="file" name="damage_photo" accept="image/jpeg,image/png,image/webp" required>
                <small>JPG, PNG, or WebP · maximum 5 MB</small>
            </label>
            <label>Return Date
                <input type="date" name="return_date" value="<?= date('Y-m-d') ?>" required>
            </label>
            <label>Return Amount (PHP)
                <input type="number" step="0.01" min="0.01" name="total_amount" required <?= !$orders ? 'disabled' : '' ?>>
            </label>
            <div class="modal-actions">
                <button type="button" class="secondary-btn" data-close-modal>Cancel</button>
                <button type="submit" class="primary-btn" <?= !$orders ? 'disabled' : '' ?>>Save Return</button>
            </div>
        </form>
    </div>
</div>

<script>
(() => {
    const order = document.getElementById('returnOrderSelect');
    const quantity = document.getElementById('returnQuantity');
    if (!order || !quantity) return;
    const updateLimit = () => {
        const max = Number(order.selectedOptions[0]?.dataset.maxQuantity || 1);
        quantity.max = String(max);
        if (Number(quantity.value) > max) quantity.value = String(max);
    };
    order.addEventListener('change', updateLimit);
    updateLimit();
})();
</script>

<?php include __DIR__ . '/includes/footer.php'; ?>
