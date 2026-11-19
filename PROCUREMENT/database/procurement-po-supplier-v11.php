<?php
/** v11: Read-only authoritative Procurement supplier lookup for the Inventory service. */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');
header('X-Content-Type-Options: nosniff');
function poSupplierReply(int $status, array $payload): never {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    header('Allow: GET');
    poSupplierReply(405, ['success'=>false, 'message'=>'GET only.']);
}
$key = (string)(getenv('IMS_API_KEY') ?: ($_SERVER['IMS_API_KEY'] ?? ''));
$submitted = (string)($_SERVER['HTTP_X_API_KEY'] ?? '');
$team = (string)($_SERVER['HTTP_X_API_TEAM'] ?? '');
if ($key === '' || $submitted === '' || !hash_equals($key, $submitted) || $team !== 'Inventory') {
    poSupplierReply(401, ['success'=>false, 'message'=>'Authenticated Inventory service required.']);
}
$poNumber = trim((string)($_GET['po_number'] ?? ''));
$requestNumber = trim((string)($_GET['request_number'] ?? ''));
if (!preg_match('/\APO-[A-Za-z0-9-]{1,30}\z/', $poNumber)
    || !preg_match('/\AREQ-[A-Za-z0-9-]{1,64}\z/', $requestNumber)) {
    poSupplierReply(422, ['success'=>false, 'message'=>'PO and Inventory request references required.']);
}
try {
    require_once __DIR__ . '/procurement_db_connection.php';
    $sql = 'SELECT po.po_number, po.status, s.name AS supplier_name '
         . 'FROM purchase_orders po '
         . 'JOIN suppliers s ON s.id = po.supplier_id '
         . 'JOIN rfqs rf ON rf.id = po.rfq_id '
         . 'JOIN inventory_request_pr_links lk ON lk.pr_id = rf.pr_id '
         . 'WHERE po.po_number = ? AND lk.inventory_request_number = ? LIMIT 1';
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('ss', $poNumber, $requestNumber);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$row || trim((string)$row['supplier_name']) === '') {
        poSupplierReply(404, ['success'=>false, 'message'=>'No matching Procurement PO / Inventory request supplier found.']);
    }
    if (!in_array(strtolower((string)$row['status']), ['approved','issued','partial','received'], true)) {
        poSupplierReply(409, ['success'=>false, 'message'=>'The linked PO has not reached an approved receiving state.']);
    }
    poSupplierReply(200, [
        'success' => true,
        'po_number' => (string)$row['po_number'],
        'supplier_name' => (string)$row['supplier_name'],
        'source' => 'procurement_approved_po',
    ]);
} catch (Throwable $e) {
    error_log('v11 PO supplier lookup: ' . $e->getMessage());
    poSupplierReply(500, ['success'=>false, 'message'=>'Could not verify approved PO supplier; check Procurement server log.']);
}
