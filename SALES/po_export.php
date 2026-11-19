<?php

/**
 * Purchase Order export.
 *   po_export.php?id=1&format=pdf   -> PDF
 *   po_export.php?id=1&format=doc   -> Word document (opens in Word/LibreOffice)
 */
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';
require_once __DIR__ . '/includes/simple_pdf.php';
requireSalesWorkspace();
$pdo = getDB();

$id = (int) ($_GET['id'] ?? 0);
$format = strtolower($_GET['format'] ?? 'pdf');

$st = $pdo->prepare("
    SELECT 
        po.*,
        q.quotation_no,
        q.valid_until,
        c.customer_name,
        c.customer_code,
        c.address,
        c.city,
        c.province,
        c.phone,
        c.email,
        c.payment_terms

    FROM purchase_orders po

    JOIN sales_quotations q 
        ON q.sq_id = po.quotation_id

    JOIN customers c 
        ON c.cus_id = po.customer_id

    WHERE po.po_id = ?
");
$st->execute([$id]);
$po = $st->fetch();
if (!$po) {
    http_response_code(404);
    exit('Purchase Order not found.');
}
$inventoryProduct = checkInventoryProduct((string)$po['product_code']);
$po['product_name'] = !empty($inventoryProduct['ok'])
    ? (string)$inventoryProduct['item_name']
    : '';

$qty = (int) $po['quantity'];
$total = (float) $po['total_amount'];
$unit = $qty > 0 ? $total / $qty : 0;
$product = trim(($po['product_name'] ?? '') !== '' ? $po['product_code'] . ' - ' . $po['product_name'] : $po['product_code']);
$addr = implode(', ', array_filter([$po['address'], $po['city'], $po['province']]));
$money = fn(float $v) => 'PHP ' . number_format($v, 2);
$file = $po['po_no'];

logActivity($pdo, 'Export', 'Purchase Order', 'Exported ' . $po['po_no'] . ' as ' . strtoupper($format), (int) $po['po_id']);

if ($format === 'doc') {
    header('Content-Type: application/msword');
    header('Content-Disposition: attachment; filename="' . $file . '.doc"');
    $h = fn($v) => htmlspecialchars((string) $v);
    echo '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>' . $h($file) . '</title>
<style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt}h1{margin:0;font-size:22pt}table{border-collapse:collapse;width:100%}
th{background:#111;color:#fff;text-align:left;padding:6px;border:1px solid #111}td{padding:6px;border:1px solid #999}.r{text-align:right}.meta td{border:none;padding:2px 0}</style></head><body>
<h1>PURCHASE ORDER</h1><p><b>StrideCraft Footwear</b> &mdash; Sales Department</p>
<table class="meta"><tr><td><b>PO No.:</b> ' . $h($po['po_no']) . '</td><td><b>Date:</b> ' . $h(niceDate($po['order_date'])) . '</td></tr>
<tr><td><b>Quotation Ref.:</b> ' . $h($po['quotation_no']) . '</td><td><b>Status:</b> ' . $h($po['status']) . '</td></tr></table><br>
<p><b>CUSTOMER</b><br>' . $h($po['customer_name']) . ' (' . $h($po['customer_code']) . ')<br>' . $h($addr) . '<br>' . $h($po['phone']) . ' &nbsp; ' . $h($po['email']) . '<br>Payment terms: ' . $h($po['payment_terms']) . '</p>
<table><tr><th>Product</th><th class="r">Qty</th><th class="r">Unit Price</th><th class="r">Amount</th></tr>
<tr><td>' . $h($product) . '</td><td class="r">' . $qty . '</td><td class="r">' . $h($money($unit)) . '</td><td class="r">' . $h($money($total)) . '</td></tr>
<tr><td colspan="3" class="r"><b>TOTAL</b></td><td class="r"><b>' . $h($money($total)) . '</b></td></tr></table>
<br><br><p>Prepared by: ______________________ &nbsp;&nbsp;&nbsp;&nbsp; Approved by: ______________________</p><script src="assets/js/pagination.js?v=20261008"></script>
</body></html>';
    exit;
}

// ---- PDF ----
$pdf = new SimplePDF();
$ink = [0.07, 0.07, 0.07];
$pdf->rect(40, 40, 515, 62, $ink);
$pdf->text(56, 68, 'PURCHASE ORDER', 22, true, [1, 1, 1]);
$pdf->text(56, 88, 'StrideCraft Footwear  |  Sales Department', 10, false, [1, 1, 1]);
$pdf->text(400, 68, $po['po_no'], 16, true, [1, 1, 1]);

$pdf->text(40, 135, 'PO Date', 8, true);
$pdf->text(40, 148, niceDate($po['order_date']), 11);
$pdf->text(190, 135, 'Quotation Ref.', 8, true);
$pdf->text(190, 148, $po['quotation_no'], 11);
$pdf->text(340, 135, 'Status', 8, true);
$pdf->text(340, 148, $po['status'], 11);
$pdf->text(450, 135, 'Payment Terms', 8, true);
$pdf->text(450, 148, $po['payment_terms'], 11);

$pdf->text(40, 190, 'CUSTOMER', 8, true);
$pdf->text(40, 205, $po['customer_name'] . '  (' . $po['customer_code'] . ')', 12, true);
$pdf->text(40, 221, $addr ?: '-', 10);
$pdf->text(40, 235, trim(($po['phone'] ?? '') . '   ' . ($po['email'] ?? '')), 10);

$pdf->rect(40, 270, 515, 24, $ink);
$pdf->text(48, 286, 'PRODUCT', 9, true, [1, 1, 1]);
$pdf->text(330, 286, 'QTY', 9, true, [1, 1, 1]);
$pdf->text(390, 286, 'UNIT PRICE', 9, true, [1, 1, 1]);
$pdf->text(485, 286, 'AMOUNT', 9, true, [1, 1, 1]);
$pdf->text(48, 316, mb_strimwidth($product, 0, 48, '...'), 10);
$pdf->text(330, 316, (string) $qty, 10);
$pdf->text(390, 316, number_format($unit, 2), 10);
$pdf->textRight(547, 316, number_format($total, 2), 10);
$pdf->line(40, 328, 555, 328);
$pdf->text(390, 352, 'TOTAL (PHP)', 11, true);
$pdf->textRight(547, 352, number_format($total, 2), 12, true);

$pdf->line(40, 470, 220, 470);
$pdf->text(40, 484, 'Prepared by', 9);
$pdf->line(375, 470, 555, 470);
$pdf->text(375, 484, 'Approved by', 9);
$pdf->text(40, 800, 'Generated by Team Sales on ' . date('M j, Y g:i A'), 8, false, [0.4, 0.4, 0.4]);

header('Content-Type: application/pdf');
header('Content-Disposition: inline; filename="' . $file . '.pdf"');
echo $pdf->output();
