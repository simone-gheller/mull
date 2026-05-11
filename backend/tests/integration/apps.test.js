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

  describe('GET /orgs/:orgId/apps', () => {
    test('should return list of apps for org member', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org);
      const app = await ctx.buildApp({ orgId: org.id });

      const response = await ctx.injectAuth({ method: 'GET', url: `/orgs/${org.id}/apps` }, user);

      assert.strictEqual(response.statusCode, 200);
      const apps = JSON.parse(response.body);
      assert.ok(Array.isArray(apps));
      assert.strictEqual(apps.length, 1);
      assert.strictEqual(apps[0].id, app.id);
      assert.strictEqual(apps[0].orgId, org.id);
      assert.strictEqual(apps[0].name, app.name);
      assert.ok(Array.isArray(apps[0].ancestors));
      assert.strictEqual(typeof apps[0].depth, 'number');
    });

    test('should return all apps for org', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org);
      await ctx.buildApp({ orgId: org.id, name: 'app-1' });
      await ctx.buildApp({ orgId: org.id, name: 'app-2' });

      const dbApps = await ctx.prisma.app.findMany({
        where: { orgId: org.id },
        orderBy: [{ depth: 'asc' }, { name: 'asc' }]
      });

      const response = await ctx.injectAuth({ method: 'GET', url: `/orgs/${org.id}/apps` }, user);

      assert.strictEqual(response.statusCode, 200);
      const apiApps = JSON.parse(response.body);
      assert.strictEqual(apiApps.length, dbApps.length);
      for (let i = 0; i < dbApps.length; i++) {
        assert.strictEqual(apiApps[i].id, dbApps[i].id);
        assert.strictEqual(apiApps[i].name, dbApps[i].name);
        assert.strictEqual(apiApps[i].depth, dbApps[i].depth);
      }
    });

    test('should return 401 without auth', async () => {
      const org = await ctx.buildOrg();

      const response = await ctx.fastify.inject({ method: 'GET', url: `/orgs/${org.id}/apps` });

      assert.strictEqual(response.statusCode, 401);
    });

    test('should return 403 for non-member', async () => {
      const org = await ctx.buildOrg();
      const otherOrg = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(otherOrg);

      const response = await ctx.injectAuth({ method: 'GET', url: `/orgs/${org.id}/apps` }, user);

      assert.strictEqual(response.statusCode, 403);
    });

    test('should return 400 when orgId is not a valid UUIDv7', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org);

      const response = await ctx.injectAuth({ method: 'GET', url: '/orgs/not-a-uuid/apps' }, user);

      assert.strictEqual(response.statusCode, 400);
    });
  });

  describe('GET /orgs/:orgId/apps/:appId', () => {
    test('should return 400 when appId is not a valid UUIDv7', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org);

      const response = await ctx.injectAuth({
        method: 'GET',
        url: `/orgs/${org.id}/apps/not-a-uuid`
      }, user);

      assert.strictEqual(response.statusCode, 400);
    });
  });

  describe('POST /orgs/:orgId/apps', () => {
    test('should create root app successfully', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org);

      const response = await ctx.injectAuth({
        method: 'POST',
        url: `/orgs/${org.id}/apps`,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'test-root-app' })
      }, user);

      assert.strictEqual(response.statusCode, 201);
      const createdApp = JSON.parse(response.body);
      assert.strictEqual(createdApp.name, 'test-root-app');
      assert.strictEqual(createdApp.orgId, org.id);
      assert.strictEqual(createdApp.parentId, null);
      assert.strictEqual(createdApp.depth, 0);
      assert.strictEqual(createdApp.ancestors.length, 0);
    });

    test('should create child app with correct hierarchy', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org);
      const parent = await ctx.buildApp({ orgId: org.id, name: 'parent-app' });

      const response = await ctx.injectAuth({
        method: 'POST',
        url: `/orgs/${org.id}/apps`,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'test-child-app', parentId: parent.id })
      }, user);

      assert.strictEqual(response.statusCode, 201);
      const createdApp = JSON.parse(response.body);
      assert.strictEqual(createdApp.name, 'test-child-app');
      assert.strictEqual(createdApp.parentId, parent.id);
      assert.strictEqual(createdApp.depth, 1);
      assert.strictEqual(createdApp.ancestors.length, 1);
      assert.strictEqual(createdApp.ancestors[0], parent.id);
    });

    test('should return 404 when parent app not found', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org);

      const response = await ctx.injectAuth({
        method: 'POST',
        url: `/orgs/${org.id}/apps`,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'orphan-app', parentId: '01900000-0000-7000-8000-000000000000' })
      }, user);

      assert.strictEqual(response.statusCode, 404);
      const error = JSON.parse(response.body);
      assert.ok(error.message.includes('Parent app not found'));
    });

    test('should return 403 when parent belongs to different org', async () => {
      const org1 = await ctx.buildOrg();
      const org2 = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org1);
      const org2App = await ctx.buildApp({ orgId: org2.id, name: 'org2-app' });

      const response = await ctx.injectAuth({
        method: 'POST',
        url: `/orgs/${org1.id}/apps`,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'cross-org-child', parentId: org2App.id })
      }, user);

      assert.strictEqual(response.statusCode, 403);
      const error = JSON.parse(response.body);
      assert.ok(error.message.includes('does not belong to this organization'));
    });

    test('should return 409 when app name already exists in org', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org);
      await ctx.buildApp({ orgId: org.id, name: 'duplicate-app-name' });

      const response = await ctx.injectAuth({
        method: 'POST',
        url: `/orgs/${org.id}/apps`,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'duplicate-app-name' })
      }, user);

      assert.strictEqual(response.statusCode, 409);
      const error = JSON.parse(response.body);
      assert.ok(error.message.includes('already exists'));
    });

    test('should trim whitespace from app name', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org);

      const response = await ctx.injectAuth({
        method: 'POST',
        url: `/orgs/${org.id}/apps`,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: '  whitespace-app  ' })
      }, user);

      assert.strictEqual(response.statusCode, 201);
      const createdApp = JSON.parse(response.body);
      assert.strictEqual(createdApp.name, 'whitespace-app');
    });

    test('should forbid DEVELOPER members from creating apps', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org, { role: 'DEVELOPER' });

      const response = await ctx.injectAuth({
        method: 'POST',
        url: `/orgs/${org.id}/apps`,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'viewer-created-app' })
      }, user);

      assert.strictEqual(response.statusCode, 403);
    });
  });
});
