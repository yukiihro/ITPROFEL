<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';
requireSalesWorkspace();
$pdo = getDB();

$pageTitle = 'Sales Reports';
include __DIR__ . '/includes/header.php';

$selectedYear = (int)($_GET['year'] ?? date('Y'));
$yearRows = $pdo->query("SELECT DISTINCT YEAR(invoice_date) AS y FROM sales_invoices ORDER BY y DESC")->fetchAll(PDO::FETCH_COLUMN);
if (!in_array($selectedYear, array_map('intval', $yearRows), true)) $selectedYear = (int)date('Y');
$yearOptions = array_values(array_unique(array_merge([$selectedYear, (int)date('Y')], array_map('intval', $yearRows))));
rsort($yearOptions);

$totalSalesStmt = $pdo->prepare('SELECT COALESCE(SUM(total_amount),0) FROM sales_invoices WHERE YEAR(invoice_date)=?');
$totalSalesStmt->execute([$selectedYear]);
$totalSales = (float)$totalSalesStmt->fetchColumn();

$prevYear = $selectedYear - 1;
$prevStmt = $pdo->prepare('SELECT COALESCE(SUM(total_amount),0) FROM sales_invoices WHERE YEAR(invoice_date)=?');
$prevStmt->execute([$prevYear]);
$previousYearSales = (float)$prevStmt->fetchColumn();
$salesChange = $previousYearSales > 0 ? round((($totalSales - $previousYearSales) / $previousYearSales) * 100) : ($totalSales > 0 ? 100 : 0);

$quotationCount = (int)$pdo->query('SELECT COUNT(*) FROM sales_quotations')->fetchColumn();
$convertedCount = (int)$pdo->query('SELECT COUNT(*) FROM sales_orders WHERE quotation_id IS NOT NULL')->fetchColumn();
$conversionRate = $quotationCount > 0 ? round(($convertedCount / $quotationCount) * 100) : 0;
$avgCollectionDays = $pdo->query('SELECT AVG(DATEDIFF(collection_date, invoice_date)) FROM collections JOIN sales_invoices ON sales_invoices.inv_id=collections.invoice_id')->fetchColumn();
$avgCollectionDays = $avgCollectionDays !== null ? round((float)$avgCollectionDays) : 0;

$monthlyStmt = $pdo->prepare("
    SELECT MONTH(invoice_date) AS month_no, DATE_FORMAT(invoice_date,'%b') AS label, COALESCE(SUM(total_amount),0) AS total
    FROM sales_invoices WHERE YEAR(invoice_date)=?
    GROUP BY MONTH(invoice_date), DATE_FORMAT(invoice_date,'%b')
    ORDER BY month_no
");
$monthlyStmt->execute([$selectedYear]);
$monthly = $monthlyStmt->fetchAll();
$maxMonthly = max(array_map(fn($m) => (float)$m['total'], $monthly) ?: [0]) ?: 1;

$customerPerformance = $pdo->query("
    SELECT c.cus_id, c.customer_name, COUNT(DISTINCT o.so_id) orders_count,
           COALESCE(SUM(i.total_amount),0) revenue,
           COALESCE(SUM(GREATEST(i.total_amount-i.amount_paid,0)),0) outstanding
    FROM customers c
    JOIN sales_orders o ON o.customer_id=c.cus_id
    LEFT JOIN sales_invoices i ON i.order_id=o.so_id
    GROUP BY c.cus_id,c.customer_name
    ORDER BY revenue DESC LIMIT 5
")->fetchAll();

$selectedCustomerId = (int)($_GET['customer_id'] ?? 0);
$selectedCustomer = null;
$flowRows = [];
if ($selectedCustomerId) {
    $stmt = $pdo->prepare('SELECT cus_id, customer_name, customer_code FROM customers WHERE cus_id=?');
    $stmt->execute([$selectedCustomerId]);
    $selectedCustomer = $stmt->fetch();
    if ($selectedCustomer) {
        $stmt = $pdo->prepare("
            SELECT c.customer_name customer_name, q.quotation_no,
                   CASE
                       WHEN q.customer_status = 'Pending'
                        AND q.valid_until IS NOT NULL
                        AND q.valid_until < CURDATE()
                       THEN 'Expired'
                       ELSE q.status
                   END quotation_status,
                   po.po_no, po.status po_status,
                   o.order_no, o.status order_status,
                   d.delivery_no, d.status delivery_status,
                   i.invoice_no, i.status invoice_status,
                   COALESCE(i.total_amount,0) invoice_amount,
                   GROUP_CONCAT(DISTINCT col.collection_no ORDER BY col.col_id SEPARATOR ', ') collection_nos
            FROM customers c
            LEFT JOIN sales_quotations q ON q.customer_id=c.cus_id
            LEFT JOIN purchase_orders po ON po.quotation_id=q.sq_id
            LEFT JOIN sales_orders o ON o.customer_id=c.cus_id AND (o.quotation_id=q.sq_id OR q.sq_id IS NULL)
            LEFT JOIN deliveries d ON d.order_id=o.so_id
            LEFT JOIN sales_invoices i ON i.order_id=o.so_id
            LEFT JOIN collections col ON col.invoice_id=i.inv_id
            WHERE c.cus_id=?
            GROUP BY c.cus_id,q.sq_id,po.po_id,o.so_id,d.del_id,i.inv_id
            ORDER BY COALESCE(q.sq_id,o.so_id) DESC
        ");
        $stmt->execute([$selectedCustomerId]);
        $flowRows = $stmt->fetchAll();
    }
}
?>
<div class="page-toolbar">
    <p class="muted" style="color:white;">Sales performance and the complete customer transaction flow.</p>
    <a class="primary-btn" href="export_sales_report.php?year=<?= $selectedYear ?>" target="_blank">Export Formal Summary</a>
</div>

<div class="report-grid">
    <div class="report-card">
        <p class="eyebrow" style="color:black;">TOTAL SALES — <?= $selectedYear ?></p>
        <h2><?= peso($totalSales) ?></h2>
        <p><?= $salesChange >= 0 ? '+' : '' ?><?= $salesChange ?>% compared with <?= $prevYear ?>.</p>
    </div>
    <div class="report-card">
        <p class="eyebrow" style="color:black;">QUOTATION → ORDER</p>
        <h2><?= $conversionRate ?>%</h2>
        <p><?= $convertedCount ?> of <?= $quotationCount ?> quotations have linked sales orders.</p>
    </div>
    <div class="report-card">
        <p class="eyebrow" style="color:black;">AVERAGE COLLECTION</p>
        <h2><?= $avgCollectionDays ?> days</h2>
        <p>Average time from invoice date to collection.</p>
    </div>
</div>

<div class="report-card chart-card">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
        <div>
            <p class="eyebrow" style="color:black;">MONTHLY SALES</p><small>Sales by invoice month</small>
        </div>
        <form method="GET"><select customer_name="year" onchange="this.form.submit()">
                <?php foreach ($yearOptions as $y): ?><option value="<?= $y ?>" <?= $y === $selectedYear ? 'selected' : '' ?>><?= $y ?></option><?php endforeach; ?>
            </select></form>
    </div>
    <div class="bars">
        <?php for ($m = 1; $m <= 12; $m++):
            $row = null;
            foreach ($monthly as $item) {
                if ((int)$item['month_no'] === $m) {
                    $row = $item;
                    break;
                }
            }
            $value = (float)($row['total'] ?? 0);
            $height = max(4, round(($value / $maxMonthly) * 100));
        ?>
            <span title="<?= htmlspecialchars(date('F', mktime(0, 0, 0, $m, 1))) ?>: <?= peso($value) ?>" style="height:<?= $height ?>%"></span>
        <?php endfor; ?>
    </div>
    <div class="bar-labels"><?php for ($m = 1; $m <= 12; $m++): ?><span><?= date('M', mktime(0, 0, 0, $m, 1)) ?></span><?php endfor; ?></div>
</div>

<div class="panel">
    <div class="panel-head">
        <div>
            <p class="eyebrow" style="color:black;">TOP CUSTOMER</p>
            <h2>Customers by revenue</h2>
        </div>
    </div>
    <div class="table-wrap">
        <table>
            <thead>
                <tr>
                    <th>Customer</th>
                    <th>Orders</th>
                    <th>Total Revenue</th>
                    <th>Outstanding</th>
                    <th>Full Flow</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($customerPerformance as $c): ?>
                    <tr>
                        <td><b><?= htmlspecialchars($c['customer_name']) ?></b></td>
                        <td><?= (int)$c['orders_count'] ?></td>
                        <td><?= peso((float)$c['revenue']) ?></td>
                        <td><?= peso((float)$c['outstanding']) ?></td>
                        <td><a class="table-action" href="reports.php?year=<?= $selectedYear ?>&customer_id=<?= (int)$c['cus_id'] ?>">View Flow</a></td>
                    </tr>
                <?php endforeach; ?>
                <?php if (!$customerPerformance): ?><tr>
                        <td colspan="5">No sales activity yet.</td>
                    </tr><?php endif; ?>
            </tbody>
        </table>
    </div>
</div><br>

<?php if ($selectedCustomer): ?>
    <div class="modal-backdrop open customer-flow-modal" id="customerFlowModal">
        <section class="panel customer-flow-dialog" role="dialog" aria-modal="true" aria-labelledby="customerFlowTitle">
            <div class="panel-head">
                <div>
                    <p class="eyebrow" style="color:black;">CUSTOMER FULL FLOW</p>
                    <h2 id="customerFlowTitle">Customer Name: <?= htmlspecialchars($selectedCustomer['customer_name']) ?></h2>
                </div>
                <button class="modal-close" type="button" aria-label="Close customer flow" data-close-flow>×</button>
            </div>
            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Quotation</th>
                            <th>PO</th>
                            <th>Sales Order</th>
                            <th>Delivery</th>
                            <th>Invoice</th>
                            <th>Collection</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($flowRows as $r): ?>
                            <tr>
                                <td><?= htmlspecialchars($r['quotation_no'] ?? '—') ?><br><span class="badge <?= badgeClass($r['quotation_status'] ?? '') ?>"><?= htmlspecialchars($r['quotation_status'] ?? '—') ?></span></td>
                                <td><?= htmlspecialchars($r['po_no'] ?? '—') ?><br><span class="badge <?= badgeClass($r['po_status'] ?? '') ?>"><?= htmlspecialchars($r['po_status'] ?? '—') ?></span></td>
                                <td><?= htmlspecialchars($r['order_no'] ?? '—') ?><br><span class="badge <?= badgeClass($r['order_status'] ?? '') ?>"><?= htmlspecialchars($r['order_status'] ?? '—') ?></span></td>
                                <td><?= htmlspecialchars($r['delivery_no'] ?? '—') ?><br><span class="badge <?= badgeClass($r['delivery_status'] ?? '') ?>"><?= htmlspecialchars($r['delivery_status'] ?? '—') ?></span></td>
                                <td><?= htmlspecialchars($r['invoice_no'] ?? '—') ?><br><span class="badge <?= badgeClass($r['invoice_status'] ?? '') ?>"><?= htmlspecialchars($r['invoice_status'] ?? '—') ?></span></td>
                                <td><?= htmlspecialchars($r['collection_nos'] ?? '—') ?></td>
                            </tr>
                        <?php endforeach; ?>
                        <?php if (!$flowRows): ?><tr>
                                <td colspan="6">No transaction flow found for this customer.</td>
                            </tr><?php endif; ?>
                    </tbody>
                </table>
            </div>
        </section>
    </div>
    <script>
        (function () {
            var modal = document.getElementById('customerFlowModal');
            if (!modal) return;

            document.body.classList.add('modal-open');

            function closeFlow() {
                modal.classList.remove('open');
                document.body.classList.remove('modal-open');
                var url = new URL(window.location.href);
                url.searchParams.delete('customer_id');
                window.history.replaceState({}, '', url);
            }

            modal.querySelector('[data-close-flow]').addEventListener('click', closeFlow);
            modal.addEventListener('click', function (event) {
                if (event.target === modal) closeFlow();
            });
            document.addEventListener('keydown', function (event) {
                if (event.key === 'Escape' && modal.classList.contains('open')) closeFlow();
            });
        })();
    </script>
<?php endif; ?>

<?php include __DIR__ . '/includes/footer.php'; ?>
