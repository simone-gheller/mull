export const SSO_ELIGIBLE_PLANS = new Set(['BUSINESS', 'ENTERPRISE', 'CUSTOM']);

export function hasEnterpriseSso(plan) {
  return SSO_ELIGIBLE_PLANS.has(String(plan || '').toUpperCase());
}

export function normalizeDomain(domain) {
  return String(domain || '').trim().toLowerCase();
}

export function domainFromEmail(email) {
  const [, domain] = String(email || '').trim().toLowerCase().split('@');
  return domain || null;
}

export function inferSupabaseAuthMetadata(supabaseUser = {}) {
  const identities = Array.isArray(supabaseUser.identities) ? supabaseUser.identities : [];
  const ssoIdentity = identities.find(identity => String(identity.provider || '').startsWith('sso:'));
  const primaryIdentity = ssoIdentity || identities.at(-1) || identities[0] || null;
  const appProvider = supabaseUser.app_metadata?.provider;
  const provider = primaryIdentity?.provider || appProvider || 'email';
  const providerId = primaryIdentity?.provider_id || primaryIdentity?.id || supabaseUser.id || null;
  const ssoProviderId = String(provider).startsWith('sso:') ? provider.slice(4) : null;

  return {
    provider,
    providerId,
    ssoProviderId,
    isSsoSession: Boolean(ssoProviderId)
  };
}

export function isSsoSessionForConnection(auth, connection) {
  return Boolean(
    auth?.isSsoSession &&
    auth?.ssoProviderId &&
    connection?.supabaseSsoProviderId &&
    auth.ssoProviderId === connection.supabaseSsoProviderId
  );
}
