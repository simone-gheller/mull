import { LRUCache } from 'lru-cache';

/**
 * Caches the resolved user+organizations+roles payload from findUserBySupabaseAccount,
 * keyed by Supabase auth ID. TTL is a backstop only — org/role mutations invalidate
 * explicitly via invalidateUser() so permission changes take effect immediately.
 */

const userIdIndex = new Map(); // internal user id -> Set<supabaseId>

function untrack(supabaseId, raw) {
  const ids = userIdIndex.get(raw.id);
  if (!ids) return;
  ids.delete(supabaseId);
  if (ids.size === 0) userIdIndex.delete(raw.id);
}

const cache = new LRUCache({
  max: 5000,
  ttl: 5 * 60 * 1000,
  dispose: (raw, supabaseId) => untrack(supabaseId, raw)
});

export function getCachedIdentity(supabaseId) {
  return cache.get(supabaseId) ?? null;
}

export function setCachedIdentity(supabaseId, raw) {
  cache.set(supabaseId, raw);
  let ids = userIdIndex.get(raw.id);
  if (!ids) {
    ids = new Set();
    userIdIndex.set(raw.id, ids);
  }
  ids.add(supabaseId);
}

export function invalidateUser(userId) {
  const ids = userIdIndex.get(userId);
  if (!ids) return;
  for (const supabaseId of [...ids]) cache.delete(supabaseId);
}
