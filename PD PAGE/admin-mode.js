(function () {
    'use strict';

    const STORAGE_KEY = 'pd_admin_mode';

    function getAdminMode() {
        return document.body && document.body.dataset.adminMode === '1';
    }

    function updateButton(isOn) {
        const btn = document.getElementById('adminModeBtn');
        if (btn) btn.textContent = isOn ? 'Exit Admin' : 'Admin Mode';
    }

    function setAdminMode(isOn) {
        if (!document.body) return;

        document.body.contentEditable = isOn ? 'true' : 'false';
        document.body.spellcheck = !!isOn;
        document.body.dataset.adminMode = isOn ? '1' : '0';

        updateButton(isOn);

        try {
            localStorage.setItem(STORAGE_KEY, isOn ? '1' : '0');
        } catch {
            // ignore
        }
    }

    window.toggleAdminMode = function () {
        setAdminMode(!getAdminMode());
    };

    // While editing, prevent accidental navigation when clicking links.
    // Hold Ctrl/Shift/Alt to allow navigation.
    document.addEventListener(
        'click',
        function (e) {
            if (!getAdminMode()) return;
            const link = e.target && e.target.closest ? e.target.closest('a') : null;
            if (!link) return;
            if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
            e.preventDefault();
        },
        true
    );

    // Restore persisted mode.
    let startOn = false;
    try {
        startOn = localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
        // ignore
    }

    if (startOn) setAdminMode(true);
    else updateButton(false);
})();
