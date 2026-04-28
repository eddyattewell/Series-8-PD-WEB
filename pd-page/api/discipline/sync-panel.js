const {
    getAllOfficers,
    groupOfficerRows,
    refreshExpiredIncidents,
    syncDiscordPanel
} = require('../_lib/discipline');

module.exports = async function handler(req, res) {
    // Allow GET or POST
    if (req.method !== 'GET' && req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        // Optional secret protection: set PANEL_SYNC_SECRET in Vercel
        const secret = process.env.PANEL_SYNC_SECRET;
        if (secret) {
            const header = req.headers['x-panel-sync-secret'];
            const q = req.query && req.query.secret ? String(req.query.secret) : '';
            if (header !== secret && q !== secret) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
        }

        // Refresh expired incidents first
        await refreshExpiredIncidents();

        // Build roster and sync panel
        const { incidents, officers } = await getAllOfficers();
        const roster = groupOfficerRows(officers, incidents);

        const panelResult = await syncDiscordPanel(roster);

        res.status(200).json({ ok: true, panelResult });
    } catch (err) {
        res.status(500).json({ error: 'Failed to sync panel', detail: err.message });
    }
};
