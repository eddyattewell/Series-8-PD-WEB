const crypto = require('crypto');

const SESSION_COOKIE = 'pd_session';
const STATE_COOKIE = 'pd_oauth_state';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;
const STATE_MAX_AGE_SECONDS = 60 * 10;

function base64UrlEncode(value) {
    return Buffer.from(value)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
}

function base64UrlDecode(value) {
    const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
    const padLength = (4 - (normalized.length % 4)) % 4;
    const padded = normalized + '='.repeat(padLength);
    return Buffer.from(padded, 'base64').toString('utf8');
}

function sign(input, secret) {
    return base64UrlEncode(
        crypto.createHmac('sha256', secret).update(String(input)).digest()
    );
}

function timingSafeEqual(a, b) {
    const left = Buffer.from(String(a));
    const right = Buffer.from(String(b));
    if (left.length !== right.length) return false;
    return crypto.timingSafeEqual(left, right);
}

function createSignedToken(payload, secret) {
    const body = base64UrlEncode(JSON.stringify(payload));
    const signature = sign(body, secret);
    return body + '.' + signature;
}

function verifySignedToken(token, secret) {
    if (!token || !secret) return null;

    const parts = String(token).split('.');
    if (parts.length !== 2) return null;

    const body = parts[0];
    const signature = parts[1];
    const expected = sign(body, secret);

    if (!timingSafeEqual(signature, expected)) return null;

    try {
        return JSON.parse(base64UrlDecode(body));
    } catch {
        return null;
    }
}

function parseCookies(cookieHeader) {
    const cookies = {};
    const raw = String(cookieHeader || '');

    if (!raw) return cookies;

    raw.split(';').forEach((part) => {
        const idx = part.indexOf('=');
        if (idx < 0) return;

        const key = part.slice(0, idx).trim();
        const value = part.slice(idx + 1).trim();

        if (!key) return;

        try {
            cookies[key] = decodeURIComponent(value);
        } catch {
            cookies[key] = value;
        }
    });

    return cookies;
}

function serializeCookie(name, value, options = {}) {
    const segments = [name + '=' + encodeURIComponent(String(value))];

    if (typeof options.maxAge === 'number') {
        segments.push('Max-Age=' + Math.max(0, Math.floor(options.maxAge)));
    }

    segments.push('Path=' + (options.path || '/'));

    if (options.httpOnly) segments.push('HttpOnly');
    if (options.secure) segments.push('Secure');

    if (options.sameSite) {
        segments.push('SameSite=' + options.sameSite);
    }

    return segments.join('; ');
}

function getRequestOrigin(req) {
    const protoRaw = req.headers['x-forwarded-proto'] || 'https';
    const proto = String(protoRaw).split(',')[0].trim();
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    return proto + '://' + host;
}

function isSecureRequest(req) {
    const protoRaw = req.headers['x-forwarded-proto'] || '';
    const proto = String(protoRaw).split(',')[0].trim().toLowerCase();

    if (proto === 'https') return true;
    return process.env.NODE_ENV === 'production';
}

module.exports = {
    SESSION_COOKIE,
    STATE_COOKIE,
    SESSION_MAX_AGE_SECONDS,
    STATE_MAX_AGE_SECONDS,
    createSignedToken,
    verifySignedToken,
    parseCookies,
    serializeCookie,
    getRequestOrigin,
    isSecureRequest
};
