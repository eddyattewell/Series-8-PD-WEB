/**
 * DEBUG ENDPOINT: Test Discord API calls for member roles
 * Usage: GET /api/debug/discord-test?userId=506429125796298752
 * Returns raw Discord API responses + interpreted results
 * Remove this file before production deployment
 */

const DISCORD_API_BASE = 'https://discord.com/api/v10';

async function parseJsonResponse(response) {
    const text = await response.text();
    if (!text) return {};
    try {
        return JSON.parse(text);
    } catch {
        return { raw: text };
    }
}

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const guildId = process.env.DISCORD_GUILD_ID;
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const userId = req.query.userId || '506429125796298752'; // Default to known user

    if (!guildId) {
        res.status(500).json({ error: 'Missing DISCORD_GUILD_ID env var' });
        return;
    }

    if (!botToken) {
        res.status(500).json({ error: 'Missing DISCORD_BOT_TOKEN env var' });
        return;
    }

    const headers = { Authorization: 'Bot ' + botToken };

    try {
        // Fetch member and roles in parallel
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

        const memberData = await parseJsonResponse(memberRes);
        const rolesData = await parseJsonResponse(rolesRes);

        const result = {
            config: {
                guildId,
                userId,
                botTokenPresent: !!botToken
            },
            memberRequest: {
                url: DISCORD_API_BASE + '/guilds/' + guildId + '/members/' + userId,
                status: memberRes.status,
                statusText: memberRes.statusText,
                ok: memberRes.ok,
                data: memberData
            },
            rolesRequest: {
                url: DISCORD_API_BASE + '/guilds/' + guildId + '/roles',
                status: rolesRes.status,
                statusText: rolesRes.statusText,
                ok: rolesRes.ok,
                data: rolesData
            },
            interpretation: {}
        };

        // Interpret results
        if (!memberRes.ok) {
            result.interpretation.memberError = `Member fetch failed with status ${memberRes.status}`;
            if (memberData.code === 50001) result.interpretation.memberError += ' (bot not in guild or insufficient permissions)';
            if (memberData.code === 10007) result.interpretation.memberError += ' (member not found or not in guild)';
        }

        if (!rolesRes.ok) {
            result.interpretation.rolesError = `Roles fetch failed with status ${rolesRes.status}`;
        }

        if (memberRes.ok && rolesRes.ok) {
            if (!Array.isArray(memberData.roles)) {
                result.interpretation.memberRolesError = 'Member.roles is not an array';
            } else if (memberData.roles.length === 0) {
                result.interpretation.memberRoles = 'Member has no roles assigned';
            } else {
                result.interpretation.memberRoles = `Member has ${memberData.roles.length} role(s): ${memberData.roles.join(', ')}`;
            }

            if (!Array.isArray(rolesData)) {
                result.interpretation.rolesDataError = 'Roles response is not an array';
            } else {
                const nameById = new Map();
                rolesData.forEach((role) => {
                    if (role && role.id && role.name) {
                        nameById.set(role.id, role.name);
                    }
                });

                const roleNames = memberData.roles
                    .map((id) => nameById.get(id))
                    .filter(Boolean);

                result.interpretation.resolvedRoleNames = roleNames;
                result.interpretation.lookupTable = Array.from(nameById.entries()).map(([id, name]) => ({ id, name }));
            }
        }

        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({
            error: 'Exception during test',
            message: err.message,
            stack: err.stack
        });
    }
};
