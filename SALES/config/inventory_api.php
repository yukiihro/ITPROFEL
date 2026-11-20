<?php

function inventoryApiEnvironmentValue(string $name): string
{
    $value = getenv($name);
    if ($value !== false && trim((string)$value) !== '') {
        return trim((string)$value);
    }

    foreach ([$_SERVER[$name] ?? null, $_ENV[$name] ?? null] as $value) {
        if (is_string($value) && trim($value) !== '') {
            return trim($value);
        }
    }

    return '';
}

function inventoryApiRequest(string $method, string $endpoint, ?array $payload = null): array
{
    $baseUrl = rtrim(
        inventoryApiEnvironmentValue('INVENTORY_API_BASE_URL') ?: 'http://localhost/Inventory_System/api',
        '/'
    );
    $apiKey = inventoryApiEnvironmentValue('INVENTORY_API_KEY');
    if ($apiKey === '' || strpos($apiKey, 'CHANGE-') === 0) {
        throw new RuntimeException('Inventory API is not configured. Set INVENTORY_API_KEY in the Sales System environment.');
    }
    if (!preg_match('#^https?://#i', $baseUrl) || !preg_match('/^[a-zA-Z0-9._-]+\.php$/', $endpoint)) {
        throw new RuntimeException('Inventory API URL or endpoint configuration is invalid.');
    }
    if (!function_exists('curl_init')) {
        throw new RuntimeException('The PHP cURL extension is required for Inventory API integration.');
    }

    $url = $baseUrl . '/' . $endpoint;
    $headers = [
        'Accept: application/json',
        'X-API-Key: ' . $apiKey,
        'X-API-Team: Sales',
    ];
    $options = [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ];

    if ($method === 'GET') {
        if ($payload) {
            $options[CURLOPT_URL] .= '?' . http_build_query($payload);
        }
    } elseif ($method === 'POST') {
        $body = json_encode($payload ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($body === false) {
            throw new RuntimeException('Could not encode the Inventory API request.');
        }
        $headers[] = 'Content-Type: application/json';
        $options[CURLOPT_HTTPHEADER] = $headers;
        $options[CURLOPT_POST] = true;
        $options[CURLOPT_POSTFIELDS] = $body;
    } else {
        throw new InvalidArgumentException('Unsupported Inventory API method.');
    }

    $curl = curl_init();
    if ($curl === false) {
        throw new RuntimeException('Could not initialize the Inventory API connection.');
    }
    curl_setopt_array($curl, $options);
    $responseBody = curl_exec($curl);
    $curlError = curl_error($curl);
    $status = (int)curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    curl_close($curl);

    if ($responseBody === false) {
        throw new RuntimeException('Could not reach the Inventory API: ' . $curlError);
    }

    try {
        $response = json_decode($responseBody, true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException $e) {
        throw new RuntimeException('Inventory API returned invalid JSON (HTTP ' . $status . ').', 0, $e);
    }
    if ($status < 200 || $status >= 300 || !is_array($response) || empty($response['success'])) {
        $message = is_array($response) ? (string)($response['message'] ?? '') : '';
        throw new RuntimeException(
            $message !== '' ? $message : 'Inventory API request failed with HTTP ' . $status . '.',
            $status
        );
    }

    return $response;
}

function getInventoryApiCatalog(): array
{
    $response = inventoryApiRequest('GET', 'items.php');
    $catalog = $response['data'] ?? null;
    if (
        !is_array($catalog)
        || !is_array($catalog['items'] ?? null)
        || !is_array($catalog['warehouses'] ?? null)
    ) {
        throw new RuntimeException('Inventory API returned an invalid catalog.');
    }
    return $catalog;
}

function getInventoryApiRequests(?string $requestNumber = null): array
{
    $query = trim((string)$requestNumber) !== ''
        ? ['request_number' => trim((string)$requestNumber)]
        : null;
    $response = inventoryApiRequest('GET', 'requests.php', $query);
    $requests = $response['data'] ?? null;
    if (!is_array($requests)) {
        throw new RuntimeException('Inventory API returned an invalid request list.');
    }
    return $requests;
}
