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

    test('should allow DEVELOPER members to update non-protected values', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org, { role: 'DEVELOPER' });
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

      assert.strictEqual(response.statusCode, 200);
      const dbValue = await ctx.prisma.parameterValue.findUnique({ where: { id: paramValue.id } });
      assert.strictEqual(dbValue.isSet, true);
      assert.strictEqual(decryptParameterValue(dbValue), 'user-written-value');
    });
  });

  describe('Parameter value history and rollback', () => {
    test('should snapshot previous values, reveal history, and rollback as a new version', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org, { role: 'ADMIN' });
      const app = await ctx.buildApp({ orgId: org.id });
      const env = await ctx.buildEnv({ orgId: org.id, name: 'prod' });
      const param = await ctx.buildParam({ appId: app.id, key: 'DATABASE_URL' });
      const paramValue = await ctx.prisma.parameterValue.findFirst({
        where: { parameterId: param.id, environmentId: env.id }
      });

      await ctx.injectAuth({
        method: 'PUT',
        url: `/orgs/${org.id}/parameters/values/${paramValue.id}`,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ value: 'postgres://first' })
      }, user);
      await ctx.injectAuth({
        method: 'PUT',
        url: `/orgs/${org.id}/parameters/values/${paramValue.id}`,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ value: 'postgres://second' })
      }, user);

      const historyResponse = await ctx.injectAuth({
        method: 'GET',
        url: `/orgs/${org.id}/parameters/values/${paramValue.id}/history`
      }, user);

      assert.strictEqual(historyResponse.statusCode, 200);
      const history = JSON.parse(historyResponse.body).items;
      assert.strictEqual(history.length, 2);
      assert.strictEqual(history[0].versionNumber, 2);
      assert.strictEqual(history[0].parameterId, param.id);
      assert.strictEqual(history[0].environmentId, env.id);
      assert.strictEqual(history[0].changeType, 'UPDATE');
      assert.strictEqual(history[0].isSet, true);
      assert.ok(!Object.hasOwn(history[0], 'value'));

      const revealResponse = await ctx.injectAuth({
        method: 'GET',
        url: `/orgs/${org.id}/parameters/values/${paramValue.id}/history/${history[0].id}`
      }, user);

      assert.strictEqual(revealResponse.statusCode, 200);
      assert.strictEqual(JSON.parse(revealResponse.body).value, 'postgres://first');

      const rollbackResponse = await ctx.injectAuth({
        method: 'POST',
        url: `/orgs/${org.id}/parameters/values/${paramValue.id}/rollback`,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ versionId: history[0].id })
      }, user);

      assert.strictEqual(rollbackResponse.statusCode, 200);
      const rolledBack = JSON.parse(rollbackResponse.body);
      assert.strictEqual(rolledBack.isSet, true);
      assert.strictEqual(rolledBack.value, 'postgres://first');

      const rollbackHistory = await ctx.prisma.parameterValueVersion.findFirst({
        where: { parameterValueId: paramValue.id, changeType: 'ROLLBACK' }
      });
      assert.ok(rollbackHistory);
      assert.strictEqual(rollbackHistory.rolledBackFromVersionId, history[0].id);
    });

    test('should snapshot clear operations and keep newest five versions on Free', async () => {
      const org = await ctx.buildOrg({ plan: 'FREE' });
      const user = await ctx.buildUserInOrg(org, { role: 'ADMIN' });
      const app = await ctx.buildApp({ orgId: org.id });
      const env = await ctx.buildEnv({ orgId: org.id, name: 'dev' });
      const param = await ctx.buildParam({ appId: app.id, key: 'FEATURE_FLAG' });
      const paramValue = await ctx.prisma.parameterValue.findFirst({
        where: { parameterId: param.id, environmentId: env.id }
      });

      for (let i = 1; i <= 7; i++) {
        await ctx.injectAuth({
          method: 'PUT',
          url: `/orgs/${org.id}/parameters/values/${paramValue.id}`,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ value: `value-${i}` })
        }, user);
      }
      await ctx.injectAuth({
        method: 'PUT',
        url: `/orgs/${org.id}/parameters/values/${paramValue.id}`,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ value: '' })
      }, user);

      const history = await ctx.prisma.parameterValueVersion.findMany({
        where: { parameterValueId: paramValue.id },
        orderBy: { versionNumber: 'asc' }
      });

      assert.strictEqual(history.length, 5);
      assert.deepStrictEqual(history.map(v => v.versionNumber), [4, 5, 6, 7, 8]);
      assert.strictEqual(history[4].changeType, 'CLEAR');
      assert.strictEqual(history[4].isSet, true);
    });

    test('should keep more than Free history on Team and not prune Enterprise', async () => {
      const proOrg = await ctx.buildOrg({ plan: 'TEAM' });
      const enterpriseOrg = await ctx.buildOrg({ plan: 'ENTERPRISE' });
      const proUser = await ctx.buildUserInOrg(proOrg, { role: 'ADMIN' });
      const enterpriseUser = await ctx.buildUserInOrg(enterpriseOrg, { role: 'ADMIN' });

      async function buildValue(org) {
        const app = await ctx.buildApp({ orgId: org.id });
        const env = await ctx.buildEnv({ orgId: org.id, name: `env-${org.plan}` });
        const param = await ctx.buildParam({ appId: app.id, key: `KEY_${org.plan}` });
        return ctx.prisma.parameterValue.findFirst({
          where: { parameterId: param.id, environmentId: env.id }
        });
      }

      const proValue = await buildValue(proOrg);
      const enterpriseValue = await buildValue(enterpriseOrg);

      for (let i = 1; i <= 7; i++) {
        await ctx.injectAuth({
          method: 'PUT',
          url: `/orgs/${proOrg.id}/parameters/values/${proValue.id}`,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ value: `pro-${i}` })
        }, proUser);
        await ctx.injectAuth({
          method: 'PUT',
          url: `/orgs/${enterpriseOrg.id}/parameters/values/${enterpriseValue.id}`,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ value: `enterprise-${i}` })
        }, enterpriseUser);
      }

      const proCount = await ctx.prisma.parameterValueVersion.count({
        where: { parameterValueId: proValue.id }
      });
      const enterpriseCount = await ctx.prisma.parameterValueVersion.count({
        where: { parameterValueId: enterpriseValue.id }
      });

      assert.strictEqual(proCount, 7);
      assert.strictEqual(enterpriseCount, 7);
    });

    test('should prevent cross-org history access and DEVELOPER protected reveal', async () => {
      const org1 = await ctx.buildOrg();
      const org2 = await ctx.buildOrg();
      const admin = await ctx.buildUserInOrg(org1, { role: 'ADMIN' });
      const user = await ctx.buildUserInOrg(org1, { role: 'DEVELOPER' });
      const app1 = await ctx.buildApp({ orgId: org1.id });
      const app2 = await ctx.buildApp({ orgId: org2.id });
      const env1 = await ctx.buildEnv({ orgId: org1.id, name: 'prod', tier: 'PRODUCTION', protected: true });
      const env2 = await ctx.buildEnv({ orgId: org2.id, name: 'prod' });
      const param1 = await ctx.buildParam({ appId: app1.id, key: 'SECRET_KEY' });
      const param2 = await ctx.buildParam({ appId: app2.id, key: 'OTHER_KEY' });

      const value1 = await ctx.prisma.parameterValue.findFirst({
        where: { parameterId: param1.id, environmentId: env1.id }
      });
      const value2 = await ctx.prisma.parameterValue.findFirst({
        where: { parameterId: param2.id, environmentId: env2.id }
      });

      await ctx.injectAuth({
        method: 'PUT',
        url: `/orgs/${org1.id}/parameters/values/${value1.id}`,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ value: 'secret-v1' })
      }, admin);

      const history = await ctx.prisma.parameterValueVersion.findFirst({
        where: { parameterValueId: value1.id }
      });

      const crossOrgResponse = await ctx.injectAuth({
        method: 'GET',
        url: `/orgs/${org1.id}/parameters/values/${value2.id}/history`
      }, admin);
      assert.strictEqual(crossOrgResponse.statusCode, 403);

      const revealResponse = await ctx.injectAuth({
        method: 'GET',
        url: `/orgs/${org1.id}/parameters/values/${value1.id}/history/${history.id}`
      }, user);
      assert.strictEqual(revealResponse.statusCode, 403);
    });
  });
});
