/**
 * Environment management routes
 * GET /environments - List all environments for an organization
 * POST /environments - Create new environment
 */
import { orgIdSchema, orgIdQuerySchema } from '../schemas/common.js';

// Validation schemas
const listEnvironmentsSchema = {
  headers: orgIdSchema,
  querystring: orgIdQuerySchema
};

const createEnvironmentSchema = {
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', minLength: 1 }
    }
  },
  headers: orgIdSchema,
  querystring: orgIdQuerySchema
};

export default async function environmentRoutes(fastify, _options) {
  const prisma = fastify.prisma;

  // GET /environments - List environments
  fastify.get('/environments', { schema: listEnvironmentsSchema }, async (request, reply) => {
    const orgId = request.headers['x-org-id'] || request.query.orgId;

    // Validate orgId presence (schema validates format)
    if (!orgId) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'orgId required (header: X-Org-Id or query: ?orgId=N)',
        statusCode: 400
      });
    }

    try {
      const environments = await prisma.environment.findMany({
        where: { orgId: BigInt(orgId) },
        select: {
          id: true,
          orgId: true,
          name: true
        },
        orderBy: { name: 'asc' }
      });

      // Convert BigInt to string for JSON serialization
      const serializedEnvironments = environments.map(env => ({
        id: env.id.toString(),
        orgId: env.orgId.toString(),
        name: env.name
      }));

      return reply.send(serializedEnvironments);

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
  fastify.post('/environments', { schema: createEnvironmentSchema }, async (request, reply) => {
    const { name } = request.body;
    const orgId = request.headers['x-org-id'] || request.query.orgId;

    // Validate orgId presence (schema validates format)
    if (!orgId) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'orgId required (header: X-Org-Id or query: ?orgId=N)',
        statusCode: 400
      });
    }

    try {
      // Create environment (foreign key constraint will validate orgId)
      const environment = await prisma.environment.create({
        data: {
          orgId: BigInt(orgId),
          name: name.trim()
        },
        select: {
          id: true,
          orgId: true,
          name: true
        }
      });

      fastify.log.info({
        environmentId: environment.id.toString(),
        orgId: environment.orgId.toString(),
        name: environment.name
      }, 'Environment created');

      return reply.code(201).send({
        id: environment.id.toString(),
        orgId: environment.orgId.toString(),
        name: environment.name
      });

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
