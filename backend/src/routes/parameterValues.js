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

/**
 * @param {import('fastify').FastifyInstance} fastify
 */
export default async function parameterValueRoutes(fastify) {
  const { prisma } = fastify;

  function canReadSecretValue(request, parameterValue) {
    const isSecretValue = parameterValue.environment.isSecret || parameterValue.parameter.isSecret;
    const isAdmin = ['ADMIN', 'OWNER'].includes(request.orgRole);
    return !isSecretValue || isAdmin;
  }

  function forbiddenSecretReply(reply) {
    return reply.code(403).send({
      error: 'Forbidden',
      message: 'Requires ADMIN or higher',
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
            isSecret: true
          }
        },
        environment: {
          select: {
            id: true,
            name: true,
            orgId: true,
            isSecret: true,
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
      onRequest: [fastify.authenticate, fastify.validateOrgAccess],
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

      // Get all parameters for this app
      const parameters = await prisma.parameter.findMany({
        where: { appId: appId },
        select: { id: true }
      });

      const parameterIds = parameters.map(p => p.id);

      // Get all parameter values for these parameters
      const parameterValues = await prisma.parameterValue.findMany({
        where: { parameterId: { in: parameterIds } },
        include: {
          parameter: {
            select: {
              id: true,
              key: true,
              isSecret: true,
            }
          },
          environment: {
            select: {
              id: true,
              name: true,
              isSecret: true,
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
      const isAdmin = ['ADMIN', 'OWNER'].includes(request.orgRole);
      const grouped = {};
      for (const pv of parameterValues) {
        const envName = pv.environment.name;
        if (!grouped[envName]) {
          grouped[envName] = {
            environmentId: pv.environmentId,
            values: []
          };
        }
        const isSecretValue = pv.environment.isSecret || pv.parameter.isSecret;
        grouped[envName].values.push({
          id: pv.id,
          parameterId: pv.parameterId,
          parameterKey: pv.parameter.key,
          isSet: pv.isSet,
          value: !pv.isSet || (isSecretValue && !isAdmin) ? null : decryptParameterValue(pv),
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
      onRequest: [fastify.authenticate, fastify.validateOrgAccess],
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
      onRequest: [fastify.authenticate, fastify.validateOrgAccess],
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

      if (!canReadSecretValue(request, parameterValue)) {
        return forbiddenSecretReply(reply);
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
      onRequest: [fastify.authenticate, fastify.validateOrgAccess, fastify.requireRole('ADMIN')],
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

      if (!canReadSecretValue(request, parameterValue)) {
        return forbiddenSecretReply(reply);
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
          userId: request.user.id,
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
      onRequest: [fastify.authenticate, fastify.validateOrgAccess],
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
              isSecret: true
            }
          },
          environment: {
            select: {
              id: true,
              name: true,
              orgId: true,
              isSecret: true
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

      if (!canReadSecretValue(request, parameterValue)) {
        return forbiddenSecretReply(reply);
      }

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
      onRequest: [fastify.authenticate, fastify.validateOrgAccess, fastify.requireRole('ADMIN')],
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
            select: { id: true, isSecret: true }
          },
          environment: {
            select: { id: true, orgId: true, isSecret: true }
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

      if (!canReadSecretValue(request, existingValue)) {
        return forbiddenSecretReply(reply);
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
          userId: request.user.id,
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
