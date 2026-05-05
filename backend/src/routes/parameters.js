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

  // GET /parameters/resolved - Full inheritance chain for an app
  fastify.get('/parameters/resolved', {
    onRequest: [fastify.authenticate, fastify.validateOrgAccess],
  }, async (request, reply) => {
    const { orgId } = request.params;
    const { appId } = request.query;

    if (!appId) {
      return reply.code(400).send({ error: 'Bad Request', message: 'appId is required', statusCode: 400 });
    }

    try {
      const app = await prisma.app.findUnique({
        where: { id: appId },
        select: { id: true, orgId: true, ancestors: true },
      });

      if (!app) return reply.code(404).send({ error: 'Not Found', message: 'App not found', statusCode: 404 });
      if (app.orgId !== orgId) return reply.code(403).send({ error: 'Forbidden', message: 'App does not belong to this organization', statusCode: 403 });

      // Full chain from root to current: [...ancestors, appId]
      const chain = [...app.ancestors, app.id];

      const parameters = await prisma.parameter.findMany({
        where: { appId: { in: chain } },
        select: {
          id: true,
          key: true,
          description: true,
          appId: true,
          app: { select: { id: true, name: true, depth: true } },
        },
        orderBy: { key: 'asc' },
      });

      // Resolve: child overrides ancestor for same key (chain is root→current)
      // Track which keys exist in ancestor apps so we can flag overrides
      const ancestorByKey = new Map(); // key → { appName }
      const resolved = new Map();

      // Sort root→current (ascending depth) so deeper entries overwrite shallower ones.
      // After the loop:
      //   resolved[key]      = the winning parameter (nearest ancestor or own)
      //   ancestorByKey[key] = the nearest ancestor that has this key (not current app)
      parameters
        .slice()
        .sort((a, b) => (a.app.depth ?? 0) - (b.app.depth ?? 0))
        .forEach(p => {
          if (p.app.id !== app.id) {
            // Always overwrite: last written = nearest ancestor (highest depth before current)
            ancestorByKey.set(p.key, {
              appName: p.app.name,
              appId: p.appId,
              paramId: p.id,
            });
          }
          resolved.set(p.key, p);
        });

      const result = [...resolved.values()].map(p => {
        const isOwn = p.appId === app.id;
        const ancestor = ancestorByKey.get(p.key);
        const isOverride = isOwn && !!ancestor;
        return {
          id: p.id,
          key: p.key,
          description: p.description,
          appId: p.appId,
          appName: p.app.name,
          isOwn,
          isOverride,
          overriddenFromAppName:  isOverride ? ancestor.appName  : null,
          overrideSourceAppId:    isOverride ? ancestor.appId    : null,
          overrideSourceParamId:  isOverride ? ancestor.paramId  : null,
        };
      });

      return reply.send(result);

    } catch (err) {
      fastify.log.error(err, 'Failed to resolve parameters');
      return reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to resolve parameters', statusCode: 500 });
    }
  });

  // POST /parameters/override - Create or retrieve an override parameter in a child app
  fastify.post('/parameters/override', {
    onRequest: [fastify.authenticate, fastify.validateOrgAccess],
  }, async (request, reply) => {
    const { orgId } = request.params;
    const { key, appId, description } = request.body;

    if (!key || !appId) {
      return reply.code(400).send({ error: 'Bad Request', message: 'key and appId are required', statusCode: 400 });
    }

    try {
      const app = await prisma.app.findUnique({
        where: { id: appId },
        select: { id: true, orgId: true },
      });

      if (!app) return reply.code(404).send({ error: 'Not Found', message: 'App not found', statusCode: 404 });
      if (app.orgId !== orgId) return reply.code(403).send({ error: 'Forbidden', message: 'App does not belong to this organization', statusCode: 403 });

      // Find or create the override parameter
      let parameter = await prisma.parameter.findUnique({
        where: { appId_key: { appId, key } },
        select: { id: true, key: true, description: true, appId: true },
      });

      if (!parameter) {
        parameter = await prisma.parameter.create({
          data: {
            id: uuidv7(),
            appId,
            key: key.trim(),
            ...(description ? { description: description.trim() } : {}),
          },
          select: { id: true, key: true, description: true, appId: true },
        });
        await syncParameterEnvironmentValues(parameter.id, orgId);
      }

      // Return parameter + its current values
      const values = await prisma.parameterValue.findMany({
        where: { parameterId: parameter.id },
        include: { environment: { select: { id: true, name: true } } },
        orderBy: { environment: { name: 'asc' } },
      });

      return reply.send({
        parameter,
        values: values.map(v => ({
          id: v.id,
          environmentId: v.environmentId,
          environmentName: v.environment.name,
          value: v.value,
        })),
      });

    } catch (err) {
      fastify.log.error(err, 'Failed to create parameter override');
      return reply.code(500).send({ error: 'Internal Server Error', message: 'Failed to create parameter override', statusCode: 500 });
    }
  });

  // GET /parameters - List parameters for an app
  fastify.get('/parameters', {
    onRequest: [fastify.authenticate, fastify.validateOrgAccess],
    schema: listParametersSchema
  }, async (request, reply) => {
    const { orgId } = request.params;
    const { appId } = request.query;

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
          key: true,
          description: true,
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
  fastify.post('/parameters', {
    onRequest: [fastify.authenticate, fastify.validateOrgAccess],
    schema: createParameterSchema
  }, async (request, reply) => {
    const { appId, key, description } = request.body;
    const { orgId } = request.params;

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
          key: key.trim(),
          ...(description ? { description: description.trim() } : {}),
        },
        select: {
          id: true,
          appId: true,
          key: true,
          description: true,
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
