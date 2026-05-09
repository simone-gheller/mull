import { test, describe, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert';
import { buildTestContext } from '../utils/builders.js';
import { decryptParameterValue, encryptedParameterValueData } from '../../src/crypto/envelope.js';

describe('Parameter Routes', () => {
  let ctx;

  beforeEach(async () => {
    ctx = await buildTestContext();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  describe('GET /orgs/:orgId/parameters', () => {
    test('should return all parameters for an app', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org);
      const app = await ctx.buildApp({ orgId: org.id });
      await ctx.buildParam({ appId: app.id, key: 'KEY_1' });
      await ctx.buildParam({ appId: app.id, key: 'KEY_2' });

      const dbParameters = await ctx.prisma.parameter.findMany({
        where: { appId: app.id },
        orderBy: { key: 'asc' }
      });

      const response = await ctx.injectAuth({
        method: 'GET',
        url: `/orgs/${org.id}/parameters?appId=${app.id}`
      }, user);

      assert.strictEqual(response.statusCode, 200);
      const apiParameters = JSON.parse(response.body);
      assert.strictEqual(apiParameters.length, dbParameters.length);
      for (let i = 0; i < dbParameters.length; i++) {
        assert.strictEqual(apiParameters[i].id, dbParameters[i].id);
        assert.strictEqual(apiParameters[i].appId, dbParameters[i].appId);
        assert.strictEqual(apiParameters[i].key, dbParameters[i].key);
      }
    });

    test('should return 400 when appId is missing', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org);

      const response = await ctx.injectAuth({
        method: 'GET',
        url: `/orgs/${org.id}/parameters`
      }, user);

      assert.strictEqual(response.statusCode, 400);
    });

    test('should return 404 when app does not exist', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org);

      const response = await ctx.injectAuth({
        method: 'GET',
        url: `/orgs/${org.id}/parameters?appId=01900000-0000-7000-8000-000000000000`
      }, user);

      assert.strictEqual(response.statusCode, 404);
      const error = JSON.parse(response.body);
      assert.ok(error.message.includes('not found'));
    });

    test('should return 403 when app does not belong to org', async () => {
      const org1 = await ctx.buildOrg();
      const org2 = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org1);
      const app = await ctx.buildApp({ orgId: org2.id });

      const response = await ctx.injectAuth({
        method: 'GET',
        url: `/orgs/${org1.id}/parameters?appId=${app.id}`
      }, user);

      assert.strictEqual(response.statusCode, 403);
      const error = JSON.parse(response.body);
      assert.ok(error.message.includes('does not belong'));
    });

    test('should return 401 without auth', async () => {
      const org = await ctx.buildOrg();

      const response = await ctx.fastify.inject({
        method: 'GET',
        url: `/orgs/${org.id}/parameters?appId=01900000-0000-7000-8000-000000000000`
      });

      assert.strictEqual(response.statusCode, 401);
    });
  });

  describe('GET /orgs/:orgId/parameters/resolved', () => {
    test('should resolve inherited definitions and fallback through unset overrides', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org);
      const rootApp = await ctx.buildApp({ orgId: org.id, name: 'Root' });
      const childApp = await ctx.buildApp({ orgId: org.id, parentId: rootApp.id, name: 'Child' });
      const env = await ctx.buildEnv({ orgId: org.id, name: 'dev' });
      const rootShared = await ctx.buildParam({ appId: rootApp.id, key: 'SHARED_KEY' });
      const rootOnly = await ctx.buildParam({ appId: rootApp.id, key: 'ROOT_ONLY' });
      const childShared = await ctx.buildParam({ appId: childApp.id, key: 'SHARED_KEY' });
      await ctx.buildParam({ appId: childApp.id, key: 'LOCAL_ONLY' });

      const setParamValue = async (parameterId, value) => {
        const parameterValue = await ctx.prisma.parameterValue.findFirst({
          where: { parameterId, environmentId: env.id }
        });
        await ctx.prisma.parameterValue.update({
          where: { id: parameterValue.id },
          data: {
            isSet: value !== '',
            ...encryptedParameterValueData({
              value,
              parameterValueId: parameterValue.id,
              parameterId,
              environmentId: env.id
            })
          }
        });
      };

      await setParamValue(rootShared.id, 'root-shared');
      await setParamValue(rootOnly.id, 'root-only');
      await setParamValue(childShared.id, '');

      const response = await ctx.injectAuth({
        method: 'GET',
        url: `/orgs/${org.id}/parameters/resolved?appId=${childApp.id}&environmentId=${env.id}`
      }, user);

      assert.strictEqual(response.statusCode, 200);
      const resolved = JSON.parse(response.body);
      assert.deepStrictEqual(resolved.summary, {
        total: 3,
        local: 1,
        inherited: 1,
        overrides: 1
      });

      const shared = resolved.items.find(item => item.key === 'SHARED_KEY');
      assert.strictEqual(shared.relationship, 'override');
      assert.strictEqual(shared.parameter.id, childShared.id);
      assert.strictEqual(shared.overridden.parameterId, rootShared.id);
      assert.strictEqual(shared.value.state, 'inherited');
      assert.strictEqual(shared.value.value, 'root-shared');
      assert.strictEqual(shared.value.sourceAppId, rootApp.id);

      const inherited = resolved.items.find(item => item.key === 'ROOT_ONLY');
      assert.strictEqual(inherited.relationship, 'inherited');
      assert.strictEqual(inherited.value.state, 'inherited');
      assert.strictEqual(inherited.value.value, 'root-only');

      const local = resolved.items.find(item => item.key === 'LOCAL_ONLY');
      assert.strictEqual(local.relationship, 'local');
      assert.strictEqual(local.value.state, 'unset');
      assert.strictEqual(local.value.value, null);
    });
  });

  describe('POST /orgs/:orgId/parameters', () => {
    test('should create parameter and sync values for all environments', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org);
      const app = await ctx.buildApp({ orgId: org.id });
      const env1 = await ctx.buildEnv({ orgId: org.id, name: 'env1' });
      const env2 = await ctx.buildEnv({ orgId: org.id, name: 'env2' });

      const response = await ctx.injectAuth({
        method: 'POST',
        url: `/orgs/${org.id}/parameters`,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ appId: app.id, key: 'TEST_KEY' })
      }, user);

      assert.strictEqual(response.statusCode, 201);
      const parameter = JSON.parse(response.body);
      assert.strictEqual(parameter.appId, app.id);
      assert.strictEqual(parameter.key, 'TEST_KEY');
      assert.ok(parameter.id);

      const values = await ctx.prisma.parameterValue.findMany({
        where: { parameterId: parameter.id }
      });
      assert.strictEqual(values.length, 2);
      values.forEach(v => {
        assert.strictEqual(v.isSet, false);
        assert.strictEqual(decryptParameterValue(v), '');
      });

      const envIds = new Set(values.map(v => v.environmentId));
      assert.ok(envIds.has(env1.id));
      assert.ok(envIds.has(env2.id));
    });

    test('should return 400 when appId is missing', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org);

      const response = await ctx.injectAuth({
        method: 'POST',
        url: `/orgs/${org.id}/parameters`,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key: 'test-key' })
      }, user);

      assert.strictEqual(response.statusCode, 400);
    });

    test('should return 400 when key is missing', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org);
      const app = await ctx.buildApp({ orgId: org.id });

      const response = await ctx.injectAuth({
        method: 'POST',
        url: `/orgs/${org.id}/parameters`,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ appId: app.id })
      }, user);

      assert.strictEqual(response.statusCode, 400);
    });

    test('should return 404 when app does not exist', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org);

      const response = await ctx.injectAuth({
        method: 'POST',
        url: `/orgs/${org.id}/parameters`,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ appId: '01900000-0000-7000-8000-000000000000', key: 'test-key' })
      }, user);

      assert.strictEqual(response.statusCode, 404);
      const error = JSON.parse(response.body);
      assert.ok(error.message.includes('not found'));
    });

    test('should return 403 when app does not belong to org', async () => {
      const org1 = await ctx.buildOrg();
      const org2 = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org1);
      const app = await ctx.buildApp({ orgId: org2.id });

      const response = await ctx.injectAuth({
        method: 'POST',
        url: `/orgs/${org1.id}/parameters`,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ appId: app.id, key: 'test-key' })
      }, user);

      assert.strictEqual(response.statusCode, 403);
      const error = JSON.parse(response.body);
      assert.ok(error.message.includes('does not belong'));
    });

    test('should return 409 when parameter key already exists in app', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org);
      const app = await ctx.buildApp({ orgId: org.id });
      await ctx.buildParam({ appId: app.id, key: 'DUPLICATE_KEY' });

      const response = await ctx.injectAuth({
        method: 'POST',
        url: `/orgs/${org.id}/parameters`,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ appId: app.id, key: 'DUPLICATE_KEY' })
      }, user);

      assert.strictEqual(response.statusCode, 409);
      const error = JSON.parse(response.body);
      assert.ok(error.message.includes('already exists'));
    });
  });
});
