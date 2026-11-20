<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';
// The Sales module's config may be absent when only part of the ERP was
// copied to a server. Require it conditionally so a missing folder degrades
// to "Sales lookup skipped" instead of a fatal error that breaks the login
// for every department.
$uniprocurSalesConfig = __DIR__ . '/../SALES/config/database.php';
if (is_file($uniprocurSalesConfig)) {
	require_once $uniprocurSalesConfig;
} else {
	error_log('SALES/config/database.php not found; Sales login lookup disabled.');
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
	} catch (Throwable $e) {
		error_log('audit failed: ' . $e->getMessage());
	}
}

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

function respond(array $payload, int $status = 200)
{
	http_response_code($status);
	echo json_encode($payload, JSON_UNESCAPED_UNICODE);
	exit;
}

function requestBody(): array
{
	$raw = (string) file_get_contents('php://input');
	$data = json_decode($raw, true);
	if (is_array($data)) return $data;
	return is_array($_POST) ? $_POST : [];
}

function loginProductionUser(string $identifier, string $password): ?array
{
	$host = getenv('PRODUCTION_DB_HOST') ?: '127.0.0.1';
	$name = getenv('PRODUCTION_DB_NAME') ?: 'team3production';
	$user = getenv('PRODUCTION_DB_USER') ?: 'root';
	$pass = getenv('PRODUCTION_DB_PASSWORD') ?: '';
	$production = new PDO(
		"mysql:host={$host};dbname={$name};charset=utf8mb4",
		$user,
		$pass,
		[
			PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
			PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
			PDO::ATTR_EMULATE_PREPARES => false,
			PDO::ATTR_TIMEOUT => 5,
		]
	);
	ensureProductionAdmin($production);
	$stmt = $production->prepare(
		'SELECT id, full_name, username, email, password, role, status
		 FROM production_users
		 WHERE status = "Active" AND (BINARY username = ? OR BINARY email = ?)
		 LIMIT 1'
	);
	$stmt->execute([$identifier, $identifier]);
	$productionUser = $stmt->fetch();
	if (!$productionUser || !password_verify($password, (string)$productionUser['password'])) {
		return null;
	}

	if (session_status() === PHP_SESSION_ACTIVE) {
		$_SESSION = [];
		session_write_close();
	}
	session_name('team3_production');
	session_set_cookie_params([
		'lifetime' => 43200,
		'path' => '/',
		'secure' => false,
		'httponly' => true,
		'samesite' => 'Lax',
	]);
	session_start();
	session_regenerate_id(true);
	$_SESSION['user_id'] = (int)$productionUser['id'];
	$_SESSION['full_name'] = $productionUser['full_name'];
	$_SESSION['username'] = $productionUser['username'];
	$_SESSION['email'] = $productionUser['email'];
	$_SESSION['role'] = $productionUser['role'];
	session_write_close();

	$production->prepare('UPDATE production_users SET status = "Active" WHERE id = ?')
		->execute([(int)$productionUser['id']]);
	return [
		'id' => (string)$productionUser['id'],
		'username' => $productionUser['username'],
		'email' => $productionUser['email'],
		'fullName' => $productionUser['full_name'],
		'department' => 'Production',
		'position' => $productionUser['role'] === 'production_supervisor' ? 'Admin' : 'Staff',
		'role' => $productionUser['role'],
		'status' => $productionUser['status'],
	];
}

function ensureProductionAdmin(PDO $production): void
{
    // Production accounts are HR-managed: the universal login's Production
    // bridge mirrors finance_hr accounts (positions Staff / Supervisor) into
    // production_users. The old auto-seeded 'productionadmin' account was
    // removed on 2026-11-16, so this only guarantees the table exists — it
    // must never re-create or re-activate a fixed admin login.
    $production->exec(
        'CREATE TABLE IF NOT EXISTS production_users (
			id INT NOT NULL AUTO_INCREMENT,
			full_name VARCHAR(100) NOT NULL,
			username VARCHAR(50) NOT NULL,
			email VARCHAR(100) NOT NULL,
			password VARCHAR(255) NOT NULL,
			role ENUM("production_staff", "production_supervisor") NOT NULL DEFAULT "production_staff",
			status ENUM("Active", "Inactive") NOT NULL DEFAULT "Active",
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (id),
			UNIQUE KEY uq_pusers_username (username),
			UNIQUE KEY uq_pusers_email (email)
		) ENGINE=InnoDB'
    );
}

function currentUser(): ?array
{
	return isset($_SESSION['user']) && is_array($_SESSION['user']) ? $_SESSION['user'] : null;
}

if (($_GET['action'] ?? '') === 'session') session_write_close();
$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

if ($action === 'session' && $method === 'GET') {
	respond(['ok' => true, 'user' => currentUser()]);
}

if ($action === 'login' && $method === 'POST') {
	$body = requestBody();
	$identifier = trim((string) ($body['identifier'] ?? ''));
	$password = (string) ($body['password'] ?? '');
	try {
		$productionUser = loginProductionUser($identifier, $password);
		if ($productionUser) {
			respond(['ok' => true, 'user' => $productionUser]);
		}
	} catch (PDOException $e) {
		error_log('Production login lookup failed: ' . $e->getMessage());
	}
	try {
		// getDB() only exists when SALES/config/database.php was found above.
		$sales = function_exists('getDB') ? getDB() : null;
		$salesUser = false;
		if ($sales !== null) {
			$salesStmt = $sales->prepare(
				'SELECT * FROM users
				 WHERE BINARY username = ? AND role IN ("Sales Admin", "Sales Staff")
				 LIMIT 1'
			);
			$salesStmt->execute([$identifier]);
			$salesUser = $salesStmt->fetch();
		}
		if ($salesUser && password_verify($password, (string) $salesUser['password'])) {
			if (($salesUser['status'] ?? 'Active') !== 'Active') {
				respond(['ok' => false, 'code' => 'account_inactive', 'message' => 'This Sales account is inactive.'], 403);
			}

			$_SESSION['user'] = [
				'id' => (string) $salesUser['user_id'],
				'user_id' => (int) $salesUser['user_id'],
				'username' => $salesUser['username'],
				'email' => $salesUser['username'],
				'fullName' => $salesUser['full_name'],
				'name' => $salesUser['full_name'],
				'department' => 'Sales',
				'position' => $salesUser['role'] === 'Sales Admin' ? 'Admin' : 'Staff',
				'role' => $salesUser['role'],
				'status' => $salesUser['status'] ?? 'Active',
			];
			$sales->prepare('UPDATE users SET last_login = NOW() WHERE user_id = ?')
				->execute([(int) $salesUser['user_id']]);
			respond(['ok' => true, 'user' => $_SESSION['user']]);
		}
	} catch (PDOException $e) {
		error_log('Sales login lookup failed: ' . $e->getMessage());
	}

	try {
		$stmt = db()->prepare(
			'SELECT a.*, e.name AS employee_name, e.contact_info, d.department_name
			 FROM accounts a
			 JOIN employees e ON e.employee_id = a.employee_id
			 LEFT JOIN departments d ON d.department_id = e.department
			 WHERE BINARY a.username = ? LIMIT 1'
		);
		$stmt->execute([$identifier]);
		$user = $stmt->fetch();
	} catch (PDOException $e) {
		error_log('Shared authentication lookup failed: ' . $e->getMessage());
		respond([
			'ok' => false,
			'code' => 'database_unavailable',
			'message' => 'Login is temporarily unavailable. Please start MySQL in XAMPP and try again.'
		], 503);
	}

	if (!$user || !password_verify($password, (string) $user['password'])) {
		respond(['ok' => false, 'code' => 'invalid_credentials', 'message' => 'Invalid username or password.'], 422);
	}
	if (($user['status'] ?? 'Active') === 'Pending') {
		respond(['ok' => false, 'code' => 'pending_approval', 'message' => 'Your account is awaiting approval from an HR Administrator.'], 403);
	}
	if (($user['status'] ?? 'Active') === 'Rejected') {
		respond(['ok' => false, 'code' => 'account_rejected', 'message' => 'Your sign-up request was not approved. Contact your HR Administrator.'], 403);
	}

	// Each shared login starts with a clean subsystem identity. The INVENTORY
	// app (INVENTORY) shares this default PHP session and
	// authenticates through inventory_system.users, so keys left by a previous
	// department's login must not leak into it.
	unset($_SESSION['user_id'], $_SESSION['full_name'], $_SESSION['username'],
		$_SESSION['role'], $_SESSION['position'], $_SESSION['can_control']);

	// ---- Inventory bridge: mirror the HR-managed account into inventory_system ----
	// The Inventory pages check $_SESSION['user_id'] against inventory_system.users
	// (see php/check-session.php), so the universal login must establish that
	// identity too: reuse the mirrored user or auto-provision one.
	if (strcasecmp((string) ($user['department_name'] ?? ''), 'Inventory') === 0) {
		try {
			$inv = new PDO('mysql:host=127.0.0.1;dbname=inventory_system;charset=utf8mb4', 'root', '', [
				PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
				PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
			]);
			$stmt = $inv->prepare('SELECT id, full_name, email, username, password, role, COALESCE(position, \'\') AS position FROM users WHERE email = ? LIMIT 1');
			$stmt->execute([$user['username']]);
			$invUser = $stmt->fetch();
			if (!$invUser) {
				$role = (stripos((string) ($user['position'] ?? ''), 'manager') !== false
					|| stripos((string) ($user['position'] ?? ''), 'controller') !== false
					|| stripos((string) ($user['position'] ?? ''), 'admin') !== false) ? 'ADMIN' : 'USER';
				$ins = $inv->prepare('INSERT INTO users (full_name, email, username, password, role, position) VALUES (?, ?, ?, ?, ?, ?)');
				$ins->execute([
					(string) $user['employee_name'],
					(string) $user['username'],
					(string) $user['username'],
					password_hash($password, PASSWORD_DEFAULT),
					$role,
					(string) ($user['position'] ?? ''),
				]);
				$stmt->execute([$user['username']]);
				$invUser = $stmt->fetch();
			} elseif (!password_verify($password, (string) $invUser['password'])) {
				// Keep the mirrored user's password in step with the HR account.
				$inv->prepare('UPDATE users SET password = ? WHERE id = ?')
					->execute([password_hash($password, PASSWORD_DEFAULT), (int) $invUser['id']]);
			}
			if ($invUser) {
				// Keep the mirrored role in step with the HR position even for
				// users provisioned by an earlier version of this bridge.
				$wantRole = (stripos((string) ($invUser['position'] ?? ''), 'manager') !== false
					|| stripos((string) ($invUser['position'] ?? ''), 'controller') !== false
					|| stripos((string) ($invUser['position'] ?? ''), 'admin') !== false) ? 'ADMIN' : 'USER';
				if ((string) $invUser['role'] !== $wantRole) {
					$inv->prepare('UPDATE users SET role = ? WHERE id = ?')
						->execute([$wantRole, (int) $invUser['id']]);
					$invUser['role'] = $wantRole;
				}
				$_SESSION['user_id'] = (int) $invUser['id'];
				$_SESSION['full_name'] = (string) $invUser['full_name'];
				$_SESSION['username'] = (string) $invUser['username'];
				$_SESSION['role'] = (string) $invUser['role'];
				$_SESSION['position'] = ((string) $invUser['position'] !== '')
					? (string) $invUser['position']
					: (string) ($user['position'] ?? '');
				$_SESSION['can_control'] = in_array($_SESSION['position'], ['Warehouse Manager', 'Inventory Controller / Analyst', 'Admin'], true)
					|| strtoupper((string) $_SESSION['role']) === 'ADMIN';
			}
		} catch (Throwable $e) {
			error_log('Inventory login bridge failed: ' . $e->getMessage());
		}
	}

	$_SESSION['user'] = [
		'id' => (string) $user['account_id'],
		'employeeId' => (string) $user['employee_id'],
		'username' => $user['username'],
		'email' => $user['username'],
		'fullName' => $user['employee_name'],
		'department' => $user['department_name'] === 'Human Resources' ? 'HR' : ($user['department_name'] ?? ''),
		'position' => $user['position'] ?? '',
		'role' => (($user['department_name'] === 'Human Resources' ? 'HR' : ($user['department_name'] ?? '')) . ' ' . ($user['position'] ?? '')),
		'status' => $user['status'] ?? 'Active',
		'phone' => $user['contact_info'] ?? ''
	];
	audit((int) $user['account_id'], $_SESSION['user']['email'], $_SESSION['user']['role'], 'login', 'auth');

	// ---- Production bridge: HR-managed Production accounts must also hold a
	// team3_production session, because PRODUCTION
	// authenticates through team3production.production_users with its own
	// session name (see its php/database.php). Without this, the dashboard's
	// check-session.php finds no production session and bounces the user
	// back to the login page.
	if (strcasecmp((string) ($user['department_name'] ?? ''), 'Production') === 0) {
		try {
			$prod = new PDO('mysql:host=127.0.0.1;dbname=' . (getenv('PRODUCTION_DB_NAME') ?: 'team3production') . ';charset=utf8mb4', 'root', '', [
				PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
				PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
			]);
			$stmt = $prod->prepare('SELECT id, full_name, username, email, password, role, status FROM production_users WHERE email = ? OR username = ? ORDER BY (email = ?) DESC, id LIMIT 1');
			$stmt->execute([$user['username'], $user['username'], $user['username']]);
			$prodUser = $stmt->fetch();
			if (!$prodUser) {
				$role = (stripos((string) ($user['position'] ?? ''), 'admin') !== false
					|| stripos((string) ($user['position'] ?? ''), 'supervisor') !== false) ? 'production_supervisor' : 'production_staff';
				$ins = $prod->prepare('INSERT INTO production_users (full_name, username, email, password, role, status) VALUES (?, ?, ?, ?, ?, "Active")');
				$ins->execute([
					(string) $user['employee_name'],
					(string) $user['username'],
					(string) $user['username'],
					password_hash($password, PASSWORD_DEFAULT),
					$role,
				]);
				$stmt->execute([$user['username'], $user['username'], $user['username']]);
				$prodUser = $stmt->fetch();
			} else {
				// Keep the production account in step with the HR account:
				// password first, then role from the HR position, then status.
				if (!password_verify($password, (string) $prodUser['password'])) {
					$prod->prepare('UPDATE production_users SET password = ? WHERE id = ?')
						->execute([password_hash($password, PASSWORD_DEFAULT), (int) $prodUser['id']]);
				}
				$wantRole = (stripos((string) ($user['position'] ?? ''), 'admin') !== false
					|| stripos((string) ($user['position'] ?? ''), 'supervisor') !== false) ? 'production_supervisor' : 'production_staff';
				if ((string) $prodUser['role'] !== $wantRole) {
					$prod->prepare('UPDATE production_users SET role = ? WHERE id = ?')
						->execute([$wantRole, (int) $prodUser['id']]);
					$prodUser['role'] = $wantRole;
				}
				if ((string) $prodUser['status'] !== 'Active') {
					$prod->prepare('UPDATE production_users SET status = "Active" WHERE id = ?')
						->execute([(int) $prodUser['id']]);
				}
			}
			if ($prodUser) {
				$defaultName = session_name();
				$defaultParams = session_get_cookie_params();
				$sharedId = session_id();
				// Swap to the production module's named session and establish
				// the identity its check-session.php expects. The production
				// session must live in its own file: within one request PHP
				// keeps the current session id, so a plain session_start()
				// under the new name would reuse the shared session's id and
				// write production data into it.
				session_write_close();
				session_name('team3_production');
				$prodCookie = isset($_COOKIE['team3_production']) ? (string) $_COOKIE['team3_production'] : '';
				if (preg_match('/^[A-Za-z0-9,-]{1,128}$/', $prodCookie)) {
					session_id($prodCookie);
				} else {
					session_id('');
				}
				session_set_cookie_params([
					'lifetime' => 43200,
					'path' => '/',
					'secure' => false,
					'httponly' => true,
					'samesite' => 'Lax',
				]);
				session_start();
				$_SESSION['user_id'] = (int) $prodUser['id'];
				$_SESSION['full_name'] = (string) $prodUser['full_name'];
				$_SESSION['username'] = (string) $prodUser['username'];
				$_SESSION['email'] = (string) $prodUser['email'];
				$_SESSION['role'] = (string) $prodUser['role'];
				session_write_close();
				// Restore the shared session for the remainder of this request.
				session_name($defaultName);
				session_set_cookie_params($defaultParams);
				session_id($sharedId);
				session_start();
			}
		} catch (Throwable $e) {
			error_log('Production login bridge failed: ' . $e->getMessage());
		}
	}

	respond(['ok' => true, 'user' => $_SESSION['user']]);
}

if ($action === 'logout' && $method === 'POST') {
	$u = currentUser();
	if ($u) {
		audit((int) $u['id'], (string) ($u['email'] ?? $u['username']), (string) ($u['role'] ?? ''), 'logout', 'auth');
	}

	// The Production module keeps its own named session; end it as well so a
	// shared logout never leaves the production dashboard accessible.
	$defaultName = session_name();
	$defaultParams = session_get_cookie_params();
	$sharedId = session_id();
	session_write_close();
	session_name('team3_production');
	// Resume the production session BY ITS OWN COOKIE ID. Within one request
	// PHP keeps the current session id, so a plain session_start() under the
	// new name would destroy the shared session's file again and leave the
	// real production session alive.
	$prodCookie = isset($_COOKIE['team3_production']) ? (string) $_COOKIE['team3_production'] : '';
	if (preg_match('/^[A-Za-z0-9,-]{1,128}$/', $prodCookie)) {
		session_id($prodCookie);
	} else {
		session_id('');
	}
	session_start();
	$_SESSION = [];
	if (ini_get('session.use_cookies')) {
		setcookie('team3_production', '', time() - 42000, '/');
	}
	session_destroy();
	session_name($defaultName);
	session_set_cookie_params($defaultParams);
	session_id($sharedId);
	session_start();

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
