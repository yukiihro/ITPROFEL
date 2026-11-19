<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';

requireSalesAdmin();

$pdo = getDB();
$perPage = 30;
$totalRows = (int)$pdo->query('SELECT COUNT(*) FROM activity_logs')->fetchColumn();
$totalPages = max(1, (int)ceil($totalRows / $perPage));
$page = max(1, min((int)($_GET['page'] ?? 1), $totalPages));

$activityStmt = $pdo->prepare("
    SELECT a.action, a.module, a.description, a.created_at,
           CASE WHEN a.user_id = 0 THEN 'System'
                ELSE COALESCE(NULLIF(u.full_name, ''), u.username, CONCAT('User #', a.user_id))
           END AS user_name
    FROM activity_logs a
    LEFT JOIN users u ON u.user_id = a.user_id
    ORDER BY a.created_at DESC, a.log_id DESC
    LIMIT :limit OFFSET :offset
");
$activityStmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
$activityStmt->bindValue(':offset', ($page - 1) * $perPage, PDO::PARAM_INT);
$activityStmt->execute();
$activities = $activityStmt->fetchAll(PDO::FETCH_ASSOC);

$pageTitle = 'Recent User Activity';
include __DIR__ . '/includes/header.php';
?>
<section class="panel activity-page">
    <div class="panel-head">
        <div>
            <p class="eyebrow dark">SALES ADMINISTRATION</p>
            <h2>Recent User Activity</h2>
            <p class="muted">Audit trail of actions recorded across the Sales System.</p>
        </div>
        <span class="activity-total"><?= number_format($totalRows) ?> activities</span>
    </div>

    <?php if ($activities): ?>
        <div class="activity-list">
            <?php foreach ($activities as $activity): ?>
                <?php $createdAt = strtotime((string)$activity['created_at']); ?>
                <article class="activity-item">
                    <span class="activity-marker" aria-hidden="true"></span>
                    <div class="activity-copy">
                        <strong><?= htmlspecialchars($activity['user_name']) ?></strong>
                        <span><?= htmlspecialchars($activity['action']) ?> · <?= htmlspecialchars($activity['module']) ?></span>
                        <?php if (!empty($activity['description'])): ?>
                            <p><?= htmlspecialchars($activity['description']) ?></p>
                        <?php endif; ?>
                    </div>
                    <time datetime="<?= $createdAt ? htmlspecialchars(date(DATE_ATOM, $createdAt)) : '' ?>">
                        <?= $createdAt ? htmlspecialchars(date('M j, Y g:i A', $createdAt)) : '—' ?>
                    </time>
                </article>
            <?php endforeach; ?>
        </div>

        <?php if ($totalPages > 1): ?>
            <nav class="table-pagination activity-pagination" aria-label="Activity pages">
                <?php if ($page > 1): ?>
                    <a href="?page=<?= $page - 1 ?>" aria-label="Previous page">Previous</a>
                <?php else: ?>
                    <span class="pagination-disabled" aria-disabled="true">Previous</span>
                <?php endif; ?>
                <span>Page <?= $page ?> of <?= $totalPages ?></span>
                <?php if ($page < $totalPages): ?>
                    <a href="?page=<?= $page + 1 ?>" aria-label="Next page">Next</a>
                <?php else: ?>
                    <span class="pagination-disabled" aria-disabled="true">Next</span>
                <?php endif; ?>
            </nav>
        <?php endif; ?>
    <?php else: ?>
        <div class="note-card"><b>No user activity yet.</b><span>Recorded Sales System actions will appear here.</span></div>
    <?php endif; ?>
</section>
<?php include __DIR__ . '/includes/footer.php'; ?>
