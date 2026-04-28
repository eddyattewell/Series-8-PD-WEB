(function () {
    'use strict';

    const REQUIRED_ROLE = 'Gold Command';
    const REQUIRED_ROLE_ID = '1474763372401529068';
    const AUTH_ME_ENDPOINT = '/api/auth/me';
    const DISCORD_LOGIN_URL = '/api/auth/discord/login';

    function normalizeRole(role) {
        return String(role || '').trim().toLowerCase();
    }

    function hasRequiredRole(roles) {
        const required = normalizeRole(REQUIRED_ROLE);
        const requiredId = String(REQUIRED_ROLE_ID).trim();
        if (!Array.isArray(roles)) return false;

        return roles.some(function (role) {
            if (!role && role !== 0) return false;
            const asStr = String(role).trim();
            if (!asStr) return false;
            if (asStr === requiredId) return true;
            return normalizeRole(asStr) === required;
        });
    }

    function getMockRoles() {
        // Local fallback for testing if backend auth is not connected yet.
        // Example in browser console: localStorage.setItem('pd_mock_roles', 'Gold Command')
        try {
            const raw = localStorage.getItem('pd_mock_roles') || '';
            return raw
                .split(',')
                .map(function (part) { return part.trim(); })
                .filter(Boolean);
        } catch {
            return [];
        }
    }

    async function loadRoles() {
        try {
            const response = await fetch(AUTH_ME_ENDPOINT, {
                method: 'GET',
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            });

            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data.roles)) return data.roles;
                if (data.user && Array.isArray(data.user.roles)) return data.user.roles;
            }
        } catch {
            // ignore and fall back to mock roles
        }

        return getMockRoles();
    }

    function getLoginBtn() {
        return document.getElementById('discordLoginBtn');
    }

    function ensureFloatingControls() {
        let wrapper = document.getElementById('pdEditControls');
        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.id = 'pdEditControls';
            wrapper.setAttribute('contenteditable', 'false');
            wrapper.dataset.adminControl = '1';
            wrapper.style.position = 'fixed';
            wrapper.style.top = '14px';
            wrapper.style.right = '14px';
            wrapper.style.zIndex = '99999';
            wrapper.style.display = 'flex';
            wrapper.style.gap = '8px';
            wrapper.style.alignItems = 'center';
            document.body.appendChild(wrapper);
        }

        let loginBtn = getLoginBtn();
        if (!loginBtn) {
            loginBtn = document.createElement('button');
            loginBtn.id = 'discordLoginBtn';
            loginBtn.className = 'dropbtn';
            loginBtn.type = 'button';
            loginBtn.textContent = 'Discord Login';
            loginBtn.dataset.adminControl = '1';
            loginBtn.setAttribute('contenteditable', 'false');
            loginBtn.style.userSelect = 'none';
            loginBtn.style.background = '#2b2f3a';
            loginBtn.style.border = '1px solid #3f4555';
            loginBtn.style.borderRadius = '8px';
            loginBtn.style.padding = '10px 14px';
            loginBtn.style.color = '#fff';
            loginBtn.addEventListener('click', function () {
                window.location.href = DISCORD_LOGIN_URL;
            });
        }

        if (!wrapper.contains(loginBtn)) wrapper.appendChild(loginBtn);
    }

    function updateControls() {
        ensureFloatingControls();
    }

    function setWarningStrikeAccess(allowed) {
        // Hide/show Forms dropdown in navbar
        const formsDropdown = document.getElementById('formsDropdown');
        if (formsDropdown) {
            formsDropdown.style.display = allowed ? '' : 'none';
        }

        const links = document.querySelectorAll('a[href*="Warning-Strike Form.html"]');
        links.forEach(function (link) {
            if (allowed) {
                link.style.display = '';
                link.removeAttribute('aria-disabled');
                link.removeAttribute('title');
                return;
            }

            link.style.display = 'none';
            link.setAttribute('aria-disabled', 'true');
            link.title = 'Gold Command only';
        });

        const onWarningForm = /Warning-Strike Form\.html$/i.test(window.location.pathname || '');
        if (!allowed && onWarningForm) {
            const container = document.querySelector('.container');
            if (container) {
                container.innerHTML =
                    '<h1>Access Restricted</h1>' +
                    '<p>This page is restricted to Gold Command.</p>' +
                    '<p>Please login with Discord using an authorised account.</p>' +
                    '<p><a href="' + DISCORD_LOGIN_URL + '">Login with Discord</a></p>';
            }
        }
    }

    function initialize() {
        ensureFloatingControls();

        loadRoles().then(function (roles) {
            const hasAccess = hasRequiredRole(roles);
            setWarningStrikeAccess(hasAccess);
            updateControls();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize, { once: true });
    } else {
        initialize();
    }
})();
