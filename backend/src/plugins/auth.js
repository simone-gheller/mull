/**
 * Authentication Plugin for SafeConfig
 *
 * Provides JWT-based authentication with Supabase tokens.
 * Decorates Fastify with:
 * - authenticate: Verifies JWT and auto-creates/loads user
 * - requireRole: Checks user role (USER/ADMIN/OWNER)
 */

import jwt from '@fastify/jwt';
import { uuidv7 } from 'uuidv7';

export default async function authPlugin(fastify, options) {
  // Register JWT plugin with Supabase secret
  await fastify.register(jwt, {
    secret: process.env.SUPABASE_JWT_SECRET,
    verify: {
      algorithms: ['HS256']
    }
  });

  /**
   * Authenticate decorator
   * Verifies JWT token and loads/creates user in database
   */
  fastify.decorate('authenticate', async function (request, reply) {
    try {
      // Verify JWT token
      await request.jwtVerify({
        audience: 'authenticated',
        issuer: `https://${process.env.SUPABASE_PROJECT_REF}.supabase.co/auth/v1`
      });

      // Extract Supabase claims
      const { sub: supabaseId, email } = request.user;

      if (!supabaseId || !email) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid token: missing user claims',
          statusCode: 401
        });
      }

      // Try to find existing user
      let user = await fastify.prisma.user.findUnique({
        where: { supabaseId },
        include: {
          organization: {
            select: { id: true, name: true }
          }
        }
      });

      if (!user) {
        // First-time user - auto-create with USER role
        user = await fastify.prisma.user.create({
          data: {
            id: uuidv7(),
            supabaseId,
            email,
            displayName: email.split('@')[0], // Default display name from email
            role: 'USER'
          },
          include: {
            organization: {
              select: { id: true, name: true }
            }
          }
        });

        fastify.log.info({ userId: user.id, email }, 'New user auto-created');
      }

      // Attach auth info to request
      request.auth = { supabaseId, email };
      request.user = user;

    } catch (err) {
      fastify.log.error(err, 'Authentication failed');
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
        statusCode: 401
      });
    }
  });

  /**
   * Require specific role decorator
   * Returns a hook function that checks user role
   */
  fastify.decorate('requireRole', (role) => {
    return async function (request, reply) {
      if (request.user.role !== role) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: `Requires ${role} role`,
          statusCode: 403
        });
      }
    };
  });
}
