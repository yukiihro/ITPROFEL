<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';
requireLogin();

$pageTitle = 'Settings';

$user = currentUser();
$success = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = trim($_POST['name'] ?? '');
    $username = trim($_POST['username'] ?? '');
    $avatarPath = trim((string)($user['avatar_path'] ?? ''));

    if ($name === '' || $username === '') {
        $error = 'Name and username are required.';
    } else {
        $pdo = getDB();
        try {
            if (!empty($_FILES['avatar']['name'])) {
                if ($_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
                    throw new RuntimeException('The profile photo could not be uploaded.');
                }
                if ($_FILES['avatar']['size'] > 10 * 1024 * 1024) {
                    throw new RuntimeException('Profile photo must be 10 MB or smaller.');
                }
                $finfo = new finfo(FILEINFO_MIME_TYPE);
                $mime = $finfo->file($_FILES['avatar']['tmp_name']);
                $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
                if (!isset($allowed[$mime])) {
                    throw new RuntimeException('Use a JPG, PNG, or WebP image.');
                }

                $uploadDir = __DIR__ . '/assets/uploads/avatars';
                if (!is_dir($uploadDir) && !mkdir($uploadDir, 0755, true)) {
                    throw new RuntimeException('The avatar upload folder could not be created.');
                }
                $filename = 'user_' . (int)$user['id'] . '_' . bin2hex(random_bytes(6)) . '.' . $allowed[$mime];
                $destination = $uploadDir . '/' . $filename;
                if (!move_uploaded_file($_FILES['avatar']['tmp_name'], $destination)) {
                    throw new RuntimeException('The profile photo could not be saved.');
                }
                if ($avatarPath !== '' && strpos($avatarPath, 'assets/uploads/avatars/') === 0) {
                    $oldFile = __DIR__ . '/' . $avatarPath;
                    if (is_file($oldFile)) @unlink($oldFile);
                }
                $avatarPath = 'assets/uploads/avatars/' . $filename;
            }

            $stmt = $pdo->prepare('UPDATE users SET full_name= ?, username = ?, avatar_path = ? WHERE user_id = ?');
            $stmt->execute([$name, $username, $avatarPath !== '' ? $avatarPath : null, $user['id'] ?? 0]);
            $_SESSION['user']['name'] = $name;
            $_SESSION['user']['full_name'] = $name;
            $_SESSION['user']['username'] = $username;
            $_SESSION['user']['avatar_path'] = $avatarPath;
            $user = currentUser();
            $success = 'Profile updated successfully.';
        } catch (Throwable $e) {
            $error = $e instanceof RuntimeException ? $e->getMessage() : 'That username may already be in use.';
        }
    }
}
$initial = strtoupper(substr($user['full_name'] ?? 'S', 0, 1));
$avatarPath = trim((string)($user['avatar_path'] ?? ''));
include __DIR__ . '/includes/header.php';
?>
<section class="settings-page">
    <div class="page-intro">
        <p class="eyebrow">ACCOUNT</p>
        <h2>Manage Profile</h2>
        <p>Keep your personal account information up to date.</p>
    </div>

    <?php if ($success): ?><div class="alert success"><?= htmlspecialchars($success) ?></div><?php endif; ?>
    <?php if ($error): ?><div class="alert error"><?= htmlspecialchars($error) ?></div><?php endif; ?>

    <div class="settings-grid">
        <section class="panel profile-card-large">
            <div class="profile-card-heading">
                <div class="profile-modal-avatar">
                    <?php if ($avatarPath !== ''): ?><img src="<?= htmlspecialchars($avatarPath) ?>" alt="Profile photo"><?php else: ?><span><?= htmlspecialchars($initial) ?></span><?php endif; ?>
                </div>
                <div>
                    <p class="eyebrow">PROFILE</p>
                    <h2><?= htmlspecialchars($user['name']) ?></h2>
                    <p><?= htmlspecialchars($user['role']) ?> · @<?= htmlspecialchars($user['username']) ?></p>
                </div>
            </div>

            <form method="POST" enctype="multipart/form-data" class="settings-form">
                <label>Profile Photo
                    <input type="file" name="avatar" accept="image/jpeg,image/png,image/webp">
                    <small>JPG, PNG, or WebP · maximum 2 MB</small>
                </label>
                <label>Full Name
                    <input type="text" name="name" value="<?= htmlspecialchars($user['name']) ?>" required>
                </label>
                <label>Username
                    <input type="text" name="username" value="<?= htmlspecialchars($user['username']) ?>" required>
                </label>
                <label>Role
                    <input type="text" value="<?= htmlspecialchars($user['role']) ?>" disabled>
                </label>
                <div class="form-actions">
                    <button type="submit" class="primary-btn">Save Profile</button>
                </div>
            </form>
        </section>

        <section class="panel">
            <p class="eyebrow">QUICK ACTIONS</p>
            <h2>Account</h2>
            <div class="quick-links">
                <a href="account_settings.php" class="quick-link"><span>⚙</span>
                    <div><b>Account Settings</b><small>Change your password and preferences.</small></div>→
                </a>
                <a href="help_center.php" class="quick-link"><span>?</span>
                    <div><b>Help Center</b><small>Find answers about the sales system.</small></div>→
                </a>
            </div>
        </section>
    </div>
</section>
<?php include __DIR__ . '/includes/footer.php'; ?>