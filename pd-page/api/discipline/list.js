const {
    getAllOfficers,
    groupOfficerRows,
    getIncidentHistory,
    refreshExpiredIncidents,
    syncDiscordPanel
} = require('../_lib/discipline');

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        await refreshExpiredIncidents();
        const officerId = req.query.officerId ? String(req.query.officerId) : '';
        const badgeNumber = req.query.badgeNumber ? String(req.query.badgeNumber) : '';

        const { incidents, officers } = await getAllOfficers();
        const roster = groupOfficerRows(officers, incidents);

        // Keep Discord panel in near real-time with the same state the UI is reading.
        let panelResult = null;
        try {
            panelResult = await syncDiscordPanel(roster);
        } catch {
            // Do not fail roster loading if Discord update fails.
        }

        let selectedOfficer = null;
        if (officerId) {
            selectedOfficer = roster.find((row) => String(row.officerId) === officerId) || null;
        }
        if (!selectedOfficer && badgeNumber) {
            selectedOfficer = roster.find((row) => String(row.badgeNumber) === badgeNumber) || null;
        }

        let history = [];
        if (selectedOfficer) {
            history = await getIncidentHistory(selectedOfficer.officerId, selectedOfficer.badgeNumber);
        }

        res.status(200).json({
            roster,
            selectedOfficer,
            history,
            panelResult
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to load discipline roster',
            detail: error.message
        });
    }
};
