<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/auth.php';
requireLogin();
$user = currentUser();
$pageTitle = $pageTitle ?? 'Dashboard';
$currentPage = basename($_SERVER['PHP_SELF']);
$responsivePageClasses = [
    'inventory.php' => 'inventory-responsive',
    'inventory_stockout_approval.php' => 'stockout-responsive',
    'reports.php' => 'reports-responsive',
];
$responsivePageClass = $responsivePageClasses[$currentPage] ?? '';
$coreModules = [
    'quotations.php' => ['label' => 'Sales Quotation', 'icon' => '▤'],
    'purchase_orders.php' => ['label' => 'Purchase Order', 'icon' => '▣'],
    'orders.php' => ['label' => 'Sales Order', 'icon' => '▣'],
    'delivery.php' => ['label' => 'Delivery', 'icon' => '▱'],
];
$billingModules = [
    'customer_account.php' => ['label' => 'Billing & Finance', 'icon' => '◷'],
    'invoices.php' => ['label' => 'Sales Invoice', 'icon' => '▥'],
];
$activeModuleSection = array_key_exists($currentPage, $billingModules)
    ? 'billing'
    : (array_key_exists($currentPage, $coreModules) ? 'core' : '');
$initial = strtoupper(substr($user['name'] ?? 'S', 0, 1));
$avatarPath = trim((string)($user['avatar_path'] ?? ''));
$avatarSrc = $avatarPath !== '' ? $avatarPath : '';
$isSalesAdmin = ($user['role'] ?? '') === 'Sales Admin';
$isSalesStaff = ($user['role'] ?? '') === 'Sales Staff';
$isCustomer = ($user['role'] ?? '') === 'Customer';
if ($isCustomer && $currentPage !== 'customer_portal.php') {
    header('Location: customer_portal.php');
    exit;
}
$isSystemAdmin = in_array(($user['role'] ?? ''), ['System Admin', 'Administrator'], true);
if (($isSalesAdmin || $isSalesStaff) && empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($pageTitle) ?> | Team Sales</title>
    <link rel="stylesheet" href="assets/css/style.css">
    <link rel="stylesheet" href="assets/css/formal_override.css?v=20261008">
    <link rel="stylesheet" href="assets/css/redesign.css?v=20261110">
    <link rel="icon" href="assets/img/logo.png">
</head>

<body>
    <div class="app-shell <?= $isCustomer ? 'customer-shell' : '' ?>">
        <?php include __DIR__ . '/sidebar.php'; ?>
        <main class="main-content <?= $isCustomer ? 'customer-main' : '' ?> <?= htmlspecialchars($responsivePageClass) ?>">
            <header class="topbar">
                <button class="mobile-menu" id="mobileMenu" aria-label="Open navigation">☰</button>
                <div class="banner">
                    <p class="eyebrow"><?= $isSystemAdmin ? 'SYSTEM ADMIN' : ($isSalesAdmin ? 'SALES ADMIN' : ($isCustomer ? 'CUSTOMER PORTAL' : ($isSalesStaff ? 'SALES STAFF' : 'SALES ADMIN'))) ?></p>
                    <h1><?= htmlspecialchars($pageTitle) ?></h1>
                </div>

                <div class="topbar-actions">
                    <?php if ($isSalesAdmin || $isSalesStaff): ?>
                        <div class="notification-menu-wrap">
                            <button
                                class="notification-button"
                                id="notificationButton"
                                type="button"
                                aria-label="Notifications"
                                aria-expanded="false"
                                data-csrf-token="<?= htmlspecialchars($_SESSION['csrf_token'], ENT_QUOTES, 'UTF-8') ?>">
                                <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
                                    <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
                                </svg>
                                <span class="notification-badge" id="notificationBadge" hidden>0</span>
                            </button>
                            <section class="notification-dropdown" id="notificationDropdown" aria-label="Notifications">
                                <div class="notification-dropdown-head">
                                    <strong>Notifications</strong>
                                    <button type="button" id="markAllNotificationsRead">Mark all read</button>
                                </div>
                                <div class="notification-list" id="notificationList" aria-live="polite">
                                    <p class="notification-empty">Checking for updates…</p>
                                </div>
                                <a class="notification-footer" href="<?= $isSalesAdmin ? 'sales_quotation_approval.php' : 'quotations.php' ?>"><?= $isSalesAdmin ? 'View approval queues' : 'View customer requests' ?></a>
                            </section>
                        </div>
                    <?php endif; ?>
                    <div class="profile-menu-wrap">
                        <button class="top-profile" id="profileMenuButton" type="button" aria-expanded="false">
                            <span class="avatar">
                                <?php if ($avatarSrc !== ""): ?><img src="<?= htmlspecialchars($avatarSrc) ?>" alt="Profile photo"><?php else: ?><span><?= htmlspecialchars($initial) ?></span><?php endif; ?>
                            </span>
                            <span class="top-user-info">
                                <strong><?= htmlspecialchars($user['name']) ?></strong>
                                <span><?= htmlspecialchars($user['role']) ?></span>
                            </span>
                            <span class="profile-chevron">&#8595;</span>
                        </button>
                        <div class="profile-dropdown" id="profileDropdown">
                            <div class="profile-dropdown-head">
                                <span class="avatar large">
                                    <?php if ($avatarSrc !== ""): ?><img src="<?= htmlspecialchars($avatarSrc) ?>" alt="Profile photo"><?php else: ?><span><?= htmlspecialchars($initial) ?></span><?php endif; ?>
                                </span>
                                <div>
                                    <strong><?= htmlspecialchars($user['name']) ?></strong>
                                    <span>@<?= htmlspecialchars($user['username']) ?></span>
                                </div>
                            </div>
                            <div class="profile-dropdown-links">
                                <button type="button" class="profile-dropdown-link" id="openProfileModal">
                                    <span>◉</span> Manage Profile
                                </button>
                                <a class="profile-dropdown-link" href="account_settings.php">
                                    <span>⚙</span> Account Settings
                                </a>
                                <a class="profile-dropdown-link" href="help_center.php">
                                    <span>?</span> Help Center
                                </a>
                            </div>
                            <div class="profile-dropdown-footer">
                                <a href="logout.php">↪ Logout</a>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <?php if ($isSalesStaff && !$isCustomer && !$isSystemAdmin && $currentPage !== 'dashboard.php' && $currentPage !== 'customers.php' && $currentPage !== 'reports.php' && $currentPage !== 'inventory.php' && $currentPage !== 'inventory_stockout_approval.php' && !in_array($currentPage, ['manage_profile.php', 'account_settings.php', 'help_center.php'], true)): ?>
                <nav class="module-switcher" id="moduleSwitcher">
                    <?php
                    $modulesToShow = $activeModuleSection === 'billing'
                        ? $billingModules
                        : $coreModules;
                    ?>

                    <div class="module-links">
                        <?php foreach ($modulesToShow as $file => $module): ?>

                            <?php
                            $isActive = ($currentPage === $file);
                            ?>

                            <a
                                class="module-link <?= $isActive ? 'active' : '' ?>"
                                href="<?= htmlspecialchars($file) ?>">
                                <span><?= htmlspecialchars($module['icon']) ?></span>
                                <?= htmlspecialchars($module['label']) ?>
                            </a>

                        <?php endforeach; ?>
                    </div>
                </nav>
            <?php endif; ?>

            <!-- Manage Profile modal -->
            <div class="modal-backdrop" id="profileModal" aria-hidden="true">
                <div class="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profileModalTitle">
                    <button class="modal-close" id="closeProfileModal" type="button" aria-label="Close">×</button>
                    <div class="profile-modal-avatar">
                        <?php if ($avatarSrc !== ""): ?><img src="<?= htmlspecialchars($avatarSrc) ?>" alt="Profile photo"><?php else: ?><span><?= htmlspecialchars($initial) ?></span><?php endif; ?>
                    </div>
                    <p class="eyebrow">YOUR ACCOUNT</p>
                    <h2 id="profileModalTitle">Manage Profile</h2>
                    <p class="modal-subtitle">Update the basic information displayed in your Team Sales profile.</p>
                    <form method="POST" action="manage_profile.php" enctype="multipart/form-data" class="profile-form">
                        <label class="avatar-upload-label">Profile Photo
                            <input type="file" name="avatar" accept="image/jpeg,image/png,image/webp">
                            <small>JPG, PNG, or WebP. Maximum 2 MB.</small>
                        </label>
                        <label>Full Name
                            <input type="text" name="name" value="<?= htmlspecialchars($user['name']) ?>" required>
                        </label>
                        <label>Username
                            <input type="text" name="username" value="<?= htmlspecialchars($user['username']) ?>" required>
                        </label>
                        <div class="modal-actions">
                            <button type="button" class="secondary-btn" id="cancelProfileModal">Cancel</button>
                            <button type="submit" class="primary-btn">Save Changes</button>
                        </div>
                    </form>
                    <a class="modal-page-link" href="manage_profile.php">Open full profile page →</a>
                </div>
            </div>