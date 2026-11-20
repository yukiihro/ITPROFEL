<?php
// Procurement sign-in is disabled. Accounts are created by the HR department
// (finance_hr.accounts) and verified against uniprocur2.users by the
// universal login route (root/index.php -> buyer/manager dashboard via
// database/guard-page.php, which bridges the root session into UPRSESS).
declare(strict_types=1);
http_response_code(410);
header('Content-Type: application/json; charset=utf-8');
echo json_encode(['success' => false, 'message' => 'Procurement login is disabled — use the universal login page.']);
exit;
