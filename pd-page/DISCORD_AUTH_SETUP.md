# Discord Auth Setup (Vercel)

This project now includes Discord auth endpoints used by Edit Mode role checks:

- /auth/discord/login (static redirect page)
- /api/auth/discord/login
- /api/auth/discord/callback
- /api/auth/me
- /api/auth/logout

## Required Vercel Environment Variables

Set these in Vercel Project Settings -> Environment Variables:

- DISCORD_CLIENT_ID
- DISCORD_CLIENT_SECRET
- SESSION_SECRET
- DISCORD_GUILD_ID
- DISCORD_BOT_TOKEN

Optional:

- DISCORD_REDIRECT_URI
  - If omitted, defaults to: https://<your-domain>/api/auth/discord/callback

## Discord Application Settings

In Discord Developer Portal (OAuth2), add redirect URI:

- https://series-8-pd.vercel.app/api/auth/discord/callback

If you use another domain, add that callback URI too.

## Role Gate

Frontend checks for this role name from /api/auth/me:

- Gold Command

The backend resolves role names for the logged-in user by querying guild member roles with DISCORD_BOT_TOKEN.

## Local Testing Shortcut

If backend auth is not configured yet, temporary role mock is available in browser localStorage:

- key: pd_mock_roles
- value example: Gold Command

Clear after testing.

## Troubleshooting

If you see this error:

- {"error":"Missing DISCORD_CLIENT_ID environment variable"}

or:

- {"error":"Missing required environment variables", ...}

do the following:

1. Open Vercel -> Project Settings -> Environment Variables.
2. Add all required vars listed above for Production (and Preview if needed).
3. Redeploy the project (env var changes are only picked up on a new deployment).
4. Retest:
  - /api/auth/discord/login
  - /auth/discord/login
