/**
 * Config rendering route
 * GET /config/:appId/:envId
 * Returns flat key-value configuration with hierarchical inheritance
 */
import { getConfigSchema } from '../openapi/configRoutes.js';
import { decryptParameterValue } from '../crypto/envelope.js';

export default async function configRoutes(fastify, _options) {
  const prisma = fastify.prisma;

  fastify.get('/config/:appId/:envId', {
    onRequest: [fastify.authenticate, fastify.validateOrgAccess],
    schema: getConfigSchema
  }, async (request, reply) => {
    const { appId, envId, orgId } = request.params;

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
        WHERE a.id = ${appId}::uuid
          AND e.id = ${envId}::uuid
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
      if (app_org_id !== orgId || env_org_id !== orgId) {
        fastify.log.warn({
          appId,
          envId,
          orgId,
          appOrgId: app_org_id,
          envOrgId: env_org_id
        }, 'Cross-org access attempt');
        await fastify.audit.log({
          request,
          orgId,
          action: 'config.fetch',
          resourceType: 'config',
          resourceId: `${appId}:${envId}`,
          outcome: 'DENIED',
          metadata: { appId, envId, reason: 'cross_org' }
        });
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Access denied',
          statusCode: 403
        });
      }

      // 2. Query config_inheritance view
      const results = await prisma.$queryRaw`
        SELECT
          key,
          priority,
          source_app_name,
          source_app_id,
          parameter_value_id,
          parameter_id,
          environment_id,
          value_ciphertext,
          value_iv,
          value_tag,
          dek_ciphertext,
          dek_iv,
          dek_tag,
          kek_version,
          encryption_alg
        FROM config_inheritance
        WHERE app_id = ${appId}::uuid
          AND environment_id = ${envId}::uuid
          AND org_id = ${orgId}::uuid
      `;

      // 4. Build flat config object
      const config = {};
      for (const row of results) {
        config[row.key] = decryptParameterValue(row);
      }

      // Log debug info server-side
      fastify.log.debug({
        app: { id: app_id, name: app_name },
        environment: { id: env_id, name: env_name },
        parametersCount: results.length,
        inheritance: results.map(r => ({
          key: r.key,
          source: r.source_app_name,
          priority: r.priority
        }))
      }, 'Config rendered');

      await fastify.audit.log({
        request,
        orgId,
        action: 'config.fetch',
        resourceType: 'config',
        resourceId: `${appId}:${envId}`,
        resourceLabel: `${app_name} · ${env_name}`,
        metadata: {
          appId,
          envId,
          appName: app_name,
          environmentName: env_name,
          parametersCount: results.length
        }
      });

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
