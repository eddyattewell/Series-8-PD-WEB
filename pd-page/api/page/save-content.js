const { supabaseRequest } = require('../_lib/discipline');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        console.log('Raw body:', req.body);
        console.log('Body type:', typeof req.body);
        console.log('Body keys:', Object.keys(req.body || {}));

        const pagePath = req.body?.pagePath || req.body?.page_path;
        const content = req.body?.content;

        console.log('Extracted - pagePath:', pagePath ? 'YES' : 'NO', 'content:', content ? `${content.length} chars` : 'NO');

        if (!pagePath || !content) {
            return res.status(400).json({
                error: 'pagePath and content are required',
                debug: {
                    bodyReceived: !!req.body,
                    bodyType: typeof req.body,
                    hasPagePath: !!pagePath,
                    hasContent: !!content
                }
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

