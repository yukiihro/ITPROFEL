# Sales-to-Finance Accounts Receivable

Finance automatically synchronizes Sales invoices into its Accounts Receivable
list whenever Finance loads its state. The list refreshes in the background
while Finance is open, so Sales staff do not need to send invoices manually.

## Synchronization

- Finance reads `sales_invoices` from the Sales database during each
  `api.php?action=state` request.
- Each Sales invoice is matched by `sales_id`; existing rows are updated and
  missing rows are inserted, so repeated refreshes do not create duplicates.
- Unpaid, partially paid, paid, and returned invoices are included. Returned
  invoices are labeled `Returned` and excluded from receivable totals.
- Finance derives the due date as 30 days after the Sales invoice date and
  mirrors its invoice number, total, customer, and payment status.
- If Sales cannot be reached, Finance keeps its last loaded data and shows a
  warning on the Accounts Receivable page.
- The old Sales send page redirects to the Sales Invoice list. Legacy API
  actions remain available for compatibility.

## Database configuration

`FINANCE/sales_integration.php` reads the Sales database using these optional
environment variables:

- `SALES_DB_HOST` (default `localhost`)
- `SALES_DB_NAME` (default `team_sales`)
- `SALES_DB_USER` (default `root`)
- `SALES_DB_PASSWORD` (default empty)

The Finance state query uses `NULL AS poNumber` because the current
`accounts_payable` schema stores `po_id`, not `po_number`. Selecting a
nonexistent column prevents the state API from returning any Finance data,
including receivables.

The current `expenses` table stores `receipt_reference` but not the optional
voucher, payment-method, or uploaded-receipt columns. The state query supplies
empty values for those optional fields so they do not prevent receivables from
loading.
