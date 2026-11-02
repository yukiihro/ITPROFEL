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
    }

    function setLoggedOut() {
        localStorage.removeItem('devs_user');
        localStorage.removeItem('devs_last_page');
        activeUser = null;
        void apiRequest('logout', { method: 'POST' }).catch(() => {});
        window.location.href = '../';
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
        employees: [], attendance: [], leaves: [], payroll: [], deductions: [],
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
            if (leave.empId !== empId || leave.status !== 'Approved') return total;
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

    function applyLeavePayrollRule() {
        store.payroll.forEach((pay) => {
            const emp = empById(pay.empId);
            if (!emp) return;
            const baseDeductions = Number(pay.baseDeductions ?? pay.deductions ?? 0);
            pay.baseDeductions = baseDeductions;
            const approvedLeaveDays = calculateApprovedLeaveDaysForEmployee(pay.empId, pay.cycle);
            const leaveDeduction = approvedLeaveDays * (emp.salary / WORKING_DAYS_PER_MONTH);
            pay.deductions = Math.round(baseDeductions + leaveDeduction);
        });
    }

    async function syncStateFromServer() {
        const result = await apiRequest('state');
        if (result.state && typeof result.state === 'object') {
            Object.assign(store, result.state);
            return;
        }
    }

    function saveStore() {
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
        const destructiveKeys = ['employees', 'attendance', 'leaves', 'payroll', 'payroll_deductions'];
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
        if (Object.keys(payload).length === 0) return;

        void apiRequest('state', {
            method: 'POST',
            body: JSON.stringify({ state: payload })
        }).catch((err) => {
            console.error('saveStore failed:', err);
            toast('Could not save to server: ' + err.message, 'error');
        });
    }

    const isHrAdmin = () => ['Administrator', 'HR Manager', 'HR Admin'].includes(activeUser?.role)
        || (String(activeUser?.department || '').toLowerCase() === 'hr'
            && /admin/i.test(String(activeUser?.position || '')));
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
        const items = document.querySelectorAll('.nav-item[data-page]');
        items.forEach(item => { item.style.display = ''; });
        const adminOnlyLinks = ['pageAccess', 'registrationApproval'];
        adminOnlyLinks.forEach(key => {
            const link = document.querySelector(`.nav-item[data-page="${key}"]`);
            if (link) link.style.display = isHrAdmin() ? '' : 'none';
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
            screen: 'Payroll', headers: ['Payroll ID', 'Employee ID', 'Employee', 'Period', 'Gross ₱', 'Deductions ₱', 'Total ₱', 'Status'],
            rows: store.payroll.map(p => [p.id, p.empId, employee(p.empId)?.name || p.empId, p.cycle, p.gross, p.deductions, p.gross - p.deductions, p.status])
        };
        if (entity === 'contribution') return {
            screen: 'Contribution', headers: ['Employee ID', 'Employee', 'SSS ₱', 'PhilHealth ₱', 'Pag-IBIG ₱', 'Total ₱'],
            rows: store.employees.map(e => {
                const amounts = ['SSS', 'PhilHealth', 'Pag-IBIG'].map(type => store.deductions.filter(d => d.empId === e.id && d.type === type).reduce((sum, d) => sum + Number(d.amount || 0), 0));
                return [e.id, e.name, ...amounts, amounts.reduce((sum, amount) => sum + amount, 0)];
            })
        };
        if (entity === '13thmonth') return {
            screen: '13thMonth', headers: ['Employee ID', 'Employee', 'Annual Basic ₱', '13th Month ₱', 'Status'],
            rows: store.employees.map(e => [e.id, e.name, Number(e.salary || 0) * 12, Number(e.salary || 0), e.status])
        };
        if (entity === 'deductions') return {
            screen: 'Deductions', headers: ['ID', 'Employee', 'Type', 'Period', 'Amount ₱', 'Status'],
            rows: store.deductions.map(d => [d.id, empById(d.empId)?.name || d.empId, d.type, d.period, d.amount, d.status])
        };
        return null;
    }
    function downloadExport(entity, button) {
        if (!lockElement(button, 600)) return;
        const data = exportData(entity);
        if (!data) return;
        const blob = new Blob([csvRows(data.headers, data.rows)], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = `HR_${data.screen}_${todayDateString()}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast('CSV export downloaded.');
    }
    function attachExportHandlers() {
        document.querySelectorAll('[data-export]').forEach(button => {
            button.addEventListener('click', () => downloadExport(button.dataset.export, button));
        });
    }

    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

    function buildSearchableSelect(select) {
        if (select.dataset.ssUpgraded === 'true') return;
        if (select.dataset.noSearch === 'true') return;
        if (select.closest('.toolbar, .fin-filters-card, .expense-records-card')) return;
        if (!select.closest('.modal-body, .modal-split-right')) return;
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

    const hrPages = {
        employees:  { title: 'Employees Master',   subtitle: 'Manage employee records and workforce status.', build: buildEmployees },
        attendance: { title: 'Attendance',         subtitle: 'Track daily time-in and time-out entries.', build: buildAttendance },
        leave:      { title: 'Leave Requests',     subtitle: 'Review and manage employee leave requests.', build: buildLeave },
        payroll:    { title: 'Payroll',            subtitle: 'Monitor compensation and payroll records.', build: buildPayroll },
        payrollHistory: { title: 'Payroll History', subtitle: 'Search and review previous payroll records.', build: buildPayrollHistory },
        accountManagement: { title: 'Account Management', subtitle: 'Manage all user accounts across departments.', build: buildAccountManagement },
        contribution:{ title: 'Contribution',      subtitle: 'SSS, PhilHealth, and Pag-IBIG contributions.', build: buildContribution },
        '13thmonth':{ title: '13th Month Pay',     subtitle: 'Year-end bonus records.', build: build13thMonth },
        settings:   { title: 'Settings',           subtitle: 'Configure your HRIS preferences.', build: buildSettings },
        auditTrail: { title: 'Audit Trail',        subtitle: 'Review system activity and user actions.', build: buildAuditTrail },
        account:    { title: 'Account Settings',   subtitle: 'Manage your profile and security.', build: buildAccount },
        logout:     { title: 'Logout',             subtitle: 'Sign out of your account.', build: buildLogout },
        deductions: { title: 'Deductions', subtitle: 'Manage employee salary deductions and contributions.', build: buildDeductions },
        pageAccess: { title: 'User Permission', subtitle: 'Control which pages each user can see.', build: buildPageAccessManager },
        registrationApproval: { title: 'Registration Approval', subtitle: 'Approve or reject new user registrations.', build: buildRegistrationApprovalPage },
        noAccess:   { title: 'No Access', subtitle: 'Your account has no pages assigned.', build: buildNoAccessScreen }
    };

    const pages = {
        dashboard: { title: 'HR Dashboard', subtitle: 'HR activity snapshot for today.', build: buildDashboard },
        ...hrPages
    };

    let isRendering = false;
    let pendingPage = null;

    function renderPage(page) {
        if ((page === 'pageAccess' || page === 'registrationApproval') && !isHrAdmin()) {
            confirmDialog({ title: 'Access Restricted', message: 'This page is only available to HR Administrators.', confirmLabel: 'OK', danger: true });
            page = 'dashboard';
        }
        if (page !== 'logout' && page !== 'account' && !canAccessPage(page)) {
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

    function buildDashboard() {
        const totalEmp = store.employees.length;
        const presentToday = store.attendance.filter(a => a.status === 'Present').length;
        const absentToday = Math.max(0, totalEmp - store.attendance.filter(a => a.timeIn).length);
        const lateToday = store.attendance.filter(a => a.status === 'Late').length;
        const pendingLeaves = store.leaves.filter(l => l.status === 'Pending');
        const leaveRows = (pendingLeaves.length ? pendingLeaves : store.leaves).slice(0, 6).map(l => {
            const name = recordEmployeeName(l);
            return `<tr><td><span class="mini-avatar">${initials(name)}</span>${escapeHtml(name)}</td><td>${escapeHtml(l.type.replace(' Leave', ''))}</td><td>${canManageRecords() ? `<button class="btn btn-outline btn-xs" type="button" data-act="viewLeave" data-id="${l.id}">View</button>` : '<span class="cell-sub">Read only</span>'}</td></tr>`;
        }).join('');
        const payrollTotal = store.payroll.reduce((sum, p) => sum + (Number(p.gross) - Number(p.deductions)), 0);
        const stats = [
            ['Total Employees', totalEmp],
            ['Present Today', presentToday],
            ['Absent', absentToday],
            ['Late', lateToday]
        ];
        return `
            <div class="dashboard-grid dashboard-stat-grid">${stats.map((stat, index) => `<div class="stat-card dashboard-stat-card stat-card-${index + 1}"><span class="label">${stat[0]}</span><div class="value">${stat[1]}</div></div>`).join('')}</div>
            <div class="dashboard-panels reference-dashboard-panels">
                <section class="card pending-leave-panel">
                    <div class="card-header"><h3><span class="panel-icon">✳</span>Pending Leave Requests</h3></div>
                    <div class="pending-leave-empty">${pendingLeaves.length ? `${pendingLeaves.length} request(s) awaiting review` : 'No pending requests'}</div>
                </section>
                <section class="card leave-preview-panel">
                    <div class="card-header"><h3><span class="panel-icon">✳</span>Pending Leave Requests</h3></div>
                    <table class="dashboard-preview-table">
                        <thead><tr><th>Employee</th><th>Reason</th><th>Action</th></tr></thead>
                        <tbody>${leaveRows || '<tr><td colspan="3">No leave records</td></tr>'}</tbody>
                    </table>
                </section>
                <section class="card payroll-preview-panel">
                    <div class="card-header"><h3>Current Payroll</h3></div>
                    <div class="payroll-preview-meta"><span>Period: ${escapeHtml(store.settings?.cycle || currentPayrollCycle())}</span><span>Status: In Progress</span><span>Release: Oct 01, 2026</span></div>
                    <div class="payroll-preview-summary"><div><span>Gross Pay</span><strong>${peso(store.payroll.reduce((sum, p) => sum + Number(p.gross || 0), 0))}</strong></div><div><span>Deductions</span><strong>${peso(store.payroll.reduce((sum, p) => sum + Number(p.deductions || 0), 0))}</strong></div><div class="net"><span>Net Pay</span><strong>${peso(payrollTotal)}</strong></div></div>
                </section>
            </div>
        `;
    }

    function buildEmployees() {
        return `
            <div class="section-title">
                <h2>Employees Master</h2>
                <span class="hint" id="empCount">${store.employees.length} records</span>
            </div>
            <div class="card">
                <div class="toolbar">
                    <div class="search-wrap"><input type="search" placeholder="Search by name, ID, role…" id="empSearch" /></div>
                    <select id="empDept">
                        <option value="">All Departments</option>
                        ${[...new Set(store.employees.map(e => e.dept))].map(d => `<option>${escapeHtml(d)}</option>`).join('')}
                    </select>
                    <select id="empPosition">
                        <option value="">All Positions</option>
                        <option>Admin</option>
                        <option>Staff</option>
                    </select>
                    <select id="empStatus">
                        <option value="">All Status</option>
                        <option>Active</option>
                        <option>On Leave</option>
                        <option>Terminated</option>
                    </select>
                    <div class="spacer"></div>
                    <button class="btn btn-ghost btn-sm" type="button" data-export="employees">Export CSV</button>
                </div>
                <div class="table-wrap">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Employee ID</th><th>Name</th><th>Department</th><th>Position</th>
                                <th>Basic ₱</th><th>Status</th><th style="text-align:right;">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="empTbody"></tbody>
                    </table>
                </div>
            </div>
        `;
    }

    function renderEmployeeRows() {
        const tbody = $('#empTbody');
        if (!tbody) return;
        const q = ($('#empSearch')?.value || '').trim().toLowerCase();
        const dept = $('#empDept')?.value || '';
        const position = $('#empPosition')?.value || '';
        const status = $('#empStatus')?.value || '';
        const rows = store.employees.filter(e => {
            const matchesQ = !q || `${e.name} ${e.id} ${e.position || 'Staff'} ${e.email || ''}`.toLowerCase().includes(q);
            const matchesD = !dept || e.dept === dept;
            const matchesP = !position || (e.position || 'Staff') === position;
            const matchesS = !status || e.status === status;
            return matchesQ && matchesD && matchesP && matchesS;
        });
        const countEl = $('#empCount');
        if (countEl) countEl.textContent = `${rows.length} of ${store.employees.length} records`;
        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">⌕</div><strong>No employees found</strong><p>Try adjusting your search or filters.</p></div></td></tr>`;
            return;
        }
        tbody.innerHTML = rows.map(e => `
            <tr data-id="${e.id}">
                <td><strong>${escapeHtml(e.id)}</strong></td>
                <td><div class="cell-name"><div class="cell-avatar">${initials(e.name)}</div><div>${escapeHtml(e.name)}<span class="cell-sub">${escapeHtml(e.email || '')}</span></div></div></td>
                <td>${escapeHtml(e.dept)}</td>
                <td>${escapeHtml(e.position || 'Staff')}</td>
                <td>${peso(e.salary)}</td>
                <td><span class="pill ${pillClass(e.status)}">${e.status}</span></td>
                <td>
                    <div class="cell-actions">
                        <button class="btn btn-ghost btn-xs" data-act="view" data-id="${e.id}">View</button>
                        ${canManageRecords() ? `<button class="btn btn-subtle btn-xs" data-act="edit" data-id="${e.id}">Edit</button><button class="btn btn-danger btn-xs" data-act="delete" data-id="${e.id}">Delete</button>` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function buildAttendance() {
        const defaultDate = localStorage.getItem(ATTENDANCE_FILTER_KEY) || todayDateString();
        return `
            <div class="section-title"><h2>Attendance</h2><span class="hint" id="attCount"></span></div>
            <div class="card">
                <div class="toolbar">
                    <div class="search-wrap"><input type="search" placeholder="Search employee…" id="attSearch" /></div>
                    <input class="picker-input" type="date" id="attDate" value="${defaultDate}" />
                    <select id="attStatus">
                        <option value="">All Status</option>
                        <option>Present</option>
                        <option>Late</option>
                        <option>On Leave</option>
                    </select>
                    <div class="spacer"></div>
                    <button class="btn btn-ghost btn-sm" type="button" id="refreshAttendanceBtn">Refresh</button>
                    <button class="btn btn-ghost btn-sm" type="button" data-export="attendance">Export CSV</button>
                    ${canManageRecords() ? '<button class="btn btn-primary btn-sm" type="button" id="addAttBtn">+ Log Attendance</button>' : '<button class="btn btn-primary btn-sm" type="button" id="clockInBtn">Clock In</button><button class="btn btn-ghost btn-sm" type="button" id="clockOutBtn">Clock Out</button>'}
                </div>
                <div class="table-wrap">
                    <table class="data-table">
                        <thead><tr><th>Employee</th><th>Date</th><th>Time In</th><th>Time Out</th><th>Hours</th><th>Overtime</th><th>Status</th><th style="text-align:right;">Actions</th></tr></thead>
                        <tbody id="attTbody"></tbody>
                    </table>
                </div>
            </div>
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

    function renderAttendanceRows() {
        const tbody = $('#attTbody');
        if (!tbody) return;
        const query = ($('#attSearch')?.value || '').trim().toLowerCase();
        const date = $('#attDate')?.value || '';
        const status = $('#attStatus')?.value || '';
        const rows = store.attendance.filter(a => {
            const employeeText = `${recordEmployeeName(a)} ${a.empId}`.toLowerCase();
            const matchQ = !query || employeeText.includes(query);
            const matchD = !date || a.date === date;
            const matchS = !status || a.status === status;
            return matchQ && matchD && matchS;
        });
        const countEl = $('#attCount');
        if (countEl) countEl.textContent = `${rows.length} record${rows.length !== 1 ? 's' : ''}`;
        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">◫</div><strong>No attendance records</strong><p>No records match the selected filters.</p></div></td></tr>`;
            return;
        }
        tbody.innerHTML = rows.map(a => {
            const name = recordEmployeeName(a);
            return `
                <tr data-id="${a.id}">
                    <td><div class="cell-name"><div class="cell-avatar">${initials(name)}</div><div>${escapeHtml(name)}<span class="cell-sub">${a.empId}</span></div></div></td>
                    <td>${canManageRecords() ? `<button class="time-cell-button" type="button" data-act="editAtt" data-id="${a.id}">${a.date}</button>` : escapeHtml(a.date)}</td>
                    <td>${canManageRecords() ? `<button class="time-cell-button" type="button" data-act="editAtt" data-id="${a.id}">${escapeHtml(displayValue(a.timeIn))}</button>` : escapeHtml(displayValue(a.timeIn))}</td>
                    <td>${canManageRecords() ? `<button class="time-cell-button" type="button" data-act="editAtt" data-id="${a.id}">${escapeHtml(displayValue(a.timeOut))}</button>` : escapeHtml(displayValue(a.timeOut))}</td>
                    <td><strong>${calcHours(a.timeIn, a.timeOut)}</strong></td>
                    <td>${calcOvertime(a.timeIn, a.timeOut)}</td>
                    <td><span class="pill ${pillClass(a.status)}">${a.status}</span></td>
                    <td><div class="cell-actions">${canManageRecords() ? `<button class="btn btn-subtle btn-xs" data-act="editAtt" data-id="${a.id}">Edit</button><button class="btn btn-danger btn-xs" data-act="deleteAtt" data-id="${a.id}">Delete</button>` : '<span class="cell-sub">Read only</span>'}</div></td>
                </tr>
            `;
        }).join('');
    }

    function buildLeave() {
        const staffRequest = !canManageRecords();
        return `
            <div class="section-title"><h2>Leave Requests</h2><span class="hint" id="leaveCount"></span></div>
            <div class="card">
                <div class="toolbar">
                    <div class="search-wrap"><input type="search" placeholder="Search by employee or reason…" id="leaveSearch" /></div>
                    <select id="leaveType"><option value="">All Types</option><option>Vacation Leave</option><option>Sick Leave</option><option>Emergency Leave</option></select>
                    <select id="leaveStatus"><option value="">All Status</option><option>Pending</option><option>Approved</option><option>Rejected</option></select>
                    <div class="spacer"></div>
                    <button class="btn btn-ghost btn-sm" type="button" data-export="leaves">Export CSV</button>
                    <button class="btn btn-primary btn-sm" type="button" id="addLeaveBtn">${staffRequest ? 'Request Leave' : '+ New Request'}</button>
                </div>
                <div class="table-wrap">
                    <table class="data-table">
                        <thead><tr><th>Employee</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Proof</th><th>Status</th><th style="text-align:right;">Actions</th></tr></thead>
                        <tbody id="leaveTbody"></tbody>
                    </table>
                </div>
            </div>
        `;
    }

    function renderLeaveRows() {
        const tbody = $('#leaveTbody');
        if (!tbody) return;
        const q = ($('#leaveSearch')?.value || '').trim().toLowerCase();
        const type = $('#leaveType')?.value || '';
        const status = $('#leaveStatus')?.value || '';
        const rows = store.leaves.filter(l => {
            const text = `${recordEmployeeName(l)} ${l.reason} ${l.type}`.toLowerCase();
            const matchQ = !q || text.includes(q);
            const matchT = !type || l.type === type;
            const matchS = !status || l.status === status;
            return matchQ && matchT && matchS;
        });
        const countEl = $('#leaveCount');
        const pending = store.leaves.filter(l => l.status === 'Pending').length;
        if (countEl) countEl.textContent = `${rows.length} shown, ${pending} pending`;
        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">✦</div><strong>No leave requests</strong><p>No requests match the current filters.</p></div></td></tr>`;
            return;
        }
        tbody.innerHTML = rows.map(l => {
            const emp = empById(l.empId);
            const name = recordEmployeeName(l);
            const days = calcDays(l.from, l.to);
            const isPending = l.status === 'Pending';
            return `
                <tr data-id="${l.id}">
                    <td><div class="cell-name"><div class="cell-avatar">${initials(name)}</div><div>${escapeHtml(name)}<span class="cell-sub">${l.id} | ${escapeHtml(emp ? (emp.position || 'Staff') : '')}</span></div></div></td>
                    <td>${escapeHtml(l.type)}</td>
                    <td>${l.from}</td>
                    <td>${l.to}</td>
                    <td><strong>${days}</strong></td>
                    <td>${l.proofData ? `<a class="proof-link" href="${escapeHtml(l.proofData)}" target="_blank" rel="noopener" download="${escapeHtml(l.proofName || 'leave-proof')}">Open proof</a>` : '<span class="cell-sub">Not attached</span>'}</td>
                    <td><span class="pill ${pillClass(l.status)}">${l.status}</span></td>
                    <td><div class="cell-actions">${isPending && canManageRecords() ? `<button class="btn btn-ghost btn-xs" data-act="approve" data-id="${l.id}">Approve</button><button class="btn btn-danger btn-xs" data-act="reject" data-id="${l.id}">Reject</button>` : ''}<button class="btn btn-subtle btn-xs" data-act="viewLeave" data-id="${l.id}">View</button></div></td>
                </tr>
            `;
        }).join('');
    }

    function buildPayroll() {
        const payrollCycles = [...new Set(store.payroll.map(item => item.cycle))];
        return `
            <div class="section-title"><h2>Payroll</h2><span class="hint" id="payrollSummary"></span></div>
            <div class="card payroll-panel" id="payrollPanel">
                <div class="toolbar">
                    <select id="payrollCycle">${payrollCycles.map(cycle => `<option>${escapeHtml(cycle)}</option>`).join('')}</select>
                    <select id="payrollStatus"><option value="">All Status</option><option>Processed</option><option>Pending</option><option>On Hold</option></select>
                    <div class="spacer"></div>
                    <button class="btn btn-ghost btn-sm" type="button" data-export="payroll">Export CSV</button>
                    <button class="btn btn-primary btn-sm" type="button" id="printPayrollBtn">Print Payroll</button>
                    <button class="btn btn-ghost btn-sm" type="button" id="payrollPreviewBtn">Preview Payslip</button>
                    ${canManageRecords() ? '<button class="btn btn-primary btn-sm" type="button" id="runPayrollBtn">Run Payroll</button>' : ''}
                </div>
                <div class="payroll-print-header" aria-hidden="true">
                    <strong>${escapeHtml(store.settings?.company || 'Company')}</strong>
                    <span>Payroll Report</span>
                    <span class="payroll-print-period" id="payrollPrintPeriod"></span>
                    <span>Generated ${todayDateString()}</span>
                </div>
                <div class="table-wrap">
                    <table class="data-table">
                        <thead><tr><th>Employee</th><th>Cycle</th><th>Gross</th><th>Deductions</th><th>Net Pay</th><th>Status</th><th style="text-align:right;">Actions</th></tr></thead>
                        <tbody id="payrollTbody"></tbody>
                    </table>
                </div>
            </div>
        `;
    }

    function renderPayrollRows() {
        const tbody = $('#payrollTbody');
        if (!tbody) return;
        const cycle = $('#payrollCycle')?.value || '';
        const status = $('#payrollStatus')?.value || '';
        const rows = store.payroll.filter(p => {
            const matchC = !cycle || p.cycle === cycle;
            const matchS = !status || p.status === status;
            return matchC && matchS;
        });
        const totalNet = rows.reduce((s, p) => s + (p.gross - p.deductions), 0);
        const sumEl = $('#payrollSummary');
        if (sumEl) sumEl.textContent = `${rows.length} record(s), Total net: ${peso(totalNet)}`;
        const printPeriod = $('#payrollPrintPeriod');
        if (printPeriod) printPeriod.textContent = `Period: ${cycle || 'All periods'}`;
        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">◌</div><strong>No payroll records</strong><p>Try a different cycle or status filter.</p></div></td></tr>`;
            return;
        }
        tbody.innerHTML = rows.map(p => {
            const emp = empById(p.empId);
            return `
                <tr data-id="${p.id}">
                    <td><div class="cell-name"><div class="cell-avatar">${initials(emp ? emp.name : p.empId)}</div><div>${escapeHtml(emp ? emp.name : p.empId)}<span class="cell-sub">${p.empId}</span></div></div></td>
                    <td>${escapeHtml(p.cycle)}</td>
                    <td>${peso(p.gross)}</td>
                    <td>${peso(p.deductions)}</td>
                    <td><strong>${peso(p.gross - p.deductions)}</strong></td>
                    <td><span class="pill ${pillClass(p.status)}">${p.status}</span></td>
                    <td><div class="cell-actions"><button class="btn btn-subtle btn-xs" data-act="viewPayslip" data-id="${p.id}">Payslip</button></div></td>
                </tr>
            `;
        }).join('') + `<tr class="payroll-total-row"><td colspan="4"><strong>Total</strong></td><td><strong>${peso(totalNet)}</strong></td><td colspan="2"></td></tr>`;
    }

    /* ============ PAYROLL HISTORY (NEW) ============ */
    function buildPayrollHistory() {
        const years = [...new Set(store.payroll.map(p => (String(p.cycle).match(/(\d{4})/) || [])[1]).filter(Boolean))].sort().reverse();
        const periods = [...new Set(store.payroll.map(p => p.cycle))];
        return `
            <div class="section-title"><h2>Payroll History</h2><span class="hint" id="phCount"></span></div>
            <div class="card">
                <div class="toolbar">
                    <div class="search-wrap"><input type="search" placeholder="Search by employee…" id="phSearch" /></div>
                    <select id="phYear"><option value="">All Years</option>${years.map(y => `<option>${escapeHtml(y)}</option>`).join('')}</select>
                    <select id="phPeriod"><option value="">All Periods</option>${periods.map(p => `<option>${escapeHtml(p)}</option>`).join('')}</select>
                    <div class="spacer"></div>
                    <button class="btn btn-ghost btn-sm" type="button" data-export="payroll">Export CSV</button>
                </div>
                <div class="table-wrap">
                    <table class="data-table">
                        <thead><tr><th>Period</th><th>Employee</th><th>Gross</th><th>Deductions</th><th>Net Pay</th><th>Status</th></tr></thead>
                        <tbody id="phTbody"></tbody>
                    </table>
                </div>
            </div>
        `;
    }
    function renderPayrollHistoryRows() {
        const tbody = $('#phTbody');
        if (!tbody) return;
        const q = ($('#phSearch')?.value || '').trim().toLowerCase();
        const yr = $('#phYear')?.value || '';
        const pr = $('#phPeriod')?.value || '';
        const rows = store.payroll.filter(p => {
            const emp = empById(p.empId);
            const name = emp ? emp.name : p.empId;
            const matchQ = !q || name.toLowerCase().includes(q) || String(p.empId).toLowerCase().includes(q);
            const matchY = !yr || String(p.cycle).includes(yr);
            const matchP = !pr || p.cycle === pr;
            return matchQ && matchY && matchP;
        });
        const countEl = $('#phCount');
        if (countEl) countEl.textContent = `${rows.length} record(s)`;
        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">◌</div><strong>No payroll history</strong><p>No records match the current filters.</p></div></td></tr>`;
            return;
        }
        tbody.innerHTML = rows.map(p => {
            const emp = empById(p.empId);
            return `<tr>
                <td>${escapeHtml(p.cycle)}</td>
                <td>${escapeHtml(emp ? emp.name : p.empId)}<span class="cell-sub">${p.empId}</span></td>
                <td>${peso(p.gross)}</td>
                <td>${peso(p.deductions)}</td>
                <td><strong>${peso(p.gross - p.deductions)}</strong></td>
                <td><span class="pill ${pillClass(p.status)}">${escapeHtml(p.status)}</span></td>
            </tr>`;
        }).join('');
    }

    /* ============ ACCOUNT MANAGEMENT (NEW) ============ */
    let amUserCache = [];
    function buildAccountManagement() {
        return `
            <div class="section-title"><h2>Account Management</h2><span class="hint" id="amCount"></span></div>
            <div class="card">
                <div class="toolbar">
                    <div class="search-wrap"><input type="search" placeholder="Search by name or email…" id="amSearch" /></div>
                    <select id="amDept">
                        <option value="">All Departments</option>
                        <option>HR</option><option>Finance</option><option>Administration</option><option>Information Technology</option>
                    </select>
                    <select id="amRole">
                        <option value="">All Roles</option>
                        <option>HR Admin</option><option>HR Staff</option>
                        <option>Finance Admin</option><option>Finance Staff</option>
                        <option>Administrator</option>
                    </select>
                    <select id="amStatus">
                        <option value="">All Status</option>
                        <option>Active</option><option>Pending</option><option>Rejected</option><option>Inactive</option>
                    </select>
                    <div class="spacer"></div>
                    ${canManageRecords() ? '<button class="btn btn-primary btn-sm" type="button" id="amCreateBtn">+ Add Employee Account</button>' : ''}
                </div>
                <div class="table-wrap">
                    <table class="data-table">
                        <thead><tr><th>ID</th><th>Employee</th><th>Role</th><th>Department</th><th>Status</th><th style="text-align:right;">Actions</th></tr></thead>
                        <tbody id="amTbody"></tbody>
                    </table>
                </div>
            </div>
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
            const matchQ = !q || `${u.fullName || ''} ${u.email || ''} ${u.id || ''} ${u.employeeId || ''}`.toLowerCase().includes(q);
            const matchD = !dept   || u.department === dept;
            const matchR = !role   || u.role === role;
            const matchS = !status || u.status === status;
            return matchQ && matchD && matchR && matchS;
        });
        const countEl = $('#amCount');
        if (countEl) countEl.textContent = `${rows.length} of ${amUserCache.length} accounts`;
        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>No accounts match the current filters.</p></div></td></tr>`;
            return;
        }
        tbody.innerHTML = rows.map(u => {
            const hasAccount = u.id && u.id !== '' && u.status !== 'No Account';
            // Show employee ID for stability; fall back to account ID if no employee id.
            const idLabel = u.employeeId || u.id || '—';
            const statusPill = hasAccount
                ? `<span class="pill ${pillClass(u.status)}">${escapeHtml(u.status)}</span>`
                : `<span class="pill neutral">No Account</span>`;

            const actions = hasAccount
                ? `<button class="btn btn-subtle btn-xs" data-am-act="reset" data-am-id="${escapeHtml(u.id)}">Reset PW</button>
                   ${u.status === 'Active'
                       ? `<button class="btn btn-danger btn-xs" data-am-act="deactivate" data-am-id="${escapeHtml(u.id)}">Deactivate</button>`
                       : `<button class="btn btn-primary btn-xs" data-am-act="activate" data-am-id="${escapeHtml(u.id)}">Activate</button>`}`
                : `<button class="btn btn-primary btn-xs" data-am-act="create" data-am-emp="${escapeHtml(u.employeeId)}" data-am-name="${escapeHtml(u.fullName)}">Create Account</button>`;

            return `
            <tr data-id="${escapeHtml(u.id)}" data-empid="${escapeHtml(u.employeeId || '')}">
                <td><strong>${escapeHtml(idLabel)}</strong></td>
                <td>${escapeHtml(u.fullName)}<span class="cell-sub">${escapeHtml(u.email || '')}</span></td>
                <td>${escapeHtml(u.role || '—')}</td>
                <td>${escapeHtml(u.department || '—')}</td>
                <td>${statusPill}</td>
                <td><div class="cell-actions">${actions}</div></td>
            </tr>`;
        }).join('');
    }

    function buildContribution() {
        return `
            <div class="section-title"><h2>Contribution</h2><span class="hint" id="contributionSummary"></span></div>
            <div class="card">
                <div class="toolbar"><div class="spacer"></div><button class="btn btn-ghost btn-sm" type="button" data-export="contribution">Export CSV</button></div>
                <div class="table-wrap"><table class="data-table"><thead><tr><th>Employee ID</th><th>Employee</th><th>SSS ₱</th><th>PhilHealth ₱</th><th>Pag-IBIG ₱</th><th>Total ₱</th></tr></thead><tbody id="contributionTbody"></tbody></table></div>
            </div>
        `;
    }
    function renderContributionRows() {
        const tbody = $('#contributionTbody');
        if (!tbody) return;
        const rows = store.employees.map(e => {
            const amounts = ['SSS', 'PhilHealth', 'Pag-IBIG'].map(type =>
                store.deductions.filter(d => d.empId === e.id && d.type === type).reduce((sum, d) => sum + Number(d.amount || 0), 0)
            );
            const total = amounts.reduce((s, a) => s + a, 0);
            return `<tr><td><strong>${escapeHtml(e.id)}</strong></td><td>${escapeHtml(e.name)}</td>${amounts.map(a => `<td>${peso(a)}</td>`).join('')}<td><strong>${peso(total)}</strong></td></tr>`;
        }).join('');
        tbody.innerHTML = rows || '<tr><td colspan="6"><div class="empty-state"><p>No employees found.</p></div></td></tr>';
        const sumEl = $('#contributionSummary');
        if (sumEl) {
            const grandTotal = store.deductions.reduce((s, d) => s + Number(d.amount || 0), 0);
            sumEl.textContent = `${store.employees.length} employees, Total contributions: ${peso(grandTotal)}`;
        }
    }

    function build13thMonth() {
        return `
            <div class="section-title"><h2>13th Month Pay</h2><span class="hint">Annual bonus records</span></div>
            <div class="card">
                <div class="toolbar"><div class="spacer"></div><button class="btn btn-ghost btn-sm" type="button" data-export="13thmonth">Export CSV</button></div>
                <div class="table-wrap"><table class="data-table"><thead><tr><th>Employee ID</th><th>Employee</th><th>Annual Basic ₱</th><th>13th Month ₱</th><th>Status</th></tr></thead><tbody>
                    ${store.employees.map(e => `<tr><td><strong>${escapeHtml(e.id)}</strong></td><td>${escapeHtml(e.name)}</td><td>${peso(Number(e.salary || 0) * 12)}</td><td><strong>${peso(e.salary)}</strong></td><td><span class="pill ${pillClass(e.status)}">${escapeHtml(e.status)}</span></td></tr>`).join('')}
                </tbody></table></div>
            </div>
        `;
    }

    function buildDeductions() {
        const types = [...new Set(store.deductions.map(d => d.type))];
        return `
            <div class="section-title"><h2>Deductions</h2><span class="hint" id="dedCount"></span></div>
            <div class="card">
                <div class="toolbar">
                    <div class="search-wrap"><input type="search" placeholder="Search by employee or type…" id="dedSearch" /></div>
                    <select id="dedType"><option value="">All Types</option>${types.map(t => `<option>${escapeHtml(t)}</option>`).join('')}</select>
                    <select id="dedStatus"><option value="">All Status</option><option>Applied</option><option>Pending</option><option>Cancelled</option></select>
                    <div class="spacer"></div>
                    <button class="btn btn-ghost btn-sm" type="button" data-export="deductions">Export CSV</button>
                    ${canManageRecords() ? '<button class="btn btn-primary btn-sm" type="button" id="addDedBtn">+ Add Deduction</button>' : ''}
                </div>
                <div class="table-wrap">
                    <table class="data-table">
                        <thead><tr><th>Employee</th><th>Type</th><th>Period</th><th>Amount</th><th>Status</th><th style="text-align:right;">Actions</th></tr></thead>
                        <tbody id="dedTbody"></tbody>
                    </table>
                </div>
            </div>
        `;
    }
    function renderDeductionRows() {
        const tbody = $('#dedTbody');
        if (!tbody) return;
        const q = ($('#dedSearch')?.value || '').trim().toLowerCase();
        const type = $('#dedType')?.value || '';
        const status = $('#dedStatus')?.value || '';
        const rows = store.deductions.filter(d => {
            const emp = empById(d.empId);
            const text = `${emp ? emp.name : ''} ${d.type}`.toLowerCase();
            return (!q || text.includes(q)) && (!type || d.type === type) && (!status || d.status === status);
        });
        const countEl = $('#dedCount');
        const total = rows.reduce((s, d) => s + Number(d.amount || 0), 0);
        if (countEl) countEl.textContent = `${rows.length} record(s), Total: ${peso(total)}`;
        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">◌</div><strong>No deductions found</strong><p>No records match the current filters.</p></div></td></tr>`;
            return;
        }
        tbody.innerHTML = rows.map(d => {
            const emp = empById(d.empId);
            return `
                <tr data-id="${d.id}">
                    <td><div class="cell-name"><div class="cell-avatar">${initials(emp ? emp.name : d.empId)}</div><div>${escapeHtml(emp ? emp.name : d.empId)}<span class="cell-sub">${d.empId}</span></div></div></td>
                    <td>${escapeHtml(d.type)}</td>
                    <td>${escapeHtml(d.period)}</td>
                    <td><strong>${peso(d.amount)}</strong></td>
                    <td><span class="pill ${pillClass(d.status)}">${escapeHtml(d.status)}</span></td>
                    <td><div class="cell-actions"><button class="btn btn-subtle btn-xs" data-act="editDed" data-id="${d.id}">Edit</button><button class="btn btn-danger btn-xs" data-act="deleteDed" data-id="${d.id}">Delete</button></div></td>
                </tr>
            `;
        }).join('');
    }

    function buildSettings() {
        const s = store.settings;
        return `
            <div class="section-title"><h2>Settings</h2><span class="hint">Preferences</span></div>
            <div class="card">
                <div class="card-header"><h3>Company Information</h3></div>
                <div style="padding:22px;">
                    <div class="form-grid">
                        <div class="form-field"><label>Company Name</label><input type="text" id="set-company" value="${escapeHtml(s.company)}" /></div>
                        <div class="form-field"><label>Default Currency</label><select id="set-currency"><option ${s.currency === 'PHP (₱)' ? 'selected' : ''}>PHP (₱)</option><option ${s.currency === 'USD ($)' ? 'selected' : ''}>USD ($)</option><option ${s.currency === 'EUR (€)' ? 'selected' : ''}>EUR (€)</option></select></div>
                        <div class="form-field"><label>Payroll Cycle</label><select id="set-cycle"><option ${s.cycle === 'October 1–15, 2026' ? 'selected' : ''}>October 1–15, 2026</option><option ${s.cycle === 'Weekly' ? 'selected' : ''}>Weekly</option><option ${s.cycle === 'Monthly' ? 'selected' : ''}>Monthly</option></select></div>
                        <div class="form-field"><label>Working Days / Week</label><select id="set-days"><option ${s.days === '5 days (Mon–Fri)' ? 'selected' : ''}>5 days (Mon–Fri)</option><option ${s.days === '6 days (Mon–Sat)' ? 'selected' : ''}>6 days (Mon–Sat)</option></select></div>
                    </div>
                    <div class="form-actions">
                        <button class="btn btn-subtle" type="button" id="resetSettingsBtn">Reset</button>
                        <button class="btn btn-primary" type="button" id="saveSettingsBtn">Save Settings</button>
                    </div>
                </div>
            </div>
        `;
    }

    function buildAuditTrail() {
        return `
            <div class="section-title"><h2>Audit Trail</h2><span class="hint" id="atCount"></span></div>
            <div class="card">
                <div class="toolbar">
                    <div class="search-wrap"><input type="search" placeholder="Search user, action, entity…" id="atSearch" /></div>
                    <select id="atModule">
                        <option value="">All Modules</option>
                        <option>auth</option>
                        <option>account</option>
                        <option>store</option>
                        <option>leave</option>
                        <option>attendance</option>
                    </select>
                    <div class="spacer"></div>
                </div>
                <div class="table-wrap">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Date &amp; Time</th>
                                <th>User</th>
                                <th>Role</th>
                                <th>Module</th>
                                <th>Action</th>
                                <th>Record</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody id="atTbody"></tbody>
                    </table>
                </div>
            </div>
        `;
    }

    async function loadAuditTrail() {
        const tbody = $('#atTbody');
        if (!tbody) return;
        try {
            const result = await apiRequest('audit');
            const events = result.events || [];
            const q = ($('#atSearch')?.value || '').trim().toLowerCase();
            const mod = $('#atModule')?.value || '';
            const rows = events.filter(e => {
                const actor = String(e.actor || '');
                const text = `${actor} ${e.action} ${e.entity} ${e.details}`.toLowerCase();
                const matchQ = !q || text.includes(q);
                const matchM = !mod || e.entity === mod;
                return matchQ && matchM;
            });
            const countEl = $('#atCount');
            if (countEl) countEl.textContent = `${rows.length} event(s)`;
            if (!rows.length) {
                tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><p>No audit events found.</p></div></td></tr>`;
                return;
            }
            tbody.innerHTML = rows.map(e => {
                const [email, role] = String(e.actor || '').split('|');
                return `<tr>
                    <td>${new Date(e.at).toLocaleString()}</td>
                    <td>${escapeHtml(email || '—')}</td>
                    <td>${escapeHtml(role || '—')}</td>
                    <td>${escapeHtml(e.entity || '—')}</td>
                    <td><span class="pill info">${escapeHtml(e.action)}</span></td>
                    <td>${escapeHtml(String(e.entityId ?? '—'))}</td>
                    <td>${escapeHtml(e.details || '—')}</td>
                </tr>`;
            }).join('');
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><p>${escapeHtml(err.message)}</p></div></td></tr>`;
        }
    }

    function buildAccount() {
        const username = localStorage.getItem('devs_user') || 'admin';
        const profile = JSON.parse(localStorage.getItem('devs_profile') || '{}');
        const fullName = profile.fullName || 'Administrator';
        const email    = profile.email    || 'admin@devs.com';
        const phone    = profile.phone    || '0917-000-0000';
        const role     = profile.role     || 'System Administrator';
        const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
        const ini = nameParts.length > 1 ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase() : (nameParts[0] || username).substring(0, 2).toUpperCase();
        return `
            <div class="section-title"><h2>Account Settings</h2><span class="hint">Profile &amp; security</span></div>
            <div class="account-header">
                <div class="account-avatar">${escapeHtml(ini)}</div>
                <div class="account-header-info">
                    <div class="account-name">${escapeHtml(fullName)}</div>
                    <div class="account-role">${escapeHtml(role)}</div>
                    <div class="account-username">${escapeHtml(username)}</div>
                </div>
            </div>
            <div class="card">
                <div class="card-header"><h3>Profile Information</h3></div>
                <div style="padding:22px;">
                    <div class="form-grid">
                        <div class="form-field"><label for="acc-name">Full Name</label><input type="text" id="acc-name" value="${escapeHtml(fullName)}" /></div>
                        <div class="form-field"><label for="acc-role">Role / Position</label><input type="text" id="acc-role" value="${escapeHtml(role)}" readonly /></div>
                        <div class="form-field"><label for="acc-email">Email</label><input type="email" id="acc-email" value="${escapeHtml(email)}" /></div>
                        <div class="form-field"><label for="acc-phone">Phone</label><input type="text" id="acc-phone" value="${escapeHtml(phone)}" /></div>
                    </div>
                    <div class="form-actions">
                        <button class="btn btn-subtle" type="button" id="accResetBtn">Reset</button>
                        <button class="btn btn-primary" type="button" id="accSaveBtn">Save Changes</button>
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="card-header"><h3>Change Password</h3></div>
                <div style="padding:22px;">
                    <div class="form-grid">
                        <div class="form-field full"><label for="acc-current">Current Password</label><input type="password" id="acc-current" placeholder="Enter current password" /></div>
                        <div class="form-field"><label for="acc-new">New Password</label><input type="password" id="acc-new" placeholder="At least 8 characters" /></div>
                        <div class="form-field"><label for="acc-confirm">Confirm New Password</label><input type="password" id="acc-confirm" placeholder="Repeat new password" /></div>
                    </div>
                    <div class="form-actions"><button class="btn btn-primary" type="button" id="accChangePassBtn">Update Password</button></div>
                </div>
            </div>
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

    function buildPageAccessManager() {
        return `
            <div class="section-title"><h2>User Permission</h2><span class="hint">Check to show · Uncheck to hide</span></div>
            <div class="pa-filters">
                <label class="pa-filter"><span>Select User:</span>
                    <select id="paUser"><option value="__all__">— All users in this group —</option></select>
                </label>
                <label class="pa-filter"><span>Select Position:</span>
                    <select id="paPosition"><option value="">All Positions</option><option>Admin</option><option>Staff</option></select>
                </label>
                <label class="pa-filter"><span>Select Department:</span>
                    <select id="paDepartment"><option value="">All Departments</option><option>HR</option><option>Finance</option></select>
                </label>
            </div>
            <div class="pa-grid" id="paGrid"><div class="empty-state"><p>Loading…</p></div></div>
            <div class="pa-actions"><button type="button" class="btn btn-primary" id="paSaveBtn">Save Access</button></div>
        `;
    }

    function buildRegistrationApprovalPage() {
        return `
            <div class="section-title"><h2>Registration Approval</h2><span class="hint">Approve or reject new sign-ups</span></div>
            <div class="card">
                <div class="card-header"><h3>Pending Registrations</h3></div>
                <div id="pendingUsersList" class="activity-list"><div class="empty-state"><p>Loading registrations…</p></div></div>
            </div>
        `;
    }

    async function loadPendingUsers() {
        const list = $('#pendingUsersList');
        if (!list) return;
        try {
            const result = await apiRequest('users');
            const pending = result.users.filter(user => user.status === 'Pending');
            list.innerHTML = pending.length ? pending.map(user => `
                <div class="activity-item approval-row">
                    <div><strong>${escapeHtml(user.fullName)}</strong><span>${escapeHtml(user.email)} | ${escapeHtml(user.department)} ${escapeHtml(user.position)}</span></div>
                    <div class="cell-actions">
                        <button class="btn btn-primary btn-sm" type="button" data-user-action="approve" data-user-id="${escapeHtml(user.id)}">Approve</button>
                        <button class="btn btn-danger btn-sm" type="button" data-user-action="reject" data-user-id="${escapeHtml(user.id)}">Reject</button>
                    </div>
                </div>
            `).join('') : '<div class="empty-state"><p>No registrations are waiting for approval.</p></div>';
        } catch (error) {
            list.innerHTML = `<div class="empty-state"><p>${escapeHtml(error.message)}</p></div>`;
        }
    }
    async function reviewRegistration(action, id) {
        try {
            const result = await apiRequest(`users.${action}`, { method: 'POST', body: JSON.stringify({ id }) });
            toast(result.message, 'success');
            loadPendingUsers();
        } catch (error) { toast(error.message, 'error'); }
    }

    // ============ PAGE ACCESS MANAGER INTERNALS ============
    let paCatalog = null, paAccessMap = {};
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
            if (pos  && (u.position   || '') !== pos)  return false;
            if (dept && (u.department || '') !== dept) return false;
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
                return `<div class="pa-section" data-module="${escapeHtml(modKey)}"><h3>${escapeHtml(mod.label)}</h3><label class="pa-item pa-check-all"><input type="checkbox" data-check-all="${escapeHtml(modKey)}" /><span>Check All</span></label>${items}</div>`;
            }).join('');
        grid.innerHTML = sections || '<div class="empty-state"><p>No pages match the selected department.</p></div>';
        grid.classList.toggle('is-preview', matched.length === 0);
        grid.querySelectorAll('[data-check-all]').forEach(master => {
            const module = master.dataset.checkAll;
            const section = grid.querySelector(`.pa-section[data-module="${module}"]`);
            const boxes = section ? Array.from(section.querySelectorAll('input[data-page-key]')) : [];
            master.checked = boxes.length > 0 && boxes.every(b => b.checked);
            master.addEventListener('change', () => boxes.forEach(b => { b.checked = master.checked; }));
            boxes.forEach(b => b.addEventListener('change', () => { master.checked = boxes.every(x => x.checked); }));
        });
        const saveBtn = document.getElementById('paSaveBtn');
        if (saveBtn) saveBtn.disabled = matched.length === 0;
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
        renderPaGrid();
    }
    async function saveGroupAccess() {
        const target = document.getElementById('paUser')?.value || '__all__';
        const matched = getTargetUsers();
        if (!matched.length) { toast('No users match the current selection.', 'error'); return; }
        const access = {};
        document.querySelectorAll('#paGrid input[data-page-key]').forEach(box => { access[box.dataset.pageKey] = box.checked; });
        access.pageAccess = true;
        const anyAllowed = Object.values(access).some(v => v === true);
        if (!anyAllowed) {
            const ok = await confirmDialog({
                title: 'Remove all access?',
                message: target === '__all__' ? `You are about to hide every page from ${matched.length} user(s). Continue?` : `You are about to hide every page from ${matched[0].fullName}. Continue?`,
                confirmLabel: 'Yes, remove all', danger: true
            });
            if (!ok) return;
        } else {
            const ok = await confirmDialog({
                title: target === '__all__' ? 'Apply to matching users?' : 'Apply to this user?',
                message: target === '__all__' ? `This will set page access for ${matched.length} user(s) in the selected group.` : `This will set page access for ${matched[0].fullName}.`,
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
            if (btn) btn.addEventListener('click', throttle(() => downloadExport('leaves', btn), 350));
            dashboardPanel?.addEventListener('click', throttle(guard(handleLeaveAction), 120));
        }

        if (page === 'employees') {
            renderEmployeeRows();
            $('#empSearch')?.addEventListener('input', throttle(guard(renderEmployeeRows), 100));
            $('#empDept')?.addEventListener('change', throttle(guard(renderEmployeeRows), 100));
            $('#empPosition')?.addEventListener('change', throttle(guard(renderEmployeeRows), 100));
            $('#empStatus')?.addEventListener('change', throttle(guard(renderEmployeeRows), 100));
            $('#empTbody')?.addEventListener('click', throttle(guard(handleEmployeeAction), 120));
        }

        if (page === 'attendance') {
            renderAttendanceRows();
            $('#attSearch')?.addEventListener('input', throttle(guard(renderAttendanceRows), 100));
            $('#attDate')?.addEventListener('change', throttle(guard(() => {
                localStorage.setItem(ATTENDANCE_FILTER_KEY, $('#attDate')?.value || todayDateString());
                renderAttendanceRows();
            }), 100));
            $('#attStatus')?.addEventListener('change', throttle(guard(renderAttendanceRows), 100));
            $('#addAttBtn')?.addEventListener('click', (e) => { if (!lockElement(e.currentTarget, 500)) return; guard(() => openAttendanceForm())(); });
            $('#clockInBtn')?.addEventListener('click', (e) => { if (!lockElement(e.currentTarget, 500)) return; guard(() => logStaffAttendance('in'))(); });
            $('#clockOutBtn')?.addEventListener('click', (e) => { if (!lockElement(e.currentTarget, 500)) return; guard(() => logStaffAttendance('out'))(); });
            $('#attTbody')?.addEventListener('click', throttle(guard(handleAttendanceAction), 120));
        }

        if (page === 'leave') {
            renderLeaveRows();
            $('#leaveSearch')?.addEventListener('input', throttle(guard(renderLeaveRows), 100));
            $('#leaveType')?.addEventListener('change', throttle(guard(renderLeaveRows), 100));
            $('#leaveStatus')?.addEventListener('change', throttle(guard(renderLeaveRows), 100));
            $('#addLeaveBtn')?.addEventListener('click', (e) => { if (!lockElement(e.currentTarget, 500)) return; guard(openLeaveForm)(); });
            $('#leaveTbody')?.addEventListener('click', throttle(guard(handleLeaveAction), 120));
        }

        if (page === 'payroll') {
            renderPayrollRows();
            $('#payrollCycle')?.addEventListener('change', throttle(guard(renderPayrollRows), 100));
            $('#payrollStatus')?.addEventListener('change', throttle(guard(renderPayrollRows), 100));
            $('#payrollTbody')?.addEventListener('click', throttle(guard(handlePayrollAction), 120));
            $('#printPayrollBtn')?.addEventListener('click', (e) => { if (!lockElement(e.currentTarget, 600)) return; window.print(); });
            $('#runPayrollBtn')?.addEventListener('click', (e) => {
                if (!lockElement(e.currentTarget, 600)) return;
                guard(() => {
                    const pending = store.payroll.filter(p => p.status === 'Pending');
                    if (!pending.length) { toast('No pending payroll to process.', 'info'); return; }
                    applyLeavePayrollRule();
                    pending.forEach(p => p.status = 'Processed');
                    saveStore();
                    toast(`Payroll processed for ${pending.length} employee(s).`);
                    renderPayrollRows();
                })();
            });
            $('#payrollPreviewBtn')?.addEventListener('click', (e) => {
                if (!lockElement(e.currentTarget, 450)) return;
                guard(() => { const first = store.payroll[0]; if (first) openPayslip(first); })();
            });
        }

        if (page === 'payrollHistory') {
            renderPayrollHistoryRows();
            $('#phSearch')?.addEventListener('input', throttle(guard(renderPayrollHistoryRows), 100));
            $('#phYear')?.addEventListener('change', throttle(guard(renderPayrollHistoryRows), 100));
            $('#phPeriod')?.addEventListener('change', throttle(guard(renderPayrollHistoryRows), 100));
        }

        if (page === 'accountManagement') {
            loadAccountManagement();
            $('#amSearch')?.addEventListener('input', throttle(guard(renderAccountManagementRows), 100));
            $('#amDept')?.addEventListener('change', throttle(guard(renderAccountManagementRows), 100));
            $('#amRole')?.addEventListener('change', throttle(guard(renderAccountManagementRows), 100));
            $('#amStatus')?.addEventListener('change', throttle(guard(renderAccountManagementRows), 100));
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
                    const ok = await confirmDialog({
                        title: 'Reset Password',
                        message: `Issue a temporary password for ${user.fullName}?`,
                        confirmLabel: 'Reset'
                    });
                    if (!ok) return;
                    try {
                        const r = await apiRequest('users.resetPassword', { method: 'POST', body: JSON.stringify({ id }) });
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
                        await loadAccountManagement();
                    } catch (err) { toast(err.message, 'error'); }
                }
            }), 120));
        }

        if (page === 'contribution') { renderContributionRows(); }

        if (page === 'deductions') {
            renderDeductionRows();
            $('#dedSearch')?.addEventListener('input', throttle(guard(renderDeductionRows), 100));
            $('#dedType')?.addEventListener('change', throttle(guard(renderDeductionRows), 100));
            $('#dedStatus')?.addEventListener('change', throttle(guard(renderDeductionRows), 100));
            $('#addDedBtn')?.addEventListener('click', (e) => { if (!lockElement(e.currentTarget, 500)) return; guard(() => openDeductionForm())(); });
            $('#dedTbody')?.addEventListener('click', throttle(guard(handleDeductionAction), 120));
        }

        if (page === 'pageAccess') {
            (async () => {
                try {
                    const result = await apiRequest('users');
                    window.__paUsersCache = result.users || [];
                } catch { window.__paUsersCache = []; }
                await ensureCatalog();
                await loadGroupAccess();
                renderPaUserOptions();
            })();
            document.getElementById('paPosition')?.addEventListener('change', () => { renderPaUserOptions(); renderPaGrid(); });
            document.getElementById('paDepartment')?.addEventListener('change', () => { renderPaUserOptions(); renderPaGrid(); });
            document.getElementById('paUser')?.addEventListener('change', () => { renderPaGrid(); });
            document.getElementById('paSaveBtn')?.addEventListener('click', (e) => {
                if (!lockElement(e.currentTarget, 600)) return;
                saveGroupAccess();
            });
        }

        if (page === 'registrationApproval') {
            $('#pendingUsersList')?.addEventListener('click', (event) => {
                const button = event.target.closest('[data-user-action]');
                if (button) reviewRegistration(button.dataset.userAction, button.dataset.userId);
            });
            loadPendingUsers();
        }

        if (page === 'auditTrail') {
            loadAuditTrail();
            $('#atSearch')?.addEventListener('input', throttle(guard(loadAuditTrail), 150));
            $('#atModule')?.addEventListener('change', throttle(guard(loadAuditTrail), 150));
        }

        if (page === 'settings') {
            $('#saveSettingsBtn')?.addEventListener('click', (e) => {
                if (!lockElement(e.currentTarget, 600)) return;
                guard(() => {
                    store.settings.company  = $('#set-company').value;
                    store.settings.currency = $('#set-currency').value;
                    store.settings.cycle    = $('#set-cycle').value;
                    store.settings.days     = $('#set-days').value;
                    saveStore();
                    toast('Settings saved successfully.');
                })();
            });
            $('#resetSettingsBtn')?.addEventListener('click', (e) => {
                if (!lockElement(e.currentTarget, 600)) return;
                guard(() => {
                    store.settings = JSON.parse(JSON.stringify(SEED.settings));
                    saveStore();
                    renderPage('settings');
                    toast('Settings reset to defaults.', 'info');
                })();
            });
        }

        if (page === 'account') {
            $('#accSaveBtn')?.addEventListener('click', (e) => {
                if (!lockElement(e.currentTarget, 600)) return;
                guard(async () => {
                    const data = {
                        fullName: $('#acc-name').value.trim() || 'Administrator',
                        email:    $('#acc-email').value.trim(),
                        phone:    $('#acc-phone').value.trim()
                    };
                    try {
                        const result = await apiRequest('profile', { method: 'POST', body: JSON.stringify(data) });
                        activeUser = result.user;
                        localStorage.setItem('devs_user', result.user.username);
                        localStorage.setItem('devs_profile', JSON.stringify(result.user));
                        updateAvatarFromProfile();
                        toast('Profile updated successfully.');
                        renderPage('account');
                    } catch (error) { toast(error.message, 'error'); }
                })();
            });
            $('#accResetBtn')?.addEventListener('click', (e) => {
                if (!lockElement(e.currentTarget, 500)) return;
                guard(() => { renderPage('account'); toast('Changes discarded.', 'info'); })();
            });
            $('#accChangePassBtn')?.addEventListener('click', (e) => {
                if (!lockElement(e.currentTarget, 600)) return;
                guard(async () => {
                    const current = $('#acc-current').value;
                    const next    = $('#acc-new').value;
                    const confirm = $('#acc-confirm').value;
                    if (!current || !next || !confirm) { toast('Please fill in all password fields.', 'error'); return; }
                    if (next.length < 8) { toast('New password must be at least 8 characters.', 'error'); return; }
                    if (next !== confirm) { toast('New passwords do not match.', 'error'); return; }
                    try {
                        const result = await apiRequest('password', { method: 'POST', body: JSON.stringify({ current, next }) });
                        $('#acc-current').value = ''; $('#acc-new').value = ''; $('#acc-confirm').value = '';
                        toast(result.message);
                    } catch (error) { toast(error.message, 'error'); }
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
    function openEmployeeView(emp) {
        openModal({
            title: `Employee · ${emp.id}`,
            onCancel: closeModal,
            onExtraClick: (e) => {
                const btn = e.target.closest('[data-act="edit-from-view"]');
                if (!btn) return false;
                closeModal();
                setTimeout(() => openEmployeeForm(empById(btn.dataset.id)), 120);
                return true;
            },
            body: `
                <div class="cell-name" style="margin-bottom:20px;">
                    <div class="cell-avatar" style="width:56px;height:56px;font-size:18px;">${initials(emp.name)}</div>
                    <div>
                        <div style="font-size:17px;font-weight:700;color:var(--text-strong);">${escapeHtml(emp.name)}</div>
                        <div style="font-size:13px;color:var(--text-muted);margin-top:2px;">${escapeHtml(emp.position || 'Staff')} | ${escapeHtml(emp.dept)}</div>
                    </div>
                </div>
                <div class="form-grid" style="gap:14px 22px;">
                    <div class="form-field"><label>Employee ID</label><div style="font-weight:600;">${emp.id}</div></div>
                    <div class="form-field"><label>Status</label><div><span class="pill ${pillClass(emp.status)}">${emp.status}</span></div></div>
                    <div class="form-field"><label>Email</label><div style="font-weight:600;">${escapeHtml(emp.email || 'Not provided')}</div></div>
                    <div class="form-field"><label>Phone</label><div style="font-weight:600;">${escapeHtml(emp.phone || 'Not provided')}</div></div>
                    <div class="form-field"><label>Monthly Salary</label><div style="font-weight:600;">${peso(emp.salary)}</div></div>
                    <div class="form-field"><label>Date Joined</label><div style="font-weight:600;">${emp.joined}</div></div>
                </div>
                <div class="form-actions">
                    <button class="btn btn-subtle" type="button" data-act="close">Close</button>
                    <button class="btn btn-primary" type="button" data-act="edit-from-view" data-id="${emp.id}">Edit</button>
                </div>
            `
        });
    }
    function openEmployeeForm(emp = null) {
        const isEdit = !!emp;
        const e = emp || { name: '', position: 'Staff', dept: 'HR', email: '', phone: '', salary: '', status: 'Active', joined: todayDateString() };
        const depts = ['HR', 'Finance'];
        openModal({
            title: isEdit ? `Edit Employee | ${emp.id}` : 'Add New Employee',
            onCancel: closeModal,
            onSubmit: (form) => {
                const data = Object.fromEntries(new FormData(form).entries());
                let valid = true;
                const markError = (name, hasError) => {
                    const field = form.querySelector(`[name="${name}"]`)?.closest('.form-field');
                    if (field) field.classList.toggle('has-error', hasError);
                    if (hasError) valid = false;
                };
                markError('name', !data.name.trim());
                markError('email', !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email));
                markError('salary', !data.salary || Number(data.salary) <= 0);
                if (!valid) return;
                if (isEdit) {
                    Object.assign(emp, { name: data.name.trim(), position: data.position, dept: data.dept, email: data.email.trim(), phone: data.phone.trim(), salary: Number(data.salary), status: data.status, joined: data.joined });
                    toast('Employee updated successfully.');
                } else {
                    // Leave id empty — the server assigns the real employee_id.
                    store.employees.push({ id: '', name: data.name.trim(), position: data.position, dept: data.dept, email: data.email.trim(), phone: data.phone.trim(), salary: Number(data.salary), status: data.status, joined: data.joined });
                    toast('Employee created successfully.');
                }
                saveStore();
                closeModal();
                renderEmployeeRows();
                // Re-fetch from the server so all dependent rows pick up any
                // employee_id changes (edits, re-inserts) before we render
                // attendance/leave/payroll pages again.
                void syncStateFromServer().catch(() => {});
            },
            body: `
                <form id="empForm" novalidate>
                    <div class="form-grid">
                        <div class="form-field full"><label for="f-name">Full Name</label><input type="text" id="f-name" name="name" value="${escapeHtml(e.name)}" required /><span class="error-text">Please enter the employee's full name.</span></div>
                        <div class="form-field"><label for="f-position">Position</label><select id="f-position" name="position" required><option ${e.position === 'Admin' ? 'selected' : ''}>Admin</option><option ${e.position !== 'Admin' ? 'selected' : ''}>Staff</option></select></div>
                        <div class="form-field"><label for="f-dept">Department</label><select id="f-dept" name="dept" required>${depts.map(d => `<option ${d === e.dept ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
                        <div class="form-field"><label for="f-email">Email</label><input type="email" id="f-email" name="email" value="${escapeHtml(e.email)}" required /><span class="error-text">Please enter a valid email.</span></div>
                        <div class="form-field"><label for="f-phone">Phone</label><input type="text" id="f-phone" name="phone" value="${escapeHtml(e.phone)}" /></div>
                        <div class="form-field"><label for="f-salary">Monthly Salary (₱)</label><input type="number" id="f-salary" name="salary" min="0" step="500" value="${e.salary}" required /><span class="error-text">Please enter a valid salary.</span></div>
                        <div class="form-field"><label for="f-status">Status</label><select id="f-status" name="status"><option ${e.status === 'Active' ? 'selected' : ''}>Active</option><option ${e.status === 'On Leave' ? 'selected' : ''}>On Leave</option><option ${e.status === 'Terminated' ? 'selected' : ''}>Terminated</option></select></div>
                        <div class="form-field"><label for="f-joined">Date Joined</label><input class="picker-input" type="date" id="f-joined" name="joined" value="${e.joined}" required /></div>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-subtle" data-act="cancel">Cancel</button>
                        <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Create Employee'}</button>
                    </div>
                </form>
            `
        });
    }
    function openCreateAccountForm() {
        const depts = ['HR', 'Finance'];
        const today = todayDateString();

        openModal({
            title: 'Create Employee Account',
            size: 'lg',
            onCancel: closeModal,
            onSubmit: async (form) => {
                const data = Object.fromEntries(new FormData(form).entries());
                let valid = true;
                const mark = (name, err) => {
                    const f = form.querySelector(`[name="${name}"]`)?.closest('.form-field');
                    if (f) f.classList.toggle('has-error', err);
                    if (err) valid = false;
                };
                mark('fullName',         !String(data.fullName || '').trim());
                mark('email',            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email || '')));
                mark('password',         String(data.password || '').length < 8);
                mark('confirmPassword',  data.password !== data.confirmPassword);
                mark('salary',           data.salary === '' || Number(data.salary) < 0);
                if (!valid) return;

                try {
                    const r = await apiRequest('users.create', {
                        method: 'POST',
                        body: JSON.stringify({
                            fullName:        String(data.fullName).trim(),
                            email:           String(data.email).trim(),
                            phone:           String(data.phone || '').trim(),
                            position:        data.position || 'Staff',
                            department:      data.department || 'HR',
                            salary:          Number(data.salary || 0),
                            status:          data.status || 'Active',
                            joined:          data.joined || today,
                            password:        data.password,
                            confirmPassword: data.confirmPassword,
                        })
                    });
                    toast(r.message || 'Employee and account created.');
                    closeModal();
                    await loadAccountManagement();
                    await syncStateFromServer().catch(() => {});
                } catch (err) {
                    toast(err.message, 'error');
                }
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
                            <input type="text" name="fullName" required />
                            <span class="error-text">Enter the employee's full name.</span>
                        </div>
                        <div class="form-field">
                            <label>Position</label>
                            <select name="position" required>
                                <option value="Staff">Staff</option>
                                <option value="Admin">Admin</option>
                            </select>
                        </div>
                        <div class="form-field">
                            <label>Department</label>
                            <select name="department" required>
                                ${depts.map(d => `<option value="${d}">${d}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-field">
                            <label>Email</label>
                            <input type="email" name="email" required />
                            <span class="error-text">Enter a valid email.</span>
                        </div>
                        <div class="form-field">
                            <label>Phone</label>
                            <input type="text" name="phone" />
                        </div>
                        <div class="form-field">
                            <label>Monthly Salary (₱)</label>
                            <input type="number" name="salary" min="0" step="500" value="0" required />
                            <span class="error-text">Enter a valid amount.</span>
                        </div>
                        <div class="form-field">
                            <label>Status</label>
                            <select name="status">
                                <option value="Active">Active</option>
                                <option value="On Leave">On Leave</option>
                                <option value="Terminated">Terminated</option>
                            </select>
                        </div>
                        <div class="form-field full">
                            <label>Date Joined</label>
                            <input class="picker-input" type="date" name="joined" value="${today}" required />
                        </div>
                        <div class="form-field full" style="margin-top:8px;">
                            <label style="color:#8c1f2d;font-weight:800;">Login Credentials</label>
                        </div>
                        <div class="form-field">
                            <label>Password</label>
                            <input type="password" name="password" minlength="8" required />
                            <span class="error-text">At least 8 characters.</span>
                        </div>
                        <div class="form-field">
                            <label>Confirm Password</label>
                            <input type="password" name="confirmPassword" minlength="8" required />
                            <span class="error-text">Passwords must match.</span>
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-subtle" data-act="cancel">Cancel</button>
                        <button type="submit" class="btn btn-primary">Create Employee</button>
                    </div>
                </form>
            `
        });
    }

    function openResetPasswordResultModal(employeeName, message) {
        // The server returns: "Temporary password: xxxxxxxx"
        // Extract just the password portion.
        const tempMatch = String(message || '').match(/Temporary password:\s*(\S+)/i);
        const tempPassword = tempMatch ? tempMatch[1] : '';

        openModal({
            title: 'Temporary Password Issued',
            size: 'sm',
            onCancel: closeModal,
            onExtraClick: (e) => {
                const btn = e.target.closest('[data-act]');
                if (!btn) return false;
                const act = btn.dataset.act;
                if (act === 'copy-reset') {
                    if (tempPassword) {
                        navigator.clipboard.writeText(tempPassword)
                            .then(() => toast('Password copied to clipboard.', 'success'))
                            .catch(() => toast('Could not copy. Select manually.', 'info'));
                    }
                    return true;
                }
                if (act === 'close-reset') {
                    closeModal();
                    return true;
                }
                return false;
            },
            body: `
                <div style="text-align:center;padding:8px 0 4px;">
                    <div style="font-size:13px;color:#555;margin-bottom:16px;">
                        A temporary password has been issued for <strong>${escapeHtml(employeeName)}</strong>.
                    </div>
                    ${tempPassword ? `
                        <div style="
                            font-family: 'Courier New', monospace;
                            font-size: 22px;
                            font-weight: 700;
                            letter-spacing: 0.08em;
                            background: #fdf1f1;
                            color: #8c1f2d;
                            border: 1px solid #e9b8b8;
                            border-radius: 8px;
                            padding: 16px 12px;
                            margin-bottom: 12px;
                            user-select: all;
                            -webkit-user-select: all;
                        " id="tempPasswordBox">${escapeHtml(tempPassword)}</div>
                    ` : `
                        <div style="color:#666;font-style:italic;margin-bottom:12px;">
                            ${escapeHtml(message || 'No password returned.')}
                        </div>
                    `}
                    <p style="font-size:12px;color:#888;margin:0 0 18px;line-height:1.5;">
                        Copy this password now and share it with the employee. It will not be shown again.
                    </p>
                </div>
                <div class="form-actions" style="margin-top:0;padding-top:0;border-top:none;justify-content:center;gap:10px;">
                    ${tempPassword ? `<button class="btn btn-subtle" type="button" data-act="copy-reset">Copy Password</button>` : ''}
                    <button class="btn btn-primary" type="button" data-act="close-reset">Close</button>
                </div>
            `
        });
    }

    async function handleEmployeeAction(e) {
        if (!canManageRecords()) return;
        const btn = e.target.closest('button[data-act]');
        if (!btn) return;
        const act = btn.dataset.act;
        const id = btn.dataset.id;
        const emp = store.employees.find(x => String(x.id) === String(id));
        if (!emp) return;
        if (act === 'view') openEmployeeView(emp);
        if (act === 'edit') openEmployeeForm(emp);
        if (act === 'delete') {
            const ok = await confirmDialog({ title: 'Delete Employee', message: `Are you sure you want to remove ${emp.name}? This cannot be undone.`, confirmLabel: 'Delete', danger: true });
            if (!ok) return;
            store.employees = store.employees.filter(x => x.id !== id);
            saveStore();
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
            onCancel: closeModal,
            onSubmit: (form) => {
                const data = Object.fromEntries(new FormData(form).entries());
                if (!data.empId) { form.querySelector('[name="empId"]').closest('.form-field').classList.add('has-error'); return; }
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
                saveStore();
                closeModal();
                renderAttendanceRows();
            },
            body: `
                <form id="attForm" novalidate>
                    <div class="form-grid">
                        <div class="form-field full"><label for="a-emp">Employee</label><select id="a-emp" name="empId" required><option value="">Select employee…</option>${store.employees.map(e => { const n = Number(e.id); return Number.isFinite(n) && n > 0 ? `<option value="${n}" ${String(n) === String(a.empId) ? 'selected' : ''}>${escapeHtml(e.name)} | ${n}</option>` : ''; }).join('')}</select><span class="error-text">Please select an employee.</span></div>
                        <div class="form-field"><label for="a-date">Date</label><input class="picker-input" type="date" id="a-date" name="date" value="${a.date}" required /></div>
                        <div class="form-field"><label for="a-status">Status</label><select id="a-status" name="status"><option ${a.status === 'Present' ? 'selected' : ''}>Present</option><option ${a.status === 'Late' ? 'selected' : ''}>Late</option><option ${a.status === 'On Leave' ? 'selected' : ''}>On Leave</option></select></div>
                        <div class="form-field"><label for="a-tin">Time In</label><input class="picker-input" type="time" id="a-tin" name="timeIn" value="${timeIn}" /></div>
                        <div class="form-field"><label for="a-tout">Time Out</label><input class="picker-input" type="time" id="a-tout" name="timeOut" value="${timeOut}" /></div>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-subtle" data-act="cancel">Cancel</button>
                        <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Log Attendance'}</button>
                    </div>
                </form>
            `
        });
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
            saveStore();
            toast('Record removed.', 'info');
            renderAttendanceRows();
        }
    }

    function openLeaveForm() {
        const staffRequest = !canManageRecords();
        openModal({
            title: staffRequest ? 'Request Leave' : 'New Leave Request',
            onCancel: closeModal,
            onSubmit: async (form) => {
                const data = Object.fromEntries(new FormData(form).entries());
                let valid = true;
                const mark = (name, err) => {
                    const f = form.querySelector(`[name="${name}"]`)?.closest('.form-field');
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
                    saveStore();
                    toast('Leave request submitted.');
                }
                closeModal();
                renderLeaveRows();
            },
            body: `
                <form id="leaveForm" class="leave-form" novalidate>
                    <div class="form-grid">
                        ${staffRequest ? '' : `<div class="form-field full"><label for="l-emp">Employee</label><select id="l-emp" name="empId" required><option value="">Select employee…</option>${store.employees.map(e => { const n = Number(e.id); return Number.isFinite(n) && n > 0 ? `<option value="${n}">${escapeHtml(e.name)} | ${n}</option>` : ''; }).join('')}</select><span class="error-text">Please select an employee.</span></div>`}
                        <div class="form-field"><label for="l-type">Leave Type</label><select id="l-type" name="type"><option>Vacation Leave</option><option>Sick Leave</option><option>Emergency Leave</option></select></div>
                        <div class="form-field"><label for="l-from">From</label><input class="picker-input" type="date" id="l-from" name="from" required /><span class="error-text">Required.</span></div>
                        <div class="form-field"><label for="l-to">To</label><input class="picker-input" type="date" id="l-to" name="to" required /><span class="error-text">Required.</span></div>
                        <div class="form-field full"><label for="l-reason">Reason</label><textarea id="l-reason" name="reason" rows="3" placeholder="Brief reason for leave…"></textarea></div>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-subtle" data-act="cancel">Cancel</button>
                        <button type="submit" class="btn btn-primary">Submit Request</button>
                    </div>
                </form>
            `
        });
    }
    function viewLeave(l) {
        const emp = empById(l.empId);
        const name = recordEmployeeName(l);
        openModal({
            title: `Leave Request | ${l.id}`,
            onCancel: closeModal,
            body: `
                <div class="cell-name" style="margin-bottom:20px;">
                    <div class="cell-avatar" style="width:52px;height:52px;font-size:16px;">${initials(name)}</div>
                    <div><div style="font-size:16px;font-weight:700;color:var(--text-strong);">${escapeHtml(name)}</div><div style="font-size:13px;color:var(--text-muted);margin-top:2px;">${escapeHtml(emp ? (emp.position || 'Staff') : '')}</div></div>
                </div>
                <div class="form-grid" style="gap:14px 22px;">
                    <div class="form-field"><label>Type</label><div style="font-weight:600;">${escapeHtml(l.type)}</div></div>
                    <div class="form-field"><label>Status</label><div><span class="pill ${pillClass(l.status)}">${l.status}</span></div></div>
                    <div class="form-field"><label>From</label><div style="font-weight:600;">${l.from}</div></div>
                    <div class="form-field"><label>To</label><div style="font-weight:600;">${l.to}</div></div>
                    <div class="form-field full"><label>Total Days</label><div style="font-weight:600;">${calcDays(l.from, l.to)} day(s)</div></div>
                    <div class="form-field full"><label>Reason</label><div style="font-weight:600;">${escapeHtml(l.reason || '')}</div></div>
                </div>
                <div class="form-actions"><button class="btn btn-subtle" type="button" data-act="close">Close</button></div>
            `
        });
    }
    async function handleLeaveAction(e) {
        const btn = e.target.closest('button[data-act]');
        if (!btn) return;
        const { act, id } = btn.dataset;
        const l = store.leaves.find(x => String(x.id) === String(id));
        if (!l) return;
        if ((act === 'approve' || act === 'reject') && !canManageRecords()) return;
        if (act === 'approve') {
            const ok = await confirmDialog({ title: 'Approve Leave', message: `Approve this ${l.type} for ${calcDays(l.from, l.to)} day(s)?`, confirmLabel: 'Approve' });
            if (!ok) return;
            l.status = 'Approved';
            applyLeavePayrollRule();
            saveStore();
            toast('Leave approved. Payroll deduction updated.');
            renderLeaveRows();
            renderPayrollRows();
        }
        if (act === 'reject') {
            const ok = await confirmDialog({ title: 'Reject Leave', message: 'Reject this leave request?', confirmLabel: 'Reject', danger: true });
            if (!ok) return;
            l.status = 'Rejected';
            applyLeavePayrollRule();
            saveStore();
            toast('Leave rejected.', 'info');
            renderLeaveRows();
            renderPayrollRows();
        }
        if (act === 'viewLeave') viewLeave(l);
    }

    function openPayslip(p) {
        const emp = empById(p.empId);
        const leaveDeduction = emp ? Math.round(calculateApprovedLeaveDaysForEmployee(p.empId, p.cycle) * (emp.salary / WORKING_DAYS_PER_MONTH)) : 0;
        const totalDeductions = Number(p.deductions ?? 0);
        const baseDeductions = Math.max(0, totalDeductions - leaveDeduction);
        const net = p.gross - totalDeductions;
        openModal({
            title: `Payslip | ${p.id}`,
            size: 'sm',
            onCancel: closeModal,
            body: `
                <div style="text-align:center;margin-bottom:20px;">
                    <div class="cell-avatar" style="width:60px;height:60px;font-size:20px;margin:0 auto 10px;">${initials(emp ? emp.name : p.empId)}</div>
                    <div style="font-size:17px;font-weight:700;color:var(--text-strong);">${escapeHtml(emp ? emp.name : p.empId)}</div>
                    <div style="font-size:12.5px;color:var(--text-muted);margin-top:2px;">${escapeHtml(emp ? (emp.position || 'Staff') : '')} | ${p.empId}</div>
                </div>
                <div style="border:1px solid var(--border);border-radius:10px;padding:16px;background:#fafafa;">
                    <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:13.5px;"><span>Cycle</span><strong>${escapeHtml(p.cycle)}</strong></div>
                    <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:13.5px;border-top:1px solid var(--border);"><span>Gross Pay</span><strong>${peso(p.gross)}</strong></div>
                    <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:13.5px;border-top:1px solid var(--border);color:var(--danger);"><span>Base Deductions</span><strong>− ${peso(baseDeductions)}</strong></div>
                    <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:13.5px;border-top:1px solid var(--border);color:var(--danger);"><span>Leave Deduction</span><strong>− ${peso(leaveDeduction)}</strong></div>
                    <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:13.5px;border-top:1px solid var(--border);color:var(--danger);"><span>Total Deductions</span><strong>− ${peso(totalDeductions)}</strong></div>
                    <div style="display:flex;justify-content:space-between;padding:12px 0 6px;font-size:15px;border-top:2px solid var(--border-strong);margin-top:6px;color:var(--brand);"><span>Net Pay</span><strong>${peso(net)}</strong></div>
                </div>
                <div class="form-actions"><button class="btn btn-subtle" type="button" data-act="close">Close</button><button class="btn btn-primary" type="button" data-act="print">Print</button></div>
            `,
            onExtraClick: (e) => {
                const btn = e.target.closest('[data-act="print"]');
                if (!btn) return false;
                window.print();
                return true;
            }
        });
    }
    async function handlePayrollAction(e) {
        const btn = e.target.closest('button[data-act]');
        if (!btn) return;
        if (btn.dataset.act === 'viewPayslip') {
            const p = store.payroll.find(x => String(x.id) === String(btn.dataset.id));
            if (p) openPayslip(p);
        }
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
                saveStore();
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
        const ded = store.deductions.find(x => String(x.id) === String(id));
        if (!ded) return;
        if (act === 'editDed') openDeductionForm(ded);
        if (act === 'deleteDed') {
            const ok = await confirmDialog({ title: 'Delete Deduction', message: `Remove this ${ded.type} deduction of ${peso(ded.amount)}?`, confirmLabel: 'Delete', danger: true });
            if (!ok) return;
            store.deductions = store.deductions.filter(x => x.id !== id);
            saveStore();
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
        if ((page === 'pageAccess' || page === 'registrationApproval') && !isHrAdmin()) {
            confirmDialog({ title: 'Access Restricted', message: 'This page is only available to HR Administrators.', confirmLabel: 'OK', danger: true });
            const dashLink = document.querySelector('.nav-item[data-page="dashboard"]');
            if (dashLink) dashLink.classList.add('active');
            renderPage('dashboard');
            return;
        }
        if (page !== 'logout' && page !== 'account' && !canAccessPage(page)) {
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
            localStorage.setItem('devs_last_page', 'account');
            renderPage('account');
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

    async function restoreSession() {
        try {
            const result = await apiRequest('session');
            if (!result.user) { window.location.href = '../'; return; }
            activeUser = result.user;
            await syncStateFromServer();
            await loadPageAccess();
            localStorage.setItem('devs_user', result.user.username);
            setLoggedIn(result.user.username, result.user);
            applySidebarRestrictions();
            let lastPage = localStorage.getItem('devs_last_page') || 'dashboard';
            if (!canAccessPage(lastPage) && lastPage !== 'account' && lastPage !== 'logout') {
                lastPage = canAccessPage('dashboard') ? 'dashboard' : 'noAccess';
            }
            markNavActive(lastPage);
            renderPage(lastPage);
        } catch (err) {
            console.warn('restoreSession failed:', err);
            window.location.href = '../';
        }
    }

    void restoreSession();
});