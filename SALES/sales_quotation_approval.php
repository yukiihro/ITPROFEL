<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';
requireSalesAdmin();

$pdo = getDB();
normalizeExpiredQuotationStatuses($pdo);
$error = '';
$notice = '';

try {
    syncInventoryStockouts($pdo);
} catch (Throwable $e) {
    $error = 'Could not sync Inventory System stock status: ' . $e->getMessage();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['type'] ?? '') === 'quotation') {
    $id = (int)($_POST['id'] ?? 0);
    $decision = $_POST['decision'] ?? '';
    if (!in_array($decision, ['Approved', 'Rejected'], true)) {
        $error = 'Invalid approval decision.';
    } else {
        try {
            $st = $pdo->prepare("SELECT q.*, c.customer_name FROM sales_quotations q JOIN customers c ON c.cus_id = q.customer_id WHERE q.sq_id = ? AND q.admin_status = 'Pending' LIMIT 1");
            $st->execute([$id]);
            $quotation = $st->fetch(PDO::FETCH_ASSOC);
            if (!$quotation) {
                throw new RuntimeException('Quotation is no longer pending.');
            }

            if ($decision === 'Approved') {
                $localStock = getTeamSalesInventory($pdo, (string)$quotation['product_code']);
                $available = (float)($localStock['stock_quantity'] ?? 0);
                $required = (float)$quotation['quantity'];
                $enoughStock = $localStock
                    && $required > 0
                    && $available >= $required
                    && (($localStock['status'] ?? '') === 'Active');
                $upd = $pdo->prepare("UPDATE sales_quotations SET admin_status = 'Approved', inventory_status = ?, inventory_quantity = ?, inventory_checked_at = NOW() WHERE sq_id = ? AND admin_status = 'Pending'");
                $upd->execute([$enoughStock ? 'Approved' : 'Pending', (int)$available, $id]);
                $notice = $upd->rowCount() ? 'Quotation approved.' : 'Quotation is no longer pending.';
            } else {
                $upd = $pdo->prepare("UPDATE sales_quotations SET admin_status = 'Rejected', status = 'Rejected' WHERE sq_id = ? AND admin_status = 'Pending'");
                $upd->execute([$id]);
                $notice = $upd->rowCount() ? 'Quotation rejected.' : 'Quotation is no longer pending.';
            }
        } catch (Throwable $e) {
            $error = $e->getMessage();
        }
    }
}

$page = max(1, (int)($_GET['page'] ?? 1));
$perPage = 10;
$total = (int)$pdo->query("SELECT COUNT(*) FROM sales_quotations WHERE admin_status = 'Pending'")->fetchColumn();
$totalPages = max(1, (int)ceil($total / $perPage));
$page = min($page, $totalPages);
$offset = ($page - 1) * $perPage;

$rows = $pdo->prepare("SELECT q.*, c.customer_name FROM sales_quotations q JOIN customers c ON c.cus_id = q.customer_id WHERE q.admin_status = 'Pending' ORDER BY q.sq_id DESC LIMIT ? OFFSET ?");
$rows->bindValue(1, $perPage, PDO::PARAM_INT);
$rows->bindValue(2, $offset, PDO::PARAM_INT);
$rows->execute();
$quotations = $rows->fetchAll(PDO::FETCH_ASSOC);
foreach ($quotations as &$quotation) {
    $stock = getTeamSalesInventory($pdo, (string)$quotation['product_code']);
    $quotation['available_stock'] = (float)($stock['stock_quantity'] ?? 0);
    $quotation['has_enough_stock'] = $stock
        && ($stock['status'] ?? '') === 'Active'
        && (float)$quotation['quantity'] > 0
        && $quotation['available_stock'] >= (float)$quotation['quantity'];
}
unset($quotation);

$pageTitle = 'Sales Quotation Approval';
include __DIR__ . '/includes/header.php';
?>

<?php if ($notice): ?><div class="alert success"><?= htmlspecialchars($notice) ?></div><?php endif; ?>
<?php if ($error): ?><div class="alert error"><?= htmlspecialchars($error) ?></div><?php endif; ?>

<div class="panel" style="margin-top:18px;">
    <div class="panel-head">
        <div>
            <p class="eyebrow dark">SALES QUOTATION APPROVAL</p>
            <h2 style="margin:0;">Quotation Approval</h2>
        </div>
    </div>
    <div class="table-wrap">
        <table class="data-table">
            <thead>
                <tr>
                    <th>Quotation No.</th>
                    <th>Customer</th>
                    <th>Transaction Date</th>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Inventory</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                <?php if (!$quotations): ?>
                    <tr><td colspan="9" class="empty-row">No pending quotation approvals.</td></tr>
                <?php endif; ?>
                <?php foreach ($quotations as $row): ?>
                    <tr>
                        <td><strong><?= htmlspecialchars($row['quotation_no']) ?></strong></td>
                        <td><?= htmlspecialchars($row['customer_name']) ?></td>
                        <td><?= niceDate($row['quotation_date']) ?></td>
                        <td><?= htmlspecialchars($row['product_code']) ?></td>
                        <td><?= (int)$row['quantity'] ?></td>
                        <td>
                            <?= number_format($row['available_stock'], 0) ?> available
                            <?php if (!$row['has_enough_stock']): ?>
                                <span class="badge warning">Insufficient</span>
                            <?php endif; ?>
                        </td>
                        <td><?= peso((float)$row['total_amount']) ?></td>
                        <td><span class="badge warning"><?= htmlspecialchars($row['admin_status']) ?></span></td>
                        <td>
                            <form method="POST" class="inline-actions approval-form" style="display:inline;">
                                <input type="hidden" name="type" value="quotation">
                                <input type="hidden" name="id" value="<?= (int)$row['sq_id'] ?>">
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
            <?php if ($page > 1): ?><a class="secondary-btn" href="sales_quotation_approval.php?page=<?= (int)($page - 1) ?>">Previous</a><?php endif; ?>
            <span>Page <?= (int)$page ?> of <?= (int)$totalPages ?></span>
            <?php if ($page < $totalPages): ?><a class="secondary-btn" href="sales_quotation_approval.php?page=<?= (int)($page + 1) ?>">Next</a><?php endif; ?>
        </div>
    <?php endif; ?>
</div>

<?php include __DIR__ . '/includes/footer.php'; ?>
