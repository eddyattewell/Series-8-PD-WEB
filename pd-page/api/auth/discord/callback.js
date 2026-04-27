const {
    SESSION_COOKIE,
    STATE_COOKIE,
    SESSION_MAX_AGE_SECONDS,
    createSignedToken,
    parseCookies,
    serializeCookie,
    getRequestOrigin,
    isSecureRequest
} = require('../../_lib/session');

const DISCORD_API_BASE = 'https://discord.com/api/v10';

function firstQueryValue(value) {
    if (Array.isArray(value)) return value[0];
    return value;
}

async function parseJsonResponse(response) {
    const text = await response.text();
    if (!text) return {};

    try {
        return JSON.parse(text);
    } catch {
        return { raw: text };
    }
}

async function getDiscordMemberRoles(userId) {
    const guildId = process.env.DISCORD_GUILD_ID;
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!guildId || !botToken) {
        return { names: [], ids: [] };
    }

    const headers = {
        Authorization: 'Bot ' + botToken
    };


    const [memberRes, rolesRes] = await Promise.all([
        fetch(DISCORD_API_BASE + '/guilds/' + guildId + '/members/' + userId, {
            method: 'GET',
            headers
        }),
        fetch(DISCORD_API_BASE + '/guilds/' + guildId + '/roles', {
            method: 'GET',
            headers
        })
    ]);

    if (!memberRes.ok || !rolesRes.ok) {
        try {
            const memberBody = await parseJsonResponse(memberRes).catch(() => ({ raw: 'unreadable' }));
            const rolesBody = await parseJsonResponse(rolesRes).catch(() => ({ raw: 'unreadable' }));
            console.error('Discord API role fetch failed', {
                guildId,
                userId,
                memberStatus: memberRes.status,
                memberBody,
                rolesStatus: rolesRes.status,
                rolesBody
            });
        } catch (err) {
            console.error('Discord API role fetch failed and logging failed', err);
        }

        return { names: [], ids: [] };
    }

    const member = await parseJsonResponse(memberRes);
    const roles = await parseJsonResponse(rolesRes);

    if (!Array.isArray(member.roles) || !Array.isArray(roles)) {
        console.error('Discord API returned unexpected shapes', { guildId, userId, member, roles });
        return { names: [], ids: [] };
    }

    if (!Array.isArray(member.roles) || !Array.isArray(roles)) {
        return { names: [], ids: [] };
    }

    const nameById = new Map();
    roles.forEach((role) => {
        if (!role || !role.id || !role.name) return;
        nameById.set(role.id, role.name);
    });

    const names = member.roles.map((id) => nameById.get(id)).filter(Boolean);
    const ids = member.roles.map((id) => String(id)).filter(Boolean);

    return { names, ids };
}

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const code = firstQueryValue(req.query.code);
    const state = firstQueryValue(req.query.state);
    const oauthError = firstQueryValue(req.query.error);

    if (oauthError) {
        res.status(401).json({ error: 'Discord OAuth denied', detail: oauthError });
        return;
    }

    if (!code || !state) {
        res.status(400).json({ error: 'Missing OAuth code or state' });
        return;
    }

    const requiredEnv = [
        'DISCORD_CLIENT_ID',
        'DISCORD_CLIENT_SECRET',
        'SESSION_SECRET'
    ];
    const missingEnv = requiredEnv.filter((name) => !process.env[name]);

    if (missingEnv.length > 0) {
        res.status(500).json({
            error: 'Missing required environment variables',
            missing: missingEnv,
            where: 'Vercel Project Settings -> Environment Variables',
            action: 'Add variables and redeploy'
        });
        return;
    }

    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const sessionSecret = process.env.SESSION_SECRET;

    const cookies = parseCookies(req.headers.cookie || '');
    if (!cookies[STATE_COOKIE] || cookies[STATE_COOKIE] !== state) {
        res.status(401).json({ error: 'Invalid OAuth state' });
        return;
    }

    const redirectUri =
        process.env.DISCORD_REDIRECT_URI ||
        getRequestOrigin(req) + '/api/auth/discord/callback';

    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri
        }).toString()
    });

    if (!tokenResponse.ok) {
        const details = await parseJsonResponse(tokenResponse);
        res.status(401).json({ error: 'Failed to exchange Discord OAuth code', details });
        return;
    }

    const tokenData = await parseJsonResponse(tokenResponse);

    const userResponse = await fetch(DISCORD_API_BASE + '/users/@me', {
        method: 'GET',
        headers: {
            Authorization: 'Bearer ' + tokenData.access_token
        }
    });

    if (!userResponse.ok) {
        const details = await parseJsonResponse(userResponse);
        res.status(401).json({ error: 'Failed to fetch Discord user', details });
        return;
    }

    const user = await parseJsonResponse(userResponse);
    const { names: roleNames, ids: roleIds } = await getDiscordMemberRoles(user.id);

    const payload = {
        sub: user.id,
        username:
            user.discriminator && user.discriminator !== '0'
                ? user.username + '#' + user.discriminator
                : user.username,
        roles: roleNames,
        roleIds: roleIds,
        iat: Date.now()
    };

    const sessionToken = createSignedToken(payload, sessionSecret);
    const secure = isSecureRequest(req);

    res.setHeader('Set-Cookie', [
        serializeCookie(SESSION_COOKIE, sessionToken, {
            maxAge: SESSION_MAX_AGE_SECONDS,
            httpOnly: true,
            secure,
            sameSite: 'Lax',
            path: '/'
        }),
        serializeCookie(STATE_COOKIE, '', {
            maxAge: 0,
            httpOnly: true,
            secure,
            sameSite: 'Lax',
            path: '/'
        })
    ]);

    res.statusCode = 302;
    res.setHeader('Location', '/');
    res.end();
};
