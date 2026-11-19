<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';
require_once __DIR__ . '/config/inventory_api.php';

requireSalesAdmin();

if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

$pdo = getDB();
$error = '';
$notice = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'approve_receipt') {
    $approvalId = (int)($_POST['approval_id'] ?? 0);
    $csrf = (string)($_POST['csrf_token'] ?? '');

    try {
        if (!hash_equals((string)$_SESSION['csrf_token'], $csrf)) {
            throw new RuntimeException('Your session token expired. Refresh the page and try again.');
        }

        $approvalStmt = $pdo->prepare("SELECT * FROM inventory_delivery_approvals WHERE approval_id = ? AND approval_status = 'Pending' LIMIT 1");
        $approvalStmt->execute([$approvalId]);
        $approval = $approvalStmt->fetch(PDO::FETCH_ASSOC);
        if (!$approval) {
            throw new RuntimeException('This delivery is no longer waiting for Sales approval.');
        }

        $requestNumber = (string)$approval['inventory_request_number'];
        $deliveryResponse = inventoryApiRequest('GET', 'deliveries.php', ['request_number' => $requestNumber]);
        $delivery = null;
        foreach (($deliveryResponse['data'] ?? []) as $candidate) {
            if ((string)($candidate['request_number'] ?? '') === $requestNumber) {
                $delivery = $candidate;
                break;
            }
        }
        if (!$delivery || ($delivery['destination'] ?? '') !== 'Sales') {
            throw new RuntimeException('The Inventory delivery could not be found for Team Sales.');
        }
        if (($delivery['delivery_status'] ?? '') !== 'Out for Delivery') {
            throw new RuntimeException('Inventory must confirm the delivery as Out for Delivery before Sales can approve receipt.');
        }

        try {
            inventoryApiRequest('POST', 'accept-delivery.php', ['request_number' => $requestNumber]);
        } catch (Throwable $acceptError) {
            // Recover safely if Inventory accepted the receipt but Sales did not receive the response.
            $latestResponse = inventoryApiRequest('GET', 'deliveries.php', ['request_number' => $requestNumber]);
            $alreadyDelivered = false;
            foreach (($latestResponse['data'] ?? []) as $candidate) {
                if (
                    (string)($candidate['request_number'] ?? '') === $requestNumber
                    && (string)($candidate['destination'] ?? '') === 'Sales'
                    && (string)($candidate['delivery_status'] ?? '') === 'Delivered'
                ) {
                    $alreadyDelivered = true;
                    break;
                }
            }
            if (!$alreadyDelivered) {
                throw $acceptError;
            }
        }

        // Inventory reports Delivered only after this Sales approval. The stock sync
        // therefore credits the received quantities once, after receipt confirmation.
        syncInventoryStockouts($pdo);

        $receiptNumber = '';
        try {
            $receiptResponse = inventoryApiRequest('GET', 'delivery-receipts.php', ['request_number' => $requestNumber]);
            $receiptNumber = trim((string)($receiptResponse['data']['dr_number'] ?? ''));
        } catch (Throwable $receiptError) {
            // Receipt creation succeeded with accept-delivery; keep Sales approval even if receipt lookup is delayed.
        }

        $update = $pdo->prepare("UPDATE inventory_delivery_approvals
            SET approval_status = 'Approved', inventory_delivery_status = 'Delivered',
                inventory_receipt_number = ?, approved_by = ?, approved_at = NOW()
            WHERE approval_id = ? AND approval_status = 'Pending'");
        $update->execute([
            $receiptNumber !== '' ? $receiptNumber : null,
            (int)(currentUser()['user_id'] ?? 0),
            $approvalId,
        ]);
        if ($update->rowCount() !== 1) {
            throw new RuntimeException('Inventory created the Delivery Receipt, but the Sales approval record could not be updated. Refresh and check the request status.');
        }

        logActivity($pdo, 'Approve', 'Inventory Delivery', 'Approved receipt for Inventory request ' . $requestNumber . ($receiptNumber !== '' ? ' (' . $receiptNumber . ')' : ''), $approvalId);
        $notice = 'Receipt approved for ' . $requestNumber . '. The Delivery Receipt is now available in Inventory.'
            . ($receiptNumber !== '' ? ' Receipt No.: ' . $receiptNumber : '');
    } catch (Throwable $e) {
        $error = $e->getMessage();
    }
}

try {
    syncInventoryDeliveryApprovals($pdo);
} catch (Throwable $e) {
    if ($error === '') {
        $error = 'Could not refresh Inventory deliveries: ' . $e->getMessage();
    }
}

$rows = $pdo->query("SELECT * FROM inventory_delivery_approvals
    ORDER BY CASE approval_status WHEN 'Pending' THEN 0 ELSE 1 END, created_at DESC
    LIMIT 100")->fetchAll(PDO::FETCH_ASSOC);
$pendingCount = 0;
foreach ($rows as $row) {
    if ($row['approval_status'] === 'Pending') $pendingCount++;
}

$pageTitle = 'Inventory Delivery Approval';
include __DIR__ . '/includes/header.php';
?>

<?php if ($notice): ?><div class="alert success"><?= htmlspecialchars($notice) ?></div><?php endif; ?>
<?php if ($error): ?><div class="alert error"><?= htmlspecialchars($error) ?></div><?php endif; ?>

<div class="page-toolbar">
    <p class="muted" style="color:white;">Requests from Purchase Order Requests and Request Stock from Inventory follow this same step. Inventory deliveries marked Out for Delivery appear here. Approving receipt confirms delivery to Team Sales, creates the Delivery Receipt in Inventory, and adds the received quantity to Sales inventory.</p>
</div>

<div class="panel" style="margin-top:18px;">
    <div class="panel-head">
        <div>
            <p class="eyebrow dark">SALES ADMIN</p>
            <h2 style="margin:0;">Inventory Delivery Approval <span class="badge neutral"><?= $pendingCount ?> pending</span></h2>
        </div>
    </div>
    <div class="table-wrap">
        <table class="data-table">
            <thead>
                <tr>
                    <th>Inventory Request</th>
                    <th>Items Delivered</th>
                    <th>Inventory Status</th>
                    <th>Sales Approval</th>
                    <th>Delivery Receipt</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                <?php if (!$rows): ?>
                    <tr><td colspan="6" class="empty-row">No Inventory deliveries are waiting for Sales approval.</td></tr>
                <?php endif; ?>
                <?php foreach ($rows as $row): ?>
                    <?php $items = json_decode((string)$row['items_json'], true); $items = is_array($items) ? $items : []; ?>
                    <tr>
                        <td><strong><?= htmlspecialchars($row['inventory_request_number']) ?></strong><br><small>Delivery ID: <?= (int)$row['inventory_delivery_id'] ?></small></td>
                        <td>
                            <?php foreach ($items as $item): ?>
                                <div><strong><?= htmlspecialchars((string)($item['item_name'] ?? 'Item')) ?></strong><?= !empty($item['size']) ? ' / Size ' . htmlspecialchars((string)$item['size']) : '' ?><br>
                                    <small><?= htmlspecialchars((string)($item['delivered_quantity'] ?? 0)) ?> / <?= htmlspecialchars((string)($item['approved_quantity'] ?? $item['requested_quantity'] ?? 0)) ?> <?= htmlspecialchars((string)($item['unit'] ?? 'pcs')) ?></small>
                                </div>
                            <?php endforeach; ?>
                        </td>
                        <td><span class="badge success"><?= htmlspecialchars($row['inventory_delivery_status']) ?></span></td>
                        <td><span class="badge <?= $row['approval_status'] === 'Pending' ? 'warning' : 'success' ?>"><?= htmlspecialchars($row['approval_status']) ?></span></td>
                        <td><?= htmlspecialchars((string)($row['inventory_receipt_number'] ?: 'Not generated')) ?></td>
                        <td>
                            <?php if ($row['approval_status'] === 'Pending'): ?>
                                <form method="POST" onsubmit="return confirm('Approve receipt for <?= htmlspecialchars($row['inventory_request_number'], ENT_QUOTES) ?>? This creates the Delivery Receipt in Inventory.');">
                                    <input type="hidden" name="action" value="approve_receipt">
                                    <input type="hidden" name="approval_id" value="<?= (int)$row['approval_id'] ?>">
                                    <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($_SESSION['csrf_token'], ENT_QUOTES) ?>">
                                    <button class="primary-btn" type="submit">Approve Receipt</button>
                                </form>
                            <?php else: ?>
                                <span class="muted">Approved<?= !empty($row['approved_at']) ? ' ' . htmlspecialchars((string)$row['approved_at']) : '' ?></span>
                            <?php endif; ?>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>

<?php include __DIR__ . '/includes/footer.php'; ?>
