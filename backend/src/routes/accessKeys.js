import { uuidv7 } from 'uuidv7';
import { uuidV7Param } from '../schemas/common.js';
import {
  createAccessKeyToken,
  expiresAtFromPreset,
  validateScopes
} from '../lib/accessKeys.js';

const ttlPresetSchema = { type: 'string', enum: ['30d', '90d', '365d', 'never'], default: '90d' };
const scopeSchema = {
  type: 'array',
  minItems: 1,
  items: { type: 'string', enum: ['config:read', 'parameters:read', 'parameters:write', 'apps:read', 'environments:read'] }
};

const accessKeyResponse = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    type: { type: 'string' },
    identityId: { type: 'string' },
    identityName: { type: 'string' },
    tokenPrefix: { type: 'string' },
    scopes: { type: 'array', items: { type: 'string' } },
    appId: { type: 'string', nullable: true },
    environmentId: { type: 'string', nullable: true },
    expiresAt: { type: 'string', nullable: true },
    lastUsedAt: { type: 'string', nullable: true },
    revokedAt: { type: 'string', nullable: true },
    createdAt: { type: 'string' }
  }
};

function serializeAccessKey(accessKey) {
  return {
    id: accessKey.id,
    name: accessKey.name,
    type: accessKey.identity.type === 'USER' ? 'PERSONAL' : 'SERVICE',
    identityId: accessKey.identityId,
    identityName: accessKey.identity.name,
    tokenPrefix: accessKey.tokenPrefix,
    scopes: accessKey.scopes,
    appId: accessKey.appId,
    environmentId: accessKey.environmentId,
    expiresAt: accessKey.expiresAt?.toISOString?.() ?? accessKey.expiresAt ?? null,
    lastUsedAt: accessKey.lastUsedAt?.toISOString?.() ?? accessKey.lastUsedAt ?? null,
    revokedAt: accessKey.revokedAt?.toISOString?.() ?? accessKey.revokedAt ?? null,
    createdAt: accessKey.createdAt?.toISOString?.() ?? accessKey.createdAt
  };
}

async function validateBinding(fastify, orgId, { appId, environmentId }) {
  if (appId) {
    const app = await fastify.prisma.app.findUnique({ where: { id: appId }, select: { orgId: true } });
    if (!app || app.orgId !== orgId) return 'appId does not belong to this organization';
  }
  if (environmentId) {
    const env = await fastify.prisma.environment.findUnique({ where: { id: environmentId }, select: { orgId: true } });
    if (!env || env.orgId !== orgId) return 'environmentId does not belong to this organization';
  }
  return null;
}

async function findOrCreateUserIdentity(tx, { orgId, user }) {
  const existing = await tx.identity.findFirst({
    where: { orgId, type: 'USER', ownerUserId: user.id }
  });
  if (existing) return existing;
  return tx.identity.create({
    data: {
      id: uuidv7(),
      orgId,
      type: 'USER',
      name: user.displayName || user.email || user.id,
      ownerUserId: user.id
    }
  });
}

export default async function accessKeyRoutes(fastify) {
  fastify.get('/auth/access-keys', {
    onRequest: [fastify.authenticate, fastify.requireJwtAuth()],
    schema: {
      tags: ['access-keys'],
      security: [{ bearerAuth: [] }],
      response: { 200: { type: 'array', items: accessKeyResponse } }
    }
  }, async (request) => {
    const keys = await fastify.prisma.accessKey.findMany({
      where: {
        identity: { type: 'USER', ownerUserId: request.user.id }
      },
      include: { identity: true },
      orderBy: { createdAt: 'desc' }
    });
    return keys.map(serializeAccessKey);
  });

  fastify.post('/auth/access-keys', {
    onRequest: [fastify.authenticate, fastify.requireJwtAuth()],
    schema: {
      tags: ['access-keys'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['orgId', 'name', 'scopes'],
        properties: {
          orgId: uuidV7Param('Organization ID'),
          name: { type: 'string', minLength: 1, maxLength: 255 },
          scopes: scopeSchema,
          appId: { ...uuidV7Param('App ID'), nullable: true },
          environmentId: { ...uuidV7Param('Environment ID'), nullable: true },
          ttl: ttlPresetSchema
        }
      }
    }
  }, async (request, reply) => {
    const { orgId, name, appId = null, environmentId = null, ttl = '90d' } = request.body;
    const membership = request.user.organizations?.find(org => org.id === orgId);
    if (!membership) return reply.code(403).send({ error: 'Forbidden', message: 'Not a member of this organization', statusCode: 403 });
    const bindingError = await validateBinding(fastify, orgId, { appId, environmentId });
    if (bindingError) return reply.code(400).send({ error: 'Bad Request', message: bindingError, statusCode: 400 });

    let scopes;
    let expiresAt;
    try {
      scopes = validateScopes(request.body.scopes);
      expiresAt = expiresAtFromPreset(ttl);
    } catch (error) {
      return reply.code(400).send({ error: 'Bad Request', message: error.message, statusCode: 400 });
    }

    const tokenParts = createAccessKeyToken('PERSONAL');
    const accessKey = await fastify.prisma.$transaction(async tx => {
      const identity = await findOrCreateUserIdentity(tx, { orgId, user: request.user });
      const created = await tx.accessKey.create({
        data: {
          id: tokenParts.keyId,
          identityId: identity.id,
          createdByUserId: request.user.id,
          name,
          tokenHash: tokenParts.tokenHash,
          tokenPrefix: tokenParts.tokenPrefix,
          scopes,
          appId,
          environmentId,
          expiresAt
        },
        include: { identity: true }
      });
      await fastify.audit.log({
        request,
        orgId,
        action: 'access_key.create',
        resourceType: 'access_key',
        resourceId: created.id,
        resourceLabel: name,
        metadata: { type: 'PERSONAL', scopes, appId, environmentId, expiresAt: expiresAt?.toISOString?.() ?? null }
      }, { tx });
      return created;
    });

    return reply.code(201).send({ ...serializeAccessKey(accessKey), token: tokenParts.token });
  });

  fastify.delete('/auth/access-keys/:keyId', {
    onRequest: [fastify.authenticate, fastify.requireJwtAuth()],
    schema: {
      tags: ['access-keys'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['keyId'],
        properties: { keyId: uuidV7Param('Access key ID') }
      }
    }
  }, async (request, reply) => {
    const { keyId } = request.params;
    const accessKey = await fastify.prisma.accessKey.findFirst({
      where: { id: keyId, identity: { type: 'USER', ownerUserId: request.user.id } },
      include: { identity: true }
    });
    if (!accessKey) return reply.code(404).send({ error: 'Not Found', message: 'Access key not found', statusCode: 404 });

    await fastify.prisma.$transaction(async tx => {
      await tx.accessKey.update({ where: { id: keyId }, data: { revokedAt: new Date() } });
      await fastify.audit.log({
        request,
        orgId: accessKey.identity.orgId,
        action: 'access_key.revoke',
        resourceType: 'access_key',
        resourceId: keyId,
        resourceLabel: accessKey.name,
        metadata: { type: 'PERSONAL', tokenPrefix: accessKey.tokenPrefix }
      }, { tx });
    });
    return reply.code(204).send();
  });

  fastify.get('/orgs/:orgId/access-keys', {
    onRequest: [fastify.authenticate, fastify.validateOrgAccess, fastify.requireJwtAuth(), fastify.requireRole('ADMIN')],
    schema: {
      tags: ['access-keys'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['orgId'],
        properties: { orgId: uuidV7Param('Organization ID') }
      },
      response: { 200: { type: 'array', items: accessKeyResponse } }
    }
  }, async (request) => {
    const keys = await fastify.prisma.accessKey.findMany({
      where: { identity: { orgId: request.params.orgId, type: 'SERVICE' } },
      include: { identity: true },
      orderBy: { createdAt: 'desc' }
    });
    return keys.map(serializeAccessKey);
  });

  fastify.post('/orgs/:orgId/access-keys', {
    onRequest: [fastify.authenticate, fastify.validateOrgAccess, fastify.requireJwtAuth(), fastify.requireRole('ADMIN')],
    schema: {
      tags: ['access-keys'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['orgId'],
        properties: { orgId: uuidV7Param('Organization ID') }
      },
      body: {
        type: 'object',
        required: ['name', 'scopes'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 255 },
          scopes: scopeSchema,
          appId: { ...uuidV7Param('App ID'), nullable: true },
          environmentId: { ...uuidV7Param('Environment ID'), nullable: true },
          ttl: ttlPresetSchema
        }
      }
    }
  }, async (request, reply) => {
    const { orgId } = request.params;
    const { name, appId = null, environmentId = null, ttl = '90d' } = request.body;
    const bindingError = await validateBinding(fastify, orgId, { appId, environmentId });
    if (bindingError) return reply.code(400).send({ error: 'Bad Request', message: bindingError, statusCode: 400 });

    let scopes;
    let expiresAt;
    try {
      scopes = validateScopes(request.body.scopes);
      expiresAt = expiresAtFromPreset(ttl);
    } catch (error) {
      return reply.code(400).send({ error: 'Bad Request', message: error.message, statusCode: 400 });
    }

    const tokenParts = createAccessKeyToken('SERVICE');
    const accessKey = await fastify.prisma.$transaction(async tx => {
      const identity = await tx.identity.create({
        data: {
          id: uuidv7(),
          orgId,
          type: 'SERVICE',
          name,
          ownerUserId: request.user.id
        }
      });
      const created = await tx.accessKey.create({
        data: {
          id: tokenParts.keyId,
          identityId: identity.id,
          createdByUserId: request.user.id,
          name,
          tokenHash: tokenParts.tokenHash,
          tokenPrefix: tokenParts.tokenPrefix,
          scopes,
          appId,
          environmentId,
          expiresAt
        },
        include: { identity: true }
      });
      await fastify.audit.log({
        request,
        orgId,
        action: 'access_key.create',
        resourceType: 'access_key',
        resourceId: created.id,
        resourceLabel: name,
        metadata: { type: 'SERVICE', identityId: identity.id, scopes, appId, environmentId, expiresAt: expiresAt?.toISOString?.() ?? null }
      }, { tx });
      return created;
    });

    return reply.code(201).send({ ...serializeAccessKey(accessKey), token: tokenParts.token });
  });

  fastify.delete('/orgs/:orgId/access-keys/:keyId', {
    onRequest: [fastify.authenticate, fastify.validateOrgAccess, fastify.requireJwtAuth(), fastify.requireRole('ADMIN')],
    schema: {
      tags: ['access-keys'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['orgId', 'keyId'],
        properties: {
          orgId: uuidV7Param('Organization ID'),
          keyId: uuidV7Param('Access key ID')
        }
      }
    }
  }, async (request, reply) => {
    const { orgId, keyId } = request.params;
    const accessKey = await fastify.prisma.accessKey.findFirst({
      where: { id: keyId, identity: { orgId, type: 'SERVICE' } },
      include: { identity: true }
    });
    if (!accessKey) return reply.code(404).send({ error: 'Not Found', message: 'Access key not found', statusCode: 404 });

    await fastify.prisma.$transaction(async tx => {
      await tx.accessKey.update({ where: { id: keyId }, data: { revokedAt: new Date() } });
      await fastify.audit.log({
        request,
        orgId,
        action: 'access_key.revoke',
        resourceType: 'access_key',
        resourceId: keyId,
        resourceLabel: accessKey.name,
        metadata: { type: 'SERVICE', identityId: accessKey.identityId, tokenPrefix: accessKey.tokenPrefix }
      }, { tx });
    });
    return reply.code(204).send();
  });
}
