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
            id: { type: 'string', description: 'User UUID' },
            email: { type: 'string', description: 'User email' },
            supabaseId: { type: 'string', description: 'Supabase user ID' },
            displayName: { type: 'string', nullable: true, description: 'User display name' },
            role: { type: 'string', enum: ['USER', 'ADMIN', 'OWNER'], description: 'User role' },
            organization: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string', description: 'Organization UUID' },
                name: { type: 'string', description: 'Organization name' }
              }
            }
          }
        },
        401: {
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
    const { user } = request;

    return reply.send({
      id: user.id,
      email: user.email,
      supabaseId: user.supabaseId,
      displayName: user.displayName,
      role: user.role,
      organization: user.organization
    });
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
