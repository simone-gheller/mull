import { uuidv7 } from 'uuidv7';
import crypto from 'node:crypto';
import { uuidV7Param } from '../schemas/common.js';

const orgIdParamsSchema = {
  type: 'object',
  required: ['orgId'],
  properties: {
    orgId: uuidV7Param('Organization ID'),
  },
};

const inviteIdParamsSchema = {
  type: 'object',
  required: ['orgId', 'inviteId'],
  properties: {
    orgId: uuidV7Param('Organization ID'),
    inviteId: uuidV7Param('Invite ID'),
  },
};

export default async function orgRoutes(fastify, _options) {
  /**
   * GET /orgs/:orgId
   * Returns org details and member count
   */
  fastify.get('/', {
    onRequest: [fastify.authenticate, fastify.validateOrgAccess],
    schema: {
      tags: ['orgs'],
      description: 'Get organization details',
      security: [{ bearerAuth: [] }],
      params: orgIdParamsSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            memberCount: { type: 'number' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { orgId } = request.params;

    const org = await fastify.prisma.organization.findUnique({
      where: { id: orgId },
      include: { _count: { select: { members: true } } },
    });

    if (!org) return reply.status(404).send({ error: 'Not found' });

    return reply.send({ id: org.id, name: org.name, memberCount: org._count.members });
  });

  /**
   * PATCH /orgs/:orgId
   * Update organization name (OWNER only)
   */
  fastify.patch('/', {
    onRequest: [fastify.authenticate, fastify.validateOrgAccess, fastify.requireRole('OWNER')],
    schema: {
      tags: ['orgs'],
      description: 'Update organization',
      security: [{ bearerAuth: [] }],
      params: orgIdParamsSchema,
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 255 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { orgId } = request.params;
    const { name } = request.body;

    const org = await fastify.prisma.organization.update({
      where: { id: orgId },
      data: { name },
      select: { id: true, name: true },
    });

    return reply.send(org);
  });

  /**
   * GET /orgs/:orgId/members
   * Returns all members of the organization
   */
  fastify.get('/members', {
    onRequest: [fastify.authenticate, fastify.validateOrgAccess],
    schema: {
      tags: ['orgs'],
      description: 'List organization members',
      security: [{ bearerAuth: [] }],
      params: orgIdParamsSchema,
      response: {
        200: {
          type: 'array',
          items: {
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
    },
  }, async (request, reply) => {
    const { orgId } = request.params;

    const memberships = await fastify.prisma.userOrganization.findMany({
      where: { orgId },
      include: { user: { select: { id: true, email: true, displayName: true } } },
      orderBy: [{ role: 'asc' }, { user: { email: 'asc' } }],
    });

    return reply.send(memberships.map(m => ({
      id: m.user.id,
      email: m.user.email,
      displayName: m.user.displayName,
      role: m.role,
    })));
  });

  /**
   * POST /orgs/:orgId/invites
   * Invite a user. If already registered → direct add. Otherwise → email via nodemailer.
   */
  fastify.post('/invites', {
    onRequest: [fastify.authenticate, fastify.validateOrgAccess, fastify.requireRole('ADMIN')],
    schema: {
      tags: ['orgs'],
      security: [{ bearerAuth: [] }],
      params: orgIdParamsSchema,
      body: {
        type: 'object',
        required: ['email', 'role'],
        properties: {
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['USER', 'ADMIN'] },
        },
      },
    },
  }, async (request, reply) => {
    const { orgId } = request.params;
    const { email, role } = request.body;

    // Check already a member
    const existingUser = await fastify.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const membership = await fastify.prisma.userOrganization.findUnique({
        where: { userId_orgId: { userId: existingUser.id, orgId } },
      });
      if (membership) {
        return reply.status(409).send({ error: 'Conflict', message: 'User is already a member of this organization' });
      }
    }

    // Check pending invite (via query — no unique constraint on orgId+email)
    const now = new Date();
    const pendingInvite = await fastify.prisma.orgInvite.findFirst({
      where: { orgId, email, status: 'PENDING', expiresAt: { gt: now } },
    });
    if (pendingInvite) {
      return reply.status(409).send({ error: 'Conflict', message: 'An invite for this email is already pending' });
    }

    // Always send email — even existing users accept via the link
    // so membership is only created when they click through
    const org = await fastify.prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } });
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const inviteUrl = `${fastify.config.APP_URL}/invite/accept?token=${token}`;

    await fastify.prisma.orgInvite.create({
      data: { id: uuidv7(), orgId, email, role, token, invitedBy: request.user.id, expiresAt },
    });

    await fastify.mailer.sendInvite({
      to: email,
      orgName: org.name,
      inviterName: request.user.displayName || request.user.email,
      role,
      inviteUrl,
    });

    return reply.status(200).send({ type: 'invite_sent', email });
  });

  /**
   * GET /orgs/:orgId/invites
   * List PENDING non-expired invites for this org.
   */
  fastify.get('/invites', {
    onRequest: [fastify.authenticate, fastify.validateOrgAccess, fastify.requireRole('ADMIN')],
    schema: { tags: ['orgs'], security: [{ bearerAuth: [] }], params: orgIdParamsSchema },
  }, async (request, reply) => {
    const { orgId } = request.params;
    const now = new Date();

    const invites = await fastify.prisma.orgInvite.findMany({
      where: { orgId, status: 'PENDING', expiresAt: { gt: now } },
      include: { inviter: { select: { email: true, displayName: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send(invites.map(inv => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      invitedBy: inv.inviter,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
    })));
  });

  /**
   * DELETE /orgs/:orgId/invites/:inviteId
   * Mark invite as REVOKED (record kept for audit).
   */
  fastify.delete('/invites/:inviteId', {
    onRequest: [fastify.authenticate, fastify.validateOrgAccess, fastify.requireRole('ADMIN')],
    schema: {
      tags: ['orgs'],
      security: [{ bearerAuth: [] }],
      params: inviteIdParamsSchema,
    },
  }, async (request, reply) => {
    const { orgId, inviteId } = request.params;

    const invite = await fastify.prisma.orgInvite.findUnique({ where: { id: inviteId } });
    if (!invite || invite.orgId !== orgId) {
      return reply.status(404).send({ error: 'Not Found', message: 'Invite not found' });
    }

    await fastify.prisma.orgInvite.update({
      where: { id: inviteId },
      data: { status: 'REVOKED', resolvedAt: new Date() },
    });

    return reply.status(204).send();
  });
}
