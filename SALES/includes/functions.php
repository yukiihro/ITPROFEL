<?php
/**
 * Shared helpers used across the module pages so every page formats
 * money, dates, and generated document numbers the same way.
 */

function peso(float $amount): string {
    return '₱' . number_format($amount, 2);
}

function niceDate(?string $date): string {
    if (!$date) return '—';
    $ts = strtotime($date);
    return $ts ? date('M j, Y', $ts) : $date;
}

/**
 * Builds a document number like QT-2005, SO-1009, INV-3011.
 * Uses MAX(<primary key>)+1 (not information_schema, which can return a stale
 * AUTO_INCREMENT) and skips any number that already exists, so a duplicate
 * document number can never make an INSERT fail.
 */
function nextDocNo(PDO $pdo, string $table, string $prefix, int $base = 0, int $pad = 0): string {
    $columns = [
        'sales_quotations' => 'quotation_no',
        'purchase_orders'  => 'po_no',
        'sales_orders'     => 'order_no',
        'deliveries'       => 'delivery_no',
        'sales_invoices'   => 'invoice_no',
        'sales_returns'    => 'return_no',
    ];
    $column = $columns[$table] ?? null;
    $idColumns = [
        'sales_quotations' => 'sq_id',
        'purchase_orders'  => 'po_id',
        'sales_orders'     => 'so_id',
        'deliveries'       => 'del_id',
        'sales_invoices'   => 'inv_id',
        'sales_returns'    => 'ret_id',
        'customers'        => 'cus_id',
        'collections'      => 'col_id',
    ];
    $idColumn = $idColumns[$table] ?? 'id';
    $next = (int) $pdo->query("SELECT COALESCE(MAX(`{$idColumn}`),0)+1 FROM `{$table}`")->fetchColumn();

    do {
        $number = $base + $next;
        $docNo = $pad > 0 ? $prefix . str_pad((string) $number, $pad, '0', STR_PAD_LEFT) : $prefix . $number;
        $taken = false;
        if ($column) {
            $chk = $pdo->prepare("SELECT 1 FROM `{$table}` WHERE `{$column}` = ? LIMIT 1");
            $chk->execute([$docNo]);
            $taken = (bool) $chk->fetchColumn();
        }
        $next++;
    } while ($taken);

    return $docNo;
}

function supportedPaymentMethods(): array {
    return ['Cash', 'GCash', 'Bank Transfer'];
}

function ensureSalesInvoiceForOrder(PDO $pdo, int $orderId): ?string
{
    if ($orderId <= 0) {
        return null;
    }

    $check = $pdo->prepare("SELECT * FROM sales_orders WHERE so_id = ? LIMIT 1");
    $check->execute([$orderId]);
    $order = $check->fetch(PDO::FETCH_ASSOC);

    if (!$order) {
        return null;
    }

    $existing = $pdo->prepare("SELECT invoice_no FROM sales_invoices WHERE order_id = ? LIMIT 1");
    $existing->execute([$orderId]);
    $invoiceNo = $existing->fetchColumn();
    if ($invoiceNo) {
        return (string) $invoiceNo;
    }

    $invoiceNo = nextDocNo($pdo, 'sales_invoices', 'INV-', 3000);
    $paid = ((float)($order['total_amount'] ?? 0)) > 0 && (($order['payment_status'] ?? 'Pending') === 'Paid') ? (float)($order['total_amount'] ?? 0) : 0.0;
    $status = $paid > 0 ? 'Paid' : 'Unpaid';

    $insert = $pdo->prepare("INSERT INTO sales_invoices (invoice_no, order_id, invoice_date, total_amount, amount_paid, status) VALUES (?, ?, CURDATE(), ?, ?, ?)");
    $insert->execute([$invoiceNo, $orderId, (float)($order['total_amount'] ?? 0), $paid, $status]);

    $pdo->prepare("UPDATE sales_orders SET status = 'Invoiced', admin_status = 'Approved' WHERE so_id = ? AND status NOT IN ('Cancelled', 'Returned')")->execute([$orderId]);
    syncSalesOrderCompletion($pdo, $orderId);

    return $invoiceNo;
}

/**
 * Synchronize a Sales Order with its invoice and delivery status.
 * Completed means the order is BOTH fully paid AND delivered.
 */
function syncSalesOrderCompletion(PDO $pdo, int $orderId): void
{
    if ($orderId <= 0) {
        return;
    }

    $st = $pdo->prepare("
        SELECT
            EXISTS(
                SELECT 1
                FROM sales_invoices
                WHERE order_id = ?
                  AND status = 'Paid'
            ) AS is_paid,
            EXISTS(
                SELECT 1
                FROM deliveries
                WHERE order_id = ?
                  AND status = 'Delivered'
            ) AS is_delivered
    ");
    $st->execute([$orderId, $orderId]);
    $state = $st->fetch(PDO::FETCH_ASSOC) ?: [];

    $isPaid = (int)($state['is_paid'] ?? 0) === 1;
    $isDelivered = (int)($state['is_delivered'] ?? 0) === 1;

    if ($isPaid) {
        $pdo->prepare("
            UPDATE sales_orders
            SET payment_status = 'Paid',
                paid_at = COALESCE(paid_at, NOW())
            WHERE so_id = ?
              AND status <> 'Cancelled'
        ")->execute([$orderId]);
    }

    if ($isPaid && $isDelivered) {
        $pdo->prepare("
            UPDATE sales_orders
            SET status = 'Completed',
                payment_status = 'Paid',
                paid_at = COALESCE(paid_at, NOW())
            WHERE so_id = ?
              AND status NOT IN ('Cancelled', 'Returned')
        ")->execute([$orderId]);
    }
}

function badgeClass(string $status): string {
    $status = strtolower($status);
    return match (true) {
        in_array($status, ['active', 'approved', 'inventory approved', 'completed', 'delivered', 'paid', 'current'], true) => 'success',
        in_array($status, ['pending', 'processing', 'partially paid', 'preparing', 'in transit'], true) => 'warning',
        in_array($status, ['rejected', 'cancelled', 'overdue', 'unpaid'], true) => 'danger',
        in_array($status, ['invoiced'], true) => 'info',
        default => 'neutral',
    };
}

function normalizeExpiredQuotationStatuses(PDO $pdo): void {
    $pdo->prepare("
        UPDATE sales_quotations
        SET status = 'Expired'
        WHERE admin_status = 'Approved'
          AND customer_status = 'Pending'
          AND valid_until IS NOT NULL
          AND valid_until < CURDATE()
          AND status <> 'Expired'
    ")->execute();
}

/**
 * Read one finished good from Inventory's API catalog.
 * Integration mapping: Sales product_code -> Inventory item_code.
 * The Inventory API catalog provides item identity and active status.
 */
function checkInventoryProduct(string $productCode): array
{
    require_once __DIR__ . '/../config/inventory_api.php';

    $productCode = trim($productCode);

    if ($productCode === '') {
        return [
            'ok' => false,
            'error' => 'Product code is required.'
        ];
    }

    try {
        $product = null;
        foreach (getInventoryApiCatalog()['items'] as $item) {
            if (
                (string)($item['item_code'] ?? '') === $productCode
                && ($item['item_type'] ?? '') === 'Finished Good'
            ) {
                $product = $item;
                break;
            }
        }

        if (!$product) {
            return [
                'ok' => false,
                'error' => 'Product was not found as a finished good in Inventory: ' . $productCode . '.',
                'item_code' => $productCode
            ];
        }

        $status = ($product['status'] ?? '') === 'Active' ? 'Active' : 'Inactive';

        return [
            'ok' => true,
            'item_id' => (int)$product['item_id'],
            'fg_id' => null,
            'item_code' => $product['item_code'],
            'item_name' => $product['item_name'],
            'size' => $product['size'] ?? '',
            'unit' => $product['unit'] ?? 'pcs',
            'status' => $status,
        ];

    } catch (Throwable $e) {
        return [
            'ok' => false,
            'error' => 'Could not read the Inventory API catalog: ' . $e->getMessage()
        ];
    }
}

function readSalesReturnDamagePhoto(array $upload): array
{
    if (($upload['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        throw new RuntimeException('Upload a JPG, PNG, or WebP damage photo (maximum 5 MB).');
    }

    $path = (string)($upload['tmp_name'] ?? '');
    if ($path === '' || !is_file($path)) {
        throw new RuntimeException('The damage photo could not be read.');
    }

    $size = filesize($path);
    if ($size === false || $size < 16 || $size > 5 * 1024 * 1024) {
        throw new RuntimeException('The damage photo must be between 16 bytes and 5 MB.');
    }

    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($path);
    if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) {
        throw new RuntimeException('Use a JPG, PNG, or WebP damage photo.');
    }

    $binary = file_get_contents($path);
    if ($binary === false) {
        throw new RuntimeException('The damage photo could not be read.');
    }

    return ['binary' => $binary, 'mime' => $mime];
}

/** Send an approved customer return to Inventory's Sales Returns register. */
function sendApprovedSalesReturnToInventory(PDO $pdo, int $returnId, ?array $damagePhotoUpload = null): array
{
    require_once __DIR__ . '/../config/inventory_api.php';

    $stmt = $pdo->prepare("SELECT r.ret_id,r.return_no,r.return_date,r.reason,r.return_quantity,r.admin_status,
            r.damage_photo,r.damage_photo_mime,o.product_code,o.size,
            (SELECT i.invoice_no FROM sales_invoices i WHERE i.order_id=o.so_id ORDER BY i.inv_id DESC LIMIT 1) AS invoice_no
        FROM sales_returns r
        JOIN sales_orders o ON o.so_id=r.order_id
        WHERE r.ret_id=? LIMIT 1");
    $stmt->execute([$returnId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row || $row['admin_status'] !== 'Approved') {
        return ['ok' => false, 'message' => 'Only an approved Sales return can be sent to Inventory.'];
    }
    if (trim((string)($row['invoice_no'] ?? '')) === '') {
        return ['ok' => false, 'message' => 'The Sales return does not have a linked invoice number.'];
    }

    $pdo->prepare("UPDATE sales_returns SET inventory_sync_status='Pending',inventory_sync_error=NULL WHERE ret_id=?")
        ->execute([$returnId]);

    try {
        if ($damagePhotoUpload !== null && ($damagePhotoUpload['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
            $photo = readSalesReturnDamagePhoto($damagePhotoUpload);
            $pdo->prepare('UPDATE sales_returns SET damage_photo=?,damage_photo_mime=? WHERE ret_id=?')
                ->execute([$photo['binary'], $photo['mime'], $returnId]);
            $row['damage_photo'] = $photo['binary'];
            $row['damage_photo_mime'] = $photo['mime'];
        }
        if (empty($row['damage_photo']) || empty($row['damage_photo_mime'])) {
            throw new RuntimeException('Upload a damage photo before retrying this return sync.');
        }

        $inventoryProduct = checkInventoryProduct((string)$row['product_code']);
        if (empty($inventoryProduct['ok']) || ($inventoryProduct['status'] ?? '') !== 'Active') {
            throw new RuntimeException((string)($inventoryProduct['error'] ?? 'The product could not be matched in Inventory.'));
        }

        $response = inventoryApiRequest('POST', 'sales-returns.php', [
            'return_number' => (string)$row['return_no'],
            'sales_reference' => (string)$row['invoice_no'],
            'return_date' => (string)$row['return_date'],
            'remarks' => trim((string)($row['reason'] ?? '')) ?: 'Customer return',
            'items' => [[
                'item_id' => (int)$inventoryProduct['item_id'],
                'item_name' => (string)$inventoryProduct['item_name'],
                'size' => (string)($row['size'] ?? $inventoryProduct['size'] ?? ''),
                'quantity' => (int)$row['return_quantity'],
                'damage_description' => trim((string)($row['reason'] ?? '')) ?: 'Customer return',
                'damage_photo_base64' => base64_encode((string)$row['damage_photo']),
                'damage_photo_mime' => (string)$row['damage_photo_mime'],
            ]],
        ]);
        $pdo->prepare("UPDATE sales_returns SET inventory_sync_status='Sent',inventory_sync_error=NULL,inventory_synced_at=NOW() WHERE ret_id=?")
            ->execute([$returnId]);
        return ['ok' => true, 'message' => (string)($response['message'] ?? 'Return sent to Inventory Sales Returns.')];
    } catch (Throwable $error) {
        $message = function_exists('mb_substr')
            ? mb_substr($error->getMessage(), 0, 2000, 'UTF-8')
            : substr($error->getMessage(), 0, 2000);
        $pdo->prepare("UPDATE sales_returns SET inventory_sync_status='Failed',inventory_sync_error=? WHERE ret_id=?")
            ->execute([$message, $returnId]);
        return ['ok' => false, 'message' => $message];
    }
}

function getInventoryFinishedGoods(): array
{
    require_once __DIR__ . '/../config/inventory_api.php';
    $products = [];
    foreach (getInventoryApiCatalog()['items'] as $item) {
        if (
            ($item['item_type'] ?? '') === 'Finished Good'
            && ($item['status'] ?? '') === 'Active'
            && trim((string)($item['item_code'] ?? '')) !== ''
        ) {
            $products[] = $item;
        }
    }
    return $products;
}

function getInventoryStockRequest(string $requestNumber): ?array
{
    $requestNumber = trim($requestNumber);

    if ($requestNumber === '') {
        return null;
    }

    require_once __DIR__ . '/../config/inventory_api.php';
    $requests = getInventoryApiRequests($requestNumber);
    if (!$requests) {
        return null;
    }
    $request = $requests[0];
    $request['warehouse_name'] = $request['items'][0]['warehouse_name'] ?? null;
    return $request;
}

/**
 * Check the Team Sales stock that is actually available to Sales.
 * Inventory System remains the product/master source. Inventory stock-outs
 * approved by Inventory are imported into Team Sales inventory by
 * syncInventoryStockouts().
 */
function evaluateQuotationStock(string $productCode, int $quantity): array
{
    $inventoryProduct = checkInventoryProduct($productCode);

    if (!$inventoryProduct['ok']) {
        return [
            'ok' => false,
            'error' => $inventoryProduct['error'] ?? 'Inventory check failed.'
        ];
    }

    $salesDb = getDB();
    $teamSalesStock = getTeamSalesInventory($salesDb, $productCode);
    $available = (float)($teamSalesStock['stock_quantity'] ?? 0);

    $isActive =
        ($inventoryProduct['status'] ?? 'Active') === 'Active' &&
        (!$teamSalesStock || ($teamSalesStock['status'] ?? 'Active') === 'Active');

    $status = ($isActive && $available >= $quantity && $available > 0)
        ? 'Approved'
        : 'Pending';

    return [
        'ok' => true,
        'status' => $status,
        'stock' => $inventoryProduct,
        'available' => $available,
        'team_sales_quantity' => $available,
        'team_sales_inventory' => $teamSalesStock
    ];
}
/**
 * Create a stock request in the existing Inventory request sheet.
 *
 * IMPORTANT:
 * This function DOES NOT stock out inventory.
 * Inventory System will handle the actual stock-out when its
 * own admin approves the request.
 */
function createInventoryStockRequest(
    string $productCode,
    float $requiredQuantity,
    string $recipientName = 'Team Sales',
    string $recipientGmail = '',
    string $remarks = '',
    ?string $size = null
): array {
    require_once __DIR__ . '/../config/inventory_api.php';
    try {
        if ($requiredQuantity <= 0 || floor($requiredQuantity) !== $requiredQuantity) {
            throw new InvalidArgumentException('Inventory requests must use a positive whole-number quantity.');
        }
        $size = trim((string)$size);
        if ($size === '') {
            throw new InvalidArgumentException('A size is required for Finished Goods. Select the exact size from the customer request.');
        }

        $catalog = getInventoryApiCatalog();
        $product = null;
        foreach ($catalog['items'] as $item) {
            if (
                (string)($item['item_code'] ?? '') === trim($productCode)
                && ($item['item_type'] ?? '') === 'Finished Good'
                && ($item['status'] ?? '') === 'Active'
                && trim((string)($item['size'] ?? '')) === $size
            ) {
                $product = $item;
                break;
            }
        }
        if (!$product) {
            throw new RuntimeException('Product is not an active finished good in Inventory.');
        }
        $warehouseId = (int)($catalog['warehouses'][0]['warehouse_id'] ?? 0);
        if ($warehouseId <= 0) {
            throw new RuntimeException('No active Inventory warehouse was found.');
        }

        $response = inventoryApiRequest('POST', 'requests.php', [
            'destination' => 'Sales',
            'warehouse_id' => $warehouseId,
            'items' => [[
                'item_id' => (int)$product['item_id'],
                'item_name' => (string)$product['item_name'],
                'size' => $size,
                'quantity' => (int)$requiredQuantity
            ]],
            'requester_name' => 'Team Sales',
            'recipient_name' => $recipientName !== '' ? $recipientName : 'Team Sales',
            'recipient_email' => $recipientGmail,
            'remarks' => $remarks !== '' ? $remarks : 'Stock request from Team Sales.',
            'expected_delivery_date' => date('Y-m-d', strtotime('+3 days'))
        ]);
        $request = $response['data'] ?? [];
        $requestNumber = trim((string)($request['request_number'] ?? ''));
        if ($requestNumber === '') {
            throw new RuntimeException('Inventory API accepted the request but returned no request number.');
        }
        $createdRequests = getInventoryApiRequests($requestNumber);
        $createdRequest = null;
        foreach ($createdRequests as $candidate) {
            if ((string)($candidate['request_number'] ?? '') === $requestNumber) {
                $createdRequest = $candidate;
                break;
            }
        }
        $requestId = (int)($createdRequest['id'] ?? 0);
        if ($requestId <= 0) {
            throw new RuntimeException('Inventory API accepted the request but its request ID could not be retrieved.');
        }
        return [
            'ok' => true,
            'request_id' => $requestId,
            'request_number' => $requestNumber,
            'required' => $requiredQuantity,
            'requested' => $requiredQuantity,
            'status' => (string)($createdRequest['status'] ?? $request['request_status'] ?? 'Pending'),
            'message' => 'Stock request was sent to Inventory.'
        ];
    } catch (Throwable $e) {
        return ['ok' => false, 'message' => 'Could not create Inventory stock request: ' . $e->getMessage()];
    }
}
/**
 * Customer-approved quotation -> Purchase Order.
 * Customer approval is the only approval required for a quotation.
 */
function createPurchaseOrderFromQuotation(PDO $pdo, int $quotationId): ?string {
    $q = $pdo->prepare("SELECT * FROM sales_quotations WHERE sq_id = ? AND customer_status = 'Approved'");
    $q->execute([$quotationId]);
    $quotation = $q->fetch();
    if (!$quotation) return null;

    $exists = $pdo->prepare('SELECT po_no FROM purchase_orders WHERE quotation_id = ? LIMIT 1');
    $exists->execute([$quotationId]);
    $existing = $exists->fetchColumn();
    if ($existing) return $existing;

    $pdo->beginTransaction();
    try {
        $poNo = nextDocNo($pdo, 'purchase_orders', 'PO-', 4000);
        $pdo->prepare("INSERT INTO purchase_orders
            (po_no, quotation_id, customer_id, product_code, size, inventory_product_id, quantity, total_amount, order_date, status)
            VALUES (?,?,?,?,?,?,?,?,CURDATE(),'Open')")
            ->execute([
                $poNo, $quotationId, $quotation['customer_id'], $quotation['product_code'],
                $quotation['size'] ?? null, $quotation['fg_id'], $quotation['quantity'], $quotation['total_amount'],
            ]);

        if (!empty($quotation['source_request_id'])) {
            $pdo->prepare("UPDATE customer_order_requests SET status='Converted', quotation_id=? WHERE req_id=?")
                ->execute([$quotationId, $quotation['source_request_id']]);
        }

        $pdo->commit();
        logActivity($pdo, 'Create', 'Purchase Order', 'Auto-created ' . $poNo . ' from customer-approved quotation', (int) $pdo->lastInsertId());
        return $poNo;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

/**
 * Sales Admin approved a Sales Order -> convert it to a Delivery and deduct
 * the quantity from Inventory. Everything happens in ONE transaction: if
 * stock is short, nothing is changed and an Exception is thrown.
 * Returns the new delivery number.
 */

/**
 * Create an exact stock-out request in the Inventory System.
 * Team Sales never changes Inventory stock. Inventory's own Admin
 * approves the request and the Inventory System creates the stock_out.
 */
function createTeamSalesStockoutRequest(PDO $salesDb, string $productCode, float $quantity, string $reference = '', ?string $size = null, string $purchaseOrderNumber = ''): array
{
    require_once __DIR__ . '/../config/inventory_api.php';
    $productCode = trim($productCode);
    $size = trim((string)$size);
    if ($productCode === '' || $quantity <= 0 || floor($quantity) !== $quantity) {
        throw new RuntimeException('A valid product code and positive whole-number quantity are required.');
    }
    if ($size === '') {
        throw new RuntimeException('A size is required for Finished Goods. Select the exact size from the customer request.');
    }

    $catalog = getInventoryApiCatalog();
    $item = null;
    foreach ($catalog['items'] as $candidate) {
        if (
            (string)($candidate['item_code'] ?? '') === $productCode
            && ($candidate['item_type'] ?? '') === 'Finished Good'
            && ($candidate['status'] ?? '') === 'Active'
            && trim((string)($candidate['size'] ?? '')) === $size
        ) {
            $item = $candidate;
            break;
        }
    }
    if (!$item) {
        throw new RuntimeException("Active finished good {$productCode} was not found in Inventory.");
    }
    $warehouseId = (int)($catalog['warehouses'][0]['warehouse_id'] ?? 0);
    if ($warehouseId <= 0) {
        throw new RuntimeException('No active Inventory warehouse was found.');
    }

    $isPurchaseOrderRequest = trim($purchaseOrderNumber) !== '';
    $requestRemarks = $isPurchaseOrderRequest
        ? 'Stock request from Team Sales for Purchase Order No.: ' . trim($purchaseOrderNumber) . '.'
        : 'Direct stock request from Team Sales; not linked to a Purchase Order.'
            . ($reference !== '' ? ' Sales note: ' . trim($reference) : '');

    $response = inventoryApiRequest('POST', 'requests.php', [
        'destination' => 'Sales',
        'warehouse_id' => $warehouseId,
        'items' => [[
            'item_id' => (int)$item['item_id'],
            'item_name' => (string)$item['item_name'],
            'size' => $size,
            'quantity' => (int)$quantity
        ]],
        'requester_name' => 'Team Sales',
        'recipient_name' => 'Team Sales',
        'recipient_email' => 'team.sales@local',
        'po_number' => $isPurchaseOrderRequest
            ? trim($purchaseOrderNumber)
            : 'N/A - Direct Sales stock request',
        'remarks' => $requestRemarks,
        'expected_delivery_date' => date('Y-m-d', strtotime('+3 days'))
    ]);
    $request = $response['data'] ?? [];
    $requestNumber = (string)($request['request_number'] ?? '');
    if ($requestNumber === '') {
        throw new RuntimeException('Inventory API accepted the request but returned no request number.');
    }
    $createdRequests = getInventoryApiRequests($requestNumber);
    $createdRequest = null;
    foreach ($createdRequests as $candidate) {
        if ((string)($candidate['request_number'] ?? '') === $requestNumber) {
            $createdRequest = $candidate;
            break;
        }
    }
    $requestId = (int)($createdRequest['id'] ?? 0);
    if ($requestId <= 0) {
        throw new RuntimeException('Inventory API accepted the request but its request ID could not be retrieved.');
    }

    $salesDb->prepare("
        INSERT INTO inventory_stockout_approvals
        (inventory_request_id, inventory_request_number, product_code, product_name, quantity, unit, destination, request_status, requested_at, source_reference, remarks)
        VALUES (?, ?, ?, ?, ?, ?, 'Sales', 'Requested', NOW(), ?, ?)
    ")->execute([
        $requestId,
        $requestNumber,
        $item['item_code'],
        $item['item_name'],
        $quantity,
        $item['unit'] ?? 'pcs',
        $reference !== '' ? $reference : null,
        $reference !== '' ? 'Requested for ' . $reference : 'Requested from Inventory System.'
    ]);

    return [
        'ok' => true,
        'request_id' => $requestId,
        'request_number' => $requestNumber,
        'status' => (string)($createdRequest['status'] ?? $request['request_status'] ?? 'Pending'),
        'message' => 'Stock-out request sent to Inventory System.'
    ];
}

function notifySalesAdminsInventoryApproved(
    PDO $salesDb,
    int $inventoryRequestId,
    string $requestNumber,
    string $productCode,
    string $productName,
    float $quantity,
    string $unit
): void {
    $admins = $salesDb->query("
        SELECT user_id
        FROM users
        WHERE role = 'Sales Admin' AND status = 'Active'
    ")->fetchAll(PDO::FETCH_COLUMN);
    $insert = $salesDb->prepare("
        INSERT IGNORE INTO user_notifications (user_id, event_key, title, message, link)
        VALUES (?, ?, ?, ?, ?)
    ");
    $eventKey = 'inventory-approved:' . $inventoryRequestId . ':' . $productCode;
    $message = $requestNumber . ' was approved by Inventory: '
        . $productName . ' (' . rtrim(rtrim(number_format($quantity, 2, '.', ''), '0'), '.') . ' ' . $unit . ').';

    foreach ($admins as $adminId) {
        $insert->execute([
            (int)$adminId,
            $eventKey,
            'Inventory request approved',
            $message,
            'inventory_stockout_approval.php',
        ]);
    }
}

function notifySalesAdminsPendingApproval(
    PDO $salesDb,
    string $eventKey,
    string $title,
    string $message,
    string $link
): void {
    $admins = $salesDb->query("
        SELECT user_id
        FROM users
        WHERE role = 'Sales Admin' AND status = 'Active'
    ")->fetchAll(PDO::FETCH_COLUMN);
    $insert = $salesDb->prepare("
        INSERT IGNORE INTO user_notifications (user_id, event_key, title, message, link)
        VALUES (?, ?, ?, ?, ?)
    ");

    foreach ($admins as $adminId) {
        $insert->execute([(int)$adminId, $eventKey, $title, $message, $link]);
    }
}

/**
 * Queue Inventory deliveries that are fully shipped and awaiting Team Sales
 * receipt confirmation. Sales approval is completed through Inventory's
 * accept-delivery API, which creates the Inventory Delivery Receipt.
 */
function syncInventoryDeliveryApprovals(PDO $salesDb): int
{
    require_once __DIR__ . '/../config/inventory_api.php';

    $response = inventoryApiRequest('GET', 'deliveries.php');
    $deliveries = $response['data'] ?? null;
    if (!is_array($deliveries)) {
        throw new RuntimeException('Inventory API returned an invalid delivery list.');
    }

    $find = $salesDb->prepare("SELECT approval_status FROM inventory_delivery_approvals WHERE inventory_request_number = ? LIMIT 1");
    $insert = $salesDb->prepare("INSERT INTO inventory_delivery_approvals
        (inventory_request_number, inventory_delivery_id, inventory_request_status,
         inventory_delivery_status, items_json, approval_status)
        VALUES (?, ?, ?, ?, ?, 'Pending')");
    $update = $salesDb->prepare("UPDATE inventory_delivery_approvals
        SET inventory_delivery_id = ?, inventory_request_status = ?,
            inventory_delivery_status = ?, items_json = ?
        WHERE inventory_request_number = ? AND approval_status = 'Pending'");

    $newCount = 0;
    foreach ($deliveries as $delivery) {
        $requestNumber = trim((string)($delivery['request_number'] ?? ''));
        if (
            $requestNumber === ''
            || (string)($delivery['destination'] ?? '') !== 'Sales'
            || !in_array((string)($delivery['request_status'] ?? ''), ['Approved', 'Partially Approved'], true)
            || (string)($delivery['delivery_status'] ?? '') !== 'Out for Delivery'
        ) {
            continue;
        }

        $items = $delivery['items'] ?? null;
        if (!is_array($items) || !$items) {
            continue;
        }
        $itemsJson = json_encode($items, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        $find->execute([$requestNumber]);
        $existingStatus = $find->fetchColumn();
        if ($existingStatus === false) {
            $insert->execute([
                $requestNumber,
                (int)($delivery['delivery_id'] ?? 0) ?: null,
                (string)$delivery['request_status'],
                (string)$delivery['delivery_status'],
                $itemsJson,
            ]);
            $newCount += $insert->rowCount() > 0 ? 1 : 0;
            notifySalesAdminsPendingApproval(
                $salesDb,
                'inventory-delivery-pending:' . $requestNumber,
                'Inventory delivery awaiting Sales confirmation',
                'Inventory reports ' . $requestNumber . ' as Out for Delivery. Review and approve receipt in Sales.',
                'inventory_delivery_approval.php'
            );
        } elseif ($existingStatus === 'Pending') {
            $update->execute([
                (int)($delivery['delivery_id'] ?? 0) ?: null,
                (string)$delivery['request_status'],
                (string)$delivery['delivery_status'],
                $itemsJson,
                $requestNumber,
            ]);
        }
    }

    return $newCount;
}

/**
 * Synchronize Inventory requests and stock-outs for Team Sales. Approved
 * request quantities are credited only after Sales confirms receipt.
 */
function syncInventoryStockouts(PDO $salesDb): int
{
    require_once __DIR__ . '/../config/inventory_api.php';

    $requestRows = [];
    $stockOutRows = [];
    $findLocalProductCode = $salesDb->prepare("
        SELECT product_code
        FROM inventory_stockout_approvals
        WHERE (inventory_request_id = ? OR inventory_request_number = ?)
          AND product_code <> ''
        ORDER BY (inventory_request_id = ?) DESC, id DESC
        LIMIT 1
    ");
    foreach (getInventoryApiRequests() as $request) {
        $requestNumber = (string)($request['request_number'] ?? '');
        foreach (($request['items'] ?? []) as $item) {
            $isSalesDemoRequest = strpos($requestNumber, 'REQ-DEMO-SALES-') === 0;
            if (($request['destination'] ?? 'Sales') === 'Sales' && !$isSalesDemoRequest) {
                $requestId = (int)($request['id'] ?? 0);
                $itemCode = trim((string)($item['item_code'] ?? ''));
                if ($itemCode === '' && $requestId > 0 && $requestNumber !== '') {
                    $findLocalProductCode->execute([$requestId, $requestNumber, $requestId]);
                    $itemCode = trim((string)($findLocalProductCode->fetchColumn() ?: ''));
                }
                $requestRows[] = [
                    'request_id' => $requestId,
                    'request_number' => $requestNumber,
                    'request_date' => $request['request_date'] ?? null,
                    'status' => $request['status'] ?? '',
                    'delivery_status' => $request['delivery_status'] ?? '',
                    'approved_at' => $request['approved_at'] ?? null,
                    'request_remarks' => $request['remarks'] ?? '',
                    'item_name' => $item['item_name'] ?? '',
                    'quantity' => $item['requested_quantity'] ?? 0,
                    'approved_quantity' => $item['approved_quantity'] ?? null,
                    'unit' => $item['unit'] ?? 'pcs',
                    'item_code' => $itemCode,
                    'catalog_item_name' => $item['item_name'] ?? '',
                ];
            }

            // Any stock-out destined for Sales must be imported, including
            // requests created directly in Inventory with its own request number.
            if (
                !empty($item['stock_out_id'])
                && ($item['stock_out_destination'] ?? '') === 'Sales'
                && (string)($request['delivery_status'] ?? '') === 'Delivered'
            ) {
                $stockOutRows[] = [
                    'id' => $item['stock_out_id'],
                    'stock_out_number' => $item['stock_out_number'] ?? '',
                    'item_id' => $item['item_id'] ?? 0,
                    'quantity' => $item['stock_out_quantity'] ?? 0,
                    'destination' => $item['stock_out_destination'],
                    'reference_number' => $item['stock_out_reference'] ?? $requestNumber,
                    'date' => $item['stock_out_date'] ?? $request['request_date'] ?? date('Y-m-d'),
                    'item_code' => $item['item_code'] ?? '',
                    'item_name' => $item['item_name'] ?? '',
                    'unit' => $item['unit'] ?? 'pcs',
                ];
            }
        }
    }

    $requestStatuses = [
        'Pending' => 'Requested',
        'Approved' => 'Approved',
        'Partially Approved' => 'Approved',
        'Disapproved' => 'Rejected',
    ];
    $findLocalRequest = $salesDb->prepare("
        SELECT id, inventory_request_id, inventory_stock_out_id, request_status, inventory_approved_at
        FROM inventory_stockout_approvals
        WHERE product_code = ?
          AND (
                inventory_request_id = ?
                OR inventory_request_number = ?
              )
        ORDER BY (inventory_request_id = ?) DESC,
                 (inventory_stock_out_id IS NULL) DESC,
                 id DESC
        LIMIT 1
        FOR UPDATE
    ");
    $updateLocalRequest = $salesDb->prepare("
        UPDATE inventory_stockout_approvals
        SET inventory_request_id = ?,
            inventory_request_number = ?,
            product_name = ?,
            quantity = ?,
            unit = ?,
            request_status = ?,
            inventory_approved_at = COALESCE(?, inventory_approved_at)
        WHERE id = ?
    ");
    $claimApprovedRequest = $salesDb->prepare("
        UPDATE inventory_stockout_approvals
        SET inventory_request_id = ?,
            inventory_request_number = ?,
            product_name = ?,
            quantity = ?,
            unit = ?,
            request_status = 'Approved',
            inventory_approved_at = COALESCE(?, inventory_approved_at),
            stocked_out_at = COALESCE(?, stocked_out_at)
        WHERE id = ?
          AND request_status NOT IN ('Approved', 'Stocked Out')
    ");
    $insertLocalRequest = $salesDb->prepare("
        INSERT INTO inventory_stockout_approvals
            (inventory_request_id, inventory_request_number, product_code, product_name,
             quantity, unit, destination, request_status, requested_at, inventory_approved_at, source_reference, remarks)
        VALUES (?, ?, ?, ?, ?, ?, 'Sales', ?, ?, ?, ?, ?)
    ");
    foreach ($requestRows as $requestRow) {
        $inventoryStatus = (string)($requestRow['status'] ?? '');
        if (!isset($requestStatuses[$inventoryStatus])) {
            continue;
        }

        $requestId = (int)$requestRow['request_id'];
        $requestNumber = (string)$requestRow['request_number'];
        $productCode = (string)$requestRow['item_code'];
        if ($requestId <= 0 || $requestNumber === '' || $productCode === '') {
            throw new RuntimeException('Inventory API returned a Sales request with incomplete request or item details.');
        }
        $salesDb->beginTransaction();
        try {
            $findLocalRequest->execute([
                $productCode,
                $requestId,
                $requestNumber,
                $requestId,
            ]);
            $localRequest = $findLocalRequest->fetch(PDO::FETCH_ASSOC);
            $productName = (string)($requestRow['item_name'] ?: $requestRow['catalog_item_name']);
            $unit = (string)($requestRow['unit'] ?: 'pcs');
            $approvedAt = $requestRow['approved_at'] ?: null;
            $requestedQuantity = (float)$requestRow['quantity'];
            $approvedQuantity = (float)($requestRow['approved_quantity'] ?? 0);
            $isApproved = in_array($inventoryStatus, ['Approved', 'Partially Approved'], true)
                && $approvedQuantity > 0;
            $deliveryComplete = (string)($requestRow['delivery_status'] ?? '') === 'Delivered';
            $salesStatus = $isApproved
                ? ($deliveryComplete ? 'Approved' : 'Inventory Approved')
                : $requestStatuses[$inventoryStatus];
            if (
                in_array($inventoryStatus, ['Approved', 'Partially Approved'], true)
                && !$isApproved
            ) {
                $salesStatus = 'Rejected';
            }
            $quantityToPersist = $isApproved ? $approvedQuantity : $requestedQuantity;
            $shouldAddStock = $isApproved && $deliveryComplete;

            if ($localRequest) {
                $localStatus = (string)$localRequest['request_status'];
                if (in_array($localStatus, ['Approved', 'Stocked Out'], true)) {
                    $salesStatus = $localStatus;
                    $shouldAddStock = false;
                }
                if ($localStatus === 'Requested' && $isApproved) {
                    notifySalesAdminsInventoryApproved(
                        $salesDb,
                        $requestId,
                        $requestNumber,
                        $productCode,
                        $productName,
                        $quantityToPersist,
                        $unit
                    );
                }
                if (
                    $localStatus !== $salesStatus
                    || (int)$localRequest['inventory_request_id'] !== $requestId
                    || (
                        $approvedAt !== null
                        && $localRequest['inventory_approved_at'] !== $approvedAt
                    )
                ) {
                    if ($shouldAddStock) {
                        $claimApprovedRequest->execute([
                            $requestId,
                            $requestNumber,
                            $productName,
                            $quantityToPersist,
                            $unit,
                            $approvedAt,
                            $approvedAt,
                            (int)$localRequest['id']
                        ]);
                        $shouldAddStock = $claimApprovedRequest->rowCount() > 0;
                    } else {
                        $updateLocalRequest->execute([
                            $requestId,
                            $requestNumber,
                            $productName,
                            $quantityToPersist,
                            $unit,
                            $salesStatus,
                            $approvedAt,
                            (int)$localRequest['id']
                        ]);
                    }
                } elseif ($shouldAddStock) {
                    $claimApprovedRequest->execute([
                        $requestId,
                        $requestNumber,
                        $productName,
                        $quantityToPersist,
                        $unit,
                        $approvedAt,
                        $approvedAt,
                        (int)$localRequest['id']
                    ]);
                    $shouldAddStock = $claimApprovedRequest->rowCount() > 0;
                }
            } else {
                $insertLocalRequest->execute([
                    $requestId,
                    $requestNumber,
                    $productCode,
                    $productName,
                    $quantityToPersist,
                    $unit,
                    $salesStatus,
                    $requestRow['request_date'] ?: date('Y-m-d H:i:s'),
                    $approvedAt,
                    $requestNumber,
                    trim((string)($requestRow['request_remarks'] ?? '')) ?: 'Synchronized from Inventory System.',
                ]);
                $shouldAddStock = $isApproved && $deliveryComplete;
                if ($isApproved) {
                    notifySalesAdminsInventoryApproved(
                        $salesDb,
                        $requestId,
                        $requestNumber,
                        $productCode,
                        $productName,
                        $quantityToPersist,
                        $unit
                    );
                }
            }

            if ($shouldAddStock) {
                $salesDb->prepare("
                    INSERT INTO inventory (product_code, product_name, unit, stock_quantity, status)
                    VALUES (?, ?, ?, ?, 'Active')
                    ON DUPLICATE KEY UPDATE
                        product_name = VALUES(product_name),
                        unit = VALUES(unit),
                        stock_quantity = stock_quantity + VALUES(stock_quantity),
                        status = 'Active',
                        last_updated = NOW()
                ")->execute([
                    $productCode,
                    $productName,
                    $unit,
                    $quantityToPersist,
                ]);
            }
            $salesDb->commit();
        } catch (Throwable $e) {
            if ($salesDb->inTransaction()) {
                $salesDb->rollBack();
            }
            throw $e;
        }
    }

    $rows = $stockOutRows;

    $inserted = 0;
    $stmt = $salesDb->prepare("
        INSERT INTO inventory_stockout_approvals
        (
            inventory_stock_out_id, stock_out_number, inventory_request_number,
            product_code, product_name, quantity, unit, destination,
            request_status, stocked_out_at, source_reference, remarks
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Sales', 'Stocked Out', ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            stock_out_number = VALUES(stock_out_number),
            inventory_request_number = COALESCE(VALUES(inventory_request_number), inventory_request_number),
            product_code = VALUES(product_code),
            product_name = VALUES(product_name),
            quantity = VALUES(quantity),
            unit = VALUES(unit),
            stocked_out_at = VALUES(stocked_out_at)
    ");

    foreach ($rows as $row) {
        $stockOutId = (int)$row['id'];
        $requestNumber = $row['reference_number'] ?: null;

        // A stock-out already linked by its unique Inventory ID was imported earlier.
        $existingStockOut = $salesDb->prepare("
            SELECT id, request_status
            FROM inventory_stockout_approvals
            WHERE inventory_stock_out_id = ?
            LIMIT 1
        ");
        $existingStockOut->execute([$stockOutId]);
        $linkedStockOut = $existingStockOut->fetch(PDO::FETCH_ASSOC);
        if ($linkedStockOut) {
            $salesDb->prepare("
                UPDATE inventory_stockout_approvals
                SET stock_out_number = ?,
                    inventory_request_number = COALESCE(?, inventory_request_number),
                    product_code = ?,
                    product_name = ?,
                    quantity = ?,
                    unit = ?,
                    stocked_out_at = ?
                WHERE id = ?
            ")->execute([
                $row['stock_out_number'],
                $requestNumber,
                $row['item_code'],
                $row['item_name'],
                $row['quantity'],
                $row['unit'] ?? 'pcs',
                $row['date'] . ' 00:00:00',
                (int)$linkedStockOut['id']
            ]);
            continue;
        }

        // Otherwise attach this stock-out to its Sales request, if one exists.
        $existingRequest = $salesDb->prepare("
            SELECT id, request_status
            FROM inventory_stockout_approvals
            WHERE inventory_stock_out_id IS NULL
              AND inventory_request_number = ?
              AND product_code = ?
            ORDER BY id DESC
            LIMIT 1
        ");
        $existingRequest->execute([$requestNumber, $row['item_code']]);
        $local = $existingRequest->fetch(PDO::FETCH_ASSOC);
        if ($local) {
            $wasApproved = ($local['request_status'] ?? '') === 'Approved';
            if (!$wasApproved) {
                $salesDb->prepare("
                    UPDATE inventory_stockout_approvals
                    SET inventory_stock_out_id = ?,
                        stock_out_number = ?,
                        source_reference = COALESCE(source_reference, ?),
                        inventory_request_number = COALESCE(inventory_request_number, ?),
                        product_code = ?, product_name = ?, quantity = ?, unit = ?,
                        request_status = 'Approved', stocked_out_at = ?,
                        reviewed_at = NOW(), remarks = CONCAT(COALESCE(remarks,''), ' Inventory System approved and stock-out completed; quantity added to Team Sales Inventory.')
                    WHERE id = ?
                ")->execute([
                    $stockOutId,
                    $row['stock_out_number'],
                    $row['reference_number'] ?: null,
                    $row['reference_number'] ?: null,
                    $row['item_code'],
                    $row['item_name'],
                    $row['quantity'],
                    $row['unit'] ?? 'pcs',
                    $row['date'] . ' 00:00:00',
                    (int)$local['id']
                ]);

                $salesDb->prepare("
                    INSERT INTO inventory (product_code, product_name, unit, stock_quantity, status)
                    VALUES (?, ?, ?, ?, 'Active')
                    ON DUPLICATE KEY UPDATE
                        product_name = VALUES(product_name),
                        unit = VALUES(unit),
                        stock_quantity = stock_quantity + VALUES(stock_quantity),
                        status = 'Active',
                        last_updated = NOW()
                ")->execute([
                    $row['item_code'], $row['item_name'], $row['unit'] ?? 'pcs', (float)$row['quantity']
                ]);
            }
            continue;
        }

        $stmt->execute([
            $stockOutId,
            $row['stock_out_number'],
            $row['reference_number'] ?: null,
            $row['item_code'],
            $row['item_name'],
            $row['quantity'],
            $row['unit'] ?? 'pcs',
            $row['date'] . ' 00:00:00',
            $row['reference_number'] ?: null,
            'Imported from Inventory System stock-out.'
        ]);
        if ($stmt->rowCount() > 0) {
            $inserted++;
            $salesDb->prepare("
                INSERT INTO inventory (product_code, product_name, unit, stock_quantity, status)
                VALUES (?, ?, ?, ?, 'Active')
                ON DUPLICATE KEY UPDATE
                    product_name = VALUES(product_name),
                    unit = VALUES(unit),
                    stock_quantity = stock_quantity + VALUES(stock_quantity),
                    status = 'Active',
                    last_updated = NOW()
            " )->execute([
                $row['item_code'], $row['item_name'], $row['unit'] ?? 'pcs', (float)$row['quantity']
            ]);
            $salesDb->prepare("UPDATE inventory_stockout_approvals SET request_status='Approved', reviewed_at=NOW(), remarks=CONCAT(COALESCE(remarks,''), ' Inventory System approved and stock-out completed; quantity added to Team Sales Inventory.') WHERE inventory_stock_out_id=?")->execute([$stockOutId]);
        }
    }

    return $inserted;
}

/**
 * Convert an approved Inventory stock-out into Team Sales inventory.
 */
function approveTeamSalesStockout(PDO $salesDb, int $approvalId, int $userId): string
{
    $salesDb->beginTransaction();
    try {
        $stmt = $salesDb->prepare("
            SELECT *
            FROM inventory_stockout_approvals
            WHERE id = ?
              AND request_status = 'Stocked Out'
            FOR UPDATE
        ");
        $stmt->execute([$approvalId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            throw new RuntimeException('This Inventory stock-out is no longer waiting for approval.');
        }

        $upsert = $salesDb->prepare("
            INSERT INTO inventory
                (product_code, product_name, unit, stock_quantity, status)
            VALUES (?, ?, ?, ?, 'Active')
            ON DUPLICATE KEY UPDATE
                product_name = VALUES(product_name),
                unit = VALUES(unit),
                stock_quantity = stock_quantity + VALUES(stock_quantity),
                status = 'Active',
                last_updated = NOW()
        ");
        $upsert->execute([
            $row['product_code'],
            $row['product_name'],
            $row['unit'] ?? 'pcs',
            (float)$row['quantity']
        ]);

        $salesDb->prepare("
            UPDATE inventory_stockout_approvals
            SET request_status = 'Approved',
                reviewed_by = ?,
                reviewed_at = NOW(),
                remarks = CONCAT(COALESCE(remarks,''), ' Team Sales inventory received.')
            WHERE id = ?
        ")->execute([$userId, $approvalId]);

        $salesDb->commit();

        logActivity(
            $salesDb,
            'Approve',
            'Inventory Stockout',
            'Approved Inventory stock-out ' . ($row['stock_out_number'] ?? ''),
            $approvalId
        );

        return 'Inventory stock-out approved. ' . $row['quantity'] . ' ' . ($row['unit'] ?? 'pcs') . ' added to Team Sales Inventory.';
    } catch (Throwable $e) {
        if ($salesDb->inTransaction()) {
            $salesDb->rollBack();
        }
        throw $e;
    }
}

/**
 * Return Team Sales inventory for one product.
 */
function getTeamSalesInventory(PDO $salesDb, string $productCode): ?array
{
    $stmt = $salesDb->prepare("
        SELECT *
        FROM inventory
        WHERE product_code = ?
          AND status = 'Active'
        LIMIT 1
    ");
    $stmt->execute([trim($productCode)]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

/**
 * Deduct stock only from Team Sales inventory.
 * The Inventory System is never modified by this function.
 */
function deductTeamSalesInventory(PDO $salesDb, string $productCode, float $quantity): void
{
    $stmt = $salesDb->prepare("
        UPDATE inventory
        SET stock_quantity = stock_quantity - ?, last_updated = NOW()
        WHERE product_code = ?
          AND status = 'Active'
          AND stock_quantity >= ?
    ");
    $stmt->execute([$quantity, $productCode, $quantity]);

    if ($stmt->rowCount() !== 1) {
        $stock = getTeamSalesInventory($salesDb, $productCode);
        $available = (float)($stock['stock_quantity'] ?? 0);
        throw new RuntimeException(
            'Not enough Team Sales Inventory for ' . $productCode .
            '. Available: ' . number_format($available, 2) .
            ', Required: ' . number_format($quantity, 2) .
            '. Request an Inventory stock-out first.'
        );
    }
}

function convertOrderToDelivery(PDO $pdo, int $orderId): string
{
    $pdo->beginTransaction();

    try {
        $st = $pdo->prepare("
            SELECT *
            FROM sales_orders
            WHERE so_id = ?
              AND admin_status = 'Pending'
            FOR UPDATE
        ");
        $st->execute([$orderId]);
        $order = $st->fetch(PDO::FETCH_ASSOC);

        if (!$order) {
            throw new RuntimeException('Sales order is no longer awaiting approval.');
        }

        $dup = $pdo->prepare("
            SELECT delivery_no
            FROM deliveries
            WHERE order_id = ?
            LIMIT 1
        ");
        $dup->execute([$orderId]);
        if ($dup->fetchColumn()) {
            throw new RuntimeException('A delivery already exists for this order.');
        }

        $productCode = trim((string)($order['product_code'] ?? ''));
        $quantity = (float)($order['quantity'] ?? 0);

        if ($productCode === '' || $quantity <= 0) {
            throw new RuntimeException('The Sales Order has no valid product code or quantity.');
        }

        // Team Sales owns this stock. Inventory System is replenishment only.
        deductTeamSalesInventory($pdo, $productCode, $quantity);

        $deliveryNo = nextDocNo($pdo, 'deliveries', 'DEL-', 700);

        $pdo->prepare("
            INSERT INTO deliveries
                (delivery_no, order_id, delivery_date, status, inventory_deducted)
            VALUES (?, ?, CURDATE(), 'Preparing', 1)
        ")->execute([$deliveryNo, $orderId]);

        $pdo->prepare("
            UPDATE sales_orders
            SET admin_status = 'Approved',
                status = 'Processing'
            WHERE so_id = ?
        ")->execute([$orderId]);

        $pdo->commit();

        logActivity(
            $pdo,
            'Approve',
            'Sales Order',
            'Approved ' . ($order['order_no'] ?? 'Sales Order') .
            ' -> ' . $deliveryNo . ' (Team Sales Inventory deducted)',
            $orderId
        );

        return $deliveryNo;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
}
?>
