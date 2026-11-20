<?php
declare(strict_types=1);
session_start();

if (!isset($_SESSION['user']) || !is_array($_SESSION['user'])) {
    header('Location: ../root/index.php');
    exit;
}
$dept = (string)($_SESSION['user']['department'] ?? '');
if ($dept === '') {
    header('Location: ../root/index.php');
    exit;
}
if (strcasecmp($dept, 'HR') !== 0) {
    header('Location: ../FINANCE/');
    exit;
}
?>
<?php session_write_close(); ?><!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
       <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta name="theme-color" content="#9c2625">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <title>D.E.V.S · HR Dashboard</title>
    <link rel="stylesheet" href="style.css?v=20261120guide2">
</head>
<body>

    <div class="login-screen" id="loginScreen" aria-hidden="true" style="display:none;">
        <div class="login-art" aria-hidden="true">
        </div>
        <div class="login-card">
            <div class="login-brand">
                <div class="login-mark">
                    <img src="assets/logo.png" alt="D.E.V.S logo" />
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
                    <img src="assets/logo.png" alt="DEVS logo" width="48" height="48" />
                </div>
                <div class="brand-text">
                    <img class="brand-devs-img" src="assets/icon-devs.png" alt="DEVS" />
                </div>
            </a>

            <nav class="sidebar-nav" aria-label="Sidebar navigation">
                <span class="nav-section">HR Management</span>
                <a href="#" class="nav-item active" data-page="dashboard">
                    <span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg></span>
                    Dashboard</a>
                <a href="#" class="nav-item" data-page="employees">
                    <span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M21 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
                    Employees Master</a>
                <a href="#" class="nav-item" data-page="attendance">
                    <span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/><path d="m9 15 2 2 4-4"/></svg></span>
                    Attendance</a>
                <a href="#" class="nav-item" data-page="leave">
                    <span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/><path d="m10 14 4 4M14 14l-4 4"/></svg></span>
                    Leave request</a>
                <a href="#" class="nav-item" data-page="pageAccess" style="display:none;">
                    <span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></svg></span>
                    User Permission</a>
                <a href="#" class="nav-item" data-page="accountManagement">
                    <span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.828-.828A5 5 0 1 0 14.414 8.586l-.828.828a2 2 0 0 0-.586 1.414V11a1 1 0 0 1-1 1h-1a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1H6a2 2 0 0 0-1.414.586Z"/><circle cx="16.5" cy="7.5" r="1"/></svg></span>
                    Account Management</a>

                <span class="nav-section">Finance &amp; Benefits</span>
                <a href="#" class="nav-item" data-page="payroll">
                    <span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 12V8H6a2 2 0 0 1-2-2 2 2 0 0 1 2-2h12v4"/><path d="M4 8v10a2 2 0 0 0 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg></span>
                    Payroll</a>
                <a href="#" class="nav-item" data-page="payrollHistory">
                    <span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/></svg></span>
                    Payroll History</a>
                <a href="#" class="nav-item" data-page="deductions">
                    <span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg></span>
                    Deductions</a>
                <a href="#" class="nav-item" data-page="contribution">
                    <span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 22h18M6 18v-7M10 18v-7M14 18v-7M18 18v-7"/><path d="M12 2 3 7h18Z"/></svg></span>
                    Contribution</a>
                <a href="#" class="nav-item" data-page="13thmonth">
                    <span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/></svg></span>
                    13th Month Pay</a>
                <a href="#" class="nav-item" data-page="auditTrail">
                    <span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h6"/></svg></span>
                    Audit Trail</a>
            </nav>

            <div class="sidebar-footer">
                <a href="#" class="nav-item" data-page="support">
                    <span class="nav-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                    </span>
                    Support
                </a>
                <a href="#" class="nav-item" data-page="settings">
                    <span class="nav-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="3"/>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                        </svg>
                    </span>
                    Settings
                </a>
                <a href="#" class="nav-item" data-page="logout">
                    <span class="nav-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4H5v16h9"></path><path d="M10 12h10"></path><path d="m16 8 4 4-4 4"></path></svg>
                    </span>
                    Logout
                </a>
            </div>
        </aside>

        <main class="content">
            <header class="topbar">
                <div class="topbar-left">
                    <span class="topbar-icon-badge" aria-hidden="true">
                        <img src="assets/logo.png" alt="DEVS logo" />
                    </span>
                    <div class="topbar-context">
                        <span>HR Management</span>
                        <strong id="pageTitle">Dashboard</strong>
                    </div>
                </div>
                <div class="topbar-right">
                    <div class="notification-wrapper">
                        <button type="button" class="topbar-bell" id="topbarBell" aria-label="Notifications">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                            </svg>
                            <span class="notification-dot" id="notifDot" style="display:none;"></span>
                        </button>
                        <div class="notif-popover" id="notifPopover">
                            <div class="notif-header">
                                <div class="notif-title-row">
                                    <button class="notif-close" id="notifCloseBtn" aria-label="Close notifications">✕</button>
                                    <h3>Notifications</h3>
                                    <span class="notif-badge">Up to date</span>
                                    <span class="notif-mark-read" id="notifMarkRead">Mark all read</span>
                                </div>
                                <div class="notif-tabs">
                                    <button class="active" data-tab="all" id="tabAll">All (0)</button>
                                    <button data-tab="unread" id="tabUnread">Unread (0)</button>
                                    <button data-tab="alerts" id="tabAlerts">Alerts (0)</button>
                                </div>
                            </div>
                            <div class="notif-body" id="notifBody"></div>
                            <button type="button" class="notif-footer" id="notifViewAll" style="width:100%;border:none;font-family:inherit;">View all notifications →</button>
                        </div>
                    </div>
                    <div class="topbar-user">
                        <div class="topbar-user-text">
                            <strong id="topbarName">HR User</strong>
                            <span id="topbarEmail"></span>
                        </div>
                        <button type="button" class="avatar" id="userAvatar" title="Account settings">HR</button>
                    </div>
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

        <script src="functions.js?v=20261120guide1" defer></script>
</body>
</html>