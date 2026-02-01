/**
 * Parameter management routes
 * GET /parameters - List all parameters for an app
 * POST /parameters - Create new parameter (creates empty ParameterValue for all environments)
 */
import { uuidv7 } from 'uuidv7';
import { listParametersSchema, createParameterSchema } from '../openapi/parameterRoutes.js';
import { syncParameterEnvironmentValues } from '../lib/syncParameterValues.js';

export default async function parameterRoutes(fastify, _options) {
  const prisma = fastify.prisma;

  // GET /parameters - List parameters for an app
  fastify.get('/parameters', { schema: listParametersSchema }, async (request, reply) => {
    const orgId = request.headers['x-org-id'] || request.query.orgId;
    const { appId } = request.query;

    // Validate orgId presence (schema validates format)
    if (!orgId) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'orgId required (header: X-Org-Id or query: ?orgId=N)',
        statusCode: 400
      });
    }

    try {
      // Verify app exists and belongs to org
      const app = await prisma.app.findUnique({
        where: { id: appId },
        select: { id: true, orgId: true }
      });

      if (!app) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'App not found',
          statusCode: 404
        });
      }

      if (app.orgId !== orgId) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'App does not belong to this organization',
          statusCode: 403
        });
      }

      // Get parameters for the app
      const parameters = await prisma.parameter.findMany({
        where: { appId: appId },
        select: {
          id: true,
          appId: true,
          key: true
        },
        orderBy: { key: 'asc' }
      });

      return reply.send(parameters);

    } catch (err) {
      fastify.log.error(err, 'Failed to list parameters');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to list parameters',
        statusCode: 500
      });
    }
  });

  // POST /parameters - Create parameter with empty values for all environments
  fastify.post('/parameters', { schema: createParameterSchema }, async (request, reply) => {
    const { appId, key } = request.body;
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
      // Verify app exists and belongs to org
      const app = await prisma.app.findUnique({
        where: { id: appId },
        select: { id: true, orgId: true }
      });

      if (!app) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'App not found',
          statusCode: 404
        });
      }

      if (app.orgId !== orgId) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'App does not belong to this organization',
          statusCode: 403
        });
      }

      // Create the parameter
      const parameter = await prisma.parameter.create({
        data: {
          id: uuidv7(),
          appId: appId,
          key: key.trim()
        },
        select: {
          id: true,
          appId: true,
          key: true
        }
      });

      // Sync parameter values for this new parameter
      const syncedCount = await syncParameterEnvironmentValues(parameter.id, orgId);

      fastify.log.info({
        parameterId: parameter.id,
        appId: parameter.appId,
        key: parameter.key,
        syncedParameterValues: syncedCount
      }, 'Parameter created and values synced');

      return reply.code(201).send(parameter);

    } catch (err) {
      // Handle unique constraint violation (duplicate key in same app)
      if (err.code === 'P2002') {
        return reply.code(409).send({
          error: 'Conflict',
          message: 'Parameter with this key already exists in app',
          statusCode: 409
        });
      }

      // Handle foreign key constraint violation
      if (err.code === 'P2003') {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'App not found',
          statusCode: 404
        });
      }

      fastify.log.error(err, 'Failed to create parameter');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create parameter',
        statusCode: 500
      });
    }
  });
}
