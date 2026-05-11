import fp from 'fastify-plugin';
import { isUuidV7 } from '../schemas/common.js';
import { hasScope, isAccessKeyToken, parseAccessKeyToken, verifyAccessKeyToken } from '../lib/accessKeys.js';
import {
  environmentToContext,
  hasPermission,
  roleAtLeast,
  roleToAuthFields
} from '../lib/rbac.js';

function userDisplay(user) {
  return user?.displayName || user?.email || user?.id || null;
}

function toUserWithMemberships(raw) {
  return {
    ...raw,
    organizations: raw.organizations.map(m => ({
      id: m.orgId,
      name: m.org.name,
      roleId: m.roleId,
      roleKey: m.role.key,
      roleName: m.role.name,
      role: m.role.key,
      permissions: m.role.permissions
    }))
  };
}

function decorateTestJwtAuth(request, user) {
  request.user = user;
  request.accessKey = null;
  request.auth = {
    identityType: 'USER',
    identityId: user.id,
    identityName: userDisplay(user),
    credentialType: 'SUPABASE_JWT',
    credentialId: null,
    credentialPrefix: null,
    orgId: null,
    orgRole: null,
    roleId: null,
    roleKey: null,
    roleName: null,
    permissions: [],
    scopes: [],
    appId: null,
    environmentId: null,
    delegatedUserId: user.id
  };
}

function decorateAccessKeyAuth(request, { accessKey, delegatedUser }) {
  request.user = toUserWithMemberships(delegatedUser);
  request.accessKey = accessKey;
  request.auth = {
    identityType: accessKey.identity.type,
    identityId: accessKey.identity.id,
    identityName: accessKey.identity.name,
    credentialType: 'ACCESS_KEY',
    credentialId: accessKey.id,
    credentialPrefix: accessKey.tokenPrefix,
    orgId: accessKey.identity.type === 'SERVICE' ? accessKey.identity.orgId : null,
    orgRole: null,
    roleId: null,
    roleKey: null,
    roleName: null,
    permissions: [],
    scopes: accessKey.scopes,
    appId: accessKey.appId,
    environmentId: accessKey.environmentId,
    delegatedUserId: delegatedUser.id
  };
}

async function testAuthPlugin(fastify) {
  fastify.decorate('authenticate', async function (request, reply) {
    const bearer = request.headers.authorization?.replace('Bearer ', '');
    if (isAccessKeyToken(bearer)) {
      const parsed = parseAccessKeyToken(bearer);
      const accessKey = parsed ? await fastify.prisma.accessKey.findUnique({
        where: { id: parsed.keyId },
        include: {
          identity: {
            include: {
              ownerUser: {
                include: { organizations: { include: { org: { select: { id: true, name: true } }, role: true } } }
              }
            }
          },
          createdByUser: {
            include: { organizations: { include: { org: { select: { id: true, name: true } }, role: true } } }
          }
        }
      }) : null;
      const now = new Date();
      if (
        !accessKey ||
        !verifyAccessKeyToken(bearer, accessKey.tokenHash) ||
        accessKey.revokedAt ||
        accessKey.identity.disabledAt ||
        (accessKey.expiresAt && accessKey.expiresAt <= now)
      ) {
        return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or expired access key', statusCode: 401 });
      }
      const delegatedUser = accessKey.identity.type === 'USER'
        ? accessKey.createdByUser
        : accessKey.identity.ownerUser || accessKey.createdByUser;
      decorateAccessKeyAuth(request, { accessKey, delegatedUser });
      await fastify.prisma.accessKey.update({ where: { id: accessKey.id }, data: { lastUsedAt: now } });
      return;
    }

    const userId = request.headers['x-test-user-id'];
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized', message: 'Missing x-test-user-id', statusCode: 401 });
    }

    const raw = await fastify.prisma.user.findUnique({
      where: { id: userId },
      include: { organizations: { include: { org: { select: { id: true, name: true } }, role: true } } }
    });
    if (!raw) {
      return reply.code(401).send({ error: 'Unauthorized', message: 'User not found', statusCode: 401 });
    }

    decorateTestJwtAuth(request, toUserWithMemberships(raw));
  });

  fastify.decorate('validateOrgAccess', async function (request, reply) {
    const { orgId } = request.params;
    if (!isUuidV7(orgId)) {
      return reply.code(400).send({ error: 'Bad Request', message: 'Invalid orgId', statusCode: 400 });
    }

    if (request.auth?.identityType === 'SERVICE') {
      if (request.auth.orgId !== orgId) {
        return reply.code(403).send({ error: 'Forbidden', message: 'Access key cannot access this organization', statusCode: 403 });
      }
      request.orgRole = null;
      request.auth.orgRole = null;
      return;
    }

    const membership = request.user.organizations?.find(o => o.id === orgId);
    if (!membership) {
      return reply.code(403).send({ error: 'Forbidden', message: 'Not a member of this organization', statusCode: 403 });
    }
    request.orgRole = membership.roleKey;
    const roleFields = roleToAuthFields({
      id: membership.roleId,
      key: membership.roleKey,
      name: membership.roleName,
      permissions: membership.permissions
    });
    request.auth.orgId = orgId;
    request.auth.orgRole = membership.roleKey;
    request.auth.roleId = roleFields.roleId;
    request.auth.roleKey = roleFields.roleKey;
    request.auth.roleName = roleFields.roleName;
    request.auth.permissions = roleFields.permissions;
  });

  fastify.decorate('requireScope', (scope, options = {}) => {
    return async function (request, reply) {
      let context = options.context ?? {};
      if (options.loadEnvironment && request.params?.id) {
        const value = await fastify.prisma.parameterValue.findUnique({
          where: { id: request.params.id },
          select: { environment: { select: { id: true, tier: true, protected: true } } }
        });
        context = environmentToContext(value?.environment);
      }
      if (request.auth?.credentialType === 'ACCESS_KEY') {
        const roleAuth = { ...request.auth, credentialType: 'SUPABASE_JWT', scopes: [] };
        if (
          hasScope(request.auth, scope) &&
          (request.auth.identityType === 'SERVICE' || hasPermission(roleAuth, scope, context))
        ) return;
      } else if (hasPermission(request.auth, scope, context)) {
        return;
      }
      return reply.code(403).send({ error: 'Forbidden', message: `Requires scope ${scope}`, statusCode: 403 });
    };
  });

  fastify.decorate('requireJwtAuth', () => {
    return async function (request, reply) {
      if (request.auth?.credentialType === 'SUPABASE_JWT') return;
      return reply.code(403).send({ error: 'Forbidden', message: 'Requires user session authentication', statusCode: 403 });
    };
  });

  fastify.decorate('enforceAccessKeyResource', async function (request, reply, resource = {}) {
    if (request.auth?.credentialType !== 'ACCESS_KEY') return true;
    if (request.auth.appId && resource.appId && request.auth.appId !== resource.appId) {
      reply.code(403).send({ error: 'Forbidden', message: 'Access key is not scoped to this app', statusCode: 403 });
      return false;
    }
    if (request.auth.environmentId && resource.environmentId && request.auth.environmentId !== resource.environmentId) {
      reply.code(403).send({ error: 'Forbidden', message: 'Access key is not scoped to this environment', statusCode: 403 });
      return false;
    }
    return true;
  });

  fastify.decorate('requireRole', (minRole, options = {}) => {
    return async function (request, reply) {
      if (options.onlyIfSecret) return;
      if (request.auth?.credentialType === 'ACCESS_KEY' && request.auth.identityType === 'SERVICE') {
        return;
      }
      if (!request.orgRole || !roleAtLeast(request.orgRole, minRole)) {
        return reply.code(403).send({ error: 'Forbidden', message: `Requires ${minRole} or higher`, statusCode: 403 });
      }
    };
  });
}

export default fp(testAuthPlugin, {
  name: 'test-auth-plugin',
  fastify: '5.x'
});
