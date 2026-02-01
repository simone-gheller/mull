import { test, describe, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert';
import { buildTestContext } from '../utils/builders.js';

describe('Environment Routes', () => {
  let ctx;

  beforeEach(async () => {
    ctx = await buildTestContext();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  describe('GET /environments', () => {
    test('should return all environments for an orgId matching database', async () => {
      // Arrange
      const org = await ctx.buildOrg();
      await ctx.buildEnv({ orgId: org.id, name: 'dev' });
      await ctx.buildEnv({ orgId: org.id, name: 'prod' });

      // Query database directly
      const dbEnvironments = await ctx.prisma.environment.findMany({
        where: { orgId: org.id },
        orderBy: { name: 'asc' }
      });

      // Act
      const response = await ctx.fastify.inject({
        method: 'GET',
        url: '/environments',
        headers: { 'x-org-id': org.id }
      });

      // Assert
      assert.strictEqual(response.statusCode, 200);
      const apiEnvironments = JSON.parse(response.body);
      assert.strictEqual(apiEnvironments.length, dbEnvironments.length);

      for (let i = 0; i < dbEnvironments.length; i++) {
        assert.strictEqual(apiEnvironments[i].id, dbEnvironments[i].id);
        assert.strictEqual(apiEnvironments[i].name, dbEnvironments[i].name);
        assert.strictEqual(apiEnvironments[i].orgId, org.id);
      }
    });

    test('should return 400 when orgId is missing', async () => {
      // Act
      const response = await ctx.fastify.inject({
        method: 'GET',
        url: '/environments'
      });

      // Assert
      assert.strictEqual(response.statusCode, 400);
      const error = JSON.parse(response.body);
      assert.strictEqual(error.statusCode, 400);
      assert.ok(error.message.includes('orgId required'));
    });

    test('should return empty array for org with no environments', async () => {
      // Arrange
      const org = await ctx.buildOrg();

      // Act
      const response = await ctx.fastify.inject({
        method: 'GET',
        url: '/environments',
        headers: { 'x-org-id': org.id }
      });

      // Assert
      assert.strictEqual(response.statusCode, 200);
      const environments = JSON.parse(response.body);
      assert.strictEqual(environments.length, 0);
    });
  });

  describe('POST /environments', () => {
    test('should create new environment successfully', async () => {
      // Arrange
      const org = await ctx.buildOrg();

      // Act
      const response = await ctx.fastify.inject({
        method: 'POST',
        url: '/environments',
        headers: {
          'x-org-id': org.id,
          'content-type': 'application/json'
        },
        body: JSON.stringify({ name: 'test-environment' })
      });

      // Assert
      assert.strictEqual(response.statusCode, 201);
      const environment = JSON.parse(response.body);
      assert.strictEqual(environment.name, 'test-environment');
      assert.strictEqual(environment.orgId, org.id);
      assert.ok(environment.id);
    });

    test('should auto-create parameter values for existing parameters when creating environment', async () => {
      // Arrange
      const org = await ctx.buildOrg();
      const app = await ctx.buildApp({ orgId: org.id });

      // Create 2 parameters BEFORE creating environment
      const param1 = await ctx.buildParam({ appId: app.id });
      const param2 = await ctx.buildParam({ appId: app.id });

      // Act: Create environment via API (should trigger sync)
      const response = await ctx.fastify.inject({
        method: 'POST',
        url: '/environments',
        headers: {
          'x-org-id': org.id,
          'content-type': 'application/json'
        },
        body: JSON.stringify({ name: 'test-sync-env' })
      });

      assert.strictEqual(response.statusCode, 201);
      const environment = JSON.parse(response.body);

      // Assert: Verify ParameterValues were created
      const values = await ctx.prisma.parameterValue.findMany({
        where: { environmentId: environment.id }
      });
      assert.strictEqual(values.length, 2);
      values.forEach(v => assert.strictEqual(v.value, ''));
    });

    test('should return 400 when name is missing', async () => {
      // Arrange
      const org = await ctx.buildOrg();

      // Act
      const response = await ctx.fastify.inject({
        method: 'POST',
        url: '/environments',
        headers: {
          'x-org-id': org.id,
          'content-type': 'application/json'
        },
        body: JSON.stringify({})
      });

      // Assert
      assert.strictEqual(response.statusCode, 400);
    });

    test('should return 400 when orgId is missing', async () => {
      // Act
      const response = await ctx.fastify.inject({
        method: 'POST',
        url: '/environments',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'test-env' })
      });

      // Assert
      assert.strictEqual(response.statusCode, 400);
      const error = JSON.parse(response.body);
      assert.ok(error.message.includes('orgId required'));
    });

    test('should return 409 when environment name already exists in org', async () => {
      // Arrange
      const org = await ctx.buildOrg();
      await ctx.buildEnv({ orgId: org.id, name: 'duplicate-env' });

      // Act
      const response = await ctx.fastify.inject({
        method: 'POST',
        url: '/environments',
        headers: {
          'x-org-id': org.id,
          'content-type': 'application/json'
        },
        body: JSON.stringify({ name: 'duplicate-env' })
      });

      // Assert
      assert.strictEqual(response.statusCode, 409);
      const error = JSON.parse(response.body);
      assert.strictEqual(error.statusCode, 409);
      assert.ok(error.message.includes('already exists'));
    });

    test('should trim whitespace from environment name', async () => {
      // Arrange
      const org = await ctx.buildOrg();

      // Act
      const response = await ctx.fastify.inject({
        method: 'POST',
        url: '/environments',
        headers: {
          'x-org-id': org.id,
          'content-type': 'application/json'
        },
        body: JSON.stringify({ name: '  whitespace-test  ' })
      });

      // Assert
      assert.strictEqual(response.statusCode, 201);
      const environment = JSON.parse(response.body);
      assert.strictEqual(environment.name, 'whitespace-test');
    });
  });
});
