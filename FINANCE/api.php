<?php
// ITPROFEL/FINANCE/api.php
declare(strict_types=1);

require_once dirname(__DIR__) . '/root/db.php';
require_once __DIR__ . '/sales_integration.php';
require_once __DIR__ . '/production_integration.php';

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

/* Re-authentication: sensitive Finance actions ask for the signed-in user's
   own password again, checked against the account's stored hash. */
function verifyUserPassword(array $u, string $password): bool
{
    if ($password === '') return false;
    try {
        $stmt = db()->prepare('SELECT password FROM accounts WHERE account_id = ? LIMIT 1');
        $stmt->execute([(int)($u['id'] ?? 0)]);
        $hash = $stmt->fetchColumn();
        return is_string($hash) && $hash !== '' && password_verify($password, $hash);
    } catch (Throwable $e) {
        error_log('Password verification failed: ' . $e->getMessage());
        return false;
    }
}

/* Persist AP settlements: an Accounts Payable invoice covered by completed
   Finance transactions is stored as Paid, with a payment_transactions row as
   its payment_id, so the stored row and every screen agree without relying on
   the client-side derivation. Idempotent — paid rows are skipped. */
function syncAccountsPayablePayments(PDO $pdo): int
{
    $rows = $pdo->query(
        "SELECT ap.ap_id, ap.invoice_no, ap.amount, ap.payment_id,
                COALESCE(s.supplier_name, '') AS vendor
           FROM accounts_payable ap
           LEFT JOIN suppliers s ON s.supplier_id = ap.supplier_id
          WHERE LOWER(TRIM(COALESCE(ap.status, ''))) NOT IN ('paid', 'partially paid', 'partial')
          ORDER BY ap.ap_id"
    )->fetchAll(PDO::FETCH_ASSOC);
    if (!$rows) return 0;

    // Only real AP payments settle a bill. Production costing, payroll and
    // other Procurement entries can reuse the same invoice/PO as reference,
    // but they are costs, not payments — counting them used to mark every
    // payable as Paid and leave the Chart of Accounts at zero.
    $sumStmt = $pdo->prepare(
        "SELECT COALESCE(SUM(amount), 0) AS paid, MAX(transaction_date) AS paid_on
           FROM financial_transactions
          WHERE LOWER(TRIM(COALESCE(reference_no, ''))) = LOWER(?)
            AND LOWER(TRIM(COALESCE(status, ''))) IN ('completed', 'paid', 'approved')
            AND LOWER(TRIM(COALESCE(description, ''))) IN ('accounts payable', 'supplier pay')"
    );
    $findPayment = $pdo->prepare(
        "SELECT transaction_id FROM payment_transactions
          WHERE LOWER(TRIM(COALESCE(reference_no, ''))) = LOWER(?)
            AND LOWER(TRIM(COALESCE(status, ''))) IN ('completed', 'paid', 'approved')
          ORDER BY transaction_id LIMIT 1"
    );
    $linkedPaid = $pdo->prepare(
        "SELECT 1 FROM payment_transactions
          WHERE transaction_id = ?
            AND LOWER(TRIM(COALESCE(status, ''))) IN ('completed', 'paid', 'approved')
          LIMIT 1"
    );
    $insertPayment = $pdo->prepare(
        'INSERT INTO payment_transactions
         (account_id, payment_type, amount, transaction_date, reference_no, status, description)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    $markPaid = $pdo->prepare(
        "UPDATE accounts_payable SET status = 'Paid', payment_id = ? WHERE ap_id = ?"
    );
    $cashAccountId = (int)($pdo->query(
        'SELECT account_id FROM cash_bank ORDER BY account_id LIMIT 1'
    )->fetchColumn() ?: 0);

    $updated = 0;
    foreach ($rows as $ap) {
        $apId      = (int)$ap['ap_id'];
        $invoice   = trim((string)($ap['invoice_no'] ?? ''));
        $vendor    = trim((string)($ap['vendor'] ?? ''));
        $amount    = (float)$ap['amount'];
        $paymentId = (int)($ap['payment_id'] ?? 0);

        // Already linked to a completed payment.
        if ($paymentId > 0) {
            $linkedPaid->execute([$paymentId]);
            if ($linkedPaid->fetchColumn()) {
                $markPaid->execute([$paymentId, $apId]);
                $updated++;
                continue;
            }
        }

        if ($invoice === '' || $amount <= 0) continue;

        $sumStmt->execute([$invoice]);
        $settled = $sumStmt->fetch(PDO::FETCH_ASSOC) ?: ['paid' => 0, 'paid_on' => null];
        if ((float)$settled['paid'] + 0.005 < $amount) continue;

        $findPayment->execute([$invoice]);
        $paymentId = (int)($findPayment->fetchColumn() ?: 0);
        if ($paymentId === 0) {
            // payment_transactions.account_id is required and points at a real
            // cash/bank account; without one the link cannot be written.
            if ($cashAccountId <= 0) continue;
            $insertPayment->execute([
                $cashAccountId,
                'Bank Transfer',
                $amount,
                $settled['paid_on'] ?: date('Y-m-d'),
                $invoice,
                'Completed',
                'AP settlement for ' . $invoice . ($vendor !== '' ? ' · ' . $vendor : ''),
            ]);
            $paymentId = (int)$pdo->lastInsertId();
        }
        $markPaid->execute([$paymentId, $apId]);
        $updated++;
    }
    return $updated;
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

/* The money accounts (cash_bank) plus the movements they should show.
   Both the Cash / Bank page and the Chart of Accounts read these figures, so
   the two screens can never disagree: an account balance is its recorded
   balance plus money in minus money out, recomputed on every load. */
function financeCashMovements(PDO $pdo): array
{
    $cashChartId = (int)($pdo->query(
        "SELECT account_id FROM charts_of_accounts
          WHERE LOWER(TRIM(COALESCE(account_type, ''))) = 'asset'
          ORDER BY CASE WHEN account_code = '1000' OR LOWER(COALESCE(account_name, '')) LIKE '%cash%' THEN 0 ELSE 1 END,
                   account_code
          LIMIT 1"
    )->fetchColumn() ?: 0);

    // Money in: Sales collections recorded against a receivable, plus Sales
    // ledger transactions (collections already recorded there are skipped).
    $in = [];
    $collections = $pdo->query(
        "SELECT pt.amount, COALESCE(pt.payment_type, '') AS method
           FROM payment_transactions pt
          WHERE LOWER(TRIM(COALESCE(pt.status, ''))) IN ('completed', 'paid', 'approved')
            AND EXISTS (SELECT 1 FROM accounts_receivable ar WHERE ar.payment_id = pt.transaction_id)
            AND NOT EXISTS (
                SELECT 1 FROM financial_transactions ft2
                 WHERE LOWER(TRIM(COALESCE(ft2.reference_no, ''))) = LOWER(TRIM(COALESCE(pt.reference_no, '')))
                   AND LOWER(TRIM(COALESCE(ft2.transaction_type, ''))) = 'sales'
                   AND ft2.amount = pt.amount)"
    )->fetchAll(PDO::FETCH_ASSOC);
    foreach ($collections as $c) {
        $in[] = [
            'amount'       => (float)$c['amount'],
            'is_cash'      => strtolower(trim((string)$c['method'])) === 'cash',
            'account_id'   => 0,
            'account_type' => '',
        ];
    }

    // Money out: every non-Sales financial transaction. A payment counts as
    // cash when its method is Cash or when it was posted to the cash account.
    $out = [];
    $rows = $pdo->query(
        "SELECT ft.amount, ft.transaction_type, ft.payment_method, ft.account_id,
                a.account_type
           FROM financial_transactions ft
           LEFT JOIN charts_of_accounts a ON a.account_id = ft.account_id"
    )->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as $t) {
        $amount = (float)$t['amount'];
        if ($amount == 0.0) continue;
        $postedId   = (int)($t['account_id'] ?? 0);
        $postedType = strtolower(trim((string)($t['account_type'] ?? '')));
        $entry = [
            'amount'       => $amount,
            'is_cash'      => strtolower(trim((string)($t['payment_method'] ?? ''))) === 'cash'
                || ($cashChartId > 0 && $postedId === $cashChartId),
            'account_id'   => $postedId,
            'account_type' => $postedType,
        ];
        if (strtolower(trim((string)$t['transaction_type'])) === 'sales') $in[] = $entry;
        else $out[] = $entry;
    }

    return ['in' => $in, 'out' => $out];
}

/* Balance of every cash_bank row: its recorded balance plus the movements that
   belong to its account. The newest row of each account name is the one the
   Cash / Bank page lists, so it is the row that carries the movements. */
function cashBankBalances(PDO $pdo): array
{
    $rows = $pdo->query(
        'SELECT account_id, account_name, balance FROM cash_bank ORDER BY account_id'
    )->fetchAll(PDO::FETCH_ASSOC);
    $balances = [];
    if (!$rows) return $balances;

    $accounts = [];
    foreach ($rows as $r) {
        $key = strtolower(trim((string)$r['account_name']));
        $accounts[$key] = [
            'row_id'  => (int)$r['account_id'],
            'is_cash' => strpos($key, 'cash') !== false,
            'balance' => (float)$r['balance'],
        ];
        $balances[(int)$r['account_id']] = (float)$r['balance'];
    }

    $primaryCash = '';
    $primaryBank = '';
    foreach ($accounts as $key => $a) {
        if ($a['is_cash']) $primaryCash = $key;
        else $primaryBank = $key;
    }
    // Money with no account of its type lands in the other one, so no movement
    // is ever dropped from the totals.
    $cashSpot = $primaryCash !== '' ? $primaryCash : $primaryBank;
    $bankSpot = $primaryBank !== '' ? $primaryBank : $cashSpot;

    $movements = financeCashMovements($pdo);
    foreach ($movements['in'] as $m) {
        $target = $m['is_cash'] ? $cashSpot : $bankSpot;
        if ($target !== '') $accounts[$target]['balance'] += (float)$m['amount'];
    }
    foreach ($movements['out'] as $m) {
        $target = $m['is_cash'] ? $cashSpot : $bankSpot;
        if ($target !== '') $accounts[$target]['balance'] -= (float)$m['amount'];
    }

    foreach ($accounts as $a) {
        $balances[$a['row_id']] = round($a['balance'], 2);
    }
    return $balances;
}

/* Chart of accounts balances: Cash and Bank are the totals of the money
   accounts above, so they always match the Cash / Bank page. */
function chartAccountBalances(PDO $pdo): array
{
    $accounts = $pdo->query(
        "SELECT account_id, account_code, account_name, account_type,
                COALESCE(normal_balance, CASE WHEN account_type IN ('Liability','Equity','Income','Revenue')
                     THEN 'Credit' ELSE 'Debit' END) AS normal_balance
           FROM charts_of_accounts ORDER BY account_code"
    )->fetchAll(PDO::FETCH_ASSOC);
    if (!$accounts) return [];

    $ledger = [];
    foreach ($accounts as $a) {
        $ledger[(int)$a['account_id']] = ['debit' => 0.0, 'credit' => 0.0];
    }

    $pick = static function (array $types, array $hints = []) use ($accounts): int {
        foreach ($accounts as $a) {
            if (!in_array(strtolower((string)$a['account_type']), $types, true)) continue;
            if (!$hints) return (int)$a['account_id'];
            foreach ($hints as $hint) {
                if (stripos((string)$a['account_name'], $hint) !== false) return (int)$a['account_id'];
            }
        }
        return 0;
    };

    $cashId = $pick(['asset'], ['cash']);
    $bankId = $pick(['asset'], ['bank']);
    if ($bankId === 0) {
        foreach ($accounts as $a) {
            $id = (int)$a['account_id'];
            if (strtolower((string)$a['account_type']) === 'asset' && $id !== $cashId) {
                $bankId = $id;
                break;
            }
        }
    }
    $apId      = $pick(['liability']);
    $equityId  = $pick(['equity']);
    $revenueId = $pick(['income', 'revenue']);
    $expenseId = $pick(['expense']);

    $debit = static function (int $id, float $amount) use (&$ledger): void {
        if ($id > 0 && $amount != 0.0) $ledger[$id]['debit'] += $amount;
    };
    $credit = static function (int $id, float $amount) use (&$ledger): void {
        if ($id > 0 && $amount != 0.0) $ledger[$id]['credit'] += $amount;
    };

    // Cash and Bank mirror the money accounts exactly.
    $computed = cashBankBalances($pdo);
    $moneyRows = $pdo->query(
        'SELECT account_id, account_name, balance FROM cash_bank ORDER BY account_id'
    )->fetchAll(PDO::FETCH_ASSOC);
    $byName = [];
    foreach ($moneyRows as $r) {
        $byName[strtolower(trim((string)$r['account_name']))] = $r;
    }
    foreach ($byName as $key => $row) {
        $value = $computed[(int)$row['account_id']] ?? (float)$row['balance'];
        $debit(strpos($key, 'cash') !== false ? $cashId : $bankId, $value);
        $credit($equityId, (float)$row['balance']); // recorded money = owner's capital
    }

    // Supplier bills that are still owed.
    $unpaidAp = (float)$pdo->query(
        "SELECT COALESCE(SUM(amount), 0) FROM accounts_payable
          WHERE LOWER(TRIM(COALESCE(status, ''))) NOT IN ('paid', 'partially paid', 'partial')"
    )->fetchColumn();
    $credit($apId, $unpaidAp);

    $movements = financeCashMovements($pdo);
    foreach ($movements['in'] as $m) {
        $credit(in_array($m['account_type'], ['income', 'revenue'], true) && $m['account_id'] > 0
            ? $m['account_id'] : $revenueId, $m['amount']);
    }
    foreach ($movements['out'] as $m) {
        $debit($m['account_type'] === 'expense' && $m['account_id'] > 0
            ? $m['account_id'] : $expenseId, $m['amount']);
    }

    $balances = [];
    foreach ($accounts as $a) {
        $id = (int)$a['account_id'];
        $balances[$id] = strtolower((string)$a['normal_balance']) === 'credit'
            ? $ledger[$id]['credit'] - $ledger[$id]['debit']
            : $ledger[$id]['debit'] - $ledger[$id]['credit'];
    }
    return $balances;
}

function loadState(): array
{
    $pdo = db();
    $accountBalances = chartAccountBalances($pdo);
    $cashBankComputed = cashBankBalances($pdo);
    $accountRows = $pdo->query(
        "SELECT account_id, account_code AS code, account_name AS name, account_type AS type,
                COALESCE(normal_balance, CASE WHEN account_type IN ('Liability','Equity','Income','Revenue')
                     THEN 'Credit' ELSE 'Debit' END) AS normalBalance,
                status, description
           FROM charts_of_accounts ORDER BY account_code"
    )->fetchAll();
    $accounts = array_map(static function (array $row) use ($accountBalances): array {
        $row['balance'] = round((float)($accountBalances[(int)$row['account_id']] ?? 0), 2);
        unset($row['account_id']);
        return $row;
    }, $accountRows);

    return [
        'accounts' => $accounts,
        'receivables' => $pdo->query(
            "SELECT ar.ar_id AS id, ar.sales_id AS salesId, COALESCE(c.customer_name, '') AS customer,
                    ar.invoice_no AS invoice, ar.due_date AS due,
                    ar.amount,
                    CASE
                         WHEN LOWER(TRIM(COALESCE(ar.status,''))) = 'paid' THEN 'Paid'
                         WHEN LOWER(TRIM(COALESCE(ar.status,''))) IN ('partial','partially paid') THEN 'Partially Paid'
                         WHEN LOWER(TRIM(COALESCE(ar.status,''))) IN ('pending','open','due','overdue','unpaid','') THEN 'Unpaid'
                         ELSE ar.status
                    END AS status
             FROM accounts_receivable ar
             LEFT JOIN customers c ON c.customer_id = ar.customer_id
             ORDER BY ar.ar_id DESC"
        )->fetchAll(),
        'payables' => $pdo->query(
            "SELECT ap.ap_id AS id, COALESCE(s.supplier_name, '') AS vendor,
                    ap.invoice_no AS invoice, NULL AS poNumber, ap.due_date AS due,
                    ap.amount, ap.payment_id AS paymentId,
                    CASE WHEN LOWER(TRIM(COALESCE(s.supplier_name, ''))) = 'production department'
                         THEN 'Production' ELSE 'Procurement' END AS source,
                    CASE WHEN LOWER(TRIM(COALESCE(ap.status,''))) = 'paid'
                         THEN 'Paid'
                         WHEN LOWER(TRIM(COALESCE(ap.status,''))) IN ('partial','partially paid')
                         THEN 'Partially Paid'
                         WHEN LOWER(TRIM(COALESCE(ap.status,''))) IN ('pending','open','due','overdue','unpaid','')
                         THEN 'Unpaid'
                         ELSE ap.status END AS status
             FROM accounts_payable ap
             LEFT JOIN suppliers s ON s.supplier_id = ap.supplier_id
             ORDER BY ap.ap_id DESC"
        )->fetchAll(),
        'cashBank' => array_map(static function (array $row) use ($cashBankComputed): array {
            $row['openingBalance'] = (float)$row['balance'];
            $row['balance'] = round((float)($cashBankComputed[(int)$row['id']] ?? $row['balance']), 2);
            return $row;
        }, $pdo->query(
            "SELECT account_id AS id, account_name AS account, account_type AS type,
                    bank_name, account_no AS accountNumber, balance,
                    COALESCE(description,'') AS description,
                    'Active' AS status
             FROM cash_bank ORDER BY account_id"
        )->fetchAll()),
        'expenses' => $pdo->query(
            "SELECT expense_id AS id, expense_category AS category,
                    COALESCE(description,'') AS vendor, expense_date AS date,
                    amount, status,
                    '' AS voucher,
                    '' AS paymentMethod,
                    COALESCE(receipt_reference,'') AS reference,
                    '' AS attachmentName,
                    '' AS attachmentData
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
        // Cash-flow view used by Cash / Bank and the transaction summary:
        // money in = Sales transactions plus Sales collections recorded in
        // payment_transactions (linked from the receivable they settled);
        // money out = every non-Sales financial transaction. Derived here so
        // collections appear without depending on a Sales ledger entry.
        'cashFlow' => [
            'in' => $pdo->query(
                "SELECT ft.transaction_id AS id, ft.transaction_date AS date,
                        COALESCE(ft.reference_no, '') AS reference,
                        'Sales' AS source,
                        COALESCE(ft.description, '') AS description,
                        ft.amount
                   FROM financial_transactions ft
                  WHERE LOWER(TRIM(COALESCE(ft.transaction_type, ''))) = 'sales'
                 UNION ALL
                 SELECT pt.transaction_id AS id, pt.transaction_date AS date,
                        COALESCE(pt.reference_no, '') AS reference,
                        'Sales' AS source,
                        COALESCE(pt.description, '') AS description,
                        pt.amount
                   FROM payment_transactions pt
                  WHERE LOWER(TRIM(COALESCE(pt.status, ''))) IN ('completed', 'paid', 'approved')
                    AND EXISTS (
                        SELECT 1 FROM accounts_receivable ar WHERE ar.payment_id = pt.transaction_id
                    )
                    AND NOT EXISTS (
                        SELECT 1 FROM financial_transactions ft2
                         WHERE LOWER(TRIM(COALESCE(ft2.reference_no, ''))) = LOWER(TRIM(COALESCE(pt.reference_no, '')))
                           AND LOWER(TRIM(COALESCE(ft2.transaction_type, ''))) = 'sales'
                           AND ft2.amount = pt.amount
                    )
                  ORDER BY date DESC"
            )->fetchAll(),
            'out' => $pdo->query(
                "SELECT ft.transaction_id AS id, ft.transaction_date AS date,
                        COALESCE(ft.reference_no, '') AS reference,
                        COALESCE(ft.transaction_type, 'Finance') AS source,
                        COALESCE(ft.description, '') AS description,
                        ft.amount
                   FROM financial_transactions ft
                  WHERE LOWER(TRIM(COALESCE(ft.transaction_type, ''))) <> 'sales'
                  ORDER BY ft.transaction_date DESC, ft.transaction_id DESC"
            )->fetchAll(),
        ],
        'settings' => [
            'company' => 'D.E.V.S Management Inc.',
            'currency' => 'PHP (₱)',
            'cycle' => 'September 15–30, 2026',
            'days' => '5 days (Mon–Fri)',
        ],
    ];
}

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

if ($action === 'sales_invoice_status' && $method === 'GET') {
    $u = requireUser();
    $department = strtolower(trim((string)($u['department'] ?? '')));
    $role = (string)($u['role'] ?? '');
    if ($department !== 'sales' || !in_array($role, ['Sales Admin', 'Sales Staff'], true)
        || (string)($u['status'] ?? '') !== 'Active') {
        respond(['ok' => false, 'message' => 'Only active Sales users can view invoice send status.'], 403);
    }

    try {
        $sentInvoiceIds = db()->query(
            'SELECT sales_id FROM accounts_receivable WHERE COALESCE(sales_id, 0) > 0'
        )->fetchAll(PDO::FETCH_COLUMN);
        respond(['ok' => true, 'sentSalesInvoiceIds' => array_map('intval', $sentInvoiceIds)]);
    } catch (Throwable $e) {
        error_log('Sales invoice status lookup failed: ' . $e->getMessage());
        respond(['ok' => false, 'message' => 'Finance send status could not be loaded.'], 503);
    }
}

// HR owns the payroll records; Finance only reads them and records the payment.
if ($action === 'payroll_records' && $method === 'GET') {
    $u = requireUser();
    if (!isFinanceAdmin($u) && !isHrAdmin($u)) {
        respond(['ok' => false, 'message' => 'Only Finance or HR admins can view payroll records.'], 403);
    }

    try {
        $rows = db()->query(
            "SELECT p.payroll_id AS id,
                    COALESCE(NULLIF(e.name, ''), TRIM(CONCAT_WS(' ', e.first_name, e.last_name))) AS employee,
                    COALESCE(d.department_name, '') AS department,
                    p.payroll_period AS period,
                    p.gross_salary AS gross,
                    p.deductions,
                    p.net_salary AS net,
                    p.status AS hrStatus,
                    p.created_at AS createdAt,
                    ft.transaction_id AS paymentId,
                    ft.reference_no AS paymentReference,
                    ft.transaction_date AS paymentDate
             FROM payroll p
             LEFT JOIN employees e ON e.employee_id = p.employee_id
             LEFT JOIN departments d ON d.department_id = e.department
             LEFT JOIN financial_transactions ft
                    ON ft.transaction_id = (
                        SELECT MAX(f2.transaction_id) FROM financial_transactions f2
                         WHERE f2.payroll_id = p.payroll_id
                           AND LOWER(TRIM(COALESCE(f2.status, ''))) IN ('completed', 'paid', 'approved')
                    )
             ORDER BY p.created_at DESC, p.payroll_id DESC"
        )->fetchAll();
        $payroll = array_map(static function (array $r): array {
            return [
                'id'               => (int)$r['id'],
                'employee'         => (string)($r['employee'] ?? ''),
                'department'       => (string)($r['department'] ?? ''),
                'period'           => (string)($r['period'] ?? ''),
                'gross'            => (float)$r['gross'],
                'deductions'       => (float)$r['deductions'],
                'net'              => (float)$r['net'],
                'hrStatus'         => (string)($r['hrStatus'] ?? ''),
                'createdAt'        => (string)($r['createdAt'] ?? ''),
                'paid'             => !empty($r['paymentId']),
                'paymentReference' => (string)($r['paymentReference'] ?? ''),
                'paymentDate'      => (string)($r['paymentDate'] ?? ''),
            ];
        }, $rows);
        respond(['ok' => true, 'payroll' => $payroll]);
    } catch (Throwable $e) {
        error_log('Payroll records lookup failed: ' . $e->getMessage());
        respond(['ok' => false, 'message' => 'HR payroll records could not be loaded.'], 503);
    }
}

// Paying a payroll record writes the Finance transaction that links back to the
// HR payroll row, so the Payroll Transaction Record shows it as Paid.
if ($action === 'payroll_pay' && $method === 'POST') {
    $u = requireUser();
    if (!isFinanceAdmin($u)) {
        respond(['ok' => false, 'message' => 'Only Finance administrators can pay payroll records.'], 403);
    }
    $body = requestBody();
    $payrollId = filter_var($body['payrollId'] ?? null, FILTER_VALIDATE_INT);
    if ($payrollId === false || $payrollId === null || $payrollId <= 0) {
        respond(['ok' => false, 'message' => 'Select a valid payroll record.'], 422);
    }
    $paymentMethod = trim((string)($body['paymentMethod'] ?? 'Bank Transfer'));
    // The modal sends the account name: Cash/Bank rows can be rebuilt with new
    // IDs on a state save, so a name stays valid when an old numeric id does not.
    $accountName = trim((string)($body['accountName'] ?? ''));
    $accountId = filter_var($body['accountId'] ?? null, FILTER_VALIDATE_INT);
    if ($accountName === '' && ($accountId === false || $accountId === null || $accountId <= 0)) {
        respond(['ok' => false, 'message' => 'Select the account the payment is made from.'], 422);
    }
    $password = (string)($body['password'] ?? '');
    if ($password === '') {
        respond(['ok' => false, 'message' => 'Enter your password to confirm the payment.'], 422);
    }
    if (!verifyUserPassword($u, $password)) {
        respond(['ok' => false, 'message' => 'Incorrect password. The payment was not recorded.'], 422);
    }

    $allowedMethods = ['Bank Transfer', 'Direct Deposit', 'Cheque', 'Cash'];
    if (!in_array($paymentMethod, $allowedMethods, true)) {
        $paymentMethod = 'Bank Transfer';
    }

    $pdo = db();
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare(
            "SELECT p.payroll_id, p.payroll_period, p.net_salary, p.gross_salary, p.deductions,
                    COALESCE(NULLIF(e.name, ''), TRIM(CONCAT_WS(' ', e.first_name, e.last_name)), '') AS employee,
                    COALESCE(d.department_name, '') AS department
             FROM payroll p
             LEFT JOIN employees e ON e.employee_id = p.employee_id
             LEFT JOIN departments d ON d.department_id = e.department
             WHERE p.payroll_id = ? LIMIT 1"
        );
        $stmt->execute([$payrollId]);
        $payroll = $stmt->fetch();
        if (!$payroll) {
            throw new DomainException('The payroll record no longer exists.');
        }

        // The funding account comes from Cash/Bank, so the payment must reduce
        // that account and the matching asset in the Chart of Accounts.
        if ($accountName !== '') {
            $fundingStmt = $pdo->prepare(
                'SELECT account_id, account_name, account_type FROM cash_bank
                  WHERE LOWER(TRIM(account_name)) = LOWER(?) LIMIT 1'
            );
            $fundingStmt->execute([$accountName]);
        } else {
            $fundingStmt = $pdo->prepare(
                'SELECT account_id, account_name, account_type FROM cash_bank WHERE account_id = ? LIMIT 1'
            );
            $fundingStmt->execute([$accountId]);
        }
        $funding = $fundingStmt->fetch();
        if (!$funding) {
            throw new DomainException('Select a valid account to pay from.');
        }
        $accountId = (int)$funding['account_id'];
        $fundingName = strtolower(trim((string)($funding['account_name'] ?? '')));
        $fundingType = strtolower(trim((string)($funding['account_type'] ?? '')));
        $isCash = strpos($fundingName, 'cash') !== false || strpos($fundingType, 'cash') !== false;
        $coaStmt = $pdo->prepare(
            "SELECT account_id FROM charts_of_accounts
              WHERE LOWER(TRIM(COALESCE(account_type, ''))) = 'asset'
              ORDER BY CASE WHEN LOWER(COALESCE(account_name, '')) LIKE LOWER(?) THEN 0 ELSE 1 END,
                       account_code
              LIMIT 1"
        );
        $coaStmt->execute(['%' . ($isCash ? 'cash' : 'bank') . '%']);
        $chartAccountId = (int)($coaStmt->fetchColumn() ?: 0);

        $alreadyPaid = $pdo->prepare(
            "SELECT transaction_id FROM financial_transactions
             WHERE payroll_id = ?
               AND LOWER(TRIM(COALESCE(status, ''))) IN ('completed', 'paid', 'approved')
             LIMIT 1"
        );
        $alreadyPaid->execute([$payrollId]);
        if ($alreadyPaid->fetchColumn()) {
            throw new DomainException('This payroll record is already paid.');
        }

        $today = date('Y-m-d');
        $reference = 'PR-' . str_pad((string)$payrollId, 3, '0', STR_PAD_LEFT);
        $description = 'Payroll — ' . trim((string)$payroll['employee'])
            . ' (' . (string)$payroll['payroll_period'] . ')';
        $pdo->prepare(
            'INSERT INTO financial_transactions
             (payroll_id, transaction_type, amount, transaction_date, reference_no, status, description, payment_method, account_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $payrollId,
            'HR',
            (float)$payroll['net_salary'],
            $today,
            $reference,
            'Completed',
            $description,
            $paymentMethod,
            $chartAccountId > 0 ? $chartAccountId : null,
        ]);
        $transactionId = (int)$pdo->lastInsertId();

        // Keep Payment Management/History and HR's payroll_payment in sync
        // with the same payment row, instead of leaving a transaction with no
        // funding account recorded.
        $pdo->prepare(
            'INSERT INTO payment_transactions
             (account_id, payment_type, amount, transaction_date, reference_no, status, description)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $accountId,
            $paymentMethod,
            (float)$payroll['net_salary'],
            $today,
            $reference,
            'Completed',
            $description,
        ]);
        $paymentId = (int)$pdo->lastInsertId();
        $pdo->prepare(
            'INSERT INTO payroll_payment
             (payroll_id, payment_transaction_id, payment_method, reference_no, payment_date, status)
             VALUES (?, ?, ?, ?, ?, ?)'
        )->execute([
            $payrollId,
            $paymentId,
            $paymentMethod,
            $reference,
            $today,
            'Completed',
        ]);

        // Mirror the payment into HR's own payroll row, so HR shows the payroll
        // as Paid the next time it loads its data.
        $pdo->prepare('UPDATE payroll SET status = ? WHERE payroll_id = ?')
            ->execute(['Paid', $payrollId]);
        $pdo->commit();
        audit((int)$u['id'], $u['email'], $u['role'], 'payroll_pay', 'payroll', (int)$payrollId, $reference);
        // The receipt the Finance user sees (and can print) right after paying.
        respond([
            'ok' => true,
            'message' => 'Payroll paid.',
            'receipt' => [
                'payrollId'     => (int)$payrollId,
                'transactionId' => $transactionId,
                'paymentId'     => $paymentId,
                'account'       => trim((string)($funding['account_name'] ?? '')),
                'reference'     => $reference,
                'date'          => $today,
                'employee'      => trim((string)$payroll['employee']),
                'department'    => (string)($payroll['department'] ?? ''),
                'period'        => (string)$payroll['payroll_period'],
                'gross'         => (float)$payroll['gross_salary'],
                'deductions'    => (float)$payroll['deductions'],
                'net'           => (float)$payroll['net_salary'],
                'method'        => $paymentMethod,
            ],
        ]);
    } catch (DomainException $e) {
        $pdo->rollBack();
        respond(['ok' => false, 'message' => $e->getMessage()], 422);
    } catch (Throwable $e) {
        $pdo->rollBack();
        error_log('Payroll payment failed: ' . $e->getMessage());
        respond(['ok' => false, 'message' => 'The payroll payment could not be recorded.'], 500);
    }
}

if ($action === 'sync_sales_invoice' && $method === 'POST') {
    $u = requireUser();
    $department = strtolower(trim((string)($u['department'] ?? '')));
    $role = (string)($u['role'] ?? '');
    if ($department !== 'sales' || !in_array($role, ['Sales Admin', 'Sales Staff'], true)
        || (string)($u['status'] ?? '') !== 'Active') {
        respond(['ok' => false, 'message' => 'Only active Sales users can send invoices to Finance.'], 403);
    }

    $csrfToken = (string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    $sessionToken = (string)($_SESSION['csrf_token'] ?? '');
    if ($csrfToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $csrfToken)) {
        respond(['ok' => false, 'message' => 'Your session expired. Reload Sales and try again.'], 403);
    }

    $salesInvoiceId = filter_var(
        requestBody()['salesInvoiceId'] ?? null,
        FILTER_VALIDATE_INT
    );
    if ($salesInvoiceId === false || $salesInvoiceId === null || $salesInvoiceId <= 0) {
        respond(['ok' => false, 'message' => 'Select a valid Sales invoice.'], 422);
    }

    try {
        reconcileSalesToFinance((int)$salesInvoiceId);
        respond(['ok' => true, 'message' => 'Invoice sent to Finance Accounts Receivable.']);
    } catch (DomainException $e) {
        respond(['ok' => false, 'message' => $e->getMessage()], 422);
    } catch (Throwable $e) {
        error_log('Manual Sales invoice sync failed: ' . $e->getMessage());
        respond(['ok' => false, 'message' => 'The invoice could not be sent to Finance. Please try again.'], 503);
    }
}

if ($action === 'sales_collection' && $method === 'POST') {
    $u = requireUser();
    if (!isFinanceAdmin($u)) {
        respond(['ok' => false, 'message' => 'Only Finance administrators can record Sales collections.'], 403);
    }
    $b = requestBody();
    $salesInvoiceId = (int)($b['salesInvoiceId'] ?? 0);
    $date = (string)($b['collectionDate'] ?? date('Y-m-d'));
    $amount = (float)($b['amount'] ?? 0);
    $methodName = (string)($b['paymentMethod'] ?? 'Cash');
    $collectionNo = trim((string)($b['collectionId'] ?? ''));
    if (!in_array($methodName, ['Cash', 'GCash', 'Bank Transfer'], true)) {
        $methodName = 'Cash';
    }
    if ($salesInvoiceId <= 0 || $amount <= 0 || $collectionNo === '') {
        respond(['ok' => false, 'message' => 'Sales invoice, collection ID, amount, and payment method are required.'], 422);
    }

    $finance = db();
    $finance->beginTransaction();
    try {
        $ar = $finance->prepare(
            'SELECT ar_id, invoice_no, amount, sales_id
             FROM accounts_receivable WHERE sales_id = ? LIMIT 1'
        );
        $ar->execute([$salesInvoiceId]);
        $receivable = $ar->fetch();
        if (!$receivable) {
            throw new RuntimeException('The Sales invoice is not synchronized to Finance yet.');
        }
        $cashAccount = (int)$finance->query(
            'SELECT account_id FROM cash_bank ORDER BY account_id LIMIT 1'
        )->fetchColumn();
        if ($cashAccount <= 0) {
            throw new RuntimeException('Finance has no cash or bank account configured.');
        }

        $existingPayment = $finance->prepare(
            'SELECT transaction_id FROM payment_transactions WHERE reference_no = ? LIMIT 1'
        );
        $existingPayment->execute([$collectionNo]);
        $paymentId = (int)($existingPayment->fetchColumn() ?: 0);
        if ($paymentId === 0) {
            $payment = $finance->prepare(
                'INSERT INTO payment_transactions
                 (account_id, payment_type, amount, transaction_date, reference_no, status, description)
                 VALUES (?, ?, ?, ?, ?, "Completed", ?)'
            );
            $payment->execute([
                $cashAccount,
                $methodName,
                $amount,
                $date,
                $collectionNo,
                'Finance collection for ' . $receivable['invoice_no'],
            ]);
            $paymentId = (int)$finance->lastInsertId();
        }
        // Push the collection to Sales (this recomputes the Sales invoice's
        // amount_paid and status from the authoritative Sales data), then read
        // that status back so accounts_receivable always mirrors the invoice.
        syncFinanceCollectionToSales($salesInvoiceId, $date, $amount, $methodName, $collectionNo);
        $status = 'Unpaid';
        $salesStatus = getSalesDB()->prepare(
            'SELECT status FROM sales_invoices WHERE inv_id = ? LIMIT 1'
        );
        $salesStatus->execute([$salesInvoiceId]);
        $sourceStatus = strtolower(trim((string)$salesStatus->fetchColumn()));
        $status = $sourceStatus === 'paid'
            ? 'Paid'
            : ($sourceStatus === 'partially paid' || $sourceStatus === 'partial'
                ? 'Partially Paid'
                : ($sourceStatus === 'unpaid' ? 'Unpaid' : 'Partially Paid'));
        $finance->prepare(
            'UPDATE accounts_receivable
             SET payment_id = ?, status = ?
             WHERE ar_id = ?'
        )->execute([$paymentId, $status, (int)$receivable['ar_id']]);
        $finance->commit();
        audit((int)$u['id'], $u['email'], $u['role'], 'sales_collection', 'accounts_receivable', (int)$receivable['ar_id'], $collectionNo);
        respond(['ok' => true, 'message' => 'Sales collection synchronized successfully.']);
    } catch (Throwable $e) {
        $finance->rollBack();
        respond(['ok' => false, 'message' => 'Sales collection synchronization failed: ' . $e->getMessage()], 422);
    }
}

// ---------- RE-AUTHENTICATION ----------
if ($action === 'verify_password' && $method === 'POST') {
    $u = requireUser();
    $password = (string)(requestBody()['password'] ?? '');
    if ($password === '') {
        respond(['ok' => false, 'message' => 'Enter your password to continue.'], 422);
    }
    if (!verifyUserPassword($u, $password)) {
        respond(['ok' => false, 'message' => 'Incorrect password.'], 422);
    }
    respond(['ok' => true]);
}

// ---------- SESSION ----------
if ($action === 'session' && $method === 'GET') {
    respond(['ok' => true, 'user' => currentUser()]);
}

// ---------- LOGIN ----------
if ($action === 'login' && $method === 'POST') {
    $b = requestBody();
    $id = trim((string)($b['identifier'] ?? ''));
    $pw = (string)($b['password'] ?? '');
    $stmt = db()->prepare(
        'SELECT a.*, e.name AS employee_name, e.contact_info, d.department_name
         FROM accounts a
         JOIN employees e ON e.employee_id = a.employee_id
         LEFT JOIN departments d ON d.department_id = e.department
         WHERE a.username=? LIMIT 1'
    );
    $stmt->execute([$id]);
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
    db()->prepare(
        'UPDATE accounts a
         JOIN employees e ON e.employee_id = a.employee_id
         SET a.username=?, e.name=?, e.contact_info=?
         WHERE a.account_id=?'
    )->execute([$email, $fullName, $phone, (int)$u['id']]);
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
    $warnings = [];
    try {
        reconcileSalesToFinance();
    } catch (Throwable $e) {
        error_log('Sales to Finance reconciliation failed: ' . $e->getMessage());
        $warnings['salesInvoices'] = 'Sales invoices could not be synchronized. The Accounts Receivable list may be out of date.';
    }
    try {
        reconcileProductionToFinance();
    } catch (Throwable $e) {
        error_log('Production to Finance reconciliation failed: ' . $e->getMessage());
    }
    // Persist AP settlements created outside the browser (Production /
    // Procurement postings) before the state is read back.
    try {
        syncAccountsPayablePayments(db());
    } catch (Throwable $e) {
        error_log('AP payment reconciliation failed: ' . $e->getMessage());
    }
    respond(['ok' => true, 'state' => loadState(), 'warnings' => $warnings]);
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
                'INSERT INTO expenses (expense_category, amount, expense_date, description, status,
                                       voucher_no, payment_method, reference_no, receipt_name, receipt_data)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            foreach ($state['expenses'] as $e) {
                $ins->execute([
                    $e['category'] ?? '',
                    (float)($e['amount'] ?? 0),
                    $e['date'] ?? date('Y-m-d'),
                    $e['vendor'] ?? '',
                    $e['status'] ?? 'Pending',
                    $e['voucher'] ?? '',
                    $e['paymentMethod'] ?? '',
                    $e['reference'] ?? '',
                    $e['attachmentName'] ?? '',
                    $e['attachmentData'] ?? '',
                ]);
            }
        }
        if (array_key_exists('transactions', $state) && !empty($state['transactions'])) {
            // Preserve the Production (costing_id) linkage of existing rows before the
            // delete/re-insert, matched by reference number, so the Production-to-Finance
            // reconciliation never creates duplicate Production transactions.
            $refCosting = [];
            foreach ($pdo->query(
                'SELECT reference_no, costing_id FROM financial_transactions WHERE costing_id IS NOT NULL'
            )->fetchAll() as $cm) {
                $refCosting[trim((string)$cm['reference_no'])] = (int)$cm['costing_id'];
            }
            // Same for payroll payments: keep the HR payroll_id linkage so the
            // Payroll Transaction Record still shows those rows as Paid.
            $refPayroll = [];
            foreach ($pdo->query(
                'SELECT reference_no, payroll_id FROM financial_transactions WHERE payroll_id IS NOT NULL'
            )->fetchAll() as $pm) {
                $refPayroll[trim((string)$pm['reference_no'])] = (int)$pm['payroll_id'];
            }
            // Remember which transactions already existed so the newly added
            // ones can be announced in the notification feed after this save.
            $preKeys = [];
            foreach ($pdo->query(
                'SELECT reference_no, description, amount FROM financial_transactions'
            )->fetchAll() as $ex) {
                $exRef = trim((string)$ex['reference_no']);
                $key = $exRef !== ''
                    ? 'r:' . $exRef
                    : 'd:' . trim((string)$ex['description']) . '|' . number_format((float)$ex['amount'], 2, '.', '');
                $preKeys[$key] = true;
            }
            $pdo->exec('DELETE FROM financial_transactions');
            $ins = $pdo->prepare(
                'INSERT INTO financial_transactions
                 (payroll_id, costing_id, transaction_type, amount, transaction_date, reference_no, status, description, account_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $acctLookUp = $pdo->prepare('SELECT account_id FROM charts_of_accounts WHERE account_code = ? LIMIT 1');
            $accountCache = [];
            $seenProductionRefs = [];
            foreach ($state['transactions'] as $t) {
                // A Production order must have exactly one cost transaction.
                // Older client states can carry several copies of the same
                // order; skipping the repeats here stops a full save from
                // recreating the duplicates the reconciliation repaired.
                $isProduction = strcasecmp(trim((string)($t['source'] ?? '')), 'Production') === 0;
                $txRef = trim((string)($t['reference'] ?? ''));
                if ($isProduction && $txRef !== '') {
                    if (isset($seenProductionRefs[$txRef])) continue;
                    $seenProductionRefs[$txRef] = true;
                }
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
                    $refPayroll[trim((string)($t['reference'] ?? ''))] ?? null,
                    $refCosting[trim((string)($t['reference'] ?? ''))] ?? null,
                    $t['source'] ?? 'Finance',
                    (float)($t['amount'] ?? 0),
                    $t['date'] ?? date('Y-m-d'),
                    $t['reference'] ?? '',
                    $t['status'] ?? 'Pending',
                    $t['description'] ?? '',
                    $accountId,
                ]);
                // Announce genuinely new transactions in the notification feed
                // (rows that already existed before this save stay silent).
                $newRef = trim((string)($t['reference'] ?? ''));
                $newKey = $newRef !== ''
                    ? 'r:' . $newRef
                    : 'd:' . trim((string)($t['description'] ?? '')) . '|' . number_format((float)($t['amount'] ?? 0), 2, '.', '');
                if (!isset($preKeys[$newKey])) {
                    audit(
                        (int)$u['id'], $u['email'], $u['role'], 'transaction', 'financial_transactions',
                        (int)$pdo->lastInsertId(),
                        sprintf(
                            'Recorded transaction %s — %s (₱%s, %s)',
                            $newRef !== '' ? $newRef : '(no reference)',
                            trim((string)($t['description'] ?? '')) ?: '—',
                            number_format((float)($t['amount'] ?? 0), 2),
                            (string)($t['status'] ?? 'Pending')
                        )
                    );
                }
            }
        }

        // ---------- RECEIVABLES ----------
        if (array_key_exists('receivables', $state) && !empty($state['receivables'])) {
            // Preserve the Sales (sales_id/payment_id) and Expense (expense_id)
            // linkage of existing rows before the delete/re-insert, matched by
            // invoice number, so the Sales-to-Finance reconciliation never
            // duplicates rows and keeps its upsert anchor.
            $refLink = [];
            foreach ($pdo->query(
                "SELECT invoice_no, sales_id, expense_id, payment_id FROM accounts_receivable
                 WHERE COALESCE(sales_id,0) > 0 OR COALESCE(expense_id,0) > 0 OR COALESCE(payment_id,0) > 0"
            )->fetchAll() as $link) {
                $key = trim((string)$link['invoice_no']);
                $refLink[$key] = [
                    'sales_id' => (int)($link['sales_id'] ?? 0),
                    'expense_id' => (int)($link['expense_id'] ?? 0),
                    'payment_id' => (int)($link['payment_id'] ?? 0),
                ];
            }
            $pdo->exec('DELETE FROM accounts_receivable');
            $ins = $pdo->prepare(
                'INSERT INTO accounts_receivable
                 (customer_id, invoice_no, amount, due_date, status, sales_id, expense_id, payment_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $selCust = $pdo->prepare('SELECT customer_id FROM customers WHERE customer_name = ? LIMIT 1');
            $newCust = $pdo->prepare('INSERT INTO customers (customer_name) VALUES (?)');
            foreach ($state['receivables'] as $r) {
                $invoiceNo = trim((string)($r['invoice'] ?? ''));
                $link = $refLink[$invoiceNo] ?? null;
                $requestedSalesId = (int)($r['salesId'] ?? 0);
                if ($requestedSalesId > 0 && (int)($link['sales_id'] ?? 0) !== $requestedSalesId) {
                    continue;
                }
                $salesId = $requestedSalesId ?: (int)($link['sales_id'] ?? 0);

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
                    $invoiceNo,
                    (float)($r['amount'] ?? 0),
                    $r['due'] ?? date('Y-m-d'),
                    $r['status'] ?? 'Open',
                    $salesId > 0 ? $salesId : null,
                    !empty($link['expense_id']) ? $link['expense_id'] : null,
                    !empty($link['payment_id']) ? $link['payment_id'] : null,
                ]);
            }
        }

        // ---------- PAYABLES ----------
        if (array_key_exists('payables', $state) && !empty($state['payables'])) {
            // Preserve Procurement linkage (po_number, payment_id, cost_of_goods)
            // of existing rows before the delete/re-insert, matched by invoice
            // number, so the Procurement bridge data and payment matching
            // survive Finance's own saves.
            $apLink = [];
            foreach ($pdo->query(
                'SELECT invoice_no, po_number, payment_id, cost_of_goods FROM accounts_payable'
            )->fetchAll() as $link) {
                $key = trim((string)$link['invoice_no']);
                if ($key === '') continue;
                $apLink[$key] = [
                    'po_number'     => (string)($link['po_number'] ?? ''),
                    'payment_id'    => (int)($link['payment_id'] ?? 0),
                    'cost_of_goods' => (float)($link['cost_of_goods'] ?? 0),
                ];
            }
            $pdo->exec('DELETE FROM accounts_payable');
            $ins = $pdo->prepare(
                'INSERT INTO accounts_payable (supplier_id, invoice_no, po_number, amount, cost_of_goods, due_date, status, payment_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
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
                $invoiceNo = trim((string)($p['invoice'] ?? ''));
                $link = $apLink[$invoiceNo] ?? null;
                $poNumber = trim((string)($p['poNumber'] ?? $p['po_number'] ?? ''));
                if ($poNumber === '' && $link) $poNumber = $link['po_number'];
                $paymentId = (int)($p['paymentId'] ?? $p['payment_id'] ?? 0);
                if ($paymentId === 0 && $link) $paymentId = $link['payment_id'];
                $costOfGoods = (float)($p['costOfGoods'] ?? $p['cost_of_goods'] ?? 0);
                if ($costOfGoods <= 0 && $link && $link['cost_of_goods'] > 0) $costOfGoods = $link['cost_of_goods'];
                if ($costOfGoods <= 0) $costOfGoods = (float)($p['amount'] ?? 0);
                $ins->execute([
                    $supId,
                    $p['invoice'] ?? '',
                    $poNumber !== '' ? $poNumber : null,
                    (float)($p['amount'] ?? 0),
                    $costOfGoods,
                    $p['due'] ?? date('Y-m-d'),
                    $p['status'] ?? 'Pending',
                    $paymentId > 0 ? $paymentId : null,
                ]);
            }
        }

        // ---------- CASH / BANK ----------
        if (array_key_exists('cashBank', $state) && !empty($state['cashBank'])) {
            // Reject the entire save if any two entries carry the same non-empty account number.
            $seenAccountNos = [];
            foreach ($state['cashBank'] as $c) {
                $no = trim((string)($c['accountNumber'] ?? $c['account_no'] ?? ''));
                if ($no === '') continue;
                if (isset($seenAccountNos[$no])) {
                    $pdo->rollBack();
                    respond([
                        'ok'      => false,
                        'message' => "Duplicate account number \"{$no}\" detected. Each account must have a unique account number.",
                    ], 422);
                }
                $seenAccountNos[$no] = true;
            }

            // payment_transactions.account_id references cash_bank, so the
            // delete/re-insert must preserve that linkage: remember each old
            // account id (the UI store carries it), rebuild the accounts, then
            // point the payment history at the new ids. Without this the FK
            // refuses DELETE FROM cash_bank and the ENTIRE state save rolls
            // back — transactions and payables never persist.
            $oldAccountIds = [];
            foreach ($pdo->query('SELECT account_id FROM cash_bank')->fetchAll() as $oa) {
                $oldAccountIds[(int)$oa['account_id']] = true;
            }
            $pdo->exec('SET FOREIGN_KEY_CHECKS=0');
            $pdo->exec('DELETE FROM cash_bank');
            $ins = $pdo->prepare(
                'INSERT INTO cash_bank (account_name, account_type, bank_name, account_no, balance, description)
                 VALUES (?, ?, ?, ?, ?, ?)'
            );
            $idRemap = [];       // old account_id => new account_id
            $fallbackNewId = null;
            foreach ($state['cashBank'] as $c) {
                $ins->execute([
                    $c['account']                              ?? '',
                    $c['type']                                 ?? 'Cash',
                    $c['bank_name']                            ?? null,
                    trim((string)($c['accountNumber'] ?? $c['account_no'] ?? '')) ?: null,
                    // Recorded balance only: the balance shown on screen already
                    // includes the movements, so writing it back would count them twice.
                    (float)($c['openingBalance'] ?? $c['balance'] ?? 0),
                    $c['description']                          ?? '',
                ]);
                $newId = (int)$pdo->lastInsertId();
                if ($fallbackNewId === null) $fallbackNewId = $newId;
                $oldId = (int)($c['id'] ?? 0);
                if ($oldId > 0 && isset($oldAccountIds[$oldId])) $idRemap[$oldId] = $newId;
            }
            $remap = $pdo->prepare('UPDATE payment_transactions SET account_id = ? WHERE account_id = ?');
            foreach ($idRemap as $oldId => $newId) {
                $remap->execute([$newId, $oldId]);
            }
            // Payments pointing at an account that no longer exists in the store
            // fall back to the first rebuilt account so the FK stays valid.
            $orphanStmt = $pdo->query(
                'SELECT COUNT(*) FROM payment_transactions
                 WHERE account_id NOT IN (SELECT account_id FROM cash_bank)'
            );
            if ((int)$orphanStmt->fetchColumn() > 0 && $fallbackNewId !== null) {
                $pdo->prepare(
                    'UPDATE payment_transactions SET account_id = ?
                     WHERE account_id NOT IN (SELECT account_id FROM cash_bank)'
                )->execute([$fallbackNewId]);
            }
            $pdo->exec('SET FOREIGN_KEY_CHECKS=1');
        }

        // NOTE: charts_of_accounts is intentionally NOT rewritten here, because
        // financial_transactions.account_id references it and a delete/re-insert
        // would orphan those transactions. Manage it via a dedicated endpoint instead.

        // Any AP invoice the saved transactions fully cover is stored as Paid.
        syncAccountsPayablePayments($pdo);

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        respond(['ok' => false, 'message' => 'Save failed: ' . $e->getMessage()], 500);
    }
    $summary = [];
    foreach (['expenses', 'transactions', 'receivables', 'payables', 'cashBank'] as $section) {
        if (array_key_exists($section, $state) && is_array($state[$section])) {
            $summary[] = $section . ': ' . count($state[$section]);
        }
    }
    audit((int)$u['id'], $u['email'], $u['role'], 'save', 'store', null,
        'Updated Finance data' . ($summary ? ' (' . implode(', ', $summary) . ')' : ''));
    respond(['ok' => true]);
}

// ---------- AUDIT ----------
if ($action === 'audit' && $method === 'GET') {
    $u = requireUser();
    if (!isFinanceAdmin($u)) {
        respond(['ok' => false, 'message' => 'Forbidden.'], 403);
    }
    $rows = db()->query(
        "SELECT at.log_id AS id, at.timestamp AS at, at.action, at.module AS entity,
                at.record_id AS entityId, at.description AS details, at.new_value AS actor
         FROM audit_trail at
         JOIN accounts a ON a.account_id = at.user_id
         JOIN employees e ON e.employee_id = a.employee_id
         WHERE e.department = 1
         ORDER BY at.log_id DESC LIMIT 500"
    )->fetchAll();
    respond(['ok' => true, 'events' => $rows]);
}

// ---------- EXPORT ----------
if ($action === 'export' && $method === 'GET') {
    $u = requireUser();
    if (!isFinanceAdmin($u)) {
        respond(['ok' => false, 'message' => 'Forbidden.'], 403);
    }
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

        $stmt = $pdo->prepare('INSERT INTO charts_of_accounts (account_code, account_name, account_type, normal_balance, status, description) VALUES (?, ?, ?, ?, "Active", ?)');
        $stmt->execute([$code, $name, $type, $normal, (string)($b['description'] ?? '')]);
        
        // THIS IS THE KEY: Log it to the audit trail so notifications can see it
        audit((int)$u['id'], $u['email'], $u['role'], 'save', 'account', (int)$pdo->lastInsertId(), 'Created account: ' . $name . ' (' . $code . ')');
        
        respond(['ok' => true, 'message' => 'Account created successfully.']);
    } catch (Throwable $e) {
        respond(['ok' => false, 'message' => 'Failed to create account: ' . $e->getMessage()], 500);
    }
}

// ---------- FETCH REAL NOTIFICATIONS ----------
// The bell feed reflects DATA CHANGES only (record created/updated/approved/…).
// Session events like login/logout stay in the audit trail but never notify.
if ($action === 'notifications' && $method === 'GET') {
    $u = requireUser();
    if (!isFinanceAdmin($u)) {
        respond(['ok' => false, 'message' => 'Forbidden.'], 403);
    }
    $pdo = db();

    // Bell feed uses the default limit; the full Notifications page passes more.
    $limit = max(1, min(100, (int)($_GET['limit'] ?? 20)));

    $stmt = $pdo->prepare("
        SELECT at.log_id AS id, at.timestamp AS at, at.action, at.module, at.description, at.new_value AS actor,
               e.name AS actor_name, nr.log_id IS NULL AS unread
        FROM audit_trail at
        JOIN accounts a ON a.account_id = at.user_id
        JOIN employees e ON e.employee_id = a.employee_id
        LEFT JOIN notification_reads nr ON nr.log_id = at.log_id AND nr.user_id = ?
        WHERE e.department = 1
          AND at.action NOT IN ('login', 'logout')
          AND at.module <> 'store' -- background state-sync rows, not user changes
        ORDER BY at.log_id DESC LIMIT $limit
    ");
    $stmt->execute([(int)$u['id']]);
    $logs = $stmt->fetchAll();

    $notifications = [];
    foreach ($logs as $log) {
        $actorParts = explode('|', (string)$log['actor']);
        $email = $actorParts[0] ?? 'System';
        // Who made the change: prefer the employee name, fall back to email.
        $actor = trim((string)($log['actor_name'] ?? '')) ?: $email;

        // Default presentation, overridden per action below.
        $icon = '🔔';
        $color = 'blue';
        $title = ucfirst((string)$log['action']) . ' — ' . ($log['module'] ?: 'System');

        if ($log['action'] === 'approve' && $log['module'] === 'quotation') {
            $icon = '✅'; $color = 'green';
            $title = 'Quotation Approved';
        } elseif ($log['action'] === 'reject' && $log['module'] === 'quotation') {
            $icon = '❌'; $color = 'red';
            $title = 'Quotation Rejected';
        } elseif ($log['action'] === 'sales_collection' && $log['module'] === 'accounts_receivable') {
            $icon = '💰'; $color = 'green';
            $title = 'Payment Collected';
        } elseif ($log['action'] === 'save' && $log['module'] === 'account') {
            $icon = '👤'; $color = 'blue';
            $title = 'New Account Created';
        } elseif ($log['action'] === 'update' && $log['module'] === 'account') {
            $icon = '✏️'; $color = 'orange';
            $title = 'Account Updated';
        } elseif ($log['action'] === 'delete' && $log['module'] === 'account') {
            $icon = '🗑️'; $color = 'red';
            $title = 'Account Deleted';
        } elseif ($log['action'] === 'save' && $log['module'] === 'store') {
            $icon = '🏪'; $color = 'blue';
            $title = 'Store Settings Updated';
        } elseif ($log['action'] === 'profile_update' || $log['action'] === 'password_update') {
            $icon = '🔑'; $color = 'orange';
            $title = $log['action'] === 'password_update' ? 'Password Changed' : 'Profile Updated';
        } elseif ($log['action'] === 'export') {
            $icon = '📄'; $color = 'red';
            $title = 'Export Generated';
        } elseif ($log['action'] === 'transaction' && $log['module'] === 'financial_transactions') {
            $icon = '🧾'; $color = 'blue';
            $title = 'Transaction Recorded';
        } elseif ($log['action'] === 'receive' && $log['module'] === 'procurement_invoice') {
            $icon = '📥'; $color = 'green';
            $title = 'Invoice Received from Procurement';
        } elseif ($log['action'] === 'post' && $log['module'] === 'procurement_invoice') {
            $icon = '📤'; $color = 'green';
            $title = 'Invoice Posted to Accounts Payable';
        } elseif ($log['action'] === 'payroll_pay' && $log['module'] === 'payroll') {
            $icon = '💸'; $color = 'green';
            $title = 'Payroll Paid';
        } elseif ($log['action'] === 'approve' && $log['module'] === 'expense') {
            $icon = '✅'; $color = 'green';
            $title = 'Expense Approved';
        } elseif ($log['action'] === 'reject' && $log['module'] === 'expense') {
            $icon = '❌'; $color = 'red';
            $title = 'Expense Rejected';
        } elseif ($log['action'] === 'pay' && $log['module'] === 'expense') {
            $icon = '💰'; $color = 'green';
            $title = 'Expense Paid';
        }

        // Every notification states what changed AND who changed it.
        $desc = trim((string)$log['description']) ?: "Changed {$log['module']} record";
        $desc .= ' — by ' . $actor;

        // Where the bell should navigate when this notification is clicked.
        if ($log['action'] === 'profile_update' || $log['action'] === 'password_update') {
            $page = 'settings';
        } else {
            $page = match ((string)$log['module']) {
                'quotation'             => 'quotations',
                'accounts_receivable'   => 'receivables',
                'account'               => 'chartAccounts',
                'financial_transactions'=> 'financialTransactions',
                'procurement_invoice'   => 'payables',
                'payroll'               => 'financialTransactions',
                'expense'               => 'expenses',
                default                 => 'dashboard',
            };
        }

        $notifications[] = [
            'id'     => 'n-' . $log['id'],
            'logId'  => (int)$log['id'],
            'title'  => $title,
            'desc'   => $desc,
            'time'   => date('M d, H:i', strtotime($log['at'])),
            'icon'   => $icon,
            'color'  => $color,
            'unread' => (bool)$log['unread'],
            'page'   => $page,
        ];
    }

    respond(['ok' => true, 'notifications' => $notifications]);
}

// ---------- MARK NOTIFICATIONS READ ----------
// Read state is persisted per user in notification_reads so it survives refresh.
// ids = specific audit log ids; empty array = mark everything currently in the feed.
if ($action === 'notifications.markRead' && $method === 'POST') {
    $u = requireUser();
    if (!isFinanceAdmin($u)) respond(['ok' => false, 'message' => 'Forbidden.'], 403);
    $ids = requestBody()['ids'] ?? null;
    $ids = is_array($ids) ? array_values(array_filter(array_map('intval', $ids))) : [];

    $pdo = db();
    if ($ids) {
        $stmt = $pdo->prepare('INSERT IGNORE INTO notification_reads (user_id, log_id) VALUES (?, ?)');
        foreach ($ids as $logId) {
            if ($logId > 0) $stmt->execute([(int)$u['id'], $logId]);
        }
    } else {
        // Mark-all: persist every audit row this user can currently see.
        $pdo->prepare("
            INSERT IGNORE INTO notification_reads (user_id, log_id)
            SELECT ?, at.log_id
            FROM audit_trail at
            JOIN accounts a ON a.account_id = at.user_id
            JOIN employees e ON e.employee_id = a.employee_id
            WHERE e.department = 1
              AND at.action NOT IN ('login', 'logout')
              AND at.module <> 'store'
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
    // Page access is managed in HR but stored in the shared finance_hr
    // database, so Finance reads the exact same user_page_access rows.
    $access = [];
    $stmt = db()->prepare('SELECT page_key, allowed FROM user_page_access WHERE account_id = ?');
    $stmt->execute([$targetId]);
    foreach ($stmt->fetchAll() as $row) {
        $access[(string)$row['page_key']] = (int)$row['allowed'] === 1;
    }
    if (!$access) {
        // Accounts created before a group default was saved (or restored
        // manually) fall back to the Finance group defaults from HR.
        try {
            $position = (string)($u['position'] ?? '');
            $stmt = db()->prepare(
                'SELECT page_key, allowed FROM page_access_defaults
                 WHERE department_id = 1 AND position IN (?, "")
                 ORDER BY (position = ?) DESC'
            );
            $stmt->execute([$position, $position]);
            foreach ($stmt->fetchAll() as $row) {
                $key = (string)$row['page_key'];
                if (!isset($access[$key])) $access[$key] = (int)$row['allowed'] === 1;
            }
        } catch (Throwable $e) {
            // Table may not exist yet — allow everything until HR saves access.
        }
    }
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
        $stmt = $pdo->prepare('UPDATE charts_of_accounts SET account_name=?, account_type=?, normal_balance=?, description=? WHERE account_code=?');
        $stmt->execute([$name, $type, $normal, (string)($b['description'] ?? ''), $code]);
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

// ---------- QUOTATIONS (from Procurement / UniProcur) ----------
// Reads RFQs and Finance review submissions straight from the Procurement
// database (uniprocur2) so Finance can review quotation requests in one place.
function quotationDb(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO(
            'mysql:host=127.0.0.1;dbname=uniprocur2;charset=utf8mb4',
            'root',
            '',
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
        );
    }
    return $pdo;
}

// Effective Finance status for an RFQ row:
//   finance submission approved        -> Approved
//   finance submission rejected        -> Rejected
//   finance submission still pending   -> Under Review
//   not submitted to Finance yet       -> Pending
function quotationDisplayStatus(?array $sub): string
{
    $st = strtolower(trim((string)($sub['review_status'] ?? '')));
    if ($st === 'approved') return 'Approved';
    if ($st === 'rejected') return 'Rejected';
    if ($st === 'pending')  return 'Under Review';
    return 'Pending';
}

if ($action === 'quotations.get' && $method === 'GET') {
    requireUser();
    try {
        $qdb = quotationDb();
        $rows = $qdb->query(
            'SELECT r.id AS rfq_id, r.rfq_number, r.priority, r.available_budget,
                    DATE(r.created_at) AS requested_date,
                    u.full_name AS requested_by,
                    p.needed_by AS required_date, p.pr_number, p.purpose,
                    f.id AS finance_request_id, f.review_status, f.submitted_at,
                    f.reviewed_at, f.review_note, f.decision_reference,
                    f.submitted_quote_total, f.request_version, f.quote_id,
                    q.total_amount AS quote_total, s.name AS supplier_name,
                    a.decision AS approval_decision, a.note AS approval_note,
                    a.decision_reference AS approval_reference
             FROM rfqs r
             LEFT JOIN purchase_requisitions p ON p.id = r.pr_id
             LEFT JOIN users u ON u.id = r.created_by
             LEFT JOIN procurement_finance_quotes f ON f.rfq_id = r.id
             LEFT JOIN rfq_quotes q ON q.id = f.quote_id
             LEFT JOIN suppliers s ON s.id = q.supplier_id
             LEFT JOIN procurement_finance_rfq_approvals a ON a.rfq_id = r.id
             ORDER BY r.created_at DESC, r.id DESC
             LIMIT 200'
        )->fetchAll();

        $itemStmt = $qdb->prepare(
            'SELECT item_name, unit, qty, unit_price, subtotal
             FROM rfq_quote_items WHERE rfq_quote_id = ? ORDER BY id'
        );
        foreach ($rows as &$row) {
            $hasSubmission = !empty($row['finance_request_id']);
            $hasApproval = !empty($row['approval_decision']);
            if ($hasSubmission) {
                $row['status'] = quotationDisplayStatus($row);
            } elseif ($hasApproval) {
                // Finance decided the request directly (Buyer has not sent a
                // quote to Finance). Supplier quotes and PO creation stay on
                // the Procurement side.
                $row['status'] = $row['approval_decision'] === 'approved' ? 'Approved' : 'Rejected';
                $row['review_note'] = $row['approval_note'];
                $row['decision_reference'] = $row['approval_reference'];
            } else {
                $row['status'] = 'Pending';
            }
            $row['estimated_cost'] = $row['submitted_quote_total'] !== null
                ? (float)$row['submitted_quote_total']
                : ($row['quote_total'] !== null ? (float)$row['quote_total'] : null);
            $row['available_budget'] = $row['available_budget'] !== null
                ? (float)$row['available_budget'] : null;
            $row['items'] = [];
            if (!empty($row['quote_id'])) {
                $itemStmt->execute([(int)$row['quote_id']]);
                $row['items'] = $itemStmt->fetchAll();
            }
        }
        unset($row);
        respond(['ok' => true, 'quotations' => $rows]);
    } catch (Throwable $e) {
        error_log('quotations.get: ' . $e->getMessage());
        respond(['ok' => false,
                 'message' => 'Unable to load quotation requests from Procurement — ' . $e->getMessage()], 500);
    }
}

// ---------- QUOTATION DECISION (approve / reject) ----------
// Two modes:
//   a) Under Review request (finance_request_id present) — record the decision
//      on the submission the Buyer sent to Finance.
//   b) Pending request (rfq_id + quote_id present) — Finance approves the RFQ
//      directly: the chosen supplier quote is marked as winner, the RFQ is
//      awarded, and a Purchase Order is created in Procurement.
if ($action === 'quotations.decide' && $method === 'POST') {
    $u = requireUser();
    if (!isFinanceAdmin($u)) {
        respond(['ok' => false, 'message' => 'Only Finance Administrators can decide quotation requests.'], 403);
    }
    $b = requestBody();
    $requestId = filter_var($b['finance_request_id'] ?? null, FILTER_VALIDATE_INT);
    $rfqId     = filter_var($b['rfq_id'] ?? null, FILTER_VALIDATE_INT);
    $quoteId   = filter_var($b['quote_id'] ?? null, FILTER_VALIDATE_INT);
    $version   = filter_var($b['request_version'] ?? null, FILTER_VALIDATE_INT);
    $decision  = strtolower(trim((string)($b['decision'] ?? '')));
    $note      = trim((string)($b['note'] ?? ''));
    if (!$requestId && !$rfqId) {
        respond(['ok' => false, 'message' => 'A finance request or quotation request is required.'], 422);
    }
    if (!$version) $version = 1;
    if (!in_array($decision, ['approved', 'rejected'], true)) {
        respond(['ok' => false, 'message' => 'Decision must be approved or rejected.'], 422);
    }
    if ($decision === 'rejected' && $note === '') {
        respond(['ok' => false, 'message' => 'A note is required when rejecting a quotation request.'], 422);
    }
    if (mb_strlen($note) > 500) {
        respond(['ok' => false, 'message' => 'Note must be 500 characters or fewer.'], 422);
    }
    $qdb = quotationDb();
    $reviewerRef = (string)($u['email'] ?? 'finance');
    $reference   = 'FIN-' . date('YmdHis') . '-' . bin2hex(random_bytes(4));
    try {
        $qdb->beginTransaction();

        if ($requestId) {
            // ---- Mode A: decide an existing submission (Under Review) ----
            $stmt = $qdb->prepare(
                'SELECT f.id, f.rfq_id, f.quote_id, f.review_status,
                        r.rfq_number
                 FROM procurement_finance_quotes f
                 JOIN rfqs r ON r.id = f.rfq_id
                 WHERE f.id = ? LIMIT 1 FOR UPDATE'
            );
            $stmt->execute([$requestId]);
            $sub = $stmt->fetch();
            if (!$sub) { $qdb->rollBack(); respond(['ok' => false, 'message' => 'Quotation request not found.'], 404); }
            if ($sub['review_status'] !== 'pending') {
                $qdb->rollBack();
                respond(['ok' => false, 'message' => 'This request was already decided (' . quotationDisplayStatus($sub) . ').'], 409);
            }
            $stmt = $qdb->prepare(
                "UPDATE procurement_finance_quotes
                 SET review_status = ?, reviewed_at = NOW(), review_note = ?,
                     reviewer_ref = ?, decision_reference = ?, reviewed_by = NULL
                 WHERE id = ? AND request_version = ? AND review_status = 'pending'"
            );
            $stmt->execute([$decision, $note, $reviewerRef, $reference, $requestId, $version]);
            if ($stmt->rowCount() !== 1) {
                $qdb->rollBack();
                respond(['ok' => false, 'message' => 'Request changed while deciding — please reload and try again.'], 409);
            }
            $stmt = $qdb->prepare(
                'INSERT INTO procurement_finance_quote_decisions
                    (finance_request_id, request_version, rfq_id, quote_id,
                     decision, decision_reference, reviewer_ref, note)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                $requestId, $version, (int)$sub['rfq_id'], (int)$sub['quote_id'],
                $decision, $reference, $reviewerRef, $note
            ]);
            $qdb->commit();
            audit((int)$u['id'], $u['email'], $u['role'], $decision === 'approved' ? 'approve' : 'reject',
                'quotation', $requestId,
                ($decision === 'approved' ? 'Approved' : 'Rejected') . ' quotation request ' . $sub['rfq_number']
                . ($note !== '' ? ' — ' . $note : ''));
            respond(['ok' => true, 'message' => 'Quotation request ' . ($decision === 'approved' ? 'approved' : 'rejected') . '.',
                     'status' => quotationDisplayStatus(['review_status' => $decision])]);
        }

        // ---- Mode B: Finance decides a Pending RFQ directly ----
        // Finance only records the approval/rejection here. Supplier quotes
        // and Purchase Order creation remain on the Procurement side.
        $stmt = $qdb->prepare(
            'SELECT r.id, r.rfq_number, r.created_by
             FROM rfqs r WHERE r.id = ? LIMIT 1 FOR UPDATE'
        );
        $stmt->execute([$rfqId]);
        $rfq = $stmt->fetch();
        if (!$rfq) { $qdb->rollBack(); respond(['ok' => false, 'message' => 'Quotation request not found.'], 404); }
        // Guard: if the Buyer already sent a quote to Finance, this request is
        // not Pending — decide it through the finance request instead.
        $stmt = $qdb->prepare('SELECT id, review_status FROM procurement_finance_quotes WHERE rfq_id = ? LIMIT 1 FOR UPDATE');
        $stmt->execute([$rfqId]);
        $existing = $stmt->fetch();
        if ($existing) {
            $qdb->rollBack();
            respond(['ok' => false, 'message' => 'This request is already with Finance (' . quotationDisplayStatus($existing) . ').'], 409);
        }
        // Guard: only one Finance decision per request.
        $stmt = $qdb->prepare('SELECT id, decision FROM procurement_finance_rfq_approvals WHERE rfq_id = ? LIMIT 1 FOR UPDATE');
        $stmt->execute([$rfqId]);
        $decided = $stmt->fetch();
        if ($decided) {
            $qdb->rollBack();
            respond(['ok' => false, 'message' => 'This request was already decided (' . ($decided['decision'] === 'approved' ? 'Approved' : 'Rejected') . ').'], 409);
        }
        $stmt = $qdb->prepare(
            'INSERT INTO procurement_finance_rfq_approvals
                (rfq_id, decision, decision_reference, reviewer_ref, note)
             VALUES (?, ?, ?, ?, ?)'
        );
        $stmt->execute([$rfqId, $decision, $reference, $reviewerRef, $note]);
        $qdb->commit();
        audit((int)$u['id'], $u['email'], $u['role'], $decision === 'approved' ? 'approve' : 'reject',
            'quotation', $rfqId,
            ($decision === 'approved' ? 'Approved' : 'Rejected') . ' quotation request ' . $rfq['rfq_number']
            . ($note !== '' ? ' — ' . $note : ''));
        respond(['ok' => true,
                 'message' => 'Quotation request ' . ($decision === 'approved' ? 'approved' : 'rejected') . '.',
                 'status' => $decision === 'approved' ? 'Approved' : 'Rejected']);
    } catch (Throwable $e) {
        if ($qdb->inTransaction()) $qdb->rollBack();
        error_log('quotations.decide: ' . $e->getMessage());
        respond(['ok' => false, 'message' => 'Failed to record the decision.'], 500);
    }
}

// ---------- EXPENSE DECISION (approve / reject / mark paid) ----------
if ($action === 'expenses.decide' && $method === 'POST') {
    $u = requireUser();
    if (!isFinanceAdmin($u)) {
        respond(['ok' => false, 'message' => 'Only Finance Administrators can decide expenses.'], 403);
    }
    $b = requestBody();
    $expenseId = filter_var($b['id'] ?? null, FILTER_VALIDATE_INT);
    $decision  = strtolower(trim((string)($b['decision'] ?? '')));
    if (!$expenseId) {
        respond(['ok' => false, 'message' => 'A valid expense id is required.'], 422);
    }
    if (!in_array($decision, ['approve', 'reject', 'pay'], true)) {
        respond(['ok' => false, 'message' => 'Decision must be approve, reject, or pay.'], 422);
    }

    $pdo = db();
    try {
        $stmt = $pdo->prepare('SELECT expense_id, expense_category, amount, status FROM expenses WHERE expense_id = ? LIMIT 1');
        $stmt->execute([$expenseId]);
        $exp = $stmt->fetch();
        if (!$exp) {
            respond(['ok' => false, 'message' => 'Expense not found.'], 404);
        }

        $newStatus = match ($decision) {
            'approve' => 'Approved',
            'reject'  => 'Rejected',
            'pay'     => 'Paid',
        };
        $auditAction = $decision === 'approve' ? 'approve' : ($decision === 'reject' ? 'reject' : 'pay');

        $upd = $pdo->prepare('UPDATE expenses SET status = ? WHERE expense_id = ?');
        $upd->execute([$newStatus, $expenseId]);

        $cat = (string)($exp['expense_category'] ?? 'Expense');
        $amt = number_format((float)($exp['amount'] ?? 0), 2);
        $details = ucfirst($decision === 'pay' ? 'paid' : ($decision === 'approve' ? 'approved' : 'rejected'))
            . " expense #{$expenseId} ({$cat}) — ₱{$amt}";
        audit((int)$u['id'], (string)($u['email'] ?? ''), (string)($u['role'] ?? ''),
            $auditAction, 'expense', $expenseId, $details);

        respond(['ok' => true, 'message' => 'Expense ' . strtolower($newStatus) . '.', 'status' => $newStatus]);
    } catch (Throwable $e) {
        error_log('expenses.decide: ' . $e->getMessage());
        respond(['ok' => false, 'message' => 'Failed to update expense.'], 500);
    }
}

respond(['ok' => false, 'message' => 'Unknown action.'], 404);

