<?php
// ITPROFEL/PRODUCTION/php/page-access.php
// Reads the page permissions that HR manages in "User Permission".
// They live in the shared finance_hr database, while Production users live
// in team3production — local users inherit the Production group defaults.
require_once "database.php";
require_login();

$user = current_user();
$supervisor = (($user['role'] ?? '') === 'production_supervisor');

// Fail open: if the shared table cannot be read, Production keeps working.
$access = [];
try {
    $fin = new PDO(
        'mysql:host=127.0.0.1;dbname=finance_hr;charset=utf8mb4',
        'root',
        '',
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_TIMEOUT => 5,
        ]
    );

    // Prefer an exact finance_hr account match (email / username).
    $identifiers = array_values(array_unique(array_filter([
        (string)($user['email'] ?? ''),
        (string)($user['username'] ?? ''),
    ])));
    $accountId = 0;
    if ($identifiers) {
        $sql = 'SELECT account_id FROM accounts WHERE username IN ('
             . implode(',', array_fill(0, count($identifiers), '?'))
             . ') ORDER BY account_id LIMIT 1';
        $st = $fin->prepare($sql);
        $st->execute($identifiers);
        $accountId = (int)$st->fetchColumn();
    }

    if ($accountId > 0) {
        $st = $fin->prepare('SELECT page_key, allowed FROM user_page_access WHERE account_id = ?');
        $st->execute([$accountId]);
        foreach ($st->fetchAll() as $row) {
            $access[(string)$row['page_key']] = (int)$row['allowed'] === 1;
        }
    }

    if (!$access) {
        // Local Production accounts (supervisor / staff) have no finance_hr
        // login, so they inherit the Production group defaults saved by HR.
        $position = $supervisor ? 'Supervisor' : 'Staff';
        $st = $fin->prepare(
            'SELECT page_key, allowed FROM page_access_defaults
             WHERE department_id = 8 AND position IN (?, "")
             ORDER BY (position = ?) DESC'
        );
        $st->execute([$position, $position]);
        foreach ($st->fetchAll() as $row) {
            $key = (string)$row['page_key'];
            if (!isset($access[$key])) $access[$key] = (int)$row['allowed'] === 1;
        }
    }
} catch (Throwable $e) {
    error_log('production page-access read failed: ' . $e->getMessage());
    $access = [];
}

json_response([
    'success' => true,
    'access' => $access,
    'supervisor' => $supervisor,
]);
