<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';
requireSalesAdmin();

$pdo = getDB();
$error = '';
$notice = '';

try {
    syncInventoryStockouts($pdo);
} catch (Throwable $e) {
    $error = 'Could not refresh Inventory status: ' . $e->getMessage();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'request_stock') {
    $poId = (int)($_POST['po_id'] ?? 0);
    try {
        $stmt = $pdo->prepare("
            SELECT po.*, q.quotation_no, c.customer_name
            FROM purchase_orders po
            JOIN sales_quotations q ON q.sq_id = po.quotation_id
            JOIN customers c ON c.cus_id = po.customer_id
            WHERE po.po_id = ? AND po.status = 'Open'
            LIMIT 1
        ");
        $stmt->execute([$poId]);
        $po = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$po) {
            throw new RuntimeException('Purchase Order not found or it is no longer open.');
        }

        $required = (int)$po['quantity'];
        if ($required <= 0) {
            throw new RuntimeException('This Purchase Order has an invalid quantity.');
        }

        $stock = getTeamSalesInventory($pdo, (string)$po['product_code']);
        $available = (float)($stock['stock_quantity'] ?? 0);
        if ($stock && ($stock['status'] ?? '') === 'Active' && $available >= $required) {
            throw new RuntimeException('Team Sales Inventory already has enough stock for this Purchase Order.');
        }

        $existingStmt = $pdo->prepare("
            SELECT request_status, inventory_request_number
            FROM inventory_stockout_approvals
            WHERE source_reference = ? AND product_code = ?
            ORDER BY id DESC
            LIMIT 1
        ");
        $existingStmt->execute([(string)$po['po_no'], (string)$po['product_code']]);
        $existingRequest = $existingStmt->fetch(PDO::FETCH_ASSOC);
        if ($existingRequest && in_array($existingRequest['request_status'], ['Requested', 'Inventory Approved', 'Stocked Out'], true)) {
            $requestNo = trim((string)($existingRequest['inventory_request_number'] ?? ''));
            throw new RuntimeException('A stock request is already in progress for this PO.' . ($requestNo !== '' ? ' Request No.: ' . $requestNo : ''));
        }

        $result = createTeamSalesStockoutRequest(
            $pdo,
            (string)$po['product_code'],
            $required,
            (string)$po['po_no'],
            (string)($po['size'] ?? ''),
            (string)$po['po_no']
        );

        logActivity(
            $pdo,
            'Create',
            'Purchase Order Stock Request',
            'Requested the full PO quantity of ' . $required . ' ' . ($stock['unit'] ?? 'pcs') . ' for ' . $po['po_no'] . ' from Inventory. Request ' . ($result['request_number'] ?? ''),
            $poId
        );
        $notice = 'Stock request sent to Inventory for ' . $po['po_no'] . '. Request No.: ' . ($result['request_number'] ?? '');
    } catch (Throwable $e) {
        $error = $e->getMessage();
    }
}

$orders = $pdo->query("
    SELECT po.*, q.quotation_no, c.customer_name
    FROM purchase_orders po
    JOIN sales_quotations q ON q.sq_id = po.quotation_id
    JOIN customers c ON c.cus_id = po.customer_id
    WHERE po.status <> 'Cancelled'
    ORDER BY po.po_id DESC
")->fetchAll(PDO::FETCH_ASSOC);

$requestStmt = $pdo->prepare("
    SELECT inventory_request_number, request_status, requested_at
    FROM inventory_stockout_approvals
    WHERE source_reference = ? AND product_code = ?
    ORDER BY id DESC
    LIMIT 1
");
foreach ($orders as &$order) {
    $stock = getTeamSalesInventory($pdo, (string)$order['product_code']);
    $order['available_stock'] = (float)($stock['stock_quantity'] ?? 0);
    $order['enough_stock'] = $stock
        && ($stock['status'] ?? '') === 'Active'
        && $order['available_stock'] >= (int)$order['quantity'];
    $requestStmt->execute([(string)$order['po_no'], (string)$order['product_code']]);
    $order['stock_request'] = $requestStmt->fetch(PDO::FETCH_ASSOC) ?: null;
}
unset($order);

$pageTitle = 'Purchase Order Requests';
include __DIR__ . '/includes/header.php';
?>

<?php if ($notice): ?><div class="alert success"><?= htmlspecialchars($notice) ?></div><?php endif; ?>
<?php if ($error): ?><div class="alert error"><?= htmlspecialchars($error) ?></div><?php endif; ?>

<div class="page-toolbar">
    <p class="muted" style="color:white;">Customer-approved quotations appear here as Purchase Orders. When Sales stock is short, request the full PO quantity from Inventory; requests are matched to the PO number. After Inventory dispatches the stock, approve its receipt before it is added to Sales inventory.</p>
    <a class="primary-btn" href="inventory_delivery_approval.php">Review Inventory Deliveries</a>
</div>

<div class="panel" style="margin-top:18px;">
    <div class="table-wrap">
        <table class="data-table">
            <thead>
                <tr>
                    <th>PO No.</th>
                    <th>Quotation</th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th>PO Qty</th>
                    <th>Sales Stock</th>
                    <th>Inventory Request</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                <?php if (!$orders): ?>
                    <tr><td colspan="8" class="empty-row">No customer-approved Purchase Orders yet.</td></tr>
                <?php endif; ?>
                <?php foreach ($orders as $order): ?>
                    <?php
                        $stockRequest = $order['stock_request'];
                        $requestStatus = (string)($stockRequest['request_status'] ?? '');
                        $requestInProgress = in_array($requestStatus, ['Requested', 'Inventory Approved', 'Stocked Out'], true);
                    ?>
                    <tr>
                        <td><strong><?= htmlspecialchars($order['po_no']) ?></strong><br><small><?= htmlspecialchars($order['status']) ?></small></td>
                        <td><?= htmlspecialchars($order['quotation_no']) ?></td>
                        <td><?= htmlspecialchars($order['customer_name']) ?></td>
                        <td><?= htmlspecialchars($order['product_code']) ?><?= !empty($order['size']) ? ' · Size ' . htmlspecialchars($order['size']) : '' ?></td>
                        <td><?= (int)$order['quantity'] ?></td>
                        <td>
                            <?= number_format($order['available_stock'], 2) ?> available
                            <?php if (!$order['enough_stock']): ?><span class="badge warning">Short <?= number_format(max(0, (int)$order['quantity'] - $order['available_stock']), 2) ?></span><?php else: ?><span class="badge success">Enough</span><?php endif; ?>
                        </td>
                        <td>
                            <?php if ($stockRequest): ?>
                                <?= htmlspecialchars($stockRequest['inventory_request_number'] ?? 'Request sent') ?><br>
                                <span class="badge <?= badgeClass($requestStatus) ?>"><?= htmlspecialchars($requestStatus) ?></span>
                            <?php else: ?>
                                <span class="muted">No request</span>
                            <?php endif; ?>
                        </td>
                        <td>
                            <?php if ($order['status'] !== 'Open'): ?>
                                <span class="muted">PO already processed</span>
                            <?php elseif ($order['enough_stock']): ?>
                                <span class="badge success">Stock available</span>
                            <?php elseif ($requestInProgress): ?>
                                <button class="secondary-btn" type="button" disabled>Waiting for Inventory</button>
                            <?php else: ?>
                                <form method="POST" onsubmit="return confirm('Send a request for the stock shortage on <?= htmlspecialchars($order['po_no'], ENT_QUOTES) ?>?')">
                                    <input type="hidden" name="action" value="request_stock">
                                    <input type="hidden" name="po_id" value="<?= (int)$order['po_id'] ?>">
                                    <button class="primary-btn" type="submit">Request Stock (<?= (int)$order['quantity'] ?>)</button>
                                </form>
                            <?php endif; ?>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>

<?php include __DIR__ . '/includes/footer.php'; ?>
