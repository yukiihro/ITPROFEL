<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';

requireLogin();
$user = currentUser();
if (!in_array($user['role'] ?? '', ['Sales Admin', 'Sales Staff'], true)) {
    http_response_code(403);
    exit('You are not authorized to review customer payments.');
}

$pdo = getDB();
$error = '';
$pageTitle = 'Customer Payment Review';
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $csrfValue = $_POST['csrf_token'] ?? '';
    $idValue = $_POST['submission_id'] ?? '';
    $actionValue = $_POST['action'] ?? '';
    $noteValue = $_POST['review_note'] ?? '';
    $csrfToken = is_string($csrfValue) ? $csrfValue : '';
    $submissionId = is_string($idValue) && ctype_digit($idValue) ? (int)$idValue : 0;
    $action = is_string($actionValue) ? $actionValue : '';
    $note = is_string($noteValue) ? trim($noteValue) : '';

    if (!hash_equals($_SESSION['csrf_token'], $csrfToken)) {
        http_response_code(400);
        $error = 'Your review form expired. Reload the page and try again.';
    } elseif ($submissionId <= 0 || !in_array($action, ['approve', 'reject'], true)) {
        $error = 'Select a valid payment submission and action.';
    } elseif (strlen($note) > 500 || ($action === 'reject' && $note === '')) {
        $error = 'Enter a rejection reason of no more than 500 characters.';
    } else {
        try {
            $pdo->beginTransaction();

            $lookup = $pdo->prepare('SELECT invoice_id FROM customer_payment_submissions WHERE submission_id = ?');
            $lookup->execute([$submissionId]);
            $invoiceId = (int)$lookup->fetchColumn();
            if ($invoiceId <= 0) {
                throw new DomainException('Payment submission not found.');
            }

            $invoiceStmt = $pdo->prepare("
                SELECT i.inv_id, i.invoice_no, i.invoice_date, i.total_amount, i.amount_paid, i.status,
                       i.order_id, o.status AS order_status
                FROM sales_invoices i
                JOIN sales_orders o ON o.so_id = i.order_id
                WHERE i.inv_id = ?
                FOR UPDATE
            ");
            $invoiceStmt->execute([$invoiceId]);
            $invoice = $invoiceStmt->fetch(PDO::FETCH_ASSOC);

            $submissionStmt = $pdo->prepare("
                SELECT submission_id, amount, payment_method, reference_no, status
                FROM customer_payment_submissions
                WHERE submission_id = ?
                FOR UPDATE
            ");
            $submissionStmt->execute([$submissionId]);
            $submission = $submissionStmt->fetch(PDO::FETCH_ASSOC);

            if (!$invoice || !$submission) {
                throw new DomainException('Payment submission or invoice not found.');
            }
            if ($submission['status'] !== 'Pending') {
                throw new DomainException('This payment submission has already been reviewed.');
            }

            if ($action === 'reject') {
                $review = $pdo->prepare("
                    UPDATE customer_payment_submissions
                    SET status = 'Rejected', review_note = ?, reviewed_by = ?, reviewed_at = NOW()
                    WHERE submission_id = ? AND status = 'Pending'
                ");
                $review->execute([$note, (int)$user['id'], $submissionId]);
                $pdo->commit();

                logActivity($pdo, 'Reject', 'Customer Payment', 'Rejected payment proof for ' . $invoice['invoice_no'], $submissionId);
                $_SESSION['payment_review_flash'] = 'Payment submission rejected. The invoice balance was not changed.';
                header('Location: payment_submissions.php?status=Pending', true, 303);
                exit;
            }

            $toCentavos = static function ($value): ?int {
                $amount = (string)$value;
                if (!preg_match('/^\d{1,10}(?:\.\d{1,2})?$/', $amount)) {
                    return null;
                }
                [$pesos, $centavos] = array_pad(explode('.', $amount, 2), 2, '0');
                return ((int)$pesos * 100) + (int)str_pad($centavos, 2, '0');
            };
            $totalCentavos = $toCentavos($invoice['total_amount']);
            $paidCentavos = $toCentavos($invoice['amount_paid']);
            $submissionCentavos = $toCentavos($submission['amount']);
            $remainingCentavos = ($totalCentavos !== null && $paidCentavos !== null)
                ? max(0, $totalCentavos - $paidCentavos)
                : 0;

            $cannotApprove = in_array($invoice['status'], ['Paid', 'Returned'], true)
                || in_array($invoice['order_status'], ['Cancelled', 'Returned'], true)
                || $submissionCentavos === null
                || $submissionCentavos <= 0
                || $submissionCentavos > $remainingCentavos;

            if ($cannotApprove) {
                $reason = 'Invoice is no longer payable or does not have enough balance for this amount.';
                $review = $pdo->prepare("
                    UPDATE customer_payment_submissions
                    SET status = 'Rejected', review_note = ?, reviewed_by = ?, reviewed_at = NOW()
                    WHERE submission_id = ? AND status = 'Pending'
                ");
                $review->execute([$reason, (int)$user['id'], $submissionId]);
                $pdo->commit();

                logActivity($pdo, 'Reject', 'Customer Payment', 'Auto-rejected unpayable submission for ' . $invoice['invoice_no'], $submissionId);
                $_SESSION['payment_review_flash'] = $reason . ' No collection was recorded.';
                header('Location: payment_submissions.php?status=Pending', true, 303);
                exit;
            }

            $newPaidCentavos = $paidCentavos + $submissionCentavos;
            $newStatus = $newPaidCentavos >= $totalCentavos ? 'Paid' : 'Partially Paid';
            $newPaidAmount = intdiv($newPaidCentavos, 100) . '.' . str_pad((string)($newPaidCentavos % 100), 2, '0', STR_PAD_LEFT);
            $collectionNo = 'COL-PAY-' . str_pad((string)$submissionId, 12, '0', STR_PAD_LEFT);
            $dueDate = date('Y-m-d', strtotime((string)$invoice['invoice_date'] . ' +30 days'));

            $insertCollection = $pdo->prepare("
                INSERT INTO collections
                    (collection_no, invoice_id, collection_date, due_date, amount, method)
                VALUES (?, ?, CURDATE(), ?, ?, ?)
            ");
            $insertCollection->execute([
                $collectionNo,
                $invoiceId,
                $dueDate,
                intdiv($submissionCentavos, 100) . '.' . str_pad((string)($submissionCentavos % 100), 2, '0', STR_PAD_LEFT),
                $submission['payment_method'],
            ]);

            $updateInvoice = $pdo->prepare('UPDATE sales_invoices SET amount_paid = ?, status = ? WHERE inv_id = ?');
            $updateInvoice->execute([$newPaidAmount, $newStatus, $invoiceId]);

            $updateOrder = $pdo->prepare("
                UPDATE sales_orders
                SET payment_method = ?, payment_status = ?, payment_reference = ?,
                    paid_at = CASE WHEN ? = 'Paid' THEN COALESCE(paid_at, NOW()) ELSE paid_at END
                WHERE so_id = ?
            ");
            $updateOrder->execute([
                $submission['payment_method'],
                $newStatus,
                $submission['reference_no'],
                $newStatus,
                (int)$invoice['order_id'],
            ]);

            $review = $pdo->prepare("
                UPDATE customer_payment_submissions
                SET status = 'Approved', review_note = ?, reviewed_by = ?, reviewed_at = NOW(), collection_no = ?
                WHERE submission_id = ? AND status = 'Pending'
            ");
            $review->execute([$note !== '' ? $note : null, (int)$user['id'], $collectionNo, $submissionId]);
            syncSalesOrderCompletion($pdo, (int)$invoice['order_id']);
            $pdo->commit();

            logActivity($pdo, 'Approve', 'Customer Payment', 'Approved ' . $collectionNo . ' for ' . $invoice['invoice_no'], $submissionId);
            $_SESSION['payment_review_flash'] = 'Payment verified and recorded. The invoice balance has been updated.';
            header('Location: payment_submissions.php?status=Pending', true, 303);
            exit;
        } catch (DomainException $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            $error = $e->getMessage();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log('Customer payment review failed: ' . $e->getMessage());
            $error = 'Unable to save the review. No payment or invoice changes were saved.';
        }
    }
}

$status = is_string($_GET['status'] ?? null) ? $_GET['status'] : 'Pending';
if (!in_array($status, ['Pending', 'Approved', 'Rejected', 'All'], true)) {
    $status = 'Pending';
}

$sql = "
    SELECT s.submission_id, s.amount, s.payment_method, s.reference_no, s.receipt_name,
           s.status, s.review_note, s.created_at, s.collection_no,
           i.invoice_no, i.total_amount, i.amount_paid, o.order_no,
           c.customer_name, reviewer.full_name AS reviewer_name
    FROM customer_payment_submissions s
    JOIN sales_invoices i ON i.inv_id = s.invoice_id
    JOIN sales_orders o ON o.so_id = i.order_id
    JOIN customers c ON c.cus_id = s.customer_id
    LEFT JOIN users reviewer ON reviewer.user_id = s.reviewed_by
";
$params = [];
if ($status !== 'All') {
    $sql .= ' WHERE s.status = ?';
    $params[] = $status;
}
$sql .= ' ORDER BY s.submission_id DESC LIMIT 200';
$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$submissions = $stmt->fetchAll(PDO::FETCH_ASSOC);
$flash = $_SESSION['payment_review_flash'] ?? '';
unset($_SESSION['payment_review_flash']);

include __DIR__ . '/includes/header.php';
?>

<div class="page-toolbar">
    <p class="muted" style="color:white;">Verify customer-provided payment details before recording a collection.</p>
</div>

<?php if ($flash): ?><div class="alert success"><?= htmlspecialchars($flash, ENT_QUOTES, 'UTF-8') ?></div><?php endif; ?>
<?php if ($error): ?><div class="alert error"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></div><?php endif; ?>

<div class="module-search">
    <?php foreach (['Pending', 'Approved', 'Rejected', 'All'] as $filter): ?>
        <a class="table-action" href="payment_submissions.php?status=<?= rawurlencode($filter) ?>"><?= htmlspecialchars($filter, ENT_QUOTES, 'UTF-8') ?></a>
    <?php endforeach; ?>
</div>

<div class="panel">
    <div class="table-wrap">
        <table>
            <thead>
                <tr>
                    <th>Submitted</th>
                    <th>Customer / Invoice</th>
                    <th>Amount / Method</th>
                    <th>Reference / Receipt</th>
                    <th>Status / Review Note</th>
                    <th>Review</th>
                </tr>
            </thead>
            <tbody>
                <?php if (!$submissions): ?>
                    <tr class="empty-row"><td colspan="6">No payment submissions in this queue.</td></tr>
                <?php endif; ?>
                <?php foreach ($submissions as $submission): ?>
                    <tr>
                        <td><?= niceDate($submission['created_at']) ?></td>
                        <td>
                            <strong><?= htmlspecialchars($submission['customer_name'], ENT_QUOTES, 'UTF-8') ?></strong><br>
                            <?= htmlspecialchars($submission['invoice_no'], ENT_QUOTES, 'UTF-8') ?>
                            <small>(<?= htmlspecialchars($submission['order_no'], ENT_QUOTES, 'UTF-8') ?>)</small>
                        </td>
                        <td>
                            <?= peso((float)$submission['amount']) ?><br>
                            <span class="badge info"><?= htmlspecialchars($submission['payment_method'], ENT_QUOTES, 'UTF-8') ?></span>
                        </td>
                        <td>
                            <?= htmlspecialchars($submission['reference_no'], ENT_QUOTES, 'UTF-8') ?><br>
                            <a class="table-action" target="_blank" rel="noopener" href="payment_submission_receipt.php?id=<?= (int)$submission['submission_id'] ?>">View receipt</a>
                            <br><small><?= htmlspecialchars($submission['receipt_name'], ENT_QUOTES, 'UTF-8') ?></small>
                        </td>
                        <td>
                            <span class="badge <?= badgeClass($submission['status']) ?>"><?= htmlspecialchars($submission['status'], ENT_QUOTES, 'UTF-8') ?></span>
                            <?php if ($submission['review_note']): ?><br><small><?= htmlspecialchars($submission['review_note'], ENT_QUOTES, 'UTF-8') ?></small><?php endif; ?>
                            <?php if ($submission['collection_no']): ?><br><small><?= htmlspecialchars($submission['collection_no'], ENT_QUOTES, 'UTF-8') ?></small><?php endif; ?>
                        </td>
                        <td>
                            <?php if ($submission['status'] === 'Pending'): ?>
                                <form method="POST" style="display:grid; gap:8px; min-width:190px;">
                                    <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($_SESSION['csrf_token'], ENT_QUOTES, 'UTF-8') ?>">
                                    <input type="hidden" name="submission_id" value="<?= (int)$submission['submission_id'] ?>">
                                    <input type="hidden" name="action" value="approve">
                                    <button class="primary-btn" type="submit">Verify &amp; Record</button>
                                </form>
                                <form method="POST" style="display:grid; gap:8px; min-width:190px; margin-top:8px;">
                                    <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($_SESSION['csrf_token'], ENT_QUOTES, 'UTF-8') ?>">
                                    <input type="hidden" name="submission_id" value="<?= (int)$submission['submission_id'] ?>">
                                    <input type="hidden" name="action" value="reject">
                                    <textarea name="review_note" maxlength="500" placeholder="Reason for rejection" required></textarea>
                                    <button class="secondary-btn" type="submit">Reject</button>
                                </form>
                            <?php else: ?>
                                <?= htmlspecialchars($submission['reviewer_name'] ?? 'Sales', ENT_QUOTES, 'UTF-8') ?>
                            <?php endif; ?>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>
