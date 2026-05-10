import { uuidv7 } from 'uuidv7';

/**
 * Authentication Routes
 *
 * Provides endpoints for:
 * - GET /auth/me - Get current user info
 * - POST /auth/admin/example - Example admin-only route
 */

export default async function authRoutes(fastify, _options) {
/**
   * GET /auth/me
   * Returns authenticated user information
   */
  fastify.get('/auth/me', {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ['auth'],
      description: 'Get authenticated user information',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            supabaseId: { type: 'string' },
            displayName: { type: 'string', nullable: true },
            organizations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  role: { type: 'string', enum: ['USER', 'ADMIN', 'OWNER'] }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { user } = request;
    return reply.send({
      id: user.id,
      email: user.email,
      supabaseId: user.supabaseId,
      displayName: user.displayName,
      organizations: user.organizations,
    });
  });

  /**
   * POST /orgs
   * Create a new organization for the authenticated user.
   * Used both during initial registration (after OTP) and for adding org to existing users.
   */
  fastify.post('/orgs', {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ['orgs'],
      description: 'Create a new organization',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 255 },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { name } = request.body;
    const orgId = uuidv7();
    const org = await fastify.prisma.$transaction(async (tx) => {
      const createdOrg = await tx.organization.create({ data: { id: orgId, name } });
      await tx.userOrganization.create({
        data: { userId: request.user.id, orgId, role: 'OWNER' },
      });
      return createdOrg;
    });
    return reply.code(201).send({ id: org.id, name: org.name, role: 'OWNER' });
  });

  /**
   * PATCH /auth/me
   * currently updates displayName only, 
   * but can be extended in the future 
   */
  fastify.patch('/auth/me', {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ['auth'],
      description: 'Update authenticated user profile',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          displayName: { type: 'string', maxLength: 255 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            displayName: { type: 'string', nullable: true },
            role: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { user } = request;
    const { displayName } = request.body;

    const updated = await fastify.prisma.user.update({
      where: { id: user.id },
      data: { ...(displayName !== undefined ? { displayName } : {}) },
      select: { id: true, email: true, displayName: true },
    });

    return reply.send(updated);
  });

  /**
   * POST /auth/admin/example
   * Example admin-only route to demonstrate role-based access control
   */
  fastify.post('/auth/admin/example', {
    onRequest: [fastify.authenticate, fastify.requireRole('ADMIN')],
    schema: {
      tags: ['auth'],
      description: 'Example admin-only endpoint',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            user: { type: 'string' }
          }
        },
        403: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        }
      }
    }
  }, async (request, reply) => {
    return reply.send({
      message: 'Admin access granted',
      user: request.user.email
    });
  });
}
