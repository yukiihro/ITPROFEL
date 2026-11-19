<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';
requireSalesAdmin();

$pdo = getDB();
$error = '';
$notice = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $userId = (int)($_POST['user_id'] ?? 0);
    $decision = $_POST['decision'] ?? '';

    if ($userId <= 0 || !in_array($decision, ['approve', 'reject'], true)) {
        $error = 'Invalid account verification request.';
    } else {
        try {
            $pdo->beginTransaction();
            $stmt = $pdo->prepare("
                SELECT u.user_id, u.customer_id, u.full_name
                FROM users u
                WHERE u.user_id = ? AND u.role = 'Customer' AND u.account_status = 'Pending'
                FOR UPDATE
            ");
            $stmt->execute([$userId]);
            $account = $stmt->fetch();

            if (!$account) {
                $pdo->rollBack();
                $error = 'This account is no longer pending verification.';
            } else {
                $approved = $decision === 'approve';
                $accountStatus = $approved ? 'Approved' : 'Rejected';
                $userStatus = $approved ? 'Active' : 'Inactive';
                $pdo->prepare('UPDATE users SET account_status = ?, status = ? WHERE user_id = ?')
                    ->execute([$accountStatus, $userStatus, $userId]);
                $pdo->prepare('UPDATE customers SET status = ? WHERE cus_id = ?')
                    ->execute([$userStatus, (int)$account['customer_id']]);
                logActivity(
                    $pdo,
                    $approved ? 'Approve' : 'Reject',
                    'Customer Account',
                    ($approved ? 'Approved ' : 'Rejected ') . $account['full_name'],
                    $userId
                );
                $pdo->commit();
                header('Location: customer_account_approvals.php?status=' . strtolower($accountStatus));
                exit;
            }
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log('Customer account verification failed: ' . $e->getMessage());
            $error = 'Could not update the account verification status.';
        }
    }
}

$accounts = $pdo->query("
    SELECT u.user_id, u.full_name, u.username, u.created_at,
           c.customer_code, c.email, c.phone, c.address, c.city, c.province
    FROM users u
    JOIN customers c ON c.cus_id = u.customer_id
    WHERE u.role = 'Customer' AND u.account_status = 'Pending'
    ORDER BY u.created_at ASC, u.user_id ASC
")->fetchAll();

$statusMessages = [
    'approved' => 'Customer account approved. The customer can now sign in.',
    'rejected' => 'Customer account rejected. Sign-in has been disabled.',
];
$statusKey = $_GET['status'] ?? '';
$statusMessage = is_string($statusKey) ? ($statusMessages[$statusKey] ?? '') : '';
$pageTitle = 'Customer Account Verification';
include __DIR__ . '/includes/header.php';
?>

<div class="page-toolbar">
    <p class="muted" style="color:white;">Review new customer registrations before they can use the customer portal.</p>
</div>
<?php if ($statusMessage): ?><div class="alert success"><?= htmlspecialchars($statusMessage) ?></div><?php endif; ?>
<?php if ($error): ?><div class="alert error"><?= htmlspecialchars($error) ?></div><?php endif; ?>

<div class="panel">
    <div class="table-wrap">
        <table class="data-table">
            <thead>
                <tr><th>Customer</th><th>Username</th><th>Contact</th><th>Address</th><th>Submitted</th><th>Decision</th></tr>
            </thead>
            <tbody>
                <?php if (!$accounts): ?><tr><td colspan="6" class="empty-row">No customer accounts are waiting for verification.</td></tr><?php endif; ?>
                <?php foreach ($accounts as $account): ?>
                    <tr>
                        <td><strong><?= htmlspecialchars($account['full_name']) ?></strong><br><small><?= htmlspecialchars($account['customer_code']) ?></small></td>
                        <td><?= htmlspecialchars($account['username']) ?></td>
                        <td><?= htmlspecialchars($account['email'] ?? '') ?><br><small><?= htmlspecialchars($account['phone'] ?? '') ?></small></td>
                        <td><?= htmlspecialchars(implode(', ', array_filter([$account['address'], $account['city'], $account['province']]))) ?></td>
                        <td><?= niceDate($account['created_at']) ?></td>
                        <td>
                            <div class="inline-actions">
                                <form method="POST" onsubmit="return confirm('Approve this customer account?');">
                                    <input type="hidden" name="user_id" value="<?= (int)$account['user_id'] ?>">
                                    <button class="table-action approve" name="decision" value="approve">Approve</button>
                                </form>
                                <form method="POST" onsubmit="return confirm('Reject this customer account? The customer will not be able to sign in.');">
                                    <input type="hidden" name="user_id" value="<?= (int)$account['user_id'] ?>">
                                    <button class="table-action reject" name="decision" value="reject">Reject</button>
                                </form>
                            </div>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>
<?php include __DIR__ . '/includes/footer.php'; ?>
