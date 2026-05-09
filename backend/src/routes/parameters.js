/**
 * Parameter management routes
 * GET /parameters - List all parameters for an app
 * POST /parameters - Create new parameter (creates empty ParameterValue for all environments)
 */
import { uuidv7 } from 'uuidv7';
import { listParametersSchema, createParameterSchema } from '../openapi/parameterRoutes.js';
import { syncParameterEnvironmentValues } from '../lib/syncParameterValues.js';
import { decryptParameterValue } from '../crypto/envelope.js';

const ROLE_CAN_READ_SECRET = new Set(['ADMIN', 'OWNER']);

function roleCanReadSecret(role) {
  return ROLE_CAN_READ_SECRET.has(role);
}

function buildSummary(items) {
  return {
    total: items.length,
    local: items.filter(item => item.relationship === 'local').length,
    inherited: items.filter(item => item.relationship === 'inherited').length,
    overrides: items.filter(item => item.relationship === 'override').length,
  };
}

export default async function parameterRoutes(fastify, _options) {
  const prisma = fastify.prisma;

  // GET /parameters/resolved - Full inheritance chain for an app
  fastify.get('/parameters/resolved', {
    onRequest: [fastify.authenticate, fastify.validateOrgAccess],
  }, async (request, reply) => {
    const { orgId } = request.params;
    const { appId, environmentId } = request.query;

    if (!appId) {
      return reply.code(400).send({ error: 'Bad Request', message: 'appId is required', statusCode: 400 });
    }

    try {
      const app = await prisma.app.findUnique({
        where: { id: appId },
        select: { id: true, name: true, orgId: true, ancestors: true },
      });

      if (!app) return reply.code(404).send({ error: 'Not Found', message: 'App not found', statusCode: 404 });
      if (app.orgId !== orgId) return reply.code(403).send({ error: 'Forbidden', message: 'App does not belong to this organization', statusCode: 403 });

      let environment = null;
      if (environmentId) {
        environment = await prisma.environment.findUnique({
          where: { id: environmentId },
          select: { id: true, name: true, orgId: true, isSecret: true },
        });
        if (!environment) return reply.code(404).send({ error: 'Not Found', message: 'Environment not found', statusCode: 404 });
        if (environment.orgId !== orgId) return reply.code(403).send({ error: 'Forbidden', message: 'Environment does not belong to this organization', statusCode: 403 });
      }

      // Full chain from root to current: [...ancestors, appId]
      const chain = [...app.ancestors, app.id];
      const chainRank = new Map(chain.map((id, index) => [id, index]));

      const parameters = await prisma.parameter.findMany({
        where: { appId: { in: chain } },
        select: {
          id: true,
          key: true,
          description: true,
          isSecret: true,
          appId: true,
          app: { select: { id: true, name: true, depth: true } },
        },
        orderBy: { key: 'asc' },
      });

      const byKey = new Map();
      for (const parameter of parameters) {
        if (!byKey.has(parameter.key)) byKey.set(parameter.key, []);
        byKey.get(parameter.key).push(parameter);
      }

      const allValues = environmentId
        ? await prisma.parameterValue.findMany({
            where: {
              environmentId,
              parameterId: { in: parameters.map(parameter => parameter.id) }
            },
            include: {
              parameter: {
                select: {
                  id: true,
                  appId: true,
                  key: true,
                  isSecret: true,
                  app: { select: { id: true, name: true } }
                }
              }
            }
          })
        : [];
      const valueByParameterId = new Map(allValues.map(value => [value.parameterId, value]));
      const isAdmin = roleCanReadSecret(request.orgRole);

      const items = [...byKey.entries()]
        .map(([key, candidates]) => {
          const ordered = candidates
            .slice()
            .sort((a, b) => chainRank.get(a.appId) - chainRank.get(b.appId));
          const winner = ordered[ordered.length - 1];
          const ancestor = ordered
            .slice(0, -1)
            .filter(parameter => parameter.appId !== app.id)
            .at(-1) ?? null;
          const relationship = winner.appId === app.id
            ? ancestor ? 'override' : 'local'
            : 'inherited';

          let value = null;
          if (environment) {
            const valueWinner = ordered
              .slice()
              .reverse()
              .map(parameter => valueByParameterId.get(parameter.id))
              .find(candidate => candidate?.isSet);

            if (!valueWinner) {
              value = {
                state: 'unset',
                valueId: null,
                parameterId: null,
                environmentId: environment.id,
                value: null,
                sourceAppId: null,
                sourceAppName: null,
                isSecret: winner.isSecret || environment.isSecret,
                isSet: false,
                canRead: true,
                canWrite: !(winner.isSecret || environment.isSecret) || isAdmin,
              };
            } else {
              const isSecretValue = valueWinner.parameter.isSecret || environment.isSecret;
              const canRead = !isSecretValue || isAdmin;
              const sourceIsCurrentApp = valueWinner.parameter.appId === app.id;
              value = {
                state: canRead ? sourceIsCurrentApp ? 'set' : 'inherited' : 'redacted',
                valueId: valueWinner.id,
                parameterId: valueWinner.parameterId,
                environmentId: valueWinner.environmentId,
                value: canRead ? decryptParameterValue(valueWinner) : null,
                sourceAppId: valueWinner.parameter.appId,
                sourceAppName: valueWinner.parameter.app.name,
                isSecret: isSecretValue,
                isSet: valueWinner.isSet,
                canRead,
                canWrite: !isSecretValue || isAdmin,
              };
            }
          }

          return {
            key,
            relationship,
            parameter: {
              id: winner.id,
              appId: winner.appId,
              appName: winner.app.name,
              description: winner.description,
              isSecret: winner.isSecret,
            },
            overridden: relationship === 'override' && ancestor
              ? {
                  parameterId: ancestor.id,
                  appId: ancestor.appId,
                  appName: ancestor.app.name,
                }
              : null,
            value,
          };
        })
        .sort((a, b) => a.key.localeCompare(b.key));

      return reply.send({
        app: { id: app.id, name: app.name },
        environment: environment ? { id: environment.id, name: environment.name, isSecret: environment.isSecret } : null,
        summary: buildSummary(items),
        items,
      });

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
          isSet: v.isSet,
          value: v.isSet ? decryptParameterValue(v) : '',
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
          isSecret: true,
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
    const { appId, key, description, isSecret } = request.body;
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
          ...(isSecret !== undefined ? { isSecret } : {}),
        },
        select: {
          id: true,
          appId: true,
          key: true,
          description: true,
          isSecret: true,
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
