<?php
// ITPROFEL/root/db.php
declare(strict_types=1);

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;

    $host = '127.0.0.1';
    $name = 'finance_hr';   // ← must match your phpMyAdmin DB name
    $user = 'root';
    $pass = '';             // XAMPP default — change if you set a MySQL password

    $dsn = "mysql:host={$host};dbname={$name};charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
        PDO::ATTR_TIMEOUT             => 5,
    ]);
    ensureAdminAccounts($pdo);
    return $pdo;
}

function ensureAdminAccounts(PDO $pdo): void
{
    static $ensured = false;
    if ($ensured) return;

    $admins = [
        [
            'username' => 'admin26@gmail.com',
            'password' => getenv('HR_ADMIN_PASSWORD') ?: 'Admin123456789!',
            'name' => 'HR Administrator',
            'department' => 2,
            'position' => 'HR Admin',
        ],
        [
            'username' => 'financeadmin@gmail.com',
            'password' => getenv('FINANCE_ADMIN_PASSWORD') ?: 'Admin123456789!',
            'name' => 'Finance Administrator',
            'department' => 1,
            'position' => 'Finance Admin',
        ],
    ];

    $pdo->beginTransaction();
    try {
        $find = $pdo->prepare(
            'SELECT a.account_id, a.employee_id
             FROM accounts a
             WHERE a.username = ? LIMIT 1'
        );
        $createEmployee = $pdo->prepare(
            'INSERT INTO employees (name, position, department, employment_status, basic_salary, date_hired)
             VALUES (?, ?, ?, "Active", 0, CURDATE())'
        );
        // Do not overwrite an existing admin's position here — HR manages it
        // (HR admins use "HR Admin", Finance admins use "Finance Admin").
        $updateEmployee = $pdo->prepare(
            'UPDATE employees
             SET name = ?, department = ?, employment_status = "Active"
             WHERE employee_id = ?'
        );
        $createAccount = $pdo->prepare(
            'INSERT INTO accounts (employee_id, username, password, position, status)
             VALUES (?, ?, ?, ?, "Active")'
        );
        // NOTE: the password is only seeded when the account is first created.
        // Existing accounts keep whatever password they currently have, so
        // "Reset Password" in Account Management and user password changes
        // persist instead of being overwritten on every page load.

        foreach ($admins as $admin) {
            $find->execute([$admin['username']]);
            $account = $find->fetch();
            if ($account) {
                $updateEmployee->execute([
                    $admin['name'],
                    $admin['department'],
                    (int) $account['employee_id'],
                ]);
                continue;
            }

            $createEmployee->execute([$admin['name'], $admin['position'], $admin['department']]);
            $createAccount->execute([
                (int) $pdo->lastInsertId(),
                $admin['username'],
                password_hash($admin['password'], PASSWORD_DEFAULT),
                $admin['position'],
            ]);
        }
        $pdo->commit();
        $ensured = true;
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}