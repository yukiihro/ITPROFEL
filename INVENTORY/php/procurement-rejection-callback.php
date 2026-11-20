<?php
/** Inventory -> Procurement post-receipt rejection notification (best effort).
 * Inventory saves its transaction first. Procurement then independently
 * verifies the saved rejection report and DR using authenticated Inventory APIs.
 */
function inventoryNotifyProcurementRejection(string $requestNumber, string $poNumber, int $reportId): bool {
    if ($requestNumber === '' || $poNumber === '' || $reportId <= 0) return false;
    $key = (string)(getenv('IMS_API_KEY') ?: ($_SERVER['IMS_API_KEY'] ?? ''));
    $url = (string)(getenv('PROCUREMENT_REJECTION_SYNC_URL') ?: ($_SERVER['PROCUREMENT_REJECTION_SYNC_URL'] ?? 'http://127.0.0.1/ITPROFEL/PROCUREMENT/database/inventory-rejection-reconciled.php'));
    $parsed = parse_url($url);
    if ($key === '' || !function_exists('curl_init') || !is_array($parsed) ||
        ($parsed['scheme'] ?? '') !== 'http' ||
        !in_array(strtolower((string)($parsed['host'] ?? '')), ['localhost', '127.0.0.1'], true) ||
        !empty($parsed['user']) || !empty($parsed['pass'])) {
        error_log('Inventory rejection callback: invalid local server URL, missing API key, or missing PHP cURL.');
        return false;
    }
    $ch = curl_init($url);
    if ($ch === false) return false;
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode([
            'request_number' => $requestNumber, 'po_number' => $poNumber, 'report_id' => $reportId
        ], JSON_THROW_ON_ERROR),
        CURLOPT_CONNECTTIMEOUT => 3,
        CURLOPT_TIMEOUT => 12,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json',
            'X-API-Team: Inventory', 'X-API-Key: ' . $key],
        CURLOPT_COOKIE => '',
        CURLOPT_PROXY => ''
    ]);
    $response = curl_exec($ch);
    $http = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $failure = curl_error($ch);
    curl_close($ch);
    $decoded = is_string($response) ? json_decode($response, true) : null;
    $ok = $http >= 200 && $http < 300 && is_array($decoded) && ($decoded['success'] ?? false) === true;
    if (!$ok) error_log('Inventory rejection callback failed: HTTP ' . $http . '; ' .
        (is_array($decoded) ? (string)($decoded['message'] ?? 'API error') : $failure));
    return $ok;
}
