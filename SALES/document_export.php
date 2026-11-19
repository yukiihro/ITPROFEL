<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';
require_once __DIR__ . '/includes/simple_pdf.php';
requireLogin();

if (!in_array(currentUser()['role'] ?? '', ['Sales Admin', 'Sales Staff'], true)) {
    http_response_code(403);
    exit('Forbidden');
}

$type = $_GET['type'] ?? '';
$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
if (!$id || $id < 1 || !in_array($type, ['invoice', 'receipt', 'delivery'], true)) {
    http_response_code(400);
    exit('Invalid document request.');
}

$pdo = getDB();
if ($type === 'invoice') {
    $stmt = $pdo->prepare("
        SELECT i.invoice_no, i.invoice_date, i.total_amount, i.amount_paid, i.status,
               o.order_no, o.product_code, o.quantity, o.total_amount AS order_total,
               COALESCE((SELECT SUM(r.total_amount) FROM sales_returns r WHERE r.order_id=o.so_id AND r.admin_status='Approved'),0) AS approved_return_total,
               c.customer_name, c.customer_code, c.email, c.phone, c.address, c.city, c.province
        FROM sales_invoices i
        JOIN sales_orders o ON o.so_id = i.order_id
        JOIN customers c ON c.cus_id = o.customer_id
        WHERE i.inv_id = ?
        LIMIT 1
    ");
    $stmt->execute([$id]);
    $record = $stmt->fetch();
    $title = 'SALES INVOICE';
    $number = $record['invoice_no'] ?? '';
} elseif ($type === 'receipt') {
    $stmt = $pdo->prepare("
        SELECT col.collection_no, col.collection_date, col.due_date, col.amount, col.method,
               i.invoice_no, o.order_no,
               c.customer_name, c.customer_code, c.email, c.phone, c.address, c.city, c.province
        FROM collections col
        JOIN sales_invoices i ON i.inv_id = col.invoice_id
        JOIN sales_orders o ON o.so_id = i.order_id
        JOIN customers c ON c.cus_id = o.customer_id
        WHERE col.col_id = ?
        LIMIT 1
    ");
    $stmt->execute([$id]);
    $record = $stmt->fetch();
    $title = 'PAYMENT RECEIPT';
    $number = $record['collection_no'] ?? '';
} else {
    $stmt = $pdo->prepare("
        SELECT d.delivery_no, d.delivery_date, d.status,
               o.order_no, o.product_code, o.quantity,
               c.customer_name, c.customer_code, c.phone, c.email, c.address, c.city, c.province
        FROM deliveries d
        JOIN sales_orders o ON o.so_id = d.order_id
        JOIN customers c ON c.cus_id = o.customer_id
        WHERE d.del_id = ?
        LIMIT 1
    ");
    $stmt->execute([$id]);
    $record = $stmt->fetch();
    $title = 'DELIVERY RECEIPT';
    $number = $record['delivery_no'] ?? '';
}

if (!$record) {
    http_response_code(404);
    exit('Document not found.');
}

$pdf = new SimplePDF();
$pdf->text(48, 55, 'TEAM SALES', 24, true);
$pdf->text(48, 78, $title, 12, true);
$pdf->text(48, 110, 'Document No.: ' . $number, 11, true);

$documentDate = $type === 'invoice'
    ? $record['invoice_date']
    : ($type === 'receipt' ? $record['collection_date'] : $record['delivery_date']);
$pdf->text(400, 110, 'Date: ' . niceDate($documentDate), 10);

if ($type === 'receipt') {
    $pdf->text(48, 132, 'Invoice: ' . $record['invoice_no'] . '   Payment Method: ' . $record['method'], 10);
} elseif ($type === 'delivery') {
    $pdf->text(48, 132, 'Sales Order: ' . $record['order_no'] . '   Status: ' . $record['status'], 10);
} else {
    $pdf->text(48, 132, 'Sales Order: ' . $record['order_no'] . '   Status: ' . $record['status'], 10);
}
$pdf->line(48, 148, 547, 148, 1);

$address = trim(implode(', ', array_filter([
    $record['address'] ?? '',
    $record['city'] ?? '',
    $record['province'] ?? '',
])));
$pdf->text(48, 175, 'CUSTOMER', 9, true);
$pdf->text(48, 194, (string)$record['customer_name'], 11, true);
$pdf->text(48, 213, $address !== '' ? $address : 'â€”', 9);
$pdf->text(48, 232, 'Email: ' . ($record['email'] ?: 'â€”') . '   Phone: ' . ($record['phone'] ?: 'â€”'), 9);

$ink = [0.94, 0.94, 0.94];
$pdf->rect(48, 260, 499, 34, $ink);
$pdf->text(58, 281, 'ITEM', 9, true);
$pdf->text(290, 281, 'QTY', 9, true);
$pdf->text(365, 281, 'UNIT PRICE', 9, true);
$pdf->text(470, 281, 'TOTAL', 9, true);

if ($type === 'invoice') {
    $item = (string)($record['product_code'] ?? 'â€”');
    $quantity = max(0, (int)($record['quantity'] ?? 0));
    $total = (float)$record['total_amount'];
    $lineTotal = (float)$record['order_total'];
    $unitPrice = $quantity > 0 ? $lineTotal / $quantity : $lineTotal;
} elseif ($type === 'receipt') {
    $item = 'Payment received (' . (string)$record['method'] . ')';
    $quantity = 1;
    $total = (float)$record['amount'];
    $unitPrice = $total;
} else {
    $item = (string)($record['product_code'] ?? 'â€”');
    $quantity = max(0, (int)($record['quantity'] ?? 0));
    $total = 0.0;
    $unitPrice = 0.0;
}

$pdf->text(58, 315, $item, 10, true);
$pdf->text(295, 315, $quantity > 0 ? (string)$quantity : 'â€”', 10, true);
$pdf->text(365, 315, $type === 'delivery' ? 'â€”' : 'PHP ' . number_format($unitPrice, 2), 10);
$pdf->textRight(545, 315, $type === 'delivery' ? '-' : 'PHP ' . number_format($type === 'invoice' ? $lineTotal : $total, 2), 10, true);
$pdf->line(48, 332, 547, 332, 0.7);

if ($type === 'invoice') {
    if ((float)$record['approved_return_total'] > 0) {
        $pdf->text(350, 354, 'Approved returns', 10);
        $pdf->textRight(545, 354, '-PHP ' . number_format((float)$record['approved_return_total'], 2), 10);
    }
    $pdf->textRight(545, 378, 'TOTAL: PHP ' . number_format($total, 2), 14, true);
    $pdf->text(48, 405, 'PAYMENT SUMMARY', 10, true);
    $pdf->text(48, 425, 'Amount paid: PHP ' . number_format((float)$record['amount_paid'], 2), 9);
    $pdf->text(48, 442, 'Balance due: PHP ' . number_format(max(0, $total - (float)$record['amount_paid']), 2), 9);
    $pdf->text(48, 480, 'Status: ' . $record['status'], 10, true);
    $pdf->text(48, 520, 'Thank you for choosing Team Sales.', 10);
} elseif ($type === 'receipt') {
    $pdf->textRight(545, 360, 'TOTAL RECEIVED: PHP ' . number_format($total, 2), 14, true);
    $pdf->text(48, 405, 'PAYMENT DETAILS', 10, true);
    $pdf->text(48, 425, 'Payment for invoice ' . $record['invoice_no'] . ' / Sales Order ' . $record['order_no'], 9);
    $pdf->text(48, 442, 'Due date: ' . niceDate($record['due_date']), 9);
    $pdf->text(48, 480, 'Payment method: ' . $record['method'], 10, true);
    $pdf->text(48, 520, 'Thank you for your payment.', 10);
} else {
    $pdf->textRight(545, 360, 'DELIVERY RECEIPT', 14, true);
    $pdf->text(48, 405, 'Delivery Status: ' . $record['status'], 10, true);
    $pdf->line(48, 470, 235, 470);
    $pdf->text(48, 484, 'Received by', 9);
    $pdf->line(360, 470, 547, 470);
    $pdf->text(360, 484, 'Date received', 9);
    $pdf->text(48, 520, 'Thank you for choosing Team Sales.', 10);
}

$filename = strtolower($type) . '-' . preg_replace('/[^A-Za-z0-9._-]/', '_', $number) . '.pdf';
header('Content-Type: application/pdf');
header('Content-Disposition: inline; filename="' . $filename . '"');
header('Content-Length: ' . strlen($pdf->output()));
echo $pdf->output();
exit;

