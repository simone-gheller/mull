import { test, describe, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert';
import { buildTestContext } from '../utils/builders.js';

describe('Auth Routes', () => {
  let ctx;

  beforeEach(async () => {
    ctx = await buildTestContext();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  describe('GET /auth/me', () => {
    test('should return user info with organizations', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org, { role: 'OWNER' });

      const response = await ctx.injectAuth({ method: 'GET', url: '/auth/me' }, user);

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.id, user.id);
      assert.strictEqual(body.email, user.email);
      assert.ok(Array.isArray(body.organizations));
      assert.strictEqual(body.organizations.length, 1);
      assert.strictEqual(body.organizations[0].id, org.id);
      assert.strictEqual(body.organizations[0].name, org.name);
      assert.strictEqual(body.organizations[0].role, 'OWNER');
    });

    test('should return multiple orgs when user belongs to several', async () => {
      const org1 = await ctx.buildOrg();
      const org2 = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org1, { role: 'OWNER' });
      await ctx.buildOrgMembership({ userId: user.id, orgId: org2.id, role: 'DEVELOPER' });

      const response = await ctx.injectAuth({ method: 'GET', url: '/auth/me' }, user);

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.organizations.length, 2);
    });

    test('should return 401 without auth header', async () => {
      const response = await ctx.fastify.inject({ method: 'GET', url: '/auth/me' });

      assert.strictEqual(response.statusCode, 401);
    });
  });

  describe('PATCH /auth/me', () => {
    test('should update displayName', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org);

      const response = await ctx.injectAuth({
        method: 'PATCH',
        url: '/auth/me',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ displayName: 'Updated Name' })
      }, user);

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.id, user.id);
      assert.strictEqual(body.displayName, 'Updated Name');

      const dbUser = await ctx.prisma.user.findUnique({ where: { id: user.id } });
      assert.strictEqual(dbUser.displayName, 'Updated Name');
    });

    test('should return 401 without auth', async () => {
      const response = await ctx.fastify.inject({
        method: 'PATCH',
        url: '/auth/me',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ displayName: 'Test' })
      });

      assert.strictEqual(response.statusCode, 401);
    });
  });

  describe('POST /orgs', () => {
    test('should create new org and assign OWNER role', async () => {
      const existingOrg = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(existingOrg);

      const response = await ctx.injectAuth({
        method: 'POST',
        url: '/orgs',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'new-org' })
      }, user);

      assert.strictEqual(response.statusCode, 201);
      const body = JSON.parse(response.body);
      assert.ok(body.id);
      assert.strictEqual(body.name, 'new-org');
      assert.strictEqual(body.role, 'OWNER');

      ctx.createdIds.orgs.push(body.id);

      const membership = await ctx.prisma.userOrganization.findUnique({
        where: { userId_orgId: { userId: user.id, orgId: body.id } },
        include: { role: { select: { key: true } } }
      });
      assert.ok(membership);
      assert.strictEqual(membership.role.key, 'OWNER');
    });

    test('should return 400 when name is missing', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org);

      const response = await ctx.injectAuth({
        method: 'POST',
        url: '/orgs',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({})
      }, user);

      assert.strictEqual(response.statusCode, 400);
    });

    test('should return 401 without auth', async () => {
      const response = await ctx.fastify.inject({
        method: 'POST',
        url: '/orgs',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'test-org' })
      });

      assert.strictEqual(response.statusCode, 401);
    });
  });
});
