<?php
// test/FINANCE/api.php
declare(strict_types=1);

require_once dirname(__DIR__) . '/db.php';

session_start();
header('Content-Type: application/json; charset=utf-8');

function respond(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function requestBody(): array
{
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $d = json_decode($raw, true);
    return is_array($d) ? $d : [];
}

function currentUser(): ?array { return $_SESSION['user'] ?? null; }

function requireUser(): array
{
    $u = currentUser();
    if (!$u) respond(['ok' => false, 'message' => 'Authentication required.'], 401);
    return $u;
}

function isHrAdmin(array $u): bool
{
    $role = strtolower($u['role'] ?? '');
    $dept = strtolower($u['department'] ?? '');
    $pos  = strtolower($u['position'] ?? '');
    return $role === 'administrator'
        || ($dept === 'hr' && ($role === 'hr admin' || $role === 'hr manager' || $pos === 'admin'));
}

function isFinanceAdmin(array $u): bool
{
    $role = strtolower($u['role'] ?? '');
    $dept = strtolower($u['department'] ?? '');
    $pos  = strtolower($u['position'] ?? '');
    return $role === 'administrator'
        || ($dept === 'finance' && ($role === 'finance admin' || $pos === 'admin'));
}

function audit(int $userId, string $email, string $role, string $action,
               string $module = '', ?int $recordId = null, string $details = ''): void
{
    if ($userId <= 0) return;
    try {
        $stmt = db()->prepare(
            'INSERT INTO audit_trail (user_id, action, module, record_id, description, new_value)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([$userId, $action, $module, $recordId, $details, $email . '|' . $role]);
    } catch (Throwable $e) { error_log('audit: ' . $e->getMessage()); }
}

function loadState(): array
{
    $pdo = db();
    return [
        'accounts' => $pdo->query(
            "SELECT coa.account_code AS code,
                    coa.account_name AS name,
                    coa.account_type AS type,
                    COALESCE(coa.normal_balance,'Debit') AS normalBalance,
                    COALESCE((
                        SELECT SUM(ft.amount) FROM financial_transactions ft
                        WHERE ft.account_id = coa.account_id AND ft.transaction_type = 'Debit'
                    ), 0) -
                    COALESCE((
                        SELECT SUM(ft.amount) FROM financial_transactions ft
                        WHERE ft.account_id = coa.account_id AND ft.transaction_type = 'Credit'
                    ), 0) AS balance,
                    coa.status, coa.description
             FROM charts_of_accounts coa ORDER BY coa.account_code"
        )->fetchAll(),
        'receivables' => $pdo->query(
            "SELECT ar.ar_id AS id, COALESCE(c.customer_name, '') AS customer,
                    ar.invoice_no AS invoice, ar.due_date AS due,
                    ar.amount, ar.status
             FROM accounts_receivable ar
             LEFT JOIN customers c ON c.customer_id = ar.customer_id
             ORDER BY ar.ar_id DESC"
        )->fetchAll(),
        'payables' => $pdo->query(
            "SELECT ap.ap_id AS id, COALESCE(s.supplier_name, '') AS vendor,
                    ap.invoice_no AS invoice, ap.due_date AS due,
                    ap.amount, ap.status
             FROM accounts_payable ap
             LEFT JOIN suppliers s ON s.supplier_id = ap.supplier_id
             ORDER BY ap.ap_id DESC"
        )->fetchAll(),
        'cashBank' => $pdo->query(
            "SELECT account_id AS id, account_name AS account, account_type AS type,
                    bank_name, account_no, balance,
                    COALESCE(description,'') AS description
             FROM cash_bank ORDER BY account_id"
        )->fetchAll(),
        'expenses' => $pdo->query(
            "SELECT expense_id AS id, expense_category AS category,
                    COALESCE(description,'') AS vendor, expense_date AS date,
                    amount, status
             FROM expenses ORDER BY expense_id DESC"
        )->fetchAll(),
        'transactions' => $pdo->query(
            "SELECT transaction_id AS id, transaction_date AS date,
                    reference_no AS reference,
                    COALESCE(transaction_type,'Finance') AS source,
                    COALESCE(description,'') AS description,
                    amount, status
             FROM financial_transactions ORDER BY transaction_id DESC"
        )->fetchAll(),
        'settings' => $pdo->query("SELECT * FROM settings LIMIT 1")->fetch() ?: [],
    ];
}

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// ---------- SESSION ----------
if ($action === 'session' && $method === 'GET') {
    respond(['ok' => true, 'user' => currentUser()]);
}

// ---------- LOGIN ----------
if ($action === 'login' && $method === 'POST') {
    $b = requestBody();
    $id = trim((string)($b['identifier'] ?? ''));
    $pw = (string)($b['password'] ?? '');
    $stmt = db()->prepare('SELECT * FROM accounts WHERE username=? OR email=? LIMIT 1');
    $stmt->execute([$id, $id]);
    $user = $stmt->fetch();
    if (!$user) respond(['ok' => false, 'code' => 'account_not_found', 'message' => 'Account not found.'], 422);
    if (!password_verify($pw, $user['password'])) {
        respond(['ok' => false, 'code' => 'invalid_password', 'message' => 'Incorrect password.'], 422);
    }
    $status = $user['status'] ?? 'Active';
    if ($status !== 'Active') {
        respond(['ok' => false, 'code' => 'pending_approval',
                 'message' => 'Your account is awaiting approval.'], 403);
    }
    $_SESSION['user'] = [
        'id'         => (string)$user['account_id'],
        'employeeId' => (string)$user['employee_id'],
        'username'   => $user['username'],
        'email'      => $user['email'] ?? $user['username'],
        'fullName'   => $user['full_name'] ?? $user['username'],
        'department' => $user['department'] ?? '',
        'position'   => $user['position'] ?? '',
        'role'       => $user['role'] ?? '',
        'status'     => $status,
        'phone'      => $user['phone'] ?? '',
    ];
    audit((int)$user['account_id'], $_SESSION['user']['email'], $_SESSION['user']['role'], 'login', 'auth');
    respond(['ok' => true, 'user' => $_SESSION['user']]);
}

// ---------- LOGOUT ----------
if ($action === 'logout' && $method === 'POST') {
    $u = currentUser();
    if ($u) audit((int)$u['id'], $u['email'], $u['role'], 'logout', 'auth');
    $_SESSION = [];
    session_destroy();
    respond(['ok' => true]);
}

// ---------- PROFILE ----------
if ($action === 'profile' && $method === 'POST') {
    $u = requireUser();
    $b = requestBody();
    $fullName = trim((string)($b['fullName'] ?? ''));
    $email    = strtolower(trim((string)($b['email'] ?? '')));
    $phone    = trim((string)($b['phone'] ?? ''));
    if ($fullName === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        respond(['ok' => false, 'message' => 'Enter a name and valid email.'], 422);
    }
    db()->prepare('UPDATE accounts SET full_name=?, email=?, username=?, phone=? WHERE account_id=?')
        ->execute([$fullName, $email, $email, $phone, (int)$u['id']]);
    $_SESSION['user']['fullName'] = $fullName;
    $_SESSION['user']['email']    = $email;
    $_SESSION['user']['username'] = $email;
    $_SESSION['user']['phone']    = $phone;
    audit((int)$u['id'], $email, $u['role'], 'profile_update', 'account', (int)$u['id']);
    respond(['ok' => true, 'user' => $_SESSION['user']]);
}

// ---------- PASSWORD ----------
if ($action === 'password' && $method === 'POST') {
    $u = requireUser();
    $b = requestBody();
    $cur = (string)($b['current'] ?? '');
    $new = (string)($b['next'] ?? '');
    if (strlen($new) < 8) respond(['ok' => false, 'message' => 'New password too short.'], 422);
    $row = db()->prepare('SELECT password FROM accounts WHERE account_id=?');
    $row->execute([(int)$u['id']]);
    $acc = $row->fetch();
    if (!$acc || !password_verify($cur, $acc['password'])) {
        respond(['ok' => false, 'message' => 'Current password is incorrect.'], 422);
    }
    db()->prepare('UPDATE accounts SET password=? WHERE account_id=?')
        ->execute([password_hash($new, PASSWORD_DEFAULT), (int)$u['id']]);
    audit((int)$u['id'], $u['email'], $u['role'], 'password_update', 'account', (int)$u['id']);
    respond(['ok' => true, 'message' => 'Password updated successfully.']);
}

// ---------- STATE ----------
if ($action === 'state' && $method === 'GET') {
    requireUser();
    respond(['ok' => true, 'state' => loadState()]);
}

if ($action === 'state' && $method === 'POST') {
    $u = requireUser();
    if (!isFinanceAdmin($u) && !isHrAdmin($u)) {
        respond(['ok' => false, 'message' => 'Your role cannot modify finance records.'], 403);
    }
    $state = requestBody()['state'] ?? null;
    if (!is_array($state)) respond(['ok' => false, 'message' => 'Invalid state.'], 422);

    $pdo = db();
    $pdo->beginTransaction();
    try {
        if (array_key_exists('expenses', $state) && !empty($state['expenses'])) {
            $pdo->exec('DELETE FROM expenses');
            $ins = $pdo->prepare(
                'INSERT INTO expenses (expense_category, amount, expense_date, description, status)
                 VALUES (?, ?, ?, ?, ?)'
            );
            foreach ($state['expenses'] as $e) {
                $ins->execute([
                    $e['category'] ?? '',
                    (float)($e['amount'] ?? 0),
                    $e['date'] ?? date('Y-m-d'),
                    $e['vendor'] ?? '',
                    $e['status'] ?? 'Pending',
                ]);
            }
        }
        if (array_key_exists('transactions', $state) && !empty($state['transactions'])) {
            $pdo->exec('DELETE FROM financial_transactions');
            $ins = $pdo->prepare(
                'INSERT INTO financial_transactions
                 (transaction_type, amount, transaction_date, reference_no, status, description)
                 VALUES (?, ?, ?, ?, ?, ?)'
            );
            foreach ($state['transactions'] as $t) {
                $ins->execute([
                    $t['source'] ?? 'Finance',
                    (float)($t['amount'] ?? 0),
                    $t['date'] ?? date('Y-m-d'),
                    $t['reference'] ?? '',
                    $t['status'] ?? 'Pending',
                    $t['description'] ?? '',
                ]);
            }
        }

        // ---------- RECEIVABLES ----------
        if (array_key_exists('receivables', $state) && !empty($state['receivables'])) {
            $pdo->exec('DELETE FROM accounts_receivable');
            $ins = $pdo->prepare(
                'INSERT INTO accounts_receivable (customer_id, invoice_no, amount, due_date, status)
                 VALUES (?, ?, ?, ?, ?)'
            );
            $selCust = $pdo->prepare('SELECT customer_id FROM customers WHERE customer_name = ? LIMIT 1');
            $newCust = $pdo->prepare('INSERT INTO customers (customer_name) VALUES (?)');
            foreach ($state['receivables'] as $r) {
                $custName = trim((string)($r['customer'] ?? ''));
                $custId   = 0;
                if ($custName !== '') {
                    $selCust->execute([$custName]);
                    $custId = (int)($selCust->fetchColumn() ?: 0);
                    if ($custId === 0) {
                        $newCust->execute([$custName]);
                        $custId = (int)$pdo->lastInsertId();
                    }
                }
                $ins->execute([
                    $custId,
                    $r['invoice'] ?? '',
                    (float)($r['amount'] ?? 0),
                    $r['due'] ?? date('Y-m-d'),
                    $r['status'] ?? 'Open',
                ]);
            }
        }

        // ---------- PAYABLES ----------
        if (array_key_exists('payables', $state) && !empty($state['payables'])) {
            $pdo->exec('DELETE FROM accounts_payable');
            $ins = $pdo->prepare(
                'INSERT INTO accounts_payable (supplier_id, invoice_no, amount, due_date, status)
                 VALUES (?, ?, ?, ?, ?)'
            );
            $selSup = $pdo->prepare('SELECT supplier_id FROM suppliers WHERE supplier_name = ? LIMIT 1');
            $newSup = $pdo->prepare('INSERT INTO suppliers (supplier_name) VALUES (?)');
            foreach ($state['payables'] as $p) {
                $vendorName = trim((string)($p['vendor'] ?? ''));
                $supId      = 0;
                if ($vendorName !== '') {
                    $selSup->execute([$vendorName]);
                    $supId = (int)($selSup->fetchColumn() ?: 0);
                    if ($supId === 0) {
                        $newSup->execute([$vendorName]);
                        $supId = (int)$pdo->lastInsertId();
                    }
                }
                $ins->execute([
                    $supId,
                    $p['invoice'] ?? '',
                    (float)($p['amount'] ?? 0),
                    $p['due'] ?? date('Y-m-d'),
                    $p['status'] ?? 'Pending',
                ]);
            }
        }

        // ---------- CASH / BANK ----------
        if (array_key_exists('cashBank', $state) && !empty($state['cashBank'])) {
            $pdo->exec('DELETE FROM cash_bank');
            $ins = $pdo->prepare(
                'INSERT INTO cash_bank (account_name, account_type, bank_name, account_no, balance, description)
                 VALUES (?, ?, ?, ?, ?, ?)'
            );
            foreach ($state['cashBank'] as $c) {
                $ins->execute([
                    $c['account']     ?? '',
                    $c['type']        ?? 'Cash',
                    $c['bank_name']   ?? null,
                    $c['account_no']  ?? null,
                    (float)($c['balance'] ?? 0),
                    $c['description'] ?? '',
                ]);
            }
        }

        // NOTE: charts_of_accounts is intentionally NOT rewritten here, because
        // financial_transactions.account_id references it and a delete/re-insert
        // would orphan those transactions. Manage it via a dedicated endpoint instead.

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        respond(['ok' => false, 'message' => 'Save failed: ' . $e->getMessage()], 500);
    }
    audit((int)$u['id'], $u['email'], $u['role'], 'save', 'store', null, 'Updated finance data');
    respond(['ok' => true]);
}

// ---------- AUDIT ----------
if ($action === 'audit' && $method === 'GET') {
    $u = requireUser();
    if (!isHrAdmin($u) && !isFinanceAdmin($u)) {
        respond(['ok' => false, 'message' => 'Forbidden.'], 403);
    }
    $rows = db()->query(
        'SELECT log_id AS id, timestamp AS at, action, module AS entity,
                record_id AS entityId, description AS details, new_value AS actor
         FROM audit_trail ORDER BY log_id DESC LIMIT 500'
    )->fetchAll();
    respond(['ok' => true, 'events' => $rows]);
}

// ---------- EXPORT ----------
if ($action === 'export' && $method === 'GET') {
    $u = requireUser();
    if (!isHrAdmin($u) && !isFinanceAdmin($u)) {
        respond(['ok' => false, 'message' => 'Forbidden.'], 403);
    }
    $entity = $_GET['entity'] ?? 'accounts';
    $state  = loadState();
    $rows   = $state[$entity] ?? [];
    if (!is_array($rows)) respond(['ok' => false, 'message' => 'Unknown export.'], 404);

    $filename = preg_replace('/[^a-z0-9_-]/i', '-', $entity) . '-' . date('Y-m-d') . '.csv';
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    $out = fopen('php://output', 'wb');
    if ($rows) {
        fputcsv($out, array_keys($rows[0]));
        foreach ($rows as $r) fputcsv($out, array_values($r));
    }
    fclose($out);
    exit;
}

// ---------- PAGE ACCESS ----------
if ($action === 'access.get' && $method === 'GET') {
    $u = requireUser();
    $targetId = (int)($_GET['userId'] ?? $u['id']);
    if (!isHrAdmin($u) && $targetId !== (int)$u['id']) {
        respond(['ok' => false, 'message' => 'Forbidden.'], 403);
    }
    $stmt = db()->prepare('SELECT page_key, allowed FROM page_access WHERE user_id = ?');
    $stmt->execute([$targetId]);
    $access = [];
    foreach ($stmt->fetchAll() as $r) $access[$r['page_key']] = (bool)$r['allowed'];
    respond(['ok' => true, 'userId' => (string)$targetId, 'access' => $access]);
}

respond(['ok' => false, 'message' => 'Unknown action.'], 404);