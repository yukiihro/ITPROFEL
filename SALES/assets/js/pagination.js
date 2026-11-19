/* Universal table pagination - presentation only. */
(function () {
    'use strict';

    var PER_PAGE = 10;

    function initTable(table) {
        if (!table || table.dataset.paginationReady === '1') return;
        if (table.classList.contains('meta') || table.closest('.print-only')) return;

        var tbody = table.tBodies && table.tBodies[0];
        if (!tbody) return;

        table.dataset.paginationReady = '1';

        var host = table.closest('.table-wrap') || table.parentElement;
        if (!host || !host.parentNode) return;

        var nav = document.createElement('div');
        nav.className = 'table-pagination';
        host.parentNode.insertBefore(nav, host.nextSibling);

        var page = 1;

        function rows() {
            var all = Array.prototype.slice.call(tbody.querySelectorAll(':scope > tr'));
            return all.filter(function (row) {
                var cells = row.children;
                if (cells.length === 1 && cells[0].hasAttribute('colspan')) {
                    return false;
                }
                return true;
            });
        }

        function addButton(label, disabled, active, handler) {
            var b = document.createElement('button');
            b.type = 'button';
            b.textContent = label;
            if (disabled) b.disabled = true;
            if (active) b.className = 'active';
            b.addEventListener('click', handler);
            nav.appendChild(b);
        }

        function addDots() {
            var span = document.createElement('span');
            span.className = 'page-ellipsis';
            span.textContent = '...';
            nav.appendChild(span);
        }

        function draw() {
            var list = rows();
            var total = list.length;
            var pages = Math.max(1, Math.ceil(total / PER_PAGE));
            if (page > pages) page = pages;

            list.forEach(function (row, i) {
                row.style.display = (i >= (page - 1) * PER_PAGE && i < page * PER_PAGE) ? '' : 'none';
            });

            nav.innerHTML = '';
            nav.style.display = 'flex';

            addButton('Previous', page === 1, false, function () {
                if (page > 1) { page--; draw(); }
            });

            var start = Math.max(1, page - 2);
            var end = Math.min(pages, page + 2);

            if (start > 1) {
                addButton('1', false, page === 1, function () { page = 1; draw(); });
                if (start > 2) addDots();
            }

            for (var p = start; p <= end; p++) {
                (function (n) {
                    addButton(String(n), false, n === page, function () { page = n; draw(); });
                })(p);
            }

            if (end < pages) {
                if (end < pages - 1) addDots();
                addButton(String(pages), false, page === pages, function () { page = pages; draw(); });
            }

            addButton('Next', page === pages, false, function () {
                if (page < pages) { page++; draw(); }
            });

            var info = document.createElement('span');
            info.className = 'page-info';
            info.textContent = 'Page ' + page + ' of ' + pages + ' · ' + total + ' records';
            nav.appendChild(info);
        }

        var observer = new MutationObserver(function () {
            page = 1;
            draw();
        });
        observer.observe(tbody, { childList: true });

        draw();
    }

    function scan() {
        document.querySelectorAll('table').forEach(initTable);
    }

    function start() {
        scan();
        setTimeout(scan, 300);
        setTimeout(scan, 1000);
        setTimeout(scan, 2500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
