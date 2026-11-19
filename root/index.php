<?php
declare(strict_types=1);

// No-cache headers FIRST
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");

// ALWAYS start session — even on logout requests.
// This is what loads the current session so we can actually destroy it.
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'domain' => '',
    'secure' => false,
    'httponly' => true,
    'samesite' => 'Lax'
]);
session_start();

// Handle logout
if (isset($_GET['logout'])) {

    // 1. Wipe session data
    $_SESSION = [];

    // 2. Delete the session cookie from the browser
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            time() - 42000,
            '/', // Force path to root
            $p['domain'],
            $p['secure'],
            $p['httponly']
        );
    }	

 // 3. Capture the session id BEFORE destroying the session
$sessionId = session_id();

// 4. Delete the session file on the server
session_destroy();

// 5. Force-unlink the session file in case PHP hasn't yet
if ($sessionId !== '') {
    $savePath = session_save_path();
if ($savePath === '') {
    $savePath = sys_get_temp_dir();
}
$sessionFile = rtrim($savePath, '/\\') . DIRECTORY_SEPARATOR . 'sess_' . $sessionId;
    if (is_file($sessionFile)) {
        @unlink($sessionFile);
    }
}

    // 5. Redirect cleanly to the login page (no ?logout, no cache)
    header('Location: /ITPROFEL/root/index.php', true, 302);
    exit;
}

// Not logging out — check if already logged in
// FIX: Use a short-lived one-shot flag instead of a persistent session counter.
// The old counter never reset because index.php wasn't reloaded on success.
if (isset($_SESSION['user']) && is_array($_SESSION['user'])) {
    $dept = strtolower(trim((string)($_SESSION['user']['department'] ?? '')));
    $pos  = (string)($_SESSION['user']['position'] ?? '');

    $targetUrl = null;
    if ($dept === 'finance') {
        $targetUrl = '../FINANCE/';
    } elseif ($dept === 'hr') {
        $targetUrl = '../HR/';
    } elseif ($dept === 'sales') {
        $targetUrl = '../SALES/dashboard.php';
    } elseif ($dept === 'production') {
        $targetUrl = '../PRODUCTION/dashboard.html';
    } elseif ($dept === 'procurement') {
        // Procurement routes by position: Buyer → buyer dashboard, Manager → manager dashboard.
        $targetUrl = stripos($pos, 'manager') !== false
            ? '../PROCUREMENT/managerdashboard/manager-dashboard.html'
            : '../PROCUREMENT/buyerdashboard/buyer-dashboard.html';
    } elseif ($dept === 'inventory') {
        $targetUrl = '../INVENTORY/dashboard.html';
    }

    if ($targetUrl) {
        // One-shot guard: if we JUST redirected here, don't redirect again.
        if (!empty($_SESSION['just_redirected'])) {
            unset($_SESSION['just_redirected']); // consume it
            // Fall through and render login page so the user isn't stuck.
        } else {
            $_SESSION['just_redirected'] = true;
            header('Location: ' . $targetUrl);
            exit;
        }
    }
} else {
    unset($_SESSION['just_redirected']);
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>D.E.V.S · Sign in</title>
	<link rel="stylesheet" href="auth.css">
</head>
<body>
	<main class="auth-shell" id="authShell">
		<section class="auth-card" aria-live="polite">
			<div class="auth-art" aria-hidden="true">
				<div class="art-copy" id="artCopyLogin"><span>Welcome to</span><span>the company!</span><strong>Login to enjoy our site!</strong></div>
			</div>
			<div class="auth-content">
				<form id="loginForm" class="auth-form" novalidate>
					<h1>Login</h1><p class="auth-subtitle">Welcome to the Company! - Login to proceed</p><hr><h2>Sign into Devs</h2>
					<label for="loginUser">Enter your email address</label><input type="email" id="loginUser" name="username" placeholder="Email" autocomplete="username" required><span class="error-text" role="alert"></span>
					<label for="loginPass">Password</label>
					<div class="password-field">
						<input type="password" id="loginPass" name="password" placeholder="Password" autocomplete="current-password" required>
						<button type="button" class="toggle-password" id="toggleLoginPass" aria-label="Show password" aria-pressed="false">
							<svg class="eye-closed" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"></path><circle cx="12" cy="12" r="3"></circle></svg>
							<svg class="eye-open" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"></path><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
						</button>
					</div>
					<span class="error-text" role="alert"></span>
					<button type="submit" class="auth-button">LOGIN</button>
				</form>
			</div>
		</section>
	</main>
	<script src="auth.js?v=20261115prod1" defer></script>
</body>
</html>
