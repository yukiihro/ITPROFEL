<?php
declare(strict_types=1);
session_start();

if (!isset($_SESSION['user']) || !is_array($_SESSION['user'])) {
    header('Location: ../index.php');
    exit;
}
$dept = (string)($_SESSION['user']['department'] ?? '');
if ($dept === '') {
    header('Location: ../index.php');
    exit;
}
if (strcasecmp($dept, 'HR') !== 0) {
    header('Location: ../FINANCE/');
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
       <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta name="theme-color" content="#9c2625">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <title>D.E.V.S · HR Dashboard</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>

    <div class="login-screen" id="loginScreen" aria-hidden="true" style="display:none;">
        <div class="login-art" aria-hidden="true">
        </div>
        <div class="login-card">
            <div class="login-brand">
                <div class="login-mark">
                    <img src="logo.png" alt="D.E.V.S logo" />
                </div>
                <h1>Devs HR</h1>
            </div>

            <form id="loginForm" novalidate>
                <h2 class="login-title">Sign into Devs</h2>
                <div class="form-field">
                    <label for="loginUser">Enter your email address</label>
                    <input type="email" id="loginUser" name="username" placeholder="Email" autocomplete="username" inputmode="email" />
                    <span class="error-text" role="alert">Please enter your email address.</span>
                </div>

                <div class="form-field">
                    <label for="loginPass">Password</label>
                    <div class="password-field">
                        <input type="password" id="loginPass" name="password" placeholder="Password" autocomplete="current-password" />
                        <button type="button" class="password-toggle" id="loginPasswordToggle" aria-label="Show password" aria-pressed="false">
                            <svg class="password-eye" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"></path>
                                <circle cx="12" cy="12" r="2.5"></circle>
                                <line class="eye-slash" x1="4" y1="4" x2="20" y2="20"></line>
                            </svg>
                        </button>
                    </div>
                    <span class="error-text" role="alert">Please enter your password.</span>
                </div>

                <div class="login-row">
                    <label class="checkbox">
                        <input type="checkbox" id="rememberMe" />
                        <span>Remember me</span>
                    </label>
                    <a href="#" class="login-link" id="forgotLink">Forgot password?</a>
                </div>

                <button type="submit" class="btn btn-primary login-btn" id="loginBtn">Continue with email</button>

            </form>
        </div>

        <div class="login-footer">
            © <span id="loginYear"></span> D.E.V.S · All rights reserved.
        </div>
    </div>

    <div class="app-shell" id="appShell" style="display:flex;">
        <aside class="sidebar">
            <a href="#" class="brand" id="brandHome" title="Go to Dashboard">
    <div class="brand-mark">
        <img src="logo.png" alt="HRFin logo" />
    </div>
    <div class="brand-text">
        <span class="brand-name"><span class="brand-hr">HR</span><span class="brand-fin">Fin</span></span>
    </div>
</a>

            <nav class="sidebar-nav" aria-label="Sidebar navigation">
                <span class="nav-section">Main</span>
                <a href="#" class="nav-item active" data-page="dashboard">Dashboard</a>
                <a href="#" class="nav-item" data-page="employees">Employees Master</a>
                <a href="#" class="nav-item" data-page="attendance">Attendance</a>
                <a href="#" class="nav-item" data-page="leave">Leave request</a>
                <a href="#" class="nav-item" data-page="pageAccess" style="display:none;">User Permission</a>
                <a href="#" class="nav-item" data-page="registrationApproval" style="display:none;">Registration Approval</a>
                <a href="#" class="nav-item" data-page="accountManagement">Account Management</a>

                <span class="nav-section">Finance &amp; Benefits</span>
                <a href="#" class="nav-item" data-page="payroll">Payroll</a>
                <a href="#" class="nav-item" data-page="payrollHistory">Payroll History</a>
                <a href="#" class="nav-item" data-page="contribution">Contribution</a>
                <a href="#" class="nav-item" data-page="13thmonth">13th Month Pay</a>
                <a href="#" class="nav-item" data-page="auditTrail">Audit Trail</a>
            </nav>

            <div class="sidebar-footer">
                <a href="#" class="nav-item" data-page="settings"><span class="nav-icon" aria-hidden="true">&#9881;</span>Settings</a>
                <a href="#" class="nav-item" data-page="logout">
                    <span class="nav-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" focusable="false"><path d="M14 4H5v16h9"></path><path d="M10 12h10"></path><path d="m16 8 4 4-4 4"></path></svg>
                    </span>
                    Logout
                </a>
            </div>
        </aside>

        <main class="content">
            <header class="topbar">
                <div class="topbar-left">
                    <h1 id="pageTitle">HR Dashboard</h1>
                    <p class="topbar-sub" id="pageSubtitle">HR activity snapshot for today.</p>
                </div>
                <div class="topbar-right">
                    <div class="topbar-date" id="currentDate"></div>
                    <button type="button" class="avatar" id="userAvatar" title="Account settings">AD</button>
                </div>
            </header>

            <div class="content-body" id="dashboardPanel"></div>
        </main>
    </div>

    <div class="modal-backdrop" id="modalBackdrop" aria-hidden="true">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle" id="modal">
            <div class="modal-header">
                <h3 id="modalTitle">Modal</h3>
                <button class="modal-close" type="button" id="modalClose" aria-label="Close">×</button>
            </div>
            <div class="modal-body" id="modalBody"></div>
        </div>
    </div>

    <div class="toast-stack" id="toastStack" aria-live="polite" aria-atomic="true"></div>

        <script src="functions.js?v=20261103" defer></script>
</body>
</html>