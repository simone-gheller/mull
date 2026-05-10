/**
 * App management routes
 * GET /apps - List all apps for an organization
 * POST /apps - Create new app
 */
import { uuidv7 } from 'uuidv7';
import { listAppsSchema, createAppSchema } from '../openapi/appRoutes.js';
import { uuidV7Param } from '../schemas/common.js';

const appIdParamsSchema = {
  type: 'object',
  required: ['orgId', 'appId'],
  properties: {
    orgId: uuidV7Param('Organization ID'),
    appId: uuidV7Param('Application ID'),
  },
};

export default async function appRoutes(fastify, _options) {
  const prisma = fastify.prisma;

  // GET /apps - List apps
  fastify.get('/apps', {
    onRequest: [fastify.authenticate, fastify.validateOrgAccess],
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
          depth: true,
          _count: {
            select: { parameters: true }
          }
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

  // GET /apps/:appId - Get single app
  fastify.get('/apps/:appId', {
    onRequest: [fastify.authenticate, fastify.validateOrgAccess],
    schema: { params: appIdParamsSchema },
  }, async (request, reply) => {
    const { orgId, appId } = request.params;

    const app = await prisma.app.findUnique({
      where: { id: appId },
      select: {
        id: true,
        orgId: true,
        parentId: true,
        name: true,
        ancestors: true,
        depth: true,
        _count: { select: { parameters: true } }
      }
    });

    if (!app) {
      return reply.code(404).send({ error: 'Not Found', message: 'App not found', statusCode: 404 });
    }

    if (app.orgId !== orgId) {
      return reply.code(403).send({ error: 'Forbidden', message: 'App does not belong to this organization', statusCode: 403 });
    }

    return reply.send(app);
  });

  // PATCH /apps/:appId - Update app
  fastify.patch('/apps/:appId', {
    onRequest: [fastify.authenticate, fastify.validateOrgAccess, fastify.requireRole('ADMIN')],
    schema: { params: appIdParamsSchema },
  }, async (request, reply) => {
    const { orgId, appId } = request.params;
    const { name } = request.body ?? {};

    const existing = await prisma.app.findUnique({
      where: { id: appId },
      select: { orgId: true, name: true }
    });

    if (!existing) {
      return reply.code(404).send({ error: 'Not Found', message: 'App not found', statusCode: 404 });
    }

    if (existing.orgId !== orgId) {
      await fastify.audit.log({
        request,
        orgId,
        action: 'app.update',
        resourceType: 'app',
        resourceId: appId,
        outcome: 'DENIED',
        metadata: { reason: 'cross_org' }
      });
      return reply.code(403).send({ error: 'Forbidden', message: 'App does not belong to this organization', statusCode: 403 });
    }

    if (!name?.trim()) {
      return reply.code(400).send({ error: 'Bad Request', message: 'No fields to update', statusCode: 400 });
    }

    try {
      const updated = await prisma.app.update({
        where: { id: appId },
        data: { name: name.trim() },
        select: { id: true, orgId: true, parentId: true, name: true, ancestors: true, depth: true }
      });
      await fastify.audit.log({
        request,
        orgId,
        action: 'app.update',
        resourceType: 'app',
        resourceId: updated.id,
        resourceLabel: updated.name,
        metadata: { previousName: existing.name, name: updated.name }
      });
      return reply.send(updated);
    } catch (err) {
      if (err.code === 'P2002') {
        return reply.code(409).send({ error: 'Conflict', message: 'App with this name already exists in organization', statusCode: 409 });
      }
      fastify.log.error(err, 'Failed to update app');
      return reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to update app', statusCode: 500 });
    }
  });

  // DELETE /apps/:appId - Delete app
  fastify.delete('/apps/:appId', {
    onRequest: [fastify.authenticate, fastify.validateOrgAccess, fastify.requireRole('ADMIN')],
    schema: { params: appIdParamsSchema },
  }, async (request, reply) => {
    const { orgId, appId } = request.params;

    const existing = await prisma.app.findUnique({
      where: { id: appId },
      select: { orgId: true, name: true }
    });

    if (!existing) {
      return reply.code(404).send({ error: 'Not Found', message: 'App not found', statusCode: 404 });
    }

    if (existing.orgId !== orgId) {
      await fastify.audit.log({
        request,
        orgId,
        action: 'app.delete',
        resourceType: 'app',
        resourceId: appId,
        outcome: 'DENIED',
        metadata: { reason: 'cross_org' }
      });
      return reply.code(403).send({ error: 'Forbidden', message: 'App does not belong to this organization', statusCode: 403 });
    }

    try {
      await prisma.app.delete({ where: { id: appId } });
      await fastify.audit.log({
        request,
        orgId,
        action: 'app.delete',
        resourceType: 'app',
        resourceId: appId,
        resourceLabel: existing.name
      });
      return reply.code(204).send();
    } catch (err) {
      fastify.log.error(err, 'Failed to delete app');
      return reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to delete app', statusCode: 500 });
    }
  });

  // POST /apps - Create app
  fastify.post('/apps', {
    onRequest: [fastify.authenticate, fastify.validateOrgAccess, fastify.requireRole('ADMIN')],
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
          depth: depth,
        },
        select: {
          id: true,
          orgId: true,
          parentId: true,
          name: true,
          ancestors: true,
          depth: true,
        }
      });

      fastify.log.info({
        appId: app.id,
        orgId: app.orgId,
        name: app.name,
        parentId: app.parentId,
        depth: app.depth
      }, 'App created');

      await fastify.audit.log({
        request,
        orgId,
        action: 'app.create',
        resourceType: 'app',
        resourceId: app.id,
        resourceLabel: app.name,
        metadata: { parentId: app.parentId, depth: app.depth }
      });

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
