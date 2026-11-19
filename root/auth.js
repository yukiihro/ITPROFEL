document.addEventListener('DOMContentLoaded', async () => {
// If the server already has a session, index.php would have redirected us.
// This fetch is only a warm-up; do not act on it.
try {
} catch (_) {}

    const forms = {
        login: document.getElementById('loginForm')
    };
    const art = {
        login: document.getElementById('artCopyLogin')
    };

    const apiRequest = async (action, options = {}) => {
        const response = await fetch(`api.php?action=${encodeURIComponent(action)}`, {
            cache: 'no-store',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            ...options
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.ok === false) throw new Error(data.message || 'The request could not be completed.');
        return data;
    };

    function showState(state) {
        Object.entries(forms).forEach(([name, form]) => form.classList.toggle('is-hidden', name !== state));
        Object.entries(art).forEach(([name, copy]) => copy.classList.toggle('is-hidden', name !== state));
    }

    function setError(form, message) {
        const error = form.querySelector('.error-text');
        if (error) {
            error.textContent = message;
            error.classList.toggle('is-visible', Boolean(message));
        }
    }

    function attachPasswordToggle(inputId, toggleId) {
        const input = document.getElementById(inputId);
        const toggle = document.getElementById(toggleId);
        if (!input || !toggle) return;
        toggle.addEventListener('click', () => {
            const isHidden = input.type === 'password';
            input.type = isHidden ? 'text' : 'password';
            toggle.classList.toggle('is-visible', isHidden);
            toggle.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
            toggle.setAttribute('aria-pressed', String(isHidden));
        });
    }

    attachPasswordToggle('loginPass', 'toggleLoginPass');

    forms.login.addEventListener('submit', async (event) => {
        event.preventDefault();
        const identifierInput = forms.login.querySelector('[name="identifier"], [name="username"]');
        const identifier = identifierInput ? identifierInput.value.trim() : '';
        const passwordInput = forms.login.querySelector('[name="password"]');
        const password = passwordInput ? passwordInput.value : '';

        setError(forms.login, '');

        if (!identifier || !password) {
            setError(forms.login, 'Enter your email and password.');
            return;
        }
        try {
            const result = await apiRequest('login', {
                method: 'POST',
                body: JSON.stringify({ identifier, password })
            });
            if (!result.user || !result.user.username) {
                throw new Error('The login response was incomplete. Please try again.');
            }
            localStorage.setItem('devs_user', result.user.username);
            localStorage.setItem('devs_profile', JSON.stringify(result.user));
            const dept = String(result.user.department || '').toLowerCase();
            // Procurement routes by position: Buyer → buyer dashboard,
            // Manager → manager dashboard.
            let target;
            if (dept === 'procurement') {
                target = /manager/i.test(String(result.user.position || ''))
                    ? '../PROCUREMENT/managerdashboard/manager-dashboard.html'
                    : '../PROCUREMENT/buyerdashboard/buyer-dashboard.html';
            } else {
                const routes = {
                    finance: '../FINANCE/',
                    hr: '../HR/',
                    sales: '../SALES/dashboard.php',
                    production: '../PRODUCTION/dashboard.html',
                    inventory: '../INVENTORY/dashboard.html'
                };
                target = routes[dept] || '../HR/';
            }
            window.location.assign(target);
        } catch (error) {
            setError(forms.login, error.message);
        }
    });
});
