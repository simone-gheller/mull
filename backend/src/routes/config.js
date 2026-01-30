/**
 * Config rendering route
 * GET /config/:appId/:envId
 * Returns flat key-value configuration with hierarchical inheritance
 */
export default async function configRoutes(fastify, _options) {
  const prisma = fastify.prisma;

  fastify.get('/config/:appId/:envId', async (request, reply) => {
    const { appId, envId } = request.params;
    const orgId = request.headers['x-org-id'] || request.query.orgId;

    // Validate orgId presence
    if (!orgId) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'orgId required (header: X-Org-Id or query: ?orgId=N)',
        statusCode: 400
      });
    }

    // Validate BigInt format
    try {
      BigInt(appId);
      BigInt(envId);
      BigInt(orgId);
    } catch (err) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'appId, envId, and orgId must be valid integers',
        statusCode: 400
      });
    }

    try {
      // 1. Validate app and environment in single query
      const validation = await prisma.$queryRaw`
        SELECT
          a.id as app_id,
          a.org_id as app_org_id,
          a.name as app_name,
          e.id as env_id,
          e.org_id as env_org_id,
          e.name as env_name
        FROM apps a
        CROSS JOIN environments e
        WHERE a.id = ${BigInt(appId)}
          AND e.id = ${BigInt(envId)}
      `;

      if (validation.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'App or Environment not found',
          statusCode: 404
        });
      }

      const { app_id, app_org_id, app_name, env_id, env_org_id, env_name } = validation[0];

      // Check both belong to same orgId
      if (app_org_id !== BigInt(orgId) || env_org_id !== BigInt(orgId)) {
        fastify.log.warn({
          appId,
          envId,
          orgId,
          appOrgId: app_org_id.toString(),
          envOrgId: env_org_id.toString()
        }, 'Cross-org access attempt');
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Access denied',
          statusCode: 403
        });
      }

      // 2. Query config_inheritance view
      const results = await prisma.$queryRaw`
        SELECT key, value, priority, source_app_name, source_app_id
        FROM config_inheritance
        WHERE app_id = ${BigInt(appId)}
          AND environment_id = ${BigInt(envId)}
          AND org_id = ${BigInt(orgId)}
      `;

      // 4. Build flat config object
      const config = {};
      for (const row of results) {
        config[row.key] = row.value;
      }

      // Log debug info server-side
      fastify.log.debug({
        app: { id: app_id.toString(), name: app_name },
        environment: { id: env_id.toString(), name: env_name },
        parametersCount: results.length,
        inheritance: results.map(r => ({
          key: r.key,
          source: r.source_app_name,
          priority: r.priority
        }))
      }, 'Config rendered');

      // Return flat key-value
      return reply.send(config);

    } catch (err) {
      fastify.log.error(err, 'Failed to render configuration');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to render configuration',
        statusCode: 500
      });
    }
  });
}