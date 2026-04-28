const { supabaseRequest } = require('../_lib/discipline');

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const pagePath = req.query.path;

        if (!pagePath) {
            res.status(400).json({ error: 'path query parameter is required' });
            return;
        }

        // Fetch from Supabase
        const result = await supabaseRequest('/rest/v1/page_content?page_path=eq.' + encodeURIComponent(pagePath) + '&limit=1');

        if (!Array.isArray(result) || result.length === 0) {
            res.status(404).json({ found: false });
            return;
        }

        res.status(200).json({
            found: true,
            content: result[0].content,
            updatedAt: result[0].updated_at
        });
    } catch (error) {
        console.error('Load error:', error);
        res.status(500).json({
            error: 'Failed to load page content',
            detail: error.message
        });
    }
};
