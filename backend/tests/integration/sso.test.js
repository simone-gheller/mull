import { test, describe, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert';
import { uuidv7 } from 'uuidv7';
import { buildTestContext } from '../utils/builders.js';

describe('SSO v1', () => {
  let ctx;

  beforeEach(async () => {
    ctx = await buildTestContext();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  async function enableRequiredSso(org, { fallback = false } = {}) {
    const providerId = uuidv7();
    await ctx.prisma.orgSsoConnection.create({
      data: {
        id: uuidv7(),
        orgId: org.id,
        supabaseSsoProviderId: providerId,
        name: 'Acme Entra',
        domains: ['acme.test'],
        status: 'ACTIVE'
      }
    });
    await ctx.prisma.orgAuthPolicy.create({
      data: {
        orgId: org.id,
        ssoMode: 'REQUIRED',
        allowPasswordFallbackForOwners: fallback
      }
    });
    return providerId;
  }

  test('login discovery exposes active SSO only for eligible plans', async () => {
    const businessOrg = await ctx.buildOrg({ plan: 'BUSINESS' });
    const teamOrg = await ctx.buildOrg({ plan: 'TEAM' });
    await enableRequiredSso(businessOrg);
    await ctx.prisma.orgSsoConnection.create({
      data: {
        id: uuidv7(),
        orgId: teamOrg.id,
        supabaseSsoProviderId: uuidv7(),
        name: 'Team SSO',
        domains: ['team.test'],
        status: 'ACTIVE'
      }
    });
    await ctx.prisma.orgAuthPolicy.create({
      data: { orgId: teamOrg.id, ssoMode: 'REQUIRED' }
    });

    const businessResponse = await ctx.fastify.inject({
      method: 'POST',
      url: '/auth/login-discovery',
      body: { email: 'dev@acme.test' }
    });
    assert.equal(businessResponse.statusCode, 200);
    const business = JSON.parse(businessResponse.body);
    assert.equal(business.primary, 'sso');
    assert.equal(business.sso.available, true);
    assert.equal(business.sso.required, true);

    const teamResponse = await ctx.fastify.inject({
      method: 'POST',
      url: '/auth/login-discovery',
      body: { email: 'dev@team.test' }
    });
    assert.equal(teamResponse.statusCode, 200);
    const team = JSON.parse(teamResponse.body);
    assert.equal(team.primary, 'password');
    assert.equal(team.sso.available, false);
  });

  test('required SSO blocks non-SSO user sessions and accepts matching SSO sessions', async () => {
    const org = await ctx.buildOrg({ plan: 'BUSINESS' });
    const providerId = await enableRequiredSso(org);
    const user = await ctx.buildUserInOrg(org, { role: 'DEVELOPER' });

    const blocked = await ctx.injectAuth({
      method: 'GET',
      url: `/orgs/${org.id}`
    }, user);
    assert.equal(blocked.statusCode, 403);
    assert.equal(JSON.parse(blocked.body).code, 'ORG_SSO_REQUIRED');

    const allowed = await ctx.injectAuth({
      method: 'GET',
      url: `/orgs/${org.id}`,
      headers: { 'x-test-sso-provider-id': providerId }
    }, user);
    assert.equal(allowed.statusCode, 200);
  });

  test('SSO enforcement is suspended on ineligible plans', async () => {
    const org = await ctx.buildOrg({ plan: 'TEAM' });
    await enableRequiredSso(org);
    const user = await ctx.buildUserInOrg(org, { role: 'DEVELOPER' });

    const response = await ctx.injectAuth({
      method: 'GET',
      url: `/orgs/${org.id}`
    }, user);
    assert.equal(response.statusCode, 200);
  });

  test('service tokens continue to work when org requires SSO', async () => {
    const org = await ctx.buildOrg({ plan: 'BUSINESS' });
    const owner = await ctx.buildUserInOrg(org, { role: 'OWNER' });

    const createResponse = await ctx.injectAuth({
      method: 'POST',
      url: `/orgs/${org.id}/access-keys`,
      body: {
        name: 'deploy',
        scopes: ['config:read'],
        ttl: '90d'
      }
    }, owner);
    assert.equal(createResponse.statusCode, 201);
    const created = JSON.parse(createResponse.body);
    await enableRequiredSso(org);

    const whoami = await ctx.fastify.inject({
      method: 'GET',
      url: '/auth/whoami',
      headers: { authorization: `Bearer ${created.token}` }
    });
    assert.equal(whoami.statusCode, 200);
    assert.equal(JSON.parse(whoami.body).identityType, 'SERVICE');
  });

  test('personal token creation for required SSO org needs an SSO session', async () => {
    const org = await ctx.buildOrg({ plan: 'BUSINESS' });
    const providerId = await enableRequiredSso(org);
    const user = await ctx.buildUserInOrg(org, { role: 'DEVELOPER' });
    const body = {
      orgId: org.id,
      name: 'cli',
      scopes: ['config:read'],
      ttl: '90d'
    };

    const blocked = await ctx.injectAuth({
      method: 'POST',
      url: '/auth/access-keys',
      body
    }, user);
    assert.equal(blocked.statusCode, 403);
    assert.equal(JSON.parse(blocked.body).code, 'ORG_SSO_REQUIRED');

    const allowed = await ctx.injectAuth({
      method: 'POST',
      url: '/auth/access-keys',
      headers: { 'x-test-sso-provider-id': providerId },
      body
    }, user);
    assert.equal(allowed.statusCode, 201);
    assert.match(JSON.parse(allowed.body).token, /^vextis_pat_/);
  });
});
