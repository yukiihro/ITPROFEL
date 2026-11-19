<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';

if (empty($_SESSION['user'])) {
    http_response_code(401);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => 'Authentication required.']);
    exit;
}

$notificationUser = currentUser();
$notificationRole = (string)($notificationUser['role'] ?? '');
if (!in_array($notificationRole, ['Sales Admin', 'Sales Staff'], true)) {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => 'Access denied.']);
    exit;
}

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function salesNotificationResponse(bool $success, string $message, $data = null, int $status = 200): void
{
    http_response_code($status);
    $response = ['success' => $success, 'message' => $message];
    if ($data !== null) {
        $response['data'] = $data;
    }
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$pdo = getDB();
$method = (string)($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($method === 'POST') {
    $csrfToken = (string)($_SESSION['csrf_token'] ?? '');
    $providedToken = (string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if ($csrfToken === '' || $providedToken === '' || !hash_equals($csrfToken, $providedToken)) {
        salesNotificationResponse(false, 'Invalid request token.', null, 403);
    }

    $payload = json_decode((string)file_get_contents('php://input'), true);
    if (!is_array($payload)) {
        salesNotificationResponse(false, 'A valid JSON request body is required.', null, 400);
    }

    if (($payload['action'] ?? '') === 'mark_all_read') {
        $stmt = $pdo->prepare('UPDATE user_notifications SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL');
        $stmt->execute([(int)currentUser()['id']]);
        salesNotificationResponse(true, 'Notifications marked as read.');
    }

    if (($payload['action'] ?? '') === 'mark_read') {
        $notificationId = filter_var($payload['notification_id'] ?? null, FILTER_VALIDATE_INT);
        if ($notificationId === false || $notificationId <= 0) {
            salesNotificationResponse(false, 'A valid notification_id is required.', null, 422);
        }
        $stmt = $pdo->prepare('UPDATE user_notifications SET read_at = NOW() WHERE notification_id = ? AND user_id = ? AND read_at IS NULL');
        $stmt->execute([(int)$notificationId, (int)currentUser()['id']]);
        salesNotificationResponse(true, 'Notification marked as read.');
    }

    salesNotificationResponse(false, 'Unsupported notification action.', null, 422);
}

if ($method !== 'GET') {
    header('Allow: GET, POST');
    salesNotificationResponse(false, 'Method not allowed.', null, 405);
}

try {
    if ($notificationRole === 'Sales Admin') {
        syncInventoryStockouts($pdo);
    }
} catch (Throwable $e) {
    error_log('Sales notification Inventory sync error: ' . $e->getMessage());
    salesNotificationResponse(false, 'Could not refresh Inventory request notifications.', null, 502);
}

try {
    $userId = (int)$notificationUser['id'];
    $unreadStmt = $pdo->prepare('SELECT COUNT(*) FROM user_notifications WHERE user_id = ? AND read_at IS NULL');
    $unreadStmt->execute([$userId]);
    $notificationsStmt = $pdo->prepare("
        SELECT notification_id, title, message, link, created_at, read_at
        FROM user_notifications
        WHERE user_id = ?
        ORDER BY created_at DESC, notification_id DESC
        LIMIT 8
    ");
    $notificationsStmt->execute([$userId]);
    salesNotificationResponse(true, 'Notifications retrieved.', [
        'unread_count' => (int)$unreadStmt->fetchColumn(),
        'notifications' => $notificationsStmt->fetchAll(PDO::FETCH_ASSOC),
    ]);
} catch (Throwable $e) {
    error_log('Sales notification lookup error: ' . $e->getMessage());
    salesNotificationResponse(false, 'Could not load notifications.', null, 500);
}
