export default async function orgRoutes(fastify, _options) {
  /**
   * GET /orgs/:orgId
   * Returns org details and member count
   */
  fastify.get('/', {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ['orgs'],
      description: 'Get organization details',
      security: [{ bearerAuth: [] }],
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
      include: { _count: { select: { users: true } } },
    });

    if (!org) return reply.status(404).send({ error: 'Not found' });

    return reply.send({ id: org.id, name: org.name, memberCount: org._count.users });
  });

  /**
   * PATCH /orgs/:orgId
   * Update organization name
   */
  fastify.patch('/', {
    onRequest: [fastify.authenticate, fastify.requireRole('OWNER')],
    schema: {
      tags: ['orgs'],
      description: 'Update organization',
      security: [{ bearerAuth: [] }],
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
    onRequest: [fastify.authenticate],
    schema: {
      tags: ['orgs'],
      description: 'List organization members',
      security: [{ bearerAuth: [] }],
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

    const members = await fastify.prisma.user.findMany({
      where: { organizationId: orgId },
      select: { id: true, email: true, displayName: true, role: true },
      orderBy: [{ role: 'asc' }, { email: 'asc' }],
    });

    return reply.send(members);
  });
}
