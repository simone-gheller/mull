import { LRUCache } from 'lru-cache';

/**
 * Caches org-level plan + SSO policy (the data needed to gate requests on
 * enterprise SSO enforcement), keyed by orgId. TTL is a backstop only — plan
 * changes (billing) and SSO policy changes (org settings) invalidate
 * explicitly via invalidateOrg() so security-relevant changes take effect
 * immediately, mirroring the identity cache in identityCache.js.
 */

const cache = new LRUCache({
  max: 5000,
  ttl: 5 * 60 * 1000
});

async function loadOrgSecurityInfo(prisma, orgId) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      plan: true,
      authPolicy: true,
      ssoConnections: {
        where: { status: 'ACTIVE' },
        select: { supabaseSsoProviderId: true },
        take: 1
      }
    }
  });
  return {
    plan: org?.plan ?? null,
    authPolicy: org?.authPolicy ?? null,
    connection: org?.ssoConnections?.[0] ?? null
  };
}

export async function getOrgSecurityInfo(prisma, orgId) {
  let info = cache.get(orgId);
  if (!info) {
    info = await loadOrgSecurityInfo(prisma, orgId);
    cache.set(orgId, info);
  }
  return info;
}

export function invalidateOrg(orgId) {
  cache.delete(orgId);
}
