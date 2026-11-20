<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';
requireSalesAdmin();

$pdo = getDB();
$error = '';
$notice = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['type'] ?? '') === 'order') {
    $id = (int)($_POST['id'] ?? 0);
    $decision = $_POST['decision'] ?? '';
    if (!in_array($decision, ['Approved', 'Rejected'], true)) {
        $error = 'Invalid approval decision.';
    } else {
        try {
            $orderCheck = $pdo->prepare("SELECT product_code, quantity, order_no, total_amount, customer_id FROM sales_orders WHERE so_id = ? LIMIT 1");
            $orderCheck->execute([$id]);
            $orderRow = $orderCheck->fetch(PDO::FETCH_ASSOC);
            if (!$orderRow) {
                throw new RuntimeException('Sales order is no longer pending.');
            }

            if ($decision === 'Approved') {
                $localStock = getTeamSalesInventory($pdo, (string)($orderRow['product_code'] ?? ''));
                $available = (float)($localStock['stock_quantity'] ?? 0);
                $required = (float)($orderRow['quantity'] ?? 0);
                if (!$localStock || $available < $required || (($localStock['status'] ?? 'Active') !== 'Active')) {
                    throw new RuntimeException('Not enough Team Sales stock to approve this Sales Order. Request stock from the Purchase Order Requests menu before approving.');
                }
                $delivery = convertOrderToDelivery($pdo, $id);
                $invoiceNo = ensureSalesInvoiceForOrder($pdo, $id);
                $notice = $invoiceNo ? "Order approved, invoice {$invoiceNo} was generated automatically, and delivery {$delivery} was created." : "Order approved and converted to Delivery {$delivery}.";
            } else {
                $update = $pdo->prepare("UPDATE sales_orders SET admin_status = 'Rejected', status = 'Cancelled' WHERE so_id = ? AND admin_status = 'Pending'");
                $update->execute([$id]);
                $notice = $update->rowCount() ? 'Sales order rejected.' : 'Sales order is no longer pending.';
            }
        } catch (Throwable $e) {
            $error = $e->getMessage();
        }
    }
}

$page = max(1, (int)($_GET['page'] ?? 1));
$perPage = 10;
$total = (int)$pdo->query("SELECT COUNT(*) FROM sales_orders WHERE admin_status = 'Pending'")->fetchColumn();
$totalPages = max(1, (int)ceil($total / $perPage));
$page = min($page, $totalPages);
$offset = ($page - 1) * $perPage;

$rows = $pdo->prepare("SELECT o.*, c.customer_name FROM sales_orders o JOIN customers c ON c.cus_id = o.customer_id WHERE o.admin_status = 'Pending' ORDER BY o.so_id DESC LIMIT ? OFFSET ?");
$rows->bindValue(1, $perPage, PDO::PARAM_INT);
$rows->bindValue(2, $offset, PDO::PARAM_INT);
$rows->execute();
$orders = $rows->fetchAll(PDO::FETCH_ASSOC);

$pageTitle = 'Sales Order Approval';
include __DIR__ . '/includes/header.php';
?>

<?php if ($notice): ?><div class="alert success"><?= htmlspecialchars($notice) ?></div><?php endif; ?>
<?php if ($error): ?><div class="alert error"><?= htmlspecialchars($error) ?></div><?php endif; ?>

<div class="panel" style="margin-top:18px;">
    <div class="panel-head">
        <div>
            <p class="eyebrow dark">SALES ORDER APPROVAL</p>
            <h2 style="margin:0;">Order Approval</h2>
        </div>
    </div>
    <div class="table-wrap">
        <table class="data-table">
            <thead>
                <tr>
                    <th>Order No.</th>
                    <th>Customer</th>
                    <th>Transaction Date</th>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                <?php if (!$orders): ?>
                    <tr><td colspan="8" class="empty-row">No pending sales order approvals.</td></tr>
                <?php endif; ?>
                <?php foreach ($orders as $row): ?>
                    <tr>
                        <td><strong><?= htmlspecialchars($row['order_no']) ?></strong></td>
                        <td><?= htmlspecialchars($row['customer_name']) ?></td>
                        <td><?= niceDate($row['order_date']) ?></td>
                        <td><?= htmlspecialchars($row['product_code']) ?></td>
                        <td><?= (int)$row['quantity'] ?></td>
                        <td><?= peso((float)$row['total_amount']) ?></td>
                        <td><span class="badge warning"><?= htmlspecialchars($row['admin_status']) ?></span></td>
                        <td>
                            <form method="POST" class="inline-actions approval-form" style="display:inline;">
                                <input type="hidden" name="type" value="order">
                                <input type="hidden" name="id" value="<?= (int)$row['so_id'] ?>">
                                <button type="submit" class="primary-btn" name="decision" value="Approved">Approve</button>
                                <button type="submit" class="secondary-btn" name="decision" value="Rejected">Reject</button>
                            </form>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>

    <?php if ($totalPages > 1): ?>
        <div class="pagination" style="margin-top:18px; display:flex; justify-content:center; gap:8px; align-items:center;">
            <?php if ($page > 1): ?><a class="secondary-btn" href="sales_order_approval.php?page=<?= (int)($page - 1) ?>">Previous</a><?php endif; ?>
            <span>Page <?= (int)$page ?> of <?= (int)$totalPages ?></span>
            <?php if ($page < $totalPages): ?><a class="secondary-btn" href="sales_order_approval.php?page=<?= (int)($page + 1) ?>">Next</a><?php endif; ?>
        </div>
    <?php endif; ?>
</div>

<?php include __DIR__ . '/includes/footer.php'; ?>
