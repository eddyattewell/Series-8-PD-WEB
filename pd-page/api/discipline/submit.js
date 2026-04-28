const {
    parseCookies,
    verifySignedToken,
    SESSION_COOKIE
} = require('../_lib/session');
const {
    createIncident,
    applyWarningToStrikeRule,
    flagOfficerIfNeeded,
    getIncidentHistory,
    getAllOfficers,
    groupOfficerRows,
    syncDiscordPanel,
    normalizeBadge,
    normalizeName,
    normalizeType,
    refreshExpiredIncidents
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
    if (req.method !== 'POST') {
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
        const officerName = normalizeName(body.officerName);
        const badgeNumber = normalizeBadge(body.badgeNumber);
        const reason = normalizeName(body.reason);
        const type = normalizeType(body.type);

        if (!officerName || !badgeNumber || !reason || !type) {
            res.status(400).json({ error: 'Officer name, badge number, reason, and type are required' });
            return;
        }

        const createdIncident = await createIncident({
            officerName,
            badgeNumber,
            reason,
            type,
            createdBy: session.sub || session.username || 'unknown'
        });

        const selectedOfficerId = createdIncident && createdIncident.officer_id ? createdIncident.officer_id : null;
        const activeBadge = createdIncident && createdIncident.badge_number ? createdIncident.badge_number : badgeNumber;
        const convertedStrike = await applyWarningToStrikeRule(selectedOfficerId, activeBadge);
        const flagged = await flagOfficerIfNeeded(selectedOfficerId, activeBadge);
        const history = await getIncidentHistory(selectedOfficerId, activeBadge);
        const { incidents, officers } = await getAllOfficers();
        const roster = groupOfficerRows(officers, incidents);
        const panelResult = await syncDiscordPanel(roster);

        res.status(200).json({
            ok: true,
            incident: createdIncident,
            convertedStrike: convertedStrike || null,
            flagged,
            history,
            panelResult: panelResult || null
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to submit incident',
            detail: error.message
        });
    }
};
