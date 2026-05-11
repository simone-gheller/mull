import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { buildTestContext } from '../utils/builders.js';
import { uuidv7 } from 'uuidv7';

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

test.describe('audit events', () => {
  let ctx;

  test.beforeEach(async () => {
    ctx = await buildTestContext();
  });

  test.afterEach(async () => {
    await ctx.cleanup();
  });

  test('creates tenant-visible audit events for app mutations and listing', async () => {
    const org = await ctx.buildOrg();
    const owner = await ctx.buildUserInOrg(org, { role: 'OWNER' });

    const createResponse = await ctx.injectAuth({
      method: 'POST',
      url: `/orgs/${org.id}/apps`,
      body: { name: 'audit-api' }
    }, owner);

    assert.equal(createResponse.statusCode, 201);
    const app = JSON.parse(createResponse.body);

    const audit = await ctx.prisma.auditEvent.findFirst({
      where: { orgId: org.id, action: 'app.create', resourceId: app.id }
    });
    assert.ok(audit);
    assert.equal(audit.actorUserId, owner.id);
    assert.equal(audit.resourceLabel, 'audit-api');
    assert.equal(audit.outcome, 'SUCCESS');
    assert.ok(audit.expiresAt);

    const listResponse = await ctx.injectAuth({
      method: 'GET',
      url: `/orgs/${org.id}/audit-events?action=app.create`
    }, owner);

    assert.equal(listResponse.statusCode, 200);
    const body = JSON.parse(listResponse.body);
    assert.equal(body.items.length, 1);
    assert.equal(body.items[0].action, 'app.create');
  });

  test('audits rendered config fetch without storing plaintext values', async () => {
    const { org, app, env } = await ctx.buildOrgWithAppAndEnv();
    const owner = await ctx.buildUserInOrg(org, { role: 'OWNER' });
    const param = await ctx.buildParam({ appId: app.id, key: 'DATABASE_URL' });
    const value = await ctx.prisma.parameterValue.findUnique({
      where: { parameterId_environmentId: { parameterId: param.id, environmentId: env.id } }
    });
    await ctx.injectAuth({
      method: 'PUT',
      url: `/orgs/${org.id}/parameters/values/${value.id}`,
      body: { value: 'postgres://super-secret' }
    }, owner);

    const response = await ctx.injectAuth({
      method: 'GET',
      url: `/orgs/${org.id}/config/${app.id}/${env.id}`
    }, owner);

    assert.equal(response.statusCode, 200);

    const audit = await ctx.prisma.auditEvent.findFirst({
      where: { orgId: org.id, action: 'config.fetch' }
    });
    assert.ok(audit);
    assert.equal(audit.resourceType, 'config');
    assert.equal(audit.metadata.parametersCount, 1);
    assert.equal(JSON.stringify(audit.metadata).includes('postgres://super-secret'), false);
  });

  test('audits denied protected-environment reveal without plaintext', async () => {
    const org = await ctx.buildOrg();
    const app = await ctx.buildApp({ orgId: org.id });
    const env = await ctx.buildEnv({ orgId: org.id, tier: 'PRODUCTION', protected: true });
    const user = await ctx.buildUserInOrg(org, { role: 'DEVELOPER' });
    const param = await ctx.buildParam({ appId: app.id, key: 'API_KEY' });
    const value = await ctx.prisma.parameterValue.findUnique({
      where: { parameterId_environmentId: { parameterId: param.id, environmentId: env.id } }
    });
    const owner = await ctx.buildUserInOrg(org, { role: 'OWNER' });
    await ctx.injectAuth({
      method: 'PUT',
      url: `/orgs/${org.id}/parameters/values/${value.id}`,
      body: { value: 'secret-api-key' }
    }, owner);

    const response = await ctx.injectAuth({
      method: 'GET',
      url: `/orgs/${org.id}/parameters/values/${value.id}`
    }, user);

    assert.equal(response.statusCode, 403);

    const audit = await ctx.prisma.auditEvent.findFirst({
      where: {
        orgId: org.id,
        action: 'parameter_value.reveal_current',
        resourceId: value.id
      }
    });
    assert.ok(audit);
    assert.equal(audit.outcome, 'DENIED');
    assert.equal(audit.metadata.protected, true);
    assert.equal(JSON.stringify(audit.metadata).includes('secret-api-key'), false);
  });

  test('keeps generic HTTP failure audits scoped to an explicit organization', async () => {
    const org = await ctx.buildOrg();
    const owner = await ctx.buildUserInOrg(org, { role: 'OWNER' });

    const personalTokenResponse = await ctx.injectAuth({
      method: 'POST',
      url: '/auth/access-keys',
      body: { name: 'broken-token-request', scopes: ['config:read'] }
    }, owner);
    assert.equal(personalTokenResponse.statusCode, 400);

    const leakedPersonalFailure = await ctx.prisma.auditEvent.findFirst({
      where: {
        orgId: org.id,
        action: 'http.request_failed',
        resourceId: '/auth/access-keys'
      }
    });
    assert.equal(leakedPersonalFailure, null);
  });

  test('covers the audit action matrix for org, app, env, parameter, value, export, and invite flows', async () => {
    const createdInviteUrls = [];
    ctx.fastify.mailer.sendInvite = async ({ inviteUrl }) => {
      createdInviteUrls.push(inviteUrl);
    };

    const user = await ctx.buildUser();
    const createOrgResponse = await ctx.injectAuth({
      method: 'POST',
      url: '/orgs',
      body: { name: 'audit-org-created' }
    }, user);
    assert.equal(createOrgResponse.statusCode, 201);
    const createdOrg = JSON.parse(createOrgResponse.body);
    ctx.track('orgs', createdOrg.id);

    const org = await ctx.buildOrg({ plan: 'PRO' });
    const owner = await ctx.buildUserInOrg(org, { role: 'OWNER' });
    const invitedUser = await ctx.buildUser({ email: `audit-invite-${uuidv7()}@test.com` });

    const updateProfileResponse = await ctx.injectAuth({
      method: 'PATCH',
      url: '/auth/me',
      body: { displayName: 'Audit Owner' }
    }, owner);
    assert.equal(updateProfileResponse.statusCode, 200);

    const updateOrgResponse = await ctx.injectAuth({
      method: 'PATCH',
      url: `/orgs/${org.id}`,
      body: { name: 'audit-org-renamed' }
    }, owner);
    assert.equal(updateOrgResponse.statusCode, 200);

    const createAppResponse = await ctx.injectAuth({
      method: 'POST',
      url: `/orgs/${org.id}/apps`,
      body: { name: 'audit-app' }
    }, owner);
    assert.equal(createAppResponse.statusCode, 201);
    const app = JSON.parse(createAppResponse.body);

    const updateAppResponse = await ctx.injectAuth({
      method: 'PATCH',
      url: `/orgs/${org.id}/apps/${app.id}`,
      body: { name: 'audit-app-renamed' }
    }, owner);
    assert.equal(updateAppResponse.statusCode, 200);

    const childApp = await ctx.buildApp({ orgId: org.id, parentId: app.id, name: 'audit-child' });

    const createEnvResponse = await ctx.injectAuth({
      method: 'POST',
      url: `/orgs/${org.id}/environments`,
      body: { name: 'audit-env', tier: 'PRODUCTION', protected: true }
    }, owner);
    assert.equal(createEnvResponse.statusCode, 201);
    const env = JSON.parse(createEnvResponse.body);

    const createDeleteEnvResponse = await ctx.injectAuth({
      method: 'POST',
      url: `/orgs/${org.id}/environments`,
      body: { name: 'audit-env-delete' }
    }, owner);
    assert.equal(createDeleteEnvResponse.statusCode, 201);
    const envToDelete = JSON.parse(createDeleteEnvResponse.body);

    const deleteEnvResponse = await ctx.injectAuth({
      method: 'DELETE',
      url: `/orgs/${org.id}/environments/${envToDelete.id}`
    }, owner);
    assert.equal(deleteEnvResponse.statusCode, 204);

    const createParameterResponse = await ctx.injectAuth({
      method: 'POST',
      url: `/orgs/${org.id}/parameters`,
      body: {
        appId: app.id,
        key: 'AUDIT_SECRET',
        description: 'audit coverage'
      }
    }, owner);
    assert.equal(createParameterResponse.statusCode, 201);
    const parameter = JSON.parse(createParameterResponse.body);

    const overrideResponse = await ctx.injectAuth({
      method: 'POST',
      url: `/orgs/${org.id}/parameters/override`,
      body: { appId: childApp.id, key: parameter.key, description: 'child override' }
    }, owner);
    assert.equal(overrideResponse.statusCode, 200);

    const value = await ctx.prisma.parameterValue.findUnique({
      where: { parameterId_environmentId: { parameterId: parameter.id, environmentId: env.id } }
    });

    const updateValueResponse = await ctx.injectAuth({
      method: 'PUT',
      url: `/orgs/${org.id}/parameters/values/${value.id}`,
      body: { value: 'audit-secret-v1' }
    }, owner);
    assert.equal(updateValueResponse.statusCode, 200);

    const clearValueResponse = await ctx.injectAuth({
      method: 'PUT',
      url: `/orgs/${org.id}/parameters/values/${value.id}`,
      body: { value: '' }
    }, owner);
    assert.equal(clearValueResponse.statusCode, 200);

    const updateValueAgainResponse = await ctx.injectAuth({
      method: 'PUT',
      url: `/orgs/${org.id}/parameters/values/${value.id}`,
      body: { value: 'audit-secret-v2' }
    }, owner);
    assert.equal(updateValueAgainResponse.statusCode, 200);

    const revealCurrentResponse = await ctx.injectAuth({
      method: 'GET',
      url: `/orgs/${org.id}/parameters/values/${value.id}`
    }, owner);
    assert.equal(revealCurrentResponse.statusCode, 200);

    const historyResponse = await ctx.injectAuth({
      method: 'GET',
      url: `/orgs/${org.id}/parameters/values/${value.id}/history`
    }, owner);
    assert.equal(historyResponse.statusCode, 200);
    const version = JSON.parse(historyResponse.body).items[0];

    const revealVersionResponse = await ctx.injectAuth({
      method: 'GET',
      url: `/orgs/${org.id}/parameters/values/${value.id}/history/${version.id}`
    }, owner);
    assert.equal(revealVersionResponse.statusCode, 200);

    const rollbackResponse = await ctx.injectAuth({
      method: 'POST',
      url: `/orgs/${org.id}/parameters/values/${value.id}/rollback`,
      body: { versionId: version.id }
    }, owner);
    assert.equal(rollbackResponse.statusCode, 200);

    const configResponse = await ctx.injectAuth({
      method: 'GET',
      url: `/orgs/${org.id}/config/${app.id}/${env.id}`
    }, owner);
    assert.equal(configResponse.statusCode, 200);

    const exportResponse = await ctx.injectAuth({
      method: 'POST',
      url: `/orgs/${org.id}/exports/parameters`,
      body: { appId: app.id }
    }, owner);
    assert.equal(exportResponse.statusCode, 200);

    const adminRole = await ctx.getSystemRole('ADMIN');
    const inviteResponse = await ctx.injectAuth({
      method: 'POST',
      url: `/orgs/${org.id}/invites`,
      body: { email: invitedUser.email, roleId: adminRole.id }
    }, owner);
    assert.equal(inviteResponse.statusCode, 200);
    const inviteToken = new URL(createdInviteUrls.at(-1)).searchParams.get('token');
    assert.ok(inviteToken);

    const previewResponse = await ctx.fastify.inject({
      method: 'GET',
      url: `/invites/${inviteToken}`
    });
    assert.equal(previewResponse.statusCode, 200);

    const acceptResponse = await ctx.injectAuth({
      method: 'POST',
      url: '/invites/accept',
      body: { token: inviteToken }
    }, invitedUser);
    assert.equal(acceptResponse.statusCode, 200);

    const developerRole = await ctx.getSystemRole('DEVELOPER');
    const revokeRawToken = `audit-revoke-${uuidv7()}`;
    const inviteToRevoke = await ctx.prisma.orgInvite.create({
      data: {
        id: uuidv7(),
        orgId: org.id,
        email: `revoke-${uuidv7()}@test.com`,
        roleId: developerRole.id,
        tokenHash: hashToken(revokeRawToken),
        invitedBy: owner.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000)
      }
    });

    const revokeResponse = await ctx.injectAuth({
      method: 'DELETE',
      url: `/orgs/${org.id}/invites/${inviteToRevoke.id}`
    }, owner);
    assert.equal(revokeResponse.statusCode, 204);

    const deleteAppResponse = await ctx.injectAuth({
      method: 'DELETE',
      url: `/orgs/${org.id}/apps/${childApp.id}`
    }, owner);
    assert.equal(deleteAppResponse.statusCode, 204);

    const actions = await ctx.prisma.auditEvent.findMany({
      where: { orgId: org.id },
      select: { action: true, outcome: true, metadata: true },
      orderBy: { createdAt: 'asc' }
    });
    const actionNames = new Set(actions.map(event => event.action));

    for (const expected of [
      'profile.update',
      'org.update',
      'app.create',
      'app.update',
      'app.delete',
      'environment.create',
      'environment.delete',
      'parameter.create',
      'parameter_override.create',
      'parameter_value.update',
      'parameter_value.clear',
      'parameter_value.reveal_current',
      'parameter_value.reveal_version',
      'parameter_value.rollback',
      'config.fetch',
      'parameters.export',
      'invite.create',
      'invite.preview',
      'invite.accept',
      'invite.revoke'
    ]) {
      assert.ok(actionNames.has(expected), `missing audit action ${expected}`);
    }

    const createdOrgAudit = await ctx.prisma.auditEvent.findFirst({
      where: { orgId: createdOrg.id, action: 'org.create' }
    });
    assert.ok(createdOrgAudit);

    const serialized = JSON.stringify(actions.map(event => event.metadata));
    assert.equal(serialized.includes('audit-secret-v1'), false);
    assert.equal(serialized.includes('audit-secret-v2'), false);
    assert.equal(serialized.includes(inviteToken), false);
    assert.ok(serialized.includes(hashToken(inviteToken)));
  });
});
