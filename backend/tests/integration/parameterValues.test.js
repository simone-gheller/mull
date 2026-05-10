import { test, describe, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert';
import { buildTestContext } from '../utils/builders.js';
import { decryptParameterValue, encryptedParameterValueData } from '../../src/crypto/envelope.js';

describe('ParameterValue Routes', () => {
  let ctx;

  beforeEach(async () => {
    ctx = await buildTestContext();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  describe('GET /orgs/:orgId/parameters/:appId/values', () => {
    test('should return parameter values grouped by environment', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org);
      const app = await ctx.buildApp({ orgId: org.id });
      await ctx.buildEnv({ orgId: org.id, name: 'dev' });
      await ctx.buildEnv({ orgId: org.id, name: 'prod' });
      await ctx.buildParam({ appId: app.id, key: 'KEY_1' });
      await ctx.buildParam({ appId: app.id, key: 'KEY_2' });

      const response = await ctx.injectAuth({
        method: 'GET',
        url: `/orgs/${org.id}/parameters/${app.id}/values`
      }, user);

      assert.strictEqual(response.statusCode, 200);
      // Response is an object keyed by environment name
      const grouped = JSON.parse(response.body);
      assert.ok(grouped.dev, 'should have dev environment');
      assert.ok(grouped.prod, 'should have prod environment');

      // Each environment has 2 values (one per parameter)
      assert.strictEqual(grouped.dev.values.length, 2);
      assert.strictEqual(grouped.prod.values.length, 2);

      const devKeys = grouped.dev.values.map(v => v.parameterKey).sort();
      assert.deepStrictEqual(devKeys, ['KEY_1', 'KEY_2']);

      grouped.dev.values.forEach(v => {
        assert.strictEqual(v.isSet, false);
        assert.strictEqual(v.value, null);
      });
      grouped.prod.values.forEach(v => {
        assert.strictEqual(v.isSet, false);
        assert.strictEqual(v.value, null);
      });
    });

    test('should return 400 when appId is not a valid UUID', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org);

      const response = await ctx.injectAuth({
        method: 'GET',
        url: `/orgs/${org.id}/parameters/invalid-uuid/values`
      }, user);

      assert.strictEqual(response.statusCode, 400);
    });

    test('should return 404 when app does not exist', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org);

      const response = await ctx.injectAuth({
        method: 'GET',
        url: `/orgs/${org.id}/parameters/01900000-0000-7000-8000-000000000000/values`
      }, user);

      assert.strictEqual(response.statusCode, 404);
      const error = JSON.parse(response.body);
      assert.ok(error.message.includes('not found'));
    });

    test('should return 403 when app belongs to different org', async () => {
      const org1 = await ctx.buildOrg();
      const org2 = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org1);
      const app2 = await ctx.buildApp({ orgId: org2.id });

      const response = await ctx.injectAuth({
        method: 'GET',
        url: `/orgs/${org1.id}/parameters/${app2.id}/values`
      }, user);

      assert.strictEqual(response.statusCode, 403);
      const error = JSON.parse(response.body);
      assert.ok(error.message.includes('does not belong'));
    });
  });

  describe('GET /orgs/:orgId/parameters/values/:id', () => {
    test('should return a single parameter value with relations', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org);
      const app = await ctx.buildApp({ orgId: org.id });
      const env = await ctx.buildEnv({ orgId: org.id, name: 'dev' });
      const param = await ctx.buildParam({ appId: app.id, key: 'TEST_KEY' });

      const paramValue = await ctx.prisma.parameterValue.findFirst({
        where: { parameterId: param.id, environmentId: env.id }
      });

      const response = await ctx.injectAuth({
        method: 'GET',
        url: `/orgs/${org.id}/parameters/values/${paramValue.id}`
      }, user);

      assert.strictEqual(response.statusCode, 200);
      const apiValue = JSON.parse(response.body);
      assert.strictEqual(apiValue.id, paramValue.id);
      assert.strictEqual(apiValue.parameterId, param.id);
      assert.strictEqual(apiValue.environmentId, env.id);
      assert.strictEqual(apiValue.isSet, false);
      assert.strictEqual(apiValue.value, '');
      assert.ok(apiValue.parameter);
      assert.strictEqual(apiValue.parameter.key, 'TEST_KEY');
      assert.ok(apiValue.environment);
      assert.strictEqual(apiValue.environment.name, 'dev');
    });

    test('should return 404 when parameter value does not exist', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org);

      const response = await ctx.injectAuth({
        method: 'GET',
        url: `/orgs/${org.id}/parameters/values/01900000-0000-7000-8000-000000000000`
      }, user);

      assert.strictEqual(response.statusCode, 404);
      const error = JSON.parse(response.body);
      assert.ok(error.message.includes('not found'));
    });

    test('should return 400 when id is not a valid UUIDv7', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org);

      const response = await ctx.injectAuth({
        method: 'GET',
        url: `/orgs/${org.id}/parameters/values/not-a-uuid`
      }, user);

      assert.strictEqual(response.statusCode, 400);
    });

    test('should return 403 when parameter value belongs to different org', async () => {
      const org1 = await ctx.buildOrg();
      const org2 = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org1);
      const app2 = await ctx.buildApp({ orgId: org2.id });
      const env2 = await ctx.buildEnv({ orgId: org2.id, name: 'dev' });
      const param2 = await ctx.buildParam({ appId: app2.id, key: 'KEY' });

      const paramValue2 = await ctx.prisma.parameterValue.findFirst({
        where: { parameterId: param2.id, environmentId: env2.id }
      });

      const response = await ctx.injectAuth({
        method: 'GET',
        url: `/orgs/${org1.id}/parameters/values/${paramValue2.id}`
      }, user);

      assert.strictEqual(response.statusCode, 403);
      const error = JSON.parse(response.body);
      assert.ok(error.message.includes('does not belong'));
    });
  });

  describe('PUT /orgs/:orgId/parameters/values/:id', () => {
    test('should update parameter value successfully', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org, { role: 'ADMIN' });
      const app = await ctx.buildApp({ orgId: org.id });
      const env = await ctx.buildEnv({ orgId: org.id, name: 'dev' });
      const param = await ctx.buildParam({ appId: app.id, key: 'API_KEY' });

      const paramValue = await ctx.prisma.parameterValue.findFirst({
        where: { parameterId: param.id, environmentId: env.id }
      });

      const response = await ctx.injectAuth({
        method: 'PUT',
        url: `/orgs/${org.id}/parameters/values/${paramValue.id}`,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ value: 'secret-api-key-12345' })
      }, user);

      assert.strictEqual(response.statusCode, 200);
      const updatedValue = JSON.parse(response.body);
      assert.strictEqual(updatedValue.id, paramValue.id);
      assert.strictEqual(updatedValue.isSet, true);
      assert.strictEqual(updatedValue.value, 'secret-api-key-12345');

      const dbValue = await ctx.prisma.parameterValue.findUnique({ where: { id: paramValue.id } });
      assert.strictEqual(dbValue.isSet, true);
      assert.strictEqual(decryptParameterValue(dbValue), 'secret-api-key-12345');
    });

    test('should update parameter value to empty string', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org, { role: 'ADMIN' });
      const app = await ctx.buildApp({ orgId: org.id });
      const env = await ctx.buildEnv({ orgId: org.id, name: 'dev' });
      const param = await ctx.buildParam({ appId: app.id, key: 'KEY' });

      const paramValue = await ctx.prisma.parameterValue.findFirst({
        where: { parameterId: param.id, environmentId: env.id }
      });

      await ctx.prisma.parameterValue.update({
        where: { id: paramValue.id },
        data: {
          isSet: true,
          ...encryptedParameterValueData({
            value: 'some-value',
            parameterValueId: paramValue.id,
            parameterId: paramValue.parameterId,
            environmentId: paramValue.environmentId
          })
        }
      });

      const response = await ctx.injectAuth({
        method: 'PUT',
        url: `/orgs/${org.id}/parameters/values/${paramValue.id}`,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ value: '' })
      }, user);

      assert.strictEqual(response.statusCode, 200);
      const updatedValue = JSON.parse(response.body);
      assert.strictEqual(updatedValue.isSet, false);
      assert.strictEqual(updatedValue.value, '');

      const dbValue = await ctx.prisma.parameterValue.findUnique({ where: { id: paramValue.id } });
      assert.strictEqual(dbValue.isSet, false);
      assert.strictEqual(decryptParameterValue(dbValue), '');
    });

    test('should return 400 when value is missing from body', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org, { role: 'ADMIN' });
      const app = await ctx.buildApp({ orgId: org.id });
      const env = await ctx.buildEnv({ orgId: org.id, name: 'dev' });
      const param = await ctx.buildParam({ appId: app.id, key: 'KEY' });

      const paramValue = await ctx.prisma.parameterValue.findFirst({
        where: { parameterId: param.id, environmentId: env.id }
      });

      const response = await ctx.injectAuth({
        method: 'PUT',
        url: `/orgs/${org.id}/parameters/values/${paramValue.id}`,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({})
      }, user);

      assert.strictEqual(response.statusCode, 400);
    });

    test('should return 404 when parameter value does not exist', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org, { role: 'ADMIN' });

      const response = await ctx.injectAuth({
        method: 'PUT',
        url: `/orgs/${org.id}/parameters/values/01900000-0000-7000-8000-000000000000`,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ value: 'test-value' })
      }, user);

      assert.strictEqual(response.statusCode, 404);
      const error = JSON.parse(response.body);
      assert.ok(error.message.includes('not found'));
    });

    test('should return 403 when parameter value belongs to different org', async () => {
      const org1 = await ctx.buildOrg();
      const org2 = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org1, { role: 'ADMIN' });
      const app2 = await ctx.buildApp({ orgId: org2.id });
      const env2 = await ctx.buildEnv({ orgId: org2.id, name: 'dev' });
      const param2 = await ctx.buildParam({ appId: app2.id, key: 'KEY' });

      const paramValue2 = await ctx.prisma.parameterValue.findFirst({
        where: { parameterId: param2.id, environmentId: env2.id }
      });

      const response = await ctx.injectAuth({
        method: 'PUT',
        url: `/orgs/${org1.id}/parameters/values/${paramValue2.id}`,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ value: 'test-value' })
      }, user);

      assert.strictEqual(response.statusCode, 403);
      const error = JSON.parse(response.body);
      assert.ok(error.message.includes('does not belong'));
    });

    test('should forbid USER members from updating non-secret values', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org, { role: 'USER' });
      const app = await ctx.buildApp({ orgId: org.id });
      const env = await ctx.buildEnv({ orgId: org.id, name: 'dev' });
      const param = await ctx.buildParam({ appId: app.id, key: 'PUBLIC_KEY' });

      const paramValue = await ctx.prisma.parameterValue.findFirst({
        where: { parameterId: param.id, environmentId: env.id }
      });

      const response = await ctx.injectAuth({
        method: 'PUT',
        url: `/orgs/${org.id}/parameters/values/${paramValue.id}`,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ value: 'user-written-value' })
      }, user);

      assert.strictEqual(response.statusCode, 403);
      const dbValue = await ctx.prisma.parameterValue.findUnique({ where: { id: paramValue.id } });
      assert.strictEqual(dbValue.isSet, false);
      assert.strictEqual(decryptParameterValue(dbValue), '');
    });
  });
});
