const { supabaseRequest } = require('../_lib/discipline');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        // Parse body - handle both pre-parsed and raw
        let body = req.body;
        if (typeof body === 'string') {
            body = JSON.parse(body);
        }

        const pagePath = body?.pagePath;
        const content = body?.content;

        console.log('Save request:', { pagePath: pagePath?.substring(0, 50), contentLength: content?.length });

        if (!pagePath || !content) {
            return res.status(400).json({
                error: 'pagePath and content are required',
                received: { pagePath: !!pagePath, content: !!content }
            });
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
