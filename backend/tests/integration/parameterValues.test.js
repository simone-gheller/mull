import { test, describe, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert';
import { buildTestContext } from '../utils/builders.js';

describe('ParameterValue Routes', () => {
  let ctx;

  beforeEach(async () => {
    ctx = await buildTestContext();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  describe('GET /parameters/values', () => {
    test('should return all parameter values for an app across all environments', async () => {
      // Arrange
      const org = await ctx.buildOrg();
      const app = await ctx.buildApp({ orgId: org.id });
      await ctx.buildEnv({ orgId: org.id, name: 'dev' });
      await ctx.buildEnv({ orgId: org.id, name: 'prod' });
      await ctx.buildParam({ appId: app.id, key: 'KEY_1' });
      await ctx.buildParam({ appId: app.id, key: 'KEY_2' });

      // Act
      const response = await ctx.fastify.inject({
        method: 'GET',
        url: `/parameters/${app.id}/values`,
        headers: { 'x-org-id': org.id }
      });

      // Assert
      assert.strictEqual(response.statusCode, 200);
      const apiValues = JSON.parse(response.body);

      // Should have 2 parameters × 2 environments = 4 values
      assert.strictEqual(apiValues.length, 4);

      // Verify first parameter has values for both environments
      const key1Values = apiValues.filter(v => v.parameter.key === 'KEY_1');
      assert.strictEqual(key1Values.length, 2);
      assert.ok(key1Values.some(v => v.environment.name === 'dev'));
      assert.ok(key1Values.some(v => v.environment.name === 'prod'));

      // Verify second parameter has values for both environments
      const key2Values = apiValues.filter(v => v.parameter.key === 'KEY_2');
      assert.strictEqual(key2Values.length, 2);
      assert.ok(key2Values.some(v => v.environment.name === 'dev'));
      assert.ok(key2Values.some(v => v.environment.name === 'prod'));

      // Verify all values include environment data
      apiValues.forEach(v => {
        assert.ok(v.environment);
        assert.ok(v.environment.name);
        assert.strictEqual(v.value, '');
      });
    });

    test('should return 404 when appId is invalid UUID', async () => {
      // Arrange
      const org = await ctx.buildOrg();

      // Act
      const response = await ctx.fastify.inject({
        method: 'GET',
        url: '/parameters/invalid-uuid/values',
        headers: { 'x-org-id': org.id }
      });

      // Assert
      assert.strictEqual(response.statusCode, 400);
    });

    test('should return 404 when app does not exist', async () => {
      // Arrange
      const org = await ctx.buildOrg();

      // Act
      const response = await ctx.fastify.inject({
        method: 'GET',
        url: '/parameters/01900000-0000-7000-8000-000000000000/values',
        headers: { 'x-org-id': org.id }
      });

      // Assert
      assert.strictEqual(response.statusCode, 404);
      const error = JSON.parse(response.body);
      assert.ok(error.message.includes('not found'));
    });

    test('should return 403 when app belongs to different org', async () => {
      // Arrange
      const org1 = await ctx.buildOrg();
      const org2 = await ctx.buildOrg();
      const app2 = await ctx.buildApp({ orgId: org2.id });

      // Act
      const response = await ctx.fastify.inject({
        method: 'GET',
        url: `/parameters/${app2.id}/values`,
        headers: { 'x-org-id': org1.id }
      });

      // Assert
      assert.strictEqual(response.statusCode, 403);
      const error = JSON.parse(response.body);
      assert.ok(error.message.includes('does not belong'));
    });
  });

  describe('GET /parameters/values/:id', () => {
    test('should return a single parameter value with relations', async () => {
      // Arrange
      const org = await ctx.buildOrg();
      const app = await ctx.buildApp({ orgId: org.id });
      const env = await ctx.buildEnv({ orgId: org.id, name: 'dev' });
      const param = await ctx.buildParam({ appId: app.id, key: 'TEST_KEY' });

      // Get the auto-created parameter value
      const paramValue = await ctx.prisma.parameterValue.findFirst({
        where: {
          parameterId: param.id,
          environmentId: env.id
        }
      });

      // Act
      const response = await ctx.fastify.inject({
        method: 'GET',
        url: `/parameters/values/${paramValue.id}`,
        headers: { 'x-org-id': org.id }
      });

      // Assert
      assert.strictEqual(response.statusCode, 200);
      const apiValue = JSON.parse(response.body);
      assert.strictEqual(apiValue.id, paramValue.id);
      assert.strictEqual(apiValue.parameterId, param.id);
      assert.strictEqual(apiValue.environmentId, env.id);
      assert.strictEqual(apiValue.value, '');

      // Check relations
      assert.ok(apiValue.parameter);
      assert.strictEqual(apiValue.parameter.key, 'TEST_KEY');
      assert.ok(apiValue.environment);
      assert.strictEqual(apiValue.environment.name, 'dev');
    });

    test('should return 404 when parameter value does not exist', async () => {
      // Arrange
      const org = await ctx.buildOrg();

      // Act
      const response = await ctx.fastify.inject({
        method: 'GET',
        url: '/parameters/values/01900000-0000-7000-8000-000000000000',
        headers: { 'x-org-id': org.id }
      });

      // Assert
      assert.strictEqual(response.statusCode, 404);
      const error = JSON.parse(response.body);
      assert.ok(error.message.includes('not found'));
    });

    test('should return 403 when parameter value belongs to different org', async () => {
      // Arrange
      const org1 = await ctx.buildOrg();
      const org2 = await ctx.buildOrg();
      const app2 = await ctx.buildApp({ orgId: org2.id });
      const env2 = await ctx.buildEnv({ orgId: org2.id, name: 'dev' });
      const param2 = await ctx.buildParam({ appId: app2.id, key: 'KEY' });

      const paramValue2 = await ctx.prisma.parameterValue.findFirst({
        where: {
          parameterId: param2.id,
          environmentId: env2.id
        }
      });

      // Act
      const response = await ctx.fastify.inject({
        method: 'GET',
        url: `/parameters/values/${paramValue2.id}`,
        headers: { 'x-org-id': org1.id }
      });

      // Assert
      assert.strictEqual(response.statusCode, 403);
      const error = JSON.parse(response.body);
      assert.ok(error.message.includes('does not belong'));
    });
  });

  describe('PUT /parameters/values/:id', () => {
    test('should update parameter value successfully', async () => {
      // Arrange
      const org = await ctx.buildOrg();
      const app = await ctx.buildApp({ orgId: org.id });
      const env = await ctx.buildEnv({ orgId: org.id, name: 'dev' });
      const param = await ctx.buildParam({ appId: app.id, key: 'API_KEY' });

      const paramValue = await ctx.prisma.parameterValue.findFirst({
        where: {
          parameterId: param.id,
          environmentId: env.id
        }
      });

      // Act
      const response = await ctx.fastify.inject({
        method: 'PUT',
        url: `/parameters/values/${paramValue.id}`,
        headers: {
          'x-org-id': org.id,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          value: 'secret-api-key-12345'
        })
      });

      // Assert
      assert.strictEqual(response.statusCode, 200);
      const updatedValue = JSON.parse(response.body);
      assert.strictEqual(updatedValue.id, paramValue.id);
      assert.strictEqual(updatedValue.value, 'secret-api-key-12345');

      // Verify in database
      const dbValue = await ctx.prisma.parameterValue.findUnique({
        where: { id: paramValue.id }
      });
      assert.strictEqual(dbValue.value, 'secret-api-key-12345');
    });

    test('should update parameter value to empty string', async () => {
      // Arrange
      const org = await ctx.buildOrg();
      const app = await ctx.buildApp({ orgId: org.id });
      const env = await ctx.buildEnv({ orgId: org.id, name: 'dev' });
      const param = await ctx.buildParam({ appId: app.id, key: 'KEY' });

      const paramValue = await ctx.prisma.parameterValue.findFirst({
        where: {
          parameterId: param.id,
          environmentId: env.id
        }
      });

      // Update to a non-empty value first
      await ctx.prisma.parameterValue.update({
        where: { id: paramValue.id },
        data: { value: 'some-value' }
      });

      // Act - Update to empty string
      const response = await ctx.fastify.inject({
        method: 'PUT',
        url: `/parameters/values/${paramValue.id}`,
        headers: {
          'x-org-id': org.id,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          value: ''
        })
      });

      // Assert
      assert.strictEqual(response.statusCode, 200);
      const updatedValue = JSON.parse(response.body);
      assert.strictEqual(updatedValue.value, '');
    });

    test('should return 400 when value is missing', async () => {
      // Arrange
      const org = await ctx.buildOrg();
      const app = await ctx.buildApp({ orgId: org.id });
      const env = await ctx.buildEnv({ orgId: org.id, name: 'dev' });
      const param = await ctx.buildParam({ appId: app.id, key: 'KEY' });

      const paramValue = await ctx.prisma.parameterValue.findFirst({
        where: {
          parameterId: param.id,
          environmentId: env.id
        }
      });

      // Act
      const response = await ctx.fastify.inject({
        method: 'PUT',
        url: `/parameters/values/${paramValue.id}`,
        headers: {
          'x-org-id': org.id,
          'content-type': 'application/json'
        },
        body: JSON.stringify({})
      });

      // Assert
      assert.strictEqual(response.statusCode, 400);
    });

    test('should return 404 when parameter value does not exist', async () => {
      // Arrange
      const org = await ctx.buildOrg();

      // Act
      const response = await ctx.fastify.inject({
        method: 'PUT',
        url: '/parameters/values/01900000-0000-7000-8000-000000000000',
        headers: {
          'x-org-id': org.id,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          value: 'test-value'
        })
      });

      // Assert
      assert.strictEqual(response.statusCode, 404);
      const error = JSON.parse(response.body);
      assert.ok(error.message.includes('not found'));
    });

    test('should return 403 when parameter value belongs to different org', async () => {
      // Arrange
      const org1 = await ctx.buildOrg();
      const org2 = await ctx.buildOrg();
      const app2 = await ctx.buildApp({ orgId: org2.id });
      const env2 = await ctx.buildEnv({ orgId: org2.id, name: 'dev' });
      const param2 = await ctx.buildParam({ appId: app2.id, key: 'KEY' });

      const paramValue2 = await ctx.prisma.parameterValue.findFirst({
        where: {
          parameterId: param2.id,
          environmentId: env2.id
        }
      });

      // Act
      const response = await ctx.fastify.inject({
        method: 'PUT',
        url: `/parameters/values/${paramValue2.id}`,
        headers: {
          'x-org-id': org1.id,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          value: 'test-value'
        })
      });

      // Assert
      assert.strictEqual(response.statusCode, 403);
      const error = JSON.parse(response.body);
      assert.ok(error.message.includes('does not belong'));
    });
  });
});
