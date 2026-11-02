<?php
declare(strict_types=1);

// No-cache headers FIRST
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
header("Expires: Sat, 26 Jul 1997 05:00:00 GMT");

// ALWAYS start session — even on logout requests.
// This is what loads the current session so we can actually destroy it.
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
            $p['path'],
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
    $sessionFile = session_save_path() . DIRECTORY_SEPARATOR . 'sess_' . $sessionId;
    if (is_file($sessionFile)) {
        @unlink($sessionFile);
    }
}

    // 5. Redirect cleanly to /test/index.php (no ?logout, no cache)
    header('Location: /test/index.php', true, 302);
    exit;
}

// Not logging out — check if already logged in
if (isset($_SESSION['user']) && is_array($_SESSION['user'])) {
    $dept = strtolower(trim((string)($_SESSION['user']['department'] ?? '')));
    if ($dept === 'finance') {
        header('Location: FINANCE/');
        exit;
    }
    if ($dept === 'hr') {
        header('Location: HR/');
        exit;
    }
    if ($dept === 'procurement') {
        header('Location: PROCUREMENT/supplier/supplier.html');
        exit;
    }
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
				<div class="art-copy is-hidden" id="artCopySignup"><span>Welcome</span><span>to the company!</span><strong>Sign up now to have<br>access in our site!</strong></div>
				<div class="art-copy is-hidden" id="artCopyPassword"><span>Welcome</span><span>to the company!</span><strong>Please setup<br>your password</strong></div>
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
					<button type="submit" class="auth-button">LOGIN</button><p class="auth-switch">Don’t have an account? <a href="#" id="registerLink">Register</a></p>
				</form>
				<form id="signupForm" class="auth-form is-hidden" novalidate>
					<h1>Get Started</h1><p class="auth-subtitle">Welcome to the Company - Let’s get started!</p><hr><h2>Sign up</h2>
					<label for="regName">Enter your name</label><input id="regName" name="fullName" placeholder="Name" autocomplete="name" required>
					<label for="regEmail">Email</label><input id="regEmail" name="email" type="email" placeholder="Email" autocomplete="email" required>
					<label for="regDepartment">Department</label><select id="regDepartment" name="department" required><option value="">Department</option><option>HR</option><option>Finance</option><option>Procurement</option></select>
					<label for="regPosition">Position</label><select id="regPosition" name="position" required><option value="">Position</option><option>Admin</option><option>Staff</option></select>
					<button type="submit" class="auth-button">SET UP PASSWORD</button><p class="auth-switch">Already have an account? <a href="#" id="backToLogin">Login</a></p>
				</form>
				<form id="passwordForm" class="auth-form is-hidden" novalidate>
					<a href="#" class="back-link" id="backToSignup">&#8592; Back</a><h1>Setup Password</h1><p class="auth-subtitle">Setup your password</p><hr>
					<label for="regPassword">Password</label>
					<div class="password-field">
						<input id="regPassword" name="password" type="password" placeholder="Password" minlength="8" required>
						<button type="button" class="toggle-password" id="toggleRegPassword" aria-label="Show password" aria-pressed="false">
							<svg class="eye-open" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"></path><circle cx="12" cy="12" r="3"></circle></svg>
							<svg class="eye-closed" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"></path><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
						</button>
					</div>
					<label for="regConfirmPassword">Confirm Password</label>
					<div class="password-field">
						<input id="regConfirmPassword" name="confirmPassword" type="password" placeholder="Confirm Password" minlength="8" required>
						<button type="button" class="toggle-password" id="toggleRegConfirmPassword" aria-label="Show password" aria-pressed="false">
							<svg class="eye-open" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"></path><circle cx="12" cy="12" r="3"></circle></svg>
							<svg class="eye-closed" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"></path><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
						</button>
					</div>
					<span class="error-text" role="alert"></span>
					<button type="submit" class="auth-button">SIGN UP</button>
				</form>
			</div>
		</section>
	</main>
	<script src="auth.js?v=20261005" defer></script>
</body>
</html>
