<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';
requireSalesAdmin();
$pdo = getDB();

/* ------------------------------------------------------------------
 * AJAX: transaction history for one customer (JSON)
 * Combines quotations, purchase orders, sales orders, invoices,
 * collections (payments) and returns into one newest-first timeline.
 * ------------------------------------------------------------------ */
if (($_GET['ajax'] ?? '') === 'transactions') {
    header('Content-Type: application/json');
    $cid = (int) ($_GET['id'] ?? 0);

    $cs = $pdo->prepare('SELECT customer_code, customer_name FROM customers WHERE cus_id = ?');
    $cs->execute([$cid]);
    $cust = $cs->fetch();
    if (!$cust) {
        http_response_code(404);
        echo json_encode(['ok' => false, 'error' => 'Customer not found.']);
        exit;
    }

    $sql = "
        SELECT 'Quotation' AS type, q.quotation_no AS ref, q.quotation_date AS tx_date, q.total_amount AS amount, q.status AS status, q.created_at
          FROM sales_quotations q WHERE q.customer_id = :c1
        UNION ALL
        SELECT 'Purchase Order', p.po_no, p.order_date, p.total_amount, p.status, p.created_at
          FROM purchase_orders p WHERE p.customer_id = :c2
        UNION ALL
        SELECT 'Sales Order', o.order_no, o.order_date, o.total_amount, o.status, o.created_at
          FROM sales_orders o WHERE o.customer_id = :c3
        UNION ALL
        SELECT 'Invoice', i.invoice_no, i.invoice_date, i.total_amount, i.status, i.created_at
          FROM sales_invoices i JOIN sales_orders o ON o.so_id = i.order_id WHERE o.customer_id = :c4
        UNION ALL
        SELECT CONCAT('Payment (', col.method, ')'), col.collection_no, col.collection_date, col.amount, 'Paid', col.created_at
          FROM collections col
          JOIN sales_invoices i ON i.inv_id = col.invoice_id
          JOIN sales_orders o ON o.so_id = i.order_id WHERE o.customer_id = :c5
        UNION ALL
        SELECT 'Return', r.return_no, r.return_date, r.total_amount, r.status, r.created_at
          FROM sales_returns r JOIN sales_orders o ON o.so_id = r.order_id WHERE o.customer_id = :c6
        ORDER BY tx_date DESC, created_at DESC
    ";
    $st = $pdo->prepare($sql);
    $st->execute([':c1' => $cid, ':c2' => $cid, ':c3' => $cid, ':c4' => $cid, ':c5' => $cid, ':c6' => $cid]);

    $rows = [];
    foreach ($st->fetchAll() as $r) {
        $rows[] = [
            'type'   => $r['type'],
            'ref'    => $r['ref'],
            'date'   => niceDate($r['tx_date']),
            'amount' => peso((float) $r['amount']),
            'status' => $r['status'],
            'badge'  => badgeClass((string) $r['status']),
        ];
    }
    echo json_encode(['ok' => true, 'customer' => $cust['customer_name'], 'code' => $cust['customer_code'], 'rows' => $rows]);
    exit;
}

/* ------------------------------------------------------------------
 * POST actions: add / edit / toggle_status
 * ------------------------------------------------------------------ */
$error = '';
$notice = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? 'add';

    if ($action === 'add') {
        $name = trim($_POST['customer_name'] ?? '');
        $phone = trim($_POST['phone'] ?? '');
        $email = trim($_POST['email'] ?? '');
        $address = trim($_POST['address'] ?? '');
        $status = in_array($_POST['status'] ?? '', ['Active', 'Inactive'], true) ? $_POST['status'] : 'Active';

        if ($name === '') {
            $error = 'Customer name is required.';
        } else {
            $code = nextDocNo($pdo, 'customers', 'CUS-', 0, 3);
            $stmt = $pdo->prepare('INSERT INTO customers (customer_code, customer_name, phone, email, address, status) VALUES (?,?,?,?,?,?)');
            $stmt->execute([$code, $name, $phone, $email, $address, $status]);
            logActivity($pdo, 'Create', 'Customer', 'Added customer ' . $code, (int) $pdo->lastInsertId());
            header('Location: admin_customers.php?added=1');
            exit;
        }
    } elseif ($action === 'edit') {
        $id = (int) ($_POST['id'] ?? 0);
        $name = trim($_POST['customer_name'] ?? '');
        $phone = trim($_POST['phone'] ?? '');
        $email = trim($_POST['email'] ?? '');
        $address = trim($_POST['address'] ?? '');

        if ($name === '') {
            $error = 'Customer name is required.';
        } elseif ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $error = 'Please enter a valid email address.';
        } else {
            $stmt = $pdo->prepare('UPDATE customers SET customer_name = ?, phone = ?, email = ?, address = ? WHERE cus_id = ?');
            $stmt->execute([$name, $phone, $email, $address, $id]);
            logActivity($pdo, 'Update', 'Customer', 'Edited customer ' . $name, $id);
            header('Location: admin_customers.php?updated=1');
            exit;
        }
    } elseif ($action === 'toggle_status') {
        $id = (int) ($_POST['id'] ?? 0);
        $stmt = $pdo->prepare("UPDATE customers SET status = IF(status = 'Active', 'Inactive', 'Active') WHERE cus_id = ?");
        $stmt->execute([$id]);
        if ($stmt->rowCount()) {
            $now = $pdo->prepare('SELECT customer_code, status FROM customers WHERE cus_id = ?');
            $now->execute([$id]);
            $row = $now->fetch();
            logActivity($pdo, $row['status'] === 'Active' ? 'Activate' : 'Deactivate', 'Customer', ($row['status'] === 'Active' ? 'Activated ' : 'Deactivated ') . $row['customer_code'], $id);
            header('Location: admin_customers.php?status=' . ($row['status'] === 'Active' ? 'activated' : 'deactivated'));
            exit;
        }
        $error = 'Customer not found.';
    }
}

$pageTitle = 'Customer Management';
include __DIR__ . '/includes/header.php';

// Balance is computed live from invoices (same source as balance.php),
// so it never drifts out of sync with billing.
$customers = $pdo->query("
    SELECT c.*,
           COALESCE(b.total_billed, 0) AS total_billed,
           COALESCE(b.total_paid, 0)   AS total_paid,
           COALESCE(b.outstanding, 0)  AS outstanding
      FROM customers c
      LEFT JOIN (
            SELECT o.customer_id,
                   SUM(i.total_amount) AS total_billed,
                   SUM(i.amount_paid)  AS total_paid,
                   SUM(GREATEST(i.total_amount - i.amount_paid,0)) AS outstanding
              FROM sales_orders o
              JOIN sales_invoices i ON i.order_id = o.so_id
             GROUP BY o.customer_id
      ) b ON b.customer_id = c.cus_id
     ORDER BY c.cus_id DESC
")->fetchAll();

$statusMsg = ['activated' => 'Customer activated.', 'deactivated' => 'Customer deactivated. They will no longer appear when creating new quotations.'];
?>

<div class="page-toolbar"><div><p class="muted" style="color: white;">Customer master records</p></div><button class="primary-btn" data-open-modal="addCustomerModal">+ Add Customer</button></div>

<?php if (!empty($_GET['added'])): ?><div class="alert success">Customer added successfully.</div><?php endif; ?>
<?php if (!empty($_GET['updated'])): ?><div class="alert success">Customer updated successfully.</div><?php endif; ?>
<?php if (!empty($_GET['status']) && isset($statusMsg[$_GET['status']])): ?><div class="alert success"><?= htmlspecialchars($statusMsg[$_GET['status']]) ?></div><?php endif; ?>
<?php if ($error): ?><div class="alert error"><?= htmlspecialchars($error) ?></div><?php endif; ?>

<div class="panel">
    <div class="search-row"><input class="search-input" data-table-search="customerTable" placeholder="Search customers..."><span class="result-count"><?= count($customers) ?> records</span></div>
    <div class="table-wrap"><table id="customerTable"><thead><tr><th>Code</th><th>Customer Name</th><th>Phone</th><th>Email</th><th>Status</th><th>Actions</th></tr></thead><tbody>
    <?php if (!$customers): ?><tr class="empty-row"><td colspan="6">No customers yet. Add your first customer above.</td></tr><?php endif; ?>
    <?php foreach ($customers as $c):
        $isActive = $c['status'] === 'Active';
    ?>
        <tr>
            <td><b><?= htmlspecialchars($c['customer_code']) ?></b></td>
            <td><?= htmlspecialchars($c['customer_name'] ?? '') ?></td>
            <td><?= htmlspecialchars($c['phone'] ?? '') ?></td>
            <td><?= htmlspecialchars($c['email'] ?? '') ?></td>
            <td><span class="badge <?= badgeClass($c['status']) ?>"><?= htmlspecialchars($c['status']) ?></span></td>
            <td data-no-search>
                <div class="inline-actions">
                    <button type="button" class="table-action js-history" data-open-modal="historyModal" data-id="<?= (int) $c['cus_id'] ?>">History</button>
                    <button type="button" class="table-action js-balance" data-open-modal="balanceModal"
                        data-name="<?= htmlspecialchars($c['customer_name'] ?? '', ENT_QUOTES) ?>"
                        data-code="<?= htmlspecialchars($c['customer_code'], ENT_QUOTES) ?>"
                        data-billed="<?= htmlspecialchars(peso((float) $c['total_billed']), ENT_QUOTES) ?>"
                        data-paid="<?= htmlspecialchars(peso((float) $c['total_paid']), ENT_QUOTES) ?>"
                        data-outstanding="<?= htmlspecialchars(peso((float) $c['outstanding']), ENT_QUOTES) ?>"
                        data-outstanding-raw="<?= (float) $c['outstanding'] ?>">Balance</button>
                    <button type="button" class="table-action js-edit" data-open-modal="editCustomerModal"
                        data-id="<?= (int) $c['cus_id'] ?>"
                        data-name="<?= htmlspecialchars($c['customer_name'] ?? '', ENT_QUOTES) ?>"
                        data-phone="<?= htmlspecialchars($c['phone'] ?? '', ENT_QUOTES) ?>"
                        data-email="<?= htmlspecialchars($c['email'] ?? '', ENT_QUOTES) ?>"
                        data-address="<?= htmlspecialchars($c['address'] ?? '', ENT_QUOTES) ?>">Edit</button>
                    <form method="POST" onsubmit="return confirm('<?= $isActive ? 'Deactivate' : 'Activate' ?> this customer?');">
                        <input type="hidden" name="action" value="toggle_status">
                        <input type="hidden" name="id" value="<?= (int) $c['cus_id'] ?>">
                        <button type="submit" class="table-action <?= $isActive ? 'reject' : 'approve' ?>"><?= $isActive ? 'Deactivate' : 'Activate' ?></button>
                    </form>
                </div>
            </td>
        </tr>
    <?php endforeach; ?>
    </tbody></table></div>
</div>

<!-- Add Customer -->
<div class="modal-backdrop" id="addCustomerModal" aria-hidden="true">
    <div class="profile-modal entry-modal" role="dialog" aria-modal="true" aria-labelledby="addCustomerTitle">
        <button class="modal-close" type="button" aria-label="Close" data-close-modal>×</button>
        <p class="eyebrow">CUSTOMER MANAGEMENT</p>
        <h2 id="addCustomerTitle">Add Customer</h2>
        <form method="POST" class="entry-form">
            <input type="hidden" name="action" value="add">
            <label>Customer Name
                <input type="text" name="customer_name">
            </label>
            <label>Phone
                <input type="text" name="phone">
            </label>
            <label>Email
                <input type="email" name="email">
            </label>
            <label>Address
                <input type="text" name="address">
            </label>
            <label>Status
                <select name="status">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                </select>
            </label>
            <div class="modal-actions">
                <button type="button" class="secondary-btn" data-close-modal>Cancel</button>
                <button type="submit" class="primary-btn">Save Customer</button>
            </div>
        </form>
    </div>
</div>

<!-- Edit Customer -->
<div class="modal-backdrop" id="editCustomerModal" aria-hidden="true">
    <div class="profile-modal entry-modal" role="dialog" aria-modal="true" aria-labelledby="editCustomerTitle">
        <button class="modal-close" type="button" aria-label="Close" data-close-modal>×</button>
        <p class="eyebrow">CUSTOMER MANAGEMENT</p>
        <h2 id="editCustomerTitle">Edit Customer</h2>
        <form method="POST" class="entry-form">
            <input type="hidden" name="action" value="edit">
            <input type="hidden" name="id" id="editId">
            <label>Customer Name
                <input type="text" name="customer_name" id="editName" required>
            </label>
            <label>Phone
                <input type="text" name="phone" id="editPhone">
            </label>
            <label>Email
                <input type="email" name="email" id="editEmail">
            </label>
            <label>Address
                <input type="text" name="address" id="editAddress">
            </label>
            <div class="modal-actions">
                <button type="button" class="secondary-btn" data-close-modal>Cancel</button>
                <button type="submit" class="primary-btn">Save Changes</button>
            </div>
        </form>
    </div>
</div>

<!-- Customer Balance -->
<div class="modal-backdrop" id="balanceModal" aria-hidden="true">
    <div class="profile-modal entry-modal" role="dialog" aria-modal="true" aria-labelledby="balanceTitle">
        <button class="modal-close" type="button" aria-label="Close" data-close-modal>×</button>
        <p class="eyebrow" id="balanceCode">CUSTOMER BALANCE</p>
        <h2 id="balanceTitle">Customer Balance</h2>
        <table style="width:100%;margin-top:10px">
            <tbody>
                <tr><td>Total Billed</td><td style="text-align:right"><b id="balBilled"></b></td></tr>
                <tr><td>Total Paid</td><td style="text-align:right"><b id="balPaid"></b></td></tr>
                <tr><td>Outstanding Balance</td><td style="text-align:right"><span class="badge" id="balOutstanding"></span></td></tr>
            </tbody>
        </table>
        <div class="modal-actions">
            <button type="button" class="secondary-btn" data-close-modal>Close</button>
        </div>
    </div>
</div>

<!-- Transaction History -->
<div class="modal-backdrop" id="historyModal" aria-hidden="true">
    <div class="profile-modal entry-modal" style="width:min(760px,100%)" role="dialog" aria-modal="true" aria-labelledby="historyTitle">
        <button class="modal-close" type="button" aria-label="Close" data-close-modal>×</button>
        <p class="eyebrow" id="historyCode">TRANSACTION HISTORY</p>
        <h2 id="historyTitle">Transaction History</h2>
        <div class="table-wrap" style="max-height:55vh;overflow:auto">
            <table>
                <thead><tr><th>Date</th><th>Type</th><th>Reference</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody id="historyBody"></tbody>
            </table>
        </div>
        <div class="modal-actions">
            <button type="button" class="secondary-btn" data-close-modal>Close</button>
        </div>
    </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', () => {
    const $ = (id) => document.getElementById(id);

    // Edit: prefill the form from the row's data attributes
    document.querySelectorAll('.js-edit').forEach(btn => {
        btn.addEventListener('click', () => {
            $('editId').value = btn.dataset.id;
            $('editName').value = btn.dataset.name;
            $('editPhone').value = btn.dataset.phone;
            $('editEmail').value = btn.dataset.email;
            $('editAddress').value = btn.dataset.address;
        });
    });

    // Balance: values are already computed server-side
    document.querySelectorAll('.js-balance').forEach(btn => {
        btn.addEventListener('click', () => {
            const d = btn.dataset;
            $('balanceCode').textContent = d.code;
            $('balanceTitle').textContent = d.name;
            $('balBilled').textContent = d.billed;
            $('balPaid').textContent = d.paid;
            const out = $('balOutstanding');
            out.textContent = d.outstanding;
            out.className = 'badge ' + (parseFloat(d.outstandingRaw) > 0 ? 'warning' : 'success');
        });
    });

    // History: fetched on demand so the page stays light
    const body = $('historyBody');
    const message = (text) => {
        body.replaceChildren();
        const tr = document.createElement('tr');
        tr.className = 'empty-row';
        const td = document.createElement('td');
        td.colSpan = 5;
        td.textContent = text;
        tr.appendChild(td);
        body.appendChild(tr);
    };

    document.querySelectorAll('.js-history').forEach(btn => {
        btn.addEventListener('click', async () => {
            $('historyTitle').textContent = 'Transaction History';
            $('historyCode').textContent = 'LOADING…';
            message('Loading transactions…');
            try {
                const res = await fetch('admin_customers.php?ajax=transactions&id=' + encodeURIComponent(btn.dataset.id));
                const data = await res.json();
                if (!res.ok || !data.ok) { message(data.error || 'Could not load transactions.'); return; }

                $('historyTitle').textContent = data.customer;
                $('historyCode').textContent = data.code + ' · TRANSACTION HISTORY';
                if (!data.rows.length) { message('No transactions for this customer yet.'); return; }

                body.replaceChildren();
                data.rows.forEach(r => {
                    const tr = document.createElement('tr');
                    [r.date, r.type, r.ref, r.amount].forEach((val, i) => {
                        const td = document.createElement('td');
                        if (i === 2) { const b = document.createElement('b'); b.textContent = val; td.appendChild(b); }
                        else td.textContent = val;
                        tr.appendChild(td);
                    });
                    const st = document.createElement('td');
                    const badge = document.createElement('span');
                    badge.className = 'badge ' + r.badge;
                    badge.textContent = r.status;
                    st.appendChild(badge);
                    tr.appendChild(st);
                    body.appendChild(tr);
                });
            } catch (e) {
                message('Network error while loading transactions.');
            }
        });
    });
});
</script>

<?php include __DIR__ . '/includes/footer.php'; ?>
