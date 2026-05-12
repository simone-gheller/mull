import { uuidv7 } from 'uuidv7';
import { domainFromEmail, hasEnterpriseSso, normalizeDomain } from '../lib/sso.js';

/**
 * Authentication Routes
 *
 * Provides endpoints for:
 * - GET /auth/me - Get current user info
 * - POST /auth/admin/example - Example admin-only route
 */

export default async function authRoutes(fastify, _options) {
  fastify.post('/auth/login-discovery', {
    schema: {
      tags: ['auth'],
      description: 'Discover whether an email domain should use enterprise SSO',
      body: {
        type: 'object',
        required: ['email'],
        properties: { email: { type: 'string', format: 'email' } }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            primary: { type: 'string' },
            sso: {
              type: 'object',
              properties: {
                available: { type: 'boolean' },
                required: { type: 'boolean' },
                providerId: { type: 'string' },
                orgId: { type: 'string' },
                orgName: { type: 'string' },
                name: { type: 'string' },
                domain: { type: 'string' }
              }
            },
            password: {
              type: 'object',
              properties: {
                available: { type: 'boolean' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const domain = normalizeDomain(domainFromEmail(request.body.email));
    if (!domain) {
      return reply.send({
        primary: 'password',
        sso: { available: false },
        password: { available: true }
      });
    }

    const connection = await fastify.prisma.orgSsoConnection.findFirst({
      where: { status: 'ACTIVE', domains: { has: domain } },
      include: {
        org: {
          select: {
            id: true,
            name: true,
            plan: true,
            authPolicy: true
          }
        }
      }
    });

    if (!connection || !hasEnterpriseSso(connection.org.plan)) {
      return reply.send({
        primary: 'password',
        sso: { available: false },
        password: { available: true }
      });
    }

    const required = connection.org.authPolicy?.ssoMode === 'REQUIRED';
    return reply.send({
      primary: 'sso',
      sso: {
        available: true,
        required,
        providerId: connection.supabaseSsoProviderId,
        orgId: connection.orgId,
        orgName: connection.org.name,
        name: connection.name,
        domain
      },
      password: { available: !required }
    });
  });

/**
   * GET /auth/me
   * Returns authenticated user information
   */
  fastify.get('/auth/me', {
    onRequest: [fastify.authenticate, fastify.requireJwtAuth()],
    schema: {
      tags: ['auth'],
      description: 'Get authenticated user information',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            supabaseId: { type: 'string' },
            displayName: { type: 'string', nullable: true },
            organizations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  role: { type: 'string' },
                  roleId: { type: 'string' },
                  roleKey: { type: 'string' },
                  roleName: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { user } = request;
    return reply.send({
      id: user.id,
      email: user.email,
      supabaseId: user.supabaseId,
      displayName: user.displayName,
      organizations: user.organizations,
    });
  });

  /**
   * GET /auth/whoami
   * Returns API actor/auth context for JWTs, PATs, and service tokens.
   */
  fastify.get('/auth/whoami', {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ['auth'],
      description: 'Inspect the current authenticated actor',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            identityType: { type: 'string' },
            identityId: { type: 'string' },
            identityName: { type: 'string', nullable: true },
            credentialType: { type: 'string' },
            credentialId: { type: 'string', nullable: true },
            credentialPrefix: { type: 'string', nullable: true },
            orgId: { type: 'string', nullable: true },
            orgRole: { type: 'string', nullable: true },
            roleId: { type: 'string', nullable: true },
            roleKey: { type: 'string', nullable: true },
            roleName: { type: 'string', nullable: true },
            scopes: { type: 'array', items: { type: 'string' } },
            appId: { type: 'string', nullable: true },
            environmentId: { type: 'string', nullable: true },
            delegatedUserId: { type: 'string', nullable: true },
            authProvider: { type: 'string', nullable: true },
            ssoProviderId: { type: 'string', nullable: true },
            isSsoSession: { type: 'boolean' },
            organizations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  role: { type: 'string', nullable: true }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    let organizations = request.user?.organizations ?? [];

    if (request.auth.identityType === 'SERVICE') {
      const org = await fastify.prisma.organization.findUnique({
        where: { id: request.auth.orgId },
        select: { id: true, name: true }
      });
      organizations = org ? [{ id: org.id, name: org.name, role: null }] : [];
    }

    return reply.send({
      identityType: request.auth.identityType,
      identityId: request.auth.identityId,
      identityName: request.auth.identityName,
      credentialType: request.auth.credentialType,
      credentialId: request.auth.credentialId,
      credentialPrefix: request.auth.credentialPrefix,
      orgId: request.auth.orgId,
      orgRole: request.auth.orgRole,
      roleId: request.auth.roleId,
      roleKey: request.auth.roleKey,
      roleName: request.auth.roleName,
      scopes: request.auth.scopes,
      appId: request.auth.appId,
      environmentId: request.auth.environmentId,
      delegatedUserId: request.auth.delegatedUserId,
      authProvider: request.auth.authProvider,
      ssoProviderId: request.auth.ssoProviderId,
      isSsoSession: request.auth.isSsoSession,
      organizations
    });
  });

  /**
   * POST /orgs
   * Create a new organization for the authenticated user.
   * Used both during initial registration (after OTP) and for adding org to existing users.
   */
  fastify.post('/orgs', {
    onRequest: [fastify.authenticate, fastify.requireJwtAuth()],
    schema: {
      tags: ['orgs'],
      description: 'Create a new organization',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 255 },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { name } = request.body;
    const orgId = uuidv7();
    const org = await fastify.prisma.$transaction(async (tx) => {
      const ownerRole = await tx.role.findFirst({
        where: { orgId: null, key: 'OWNER' },
        select: { id: true, key: true }
      });
      if (!ownerRole) throw new Error('OWNER role is not seeded');
      const createdOrg = await tx.organization.create({ data: { id: orgId, name } });
      await tx.userOrganization.create({
        data: { userId: request.user.id, orgId, roleId: ownerRole.id },
      });
      await fastify.audit.log({
        request,
        orgId,
        action: 'org.create',
        resourceType: 'org',
        resourceId: orgId,
        resourceLabel: name,
        metadata: { role: ownerRole.key, roleId: ownerRole.id }
      }, { tx });
      return createdOrg;
    });
    return reply.code(201).send({ id: org.id, name: org.name, role: 'OWNER' });
  });

  /**
   * PATCH /auth/me
   * currently updates displayName only, 
   * but can be extended in the future 
   */
  fastify.patch('/auth/me', {
    onRequest: [fastify.authenticate, fastify.requireJwtAuth()],
    schema: {
      tags: ['auth'],
      description: 'Update authenticated user profile',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          displayName: { type: 'string', maxLength: 255 },
        },
      },
      response: {
        200: {
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
  }, async (request, reply) => {
    const { user } = request;
    const { displayName } = request.body;

    const updated = await fastify.prisma.user.update({
      where: { id: user.id },
      data: { ...(displayName !== undefined ? { displayName } : {}) },
      select: { id: true, email: true, displayName: true },
    });

    const orgId = user.organizations?.[0]?.id;
    if (orgId) {
      await fastify.audit.log({
        request,
        orgId,
        action: 'profile.update',
        resourceType: 'user',
        resourceId: user.id,
        resourceLabel: updated.email,
        metadata: { displayNameChanged: displayName !== undefined }
      });
    }

    return reply.send(updated);
  });

  /**
   * POST /auth/admin/example
   * Example admin-only route to demonstrate role-based access control
   */
  fastify.post('/auth/admin/example', {
    onRequest: [fastify.authenticate, fastify.requireJwtAuth(), fastify.requireRole('ADMIN')],
    schema: {
      tags: ['auth'],
      description: 'Example admin-only endpoint',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            user: { type: 'string' }
          }
        },
        403: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const orgId = request.user.organizations?.[0]?.id;
    if (orgId) {
      await fastify.audit.log({
        request,
        orgId,
        action: 'auth.admin_example',
        resourceType: 'auth',
        resourceLabel: request.user.email
      });
    }
    return reply.send({
      message: 'Admin access granted',
      user: request.user.email
    });
  });
}
