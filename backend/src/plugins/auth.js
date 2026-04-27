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
import { uuidv7 } from 'uuidv7';
import buildGetJwks from 'get-jwks';

async function authPlugin(fastify, options) {
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
      // FIX 2: usa request.jwtVerify() invece di estrarre e verificare manualmente.
      // Gestisce automaticamente l'header Authorization: Bearer, la verifica firma,
      // e la scadenza. Popola request.user con il payload decodificato.
      await request.jwtVerify();

      const { sub: supabaseId, email } = request.user;

      if (!supabaseId || !email) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid token format',
          statusCode: 401
        });
      }

      // Trova o crea utente nel DB
      let user = await fastify.prisma.user.findUnique({
        where: { supabaseId },
        include: {
          organization: {
            select: { id: true, name: true }
          }
        }
      });

      if (!user) {
        // Prima volta — crea utente e organizzazione personale in una transazione
        const orgId = uuidv7();

        user = await fastify.prisma.$transaction(async (tx) => {
          await tx.organization.create({
            data: {
              id: orgId,
              name: `${email.split('@')[0]}'s Organization`
            }
          });

          return tx.user.create({
            data: {
              id: uuidv7(),
              supabaseId,
              email,
              displayName: email.split('@')[0],
              role: 'OWNER',
              organizationId: orgId
            },
            include: {
              organization: {
                select: { id: true, name: true }
              }
            }
          });
        });

        fastify.log.info({ userId: user.id, orgId, email }, 'New user and organization auto-created');
      }

      // Sovrascrivi request.user con l'entità DB (non solo il payload JWT)
      request.auth = { supabaseId, email };
      request.user = user;

    } catch (err) {
      fastify.log.warn({ error: err.message }, 'Authentication failed');
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
        statusCode: 401
      });
    }
  });

  /**
   * requireRole decorator
   * Va usato DOPO authenticate nel preHandler array.
   * Esempio: preHandler: [fastify.authenticate, fastify.requireRole('OWNER')]
   */
  fastify.decorate('requireRole', (role) => {
    return async function (request, reply) {
      if (!request.user || request.user.role !== role) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: `Requires ${role} role`,
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