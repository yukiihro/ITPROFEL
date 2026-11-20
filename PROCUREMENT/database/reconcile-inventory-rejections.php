<?php
/** Run on the XAMPP host to repair an already-saved Inventory rejection. */
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }
require_once __DIR__ . '/inventory-rejection-common.php';
if (($argc ?? 0) !== 2 || !preg_match('/\APO-[A-Za-z0-9-]{1,30}\z/', (string)$argv[1])) {
    fwrite(STDERR, "Usage: php reconcile-inventory-rejections.php PO-2026-0022\n");
    exit(2);
}
try {
    $poNumber = (string)$argv[1];
    $q = $conn->prepare('SELECT l.inventory_request_number FROM purchase_orders po JOIN rfqs r ON r.id=po.rfq_id JOIN inventory_request_pr_links l ON l.pr_id=r.pr_id WHERE po.po_number=? LIMIT 1');
    $q->bind_param('s', $poNumber);
    $q->execute();
    $requestNumber = (string)($q->get_result()->fetch_assoc()['inventory_request_number'] ?? '');
    $q->close();
    if ($requestNumber === '') throw new DomainException('No linked Inventory Material Request for this PO.');
    $response = uniInventoryCall('rejections', 'GET');
    $reports = [];
    foreach (($response['data'] ?? []) as $report) {
        if (is_array($report) && (string)($report['po_number'] ?? '') === $poNumber &&
            (string)($report['request_number'] ?? '') === $requestNumber) $reports[] = $report;
    }
    if (count($reports) !== 1) throw new DomainException('Expected one verified rejection report for this PO; found ' . count($reports) . '.');
    $result = reconcileRejection($conn, $requestNumber, $poNumber, (int)$reports[0]['id']);
    echo "[SUCCESS] Verified post-receipt rejection reconciliation: " . json_encode($result, JSON_UNESCAPED_SLASHES) . "\n";
} catch (Throwable $error) {
    fwrite(STDERR, "[STOP] " . $error->getMessage() . "\nNo unverified PO changes were committed.\n");
    exit(1);
}
