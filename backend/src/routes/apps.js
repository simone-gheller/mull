/**
 * App management routes
 * GET /apps - List all apps for an organization
 * POST /apps - Create new app
 */
import { uuidv7 } from 'uuidv7';
import { listAppsSchema, createAppSchema } from '../openapi/appRoutes.js';

export default async function appRoutes(fastify, _options) {
  const prisma = fastify.prisma;

  // GET /apps - List apps
  fastify.get('/apps', {
    onRequest: [fastify.authenticate],
    schema: listAppsSchema
  }, async (request, reply) => {
    const { orgId } = request.params;

    try {
      const apps = await prisma.app.findMany({
        where: { orgId: orgId },
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

      // Return directly - no serialization needed with UUIDs
      return reply.send(apps);


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
  fastify.post('/apps', {
    onRequest: [fastify.authenticate],
    schema: createAppSchema
  }, async (request, reply) => {
    const { name, parentId } = request.body;
    const { orgId } = request.params;

    try {
      let ancestors = [];
      let depth = 0;

      // If parentId is provided, fetch parent's ancestors and depth
      if (parentId !== undefined && parentId !== null) {
        const parent = await prisma.app.findUnique({
          where: { id: parentId },
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
        if (parent.orgId !== orgId) {
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
          id: uuidv7(),
          orgId: orgId,
          name: name.trim(),
          parentId: parentId || null,
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
        appId: app.id,
        orgId: app.orgId,
        name: app.name,
        parentId: app.parentId,
        depth: app.depth
      }, 'App created');

      return reply.code(201).send(app);

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