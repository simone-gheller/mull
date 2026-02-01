import { test, describe, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert';
import { buildTestContext } from '../utils/builders.js';

describe('App Routes', () => {
  let ctx;

  beforeEach(async () => {
    ctx = await buildTestContext();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  describe('GET /apps', () => {
    test('should return list of apps for valid orgId', async () => {
      // Arrange
      const org = await ctx.buildOrg();
      const app = await ctx.buildApp({ orgId: org.id });

      // Act
      const response = await ctx.fastify.inject({
        method: 'GET',
        url: '/apps',
        headers: { 'x-org-id': org.id }
      });

      // Assert
      assert.strictEqual(response.statusCode, 200);
      const apps = JSON.parse(response.body);
      assert.ok(Array.isArray(apps));
      assert.strictEqual(apps.length, 1);

      const appItem = apps[0];
      assert.strictEqual(appItem.id, app.id);
      assert.strictEqual(appItem.orgId, org.id);
      assert.strictEqual(appItem.name, app.name);
      assert.ok(Array.isArray(appItem.ancestors));
      assert.strictEqual(typeof appItem.depth, 'number');
    });

    test('should return all apps for an orgId', async () => {
      // Arrange
      const org = await ctx.buildOrg();
      const app1 = await ctx.buildApp({ orgId: org.id, name: 'app-1' });
      const app2 = await ctx.buildApp({ orgId: org.id, name: 'app-2' });

      // Query database directly
      const dbApps = await ctx.prisma.app.findMany({
        where: { orgId: BigInt(org.id) },
        orderBy: [{ depth: 'asc' }, { name: 'asc' }]
      });

      // Act
      const response = await ctx.fastify.inject({
        method: 'GET',
        url: '/apps',
        headers: { 'x-org-id': org.id }
      });

      // Assert
      assert.strictEqual(response.statusCode, 200);
      const apiApps = JSON.parse(response.body);
      assert.strictEqual(apiApps.length, dbApps.length);

      for (let i = 0; i < dbApps.length; i++) {
        assert.strictEqual(apiApps[i].id, dbApps[i].id.toString());
        assert.strictEqual(apiApps[i].name, dbApps[i].name);
        assert.strictEqual(apiApps[i].depth, dbApps[i].depth);
      }
    });

    test('should return 400 when orgId is missing', async () => {
      // Act
      const response = await ctx.fastify.inject({
        method: 'GET',
        url: '/apps'
      });

      // Assert
      assert.strictEqual(response.statusCode, 400);
      const error = JSON.parse(response.body);
      assert.ok(error.message.includes('orgId required'));
    });
  });

  describe('POST /apps', () => {
    test('should create root app successfully', async () => {
      // Arrange
      const org = await ctx.buildOrg();

      // Act
      const response = await ctx.fastify.inject({
        method: 'POST',
        url: '/apps',
        headers: {
          'x-org-id': org.id,
          'content-type': 'application/json'
        },
        body: JSON.stringify({ name: 'test-root-app' })
      });

      // Assert
      assert.strictEqual(response.statusCode, 201);
      const createdApp = JSON.parse(response.body);
      assert.strictEqual(createdApp.name, 'test-root-app');
      assert.strictEqual(createdApp.orgId, org.id);
      assert.strictEqual(createdApp.parentId, null);
      assert.strictEqual(createdApp.depth, 0);
      assert.strictEqual(createdApp.ancestors.length, 0);
    });

    test('should create child app with correct hierarchy', async () => {
      // Arrange
      const org = await ctx.buildOrg();
      const parent = await ctx.buildApp({ orgId: org.id, name: 'parent-app' });

      // Act
      const response = await ctx.fastify.inject({
        method: 'POST',
        url: '/apps',
        headers: {
          'x-org-id': org.id,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          name: 'test-child-app',
          parentId: parent.id
        })
      });

      // Assert
      assert.strictEqual(response.statusCode, 201);
      const createdApp = JSON.parse(response.body);
      assert.strictEqual(createdApp.name, 'test-child-app');
      assert.strictEqual(createdApp.parentId, parent.id);
      assert.strictEqual(createdApp.depth, 1);
      assert.strictEqual(createdApp.ancestors.length, 1);
      assert.strictEqual(createdApp.ancestors[0], parent.id);
    });

    test('should return 404 when parent app not found', async () => {
      // Arrange
      const org = await ctx.buildOrg();

      // Act
      const response = await ctx.fastify.inject({
        method: 'POST',
        url: '/apps',
        headers: {
          'x-org-id': org.id,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          name: 'orphan-app',
          parentId: '999999'
        })
      });

      // Assert
      assert.strictEqual(response.statusCode, 404);
      const error = JSON.parse(response.body);
      assert.ok(error.message.includes('Parent app not found'));
    });

    test('should return 403 when parent belongs to different org', async () => {
      // Arrange
      const org1 = await ctx.buildOrg();
      const org2 = await ctx.buildOrg();
      const org2App = await ctx.buildApp({ orgId: org2.id, name: 'org2-app' });

      // Act
      const response = await ctx.fastify.inject({
        method: 'POST',
        url: '/apps',
        headers: {
          'x-org-id': org1.id,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          name: 'cross-org-child',
          parentId: org2App.id
        })
      });

      // Assert
      assert.strictEqual(response.statusCode, 403);
      const error = JSON.parse(response.body);
      assert.ok(error.message.includes('does not belong to this organization'));
    });

    test('should return 409 when app name already exists in org', async () => {
      // Arrange
      const org = await ctx.buildOrg();
      await ctx.buildApp({ orgId: org.id, name: 'duplicate-app-name' });

      // Act
      const response = await ctx.fastify.inject({
        method: 'POST',
        url: '/apps',
        headers: {
          'x-org-id': org.id,
          'content-type': 'application/json'
        },
        body: JSON.stringify({ name: 'duplicate-app-name' })
      });

      // Assert
      assert.strictEqual(response.statusCode, 409);
      const error = JSON.parse(response.body);
      assert.ok(error.message.includes('already exists'));
    });

    test('should trim whitespace from app name', async () => {
      // Arrange
      const org = await ctx.buildOrg();

      // Act
      const response = await ctx.fastify.inject({
        method: 'POST',
        url: '/apps',
        headers: {
          'x-org-id': org.id,
          'content-type': 'application/json'
        },
        body: JSON.stringify({ name: '  whitespace-app  ' })
      });

      // Assert
      assert.strictEqual(response.statusCode, 201);
      const createdApp = JSON.parse(response.body);
      assert.strictEqual(createdApp.name, 'whitespace-app');
    });
  });
});
