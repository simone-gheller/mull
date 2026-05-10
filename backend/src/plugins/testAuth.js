import fp from 'fastify-plugin';
import { isUuidV7 } from '../schemas/common.js';

async function testAuthPlugin(fastify) {
  fastify.decorate('authenticate', async function (request, reply) {
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

    request.user = {
      ...raw,
      organizations: raw.organizations.map(m => ({ id: m.orgId, name: m.org.name, role: m.role }))
    };
  });

  fastify.decorate('validateOrgAccess', async function (request, reply) {
    const { orgId } = request.params;
    if (!isUuidV7(orgId)) {
      return reply.code(400).send({ error: 'Bad Request', message: 'Invalid orgId', statusCode: 400 });
    }

    const membership = request.user.organizations?.find(o => o.id === orgId);
    if (!membership) {
      return reply.code(403).send({ error: 'Forbidden', message: 'Not a member of this organization', statusCode: 403 });
    }
    request.orgRole = membership.role;
  });

  fastify.decorate('requireRole', (minRole, options = {}) => {
    const HIERARCHY = ['USER', 'ADMIN', 'OWNER'];
    return async function (request, reply) {
      if (options.onlyIfSecret) {
        try {
          let isSecret = false;
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
              isSecret = !!(pv.parameter?.isSecret || pv.environment?.isSecret);
            }
          }
          if (!isSecret) return;
        } catch {
          return;
        }
      }
      if (!request.orgRole || HIERARCHY.indexOf(request.orgRole) < HIERARCHY.indexOf(minRole)) {
        return reply.code(403).send({ error: 'Forbidden', message: `Requires ${minRole} or higher`, statusCode: 403 });
      }
    };
  });
}

export default fp(testAuthPlugin, {
  name: 'test-auth-plugin',
  fastify: '5.x'
});
