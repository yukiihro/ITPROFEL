<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';
requireSalesWorkspace();

$pdo = getDB();
$stmt = $pdo->query(
    "SELECT i.inv_id, i.invoice_no, i.invoice_date, i.total_amount, i.status,
            o.order_no, c.customer_name
     FROM sales_invoices i
     JOIN sales_orders o ON o.so_id = i.order_id
     JOIN customers c ON c.cus_id = o.customer_id
     ORDER BY i.inv_id DESC"
);
$invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);
$pageTitle = 'Send Invoice to Finance';
include __DIR__ . '/includes/header.php';
?>

<div class="page-toolbar">
    <p class="muted" style="color:white;">Send a Sales invoice to Finance Accounts Receivable. Sending again updates the existing Finance record.</p>
</div>
<div id="financeSyncNotice" class="alert" role="status" hidden></div>
<div class="panel" style="margin-top:18px">
    <div class="table-wrap">
        <table class="data-table">
            <thead>
                <tr>
                    <th>Invoice No.</th>
                    <th>Customer</th>
                    <th>Sales Order</th>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                <?php if (!$invoices): ?>
                    <tr><td colspan="7" class="empty-row">No Sales invoices are available to send.</td></tr>
                <?php endif; ?>
                <?php foreach ($invoices as $invoice): ?>
                    <?php $isReturned = strtolower(trim((string)$invoice['status'])) === 'returned'; ?>
                    <tr>
                        <td><strong><?= htmlspecialchars($invoice['invoice_no']) ?></strong></td>
                        <td><?= htmlspecialchars($invoice['customer_name']) ?></td>
                        <td><?= htmlspecialchars($invoice['order_no']) ?></td>
                        <td><?= niceDate($invoice['invoice_date']) ?></td>
                        <td><?= peso((float)$invoice['total_amount']) ?></td>
                        <td><span class="badge <?= badgeClass($invoice['status']) ?>"><?= htmlspecialchars($invoice['status']) ?></span></td>
                        <td>
                            <button
                                type="button"
                                class="secondary-btn"
                                data-send-invoice="<?= (int)$invoice['inv_id'] ?>"
                                data-invoice-no="<?= htmlspecialchars($invoice['invoice_no'], ENT_QUOTES, 'UTF-8') ?>"
                                data-returned="<?= $isReturned ? '1' : '0' ?>"
                                disabled>
                                <?= $isReturned ? 'Returned - Cannot Send' : 'Checking...' ?>
                            </button>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>

<script>
    const financeSyncNotice = document.getElementById('financeSyncNotice');
    const financeSyncCsrf = <?= json_encode($_SESSION['csrf_token'] ?? '') ?>;
    const financeSyncButtons = Array.from(document.querySelectorAll('[data-send-invoice]'));

    async function loadFinanceSendStatuses() {
        try {
            const response = await fetch('../FINANCE/api.php?action=sales_invoice_status', {
                credentials: 'same-origin',
                cache: 'no-store',
                headers: { 'Accept': 'application/json' }
            });
            const result = await response.json();
            if (!response.ok || !result.ok || !Array.isArray(result.sentSalesInvoiceIds)) {
                throw new Error(result.message || 'Finance send status could not be loaded.');
            }

            const sentInvoiceIds = new Set(result.sentSalesInvoiceIds.map(Number));
            financeSyncButtons.forEach((button) => {
                if (button.dataset.returned === '1') {
                    button.textContent = 'Returned - Cannot Send';
                } else if (sentInvoiceIds.has(Number(button.dataset.sendInvoice))) {
                    button.textContent = 'Already Sent';
                } else {
                    button.textContent = 'Send to Finance';
                    button.disabled = false;
                }
            });
        } catch (error) {
            financeSyncButtons.forEach((button) => {
                if (button.dataset.returned !== '1') {
                    button.textContent = 'Status Unavailable';
                }
            });
            financeSyncNotice.className = 'alert error';
            financeSyncNotice.textContent = error.message || 'Could not check Finance send status. Reload the page and try again.';
            financeSyncNotice.hidden = false;
        }
    }

    void loadFinanceSendStatuses();

    financeSyncButtons.forEach((button) => {
        button.addEventListener('click', async () => {
            if (button.disabled || button.dataset.returned === '1') return;

            const invoiceId = Number(button.dataset.sendInvoice);
            const invoiceNo = button.dataset.invoiceNo || 'invoice';
            button.disabled = true;
            financeSyncNotice.hidden = true;

            try {
                const response = await fetch('../FINANCE/api.php?action=sync_sales_invoice', {
                    method: 'POST',
                    credentials: 'same-origin',
                    cache: 'no-store',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': financeSyncCsrf
                    },
                    body: JSON.stringify({ salesInvoiceId: invoiceId })
                });
                const result = await response.json();
                if (!response.ok || !result.ok) {
                    const error = new Error(result.message || 'The invoice could not be sent to Finance.');
                    error.status = response.status;
                    throw error;
                }

                button.textContent = 'Already Sent';
                financeSyncNotice.className = 'alert success';
                financeSyncNotice.textContent = `${invoiceNo} was sent to Finance Accounts Receivable.`;
                financeSyncNotice.hidden = false;
            } catch (error) {
                const isReturned = error.status === 422 && /returned/i.test(error.message);
                button.disabled = isReturned;
                button.textContent = isReturned ? 'Returned - Cannot Send' : 'Send to Finance';
                financeSyncNotice.className = 'alert error';
                financeSyncNotice.textContent = error.message || 'The invoice could not be sent to Finance. Please try again.';
                financeSyncNotice.hidden = false;
            }
        });
    });
</script>
<?php include __DIR__ . '/includes/footer.php'; ?>
