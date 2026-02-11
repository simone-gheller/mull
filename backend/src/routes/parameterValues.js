import { orgIdQuerySchema } from '../schemas/common.js';
import {
  getParameterValuesSchema,
  getParameterValueByIdSchema,
  updateParameterValueSchema
} from '../openapi/parameterValueRoutes.js';

/**
 * @param {import('fastify').FastifyInstance} fastify
 */
export default async function parameterValueRoutes(fastify) {
  const { prisma } = fastify;

  /**
   * GET /parameters/:appId/values - List all parameter values for an app
   */
  fastify.get(
    '/parameters/:appId/values',
    {
      onRequest: [fastify.authenticate],
      schema: {
        ...getParameterValuesSchema,
        headers: orgIdQuerySchema
      }
    },
    async (request, reply) => {
      const { appId } = request.params;
      const orgId = request.headers['x-org-id'];

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
              appId: true
            }
          },
          environment: {
            select: {
              id: true,
              name: true,
              orgId: true
            }
          }
        },
        orderBy: [
          {
            parameter: {
              key: 'asc'
            }
          },
          {
            environment: {
              name: 'asc'
            }
          }
        ]
      });

      return reply.send(parameterValues);
    }
  );

  /**
   * GET /parameters/values/:id - Get a single parameter value by ID
   */
  fastify.get(
    '/parameters/values/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        ...getParameterValueByIdSchema,
        headers: orgIdQuerySchema
      }
    },
    async (request, reply) => {
      const { id } = request.params;
      const orgId = request.headers['x-org-id'];

      // Get parameter value with related data
      const parameterValue = await prisma.parameterValue.findUnique({
        where: { id: id },
        include: {
          parameter: {
            select: {
              id: true,
              key: true,
              appId: true
            }
          },
          environment: {
            select: {
              id: true,
              name: true,
              orgId: true
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

      return reply.send(parameterValue);
    }
  );

  /**
   * PUT /parameters/values/:id - Update a parameter value
   */
  fastify.put(
    '/parameters/values/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        ...updateParameterValueSchema,
        headers: orgIdQuerySchema
      }
    },
    async (request, reply) => {
      const { id } = request.params;
      const { value } = request.body;
      const orgId = request.headers['x-org-id'];

      // First, get the parameter value to verify it exists and check organization
      const existingValue = await prisma.parameterValue.findUnique({
        where: { id: id },
        include: {
          environment: {
            select: { orgId: true }
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

      // Update the parameter value
      const updatedValue = await prisma.parameterValue.update({
        where: { id: id },
        data: { value: value },
        select: {
          id: true,
          parameterId: true,
          environmentId: true,
          value: true
        }
      });

      return reply.send(updatedValue);
    }
  );
}
