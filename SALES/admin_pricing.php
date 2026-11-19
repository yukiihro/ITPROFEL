<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';

requireSalesAdmin();
$pdo = getDB();
$pageTitle = 'Price & Shipping';
$_SESSION['csrf_token'] = $_SESSION['csrf_token'] ?? bin2hex(random_bytes(32));
$error = '';
$notice = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!hash_equals($_SESSION['csrf_token'], (string)($_POST['csrf_token'] ?? ''))) {
        $error = 'Your session token expired. Refresh the page and try again.';
    } else {
        $action = (string)($_POST['action'] ?? '');
        try {
            if ($action === 'save_price') {
                $inventoryId = (int)($_POST['inventory_id'] ?? 0);
                $rawPrice = trim((string)($_POST['unit_price'] ?? ''));
                if (!preg_match('/^\d{1,10}(?:\.\d{1,2})?$/', $rawPrice)) {
                    throw new RuntimeException('Enter a valid price with up to two decimal places.');
                }
                $stmt = $pdo->prepare("UPDATE inventory SET unit_price=? WHERE inventory_id=? AND status='Active'");
                $stmt->execute([(float)$rawPrice, $inventoryId]);
                if (!$stmt->rowCount()) {
                    $exists = $pdo->prepare("SELECT 1 FROM inventory WHERE inventory_id=? AND status='Active'");
                    $exists->execute([$inventoryId]);
                    if (!$exists->fetchColumn()) throw new RuntimeException('Inventory item not found or inactive.');
                }
                $notice = 'Product price saved.';
            } elseif ($action === 'save_shipping_rate') {
                $rawRate = trim((string)($_POST['rate_per_km'] ?? ''));
                if (!preg_match('/^\d{1,8}(?:\.\d{1,2})?$/', $rawRate)) throw new RuntimeException('Enter a valid rate per kilometer with up to two decimal places.');
                $stmt = $pdo->prepare("INSERT INTO sales_settings (setting_key,setting_value) VALUES ('shipping_rate_per_km',?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)");
                $stmt->execute([(float)$rawRate]);
                $notice = 'Shipping rate per kilometer saved.';
            } else {
                throw new RuntimeException('Unknown update action.');
            }
        } catch (Throwable $e) {
            $error = $e instanceof RuntimeException ? $e->getMessage() : 'Could not save the setting. Please try again.';
        }
    }
}

$rateQuery = $pdo->query("SELECT setting_value FROM sales_settings WHERE setting_key='shipping_rate_per_km' LIMIT 1");
$shippingRatePerKm = $rateQuery->fetchColumn();
$items = $pdo->query("SELECT inventory_id,product_code,product_name,brand,size,unit,stock_quantity,unit_price FROM inventory WHERE status='Active' ORDER BY product_name,size,product_code")->fetchAll();
try {
    $sizesByCode = [];
    foreach (getInventoryFinishedGoods() as $product) {
        $sizesByCode[(string)$product['item_code']] = (string)($product['size'] ?? '');
    }
    foreach ($items as &$item) {
        if (isset($sizesByCode[(string)$item['product_code']])) {
            $item['size'] = $sizesByCode[(string)$item['product_code']];
        }
    }
    unset($item);
} catch (Throwable $e) {
    $error = $error !== ''
        ? $error . ' Could not load product sizes from Inventory System: ' . $e->getMessage()
        : 'Could not load product sizes from Inventory System: ' . $e->getMessage();
}
include __DIR__ . '/includes/header.php';
?>
<?php if ($error): ?><div class="alert error"><?= htmlspecialchars($error) ?></div><?php endif; ?>
<?php if ($notice): ?><div class="alert success"><?= htmlspecialchars($notice) ?></div><?php endif; ?>

<section class="content-grid" style="grid-template-columns:1fr; margin-top:25px;">
    <div class="panel">
        <div class="panel-head"><div><p class="eyebrow">ORIGIN: SAN PABLO CITY, LAGUNA</p><h2 style="margin:0">Road shipping rate</h2><p style="color:var(--muted);margin:5px 0 0">The system calculates driving distance to the customer's saved barangay, then multiplies it by this rate.</p></div></div>
        <form method="post" style="display:flex;gap:12px;align-items:end;flex-wrap:wrap;padding:0 20px 20px">
            <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($_SESSION['csrf_token']) ?>"><input type="hidden" name="action" value="save_shipping_rate">
            <label>Rate (PHP per kilometer)<input type="number" name="rate_per_km" min="0" step="0.01" required value="<?= $shippingRatePerKm === false ? '10.00' : htmlspecialchars(number_format((float)$shippingRatePerKm,2,'.','')) ?>"></label>
            <button class="btn btn-primary" type="submit">Save rate</button>
        </form>
    </div>
    <div class="panel">
        <div class="panel-head"><div><p class="eyebrow">FIXED INVENTORY PRICES</p><h2 style="margin:0">Product prices</h2><p style="color:var(--muted);margin:5px 0 0">Sales Staff cannot edit these prices. Saved prices are used when Sales creates a quotation.</p></div></div>
        <div class="table-wrap"><table><thead><tr><th>PRODUCT CODE</th><th>PRODUCT</th><th>SIZE</th><th>STOCK</th><th>UNIT PRICE (PHP)</th><th></th></tr></thead><tbody>
        <?php if (!$items): ?><tr><td colspan="6" style="text-align:center;padding:30px">No active inventory items.</td></tr><?php else: foreach ($items as $item): ?>
        <tr><td><strong><?= htmlspecialchars($item['product_code']) ?></strong></td><td><?= htmlspecialchars($item['product_name']) ?><?= $item['brand'] ? ' · '.htmlspecialchars($item['brand']) : '' ?></td><td><?= htmlspecialchars(trim((string)($item['size'] ?? '')) ?: '—') ?></td><td><?= htmlspecialchars(rtrim(rtrim(number_format((float)$item['stock_quantity'],2,'.',''),'0'),'.')) ?></td><td colspan="2"><form method="post" style="display:flex;gap:8px;align-items:center"><input type="hidden" name="csrf_token" value="<?= htmlspecialchars($_SESSION['csrf_token']) ?>"><input type="hidden" name="action" value="save_price"><input type="hidden" name="inventory_id" value="<?= (int)$item['inventory_id'] ?>"><input type="number" name="unit_price" min="0" step="0.01" required aria-label="Price for <?= htmlspecialchars($item['product_name']) ?>" value="<?= htmlspecialchars(number_format((float)$item['unit_price'],2,'.','')) ?>"><button class="btn btn-primary" type="submit">Save</button></form></td></tr>
        <?php endforeach; endif; ?>
        </tbody></table></div>
    </div>
</section>
<?php include __DIR__ . '/includes/footer.php'; ?>
