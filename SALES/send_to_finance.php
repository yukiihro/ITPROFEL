<?php
require_once __DIR__ . '/includes/auth.php';
requireSalesWorkspace();

header('Location: invoices.php?section=billing', true, 302);
exit;
