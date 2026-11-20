# D.E.V.S — Accounting, HR, Sales, Production and Procurement System

This README is a project overview and code-explanation guide for the D.E.V.S capstone system. It starts with the smallest building blocks (one HTML page, one PHP file, one function) and then moves to the full system.

**The project in three sentences**

D.E.V.S is a web-based business management system built on PHP, MySQL/MariaDB and plain JavaScript. Finance and HR use the shared `finance_hr` database; Sales and Production have their own module databases and integrate selected transactions with Finance and Procurement. All departments use the root login page, while each portal keeps its own server-side session and access rules. The Finance portal is a single-page application: `FINANCE/index.php` sends the page shell once, and `FINANCE/functions.js` redraws each module (Dashboard, Account Payable, Receivables, etc.) inside it without reloading the browser.

## Quick start (XAMPP)

1. Copy the repository into `C:\xampp\htdocs\ITPROFEL`.
2. Start Apache and MySQL in XAMPP.
3. Create/import the `finance_hr` database using the SQL file in `finance_hr db/`. The dated files in `db backup/` are backups, not application code.
4. Import the Production module schema from `PRODUCTION/production_system/database/team3_production_module.sql` when the Production portal is needed. Sales has its own schema/configuration under `SALES/`.
5. Open `http://localhost/ITPROFEL/root/` and sign in through the universal login page. The root API routes Finance, HR, Sales, Production and Procurement users to their respective portals.

The local database defaults are defined in `db.php`. For non-local deployments, replace the XAMPP defaults with environment variables or another protected configuration mechanism.

**File map**

```
test/
├── index.php              Login / registration page (entry point for everyone)
├── auth.js                Login, sign-up, password-toggle logic
├── auth.css               Styling of the login screen
├── api.php                Universal auth API and department routing support
├── db.php                 One function: db() → shared PDO connection
├── ping.php               Tiny health-check endpoint
├── storage/               Shared application storage
├── db main/               Current phpMyAdmin SQL/schema files
├── db backup/             Dated database backups
├── FINANCE/
│   ├── index.php          Page shell: sidebar, topbar, empty content area
│   ├── functions.js       Finance behavior and SPA rendering
│   ├── style.css          Design tokens and component styles
│   ├── api.php            Finance API, audit, exports and integrations
│   ├── sales_integration.php
│   ├── production_integration.php
│   └── assets/            Logos and dashboard icons
├── HR/                    HR portal (employees, payroll, attendance, approvals)
├── SALES/                 Sales portal (customers, orders, invoices and collections)
├── PRODUCTION/            Production portal and its separate database module
└── PROCUREMENT/           Procurement portal (supplier / buyer dashboards)
```

### Portal entry points

| Department | Entry point after login | Main responsibility |
|---|---|---|
| Finance | `FINANCE/` | General ledger, payables, receivables, cash and reports |
| HR | `HR/` | Employees, attendance, leave, payroll and access |
| Sales | `SALES/dashboard.php` | Customers, quotations, orders, invoices and collections |
| Production | `PRODUCTION/production_system/dashboard.html` | Production orders, materials, quality control and finished goods |
| Procurement | `PROCUREMENT/buyerdashboard/buyer-dashboard.html` | Suppliers, purchasing and buyer workflows |

---

## LEVEL 0 — Basic syntax reference

Use this section to understand the small building blocks used throughout the project:

1. **Name the syntax.**
2. **Explain what it does in simple words.**
3. **Connect it to where this project uses it.**

### 0.1 HTML: the page structure

HTML creates the content and structure of a web page. Most HTML uses an opening tag, content, and a closing tag:

```html
<p>This is a paragraph.</p>
```

`<p>` means **paragraph**. The first `<p>` starts the paragraph and `</p>` ends it. Some tags are empty and do not need a closing tag:

```html
<img src="assets/logo.png" alt="DEVS logo">
<input type="text" id="searchBox" placeholder="Search">
```

| Syntax | Meaning | Example in this project |
|---|---|---|
| `<html>` | Root of the HTML document | Wraps the whole page |
| `<head>` | Page information and linked files | Contains the title, viewport, and CSS link |
| `<body>` | Visible page content | Contains the Finance sidebar and dashboard |
| `<h1>`–`<h6>` | Headings, from largest to smallest | Module and modal titles |
| `<p>` | Paragraph text | Descriptions and helper text |
| `<a>` | Link or clickable navigation item | Sidebar items with `data-page="payables"` |
| `<button>` | Action the user can click | Notification and save buttons |
| `<form>` | Group of inputs submitted together | Login and registration forms in `index.php` |
| `<label>` | Text describing an input | Login field labels |
| `<input>` | User input field | Username, password, search, and amount fields |
| `<img>` | Displays an image | `assets/logo.png` in the Finance header |
| `<table>`, `<tr>`, `<th>`, `<td>` | Table, row, heading cell, and data cell | Finance records and reports |
| `<div>` | General block/container | `.app-shell`, `.content`, and modal containers |
| `<header>`, `<main>`, `<aside>`, `<nav>`, `<footer>` | Semantic containers | Finance page layout |
| `<script>` | Loads or contains JavaScript | `functions.js` is loaded at the bottom of the Finance page |
| `<link>` | Connects another resource | Links `style.css` to the page |

**Tags and attributes are different.** In `<a href="#" class="nav-item" data-page="payables">`, `a` is the tag. `href`, `class`, and `data-page` are attributes. Attributes provide extra information to the element:

- `id="appShell"` gives one element a unique name. JavaScript finds it with `document.getElementById('appShell')`.
- `class="nav-item"` groups elements for CSS and JavaScript. Many elements can share a class.
- `data-page="payables"` stores custom data. JavaScript reads it with `element.dataset.page`.
- `href="#"` is the link destination. The JavaScript click handler uses the link as a navigation control instead of loading another page.
- `alt="DEVS logo"` describes an image for accessibility if it cannot be seen.

The Finance page uses an empty container as a placeholder:

```html
<div class="content-body" id="dashboardPanel"></div>
```

JavaScript later puts the selected module inside this element. This is how one HTML shell can display Dashboard, Payables, or another module.

### 0.2 CSS: the appearance and layout

CSS controls how HTML looks. A CSS rule has a **selector**, followed by declarations:

```css
.nav-item {
    color: #1a1a1a;
    padding: 10px 12px;
}
```

- `.nav-item` is the selector. The dot means “an element whose class is `nav-item`”.
- `color` and `padding` are properties.
- `#1a1a1a` and `10px 12px` are property values.
- Each declaration ends with a semicolon.

Common selectors used by this project:

```css
body { ... }                 /* element selector: every <body> */
.sidebar { ... }             /* class selector: class="sidebar" */
#appShell { ... }            /* ID selector: id="appShell" */
.nav-item.active { ... }     /* both classes on the same element */
button:hover { ... }         /* when the pointer is over a button */
input[type="text"] { ... }   /* attribute selector */
```

| CSS property | What it changes | Example in this project |
|---|---|---|
| `color` | Text color | `color: var(--text)` |
| `background` / `background-color` | Element background | Dashboard gradient and white cards |
| `font-size` / `font-weight` | Text size and thickness | Navigation and headings |
| `padding` | Space inside an element | Space inside `.nav-item` |
| `margin` | Space outside an element | Separates cards and sections |
| `width` / `height` | Element dimensions | Sidebar width and logo size |
| `display: flex` | Arranges children in a row or column | `.app-shell` and `.sidebar` layout |
| `gap` | Space between flex/grid children | Space between sidebar items |
| `border` / `border-radius` | Lines and rounded corners | Cards, inputs, and buttons |
| `box-shadow` | Shadow around an element | `--shadow-card` on dashboard cards |
| `position` | Positioning behavior | Sticky sidebar and modal layers |
| `overflow` | What happens when content is too large | Scrollable sidebar and tables |

The project defines reusable CSS variables in `:root`:

```css
:root {
    --brand-red: #c2181a;
    --radius: 14px;
}

.card {
    color: var(--brand-red);
    border-radius: var(--radius);
}
```

`--brand-red` and `--radius` are custom properties. `var(...)` reads them, so changing one value updates every component that uses it. Responsive rules use media queries when the layout needs to change on a smaller screen:

```css
@media (max-width: 760px) {
    .sidebar { width: 72px; }
}
```

### 0.3 JavaScript: behavior and interaction

JavaScript reads the HTML, responds to user actions, gets data from PHP, and redraws parts of the page.

**Variables and values**

```js
const API_URL = 'api.php';       // const: cannot be reassigned
let activeUser = null;            // let: can be reassigned
const page = 'payables';          // string
const amount = 1250.50;          // number
const isLoggedIn = true;          // boolean
const rows = [];                  // array
const user = { name: 'Admin' };   // object
```

This project uses `const` for values that do not get replaced and `let` for changing state, such as `activeUser`. A `null` value means “there is currently no value”.

**Functions**

A function groups reusable instructions. Parameters are inputs and `return` sends a result back:

```js
function addTax(amount, rate) {
    return amount + (amount * rate);
}

const total = addTax(100, 0.12);
```

The project uses arrow functions for short functions:

```js
const todayDateString = () => {
    const date = new Date();
    return date.toISOString().slice(0, 10);
};
```

`apiRequest(action, options)` in `FINANCE/functions.js` is a larger example. It receives an action, calls the PHP API, checks the response, and returns the decoded JSON data.

**Selecting and changing HTML**

```js
const panel = document.getElementById('dashboardPanel');
const search = document.querySelector('#apSearch');

panel.textContent = 'Loading...';
search?.addEventListener('input', renderPayableRows);
```

- `getElementById()` finds one element by its `id`.
- `querySelector()` finds the first element matching a CSS selector.
- `textContent` changes safe text.
- `innerHTML` replaces an element with HTML markup. The Finance renderer uses `dashboardPanel.innerHTML = ...` to draw a module.
- `?.` means “only continue if the element exists”; it prevents an error for optional elements.

**Events**

An event is something that happens in the browser, such as a click or typing:

```js
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('brandHome')?.addEventListener('click', (event) => {
        event.preventDefault();
        renderPage('dashboard');
    });
});
```

`DOMContentLoaded` waits until the HTML is ready. `addEventListener()` connects an event to a function. `preventDefault()` stops the link's normal navigation so the SPA can render the dashboard itself.

**Conditions, loops, and array methods**

```js
if (amount > 0) {
    console.log('Valid amount');
} else {
    console.log('Amount must be positive');
}

const unpaid = store.payables.filter(payable => payable.status !== 'Paid');
const total = unpaid.reduce((sum, payable) => sum + Number(payable.amount || 0), 0);
```

`if` chooses between paths. `filter()` keeps matching records. `reduce()` combines records into one result. In this project they calculate totals and decide which payables appear in a filtered table.

**Asynchronous API calls**

```js
async function loadState() {
    const response = await fetch('api.php?action=state');
    const data = await response.json();
    return data.state;
}
```

`fetch()` sends an HTTP request. `async` marks a function that can wait, and `await` pauses that function until the response is ready. The Finance page uses this pattern to load and save data without a full page reload. `try`/`catch` is used when an operation can fail, such as invalid JSON or a failed API request.

**JavaScript operators worth knowing**

| Syntax | Meaning | Example |
|---|---|---|
| `=` | Assign a value | `page = 'dashboard'` |
| `===` | Strict equality | `status === 'Paid'` |
| `!==` | Strict inequality | `status !== 'Paid'` |
| `&&` | Both conditions must be true | `isAdmin && canEdit` |
| `||` | Use the second value if the first is false/empty | `name || 'Unknown'` |
| `??` | Use the second value only if the first is `null` or `undefined` | `user.name ?? 'Unknown'` |
| `?.` | Safely access an optional value | `button?.addEventListener(...)` |
| `!` | Logical NOT | `!isLoggedIn` |
| `+`, `-`, `*`, `/` | Arithmetic | `amount + tax` |

### 0.4 How HTML, CSS, and JavaScript work together

These three languages have different jobs:

1. **HTML** creates an element: `<button id="saveBtn">Save</button>`.
2. **CSS** gives it a design: `#saveBtn { background: var(--brand-red); }`.
3. **JavaScript** gives it behavior: `document.getElementById('saveBtn')?.addEventListener('click', saveData)`.

In this project, the same separation appears in the Finance portal:

```text
FINANCE/index.php  → page structure and empty containers
FINANCE/style.css  → colors, spacing, layout, responsive design
FINANCE/functions.js → clicks, API calls, state, and generated module HTML
FINANCE/api.php    → server-side validation and database access
```

When `renderPage('payables')` runs, JavaScript creates HTML for the Payables screen, CSS styles the generated classes, and event handlers make search, filtering, and saving work. PHP remains responsible for authentication, permissions, and database operations.

---

## LEVEL 1 — The basic code

### 1.1 One HTML page is just a skeleton

`FINANCE/index.php` is almost pure HTML. It contains no module content — only the frame that never changes:

```html
<div class="app-shell" id="appShell">
    <aside class="sidebar"> … nav links with data-page="payables" … </aside>
    <main class="content">
        <header class="topbar"> … user avatar, notifications … </header>
        <div class="content-body" id="dashboardPanel"></div>   <!-- everything is drawn here -->
    </main>
</div>
<div class="modal-backdrop" id="modalBackdrop"> … </div>
<div class="toast-stack" id="toastStack"></div>
<script src="functions.js?v=…" defer></script>
```

Two things to point out:

- `id="dashboardPanel"` is empty. Every screen (Dashboard, Account Payable, …) is inserted into it later by JavaScript. That is what makes it a *single-page* application.
- `defer` on the `<script>` tag means the JavaScript runs only after the HTML has been parsed, so `document.getElementById(...)` will always find its elements.

**Basic HTML ideas used:** semantic containers (`<aside>`, `<main>`, `<header>`), `id` for unique hooks, `class` for styling, `data-*` attributes to carry data (`data-page="payables"`, `data-id`, `data-value`).

### 1.2 Basic CSS: variables first

`style.css` begins with design tokens, so the whole system shares one palette:

```css
:root {
    --brand-red: #c2181a;
    --text: #262626;
    --border: rgba(0,0,0,0.08);
    --radius: 14px;
    --shadow-card: 0 6px 20px rgba(120,10,10,0.10);
}
```

Components then reuse them (`color: var(--brand-red)`). This keeps the design consistent because every module uses the same set of CSS custom properties.

### 1.3 Basic PHP: the top of `FINANCE/index.php`

```php
declare(strict_types=1);                 // no silent type juggling in this file

session_set_cookie_params([              // security flags for the session cookie
    'httponly' => true,                  // JavaScript cannot read it (blocks cookie theft via XSS)
    'samesite' => 'Lax',                 // not sent on cross-site POSTs (basic CSRF protection)
    'secure'   => false,                 // true only when served over HTTPS (local XAMPP is HTTP)
]);
session_start();

$dept = $_SESSION['user']['department'] ?? '';
if (!isset($_SESSION['user']) || $dept === '') { header('Location: ../root/index.php'); exit; }
if (strcasecmp($dept, 'Finance') !== 0) { /* send HR / Procurement users to their own portal */ }
```

This is the **gatekeeper**. It runs on the server before any HTML is sent, so an unauthenticated visitor never receives the Finance page at all — hiding the page with CSS would not be security, this is.

**Basic PHP constructs used here:** variables (`$dept`), superglobals (`$_SESSION`, `$_GET`, `$_POST`), the null-coalescing operator `??`, `if`/`elseif`, `header()` + `exit` for redirects, `strcasecmp()` for case-insensitive comparison.

---

## LEVEL 2 — Login, step by step

The login screen (`index.php`) has three forms in one page: **Login**, **Sign up**, and **Setup password**. Only one is visible at a time; `auth.js` toggles the class `is-hidden`.

### 2.1 Server side, before the form is shown

```php
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
```

No-cache headers stop the browser from showing a stale, already-logged-in copy of the page after logout — a real bug this fixed.

Then the logout branch: `?logout` empties `$_SESSION`, deletes the session cookie, destroys the session, force-unlinks the server session file, and redirects to `/ITPROFEL/root/index.php` with a 302.

Then the "already logged in" branch: it reads the department and redirects to the matching portal. A one-shot flag (`$_SESSION['just_redirected']`) prevents an infinite redirect loop; if the browser comes back immediately, the flag is consumed and the login page renders normally.

### 2.2 Client side: `auth.js`

```js
const apiRequest = async (action, options = {}) => {
    const response = await fetch(`api.php?action=${encodeURIComponent(action)}`, {
        cache: 'no-store',
        credentials: 'same-origin',              // send the session cookie
        headers: { 'Content-Type': 'application/json' },
        ...options
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) throw new Error(data.message || '…');
    return data;
};
```

One helper, used by every auth call. It standardises three things: the URL shape (`api.php?action=login`), JSON in/out, and error handling (`throw` → `catch` → show the message in `.error-text`).

Login submit handler does exactly four things: prevent the default form post, read the values, call `apiRequest('login', …)`, then route by department:

```js
localStorage.setItem('devs_user', result.user.username);
localStorage.setItem('devs_profile', JSON.stringify(result.user));
window.location.assign({
    finance: 'FINANCE/',
    hr: 'HR/',
    sales: 'SALES/dashboard.php',
    production: 'PRODUCTION/production_system/dashboard.html',
    procurement: 'PROCUREMENT/buyerdashboard/buyer-dashboard.html'
}[dept]);
```

### 2.3 The auth API: `api.php`

Pattern used everywhere in this project:

```php
function respond(array $payload, int $status = 200): never {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}
```

Login logic:

```php
if (!$user || !password_verify($password, (string)($user['password'] ?? ''))) {
    respond(['ok' => false, 'code' => 'invalid_credentials',
             'message' => 'Invalid username or password.'], 422);
}
```

- Passwords are **never** stored in plain text: registration uses `password_hash($password, PASSWORD_DEFAULT)` (bcrypt) and login uses `password_verify()`.
- The same error message is returned whether the email or the password was wrong — that avoids telling an attacker which accounts exist.
- Account statuses are enforced after the password check: `Pending` → 403 "awaiting approval from an HR Administrator", `Rejected` → 403. Registration always creates a `Pending` account, so a new user cannot log in until HR approves it.
- On success only a small whitelist of fields is copied into `$_SESSION['user']` — not the password hash.

The universal login checks Production accounts through the `team3production` database, Sales accounts through the Sales database, and Finance/HR accounts through the shared `finance_hr.accounts` table. The portal-specific storage folders contain application state and audit data; they are not the source of truth for universal login.

> Authentication is split across the shared Finance/HR database and the Sales/Production module databases. This lets each module keep its own account roles and session rules, but a future version should consolidate account administration and password policies.

**Basic JS/PHP vocabulary for this level:** `async`/`await`, `fetch`, `JSON.stringify`/`parse`, `try`/`catch`, ternaries, template literals (`` `…${x}…` ``); PHP `filter_var(..., FILTER_VALIDATE_EMAIL)`, `in_array(..., true)` strict search, `str_pad`.

---

## LEVEL 3 — The database layer

### 3.1 `db.php` (21 lines, entire file)

```php
function db(): PDO {
    static $pdo = null;                     // one connection per request
    if ($pdo instanceof PDO) return $pdo;

    $dsn = "mysql:host=127.0.0.1;dbname=finance_hr;charset=utf8mb4";
    $pdo = new PDO($dsn, 'root', '', [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,   // errors throw, never fail silently
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,         // rows as ['column' => value]
        PDO::ATTR_EMULATE_PREPARES   => false,                    // real server-side prepared statements
    ]);
    return $pdo;
}
```

`static $pdo` is the "singleton" idea: the first call opens the connection, later calls reuse it. `EMULATE_PREPARES = false` is the one to mention — it means MySQL itself parses the statement and the parameters separately, which is what actually stops SQL injection.

**How prepared statements are used:**

```php
$stmt = $pdo->prepare('SELECT supplier_id FROM suppliers WHERE supplier_name = ? LIMIT 1');
$stmt->execute([$vendorName]);
```

The `?` is a placeholder; the value is sent as data, not concatenated into SQL. Say it this way: *"we never build SQL by gluing user input into a string."*

### 3.2 Schema overview (from the SQL dump)

`finance_hr` has 25 tables. Group them by module instead of listing them:

| Group | Tables | Purpose |
|---|---|---|
| Auth / people | `accounts`, `employees`, `departments`, `page_access`, `forgot_password` | logins, staff records, which role may open which page, password resets |
| Finance core | `charts_of_accounts`, `financial_transactions`, `cash_bank`, `expenses`, `financial_reports` | ledger, cash accounts, spending, report definitions |
| Receivables / payables | `accounts_receivable`, `accounts_payable`, `customers`, `suppliers`, `payment_transactions` | who owes us, whom we owe, and how it was settled |
| HR | `attendance`, `leave_requests`, `payroll`, `payroll_deductions`, `payroll_history`, `payroll_payment`, `government_contributions`, `thirteenth_month_pay` | time, leave, salary and statutory contributions |
| System | `audit_trail`, `settings` | traceability and configuration |

**Key relations (draw these on the board if possible):**

```
accounts.employee_id        → employees.employee_id
accounts_payable.supplier_id→ suppliers.supplier_id
accounts_receivable.customer_id → customers.customer_id
financial_transactions.account_id → charts_of_accounts.account_id
accounts_payable.payment_id → payment_transactions.payment_id
audit_trail.user_id         → accounts.account_id
```

`accounts_payable` itself is small and worth memorising:

```sql
CREATE TABLE accounts_payable (
  ap_id      int PRIMARY KEY,
  supplier_id int NOT NULL,          -- who we owe (foreign key)
  po_id      int DEFAULT NULL,       -- optional purchase order
  expense_id int DEFAULT NULL,       -- optional expense link
  invoice_no varchar(50),
  amount     decimal(12,2) NOT NULL, -- money → DECIMAL, never FLOAT
  due_date   date,
  status     varchar(20) DEFAULT 'Pending',
  payment_id int DEFAULT NULL        -- set when a payment settles it
);
```

Why `DECIMAL(12,2)` and not `FLOAT`: floating point cannot represent 0.10 exactly, so sums drift. Decimal arithmetic is exact and is the appropriate representation for monetary values.

---

## LEVEL 4 — The API layer (`FINANCE/api.php`)

### 4.1 One entry point, many actions

Instead of one PHP file per feature, there is a single router at the top of the file:

```php
$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

if ($action === 'state' && $method === 'GET')  { … return whole state … }
if ($action === 'state' && $method === 'POST') { … save … }
if ($action === 'audit' && $method === 'GET')  { … }
if ($action === 'export' && $method === 'GET') { … }
```

Every request carries an `action` and an HTTP method, and the pair decides what happens. Benefits to state out loud: one place for session checks, one response format, one error format.

Shared helpers:

```php
function requireUser(): array { /* 401 if no session */ }
function isFinanceAdmin(array $u): bool { /* role === 'Administrator' or Finance + admin */ }
function isHrAdmin(array $u): bool { … }
function audit(int $userId, string $email, string $role, string $action, …): void { … }
```

`requireUser()` is called at the start of every protected action. Authorisation is checked **on the server**, e.g. saving finance data:

```php
$u = requireUser();
if (!isFinanceAdmin($u) && !isHrAdmin($u)) {
    respond(['ok' => false, 'message' => 'Your role cannot modify finance records.'], 403);
}
```

A Staff-level user can look at the page, but the write still fails at the API — client-side hiding of buttons is convenience, not security.

### 4.2 `state` GET — the browser's data snapshot

`loadState()` runs one SQL query per module and returns one object: `accounts`, `receivables`, `payables`, `cashBank`, `expenses`, `transactions`, `payments`, `settings`. The front end stores it in memory, so switching pages never needs another request.

### 4.3 `state` POST — the save strategy

```php
$pdo->beginTransaction();
try {
    $pdo->exec('DELETE FROM accounts_payable');
    $ins = $pdo->prepare('INSERT INTO accounts_payable
        (supplier_id, invoice_no, amount, due_date, status) VALUES (?,?,?,?,?)');
    foreach ($state['payables'] as $p) {
        // resolve vendor name → supplier_id, creating the supplier row if new
        $ins->execute([$supId, $p['invoice'] ?? '', (float)$p['amount'], $p['due'], $p['status']]);
    }
    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    respond(['ok' => false, 'message' => 'Save failed: ' . $e->getMessage()], 500);
}
```

The save strategy works as follows:

1. **Why delete-then-insert?** The browser sends the full list for a table, so the cheapest correct sync is "replace the contents". It is wrapped in a transaction, so readers never see an empty table mid-save.
2. **Why a transaction?** `beginTransaction` / `commit` / `rollBack` give atomicity: all tables or none.
3. **Where do foreign keys come from?** The UI works with names ("Cloud Services PH"); the database needs `supplier_id`. So the API looks the name up, and inserts a new `suppliers` row if it is not found. The lookup is cached in a PHP array (`$accountCache`) so 50 transactions do not cause 50 extra queries.
4. **Why is `charts_of_accounts` excluded?** Deleting it would break `financial_transactions.account_id` references and orphan history. It has its own `account.save` / `account.update` endpoints instead.
5. **Why no audit entry here?** Background state saves are frequent and would flood the notification bell; dedicated actions record their own audit rows.

---

## LEVEL 5 — The front end (`FINANCE/functions.js`)

The whole file is one `DOMContentLoaded` listener, so all helpers share one closure and nothing leaks into the global scope.

### 5.1 The store

```js
const STORE_KEY = 'devs_finance_store_v1';
const store = loadStore();                       // parsed from localStorage, or empty SEED
function saveStore() {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));   // local cache
    void apiRequest('state', { method: 'POST', body: JSON.stringify({ state: payload }) });  // server
}
async function syncStateFromServer() {           // on load: DB → memory → localStorage
    const result = await apiRequest('state');
    Object.keys(result.state).forEach(k => { if (result.state[k] != null) store[k] = result.state[k]; });
}
```

**The pattern to explain:** *the database is the source of truth, `store` is the working copy, `localStorage` is an offline-ish cache.* On every page load `restoreSession()` → `syncStateFromServer()` refreshes the working copy from MySQL, and every mutation updates both.

### 5.2 The render pipeline (the heart of the SPA)

```
sidebar click
  → localStorage.setItem('devs_last_page', page)
  → renderPage(page)
      → canAccessPage(page)?        (HR-controlled page access)
      → pages[page].build()          returns an HTML string
      → dashboardPanel.innerHTML = html
      → attachPageHandlers(page)     re-binds events for the new DOM
      → render<Something>Rows()      fills tables from the store
```

```js
function renderPage(page) {
    if (!canAccessPage(page)) { confirmDialog({ title: 'Access Denied', … }); page = 'dashboard'; }
    const targetPage = pages[page] ? page : 'dashboard';
    if (isRendering) { pendingPage = targetPage; return; }   // re-entrancy guard
    isRendering = true;
    requestAnimationFrame(() => {
        try {
            dashboardPanel.innerHTML = pages[targetPage].build();
            attachPageHandlers(targetPage);
        } finally { isRendering = false; /* run pendingPage if it changed */ }
    });
}
```

Because `innerHTML` destroys the old elements, their event listeners die with them. That is why handlers are re-attached after every render (`attachPageHandlers`).

`pages` is a map of page key → `{ title, subtitle, build }`. Adding a module means adding one entry and one `build` function.

### 5.3 Event delegation, the reason tables still work

Rows are generated from data, so binding a listener per row would mean re-binding after every render. Instead, one listener sits on the `<tbody>`:

```js
$('#apTbody')?.addEventListener('click', (e) => {
    const row = e.target.closest('tr[data-id]');
    if (!row) return;
    …
});
```

The click bubbles up to the tbody, then `closest('tr[data-id]')` finds which row was hit. Same idea for the invoice sidebar. Also used: `throttle(fn, ms)` to limit how often typing re-renders, and `lockElement(btn, 500)` to stop double-submits.

### 5.4 Custom dropdowns

Native `<select>` cannot be styled consistently, so the project builds them from a button plus a `<ul>`:

```html
<div class="custom-filter-dropdown" data-id="apStatus">
    <button class="custom-filter-btn" data-value="">All Status</button>
    <ul class="custom-filter-menu">
        <li data-value="Due">Due</li>
        <li data-value="Overdue">Overdue</li>
        <li data-value="Paid">Paid</li>
    </ul>
</div>
```

`setupCustomDropdowns()` handles every dropdown on the page through **one** document-level listener: on a click it finds the nearest `li[data-value]`, stores the value on the button's `dataset.value`, updates the label, marks `is-selected`, then dispatches a re-render based on `localStorage.getItem('devs_last_page')`. Selecting the same value again clears the filter back to `''`.

Consequence worth remembering: the filter's state lives in the DOM (`data-value`), not in a JavaScript variable, so anything that re-renders must read it back — that detail is exactly the bug in Level 6.

---

## LEVEL 6 — Account Payable, the deep dive

This module demonstrates a clean data model and explicit business rules.

### 6.1 What the module shows

Two view modes, chosen with the `apViewMode` dropdown:

- **View by Vendor** (`list`): one row per bill — Invoice No., Invoice Date, Invoice Amount, Status, Outstanding.
- **View by Invoice** (`invoice`): a master list of bills on the left, and on the right the selected bill with its vendor, amount, due date, status and the vouchers/payments that settle it.

A bill in memory looks like:

```js
{ id: 'AP-001', vendor: 'Cloud Services PH', invoice: '12312313',
  date: '2026-09-01', due: '2026-09-30', amount: 12313122,
  status: 'Approved', paymentId: null }
```

Notice `status` is what the user picked when creating the bill (`For review`, `Approved`, `Due`, `Paid`), while the filter only offers `Due`, `Overdue`, `Paid`. That mismatch is the core of the business logic.

### 6.2 Derived statuses (two functions, both important)

```js
const effectiveRecordStatus = (rec) => {
    const st = String(rec?.status || '').trim();
    if (/^paid$/i.test(st)) return 'Paid';
    const due = String(rec?.due || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(due) && due < todayDateString()) return 'Overdue';
    return st || 'Pending';
};
```

`YYYY-MM-DD` strings compare correctly with `<` as plain text, so no date library is needed to decide "is this overdue?".

```js
const payableStatus = (rec) => {
    if (/^paid$/i.test(String(rec?.status || '').trim())) return 'Paid';
    // sum payments/transactions that reference this bill
    const paidAmount = paymentRows.filter(/* paymentId match, or same invoice ref,
                                             or same vendor + same amount */)
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    if (paidAmount >= Number(rec?.amount || 0) && Number(rec?.amount || 0) > 0) return 'Paid';
    return effectiveRecordStatus(rec);       // otherwise fall back to date-based status
};
```

In summary, a bill is Paid if its stored status says Paid **or** the payments recorded against it cover the amount; otherwise it is Overdue if its due date has passed; otherwise it keeps its workflow status.

### 6.3 The filter, and why `Due` means "everything else"

```js
function matchesPayableStatus(rec, status) {
    if (!status) return true;
    const effective = payableStatus(rec);
    if (status === 'Due') return effective !== 'Paid' && effective !== 'Overdue';
    return effective === status;
}
```

Bills stored as `For review` or `Approved` are still outstanding but they are not `Overdue` yet, so they belong under `Due`. Without this rule, choosing "Due" would hide most of the table and confuse the user — that was the first bug report ("the status filter is not working").

### 6.4 Shared filtering across both views

**Symptom.** Selecting "Overdue" filtered the table correctly, but clicking any invoice in the sidebar brought all six bills back while the dropdown still said "Overdue".

**Diagnosis.** `renderInvoiceView()` rebuilt the master list from `store.payables` — *all* bills — and hard-coded `All Invoices (${allInvoices.length})`. So the filter was applied and then immediately overwritten by the same re-render that drew the selected bill. Nothing was "losing" the filter variable; the filter was never consulted.

**Root cause in engineering terms.** Two functions each owned part of the truth. The filter lived in `renderPayableRows()`, while `renderInvoiceView()` had its own idea of the list. Any code path that went through `renderInvoiceView()` (sidebar click, row click, view-mode switch) bypassed the filter.

**Fix.** Make the filtered list the single source of truth:

```js
function payableFilterState() {                 // read the UI once
    const q = ($('.payables-table-wrapper #apSearch')?.value || '').trim().toLowerCase();
    const status = $('.custom-filter-dropdown[data-id="apStatus"] .custom-filter-btn')?.dataset.value || '';
    return { q, status };
}
function visiblePayables(q, status) {           // one rule set for every renderer
    return (store.payables || []).filter(r => matchesPayableFilters(r, q, status));
}
```

Now both renderers consume it:

- `renderPayableRows()` (list mode) renders `visiblePayables(q, status)` and shows "No payables match the current filters." when empty.
- `renderInvoiceView()` lists only matching bills, prints the matching count, and falls back to the first match when the selected bill was filtered out; if nothing matches it draws an empty state instead of the old list.

So every entry point — sidebar click, table-row click, view-mode switch, add/edit/delete — goes through the same filtered list, and the filter can no longer be "reset" by a re-render.

To verify the behavior manually, open the invoice view, select `Overdue`, click another bill, clear the dropdown, and combine search text with a status filter. Both views should retain the same filtered records.

### 6.5 The AP event wiring

```js
if (page === 'payables') {
    renderPayableRows();                                        // fill the table
    $('#apSearch')?.addEventListener('input', throttle(guard(renderPayableRows), 100));
    $('#apTbody')?.addEventListener('click', (e) => { …open invoice view…; renderInvoiceView(id); renderPayableRows(); });
    $('#addApBtn')?.addEventListener('click', (e) => { … openPayableForm() … });
}
```

`payableForm(pay)` builds the modal for Add/Edit a bill; `openPayableForm()` opens it; saving pushes into `store.payables`, calls `saveStore()`, and re-renders both the table and the invoice panel.

---

## LEVEL 7 — Security and quality

| Concern | What the code does | Where |
|---|---|---|
| Password storage | bcrypt via `password_hash` / `password_verify`; never plain text | `api.php` |
| SQL injection | PDO prepared statements with bound parameters | `db.php`, both APIs |
| Session hijacking | `HttpOnly`, `SameSite=Lax` cookies; server-side session checks | `index.php`, `requireUser()` |
| Unauthorised access | Department check on page load + role check on every write action | `FINANCE/index.php`, `FINANCE/api.php` |
| Page-level permissions | `page_access` table managed by HR; `canAccessPage()` blocks the render and the API rejects writes | `access.get`, `functions.js` |
| Traceability | `audit_trail` rows written by `audit()` (login, approve, edit…) | `FINANCE/api.php` |
| Money precision | `DECIMAL(12,2)` columns, `Number()` arithmetic only at display time | SQL schema |
| Double submits | `lockElement()` + disabled buttons around save actions | `functions.js` |

**Known limitations:**

1. `db.php` hardcodes the XAMPP credentials (`root`, empty password). Fine for a local capstone build; production would read them from environment variables.
2. `localStorage` keeps a copy of finance data on the client, so a shared computer could expose it after logout; a production build would clear the store on `setLoggedOut()` and rely on server rendering only.
3. The `state` POST uses delete-then-insert rather than per-row diffing — simple and atomic, but it rewrites whole tables and breaks if two users edit simultaneously. The next step is per-record endpoints (`payable.save`, `payable.delete`).
4. Some templates insert values into HTML without escaping; an `escapeHtml()` helper exists and is used for export filenames, but it should be applied uniformly.
5. Core Finance and HR authentication uses the `accounts` table in `finance_hr`; Sales and Production authenticate against their module databases. Keeping these user stores separate is a current integration boundary, so account administration and password policies should eventually be consolidated.
6. There is no automated test suite; verification is manual click-through plus `node --check` / `php -l` syntax checks.

---

## Function reference

| Function | File | Responsibility |
|---|---|---|
| `db()` | `db.php` | single PDO connection |
| `respond()`, `requestBody()` | both APIs | JSON response / parse JSON body |
| `requireUser()`, `isFinanceAdmin()`, `isHrAdmin()` | `FINANCE/api.php` | authentication + authorisation |
| `audit()` | `FINANCE/api.php` | write to `audit_trail` |
| `loadState()` | `FINANCE/api.php` | one query per module → state object |
| `apiRequest()` | `auth.js`, `functions.js` | fetch wrapper with error handling |
| `loadStore()`, `saveStore()`, `syncStateFromServer()` | `functions.js` | local cache + server sync |
| `renderPage()`, `attachPageHandlers()` | `functions.js` | SPA render pipeline |
| `pages[page].build()` | `functions.js` | HTML for one module |
| `setupCustomDropdowns()` | `functions.js` | one delegated handler for all dropdowns |
| `effectiveRecordStatus()`, `payableStatus()` | `functions.js` | derived bill status |
| `matchesPayableStatus()`, `visiblePayables()` | `functions.js` | the payables filter rules |
| `renderPayableRows()`, `renderInvoiceView()` | `functions.js` | the two AP views |
| `payableForm()` | `functions.js` | add/edit bill modal |
