<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json; charset=utf-8');

$storageDir = __DIR__ . DIRECTORY_SEPARATOR . 'storage';
$usersFile = $storageDir . DIRECTORY_SEPARATOR . 'users.json';

function respond(array $payload, int $status = 200): never
{
	http_response_code($status);
	echo json_encode($payload, JSON_UNESCAPED_UNICODE);
	exit;
}

function requestBody(): array
{
	$data = json_decode((string) file_get_contents('php://input'), true);
	return is_array($data) ? $data : [];
}

function readUsers(string $file): array
{
	if (!is_file($file)) return [];
	$users = json_decode((string) file_get_contents($file), true);
	return is_array($users) ? $users : [];
}

function writeUsers(string $file, array $users): void
{
	$temp = $file . '.tmp';
	file_put_contents($temp, json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
	rename($temp, $file);
}

function currentUser(): ?array
{
	return isset($_SESSION['user']) && is_array($_SESSION['user']) ? $_SESSION['user'] : null;
}

if (!is_dir($storageDir)) mkdir($storageDir, 0775, true);

$users = readUsers($usersFile);
$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

if ($action === 'session' && $method === 'GET') {
	respond(['ok' => true, 'user' => currentUser()]);
}

if ($action === 'login' && $method === 'POST') {
	$body = requestBody();
	$identifier = trim((string) ($body['identifier'] ?? ''));
	$password = (string) ($body['password'] ?? '');
	$user = null;

	foreach ($users as $candidate) {
		if (($candidate['username'] ?? '') === $identifier
			|| strcasecmp((string) ($candidate['email'] ?? ''), $identifier) === 0) {
			$user = $candidate;
			break;
		}
	}

	if (!$user) respond(['ok' => false, 'code' => 'account_not_found', 'message' => 'Account not found. Please register first.'], 422);
	if (!password_verify($password, (string) ($user['password'] ?? ''))) {
		respond(['ok' => false, 'code' => 'invalid_password', 'message' => 'Incorrect password.'], 422);
	}
	if (($user['status'] ?? 'Active') === 'Pending') {
		respond(['ok' => false, 'code' => 'pending_approval', 'message' => 'Your account is awaiting approval from an HR Administrator.'], 403);
	}
	if (($user['status'] ?? 'Active') === 'Rejected') {
		respond(['ok' => false, 'code' => 'account_rejected', 'message' => 'Your sign-up request was not approved. Contact your HR Administrator.'], 403);
	}

	$_SESSION['user'] = [
		'id' => $user['id'] ?? '',
		'username' => $user['username'] ?? $user['email'] ?? '',
		'email' => $user['email'] ?? '',
		'fullName' => $user['fullName'] ?? '',
		'department' => $user['department'] ?? '',
		'position' => $user['position'] ?? '',
		'role' => $user['role'] ?? '',
		'status' => $user['status'] ?? 'Active',
		'phone' => $user['phone'] ?? ''
	];
	respond(['ok' => true, 'user' => $_SESSION['user']]);
}

if ($action === 'register' && $method === 'POST') {
	$body = requestBody();
	$fullName = trim((string) ($body['fullName'] ?? ''));
	$email = strtolower(trim((string) ($body['email'] ?? '')));
	$department = trim((string) ($body['department'] ?? ''));
	$position = trim((string) ($body['position'] ?? ''));
	$password = (string) ($body['password'] ?? '');
	$confirmPassword = (string) ($body['confirmPassword'] ?? '');

	if ($fullName === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 8 || $password !== $confirmPassword) {
		respond(['ok' => false, 'message' => 'Enter valid details and matching passwords of at least 8 characters.'], 422);
	}
	if (!in_array($department, ['HR', 'Finance', 'Procurement'], true) || !in_array($position, ['Admin', 'Staff'], true)) {
		respond(['ok' => false, 'message' => 'Please select a valid department and position.'], 422);
	}
	foreach ($users as $candidate) {
		if (strcasecmp((string) ($candidate['email'] ?? ''), $email) === 0) {
			respond(['ok' => false, 'message' => 'An account with that email already exists.'], 422);
		}
	}

	$status = 'Pending';
	$users[] = [
		'id' => 'USR-' . str_pad((string) (count($users) + 1), 3, '0', STR_PAD_LEFT),
		'username' => $email,
		'email' => $email,
		'fullName' => $fullName,
		'department' => $department,
		'position' => $position,
		'role' => $department . ' ' . $position,
		'status' => $status,
		'phone' => '',
		'password' => password_hash($password, PASSWORD_DEFAULT),
		'createdAt' => date(DATE_ATOM)
	];
	writeUsers($usersFile, $users);
	respond(['ok' => true, 'message' => 'Registration submitted. An HR Administrator must approve your account before you can sign in.', 'status' => $status]);
}

if ($action === 'logout' && $method === 'POST') {
	$_SESSION = [];

	// Delete the session cookie
	if (ini_get('session.use_cookies')) {
		$params = session_get_cookie_params();
		setcookie(
			session_name(),
			'',
			time() - 42000,
			$params['path'],
			$params['domain'],
			$params['secure'],
			$params['httponly']
		);
	}

	session_destroy();
	respond(['ok' => true]);
}

respond(['ok' => false, 'message' => 'Unknown request.'], 404);
