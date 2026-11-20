document.addEventListener('DOMContentLoaded', () => {

    const IS_FINANCE = false;
    const DEMO_USER = 'admin';
    const DEMO_PASS = 'admin123';
    const API_URL = 'api.php';

    const loginScreen = document.getElementById('loginScreen');
    const appShell = document.getElementById('appShell');
    const loginForm = document.getElementById('loginForm');
    const userAvatar = document.getElementById('userAvatar');
    const loginPassword = document.getElementById('loginPass');
    const loginPasswordToggle = document.getElementById('loginPasswordToggle');
    let activeUser = null;

    async function apiRequest(action, options = {}) {
        const response = await fetch(`${API_URL}?action=${encodeURIComponent(action)}`, {
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
            ...options
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.ok === false) {
            const error = new Error(data.message || 'The request could not be completed.');
            error.code = data.code || '';
            throw error;
        }
        return data;
    }

    loginPasswordToggle?.addEventListener('click', () => {
        const isVisible = loginPassword.type === 'text';
        loginPassword.type = isVisible ? 'password' : 'text';
        loginPasswordToggle.setAttribute('aria-label', isVisible ? 'Show password' : 'Hide password');
        loginPasswordToggle.setAttribute('aria-pressed', String(!isVisible));
        loginPasswordToggle.classList.toggle('is-visible', !isVisible);
    });

    function setLoggedIn(username, user = null) {
        if (loginScreen) loginScreen.style.display = 'none';
        if (appShell) appShell.style.display = 'flex';
        activeUser = user || activeUser;
        if (user) localStorage.setItem('devs_profile', JSON.stringify(user));
        updateAvatarFromProfile();
        applySidebarRestrictions();
        void loadRealNotifications();
    }

    function updateAvatarFromProfile() {
        if (!userAvatar) return;
        const username = localStorage.getItem('devs_user') || 'admin';
        const profile = JSON.parse(localStorage.getItem('devs_profile') || '{}');
        const displayName = (profile.fullName || username).trim();
        const parts = displayName.split(/\s+/).filter(Boolean);
        let ini = '';
        if (parts.length === 0) ini = username.substring(0, 2).toUpperCase();
        else if (parts.length === 1) ini = parts[0].substring(0, 2).toUpperCase();
        else ini = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        userAvatar.textContent = ini;
        userAvatar.title = `Signed in as ${displayName}`;
        const nameEl = document.getElementById('topbarName');
        const emailEl = document.getElementById('topbarEmail');
        if (nameEl) nameEl.textContent = displayName;
        if (emailEl) emailEl.textContent = profile.email || username;
    }

    function setLoggedOut() {
        localStorage.removeItem('devs_user');
        localStorage.removeItem('devs_last_page');
        activeUser = null;
        void apiRequest('logout', { method: 'POST' }).catch(() => {});
        window.location.href = '../root/index.php';
    }

    const remembered = localStorage.getItem('devs_user');

    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const usernameInput = loginForm.querySelector('[name="username"], [name="identifier"]');
        const passwordInput = loginForm.querySelector('[name="password"]');
        const username = usernameInput?.value.trim() || '';
        const password = passwordInput?.value || '';

        const emailError = 'Please enter your email address.';
        const passwordError = 'Please enter your password.';
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        const usernameErrorText = loginForm.querySelector('[name="username"]')?.closest('.form-field')?.querySelector('.error-text');
        const passwordErrorText = loginForm.querySelector('[name="password"]')?.closest('.form-field')?.querySelector('.error-text');
        if (usernameErrorText) usernameErrorText.textContent = emailError;
        if (passwordErrorText) passwordErrorText.textContent = passwordError;

        let valid = true;
        const markError = (name, err) => {
            const field = loginForm.querySelector(`[name="${name}"]`)?.closest('.form-field');
            if (field) field.classList.toggle('has-error', err);
            if (err) valid = false;
        };
        markError('username', !username || (username !== DEMO_USER && !emailPattern.test(username)));
        if (!valid) return;

        if (!password) { markError('password', true); return; }

        try {
            const result = await apiRequest('login', {
                method: 'POST',
                body: JSON.stringify({ identifier: username, password })
            });
            localStorage.setItem('devs_user', result.user.username);
            activeUser = result.user;
            await syncStateFromServer();
            await loadPageAccess();
            setLoggedIn(result.user.username, result.user);
            toast('Welcome back, ' + result.user.fullName + '!');
            const lastPage = localStorage.getItem('devs_last_page') || 'dashboard';
            markNavActive(lastPage);
            renderPage(lastPage);
        } catch (error) {
            markError('password', true);
            const errorText = loginForm.querySelector('[name="password"]')?.closest('.form-field')?.querySelector('.error-text');
            if (errorText) errorText.textContent = error.message;
            toast(error.message, error.code === 'pending_approval' ? 'info' : 'error');
        }
    });

    document.getElementById('forgotLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        toast('Please contact your administrator to reset your password.', 'info');
    });

    document.getElementById('registerLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        toast('Please contact your HR Administrator to create an account.', 'info');
    });

    const todayDateString = () => {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const currentPayrollCycle = () => {
        const date = new Date();
        const month = date.toLocaleDateString('en-US', { month: 'long' });
        return `${month} 15–30, ${date.getFullYear()}`;
    };

    const SEED = {
        employees: [], attendance: [], leaves: [], payroll: [], deductions: [], contributions: [],
        accounts: [], receivables: [], payables: [], cashBank: [], expenses: [],
        settings: { company: 'D.E.V.S Management Inc.', currency: 'PHP (₱)', cycle: 'October 1–15, 2026', days: '5 days (Mon–Fri)' }
    };

    const STORE_KEY = IS_FINANCE ? 'devs_finance_store_v1' : 'devs_store_v1';
    const ATTENDANCE_FILTER_KEY = 'devs_hr_attendance_filter_date';

    function loadStore() {
        try {
            const raw = localStorage.getItem(STORE_KEY);
            if (!raw) return JSON.parse(JSON.stringify(SEED));
            const parsed = JSON.parse(raw);
            return {
                employees:  parsed.employees  || [],
                attendance: parsed.attendance || [],
                leaves:     parsed.leaves     || [],
                payroll:    parsed.payroll    || [],
                accounts:   parsed.accounts   || [],
                receivables: parsed.receivables || [],
                payables:   parsed.payables   || [],
                cashBank:   parsed.cashBank   || [],
                expenses:   parsed.expenses   || [],
                contributions: parsed.contributions || [],
                settings:   parsed.settings   || JSON.parse(JSON.stringify(SEED.settings)),
                deductions: parsed.deductions || []
            };
        } catch {
            return JSON.parse(JSON.stringify(SEED));
        }
    }

    function deduplicateAttendance(records) {
        const seen = new Set();
        return records.filter(record => {
            const key = [record.empId, record.date, record.timeIn || '', record.timeOut || '', record.status].join('|');
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    const store = loadStore();
    store.attendance = deduplicateAttendance(store.attendance);

    const WORKING_DAYS_PER_MONTH = 22;

    function getDayStamp(value) {
        const date = new Date(`${value}T00:00:00`);
        return Number.isNaN(date.getTime()) ? null : date.getTime();
    }

    function getPayrollCycleRange(cycle) {
        if (!cycle || typeof cycle !== 'string') return null;
        const text = cycle.trim();
        const match = text.match(/([A-Za-z]+)\s+(\d+|\d+\s*[-–]\s*\d+|16\s*[-–]\s*End|1\s*[-–]\s*15|15\s*[-–]\s*30)\s*,\s*(\d{4})/i);
        if (!match) return null;
        const monthName = match[1];
        const monthIndex = { January: 0, February: 1, March: 2, April: 3, May: 4, June: 5, July: 6, August: 7, September: 8, October: 9, November: 10, December: 11 }[monthName];
        if (monthIndex === undefined) return null;
        const year = Number(match[3]);
        const interval = match[2].replace(/\s+/g, '').replace(/–/g, '-');
        let startDay = 1;
        let endDay = new Date(year, monthIndex + 1, 0).getDate();
        if (interval === '1-15') endDay = 15;
        else if (interval === '15-30') { startDay = 15; endDay = new Date(year, monthIndex + 1, 0).getDate(); }
        else if (interval === '16-End') startDay = 16;
        if (interval.includes('-')) {
            const bounds = interval.split('-');
            if (bounds[0] && !Number.isNaN(Number(bounds[0]))) startDay = Number(bounds[0]);
            if (bounds[1] && bounds[1] !== 'End' && !Number.isNaN(Number(bounds[1]))) endDay = Number(bounds[1]);
            if (bounds[1] === 'End') endDay = new Date(year, monthIndex + 1, 0).getDate();
        }
        return { monthIndex, year, startDay, endDay };
    }

    function calculateApprovedLeaveDaysForEmployee(empId, cycle) {
        const range = getPayrollCycleRange(cycle);
        if (!range) return 0;
        const cycleStart = new Date(range.year, range.monthIndex, range.startDay, 0, 0, 0).getTime();
        const cycleEnd = new Date(range.year, range.monthIndex, range.endDay, 23, 59, 59, 999).getTime();
        return store.leaves.reduce((total, leave) => {
            if (String(leave.empId) !== String(empId) || leave.status !== 'Approved') return total;
            const leaveFrom = getDayStamp(leave.from);
            const leaveTo = getDayStamp(leave.to);
            if (leaveFrom === null || leaveTo === null) return total;
            const overlapStart = Math.max(leaveFrom, cycleStart);
            const overlapEnd = Math.min(leaveTo, cycleEnd);
            if (overlapEnd < overlapStart) return total;
            const overlapDays = Math.floor((overlapEnd - overlapStart) / 86400000) + 1;
            return total + overlapDays;
        }, 0);
    }

    function payrollKey(rec) {
        const cycle = rec.payroll_period || rec.cycle || rec.period || '';
        return `${Number(rec.empId)}|${cycle}`;
    }

    // Leave deduction for one payroll run = approved leave days that overlap its
    // cycle × the employee's daily rate. The payslip, the Payroll page and the
    // Deductions page all use this same figure so they stay in step.
    function leaveAmountFor(pay) {
        const emp = empById(pay.empId);
        if (!emp) return 0;
        const cycle = pay.payroll_period || pay.cycle || '';
        const days = calculateApprovedLeaveDaysForEmployee(pay.empId, cycle);
        return Math.round(days * (Number(emp.salary) || 0) / WORKING_DAYS_PER_MONTH);
    }

    // The non-leave (statutory/other) portion of a payroll's deductions. Kept on
    // the row once computed so the leave portion is never added twice.
    function payrollBaseAmount(pay) {
        if (pay.baseDeductions !== undefined && pay.baseDeductions !== null) {
            return Number(pay.baseDeductions) || 0;
        }
        const total = Number(pay.deductions) || 0;
        const leave = leaveAmountFor(pay);
        // If the stored total is smaller than the leave amount it can't include
        // the leave, so the total is the base on its own.
        return total >= leave ? total - leave : total;
    }

    function captureLeaveAmounts() {
        const map = new Map();
        store.payroll.forEach(pay => map.set(payrollKey(pay), leaveAmountFor(pay)));
        return map;
    }

    // Recompute every payroll's total deduction as base + current leave.
    // `prevLeave` (optional) holds the leave amounts from BEFORE a leave change,
    // which lets us recover the true base instead of double-counting the leave.
    function applyLeavePayrollRule(prevLeave) {
        store.payroll.forEach((pay) => {
            const emp = empById(pay.empId);
            if (!emp) return;
            const total = Number(pay.deductions) || 0;
            const before = prevLeave && prevLeave.has(payrollKey(pay))
                ? prevLeave.get(payrollKey(pay))
                : leaveAmountFor(pay);
            const base = (pay.baseDeductions !== undefined && pay.baseDeductions !== null)
                ? Number(pay.baseDeductions) || 0
                : Math.max(0, total - before);
            pay.baseDeductions = base;
            pay.deductions = Math.round(base + leaveAmountFor(pay));
        });
    }

    /* The Deductions page mirrors Payroll: every row is derived from a payroll
       record, split into its Leave (Unpaid) portion and the remaining
       statutory/other amount, so the page total always equals the payroll total.
       Manually recorded rows (if any) are shown and folded into that split. */
    function deductionRows() {
        const rows = [];
        const manual = (store.deductions || []).filter(d => d && d.source !== 'leave');
        const usedManual = new Set();

        store.payroll.forEach(pay => {
            const emp = empById(pay.empId);
            const cycle = pay.payroll_period || pay.cycle || '';
            if (!emp || !cycle) return;
            const empId = Number(pay.empId);
            const key = payrollKey(pay);
            const slug = String(cycle).replace(/[^0-9A-Za-z]/g, '');
            const total = Number(pay.deductions) || 0;
            const leave = leaveAmountFor(pay);

            const mine = manual.filter(d => payrollKey(d) === key);
            let manualTotal = 0;
            mine.forEach(d => { usedManual.add(d.id); manualTotal += Number(d.amount) || 0; rows.push(d); });

            const base = mine.length ? Math.max(0, total - leave) : payrollBaseAmount(pay);
            const remainder = Math.max(0, base - manualTotal);
            if (remainder > 0) {
                rows.push({
                    id: `BASE-${empId}-${slug}`, empId,
                    type: 'Other Deductions', period: cycle,
                    amount: remainder, status: 'Applied', source: 'base'
                });
            }
            if (leave > 0) {
                rows.push({
                    id: `LEAVE-${empId}-${slug}`, empId,
                    type: 'Leave (Unpaid)', period: cycle,
                    amount: leave, status: 'Applied', source: 'leave'
                });
            }
        });

        // Manual rows that aren't attached to any payroll still show.
        manual.filter(d => !usedManual.has(d.id)).forEach(d => rows.push(d));
        return rows;
    }

    /* One "account" = an employee within a payroll period. When a payroll has
       more than one deduction line (e.g. unpaid leave + SSS), they are combined
       into a single row so the page shows one total per account. The View modal
       breaks the total back down into each deduction and why it was charged. */
    function deductionGroups() {
        const groups = new Map();
        deductionRows().forEach(d => {
            const key = `${Number(d.empId)}|${d.period || ''}`;
            if (!groups.has(key)) {
                groups.set(key, {
                    id: `DEDG-${Number(d.empId)}-${String(d.period || '').replace(/[^0-9A-Za-z]/g, '')}`,
                    empId: d.empId,
                    period: d.period || '',
                    items: []
                });
            }
            groups.get(key).items.push(d);
        });
        return [...groups.values()].map(g => {
            const amount = g.items.reduce((s, d) => s + (Number(d.amount) || 0), 0);
            const statuses = g.items.map(d => d.status);
            const status = statuses.includes('Pending') ? 'Pending'
                : statuses.includes('Applied') ? 'Applied'
                : (statuses[0] || 'Applied');
            return { ...g, amount, status };
        });
    }

    function deductionGroupLabel(group) {
        const types = [...new Set(group.items.map(d => d.type).filter(Boolean))];
        if (types.length <= 1) return types[0] || 'Deduction';
        if (types.length === 2) return types.join(' + ');
        return `${types.length} deductions`;
    }

    // Plain-language reason shown in the View modal for each deduction line.
    function deductionReason(d, emp) {
        const lower = String(d.type || '').trim().toLowerCase();
        if (lower.includes('leave')) {
            const days = calculateApprovedLeaveDaysForEmployee(d.empId, d.period || '');
            const dailyRate = emp ? (Number(emp.salary) || 0) / WORKING_DAYS_PER_MONTH : 0;
            return `${days} unpaid leave day(s) within this period, charged at ${peso(dailyRate)} per day.`;
        }
        if (lower === 'other deductions') return 'Government contributions (SSS, PhilHealth, Pag-IBIG) and any other recorded deductions for this period.';
        if (lower === 'sss') return 'Social Security System (SSS) contribution.';
        if (lower === 'philhealth') return 'PhilHealth contribution.';
        if (lower === 'pag-ibig') return 'Pag-IBIG (HDMF) contribution.';
        if (lower === 'cash advance') return 'Salary cash advance repayment.';
        if (lower === 'sss loan') return 'SSS salary loan repayment.';
        if (lower === 'pag-ibig loan') return 'Pag-IBIG loan repayment.';
        return 'Recorded deduction for this payroll period.';
    }

    async function syncStateFromServer() {
        const result = await apiRequest('state');
        if (result.state && typeof result.state === 'object') {
            Object.assign(store, result.state);
            return;
        }
    }

    function saveStore(activity = '') {
        // Build a set of valid numeric employee_ids from the current store.
        const validEmpIds = new Set(
            store.employees
                .map(e => Number(e.id))
                .filter(n => Number.isFinite(n) && n > 0)
        );

        // Rewrite leaves/attendance/payroll/deductions so every row either
        // has a valid numeric empId or is dropped entirely from the payload.
        const sanitize = (rows) => {
            if (!Array.isArray(rows)) return [];
            return rows.map(row => {
                if (!row) return null;
                const raw = row.empId;
                let n = 0;
                if (raw !== undefined && raw !== null && raw !== '') {
                    const asNum = Number(raw);
                    if (Number.isFinite(asNum) && asNum > 0) {
                        n = asNum;
                    } else {
                        // Try matching by legacy string id like "EMP-002"
                        const emp = store.employees.find(e => String(e.id) === String(raw));
                        if (emp) {
                            const eNum = Number(emp.id);
                            if (Number.isFinite(eNum) && eNum > 0) n = eNum;
                        }
                    }
                }
                if (n <= 0 || !validEmpIds.has(n)) return null;    // drop the row
                return { ...row, empId: n };
            }).filter(Boolean);
        };

        // Apply sanitization to the store itself so the UI stays in sync.
        ['leaves', 'attendance', 'payroll', 'deductions'].forEach(key => {
            if (!Array.isArray(store[key])) return;
            store[key] = sanitize(store[key]);
        });

        try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) {}
        if (!localStorage.getItem('devs_user')) return;

        // Build a payload that only includes non-empty arrays, so we never
        // tell the server to wipe a table we don't actually have data for.
        const payload = {};
        const destructiveKeys = ['employees', 'attendance', 'leaves', 'payroll', 'deductions'];
        const safeKeys        = ['accounts', 'receivables', 'payables', 'cashBank', 'expenses', 'transactions', 'settings'];

        destructiveKeys.forEach(key => {
            if (!Array.isArray(store[key]) || store[key].length === 0) return;

            // For FK-dependent tables, drop rows whose empId is 0/invalid.
            if (['leaves', 'attendance', 'payroll', 'deductions'].includes(key)) {
                const cleaned = store[key].filter(row => Number(row?.empId) > 0);
                if (cleaned.length === 0) return;
                payload[key] = cleaned;
            } else {
                payload[key] = store[key];
            }
        });
        safeKeys.forEach(key => {
            if (store[key] !== undefined && store[key] !== null) {
                payload[key] = store[key];
            }
        });

        // Nothing meaningful to save — don't even hit the server.
        if (Object.keys(payload).length === 0) return Promise.resolve();

        // Return the request so critical flows (e.g. create employee) can await
        // the server write before re-fetching state — otherwise a GET can race
        // ahead of the POST and wipe the local change.
        return apiRequest('state', {
            method: 'POST',
            body: JSON.stringify({
                state: payload,
                ...(activity ? { auditActivity: activity } : {})
            })
        }).catch((err) => {
            console.error('saveStore failed:', err);
            toast('Could not save to server: ' + err.message, 'error');
        });
    }

    // Canonical positions for HR and Finance. Other departments keep their
    // own role sets (see positionOptionsFor).
    const HR_POSITIONS = ['HR Admin', 'HR Manager', 'HR Staff', 'Payroll Officer'];
    const FINANCE_POSITIONS = ['Finance Admin', 'Finance Manager', 'Finance Staff', 'Cashier', 'Finance Employee'];
    const WAREHOUSE_POSITIONS = ['Warehouse Manager', 'Inventory Staff', 'Warehouse Staff', 'Inventory Controller', 'Picker and Packer', 'Shipping and Receiving Clerk'];
    // 'Admin'/'Staff' remain here for Sales and Production accounts.
    const ALL_POSITIONS = [...HR_POSITIONS, ...FINANCE_POSITIONS, 'Admin', 'Staff', 'Buyer', 'Manager', 'Supervisor', ...WAREHOUSE_POSITIONS];
    const positionOptionsFor = (dept) =>
        dept === 'HR' ? HR_POSITIONS
        : dept === 'Finance' ? FINANCE_POSITIONS
        : dept === 'Inventory' ? WAREHOUSE_POSITIONS
        : dept === 'Procurement' ? ['Buyer', 'Manager']
        : dept === 'Production' ? ['Staff', 'Supervisor']
        : ['Staff', 'Admin'];

    // Only HR Admin and HR Manager manage HR records. HR Staff and Payroll
    // Officer are non-admin positions.
    const HR_ADMIN_POSITIONS = ['HR Admin', 'HR Manager'];
    const isHrAdmin = () => ['Administrator', 'HR Manager', 'HR Admin'].includes(activeUser?.role)
        || (String(activeUser?.department || '').toLowerCase() === 'hr'
            && (HR_ADMIN_POSITIONS.includes(activeUser?.position)
                || String(activeUser?.position || '').toLowerCase() === 'admin'));
    const canManageRecords = () => isHrAdmin();

    let pageAccessCache = null;
    async function loadPageAccess() {
        try {
            const result = await apiRequest('access.get');
            pageAccessCache = result.access || {};
        } catch { pageAccessCache = null; }
    }
    function canAccessPage(pageKey) {
        if (pageAccessCache && (pageKey in pageAccessCache)) return pageAccessCache[pageKey] === true;
        if (isHrAdmin()) return true;
        if (!pageAccessCache) return true;
        return true;
    }
    function applySidebarRestrictions() {
        if (typeof $$ !== 'function') return;
        document.querySelectorAll('.nav-item[data-page]').forEach(item => {
            const key = item.dataset.page;
            let visible = canAccessPage(key);
            if (key === 'pageAccess') visible = visible && isHrAdmin();
            item.style.display = visible ? '' : 'none';
            if (!visible) item.classList.remove('active');
        });
    }

    function csvValue(value) {
        const text = String(value ?? '').replace(/₱/g, '');
        return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    }
    function csvRows(headers, rows) {
        return '\uFEFF' + [headers, ...rows].map(row => row.map(csvValue).join(',')).join('\r\n');
    }
    function exportData(entity) {
        const employee = id => empById(id);
        if (entity === 'employees') return {
            screen: 'Employees', headers: ['Employee ID', 'Name', 'Department', 'Position', 'Status', 'Basic ₱'],
            rows: store.employees.map(e => [e.id, e.name, e.dept, e.position || 'Staff', e.status, e.salary])
        };
        if (entity === 'attendance') return {
            screen: 'Attendance', headers: ['Employee ID', 'Name', 'Date', 'Time In', 'Time Out', 'Hours', 'Overtime', 'Status'],
            rows: store.attendance.map(a => [a.empId, recordEmployeeName(a), a.date, a.timeIn || '', a.timeOut || '', calcHours(a.timeIn, a.timeOut), calcOvertime(a.timeIn, a.timeOut), a.status])
        };
        if (entity === 'leaves') return {
            screen: 'Leave', headers: ['Leave ID', 'Employee ID', 'Employee', 'Type', 'From', 'To', 'Days', 'Status', 'Reason'],
            rows: store.leaves.map(l => [l.id, l.empId, recordEmployeeName(l), l.type, l.from, l.to, calcDays(l.from, l.to), l.status, l.reason])
        };
        if (entity === 'payroll') return {
            screen: 'Payroll', headers: ['ID', 'Employee', 'Date Hired', 'Period', 'Salary ₱', 'Overtime ₱', 'Absences', 'Deduction ₱', 'Status'],
            rows: store.payroll.map(p => {
                const emp = empById(p.empId);
                const cycle = p.payroll_period || p.cycle || '—';
                const gross = p.gross_salary !== undefined ? Number(p.gross_salary) : (Number(p.gross) || 0);
                const overtime = p.overtime !== undefined ? Number(p.overtime) : 0;
                const absences = p.absences !== undefined ? Number(p.absences) : 0;
                return [p.id, emp?.name || p.empId, emp?.joined || '—', cycle, gross, overtime, absences, p.deductions, p.status];
            })
        };
        if (entity === 'payrollhistory') return {
            screen: 'Payroll History', headers: ['Payroll ID', 'Employee ID', 'Employee', 'Department', 'Pay Period', 'Basic Salary ₱', 'Overtime ₱', 'Gross Pay ₱', 'Deductions ₱', 'Net Pay ₱', 'Status'],
            rows: store.payroll.map(p => {
                const emp = empById(p.empId);
                return [`PAY-${String(p.id).padStart(4, '0')}`, emp?.empNo || p.empId, emp?.name || p.empId, emp?.dept || '—', p.payroll_period || p.cycle || '—', Number(p.salary) || 0, Number(p.overtime) || 0, Number(p.gross) || 0, Number(p.deductions) || 0, Number(p.net) || 0, p.status];
            })
        };
        if (entity === 'contribution') return {
            screen: 'Contribution', headers: ['Employee ID', 'Employee', 'Department', 'Basic Salary ₱', 'Employer Share ₱', 'Employee Share ₱', 'Total Contribution ₱', 'Period'],
            rows: store.contributions.map(c => {
                const shares = contributionRowShares(c);
                return [c.empNo || c.empId, c.employeeName || recordEmployeeName(c), c.dept || '—', Number(c.basicSalary) || 0, shares.employer, shares.ee, shares.total, c.period || ''];
            })
        };
        if (entity === '13thmonth') return {
            screen: '13thMonth', headers: ['Employee ID', 'Employee', 'Annual Basic ₱', '13th Month ₱', 'Status'],
            rows: store.employees.map(e => [(e.empNo || ('EMP-' + String(e.id).padStart(3, '0'))), e.name, Number(e.salary || 0) * 12, Number(e.salary || 0), e.status])
        };
        if (entity === 'deductions') return {
            screen: 'Deductions', headers: ['ID', 'Employee', 'Type', 'Period', 'Amount ₱', 'Status'],
            rows: deductionRows().map(d => [d.id, empById(d.empId)?.name || d.empId, d.type, d.period, d.amount, d.status])
        };
        return null;
    }
    /* -------------------- EXPORT REPORT (Charts of Account design, all modules) -------------------- */

    const EXPORT_LABELS = {
        employees: 'Employees Master',
        attendance: 'Attendance Log',
        leaves: 'Leave Requests',
        payroll: 'Payroll Report',
        payrollhistory: 'Payroll History Report',
        contribution: 'Contributions',
        '13thmonth': '13th Month Pay',
        deductions: 'Deductions'
    };

    const EMP_EXPORT_COLUMNS = [
        { key: 'id',       label: 'Employee ID',  value: e => String(e.id).padStart(5, '0') },
        { key: 'name',     label: 'Name',         value: e => String(e.name || '') },
        { key: 'dept',     label: 'Department',   value: e => String(e.dept || '') },
        { key: 'position', label: 'Position',     value: e => String(e.position || 'Staff') },
        { key: 'status',   label: 'Status',       value: e => String(e.status || '') },
        { key: 'salary',   label: 'Basic Salary', value: e => Number(e.salary || 0) }
    ];

    // Columns for every module: employees keeps its friendly labels, the rest
    // derive from the export table headers so new modules need no extra code.
    function exportColumnsFor(entity) {
        if (entity === 'employees') return EMP_EXPORT_COLUMNS;
        const data = exportData(entity);
        if (!data) return [];
        return data.headers.map((label, index) => ({
            key: `c${index}`,
            label,
            value: row => row[index]
        }));
    }

    function exportRowsFor(entity, data, range) {
        if (entity === 'employees') return range === 'all' ? store.employees.slice() : visibleEmployees();
        if (range === 'all') return data.rows;
        if (entity === 'attendance') {
            const ids = new Set(visibleAttendance().map(a => a.id));
            return data.rows.filter((row, index) => ids.has(store.attendance[index]?.id));
        }
        if (entity === 'leaves') {
            const q = ($('#leaveSearch')?.value || '').trim().toLowerCase();
            const statuses = leaveStatusSelection();
            const keep = new Set(store.leaves.filter(l => {
                const emp = empById(l.empId);
                const text = idSearchText(recordEmployeeName(l), l.empId, emp?.id, emp?.empNo, l.id, l.reason, l.type, l.status);
                return (!q || text.includes(q)) && (!statuses.length || statuses.includes(l.status));
            }).map(l => l.id));
            return data.rows.filter((row, index) => keep.has(store.leaves[index]?.id));
        }
        if (entity === 'payroll') {
            const keep = new Set(visiblePayroll().map(p => p.id));
            return data.rows.filter((row, index) => keep.has(store.payroll[index]?.id));
        }
        if (entity === 'contribution') {
            const keep = new Set(visibleContributionRows().map(c => c.id));
            return data.rows.filter((row, index) => keep.has(store.contributions[index]?.id));
        }
        return data.rows;
    }

    function openExportModal(entity) {
        const data = exportData(entity);
        if (!data) { toast('There is nothing to export for this module yet.', 'error'); return; }
        const columns = exportColumnsFor(entity);
        const title = EXPORT_LABELS[entity] || data.screen;

        const overlay = document.createElement('div');
        overlay.className = 'coa-modal-overlay open';
        overlay.innerHTML = `
            <div class="coa-modal-content">
                <div class="export-modal-header">
                    <h3>Export Report</h3>
                    <p>${escapeHtml(title)}</p>
                </div>
                <div class="export-modal-body">
                    <div class="export-section">
                        <div class="export-section-title">1. File Format</div>
                        <div class="export-grid">
                            <label class="export-card active">
                                <input type="radio" name="exportFormat" value="pdf" checked>
                                <div class="export-radio-circle"></div>
                                <span class="export-icon export-icon-pdf">
                                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
                                </span>
                                <div class="export-text-wrap">
                                    <strong>PDF Documents</strong>
                                    <span>.pdf - Print, ready fixed layout</span>
                                </div>
                            </label>
                            <label class="export-card">
                                <input type="radio" name="exportFormat" value="excel">
                                <div class="export-radio-circle"></div>
                                <span class="export-icon export-icon-excel">
                                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>
                                </span>
                                <div class="export-text-wrap">
                                    <strong>Excel Workbook</strong>
                                    <span>.xlsx - Editable, raw data</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div class="export-section">
                        <div class="export-section-title">2. Records to Export</div>
                        <div class="export-radio-group">
                            <label class="export-radio-item active">
                                <input type="radio" name="exportRange" value="current" checked>
                                <div class="export-radio-circle"></div>
                                <span>Current view</span>
                            </label>
                            <label class="export-radio-item">
                                <input type="radio" name="exportRange" value="all">
                                <div class="export-radio-circle"></div>
                                <span>All records</span>
                            </label>
                        </div>
                    </div>

                    <div class="export-section">
                        <div class="export-section-title">3. Columns</div>
                        <div class="export-checkbox-grid">
                            ${columns.map(c => `<label class="export-checkbox-item"><input type="checkbox" value="${c.key}" checked> <div class="export-checkbox-box"></div> <span>${escapeHtml(c.label)}</span></label>`).join('')}
                        </div>
                        <button class="export-clear-btn" type="button" style="margin-top:16px;">Clear all</button>
                    </div>
                </div>
                <div class="export-modal-footer">
                    <button class="export-btn-cancel" type="button" data-export-cancel>Cancel</button>
                    <button class="export-btn-export" type="button" id="confirmExport">Export to PDF</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.querySelector('[data-export-cancel]').addEventListener('click', () => overlay.remove());

        overlay.querySelectorAll('input[name="exportFormat"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                overlay.querySelectorAll('.export-card').forEach(c => c.classList.remove('active'));
                e.target.closest('.export-card').classList.add('active');
                overlay.querySelector('#confirmExport').textContent = e.target.value === 'excel' ? 'Export to Excel' : 'Export to PDF';
            });
        });
        overlay.querySelectorAll('input[name="exportRange"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                overlay.querySelectorAll('.export-radio-item').forEach(c => c.classList.remove('active'));
                e.target.closest('.export-radio-item').classList.add('active');
            });
        });
        overlay.querySelector('.export-clear-btn').addEventListener('click', () => {
            overlay.querySelectorAll('.export-checkbox-item input').forEach(cb => cb.checked = false);
        });

        overlay.querySelector('#confirmExport').addEventListener('click', () => {
            const format = overlay.querySelector('input[name="exportFormat"]:checked').value;
            const range = overlay.querySelector('input[name="exportRange"]:checked').value;
            const keys = Array.from(overlay.querySelectorAll('.export-checkbox-item input:checked')).map(cb => cb.value);
            if (!keys.length) { toast('Select at least one column to export.', 'error'); return; }
            const selected = columns.filter(c => keys.includes(c.key));
            const rows = exportRowsFor(entity, data, range);
            const ext = format === 'excel' ? 'csv' : 'pdf';
            const fileBase = String(data.screen).replace(/[^A-Za-z0-9]+/g, '');
            const filename = `DEVS_${fileBase}_${todayDateString()}.${ext}`;
            overlay.remove();
            startExportProcess(filename, { format, rows, columns: selected, title });
        });
    }

    function startExportProcess(filename, payload) {
        const overlay = document.createElement('div');
        overlay.className = 'coa-modal-overlay open';
        overlay.innerHTML = `
            <div class="coa-modal-content" style="max-width: 450px;">
                <div class="progress-modal">
                    <div class="progress-icon generating">
                        <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    </div>
                    <h3>Generating export</h3>
                    <p class="progress-filename">${escapeHtml(filename)}</p>
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill"></div>
                    </div>
                    <div class="progress-status-text">
                        <ul>
                            <li>Preparing ${escapeHtml(payload.title)} data</li>
                        </ul>
                    </div>
                    <div class="progress-modal-footer" style="justify-content:center;">
                        <button class="progress-btn-done" type="button" disabled style="opacity:0.5;">DONE</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const fill = overlay.querySelector('.progress-bar-fill');
        const textList = overlay.querySelector('.progress-status-text ul');
        const steps = [
            `Preparing ${payload.title} data`,
            'Applying filter & selected columns',
            'Formatting layout',
            'Compiling & finalizing file'
        ];
        let step = 0;

        const interval = setInterval(() => {
            step++;
            fill.style.width = `${(step / steps.length) * 100}%`;
            if (step <= steps.length) {
                textList.innerHTML = steps.slice(0, step).map(s => `<li>${escapeHtml(s)}</li>`).join('');
            }

            if (step === steps.length) {
                clearInterval(interval);
                setTimeout(() => {
                    const icon = overlay.querySelector('.progress-icon');
                    icon.className = 'progress-icon success';
                    icon.innerHTML = '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
                    overlay.querySelector('h3').textContent = 'Export completed';
                    overlay.querySelector('.progress-filename').textContent = 'Your file is ready to download.';
                    overlay.querySelector('.progress-status-text').innerHTML = `<div class="progress-file-chip"><span>${escapeHtml(filename)}</span><span class="progress-file-size">${payload.rows.length} row(s)</span></div>`;
                    overlay.querySelector('.progress-modal-footer').innerHTML = `
                        <button class="export-btn-export" type="button" id="exportDownload">Download</button>
                        <button class="export-btn-cancel" type="button" id="exportClose">Close</button>
                    `;
                    overlay.querySelector('#exportClose').addEventListener('click', () => overlay.remove());
                    overlay.querySelector('#exportDownload').addEventListener('click', () => runExport(payload, filename));
                }, 600);
            }
        }, 700);
    }

    function runExport(payload, filename) {
        const { format, rows, columns, title } = payload;
        const headers = columns.map(c => c.label);
        const dataRows = rows.map(row => columns.map(c => c.value(row)));

        if (format === 'excel') {
            const blob = new Blob([csvRows(headers, dataRows)], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.download = filename;
            link.click();
            URL.revokeObjectURL(url);
            toast('Excel (CSV) export downloaded.');
            return;
        }

        // PDF: open a print-ready sheet; the browser's "Save as PDF" writes the file.
        const win = window.open('', '_blank');
        if (!win) { toast('Allow pop-ups to export as PDF.', 'error'); return; }
        const head = headers.map(h => `<th>${escapeHtml(h)}</th>`).join('');
        const body = rows.map(row => `<tr>${columns.map(c => {
            const raw = c.value(row);
            return `<td>${escapeHtml(c.key === 'salary' ? peso(raw) : raw)}</td>`;
        }).join('')}</tr>`).join('');
        win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(filename)}</title>
            <style>
                body { font-family: Arial, Helvetica, sans-serif; padding: 32px; color: #222; }
                h1 { font-size: 20px; margin: 0 0 4px; }
                p.sub { margin: 0 0 20px; color: #777; font-size: 12px; }
                table { width: 100%; border-collapse: collapse; font-size: 12px; }
                thead th { background: #c2181a; color: #fff; text-align: left; padding: 9px 12px; }
                tbody td { padding: 8px 12px; border-bottom: 1px solid #e5e5e5; }
                tbody tr:nth-child(even) td { background: #fafafa; }
            </style></head><body>
            <h1>${escapeHtml(title)}</h1>
            <p class="sub">DEVS HR &middot; Generated ${escapeHtml(todayDateString())}</p>
            <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
        </body></html>`);
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 350);
    }

    function attachExportHandlers() {
        document.querySelectorAll('[data-export]').forEach(button => {
            button.addEventListener('click', () => {
                openExportModal(button.dataset.export);
            });
        });
    }

    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

    function buildSearchableSelect(select) {
        if (select.dataset.ssUpgraded === 'true') return;
        if (select.dataset.noSearch === 'true') return;
        if (select.closest('.toolbar, .fin-filters-card, .expense-records-card')) return;
        if (!select.closest('.modal-body, .modal-split-right, [data-upgrade-selects]')) return;
        const options = Array.from(select.options);
        if (!options.length) return;
        select.dataset.ssUpgraded = 'true';
        let next = select.nextElementSibling;
        while (next && next.classList.contains('ss-wrap')) { const stale = next; next = next.nextElementSibling; stale.remove(); }
        const wrap = document.createElement('div');
        wrap.className = 'ss-wrap';
        wrap.dataset.ssFor = select.id || '';
        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'ss-trigger';
        trigger.setAttribute('aria-haspopup', 'listbox');
        trigger.setAttribute('aria-expanded', 'false');
        const triggerLabel = document.createElement('span');
        triggerLabel.className = 'ss-trigger-label';
        const triggerArrow = document.createElement('span');
        triggerArrow.className = 'ss-trigger-arrow';
        triggerArrow.setAttribute('aria-hidden', 'true');
        triggerArrow.textContent = '▾';
        trigger.appendChild(triggerLabel);
        trigger.appendChild(triggerArrow);
        const panel = document.createElement('div');
        panel.className = 'ss-panel';
        panel.setAttribute('role', 'listbox');
        panel.hidden = true;
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'ss-search';
        searchInput.placeholder = 'Type to search…';
        searchInput.autocomplete = 'off';
        searchInput.spellcheck = false;
        const list = document.createElement('div');
        list.className = 'ss-list';
        const empty = document.createElement('div');
        empty.className = 'ss-empty';
        empty.textContent = 'No results';
        panel.appendChild(searchInput);
        panel.appendChild(list);
        panel.appendChild(empty);
        wrap.appendChild(trigger);
        wrap.appendChild(panel);
        if (!select.parentNode) return;
        select.parentNode.insertBefore(wrap, select.nextSibling);
        select.classList.add('ss-native-hidden');
        // Keep the real <select> only as a value store for the custom panel.
        // It must never receive pointer/keyboard activation, including the
        // synthetic click a wrapping <label> forwards to its control.
        select.tabIndex = -1;
        select.setAttribute('aria-hidden', 'true');
        const blockNativeSelect = (e) => e.preventDefault();
        select.addEventListener('mousedown', blockNativeSelect);
        select.addEventListener('click', blockNativeSelect);
        const currentOption = () => options.find(o => o.value === select.value) || options[0];
        const renderTrigger = () => {
            const cur = currentOption();
            const text = (cur && cur.value !== '') ? cur.textContent.trim() : (cur ? cur.textContent.trim() : '');
            triggerLabel.textContent = text || 'Select…';
            triggerLabel.classList.toggle('is-placeholder', !select.value);
        };
        let filtered = options.slice();
        const renderList = () => {
            list.innerHTML = '';
            let visible = 0;
            filtered.forEach((opt) => {
                const item = document.createElement('div');
                item.className = 'ss-option';
                item.dataset.value = opt.value;
                item.setAttribute('role', 'option');
                if (opt.value === select.value) item.classList.add('is-selected');
                if (opt.disabled) item.classList.add('is-disabled');
                item.textContent = opt.textContent.trim();
                item.addEventListener('click', () => { if (opt.disabled) return; commit(opt.value); });
                list.appendChild(item);
                visible++;
            });
            empty.hidden = visible !== 0;
        };
        const filter = (q) => {
            const term = String(q || '').trim().toLowerCase();
            filtered = !term ? options.slice() : options.filter(o => o.textContent.toLowerCase().includes(term) || String(o.value).toLowerCase().includes(term));
            renderList();
        };
        const open = () => {
            if (!panel.hidden) return;
            $$('.ss-panel:not([hidden])').forEach(p => { if (p !== panel) { p.hidden = true; p.previousElementSibling?.setAttribute('aria-expanded', 'false'); } });
            panel.hidden = false;
            trigger.setAttribute('aria-expanded', 'true');
            searchInput.value = '';
            filter('');
            requestAnimationFrame(() => searchInput.focus());
        };
        const close = () => { if (panel.hidden) return; panel.hidden = true; trigger.setAttribute('aria-expanded', 'false'); };
        const commit = (value) => {
            select.value = value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            renderTrigger();
            close();
            trigger.focus();
        };
        let readyForClicks = false;
        requestAnimationFrame(() => requestAnimationFrame(() => { readyForClicks = true; }));
        trigger.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); if (!readyForClicks) return; if (panel.hidden) open(); else close(); });
        searchInput.addEventListener('input', () => filter(searchInput.value));
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') { e.preventDefault(); close(); trigger.focus(); }
            if (e.key === 'Enter') { e.preventDefault(); const first = list.querySelector('.ss-option:not(.is-disabled)'); if (first) commit(first.dataset.value); }
        });
        document.addEventListener('pointerdown', (e) => { if (panel.hidden) return; if (!wrap.contains(e.target)) close(); });
        select.addEventListener('change', renderTrigger);
        renderTrigger();
        renderList();
        panel.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
        void panel.offsetHeight;
    }

    function upgradeSelectsIn(root) {
        if (!root) return;
        if (root.matches && root.matches('select')) buildSearchableSelect(root);
        if (root.querySelectorAll) root.querySelectorAll('select').forEach(buildSearchableSelect);
    }

    const ssObserver = new MutationObserver((mutations) => {
        mutations.forEach(m => {
            m.addedNodes.forEach(node => {
                if (node.nodeType !== 1) return;
                if (node.matches?.('.modal-body, .modal-split-right')) upgradeSelectsIn(node);
                else if (node.querySelector) node.querySelectorAll('.modal-body, .modal-split-right').forEach(upgradeSelectsIn);
            });
        });
    });
    ssObserver.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        const input = event.target.closest('input.picker-input') || event.target.closest('.form-field')?.querySelector('input.picker-input');
        if (!input || typeof input.showPicker !== 'function') return;
        if (event.target === input && event.offsetX >= input.clientWidth - 40) return;
        event.preventDefault();
        input.focus();
        try { input.showPicker(); } catch {}
    });

    const initials = (name) => String(name || '').split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '??';
    const peso = (n) => '₱' + Number(n || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 });
    const escapeHtml = (str) => String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const displayValue = (value) => value && value !== '\u2014' ? value : 'Not recorded';
    const nextId = (prefix, list, pad = 3) => {
        const max = list.reduce((m, item) => {
            const n = parseInt(String(item.id).split('-')[1], 10);
            return isNaN(n) ? m : Math.max(m, n);
        }, 0);
        return `${prefix}-${String(max + 1).padStart(pad, '0')}`;
    };
    const throttle = (fn, wait = 250) => {
        let last = 0, timer = null;
        return function (...args) {
            const now = Date.now();
            const remaining = wait - (now - last);
            if (remaining <= 0) { clearTimeout(timer); timer = null; last = now; fn.apply(this, args); }
            else if (!timer) { timer = setTimeout(() => { last = Date.now(); timer = null; fn.apply(this, args); }, remaining); }
        };
    };
    const lockElement = (element, delay = 350) => {
        if (!element) return false;
        if (element.dataset.uiLocked === 'true') return false;
        element.dataset.uiLocked = 'true';
        if (typeof element.disabled !== 'undefined') element.disabled = true;
        setTimeout(() => { delete element.dataset.uiLocked; if (typeof element.disabled !== 'undefined') element.disabled = false; }, delay);
        return true;
    };
    const calcDays = (from, to) => {
        if (!from || !to) return 0;
        const a = new Date(from), b = new Date(to);
        if (isNaN(a) || isNaN(b) || b < a) return 0;
        return Math.floor((b - a) / 86400000) + 1;
    };
    function empById(id) { return store.employees.find(e => String(e.id) === String(id)); }
    function recordEmployeeName(record) { return empById(record.empId)?.name || record.employeeName || record.empId; }

    /* Every HR search bar matches IDs in every form the pages display:
       plain (26), zero-padded (00026 / 026) and EMP- prefixed (EMP-026).
       Passing a value through here also covers the employee's empNo. */
    function idSearchText(...values) {
        const parts = [];
        values.forEach(value => {
            if (value === null || value === undefined) return;
            const raw = String(value).trim();
            if (!raw) return;
            parts.push(raw);
            const digits = raw.replace(/^emp[-\s]*/i, '');
            if (/^\d+$/.test(digits)) {
                parts.push(
                    String(Number(digits)),
                    digits.padStart(5, '0'),
                    digits.padStart(3, '0'),
                    `emp-${String(Number(digits))}`,
                    `emp-${digits.padStart(3, '0')}`,
                    `pay-${String(Number(digits))}`,
                    `pay-${digits.padStart(4, '0')}`
                );
            }
        });
        return parts.join(' ').toLowerCase();
    }
    function matchesSearch(q, ...values) {
        return !q || idSearchText(...values).includes(String(q).trim().toLowerCase());
    }
    applyLeavePayrollRule();

    const pillClass = (status) => {
        const s = String(status).toLowerCase();
        if (['active', 'present', 'approved', 'processed', 'posted', 'paid', 'ready', 'credit'].includes(s)) return 'success';
        if (['pending', 'late', 'review', 'for review', 'due', 'on hold', 'debit'].includes(s)) return 'warning';
        if (['open', 'on leave', 'scheduled'].includes(s)) return 'info';
        if (['overdue', 'rejected', 'terminated'].includes(s)) return 'danger';
        return 'neutral';
    };

    const toastStack = $('#toastStack');
    function toast(message, type = 'success') {
        if (!toastStack) return;
        while (toastStack.children.length >= 5) toastStack.removeChild(toastStack.firstChild);
        const icons = { success: '✓', error: '✕', info: 'ⓘ' };
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.innerHTML = `<span class="toast-icon">${icons[type] || '✓'}</span><span>${escapeHtml(message)}</span>`;
        toastStack.appendChild(el);
        setTimeout(() => {
            if (!el.parentNode) return;
            el.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
            el.style.opacity = '0';
            el.style.transform = 'translateX(20px)';
            setTimeout(() => el.remove(), 260);
        }, 2600);
    }

    const modalBackdrop = $('#modalBackdrop');
    const modalTitle = $('#modalTitle');
    const modalBody = $('#modalBody');
    const modalClose = $('#modalClose');
    let modalOnCancel = null, modalOnSubmit = null, modalExtraClick = null;

    function openModal({ title, body, size = '', onCancel = null, onSubmit = null, onExtraClick = null }) {
        modalTitle.textContent = title;
        modalBody.innerHTML = body;
        const modalEl = $('#modal');
        modalEl.className = 'modal' + (size ? ` modal-${size}` : '');
        modalEl.classList.remove('modal-split', 'signup-modal');
        modalBackdrop.classList.add('open');
        modalBackdrop.setAttribute('aria-hidden', 'false');
        modalEl.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        document.body.classList.add('modal-open');
        modalOnCancel = onCancel;
        modalOnSubmit = onSubmit;
        modalExtraClick = onExtraClick;
        upgradeSelectsIn(modalBody);
    }
    function closeModal() {
        modalBackdrop.classList.remove('open');
        modalBackdrop.setAttribute('aria-hidden', 'true');
        const modalEl = $('#modal');
        if (modalEl) { modalEl.classList.remove('modal-split', 'signup-modal'); modalEl.setAttribute('aria-hidden', 'true'); }
        document.body.style.overflow = '';
        document.body.classList.remove('modal-open');
        modalBody.innerHTML = '';
        modalOnCancel = null;
        modalOnSubmit = null;
        modalExtraClick = null;
    }

    modalBody.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-act]');
        if (!btn) return;
        const act = btn.dataset.act;
        if (typeof modalExtraClick === 'function' && modalExtraClick(e)) return;
        if (act === 'cancel' || act === 'close') {
            if (typeof modalOnCancel === 'function') modalOnCancel();
            else closeModal();
        }
    });
    modalBody.addEventListener('submit', (e) => {
        if (!e.target.matches('form')) return;
        e.preventDefault();
        if (typeof modalOnSubmit === 'function') modalOnSubmit(e.target);
    });
    modalClose.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', (e) => { if (e.target === modalBackdrop) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modalBackdrop.classList.contains('open')) closeModal(); });

    function confirmDialog({ title, message, confirmLabel = 'Confirm', danger = false }) {
        return new Promise((resolve) => {
            let settled = false;
            const finish = (value) => { if (settled) return; settled = true; closeModal(); resolve(value); };
            openModal({
                title, size: 'sm',
                onCancel: () => finish(false),
                onExtraClick: (e) => {
                    const btn = e.target.closest('[data-act]');
                    if (!btn) return false;
                    if (btn.dataset.act === 'confirm') { finish(true); return true; }
                    return false;
                },
                body: `
                    <p style="margin:0 0 20px;color:#555;font-size:13.5px;line-height:1.5;">${escapeHtml(message)}</p>
                    <div class="form-actions" style="margin-top:0;padding-top:0;border-top:none;">
                        <button class="btn btn-subtle" type="button" data-act="cancel">Cancel</button>
                        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" type="button" data-act="confirm">${confirmLabel}</button>
                    </div>
                `
            });
        });
    }

    const pageTitle = $('#pageTitle');
    const pageSubtitle = $('#pageSubtitle');
    const dashboardPanel = $('#dashboardPanel');

    function buildWorkInProgress() {
        return `
            <section class="wip-panel">
                <div class="wip-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                </div>
                <h2>Work in Progress</h2>
                <p>This module is being reworked.</p>
            </section>
        `;
    }

    const hrPages = {
        employees:  { title: 'Employees Master',   subtitle: 'Manage employee records and workforce status.', build: buildEmployees },
        attendance: { title: 'Attendance',         subtitle: 'Track daily time-in and time-out entries.', build: buildAttendance },
        leave:      { title: 'Leave Requests',     subtitle: 'Review and manage employee leave requests.', build: buildLeave },
        payroll:    { title: 'Payroll',            subtitle: 'Monitor compensation and payroll records.', build: buildPayroll },
        payrollHistory: { title: 'Payroll History', subtitle: 'Search and review previous payroll records.', build: buildPayrollHistory },
        accountManagement: { title: 'Account Management', subtitle: 'Manage all user accounts across departments.', build: buildAccountManagement },
        contribution:{ title: 'Contribution',      subtitle: 'SSS, PhilHealth, and Pag-IBIG contributions.', build: buildContribution },
        '13thmonth':{ title: '13th Month Pay',     subtitle: 'Year-end bonus records.', build: build13thMonth },
        support:    { title: 'Support',            subtitle: 'Help and assistance.', build: buildSupport },
        settings:   { title: 'Settings',           subtitle: 'Configure your HRIS preferences.', build: buildSettings },
        auditTrail: { title: 'Audit Trail',        subtitle: 'Review system activity and user actions.', build: buildAuditTrail },
        logout:     { title: 'Logout',             subtitle: 'Sign out of your account.', build: buildLogout },
        deductions: { title: 'Deductions', subtitle: 'Manage employee salary deductions and contributions.', build: buildDeductions },
        pageAccess: { title: 'User Permission', subtitle: 'Control which pages each user can see.', build: buildPageAccessManager },
        notifications: { title: 'Notifications', subtitle: 'All change notifications in one place.', build: buildNotificationsPage },
        noAccess:   { title: 'No Access', subtitle: 'Your account has no pages assigned.', build: buildNoAccessScreen }
    };

    const pages = {
        dashboard: { title: 'HR Dashboard', subtitle: 'HR activity snapshot for today.', build: buildDashboard },
        ...hrPages
    };

    let isRendering = false;
    let pendingPage = null;

    function renderPage(page) {
        if (page === 'pageAccess' && !isHrAdmin()) {
            confirmDialog({ title: 'Access Restricted', message: 'This page is only available to HR Administrators.', confirmLabel: 'OK', danger: true });
            page = 'dashboard';
        }
        if (page !== 'logout' && !canAccessPage(page)) {
            confirmDialog({ title: 'Access Denied', message: 'Your account does not have permission to access this page. Please contact your HR Administrator.', confirmLabel: 'OK', danger: true });
            page = canAccessPage('dashboard') ? 'dashboard' : 'noAccess';
        }
        const targetPage = pages[page] ? page : 'dashboard';
        if (isRendering) { pendingPage = targetPage; return; }
        isRendering = true;
        requestAnimationFrame(() => {
            try {
                const cfg = pages[targetPage] || pages.dashboard;
                if (pageTitle) pageTitle.textContent = cfg.title;
                if (pageSubtitle) pageSubtitle.textContent = cfg.subtitle;
                dashboardPanel.innerHTML = cfg.build();
                attachPageHandlers(targetPage);
            } finally {
                isRendering = false;
                if (pendingPage && pendingPage !== targetPage) {
                    const nextPage = pendingPage; pendingPage = null; renderPage(nextPage);
                } else pendingPage = null;
            }
        });
    }

    function markNavActive(page) {
        $$('.nav-item').forEach(link => link.classList.toggle('active', link.dataset.page === page));
    }

    /* ============ PAGE BUILDERS ============ */

    function hrSilhouetteAvatar() {
        return `<span class="leave-avatar" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4Zm0 2.1c-3.6 0-7.4 1.9-7.4 4.6v1.7h14.8v-1.7c0-2.7-3.8-4.6-7.4-4.6Z"/></svg></span>`;
    }

    function buildDashboard() {
        dashEmpCurrentPage = 1;
        const today = todayDateString();
        const totalEmp = store.employees.length;

        // Prefer today's attendance; fall back to all records when there is
        // no entry dated today so the dashboard never shows empty numbers.
        const todaysAtt = store.attendance.filter(a => a.date === today);
        const att = todaysAtt.length ? todaysAtt : store.attendance;

        const presentToday  = att.filter(a => a.status === 'Present').length;
        const absentToday   = Math.max(0, totalEmp - att.filter(a => a.timeIn).length);
        const lateToday     = att.filter(a => a.status === 'Late').length;
        const pendingLeaves = store.leaves.filter(l => l.status === 'Pending');

        // --- Stat cards (Finance fin-stat-card style, tinted icon chips) ---
        const stats = [
            { label: 'Total Employees', value: totalEmp, key: 'employees', chip: 'chip-blue',
              icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M21 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' },
            { label: 'Present Today',   value: presentToday,  key: 'present', chip: 'chip-green',
              icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/><path d="m9 15 2 2 4-4"/></svg>' },
            { label: 'Absent',          value: absentToday,   key: 'absent', chip: 'chip-red',
              icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M17 8l4 4M21 8l-4 4"/></svg>' },
            { label: 'Late',            value: lateToday,     key: 'late', chip: 'chip-amber',
              icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>' }
        ];

        // --- Current payroll composition: grouped by department ---
        // The donut and legend now summarise net pay per department instead of
        // per employee/account. Departments with no payroll are still listed
        // as "No payroll yet", and clicking one opens a payroll breakdown.
        const DONUT_COLORS = ['#c8102e', '#f5a623', '#3b6fe0', '#2eae7d', '#8a5cd6', '#e07b39', '#3fb8c9'];
        const netOfPayroll = p => Number(p.net) || ((Number(p.gross) || 0) - (Number(p.deductions) || 0));
        const deptNames = [...new Set(store.employees.map(e => e.dept || 'Unassigned'))]
            .sort((a, b) => String(a).localeCompare(String(b)));
        const netByDept = new Map();
        const deptWithPayroll = new Set();
        const empIdsWithPayroll = new Set();
        store.payroll.forEach(p => {
            empIdsWithPayroll.add(String(p.empId));
            const dept = empById(p.empId)?.dept || 'Unassigned';
            netByDept.set(dept, (netByDept.get(dept) || 0) + netOfPayroll(p));
            deptWithPayroll.add(dept);
        });
        const payrollByDept = deptNames.map(dept => ({
            dept,
            net: netByDept.get(dept) || 0,
            employees: store.employees.filter(e => (e.dept || 'Unassigned') === dept).length,
            hasPayroll: deptWithPayroll.has(dept)
        })).sort((a, b) => (b.net - a.net) || String(a.dept).localeCompare(String(b.dept)));
        // "Employees on Payroll" stays a headcount, not a department grouping,
        // so it is derived from the payroll records directly.
        const employeesOnPayroll = store.employees.filter(e => empIdsWithPayroll.has(String(e.id))).length;

        // --- Payroll summary stats (donut + footer share the same total) ---
        const totalPayroll        = [...netByDept.values()].reduce((s, n) => s + n, 0);
        const pendingPayroll      = store.payroll.filter(p => /pending|progress/i.test(p.status || '')).length;
        const departmentsOnPayroll = deptWithPayroll.size;

        // Donut geometry — departments with net pay become stroke-dasharray slices
        const DONUT_R = 70, DONUT_CIRC = 2 * Math.PI * DONUT_R;
        const donutTotal = totalPayroll > 0 ? totalPayroll : 0;
        const paidSegs = payrollByDept.filter(d => d.net > 0);
        let donutAcc = 0;
        const donutSegs = paidSegs.map((d, i) => {
            const startLen = DONUT_CIRC * (donutAcc / (donutTotal || 1));
            donutAcc += d.net;
            let segLen = DONUT_CIRC * (d.net / (donutTotal || 1));
            if (paidSegs.length > 1) segLen = Math.max(0, segLen - 4); /* small gap between slices */
            const pctRaw = donutTotal > 0 ? (d.net / donutTotal) * 100 : 0;
            return {
                ...d,
                color: DONUT_COLORS[i % DONUT_COLORS.length],
                pct: Number(pctRaw.toFixed(1)).toString().replace(/\.0$/, ''),
                startLen, segLen
            };
        });
        const colorByDept = new Map(donutSegs.map(s => [s.dept, s.color]));

        return `
            <!-- Stat cards row (Finance style) -->
            <div class="fin-stat-grid">
                ${stats.map(s => `
                    <div class="fin-stat-card ${s.chip}">
                        <div class="fin-stat-head">
                            <span class="fin-stat-icon">${s.icon}</span>
                            <span class="fin-stat-label">${s.label}</span>
                        </div>
                        <div class="fin-stat-value is-dark">${s.value}</div>
                    </div>
                `).join('')}
            </div>

            <!-- Pending Leave + Employees on Payroll count cards -->
            <div class="fin-stat-grid-secondary hr-leave-secondary-grid">
                <div class="fin-stat-card is-pending">
                    <div class="fin-stat-head">
                        <span class="fin-stat-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.5 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3.5"/><path d="M8 2v4M16 2v4"/><circle cx="17" cy="17" r="4"/><path d="M17 15.5V17l1.2.8"/></svg>
                        </span>
                        <span class="fin-stat-label" style="color:#f5a623;">Pending Leave Requests</span>
                    </div>
                    <div class="fin-stat-value is-dark" style="font-size:34px;font-weight:900;">${pendingLeaves.length}</div>
                </div>
                <div class="fin-stat-card is-paid">
                    <div class="fin-stat-head">
                        <span class="fin-stat-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="12" cy="14.5" r="2.2"/></svg>
                        </span>
                        <span class="fin-stat-label" style="color:#1f9c50;">Employees on Payroll</span>
                    </div>
                    <div class="fin-stat-value is-dark" style="font-size:34px;font-weight:900;">${employeesOnPayroll}</div>
                </div>
            </div>

            <!-- Employees Master List (full width) -->
            <section class="dash-card hr-emp-list-card">
                <header class="hr-dash-card-head">
                    <h3 class="dash-card-title" style="padding:0;margin:0;">Employees Master List</h3>
                    <div class="hr-mini-search">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
                        <input type="search" id="hrDashEmpSearch" placeholder="Search..." />
                    </div>
                </header>
                <div class="table-wrap">
                <table class="dash-table">
                    <thead><tr><th>Employee ID</th><th style="text-align:left">Name</th><th style="text-align:left">Department</th><th style="text-align:left">Position</th><th style="text-align:left">Status</th></tr></thead>
                    <tbody id="hrDashEmpTbody"></tbody>
                </table>
                </div>
                <footer class="coa-pagination hr-dash-pagination" id="hrDashEmpPagination"></footer>
            </section>

            <!-- Current Payroll (Finance fin-summary-panel style) -->
            <section class="fin-summary-panel">
                <header class="fin-summary-header">
                    <div class="fin-summary-title">
                        <div class="fin-summary-icon">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
                        </div>
                        <div>
                            <h3>Current Payroll</h3>
                            <p>Period: ${escapeHtml(store.settings?.cycle || currentPayrollCycle())} &nbsp;·&nbsp; Status: In Progress &nbsp;·&nbsp; Release: Oct 01, 2026</p>
                        </div>
                    </div>
                </header>

                <div class="fin-summary-chart-wrap">
                    ${donutSegs.length ? `
                    <div class="hr-payroll-donut-wrap">
                        <div class="hr-payroll-donut">
                            <svg viewBox="0 0 200 200" role="img" aria-label="Net pay distribution by department">
                                <circle class="hr-donut-track" cx="100" cy="100" r="70" />
                                ${donutSegs.map(s => `<circle class="hr-donut-slice" data-pd-dept="${escapeHtml(s.dept)}" cx="100" cy="100" r="70" fill="none" stroke="${s.color}" stroke-width="26" stroke-dasharray="${s.segLen.toFixed(2)} ${(DONUT_CIRC - s.segLen).toFixed(2)}" stroke-dashoffset="${(-s.startLen).toFixed(2)}" transform="rotate(-90 100 100)" />`).join('')}
                            </svg>
                            <div class="hr-donut-center">
                                <span>Total Net Pay</span>
                                <strong>₱${totalPayroll.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                            </div>
                        </div>
                        <ul class="hr-donut-legend" id="hrPayrollDonutLegend">
                            ${payrollByDept.map(d => {
                                const color = colorByDept.get(d.dept) || '#cdbcbc';
                                const pct = donutTotal > 0 && d.net > 0
                                    ? `<em>${Number(((d.net / donutTotal) * 100).toFixed(1)).toString().replace(/\.0$/, '')}%</em>`
                                    : '';
                                return `
                                <li data-pd-dept="${escapeHtml(d.dept)}" title="View ${escapeHtml(d.dept)} payroll breakdown" class="${d.hasPayroll ? '' : 'is-empty'}">
                                    <span class="hr-donut-dot" style="background:${color};"></span>
                                    <div class="hr-donut-legend-text">
                                        <span>${escapeHtml(d.dept)}<small class="hr-donut-dept-count">${d.employees} employee${d.employees === 1 ? '' : 's'}</small></span>
                                        ${d.hasPayroll
                                            ? `<strong>₱${d.net.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${pct}</strong>`
                                            : `<strong class="hr-donut-none">No payroll yet</strong>`}
                                    </div>
                                    <svg class="hr-donut-legend-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                                </li>`;
                            }).join('')}
                        </ul>
                    </div>` : `
                    <div class="hr-payroll-empty">
                        <div class="empty-icon">◌</div>
                        <strong>No payroll records yet</strong>
                        <p>Net pay distribution will appear here once payroll is generated.</p>
                    </div>`}
                </div>

                <footer class="fin-summary-footer">
                    <div class="fin-summary-stat">
                        <div class="fin-summary-stat-icon">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="7" height="7" rx="1"/><rect x="14" y="4" width="7" height="7" rx="1"/><rect x="3" y="15" width="7" height="5" rx="1"/><rect x="14" y="15" width="7" height="5" rx="1"/></svg>
                        </div>
                        <div>
                            <span>Departments on Payroll</span>
                            <strong>${departmentsOnPayroll}</strong>
                        </div>
                    </div>
                    <div class="fin-summary-stat">
                        <div class="fin-summary-stat-icon">₱</div>
                        <div>
                            <span>Total Net Pay</span>
                            <strong>₱${totalPayroll.toLocaleString('en-PH')}</strong>
                        </div>
                    </div>
                    <div class="fin-summary-stat">
                        <div class="fin-summary-stat-icon">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                        </div>
                        <div>
                            <span>Pending Payroll</span>
                            <strong>${pendingPayroll}</strong>
                        </div>
                    </div>
                </footer>
            </section>
        `;
    }

    /* Opens a department's payroll breakdown — launched from the dashboard
       payroll donut legend/slices. Individual employees are listed as rows so
       the headline view stays department-based rather than per account. */
    function openPayrollDeptModal(dept) {
        const emps = store.employees.filter(e => (e.dept || 'Unassigned') === dept);
        const empIds = new Set(emps.map(e => String(e.id)));
        const recs = store.payroll
            .filter(p => empIds.has(String(p.empId)))
            .slice()
            .sort((a, b) => String(b.payroll_period || b.cycle || '').localeCompare(String(a.payroll_period || a.cycle || ''))
                || String(empById(a.empId)?.name || '').localeCompare(String(empById(b.empId)?.name || '')));
        const totalNet = recs.reduce(
            (s, p) => s + (Number(p.net) || ((Number(p.gross) || 0) - (Number(p.deductions) || 0))), 0);

        const rows = recs.map(p => {
            const emp = empById(p.empId);
            const gross = Number(p.gross_salary !== undefined ? p.gross_salary : p.gross) || 0;
            const net = Number(p.net) || (gross - (Number(p.deductions) || 0));
            return `
                <tr>
                    <td>${escapeHtml(emp?.name || `Employee ${p.empId}`)}</td>
                    <td><strong style="font-family:monospace;color:#555;">${escapeHtml(p.id || '—')}</strong></td>
                    <td>${escapeHtml(p.payroll_period || p.cycle || '—')}</td>
                    <td>${peso(gross)}</td>
                    <td>-${peso(Number(p.deductions) || 0)}</td>
                    <td><strong>${peso(net)}</strong></td>
                    <td><span class="status-text ${statusClassForPayroll(p.status)}">${escapeHtml(p.status || '—')}</span></td>
                </tr>`;
        }).join('');

        openModal({
            title: `${dept} — Payroll Breakdown`,
            size: 'lg',
            onCancel: closeModal,
            body: `
                <div class="pd-modal">
                    <div class="pd-emp-head">
                        <div class="cell-avatar pd-emp-avatar" style="background:#3b6fe0;">${initials(dept)}</div>
                        <div class="pd-emp-meta">
                            <strong>${escapeHtml(dept)}</strong>
                            <span>${emps.length} employee${emps.length === 1 ? '' : 's'} · ${recs.length} payroll record${recs.length === 1 ? '' : 's'}</span>
                        </div>
                    </div>
                    <div class="table-wrap">
                        <table class="data-table">
                            <thead><tr><th>Employee</th><th>Payroll ID</th><th>Period</th><th>Gross</th><th>Deductions</th><th>Net Pay</th><th>Status</th></tr></thead>
                            <tbody>${rows || '<tr><td colspan="7"><div class="empty-state"><p>No payroll records yet for this department.</p></div></td></tr>'}</tbody>
                        </table>
                    </div>
                    <div class="pd-modal-total">
                        <span>Total Net Pay</span>
                        <strong>₱${totalNet.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </div>
                </div>`
        });
    }

    let dashEmpCurrentPage = 1;
    const DASH_EMP_ROWS_PER_PAGE = 7;

    function filteredDashEmployees() {
        const q = ($('#hrDashEmpSearch')?.value || '').trim().toLowerCase();
        return store.employees.filter(e =>
            matchesSearch(q, e.id, e.empNo, e.name, e.dept, e.position)
        );
    }

    function renderDashEmpRows() {
        const tbody = $('#hrDashEmpTbody');
        if (!tbody) return;
        const rows = filteredDashEmployees();
        const totalPages = Math.max(1, Math.ceil(rows.length / DASH_EMP_ROWS_PER_PAGE));
        if (dashEmpCurrentPage > totalPages) dashEmpCurrentPage = totalPages;
        const start = (dashEmpCurrentPage - 1) * DASH_EMP_ROWS_PER_PAGE;
        const pageRows = rows.slice(start, start + DASH_EMP_ROWS_PER_PAGE);

        tbody.innerHTML = pageRows.map(e => {
            const st = (e.status || 'Active');
            const stCls = /active/i.test(st) ? 'is-paid' : /leave/i.test(st) ? 'is-fulfilling' : 'is-overdue';
            return `
            <tr>
                <td><strong style="font-size:12px;color:#555;font-family:monospace;">${escapeHtml(String(e.id))}</strong></td>
                <td style="text-align:left">${escapeHtml(e.name)}</td>
                <td style="text-align:left">${escapeHtml(e.dept)}</td>
                <td style="text-align:left">${escapeHtml(e.position || 'Staff')}</td>
                <td style="text-align:left"><span class="status-text ${stCls}">${escapeHtml(st)}</span></td>
            </tr>`;
        }).join('') || '<tr><td colspan="5" style="text-align:center;color:#888;padding:20px;">No employees found.</td></tr>';

        renderDashEmpPagination(rows.length, totalPages);
    }

    function renderDashEmpPagination(totalRows, totalPages) {
        const wrap = $('#hrDashEmpPagination');
        if (!wrap) return;
        if (!totalRows) { wrap.innerHTML = ''; return; }

        const startPage = totalPages <= 3 ? 1 : Math.min(Math.max(1, dashEmpCurrentPage - 1), totalPages - 2);
        const pages = Array.from({ length: Math.min(3, totalPages) }, (_, index) => startPage + index);
        const atFirst = dashEmpCurrentPage <= 1;
        const atLast  = dashEmpCurrentPage >= totalPages;
        const firstRow = (dashEmpCurrentPage - 1) * DASH_EMP_ROWS_PER_PAGE + 1;
        const lastRow = Math.min(firstRow + DASH_EMP_ROWS_PER_PAGE - 1, totalRows);

        wrap.innerHTML = `
            <span class="hr-dash-page-info">Showing ${firstRow}–${lastRow} of ${totalRows}</span>
            <button type="button" class="coa-page-btn" data-page="prev" aria-label="Previous page" ${atFirst ? 'disabled' : ''}>&lt;</button>
            ${pages.map(page => `<button type="button" class="coa-page-btn ${page === dashEmpCurrentPage ? 'is-active' : ''}" data-page="${page}">${page}</button>`).join('')}
            <button type="button" class="coa-page-btn" data-page="next" aria-label="Next page" ${atLast ? 'disabled' : ''}>&gt;</button>
            ${totalPages > 3 ? `<details class="coa-page-menu"><summary>Select Page</summary><div class="coa-page-options">${Array.from({ length: totalPages }, (_, index) => `<button type="button" class="coa-page-option" data-page="${index + 1}">${index + 1}</button>`).join('')}</div></details>` : ''}
        `;
    }

    function handleDashEmpPagination(e) {
        const btn = e.target.closest('.coa-page-btn, .coa-page-option');
        if (!btn || btn.disabled) return;
        const totalPages = Math.max(1, Math.ceil(filteredDashEmployees().length / DASH_EMP_ROWS_PER_PAGE));
        const target = btn.dataset.page;
        if (target === 'prev') dashEmpCurrentPage = Math.max(1, dashEmpCurrentPage - 1);
        else if (target === 'next') dashEmpCurrentPage = Math.min(totalPages, dashEmpCurrentPage + 1);
        else dashEmpCurrentPage = Number(target) || 1;
        renderDashEmpRows();
    }

    let empCurrentPage = 1;
    const EMP_ROWS_PER_PAGE = 7;
    let empDropdownOutsideBound = false;

    function buildEmployees() {
        empCurrentPage = 1;
        return `
            <div class="emp-page-header">
                <h2 class="emp-page-title">Employees Master List</h2>
                <button class="coa-export-top-btn" type="button" data-export="employees">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/></svg>
                    Export PDF / Excel
                </button>
            </div>

            <section class="coa-card">
                <header class="coa-card-head">
                    <h3 class="coa-card-title">EMPLOYEE LIST</h3>
                    <div class="coa-toolbar">
                        <div class="coa-search-box">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#888" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
                            <input type="search" placeholder="Search..." id="empSearch" />
                        </div>
                        <div class="custom-filter-dropdown" data-id="empStatusFilter">
                            <button type="button" class="custom-filter-btn" data-value="" style="height: 32px; min-width: 120px; font-size: 13px;">
                                <span class="cfb-text">Select Status</span>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
                            </button>
                            <ul class="custom-filter-menu">
                                <li data-value="">All</li>
                                <li data-value="Active">Active</li>
                                <li data-value="On Leave">On Leave</li>
                            </ul>
                        </div>
                    </div>
                </header>

                <div class="table-wrap coa-table-scroll">
                    <table class="coa-table">
                        <thead>
                            <tr>
                                <th>Employee ID</th>
                                <th>Name</th>
                                <th>Department</th>
                                <th>Position</th>
                                <th>Status</th>
                                <th>Basic ₱</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody id="empTbody"></tbody>
                    </table>
                </div>

                <footer class="coa-pagination" id="empPagination"></footer>
            </section>
        `;
    }

    function employeeFilterState() {
        return {
            q: ($('#empSearch')?.value || '').trim().toLowerCase(),
            status: $('.custom-filter-dropdown[data-id="empStatusFilter"] .custom-filter-btn')?.dataset.value || ''
        };
    }

    function visibleEmployees() {
        const { q, status } = employeeFilterState();
        return store.employees.filter(e => {
            const matchesQ = matchesSearch(q, e.name, e.id, e.empNo, e.position, e.email, e.dept);
            const matchesS = !status || e.status === status;
            return matchesQ && matchesS;
        });
    }

    function renderEmployeeRows() {
        const tbody = $('#empTbody');
        if (!tbody) return;
        const rows = visibleEmployees();

        // Pagination math (same behaviour as the Charts of Account list)
        const totalPages = Math.max(1, Math.ceil(rows.length / EMP_ROWS_PER_PAGE));
        if (empCurrentPage > totalPages) empCurrentPage = totalPages;
        if (empCurrentPage < 1) empCurrentPage = 1;
        const startIdx = (empCurrentPage - 1) * EMP_ROWS_PER_PAGE;
        const pageRows = rows.slice(startIdx, startIdx + EMP_ROWS_PER_PAGE);
        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">⌕</div><strong>No employees found</strong><p>Try adjusting your search or filters.</p></div></td></tr>`;
            renderEmpPagination(totalPages);
            return;
        }

        let rowsHtml = pageRows.map(e => {
            return `
            <tr data-id="${e.id}">
                <td>${escapeHtml(String(e.id).padStart(5, '0'))}</td>
                <td>${escapeHtml(e.name)}</td>
                <td>${escapeHtml(e.dept)}</td>
                <td>${escapeHtml(e.position || 'Staff')}</td>
                <td><span class="${String(e.status || 'Active').toLowerCase() === 'active' ? 'coa-active' : 'coa-inactive'}">${escapeHtml(String(e.status || 'Active'))}</span></td>
                <td>${peso(e.salary)}</td>
                <td>
                    <button class="coa-view-btn" type="button" data-act="view" data-id="${e.id}">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>
                        View
                    </button>
                </td>
            </tr>`;
        }).join('');

        // Spacer rows keep the last page the same height as a full one
        const missingRows = EMP_ROWS_PER_PAGE - pageRows.length;
        for (let i = 0; i < missingRows; i++) {
            rowsHtml += `<tr class="at-spacer-row"><td colspan="7">&nbsp;</td></tr>`;
        }

        tbody.innerHTML = rowsHtml;
        renderEmpPagination(totalPages);
    }

    function renderEmpPagination(totalPages) {
        const wrap = $('#empPagination');
        if (!wrap) return;

        const startPage = totalPages <= 3 ? 1 : Math.min(Math.max(1, empCurrentPage - 1), totalPages - 2);
        const pages = Array.from({ length: Math.min(3, totalPages) }, (_, index) => startPage + index);
        const atFirst = empCurrentPage <= 1;
        const atLast  = empCurrentPage >= totalPages;

        wrap.innerHTML = `
            <button type="button" class="coa-page-btn" data-page="prev" aria-label="Previous page" ${atFirst ? 'disabled' : ''}>&lt;</button>
            ${pages.map(page => `<button type="button" class="coa-page-btn ${page === empCurrentPage ? 'is-active' : ''}" data-page="${page}">${page}</button>`).join('')}
            <button type="button" class="coa-page-btn" data-page="next" aria-label="Next page" ${atLast ? 'disabled' : ''}>&gt;</button>
            ${totalPages > 3 ? `<details class="coa-page-menu"><summary>Select Page</summary><div class="coa-page-options">${Array.from({ length: totalPages }, (_, index) => `<button type="button" class="coa-page-option" data-page="${index + 1}">${index + 1}</button>`).join('')}</div></details>` : ''}
        `;
    }

    function handleEmpPagination(e) {
        const btn = e.target.closest('.coa-page-btn, .coa-page-option');
        if (!btn || btn.disabled) return;
        const totalPages = Math.max(1, Math.ceil(visibleEmployees().length / EMP_ROWS_PER_PAGE));
        const target = btn.dataset.page;
        if (target === 'prev') empCurrentPage = Math.max(1, empCurrentPage - 1);
        else if (target === 'next') empCurrentPage = Math.min(totalPages, empCurrentPage + 1);
        else empCurrentPage = Number(target) || 1;
        renderEmployeeRows();
    }

    // Charts of Account style dropdown (replaces the old native select)
    function setupEmpStatusDropdown() {
        const dd = $('.custom-filter-dropdown[data-id="empStatusFilter"]');
        if (!dd) return;
        const btn = dd.querySelector('.custom-filter-btn');
        const label = dd.querySelector('.cfb-text');
        const menu = dd.querySelector('.custom-filter-menu');
        if (!btn || !label || !menu) return;

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            dd.classList.toggle('open');
        });

        menu.addEventListener('click', (e) => {
            const li = e.target.closest('li');
            if (!li) return;
            const value = li.dataset.value || '';
            btn.dataset.value = value;
            label.textContent = value || 'Select Status';
            btn.classList.toggle('is-active', !!value);
            menu.querySelectorAll('li').forEach(item => item.classList.toggle('is-selected', item === li));
            dd.classList.remove('open');
            empCurrentPage = 1;
            renderEmployeeRows();
        });

        // Close when clicking anywhere else (bound once per page load)
        if (!empDropdownOutsideBound) {
            empDropdownOutsideBound = true;
            document.addEventListener('click', (ev) => {
                if (ev.target.closest('.custom-filter-dropdown')) return;
                document.querySelectorAll('.custom-filter-dropdown.open').forEach(open => open.classList.remove('open'));
            });
        }
    }

    let attCurrentPage = 1;
    const ATT_ROWS_PER_PAGE = 7;
    let attDropdownOutsideBound = false;

    function buildAttendance() {
        const defaultDate = localStorage.getItem(ATTENDANCE_FILTER_KEY) || todayDateString();
        attCurrentPage = 1;
        return `
            <div class="emp-page-header">
                <h2 class="emp-page-title">Attendance Management</h2>
                <button class="coa-export-top-btn" type="button" data-export="attendance">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/></svg>
                    Export CSV
                </button>
            </div>

            <section class="coa-card">
                <header class="coa-card-head">
                    <h3 class="coa-card-title">ATTENDANCE LOG <span class="coa-card-count" id="attCount"></span></h3>
                    <div class="coa-toolbar">
                        <div class="coa-search-box">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#888" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
                            <input type="search" placeholder="Search..." id="attSearch" />
                        </div>
                        <div class="custom-filter-dropdown" data-id="attStatusFilter">
                            <button type="button" class="custom-filter-btn" data-value="" style="height: 32px; min-width: 130px; font-size: 13px;">
                                <span class="cfb-text">Select Status</span>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
                            </button>
                            <ul class="custom-filter-menu">
                                <li data-value="">All</li>
                                <li data-value="Present">Present</li>
                                <li data-value="Late">Late</li>
                                <li data-value="Absent">Absent</li>
                                <li data-value="On Leave">On Leave</li>
                            </ul>
                        </div>
                        <input class="coa-date-input" type="date" id="attDate" value="${defaultDate}" aria-label="Filter attendance by date" />
                        <button class="coa-ghost-btn" type="button" id="refreshAttendanceBtn">Refresh</button>
                        ${canManageRecords()
                            ? '<button class="coa-add-btn-top" type="button" id="addAttBtn">+ Log Attendance</button>'
                            : '<button class="coa-add-btn-top" type="button" id="clockInBtn">Clock In</button><button class="coa-ghost-btn" type="button" id="clockOutBtn">Clock Out</button>'}
                    </div>
                </header>

                <div class="table-wrap coa-table-scroll">
                    <table class="coa-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Employee</th>
                                <th>Time In</th>
                                <th>Time Out</th>
                                <th>Hours</th>
                                <th>Overtime</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody id="attTbody"></tbody>
                    </table>
                </div>

                <footer class="coa-pagination" id="attPagination"></footer>
            </section>
        `;
    }

    function calcHours(tin, tout) {
        if (!tin || !tout || tin === '\u2014' || tout === '\u2014') return 'Not recorded';
        const [h1, m1] = tin.split(':').map(Number);
        const [h2, m2] = tout.split(':').map(Number);
        let mins = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (mins < 0) mins = 0;
        return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;
    }
    function calcOvertime(tin, tout) {
        if (!tin || !tout || tin === '\u2014' || tout === '\u2014') return '0h';
        const [hours, minutes] = tout.split(':').map(Number);
        const overtimeMinutes = Math.max(0, (hours * 60 + minutes) - (17 * 60));
        return `${Math.floor(overtimeMinutes / 60)}h ${String(overtimeMinutes % 60).padStart(2, '0')}m`;
    }

    function attendanceFilterState() {
        return {
            q: ($('#attSearch')?.value || '').trim().toLowerCase(),
            date: $('#attDate')?.value || '',
            status: $('.custom-filter-dropdown[data-id="attStatusFilter"] .custom-filter-btn')?.dataset.value || ''
        };
    }

    function visibleAttendance() {
        const { q, date, status } = attendanceFilterState();
        return store.attendance.filter(a => {
            const emp = empById(a.empId);
            const employeeText = idSearchText(recordEmployeeName(a), a.empId, emp?.id, emp?.empNo, a.date, a.status);
            const matchQ = !q || employeeText.includes(q);
            const matchD = !date || a.date === date;
            const matchS = !status || a.status === status;
            return matchQ && matchD && matchS;
        });
    }

    function renderAttendanceRows() {
        const tbody = $('#attTbody');
        if (!tbody) return;
        const rows = visibleAttendance();
        const countEl = $('#attCount');
        if (countEl) countEl.textContent = `${rows.length} record${rows.length !== 1 ? 's' : ''}`;

        // Pagination math (same behaviour as the Charts of Account list)
        const totalPages = Math.max(1, Math.ceil(rows.length / ATT_ROWS_PER_PAGE));
        if (attCurrentPage > totalPages) attCurrentPage = totalPages;
        if (attCurrentPage < 1) attCurrentPage = 1;
        const startIdx = (attCurrentPage - 1) * ATT_ROWS_PER_PAGE;
        const pageRows = rows.slice(startIdx, startIdx + ATT_ROWS_PER_PAGE);

        if (!pageRows.length) {
            tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><strong>No attendance records</strong><p>No records match the selected filters.</p></div></td></tr>`;
            renderAttPagination(totalPages);
            return;
        }

        const editable = canManageRecords();
        let rowsHtml = pageRows.map(a => {
            const name = recordEmployeeName(a);
            const stText = String(a.status || '—');
            const stCls = stText === 'Present' ? 'coa-active'
                : stText === 'Late' ? 'coa-status-warn'
                : stText === 'Absent' ? 'coa-inactive'
                : 'coa-status-muted';
            return `
                <tr data-id="${a.id}">
                    <td>${editable ? `<button class="coa-time-btn" type="button" data-act="editAtt" data-id="${a.id}">${escapeHtml(a.date)}</button>` : escapeHtml(a.date)}</td>
                    <td>${escapeHtml(name)}</td>
                    <td>${editable ? `<button class="coa-time-btn" type="button" data-act="editAtt" data-id="${a.id}">${escapeHtml(displayValue(a.timeIn))}</button>` : escapeHtml(displayValue(a.timeIn))}</td>
                    <td>${editable ? `<button class="coa-time-btn" type="button" data-act="editAtt" data-id="${a.id}">${escapeHtml(displayValue(a.timeOut))}</button>` : escapeHtml(displayValue(a.timeOut))}</td>
                    <td>${calcHours(a.timeIn, a.timeOut)}</td>
                    <td>${calcOvertime(a.timeIn, a.timeOut)}</td>
                    <td><span class="${stCls}">${escapeHtml(stText)}</span></td>
                </tr>`;
        }).join('');

        // Spacer rows keep the last page the same height as a full one
        const missingRows = ATT_ROWS_PER_PAGE - pageRows.length;
        for (let i = 0; i < missingRows; i++) {
            rowsHtml += `<tr class="at-spacer-row"><td colspan="7">&nbsp;</td></tr>`;
        }
        tbody.innerHTML = rowsHtml;

        renderAttPagination(totalPages);
    }

    function renderAttPagination(totalPages) {
        const wrap = $('#attPagination');
        if (!wrap) return;

        const startPage = totalPages <= 3 ? 1 : Math.min(Math.max(1, attCurrentPage - 1), totalPages - 2);
        const pages = Array.from({ length: Math.min(3, totalPages) }, (_, index) => startPage + index);
        const atFirst = attCurrentPage <= 1;
        const atLast  = attCurrentPage >= totalPages;

        wrap.innerHTML = `
            <button type="button" class="coa-page-btn" data-page="prev" aria-label="Previous page" ${atFirst ? 'disabled' : ''}>&lt;</button>
            ${pages.map(page => `<button type="button" class="coa-page-btn ${page === attCurrentPage ? 'is-active' : ''}" data-page="${page}">${page}</button>`).join('')}
            <button type="button" class="coa-page-btn" data-page="next" aria-label="Next page" ${atLast ? 'disabled' : ''}>&gt;</button>
            ${totalPages > 3 ? `<details class="coa-page-menu"><summary>Select Page</summary><div class="coa-page-options">${Array.from({ length: totalPages }, (_, index) => `<button type="button" class="coa-page-option" data-page="${index + 1}">${index + 1}</button>`).join('')}</div></details>` : ''}
        `;
    }

    function handleAttPagination(e) {
        const btn = e.target.closest('.coa-page-btn, .coa-page-option');
        if (!btn || btn.disabled) return;
        const totalPages = Math.max(1, Math.ceil(visibleAttendance().length / ATT_ROWS_PER_PAGE));
        const target = btn.dataset.page;
        if (target === 'prev') attCurrentPage = Math.max(1, attCurrentPage - 1);
        else if (target === 'next') attCurrentPage = Math.min(totalPages, attCurrentPage + 1);
        else attCurrentPage = Number(target) || 1;
        renderAttendanceRows();
    }

    // Charts of Account style status dropdown for the attendance log
    function setupAttStatusDropdown() {
        const dd = $('.custom-filter-dropdown[data-id="attStatusFilter"]');
        if (!dd) return;
        const btn = dd.querySelector('.custom-filter-btn');
        const label = dd.querySelector('.cfb-text');
        const menu = dd.querySelector('.custom-filter-menu');
        if (!btn || !label || !menu) return;

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            dd.classList.toggle('open');
        });

        menu.addEventListener('click', (e) => {
            const li = e.target.closest('li');
            if (!li) return;
            const value = li.dataset.value || '';
            btn.dataset.value = value;
            label.textContent = value || 'Select Status';
            btn.classList.toggle('is-active', !!value);
            menu.querySelectorAll('li').forEach(item => item.classList.toggle('is-selected', item === li));
            dd.classList.remove('open');
            attCurrentPage = 1;
            renderAttendanceRows();
        });

        if (!attDropdownOutsideBound) {
            attDropdownOutsideBound = true;
            document.addEventListener('click', (ev) => {
                if (ev.target.closest('.custom-filter-dropdown')) return;
                document.querySelectorAll('.custom-filter-dropdown.open').forEach(open => open.classList.remove('open'));
            });
        }
    }

    const LEAVE_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    let leaveFilterOutsideBound = false;
    let leaveMenuOutsideBound = false;

    function usDate(iso) {
        const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
        return m ? `${m[2]}/${m[3]}/${m[1]}` : String(iso || '—');
    }

    function shortEmployeeName(name) {
        const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
        if (!parts.length) return '—';
        if (parts.length === 1) return parts[0];
        return `${parts[parts.length - 1]}, ${parts[0][0].toUpperCase()}.`;
    }

    function leaveTypeLabel(type) {
        return String(type || 'Leave').replace(/\s*Leave$/i, '') || 'Leave';
    }

    function leavePeriodLabel(l) {
        const m = /^(\d{4})-(\d{2})/.exec(String(l.from || ''));
        if (!m) return '—';
        const year = Number(m[1]);
        const month = Number(m[2]);
        const lastDay = new Date(year, month, 0).getDate();
        return `${LEAVE_MONTHS[month - 1].slice(0, 3)} 01 - ${String(lastDay).padStart(2, '0')}, ${year}`;
    }

    function buildLeave() {
        const staffRequest = !canManageRecords();
        const head = `<tr><th>Employee</th><th>Leave Type</th><th>Start Date</th><th>End Date</th><th>Status</th><th>Action</th></tr>`;
        return `
            <div class="emp-page-header">
                <h2 class="emp-page-title">Leave Management</h2>
                <button class="coa-export-top-btn" type="button" data-export="leaves">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/></svg>
                    Export CSV
                </button>
            </div>

            <div class="leave-shell">
                <section class="coa-card">
                    <header class="coa-card-head">
                        <h3 class="coa-card-title leave-card-title">Employee</h3>
                        <div class="coa-toolbar">
                            <div class="coa-search-box">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#888" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
                                <input type="search" placeholder="Search..." id="leaveSearch" />
                            </div>
                            <div class="custom-filter-dropdown" data-id="leaveStatusFilter">
                                <button type="button" class="custom-filter-btn" data-value="" style="height: 32px; min-width: 130px; font-size: 13px;">
                                    <span class="cfb-text">Select Status</span>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
                                </button>
                                <ul class="custom-filter-menu">
                                    <li data-value="">All</li>
                                    <li data-value="Approved">Approved</li>
                                    <li data-value="Pending">Pending</li>
                                    <li data-value="Rejected">Rejected</li>
                                </ul>
                            </div>
                            <button class="coa-add-btn-top" type="button" id="addLeaveBtn">${staffRequest ? 'Request Leave' : '+ New Request'}</button>
                        </div>
                    </header>
                    <div class="table-wrap">
                        <table class="coa-table">
                            <thead>${head}</thead>
                            <tbody id="leaveTbody"></tbody>
                        </table>
                    </div>
                </section>

                <section class="coa-card">
                    <header class="coa-card-head">
                        <h3 class="coa-card-title leave-card-title">Leave History</h3>
                        <div class="coa-toolbar">
                            <div class="coa-search-box">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#888" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
                                <input type="search" placeholder="Search..." id="leaveHistorySearch" />
                            </div>
                        </div>
                    </header>
                    <div class="table-wrap">
                        <table class="coa-table">
                            <thead>${head}</thead>
                            <tbody id="leaveHistoryTbody"></tbody>
                        </table>
                    </div>
                </section>
            </div>
        `;
    }

    function leaveStatusSelection() {
        const value = $('.custom-filter-dropdown[data-id="leaveStatusFilter"] .custom-filter-btn')?.dataset.value || '';
        return value ? [value] : [];
    }

    function leaveRowHtml(l) {
        const name = recordEmployeeName(l);
        const stCls = l.status === 'Approved' ? 'coa-active'
            : l.status === 'Rejected' ? 'coa-inactive'
            : 'coa-status-warn';
        return `
            <tr data-id="${l.id}">
                <td>${escapeHtml(shortEmployeeName(name))}</td>
                <td>${escapeHtml(leaveTypeLabel(l.type))}</td>
                <td>${escapeHtml(usDate(l.from))}</td>
                <td>${escapeHtml(usDate(l.to))}</td>
                <td><span class="${stCls}">${escapeHtml(l.status)}</span></td>
                <td class="leave-action-cell">
                    <button class="leave-menu-btn" type="button" data-act="toggleLeaveMenu" data-id="${l.id}" aria-label="Row actions">⋮</button>
                    <div class="leave-row-menu" hidden>
                        <button type="button" data-act="viewLeave" data-id="${l.id}">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>
                            View Request
                        </button>
                        ${canManageRecords() ? `
                        <button type="button" data-act="approve" data-id="${l.id}">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#2f9b52" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                            Mark as Approved
                        </button>
                        <button type="button" data-act="reject" data-id="${l.id}">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#c2181a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                            Mark as Rejected
                        </button>
                        <div class="leave-menu-sep"></div>
                        <button type="button" class="danger" data-act="deleteLeave" data-id="${l.id}">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>
                            Delete records
                        </button>
                        ` : ''}
                    </div>
                </td>
            </tr>`;
    }

    function renderLeaveRows() {
        const employeeBody = $('#leaveTbody');
        const historyBody = $('#leaveHistoryTbody');
        if (!employeeBody) return;

        const q = ($('#leaveSearch')?.value || '').trim().toLowerCase();
        const statuses = leaveStatusSelection();
        const matches = (l, term) => {
            const emp = empById(l.empId);
            const text = idSearchText(recordEmployeeName(l), l.empId, emp?.id, emp?.empNo, l.id, l.reason, l.type, l.status);
            return !term || text.includes(term);
        };

        const employeeRows = store.leaves.filter(l => matches(l, q) && (!statuses.length || statuses.includes(l.status)));
        employeeBody.innerHTML = employeeRows.length
            ? employeeRows.map(leaveRowHtml).join('')
            : `<tr><td colspan="6"><div class="empty-state"><strong>No leave requests</strong><p>No requests match the current filters.</p></div></td></tr>`;

        if (historyBody) {
            const historyQ = ($('#leaveHistorySearch')?.value || '').trim().toLowerCase();
            const historyRows = store.leaves.filter(l => l.status !== 'Pending' && matches(l, historyQ));
            historyBody.innerHTML = historyRows.length
                ? historyRows.map(leaveRowHtml).join('')
                : `<tr><td colspan="6"><div class="empty-state"><strong>No leave history yet</strong><p>Approved and rejected requests will appear here.</p></div></td></tr>`;
        }
    }

    // Charts of Account style status dropdown, same as the attendance log
    function setupLeaveStatusDropdown() {
        const dd = $('.custom-filter-dropdown[data-id="leaveStatusFilter"]');
        if (!dd) return;
        const btn = dd.querySelector('.custom-filter-btn');
        const label = dd.querySelector('.cfb-text');
        const menu = dd.querySelector('.custom-filter-menu');
        if (!btn || !label || !menu) return;

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            dd.classList.toggle('open');
        });

        menu.addEventListener('click', (e) => {
            const li = e.target.closest('li');
            if (!li) return;
            const value = li.dataset.value || '';
            btn.dataset.value = value;
            label.textContent = value || 'Select Status';
            btn.classList.toggle('is-active', !!value);
            menu.querySelectorAll('li').forEach(item => item.classList.toggle('is-selected', item === li));
            dd.classList.remove('open');
            renderLeaveRows();
        });

        if (!leaveFilterOutsideBound) {
            leaveFilterOutsideBound = true;
            document.addEventListener('click', (ev) => {
                if (ev.target.closest('.custom-filter-dropdown')) return;
                document.querySelectorAll('.custom-filter-dropdown.open').forEach(open => open.classList.remove('open'));
            });
        }
    }

    function closeLeaveMenus(except) {
        document.querySelectorAll('.leave-row-menu').forEach(menu => {
            if (menu !== except) menu.hidden = true;
        });
    }

    function toggleLeaveMenu(btn) {
        const menu = btn.parentElement.querySelector('.leave-row-menu');
        if (!menu) return;
        const wasOpen = !menu.hidden;
        closeLeaveMenus();
        if (wasOpen) return;
        menu.hidden = false;
        const rect = btn.getBoundingClientRect();
        const width = 200;
        menu.style.top = `${rect.bottom + 6}px`;
        menu.style.left = `${Math.max(8, rect.right - width)}px`;

        if (!leaveMenuOutsideBound) {
            leaveMenuOutsideBound = true;
            document.addEventListener('click', (ev) => {
                if (ev.target.closest('.leave-menu-btn') || ev.target.closest('.leave-row-menu')) return;
                closeLeaveMenus();
            });
            document.addEventListener('keydown', (ev) => {
                if (ev.key === 'Escape') closeLeaveMenus();
            });
        }
    }

       function buildPayroll() {
        const employeesOnPayroll = new Set(store.payroll.map(p => String(p.empId))).size;
        const grossPay    = store.payroll.reduce((s, p) => s + Number(p.gross || 0), 0);
        const totalDeduct = store.payroll.reduce((s, p) => s + Number(p.deductions || 0), 0);
        const netPayroll  = grossPay - totalDeduct;

        return `
            <div class="emp-page-header">
                <h2 class="emp-page-title">Payroll</h2>
                <button class="coa-export-top-btn" type="button" data-export="payroll">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/></svg>
                    Export PDF / Excel
                </button>
            </div>

            <div class="fin-stat-grid" style="margin-bottom:18px;">
                <div class="fin-stat-card chip-blue">
                    <div class="fin-stat-head">
                        <span class="fin-stat-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M21 21v-2a4 4 0 0 0-3-3.87"/></svg>
                        </span>
                        <span class="fin-stat-label">Employees on Payroll</span>
                    </div>
                    <div class="fin-stat-value is-dark">${employeesOnPayroll}</div>
                </div>
                <div class="fin-stat-card chip-green">
                    <div class="fin-stat-head">
                        <span class="fin-stat-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="12" cy="14.5" r="2.2"/></svg>
                        </span>
                        <span class="fin-stat-label">Gross Pay</span>
                    </div>
                    <div class="fin-stat-value is-dark">${peso(grossPay)}</div>
                </div>
                <div class="fin-stat-card chip-red">
                    <div class="fin-stat-head">
                        <span class="fin-stat-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12H3M3 12l4-4M3 12l4 4M21 5H9M21 19H9"/></svg>
                        </span>
                        <span class="fin-stat-label">Total Deduction</span>
                    </div>
                    <div class="fin-stat-value is-dark">${peso(totalDeduct)}</div>
                </div>
                <div class="fin-stat-card chip-amber">
                    <div class="fin-stat-head">
                        <span class="fin-stat-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                        </span>
                        <span class="fin-stat-label">Net Payroll</span>
                    </div>
                    <div class="fin-stat-value is-dark">${peso(netPayroll)}</div>
                </div>
            </div>

            <section class="coa-card payroll-panel" id="payrollPanel">
                <header class="coa-card-head">
                    <h3 class="coa-card-title">EMPLOYEES <span class="coa-card-count" id="payrollCount"></span></h3>
                    <div class="coa-toolbar">
                        <div class="coa-search-box">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#888" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
                            <input type="search" placeholder="Search..." id="payrollSearch" />
                        </div>
                        <div class="custom-filter-dropdown" data-id="payrollStatusFilter">
                            <button type="button" class="custom-filter-btn" data-value="" style="height: 32px; min-width: 120px; font-size: 13px;">
                                <span class="cfb-text">Select Status</span>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
                            </button>
                            <ul class="custom-filter-menu">
                                <li data-value="">All</li>
                                <li data-value="Paid">Paid</li>
                                <li data-value="Pending">Pending</li>
                                <li data-value="Processing">Processing</li>
                                <li data-value="On Hold">On Hold</li>
                            </ul>
                        </div>
                        <button class="coa-ghost-btn" type="button" id="printPayrollBtn" style="height:32px;">Print</button>
                        <button class="coa-add-btn-top" type="button" id="createPayrollBtn">+ Create Payroll</button>
                    </div>
                </header>

                <div class="table-wrap coa-table-scroll">
                    <table class="coa-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Employee</th>
                                <th>Date Hired</th>
                                <th>Period</th>
                                <th>Salary</th>
                                <th>Overtime</th>
                                <th>Absences</th>
                                <th>Deduction</th>
                                <th>Status</th>
                                <th style="text-align:right;">Action</th>
                            </tr>
                        </thead>
                        <tbody id="payrollTbody"></tbody>
                    </table>
                </div>

                <footer class="coa-pagination" id="payrollPagination"></footer>
            </section>

            <div class="payroll-print-header" aria-hidden="true">
                <strong>${escapeHtml(store.settings?.company || 'Company')}</strong>
                <span>Payroll Report</span>
                <span class="payroll-print-period" id="payrollPrintPeriod"></span>
                <span>Generated ${todayDateString()}</span>
            </div>
        `;
    }

    const PAYROLL_ROWS_PER_PAGE = 7;
    let payrollCurrentPage = 1;
    let payrollDropdownOutsideBound = false;

    function payrollStatusSelection() {
        return $('.custom-filter-dropdown[data-id="payrollStatusFilter"] .custom-filter-btn')?.dataset.value || '';
    }

    function visiblePayroll() {
        const q = ($('#payrollSearch')?.value || '').trim().toLowerCase();
        const status = payrollStatusSelection();
        return store.payroll.filter(p => {
            const emp = empById(p.empId);
            const text = idSearchText(p.id, p.empId, emp?.id, emp?.empNo, emp?.name || '', p.cycle, p.payroll_period, p.status);
            const matchQ = !q || text.includes(q);
            const matchS = !status || p.status === status;
            return matchQ && matchS;
        });
    }

    function statusClassForPayroll(status) {
        const s = String(status || '').toLowerCase();
        if (s === 'paid')       return 'is-paid';
        if (s === 'processing') return 'is-fulfilling';
        if (s === 'pending')    return 'is-fulfilling';
        if (s === 'on hold' || s === 'overdue') return 'is-overdue';
        return 'is-pending';
    }

    /* Payroll periods are free-form text ("November 15–30, 2026"), so the
       print date range is worked out by parsing that text into real dates. */
    const PERIOD_MONTHS = {
        january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
        april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
        august: 7, aug: 7, september: 8, sept: 8, sep: 8,
        october: 9, oct: 9, november: 10, nov: 10, december: 11, dec: 11
    };

    const periodYmd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    function periodMonthOf(text) {
        const word = ((String(text || '').match(/[A-Za-z]+/) || [])[0] || '').toLowerCase();
        return Object.prototype.hasOwnProperty.call(PERIOD_MONTHS, word) ? PERIOD_MONTHS[word] : null;
    }

    function parsePeriodEdge(fragment, fallback) {
        const text = String(fragment || '').trim();
        if (!text) return null;
        const month = periodMonthOf(text) !== null ? periodMonthOf(text) : (fallback ? fallback.month : null);
        const dayMatch = text.match(/\b(\d{1,2})\b/);
        const yearMatch = text.match(/\b(\d{4})\b/);
        const day = dayMatch ? Number(dayMatch[1]) : 1;
        const year = yearMatch ? Number(yearMatch[1]) : (fallback ? fallback.year : null);
        if (month === null || year === null) return null;
        return new Date(year, month, day);
    }

    function parsePayrollPeriodRange(period) {
        const raw = String(period || '').trim();
        if (!raw) return null;
        // Normalise every range separator to "|". Plain hyphens are left alone
        // for ISO dates, but split "November 15-30, 2026" into two edges.
        let joined = raw.replace(/\s*(?:–|—|\bto\b|\bthrough\b)\s*/gi, '|');
        if (!/^\d{4}-\d{1,2}-\d{1,2}/.test(raw)) joined = joined.replace(/\s*-\s*(?=\d)/g, '|');
        const parts = joined.split('|').map(s => s.trim()).filter(Boolean);
        if (!parts.length) return null;

        const yearMatch = raw.match(/\b(\d{4})\b/);
        const fallback = { month: periodMonthOf(raw), year: yearMatch ? Number(yearMatch[1]) : null };
        let start = parsePeriodEdge(parts[0], fallback);
        if (!start) return null;
        let end = parts.length > 1
            ? parsePeriodEdge(parts[parts.length - 1], { month: start.getMonth(), year: start.getFullYear() })
            : new Date(start.getFullYear(), start.getMonth() + 1, 0);
        if (!end) end = start;
        if (end < start) { const tmp = start; start = end; end = tmp; }
        return { start, end };
    }

    function payrollPrintDefaults() {
        let from = null;
        let to = null;
        store.payroll.forEach(p => {
            const range = parsePayrollPeriodRange(p.payroll_period || p.cycle);
            if (!range) return;
            if (!from || range.start < from) from = range.start;
            if (!to || range.end > to) to = range.end;
        });
        if (!from || !to) {
            const now = new Date();
            from = new Date(now.getFullYear(), now.getMonth(), 1);
            to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }
        return { from: periodYmd(from), to: periodYmd(to) };
    }

    function payrollInPrintRange(p, from, to) {
        const range = parsePayrollPeriodRange(p.payroll_period || p.cycle);
        let start;
        let end;
        if (range) {
            start = range.start;
            end = range.end;
        } else {
            // Unparseable period — fall back to the date the record was created.
            const raw = String(p.created_at || '').slice(0, 10);
            if (!raw) return true;
            const bits = raw.split('-').map(Number);
            if (bits.length !== 3 || bits.some(n => !Number.isFinite(n))) return true;
            start = end = new Date(bits[0], bits[1] - 1, bits[2]);
        }
        return periodYmd(start) <= to && periodYmd(end) >= from;
    }

    function payrollRowHtml(p) {
        const emp = empById(p.empId);
        const empName = emp ? emp.name : p.empId;
        const hired = emp?.joined ? String(emp.joined) : '—';
        const cycle = p.payroll_period || p.cycle || '—';
        const gross = p.gross_salary !== undefined ? Number(p.gross_salary) : (Number(p.gross) || 0);
        const deductions = Number(p.deductions) || 0;
        const overtime = p.overtime !== undefined ? Number(p.overtime) : 0;
        const absences = p.absences !== undefined ? Number(p.absences) : 0;

        return `
            <tr data-id="${escapeHtml(p.id || '')}">
                <td><strong style="font-family:monospace;color:#555;">${escapeHtml(p.id || 'Pending')}</strong></td>
                <td>${escapeHtml(empName)}</td>
                <td>${escapeHtml(hired)}</td>
                <td>${escapeHtml(cycle)}</td>
                <td>${peso(gross)}</td>
                <td>+${peso(overtime)}</td>
                <td>${absences} Day${absences === 1 ? '' : 's'}</td>
                <td>-${peso(deductions)}</td>
                <td><span class="status-text ${statusClassForPayroll(p.status)}">${escapeHtml(p.status)}</span></td>
                <td>
                    <div class="cell-actions" style="justify-content:flex-end;">
                        <button class="coa-view-btn" type="button" data-act="viewPayslip" data-id="${escapeHtml(p.id)}">
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>
                            View
                        </button>
                    </div>
                </td>
            </tr>`;
    }

    function renderPayrollRows() {
        const tbody = $('#payrollTbody');
        if (!tbody) return;
        const rows = visiblePayroll();

        const countEl = $('#payrollCount');
        if (countEl) countEl.textContent = `${rows.length} record${rows.length !== 1 ? 's' : ''}`;

        const totalPages = Math.max(1, Math.ceil(rows.length / PAYROLL_ROWS_PER_PAGE));
        if (payrollCurrentPage > totalPages) payrollCurrentPage = totalPages;
        if (payrollCurrentPage < 1) payrollCurrentPage = 1;
        const startIdx = (payrollCurrentPage - 1) * PAYROLL_ROWS_PER_PAGE;
        const pageRows = rows.slice(startIdx, startIdx + PAYROLL_ROWS_PER_PAGE);

        const printPeriod = $('#payrollPrintPeriod');
        if (printPeriod) printPeriod.textContent = `Generated ${todayDateString()}`;

        if (!pageRows.length) {
            tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><div class="empty-icon">◌</div><strong>No payroll records</strong><p>Try adjusting your search or filter.</p></div></td></tr>`;
            renderPayrollPagination(totalPages);
            return;
        }

        let html = pageRows.map(payrollRowHtml).join('');

        const missing = PAYROLL_ROWS_PER_PAGE - pageRows.length;
        for (let i = 0; i < missing; i++) {
            html += `<tr class="at-spacer-row"><td colspan="10">&nbsp;</td></tr>`;
        }
        tbody.innerHTML = html;

        renderPayrollPagination(totalPages);
    }

    function openPayrollPrintDialog() {
        const defaults = payrollPrintDefaults();
        openModal({
            title: ' ',
            size: 'sm',
            onCancel: closeModal,
            onSubmit: (form) => {
                const data = Object.fromEntries(new FormData(form).entries());
                const from = String(data.from || '');
                const to = String(data.to || '');
                if (!from || !to) { toast('Please choose both a From and a To date.', 'error'); return; }
                if (from > to) { toast('The From date must be on or before the To date.', 'error'); return; }
                const matched = store.payroll.filter(p => payrollInPrintRange(p, from, to));
                if (!matched.length) {
                    toast(`No payroll records found from ${from} to ${to}.`, 'error');
                    return;
                }
                closeModal();
                printPayrollRange(matched, from, to);
            },
            body: `
                <form id="payrollPrintForm">
                    <h3 style="margin:0 0 6px;font-size:17px;font-weight:700;">Print Payroll</h3>
                    <p style="margin:0 0 20px;color:#777;font-size:13px;line-height:1.5;">
                        Choose the dates to print. Only payroll records whose period falls within this range will be included.
                    </p>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                        <div class="form-field">
                            <label for="pp-from">From <b class="req">*</b></label>
                            <input type="date" id="pp-from" name="from" value="${defaults.from}" required />
                        </div>
                        <div class="form-field">
                            <label for="pp-to">To <b class="req">*</b></label>
                            <input type="date" id="pp-to" name="to" value="${defaults.to}" required />
                        </div>
                    </div>
                    <p style="margin:14px 0 0;font-size:12px;color:#888;">
                        ${store.payroll.length} payroll record(s) on file. Every record in the range is printed, not just the current page.
                    </p>
                    <div class="form-actions" style="margin-top:18px;">
                        <button type="button" class="btn btn-subtle" data-act="cancel">Cancel</button>
                        <button type="submit" class="btn btn-primary">Print</button>
                    </div>
                </form>
            `
        });
    }

    function printPayrollRange(rows, from, to) {
        const tbody = $('#payrollTbody');
        const periodEl = $('#payrollPrintPeriod');
        if (!tbody) return;
        const savedRows = tbody.innerHTML;
        const savedPeriod = periodEl ? periodEl.textContent : '';
        const restore = () => {
            tbody.innerHTML = savedRows;
            if (periodEl) periodEl.textContent = savedPeriod;
            window.removeEventListener('afterprint', restore);
            clearTimeout(fallbackTimer);
        };
        const fallbackTimer = setTimeout(restore, 1500);
        window.addEventListener('afterprint', restore);

        tbody.innerHTML = rows.map(payrollRowHtml).join('');
        if (periodEl) periodEl.textContent = `From ${from} to ${to}`;
        requestAnimationFrame(() => window.print());
    }

    function renderPayrollPagination(totalPages) {
        const wrap = $('#payrollPagination');
        if (!wrap) return;
        const startPage = totalPages <= 3 ? 1 : Math.min(Math.max(1, payrollCurrentPage - 1), totalPages - 2);
        const pages = Array.from({ length: Math.min(3, totalPages) }, (_, i) => startPage + i);
        const atFirst = payrollCurrentPage <= 1;
        const atLast = payrollCurrentPage >= totalPages;

        wrap.innerHTML = `
            <button type="button" class="coa-page-btn" data-page="prev" aria-label="Previous page" ${atFirst ? 'disabled' : ''}>&lt;</button>
            ${pages.map(page => `<button type="button" class="coa-page-btn ${page === payrollCurrentPage ? 'is-active' : ''}" data-page="${page}">${page}</button>`).join('')}
            <button type="button" class="coa-page-btn" data-page="next" aria-label="Next page" ${atLast ? 'disabled' : ''}>&gt;</button>
            ${totalPages > 3 ? `<details class="coa-page-menu"><summary>Select Page</summary><div class="coa-page-options">${Array.from({ length: totalPages }, (_, i) => `<button type="button" class="coa-page-option" data-page="${i + 1}">${i + 1}</button>`).join('')}</div></details>` : ''}
        `;
    }

    function setupPayrollStatusDropdown() {
        const dd = $('.custom-filter-dropdown[data-id="payrollStatusFilter"]');
        if (!dd) return;
        const btn = dd.querySelector('.custom-filter-btn');
        const label = dd.querySelector('.cfb-text');
        const menu = dd.querySelector('.custom-filter-menu');
        if (!btn || !label || !menu) return;

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            dd.classList.toggle('open');
        });

        menu.addEventListener('click', (e) => {
            const li = e.target.closest('li');
            if (!li) return;
            const value = li.dataset.value || '';
            btn.dataset.value = value;
            label.textContent = value || 'Select Status';
            btn.classList.toggle('is-active', !!value);
            menu.querySelectorAll('li').forEach(item => item.classList.toggle('is-selected', item === li));
            dd.classList.remove('open');
            payrollCurrentPage = 1;
            renderPayrollRows();
        });

        if (!payrollDropdownOutsideBound) {
            payrollDropdownOutsideBound = true;
            document.addEventListener('click', (ev) => {
                if (ev.target.closest('.custom-filter-dropdown')) return;
                document.querySelectorAll('.custom-filter-dropdown.open').forEach(open => open.classList.remove('open'));
            });
        }
    }

    /* ============ PAYROLL HISTORY (NEW) ============ */
    /* ==================== PAYROLL HISTORY ==================== */
    const PH_ROWS_PER_PAGE = 7;
    let phCurrentPage = 1;

    function phVisibleRows() {
        const q = ($('#phSearch')?.value || '').trim().toLowerCase();
        const yr = $('#phYear')?.value || '';
        const pr = $('#phPeriod')?.value || '';
        const st = $('#phStatus')?.value || '';
        return store.payroll.filter(p => {
            const emp = empById(p.empId);
            const name = emp ? emp.name : p.empId;
            const cycle = p.payroll_period || p.cycle || '';
            const matchQ = matchesSearch(q, name, p.empId, emp?.id, emp?.empNo, p.id, cycle, p.status);
            const matchY = !yr || String(cycle).includes(yr);
            const matchP = !pr || cycle === pr;
            const matchS = !st || String(p.status).toLowerCase() === st.toLowerCase();
            return matchQ && matchY && matchP && matchS;
        });
    }

    function buildPayrollHistory() {
        const years = [...new Set(store.payroll.map(p => (String(p.payroll_period || p.cycle || '').match(/(\d{4})/) || [])[1]).filter(Boolean))].sort().reverse();
        const periods = [...new Set(store.payroll.map(p => p.payroll_period || p.cycle))].filter(Boolean);

        return `
            <div class="emp-page-header">
                <h2 class="emp-page-title">Payroll History</h2>
            </div>

            <div class="fin-stat-grid" style="margin-bottom:18px;">
                <div class="fin-stat-card chip-blue">
                    <div class="fin-stat-head">
                        <span class="fin-stat-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8M10 9H8"/></svg>
                        </span>
                        <span class="fin-stat-label">Total Records</span>
                    </div>
                    <div class="fin-stat-value is-dark" id="phStatRecords">${store.payroll.length}</div>
                </div>
                <div class="fin-stat-card chip-green">
                    <div class="fin-stat-head">
                        <span class="fin-stat-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                        </span>
                        <span class="fin-stat-label">Total Gross Pay</span>
                    </div>
                    <div class="fin-stat-value is-dark" id="phStatGross">${peso(store.payroll.reduce((s, p) => s + (Number(p.gross) || 0), 0))}</div>
                </div>
                <div class="fin-stat-card chip-red">
                    <div class="fin-stat-head">
                        <span class="fin-stat-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12H3M3 12l4-4M3 12l4 4M21 5H9M21 19H9"/></svg>
                        </span>
                        <span class="fin-stat-label">Total Deductions</span>
                    </div>
                    <div class="fin-stat-value is-dark" id="phStatDeduct">${peso(store.payroll.reduce((s, p) => s + (Number(p.deductions) || 0), 0))}</div>
                </div>
                <div class="fin-stat-card chip-amber">
                    <div class="fin-stat-head">
                        <span class="fin-stat-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg>
                        </span>
                        <span class="fin-stat-label">Total Net Released</span>
                    </div>
                    <div class="fin-stat-value is-dark" id="phStatNet">${peso(store.payroll.reduce((s, p) => s + (Number(p.net) || 0), 0))}</div>
                </div>
            </div>

            <section class="coa-card" id="phPanel">
                <header class="coa-card-head">
                    <h3 class="coa-card-title">PAYROLL HISTORY <span class="coa-card-count" id="phCount"></span></h3>
                    <div class="coa-toolbar">
                        <div class="coa-search-box">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#888" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
                            <input type="search" placeholder="Search Employee, ID or period..." id="phSearch" />
                        </div>
                        <select id="phYear" class="coa-filter-select">
                            <option value="">All Years</option>
                            ${years.map(y => `<option>${escapeHtml(y)}</option>`).join('')}
                        </select>
                        <select id="phPeriod" class="coa-filter-select">
                            <option value="">All Periods</option>
                            ${periods.map(p => `<option>${escapeHtml(p)}</option>`).join('')}
                        </select>
                        <select id="phStatus" class="coa-filter-select">
                            <option value="">All Status</option>
                            <option>Paid</option>
                            <option>Processed</option>
                            <option>Pending</option>
                        </select>
                        <button class="coa-add-btn-top" type="button" data-export="payrollhistory">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/></svg>
                            Export Report
                        </button>
                    </div>
                </header>

                <div class="table-wrap coa-table-scroll">
                    <table class="coa-table">
                        <thead>
                            <tr>
                                <th>Payroll ID</th>
                                <th>Employee</th>
                                <th>Pay Period</th>
                                <th>Basic Salary</th>
                                <th>Overtime</th>
                                <th>Gross Pay</th>
                                <th>Deductions</th>
                                <th>Net Pay</th>
                                <th>Status</th>
                                <th style="text-align:right;">Action</th>
                            </tr>
                        </thead>
                        <tbody id="phTbody"></tbody>
                    </table>
                </div>

                <footer class="coa-pagination" id="phPagination"></footer>
            </section>
        `;
    }

    function renderPhPagination(totalPages) {
        const wrap = $('#phPagination');
        if (!wrap) return;
        if (!totalPages) { wrap.innerHTML = ''; return; }
        const pages = Array.from({ length: Math.min(3, totalPages) }, (_, i) => Math.min(Math.max(1, phCurrentPage - 1), Math.max(1, totalPages - 2)) + i);
        wrap.innerHTML = `
            <div class="gc-page-controls">
                <button type="button" class="coa-page-btn" data-page="prev" aria-label="Previous page" ${phCurrentPage <= 1 ? 'disabled' : ''}>&lt;</button>
                ${pages.map(page => `<button type="button" class="coa-page-btn ${page === phCurrentPage ? 'is-active' : ''}" data-page="${page}">${page}</button>`).join('')}
                <button type="button" class="coa-page-btn" data-page="next" aria-label="Next page" ${phCurrentPage >= totalPages ? 'disabled' : ''}>&gt;</button>
                ${totalPages > 3 ? `<details class="coa-page-menu"><summary>Select Page</summary><div class="coa-page-options">${Array.from({ length: totalPages }, (_, i) => `<button type="button" class="coa-page-option" data-page="${i + 1}">${i + 1}</button>`).join('')}</div></details>` : ''}
            </div>`;
    }

    function renderPayrollHistoryRows() {
        const tbody = $('#phTbody');
        if (!tbody) return;

        // Stat cards always reflect the full history dataset.
        const recEl = $('#phStatRecords');
        if (recEl) recEl.textContent = String(store.payroll.length);
        const grossEl = $('#phStatGross');
        if (grossEl) grossEl.textContent = peso(store.payroll.reduce((s, p) => s + (Number(p.gross) || 0), 0));
        const dedEl = $('#phStatDeduct');
        if (dedEl) dedEl.textContent = peso(store.payroll.reduce((s, p) => s + (Number(p.deductions) || 0), 0));
        const netEl = $('#phStatNet');
        if (netEl) netEl.textContent = peso(store.payroll.reduce((s, p) => s + (Number(p.net) || 0), 0));

        const rows = phVisibleRows();
        const countEl = $('#phCount');
        if (countEl) countEl.textContent = `${rows.length} record${rows.length !== 1 ? 's' : ''}`;

        const totalPages = Math.max(1, Math.ceil(rows.length / PH_ROWS_PER_PAGE));
        if (phCurrentPage > totalPages) phCurrentPage = totalPages;
        if (phCurrentPage < 1) phCurrentPage = 1;
        const startIdx = (phCurrentPage - 1) * PH_ROWS_PER_PAGE;
        const pageRows = rows.slice(startIdx, startIdx + PH_ROWS_PER_PAGE);

        if (!pageRows.length) {
            tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><div class="empty-icon">◌</div><strong>No payroll history</strong><p>No records match the current filters.</p></div></td></tr>`;
            renderPhPagination(totalPages);
            return;
        }

        tbody.innerHTML = pageRows.map(p => {
            const emp = empById(p.empId);
            const empName = emp ? emp.name : p.empId;
            const cycle = p.payroll_period || p.cycle || '—';
            return `
            <tr data-id="${escapeHtml(p.id || '')}">
                <td><strong style="font-family:monospace;color:#555;">PAY-${String(p.id).padStart(4, '0')}</strong></td>
                <td>
                    <div class="cell-name">
                        <div class="cell-avatar">${initials(empName)}</div>
                        <div>${escapeHtml(empName)}<span class="cell-sub">${escapeHtml(emp?.empNo || p.empId)} · ${escapeHtml(emp?.dept || '—')}</span></div>
                    </div>
                </td>
                <td>${escapeHtml(cycle)}</td>
                <td>${peso(p.salary)}</td>
                <td style="color:#1aa846;">+${peso(p.overtime)}</td>
                <td>${peso(p.gross)}</td>
                <td style="color:#c2181a;">-${peso(p.deductions)}</td>
                <td><strong>${peso(p.net)}</strong></td>
                <td><span class="status-text ${statusClassForPayroll(p.status)}">${escapeHtml(p.status)}</span></td>
                <td>
                    <div class="cell-actions" style="justify-content:flex-end;">
                        <button class="coa-view-btn" type="button" data-act="viewPayslip" data-id="${escapeHtml(p.id)}">
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>
                            View
                        </button>
                    </div>
                </td>
            </tr>`;
        }).join('');

        const missing = PH_ROWS_PER_PAGE - pageRows.length;
        for (let i = 0; i < missing; i++) {
            tbody.innerHTML += `<tr class="at-spacer-row"><td colspan="10">&nbsp;</td></tr>`;
        }

        renderPhPagination(totalPages);
    }

    /* ============ ACCOUNT MANAGEMENT (NEW) ============ */
    let amUserCache = [];
    const AM_ROWS_PER_PAGE = 7;
    let amCurrentPage = 1;
    const AM_DEPTS = ['Finance', 'HR', 'Procurement', 'Inventory', 'Sales', 'Production'];
    function amStatusClass(status) {
        const s = String(status || '').toLowerCase();
        if (s === 'active')   return 'is-paid';
        if (s === 'pending')  return 'is-fulfilling';
        if (s === 'rejected') return 'is-overdue';
        return 'is-pending';
    }
    function buildAccountManagement() {
        return `
            <section class="coa-card" data-upgrade-selects>
                <header class="coa-card-head">
                    <h3 class="coa-card-title">SYSTEM ACCOUNTS <span class="coa-card-count" id="amCount"></span></h3>
                    <div class="coa-toolbar">
                        <div class="coa-search-box">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#888" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
                            <input type="search" placeholder="Search by name, email or ID…" id="amSearch" />
                        </div>
                        <select id="amDept" class="coa-filter-select">
                            <option value="">All Departments</option>
                            ${AM_DEPTS.map(d => `<option>${escapeHtml(d)}</option>`).join('')}
                        </select>
                        <select id="amRole" class="coa-filter-select">
                            <option value="">All Positions</option>
                            ${ALL_POSITIONS.map(p => `<option>${escapeHtml(p)}</option>`).join('')}
                        </select>
                        <select id="amStatus" class="coa-filter-select">
                            <option value="">All Status</option>
                            <option>Active</option><option>Inactive</option>
                        </select>
                        ${canManageRecords() ? '<button class="coa-add-btn-top" type="button" id="amCreateBtn">+ Add Account</button>' : ''}
                    </div>
                </header>

                <div class="table-wrap coa-table-scroll">
                    <table class="coa-table">
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Department</th>
                                <th>Position</th>
                                <th>Status</th>
                                <th style="text-align:right;">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="amTbody"></tbody>
                    </table>
                </div>

                <footer class="coa-pagination" id="amPagination"></footer>
            </section>
        `;
    }
    async function loadAccountManagement() {
        try {
            const result = await apiRequest('users');
            amUserCache = result.users || [];
        } catch { amUserCache = []; }
        renderAccountManagementRows();
    }
    function renderAccountManagementRows() {
        const tbody = $('#amTbody');
        if (!tbody) return;
        const q = ($('#amSearch')?.value || '').trim().toLowerCase();
        const dept = $('#amDept')?.value || '';
        const role = $('#amRole')?.value || '';
        const status = $('#amStatus')?.value || '';
        const rows = amUserCache.filter(u => {
            const matchQ = matchesSearch(q, u.fullName, u.email, u.id, u.employeeId, u.username);
            const matchD = !dept   || u.department === dept;
            const matchR = !role   || u.position === role;
            const matchS = !status || u.status === status;
            return matchQ && matchD && matchR && matchS;
        });
        const countEl = $('#amCount');
        if (countEl) countEl.textContent = `${rows.length} of ${amUserCache.length} accounts`;
        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><p>No accounts match the current filters.</p></div></td></tr>`;
            renderAmPagination(0);
            return;
        }

        const totalPages = Math.max(1, Math.ceil(rows.length / AM_ROWS_PER_PAGE));
        if (amCurrentPage > totalPages) amCurrentPage = totalPages;
        if (amCurrentPage < 1) amCurrentPage = 1;
        const startIdx = (amCurrentPage - 1) * AM_ROWS_PER_PAGE;
        const pageRows = rows.slice(startIdx, startIdx + AM_ROWS_PER_PAGE);

        tbody.innerHTML = pageRows.map(u => {
            const hasAccount = u.id && u.id !== '' && u.status !== 'No Account';
            const empName = u.fullName || u.email || 'Unnamed';
            const statusPill = hasAccount
                ? `<span class="status-text ${amStatusClass(u.status)}">${escapeHtml(u.status)}</span>`
                : `<span class="status-text is-pending">No Account</span>`;

            const actions = hasAccount
                ? `<button class="coa-view-btn" type="button" data-am-act="reset" data-am-id="${escapeHtml(u.id)}">Reset PW</button>
                   ${u.status === 'Active'
                       ? `<button class="coa-view-btn" style="color:#c2181a;border-color:#f3c4c4;" type="button" data-am-act="deactivate" data-am-id="${escapeHtml(u.id)}">Deactivate</button>`
                       : `<button class="coa-view-btn" style="color:#1aa846;border-color:#bfe8cc;" type="button" data-am-act="activate" data-am-id="${escapeHtml(u.id)}">Activate</button>`}`
                : `<button class="coa-view-btn" type="button" data-am-act="create" data-am-emp="${escapeHtml(u.employeeId)}" data-am-name="${escapeHtml(u.fullName)}">Create Account</button>`;

            return `
            <tr data-id="${escapeHtml(u.id)}" data-empid="${escapeHtml(u.employeeId || '')}">
                <td>
                    <div class="cell-name">
                        <div class="cell-avatar">${initials(empName)}</div>
                        <div>${escapeHtml(empName)}<span class="cell-sub">${escapeHtml(u.email || u.username || '—')}</span></div>
                    </div>
                </td>
                <td>${escapeHtml(u.department || '—')}</td>
                <td>${escapeHtml(u.position || '—')}</td>
                <td>${statusPill}</td>
                <td><div class="cell-actions" style="justify-content:flex-end;">${actions}</div></td>
            </tr>`;
        }).join('');

        const missing = AM_ROWS_PER_PAGE - pageRows.length;
        for (let i = 0; i < missing; i++) {
            tbody.innerHTML += `<tr class="at-spacer-row"><td colspan="5">&nbsp;</td></tr>`;
        }

        renderAmPagination(totalPages);
    }
    function renderAmPagination(totalPages) {
        const wrap = $('#amPagination');
        if (!wrap) return;
        if (!totalPages) { wrap.innerHTML = ''; return; }
        const pages = Array.from({ length: Math.min(3, totalPages) }, (_, i) => Math.min(Math.max(1, amCurrentPage - 1), Math.max(1, totalPages - 2)) + i);
        wrap.innerHTML = `
            <div class="gc-page-controls">
                <button type="button" class="coa-page-btn" data-page="prev" aria-label="Previous page" ${amCurrentPage <= 1 ? 'disabled' : ''}>&lt;</button>
                ${pages.map(page => `<button type="button" class="coa-page-btn ${page === amCurrentPage ? 'is-active' : ''}" data-page="${page}">${page}</button>`).join('')}
                <button type="button" class="coa-page-btn" data-page="next" aria-label="Next page" ${amCurrentPage >= totalPages ? 'disabled' : ''}>&gt;</button>
                ${totalPages > 3 ? `<details class="coa-page-menu"><summary>Select Page</summary><div class="coa-page-options">${Array.from({ length: totalPages }, (_, i) => `<button type="button" class="coa-page-option" data-page="${i + 1}">${i + 1}</button>`).join('')}</div></details>` : ''}
            </div>`;
    }

    /* ==================== GOVERNMENT CONTRIBUTION (SSS / Pag-IBIG / PhilHealth) ==================== */
    const CONTRIB_ROWS_PER_PAGE = 7;
    let contribCurrentPage = 1;
    let contribActiveTab = 'sss';
    let contribSelectedId = null;
    let contribDropdownBound = false;

    const CONTRIB_AGENCIES = {
        sss:        { label: 'SSS',       full: 'Social Security System',   badge: 'SSS', logo: 'assets/logo-sss.svg' },
        pagibig:    { label: 'Pag-IBIG',  full: 'Home Insurance/Mutual Fund', badge: 'IBG', logo: 'assets/logo-pagibig.svg' },
        philhealth: { label: 'PhilHealth', full: 'Health Insurance',        badge: 'PH', logo: 'assets/logo-philhealth.png' }
    };
    /* Official agency logo inside the badge chip. */
    const agencyBadgeHtml = (key, cls) => {
        const a = CONTRIB_AGENCIES[key];
        if (!a) return '';
        return `<span class="gc-agency-badge gc-agency-${key}${cls ? ' ' + cls : ''}" aria-hidden="true"><img src="${a.logo}" alt="" draggable="false"></span>`;
    };

    function contributionTypeKey(rawType) {
        const t = String(rawType || '').toLowerCase().replace(/\s+/g, '');
        if (t === 'pag-ibig' || t === 'pagibig') return 'pagibig';
        if (t === 'philhealth') return 'philhealth';
        if (t === 'sss') return 'sss';
        return '';
    }

    // Statutory formulas (2025 schedules, per the official system formulas document):
    //   SSS      — MSC clamped to ₱4,000–₱20,000; EE = 5% of MSC, ER = 10% of MSC,
    //              employer also pays EC (₱30).
    //   PhilHealth — premium = 5% of basic salary clamped to ₱10,000–₱100,000, split 50/50.
    //   Pag-IBIG — fund salary = min(monthly basic, ₱10,000); EE = ER = 2% of fund salary.
    const CONTRIB_RULES = {
        sss: {
            compute(salary) {
                const msc = Math.min(Math.max(Number(salary) || 0, 4000), 20000);
                const ee = Math.round(msc * 0.05 * 100) / 100;
                const er = Math.round(msc * 0.10 * 100) / 100;
                const ec = 30; // employer-paid EC / SIF contribution
                return { ee, er, ec, employer: er + ec, total: ee + er + ec };
            }
        },
        philhealth: {
            compute(salary) {
                const base = Math.min(Math.max(Number(salary) || 0, 10000), 100000);
                const ee = Math.round(base * 0.05 * 100) / 200; // premium / 2
                return { ee, er: ee, ec: 0, employer: ee, total: ee + ee };
            }
        },
        pagibig: {
            compute(salary) {
                const fund = Math.min(Number(salary) || 0, 10000);
                const ee = Math.round(fund * 0.02 * 100) / 100;
                return { ee, er: ee, ec: 0, employer: ee, total: ee + ee };
            }
        }
    };

    // Shares per row: statutory agencies are recomputed from the formulas using
    // the employee's basic salary; legacy/non-statutory rows fall back to the
    // stored employee-share amount doubled (employer-mandate match).
    function contributionRowShares(row) {
        const rule = CONTRIB_RULES[contributionTypeKey(row.type)];
        if (rule && (Number(row.basicSalary) || 0) > 0) return rule.compute(row.basicSalary);
        const ee = Number(row.employeeShare) || 0;
        return { ee, er: ee, ec: 0, employer: ee, total: ee + ee };
    }

    function contributionAgencyFilter() {
        return String($('#gcDeptBtn')?.dataset.value || '');
    }

    function visibleContributionRows() {
        const q = ($('#gcSearch')?.value || '').trim().toLowerCase();
        const dept = contributionAgencyFilter();
        return store.contributions.filter(c => {
            const matchType = contributionTypeKey(c.type) === contribActiveTab;
            const text = idSearchText(c.empNo, c.empId, c.employeeName, c.period);
            const matchQ = !q || text.includes(q);
            const matchD = !dept || c.dept === dept;
            return matchType && matchQ && matchD;
        });
    }

    function contributionTotals() {
        const totals = { sss: { total: 0, ee: 0, er: 0 }, pagibig: { total: 0, ee: 0, er: 0 }, philhealth: { total: 0, ee: 0, er: 0 } };
        store.contributions.forEach(c => {
            const key = contributionTypeKey(c.type);
            if (!totals[key]) return;
            const shares = contributionRowShares(c);
            totals[key].ee += shares.ee;
            totals[key].er += shares.employer;   // ER including EC where applicable
            totals[key].total += shares.total;
        });
        return totals;
    }

    function buildContribution() {
        const totals = contributionTotals();
        const depts = [...new Set(store.contributions.map(c => c.dept).filter(Boolean))].sort();
        const statCard = (key) => {
            const agency = CONTRIB_AGENCIES[key];
            const t = totals[key];
            return `
                <div class="fin-stat-card gc-stat-card${contribActiveTab === key ? ' is-active' : ''}">
                    <div class="fin-stat-head">
                        ${agencyBadgeHtml(key)}
                        <span class="fin-stat-label">${agency.label} <span class="gc-stat-sub">${agency.full}</span></span>
                    </div>
                    <div class="fin-stat-value is-dark" id="gcStatTotal-${key}">${peso(t.total)}</div>
                    <div class="gc-stat-split">
                        <div><span>Employee Contribution</span><b id="gcStatEe-${key}">${peso(t.ee)}</b></div>
                        <div><span>Employer Contribution</span><b id="gcStatEr-${key}">${peso(t.er)}</b></div>
                    </div>
                </div>`;
        };

        return `
            <div class="emp-page-header">
                <h2 class="emp-page-title">Government Contribution</h2>
            </div>

            <div class="fin-stat-grid" style="margin-bottom:18px;">
                ${statCard('sss')}${statCard('pagibig')}${statCard('philhealth')}
            </div>

            <div class="gc-layout">
                <section class="coa-card gc-panel" id="gcPanel">
                    <header class="coa-card-head">
                        <h3 class="coa-card-title"><span id="gcTitle">${escapeHtml(CONTRIB_AGENCIES[contribActiveTab].label.toUpperCase())} Contribution</span>
                            <span class="coa-card-count" id="gcCount"></span></h3>
                        <div class="coa-toolbar">
                            <div class="gc-tabs" id="gcTabs" role="tablist" aria-label="Contribution agency">
                                <button type="button" class="gc-tab-btn${contribActiveTab === 'sss' ? ' is-active' : ''}" data-tab="sss">SSS</button>
                                <button type="button" class="gc-tab-btn${contribActiveTab === 'pagibig' ? ' is-active' : ''}" data-tab="pagibig">Pag-IBIG</button>
                                <button type="button" class="gc-tab-btn${contribActiveTab === 'philhealth' ? ' is-active' : ''}" data-tab="philhealth">PhilHealth</button>
                            </div>
                            <div class="coa-search-box">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#888" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
                                <input type="search" placeholder="Search Employee name or ID..." id="gcSearch" />
                            </div>
                            <div class="custom-filter-dropdown" data-id="gcDeptFilter">
                                <button type="button" class="custom-filter-btn" data-value="" id="gcDeptBtn" style="height: 32px; min-width: 130px; font-size: 13px;">
                                    <span class="cfb-text">All Departments</span>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
                                </button>
                                <ul class="custom-filter-menu">
                                    <li data-value="">All</li>
                                    ${depts.map(d => `<li data-value="${escapeHtml(d)}">${escapeHtml(d)}</li>`).join('')}
                                </ul>
                            </div>
                            <button class="coa-add-btn-top" type="button" data-export="contribution">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/></svg>
                                Export Report
                            </button>
                        </div>
                    </header>

                    <div class="table-wrap coa-table-scroll">
                        <table class="coa-table">
                            <thead>
                                <tr>
                                    <th>Employee ID</th>
                                    <th>Employee Name</th>
                                    <th>Department</th>
                                    <th>Basic Salary</th>
                                    <th>Employer Share</th>
                                    <th>Employee Share</th>
                                    <th>Total Contribution</th>

                                    <th style="text-align:right;">Action</th>
                                </tr>
                            </thead>
                            <tbody id="gcTbody"></tbody>
                        </table>
                    </div>

                    <footer class="coa-pagination gc-pagination" id="gcPagination"></footer>
                </section>

                <aside class="gc-details">
                    <div class="gc-details-card" id="gcDetails"></div>
                </aside>
            </div>
        `;
    }

    function renderContributionDetails(row) {
        const host = $('#gcDetails');
        if (!host) return;
        if (!row) {
            host.innerHTML = `
                <div class="gc-details-head">
                    ${agencyBadgeHtml(contribActiveTab)}
                    <div><strong>${escapeHtml(CONTRIB_AGENCIES[contribActiveTab].label)} Contribution Details</strong><span class="gc-details-sub">No record selected</span></div>
                </div>
                <div class="empty-state" style="padding:22px 8px;"><div class="empty-icon">◌</div><strong>No employee selected</strong><p>Click a row to inspect its contributions.</p></div>`;
            return;
        }
        const shares = contributionRowShares(row);
        const agency = CONTRIB_AGENCIES[contributionTypeKey(row.type)] || CONTRIB_AGENCIES[contribActiveTab];
        host.innerHTML = `
            <div class="gc-details-head">
                ${agencyBadgeHtml(contributionTypeKey(row.type) || contribActiveTab)}
                <div><strong>${escapeHtml(agency.label)} Contribution Details</strong><span class="gc-details-sub">${escapeHtml(agency.full)}</span></div>
            </div>
            <dl class="gc-detail-list">
                <div class="gc-detail-row"><span>Employee Name</span><b>${escapeHtml(row.employeeName || '—')}</b></div>
                <div class="gc-detail-row"><span>Employee ID</span><b>${escapeHtml(row.empNo || row.empId || '—')}</b></div>
                <div class="gc-detail-row"><span>Department</span><b>${escapeHtml(row.dept || '—')}</b></div>
                <div class="gc-detail-row"><span>Payroll Period</span><b>${escapeHtml(row.period || '—')}</b></div>
                <div class="gc-detail-row"><span>Employee Share (EE)</span><b>${peso(shares.ee)}</b></div>
                <div class="gc-detail-row"><span>Employer Share (ER)</span><b>${peso(shares.er)}</b></div>
                ${shares.ec > 0 ? `<div class="gc-detail-row"><span>Employer EC (EC/SIF)</span><b>${peso(shares.ec)}</b></div>` : ''}
            </dl>
            <div class="gc-breakdown">
                <div class="gc-breakdown-row"><span>Employer (${escapeHtml(agency.label)}) Contribution</span><b>${peso(shares.employer)}</b></div>
                <div class="gc-breakdown-row gc-breakdown-total"><span>Total Contribution</span><b>${peso(shares.total)}</b></div>
            </div>
            <p class="gc-note">${escapeHtml(agency.label)} amounts are remitted with the payroll cycle and are matched peso-for-peso by the employer mandate.</p>
        `;
    }

    function renderContributionPagination(totalPages, shownCount) {
        const wrap = $('#gcPagination');
        if (!wrap) return;
        const pages = totalPages === 0 ? [] : Array.from({ length: Math.min(3, totalPages) }, (_, i) => Math.min(Math.max(1, contribCurrentPage - 1), Math.max(1, totalPages - 2)) + i);
        const info = `<span class="gc-page-info">Showing ${shownCount} record${shownCount !== 1 ? 's' : ''}</span>`;
        if (!totalPages) { wrap.innerHTML = info; return; }
        const atFirst = contribCurrentPage <= 1;
        const atLast = contribCurrentPage >= totalPages;
        wrap.innerHTML = `
            ${info}
            <div class="gc-page-controls">
                <button type="button" class="coa-page-btn" data-page="prev" aria-label="Previous page" ${atFirst ? 'disabled' : ''}>&lt;</button>
                ${pages.map(page => `<button type="button" class="coa-page-btn ${page === contribCurrentPage ? 'is-active' : ''}" data-page="${page}">${page}</button>`).join('')}
                <button type="button" class="coa-page-btn" data-page="next" aria-label="Next page" ${atLast ? 'disabled' : ''}>&gt;</button>
                ${totalPages > 3 ? `<details class="coa-page-menu"><summary>Select Page</summary><div class="coa-page-options">${Array.from({ length: totalPages }, (_, i) => `<button type="button" class="coa-page-option" data-page="${i + 1}">${i + 1}</button>`).join('')}</div></details>` : ''}
            </div>`;
    }

    function renderContributionRows() {
        const tbody = $('#gcTbody');
        if (!tbody) return;

        // Stat cards always reflect the full (unfiltered) dataset of each agency.
        const totals = contributionTotals();
        Object.keys(CONTRIB_AGENCIES).forEach(key => {
            const t = totals[key];
            const totalEl = $(`#gcStatTotal-${key}`);
            const eeEl = $(`#gcStatEe-${key}`);
            const erEl = $(`#gcStatEr-${key}`);
            if (totalEl) totalEl.textContent = peso(t.total);
            if (eeEl) eeEl.textContent = peso(t.ee);
            if (erEl) erEl.textContent = peso(t.er);
        });

        const rows = visibleContributionRows();
        const countEl = $('#gcCount');
        if (countEl) countEl.textContent = `${rows.length} record${rows.length !== 1 ? 's' : ''}`;

        const totalPages = Math.max(1, Math.ceil(rows.length / CONTRIB_ROWS_PER_PAGE));
        if (contribCurrentPage > totalPages) contribCurrentPage = totalPages;
        if (contribCurrentPage < 1) contribCurrentPage = 1;
        const startIdx = (contribCurrentPage - 1) * CONTRIB_ROWS_PER_PAGE;
        const pageRows = rows.slice(startIdx, startIdx + CONTRIB_ROWS_PER_PAGE);

        if (contribSelectedId && !rows.some(r => r.id === contribSelectedId)) contribSelectedId = null;
        if (!contribSelectedId) contribSelectedId = rows[0]?.id || null;

        if (!pageRows.length) {
            tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">◌</div><strong>No contribution records</strong><p>No ${escapeHtml(CONTRIB_AGENCIES[contribActiveTab].label)} contributions match the current filters.</p></div></td></tr>`;
            renderContributionDetails(null);
            renderContributionPagination(totalPages, 0);
            return;
        }

        const selected = rows.find(r => r.id === contribSelectedId) || pageRows[0];
        contribSelectedId = selected.id;

        tbody.innerHTML = pageRows.map(c => {
            const shares = contributionRowShares(c);
            const empName = c.employeeName || c.empId;
            return `
            <tr data-id="${escapeHtml(c.id || '')}" class="${c.id === selected.id ? 'is-selected' : ''}">
                <td><strong style="font-family:monospace;color:#555;">${escapeHtml(c.empNo || c.empId)}</strong></td>
                <td>${escapeHtml(empName)}</td>
                <td>${escapeHtml(c.dept || '—')}</td>
                <td>${peso(c.basicSalary)}</td>
                <td>${peso(shares.employer)}</td>
                <td>${peso(shares.ee)}</td>
                <td><strong>${peso(shares.total)}</strong></td>
                <td>
                    <div class="cell-actions" style="justify-content:flex-end;">
                        <button class="coa-view-btn" type="button" data-act="viewContribution" data-id="${escapeHtml(c.id)}">View</button>
                    </div>
                </td>
            </tr>`;
        }).join('');

        const missing = CONTRIB_ROWS_PER_PAGE - pageRows.length;
        for (let i = 0; i < missing; i++) {
            tbody.innerHTML += `<tr class="at-spacer-row"><td colspan="8">&nbsp;</td></tr>`;
        }

        renderContributionDetails(selected);
        renderContributionPagination(totalPages, rows.length);
    }

    // Split view-modal (same pattern as openPayslip) for one contribution record.
    function openContributionView(c) {
        const shares = contributionRowShares(c);
        const agency = CONTRIB_AGENCIES[contributionTypeKey(c.type)] || { label: 'Contribution', full: '' };
        const emp = empById(c.empId);
        const empName = c.employeeName || emp?.name || c.empId || '—';

        openModal({
            title: ' ',
            onCancel: closeModal,
            body: `
                <div class="view-modal-split">
                    <div class="view-modal-left">
                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:32px;">
                            <img src="assets/logo.png" style="height:44px;width:auto;object-fit:contain;flex-shrink:0;" alt="DEVS logo">
                            <img src="assets/icon-devs.png" style="width:130px;height:auto;object-fit:contain;" alt="DEVS">
                        </div>
                        <h3 style="margin:0 0 8px;font-size:17px;font-weight:700;text-transform:uppercase;letter-spacing:0.03em;">${escapeHtml(agency.label.toUpperCase())} CONTRIBUTION</h3>
                        <p style="margin:0;font-size:13px;line-height:1.5;color:rgba(255,255,255,0.82);">${escapeHtml(agency.label)} ${escapeHtml(agency.full)} details for payroll period ${escapeHtml(c.period || '—')}.</p>
                        <div style="margin-top:auto;padding-bottom:16px;display:flex;justify-content:center;align-items:flex-end;">
                            ${agency.logo
                                ? `<span class="gc-view-logo"><img src="${agency.logo}" alt="" draggable="false"></span>`
                                : `<svg viewBox="0 0 120 120" width="120" height="120" style="opacity:0.22;" fill="none" stroke="white" stroke-width="4" aria-hidden="true">
                                <path d="M60 12 100 30v28c0 24-17 41-40 50-23-9-40-26-40-50V30Z"/>
                                <path d="M44 58l11 11 21-21" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>`}
                        </div>
                    </div>
                    <div class="view-modal-right">
                        <div class="view-emp-head">
                            <div class="view-emp-avatar">${initials(empName)}</div>
                            <div>
                                <h2>${escapeHtml(c.id || '—')}</h2>
                                <p class="view-subtitle" style="margin:0 !important;">${escapeHtml(empName)} · ${escapeHtml(c.dept || emp?.dept || '—')}</p>
                            </div>
                        </div>

                        <div class="view-data-list">
                            <div class="view-modal-row"><span>Employee ID:</span> <strong>${escapeHtml(c.empNo || c.empId || '—')}</strong></div>
                            <div class="view-modal-row"><span>Agency:</span> <strong>${escapeHtml(agency.label)} — ${escapeHtml(agency.full)}</strong></div>
                            <div class="view-modal-row"><span>Department:</span> <strong>${escapeHtml(c.dept || emp?.dept || '—')}</strong></div>
                            <div class="view-modal-row"><span>Payroll Period:</span> <strong>${escapeHtml(c.period || '—')}</strong></div>
                            <div class="view-modal-row"><span>Basic Salary:</span> <strong>${peso(c.basicSalary)}</strong></div>
                            <div class="view-modal-row"><span>Employee Share (EE):</span> <strong style="color:#c2181a;">${peso(shares.ee)}</strong></div>
                            <div class="view-modal-row"><span>Employer Share (ER):</span> <strong style="color:#1aa846;">${peso(shares.er)}</strong></div>
                            ${shares.ec > 0 ? `<div class="view-modal-row"><span>Employer EC (EC/SIF):</span> <strong style="color:#1aa846;">${peso(shares.ec)}</strong></div>` : ''}
                            <div class="view-modal-row" style="border-top:1px solid #f0e0e0;padding-top:10px;margin-top:6px;">
                                <span>Total Contribution:</span> <strong style="color:#c2181a;font-size:15px;">${peso(shares.total)}</strong>
                            </div>
                        </div>

                        <div style="text-align:right;margin-top:28px;display:flex;justify-content:flex-end;gap:10px;">
                            <button class="acc-btn-cancel" type="button" data-act="cancel">Close</button>
                        </div>
                    </div>
                </div>
            `
        });

        const modalEl = document.getElementById('modal');
        if (modalEl) modalEl.className = 'modal modal-split receivable-view-modal';
    }

    function handleContributionAction(event) {
        const viewBtn = event.target.closest('[data-act="viewContribution"]');
        const tr = event.target.closest('tr[data-id]');
        if (!tr) return;
        const id = viewBtn ? viewBtn.dataset.id : tr.dataset.id;
        const record = store.contributions.find(c => String(c.id) === String(id));
        if (record) {
            contribSelectedId = record.id;
            renderContributionRows();
            if (viewBtn) openContributionView(record);
        }
    }

    function setupContributionDeptDropdown() {
        const dd = $('.custom-filter-dropdown[data-id="gcDeptFilter"]');
        if (!dd) return;
        const btn = dd.querySelector('.custom-filter-btn');
        const label = dd.querySelector('.cfb-text');
        const menu = dd.querySelector('.custom-filter-menu');
        if (!btn || !label || !menu) return;

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            dd.classList.toggle('open');
        });

        menu.addEventListener('click', (e) => {
            const li = e.target.closest('li');
            if (!li) return;
            const value = li.dataset.value || '';
            btn.dataset.value = value;
            label.textContent = value || 'All Departments';
            btn.classList.toggle('is-active', !!value);
            menu.querySelectorAll('li').forEach(item => item.classList.toggle('is-selected', item === li));
            dd.classList.remove('open');
            contribCurrentPage = 1;
            renderContributionRows();
        });

        if (!contribDropdownBound) {
            contribDropdownBound = true;
            document.addEventListener('click', (ev) => {
                if (ev.target.closest('.custom-filter-dropdown')) return;
                document.querySelectorAll('.custom-filter-dropdown.open').forEach(open => open.classList.remove('open'));
            });
        }
    }


    /* ==================== 13TH MONTH PAY ==================== */
    const TM_ROWS_PER_PAGE = 7;
    let tmCurrentPage = 1;

    // 13th Month Pay = Total basic salary earned for the year ÷ 12.
    // With a full year of service this equals one (1) monthly basic salary.
    function tm13thMonthAmount(emp) {
        const monthly = Number(emp?.salary) || 0;
        return Math.round(((monthly * 12) / 12) * 100) / 100;
    }

    function tmVisibleRows() {
        const q = ($('#tmSearch')?.value || '').trim().toLowerCase();
        return store.employees.filter(e =>
            matchesSearch(q, e.name, e.id, e.empNo, e.dept, e.status));
    }

    function build13thMonth() {
        const total = store.employees.reduce((s, e) => s + tm13thMonthAmount(e), 0);
        return `
            <div class="emp-page-header">
                <h2 class="emp-page-title">13th Month Pay</h2>
            </div>

            <div class="fin-stat-grid" style="margin-bottom:18px;">
                <div class="fin-stat-card chip-amber">
                    <div class="fin-stat-head">
                        <span class="fin-stat-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12v10H4V12"/><path d="M2 7h20v5H2z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
                        </span>
                        <span class="fin-stat-label">Total 13th Month Payable</span>
                    </div>
                    <div class="fin-stat-value is-dark" id="tmStatTotal">${peso(total)}</div>
                </div>
                <div class="fin-stat-card chip-blue">
                    <div class="fin-stat-head">
                        <span class="fin-stat-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        </span>
                        <span class="fin-stat-label">Employees Covered</span>
                    </div>
                    <div class="fin-stat-value is-dark" id="tmStatCount">${store.employees.length}</div>
                </div>
            </div>

            <section class="coa-card" id="tmPanel">
                <header class="coa-card-head">
                    <h3 class="coa-card-title">13TH MONTH PAYABLE <span class="coa-card-count" id="tmCount"></span></h3>
                    <div class="coa-toolbar">
                        <div class="coa-search-box">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#888" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
                            <input type="search" placeholder="Search Employee name or ID..." id="tmSearch" />
                        </div>
                        <button class="coa-add-btn-top" type="button" id="tmCalcBtn">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8"/><path d="M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/></svg>
                            Calculate Total Payable
                        </button>
                        <button class="coa-add-btn-top" type="button" data-export="13thmonth">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/></svg>
                            Export Report
                        </button>
                    </div>
                </header>

                <div class="table-wrap coa-table-scroll">
                    <table class="coa-table">
                        <thead>
                            <tr>
                                <th>Employee ID</th>
                                <th>Employee</th>
                                <th>13th Month ID</th>
                                <th>Payroll ID</th>
                                <th style="text-align:right;">Action</th>
                            </tr>
                        </thead>
                        <tbody id="tmTbody"></tbody>
                    </table>
                </div>

                <footer class="coa-pagination" id="tmPagination"></footer>
            </section>
        `;
    }

    function render13Pagination(totalPages) {
        const wrap = $('#tmPagination');
        if (!wrap) return;
        if (!totalPages) { wrap.innerHTML = ''; return; }
        const pages = Array.from({ length: Math.min(3, totalPages) }, (_, i) => Math.min(Math.max(1, tmCurrentPage - 1), Math.max(1, totalPages - 2)) + i);
        wrap.innerHTML = `
            <div class="gc-page-controls">
                <button type="button" class="coa-page-btn" data-page="prev" aria-label="Previous page" ${tmCurrentPage <= 1 ? 'disabled' : ''}>&lt;</button>
                ${pages.map(page => `<button type="button" class="coa-page-btn ${page === tmCurrentPage ? 'is-active' : ''}" data-page="${page}">${page}</button>`).join('')}
                <button type="button" class="coa-page-btn" data-page="next" aria-label="Next page" ${tmCurrentPage >= totalPages ? 'disabled' : ''}>&gt;</button>
                ${totalPages > 3 ? `<details class="coa-page-menu"><summary>Select Page</summary><div class="coa-page-options">${Array.from({ length: totalPages }, (_, i) => `<button type="button" class="coa-page-option" data-page="${i + 1}">${i + 1}</button>`).join('')}</div></details>` : ''}
            </div>`;
    }

    function render13MonthRows() {
        const tbody = $('#tmTbody');
        if (!tbody) return;

        const total = store.employees.reduce((s, e) => s + tm13thMonthAmount(e), 0);
        const totalEl = $('#tmStatTotal');
        if (totalEl) totalEl.textContent = peso(total);
        const cntEl = $('#tmStatCount');
        if (cntEl) cntEl.textContent = String(store.employees.length);

        const rows = tmVisibleRows();
        const countEl = $('#tmCount');
        if (countEl) countEl.textContent = `${rows.length} record${rows.length !== 1 ? 's' : ''}`;

        const totalPages = Math.max(1, Math.ceil(rows.length / TM_ROWS_PER_PAGE));
        if (tmCurrentPage > totalPages) tmCurrentPage = totalPages;
        if (tmCurrentPage < 1) tmCurrentPage = 1;
        const startIdx = (tmCurrentPage - 1) * TM_ROWS_PER_PAGE;
        const pageRows = rows.slice(startIdx, startIdx + TM_ROWS_PER_PAGE);

        if (!pageRows.length) {
            tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">◌</div><strong>No employees found</strong><p>No employees match the current search.</p></div></td></tr>`;
            render13Pagination(totalPages);
            return;
        }

        const dbRecById = new Map((store.thirteenthMonth || []).map(t => [String(t.empId), t]));
        const formatThId = (id) => {
            const n = parseInt(id, 10);
            return Number.isFinite(n) && n > 0 ? `TH-${String(n).padStart(4, '0')}` : '—';
        };
        const formatPayId = (id) => {
            const n = parseInt(id, 10);
            return Number.isFinite(n) && n > 0 ? `PAY-${String(n).padStart(4, '0')}` : '—';
        };

        tbody.innerHTML = pageRows.map(e => {
            const dbRec = dbRecById.get(String(e.id));
            return `
            <tr data-id="${escapeHtml(e.id)}">
                <td><strong style="font-family:monospace;color:#555;">${escapeHtml(e.empNo || ('EMP-' + String(e.id).padStart(3, '0')))}</strong></td>
                <td>
                    <div class="cell-name">
                        <div class="cell-avatar">${initials(e.name)}</div>
                        <div>${escapeHtml(e.name)}<span class="cell-sub">${escapeHtml(e.position || 'Staff')} · ${escapeHtml(e.dept || '—')}</span></div>
                    </div>
                </td>
                <td><strong style="font-family:monospace;color:#555;">${escapeHtml(formatThId(dbRec?.id))}</strong></td>
                <td><strong style="font-family:monospace;color:#555;">${escapeHtml(formatPayId(dbRec?.payrollId))}</strong></td>
                <td>
                    <div class="cell-actions" style="justify-content:flex-end;">
                        <button class="coa-view-btn" type="button" data-act="view13" data-id="${escapeHtml(e.id)}">View</button>
                    </div>
                </td>
            </tr>`;
        }).join('');

        const missing = TM_ROWS_PER_PAGE - pageRows.length;
        for (let i = 0; i < missing; i++) {
            tbody.innerHTML += `<tr class="at-spacer-row"><td colspan="5">&nbsp;</td></tr>`;
        }

        render13Pagination(totalPages);
    }

    // Per-employee split view-modal (same pattern as openPayslip / openContributionView).
    function open13MonthView(emp) {
        const monthly = Number(emp?.salary) || 0;
        const annual = monthly * 12;
        const thirteenth = tm13thMonthAmount(emp);
        const empNo = emp?.empNo || `EMP-${String(emp?.id || '').padStart(3, '0')}`;
        // Posted database record for this employee (thirteenth_month_pay table).
        const dbRec = (store.thirteenthMonth || []).find(t => String(t.empId) === String(emp?.id));

        openModal({
            title: ' ',
            onCancel: closeModal,
            body: `
                <div class="view-modal-split">
                    <div class="view-modal-left">
                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:32px;">
                            <img src="assets/logo.png" style="height:44px;width:auto;object-fit:contain;flex-shrink:0;" alt="DEVS logo">
                            <img src="assets/icon-devs.png" style="width:130px;height:auto;object-fit:contain;" alt="DEVS">
                        </div>
                        <h3 style="margin:0 0 8px;font-size:17px;font-weight:700;text-transform:uppercase;letter-spacing:0.03em;">13TH MONTH PAY</h3>
                        <p style="margin:0;font-size:13px;line-height:1.5;color:rgba(255,255,255,0.82);">Year-end bonus computation for ${escapeHtml(emp?.name || '—')}.</p>
                        <div style="margin-top:auto;padding-bottom:16px;display:flex;justify-content:center;align-items:flex-end;">
                            <svg viewBox="0 0 120 120" width="120" height="120" style="opacity:0.22;" fill="none" stroke="white" stroke-width="4" aria-hidden="true">
                                <rect x="20" y="14" width="80" height="96" rx="8"/>
                                <path d="M34 40h52M34 58h52M34 76h30" stroke-linecap="round"/>
                                <circle cx="90" cy="92" r="16" fill="none" stroke="white" stroke-width="4"/>
                                <path d="M84 92h12M90 86v12" stroke-linecap="round"/>
                            </svg>
                        </div>
                    </div>
                    <div class="view-modal-right">
                        <div class="view-emp-head">
                            <div class="view-emp-avatar">${initials(emp?.name)}</div>
                            <div>
                                <h2>${escapeHtml(empNo)}</h2>
                                <p class="view-subtitle" style="margin:0 !important;">${escapeHtml(emp?.name || '—')} · ${escapeHtml(emp?.dept || '—')}</p>
                            </div>
                        </div>

                        <div class="view-data-list">
                            <div class="view-modal-row"><span>Employee Name:</span> <strong>${escapeHtml(emp?.name || '—')}</strong></div>
                            <div class="view-modal-row"><span>Department:</span> <strong>${escapeHtml(emp?.dept || '—')}</strong></div>
                            <div class="view-modal-row"><span>Position:</span> <strong>${escapeHtml(emp?.position || 'Staff')}</strong></div>
                            <div class="view-modal-row"><span>Employment Status:</span> <strong>${escapeHtml(emp?.status || '—')}</strong></div>
                            <div class="view-modal-row"><span>Monthly Basic Salary:</span> <strong>${peso(monthly)}</strong></div>
                            <div class="view-modal-row"><span>Annual Basic Salary (×12):</span> <strong>${peso(annual)}</strong></div>
                            <div class="view-modal-row" style="border-top:1px solid #f0e0e0;padding-top:10px;margin-top:6px;">
                                <span>13th Month Pay (÷12):</span> <strong style="color:#c2181a;font-size:15px;">${peso(thirteenth)}</strong>
                            </div>
                            <div class="view-modal-row" style="border-top:1px solid #f0e0e0;padding-top:10px;margin-top:6px;">
                                <span>Database Record:</span> <strong>${dbRec ? `<span class="status-text ${String(dbRec.status).toLowerCase() === 'paid' ? 'is-paid' : 'is-fulfilling'}">${escapeHtml(dbRec.status)}</span>` : '<span style="color:#999;">Not yet posted</span>'}</strong>
                            </div>
                            ${dbRec ? `
                            <div class="view-modal-row"><span>Posted Amount:</span> <strong>${peso(dbRec.amount)}</strong></div>
                            <div class="view-modal-row"><span>Payment Date:</span> <strong>${escapeHtml(dbRec.paymentDate || '—')}</strong></div>
                            ${dbRec.payrollId ? `<div class="view-modal-row"><span>Linked Payroll:</span> <strong style="font-family:monospace;">PAY-${String(dbRec.payrollId).padStart(4, '0')}</strong></div>` : ''}
                            ` : ''}
                        </div>

                        <p style="margin:14px 0 0;font-size:11.5px;line-height:1.5;color:#777;background:#fafafa;border:1px solid #f0f0f0;border-radius:8px;padding:9px 11px;">
                            13th Month Pay = Total basic salary earned for the year ÷ 12. With a full year of service, this equals one (1) monthly basic salary and is payable on or before December 24.
                        </p>

                        <div style="text-align:right;margin-top:28px;display:flex;justify-content:flex-end;gap:10px;">
                            <button class="acc-btn-cancel" type="button" data-act="cancel">Close</button>
                        </div>
                    </div>
                </div>
            `
        });

        const modalEl = document.getElementById('modal');
        if (modalEl) modalEl.className = 'modal modal-split receivable-view-modal';
    }

    // Calculate 13th Month Pay modal — red header, per-employee
    // computation table (Basic Earned ÷12 → 13th Mo. Pay) and TOTAL PAYABLE row.
    let lastCalc13 = null; // rows of the most recent Calculate run (posted on Done Calculation)

    function open13MonthCalcModal() {
        const year = new Date().getFullYear();

        const calc13Render = () => {
            const scope = $('#tmCalcScope')?.value || 'all';
            let list = store.employees.slice();
            if (scope === 'active') list = list.filter(emp => String(emp.status).toLowerCase() === 'active');
            if (scope === 'individual') {
                const empId = $('#tmCalcEmp')?.value;
                list = list.filter(emp => String(emp.id) === String(empId));
            }
            const rows = list.map(emp => {
                const monthly = Number(emp?.salary) || 0;
                return {
                    empId: emp.id,
                    id: emp.empNo || ('EMP-' + String(emp.id).padStart(3, '0')),
                    name: emp.name,
                    annual: monthly * 12,
                    amount: tm13thMonthAmount(emp)
                };
            });
            lastCalc13 = rows;
            const total = rows.reduce((s, r) => s + r.amount, 0);
            const host = $('#tmCalcResult');
            if (!host) return;
            host.innerHTML = rows.length ? `
                <table class="tm13-table">
                    <thead><tr><th>Employee</th><th>Basic Earned</th><th>13th Mo. Pay</th></tr></thead>
                    <tbody>
                        ${rows.map(r => `
                            <tr>
                                <td><div class="tm13-emp"><b>${escapeHtml(r.id)}</b><span>${escapeHtml(r.name)}</span></div></td>
                                <td><div class="tm13-earned"><span>${peso(r.annual)}</span><i>&divide;12</i></div></td>
                                <td><b>${peso(r.amount)}</b></td>
                            </tr>`).join('')}
                    </tbody>
                </table>
                <div class="tm13-total"><span>TOTAL PAYABLE:</span><b>${peso(total)}</b></div>
                <div class="tm13-confirm">Calculate confirmed &ndash; Payable total updated</div>
            ` : `<div class="empty-state"><div class="empty-icon">◌</div><strong>No employees to compute</strong><p>No employees match the selected scope.</p></div>`;
        };

        openModal({
            title: ' ',
            size: 'lg',
            onCancel: closeModal,
            onExtraClick: (e) => {
                if (e.target.closest('[data-act="calc13run"]')) { calc13Render(); return true; }
                if (e.target.closest('[data-act="calc13done"]')) {
                    // Done Calculation persists the last computed scope into the
                    // thirteenth_month_pay table, then closes the modal.
                    (async () => {
                        const rows = lastCalc13 || [];
                        if (rows.length) {
                            try {
                                const r = await apiRequest('thirteenthMonth.save', {
                                    method: 'POST',
                                    body: JSON.stringify({ rows: rows.map(x => ({ empId: x.empId, amount: x.amount })) })
                                });
                                store.thirteenthMonth = r.records || store.thirteenthMonth;
                                toast(`Saved ${r.saved ?? rows.length} 13th month record(s) to the database.`, 'success');
                            } catch (err) {
                                toast(err.message || 'Failed to save 13th month records.', 'error');
                            }
                        }
                        closeModal();
                        render13MonthRows();
                    })();
                    return true;
                }
                return false;
            },
            body: `
                <div class="tm13-head">
                    <span class="tm13-gear" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.08a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.08a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.08a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                    </span>
                    <div class="tm13-head-text">
                        <h3>Calculate 13th Month Pay</h3>
                        <p>Pay period: January ${year} - December ${year}</p>
                    </div>
                    <button class="tm13-x" type="button" data-act="cancel" aria-label="Close">&times;</button>
                </div>
                <div class="tm13-wrap">
                    <div class="tm13-controls">
                        <label for="tmCalcScope">Employee Scope</label>
                        <select id="tmCalcScope">
                            <option value="all">All employees</option>
                            <option value="active">Active employees only</option>
                            <option value="individual">Individual employee</option>
                        </select>
                        <div class="tm13-emp-field" id="tmCalcEmpField" style="display:none;">
                            <label for="tmCalcEmp">Select Employee</label>
                            <select id="tmCalcEmp">
                                ${store.employees.map(emp => `<option value="${escapeHtml(emp.id)}">${escapeHtml(emp.name)} (${escapeHtml(emp.empNo || ('EMP-' + String(emp.id).padStart(3, '0')))})</option>`).join('')}
                            </select>
                        </div>
                        <button class="tm13-calc-btn" type="button" data-act="calc13run">Calculate</button>
                    </div>

                    <div id="tmCalcResult">
                        <div class="empty-state" style="padding:22px 8px;"><div class="empty-icon">②</div><strong>Nothing calculated yet</strong><p>Set the employee scope, then click <b>Calculate</b> to compute the 13th month pay payable.</p></div>
                    </div>

                    <div class="tm13-actions">
                        <button class="tm13-done-btn" type="button" data-act="calc13done">Done Calculation</button>
                    </div>
                </div>
            `
        });

        // Show the individual-employee dropdown only when that scope is selected.
        const syncEmpField = () => {
            const field = $('#tmCalcEmpField');
            if (field) field.style.display = ($('#tmCalcScope')?.value === 'individual') ? 'flex' : 'none';
        };
        $('#tmCalcScope')?.addEventListener('change', syncEmpField);
        syncEmpField();

        const modalEl = document.getElementById('modal');
        if (modalEl) modalEl.className = 'modal modal-lg tm13-calc-modal';
    }


    function buildDeductions() {
        dedCurrentPage = 1;
        const types = [...new Set(deductionRows().map(d => d.type).filter(Boolean))];
        return `
            <div class="emp-page-header">
                <h2 class="emp-page-title">Deductions</h2>
                <button class="coa-export-top-btn" type="button" data-export="deductions">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/></svg>
                    Export PDF / Excel
                </button>
            </div>

            <section class="coa-card">
                <header class="coa-card-head">
                    <h3 class="coa-card-title">DEDUCTION LIST <span class="coa-card-count" id="dedCount"></span></h3>
                    <div class="coa-toolbar">
                        <div class="coa-search-box">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#888" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
                            <input type="search" placeholder="Search employee, ID or type..." id="dedSearch" />
                        </div>
                        <div class="custom-filter-dropdown" data-id="dedTypeFilter">
                            <button type="button" class="custom-filter-btn" data-value="" style="height: 32px; min-width: 150px; font-size: 13px;">
                                <span class="cfb-text">Select Type</span>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
                            </button>
                            <ul class="custom-filter-menu">
                                <li data-value="">All</li>
                                ${types.map(t => `<li data-value="${escapeHtml(t)}">${escapeHtml(t)}</li>`).join('')}
                            </ul>
                        </div>
                        <div class="custom-filter-dropdown" data-id="dedStatusFilter">
                            <button type="button" class="custom-filter-btn" data-value="" style="height: 32px; min-width: 135px; font-size: 13px;">
                                <span class="cfb-text">Select Status</span>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
                            </button>
                            <ul class="custom-filter-menu">
                                <li data-value="">All</li>
                                <li data-value="Applied">Applied</li>
                                <li data-value="Pending">Pending</li>
                                <li data-value="Cancelled">Cancelled</li>
                            </ul>
                        </div>
                    </div>
                </header>

                <div class="table-wrap coa-table-scroll">
                    <table class="coa-table">
                        <thead>
                            <tr>
                                <th>Employee ID</th>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Period</th>
                                <th>Amount ₱</th>
                                <th>Status</th>
                                <th style="text-align:right;">Action</th>
                            </tr>
                        </thead>
                        <tbody id="dedTbody"></tbody>
                    </table>
                </div>

                <footer class="coa-pagination" id="dedPagination"></footer>
            </section>
        `;
    }

    const DED_ROWS_PER_PAGE = 7;
    let dedCurrentPage = 1;
    let dedDropdownOutsideBound = false;

    function dedFilterState() {
        return {
            q: ($('#dedSearch')?.value || '').trim().toLowerCase(),
            type: $('.custom-filter-dropdown[data-id="dedTypeFilter"] .custom-filter-btn')?.dataset.value || '',
            status: $('.custom-filter-dropdown[data-id="dedStatusFilter"] .custom-filter-btn')?.dataset.value || ''
        };
    }

    function visibleDeductionGroups() {
        const { q, type, status } = dedFilterState();
        return deductionGroups().map(g => {
            const emp = empById(g.empId);
            // A type filter narrows the account to just that deduction type, so
            // the amount shown reflects the filtered deduction.
            const items = type ? g.items.filter(d => d.type === type) : g.items;
            if (!items.length) return null;
            const amount = items.reduce((s, d) => s + (Number(d.amount) || 0), 0);
            const statuses = items.map(d => d.status);
            const st = statuses.includes('Pending') ? 'Pending'
                : statuses.includes('Applied') ? 'Applied'
                : (statuses[0] || 'Applied');
            const allText = g.items.map(d => idSearchText(d.id, d.empId, emp?.id, emp?.empNo, emp?.name || '', d.type, d.period, d.status)).join(' ');
            const text = idSearchText(g.id, g.empId, emp?.id, emp?.empNo, emp?.name || '', deductionGroupLabel(g), g.period, st) + ' ' + allText;
            if (q && !text.includes(q)) return null;
            if (status && st !== status) return null;
            return { ...g, items, amount, status: st };
        }).filter(Boolean);
    }

    function renderDeductionRows() {
        const tbody = $('#dedTbody');
        if (!tbody) return;
        const rows = visibleDeductionGroups();
        const countEl = $('#dedCount');
        const total = rows.reduce((s, g) => s + Number(g.amount || 0), 0);
        if (countEl) countEl.textContent = `${rows.length} account(s) · Total: ${peso(total)}`;

        // Pagination — fixed page height via spacer rows
        const totalPages = Math.max(1, Math.ceil(rows.length / DED_ROWS_PER_PAGE));
        if (dedCurrentPage > totalPages) dedCurrentPage = totalPages;
        if (dedCurrentPage < 1) dedCurrentPage = 1;
        const startIdx = (dedCurrentPage - 1) * DED_ROWS_PER_PAGE;
        const pageRows = rows.slice(startIdx, startIdx + DED_ROWS_PER_PAGE);

        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">◌</div><strong>No deductions found</strong><p>No records match the current filters.</p></div></td></tr>`;
            renderDedPagination(totalPages);
            return;
        }
        tbody.innerHTML = pageRows.map(g => {
            const emp = empById(g.empId);
            const empName = emp ? emp.name : String(g.empId);
            const empNo = emp?.empNo || String(emp?.id || g.empId).padStart(5, '0');
            const statusClass = g.status === 'Applied' ? 'is-paid' : (g.status === 'Pending' ? 'is-fulfilling' : 'is-pending');
            const count = g.items.length;
            const types = [...new Set(g.items.map(d => d.type).filter(Boolean))];
            let typeHtml;
            if (types.length <= 1) {
                typeHtml = escapeHtml(types[0] || 'Deduction');
            } else if (types.length === 2) {
                typeHtml = `${escapeHtml(types.join(' + '))} <span class="ded-combined-tag">${count} combined</span>`;
            } else {
                typeHtml = escapeHtml(`${types.length} deductions`);
            }
            return `
                <tr data-id="${escapeHtml(String(g.id))}">
                    <td>${escapeHtml(empNo)}</td>
                    <td style="text-align:left"><div class="cell-name"><div class="cell-avatar">${initials(empName)}</div><div>${escapeHtml(empName)}</div></div></td>
                    <td>${typeHtml}</td>
                    <td>${escapeHtml(g.period)}</td>
                    <td><strong>${peso(g.amount)}</strong></td>
                    <td><span class="status-text ${statusClass}">${escapeHtml(g.status)}</span></td>
                    <td style="text-align:right">
                        <button class="coa-view-btn" type="button" data-act="viewDed" data-id="${escapeHtml(String(g.id))}">
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>
                            View
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        const missingRows = DED_ROWS_PER_PAGE - pageRows.length;
        for (let i = 0; i < missingRows; i++) {
            tbody.innerHTML += `<tr class="at-spacer-row"><td colspan="7">&nbsp;</td></tr>`;
        }

        renderDedPagination(totalPages);
    }

    function setupDedFilterDropdowns() {
        [
            { id: 'dedTypeFilter', fallback: 'Select Type' },
            { id: 'dedStatusFilter', fallback: 'Select Status' }
        ].forEach(({ id, fallback }) => {
            const dd = $(`.custom-filter-dropdown[data-id="${id}"]`);
            if (!dd) return;
            const btn = dd.querySelector('.custom-filter-btn');
            const label = dd.querySelector('.cfb-text');
            const menu = dd.querySelector('.custom-filter-menu');
            if (!btn || !label || !menu) return;

            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                dd.classList.toggle('open');
            });

            menu.addEventListener('click', (e) => {
                const li = e.target.closest('li');
                if (!li) return;
                const value = li.dataset.value || '';
                btn.dataset.value = value;
                label.textContent = value || fallback;
                btn.classList.toggle('is-active', !!value);
                menu.querySelectorAll('li').forEach(item => item.classList.toggle('is-selected', item === li));
                dd.classList.remove('open');
                dedCurrentPage = 1;
                renderDeductionRows();
            });
        });

        if (!dedDropdownOutsideBound) {
            dedDropdownOutsideBound = true;
            document.addEventListener('click', (ev) => {
                if (ev.target.closest('.custom-filter-dropdown')) return;
                document.querySelectorAll('.custom-filter-dropdown.open').forEach(open => open.classList.remove('open'));
            });
        }
    }

    function renderDedPagination(totalPages) {
        const wrap = $('#dedPagination');
        if (!wrap) return;

        const startPage = totalPages <= 3 ? 1 : Math.min(Math.max(1, dedCurrentPage - 1), totalPages - 2);
        const pages = Array.from({ length: Math.min(3, totalPages) }, (_, index) => startPage + index);
        const atFirst = dedCurrentPage <= 1;
        const atLast  = dedCurrentPage >= totalPages;

        wrap.innerHTML = `
            <button type="button" class="coa-page-btn" data-page="prev" aria-label="Previous page" ${atFirst ? 'disabled' : ''}>&lt;</button>
            ${pages.map(page => `<button type="button" class="coa-page-btn ${page === dedCurrentPage ? 'is-active' : ''}" data-page="${page}">${page}</button>`).join('')}
            <button type="button" class="coa-page-btn" data-page="next" aria-label="Next page" ${atLast ? 'disabled' : ''}>&gt;</button>
            ${totalPages > 3 ? `<details class="coa-page-menu"><summary>Select Page</summary><div class="coa-page-options">${Array.from({ length: totalPages }, (_, index) => `<button type="button" class="coa-page-option" data-page="${index + 1}">${index + 1}</button>`).join('')}</div></details>` : ''}
        `;
    }

    function handleDedPagination(e) {
        const btn = e.target.closest('.coa-page-btn, .coa-page-option');
        if (!btn || btn.disabled) return;
        const totalPages = Math.max(1, Math.ceil(visibleDeductionGroups().length / DED_ROWS_PER_PAGE));
        const target = btn.dataset.page;
        if (target === 'prev') dedCurrentPage = Math.max(1, dedCurrentPage - 1);
        else if (target === 'next') dedCurrentPage = Math.min(totalPages, dedCurrentPage + 1);
        else dedCurrentPage = Number(target) || 1;
        renderDeductionRows();
    }

    function buildSettings() {
        const profile = JSON.parse(localStorage.getItem('devs_profile') || '{}');
        const fullName = profile.fullName || 'Administrator';
        const email = profile.email || 'admin@devs.com';
        const phone = profile.phone || '+63...';
        const nameParts = fullName.trim().split(/\s+/);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
        const role = profile.position || profile.role || 'HR Administrator';
        const address = store.settings.address || {
            country: 'Philippines', city: 'City/State', province: 'Province',
            street: 'Street No./Building', brgy: 'Brgy'
        };
        const reqSvg = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#a01515" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
        return `
            <section class="settings-page">
                <div class="settings-header">
                    <span class="settings-header-icon">⚙</span><h2>SETTINGS</h2>
                </div>
                <div class="settings-layout">
                    <div class="settings-tabs">
                        <button class="sett-tab active" data-tab="profile">My Profile</button>
                    </div>
                    <div class="settings-content">
                        <div class="sett-pane active" id="pane-profile">
                            <div class="sett-section-head">My Profile</div>
                            <div class="sett-card sett-profile-card">
                                <div class="sett-avatar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-7 8-7s8 3 8 7"/></svg></div>
                                <div class="sett-profile-info"><h3>${escapeHtml(lastName ? `${lastName}, ${firstName}` : firstName)}</h3><p>${escapeHtml(role)}</p></div>
                            </div>
                            <div class="sett-card">
                                <div class="sett-card-header"><h3>Personal Information</h3><button class="sett-edit-btn" id="editPersonalBtn">${reqSvg} EDIT</button></div>
                                <div class="sett-view-data" id="view-personal"><div class="sett-grid">
                                    <div><span>First Name</span><strong>${escapeHtml(firstName)}</strong></div><div><span>Last Name</span><strong>${escapeHtml(lastName)}</strong></div>
                                    <div><span>Email Address</span><strong>${escapeHtml(email)}</strong></div><div><span>Phone</span><strong>${escapeHtml(phone)}</strong></div>
                                </div></div>
                                <div class="sett-edit-data" id="edit-personal" style="display:none;"><div class="sett-grid">
                                    <div class="sett-field"><label>First Name</label><input type="text" id="sett-firstName" value="${escapeHtml(firstName)}" /></div>
                                    <div class="sett-field"><label>Last Name</label><input type="text" id="sett-lastName" value="${escapeHtml(lastName)}" /></div>
                                    <div class="sett-field"><label>Email</label><input type="email" id="sett-email" value="${escapeHtml(email)}" /></div>
                                    <div class="sett-field"><label>Phone</label><input type="text" id="sett-phone" value="${escapeHtml(phone)}" /></div>
                                </div><div class="sett-actions"><button class="sett-btn-cancel" id="cancelPersonalBtn">Cancel</button><button class="sett-btn-save" id="savePersonalBtn">Save Changes</button></div></div>
                            </div>
                            <div class="sett-card">
                                <div class="sett-card-header"><h3>Address Details</h3><button class="sett-edit-btn" id="editAddressBtn">${reqSvg} EDIT</button></div>
                                <div class="sett-view-data" id="view-address"><div class="sett-grid">
                                    <div><span>Country</span><strong>${escapeHtml(address.country)}</strong></div><div><span>City/State</span><strong>${escapeHtml(address.city)}</strong></div>
                                    <div><span>Province</span><strong>${escapeHtml(address.province)}</strong></div><div><span>Street No./Building</span><strong>${escapeHtml(address.street)}</strong></div><div><span>Brgy</span><strong>${escapeHtml(address.brgy)}</strong></div>
                                </div></div>
                                <div class="sett-edit-data" id="edit-address" style="display:none;"><div class="sett-grid">
                                    <div class="sett-field"><label>Country</label><input id="sett-country" value="${escapeHtml(address.country)}" /></div><div class="sett-field"><label>City/State</label><input id="sett-city" value="${escapeHtml(address.city)}" /></div>
                                    <div class="sett-field"><label>Province</label><input id="sett-province" value="${escapeHtml(address.province)}" /></div><div class="sett-field"><label>Street No./Building</label><input id="sett-street" value="${escapeHtml(address.street)}" /></div><div class="sett-field"><label>Brgy</label><input id="sett-brgy" value="${escapeHtml(address.brgy)}" /></div>
                                </div><div class="sett-actions"><button class="sett-btn-cancel" id="cancelAddressBtn">Cancel</button><button class="sett-btn-save" id="saveAddressBtn">Save Changes</button></div></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }

    let atCurrentPage = 1;
    let atDateFrom = '';
    let atDateTo = '';
    const AT_ROWS_PER_PAGE = 10;

    function buildAuditTrail() {
        atCurrentPage = 1;
        return `
            <section class="exd-card exd-records hr-audit-card">
                <div class="exd-records-head">
                    <h3 class="exd-title">Audit Trail</h3>
                    <span class="at-count" id="atCount"></span>
                </div>
                <div class="at-toolbar">
                    <label class="exd-search">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
                        <input type="search" placeholder="Search user, action, entity…" id="atSearch" />
                    </label>
                    <label class="fr-date"><span>From</span><input type="date" id="atFrom" aria-label="From date" /></label>
                    <label class="fr-date"><span>To</span><input type="date" id="atTo" aria-label="To date" /></label>
                </div>
                <div class="exd-table-scroll">
                    <table class="exd-table at-table">
                        <thead>
                            <tr><th>User</th><th>Action</th><th>Module</th><th>Record ID</th><th>Details</th><th>Status</th><th>Date / Time</th></tr>
                        </thead>
                        <tbody id="atTbody"></tbody>
                    </table>
                </div>
                <footer class="coa-pagination hr-at-pagination" id="atPagination"></footer>
            </section>
        `;
    }

    async function loadAuditTrail() {
        const tbody = $('#atTbody');
        if (!tbody) return;
        try {
            const result = await apiRequest('audit');
            const events = result.events || [];
            const q = ($('#atSearch')?.value || '').trim().toLowerCase();
            const rows = events.filter(e => {
                const text = idSearchText(e.actor, e.action, e.entity, e.entityId, e.details, e.at);
                const matchQ = !q || text.includes(q);
                const dateOnly = String(e.at || '').slice(0, 10);
                return matchQ && (!atDateFrom || dateOnly >= atDateFrom) && (!atDateTo || dateOnly <= atDateTo);
            });
            if ($('#atCount')) $('#atCount').textContent = `${rows.length} event${rows.length === 1 ? '' : 's'}`;
            if (!rows.length) {
                tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><p>No audit events found.</p></div></td></tr>`;
                renderAtPagination(0);
                return;
            }
            const totalPages = Math.max(1, Math.ceil(rows.length / AT_ROWS_PER_PAGE));
            atCurrentPage = Math.min(Math.max(1, atCurrentPage), totalPages);
            const pageRows = rows.slice((atCurrentPage - 1) * AT_ROWS_PER_PAGE, atCurrentPage * AT_ROWS_PER_PAGE);
            let rowsHtml = pageRows.map(e => {
                const [email, role] = String(e.actor || '').split('|');
                const action = String(e.action || '').toLowerCase();
                const status = action.includes('reject') || action.includes('fail') || action.includes('delete')
                    ? ['Rejected', 'failed'] : action.includes('approve') ? ['Approved', 'approved'] : ['Completed', 'completed'];
                const date = new Date(String(e.at || '').replace(' ', 'T'));
                const dateText = Number.isNaN(date.getTime()) ? String(e.at || '—') : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' · ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                return `<tr>
                    <td class="at-user"><strong>${escapeHtml(role || email || '—')}</strong></td>
                    <td>${escapeHtml(String(e.action || '—').replace(/_/g, ' '))}</td>
                    <td>${escapeHtml(e.entity || '—')}</td>
                    <td>${escapeHtml(String(e.entityId ?? '—'))}</td>
                    <td>${escapeHtml(e.details || (action === 'login' ? 'User signed in' : action === 'logout' ? 'User signed out' : '—'))}</td>
                    <td><span class="at-status at-status-${status[1]}">${status[0]}</span></td>
                    <td class="at-datetime">${escapeHtml(dateText)}</td>
                </tr>`;
            }).join('');
            const missingRows = AT_ROWS_PER_PAGE - pageRows.length;
            for (let i = 0; i < missingRows; i++) {
                rowsHtml += '<tr class="at-spacer-row"><td colspan="7">&nbsp;</td></tr>';
            }
            tbody.innerHTML = rowsHtml;
            renderAtPagination(totalPages);
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><p>${escapeHtml(err.message)}</p></div></td></tr>`;
        }
    }

    function renderAtPagination(totalPages) {
        const wrap = $('#atPagination');
        if (!wrap || totalPages <= 1) { if (wrap) wrap.innerHTML = ''; return; }
        const startPage = totalPages <= 3 ? 1 : Math.min(Math.max(1, atCurrentPage - 1), totalPages - 2);
        const pages = Array.from({ length: Math.min(3, totalPages) }, (_, index) => startPage + index);

        wrap.innerHTML = `
            <button type="button" class="coa-page-btn" data-page="prev" aria-label="Previous page" ${atCurrentPage === 1 ? 'disabled' : ''}>&lt;</button>
            ${pages.map(page => `<button type="button" class="coa-page-btn ${page === atCurrentPage ? 'is-active' : ''}" data-page="${page}">${page}</button>`).join('')}
            <button type="button" class="coa-page-btn" data-page="next" aria-label="Next page" ${atCurrentPage === totalPages ? 'disabled' : ''}>&gt;</button>
            ${totalPages > 3 ? `<details class="coa-page-menu"><summary>Select Page</summary><div class="coa-page-options">${Array.from({ length: totalPages }, (_, index) => `<button type="button" class="coa-page-option" data-page="${index + 1}">${index + 1}</button>`).join('')}</div></details>` : ''}
        `;
    }

    function buildLogout() {
        return `
            <div class="section-title"><h2>Logout</h2></div>
            <div class="empty-state" style="background:#fff;border:1px solid var(--border);border-radius:var(--radius);">
                <div class="empty-icon">↩</div>
                <strong>Sign out of D.E.V.S</strong>
                <p>You will be returned to the login screen.</p>
                <button class="btn btn-primary" type="button" id="confirmLogoutBtn">Confirm Logout</button>
            </div>
        `;
    }

    function buildNoAccessScreen() {
        return `
            <div class="section-title"><h2>No Access</h2></div>
            <div class="empty-state" style="background:#fff;border:1px solid var(--border);border-radius:var(--radius);">
                <div class="empty-icon">🔒</div>
                <strong>Your account has no pages assigned</strong>
                <p>Your HR Administrator has removed access to every page. Please contact HR to request access.</p>
            </div>
        `;
    }

    const GUIDE_ICON = (paths) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

    const HR_GUIDE_LINKS = [
        { page: 'dashboard', icon: GUIDE_ICON('<path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/>'), title: 'Dashboard', text: 'A snapshot of today’s HR activity.' },
        { page: 'employees', icon: GUIDE_ICON('<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5a3 3 0 0 1 0 6"/><path d="M17 14a6 6 0 0 1 4 6"/>'), title: 'Employees Master', text: 'Employee records and workforce status.' },
        { page: 'attendance', icon: GUIDE_ICON('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'), title: 'Attendance', text: 'Daily time-in and time-out entries.' },
        { page: 'leave', icon: GUIDE_ICON('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="m9 15 2 2 4-4"/>'), title: 'Leave Requests', text: 'Review and manage employee leave.' },
        { page: 'payroll', icon: GUIDE_ICON('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M7 15h4"/>'), title: 'Payroll', text: 'Create and review payroll by period.' },
        { page: 'payrollHistory', icon: GUIDE_ICON('<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 8v4l3 2"/>'), title: 'Payroll History', text: 'Search and review past payroll records.' },
        { page: 'deductions', icon: GUIDE_ICON('<path d="M12 3v18"/><path d="M17 7H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H7"/>'), title: 'Deductions', text: 'Salary deductions and their reasons.' },
        { page: 'contribution', icon: GUIDE_ICON('<path d="M12 3 3 7v5c0 5 3.8 8.4 9 9 5.2-.6 9-4 9-9V7z"/><path d="m9 12 2 2 4-4"/>'), title: 'Contribution', text: 'SSS, PhilHealth, and Pag-IBIG shares.' },
        { page: '13thmonth', icon: GUIDE_ICON('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M7 14h3"/>'), title: '13th Month Pay', text: 'Year-end bonus records.' },
        { page: 'accountManagement', icon: GUIDE_ICON('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'), title: 'Account Management', text: 'User accounts and password resets.' },
        { page: 'pageAccess', icon: GUIDE_ICON('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>'), title: 'User Permission', text: 'Control which pages each user sees.' },
        { page: 'notifications', icon: GUIDE_ICON('<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>'), title: 'Notifications', text: 'Updates from across the HR team.' }
    ];

    const HR_GUIDE_FAQS = [
        { q: 'How do I get started in HR?', a: 'Use the sidebar to move between pages. The Dashboard shows today’s HR snapshot. The bell in the top bar lists recent changes; click one to jump straight to that page.' },
        { q: 'How do I add or update an employee?', a: 'Open Employees Master. You can search by name or by any ID form, including Employee ID, then add or edit a record there.' },
        { q: 'How do leave requests affect pay?', a: 'Approved leave requests create deduction rows in Deductions, grouped by employee and payroll period. Use View on a row to see each reason.' },
        { q: 'How do I run payroll?', a: 'Open Payroll, set the payroll period, and create payroll. The Dashboard groups net pay by department. Printing uses the payroll period dates, not the date the record was created.' },
        { q: 'Why is there no Delete action on payroll?', a: 'Payroll rows are view-only to protect payroll history. Use View to inspect a record.' },
        { q: 'Where do contributions come from?', a: 'SSS, PhilHealth, and Pag-IBIG contributions are derived from payroll records. Open Contribution to review the employer and employee shares per employee and period.' },
        { q: 'What is 13th Month Pay?', a: 'It is the total basic salary earned for the year divided by 12, payable on or before December 24. Open 13th Month Pay to review the records.' },
        { q: 'How do I control who sees which page?', a: 'Open User Permission (administrators only). Check or uncheck a page for a user. The sidebar updates for that user the next time they load the system — this also controls Finance pages.' },
        { q: 'How do I reset someone’s password?', a: 'Open Account Management and use Reset password. The employee will need the new password to sign in.' },
        { q: 'How do I find a record quickly?', a: 'Every search bar accepts names and any ID form, including Employee ID. Tables are paginated — use the numbered buttons at the bottom to move between pages.' },
        { q: 'Who changed an employee record?', a: 'Open Audit Trail. It lists who changed what and when, and it is also the source of the notification bell.' },
        { q: 'A page is missing from my sidebar. What do I do?', a: 'An HR Administrator controls page visibility in User Permission. Ask them to grant you access to the page you need.' },
        { q: 'I forgot my password. Who can reset it?', a: 'Ask another HR Administrator to reset it from Account Management. You will need the new password to sign in again.' }
    ];

    function buildSupport() {
        const profile = JSON.parse(localStorage.getItem('devs_profile') || '{}');
        const me = profile.fullName || profile.email || 'there';
        const links = HR_GUIDE_LINKS.map(link => `
            <a href="#" class="guide-link" data-goto-page="${link.page}">
                <span class="guide-link-icon">${link.icon}</span>
                <h3>${escapeHtml(link.title)}</h3>
                <p>${escapeHtml(link.text)}</p>
                <span class="guide-link-go">Open page →</span>
            </a>
        `).join('');
        const faqs = HR_GUIDE_FAQS.map((item, i) => `
            <details class="guide-faq-item" data-guide-faq="${i}">
                <summary>${escapeHtml(item.q)}</summary>
                <p>${escapeHtml(item.a)}</p>
            </details>
        `).join('');

        return `
            <div class="section-title"><h2>Support</h2><span class="hint">System guide and quick answers</span></div>
            <div class="guide-wrap">
                <section class="card guide-intro">
                    <span class="guide-intro-icon">${GUIDE_ICON('<path d="M12 3 3 7v5c0 5 3.8 8.4 9 9 5.2-.6 9-4 9-9V7z"/><path d="m9 12 2 2 4-4"/>')}</span>
                    <div>
                        <p class="guide-eyebrow">D.E.V.S · HR</p>
                        <h2>System Guide</h2>
                        <p>A short guide to the HR portal: where each record lives, how leave, payroll, and contributions connect, and what to do when something looks wrong. Pick a page below or search the questions.</p>
                    </div>
                </section>

                <div class="guide-grid">${links}</div>

                <section class="card guide-panel">
                    <div class="guide-panel-head">
                        <h3>Frequently asked questions</h3>
                        <p>Type a word to narrow the list. Click a question to expand the answer.</p>
                    </div>
                    <div class="guide-search">
                        ${GUIDE_ICON('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>')}
                        <input type="search" id="guideSearch" placeholder="Search the guide…" aria-label="Search guide questions" autocomplete="off" />
                    </div>
                    <div class="guide-faq" id="guideFaqList">${faqs}</div>
                    <div class="guide-faq-empty" id="guideFaqEmpty" hidden>No topics match your search. Try a different word.</div>
                </section>

                <section class="card guide-help">
                    <h3>Still need help?</h3>
                    <p>Contact the system administrator with the page name and a short description of the issue. Signed in as <strong>${escapeHtml(me)}</strong>.</p>
                </section>
            </div>
        `;
    }

    function buildPageAccessManager() {
        return `
            <div class="section-title"><h2>User Permission</h2><span class="hint">Check to show · Uncheck to hide</span></div>
            <div class="pa-filters" data-upgrade-selects>
                <div class="pa-filter"><span>Select User:</span>
                    <select id="paUser"><option value="__all__">— All users in this group —</option></select>
                </div>
                <div class="pa-filter"><span>Select Position:</span>
                    <select id="paPosition"><option value="">All Positions</option>${ALL_POSITIONS.map(p => `<option>${escapeHtml(p)}</option>`).join('')}</select>
                </div>
                <div class="pa-filter"><span>Select Department:</span>
                    <select id="paDepartment"><option value="">All Departments</option><option>HR</option><option>Finance</option><option>Production</option></select>
                </div>
                <div class="pa-filter pa-filter-info"><span>Matches</span><strong id="paMatchCount">—</strong></div>
            </div>
            <div class="pa-toolbar">
                <div class="pa-toolbar-title">Page access</div>
                <div class="pa-toolbar-actions">
                    <button type="button" class="btn btn-ghost btn-sm" id="paEnableAll">Enable all</button>
                    <button type="button" class="btn btn-ghost btn-sm" id="paDisableAll">Disable all</button>
                </div>
            </div>
            <div class="pa-grid" id="paGrid"><div class="empty-state"><p>Loading…</p></div></div>
            <div class="pa-actions"><button type="button" class="btn btn-primary" id="paSaveBtn">Save Access</button></div>
        `;
    }

    // ============ PAGE ACCESS MANAGER INTERNALS ============
    let paCatalog = null, paAccessMap = {}, paDefaults = {};
    // Group defaults (saved for a department+position with no accounts yet)
    // are shown and edited in the grid so future accounts inherit them.
    // Rebuild the searchable dropdown (ss-wrap) after a select's options were
    // replaced — the same pattern the Add Account modal uses for its Position
    // select, because buildSearchableSelect snapshots the options at upgrade
    // time and a bare innerHTML swap would leave the panel list stale.
    function refreshUpgradedSelect(select) {
        if (!select) return;
        let next = select.nextElementSibling;
        while (next && next.classList.contains('ss-wrap')) {
            const stale = next;
            next = next.nextElementSibling;
            stale.remove();
        }
        delete select.dataset.ssUpgraded;
        select.classList.remove('ss-native-hidden');
        upgradeSelectsIn(select);
    }
    // The Position filter follows the department: HR accounts use the three
    // HR positions, other departments keep their own roles. All Departments
    // keeps every option so cross-department filtering still works.
    function syncPaPositionOptions() {
        const deptSel = document.getElementById('paDepartment');
        const posSel = document.getElementById('paPosition');
        if (!deptSel || !posSel) return;
        const roles = deptSel.value ? positionOptionsFor(deptSel.value) : ALL_POSITIONS;
        const current = posSel.value;
        const changed = [...posSel.options].some((o, i) => (i === 0 ? o.value !== '' : o.value !== roles[i - 1]))
            || posSel.options.length !== roles.length + 1;
        if (changed) {
            posSel.innerHTML = `<option value="">All Positions</option>` + roles.map(r => `<option>${r}</option>`).join('');
            if (current === '' || roles.includes(current)) posSel.value = current;
            else posSel.value = '';
        }
        // Always refresh: keeps the searchable dropdown in step with the
        // options and upgrades it on first load even when nothing changed.
        refreshUpgradedSelect(posSel);
    }
    async function ensureCatalog() {
        if (paCatalog) return paCatalog;
        try { const r = await apiRequest('access.catalog'); paCatalog = r.catalog || {}; } catch { paCatalog = {}; }
        return paCatalog;
    }
    function getFilteredUsers() {
        const pos  = document.getElementById('paPosition')?.value  || '';
        const dept = document.getElementById('paDepartment')?.value || '';
        const users = window.__paUsersCache || [];
        return users.filter(u => {
            if (pos  && (u.position || '') !== pos) return false;
            // The users endpoint returns the department label as `dept`.
            // `department` is kept as a fallback for other API shapes.
            if (dept && ((u.dept || u.department || '')) !== dept) return false;
            return true;
        });
    }
    function renderPaUserOptions() {
        const sel = document.getElementById('paUser');
        if (!sel) return;
        const filtered = getFilteredUsers();
        const current = sel.value;
        sel.innerHTML = `<option value="__all__">— All users in this group —</option>` +
            filtered.map(u => `<option value="${escapeHtml(u.id)}">${escapeHtml(u.fullName)} (${escapeHtml(u.role || '')})</option>`).join('');
        if (current && (current === '__all__' || filtered.some(u => u.id === current))) sel.value = current;
        else sel.value = '__all__';
        const countEl = document.getElementById('paMatchCount');
        if (countEl) countEl.textContent = filtered.length === 1 ? '1 user' : `${filtered.length} users`;
        refreshUpgradedSelect(sel);
    }
    function getTargetUsers() {
        const sel = document.getElementById('paUser');
        const userId = sel?.value || '__all__';
        if (userId === '__all__') return getFilteredUsers();
        const found = (window.__paUsersCache || []).find(u => u.id === userId);
        return found ? [found] : [];
    }
    function previewAccessForGroup(matchedUsers) {
        const catalog = paCatalog || {};
        const allKeys = [];
        Object.values(catalog).forEach(mod => Object.keys(mod.pages).forEach(k => allKeys.push(k)));
        if (!matchedUsers.length) {
            // Empty group: show the saved defaults (if any) so they can be
            // edited and saved for future accounts; otherwise start all-on.
            if (Object.keys(paDefaults).length) return { ...paDefaults };
            const allOn = {}; allKeys.forEach(k => allOn[k] = true); return allOn;
        }
        const preview = {};
        allKeys.forEach(key => {
            preview[key] = matchedUsers.every(u => {
                const saved = paAccessMap[u.id];
                if (!saved) return true;
                return saved[key] !== false;
            });
        });
        return preview;
    }
    function updatePaCounts() {
        const grid = document.getElementById('paGrid');
        if (!grid) return;
        grid.querySelectorAll('.pa-section').forEach(section => {
            const boxes = [...section.querySelectorAll('input[data-page-key]')];
            const count = section.querySelector('.pa-count');
            if (count) count.textContent = `${boxes.filter(b => b.checked).length} / ${boxes.length}`;
            const master = section.querySelector('[data-check-all]');
            if (master) master.checked = boxes.length > 0 && boxes.every(b => b.checked);
        });
    }
    function setAllPaBoxes(checked) {
        document.querySelectorAll('#paGrid input[data-page-key]').forEach(box => { box.checked = checked; });
        updatePaCounts();
    }
    function renderPaGrid() {
        const grid = document.getElementById('paGrid');
        if (!grid) return;
        const matched = getTargetUsers();
        const preview = previewAccessForGroup(matched);
        const catalog = paCatalog || {};
        const selectedDept = document.getElementById('paDepartment')?.value || '';
        const sections = Object.entries(catalog)
            .filter(([modKey]) => !selectedDept || modKey === selectedDept)
            .map(([modKey, mod]) => {
                const items = Object.entries(mod.pages).map(([key, label]) => {
                    const checked = preview[key] !== false;
                    return `<label class="pa-item"><input type="checkbox" data-page-key="${escapeHtml(key)}" ${checked ? 'checked' : ''} /><span>${escapeHtml(label)}</span></label>`;
                }).join('');
                return `<div class="pa-section" data-module="${escapeHtml(modKey)}">
                    <div class="pa-section-head">
                        <h3><span class="pa-dot"></span>${escapeHtml(mod.label)}</h3>
                        <span class="pa-count">0 / 0</span>
                    </div>
                    <label class="pa-item pa-check-all"><input type="checkbox" data-check-all="${escapeHtml(modKey)}" /><span>Check All</span></label>
                    <div class="pa-items">${items}</div>
                </div>`;
            }).join('');
        grid.innerHTML = sections || '<div class="empty-state"><p>No pages match the selected department.</p></div>';
        grid.classList.toggle('is-preview', matched.length === 0);
        // Shared page keys (dashboard, settings) appear in more than one
        // module. Keep every copy in sync so the saved value is unambiguous.
        grid.querySelectorAll('input[data-page-key]').forEach(box => {
            box.addEventListener('change', () => {
                grid.querySelectorAll(`input[data-page-key="${box.dataset.pageKey}"]`).forEach(other => {
                    if (other !== box) other.checked = box.checked;
                });
                updatePaCounts();
            });
        });
        grid.querySelectorAll('[data-check-all]').forEach(master => {
            const module = master.dataset.checkAll;
            const section = grid.querySelector(`.pa-section[data-module="${module}"]`);
            const boxes = section ? [...section.querySelectorAll('input[data-page-key]')] : [];
            master.addEventListener('change', () => {
                boxes.forEach(b => { b.checked = master.checked; });
                boxes.forEach(b => {
                    grid.querySelectorAll(`input[data-page-key="${b.dataset.pageKey}"]`).forEach(other => {
                        if (other !== b) other.checked = master.checked;
                    });
                });
                updatePaCounts();
            });
        });
        updatePaCounts();
        const saveBtn = document.getElementById('paSaveBtn');
        // Save stays available for empty groups too — a save with no matching
        // accounts stores the department+position defaults for future accounts.
        if (saveBtn) saveBtn.disabled = grid.querySelectorAll('input[data-page-key]').length === 0;
    }
    async function refreshPaDefaults() {
        const dept = document.getElementById('paDepartment')?.value || '';
        const pos  = document.getElementById('paPosition')?.value  || '';
        paDefaults = {};
        if (!dept) return;
        try {
            const res = await fetch(`${API_URL}?action=access.defaults&department=${encodeURIComponent(dept)}&position=${encodeURIComponent(pos)}`, { credentials: 'same-origin' });
            const data = await res.json().catch(() => ({}));
            if (data && data.access && typeof data.access === 'object') paDefaults = data.access;
        } catch { /* defaults stay empty; the grid falls back to all-on */ }
    }
    async function loadGroupAccess() {
        paAccessMap = {};
        const users = window.__paUsersCache || [];
        await Promise.all(users.map(async (u) => {
            try {
                const res = await fetch(`${API_URL}?action=access.get&userId=${encodeURIComponent(u.id)}`, { credentials: 'same-origin' });
                const data = await res.json().catch(() => ({}));
                paAccessMap[u.id] = (data && data.access) ? data.access : {};
            } catch { paAccessMap[u.id] = {}; }
        }));
        await refreshPaDefaults();
        renderPaGrid();
    }
    async function saveGroupAccess() {
        const target = document.getElementById('paUser')?.value || '__all__';
        const matched = getTargetUsers();
        if (!matched.length && target !== '__all__') { toast('No users match the current selection.', 'error'); return; }
        const savingDefaults = matched.length === 0;
        const access = {};
        // Read the visible checkboxes first.
        document.querySelectorAll('#paGrid input[data-page-key]').forEach(box => { access[box.dataset.pageKey] = box.checked; });
        // Keep the permissions for pages hidden by the current department filter
        // instead of wiping them when saving.
        Object.values(paCatalog || {}).forEach(mod => Object.keys(mod.pages || {}).forEach(key => {
            if (key in access) return;
            const saved = target === '__all__' ? paDefaults : (paAccessMap[target] || {});
            access[key] = saved[key] !== false;
        }));
        access.pageAccess = true;
        const anyAllowed = Object.values(access).some(v => v === true);
        if (!anyAllowed) {
            const ok = await confirmDialog({
                title: 'Remove all access?',
                message: savingDefaults
                    ? 'No accounts exist in this group yet. You are about to save an all-restricted default for future accounts. Continue?'
                    : target === '__all__' ? `You are about to hide every page from ${matched.length} user(s). Continue?` : `You are about to hide every page from ${matched[0].fullName}. Continue?`,
                confirmLabel: 'Yes, remove all', danger: true
            });
            if (!ok) return;
        } else {
            const ok = await confirmDialog({
                title: target === '__all__' ? (savingDefaults ? 'Save as group default?' : 'Apply to matching users?') : 'Apply to this user?',
                message: savingDefaults
                    ? 'No accounts exist in this group yet. These permissions will be saved as the default and applied to every future account in this group.'
                    : target === '__all__' ? `This will set page access for ${matched.length} user(s) in the selected group.` : `This will set page access for ${matched[0].fullName}.`,
                confirmLabel: 'Apply'
            });
            if (!ok) return;
        }
        try {
            if (target === '__all__') {
                const pos = document.getElementById('paPosition')?.value || '';
                const dept = document.getElementById('paDepartment')?.value || '';
                const result = await apiRequest('access.bulk', { method: 'POST', body: JSON.stringify({ position: pos, department: dept, access }) });
                toast(result.message || 'Access saved for the group.');
            } else {
                const result = await apiRequest('access.save', { method: 'POST', body: JSON.stringify({ userId: target, access }) });
                toast(result.message || 'Access saved.');
            }
            await loadGroupAccess();
            // Refresh the signed-in user's permissions so the sidebar updates
            // immediately if their own access was just changed.
            await loadPageAccess();
            applySidebarRestrictions();
        } catch (e) { toast(e.message, 'error'); }
    }

    // ============ HANDLERS ============
    let currentRenderToken = 0;
    let attendanceRefreshTimer = null;

    function attachPageHandlers(page) {
        const myToken = ++currentRenderToken;
        if (attendanceRefreshTimer) { clearInterval(attendanceRefreshTimer); attendanceRefreshTimer = null; }
        attachExportHandlers();
        const guard = (fn) => (...args) => { if (myToken !== currentRenderToken) return; return fn(...args); };

        if (page === 'dashboard') {
            const btn = $('#generateReportBtn');
            if (btn) btn.addEventListener('click', throttle(() => openExportModal('leaves'), 350));
            dashboardPanel?.addEventListener('click', throttle(guard(handleLeaveAction), 120));
            renderDashEmpRows();
            $('#hrDashEmpSearch')?.addEventListener('input', throttle(guard(() => {
                dashEmpCurrentPage = 1;
                renderDashEmpRows();
            }), 100));
            $('#hrDashEmpPagination')?.addEventListener('click', guard(handleDashEmpPagination));
            // Payroll donut — clicking a department slice or legend item opens
            // that department's payroll breakdown.
            $('.hr-payroll-donut-wrap')?.addEventListener('click', guard((e) => {
                const hit = e.target.closest('[data-pd-dept]');
                if (hit?.dataset.pdDept) openPayrollDeptModal(hit.dataset.pdDept);
            }));
        }

        if (page === 'employees') {
            renderEmployeeRows();
            $('#empSearch')?.addEventListener('input', throttle(guard(() => { empCurrentPage = 1; renderEmployeeRows(); }), 100));
            setupEmpStatusDropdown();
            $('#empTbody')?.addEventListener('click', throttle(guard(handleEmployeeAction), 120));
            $('#empPagination')?.addEventListener('click', throttle(guard(handleEmpPagination), 120));
        }

        if (page === 'attendance') {
            renderAttendanceRows();
            $('#attSearch')?.addEventListener('input', throttle(guard(() => { attCurrentPage = 1; renderAttendanceRows(); }), 100));
            $('#attDate')?.addEventListener('change', throttle(guard(() => {
                localStorage.setItem(ATTENDANCE_FILTER_KEY, $('#attDate')?.value || todayDateString());
                attCurrentPage = 1;
                renderAttendanceRows();
            }), 100));
            setupAttStatusDropdown();
            $('#refreshAttendanceBtn')?.addEventListener('click', throttle(guard(() => { attCurrentPage = 1; renderAttendanceRows(); }), 300));
            $('#addAttBtn')?.addEventListener('click', (e) => { if (!lockElement(e.currentTarget, 500)) return; guard(() => openAttendanceForm())(); });
            $('#clockInBtn')?.addEventListener('click', (e) => { if (!lockElement(e.currentTarget, 500)) return; guard(() => logStaffAttendance('in'))(); });
            $('#clockOutBtn')?.addEventListener('click', (e) => { if (!lockElement(e.currentTarget, 500)) return; guard(() => logStaffAttendance('out'))(); });
            $('#attTbody')?.addEventListener('click', throttle(guard(handleAttendanceAction), 120));
            $('#attPagination')?.addEventListener('click', throttle(guard(handleAttPagination), 120));
        }

        if (page === 'leave') {
            renderLeaveRows();
            $('#leaveSearch')?.addEventListener('input', throttle(guard(renderLeaveRows), 100));
            $('#leaveHistorySearch')?.addEventListener('input', throttle(guard(renderLeaveRows), 100));
            setupLeaveStatusDropdown();
            $('#addLeaveBtn')?.addEventListener('click', (e) => { if (!lockElement(e.currentTarget, 500)) return; guard(openLeaveForm)(); });
            $('#leaveTbody')?.addEventListener('click', throttle(guard(handleLeaveAction), 120));
            $('#leaveHistoryTbody')?.addEventListener('click', throttle(guard(handleLeaveAction), 120));
        }

        if (page === 'payroll') {
            payrollCurrentPage = 1;
            renderPayrollRows();
            setupPayrollStatusDropdown();
            $('#payrollSearch')?.addEventListener('input', throttle(guard(() => { payrollCurrentPage = 1; renderPayrollRows(); }), 100));
            $('#payrollTbody')?.addEventListener('click', throttle(guard(handlePayrollAction), 120));
            $('#payrollPagination')?.addEventListener('click', throttle(guard((event) => {
                const btn = event.target.closest('.coa-page-btn, .coa-page-option');
                if (!btn || btn.disabled) return;
                const totalPages = Math.max(1, Math.ceil(visiblePayroll().length / PAYROLL_ROWS_PER_PAGE));
                const target = btn.dataset.page;
                if (target === 'prev') payrollCurrentPage = Math.max(1, payrollCurrentPage - 1);
                else if (target === 'next') payrollCurrentPage = Math.min(totalPages, payrollCurrentPage + 1);
                else payrollCurrentPage = Number(target) || 1;
                renderPayrollRows();
            }), 120));
            $('#printPayrollBtn')?.addEventListener('click', (e) => { if (!lockElement(e.currentTarget, 600)) return; guard(openPayrollPrintDialog)(); });
            $('#createPayrollBtn')?.addEventListener('click', (e) => { if (!lockElement(e.currentTarget, 500)) return; guard(openCreatePayrollForm)(); });
        }

        if (page === 'payrollHistory') {
            phCurrentPage = 1;
            renderPayrollHistoryRows();
            $('#phSearch')?.addEventListener('input', throttle(guard(() => { phCurrentPage = 1; renderPayrollHistoryRows(); }), 100));
            $('#phYear')?.addEventListener('change', throttle(guard(() => { phCurrentPage = 1; renderPayrollHistoryRows(); }), 100));
            $('#phPeriod')?.addEventListener('change', throttle(guard(() => { phCurrentPage = 1; renderPayrollHistoryRows(); }), 100));
            $('#phStatus')?.addEventListener('change', throttle(guard(() => { phCurrentPage = 1; renderPayrollHistoryRows(); }), 100));
            $('#phTbody')?.addEventListener('click', throttle(guard((event) => {
                const btn = event.target.closest('[data-act="viewPayslip"]');
                if (!btn) return;
                const p = store.payroll.find(x => String(x.id) === String(btn.dataset.id));
                if (p) openPayslip(p);
            }), 120));
            $('#phPagination')?.addEventListener('click', throttle(guard((event) => {
                const btn = event.target.closest('.coa-page-btn, .coa-page-option');
                if (!btn || btn.disabled) return;
                const totalPages = Math.max(1, Math.ceil(phVisibleRows().length / PH_ROWS_PER_PAGE));
                const target = btn.dataset.page;
                if (target === 'prev') phCurrentPage = Math.max(1, phCurrentPage - 1);
                else if (target === 'next') phCurrentPage = Math.min(totalPages, phCurrentPage + 1);
                else phCurrentPage = Math.min(Math.max(1, parseInt(target, 10) || 1), totalPages);
                renderPayrollHistoryRows();
            }), 120));
        }

        if (page === 'accountManagement') {
            upgradeSelectsIn(document.querySelector('.coa-card[data-upgrade-selects]'));
            loadAccountManagement();
            const amResetPage = () => { amCurrentPage = 1; renderAccountManagementRows(); };
            $('#amSearch')?.addEventListener('input', throttle(guard(amResetPage), 100));
            $('#amDept')?.addEventListener('change', throttle(guard(amResetPage), 100));
            $('#amRole')?.addEventListener('change', throttle(guard(amResetPage), 100));
            $('#amStatus')?.addEventListener('change', throttle(guard(amResetPage), 100));
            $('#amPagination')?.addEventListener('click', throttle(guard((event) => {
                const btn = event.target.closest('.coa-page-btn, .coa-page-option');
                if (!btn || btn.disabled) return;
                const filtered = amUserCache.filter(u => {
                    const q = ($('#amSearch')?.value || '').trim().toLowerCase();
                    const dept = $('#amDept')?.value || '';
                    const role = $('#amRole')?.value || '';
                    const status = $('#amStatus')?.value || '';
                    const matchQ = matchesSearch(q, u.fullName, u.email, u.id, u.employeeId, u.username);
                    const matchD = !dept   || u.department === dept;
                    const matchR = !role   || u.position === role;
                    const matchS = !status || u.status === status;
                    return matchQ && matchD && matchR && matchS;
                });
                const totalPages = Math.max(1, Math.ceil(filtered.length / AM_ROWS_PER_PAGE));
                const target = btn.dataset.page;
                if (target === 'prev') amCurrentPage = Math.max(1, amCurrentPage - 1);
                else if (target === 'next') amCurrentPage = Math.min(totalPages, amCurrentPage + 1);
                else amCurrentPage = Math.min(Math.max(1, parseInt(target, 10) || 1), totalPages);
                renderAccountManagementRows();
            }), 120));
            $('#amCreateBtn')?.addEventListener('click', (e) => {
                if (!lockElement(e.currentTarget, 500)) return;
                guard(() => openCreateAccountForm())();
            });
            $('#amTbody')?.addEventListener('click', throttle(guard(async (e) => {
                const btn = e.target.closest('[data-am-act]');
                if (!btn) return;
                const act = btn.dataset.amAct;
                const id = btn.dataset.amId;
                const user = amUserCache.find(x => String(x.id) === String(id));
                if (!user) return;
                if (act === 'reset') {
                    const details = await openResetPasswordModal(user);
                    if (!details) return;
                    const adminPassword = await openHrPasswordConfirmModal(user);
                    if (!adminPassword) return;
                    try {
                        const r = await apiRequest('users.resetPassword', {
                            method: 'POST',
                            body: JSON.stringify({ ...details, adminPassword })
                        });
                        openResetPasswordResultModal(user.fullName, r.message || '');
                    } catch (err) {
                        toast(err.message, 'error');
                    }
                }
                if (act === 'activate' || act === 'deactivate') {
                    const next = act === 'activate' ? 'Active' : 'Inactive';
                    const ok = await confirmDialog({
                        title: act === 'activate' ? 'Activate Account' : 'Deactivate Account',
                        message: `Set ${user.fullName} to ${next}?`,
                        confirmLabel: act === 'activate' ? 'Activate' : 'Deactivate',
                        danger: act === 'deactivate'
                    });
                    if (!ok) return;
                    try {
                        await apiRequest('users.setStatus', { method: 'POST', body: JSON.stringify({ id, status: next }) });
                        toast(`Account ${next.toLowerCase()}.`);
                        // Re-sync so the Employees Master List immediately
                        // reflects the account's new status.
                        await syncStateFromServer().catch(() => {});
                        await loadAccountManagement();
                    } catch (err) { toast(err.message, 'error'); }
                }
            }), 120));
        }

        if (page === 'contribution') {
            contribCurrentPage = 1;
            contribSelectedId = visibleContributionRows()[0]?.id || null;
            renderContributionRows();
            $('#gcSearch')?.addEventListener('input', throttle(guard(() => { contribCurrentPage = 1; renderContributionRows(); }), 100));
            $('#gcTbody')?.addEventListener('click', throttle(guard(handleContributionAction), 120));
            $('#gcPagination')?.addEventListener('click', throttle(guard((event) => {
                const btn = event.target.closest('.coa-page-btn, .coa-page-option');
                if (!btn || btn.disabled) return;
                const totalPages = Math.max(1, Math.ceil(visibleContributionRows().length / CONTRIB_ROWS_PER_PAGE));
                const target = btn.dataset.page;
                if (target === 'prev') contribCurrentPage = Math.max(1, contribCurrentPage - 1);
                else if (target === 'next') contribCurrentPage = Math.min(totalPages, contribCurrentPage + 1);
                else contribCurrentPage = Math.min(Math.max(1, parseInt(target, 10) || 1), totalPages);
                renderContributionRows();
            }), 120));
            $('#gcTabs')?.addEventListener('click', (event) => {
                const btn = event.target.closest('.gc-tab-btn');
                if (!btn) return;
                const tab = btn.dataset.tab;
                if (!tab || tab === contribActiveTab) return;
                contribActiveTab = tab;
                contribCurrentPage = 1;
                // Keep stat-card highlight in sync with the active tab.
                $$('.gc-stat-card').forEach(card => card.classList.remove('is-active'));
                btn.parentElement.querySelectorAll('.gc-tab-btn').forEach(b => b.classList.toggle('is-active', b === btn));
                const activeCard = $(`#gcStatTotal-${tab}`)?.closest('.gc-stat-card');
                if (activeCard) activeCard.classList.add('is-active');
                const titleEl = $('#gcTitle');
                if (titleEl) titleEl.textContent = `${CONTRIB_AGENCIES[tab].label.toUpperCase()} Contribution`;
                // Reset the department filter when the agency changes so the
                // list never starts out permanently empty.
                const deptBtn = $('#gcDeptBtn');
                if (deptBtn) { deptBtn.dataset.value = ''; }
                const deptLabel = $('.custom-filter-dropdown[data-id="gcDeptFilter"] .cfb-text');
                if (deptLabel) deptLabel.textContent = 'All Departments';
                contribSelectedId = null;
                renderContributionRows();
            });
            setupContributionDeptDropdown();
        }

        if (page === '13thmonth') {
            tmCurrentPage = 1;
            render13MonthRows();
            $('#tmSearch')?.addEventListener('input', throttle(guard(() => { tmCurrentPage = 1; render13MonthRows(); }), 100));
            $('#tmTbody')?.addEventListener('click', throttle(guard((event) => {
                const btn = event.target.closest('[data-act="view13"]');
                const tr = event.target.closest('tr[data-id]');
                if (!tr) return;
                const emp = empById(btn ? btn.dataset.id : tr.dataset.id);
                if (emp) open13MonthView(emp);
            }), 120));
            $('#tmPagination')?.addEventListener('click', throttle(guard((event) => {
                const btn = event.target.closest('.coa-page-btn, .coa-page-option');
                if (!btn || btn.disabled) return;
                const totalPages = Math.max(1, Math.ceil(tmVisibleRows().length / TM_ROWS_PER_PAGE));
                const target = btn.dataset.page;
                if (target === 'prev') tmCurrentPage = Math.max(1, tmCurrentPage - 1);
                else if (target === 'next') tmCurrentPage = Math.min(totalPages, tmCurrentPage + 1);
                else tmCurrentPage = Math.min(Math.max(1, parseInt(target, 10) || 1), totalPages);
                render13MonthRows();
            }), 120));
            $('#tmCalcBtn')?.addEventListener('click', (e) => {
                if (!lockElement(e.currentTarget, 500)) return;
                guard(() => open13MonthCalcModal())();
            });
        }

        if (page === 'deductions') {
            renderDeductionRows();
            setupDedFilterDropdowns();
            $('#dedSearch')?.addEventListener('input', throttle(guard(() => { dedCurrentPage = 1; renderDeductionRows(); }), 100));
            $('#dedTbody')?.addEventListener('click', throttle(guard(handleDeductionAction), 120));
            $('#dedPagination')?.addEventListener('click', throttle(guard(handleDedPagination), 120));
        }

        if (page === 'support') {
            const input = $('#guideSearch');
            const items = $$('#guideFaqList .guide-faq-item');
            const empty = $('#guideFaqEmpty');
            const applyGuideSearch = () => {
                const term = (input?.value || '').trim().toLowerCase();
                let shown = 0;
                items.forEach(item => {
                    const hit = !term || item.textContent.toLowerCase().includes(term);
                    item.style.display = hit ? '' : 'none';
                    if (hit) shown++;
                });
                if (empty) empty.hidden = shown > 0;
            };
            input?.addEventListener('input', throttle(guard(applyGuideSearch), 100));
            $$('.guide-link[data-goto-page]').forEach(card => {
                const target = card.dataset.gotoPage;
                const allowed = !!pages[target] && canAccessPage(target)
                    && (target !== 'pageAccess' || isHrAdmin());
                if (!allowed) {
                    card.style.display = 'none';
                    return;
                }
                card.addEventListener('click', guard((e) => {
                    e.preventDefault();
                    $$('.nav-item').forEach(link => link.classList.remove('active'));
                    const navLink = document.querySelector(`.nav-item[data-page="${target}"]`);
                    if (navLink) navLink.classList.add('active');
                    localStorage.setItem('devs_last_page', target);
                    renderPage(target);
                }));
            });
        }

        if (page === 'pageAccess') {
            (async () => {
                try {
                    const result = await apiRequest('users');
                    window.__paUsersCache = result.users || [];
                } catch { window.__paUsersCache = []; }
                await ensureCatalog();
                await loadGroupAccess();
                syncPaPositionOptions();
                renderPaUserOptions();
                upgradeSelectsIn(document.querySelector('.pa-filters'));
            })();
            document.getElementById('paPosition')?.addEventListener('change', () => { renderPaUserOptions(); refreshPaDefaults().then(renderPaGrid); });
            document.getElementById('paDepartment')?.addEventListener('change', () => { syncPaPositionOptions(); renderPaUserOptions(); refreshPaDefaults().then(renderPaGrid); });
            document.getElementById('paUser')?.addEventListener('change', () => { renderPaGrid(); });
            document.getElementById('paEnableAll')?.addEventListener('click', () => setAllPaBoxes(true));
            document.getElementById('paDisableAll')?.addEventListener('click', () => setAllPaBoxes(false));
            document.getElementById('paSaveBtn')?.addEventListener('click', (e) => {
                if (!lockElement(e.currentTarget, 600)) return;
                saveGroupAccess();
            });
        }

        if (page === 'auditTrail') {
            loadAuditTrail();
            $('#atSearch')?.addEventListener('input', throttle(guard(loadAuditTrail), 150));
            const commitAuditRange = () => {
                const from = $('#atFrom')?.value || '';
                const to = $('#atTo')?.value || '';
                if (from && to && from > to) {
                    toast('The start date cannot be after the end date.', 'error');
                    return;
                }
                atDateFrom = from;
                atDateTo = to;
                atCurrentPage = 1;
                loadAuditTrail();
            };
            $('#atFrom')?.addEventListener('change', guard(commitAuditRange));
            $('#atTo')?.addEventListener('change', guard(commitAuditRange));
            $('#atPagination')?.addEventListener('click', guard((event) => {
                const button = event.target.closest('.coa-page-btn');
                if (!button || button.disabled) return;
                const target = button.dataset.page;
                if (target === 'prev') atCurrentPage -= 1;
                else if (target === 'next') atCurrentPage += 1;
                else atCurrentPage = Number(target);
                loadAuditTrail();
            }));
            $('#atPagination')?.addEventListener('click', guard((event) => {
                const option = event.target.closest('.coa-page-option');
                if (!option) return;
                atCurrentPage = Number(option.dataset.page);
                loadAuditTrail();
            }));
        }

        if (page === 'notifications') {
            void loadNotificationsPage();
            $('#notifPgMarkAll')?.addEventListener('click', throttle(guard(async () => {
                await markAllNotificationsRead();
                toast('All notifications marked as read.', 'success');
            }), 300));
            $('#notifPgList')?.addEventListener('click', (e) => {
                const item = e.target.closest('.notif-item[data-notif-id]');
                if (item) window.openHrNotif(item.dataset.notifId);
            });
        }

        if (page === 'settings') {
            $$('.sett-tab').forEach(tab => tab.addEventListener('click', () => {
                const target = tab.dataset.tab;
                $$('.sett-tab').forEach(item => item.classList.toggle('active', item === tab));
                $$('.sett-pane').forEach(pane => pane.classList.toggle('active', pane.id === `pane-${target}`));
            }));
            const toggleEdit = (section, isEdit) => {
                $(`#view-${section}`).style.display = isEdit ? 'none' : 'block';
                $(`#edit-${section}`).style.display = isEdit ? 'block' : 'none';
            };
            $('#editPersonalBtn')?.addEventListener('click', () => toggleEdit('personal', true));
            $('#cancelPersonalBtn')?.addEventListener('click', () => toggleEdit('personal', false));
            $('#editAddressBtn')?.addEventListener('click', () => toggleEdit('address', true));
            $('#cancelAddressBtn')?.addEventListener('click', () => toggleEdit('address', false));
            $('#savePersonalBtn')?.addEventListener('click', (e) => {
                if (!lockElement(e.currentTarget, 600)) return;
                guard(async () => {
                    try {
                        const result = await apiRequest('profile', { method: 'POST', body: JSON.stringify({
                            fullName: `${$('#sett-firstName').value} ${$('#sett-lastName').value}`.trim(),
                            email: $('#sett-email').value,
                            phone: $('#sett-phone').value
                        })});
                        activeUser = result.user;
                        localStorage.setItem('devs_user', result.user.username);
                        localStorage.setItem('devs_profile', JSON.stringify(result.user));
                        updateAvatarFromProfile();
                        renderPage('settings');
                        toast('Personal information updated.');
                    } catch (error) { toast(error.message, 'error'); }
                })();
            });
            $('#saveAddressBtn')?.addEventListener('click', (e) => {
                if (!lockElement(e.currentTarget, 600)) return;
                guard(() => {
                    store.settings.address = {
                        country: $('#sett-country').value, city: $('#sett-city').value,
                        province: $('#sett-province').value, street: $('#sett-street').value,
                        brgy: $('#sett-brgy').value
                    };
                    saveStore('settings:updated');
                    renderPage('settings');
                    toast('Address updated.');
                })();
            });
        }

        if (page === 'logout') {
            $('#confirmLogoutBtn')?.addEventListener('click', (e) => {
                if (!lockElement(e.currentTarget, 700)) return;
                guard(() => { setLoggedOut(); toast('You have been signed out.', 'info'); })();
            });
        }
    }

    // ============ EMPLOYEE / LEAVE / ATTENDANCE ACTIONS ============
    /* Resize an imported profile picture to a small data URL so it can travel
       comfortably inside the state payload. */
    function fileToAvatar(file, cb) {
        const img = new Image();
        const fr = new FileReader();
        fr.onload = () => {
            img.onload = () => {
                const max = 256;
                const scale = Math.min(1, max / Math.max(img.width, img.height));
                const c = document.createElement('canvas');
                c.width = Math.max(1, Math.round(img.width * scale));
                c.height = Math.max(1, Math.round(img.height * scale));
                c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
                cb(c.toDataURL('image/jpeg', 0.85));
            };
            img.onerror = () => { toast('That file could not be used as a profile picture.', 'error'); };
            img.src = fr.result;
        };
        fr.readAsDataURL(file);
    }

    function openEmployeeView(emp) {
        const isOwn = String(activeUser?.employeeId || '') === String(emp.id);
        const canChangeProfile = canManageRecords() || isOwn;
        openModal({
            title: `Employee Details`,
            onCancel: closeModal,
            onExtraClick: (e) => {
                const btn = e.target.closest('[data-act]');
                if (!btn) return false;
                const act = btn.dataset.act;
                if (act === 'change-profile') {
                    if (!canChangeProfile) { toast('Only your HR administrator can change other profiles.', 'error'); return true; }
                    $('#empAvatarFile')?.click();
                    return true;
                }
                if (act === 'edit-from-view') {
                    closeModal();
                    setTimeout(() => openEmployeeForm(empById(btn.dataset.id)), 120);
                    return true;
                }
                return false;
            },
            body: `
                <div class="view-modal-split">
                    <!-- Left branding panel -->
                    <div class="view-modal-left">
                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:32px;">
                            <img src="assets/logo.png" style="height:44px;width:auto;object-fit:contain;flex-shrink:0;" alt="DEVS logo">
                            <img src="assets/icon-devs.png" style="width:130px;height:auto;object-fit:contain;" alt="DEVS">
                        </div>
                        <h3 style="margin:0 0 8px;font-size:17px;font-weight:700;text-transform:uppercase;letter-spacing:0.03em;">EMPLOYEE DETAILS</h3>
                        <p style="margin:0;font-size:13px;line-height:1.5;color:rgba(255,255,255,0.82);">Manage the details of this employee.</p>
                        <div style="margin-top:auto;padding-bottom:16px;display:flex;justify-content:center;align-items:flex-end;">
                            <svg viewBox="0 0 120 120" width="120" height="120" style="opacity:0.22;" fill="currentColor" aria-hidden="true">
                                <rect x="20" y="10" width="80" height="100" rx="8" fill="none" stroke="white" stroke-width="5"/>
                                <line x1="35" y1="40" x2="85" y2="40" stroke="white" stroke-width="4" stroke-linecap="round"/>
                                <line x1="35" y1="58" x2="85" y2="58" stroke="white" stroke-width="4" stroke-linecap="round"/>
                                <line x1="35" y1="76" x2="65" y2="76" stroke="white" stroke-width="4" stroke-linecap="round"/>
                                <circle cx="88" cy="88" r="18" fill="none" stroke="white" stroke-width="5"/>
                                <path d="M82 88l4 4 8-8" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                            </svg>
                        </div>
                    </div>

                    <!-- Right detail panel -->
                    <div class="view-modal-right">
                        <div class="view-emp-head">
                            <div class="view-emp-avatar" id="empProfilePhoto">${emp.avatar ? `<img src="${emp.avatar}" alt="" />` : initials(emp.name)}</div>
                            <div>
                                <h2>View Details</h2>
                                <p class="view-subtitle" style="margin:0 !important;">${escapeHtml(String(emp.id).padStart(5, '0'))}</p>
                                ${canChangeProfile ? '<button type="button" class="view-emp-change" data-act="change-profile">Change Profile</button>' : ''}
                            </div>
                        </div>
                        <input type="file" id="empAvatarFile" accept="image/*" hidden />
                        <div class="view-data-list">
                            <div class="view-modal-row"><span>Name:</span> <strong>${escapeHtml(emp.name)}</strong></div>
                            <div class="view-modal-row"><span>Department:</span> <strong>${escapeHtml(emp.dept)}</strong></div>
                            <div class="view-modal-row"><span>Position:</span> <strong>${escapeHtml(emp.position || 'Staff')}</strong></div>
                            <div class="view-modal-row"><span>Status:</span> <strong style="color:${String(emp.status) === 'Active' ? '#1aa846' : '#c2181a'};">${escapeHtml(emp.status)}</strong></div>
                            <div class="view-modal-row"><span>Basic Salary:</span> <strong>${peso(emp.salary)}</strong></div>
                            <div class="view-modal-row"><span>Date Hired:</span> <strong>${escapeHtml(emp.joined || '—')}</strong></div>
                            <div class="view-modal-row"><span>Email:</span> <strong>${escapeHtml(emp.email || 'Not provided')}</strong></div>
                            <div class="view-modal-row"><span>Gender:</span> <strong>${escapeHtml(emp.gender || '—')}</strong></div>
                            <div class="view-modal-row"><span>Employee ID:</span> <strong>${escapeHtml(String(emp.id).padStart(5, '0'))}</strong></div>
                        </div>
                        <div style="text-align:right;margin-top:36px;display:flex;justify-content:flex-end;gap:10px;">
                            ${canManageRecords() ? `<button class="acc-btn-cancel" type="button" data-act="edit-from-view" data-id="${emp.id}">Edit</button>` : ''}
                            <button class="acc-btn-cancel" type="button" data-act="cancel">Close</button>
                        </div>
                    </div>
                </div>
            `
        });
        const modalEl = document.getElementById('modal');
        if (modalEl) modalEl.className = 'modal modal-split receivable-view-modal';
        // Profile picture picker (admins and the employee's own HR admin session).
        if (canChangeProfile) {
            requestAnimationFrame(() => {
                const file = $('#empAvatarFile');
                if (!file) return;
                file.addEventListener('change', () => {
                    const f = file.files?.[0];
                    file.value = '';
                    if (!f) return;
                    fileToAvatar(f, (dataUrl) => {
                        emp.avatar = dataUrl;
                        saveStore('employee:updated');
                        renderEmployeeRows();
                        const photo = $('#empProfilePhoto');
                        if (photo) photo.innerHTML = `<img src="${dataUrl}" alt="" />`;
                        toast('Profile picture updated.');
                    });
                });
            });
        }
    }
    function openEmployeeForm(emp = null) {
        const isEdit = !!emp;
        const e = emp || { name: '', position: HR_POSITIONS[0], dept: 'HR', gender: 'Female', email: '', phone: '', salary: '', status: 'Active', joined: todayDateString() };
        const depts = ['HR', 'Finance', 'Procurement', 'Inventory', 'Sales', 'Production'];
        // Keep a legacy position (e.g. Staff) selectable while editing an
        // existing record; new records use the department's current options.
        const employeePositionOptions = () => {
            const opts = positionOptionsFor(e.dept).slice();
            if (isEdit && e.position && !opts.includes(e.position)) opts.unshift(e.position);
            return opts;
        };
        openModal({
            title: isEdit ? `Edit Employee | ${emp.id}` : 'Add Employee',
            size: 'lg',
            onCancel: closeModal,
            onSubmit: async (form) => {
                const data = Object.fromEntries(new FormData(form).entries());
                let valid = true;
                const markError = (name, hasError) => {
                    const field = form.querySelector(`[name="${name}"]`)?.closest('.split-field');
                    if (field) field.classList.toggle('has-error', hasError);
                    if (hasError) valid = false;
                };
                markError('name', !data.name.trim());
                markError('email', !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email));
                markError('salary', !data.salary || Number(data.salary) <= 0);
                // A custom employee ID is optional; when given it must be a free number.
                let customId = 0;
                if (!isEdit && String(data.empId || '').trim() !== '') {
                    if (!/^\d{1,6}$/.test(String(data.empId).trim())) {
                        markError('empId', true);
                        if (valid) toast('Employee ID must be digits only (e.g. 1001).', 'error');
                        return;
                    }
                    customId = Number(String(data.empId).trim());
                    if (store.employees.some(x => String(x.id) === String(customId))) {
                        markError('empId', true);
                        toast(`Employee ID ${customId} is already in use.`, 'error');
                        return;
                    }
                    markError('empId', false);
                }
                if (!valid) return;
                const shared = {
                    name: data.name.trim(),
                    position: data.position,
                    dept: data.dept,
                    gender: data.gender,
                    email: data.email.trim(),
                    phone: data.phone.trim(),
                    salary: Number(data.salary),
                    status: data.status,
                    joined: data.joined
                };
                if (isEdit) {
                    Object.assign(emp, shared);
                    toast('Employee updated successfully.');
                } else {
                    // Leave id empty (or a custom ID) — the server assigns the real employee_id when empty.
                    store.employees.push({ id: customId || '', ...shared });
                    toast('Employee created successfully.');
                }
                await saveStore(isEdit ? 'employee:updated' : 'employee:created');
                closeModal();
                renderEmployeeRows();
                // Re-fetch from the server so all dependent rows pick up any
                // employee_id changes (edits, re-inserts) before we render
                // attendance/leave/payroll pages again.
                void syncStateFromServer().catch(() => {});
            },
            body: `
                <div class="voucher-split">
                    <div class="voucher-left">
                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:32px;">
                            <img src="assets/logo.png" style="height:44px;width:auto;object-fit:contain;flex-shrink:0;" alt="DEVS logo">
                            <img src="assets/icon-devs.png" style="width:150px;height:auto;object-fit:contain;" alt="DEVS">
                        </div>
                        <h3 style="margin-bottom:8px;font-size:18px;font-weight:700;">${isEdit ? 'EDIT EMPLOYEE' : 'ADD EMPLOYEE'}</h3>
                        <p style="margin:0;font-size:13px;line-height:1.5;color:rgba(255,255,255,0.85);">${isEdit ? 'Update the employee details to keep your records accurate.' : 'Fill in the necessary details to add a new employee.'}</p>
                        <div style="margin-top:auto;padding-bottom:20px;display:flex;justify-content:center;align-items:flex-end;">
                            <svg viewBox="0 0 120 120" width="120" height="120" style="opacity:0.3;" fill="currentColor" aria-hidden="true">
                                <rect x="20" y="10" width="80" height="100" rx="8" fill="none" stroke="white" stroke-width="5"/>
                                <line x1="35" y1="40" x2="85" y2="40" stroke="white" stroke-width="4" stroke-linecap="round"/>
                                <line x1="35" y1="58" x2="85" y2="58" stroke="white" stroke-width="4" stroke-linecap="round"/>
                                <line x1="35" y1="76" x2="65" y2="76" stroke="white" stroke-width="4" stroke-linecap="round"/>
                                <circle cx="88" cy="88" r="18" fill="none" stroke="white" stroke-width="5"/>
                                <path d="M82 88l4 4 8-8" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                            </svg>
                        </div>
                    </div>
                    <div class="voucher-right modal-split-right">
                        <form id="empForm" novalidate>
                            <section class="split-section">
                                <div class="split-section-header">
                                    <span class="split-section-icon">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-5 9 5M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/></svg>
                                    </span>
                                    <h3>Account Information</h3>
                                </div>
                                <div class="split-grid">
                        ${isEdit ? `
                        <div class="split-field"><label>Employee ID</label><input type="text" value="${escapeHtml(String(emp.id))}" disabled /></div>
                        ` : `
                        <div class="split-field"><label for="f-empid">Employee ID <em class="optional-hint">(optional — auto-assigned if empty)</em></label><input type="text" id="f-empid" name="empId" inputmode="numeric" pattern="[0-9]*" placeholder="e.g. 1001" /><span class="error-text">Digits only, e.g. 1001.</span></div>
                        `}
                        <div class="split-field ${isEdit ? 'full' : ''}"><label for="f-name">${isEdit ? 'Full Name' : 'Account Name'} <b class="req">*</b></label><input type="text" id="f-name" name="name" value="${escapeHtml(e.name)}" required /><span class="error-text">Please enter the employee's full name.</span></div>
                        <div class="split-field"><label for="f-email">Email <b class="req">*</b></label><input type="email" id="f-email" name="email" value="${escapeHtml(e.email)}" required /><span class="error-text">Please enter a valid email.</span></div>
                        <div class="split-field"><label for="f-phone">Contact Number</label><input type="text" id="f-phone" name="phone" value="${escapeHtml(e.phone)}" placeholder="63+" /></div>
                        <div class="split-field"><label for="f-gender">Gender</label><select id="f-gender" name="gender"><option ${e.gender === 'Female' ? 'selected' : ''}>Female</option><option ${e.gender === 'Male' ? 'selected' : ''}>Male</option></select></div>
                        <div class="split-field"><label for="f-position">Account Type</label><select id="f-position" name="position" required>${employeePositionOptions().map(p => `<option ${e.position === p ? 'selected' : ''}>${escapeHtml(p)}</option>`).join('')}</select></div>
                        <div class="split-field"><label for="f-dept">Departments</label><select id="f-dept" name="dept" required>${depts.map(d => `<option ${d === e.dept ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
                    </div>
                            </section>
                            <section class="split-section">
                                <div class="split-section-header">
                                    <span class="split-section-icon">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 10h5a2 2 0 0 1 0 4H9"/></svg>
                                    </span>
                                    <h3>Details</h3>
                                </div>
                                <div class="split-grid">
                        <div class="split-field"><label for="f-joined">Date Hired</label><input type="date" id="f-joined" name="joined" value="${e.joined}" required /></div>
                        <div class="split-field"><label for="f-status">Employee Status</label><select id="f-status" name="status">
                            <option value="" ${e.status && e.status !== '' ? '' : 'selected'} disabled>Select Status</option>
                            <option value="Active" ${e.status === 'Active' ? 'selected' : ''}>Active</option>
                            <option value="On Leave" ${e.status === 'On Leave' ? 'selected' : ''}>On Leave</option>
                            <option value="Terminated" ${e.status === 'Terminated' ? 'selected' : ''}>Terminated</option>
                        </select></div>
                        <div class="split-field"><label for="f-salary">Opening Balance <em class="optional-hint">(basic monthly salary, ₱)</em> <b class="req">*</b></label><input type="number" id="f-salary" name="salary" min="0" step="500" value="${e.salary}" required /><span class="error-text">Please enter a valid salary.</span></div>
                                </div>
                            </section>
                            <div class="split-actions">
                                <button type="button" class="btn-cancel-pill" data-act="cancel">Cancel</button>
                                <button type="submit" class="btn-save-pill">${isEdit ? 'Save Changes' : 'Create Employee'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            `
        });
        const modalEl = document.getElementById('modal');
        if (modalEl) modalEl.classList.add('modal-split', 'voucher-modal');
        // Department drives the position options here, as in Add Account.
        const empDeptSel = document.getElementById('f-dept');
        const empPosSel = document.getElementById('f-position');
        empDeptSel?.addEventListener('change', () => {
            if (!empPosSel) return;
            const opts = positionOptionsFor(empDeptSel.value || 'HR');
            const current = empPosSel.value;
            empPosSel.innerHTML = opts.map(p => `<option ${p === current ? 'selected' : ''}>${escapeHtml(p)}</option>`).join('');
            refreshUpgradedSelect(empPosSel);
        });
    }
    function openCreateAccountForm(prefill = {}) {
        const depts = ['HR', 'Finance', 'Procurement', 'Inventory', 'Sales', 'Production'];
        const today = todayDateString();
        const val = (name, fallback = '') => escapeHtml(String(prefill[name] ?? fallback));
        // HR and Finance use their own position sets; other departments keep
        // their own role sets (shared helper near the top of this file).
        const positionOptions = positionOptionsFor;
        const initialPos = positionOptions(prefill.department || 'HR');

        openModal({
            title: 'Add Account',
            size: 'lg',
            onCancel: closeModal,
            onSubmit: async (form) => {
                const data = Object.fromEntries(new FormData(form).entries());
                let valid = true;
                const mark = (name, err) => {
                    const f = form.querySelector(`[name="${name}"]`)?.closest('.split-field, .form-field');
                    if (f) f.classList.toggle('has-error', err);
                    if (err) valid = false;
                };
                mark('fullName',         !String(data.fullName || '').trim());
                mark('email',            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email || '')));
                mark('phone',            !/^\d{11}$/.test(String(data.phone || '').trim()));
                const pw = String(data.password || '');
                mark('password',         pw.length < 10 || !/[A-Z]/.test(pw) || !/[0-9!@#$%^&*()_\-+=[\]{};:'",.<>/?\\|`~]/.test(pw));
                mark('confirmPassword',  data.password !== data.confirmPassword);
                if (!valid) return;

                // Verification step — show a review summary before creating.
                openCreateAccountVerify(data);
            },
            body: `
                <form novalidate>
                    <p style="margin:0 0 16px;color:#555;font-size:13px;line-height:1.5;">
                        Fill in the employee's details and login credentials. They'll be able to sign in
                        with the email and password you set and will land on their department's dashboard.
                    </p>
                    <div class="form-grid">
                        <div class="form-field full">
                            <label>Full Name</label>
                            <input type="text" name="fullName" required value="${val('fullName')}" />
                            <span class="error-text">Enter the employee's full name.</span>
                        </div>
                        <div class="split-field">
                            <label>Position</label>
                            <select name="position" required>
                                ${initialPos.map(p => `<option value="${p}" ${val('position') === p ? 'selected' : ''}>${p}</option>`).join('')}
                            </select>
                        </div>
                        <div class="split-field">
                            <label>Department</label>
                            <select name="department" required>
                                ${depts.map(d => `<option value="${d}" ${val('department') === d ? 'selected' : ''}>${d}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-field">
                            <label>Email</label>
                            <input type="email" name="email" required value="${val('email')}" />
                            <span class="error-text">Enter a valid email.</span>
                        </div>
                        <div class="form-field">
                            <label>Phone</label>
                            <input type="text" name="phone" inputmode="numeric" maxlength="11" required value="${val('phone')}" />
                            <span class="error-text">Enter an 11-digit phone number (e.g. 09123456789).</span>
                        </div>
                        <div class="form-field full">
                            <label>Date Joined</label>
                            <input class="picker-input" type="date" name="joined" value="${today}" required readonly style="background:#f5f5f7;color:#555;cursor:not-allowed;" />
                            <span class="field-hint">Automatically set to today's date.</span>
                        </div>
                        <div class="form-field full" style="margin-top:8px;">
                            <label style="color:#8c1f2d;font-weight:800;">Login Credentials</label>
                        </div>
                        <div class="form-field">
                            <label>Password</label>
                            <div class="password-field">
                                <input type="password" name="password" minlength="10" required value="${val('password')}" />
                                <button type="button" class="password-toggle" data-toggle-pass="password" aria-label="Show password" aria-pressed="false">
                                    <svg class="password-eye" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"></path>
                                        <circle cx="12" cy="12" r="2.5"></circle>
                                        <line class="eye-slash" x1="4" y1="4" x2="20" y2="20"></line>
                                    </svg>
                                </button>
                            </div>
                            <span class="field-hint" data-pw-hint>At least 10 characters, one uppercase letter and one number or symbol.</span>
                        </div>
                        <div class="form-field">
                            <label>Confirm Password</label>
                            <div class="password-field">
                                <input type="password" name="confirmPassword" minlength="10" required value="${val('confirmPassword')}" />
                                <button type="button" class="password-toggle" data-toggle-pass="confirmPassword" aria-label="Show password" aria-pressed="false">
                                    <svg class="password-eye" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"></path>
                                        <circle cx="12" cy="12" r="2.5"></circle>
                                        <line class="eye-slash" x1="4" y1="4" x2="20" y2="20"></line>
                                    </svg>
                                </button>
                            </div>
                            <span class="error-text">Passwords must match.</span>
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-subtle" data-act="cancel">Cancel</button>
                        <button type="submit" class="btn btn-primary">Review &amp; Create</button>
                    </div>
                </form>
            `
        });

        // Department drives the Position options: HR and Finance each use
        // their own role set; other departments keep their own roles. Rebuild
        // the searchable dropdown when the department changes.
        const deptSel = modalBody.querySelector('[name="department"]');
        const posSel = modalBody.querySelector('[name="position"]');
        const refreshPositionOptions = () => {
            const opts = positionOptions(deptSel?.value || 'HR');
            if (!posSel) return;
            const changed = [...posSel.options].some(o => !opts.includes(o.value)) || opts.length !== posSel.options.length;
            if (!changed) return;
            posSel.nextElementSibling?.classList.contains('ss-wrap') && posSel.nextElementSibling.remove();
            delete posSel.dataset.ssUpgraded;
            posSel.classList.remove('ss-native-hidden');
            posSel.innerHTML = opts.map(p => `<option value="${p}">${p}</option>`).join('');
            upgradeSelectsIn(posSel);
        };
        deptSel?.addEventListener('change', refreshPositionOptions);
        refreshPositionOptions();

        // Show/hide password eye toggles (same behaviour as the login page).
        modalBody.querySelectorAll('.password-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = modalBody.querySelector(`[name="${btn.dataset.togglePass}"]`);
                if (!input) return;
                const isHidden = input.type === 'password';
                input.type = isHidden ? 'text' : 'password';
                btn.classList.toggle('is-visible', isHidden);
                btn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
                btn.setAttribute('aria-pressed', String(isHidden));
            });
        });

        // Live password-requirements feedback: while the password doesn't meet
        // the policy, the requirements hint turns red with an exclamation
        // mark; it goes back to the plain gray hint once it's valid. `strict`
        // (used on submit) also flags an empty password.
        const pwInput = modalBody.querySelector('[name="password"]');
        const pwHint = modalBody.querySelector('[data-pw-hint]');
        const pwHintText = 'At least 10 characters, one uppercase letter and one number or symbol.';
        const pwIcon = '<svg class="hint-warn" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
            + '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"></circle>'
            + '<line x1="12" y1="6.5" x2="12" y2="13.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"></line>'
            + '<circle cx="12" cy="17" r="1.4" fill="currentColor"></circle>'
            + '</svg>';
        const pwValid = (v) => v.length >= 10 && /[A-Z]/.test(v) && /[0-9\x21-\x2F\x3A-\x40\x5B-\x60\x7B-\x7E]/.test(v);
        const refreshPwHint = (strict = false) => {
            if (!pwInput || !pwHint) return;
            const bad = strict ? !pwValid(pwInput.value) : (pwInput.value.length > 0 && !pwValid(pwInput.value));
            pwHint.classList.toggle('hint-error', bad);
            pwHint.innerHTML = bad ? pwIcon + pwHintText : pwHintText;
        };
        pwInput?.addEventListener('input', () => refreshPwHint(false));
        refreshPwHint(false);
        // Re-check on submit so an untouched/empty password also shows the error.
        modalBody.querySelector('form')?.addEventListener('submit', () => refreshPwHint(true));
    }

    // Verification step — reviews the entered details before the account is
    // actually created. "Return to Form" reopens the Add Account modal with
    // the same values; "Confirm & Create" posts to users.create.
    function openCreateAccountVerify(data) {
        const rows = [
            ['Full Name',   String(data.fullName).trim()],
            ['Position',    data.position || 'Staff'],
            ['Department',  data.department || 'HR'],
            ['Email',       String(data.email).trim()],
            ['Phone',       String(data.phone || '').trim() || '—'],
            ['Date Joined', data.joined || todayDateString()],
        ];
        openModal({
            title: 'Verify Account Details',
            size: 'sm',
            onCancel: () => openCreateAccountForm(data), // back = edit again
            onExtraClick: (e) => {
                if (!e.target.closest('[data-act="verifyCreate"]')) return false;
                (async () => {
                    try {
                        const r = await apiRequest('users.create', {
                            method: 'POST',
                            body: JSON.stringify({
                                fullName:        String(data.fullName).trim(),
                                email:           String(data.email).trim(),
                                phone:           String(data.phone || '').trim(),
                                position:        data.position || 'Staff',
                                department:      data.department || 'HR',
                                salary:          0,
                                status:          'Active',
                                joined:          data.joined || todayDateString(),
                                password:        data.password,
                                confirmPassword: data.confirmPassword,
                            })
                        });
                        toast(r.message || 'Account created successfully.');
                        closeModal();
                        await loadAccountManagement();
                        await syncStateFromServer().catch(() => {});
                    } catch (err) {
                        toast(err.message, 'error');
                    }
                })();
                return true;
            },
            body: `
                <p style="margin:0 0 14px;color:#555;font-size:13px;line-height:1.5;">
                    Please review the details below before the account is created.
                    Once confirmed, the person can sign in immediately with the email and password you set.
                </p>
                <div style="border:1px solid #eee2e2;border-radius:10px;padding:12px 14px;background:#fdf7f7;">
                    ${rows.map(([k, v]) => `
                        <div style="display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid #f3e6e6;font-size:13px;">
                            <span style="color:#8a8f98;">${k}</span>
                            <strong style="color:#2b2b2b;text-align:right;word-break:break-all;">${escapeHtml(v)}</strong>
                        </div>
                    `).join('')}
                </div>
                <div class="form-actions" style="margin-top:16px;padding-top:0;border-top:none;">
                    <button type="button" class="btn btn-subtle" data-act="cancel">Return to Form</button>
                    <button type="button" class="btn btn-primary" data-act="verifyCreate">Confirm &amp; Create</button>
                </div>
            `
        });
    }

    function openResetPasswordModal(user) {
        return new Promise((resolve) => {
            let settled = false;
            const finish = (value) => {
                if (settled) return;
                settled = true;
                closeModal();
                resolve(value);
            };
            const eyeBtn = (name) => `
                <button type="button" class="password-toggle" data-toggle-pass="${name}" aria-label="Show password" aria-pressed="false">
                    <svg class="password-eye" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z"/>
                        <circle cx="12" cy="12" r="2.5"/>
                        <path class="eye-slash" d="M3 3l18 18"/>
                    </svg>
                </button>`;
            openModal({
                title: 'Reset Password',
                size: 'lg',
                onCancel: () => finish(null),
                onExtraClick: (e) => {
                    const btn = e.target.closest('[data-act]');
                    if (!btn) return false;
                    if (btn.dataset.act !== 'confirm-reset') return false;
                    const password        = modalBody.querySelector('[name="resetPassword"]')?.value || '';
                    const confirmPassword = modalBody.querySelector('[name="resetConfirmPassword"]')?.value || '';
                    if (!password || !confirmPassword) {
                        toast('Please enter and confirm the new password.', 'error');
                        return true;
                    }
                    if (password.length < 10 || !/[A-Z]/.test(password) || !/[0-9!@#$%^&*()_\-+=[\]{};:'",.<>/?\\|`~]/.test(password)) {
                        toast('New password must be at least 10 characters with an uppercase letter and a number.', 'error');
                        return true;
                    }
                    if (password !== confirmPassword) {
                        toast('New passwords do not match.', 'error');
                        return true;
                    }
                    finish({ id: user.id, password, confirmPassword });
                    return true;
                },
                body: `
                    <p style="margin:0 0 16px;color:#555;font-size:13.5px;line-height:1.5;">
                        Set a new password for <strong>${escapeHtml(user.fullName)}</strong>. Type it below and confirm it. On the next screen you will be asked for your own HR account password to approve the change.
                    </p>
                    <div class="form-grid">
                        <div class="form-field">
                            <label>New Password</label>
                            <div class="password-field">
                                <input type="password" name="resetPassword" autocomplete="new-password" placeholder="Type the new password" value="" />
                                ${eyeBtn('resetPassword')}
                            </div>
                            <span class="field-hint">At least 10 characters with an uppercase letter and a number.</span>
                        </div>
                        <div class="form-field">
                            <label>Confirm New Password</label>
                            <div class="password-field">
                                <input type="password" name="resetConfirmPassword" autocomplete="new-password" placeholder="Retype the new password" value="" />
                                ${eyeBtn('resetConfirmPassword')}
                            </div>
                        </div>
                    </div>
                    <div class="form-actions" style="margin-top:16px;">
                        <button class="btn btn-subtle" type="button" data-act="cancel">Cancel</button>
                        <button class="btn btn-primary" type="button" data-act="confirm-reset">Confirm Reset</button>
                    </div>
                `
            });
            modalBody.querySelectorAll('.password-toggle').forEach(btn => {
                btn.addEventListener('click', () => {
                    const input = modalBody.querySelector(`[name="${btn.dataset.togglePass}"]`);
                    if (!input) return;
                    const isHidden = input.type === 'password';
                    input.type = isHidden ? 'text' : 'password';
                    btn.classList.toggle('is-visible', isHidden);
                    btn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
                    btn.setAttribute('aria-pressed', String(isHidden));
                });
            });
            modalBody.querySelector('[name="resetPassword"]')?.focus();
        });
    }

    function openHrPasswordConfirmModal(user) {
        return new Promise((resolve) => {
            let settled = false;
            const finish = (value) => {
                if (settled) return;
                settled = true;
                closeModal();
                resolve(value);
            };
            openModal({
                title: 'Confirm Password Change',
                onCancel: () => finish(null),
                onExtraClick: (e) => {
                    const btn = e.target.closest('[data-act]');
                    if (!btn) return false;
                    if (btn.dataset.act !== 'confirm-hr-password') return false;
                    const adminPassword = modalBody.querySelector('[name="hrConfirmPassword"]')?.value || '';
                    if (!adminPassword) {
                        toast('Please enter your HR account password.', 'error');
                        return true;
                    }
                    finish(adminPassword);
                    return true;
                },
                body: `
                    <p style="margin:0 0 16px;color:#555;font-size:13.5px;line-height:1.5;">
                        Enter your own <strong>HR account password</strong> to confirm the password change for <strong>${escapeHtml(user.fullName)}</strong>. Nothing is saved until you confirm.
                    </p>
                    <div class="form-grid">
                        <div class="form-field">
                            <label>Your HR Account Password</label>
                            <div class="password-field">
                                <input type="password" name="hrConfirmPassword" autocomplete="current-password" placeholder="Type your HR password" value="" />
                                <button type="button" class="password-toggle" data-toggle-pass="hrConfirmPassword" aria-label="Show password" aria-pressed="false">
                                    <svg class="password-eye" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                        <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z"/>
                                        <circle cx="12" cy="12" r="2.5"/>
                                        <path class="eye-slash" d="M3 3l18 18"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="form-actions" style="margin-top:16px;">
                        <button class="btn btn-subtle" type="button" data-act="cancel">Cancel</button>
                        <button class="btn btn-primary" type="button" data-act="confirm-hr-password">Confirm &amp; Change Password</button>
                    </div>
                `
            });
            modalBody.querySelectorAll('.password-toggle').forEach(btn => {
                btn.addEventListener('click', () => {
                    const input = modalBody.querySelector(`[name="${btn.dataset.togglePass}"]`);
                    if (!input) return;
                    const isHidden = input.type === 'password';
                    input.type = isHidden ? 'text' : 'password';
                    btn.classList.toggle('is-visible', isHidden);
                    btn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
                    btn.setAttribute('aria-pressed', String(isHidden));
                });
            });
            modalBody.querySelector('[name="hrConfirmPassword"]')?.focus();
        });
    }

    function openResetPasswordResultModal(employeeName, message) {
        openModal({
            title: 'Password Updated',
            size: 'sm',
            onCancel: closeModal,
            onExtraClick: (e) => {
                if (e.target.closest('[data-act="close-reset"]')) { closeModal(); return true; }
                return false;
            },
            body: `
                <div style="text-align:center;padding:8px 0 4px;">
                    <div style="font-size:13px;color:#555;line-height:1.6;margin-bottom:16px;">
                        The password for <strong>${escapeHtml(employeeName)}</strong> has been changed.
                        ${message ? `<br><span style="color:#888;">${escapeHtml(message)}</span>` : ''}
                    </div>
                </div>
                <div class="form-actions" style="margin-top:0;padding-top:0;border-top:none;justify-content:center;">
                    <button class="btn btn-primary" type="button" data-act="close-reset">Close</button>
                </div>
            `
        });
    }

    async function handleEmployeeAction(e) {
        const btn = e.target.closest('button[data-act]');
        if (!btn) return;
        const act = btn.dataset.act;
        if (act !== 'view' && !canManageRecords()) {
            toast('Only HR administrators can modify employee records.', 'error');
            return;
        }
        const id = btn.dataset.id;
        const emp = store.employees.find(x => String(x.id) === String(id));
        if (!emp) return;
        if (act === 'view') openEmployeeView(emp);
        if (act === 'edit') openEmployeeForm(emp);
        if (act === 'delete') {
            const ok = await confirmDialog({ title: 'Delete Employee', message: `Are you sure you want to remove ${emp.name}? This cannot be undone.`, confirmLabel: 'Delete', danger: true });
            if (!ok) return;
            store.employees = store.employees.filter(x => x.id !== id);
            saveStore('employee:deleted');
            toast('Employee removed.', 'info');
            renderEmployeeRows();
        }
    }

    function openAttendanceForm(att = null) {
        const isEdit = !!att;
        const a = att || { empId: '', date: todayDateString(), timeIn: '08:00', timeOut: '17:00', status: 'Present' };
        const timeIn = a.timeIn === '\u2014' ? '' : a.timeIn;
        const timeOut = a.timeOut === '\u2014' ? '' : a.timeOut;
        openModal({
            title: isEdit ? `Edit Attendance | ${att.id}` : 'Log Attendance',
            size: 'lg',
            onCancel: closeModal,
            onSubmit: (form) => {
                const data = Object.fromEntries(new FormData(form).entries());
                let valid = true;
                const mark = (name, err) => {
                    const f = form.querySelector(`[name="${name}"]`)?.closest('.split-field');
                    if (f) f.classList.toggle('has-error', err);
                    if (err) valid = false;
                };
                mark('empId', !data.empId);
                mark('date', !data.date);
                if (!valid) return;
                const empIdNum = Number(data.empId);
                if (!Number.isFinite(empIdNum) || empIdNum <= 0) {
                    toast('Please select a valid employee.', 'error');
                    return;
                }
                if (isEdit) {
                    Object.assign(att, { empId: empIdNum, date: data.date, timeIn: data.timeIn, timeOut: data.timeOut, status: data.status });
                    toast('Attendance updated.');
                } else {
                    store.attendance.push({ id: nextId('ATT', store.attendance), empId: empIdNum, date: data.date, timeIn: data.timeIn || '', timeOut: data.timeOut || '', status: data.status });
                    toast('Attendance logged.');
                }
                saveStore(isEdit ? 'attendance:updated' : 'attendance:added');
                closeModal();
                renderAttendanceRows();
            },
            body: `
                <div class="voucher-split">
                    <div class="voucher-left">
                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:32px;">
                            <img src="assets/logo.png" style="height:44px;width:auto;object-fit:contain;flex-shrink:0;" alt="DEVS logo">
                            <img src="assets/icon-devs.png" style="width:150px;height:auto;object-fit:contain;" alt="DEVS">
                        </div>
                        <h3 style="margin-bottom:8px;font-size:18px;font-weight:700;">${isEdit ? 'EDIT ATTENDANCE' : 'LOG ATTENDANCE'}</h3>
                        <p style="margin:0;font-size:13px;line-height:1.5;color:rgba(255,255,255,0.85);">${isEdit ? 'Update the time record so the attendance log stays accurate.' : 'Fill in the details to add a record to the attendance log.'}</p>
                        <div style="margin-top:auto;padding-bottom:20px;display:flex;justify-content:center;align-items:flex-end;">
                            <svg viewBox="0 0 120 120" width="120" height="120" style="opacity:0.3;" fill="none" stroke="white" stroke-width="5" aria-hidden="true">
                                <circle cx="60" cy="60" r="42"/>
                                <path d="M60 34v28l20 12" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                    </div>
                    <div class="voucher-right modal-split-right">
                        <form id="attForm" novalidate>
                            <section class="split-section">
                                <div class="split-section-header">
                                    <span class="split-section-icon">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                                    </span>
                                    <h3>Attendance Information</h3>
                                </div>
                                <div class="split-grid">
                                    <div class="split-field full"><label for="a-emp">Employee <b class="req">*</b></label><select id="a-emp" name="empId" required><option value="">Select employee…</option>${store.employees.map(e => { const n = Number(e.id); return Number.isFinite(n) && n > 0 ? `<option value="${n}" ${String(n) === String(a.empId) ? 'selected' : ''}>${escapeHtml(e.name)} | ${n}</option>` : ''; }).join('')}</select><span class="error-text">Please select an employee.</span></div>
                                    <div class="split-field"><label for="a-date">Date <b class="req">*</b></label><input type="date" id="a-date" name="date" value="${a.date}" required /><span class="error-text">Required.</span></div>
                                    <div class="split-field"><label for="a-status">Status</label><select id="a-status" name="status"><option ${a.status === 'Present' ? 'selected' : ''}>Present</option><option ${a.status === 'Late' ? 'selected' : ''}>Late</option><option ${a.status === 'On Leave' ? 'selected' : ''}>On Leave</option></select></div>
                                    <div class="split-field"><label for="a-tin">Time In</label><input type="time" id="a-tin" name="timeIn" value="${timeIn}" /></div>
                                    <div class="split-field"><label for="a-tout">Time Out</label><input type="time" id="a-tout" name="timeOut" value="${timeOut}" /></div>
                                </div>
                            </section>
                            <div class="split-actions">
                                <button type="button" class="btn-cancel-pill" data-act="cancel">Cancel</button>
                                <button type="submit" class="btn-save-pill">${isEdit ? 'Save Changes' : 'Log Attendance'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            `
        });
        const modalEl = document.getElementById('modal');
        if (modalEl) modalEl.classList.add('modal-split', 'voucher-modal');
    }
    async function logStaffAttendance(mode) {
        try {
            const result = await apiRequest('attendance.log', { method: 'POST', body: JSON.stringify({ mode }) });
            const existingIndex = store.attendance.findIndex(item => item.id === result.attendance.id);
            if (existingIndex >= 0) store.attendance[existingIndex] = result.attendance;
            else store.attendance.push(result.attendance);
            toast(result.message);
            renderAttendanceRows();
        } catch (error) { toast(error.message, 'error'); }
    }
    async function handleAttendanceAction(e) {
        if (!canManageRecords()) return;
        const btn = e.target.closest('button[data-act]');
        if (!btn) return;
        const { act, id } = btn.dataset;
        const att = store.attendance.find(x => String(x.id) === String(id));
        if (!att) return;
        if (act === 'editAtt') openAttendanceForm(att);
        if (act === 'deleteAtt') {
            const ok = await confirmDialog({ title: 'Delete Attendance', message: 'Remove this attendance record?', confirmLabel: 'Delete', danger: true });
            if (!ok) return;
            store.attendance = store.attendance.filter(x => x.id !== id);
            saveStore('attendance:deleted');
            toast('Record removed.', 'info');
            renderAttendanceRows();
        }
    }

    function openLeaveForm() {
        const staffRequest = !canManageRecords();
        openModal({
            title: staffRequest ? 'Request Leave' : 'New Leave Request',
            size: 'lg',
            onCancel: closeModal,
            onSubmit: async (form) => {
                const data = Object.fromEntries(new FormData(form).entries());
                let valid = true;
                const mark = (name, err) => {
                    const f = form.querySelector(`[name="${name}"]`)?.closest('.split-field');
                    if (f) f.classList.toggle('has-error', err);
                    if (err) valid = false;
                };
                if (canManageRecords()) mark('empId', !data.empId);
                mark('from', !data.from);
                mark('to', !data.to || (data.from && data.to < data.from));
                if (!valid) return;
                if (!canManageRecords()) {
                    const result = await apiRequest('leave.request', {
                        method: 'POST',
                        body: JSON.stringify({
                            type: data.type,
                            from: data.from,
                            to: data.to,
                            reason: (data.reason || '').trim(),
                            proofName: '',
                            proofData: ''
                        })
                    });
                    store.leaves.push(result.leave);
                    toast(result.message);
                } else {
                    const empIdNum = Number(data.empId);
                    if (!Number.isFinite(empIdNum) || empIdNum <= 0) {
                        toast('Please select a valid employee.', 'error');
                        return;
                    }
                    store.leaves.push({
                        id: nextId('LV', store.leaves, 4),
                        empId: empIdNum, type: data.type,
                        from: data.from, to: data.to,
                        reason: (data.reason || '').trim() || 'No reason provided',
                        status: 'Pending'
                    });
                    saveStore('leave:submitted');
                    toast('Leave request submitted.');
                }
                closeModal();
                renderLeaveRows();
            },
            body: `
                <div class="voucher-split">
                    <div class="voucher-left">
                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:32px;">
                            <img src="assets/logo.png" style="height:44px;width:auto;object-fit:contain;flex-shrink:0;" alt="DEVS logo">
                            <img src="assets/icon-devs.png" style="width:150px;height:auto;object-fit:contain;" alt="DEVS">
                        </div>
                        <h3 style="margin-bottom:8px;font-size:18px;font-weight:700;">${staffRequest ? 'REQUEST LEAVE' : 'NEW LEAVE REQUEST'}</h3>
                        <p style="margin:0;font-size:13px;line-height:1.5;color:rgba(255,255,255,0.85);">${staffRequest ? 'Fill in the necessary details to file your leave request.' : 'Fill in the necessary details to file a leave request for an employee.'}</p>
                        <div style="margin-top:auto;padding-bottom:20px;display:flex;justify-content:center;align-items:flex-end;">
                            <svg viewBox="0 0 120 120" width="120" height="120" style="opacity:0.3;" fill="none" stroke="white" stroke-width="5" aria-hidden="true">
                                <rect x="22" y="30" width="76" height="70" rx="8"/>
                                <path d="M22 50h76M42 20v18M78 20v18" stroke-linecap="round"/>
                            </svg>
                        </div>
                    </div>
                    <div class="voucher-right modal-split-right">
                        <form id="leaveForm" novalidate>
                            <section class="split-section">
                                <div class="split-section-header">
                                    <span class="split-section-icon">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>
                                    </span>
                                    <h3>Leave Information</h3>
                                </div>
                                <div class="split-grid">
                                    ${staffRequest ? '' : `<div class="split-field full"><label for="l-emp">Employee <b class="req">*</b></label><select id="l-emp" name="empId" required><option value="">Select employee…</option>${store.employees.map(e => { const n = Number(e.id); return Number.isFinite(n) && n > 0 ? `<option value="${n}">${escapeHtml(e.name)} | ${n}</option>` : ''; }).join('')}</select><span class="error-text">Please select an employee.</span></div>`}
                                    <div class="split-field"><label for="l-type">Leave Type</label><select id="l-type" name="type"><option>Vacation Leave</option><option>Sick Leave</option><option>Emergency Leave</option></select></div>
                                    <div class="split-field"><label for="l-from">From <b class="req">*</b></label><input type="date" id="l-from" name="from" required /><span class="error-text">Required.</span></div>
                                    <div class="split-field"><label for="l-to">To <b class="req">*</b></label><input type="date" id="l-to" name="to" required /><span class="error-text">Required.</span></div>
                                    <div class="split-field full"><label for="l-reason">Reason</label><textarea id="l-reason" name="reason" rows="3" placeholder="Brief reason for leave…"></textarea></div>
                                </div>
                            </section>
                            <div class="split-actions">
                                <button type="button" class="btn-cancel-pill" data-act="cancel">Cancel</button>
                                <button type="submit" class="btn-save-pill">Submit Request</button>
                            </div>
                        </form>
                    </div>
                </div>
            `
        });
        const modalEl = document.getElementById('modal');
        if (modalEl) modalEl.classList.add('modal-split', 'voucher-modal');
    }
    function viewLeave(l) {
        const emp = empById(l.empId);
        const name = recordEmployeeName(l);
        const empNo = emp?.id ?? l.empId;
        const empCode = /^\d+$/.test(String(empNo)) ? `EMP-${String(empNo).padStart(3, '0')}` : String(empNo);
        const statusColorMap = { Approved: '#2f9b52', Rejected: '#c2181a', Pending: '#d97706' };
        const statusColor = statusColorMap[l.status] || '#6f6f6f';
        const monthMatch = /^(\d{4})-(\d{2})/.exec(String(l.from || ''));
        const monthLabel = monthMatch ? `${LEAVE_MONTHS[Number(monthMatch[2]) - 1]} ${monthMatch[1]}` : '';

        openModal({
            title: ' ',
            onCancel: closeModal,
            body: `
                <div class="leave-view-sheet">
                    <img src="assets/icon-devs.png" alt="DEVS" class="leave-view-logo">
                    <p class="leave-view-sub">Leave Request${monthLabel ? ` - ${escapeHtml(monthLabel)}` : ''}</p>
                    <div class="leave-view-rule"></div>
                    <h3 class="leave-view-name">${escapeHtml(shortEmployeeName(name))} <span>(${escapeHtml(empCode)})</span></h3>
                    <p class="leave-view-period">Period: ${escapeHtml(leavePeriodLabel(l))}</p>
                    <div class="leave-view-list">
                        <div class="leave-view-row"><span>Leave Reason</span><strong>${escapeHtml(leaveTypeLabel(l.type))}</strong></div>
                        <div class="leave-view-row"><span>Start Date</span><strong>${escapeHtml(usDate(l.from))}</strong></div>
                        <div class="leave-view-row"><span>End Date</span><strong>${escapeHtml(usDate(l.to))}</strong></div>
                        <div class="leave-view-row"><span>Status</span><strong style="color:${statusColor};">${escapeHtml(l.status)}</strong></div>
                    </div>
                    <div class="leave-view-rule"></div>
                    <div class="leave-view-total"><span>TOTAL DAY OF LEAVE :</span><strong>${calcDays(l.from, l.to)} Days</strong></div>
                    <div class="leave-view-actions">
                        <button class="btn-outline-red" type="button" data-act="cancel">Close</button>
                    </div>
                </div>
            `
        });

        const modalEl = document.getElementById('modal');
        if (modalEl) modalEl.classList.add('leave-view-modal');
    }

    async function handleLeaveAction(e) {
        const btn = e.target.closest('button[data-act]');
        if (!btn) return;
        const { act, id } = btn.dataset;
        const l = store.leaves.find(x => String(x.id) === String(id));
        if (!l) return;

        if (act === 'toggleLeaveMenu') {
            toggleLeaveMenu(btn);
            return;
        }

        closeLeaveMenus();

        if ((act === 'approve' || act === 'reject' || act === 'deleteLeave') && !canManageRecords()) return;

        if (act === 'approve') {
            const ok = await confirmDialog({ title: 'Approve Leave', message: `Approve this ${l.type} for ${calcDays(l.from, l.to)} day(s)?`, confirmLabel: 'Approve' });
            if (!ok) return;
            const prevLeave = captureLeaveAmounts();
            l.status = 'Approved';
            applyLeavePayrollRule(prevLeave);
            saveStore('leave:approved');
            toast('Leave approved. Payroll deduction updated.');
            renderLeaveRows();
            renderPayrollRows();
            if ($('#dedTbody')) renderDeductionRows();
        }
        if (act === 'reject') {
            const ok = await confirmDialog({ title: 'Reject Leave', message: 'Reject this leave request?', confirmLabel: 'Reject', danger: true });
            if (!ok) return;
            const prevLeave = captureLeaveAmounts();
            l.status = 'Rejected';
            applyLeavePayrollRule(prevLeave);
            saveStore('leave:rejected');
            toast('Leave rejected.', 'info');
            renderLeaveRows();
            renderPayrollRows();
            if ($('#dedTbody')) renderDeductionRows();
        }
        if (act === 'deleteLeave') {
            const ok = await confirmDialog({ title: 'Delete Leave Record', message: `Delete ${recordEmployeeName(l)}'s ${leaveTypeLabel(l.type)} request? This cannot be undone.`, confirmLabel: 'Delete', danger: true });
            if (!ok) return;
            const prevLeave = captureLeaveAmounts();
            store.leaves = store.leaves.filter(x => String(x.id) !== String(l.id));
            applyLeavePayrollRule(prevLeave);
            saveStore('leave:deleted');
            toast('Leave record deleted.', 'info');
            renderLeaveRows();
            renderPayrollRows();
            if ($('#dedTbody')) renderDeductionRows();
        }
        if (act === 'viewLeave') viewLeave(l);
    }

    function openPayslip(p) {
        const emp = empById(p.empId);
        const empName = emp ? emp.name : p.empId;
        const hired = emp?.joined ? String(emp.joined) : '—';
        const cycle = p.payroll_period || p.cycle || '—';
        const gross = p.gross_salary !== undefined ? Number(p.gross_salary) : (Number(p.gross) || 0);
        const totalDeductions = Number(p.deductions ?? 0);
        const net = Number(p.net_salary || (gross - totalDeductions));
        
        const leaveDeduction = emp ? Math.round(calculateApprovedLeaveDaysForEmployee(p.empId, cycle) * (emp.salary / WORKING_DAYS_PER_MONTH)) : 0;
        const baseDeductions = Math.max(0, totalDeductions - leaveDeduction);
        const overtime = p.overtime !== undefined ? Number(p.overtime) : 0;
        const absences = p.absences !== undefined ? Number(p.absences) : 0;

        openModal({
            title: ' ',
            onCancel: closeModal,
            onExtraClick: (e) => {
                const btn = e.target.closest('[data-act]');
                if (!btn) return false;
                if (btn.dataset.act === 'print-payslip') { window.print(); return true; }
                return false;
            },
            body: `
                <div class="view-modal-split">
                    <div class="view-modal-left">
                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:32px;">
                            <img src="assets/logo.png" style="height:44px;width:auto;object-fit:contain;flex-shrink:0;" alt="DEVS logo">
                            <img src="assets/icon-devs.png" style="width:130px;height:auto;object-fit:contain;" alt="DEVS">
                        </div>
                        <h3 style="margin:0 0 8px;font-size:17px;font-weight:700;text-transform:uppercase;letter-spacing:0.03em;">PAYSLIP</h3>
                        <p style="margin:0;font-size:13px;line-height:1.5;color:rgba(255,255,255,0.82);">
                            Payroll breakdown for the period ${escapeHtml(p.cycle || '—')}.
                        </p>
                        <div style="margin-top:auto;padding-bottom:16px;display:flex;justify-content:center;align-items:flex-end;">
                            <svg viewBox="0 0 120 120" width="120" height="120" style="opacity:0.22;" fill="none" stroke="white" stroke-width="4" aria-hidden="true">
                                <rect x="20" y="14" width="80" height="96" rx="8"/>
                                <path d="M34 40h52M34 58h52M34 76h30" stroke-linecap="round"/>
                                <circle cx="90" cy="92" r="16" fill="none" stroke="white" stroke-width="4"/>
                                <path d="M84 92h12M90 86v12" stroke-linecap="round"/>
                            </svg>
                        </div>
                    </div>
                    <div class="view-modal-right">
                        <div class="view-emp-head">
                            <div class="view-emp-avatar">${initials(empName)}</div>
                            <div>
                                <h2>${escapeHtml(p.id)}</h2>
                                <p class="view-subtitle" style="margin:0 !important;">${escapeHtml(empName)} · ${escapeHtml(emp?.position || 'Staff')}</p>
                            </div>
                        </div>

                        <div class="view-data-list">
                            <div class="view-modal-row"><span>Employee ID:</span> <strong>${escapeHtml(p.empId)}</strong></div>
                            <div class="view-modal-row"><span>Date Hired:</span> <strong>${escapeHtml(hired)}</strong></div>
                            <div class="view-modal-row"><span>Payroll Period:</span> <strong>${escapeHtml(p.cycle || '—')}</strong></div>
                            <div class="view-modal-row"><span>Gross Pay:</span> <strong>${peso(p.gross)}</strong></div>
                            <div class="view-modal-row"><span>Overtime:</span> <strong style="color:#1aa846;">+${peso(overtime)}</strong></div>
                            <div class="view-modal-row"><span>Absences:</span> <strong>${absences} Day${absences === 1 ? '' : 's'}</strong></div>
                            <div class="view-modal-row"><span>Base Deductions:</span> <strong style="color:#c2181a;">− ${peso(baseDeductions)}</strong></div>
                            <div class="view-modal-row"><span>Leave Deduction:</span> <strong style="color:#c2181a;">− ${peso(leaveDeduction)}</strong></div>
                            <div class="view-modal-row"><span>Total Deductions:</span> <strong style="color:#c2181a;">− ${peso(totalDeductions)}</strong></div>
                            <div class="view-modal-row" style="border-top:1px solid #f0e0e0;padding-top:10px;margin-top:6px;">
                                <span>Net Pay:</span> <strong style="color:#c2181a;font-size:15px;">${peso(net)}</strong>
                            </div>
                            <div class="view-modal-row"><span>Status:</span>
                                <strong class="status-text ${statusClassForPayroll(p.status)}">${escapeHtml(p.status)}</strong>
                            </div>
                        </div>

                        <div style="text-align:right;margin-top:28px;display:flex;justify-content:flex-end;gap:10px;">
                            <button class="acc-btn-cancel" type="button" data-act="print-payslip">Print</button>
                            <button class="acc-btn-cancel" type="button" data-act="cancel">Close</button>
                        </div>
                    </div>
                </div>
            `
        });

        const modalEl = document.getElementById('modal');
        if (modalEl) modalEl.className = 'modal modal-split receivable-view-modal';
    }
    async function handlePayrollAction(e) {
        const btn = e.target.closest('button[data-act]');
        if (!btn) return;
        const { act, id } = btn.dataset;

        if (act === 'viewPayslip') {
            const p = store.payroll.find(x => String(x.id) === String(id));
            if (p) openPayslip(p);
        }
    }

    function openCreatePayrollForm() {
        const today = todayDateString();
        const defaultPeriod = currentPayrollCycle();

        openModal({
            title: ' ',
            onCancel: closeModal,
            onSubmit: async (form) => {
                const data = Object.fromEntries(new FormData(form).entries());
                let valid = true;
                const mark = (name, err) => {
                    const f = form.querySelector(`[name="${name}"]`)?.closest('.split-field');
                    if (f) f.classList.toggle('has-error', err);
                    if (err) valid = false;
                };
                mark('employeeId', !String(data.employeeId || '').trim());
                mark('period', !String(data.period || '').trim());
                if (!valid) return;

                const empIdNum = Number(data.employeeId);
                const emp = empById(empIdNum);
                if (!emp) { toast('Selected employee was not found.', 'error'); return; }

                const basic_salary = Number(emp.salary || 0);
                // Overtime formula (26-day month, 8h/day):
                //   Hourly Rate = Monthly Salary / (26 x 8)
                //   OT Pay = Hourly Rate x OT Hours x OT Multiplier (default 1.25)
                const otHours = Math.max(0, Number(data.otHours) || 0);
                const otMultiplier = Math.max(1, Number(data.otMultiplier) || 1.25);
                const hourlyRate = basic_salary / (26 * 8); // 208 hours
                const overtime = otHours > 0 ? Math.round(hourlyRate * otHours * otMultiplier * 100) / 100 : 0;
                const deductions = Number(data.deductions || 0);
                const absences = 0;

                const gross_salary = basic_salary + overtime - (absences * (basic_salary / 22));
                const net_salary = gross_salary - deductions;

                store.payroll.unshift({
                    id: '', // Backend will assign PAY-0001
                    empId: empIdNum,
                    payroll_period: String(data.period),
                    basic_salary: basic_salary,
                    overtime: overtime,
                    absences: absences,
                    deductions: deductions,
                    gross_salary: gross_salary,
                    net_salary: net_salary,
                    status: 'Pending'
                });

                await saveStore('payroll:created');
                closeModal();
                toast('Payroll record created.');
                
                // Fetch the newly generated PAY-XXXX ID from the database
                await syncStateFromServer();
                renderPayrollRows();
            },
            body: `
                <div class="voucher-split">
                    <div class="voucher-left">
                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:32px;">
                            <img src="assets/logo.png" style="height:44px;width:auto;object-fit:contain;flex-shrink:0;" alt="DEVS logo">
                            <img src="assets/icon-devs.png" style="width:150px;height:auto;object-fit:contain;" alt="DEVS">
                        </div>
                        <h3 style="margin-bottom:8px;font-size:18px;font-weight:700;">CREATE PAYROLL</h3>
                        <p style="margin:0;font-size:13px;line-height:1.5;color:rgba(255,255,255,0.85);">
                            Fill in the necessary details to record a new payroll.
                        </p>
                        <div style="margin-top:auto;padding-bottom:20px;display:flex;justify-content:center;align-items:flex-end;">
                            <svg viewBox="0 0 120 120" width="120" height="120" style="opacity:0.3;" fill="none" stroke="white" stroke-width="4" aria-hidden="true">
                                <rect x="18" y="20" width="84" height="84" rx="8"/>
                                <path d="M32 42h40M32 58h56M32 74h32" stroke-linecap="round"/>
                                <path d="M78 94c6-4 12-4 18 0" stroke-linecap="round"/>
                                <circle cx="90" cy="88" r="14" fill="none" stroke="white" stroke-width="3"/>
                                <path d="M84 88l4 4 8-8" stroke-linecap="round" stroke-linejoin="round" stroke-width="3"/>
                            </svg>
                        </div>
                    </div>
                    <div class="voucher-right modal-split-right">
                        <form id="createPayrollForm" novalidate>
                            <section class="split-section">
                                <div class="split-section-header">
                                    <span class="split-section-icon">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12H3M3 12l4-4M3 12l4 4M21 5H9M21 19H9"/></svg>
                                    </span>
                                    <h3>Create Payroll</h3>
                                </div>
                                <div class="split-grid">
                                    <div class="split-field">
                                        <label for="cp-id">Payroll ID</label>
                                        <input type="text" id="cp-id" name="payrollId" value="PAY-${String(store.payroll.length + 1).padStart(3, '0')}" readonly />
                                    </div>
                                    <div class="split-field">
                                        <label for="cp-emp">Employee <b class="req">*</b></label>
                                        <select id="cp-emp" name="employeeId" required>
                                            <option value="">Select employee…</option>
                                            ${store.employees.map(e => {
                                                const n = Number(e.id);
                                                return Number.isFinite(n) && n > 0
                                                    ? `<option value="${n}">${escapeHtml(e.name)} · ${escapeHtml(e.position || 'Staff')}</option>`
                                                    : '';
                                            }).join('')}
                                        </select>
                                        <span class="error-text">Please select an employee.</span>
                                    </div>
                                    <div class="split-field full">
                                        <label for="cp-period">Payroll Period <b class="req">*</b></label>
                                        <input type="text" id="cp-period" name="period" value="${escapeHtml(defaultPeriod)}" placeholder="e.g. Sep 1, 2026 – Sep 15, 2026" required />
                                        <span class="error-text">Enter the payroll period.</span>
                                    </div>
                                    <div class="split-field">
                                        <label for="cp-deductions">Deductions (₱)</label>
                                        <input type="number" id="cp-deductions" name="deductions" min="0" step="10" value="0" />
                                    </div>
                                    <div class="split-field">
                                        <label for="cp-ot-hours">Overtime Hours</label>
                                        <input type="number" id="cp-ot-hours" name="otHours" min="0" step="0.5" value="0" />
                                        <span class="error-text"></span>
                                    </div>
                                    <div class="split-field">
                                        <label for="cp-ot-mult">OT Multiplier</label>
                                        <input type="number" id="cp-ot-mult" name="otMultiplier" min="1" step="0.05" value="1.25" />
                                        <span class="error-text">Multiplier must be at least 1.25 on rest days/holidays.</span>
                                    </div>
                                    <div class="split-field" style="justify-content:center;">
                                        <label style="font-size:12px;color:#8a6a6a;padding:0 4px;">Hourly Rate = Salary ÷ 208 &middot; OT Pay = Rate × Hours × Multiplier</label>
                                    </div>
                                </div>
                            </section>
                            <div class="split-actions">
                                <button type="button" class="btn-cancel-pill" data-act="cancel">Cancel</button>
                                <button type="submit" class="btn-save-pill">Create Payroll</button>
                            </div>
                        </form>
                    </div>
                </div>
            `
        });

        const modalEl = document.getElementById('modal');
        if (modalEl) modalEl.classList.add('modal-split', 'voucher-modal');
    }

    function openDeductionView(group) {
        const items = group.items || [];
        const emp = empById(group.empId);
        const empName = emp ? emp.name : String(group.empId);
        const empNo = emp?.empNo || String(emp?.id || group.empId).padStart(5, '0');
        const dept = emp?.dept || '—';
        const cycle = group.period || '';
        const statusClass = group.status === 'Applied' ? 'is-paid' : (group.status === 'Pending' ? 'is-fulfilling' : 'is-pending');

        const breakdown = items.map(d => `
            <div class="ded-breakdown-item">
                <div class="ded-breakdown-head">
                    <span class="ded-breakdown-type">${escapeHtml(d.type)}</span>
                    <strong class="ded-breakdown-amount">${peso(d.amount)}</strong>
                </div>
                <p class="ded-breakdown-reason">${escapeHtml(deductionReason(d, emp))}</p>
            </div>
        `).join('');

        openModal({
            title: ' ',
            onCancel: closeModal,
            body: `
                <div class="view-modal-split">
                    <div class="view-modal-left">
                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:32px;">
                            <img src="assets/logo.png" style="height:44px;width:auto;object-fit:contain;flex-shrink:0;" alt="DEVS logo">
                            <img src="assets/icon-devs.png" style="width:130px;height:auto;object-fit:contain;" alt="DEVS">
                        </div>
                        <h3 style="margin:0 0 8px;font-size:17px;font-weight:700;text-transform:uppercase;letter-spacing:0.03em;">DEDUCTION DETAILS</h3>
                        <p style="margin:0;font-size:13px;line-height:1.5;color:rgba(255,255,255,0.82);">Why this employee was deducted and how the total was built up.</p>
                        <div style="margin-top:auto;padding-bottom:16px;display:flex;justify-content:center;align-items:flex-end;">
                            <svg viewBox="0 0 120 120" width="120" height="120" style="opacity:0.22;" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <rect x="24" y="16" width="72" height="88" rx="8"/>
                                <path d="M40 40h40M40 58h40M40 76h24"/>
                            </svg>
                        </div>
                    </div>
                    <div class="view-modal-right">
                        <div class="view-emp-head">
                            <div class="view-emp-avatar">${initials(empName)}</div>
                            <div>
                                <h2>${escapeHtml(empName)}</h2>
                                <p class="view-subtitle" style="margin:0 !important;">${escapeHtml(empNo)} · ${escapeHtml(dept)}</p>
                            </div>
                        </div>
                        <div class="view-data-list">
                            <div class="view-modal-row"><span>Employee ID:</span> <strong>${escapeHtml(empNo)}</strong></div>
                            <div class="view-modal-row"><span>Department:</span> <strong>${escapeHtml(dept)}</strong></div>
                            <div class="view-modal-row"><span>Payroll Period:</span> <strong>${escapeHtml(cycle || '—')}</strong></div>
                            <div class="view-modal-row"><span>Deductions:</span> <strong>${items.length} item(s)</strong></div>
                            <div class="view-modal-row"><span>Status:</span> <strong class="status-text ${statusClass}">${escapeHtml(group.status)}</strong></div>
                        </div>

                        <div class="ded-breakdown">
                            <div class="ded-breakdown-title">What this deduction is for</div>
                            ${breakdown}
                            <div class="ded-breakdown-total">
                                <span>Total Deduction</span>
                                <strong>${peso(group.amount)}</strong>
                            </div>
                        </div>

                        <div style="text-align:right;margin-top:24px;display:flex;justify-content:flex-end;gap:10px;">
                            <button class="acc-btn-cancel" type="button" data-act="cancel">Close</button>
                        </div>
                    </div>
                </div>
            `
        });
        const modalEl = document.getElementById('modal');
        if (modalEl) modalEl.className = 'modal modal-split receivable-view-modal ded-view-modal';
    }

    function openDeductionForm(ded = null) {
        const isEdit = !!ded;
        const d = ded || { empId: '', type: 'SSS', period: currentPayrollCycle(), amount: '', status: 'Pending' };
        const types = ['SSS', 'PhilHealth', 'Pag-IBIG', 'Cash Advance', 'SSS Loan', 'Pag-IBIG Loan', 'Other'];
        openModal({
            title: isEdit ? `Edit Deduction | ${ded.id}` : 'Add Deduction',
            onCancel: closeModal,
            onSubmit: (form) => {
                const data = Object.fromEntries(new FormData(form).entries());
                let valid = true;
                const mark = (name, err) => {
                    const f = form.querySelector(`[name="${name}"]`)?.closest('.form-field');
                    if (f) f.classList.toggle('has-error', err);
                    if (err) valid = false;
                };
                mark('empId', !data.empId);
                mark('amount', !data.amount || Number(data.amount) <= 0);
                if (!valid) return;
                const empIdNum = Number(data.empId);
                if (!Number.isFinite(empIdNum) || empIdNum <= 0) {
                    toast('Please select a valid employee.', 'error');
                    return;
                }
                if (isEdit) {
                    Object.assign(ded, { empId: empIdNum, type: data.type, period: data.period, amount: Number(data.amount), status: data.status });
                    toast('Deduction updated.');
                } else {
                    store.deductions.push({ id: nextId('DED', store.deductions), empId: empIdNum, type: data.type, period: data.period, amount: Number(data.amount), status: data.status });
                    toast('Deduction added.');
                }
                applyLeavePayrollRule();
                saveStore(isEdit ? 'deduction:updated' : 'deduction:added');
                closeModal();
                renderDeductionRows();
            },
            body: `
                <form id="dedForm" novalidate>
                    <div class="form-grid">
                        <div class="form-field full"><label for="d-emp">Employee</label><select id="d-emp" name="empId" required><option value="">Select employee…</option>${store.employees.map(e => { const n = Number(e.id); return Number.isFinite(n) && n > 0 ? `<option value="${n}" ${String(n) === String(d.empId) ? 'selected' : ''}>${escapeHtml(e.name)} | ${n}</option>` : ''; }).join('')}</select><span class="error-text">Please select an employee.</span></div>
                        <div class="form-field"><label for="d-type">Type</label><select id="d-type" name="type">${types.map(t => `<option ${t === d.type ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
                        <div class="form-field"><label for="d-period">Period</label><input type="text" id="d-period" name="period" value="${escapeHtml(d.period)}" required /></div>
                        <div class="form-field"><label for="d-amount">Amount (₱)</label><input type="number" id="d-amount" name="amount" min="0" step="50" value="${d.amount}" required /><span class="error-text">Enter a valid amount.</span></div>
                        <div class="form-field"><label for="d-status">Status</label><select id="d-status" name="status"><option ${d.status === 'Pending' ? 'selected' : ''}>Pending</option><option ${d.status === 'Applied' ? 'selected' : ''}>Applied</option><option ${d.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option></select></div>
                    </div>
                    <div class="form-actions"><button type="button" class="btn btn-subtle" data-act="cancel">Cancel</button><button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Add Deduction'}</button></div>
                </form>
            `
        });
    }
    async function handleDeductionAction(e) {
        const btn = e.target.closest('button[data-act]');
        if (!btn) return;
        const { act, id } = btn.dataset;
        if (act === 'viewDed') {
            const group = visibleDeductionGroups().find(x => String(x.id) === String(id));
            if (group) openDeductionView(group);
            return;
        }
        const ded = store.deductions.find(x => String(x.id) === String(id));
        if (!ded) return;
        if (act === 'editDed') openDeductionForm(ded);
        if (act === 'deleteDed') {
            const ok = await confirmDialog({ title: 'Delete Deduction', message: `Remove this ${ded.type} deduction of ${peso(ded.amount)}?`, confirmLabel: 'Delete', danger: true });
            if (!ok) return;
            store.deductions = store.deductions.filter(x => x.id !== id);
            saveStore('deduction:deleted');
            toast('Deduction removed.', 'info');
            renderDeductionRows();
        }
    }

    // ============ NAV ============
    const handleNavClick = throttle(function (e) {
        e.preventDefault();
        const item = e.currentTarget || e.target?.closest('.nav-item');
        if (!item) return;
        if (item.dataset.busy === 'true') return;
        item.dataset.busy = 'true';
        setTimeout(() => { item.dataset.busy = 'false'; }, 220);
        $$('.nav-item').forEach(link => link.classList.remove('active'));
        const page = item.dataset.page || 'dashboard';
        if (page === 'pageAccess' && !isHrAdmin()) {
            confirmDialog({ title: 'Access Restricted', message: 'This page is only available to HR Administrators.', confirmLabel: 'OK', danger: true });
            const dashLink = document.querySelector('.nav-item[data-page="dashboard"]');
            if (dashLink) dashLink.classList.add('active');
            renderPage('dashboard');
            return;
        }
        if (page !== 'logout' && !canAccessPage(page)) {
            confirmDialog({ title: 'Access Denied', message: 'Your account does not have permission to access this page. Please contact your HR Administrator.', confirmLabel: 'OK', danger: true });
            const dashLink = document.querySelector('.nav-item[data-page="dashboard"]');
            if (dashLink && canAccessPage('dashboard')) dashLink.classList.add('active');
            return;
        }
        if (page === 'logout') {
            const dashLink = document.querySelector('.nav-item[data-page="dashboard"]');
            if (dashLink) dashLink.classList.add('active');
            localStorage.setItem('devs_last_page', 'dashboard');
            confirmDialog({ title: 'Sign out of D.E.V.S?', message: 'You will be returned to the login screen.', confirmLabel: 'Logout', danger: true }).then((confirmed) => {
                if (confirmed) { setLoggedOut(); toast('You have been signed out.', 'info'); }
            });
            return;
        }
        item.classList.add('active');
        localStorage.setItem('devs_last_page', page);
        renderPage(page);
    }, 200);

    $$('.nav-item').forEach(item => item.addEventListener('click', handleNavClick));

    if (userAvatar) {
        userAvatar.addEventListener('click', throttle(() => {
            $$('.nav-item').forEach(link => link.classList.remove('active'));
            const settingsLink = document.querySelector('.nav-item[data-page="settings"]');
            if (settingsLink) settingsLink.classList.add('active');
            localStorage.setItem('devs_last_page', 'settings');
            renderPage('settings');
        }, 200));
    }

    const brandHome = $('#brandHome');
    if (brandHome) {
        brandHome.addEventListener('click', throttle((e) => {
            e.preventDefault();
            $$('.nav-item').forEach(link => link.classList.remove('active'));
            const dashLink = document.querySelector('.nav-item[data-page="dashboard"]');
            if (dashLink) dashLink.classList.add('active');
            localStorage.setItem('devs_last_page', 'dashboard');
            renderPage('dashboard');
        }, 200));
    }

    const currentDateEl = $('#currentDate');
    if (currentDateEl) currentDateEl.textContent = new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });

    // ============================================================
    // NOTIFICATION SYSTEM (HR) — mirrors Finance's bell feed
    // ============================================================
    const bell = document.getElementById('topbarBell');
    const popover = document.getElementById('notifPopover');
    let notifications = [];
    let notifPageItems = [];

    function buildNotificationsPage() {
        return `
            <section class="exd-card exd-records">
                <div class="exd-records-head">
                    <h3 class="exd-title">Notifications</h3>
                    <span class="notifpg-count" id="notifPgCount"></span>
                    <button type="button" class="btn btn-subtle" id="notifPgMarkAll">Mark all as read</button>
                </div>
                <p class="notifpg-hint" style="margin:0;">Changes made by you and the HR team. Click a notification to open where it happened.</p>
                <div class="notifpg-list" id="notifPgList">
                    <div class="empty-state"><p>Loading notifications…</p></div>
                </div>
            </section>
        `;
    }

    async function loadRealNotifications() {
        try {
            const result = await apiRequest('notifications');
            notifications = result.notifications || [];
            updateNotifCounts();
            renderNotifications(document.querySelector('.notif-tabs button.active')?.dataset.tab || 'all');
        } catch (err) {
            console.warn('Could not load notifications:', err);
        }
    }

    function renderNotifications(filter = 'all') {
        const body = document.getElementById('notifBody');
        if (!body) return;
        const filtered = notifications.filter(n => {
            if (filter === 'unread') return n.unread;
            if (filter === 'alerts') return n.type === 'alert';
            return true;
        });
        if (!filtered.length) {
            body.innerHTML = `<div style="padding:40px;text-align:center;color:#888;">No notifications here.</div>`;
            return;
        }
        body.innerHTML = filtered.map(n => `
            <div class="notif-item ${n.unread ? 'unread' : ''}" data-notif-id="${n.id}" role="button" title="Go to ${escapeHtml(n.page || 'dashboard')}">
                <div class="notif-icon ${n.color}">${n.icon}</div>
                <div class="notif-content">
                    <div class="notif-content-top">
                        <h4>${escapeHtml(n.title)}</h4>
                        ${n.unread ? '<div class="notif-unread-dot"></div>' : ''}
                    </div>
                    <p>${escapeHtml(n.desc)}</p>
                    <small>${escapeHtml(n.time)}</small>
                </div>
            </div>
        `).join('');
    }

    function updateNotifCounts() {
        const allCount = notifications.length;
        const unreadCount = notifications.filter(n => n.unread).length;
        const alertsCount = notifications.filter(n => n.type === 'alert').length;
        const tAll = document.getElementById('tabAll');
        const tUnread = document.getElementById('tabUnread');
        const tAlerts = document.getElementById('tabAlerts');
        if (tAll) tAll.textContent = `All (${allCount})`;
        if (tUnread) tUnread.textContent = `Unread (${unreadCount})`;
        if (tAlerts) tAlerts.textContent = `Alerts (${alertsCount})`;
        const dot = document.getElementById('notifDot');
        if (dot) dot.style.display = unreadCount > 0 ? 'block' : 'none';
    }

    window.markNotifRead = async function (id) {
        const notif = notifications.find(n => n.id === id) || notifPageItems.find(n => n.id === id);
        if (!notif || !notif.unread) return;
        notif.unread = false;
        updateNotifCounts();
        renderNotifications(document.querySelector('.notif-tabs button.active')?.dataset.tab || 'all');
        renderNotificationsPage();
        try {
            await apiRequest('notifications.markRead', {
                method: 'POST',
                body: JSON.stringify({ ids: [notif.logId] })
            });
        } catch (err) {
            console.warn('Could not persist read state:', err);
        }
    };

    async function markAllNotificationsRead() {
        notifications.forEach(n => n.unread = false);
        notifPageItems.forEach(n => n.unread = false);
        updateNotifCounts();
        renderNotifications(document.querySelector('.notif-tabs button.active')?.dataset.tab || 'all');
        renderNotificationsPage();
        try {
            await apiRequest('notifications.markRead', {
                method: 'POST',
                body: JSON.stringify({ ids: [] })
            });
        } catch (err) {
            console.warn('Could not persist read state:', err);
        }
    }

    // Navigate the same way a sidebar click does. The Notifications page is
    // deliberately not restored as the user's last page on the next login.
    window.gotoHrPage = function (page) {
        const target = canAccessPage(page) ? page : 'dashboard';
        $$('.nav-item').forEach(link => link.classList.remove('active'));
        const navItem = document.querySelector(`.nav-item[data-page="${target}"]`);
        if (navItem) navItem.classList.add('active');
        localStorage.setItem('devs_last_page', target === 'notifications' ? 'dashboard' : target);
        renderPage(target);
        popover?.classList.remove('open');
    };

    window.openHrNotif = function (id) {
        const notif = notifications.find(n => n.id === id) || notifPageItems.find(n => n.id === id);
        if (!notif) return;
        if (notif.unread) void window.markNotifRead(id);
        window.gotoHrPage(notif.page || 'dashboard');
    };

    async function loadNotificationsPage() {
        const list = $('#notifPgList');
        if (!list) return;
        try {
            const result = await fetch(`${API_URL}?action=notifications&limit=100`, { credentials: 'same-origin' })
                .then(r => r.json());
            if (result.ok === false) throw new Error(result.message || 'Could not load notifications.');
            notifPageItems = result.notifications || [];
        } catch (err) {
            list.innerHTML = `<div class="empty-state"><p>${escapeHtml(err.message)}</p></div>`;
            return;
        }
        renderNotificationsPage();
        notifications = notifPageItems.slice(0, 20);
        updateNotifCounts();
    }

    function renderNotificationsPage() {
        const list = $('#notifPgList');
        if (!list) return;
        const unreadCount = notifPageItems.filter(n => n.unread).length;
        const count = $('#notifPgCount');
        if (count) count.textContent = `${notifPageItems.length} total · ${unreadCount} unread`;
        if (!notifPageItems.length) {
            list.innerHTML = `<div class="empty-state"><p>No notifications yet. Changes you and the team make will appear here.</p></div>`;
            return;
        }
        list.innerHTML = notifPageItems.map(n => `
            <div class="notif-item ${n.unread ? 'unread' : ''}" data-notif-id="${n.id}" role="button" title="Go to ${escapeHtml(n.page || 'dashboard')}">
                <div class="notif-icon ${n.color}">${n.icon}</div>
                <div class="notif-content">
                    <div class="notif-content-top">
                        <h4>${escapeHtml(n.title)}</h4>
                        ${n.unread ? '<div class="notif-unread-dot"></div>' : ''}
                    </div>
                    <p>${escapeHtml(n.desc)}</p>
                    <small>${escapeHtml(n.time)}</small>
                </div>
            </div>
        `).join('');
    }

    if (bell && popover) {
        document.getElementById('notifBody')?.addEventListener('click', (e) => {
            const item = e.target.closest('.notif-item[data-notif-id]');
            if (item) window.openHrNotif(item.dataset.notifId);
        });
        document.getElementById('notifViewAll')?.addEventListener('click', () => {
            window.gotoHrPage('notifications');
        });
        bell.addEventListener('click', (e) => {
            e.stopPropagation();
            popover.classList.toggle('open');
        });
        document.addEventListener('click', (e) => {
            if (popover.classList.contains('open') && !popover.contains(e.target) && !bell.contains(e.target)) {
                popover.classList.remove('open');
            }
        });
        document.getElementById('notifCloseBtn')?.addEventListener('click', () => popover.classList.remove('open'));
        document.getElementById('notifMarkRead')?.addEventListener('click', async () => {
            await markAllNotificationsRead();
            toast('All notifications marked as read.', 'success');
        });
        document.querySelectorAll('.notif-tabs button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.notif-tabs button').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                renderNotifications(e.currentTarget.dataset.tab);
            });
        });
    }

    window.loadRealNotifications = loadRealNotifications;
    window.checkForNewNotifications = () => void loadRealNotifications();

    // Refresh on login and every 30 seconds so the dot follows new changes.
    setInterval(() => {
        if (localStorage.getItem('devs_user')) void loadRealNotifications();
    }, 30000);

    async function restoreSession() {
        try {
            const result = await apiRequest('session');
            if (!result.user) { window.location.href = '../root/index.php'; return; }
            activeUser = result.user;
            await syncStateFromServer();
            await loadPageAccess();
            localStorage.setItem('devs_user', result.user.username);
            setLoggedIn(result.user.username, result.user);
            applySidebarRestrictions();
            let lastPage = localStorage.getItem('devs_last_page') || 'dashboard';
            if (!canAccessPage(lastPage) && lastPage !== 'logout') {
                lastPage = canAccessPage('dashboard') ? 'dashboard' : 'noAccess';
            }
            markNavActive(lastPage);
            renderPage(lastPage);
        } catch (err) {
            console.warn('restoreSession failed:', err);
            window.location.href = '../root/index.php';
        }
    }

    void restoreSession();
});