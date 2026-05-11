import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  createAccessKeyToken,
  hashAccessKeyToken,
  hasScope,
  parseAccessKeyToken,
  validateScopes
} from '../../src/lib/accessKeys.js';

describe('access key utilities', () => {
  test('creates and parses personal access keys', () => {
    const created = createAccessKeyToken('PERSONAL');
    const parsed = parseAccessKeyToken(created.token);

    assert.equal(parsed.kind, 'PERSONAL');
    assert.equal(parsed.keyId, created.keyId);
    assert.equal(parsed.tokenPrefix, created.tokenPrefix);
    assert.match(created.token, /^mull_pat_/);
  });

  test('creates and parses service tokens', () => {
    const created = createAccessKeyToken('SERVICE');
    const parsed = parseAccessKeyToken(created.token);

    assert.equal(parsed.kind, 'SERVICE');
    assert.equal(parsed.keyId, created.keyId);
    assert.equal(parsed.tokenPrefix, created.tokenPrefix);
    assert.match(created.token, /^mull_st_/);
  });

  test('rejects invalid access key strings', () => {
    assert.equal(parseAccessKeyToken('not-a-token'), null);
    assert.equal(parseAccessKeyToken('mull_st_not-a-uuid_secret'), null);
  });

  test('hashes tokens deterministically without returning the token', () => {
    const token = createAccessKeyToken('SERVICE').token;
    const hash = hashAccessKeyToken(token);

    assert.equal(hashAccessKeyToken(token), hash);
    assert.match(hash, /^[0-9a-f]{64}$/);
    assert.notEqual(hash, token);
  });

  test('validates scopes and supports wildcard auth scopes', () => {
    assert.deepEqual(validateScopes(['config:read', 'config:read']), ['config:read']);
    assert.throws(() => validateScopes(['billing:write']), /Invalid scope/);
    assert.equal(hasScope({ scopes: ['*'] }, 'parameters:write'), true);
    assert.equal(hasScope({ scopes: ['config:read'] }, 'parameters:write'), false);
  });
});
