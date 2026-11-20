<?php
/** Authenticated Inventory -> Procurement rejection update (post-confirmed DR). */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');
header('X-Content-Type-Options: nosniff');
require_once __DIR__ . '/inventory-rejection-common.php';
function rejectionReply(int $code, array $payload): never {
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    rejectionReply(405, ['success' => false, 'message' => 'POST only.']);
}
try {
    $expectedKey = uniInventoryKey();
    if (!hash_equals($expectedKey, (string)($_SERVER['HTTP_X_API_KEY'] ?? '')) ||
        (string)($_SERVER['HTTP_X_API_TEAM'] ?? '') !== 'Inventory') {
        rejectionReply(401, ['success' => false, 'message' => 'Authenticated Inventory service required.']);
    }
    if (stripos((string)($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json') !== 0) {
        rejectionReply(415, ['success' => false, 'message' => 'JSON required.']);
    }
    $body = json_decode(file_get_contents('php://input') ?: '', true);
    $requestNumber = is_array($body) ? (string)($body['request_number'] ?? '') : '';
    $poNumber = is_array($body) ? (string)($body['po_number'] ?? '') : '';
    $reportId = is_array($body) ? (int)($body['report_id'] ?? 0) : 0;
    if (!preg_match('/\AREQ-[A-Za-z0-9-]{1,64}\z/', $requestNumber) ||
        !preg_match('/\APO-[A-Za-z0-9-]{1,30}\z/', $poNumber) || $reportId <= 0) {
        rejectionReply(422, ['success' => false, 'message' => 'Valid request, PO and rejection report ID are required.']);
    }
    $result = reconcileRejection($conn, $requestNumber, $poNumber, $reportId);
    rejectionReply(200, ['success' => true, 'message' => 'Verified Inventory rejection synchronized.', 'data' => $result]);
} catch (DomainException $error) {
    rejectionReply(409, ['success' => false, 'message' => $error->getMessage()]);
} catch (Throwable $error) {
    error_log('Inventory rejection synchronization: ' . $error->getMessage());
    rejectionReply(502, ['success' => false, 'message' => 'Rejection sync failed. Check PHP logs, Inventory API and SQL migration.']);
}
