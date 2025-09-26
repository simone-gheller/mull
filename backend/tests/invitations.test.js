import { getTestContext } from './setup/testHelpers.js'

describe('Organization Invitations', () => {
  let context

  beforeAll(async () => {
    context = await getTestContext()
  })

  beforeEach(async () => {
    await context.cleanup()
  })

  describe('Creating Invitations', () => {
    test('should allow organization owner to create invitation', async () => {
      // Create organization owner
      const { user, org } = await context.fixtures.createUserWithOrg('OWNER')
      await context.auth.registerUser(user.email, 'testpass123', org.name)

      const invitationData = {
        email: 'newmember@example.com',
        organizationId: org.id,
        role: 'MEMBER'
      }

      const response = await context.api.createInvitation(user.email, invitationData)

      expect(response.statusCode).toBe(201)
      expect(response.body).toHaveProperty('id')
      expect(response.body.email).toBe(invitationData.email)
      expect(response.body.role).toBe(invitationData.role)
      expect(response.body).toHaveProperty('token')
      expect(response.body.organization).toBe(org.name)
    })

    test('should prevent regular members from creating invitations', async () => {
      // Create organization with owner and member
      const { user: owner, org } = await context.fixtures.createUserWithOrg('OWNER')
      const member = await context.fixtures.createUser()
      await context.fixtures.createMembership(member.id, org.id, 'MEMBER')

      // Register member - they need to be authenticated to try the request
      await context.auth.registerUser(member.email, 'testpass123', org.name)

      const invitationData = {
        email: 'newmember@example.com',
        organizationId: org.id,
        role: 'MEMBER'
      }

      const response = await context.api.createInvitation(member.email, invitationData, 403)
      expect(response.statusCode).toBe(403)
      expect(response.body.error).toContain('Not authorized')
    })

    test('should prevent duplicate invitations', async () => {
      const { user, org } = await context.fixtures.createUserWithOrg('OWNER')
      await context.auth.registerUser(user.email, 'testpass123', org.name)

      const email = 'duplicate@example.com'
      const invitationData = {
        email,
        organizationId: org.id,
        role: 'MEMBER'
      }

      // Create first invitation
      await context.api.createInvitation(user.email, invitationData)

      // Try to create duplicate
      const response = await context.api.createInvitation(user.email, invitationData, 400)
      expect(response.statusCode).toBe(400)
      expect(response.body.error).toContain('already pending')
    })
  })

  describe('Accepting Invitations', () => {
    test('should accept invitation and create user account', async () => {
      // Create invitation
      const { user: inviter, org } = await context.fixtures.createUserWithOrg('OWNER')
      const invitation = await context.fixtures.createInvitation(
        'invited@example.com',
        org.id,
        inviter.id
      )

      const response = await context.api.acceptInvitation(
        invitation.token,
        'newuserpass123',
        'New User'
      )

      expect(response.statusCode).toBe(200)
      expect(response.body).toHaveProperty('accessToken')
      expect(response.body).toHaveProperty('refreshToken')
      expect(response.body.user.email).toBe('invited@example.com')
      expect(response.body.user.organizations).toHaveLength(1)
      expect(response.body.user.organizations[0].id).toBe(org.id)
    })

    test('should accept invitation for existing user', async () => {
      // Create existing user and invitation
      const existingUser = await context.fixtures.createUser()
      const { user: inviter, org } = await context.fixtures.createUserWithOrg('OWNER')
      const invitation = await context.fixtures.createInvitation(
        existingUser.email,
        org.id,
        inviter.id
      )

      const response = await context.api.acceptInvitation(
        invitation.token,
        'doesnotmatter123' // Password ignored for existing users
      )

      expect(response.statusCode).toBe(200)
      expect(response.body.user.email).toBe(existingUser.email)
    })

    test('should reject invalid invitation token', async () => {
      const response = await context.api.acceptInvitation(
        'invalid-token',
        'password123',
        undefined,
        404
      )

      expect(response.statusCode).toBe(404)
      expect(response.body.error).toBe('Invalid or expired invitation')
    })

    test('should reject expired invitation', async () => {
      const { user: inviter, org } = await context.fixtures.createUserWithOrg('OWNER')
      const invitation = await context.fixtures.createInvitation(
        'expired@example.com',
        org.id,
        inviter.id,
        { expiresAt: new Date(Date.now() - 1000) } // Expired 1 second ago
      )

      const response = await context.api.acceptInvitation(
        invitation.token,
        'password123',
        undefined,
        404
      )

      expect(response.statusCode).toBe(404)
      expect(response.body.error).toBe('Invalid or expired invitation')
    })

    test('should prevent using expired invitation to register new users', async () => {
      const { user: inviter, org } = await context.fixtures.createUserWithOrg('OWNER')
      
      // Create an invitation that expires immediately
      const invitation = await context.fixtures.createInvitation(
        'newuser@expired.com',
        org.id,
        inviter.id,
        { expiresAt: new Date(Date.now() - 5000) } // Expired 5 seconds ago
      )

      // Verify the invitation token exists but is expired
      expect(invitation.token).toBeDefined()
      expect(invitation.expiresAt).toBeInstanceOf(Date)
      expect(invitation.expiresAt.getTime()).toBeLessThan(Date.now())

      // Attempt to accept the expired invitation for user registration
      const response = await context.api.acceptInvitation(
        invitation.token,
        'newuserpassword123',
        'New User Name',
        404
      )

      expect(response.statusCode).toBe(404)
      expect(response.body.error).toBe('Invalid or expired invitation')

      // Verify that no user account was created
      const userExists = await context.auth.server.prisma.user.findUnique({
        where: { email: 'newuser@expired.com' }
      })
      expect(userExists).toBeNull()

      // Verify that no membership was created
      const membershipExists = await context.auth.server.prisma.membership.findFirst({
        where: {
          organizationId: org.id,
          user: { email: 'newuser@expired.com' }
        }
      })
      expect(membershipExists).toBeNull()
    })
  })

  describe('Managing Invitations', () => {
    test('should list organization invitations', async () => {
      const { user, org } = await context.fixtures.createUserWithOrg('ADMIN')
      await context.auth.registerUser(user.email, 'testpass123', org.name)

      // Create some invitations
      await context.fixtures.createInvitation('user1@example.com', org.id, user.id)
      await context.fixtures.createInvitation('user2@example.com', org.id, user.id)

      const response = await context.auth.authenticatedRequest(
        'get',
        `/auth/organizations/${org.id}/invitations`,
        user.email
      )

      expect(response.statusCode).toBe(200)
      expect(response.body.invitations).toHaveLength(2)
      expect(response.body.invitations[0]).toHaveProperty('email')
      expect(response.body.invitations[0]).toHaveProperty('role')
    })

    test('should revoke invitation', async () => {
      const { user, org } = await context.fixtures.createUserWithOrg('ADMIN')
      await context.auth.registerUser(user.email, 'testpass123', org.name)

      const invitation = await context.fixtures.createInvitation(
        'revoke@example.com',
        org.id,
        user.id
      )

      const response = await context.auth.authenticatedRequest(
        'delete',
        `/auth/invitations/${invitation.id}`,
        user.email
      )

      expect(response.statusCode).toBe(204)
    })
  })

  describe('Invitation Authorization and Cross-Organizational Security', () => {
    test('should prevent users from creating invitations for other organizations', async () => {
      // Create two separate organizations
      const { user: user1, org: org1 } = await context.fixtures.createUserWithOrg('OWNER')
      const { user: user2, org: org2 } = await context.fixtures.createUserWithOrg('OWNER')

      await context.auth.registerUser(user1.email, 'testpass123', org1.name)
      await context.auth.registerUser(user2.email, 'testpass123', org2.name)

      // User1 tries to invite someone to user2's organization
      const invitationData = {
        email: 'unauthorized@example.com',
        organizationId: org2.id,
        role: 'MEMBER'
      }

      const response = await context.api.createInvitation(user1.email, invitationData, 403)
      expect(response.statusCode).toBe(403)
      expect(response.body.error).toContain('Not authorized')
    })

    test('should prevent users from viewing invitations of other organizations', async () => {
      // Create two organizations with invitations
      const { user: user1, org: org1 } = await context.fixtures.createUserWithOrg('ADMIN')
      const { user: user2, org: org2 } = await context.fixtures.createUserWithOrg('ADMIN')

      await context.auth.registerUser(user1.email, 'testpass123', org1.name)
      await context.auth.registerUser(user2.email, 'testpass123', org2.name)

      // Create invitation in org2
      await context.fixtures.createInvitation('test@example.com', org2.id, user2.id)

      // User1 tries to view org2's invitations
      const response = await context.auth.authenticatedRequest(
        'get',
        `/auth/organizations/${org2.id}/invitations`,
        user1.email
      )

      expect(response.statusCode).toBe(403)
      expect(response.body.error).toContain('Not authorized')
    })

    test('should prevent users from revoking invitations from other organizations', async () => {
      // Create two organizations
      const { user: user1, org: org1 } = await context.fixtures.createUserWithOrg('ADMIN')
      const { user: user2, org: org2 } = await context.fixtures.createUserWithOrg('ADMIN')

      await context.auth.registerUser(user1.email, 'testpass123', org1.name)
      await context.auth.registerUser(user2.email, 'testpass123', org2.name)

      // User2 creates an invitation in their org
      const invitation = await context.fixtures.createInvitation('test@example.com', org2.id, user2.id)

      // User1 tries to revoke user2's invitation
      const response = await context.auth.authenticatedRequest(
        'delete',
        `/auth/invitations/${invitation.id}`,
        user1.email
      )

      expect(response.statusCode).toBe(403)
      expect(response.body.error).toContain('Not authorized')
    })

    test('should allow ADMIN users to create invitations', async () => {
      const { user: owner, org } = await context.fixtures.createUserWithOrg('OWNER')
      const admin = await context.fixtures.createUser()
      await context.fixtures.createMembership(admin.id, org.id, 'ADMIN')

      await context.auth.registerUser(admin.email, 'testpass123', org.name)

      const invitationData = {
        email: 'admin-invite@example.com',
        organizationId: org.id,
        role: 'MEMBER'
      }

      const response = await context.api.createInvitation(admin.email, invitationData)
      expect(response.statusCode).toBe(201)
      expect(response.body.email).toBe(invitationData.email)
    })

    test('should prevent creating invitations with invalid organization ID', async () => {
      const { user, org } = await context.fixtures.createUserWithOrg('OWNER')
      await context.auth.registerUser(user.email, 'testpass123', org.name)

      const invitationData = {
        email: 'test@example.com',
        organizationId: 'non-existent-org-id',
        role: 'MEMBER'
      }

      const response = await context.api.createInvitation(user.email, invitationData, 403)
      expect(response.statusCode).toBe(403)
      expect(response.body.error).toContain('Not authorized')
    })

    test('should prevent non-authenticated users from creating invitations', async () => {
      const { org } = await context.fixtures.createUserWithOrg('OWNER')
      
      const invitationData = {
        email: 'test@example.com',
        organizationId: org.id,
        role: 'MEMBER'
      }

      const response = await context.auth.server.inject({
        method: 'POST',
        url: '/auth/invite',
        payload: invitationData
      })

      expect(response.statusCode).toBe(401)
    })

    test('should prevent inviting users who are already members', async () => {
      // Create organization with two members
      const { user: owner, org } = await context.fixtures.createUserWithOrg('OWNER')
      const existingMember = await context.fixtures.createUser()
      await context.fixtures.createMembership(existingMember.id, org.id, 'MEMBER')

      await context.auth.registerUser(owner.email, 'testpass123', org.name)

      const invitationData = {
        email: existingMember.email,
        organizationId: org.id,
        role: 'MEMBER'
      }

      const response = await context.api.createInvitation(owner.email, invitationData, 400)
      expect(response.statusCode).toBe(400)
      expect(response.body.error).toContain('already a member')
    })

    test('should handle invitation isolation between organizations', async () => {
      // Create identical setups in two different organizations
      const setup1 = await context.fixtures.createUserWithOrg('OWNER')
      const setup2 = await context.fixtures.createUserWithOrg('OWNER')

      await context.auth.registerUser(setup1.user.email, 'testpass123', setup1.org.name)
      await context.auth.registerUser(setup2.user.email, 'testpass123', setup2.org.name)

      // Create invitations in both organizations with same email
      const invitationData = {
        email: 'sameemail@example.com',
        organizationId: setup1.org.id,
        role: 'MEMBER'
      }

      const invitation1 = await context.api.createInvitation(setup1.user.email, invitationData)
      expect(invitation1.statusCode).toBe(201)

      // Same email can be invited to different organizations
      const invitationData2 = {
        email: 'sameemail@example.com',
        organizationId: setup2.org.id,
        role: 'MEMBER'
      }

      const invitation2 = await context.api.createInvitation(setup2.user.email, invitationData2)
      expect(invitation2.statusCode).toBe(201)

      // Each user should only see their own organization's invitations
      const orgInvitations1 = await context.auth.authenticatedRequest(
        'get',
        `/auth/organizations/${setup1.org.id}/invitations`,
        setup1.user.email
      )
      expect(orgInvitations1.statusCode).toBe(200)
      expect(orgInvitations1.body.invitations).toHaveLength(1)

      const orgInvitations2 = await context.auth.authenticatedRequest(
        'get',
        `/auth/organizations/${setup2.org.id}/invitations`,
        setup2.user.email
      )
      expect(orgInvitations2.statusCode).toBe(200)
      expect(orgInvitations2.body.invitations).toHaveLength(1)
    })

    test('should validate invitation acceptance authorization', async () => {
      // Test that invitation acceptance works correctly and creates proper memberships
      const { user: inviter, org } = await context.fixtures.createUserWithOrg('OWNER')
      const invitation = await context.fixtures.createInvitation(
        'newuser@example.com',
        org.id,
        inviter.id
      )

      const response = await context.api.acceptInvitation(
        invitation.token,
        'newuserpass123',
        'New User'
      )

      expect(response.statusCode).toBe(200)
      expect(response.body.user.organizations).toHaveLength(1)
      expect(response.body.user.organizations[0].id).toBe(org.id)
      expect(response.body.user.organizations[0].role).toBe('MEMBER')
    })
  })
})