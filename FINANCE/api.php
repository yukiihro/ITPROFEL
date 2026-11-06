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
                    CASE WHEN coa.account_type IN ('Liability','Equity','Income','Revenue')
                         THEN 'Credit' ELSE 'Debit' END AS normalBalance,
                    COALESCE(coa.opening_balance, 0)
                    + CASE WHEN coa.account_type IN ('Liability','Equity','Income','Revenue')
                           THEN COALESCE((SELECT SUM(ft.amount) FROM financial_transactions ft
                                           WHERE ft.account_id = coa.account_id
                                             AND COALESCE(ft.transaction_type,'') = 'Sales'), 0)
                              - COALESCE((SELECT SUM(ft.amount) FROM financial_transactions ft
                                           WHERE ft.account_id = coa.account_id
                                             AND COALESCE(ft.transaction_type,'') <> 'Sales'), 0)
                           ELSE COALESCE((SELECT SUM(ft.amount) FROM financial_transactions ft
                                           WHERE ft.account_id = coa.account_id
                                             AND COALESCE(ft.transaction_type,'') <> 'Sales'), 0)
                              - COALESCE((SELECT SUM(ft.amount) FROM financial_transactions ft
                                           WHERE ft.account_id = coa.account_id
                                             AND COALESCE(ft.transaction_type,'') = 'Sales'), 0)
                      END
                    + CASE WHEN coa.account_id = (SELECT MIN(c2.account_id) FROM charts_of_accounts c2
                                                   WHERE c2.account_type IN ('Income','Revenue'))
                           THEN COALESCE((SELECT SUM(ft.amount) FROM financial_transactions ft
                                           WHERE ft.account_id IS NULL
                                             AND COALESCE(ft.transaction_type,'') = 'Sales'), 0)
                           ELSE 0 END
                    + CASE WHEN coa.account_id = (SELECT MIN(c3.account_id) FROM charts_of_accounts c3
                                                   WHERE c3.account_type = 'Expense')
                           THEN COALESCE((SELECT SUM(ft.amount) FROM financial_transactions ft
                                           WHERE ft.account_id IS NULL
                                             AND COALESCE(ft.transaction_type,'') <> 'Sales'), 0)
                           ELSE 0 END AS balance,
                    coa.status, coa.description
             FROM charts_of_accounts coa ORDER BY coa.account_code"
        )->fetchAll(),
        'receivables' => $pdo->query(
            "SELECT ar.ar_id AS id, COALESCE(c.customer_name, '') AS customer,
                    ar.invoice_no AS invoice, ar.due_date AS due,
                    ar.amount,
                    CASE WHEN COALESCE(ar.status,'') <> 'Paid'
                              AND ar.due_date IS NOT NULL AND ar.due_date < CURDATE()
                         THEN 'Overdue' ELSE ar.status END AS status
             FROM accounts_receivable ar
             LEFT JOIN customers c ON c.customer_id = ar.customer_id
             ORDER BY ar.ar_id DESC"
        )->fetchAll(),
        'payables' => $pdo->query(
            "SELECT ap.ap_id AS id, COALESCE(s.supplier_name, '') AS vendor,
                    ap.invoice_no AS invoice, ap.due_date AS due,
                    ap.amount, ap.payment_id AS paymentId,
                    CASE WHEN COALESCE(ap.status,'') <> 'Paid'
                              AND ap.due_date IS NOT NULL AND ap.due_date < CURDATE()
                         THEN 'Overdue' ELSE ap.status END AS status
             FROM accounts_payable ap
             LEFT JOIN suppliers s ON s.supplier_id = ap.supplier_id
             ORDER BY ap.ap_id DESC"
        )->fetchAll(),
        'cashBank' => $pdo->query(
            "SELECT account_id AS id, account_name AS account, account_type AS type,
                    bank_name, account_no, balance,
                    statement_balance AS statementBalance,
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
            "SELECT ft.transaction_id AS id, ft.transaction_date AS date,
                    ft.reference_no AS reference,
                    COALESCE(ft.transaction_type,'Finance') AS source,
                    COALESCE(ft.description,'') AS description,
                    ft.amount, ft.status,
                    (SELECT c.account_code FROM charts_of_accounts c
                      WHERE c.account_id = ft.account_id LIMIT 1) AS accountCode
             FROM financial_transactions ft ORDER BY ft.transaction_id DESC"
        )->fetchAll(),
        'payments' => $pdo->query(
            "SELECT pt.transaction_id AS id, pt.reference_no AS reference,
                    pt.transaction_date AS date, pt.amount, pt.status,
                    COALESCE(pt.payment_type, 'Payment') AS method,
                    COALESCE(pt.description, '') AS description,
                    COALESCE(cb.account_name, '') AS account
             FROM payment_transactions pt
             LEFT JOIN cash_bank cb ON cb.account_id = pt.account_id
             ORDER BY pt.transaction_id DESC"
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
                 (transaction_type, amount, transaction_date, reference_no, status, description, account_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?)'
            );
            $acctLookUp = $pdo->prepare('SELECT account_id FROM charts_of_accounts WHERE account_code = ? LIMIT 1');
            $accountCache = [];
            foreach ($state['transactions'] as $t) {
                $accountCode = trim((string)($t['accountCode'] ?? ''));
                $accountId = null;
                if ($accountCode !== '') {
                    if (array_key_exists($accountCode, $accountCache)) {
                        $accountId = $accountCache[$accountCode];
                    } else {
                        $acctLookUp->execute([$accountCode]);
                        $accountId = $acctLookUp->fetchColumn() ?: null;
                        $accountCache[$accountCode] = $accountId;
                    }
                }
                $ins->execute([
                    $t['source'] ?? 'Finance',
                    (float)($t['amount'] ?? 0),
                    $t['date'] ?? date('Y-m-d'),
                    $t['reference'] ?? '',
                    $t['status'] ?? 'Pending',
                    $t['description'] ?? '',
                    $accountId,
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
                'INSERT INTO cash_bank (account_name, account_type, bank_name, account_no, balance, statement_balance, description)
                 VALUES (?, ?, ?, ?, ?, ?, ?)'
            );
            foreach ($state['cashBank'] as $c) {
                $stmtBal = $c['statementBalance'] ?? null;
                $ins->execute([
                    $c['account']     ?? '',
                    $c['type']        ?? 'Cash',
                    $c['bank_name']   ?? null,
                    $c['account_no']  ?? null,
                    (float)($c['balance'] ?? 0),
                    ($stmtBal === null || $stmtBal === '') ? null : (float)$stmtBal,
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
    // Removed the audit() call here so background state saves don't spam the notification bell.
    respond(['ok' => true]);
}

// ---------- AUDIT ----------
if ($action === 'audit' && $method === 'GET') {
    $u = requireUser();
    if (!isHrAdmin($u) && !isFinanceAdmin($u)) {
        respond(['ok' => false, 'message' => 'Forbidden.'], 403);
    }
    $rows = db()->query(
        "SELECT at.log_id AS id, at.timestamp AS at, at.action, at.module AS entity,
                at.record_id AS entityId, at.description AS details, at.new_value AS actor
         FROM audit_trail at
         JOIN accounts a ON a.account_id = at.user_id
         WHERE LOWER(COALESCE(a.department, '')) = 'finance'
           AND (at.module = 'auth'
                OR (at.module = 'account' AND at.action IN ('profile_update','password_update','save','update','delete','export')))
         ORDER BY at.log_id DESC LIMIT 500"
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
    $format = $_GET['format'] ?? 'csv'; // Read the format
    $state  = loadState();
    $rows   = $state[$entity] ?? [];
    if (!is_array($rows)) respond(['ok' => false, 'message' => 'Unknown export.'], 404);

    $baseFilename = preg_replace('/[^a-z0-9_-]/i', '-', $entity) . '-' . date('Y-m-d');

    // --- PDF EXPORT (HTML Print Layout) ---
    if ($format === 'pdf') {
        header('Content-Type: text/html; charset=utf-8');
        echo "<!DOCTYPE html><html><head><title>Export</title><style>
            body { font-family: sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th { background: #c2181a; color: #fff; text-align: left; padding: 8px; }
            td { padding: 8px; border-bottom: 1px solid #ddd; }
            tr:nth-child(even) { background: #fcf5f5; }
            @media print { body { padding: 0; } }
        </style></head><body onload='window.print()'>";
        echo "<h2>" . ucfirst($entity) . " Report</h2>";
        echo "<p>Generated on " . date('Y-m-d H:i:s') . "</p>";
        echo "<table><thead><tr>";
        if ($rows) {
            foreach (array_keys($rows[0]) as $key) echo "<th>" . htmlspecialchars(ucfirst($key)) . "</th>";
            echo "</tr></thead><tbody>";
            foreach ($rows as $r) {
                echo "<tr>";
                foreach ($r as $val) echo "<td>" . htmlspecialchars((string)$val) . "</td>";
                echo "</tr>";
            }
        }
        echo "</tbody></table></body></html>";
        exit;
    }

    // --- CSV EXPORT (Default) ---
    $filename = $baseFilename . '.csv';
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

// ---------- SAVE NEW ACCOUNT ----------
if ($action === 'account.save' && $method === 'POST') {
    $u = requireUser();
    if (!isFinanceAdmin($u) && !isHrAdmin($u)) {
        respond(['ok' => false, 'message' => 'Your role cannot modify accounts.'], 403);
    }
    $b = requestBody();
    $code = trim((string)($b['code'] ?? ''));
    $name = trim((string)($b['name'] ?? ''));
    $type = trim((string)($b['type'] ?? ''));
    $normal = trim((string)($b['normalBalance'] ?? 'Debit'));

    if ($code === '' || $name === '' || $type === '') {
        respond(['ok' => false, 'message' => 'Missing required fields.'], 422);
    }

    $pdo = db();
    try {
        $check = $pdo->prepare('SELECT account_id FROM charts_of_accounts WHERE account_code = ? LIMIT 1');
        $check->execute([$code]);
        if ($check->fetch()) {
            respond(['ok' => false, 'message' => 'Account code already exists.'], 409);
        }

        $stmt = $pdo->prepare('INSERT INTO charts_of_accounts (account_code, account_name, account_type, normal_balance, opening_balance, status) VALUES (?, ?, ?, ?, ?, "Active")');
        $stmt->execute([$code, $name, $type, $normal, (float)($b['balance'] ?? $b['openingBalance'] ?? 0)]);
        
        // THIS IS THE KEY: Log it to the audit trail so notifications can see it
        audit((int)$u['id'], $u['email'], $u['role'], 'save', 'account', (int)$pdo->lastInsertId(), 'Created account: ' . $name . ' (' . $code . ')');
        
        respond(['ok' => true, 'message' => 'Account created successfully.']);
    } catch (Throwable $e) {
        respond(['ok' => false, 'message' => 'Failed to create account: ' . $e->getMessage()], 500);
    }
}

// ---------- FETCH REAL NOTIFICATIONS ----------
if ($action === 'notifications' && $method === 'GET') {
    $u = requireUser();
    $pdo = db();

    // Exclude background 'store' syncs from notifications
    $stmt = $pdo->prepare("
        SELECT at.log_id AS id, at.timestamp AS at, at.action, at.module, at.description, at.new_value AS actor
        FROM audit_trail at
        JOIN accounts a ON a.account_id = at.user_id
        WHERE LOWER(COALESCE(a.department, '')) = 'finance'
          AND (at.module = 'auth'
               OR (at.module = 'account' AND at.action IN ('profile_update','password_update','save','update','delete','export')))
        ORDER BY at.log_id DESC LIMIT 20
    ");
    $stmt->execute();
    $logs = $stmt->fetchAll();

    // Which of these has this user already read?
       // Which of these has this user already read?
    $ids = array_map(fn($r) => (int)$r['id'], $logs);
    $readIds = [];
    if ($ids) {
        $ph = implode(',', array_fill(0, count($ids), '?'));
        $readStmt = $pdo->prepare("SELECT log_id FROM notification_reads WHERE account_id = ? AND log_id IN ($ph)");
        $readStmt->execute(array_merge([(int)$u['id']], $ids));
        $readIds = array_map('intval', $readStmt->fetchAll(PDO::FETCH_COLUMN));
    }
    $readSet = array_flip($readIds);

    $notifications = [];
    foreach ($logs as $log) {
        $actorParts = explode('|', (string)$log['actor']);
        $email = $actorParts[0] ?? 'System';

        $icon = '🔔';
        $color = 'blue';
        $title = ucfirst((string)$log['action']) . ' Action - ' . ($log['module'] ?: 'System');

        if ($log['action'] === 'save' && $log['module'] === 'account') {
            $icon = '👤'; $color = 'blue';
            $title = 'New Account Created';
        } elseif ($log['action'] === 'update' && $log['module'] === 'account') {
            $icon = '✏️'; $color = 'orange';
            $title = 'Account Updated';
        } elseif ($log['action'] === 'delete' && $log['module'] === 'account') {
            $icon = '🗑️'; $color = 'red';
            $title = 'Account Deleted';
        } elseif ($log['action'] === 'login') {
            $icon = '🔓'; $color = 'green';
            $title = 'Login';
        } elseif ($log['action'] === 'logout') {
            $icon = '🔒'; $color = 'grey';
            $title = 'Logout';
        } elseif ($log['action'] === 'export') {
            $icon = '📄'; $color = 'red';
            $title = 'Export Generated';
        }

        $notifications[] = [
            'id'     => 'n-' . $log['id'],
            'logId'  => (int)$log['id'],
            'title'  => $title,
            'desc'   => $log['description'] ?: "User {$email} performed {$log['action']}",
            'time'   => date('M d, H:i', strtotime($log['at'])),
            'icon'   => $icon,
            'color'  => $color,
            'unread' => !isset($readSet[(int)$log['id']]),
        ];
    }

    respond(['ok' => true, 'notifications' => $notifications]);
}

// ---------- MARK NOTIFICATIONS READ ----------
if ($action === 'notifications.markRead' && $method === 'POST') {
    $u = requireUser();
    $b = requestBody();
    $logIds = $b['ids'] ?? [];
    if (!is_array($logIds)) respond(['ok' => false, 'message' => 'Invalid payload.'], 422);
    $pdo = db();

    if (empty($logIds)) {
        // "Mark all read" → insert for every unread audit row this user hasn't marked yet
        $pdo->prepare('
            INSERT IGNORE INTO notification_reads (account_id, log_id)
            SELECT ?, log_id FROM audit_trail
        ')->execute([(int)$u['id']]);
    } else {
        $ins = $pdo->prepare('INSERT IGNORE INTO notification_reads (account_id, log_id) VALUES (?, ?)');
        foreach ($logIds as $lid) {
            $lid = (int)$lid;
            if ($lid > 0) $ins->execute([(int)$u['id'], $lid]);
        }
    }
    respond(['ok' => true]);
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

// ---------- UPDATE ACCOUNT ----------
if ($action === 'account.update' && $method === 'POST') {
    $u = requireUser();
    if (!isFinanceAdmin($u) && !isHrAdmin($u)) {
        respond(['ok' => false, 'message' => 'Your role cannot modify accounts.'], 403);
    }
    $b = requestBody();
    $code = trim((string)($b['code'] ?? ''));
    $name = trim((string)($b['name'] ?? ''));
    $type = trim((string)($b['type'] ?? ''));
    $normal = trim((string)($b['normalBalance'] ?? 'Debit'));
    if ($code === '' || $name === '' || $type === '') {
        respond(['ok' => false, 'message' => 'Missing required fields.'], 422);
    }
    $pdo = db();
    try {
        $stmt = $pdo->prepare('UPDATE charts_of_accounts SET account_name=?, account_type=?, normal_balance=?, description=?, opening_balance=? WHERE account_code=?');
        $stmt->execute([$name, $type, $normal, (string)($b['description'] ?? ''), (float)($b['balance'] ?? $b['openingBalance'] ?? 0), $code]);
        $stmtBal = $stmt->rowCount();
        if ($stmtBal === 0) {
            // rowCount is 0 if no fields changed OR code not found — verify existence
            $chk = $pdo->prepare('SELECT account_id FROM charts_of_accounts WHERE account_code = ? LIMIT 1');
            $chk->execute([$code]);
            if (!$chk->fetch()) respond(['ok' => false, 'message' => 'Account not found.'], 404);
        }
        audit((int)$u['id'], $u['email'], $u['role'], 'update', 'account', null, 'Updated account: ' . $name . ' (' . $code . ')');
        respond(['ok' => true, 'message' => 'Account updated successfully.']);
    } catch (Throwable $e) {
        respond(['ok' => false, 'message' => 'Failed to update account: ' . $e->getMessage()], 500);
    }
}

// ---------- DELETE ACCOUNT ----------
if ($action === 'account.delete' && $method === 'POST') {
    $u = requireUser();
    if (!isFinanceAdmin($u) && !isHrAdmin($u)) {
        respond(['ok' => false, 'message' => 'Your role cannot modify accounts.'], 403);
    }
    $b = requestBody();
    $code = trim((string)($b['code'] ?? ''));
    if ($code === '') respond(['ok' => false, 'message' => 'Account code required.'], 422);
    $pdo = db();
    try {
        $chk = $pdo->prepare('SELECT account_id FROM charts_of_accounts WHERE account_code = ? LIMIT 1');
        $chk->execute([$code]);
        $acc = $chk->fetch();
        if (!$acc) respond(['ok' => false, 'message' => 'Account not found.'], 404);
        // Guard: don't orphan transactions
        $tx = $pdo->prepare('SELECT COUNT(*) FROM financial_transactions WHERE account_id = ?');
        $tx->execute([(int)$acc['account_id']]);
        if ((int)$tx->fetchColumn() > 0) {
            respond(['ok' => false, 'message' => 'Cannot delete: transactions reference this account. Deactivate it instead.'], 409);
        }
        $del = $pdo->prepare('DELETE FROM charts_of_accounts WHERE account_id = ?');
        $del->execute([(int)$acc['account_id']]);
        audit((int)$u['id'], $u['email'], $u['role'], 'delete', 'account', (int)$acc['account_id'], 'Deleted account: ' . $code);
        respond(['ok' => true, 'message' => 'Account deleted successfully.']);
    } catch (Throwable $e) {
        respond(['ok' => false, 'message' => 'Failed to delete account: ' . $e->getMessage()], 500);
    }
}

respond(['ok' => false, 'message' => 'Unknown action.'], 404);
