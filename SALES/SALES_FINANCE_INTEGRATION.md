# Sales-to-Finance Accounts Receivable Integration

## Overview

Sales invoices are added to Finance Accounts Receivable only when an authorized
Sales user sends them. Loading or refreshing Finance does not import Sales
invoices. The Sales page shows **Already Sent** for invoices already in
Finance and blocks invoices marked **Returned**.

## Request flow

1. A Sales Staff member opens **Billing > Send Invoice to Finance**.
2. The page lists Sales invoices and sends the selected `inv_id` to:
   `../FINANCE/api.php?action=sync_sales_invoice`
3. Finance validates the shared Sales session and CSRF token, then synchronizes
   the invoice into `finance_hr.accounts_receivable`.
4. Finance matches a customer by name or creates the Finance customer if needed.
   The AR row is linked to the Sales invoice through `sales_id`.

Sending the same invoice again updates its existing AR record; it does not
intentionally create another record.

## Changed files

| File | Change |
| --- | --- |
| `includes/sidebar.php` | Adds the Sales Staff **Send Invoice to Finance** menu item. |
| `includes/header.php` | Adds the Finance send page to the Billing module switcher. |
| `send_to_finance.php` | Lists invoices, checks which are already in Finance, disables sending for returned invoices, and submits eligible invoices with the CSRF token. |
| `../FINANCE/api.php` | Adds authenticated send-status and send actions. It rejects returned invoices, removes automatic Sales reconciliation from Finance state loading, and rejects stale state payloads that would restore cleared Sales AR rows. |
| `../FINANCE/sales_integration.php` | `reconcileSalesToFinance()` requires a specific Sales invoice ID, rejects returned invoices, and inserts or updates only that invoice in Finance AR. |

The same Sales menu and page were also added to the separate
`../../Sales-System` copy:
`includes/sidebar.php`, `includes/header.php`, and `send_to_finance.php`. Its
send-status and send requests use `../ITPROFEL/FINANCE/api.php`.

## Finance data mapping

- Sales invoice ID -> Finance `accounts_receivable.sales_id`
- Sales invoice number and total -> Finance AR invoice number and amount
- Sales invoice status -> Finance AR status (`Unpaid`, `Partially Paid`, or
  `Paid`); invoices marked `Returned` are blocked from sending
- Due date -> 30 days after the Sales invoice date
- Sales customer -> Finance customer matched by name; a missing customer is
  created with the Sales phone, email, and address

Paid invoices remain visible in the AR table with status `Paid`, but are not
counted in Finance's outstanding receivables total.

## Finance state-loading compatibility fix

The live Finance database's `accounts_payable` table has `po_id`, not
`po_number`. The Finance state query previously selected the missing
`po_number` column and failed before returning any state, including receivables.
The query now returns `NULL AS poNumber` for that optional UI field so Finance
can load its state with the current schema.

## Configuration and verification

Finance reads the Sales database using `getSalesDB()` in
`sales_integration.php`. It supports these environment variables:
`SALES_DB_HOST`, `SALES_DB_NAME`, `SALES_DB_USER`, and `SALES_DB_PASSWORD`;
defaults are `localhost`, `team_sales`, `root`, and an empty password.

The former auto-imported Sales AR rows were removed so Finance starts with no
Sales invoices until they are explicitly sent. Associated Finance payment
transactions were preserved; removing their AR rows also removes their direct
AR-to-payment link.

PHP lint passed for the changed PHP files. Before switching to send-only
behavior, reconciliation was verified against the local databases: all 22
Sales invoices had Finance AR rows, a repeat sync created no duplicate Sales
IDs, and `INV-3022` was present with status `Paid`.

After the send-only change, Finance has zero Sales-linked AR rows until an
invoice is sent. The returned-invoice guard was tested against a returned
Sales invoice and created no AR row. PHP lint and inline JavaScript syntax
checks passed for both Sales send pages.

## Source code

These are the relevant implementation excerpts from the files listed above.
Unrelated code in the larger Finance API and shared layout files is omitted.

### `FINANCE/sales_integration.php`

```php
function getSalesDB(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;

    $host = getenv('SALES_DB_HOST') ?: 'localhost';
    $name = getenv('SALES_DB_NAME') ?: 'team_sales';
    $user = getenv('SALES_DB_USER') ?: 'root';
    $pass = getenv('SALES_DB_PASSWORD') ?: '';

    $pdo = new PDO(
        "mysql:host={$host};dbname={$name};charset=utf8mb4",
        $user,
        $pass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
    return $pdo;
}

function reconcileSalesToFinance(int $salesInvoiceId): int
{
    if ($salesInvoiceId <= 0) {
        throw new InvalidArgumentException('A valid Sales invoice ID is required.');
    }

    $sales = getSalesDB();
    $invoiceQuery = '
        SELECT i.inv_id, i.invoice_no, i.invoice_date, i.total_amount, i.status,
               c.customer_name, c.phone, c.email, c.address
        FROM sales_invoices i
        JOIN sales_orders o ON o.so_id = i.order_id
        JOIN customers c ON c.cus_id = o.customer_id';
    $invoiceStatement = $sales->prepare($invoiceQuery . ' WHERE i.inv_id = ? ORDER BY i.inv_id');
    $invoiceStatement->execute([$salesInvoiceId]);
    $invoices = $invoiceStatement->fetchAll();
    if (!$invoices) {
        throw new RuntimeException('The Sales invoice was not found.');
    }
    if (strtolower(trim((string)$invoices[0]['status'])) === 'returned') {
        throw new DomainException('Returned invoices cannot be sent to Finance.');
    }

    $finance = db();
    $customerLookup = $finance->prepare(
        'SELECT customer_id FROM customers WHERE customer_name = LEFT(?, 100) LIMIT 1'
    );
    $customerInsert = $finance->prepare(
        'INSERT INTO customers (customer_name, contact_info, address)
         VALUES (LEFT(?, 100), ?, ?)'
    );
    $receivableLookup = $finance->prepare(
        'SELECT ar_id
         FROM accounts_receivable
         WHERE sales_id = ? OR (COALESCE(sales_id, 0) = 0 AND invoice_no = ?)
         ORDER BY CASE WHEN sales_id = ? THEN 0 ELSE 1 END, ar_id DESC
         LIMIT 1
         FOR UPDATE'
    );
    $receivableUpdate = $finance->prepare(
        'UPDATE accounts_receivable
         SET customer_id = ?, sales_id = ?, invoice_no = ?, amount = ?, due_date = ?, status = ?
         WHERE ar_id = ?'
    );
    $receivableInsert = $finance->prepare(
        'INSERT INTO accounts_receivable
         (customer_id, sales_id, invoice_no, amount, due_date, status)
         VALUES (?, ?, ?, ?, ?, ?)'
    );

    $finance->beginTransaction();
    try {
        foreach ($invoices as $invoice) {
            $customerName = trim((string)$invoice['customer_name']);
            if ($customerName === '') {
                throw new RuntimeException(
                    'Sales invoice ' . (string)$invoice['invoice_no'] . ' has no customer name.'
                );
            }

            $customerLookup->execute([$customerName]);
            $customerId = (int)($customerLookup->fetchColumn() ?: 0);
            if ($customerId === 0) {
                $contact = implode(' | ', array_filter([
                    trim((string)($invoice['phone'] ?? '')),
                    trim((string)($invoice['email'] ?? '')),
                ]));
                $customerInsert->execute([
                    $customerName,
                    $contact,
                    (string)($invoice['address'] ?? ''),
                ]);
                $customerId = (int)$finance->lastInsertId();
            }

            $invoiceDate = DateTimeImmutable::createFromFormat(
                '!Y-m-d',
                (string)$invoice['invoice_date']
            );
            if (!$invoiceDate) {
                throw new RuntimeException(
                    'Sales invoice ' . (string)$invoice['invoice_no'] . ' has an invalid invoice date.'
                );
            }
            $dueDate = $invoiceDate->modify('+30 days')->format('Y-m-d');
            $sourceStatus = strtolower(trim((string)$invoice['status']));
            $status = match ($sourceStatus) {
                'paid' => 'Paid',
                'partially paid', 'partial' => 'Partially Paid',
                'returned' => 'Returned',
                default => 'Unpaid',
            };

            $salesInvoiceId = (int)$invoice['inv_id'];
            $invoiceNo = (string)$invoice['invoice_no'];
            $receivableLookup->execute([$salesInvoiceId, $invoiceNo, $salesInvoiceId]);
            $receivableId = (int)($receivableLookup->fetchColumn() ?: 0);
            if ($receivableId > 0) {
                $receivableUpdate->execute([
                    $customerId,
                    $salesInvoiceId,
                    $invoiceNo,
                    $invoice['total_amount'],
                    $dueDate,
                    $status,
                    $receivableId,
                ]);
            } else {
                $receivableInsert->execute([
                    $customerId,
                    $salesInvoiceId,
                    $invoiceNo,
                    $invoice['total_amount'],
                    $dueDate,
                    $status,
                ]);
            }
        }

        $finance->commit();
        return count($invoices);
    } catch (Throwable $e) {
        if ($finance->inTransaction()) {
            $finance->rollBack();
        }
        throw $e;
    }
}
```

### `FINANCE/api.php`

The Sales page first uses this read-only action to label invoices that already
have a Finance AR row:

```php
if ($action === 'sales_invoice_status' && $method === 'GET') {
    $u = requireUser();
    $department = strtolower(trim((string)($u['department'] ?? '')));
    $role = (string)($u['role'] ?? '');
    if ($department !== 'sales' || !in_array($role, ['Sales Admin', 'Sales Staff'], true)
        || (string)($u['status'] ?? '') !== 'Active') {
        respond(['ok' => false, 'message' => 'Only active Sales users can view invoice send status.'], 403);
    }

    try {
        $sentInvoiceIds = db()->query(
            'SELECT sales_id FROM accounts_receivable WHERE COALESCE(sales_id, 0) > 0'
        )->fetchAll(PDO::FETCH_COLUMN);
        respond(['ok' => true, 'sentSalesInvoiceIds' => array_map('intval', $sentInvoiceIds)]);
    } catch (Throwable $e) {
        error_log('Sales invoice status lookup failed: ' . $e->getMessage());
        respond(['ok' => false, 'message' => 'Finance send status could not be loaded.'], 503);
    }
}
```

The manual send action validates the logged-in Sales account, role, active
status, CSRF token, and invoice ID before calling the reconciliation function:

```php
if ($action === 'sync_sales_invoice' && $method === 'POST') {
    $u = requireUser();
    $department = strtolower(trim((string)($u['department'] ?? '')));
    $role = (string)($u['role'] ?? '');
    if ($department !== 'sales' || !in_array($role, ['Sales Admin', 'Sales Staff'], true)
        || (string)($u['status'] ?? '') !== 'Active') {
        respond(['ok' => false, 'message' => 'Only active Sales users can send invoices to Finance.'], 403);
    }

    $csrfToken = (string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    $sessionToken = (string)($_SESSION['csrf_token'] ?? '');
    if ($csrfToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $csrfToken)) {
        respond(['ok' => false, 'message' => 'Your session expired. Reload Sales and try again.'], 403);
    }

    $salesInvoiceId = filter_var(
        requestBody()['salesInvoiceId'] ?? null,
        FILTER_VALIDATE_INT
    );
    if ($salesInvoiceId === false || $salesInvoiceId === null || $salesInvoiceId <= 0) {
        respond(['ok' => false, 'message' => 'Select a valid Sales invoice.'], 422);
    }

    try {
        reconcileSalesToFinance((int)$salesInvoiceId);
        respond(['ok' => true, 'message' => 'Invoice sent to Finance Accounts Receivable.']);
    } catch (DomainException $e) {
        respond(['ok' => false, 'message' => $e->getMessage()], 422);
    } catch (Throwable $e) {
        error_log('Manual Sales invoice sync failed: ' . $e->getMessage());
        respond(['ok' => false, 'message' => 'The invoice could not be sent to Finance. Please try again.'], 503);
    }
}
```

Finance state loading no longer imports Sales invoices. It still reconciles
Production records independently:

```php
if ($action === 'state' && $method === 'GET') {
    requireUser();
    try {
        reconcileProductionToFinance();
    } catch (Throwable $e) {
        error_log('Production to Finance reconciliation failed: ' . $e->getMessage());
    }
    respond(['ok' => true, 'state' => loadState()]);
}
```

When Finance saves receivables, it ignores a Sales-linked row unless the same
Sales invoice is already present in Finance. This prevents a stale browser tab
from restoring rows that were cleared before send-only behavior was enabled:

```php
$invoiceNo = trim((string)($r['invoice'] ?? ''));
$link = $refLink[$invoiceNo] ?? null;
$requestedSalesId = (int)($r['salesId'] ?? 0);
if ($requestedSalesId > 0 && (int)($link['sales_id'] ?? 0) !== $requestedSalesId) {
    continue;
}
$salesId = $requestedSalesId ?: (int)($link['sales_id'] ?? 0);
```

The Payables query uses the current schema and preserves the response field
expected by the Finance UI:

```php
"SELECT ap.ap_id AS id, COALESCE(s.supplier_name, '') AS vendor,
        ap.invoice_no AS invoice, NULL AS poNumber, ap.due_date AS due,
        ap.amount, ap.payment_id AS paymentId
 FROM accounts_payable ap
 LEFT JOIN suppliers s ON s.supplier_id = ap.supplier_id
 ORDER BY ap.ap_id DESC"
```

### `SALES/send_to_finance.php`

```php
<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/functions.php';
requireSalesWorkspace();

$pdo = getDB();
$stmt = $pdo->query(
    "SELECT i.inv_id, i.invoice_no, i.invoice_date, i.total_amount, i.status,
            o.order_no, c.customer_name
     FROM sales_invoices i
     JOIN sales_orders o ON o.so_id = i.order_id
     JOIN customers c ON c.cus_id = o.customer_id
     ORDER BY i.inv_id DESC"
);
$invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);
$pageTitle = 'Send Invoice to Finance';
include __DIR__ . '/includes/header.php';
?>

<div class="page-toolbar">
    <p class="muted" style="color:white;">Send a Sales invoice to Finance Accounts Receivable. Sending again updates the existing Finance record.</p>
</div>
<div id="financeSyncNotice" class="alert" role="status" hidden></div>
<div class="panel" style="margin-top:18px">
    <div class="table-wrap">
        <table class="data-table">
            <thead>
                <tr>
                    <th>Invoice No.</th>
                    <th>Customer</th>
                    <th>Sales Order</th>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                <?php if (!$invoices): ?>
                    <tr><td colspan="7" class="empty-row">No Sales invoices are available to send.</td></tr>
                <?php endif; ?>
                <?php foreach ($invoices as $invoice): ?>
                    <?php $isReturned = strtolower(trim((string)$invoice['status'])) === 'returned'; ?>
                    <tr>
                        <td><strong><?= htmlspecialchars($invoice['invoice_no']) ?></strong></td>
                        <td><?= htmlspecialchars($invoice['customer_name']) ?></td>
                        <td><?= htmlspecialchars($invoice['order_no']) ?></td>
                        <td><?= niceDate($invoice['invoice_date']) ?></td>
                        <td><?= peso((float)$invoice['total_amount']) ?></td>
                        <td><span class="badge <?= badgeClass($invoice['status']) ?>"><?= htmlspecialchars($invoice['status']) ?></span></td>
                        <td>
                            <button
                                type="button"
                                class="secondary-btn"
                                data-send-invoice="<?= (int)$invoice['inv_id'] ?>"
                                data-invoice-no="<?= htmlspecialchars($invoice['invoice_no'], ENT_QUOTES, 'UTF-8') ?>"
                                data-returned="<?= $isReturned ? '1' : '0' ?>"
                                disabled>
                                <?= $isReturned ? 'Returned - Cannot Send' : 'Checking...' ?>
                            </button>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>

<script>
    const financeSyncNotice = document.getElementById('financeSyncNotice');
    const financeSyncCsrf = <?= json_encode($_SESSION['csrf_token'] ?? '') ?>;
    const financeSyncButtons = Array.from(document.querySelectorAll('[data-send-invoice]'));

    async function loadFinanceSendStatuses() {
        try {
            const response = await fetch('../FINANCE/api.php?action=sales_invoice_status', {
                credentials: 'same-origin',
                cache: 'no-store',
                headers: { 'Accept': 'application/json' }
            });
            const result = await response.json();
            if (!response.ok || !result.ok || !Array.isArray(result.sentSalesInvoiceIds)) {
                throw new Error(result.message || 'Finance send status could not be loaded.');
            }

            const sentInvoiceIds = new Set(result.sentSalesInvoiceIds.map(Number));
            financeSyncButtons.forEach((button) => {
                if (button.dataset.returned === '1') {
                    button.textContent = 'Returned - Cannot Send';
                } else if (sentInvoiceIds.has(Number(button.dataset.sendInvoice))) {
                    button.textContent = 'Already Sent';
                } else {
                    button.textContent = 'Send to Finance';
                    button.disabled = false;
                }
            });
        } catch (error) {
            financeSyncButtons.forEach((button) => {
                if (button.dataset.returned !== '1') {
                    button.textContent = 'Status Unavailable';
                }
            });
            financeSyncNotice.className = 'alert error';
            financeSyncNotice.textContent = error.message || 'Could not check Finance send status. Reload the page and try again.';
            financeSyncNotice.hidden = false;
        }
    }

    void loadFinanceSendStatuses();

    financeSyncButtons.forEach((button) => {
        button.addEventListener('click', async () => {
            if (button.disabled || button.dataset.returned === '1') return;

            const invoiceId = Number(button.dataset.sendInvoice);
            const invoiceNo = button.dataset.invoiceNo || 'invoice';
            button.disabled = true;
            financeSyncNotice.hidden = true;

            try {
                const response = await fetch('../FINANCE/api.php?action=sync_sales_invoice', {
                    method: 'POST',
                    credentials: 'same-origin',
                    cache: 'no-store',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': financeSyncCsrf
                    },
                    body: JSON.stringify({ salesInvoiceId: invoiceId })
                });
                const result = await response.json();
                if (!response.ok || !result.ok) {
                    const error = new Error(result.message || 'The invoice could not be sent to Finance.');
                    error.status = response.status;
                    throw error;
                }

                button.textContent = 'Already Sent';
                financeSyncNotice.className = 'alert success';
                financeSyncNotice.textContent = `${invoiceNo} was sent to Finance Accounts Receivable.`;
                financeSyncNotice.hidden = false;
            } catch (error) {
                const isReturned = error.status === 422 && /returned/i.test(error.message);
                button.disabled = isReturned;
                button.textContent = isReturned ? 'Returned - Cannot Send' : 'Send to Finance';
                financeSyncNotice.className = 'alert error';
                financeSyncNotice.textContent = error.message || 'The invoice could not be sent to Finance. Please try again.';
                financeSyncNotice.hidden = false;
            }
        });
    });
</script>
<?php include __DIR__ . '/includes/footer.php'; ?>
```

### Sales navigation excerpts

`SALES/includes/sidebar.php` adds the page to the Billing section and displays
the link for Sales Staff:

```php
$billingPages = ['invoices.php', 'customer_account.php', 'send_to_finance.php'];

<a class="section-nav <?= $current === 'send_to_finance.php' ? 'active' : '' ?>" href="send_to_finance.php"><span class="nav-icon">F</span><span>Send Invoice to Finance</span><span class="section-arrow">&rsaquo;</span></a>
```

`SALES/includes/header.php` adds it to the Billing module switcher:

```php
$billingModules = [
    'customer_account.php' => ['label' => 'Billing & Finance', 'icon' => '◷'],
    'invoices.php' => ['label' => 'Sales Invoice', 'icon' => '▥'],
    'send_to_finance.php' => ['label' => 'Send to Finance', 'icon' => 'F'],
];
```
