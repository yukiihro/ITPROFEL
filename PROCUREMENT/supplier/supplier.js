const toast = document.querySelector('#toast');
const requestDialog = document.querySelector('#requestDialog');

// Session is validated by auth-guard.js (loaded before this file).
// Guard against it being missing/broken so the rest of this file still runs.
const authReady = (window.procurementAuthReady instanceof Promise)
  ? window.procurementAuthReady
  : Promise.resolve(
      (() => {
        try {
          const raw = localStorage.getItem('devs_profile');
          return raw ? JSON.parse(raw) : null;
        } catch (_) {
          return null;
        }
      })()
    );

authReady.then((user) => {
  if (!user) return;
  const displayName = user.fullName || user.username || "Buyer";

  document.querySelectorAll('.profile-copy strong, .account-name strong').forEach((element) => {
    element.textContent = displayName;
  });

  document.querySelectorAll('.profile-copy small, .account-name small').forEach((element) => {
    if (user.email) element.textContent = user.email;
  });

  document.querySelectorAll('.avatar-white').forEach((el) => {
    el.textContent = displayName.trim().charAt(0).toUpperCase();
  });
});

function showToast(message) {
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add('is-visible');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('is-visible'), 2600);
}

if (requestDialog) {
  document.querySelectorAll('[data-open-request]').forEach((button) => {
    button.addEventListener('click', () => requestDialog.showModal());
  });

  const closeButton = document.querySelector('.dialog-close');
  if (closeButton) {
    closeButton.addEventListener('click', () => requestDialog.close());
  }
}

document.querySelectorAll('[data-toast]').forEach((button) => {
  button.addEventListener('click', () => showToast(button.dataset.toast));
});

document.querySelectorAll('.nav-item').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('is-active'));
    button.classList.add('is-active');
    showToast(`${button.dataset.view} workspace selected.`);
  });
});

document.querySelectorAll('.filters select').forEach((select) => {
  select.addEventListener('change', () => showToast(`${select.value} filter applied.`));
});

const supplierSearch = document.querySelector('.search-shell input');
const searchButton = document.querySelector('.search-button');
const supplierCards = [...document.querySelectorAll('.supplier-card')];
const supplierEmptyState = document.querySelector('.supplier-empty');

function filterSuppliers() {
  const query = supplierSearch.value.trim().toLocaleLowerCase();
  let visibleCount = 0;

  supplierCards.forEach((card) => {
    const matches = card.textContent.toLocaleLowerCase().includes(query);
    card.hidden = !matches;
    if (matches) visibleCount += 1;
  });

  supplierEmptyState.hidden = visibleCount > 0;
}

if (supplierSearch) {
  supplierSearch.addEventListener('input', filterSuppliers);
  supplierSearch.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      filterSuppliers();
    }
  });
}

if (searchButton) {
  searchButton.addEventListener('click', filterSuppliers);
}

document.querySelectorAll('.page-button').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelector('.page-button.active')?.classList.remove('active');
    button.classList.add('active');
  });
});

const supplierGrid = document.querySelector('.supplier-grid');

if (supplierGrid) {
    let isDragging = false;
    let startX = 0;
    let startScrollLeft = 0;
    let hasDragged = false;

    supplierGrid.addEventListener('mousedown', (event) => {
        // Only left mouse button
        if (event.button !== 0) return;

        // Don't start dragging when clicking a button
        if (event.target.closest('button, a, input, select, textarea')) {
            return;
        }

        isDragging = true;
        hasDragged = false;

        startX = event.pageX;
        startScrollLeft = supplierGrid.scrollLeft;

        supplierGrid.classList.add('is-dragging');
    });

    supplierGrid.addEventListener('mousemove', (event) => {
        if (!isDragging) return;

        const distance = event.pageX - startX;

        // Only consider it a drag after moving a few pixels
        if (Math.abs(distance) > 5) {
            hasDragged = true;
        }

        if (hasDragged) {
            event.preventDefault();

            supplierGrid.scrollLeft =
                startScrollLeft - distance;
        }
    });

    document.addEventListener('mouseup', () => {
        if (!isDragging) return;

        isDragging = false;
        supplierGrid.classList.remove('is-dragging');
    });
}
// ==========================================================================
// Logout Handling — Fully Guarded
// ==========================================================================
const logoutBtn = document.getElementById('logoutBtn');

if (logoutBtn) {
  logoutBtn.addEventListener('click', async function (event) {
    event.preventDefault();

    if (!confirm("Are you sure you want to log out?")) return;

    // 1. Clear local storage
    localStorage.removeItem('devs_user');
    localStorage.removeItem('devs_profile');
    localStorage.removeItem('devs_last_page');

    // 2. Resolve paths relative to the current page (PROCUREMENT/supplier/)
    //    -> ../../HR/api.php  and  ../../index.php
    const logoutApi  = new URL('../../HR/api.php?action=logout', window.location.href);
    const loginPage  = new URL('../../index.php?logout=1',          window.location.href);

    console.log('[logout] POST', logoutApi.toString());

    try {
      const res = await fetch(logoutApi.toString(), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }
      });
      console.log('[logout] API responded', res.status);
    } catch (err) {
      console.warn('[logout] API call failed, redirecting anyway.', err);
    }

    // 3. Redirect to index.php?logout=1 which destroys the session
    //    server-side and redirects back to the login screen.
    window.location.replace(loginPage.toString());
  });
} else {
  console.error('[logout] #logoutBtn not found in the DOM.');
}