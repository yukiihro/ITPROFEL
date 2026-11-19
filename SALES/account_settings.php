<?php
$pageTitle = 'Settings';
include __DIR__ . '/includes/header.php';

$user = currentUser();
$success = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $currentPassword = $_POST['current_password'] ?? '';
    $newPassword = $_POST['new_password'] ?? '';
    $confirmPassword = $_POST['confirm_password'] ?? '';

    if (strlen($newPassword) < 6) {
        $error = 'New password must be at least 6 characters.';
    } elseif ($newPassword !== $confirmPassword) {
        $error = 'New password and confirmation do not match.';
    } else {
        $pdo = getDB();
        $stmt = $pdo->prepare('SELECT password FROM users WHERE user_id = ? LIMIT 1');
        $stmt->execute([$user['id'] ?? 0]);
        $dbUser = $stmt->fetch();
        $valid = $dbUser && password_verify($currentPassword, $dbUser['password']);

        if (!$valid) {
            $error = 'Current password is incorrect.';
        } else {
            $stmt = $pdo->prepare('UPDATE users SET password = ? WHERE user_id = ?');
            $stmt->execute([password_hash($newPassword, PASSWORD_DEFAULT), $user['id'] ?? 0]);
            $success = 'Password changed successfully.';
        }
    }
}
?>
<section class="settings-page">
    <div class="page-intro">
        <p class="eyebrow">ACCOUNT</p>
        <h2>Account Settings</h2>
        <p>Manage your password and basic account preferences.</p>
    </div>

    <?php if ($success): ?><div class="alert success"><?= htmlspecialchars($success) ?></div><?php endif; ?>
    <?php if ($error): ?><div class="alert error"><?= htmlspecialchars($error) ?></div><?php endif; ?>

    <div class="settings-grid">
        <section class="panel">
            <p class="eyebrow">SECURITY</p>
            <h2>Change Password</h2>
            <p class="settings-description">Use a strong password that you do not reuse on other accounts.</p>
            <form method="POST" class="settings-form">
                <label>Current Password
                    <input type="password" name="current_password" required>
                </label>
                <label>New Password
                    <input type="password" name="new_password" minlength="6" required>
                </label>
                <label>Confirm New Password
                    <input type="password" name="confirm_password" minlength="6" required>
                </label>
                <button type="submit" class="primary-btn">Update Password</button>
            </form>
        </section>

        <section class="panel">
            <p class="eyebrow">PREFERENCES</p>
            <h2>System Preferences</h2>
            <div class="preference-list">
                <label class="toggle-row"><span><b>Activity notifications</b><small>Show important sales activity alerts.</small></span><input type="checkbox" checked><i></i></label>
                <label class="toggle-row"><span><b>Compact tables</b><small>Use tighter spacing in data tables.</small></span><input type="checkbox"><i></i></label>
            </div>
            <div class="note-card"><b>Account</b><span>Signed in as <?= htmlspecialchars($user['username']) ?> (<?= htmlspecialchars($user['role']) ?>).</span></div>
        </section>
    </div>
</section>
<?php include __DIR__ . '/includes/footer.php'; ?>
