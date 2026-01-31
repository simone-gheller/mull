/**
 * App management routes
 * GET /apps - List all apps for an organization
 * POST /apps - Create new app
 */
import { orgIdSchema, orgIdQuerySchema } from '../schemas/common.js';

// Validation schemas
const listAppsSchema = {
  headers: orgIdSchema,
  querystring: orgIdQuerySchema
};

const createAppSchema = {
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', minLength: 1 },
      parentId: { type: 'string', pattern: '^[0-9]+$' }
    }
  },
  headers: orgIdSchema,
  querystring: orgIdQuerySchema
};

export default async function appRoutes(fastify, _options) {
  const prisma = fastify.prisma;

  // GET /apps - List apps
  fastify.get('/apps', { schema: listAppsSchema }, async (request, reply) => {
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
      const apps = await prisma.app.findMany({
        where: { orgId: BigInt(orgId) },
        select: {
          id: true,
          orgId: true,
          parentId: true,
          name: true,
          ancestors: true,
          depth: true
        },
        orderBy: [
          { depth: 'asc' },
          { name: 'asc' }
        ]
      });

      // Convert BigInt to string for JSON serialization
      const serializedApps = apps.map(app => ({
        id: app.id.toString(),
        orgId: app.orgId.toString(),
        parentId: app.parentId?.toString() || null,
        name: app.name,
        ancestors: app.ancestors.map(id => id.toString()),
        depth: app.depth
      }));

      return reply.send(serializedApps);

    } catch (err) {
      fastify.log.error(err, 'Failed to list apps');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to list apps',
        statusCode: 500
      });
    }
  });

  // POST /apps - Create app
  fastify.post('/apps', { schema: createAppSchema }, async (request, reply) => {
    const { name, parentId } = request.body;
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
      let ancestors = [];
      let depth = 0;

      // If parentId is provided, fetch parent's ancestors and depth
      if (parentId !== undefined && parentId !== null) {
        const parent = await prisma.app.findUnique({
          where: { id: BigInt(parentId) },
          select: { id: true, orgId: true, ancestors: true, depth: true }
        });

        if (!parent) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Parent app not found',
            statusCode: 404
          });
        }

        // Verify parent belongs to same org
        if (parent.orgId !== BigInt(orgId)) {
          return reply.code(403).send({
            error: 'Forbidden',
            message: 'Parent app does not belong to this organization',
            statusCode: 403
          });
        }

        // Build ancestors array: parent's ancestors + parent itself
        ancestors = [...parent.ancestors, parent.id];
        depth = parent.depth + 1;
      }

      // Create app
      const app = await prisma.app.create({
        data: {
          orgId: BigInt(orgId),
          name: name.trim(),
          parentId: parentId ? BigInt(parentId) : null,
          ancestors: ancestors,
          depth: depth
        },
        select: {
          id: true,
          orgId: true,
          parentId: true,
          name: true,
          ancestors: true,
          depth: true
        }
      });

      fastify.log.info({
        appId: app.id.toString(),
        orgId: app.orgId.toString(),
        name: app.name,
        parentId: app.parentId?.toString(),
        depth: app.depth
      }, 'App created');

      return reply.code(201).send({
        id: app.id.toString(),
        orgId: app.orgId.toString(),
        parentId: app.parentId?.toString() || null,
        name: app.name,
        ancestors: app.ancestors.map(id => id.toString()),
        depth: app.depth
      });

    } catch (err) {
      // Handle unique constraint violation (duplicate name in same org)
      if (err.code === 'P2002') {
        return reply.code(409).send({
          error: 'Conflict',
          message: 'App with this name already exists in organization',
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

      fastify.log.error(err, 'Failed to create app');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create app',
        statusCode: 500
      });
    }
  });
}