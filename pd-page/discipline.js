(function () {
    'use strict';

    const LIST_ENDPOINT = '/api/discipline/list';
    const SUBMIT_ENDPOINT = '/api/discipline/submit';
    const DELETE_ENDPOINT = '/api/discipline/delete';
    const DELETE_OFFICER_ENDPOINT = '/api/discipline/delete-officer';
    const VIEW_STATE_KEY = 'pd_view_state';

    const issueViewEl = document.getElementById('issueView');
    const officerViewEl = document.getElementById('officerView');
    const issueTabEl = document.getElementById('issueTab');
    const officersTabEl = document.getElementById('officersTab');
    const officerPanelEl = document.getElementById('officerPanel');
    const officerToggleBtn = document.getElementById('officerToggleBtn');
    const officerListEl = document.getElementById('officerList');
    const detailGridEl = document.getElementById('detailGrid');
    const historyListEl = document.getElementById('historyList');
    const formEl = document.getElementById('disciplineForm');
    const statusEl = document.getElementById('formStatus');
    let roster = [];
    let selectedOfficerId = '';
    
    // Get initial view mode: check URL first, then localStorage, then default to 'form'
    let viewMode = new URLSearchParams(window.location.search).get('view') || localStorage.getItem(VIEW_STATE_KEY) || 'form';

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function fmtDate(value) {
        if (!value) return 'Unknown';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleString();
    }

    function fmtRemaining(expiresAt) {
        if (!expiresAt) return 'No expiry';
        const diff = new Date(expiresAt).getTime() - Date.now();
        if (diff <= 0) return 'Expired';
        const days = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        return days + 'd ' + hours + 'h remaining';
    }

    function setStatus(message, isError) {
        if (!statusEl) return;
        statusEl.textContent = message || '';
        statusEl.style.color = isError ? '#ff8a80' : '#bdbdbd';
    }

    function setOfficerListOpen(isOpen) {
        if (officerPanelEl) {
            officerPanelEl.classList.toggle('open', !!isOpen);
        }
        if (officerToggleBtn) {
            officerToggleBtn.textContent = isOpen ? 'Hide Officers' : 'View Officers';
        }
    }

    function setViewMode(mode) {
        viewMode = mode;
        try {
            localStorage.setItem(VIEW_STATE_KEY, mode);
        } catch {}
        
        const officersMode = mode === 'officers';
        if (issueViewEl) issueViewEl.classList.toggle('hidden', officersMode);
        if (officerViewEl) officerViewEl.classList.toggle('hidden', !officersMode);
        if (issueTabEl) issueTabEl.classList.toggle('active', !officersMode);
        if (officersTabEl) officersTabEl.classList.toggle('active', officersMode);
        setOfficerListOpen(officersMode);
        if (!officersMode) {
            selectedOfficerId = '';
        }
    }

    function getSelectedOfficer() {
        if (!selectedOfficerId) return null;
        return roster.find(function (row) { return String(row.officerId) === String(selectedOfficerId); }) || null;
    }

    function renderStats(officer) {
        if (!detailGridEl) return;
        if (!officer) {
            detailGridEl.innerHTML = '<div class="stat"><span>Officer</span><strong>Select an officer</strong></div>' +
                '<div class="stat"><span>Badge</span><strong>N/A</strong></div>' +
                '<div class="stat"><span>Warnings</span><strong>0</strong></div>' +
                '<div class="stat"><span>Strikes</span><strong>0</strong></div>' +
                '<div class="stat"><span>Flagged</span><strong>No</strong></div>' +
                '<div class="stat"><span>Total History</span><strong>0</strong></div>' +
                '<div class="stat"><span>Status</span><strong>Waiting</strong></div>';
            return;
        }

        const flagged = officer.flagged ? 'Yes' : 'No';
        const statsHtml = [
            '<div class="stat"><span>Officer</span><strong>' + escapeHtml(officer.displayName) + '</strong></div>',
            '<div class="stat"><span>Badge</span><strong>' + escapeHtml(officer.badgeNumber || 'N/A') + '</strong></div>',
            '<div class="stat"><span>Warnings</span><strong>' + officer.activeWarningsCount + '</strong></div>',
            '<div class="stat"><span>Strikes</span><strong>' + officer.activeStrikesCount + '</strong></div>',
            '<div class="stat"><span>Flagged</span><strong>' + flagged + '</strong></div>',
            '<div class="stat"><span>Total History</span><strong>' + officer.historyCount + '</strong></div>',
            '<div class="stat"><span>Status</span><strong>' + (officer.flagged ? 'Flagged' : 'Active') + '</strong></div>'
        ];
        detailGridEl.innerHTML = statsHtml.join('');

    }

    function renderHistory(officer, history) {
        if (!historyListEl) return;
        if (!officer) {
            historyListEl.innerHTML = '<div class="history-item">Select an officer to view history.</div>';
            return;
        }

        if (!history || !history.length) {
            historyListEl.innerHTML = '<div class="history-item">No warnings or strikes recorded.</div>';
            return;
        }

        historyListEl.innerHTML = history.map(function (item) {
            const kindClass = item.type === 'strike' ? 'strike' : 'warning';
            const label = item.type === 'strike' ? 'Strike' : 'Warning';
            const activeLabel = item.active ? 'Active' : 'Expired';
            return [
                '<div class="history-item">',
                '  <div class="topline">',
                '    <div>',
                '      <span class="badge ' + kindClass + '">' + label + '</span>',
                '      <span class="badge">' + activeLabel + '</span>',
                item.expired ? '      <span class="badge flagged">Expired</span>' : '',
                '    </div>',
                '    <div class="muted" style="display:flex;gap:12px;align-items:center;">',
                '      <span>' + fmtDate(item.createdAt) + '</span>',
                '      <button type="button" class="mini-delete-btn" data-incident-id="' + escapeHtml(item.id) + '" data-officer-id="' + escapeHtml(officer.officerId) + '">Remove</button>',
                '    </div>',
                '  </div>',
                '  <div><strong>Reason:</strong> ' + escapeHtml(item.reason || 'No reason supplied') + '</div>',
                '  <div class="muted">Expires: ' + fmtDate(item.expiresAt) + ' (' + escapeHtml(fmtRemaining(item.expiresAt)) + ')</div>',
                '</div>'
            ].join('');
        }).join('');

        historyListEl.querySelectorAll('.mini-delete-btn').forEach(function (button) {
            button.addEventListener('click', async function () {
                const incidentId = button.getAttribute('data-incident-id') || '';
                const officerId = button.getAttribute('data-officer-id') || '';

                if (!incidentId) return;
                if (!window.confirm('Remove this warning/strike permanently?')) return;

                try {
                    setStatus('Removing incident...');
                    const response = await fetch(DELETE_ENDPOINT, {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ incidentId: incidentId })
                    });

                    const data = await response.json();
                    if (!response.ok) {
                        throw new Error(data && data.error ? data.error : 'Failed to remove incident');
                    }

                    selectedOfficerId = officerId || selectedOfficerId;
                    await loadData(selectedOfficerId);
                    setStatus('Removed.');
                } catch (error) {
                    setStatus(error.message, true);
                }
            });
        });
    }

    function renderRoster() {
        if (!officerListEl) return;
        if (!roster.length) {
            officerListEl.innerHTML = '<div class="officer-card">No officers found yet.</div>';
            return;
        }

        officerListEl.innerHTML = roster.map(function (officer) {
            const active = String(officer.officerId) === String(selectedOfficerId);
            return [
                '<div class="officer-card' + (active ? ' active' : '') + '" data-officer-id="' + escapeHtml(officer.officerId) + '">',
                '  <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">',
                '    <div style="min-width:0;">',
                '      <strong>' + escapeHtml(officer.displayName) + '</strong>',
                '      <div class="officer-meta">Badge ' + escapeHtml(officer.badgeNumber || 'N/A') + '</div>',
                '    </div>',
                '    <button type="button" class="officer-delete-btn" data-officer-id="' + escapeHtml(officer.officerId) + '" data-badge="' + escapeHtml(officer.badgeNumber || 'N/A') + '" data-name="' + escapeHtml(officer.displayName) + '" style="background:#2b1212;border:1px solid #7a1f1f;color:#ff8a80;cursor:pointer;font-size:0.84rem;padding:6px 10px;border-radius:999px;white-space:nowrap;">Delete</button>',
                '  </div>',
                '  <div>',
                '    <span class="badge warning">' + officer.activeWarningsCount + ' W</span>',
                '    <span class="badge strike">' + officer.activeStrikesCount + ' S</span>',
                officer.flagged ? '    <span class="badge flagged">Flagged</span>' : '',
                '  </div>',
                '</div>'
            ].join('');
        }).join('');

        // Add click handlers to officer cards (for selection)
        officerListEl.querySelectorAll('.officer-card').forEach(function (card) {
            const deleteBtn = card.querySelector('.officer-delete-btn');
            
            // Prevent delete click from triggering selection
            if (deleteBtn) {
                deleteBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    e.preventDefault();
                    const officerId = deleteBtn.getAttribute('data-officer-id');
                    const badge = deleteBtn.getAttribute('data-badge');
                    const name = deleteBtn.getAttribute('data-name');
                    deleteOfficerImmediate(officerId, name, badge);
                });
            }
            
            // Selection handler
            card.addEventListener('click', function () {
                selectedOfficerId = card.getAttribute('data-officer-id') || '';
                loadData(selectedOfficerId);
            });
        });
    }

    async function loadData(officerId) {
        try {
            setStatus('Loading officer roster...');
            const url = officerId ? LIST_ENDPOINT + '?officerId=' + encodeURIComponent(officerId) : LIST_ENDPOINT;
            const response = await fetch(url, { credentials: 'include' });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data && data.error ? data.error : 'Failed to load discipline roster');
            }

            roster = Array.isArray(data.roster) ? data.roster : [];
            const selected = data.selectedOfficer || null;
            if (selected) {
                selectedOfficerId = String(selected.officerId);
            } else if (!selectedOfficerId) {
                selectedOfficerId = '';
            }

            const activeOfficer = getSelectedOfficer();
            renderRoster();
            renderStats(activeOfficer);
            renderHistory(activeOfficer, data.history || []);
            setStatus('Loaded.');
        } catch (error) {
            setStatus(error.message, true);
            if (officerListEl) {
                officerListEl.innerHTML = '<div class="officer-card">' + escapeHtml(error.message) + '</div>';
            }
        }
    }

    async function deleteOfficerImmediate(officerId, displayName, badgeNumber) {
        if (!window.confirm('Delete all records for ' + displayName + ' (Badge ' + badgeNumber + ')? This cannot be undone.')) {
            return;
        }

        try {
            setStatus('Loading history...');

            const lookupResponse = await fetch(LIST_ENDPOINT + '?badgeNumber=' + encodeURIComponent(badgeNumber), {
                credentials: 'include'
            });
            const lookupData = await lookupResponse.json();
            if (!lookupResponse.ok) {
                throw new Error(lookupData && lookupData.error ? lookupData.error : 'Failed to load officer history');
            }

            const history = Array.isArray(lookupData.history) ? lookupData.history : [];

            for (let index = 0; index < history.length; index++) {
                const item = history[index];
                if (!item || !item.id) continue;

                setStatus('Removing history ' + (index + 1) + ' of ' + history.length + '...');
                const removeResponse = await fetch(DELETE_ENDPOINT, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ incidentId: item.id })
                });

                const removeData = await removeResponse.json();
                if (!removeResponse.ok) {
                    throw new Error(removeData && removeData.error ? removeData.error : 'Failed to remove incident');
                }
            }

            setStatus('Deleting officer...');
            const response = await fetch(DELETE_OFFICER_ENDPOINT, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ badgeNumber: badgeNumber })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data && data.error ? data.error : 'Failed to delete officer');
            }

            setStatus('Officer deleted successfully.');
            selectedOfficerId = '';
            await loadData('');
        } catch (error) {
            setStatus(error.message, true);
        }
    }

    async function deleteOfficer(officerId, displayName, badgeNumber) {
        await deleteOfficerImmediate(officerId, displayName, badgeNumber);
    }

    if (officerToggleBtn) {
        officerToggleBtn.addEventListener('click', function () {
            const isOpen = officerPanelEl ? officerPanelEl.classList.contains('open') : false;
            setOfficerListOpen(!isOpen);
        });
    }

    // Add click handlers for view tabs
    if (issueTabEl) {
        issueTabEl.addEventListener('click', function (e) {
            e.preventDefault();
            setViewMode('form');
        });
    }

    if (officersTabEl) {
        officersTabEl.addEventListener('click', function (e) {
            e.preventDefault();
            setViewMode('officers');
        });
    }

    setViewMode(viewMode);

    if (formEl) {
        formEl.addEventListener('submit', async function (event) {
            event.preventDefault();
            const payload = {
                officerName: document.getElementById('officerName').value,
                badgeNumber: document.getElementById('badgeNumber').value,
                reason: document.getElementById('reason').value,
                type: document.getElementById('type').value
            };

            try {
                setStatus('Saving incident...');
                const response = await fetch(SUBMIT_ENDPOINT, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data && data.error ? data.error : 'Failed to save incident');
                }

                formEl.reset();
                setStatus(data.convertedStrike ? 'Saved. 3 warnings converted into a strike.' : 'Saved successfully.');
                selectedOfficerId = String((data.incident && data.incident.officer_id) || payload.badgeNumber || '');
                await loadData(selectedOfficerId);
            } catch (error) {
                setStatus(error.message, true);
            }
        });
    }

    loadData('');

    // Expose for onclick handlers
    window.deleteOfficer = deleteOfficer;
})();
