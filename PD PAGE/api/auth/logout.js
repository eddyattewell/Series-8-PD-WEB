const { SESSION_COOKIE, serializeCookie, isSecureRequest } = require('../_lib/session');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    res.setHeader(
        'Set-Cookie',
        serializeCookie(SESSION_COOKIE, '', {
            maxAge: 0,
            httpOnly: true,
            secure: isSecureRequest(req),
            sameSite: 'Lax',
            path: '/'
        })
    );

    res.status(200).json({ ok: true });
};
