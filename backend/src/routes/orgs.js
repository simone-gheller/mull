import { uuidv7 } from 'uuidv7';
import crypto from 'node:crypto';
import { uuidV7Param } from '../schemas/common.js';
import { isPaidPlan, SYSTEM_ROLE_KEYS, validatePermissions } from '../lib/rbac.js';
import { hasEnterpriseSso, normalizeDomain } from '../lib/sso.js';

function tokenFingerprint(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

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

const memberParamsSchema = {
  type: 'object',
  required: ['orgId', 'userId'],
  properties: {
    orgId: uuidV7Param('Organization ID'),
    userId: uuidV7Param('User ID'),
  },
};

export default async function orgRoutes(fastify, _options) {
  async function resolveAssignableRole(orgId, roleId) {
    return fastify.prisma.role.findFirst({
      where: {
        id: roleId,
        OR: [{ orgId: null }, { orgId }]
      },
      select: { id: true, key: true, name: true, kind: true, orgId: true, permissions: true }
    });
  }

  /**
   * GET /orgs/:orgId
   * Returns org details and member count
   */
  fastify.get('/', {
    onRequest: [fastify.authenticate, fastify.validateOrgAccess, fastify.requireJwtAuth(), fastify.requireScope('org:read')],
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
            plan: { type: 'string' },
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

    return reply.send({ id: org.id, name: org.name, plan: org.plan, memberCount: org._count.members });
  });

  /**
   * PATCH /orgs/:orgId
   * Update organization name (OWNER only)
   */
  fastify.patch('/', {
    onRequest: [fastify.authenticate, fastify.validateOrgAccess, fastify.requireJwtAuth(), fastify.requireScope('org:update')],
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

    await fastify.audit.log({
      request,
      orgId,
      action: 'org.update',
      resourceType: 'org',
      resourceId: org.id,
      resourceLabel: org.name,
      metadata: { nameChanged: true }
    });

    return reply.send(org);
  });

  fastify.get('/sso', {
    onRequest: [fastify.authenticate, fastify.validateOrgAccess, fastify.requireJwtAuth(), fastify.requireScope('org:read')],
    schema: {
      tags: ['orgs'],
      description: 'Get organization SSO settings',
      security: [{ bearerAuth: [] }],
      params: orgIdParamsSchema
    }
  }, async (request, reply) => {
    const { orgId } = request.params;
    const org = await fastify.prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        plan: true,
        authPolicy: true,
        ssoConnections: { orderBy: { createdAt: 'desc' } }
      }
    });
    const eligible = hasEnterpriseSso(org?.plan);
    return reply.send({
      eligible,
      plan: org?.plan ?? 'FREE',
      policy: {
        ssoMode: org?.authPolicy?.ssoMode ?? 'OFF',
        allowPasswordFallbackForOwners: org?.authPolicy?.allowPasswordFallbackForOwners ?? true,
        enforcementSuspended: !eligible
      },
      connection: org?.ssoConnections?.[0] ? {
        id: org.ssoConnections[0].id,
        supabaseSsoProviderId: org.ssoConnections[0].supabaseSsoProviderId,
        name: org.ssoConnections[0].name,
        domains: org.ssoConnections[0].domains,
        status: org.ssoConnections[0].status
      } : null
    });
  });

  fastify.patch('/sso', {
    onRequest: [fastify.authenticate, fastify.validateOrgAccess, fastify.requireJwtAuth(), fastify.requireScope('org:update')],
    schema: {
      tags: ['orgs'],
      description: 'Update organization SSO policy and manual-assisted connection metadata',
      security: [{ bearerAuth: [] }],
      params: orgIdParamsSchema,
      body: {
        type: 'object',
        properties: {
          ssoMode: { type: 'string', enum: ['OFF', 'OPTIONAL', 'REQUIRED'] },
          allowPasswordFallbackForOwners: { type: 'boolean' },
          connection: {
            type: 'object',
            nullable: true,
            properties: {
              supabaseSsoProviderId: { type: 'string', format: 'uuid' },
              name: { type: 'string', minLength: 1, maxLength: 255 },
              domains: { type: 'array', items: { type: 'string', minLength: 3, maxLength: 255 } },
              status: { type: 'string', enum: ['DRAFT', 'ACTIVE', 'DISABLED'] }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { orgId } = request.params;
    const org = await fastify.prisma.organization.findUnique({
      where: { id: orgId },
      select: { plan: true, ssoConnections: { orderBy: { createdAt: 'desc' }, take: 1 } }
    });
    if (!hasEnterpriseSso(org?.plan)) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'Enterprise SSO requires Business or Custom plan',
        statusCode: 403,
        code: 'FEATURE_NOT_AVAILABLE'
      });
    }

    const existing = org.ssoConnections[0] ?? null;
    const connectionInput = request.body.connection;
    if (connectionInput && (!connectionInput.supabaseSsoProviderId || !connectionInput.name || !connectionInput.domains?.length)) {
      return reply.code(400).send({
        error: 'Bad Request',
        message: 'SSO connection requires provider ID, name, and at least one domain',
        statusCode: 400
      });
    }
    const nextMode = request.body.ssoMode;
    if (nextMode && nextMode !== 'OFF') {
      const hasActiveConnection = connectionInput
        ? connectionInput.status === 'ACTIVE'
        : existing?.status === 'ACTIVE';
      if (!hasActiveConnection) {
        return reply.code(409).send({
          error: 'Conflict',
          message: 'An active SSO connection is required before enabling SSO',
          statusCode: 409
        });
      }
    }

    const result = await fastify.prisma.$transaction(async tx => {
      const policy = await tx.orgAuthPolicy.upsert({
        where: { orgId },
        create: {
          orgId,
          ssoMode: request.body.ssoMode ?? 'OFF',
          allowPasswordFallbackForOwners: request.body.allowPasswordFallbackForOwners ?? true
        },
        update: {
          ...(request.body.ssoMode !== undefined ? { ssoMode: request.body.ssoMode } : {}),
          ...(request.body.allowPasswordFallbackForOwners !== undefined
            ? { allowPasswordFallbackForOwners: request.body.allowPasswordFallbackForOwners }
            : {})
        }
      });

      let connection = existing;
      if (connectionInput) {
        const data = {
          supabaseSsoProviderId: connectionInput.supabaseSsoProviderId,
          name: connectionInput.name?.trim(),
          domains: (connectionInput.domains ?? []).map(normalizeDomain).filter(Boolean),
          status: connectionInput.status ?? 'DRAFT'
        };
        connection = existing
          ? await tx.orgSsoConnection.update({
              where: { id: existing.id },
              data
            })
          : await tx.orgSsoConnection.create({
              data: {
                id: uuidv7(),
                orgId,
                ...data
              }
            });
      }

      await fastify.audit.log({
        request,
        orgId,
        action: 'org.sso_update',
        resourceType: 'org',
        resourceId: orgId,
        metadata: {
          ssoMode: policy.ssoMode,
          allowPasswordFallbackForOwners: policy.allowPasswordFallbackForOwners,
          connectionStatus: connection?.status ?? null
        }
      }, { tx });
      return { policy, connection };
    });

    return reply.send({
      eligible: true,
      plan: org.plan,
      policy: {
        ssoMode: result.policy.ssoMode,
        allowPasswordFallbackForOwners: result.policy.allowPasswordFallbackForOwners,
        enforcementSuspended: false
      },
      connection: result.connection ? {
        id: result.connection.id,
        supabaseSsoProviderId: result.connection.supabaseSsoProviderId,
        name: result.connection.name,
        domains: result.connection.domains,
        status: result.connection.status
      } : null
    });
  });

  /**
   * GET /orgs/:orgId/members
   * Returns all members of the organization
   */
  fastify.get('/members', {
    onRequest: [fastify.authenticate, fastify.validateOrgAccess, fastify.requireJwtAuth(), fastify.requireScope('members:read')],
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
              roleId: { type: 'string' },
              roleKey: { type: 'string' },
              roleName: { type: 'string' },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { orgId } = request.params;

    const memberships = await fastify.prisma.userOrganization.findMany({
      where: { orgId },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
        role: { select: { id: true, key: true, name: true, kind: true } }
      },
      orderBy: [{ user: { email: 'asc' } }],
    });

    return reply.send(memberships.map(m => ({
      id: m.user.id,
      email: m.user.email,
      displayName: m.user.displayName,
      role: m.role.key,
      roleId: m.role.id,
      roleKey: m.role.key,
      roleName: m.role.name,
      roleKind: m.role.kind
    })));
  });

  fastify.get('/roles', {
    onRequest: [fastify.authenticate, fastify.validateOrgAccess, fastify.requireJwtAuth(), fastify.requireScope('roles:read')],
    schema: { tags: ['orgs'], security: [{ bearerAuth: [] }], params: orgIdParamsSchema },
  }, async (request, reply) => {
    const { orgId } = request.params;
    const roles = await fastify.prisma.role.findMany({
      where: { OR: [{ orgId: null }, { orgId }] },
      orderBy: [{ kind: 'desc' }, { name: 'asc' }]
    });
    return reply.send(roles.map(role => ({
      id: role.id,
      orgId: role.orgId,
      key: role.key,
      name: role.name,
      description: role.description,
      kind: role.kind,
      permissions: role.permissions,
      createdAt: role.createdAt
    })));
  });

  fastify.post('/roles', {
    onRequest: [fastify.authenticate, fastify.validateOrgAccess, fastify.requireJwtAuth(), fastify.requireScope('roles:manage')],
    schema: {
      tags: ['orgs'],
      security: [{ bearerAuth: [] }],
      params: orgIdParamsSchema,
      body: {
        type: 'object',
        required: ['name', 'permissions'],
        properties: {
          key: { type: 'string', minLength: 2, maxLength: 100 },
          name: { type: 'string', minLength: 2, maxLength: 255 },
          description: { type: 'string', nullable: true },
          permissions: { type: 'array' }
        }
      }
    },
  }, async (request, reply) => {
    const { orgId } = request.params;
    const org = await fastify.prisma.organization.findUnique({ where: { id: orgId }, select: { plan: true } });
    if (!isPaidPlan(org?.plan)) {
      return reply.code(403).send({ error: 'Forbidden', message: 'Custom roles require a paid plan', statusCode: 403 });
    }

    let permissions;
    try {
      permissions = validatePermissions(request.body.permissions);
    } catch (error) {
      return reply.code(400).send({ error: 'Bad Request', message: error.message, statusCode: 400 });
    }

    const key = (request.body.key || request.body.name)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (!key || SYSTEM_ROLE_KEYS.includes(key)) {
      return reply.code(400).send({ error: 'Bad Request', message: 'Invalid custom role key', statusCode: 400 });
    }

    try {
      const role = await fastify.prisma.role.create({
        data: {
          id: uuidv7(),
          orgId,
          key,
          name: request.body.name.trim(),
          description: request.body.description?.trim() || null,
          kind: 'CUSTOM',
          permissions,
          createdByUserId: request.user.id
        }
      });
      await fastify.audit.log({
        request,
        orgId,
        action: 'role.create',
        resourceType: 'role',
        resourceId: role.id,
        resourceLabel: role.name,
        metadata: { key: role.key, permissions }
      });
      return reply.code(201).send(role);
    } catch (error) {
      if (error.code === 'P2002') {
        return reply.code(409).send({ error: 'Conflict', message: 'Role key already exists', statusCode: 409 });
      }
      throw error;
    }
  });

  fastify.patch('/roles/:roleId', {
    onRequest: [fastify.authenticate, fastify.validateOrgAccess, fastify.requireJwtAuth(), fastify.requireScope('roles:manage')],
    schema: {
      tags: ['orgs'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['orgId', 'roleId'],
        properties: { orgId: uuidV7Param('Organization ID'), roleId: uuidV7Param('Role ID') }
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 255 },
          description: { type: 'string', nullable: true },
          permissions: { type: 'array' }
        }
      }
    }
  }, async (request, reply) => {
    const { orgId, roleId } = request.params;
    const org = await fastify.prisma.organization.findUnique({ where: { id: orgId }, select: { plan: true } });
    if (!isPaidPlan(org?.plan)) {
      return reply.code(403).send({ error: 'Forbidden', message: 'Custom roles require a paid plan', statusCode: 403 });
    }
    const existing = await fastify.prisma.role.findFirst({ where: { id: roleId, orgId, kind: 'CUSTOM' } });
    if (!existing) return reply.code(404).send({ error: 'Not Found', message: 'Custom role not found', statusCode: 404 });

    let permissions;
    if (request.body.permissions !== undefined) {
      try {
        permissions = validatePermissions(request.body.permissions);
      } catch (error) {
        return reply.code(400).send({ error: 'Bad Request', message: error.message, statusCode: 400 });
      }
    }

    const role = await fastify.prisma.role.update({
      where: { id: roleId },
      data: {
        ...(request.body.name !== undefined ? { name: request.body.name.trim() } : {}),
        ...(request.body.description !== undefined ? { description: request.body.description?.trim() || null } : {}),
        ...(permissions !== undefined ? { permissions } : {})
      }
    });
    await fastify.audit.log({
      request,
      orgId,
      action: 'role.update',
      resourceType: 'role',
      resourceId: role.id,
      resourceLabel: role.name,
      metadata: { key: role.key }
    });
    return reply.send(role);
  });

  fastify.delete('/roles/:roleId', {
    onRequest: [fastify.authenticate, fastify.validateOrgAccess, fastify.requireJwtAuth(), fastify.requireScope('roles:manage')],
    schema: {
      tags: ['orgs'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['orgId', 'roleId'],
        properties: { orgId: uuidV7Param('Organization ID'), roleId: uuidV7Param('Role ID') }
      }
    }
  }, async (request, reply) => {
    const { orgId, roleId } = request.params;
    const org = await fastify.prisma.organization.findUnique({ where: { id: orgId }, select: { plan: true } });
    if (!isPaidPlan(org?.plan)) {
      return reply.code(403).send({ error: 'Forbidden', message: 'Custom roles require a paid plan', statusCode: 403 });
    }
    const role = await fastify.prisma.role.findFirst({
      where: { id: roleId, orgId, kind: 'CUSTOM' },
      include: { _count: { select: { memberships: true, invites: true } } }
    });
    if (!role) return reply.code(404).send({ error: 'Not Found', message: 'Custom role not found', statusCode: 404 });
    if (role._count.memberships > 0 || role._count.invites > 0) {
      return reply.code(409).send({ error: 'Conflict', message: 'Role is still assigned', statusCode: 409 });
    }
    await fastify.prisma.role.delete({ where: { id: roleId } });
    await fastify.audit.log({
      request,
      orgId,
      action: 'role.delete',
      resourceType: 'role',
      resourceId: role.id,
      resourceLabel: role.name,
      metadata: { key: role.key }
    });
    return reply.code(204).send();
  });

  async function countOwners(orgId) {
    return fastify.prisma.userOrganization.count({
      where: { orgId, role: { key: 'OWNER', orgId: null } }
    });
  }

  fastify.patch('/members/:userId', {
    onRequest: [fastify.authenticate, fastify.validateOrgAccess, fastify.requireJwtAuth(), fastify.requireScope('members:manage')],
    schema: {
      tags: ['orgs'],
      security: [{ bearerAuth: [] }],
      params: memberParamsSchema,
      body: {
        type: 'object',
        required: ['roleId'],
        properties: { roleId: uuidV7Param('Role ID') }
      }
    }
  }, async (request, reply) => {
    const { orgId, userId } = request.params;
    const { roleId } = request.body;
    if (userId === request.user.id) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'You cannot change your own role',
        statusCode: 403
      });
    }

    const membership = await fastify.prisma.userOrganization.findUnique({
      where: { userId_orgId: { userId, orgId } },
      include: { role: { select: { key: true } }, user: { select: { email: true, displayName: true } } }
    });
    if (!membership) return reply.code(404).send({ error: 'Not Found', message: 'Member not found', statusCode: 404 });
    const nextRole = await resolveAssignableRole(orgId, roleId);
    if (!nextRole) return reply.code(400).send({ error: 'Bad Request', message: 'Role is not assignable in this organization', statusCode: 400 });
    if (membership.role.key === 'OWNER' || nextRole.key === 'OWNER') {
      return reply.code(409).send({
        error: 'Conflict',
        message: 'Ownership changes require the transfer ownership flow',
        statusCode: 409
      });
    }
    const updated = await fastify.prisma.userOrganization.update({
      where: { userId_orgId: { userId, orgId } },
      data: { roleId: nextRole.id },
      include: { role: { select: { id: true, key: true, name: true, kind: true } }, user: { select: { id: true, email: true, displayName: true } } }
    });
    await fastify.audit.log({
      request,
      orgId,
      action: 'member.role_update',
      resourceType: 'member',
      resourceId: userId,
      resourceLabel: updated.user.email,
      metadata: { previousRole: membership.role.key, nextRole: nextRole.key, roleId: nextRole.id }
    });
    return reply.send({
      id: updated.user.id,
      email: updated.user.email,
      displayName: updated.user.displayName,
      role: updated.role.key,
      roleId: updated.role.id,
      roleKey: updated.role.key,
      roleName: updated.role.name,
      roleKind: updated.role.kind
    });
  });

  fastify.delete('/members/:userId', {
    onRequest: [fastify.authenticate, fastify.validateOrgAccess, fastify.requireJwtAuth(), fastify.requireScope('members:manage')],
    schema: { tags: ['orgs'], security: [{ bearerAuth: [] }], params: memberParamsSchema }
  }, async (request, reply) => {
    const { orgId, userId } = request.params;
    const membership = await fastify.prisma.userOrganization.findUnique({
      where: { userId_orgId: { userId, orgId } },
      include: { role: { select: { key: true } }, user: { select: { email: true } } }
    });
    if (!membership) return reply.code(404).send({ error: 'Not Found', message: 'Member not found', statusCode: 404 });
    if (membership.role.key === 'OWNER' && await countOwners(orgId) <= 1) {
      return reply.code(409).send({ error: 'Conflict', message: 'Cannot remove the last owner', statusCode: 409 });
    }
    await fastify.prisma.userOrganization.delete({ where: { userId_orgId: { userId, orgId } } });
    await fastify.audit.log({
      request,
      orgId,
      action: 'member.remove',
      resourceType: 'member',
      resourceId: userId,
      resourceLabel: membership.user.email,
      metadata: { role: membership.role.key }
    });
    return reply.code(204).send();
  });

  /**
   * POST /orgs/:orgId/invites
   * Invite a user. If already registered → direct add. Otherwise → email via nodemailer.
   */
  fastify.post('/invites', {
    onRequest: [fastify.authenticate, fastify.validateOrgAccess, fastify.requireJwtAuth(), fastify.requireScope('members:manage')],
    schema: {
      tags: ['orgs'],
      security: [{ bearerAuth: [] }],
      params: orgIdParamsSchema,
      body: {
        type: 'object',
        required: ['email', 'roleId'],
        properties: {
          email: { type: 'string', format: 'email' },
          roleId: uuidV7Param('Role ID'),
        },
      },
    },
  }, async (request, reply) => {
    const { orgId } = request.params;
    const { email, roleId } = request.body;
    const role = await resolveAssignableRole(orgId, roleId);
    if (!role) return reply.code(400).send({ error: 'Bad Request', message: 'Role is not assignable in this organization', statusCode: 400 });
    if (role.key === 'OWNER') return reply.code(400).send({ error: 'Bad Request', message: 'Owner invites are not supported', statusCode: 400 });

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
    const tokenHash = tokenFingerprint(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const inviteUrl = `${fastify.config.APP_URL}/invite/accept?token=${token}`;

    const invite = await fastify.prisma.orgInvite.create({
      data: { id: uuidv7(), orgId, email, roleId: role.id, tokenHash, invitedBy: request.user.id, expiresAt },
    });

    await fastify.mailer.sendInvite({
      to: email,
      orgName: org.name,
      inviterName: request.user.displayName || request.user.email,
      role: role.key,
      inviteUrl,
    });

    await fastify.audit.log({
      request,
      orgId,
      action: 'invite.create',
      resourceType: 'invite',
      resourceId: invite.id,
      resourceLabel: email,
      metadata: { role: role.key, roleId: role.id, expiresAt: expiresAt.toISOString() }
    });

    return reply.status(200).send({ type: 'invite_sent', email });
  });

  /**
   * GET /orgs/:orgId/invites
   * List PENDING non-expired invites for this org.
   */
  fastify.get('/invites', {
    onRequest: [fastify.authenticate, fastify.validateOrgAccess, fastify.requireJwtAuth(), fastify.requireScope('members:manage')],
    schema: { tags: ['orgs'], security: [{ bearerAuth: [] }], params: orgIdParamsSchema },
  }, async (request, reply) => {
    const { orgId } = request.params;
    const now = new Date();

    const invites = await fastify.prisma.orgInvite.findMany({
      where: { orgId, status: 'PENDING', expiresAt: { gt: now } },
      include: {
        inviter: { select: { email: true, displayName: true } },
        role: { select: { id: true, key: true, name: true, kind: true } }
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send(invites.map(inv => ({
      id: inv.id,
      email: inv.email,
      role: inv.role.key,
      roleId: inv.role.id,
      roleKey: inv.role.key,
      roleName: inv.role.name,
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
    onRequest: [fastify.authenticate, fastify.validateOrgAccess, fastify.requireJwtAuth(), fastify.requireScope('members:manage')],
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

    await fastify.audit.log({
      request,
      orgId,
      action: 'invite.revoke',
      resourceType: 'invite',
      resourceId: invite.id,
      resourceLabel: invite.email,
      metadata: { roleId: invite.roleId }
    });

    return reply.status(204).send();
  });

  fastify.get('/audit-events', {
    onRequest: [fastify.authenticate, fastify.validateOrgAccess, fastify.requireJwtAuth(), fastify.requireScope('audit:read')],
    schema: {
      tags: ['orgs'],
      security: [{ bearerAuth: [] }],
      params: orgIdParamsSchema,
      querystring: {
        type: 'object',
        properties: {
          cursor: { type: 'string' },
          limit: { type: 'integer', minimum: 1, maximum: 100 },
          action: { type: 'string' },
          resourceType: { type: 'string' },
          actorUserId: uuidV7Param('Actor user ID'),
          outcome: { type: 'string', enum: ['SUCCESS', 'DENIED', 'FAILURE'] },
          from: { type: 'string', format: 'date-time' },
          to: { type: 'string', format: 'date-time' },
        },
      },
    },
  }, async (request, reply) => {
    const { orgId } = request.params;
    const {
      cursor,
      limit = 50,
      action,
      resourceType,
      actorUserId,
      outcome,
      from,
      to,
    } = request.query;

    const where = {
      orgId,
      ...(action ? { action } : {}),
      ...(resourceType ? { resourceType } : {}),
      ...(actorUserId ? { actorUserId } : {}),
      ...(outcome ? { outcome } : {}),
      ...((from || to) ? {
        createdAt: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        },
      } : {}),
    };

    const events = await fastify.prisma.auditEvent.findMany({
      where,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        actorUserId: true,
        actorType: true,
        actorDisplay: true,
        action: true,
        resourceType: true,
        resourceId: true,
        resourceLabel: true,
        outcome: true,
        requestId: true,
        ip: true,
        userAgent: true,
        metadata: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    const page = events.slice(0, limit);
    return reply.send({
      items: page.map(event => ({
        ...event,
        createdAt: event.createdAt.toISOString(),
        expiresAt: event.expiresAt?.toISOString() ?? null,
      })),
      nextCursor: events.length > limit ? page.at(-1).id : null,
    });
  });
}
