import { test, describe, after, before } from 'node:test';
import assert from 'node:assert';
import { setupTestApp } from '../helpers/testSetup.js';

describe('App Routes', () => {
  let app;
  let testOrgId;

  // Setup: Create app instance before tests
  before(async () => {
    ({ app, testOrgId } = await setupTestApp());
  });

  describe('GET /apps', () => {
    test('should return list of apps for valid orgId', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/apps',
        headers: {
          'x-org-id': testOrgId
        }
      });

      assert.strictEqual(response.statusCode, 200);
      const apps = JSON.parse(response.body);
      assert.ok(Array.isArray(apps));

      // Verify response structure
      const appItem = apps[0];
      assert.ok(appItem.id);
      assert.ok(appItem.orgId);
      assert.ok(appItem.name);
      assert.ok(Array.isArray(appItem.ancestors));
      assert.strictEqual(typeof appItem.depth, 'number');
    });

    test('should return all apps for an orgId', async () => {
      // Query database directly to get expected apps
      const dbApps = await app.prisma.app.findMany({
        where: { orgId: BigInt(testOrgId) },
        orderBy: [
          { depth: 'asc' },
          { name: 'asc' }
        ]
      });

      // Get apps via API
      const response = await app.inject({
        method: 'GET',
        url: '/apps',
        headers: {
          'x-org-id': testOrgId
        }
      });

      assert.strictEqual(response.statusCode, 200);
      const apiApps = JSON.parse(response.body);

      // Verify count matches
      assert.strictEqual(apiApps.length, dbApps.length, 'API should return same number of apps as database');

      // Verify each app matches (compare IDs)
      for (let i = 0; i < dbApps.length; i++) {
        assert.strictEqual(apiApps[i].id, dbApps[i].id.toString(), `App at index ${i} should match`);
        assert.strictEqual(apiApps[i].name, dbApps[i].name, `App name at index ${i} should match`);
        assert.strictEqual(apiApps[i].depth, dbApps[i].depth, `App depth at index ${i} should match`);
      }
    });

    test('should return 400 when orgId is missing', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/apps'
      });

      assert.strictEqual(response.statusCode, 400);
      const error = JSON.parse(response.body);
      assert.ok(error.message.includes('orgId required'));
    });
  });

  describe('POST /apps', () => {
    test('should create root app successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/apps',
        headers: {
          'x-org-id': testOrgId,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          name: 'test-root-app'
        })
      });

      assert.strictEqual(response.statusCode, 201);
      const createdApp = JSON.parse(response.body);
      assert.strictEqual(createdApp.name, 'test-root-app');
      assert.strictEqual(createdApp.orgId, testOrgId);
      assert.strictEqual(createdApp.parentId, null);
      assert.strictEqual(createdApp.depth, 0);
      assert.strictEqual(createdApp.ancestors.length, 0);

      // Cleanup
      await app.prisma.app.delete({
        where: { id: BigInt(createdApp.id) }
      });
    });

    test('should create child app with correct hierarchy', async () => {
      // Create parent first
      const parent = await app.prisma.app.create({
        data: {
          orgId: BigInt(testOrgId),
          name: 'parent-for-test',
          ancestors: [],
          depth: 0
        }
      });

      const response = await app.inject({
        method: 'POST',
        url: '/apps',
        headers: {
          'x-org-id': testOrgId,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          name: 'test-child-app',
          parentId: parent.id.toString()
        })
      });

      assert.strictEqual(response.statusCode, 201);
      const createdApp = JSON.parse(response.body);
      assert.strictEqual(createdApp.name, 'test-child-app');
      assert.strictEqual(createdApp.parentId, parent.id.toString());
      assert.strictEqual(createdApp.depth, 1);
      assert.strictEqual(createdApp.ancestors.length, 1);
      assert.strictEqual(createdApp.ancestors[0], parent.id.toString());

      // Cleanup (child first, then parent)
      await app.prisma.app.delete({
        where: { id: BigInt(createdApp.id) }
      });
      await app.prisma.app.delete({
        where: { id: parent.id }
      });
    });

    test('should return 404 when parent app not found', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/apps',
        headers: {
          'x-org-id': testOrgId,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          name: 'orphan-app',
          parentId: '999999'
        })
      });

      assert.strictEqual(response.statusCode, 404);
      const error = JSON.parse(response.body);
      assert.ok(error.message.includes('Parent app not found'));
    });

    test('should return 403 when parent belongs to different org', async () => {
      // Create another org
      const otherOrg = await app.prisma.organization.create({
        data: { name: 'Other Org' }
      });

      // Create app in other org
      const otherOrgApp = await app.prisma.app.create({
        data: {
          orgId: otherOrg.id,
          name: 'other-org-app',
          ancestors: [],
          depth: 0
        }
      });

      const response = await app.inject({
        method: 'POST',
        url: '/apps',
        headers: {
          'x-org-id': testOrgId,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          name: 'cross-org-child',
          parentId: otherOrgApp.id.toString()
        })
      });

      assert.strictEqual(response.statusCode, 403);
      const error = JSON.parse(response.body);
      assert.ok(error.message.includes('does not belong to this organization'));

      // Cleanup
      await app.prisma.app.delete({ where: { id: otherOrgApp.id } });
      await app.prisma.organization.delete({ where: { id: otherOrg.id } });
    });

    test('should return 409 when app name already exists in org', async () => {
      // Create first app
      const app1 = await app.prisma.app.create({
        data: {
          orgId: BigInt(testOrgId),
          name: 'duplicate-app-name',
          ancestors: [],
          depth: 0
        }
      });

      // Try to create duplicate
      const response = await app.inject({
        method: 'POST',
        url: '/apps',
        headers: {
          'x-org-id': testOrgId,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          name: 'duplicate-app-name'
        })
      });

      assert.strictEqual(response.statusCode, 409);
      const error = JSON.parse(response.body);
      assert.ok(error.message.includes('already exists'));

      // Cleanup
      await app.prisma.app.delete({ where: { id: app1.id } });
    });

    test('should trim whitespace from app name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/apps',
        headers: {
          'x-org-id': testOrgId,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          name: '  whitespace-app  '
        })
      });

      assert.strictEqual(response.statusCode, 201);
      const createdApp = JSON.parse(response.body);
      assert.strictEqual(createdApp.name, 'whitespace-app');

      // Cleanup
      await app.prisma.app.delete({
        where: { id: BigInt(createdApp.id) }
      });
    });
  });

  // Cleanup: close app and disconnect Prisma
  after(async () => {
    await app.close();
  });
});
