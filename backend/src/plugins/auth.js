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
import { isUuidV7 } from '../schemas/common.js';
import { isSecretValue, roleAtLeast } from '../lib/secretPolicy.js';
import { hasScope, isAccessKeyToken, parseAccessKeyToken, verifyAccessKeyToken } from '../lib/accessKeys.js';

function userDisplay(user) {
  return user?.displayName || user?.email || user?.id || null;
}

function toUserWithMemberships(raw) {
  return {
    ...raw,
    organizations: raw.organizations.map(m => ({ id: m.orgId, name: m.org.name, role: m.role }))
  };
}

function decorateSupabaseJwtAuth(request, user) {
  request.user = user;
  request.accessKey = null;
  request.auth = {
    identityType: 'USER',
    identityId: user.id,
    identityName: userDisplay(user),
    credentialType: 'SUPABASE_JWT',
    credentialId: null,
    credentialPrefix: null,
    orgId: null,
    orgRole: null,
    scopes: ['*'],
    appId: null,
    environmentId: null,
    delegatedUserId: user.id
  };
}

function decorateAccessKeyAuth(request, { accessKey, identity, delegatedUser }) {
  request.user = toUserWithMemberships(delegatedUser);
  request.accessKey = accessKey;
  request.auth = {
    identityType: identity.type,
    identityId: identity.id,
    identityName: identity.name,
    credentialType: 'ACCESS_KEY',
    credentialId: accessKey.id,
    credentialPrefix: accessKey.tokenPrefix,
    orgId: identity.type === 'SERVICE' ? identity.orgId : null,
    orgRole: null,
    scopes: accessKey.scopes,
    appId: accessKey.appId,
    environmentId: accessKey.environmentId,
    delegatedUserId: delegatedUser.id
  };
}

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
  async function authenticateAccessKey(request, reply, token) {
    const parsed = parseAccessKeyToken(token);
    if (!parsed) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Invalid access key',
        statusCode: 401
      });
    }

    const accessKey = await fastify.prisma.accessKey.findUnique({
      where: { id: parsed.keyId },
      include: {
        identity: {
          include: {
            ownerUser: {
              include: {
                organizations: {
                  include: { org: { select: { id: true, name: true } } }
                }
              }
            }
          }
        },
        createdByUser: {
          include: {
            organizations: {
              include: { org: { select: { id: true, name: true } } }
            }
          }
        }
      }
    });

    const now = new Date();
    if (
      !accessKey ||
      !verifyAccessKeyToken(token, accessKey.tokenHash) ||
      accessKey.revokedAt ||
      accessKey.identity.disabledAt ||
      (accessKey.expiresAt && accessKey.expiresAt <= now)
    ) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Invalid or expired access key',
        statusCode: 401
      });
    }

    const identity = accessKey.identity;
    const delegatedUser = identity.type === 'USER'
      ? accessKey.createdByUser
      : identity.ownerUser || accessKey.createdByUser;

    if (!delegatedUser) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Access key has no delegated user',
        statusCode: 401
      });
    }

    decorateAccessKeyAuth(request, { accessKey, identity, delegatedUser });

    await fastify.prisma.accessKey.update({
      where: { id: accessKey.id },
      data: { lastUsedAt: now }
    });
  }

fastify.decorate('authenticate', async function (request, reply) {
  try {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Missing bearer token',
        statusCode: 401
      });
    }

    if (isAccessKeyToken(token)) {
      return authenticateAccessKey(request, reply, token);
    }

    await request.jwtVerify();

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

    decorateSupabaseJwtAuth(request, toUserWithMemberships(raw));

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
    if (!isUuidV7(orgId)) {
      return reply.code(400).send({ error: 'Bad Request', message: 'Invalid orgId', statusCode: 400 });
    }

    if (request.auth?.identityType === 'SERVICE') {
      if (request.auth.orgId !== orgId) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Access key cannot access this organization',
          statusCode: 403
        });
      }
      request.orgRole = null;
      request.auth.orgRole = null;
      return;
    }

    const membership = request.user.organizations?.find(o => o.id === orgId);
    if (!membership) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'Not a member of this organization',
        statusCode: 403
      });
    }
    request.orgRole = membership.role;
    request.auth.orgId = orgId;
    request.auth.orgRole = membership.role;
  });

  fastify.decorate('requireScope', (scope) => {
    return async function (request, reply) {
      if (hasScope(request.auth, scope)) return;
      await fastify.audit.log({
        request,
        orgId: request.params?.orgId ?? request.auth?.orgId,
        action: 'access_key.use_denied',
        resourceType: 'access_key',
        resourceId: request.auth?.credentialId,
        outcome: 'DENIED',
        metadata: {
          requiredScope: scope,
          scopes: request.auth?.scopes ?? [],
          credentialId: request.auth?.credentialId,
          credentialPrefix: request.auth?.credentialPrefix,
          identityId: request.auth?.identityId,
          identityName: request.auth?.identityName,
          delegatedUserId: request.auth?.delegatedUserId
        }
      });
      return reply.code(403).send({
        error: 'Forbidden',
        message: `Requires scope ${scope}`,
        statusCode: 403
      });
    };
  });

  fastify.decorate('requireJwtAuth', () => {
    return async function (request, reply) {
      if (request.auth?.credentialType === 'SUPABASE_JWT') return;
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'Requires user session authentication',
        statusCode: 403
      });
    };
  });

  fastify.decorate('enforceAccessKeyResource', async function (request, reply, resource = {}) {
    if (request.auth?.credentialType !== 'ACCESS_KEY') return true;
    if (request.auth.appId && resource.appId && request.auth.appId !== resource.appId) {
      await fastify.audit.log({
        request,
        orgId: request.params?.orgId ?? request.auth.orgId,
        action: 'access_key.use_denied',
        resourceType: 'access_key',
        resourceId: request.auth.credentialId,
        outcome: 'DENIED',
        metadata: { reason: 'app_binding', appId: resource.appId, boundAppId: request.auth.appId }
      });
      reply.code(403).send({ error: 'Forbidden', message: 'Access key is not scoped to this app', statusCode: 403 });
      return false;
    }
    if (request.auth.environmentId && resource.environmentId && request.auth.environmentId !== resource.environmentId) {
      await fastify.audit.log({
        request,
        orgId: request.params?.orgId ?? request.auth.orgId,
        action: 'access_key.use_denied',
        resourceType: 'access_key',
        resourceId: request.auth.credentialId,
        outcome: 'DENIED',
        metadata: {
          reason: 'environment_binding',
          environmentId: resource.environmentId,
          boundEnvironmentId: request.auth.environmentId
        }
      });
      reply.code(403).send({ error: 'Forbidden', message: 'Access key is not scoped to this environment', statusCode: 403 });
      return false;
    }
    return true;
  });

  /**
   * requireRole decorator
   * Va usato DOPO authenticate nel preHandler array.
   * Esempio: preHandler: [fastify.authenticate, fastify.requireRole('OWNER')]
   */
  fastify.decorate('requireRole', (minRole, options = {}) => {
    return async function (request, reply) {
      if (options.onlyIfSecret) {
        try {
          let secret = false;
          const appId = request.params.appId;
          if (appId) {
            // Grouped-value routes can contain both secret and non-secret rows.
            // The route handler should redact row-by-row instead of gating the whole app.
            return;
          } else if (request.params.id) {
            const pv = await fastify.prisma.parameterValue.findUnique({
              where: { id: request.params.id },
              include: {
                parameter: { select: { isSecret: true } },
                environment: { select: { isSecret: true } }
              }
            });
            if (pv) {
              secret = isSecretValue(pv);
            }
          }
          if (!secret) return;
        } catch {
          return; // invalid UUID or other lookup error — let the route handler respond
        }
      }
      if (request.auth?.credentialType === 'ACCESS_KEY' && request.auth.identityType === 'SERVICE') {
        return;
      }
      if (!request.orgRole || !roleAtLeast(request.orgRole, minRole)) {
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
