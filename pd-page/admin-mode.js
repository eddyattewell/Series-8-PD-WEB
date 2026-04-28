(function () {
    'use strict';

    const STORAGE_KEY = 'pd_admin_mode';
    const REQUIRED_ROLE = 'Gold Command';
    const REQUIRED_ROLE_ID = '1474763372401529068';
    const AUTH_ME_ENDPOINT = '/api/auth/me';
    const DISCORD_LOGIN_URL = '/api/auth/discord/login';

    let canUseEditMode = false;

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

    function getEditModeBtn() {
        return document.getElementById('adminModeBtn');
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

        let editBtn = getEditModeBtn();
        if (!editBtn) {
            editBtn = document.createElement('button');
            editBtn.id = 'adminModeBtn';
            editBtn.className = 'dropbtn';
            editBtn.type = 'button';
            editBtn.textContent = 'Edit Mode';
        }

        editBtn.removeAttribute('onclick');
        editBtn.type = 'button';
        editBtn.dataset.adminControl = '1';
        editBtn.setAttribute('contenteditable', 'false');
        editBtn.style.userSelect = 'none';
        editBtn.style.background = '#1f1f1f';
        editBtn.style.border = '1px solid #333';
        editBtn.style.borderRadius = '8px';
        editBtn.style.padding = '10px 14px';
        editBtn.style.color = '#fff';

        if (!editBtn.dataset.editBound) {
            editBtn.addEventListener('click', function () {
                if (!canUseEditMode) {
                    alert('Edit Mode is restricted to Gold Command.');
                    return;
                }
                setAdminMode(!isAdminModeEnabled());
            });
            editBtn.dataset.editBound = '1';
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

        if (!wrapper.contains(editBtn)) wrapper.appendChild(editBtn);
        if (!wrapper.contains(loginBtn)) wrapper.appendChild(loginBtn);
    }

    function isAdminModeEnabled() {
        return document.body && document.body.dataset.adminMode === '1';
    }

    function updateControls() {
        ensureFloatingControls();

        const editBtn = getEditModeBtn();
        const loginBtn = getLoginBtn();

        if (editBtn) {
            editBtn.textContent = isAdminModeEnabled() ? 'Exit Edit' : 'Edit Mode';
            editBtn.disabled = !canUseEditMode;
            editBtn.style.opacity = canUseEditMode ? '1' : '0.6';
            editBtn.title = canUseEditMode ? '' : 'Gold Command role required';
            editBtn.style.display = canUseEditMode ? 'inline-block' : 'none';
        }

        if (loginBtn) {
            loginBtn.style.display = canUseEditMode ? 'none' : 'inline-block';
        }
    }

    function setAdminMode(isOn) {
        if (!document.body) return;

        const next = !!isOn && canUseEditMode;
        document.body.contentEditable = next ? 'true' : 'false';
        document.body.spellcheck = next;
        document.body.dataset.adminMode = next ? '1' : '0';

        try {
            localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
        } catch {
            // ignore
        }

        updateControls();
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

    // Expose for compatibility with existing inline handlers.
    window.toggleAdminMode = function () {
        if (!canUseEditMode) {
            alert('Edit Mode is restricted to Gold Command.');
            return;
        }
        setAdminMode(!isAdminModeEnabled());
    };

    // Keep admin controls safe while body is contenteditable.
    document.addEventListener(
        'click',
        function (e) {
            if (!isAdminModeEnabled()) return;

            const inAdminControl = e.target && e.target.closest ? e.target.closest('[data-admin-control="1"]') : null;
            if (inAdminControl) return;

            const link = e.target && e.target.closest ? e.target.closest('a') : null;
            if (!link) return;

            if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
            e.preventDefault();
        },
        true
    );

    // If the control is removed accidentally while editing, re-attach it.
    const observer = new MutationObserver(function () {
        if (!document.getElementById('pdEditControls')) {
            ensureFloatingControls();
            updateControls();
        }
    });

    function initialize() {
        ensureFloatingControls();

        observer.observe(document.body, { childList: true });

        loadRoles().then(function (roles) {
            canUseEditMode = hasRequiredRole(roles);
            setWarningStrikeAccess(canUseEditMode);

            let startOn = false;
            try {
                startOn = localStorage.getItem(STORAGE_KEY) === '1';
            } catch {
                // ignore
            }

            setAdminMode(canUseEditMode && startOn);
            updateControls();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize, { once: true });
    } else {
        initialize();
    }
})();
