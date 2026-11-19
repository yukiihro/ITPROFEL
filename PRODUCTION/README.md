# Build 42 - PO number now reaches Inventory's Delivery Progress and Delivery Receipt (production only; Inventory not changed)

Inventory shows a "P.O. Number" on Delivery Progress and Delivery Receipt, taken from the `po_number` field of the request. Production never sent it, so those screens showed "Not provided by requesting team". Production's PO is the production order number (PO-xxxx). It is now sent on every call that can carry it:

- **Material requests (Production -> Inventory):** `submit_material_request_to_inventory()` sends the production order the materials are for as `po_number` when filing with `POST requests.php`.
- **Product requests (Inventory -> Production), Approve:** the production order that is created is sent as `po_number` with `POST approvals.php`.
- **Finished goods -> Send:** when the request is still Pending and production approves it as part of sending, the PO(s) of the goods being delivered are sent (several orders are joined with ", ", max 100 characters).
- `php/inventory-api.php`: `inv_api_create_request()` and `inv_api_approve()` take an optional PO number (`inv_po_number()` trims it to Inventory's 100-character limit). A Disapproved answer never carries a PO.

Limits (Inventory's API, not production): `po_number` can only be set when the request is filed or while it is still Pending. Requests that were already filed or approved before this build keep a blank PO number, and production cannot fill it in afterwards. Delivery Receipts are created by Inventory when production accepts a delivery (Out for Delivery -> Accept), so the PO appears there from that request onward. The live production stage of an order is not sent, because Inventory's API has no field for it.

# Build 41 - fix: "Inventory refused the API key (HTTP 401)" (production only; Inventory not changed)

- `php/inventory-api.php`: production no longer sends just one key. On a 401 it tries, in order: the `IMS_API_KEY` server variable,
  `inventory_api_key` from `php/config.local.php`, an optional `inventory_api_key_alternates` list (same file), then the old built-in default.
  The first key Inventory accepts is used for the rest of the request. Before, `config.local.php` silently overrode the Apache variable,
  so a correct `IMS_API_KEY` was never sent.
- The 401 message now says what to do. `php/diagnose.php` lists the keys tried and which one Inventory accepted.
- If EVERY key is refused, Inventory has no matching `IMS_API_KEY` (Apache `SetEnv IMS_API_KEY "..."` in httpd.conf, then restart Apache).
  That is a host setting, not Inventory code, and production cannot set it for you.

# Build 40 - aligned with FIRST_API Inventory (production only; Inventory not changed, nothing to import)

Checked against `FIRST_API/inventory_management/api/*` (endpoints, headers, field names, status rules).

- **Fixed: production's own `api/orders.php` always failed** (it selected a column `due_date` that production_orders does not have). It now returns `eta_label` and `priority`.
- **Fixed: production's `api/*` failed on a database that nobody had signed in to yet** (columns `request_id`, `inventory_request_number`, `approved_qty`, `accepted_qty`, `request_qty`, `excess_qty` were only added at sign-in). The API now adds them itself, and `team3_production_module.sql` creates them for new installs.
- **Fixed: `material-requests.php?action=debug&id=..` (README tells you to open it) was refused as "must be a POST".** It is now readable by GET and limited to supervisors.
- **Inventory API client (`php/inventory-api.php`) now reports what really happened:**
  - Inventory PHP crash / empty answer (HTTP 500) is no longer shown as "Cannot reach the Inventory API". It names the missing function when Inventory sends it, and says nothing was filed.
  - The HTTP 401 message now explains that Inventory reads its key only from the `IMS_API_KEY` server variable (it is no longer in `api/config.php`).
- `php/diagnose.php`: key note + a list of Inventory requests that production cannot see (blank requester team). `php/config.sample.php` shows the Inventory API settings.
- **`INVENTORY_SIDE_NOTES.txt`**: problems that exist in Inventory itself (missing `create_incoming_request_notifications()`, item-type rule for Production requests, key, blank requester team) with a suggested snippet. Production cannot fix these.

# Build 38 — compatible with the FIX version of Inventory (production only; Inventory is not changed, nothing to import)

Checked against `FIX/inventory_management/api/*` (same key, same URL `http://localhost/inventory_management/api`, same endpoints as build 37).
What changed in production:

- **Products follow Inventory's Finished Goods by NAME.** FIX Inventory keeps one Finished Good item *per size*. Production now has ONE product per name
  (the lowest-id active item of that name); the size belongs to the production order. Older databases that got one product per size item are merged
  automatically at the first sign-in (orders, finished goods and bill of materials move to the oldest product; nothing is deleted).
  Product requests and Finished goods now find the request line by product name, so a request for any size of a product is recognised.
- **Sizes:** Inventory's request form offers sizes 20-45. Production orders now accept 20-50 cm (was 25-50), so every size Inventory can ask for can be produced.
- **Item codes by size:** a finished-goods batch shows the Inventory item code of ITS size when Inventory has an item for that size (else the product's code).
- **Raw materials** keep following Inventory's Raw Material items (code, name, unit); repeated names are still merged into one material.
- **Partial deliveries:** FIX Inventory marks a delivery *Partially Delivered* while delivered/accepted is below the request. Inventory's API only lets production
  confirm receipt at *Out for Delivery*, so Accept stays locked and now says why (delivered X of Y, accepted Z).

- **Everything goes through Inventory's API again (no database writes).** Every call sends the key from ONE place (`inv_api_key()` in `php/inventory-api.php`). **Known problem in the FIX Inventory:** its `api/requests.php` calls `create_incoming_request_notifications()`, which is not defined anywhere, so *filing a material request* stops with a PHP error until that function is added to Inventory's `php/database.php` (see INVENTORY_api_requests_fix.txt). Production shows what Inventory sent back.
- **API key from Apache (optional):** production reads the Inventory key from the Apache variable `IMS_API_KEY` (`SetEnv IMS_API_KEY "..."` in httpd.conf or .htaccess, then restart Apache; production's own API key can likewise come from `PRODUCTION_API_KEY`). If it is not set, the old default key is used; `php/config.local.php` overrides both.

Limits that come from the FIX Inventory (unchanged): its API has no stock levels and no stock-in, so finished goods can only be delivered against an
Inventory product request, and the Materials inventory is production's own figure.

# Build 37 — Production now talks to Inventory ONLY through Inventory's API

Inventory was not changed at all. What changed (production only):

- `php/inventory-api.php` (new): API client (`X-API-Key`, `X-API-Team: Production`). Address/key: `inventory_api_url` / `inventory_api_key`
  in `php/database.php` (defaults: `http://localhost/inventory_management/api` and the key in Inventory's `api/config.php`); override in `php/config.local.php`.
- No more views, direct inserts or triggers in Inventory's database. `items`, `warehouses`, `requests`, `request_items` are now local copies filled from the API
  (the old views are replaced automatically at the first sign-in; old rows are kept).
- Material requests: filed with `POST requests.php` (whole numbers only - decimals are rounded up), followed with `GET requests.php`, received with `POST accept-delivery.php`
  (Accept unlocks when Inventory marks the delivery *Out for Delivery*; the accepted quantity enters the Materials inventory).
- Product requests from Inventory: Approve/Decline -> `POST approvals.php`; Finished goods -> Send -> `POST deliveries.php` (Inventory records accepted/rejected itself).
- `api/` (new): production's own read-only API (`orders.php`, `finished-goods.php`, `material-requests.php`); key in `api/config.php`.
- Builds 29-36 put two triggers in Inventory's database; production removes ITS OWN two at first sign-in (or run `database/REMOVE_OLD_PRODUCTION_TRIGGERS.sql`).

Limits of the current Inventory API: it has no stock levels and no stock-in. Production's "available stock" is its own Materials inventory, and finished goods
can only be delivered against an Inventory product request (anything else stays in production).

# Production Module 3 (Team 3)

Original production look (maroon and white, sidebar, header and breadcrumb), organised like the Inventory system's file structure: one `.html` page per screen, `css/`, `js/`, `images/`,
`php/` (JSON endpoints, one per screen) and `database/`. Plain PHP + MySQL under XAMPP `htdocs`.

## Setup
1. Copy this folder to `C:\xampp\htdocs\production_system`.
2. On the **host** computer's MySQL (phpMyAdmin) import **Inventory's own SQL file first (e.g. `inventory_system.sql`, once only)**, then `database/team3_production_module.sql`. The production file is safe to import again: it never drops or overwrites data and never writes into Inventory.
3. Radmin: keep the system on the host computer and open `http://<host Radmin IP>/production_system/` from the other computers. `php/config.sample.php` is only for the rare case that the web server and database are on different computers.
4. Open `http://localhost/production_system/` and sign in. First accounts: `supervisor` / `Supervisor#3` and `staff` / `Staff#3` - **change them on the Accounts page**.
   Production has its own accounts, separate from Inventory's.
5. `database/demo_data_RESETS_PRODUCTION.sql` is for test systems only: it erases all production data.

## Pages
| Page | Purpose |
|---|---|
| login.html | Sign in (Team 3 accounts) |
| dashboard.html | Active orders, pending requests, WIP value, low stock, needs-attention list |
| bill-of-materials.html | BOM per product and how many pairs current stock can make |
| materials-schedule.html | Material needs of every active order |
| materials-checklist.html | Production staff only (hidden from supervisors): tick materials ready; ticking moves the order's stage |
| production-orders.html | List, search, filter, print, **+ New Order** (modal) |
| order-details.html?id=PO-… | One order: stage tracker (click a step up to Production to advance), materials, QC. In the Production stage a **Finish production** button records the quantity produced and sends the order to Quality check |
| material-issuance.html | Requests to Inventory; requests to Inventory (Inventory approves; production accepts what arrives or cancels/marks not received); **+ New Request** (modal) |
| monitoring.html | Stage tracker and progress bar per order (Finish production shortcut on orders in Production) |
| delivery-monitoring.html | Read-only: raw materials delivered from Inventory (awaiting approval → ready → delivered) and finished goods delivered to Inventory (in QC → awaiting → delivered) |
| quality-control.html | **Supervisor only** approves / rejects the produced batch (Approve all, Reject all, or enter accepted + rejected = produced); staff see the list read-only |
| production-history.html | Completed orders with cost per unit |
| costing.html | Calculate materials + labor + overhead, send to Finance, print |
| finished-goods.html | Send accepted goods to Inventory |
| supervisor-overview.html | Supervisor dashboard, view-only: monitoring of transactions (material requests, quality checks, finished goods, costing) and activities |
| accounts.html | Supervisor only: add accounts, deactivate, change passwords |

## Folder layout
```
production_system/
  login.html index.html dashboard.html … (one page per screen)
  css/style.css                the production stylesheet
  js/production.js             shared helpers, sidebar, session, notifications (like inventory.js)
  js/<page>.js                 one script per page; login.js pagination.js
  php/database.php             DB connection, session, validation helpers (like Inventory's)
  php/helpers.php              order-stage, BOM and Inventory-integration logic
  php/<screen>.php             JSON endpoints: ?action=list|create|… → {"success":…}
  database/team3_production_module.sql
```
Business rules, validation and the `team3production` database are as before, except accounts: they live in
`production_users`. Rows production writes into Inventory (stock out/in, movements, requests) leave Inventory's
user column empty and name the production user in the remarks, because Inventory's user table is not shared.

## Delivery monitoring in the database
`team3_production_module.sql` is the only file to import for Team 3. It includes the `material_requests.issued_at` column and the
`delivery_raw_materials` and `delivery_finished_goods` views that the Delivery monitoring page reads. It is safe to import again; it only creates what is missing.

## Build 36 (QA fixes)
- BUG-001 / IV-008: text fields now have enforced maximum lengths. Accounts and Create-account forms limit Full name to 100, Username to 30, Email to 100 and Password to 72 characters in the browser (maxlength) and on the server (`php/accounts.php`, `php/register.php`), which now answers with a clear message instead of a server error or a silently cut value.
- BUG-002 / AM-007: the Accounts page search box (name, username or email) was hidden and had no script behind it. It is now shown and filters the list as you type; clearing it restores the list; no match shows "No accounts match your search."
