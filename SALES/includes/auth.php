<?php
if (session_status() === PHP_SESSION_NONE) {
    session_name('PHPSESSID');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'domain' => '',
        'secure' => false,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function requireLogin(): void {
    $user = $_SESSION['user'] ?? null;
    $role = is_array($user) ? (string)($user['role'] ?? '') : '';
    $department = is_array($user) ? strtolower(trim((string)($user['department'] ?? ''))) : '';
    if ($department !== 'sales' || !in_array($role, ['Sales Admin', 'Sales Staff'], true)) {
        header('Location: ../root/index.php');
        exit;
    }
    if (empty($_SESSION['sales_session_established'])) {
        if (!session_regenerate_id(true)) {
            http_response_code(500);
            exit('Could not secure the Sales session. Please sign in again.');
        }
        $_SESSION['sales_session_established'] = true;
    }
}

function currentUser(): array {
    $user = $_SESSION['user'] ?? [
        'id' => 0,
        'name' => 'Martin',
        'username' => 'Martin',
        'role' => 'Sales Staff'
    ];
    if (empty($user['id']) && !empty($user['user_id'])) $user['id'] = (int)$user['user_id'];
    if (empty($user['user_id']) && !empty($user['id'])) $user['user_id'] = (int)$user['id'];
    if (!isset($user['name'])) $user['name'] = '';
    if (empty($user['name']) && !empty($user['fullName'])) $user['name'] = $user['fullName'];
    if (empty($user['name']) && !empty($user['full_name'])) $user['name'] = $user['full_name'];
    if (empty($user['full_name']) && !empty($user['name'])) $user['full_name'] = $user['name'];
    return $user;
}

function requireCustomer(): void {
    requireLogin();
    if (currentUser()['role'] !== 'Customer') {
        header('Location: dashboard.php');
        exit;
    }
}

function requireSalesAdmin(): void {
    requireLogin();
    if (currentUser()['role'] !== 'Sales Admin') {
        header('Location: ../root/index.php');
        exit;
    }
}

function requireSalesWorkspace(): void {
    requireLogin();
    // The universal HR login provisions a single Sales account whose session
    // role is "Sales Admin", so the workspace must admit both Sales roles
    // (the Sales dashboard does the same). Only the admin_* pages stay
    // Sales-Admin-exclusive via requireSalesAdmin().
    if (!in_array(currentUser()['role'], ['Sales Admin', 'Sales Staff'], true)) {
        header('Location: ../root/index.php');
        exit;
    }
}

function logActivity(PDO $pdo, string $action, string $module, ?string $description = null, ?int $recordId = null): void {
    try {
        $user = currentUser();
        $stmt = $pdo->prepare('INSERT INTO activity_logs (user_id, action, module, record_id, description, created_at) VALUES (?,?,?,?,?,NOW())');
        $stmt->execute([(int)($user['id'] ?? 0), $action, $module, $recordId, $description]);
    } catch (Throwable $e) {
        // Activity logging must never stop a sales transaction.
    }
}
?>
