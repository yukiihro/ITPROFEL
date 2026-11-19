<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';
requireSalesWorkspace();
$pdo = getDB();
$error = '';
$notice = '';
$st = $pdo->query("SELECT i.*,o.order_no,o.product_code,o.quantity,o.total_amount AS order_total,c.customer_name,c.email,c.address,COALESCE((SELECT SUM(r.total_amount) FROM sales_returns r WHERE r.order_id=o.so_id AND r.admin_status='Approved'),0) AS approved_return_total FROM sales_invoices i JOIN sales_orders o ON o.so_id=i.order_id JOIN customers c ON c.cus_id=o.customer_id ORDER BY i.inv_id DESC");
$rows = $st->fetchAll();
$pageTitle = 'Sales Invoice';
include __DIR__ . '/includes/header.php';
?>

<div class="page-toolbar">
  <p class="muted" style="color:white;">Invoice list — open <b>View Invoice</b> to see the complete invoice.</p>
</div>
<?php if ($notice): ?><div class="alert success"><?= htmlspecialchars($notice) ?></div><?php endif; ?>
<?php if ($error): ?><div class="alert error"><?= htmlspecialchars($error) ?></div><?php endif; ?>
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
        <?php if (!$rows): ?><tr>
            <td colspan="7" class="empty-row">No Sales Invoices yet.</td>
          </tr><?php endif; ?>
        <?php foreach ($rows as $r): ?>
          <tr>
            <td><strong><?= htmlspecialchars($r['invoice_no']) ?></strong></td>
            <td><?= htmlspecialchars($r['customer_name']) ?></td>
            <td><?= htmlspecialchars($r['order_no']) ?></td>
            <td><?= niceDate($r['invoice_date']) ?></td>
            <td><?= peso((float)$r['total_amount']) ?></td>
            <td><span class="badge <?= badgeClass($r['status']) ?>"><?= htmlspecialchars($r['status']) ?></span></td>
            <td>
              <button type="button" class="secondary-btn" data-open-invoice="<?= (int)$r['inv_id'] ?>">View Invoice</button>
              <a class="table-action" target="_blank" rel="noopener" href="document_export.php?type=invoice&amp;id=<?= (int)$r['inv_id'] ?>">View / Print PDF</a>
            </td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</div>

<?php foreach ($rows as $r): ?>
  <div class="modal-backdrop" id="viewInvoice<?= (int)$r['inv_id'] ?>" aria-hidden="true">
    <div class="invoice-paper" style="max-width:900px;max-height:90vh;overflow:auto;margin:auto;position:relative">
      <button class="modal-close" type="button" data-close-modal style="position:absolute;right:14px;top:14px">×</button>
      <div class="invoice-top">
        <div>
          <p class="eyebrow dark">TEAM SALES</p>
          <h2>SALES INVOICE</h2>
        </div>
        <div class="invoice-number"><span>Invoice No.</span><b><?= htmlspecialchars($r['invoice_no']) ?></b><small><?= niceDate($r['invoice_date']) ?></small></div>
      </div>
      <div class="invoice-customer">
        <div><span>Bill To</span><b><?= htmlspecialchars($r['customer_name']) ?></b><small><?= htmlspecialchars($r['address'] ?? '') ?></small><small><?= htmlspecialchars($r['email'] ?? '') ?></small></div>
        <div><span>Sales Order</span><b><?= htmlspecialchars($r['order_no']) ?></b></div>
      </div>
      <div class="invoice-line">
        <div><span>Product</span><b><?= htmlspecialchars($r['product_code']) ?></b></div>
        <div><span>Quantity</span><b><?= (int)$r['quantity'] ?></b></div>
        <div><span>Amount</span><b><?= peso((float)$r['order_total']) ?></b></div>
      </div>
      <?php if ((float)$r['approved_return_total'] > 0): ?><div class="invoice-line"><div><span>Approved returns</span><b>-<?= peso((float)$r['approved_return_total']) ?></b></div></div><?php endif; ?>
      <div class="invoice-total"><span>Total Amount</span><strong><?= peso((float)$r['total_amount']) ?></strong></div>
      <div class="invoice-status"><span class="badge <?= badgeClass($r['status']) ?>"><?= htmlspecialchars($r['status']) ?></span><a class="table-action" href="customer_account.php?section=billing">View Billing & Finance</a></div>
    </div>
  </div>
<?php endforeach; ?>

<script>
  document.querySelectorAll('[data-open-invoice]').forEach(b => b.addEventListener('click', () => {
    const m = document.getElementById('viewInvoice' + b.dataset.openInvoice);
    if (m) {
      m.classList.add('open');
      m.setAttribute('aria-hidden', 'false')
    }
  }));
  document.querySelectorAll('[data-close-modal]').forEach(b => b.addEventListener('click', () => {
    const m = b.closest('.modal-backdrop');
    if (m) {
      m.classList.remove('open');
      m.setAttribute('aria-hidden', 'true')
    }
  }));
  document.querySelectorAll('.modal-backdrop').forEach(m => m.addEventListener('click', e => {
    if (e.target === m) {
      m.classList.remove('open');
      m.setAttribute('aria-hidden', 'true')
    }
  }));
</script>
<?php include __DIR__ . '/includes/footer.php'; ?>
