<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';
requireSalesWorkspace();
$pdo = getDB();

$error = '';
$notice = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'convert') {
        $poId = (int) ($_POST['po_id'] ?? 0);
        $stmt = $pdo->prepare("SELECT * FROM purchase_orders WHERE po_id = ? AND status = 'Open'");
        $stmt->execute([$poId]);
        $po = $stmt->fetch();

        if (!$po) {
            $error = 'Purchase Order not found or already converted.';
        } else {
            $salesStock = getTeamSalesInventory($pdo, (string)$po['product_code']);
            $available = (float)($salesStock['stock_quantity'] ?? 0);
            if (!$salesStock || ($salesStock['status'] ?? '') !== 'Active' || $available < (int)$po['quantity']) {
                $error = 'There is not enough Team Sales stock to create a Sales Order. Request the shortage from the Purchase Order Requests menu first.';
            } else {
            $orderNo = nextDocNo($pdo, 'sales_orders', 'SO-', 1000);
            $pay = $pdo->prepare("SELECT payment_method,payment_status,payment_reference,paid_at,receipt_no FROM sales_quotations WHERE sq_id=?");
            $pay->execute([$po['quotation_id']]);
            $payment = $pay->fetch() ?: ['payment_method' => 'Cash', 'payment_status' => 'Pending', 'payment_reference' => null, 'paid_at' => null, 'receipt_no' => null];
            $pdo->beginTransaction();
            try {
                $insertOrder = $pdo->prepare("INSERT INTO sales_orders
                    (order_no, quotation_id, customer_id, order_date, product_code, size, quantity, total_amount, status, admin_status, payment_method, payment_status, payment_reference, paid_at, receipt_no)
                    VALUES (?,?,?,?,?,?,?,?,'Pending','Pending',?,?,?,?,?)");
                $insertOrder->execute([
                        $orderNo,
                        $po['quotation_id'],
                        $po['customer_id'],
                        date('Y-m-d'),
                        $po['product_code'],
                        $po['size'] ?? null,
                        $po['quantity'],
                        $po['total_amount'],
                        $payment['payment_method'],
                        $payment['payment_status'],
                        $payment['payment_reference'],
                        $payment['paid_at'],
                        $payment['receipt_no']
                    ]);
                $orderId = (int)$pdo->lastInsertId();
                $customerStmt = $pdo->prepare('SELECT customer_name FROM customers WHERE cus_id = ? LIMIT 1');
                $customerStmt->execute([(int)$po['customer_id']]);
                $customerName = (string)($customerStmt->fetchColumn() ?: 'Customer');
                notifySalesAdminsPendingApproval(
                    $pdo,
                    'sales-order-pending:' . $orderId,
                    'Sales order awaiting approval',
                    'Sales Order ' . $orderNo . ' for ' . $customerName . ' (' . $po['product_code'] . ' · Size ' . ($po['size'] ?? '') . ' × ' . (int)$po['quantity'] . ') is awaiting review.',
                    'sales_order_approval.php'
                );
                $pdo->prepare("UPDATE purchase_orders SET status='Converted', converted_order_no=?, converted_at=NOW() WHERE po_id=?")
                    ->execute([$orderNo, $poId]);
                $pdo->commit();
                logActivity($pdo, 'Create', 'Sales Order', 'Created ' . $orderNo . ' from ' . $po['po_no'], null);
                header('Location: orders.php?section=core&added=1');
                exit;
            } catch (Throwable $e) {
                $pdo->rollBack();
                $error = 'Could not convert the Purchase Order: ' . $e->getMessage();
            }
            }
        }
    }
}

$pageTitle = 'Purchase Orders';
include __DIR__ . '/includes/header.php';

$search = trim($_GET['search'] ?? '');
$sql = "SELECT po.*, q.quotation_no, c.customer_name AS customer_name FROM purchase_orders po JOIN sales_quotations q ON q.sq_id = po.quotation_id JOIN customers c ON c.cus_id = po.customer_id";
$params = [];
if ($search !== '') {
    $sql .= ' WHERE po.po_no LIKE ? OR q.quotation_no LIKE ? OR c.customer_name LIKE ? OR po.product_code LIKE ? OR po.status LIKE ?';
    $like = '%' . $search . '%';
    $params = [$like, $like, $like, $like, $like];
}
$sql .= ' ORDER BY po.po_id DESC';
$stmtRows = $pdo->prepare($sql);
$stmtRows->execute($params);
$rows = $stmtRows->fetchAll();
foreach ($rows as &$row) {
    $stock = getTeamSalesInventory($pdo, (string)$row['product_code']);
    $row['available_stock'] = (float)($stock['stock_quantity'] ?? 0);
    $row['enough_stock'] = $stock
        && ($stock['status'] ?? '') === 'Active'
        && $row['available_stock'] >= (int)$row['quantity'];
}
unset($row);

?>
<div class="page-toolbar">
    <p class="muted" style="color:white;">Purchase Orders are created automatically when the customer approves a quotation. Convert an open PO into a Sales Order when Sales is ready to process it.</p>
</div>
<div class="module-search">
    <form method="GET"><input type="hidden" name="section" value="core"><input type="search" name="search" value="<?= htmlspecialchars($search) ?>" placeholder="Search PO, quotation, customer, product, or status..."><button class="secondary-btn" type="submit">Search</button><?php if ($search !== ''): ?><a class="text-link" href="purchase_orders.php?section=core">Clear</a><?php endif; ?></form>
</div>
<?php if ($notice): ?><div class="alert success"><?= htmlspecialchars($notice) ?></div><?php endif; ?>
<?php if ($error): ?><div class="alert error"><?= htmlspecialchars($error) ?></div><?php endif; ?>

<div class="panel">
    <div class="table-wrap">
        <table>
            <thead>
                <tr>
                    <th>PO No.</th>
                    <th>Quotation</th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                <?php if (!$rows): ?><tr class="empty-row">
                        <td colspan="8">No Purchase Orders yet. They appear after the customer approves a quotation.</td>
                    </tr><?php endif; ?>
                <?php foreach ($rows as $r): ?>
                    <tr>
                        <td><b><?= htmlspecialchars($r['po_no']) ?></b></td>
                        <td><?= htmlspecialchars($r['quotation_no']) ?></td>
                        <td><?= htmlspecialchars($r['customer_name']) ?></td>
                        <td><?= htmlspecialchars($r['product_code']) ?><?= !empty($r['size']) ? ' · Size ' . htmlspecialchars($r['size']) : '' ?></td>
                        <td><?= (int)$r['quantity'] ?></td>
                        <td><?= peso((float)$r['total_amount']) ?></td>
                        <td><span class="badge <?= badgeClass($r['status']) ?>"><?= htmlspecialchars($r['status']) ?></span></td>
                        <td>
                            <a class="table-action" href="po_export.php?id=<?= (int)$r['po_id'] ?>&format=pdf" target="_blank">PDF</a>
                            <a class="table-action" href="po_export.php?id=<?= (int)$r['po_id'] ?>&format=doc">Word</a>
                            <?php if ($r['status'] === 'Open'): ?>
                                <?php if ($r['enough_stock']): ?>
                                    <form method="POST" style="display:inline"><input type="hidden" name="action" value="convert"><input type="hidden" name="po_id" value="<?= (int)$r['po_id'] ?>"><button class="table-action" type="submit">Create Sales Order</button></form>
                                <?php else: ?>
                                    <a class="table-action" href="purchase_order_requests.php">Request Stock</a>
                                <?php endif; ?>
                            <?php else: ?><small><?= htmlspecialchars($r['converted_order_no'] ?? 'Converted') ?></small><?php endif; ?>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>

<?php include __DIR__ . '/includes/footer.php'; ?>
