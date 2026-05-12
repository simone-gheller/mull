import test from 'node:test';
import assert from 'node:assert/strict';
import {
  domainFromEmail,
  hasEnterpriseSso,
  inferSupabaseAuthMetadata,
  isSsoSessionForConnection,
  normalizeDomain
} from '../../src/lib/sso.js';

test('enterprise SSO is gated to Business and Custom tiers', () => {
  assert.equal(hasEnterpriseSso('FREE'), false);
  assert.equal(hasEnterpriseSso('TEAM'), false);
  assert.equal(hasEnterpriseSso('BUSINESS'), true);
  assert.equal(hasEnterpriseSso('ENTERPRISE'), true);
  assert.equal(hasEnterpriseSso('CUSTOM'), true);
});

test('normalizes email domains for SSO discovery', () => {
  assert.equal(domainFromEmail('Ada@Example.COM'), 'example.com');
  assert.equal(normalizeDomain(' Acme.COM '), 'acme.com');
  assert.equal(domainFromEmail('invalid'), null);
});

test('infers SSO provider metadata from Supabase identities', () => {
  const providerId = '11111111-1111-4111-8111-111111111111';
  const metadata = inferSupabaseAuthMetadata({
    id: 'supabase-user-id',
    identities: [
      { provider: 'google', provider_id: 'google-subject' },
      { provider: `sso:${providerId}`, provider_id: 'saml-name-id' }
    ]
  });

  assert.equal(metadata.provider, `sso:${providerId}`);
  assert.equal(metadata.providerId, 'saml-name-id');
  assert.equal(metadata.ssoProviderId, providerId);
  assert.equal(metadata.isSsoSession, true);
});

test('checks whether a session satisfies an org SSO connection', () => {
  const providerId = '11111111-1111-4111-8111-111111111111';
  assert.equal(isSsoSessionForConnection(
    { isSsoSession: true, ssoProviderId: providerId },
    { supabaseSsoProviderId: providerId }
  ), true);
  assert.equal(isSsoSessionForConnection(
    { isSsoSession: false, ssoProviderId: providerId },
    { supabaseSsoProviderId: providerId }
  ), false);
});
