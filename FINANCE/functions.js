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

    /* Effective status: unpaid records whose due date has passed show as Overdue,
       even when the stored status is still Open / For review / Due. */
    const effectiveRecordStatus = (rec) => {
        const st = String(rec?.status || '').trim();
        if (/^paid$/i.test(st)) return 'Paid';
        const due = String(rec?.due || '').trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(due) && due < todayDateString()) return 'Overdue';
        return st || 'Pending';
    };

    const payableStatus = (rec) => {
        if (/^paid$/i.test(String(rec?.status || '').trim())) return 'Paid';

        const invoiceRef = String(rec?.invoice || '').trim().toLowerCase();
        const vendorRef = String(rec?.vendor || '').trim().toLowerCase();
        const paymentRows = [
            ...(store.transactions || []).map(t => ({
                id: t.id,
                reference: t.reference,
                amount: t.amount,
                status: t.status,
                description: t.description
            })),
            ...(store.payments || []).map(p => ({
                id: p.id,
                reference: p.reference,
                amount: p.amount,
                status: p.status,
                description: p.description
            }))
        ];
        const paidAmount = paymentRows
            .filter(payment => {
                const reference = String(payment.reference || '').trim().toLowerCase();
                const description = String(payment.description || '').trim().toLowerCase();
                const matchesPaymentId = rec?.paymentId && String(rec.paymentId) === String(payment.id);
                const matchesInvoice = invoiceRef && reference === invoiceRef;
                const matchesVendor = vendorRef && description.includes(vendorRef)
                    && Number(payment.amount || 0) === Number(rec?.amount || 0);
                return (matchesPaymentId || matchesInvoice || matchesVendor)
                    && /completed|paid|approved/i.test(String(payment.status || ''));
            })
            .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

        if (paidAmount >= Number(rec?.amount || 0) && Number(rec?.amount || 0) > 0) return 'Paid';
        return effectiveRecordStatus(rec);
    };

    const currentPayrollCycle = () => {
        const date = new Date();
        const month = date.toLocaleDateString('en-US', { month: 'long' });
        return `${month} 15–30, ${date.getFullYear()}`;
    };

    const SEED = {
        accounts: [],
        receivables: [],
        payables: [],
        cashBank: [],
        expenses: [],
        transactions: [],
        payments: [],
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
                payments:     parsed.payments     || JSON.parse(JSON.stringify(SEED.payments)),
                settings:     parsed.settings     || JSON.parse(JSON.stringify(SEED.settings))
            };
        } catch {
            return JSON.parse(JSON.stringify(SEED));
        }
    }

    const store = loadStore();

    /* Single source of truth for totals: the dashboard reads the same figures
       each module shows, so the numbers cannot drift apart. */
    const sumAmount = (rows, pick) => (rows || []).reduce(
        (sum, row) => sum + Number((pick ? pick(row) : row.amount) || 0), 0);
    const financeTotals = {
        revenue:     () => sumAmount((store.accounts || []).filter(a => a.type === 'Revenue' || a.type === 'Income'), a => a.balance),
        expenses:    () => sumAmount(store.expenses),
        payables:    () => sumAmount(store.payables),
        receivables: () => sumAmount((store.receivables || []).filter(r => r.status !== 'Paid')),
        cashBank:    () => sumAmount(store.cashBank, r => r.balance)
    };

    async function syncStateFromServer() {
        try {
            const result = await apiRequest('state');
            // If the database returns a state object, replace our local store with it
            if (result.state && typeof result.state === 'object' && Object.keys(result.state).length > 0) {
                Object.keys(result.state).forEach(key => {
                    if (result.state[key] !== undefined && result.state[key] !== null) {
                        store[key] = result.state[key];
                    }
                });
                // Save the fresh SQL data to localStorage so it persists on reload
                localStorage.setItem(STORE_KEY, JSON.stringify(store));
            }
        } catch (error) {
            console.warn('Could not sync state from server:', error);
        }
    }

    function saveStore() {
        try {
            localStorage.setItem(STORE_KEY, JSON.stringify(store));
        } catch (e) {
            console.warn('Could not persist store:', e);
        }
        if (!localStorage.getItem('devs_user')) return;

        const payload = {};
        // 'accounts' removed — it's managed via dedicated account.save/update/delete endpoints
        const destructiveKeys = ['receivables', 'payables', 'cashBank', 'expenses', 'transactions'];
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

    function runExportProgress({ filename, format, onDownload }) {
        const overlay = document.createElement('div');
        overlay.className = 'coa-modal-overlay pm-export-overlay open';
        overlay.innerHTML = `
            <div class="coa-modal-content" style="max-width: 450px;">
                <div class="progress-modal">
                    <div class="progress-icon generating">
                        <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    </div>
                    <h3>Generating export</h3>
                    <p id="univProgressFilename" style="color:#c2181a; font-weight:bold; font-size:11px;">${escapeHtml(filename)}</p>
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" id="univProgressFill"></div>
                    </div>
                    <div class="progress-status-text" id="univProgressText">
                        <ul><li>Preparing export data</li></ul>
                    </div>
                    <div class="progress-modal-footer" style="justify-content:center;">
                        <button class="progress-btn-done" type="button" disabled style="opacity:0.5;">DONE</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const fill = overlay.querySelector('#univProgressFill');
        const textList = overlay.querySelector('#univProgressText ul');
        const steps = ['Preparing data records', 'Applying filters & columns', 'Formatting layout', 'Compiling & finalizing file'];

        let step = 0;
        const interval = setInterval(() => {
            step++;
            fill.style.width = `${(step / steps.length) * 100}%`;
            if (step <= steps.length) {
                textList.innerHTML = steps.slice(0, step).map(label => `<li>${escapeHtml(label)}</li>`).join('');
            }

            if (step === steps.length) {
                clearInterval(interval);
                setTimeout(() => {
                    const icon = overlay.querySelector('.progress-icon');
                    icon.className = 'progress-icon success';
                    icon.innerHTML = '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
                    overlay.querySelector('h3').textContent = 'Export completed';
                    const sizeKb = Math.max(12, Math.round(Math.random() * 45 + 20));
                    
                    overlay.querySelector('#univProgressFilename').textContent = 'Your file is ready to download.';
                    overlay.querySelector('.progress-status-text').innerHTML = `
                        <div style="text-align:center; padding:10px; border:1px solid #e0e0e0; border-radius:6px; background:#fafafa; display:flex; justify-content:space-between; align-items:center; font-size:12px; gap:12px;">
                            <span>${escapeHtml(filename)}</span>
                            <span style="color:#888;">${sizeKb}KB</span>
                        </div>`;
                        
                    overlay.querySelector('.progress-modal-footer').innerHTML = `
                        <button class="export-btn-export" id="univDownloadBtn" type="button">Download</button>
                        <button class="export-btn-cancel" id="univCloseBtn" type="button">Close</button>
                    `;
                    
                    overlay.querySelector('#univDownloadBtn')?.addEventListener('click', () => {
                        if (typeof onDownload === 'function') onDownload();
                    });
                    
                    overlay.querySelector('#univCloseBtn')?.addEventListener('click', () => {
                        overlay.remove();
                        if (!document.querySelector('.coa-modal-overlay.open') && !document.querySelector('.pmh-overlay')) {
                            document.body.style.overflow = '';
                        }
                    });
                }, 500);
            }
        }, 650);
    }

    function attachExportHandlers() {
        const allowed = canExportRecords();
        $$('[data-export]').forEach(button => {
            if (!allowed) {
                button.style.display = 'none';
                return;
            }
            button.addEventListener('click', () => {
                const entity = button.dataset.export;
                const filename = `${entity}-${todayDateString()}.csv`;
                runExportProgress({
                    filename: filename,
                    format: 'csv',
                    onDownload: () => downloadExport(entity, button, 'csv')
                });
            });
        });
    }
    function setupCustomDropdowns() {
        if (window._customDropdownsBound) return;
        window._customDropdownsBound = true;

        // Use event delegation on the document body so it works for dynamically added dropdowns
        document.body.addEventListener('click', (e) => {
            const btn = e.target.closest('.custom-filter-btn');
            const option = e.target.closest('.custom-filter-menu li');

            // 1. Handle clicking the dropdown button (toggle open/close)
            if (btn) {
                e.stopPropagation();
                const dropdown = btn.closest('.custom-filter-dropdown');
                const isOpen = dropdown.classList.contains('open');

                // Close all other open dropdowns
                $$('.custom-filter-dropdown').forEach(d => d.classList.remove('open'));

                // Toggle the clicked one
                if (!isOpen) {
                    dropdown.classList.add('open');
                }
                return;
            }

            // 2. Handle clicking an option inside the menu
            if (option) {
                const dropdown = option.closest('.custom-filter-dropdown');
                const btn = dropdown.querySelector('.custom-filter-btn');
                const menu = dropdown.querySelector('.custom-filter-menu');
                const label = btn.querySelector('.cfb-text');
                const defaultText = btn.dataset.defaultText || 'Select';
                const val = option.dataset.value;

                // Clear previous selections
                menu.querySelectorAll('li').forEach(item => item.classList.remove('is-selected'));

                // Toggle logic: if clicking the already active item, reset to default
                if (btn.dataset.value === val) {
                    btn.dataset.value = '';
                    label.textContent = defaultText;
                    btn.classList.remove('is-active');
                } else {
                    btn.dataset.value = val;
                    label.textContent = option.textContent.trim(); // Use the visible text (e.g., "Completed")
                    btn.classList.add('is-active');
                    option.classList.add('is-selected');
                }

                dropdown.classList.remove('open');

                // Trigger the page-specific re-render function based on the current page
                const currentPage = localStorage.getItem('devs_last_page');
                if (currentPage === 'financialTransactions') renderTransactionRows();
                if (currentPage === 'paymentManagement') renderPaymentRows();
                if (currentPage === 'chartAccounts') renderAccountRows();
                if (currentPage === 'payables') renderPayableRows();
                if (currentPage === 'cashBank') renderCashBankRows();
                if (currentPage === 'expenses') renderExpenseRows();
                if (currentPage === 'payables' && dropdown.dataset.id === 'apViewMode') {
                    setPayablesViewMode(val);
                }

                return;
            }

            // 3. Close all dropdowns if clicking outside
            if (!e.target.closest('.custom-filter-dropdown')) {
                $$('.custom-filter-dropdown').forEach(d => d.classList.remove('open'));
            }
        });
    }
    async function downloadExport(entity, button, format = 'csv') {
        if (!canExportRecords()) {
            toast('Your role cannot export records.', 'error');
            return;
        }
        if (!lockElement(button, 600)) return;
        try {
            const url = `${API_URL}?action=export&entity=${encodeURIComponent(entity)}&format=${format}`;
            const response = await fetch(url, { credentials: 'same-origin' });
            if (!response.ok) throw new Error('Export could not be generated.');
            
            if (format === 'pdf') {
                // If PDF, the server sends HTML. Open it in a new tab to trigger print.
                const html = await response.text();
                const newTab = window.open('', '_blank');
                if (newTab) {
                    newTab.document.open();
                    newTab.document.write(html);
                    newTab.document.close();
                    toast('PDF export opened for printing.');
                } else {
                    toast('Please allow pop-ups to export PDF.', 'error');
                }
            } else {
                // If CSV, download as a file
                const blob = await response.blob();
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `${entity}-${todayDateString()}.csv`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(() => URL.revokeObjectURL(link.href), 100);
                toast('CSV export downloaded.');
            }
        } catch (error) {
            toast(error.message, 'error');
        }
    }

    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

    /* ============================================================
       SWIPEABLE TABLES — drag with mouse/pen, native scroll on touch
       ============================================================ */
    const SWIPE_SCROLL_SELECTOR = [
        '.table-wrap',
        '.exd-table-scroll',
        '.pmh-table-wrap',
        '.receivables-table-inner',
        '.bank-recon-scroll',
        '.fin-report-preview'
    ].join(', ');

    let swipeDrag = null;
    let swipeClickGuard = 0;

    function markSwipeable(el) {
        if (!el || el.nodeType !== 1 || !el.matches(SWIPE_SCROLL_SELECTOR)) return;
        el.classList.toggle('is-swipeable', el.scrollWidth - el.clientWidth > 1);
    }

    function refreshSwipeableTables(root = document) {
        if (root.nodeType === 1 && root.matches(SWIPE_SCROLL_SELECTOR)) markSwipeable(root);
        if (root.querySelectorAll) root.querySelectorAll(SWIPE_SCROLL_SELECTOR).forEach(markSwipeable);
    }

    const closestScroller = (target) => (target && target.closest ? target.closest(SWIPE_SCROLL_SELECTOR) : null);

    document.addEventListener('pointerover', (e) => {
        const scroller = closestScroller(e.target);
        if (scroller) markSwipeable(scroller);
    });

    document.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'touch' || e.button !== 0) return; // touch keeps native momentum scrolling
        const scroller = closestScroller(e.target);
        if (!scroller || scroller.scrollWidth - scroller.clientWidth <= 1) return;
        swipeDrag = {
            el: scroller,
            id: e.pointerId,
            startX: e.clientX,
            startLeft: scroller.scrollLeft,
            moved: false
        };
    });

    document.addEventListener('pointermove', (e) => {
        if (!swipeDrag || swipeDrag.id !== e.pointerId) return;
        const dx = e.clientX - swipeDrag.startX;
        if (!swipeDrag.moved) {
            if (Math.abs(dx) < 5) return;
            swipeDrag.moved = true;
            swipeDrag.el.classList.add('is-dragging');
            try { swipeDrag.el.setPointerCapture(e.pointerId); } catch { /* pointer already released */ }
        }
        swipeDrag.el.scrollLeft = swipeDrag.startLeft - dx;
        e.preventDefault();
    }, { passive: false });

    function endSwipeDrag() {
        if (!swipeDrag) return;
        const { el, moved } = swipeDrag;
        swipeDrag = null;
        el.classList.remove('is-dragging');
        if (moved) swipeClickGuard = Date.now();
    }

    /* Swallow the click that follows a completed drag so buttons don't fire. */
    document.addEventListener('click', (e) => {
        if (Date.now() - swipeClickGuard < 350 && closestScroller(e.target)) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, true);

    document.addEventListener('pointerup', endSwipeDrag);
    document.addEventListener('pointercancel', endSwipeDrag);
    window.addEventListener('resize', () => refreshSwipeableTables());
    document.addEventListener('DOMContentLoaded', () => refreshSwipeableTables());

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
        wrap.className = 'ss-wrap custom-filter-dropdown';
        wrap.style.width = '100%';
        wrap.dataset.ssFor = select.id || '';

        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'custom-filter-btn ss-trigger';
        trigger.style.width = '100%';
        trigger.setAttribute('aria-haspopup', 'listbox');
        trigger.setAttribute('aria-expanded', 'false');

        const triggerLabel = document.createElement('span');
        triggerLabel.className = 'cfb-text ss-trigger-label';

        const triggerArrow = document.createElement('span');
        triggerArrow.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>';
        triggerArrow.style.display = 'flex';
        triggerArrow.style.alignItems = 'center';

        trigger.appendChild(triggerLabel);
        trigger.appendChild(triggerArrow);

        const panel = document.createElement('div');
        panel.className = 'custom-filter-menu ss-panel';
        panel.style.width = '100%';
        panel.style.padding = '8px';
        panel.setAttribute('role', 'listbox');
        panel.hidden = true;

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.className = 'ss-search';
        searchInput.placeholder = 'Type to search...';
        searchInput.autocomplete = 'off';
        searchInput.spellcheck = false;

        const list = document.createElement('ul');
        list.className = 'ss-list';
        list.style.listStyle = 'none';
        list.style.padding = '0';
        list.style.margin = '0';
        list.style.maxHeight = '200px';
        list.style.overflowY = 'auto';

        const empty = document.createElement('div');
        empty.className = 'ss-empty';
        empty.textContent = 'No results';
        empty.style.padding = '8px 12px';
        empty.style.fontSize = '13px';
        empty.style.color = '#888';

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
            triggerLabel.textContent = text || 'Select...';
            triggerLabel.classList.toggle('is-placeholder', !select.value);
            trigger.classList.toggle('is-active', !!select.value);
        };

        let filtered = options.slice();

        const renderList = () => {
            list.innerHTML = '';
            let visible = 0;
            filtered.forEach((opt) => {
                if (opt.value === '') return; // Hide empty option in custom dropdown
                
                const item = document.createElement('li');
                item.dataset.value = opt.value;
                item.setAttribute('role', 'option');
                if (opt.value === select.value) item.classList.add('is-selected');
                if (opt.disabled) item.classList.add('is-disabled');
                item.textContent = opt.textContent.trim();
                
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
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
            document.querySelectorAll('.custom-filter-dropdown.open').forEach(d => d.classList.remove('open'));
            panel.hidden = false;
            wrap.classList.add('open');
            trigger.setAttribute('aria-expanded', 'true');
            searchInput.value = '';
            filter('');
            setTimeout(() => searchInput.focus(), 50);
        };
        
        const close = () => {
            if (panel.hidden) return;
            panel.hidden = true;
            wrap.classList.remove('open');
            trigger.setAttribute('aria-expanded', 'false');
        };

        const commit = (value) => {
            select.value = value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            renderTrigger();
            close();
            trigger.focus();
        };

        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (panel.hidden) open(); else close();
        });

        searchInput.addEventListener('input', () => filter(searchInput.value));
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') { e.preventDefault(); close(); trigger.focus(); }
            if (e.key === 'Enter') {
                e.preventDefault();
                const first = list.querySelector('li:not(.is-disabled)');
                if (first) commit(first.dataset.value);
            }
        });

        document.addEventListener('click', (e) => {
            if (panel.hidden) return;
            if (!wrap.contains(e.target)) close();
        });

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
            || event.target.closest('.split-field, .form-field')?.querySelector('input.picker-input');
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

    const statusKey = (status) => {
        const s = String(status).toLowerCase();
        if (['completed', 'paid', 'present', 'active', 'credit', 'ready'].includes(s)) return 'paid';
        if (['approved', 'processed', 'posted', 'closed'].includes(s)) return 'approved';
        if (['pending', 'due', 'review', 'for review', 'on hold', 'late', 'debit'].includes(s)) return 'pending';
        if (['processing', 'ongoing', 'scheduled', 'open', 'on leave'].includes(s)) return 'processing';
        if (['failed', 'rejected', 'overdue', 'reversed', 'terminated'].includes(s)) return 'failed';
        return 'other';
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
        refreshSwipeableTables(modalBody);
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

    /* -------------------- FINANCE DETAIL VIEWS -------------------- */
    const finSumBy = (rows, pick) => (rows || []).reduce(
        (total, row) => total + Number((pick ? pick(row) : row.amount) || 0), 0);

    function finStatusText(status) {
        const raw = String(status || '').trim();
        const s = raw.toLowerCase();
        let cls = 'is-fulfilling';
        if (/paid|approved|completed|complete|posted|reconciled|active/.test(s)) cls = 'is-paid';
        else if (/overdue|failed|reject|void|late|cancel/.test(s)) cls = 'is-overdue';
        else if (/pending|draft|partial|scheduled/.test(s)) cls = 'is-pending';
        return `<span class="status-text ${cls}">${escapeHtml(raw || '—')}</span>`;
    }

    function finDetailModal(title, subtitle, headers, rows, totalLabel, totalValue) {
        const head = headers.map(h => `<th>${escapeHtml(h)}</th>`).join('');
        const body = rows.length
            ? rows.map(cells => `<tr>${cells.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')
            : `<tr><td colspan="${headers.length}" class="fin-detail-empty">No records to show.</td></tr>`;
        openModal({
            title: ' ',
            size: 'lg',
            onCancel: closeModal,
            body: `
                <div class="fin-detail">
                    <h3>${escapeHtml(title)}</h3>
                    <p class="fin-detail-sub">${escapeHtml(subtitle)}</p>
                    <div class="table-wrap">
                        <table class="fin-detail-table">
                            <thead><tr>${head}</tr></thead>
                            <tbody>${body}</tbody>
                        </table>
                    </div>
                    ${totalLabel ? `<div class="fin-detail-total"><span>${escapeHtml(totalLabel)}</span><strong>${escapeHtml(totalValue)}</strong></div>` : ''}
                    <div class="fin-detail-actions"><button class="acc-btn-cancel" type="button" data-act="cancel">Close</button></div>
                </div>
            `
        });
    }

    function openFinanceCardDetail(key) {
        if (key === 'revenue') {
            const rows = (store.accounts || []).filter(a => a.type === 'Revenue' || a.type === 'Income');
            finDetailModal('Total Revenue', 'Balances of the revenue and income accounts.',
                ['Code', 'Account', 'Type', 'Balance'],
                rows.map(a => [escapeHtml(a.code), escapeHtml(a.name), escapeHtml(a.type),
                    `<span class="fin-detail-amount">${peso(a.balance)}</span>`]),
                'Total revenue', peso(finSumBy(rows, r => r.balance)));
            return;
        }
        if (key === 'expenses') {
            const rows = [...(store.expenses || [])].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
            finDetailModal('Total Expenses', 'Every recorded expense voucher.',
                ['Date', 'Category', 'Description', 'Amount'],
                rows.map(r => [escapeHtml(r.date || '—'), escapeHtml(r.category || '—'),
                    escapeHtml(r.description || r.vendor || '—'),
                    `<span class="fin-detail-amount">${peso(r.amount)}</span>`]),
                'Total expenses', peso(finSumBy(rows)));
            return;
        }
        if (key === 'payables') {
            const rows = store.payables || [];
            finDetailModal('Total Account Payable', 'All vendor bills, including paid ones.',
                ['Invoice', 'Vendor', 'Due date', 'Amount', 'Status'],
                rows.map(r => [escapeHtml(r.invoice), escapeHtml(r.vendor), escapeHtml(r.due),
                    `<span class="fin-detail-amount">${peso(r.amount)}</span>`,
                    finStatusText(effectiveRecordStatus(r))]),
                'Total payables', peso(finSumBy(rows)));
            return;
        }
        if (key === 'receivables') {
            const rows = (store.receivables || []).filter(r => r.status !== 'Paid');
            finDetailModal('Total Account Receivable', 'Unpaid customer invoices.',
                ['Invoice', 'Customer', 'Due date', 'Amount', 'Status'],
                rows.map(r => [escapeHtml(r.invoice), escapeHtml(r.customer), escapeHtml(r.due),
                    `<span class="fin-detail-amount">${peso(r.amount)}</span>`,
                    finStatusText(effectiveRecordStatus(r))]),
                'Outstanding receivable', peso(finSumBy(rows)));
            return;
        }
        if (key === 'cash') {
            const rows = store.cashBank || [];
            finDetailModal('Cash/Bank Balance', 'Every cash and bank account.',
                ['Account', 'Type', 'Account no.', 'Balance'],
                rows.map(r => [escapeHtml(r.account), escapeHtml(r.type || '—'),
                    escapeHtml(r.account_no || r.accountNo || '—'),
                    `<span class="fin-detail-amount">${peso(r.balance)}</span>`]),
                'Total balance', peso(finSumBy(rows, r => r.balance)));
        }
    }

    function openTransactionDetail(tx) {
        if (!tx) return;
        finDetailModal('Transaction ' + (tx.reference || tx.id), 'Details for this financial transaction.',
            ['Field', 'Value'],
            [
                ['Reference', escapeHtml(tx.reference || '—')],
                ['Date', escapeHtml(tx.date || '—')],
                ['Source', escapeHtml(tx.source || '—')],
                ['Description', escapeHtml(tx.description || '—')],
                ['Account', escapeHtml(tx.accountCode || '—')],
                ['Status', finStatusText(tx.status)],
                ['Amount', `<span class="fin-detail-amount">${peso(tx.amount)}</span>`]
            ], 'Amount', peso(tx.amount));
    }

    function openExpenseCategoryDetail(cat) {
        const grouped = groupExpenseCats(store.expenses || []);
        const topCats = grouped.filter(([name]) => name !== 'Others').map(([name]) => name);
        const rows = (store.expenses || []).filter(r => {
            const name = r.category || 'Others';
            return cat === 'Others' ? !topCats.includes(name) : name === cat;
        });
        finDetailModal(String(cat) + ' expenses', 'Expense vouchers in this category.',
            ['Date', 'Description', 'Amount', 'Status'],
            rows.map(r => [escapeHtml(r.date || '—'), escapeHtml(r.description || r.vendor || '—'),
                `<span class="fin-detail-amount">${peso(r.amount)}</span>`,
                finStatusText(expStatusMeta(r.status).label)]),
            'Category total', peso(finSumBy(rows)));
    }

    if (dashboardPanel) {
        dashboardPanel.addEventListener('click', (e) => {
            const card = e.target.closest('[data-fin-detail]');
            if (card) { e.preventDefault(); openFinanceCardDetail(card.dataset.finDetail); return; }
            const bar = e.target.closest('[data-tx-id]');
            if (bar) {
                const tx = (store.transactions || []).find(t => String(t.id) === String(bar.dataset.txId));
                if (tx) openTransactionDetail(tx);
                return;
            }
            const slice = e.target.closest('[data-exp-cat]');
            if (slice) openExpenseCategoryDetail(slice.dataset.expCat);
        });
        dashboardPanel.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            const target = e.target.closest('[data-fin-detail], [data-tx-id], [data-exp-cat]');
            if (!target) return;
            e.preventDefault();
            target.click();
        });
    }

    /* ============================================================
       PAYMENT MANAGEMENT — data + shared helpers
       ============================================================ */
    const PM_METHODS = ['Bank Transfer', 'Cash', 'Check', 'E-Wallet'];

    const pmYmd = (date) =>
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    const pmParseDate = (value) => {
        const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''));
        if (!match) return null;
        return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    };

    const pmDateText = (value) => {
        const date = pmParseDate(value);
        if (!date) return '—';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const pmStatusMeta = (status) => {
        const value = String(status || '').trim().toLowerCase();
        if (['paid', 'completed', 'successful', 'success'].includes(value)) {
            return { key: 'paid', label: 'Completed', pill: 'success' };
        }
        if (['approved', 'processing'].includes(value)) {
            return { key: 'processing', label: 'Processing', pill: 'info' };
        }
        if (['failed', 'declined', 'error'].includes(value)) {
            return { key: 'failed', label: 'Failed', pill: 'danger' };
        }
        if (['reversed', 'rejected', 'cancelled', 'canceled', 'void'].includes(value)) {
            return { key: 'reversed', label: 'Reversed', pill: 'danger' };
        }
        return { key: 'pending', label: 'Pending', pill: 'warning' };
    };

    const pmPeriodText = (value) => {
        const date = pmParseDate(value);
        if (!date) return '—';
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        const half = date.getDate() <= 15 ? '1–15' : `16–${lastDay}`;
        return `${date.toLocaleDateString('en-US', { month: 'short' })} ${half}, ${date.getFullYear()}`;
    };

    function pmPaymentRows() {
        return (store.payables || []).map((row) => {
            const dateValue = row.invoiceDate || row.due || row.date || '';
            const date = pmParseDate(dateValue);
            const year = date ? date.getFullYear() : new Date().getFullYear();
            const numericId = String(row.id ?? row.paymentId ?? '').replace(/[^0-9]/g, '');
            const meta = pmStatusMeta(row.status);
            return {
                key: String(row.id ?? row.paymentId ?? numericId),
                id: row.paymentId || `PAY-${year}-${String(numericId || 0).padStart(4, '0')}`,
                shortId: `PAY-${String(numericId || 0).padStart(3, '0')}`,
                reference: row.invoice || row.reference || '—',
                date: dateValue,
                dateText: pmDateText(dateValue),
                period: row.payPeriod || row.period || pmPeriodText(dateValue),
                payee: row.vendor || row.payee || row.supplier || 'Unknown',
                amount: Number(row.amount || 0),
                method: row.paymentMethod || row.method || 'Bank Transfer',
                type: row.paymentType || 'Supplier',
                account: row.paymentAccount || '',
                attachment: row.attachmentName || '',
                status: meta,
                rawStatus: row.status || ''
            };
        });
    }

    let pmRangeInitialised = false;
    let pmDateFrom = '';
    let pmDateTo = '';

    function pmEnsureRange(rows) {
        if (pmRangeInitialised) return;
        pmRangeInitialised = true;
        const now = new Date();
        let min = null;
        let max = null;
        rows.forEach((row) => {
            const date = pmParseDate(row.date);
            if (!date) return;
            if (!min || date < min) min = date;
            if (!max || date > max) max = date;
        });
        const first = min || now;
        const last = max || now;
        pmDateFrom = pmYmd(new Date(first.getFullYear(), first.getMonth(), 1));
        pmDateTo = pmYmd(new Date(last.getFullYear(), last.getMonth() + 1, 0));
    }

    function pmRangeLabel(from, to) {
        const start = pmParseDate(from);
        const end = pmParseDate(to);
        if (!start && !end) return 'All time';
        if (start && !end) {
            return `From ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        }
        if (!start && end) {
            return `Until ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        }
        const sameMonth = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
        const startLabel = `${start.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()} ${start.getDate()}`;
        const endLabel = sameMonth
            ? String(end.getDate())
            : `${end.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()} ${end.getDate()}`;
        return `${startLabel} - ${endLabel}, ${end.getFullYear()}`;
    }

    function pmFilteredRows(rows) {
        const q = ($('#pmSearch')?.value || '').trim().toLowerCase();
        const status = $('.custom-filter-dropdown[data-id="pmStatus"] .custom-filter-btn')?.dataset.value || '';
        return rows.filter((row) => {
            if (q) {
                const haystack = `${row.id} ${row.shortId} ${row.reference} ${row.payee} ${row.method} ${row.status.label} ${row.rawStatus}`.toLowerCase();
                if (!haystack.includes(q)) return false;
            }
            if (status && row.status.key !== status) return false;
            if (pmDateFrom && row.date && row.date < pmDateFrom) return false;
            if (pmDateTo && row.date && row.date > pmDateTo) return false;
            return true;
        });
    }

    function pmStatSums(rows) {
        return {
            total: rows.reduce((sum, r) => sum + r.amount, 0),
            pending: rows.filter(r => r.status.key === 'pending').reduce((sum, r) => sum + r.amount, 0),
            completed: rows.filter(r => r.status.key === 'paid').reduce((sum, r) => sum + r.amount, 0),
            failed: rows.filter(r => r.status.key === 'failed' || r.status.key === 'reversed').reduce((sum, r) => sum + r.amount, 0)
        };
    }

    function buildPaymentManagement() {
        const rows = pmPaymentRows();
        pmEnsureRange(rows);
        const sums = pmStatSums(rows);

        const monthKey = todayDateString().slice(0, 7);
        const thisMonth = rows
            .filter(r => String(r.date || '').slice(0, 7) === monthKey)
            .reduce((sum, r) => sum + r.amount, 0);

        const icons = {
            total: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h10M7 13h6"/></svg>',
            pending: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/></svg>',
            completed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>',
            failed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/></svg>',
            month: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M8 14h3M14 14h3M8 17h3"/></svg>'
        };

        const stats = [
            { label: 'Total Payments', value: peso(sums.total), icon: icons.total, cls: 'pm-stat-total' },
            { label: 'Pending', value: peso(sums.pending), icon: icons.pending, cls: 'pm-stat-pending' },
            { label: 'Completed', value: peso(sums.completed), icon: icons.completed, cls: 'pm-stat-completed' },
            { label: 'Failed', value: peso(sums.failed), icon: icons.failed, cls: 'pm-stat-failed' },
            { label: 'Total Payment This Month', value: peso(thisMonth), icon: icons.month, cls: 'pm-stat-month' }
        ];

        const typeTotals = new Map([
            ['Supplier', 0],
            ['Customer', 0],
            ['Expense', 0],
            ['Payroll', 0]
        ]);
        rows.forEach((row) => {
            const key = typeTotals.has(row.type) ? row.type : 'Supplier';
            typeTotals.set(key, typeTotals.get(key) + row.amount);
        });
        const summaryRows = [
            ['Supplier Payment', typeTotals.get('Supplier')],
            ['Customer Collection', typeTotals.get('Customer')],
            ['Expenses', typeTotals.get('Expense')],
            ['Payroll', typeTotals.get('Payroll')]
        ];

        const methodTotals = new Map(PM_METHODS.map((method) => [method, 0]));
        rows.forEach((row) => {
            const key = row.method || 'Not specified';
            methodTotals.set(key, (methodTotals.get(key) || 0) + row.amount);
        });
        const methodRows = Array.from(methodTotals.entries())
            .filter(([method, amount]) => PM_METHODS.includes(method) || amount > 0);
        const methodOptions = Array.from(new Set([...PM_METHODS, ...rows.map(r => r.method).filter(Boolean)]));

        return `
            <div class="pm-top-actions">
                <button class="pm-history-btn" type="button" id="pmHistoryBtn">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>
                    </svg>
                    Payment History
                </button>
            </div>

            <div class="payables-stat-grid-five pm-stat-grid">
                ${stats.map((stat) => `
                    <div class="fin-stat-card payables-stat-card ${stat.cls}">
                        <div class="fin-stat-head">
                            <span class="fin-stat-icon">${stat.icon}</span>
                            <span class="fin-stat-label">${stat.label}</span>
                        </div>
                        <div class="fin-stat-value">${stat.value}</div>
                    </div>
                `).join('')}
            </div>

            <div class="payment-summary-grid">
                <section class="card payment-summary-card">
                    <div class="payment-summary-head"><h3>Payment Summary</h3></div>
                    <div class="summary-text-list">
                        ${summaryRows.map(([label, amount]) => `
                            <div><span>${label}</span><strong>${peso(amount)}</strong></div>
                        `).join('')}
                    </div>
                </section>

                <section class="card payment-summary-card">
                    <div class="payment-summary-head"><h3>Payment Methods</h3></div>
                    <div class="summary-text-list">
                        ${methodRows.map(([label, amount]) => `
                            <div><span>${label}</span><strong>${peso(amount)}</strong></div>
                        `).join('')}
                    </div>
                </section>
            </div>

            <section class="exd-card exd-records">
                <div class="exd-records-head">
                    <h3 class="exd-title">Payment Records</h3>
                    <div class="exd-tools">
                        <label class="exd-search">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
                            <input type="search" id="pmSearch" placeholder="Search..." />
                        </label>
                        <!-- Removed Method filter since all payments are Bank Transfer -->                        <div class="custom-filter-dropdown" data-id="pmStatus">
                            <button type="button" class="custom-filter-btn" data-value="" data-default-text="Status">
                                <span class="cfb-text">Status</span>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
                            </button>
                            <ul class="custom-filter-menu">
                                <li data-value="paid">Completed</li>
                                <li data-value="pending">Pending</li>
                                <li data-value="processing">Processing</li>
                                <li data-value="failed">Failed</li>
                            </ul>
                        </div>
                        <label class="fr-date" onclick="event.preventDefault(); var i=this.querySelector('input[type=date]'); if(i){ if(typeof i.showPicker==='function') i.showPicker(); else i.focus(); }"><span>From</span><input type="date" id="pmFrom" value="${escapeHtml(pmDateFrom)}" aria-label="From date" /></label>
                        <label class="fr-date" onclick="event.preventDefault(); var i=this.querySelector('input[type=date]'); if(i){ if(typeof i.showPicker==='function') i.showPicker(); else i.focus(); }"><span>To</span><input type="date" id="pmTo" value="${escapeHtml(pmDateTo)}" aria-label="To date" /></label>
                        ${canManageRecords() ? '<button class="exd-add-btn" type="button" id="addPayBtn">+ Record Payment</button>' : ''}
                    </div>
                </div>
                <div class="exd-table-scroll">
                    <table class="exd-table" id="pmTable">
                        <thead>
                            <tr>
                                <th>Payment</th>
                                <th>Reference</th>
                                <th>Date</th>
                                <th>Payee / Payer</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody id="pmTbody"></tbody>
                    </table>
                </div>
                ${canExportRecords() ? `
                <div class="exd-foot">
                    <button class="exd-export-btn" type="button" id="pmExportBtn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M8 11l4 4 4-4M3 21h18"/></svg>
                        Export CSV
                    </button>
                </div>` : ''}
            </section>
        `;
    }

    function openPaymentForm(prefill = null) {
        const today = todayDateString();

        const accounts = ['BDO Operating', 'BPI Payroll', 'Petty Cash', 'Cash on Hand'];
        const methods  = ['Cash', 'Bank Transfer', 'Check', 'E-Wallet'];
        const types    = ['Supplier', 'Customer', 'Expense', 'Payroll'];

        const outstanding = (store.payables || []).find(row => String(row.status || '').toLowerCase() !== 'paid');
        const payload = prefill || {
            payee: outstanding?.vendor || 'ABC Supplies',
            date: today,
            type: 'Supplier',
            reference: outstanding?.invoice || '',
            amount: outstanding ? Number(outstanding.amount || 0) : '',
            method: '',
            account: ''
        };

        openSplitModal({
            heading: 'RECORD PAYMENT',
            subtitle: 'Fill in the necessary details to record a payment.',
            body: `
            <form id="payForm" novalidate class="split-form">
                <section class="split-section">
                    ${splitHeader('coin', 'Payment Details')}
                    <div class="split-grid">
                        <div class="split-field full">
                            <label>Payee</label>
                            <input type="text" value="${escapeHtml(payload.payee)}" readonly />
                        </div>
                        <div class="split-field">
                            <label for="pay-date">Payment Date</label>
                            <input class="picker-input" type="date" id="pay-date" name="date" value="${escapeHtml(payload.date)}" required />
                        </div>
                        <div class="split-field">
                            <label for="pay-type">Payment Type</label>
                            <select id="pay-type" name="type">
                                ${types.map(t => `<option ${t === payload.type ? 'selected' : ''}>${t}</option>`).join('')}
                            </select>
                        </div>
                        <div class="split-field">
                            <label for="pay-reference">Reference No.</label>
                            <input type="text" id="pay-reference" name="reference" placeholder="Enter reference number" value="${escapeHtml(payload.reference)}" />
                        </div>
                        <div class="split-field">
                            <label for="pay-amount">Amount</label>
                            ${splitPeso(`<input type="number" id="pay-amount" name="amount" min="0" step="100" placeholder="Enter Amount" value="${payload.amount === '' ? '' : Number(payload.amount)}" required />`)}
                        </div>
                        <div class="split-field">
                            <label for="pay-method">Payment Method</label>
                            <select id="pay-method" name="method" required>
                                <option value="">Select Method</option>
                                ${methods.map(m => `<option ${m === payload.method ? 'selected' : ''}>${m}</option>`).join('')}
                            </select>
                            <span class="error-text">Select a payment method.</span>
                        </div>
                        <div class="split-field">
                            <label for="pay-account">Account</label>
                            <select id="pay-account" name="account" required>
                                <option value="">Select Account</option>
                                ${accounts.map(a => `<option ${a === payload.account ? 'selected' : ''}>${a}</option>`).join('')}
                            </select>
                            <span class="error-text">Select an account.</span>
                        </div>
                    </div>
                </section>

                <section class="split-section">
                    ${splitHeader('clip', 'Proof / Receipt')}
                    <div class="split-grid">
                        <div class="split-field full">
                            <label class="upload-box" for="pay-attachment">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M12 16V4m0 0-4 4m4-4 4 4"/>
                                    <path d="M20 16v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3"/>
                                </svg>
                                <strong>Click to upload drag and drop</strong>
                                <small>(PDF, JPG, PNG - up to 5MB)</small>
                                <input type="file" id="pay-attachment" name="attachment" accept="application/pdf,image/png,image/jpeg" />
                                <span class="upload-file-name" id="pay-attachment-name"></span>
                            </label>
                        </div>
                    </div>
                </section>

                ${splitActions('Save Payment')}
            </form>`
        });

        const closeSheet = closeModal;

        const form = document.getElementById('payForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(form).entries());

            let valid = true;
            const mark = (name, err) => {
                const f = form.querySelector(`[name="${name}"]`)?.closest('.split-field');
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
                attachmentName: document.getElementById('pay-attachment')?.files?.[0]?.name || ''
            };

            store.payables.unshift(newRow);
            saveStore();
            pmRangeInitialised = false;
            pmDateFrom = '';
            pmDateTo = '';
            pmhRangeInitialised = false;
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

        const all = pmPaymentRows();
        pmEnsureRange(all);
        const rows = pmFilteredRows(all);

        const countEl = $('#pmResultCount');
        if (countEl) {
            const totalAmount = rows.reduce((sum, row) => sum + row.amount, 0);
            countEl.textContent = `${rows.length} payment${rows.length === 1 ? '' : 's'} · ${peso(totalAmount)}`;
        }

        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">◌</div><strong>No payment records</strong><p>No payments match the current filters.</p></div></td></tr>`;
            return;
        }

        tbody.innerHTML = rows.map((row) => `
            <tr>
                <td class="exd-id">${escapeHtml(row.shortId)}</td>
                <td>${escapeHtml(row.reference)}</td>
                <td class="exd-date">${escapeHtml(row.dateText)}</td>
                <td>${escapeHtml(row.payee)}</td>
                <td class="exd-amount">${peso(row.amount)}</td>
                <td><span class="exd-status exd-status-${escapeHtml(row.status.key)}">${escapeHtml(row.status.label)}</span></td>
                <td>
                    <button class="btn-view-cash" type="button" data-pm-view="${escapeHtml(row.key)}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>
                        View
                    </button>
                </td>
            </tr>
        `).join('');
    }

    function openPaymentView(payment) {
        if (!payment) return;

        const row = (label, value) => `<div class="view-modal-row"><span>${label}</span> <strong>${value}</strong></div>`;

        openModal({
            title: ' ',
            size: 'md',
            onCancel: closeModal,
            body: `
                <div class="view-modal-split">
                    <!-- Left Panel: Branding -->
                    <div class="view-modal-left">
                        <div style="display:flex; align-items:center; gap:10px; margin-bottom:32px;">
                            <img src="assets/logo.png" style="height:44px; width:auto; object-fit:contain; flex-shrink:0;" alt="DEVS logo">
                            <img src="assets/icon-devs.png" style="width:150px; height:auto; object-fit:contain;" alt="DEVS">
                        </div>

                        <h3 style="margin-bottom:8px; font-size:18px; font-weight:700;">PAYMENT DETAILS</h3>
                        <p style="margin:0; font-size:13px; line-height:1.5; color:rgba(255,255,255,0.85);">Review the details of this recorded payment.</p>

                        <!-- Paper Icon -->
                        <div style="margin-top:auto; padding-bottom:20px; display:flex; justify-content:center; align-items:flex-end;">
                            <img src="assets/tilted-paper.png" style="width: 140px; height: auto; object-fit: contain; opacity: 0.3;" alt="Paper Icon" />
                        </div>
                    </div>

                    <!-- Right Panel: Details -->
                    <div class="view-modal-right">
                        <h2>Payment Details</h2>
                        <p class="view-subtitle">${escapeHtml(payment.id)}</p>

                        <div class="view-data-list">
                            ${row('Payment ID:', escapeHtml(payment.id))}
                            ${row('Reference No.:', escapeHtml(payment.reference))}
                            ${row('Payment Date:', escapeHtml(payment.dateText))}
                            ${row('Payee / Payer:', escapeHtml(payment.payee))}
                            ${row('Amount:', peso(payment.amount))}
                            ${row('Payment Method:', escapeHtml(payment.method))}
                            ${row('Payment Type:', escapeHtml(payment.type))}
                            ${row('Pay Period:', escapeHtml(payment.period))}
                            ${payment.account ? row('Account:', escapeHtml(payment.account)) : ''}
                            ${payment.attachment ? row('Proof / Receipt:', escapeHtml(payment.attachment)) : ''}
                            ${row('Status:', `<span class="exd-status exd-status-${payment.status.key}">${escapeHtml(payment.status.label)}</span>`)}
                        </div>

                        <div style="text-align:right; margin-top:40px;">
                            <button class="acc-btn-cancel" type="button" data-act="cancel">Close</button>
                        </div>
                    </div>
                </div>
            `
        });

        // Apply the exact split modal styling used by the other View Details modals
        const modalEl = document.getElementById('modal');
        if (modalEl) modalEl.className = 'modal modal-split receivable-view-modal';
    }

    /* ============================================================
       PAYMENT HISTORY — overlay panel
       ============================================================ */
    let pmhRangeInitialised = false;
    let pmhFrom = '';
    let pmhTo = '';
    let pmhStatus = 'all';
    let pmhEscapeBound = false;

    function pmhEnsureRange(rows) {
        if (pmhRangeInitialised) return;
        pmhRangeInitialised = true;
        let min = null;
        rows.forEach((row) => {
            const date = pmParseDate(row.date);
            if (!date) return;
            if (!min || date < min) min = date;
        });
        const now = new Date();
        const first = min || now;
        pmhFrom = pmYmd(new Date(first.getFullYear(), first.getMonth(), 1));
        pmhTo = pmYmd(now);
    }

    function pmhInRange(row) {
        if (pmhFrom && row.date && row.date < pmhFrom) return false;
        if (pmhTo && row.date && row.date > pmhTo) return false;
        return true;
    }

    function renderPaymentHistory(overlay) {
        if (!overlay) return;
        const body = overlay.querySelector('#pmhBody');
        if (!body) return;

        const all = pmPaymentRows();
        pmhEnsureRange(all);
        const rangeRows = all.filter(pmhInRange);
        const rows = rangeRows.filter(row => pmhStatus === 'all' || row.status.key === pmhStatus);

        const sumOf = (keys) => rangeRows
            .filter(row => keys.includes(row.status.key))
            .reduce((sum, row) => sum + row.amount, 0);

        const cards = [
            { label: 'Total Disbursed', value: sumOf(['paid', 'pending', 'failed']), cls: 'total' },
            { label: 'Completed', value: sumOf(['paid']), cls: 'success' },
            { label: 'Pending', value: sumOf(['pending']), cls: 'pending' },
            { label: 'Failed', value: sumOf(['failed']), cls: 'failed' }
        ];

        const filters = [
            ['all', 'All'],
            ['paid', 'Completed'],
            ['pending', 'Pending'],
            ['failed', 'Failed']
        ];

        body.innerHTML = `
            <div class="pmh-stats">
                ${cards.map(card => `
                    <div class="pmh-stat ${card.cls}">
                        <div class="pmh-stat-label">${escapeHtml(card.label)}</div>
                        <div class="pmh-stat-value">${peso(card.value)}</div>
                    </div>
                `).join('')}
            </div>

            <div class="pmh-filters">
                ${filters.map(([key, label]) => `
                    <button class="pmh-pill ${pmhStatus === key ? 'active' : ''}" type="button" data-pmh-filter="${key}">${label}</button>
                `).join('')}
            </div>

            <div class="pmh-table-card">
                <div class="pmh-table-wrap">
                    <table class="pmh-table">
                        <thead>
                            <tr>
                                <th>Payment ID</th>
                                <th>Employee</th>
                                <th>Pay Period</th>
                                <th>Net Amount</th>
                                <th>Method</th>
                                <th>Status</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows.length ? rows.map(row => `
                                <tr>
                                    <td><span class="pm-id">${escapeHtml(row.id)}</span></td>
                                    <td>
                                        <div class="pmh-emp">
                                            <span class="pmh-avatar">${escapeHtml(initials(row.payee))}</span>
                                            <div>
                                                <strong>${escapeHtml(row.payee)}</strong>
                                                <small>${escapeHtml(row.type)}</small>
                                            </div>
                                        </div>
                                    </td>
                                    <td>${escapeHtml(row.period)}</td>
                                    <td class="pmh-amount">${peso(row.amount)}</td>
                                    <td>${escapeHtml(row.method)}</td>
                                    <td><span class="pill ${row.status.pill}">${escapeHtml(row.status.label)}</span></td>
                                    <td>${escapeHtml(row.dateText)}</td>
                                </tr>
                            `).join('') : `
                                <tr><td colspan="7"><div class="empty-state"><div class="empty-icon">◌</div><strong>No payment history</strong><p>No payments match the selected filters.</p></div></td></tr>
                            `}
                        </tbody>
                    </table>
                </div>
                <div class="pmh-foot">Showing ${rows.length} of ${rangeRows.length} payments</div>
            </div>
        `;
    }

    function openPaymentHistory() {
        const all = pmPaymentRows();
        pmhEnsureRange(all);

        const overlay = document.createElement('div');
        overlay.className = 'pmh-overlay';
        overlay.innerHTML = `
            <div class="pmh-panel" role="dialog" aria-modal="true" aria-label="Payment History">
                <div class="pmh-head">
                    <div>
                        <h2>Payment History</h2>
                        <p>Complete record of disbursed, pending and reversed payments.</p>
                    </div>
                    <button class="pmh-close" type="button" id="pmhClose" aria-label="Close payment history">&times;</button>
                </div>

                <div class="pmh-toolbar">
                    <label class="fr-date" onclick="event.preventDefault(); var i=this.querySelector('input[type=date]'); if(i){ if(typeof i.showPicker==='function') i.showPicker(); else i.focus(); }"><span>From</span><input type="date" id="pmhFrom" value="${escapeHtml(pmhFrom)}" aria-label="From date" /></label>
                    <label class="fr-date" onclick="event.preventDefault(); var i=this.querySelector('input[type=date]'); if(i){ if(typeof i.showPicker==='function') i.showPicker(); else i.focus(); }"><span>To</span><input type="date" id="pmhTo" value="${escapeHtml(pmhTo)}" aria-label="To date" /></label>

                    ${canExportRecords() ? '<button class="pmh-export" type="button" id="pmhExportBtn">Export Now</button>' : ''}
                </div>

                <div class="pmh-body" id="pmhBody"></div>
            </div>
        `;
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';

        renderPaymentHistory(overlay);
        refreshSwipeableTables(overlay);

        const closeOverlay = () => {
            overlay.remove();
            if (!document.querySelector('.coa-modal-overlay.open')) {
                document.body.style.overflow = '';
            }
        };

        overlay.querySelector('#pmhClose')?.addEventListener('click', closeOverlay);

        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) closeOverlay();
        });

        const commitHistoryRange = () => {
            const from = overlay.querySelector('#pmhFrom')?.value || '';
            const to = overlay.querySelector('#pmhTo')?.value || '';
            if (from && to && from > to) {
                toast('The start date cannot be after the end date.', 'error');
                const fromInput = overlay.querySelector('#pmhFrom');
                const toInput = overlay.querySelector('#pmhTo');
                if (fromInput) fromInput.value = pmhFrom;
                if (toInput) toInput.value = pmhTo;
                return;
            }
            pmhFrom = from;
            pmhTo = to;
            renderPaymentHistory(overlay);
        };

        overlay.querySelector('#pmhFrom')?.addEventListener('change', commitHistoryRange);
        overlay.querySelector('#pmhTo')?.addEventListener('change', commitHistoryRange);
        overlay.querySelectorAll('.fr-date').forEach((label) => {
            label.style.cursor = 'pointer';
            label.addEventListener('click', (event) => {
                event.preventDefault();
                const input = label.querySelector('input[type="date"]');
                if (!input) return;
                if (typeof input.showPicker === 'function') input.showPicker();
                else input.focus();
            });
        });

        if (!pmhEscapeBound) {
            pmhEscapeBound = true;
            document.addEventListener('keydown', (event) => {
                if (event.key !== 'Escape') return;
                const active = document.querySelector('.pmh-overlay');
                if (!active) return;
                if (document.querySelector('.pm-export-overlay')) return;
                active.remove();
                if (!document.querySelector('.coa-modal-overlay.open')) document.body.style.overflow = '';
            });
        }

        overlay.querySelector('#pmhBody')?.addEventListener('click', (event) => {
            const filter = event.target.closest('[data-pmh-filter]');
            if (!filter) return;
            pmhStatus = filter.dataset.pmhFilter;
            renderPaymentHistory(overlay);
        });

        overlay.querySelector('#pmhExportBtn')?.addEventListener('click', () => {
            const all = pmPaymentRows();
            pmhEnsureRange(all);
            const inRange = all.filter(pmhInRange);
            const rows = inRange.filter(row => pmhStatus === 'all' || row.status.key === pmhStatus);
            
            if (!rows.length) {
                toast('There are no records to export.', 'error');
                return;
            }

            const columns = PM_EXPORT_COLUMNS.history;
            const headers = columns.map(c => c.label);
            const csvRows = rows.map(row => columns.map(c => c.value(row)));
            const stamp = todayDateString();
            const filename = `DEVS_PaymentHistory_${stamp}.csv`;

            runExportProgress({
                filename: filename,
                format: 'csv',
                onDownload: () => {
                    pmExportCsv(filename, headers, csvRows);
                    toast('CSV export downloaded.', 'success');
                }
            });
        });
    }

    /* ============================================================
       PAYMENT EXPORT — reuse the Chart of Accounts export design
       ============================================================ */
    const PM_EXPORT_COLUMNS = {
        records: [
            { key: 'id', label: 'Payment ID', value: row => row.shortId },
            { key: 'reference', label: 'Reference', value: row => row.reference },
            { key: 'date', label: 'Date', value: row => row.dateText },
            { key: 'payee', label: 'Payee / Payer', value: row => row.payee },
            { key: 'amount', label: 'Amount', value: row => row.amount },
            { key: 'status', label: 'Status', value: row => row.status.label },
            { key: 'method', label: 'Method', value: row => row.method }
        ],
        history: [
            { key: 'id', label: 'Payment ID', value: row => row.id },
            { key: 'employee', label: 'Employee', value: row => row.payee },
            { key: 'period', label: 'Pay Period', value: row => row.period },
            { key: 'amount', label: 'Net Amount', value: row => row.amount },
            { key: 'method', label: 'Method', value: row => row.method },
            { key: 'status', label: 'Status', value: row => row.status.label },
            { key: 'date', label: 'Date', value: row => row.dateText }
        ]
    };

    function pmExportRows(scope, range) {
        const all = pmPaymentRows();
        if (scope === 'history') {
            pmhEnsureRange(all);
            const inRange = all.filter(pmhInRange);
            return range === 'all' ? inRange : inRange.filter(row => pmhStatus === 'all' || row.status.key === pmhStatus);
        }
        pmEnsureRange(all);
        return range === 'all' ? all : pmFilteredRows(all);
    }

    function pmExportCsv(filename, headers, rows) {
        const quote = (value) => {
            let str = String(value ?? '');
            // Force Excel to treat dates as plain text by prefixing with a tab
            if (/^\d{4}-\d{2}-\d{2}$/.test(str) || /^[A-Z][a-z]{2} \d{1,2}, \d{4}$/.test(str)) {
                str = `\t${str}`;
            }
            return `"${str.replace(/"/g, '""')}"`;
        };
        const csv = [headers, ...rows].map(row => row.map(quote).join(',')).join('\r\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename.replace(/\.pdf$/i, '.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(link.href), 100);
    }

    function pmExportPdf(filename, headers, rows) {
        const win = window.open('', '_blank');
        if (!win) {
            toast('Allow pop-ups in your browser to export as PDF.', 'error');
            return false;
        }
        const head = headers.map(header => `<th>${escapeHtml(header)}</th>`).join('');
        const body = rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(String(cell ?? ''))}</td>`).join('')}</tr>`).join('');
        win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(filename)}</title>
            <style>
                body { font-family: Arial, Helvetica, sans-serif; color: #222; padding: 28px; }
                h1 { font-size: 18px; margin: 0 0 4px; }
                p { font-size: 11px; color: #777; margin: 0 0 18px; }
                table { width: 100%; border-collapse: collapse; font-size: 11px; }
                th { background: #c2181a; color: #fff; text-align: left; padding: 8px 10px; }
                td { border-bottom: 1px solid #eee; padding: 8px 10px; }
                tr:nth-child(even) td { background: #fdf7f7; }
            </style></head><body>
            <h1>${escapeHtml(filename.replace(/\.[a-z]+$/i, '').replace(/_/g, ' '))}</h1>
            <p>Generated ${escapeHtml(new Date().toLocaleString('en-US'))}</p>
            <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
            <script>window.onload = function () { window.print(); };<\/script>
            </body></html>`);
        win.document.close();
        return true;
    }

    function openPaymentExportModal(scope = 'records') {
        const isHistory = scope === 'history';
        const columns = PM_EXPORT_COLUMNS[isHistory ? 'history' : 'records'];

        const overlay = document.createElement('div');
        overlay.className = 'coa-modal-overlay pm-export-overlay open';
        overlay.innerHTML = `
            <div class="coa-modal-content">
                <div class="export-modal-header">
                    <h3>Export ${isHistory ? 'Payment History' : 'Payment Records'}</h3>
                    <p>${isHistory ? 'Payment History' : 'Payment Management'}</p>
                </div>
                <div class="export-modal-body">
                    <div class="export-section">
                        <div class="export-section-title">1. File Format</div>
                        <div class="export-grid">
                            <label class="export-card active">
                                <input type="radio" name="pmFormat" value="pdf" checked>
                                <div class="export-radio-circle"></div>
                                <img src="assets/icon-pdf.png" alt="PDF Icon" class="export-icon icon-pdf" />
                                <div class="export-text-wrap">
                                    <strong>PDF Documents</strong>
                                    <span>.pdf - Print, ready fixed layout</span>
                                </div>
                            </label>
                            <label class="export-card">
                                <input type="radio" name="pmFormat" value="excel">
                                <div class="export-radio-circle"></div>
                                <img src="assets/icon-excel.png" alt="Excel Icon" class="export-icon icon-excel" />
                                <div class="export-text-wrap">
                                    <strong>Excel Workbook</strong>
                                    <span>.csv - Editable, raw data</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div class="export-section">
                        <div class="export-section-title">2. Records to Export</div>
                        <div class="export-radio-group">
                            <label class="export-radio-item active">
                                <input type="radio" name="pmRecordsRange" value="current" checked>
                                <div class="export-radio-circle"></div>
                                <span>Current view${isHistory ? ' (filtered)' : ''}</span>
                            </label>
                            <label class="export-radio-item">
                                <input type="radio" name="pmRecordsRange" value="all">
                                <div class="export-radio-circle"></div>
                                <span>${isHistory ? 'All records in date range' : 'All records'}</span>
                            </label>
                        </div>
                    </div>

                    <div class="export-section">
                        <div class="export-section-title">3. Columns</div>
                        <div class="export-checkbox-grid">
                            ${columns.map(column => `
                                <label class="export-checkbox-item">
                                    <input type="checkbox" checked data-col="${column.key}">
                                    <div class="export-checkbox-box"></div>
                                    <span>${escapeHtml(column.label)}</span>
                                </label>
                            `).join('')}
                        </div>
                        <button class="export-clear-btn" style="margin-top:16px;" type="button">Clear all</button>
                    </div>
                </div>
                <div class="export-modal-footer">
                    <button class="export-btn-cancel" type="button" data-close-export>Cancel</button>
                    <button class="export-btn-export" type="button" id="pmConfirmExport">Export to PDF</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const close = () => {
            overlay.remove();
            if (!document.querySelector('.coa-modal-overlay.open') && !document.querySelector('.pmh-overlay')) {
                document.body.style.overflow = '';
            }
        };

        overlay.querySelector('[data-close-export]')?.addEventListener('click', close);
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) close();
        });

        overlay.querySelectorAll('input[name="pmFormat"]').forEach(radio => {
            radio.addEventListener('change', (event) => {
                overlay.querySelectorAll('.export-card').forEach(card => card.classList.remove('active'));
                event.target.closest('.export-card').classList.add('active');
                const confirm = overlay.querySelector('#pmConfirmExport');
                if (confirm) {
                    confirm.textContent = event.target.value === 'pdf' ? 'Export to PDF' : 'Export to CSV';
                }
            });
        });

        overlay.querySelectorAll('input[name="pmRecordsRange"]').forEach(radio => {
            radio.addEventListener('change', (event) => {
                overlay.querySelectorAll('.export-radio-item').forEach(card => card.classList.remove('active'));
                event.target.closest('.export-radio-item').classList.add('active');
            });
        });

        overlay.querySelector('.export-clear-btn')?.addEventListener('click', () => {
            overlay.querySelectorAll('.export-checkbox-item input').forEach(box => { box.checked = false; });
        });

        overlay.querySelector('#pmConfirmExport')?.addEventListener('click', () => {
            const format = overlay.querySelector('input[name="pmFormat"]:checked')?.value || 'pdf';
            const range = overlay.querySelector('input[name="pmRecordsRange"]:checked')?.value || 'current';
            const selectedKeys = Array.from(overlay.querySelectorAll('.export-checkbox-item input:checked'))
                .map(box => box.dataset.col);
            if (!selectedKeys.length) {
                toast('Select at least one column to export.', 'error');
                return;
            }

            const selectedColumns = columns.filter(column => selectedKeys.includes(column.key));
            const headers = selectedColumns.map(column => column.label);
            const sourceRows = pmExportRows(scope, range);
            if (!sourceRows.length) {
                toast('There are no records to export.', 'error');
                return;
            }
            const rows = sourceRows.map(row => selectedColumns.map(column => column.value(row)));
            const stamp = todayDateString();
            const filename = `DEVS_${isHistory ? 'PaymentHistory' : 'PaymentRecords'}_${stamp}.${format === 'pdf' ? 'pdf' : 'csv'}`;

            overlay.remove();
            pmShowExportProgress({
                filename,
                format,
                headers,
                rows,
                scope,
                onDownload: () => {
                    if (format === 'pdf') {
                        if (pmExportPdf(filename, headers, rows)) toast('PDF export opened for printing.');
                    } else {
                        pmExportCsv(filename, headers, rows);
                        toast('CSV export downloaded.', 'success');
                    }
                }
            });
        });
    }

    function pmShowExportProgress({ filename, format, headers, rows, scope, onDownload }) {
        const overlay = document.createElement('div');
        overlay.className = 'coa-modal-overlay pm-export-overlay open';
        overlay.innerHTML = `
            <div class="coa-modal-content" style="max-width: 450px;">
                <div class="progress-modal">
                    <div class="progress-icon generating">
                        <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    </div>
                    <h3>Generating export</h3>
                    <p style="color:#c2181a; font-weight:bold; font-size:11px;">${escapeHtml(filename)}</p>
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" id="pmProgressFill"></div>
                    </div>
                    <div class="progress-status-text" id="pmProgressText">
                        <ul><li>Preparing export data</li></ul>
                    </div>
                    <div class="progress-modal-footer" style="justify-content:center;">
                        <button class="progress-btn-done" type="button" disabled style="opacity:0.5;">DONE</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const fill = overlay.querySelector('#pmProgressFill');
        const textList = overlay.querySelector('#pmProgressText ul');
        const steps = scope === 'history'
            ? ['Preparing payment history', 'Applying date & status filters', 'Formatting selected columns', 'Compiling & finalizing file']
            : ['Preparing payment records', 'Applying current filters', 'Formatting selected columns', 'Compiling & finalizing file'];

        let step = 0;
        const interval = setInterval(() => {
            step += 1;
            fill.style.width = `${(step / steps.length) * 100}%`;
            if (step <= steps.length) {
                textList.innerHTML = steps.slice(0, step).map(label => `<li>${escapeHtml(label)}</li>`).join('');
            }

            if (step === steps.length) {
                clearInterval(interval);
                const sizeKb = Math.max(12, Math.round(JSON.stringify(rows).length / 1024));
                setTimeout(() => {
                    const icon = overlay.querySelector('.progress-icon');
                    icon.className = 'progress-icon success';
                    icon.innerHTML = '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
                    overlay.querySelector('h3').textContent = 'Export completed';
                    overlay.querySelector('p').textContent = 'Your file is ready to download.';
                    overlay.querySelector('.progress-status-text').innerHTML = `<div style="text-align:center; padding:10px; border:1px solid #e0e0e0; border-radius:6px; background:#fafafa; display:flex; justify-content:space-between; align-items:center; font-size:12px; gap:12px;"><span>${escapeHtml(filename)}</span><span style="color:#888;">${sizeKb}KB</span></div>`;
                    overlay.querySelector('.progress-modal-footer').innerHTML = `
                        <button class="export-btn-export" id="pmDownloadBtn" type="button">Download</button>
                        <button class="export-btn-cancel" id="pmCloseExport" type="button">Close</button>
                    `;
                    overlay.querySelector('#pmDownloadBtn')?.addEventListener('click', () => {
                        if (typeof onDownload === 'function') onDownload();
                    });
                    overlay.querySelector('#pmCloseExport')?.addEventListener('click', () => {
                        overlay.remove();
                        if (!document.querySelector('.coa-modal-overlay.open') && !document.querySelector('.pmh-overlay')) {
                            document.body.style.overflow = '';
                        }
                    });
                }, 500);
            }
        }, 700);
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
            </div>

            <div class="fin-stat-grid">
                ${stats.map((stat, index) => `
                    <div class="fin-stat-card fin-tx-stat tx-stat-${index === 0 ? 'total' : index === 1 ? 'in' : index === 2 ? 'out' : 'pending'} ${index === 0 ? 'fin-stat-card-highlight' : ''}">
                        <div class="fin-stat-head">
                            <span class="fin-stat-icon">${stat[2]}</span>
                            <span class="fin-stat-label">${stat[0]}</span>
                        </div>
                        <div class="fin-stat-value">${stat[1]}</div>
                    </div>
                `).join('')}
            </div>

            <section class="exd-card exd-records">
                <div class="exd-records-head">
                    <h3 class="exd-title">Financial Transaction Record</h3>
                </div>
                <div class="fin-tx-toolbar">
                    <label class="exd-search">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
                        <input type="search" id="txSearch" placeholder="Search..." />
                    </label>
                    <div class="custom-filter-dropdown" data-id="txSource">
                        <button type="button" class="custom-filter-btn" data-value="" data-default-text="Source">
                            <span class="cfb-text">Source</span>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
                        </button>
                        <ul class="custom-filter-menu">
                            <li data-value="Procure">Procure</li>
                            <li data-value="Sales">Sales</li>
                            <li data-value="Finance">Finance</li>
                            <li data-value="HR">HR</li>
                        </ul>
                    </div>
                    
                    <div class="custom-filter-dropdown" data-id="txType">
                        <button type="button" class="custom-filter-btn" data-value="" data-default-text="Type">
                            <span class="cfb-text">Type</span>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
                        </button>
                        <ul class="custom-filter-menu">
                            <li data-value="Supplier Pay">Supplier Pay</li>
                            <li data-value="Customer Col">Customer Col</li>
                            <li data-value="Office Supp">Office Supp</li>
                            <li data-value="Payroll">Payroll</li>
                        </ul>
                    </div>
                    
                    <div class="custom-filter-dropdown" data-id="txStatus">
                        <button type="button" class="custom-filter-btn" data-value="" data-default-text="Status">
                            <span class="cfb-text">Status</span>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
                        </button>
                        <ul class="custom-filter-menu">
                            <li data-value="Completed">Completed</li>
                            <li data-value="Pending">Pending</li>
                            <li data-value="Failed">Failed</li>
                        </ul>
                    </div>
                             <div class="fin-tx-actions">
                        ${canExportRecords() ? `
                        <button class="exd-export-btn" type="button" data-export="transactions">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M8 11l4 4 4-4M3 21h18"/></svg>
                            Export Report
                        </button>` : ''}
                        ${canManageRecords() ? '<button class="exd-add-btn" type="button" id="addTxBtn">+ Add Transaction</button>' : ''}
                    </div>
                </div>

                <div class="exd-table-scroll">
                    <table class="exd-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Date</th>
                                <th>Reference</th>
                                <th>Source</th>
                                <th>Type</th>
                                <th>Account</th>
                                <th>Description</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th style="text-align:center;">Action</th>
                            </tr>
                        </thead>
                        <tbody id="txTbody"></tbody>
                    </table>
                </div>
            </section>

            <section class="exd-card exd-records">
                <div class="exd-records-head">
                    <h3 class="exd-title">This Month Total Transaction</h3>
                </div>
                <div class="exd-table-scroll">
                    <table class="exd-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Date</th>
                                <th>Reference</th>
                                <th>Source</th>
                                <th>Description</th>
                                <th>Amount</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(store.transactions || []).filter(r => String(r.date || '').slice(0, 7) === todayDateString().slice(0, 7)).sort((a, b) => String(b.id).localeCompare(String(a.id), undefined, { numeric: true })).map(r => {
                                return `
                                <tr>
                                    <td class="exd-id">${escapeHtml(r.id)}</td>
                                    <td class="exd-date">${escapeHtml(String(r.date).slice(5))}</td>
                                    <td>${escapeHtml(r.reference)}</td>
                                    <td>${escapeHtml(r.source)}</td>
                                    <td>${escapeHtml(r.description)}</td>
                                    <td class="exd-amount">${peso(r.amount)}</td>
                                    <td><span class="exd-status exd-status-${statusKey(r.status)}">${escapeHtml(r.status)}</span></td>
                                </tr>`;
                            }).join('') || '<tr><td colspan="7"><div class="empty-state"><strong>No transactions this month</strong></div></td></tr>'}
                        </tbody>
                    </table>
                </div>
            </section>

            <section class="exd-card exd-records">
                <div class="exd-records-head">
                    <h3 class="exd-title">Transaction Summary</h3>
                </div>
                <div class="cash-lower-grid fin-tx-flow-inside">
                    <section class="money-flow-card money-in-chart">
                        <div class="money-flow-head">
                            <h3>Money In</h3>
                            <span class="money-flow-total">${peso(moneyIn)}</span>
                        </div>
                        <div class="money-flow-rows">
                            ${finFlowBars(incoming) || '<div class="flow-empty">No incoming transactions</div>'}
                        </div>
                    </section>
                    <section class="money-flow-card money-out-chart">
                        <div class="money-flow-head">
                            <h3>Money Out</h3>
                            <span class="money-flow-total">${peso(moneyOut)}</span>
                        </div>
                        <div class="money-flow-rows">
                            ${finFlowBars(outgoing) || '<div class="flow-empty">No outgoing transactions</div>'}
                        </div>
                    </section>
                </div>
            </section>
        `;
    }
    function renderTransactionRows() {
        const tbody = $('#txTbody');
        if (!tbody) return;

        const q      = ($('#txSearch')?.value || '').trim().toLowerCase();
        
        // Read from custom dropdown buttons
        const source = $('.custom-filter-dropdown[data-id="txSource"] .custom-filter-btn')?.dataset.value || '';
        const type   = $('.custom-filter-dropdown[data-id="txType"] .custom-filter-btn')?.dataset.value || '';
        const status = $('.custom-filter-dropdown[data-id="txStatus"] .custom-filter-btn')?.dataset.value || '';

        const rows = (store.transactions || []).filter(r => {
            const accountLabel = (store.accounts || []).find(a => a.code === r.accountCode)?.name || r.accountCode || '';
            const matchQ = !q || `${r.id} ${r.reference} ${r.description} ${r.source} ${accountLabel}`.toLowerCase().includes(q);
            const matchS = !source || r.source === source;
            const matchT = !type   || r.description === type;
            const matchSt = !status || r.status === status;
            return matchQ && matchS && matchT && matchSt;
        }).sort((a, b) => String(b.id).localeCompare(String(a.id), undefined, { numeric: true }));

        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><div class="empty-icon">◌</div><strong>No transactions</strong><p>No records match the current filters.</p></div></td></tr>`;
            return;
        }

        tbody.innerHTML = rows.map(r => {
            const isMoneyIn = String(r.source || '').toLowerCase() === 'sales';
            const accountLabel = (store.accounts || []).find(a => a.code === r.accountCode);
            return `
                <tr data-id="${escapeHtml(r.id)}">
                    <td class="exd-id">${escapeHtml(r.id)}</td>
                    <td class="exd-date">${escapeHtml(String(r.date).slice(5))}</td>
                    <td>${escapeHtml(r.reference)}</td>
                    <td>${escapeHtml(r.source)}</td>
                    <td>${isMoneyIn ? 'Money In' : 'Money Out'}</td>
                    <td>${accountLabel ? `${escapeHtml(r.accountCode)} · ${escapeHtml(accountLabel.name)}` : '—'}</td>
                    <td>${escapeHtml(r.description)}</td>
                    <td class="exd-amount">${peso(r.amount)}</td>
                    <td><span class="exd-status exd-status-${statusKey(r.status)}">${escapeHtml(r.status)}</span></td>
                    <td style="text-align:center;">
                        <button class="btn-view-cash" type="button" data-act="viewTx" data-id="${escapeHtml(r.id)}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>
                            View
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function handleTransactionAction(e) {
        const btn = e.target.closest('button[data-act]');
        if (!btn || btn.dataset.act !== 'viewTx') return;
        const tx = (store.transactions || []).find(x => String(x.id) === String(btn.dataset.id));
        if (tx) viewTransaction(tx);
    }

    function viewTransaction(tx) {
        const account = (store.accounts || []).find(a => a.code === tx.accountCode);
        const accText = account ? `${tx.accountCode} · ${account.name}` : (tx.accountCode || '—');
        const row = (label, value) => `<div class="view-modal-row"><span>${label}</span> <strong>${value}</strong></div>`;

        openModal({
            title: ' ',
            size: 'md',
            onCancel: closeModal,
            body: `
                <div class="view-modal-split">
                    <!-- Left Panel: Branding -->
                    <div class="view-modal-left">
                        <div style="display:flex; align-items:center; gap:10px; margin-bottom:32px;">
                            <img src="assets/logo.png" style="height:44px; width:auto; object-fit:contain; flex-shrink:0;" alt="DEVS logo">
                            <img src="assets/icon-devs.png" style="width:150px; height:auto; object-fit:contain;" alt="DEVS">
                        </div>

                        <h3 style="margin-bottom:8px; font-size:18px; font-weight:700;">TRANSACTION DETAILS</h3>
                        <p style="margin:0; font-size:13px; line-height:1.5; color:rgba(255,255,255,0.85);">Review the details of this financial transaction.</p>

                        <!-- Paper Icon -->
                        <div style="margin-top:auto; padding-bottom:20px; display:flex; justify-content:center; align-items:flex-end;">
                            <img src="assets/tilted-paper.png" style="width: 140px; height: auto; object-fit: contain; opacity: 0.3;" alt="Paper Icon" />
                        </div>
                    </div>

                    <!-- Right Panel: Details -->
                    <div class="view-modal-right">
                        <h2>View Details</h2>
                        <p class="view-subtitle">${escapeHtml(tx.id)}</p>

                        <div class="view-data-list">
                            ${row('Date:', escapeHtml(tx.date || '—'))}
                            ${row('Reference:', escapeHtml(tx.reference || '—'))}
                            ${row('Source:', escapeHtml(tx.source || '—'))}
                            ${row('Type:', String(tx.source || '').toLowerCase() === 'sales' ? 'Money In' : 'Money Out')}
                            ${row('Account:', escapeHtml(accText))}
                            ${row('Description:', escapeHtml(tx.description || '—'))}
                            ${row('Amount:', peso(tx.amount))}
                            ${row('Status:', `<span class="exd-status exd-status-${statusKey(tx.status)}">${escapeHtml(tx.status)}</span>`)}
                        </div>

                        <div style="text-align:right; margin-top:40px;">
                            <button class="acc-btn-cancel" type="button" data-act="cancel">Close</button>
                        </div>
                    </div>
                </div>
            `
        });

        const modalEl = document.getElementById('modal');
        if (modalEl) modalEl.className = 'modal modal-split receivable-view-modal';
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

        openSplitModal({
            heading: 'ADD TRANSACTION',
            subtitle: 'Fill in the necessary details to record a new financial transaction.',
            onCancel: closeModal,
            onSubmit: (form) => {
                const data = Object.fromEntries(new FormData(form).entries());
                let valid = true;
                const mark = (name, err) => {
                    const f = form.querySelector(`[name="${name}"]`)?.closest('.split-field, .form-field');
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
                    status: data.status,
                    accountCode: data.accountCode || ''
                };
                store.transactions.unshift(row);
                saveStore();
                closeModal();
                renderPage('financialTransactions');
                toast('Transaction added.', 'success');
            },
            body: `
                <form id="txForm" novalidate class="split-form">
                    <section class="split-section">
                        ${splitHeader('swap', 'Transaction Details')}
                        <div class="split-grid">
                            <div class="split-field">
                                <label for="tx-date">Date</label>
                                <input class="picker-input" type="date" id="tx-date" name="date" value="${today}" required />
                            </div>
                            <div class="split-field">
                                <label for="tx-reference">Reference No.</label>
                                <input type="text" id="tx-reference" name="reference" placeholder="e.g. PAY-002" required />
                                <span class="error-text">Enter a reference.</span>
                            </div>
                            <div class="split-field">
                                <label for="tx-source">Source</label>
                                <select id="tx-source" name="source">
                                    ${sources.map(s => `<option>${s}</option>`).join('')}
                                </select>
                            </div>
                            <div class="split-field">
                                <label for="tx-description">Type</label>
                                <select id="tx-description" name="description">
                                    ${types.map(t => `<option>${t}</option>`).join('')}
                                </select>
                            </div>
                            <div class="split-field">
                                <label for="tx-account">Chart of Account</label>
                                <select id="tx-account" name="accountCode">
                                    <option value="">— None —</option>
                                    ${(store.accounts || []).map(a => `<option value="${escapeHtml(a.code)}">${escapeHtml(a.code)} · ${escapeHtml(a.name)}</option>`).join('')}
                                </select>
                            </div>
                            <div class="split-field">
                                <label for="tx-amount">Amount</label>
                                ${splitPeso('<input type="number" id="tx-amount" name="amount" min="0" step="100" placeholder="Enter Amount" required />')}
                                <span class="error-text">Enter a valid amount.</span>
                            </div>
                            <div class="split-field">
                                <label for="tx-status">Status</label>
                                <select id="tx-status" name="status">
                                    ${statuses.map(s => `<option>${s}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                    </section>
                    ${splitActions('Save Transaction')}
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
        financialReports: { title: 'Financial Reports',     subtitle: 'Compare revenue, expenses, and net position.',        build: buildFinancialReports },
        paymentManagement: { title: 'Payment Management',  subtitle: 'Review and manage outgoing payments.',                 build: buildPaymentManagement },
        financialTransactions: { title: 'Financial Transactions', subtitle: 'Review the latest financial activity.',          build: buildFinancialTransactions },
        bankReconciliation: { title: 'Bank Reconciliation', subtitle: 'Compare book balance against bank statement.',     build: buildBankReconciliationPage },
        auditTrail:       { title: 'Audit Trail',           subtitle: 'Review system activity and user actions.',          build: buildAuditTrail },
        settings:         { title: 'Settings',             subtitle: 'Configure finance preferences.',                       build: buildSettings },
        support:          { title: 'Support',              subtitle: 'Help and assistance.',                                 build: buildSupportPage },
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
                const topbarContext = document.querySelector('.topbar-context strong');
                if (topbarContext) topbarContext.textContent = cfg.title;
                dashboardPanel.innerHTML = cfg.build();
                attachPageHandlers(targetPage);
                refreshSwipeableTables(dashboardPanel);
                // Dashboard is a live snapshot — re-sync from the server so changes made
                // by other sessions/tabs appear without a full page reload.
                if (targetPage === 'dashboard') void refreshDashboardWithFreshState();
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

    async function refreshDashboardWithFreshState() {
        try {
            const before = JSON.stringify([
                store.accounts, store.receivables, store.payables,
                store.cashBank, store.expenses, store.transactions
            ]);
            await syncStateFromServer();
            const after = JSON.stringify([
                store.accounts, store.receivables, store.payables,
                store.cashBank, store.expenses, store.transactions
            ]);
            // Re-render only if the server actually has different data
            if (before !== after
                && localStorage.getItem('devs_last_page') === 'dashboard'
                && !isRendering) {
                renderPage('dashboard');
            }
        } catch (_) {
            /* silent — dashboard already rendered with cached data */
        }
    }

    /* -------------------- DASHBOARD -------------------- */

     function buildFinanceDashboard() {
        // --- Real numbers from the store ---
        const revenueTotal = financeTotals.revenue();

        const expensesTotal = financeTotals.expenses();

        const payableTotal = financeTotals.payables();

        const receivablesTotal = financeTotals.receivables();

        const cashBalance = financeTotals.cashBank();

        const pendingPayment = payableTotal;

        // --- Stat cards (custom PNG icons) ---
        const statCards = [
            {
                label: 'Total Revenue',
                key: 'revenue',
                value: peso(revenueTotal),
                icon: `<img src="assets/icon-revenue.png" alt="Revenue" />`
            },
            {
                label: 'Total Expenses',
                key: 'expenses',
                value: peso(expensesTotal),
                icon: `<img src="assets/icon-expenses.png" alt="Expenses" />`
            },
            {
                label: 'Total Account Payable',
                key: 'payables',
                value: peso(payableTotal),
                icon: `<img src="assets/icon-payable.png" alt="Payable" />`
            },
            {
                label: 'Total Account Receivable',
                key: 'receivables',
                value: peso(receivablesTotal),
                icon: `<img src="assets/icon-receivable.png" alt="Receivable" />`
            }
        ];

        // --- Recent Transactions (latest 7) ---
        // Newest first: the API sends DESC by id, but locally added rows use
        // ids like FT-01, so fall back to the date when ids are not numeric.
        const dashboardTx = [...(store.transactions || [])].sort((a, b) => {
            const byId = Number(b.id) - Number(a.id);
            if (Number.isFinite(byId) && byId !== 0) return byId;
            return String(b.date || '').localeCompare(String(a.date || ''));
        });
        const txRows = dashboardTx.slice(0, 7).map(t => {
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
        const chartSource = dashboardTx
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
                <div class="fin-summary-bar-col" data-status="${statusKey}" data-tx-id="${escapeHtml(String(t.id))}" role="button" tabindex="0" title="View transaction details">
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
            <!-- Stat cards row 1 -->
            <div class="fin-stat-grid">
                ${statCards.map(card => `
                    <div class="fin-stat-card is-card-clickable" role="button" tabindex="0" data-fin-detail="${card.key}" title="View ${card.label}">
                        <div class="fin-stat-head">
                            <span class="fin-stat-icon">${card.icon}</span>
                            <span class="fin-stat-label">${card.label}</span>
                        </div>
                        <div class="fin-stat-value is-dark">${card.value}</div>
                    </div>
                `).join('')}
            </div>

            <!-- Stat cards row 2 -->
            <div class="fin-stat-grid-secondary">
                <div class="fin-stat-card is-card-clickable" role="button" tabindex="0" data-fin-detail="cash" title="View Cash/Bank Balance">
                    <div class="fin-stat-head">
                        <span class="fin-stat-icon">
                            <img src="assets/icon-cashbank.png" alt="Cash/Bank" />
                        </span>
                        <span class="fin-stat-label">Cash/Bank Balance</span>
                    </div>
                    <div class="fin-stat-value is-dark">${peso(cashBalance)}</div>
                </div>
            </div>

            <!-- Recent Transaction -->
            <section class="dash-card">
                <h3 class="dash-card-title">Recent Transaction</h3>
                <div class="table-wrap dash-table-scroll">
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
                </div>
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

    /* -------------------- CHART OF ACCOUNTS (REDESIGN) -------------------- */

    function buildChartAccounts() {
        coaCurrentPage = 1;
        return `
            <div class="coa-page-header">
                <h2 class="coa-page-title">Charts of Account</h2>
                ${canExportRecords() ? `
                    <button class="coa-export-top-btn" type="button" id="coaExportTrigger">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/></svg>
                        Export PDF / Excel
                    </button>
                ` : ''}
            </div>

            <section class="coa-card">
                <header class="coa-card-head">
                    <h3 class="coa-card-title">ACCOUNT LIST</h3>
                    <div class="coa-toolbar">
                        <div class="coa-search-box">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#888" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
                            <input type="search" placeholder="Search..." id="accSearch" />
                        </div>
                        <div class="custom-filter-dropdown" data-id="accTypeFilter">
                            <button type="button" class="custom-filter-btn" data-value="" style="height: 32px; min-width: 120px; font-size: 13px;">
                                <span class="cfb-text">Select Type</span>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
                            </button>
                            <ul class="custom-filter-menu">
                                <li data-value="Asset">Asset</li>
                                <li data-value="Liability">Liability</li>
                                <li data-value="Equity">Equity</li>
                                <li data-value="Revenue">Revenue</li>
                                <li data-value="Expense">Expense</li>
                            </ul>
                        </div>
                        ${canManageRecords() ? '<button class="coa-add-btn-top" type="button" id="addAccountBtn">+ Add Account</button>' : ''}
                    </div>
                </header>

                <div class="table-wrap coa-table-scroll">
                <table class="coa-table">
                    <thead>
                        <tr>
                            <th>Account Card</th>
                            <th>Account Name</th>
                            <th>Account Type</th>
                            <th>Normal Balance</th>
                            <th>Balance</th>
                            <th>Status</th>
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
        const typeFilter = $('.custom-filter-dropdown[data-id="accTypeFilter"] .custom-filter-btn')?.dataset.value || '';

        const allRows = (store.accounts || []).filter(a => {
            const matchQ = !q || `${a.code} ${a.name}`.toLowerCase().includes(q);
            const matchT = !typeFilter || a.type === typeFilter;
            return matchQ && matchT;
        });

        // Pagination math
        const realPageCount = Math.ceil(allRows.length / COA_ROWS_PER_PAGE);
        const totalPages    = Math.max(1, realPageCount); /* Changed to 1 so it doesn't force 5 pages */
        if (coaCurrentPage > totalPages) coaCurrentPage = totalPages;
        if (coaCurrentPage < 1)          coaCurrentPage = 1;

        const startIdx = (coaCurrentPage - 1) * COA_ROWS_PER_PAGE;
        const pageRows = allRows.slice(startIdx, startIdx + COA_ROWS_PER_PAGE);

        if (!pageRows.length) {
            tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><strong>No accounts found</strong><p>Try adjusting your search or filters.</p></div></td></tr>`;
        } else {
            let rowsHtml = pageRows.map(a => {
                const normalBalance = a.normalBalance || (['Liability', 'Equity', 'Revenue'].includes(a.type) ? 'Credit' : 'Debit');
                const isActive = String(a.status || 'Active').toLowerCase() === 'active';
                const displayBalance = (['Liability', 'Equity', 'Revenue'].includes(a.type) && Number(a.balance || 0) < 0)
                    ? Math.abs(Number(a.balance || 0))
                    : Number(a.balance || 0);
                return `
                    <tr data-code="${escapeHtml(a.code)}">
                        <td>${escapeHtml(a.code)}</td>
                        <td>${escapeHtml(a.name)}</td>
                        <td>${escapeHtml(a.type)}</td>
                        <td>${escapeHtml(normalBalance)}</td>
                        <td class="exd-amount">${peso(displayBalance)}</td>
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

            // Add spacer rows if the page is not full
            const missingRows = COA_ROWS_PER_PAGE - pageRows.length;
            if (missingRows > 0) {
                for (let i = 0; i < missingRows; i++) {
                    rowsHtml += `<tr class="at-spacer-row"><td colspan="7">&nbsp;</td></tr>`;
                }
            }

            tbody.innerHTML = rowsHtml;
        }

        renderCoaPagination(totalPages);
    }

    function renderCoaPagination(totalPages) {
        const wrap = $('#coaPagination');
        if (!wrap) return;

        const startPage = totalPages <= 3 ? 1 : Math.min(Math.max(1, coaCurrentPage - 1), totalPages - 2);
        const pages = Array.from({ length: Math.min(3, totalPages) }, (_, index) => startPage + index);
        const atFirst = coaCurrentPage <= 1;
        const atLast  = coaCurrentPage >= totalPages;

        wrap.innerHTML = `
            <button type="button" class="coa-page-btn" data-page="prev" aria-label="Previous page" ${atFirst ? 'disabled' : ''}>&lt;</button>
            ${pages.map(page => `<button type="button" class="coa-page-btn ${page === coaCurrentPage ? 'is-active' : ''}" data-page="${page}">${page}</button>`).join('')}
            <button type="button" class="coa-page-btn" data-page="next" aria-label="Next page" ${atLast ? 'disabled' : ''}>&gt;</button>
            ${totalPages > 3 ? `<details class="coa-page-menu"><summary>Select Page</summary><div class="coa-page-options">${Array.from({ length: totalPages }, (_, index) => `<button type="button" class="coa-page-option" data-page="${index + 1}">${index + 1}</button>`).join('')}</div></details>` : ''}
        `;
    }

    /* --- NEW COA MODALS (View, Export, Progress) --- */

    function openCoaViewModal(acc) {
        const normalBalance = acc.normalBalance || (['Liability', 'Equity', 'Revenue'].includes(acc.type) ? 'Credit' : 'Debit');
        
        openModal({
            title: ' ', // Hidden via CSS
            size: 'md',
            onCancel: closeModal,
            body: `
                <div class="view-modal-split">
                    <!-- Left Panel: Branding -->
                    <div class="view-modal-left">
                        <div style="display:flex; align-items:center; gap:10px; margin-bottom:32px;">
                            <img src="assets/logo.png" style="height:44px; width:auto; object-fit:contain; flex-shrink:0;" alt="DEVS logo">
                            <img src="assets/icon-devs.png" style="width:150px; height:auto; object-fit:contain;" alt="DEVS">
                        </div>
                        
                        <h3 style="margin-bottom:8px; font-size:18px; font-weight:700;">ACCOUNT DETAILS</h3>
                        <p style="margin:0; font-size:13px; line-height:1.5; color:rgba(255,255,255,0.85);">Manage the details of this account.</p>
                        
                        <!-- Paper Icon -->
                        <div style="margin-top:auto; padding-bottom:20px; display:flex; justify-content:center; align-items:flex-end;">
                            <img src="assets/tilted-paper.png" style="width: 140px; height: auto; object-fit: contain; opacity: 0.3;" alt="Paper Icon" />
                        </div>
                    </div>
                    
                    <!-- Right Panel: Details -->
                    <div class="view-modal-right">
                        <h2>View Details</h2>
                        <p class="view-subtitle">${escapeHtml(acc.code)}</p>
                        
                        <div class="view-data-list">
                            <div class="view-modal-row"><span>Account No.:</span> <strong>${escapeHtml(acc.code)}</strong></div>
                            <div class="view-modal-row"><span>Account Name:</span> <strong>${escapeHtml(acc.name)}</strong></div>
                            <div class="view-modal-row"><span>Account Type:</span> <strong>${escapeHtml(acc.type)}</strong></div>
                            <div class="view-modal-row"><span>Normal Balance:</span> <strong>${escapeHtml(normalBalance)}</strong></div>
                            <div class="view-modal-row"><span>Current Balance:</span> <strong>${peso(acc.balance)}</strong></div>
                            <div class="view-modal-row"><span>Status:</span> <strong style="color:#1aa846;">${escapeHtml(acc.status || 'Active')}</strong></div>
                        </div>

                        <div style="text-align:right; margin-top:40px;">
                            <button class="acc-btn-cancel" type="button" data-act="cancel">Close</button>
                        </div>
                    </div>
                </div>
            `
        });

        // Apply the exact split modal styling
        const modalEl = document.getElementById('modal');
        if (modalEl) {
            modalEl.className = 'modal modal-split receivable-view-modal';
        }


    }

    function openCoaExportModal() {
        const overlay = document.createElement('div');
        overlay.className = 'coa-modal-overlay open';
        overlay.innerHTML = `
            <div class="coa-modal-content">
                <div class="export-modal-header">
                    <h3>Export Report</h3>
                    <p>Charts of Account</p>
                </div>
                <div class="export-modal-body">
                    
                    <!-- 1. File Format -->
                    <div class="export-section">
                        <div class="export-section-title">1. File Format</div>
                        <div class="export-grid">
                            <label class="export-card active">
                                <input type="radio" name="fileFormat" value="pdf" checked>
                                <div class="export-radio-circle"></div>
                                <img src="assets/icon-pdf.png" alt="PDF Icon" class="export-icon icon-pdf" />
                                <div class="export-text-wrap">
                                    <strong>PDF Documents</strong>
                                    <span>.pdf - Print, ready fixed layout</span>
                                </div>
                            </label>
                            <label class="export-card">
                                <input type="radio" name="fileFormat" value="excel">
                                <div class="export-radio-circle"></div>
                                <img src="assets/icon-excel.png" alt="Excel Icon" class="export-icon icon-excel" />
                                <div class="export-text-wrap">
                                    <strong>Excel Workbook</strong>
                                    <span>.xlsx - Editable, raw data</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    <!-- 2. Records to Export -->
                    <div class="export-section">
                        <div class="export-section-title">2. Records to Export</div>
                        <div class="export-radio-group">
                            <label class="export-radio-item active">
                                <input type="radio" name="recordsRange" value="current" checked> 
                                <div class="export-radio-circle"></div>
                                <span>Current view</span>
                            </label>
                            <label class="export-radio-item">
                                <input type="radio" name="recordsRange" value="all"> 
                                <div class="export-radio-circle"></div>
                                <span>All records</span>
                            </label>
                        </div>
                    </div>

                    <!-- 3. Columns -->
                    <div class="export-section">
                        <div class="export-section-title">3. Columns</div>
                        <div class="export-checkbox-grid">
                            <label class="export-checkbox-item"><input type="checkbox" checked> <div class="export-checkbox-box"></div> <span>Account Code</span></label>
                            <label class="export-checkbox-item"><input type="checkbox" checked> <div class="export-checkbox-box"></div> <span>Account Name</span></label>
                            <label class="export-checkbox-item"><input type="checkbox" checked> <div class="export-checkbox-box"></div> <span>Account Type</span></label>
                            <label class="export-checkbox-item"><input type="checkbox" checked> <div class="export-checkbox-box"></div> <span>Account Balance</span></label>
                            <label class="export-checkbox-item"><input type="checkbox" checked> <div class="export-checkbox-box"></div> <span>Status (Active)</span></label>
                        </div>
                        <button class="export-clear-btn" style="margin-top:16px;">Clear all</button>
                    </div>
                </div>
                <div class="export-modal-footer">
                    <button class="export-btn-cancel" onclick="this.closest('.coa-modal-overlay').remove()">Cancel</button>
                    <button class="export-btn-export" id="confirmCoaExport">Export to PDF</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // UI Toggle logic for cards
        overlay.querySelectorAll('input[name="fileFormat"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                overlay.querySelectorAll('.export-card').forEach(c => c.classList.remove('active'));
                e.target.closest('.export-card').classList.add('active');
            });
        });
        overlay.querySelectorAll('input[name="recordsRange"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                overlay.querySelectorAll('.export-radio-item').forEach(c => c.classList.remove('active'));
                e.target.closest('.export-radio-item').classList.add('active');
            });
        });
        overlay.querySelector('.export-clear-btn').addEventListener('click', () => {
            overlay.querySelectorAll('.export-checkbox-item input').forEach(cb => cb.checked = false);
        });

        // Trigger Export Process
        overlay.querySelector('#confirmCoaExport').addEventListener('click', () => {
            // Save the user's format choice globally so the download function can read it
            const format = overlay.querySelector('input[name="fileFormat"]:checked').value;
            const ext = format === 'pdf' ? 'pdf' : 'csv';
            const filename = `DEVS_ChartOfAccount_${todayDateString()}.${ext}`;
            
            overlay.remove();
            startCoaExportProcess(filename);
        });
    }

    function startCoaExportProcess(filename) {
        const overlay = document.createElement('div');
        overlay.className = 'coa-modal-overlay open';
        overlay.innerHTML = `
            <div class="coa-modal-content" style="max-width: 450px;">
                <div class="progress-modal">
                    <div class="progress-icon generating">
                        <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    </div>
                    <h3>Generating export</h3>
                    <p id="coaProgressFilename" style="color:#c2181a; font-weight:bold; font-size:11px;">${escapeHtml(filename)}</p>
                    <div class="progress-bar-container">
                        <div class="progress-bar-fill" id="coaProgressFill"></div>
                    </div>
                    <div class="progress-status-text" id="coaProgressText">
                        <ul>
                            <li>Preparing account data</li>
                        </ul>
                    </div>
                    <div class="progress-modal-footer" style="justify-content:center;">
                        <button class="progress-btn-done" disabled style="opacity:0.5;">DONE</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const fill = overlay.querySelector('#coaProgressFill');
        const textList = overlay.querySelector('#coaProgressText ul');
        const doneBtn = overlay.querySelector('.progress-btn-done');

        let step = 0;
        const steps = ['Preparing account data', 'Applying filter & selected columns', 'Formatting layout', 'Compiling & finalizing file'];
        
        const interval = setInterval(() => {
            step++;
            fill.style.width = `${(step / steps.length) * 100}%`;
            
            if (step <= steps.length) {
                textList.innerHTML = steps.slice(0, step).map(s => `<li>${s}</li>`).join('');
            }

            if (step === steps.length) {
                clearInterval(interval);
                // Transition to Success
                setTimeout(() => {
                    overlay.querySelector('.progress-icon').className = 'progress-icon success';
                    overlay.querySelector('.progress-icon').innerHTML = '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
                    overlay.querySelector('h3').textContent = 'Export completed';
                    overlay.querySelector('#coaProgressFilename').textContent = 'Your file is ready to download.';
                    overlay.querySelector('.progress-status-text').innerHTML = `<div style="text-align:center; padding:10px; border:1px solid #e0e0e0; border-radius:6px; background:#fafafa; display:flex; justify-content:space-between; align-items:center; font-size:12px;"><span>${escapeHtml(filename)}</span> <span style="color:#888;">52KB</span></div>`;
                    overlay.querySelector('.progress-modal-footer').innerHTML = `
                        <button class="export-btn-cancel" id="coaRealDownloadBtn" style="background:#c2181a; color:#fff; border:none;">Download</button>
                        <button class="export-btn-cancel" onclick="this.closest('.coa-modal-overlay').remove()">Close</button>
                    `;
                    
                    // Attach the real download logic
                    overlay.querySelector('#coaRealDownloadBtn').addEventListener('click', () => {
                        // Use the format stored globally, or default to PDF
                        const format = window._currentExportFormat || 'pdf';
                        downloadExport('accounts', overlay.querySelector('#coaRealDownloadBtn'), format); 
                    });
                }, 600);
            }
        }, 800);
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
        const a = acc || { code: '', name: '', type: '', normalBalance: 'Debit', parent: '', description: '', currency: '', balance: '', status: 'Active', attachmentName: '', attachmentData: '' };
        const types = ['Asset', 'Liability', 'Equity', 'Revenue', 'Income', 'Expense'];
        const currencies = ['PHP (₱)', 'USD ($)', 'EUR (€)'];

        return `
            <form id="accForm" novalidate class="split-form">
                <section class="split-section">
                    ${splitHeader('bank', 'Account Information')}
                    <div class="split-grid">
                        <div class="split-field">
                            <label for="ac-code">Account Code</label>
                            <input type="text" id="ac-code" name="code" value="${escapeHtml(a.code)}" placeholder="e.g. 1001" ${isEdit ? 'readonly' : 'required'} />
                            <span class="error-text">Enter a unique account code.</span>
                        </div>
                        <div class="split-field">
                            <label for="ac-name">Account Name</label>
                            <input type="text" id="ac-name" name="name" value="${escapeHtml(a.name)}" placeholder="Enter account name" required />
                            <span class="error-text">Enter the account name.</span>
                        </div>
                        <div class="split-field full">
                            <label for="ac-type">Account Type</label>
                            <select id="ac-type" name="type" required>
                                <option value="" ${!a.type ? 'selected' : ''}>Select Account Type</option>
                                ${types.map(t => `<option ${t === a.type ? 'selected' : ''}>${t}</option>`).join('')}
                            </select>
                            <span class="error-text">Select an account type.</span>
                        </div>
                    </div>
                </section>

                <section class="split-section">
                    ${splitHeader('coin', 'Details')}
                    <div class="split-grid">
                        <div class="split-field full">
                            <label for="ac-description">Description</label>
                            <textarea id="ac-description" name="description" rows="3" placeholder="Enter description (optional)…">${escapeHtml(a.description || '')}</textarea>
                        </div>
                        <div class="split-field">
                            <label for="ac-currency">Currency</label>
                            <select id="ac-currency" name="currency">
                                <option value="" ${!a.currency ? 'selected' : ''}>Select Currency</option>
                                ${currencies.map(c => `<option ${c === a.currency ? 'selected' : ''}>${c}</option>`).join('')}
                            </select>
                        </div>
                        <div class="split-field">
                            <label for="ac-balance">Opening Balance</label>
                            ${splitPeso(`<input type="number" id="ac-balance" name="balance" min="0" step="0.01" placeholder="Enter Amount" value="${a.balance}" />`)}
                            <span class="error-text">Enter a valid amount.</span>
                        </div>
                    </div>
                </section>

                ${splitActions(isEdit ? 'Save Changes' : 'Save Account', isEdit ? '<button type="button" class="btn-delete-pill" id="deleteAccountBtn">Delete</button>' : '')}
            </form>
        `;
    }

    /* ============================================================
       SHARED SPLIT MODAL — same layout as "Add Voucher Expense"
       ============================================================ */
    const SPLIT_PATHS = {
        doc:  '<path d="M4 4h12l4 4v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M8 10h8M8 14h8M8 18h5"/>',
        bank: '<path d="m3 9 9-5 9 5M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/>',
        coin: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 10h5a2 2 0 0 1 0 4H9"/>',
        swap: '<path d="M7 7h13l-3-3M17 17H4l3 3"/>',
        clip: '<path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l8.6-8.6a4 4 0 0 1 5.66 5.66l-8.6 8.6a2 2 0 0 1-2.83-2.83l7.78-7.78"/>'
    };
    const splitHeader = (icon, text) => `
        <div class="split-section-header">
            <span class="split-section-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${SPLIT_PATHS[icon] || SPLIT_PATHS.doc}</svg>
            </span>
            <h3>${text}</h3>
        </div>`;
    const splitActions = (saveLabel, extra = '') => `
        <div class="split-actions">
            <button type="button" class="btn-cancel-pill" data-act="cancel">Cancel</button>
            ${extra}
            <button type="submit" class="btn-save-pill">${saveLabel}</button>
        </div>`;
    const splitPeso = (inner) => `<div class="split-field-prefixed"><span>₱</span>${inner}</div>`;

    function openSplitModal({ heading, subtitle = '', body, onCancel = closeModal, onSubmit = null, size = 'lg' }) {
        openModal({
            title: heading,
            size,
            onCancel,
            onSubmit,
            body: `
                <div class="voucher-split">
                    <div class="voucher-left">
                        <div style="display:flex; align-items:center; gap:10px; margin-bottom:32px;">
                            <img src="assets/logo.png" style="height:44px; width:auto; object-fit:contain; flex-shrink:0;" alt="DEVS logo">
                            <img src="assets/icon-devs.png" style="width:150px; height:auto; object-fit:contain;" alt="DEVS">
                        </div>
                        <h3 style="margin-bottom:8px; font-size:18px; font-weight:700;">${escapeHtml(heading)}</h3>
                        <p style="margin:0; font-size:13px; line-height:1.5; color:rgba(255,255,255,0.85);">${escapeHtml(subtitle)}</p>
                        <div style="margin-top:auto; padding-bottom:20px; display:flex; justify-content:center; align-items:flex-end;">
                            <img src="assets/tilted-paper.png" style="width:140px; height:auto; object-fit:contain; opacity:0.3;" alt="" />
                        </div>
                    </div>
                    <div class="voucher-right modal-split-right">${body}</div>
                </div>`
        });
        const modalEl = document.getElementById('modal');
        if (modalEl) modalEl.classList.add('modal-split', 'voucher-modal');
    }

    function openAccountForm(acc = null) {
        const isEdit = !!acc;

        openSplitModal({
            heading: isEdit ? 'EDIT ACCOUNT' : 'ADD ACCOUNT',
            subtitle: isEdit
                ? 'Update the account details to keep your chart of accounts accurate.'
                : 'Fill in the necessary details to add a new account.',
            body: accountForm(acc)
        });

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
                    <div class="account-view-header"><img src="assets/icon-devs.png" alt="DEVS logo" /><div><strong>${escapeHtml(acc.name)}</strong><span>Account ${escapeHtml(acc.code)}</span></div></div>
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
        </style></head><body><header><img src="assets/icon-devs.png" alt="DEVS logo"><div><h1>${escapeHtml(acc.name)}</h1><span>Account ${escapeHtml(acc.code)} | D.E.V.S Finance</span></div></header><div class="grid"><div class="field"><span>Account Type</span><strong>${escapeHtml(acc.type)}</strong></div><div class="field"><span>Normal Balance</span><strong>${escapeHtml(normalBalance)}</strong></div><div class="field"><span>Balance</span><strong>${peso(acc.balance)}</strong></div><div class="field"><span>Status</span><strong>${escapeHtml(acc.status || 'Active')}</strong></div></div>${acc.description ? `<div class="description">${escapeHtml(acc.description)}</div>` : ''}<footer>Generated from D.E.V.S Finance</footer></body></html>`);
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
            const normalBalance = ['Liability', 'Equity', 'Income', 'Revenue'].includes(data.type) ? 'Credit' : 'Debit';

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
                try {
                    await apiRequest('account.update', {
                        method: 'POST',
                        body: JSON.stringify(payload)
                    });
                    if (existing) Object.assign(existing, payload);
                    saveStore();
                    toast('Account updated.');
                } catch (err) {
                    toast(err.message, 'error');
                    return;
                }
            } else {
                if (existing) {
                    toast('An account with that code already exists.', 'error');
                    return;
                }
                
                // Save to real database
                try {
                    await apiRequest('account.save', {
                        method: 'POST',
                        body: JSON.stringify(payload)
                    });
                    
                    // Update local store so UI updates immediately
                    store.accounts.push(payload);
                    
                    // Reload notifications from server so the new audit row shows up
                    await loadRealNotifications();
                    
                    toast('Account created successfully.');
                } catch (err) {
                    toast(err.message, 'error');
                    return;
                }
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

        if (act === 'viewAcc') openCoaViewModal(acc);
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
        try {
            await apiRequest('account.delete', {
                method: 'POST',
                body: JSON.stringify({ code: acc.code })
            });
            store.accounts = store.accounts.filter(a => a.code !== acc.code);
            saveStore();
            toast('Account removed.', 'info');
            return true;
        } catch (err) {
            toast(err.message, 'error');
            return false;
        }
    }

    /* -------------------- RECEIVABLES -------------------- */

    function buildReceivables() {
        const rows = store.receivables || [];
        
        const outstanding = financeTotals.receivables();
        const today = new Date();
        const todayKey = todayDateString();
        const weekEnd = new Date(today);
        weekEnd.setDate(today.getDate() + (6 - today.getDay()));
        const weekEndKey = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}-${String(weekEnd.getDate()).padStart(2, '0')}`;
        const dueToday = rows.filter(row => row.due === todayKey).reduce((sum, row) => sum + Number(row.amount || 0), 0);
        const dueThisWeek = rows.filter(row => row.due >= todayKey && row.due <= weekEndKey).reduce((sum, row) => sum + Number(row.amount || 0), 0);
        const overdue = rows.filter(row => row.status === 'Overdue' || (row.status !== 'Paid' && row.due < todayKey)).reduce((sum, row) => sum + Number(row.amount || 0), 0);
        const collected = rows.filter(row => row.status === 'Paid').reduce((sum, row) => sum + Number(row.amount || 0), 0);

        const stats = [
            ['Total Receivable', outstanding, '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h10M7 13h6"/></svg>'],
            ['Due Today', dueToday, '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>'],
            ['Due This Week', dueThisWeek, '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 10h18M7 3v4M17 3v4M7 14h3M14 14h3"/></svg>'],
            ['Overdue', overdue, '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/></svg>'],
            ['Collection This Month', collected, '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M8 14h3"/></svg>']
        ];

        return `
            <div class="section-title" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
                <h2 style="color:#fff; margin:0; font-size:20px;">Receivable DB</h2>
            </div>

            <!-- 5 Stat Cards -->
            <div class="payables-stat-grid-five">
                ${stats.map((stat, index) => `
                    <div class="fin-stat-card ${index === 0 ? 'fin-stat-card-highlight' : ''}">
                        <div class="fin-stat-head">
                            <span class="fin-stat-icon">${stat[2]}</span>
                            <span class="fin-stat-label">${stat[0]}</span>
                        </div>
                        <div class="fin-stat-value">${peso(stat[1])}</div>
                    </div>
                `).join('')}
            </div>

            <!-- Main Table Card -->
            <div class="receivables-table-wrapper">
                <div class="receivables-table-header">
                    <h3>Receivable Table</h3>
                    <div class="receivables-actions">
                        ${canManageRecords() ? '<button class="btn btn-primary btn-sm" type="button" id="addArBtn" style="background:#a01515; border-radius:6px; padding: 8px 16px; color:#fff; border:none; cursor:pointer;">+ Add Invoice</button>' : ''}
                    </div>
                </div>
                
                <div class="receivables-table-inner">
                    <table class="receivables-full-table">
                        <thead>
                            <tr>
                                <th>Invoice No.</th>
                                <th>Customer</th>
                                <th>Invoice Date</th>
                                <th>Due Date</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody id="arTbody"></tbody>
                    </table>
                </div>
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
            const matchS = !status || effectiveRecordStatus(r) === status;
            return matchQ && matchS;
        });

        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state" style="padding: 20px;"><p>No receivables found.</p></div></td></tr>`;
            return;
        }

        tbody.innerHTML = rows.map(r => {
            let displayStatus = effectiveRecordStatus(r);
            if (String(displayStatus).toLowerCase() === 'open') displayStatus = 'Fulfilling';
            if (String(displayStatus).toLowerCase() === 'for review') displayStatus = 'Fulfilling';
            if (String(displayStatus).toLowerCase() === 'due') displayStatus = 'Overdue';

            return `
                <tr data-id="${escapeHtml(r.id)}">
                    <td><strong>${escapeHtml(r.invoice)}</strong></td>
                    <td>${escapeHtml(r.customer)}</td>
                    <td>${escapeHtml(r.invoiceDate || r.due)}</td>
                    <td>${escapeHtml(r.due)}</td>
                    <td>${peso(r.amount)}</td>
                    <td><span class="status-text ${displayStatus === 'Paid' ? 'is-paid' : (displayStatus === 'Overdue' ? 'is-overdue' : 'is-fulfilling')}">${displayStatus}</span></td>
                    <td>
                        <button class="btn-view-receivable" type="button" data-act="viewAr" data-id="${escapeHtml(r.id)}">
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>
                            View
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function receivableForm(rec = null) {
        const isEdit = !!rec;
        const r = rec || { customer: '', invoice: '', invoiceDate: todayDateString(), due: todayDateString(), amount: '', status: 'Open' };
        return `
            <form id="arForm" novalidate class="split-form">
                <section class="split-section">
                    ${splitHeader('doc', 'Invoice Details')}
                    <div class="split-grid">
                        <div class="split-field full">
                            <label for="ar-customer">Customer</label>
                            <input type="text" id="ar-customer" name="customer" placeholder="Enter customer name" value="${escapeHtml(r.customer)}" required />
                            <span class="error-text">Enter the customer name.</span>
                        </div>
                        <div class="split-field">
                            <label for="ar-invoice">Invoice No.</label>
                            <input type="text" id="ar-invoice" name="invoice" placeholder="Enter invoice number" value="${escapeHtml(r.invoice)}" required />
                            <span class="error-text">Enter an invoice number.</span>
                        </div>
                        <div class="split-field">
                            <label for="ar-amount">Amount</label>
                            ${splitPeso(`<input type="number" id="ar-amount" name="amount" min="0" step="100" placeholder="Enter Amount" value="${r.amount}" required />`)}
                            <span class="error-text">Enter a valid amount.</span>
                        </div>
                        <div class="split-field">
                            <label for="ar-invoice-date">Invoice Date</label>
                            <input class="picker-input" type="date" id="ar-invoice-date" name="invoiceDate" value="${escapeHtml(r.invoiceDate || r.due)}" required />
                        </div>
                        <div class="split-field">
                            <label for="ar-due">Due Date</label>
                            <input class="picker-input" type="date" id="ar-due" name="due" value="${escapeHtml(r.due)}" required />
                        </div>
                        <div class="split-field">
                            <label for="ar-status">Status</label>
                            <select id="ar-status" name="status">
                                ${['Open', 'Overdue', 'Paid'].map(s => `<option ${r.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                </section>
                ${splitActions(isEdit ? 'Save Changes' : 'Save Invoice')}
            </form>
        `;
    }

    function openReceivableViewModal(rec) {
        const displayStatus = effectiveRecordStatus(rec) === 'Open'
            ? 'Fulfilling' : effectiveRecordStatus(rec);
        const statusClass = displayStatus === 'Paid' ? 'is-paid' : (displayStatus === 'Overdue' ? 'is-overdue' : 'is-fulfilling');
        const statusColor = displayStatus === 'Paid' ? '#1aa846' : (displayStatus === 'Overdue' ? '#d8000c' : '#f08c00');

        openModal({
            title: ' ',
            size: 'md',
            onCancel: closeModal,
            body: `
                <div class="view-modal-split">
                    <!-- Left Panel: Branding -->
                    <div class="view-modal-left">
                        <!-- Logo Area: Large image, no white circle, split text colors -->
                        <div style="display:flex; align-items:center; gap:10px; margin-bottom:32px;">
                            <img src="assets/logo.png" style="height:44px; width:auto; object-fit:contain; flex-shrink:0;" alt="DEVS logo">
                            <img src="assets/icon-devs.png" style="width:150px; height:auto; object-fit:contain;" alt="DEVS">
                        </div>
                        
                        <h3 style="margin-bottom:8px; font-size:18px; font-weight:700;">ACCOUNT DETAILS</h3>
                        <p style="margin:0; font-size:13px; line-height:1.5; color:rgba(255,255,255,0.85);">Manage the details of this account.</p>
                        
                        <!-- Paper Icon -->
                        <div style="margin-top:auto; padding-bottom:20px; display:flex; justify-content:center; align-items:flex-end;">
                            <img src="assets/tilted-paper.png" style="width: 140px; height: auto; object-fit: contain; opacity: 0.3;" alt="Paper Icon" />
                        </div>
                    </div>
                    
                    <!-- Right Panel: Details -->
                    <div class="view-modal-right">
                        <h2>View Details</h2>
                        <p class="view-subtitle">${escapeHtml(rec.id || rec.invoice)}</p>
                        
                        <div class="view-data-list">
                            <div class="view-modal-row"><span>Invoice No.:</span> <strong>${escapeHtml(rec.invoice)}</strong></div>
                            <div class="view-modal-row"><span>Customer:</span> <strong>${escapeHtml(rec.customer)}</strong></div>
                            <div class="view-modal-row"><span>Date:</span> <strong>${escapeHtml(rec.invoiceDate || rec.due)}</strong></div>
                            <div class="view-modal-row"><span>Due Date:</span> <strong>${escapeHtml(rec.due)}</strong></div>
                            <div class="view-modal-row"><span>Amount:</span> <strong>${peso(rec.amount)}</strong></div>
                            <div class="view-modal-row"><span>Status:</span> <strong class="status-text ${statusClass}" style="color: ${statusColor};">${escapeHtml(displayStatus)}</strong></div>
                        </div>

                        <div style="text-align:right; margin-top:40px;">
                            <button class="acc-btn-cancel" type="button" data-act="cancel">Close</button>
                        </div>
                    </div>
                </div>
            `
        });

        // Apply the exact split modal styling
        const modalEl = document.getElementById('modal');
        if (modalEl) {
            modalEl.className = 'modal modal-split receivable-view-modal';
        }
    }

    function openReceivableForm(rec = null) {
        const isEdit = !!rec;
        openSplitModal({
            heading: isEdit ? 'EDIT INVOICE' : 'ADD INVOICE',
            subtitle: isEdit
                ? 'Update the invoice details to keep your receivables accurate.'
                : 'Fill in the necessary details to record a new customer invoice.',
            body: receivableForm(rec),
            onCancel: closeModal,
            onSubmit: (form) => {
                const data = Object.fromEntries(new FormData(form).entries());
                let valid = true;
                const mark = (name, err) => {
                    const f = form.querySelector(`[name="${name}"]`)?.closest('.split-field, .form-field');
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
                    store.receivables.unshift({ id: nextId('AR', store.receivables), ...payload });
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
        const rec = (store.receivables || []).find(r => String(r.id) === String(id));
        if (!rec) return;
        
        if (act === 'viewAr') openReceivableViewModal(rec); 
        if (act === 'editAr') openReceivableForm(rec);
        if (act === 'deleteAr') {
            const ok = await confirmDialog({
                title: 'Delete Invoice',
                message: `Remove invoice ${rec.invoice} for ${rec.customer}?`,
                confirmLabel: 'Delete',
                danger: true
            });
            if (!ok) return;
            store.receivables = store.receivables.filter(r => String(r.id) !== String(id));
            saveStore();
            toast('Invoice removed.', 'info');
            renderReceivableRows();
        }
    }

    /* -------------------- PAYABLES -------------------- */

    let activePayableId = null;

    function setPayablesViewMode(viewMode) {
        const listView = $('#payablesListView');
        const invoiceView = $('#payablesInvoiceView');
        const mode = viewMode === 'invoice' ? 'invoice' : 'list';

        if (listView) listView.style.display = mode === 'invoice' ? 'none' : 'table';
        if (invoiceView) {
            invoiceView.style.display = mode === 'invoice' ? 'block' : 'none';
            if (mode === 'invoice') {
                renderInvoiceView(activePayableId || (store.payables && store.payables[0]?.id));
            }
        }
        renderPayableRows();
    }

    function buildPayables() {
        const rows = store.payables || [];

        const totalPayables = financeTotals.payables();
        const dueToday = rows.filter(r => r.due === todayDateString()).reduce((sum, r) => sum + Number(r.amount || 0), 0);
        const dueThisWeek = rows.filter(r => {
            const d = new Date(r.due);
            const today = new Date();
            const diff = (d - today) / (1000 * 60 * 60 * 24);
            return diff >= 0 && diff <= 7;
        }).reduce((sum, r) => sum + Number(r.amount || 0), 0);
        const overdue = rows.filter(r => payableStatus(r) === 'Overdue').reduce((sum, r) => sum + Number(r.amount || 0), 0);
        const paidThisMonth = rows.filter(r => payableStatus(r) === 'Paid').reduce((sum, r) => sum + Number(r.amount || 0), 0);

        const stats = [
            ['Total Payables', totalPayables, '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h10M7 13h6"/></svg>'],
            ['Due Today', dueToday, '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>'],
            ['Due This Week', dueThisWeek, '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 10h18M7 3v4M17 3v4M7 14h3M14 14h3"/></svg>'],
            ['Overdue', overdue, '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/></svg>'],
            ['Paid This Month', paidThisMonth, '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M8 14h3"/></svg>']
        ];

        return `
            <div class="section-title" style="display:flex; justify-content:space-between; align-items:center;">
                <h2>Payable DB</h2>
                </div>

            <div class="payables-stat-grid-five">
                ${stats.map((stat, index) => `
                    <div class="fin-stat-card ${index === 0 ? 'fin-stat-card-highlight' : ''}">
                        <div class="fin-stat-head">
                            <span class="fin-stat-icon">${stat[2]}</span>
                            <span class="fin-stat-label">${stat[0]}</span>
                        </div>
                        <div class="fin-stat-value">${peso(stat[1])}</div>
                    </div>
                `).join('')}
            </div>

            <div class="payables-table-wrapper">
                <div class="payables-top-header">
                    <div class="payables-header-left">
                        <div class="search-wrap">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                            <input type="search" placeholder="Search vendor or invoice…" id="apSearch" />
                        </div>
                        <div class="custom-filter-dropdown" data-id="apStatus">
                            <button type="button" class="custom-filter-btn" data-value="" data-default-text="Status" style="height: 38px; min-width: 130px;">
                                <span class="cfb-text">Status</span>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
                            </button>
                            <ul class="custom-filter-menu">
                                <li data-value="Due">Due</li>
                                <li data-value="Overdue">Overdue</li>
                                <li data-value="Paid">Paid</li>
                            </ul>
                        </div>
                        ${canManageRecords() ? '<button class="btn btn-primary btn-sm" type="button" id="addApBtn" style="background:#a01515; border-radius:6px; padding: 8px 16px; margin-left: 8px;">+ Add Bill</button>' : ''}
                    </div>
                    
                    <div class="payables-header-right">
                        <span class="view-mode-label">View Mode:</span>
                        <div class="custom-filter-dropdown view-mode-dropdown" data-id="apViewMode">
                            <button type="button" class="custom-filter-btn" data-value="list" data-default-text="View by Vendor" style="height: 38px; min-width: 154px;">
                                <span class="cfb-text">View by Vendor</span>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
                            </button>
                            <ul class="custom-filter-menu">
                                <li data-value="list" class="is-selected">View by Vendor</li>
                                <li data-value="invoice">View by Invoice</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- LIST VIEW (Default) -->
                <div class="table-wrap payables-table-scroll">
                <table class="payables-full-table" id="payablesListView">
                    <thead>
                        <tr>
                            <th>Invoice No.</th>
                            <th>Invoice Date</th>
                            <th>Invoice Amount</th>
                            <th>Status</th>
                            <th>Outstanding</th>
                        </tr>
                    </thead>
                    <tbody id="apTbody"></tbody>
                </table>
                </div>

                <!-- INVOICE DETAIL VIEW (Hidden by default) -->
                <div class="payables-invoice-view" id="payablesInvoiceView" style="display: none;"></div>
            </div>
        `;
    }

    function renderPayableRows() {
        const tbody = $('#apTbody');
        if (!tbody) return;
        
        const q = ($('.payables-table-wrapper #apSearch')?.value || '').trim().toLowerCase();
        const status = $('.custom-filter-dropdown[data-id="apStatus"] .custom-filter-btn')?.dataset.value || '';
        const viewMode = $('.custom-filter-dropdown[data-id="apViewMode"] .custom-filter-btn')?.dataset.value || 'list';

        // If we are in Invoice View, filter the sidebar list directly
        if (viewMode === 'invoice') {
            const allInvoices = store.payables || [];
            const visibleInvoices = allInvoices.filter(r => {
                return !q || `${r.vendor} ${r.invoice} ${r.id}`.toLowerCase().includes(q);
            });

            const listContainer = $('.invoice-master-list');
            if (listContainer) {
                // Update just the header to show active count
                listContainer.querySelector('h4').textContent = `All Invoices (${visibleInvoices.length})`;
                listContainer.querySelectorAll('.invoice-list-item').forEach(item => {
                    const id = item.dataset.id;
                    const match = visibleInvoices.find(v => String(v.id) === String(id));
                    item.style.display = match ? '' : 'none';
                });
            }
            return; // Stop here; don't try to render the vendor table
        }

        const rows = (store.payables || []).filter(r => {
            const matchQ = !q || `${r.vendor} ${r.invoice} ${r.id}`.toLowerCase().includes(q);
            const matchS = !status || payableStatus(r) === status;
            return matchQ && matchS;
        });

        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><p>No payables match the current filters.</p></div></td></tr>`;
            return;
        }

        tbody.innerHTML = rows.map(r => {
            const displayStatus = payableStatus(r);
            const outstanding = displayStatus === 'Paid' ? 0 : Number(r.amount || 0);
            const isActive = String(r.id) === String(activePayableId) ? 'active' : '';
            const statusClass = String(displayStatus).toLowerCase() === 'paid' ? 'is-paid'
                : (String(displayStatus).toLowerCase() === 'overdue' ? 'is-overdue' : 'is-fulfilling');
            return `
                <tr data-id="${escapeHtml(r.id)}" class="payable-row ${isActive}" style="cursor: pointer;">
                    <td>${escapeHtml(r.invoice)}</td>
                    <td>${escapeHtml(r.invoiceDate || r.due)}</td>
                    <td>${peso(r.amount)}</td>
                    <td><span class="status-text ${statusClass}">${escapeHtml(displayStatus)}</span></td>
                    <td style="color:#c2181a; font-weight:600;">${peso(outstanding)}</td>
                </tr>
            `;
        }).join('');
    }

    function renderInvoiceView(invoiceId) {
        const container = $('#payablesInvoiceView');
        if (!container) return;

        const allInvoices = store.payables || [];
        
        // Always update the global active ID if a new one is passed
        if (invoiceId) {
            activePayableId = invoiceId;
        }
        
        // Fallback to the first invoice if none is selected
        const activeId = activePayableId || allInvoices[0]?.id;
        const inv = allInvoices.find(r => String(r.id) === String(activeId)) || allInvoices[0];

        if (!inv) {
            container.innerHTML = '<div style="padding:40px; text-align:center; color:#666;">No invoices found.</div>';
            return;
        }

        // Vouchers for THIS invoice only — actual payment transactions whose reference
        // matches this invoice number. (Previously a hardcoded list was shown for
        // every invoice.)
        // Vouchers for THIS invoice only. Financial transactions carry the
        // invoice reference; supplier payments (payment_transactions) carry
        // the vendor in their description.
        const invoiceRef = String(inv.invoice || '').trim().toLowerCase();
        const vendorRef  = String(inv.vendor || '').trim().toLowerCase();
        const invoiceStatus = payableStatus(inv);
        const candidates = [
            ...(store.transactions || []).map(t => ({
                id: t.id,
                no: String(t.reference || ''),
                date: String(t.date || ''),
                amt: Number(t.amount || 0),
                method: 'Cash',
                due: String(inv.due || ''),
                status: String(t.status || 'Pending'),
                desc: String(t.description || '')
            })),
            ...(store.payments || []).map(p => ({
                id: p.id,
                no: String(p.reference || ''),
                date: String(p.date || ''),
                amt: Number(p.amount || 0),
                method: String(p.method || 'Cash'),
                due: String(inv.due || ''),
                status: String(p.status || 'Pending'),
                desc: String(p.description || '')
            }))
        ];
        let vouchers = candidates.filter(v => {
            const ref  = String(v.no || '').trim().toLowerCase();
            const desc = String(v.desc || '').trim().toLowerCase();
            if (inv.paymentId && String(inv.paymentId) === String(v.id)) return true;
            if (invoiceRef && ref === invoiceRef) return true;
            if (vendorRef && desc.includes(vendorRef)
                && Number(v.amt) === Number(inv.amount || 0)) return true;
            return false;
        }).map(v => ({
            ...v,
            // An unpaid invoice past its due date is overdue even if an old
            // payment transaction was stored as completed.
            paidStatus: v.status,
            status: invoiceStatus === 'Overdue' ? 'Overdue' : v.status
        }));

        if (!vouchers.length) {
            const numericInvoiceId = String(inv.id || '').replace(/\D/g, '') || '000';
            const mockStatus = invoiceStatus === 'Paid' ? 'Completed' : invoiceStatus;
            vouchers = [{
                no: `PAY-${String(inv.due || todayDateString()).slice(0, 4)}-${numericInvoiceId.padStart(3, '0')}`,
                date: String(inv.due || todayDateString()),
                amt: Number(inv.amount || 0),
                method: 'Supplier Payment',
                due: String(inv.due || ''),
                status: mockStatus,
                paidStatus: mockStatus,
                desc: `Mock voucher for ${inv.invoice || inv.id}`
            }];
        }

        const totalPaid = vouchers
            .filter(v => /completed|paid|approved/i.test(v.paidStatus || v.status))
            .reduce((sum, v) => sum + Number(v.amt || 0), 0);
        const remainingBalance = Math.max(0, Number(inv.amount || 0) - totalPaid);

        container.innerHTML = `
            <div class="invoice-detail-layout">
                
                <!-- LEFT SIDEBAR: List of All Invoices -->
                <div class="invoice-master-list">
                    <h4>All Invoices (${allInvoices.length})</h4>
                    ${allInvoices.map(row => {
                        const isActive = String(row.id) === String(activeId) ? 'active' : '';
                        return `
                            <div class="invoice-list-item ${isActive}" data-id="${escapeHtml(row.id)}">
                                <div class="inv-list-top">
                                    <strong>#${escapeHtml(row.invoice)}</strong>
                                    <span class="pill ${pillClass(payableStatus(row))}">${escapeHtml(payableStatus(row))}</span>
                                </div>
                                <div class="inv-list-bottom">
                                    <span>${escapeHtml(row.vendor)}</span>
                                    <strong>${peso(row.amount)}</strong>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>

                <!-- RIGHT PANEL: Selected Invoice Details -->
                <div class="invoice-card" style="flex: 1;">
                    <div class="invoice-card-header">
                        <h3>Invoice #: ${escapeHtml(inv.invoice)}</h3>
                        <button class="btn btn-primary btn-sm" id="printInvoiceBtn" style="background:#c2181a; padding:6px 20px;">Print</button>
                    </div>
                    
                    <div class="invoice-card-body">
                        <div class="invoice-info-row">
                            <span class="inv-label">Vendor:</span>
                            <span class="inv-val">${escapeHtml(inv.vendor)}</span>
                        </div>
                        <div class="invoice-info-row">
                            <span class="inv-label">Invoice Date:</span>
                            <span class="inv-val">${escapeHtml(inv.invoiceDate || inv.due)}</span>
                        </div>
                        <div class="invoice-info-row">
                            <span class="inv-label">Due Date:</span>
                            <span class="inv-val">${escapeHtml(inv.due)}</span>
                        </div>
                        <div class="invoice-info-row">
                            <span class="inv-label">Payment Term:</span>
                            <span class="inv-val">30 days</span>
                        </div>
                        <div class="invoice-info-row">
                            <span class="inv-label">Expense Account:</span>
                            <span class="inv-val">—</span>
                        </div>
                        <div class="invoice-info-row">
                            <span class="inv-label">Total Amount:</span>
                            <span class="inv-val" style="font-weight:700;">${peso(inv.amount)}</span>
                        </div>
                    </div>

                    <div class="invoice-voucher-header">
                        <h4>Voucher Details</h4>
                        <div class="invoice-search">
                            <input type="search" placeholder="Search..." id="invoiceVoucherSearch" data-invoice-search="true" />
                        </div>
                    </div>

                    <div class="table-wrap invoice-voucher-scroll">
                    <table class="invoice-voucher-table" id="invoiceVoucherTable">
                        <thead>
                            <tr>
                                <th>Voucher No</th>
                                <th>Date</th>
                                <th>Amount Paid</th>
                                <th>Payment Method</th>
                                <th>Due Date</th>
                                <th>Check No</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${vouchers.length ? vouchers.map(v => `
                                <tr class="voucher-row" data-search="${escapeHtml(`${v.no} ${v.date} ${v.amt} ${v.method} ${v.due} ${v.status}`.toLowerCase())}">
                                    <td>${escapeHtml(v.no)}</td>
                                    <td>${escapeHtml(v.date)}</td>
                                    <td>${peso(v.amt)}</td>
                                    <td>${escapeHtml(v.method)}</td>
                                    <td>${escapeHtml(v.due)}</td>
                                    <td>—</td>
                                    <td><span class="pill ${pillClass(v.status)}">${escapeHtml(v.status)}</span></td>
                                </tr>
                            `).join('') : `
                                <tr><td colspan="7"><div style="text-align:center; color:#888; padding:16px;">No vouchers recorded for this invoice yet.</div></td></tr>
                            `}
                        </tbody>
                    </table>
                    </div>

                    <div class="invoice-footer-totals">
                        <div>Total Paid: <strong>${peso(totalPaid)}</strong></div>
                        <div>Remaining Balance: <strong>${peso(remainingBalance)}</strong></div>
                    </div>
                </div>
            </div>
        `;

        // Re-render in place — same DOM nodes kept, listener attached once.
        const newContainer = container;

        // Delegate the master-list click on the container itself. Guard so we
        // don't stack listeners every time the view re-renders.
        if (!newContainer.dataset.boundInvoiceClick) {
            newContainer.dataset.boundInvoiceClick = 'true';
            newContainer.addEventListener('click', (e) => {
                const item = e.target.closest('.invoice-list-item');
                if (!item) return;
                e.preventDefault();
                const id = item.dataset.id;
                if (id && String(id) !== String(activePayableId)) {
                    activePayableId = id;
                    renderInvoiceView(id);
                }
            });
        }

        // Add search functionality for vouchers (delegated, bound once on body)
        if (!document.body.dataset.invoiceVoucherSearchBound) {
            document.body.dataset.invoiceVoucherSearchBound = '1';
            document.body.addEventListener('input', (e) => {
                const input = e.target;
                if (!input || !input.matches || !input.matches('[data-invoice-search]')) return;
                const card = input.closest('.invoice-card');
                const table = card && card.querySelector('#invoiceVoucherTable');
                if (!table) return;
                const query = String(input.value || '').toLowerCase().trim();
                table.querySelectorAll('.voucher-row').forEach((row) => {
                    const text = (row.dataset.search || row.textContent || '').toLowerCase();
                    row.style.display = !query || text.includes(query) ? '' : 'none';
                });
            });
        }

        // Add print functionality with progress animation
        const printBtn = newContainer.querySelector('#printInvoiceBtn');
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                runExportProgress({
                    filename: `Invoice_${inv.invoice}.pdf`,
                    format: 'pdf',
                    onDownload: () => {
                        const printWindow = window.open('', '_blank', 'width=900,height=800');
                        if (!printWindow) { toast('Allow pop-ups to print.', 'error'); return; }
                        
                        // Clone the content but remove the action buttons/search before printing
                        const clone = newContainer.querySelector('.invoice-card').cloneNode(true);
                        const searchBar = clone.querySelector('.invoice-voucher-header');
                        const printBtnClone = clone.querySelector('#printInvoiceBtn');
                        if (searchBar) searchBar.remove();
                        if (printBtnClone) printBtnClone.remove();
                        
                        const cardContent = clone.innerHTML;
                        
                        printWindow.document.write(`
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <title>Invoice ${escapeHtml(inv.invoice)}</title>
                                <style>
                                    body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
                                    h3 { font-size: 24px; margin-bottom: 20px; }
                                    .invoice-card-header { margin-bottom: 20px; }
                                    .invoice-card-body { display: flex; flex-direction: column; gap: 12px; margin-bottom: 30px; font-size: 14px; }
                                    .invoice-info-row { display: flex; }
                                    .inv-label { width: 150px; font-weight: bold; }
                                    .invoice-voucher-table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
                                    .invoice-voucher-table th { background: #a01515; color: #fff; text-align: left; padding: 10px; }
                                    .invoice-voucher-table td { padding: 10px; border-bottom: 1px solid #eee; }
                                    .invoice-footer-totals { display: flex; justify-content: space-between; margin-top: 20px; font-weight: bold; font-size: 14px; }
                                    .pill { padding: 3px 8px; border-radius: 12px; font-size: 11px; background: #eee; }
                                    .pill.success { background: #d4edda; color: #155724; }
                                    .pill.warning { background: #fff3cd; color: #856404; }
                                    .pill.danger { background: #f8d7da; color: #721c24; }
                                </style>
                            </head>
                            <body>
                                ${cardContent}
                            </body>
                            </html>
                        `);
                        printWindow.document.close();
                        printWindow.focus();
                        setTimeout(() => printWindow.print(), 150);
                    }
                });
            });
        }
    }

    function payableForm(pay = null) {
        const isEdit = !!pay;
        const p = pay || { vendor: '', invoice: '', invoiceDate: todayDateString(), due: todayDateString(), amount: '', status: 'For review' };
        return `
            <form id="apForm" novalidate class="split-form">
                <section class="split-section">
                    ${splitHeader('doc', 'Bill Details')}
                    <div class="split-grid">
                        <div class="split-field full">
                            <label for="ap-vendor">Vendor</label>
                            <input type="text" id="ap-vendor" name="vendor" placeholder="Enter vendor name" value="${escapeHtml(p.vendor)}" required />
                            <span class="error-text">Enter the vendor name.</span>
                        </div>
                        <div class="split-field">
                            <label for="ap-invoice">Bill No.</label>
                            <input type="text" id="ap-invoice" name="invoice" placeholder="Enter bill number" value="${escapeHtml(p.invoice)}" required />
                            <span class="error-text">Enter a bill number.</span>
                        </div>
                        <div class="split-field">
                            <label for="ap-amount">Amount</label>
                            ${splitPeso(`<input type="number" id="ap-amount" name="amount" min="0" step="100" placeholder="Enter Amount" value="${p.amount}" required />`)}
                            <span class="error-text">Enter a valid amount.</span>
                        </div>
                        <div class="split-field">
                            <label for="ap-invoice-date">Invoice Date</label>
                            <input class="picker-input" type="date" id="ap-invoice-date" name="invoiceDate" value="${escapeHtml(p.invoiceDate || p.due)}" required />
                        </div>
                        <div class="split-field">
                            <label for="ap-due">Due Date</label>
                            <input class="picker-input" type="date" id="ap-due" name="due" value="${escapeHtml(p.due)}" required />
                        </div>
                        <div class="split-field">
                            <label for="ap-status">Status</label>
                            <select id="ap-status" name="status">
                                ${['For review', 'Approved', 'Due', 'Paid'].map(s => `<option ${p.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                </section>
                ${splitActions(isEdit ? 'Save Changes' : 'Save Bill')}
            </form>
        `;
    }

    function openPayableForm(pay = null) {
        const isEdit = !!pay;
        openSplitModal({
            heading: isEdit ? 'EDIT BILL' : 'ADD BILL',
            subtitle: isEdit
                ? 'Update the bill details to keep your payables accurate.'
                : 'Fill in the necessary details to record a new vendor bill.',
            body: payableForm(pay),
            onCancel: closeModal,
            onSubmit: (form) => {
                const data = Object.fromEntries(new FormData(form).entries());
                let valid = true;
                const mark = (name, err) => {
                    const f = form.querySelector(`[name="${name}"]`)?.closest('.split-field, .form-field');
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
                    store.payables.unshift({ id: nextId('AP', store.payables), ...payload });
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
        const pay = (store.payables || []).find(p => String(p.id) === String(id));
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
            store.payables = store.payables.filter(p => String(p.id) !== String(id));
            saveStore();
            toast('Bill removed.', 'info');
            renderPayableRows();
        }
    }

    /* -------------------- CASH / BANK -------------------- */

    function buildCashBank() {
        const rows = store.cashBank || [];

        // Calculate stats based on the data
        const totalCash = financeTotals.cashBank();
        const cashOnHand = rows.filter(row => /cash/i.test(row.account)).reduce((sum, r) => sum + (r.balance ? Number(r.balance) : 0), 0);
        const bankBalance = rows.filter(row => !/cash/i.test(row.account)).reduce((sum, r) => sum + (r.balance ? Number(r.balance) : 0), 0);

        // Money in/out are derived from financial transactions (Sales = in, others = out)
        const txRows = store.transactions || [];
        const isMoneyIn = (r) => String(r.source || '').toLowerCase() === 'sales';
        const moneyIn = txRows.filter(isMoneyIn).reduce((sum, r) => sum + (r.amount ? Number(r.amount) : 0), 0);
        const moneyOut = txRows.filter(r => !isMoneyIn(r)).reduce((sum, r) => sum + (r.amount ? Number(r.amount) : 0), 0);

        // Filter for recent transactions
        const incomingRows = txRows.filter(isMoneyIn).map(r => ({ date: r.date, amount: r.amount, reference: r.reference, description: r.description }));
        const outgoingRows = txRows.filter(r => !isMoneyIn(r)).map(r => ({ date: r.date, amount: r.amount, reference: r.reference, description: r.description }));

        // Render the visual bars for Money In/Out
        const flowBars = (items) => {
            const displayItems = items.slice(0, 5);
            const values = displayItems.map(item => Number(item.amount || 0));
            const max = Math.max(...values, 1);
            return displayItems.map((item) => {
                const value = Number(item.amount || 0);
                const widthPercent = Math.max(8, Math.round((value / max) * 100));
                const label = String(item.date || '').slice(5); // Extract MM-DD
                return `<div class="flow-row">
                            <span class="flow-date">${escapeHtml(label)}</span>
                            <div class="flow-track"><i style="width: ${widthPercent}%;"></i></div>
                            <span class="flow-amount">${peso(value)}</span>
                        </div>`;
            }).join('');
        };

        const cashStats = [
            ['Total Cash Balance', totalCash, '<svg viewBox="0 0 24 24" fill="none" stroke="#c2181a" stroke-width="1.8"><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 9v6M18 9v6"/></svg>'],
            ['Cash on Hand', cashOnHand, '<svg viewBox="0 0 24 24" fill="none" stroke="#c2181a" stroke-width="1.8"><path d="M3 8h18v10H3z"/><path d="M3 8 6 5h12l3 3M15 13h3"/></svg>'],
            ['Total Bank Balance', bankBalance, '<svg viewBox="0 0 24 24" fill="none" stroke="#c2181a" stroke-width="1.8"><path d="m3 9 9-5 9 5M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/></svg>'],
            ['Money In', moneyIn, '<svg viewBox="0 0 24 24" fill="none" stroke="#2f9b52" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 16V8M8.5 11.5 12 8l3.5 3.5"/></svg>'],
            ['Money Out', moneyOut, '<svg viewBox="0 0 24 24" fill="none" stroke="#c2181a" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8.5 12.5 12 16l3.5-3.5"/></svg>']
        ];

        return `
            <div class="section-title">
                <h2>Cash / Bank</h2>
            </div>

            <!-- 5 Stat Cards -->
            <div class="cash-stat-grid">
                ${cashStats.map((stat, index) => `
                    <div class="fin-stat-card ${index === 0 ? 'fin-stat-card-highlight' : ''}">
                        <div class="fin-stat-head">
                            <span class="fin-stat-icon" style="background:transparent;">${stat[2]}</span>
                            <span class="fin-stat-label">${stat[0]}</span>
                        </div>
                        <div class="fin-stat-value">${peso(stat[1])}</div>
                    </div>
                `).join('')}
            </div>

            <!-- Cash / Bank Accounts Card -->
            <div class="card cash-accounts-card">
                <div class="cash-accounts-heading">
                    <h3>Cash / Bank Accounts</h3>
                    <button class="btn btn-sm" type="button" id="bankReconciliationBtn" style="background:#fff; color:#c2181a; border:1px solid #f0d0d0; border-radius:6px; font-weight:600;">Bank Reconciliation</button>
                </div>

                <div class="cash-toolbar">
                    <div class="search-wrap">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                        <input type="search" placeholder="Search..." id="cbSearch" />
                    </div>
                    <div class="custom-filter-dropdown" data-id="cbType">
                        <button type="button" class="custom-filter-btn" data-value="" style="height: 36px; min-width: 110px; font-size: 13px;">
                            <span class="cfb-text">All Types</span>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
                        </button>
                        <ul class="custom-filter-menu">
                            <li data-value="Cash">Cash</li>
                            <li data-value="Bank">Bank</li>
                        </ul>
                    </div>
<div class="custom-filter-dropdown" data-id="cbStatusFilter">
    <button type="button" class="custom-filter-btn" data-value="" style="height: 36px; min-width: 110px; font-size: 13px;">
        <span class="cfb-text">All Status</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
    </button>
    <ul class="custom-filter-menu">
        <li data-value="Active">Active</li>
        <li data-value="Inactive">Inactive</li>
    </ul>
</div>

                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Account Name</th>
                                <th>Account Type</th>
                                <th>Account Number</th>
                                <th>Current Balance</th>
                                <th>Status</th>
                                <th style="text-align:center;">Action</th>
                            </tr>
                        </thead>
                        <tbody id="cbTbody"></tbody>
                    </table>
                </div>
            </div>
            </div><!-- /.cash-accounts-card -->

            <!-- Recent Transaction Card -->
            <div class="cash-transactions-card">
                <div class="cash-recent-toolbar">
                    <h3>Recent Transaction</h3>
                    <div class="search-wrap">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                        <input type="search" id="cbRecentSearch" placeholder="Search..." aria-label="Search recent transactions" />
                    </div>
                </div>
                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Reference</th>
                                <th>Description</th>
                                <th>Type</th>
                                <th>Amount</th>
                                <th>Account</th>
                            </tr>
                        </thead>
                        <tbody id="cbRecentTbody"></tbody>
                    </table>
                </div>
            </div>

            <!-- Money In/Out Charts -->
            <div class="cash-lower-grid">
                <section class="money-flow-card money-in-chart">
                    <div class="money-flow-head">
                        <h3>Money In</h3>
                        <span class="money-flow-total">${peso(moneyIn)}</span>
                    </div>
                    <div class="money-flow-rows">
                        ${flowBars(incomingRows) || '<div class="flow-empty">No incoming transactions</div>'}
                    </div>
                </section>

                <section class="money-flow-card money-out-chart">
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
        const fmt = (n) => Number(n).toLocaleString('en-PH');

        // One row per bank account (same grouping as the Cash/Bank table)
        const accountMap = new Map();
        (store.cashBank || []).filter(r => !/cash/i.test(r.account)).forEach(r => accountMap.set(r.account, r));
        const accounts = [...accountMap.values()];

        const rowsHtml = accounts.map((a, i) => `
            <div class="bank-recon-row" data-idx="${i}">
                <span>${escapeHtml(a.account)}</span>
                <span>${fmt(Number(a.balance || 0))}</span>
                <span><input class="bank-recon-input" type="number" min="0" step="0.01" name="stmt-${i}" value="${a.statementBalance ?? ''}" aria-label="Statement balance for ${escapeHtml(a.account)}" /></span>
                <span class="recon-diff">—</span>
                <span class="recon-status">—</span>
            </div>
        `).join('');

        openModal({
            title: ' ',
            size: 'md',
            onCancel: closeModal,
            onSubmit: (form) => {
                let entered = 0, review = 0;
                accounts.forEach((a, i) => {
                    const raw = form.querySelector(`[name="stmt-${i}"]`)?.value;
                    if (raw === '' || raw == null) return;
                    entered++;
                    a.statementBalance = Number(raw);
                    if (Math.abs(a.statementBalance - Number(a.balance || 0)) >= 0.005) review++;
                });
                if (!entered) { toast('Enter at least one statement balance.', 'info'); return; }
                saveStore();
                if (review === 0) toast('Bank account reconciled successfully.', 'success');
                else toast(`${review} account${review > 1 ? 's' : ''} need review.`, 'info');
                closeModal();
            },
            body: `
                <form id="bankReconciliationForm" novalidate>
                    <div class="bank-recon-modal-title">Bank Reconciliation</div>
                    ${accounts.length ? `
                    <div class="bank-recon-scroll">
                        <div class="bank-recon-head">
                            <span>Account</span>
                            <span>System Balance</span>
                            <span>Balance Statement</span>
                            <span>Difference</span>
                            <span>Status</span>
                        </div>
                        <div class="bank-recon-body">${rowsHtml}</div>
                    </div>` : `<div class="empty-state"><p>No bank accounts to reconcile.</p></div>`}
                    <div class="form-actions">
                        <button type="button" class="btn btn-subtle" data-act="cancel">Cancel</button>
                        ${accounts.length ? '<button type="submit" class="btn btn-primary">Reconcile</button>' : ''}
                    </div>
                </form>
            `
        });

        const modalEl = document.getElementById('modal');
        if (modalEl) modalEl.className = 'modal bank-recon-modal';

        // Live difference / status
        const update = (rowEl) => {
            const a = accounts[Number(rowEl.dataset.idx)];
            const raw = rowEl.querySelector('.bank-recon-input').value;
            const diffEl = rowEl.querySelector('.recon-diff');
            const statusEl = rowEl.querySelector('.recon-status');
            if (raw === '') { diffEl.textContent = '—'; statusEl.textContent = '—'; return; }
            const diff = Number(raw) - Number(a.balance || 0);
            diffEl.textContent = fmt(Math.abs(diff) < 0.005 ? 0 : diff);
            statusEl.textContent = Math.abs(diff) < 0.005 ? 'Reconciled' : 'Review';
        };
        document.querySelectorAll('#bankReconciliationForm .bank-recon-row').forEach(rowEl => {
            update(rowEl);
            rowEl.querySelector('.bank-recon-input').addEventListener('input', () => update(rowEl));
        });
    }

    function renderCashBankRows() {
        const tbody = $('#cbTbody');
        if (!tbody) return;
        const q = ($('#cbSearch')?.value || '').trim().toLowerCase();
        const type = $('.custom-filter-dropdown[data-id="cbType"] .custom-filter-btn')?.dataset.value || '';
        const statusFilter = $('.custom-filter-dropdown[data-id="cbStatusFilter"] .custom-filter-btn')?.dataset.value || '';

        // Filter the accounts
        const rows = (store.cashBank || []).filter(r => {
            const matchQ = !q || `${r.account} ${r.description} ${r.id} ${r.accountNumber}`.toLowerCase().includes(q);
            
            const rowCategory = /cash/i.test(r.account) ? 'Cash' : 'Bank';
            const matchT = !type || rowCategory === type;
            
            // Since your cashBank data doesn't have a built-in 'status' field, 
            // we check if the record has an explicit 'Inactive' status, otherwise default to 'Active'
            const rowStatus = r.status || 'Active';
            const matchSt = !statusFilter || rowStatus === statusFilter;
            
            return matchQ && matchT && matchSt;
        });

        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>No cash or bank movements found.</p></div></td></tr>`;
            return;
        }

        // Group by account to show unique accounts in the main table
        const accountMap = new Map();
        rows.forEach(r => accountMap.set(r.account, r));

        tbody.innerHTML = [...accountMap.values()].map(r => `
            <tr data-id="${escapeHtml(r.id)}">
                <td><strong>${escapeHtml(r.account)}</strong></td>
                <td>${/cash/i.test(r.account) ? 'Cash' : 'Bank'}</td>
                <td>${escapeHtml(r.accountNumber || '1234-5678')}</td>
                <td>${peso(r.balance)}</td>
                <td><span class="cash-active-badge">Active</span></td>
                <td style="text-align:center;">
                    <button class="btn-view-cash" data-act="editCb" data-id="${escapeHtml(r.id)}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>
                        View
                    </button>
                </td>
            </tr>
        `).join('');

        // Render Recent Transactions table
        const recentBody = $('#cbRecentTbody');
        const recentQuery = ($('#cbRecentSearch')?.value || '').trim().toLowerCase();
        const recentRows = (store.cashBank || [])
            .filter(r => !recentQuery || `${r.date} ${r.id} ${r.description} ${r.type} ${r.account}`.toLowerCase().includes(recentQuery))
            .slice(0, 5); // Show top 5

        if (recentBody) {
            recentBody.innerHTML = recentRows.length ? recentRows.map(r => `
                <tr>
                    <td>${escapeHtml(r.date)}</td>
                    <td>${escapeHtml(r.id)}</td>
                    <td>${escapeHtml(r.description)}</td>
                    <td>${escapeHtml(r.type === 'Credit' ? 'In' : 'Out')}</td>
                    <td>${peso(r.amount)}</td>
                    <td>${escapeHtml(r.account)}</td>
                </tr>
            `).join('') : '<tr><td colspan="6"><div class="empty-state"><p>No recent transactions.</p></div></td></tr>';
        }
    }

    function openCashBankViewModal(cb) {
        const isCash = /cash/i.test(cb.account);

        openModal({
            title: ' ',
            size: 'md',
            onCancel: closeModal,
            body: `
                <div class="view-modal-split">
                    <!-- Left Panel: Branding -->
                    <div class="view-modal-left">
                        <div style="display:flex; align-items:center; gap:10px; margin-bottom:32px;">
                            <img src="assets/logo.png" style="height:44px; width:auto; object-fit:contain; flex-shrink:0;" alt="DEVS logo">
                            <img src="assets/icon-devs.png" style="width:150px; height:auto; object-fit:contain;" alt="DEVS">
                        </div>

                        <h3 style="margin-bottom:8px; font-size:18px; font-weight:700;">ACCOUNT DETAILS</h3>
                        <p style="margin:0; font-size:13px; line-height:1.5; color:rgba(255,255,255,0.85);">Manage the details of this account.</p>

                        <!-- Paper Icon -->
                        <div style="margin-top:auto; padding-bottom:20px; display:flex; justify-content:center; align-items:flex-end;">
                            <img src="assets/tilted-paper.png" style="width: 140px; height: auto; object-fit: contain; opacity: 0.3;" alt="Paper Icon" />
                        </div>
                    </div>

                    <!-- Right Panel: Details -->
                    <div class="view-modal-right">
                        <h2>View Details</h2>
                        <p class="view-subtitle">${escapeHtml(cb.id)}</p>

                        <div class="view-data-list">
                            <div class="view-modal-row"><span>Account No.:</span> <strong>${escapeHtml(cb.accountNumber || '1234-5678')}</strong></div>
                            <div class="view-modal-row"><span>Account Name:</span> <strong>${escapeHtml(cb.account)}</strong></div>
                            <div class="view-modal-row"><span>Account Type:</span> <strong>${isCash ? 'Cash' : 'Bank'}</strong></div>
                            <div class="view-modal-row"><span>Current Balance:</span> <strong>${peso(cb.balance)}</strong></div>
                            <div class="view-modal-row"><span>Status:</span> <strong style="color:#1aa846;">Active</strong></div>
                        </div>

                        <div style="text-align:right; margin-top:40px;">
                            <button class="acc-btn-cancel" type="button" data-act="cancel">Close</button>
                        </div>
                    </div>
                </div>
            `
        });

        // Apply the exact split modal styling
        const modalEl = document.getElementById('modal');
        if (modalEl) {
            modalEl.className = 'modal modal-split receivable-view-modal';
        }
    }

    function cashBankForm(cb = null) {
        const isEdit = !!cb;
        const c = cb || { account: 'BDO Operating', date: todayDateString(), description: '', type: 'Credit', amount: '', balance: '' };
        const accounts = ['BDO Operating', 'BPI Payroll', 'Petty Cash', 'Cash on Hand'];
        return `
            <form id="cbForm" novalidate class="split-form">
                <section class="split-section">
                    ${splitHeader('bank', 'Entry Details')}
                    <div class="split-grid">
                        <div class="split-field">
                            <label for="cb-account">Account</label>
                            <select id="cb-account" name="account">
                                ${accounts.map(a => `<option ${a === c.account ? 'selected' : ''}>${a}</option>`).join('')}
                            </select>
                        </div>
                        <div class="split-field">
                            <label for="cb-date">Date</label>
                            <input class="picker-input" type="date" id="cb-date" name="date" value="${escapeHtml(c.date)}" required />
                        </div>
                        <div class="split-field full">
                            <label for="cb-description">Description</label>
                            <input type="text" id="cb-description" name="description" placeholder="Enter description" value="${escapeHtml(c.description)}" required />
                            <span class="error-text">Enter a description.</span>
                        </div>
                        <div class="split-field">
                            <label for="cb-type">Type</label>
                            <select id="cb-type" name="type">
                                <option ${c.type === 'Credit' ? 'selected' : ''}>Credit</option>
                                <option ${c.type === 'Debit' ? 'selected' : ''}>Debit</option>
                            </select>
                        </div>
                        <div class="split-field">
                            <label for="cb-amount">Amount</label>
                            ${splitPeso(`<input type="number" id="cb-amount" name="amount" min="0" step="100" placeholder="Enter Amount" value="${c.amount}" required />`)}
                            <span class="error-text">Enter a valid amount.</span>
                        </div>
                        <div class="split-field full">
                            <label for="cb-balance">Resulting Balance</label>
                            ${splitPeso(`<input type="number" id="cb-balance" name="balance" min="0" step="100" placeholder="Enter resulting balance" value="${c.balance}" required />`)}
                            <span class="error-text">Enter the resulting balance.</span>
                        </div>
                    </div>
                </section>
                ${splitActions(isEdit ? 'Save Changes' : 'Save Entry')}
            </form>
        `;
    }

    function openCashBankForm(cb = null) {
        const isEdit = !!cb;
        openSplitModal({
            heading: isEdit ? 'EDIT CASH / BANK ENTRY' : 'ADD CASH / BANK ENTRY',
            subtitle: isEdit
                ? 'Update the entry details to keep your balances accurate.'
                : 'Fill in the necessary details to record a new cash or bank entry.',
            body: cashBankForm(cb),
            onCancel: closeModal,
            onSubmit: (form) => {
                const data = Object.fromEntries(new FormData(form).entries());
                let valid = true;
                const mark = (name, err) => {
                    const f = form.querySelector(`[name="${name}"]`)?.closest('.split-field, .form-field');
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
        const cb = (store.cashBank || []).find(c => String(c.id) === String(id));
        if (!cb) return;
        if (act === 'editCb') openCashBankViewModal(cb);
        if (act === 'deleteCb') {
            const ok = await confirmDialog({
                title: 'Delete Entry',
                message: `Remove "${cb.description}" from ${cb.account}?`,
                confirmLabel: 'Delete',
                danger: true
            });
            if (!ok) return;
            store.cashBank = store.cashBank.filter(c => String(c.id) !== String(id));
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

    const EXP_COLORS = ['#d9001b', '#ff7f50', '#ffc233', '#72c02c', '#6aaeff'];

    function expStatusMeta(status) {
        const s = String(status || '').toLowerCase();
        // Treat 'paid' as 'approved' to match the UI logic
        if (s === 'paid' || s === 'posted' || s === 'approved') return { label: 'Approved', key: 'approved' };
        if (s === 'for review' || s === 'pending' || s === 'review') return { label: 'Pending', key: 'pending' };
        return { label: status || '—', key: 'other' };
    }

    // Top 4 categories + "Others"
    function groupExpenseCats(rows) {
        const catMap = {};
        rows.forEach(r => {
            const cat = r.category || 'Others';
            catMap[cat] = (catMap[cat] || 0) + Number(r.amount || 0);
        });
        const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
        if (sorted.length > 5) {
            const rest = sorted.slice(4).reduce((s, [, v]) => s + v, 0);
            return [...sorted.slice(0, 4), ['Others', rest]];
        }
        return sorted;
    }

    // Pie chart + legend + footer stats for a status filter ('' = all)
    function expensePieParts(filterKey = '') {
        const rows = (store.expenses || []).filter(r => !filterKey || expStatusMeta(r.status).key === filterKey);
        const grouped = groupExpenseCats(rows);
        const total = grouped.reduce((s, [, v]) => s + v, 0);
        let svg = '<div class="exd-empty">No data</div>';
        let legend = '<li class="exd-empty">No categories yet</li>';
        if (total > 0) {
            const cx = 100, cy = 100, r = 92;
            let angle = -Math.PI / 2;
            const slices = grouped.map(([cat, amt], i) => {
                const frac = amt / total;
                const color = EXP_COLORS[i % EXP_COLORS.length];
                const start = angle;
                const end = angle + frac * 2 * Math.PI;
                angle = end;
                const mid = (start + end) / 2;
                const label = frac >= 0.06
                    ? `<text x="${(cx + Math.cos(mid) * r * 0.62).toFixed(1)}" y="${(cy + Math.sin(mid) * r * 0.62).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" class="exd-pie-label">${Math.round(frac * 100)}%</text>`
                    : '';
                if (frac >= 0.9999) return `<circle data-exp-cat="${escapeHtml(cat)}" role="button" tabindex="0" cx="${cx}" cy="${cy}" r="${r}" fill="${color}"></circle>${label}`;
                const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
                const x2 = cx + r * Math.cos(end),   y2 = cy + r * Math.sin(end);
                return `<path data-exp-cat="${escapeHtml(cat)}" role="button" tabindex="0" d="M${cx} ${cy} L${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${frac > 0.5 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z" fill="${color}" stroke="#fff" stroke-width="1"></path>${label}`;
            }).join('');
            svg = `<svg viewBox="0 0 200 200" class="exd-pie-svg" role="img" aria-label="Expenses by category">${slices}</svg>`;
            legend = grouped.map(([cat, amt], i) => `
                <li data-exp-cat="${escapeHtml(cat)}" role="button" tabindex="0" title="View ${escapeHtml(cat)} expenses">
                    <span class="exd-dot" style="background:${EXP_COLORS[i % EXP_COLORS.length]}"></span>
                    <span class="exd-legend-name">${escapeHtml(cat)}</span>
                    <span class="exd-legend-pct">${((amt / total) * 100).toFixed(1)}%</span>
                    <strong class="exd-legend-amt">${peso(amt)}</strong>
                </li>`).join('');
        }
        return {
            svg, legend,
            cats: grouped.length,
            total,
            top: grouped.length ? grouped[0][0] : '—'
        };
    }

    function renderExpensePie(filterKey = '') {
        const wrap = $('#expPieWrap');
        if (!wrap) return;
        const d = expensePieParts(filterKey);
        wrap.innerHTML = d.svg;
        $('#expLegend').innerHTML = d.legend;
        $('#expStatCats').textContent = d.cats;
        $('#expStatTotal').textContent = peso(d.total);
        $('#expStatTop').textContent = d.top;
    }

    function buildExpenses() {
        const rows = store.expenses || [];
        const sum = (arr) => arr.reduce((s, r) => s + Number(r.amount || 0), 0);
        const total = financeTotals.expenses();
        const pending = sum(rows.filter(r => expStatusMeta(r.status).key === 'pending'));
        const approved = sum(rows.filter(r => expStatusMeta(r.status).key === 'approved'));
        const paid = sum(rows.filter(r => expStatusMeta(r.status).key === 'paid'));

        const now = new Date();
        const thisMonth = sum(rows.filter(r => {
            if (!r.date) return false;
            const d = new Date(r.date);
            return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        }));

        const grouped = groupExpenseCats(rows);

        const breakdownRows = grouped.length
            ? grouped.map(([cat, amt]) => `
                <div class="exd-bd-row">
                    <span class="exd-bd-cat">${escapeHtml(cat)}</span>
                    <span class="exd-bd-amt">${peso(amt)}</span>
                </div>`).join('')
            : '<div class="exd-empty">No expense data yet.</div>';

        const pie = expensePieParts('');

        const ico = {
            total:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
            pending: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
            approved:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><path d="m7.5 12.5 3 3 6-7" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
            paid:    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 3 6v6c0 5 3.8 8.7 9 10 5.2-1.3 9-5 9-10V6z"/><path d="m8 12 3 3 5-6" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
            month:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><circle cx="16.5" cy="16" r="3.5" fill="#fff"/><path d="M16.5 14.5V16l1 .8"/></svg>'
        };
        const stats = [
            { label: 'Total Expenses',   value: peso(total),    cls: 'is-total',    icon: ico.total },
            { label: 'Pending Approval', value: peso(pending),  cls: 'is-pending',  icon: ico.pending },
            { label: 'Approved Expenses',value: peso(approved), cls: 'is-approved', icon: ico.approved },
            { label: 'Paid Expenses',    value: peso(paid),     cls: 'is-paid',     icon: ico.paid }
        ];

        return `
            <div class="exd-stat-grid">
                ${stats.map(s => `
                    <div class="exd-stat ${s.cls}">
                        <div class="exd-stat-head"><span class="exd-stat-icon">${s.icon}</span><span class="exd-stat-label">${s.label}</span></div>
                        <strong class="exd-stat-value">${s.value}</strong>
                    </div>`).join('')}
            </div>

            <div class="exd-mid-grid">
                <section class="exd-card exd-month">
                    <div class="exd-month-title"><span class="exd-month-icon">${ico.month}</span>This Month</div>
                    <div class="exd-month-value">${peso(thisMonth)}</div>
                </section>
                <section class="exd-card exd-breakdown">
                    <h3 class="exd-title">Expense Breakdown</h3>
                    <div class="exd-bd-list">${breakdownRows}</div>
                </section>
            </div>

            <section class="exd-card exd-records">
                <div class="exd-records-head">
                    <h3 class="exd-title">Expense Record</h3>
                    <div class="exd-tools">
                        <label class="exd-search">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                            <input type="search" id="expSearch" placeholder="Search..." />
                        </label>
                        <div class="custom-filter-dropdown" data-id="expStatusFilter">
                            <button type="button" class="custom-filter-btn" data-value="" data-default-text="Status" style="height: 32px; min-width: 120px; font-size: 13px;">
                                <span class="cfb-text">Status</span>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
                            </button>
                            <ul class="custom-filter-menu">
                                <li data-value="approved">Approved</li>
                                <li data-value="pending">Pending</li>
                            </ul>
                        </div>
                        ${canManageRecords() ? '<button class="exd-add-btn" type="button" id="addExpBtn">+ Add Voucher</button>' : ''}
                    </div>
                </div>
                <div class="exd-table-scroll">
                    <table class="exd-table" id="expTable">
                        <thead>
                            <tr>
                                <th>ID</th><th>Category</th><th>Description</th><th>Date</th>
                                <th>Requested by</th><th>Amount</th><th>Payment Method</th><th>Status</th><th>Action</th>
                            </tr>
                        </thead>
                        <tbody id="expTbody"></tbody>
                    </table>
                </div>
                ${canExportRecords() ? `
                <div class="exd-foot">
                    <button class="exd-export-btn" type="button" data-export="expenses">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M8 11l4 4 4-4M3 21h18"/></svg>
                        Export CSV
                    </button>
                </div>` : ''}
            </section>

            <section class="fin-summary-panel exd-monthly">
                <header class="fin-summary-header">
                    <div class="fin-summary-title">
                        <div class="fin-summary-icon">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12A9 9 0 1 1 12 3v9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/></svg>
                        </div>
                        <div>
                            <h3>Monthly Expenses</h3>
                        </div>
                    </div>
                    <div class="fin-summary-filters" id="expPieFilters">
                        <button type="button" class="is-active" data-status="">All</button>
                        <button type="button" data-status="paid"><span class="dot dot-paid"></span>Paid</button>
                        <button type="button" data-status="approved"><span class="dot dot-approved"></span>Approved</button>
                        <button type="button" data-status="pending"><span class="dot dot-fulfilling"></span>Pending</button>
                    </div>
                </header>

                <div class="exd-pie-body">
                    <div class="exd-pie-wrap" id="expPieWrap">${pie.svg}</div>
                    <ul class="exd-legend" id="expLegend">${pie.legend}</ul>
                </div>

                <footer class="fin-summary-footer">
                    <div class="fin-summary-stat">
                        <div class="fin-summary-stat-icon">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
                        </div>
                        <div><span>Categories</span><strong id="expStatCats">${pie.cats}</strong></div>
                    </div>
                    <div class="fin-summary-stat">
                        <div class="fin-summary-stat-icon">₱</div>
                        <div><span>Total Amount</span><strong id="expStatTotal">${peso(pie.total)}</strong></div>
                    </div>
                    <div class="fin-summary-stat">
                        <div class="fin-summary-stat-icon">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>
                        </div>
                        <div><span>Top Category</span><strong id="expStatTop">${escapeHtml(pie.top)}</strong></div>
                    </div>
                </footer>
            </section>
        `;
    }

    let expSearchTerm = '';
    let expStatusFilter = '';

    function renderExpenseRows() {
        const tbody = $('#expTbody');
        if (!tbody) return;
        
        // Read from the new custom dropdown
        const statusFilterEl = $('.custom-filter-dropdown[data-id="expStatusFilter"] .custom-filter-btn');
        const filterStatus = statusFilterEl ? (statusFilterEl.dataset.value || '') : '';

        const rows = (store.expenses || []).filter(r => {
            const itemStatus = expStatusMeta(r.status).key;
            // Treat "paid" and "approved" as the same category for filtering
            const matchStatus = !filterStatus || 
                itemStatus === filterStatus || 
                (filterStatus === 'approved' && itemStatus === 'paid');
            
            if (!matchStatus) return false;
            if (!expSearchTerm) return true;
            const q = expSearchTerm.toLowerCase();
            return `${r.voucher || ''} ${r.id || ''} ${r.category || ''} ${r.description || ''} ${r.supplier || ''} ${r.vendor || ''} ${r.paymentMethod || ''} ${r.status || ''}`.toLowerCase().includes(q);
        });

        if (!rows.length) {
            tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><strong>No expense records</strong><p>No vouchers match the current filter.</p></div></td></tr>`;
            return;
        }

        tbody.innerHTML = rows.map(r => {
            const st = expStatusMeta(r.status);
            return `
            <tr data-id="${escapeHtml(r.id)}">
                <td class="exd-id">${escapeHtml(r.voucher || r.id)}</td>
                <td>${escapeHtml(r.category || '—')}</td>
                <td>${escapeHtml(r.description || '—')}</td>
                <td class="exd-date">${escapeHtml(r.date || '—')}</td>
                <td>${escapeHtml(r.supplier || r.vendor || '—')}</td>
                <td class="exd-amount">${peso(r.amount)}</td>
                <td>${escapeHtml(r.paymentMethod || '—')}</td>
                <td><span class="exd-status exd-status-${st.key}">${escapeHtml(st.label)}</span></td>
                <td>
                    <button class="btn-view-cash" type="button" data-act="viewExp" data-id="${escapeHtml(r.id)}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>
                        View
                    </button>
                </td>
            </tr>`;
        }).join('');
    }

    function openExpenseForm(exp = null) {
        const isEdit = !!exp;

        openModal({
            title: isEdit ? `Edit Voucher | ${exp.voucher || exp.id}` : 'Add Voucher Expense',
            size: 'lg',
            onCancel: closeModal,
            body: `
                <div class="voucher-split">
                <div class="voucher-left">
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:32px;">
                        <img src="assets/logo.png" style="height: 44px; width: auto; object-fit: contain; flex-shrink: 0;" alt="DEVS logo">
                        <img src="assets/icon-devs.png" style="width: 150px; height: auto; object-fit: contain;" alt="DEVS">
                    </div>

                    <h3 style="margin-bottom:8px; font-size:18px; font-weight:700;">${isEdit ? 'EDIT VOUCHER EXPENSE' : 'ADD VOUCHER EXPENSE'}</h3>
                    <p style="margin:0; font-size:13px; line-height:1.5; color:rgba(255,255,255,0.85);">
                        ${isEdit
                            ? 'Update the voucher details to keep your expense records accurate.'
                            : 'Fill in the necessary details to record a new expense voucher.'}
                    </p>

                    <div style="margin-top:auto; padding-bottom:20px; display:flex; justify-content:center; align-items:flex-end;">
                        <img src="assets/tilted-paper.png" style="width: 140px; height: auto; object-fit: contain; opacity: 0.3;" alt="Paper Icon" />
                    </div>
                </div>
                <div class="voucher-right modal-split-right">
                    ${expenseForm(exp)}
                </div>
                </div>
            `
        });

        const modalEl = document.getElementById('modal');
        if (modalEl) modalEl.classList.add('modal-split', 'voucher-modal');

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
        const exp = (store.expenses || []).find(x => String(x.id) === String(id));
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
            store.expenses = store.expenses.filter(x => String(x.id) !== String(id));
            saveStore();
            toast('Voucher removed.', 'info');
            renderExpenseRows();
        }
    }

    function viewExpense(exp) {
        const st = expStatusMeta(exp.status);
        const row = (label, value) => `<div class="view-modal-row"><span>${label}</span> <strong>${value}</strong></div>`;

        openModal({
            title: ' ',
            size: 'md',
            onCancel: closeModal,
            body: `
                <div class="view-modal-split">
                    <!-- Left Panel: Branding -->
                    <div class="view-modal-left">
                        <div style="display:flex; align-items:center; gap:10px; margin-bottom:32px;">
                            <img src="assets/logo.png" style="height:44px; width:auto; object-fit:contain; flex-shrink:0;" alt="DEVS logo">
                            <img src="assets/icon-devs.png" style="width:150px; height:auto; object-fit:contain;" alt="DEVS">
                        </div>

                        <h3 style="margin-bottom:8px; font-size:18px; font-weight:700;">EXPENSE DETAILS</h3>
                        <p style="margin:0; font-size:13px; line-height:1.5; color:rgba(255,255,255,0.85);">Manage the accurate expenses of this account.</p>

                        <!-- Paper Icon -->
                        <div style="margin-top:auto; padding-bottom:20px; display:flex; justify-content:center; align-items:flex-end;">
                            <img src="assets/tilted-paper.png" style="width: 140px; height: auto; object-fit: contain; opacity: 0.3;" alt="Paper Icon" />
                        </div>
                    </div>

                    <!-- Right Panel: Details -->
                    <div class="view-modal-right">
                        <h2>Expense Details</h2>
                        <p class="view-subtitle">${escapeHtml(exp.id || exp.voucher)}</p>

                        <div class="view-data-list">
                            ${row('Date:', escapeHtml(exp.date || '—'))}
                            ${row('Category:', escapeHtml(exp.category || '—'))}
                            ${row('Description:', escapeHtml(exp.description || '—'))}
                            ${row('Amount:', peso(exp.amount))}
                            ${row('Paid by:', escapeHtml(exp.supplier || exp.vendor || '—'))}
                            ${row('Method:', escapeHtml(exp.paymentMethod || '—'))}
                            ${exp.reference ? row('Reference:', escapeHtml(exp.reference)) : ''}
                            ${exp.attachmentData ? row('Receipt:', `<a href="${escapeHtml(exp.attachmentData)}" target="_blank" rel="noopener" download="${escapeHtml(exp.attachmentName || 'receipt')}" style="color:#c2181a;text-decoration:none;">Open ${escapeHtml(exp.attachmentName || 'attachment')}</a>`) : ''}
                            ${row('Status:', `<span class="exd-status exd-status-${st.key}">${escapeHtml(st.label)}</span>`)}
                        </div>

                        <div style="text-align:right; margin-top:40px;">
                            <button class="acc-btn-cancel" type="button" data-act="cancel">Close</button>
                        </div>
                    </div>
                </div>
            `
        });

        const modalEl = document.getElementById('modal');
        if (modalEl) modalEl.className = 'modal modal-split receivable-view-modal';
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

    /* ============================================================
       FINANCIAL REPORT EXPORT (Export Report + Export Options)
       ============================================================ */
    const FIN_COLUMNS = [
        { key: 'date', label: 'Date' },
        { key: 'description', label: 'Description' },
        { key: 'category', label: 'Category' },
        { key: 'status', label: 'Status' },
        { key: 'amount', label: 'Amount' }
    ];

    /* Same rows as the Income/Revenue Report table on the page. */
    function finReportRows(opts = {}) {
        const { from = '', to = '', customer = '', status = '', department = '' } = opts;
        return (store.receivables || [])
            .map(r => ({
                date: r.invoiceDate || r.due || '',
                description: r.customer || `Invoice ${r.invoice || r.id}`,
                customer: r.customer || '',
                department: r.department || '',
                category: 'Service Revenue',
                status: r.status || '',
                amount: Number(r.amount) || 0
            }))
            .filter(r => (!from || (r.date && r.date >= from)) && (!to || (r.date && r.date <= to)))
            .filter(r => !customer || r.customer === customer)
            .filter(r => !status || r.status === status)
            .filter(r => !department || r.department === department)
            .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    }

    function finReportInfo(opts = {}) {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        return {
            id: `RPT-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`,
            type: 'Financial Report',
            range: `${opts.from || 'All'} – ${opts.to || 'Present'}`,
            generatedOn: now.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }),
            generatedBy: ($('#topbarName')?.textContent || '').trim() || 'Finance User'
        };
    }

    function finDownloadCsv(rows, info, keys = FIN_COLUMNS.map(c => c.key)) {
        const cols = FIN_COLUMNS.filter(c => keys.includes(c.key));
        const esc = (v) => {
            let str = String(v ?? '');
            if (/^\d{4}-\d{2}-\d{2}$/.test(str) || /^[A-Z][a-z]{2} \d{1,2}, \d{4}$/.test(str)) {
                str = `\t${str}`;
            }
            return `"${str.replace(/"/g, '""')}"`;
        };
        const lines = [cols.map(c => esc(c.label)).join(',')];
        rows.forEach(r => lines.push(cols.map(c => esc(c.key === 'amount' ? r.amount.toFixed(2) : r[c.key])).join(',')));
        const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `DEVS_FinancialReport_${info.id}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(link.href), 100);
        toast('Excel export downloaded.', 'success');
    }

    function finPrintReport(rows, info, keys = FIN_COLUMNS.map(c => c.key)) {
        const cols = FIN_COLUMNS.filter(c => keys.includes(c.key));
        const total = rows.reduce((s, r) => s + r.amount, 0);
        const cell = (r, c) => c.key === 'amount' ? peso(r.amount) : r[c.key];
        const hasAmount = cols.some(c => c.key === 'amount');
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(info.id)}</title>
            <style>
                body{font-family:Arial,Helvetica,sans-serif;color:#222;margin:32px;}
                h1{margin:0 0 4px;font-size:22px;color:#9c2625;} p{margin:2px 0;font-size:12px;color:#555;}
                table{width:100%;border-collapse:collapse;margin-top:18px;font-size:12px;}
                th{background:#b71c1c;color:#fff;text-align:left;padding:9px 10px;}
                td{padding:8px 10px;border-bottom:1px solid #e5d5d5;} .num{text-align:right;}
                tfoot td{font-weight:700;border-top:2px solid #b71c1c;border-bottom:0;}
            </style></head><body>
            <h1>DEVS · ${escapeHtml(info.type)}</h1>
            <p>Report ID: ${escapeHtml(info.id)} &nbsp;|&nbsp; Date range: ${escapeHtml(info.range)}</p>
            <p>Generated on ${escapeHtml(info.generatedOn)} by ${escapeHtml(info.generatedBy)}</p>
            <table><thead><tr>${cols.map(c => `<th class="${c.key === 'amount' ? 'num' : ''}">${c.label}</th>`).join('')}</tr></thead>
            <tbody>${rows.map(r => `<tr>${cols.map(c => `<td class="${c.key === 'amount' ? 'num' : ''}">${escapeHtml(String(cell(r, c) ?? ''))}</td>`).join('')}</tr>`).join('')}</tbody>
            ${hasAmount ? `<tfoot><tr><td colspan="${cols.length - 1}">Total Revenue</td><td class="num">${escapeHtml(peso(total))}</td></tr></tfoot>` : ''}
            </table></body></html>`;
        const frame = document.createElement('iframe');
        frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
        document.body.appendChild(frame);
        frame.contentDocument.open();
        frame.contentDocument.write(html);
        frame.contentDocument.close();
        setTimeout(() => {
            frame.contentWindow.focus();
            frame.contentWindow.print();
            setTimeout(() => frame.remove(), 1500);
        }, 250);
    }

    /* Export Report dialog: Format, Date Range, Filters (Optional). */
    function openFinExportModal() {
        if (!canExportRecords()) {
            toast('Your role cannot export records.', 'error');
            return;
        }
        const f = finReportFilters;
        const customers = Array.from(new Set((store.receivables || []).map(r => r.customer).filter(Boolean)));
        const statuses = ['Open', 'Overdue', 'Paid'];
        const departments = ['Finance', 'HR', 'Procurement'];
        const opt = (list, all) => `<option value="">${all}</option>` + list.map(o => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('');

        openModal({
            title: ' ',
            size: 'sm',
            onCancel: closeModal,
            body: `
                <form id="finExportForm" novalidate>
                    <div class="fx-head">
                        <span class="fx-head-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg></span>
                        <div><h3>Export Report</h3><p>Financial Reports</p></div>
                    </div>

                    <div class="fx-label fx-label-lg">Format</div>
                    <div class="fx-format">
                        <label class="fx-format-card is-active"><input type="radio" name="format" value="pdf" checked /><img src="assets/icon-pdf.png" alt="" />PDF</label>
                        <label class="fx-format-card"><input type="radio" name="format" value="excel" /><img src="assets/icon-excel.png" alt="" />Excel</label>
                    </div>

                    <div class="fx-label fx-label-lg">Date Range</div>
                    <div class="fx-range">
                        <input class="picker-input" type="date" name="from" value="${escapeHtml(f.from)}" aria-label="From date" />
                        <span>-</span>
                        <input class="picker-input" type="date" name="to" value="${escapeHtml(f.to)}" aria-label="To date" />
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>
                    </div>

                    <div class="fx-label fx-label-lg">Filters <span>(Optional)</span></div>
                    <div class="fx-filter"><small>Customer</small><select name="customer" data-no-search="true">${opt(customers, 'All Customers')}</select></div>
                    <div class="fx-filter"><small>Status</small><select name="status" data-no-search="true">${opt(statuses, 'All Statuses')}</select></div>
                    <div class="fx-filter"><small>Department</small><select name="department" data-no-search="true">${opt(departments, 'All Departments')}</select></div>

                    <div class="fx-actions">
                        <button type="button" class="fx-btn fx-btn-outline" data-act="cancel">Cancel</button>
                        <button type="submit" class="fx-btn fx-btn-solid">Export Report</button>
                    </div>
                </form>`
        });
        document.getElementById('modal')?.classList.add('fin-export-modal');

        const form = document.getElementById('finExportForm');
        form.querySelectorAll('input[name="format"]').forEach(r => r.addEventListener('change', () => {
            form.querySelectorAll('.fx-format-card').forEach(c => c.classList.toggle('is-active', c.querySelector('input').checked));
        }));
        form.querySelector('.fx-range svg')?.addEventListener('click', () => {
            const first = form.querySelector('.fx-range input');
            try { first.showPicker(); } catch (_) { first.focus(); }
        });
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const d = Object.fromEntries(new FormData(form).entries());
            if (d.from && d.to && d.from > d.to) {
                toast('The start date must be before the end date.', 'error');
                return;
            }
            const rows = finReportRows(d);
            if (!rows.length) {
                toast('No records match these filters.', 'error');
                return;
            }
            const info = finReportInfo(d);
            closeModal();
            if (d.format === 'excel') finDownloadCsv(rows, info);
            else finPrintReport(rows, info);
        });
    }

    function openFinExportOptions() {
        const opts = { ...finReportFilters };
        const rows = finReportRows(opts);
        const info = finReportInfo(opts);
        const infoRow = (k, v) => `<div class="fx-info-row"><span>${k}</span><strong>${escapeHtml(v)}</strong></div>`;

        openModal({
            title: ' ',
            size: 'sm',
            onCancel: closeModal,
            body: `
                <div class="fx-options-head">
                    <h3>Export Options</h3>
                    <button type="button" class="fx-close" data-act="cancel" aria-label="Close">✕</button>
                </div>
                <button type="button" class="fx-btn fx-btn-solid fx-btn-block" id="fxPdf">Download PDF</button>
                <button type="button" class="fx-btn fx-btn-outline fx-btn-block" id="fxExcel">Export to Excel</button>
                <button type="button" class="fx-btn fx-btn-outline fx-btn-block" id="fxPrint">Print</button>
                <div class="fx-info">
                    <div class="fx-info-title">Report Information</div>
                    ${infoRow('Report ID', info.id)}
                    ${infoRow('Report Type', info.type)}
                    ${infoRow('Date Range', info.range)}
                    ${infoRow('Generated On', info.generatedOn)}
                    ${infoRow('Generated By', info.generatedBy)}
                    ${infoRow('Records', String(rows.length))}
                </div>`
        });
        document.getElementById('modal')?.classList.add('fin-export-modal', 'fin-export-options');

        const guardRows = (fn) => () => {
            if (!rows.length) { toast('No records match the current filters.', 'error'); return; }
            fn(rows, info);
        };
        document.getElementById('fxPdf')?.addEventListener('click', guardRows(finPrintReport));
        document.getElementById('fxPrint')?.addEventListener('click', guardRows(finPrintReport));
        document.getElementById('fxExcel')?.addEventListener('click', guardRows(finDownloadCsv));
    }

    function buildFinancialReports() {
        const d = computeFinancialReportData();
        const f = finReportFilters;

        const icon = (path) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
        const money = (n) => '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const niceDate = (s) => {
            const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
            if (!m) return s || '—';
            return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        };

        const rows = (store.receivables || [])
            .map(r => ({
                date: r.invoiceDate || r.due || '',
                description: r.customer || `Invoice ${r.invoice || r.id}`,
                category: 'Service Revenue',
                amount: Number(r.amount) || 0
            }))
            .filter(r => (!f.from || (r.date && r.date >= f.from)) && (!f.to || (r.date && r.date <= f.to)))
            .sort((a, b) => String(a.date).localeCompare(String(b.date)));
        const totalRevenue = rows.reduce((s, r) => s + r.amount, 0);

        const stat = (cls, iconPath, label, value, valueCls = '') => `
            <div class="fr-stat ${cls}">
                <div class="fr-stat-head"><span class="fr-stat-icon">${icon(iconPath)}</span><span class="fr-stat-label">${label}</span></div>
                <div class="fr-stat-value ${valueCls}">${value}</div>
            </div>`;

        return `
            <div class="fr-page">
                <div class="fr-actions">
                    ${canExportRecords() ? `
                    <button class="coa-export-top-btn" type="button" id="finExportBtn">
                        ${icon('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/>')}
                        Export PDF / Excel
                    </button>` : ''}
                    <button class="coa-export-top-btn" type="button" id="finGenerateBtn">
                        ${icon('<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>')}
                        Generate Report
                    </button>
                </div>

                <div class="fr-stats">
                    ${stat('fr-third', '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', 'TOTAL REVENUE /<br/>COLLECTION', peso(d.revenue))}
                    ${stat('fr-third', '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>', 'TOTAL EXPENSES', peso(d.expenses))}
                    ${stat('fr-third', '<path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"/><path d="M9 7h6M9 11h6M9 15h4"/>', 'TOTAL PAYABLES', peso(d.payables))}
                    ${stat('fr-half', '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 10h5a2 2 0 0 1 0 4H9"/>', 'TOTAL RECEIVABLES', peso(d.receivables))}
                    ${stat('fr-half', '<rect x="2" y="6" width="16" height="10" rx="2"/><circle cx="10" cy="11" r="2"/><path d="M20 10v8a2 2 0 0 1-2 2H8"/>', 'NET CASH MOVEMENT', `${d.netCash >= 0 ? '+' : '−'}${peso(Math.abs(d.netCash))}`, d.netCash >= 0 ? 'is-positive' : 'is-negative')}
                </div>

                <section class="fr-card fr-report">
                    <div class="fr-report-head">
                        <h3 class="fr-report-title">Income/Revenue Report</h3>
                        <div class="fr-report-dates">
                            <label class="fr-date"><span>From</span><input class="picker-input" type="date" id="finFrom" value="${escapeHtml(f.from)}" /></label>
                            <label class="fr-date"><span>To</span><input class="picker-input" type="date" id="finTo" value="${escapeHtml(f.to)}" /></label>
                        </div>
                    </div>
                    <div class="fr-table">
                        <div class="fr-row fr-row-head"><span>Date</span><span>Description</span><span>Category</span><span class="is-amount">Amount</span></div>
                        ${rows.length ? rows.map(r => `
                            <div class="fr-row">
                                <span>${escapeHtml(niceDate(r.date))}</span>
                                <span>${escapeHtml(r.description)}</span>
                                <span>${escapeHtml(r.category)}</span>
                                <span class="is-amount">${money(r.amount)}</span>
                            </div>`).join('') : `<div class="fr-empty">No revenue records for this period.</div>`}
                        ${rows.length ? `
                            <div class="fr-row fr-row-total">
                                <span></span><span></span><span>Total Revenue</span><span class="is-amount">${money(totalRevenue)}</span>
                            </div>` : ''}
                    </div>
                </section>
            </div>
        `;
    }

    /* -------------------- SETTINGS / ACCOUNT / LOGOUT -------------------- */

    function buildBankReconciliationPage() {
        const accounts = (store.cashBank || []).filter(r => !/cash/i.test(r.account));

        if (!accounts.length) {
            return `
                <div class="bank-recon-page-card">
                    <div class="bank-recon-page-header">
                        <h2>Bank Reconciliation</h2>
                    </div>
                    <div class="empty-state">
                        <p>No bank accounts to reconcile.</p>
                    </div>
                </div>
            `;
        }

        const rows = accounts.map(a => {
            const sysBal = Number(a.balance || 0);
            const stmtBal = Number(a.statementBalance ?? sysBal);
            const diff = stmtBal - sysBal;
            const status = Math.abs(diff) < 0.005 ? 'Reconciled' : 'Review';
            const formatNum = (num) => num.toLocaleString('en-PH');

            return `<div class="bank-recon-row">
                <span>${escapeHtml(a.account)}</span>
                <span>${formatNum(sysBal)}</span>
                <span>${formatNum(stmtBal)}</span>
                <span>${formatNum(diff)}</span>
                <span class="recon-status ${status === 'Reconciled' ? '' : 'is-review'}">${status}</span>
            </div>`;
        }).join('');

        return `
            <div class="bank-recon-page-card">
                <div class="bank-recon-page-header">
                    <h2>Bank Reconciliation</h2>
                </div>
                <div class="bank-recon-scroll">
                    <div class="bank-recon-head">
                        <span>Account</span>
                        <span>System Balance</span>
                        <span>Balance Statement</span>
                        <span>Difference</span>
                        <span>Status</span>
                    </div>
                    <div class="bank-recon-body">
                        ${rows}
                    </div>
                </div>
            </div>
        `;
    }

    let atCurrentPage = 1;
    const AT_ROWS_PER_PAGE = 10;

    function buildAuditTrail() {
        atCurrentPage = 1; // Reset page on build
        return `
            <section class="exd-card exd-records">
                <div class="exd-records-head">
                    <h3 class="exd-title">Audit Trail</h3>
                    <span class="at-count" id="atCount"></span>
                </div>
                <div class="at-toolbar">
                    <label class="exd-search">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
                        <input type="search" id="atSearch" placeholder="Search..." />
                    </label>
                    <label class="fr-date" onclick="event.preventDefault(); var i=this.querySelector('input[type=date]'); if(i){ if(typeof i.showPicker==='function') i.showPicker(); else i.focus(); }">
                        <span>From</span>
                        <input type="date" id="atFrom" value="${escapeHtml(atDateFrom)}" aria-label="From date" />
                    </label>
                    <label class="fr-date" onclick="event.preventDefault(); var i=this.querySelector('input[type=date]'); if(i){ if(typeof i.showPicker==='function') i.showPicker(); else i.focus(); }">
                        <span>To</span>
                        <input type="date" id="atTo" value="${escapeHtml(atDateTo)}" aria-label="To date" />
                    </label>
                    <div class="spacer"></div>
                </div>
                <div class="exd-table-scroll" style="width: 100%;">
                    <table class="exd-table at-table" style="width: 100%;">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Action</th>
                                <th>Module</th>
                                <th>Record ID</th>
                                <th>Details</th>
                                <th>Status</th>
                                <th>Date / Time</th>
                            </tr>
                        </thead>
                        <tbody id="atTbody"></tbody>
                    </table>
                </div>
                <div style="display: flex; justify-content: flex-end; width: 100%; margin-top: 20px;">
                    <footer class="coa-pagination" id="atPagination" style="margin-top: 0;"></footer>
                </div>
            </section>
        `;
    }

    let atDateFrom = '';
    let atDateTo = '';
    const atDateTime = (at) => {
        const d = new Date(String(at || '').replace(' ', 'T'));
        if (Number.isNaN(d.getTime())) return String(at || '—');
        const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return `${date} · ${time}`;
    };
    const atActionLabel = (action) => String(action || '').replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());
    const atModuleLabel = (mod) => String(mod || '—').replace(/\b\w/g, ch => ch.toUpperCase());
    const atStatus = (action) => {
        const a = String(action || '').toLowerCase();
        if (a.includes('reject') || a.includes('fail')) return { label: 'Rejected', key: 'failed' };
        if (a.includes('delete') || a.includes('remove')) return { label: 'Deleted', key: 'failed' };
        if (a.includes('approve')) return { label: 'Approved', key: 'approved' };
        return { label: 'Completed', key: 'completed' };
    };

    async function loadAuditTrail() {
        const tbody = $('#atTbody');
        if (!tbody) return;
        try {
                    const result = await apiRequest('audit');
        const events = result.events || [];

        const q = ($('#atSearch')?.value || '').trim().toLowerCase();
        const from = atDateFrom;
        const to = atDateTo;
        const rows = events.filter(e => {
            const [email, role] = String(e.actor || '').split('|');
            const text = `${email} ${role} ${e.action} ${e.entity} ${e.entityId ?? ''} ${e.details}`.toLowerCase();
            const matchQ = !q || text.includes(q);
            const dateOnly = String(e.at || '').slice(0, 10);
            const matchDate = (!from || (dateOnly && dateOnly >= from)) &&
                              (!to   || (dateOnly && dateOnly <= to));
            return matchQ && matchDate;
        });

            const countEl = $('#atCount');
            if (countEl) countEl.textContent = `${rows.length} event${rows.length === 1 ? '' : 's'}`;

            if (!rows.length) {
                tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><p>No audit events found.</p></div></td></tr>`;
                renderAtPagination(0); // Clear pagination
                return;
            }

            // Pagination logic
            const totalPages = Math.max(1, Math.ceil(rows.length / AT_ROWS_PER_PAGE));
            if (atCurrentPage > totalPages) atCurrentPage = totalPages;
            if (atCurrentPage < 1) atCurrentPage = 1;

            const startIdx = (atCurrentPage - 1) * AT_ROWS_PER_PAGE;
            const pageRows = rows.slice(startIdx, startIdx + AT_ROWS_PER_PAGE);

            let rowsHtml = pageRows.map(e => {
                const [email, role] = String(e.actor || '').split('|');
                const status = atStatus(e.action);
                const action = String(e.action || '').toLowerCase();
                const detail = e.details
                    || (action === 'login' ? 'User signed in' : action === 'logout' ? 'User signed out' : '—');
                return `<tr>
                    <td class="at-user"><strong>${escapeHtml(role || email || '—')}</strong></td>
                    <td>${escapeHtml(atActionLabel(e.action) || '—')}</td>
                    <td>${escapeHtml(atModuleLabel(e.entity))}</td>
                    <td>${escapeHtml(String(e.entityId ?? '—'))}</td>
                    <td>${escapeHtml(detail)}</td>
                    <td><span class="at-status at-status-${status.key}">${escapeHtml(status.label)}</span></td>
                    <td class="at-datetime">${escapeHtml(atDateTime(e.at))}</td>
                </tr>`;
            }).join('');

            // If the last page has fewer than AT_ROWS_PER_PAGE rows, add empty spacer rows
            // to maintain the table height and prevent the page layout from jumping.
            const missingRows = AT_ROWS_PER_PAGE - pageRows.length;
            if (missingRows > 0) {
                for (let i = 0; i < missingRows; i++) {
                    rowsHtml += `<tr class="at-spacer-row"><td colspan="7">&nbsp;</td></tr>`;
                }
            }

            tbody.innerHTML = rowsHtml;

            renderAtPagination(totalPages);
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><p>${escapeHtml(err.message)}</p></div></td></tr>`;
        }
    }
    function renderAtPagination(totalPages) {
        const wrap = $('#atPagination');
        if (!wrap) return;

        if (totalPages <= 1) {
            wrap.innerHTML = '';
            return;
        }

        const startPage = totalPages <= 3 ? 1 : Math.min(Math.max(1, atCurrentPage - 1), totalPages - 2);
        const pages = Array.from({ length: Math.min(3, totalPages) }, (_, index) => startPage + index);
        const atFirst = atCurrentPage <= 1;
        const atLast  = atCurrentPage >= totalPages;

        wrap.innerHTML = `
            <button type="button" class="coa-page-btn" data-at-page="prev" aria-label="Previous page" ${atFirst ? 'disabled' : ''}>&lt;</button>
            ${pages.map(page => `<button type="button" class="coa-page-btn ${page === atCurrentPage ? 'is-active' : ''}" data-at-page="${page}">${page}</button>`).join('')}
            <button type="button" class="coa-page-btn" data-at-page="next" aria-label="Next page" ${atLast ? 'disabled' : ''}>&gt;</button>
            ${totalPages > 3 ? `<details class="coa-page-menu"><summary>Select Page</summary><div class="coa-page-options">${Array.from({ length: totalPages }, (_, index) => `<button type="button" class="coa-page-option" data-at-page="${index + 1}">${index + 1}</button>`).join('')}</div></details>` : ''}
        `;
    }
    function buildSettings() {
        const profile = JSON.parse(localStorage.getItem('devs_profile') || '{}');
        const fullName = profile.fullName || 'Administrator';
        const email = profile.email || 'admin@devs.com';
        const phone = profile.phone || '+63...';
        
        const nameParts = fullName.trim().split(/\s+/);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
        
        const role = profile.position || profile.role || 'Developer';
        
        // Dummy address for demo purposes
        const address = store.settings.address || {
            country: 'Philippines',
            city: 'City/State',
            province: 'Province',
            street: 'Street No./Building',
            brgy: 'Brgy'
        };

        const reqSvg = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#a01515" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';

        return `
            <div class="settings-page">
                <div class="settings-header">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#555" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                    <h2>SETTINGS</h2>
                </div>

                <div class="settings-layout">
                    <!-- Left Sidebar Tabs -->
                    <div class="settings-tabs">
                        <button class="sett-tab active" data-tab="profile">My Profile</button>
                        <button class="sett-tab" data-tab="password">Password & Security</button>
                    </div>

                    <!-- Right Content Area -->
                    <div class="settings-content">
                        
                        <!-- MY PROFILE TAB -->
                        <div class="sett-pane active" id="pane-profile">
                            <div class="sett-section-head">My Profile</div>
                            
                            <!-- Profile Header Card -->
                            <div class="sett-card sett-profile-card">
                                <div class="sett-avatar">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-7 8-7s8 3 8 7"/></svg>
                                </div>
                                <div class="sett-profile-info">
                                    <h3>${escapeHtml(lastName + ', ' + firstName)}</h3>
                                    <p>${escapeHtml(role)}</p>
                                </div>
                            </div>

                            <!-- Personal Information -->
                            <div class="sett-card">
                                <div class="sett-card-header">
                                    <h3>Personal Information</h3>
                                    <button class="sett-edit-btn" id="editPersonalBtn">${reqSvg} EDIT</button>
                                </div>
                                <div class="sett-view-data" id="view-personal">
                                    <div class="sett-grid">
                                        <div><span>First Name</span><strong>${escapeHtml(firstName)}</strong></div>
                                        <div><span>Last Name</span><strong>${escapeHtml(lastName)}</strong></div>
                                        <div><span>Email Address</span><strong>${escapeHtml(email)}</strong></div>
                                        <div><span>Phone</span><strong>${escapeHtml(phone)}</strong></div>
                                    </div>
                                </div>
                                <div class="sett-edit-data" id="edit-personal" style="display:none;">
                                    <div class="sett-grid">
                                        <div class="sett-field"><label>First Name</label><input type="text" id="sett-firstName" value="${escapeHtml(firstName)}" /></div>
                                        <div class="sett-field"><label>Last Name</label><input type="text" id="sett-lastName" value="${escapeHtml(lastName)}" /></div>
                                        <div class="sett-field"><label>Email</label><input type="email" id="sett-email" value="${escapeHtml(email)}" /></div>
                                        <div class="sett-field"><label>Phone</label><input type="text" id="sett-phone" value="${escapeHtml(phone)}" /></div>
                                    </div>
                                    <div class="sett-actions">
                                        <button class="sett-btn-cancel" id="cancelPersonalBtn">Cancel</button>
                                        <button class="sett-btn-save" id="savePersonalBtn">Save Changes</button>
                                    </div>
                                </div>
                            </div>

                            <!-- Address Details -->
                            <div class="sett-card">
                                <div class="sett-card-header">
                                    <h3>Address Details</h3>
                                    <button class="sett-edit-btn" id="editAddressBtn">${reqSvg} EDIT</button>
                                </div>
                                <div class="sett-view-data" id="view-address">
                                    <div class="sett-grid">
                                        <div><span>Country</span><strong>${escapeHtml(address.country)}</strong></div>
                                        <div><span>City/State</span><strong>${escapeHtml(address.city)}</strong></div>
                                        <div><span>Province</span><strong>${escapeHtml(address.province)}</strong></div>
                                        <div><span>Street No./Building</span><strong>${escapeHtml(address.street)}</strong></div>
                                        <div><span>Brgy</span><strong>${escapeHtml(address.brgy)}</strong></div>
                                    </div>
                                </div>
                                <div class="sett-edit-data" id="edit-address" style="display:none;">
                                    <div class="sett-grid">
                                        <div class="sett-field"><label>Country</label><input type="text" id="sett-country" value="${escapeHtml(address.country)}" /></div>
                                        <div class="sett-field"><label>City/State</label><input type="text" id="sett-city" value="${escapeHtml(address.city)}" /></div>
                                        <div class="sett-field"><label>Province</label><input type="text" id="sett-province" value="${escapeHtml(address.province)}" /></div>
                                        <div class="sett-field"><label>Street No./Building</label><input type="text" id="sett-street" value="${escapeHtml(address.street)}" /></div>
                                        <div class="sett-field"><label>Brgy</label><input type="text" id="sett-brgy" value="${escapeHtml(address.brgy)}" /></div>
                                    </div>
                                    <div class="sett-actions">
                                        <button class="sett-btn-cancel" id="cancelAddressBtn">Cancel</button>
                                        <button class="sett-btn-save" id="saveAddressBtn">Save Changes</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- PASSWORD & SECURITY TAB -->
                        <div class="sett-pane" id="pane-password">
                            <div class="sett-section-head">Password & Security</div>
                            
                            <div class="sett-card">
                                <div class="sett-pass-header">
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                    <div>
                                        <h3>Change Password</h3>
                                        <p>Keep your account safe and secure.</p>
                                    </div>
                                </div>
                                <div class="sett-pass-form">
                                    <input type="password" id="sett-current-pass" placeholder="Current Password" />
                                    <input type="password" id="sett-new-pass" placeholder="New Password" />
                                    <input type="password" id="sett-confirm-pass" placeholder="Confirm New Password" />
                                    <button class="sett-btn-save" id="settChangePassBtn">Upgrade Password</button>
                                </div>
                            </div>
                        </div>

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

    function buildSupportPage() {
        return `
            <div class="section-title"><h2>Support</h2></div>
            <div class="empty-state" style="background:#fff;border:1px solid var(--border);border-radius:var(--radius);">
                <div class="empty-icon">🛠</div>
                <strong>No support at the moment</strong>
                <p>There is no support available right now. Please check back later.</p>
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

            // Live search & filter — resets to page 1
            $('#accSearch')?.addEventListener('input', throttle(guard(() => {
                coaCurrentPage = 1;
                renderAccountRows();
            }), 100));

            // (Remove this line)

            $('#coaExportTrigger')?.addEventListener('click', () => {
                openCoaExportModal();
            });

            $('#addAccountBtn')?.addEventListener('click', (e) => {
                if (!lockElement(e.currentTarget, 500)) return;
                guard(() => openAccountForm())();
            });

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
                const totalPages    = Math.max(1, realPageCount); /* Changed to 1 */

                if (target === 'prev')      coaCurrentPage = Math.max(1, coaCurrentPage - 1);
                else if (target === 'next') coaCurrentPage = Math.min(totalPages, coaCurrentPage + 1);
                else                        coaCurrentPage = Number(target);

                renderAccountRows();
            }));

            $('#coaPagination')?.addEventListener('click', guard((e) => {
                const option = e.target.closest('.coa-page-option');
                if (!option) return;
                coaCurrentPage = Number(option.dataset.page);
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
            // (Remove this line)

            // Clicking a bill opens that invoice's detail view (voucher details).
            $('#apTbody')?.addEventListener('click', (e) => {
                const row = e.target.closest('tr[data-id]');
                if (!row) return;
                const id = row.dataset.id;
                const mode = $('.custom-filter-dropdown[data-id="apViewMode"] .custom-filter-btn');
                const list = $('#payablesListView');
                const invoiceView = $('#payablesInvoiceView');
                activePayableId = id;
                if (mode) {
                    mode.dataset.value = 'invoice';
                    mode.classList.add('is-active');
                    mode.querySelector('.cfb-text').textContent = 'View by Invoice';
                    mode.closest('.custom-filter-dropdown').querySelectorAll('li').forEach(item => {
                        item.classList.toggle('is-selected', item.dataset.value === 'invoice');
                    });
                }
                if (list) list.style.display = 'none';
                if (invoiceView) invoiceView.style.display = 'block';
                renderInvoiceView(id);
            });

            $('#addApBtn')?.addEventListener('click', (e) => {
                if (!lockElement(e.currentTarget, 500)) return;
                guard(() => openPayableForm())();
            });
        }

        if (page === 'cashBank') {
            renderCashBankRows();
            $('#cbSearch')?.addEventListener('input', throttle(guard(renderCashBankRows), 100));
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

            $('#expPieFilters')?.addEventListener('click', guard((e) => {
                const btn = e.target.closest('button[data-status]');
                if (!btn) return;
                $$('#expPieFilters button').forEach(b => b.classList.toggle('is-active', b === btn));
                renderExpensePie(btn.dataset.status);
            }));

            // (Removed old filter button logic, now handled by the global custom dropdown)
        }

        if (page === 'financialTransactions') {
            renderTransactionRows();
            $('#txSearch')?.addEventListener('input', throttle(guard(renderTransactionRows), 100));
            $('#txTbody')?.addEventListener('click', throttle(guard(handleTransactionAction), 120));

            // (Dropdown logic is now handled globally by setupCustomDropdowns)
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

            $('#finExportBtn')?.addEventListener('click', guard(openFinExportModal));
            $('#finGenerateBtn')?.addEventListener('click', guard(() => {
                collect();
                openFinExportOptions();
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

            $('#pmHistoryBtn')?.addEventListener('click', (e) => {
                if (!lockElement(e.currentTarget, 500)) return;
                guard(() => openPaymentHistory())();
            });

            $('#pmSearch')?.addEventListener('input', throttle(guard(renderPaymentRows), 100));

            $('#addPayBtn')?.addEventListener('click', (e) => {
                if (!lockElement(e.currentTarget, 500)) return;
                guard(() => openPaymentForm())();
            });

            $('#pmExportBtn')?.addEventListener('click', (e) => {
                const btn = e.currentTarget;
                if (!lockElement(btn, 600)) return;
                
                const all = pmPaymentRows();
                pmEnsureRange(all);
                const rows = pmFilteredRows(all);
                
                if (!rows.length) {
                    toast('There are no records to export.', 'error');
                    return;
                }

                const columns = PM_EXPORT_COLUMNS.records;
                const headers = columns.map(c => c.label);
                const csvRows = rows.map(row => columns.map(c => c.value(row)));
                const stamp = todayDateString();
                const filename = `DEVS_PaymentRecords_${stamp}.csv`;

                runExportProgress({
                    filename: filename,
                    format: 'csv',
                    onDownload: () => {
                        pmExportCsv(filename, headers, csvRows);
                        toast('CSV export downloaded.', 'success');
                    }
                });
            });

            const commitDateRange = () => {
                const from = $('#pmFrom')?.value || '';
                const to = $('#pmTo')?.value || '';
                if (from && to && from > to) {
                    toast('The start date cannot be after the end date.', 'error');
                    if ($('#pmFrom')) $('#pmFrom').value = pmDateFrom;
                    if ($('#pmTo')) $('#pmTo').value = pmDateTo;
                    return;
                }
                pmDateFrom = from;
                pmDateTo = to;
                renderPaymentRows();
            };

            $('#pmFrom')?.addEventListener('change', guard(commitDateRange));
            $('#pmTo')?.addEventListener('change', guard(commitDateRange));
            $$('.fr-date').forEach((label) => {
                label.style.cursor = 'pointer';
                label.addEventListener('click', (event) => {
                    event.preventDefault();
                    const input = label.querySelector('input[type="date"]');
                    if (!input) return;
                    if (typeof input.showPicker === 'function') input.showPicker();
                    else input.focus();
                });
            });

            $('#pmTbody')?.addEventListener('click', (event) => {
                const button = event.target.closest('[data-pm-view]');
                if (!button) return;
                const payment = pmPaymentRows().find(row => row.key === button.dataset.pmView);
                if (payment) openPaymentView(payment);
            });
        }

        if (page === 'auditTrail') {
            loadAuditTrail();
            $('#atSearch')?.addEventListener('input', throttle(guard(() => {
                atCurrentPage = 1; // Reset page on search
                loadAuditTrail();
            }), 150));

            // Pagination event listener
            $('#atPagination')?.addEventListener('click', guard((e) => {
                const btn = e.target.closest('.coa-page-btn');
                if (!btn || btn.disabled) return;
                const target = btn.dataset.atPage;

                if (target === 'prev')      atCurrentPage = Math.max(1, atCurrentPage - 1);
                else if (target === 'next') atCurrentPage = atCurrentPage + 1;
                else                        atCurrentPage = Number(target);

                loadAuditTrail();
            }));

            const commitAuditRange = () => {
                const from = $('#atFrom')?.value || '';
                const to = $('#atTo')?.value || '';
                if (from && to && from > to) {
                    toast('The start date cannot be after the end date.', 'error');
                    if ($('#atFrom')) $('#atFrom').value = atDateFrom;
                    if ($('#atTo')) $('#atTo').value = atDateTo;
                    return;
                }
                atDateFrom = from;
                atDateTo = to;
                atCurrentPage = 1; // Reset page on date change
                loadAuditTrail();
            };
            $('#atFrom')?.addEventListener('change', guard(commitAuditRange));
            $('#atTo')?.addEventListener('change', guard(commitAuditRange));
            $('#atPagination')?.addEventListener('click', guard((event) => {
                const option = event.target.closest('.coa-page-option');
                if (!option) return;
                atCurrentPage = Number(option.dataset.atPage);
                loadAuditTrail();
            }));
        }

        if (page === 'bankReconciliation') {
            $('#newReconciliationBtn')?.addEventListener('click', guard(openBankReconciliation));
        }

        if (page === 'settings') {
            // Tab Switching
            $$('.sett-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    const target = tab.dataset.tab;
                    $$('.sett-tab').forEach(t => t.classList.toggle('active', t === tab));
                    $$('.sett-pane').forEach(p => p.classList.toggle('active', p.id === `pane-${target}`));
                });
            });

            // Edit toggles
            const toggleEdit = (section, isEdit) => {
                $(`#view-${section}`).style.display = isEdit ? 'none' : 'block';
                $(`#edit-${section}`).style.display = isEdit ? 'block' : 'none';
            };
            $('#editPersonalBtn')?.addEventListener('click', () => toggleEdit('personal', true));
            $('#cancelPersonalBtn')?.addEventListener('click', () => toggleEdit('personal', false));
            $('#editAddressBtn')?.addEventListener('click', () => toggleEdit('address', true));
            $('#cancelAddressBtn')?.addEventListener('click', () => toggleEdit('address', false));

            // Save Personal Info
            $('#savePersonalBtn')?.addEventListener('click', (e) => {
                if (!lockElement(e.currentTarget, 600)) return;
                guard(async () => {
                    const data = {
                        fullName: `${$('#sett-firstName').value} ${$('#sett-lastName').value}`.trim(),
                        email: $('#sett-email').value,
                        phone: $('#sett-phone').value
                    };
                    try {
                        const result = await apiRequest('profile', { method: 'POST', body: JSON.stringify(data) });
                        activeUser = result.user;
                        localStorage.setItem('devs_user', result.user.username);
                        localStorage.setItem('devs_profile', JSON.stringify(result.user));
                        updateAvatarFromProfile();
                        toggleEdit('personal', false);
                        renderPage('settings'); // Re-render to update the name in the view
                        toast('Personal information updated.');
                    } catch (err) {
                        toast(err.message, 'error');
                    }
                })();
            });

            // Save Address (Client-side only for this demo)
            $('#saveAddressBtn')?.addEventListener('click', (e) => {
                if (!lockElement(e.currentTarget, 600)) return;
                guard(() => {
                    store.settings.address = {
                        country: $('#sett-country').value,
                        city: $('#sett-city').value,
                        province: $('#sett-province').value,
                        street: $('#sett-street').value,
                        brgy: $('#sett-brgy').value
                    };
                    saveStore();
                    renderPage('settings');
                    toast('Address updated.');
                })();
            });

            // Change Password
            $('#settChangePassBtn')?.addEventListener('click', (e) => {
                if (!lockElement(e.currentTarget, 600)) return;
                guard(async () => {
                    const current = $('#sett-current-pass').value;
                    const next = $('#sett-new-pass').value;
                    const confirm = $('#sett-confirm-pass').value;
                    
                    if (!current || !next || !confirm) { toast('Please fill in all password fields.', 'error'); return; }
                    if (next.length < 8) { toast('New password must be at least 8 characters.', 'error'); return; }
                    if (next !== confirm) { toast('New passwords do not match.', 'error'); return; }
                    
                    try {
                        const result = await apiRequest('password', { method: 'POST', body: JSON.stringify({ current, next }) });
                        $('#sett-current-pass').value = '';
                        $('#sett-new-pass').value = '';
                        $('#sett-confirm-pass').value = '';
                        toast(result.message);
                    } catch (error) {
                        toast(error.message, 'error');
                    }
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

    const topbarProfileBtn = $('#topbarProfileBtn');
    if (topbarProfileBtn) {
        topbarProfileBtn.addEventListener('click', throttle(() => {
            $$('.nav-item').forEach(link => link.classList.remove('active'));
            localStorage.setItem('devs_last_page', 'settings'); // Route to settings
            renderPage('settings'); // Route to settings
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

    setupCustomDropdowns();
    void restoreSession();

    // ============================================================
    // NOTIFICATION SYSTEM
    // ============================================================
    let notifications = [];
    
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
    window.loadRealNotifications = loadRealNotifications;

    function renderNotifications(filter = 'all') {
        const body = document.getElementById('notifBody');
        if (!body) return;

        const filtered = notifications.filter(n => {
            if (filter === 'unread') return n.unread;
            if (filter === 'alerts') return n.type === 'alert';
            return true;
        });

        if (filtered.length === 0) {
            body.innerHTML = `<div style="padding: 40px; text-align: center; color: #888;">No notifications here.</div>`;
            return;
        }

        body.innerHTML = filtered.map(n => `
            <div class="notif-item ${n.unread ? 'unread' : ''}" onclick="window.markNotifRead('${n.id}')">
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

    window.markNotifRead = async function(id) {
        const notif = notifications.find(n => n.id === id);
        if (!notif || !notif.unread) return;
        notif.unread = false;
        updateNotifCounts();
        renderNotifications(document.querySelector('.notif-tabs button.active')?.dataset.tab || 'all');
        try {
            await apiRequest('notifications.markRead', {
                method: 'POST',
                body: JSON.stringify({ ids: [notif.logId] })
            });
        } catch (err) {
            console.warn('Could not persist read state:', err);
        }
    };

    // --- Setup Notification UI Immediately ---
    const bell = document.getElementById('topbarBell');
    const popover = document.getElementById('notifPopover');
    const closeBtn = document.getElementById('notifCloseBtn');
    const markRead = document.getElementById('notifMarkRead');

    if (bell && popover) {
        bell.addEventListener('click', (e) => {
            e.stopPropagation();
            popover.classList.toggle('open');
        });

        document.addEventListener('click', (e) => {
            if (popover.classList.contains('open') && !popover.contains(e.target) && !bell.contains(e.target)) {
                popover.classList.remove('open');
            }
        });

        closeBtn.addEventListener('click', () => {
            popover.classList.remove('open');
        });

        markRead.addEventListener('click', async () => {
            notifications.forEach(n => n.unread = false);
            updateNotifCounts();
            renderNotifications(document.querySelector('.notif-tabs button.active')?.dataset.tab || 'all');
            try {
                await apiRequest('notifications.markRead', {
                    method: 'POST',
                    body: JSON.stringify({ ids: [] }) // empty = mark all
                });
                if(typeof toast === 'function') toast('All notifications marked as read.', 'success');
            } catch (err) {
                if(typeof toast === 'function') toast(err.message, 'error');
            }
        });

        document.querySelectorAll('.notif-tabs button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.notif-tabs button').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                renderNotifications(e.target.dataset.tab);
            });
        });
    }

    // --- Global Notification Refresher ---
    window.checkForNewNotifications = function() {
        void loadRealNotifications();
    };

    // --- Initial load + poll for notifications ---
    void loadRealNotifications();
    setInterval(() => {
        if (localStorage.getItem('devs_user')) void loadRealNotifications();
    }, 30000);

});
