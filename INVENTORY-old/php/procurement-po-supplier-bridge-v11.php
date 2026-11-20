<?php
/** v11: Inventory server-side authenticated, fail-closed supplier lookup. */
declare(strict_types=1);
function inventoryPoSupplierV11(string $poNumber, string $requestNumber): string {
    if (!preg_match('/\APO-[A-Za-z0-9-]{1,30}\z/', $poNumber)
        || !preg_match('/\AREQ-[A-Za-z0-9-]{1,64}\z/', $requestNumber)) {
        throw new RuntimeException('Procurement PO or linked Inventory request is invalid.');
    }
    $key = (string)(getenv('IMS_API_KEY') ?: ($_SERVER['IMS_API_KEY'] ?? ''));
    if ($key === '' || preg_match('/[\r\n]/', $key)) {
        throw new RuntimeException('IMS_API_KEY is not configured on this server.');
    }
    if (!function_exists('curl_init')) throw new RuntimeException('PHP cURL is disabled.');
    $base = (string)(getenv('PROCUREMENT_PO_SUPPLIER_URL')
        ?: ($_SERVER['PROCUREMENT_PO_SUPPLIER_URL']
        ?? 'http://127.0.0.1/ITPROFEL/PROCUREMENT/database/procurement-po-supplier-v11.php'));
    $u = parse_url($base);
    if (!is_array($u) || ($u['scheme'] ?? '') !== 'http'
        || !in_array(strtolower((string)($u['host'] ?? '')), ['127.0.0.1','localhost'], true)
        || isset($u['user']) || isset($u['pass']) || isset($u['fragment']) || isset($u['query'])) {
        throw new RuntimeException('Supplier lookup URL must be an internal localhost HTTP endpoint.');
    }
    $url = $base . '?' . http_build_query(['po_number'=>$poNumber, 'request_number'=>$requestNumber]);
    $c = curl_init($url);
    if ($c === false) throw new RuntimeException('Cannot start supplier verification request.');
    curl_setopt_array($c, [
        CURLOPT_RETURNTRANSFER=>true, CURLOPT_HTTPGET=>true,
        CURLOPT_CONNECTTIMEOUT=>3, CURLOPT_TIMEOUT=>8,
        CURLOPT_FOLLOWLOCATION=>false, CURLOPT_MAXREDIRS=>0,
        CURLOPT_COOKIE=>'', CURLOPT_PROXY=>'',
        CURLOPT_HTTPHEADER=>['Accept: application/json', 'X-API-Team: Inventory', 'X-API-Key: '.$key],
    ]);
    $body = curl_exec($c);
    $status = (int)curl_getinfo($c, CURLINFO_HTTP_CODE);
    curl_close($c);
    if (!is_string($body) || strlen($body) > 12000) {
        throw new RuntimeException('Procurement supplier verification is unavailable.');
    }
    $data = json_decode($body, true);
    if ($status !== 200 || !is_array($data) || ($data['success'] ?? false) !== true) {
        throw new RuntimeException('Procurement supplier verification failed (HTTP '.$status.'). Recheck PO / request linking.');
    }
    $supplier = trim((string)($data['supplier_name'] ?? ''));
    if ($supplier === '' || (string)($data['po_number'] ?? '') !== $poNumber || strlen($supplier) > 200) {
        throw new RuntimeException('Supplier verification returned an invalid PO or name.');
    }
    return $supplier;
}
