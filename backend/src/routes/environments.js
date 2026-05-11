/**
 * Environment management routes
 * GET /environments - List all environments for an organization
 * POST /environments - Create new environment
 */
import { uuidv7 } from 'uuidv7';
import { listEnvironmentsSchema, createEnvironmentSchema, deleteEnvironmentSchema } from '../openapi/environmentRoutes.js';
import { syncEnvironmentParameterValues } from '../lib/syncParameterValues.js';

export default async function environmentRoutes(fastify, _options) {
  const prisma = fastify.prisma;

  // GET /environments - List environments
  fastify.get('/environments', {
    onRequest: [fastify.authenticate, fastify.validateOrgAccess, fastify.requireScope('environments:read')],
    schema: listEnvironmentsSchema
  }, async (request, reply) => {
    const { orgId } = request.params;

    try {
      const environments = await prisma.environment.findMany({
        where: {
          orgId: orgId,
          ...(request.auth?.credentialType === 'ACCESS_KEY' && request.auth.environmentId ? { id: request.auth.environmentId } : {})
        },
        select: {
          id: true,
          orgId: true,
          name: true,
          tier: true,
          protected: true
        },
        orderBy: { name: 'asc' }
      });

      return reply.send(environments);

    } catch (err) {
      fastify.log.error(err, 'Failed to list environments');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to list environments',
        statusCode: 500
      });
    }
  });

  // DELETE /environments/:envId - Delete environment (ADMIN+)
  fastify.delete('/environments/:envId', {
    onRequest: [fastify.authenticate, fastify.validateOrgAccess, fastify.requireScope('environments:manage')],
    schema: deleteEnvironmentSchema,
  }, async (request, reply) => {
    const { orgId, envId } = request.params;

    try {
      const env = await prisma.environment.findFirst({
        where: { id: envId, orgId },
        select: { id: true, name: true, tier: true, protected: true },
      });

      if (!env) {
        return reply.code(404).send({ error: 'Not Found', message: 'Environment not found', statusCode: 404 });
      }

      await prisma.environment.delete({ where: { id: envId } });
      await fastify.audit.log({
        request,
        orgId,
        action: 'environment.delete',
        resourceType: 'environment',
        resourceId: env.id,
        resourceLabel: env.name,
        metadata: { tier: env.tier, protected: env.protected }
      });
      return reply.code(204).send();

    } catch (err) {
      fastify.log.error(err, 'Failed to delete environment');
      return reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to delete environment', statusCode: 500 });
    }
  });

  fastify.patch('/environments/:envId', {
    onRequest: [fastify.authenticate, fastify.validateOrgAccess, fastify.requireScope('environments:manage')],
    schema: {
      tags: ['environments'],
      security: [{ bearerAuth: [] }],
      params: deleteEnvironmentSchema.params,
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          tier: { type: 'string', enum: ['DEVELOPMENT', 'STAGING', 'PRODUCTION', 'CUSTOM'] },
          protected: { type: 'boolean' }
        }
      }
    },
  }, async (request, reply) => {
    const { orgId, envId } = request.params;
    const existing = await prisma.environment.findFirst({
      where: { id: envId, orgId },
      select: { id: true }
    });
    if (!existing) {
      return reply.code(404).send({ error: 'Not Found', message: 'Environment not found', statusCode: 404 });
    }

    const tier = request.body.tier;
    const environment = await prisma.environment.update({
      where: { id: envId },
      data: {
        ...(request.body.name !== undefined ? { name: request.body.name.trim() } : {}),
        ...(tier !== undefined ? { tier } : {}),
        ...(request.body.protected !== undefined ? { protected: request.body.protected } : {})
      },
      select: { id: true, orgId: true, name: true, tier: true, protected: true }
    });
    await fastify.audit.log({
      request,
      orgId,
      action: 'environment.update',
      resourceType: 'environment',
      resourceId: environment.id,
      resourceLabel: environment.name,
      metadata: { tier: environment.tier, protected: environment.protected }
    });
    return reply.send(environment);
  });

  // POST /environments - Create environment
  fastify.post('/environments', {
    onRequest: [fastify.authenticate, fastify.validateOrgAccess, fastify.requireScope('environments:manage')],
    schema: createEnvironmentSchema
  }, async (request, reply) => {
    const { name, tier = 'CUSTOM' } = request.body;
    const protectedValue = request.body.protected ?? tier === 'PRODUCTION';
    const { orgId } = request.params;

    try {
      // Create environment (foreign key constraint will validate orgId)
      const environment = await prisma.environment.create({
        data: {
          id: uuidv7(),
          orgId: orgId,
          name: name.trim(),
          tier,
          protected: protectedValue,
        },
        select: {
          id: true,
          orgId: true,
          name: true,
          tier: true,
          protected: true
        }
      });

      // Sync parameter values for this new environment
      const syncedCount = await syncEnvironmentParameterValues(environment.id, orgId);

      fastify.log.info({
        environmentId: environment.id,
        orgId: environment.orgId,
        name: environment.name,
        syncedParameterValues: syncedCount
      }, 'Environment created and parameter values synced');

      await fastify.audit.log({
        request,
        orgId,
        action: 'environment.create',
        resourceType: 'environment',
        resourceId: environment.id,
        resourceLabel: environment.name,
        metadata: { tier: environment.tier, protected: environment.protected, syncedParameterValues: syncedCount }
      });

      return reply.code(201).send(environment);

    } catch (err) {
      // Handle unique constraint violation (duplicate name in same org)
      if (err.code === 'P2002') {
        return reply.code(409).send({
          error: 'Conflict',
          message: 'Environment with this name already exists in organization',
          statusCode: 409
        });
      }

      // Handle foreign key constraint violation (invalid orgId)
      if (err.code === 'P2003') {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Organization not found',
          statusCode: 404
        });
      }

      fastify.log.error(err, 'Failed to create environment');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create environment',
        statusCode: 500
      });
    }
  });
}
