const {
    parseCookies,
    verifySignedToken,
    SESSION_COOKIE
} = require('../_lib/session');

const {
    supabaseRequest,
    normalizeBadge,
    getAllOfficers,
    groupOfficerRows,
    syncDiscordPanel
} = require('../_lib/discipline');

function getSession(req) {
    const sessionSecret = process.env.SESSION_SECRET;
    if (!sessionSecret) return null;
    const cookies = parseCookies(req.headers.cookie || '');
    const token = cookies[SESSION_COOKIE];
    if (!token) return null;
    return verifySignedToken(token, sessionSecret);
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
        const body = req.body && typeof req.body === 'object' ? req.body : {};
        const badgeNumber = normalizeBadge(body.badgeNumber || req.query.badgeNumber);

        if (!badgeNumber) {
            res.status(400).json({ error: 'Badge number is required' });
            return;
        }

        // Get officer
        const officerRows = await supabaseRequest('/rest/v1/discipline_officers?badge_number=ilike.' + encodeURIComponent(badgeNumber) + '&limit=1');
        const officer = Array.isArray(officerRows) ? officerRows[0] : null;

        if (!officer) {
            res.status(404).json({ error: 'Officer not found' });
            return;
        }

        const officerId = officer.id;

        // Delete all incidents for this officer
        await supabaseRequest('/rest/v1/discipline_incidents?badge_number=ilike.' + encodeURIComponent(badgeNumber), {
            method: 'DELETE'
        });

        await supabaseRequest('/rest/v1/discipline_incidents?officer_id=eq.' + encodeURIComponent(String(officerId)), {
            method: 'DELETE'
        });

        // Delete officer
        await supabaseRequest('/rest/v1/discipline_officers?badge_number=eq.' + encodeURIComponent(badgeNumber), {
            method: 'DELETE'
        });

        // Rebuild roster and sync panel
        const { incidents, officers } = await getAllOfficers();
        const roster = groupOfficerRows(officers, incidents);
        const panelResult = await syncDiscordPanel(roster);

        res.status(200).json({
            ok: true,
            message: 'Officer and all associated incidents deleted',
            deletedOfficer: officer,
            panelResult: panelResult || null
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to delete officer',
            detail: error.message
        });
    }
};
