import { createClient } from '@supabase/supabase-js'

/**
 * Authentication Routes
 *
 * Provides endpoints for:
 * - GET /auth/me - Get current user info
 * - POST /auth/admin/example - Example admin-only route
 */

export default async function authRoutes(fastify, _options) {
  // Inizializzato qui: le env var sono già validate da @fastify/env prima che le route vengano registrate
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
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

  fastify.post('/auth/signin', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute',
        errorResponseBuilder: () => ({
          error: 'Too Many Requests',
          message: 'Too many login attempts. Try again in 1 minute.',
          statusCode: 429
        })
      }
    },
    schema: {
      tags: ['auth'],
      description: 'Sign in with email and password via Supabase',
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email:    { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            accessToken:  { type: 'string' },
            refreshToken: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                email:       { type: 'string' },
                displayName: { type: 'string' }
              }
            }
          }
        },
        401: {
          type: 'object',
          properties: {
            error:      { type: 'string' },
            message:    { type: 'string' },
            statusCode: { type: 'number' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { email, password } = request.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      fastify.log.warn({ error: error.message }, 'Supabase sign-in failed');
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Invalid email or password',
        statusCode: 401
      });
    }

    const { user, session } = data;

    if (!user || !session) {
      fastify.log.warn('Supabase sign-in returned no user or session');
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication failed',
        statusCode: 401
      });
    }

    return reply.send({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      user: {
        email: user.email,
        displayName: user.user_metadata?.full_name || user.email.split('@')[0]
      }
    });
  })

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
