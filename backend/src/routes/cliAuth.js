import crypto from 'node:crypto';
import { uuidv7 } from 'uuidv7';
import { SCOPES } from '../lib/rbac.js';
import { createAccessKeyToken, expiresAtFromPreset } from '../lib/accessKeys.js';
import { findOrCreateUserIdentity } from '../lib/identities.js';

const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const DEVICE_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function hashDeviceCode(code) {
  return crypto.createHash('sha256').update(code, 'utf8').digest('hex');
}

export default async function cliAuthRoutes(fastify) {
  // GET /cli/device-code/:id — public, returns only deviceName+expiresAt for the confirm page
  fastify.get('/cli/device-code/:id', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    schema: {
      tags: ['cli'],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      response: {
        200: {
          type: 'object',
          properties: {
            deviceName: { type: 'string' },
            expiresAt: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const record = await fastify.prisma.cliDeviceCode.findUnique({
      where: { id: request.params.id },
      select: { deviceName: true, expiresAt: true, consumedAt: true }
    });
    if (!record) return reply.code(404).send({ error: 'Not Found', message: 'Device code not found', statusCode: 404 });
    if (record.expiresAt < new Date()) return reply.code(404).send({ error: 'Not Found', message: 'Device code expired', statusCode: 404 });
    if (record.consumedAt) return reply.code(404).send({ error: 'Not Found', message: 'Device code already used', statusCode: 404 });
    return { deviceName: record.deviceName, expiresAt: record.expiresAt.toISOString() };
  });

  // POST /cli/device-code — start device flow
  fastify.post('/cli/device-code', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    schema: {
      tags: ['cli'],
      body: {
        type: 'object',
        required: ['deviceName'],
        properties: {
          deviceName: { type: 'string', minLength: 1, maxLength: 255 }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            deviceCode: { type: 'string' },
            verificationUrl: { type: 'string' },
            expiresAt: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { deviceName } = request.body;
    const id = uuidv7();
    const deviceCode = crypto.randomBytes(32).toString('base64url');
    const deviceCodeHash = hashDeviceCode(deviceCode);
    const expiresAt = new Date(Date.now() + DEVICE_CODE_TTL_MS);

    await fastify.prisma.cliDeviceCode.create({
      data: { id, deviceCodeHash, deviceName, expiresAt }
    });

    return reply.code(201).send({
      id,
      deviceCode,
      verificationUrl: `${APP_URL}/cli-auth?code=${id}`,
      expiresAt: expiresAt.toISOString()
    });
  });

  // GET /cli/device-code/:id/status — CLI polls this endpoint
  fastify.get('/cli/device-code/:id/status', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    schema: {
      tags: ['cli'],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      querystring: { type: 'object', required: ['secret'], properties: { secret: { type: 'string' } } }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const { secret } = request.query;

    const record = await fastify.prisma.cliDeviceCode.findUnique({ where: { id } });
    if (!record) return reply.code(404).send({ error: 'Not Found', message: 'Device code not found', statusCode: 404 });

    if (record.expiresAt < new Date()) return reply.send({ status: 'expired' });

    // Verify device secret
    const secretHash = hashDeviceCode(secret);
    if (secretHash !== record.deviceCodeHash) {
      return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid device secret', statusCode: 401 });
    }

    if (record.consumedAt) {
      return reply.code(404).send({ error: 'Not Found', message: 'Device code already consumed', statusCode: 404 });
    }

    if (!record.approvedAt || !record.approvedByUserId || !record.orgId) {
      return reply.send({ status: 'pending' });
    }

    // Approved but not yet consumed — create the AccessKey now
    const approvedByUser = await fastify.prisma.user.findUnique({
      where: { id: record.approvedByUserId },
      select: { id: true, email: true, displayName: true }
    });
    if (!approvedByUser) {
      return reply.code(500).send({ error: 'Internal Server Error', message: 'Approving user not found', statusCode: 500 });
    }

    const org = await fastify.prisma.organization.findUnique({
      where: { id: record.orgId },
      select: { id: true, name: true }
    });

    let token;
    await fastify.prisma.$transaction(async tx => {
      const identity = await findOrCreateUserIdentity(tx, { orgId: record.orgId, user: approvedByUser });
      const tokenParts = createAccessKeyToken('PERSONAL');
      token = tokenParts.token;

      await tx.accessKey.create({
        data: {
          id: tokenParts.keyId,
          identityId: identity.id,
          createdByUserId: record.approvedByUserId,
          name: `CLI – ${record.deviceName}`,
          tokenHash: tokenParts.tokenHash,
          tokenPrefix: tokenParts.tokenPrefix,
          scopes: SCOPES,
          source: 'CLI',
          expiresAt: expiresAtFromPreset('90d')
        }
      });

      await tx.cliDeviceCode.update({ where: { id }, data: { consumedAt: new Date() } });

      await fastify.audit.log({
        request: { auth: { identityType: 'USER', identityId: identity.id, identityName: approvedByUser.email } },
        orgId: record.orgId,
        action: 'cli_session.create',
        resourceType: 'access_key',
        resourceId: tokenParts.keyId,
        resourceLabel: `CLI – ${record.deviceName}`,
        metadata: { source: 'CLI', deviceName: record.deviceName }
      }, { tx });
    });

    return reply.send({
      status: 'approved',
      token,
      orgId: record.orgId,
      orgName: org?.name ?? null,
      email: approvedByUser.email
    });
  });

  // POST /cli/device-code/:id/approve — called by the web app after user confirms
  fastify.post('/cli/device-code/:id/approve', {
    onRequest: [fastify.authenticate, fastify.requireJwtAuth()],
    schema: {
      tags: ['cli'],
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        required: ['orgId'],
        properties: {
          orgId: { type: 'string', pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$' }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const { orgId } = request.body;

    const record = await fastify.prisma.cliDeviceCode.findUnique({ where: { id } });
    if (!record) return reply.code(404).send({ error: 'Not Found', message: 'Device code not found', statusCode: 404 });
    if (record.expiresAt < new Date()) return reply.code(400).send({ error: 'Bad Request', message: 'Device code expired', statusCode: 400 });
    if (record.approvedAt) return reply.code(400).send({ error: 'Bad Request', message: 'Device code already approved', statusCode: 400 });

    // Verify user is a member of the requested org
    const membership = request.user.organizations?.find(o => o.id === orgId);
    if (!membership) {
      return reply.code(403).send({ error: 'Forbidden', message: 'Not a member of this organization', statusCode: 403 });
    }

    await fastify.prisma.cliDeviceCode.update({
      where: { id },
      data: {
        approvedAt: new Date(),
        approvedByUserId: request.user.id,
        orgId
      }
    });

    return reply.send({ success: true });
  });
}
