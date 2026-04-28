const {
    parseCookies,
    verifySignedToken,
    SESSION_COOKIE
} = require('../_lib/session');
const {
    getAllOfficers,
    groupOfficerRows,
    getIncidentHistory,
    syncDiscordPanel,
    refreshExpiredIncidents,
    normalizeBadge,
    nowIso,
    TABLE_INCIDENTS
} = require('../_lib/discipline');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSession(req) {
    const sessionSecret = process.env.SESSION_SECRET;
    if (!sessionSecret) return null;

    const cookies = parseCookies(req.headers.cookie || '');
    const token = cookies[SESSION_COOKIE];
    if (!token) return null;

    return verifySignedToken(token, sessionSecret);
}

async function supabaseRequest(path, options = {}) {
    if (!SUPABASE_URL) throw new Error('Missing SUPABASE_URL environment variable');
    if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');

    const response = await fetch(SUPABASE_URL.replace(/\/$/, '') + path, {
        ...options,
        headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    });

    const text = await response.text();
    let data = null;
    if (text) {
        try { data = JSON.parse(text); } catch { data = { raw: text }; }
    }

    if (!response.ok) {
        const error = new Error('Supabase request failed: ' + response.status);
        error.status = response.status;
        error.data = data;
        throw error;
    }

    return data;
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST' && req.method !== 'DELETE') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const session = getSession(req);
    if (!session) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    try {
        await refreshExpiredIncidents();

        const body = req.body && typeof req.body === 'object' ? req.body : {};
        const incidentId = body.incidentId || req.query.incidentId || req.query.id;

        if (!incidentId) {
            res.status(400).json({ error: 'incidentId is required' });
            return;
        }

        const rows = await supabaseRequest('/rest/v1/' + TABLE_INCIDENTS + '?select=*&id=eq.' + encodeURIComponent(String(incidentId)) + '&limit=1');
        const incident = Array.isArray(rows) ? rows[0] : null;
        if (!incident) {
            res.status(404).json({ error: 'Incident not found' });
            return;
        }

        await supabaseRequest('/rest/v1/' + TABLE_INCIDENTS + '?id=eq.' + encodeURIComponent(String(incidentId)), {
            method: 'DELETE'
        });

        const badgeNumber = normalizeBadge(incident.badge_number);
        const activeBadge = badgeNumber;
        const history = await getIncidentHistory(incident.officer_id || null, activeBadge);
        const { incidents, officers } = await getAllOfficers();
        const roster = groupOfficerRows(officers, incidents);
        const panelResult = await syncDiscordPanel(roster);

        res.status(200).json({
            ok: true,
            deletedAt: nowIso(),
            incidentId: String(incidentId),
            history,
            panelResult: panelResult || null,
            roster
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to delete incident',
            detail: error.message
        });
    }
};
