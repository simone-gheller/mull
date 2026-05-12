import {
  getParameterValuesSchema,
  getParameterValueByIdSchema,
  updateParameterValueSchema,
  getParameterValueHistorySchema,
  revealParameterValueVersionSchema,
  rollbackParameterValueSchema
} from '../openapi/parameterValueRoutes.js';
import { uuidv7 } from 'uuidv7';
import {
  decryptParameterValue,
  decryptParameterValueVersion,
  encryptedParameterValueData,
  encryptedParameterValueVersionData
} from '../crypto/envelope.js';
import { getParameterValueVersionLimit } from '../lib/planLimits.js';
import { canRevealConfig, canWriteConfig } from '../lib/rbac.js';

/**
 * @param {import('fastify').FastifyInstance} fastify
 */
export default async function parameterValueRoutes(fastify) {
  const { prisma } = fastify;

  function forbiddenConfigReply(reply, scope = 'config:reveal') {
    return reply.code(403).send({
      error: 'Forbidden',
      message: `Requires ${scope} for this environment`,
      statusCode: 403
    });
  }

  async function createVersionSnapshot(tx, { parameterValue, userId, changeType, rolledBackFromVersionId = null }) {
    const versionId = uuidv7();
    const maxVersion = await tx.parameterValueVersion.aggregate({
      where: { parameterValueId: parameterValue.id },
      _max: { versionNumber: true }
    });
    const versionNumber = (maxVersion._max.versionNumber ?? 0) + 1;
    const value = parameterValue.isSet ? decryptParameterValue(parameterValue) : '';

    return tx.parameterValueVersion.create({
      data: {
        id: versionId,
        parameterValueId: parameterValue.id,
        parameterId: parameterValue.parameterId,
        environmentId: parameterValue.environmentId,
        createdByUserId: userId,
        versionNumber,
        changeType,
        rolledBackFromVersionId,
        isSet: parameterValue.isSet,
        ...encryptedParameterValueVersionData({
          value,
          parameterValueVersionId: versionId,
          parameterValueId: parameterValue.id,
          parameterId: parameterValue.parameterId,
          environmentId: parameterValue.environmentId
        })
      }
    });
  }

  async function pruneVersionHistory(tx, parameterValueId, limit) {
    if (limit === null) return;

    const versions = await tx.parameterValueVersion.findMany({
      where: { parameterValueId },
      orderBy: [{ versionNumber: 'desc' }],
      select: { id: true }
    });

    const staleIds = versions.slice(limit).map(version => version.id);
    if (staleIds.length > 0) {
      await tx.parameterValueVersion.deleteMany({
        where: { id: { in: staleIds } }
      });
    }
  }

  async function loadParameterValue(id) {
    return prisma.parameterValue.findUnique({
      where: { id },
      include: {
        parameter: {
          select: {
            id: true,
            key: true,
            appId: true,
          }
        },
        environment: {
          select: {
            id: true,
            name: true,
            orgId: true,
            tier: true,
            protected: true,
            organization: {
              select: {
                id: true,
                plan: true
              }
            }
          }
        }
      }
    });
  }

  /**
   * GET /parameters/:appId/values - List all parameter values for an app
   */
  fastify.get(
    '/parameters/:appId/values',
    {
      onRequest: [fastify.authenticate, fastify.validateOrgAccess, fastify.requireScope('parameters:read')],
      schema: getParameterValuesSchema
    },
    async (request, reply) => {
      const { appId, orgId } = request.params;

      // Verify app exists and belongs to organization
      const app = await prisma.app.findUnique({
        where: { id: appId },
        select: { id: true, orgId: true }
      });

      if (!app) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'App not found'
        });
      }

      if (app.orgId !== orgId) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'App does not belong to this organization'
        });
      }
      if (!await fastify.enforceAccessKeyResource(request, reply, { appId })) return;

      // Get all parameters for this app
      const parameters = await prisma.parameter.findMany({
        where: { appId: appId },
        select: { id: true }
      });

      const parameterIds = parameters.map(p => p.id);

      // Get all parameter values for these parameters
      const parameterValues = await prisma.parameterValue.findMany({
        where: {
          parameterId: { in: parameterIds },
          ...(request.auth?.credentialType === 'ACCESS_KEY' && request.auth.environmentId ? { environmentId: request.auth.environmentId } : {})
        },
        include: {
          parameter: {
            select: {
              id: true,
              appId: true,
              key: true,
            }
          },
          environment: {
            select: {
              id: true,
              name: true,
              tier: true,
              protected: true,
            }
          }
        },
        orderBy: [
          {
            environment: {
              name: 'asc'
            }
          },
          {
            parameter: {
              key: 'asc'
            }
          }
        ]
      });

      // Group by environment, redacting values the caller is not allowed to read
      const grouped = {};
      for (const pv of parameterValues) {
        const envName = pv.environment.name;
        if (!grouped[envName]) {
          grouped[envName] = {
            environmentId: pv.environmentId,
            values: []
          };
        }
        const canRead = canRevealConfig(request, { environment: pv.environment });
        grouped[envName].values.push({
          id: pv.id,
          parameterId: pv.parameterId,
          parameterKey: pv.parameter.key,
          isSet: pv.isSet,
          value: !pv.isSet || !canRead ? null : decryptParameterValue(pv),
        });
      }

      return reply.send(grouped);
    }
  );

  /**
   * GET /parameters/values/:id/history - List historical versions without plaintext
   */
  fastify.get(
    '/parameters/values/:id/history',
    {
      onRequest: [fastify.authenticate, fastify.validateOrgAccess, fastify.requireScope('parameters:read')],
      schema: getParameterValueHistorySchema
    },
    async (request, reply) => {
      const { id, orgId } = request.params;
      const parameterValue = await loadParameterValue(id);

      if (!parameterValue) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Parameter value not found'
        });
      }

      if (parameterValue.environment.orgId !== orgId) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Parameter value does not belong to this organization'
        });
      }
      if (!await fastify.enforceAccessKeyResource(request, reply, {
        appId: parameterValue.parameter.appId,
        environmentId: parameterValue.environmentId
      })) return;

      const versions = await prisma.parameterValueVersion.findMany({
        where: { parameterValueId: id },
        orderBy: [{ versionNumber: 'desc' }],
        include: {
          createdByUser: {
            select: { id: true, email: true, displayName: true }
          },
          parameter: {
            select: { id: true, key: true }
          },
          environment: {
            select: { id: true, name: true }
          }
        }
      });

      return reply.send({
        items: versions.map(version => ({
          id: version.id,
          parameterValueId: version.parameterValueId,
          parameterId: version.parameterId,
          environmentId: version.environmentId,
          versionNumber: version.versionNumber,
          changeType: version.changeType,
          rolledBackFromVersionId: version.rolledBackFromVersionId,
          isSet: version.isSet,
          createdAt: version.createdAt.toISOString(),
          createdBy: version.createdByUser,
          parameter: version.parameter,
          environment: version.environment
        }))
      });
    }
  );

  /**
   * GET /parameters/values/:id/history/:versionId - Reveal one historical version
   */
  fastify.get(
    '/parameters/values/:id/history/:versionId',
    {
      onRequest: [fastify.authenticate, fastify.validateOrgAccess, fastify.requireScope('parameters:read')],
      schema: revealParameterValueVersionSchema
    },
    async (request, reply) => {
      const { id, versionId, orgId } = request.params;
      const parameterValue = await loadParameterValue(id);

      if (!parameterValue) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Parameter value not found'
        });
      }

      if (parameterValue.environment.orgId !== orgId) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Parameter value does not belong to this organization'
        });
      }
      if (!await fastify.enforceAccessKeyResource(request, reply, {
        appId: parameterValue.parameter.appId,
        environmentId: parameterValue.environmentId
      })) return;

      if (!canRevealConfig(request, { environment: parameterValue.environment })) {
        await fastify.audit.log({
          request,
          orgId,
          action: 'parameter_value.reveal_version',
          resourceType: 'parameter_value',
          resourceId: id,
          resourceLabel: parameterValue.parameter.key,
          outcome: 'DENIED',
          metadata: {
            versionId,
            parameterId: parameterValue.parameterId,
            environmentId: parameterValue.environmentId,
            protected: parameterValue.environment.protected,
            tier: parameterValue.environment.tier
          }
        });
        return forbiddenConfigReply(reply);
      }

      const version = await prisma.parameterValueVersion.findFirst({
        where: {
          id: versionId,
          parameterValueId: id,
          parameterId: parameterValue.parameterId,
          environmentId: parameterValue.environmentId
        }
      });

      if (!version) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Parameter value version not found'
        });
      }

      await fastify.audit.log({
        request,
        orgId,
        action: 'parameter_value.reveal_version',
        resourceType: 'parameter_value',
        resourceId: id,
        resourceLabel: parameterValue.parameter.key,
        metadata: {
          versionId: version.id,
          versionNumber: version.versionNumber,
          parameterId: parameterValue.parameterId,
          environmentId: parameterValue.environmentId,
          protected: parameterValue.environment.protected,
          tier: parameterValue.environment.tier,
          isSet: version.isSet
        }
      });

      return reply.send({
        id: version.id,
        parameterValueId: version.parameterValueId,
        versionNumber: version.versionNumber,
        isSet: version.isSet,
        value: version.isSet ? decryptParameterValueVersion(version) : ''
      });
    }
  );

  /**
   * POST /parameters/values/:id/rollback - Restore a historical version
   */
  fastify.post(
    '/parameters/values/:id/rollback',
    {
      onRequest: [fastify.authenticate, fastify.validateOrgAccess, fastify.requireScope('config:write', { loadEnvironment: true })],
      schema: rollbackParameterValueSchema
    },
    async (request, reply) => {
      const { id, orgId } = request.params;
      const { versionId } = request.body;
      const parameterValue = await loadParameterValue(id);

      if (!parameterValue) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Parameter value not found'
        });
      }

      if (parameterValue.environment.orgId !== orgId) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Parameter value does not belong to this organization'
        });
      }
      if (!await fastify.enforceAccessKeyResource(request, reply, {
        appId: parameterValue.parameter.appId,
        environmentId: parameterValue.environmentId
      })) return;

      if (!canWriteConfig(request, { environment: parameterValue.environment })) {
        await fastify.audit.log({
          request,
          orgId,
          action: 'parameter_value.rollback',
          resourceType: 'parameter_value',
          resourceId: id,
          resourceLabel: parameterValue.parameter.key,
          outcome: 'DENIED',
          metadata: {
            versionId,
            parameterId: parameterValue.parameterId,
            environmentId: parameterValue.environmentId,
            protected: parameterValue.environment.protected,
            tier: parameterValue.environment.tier
          }
        });
        return forbiddenConfigReply(reply, 'config:write');
      }

      const sourceVersion = await prisma.parameterValueVersion.findFirst({
        where: {
          id: versionId,
          parameterValueId: id,
          parameterId: parameterValue.parameterId,
          environmentId: parameterValue.environmentId
        }
      });

      if (!sourceVersion) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Parameter value version not found'
        });
      }

      const restoredValue = sourceVersion.isSet ? decryptParameterValueVersion(sourceVersion) : '';
      const orgPlan = parameterValue.environment.organization.plan;
      const historyLimit = getParameterValueVersionLimit(orgPlan);

      const updatedValue = await prisma.$transaction(async tx => {
        await createVersionSnapshot(tx, {
          parameterValue,
          userId: request.auth.delegatedUserId,
          changeType: 'ROLLBACK',
          rolledBackFromVersionId: sourceVersion.id
        });

        const updated = await tx.parameterValue.update({
          where: { id },
          data: {
            isSet: sourceVersion.isSet,
            ...encryptedParameterValueData({
              value: restoredValue,
              parameterValueId: id,
              parameterId: parameterValue.parameterId,
              environmentId: parameterValue.environmentId
            })
          },
          select: {
            id: true,
            parameterId: true,
            environmentId: true,
            isSet: true,
            valueCiphertext: true,
            valueIv: true,
            valueTag: true,
            dekCiphertext: true,
            dekIv: true,
            dekTag: true,
            kekVersion: true,
            encryptionAlg: true
          }
        });

        await pruneVersionHistory(tx, id, historyLimit);
        await fastify.audit.log({
          request,
          orgId,
          action: 'parameter_value.rollback',
          resourceType: 'parameter_value',
          resourceId: id,
          resourceLabel: parameterValue.parameter.key,
          metadata: {
            versionId: sourceVersion.id,
            parameterId: parameterValue.parameterId,
            environmentId: parameterValue.environmentId,
            protected: parameterValue.environment.protected,
            tier: parameterValue.environment.tier,
            isSetBefore: parameterValue.isSet,
            isSetAfter: sourceVersion.isSet
          }
        }, { tx });
        return updated;
      });

      return reply.send({
        id: updatedValue.id,
        parameterId: updatedValue.parameterId,
        environmentId: updatedValue.environmentId,
        isSet: updatedValue.isSet,
        value: updatedValue.isSet ? decryptParameterValue(updatedValue) : ''
      });
    }
  );

  /**
   * GET /parameters/values/:id - Get a single parameter value by ID
   */
  fastify.get(
    '/parameters/values/:id',
    {
      onRequest: [fastify.authenticate, fastify.validateOrgAccess, fastify.requireScope('parameters:read')],
      schema: getParameterValueByIdSchema
    },
    async (request, reply) => {
      const { id, orgId } = request.params;

      // Get parameter value with related data
      const parameterValue = await prisma.parameterValue.findUnique({
        where: { id: id },
        include: {
          parameter: {
            select: {
              id: true,
              key: true,
              appId: true,
            }
          },
          environment: {
            select: {
              id: true,
              name: true,
              orgId: true,
              tier: true,
              protected: true
            }
          }
        }
      });

      if (!parameterValue) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Parameter value not found'
        });
      }

      // Verify environment belongs to organization
      if (parameterValue.environment.orgId !== orgId) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Parameter value does not belong to this organization'
        });
      }
      if (!await fastify.enforceAccessKeyResource(request, reply, {
        appId: parameterValue.parameter.appId,
        environmentId: parameterValue.environmentId
      })) return;

      if (!canRevealConfig(request, { environment: parameterValue.environment })) {
        await fastify.audit.log({
          request,
          orgId,
          action: 'parameter_value.reveal_current',
          resourceType: 'parameter_value',
          resourceId: id,
          resourceLabel: parameterValue.parameter.key,
          outcome: 'DENIED',
          metadata: {
            parameterId: parameterValue.parameterId,
            environmentId: parameterValue.environmentId,
            protected: parameterValue.environment.protected,
            tier: parameterValue.environment.tier
          }
        });
        return forbiddenConfigReply(reply);
      }

      await fastify.audit.log({
        request,
        orgId,
        action: 'parameter_value.reveal_current',
        resourceType: 'parameter_value',
        resourceId: id,
        resourceLabel: parameterValue.parameter.key,
        metadata: {
          parameterId: parameterValue.parameterId,
          environmentId: parameterValue.environmentId,
          protected: parameterValue.environment.protected,
          tier: parameterValue.environment.tier,
          isSet: parameterValue.isSet
        }
      });

      return reply.send({
        id: parameterValue.id,
        parameterId: parameterValue.parameterId,
        environmentId: parameterValue.environmentId,
        isSet: parameterValue.isSet,
        value: parameterValue.isSet ? decryptParameterValue(parameterValue) : '',
        parameter: parameterValue.parameter,
        environment: parameterValue.environment
      });
    }
  );

  /**
   * PUT /parameters/values/:id - Update a parameter value
   */
  fastify.put(
    '/parameters/values/:id',
    {
      onRequest: [fastify.authenticate, fastify.validateOrgAccess, fastify.requireScope('config:write', { loadEnvironment: true })],
      schema: updateParameterValueSchema
    },
    async (request, reply) => {
      const { id, orgId } = request.params;
      const { value } = request.body;

      // First, get the parameter value to verify it exists and check organization
      const existingValue = await prisma.parameterValue.findUnique({
        where: { id: id },
        include: {
          parameter: {
            select: { id: true, key: true, appId: true }
          },
          environment: {
            select: { id: true, orgId: true, tier: true, protected: true }
          }
        }
      });

      if (!existingValue) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Parameter value not found'
        });
      }

      // Verify environment belongs to organization
      if (existingValue.environment.orgId !== orgId) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Parameter value does not belong to this organization'
        });
      }
      if (!await fastify.enforceAccessKeyResource(request, reply, {
        appId: existingValue.parameter.appId,
        environmentId: existingValue.environmentId
      })) return;

      if (!canWriteConfig(request, { environment: existingValue.environment })) {
        await fastify.audit.log({
          request,
          orgId,
          action: 'parameter_value.update',
          resourceType: 'parameter_value',
          resourceId: id,
          resourceLabel: existingValue.parameter.key,
          outcome: 'DENIED',
          metadata: {
            parameterId: existingValue.parameterId,
            environmentId: existingValue.environmentId,
            protected: existingValue.environment.protected,
            tier: existingValue.environment.tier
          }
        });
        return forbiddenConfigReply(reply, 'config:write');
      }

      const normalizedValue = value ?? '';
      const isSet = normalizedValue !== '';
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { plan: true }
      });
      const historyLimit = getParameterValueVersionLimit(org?.plan);

      // Snapshot the previous value, then update the current value atomically.
      const updatedValue = await prisma.$transaction(async tx => {
        await createVersionSnapshot(tx, {
          parameterValue: existingValue,
          userId: request.auth.delegatedUserId,
          changeType: isSet ? 'UPDATE' : 'CLEAR'
        });

        const updated = await tx.parameterValue.update({
          where: { id: id },
          data: {
            isSet,
            ...encryptedParameterValueData({
              value: normalizedValue,
              parameterValueId: id,
              parameterId: existingValue.parameterId,
              environmentId: existingValue.environmentId
            })
          },
          select: {
            id: true,
            parameterId: true,
            environmentId: true,
            isSet: true,
            valueCiphertext: true,
            valueIv: true,
            valueTag: true,
            dekCiphertext: true,
            dekIv: true,
            dekTag: true,
            kekVersion: true,
            encryptionAlg: true
          }
        });

        await pruneVersionHistory(tx, id, historyLimit);
        await fastify.audit.log({
          request,
          orgId,
          action: isSet ? 'parameter_value.update' : 'parameter_value.clear',
          resourceType: 'parameter_value',
          resourceId: id,
          resourceLabel: existingValue.parameter.key,
          metadata: {
            parameterId: existingValue.parameterId,
            environmentId: existingValue.environmentId,
            protected: existingValue.environment.protected,
            tier: existingValue.environment.tier,
            isSetBefore: existingValue.isSet,
            isSetAfter: isSet,
            valueHashAfter: fastify.audit.hashSensitiveValue(normalizedValue)
          }
        }, { tx });
        return updated;
      });

      return reply.send({
        id: updatedValue.id,
        parameterId: updatedValue.parameterId,
        environmentId: updatedValue.environmentId,
        isSet: updatedValue.isSet,
        value: updatedValue.isSet ? decryptParameterValue(updatedValue) : ''
      });
    }
  );
}
