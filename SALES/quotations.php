<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';

requireSalesWorkspace();

$pdo = getDB();

normalizeExpiredQuotationStatuses($pdo);

$error = '';
$notice = '';

/*
|--------------------------------------------------------------------------
| POST ACTIONS
|--------------------------------------------------------------------------
*/

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $action = $_POST['action'] ?? '';

    /*
    |--------------------------------------------------------------------------
    | CREATE QUOTATION FROM CUSTOMER ORDER REQUEST
    |--------------------------------------------------------------------------
    */
    if ($action === 'create_from_request') {

        $requestId  = (int)($_POST['request_id'] ?? 0);
        $date       = $_POST['quotation_date'] ?? date('Y-m-d');
        $validUntil = $_POST['valid_until'] ?? null;

        /*
        |--------------------------------------------------------------------------
        | Get customer order request
        |--------------------------------------------------------------------------
        */
        $st = $pdo->prepare("
            SELECT 
                r.*,
                c.customer_name
            FROM customer_order_requests r
            JOIN customers c 
                ON c.cus_id = r.customer_id
            WHERE r.req_id = ?
              AND r.status = 'Pending Quotation'
            LIMIT 1
        ");

        $st->execute([$requestId]);
        $request = $st->fetch();

        if (!$request) {

            $error = 'Customer order request not found or it already has a quotation.';

        } elseif (trim((string)($request['size'] ?? '')) === '') {

            $error = 'The customer request does not contain a selected size. Ask the customer to resubmit the request with a size.';

        } else {

            $priceStmt = $pdo->prepare("SELECT unit_price FROM inventory WHERE BINARY product_code = BINARY ? AND status = 'Active' LIMIT 1");
            $priceStmt->execute([$request['product_code']]);
            $unitPrice = $priceStmt->fetchColumn();

            if ($unitPrice === false || (float)$unitPrice <= 0) {
                $error = 'Set a fixed price for this item in Sales Inventory before creating its quotation.';
            } else {

            /*
            |--------------------------------------------------------------------------
            | Check inventory using the request's product_code
            |--------------------------------------------------------------------------
            */
            $check = evaluateQuotationStock(
                $request['product_code'],
                (int)$request['quantity']
            );

            if (!$check['ok']) {

                $error = $check['error'];

            } else {

                $stock = $check['stock'];

                // Inventory supplies the product/master data; Team Sales stock determines whether the quotation can be approved.
                $shippingFee = round((float)($request['shipping_fee'] ?? 0), 2);
                $total = round((float)$unitPrice * (int)$request['quantity'] + $shippingFee, 2);

                if ($total <= 0 || !is_finite($total)) {

                    $error = 'Could not compute the quotation total. Check the unit price and quantity.';

                } else {

                    try {

                        $pdo->beginTransaction();

                        /*
                        |--------------------------------------------------------------------------
                        | Generate quotation number
                        |--------------------------------------------------------------------------
                        */
                        $quotationNo = nextDocNo(
                            $pdo,
                            'sales_quotations',
                            'QT-',
                            2000
                        );

                        /*
                        |--------------------------------------------------------------------------
                        | Insert quotation
                        |--------------------------------------------------------------------------
                        |
                        |
                        */
                        $ins = $pdo->prepare("
                            INSERT INTO sales_quotations
                            (
                                quotation_no,
                                customer_id,
                                source_request_id,
                                quotation_date,
                                valid_until,
                                product_code,
                                size,
                                fg_id,
                                quantity,
                                inventory_quantity,
                                inventory_checked_at,
                                inventory_status,
                                total_amount,
                                shipping_fee,
                                status,
                                admin_status,
                                customer_status
                            )
                            VALUES
                            (
                                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?,
                                ?, ?, 'Pending', 'Pending', 'Pending'
                            )
                        ");

                        $ins->execute([
                            $quotationNo,
                            $request['customer_id'],
                            $requestId,
                            $date,
                            $validUntil ?: null,

                            // Sales quotation product code
                            $request['product_code'],

                            // Exact Finished Good size selected by the customer
                            $request['size'],

                            // Inventory finished_goods.id
                            $stock['fg_id'] ?? null,

                            (int)$request['quantity'],
                            (int)$check['available'],

                            $check['status'],
                            $total,
                            $shippingFee
                        ]);

                        /*
                        |--------------------------------------------------------------------------
                        | Get newly created quotation ID
                        |--------------------------------------------------------------------------
                        */
                        $qid = (int)$pdo->lastInsertId();

                        /*
                        |--------------------------------------------------------------------------
                        | Update customer order request
                        |--------------------------------------------------------------------------
                        */
                        $updateRequest = $pdo->prepare("
                            UPDATE customer_order_requests
                            SET 
                                status = 'Quotation Sent',
                                quotation_id = ?
                            WHERE req_id = ?
                        ");

                        $updateRequest->execute([
                            $qid,
                            $requestId
                        ]);

                        notifySalesAdminsPendingApproval(
                            $pdo,
                            'quotation-pending:' . $qid,
                            'Quotation awaiting approval',
                            'Quotation ' . $quotationNo . ' for ' . $request['customer_name']
                                . ' (' . $request['product_code'] . ' × ' . (int)$request['quantity'] . ') is awaiting review.',
                            'sales_quotation_approval.php'
                        );

                        $pdo->commit();

                        /*
                        |--------------------------------------------------------------------------
                        | Activity log
                        |--------------------------------------------------------------------------
                        */
                        logActivity(
                            $pdo,
                            'Create',
                            'Quotation',
                            'Created ' . $quotationNo .
                            ' for customer order ' .
                            $request['request_no'],
                            $qid
                        );

                        header(
                            'Location: quotations.php?section=core&added=1'
                        );

                        exit;

                    } catch (Throwable $e) {

                        if ($pdo->inTransaction()) {
                            $pdo->rollBack();
                        }

                        $error = 'The quotation could not be saved: ' .
                            $e->getMessage();
                    }
                }
            }
            }
        }
    }


    /*
    |--------------------------------------------------------------------------
    | RECHECK INVENTORY
    |--------------------------------------------------------------------------
    */
    if ($action === 'recheck') {

        $quotationId = (int)($_POST['quotation_id'] ?? 0);

        $stmt = $pdo->prepare("
            SELECT *
            FROM sales_quotations
            WHERE sq_id = ?
            LIMIT 1
        ");

        $stmt->execute([$quotationId]);

        $q = $stmt->fetch();

        if (
            !$q ||
            empty($q['product_code']) ||
            empty($q['quantity'])
        ) {

            $error = 'Quotation information is incomplete.';

        } else {

            $check = evaluateQuotationStock(
                $q['product_code'],
                (int)$q['quantity']
            );

            if (!$check['ok']) {

                $error = $check['error'];

            } else {

                $update = $pdo->prepare("
                    UPDATE sales_quotations
                    SET
                        inventory_status = ?,
                        inventory_quantity = ?,
                        fg_id = ?,
                        inventory_checked_at = NOW()
                    WHERE sq_id = ?
                ");

                $update->execute([
                    $check['status'],
                    $check['available'],
                    $check['stock']['fg_id'] ?? null,
                    $quotationId
                ]);

                $notice =
                    'Inventory status updated to ' .
                    $check['status'] .
                    '.';
            }
        }
    }
}


/*
|--------------------------------------------------------------------------
| PAGE
|--------------------------------------------------------------------------
*/

$pageTitle = 'Sales Quotations';

include __DIR__ . '/includes/header.php';


/*
|--------------------------------------------------------------------------
| SEARCH
|--------------------------------------------------------------------------
*/

$search = trim($_GET['search'] ?? '');


/*
|--------------------------------------------------------------------------
| GET EXISTING QUOTATIONS
|--------------------------------------------------------------------------
*/

$sql = "
    SELECT
        q.*,
        CASE
            WHEN q.customer_status = 'Pending'
             AND q.valid_until IS NOT NULL
             AND q.valid_until < CURDATE()
            THEN 'Expired'
            ELSE q.customer_status
        END AS customer_approval_status,
        c.customer_name,
        r.request_no,

        (
            SELECT po.po_no
            FROM purchase_orders po
            WHERE po.quotation_id = q.sq_id
            LIMIT 1
        ) AS po_no

    FROM sales_quotations q

    LEFT JOIN customers c
        ON c.cus_id = q.customer_id

    LEFT JOIN customer_order_requests r
        ON r.req_id = q.source_request_id
";

$params = [];

if ($search !== '') {

    $sql .= "
        WHERE
            q.quotation_no LIKE ?
            OR c.customer_name LIKE ?
            OR q.product_code LIKE ?
            OR q.customer_status LIKE ?
            OR (
                q.customer_status = 'Pending'
                AND q.valid_until IS NOT NULL
                AND q.valid_until < CURDATE()
                AND LOWER(?) LIKE '%expired%'
            )
    ";

    $like = '%' . $search . '%';

    $params = [
        $like,
        $like,
        $like,
        $like,
        $search
    ];
}

$sql .= "
    ORDER BY q.sq_id DESC
";

$st = $pdo->prepare($sql);
$st->execute($params);

$rows = $st->fetchAll();


$requests = $pdo->query("
    SELECT
        r.*,
        c.customer_name,
        i.unit_price
    FROM customer_order_requests r
    JOIN customers c
        ON c.cus_id = r.customer_id
    LEFT JOIN inventory i
        ON BINARY i.product_code = BINARY r.product_code
    WHERE r.status = 'Pending Quotation'
    ORDER BY r.req_id DESC
")->fetchAll();

try {
    $productNames = [];
    foreach (getInventoryFinishedGoods() as $product) {
        $productNames[(string)$product['item_code']] = (string)$product['item_name'];
    }
    foreach ($requests as &$request) {
        $request['product_name'] = $productNames[(string)$request['product_code']] ?? '';
    }
    unset($request);
} catch (Throwable $e) {
    $error = 'Could not load product names from Inventory API: ' . $e->getMessage();
}

?>

<div class="page-toolbar">

    <p class="muted" style="color:white;">
        Customer orders appear here first. Sales reviews who ordered,
        creates the quotation, and sends the PDF to the customer for approval.
    </p>

</div>


<?php if (!empty($_GET['added'])): ?>

    <div class="alert success">
        Quotation created and sent to Sales Admin for approval.
    </div>

<?php endif; ?>


<?php if ($notice): ?>

    <div class="alert success">
        <?= htmlspecialchars($notice) ?>
    </div>

<?php endif; ?>


<?php if ($error): ?>

    <div class="alert error">
        <?= htmlspecialchars($error) ?>
    </div>

<?php endif; ?>


<!--
|--------------------------------------------------------------------------
| CUSTOMER ORDER REQUESTS
|--------------------------------------------------------------------------
-->

<div class="panel">

    <div class="panel-head">

        <div>

            <p class="eyebrow dark">
                CUSTOMER ORDER REQUESTS
            </p>

            <h2>
                Orders Waiting for Quotation
            </h2>

        </div>

    </div>

    <div class="module-search">
        <input
            type="search"
            id="quotationRequestsSearch"
            placeholder="Search request, customer, or product..."
            aria-label="Search customer order requests"
        >
    </div>

    <div class="table-wrap">

        <table id="quotationRequestsTable">

            <thead>

                <tr>

                    <th>Request</th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Date</th>
                    <th>Action</th>

                </tr>

            </thead>


            <tbody>

            <?php foreach ($requests as $r): ?>

                <tr>

                    <td>
                        <b>
                            <?= htmlspecialchars($r['request_no']) ?>
                        </b>
                    </td>


                    <td>
                        <?= htmlspecialchars($r['customer_name']) ?>
                    </td>


                    <td>

                        <?= htmlspecialchars(
                            $r['product_name']
                            ?: $r['product_code']
                        ) ?>

                        <br>

                        <small>
                            <?= htmlspecialchars($r['product_code']) ?>
                        </small>

                    </td>


                    <td>
                        <?= (int)$r['quantity'] ?>
                    </td>


                    <td>
                        <?= niceDate($r['request_date']) ?>
                    </td>


                    <td>

                        <button
                            class="table-action"
                            data-open-modal="createQuotation<?= (int)$r['req_id'] ?>"
                        >
                            Create Quotation
                        </button>

                    </td>

                </tr>


                <!--
                |--------------------------------------------------------------------------
                | CREATE QUOTATION MODAL
                |--------------------------------------------------------------------------
                -->

                <div
                    class="modal-backdrop"
                    id="createQuotation<?= (int)$r['req_id'] ?>"
                    aria-hidden="true"
                >

                    <div
                        class="profile-modal entry-modal quotation-modal"
                        role="dialog"
                    >

                        <button
                            class="modal-close"
                            type="button"
                            data-close-modal
                        >
                            ×
                        </button>


                        <p class="eyebrow">
                            SALES QUOTATION
                        </p>


                        <h2>
                            Create for
                            <?= htmlspecialchars($r['customer_name']) ?>
                        </h2>


                        <p class="modal-subtitle">

                            <?= htmlspecialchars($r['product_code']) ?>

                            ×

                            <?= (int)$r['quantity'] ?>

                            · Customer Request

                            <?= htmlspecialchars($r['request_no']) ?>

                        </p>


                        <form
                            method="POST"
                            class="entry-form"
                        >

                            <input
                                type="hidden"
                                name="action"
                                value="create_from_request"
                            >


                            <input
                                type="hidden"
                                name="request_id"
                                value="<?= (int)$r['req_id'] ?>"
                            >


                           <div class="quotation-fields">

    <!-- Quotation Date -->
    <div class="quotation-field">
        <label for="quotation_date">
            Quotation Date
        </label>

        <input
            type="date"
            id="quotation_date"
            name="quotation_date"
            value="<?= date('Y-m-d') ?>"
            readonly
            required
        >
    </div>


    <!-- Unit Price -->
    <div class="quotation-field">
        <label for="unit_price_<?= (int)$r['req_id'] ?>">
            Unit Price (₱)
        </label>

        <div class="price-input">
            <span>₱</span>

            <input
                type="number"
                id="unit_price_<?= (int)$r['req_id'] ?>"
                name="unit_price_display"
                step="0.01"
                value="<?= (float)($r['unit_price'] ?? 0) > 0 ? htmlspecialchars(number_format((float)$r['unit_price'], 2, '.', '')) : '' ?>"
                placeholder="Set price in Sales Inventory"
                readonly
            >
        </div>
        <?php if ((float)($r['unit_price'] ?? 0) <= 0): ?>
            <small>Set this item’s fixed price in Sales Inventory before creating its quotation.</small>
        <?php endif; ?>
    </div>


    <!-- Valid Until -->
    <div class="quotation-field">
        <label for="valid_until">
            Valid Until
        </label>

        <input
            type="date"
            id="valid_until"
            name="valid_until"
            required
        >
    </div>

                            <div class="modal-actions">

                                <button
                                    type="button"
                                    class="secondary-btn"
                                    data-close-modal
                                >
                                    Cancel
                                </button>


                                <button
                                    type="submit"
                                    class="primary-btn"
                                    <?= (float)($r['unit_price'] ?? 0) <= 0 ? 'disabled' : '' ?>
                                >
                                    Create & Send Quotation
                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            <?php endforeach; ?>


            <?php if (!$requests): ?>

            <tr class="empty-row">

                    <td colspan="6">
                        No customer orders are waiting for quotation.
                    </td>

                </tr>

            <?php endif; ?>

            <tr class="quotation-search-empty" hidden>
                <td colspan="6">No matching customer requests.</td>
            </tr>

            </tbody>

        </table>

    </div>

</div>


<!--
|--------------------------------------------------------------------------
| EXISTING QUOTATIONS
|--------------------------------------------------------------------------
-->

<div
    class="panel"
    style="margin-top:18px"
>

    <div class="panel-head">

        <div>

            <p class="eyebrow dark">
                QUOTATIONS
            </p>

            <h2>
                Customer Approval Status
            </h2>

        </div>

    </div>


    <!-- SEARCH -->

    <div class="module-search">

        <form method="GET">

            <input
                type="hidden"
                name="section"
                value="core"
            >


            <input
                type="search"
                name="search"
                value="<?= htmlspecialchars($search) ?>"
                placeholder="Search quotation, customer, product, or status..."
            >


            <button
                class="secondary-btn"
                type="submit"
            >
                Search
            </button>

        </form>

    </div>


    <div class="table-wrap">

        <table>

            <thead>

                <tr>

                    <th>Quotation</th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Total</th>
                    <th>Inventory</th>
                    <th>Customer Approval</th>
                    <th>Document</th>

                </tr>

            </thead>


            <tbody>

            <?php foreach ($rows as $r): ?>

                <tr>

                    <td>

                        <b>
                            <?= htmlspecialchars($r['quotation_no']) ?>
                        </b>

                        <br>

                        <small>
                            <?= niceDate($r['quotation_date']) ?>
                        </small>

                    </td>


                    <td>
                        <?= htmlspecialchars($r['customer_name']) ?>
                    </td>


                    <td>
                        <?= htmlspecialchars(
                            $r['product_code'] ?? '—'
                        ) ?>
                    </td>


                    <td>
                        <?= (int)$r['quantity'] ?>
                    </td>


                    <td>
                        <?= peso((float)$r['total_amount']) ?>
                    </td>


                    <td>

                        <span
                            class="badge <?= badgeClass($r['inventory_status']) ?>"
                        >
                            <?= htmlspecialchars($r['inventory_status']) ?>
                        </span>

                    </td>


                    <td>

                        <span
                            class="badge <?= badgeClass($r['customer_approval_status']) ?>"
                        >
                            <?= htmlspecialchars($r['customer_approval_status']) ?>
                        </span>


                        <?php if ($r['po_no']): ?>

                            <br>

                            <small>
                                PO:
                                <?= htmlspecialchars($r['po_no']) ?>
                            </small>

                        <?php endif; ?>

                    </td>


                    <td>

                        <a
                            class="table-action"
                            href="quotation_export.php?id=<?= (int)$r['sq_id'] ?>&format=pdf"
                            target="_blank"
                        >
                            PDF
                        </a>


                        <?php if ($r['inventory_status'] !== 'Approved'): ?>

                            <form
                                method="POST"
                                style="display:inline"
                            >

                                <input
                                    type="hidden"
                                    name="action"
                                    value="recheck"
                                >


                                <input
                                    type="hidden"
                                    name="quotation_id"
                                    value="<?= (int)$r['sq_id'] ?>"
                                >


                                <button
                                    class="table-action"
                                    type="submit"
                                >
                                    Recheck Stock
                                </button>

                            </form>

                        <?php endif; ?>

                    </td>

                </tr>

            <?php endforeach; ?>


            <?php if (!$rows): ?>

                <tr>

                    <td colspan="8">
                        No quotations found.
                    </td>

                </tr>

            <?php endif; ?>

            </tbody>

        </table>

    </div>

</div>


<script>
document.addEventListener('DOMContentLoaded', function () {
    var requestSearch = document.getElementById('quotationRequestsSearch');
    var requestTable = document.getElementById('quotationRequestsTable');

    if (requestSearch && requestTable) {
        requestSearch.addEventListener('input', function () {
            var term = requestSearch.value.trim().toLowerCase();
            var rows = Array.from(requestTable.querySelectorAll('tbody tr:not(.empty-row):not(.quotation-search-empty)'));
            var matches = 0;

            rows.forEach(function (row) {
                var searchableText = Array.from(row.cells)
                    .slice(0, 5)
                    .map(function (cell) { return cell.textContent; })
                    .join(' ')
                    .toLowerCase();
                var isMatch = !term || searchableText.includes(term);
                row.style.display = isMatch ? '' : 'none';
                if (isMatch) matches++;
            });

            var emptyState = requestTable.querySelector('.empty-row');
            if (emptyState) emptyState.style.display = term ? 'none' : '';

            var noMatches = requestTable.querySelector('.quotation-search-empty');
            if (noMatches) noMatches.hidden = term === '' || matches > 0;
        });
    }

    function openQuotationModal(id) {
        var modal = document.getElementById(id);
        if (!modal) return;
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
    }

    function closeQuotationModal(modal) {
        if (!modal) return;
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        if (!document.querySelector('.modal-backdrop.open')) {
            document.body.classList.remove('modal-open');
        }
    }

    document.querySelectorAll('[data-open-modal]').forEach(function (button) {
        button.addEventListener('click', function (e) {
            e.preventDefault();
            openQuotationModal(button.getAttribute('data-open-modal'));
        });
    });

    document.querySelectorAll('.modal-backdrop [data-close-modal]').forEach(function (button) {
        button.addEventListener('click', function () {
            closeQuotationModal(button.closest('.modal-backdrop'));
        });
    });

    document.querySelectorAll('.modal-backdrop').forEach(function (backdrop) {
        backdrop.addEventListener('click', function (e) {
            if (e.target === backdrop) closeQuotationModal(backdrop);
        });
    });

    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        var modal = document.querySelector('.modal-backdrop.open');
        if (modal) closeQuotationModal(modal);
    });

    document.querySelectorAll('.quotation-modal').forEach(function (modal) {
        var price = modal.querySelector('input[name="unit_price_display"]');
        if (!price) return;

        var quantityText = modal.querySelector('.modal-subtitle');
        var match = quantityText ? quantityText.textContent.match(/×\s*(\d+)/) : null;
        var quantity = match ? parseFloat(match[1]) : 0;
        var total = document.createElement('div');
        total.className = 'quotation-total-live';
        price.closest('.quotation-field').appendChild(total);

        function updateTotal() {
            var value = parseFloat(price.value) || 0;
            total.textContent = 'Quotation Total: ₱' + (value * quantity).toLocaleString('en-PH', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }
        price.addEventListener('input', updateTotal);
        updateTotal();
    });
});
</script>

<?php include __DIR__ . '/includes/footer.php'; ?>
