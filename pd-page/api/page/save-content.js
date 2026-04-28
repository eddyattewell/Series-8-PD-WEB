const { supabaseRequest } = require('../_lib/discipline');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { pagePath, content } = req.body;

        if (!pagePath || !content) {
            res.status(400).json({ error: 'pagePath and content are required' });
            return;
        }

        // Save to Supabase
        const result = await supabaseRequest('/rest/v1/page_content', {
            method: 'POST',
            headers: { 'Prefer': 'resolution=merge-duplicates' },
            body: {
                page_path: pagePath,
                content: content,
                updated_at: new Date().toISOString()
            }
        });

        res.status(200).json({
            ok: true,
            message: 'Page saved to database'
        });
    } catch (error) {
        console.error('Save error:', error);
        res.status(500).json({
            error: 'Failed to save page',
            detail: error.message
        });
    }
};
