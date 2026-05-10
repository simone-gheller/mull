import { test, describe, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert';
import { buildTestContext } from '../utils/builders.js';

describe('Org Routes', () => {
  let ctx;

  beforeEach(async () => {
    ctx = await buildTestContext();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  describe('GET /orgs/:orgId', () => {
    test('should return org details with member count', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org, { role: 'OWNER' });

      const response = await ctx.injectAuth({ method: 'GET', url: `/orgs/${org.id}` }, user);

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.id, org.id);
      assert.strictEqual(body.name, org.name);
      assert.strictEqual(body.memberCount, 1);
    });

    test('should reflect correct member count with multiple members', async () => {
      const org = await ctx.buildOrg();
      const user1 = await ctx.buildUserInOrg(org, { role: 'OWNER' });
      const user2 = await ctx.buildUserInOrg(org, { role: 'USER' });

      const response = await ctx.injectAuth({ method: 'GET', url: `/orgs/${org.id}` }, user1);

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.memberCount, 2);
    });

    test('should return 403 for non-member', async () => {
      const org = await ctx.buildOrg();
      const otherOrg = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(otherOrg);

      const response = await ctx.injectAuth({ method: 'GET', url: `/orgs/${org.id}` }, user);

      assert.strictEqual(response.statusCode, 403);
    });

    test('should return 401 without auth', async () => {
      const org = await ctx.buildOrg();

      const response = await ctx.fastify.inject({ method: 'GET', url: `/orgs/${org.id}` });

      assert.strictEqual(response.statusCode, 401);
    });
  });

  describe('PATCH /orgs/:orgId', () => {
    test('should update org name as OWNER', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org, { role: 'OWNER' });

      const response = await ctx.injectAuth({
        method: 'PATCH',
        url: `/orgs/${org.id}`,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'updated-org-name' })
      }, user);

      assert.strictEqual(response.statusCode, 200);
      const body = JSON.parse(response.body);
      assert.strictEqual(body.id, org.id);
      assert.strictEqual(body.name, 'updated-org-name');

      const dbOrg = await ctx.prisma.organization.findUnique({ where: { id: org.id } });
      assert.strictEqual(dbOrg.name, 'updated-org-name');
    });

    test('should return 403 when user has USER role (not OWNER)', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org, { role: 'USER' });

      const response = await ctx.injectAuth({
        method: 'PATCH',
        url: `/orgs/${org.id}`,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'should-not-update' })
      }, user);

      assert.strictEqual(response.statusCode, 403);
    });

    test('should return 403 for non-member', async () => {
      const org = await ctx.buildOrg();
      const otherOrg = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(otherOrg, { role: 'OWNER' });

      const response = await ctx.injectAuth({
        method: 'PATCH',
        url: `/orgs/${org.id}`,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'hacked' })
      }, user);

      assert.strictEqual(response.statusCode, 403);
    });
  });

  describe('GET /orgs/:orgId/members', () => {
    test('should return all members with roles', async () => {
      const org = await ctx.buildOrg();
      const owner = await ctx.buildUserInOrg(org, { role: 'OWNER' });
      const member = await ctx.buildUserInOrg(org, { role: 'USER' });

      const response = await ctx.injectAuth({ method: 'GET', url: `/orgs/${org.id}/members` }, owner);

      assert.strictEqual(response.statusCode, 200);
      const members = JSON.parse(response.body);
      assert.strictEqual(members.length, 2);

      const ownerEntry = members.find(m => m.id === owner.id);
      assert.ok(ownerEntry);
      assert.strictEqual(ownerEntry.role, 'OWNER');
      assert.strictEqual(ownerEntry.email, owner.email);

      const memberEntry = members.find(m => m.id === member.id);
      assert.ok(memberEntry);
      assert.strictEqual(memberEntry.role, 'USER');
    });

    test('should return 403 for non-member', async () => {
      const org = await ctx.buildOrg();
      const otherOrg = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(otherOrg);

      const response = await ctx.injectAuth({ method: 'GET', url: `/orgs/${org.id}/members` }, user);

      assert.strictEqual(response.statusCode, 403);
    });

    test('should return 401 without auth', async () => {
      const org = await ctx.buildOrg();

      const response = await ctx.fastify.inject({ method: 'GET', url: `/orgs/${org.id}/members` });

      assert.strictEqual(response.statusCode, 401);
    });
  });

  describe('DELETE /orgs/:orgId/invites/:inviteId', () => {
    test('should return 400 when inviteId is not a valid UUIDv7', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org, { role: 'ADMIN' });

      const response = await ctx.injectAuth({
        method: 'DELETE',
        url: `/orgs/${org.id}/invites/not-a-uuid`
      }, user);

      assert.strictEqual(response.statusCode, 400);
    });
  });
});
