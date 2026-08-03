import test from 'node:test';
import assert from 'node:assert/strict';
import { getCachedIdentity, setCachedIdentity, invalidateUser } from '../../src/lib/identityCache.js';

test('caches an identity by supabaseId and returns null on miss', () => {
  assert.equal(getCachedIdentity('missing-supabase-id'), null);

  const raw = { id: 'user-1', email: 'a@example.com', organizations: [] };
  setCachedIdentity('supabase-1', raw);

  assert.equal(getCachedIdentity('supabase-1'), raw);
});

test('invalidateUser evicts every supabaseId linked to that user', () => {
  const raw = { id: 'user-2', email: 'b@example.com', organizations: [] };
  setCachedIdentity('supabase-2a', raw);
  setCachedIdentity('supabase-2b', raw); // e.g. a second linked auth provider

  invalidateUser('user-2');

  assert.equal(getCachedIdentity('supabase-2a'), null);
  assert.equal(getCachedIdentity('supabase-2b'), null);
});

test('invalidateUser is a no-op for an unknown user', () => {
  assert.doesNotThrow(() => invalidateUser('never-cached-user'));
});

test('invalidating one user does not evict another', () => {
  const rawA = { id: 'user-3', organizations: [] };
  const rawB = { id: 'user-4', organizations: [] };
  setCachedIdentity('supabase-3', rawA);
  setCachedIdentity('supabase-4', rawB);

  invalidateUser('user-3');

  assert.equal(getCachedIdentity('supabase-3'), null);
  assert.equal(getCachedIdentity('supabase-4'), rawB);
});
