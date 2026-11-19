
<?php

header('Content-Type: application/json; charset=utf-8');

function payment_webhook_respond(int $status, string $message): void
{
    http_response_code($status);
    echo json_encode(['success' => $status >= 200 && $status < 300, 'message' => $message]);
    exit;
}

function payment_webhook_environment_value(string $name): string
{
    $value = getenv($name);
    if ($value !== false && trim((string)$value) !== '') return trim((string)$value);
    foreach ([$_SERVER[$name] ?? null, $_ENV[$name] ?? null] as $value) {
        if (is_string($value) && trim($value) !== '') return trim($value);
    }
    return '';
}

function payment_webhook_centavos_to_amount(int $centavos): string
{
    return intdiv($centavos, 100) . '.' . str_pad((string)($centavos % 100), 2, '0', STR_PAD_LEFT);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    payment_webhook_respond(405, 'Method not allowed.');
}

$webhookSecret = payment_webhook_environment_value('PAYMENT_WEBHOOK_SECRET');
if ($webhookSecret === '') {
    error_log('Payment webhook is not configured.');
    payment_webhook_respond(503, 'Payment webhook is not configured.');
}

$rawBody = file_get_contents('php://input');
$signature = (string)($_SERVER['HTTP_X_PAYMENT_SIGNATURE'] ?? '');
if ($rawBody === false || $rawBody === '' || $signature === '') {
    payment_webhook_respond(400, 'Missing webhook data or signature.');
}

$expectedSignature = 'sha256=' . hash_hmac('sha256', $rawBody, $webhookSecret);
if (!hash_equals($expectedSignature, $signature)) {
    payment_webhook_respond(401, 'Invalid webhook signature.');
}

$event = json_decode($rawBody, true);
$data = is_array($event) ? ($event['data'] ?? null) : null;
$eventId = is_array($event) && is_string($event['id'] ?? null) ? $event['id'] : '';
$eventType = is_array($event) && is_string($event['event'] ?? null) ? $event['event'] : '';
$transactionRef = is_array($data) && is_string($data['transaction_ref'] ?? null)
    ? $data['transaction_ref']
    : '';
if (
    !is_array($event)
    || !is_array($data)
    || !preg_match('/^[a-f0-9]{32}$/i', $eventId)
    || !in_array($eventType, ['payment.succeeded', 'payment.failed', 'payment.expired'], true)
    || !preg_match('/^[A-Za-z0-9_-]{1,50}$/', $transactionRef)
) {
    payment_webhook_respond(400, 'Invalid webhook payload.');
}

if ($eventType === 'payment.expired') {
    payment_webhook_respond(200, 'Expired payment acknowledged.');
}

$invoiceNoValue = $data['external_reference'] ?? null;
$currencyValue = $data['currency'] ?? null;
$methodValue = $data['payment_method'] ?? null;
$statusValue = $data['status'] ?? null;
$invoiceNo = is_string($invoiceNoValue) ? trim($invoiceNoValue) : '';
$status = $eventType === 'payment.succeeded' ? 'SUCCESS' : 'FAILED';
$currency = is_string($currencyValue) ? $currencyValue : '';
$paymentMethod = is_string($methodValue) ? $methodValue : '';
$amountValue = $data['amount_centavos'] ?? null;
$amountCentavos = is_int($amountValue)
    ? $amountValue
    : (is_string($amountValue) && ctype_digit($amountValue) ? (int)$amountValue : 0);

if (
    $invoiceNo === ''
    || strlen($invoiceNo) > 30
    || $currency !== 'PHP'
    || !in_array($paymentMethod, ['GCASH', 'CARD'], true)
    || $amountCentavos <= 0
    || $amountCentavos > 999999999999
    || !is_string($statusValue)
    || $statusValue !== $status
) {
    payment_webhook_respond(400, 'Invalid payment details.');
}

require_once __DIR__ . '/../config/database.php';

try {
    $pdo = getDB();
    if (!$pdo instanceof PDO) {
        throw new RuntimeException('Sales database connection is unavailable.');
    }

    $pdo->beginTransaction();
    $existing = $pdo->prepare('SELECT transaction_ref FROM gateway_payment_events WHERE transaction_ref = ? OR event_id = ? LIMIT 1');
    $existing->execute([$transactionRef, $eventId]);
    $existingTransaction = $existing->fetchColumn();
    if ($existingTransaction !== false) {
        if ((string)$existingTransaction !== $transactionRef) {
            $pdo->rollBack();
            payment_webhook_respond(409, 'Webhook event identifier is already in use.');
        }
        $pdo->commit();
        payment_webhook_respond(200, 'Payment event already processed.');
    }

    $invoiceStmt = $pdo->prepare("
        SELECT i.inv_id, i.invoice_no, i.total_amount, i.amount_paid, i.status,
               o.so_id
        FROM sales_invoices i
        JOIN sales_orders o ON o.so_id = i.order_id
        WHERE i.invoice_no = ?
        LIMIT 1
        FOR UPDATE
    ");
    $invoiceStmt->execute([$invoiceNo]);
    $invoice = $invoiceStmt->fetch();
    if (!$invoice) {
        $pdo->rollBack();
        payment_webhook_respond(404, 'Invoice not found.');
    }

    $methodLabel = $paymentMethod === 'GCASH' ? 'GCash' : 'Debit/Credit Card';
    $insertEvent = $pdo->prepare("
        INSERT INTO gateway_payment_events
            (event_id, transaction_ref, invoice_id, amount_centavos, payment_method, status)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    $insertEvent->execute([
        $eventId,
        $transactionRef,
        (int)$invoice['inv_id'],
        $amountCentavos,
        $paymentMethod,
        $status,
    ]);

    if ($status === 'FAILED') {
        $pdo->prepare("
            UPDATE sales_orders
            SET payment_status = CASE
                WHEN payment_status = 'Partially Paid' THEN 'Partially Paid'
                ELSE 'Failed'
            END
            WHERE so_id = ? AND payment_reference = ?
        ")->execute([(int)$invoice['so_id'], $transactionRef]);
        $pdo->commit();
        payment_webhook_respond(200, 'Failed payment recorded.');
    }

    $totalCentavos = (int)round((float)$invoice['total_amount'] * 100);
    $paidCentavos = (int)round((float)$invoice['amount_paid'] * 100);
    $remainingCentavos = max(0, $totalCentavos - $paidCentavos);
    if ($invoice['status'] === 'Returned' || $amountCentavos > $remainingCentavos) {
        $pdo->rollBack();
        payment_webhook_respond(409, 'Payment exceeds the invoice balance or the invoice is returned.');
    }

    $newPaidCentavos = $paidCentavos + $amountCentavos;
    $newStatus = $newPaidCentavos >= $totalCentavos ? 'Paid' : 'Partially Paid';
    $temporaryCollectionNo = 'TMP-' . bin2hex(random_bytes(12));
    $pdo->prepare("
        INSERT INTO collections
            (collection_no, invoice_id, collection_date, due_date, amount, method)
        VALUES (?, ?, CURDATE(), NULL, ?, ?)
    ")->execute([
        $temporaryCollectionNo,
        (int)$invoice['inv_id'],
        payment_webhook_centavos_to_amount($amountCentavos),
        $methodLabel,
    ]);
    $collectionId = (int)$pdo->lastInsertId();
    $collectionNumber = 500 + $collectionId;
    do {
        $collectionNo = 'COL-' . $collectionNumber++;
        $collectionNoStmt = $pdo->prepare('SELECT 1 FROM collections WHERE collection_no = ? LIMIT 1');
        $collectionNoStmt->execute([$collectionNo]);
    } while ($collectionNoStmt->fetchColumn());
    $pdo->prepare('UPDATE collections SET collection_no = ? WHERE col_id = ?')
        ->execute([$collectionNo, $collectionId]);

    $pdo->prepare('UPDATE sales_invoices SET amount_paid = ?, status = ? WHERE inv_id = ?')
        ->execute([
            payment_webhook_centavos_to_amount($newPaidCentavos),
            $newStatus,
            (int)$invoice['inv_id'],
        ]);
    $pdo->prepare("
        UPDATE sales_orders
        SET payment_method = ?, payment_status = ?, payment_reference = ?,
            paid_at = CASE WHEN ? = 'Paid' THEN NOW() ELSE paid_at END
        WHERE so_id = ?
    ")->execute([
        $methodLabel,
        $newStatus,
        $transactionRef,
        $newStatus,
        (int)$invoice['so_id'],
    ]);

    $pdo->commit();
    payment_webhook_respond(200, 'Payment recorded successfully.');
} catch (PDOException $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if ((string)$e->getCode() === '23000' && isset($pdo) && $pdo instanceof PDO) {
        $duplicate = $pdo->prepare('SELECT transaction_ref FROM gateway_payment_events WHERE transaction_ref = ? LIMIT 1');
        $duplicate->execute([$transactionRef]);
        if ($duplicate->fetchColumn()) {
            payment_webhook_respond(200, 'Payment event already processed.');
        }
    }
    error_log('Payment webhook database error: ' . $e->getMessage());
    payment_webhook_respond(500, 'Unable to record the payment.');
} catch (Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Payment webhook processing error: ' . $e->getMessage());
    payment_webhook_respond(500, 'Unable to record the payment.');
}
