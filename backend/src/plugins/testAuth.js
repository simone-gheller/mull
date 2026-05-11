import fp from 'fastify-plugin';
import { isUuidV7 } from '../schemas/common.js';
import { isSecretValue, roleAtLeast } from '../lib/secretPolicy.js';
import { hasScope, isAccessKeyToken, parseAccessKeyToken, verifyAccessKeyToken } from '../lib/accessKeys.js';

function userDisplay(user) {
  return user?.displayName || user?.email || user?.id || null;
}

function toUserWithMemberships(raw) {
  return {
    ...raw,
    organizations: raw.organizations.map(m => ({ id: m.orgId, name: m.org.name, role: m.role }))
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
    scopes: ['*'],
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
                include: { organizations: { include: { org: { select: { id: true, name: true } } } } }
              }
            }
          },
          createdByUser: {
            include: { organizations: { include: { org: { select: { id: true, name: true } } } } }
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
      include: { organizations: { include: { org: { select: { id: true, name: true } } } } }
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
    request.orgRole = membership.role;
    request.auth.orgId = orgId;
    request.auth.orgRole = membership.role;
  });

  fastify.decorate('requireScope', (scope) => {
    return async function (request, reply) {
      if (hasScope(request.auth, scope)) return;
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
      if (options.onlyIfSecret) {
        try {
          let secret = false;
          const appId = request.params.appId;
          if (appId) {
            return;
          } else if (request.params.id) {
            const pv = await fastify.prisma.parameterValue.findUnique({
              where: { id: request.params.id },
              include: {
                parameter: { select: { isSecret: true } },
                environment: { select: { isSecret: true } }
              }
            });
            if (pv) {
              secret = isSecretValue(pv);
            }
          }
          if (!secret) return;
        } catch {
          return;
        }
      }
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
