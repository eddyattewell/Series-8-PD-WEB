const crypto = require('crypto');
const {
    STATE_COOKIE,
    STATE_MAX_AGE_SECONDS,
    serializeCookie,
    getRequestOrigin,
    isSecureRequest
} = require('../../_lib/session');

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const clientId = process.env.DISCORD_CLIENT_ID;
    if (!clientId) {
        res.status(500).json({
            error: 'Missing DISCORD_CLIENT_ID environment variable'
        });
        return;
    }

    const state = crypto.randomBytes(24).toString('hex');
    const redirectUri =
        process.env.DISCORD_REDIRECT_URI ||
        getRequestOrigin(req) + '/api/auth/discord/callback';

    const authUrl = new URL('https://discord.com/oauth2/authorize');
    authUrl.search = new URLSearchParams({
        client_id: clientId,
        response_type: 'code',
        scope: 'identify',
        redirect_uri: redirectUri,
        state
    }).toString();

    res.setHeader(
        'Set-Cookie',
        serializeCookie(STATE_COOKIE, state, {
            maxAge: STATE_MAX_AGE_SECONDS,
            httpOnly: true,
            secure: isSecureRequest(req),
            sameSite: 'Lax',
            path: '/'
        })
    );

    res.statusCode = 302;
    res.setHeader('Location', authUrl.toString());
    res.end();
};
