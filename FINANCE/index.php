<?php
declare(strict_types=1);

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

$dept = $_SESSION['user']['department'] ?? '';
if (!isset($_SESSION['user']) || $dept === '') {
    header('Location: ../index.php');
    exit;
}
if (strcasecmp($dept, 'Finance') !== 0) {
    if (strcasecmp($dept, 'HR') === 0) {
        header('Location: ../HR/');
    } elseif (strcasecmp($dept, 'Procurement') === 0) {
        header('Location: ../PROCUREMENT/supplier/supplier.html');
    } else {
        header('Location: ../index.php');
    }
    exit;
}

// SUCCESS: We are on the Finance portal. Reset the redirect guard.
$_SESSION['redirect_guard'] = 0;
unset($_SESSION['redirect_guard']);
?>
<?php session_write_close(); ?><!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta name="theme-color" content="#9c2625">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <title>D.E.V.S · Finance Dashboard</title>
    <link rel="stylesheet" href="style.css?v=20261106devs2">
</head>
<body>

    <div class="app-shell" id="appShell">
        <aside class="sidebar">
            <a href="#" class="brand" id="brandHome" title="Go to Dashboard" aria-label="Go to Dashboard">
                <div class="brand-mark">
                    <img src="assets/logo.png" alt="DEVS logo" width="48" height="48" />
                </div>
                <div class="brand-text">
                    <img class="brand-devs-img" src="assets/icon-devs.png" alt="DEVS" />
                </div>
            </a>

            <nav class="sidebar-nav" aria-label="Sidebar navigation">
                <span class="nav-section">Finance</span>
                <a href="#" class="nav-item active" data-page="dashboard">Dashboard</a>
                <a href="#" class="nav-item" data-page="chartAccounts">Charts of Account</a>
                <a href="#" class="nav-item" data-page="payables">Account Payable</a>
                <a href="#" class="nav-item" data-page="receivables">Account Receivable</a>
                <a href="#" class="nav-item" data-page="cashBank">Cash/Bank</a>
                <a href="#" class="nav-item" data-page="expenses">Expenses</a>
                <a href="#" class="nav-item" data-page="financialReports">Financial Reports</a>
                <a href="#" class="nav-item" data-page="paymentManagement">Payment Management</a>
                <a href="#" class="nav-item" data-page="financialTransactions">Financial Transactions</a>
                <a href="#" class="nav-item" data-page="bankReconciliation">Bank Reconciliation</a>
                <a href="#" class="nav-item" data-page="auditTrail">Audit Trail</a>
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
                        <svg viewBox="0 0 24 24" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="3"/>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
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
                        <span>Financial Management</span>
                        <strong>Employee</strong>
                    </div>
                </div>
                <div class="topbar-right">
                    <div class="notification-wrapper" style="position: relative;">
                        <button type="button" class="topbar-bell" id="topbarBell" aria-label="Notifications">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                            </svg>
                            <span class="notification-dot" id="notifDot" style="display: none;"></span>
                        </button>
                        
                        <!-- NOTIFICATION PANEL -->
                        <div class="notif-popover" id="notifPopover">
                            <div class="notif-header">
                                <div class="notif-title-row">
                                    <button class="notif-close" id="notifCloseBtn">✕</button>
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
                            <div class="notif-footer">View all notifications →</div>
                        </div>
                    </div>
                    <button type="button" class="topbar-user" id="topbarProfileBtn" style="background: transparent; border: none; cursor: pointer; padding: 0; text-align: inherit; font-family: inherit;" title="Account Settings">
                        <div class="topbar-user-text">
                            <strong id="topbarName">&nbsp;</strong>
                            <small id="topbarEmail">&nbsp;</small>
                        </div>
                        <div class="avatar" id="userAvatar">FA</div>
                    </button>
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

    <script src="functions.js?v=20261106txview1" defer></script>
</body>
</html>
