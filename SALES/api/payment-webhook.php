<?php
http_response_code(410);
header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'success' => false,
    'message' => 'Payment gateway callbacks are disabled. Customer payments require manual Sales review.',
]);
