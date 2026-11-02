<?php
// test/HR/api.php
declare(strict_types=1);

require_once dirname(__DIR__) . '/db.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');

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
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function currentUser(): ?array
{
    return $_SESSION['user'] ?? null;
}

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
    if ($role === 'administrator') return true;
    if ($dept === 'hr' && ($role === 'hr admin' || $role === 'hr manager' || $pos === 'admin')) return true;
    return false;
}

/**
 * Departments are stored as INT (FK to departments.department_id).
 * Match string names to IDs per the seed data in the SQL:
 *   1 = Finance
 *   2 = Human Resources
 *   3 = Administration
 *   4 = Information Technology
 *
 * The app sends 'HR' and 'Finance' strings from the frontend.
 */
function departmentIdFromLabel(string $label): int
{
    $norm = strtolower(trim($label));
    if ($norm === 'hr' || $norm === 'human resources' || $norm === 'human resource') return 2;
    if ($norm === 'finance' || $norm === 'fin') return 1;
    if ($norm === 'administration' || $norm === 'admin') return 3;
    if ($norm === 'it' || $norm === 'information technology') return 4;
    if ($norm === 'procurement') return 5;
    // Default to HR
    return 2;
}

function departmentLabelFromId(int $id): string
{
    return match ($id) {
        1 => 'Finance',
        2 => 'HR',
        3 => 'Administration',
        4 => 'Information Technology',
        5 => 'Procurement',          // NEW
        default => 'HR',
    };
}

/**
 * audit() now REQUIRES a non-null int userId because your SQL defines
 * audit_trail.user_id as NOT NULL with a FK to accounts.
 * If no user is available (e.g. during register), we pass the newly-created
 * account's ID; if even that's unavailable, we skip the audit.
 */
function audit(int $userId, string $userEmail, string $role, string $action,
               string $module = '', ?int $recordId = null, string $details = ''): void
{
    if ($userId <= 0) return; // safety: FK requires a real user_id
    try {
        $stmt = db()->prepare(
            'INSERT INTO audit_trail (user_id, action, module, record_id, description, new_value)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([$userId, $action, $module, $recordId, $details, $userEmail . '|' . $role]);
    } catch (Throwable $e) {
        error_log('audit failed: ' . $e->getMessage());
    }
}

/**
 * Load the full app state assembled from multiple MySQL tables.
 * Because charts_of_accounts has no `balance` column, we compute it
 * from financial_transactions (debit = +, credit = −, typical asset view).
 */
function loadState(): array
{
    $pdo = db();

    // Employees — map INT department back to a string label
    $employees = $pdo->query(
        "SELECT CAST(e.employee_id AS CHAR) AS id,
                e.name,
                e.email,
                e.position AS position,
                COALESCE(e.department_label,
                         CASE e.department
                             WHEN 1 THEN 'Finance'
                             WHEN 2 THEN 'HR'
                             WHEN 3 THEN 'Administration'
                             WHEN 4 THEN 'Information Technology'
                             ELSE ''
                         END) AS dept,
                e.contact_info AS phone,
                e.basic_salary AS salary,
                e.employment_status AS status,
                COALESCE(e.date_hired, e.hire_date) AS joined
         FROM employees e
         ORDER BY e.employee_id"
    )->fetchAll();

    // Attendance
    $attendance = $pdo->query(
        "SELECT a.attendance_id AS id,
                CAST(a.employee_id AS CHAR) AS empId,
                e.name AS employeeName,
                a.attendance_date AS date,
                TIME_FORMAT(a.time_in,'%H:%i')  AS timeIn,
                TIME_FORMAT(a.time_out,'%H:%i') AS timeOut,
                a.status
         FROM attendance a
         LEFT JOIN employees e ON e.employee_id = a.employee_id
         ORDER BY a.attendance_date DESC, a.attendance_id DESC"
    )->fetchAll();

    // Leaves
    $leaves = $pdo->query(
        "SELECT l.leave_id AS id,
                CAST(l.employee_id AS CHAR) AS empId,
                e.name AS employeeName,
                l.leave_type AS type,
                l.start_date AS `from`,
                l.end_date   AS `to`,
                l.reason,
                l.status
         FROM leave_requests l
         LEFT JOIN employees e ON e.employee_id = l.employee_id
         ORDER BY l.leave_id DESC"
    )->fetchAll();

    // Payroll
    $payroll = $pdo->query(
        "SELECT p.payroll_id AS id,
                CAST(p.employee_id AS CHAR) AS empId,
                p.payroll_period AS cycle,
                p.gross_salary AS gross,
                p.deductions,
                p.status
         FROM payroll p
         ORDER BY p.payroll_id DESC"
    )->fetchAll();

    // Deductions — payroll_deductions joined to payroll for period/empid
    $deductions = $pdo->query(
        "SELECT d.deduction_id AS id,
                CAST(p.employee_id AS CHAR) AS empId,
                d.deduction_type AS type,
                d.amount,
                p.payroll_period AS period,
                'Applied' AS status
         FROM payroll_deductions d
         LEFT JOIN payroll p ON p.payroll_id = d.payroll_id
         ORDER BY d.deduction_id DESC"
    )->fetchAll();

    // Chart of Accounts — compute balance from financial_transactions
    // For each account_code, sum debits − credits (asset view).
    $accounts = $pdo->query(
        "SELECT coa.account_code AS code,
                coa.account_name AS name,
                coa.account_type AS type,
                COALESCE(coa.normal_balance,'Debit') AS normalBalance,
                COALESCE((
                    SELECT SUM(ft.amount)
                    FROM financial_transactions ft
                    WHERE ft.account_id = coa.account_id
                      AND ft.transaction_type = 'Debit'
                ), 0) -
                COALESCE((
                    SELECT SUM(ft.amount)
                    FROM financial_transactions ft
                    WHERE ft.account_id = coa.account_id
                      AND ft.transaction_type = 'Credit'
                ), 0) AS balance,
                coa.status,
                coa.description
         FROM charts_of_accounts coa
         ORDER BY coa.account_code"
    )->fetchAll();

    // Receivables
    $receivables = $pdo->query(
        "SELECT ar.ar_id AS id,
                COALESCE(c.customer_name, '') AS customer,
                ar.invoice_no AS invoice,
                ar.due_date AS due,
                ar.amount, ar.status
         FROM accounts_receivable ar
         LEFT JOIN customers c ON c.customer_id = ar.customer_id
         ORDER BY ar.ar_id DESC"
    )->fetchAll();

    // Payables
    $payables = $pdo->query(
        "SELECT ap.ap_id AS id,
                COALESCE(s.supplier_name, '') AS vendor,
                ap.invoice_no AS invoice,
                ap.due_date AS due,
                ap.amount, ap.status
         FROM accounts_payable ap
         LEFT JOIN suppliers s ON s.supplier_id = ap.supplier_id
         ORDER BY ap.ap_id DESC"
    )->fetchAll();

    // Cash / Bank
    $cashBank = $pdo->query(
        "SELECT account_id AS id,
                account_name AS account,
                account_type AS type,
                bank_name,
                account_no,
                balance,
                COALESCE(description,'') AS description
         FROM cash_bank
         ORDER BY account_id"
    )->fetchAll();

    // Expenses
    $expenses = $pdo->query(
        "SELECT e.expense_id AS id,
                e.expense_category AS category,
                COALESCE(e.description,'') AS vendor,
                e.expense_date AS date,
                e.amount,
                e.status
         FROM expenses e
         ORDER BY e.expense_id DESC"
    )->fetchAll();

    // Financial transactions
    $transactions = $pdo->query(
        "SELECT ft.transaction_id AS id,
                ft.transaction_date AS date,
                ft.reference_no AS reference,
                COALESCE(ft.transaction_type,'Finance') AS source,
                COALESCE(ft.description,'') AS description,
                ft.amount,
                ft.status
         FROM financial_transactions ft
         ORDER BY ft.transaction_id DESC"
    )->fetchAll();

    // Settings
    $settings = $pdo->query("SELECT * FROM settings LIMIT 1")->fetch() ?: [
        'company'  => 'D.E.V.S Management Inc.',
        'currency' => 'PHP (₱)',
        'cycle'    => 'September 15–30, 2026',
        'days'     => '5 days (Mon–Fri)',
    ];

    return [
        'employees'    => $employees,
        'attendance'   => $attendance,
        'leaves'       => $leaves,
        'payroll'      => $payroll,
        'deductions'   => $deductions,
        'accounts'     => $accounts,
        'receivables'  => $receivables,
        'payables'     => $payables,
        'cashBank'     => $cashBank,
        'expenses'     => $expenses,
        'transactions' => $transactions,
        'settings'     => $settings,
    ];
}

// ─────────────────────────────────────────────────────────────
// Routing
// ─────────────────────────────────────────────────────────────

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// ---------- SESSION ----------
if ($action === 'session' && $method === 'GET') {
    respond(['ok' => true, 'user' => currentUser()]);
}

// ---------- LOGIN ----------
if ($action === 'login' && $method === 'POST') {
    $body = requestBody();
    $identifier = trim((string)($body['identifier'] ?? ''));
    $password   = (string)($body['password'] ?? '');

    if ($identifier === '' || $password === '') {
        respond(['ok' => false, 'message' => 'Enter your email and password.'], 422);
    }

    $stmt = db()->prepare('SELECT * FROM accounts WHERE username = ? OR email = ? LIMIT 1');
    $stmt->execute([$identifier, $identifier]);
    $user = $stmt->fetch();

    if (!$user) {
        respond(['ok' => false, 'code' => 'account_not_found',
                 'message' => 'Account not found. Please register first.'], 422);
    }
    if (!password_verify($password, $user['password'])) {
        respond(['ok' => false, 'code' => 'invalid_password',
                 'message' => 'Incorrect password.'], 422);
    }
    $status = $user['status'] ?? 'Active';
    if ($status === 'Pending') {
        respond(['ok' => false, 'code' => 'pending_approval',
                 'message' => 'Your account is awaiting approval from an HR Administrator.'], 403);
    }
    if ($status === 'Rejected') {
        respond(['ok' => false, 'code' => 'account_rejected',
                 'message' => 'Your sign-up request was not approved. Contact your HR Administrator.'], 403);
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

// ---------- REGISTER ----------
if ($action === 'register' && $method === 'POST') {
    $b = requestBody();
    $fullName   = trim((string)($b['fullName'] ?? ''));
    $email      = strtolower(trim((string)($b['email'] ?? '')));
    $department = trim((string)($b['department'] ?? ''));   // 'HR' or 'Finance'
    $position   = trim((string)($b['position'] ?? ''));     // 'Admin' or 'Staff'
    $password   = (string)($b['password'] ?? '');
    $confirm    = (string)($b['confirmPassword'] ?? '');

    if ($fullName === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 8) {
        respond(['ok' => false, 'message' => 'Enter a name, valid email, and password of at least 8 characters.'], 422);
    }
if (!in_array($department, ['HR','Finance','Procurement'], true)) {
    respond(['ok' => false, 'message' => 'Please select a valid department.'], 422);
}
    if (!in_array($position, ['Admin','Staff'], true)) {
        respond(['ok' => false, 'message' => 'Please select a valid position.'], 422);
    }
    if ($password !== $confirm) {
        respond(['ok' => false, 'message' => 'Passwords do not match.'], 422);
    }

    $check = db()->prepare('SELECT account_id FROM accounts WHERE email = ? LIMIT 1');
    $check->execute([$email]);
    if ($check->fetch()) {
        respond(['ok' => false, 'message' => 'An account with that email already exists.'], 422);
    }

    $deptId = departmentIdFromLabel($department);   // HR → 2, Finance → 1

    $pdo = db();
    $pdo->beginTransaction();
    try {
        $emp = $pdo->prepare(
            'INSERT INTO employees (name, position, position_label, department, department_label,
                                    contact_info, employment_status, basic_salary, date_hired)
             VALUES (?, ?, ?, ?, ?, "", "Active", 0, CURDATE())'
        );
        $emp->execute([$fullName, $position, $position, $deptId, $department]);
        $empId = (int)$pdo->lastInsertId();

        $role = $department . ' ' . $position;
        $acc = $pdo->prepare(
            'INSERT INTO accounts (employee_id, username, email, full_name, password,
                                   position, department, role, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, "Pending", NOW())'
        );
        $acc->execute([
            $empId, $email, $email, $fullName,
            password_hash($password, PASSWORD_DEFAULT),
            $position, $department, $role
        ]);
        $accId = (int)$pdo->lastInsertId();
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        respond(['ok' => false, 'message' => 'Registration failed: ' . $e->getMessage()], 500);
    }

    // Audit with the newly-created account id (required because FK is NOT NULL)
    audit($accId, $email, $role, 'register', 'account', $accId, $role . ' / Pending');

    respond([
        'ok' => true,
        'message' => 'Registration submitted. An HR Administrator must approve your account before you can sign in.',
        'status' => 'Pending'
    ]);
}

// ---------- LOGOUT ----------
if ($action === 'logout' && $method === 'POST') {
    $u = currentUser();
    if ($u) audit((int)$u['id'], $u['email'], $u['role'], 'logout', 'auth');
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
    }
    $sessionId = session_id();
    session_destroy();
    if ($sessionId !== '') {
        $sessionFile = session_save_path() . DIRECTORY_SEPARATOR . 'sess_' . $sessionId;
        if (is_file($sessionFile)) @unlink($sessionFile);
    }
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
    $conflict = db()->prepare('SELECT account_id FROM accounts WHERE email = ? AND account_id <> ? LIMIT 1');
    $conflict->execute([$email, (int)$u['id']]);
    if ($conflict->fetch()) {
        respond(['ok' => false, 'message' => 'That email is already in use.'], 422);
    }
    $up = db()->prepare('UPDATE accounts SET full_name=?, email=?, username=?, phone=? WHERE account_id=?');
    $up->execute([$fullName, $email, $email, $phone, (int)$u['id']]);

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
    $current = (string)($b['current'] ?? '');
    $next    = (string)($b['next'] ?? '');
    if (strlen($next) < 8) {
        respond(['ok' => false, 'message' => 'New password must be at least 8 characters.'], 422);
    }
    $stmt = db()->prepare('SELECT password FROM accounts WHERE account_id=?');
    $stmt->execute([(int)$u['id']]);
    $row = $stmt->fetch();
    if (!$row || !password_verify($current, $row['password'])) {
        respond(['ok' => false, 'message' => 'Current password is incorrect.'], 422);
    }
    $up = db()->prepare('UPDATE accounts SET password=? WHERE account_id=?');
    $up->execute([password_hash($next, PASSWORD_DEFAULT), (int)$u['id']]);
    audit((int)$u['id'], $u['email'], $u['role'], 'password_update', 'account', (int)$u['id']);
    respond(['ok' => true, 'message' => 'Password updated successfully.']);
}

// ---------- STATE (GET) ----------
if ($action === 'state' && $method === 'GET') {
    $u = requireUser();
    $state = loadState();
    if (!isHrAdmin($u)) {
        // Non-HR-admins should not receive payroll or salary data.
        $state['payroll']    = [];
        $state['deductions'] = [];
        $state['employees']  = array_map(function ($e) {
            $e['salary'] = 0;
            return $e;
        }, $state['employees']);
    }
    respond(['ok' => true, 'state' => $state]);
}

// ---------- STATE (POST) ----------
if ($action === 'state' && $method === 'POST') {
    $u = requireUser();
    if (!isHrAdmin($u)) {
        respond(['ok' => false, 'message' => 'Your role cannot modify HR records.'], 403);
    }
    $state = requestBody()['state'] ?? null;
    if (!is_array($state)) respond(['ok' => false, 'message' => 'Invalid state payload.'], 422);

    // Safety: if the incoming state has empty arrays for destructive sections,
    // drop those keys so we never wipe real data by accident.
    foreach (['employees', 'attendance', 'leaves', 'payroll', 'payroll_deductions'] as $key) {
        if (array_key_exists($key, $state) && is_array($state[$key]) && count($state[$key]) === 0) {
            unset($state[$key]);
        }
    }

    $pdo = db();
    $pdo->beginTransaction();
    try {
        // Order matters because of FKs:
        // payroll_deductions → payroll → employees
        // IMPORTANT: only wipe tables that the client actually sent data for.
        // Otherwise a partial/empty save will nuke real records.
        if (array_key_exists('payroll_deductions', $state)) {
            $pdo->exec('DELETE FROM payroll_deductions');
        }
        if (array_key_exists('payroll', $state)) {
            $pdo->exec('DELETE FROM payroll');
        }
        if (array_key_exists('leaves', $state)) {
            $pdo->exec('DELETE FROM leave_requests');
        }
        if (array_key_exists('attendance', $state)) {
            $pdo->exec('DELETE FROM attendance');
        }
        // Employees: upsert by employee_id, and delete rows whose IDs
        // are no longer present in the incoming payload.
        if (array_key_exists('employees', $state)) {
            $incoming = $state['employees'];

            // Collect numeric IDs the client still wants to keep.
            $keepIds = [];
            foreach ($incoming as $e) {
                $id = (int)($e['id'] ?? 0);
                if ($id > 0) $keepIds[] = $id;
            }
            $keepIds = array_values(array_unique($keepIds));

            // Delete employees (and their linked rows) whose IDs are gone.
            if (!empty($keepIds)) {
                $placeholders = implode(',', array_fill(0, count($keepIds), '?'));

                // 1. Delete child rows first so FKs don't block.
                $childQueries = [
                    "DELETE FROM attendance     WHERE employee_id NOT IN ($placeholders)",
                    "DELETE FROM leave_requests WHERE employee_id NOT IN ($placeholders)",
                    "DELETE FROM payroll_deductions WHERE payroll_id IN (
                        SELECT payroll_id FROM payroll WHERE employee_id NOT IN ($placeholders)
                    )",
                    "DELETE FROM payroll WHERE employee_id NOT IN ($placeholders)",
                    "DELETE FROM accounts WHERE employee_id NOT IN ($placeholders)",
                ];
                foreach ($childQueries as $q) {
                    $pdo->prepare($q)->execute($keepIds);
                }

                // 2. Now the parent rows.
                $pdo->prepare("DELETE FROM employees WHERE employee_id NOT IN ($placeholders)")
                    ->execute($keepIds);
            } else {
                // Client sent employees array but with no valid IDs.
                // Safest thing: don't touch the employee table at all.
                $incoming = [];
            }

            // Upsert remaining employees by ID.
            $upd = $pdo->prepare(
                'UPDATE employees SET name=?, email=?, position=?, position_label=?, department=?, department_label=?,
                                     contact_info=?, employment_status=?, basic_salary=?, date_hired=?
                 WHERE employee_id=?'
            );
            $ins = $pdo->prepare(
                'INSERT INTO employees (name, email, position, position_label, department, department_label,
                                        contact_info, employment_status, basic_salary, date_hired)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            foreach ($incoming as $e) {
                $id        = (int)($e['id'] ?? 0);
                $name      = trim((string)($e['name'] ?? ''));
                if ($name === '') continue;
                $email     = trim((string)($e['email'] ?? ''));
                $deptLabel = (string)($e['dept'] ?? 'HR');
                $deptId    = departmentIdFromLabel($deptLabel);

                if ($id > 0) {
                    $upd->execute([
                        $name,
                        $email,
                        $e['position'] ?? 'Staff',
                        $e['position'] ?? 'Staff',
                        $deptId,
                        $deptLabel,
                        $e['phone'] ?? '',
                        $e['status'] ?? 'Active',
                        (float)($e['salary'] ?? 0),
                        $e['joined'] ?? date('Y-m-d'),
                        $id,
                    ]);
                } else {
                    $ins->execute([
                        $name,
                        $email,
                        $e['position'] ?? 'Staff',
                        $e['position'] ?? 'Staff',
                        $deptId,
                        $deptLabel,
                        $e['phone'] ?? '',
                        $e['status'] ?? 'Active',
                        (float)($e['salary'] ?? 0),
                        $e['joined'] ?? date('Y-m-d'),
                    ]);
                }
            }
        }

        // Attendance
        if (array_key_exists('attendance', $state) && !empty($state['attendance'])) {
            $ins = $pdo->prepare(
                'INSERT INTO attendance (employee_id, attendance_date, time_in, time_out, status)
                 VALUES (?, ?, ?, ?, ?)'
            );
            foreach ($state['attendance'] as $a) {
                $ins->execute([
                    (int)($a['empId'] ?? 0),
                    $a['date'] ?? date('Y-m-d'),
                    $a['timeIn'] ?: null,
                    $a['timeOut'] ?: null,
                    $a['status'] ?? 'Present',
                ]);
            }
        }

        // Leaves
        if (array_key_exists('leaves', $state) && !empty($state['leaves'])) {
            $ins = $pdo->prepare(
                'INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason, status)
                 VALUES (?, ?, ?, ?, ?, ?)'
            );
            foreach ($state['leaves'] as $l) {
                $empId = (int)($l['empId'] ?? 0);
                if ($empId <= 0) {
                    error_log('leaves: skipping row with invalid empId: ' . json_encode($l));
                    continue;
                }
                try {
                    $ins->execute([
                        $empId,
                        $l['type'] ?? 'Vacation Leave',
                        $l['from'] ?? date('Y-m-d'),
                        $l['to']   ?? date('Y-m-d'),
                        $l['reason'] ?? '',
                        $l['status'] ?? 'Pending',
                    ]);
                } catch (Throwable $rowErr) {
                    error_log(sprintf(
                        'leaves: FK violation for empId=%s row=%s err=%s',
                        $empId, json_encode($l), $rowErr->getMessage()
                    ));
                    throw $rowErr;
                }
            }
        }

        // Payroll
        if (array_key_exists('payroll', $state) && !empty($state['payroll'])) {
            $ins = $pdo->prepare(
                'INSERT INTO payroll (employee_id, payroll_period, gross_salary, deductions, net_salary, status)
                 VALUES (?, ?, ?, ?, ?, ?)'
            );
            foreach ($state['payroll'] as $p) {
                $gross = (float)($p['gross'] ?? 0);
                $ded   = (float)($p['deductions'] ?? 0);
                $ins->execute([
                    (int)($p['empId'] ?? 0),
                    $p['cycle'] ?? '',
                    $gross, $ded, $gross - $ded,
                    $p['status'] ?? 'Pending',
                ]);
            }
        }

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        respond(['ok' => false, 'message' => 'Save failed: ' . $e->getMessage()], 500);
    }

    $summary = [];
    if (!empty($state['employees']))  $summary[] = count($state['employees'])  . ' employees';
    if (!empty($state['attendance'])) $summary[] = count($state['attendance']) . ' attendance rows';
    if (!empty($state['leaves']))     $summary[] = count($state['leaves'])     . ' leave rows';
    if (!empty($state['payroll']))    $summary[] = count($state['payroll'])    . ' payroll rows';
    audit((int)$u['id'], $u['email'], $u['role'], 'save', 'store', null,
          'Updated HR data: ' . implode(', ', $summary));
    respond(['ok' => true]);
}

// ---------- USERS ----------
// Returns every employee, whether or not they have a login account.
// Rows without an account have id = '' and status = 'No Account'.
if ($action === 'users' && $method === 'GET') {
    $u = requireUser();
    if (!isHrAdmin($u)) respond(['ok' => false, 'message' => 'Forbidden.'], 403);
    $rows = db()->query(
        "SELECT CAST(e.employee_id AS CHAR) AS employeeId,
                e.name                AS fullName,
                COALESCE(e.email, '') AS employeeEmail,
                CAST(a.account_id AS CHAR) AS id,
                a.username,
                a.email,
                a.department,
                a.position,
                a.role,
                a.status,
                a.phone
         FROM employees e
         LEFT JOIN accounts a ON a.employee_id = e.employee_id
         ORDER BY e.employee_id"
    )->fetchAll();

    foreach ($rows as &$r) {
        $r['id']         = $r['id']         ?: '';
        $r['fullName']   = $r['fullName']   ?: '';
        $r['email']      = $r['email']      ?: ($r['employeeEmail'] ?? '');
        $r['username']   = $r['username']   ?: '';
        $r['department'] = $r['department'] ?: '';
        $r['position']   = $r['position']   ?: '';
        $r['role']       = $r['role']       ?: '';
        $r['status']     = $r['status']     ?: 'No Account';
        $r['phone']      = $r['phone']      ?: '';
    }
    unset($r);

    respond(['ok' => true, 'users' => $rows]);
}

// ---------- USERS.APPROVE ----------
if ($action === 'users.approve' && $method === 'POST') {
    $u = requireUser();
    if (!isHrAdmin($u)) respond(['ok' => false, 'message' => 'Forbidden.'], 403);
    $id = (int)(requestBody()['id'] ?? 0);
    if (!$id) respond(['ok' => false, 'message' => 'Missing user id.'], 422);
    $up = db()->prepare('UPDATE accounts SET status="Active", approved_by=?, approved_at=NOW() WHERE account_id=?');
    $up->execute([$u['email'], $id]);
    audit((int)$u['id'], $u['email'], $u['role'], 'approve_user', 'account', $id);
    respond(['ok' => true, 'message' => 'Account approved.']);
}

// ---------- USERS.REJECT ----------
if ($action === 'users.reject' && $method === 'POST') {
    $u = requireUser();
    if (!isHrAdmin($u)) respond(['ok' => false, 'message' => 'Forbidden.'], 403);
    $id = (int)(requestBody()['id'] ?? 0);
    if (!$id) respond(['ok' => false, 'message' => 'Missing user id.'], 422);
    $up = db()->prepare('UPDATE accounts SET status="Rejected", rejected_by=?, rejected_at=NOW() WHERE account_id=?');
    $up->execute([$u['email'], $id]);
    audit((int)$u['id'], $u['email'], $u['role'], 'reject_user', 'account', $id);
    respond(['ok' => true, 'message' => 'Account rejected.']);
}

// ---------- USERS.SETSTATUS ----------
if ($action === 'users.setStatus' && $method === 'POST') {
    $u = requireUser();
    if (!isHrAdmin($u)) respond(['ok' => false, 'message' => 'Forbidden.'], 403);
    $b = requestBody();
    $id = (int)($b['id'] ?? 0);
    $status = trim((string)($b['status'] ?? 'Active'));
    if (!$id || !in_array($status, ['Active','Inactive','Pending','Rejected'], true)) {
        respond(['ok' => false, 'message' => 'Invalid status.'], 422);
    }
    db()->prepare('UPDATE accounts SET status=? WHERE account_id=?')->execute([$status, $id]);
    audit((int)$u['id'], $u['email'], $u['role'], 'set_status', 'account', $id, $status);
    respond(['ok' => true, 'message' => 'Status updated.']);
}

// ---------- USERS.RESETPASSWORD ----------
if ($action === 'users.resetPassword' && $method === 'POST') {
    $u = requireUser();
    if (!isHrAdmin($u)) respond(['ok' => false, 'message' => 'Forbidden.'], 403);
    $b = requestBody();
    $id = (int)($b['id'] ?? 0);
    if (!$id) respond(['ok' => false, 'message' => 'Missing user id.'], 422);
    $temp = bin2hex(random_bytes(4));
    db()->prepare('UPDATE accounts SET password=? WHERE account_id=?')
        ->execute([password_hash($temp, PASSWORD_DEFAULT), $id]);
    audit((int)$u['id'], $u['email'], $u['role'], 'reset_password', 'account', $id);
    respond(['ok' => true, 'message' => "Temporary password: {$temp}"]);
}

// ---------- USERS.CREATE ----------
// Create an employee AND an account in a single transaction.
// Everything (name, department, salary, login credentials) comes from the client.
if ($action === 'users.create' && $method === 'POST') {
    $u = requireUser();
    if (!isHrAdmin($u)) respond(['ok' => false, 'message' => 'Forbidden.'], 403);

    $b = requestBody();

    // Employee fields
    $fullName   = trim((string)($b['fullName'] ?? ''));
    $email      = strtolower(trim((string)($b['email'] ?? '')));
    $phone      = trim((string)($b['phone'] ?? ''));
    $position   = trim((string)($b['position'] ?? 'Staff'));
    $department = trim((string)($b['department'] ?? 'HR'));
    $salary     = (float)($b['salary'] ?? 0);
    $status     = trim((string)($b['status'] ?? 'Active'));
    $joined     = trim((string)($b['joined'] ?? date('Y-m-d')));

    // Account fields
    $password        = (string)($b['password'] ?? '');
    $confirmPassword = (string)($b['confirmPassword'] ?? '');

    // ---- Validation ----
    if ($fullName === '') respond(['ok' => false, 'message' => 'Full name is required.'], 422);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) respond(['ok' => false, 'message' => 'Invalid email.'], 422);
    if (strlen($password) < 8) respond(['ok' => false, 'message' => 'Password must be at least 8 characters.'], 422);
    if ($password !== $confirmPassword) respond(['ok' => false, 'message' => 'Passwords do not match.'], 422);
    if (!in_array($department, ['HR', 'Finance', 'Procurement'], true)) respond(['ok' => false, 'message' => 'Department must be HR, Finance, or Procurement.'], 422);
    if (!in_array($position, ['Admin', 'Staff'], true)) respond(['ok' => false, 'message' => 'Position must be Admin or Staff.'], 422);
    if ($salary < 0) respond(['ok' => false, 'message' => 'Salary cannot be negative.'], 422);

    // Derive the role string used elsewhere in the app.
    $role = $department . ' ' . $position;

    $pdo = db();

    // Email must be unique.
    $dup = $pdo->prepare('SELECT account_id FROM accounts WHERE email = ? OR username = ? LIMIT 1');
    $dup->execute([$email, $email]);
    if ($dup->fetch()) respond(['ok' => false, 'message' => 'That email is already in use.'], 422);

    $deptId = departmentIdFromLabel($department);

    $pdo->beginTransaction();
    try {
        // 1. Insert the employee.
        $empIns = $pdo->prepare(
            'INSERT INTO employees (name, email, position, position_label, department, department_label,
                                    contact_info, employment_status, basic_salary, date_hired)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $empIns->execute([
            $fullName,
            $email,
            $position,           // employees.position stores Admin/Staff
            $position,
            $deptId,
            $department,
            $phone,
            $status,
            $salary,
            $joined,
        ]);
        $employeeId = (int)$pdo->lastInsertId();

        // 2. Insert the account tied to that employee.
        $accIns = $pdo->prepare(
            'INSERT INTO accounts (employee_id, username, email, full_name, password,
                                   position, department, role, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, "Active", NOW())'
        );
        $accIns->execute([
            $employeeId, $email, $email, $fullName,
            password_hash($password, PASSWORD_DEFAULT),
            $position, $department, $role,
        ]);
        $accountId = (int)$pdo->lastInsertId();

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        respond(['ok' => false, 'message' => 'Create failed: ' . $e->getMessage()], 500);
    }

    audit(
        (int)$u['id'],
        $u['email'],
        $u['role'],
        'create_account',
        'account',
        $accountId,
        $fullName . ' · ' . $role
    );

    respond([
        'ok'        => true,
        'message'   => 'Employee and account created. They can now sign in with the email and password you set.',
        'employeeId'=> (string)$employeeId,
        'accountId' => (string)$accountId,
    ]);
}

// ---------- AUDIT ----------
if ($action === 'audit' && $method === 'GET') {
    $u = requireUser();
    if (!isHrAdmin($u)) respond(['ok' => false, 'message' => 'Forbidden.'], 403);
    $rows = db()->query(
        'SELECT log_id AS id, timestamp AS at, action, module AS entity,
                record_id AS entityId, description AS details, new_value AS actor
         FROM audit_trail ORDER BY log_id DESC LIMIT 500'
    )->fetchAll();
    respond(['ok' => true, 'events' => $rows]);
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
    foreach ($stmt->fetchAll() as $row) {
        $access[$row['page_key']] = (bool)$row['allowed'];
    }
    respond(['ok' => true, 'userId' => (string)$targetId, 'access' => $access]);
}

// ---------- PAGE ACCESS catalog ----------
if ($action === 'access.catalog' && $method === 'GET') {
    requireUser();
    respond(['ok' => true, 'catalog' => [
        'HR' => [
            'label' => 'Payroll & HR',
            'pages' => [
                'dashboard'    => 'Dashboard',
                'employees'    => 'Employees Master',
                'attendance'   => 'Attendance',
                'leave'        => 'Leave Request',
                'payroll'      => 'Payroll',
                'contribution' => 'Contribution',
                '13thmonth'    => '13th Month Pay',
                'deductions'   => 'Deductions',
                'settings'     => 'Settings',
            ],
        ],
        'Finance' => [
            'label' => 'Finance',
            'pages' => [
                'dashboard'             => 'Dashboard',
                'chartAccounts'         => 'Chart of Accounts',
                'payables'              => 'Accounts Payable',
                'receivables'           => 'Accounts Receivable',
                'cashBank'              => 'Cash / Bank',
                'expenses'              => 'Expenses',
                'financialReports'      => 'Financial Reports',
                'paymentManagement'     => 'Payment Management',
                'financialTransactions' => 'Financial Transactions',
                'settings'              => 'Settings',
            ],
        ],
    ]]);
}

// ---------- PAGE ACCESS save ----------
if ($action === 'access.save' && $method === 'POST') {
    $u = requireUser();
    if (!isHrAdmin($u)) respond(['ok' => false, 'message' => 'Forbidden.'], 403);
    $b = requestBody();
    $userId = (int)($b['userId'] ?? 0);
    $access = $b['access'] ?? null;
    if (!$userId || !is_array($access)) {
        respond(['ok' => false, 'message' => 'Missing payload.'], 422);
    }
    saveAccessForUser($userId, $access);
    audit((int)$u['id'], $u['email'], $u['role'], 'save_access', 'account', $userId, 'Updated page access');
    respond(['ok' => true, 'message' => 'Access updated.']);
}

// ---------- PAGE ACCESS bulk ----------
if ($action === 'access.bulk' && $method === 'POST') {
    $u = requireUser();
    if (!isHrAdmin($u)) respond(['ok' => false, 'message' => 'Forbidden.'], 403);
    $b = requestBody();
    $position   = trim((string)($b['position'] ?? ''));
    $department = trim((string)($b['department'] ?? ''));
    $access     = $b['access'] ?? null;
    if (!is_array($access)) respond(['ok' => false, 'message' => 'Missing access payload.'], 422);

    $sql  = 'SELECT account_id FROM accounts WHERE 1=1';
    $args = [];
    if ($position !== '')   { $sql .= ' AND position = ?';   $args[] = $position; }
    if ($department !== '') { $sql .= ' AND department = ?'; $args[] = $department; }
    $stmt = db()->prepare($sql);
    $stmt->execute($args);
    $ids = array_column($stmt->fetchAll(), 'account_id');
    if (!$ids) respond(['ok' => false, 'message' => 'No users match the selection.'], 404);

    foreach ($ids as $uid) saveAccessForUser((int)$uid, $access);
    audit((int)$u['id'], $u['email'], $u['role'], 'save_access_bulk', 'account', null,
          sprintf('Position=%s · Department=%s · %d user(s)',
                  $position ?: 'All', $department ?: 'All', count($ids)));
    respond(['ok' => true, 'message' => 'Access updated for ' . count($ids) . ' user(s).',
             'count' => count($ids), 'userIds' => $ids]);
}

function saveAccessForUser(int $userId, array $access): void
{
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $del = $pdo->prepare('DELETE FROM page_access WHERE user_id = ?');
        $del->execute([$userId]);
        $ins = $pdo->prepare('INSERT INTO page_access (user_id, page_key, allowed) VALUES (?, ?, ?)');
        foreach ($access as $key => $val) {
            if (!is_string($key)) continue;
            $ins->execute([$userId, $key, $val ? 1 : 0]);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

// ---------- EXPORT CSV ----------
if ($action === 'export' && $method === 'GET') {
    $u = requireUser();
    if (!isHrAdmin($u)) respond(['ok' => false, 'message' => 'Forbidden.'], 403);
    $entity = $_GET['entity'] ?? 'employees';
    $state = loadState();
    $rows = $state[$entity] ?? [];
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

// ---------- LEAVE REQUEST (staff) ----------
if ($action === 'leave.request' && $method === 'POST') {
    $u = requireUser();
    $b = requestBody();
    $type   = trim((string)($b['type'] ?? 'Vacation Leave'));
    $from   = trim((string)($b['from'] ?? ''));
    $to     = trim((string)($b['to'] ?? ''));
    $reason = trim((string)($b['reason'] ?? ''));
    $proofName = trim((string)($b['proofName'] ?? ''));
    $proofData = (string)($b['proofData'] ?? '');

    if ($from === '' || $to === '' || $to < $from) {
        respond(['ok' => false, 'message' => 'Enter valid start and end dates.'], 422);
    }

    $empId = (int)($u['employeeId'] ?? 0);
    if ($empId <= 0) {
        $lookup = db()->prepare('SELECT employee_id FROM accounts WHERE account_id = ?');
        $lookup->execute([(int)$u['id']]);
        $empId = (int)($lookup->fetchColumn() ?: 0);
    }
    if ($empId <= 0) {
        respond(['ok' => false, 'message' => 'No employee record is linked to this account.'], 422);
    }

    $ins = db()->prepare(
        'INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason, status)
         VALUES (?, ?, ?, ?, ?, "Pending")'
    );
    $ins->execute([$empId, $type, $from, $to, $reason]);
    $leaveId = (int)db()->lastInsertId();

    audit((int)$u['id'], $u['email'], $u['role'], 'request_leave', 'leave', $leaveId,
          $type . ' / ' . $from . ' to ' . $to);

    respond([
        'ok' => true,
        'message' => 'Leave request submitted.',
        'leave' => [
            'id'   => 'LV-' . str_pad((string)$leaveId, 4, '0', STR_PAD_LEFT),
            'empId'=> 'EMP-' . str_pad((string)$empId, 3, '0', STR_PAD_LEFT),
            'type' => $type,
            'from' => $from,
            'to'   => $to,
            'reason' => $reason,
            'proofName' => $proofName,
            'proofData' => $proofData,
            'status' => 'Pending',
        ],
    ]);
}

// ---------- ATTENDANCE CLOCK IN / OUT (staff) ----------
if ($action === 'attendance.log' && $method === 'POST') {
    $u = requireUser();
    $b = requestBody();
    $mode = ($b['mode'] ?? 'in') === 'out' ? 'out' : 'in';
    $today = date('Y-m-d');

    $empId = (int)($u['employeeId'] ?? 0);
    if ($empId <= 0) {
        $lookup = db()->prepare('SELECT employee_id FROM accounts WHERE account_id = ?');
        $lookup->execute([(int)$u['id']]);
        $empId = (int)($lookup->fetchColumn() ?: 0);
    }
    if ($empId <= 0) {
        respond(['ok' => false, 'message' => 'No employee record is linked to this account.'], 422);
    }

    $stmt = db()->prepare('SELECT * FROM attendance WHERE employee_id = ? AND attendance_date = ? LIMIT 1');
    $stmt->execute([$empId, $today]);
    $row = $stmt->fetch();

    if ($mode === 'in') {
        if ($row && !empty($row['time_in'])) {
            respond(['ok' => false, 'message' => 'You have already clocked in today.'], 422);
        }
        if ($row) {
            db()->prepare('UPDATE attendance SET time_in = CURTIME(), status = "Present" WHERE attendance_id = ?')
               ->execute([(int)$row['attendance_id']]);
            $attId = (int)$row['attendance_id'];
        } else {
            $ins = db()->prepare(
                'INSERT INTO attendance (employee_id, attendance_date, time_in, status)
                 VALUES (?, ?, CURTIME(), "Present")'
            );
            $ins->execute([$empId, $today]);
            $attId = (int)db()->lastInsertId();
        }
        audit((int)$u['id'], $u['email'], $u['role'], 'attendance_in', 'attendance', $attId);
        $message = 'Clocked in at ' . date('h:i A') . '.';
    } else {
        if (!$row || empty($row['time_in'])) {
            respond(['ok' => false, 'message' => 'You need to clock in before clocking out.'], 422);
        }
        if (!empty($row['time_out'])) {
            respond(['ok' => false, 'message' => 'You have already clocked out today.'], 422);
        }
        db()->prepare('UPDATE attendance SET time_out = CURTIME() WHERE attendance_id = ?')
           ->execute([(int)$row['attendance_id']]);
        $attId = (int)$row['attendance_id'];
        audit((int)$u['id'], $u['email'], $u['role'], 'attendance_out', 'attendance', $attId);
        $message = 'Clocked out at ' . date('h:i A') . '.';
    }

    $fetch = db()->prepare(
        "SELECT attendance_id AS id,
                employee_id  AS empId,
                attendance_date AS date,
                TIME_FORMAT(time_in,'%H:%i')  AS timeIn,
                TIME_FORMAT(time_out,'%H:%i') AS timeOut,
                status
         FROM attendance WHERE attendance_id = ?"
    );
    $fetch->execute([$attId]);
    $att = $fetch->fetch();

    respond(['ok' => true, 'message' => $message, 'attendance' => $att]);
}

respond(['ok' => false, 'message' => 'Unknown action.', 'action' => $action, 'method' => $method], 404);