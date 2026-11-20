<?php
require_once __DIR__ . '/includes/auth.php';

requireLogin();

if (currentUser()['role'] === 'Sales Admin') {
    header('Location: admin_customers.php');
    exit;
}

header('Location: dashboard.php');
exit;
?>
