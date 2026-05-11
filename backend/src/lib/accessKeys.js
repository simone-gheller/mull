import crypto from 'node:crypto';
import { uuidv7 } from 'uuidv7';

export const ACCESS_KEY_SCOPES = [
  'config:read',
  'parameters:read',
  'parameters:write',
  'apps:read',
  'environments:read'
];

export const ACCESS_KEY_TTL_PRESETS = {
  '30d': 30,
  '90d': 90,
  '365d': 365,
  never: null
};

export function parseAccessKeyToken(token) {
  if (typeof token !== 'string') return null;
  const match = token.match(/^(mull_(pat|st))_([0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12})_([A-Za-z0-9_-]{32,})$/);
  if (!match) return null;
  return {
    kind: match[2] === 'pat' ? 'PERSONAL' : 'SERVICE',
    prefixKind: match[1],
    keyId: match[3],
    secret: match[4],
    tokenPrefix: `${match[1]}_${match[3]}`
  };
}

export function isAccessKeyToken(token) {
  return typeof token === 'string' && (token.startsWith('mull_pat_') || token.startsWith('mull_st_'));
}

export function hashAccessKeyToken(token) {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

export function verifyAccessKeyToken(token, expectedHash) {
  if (!expectedHash) return false;
  const actual = Buffer.from(hashAccessKeyToken(token), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export function createAccessKeyToken(kind) {
  const keyId = uuidv7();
  const prefixKind = kind === 'PERSONAL' ? 'mull_pat' : 'mull_st';
  const secret = crypto.randomBytes(32).toString('base64url');
  const tokenPrefix = `${prefixKind}_${keyId}`;
  const token = `${tokenPrefix}_${secret}`;
  return {
    keyId,
    token,
    tokenPrefix,
    tokenHash: hashAccessKeyToken(token)
  };
}

export function expiresAtFromPreset(preset) {
  if (preset === undefined || preset === null) return undefined;
  if (!(preset in ACCESS_KEY_TTL_PRESETS)) {
    throw new Error('Invalid TTL preset');
  }
  const days = ACCESS_KEY_TTL_PRESETS[preset];
  if (days === null) return null;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export function validateScopes(scopes) {
  if (!Array.isArray(scopes) || scopes.length === 0) {
    throw new Error('At least one scope is required');
  }
  const unique = [...new Set(scopes)];
  const invalid = unique.filter(scope => !ACCESS_KEY_SCOPES.includes(scope));
  if (invalid.length > 0) {
    throw new Error(`Invalid scope: ${invalid[0]}`);
  }
  return unique;
}

export function hasScope(auth, scope) {
  return auth?.scopes?.includes('*') || auth?.scopes?.includes(scope);
}
