/**
 * Authentication Plugin for SafeConfig
 *
 * Provides JWT-based authentication with Supabase tokens (ES256).
 * Uses JWKS (JSON Web Key Set) for secure token verification in both local and production.
 *
 * Local Setup (Supabase CLI):
 * 1. Generate signing key: `npx supabase gen signing-key --algorithm ES256 > signing_keys_temp.json`
 * 2. Convert to array format: Wrap the object in brackets [...] and save as supabase/signing_keys.json
 * 3. Start Supabase: `npm run supabase:start`
 *
 * Production:
 * - JWKS URL: https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json
 */

import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import buildGetJwks from 'get-jwks';

async function authPlugin(fastify, options) {
  if (options.testMode) {
    fastify.decorate('authenticate', async function (request, reply) {
      const userId = request.headers['x-test-user-id'];
      if (!userId) {
        return reply.code(401).send({ error: 'Unauthorized', message: 'Missing x-test-user-id', statusCode: 401 });
      }
      const raw = await fastify.prisma.user.findUnique({
        where: { id: userId },
        include: { organizations: { include: { org: { select: { id: true, name: true } } } } }
      });
      if (!raw) {
        return reply.code(401).send({ error: 'Unauthorized', message: 'User not found', statusCode: 401 });
      }
      request.user = {
        ...raw,
        organizations: raw.organizations.map(m => ({ id: m.orgId, name: m.org.name, role: m.role }))
      };
    });

    fastify.decorate('validateOrgAccess', async function (request, reply) {
      const { orgId } = request.params;
      const membership = request.user.organizations?.find(o => o.id === orgId);
      if (!membership) {
        return reply.code(403).send({ error: 'Forbidden', message: 'Not a member of this organization', statusCode: 403 });
      }
      request.orgRole = membership.role;
    });

    fastify.decorate('requireRole', (minRole, options = {}) => {
      const HIERARCHY = ['USER', 'ADMIN', 'OWNER'];
      return async function (request, reply) {
        if (options.onlyIfSecret) {
          try {
            let isSecret = false;
            const appId = request.params.appId;
            if (appId) {
              // Grouped-values route: no app-level secret anymore — skip.
              return;
            } else if (request.params.id) {
              // Single-value routes: gate on app OR env secret (cleartext value exposed here).
              const pv = await fastify.prisma.parameterValue.findUnique({
                where: { id: request.params.id },
                include: {
                  parameter: { select: { appId: true } },
                  environment: { select: { isSecret: true } }
                }
              });
              if (pv) {
                isSecret = !!pv.environment?.isSecret;
              }
            }
            if (!isSecret) return;
          } catch {
            return; // invalid UUID or other lookup error — let the route handler respond
          }
        }
        if (!request.orgRole || HIERARCHY.indexOf(request.orgRole) < HIERARCHY.indexOf(minRole)) {
          return reply.code(403).send({ error: 'Forbidden', message: `Requires ${minRole} or higher`, statusCode: 403 });
        }
      };
    });

    return;
  }

  const supabaseProjectRef = process.env.SUPABASE_PROJECT_REF;
  const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';

  const getJwks = buildGetJwks()
  // Determine JWKS URL based on environment
  const jwksUri = supabaseProjectRef
    ? `https://${supabaseProjectRef}.supabase.co/auth/v1/.well-known/jwks.json`
    : `${supabaseUrl}/auth/v1/.well-known/jwks.json`;

  fastify.log.info({ jwksUri }, 'Configuring JWT with JWKS');

  // FIX 1: usa l'opzione `jwks` built-in di @fastify/jwt che accetta jwksUri direttamente.
  // get-jwks costruisce l'URL come `${domain}/.well-known/jwks.json`, quindi passargli
  // l'URL completo come `domain` produceva un URL sbagliato.
  await fastify.register(jwt, {
    decode: { complete: true },
    secret: (request, token) => {
      const { header: { kid, alg }, payload: { iss } } = token
      return getJwks.getPublicKey({ kid, domain: iss, alg })
    }
  });

  /**
   * Authenticate decorator
   * Verifica il JWT tramite JWKS e carica/crea l'utente sul DB.
   */
fastify.decorate('authenticate', async function (request, reply) {
  try {
    await request.jwtVerify();

    const token = request.headers.authorization?.replace('Bearer ', '');

    const { data: { user: supabaseUser }, error } = await fastify.supabaseAnon
      .auth.getUser(token);

    if (error || !supabaseUser) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Session revoked or expired',
        statusCode: 401
      });
    }

    const { id: supabaseId } = supabaseUser;

    const raw = await fastify.prisma.user.findUnique({
      where: { supabaseId },
      include: {
        organizations: {
          include: { org: { select: { id: true, name: true } } }
        }
      }
    });

    if (!raw) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'User not found',
        statusCode: 401
      });
    }

    request.user = {
      ...raw,
      organizations: raw.organizations.map(m => ({ id: m.orgId, name: m.org.name, role: m.role }))
    };

  } catch (err) {
    fastify.log.warn({ error: err.message }, 'Authentication failed');
    return reply.code(401).send({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
      statusCode: 401
    });
  }
});

  fastify.decorate('validateOrgAccess', async function (request, reply) {
    const { orgId } = request.params;
    const membership = request.user.organizations?.find(o => o.id === orgId);
    if (!membership) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'Not a member of this organization',
        statusCode: 403
      });
    }
    request.orgRole = membership.role;
  });

  /**
   * requireRole decorator
   * Va usato DOPO authenticate nel preHandler array.
   * Esempio: preHandler: [fastify.authenticate, fastify.requireRole('OWNER')]
   */
  fastify.decorate('requireRole', (minRole, options = {}) => {
    const HIERARCHY = ['USER', 'ADMIN', 'OWNER'];
    return async function (request, reply) {
      if (options.onlyIfSecret) {
        try {
          let isSecret = false;
          const appId = request.params.appId;
          if (appId) {
            const app = await fastify.prisma.app.findUnique({ where: { id: appId }, select: { isSecret: true } });
            isSecret = !!app?.isSecret;
          } else if (request.params.id) {
            const pv = await fastify.prisma.parameterValue.findUnique({
              where: { id: request.params.id },
              include: {
                parameter: { select: { appId: true } },
                environment: { select: { isSecret: true } }
              }
            });
            if (pv) {
              const app = await fastify.prisma.app.findUnique({ where: { id: pv.parameter.appId }, select: { isSecret: true } });
              isSecret = !!(app?.isSecret || pv.environment?.isSecret);
            }
          }
          if (!isSecret) return;
        } catch {
          return; // invalid UUID or other lookup error — let the route handler respond
        }
      }
      if (!request.orgRole || HIERARCHY.indexOf(request.orgRole) < HIERARCHY.indexOf(minRole)) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: `Requires ${minRole} or higher`,
          statusCode: 403
        });
      }
    };
  });
}

export default fp(authPlugin, {
  name: 'auth-plugin',
  fastify: '5.x'
});