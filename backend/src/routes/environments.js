/**
 * Environment management routes
 * GET /environments - List all environments for an organization
 * POST /environments - Create new environment
 */
import { uuidv7 } from 'uuidv7';
import { listEnvironmentsSchema, createEnvironmentSchema } from '../openapi/environmentRoutes.js';
import { syncEnvironmentParameterValues } from '../lib/syncParameterValues.js';

export default async function environmentRoutes(fastify, _options) {
  const prisma = fastify.prisma;

  // GET /environments - List environments
  fastify.get('/environments', {
    onRequest: [fastify.authenticate],
    schema: listEnvironmentsSchema
  }, async (request, reply) => {
    const { orgId } = request.params;

    try {
      const environments = await prisma.environment.findMany({
        where: { orgId: orgId },
        select: {
          id: true,
          orgId: true,
          name: true
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

  // POST /environments - Create environment
  fastify.post('/environments', {
    onRequest: [fastify.authenticate],
    schema: createEnvironmentSchema
  }, async (request, reply) => {
    const { name } = request.body;
    const { orgId } = request.params;

    try {
      // Create environment (foreign key constraint will validate orgId)
      const environment = await prisma.environment.create({
        data: {
          id: uuidv7(),
          orgId: orgId,
          name: name.trim()
        },
        select: {
          id: true,
          orgId: true,
          name: true
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
