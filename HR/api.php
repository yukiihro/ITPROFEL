<?php
// ITPROFEL/HR/api.php
declare(strict_types=1);

require_once dirname(__DIR__) . '/root/db.php';

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'domain' => '',
        'secure' => false,
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
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
    if ($norm === 'procurement') return 5;
    if ($norm === 'inventory') return 6;
    if ($norm === 'sales') return 7;
    if ($norm === 'production') return 8;
    // Default to HR
    return 2;
}

function departmentLabelFromId(int $id): string
{
    return match ($id) {
        1 => 'Finance',
        2 => 'HR',
        3 => 'Administration',
        5 => 'Procurement',
        6 => 'Inventory',
        7 => 'Sales',
        8 => 'Production',
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

    // Employees — the employee list IS the account list: only rows that
    // actually have a user account (inner JOIN), including Admin/Manager/Buyer.
    $employees = $pdo->query(
        "SELECT CAST(e.employee_id AS CHAR) AS id,
                e.employee_no AS empNo,
                e.name,
                a.username AS email,
                e.position AS position,
                CASE e.department
                             WHEN 1 THEN 'Finance'
                             WHEN 2 THEN 'HR'
                             WHEN 3 THEN 'Administration'
                             WHEN 4 THEN 'IT'
                             WHEN 5 THEN 'Procurement'
                             WHEN 6 THEN 'Inventory'
                             WHEN 7 THEN 'Sales'
                             WHEN 8 THEN 'Production'
                         ELSE ''
                         END AS dept,
                e.contact_info AS phone,
                NULL AS gender,
                NULL AS avatar,
                e.basic_salary AS salary,
                e.employment_status AS status,
                COALESCE(e.date_hired, e.hire_date) AS joined
         FROM employees e
         INNER JOIN accounts a ON a.employee_id = e.employee_id
         WHERE LOWER(TRIM(COALESCE(a.status, 'Active'))) = 'active'
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
                p.basic_salary AS salary,
                p.overtime,
                p.absences,
                p.gross_salary AS gross,
                p.deductions,
                p.net_salary AS net,
                CASE WHEN EXISTS (
                         SELECT 1 FROM financial_transactions ft
                          WHERE ft.payroll_id = p.payroll_id
                            AND LOWER(TRIM(COALESCE(ft.status, ''))) IN ('completed', 'paid', 'approved')
                     ) THEN 'Paid'
                     ELSE p.status END AS status,
                p.created_at
         FROM payroll p
         ORDER BY p.created_at DESC"
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

    // Government contributions (SSS / PhilHealth / Pag-IBIG) — derived from
    // the statutory deduction lines of every payroll record, joined to the
    // employee for the table on the Contribution page.
    $contributions = $pdo->query(
        "SELECT CONCAT('GC-', LPAD(d.deduction_id, 5, '0')) AS id,
                CAST(p.employee_id AS CHAR) AS empId,
                COALESCE(NULLIF(e.employee_no, ''), CONCAT('EMP-', LPAD(e.employee_id, 3, '0'))) AS empNo,
                e.name AS employeeName,
                TRIM(d.deduction_type) AS `type`,
                p.basic_salary AS basicSalary,
                d.amount AS employeeShare,
                p.payroll_period AS period,
                p.status AS payrollStatus,
                CASE e.department
                             WHEN 1 THEN 'Finance'
                             WHEN 2 THEN 'HR'
                             WHEN 3 THEN 'Administration'
                             WHEN 4 THEN 'IT'
                             WHEN 5 THEN 'Procurement'
                             WHEN 6 THEN 'Inventory'
                             WHEN 7 THEN 'Sales'
                             WHEN 8 THEN 'Production'
                         ELSE ''
                         END AS dept
         FROM payroll_deductions d
         JOIN payroll p ON p.payroll_id = d.payroll_id
         JOIN employees e ON e.employee_id = p.employee_id
         WHERE LOWER(TRIM(d.deduction_type)) IN ('sss', 'philhealth', 'pag-ibig')
         ORDER BY e.employee_no, d.deduction_id"
    )->fetchAll();

    // Every active employee also gets a standing contribution row per agency
    // (SSS / PhilHealth / Pag-IBIG), so the Contribution page lists all
    // employees even before their first payroll run. The shares are computed
    // client-side from the statutory formulas using basic salary. Payroll
    // records take precedence: no generated row for an employee+agency that a
    // payroll deduction already covers.
    $covered = [];
    foreach ($contributions as $c) {
        $covered[$c['empId'] . '|' . strtolower(trim((string)$c['type']))] = true;
    }
    $activeEmployees = $pdo->query(
        "SELECT e.employee_id,
                e.name,
                e.basic_salary,
                CASE e.department
                             WHEN 1 THEN 'Finance'
                             WHEN 2 THEN 'HR'
                             WHEN 3 THEN 'Administration'
                             WHEN 4 THEN 'IT'
                             WHEN 5 THEN 'Procurement'
                             WHEN 6 THEN 'Inventory'
                             WHEN 7 THEN 'Sales'
                             WHEN 8 THEN 'Production'
                         ELSE ''
                         END AS dept
         FROM employees e
         INNER JOIN accounts a ON a.employee_id = e.employee_id
         WHERE LOWER(TRIM(COALESCE(a.status, 'Active'))) = 'active'
         ORDER BY e.employee_id"
    )->fetchAll();
    $agencyTypes = ['SSS' => 'sss', 'PhilHealth' => 'philhealth', 'Pag-IBIG' => 'pagibig'];
    foreach ($activeEmployees as $emp) {
        $empId = (string)$emp['employee_id'];
        foreach ($agencyTypes as $label => $key) {
            if (isset($covered[$empId . '|' . $key])) continue;
            $contributions[] = [
                'id'             => 'GCE-' . $empId . '-' . $key,
                'empId'          => $empId,
                'empNo'          => 'EMP-' . str_pad($empId, 3, '0', STR_PAD_LEFT),
                'employeeName'   => $emp['name'],
                'type'           => $label,
                'basicSalary'    => $emp['basic_salary'],
                'employeeShare'  => null,
                'period'         => null,
                'payrollStatus'  => null,
                'dept'           => $emp['dept']
            ];
        }
    }

    // 13th Month Pay — posted records from thirteenth_month_pay. Records link
    // to the employee directly (t.employee_id) or, for legacy rows, through
    // their payroll run.
    $thirteenthMonth = $pdo->query(
        "SELECT t.thirteenth_id AS id,
                CAST(COALESCE(t.employee_id, p.employee_id) AS CHAR) AS empId,
                COALESCE(NULLIF(e.employee_no, ''), CONCAT('EMP-', LPAD(COALESCE(t.employee_id, p.employee_id), 3, '0'))) AS empNo,
                e.name AS employeeName,
                CASE e.department
                             WHEN 1 THEN 'Finance'
                             WHEN 2 THEN 'HR'
                             WHEN 3 THEN 'Administration'
                             WHEN 4 THEN 'IT'
                             WHEN 5 THEN 'Procurement'
                             WHEN 6 THEN 'Inventory'
                             WHEN 7 THEN 'Sales'
                             WHEN 8 THEN 'Production'
                         ELSE ''
                         END AS dept,
                t.payroll_id AS payrollId,
                t.amount,
                DATE_FORMAT(t.payment_date, '%M %d, %Y') AS paymentDate,
                t.status
         FROM thirteenth_month_pay t
         LEFT JOIN payroll p ON p.payroll_id = t.payroll_id
         LEFT JOIN employees e ON e.employee_id = COALESCE(t.employee_id, p.employee_id)
         ORDER BY t.thirteenth_id"
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
    $settings = [
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
        'contributions'=> $contributions,
        'thirteenthMonth' => $thirteenthMonth,
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

    $stmt = db()->prepare(
        'SELECT a.*, e.name AS employee_name, e.contact_info, d.department_name
         FROM accounts a
         JOIN employees e ON e.employee_id = a.employee_id
         LEFT JOIN departments d ON d.department_id = e.department
         WHERE a.username = ? LIMIT 1'
    );
    $stmt->execute([$identifier]);
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
        'email'      => $user['username'],
        'fullName'   => $user['employee_name'],
        'department' => $user['department_name'] === 'Human Resources' ? 'HR' : ($user['department_name'] ?? ''),
        'position'   => $user['position'] ?? '',
        'role'       => (($user['department_name'] === 'Human Resources' ? 'HR' : ($user['department_name'] ?? '')) . ' ' . ($user['position'] ?? '')),
        'status'     => $status,
        'phone'      => $user['contact_info'] ?? '',
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
if (!in_array($department, ['HR', 'Finance', 'Procurement', 'Inventory', 'Sales', 'Production'], true)) {
    respond(['ok' => false, 'message' => 'Please select a valid department.'], 422);
}
    if (!in_array($position, ['Admin','Staff'], true)) {
        respond(['ok' => false, 'message' => 'Please select a valid position.'], 422);
    }
    if ($password !== $confirm) {
        respond(['ok' => false, 'message' => 'Passwords do not match.'], 422);
    }

    $check = db()->prepare('SELECT account_id FROM accounts WHERE username = ? LIMIT 1');
    $check->execute([$email]);
    if ($check->fetch()) {
        respond(['ok' => false, 'message' => 'An account with that email already exists.'], 422);
    }

    $deptId = departmentIdFromLabel($department);   // HR → 2, Finance → 1

    $pdo = db();
    $pdo->beginTransaction();
    try {
        $emp = $pdo->prepare(
            'INSERT INTO employees (name, position, department,
                                    contact_info, employment_status, basic_salary, date_hired)
             VALUES (?, ?, ?, "", "Active", 0, CURDATE())'
        );
        $emp->execute([$fullName, $position, $deptId]);
        $empId = (int)$pdo->lastInsertId();

        $role = $department . ' ' . $position;
        $acc = $pdo->prepare(
            'INSERT INTO accounts (employee_id, username, password, position, status, created_at)
             VALUES (?, ?, ?, ?, "Pending", NOW())'
        );
        $acc->execute([
            $empId, $email,
            password_hash($password, PASSWORD_DEFAULT),
            $position
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
    $conflict = db()->prepare('SELECT account_id FROM accounts WHERE username = ? AND account_id <> ? LIMIT 1');
    $conflict->execute([$email, (int)$u['id']]);
    if ($conflict->fetch()) {
        respond(['ok' => false, 'message' => 'That email is already in use.'], 422);
    }
    $up = db()->prepare(
        'UPDATE accounts a
         JOIN employees e ON e.employee_id = a.employee_id
         SET a.username=?, e.name=?, e.contact_info=?
         WHERE a.account_id=?'
    );
    $up->execute([$email, $fullName, $phone, (int)$u['id']]);

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
    $body = requestBody();
    $state = $body['state'] ?? null;
    if (!is_array($state)) respond(['ok' => false, 'message' => 'Invalid state payload.'], 422);

    // Optional activity tag from the client (e.g. "leave:approved") so the
    // notification feed can say what actually changed instead of just "store".
    $activity = strtolower(trim((string)($body['auditActivity'] ?? '')));
    $activity = preg_replace('/[^a-z0-9_:-]/', '', $activity) ?: '';

    // Safety: if the incoming state has empty arrays for destructive sections,
    // drop those keys so we never wipe real data by accident.
    foreach (['employees', 'attendance', 'leaves', 'payroll', 'deductions', 'payroll_deductions'] as $key) {
        if (array_key_exists($key, $state) && is_array($state[$key]) && count($state[$key]) === 0) {
            unset($state[$key]);
        }
    }

    // The client sends the Deductions page rows under `deductions`; they are
    // stored in the payroll_deductions table. Accept either key.
    if (!array_key_exists('payroll_deductions', $state) && array_key_exists('deductions', $state)) {
        $state['payroll_deductions'] = $state['deductions'];
    }

    $pdo = db();
    $pdo->beginTransaction();
    try {
        // Finance payments carry the payroll_id they settled. The payroll
        // delete / re-insert below creates fresh ids (and the FK sets the old
        // link to NULL), so record which employee + period Finance already paid
        // first, to keep those payrolls Paid and their payments linked.
        $paidPayrolls = [];
        $relinkPayment = $pdo->prepare(
            'UPDATE financial_transactions SET payroll_id = ? WHERE reference_no = ?'
        );
        foreach ($pdo->query(
            "SELECT p.employee_id, p.payroll_period, ft.reference_no
               FROM payroll p
               JOIN financial_transactions ft ON ft.payroll_id = p.payroll_id
              WHERE LOWER(TRIM(COALESCE(ft.status, ''))) IN ('completed', 'paid', 'approved')",
            PDO::FETCH_ASSOC
        )->fetchAll() as $paidRow) {
            $paidKey = strtolower(trim((string)(int)$paidRow['employee_id'] . '|' . (string)$paidRow['payroll_period']));
            $paidPayrolls[$paidKey][] = (string)$paidRow['reference_no'];
        }
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

            // Every employee with a user account must be protected from the
            // "missing ID" cleanup — including deactivated accounts. Their
            // employee/account rows are kept in the database so the account
            // can be reactivated later; the list just filters them out.
            $protected = $pdo->query(
                "SELECT DISTINCT a.employee_id FROM accounts a
                 WHERE a.employee_id IS NOT NULL"
            )->fetchAll(PDO::FETCH_COLUMN);
            foreach ($protected as $pid) {
                if ((int)$pid > 0) $keepIds[] = (int)$pid;
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

            // Upsert remaining employees by ID (a new row is inserted when the ID is
            // missing; an explicit employee ID the client chose inserts with it,
            // or updates on a duplicate key). Some database snapshots lack the
            // optional gender/avatar_url columns, so build the statement around
            // the columns that actually exist.
            $empCols = $pdo->query(
                "SELECT COLUMN_NAME FROM information_schema.COLUMNS
                  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'employees'"
            )->fetchAll(PDO::FETCH_COLUMN);
            $hasGender = in_array('gender', $empCols, true);
            $hasAvatar = in_array('avatar_url', $empCols, true);

            $cols = ['employee_id', 'name', 'position', 'department', 'contact_info'];
            if ($hasGender) $cols[] = 'gender';
            if ($hasAvatar) $cols[] = 'avatar_url';
            $cols[] = 'employment_status';
            $cols[] = 'basic_salary';
            $cols[] = 'date_hired';

            $colList = implode(', ', $cols);
            $phList  = implode(', ', array_fill(0, count($cols), '?'));
            $updList = implode(', ', array_map(static fn(string $c): string => "$c=VALUES($c)", array_slice($cols, 1)));
            $upsert = $pdo->prepare("INSERT INTO employees ($colList) VALUES ($phList) ON DUPLICATE KEY UPDATE $updList");

            foreach ($incoming as $e) {
                $id        = (int)($e['id'] ?? 0);
                $name      = trim((string)($e['name'] ?? ''));
                if ($name === '') continue;
                $deptLabel = (string)($e['dept'] ?? 'HR');
                $deptId    = departmentIdFromLabel($deptLabel);
                $gender    = array_key_exists('gender', $e) && in_array($e['gender'], ['Female', 'Male'], true)
                             ? $e['gender'] : null;
                // Avatar arrives as a small data URL (resized client-side); cap defensively.
                $avatar    = (is_string($e['avatar'] ?? null) && strlen($e['avatar']) > 5 && strlen($e['avatar']) <= 500000)
                             ? $e['avatar'] : null;

                $vals = [
                    $id > 0 ? $id : null,
                    $name,
                    $e['position'] ?? 'Staff',
                    $deptId,
                    $e['phone'] ?? '',
                ];
                if ($hasGender) $vals[] = $gender;
                if ($hasAvatar) $vals[] = $avatar;
                $vals[] = $e['status'] ?? 'Active';
                $vals[] = (float)($e['salary'] ?? 0);
                $vals[] = $e['joined'] ?? date('Y-m-d');
                $upsert->execute($vals);
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
            // Delete existing records so we can sync the exact state
            $pdo->exec('DELETE FROM payroll');

            // The rebuilt production schema uses an INT auto-increment payroll_id,
            // while the original prototype expected VARCHAR 'PAY-XXXX' ids.
            // Detect which one exists and generate ids accordingly.
            $colType = (string)$pdo->query(
                "SELECT DATA_TYPE FROM information_schema.COLUMNS
                  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payroll' AND COLUMN_NAME = 'payroll_id'"
            )->fetchColumn();
            $isIntId = in_array(strtolower($colType), ['int', 'bigint', 'smallint', 'mediumint', 'tinyint'], true);

            // Determine the max ID BEFORE we start inserting (varchar schema only)
            $maxId = 0;
            if (!$isIntId) {
                $maxStmt = $pdo->query("SELECT MAX(CAST(SUBSTRING(payroll_id, 5) AS UNSIGNED)) FROM payroll");
                $maxId = (int)($maxStmt->fetchColumn() ?: 0);
            }

            if ($isIntId) {
                $ins = $pdo->prepare(
                    'INSERT INTO payroll (employee_id, payroll_period, basic_salary, overtime, absences, deductions, gross_salary, net_salary, status)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
                );
            } else {
                $ins = $pdo->prepare(
                    'INSERT INTO payroll (payroll_id, employee_id, payroll_period, basic_salary, overtime, absences, deductions, gross_salary, net_salary, status)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
                );
            }

            // Track used IDs in this batch to avoid duplicate collisions (varchar only)
            $usedIds = [];

            foreach ($state['payroll'] as $p) {
                // Client rows may use either the DB column names (rows created
                // in-page) or the loadState aliases (salary/gross/net).
                $basic = (float)($p['basic_salary'] ?? $p['salary'] ?? 0);
                $gross = (float)($p['gross_salary'] ?? $p['gross'] ?? ($basic + (float)($p['overtime'] ?? 0)));
                $ded   = (float)($p['deductions'] ?? 0);
                $net   = (float)($p['net_salary'] ?? ($gross - $ded));
                $period = $p['payroll_period'] ?? $p['cycle'] ?? '';

                if ($isIntId) {
                    // A payroll Finance already paid stays Paid, even when the
                    // browser still holds the old status.
                    $paidKey = strtolower(trim((string)(int)($p['empId'] ?? 0) . '|' . $period));
                    $status = isset($paidPayrolls[$paidKey]) ? 'Paid' : ($p['status'] ?? 'Pending');
                    $ins->execute([
                        (int)($p['empId'] ?? 0),
                        $period,
                        $basic,
                        (float)($p['overtime'] ?? 0),
                        (float)($p['absences'] ?? 0),
                        $ded,
                        $gross,
                        $net,
                        $status,
                    ]);
                    if (isset($paidPayrolls[$paidKey])) {
                        $newPayrollId = (int)$pdo->lastInsertId();
                        foreach ($paidPayrolls[$paidKey] as $paymentRef) {
                            $relinkPayment->execute([$newPayrollId, $paymentRef]);
                        }
                    }
                    continue;
                }

                $id = trim((string)($p['id'] ?? ''));

                // If the ID is missing, or not in the PAY-XXXX format, or already used in this loop
                if ($id === '' || strpos($id, 'PAY-') !== 0 || isset($usedIds[$id])) {
                    $maxId++;
                    $id = 'PAY-' . str_pad((string)$maxId, 4, '0', STR_PAD_LEFT);
                }

                $usedIds[$id] = true;

                $ins->execute([
                    $id,
                    (int)($p['empId'] ?? 0),
                    $period,
                    $basic,
                    (float)($p['overtime'] ?? 0),
                    (float)($p['absences'] ?? 0),
                    $ded,
                    $gross,
                    $net,
                    $p['status'] ?? 'Pending',
                ]);
            }
        }

        // Payroll deductions (SSS, PhilHealth, Pag-IBIG, cash advance, leave, …).
        // Each row is linked to the employee's payroll run for the same period.
        if (array_key_exists('payroll_deductions', $state) && !empty($state['payroll_deductions'])) {
            $payrollByPeriod = $pdo->prepare(
                'SELECT payroll_id FROM payroll WHERE employee_id = ? AND payroll_period = ?
                 ORDER BY payroll_id DESC LIMIT 1'
            );
            $payrollLatest = $pdo->prepare(
                'SELECT payroll_id FROM payroll WHERE employee_id = ?
                 ORDER BY payroll_id DESC LIMIT 1'
            );
            $insDed = $pdo->prepare(
                'INSERT INTO payroll_deductions (payroll_id, deduction_type, amount) VALUES (?, ?, ?)'
            );
            foreach ($state['payroll_deductions'] as $d) {
                $empId  = (int)($d['empId'] ?? 0);
                $amount = round((float)($d['amount'] ?? 0), 2);
                $type   = trim((string)($d['type'] ?? $d['deduction_type'] ?? 'Other'));
                if ($empId <= 0 || $amount <= 0 || $type === '') continue;

                $period = (string)($d['period'] ?? $d['payroll_period'] ?? '');
                $payrollId = false;
                if ($period !== '') {
                    $payrollByPeriod->execute([$empId, $period]);
                    $payrollId = $payrollByPeriod->fetchColumn();
                }
                if ($payrollId === false || $payrollId === null) {
                    $payrollLatest->execute([$empId]);
                    $payrollId = $payrollLatest->fetchColumn();
                }
                if ($payrollId === false || $payrollId === null) continue;

                $insDed->execute([(int)$payrollId, $type, $amount]);
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
    $notifyModule = 'store';
    $notifyAction = 'save';
    if ($activity !== '') {
        $parts = explode(':', $activity, 2);
        $notifyModule = substr($parts[0], 0, 50);
        $notifyAction = substr($parts[1] ?? 'updated', 0, 50);
    }
    audit((int)$u['id'], $u['email'], $u['role'], $notifyAction, $notifyModule, null,
          'Updated HR data: ' . implode(', ', $summary));
    respond(['ok' => true]);
}

// ---------- 13TH MONTH PAY (POST) ----------
// Persists the computed 13th month pay into thirteenth_month_pay. Each record is
// linked, via the payroll FK, to the employee's most recent payroll run.
if ($action === 'thirteenthMonth.save' && $method === 'POST') {
    $u = requireUser();
    if (!isHrAdmin($u)) {
        respond(['ok' => false, 'message' => 'Your role cannot modify 13th month records.'], 403);
    }
    $b = requestBody();
    $rows = $b['rows'] ?? null;
    if (!is_array($rows) || !count($rows)) {
        respond(['ok' => false, 'message' => 'No 13th month rows to save.'], 422);
    }

    $pdo = db();
    $pdo->beginTransaction();
    try {
        $latest = $pdo->prepare(
            'SELECT payroll_id FROM payroll WHERE employee_id = ?
             ORDER BY payroll_id DESC LIMIT 1'
        );
        // Replace any previous record for the employee (linked either directly
        // by employee_id or through their old payroll rows).
        $delForEmp = $pdo->prepare(
            'DELETE FROM thirteenth_month_pay
             WHERE employee_id = ?
                OR payroll_id IN (SELECT payroll_id FROM payroll WHERE employee_id = ?)'
        );
        $ins = $pdo->prepare(
            'INSERT INTO thirteenth_month_pay (payroll_id, employee_id, amount, payment_date, status)
             VALUES (?, ?, ?, NULL, ?)'
        );
        $saved = 0;
        foreach ($rows as $r) {
            $empId  = (int)($r['empId'] ?? 0);
            $amount = round((float)($r['amount'] ?? 0), 2);
            if ($empId <= 0) continue;
            // Optional: attach to the employee's most recent payroll run when one exists.
            $latest->execute([$empId]);
            $payrollId = $latest->fetchColumn();
            $delForEmp->execute([$empId, $empId]);
            $ins->execute([$payrollId !== false ? (int)$payrollId : null, $empId, $amount, 'Pending']);
            $saved++;
        }
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        respond(['ok' => false, 'message' => '13th month save failed: ' . $e->getMessage()], 500);
    }

    audit((int)$u['id'], $u['email'], $u['role'], 'thirteenth_month_save', 'thirteenth_month_pay', null,
          'Posted ' . $saved . ' 13th month pay record(s)');

    // Return the fresh records so the client can update its store directly.
    $fresh = loadState();
    respond(['ok' => true, 'saved' => $saved, 'records' => $fresh['thirteenthMonth']]);
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
                a.username AS employeeEmail,
                CAST(a.account_id AS CHAR) AS id,
                a.username,
                CASE e.department
                             WHEN 1 THEN 'Finance'
                             WHEN 2 THEN 'HR'
                             WHEN 3 THEN 'Administration'
                             WHEN 4 THEN 'IT'
                             WHEN 5 THEN 'Procurement'
                             WHEN 6 THEN 'Inventory'
                             WHEN 7 THEN 'Sales'
                             WHEN 8 THEN 'Production'
                         ELSE ''
                         END AS dept,
                COALESCE(NULLIF(a.position, ''), e.position) AS position,
                CONCAT(CASE e.department
                            WHEN 1 THEN 'Finance'
                            WHEN 2 THEN 'HR'
                            WHEN 3 THEN 'Administration'
                            WHEN 4 THEN 'IT'
                            WHEN 5 THEN 'Procurement'
                            WHEN 6 THEN 'Inventory'
                            WHEN 7 THEN 'Sales'
                            WHEN 8 THEN 'Production'
                            ELSE ''
                       END, ' ', a.position) AS role,
                a.status,
                e.contact_info AS phone
         FROM employees e
         JOIN accounts a ON a.employee_id = e.employee_id
         ORDER BY e.employee_id"
    )->fetchAll();

    foreach ($rows as &$r) {
        $r['id']         = $r['id']         ?: '';
        $r['fullName']   = $r['fullName']   ?: '';
        $r['email']      = $r['employeeEmail'] ?: '';
        $r['username']   = $r['username']   ?: '';
        $r['department'] = $r['dept'] ?: '';
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
    $up = db()->prepare('UPDATE accounts SET status="Active" WHERE account_id=?');
    $up->execute([$id]);
    audit((int)$u['id'], $u['email'], $u['role'], 'approve_user', 'account', $id);
    respond(['ok' => true, 'message' => 'Account approved.']);
}

// ---------- USERS.REJECT ----------
if ($action === 'users.reject' && $method === 'POST') {
    $u = requireUser();
    if (!isHrAdmin($u)) respond(['ok' => false, 'message' => 'Forbidden.'], 403);
    $id = (int)(requestBody()['id'] ?? 0);
    if (!$id) respond(['ok' => false, 'message' => 'Missing user id.'], 422);
    $up = db()->prepare('UPDATE accounts SET status="Rejected" WHERE account_id=?');
    $up->execute([$id]);
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

    // The HR admin must retype their own HR account password before changing
    // someone else's password. This is checked against the database, not the browser.
    $adminPassword = (string)($b['adminPassword'] ?? '');
    $adminStmt = db()->prepare('SELECT password FROM accounts WHERE account_id=?');
    $adminStmt->execute([(int)$u['id']]);
    $adminRow = $adminStmt->fetch();
    if (!$adminRow || $adminPassword === '' || !password_verify($adminPassword, $adminRow['password'])) {
        respond(['ok' => false, 'message' => 'Your HR account password is incorrect.'], 422);
    }

    // The new password is typed by the HR admin and follows the same policy
    // used when creating an account.
    $password        = (string)($b['password'] ?? '');
    $confirmPassword = (string)($b['confirmPassword'] ?? '');
    if (strlen($password) < 10
        || !preg_match('/[A-Z]/', $password)
        || !preg_match('/[0-9\x21-\x2F\x3A-\x40\x5B-\x60\x7B-\x7E]/', $password)) {
        respond(['ok' => false, 'message' => 'New password must be at least 10 characters with an uppercase letter and a number.'], 422);
    }
    if ($password !== $confirmPassword) {
        respond(['ok' => false, 'message' => 'New passwords do not match.'], 422);
    }

    db()->prepare('UPDATE accounts SET password=? WHERE account_id=?')
        ->execute([password_hash($password, PASSWORD_DEFAULT), $id]);
    audit((int)$u['id'], $u['email'], $u['role'], 'reset_password', 'account', $id);
    respond(['ok' => true, 'message' => 'Password updated successfully.']);
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
    // Phone must be exactly 11 digits (e.g. 09123456789).
    if (!preg_match('/^\d{11}$/', $phone)) respond(['ok' => false, 'message' => 'Phone number must be exactly 11 digits.'], 422);
    // Password policy: at least 10 characters, one uppercase letter,
    // and at least one number or symbol.
    if (strlen($password) < 10
        || !preg_match('/[A-Z]/', $password)
        || !preg_match('/[0-9\x21-\x2F\x3A-\x40\x5B-\x60\x7B-\x7E]/', $password)) {
        respond(['ok' => false, 'message' => 'Password must be at least 10 characters with one uppercase letter and one number or symbol.'], 422);
    }
    if ($password !== $confirmPassword) respond(['ok' => false, 'message' => 'Passwords do not match.'], 422);
    if (!in_array($department, ['HR', 'Finance', 'Procurement', 'Inventory', 'Sales', 'Production'], true)) {
        respond(['ok' => false, 'message' => 'Invalid department.'], 422);
    }
    // Position must match the department: Procurement accounts are Buyer/Manager,
    // Inventory accounts use the real warehouse roles, every other department
    // uses Staff/Admin.
    if ($department === 'Procurement') {
        if (!in_array($position, ['Buyer', 'Manager'], true)) {
            respond(['ok' => false, 'message' => 'Procurement accounts must be Buyer or Manager.'], 422);
        }
    } elseif ($department === 'Inventory') {
        if (!in_array($position, ['Warehouse Manager', 'Inventory Staff', 'Warehouse Staff', 'Inventory Controller', 'Picker and Packer', 'Shipping and Receiving Clerk'], true)) {
            respond(['ok' => false, 'message' => 'Inventory accounts must use a valid warehouse position.'], 422);
        }
    } elseif ($department === 'Production') {
        if (!in_array($position, ['Staff', 'Supervisor'], true)) {
            respond(['ok' => false, 'message' => 'Production accounts must be Staff or Supervisor.'], 422);
        }
    } elseif (!in_array($position, ['Staff', 'Admin'], true)) {
        respond(['ok' => false, 'message' => 'Position must be Staff or Admin.'], 422);
    }
    if ($salary < 0) respond(['ok' => false, 'message' => 'Salary cannot be negative.'], 422);

    // Derive the role string used elsewhere in the app.
    $role = $department . ' ' . $position;

    $pdo = db();

    // Email must be unique.
    $dup = $pdo->prepare('SELECT account_id FROM accounts WHERE username = ? LIMIT 1');
    $dup->execute([$email]);
    if ($dup->fetch()) respond(['ok' => false, 'message' => 'That email is already in use.'], 422);

    $deptId = departmentIdFromLabel($department);

    // Ensure the defaults table exists BEFORE the transaction: DDL would
    // implicitly commit the transaction started below.
    ensurePageAccessDefaultsTable();

    $pdo->beginTransaction();
    try {
        // 1. Insert the employee.
        $empIns = $pdo->prepare(
            'INSERT INTO employees (name, position, department,
                                    contact_info, employment_status, basic_salary, date_hired)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $empIns->execute([
            $fullName,
            $position,
            $deptId,
            $phone,
            $status,
            $salary,
            $joined,
        ]);
        $employeeId = (int)$pdo->lastInsertId();

        // 2. Insert the account tied to that employee.
        $accIns = $pdo->prepare(
            'INSERT INTO accounts (employee_id, username, password, position, status, created_at)
             VALUES (?, ?, ?, ?, "Active", NOW())'
        );
        $accIns->execute([
            $employeeId, $email,
            password_hash($password, PASSWORD_DEFAULT),
            $position,
        ]);
        $accountId = (int)$pdo->lastInsertId();

        // New accounts inherit the saved group defaults for their
        // department+position (saved from the User Permission page).
        applyAccessDefaultsToAccount($accountId, $deptId, $position);

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
        "SELECT t.log_id AS id, t.timestamp AS at, t.action, t.module AS entity,
                t.record_id AS entityId, t.description AS details,
                CONCAT(a.username, '|', CASE e.department 
                    WHEN 1 THEN 'Finance' 
                    WHEN 2 THEN 'HR'
                    WHEN 3 THEN 'Administration' 
                    WHEN 5 THEN 'Procurement' 
                    WHEN 6 THEN 'Inventory' 
                    WHEN 7 THEN 'Sales' 
                    WHEN 8 THEN 'Production'
                    ELSE '' 
                END, ' ', a.position) AS actor
         FROM audit_trail t
         INNER JOIN accounts a ON a.account_id = t.user_id
         INNER JOIN employees e ON e.employee_id = a.employee_id
         WHERE e.department = 2
         ORDER BY t.log_id DESC LIMIT 500"
    )->fetchAll();
    respond(['ok' => true, 'events' => $rows]);
}

// ---------- NOTIFICATIONS (HR) ----------
// Same idea as Finance: the bell shows real data changes made by HR users.
// Login/logout stay in the audit trail but never notify. Read state is stored
// per user in notification_reads so it survives a refresh.
if ($action === 'notifications' && $method === 'GET') {
    $u = requireUser();
    if (!isHrAdmin($u)) respond(['ok' => false, 'message' => 'Forbidden.'], 403);
    $pdo = db();
    $limit = max(1, min(100, (int)($_GET['limit'] ?? 20)));

    $stmt = $pdo->prepare("
        SELECT at.log_id AS id, at.timestamp AS at, at.action, at.module,
               at.description, at.new_value AS actor, e.name AS actor_name,
               nr.log_id IS NULL AS unread
        FROM audit_trail at
        INNER JOIN accounts a ON a.account_id = at.user_id
        INNER JOIN employees e ON e.employee_id = a.employee_id
        LEFT JOIN notification_reads nr ON nr.log_id = at.log_id AND nr.user_id = ?
        WHERE e.department = 2
          AND at.action NOT IN ('login', 'logout')
        ORDER BY at.log_id DESC LIMIT $limit
    ");
    $stmt->execute([(int)$u['id']]);
    $logs = $stmt->fetchAll();

    $entityLabels = [
        'leave'                => ['Leave',          '🌴', 'orange', 'leave'],
        'attendance'           => ['Attendance',     '🕒', 'blue',   'attendance'],
        'employee'             => ['Employee',       '👥', 'blue',   'employees'],
        'payroll'              => ['Payroll',        '💼', 'green',  'payroll'],
        'deduction'            => ['Deduction',      '💸', 'orange', 'deductions'],
        'settings'             => ['HR Settings',    '⚙️', 'purple', 'settings'],
        'store'                => ['HR Data',        '🗂️', 'blue',   'dashboard'],
        'account'              => ['Account',        '👤', 'blue',   'accountManagement'],
        'thirteenth_month_pay' => ['13th Month Pay', '🧧', 'green',  '13thmonth'],
    ];
    $changeLabels = [
        'approved'        => 'Approved',
        'rejected'        => 'Rejected',
        'created'         => 'Created',
        'added'           => 'Added',
        'deleted'         => 'Deleted',
        'updated'         => 'Updated',
        'submitted'       => 'Submitted',
        'saved'           => 'Saved',
        'clock_in'        => 'Time-In Recorded',
        'clock_out'       => 'Time-Out Recorded',
        'request_leave'   => 'Requested',
        'profile_update'  => 'Profile Updated',
        'password_update' => 'Password Changed',
        'reset_password'  => 'Password Reset',
        'approve_user'    => 'Approved',
        'reject_user'     => 'Rejected',
        'set_status'      => 'Status Changed',
        'save_access'     => 'Permissions Updated',
        'save_access_bulk'=> 'Permissions Updated',
        'thirteenth_month_save' => 'Saved',
    ];
    $goodChanges  = ['approved', 'created', 'added', 'saved', 'approve_user'];
    $badChanges   = ['rejected', 'deleted', 'reject_user', 'reset_password'];
    $warnChanges  = ['updated', 'submitted', 'clock_out', 'set_status', 'save_access', 'save_access_bulk', 'profile_update', 'password_update'];

    $notifications = [];
    foreach ($logs as $log) {
        $actorParts = explode('|', (string)$log['actor']);
        $email = $actorParts[0] ?? 'System';
        $actor = trim((string)($log['actor_name'] ?? '')) ?: $email;

        $module = strtolower(trim((string)$log['module']));
        $action = strtolower(trim((string)$log['action']));
        $bits = explode(':', $module, 2);
        $entity = $bits[0];
        $change = $bits[1] ?? $action;

        $label = $entityLabels[$entity] ?? [ucfirst($entity ?: 'System'), '🔔', 'blue', 'dashboard'];
        [$entityName, $icon, $color, $page] = $label;
        $title = $entityName . ' ' . ($changeLabels[$change] ?? ($changeLabels[$action] ?? 'Updated'));
        if (in_array($change, $goodChanges, true)) $color = 'green';
        elseif (in_array($change, $badChanges, true)) $color = 'red';
        elseif (in_array($change, $warnChanges, true)) $color = 'orange';

        $desc = trim((string)$log['description']) ?: ('Changed ' . ($entity ?: 'record'));
        $desc .= ' — by ' . $actor;

        $notifications[] = [
            'id'     => 'n-' . $log['id'],
            'logId'  => (int)$log['id'],
            'title'  => $title,
            'desc'   => $desc,
            'time'   => date('M d, H:i', strtotime((string)$log['at'])),
            'icon'   => $icon,
            'color'  => $color,
            'unread' => (bool)$log['unread'],
            'page'   => $page,
            'type'   => $color === 'red' ? 'alert' : 'info',
        ];
    }
    respond(['ok' => true, 'notifications' => $notifications]);
}

// ---------- MARK NOTIFICATIONS READ ----------
if ($action === 'notifications.markRead' && $method === 'POST') {
    $u = requireUser();
    if (!isHrAdmin($u)) respond(['ok' => false, 'message' => 'Forbidden.'], 403);
    $ids = requestBody()['ids'] ?? null;
    $ids = is_array($ids) ? array_values(array_filter(array_map('intval', $ids))) : [];

    $pdo = db();
    if ($ids) {
        $stmt = $pdo->prepare('INSERT IGNORE INTO notification_reads (user_id, log_id) VALUES (?, ?)');
        foreach ($ids as $logId) {
            if ($logId > 0) $stmt->execute([(int)$u['id'], $logId]);
        }
    } else {
        $pdo->prepare("
            INSERT IGNORE INTO notification_reads (user_id, log_id)
            SELECT ?, at.log_id
            FROM audit_trail at
            INNER JOIN accounts a ON a.account_id = at.user_id
            INNER JOIN employees e ON e.employee_id = a.employee_id
            WHERE e.department = 2
              AND at.action NOT IN ('login', 'logout')
        ")->execute([(int)$u['id']]);
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
    // Stored page permissions (user_page_access table). Empty map = no
    // explicit restrictions saved for this account.
    $access = [];
    $stmt = db()->prepare('SELECT page_key, allowed FROM user_page_access WHERE account_id = ?');
    $stmt->execute([$targetId]);
    foreach ($stmt->fetchAll() as $row) {
        $access[$row['page_key']] = (int)$row['allowed'] === 1;
    }
    respond(['ok' => true, 'userId' => (string)$targetId, 'access' => $access]);
}

// ---------- PAGE ACCESS catalog ----------
if ($action === 'access.catalog' && $method === 'GET') {
    requireUser();
    respond(['ok' => true, 'catalog' => [
        'HR' => [
            'label' => 'HR',
            'pages' => [
                'dashboard'    => 'Dashboard',
                'employees'    => 'Employees Master',
                'attendance'   => 'Attendance',
                'leave'            => 'Leave Request',
                'payroll'          => 'Payroll',
                'payrollHistory'   => 'Payroll History',
                'accountManagement'=> 'Account Management',
                'contribution'     => 'Contribution',
                '13thmonth'        => '13th Month Pay',
                'deductions'       => 'Deductions',
                'auditTrail'       => 'Audit Trail',
                'support'          => 'Support',
                'settings'         => 'Settings',
            ],
        ],
        'Finance' => [
            'label' => 'Finance',
            // Finance keys are namespaced with "fin" so they never collide
            // with HR keys (dashboard, settings, auditTrail, support, ...).
            // Unchecking HR Dashboard must not hide Finance Dashboard.
            'pages' => [
                'finDashboard'             => 'Dashboard',
                'finChartAccounts'         => 'Chart of Accounts',
                'finPayables'              => 'Accounts Payable',
                'finReceivables'           => 'Accounts Receivable',
                'finCashBank'              => 'Cash / Bank',
                'finExpenses'              => 'Expenses',
                'finQuotations'            => 'Quotations',
                'finFinancialReports'      => 'Financial Reports',
                'finPaymentManagement'     => 'Payment Management',
                'finFinancialTransactions' => 'Financial Transactions',
                'finBankReconciliation'    => 'Bank Reconciliation',
                'finAuditTrail'            => 'Audit Trail',
                'finSupport'               => 'Support',
                'finSettings'              => 'Settings',
            ],
        ],
        'Production' => [
            'label' => 'Production',
            // Unique prod* keys so they never collide with HR/Finance page keys
            // in user_page_access. Matrix matches the Production permission doc:
            // Staff vs Supervisor (restricted rows noted in the UI).
            'pages' => [
                'prodDashboard'          => 'Dashboard',
                'prodBom'                => 'Bill of Materials',
                'prodMaterialsSchedule'  => 'Materials Schedule',
                'prodMaterialsChecklist' => 'Materials Checklist',
                'prodOrders'             => 'Production Orders (list, new order)',
                'prodOrderDetails'       => 'Order Details (advance stage, Finish production)',
                'prodMaterialIssuance'   => 'Material Issuance',
                'prodInvAddStock'        => 'Materials Inventory: add stock',
                'prodInvSetStock'        => 'Materials Inventory: set/overwrite stock',
                'prodMonitoring'         => 'Monitoring (read-only)',
                'prodDeliveryMonitoring' => 'Delivery Monitoring (read-only)',
                'prodQcView'             => 'Quality Control: view list',
                'prodQcApprove'          => 'Quality Control: approve/reject',
                'prodHistory'            => 'Production History',
                'prodCosting'            => 'Costing',
                'prodFinishedGoods'      => 'Finished Goods',
                'prodSupervisorDashboard'=> 'Supervisor Dashboard',
                'prodAccounts'           => 'Accounts (add, deactivate, change password)',
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

    $sql  = 'SELECT a.account_id FROM accounts a JOIN employees e ON e.employee_id = a.employee_id WHERE 1=1';
    $args = [];
    if ($position !== '')   { $sql .= ' AND a.position = ?'; $args[] = $position; }
    if ($department !== '') { $sql .= ' AND e.department = ?'; $args[] = departmentIdFromLabel($department); }
    $stmt = db()->prepare($sql);
    $stmt->execute($args);
    $ids = array_column($stmt->fetchAll(), 'account_id');

    // Group saves always record the department+position defaults so accounts
    // created later inherit them — even when no account exists yet.
    ensurePageAccessDefaultsTable();
    if ($department !== '') {
        saveAccessDefaults(departmentIdFromLabel($department), $position, $access);
    } else {
        // "All Departments": record the same defaults for every department
        // that has a permission catalog (HR, Finance, Production).
        foreach (['Finance', 'HR', 'Production'] as $catalogDept) {
            saveAccessDefaults(departmentIdFromLabel($catalogDept), $position, $access);
        }
    }

    if (!$ids) {
        respond([
            'ok' => true,
            'message' => 'No accounts in this group yet — permissions saved as the default for future accounts.',
            'count' => 0, 'userIds' => []
        ]);
    }

    foreach ($ids as $uid) saveAccessForUser((int)$uid, $access);
    audit((int)$u['id'], $u['email'], $u['role'], 'save_access_bulk', 'account', null,
          sprintf('Position=%s · Department=%s · %d user(s)',
                  $position ?: 'All', $department ?: 'All', count($ids)));
    respond(['ok' => true, 'message' => 'Access updated for ' . count($ids) . ' user(s).',
             'count' => count($ids), 'userIds' => $ids]);
}

// ---------- PAGE ACCESS defaults read ----------
if ($action === 'access.defaults' && $method === 'GET') {
    requireUser();
    $department = trim((string)($_GET['department'] ?? ''));
    $position   = trim((string)($_GET['position'] ?? ''));
    if ($department === '') respond(['ok' => true, 'access' => new stdClass()]);
    $map = loadAccessDefaults(departmentIdFromLabel($department), $position);
    respond(['ok' => true, 'access' => $map ?: new stdClass()]);
}

// ---------- PAGE ACCESS DEFAULTS (group-level) ----------
// Group defaults let HR save permissions for a department+position group that
// has no accounts yet (e.g. Production/Staff). Accounts created afterwards
// inherit these defaults automatically at creation time.
function ensurePageAccessDefaultsTable(): void
{
    // Called BEFORE any surrounding transaction: DDL implicitly commits.
    db()->exec(
        'CREATE TABLE IF NOT EXISTS page_access_defaults (
            department_id TINYINT UNSIGNED NOT NULL,
            position VARCHAR(50) NOT NULL DEFAULT "",
            page_key VARCHAR(40) NOT NULL,
            allowed TINYINT(1) NOT NULL DEFAULT 1,
            PRIMARY KEY (department_id, position, page_key)
        ) ENGINE=InnoDB'
    );
}

function saveAccessDefaults(int $departmentId, string $position, array $access): void
{
    ensurePageAccessDefaultsTable();
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $pdo->prepare('DELETE FROM page_access_defaults WHERE department_id = ? AND position = ?')
            ->execute([$departmentId, $position]);
        $ins = $pdo->prepare(
            'INSERT INTO page_access_defaults (department_id, position, page_key, allowed) VALUES (?, ?, ?, ?)'
        );
        foreach ($access as $pageKey => $allowed) {
            $key = trim((string)$pageKey);
            if (!preg_match('/^[a-z0-9_]{1,40}$/i', $key)) continue;
            $ins->execute([$departmentId, $position, $key, !empty($allowed) ? 1 : 0]);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

// Apply the saved group defaults to a freshly created account. Exact
// position rows win over the department-wide ("") rows for the same key.
// Caller must run ensurePageAccessDefaultsTable() BEFORE opening its
// transaction — CREATE TABLE would implicitly commit it.
function applyAccessDefaultsToAccount(int $accountId, int $departmentId, string $position): void
{
    $pdo = db();
    $stmt = $pdo->prepare(
        'SELECT page_key, allowed FROM page_access_defaults
         WHERE department_id = ? AND position IN (?, "")
         ORDER BY (position = ?) DESC'
    );
    $stmt->execute([$departmentId, $position, $position]);
    $applied = [];
    foreach ($stmt->fetchAll() as $row) {
        $key = (string)$row['page_key'];
        if (isset($applied[$key])) continue; // exact position already won
        $applied[$key] = (int)$row['allowed'];
    }
    if (!$applied) return;
    $ins = $pdo->prepare(
        'INSERT IGNORE INTO user_page_access (account_id, page_key, allowed) VALUES (?, ?, ?)'
    );
    foreach ($applied as $key => $allowed) {
        $ins->execute([$accountId, $key, $allowed]);
    }
}

function loadAccessDefaults(int $departmentId, string $position): array
{
    ensurePageAccessDefaultsTable();
    $stmt = db()->prepare(
        'SELECT page_key, allowed FROM page_access_defaults
         WHERE department_id = ? AND position IN (?, "")
         ORDER BY (position = ?) DESC'
    );
    $stmt->execute([$departmentId, $position, $position]);
    $map = [];
    foreach ($stmt->fetchAll() as $row) {
        $key = (string)$row['page_key'];
        if (isset($map[$key])) continue; // exact position already won
        $map[$key] = (int)$row['allowed'] === 1;
    }
    return $map;
}

function saveAccessForUser(int $userId, array $access): void
{
    // Persist per-page permissions in the user_page_access table.
    // page keys are validated; allowed must be 0/1.
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $pdo->prepare('DELETE FROM user_page_access WHERE account_id = ?')->execute([$userId]);
        $ins = $pdo->prepare(
            'INSERT INTO user_page_access (account_id, page_key, allowed) VALUES (?, ?, ?)'
        );
        foreach ($access as $pageKey => $allowed) {
            $key = trim((string)$pageKey);
            if (!preg_match('/^[a-z0-9_]{1,40}$/i', $key)) continue;
            $ins->execute([$userId, $key, !empty($allowed) ? 1 : 0]);
        }
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
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