<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

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

function respond(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($action === 'session' && $method === 'GET') {
    $user = $_SESSION['user'] ?? null;
    if (is_array($user)) {
        $user = array_intersect_key($user, array_flip([
            'id', 'user_id', 'name', 'full_name', 'username', 'department', 'position', 'role', 'status',
        ]));
    }
    session_write_close();
    respond(['ok' => true, 'user' => $user]);
}

if ($action !== 'login' || $method !== 'POST') {
    respond(['ok' => false, 'message' => 'Unknown request.'], 404);
}

$body = json_decode(file_get_contents('php://input'), true);
$identifier = is_array($body) ? trim((string)($body['identifier'] ?? '')) : '';
$password = is_array($body) ? (string)($body['password'] ?? '') : '';
if ($identifier === '' || $password === '') {
    respond(['ok' => false, 'message' => 'Enter your username and password.'], 422);
}

require_once __DIR__ . '/config/database.php';

try {
    $pdo = getDB();
    if (!$pdo) {
        respond(['ok' => false, 'message' => 'Login is temporarily unavailable. Please try again.'], 503);
    }

    $stmt = $pdo->prepare("
        SELECT user_id, full_name, username, password, role, status
        FROM users
        WHERE username = ?
          AND role IN ('Sales Admin', 'Sales Staff')
        LIMIT 1
    ");
    $stmt->execute([$identifier]);
    $user = $stmt->fetch();
    if (!$user || !password_verify($password, (string)$user['password'])) {
        respond(['ok' => false, 'message' => 'Invalid username or password.'], 422);
    }
    if (($user['status'] ?? 'Active') !== 'Active') {
        respond(['ok' => false, 'message' => 'This Sales account is inactive.'], 403);
    }

    $pdo->prepare('UPDATE users SET last_login = NOW() WHERE user_id = ?')
        ->execute([(int)$user['user_id']]);
} catch (PDOException $exception) {
    error_log('Sales login bridge database error: ' . $exception->getMessage());
    respond(['ok' => false, 'message' => 'Login is temporarily unavailable. Please try again.'], 503);
}

$_SESSION = [];
if (!session_regenerate_id(true)) {
    respond(['ok' => false, 'message' => 'Could not secure the sign-in session. Please try again.'], 500);
}

$fullName = (string)$user['full_name'];
$_SESSION['user'] = [
    'id' => (string)$user['user_id'],
    'user_id' => (int)$user['user_id'],
    'name' => $fullName,
    'full_name' => $fullName,
    'username' => (string)$user['username'],
    'department' => 'Sales',
    'position' => (string)$user['role'],
    'role' => (string)$user['role'],
    'status' => (string)($user['status'] ?? 'Active'),
];
$_SESSION['sales_session_established'] = true;

respond(['ok' => true, 'user' => $_SESSION['user']]);
