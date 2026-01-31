import { test, describe, after, before } from 'node:test';
import assert from 'node:assert';
import { setupTestApp } from '../helpers/testSetup.js';

describe('Environment Routes', () => {
  let app;
  let testOrgId;

  // Setup: Create app instance before tests
  before(async () => {
    ({ app, testOrgId } = await setupTestApp());
  });

  describe('GET /environments', () => {
    test('should return all environments for an orgId matching database', async () => {
      // Query database directly to get expected environments
      const dbEnvironments = await app.prisma.environment.findMany({
        where: { orgId: BigInt(testOrgId) },
        orderBy: { name: 'asc' }
      });

      // Get environments via API
      const response = await app.inject({
        method: 'GET',
        url: '/environments',
        headers: {
          'x-org-id': testOrgId
        }
      });

      assert.strictEqual(response.statusCode, 200);
      const apiEnvironments = JSON.parse(response.body);

      // Verify count matches
      assert.strictEqual(apiEnvironments.length, dbEnvironments.length, 'API should return same number of environments as database');

      // Verify each environment matches
      for (let i = 0; i < dbEnvironments.length; i++) {
        assert.strictEqual(apiEnvironments[i].id, dbEnvironments[i].id.toString(), `Environment ID at index ${i} should match`);
        assert.strictEqual(apiEnvironments[i].name, dbEnvironments[i].name, `Environment name at index ${i} should match`);
        assert.strictEqual(apiEnvironments[i].orgId, testOrgId, `Environment orgId at index ${i} should match`);
      }
    });

    test('should return 400 when orgId is missing', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/environments'
      });

      assert.strictEqual(response.statusCode, 400);
      const error = JSON.parse(response.body);
      assert.strictEqual(error.statusCode, 400);
      assert.ok(error.message.includes('orgId required'));
    });

    test('should return empty array for org with no environments', async () => {
      // Find an org that has no environments
      const emptyOrg = await app.prisma.organization.findFirst({
        where: {
          environments: {
            none: {}
          }
        }
      });

      const response = await app.inject({
        method: 'GET',
        url: '/environments',
        headers: {
          'x-org-id': emptyOrg.id.toString()
        }
      });

      assert.strictEqual(response.statusCode, 200);
      const environments = JSON.parse(response.body);
      assert.strictEqual(environments.length, 0);
    });
  });

  describe('POST /environments', () => {
    test('should create new environment successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/environments',
        headers: {
          'x-org-id': testOrgId,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          name: 'test-environment'
        })
      });

      assert.strictEqual(response.statusCode, 201);
      const environment = JSON.parse(response.body);
      assert.strictEqual(environment.name, 'test-environment');
      assert.strictEqual(environment.orgId, testOrgId);
      assert.ok(environment.id);

      // Cleanup: delete created environment
      await app.prisma.environment.delete({
        where: { id: BigInt(environment.id) }
      });
    });

    test('should return 400 when name is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/environments',
        headers: {
          'x-org-id': testOrgId,
          'content-type': 'application/json'
        },
        body: JSON.stringify({})
      });

      assert.strictEqual(response.statusCode, 400);
    });

    test('should return 400 when orgId is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/environments',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          name: 'test-env'
        })
      });

      assert.strictEqual(response.statusCode, 400);
      const error = JSON.parse(response.body);
      assert.ok(error.message.includes('orgId required'));
    });

    test('should return 409 when environment name already exists in org', async () => {
      // Find an existing environment
      const existingEnv = await app.prisma.environment.findFirst({
        where: { orgId: BigInt(testOrgId) }
      });

      // Try to create duplicate
      const response = await app.inject({
        method: 'POST',
        url: '/environments',
        headers: {
          'x-org-id': testOrgId,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          name: existingEnv.name
        })
      });

      assert.strictEqual(response.statusCode, 409);
      const error = JSON.parse(response.body);
      assert.strictEqual(error.statusCode, 409);
      assert.ok(error.message.includes('already exists'));
    });

    test('should trim whitespace from environment name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/environments',
        headers: {
          'x-org-id': testOrgId,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          name: '  whitespace-test  '
        })
      });

      assert.strictEqual(response.statusCode, 201);
      const environment = JSON.parse(response.body);
      assert.strictEqual(environment.name, 'whitespace-test');

      // Cleanup
      await app.prisma.environment.delete({
        where: { id: BigInt(environment.id) }
      });
    });
  });

  // Cleanup: close app and disconnect Prisma
  after(async () => {
    await app.close();
  });
});
