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

  describe('GET /orgs/:orgId/environments', () => {
    test('should return all environments for org member', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org);
      await ctx.buildEnv({ orgId: org.id, name: 'dev' });
      await ctx.buildEnv({ orgId: org.id, name: 'prod' });

      const dbEnvironments = await ctx.prisma.environment.findMany({
        where: { orgId: org.id },
        orderBy: { name: 'asc' }
      });

      const response = await ctx.injectAuth({ method: 'GET', url: `/orgs/${org.id}/environments` }, user);

      assert.strictEqual(response.statusCode, 200);
      const apiEnvironments = JSON.parse(response.body);
      assert.strictEqual(apiEnvironments.length, dbEnvironments.length);
      for (let i = 0; i < dbEnvironments.length; i++) {
        assert.strictEqual(apiEnvironments[i].id, dbEnvironments[i].id);
        assert.strictEqual(apiEnvironments[i].name, dbEnvironments[i].name);
        assert.strictEqual(apiEnvironments[i].orgId, org.id);
      }
    });

    test('should return empty array for org with no environments', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org);

      const response = await ctx.injectAuth({ method: 'GET', url: `/orgs/${org.id}/environments` }, user);

      assert.strictEqual(response.statusCode, 200);
      const environments = JSON.parse(response.body);
      assert.strictEqual(environments.length, 0);
    });

    test('should return 401 without auth', async () => {
      const org = await ctx.buildOrg();

      const response = await ctx.fastify.inject({ method: 'GET', url: `/orgs/${org.id}/environments` });

      assert.strictEqual(response.statusCode, 401);
    });

    test('should return 403 for non-member', async () => {
      const org = await ctx.buildOrg();
      const otherOrg = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(otherOrg);

      const response = await ctx.injectAuth({ method: 'GET', url: `/orgs/${org.id}/environments` }, user);

      assert.strictEqual(response.statusCode, 403);
    });
  });

  describe('POST /orgs/:orgId/environments', () => {
    test('should create new environment successfully', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org);

      const response = await ctx.injectAuth({
        method: 'POST',
        url: `/orgs/${org.id}/environments`,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'test-environment' })
      }, user);

      assert.strictEqual(response.statusCode, 201);
      const environment = JSON.parse(response.body);
      assert.strictEqual(environment.name, 'test-environment');
      assert.strictEqual(environment.orgId, org.id);
      assert.ok(environment.id);
    });

    test('should auto-create parameter values for existing parameters', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org);
      const app = await ctx.buildApp({ orgId: org.id });
      const param1 = await ctx.buildParam({ appId: app.id });
      const param2 = await ctx.buildParam({ appId: app.id });

      const response = await ctx.injectAuth({
        method: 'POST',
        url: `/orgs/${org.id}/environments`,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'test-sync-env' })
      }, user);

      assert.strictEqual(response.statusCode, 201);
      const environment = JSON.parse(response.body);

      const values = await ctx.prisma.parameterValue.findMany({
        where: { environmentId: environment.id }
      });
      assert.strictEqual(values.length, 2);
      values.forEach(v => assert.strictEqual(v.value, ''));
    });

    test('should return 400 when name is missing', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org);

      const response = await ctx.injectAuth({
        method: 'POST',
        url: `/orgs/${org.id}/environments`,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({})
      }, user);

      assert.strictEqual(response.statusCode, 400);
    });

    test('should return 409 when environment name already exists in org', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org);
      await ctx.buildEnv({ orgId: org.id, name: 'duplicate-env' });

      const response = await ctx.injectAuth({
        method: 'POST',
        url: `/orgs/${org.id}/environments`,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'duplicate-env' })
      }, user);

      assert.strictEqual(response.statusCode, 409);
      const error = JSON.parse(response.body);
      assert.ok(error.message.includes('already exists'));
    });

    test('should trim whitespace from environment name', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org);

      const response = await ctx.injectAuth({
        method: 'POST',
        url: `/orgs/${org.id}/environments`,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: '  whitespace-test  ' })
      }, user);

      assert.strictEqual(response.statusCode, 201);
      const environment = JSON.parse(response.body);
      assert.strictEqual(environment.name, 'whitespace-test');
    });
  });
});
