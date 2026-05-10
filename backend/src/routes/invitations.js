import crypto from 'node:crypto';

function tokenFingerprint(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export default async function invitationRoutes(fastify) {
  /**
   * GET /invites/:token
   * Public — returns invite info for display on the accept page.
   */
  fastify.get('/invites/:token', {
    schema: {
      tags: ['invites'],
      params: {
        type: 'object',
        properties: { token: { type: 'string' } },
        required: ['token'],
      },
    },
  }, async (request, reply) => {
    const { token } = request.params;
    const tokenHash = tokenFingerprint(token);
    const now = new Date();

    const invite = await fastify.prisma.orgInvite.findUnique({
      where: { tokenHash },
      include: {
        org: { select: { name: true } },
        inviter: { select: { email: true, displayName: true } },
      },
    });

    if (!invite) {
      return reply.status(404).send({ error: 'Not Found', message: 'Invitation not found' });
    }
    await fastify.audit.log({
      request,
      orgId: invite.orgId,
      actorType: 'ANONYMOUS',
      action: 'invite.preview',
      resourceType: 'invite',
      resourceId: invite.id,
      resourceLabel: invite.email,
      outcome: invite.status === 'PENDING' && invite.expiresAt >= now ? 'SUCCESS' : 'DENIED',
      metadata: {
        tokenHash,
        status: invite.status,
        expired: invite.expiresAt < now
      }
    });
    if (invite.status === 'REVOKED') {
      return reply.status(410).send({ error: 'Gone', message: 'Invitation was revoked' });
    }
    if (invite.status === 'ACCEPTED') {
      return reply.status(410).send({ error: 'Gone', message: 'Invitation already used' });
    }
    if (invite.expiresAt < now) {
      return reply.status(410).send({ error: 'Gone', message: 'Invitation has expired' });
    }

    return reply.send({
      orgName: invite.org.name,
      inviterEmail: invite.inviter.email,
      inviterName: invite.inviter.displayName,
      role: invite.role,
      email: invite.email,
      expiresAt: invite.expiresAt,
    });
  });

  /**
   * POST /invites/accept
   * Authenticated — accepts the invite, adds user to org.
   */
  fastify.post('/invites/accept', {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ['invites'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['token'],
        properties: { token: { type: 'string' } },
      },
    },
  }, async (request, reply) => {
    const { token } = request.body;
    const tokenHash = tokenFingerprint(token);
    const now = new Date();

    const invite = await fastify.prisma.orgInvite.findUnique({
      where: { tokenHash },
      include: { org: { select: { id: true, name: true } } },
    });

    if (!invite) {
      return reply.status(404).send({ error: 'Not Found', message: 'Invitation not found' });
    }
    if (invite.status === 'REVOKED') {
      await fastify.audit.log({
        request,
        orgId: invite.orgId,
        action: 'invite.accept',
        resourceType: 'invite',
        resourceId: invite.id,
        resourceLabel: invite.email,
        outcome: 'DENIED',
        metadata: { reason: 'revoked', tokenHash }
      });
      return reply.status(410).send({ error: 'Gone', message: 'Invitation was revoked' });
    }
    if (invite.status === 'ACCEPTED') {
      await fastify.audit.log({
        request,
        orgId: invite.orgId,
        action: 'invite.accept',
        resourceType: 'invite',
        resourceId: invite.id,
        resourceLabel: invite.email,
        outcome: 'DENIED',
        metadata: { reason: 'already_accepted', tokenHash }
      });
      return reply.status(410).send({ error: 'Gone', message: 'Invitation already used' });
    }
    if (invite.expiresAt < now) {
      await fastify.audit.log({
        request,
        orgId: invite.orgId,
        action: 'invite.accept',
        resourceType: 'invite',
        resourceId: invite.id,
        resourceLabel: invite.email,
        outcome: 'DENIED',
        metadata: { reason: 'expired', tokenHash }
      });
      return reply.status(410).send({ error: 'Gone', message: 'Invitation has expired' });
    }
    if (invite.email !== request.user.email) {
      await fastify.audit.log({
        request,
        orgId: invite.orgId,
        action: 'invite.accept',
        resourceType: 'invite',
        resourceId: invite.id,
        resourceLabel: invite.email,
        outcome: 'DENIED',
        metadata: { reason: 'email_mismatch', tokenHash }
      });
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'This invitation was sent to a different email address',
        invitedEmail: invite.email,
      });
    }

    const existingMembership = await fastify.prisma.userOrganization.findUnique({
      where: { userId_orgId: { userId: request.user.id, orgId: invite.orgId } },
      select: { role: true },
    });
    if (existingMembership) {
      await fastify.audit.log({
        request,
        orgId: invite.orgId,
        action: 'invite.accept',
        resourceType: 'invite',
        resourceId: invite.id,
        resourceLabel: invite.email,
        outcome: 'DENIED',
        metadata: { reason: 'already_member', role: existingMembership.role, tokenHash }
      });
      return reply.status(409).send({
        error: 'Conflict',
        message: 'User is already a member of this organization',
        role: existingMembership.role,
      });
    }

    await fastify.prisma.$transaction([
      fastify.prisma.userOrganization.create({
        data: { userId: request.user.id, orgId: invite.orgId, role: invite.role },
      }),
      fastify.prisma.orgInvite.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED', resolvedAt: now },
      }),
    ]);

    await fastify.audit.log({
      request,
      orgId: invite.orgId,
      action: 'invite.accept',
      resourceType: 'invite',
      resourceId: invite.id,
      resourceLabel: invite.email,
      metadata: { role: invite.role, tokenHash }
    });

    return reply.send({
      orgId: invite.orgId,
      orgName: invite.org.name,
      role: invite.role,
    });
  });
}
