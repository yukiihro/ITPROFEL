<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';

requireLogin();
if (!in_array(currentUser()['role'] ?? '', ['Sales Admin', 'Sales Staff'], true)) {
    http_response_code(403);
    exit('You are not authorized to view payment receipts.');
}

$submissionId = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
if (!$submissionId || $submissionId <= 0) {
    http_response_code(400);
    exit('A valid payment submission is required.');
}

$pdo = getDB();
$stmt = $pdo->prepare('SELECT receipt_path, receipt_mime FROM customer_payment_submissions WHERE submission_id = ?');
$stmt->execute([$submissionId]);
$receipt = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$receipt) {
    http_response_code(404);
    exit('Payment receipt not found.');
}

$mimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
$filename = (string)$receipt['receipt_path'];
if (!preg_match('/^[a-f0-9]{64}\.(jpg|png|webp|pdf)$/', $filename) || !in_array($receipt['receipt_mime'], $mimeTypes, true)) {
    http_response_code(404);
    exit('Payment receipt not found.');
}

$proofDirectory = dirname(dirname(__DIR__)) . DIRECTORY_SEPARATOR . 'Customer-System'
    . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . 'payment-proofs';
$path = $proofDirectory . DIRECTORY_SEPARATOR . $filename;
if (!is_file($path) || !is_readable($path)) {
    http_response_code(404);
    exit('Payment receipt not found.');
}

$extension = pathinfo($filename, PATHINFO_EXTENSION);
header('Content-Type: ' . $receipt['receipt_mime']);
header('Content-Disposition: inline; filename="payment-proof-' . (int)$submissionId . '.' . $extension . '"');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: private, no-store, max-age=0');
readfile($path);
