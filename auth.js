document.addEventListener('DOMContentLoaded', async () => {
    try {
        await fetch('HR/api.php?action=session', { cache: 'no-store', credentials: 'same-origin' });
    } catch (_) {}

    const forms = {
        login: document.getElementById('loginForm'),
        signup: document.getElementById('signupForm'),
        password: document.getElementById('passwordForm')
    };
    const art = {
        login: document.getElementById('artCopyLogin'),
        signup: document.getElementById('artCopySignup'),
        password: document.getElementById('artCopyPassword')
    };
    let registration = {};

    const apiRequest = async (action, options = {}) => {
        const response = await fetch(`HR/api.php?action=${encodeURIComponent(action)}`, {
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
    attachPasswordToggle('regPassword', 'toggleRegPassword');
    attachPasswordToggle('regConfirmPassword', 'toggleRegConfirmPassword');

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
            localStorage.setItem('devs_user', result.user.username);
            localStorage.setItem('devs_profile', JSON.stringify(result.user));
            const dept = String(result.user.department || '').toLowerCase();
            const routes = {
                finance: 'FINANCE/',
                hr: 'HR/',
                procurement: 'PROCUREMENT/supplier/supplier.html'
            };
            window.location.href = routes[dept] || 'HR/';
        } catch (error) {
            setError(forms.login, error.message);
        }
    });

    document.getElementById('registerLink').addEventListener('click', (event) => {
        event.preventDefault();
        setError(forms.signup, '');
        showState('signup');
    });
    document.getElementById('backToLogin').addEventListener('click', (event) => {
        event.preventDefault();
        showState('login');
    });
    document.getElementById('backToSignup').addEventListener('click', (event) => {
        event.preventDefault();
        setError(forms.signup, '');
        showState('signup');
    });

    forms.signup.addEventListener('submit', (event) => {
        event.preventDefault();
        setError(forms.signup, '');

        const data = Object.fromEntries(new FormData(forms.signup).entries());

        if (!data.fullName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || !data.department || !data.position) {
            setError(forms.signup, 'Complete all fields before continuing.');
            return;
        }
        registration = data;
        showState('password');
    });

    forms.password.addEventListener('submit', async (event) => {
        event.preventDefault();
        setError(forms.password, '');

        const passwordInput = document.getElementById('regPassword');
        const confirmInput = document.getElementById('regConfirmPassword');
        const password = passwordInput ? passwordInput.value : '';
        const confirmPassword = confirmInput ? confirmInput.value : '';

        if (password.length < 8) {
            setError(forms.password, 'Password must be at least 8 characters.');
            return;
        }
        if (password !== confirmPassword) {
            setError(forms.password, 'Passwords do not match.');
            return;
        }

        try {
            const result = await apiRequest('register', {
                method: 'POST',
                body: JSON.stringify({ ...registration, password, confirmPassword })
            });
            forms.password.reset();
            forms.signup.reset();
            registration = {};
            showState('login');
            setError(forms.login, result.message || 'Account created. You can now sign in.');
        } catch (error) {
            setError(forms.password, error.message);
        }
    });
});
