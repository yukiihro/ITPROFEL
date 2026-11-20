<?php

$IMS_API_KEY = getenv('IMS_API_KEY')
    ?: ($_SERVER['IMS_API_KEY'] ?? '');

if (empty($IMS_API_KEY)) {
    error_log('IMS API Key is not configured.');
}
?>