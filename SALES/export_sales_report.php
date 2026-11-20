<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';
requireSalesWorkspace();
$pdo = getDB();
$year = (int)($_GET['year'] ?? date('Y'));
if ($year < 2000 || $year > 2100) $year = (int)date('Y');
$stmt = $pdo->prepare("SELECT COALESCE(SUM(total_amount),0) FROM sales_invoices WHERE YEAR(invoice_date)=?");
$stmt->execute([$year]);
$total = (float)$stmt->fetchColumn();
$stmt = $pdo->prepare("SELECT COUNT(*) FROM sales_quotations WHERE YEAR(quotation_date)=?");
$stmt->execute([$year]);
$quotes = (int)$stmt->fetchColumn();
$stmt = $pdo->prepare("SELECT COUNT(*) FROM sales_orders WHERE YEAR(order_date)=? AND quotation_id IS NOT NULL");
$stmt->execute([$year]);
$orders = (int)$stmt->fetchColumn();
$conversion = $quotes ? round($orders / $quotes * 100) : 0;
$monthly = $pdo->prepare("SELECT MONTH(invoice_date) m, COALESCE(SUM(total_amount),0) total FROM sales_invoices WHERE YEAR(invoice_date)=? GROUP BY MONTH(invoice_date) ORDER BY m");
$monthly->execute([$year]);
$monthlyRows = $monthly->fetchAll();
$customers = $pdo->prepare("SELECT c.customer_name,COUNT(DISTINCT o.so_id) orders_count,COALESCE(SUM(i.total_amount),0) revenue,COALESCE(SUM(GREATEST(i.total_amount-i.amount_paid,0)),0) outstanding FROM customers c JOIN sales_orders o ON o.customer_id=c.cus_id LEFT JOIN sales_invoices i ON i.order_id=o.so_id WHERE YEAR(o.order_date)=? GROUP BY c.cus_id,c.customer_name ORDER BY revenue DESC LIMIT 10");
$customers->execute([$year]);
$customerRows = $customers->fetchAll();
$user = currentUser();
?>
<!DOCTYPE html>
<html>

<head>
    <meta charset="utf-8">
    <title>Sales Report <?= $year ?></title>
    <style>
        @page {
            size: A4;
            margin: 18mm 16mm
        }

        body {
            font-family: Arial, Helvetica, sans-serif;
            color: #202020;
            font-size: 12px;
            line-height: 1.45
        }

        h1 {
            font-size: 22px;
            margin: 0
        }

        h2 {
            font-size: 15px;
            margin: 24px 0 8px;
            border-bottom: 1px solid #222;
            padding-bottom: 5px
        }

        .header {
            display: flex;
            justify-content: space-between;
            border-bottom: 3px solid #111;
            padding-bottom: 12px
        }

        .meta {
            text-align: right;
            font-size: 11px
        }

        .summary {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-top: 18px
        }

        .box {
            border: 1px solid #aaa;
            padding: 10px
        }

        .label {
            font-size: 10px;
            text-transform: uppercase;
            font-weight: bold
        }

        .value {
            font-size: 18px;
            font-weight: bold;
            margin-top: 4px
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px
        }

        th,
        td {
            border: 1px solid #bbb;
            padding: 7px;
            text-align: left
        }

        th {
            background: #eee;
            font-size: 11px
        }

        td.num,
        th.num {
            text-align: right
        }

        .footer {
            margin-top: 28px;
            border-top: 1px solid #aaa;
            padding-top: 8px;
            font-size: 10px;
            color: #555
        }

        .no-print {
            position: fixed;
            right: 18px;
            top: 18px;
            padding: 10px 14px;
            background: #111;
            color: #fff;
            border: 0;
            border-radius: 6px;
            cursor: pointer
        }

        @media print {
            .no-print {
                display: none
            }
        }
    </style>
</head>

<body><button class="no-print" onclick="window.print()">Print / Save as PDF</button>
    <div class="header">
        <div>
            <div style="font-size:11px;font-weight:bold">TEAM SALES</div>
            <h1>Sales Performance Report</h1>
            <div>Reporting Period: January–December <?= $year ?></div>
        </div>
        <div class="meta">Prepared by: <?= htmlspecialchars($user['name'] ?? 'Sales') ?><br>Generated: <?= date('F j, Y g:i A') ?></div>
    </div>
    <div class="summary">
        <div class="box">
            <div class="label">Total Sales</div>
            <div class="value"><?= peso($total) ?></div>
        </div>
        <div class="box">
            <div class="label">Quotation → Order</div>
            <div class="value"><?= $conversion ?>%</div>
        </div>
        <div class="box">
            <div class="label">Sales Orders</div>
            <div class="value"><?= $orders ?></div>
        </div>
    </div>
    <h2>Monthly Sales</h2>
    <table>
        <thead>
            <tr>
                <th>Month</th>
                <th class="num">Sales Amount</th>
            </tr>
        </thead>
        <tbody><?php $map = [];
                foreach ($monthlyRows as $m) {
                    $map[(int)$m['m']] = (float)$m['total'];
                }
                for ($i = 1; $i <= 12; $i++): ?><tr>
                    <td><?= date('F', mktime(0, 0, 0, $i, 1)) ?></td>
                    <td class="num"><?= peso($map[$i] ?? 0) ?></td>
                </tr><?php endfor; ?></tbody>
    </table>
    <h2>Customer Sales Summary</h2>
    <table>
        <thead>
            <tr>
                <th>Customer</th>
                <th class="num">Orders</th>
                <th class="num">Revenue</th>
                <th class="num">Outstanding</th>
            </tr>
        </thead>
        <tbody><?php foreach ($customerRows as $c): ?><tr>
                    <td><?= htmlspecialchars($c['customer_name']) ?></td>
                    <td class="num"><?= (int)$c['orders_count'] ?></td>
                    <td class="num"><?= peso((float)$c['revenue']) ?></td>
                    <td class="num"><?= peso((float)$c['outstanding']) ?></td>
                </tr><?php endforeach; ?><?php if (!$customerRows): ?><tr>
                    <td colspan="4">No sales records for this reporting period.</td>
                </tr><?php endif; ?></tbody>
    </table>
    <div class="footer">This document is a formal summary generated from the Team Sales system. Amounts are based on recorded Sales Invoices for the selected reporting year.</div>
    <script>
        window.addEventListener('load', () => setTimeout(() => window.print(), 350));
    </script>
<script src="assets/js/pagination.js?v=20261008"></script>
</body>

</html>
