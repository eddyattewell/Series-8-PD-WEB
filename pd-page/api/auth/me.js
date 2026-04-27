const {
    SESSION_COOKIE,
    parseCookies,
    verifySignedToken,
    serializeCookie,
    isSecureRequest
} = require('../_lib/session');

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const sessionSecret = process.env.SESSION_SECRET;
    if (!sessionSecret) {
        res.status(500).json({
            error: 'Missing SESSION_SECRET environment variable'
        });
        return;
    }

    const cookies = parseCookies(req.headers.cookie || '');
    const token = cookies[SESSION_COOKIE];

    if (!token) {
        res.status(401).json({ authenticated: false, roles: [] });
        return;
    }

    const payload = verifySignedToken(token, sessionSecret);
    if (!payload) {
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
        res.status(401).json({ authenticated: false, roles: [] });
        return;
    }

    const roles = Array.isArray(payload.roles) ? payload.roles : [];

    res.status(200).json({
        authenticated: true,
        roles,
        user: {
            id: payload.sub,
            username: payload.username,
            roles
        }
    });
};
