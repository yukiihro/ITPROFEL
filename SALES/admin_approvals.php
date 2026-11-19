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
    // Inventory System is authoritative for Sales-directed stock requests.
    syncInventoryStockouts($pdo);
} catch (Throwable $e) {
    $error = 'Could not sync Inventory System stock status: ' . $e->getMessage();
}
$notice = '';

/*
|--------------------------------------------------------------------------
| POST ACTIONS
|--------------------------------------------------------------------------
*/

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $type = $_POST['type'] ?? '';
    $id = (int)($_POST['id'] ?? 0);
    $decision = $_POST['decision'] ?? '';

    try {

        /*
        |--------------------------------------------------------------------------
        | QUOTATION APPROVAL
        |--------------------------------------------------------------------------
        |
        | Quotation approval releases the quotation to the customer.
        | Stock is handled later from the Purchase Order Request queue.
        |--------------------------------------------------------------------------
        */
        if ($type === 'quotation' && in_array($decision, ['Approved', 'Rejected'], true)) {

            $st = $pdo->prepare("
                SELECT
                    q.*,
                    c.customer_name,
                    c.email AS customer_email
                FROM sales_quotations q
                JOIN customers c
                    ON c.cus_id = q.customer_id
                WHERE q.sq_id = ?
                  AND q.admin_status = 'Pending'
                LIMIT 1
            ");
            $st->execute([$id]);
            $quotation = $st->fetch();

            if (!$quotation) {
                throw new RuntimeException('Quotation is no longer pending.');
            }

            if ($decision === 'Approved') {
                $localStock = getTeamSalesInventory(
                    $pdo,
                    (string)$quotation['product_code']
                );
                $available = (float)($localStock['stock_quantity'] ?? 0);
                $required = (float)$quotation['quantity'];
                $enoughCurrentStock = $localStock
                    && $required > 0
                    && $available >= $required
                    && (($localStock['status'] ?? 'Active') === 'Active');

                $s = $pdo->prepare("
                    UPDATE sales_quotations
                    SET
                        admin_status = 'Approved',
                        inventory_status = ?,
                        inventory_quantity = ?,
                        inventory_checked_at = NOW()
                    WHERE sq_id = ?
                      AND admin_status = 'Pending'
                ");

                $s->execute([
                    $enoughCurrentStock ? 'Approved' : 'Pending',
                    (int)$available,
                    $id
                ]);

                $notice = $s->rowCount()
                    ? 'Sales quotation approved and ready to be sent to the customer.'
                    : 'Quotation is no longer pending.';

                if ($s->rowCount()) {
                    logActivity(
                        $pdo,
                        'Approve',
                        'Quotation',
                        'Sales Admin approved quotation ' . $quotation['quotation_no'],
                        $id
                    );
                }

            } else {

                $s = $pdo->prepare("
                    UPDATE sales_quotations
                    SET
                        admin_status = 'Rejected',
                        status = 'Rejected'
                    WHERE sq_id = ?
                      AND admin_status = 'Pending'
                ");

                $s->execute([$id]);

                $notice = $s->rowCount()
                    ? 'Sales quotation rejected.'
                    : 'Quotation is no longer pending.';
            }

        /*
        |--------------------------------------------------------------------------
        | LEGACY QUOTATION STOCK REQUEST
        |--------------------------------------------------------------------------
        | Keep old form submissions from creating quotation-based stock requests.
        */
        } elseif (in_array($type, ['request_stockout', 'quotation_stock_request'], true)) {
            throw new RuntimeException('Quotation stock requests are no longer available. Use Purchase Order Requests after the customer approves the quotation.');

        /*
        |--------------------------------------------------------------------------
        | REQUEST STOCK (LEGACY)
        |--------------------------------------------------------------------------
        */
        } elseif ($type === 'specific_stock_request') {

            $productCode = trim($_POST['product_code'] ?? '');
            $selectedSize = (string)($_POST['size'] ?? '');
            $size = $selectedSize === '__no_size__' ? '' : $selectedSize;
            $quantity = (float)($_POST['quantity'] ?? 0);
            $remarks = trim($_POST['remarks'] ?? '');

            if ($productCode === '' || $selectedSize === '' || $quantity <= 0 || floor($quantity) !== $quantity) {
                throw new RuntimeException('Select a finished good and size, then enter a positive whole-number quantity.');
            }

            $result = createTeamSalesStockoutRequest(
                $pdo,
                $productCode,
                $quantity,
                $remarks !== '' ? $remarks : 'Specific stock request from Sales Approval',
                $size
            );

            $notice = ($result['message'] ?? 'Stock request sent to Inventory System.')
                . (!empty($result['request_number'])
                    ? ' Request No.: ' . $result['request_number']
                    : '');

            logActivity(
                $pdo,
                'Create',
                'Inventory Stock Request',
                'Created specific stock request ' . ($result['request_number'] ?? ''),
                (int)($result['request_id'] ?? 0)
            );

        /*
        |--------------------------------------------------------------------------
        | SALES ORDER APPROVAL
        |--------------------------------------------------------------------------
        */
        } elseif ($type === 'order' && in_array($decision, ['Approved', 'Rejected'], true)) {

            if ($decision === 'Approved') {

                $orderCheck = $pdo->prepare("
                    SELECT product_code, quantity, order_no
                    FROM sales_orders
                    WHERE so_id = ?
                    LIMIT 1
                ");
                $orderCheck->execute([$id]);
                $orderRow = $orderCheck->fetch(PDO::FETCH_ASSOC);

                $localStock = getTeamSalesInventory(
                    $pdo,
                    (string)($orderRow['product_code'] ?? '')
                );
                $available = (float)($localStock['stock_quantity'] ?? 0);
                $required = (float)($orderRow['quantity'] ?? 0);

                if (!$localStock || $available < $required) {
                    throw new RuntimeException('Not enough Team Sales stock to approve this Sales Order. Request stock from the Purchase Order Requests menu before approving.');
                }
                $delivery = convertOrderToDelivery($pdo, $id);
                $invoiceNo = ensureSalesInvoiceForOrder($pdo, $id);
                $notice = $invoiceNo
                    ? "Sales Order approved and invoice {$invoiceNo} was generated automatically; Delivery {$delivery} was created."
                    : "Sales Order approved and converted to Delivery {$delivery}.";

            } else {

                $s = $pdo->prepare("
                    UPDATE sales_orders
                    SET
                        admin_status = 'Rejected',
                        status = 'Cancelled'
                    WHERE so_id = ?
                      AND admin_status = 'Pending'
                ");

                $s->execute([$id]);

                $notice = $s->rowCount()
                    ? 'Sales order rejected.'
                    : 'Sales order is no longer pending.';
            }

        /*
        |--------------------------------------------------------------------------
        | SALES RETURN APPROVAL
        |--------------------------------------------------------------------------
        */
        } elseif ($type === 'return' && in_array($decision, ['Approved', 'Rejected'], true)) {

            $s = $pdo->prepare("
                UPDATE sales_returns
                SET
                    admin_status = ?,
                    status = ?
                WHERE ret_id = ?
                  AND admin_status = 'Pending'
            ");

            $s->execute([
                $decision,
                $decision === 'Approved' ? 'Approved' : 'Rejected',
                $id
            ]);

            $notice = $s->rowCount()
                ? 'Sales return approval updated.'
                : 'Sales return is no longer pending.';
        }

    } catch (Throwable $e) {

        $error = $e->getMessage();
    }

    try {
        syncInventoryStockouts($pdo);
    } catch (Throwable $e) {
        if ($error === '') {
            $error = 'Could not refresh Inventory System status: ' . $e->getMessage();
        }
    }
}


/*
|--------------------------------------------------------------------------
| PENDING QUOTATIONS
|--------------------------------------------------------------------------
*/

$quotations = $pdo->query("
    SELECT
        q.*,
        c.customer_name,
        c.email AS customer_email,
        r.request_no
    FROM sales_quotations q
    JOIN customers c
        ON c.cus_id = q.customer_id
    LEFT JOIN customer_order_requests r
        ON r.req_id = q.source_request_id
    WHERE q.admin_status = 'Pending'
    ORDER BY q.sq_id DESC
")->fetchAll();


/*
|--------------------------------------------------------------------------
| CHECK LIVE INVENTORY + INVENTORY REQUEST STATUS
|--------------------------------------------------------------------------
*/

foreach ($quotations as &$q) {

    $localStock = getTeamSalesInventory(
        $pdo,
        (string)($q['product_code'] ?? '')
    );

    $q['live_inventory_ok'] = (bool)$localStock;
    $q['live_inventory_quantity'] = (float)($localStock['stock_quantity'] ?? 0);
    $q['live_inventory_status'] = $localStock['status'] ?? 'Unavailable';

    $required = (float)($q['quantity'] ?? 0);

    $q['enough_stock'] =
        $localStock &&
        ($required > 0) &&
        ($q['live_inventory_quantity'] >= $required) &&
        $q['live_inventory_status'] === 'Active';

    $requestStmt = $pdo->prepare("
        SELECT inventory_request_number AS request_number, request_status, stocked_out_at
        FROM inventory_stockout_approvals
        WHERE source_reference = ?
        ORDER BY id DESC
        LIMIT 1
    ");
    $requestStmt->execute([(string)($q['quotation_no'] ?? '')]);
    $q['inventory_request'] = $requestStmt->fetch(PDO::FETCH_ASSOC) ?: null;

    $q['inventory_request_approved'] =
        !empty($q['inventory_request']) &&
        ($q['inventory_request']['request_status'] ?? '') === 'Approved';

}
unset($q);


$orders = $pdo->query("
    SELECT
        o.*,
        c.customer_name
    FROM sales_orders o
    JOIN customers c
        ON c.cus_id = o.customer_id
    WHERE o.admin_status = 'Pending'
    ORDER BY o.so_id DESC
")->fetchAll();
$returns = $pdo->query("
    SELECT
        r.*,
        o.order_no,
        c.customer_name
    FROM sales_returns r
    JOIN sales_orders o
        ON o.so_id = r.order_id
    JOIN customers c
        ON c.cus_id = o.customer_id
    WHERE r.admin_status = 'Pending'
    ORDER BY r.ret_id DESC
")->fetchAll();


$stockRequestProducts = [];
try {
    $stockRequestProducts = getInventoryFinishedGoods();
} catch (Throwable $e) {
    if ($error === '') {
        $error = 'Could not load Inventory products from the API: ' . $e->getMessage();
    }
}

$pageTitle = 'Sales Approvals';

include __DIR__ . '/includes/header.php';


function approvalForm(string $type, int $id, bool $disabled = false): void
{
    $disabledAttr = $disabled ? ' disabled' : '';

    echo '<form method="POST" class="inline-actions approval-form">'
        . '<input type="hidden" name="type" value="' . htmlspecialchars($type, ENT_QUOTES) . '">'
        . '<input type="hidden" name="id" value="' . $id . '">'
        . '<button type="submit" class="primary-btn" name="decision" value="Approved"' . $disabledAttr . '>Approve</button>'
        . '<button type="submit" class="secondary-btn" name="decision" value="Rejected">Reject</button>'
        . '</form>';
}
?>

<?php if ($notice): ?>
    <div class="alert success"><?= htmlspecialchars($notice) ?></div>
<?php endif; ?>

<?php if ($error): ?>
    <div class="alert error"><?= htmlspecialchars($error) ?></div>
<?php endif; ?>


<div class="approval-tabs">
    <a class="approval-tab <?= (($_GET['tab'] ?? 'approvals') === 'approvals') ? 'active' : '' ?>" href="admin_approvals.php?tab=approvals">Sales Approvals</a>
    <a class="approval-tab <?= (($_GET['tab'] ?? '') === 'stock-request') ? 'active' : '' ?>" href="admin_approvals.php?tab=stock-request">Request Specific Stock</a>
</div>

<div class="panel stock-request-tab-panel" style="margin-top:18px;display:<?= (($_GET['tab'] ?? '') === 'stock-request') ? 'block' : 'none' ?>;">
    <div class="panel-head">
        <div>
            <p class="eyebrow dark">INVENTORY REQUEST</p>
            <h2 style="margin:0;">Request a Specific Product</h2>
            <p class="muted" style="margin:5px 0 0;">Select the exact product and size, enter the quantity and remarks, then send the request to Inventory for approval.</p>
        </div>
        <button type="button" class="primary-btn" onclick="openSpecificStockRequestModal()">+ New Stock Request</button>
    </div>
    <div class="note-card">
        <b>Inventory System is the approving department.</b>
        <span>After submission, the request code is generated automatically. Approval, decline, and stock-out results will sync back to Team Sales.</span>
    </div>
</div>

<?php $stockRequestTab = (($_GET['tab'] ?? 'approvals') === 'stock-request'); ?>
<div class="sales-approval-content" style="display:<?= $stockRequestTab ? 'none' : 'block' ?>;">

<!--
|--------------------------------------------------------------------------
| SALES QUOTATION APPROVAL
|--------------------------------------------------------------------------
-->

<div class="panel approval-panel">

    <div class="panel-head">

        <div>

            <p class="eyebrow dark">
                SALES QUOTATION APPROVAL
            </p>

            <h2>
                Quotation Approval Status
            </h2>

            <p class="muted">
                Approve quotations for the customer regardless of current Sales stock. Request replenishment from Purchase Order Requests after the customer accepts.
            </p>

        </div>

    </div>


    <div class="approval-card-list">

        <?php foreach ($quotations as $q): ?>

            <?php
                $request = $q['inventory_request'] ?? null;
                $requestStatus = $request['request_status'] ?? '';
                $canApprove = true;
            ?>

            <article class="approval-container-card">

                <div class="approval-card-top">

                    <div>

                        <span class="eyebrow dark">
                            <?= htmlspecialchars($q['quotation_no']) ?>
                        </span>

                        <h3>
                            <?= htmlspecialchars($q['customer_name']) ?>
                        </h3>

                        <p class="muted">
                            Request:
                            <?= htmlspecialchars($q['request_no'] ?? '—') ?>
                            ·
                            <?= niceDate($q['quotation_date']) ?>
                        </p>

                    </div>

                    <span class="badge warning">
                        Pending Admin Approval
                    </span>

                </div>


                <div class="approval-detail-grid">

                    <div>
                        <span>Product</span>
                        <b><?= htmlspecialchars($q['product_code'] ?? '—') ?></b>
                    </div>

                    <div>
                        <span>Required</span>
                        <b><?= (int)$q['quantity'] ?></b>
                    </div>

                    <div>
                        <span>Current Stock</span>
                        <b>
                            <?= $q['live_inventory_ok']
                                ? number_format((float)$q['live_inventory_quantity'], 2)
                                : 'Unavailable' ?>
                        </b>
                    </div>

                    <div>
                        <span>Inventory</span>
                        <b>
                            <?php if ($q['enough_stock']): ?>
                                <span class="badge success">Stock Available</span>
                            <?php elseif ($requestStatus === 'Requested'): ?>
                                <span class="badge warning">Waiting for Inventory</span>
                            <?php elseif ($requestStatus === 'Stocked Out'): ?>
                                <span class="badge warning">Stocked Out — Team Sales Approval Needed</span>
                            <?php elseif ($requestStatus === 'Approved'): ?>
                                <span class="badge success">Stock-out Added to Team Sales</span>
                            <?php elseif ($requestStatus === 'Rejected'): ?>
                                <span class="badge danger">Stock-out Rejected</span>
                            <?php else: ?>
                                <span class="badge danger">Insufficient Stock</span>
                            <?php endif; ?>
                        </b>
                    </div>

                    <div>
                        <span>Total</span>
                        <b><?= peso((float)$q['total_amount']) ?></b>
                    </div>

                </div>


                <?php if ($request): ?>

                    <div class="note-card" style="margin-top:14px;">

                        <b>
                            Inventory Request:
                            <?= htmlspecialchars($request['request_number'] ?? 'Not Requested') ?>
                        </b>

                        <span>
                            Status:
                            <strong>
                                <?= htmlspecialchars($requestStatus ?? 'Pending') ?>
                            </strong>

                            <?php if (!empty($request['warehouse_name'])): ?>
                                · Warehouse:
                                <?= htmlspecialchars($request['warehouse_name']) ?>
                            <?php endif; ?>
                        </span>

                    </div>

                <?php endif; ?>


                <div class="approval-card-actions">

                    <a
                        class="secondary-btn"
                        href="quotation_export.php?id=<?= (int)$q['sq_id'] ?>&format=pdf"
                        target="_blank"
                    >
                        View Quotation
                    </a>


                    <?php
                        approvalForm(
                            'quotation',
                            (int)$q['sq_id'],
                            !$canApprove
                        );
                    ?>

                </div>

            </article>

        <?php endforeach; ?>


        <?php if (!$quotations): ?>

            <div class="note-card">

                <b>
                    No quotations are waiting for approval.
                </b>

                <span>
                    New quotations created by Sales Admin will appear here.
                </span>

            </div>

        <?php endif; ?>

    </div>

</div>


<!--
|--------------------------------------------------------------------------
| SALES ORDERS
|--------------------------------------------------------------------------
-->

<div class="panel approval-panel" style="margin-top:18px">

    <div class="panel-head">

        <div>

            <p class="eyebrow dark">
                SALES ORDERS
            </p>

            <h2>
                Pending Sales Order Approval
            </h2>

        </div>

    </div>

    <div class="approval-card-list">

        <?php foreach ($orders as $o): ?>

            <article class="approval-container-card">

                <div class="approval-card-top">

                    <div>

                        <span class="eyebrow dark">
                            <?= htmlspecialchars($o['order_no']) ?>
                        </span>

                        <h3>
                            <?= htmlspecialchars($o['customer_name']) ?>
                        </h3>

                    </div>

                    <span class="badge warning">
                        Pending
                    </span>

                </div>

                <div class="approval-detail-grid">

                    <div>
                        <span>Product</span>
                        <b><?= htmlspecialchars($o['product_code']) ?></b>
                    </div>

                    <div>
                        <span>Quantity</span>
                        <b><?= (int)$o['quantity'] ?></b>
                    </div>

                    <div>
                        <span>Total</span>
                        <b><?= peso((float)$o['total_amount']) ?></b>
                    </div>
                </div>

                <div class="approval-card-actions">

                    <?php approvalForm('order', (int)$o['so_id']); ?>

                </div>

            </article>

        <?php endforeach; ?>


        <?php if (!$orders): ?>

            <div class="note-card">
                <b>No Sales Orders are waiting for approval.</b>
            </div>

        <?php endif; ?>

    </div>

</div>


<!--
|--------------------------------------------------------------------------
| SALES RETURNS
|--------------------------------------------------------------------------
-->

<div class="panel approval-panel" style="margin-top:18px">

    <div class="panel-head">

        <div>

            <p class="eyebrow dark">
                SALES RETURNS
            </p>

            <h2>
                Pending Sales Return Approval
            </h2>

        </div>

    </div>

    <div class="approval-card-list">

        <?php foreach ($returns as $r): ?>

            <article class="approval-container-card">

                <div class="approval-card-top">

                    <div>

                        <span class="eyebrow dark">
                            <?= htmlspecialchars($r['return_no']) ?>
                        </span>

                        <h3>
                            <?= htmlspecialchars($r['customer_name']) ?>
                        </h3>

                        <p class="muted">
                            Order <?= htmlspecialchars($r['order_no']) ?>
                        </p>

                    </div>

                    <span class="badge warning">
                        Pending
                    </span>

                </div>

                <div class="approval-detail-grid">

                    <div>
                        <span>Reason</span>
                        <b><?= htmlspecialchars($r['reason'] ?? '—') ?></b>
                    </div>

                    <div>
                        <span>Amount</span>
                        <b><?= peso((float)$r['total_amount']) ?></b>
                    </div>

                </div>

                <div class="approval-card-actions">

                    <?php approvalForm('return', (int)$r['ret_id']); ?>

                </div>

            </article>

        <?php endforeach; ?>


        <?php if (!$returns): ?>

            <div class="note-card">
                <b>No Sales Returns are waiting for approval.</b>
            </div>

        <?php endif; ?>

    </div>

</div>


</div>

<!-- SPECIFIC STOCK REQUEST MODAL -->
<div id="specificStockRequestModal" class="stock-request-modal" aria-hidden="true">
    <div class="stock-request-backdrop" onclick="closeSpecificStockRequestModal()"></div>
    <div class="stock-request-dialog" role="dialog" aria-modal="true" aria-labelledby="specificStockRequestTitle">
        <div class="stock-request-dialog-head">
            <div>
                <p class="eyebrow dark" style="margin-bottom:6px;">INVENTORY REQUEST</p>
                <h2 id="specificStockRequestTitle" style="margin:0;">Request Finished Goods from Inventory</h2>
                <p class="muted" style="margin:6px 0 0;">Inventory System will approve or decline this request.</p>
            </div>
            <button type="button" class="stock-request-close" onclick="closeSpecificStockRequestModal()" aria-label="Close">&times;</button>
        </div>

        <form method="POST" class="stock-request-form" id="specificStockRequestForm">
            <input type="hidden" name="type" value="specific_stock_request">
            <input type="hidden" name="request_number" id="specificRequestNumber">

            <label>
                <span>Request Code</span>
                <input type="text" id="specificRequestNumberPreview" readonly>
                <small>Generated automatically for this request.</small>
            </label>

            <div class="stock-request-fields">
                <label>
                    <span>Product</span>
                    <select name="product_code" id="specificProductCode" required>
                        <option value="">Select product</option>
                        <?php
                        $seenProducts = [];
                        foreach ($stockRequestProducts as $p):
                            $key = (string)$p['item_code'];
                            if (isset($seenProducts[$key])) continue;
                            $seenProducts[$key] = true;
                        ?>
                            <option value="<?= htmlspecialchars($p['item_code'], ENT_QUOTES) ?>">
                                <?= htmlspecialchars($p['item_code'] . ' — ' . $p['item_name'] . (($p['brand'] ?? '') !== '' ? ' · ' . $p['brand'] : '')) ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </label>

                <label>
                    <span>Size</span>
                    <select name="size" id="specificProductSize" required disabled>
                        <option value="">Select product first</option>
                    </select>
                </label>
            </div>

            <label>
                <span>Quantity</span>
                <input type="number" name="quantity" min="1" step="1" required placeholder="0">
            </label>

            <label>
                <span>Remarks</span>
                <textarea name="remarks" rows="3" maxlength="500" placeholder="Reason or additional instructions"></textarea>
            </label>

            <div class="stock-request-actions">
                <button type="button" class="secondary-btn" onclick="closeSpecificStockRequestModal()">Cancel</button>
                <button type="submit" class="primary-btn">Send to Inventory</button>
            </div>
        </form>
    </div>
</div>




<style>
.approval-tabs{display:flex;gap:8px;margin-top:18px;border-bottom:1px solid #e7dfdf;padding-bottom:0;}
.approval-tab{display:inline-flex;align-items:center;padding:12px 18px;border-radius:12px 12px 0 0;text-decoration:none;color:#6d5f5f;font-weight:700;background:#f6f2f2;}
.approval-tab.active{background:#111;color:#fff;}
.specific-stock-request-modal textarea{width:100%;box-sizing:border-box;border:1px solid #ddd4d4;border-radius:11px;padding:12px 13px;font:inherit;resize:vertical;outline:none;}
.approval-confirm-modal{display:none;position:fixed;inset:0;z-index:10050;align-items:center;justify-content:center;padding:20px;}
.approval-confirm-modal.is-open{display:flex;}
.approval-confirm-backdrop{position:absolute;inset:0;background:rgba(15,23,42,.52);backdrop-filter:blur(3px);}
.approval-confirm-dialog{position:relative;width:min(430px,100%);background:#fff;border-radius:18px;padding:25px;box-shadow:0 24px 70px rgba(0,0,0,.22);}
.approval-confirm-dialog h3{margin:0 0 8px;}
.approval-confirm-dialog p{color:#666;line-height:1.5;margin:0 0 20px;}
.approval-confirm-actions{display:flex;justify-content:flex-end;gap:10px;}
</style>

<div id="approvalConfirmModal" class="approval-confirm-modal" aria-hidden="true">
    <div class="approval-confirm-backdrop" onclick="closeApprovalConfirm()"></div>
    <div class="approval-confirm-dialog" role="dialog" aria-modal="true">
        <h3>Confirm Approval</h3>
        <p id="approvalConfirmText">Are you sure you want to approve this record?</p>
        <div class="approval-confirm-actions">
            <button type="button" class="secondary-btn" onclick="closeApprovalConfirm()">Cancel</button>
            <button type="button" class="primary-btn" id="approvalConfirmButton">Yes, Approve</button>
        </div>
    </div>
</div>

<script>
(function(){
  let pendingApprovalForm=null;

  window.openApprovalConfirm=function(form){
    pendingApprovalForm=form;
    const modal=document.getElementById('approvalConfirmModal');
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden','false');
  };

  window.closeApprovalConfirm=function(){
    pendingApprovalForm=null;
    const modal=document.getElementById('approvalConfirmModal');
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden','true');
  };

  document.addEventListener('DOMContentLoaded',function(){
    document.querySelectorAll('.approval-form').forEach(function(form){
      form.addEventListener('submit',function(e){
        if(e.submitter && e.submitter.value==='Approved'){
          if(form.dataset.confirmed==='1'){
            form.dataset.confirmed='0';
            return;
          }
          e.preventDefault();
          openApprovalConfirm(form);
        }
      });
    });

    document.getElementById('approvalConfirmButton').addEventListener('click',function(){
      if(!pendingApprovalForm)return;
      pendingApprovalForm.dataset.confirmed='1';
      pendingApprovalForm.requestSubmit(pendingApprovalForm.querySelector('button[value="Approved"]'));
      closeApprovalConfirm();
    });

    const productSelect=document.getElementById('specificProductCode');
    const sizeSelect=document.getElementById('specificProductSize');
    const productSizes=<?= json_encode(array_values($stockRequestProducts), JSON_HEX_TAG|JSON_HEX_APOS|JSON_HEX_AMP|JSON_HEX_QUOT) ?>;

    function refreshSizes(){
      const code=productSelect.value;
      sizeSelect.innerHTML='<option value="">Select size</option>';
      const matches=productSizes.filter(function(p){return String(p.item_code)===String(code);});
      matches.forEach(function(p){
        const opt=document.createElement('option');
        opt.value=p.size || '__no_size__';
        opt.textContent=(p.size || 'Standard / no size') + (p.unit ? ' · '+p.unit : '');
        sizeSelect.appendChild(opt);
      });
      sizeSelect.disabled=matches.length===0;
    }
    function refreshRequestCode(){
      const code='AUTO-GENERATED';
      document.getElementById('specificRequestNumber').value='';
      document.getElementById('specificRequestNumberPreview').value=code;
    }
    if(productSelect) productSelect.addEventListener('change',function(){
      refreshSizes();
      refreshRequestCode();
    });

    window.openSpecificStockRequestModal=function(){
      const modal=document.getElementById('specificStockRequestModal');
      document.getElementById('specificStockRequestForm').reset();
      refreshSizes();
      refreshRequestCode();
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden','false');
    };
    window.closeSpecificStockRequestModal=function(){
      const modal=document.getElementById('specificStockRequestModal');
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden','true');
    };
  });
})();
</script>

<?php include __DIR__ . '/includes/footer.php'; ?>
