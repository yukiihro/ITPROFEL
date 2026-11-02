document.addEventListener('DOMContentLoaded', () => {

    const API_URL = 'api.php';

    const appShell = document.getElementById('appShell');
    const userAvatar = document.getElementById('userAvatar');
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

    function setLoggedIn(username, user = null) {
        appShell.style.display = 'flex';
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
        if (parts.length === 0) {
            ini = username.substring(0, 2).toUpperCase();
        } else if (parts.length === 1) {
            ini = parts[0].substring(0, 2).toUpperCase();
        } else {
            ini = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        userAvatar.textContent = ini;
        userAvatar.title = `Signed in as ${displayName}`;

        // Mirror the profile into the topbar name/email
        const topbarName  = document.getElementById('topbarName');
        const topbarEmail = document.getElementById('topbarEmail');
        if (topbarName)  topbarName.textContent  = profile.fullName || username;
        if (topbarEmail) topbarEmail.textContent = profile.email    || '';
    }

    function setLoggedOut() {
        localStorage.removeItem('devs_user');
        localStorage.removeItem('devs_last_page');
        activeUser = null;
        void apiRequest('logout', { method: 'POST' })
            .catch(() => {})
            .finally(() => { window.location.href = '../index.php'; });
    }

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
        accounts: [
            { code: '1000', name: 'Cash on Hand', type: 'Asset', balance: 185000 },
            { code: '1010', name: 'Bank Account - BDO', type: 'Asset', balance: 1245000 },
            { code: '1100', name: 'Accounts Receivable', type: 'Asset', balance: 386000 },
            { code: '2000', name: 'Accounts Payable', type: 'Liability', balance: 214000 },
            { code: '4000', name: 'Service Revenue', type: 'Revenue', balance: 1680000 },
            { code: '5000', name: 'Operating Expenses', type: 'Expense', balance: 742000 }
        ],
        receivables: [
            { id: 'AR-001', customer: 'Northstar Digital', invoice: 'INV-2026-041', due: '2026-09-20', amount: 185000, status: 'Open' },
            { id: 'AR-002', customer: 'Cedar & Co.', invoice: 'INV-2026-044', due: '2026-09-25', amount: 96000, status: 'Open' },
            { id: 'AR-003', customer: 'Mabini Retail Group', invoice: 'INV-2026-036', due: '2026-09-08', amount: 105000, status: 'Overdue' }
        ],
        payables: [
            { id: 'AP-001', vendor: 'Makati Properties', invoice: 'BILL-2026-118', due: '2026-09-22', amount: 72000, status: 'Approved' },
            { id: 'AP-002', vendor: 'Cloud Services PH', invoice: 'BILL-2026-121', due: '2026-09-28', amount: 28500, status: 'For review' },
            { id: 'AP-003', vendor: 'Metro Utilities', invoice: 'BILL-2026-115', due: '2026-09-18', amount: 16400, status: 'Due' }
        ],
        cashBank: [
            { id: 'CB-001', account: 'BDO Operating', date: '2026-09-17', description: 'Client retainer deposit', type: 'Credit', amount: 185000, balance: 1245000 },
            { id: 'CB-002', account: 'BDO Operating', date: '2026-09-16', description: 'Office lease payment', type: 'Debit', amount: 72000, balance: 1060000 },
            { id: 'CB-003', account: 'Petty Cash', date: '2026-09-15', description: 'Team supplies replenishment', type: 'Debit', amount: 12500, balance: 185000 }
        ],
        expenses: [
            { id: 'EXP-001', category: 'Office lease', vendor: 'Makati Properties', date: '2026-09-16', amount: 72000, status: 'Posted' },
            { id: 'EXP-002', category: 'Software subscriptions', vendor: 'Cloud Services PH', date: '2026-09-12', amount: 28500, status: 'Approved' },
            { id: 'EXP-003', category: 'Travel and representation', vendor: 'Various vendors', date: '2026-09-10', amount: 18400, status: 'For review' }
        ],
        transactions: [
            { id: 'FT01', date: '2026-09-17', reference: 'PAY-001', source: 'Procure',  description: 'Supplier Pay',   amount: 25000, status: 'Completed' },
            { id: 'FT02', date: '2026-09-17', reference: 'COL-001', source: 'Sales',    description: 'Customer Col',   amount: 40000, status: 'Completed' },
            { id: 'FT03', date: '2026-09-17', reference: 'EXP-001', source: 'Finance',  description: 'Office Supp',    amount: 3500,  status: 'Approved'  },
            { id: 'FT04', date: '2026-09-17', reference: 'PR-001',  source: 'HR',       description: 'Payroll',        amount: 50000, status: 'Completed' }
        ],
        settings: {
            company: 'D.E.V.S Management Inc.',
            currency: 'PHP (₱)',
            cycle: 'September 15–30, 2026',
            days: '5 days (Mon–Fri)'
        }
    };

    const STORE_KEY = 'devs_finance_store_v1';

    /* Chart of Accounts pagination state */
    const COA_ROWS_PER_PAGE = 7;
    let coaCurrentPage = 1;

    function loadStore() {
        try {
            const raw = localStorage.getItem(STORE_KEY);
            if (!raw) return JSON.parse(JSON.stringify(SEED));
            const parsed = JSON.parse(raw);
            return {
                accounts:    parsed.accounts    || JSON.parse(JSON.stringify(SEED.accounts)),
                receivables: parsed.receivables || JSON.parse(JSON.stringify(SEED.receivables)),
                payables:    parsed.payables    || JSON.parse(JSON.stringify(SEED.payables)),
                cashBank:    parsed.cashBank    || JSON.parse(JSON.stringify(SEED.cashBank)),
                expenses:     parsed.expenses     || JSON.parse(JSON.stringify(SEED.expenses)),
                transactions: parsed.transactions || JSON.parse(JSON.stringify(SEED.transactions)),
                settings:     parsed.settings     || JSON.parse(JSON.stringify(SEED.settings))
            };
        } catch {
            return JSON.parse(JSON.stringify(SEED));
        }
    }

    const store = loadStore();

    async function syncStateFromServer() {
        const result = await apiRequest('state');
        if (result.state && typeof result.state === 'object') {
            Object.keys(result.state).forEach(key => {
                if (result.state[key] !== undefined && result.state[key] !== null) {
                    store[key] = result.state[key];
                }
            });
            return;
        }
        await apiRequest('state', {
            method: 'POST',
            body: JSON.stringify({ state: store })
        });
    }

    function saveStore() {
        try {
            localStorage.setItem(STORE_KEY, JSON.stringify(store));
        } catch (e) {
            console.warn('Could not persist store:', e);
        }
        if (!localStorage.getItem('devs_user')) return;

        const payload = {};
        const destructiveKeys = ['accounts', 'receivables', 'payables', 'cashBank', 'expenses', 'transactions'];
        const safeKeys        = ['settings'];

        destructiveKeys.forEach(key => {
            if (Array.isArray(store[key]) && store[key].length > 0) {
                payload[key] = store[key];
            }
        });
        safeKeys.forEach(key => {
            if (store[key] !== undefined && store[key] !== null) {
                payload[key] = store[key];
            }
        });

        if (Object.keys(payload).length === 0) return;

        void apiRequest('state', {
            method: 'POST',
            body: JSON.stringify({ state: payload })
        }).catch((err) => { console.warn('State sync failed:', err); });
    }

    const canManageRecords = () => {
        const role = String(activeUser?.role || '').toLowerCase();
        const position = String(activeUser?.position || '').toLowerCase();
        return position === 'admin' || role === 'administrator' || role.includes('finance admin') || role.includes('finance manager');
    };

    const canExportRecords = () => {
        const role = String(activeUser?.role || '').toLowerCase();
        const position = String(activeUser?.position || '').toLowerCase();
        return position === 'admin' || role === 'administrator' || role.includes('finance admin') || role.includes('finance manager');
    };

    const canViewAudit = () => {
        const role = String(activeUser?.role || '').toLowerCase();
        return role === 'administrator' || role.includes('hr admin') || role.includes('hr manager');
    };

    // ============================================================
    // PAGE ACCESS CONTROL — restrictions are managed by HR
    // Finance users only *read* their own access here.
    // ============================================================
    let pageAccessCache = null;

    async function loadPageAccess() {
        try {
            const result = await apiRequest('access.get');
            pageAccessCache = result.access || {};
        } catch {
            // If HR hasn't set anything or the endpoint fails, allow everything
            pageAccessCache = null;
        }
    }

    function canAccessPage(pageKey) {
        // HR admins always bypass (mirrors the HR dashboard behaviour)
        if (isHrAdmin()) return true;
        if (!pageAccessCache) return true;
        if (!(pageKey in pageAccessCache)) return true;
        return pageAccessCache[pageKey] === true;
    }

    function applySidebarRestrictions() {
        // All nav items stay visible — restrictions are enforced via pop-up when clicked.
        $$('.nav-item[data-page]').forEach(item => {
            item.style.display = '';
        });
    }

    const isHrAdmin = () => ['Administrator', 'HR Manager', 'HR Admin'].includes(activeUser?.role)
        || String(activeUser?.position || '').toLowerCase() === 'admin'
            && String(activeUser?.department || '').toLowerCase() === 'hr';

    function attachExportHandlers() {
        const allowed = canExportRecords();
        $$('[data-export]').forEach(button => {
            if (!allowed) {
                button.style.display = 'none';
                return;
            }
            button.addEventListener('click', () => downloadExport(button.dataset.export, button));
        });
    }

    async function downloadExport(entity, button) {
        if (!canExportRecords()) {
            toast('Your role cannot export records.', 'error');
            return;
        }
        if (!lockElement(button, 600)) return;
        try {
            const response = await fetch(`${API_URL}?action=export&entity=${encodeURIComponent(entity)}`, { credentials: 'same-origin' });
            if (!response.ok) throw new Error('Export could not be generated.');
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${entity}-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(link.href), 100);
            toast('CSV export downloaded.');
        } catch (error) {
            toast(error.message, 'error');
        }
    }

    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

    /* ============================================================
       SEARCHABLE SELECTS — opt-in upgrade for <select> in modals.
       ============================================================ */
    function buildSearchableSelect(select) {
        if (select.dataset.ssUpgraded === 'true') return;
        if (select.dataset.noSearch === 'true') return;

        if (select.closest('.toolbar, .fin-filters-card, .expense-records-card')) return;
        if (!select.closest('.modal-body, .modal-split-right')) return;

        const options = Array.from(select.options);
        if (!options.length) return;

        select.dataset.ssUpgraded = 'true';

        let next = select.nextElementSibling;
        while (next && next.classList.contains('ss-wrap')) {
            const stale = next;
            next = next.nextElementSibling;
            stale.remove();
        }

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
                item.addEventListener('click', () => {
                    if (opt.disabled) return;
                    commit(opt.value);
                });
                list.appendChild(item);
                visible++;
            });
            empty.hidden = visible !== 0;
        };

        const filter = (q) => {
            const term = String(q || '').trim().toLowerCase();
            if (!term) {
                filtered = options.slice();
            } else {
                filtered = options.filter(o =>
                    o.textContent.toLowerCase().includes(term) ||
                    String(o.value).toLowerCase().includes(term)
                );
            }
            renderList();
        };
        const open = () => {
            if (!panel.hidden) return;
            $$('.ss-panel:not([hidden])').forEach(p => {
                if (p !== panel) { p.hidden = true; p.previousElementSibling?.setAttribute('aria-expanded', 'false'); }
            });
            panel.hidden = false;
            trigger.setAttribute('aria-expanded', 'true');
            searchInput.value = '';
            filter('');
            requestAnimationFrame(() => {
                searchInput.focus();
                const modalScroller = wrap.closest('.modal-split-right, .modal-body');
                if (!modalScroller) return;
                const scrollerRect = modalScroller.getBoundingClientRect();
                const panelRect = panel.getBoundingClientRect();
                if (panelRect.bottom > scrollerRect.bottom - 12) {
                    const overflow = panelRect.bottom - scrollerRect.bottom + 12;
                    modalScroller.scrollBy({ top: overflow, behavior: 'smooth' });
                }
                if (panelRect.top < scrollerRect.top + 12) {
                    const overflow = scrollerRect.top + 12 - panelRect.top;
                    modalScroller.scrollBy({ top: -overflow, behavior: 'smooth' });
                }
            });
        };
        const close = () => {
            if (panel.hidden) return;
            panel.hidden = true;
            trigger.setAttribute('aria-expanded', 'false');
        };

        const commit = (value) => {
            select.value = value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            renderTrigger();
            close();
            trigger.focus();
        };

        let readyForClicks = false;
        requestAnimationFrame(() => requestAnimationFrame(() => { readyForClicks = true; }));

        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!readyForClicks) return;
            if (panel.hidden) open(); else close();
        });

        searchInput.addEventListener('input', () => filter(searchInput.value));
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') { e.preventDefault(); close(); trigger.focus(); }
            if (e.key === 'Enter') {
                e.preventDefault();
                const first = list.querySelector('.ss-option:not(.is-disabled)');
                if (first) commit(first.dataset.value);
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const focusables = Array.from(list.querySelectorAll('.ss-option:not(.is-disabled)'));
                const idx = focusables.findIndex(el => el.classList.contains('is-focused'));
                const next = focusables[Math.min(idx + 1, focusables.length - 1)] || focusables[0];
                focusables.forEach(el => el.classList.remove('is-focused'));
                if (next) { next.classList.add('is-focused'); next.scrollIntoView({ block: 'nearest' }); }
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                const focusables = Array.from(list.querySelectorAll('.ss-option:not(.is-disabled)'));
                const idx = focusables.findIndex(el => el.classList.contains('is-focused'));
                const prev = focusables[Math.max(idx - 1, 0)] || focusables[0];
                focusables.forEach(el => el.classList.remove('is-focused'));
                if (prev) { prev.classList.add('is-focused'); prev.scrollIntoView({ block: 'nearest' }); }
            }
        });

        const outsideHandler = (e) => {
            if (panel.hidden) return;
            if (!wrap.contains(e.target)) close();
        };
        document.addEventListener('pointerdown', outsideHandler);

        const cleanupObserver = new MutationObserver(() => {
            if (!document.body.contains(wrap)) {
                document.removeEventListener('pointerdown', outsideHandler);
                cleanupObserver.disconnect();
            }
        });
        cleanupObserver.observe(document.body, { childList: true, subtree: true });

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
        if (root.querySelectorAll) {
            root.querySelectorAll('select').forEach(buildSearchableSelect);
        }
    }
    const ssObserver = new MutationObserver((mutations) => {
        mutations.forEach(m => {
            m.addedNodes.forEach(node => {
                if (node.nodeType !== 1) return;
                if (node.matches?.('.modal-body, .modal-split-right')) {
                    upgradeSelectsIn(node);
                } else if (node.querySelector) {
                    node.querySelectorAll('.modal-body, .modal-split-right').forEach(modalRoot => {
                        upgradeSelectsIn(modalRoot);
                    });
                }
            });
        });
    });
    ssObserver.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        const input = event.target.closest('input.picker-input')
            || event.target.closest('.form-field')?.querySelector('input.picker-input');
        if (!input || typeof input.showPicker !== 'function') return;
        if (event.target === input) {
            const rect = input.getBoundingClientRect();
            const clickedX = event.clientX - rect.left;
            if (clickedX >= input.clientWidth - 40) return;
        }
        event.preventDefault();
        input.focus();
        try { input.showPicker(); } catch {}
    });

    document.addEventListener('click', (event) => {
        const wrap = event.target.closest('.toolbar .search-wrap, .fin-filters-card .search-wrap');
        if (!wrap) return;
        const input = wrap.querySelector('input');
        if (!input) return;
        const rect = wrap.getBoundingClientRect();
        const clickedX = event.clientX - rect.left;
        if (clickedX <= 36) {
            input.focus();
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
    });

    const initials = (name) =>
        String(name || '').split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '??';

    const peso = (n) =>
        '₱' + Number(n || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 });

    const escapeHtml = (str) =>
        String(str ?? '').replace(/[&<>"']/g, (c) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));

    const nextId = (prefix, list, pad = 3) => {
        const max = list.reduce((m, item) => {
            const n = parseInt(String(item.id).split('-')[1], 10);
            return isNaN(n) ? m : Math.max(m, n);
        }, 0);
        return `${prefix}-${String(max + 1).padStart(pad, '0')}`;
    };

    const throttle = (fn, wait = 250) => {
        let last = 0;
        let timer = null;
        return function (...args) {
            const context = this;
            const now = Date.now();
            const remaining = wait - (now - last);
            if (remaining <= 0) {
                clearTimeout(timer);
                timer = null;
                last = now;
                fn.apply(context, args);
            } else if (!timer) {
                timer = setTimeout(() => {
                    last = Date.now();
                    timer = null;
                    fn.apply(context, args);
                }, remaining);
            }
        };
    };

    const lockElement = (element, delay = 350) => {
        if (!element) return false;
        if (element.dataset.uiLocked === 'true') return false;
        element.dataset.uiLocked = 'true';
        if (typeof element.disabled !== 'undefined') element.disabled = true;
        setTimeout(() => {
            delete element.dataset.uiLocked;
            if (typeof element.disabled !== 'undefined') element.disabled = false;
        }, delay);
        return true;
    };

    const pillClass = (status) => {
        const s = String(status).toLowerCase();
        if (['active', 'present', 'approved', 'processed', 'posted', 'paid', 'ready', 'credit', 'completed'].includes(s)) return 'success';
        if (['pending', 'late', 'review', 'for review', 'due', 'on hold', 'debit'].includes(s)) return 'warning';
        if (['open', 'on leave', 'scheduled'].includes(s)) return 'info';
        if (['overdue', 'rejected', 'terminated', 'failed'].includes(s)) return 'danger';
        return 'neutral';
    };

    const toastStack = $('#toastStack');
    function toast(message, type = 'success') {
        while (toastStack.children.length >= 5) {
            toastStack.removeChild(toastStack.firstChild);
        }
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

    let modalOnCancel = null;
    let modalOnSubmit = null;
    let modalExtraClick = null;

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
    }

    function closeModal() {
        modalBackdrop.classList.remove('open');
        modalBackdrop.setAttribute('aria-hidden', 'true');
        const modalEl = $('#modal');
        if (modalEl) {
            modalEl.classList.remove('modal-split', 'signup-modal');
            modalEl.setAttribute('aria-hidden', 'true');
        }
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
    modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalBackdrop.classList.contains('open')) closeModal();
    });

    function confirmDialog({ title, message, confirmLabel = 'Confirm', danger = false }) {
        return new Promise((resolve) => {
            let settled = false;
            const finish = (value) => {
                if (settled) return;
                settled = true;
                closeModal();
                resolve(value);
            };
            openModal({
                title,
                size: 'sm',
                onCancel: () => finish(false),
                onExtraClick: (e) => {
                    const btn = e.target.closest('[data-act]');
                    if (!btn) return false;
                    if (btn.dataset.act === 'confirm') {
                        finish(true);
                        return true;
                    }
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

    const pageSubtitle = $('#pageSubtitle');
    const dashboardPanel = $('#dashboardPanel');

    function buildPaymentManagement() {
        const rows = store.payables || [];

        const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
        const pending = rows.filter(r => r.status === 'For review' || r.status === 'Due').reduce((s, r) => s + Number(r.amount || 0), 0);
        const completed = rows.filter(r => r.status === 'Paid' || r.status === 'Approved').reduce((s, r) => s + Number(r.amount || 0), 0);
        const failed = Math.max(0, total - pending - completed);

        const payStats = [
            ['Total Payments', total, '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h10M7 13h6"/></svg>'],
            ['Pending', pending, '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/></svg>'],
            ['Completed', completed, '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>'],
            ['Failed', failed, '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/></svg>']
        ];

        const summaryRows = [
            ['Supplier Payment', rows.reduce((s, r) => s + Number(r.amount || 0), 0)],
            ['Customer Collection', (store.receivables || []).filter(r => r.status === 'Paid').reduce((s, r) => s + Number(r.amount || 0), 0)],
            ['Expenses', (store.expenses || []).reduce((s, r) => s + Number(r.amount || 0), 0)],
            ['Payroll', 0]
        ];

        const methodsRows = [
            ['Bank Transfer', 350000],
            ['Cash', 75000],
            ['Check', 50000],
            ['E-Wallet', 25000]
        ];

        return `
            <div class="expense-toolbar-simple" style="justify-content:flex-end;align-items:center;margin-bottom:14px;gap:10px;">
                ${canManageRecords() ? '<button class="btn btn-primary btn-sm" type="button" id="addPayBtn">+ Record Payment</button>' : ''}
            </div>

            <div class="payables-stat-grid">
                ${payStats.map((stat, index) => `
                    <div class="fin-stat-card payables-stat-card ${index === 0 ? 'fin-stat-card-highlight' : ''}">
                        <div class="fin-stat-head">
                            <span class="fin-stat-icon">${stat[2]}</span>
                            <span class="fin-stat-label">${stat[0]}</span>
                        </div>
                        <div class="fin-stat-value">${peso(stat[1])}</div>
                    </div>
                `).join('')}
            </div>

            <div class="payment-summary-grid">
                <section class="card payment-summary-card">
                    <div class="card-header"><h3>Payment Summary</h3></div>
                    <div class="summary-text-list">
                        ${summaryRows.map(([label, amt]) => `
                            <div><span>${label}</span><strong>${peso(amt)}</strong></div>
                        `).join('')}
                    </div>
                </section>

                                <section class="card payment-summary-card">
                    <div class="card-header"><h3>Payment Methods</h3></div>
                    <div class="summary-text-list">
                        ${methodsRows.map(([label, amt]) => `
                            <div><span>${label}</span><strong>${peso(amt)}</strong></div>
                        `).join('')}
                    </div>
                </section>
            </div>

            <section class="fin-report-card" style="margin-top:22px;">
                <div class="fin-report-head">
                    <span class="fin-report-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h10M7 13h6"/></svg>
                    </span>
                    <div class="fin-report-head-text">
                        <h3>Payment Records</h3>
                        <p class="fin-report-sub">Source: Payables + AP · All recorded payments</p>
                    </div>
                    <div class="fin-report-search">
                        <input type="search" id="pmSearch" placeholder="Search preview…" />
                    </div>
                </div>
                <div class="fin-report-preview">
                    <table class="fin-preview-table">
                        <thead>
                            <tr>
                                <th>Payment</th>
                                <th>Date</th>
                                <th>Reference</th>
                                <th>Payee / Payer</th>
                                <th>Type</th>
                                <th>Amount</th>
                                <th>Method</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody id="pmTbody"></tbody>
                    </table>
                </div>
                <div class="fin-report-foot">
                    ${canExportRecords() ? `
                        <button class="fin-btn-export-row" type="button" data-export="payables">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 3v12M8 11l4 4 4-4M3 21h18"/>
                            </svg>
                            Export CSV
                        </button>
                    ` : ''}
                </div>
            </section>
        `;
    }

    function openPaymentForm(prefill = null) {
        const today = todayDateString();

        const accounts = ['BDO Operating', 'BPI Payroll', 'Petty Cash', 'Cash on Hand'];
        const methods  = ['Cash', 'Bank Transfer', 'Check', 'E-Wallet'];
        const types    = ['Supplier', 'Customer', 'Expense', 'Payroll'];

        const payload = prefill || {
            payee: 'ABC Supplies',
            date: today,
            type: 'Supplier',
            reference: 'AP-001',
            amount: 20000,
            method: '',
            account: ''
        };

        modalTitle.textContent = 'Record Payment';
        modalBody.innerHTML = `
            <form id="payForm" novalidate>
                <div class="payment-sheet-head">
                    <h2>Record Payment</h2>
                </div>

                <div class="payment-sheet-body">
                    <p class="payment-sheet-payee">${escapeHtml(payload.payee)}</p>

                    <div class="payment-sheet-row">
                        <span class="k">Payment Date:</span>
                        <input class="payment-sheet-select" type="date" name="date"
                               value="${escapeHtml(payload.date)}" required />
                    </div>

                    <div class="payment-sheet-row">
                        <span class="k">Payment Type:</span>
                        <select class="payment-sheet-select" name="type">
                            ${types.map(t => `<option ${t === payload.type ? 'selected' : ''}>${t}</option>`).join('')}
                        </select>
                    </div>

                    <div class="payment-sheet-row">
                        <span class="k">Reference No.:</span>
                        <input class="payment-sheet-select" type="text" name="reference"
                               value="${escapeHtml(payload.reference)}" />
                    </div>

                    <hr class="payment-sheet-sep" />

                    <div class="payment-sheet-row">
                        <span class="k">Amount:</span>
                        <input class="payment-sheet-select" type="number" name="amount" min="0" step="100"
                               value="${Number(payload.amount)}" required />
                    </div>

                    <div class="payment-sheet-row">
                        <span class="k">Payment Method:</span>
                        <select class="payment-sheet-select" name="method" required>
                            <option value="">Select Method</option>
                            ${methods.map(m => `<option ${m === payload.method ? 'selected' : ''}>${m}</option>`).join('')}
                        </select>
                    </div>

                    <div class="payment-sheet-row">
                        <span class="k">Account:</span>
                        <select class="payment-sheet-select" name="account" required>
                            <option value="">Select Account</option>
                            ${accounts.map(a => `<option ${a === payload.account ? 'selected' : ''}>${a}</option>`).join('')}
                        </select>
                    </div>

                    <label class="payment-sheet-label">Proof / Receipt</label>
                    <label class="payment-sheet-upload" for="pay-attachment">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 16V4m0 0-4 4m4-4 4 4"/>
                            <path d="M20 16v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3"/>
                        </svg>
                        <strong>Click to upload drag and drop</strong>
                        <small>(PDF, JPG, PNG - up to 5MB)</small>
                        <input type="file" id="pay-attachment" name="attachment"
                               accept="application/pdf,image/png,image/jpeg" />
                        <span class="upload-file-name" id="pay-attachment-name"></span>
                    </label>
                </div>

                <div class="payment-sheet-actions">
                    <button type="button" class="cancel" data-act="cancel">Cancel</button>
                    <button type="submit" class="save">Save Account</button>
                </div>
            </form>
        `;

        const modalEl = $('#modal');
        modalEl.className = 'modal';
        modalBackdrop.classList.add('open', 'payment-sheet');
        modalBackdrop.setAttribute('aria-hidden', 'false');
        modalEl.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        document.body.classList.add('modal-open');

        const closeSheet = () => {
            modalBackdrop.classList.remove('open', 'payment-sheet');
            modalBackdrop.setAttribute('aria-hidden', 'true');
            modalEl.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
            document.body.classList.remove('modal-open');
            modalBody.innerHTML = '';
        };

        const form = document.getElementById('payForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(form).entries());

            let valid = true;
            const mark = (name, err) => {
                const f = form.querySelector(`[name="${name}"]`);
                if (f) f.classList.toggle('has-error', err);
                if (err) valid = false;
            };
            mark('method', !data.method);
            mark('account', !data.account);
            if (!valid) {
                toast('Please select a payment method and account.', 'error');
                return;
            }

            const newRow = {
                id: nextId('AP', store.payables || []),
                vendor: String(payload.payee || 'Unknown').trim(),
                invoice: String(data.reference || '').trim(),
                invoiceDate: String(data.date || today),
                due: String(data.date || today),
                amount: Number(data.amount || 0),
                status: 'Paid',
                paymentType: data.type,
                paymentMethod: data.method,
                paymentAccount: data.account,
                attachmentName: data.attachment?.name || ''
            };

            store.payables.push(newRow);
            saveStore();
            closeSheet();
            renderPage('paymentManagement');
            toast('Payment recorded.', 'success');
        });

        modalBody.querySelector('[data-act="cancel"]')?.addEventListener('click', closeSheet);

        const fileInput = document.getElementById('pay-attachment');
        const fileNameEl = document.getElementById('pay-attachment-name');
        fileInput?.addEventListener('change', () => {
            const file = fileInput.files?.[0];
            if (fileNameEl) fileNameEl.textContent = file ? `Selected: ${file.name}` : '';
        });
    }

    function renderPaymentRows() {
        const tbody = $('#pmTbody');
        if (!tbody) return;

        const q = ($('#pmSearch')?.value || '').trim().toLowerCase();

        const rows = (store.payables || []).filter(r => {
            return !q || `${r.invoice} ${r.vendor} ${r.id} ${r.status}`.toLowerCase().includes(q);
        });

        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">◌</div><strong>No payment records</strong><p>No payments match the current search.</p></div></td></tr>`;
            return;
        }

        tbody.innerHTML = rows.map(r => `
            <tr data-id="${escapeHtml(r.id)}">
                <td><strong>${escapeHtml(r.id)}</strong></td>
                <td>${escapeHtml(r.invoiceDate || r.due)}</td>
                <td>${escapeHtml(r.invoice || '—')}</td>
                <td>${escapeHtml(r.vendor)}</td>
                <td>${escapeHtml(r.paymentType || 'Supplier')}</td>
                <td>${peso(r.amount)}</td>
                <td>${escapeHtml(r.paymentMethod || '—')}</td>
                <td><span class="pill ${pillClass(r.status)}">${escapeHtml(r.status)}</span></td>
            </tr>
        `).join('');
    }

    function buildFinancialTransactions() {
        const rows = store.transactions || [];

        const incoming = rows.filter(r => r.source === 'Sales');
        const outgoing = rows.filter(r => r.source !== 'Sales');

        const total    = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
        const moneyIn  = incoming.reduce((s, r) => s + Number(r.amount || 0), 0);
        const moneyOut = outgoing.reduce((s, r) => s + Number(r.amount || 0), 0);
        const pending  = rows.filter(r => r.status === 'Pending' || r.status === 'Approved').length;

        const finFlowBars = (items) => {
            const displayItems = items.slice(0, 5);
            const values = displayItems.map(item => Number(item.amount || 0));
            const max = Math.max(...values, 1);
            return displayItems.map((item) => {
                const value = Number(item.amount || 0);
                const widthPercent = Math.max(8, Math.round((value / max) * 100));
                const label = String(item.date || '').slice(5);
                return `<div class="flow-row">
                            <span class="flow-date">${escapeHtml(label)}</span>
                            <div class="flow-track"><i style="width: ${widthPercent}%;"></i></div>
                            <span class="flow-amount">${peso(value)}</span>
                        </div>`;
            }).join('');
        };

        const stats = [
            ['Total Transactions', peso(total),    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h10M7 13h6"/></svg>'],
            ['Money In',           peso(moneyIn),  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 16V8M8.5 11.5 12 8l3.5 3.5"/></svg>'],
            ['Money Out',          peso(moneyOut), '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8.5 12.5 12 16l3.5-3.5"/></svg>'],
            ['Pending',            pending,        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/></svg>']
        ];

        return `
            <div class="section-title">
                <h2>Financial Transaction</h2>
                <span class="hint">Monitor and record all financial activities</span>
            </div>

            <div class="fin-tx-stat-grid">
                ${stats.map((stat, index) => `
                    <div class="fin-stat-card fin-tx-stat ${index === 0 ? 'fin-stat-card-highlight' : ''}">
                        <div class="fin-stat-head">
                            <span class="fin-stat-icon">${stat[2]}</span>
                            <span class="fin-stat-label">${stat[0]}</span>
                        </div>
                        <div class="fin-stat-value">${stat[1]}</div>
                    </div>
                `).join('')}
            </div>

            <div class="cash-lower-grid fin-tx-flow-grid">
                <section class="card money-flow-card money-in-chart">
                    <div class="money-flow-head">
                        <h3>Money In</h3>
                        <span class="money-flow-total">${peso(moneyIn)}</span>
                    </div>
                    <div class="money-flow-rows">
                        ${finFlowBars(incoming) || '<div class="flow-empty">No incoming transactions</div>'}
                    </div>
                </section>
                <section class="card money-flow-card money-out-chart">
                    <div class="money-flow-head">
                        <h3>Money Out</h3>
                        <span class="money-flow-total">${peso(moneyOut)}</span>
                    </div>
                    <div class="money-flow-rows">
                        ${finFlowBars(outgoing) || '<div class="flow-empty">No outgoing transactions</div>'}
                    </div>
                </section>
            </div>

            <div class="card fin-tx-records-card">
                <div class="fin-tx-records-header">
                    <h3>Financial Transaction Record</h3>
                    <div class="fin-tx-records-actions">
                        ${canManageRecords() ? '<button class="btn btn-primary btn-sm" type="button" id="addTxBtn">+ Add Transaction</button>' : ''}
                    </div>
                </div>

                <div class="toolbar fin-tx-toolbar">
                    <div class="search-wrap"><input type="search" id="txSearch" placeholder="Search…" /></div>
                    <select id="txSource">
                        <option value="">Source</option>
                        <option>Procure</option>
                        <option>Sales</option>
                        <option>Finance</option>
                        <option>HR</option>
                    </select>
                    <select id="txType">
                        <option value="">Type</option>
                        <option>Supplier Pay</option>
                        <option>Customer Col</option>
                        <option>Office Supp</option>
                        <option>Payroll</option>
                    </select>
                    <select id="txStatus">
                        <option value="">Status</option>
                        <option>Completed</option>
                        <option>Approved</option>
                        <option>Pending</option>
                        <option>Failed</option>
                    </select>
                    <input class="picker-input" type="date" id="txDate" />
                    <div class="spacer"></div>
                </div>

                <div class="table-wrap">
                    <table class="data-table fin-tx-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Date</th>
                                <th>Reference</th>
                                <th>Source</th>
                                <th>Description</th>
                                <th>Type</th>
                                <th>Amount</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody id="txTbody"></tbody>
                    </table>
                </div>

                <div class="fin-tx-foot">
                    <button class="fin-btn-export-row" type="button" id="txViewDetails">View Details</button>
                    <button class="fin-btn-export-row" type="button" data-export="transactions">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 3v12M8 11l4 4 4-4M3 21h18"/>
                        </svg>
                        Export Report
                    </button>
                </div>
            </div>
        `;
    }
    function renderTransactionRows() {
        const tbody = $('#txTbody');
        if (!tbody) return;

        const q      = ($('#txSearch')?.value || '').trim().toLowerCase();
        const source = $('#txSource')?.value || '';
        const type   = $('#txType')?.value || '';
        const status = $('#txStatus')?.value || '';
        const date   = $('#txDate')?.value || '';

        const rows = (store.transactions || []).filter(r => {
            const matchQ = !q || `${r.id} ${r.reference} ${r.description} ${r.source}`.toLowerCase().includes(q);
            const matchS = !source || r.source === source;
            const matchT = !type   || r.description === type;
            const matchSt = !status || r.status === status;
            const matchD = !date   || r.date === date;
            return matchQ && matchS && matchT && matchSt && matchD;
        });

        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">◌</div><strong>No transactions</strong><p>No records match the current filters.</p></div></td></tr>`;
            return;
        }

        tbody.innerHTML = rows.map(r => {
            const isMoneyIn = String(r.source || '').toLowerCase() === 'sales';
            return `
                <tr data-id="${escapeHtml(r.id)}">
                    <td><strong>${escapeHtml(r.id)}</strong></td>
                    <td>${escapeHtml(String(r.date).slice(5))}</td>
                    <td>${escapeHtml(r.reference)}</td>
                    <td>${escapeHtml(r.source)}</td>
                    <td>${escapeHtml(r.description)}</td>
                    <td><span class="pill ${isMoneyIn ? 'success' : 'warning'}">${isMoneyIn ? 'Money In' : 'Money Out'}</span></td>
                    <td>${peso(r.amount)}</td>
                    <td><span class="pill ${pillClass(r.status)}">${escapeHtml(r.status)}</span></td>
                </tr>
            `;
        }).join('');
    }

    function openTransactionForm() {
        if (!canManageRecords()) {
            toast('Your role cannot add transactions.', 'error');
            return;
        }
        const today = todayDateString();
        const sources = ['Procure', 'Sales', 'Finance', 'HR'];
        const types   = ['Supplier Pay', 'Customer Col', 'Office Supp', 'Payroll'];
        const statuses = ['Completed', 'Approved', 'Pending', 'Failed'];

        openModal({
            title: 'Add Transaction',
            size: 'md',
            onCancel: closeModal,
            onSubmit: (form) => {
                const data = Object.fromEntries(new FormData(form).entries());
                let valid = true;
                const mark = (name, err) => {
                    const f = form.querySelector(`[name="${name}"]`)?.closest('.form-field');
                    if (f) f.classList.toggle('has-error', err);
                    if (err) valid = false;
                };
                mark('reference', !String(data.reference).trim());
                mark('amount', data.amount === '' || Number(data.amount) <= 0);
                if (!valid) return;

                const row = {
                    id: nextId('FT', store.transactions || [], 2),
                    date: data.date || today,
                    reference: String(data.reference).trim(),
                    source: data.source,
                    description: data.description,
                    amount: Number(data.amount),
                    status: data.status
                };
                store.transactions.push(row);
                saveStore();
                closeModal();
                renderPage('financialTransactions');
                toast('Transaction added.', 'success');
            },
            body: `
                <form id="txForm" novalidate>
                    <div class="form-grid">
                        <div class="form-field">
                            <label for="tx-date">Date</label>
                            <input class="picker-input" type="date" id="tx-date" name="date" value="${today}" required />
                        </div>
                        <div class="form-field">
                            <label for="tx-reference">Reference</label>
                            <input type="text" id="tx-reference" name="reference" placeholder="e.g. PAY-002" required />
                            <span class="error-text">Enter a reference.</span>
                        </div>
                        <div class="form-field">
                            <label for="tx-source">Source</label>
                            <select id="tx-source" name="source">
                                ${sources.map(s => `<option>${s}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-field">
                            <label for="tx-description">Type</label>
                            <select id="tx-description" name="description">
                                ${types.map(t => `<option>${t}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-field">
                            <label for="tx-amount">Amount (₱)</label>
                            <input type="number" id="tx-amount" name="amount" min="0" step="100" required />
                            <span class="error-text">Enter a valid amount.</span>
                        </div>
                        <div class="form-field">
                            <label for="tx-status">Status</label>
                            <select id="tx-status" name="status">
                                ${statuses.map(s => `<option>${s}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-subtle" data-act="cancel">Cancel</button>
                        <button type="submit" class="btn btn-primary">Add Transaction</button>
                    </div>
                </form>
            `
        });
    }
    const financePages = {
        dashboard:        { title: 'Finance Dashboard',    subtitle: 'Finance activity snapshot for today.',                build: buildFinanceDashboard },
        chartAccounts:    { title: 'Chart of Accounts',    subtitle: 'Review account codes, types, and balances.',          build: buildChartAccounts },
        payables:         { title: 'Accounts Payable',     subtitle: 'Track vendor bills and upcoming payments.',           build: buildPayables },
        receivables:      { title: 'Accounts Receivable',  subtitle: 'Track customer invoices and outstanding balances.',   build: buildReceivables },
        cashBank:         { title: 'Cash / Bank',          subtitle: 'Monitor cash movements and bank balances.',           build: buildCashBank },
        expenses:         { title: 'Expenses',             subtitle: 'Review operating expenses and approval status.',      build: buildExpenses },
        financialReports: { title: 'Financial Report',     subtitle: 'Compare revenue, expenses, and net position.',        build: buildFinancialReports },
        paymentManagement: { title: 'Payment Management',  subtitle: 'Review and manage outgoing payments.',                 build: buildPaymentManagement },
        financialTransactions: { title: 'Financial Transactions', subtitle: 'Review the latest financial activity.',          build: buildFinancialTransactions },
        bankReconciliation: { title: 'Bank Reconciliation', subtitle: 'Compare book balance against bank statement.',     build: buildBankReconciliationPage },
        auditTrail:       { title: 'Audit Trail',           subtitle: 'Review system activity and user actions.',          build: buildAuditTrail },
        settings:         { title: 'Settings',             subtitle: 'Configure finance preferences.',                       build: buildSettings },
        account:          { title: 'Account Settings',     subtitle: 'Manage your profile and security.',                    build: buildAccount },
        logout:           { title: 'Logout',               subtitle: 'Sign out of your account.',                            build: buildLogout },
        noAccess:         { title: 'No Access',            subtitle: 'Your account has no pages assigned.',                  build: buildNoAccessScreen }
    };

    const pages = financePages;

    let isRendering = false;
    let pendingPage = null;

    function renderPage(page) {
        if (page !== 'logout' && page !== 'account' && !canAccessPage(page)) {
            confirmDialog({
                title: 'Access Denied',
                message: 'Your account does not have permission to access this page. Please contact your HR Administrator.',
                confirmLabel: 'OK',
                danger: true
            });
            if (canAccessPage('dashboard')) {
                page = 'dashboard';
            } else {
                page = 'noAccess';
            }
        }
        const targetPage = pages[page] ? page : 'dashboard';
        if (isRendering) {
            pendingPage = targetPage;
            return;
        }
        isRendering = true;
        requestAnimationFrame(() => {
            try {
                const cfg = pages[targetPage] || pages.dashboard;
                if (pageSubtitle) pageSubtitle.textContent = cfg.subtitle;
                const topbarSection = $('#topbarSection');
                if (topbarSection) topbarSection.textContent = cfg.title;
                dashboardPanel.innerHTML = cfg.build();
                attachPageHandlers(targetPage);
            } finally {
                isRendering = false;
                if (pendingPage && pendingPage !== targetPage) {
                    const nextPage = pendingPage;
                    pendingPage = null;
                    renderPage(nextPage);
                } else {
                    pendingPage = null;
                }
            }
        });
    }

    function markNavActive(page) {
        $$('.nav-item').forEach(link => {
            link.classList.toggle('active', link.dataset.page === page);
        });
    }

    /* -------------------- DASHBOARD -------------------- */

     function buildFinanceDashboard() {
        // --- Real numbers from the store ---
        const revenueTotal = (store.accounts || [])
            .filter(a => a.type === 'Revenue')
            .reduce((sum, a) => sum + Number(a.balance || 0), 0);

        const expensesTotal = (store.expenses || [])
            .reduce((sum, r) => sum + Number(r.amount || 0), 0);

        const payableTotal = (store.payables || [])
            .filter(item => item.status !== 'Paid')
            .reduce((sum, item) => sum + Number(item.amount || 0), 0);

        const receivablesTotal = (store.receivables || [])
            .filter(item => item.status !== 'Paid')
            .reduce((sum, item) => sum + Number(item.amount || 0), 0);

        const cashBalance = (store.cashBank || [])
            .reduce((latest, item) => Math.max(latest, Number(item.balance || 0)), 0);

        const pendingPayment = payableTotal;

        // --- Stat cards (custom PNG icons) ---
        const statCards = [
            {
                label: 'Total Revenue',
                value: peso(revenueTotal),
                icon: `<img src="assets/icon-revenue.png" alt="Revenue" />`
            },
            {
                label: 'Total Expenses',
                value: peso(expensesTotal),
                icon: `<img src="assets/icon-expenses.png" alt="Expenses" />`
            },
            {
                label: 'Total Account Payable',
                value: peso(payableTotal),
                icon: `<img src="assets/icon-payable.png" alt="Payable" />`
            },
            {
                label: 'Total Account Receivable',
                value: peso(receivablesTotal),
                icon: `<img src="assets/icon-receivable.png" alt="Receivable" />`
            }
        ];

        // --- Recent Transactions (latest 7) ---
        // Map raw DB status → one of the three Figma labels:
        //   Completed / Paid / Approved / Posted  → "Paid"       (green)
        //   Pending / Review / Due / Fulfilling   → "Fulfilling" (orange)
        //   Overdue / Failed / Rejected / Late    → "Overdue"    (red)
        const txRows = [...(store.transactions || [])].slice(0, 7).map(t => {
            const raw = String(t.status || '').toLowerCase();
            let label = 'Fulfilling';
            let cls   = 'is-fulfilling';

            if (/completed|paid|approved|posted/.test(raw)) {
                label = 'Paid';
                cls   = 'is-paid';
            } else if (/overdue|failed|reject|late/.test(raw)) {
                label = 'Overdue';
                cls   = 'is-overdue';
            } else if (/pending|review|fulfil|due|process/.test(raw)) {
                label = 'Fulfilling';
                cls   = 'is-fulfilling';
            }

            return `
                <tr>
                    <td>${escapeHtml(t.reference || t.id || '—')}</td>
                    <td>${peso(t.amount)}</td>
                    <td><span class="status-text ${cls}">${label}</span></td>
                </tr>
            `;
        }).join('');

        const txBody = txRows || `
            <tr><td colspan="3" style="text-align:center;color:#888;padding:20px;">
                No transactions recorded yet.
            </td></tr>
        `;

        // --- Financial Summary bars (matches screenshot design) ---
        const chartSource = [...(store.transactions || [])]
            .filter(t => Number(t.amount) > 0)
            .slice(0, 5)
            .reverse();

        const max = Math.max(...chartSource.map(t => Number(t.amount || 0)), 200000);
        const bars = chartSource.map(t => {
            const value = Number(t.amount || 0);
            const heightPct = value > 0 ? Math.max(5, Math.round((value / max) * 100)) : 0;
            let barColor = '#e0a94b';
            const raw = String(t.status || '').toLowerCase();
            if (/completed|paid|approved|posted/.test(raw)) barColor = '#2f9b52';
            else if (/overdue|failed|reject|late/.test(raw)) barColor = '#c2181a';
            let statusKey = 'fulfilling';
            if (/completed|paid|approved|posted/.test(raw)) statusKey = 'paid';
            else if (/overdue|failed|reject|late/.test(raw)) statusKey = 'overdue';

            return `
                <div class="fin-summary-bar-col" data-status="${statusKey}">
                    <div class="fin-summary-bar-value">₱${value.toLocaleString('en-PH')}</div>
                    <div class="fin-summary-bar-fill" style="height:${heightPct}%;background:${barColor};"></div>
                    <div class="fin-summary-bar-label">${escapeHtml(t.reference || t.id || '')}</div>
                </div>
            `;
        }).join('');

        const totalInvoices = (store.transactions || []).length;
        const totalAmount = (store.transactions || []).reduce((s, t) => s + Number(t.amount || 0), 0);
        const pendingCount = (store.transactions || []).filter(t => /pending|review|due/i.test(t.status)).length;

        return `
            <!-- Search + Filter row -->
            <div class="dash-search-row">
                <form class="dash-search" onsubmit="return false;">
                    <input type="search" placeholder="Search..." id="dashSearch" />
                    <button type="submit">Search</button>
                </form>
                <button class="dash-filter-btn" type="button" id="dashFilterBtn">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h18M6 12h12M10 19h4"/></svg>
                    Filter
                </button>
            </div>

            <!-- Stat cards row 1 -->
            <div class="fin-stat-grid">
                ${statCards.map(card => `
                    <div class="fin-stat-card">
                        <div class="fin-stat-head">
                            <span class="fin-stat-icon">${card.icon}</span>
                            <span class="fin-stat-label">${card.label}</span>
                        </div>
                        <div class="fin-stat-value is-dark">${card.value}</div>
                        </span>
                    </div>
                `).join('')}
            </div>

            <!-- Stat cards row 2 -->
            <div class="fin-stat-grid-secondary">
                <div class="fin-stat-card">
                    <div class="fin-stat-head">
                        <span class="fin-stat-icon">
                            <img src="assets/icon-cashbank.png" alt="Cash/Bank" />
                        </span>
                        <span class="fin-stat-label">Cash/Bank Balance</span>
                    </div>
                    <div class="fin-stat-value is-dark">${peso(cashBalance)}</div>
                </div>

                <div class="fin-stat-card is-pending">
                    <div class="fin-stat-head">
                        <span class="fin-stat-icon">
                            <img src="assets/icon-expenses.png" alt="Pending" />
                        </span>
                        <span class="fin-stat-label">Pending Payment</span>
                    </div>
                    <div class="fin-stat-value">${peso(pendingPayment)}</div>
                </div>
            </div>

            <!-- Recent Transaction -->
            <section class="dash-card">
                <h3 class="dash-card-title">Recent Transaction</h3>
                <table class="dash-table">
                    <thead>
                        <tr>
                            <th>Invoice</th>
                            <th>Amount</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>${txBody}</tbody>
                </table>
            </section>

            <!-- Financial Summary -->
            <section class="fin-summary-panel">
                <header class="fin-summary-header">
                    <div class="fin-summary-title">
                        <div class="fin-summary-icon">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>
                        </div>
                        <div>
                            <h3>Financial Summary</h3>
                            <p>Overview of your transactions and total amount per invoice with status.</p>
                        </div>
                    </div>
                    <div class="fin-summary-filters" id="finSummaryFilters">
                        <button type="button" class="is-active" data-status="all">All</button>
                        <button type="button" data-status="paid"><span class="dot dot-paid"></span>Paid</button>
                        <button type="button" data-status="fulfilling"><span class="dot dot-fulfilling"></span>Fulfilling</button>
                        <button type="button" data-status="overdue"><span class="dot dot-overdue"></span>Overdue</button>
                    </div>
                </header>

                <div class="fin-summary-chart-wrap">
                    <div class="fin-summary-y-axis">
                        <span>₱200,000</span>
                        <span>₱150,000</span>
                        <span>₱100,000</span>
                        <span>₱50,000</span>
                        <span>₱0</span>
                    </div>
                    <div class="fin-summary-chart">
                        <div class="fin-summary-grid-lines">
                            <div></div><div></div><div></div><div></div><div></div>
                        </div>
                        <div class="fin-summary-bars">${bars || ''}</div>
                    </div>
                </div>
                <div class="fin-summary-x-axis">Invoice</div>

                <footer class="fin-summary-footer">
                    <div class="fin-summary-stat">
                        <div class="fin-summary-stat-icon">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
                        </div>
                        <div>
                            <span>Total Invoices</span>
                            <strong>${totalInvoices}</strong>
                        </div>
                    </div>
                    <div class="fin-summary-stat">
                        <div class="fin-summary-stat-icon">₱</div>
                        <div>
                            <span>Total Amount</span>
                            <strong>₱${totalAmount.toLocaleString('en-PH')}</strong>
                        </div>
                    </div>
                    <div class="fin-summary-stat">
                        <div class="fin-summary-stat-icon">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/></svg>
                        </div>
                        <div>
                            <span>Pending / Unpaid</span>
                            <strong>${pendingCount}</strong>
                        </div>
                    </div>
                </footer>
            </section>
        `;
    }

    /* -------------------- CHART OF ACCOUNTS -------------------- */

    function buildChartAccounts() {
        // Reset to page 1 every time the page is (re)built
        coaCurrentPage = 1;

        return `
            <!-- Search + Export row (like the mock) -->
            <div class="coa-toolbar-row">
                <form class="coa-search" onsubmit="return false;">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                    <input type="search" placeholder="Search..." id="accSearch" />
                    <button type="submit">Search</button>
                </form>
                ${canExportRecords() ? `
                    <button class="coa-export-btn" type="button" id="exportAccountsPdf">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <path d="M14 2v6h6"/>
                            <path d="M9 13h6M9 17h6"/>
                        </svg>
                        Export PDF / Excel
                    </button>
                ` : ''}
            </div>

            <!-- ACCOUNT LIST card -->
            <section class="coa-card">
                <header class="coa-card-head">
                    <h3 class="coa-card-title">ACCOUNT LIST</h3>
                    <button class="coa-filter-btn" type="button" id="accFilterBtn">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h18M6 12h12M10 19h4"/></svg>
                        FILTER
                    </button>
                    <div class="coa-card-spacer"></div>
                    ${canManageRecords() ? '<button class="coa-add-btn" type="button" id="addAccountBtn">+ Add Account</button>' : ''}
                </header>

                <div class="coa-table-wrap">
                    <table class="coa-table">
                        <thead>
                            <tr>
                                <th>Account Card</th>
                                <th>Account Name</th>
                                <th>Account Type</th>
                                <th>Normal Balance</th>
                                <th>Active</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody id="accTbody"></tbody>
                    </table>
                </div>

                <footer class="coa-pagination" id="coaPagination"></footer>
            </section>
        `;
    }

    function renderAccountRows() {
        const tbody = $('#accTbody');
        if (!tbody) return;

        const q = ($('#accSearch')?.value || '').trim().toLowerCase();
        const allRows = (store.accounts || []).filter(a => {
            return !q || `${a.code} ${a.name} ${a.type}`.toLowerCase().includes(q);
        });

        // ---- Pagination math ----
        // Always show at least 5 page buttons, even if there are fewer pages of data.
        const realPageCount = Math.ceil(allRows.length / COA_ROWS_PER_PAGE);
        const totalPages    = Math.max(5, realPageCount);
        if (coaCurrentPage > totalPages) coaCurrentPage = totalPages;
        if (coaCurrentPage < 1)          coaCurrentPage = 1;

        const startIdx = (coaCurrentPage - 1) * COA_ROWS_PER_PAGE;
        const pageRows = allRows.slice(startIdx, startIdx + COA_ROWS_PER_PAGE);

        // ---- Render table body ----
        if (!pageRows.length) {
            tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">◌</div><strong>This table is empty</strong><p>No accounts on this page.</p></div></td></tr>`;
        } else {
            tbody.innerHTML = pageRows.map(a => {
                const normalBalance = a.normalBalance || (['Liability', 'Equity', 'Revenue'].includes(a.type) ? 'Credit' : 'Debit');
                const isActive = String(a.status || 'Active').toLowerCase() === 'active';
                return `
                    <tr data-code="${escapeHtml(a.code)}">
                        <td>${escapeHtml(a.code)}</td>
                        <td>${escapeHtml(a.name)}</td>
                        <td>${escapeHtml(a.type)}</td>
                        <td>${escapeHtml(normalBalance)}</td>
                        <td><span class="coa-active">${isActive ? 'Active' : 'Inactive'}</span></td>
                        <td>
                            <button class="coa-view-btn" type="button" data-act="viewAcc" data-code="${escapeHtml(a.code)}">
                                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>
                                View
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // ---- Render pagination buttons ----
        renderCoaPagination(totalPages);
    }

    function renderCoaPagination(totalPages) {
        const wrap = $('#coaPagination');
        if (!wrap) return;

        // Always show 5 numbered buttons in a sliding window
        const MAX_VISIBLE = 5;
        let startPage = Math.max(1, coaCurrentPage - Math.floor(MAX_VISIBLE / 2));
        let endPage   = startPage + MAX_VISIBLE - 1;
        if (endPage > totalPages) {
            endPage   = totalPages;
            startPage = Math.max(1, endPage - MAX_VISIBLE + 1);
        }

        const numbers = [];
        for (let p = startPage; p <= endPage; p++) numbers.push(p);

        // Prev/Next are only disabled at the true edges of the 5-button window
        const atFirst = coaCurrentPage <= 1;
        const atLast  = coaCurrentPage >= totalPages;

        wrap.innerHTML = `
            <button type="button" class="coa-page-btn" data-page="prev" aria-label="Previous page" ${atFirst ? 'disabled' : ''}>‹</button>
            ${numbers.map(p => `
                <button type="button" class="coa-page-btn ${p === coaCurrentPage ? 'is-active' : ''}" data-page="${p}">${p}</button>
            `).join('')}
            <button type="button" class="coa-page-btn" data-page="next" aria-label="Next page" ${atLast ? 'disabled' : ''}>›</button>
        `;
    }

    function expenseForm(exp = null) {
        const isEdit = !!exp;
        const e = exp || {
            voucher: '',
            date: todayDateString(),
            category: '',
            description: '',
            supplier: '',
            paymentMethod: '',
            amount: '',
            reference: '',
            status: 'For review',
            attachmentName: '',
            attachmentData: ''
        };
        const categories = ['Office lease', 'Software subscriptions', 'Travel and representation', 'Utilities', 'Office supplies', 'Professional fees', 'Marketing', 'Other'];
        const methods = ['Cash', 'Bank Transfer', 'Credit Card', 'Cheque', 'GCash', 'Other'];

        if (!isEdit && !e.voucher) {
            const d = new Date();
            const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
            const sameDayCount = (store.expenses || []).filter(x => String(x.voucher || '').startsWith(`EV-${stamp}`)).length + 1;
            e.voucher = `EV-${stamp}-${String(sameDayCount).padStart(3, '0')}`;
        }

        return `
            <form id="expForm" novalidate class="split-form">
                <section class="split-section">
                    <div class="split-section-header">
                        <span class="split-section-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M4 4h12l4 4v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/>
                                <path d="M8 10h8M8 14h8M8 18h5"/>
                            </svg>
                        </span>
                        <h3>Voucher Expenses Details</h3>
                    </div>
                    <div class="split-grid">
                        <div class="split-field">
                            <label for="exp-voucher">Voucher</label>
                            <input type="text" id="exp-voucher" name="voucher" value="${escapeHtml(e.voucher || '')}" readonly />
                        </div>
                        <div class="split-field">
                            <label for="exp-date">Date</label>
                            <input class="picker-input" type="date" id="exp-date" name="date" value="${escapeHtml(e.date)}" required />
                        </div>
                        <div class="split-field">
                            <label for="exp-category">Expense Category</label>
                            <select id="exp-category" name="category">
                                <option value="">Select Category</option>
                                ${categories.map(c => `<option ${c === e.category ? 'selected' : ''}>${c}</option>`).join('')}
                            </select>
                            <span class="error-text">Select a category.</span>
                        </div>
                        <div class="split-field"></div>
                        <div class="split-field full">
                            <label for="exp-description">Description</label>
                            <textarea id="exp-description" name="description" rows="3" placeholder="Enter description of the expenses…">${escapeHtml(e.description || '')}</textarea>
                        </div>
                        <div class="split-field">
                            <label for="exp-supplier">Supplier / Payee Name</label>
                            <input type="text" id="exp-supplier" name="supplier" placeholder="Enter supplier or payee name" value="${escapeHtml(e.supplier || e.vendor || '')}" />
                        </div>
                        <div class="split-field">
                            <label for="exp-method">Payment Method</label>
                            <select id="exp-method" name="paymentMethod">
                                <option value="">Select Methods</option>
                                ${methods.map(m => `<option ${m === e.paymentMethod ? 'selected' : ''}>${m}</option>`).join('')}
                            </select>
                        </div>
                        <div class="split-field">
                            <label for="exp-amount">Amount</label>
                            <div class="split-field-prefixed">
                                <span>₱</span>
                                <input type="number" id="exp-amount" name="amount" min="0" step="100" placeholder="Enter Amount" value="${e.amount}" />
                            </div>
                            <span class="error-text">Enter a valid amount.</span>
                        </div>
                        <div class="split-field">
                            <label for="exp-reference">Reference No. / Invoice No.</label>
                            <input type="text" id="exp-reference" name="reference" placeholder="Enter reference or invoice number" value="${escapeHtml(e.reference || '')}" />
                        </div>
                    </div>
                </section>

                <section class="split-section">
                    <div class="split-section-header">
                        <span class="split-section-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l8.6-8.6a4 4 0 0 1 5.66 5.66l-8.6 8.6a2 2 0 0 1-2.83-2.83l7.78-7.78"/>
                            </svg>
                        </span>
                        <h3>Upload Receipt / Invoice</h3>
                    </div>
                    <div class="split-grid">
                        <div class="split-field full">
                            <label class="upload-box" for="exp-attachment">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M12 16V4m0 0-4 4m4-4 4 4"/>
                                    <path d="M20 16v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3"/>
                                </svg>
                                <strong>Click to upload drag and drop</strong>
                                <small>(PDF, JPG, PNG - up to 5MB)</small>
                                <input type="file" id="exp-attachment" name="attachment" accept="application/pdf,image/png,image/jpeg" />
                                <span class="upload-file-name" id="exp-attachment-name"></span>
                            </label>
                        </div>
                    </div>
                </section>

                <div class="split-actions">
                    <button type="button" class="btn-cancel-pill" data-act="cancel">Cancel</button>
                    <button type="submit" class="btn-save-pill">${isEdit ? 'Save Changes' : 'Save Voucher'}</button>
                </div>
            </form>
        `;
    }

    function accountForm(acc = null) {
        const isEdit = !!acc;
        const a = acc || {
            code: '',
            name: '',
            type: '',
            normalBalance: 'Debit',
            parent: '',
            description: '',
            currency: '',
            balance: '',
            status: 'Active',
            attachmentName: '',
            attachmentData: ''
        };

        const types = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];
        const currencies = ['PHP (₱)', 'USD ($)', 'EUR (€)'];

        return `
            <form id="accForm" novalidate class="acc-form">

                <!-- === Account Information === -->
                <section class="acc-section">
                    <div class="acc-section-head">
                        <span class="acc-section-icon">
                            <img src="assets/bank-account-information.svg" alt="Account Information" />
                        </span>
                        <h3>Account Information</h3>
                    </div>

                    <div class="acc-grid">
                        <div class="acc-field">
                            <label for="ac-code">Account Code <span class="req">*</span></label>
                            <input type="text" id="ac-code" name="code"
                                   value="${escapeHtml(a.code)}"
                                   placeholder="e.g. 1001"
                                   ${isEdit ? 'readonly' : 'required'} />
                            <span class="error-text">Enter a unique account code.</span>
                        </div>

                        <div class="acc-field">
                            <label for="ac-name">Account Name <span class="req">*</span></label>
                            <input type="text" id="ac-name" name="name"
                                   value="${escapeHtml(a.name)}"
                                   placeholder="Enter Account Name" required />
                            <span class="error-text">Enter the account name.</span>
                        </div>

                        <div class="acc-field full">
                            <label for="ac-type">Account Type <span class="req">*</span></label>
                            <select id="ac-type" name="type" required>
                                <option value="" ${!a.type ? 'selected' : ''}>Account Types</option>
                                ${types.map(t => `<option ${t === a.type ? 'selected' : ''}>${t}</option>`).join('')}
                            </select>
                            <span class="error-text">Select an account type.</span>
                        </div>
                    </div>
                </section>

                <!-- === Details === -->
                <section class="acc-section">
                    <div class="acc-section-head">
                        <span class="acc-section-icon">
                            <img src="assets/coin-details.svg" alt="Details" />
                        </span>
                        <h3>Details</h3>
                    </div>

                    <div class="acc-grid">
                        <div class="acc-field">
                            <label for="ac-description">Description</label>
                            <textarea id="ac-description" name="description" rows="4"
                                      placeholder="Enter description (Optional)...">${escapeHtml(a.description || '')}</textarea>
                        </div>

                        <div class="acc-field">
                            <label for="ac-currency">Currency <span class="req">*</span></label>
                            <select id="ac-currency" name="currency" required>
                                <option value="" ${!a.currency ? 'selected' : ''}>Select Currency</option>
                                ${currencies.map(c => `<option ${c === a.currency ? 'selected' : ''}>${c}</option>`).join('')}
                            </select>
                            <span class="error-text">Select a currency.</span>
                        </div>

                        <div class="acc-field full">
                            <label for="ac-balance">Opening Balance</label>
                            <div class="acc-prefixed">
                                <span>₱</span>
                                <input type="number" id="ac-balance" name="balance"
                                       min="0" step="0.01"
                                       placeholder="Enter Amount"
                                       value="${a.balance}" />
                            </div>
                            <span class="error-text">Enter a valid amount.</span>
                        </div>
                    </div>
                </section>

                <div class="acc-actions">
                    <button type="button" class="acc-btn-cancel" data-act="cancel">Cancel</button>
                    ${isEdit ? `<button type="button" class="acc-btn-delete" id="deleteAccountBtn">Delete</button>` : ''}
                    <button type="submit" class="acc-btn-save">${isEdit ? 'Save Changes' : 'Save Account'}</button>
                </div>
            </form>
        `;
    }

    function openAccountForm(acc = null) {
        const isEdit = !!acc;

        /* Open an empty modal shell first (no size → no modal-lg conflict) */
        openModal({
            title: isEdit ? `Edit Account | ${acc.code}` : 'Add Account',
            size: '',
            onCancel: closeModal,
            body: `
                <div class="acc-split">
                    <div class="acc-split-left">
                        <!-- Brand block -->
                        <div class="modal-split-brand">
                            <span class="modal-split-brand-mark" aria-hidden="true">
                                <img src="assets/logo.png" alt="DEV'S logo" />
                            </span>
                            <span class="modal-split-brand-name">
                                <span class="brand-hr">HR</span><span class="brand-fin">Fin</span>
                            </span>
                        </div>

                        <!-- Back link -->
                        <button type="button" class="modal-split-back" data-act="cancel">
                            <span class="modal-split-back-arrow">←</span>
                            <span>${isEdit ? 'Edit Account' : 'Add Account'}</span>
                        </button>

                        <!-- Subtitle -->
                        <p class="modal-split-sub">
                            ${isEdit
                                ? 'Update the account details to keep your financial records accurate.'
                                : 'Create a new account to keep your financial records organized and accurate.'}
                        </p>

                        <!-- Illustration -->
                        <div class="modal-split-art acc-split-art">
                            <svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="40" y="20" width="110" height="150" rx="8"/>
                                <path d="M60 56h70M60 80h70M60 104h46"/>
                                <circle cx="140" cy="156" r="28"/>
                                <path d="M140 142v28M126 156h28"/>
                            </svg>
                        </div>
                    </div>
                    <div class="acc-split-right">
                        ${accountForm(acc)}
                    </div>
                </div>
            `
        });

        /* Shrink the modal shell so it fits the two-column layout nicely */
        const modalEl = document.getElementById('modal');
        if (modalEl) {
            modalEl.classList.add('modal-split');
            modalEl.classList.remove('modal-lg', 'modal-md', 'modal-sm');
        }

        wireAccountSubmit();
        document.getElementById('deleteAccountBtn')?.addEventListener('click', async () => {
            const ok = await deleteAccountRecord(acc);
            if (ok) {
                closeModal();
                renderAccountRows();
            }
        });
    }

    function openAccountView(acc) {
        openModal({
            title: `View Account | ${acc.code}`,
            size: 'md',
            onCancel: closeModal,
            body: `
                <div class="account-view-sheet">
                    <div class="account-view-header"><img src="assets/logo.png" alt="HRFin logo" /><div><strong>${escapeHtml(acc.name)}</strong><span>Account ${escapeHtml(acc.code)}</span></div></div>
                    <div class="account-view-grid">
                        <div><span>Account Type</span><strong>${escapeHtml(acc.type)}</strong></div>
                        <div><span>Normal Balance</span><strong>${escapeHtml(acc.normalBalance || (['Liability', 'Equity', 'Revenue'].includes(acc.type) ? 'Credit' : 'Debit'))}</strong></div>
                        <div><span>Balance</span><strong>${peso(acc.balance)}</strong></div>
                        <div><span>Status</span><strong>${escapeHtml(acc.status || 'Active')}</strong></div>
                    </div>
                    ${acc.description ? `<p class="account-view-description">${escapeHtml(acc.description)}</p>` : ''}
                    <div class="form-actions account-view-actions"><button type="button" class="btn btn-subtle" data-act="cancel">Close</button><button type="button" class="btn btn-primary" id="accountPdfBtn">Export PDF</button></div>
                </div>
            `
        });
        document.getElementById('accountPdfBtn')?.addEventListener('click', () => printAccountPdf(acc));
    }

    function printAccountPdf(acc) {
        const normalBalance = acc.normalBalance || (['Liability', 'Equity', 'Revenue'].includes(acc.type) ? 'Credit' : 'Debit');
        const printWindow = window.open('', '_blank', 'width=820,height=900');
        if (!printWindow) {
            toast('Allow pop-ups to export the PDF.', 'error');
            return;
        }
        printWindow.document.write(`<!doctype html><html><head><title>Account ${escapeHtml(acc.code)}</title><style>
            *{box-sizing:border-box}body{margin:0;padding:42px;font-family:Arial,sans-serif;color:#171717}header{display:flex;align-items:center;gap:14px;border-bottom:2px solid #b51f24;padding-bottom:18px}header img{width:48px;height:48px;object-fit:contain}h1{margin:0;font-size:24px}header span{display:block;color:#666;font-size:12px;margin-top:4px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:28px}.field{padding:14px;border:1px solid #ddd;border-radius:8px}.field span{display:block;color:#666;font-size:12px;margin-bottom:6px}.field strong{font-size:16px}.description{margin-top:18px;padding:14px;background:#f5f5f5;border-radius:8px}footer{margin-top:34px;color:#777;font-size:11px}@media print{body{padding:24px}}
        </style></head><body><header><img src="assets/logo.png" alt="HRFin logo"><div><h1>${escapeHtml(acc.name)}</h1><span>Account ${escapeHtml(acc.code)} | D.E.V.S Finance</span></div></header><div class="grid"><div class="field"><span>Account Type</span><strong>${escapeHtml(acc.type)}</strong></div><div class="field"><span>Normal Balance</span><strong>${escapeHtml(normalBalance)}</strong></div><div class="field"><span>Balance</span><strong>${peso(acc.balance)}</strong></div><div class="field"><span>Status</span><strong>${escapeHtml(acc.status || 'Active')}</strong></div></div>${acc.description ? `<div class="description">${escapeHtml(acc.description)}</div>` : ''}<footer>Generated from D.E.V.S Finance</footer></body></html>`);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 150);
    }

    function printAccountsPdf(accounts) {
        const printWindow = window.open('', '_blank', 'width=1000,height=900');
        if (!printWindow) {
            toast('Allow pop-ups to export the PDF.', 'error');
            return;
        }
        const rows = accounts.map(acc => {
            const normalBalance = acc.normalBalance || (['Liability', 'Equity', 'Revenue'].includes(acc.type) ? 'Credit' : 'Debit');
            return `<tr><td>${escapeHtml(acc.code)}</td><td>${escapeHtml(acc.name)}</td><td>${escapeHtml(acc.type)}</td><td>${escapeHtml(normalBalance)}</td><td>${peso(acc.balance)}</td><td>${escapeHtml(acc.status || 'Active')}</td></tr>`;
        }).join('');
        printWindow.document.write(`<!doctype html><html><head><title>D.E.V.S Finance Accounts</title><style>body{font-family:Arial,sans-serif;color:#171717;padding:32px}h1{font-size:22px;border-bottom:2px solid #b51f24;padding-bottom:14px}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{text-align:left;padding:10px;border:1px solid #ccc;font-size:12px}th{background:#f1dddd}footer{margin-top:22px;color:#777;font-size:11px}</style></head><body><h1>D.E.V.S Finance - Chart of Accounts</h1><table><thead><tr><th>Code</th><th>Account Name</th><th>Type</th><th>Normal Balance</th><th>Balance</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table><footer>Generated from D.E.V.S Finance</footer></body></html>`);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 150);
    }

    function wireAccountSubmit() {
        const form = document.getElementById('accForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const isEdit = form.querySelector('#ac-code').readOnly;
            const data = Object.fromEntries(new FormData(form).entries());

            let valid = true;
            const mark = (id, err) => {
                const f = form.querySelector(`#${id}`)?.closest('.split-field');
                if (f) f.classList.toggle('has-error', err);
                if (err) valid = false;
            };
            mark('ac-code', !isEdit && !String(data.code || '').trim());
            mark('ac-name', !String(data.name || '').trim());
            mark('ac-type', !data.type);
            mark('ac-currency', !data.currency);
            if (!valid) return;

            let attachmentName = '';
            let attachmentData = '';
            const file = document.getElementById('ac-attachment')?.files?.[0];
            if (file) {
                if (file.size > 5 * 1024 * 1024) {
                    toast('Attachment must be 5MB or smaller.', 'error');
                    return;
                }
                attachmentName = file.name;
                attachmentData = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            }

            const code = isEdit
                ? form.querySelector('#ac-code').value
                : String(data.code).trim();

            const existing = (store.accounts || []).find(a => a.code === code);

            // Default the hidden fields:
            //   Normal Balance  → Debit for Asset/Expense, Credit for Liability/Equity/Revenue
            //   Status          → Active (for new) or keep existing (for edit)
            const normalBalance = ['Liability', 'Equity', 'Revenue'].includes(data.type) ? 'Credit' : 'Debit';

            const payload = {
                code,
                name: String(data.name).trim(),
                type: data.type,
                normalBalance,
                parent: data.parent || '',
                description: String(data.description || '').trim(),
                currency: data.currency,
                openingBalance: Number(data.balance || 0),
                balance: Number(data.balance || 0),
                status: existing?.status || 'Active',
                attachmentName: attachmentName || existing?.attachmentName || '',
                attachmentData: attachmentData || existing?.attachmentData || ''
            };

            if (isEdit) {
                if (existing) Object.assign(existing, payload);
                toast('Account updated.');
            } else {
                if (existing) {
                    toast('An account with that code already exists.', 'error');
                    return;
                }
                store.accounts.push(payload);
                toast('Account created.');
            }

            saveStore();
            closeModal();
            renderAccountRows();
        });
    }

    async function handleAccountAction(e) {
        const btn = e.target.closest('button[data-act]');
        if (!btn) return;
        const act = btn.dataset.act;
        const code = btn.dataset.code;
        const acc = (store.accounts || []).find(a => a.code === code);
        if (!acc) return;

        if (act === 'viewAcc') openAccountView(acc);
        if (act === 'editAcc') openAccountForm(acc);
        if (act === 'deleteAcc') await deleteAccountRecord(acc);
    }

    async function deleteAccountRecord(acc) {
        const ok = await confirmDialog({
            title: 'Delete Account',
            message: `Remove account ${acc.code} — ${acc.name}? This cannot be undone.`,
            confirmLabel: 'Delete',
            danger: true
        });
        if (!ok) return false;
        store.accounts = store.accounts.filter(a => a.code !== acc.code);
        saveStore();
        toast('Account removed.', 'info');
        return true;
    }

    /* -------------------- RECEIVABLES -------------------- */

    function buildReceivables() {
        const rows = store.receivables || [];
        const outstanding = rows.filter(row => row.status !== 'Paid').reduce((sum, row) => sum + Number(row.amount || 0), 0);
        const today = new Date();
        const todayKey = todayDateString();
        const weekEnd = new Date(today);
        weekEnd.setDate(today.getDate() + (6 - today.getDay()));
        const weekEndKey = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}-${String(weekEnd.getDate()).padStart(2, '0')}`;
        const dueToday = rows.filter(row => row.due === todayKey).reduce((sum, row) => sum + Number(row.amount || 0), 0);
        const dueThisWeek = rows.filter(row => row.due >= todayKey && row.due <= weekEndKey).reduce((sum, row) => sum + Number(row.amount || 0), 0);
        const overdue = rows.filter(row => row.status === 'Overdue' || (row.status !== 'Paid' && row.due < todayKey)).reduce((sum, row) => sum + Number(row.amount || 0), 0);
        const collected = rows.filter(row => row.status === 'Paid').reduce((sum, row) => sum + Number(row.amount || 0), 0);
        const receivableStats = [
            ['Total Receivables', outstanding, '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h10M7 13h6"/></svg>'],
            ['Due Today', dueToday, '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M8 14h3"/></svg>'],
            ['Due This Week', dueThisWeek, '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 10h18M7 3v4M17 3v4M7 14h3M14 14h3"/></svg>'],
            ['Overdue', overdue, '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/></svg>'],
            ['Collection This Month', collected, '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>']
        ];
        return `
            <div class="section-title"><h2>Accounts Receivable</h2><span class="hint" id="arCount">Outstanding ${peso(outstanding)}</span></div>
            <div class="receivables-stat-grid">${receivableStats.map((stat, index) => `<div class="fin-stat-card receivables-stat-card ${index === 0 ? 'fin-stat-card-highlight' : ''}"><div class="fin-stat-head"><span class="fin-stat-icon">${stat[2]}</span><span class="fin-stat-label">${stat[0]}</span></div><div class="fin-stat-value">${peso(stat[1])}</div></div>`).join('')}</div>
            <div class="card receivables-table-card">
                <div class="toolbar">
                    <div class="search-wrap"><input type="search" placeholder="Search customer or invoice…" id="arSearch" /></div>
                    <select id="arStatus">
                        <option value="">All Status</option>
                        <option>Open</option>
                        <option>Overdue</option>
                        <option>Paid</option>
                    </select>
                    <div class="spacer"></div>
                    <button class="btn btn-preview btn-sm" type="button" data-preview-toggle="receivables" style="color:#c2181a;background:#fff;border:1px solid rgba(194,24,26,0.28);">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>
                        Preview
                    </button>
                    ${canManageRecords() ? '<button class="btn btn-primary btn-sm" type="button" id="addArBtn">+ Add Invoice</button>' : ''}
                </div>
                <div class="table-wrap"><table class="data-table"><thead><tr><th>Invoice No.</th><th>Customer</th><th>Invoice Date</th><th>Due Date</th><th>Amount</th><th>Status</th><th style="text-align:right;">Action</th></tr></thead><tbody id="arTbody"></tbody></table></div>
            </div>
        `;
    }

    function renderReceivableRows() {
        const tbody = $('#arTbody');
        if (!tbody) return;
        const q = ($('#arSearch')?.value || '').trim().toLowerCase();
        const status = $('#arStatus')?.value || '';
        const rows = (store.receivables || []).filter(r => {
            const matchQ = !q || `${r.customer} ${r.invoice} ${r.id}`.toLowerCase().includes(q);
            const matchS = !status || r.status === status;
            return matchQ && matchS;
        });
        const countEl = $('#arCount');
        const outstanding = rows.filter(r => r.status !== 'Paid').reduce((sum, r) => sum + Number(r.amount || 0), 0);
        if (countEl) countEl.textContent = `${rows.length} shown | Outstanding ${peso(outstanding)}`;

        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">✦</div><strong>No receivables</strong><p>No invoices match the current filters.</p></div></td></tr>`;
            return;
        }

        tbody.innerHTML = rows.map(r => `
            <tr data-id="${escapeHtml(r.id)}">
                <td><strong>${escapeHtml(r.invoice)}</strong></td>
                <td>${escapeHtml(r.customer)}</td>
                <td>${escapeHtml(r.invoiceDate || r.due)}</td>
                <td>${escapeHtml(r.due)}</td>
                <td>${peso(r.amount)}</td>
                <td><span class="pill ${pillClass(r.status)}">${escapeHtml(r.status)}</span></td>
                <td>
                    <div class="cell-actions">
                        ${canManageRecords() ? `
                            <button class="btn btn-subtle btn-xs" data-act="editAr" data-id="${escapeHtml(r.id)}">Edit</button>
                            <button class="btn btn-danger btn-xs" data-act="deleteAr" data-id="${escapeHtml(r.id)}">Delete</button>
                        ` : '<span class="cell-sub">Read only</span>'}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function receivableForm(rec = null) {
        const isEdit = !!rec;
        const r = rec || { customer: '', invoice: '', invoiceDate: todayDateString(), due: todayDateString(), amount: '', status: 'Open' };
        return `
            <form id="arForm" novalidate>
                <div class="form-grid">
                    <div class="form-field full">
                        <label for="ar-customer">Customer</label>
                        <input type="text" id="ar-customer" name="customer" value="${escapeHtml(r.customer)}" required />
                        <span class="error-text">Enter the customer name.</span>
                    </div>
                    <div class="form-field">
                        <label for="ar-invoice">Invoice #</label>
                        <input type="text" id="ar-invoice" name="invoice" value="${escapeHtml(r.invoice)}" required />
                        <span class="error-text">Enter an invoice number.</span>
                    </div>
                    <div class="form-field">
                        <label for="ar-due">Due date</label>
                        <input class="picker-input" type="date" id="ar-due" name="due" value="${escapeHtml(r.due)}" required />
                    </div>
                    <div class="form-field">
                        <label for="ar-invoice-date">Invoice date</label>
                        <input class="picker-input" type="date" id="ar-invoice-date" name="invoiceDate" value="${escapeHtml(r.invoiceDate || r.due)}" required />
                    </div>
                    <div class="form-field">
                        <label for="ar-amount">Amount (₱)</label>
                        <input type="number" id="ar-amount" name="amount" min="0" step="100" value="${r.amount}" required />
                        <span class="error-text">Enter a valid amount.</span>
                    </div>
                    <div class="form-field">
                        <label for="ar-status">Status</label>
                        <select id="ar-status" name="status">
                            <option ${r.status === 'Open' ? 'selected' : ''}>Open</option>
                            <option ${r.status === 'Overdue' ? 'selected' : ''}>Overdue</option>
                            <option ${r.status === 'Paid' ? 'selected' : ''}>Paid</option>
                        </select>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-subtle" data-act="cancel">Cancel</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Add Invoice'}</button>
                </div>
            </form>
        `;
    }

    function openReceivableForm(rec = null) {
        const isEdit = !!rec;
        openModal({
            title: isEdit ? `Edit Invoice | ${rec.id}` : 'Add Invoice',
            body: receivableForm(rec),
            onCancel: closeModal,
            onSubmit: (form) => {
                const data = Object.fromEntries(new FormData(form).entries());
                let valid = true;
                const mark = (name, err) => {
                    const f = form.querySelector(`[name="${name}"]`)?.closest('.form-field');
                    if (f) f.classList.toggle('has-error', err);
                    if (err) valid = false;
                };
                mark('customer', !String(data.customer).trim());
                mark('invoice', !String(data.invoice).trim());
                mark('invoiceDate', !data.invoiceDate);
                mark('due', !data.due);
                mark('amount', data.amount === '' || Number(data.amount) <= 0);
                if (!valid) return;
                const payload = {
                    customer: String(data.customer).trim(),
                    invoice: String(data.invoice).trim(),
                    invoiceDate: data.invoiceDate,
                    due: data.due,
                    amount: Number(data.amount),
                    status: data.status
                };
                if (isEdit) {
                    Object.assign(rec, payload);
                    toast('Invoice updated.');
                } else {
                    store.receivables.push({ id: nextId('AR', store.receivables), ...payload });
                    toast('Invoice added.');
                }
                saveStore();
                closeModal();
                renderReceivableRows();
            }
        });
    }

    async function handleReceivableAction(e) {
        const btn = e.target.closest('button[data-act]');
        if (!btn) return;
        const act = btn.dataset.act;
        const id = btn.dataset.id;
        const rec = (store.receivables || []).find(r => r.id === id);
        if (!rec) return;
        if (act === 'editAr') openReceivableForm(rec);
        if (act === 'deleteAr') {
            const ok = await confirmDialog({
                title: 'Delete Invoice',
                message: `Remove invoice ${rec.invoice} for ${rec.customer}?`,
                confirmLabel: 'Delete',
                danger: true
            });
            if (!ok) return;
            store.receivables = store.receivables.filter(r => r.id !== id);
            saveStore();
            toast('Invoice removed.', 'info');
            renderReceivableRows();
        }
    }

    /* -------------------- PAYABLES -------------------- */

    function buildPayables() {
        const rows = store.payables || [];
        const outstanding = rows.filter(row => row.status !== 'Paid').reduce((sum, row) => sum + Number(row.amount || 0), 0);
        const today = new Date();
        const todayKey = todayDateString();
        const weekEnd = new Date(today);
        weekEnd.setDate(today.getDate() + (6 - today.getDay()));
        const weekEndKey = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}-${String(weekEnd.getDate()).padStart(2, '0')}`;
        const dueToday = rows.filter(row => row.due === todayKey).reduce((sum, row) => sum + Number(row.amount || 0), 0);
        const dueThisWeek = rows.filter(row => row.due >= todayKey && row.due <= weekEndKey).reduce((sum, row) => sum + Number(row.amount || 0), 0);
        const overdue = rows.filter(row => row.status === 'Due' || (row.status !== 'Paid' && row.due < todayKey)).reduce((sum, row) => sum + Number(row.amount || 0), 0);
        const paidThisMonth = rows.filter(row => row.status === 'Paid' || row.status === 'Approved').reduce((sum, row) => sum + Number(row.amount || 0), 0);
        const payableStats = [
            ['Total Payables', outstanding, '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h10M7 13h6"/></svg>'],
            ['Due Today', dueToday, '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M8 14h3"/></svg>'],
            ['Due This Week', dueThisWeek, '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 10h18M7 3v4M17 3v4M7 14h3M14 14h3"/></svg>'],
            ['Overdue', overdue, '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/></svg>'],
            ['Paid This Month', paidThisMonth, '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>']
        ];
        return `
            <div class="section-title"><h2>Accounts Payable</h2><span class="hint" id="apCount">Outstanding ${peso(outstanding)}</span></div>
            <div class="payables-stat-grid">${payableStats.map((stat, index) => `<div class="fin-stat-card payables-stat-card ${index === 0 ? 'fin-stat-card-highlight' : ''}"><div class="fin-stat-head"><span class="fin-stat-icon">${stat[2]}</span><span class="fin-stat-label">${stat[0]}</span></div><div class="fin-stat-value">${peso(stat[1])}</div></div>`).join('')}</div>
            <div class="card">
                <div class="toolbar">
                    <div class="search-wrap"><input type="search" placeholder="Search vendor or invoice…" id="apSearch" /></div>
                    <select id="apStatus">
                        <option value="">All Status</option>
                        <option>Approved</option>
                        <option>For review</option>
                        <option>Due</option>
                        <option>Paid</option>
                    </select>
                    <div class="spacer"></div>
                    <button class="btn btn-preview btn-sm" type="button" data-preview-toggle="payables" style="color:#c2181a;background:#fff;border:1px solid rgba(194,24,26,0.28);">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>
                        Preview
                    </button>
                    ${canManageRecords() ? '<button class="btn btn-primary btn-sm" type="button" id="addApBtn">+ Add Bill</button>' : ''}
                </div>
                <div class="table-wrap"><table class="data-table"><thead><tr><th>Invoice No.</th><th>Supplier</th><th>Invoice Date</th><th>Due Date</th><th>Amount</th><th>Status</th><th style="text-align:right;">Action</th></tr></thead><tbody id="apTbody"></tbody></table></div>
            </div>
        `;
    }

    function renderPayableRows() {
        const tbody = $('#apTbody');
        if (!tbody) return;
        const q = ($('#apSearch')?.value || '').trim().toLowerCase();
        const status = $('#apStatus')?.value || '';
        const rows = (store.payables || []).filter(r => {
            const matchQ = !q || `${r.vendor} ${r.invoice} ${r.id}`.toLowerCase().includes(q);
            const matchS = !status || r.status === status;
            return matchQ && matchS;
        });
        const countEl = $('#apCount');
        const outstanding = rows.filter(r => r.status !== 'Paid').reduce((sum, r) => sum + Number(r.amount || 0), 0);
        if (countEl) countEl.textContent = `${rows.length} shown | Outstanding ${peso(outstanding)}`;

        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">✦</div><strong>No payables</strong><p>No bills match the current filters.</p></div></td></tr>`;
            return;
        }

        tbody.innerHTML = rows.map(r => `
            <tr data-id="${escapeHtml(r.id)}">
                <td><strong>${escapeHtml(r.invoice)}</strong></td>
                <td>${escapeHtml(r.vendor)}</td>
                <td>${escapeHtml(r.invoiceDate || r.due)}</td>
                <td>${escapeHtml(r.due)}</td>
                <td>${peso(r.amount)}</td>
                <td><span class="pill ${pillClass(r.status)}">${escapeHtml(r.status)}</span></td>
                <td>
                    <div class="cell-actions">
                        ${canManageRecords() ? `
                            <button class="btn btn-subtle btn-xs" data-act="editAp" data-id="${escapeHtml(r.id)}" aria-label="Edit ${escapeHtml(r.invoice)}">Edit</button>
                            <button class="btn btn-danger btn-xs" data-act="deleteAp" data-id="${escapeHtml(r.id)}" aria-label="Delete ${escapeHtml(r.invoice)}">Delete</button>
                        ` : '<span class="cell-sub">Read only</span>'}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function payableForm(pay = null) {
        const isEdit = !!pay;
        const p = pay || { vendor: '', invoice: '', invoiceDate: todayDateString(), due: todayDateString(), amount: '', status: 'For review' };
        return `
            <form id="apForm" novalidate>
                <div class="form-grid">
                    <div class="form-field full">
                        <label for="ap-vendor">Vendor</label>
                        <input type="text" id="ap-vendor" name="vendor" value="${escapeHtml(p.vendor)}" required />
                        <span class="error-text">Enter the vendor name.</span>
                    </div>
                    <div class="form-field">
                        <label for="ap-invoice">Bill #</label>
                        <input type="text" id="ap-invoice" name="invoice" value="${escapeHtml(p.invoice)}" required />
                        <span class="error-text">Enter a bill number.</span>
                    </div>
                    <div class="form-field">
                        <label for="ap-due">Due date</label>
                        <input class="picker-input" type="date" id="ap-due" name="due" value="${escapeHtml(p.due)}" required />
                    </div>
                    <div class="form-field">
                        <label for="ap-invoice-date">Invoice date</label>
                        <input class="picker-input" type="date" id="ap-invoice-date" name="invoiceDate" value="${escapeHtml(p.invoiceDate || p.due)}" required />
                    </div>
                    <div class="form-field">
                        <label for="ap-amount">Amount (₱)</label>
                        <input type="number" id="ap-amount" name="amount" min="0" step="100" value="${p.amount}" required />
                        <span class="error-text">Enter a valid amount.</span>
                    </div>
                    <div class="form-field">
                        <label for="ap-status">Status</label>
                        <select id="ap-status" name="status">
                            <option ${p.status === 'For review' ? 'selected' : ''}>For review</option>
                            <option ${p.status === 'Approved' ? 'selected' : ''}>Approved</option>
                            <option ${p.status === 'Due' ? 'selected' : ''}>Due</option>
                            <option ${p.status === 'Paid' ? 'selected' : ''}>Paid</option>
                        </select>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-subtle" data-act="cancel">Cancel</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Add Bill'}</button>
                </div>
            </form>
        `;
    }

    function openPayableForm(pay = null) {
        const isEdit = !!pay;
        openModal({
            title: isEdit ? `Edit Bill | ${pay.id}` : 'Add Bill',
            body: payableForm(pay),
            onCancel: closeModal,
            onSubmit: (form) => {
                const data = Object.fromEntries(new FormData(form).entries());
                let valid = true;
                const mark = (name, err) => {
                    const f = form.querySelector(`[name="${name}"]`)?.closest('.form-field');
                    if (f) f.classList.toggle('has-error', err);
                    if (err) valid = false;
                };
                mark('vendor', !String(data.vendor).trim());
                mark('invoice', !String(data.invoice).trim());
                mark('invoiceDate', !data.invoiceDate);
                mark('due', !data.due);
                mark('amount', data.amount === '' || Number(data.amount) <= 0);
                if (!valid) return;
                const payload = {
                    vendor: String(data.vendor).trim(),
                    invoice: String(data.invoice).trim(),
                    invoiceDate: data.invoiceDate,
                    due: data.due,
                    amount: Number(data.amount),
                    status: data.status
                };
                if (isEdit) {
                    Object.assign(pay, payload);
                    toast('Bill updated.');
                } else {
                    store.payables.push({ id: nextId('AP', store.payables), ...payload });
                    toast('Bill added.');
                }
                saveStore();
                closeModal();
                renderPayableRows();
            }
        });
    }

    async function handlePayableAction(e) {
        const btn = e.target.closest('button[data-act]');
        if (!btn) return;
        const act = btn.dataset.act;
        const id = btn.dataset.id;
        const pay = (store.payables || []).find(p => p.id === id);
        if (!pay) return;
        if (act === 'editAp') openPayableForm(pay);
        if (act === 'deleteAp') {
            const ok = await confirmDialog({
                title: 'Delete Bill',
                message: `Remove bill ${pay.invoice} from ${pay.vendor}?`,
                confirmLabel: 'Delete',
                danger: true
            });
            if (!ok) return;
            store.payables = store.payables.filter(p => p.id !== id);
            saveStore();
            toast('Bill removed.', 'info');
            renderPayableRows();
        }
    }

    /* -------------------- CASH / BANK -------------------- */

    function buildCashBank() {
        const rows = store.cashBank || [];
        const balance = rows.length ? Number(rows[0].balance || 0) : 0;
        const totalCash = rows.reduce((max, row) => Math.max(max, Number(row.balance || 0)), 0);
        const cashOnHand = rows.filter(row => /cash/i.test(row.account)).reduce((max, row) => Math.max(max, Number(row.balance || 0)), 0);
        const bankBalance = rows.filter(row => !/cash/i.test(row.account)).reduce((max, row) => Math.max(max, Number(row.balance || 0)), 0);
        const moneyIn = rows.filter(row => row.type === 'Credit').reduce((sum, row) => sum + Number(row.amount || 0), 0);
        const moneyOut = rows.filter(row => row.type === 'Debit').reduce((sum, row) => sum + Number(row.amount || 0), 0);
        const incomingRows = rows.filter(row => row.type === 'Credit');
        const outgoingRows = rows.filter(row => row.type === 'Debit');

        const flowBars = (items) => {
            const displayItems = items.slice(0, 5);
            const values = displayItems.map(item => Number(item.amount || 0));
            const max = Math.max(...values, 1);
            return displayItems.map((item) => {
                const value = Number(item.amount || 0);
                const widthPercent = Math.max(8, Math.round((value / max) * 100));
                const label = String(item.date || '').slice(5);
                return `<div class="flow-row">
                            <span class="flow-date">${escapeHtml(label)}</span>
                            <div class="flow-track"><i style="width: ${widthPercent}%;"></i></div>
                            <span class="flow-amount">${peso(value)}</span>
                        </div>`;
            }).join('');
        };

        const cashStats = [
            ['Total Cash Balance', totalCash, '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 9v6M18 9v6"/></svg>'],
            ['Cash on Hand', cashOnHand, '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 8h18v10H3z"/><path d="M3 8 6 5h12l3 3M15 13h3"/></svg>'],
            ['Total Bank Balance', bankBalance, '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m3 9 9-5 9 5M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/></svg>'],
            ['Money In', moneyIn, '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 16V8M8.5 11.5 12 8l3.5 3.5"/></svg>'],
            ['Money Out', moneyOut, '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8.5 12.5 12 16l3.5-3.5"/></svg>']
        ];
        return `
            <div class="section-title"><h2>Cash / Bank</h2><span class="hint" id="cbCount">Latest reported balance ${peso(balance)}</span></div>
            <div class="cash-stat-grid">${cashStats.map((stat, index) => `<div class="fin-stat-card cash-stat-card ${index === 0 ? 'fin-stat-card-highlight' : ''}"><div class="fin-stat-head"><span class="fin-stat-icon">${stat[2]}</span><span class="fin-stat-label">${stat[0]}</span></div><div class="fin-stat-value">${peso(stat[1])}</div></div>`).join('')}</div>
            <div class="card cash-accounts-card">
                <div class="cash-accounts-heading"><h3>Cash / Bank Accounts</h3><button class="btn btn-primary btn-xs" type="button" id="bankReconciliationBtn">Bank Reconciliation</button></div>
                <div class="toolbar cash-toolbar">
                    <div class="spacer"></div>
                    <div class="search-wrap"><input type="search" placeholder="Search account or description…" id="cbSearch" /></div>
                    <select id="cbType">
                        <option value="">All Types</option>
                        <option>Credit</option>
                        <option>Debit</option>
                    </select>
                    <button class="btn btn-preview btn-sm" type="button" data-preview-toggle="cashBank" style="color:#c2181a;background:#fff;border:1px solid rgba(194,24,26,0.28);">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>
                        Preview
                    </button>
                    ${canManageRecords() ? '<button class="btn btn-primary btn-sm" type="button" id="addCbBtn">+ Add Entry</button>' : ''}
                </div>
                <div class="table-wrap"><table class="data-table"><thead><tr><th>Account Name</th><th>Account Type</th><th>Account Number</th><th>Current Balance</th><th>Status</th><th style="text-align:right;">Action</th></tr></thead><tbody id="cbTbody"></tbody></table></div>
            </div>
            <div class="cash-lower-grid">
                <section class="card cash-transactions-card">
                    <div class="cash-recent-toolbar">
                        <h3>Recent Transaction</h3>
                        <div class="search-wrap">
                            <input type="search" id="cbRecentSearch" placeholder="Search transactions…" aria-label="Search recent transactions" />
                        </div>
                    </div>
                    <div class="table-wrap">
                        <table class="data-table">
                            <thead>
                                <tr><th>Date</th><th>Reference</th><th>Description</th><th>Type</th><th>Amount</th><th>Account</th></tr>
                            </thead>
                            <tbody id="cbRecentTbody"></tbody>
                        </table>
                    </div>
                </section>
                <section class="card money-flow-card money-in-chart">
                    <div class="money-flow-head">
                        <h3>Money In</h3>
                        <span class="money-flow-total">${peso(moneyIn)}</span>
                    </div>
                    <div class="money-flow-rows">
                        ${flowBars(incomingRows) || '<div class="flow-empty">No incoming transactions</div>'}
                    </div>
                </section>
                <section class="card money-flow-card money-out-chart">
                    <div class="money-flow-head">
                        <h3>Money Out</h3>
                        <span class="money-flow-total">${peso(moneyOut)}</span>
                    </div>
                    <div class="money-flow-rows">
                        ${flowBars(outgoingRows) || '<div class="flow-empty">No outgoing transactions</div>'}
                    </div>
                </section>
            </div>
        `;
    }

    function openBankReconciliation() {
        const bankBalance = (store.cashBank || []).filter(row => !/cash/i.test(row.account)).reduce((max, row) => Math.max(max, Number(row.balance || 0)), 0);
        openModal({
            title: 'Bank Reconciliation',
            onCancel: closeModal,
            onSubmit: (form) => {
                const statementBalance = Number(new FormData(form).get('statementBalance') || 0);
                const difference = statementBalance - bankBalance;
                if (Math.abs(difference) < 0.005) toast('Bank account reconciled successfully.', 'success');
                else toast(`Reconciliation difference: ${peso(Math.abs(difference))}.`, 'info');
                closeModal();
            },
            body: `
                <form id="bankReconciliationForm">
                    <p class="reconciliation-copy">Compare the latest bank statement against the recorded bank balance.</p>
                    <div class="form-field"><label>Book balance</label><input type="text" value="${peso(bankBalance)}" readonly /></div>
                    <div class="form-field"><label for="statementBalance">Statement balance</label><input type="number" id="statementBalance" name="statementBalance" min="0" step="0.01" required /></div>
                    <div class="form-actions"><button type="button" class="btn btn-subtle" data-act="cancel">Cancel</button><button type="submit" class="btn btn-primary">Reconcile</button></div>
                </form>
            `
        });
    }

    function renderCashBankRows() {
        const tbody = $('#cbTbody');
        if (!tbody) return;
        const q = ($('#cbSearch')?.value || '').trim().toLowerCase();
        const type = $('#cbType')?.value || '';
        const rows = (store.cashBank || []).filter(r => {
            const matchQ = !q || `${r.account} ${r.description} ${r.id}`.toLowerCase().includes(q);
            const matchT = !type || r.type === type;
            return matchQ && matchT;
        });
        const countEl = $('#cbCount');
        const latest = (store.cashBank || []).reduce((max, r) => Math.max(max, Number(r.balance || 0)), 0);
        if (countEl) countEl.textContent = `${rows.length} shown | Latest balance ${peso(latest)}`;

        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">◫</div><strong>No cash or bank movements</strong><p>No entries match the current filters.</p></div></td></tr>`;
            return;
        }

        const accountMap = new Map();
        rows.forEach(r => accountMap.set(r.account, r));
        tbody.innerHTML = [...accountMap.values()].map(r => `
            <tr data-id="${escapeHtml(r.id)}">
            <td><strong>${escapeHtml(r.account)}</strong></td>
            <td>${/cash/i.test(r.account) ? 'Cash' : 'Bank'}</td>
            <td>${escapeHtml(r.accountNumber || r.id)}</td>
            <td>${peso(r.balance)}</td>
            <td><span class="cash-active-badge">Active</span></td>
                <td>
                    <div class="cell-actions">
                        ${canManageRecords() ? `
                            <button class="btn btn-subtle btn-xs" data-act="editCb" data-id="${escapeHtml(r.id)}">Edit</button>
                            <button class="btn btn-danger btn-xs" data-act="deleteCb" data-id="${escapeHtml(r.id)}">Delete</button>
                        ` : '<span class="cell-sub">Read only</span>'}
                    </div>
                </td>
            </tr>
        `).join('');

        const recentBody = $('#cbRecentTbody');
        const recentQuery = ($('#cbRecentSearch')?.value || '').trim().toLowerCase();
        const recentRows = rows.filter(r => !recentQuery || `${r.date} ${r.id} ${r.description} ${r.type} ${r.account}`.toLowerCase().includes(recentQuery)).slice(0, 5);
        if (recentBody) recentBody.innerHTML = recentRows.length ? recentRows.map(r => `<tr><td>${escapeHtml(r.date)}</td><td>${escapeHtml(r.id)}</td><td>${escapeHtml(r.description)}</td><td>${escapeHtml(r.type === 'Credit' ? 'In' : 'Out')}</td><td>${peso(r.amount)}</td><td>${escapeHtml(r.account)}</td></tr>`).join('') : '<tr><td colspan="6"><div class="empty-state"><p>No matching transactions.</p></div></td></tr>';
    }

    function cashBankForm(cb = null) {
        const isEdit = !!cb;
        const c = cb || { account: 'BDO Operating', date: todayDateString(), description: '', type: 'Credit', amount: '', balance: '' };
        const accounts = ['BDO Operating', 'BPI Payroll', 'Petty Cash', 'Cash on Hand'];
        return `
            <form id="cbForm" novalidate>
                <div class="form-grid">
                    <div class="form-field">
                        <label for="cb-account">Account</label>
                        <select id="cb-account" name="account">
                            ${accounts.map(a => `<option ${a === c.account ? 'selected' : ''}>${a}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-field">
                        <label for="cb-date">Date</label>
                        <input class="picker-input" type="date" id="cb-date" name="date" value="${escapeHtml(c.date)}" required />
                    </div>
                    <div class="form-field full">
                        <label for="cb-description">Description</label>
                        <input type="text" id="cb-description" name="description" value="${escapeHtml(c.description)}" required />
                        <span class="error-text">Enter a description.</span>
                    </div>
                    <div class="form-field">
                        <label for="cb-type">Type</label>
                        <select id="cb-type" name="type">
                            <option ${c.type === 'Credit' ? 'selected' : ''}>Credit</option>
                            <option ${c.type === 'Debit' ? 'selected' : ''}>Debit</option>
                        </select>
                    </div>
                    <div class="form-field">
                        <label for="cb-amount">Amount (₱)</label>
                        <input type="number" id="cb-amount" name="amount" min="0" step="100" value="${c.amount}" required />
                        <span class="error-text">Enter a valid amount.</span>
                    </div>
                    <div class="form-field full">
                        <label for="cb-balance">Resulting Balance (₱)</label>
                        <input type="number" id="cb-balance" name="balance" min="0" step="100" value="${c.balance}" required />
                        <span class="error-text">Enter the resulting balance.</span>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-subtle" data-act="cancel">Cancel</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Add Entry'}</button>
                </div>
            </form>
        `;
    }

    function openCashBankForm(cb = null) {
        const isEdit = !!cb;
        openModal({
            title: isEdit ? `Edit Entry | ${cb.id}` : 'Add Cash / Bank Entry',
            body: cashBankForm(cb),
            onCancel: closeModal,
            onSubmit: (form) => {
                const data = Object.fromEntries(new FormData(form).entries());
                let valid = true;
                const mark = (name, err) => {
                    const f = form.querySelector(`[name="${name}"]`)?.closest('.form-field');
                    if (f) f.classList.toggle('has-error', err);
                    if (err) valid = false;
                };
                mark('date', !data.date);
                mark('description', !String(data.description).trim());
                mark('amount', data.amount === '' || Number(data.amount) <= 0);
                mark('balance', data.balance === '' || Number(data.balance) < 0);
                if (!valid) return;
                const payload = {
                    account: data.account,
                    date: data.date,
                    description: String(data.description).trim(),
                    type: data.type,
                    amount: Number(data.amount),
                    balance: Number(data.balance)
                };
                if (isEdit) {
                    Object.assign(cb, payload);
                    toast('Entry updated.');
                } else {
                    store.cashBank.unshift({ id: nextId('CB', store.cashBank), ...payload });
                    toast('Entry added.');
                }
                saveStore();
                closeModal();
                renderCashBankRows();
            }
        });
    }

    async function handleCashBankAction(e) {
        const btn = e.target.closest('button[data-act]');
        if (!btn) return;
        const act = btn.dataset.act;
        const id = btn.dataset.id;
        const cb = (store.cashBank || []).find(c => c.id === id);
        if (!cb) return;
        if (act === 'editCb') openCashBankForm(cb);
        if (act === 'deleteCb') {
            const ok = await confirmDialog({
                title: 'Delete Entry',
                message: `Remove "${cb.description}" from ${cb.account}?`,
                confirmLabel: 'Delete',
                danger: true
            });
            if (!ok) return;
            store.cashBank = store.cashBank.filter(c => c.id !== id);
            saveStore();
            toast('Entry removed.', 'info');
            renderCashBankRows();
        }
    }

    /* -------------------- EXPENSES -------------------- */

    function getFullName() {
        const p = JSON.parse(localStorage.getItem('devs_profile') || '{}');
        return p.fullName || 'Administrator';
    }
    function getInitials() {
        const n = getFullName().trim().split(/\s+/).filter(Boolean);
        if (!n.length) return 'AD';
        if (n.length === 1) return n[0].substring(0, 2).toUpperCase();
        return (n[0][0] + n[n.length - 1][0]).toUpperCase();
    }
    function getEmail() {
        const p = JSON.parse(localStorage.getItem('devs_profile') || '{}');
        return p.email || 'admin@devs.com';
    }

    function buildExpenses() {
        const rows = store.expenses || [];
        const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
        const pending = rows.filter(r => r.status === 'For review' || r.status === 'Pending').reduce((s, r) => s + Number(r.amount || 0), 0);
        const approved = rows.filter(r => r.status === 'Approved').reduce((s, r) => s + Number(r.amount || 0), 0);
        const paid = rows.filter(r => r.status === 'Paid' || r.status === 'Posted').reduce((s, r) => s + Number(r.amount || 0), 0);

        const now = new Date();
        const thisMonth = rows.filter(r => {
            if (!r.date) return false;
            const d = new Date(r.date);
            return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        }).reduce((s, r) => s + Number(r.amount || 0), 0);

        const catMap = {};
        rows.forEach(r => {
            const cat = r.category || 'Others';
            catMap[cat] = (catMap[cat] || 0) + Number(r.amount || 0);
        });
        const catEntries = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
        const breakdownRows = catEntries.length
            ? catEntries.map(([cat, amt]) => `
                <div class="expense-breakdown-row">
                    <span class="eb-cat">${escapeHtml(cat)}</span>
                    <span class="eb-amt">${peso(amt)}</span>
                </div>
            `).join('')
            : '<div class="expense-breakdown-empty">No expense data yet.</div>';

        const chartColors = ['#2563eb', '#16a34a', '#9333ea', '#f59e0b', '#0891b2', '#dc2626', '#65a30d', '#db2777', '#0d9488', '#7c3aed'];
        const chartTotal = catEntries.reduce((s, [, v]) => s + v, 0);
        let pieSvg = '';
        let legendItems = '';
        if (chartTotal > 0) {
            let cumulative = 0;
            const radius = 60;
            const cx = 90;
            const cy = 90;
            const circumference = 2 * Math.PI * radius;
            const segments = catEntries.map(([cat, amt], i) => {
                const pct = amt / chartTotal;
                const dash = pct * circumference;
                const offset = -cumulative * circumference;
                cumulative += pct;
                const color = chartColors[i % chartColors.length];
                return `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${color}" stroke-width="34" stroke-dasharray="${dash} ${circumference - dash}" stroke-dashoffset="${offset}" transform="rotate(-90 ${cx} ${cy})"></circle>`;
            }).join('');
            pieSvg = `<svg viewBox="0 0 180 180" class="expense-pie-svg">${segments}</svg>`;
            legendItems = catEntries.slice(0, 6).map(([cat, amt], i) => {
                const pct = ((amt / chartTotal) * 100).toFixed(1);
                const color = chartColors[i % chartColors.length];
                return `<li><span class="legend-dot" style="background:${color}"></span>${escapeHtml(cat)} ${pct}%</li>`;
            }).join('');
        } else {
            pieSvg = '<div class="expense-pie-empty">No data</div>';
            legendItems = '<li class="legend-empty">No categories yet</li>';
        }

        const stats = [
            {
                label: 'Total Expenses',
                value: peso(total),
                tone: 'dark',
                icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h10M7 13h6"/></svg>'
            },
            {
                label: 'Pending Approval',
                value: peso(pending),
                tone: 'light',
                icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/></svg>'
            },
            {
                label: 'Approved Expenses',
                value: peso(approved),
                tone: 'light',
                icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>'
            },
            {
                label: 'Paid Expenses',
                value: peso(paid),
                tone: 'light',
                icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 10v4M18 10v4"/></svg>'
            },
            {
                label: 'This Month',
                value: peso(thisMonth),
                tone: 'light',
                icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 10h18M7 3v4M17 3v4"/></svg>'
            }
        ];

        return `
            <div class="expense-toolbar-simple">
                <button class="expense-filter-btn" type="button" id="expFilterBtn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h18M6 12h12M10 19h4"/></svg>
                    Filter
                </button>
                ${canManageRecords() ? '<button class="btn btn-save-pill expense-add-btn" type="button" id="addExpBtn">+ Add Voucher</button>' : ''}
            </div>

            <div class="expense-stat-grid">
                ${stats.map(s => `
                    <div class="expense-stat-card ${s.tone === 'dark' ? 'expense-stat-dark' : ''}">
                        <div class="expense-stat-head">
                            <span class="expense-stat-icon">${s.icon}</span>
                            <span class="label">${s.label}</span>
                        </div>
                        <strong class="value">${s.value}</strong>
                    </div>
                `).join('')}
            </div>

            <div class="expense-charts-grid">
                <section class="expense-breakdown-card">
                    <h3>Expense Breakdown</h3>
                    <div class="expense-breakdown-list">${breakdownRows}</div>
                </section>
                <section class="expense-monthly-card">
                    <h3>Monthly Expenses</h3>
                    <div class="expense-monthly-body">
                        <div class="expense-pie-wrap">${pieSvg}</div>
                        <ul class="expense-pie-legend">${legendItems}</ul>
                    </div>
                </section>
            </div>

            <section class="fin-report-card" style="margin-top:22px;">
                <div class="fin-report-head">
                    <span class="fin-report-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h10M7 13h6"/></svg>
                    </span>
                    <div class="fin-report-head-text">
                        <h3>Expense Records</h3>
                        <p class="fin-report-sub">Source: Expenses · All vouchers and reimbursements</p>
                    </div>
                    <div class="fin-report-search">
                        <input type="search" id="expSearch" placeholder="Search preview…" />
                    </div>
                </div>
                <div class="fin-report-preview">
                    <table class="fin-preview-table" id="expTable">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Category</th>
                                <th>Supplier / Payee</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th style="text-align:right;">Action</th>
                            </tr>
                        </thead>
                        <tbody id="expTbody"></tbody>
                    </table>
                </div>
                <div class="fin-report-foot">
                    ${canExportRecords() ? `
                        <button class="fin-btn-export-row" type="button" data-export="expenses">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 3v12M8 11l4 4 4-4M3 21h18"/>
                            </svg>
                            Export CSV
                        </button>
                    ` : ''}
                </div>
            </section>
        `;
    }

    let expSearchTerm = '';

    function renderExpenseRows() {
        const tbody = $('#expTbody');
        if (!tbody) return;
        const rows = (store.expenses || []).filter(r => {
            if (!expSearchTerm) return true;
            const q = expSearchTerm.toLowerCase();
            return `${r.voucher || ''} ${r.id || ''} ${r.category || ''} ${r.description || ''} ${r.supplier || ''} ${r.vendor || ''} ${r.status || ''}`.toLowerCase().includes(q);
        });

        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">◌</div><strong>No expense records</strong><p>No vouchers match the current filter.</p></div></td></tr>`;
            return;
        }

        tbody.innerHTML = rows.map(r => `
            <tr data-id="${escapeHtml(r.id)}">
                <td>${escapeHtml(r.voucher || r.id)}</td>
                <td>${escapeHtml(r.category || '—')}</td>
                <td>${escapeHtml(r.supplier || r.vendor || '—')}</td>
                <td>${peso(r.amount)}</td>
                <td><span class="pill ${pillClass(r.status)}">${escapeHtml(r.status)}</span></td>
                <td style="text-align:right;">
                    <button class="btn-view" type="button" data-act="viewExp" data-id="${escapeHtml(r.id)}">View</button>
                </td>
            </tr>
        `).join('');
    }

    function openExpenseForm(exp = null) {
        const isEdit = !!exp;

        openModal({
            title: isEdit ? `Edit Voucher | ${exp.voucher || exp.id}` : 'Add Voucher Expense',
            size: 'lg',
            onCancel: closeModal,
            body: `
                <div class="modal-split-left">
                    <div class="modal-split-brand">
                        <span class="modal-split-brand-mark" style="background:#ff3b00;">
    <svg viewBox="0 0 24 24" width="20" height="20" fill="#fff" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="10" width="3" height="10" rx="1"/>
        <rect x="8.5" y="5" width="3" height="15" rx="1"/>
        <rect x="14" y="12" width="3" height="8" rx="1"/>
        <rect x="19.5" y="7" width="3" height="13" rx="1"/>
    </svg>
</span>
                        <span class="modal-split-brand-name"><span class="brand-hr">HR</span><span class="brand-fin">Fin</span></span>
                    </div>
                    <button type="button" class="modal-split-back" data-act="cancel">
                        <span class="modal-split-back-arrow">←</span>
                        <span>${isEdit ? 'Edit Voucher Expense' : 'Add Voucher Expense'}</span>
                    </button>
                    <p class="modal-split-sub">
                        ${isEdit
                            ? 'Update the voucher details to keep your expense records accurate.'
                            : 'Fill in the necessary details to record a new expense voucher.'}
                    </p>
                    <div class="modal-split-art">
                        <svg viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="30" y="24" width="110" height="150" rx="8"/>
                            <path d="M50 60h70M50 84h70M50 108h46"/>
                            <circle cx="140" cy="146" r="30"/>
                            <path d="M140 138v-10M132 138h16M128 146h24M128 154h24M134 162h12"/>
                        </svg>
                    </div>
                </div>
                <div class="modal-split-right">
                    ${expenseForm(exp)}
                </div>
            `
        });

        const modalEl = document.getElementById('modal');
        if (modalEl) modalEl.classList.add('modal-split');

        const fileInput = document.getElementById('exp-attachment');
        const fileNameEl = document.getElementById('exp-attachment-name');
        fileInput?.addEventListener('change', () => {
            const file = fileInput.files?.[0];
            fileNameEl.textContent = file ? `Selected: ${file.name}` : '';
        });

        wireExpenseSubmit(exp);
    }

    function wireExpenseSubmit(existing = null) {
        const form = document.getElementById('expForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const isEdit = !!existing;
            const data = Object.fromEntries(new FormData(form).entries());

            let valid = true;
            const mark = (id, err) => {
                const f = form.querySelector(`#${id}`)?.closest('.split-field');
                if (f) f.classList.toggle('has-error', err);
                if (err) valid = false;
            };
            mark('exp-category', !data.category);
            mark('exp-amount', data.amount === '' || Number(data.amount) <= 0);
            if (!valid) return;

            let attachmentName = '';
            let attachmentData = '';
            const file = document.getElementById('exp-attachment')?.files?.[0];
            if (file) {
                if (file.size > 5 * 1024 * 1024) {
                    toast('Attachment must be 5MB or smaller.', 'error');
                    return;
                }
                attachmentName = file.name;
                attachmentData = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            }

            const payload = {
                voucher: data.voucher || existing?.voucher || '',
                date: data.date,
                category: data.category,
                description: String(data.description || '').trim(),
                supplier: String(data.supplier || '').trim(),
                vendor: String(data.supplier || '').trim(),
                paymentMethod: data.paymentMethod || '',
                amount: Number(data.amount),
                reference: String(data.reference || '').trim(),
                status: existing?.status || 'For review',
                attachmentName: attachmentName || existing?.attachmentName || '',
                attachmentData: attachmentData || existing?.attachmentData || ''
            };

            if (isEdit) {
                Object.assign(existing, payload);
                toast('Voucher updated.');
            } else {
                store.expenses.unshift({ id: nextId('EXP', store.expenses), ...payload });
                toast('Voucher saved.');
            }

            saveStore();
            closeModal();
            renderExpenseRows();
        });
    }

    async function handleExpenseAction(e) {
        const btn = e.target.closest('button[data-act]');
        if (!btn) return;
        const act = btn.dataset.act;
        const id = btn.dataset.id;
        const exp = (store.expenses || []).find(x => x.id === id);
        if (!exp) return;

        if (act === 'viewExp') viewExpense(exp);
        if (act === 'editExp') openExpenseForm(exp);
        if (act === 'deleteExp') {
            const ok = await confirmDialog({
                title: 'Delete Voucher',
                message: `Remove voucher ${exp.voucher || exp.id}? This cannot be undone.`,
                confirmLabel: 'Delete',
                danger: true
            });
            if (!ok) return;
            store.expenses = store.expenses.filter(x => x.id !== id);
            saveStore();
            toast('Voucher removed.', 'info');
            renderExpenseRows();
        }
    }

    function viewExpense(exp) {
        const canManage = canManageRecords();
        openModal({
            title: `Voucher | ${exp.voucher || exp.id}`,
            size: 'sm',
            onCancel: closeModal,
            onExtraClick: (e) => {
                const btn = e.target.closest('[data-act]');
                if (!btn) return false;
                const act = btn.dataset.act;
                if (act === 'viewEdit') { closeModal(); setTimeout(() => openExpenseForm(exp), 120); return true; }
                if (act === 'viewDelete') {
                    closeModal();
                    setTimeout(async () => {
                        const ok = await confirmDialog({
                            title: 'Delete Voucher',
                            message: `Remove voucher ${exp.voucher || exp.id}? This cannot be undone.`,
                            confirmLabel: 'Delete',
                            danger: true
                        });
                        if (!ok) return;
                        store.expenses = store.expenses.filter(x => x.id !== exp.id);
                        saveStore();
                        toast('Voucher removed.', 'info');
                        renderExpenseRows();
                    }, 120);
                    return true;
                }
                return false;
            },
            body: `
                <div style="margin-bottom:18px;">
                    <div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#888;margin-bottom:4px;">Voucher</div>
                    <div style="font-size:20px;font-weight:800;color:#111;">${escapeHtml(exp.voucher || exp.id)}</div>
                    <span class="pill ${pillClass(exp.status)}" style="margin-top:8px;">${escapeHtml(exp.status)}</span>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px 20px;padding-top:18px;border-top:1px solid rgba(0,0,0,.08);">
                    <div><div style="font-size:11.5px;font-weight:700;color:#666;margin-bottom:3px;">Date</div><div style="font-weight:600;">${escapeHtml(exp.date || '—')}</div></div>
                    <div><div style="font-size:11.5px;font-weight:700;color:#666;margin-bottom:3px;">Amount</div><div style="font-weight:700;color:#c2181a;">${peso(exp.amount)}</div></div>
                    <div style="grid-column:1/-1;"><div style="font-size:11.5px;font-weight:700;color:#666;margin-bottom:3px;">Category</div><div style="font-weight:600;">${escapeHtml(exp.category || '—')}</div></div>
                    <div style="grid-column:1/-1;"><div style="font-size:11.5px;font-weight:700;color:#666;margin-bottom:3px;">Description</div><div style="font-weight:500;">${escapeHtml(exp.description || '—')}</div></div>
                    <div><div style="font-size:11.5px;font-weight:700;color:#666;margin-bottom:3px;">Supplier / Payee</div><div style="font-weight:600;">${escapeHtml(exp.supplier || exp.vendor || '—')}</div></div>
                    <div><div style="font-size:11.5px;font-weight:700;color:#666;margin-bottom:3px;">Payment Method</div><div style="font-weight:600;">${escapeHtml(exp.paymentMethod || '—')}</div></div>
                    <div style="grid-column:1/-1;"><div style="font-size:11.5px;font-weight:700;color:#666;margin-bottom:3px;">Reference / Invoice No.</div><div style="font-weight:600;">${escapeHtml(exp.reference || '—')}</div></div>
                    <div style="grid-column:1/-1;"><div style="font-size:11.5px;font-weight:700;color:#666;margin-bottom:3px;">Receipt / Invoice</div>${exp.attachmentData ? `<a href="${escapeHtml(exp.attachmentData)}" target="_blank" rel="noopener" download="${escapeHtml(exp.attachmentName || 'receipt')}" style="color:#c2181a;font-weight:700;text-decoration:none;">Open ${escapeHtml(exp.attachmentName || 'attachment')}</a>` : '<span style="color:#888;">No attachment</span>'}</div>
                </div>
                <div class="form-actions" style="margin-top:22px;">
                    <button class="btn btn-subtle" type="button" data-act="close">Close</button>
                    ${canManage ? `
                        <button class="btn btn-subtle" type="button" data-act="viewEdit">Edit</button>
                        <button class="btn btn-danger" type="button" data-act="viewDelete">Delete</button>
                    ` : ''}
                </div>
            `
        });
    }

    /* -------------------- FINANCIAL REPORTS -------------------- */

    let finReportFilters = {
        from: '',
        to: '',
        source: '',
        transaction: '',
        status: ''
    };

    function computeFinancialReportData() {
        const f = finReportFilters;
        const inRange = (dateStr) => {
            if (!f.from && !f.to) return true;
            if (!dateStr) return true;
            if (f.from && dateStr < f.from) return false;
            if (f.to && dateStr > f.to) return false;
            return true;
        };

        const revenueFromAccounts = (store.accounts || [])
            .filter(a => a.type === 'Revenue')
            .reduce((sum, a) => sum + Number(a.balance || 0), 0);

        const expensesTotal = (store.expenses || [])
            .filter(r => inRange(r.date))
            .filter(r => !f.status || r.status === f.status)
            .reduce((sum, r) => sum + Number(r.amount || 0), 0);

        const payablesTotal = (store.payables || [])
            .filter(r => inRange(r.due))
            .filter(r => !f.status || r.status === f.status)
            .reduce((sum, r) => sum + Number(r.amount || 0), 0);

        const receivablesTotal = (store.receivables || [])
            .filter(r => inRange(r.due))
            .filter(r => !f.status || r.status === f.status)
            .reduce((sum, r) => sum + Number(r.amount || 0), 0);

        const credits = (store.cashBank || []).filter(r => r.type === 'Credit' && inRange(r.date)).reduce((s, r) => s + Number(r.amount || 0), 0);
        const debits  = (store.cashBank || []).filter(r => r.type === 'Debit'  && inRange(r.date)).reduce((s, r) => s + Number(r.amount || 0), 0);
        const netCashMovement = credits - debits;

        return {
            revenue: revenueFromAccounts,
            expenses: expensesTotal,
            payables: payablesTotal,
            receivables: receivablesTotal,
            netCash: netCashMovement
        };
    }

    function openPreviewModal(entity, { title, subtitle, columns, rows, filters = [], footerActions = '' }) {
        const previewRows = rows.slice(0, 100);
        const headerHtml = columns.map(c => `<th>${escapeHtml(c)}</th>`).join('');
        const bodyHtml = previewRows.length
            ? previewRows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(String(cell ?? '—'))}</td>`).join('')}</tr>`).join('')
            : `<tr><td colspan="${columns.length}" class="fin-report-empty">No records to preview.</td></tr>`;

        const filterControls = filters.map(f => `
            <select class="fin-report-filter" data-preview-filter="${entity}" data-filter-col="${f.col}">
                ${f.options.map(o => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`).join('')}
            </select>
        `).join('');

        openModal({
            title: ' ',
            size: 'lg',
            onCancel: closeModal,
            body: `
                <section class="fin-report-card" style="margin-top:0;border:0;box-shadow:none;padding:0;">
                    <div class="fin-report-head" style="padding:0 0 14px;">
                        <span class="fin-report-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h10M7 13h6"/></svg>
                        </span>
                        <div class="fin-report-head-text">
                            <h3>${title}</h3>
                            <p class="fin-report-sub">${subtitle}</p>
                        </div>
                        <div class="fin-report-tools">
                            ${filterControls}
                            <div class="fin-report-search">
                                <input type="search" placeholder="Search preview…" data-preview-search="${entity}" />
                            </div>
                        </div>
                    </div>
                    <div class="fin-report-preview" style="max-height:60vh;">
                        <table class="fin-preview-table" data-preview-table="${entity}">
                            <thead><tr>${headerHtml}</tr></thead>
                            <tbody>${bodyHtml}</tbody>
                        </table>
                    </div>
                    <div class="fin-report-foot">
                        ${footerActions}
                        ${canExportRecords() ? `
                            <button class="fin-btn-export-row" type="button" data-export="${entity}">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M12 3v12M8 11l4 4 4-4M3 21h18"/>
                                </svg>
                                Export CSV
                            </button>
                        ` : ''}
                        <button class="btn btn-subtle" type="button" data-act="cancel">Close</button>
                    </div>
                </section>
            `
        });

        modalBody.querySelectorAll('[data-preview-search]').forEach(input => {
            input.addEventListener('input', throttle(() => {
                applyPreviewFilters(input.dataset.previewSearch);
            }, 100));
        });
        modalBody.querySelectorAll('[data-preview-filter]').forEach(sel => {
            sel.addEventListener('change', () => {
                applyPreviewFilters(sel.dataset.previewFilter);
            });
        });
        attachExportHandlers();
    }

    function openReportPreview(entity) {
        const map = {
            accounts: () => {
                const accounts = store.accounts || [];
                return {
                    title: 'Chart of Accounts Report',
                    subtitle: 'Source: Accounts · All account codes and balances',
                    columns: ['Code', 'Account Name', 'Type', 'Balance'],
                    rows: accounts.map(a => [a.code, a.name, a.type, peso(a.balance)]),
                    filters: [
                        { col: 2, options: [
                            { value: '', label: 'All Types' },
                            { value: 'Asset', label: 'Asset' },
                            { value: 'Liability', label: 'Liability' },
                            { value: 'Equity', label: 'Equity' },
                            { value: 'Revenue', label: 'Revenue' },
                            { value: 'Expense', label: 'Expense' }
                        ]}
                    ]
                };
            },
            receivables: () => {
                const rows = store.receivables || [];
                return {
                    title: 'Accounts Receivable Report',
                    subtitle: 'Source: Sales + AR · All outstanding customer invoices',
                    columns: ['Invoice', 'Customer', 'Due Date', 'Amount'],
                    rows: rows.map(r => [r.invoice, r.customer, r.due, peso(r.amount)]),
                    filters: [
                        { col: 1, options: [
                            { value: '', label: 'All Customers' },
                            ...Array.from(new Set(rows.map(r => r.customer))).map(c => ({ value: c, label: c }))
                        ]}
                    ]
                };
            },
            payables: () => {
                const rows = store.payables || [];
                return {
                    title: 'Accounts Payable Report',
                    subtitle: 'Source: Payables + AP · All outstanding vendor bills',
                    columns: ['Bill', 'Vendor', 'Due Date', 'Amount'],
                    rows: rows.map(r => [r.invoice, r.vendor, r.due, peso(r.amount)]),
                    filters: [
                        { col: 1, options: [
                            { value: '', label: 'All Vendors' },
                            ...Array.from(new Set(rows.map(r => r.vendor))).map(v => ({ value: v, label: v }))
                        ]}
                    ]
                };
            },
            cashBank: () => {
                const rows = store.cashBank || [];
                return {
                    title: 'Cash / Bank Report',
                    subtitle: 'Source: Cash/Bank · All account balances and movements',
                    columns: ['Date', 'Reference', 'Description', 'Account Name', 'Type', 'Amount'],
                    rows: rows.map(r => [r.date, r.id, r.description, r.account, r.type, peso(r.amount)]),
                    filters: [
                        { col: 4, options: [
                            { value: '', label: 'All Types' },
                            { value: 'Credit', label: 'Credit' },
                            { value: 'Debit', label: 'Debit' }
                        ]}
                    ]
                };
            },
            expenses: () => {
                const rows = store.expenses || [];
                return {
                    title: 'Expense Report',
                    subtitle: 'Source: Expenses · All vouchers by category',
                    columns: ['Voucher', 'Category', 'Date', 'Amount'],
                    rows: rows.map(r => [r.voucher || r.id, r.category, r.date, peso(r.amount)]),
                    filters: [
                        { col: 1, options: [
                            { value: '', label: 'All Categories' },
                            ...Array.from(new Set(rows.map(r => r.category).filter(Boolean))).map(c => ({ value: c, label: c }))
                        ]}
                    ]
                };
            }
        };
        if (!map[entity]) return;
        openPreviewModal(entity, map[entity]());
    }

    function buildFinancialReports() {
        const d = computeFinancialReportData();
        const f = finReportFilters;

        const svg = (path) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;

        const sourceOptions = ['', 'Sales + AR', 'Payables + AP', 'Cash/Bank', 'Expenses', 'Accounts'];
        const transactionOptions = ['', 'All Transactions', 'Invoices', 'Bills', 'Vouchers', 'Deposits'];
        const statusOptions = ['', 'All Status', 'Open', 'Overdue', 'Paid', 'Approved', 'For review', 'Due', 'Posted'];

        return `
            <div class="fin-report-header">
                <div class="fin-report-actions">
                    <button class="fin-btn-generate" type="button" id="finGenerateBtn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h6"/></svg>
                        Generate Report
                    </button>
                </div>
            </div>

            <div class="fin-stat-grid">
                <div class="fin-stat-card">
                    <div class="fin-stat-head">
                        <span class="fin-stat-icon">${svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>')}</span>
                        <span class="fin-stat-label">TOTAL REVENUE /<br/>COLLECTION</span>
                    </div>
                    <div class="fin-stat-value">${peso(d.revenue)}</div>
                </div>

                <div class="fin-stat-card">
                    <div class="fin-stat-head">
                        <span class="fin-stat-icon">${svg('<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>')}</span>
                        <span class="fin-stat-label">TOTAL EXPENSES</span>
                    </div>
                    <div class="fin-stat-value">${peso(d.expenses)}</div>
                </div>

                <div class="fin-stat-card">
                    <div class="fin-stat-head">
                        <span class="fin-stat-icon">${svg('<path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"/><path d="M9 7h6M9 11h6M9 15h4"/>')}</span>
                        <span class="fin-stat-label">TOTAL PAYABLES</span>
                    </div>
                    <div class="fin-stat-value">${peso(d.payables)}</div>
                </div>

                <div class="fin-stat-card">
                    <div class="fin-stat-head">
                        <span class="fin-stat-icon">${svg('<rect x="2" y="6" width="16" height="10" rx="2"/><circle cx="10" cy="11" r="2"/><path d="M20 10v8a2 2 0 0 1-2 2H8"/>')}</span>
                        <span class="fin-stat-label">TOTAL RECEIVABLES</span>
                    </div>
                    <div class="fin-stat-value">${peso(d.receivables)}</div>
                </div>

                <div class="fin-stat-card fin-stat-card-highlight">
                    <div class="fin-stat-head">
                        <span class="fin-stat-icon">${svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 10h5a2 2 0 0 1 0 4H9"/>')}</span>
                        <span class="fin-stat-label">NET CASH MOVEMENT</span>
                    </div>
                    <div class="fin-stat-value ${d.netCash >= 0 ? 'positive' : 'negative'}">
                        ${d.netCash >= 0 ? '+' : '−'}${peso(Math.abs(d.netCash))}
                    </div>
                </div>
            </div>

            <div class="fin-filters-card">
                <div class="fin-filters-title">FILTERS</div>
                <div class="fin-filters-row">
                    <label class="fin-filter-field">
                        <span>From</span>
                        <input class="picker-input" type="date" id="finFrom" value="${f.from}" />
                    </label>
                    <label class="fin-filter-field">
                        <span>To</span>
                        <input class="picker-input" type="date" id="finTo" value="${f.to}" />
                    </label>
                    <label class="fin-filter-field fin-filter-wide">
                        <span>Source Module</span>
                        <select id="finSource">
                            ${sourceOptions.map(o => `<option value="${escapeHtml(o)}" ${o === f.source ? 'selected' : ''}>${o || 'All Source Module'}</option>`).join('')}
                        </select>
                    </label>
                </div>
                <div class="fin-filters-row">
                    <label class="fin-filter-field">
                        <select id="finTransaction">
                            ${transactionOptions.map(o => `<option value="${escapeHtml(o)}" ${o === f.transaction ? 'selected' : ''}>${o || 'All Transactions'}</option>`).join('')}
                        </select>
                    </label>
                    <label class="fin-filter-field">
                        <select id="finStatus">
                            ${statusOptions.map(o => `<option value="${escapeHtml(o)}" ${o === f.status ? 'selected' : ''}>${o || 'All Status'}</option>`).join('')}
                        </select>
                    </label>
                </div>
            </div>

            <div class="fin-report-list">
                <section class="fin-report-card">
                    <div class="fin-report-head">
                        <span class="fin-report-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h12l4 4v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M14 4v6h6"/></svg>
                        </span>
                        <div>
                            <h3>Account Receivable Reports</h3>
                            <p class="fin-report-sub">Source: Sales + AR · Period: ${f.from || 'All'} – ${f.to || 'Present'}</p>
                        </div>
                        <div class="fin-report-search">
                            <input type="search" placeholder="Search preview…" data-preview-search="ar-fin" />
                        </div>
                    </div>
                    <div class="fin-report-preview">
                        <table class="fin-preview-table" data-preview-table="ar-fin">
                            <thead><tr><th>Invoice</th><th>Customer</th><th>Due Date</th><th>Amount</th></tr></thead>
                            <tbody>
                                ${(store.receivables || []).slice(0, 5).map(r => `<tr><td>${escapeHtml(r.invoice)}</td><td>${escapeHtml(r.customer)}</td><td>${escapeHtml(r.due)}</td><td>${peso(r.amount)}</td></tr>`).join('') || `<tr><td colspan="4" class="fin-report-empty">No records to preview.</td></tr>`}
                            </tbody>
                        </table>
                    </div>
                    ${canExportRecords() ? `
                    <div class="fin-report-foot">
                        <button class="fin-btn-export-row" type="button" data-report="receivables">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M8 11l4 4 4-4M3 21h18"/></svg>
                            Export CSV
                        </button>
                    </div>
                    ` : ''}
                </section>

                <section class="fin-report-card">
                    <div class="fin-report-head">
                        <span class="fin-report-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></svg>
                        </span>
                        <div>
                            <h3>Account Payable Reports</h3>
                            <p class="fin-report-sub">Source: Payables + AP · Period: ${f.from || 'All'} – ${f.to || 'Present'}</p>
                        </div>
                        <div class="fin-report-search">
                            <input type="search" placeholder="Search preview…" data-preview-search="ap-fin" />
                        </div>
                    </div>
                    <div class="fin-report-preview">
                        <table class="fin-preview-table" data-preview-table="ap-fin">
                            <thead><tr><th>Bill</th><th>Vendor</th><th>Due Date</th><th>Amount</th></tr></thead>
                            <tbody>
                                ${(store.payables || []).slice(0, 5).map(r => `<tr><td>${escapeHtml(r.invoice)}</td><td>${escapeHtml(r.vendor)}</td><td>${escapeHtml(r.due)}</td><td>${peso(r.amount)}</td></tr>`).join('') || `<tr><td colspan="4" class="fin-report-empty">No records to preview.</td></tr>`}
                            </tbody>
                        </table>
                    </div>
                    ${canExportRecords() ? `
                    <div class="fin-report-foot">
                        <button class="fin-btn-export-row" type="button" data-report="payables">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M8 11l4 4 4-4M3 21h18"/></svg>
                            Export CSV
                        </button>
                    </div>
                    ` : ''}
                </section>

                <section class="fin-report-card">
                    <div class="fin-report-head">
                        <span class="fin-report-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h10M7 13h6"/></svg>
                        </span>
                        <div>
                            <h3>Expense Reports</h3>
                            <p class="fin-report-sub">Source: Expenses · Period: ${f.from || 'All'} – ${f.to || 'Present'}</p>
                        </div>
                        <div class="fin-report-search">
                            <input type="search" placeholder="Search preview…" data-preview-search="exp-fin" />
                        </div>
                    </div>
                    <div class="fin-report-preview">
                        <table class="fin-preview-table" data-preview-table="exp-fin">
                            <thead><tr><th>Voucher</th><th>Category</th><th>Date</th><th>Amount</th></tr></thead>
                            <tbody>
                                ${(store.expenses || []).slice(0, 5).map(r => `<tr><td>${escapeHtml(r.voucher || r.id)}</td><td>${escapeHtml(r.category)}</td><td>${escapeHtml(r.date)}</td><td>${peso(r.amount)}</td></tr>`).join('') || `<tr><td colspan="4" class="fin-report-empty">No records to preview.</td></tr>`}
                            </tbody>
                        </table>
                    </div>
                    ${canExportRecords() ? `
                    <div class="fin-report-foot">
                        <button class="fin-btn-export-row" type="button" data-report="expenses">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M8 11l4 4 4-4M3 21h18"/></svg>
                            Export CSV
                        </button>
                    </div>
                    ` : ''}
                </section>
            </div>
        `;
    }

    /* -------------------- SETTINGS / ACCOUNT / LOGOUT -------------------- */

    function buildBankReconciliationPage() {
        const accounts = (store.cashBank || []).filter(r => !/cash/i.test(r.account));
        const rows = accounts.length ? accounts.map(a => {
            const sysBal = Number(a.balance || 0);
            const stmtBal = Number(a.statementBalance ?? sysBal);
            const diff = stmtBal - sysBal;
            const status = Math.abs(diff) < 0.005 ? 'Reconciled' : 'Review';
            return `<tr>
                <td><strong>${escapeHtml(a.account)}</strong></td>
                <td>${peso(sysBal)}</td>
                <td>${peso(stmtBal)}</td>
                <td>${peso(diff)}</td>
                <td><span class="pill ${status === 'Reconciled' ? 'success' : 'warning'}">${status}</span></td>
            </tr>`;
        }).join('') : `<tr><td colspan="5"><div class="empty-state"><p>No bank accounts to reconcile.</p></div></td></tr>`;

        return `
            <div class="section-title"><h2>Bank Reconciliation</h2><span class="hint">Book vs. bank statement</span></div>
            <div class="card">
                <div class="toolbar">
                    <div class="spacer"></div>
                    <button class="btn btn-primary btn-sm" type="button" id="newReconciliationBtn">+ New Reconciliation</button>
                </div>
                <div class="table-wrap">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Bank Account</th>
                                <th>System Balance</th>
                                <th>Bank Statement</th>
                                <th>Difference</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
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
            $('#atCount').textContent = `${rows.length} event(s)`;
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

    function buildSettings() {
        const s = store.settings;
        return `
            <div class="section-title"><h2>Settings</h2><span class="hint">Preferences</span></div>
            <div class="card">
                <div class="card-header"><h3>Company Information</h3></div>
                <div style="padding:22px;">
                    <div class="form-grid">
                        <div class="form-field"><label>Company Name</label><input type="text" id="set-company" value="${escapeHtml(s.company)}" /></div>
                        <div class="form-field">
                            <label>Default Currency</label>
                            <select id="set-currency">
                                <option ${s.currency === 'PHP (₱)' ? 'selected' : ''}>PHP (₱)</option>
                                <option ${s.currency === 'USD ($)' ? 'selected' : ''}>USD ($)</option>
                                <option ${s.currency === 'EUR (€)' ? 'selected' : ''}>EUR (€)</option>
                            </select>
                        </div>
                        <div class="form-field">
                            <label>Reporting Cycle</label>
                            <select id="set-cycle">
                                <option ${s.cycle === 'September 15–30, 2026' ? 'selected' : ''}>September 15–30, 2026</option>
                                <option ${s.cycle === 'Weekly' ? 'selected' : ''}>Weekly</option>
                                <option ${s.cycle === 'Monthly' ? 'selected' : ''}>Monthly</option>
                            </select>
                        </div>
                        <div class="form-field">
                            <label>Working Days / Week</label>
                            <select id="set-days">
                                <option ${s.days === '5 days (Mon–Fri)' ? 'selected' : ''}>5 days (Mon–Fri)</option>
                                <option ${s.days === '6 days (Mon–Sat)' ? 'selected' : ''}>6 days (Mon–Sat)</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-actions">
                        <button class="btn btn-subtle" type="button" id="resetSettingsBtn">Reset</button>
                        <button class="btn btn-primary" type="button" id="saveSettingsBtn">Save Settings</button>
                    </div>
                </div>
            </div>
        `;
    }

    function buildAccount() {
        const username = localStorage.getItem('devs_user') || 'admin';
        const profile = JSON.parse(localStorage.getItem('devs_profile') || '{}');
        const fullName = profile.fullName || 'Administrator';
        const email    = profile.email    || 'admin@devs.com';
        const phone    = profile.phone    || '0917-000-0000';
        const role     = profile.role     || 'Finance Manager';
        const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
        const ini = nameParts.length > 1
            ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
            : (nameParts[0] || username).substring(0, 2).toUpperCase();

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
                    <div class="form-actions">
                        <button class="btn btn-primary" type="button" id="accChangePassBtn">Update Password</button>
                    </div>
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

    /* -------------------- PAGE HANDLERS -------------------- */

    let currentRenderToken = 0;

    function attachPageHandlers(page) {
        const myToken = ++currentRenderToken;
        attachExportHandlers();

        $$('[data-preview-search]').forEach(input => {
            input.addEventListener('input', throttle(() => {
                const key = input.dataset.previewSearch;
                applyPreviewFilters(key);
            }, 100));
        });

        $$('[data-preview-filter]').forEach(select => {
            select.addEventListener('change', () => {
                applyPreviewFilters(select.dataset.previewFilter);
            });
        });

        $$('[data-preview-toggle]').forEach(btn => {
            btn.addEventListener('click', () => {
                const entity = btn.dataset.previewToggle;
                openReportPreview(entity);
            });
        });

        const guard = (fn) => (...args) => {
            if (myToken !== currentRenderToken) return;
            return fn(...args);
        };

        if (page === 'dashboard') {
            $('#dashSearch')?.addEventListener('keydown', (e) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                const q = e.target.value.trim();
                if (q) toast(`Searching for "${q}"…`, 'info');
            });
            $('#dashFilterBtn')?.addEventListener('click', () => {
                toast('Filter controls coming soon.', 'info');
            });

            const filterWrap = $('#finSummaryFilters');
            filterWrap?.addEventListener('click', (e) => {
                const btn = e.target.closest('button[data-status]');
                if (!btn) return;
                const status = btn.dataset.status;

                filterWrap.querySelectorAll('button').forEach(b =>
                    b.classList.toggle('is-active', b === btn)
                );

                const bars = document.querySelectorAll('.fin-summary-bars .fin-summary-bar-col[data-status]');
                bars.forEach(col => {
                    col.style.display = (status === 'all' || col.dataset.status === status) ? '' : 'none';
                });
            });
        }

        if (page === 'chartAccounts') {
            renderAccountRows();

            // Live search — resets to page 1
            $('#accSearch')?.addEventListener('input', throttle(guard(() => {
                coaCurrentPage = 1;
                renderAccountRows();
            }), 100));

            $('#exportAccountsPdf')?.addEventListener('click', () => {
                printAccountsPdf(store.accounts || []);
            });

            $('#addAccountBtn')?.addEventListener('click', (e) => {
                if (!lockElement(e.currentTarget, 500)) return;
                guard(() => src="assets/logo.png")();
            });

            $('#accFilterBtn')?.addEventListener('click', guard(() => {
                toast('Filter controls coming soon.', 'info');
            }));

            // Delegated pagination handler — survives re-renders
            $('#coaPagination')?.addEventListener('click', guard((e) => {
                const btn = e.target.closest('.coa-page-btn');
                if (!btn || btn.disabled) return;
                const target = btn.dataset.page;

                const filteredCount = (store.accounts || []).filter(a => {
                    const q = ($('#accSearch')?.value || '').trim().toLowerCase();
                    return !q || `${a.code} ${a.name} ${a.type}`.toLowerCase().includes(q);
                }).length;

                const realPageCount = Math.ceil(filteredCount / COA_ROWS_PER_PAGE);
                const totalPages    = Math.max(5, realPageCount);

                if (target === 'prev')      coaCurrentPage = Math.max(1, coaCurrentPage - 1);
                else if (target === 'next') coaCurrentPage = Math.min(totalPages, coaCurrentPage + 1);
                else                        coaCurrentPage = Number(target);

                renderAccountRows();
            }));

            $('#accTbody')?.addEventListener('click', throttle(guard(handleAccountAction), 120));
        }

        if (page === 'receivables') {
            renderReceivableRows();
            $('#arSearch')?.addEventListener('input', throttle(guard(renderReceivableRows), 100));
            $('#arStatus')?.addEventListener('change', throttle(guard(renderReceivableRows), 100));
            $('#addArBtn')?.addEventListener('click', (e) => {
                if (!lockElement(e.currentTarget, 500)) return;
                guard(() => openReceivableForm())();
            });
            $('#arTbody')?.addEventListener('click', throttle(guard(handleReceivableAction), 120));
        }

        if (page === 'payables') {
            renderPayableRows();
            $('#apSearch')?.addEventListener('input', throttle(guard(renderPayableRows), 100));
            $('#apStatus')?.addEventListener('change', throttle(guard(renderPayableRows), 100));
            $('#addApBtn')?.addEventListener('click', (e) => {
                if (!lockElement(e.currentTarget, 500)) return;
                guard(() => openPayableForm())();
            });
            $('#apTbody')?.addEventListener('click', throttle(guard(handlePayableAction), 120));
        }

        if (page === 'cashBank') {
            renderCashBankRows();
            $('#cbSearch')?.addEventListener('input', throttle(guard(renderCashBankRows), 100));
            $('#cbType')?.addEventListener('change', throttle(guard(renderCashBankRows), 100));
            $('#cbRecentSearch')?.addEventListener('input', throttle(guard(renderCashBankRows), 100));
            $('#bankReconciliationBtn')?.addEventListener('click', guard(openBankReconciliation));
            $('#addCbBtn')?.addEventListener('click', (e) => {
                if (!lockElement(e.currentTarget, 500)) return;
                guard(() => openCashBankForm())();
            });
            $('#cbTbody')?.addEventListener('click', throttle(guard(handleCashBankAction), 120));
        }

        if (page === 'expenses') {
            renderExpenseRows();
            $('#addExpBtn')?.addEventListener('click', (e) => {
                if (!lockElement(e.currentTarget, 500)) return;
                guard(() => openExpenseForm())();
            });
            $('#expTbody')?.addEventListener('click', throttle(guard(handleExpenseAction), 120));

            $('#expSearch')?.addEventListener('input', throttle(guard((e) => {
                expSearchTerm = e.target.value.trim();
                renderExpenseRows();
            }), 120));

            $('#expFilterBtn')?.addEventListener('click', guard(() => {
                toast('Filter controls coming soon.', 'info');
            }));
        }

        if (page === 'financialTransactions') {
            renderTransactionRows();
            $('#txSearch')?.addEventListener('input', throttle(guard(renderTransactionRows), 100));
            $('#txSource')?.addEventListener('change', throttle(guard(renderTransactionRows), 100));
            $('#txType')?.addEventListener('change', throttle(guard(renderTransactionRows), 100));
            $('#txStatus')?.addEventListener('change', throttle(guard(renderTransactionRows), 100));
            $('#txDate')?.addEventListener('change', throttle(guard(renderTransactionRows), 100));
            $('#addTxBtn')?.addEventListener('click', (e) => {
                if (!lockElement(e.currentTarget, 500)) return;
                guard(() => openTransactionForm())();
            });
            $('#txViewDetails')?.addEventListener('click', guard(() => {
                toast('Detailed view coming soon.', 'info');
            }));
        }

        if (page === 'financialReports') {
            const collect = () => {
                finReportFilters = {
                    from: $('#finFrom')?.value || '',
                    to: $('#finTo')?.value || '',
                    source: $('#finSource')?.value || '',
                    transaction: $('#finTransaction')?.value || '',
                    status: $('#finStatus')?.value || ''
                };
            };
            const rerender = (e) => {
                if (!lockElement(e.currentTarget, 350)) return;
                guard(() => {
                    collect();
                    renderPage('financialReports');
                })();
            };
            $('#finFrom')?.addEventListener('change', rerender);
            $('#finTo')?.addEventListener('change', rerender);
            $('#finSource')?.addEventListener('change', rerender);
            $('#finTransaction')?.addEventListener('change', rerender);
            $('#finStatus')?.addEventListener('change', rerender);

            $('#finGenerateBtn')?.addEventListener('click', guard(() => {
                toast('Report generated successfully.', 'success');
            }));

            $$('[data-report]').forEach(btn => {
                btn.addEventListener('click', guard((e) => {
                    const entity = e.currentTarget.dataset.report;
                    toast(`Preparing ${entity} report…`, 'info');
                    setTimeout(() => downloadExport(entity, e.currentTarget), 400);
                }));
            });
        }

        if (page === 'paymentManagement') {
            renderPaymentRows();
            $('#pmSearch')?.addEventListener('input', throttle(guard(renderPaymentRows), 100));
            $('#addPayBtn')?.addEventListener('click', (e) => {
                if (!lockElement(e.currentTarget, 500)) return;
                guard(() => openPaymentForm())();
            });
        }

        if (page === 'auditTrail') {
            loadAuditTrail();
            $('#atSearch')?.addEventListener('input', throttle(guard(loadAuditTrail), 150));
            $('#atModule')?.addEventListener('change', throttle(guard(loadAuditTrail), 150));
        }

        if (page === 'bankReconciliation') {
            $('#newReconciliationBtn')?.addEventListener('click', guard(openBankReconciliation));
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
                    } catch (error) {
                        toast(error.message, 'error');
                    }
                })();
            });
            $('#accResetBtn')?.addEventListener('click', (e) => {
                if (!lockElement(e.currentTarget, 500)) return;
                guard(() => {
                    renderPage('account');
                    toast('Changes discarded.', 'info');
                })();
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
                        $('#acc-current').value = '';
                        $('#acc-new').value = '';
                        $('#acc-confirm').value = '';
                        toast(result.message);
                    } catch (error) {
                        toast(error.message, 'error');
                    }
                })();
            });
        }

        if (page === 'logout') {
            $('#confirmLogoutBtn')?.addEventListener('click', (e) => {
                if (!lockElement(e.currentTarget, 700)) return;
                guard(() => {
                    setLoggedOut();
                    toast('You have been signed out.', 'info');
                })();
            });
        }
    }

    function applyPreviewFilters(entity) {
        const table = document.querySelector(`[data-preview-table="${entity}"]`);
        if (!table) return;

        const filterSelects = document.querySelectorAll(`[data-preview-filter="${entity}"]`);
        const filters = [];
        filterSelects.forEach(sel => {
            if (sel.value) {
                filters.push({ col: Number(sel.dataset.filterCol), value: sel.value.toLowerCase() });
            }
        });

        const searchInput = document.querySelector(`[data-preview-search="${entity}"]`);
        const q = (searchInput?.value || '').trim().toLowerCase();

        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            if (row.classList.contains('fin-report-empty')) return;

            let matchesFilters = true;
            for (const f of filters) {
                const cell = row.children[f.col];
                const cellText = (cell?.textContent || '').toLowerCase().trim();
                if (cellText !== f.value) { matchesFilters = false; break; }
            }

            const rowText = row.textContent.toLowerCase();
            const matchesSearch = !q || rowText.includes(q);

            row.style.display = (matchesFilters && matchesSearch) ? '' : 'none';
        });
    }

    const handleNavClick = throttle(function (e) {
        e.preventDefault();
        const item = e.currentTarget || e.target?.closest('.nav-item');
        if (!item) return;
        if (item.dataset.busy === 'true') return;
        item.dataset.busy = 'true';
        setTimeout(() => { item.dataset.busy = 'false'; }, 220);

        $$('.nav-item').forEach(link => link.classList.remove('active'));
        const page = item.dataset.page || 'dashboard';

        if (page !== 'logout' && page !== 'account' && !canAccessPage(page)) {
            confirmDialog({
                title: 'Access Denied',
                message: 'Your account does not have permission to access this page. Please contact your HR Administrator.',
                confirmLabel: 'OK',
                danger: true
            });
            const dashLink = document.querySelector('.nav-item[data-page="dashboard"]');
            if (dashLink && canAccessPage('dashboard')) dashLink.classList.add('active');
            if (canAccessPage('dashboard')) renderPage('dashboard');
            return;
        }

        if (page === 'logout') {
            const dashLink = document.querySelector('.nav-item[data-page="dashboard"]');
            if (dashLink) dashLink.classList.add('active');
            localStorage.setItem('devs_last_page', 'dashboard');
            confirmDialog({
                title: 'Sign out of D.E.V.S?',
                message: 'You will be returned to the login screen.',
                confirmLabel: 'Logout',
                danger: true
            }).then((confirmed) => {
                if (confirmed) {
                    setLoggedOut();
                    toast('You have been signed out.', 'info');
                }
            });
            return;
        }

        item.classList.add('active');
        localStorage.setItem('devs_last_page', page);
        renderPage(page);
    }, 200);

    $$('.nav-item').forEach(item => {
        item.addEventListener('click', handleNavClick);
    });

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
    if (currentDateEl) {
        currentDateEl.textContent = new Date().toLocaleDateString('en-US', {
            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
        });
    }

    const loginYearEl = $('#loginYear');
    if (loginYearEl) loginYearEl.textContent = new Date().getFullYear();

    async function restoreSession() {
        const KEY = 'devs_finance_redirect_guard';
        let history = [];
        try { history = JSON.parse(sessionStorage.getItem(KEY) || '[]'); } catch { history = []; }
        const now = Date.now();
        history = history.filter(ts => now - ts < 5000);
        if (history.length >= 3) {
            console.error('Redirect loop detected — stopping.');
            sessionStorage.removeItem(KEY);
            document.body.innerHTML =
                '<div style="padding:40px;font-family:sans-serif;">' +
                '<h2>Session error</h2><p>Please <a href="../index.php">log in again</a>.</p>' +
                '</div>';
            return;
        }

        try {
            const result = await apiRequest('session');
            if (!result.user) {
                history.push(now);
                sessionStorage.setItem(KEY, JSON.stringify(history));
                window.location.href = '../index.php';
                return;
            }
            sessionStorage.removeItem(KEY);

            await syncStateFromServer();
            await loadPageAccess();
            localStorage.setItem('devs_user', result.user.username);
            localStorage.setItem('devs_profile', JSON.stringify(result.user));
            setLoggedIn(result.user.username, result.user);
            applySidebarRestrictions();
            const lastPage = localStorage.getItem('devs_last_page') || 'dashboard';
            markNavActive(lastPage);
            renderPage(lastPage);
        } catch (err) {
            console.warn('restoreSession failed:', err);
            history.push(now);
            sessionStorage.setItem(KEY, JSON.stringify(history));
            window.location.href = '../index.php';
        }
    }

    void restoreSession();
});