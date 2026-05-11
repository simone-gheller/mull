import { test, describe, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert';
import { buildTestContext } from '../utils/builders.js';
import { encryptedParameterValueData } from '../../src/crypto/envelope.js';

describe('Access Key Routes', () => {
  let ctx;

  beforeEach(async () => {
    ctx = await buildTestContext();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  test('creates a service token, shows raw token once, and uses it for config:read', async () => {
    const org = await ctx.buildOrg();
    const user = await ctx.buildUserInOrg(org, { role: 'ADMIN' });
    const app = await ctx.buildApp({ orgId: org.id, name: 'api' });
    const env = await ctx.buildEnv({ orgId: org.id, name: 'prod' });
    const param = await ctx.buildParam({ appId: app.id, key: 'DATABASE_URL' });
    const value = await ctx.prisma.parameterValue.findFirst({
      where: { parameterId: param.id, environmentId: env.id }
    });
    await ctx.prisma.parameterValue.update({
      where: { id: value.id },
      data: {
        isSet: true,
        ...encryptedParameterValueData({
          value: 'postgres://prod',
          parameterValueId: value.id,
          parameterId: param.id,
          environmentId: env.id
        })
      }
    });

    const createResponse = await ctx.injectAuth({
      method: 'POST',
      url: `/orgs/${org.id}/access-keys`,
      body: {
        name: 'github deploy',
        scopes: ['config:read'],
        ttl: '90d',
        appId: app.id,
        environmentId: env.id
      }
    }, user);

    assert.equal(createResponse.statusCode, 201);
    const created = JSON.parse(createResponse.body);
    assert.match(created.token, /^mull_st_/);
    assert.equal(created.tokenPrefix, created.token.split('_').slice(0, 3).join('_'));

    const listResponse = await ctx.injectAuth({
      method: 'GET',
      url: `/orgs/${org.id}/access-keys`
    }, user);
    const listed = JSON.parse(listResponse.body);
    assert.equal(listResponse.statusCode, 200);
    assert.equal(listed.length, 1);
    assert.equal(listed[0].token, undefined);

    const whoamiResponse = await ctx.fastify.inject({
      method: 'GET',
      url: '/auth/whoami',
      headers: { authorization: `Bearer ${created.token}` }
    });
    assert.equal(whoamiResponse.statusCode, 200);
    const whoami = JSON.parse(whoamiResponse.body);
    assert.equal(whoami.identityType, 'SERVICE');
    assert.equal(whoami.credentialType, 'ACCESS_KEY');
    assert.equal(whoami.organizations[0].id, org.id);
    assert.equal(whoami.organizations[0].role, null);

    const configResponse = await ctx.fastify.inject({
      method: 'GET',
      url: `/orgs/${org.id}/config/${app.id}/${env.id}`,
      headers: { authorization: `Bearer ${created.token}` }
    });

    assert.equal(configResponse.statusCode, 200);
    assert.deepEqual(JSON.parse(configResponse.body), { DATABASE_URL: 'postgres://prod' });
  });

  test('denies service token usage without the required scope', async () => {
    const org = await ctx.buildOrg();
    const user = await ctx.buildUserInOrg(org, { role: 'ADMIN' });
    const app = await ctx.buildApp({ orgId: org.id });
    const env = await ctx.buildEnv({ orgId: org.id });

    const createResponse = await ctx.injectAuth({
      method: 'POST',
      url: `/orgs/${org.id}/access-keys`,
      body: {
        name: 'parameter reader',
        scopes: ['parameters:read'],
        ttl: '90d'
      }
    }, user);
    const created = JSON.parse(createResponse.body);

    const response = await ctx.fastify.inject({
      method: 'GET',
      url: `/orgs/${org.id}/config/${app.id}/${env.id}`,
      headers: { authorization: `Bearer ${created.token}` }
    });

    assert.equal(response.statusCode, 403);
  });

  test('personal access tokens keep user role checks for writes', async () => {
    const org = await ctx.buildOrg();
    const user = await ctx.buildUserInOrg(org, { role: 'USER' });
    const app = await ctx.buildApp({ orgId: org.id });
    const env = await ctx.buildEnv({ orgId: org.id });
    const param = await ctx.buildParam({ appId: app.id, key: 'LOG_LEVEL' });
    const value = await ctx.prisma.parameterValue.findFirst({
      where: { parameterId: param.id, environmentId: env.id }
    });

    const createResponse = await ctx.injectAuth({
      method: 'POST',
      url: '/auth/access-keys',
      body: {
        orgId: org.id,
        name: 'local cli',
        scopes: ['parameters:write'],
        ttl: '90d'
      }
    }, user);
    const created = JSON.parse(createResponse.body);

    const whoamiResponse = await ctx.fastify.inject({
      method: 'GET',
      url: '/auth/whoami',
      headers: { authorization: `Bearer ${created.token}` }
    });
    assert.equal(whoamiResponse.statusCode, 200);
    const whoami = JSON.parse(whoamiResponse.body);
    assert.equal(whoami.identityType, 'USER');
    assert.equal(whoami.credentialType, 'ACCESS_KEY');
    assert.equal(whoami.organizations[0].id, org.id);
    assert.equal(whoami.organizations[0].role, 'USER');

    const updateResponse = await ctx.fastify.inject({
      method: 'PUT',
      url: `/orgs/${org.id}/parameters/values/${value.id}`,
      headers: { authorization: `Bearer ${created.token}` },
      body: { value: 'debug' }
    });

    assert.equal(updateResponse.statusCode, 403);
  });

  test('whoami returns user session context for JWT auth', async () => {
    const org = await ctx.buildOrg();
    const user = await ctx.buildUserInOrg(org, { role: 'OWNER' });

    const response = await ctx.injectAuth({
      method: 'GET',
      url: '/auth/whoami'
    }, user);

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.equal(body.identityType, 'USER');
    assert.equal(body.credentialType, 'SUPABASE_JWT');
    assert.equal(body.organizations[0].id, org.id);
    assert.equal(body.organizations[0].role, 'OWNER');
  });
});
