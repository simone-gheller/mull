import { test, describe, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert';
import { buildTestContext } from '../utils/builders.js';

describe('Parameter Routes', () => {
  let ctx;

  beforeEach(async () => {
    ctx = await buildTestContext();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  describe('GET /parameters', () => {
    test('should return all parameters for an app matching database', async () => {
      // Arrange
      const org = await ctx.buildOrg();
      const app = await ctx.buildApp({ orgId: org.id });
      await ctx.buildParam({ appId: app.id, key: 'KEY_1' });
      await ctx.buildParam({ appId: app.id, key: 'KEY_2' });

      // Query database directly
      const dbParameters = await ctx.prisma.parameter.findMany({
        where: { appId: app.id },
        orderBy: { key: 'asc' }
      });

      // Act
      const response = await ctx.fastify.inject({
        method: 'GET',
        url: `/parameters?appId=${app.id}`,
        headers: { 'x-org-id': org.id }
      });

      // Assert
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
      // Arrange
      const org = await ctx.buildOrg();

      // Act
      const response = await ctx.fastify.inject({
        method: 'GET',
        url: '/parameters',
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
        url: '/parameters?appId=01900000-0000-7000-8000-000000000000',
        headers: { 'x-org-id': org.id }
      });

      // Assert
      assert.strictEqual(response.statusCode, 404);
      const error = JSON.parse(response.body);
      assert.ok(error.message.includes('not found'));
    });

    test('should return 403 when app does not belong to org', async () => {
      // Arrange
      const org1 = await ctx.buildOrg();
      const org2 = await ctx.buildOrg();
      const app = await ctx.buildApp({ orgId: org2.id });

      // Act
      const response = await ctx.fastify.inject({
        method: 'GET',
        url: `/parameters?appId=${app.id}`,
        headers: { 'x-org-id': org1.id }
      });

      // Assert
      assert.strictEqual(response.statusCode, 403);
      const error = JSON.parse(response.body);
      assert.ok(error.message.includes('does not belong'));
    });
  });

  describe('POST /parameters', () => {
    test('should create parameter and sync values for all environments', async () => {
      // Arrange
      const org = await ctx.buildOrg();
      const app = await ctx.buildApp({ orgId: org.id });

      // Create 2 environments BEFORE creating parameter
      const env1 = await ctx.buildEnv({ orgId: org.id, name: 'env1' });
      const env2 = await ctx.buildEnv({ orgId: org.id, name: 'env2' });

      // Act: Create parameter via API (should trigger sync)
      const response = await ctx.fastify.inject({
        method: 'POST',
        url: '/parameters',
        headers: {
          'x-org-id': org.id,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          appId: app.id,
          key: 'TEST_KEY'
        })
      });

      // Assert
      assert.strictEqual(response.statusCode, 201);
      const parameter = JSON.parse(response.body);
      assert.strictEqual(parameter.appId, app.id);
      assert.strictEqual(parameter.key, 'TEST_KEY');
      assert.ok(parameter.id);

      // Verify ParameterValues exist for both environments
      const values = await ctx.prisma.parameterValue.findMany({
        where: { parameterId: parameter.id }
      });
      assert.strictEqual(values.length, 2);
      values.forEach(v => assert.strictEqual(v.value, ''));

      // Verify each environment has a value
      const envIds = new Set(values.map(v => v.environmentId));
      assert.ok(envIds.has(env1.id));
      assert.ok(envIds.has(env2.id));
    });

    test('should return 400 when appId is missing', async () => {
      // Arrange
      const org = await ctx.buildOrg();

      // Act
      const response = await ctx.fastify.inject({
        method: 'POST',
        url: '/parameters',
        headers: {
          'x-org-id': org.id,
          'content-type': 'application/json'
        },
        body: JSON.stringify({ key: 'test-key' })
      });

      // Assert
      assert.strictEqual(response.statusCode, 400);
    });

    test('should return 400 when key is missing', async () => {
      // Arrange
      const org = await ctx.buildOrg();
      const app = await ctx.buildApp({ orgId: org.id });

      // Act
      const response = await ctx.fastify.inject({
        method: 'POST',
        url: '/parameters',
        headers: {
          'x-org-id': org.id,
          'content-type': 'application/json'
        },
        body: JSON.stringify({ appId: app.id })
      });

      // Assert
      assert.strictEqual(response.statusCode, 400);
    });

    test('should return 404 when app does not exist', async () => {
      // Arrange
      const org = await ctx.buildOrg();

      // Act
      const response = await ctx.fastify.inject({
        method: 'POST',
        url: '/parameters',
        headers: {
          'x-org-id': org.id,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          appId: '01900000-0000-7000-8000-000000000000',
          key: 'test-key'
        })
      });

      // Assert
      assert.strictEqual(response.statusCode, 404);
      const error = JSON.parse(response.body);
      assert.ok(error.message.includes('not found'));
    });

    test('should return 403 when app does not belong to org', async () => {
      // Arrange
      const org1 = await ctx.buildOrg();
      const org2 = await ctx.buildOrg();
      const app = await ctx.buildApp({ orgId: org2.id });

      // Act
      const response = await ctx.fastify.inject({
        method: 'POST',
        url: '/parameters',
        headers: {
          'x-org-id': org1.id,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          appId: app.id,
          key: 'test-key'
        })
      });

      // Assert
      assert.strictEqual(response.statusCode, 403);
      const error = JSON.parse(response.body);
      assert.ok(error.message.includes('does not belong'));
    });

    test('should return 409 when parameter key already exists in app', async () => {
      // Arrange
      const org = await ctx.buildOrg();
      const app = await ctx.buildApp({ orgId: org.id });
      await ctx.buildParam({ appId: app.id, key: 'DUPLICATE_KEY' });

      // Act
      const response = await ctx.fastify.inject({
        method: 'POST',
        url: '/parameters',
        headers: {
          'x-org-id': org.id,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          appId: app.id,
          key: 'DUPLICATE_KEY'
        })
      });

      // Assert
      assert.strictEqual(response.statusCode, 409);
      const error = JSON.parse(response.body);
      assert.strictEqual(error.statusCode, 409);
      assert.ok(error.message.includes('already exists'));
    });
  });
});
