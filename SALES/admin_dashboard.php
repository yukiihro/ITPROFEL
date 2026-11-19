<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';
requireSalesAdmin();
header('Location: dashboard.php');
exit;
?>
