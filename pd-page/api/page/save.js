const fs = require('fs').promises;
const path = require('path');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { filePath, content } = req.body;

        if (!filePath || !content) {
            res.status(400).json({ error: 'filePath and content are required' });
            return;
        }

        // Security: only allow saving HTML files in pd-page directory
        const normalizedPath = path.normalize(filePath);
        const allowedDir = path.join(process.cwd(), 'pd-page');
        const fullPath = path.join(allowedDir, normalizedPath);

        if (!fullPath.startsWith(allowedDir)) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        if (!fullPath.endsWith('.html')) {
            res.status(403).json({ error: 'Only HTML files can be saved' });
            return;
        }

        // Save the file
        await fs.writeFile(fullPath, content, 'utf-8');

        res.status(200).json({
            ok: true,
            message: 'File saved successfully',
            path: normalizedPath
        });
    } catch (error) {
        console.error('Save error:', error);
        res.status(500).json({
            error: 'Failed to save file',
            detail: error.message
        });
    }
};
