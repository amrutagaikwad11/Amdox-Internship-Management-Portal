import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'internship-management-portal-secret-key-9988';

export function hashPassword(pwd) {
  return crypto.createHash('sha256').update(pwd).digest('hex');
}

/**
 * Encodes an object to a URL-safe Base64 string
 */
function base64url(obj) {
  return Buffer.from(JSON.stringify(obj))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Decodes a URL-safe Base64 string back to an object
 */
function decodeBase64url(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
}

/**
 * Sign JWT token using HMAC SHA-256
 */
export function generateToken(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const fullPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
  };

  const encodedHeader = base64url(header);
  const encodedPayload = base64url(fullPayload);

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verify HMAC SHA-256 JWT and return its payload, or null if invalid
 */
export function verifyToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    if (signature !== expectedSignature) {
      return null;
    }

    const payload = decodeBase64url(encodedPayload);
    // Token valid for 7 days
    const iat = payload.iat || 0;
    const now = Math.floor(Date.now() / 1000);
    if (now - iat > 7 * 24 * 60 * 60) {
      return null; // Expired
    }

    return payload;
  } catch (e) {
    return null;
  }
}
