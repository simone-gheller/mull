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
    const now = new Date();

    const invite = await fastify.prisma.orgInvite.findUnique({
      where: { token },
      include: {
        org: { select: { name: true } },
        inviter: { select: { email: true, displayName: true } },
      },
    });

    if (!invite) {
      return reply.status(404).send({ error: 'Not Found', message: 'Invitation not found' });
    }
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
    const now = new Date();

    const invite = await fastify.prisma.orgInvite.findUnique({
      where: { token },
      include: { org: { select: { id: true, name: true } } },
    });

    if (!invite) {
      return reply.status(404).send({ error: 'Not Found', message: 'Invitation not found' });
    }
    if (invite.status === 'REVOKED') {
      return reply.status(410).send({ error: 'Gone', message: 'Invitation was revoked' });
    }
    if (invite.status === 'ACCEPTED') {
      return reply.status(410).send({ error: 'Gone', message: 'Invitation already used' });
    }
    if (invite.expiresAt < now) {
      return reply.status(410).send({ error: 'Gone', message: 'Invitation has expired' });
    }
    if (invite.email !== request.user.email) {
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

    return reply.send({
      orgId: invite.orgId,
      orgName: invite.org.name,
      role: invite.role,
    });
  });
}
