<?php
declare(strict_types=1);

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

function syncFinanceCollectionToSales(
    int $salesInvoiceId,
    string $date,
    float $amount,
    string $method,
    string $collectionNo
): void {
    $sales = getSalesDB();
    $sales->beginTransaction();
    try {
        $invoiceStmt = $sales->prepare(
            'SELECT inv_id, order_id, invoice_no, invoice_date, total_amount, amount_paid
             FROM sales_invoices WHERE inv_id = ? FOR UPDATE'
        );
        $invoiceStmt->execute([$salesInvoiceId]);
        $invoice = $invoiceStmt->fetch();
        if (!$invoice) {
            throw new RuntimeException('The linked Sales invoice was not found.');
        }

        $existing = $sales->prepare('SELECT col_id FROM collections WHERE collection_no = ? LIMIT 1');
        $existing->execute([$collectionNo]);
        $isNewCollection = !$existing->fetchColumn();
        if ($isNewCollection) {
            $remaining = (float)$invoice['total_amount'] - (float)$invoice['amount_paid'];
            if ($amount > $remaining + 0.00001) {
                throw new RuntimeException('Collection amount exceeds the remaining Sales invoice balance.');
            }
            $dueDate = date('Y-m-d', strtotime((string)$invoice['invoice_date'] . ' +30 days'));
            $insert = $sales->prepare(
                'INSERT INTO collections
                 (collection_no, invoice_id, collection_date, due_date, amount, method)
                 VALUES (?, ?, ?, ?, ?, ?)'
            );
            $insert->execute([$collectionNo, $salesInvoiceId, $date, $dueDate, $amount, $method]);
        }

        $newPaid = (float)$invoice['amount_paid'];
        if ($isNewCollection) {
            $newPaid = min((float)$invoice['total_amount'], $newPaid + $amount);
        }
        $status = $newPaid >= (float)$invoice['total_amount'] ? 'Paid' : 'Partially Paid';
        $update = $sales->prepare(
            'UPDATE sales_invoices SET amount_paid = ?, status = ? WHERE inv_id = ?'
        );
        $update->execute([$newPaid, $status, $salesInvoiceId]);

        $sales->commit();
    } catch (Throwable $e) {
        $sales->rollBack();
        throw $e;
    }
}
