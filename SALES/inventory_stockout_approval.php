<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';

requireSalesAdmin();

$pdo = getDB();
$pageTitle = 'Inventory Stockout Status';
$error = '';
$notice = !empty($_GET['request_number'])
    ? 'Finished-goods stock request sent to Inventory. Request No.: ' . (string)$_GET['request_number']
    : '';
$stockRequestProducts = [];

try {
    $stockRequestProducts = getInventoryFinishedGoods();
} catch (Throwable $e) {
    $error = 'Could not load active finished goods from Inventory API: ' . $e->getMessage();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['type'] ?? '') === 'specific_stock_request') {
    $productName = trim((string)($_POST['product_name'] ?? ''));
    $selectedItemId = (int)($_POST['item_id'] ?? 0);
    $quantity = filter_var($_POST['quantity'] ?? null, FILTER_VALIDATE_FLOAT);
    $remarks = trim((string)($_POST['remarks'] ?? ''));
    $selectedItem = null;
    foreach ($stockRequestProducts as $candidate) {
        if ((int)($candidate['item_id'] ?? 0) === $selectedItemId) {
            $selectedItem = $candidate;
            break;
        }
    }

    if (
        $productName === ''
        || !$selectedItem
        || (string)($selectedItem['item_name'] ?? '') !== $productName
        || $quantity === false
        || $quantity <= 0
        || floor((float)$quantity) !== (float)$quantity
    ) {
        $error = 'Select a finished good and size, then enter a positive whole-number quantity.';
    } else {
        try {
            $result = createTeamSalesStockoutRequest(
                $pdo,
                (string)$selectedItem['item_code'],
                (float)$quantity,
                $remarks !== '' ? $remarks : 'Specific finished-goods stock request from Sales Admin',
                (string)($selectedItem['size'] ?? '')
            );
            logActivity(
                $pdo,
                'Create',
                'Inventory Stock Request',
                'Created finished-goods stock request ' . ($result['request_number'] ?? ''),
                (int)($result['request_id'] ?? 0)
            );

            header('Location: inventory_stockout_approval.php?request_number=' . rawurlencode((string)$result['request_number']));
            exit;
        } catch (Throwable $e) {
            $error = 'Could not send the stock request: ' . $e->getMessage();
        }
    }
}

try {
    syncInventoryStockouts($pdo);
} catch (Throwable $e) {
    $error = 'Could not sync Inventory System stock-outs: ' . $e->getMessage();
}

/* Inventory System is the only authority for approving/disapproving stock requests. Team Sales only monitors the synchronized status here. */
/* Sync again after a request/approval so the page immediately reflects changes. */
try {
    syncInventoryStockouts($pdo);
} catch (Throwable $e) {
    if ($error === '') {
        $error = 'Could not refresh Inventory System stock-outs: ' . $e->getMessage();
    }
}

$stockouts = $pdo->query("
    SELECT *
    FROM inventory_stockout_approvals isa
    WHERE isa.destination = 'Sales'
      /* Once Inventory has actually created a stock-out for the same
         Sales product/quantity, hide the old local Requested row.
         The Stocked Out row becomes the only row Sales needs to approve. */
      AND NOT (
            isa.request_status = 'Requested'
            AND EXISTS (
                SELECT 1
                FROM inventory_stockout_approvals so
                WHERE so.destination = 'Sales'
                  AND so.request_status IN ('Stocked Out', 'Approved')
                  AND so.stock_out_number IS NOT NULL
                  AND so.stock_out_number <> ''
                  AND so.product_code = isa.product_code
                  AND ABS(CAST(so.quantity AS DECIMAL(18,4)) - CAST(isa.quantity AS DECIMAL(18,4))) < 0.0001
                  AND DATE(COALESCE(so.stocked_out_at, so.requested_at)) >= DATE(isa.requested_at)
            )
      )
    ORDER BY
        CASE request_status
            WHEN 'Requested' THEN 1
            WHEN 'Inventory Approved' THEN 2
            WHEN 'Stocked Out' THEN 3
            WHEN 'Rejected' THEN 4
            WHEN 'Approved' THEN 5
            ELSE 5
        END,
        id DESC
")->fetchAll();

$pendingApprovalCount = (int)$pdo->query("
    SELECT COUNT(*)
    FROM inventory_stockout_approvals
    WHERE destination = 'Sales'
      AND request_status = 'Stocked Out'
")->fetchColumn();

$requestedCount = (int)$pdo->query("
    SELECT COUNT(*)
    FROM inventory_stockout_approvals isa
    WHERE isa.destination = 'Sales'
      AND isa.request_status = 'Requested'
      AND NOT EXISTS (
          SELECT 1
          FROM inventory_stockout_approvals so
          WHERE so.destination = 'Sales'
            AND so.request_status IN ('Stocked Out', 'Approved')
            AND so.stock_out_number IS NOT NULL
            AND so.stock_out_number <> ''
            AND so.product_code = isa.product_code
            AND ABS(CAST(so.quantity AS DECIMAL(18,4)) - CAST(isa.quantity AS DECIMAL(18,4))) < 0.0001
            AND DATE(COALESCE(so.stocked_out_at, so.requested_at)) >= DATE(isa.requested_at)
      )
")->fetchColumn();
$inventoryApprovedCount = (int)$pdo->query("
    SELECT COUNT(*)
    FROM inventory_stockout_approvals
    WHERE destination = 'Sales'
      AND request_status = 'Inventory Approved'
")->fetchColumn();
$requestGroups = [
    [
        'title' => 'Waiting for Inventory',
        'description' => 'Requests awaiting Inventory action or stock-out synchronization.',
        'statuses' => ['Requested', 'Inventory Approved'],
        'empty' => 'No requests are waiting for Inventory.',
    ],
    [
        'title' => 'Added to Team Sales Inventory',
        'description' => 'Stock-outs received from Inventory and added to Team Sales stock.',
        'statuses' => ['Stocked Out', 'Approved'],
        'empty' => 'No requested stock has been added to Team Sales Inventory yet.',
    ],
    [
        'title' => 'Declined by Inventory',
        'description' => 'Requests declined by Inventory.',
        'statuses' => ['Rejected'],
        'empty' => 'No requests have been declined.',
    ],
];
foreach ($requestGroups as &$group) {
    $group['rows'] = array_values(array_filter(
        $stockouts,
        static fn(array $row): bool => in_array($row['request_status'], $group['statuses'], true)
    ));
}
unset($group);

include __DIR__ . '/includes/header.php';
?>
<?php if ($error): ?>
    <div class="alert error"><?= htmlspecialchars($error) ?></div>
<?php endif; ?>
<?php if ($notice): ?>
    <div class="alert success"><?= htmlspecialchars($notice) ?></div>
<?php endif; ?>

<section class="stats-grid" style="margin-top:18px;">
    <div class="stat-card">
        <div class="stat-icon red">!</div>
        <div><span>Stockout Status</span><strong><?= $pendingApprovalCount ?></strong><small>Stocked out by Inventory System</small></div>
    </div>
    <div class="stat-card">
        <div class="stat-icon dark">↗</div>
        <div><span>Requests in Inventory</span><strong><?= $requestedCount ?></strong><small>Waiting for Inventory approval</small></div>
    </div>
    <div class="stat-card">
        <div class="stat-icon burgundy">✓</div>
        <div><span>Approved by Inventory</span><strong><?= $inventoryApprovedCount ?></strong><small>Waiting for stock-out synchronization</small></div>
    </div>
</section>

<section class="content-grid" style="grid-template-columns:1fr;margin-top:18px;">
    <div class="panel">
        <div class="panel-head">
            <div>
                <p class="eyebrow">INVENTORY REQUEST</p>
                <h2 style="margin:0;">Request Finished Goods from Inventory</h2>
                <p style="color:var(--muted);margin:5px 0 0;">
                    Select a product name, choose one of its available sizes and product codes, then enter the quantity.
                </p>
            </div>
        </div>
        <?php if ($stockRequestProducts): ?>
            <form method="POST" class="stock-request-inline-form">
                <input type="hidden" name="type" value="specific_stock_request">
                <label>
                    <span>Product Name</span>
                    <select name="product_name" id="stockRequestProductName" required>
                        <option value="">Select a product</option>
                        <?php
                        $seenProducts = [];
                        foreach ($stockRequestProducts as $product):
                            $productName = (string)$product['item_name'];
                            if (isset($seenProducts[$productName])) continue;
                            $seenProducts[$productName] = true;
                        ?>
                            <option value="<?= htmlspecialchars($productName, ENT_QUOTES, 'UTF-8') ?>">
                                <?= htmlspecialchars($productName, ENT_QUOTES, 'UTF-8') ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </label>
                <label>
                    <span>Size / Product Code</span>
                    <select name="item_id" id="stockRequestProductVariant" required disabled>
                        <option value="">Select a product first</option>
                    </select>
                </label>
                <label>
                    <span>Quantity</span>
                    <input type="number" name="quantity" min="1" step="1" required>
                </label>
                <label>
                    <span>Remarks (optional)</span>
                    <input type="text" name="remarks" maxlength="500" placeholder="Reason or additional instructions">
                </label>
                <div class="stock-request-inline-actions">
                    <button type="submit" class="primary-btn">Send to Inventory</button>
                </div>
            </form>
        <?php else: ?>
            <div class="note-card">
                <b>No active finished goods are available to request.</b>
                <span>Check that Inventory has active Finished Good items linked to active finished goods.</span>
            </div>
        <?php endif; ?>
    </div>
</section>

<section class="content-grid" style="grid-template-columns:1fr;margin-top:18px;">
    <div class="panel">
        <div class="panel-head">
            <div>
                <p class="eyebrow">INVENTORY SYSTEM → TEAM SALES</p>
                <h2 style="margin:0;">Inventory Stockout Status</h2>
                <p style="color:var(--muted);margin:5px 0 0;">
                    Inventory System is the only authority that approves and performs the stock-out. Team Sales only receives and monitors the synchronized result.
                </p>
            </div>
        </div>

        <?php foreach ($requestGroups as $group): ?>
        <section class="stockout-status-group">
            <div class="panel-head">
                <div>
                    <h3 style="margin:0;"><?= htmlspecialchars($group['title']) ?> <span class="badge neutral"><?= count($group['rows']) ?></span></h3>
                    <p class="muted" style="margin:5px 0 0;"><?= htmlspecialchars($group['description']) ?></p>
                </div>
            </div>
        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>STOCKOUT NO.</th>
                        <th>REQUEST NO.</th>
                        <th>PRODUCT</th>
                        <th>QTY</th>
                        <th>DATE / LAST STATUS</th>
                        <th>STATUS</th>
                        <th>ACTION</th>
                    </tr>
                </thead>
                <tbody>
                <?php if (!$group['rows']): ?>
                    <tr><td colspan="7" style="text-align:center;padding:30px;"><?= htmlspecialchars($group['empty']) ?></td></tr>
                <?php else: ?>
                    <?php foreach ($group['rows'] as $row): ?>
                    <?php
                    $statusDate = match ($row['request_status']) {
                        'Inventory Approved', 'Stocked Out', 'Approved' => $row['inventory_approved_at'] ?? $row['stocked_out_at'] ?? $row['requested_at'],
                        'Rejected' => $row['reviewed_at'] ?? $row['requested_at'],
                        default => $row['requested_at'],
                    };
                    ?>
                    <tr>
                        <td><strong><?= htmlspecialchars(trim((string)($row['stock_out_number'] ?? '')) !== '' ? $row['stock_out_number'] : 'Not returned by Inventory') ?></strong></td>
                        <td><?= htmlspecialchars($row['inventory_request_number'] ?? '—') ?></td>
                        <td>
                            <strong><?= htmlspecialchars($row['product_code']) ?></strong><br>
                            <small><?= htmlspecialchars($row['product_name']) ?></small>
                        </td>
                        <td><?= htmlspecialchars(rtrim(rtrim(number_format((float)$row['quantity'], 2, '.', ''), '0'), '.')) ?> <?= htmlspecialchars($row['unit']) ?></td>
                        <td><?= htmlspecialchars((string)$statusDate) ?></td>
                        <td><span class="badge <?= badgeClass($row['request_status']) ?>"><?= htmlspecialchars($row['request_status']) ?></span></td>
                        <td>
                            <?php if (in_array($row['request_status'], ['Stocked Out', 'Approved'], true)): ?>
                                <span class="badge success">Inventory approved • Added to Team Sales Inventory</span>
                            <?php elseif ($row['request_status'] === 'Inventory Approved'): ?>
                                <span class="badge warning">Approved by Inventory • Waiting for Sales receipt approval</span>
                            <?php elseif ($row['request_status'] === 'Requested'): ?>
                                <span class="muted">Waiting for Inventory</span>
                            <?php elseif ($row['request_status'] === 'Rejected'): ?>
                                <span class="badge danger">Declined by Inventory</span>
                            <?php else: ?>
                                <span class="muted">—</span>
                            <?php endif; ?>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                <?php endif; ?>
                </tbody>
            </table>
        </div>
        </section>
        <?php endforeach; ?>
    </div>
</section>

<style>
.stockout-status-group+.stockout-status-group{margin-top:24px;padding-top:18px;border-top:1px solid var(--line)}
.stockout-status-group .panel-head{margin-bottom:12px}
.stock-request-inline-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:18px}
.stock-request-inline-form label{display:grid;gap:7px;font-weight:600}
.stock-request-inline-form label>span{font-size:13px}
.stock-request-inline-form input,.stock-request-inline-form select{width:100%;box-sizing:border-box;border:1px solid var(--line);border-radius:10px;padding:12px 13px;font:inherit;background:#fff}
.stock-request-inline-actions{grid-column:1/-1;display:flex;justify-content:flex-end}
@media(max-width:650px){.stock-request-inline-form{grid-template-columns:1fr}.stock-request-inline-actions{grid-column:auto}}
</style>

<script>
document.addEventListener('DOMContentLoaded', function () {
    const productSelect = document.getElementById('stockRequestProductName');
    const variantSelect = document.getElementById('stockRequestProductVariant');
    if (!productSelect || !variantSelect) return;

    const variants = <?= json_encode(array_values($stockRequestProducts), JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT) ?>;
    function updateVariants() {
        variantSelect.innerHTML = '<option value="">Select a size and product code</option>';
        const matchingVariants = variants.filter(function (product) {
            return String(product.item_name) === productSelect.value;
        });
        matchingVariants.forEach(function (product) {
            const size = product.size ? String(product.size) : '';
            const option = document.createElement('option');
            option.value = String(product.item_id);
            option.textContent = (size || 'Standard / no size') + ' · ' + String(product.item_code)
                + (product.unit ? ' · ' + String(product.unit) : '');
            variantSelect.appendChild(option);
        });
        variantSelect.disabled = matchingVariants.length === 0;
    }
    productSelect.addEventListener('change', updateVariants);
});
</script>

<?php include __DIR__ . '/includes/footer.php'; ?>
