import { test, describe, after } from 'node:test';
import assert from 'node:assert';
import { buildApp } from '../../src/server.js';

describe('Environment Routes', () => {
  let app;
  let testOrgId;

  // Setup: Create app instance before tests
  test('setup', async () => {
    app = buildApp({ logger: false });
    await app.ready();

    // Get a valid orgId from database for testing
    const orgs = await app.prisma.organization.findMany({ take: 1 });
    assert.ok(orgs.length > 0, 'Database should have at least one organization');
    testOrgId = orgs[0].id.toString();
  });

  describe('GET /environments', () => {
    test('should return list of environments for valid orgId', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/environments',
        headers: {
          'x-org-id': testOrgId
        }
      });

      assert.strictEqual(response.statusCode, 200);
      const environments = JSON.parse(response.body);
      assert.ok(Array.isArray(environments));

      // Verify response structure if environments exist
      if (environments.length > 0) {
        const env = environments[0];
        assert.ok(env.id);
        assert.ok(env.orgId);
        assert.ok(env.name);
        assert.strictEqual(typeof env.id, 'string');
        assert.strictEqual(typeof env.name, 'string');
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

    test('should accept orgId as query parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/environments?orgId=${testOrgId}`
      });

      assert.strictEqual(response.statusCode, 200);
      const environments = JSON.parse(response.body);
      assert.ok(Array.isArray(environments));
    });

    test('should return empty array for org with no environments', async () => {
      // Create a new org with no environments
      const newOrg = await app.prisma.organization.create({
        data: { name: 'Empty Test Org' }
      });

      const response = await app.inject({
        method: 'GET',
        url: '/environments',
        headers: {
          'x-org-id': newOrg.id.toString()
        }
      });

      assert.strictEqual(response.statusCode, 200);
      const environments = JSON.parse(response.body);
      assert.strictEqual(environments.length, 0);

      // Cleanup
      await app.prisma.organization.delete({
        where: { id: newOrg.id }
      });
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
      // Create first environment
      const env1 = await app.prisma.environment.create({
        data: {
          orgId: BigInt(testOrgId),
          name: 'duplicate-test'
        }
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
          name: 'duplicate-test'
        })
      });

      assert.strictEqual(response.statusCode, 409);
      const error = JSON.parse(response.body);
      assert.strictEqual(error.statusCode, 409);
      assert.ok(error.message.includes('already exists'));

      // Cleanup
      await app.prisma.environment.delete({
        where: { id: env1.id }
      });
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
