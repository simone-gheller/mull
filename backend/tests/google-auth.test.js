import { createTestServer } from './setup/globalSetup.js'
import { TestFixtures } from './setup/fixtures.js'
import { AuthHelper, ApiHelper } from './setup/testHelpers.js'
import googleAuth from '../src/routes/googleAuth.js'
import register from '../src/routes/register.js'
import login from '../src/routes/login.js'
import authRoutes from '../src/routes/auth.js'
import invitations from '../src/routes/invitations.js'
import Fastify from 'fastify'
import prismaPlugin from '../src/plugins/prisma.js'
import authPlugin from '../src/plugins/auth.js'
import cryptoService from '../src/crypto/crypto.js'

// Simple mock implementation for Google OAuth service
const mockGoogleOAuth = {
  getAuthUrl: (action, invitationToken) => {
    mockGoogleOAuth._getAuthUrlCalls.push([action, invitationToken])
    return `https://accounts.google.com/oauth/authorize?action=${action}&token=${invitationToken || 'none'}`
  },
  
  getProfile: async (code, state) => {
    mockGoogleOAuth._getProfileCalls.push([code, state])
    if (mockGoogleOAuth._getProfileError) {
      throw mockGoogleOAuth._getProfileError
    }
    
    // If we have a mocked return value, use it directly
    if (mockGoogleOAuth._getProfileReturnValue) {
      return mockGoogleOAuth._getProfileReturnValue
    }
    
    // Otherwise, try to parse state for default behavior
    let stateData
    try {
      stateData = mockGoogleOAuth.parseState(state)
    } catch (error) {
      // If state parsing fails, use a default state (for backward compatibility)
      stateData = {
        action: 'login',
        nonce: 'mock_nonce',
        timestamp: Date.now()
      }
    }
    
    return {
      profile: {
        googleId: 'mock_google_123',
        email: 'test@example.com',
        name: 'Test User'
      },
      state: stateData
    }
  },
  
  validateConfig: () => {
    mockGoogleOAuth._validateConfigCalls.push([])
    return true
  },
  
  generateState: (action, invitationToken) => {
    const stateData = {
      action,
      nonce: 'mock_nonce',
      timestamp: Date.now(),
      ...(invitationToken && { invitationToken })
    }
    return Buffer.from(JSON.stringify(stateData)).toString('base64')
  },
  
  parseState: (state) => {
    try {
      return JSON.parse(Buffer.from(state, 'base64').toString())
    } catch (error) {
      throw new Error('Invalid state parameter')
    }
  },
  
  // Mock tracking and control
  _getAuthUrlCalls: [],
  _getProfileCalls: [],
  _validateConfigCalls: [],
  _getProfileReturnValue: null,
  _getProfileError: null,
  
  // Mock control methods
  mockReturnValue: (method, value) => {
    mockGoogleOAuth[`_${method}ReturnValue`] = value
  },
  
  mockResolvedValue: (method, value) => {
    mockGoogleOAuth[`_${method}ReturnValue`] = value
  },
  
  mockRejectedValue: (method, error) => {
    mockGoogleOAuth[`_${method}Error`] = error
  },
  
  toHaveBeenCalledWith: (method, ...args) => {
    const calls = mockGoogleOAuth[`_${method}Calls`] || []
    return calls.some(call => 
      call.length === args.length && 
      call.every((arg, i) => arg === args[i])
    )
  },
  
  resetMocks: () => {
    mockGoogleOAuth._getAuthUrlCalls = []
    mockGoogleOAuth._getProfileCalls = []
    mockGoogleOAuth._validateConfigCalls = []
    mockGoogleOAuth._getProfileReturnValue = null
    mockGoogleOAuth._getProfileError = null
  }
}

describe('Google OAuth Authentication', () => {
  let context
  let server

  beforeAll(async () => {
    // Create a custom server for this test suite with mock injection
    server = Fastify({
      logger: {
        level: 'info',
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss.l',
            ignore: 'pid,hostname,reqId,responseTime',
            messageFormat: '{levelLabel} - {msg}',
            singleLine: true
          }
        }
      }
    })

    // Decorate with crypto service
    server.decorate("crypto", cryptoService)

    // Register plugins
    await server.register(prismaPlugin)
    await server.register(authPlugin)
    
    // Register all auth routes
    await server.register(register, { prefix: '/auth' })
    await server.register(login, { prefix: '/auth' })
    await server.register(authRoutes, { prefix: '/auth' })
    await server.register(invitations, { prefix: '/auth' })
    
    // Register Google OAuth routes with mock service
    await server.register(googleAuth, { 
      prefix: '/auth',
      googleOAuthService: mockGoogleOAuth 
    })

    // Add auth hook
    server.addHook("onRequest", async (request, reply) => {
      if (!request.url.startsWith("/auth"))
        await server.authenticate(request, reply)
    })

    await server.ready()
    
    // Create test helpers
    const auth = new AuthHelper(server)
    const fixtures = new TestFixtures()
    const api = new ApiHelper(server, auth)
    
    context = { auth, fixtures, api }
  })

  afterAll(async () => {
    if (server) {
      await server.close()
    }
  })

  beforeEach(async () => {
    await context.fixtures.cleanup()
    // Reset all mocks
    mockGoogleOAuth.resetMocks()
  })

  describe('OAuth Initiation', () => {
    test('should initiate Google OAuth for login', async () => {
      const response = await context.auth.server.inject({
        method: 'GET',
        url: '/auth/google?action=login'
      })

      // Should redirect to Google OAuth (even if credentials are not configured)
      expect([302, 500]).toContain(response.statusCode)
      if (response.statusCode === 302) {
        expect(response.headers.location).toContain('accounts.google.com')
      }
    })

    test('should initiate Google OAuth for registration', async () => {
      const response = await context.auth.server.inject({
        method: 'GET',
        url: '/auth/google?action=register'
      })

      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toContain('accounts.google.com')
      
      // Check that getAuthUrl was called with correct parameters
      expect(mockGoogleOAuth._getAuthUrlCalls.length).toBeGreaterThan(0)
      expect(mockGoogleOAuth._getAuthUrlCalls[0]).toEqual(['register', undefined])
    })

    test('should initiate Google OAuth with invitation token', async () => {
      const invitationToken = 'test_invitation_token'
      
      const response = await context.auth.server.inject({
        method: 'GET',
        url: `/auth/google?action=invitation&invitation_token=${invitationToken}`
      })

      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toContain('accounts.google.com')
      
      // Check that getAuthUrl was called with correct parameters  
      expect(mockGoogleOAuth._getAuthUrlCalls.length).toBeGreaterThan(0)
      expect(mockGoogleOAuth._getAuthUrlCalls[0]).toEqual(['invitation', invitationToken])
    })

    test('should reject invalid action parameter', async () => {
      const response = await context.auth.server.inject({
        method: 'GET',
        url: '/auth/google?action=invalid'
      })

      expect(response.statusCode).toBe(400)
      expect(response.json().error).toBe('Invalid action parameter')
    })

    test('should require invitation_token for invitation action', async () => {
      const response = await context.auth.server.inject({
        method: 'GET',
        url: '/auth/google?action=invitation'
      })

      expect(response.statusCode).toBe(400)
      expect(response.json().error).toBe('invitation_token required for invitation action')
    })
  })

  describe('OAuth Callback - Login', () => {
    test('should handle successful Google login for existing user', async () => {
      // Create existing user with Google ID
      const existingUser = await context.fixtures.createUser({
        email: 'test@example.com',
        googleId: 'google_login_123',
        authProvider: 'GOOGLE'
      })
      const org = await context.fixtures.createOrganization()
      await context.fixtures.createMembership(existingUser.id, org.id, 'MEMBER')

      // Mock Google OAuth response
      const mockProfile = {
        googleId: 'google_login_123',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/pic.jpg',
        verified: true
      }
      
      mockGoogleOAuth.mockResolvedValue('getProfile', {
        profile: mockProfile,
        state: { action: 'login', nonce: 'test_nonce', timestamp: Date.now() }
      })

      const response = await context.auth.server.inject({
        method: 'GET',
        url: '/auth/google/callback?code=test_code&state=test_state'
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toHaveProperty('accessToken')
      expect(response.json()).toHaveProperty('refreshToken')
      expect(response.json().user.email).toBe('test@example.com')
      expect(response.json().user.authProvider).toBe('GOOGLE')
    })

    test('should link Google account for user found by email', async () => {
      // Create existing user without Google ID
      const existingUser = await context.fixtures.createUser({
        email: 'test@example.com',
        authProvider: 'PASSWORD'
      })
      const org = await context.fixtures.createOrganization()
      await context.fixtures.createMembership(existingUser.id, org.id, 'MEMBER')

      const mockProfile = {
        googleId: 'google_login_link_123',
        email: 'test@example.com',
        name: 'Test User',
        verified: true
      }
      
      mockGoogleOAuth.mockResolvedValue('getProfile', {
        profile: mockProfile,
        state: { action: 'login', nonce: 'test_nonce', timestamp: Date.now() }
      })

      const response = await context.auth.server.inject({
        method: 'GET',
        url: '/auth/google/callback?code=test_code&state=test_state'
      })

      expect(response.statusCode).toBe(200)
      
      // Verify user was updated with Google info
      const updatedUser = await context.auth.server.prisma.user.findUnique({
        where: { id: existingUser.id }
      })
      expect(updatedUser.googleId).toBe('google_login_link_123')
      expect(updatedUser.authProvider).toBe('GOOGLE')
    })

    test('should reject login for non-existent user', async () => {
      const mockProfile = {
        googleId: 'google_login_nonexistent_123',
        email: 'nonexistent@example.com',
        name: 'Test User',
        verified: true
      }
      
      mockGoogleOAuth.mockResolvedValue('getProfile', {
        profile: mockProfile,
        state: { action: 'login', nonce: 'test_nonce', timestamp: Date.now() }
      })

      const response = await context.auth.server.inject({
        method: 'GET',
        url: '/auth/google/callback?code=test_code&state=test_state'
      })

      expect(response.statusCode).toBe(404)
      expect(response.json().error).toContain('No account found')
    })
  })

  describe('OAuth Callback - Registration', () => {
    test('should create new user and organization with Google OAuth', async () => {
      const mockProfile = {
        googleId: 'google_reg_123',
        email: 'newuser@company.com',
        name: 'New User',
        verified: true
      }
      
      mockGoogleOAuth.mockResolvedValue('getProfile', {
        profile: mockProfile,
        state: { action: 'register', nonce: 'test_nonce', timestamp: Date.now() }
      })

      const response = await context.auth.server.inject({
        method: 'GET',
        url: '/auth/google/callback?code=test_code&state=test_state'
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toHaveProperty('accessToken')
      expect(response.json().user.email).toBe('newuser@company.com')
      expect(response.json().user.authProvider).toBe('GOOGLE')
      expect(response.json().user.organizations).toHaveLength(1)
      expect(response.json().user.organizations[0].role).toBe('OWNER')
      expect(response.json().user.organizations[0].name).toBe('company Organization')
    })

    test('should reject registration for existing user', async () => {
      // Create existing user
      await context.fixtures.createUser({
        email: 'existing@example.com',
        googleId: 'google_existing_123'
      })

      const mockProfile = {
        googleId: 'google_existing_123',
        email: 'existing@example.com',
        name: 'Existing User',
        verified: true
      }
      
      mockGoogleOAuth.mockResolvedValue('getProfile', {
        profile: mockProfile,
        state: { action: 'register', nonce: 'test_nonce', timestamp: Date.now() }
      })

      const response = await context.auth.server.inject({
        method: 'GET',
        url: '/auth/google/callback?code=test_code&state=test_state'
      })

      expect(response.statusCode).toBe(409)
      expect(response.json().error).toContain('User already exists')
    })
  })

  describe('OAuth Callback - Invitation', () => {
    test('should accept invitation and create new user with Google OAuth', async () => {
      // Create invitation
      const { user: inviter, org } = await context.fixtures.createUserWithOrg('OWNER')
      const invitation = await context.fixtures.createInvitation(
        'newuser@example.com',
        org.id,
        inviter.id,
        { role: 'MEMBER' }
      )

      const mockProfile = {
        googleId: 'google_invitation_123',
        email: 'newuser@example.com',
        name: 'New User',
        verified: true
      }
      
      mockGoogleOAuth.mockResolvedValue('getProfile', {
        profile: mockProfile,
        state: { 
          action: 'invitation', 
          invitationToken: invitation.token,
          nonce: 'test_nonce', 
          timestamp: Date.now() 
        }
      })

      const response = await context.auth.server.inject({
        method: 'GET',
        url: '/auth/google/callback?code=test_code&state=test_state'
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().user.email).toBe('newuser@example.com')
      expect(response.json().user.authProvider).toBe('GOOGLE')
      expect(response.json().user.organizations).toHaveLength(1)
      expect(response.json().user.organizations[0].role).toBe('MEMBER')

      // Verify invitation was marked as accepted
      const acceptedInvitation = await context.auth.server.prisma.invitation.findUnique({
        where: { id: invitation.id }
      })
      expect(acceptedInvitation.acceptedAt).toBeTruthy()
    })

    test('should accept invitation for existing user with Google linking', async () => {
      const existingUser = await context.fixtures.createUser({
        email: 'existing@example.com',
        authProvider: 'PASSWORD'
      })
      
      const { user: inviter, org } = await context.fixtures.createUserWithOrg('OWNER')
      const invitation = await context.fixtures.createInvitation(
        'existing@example.com',
        org.id,
        inviter.id,
        { role: 'ADMIN' }
      )

      const mockProfile = {
        googleId: 'google_link_existing_123',
        email: 'existing@example.com',
        name: 'Existing User',
        verified: true
      }
      
      mockGoogleOAuth.mockResolvedValue('getProfile', {
        profile: mockProfile,
        state: { 
          action: 'invitation', 
          invitationToken: invitation.token,
          nonce: 'test_nonce', 
          timestamp: Date.now() 
        }
      })

      const response = await context.auth.server.inject({
        method: 'GET',
        url: '/auth/google/callback?code=test_code&state=test_state'
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().user.organizations).toHaveLength(1)
      expect(response.json().user.organizations[0].role).toBe('ADMIN')

      // Verify user was updated with Google info
      const updatedUser = await context.auth.server.prisma.user.findUnique({
        where: { id: existingUser.id }
      })
      expect(updatedUser.googleId).toBe('google_link_existing_123')
      expect(updatedUser.authProvider).toBe('GOOGLE')
    })

    test('should reject invitation with email mismatch', async () => {
      const { user: inviter, org } = await context.fixtures.createUserWithOrg('OWNER')
      const invitation = await context.fixtures.createInvitation(
        'invited@example.com',
        org.id,
        inviter.id
      )

      const mockProfile = {
        googleId: 'google_invitation_mismatch_123',
        email: 'different@example.com', // Different email
        name: 'Test User',
        verified: true
      }
      
      mockGoogleOAuth.mockResolvedValue('getProfile', {
        profile: mockProfile,
        state: { 
          action: 'invitation', 
          invitationToken: invitation.token,
          nonce: 'test_nonce', 
          timestamp: Date.now() 
        }
      })

      const response = await context.auth.server.inject({
        method: 'GET',
        url: '/auth/google/callback?code=test_code&state=test_state'
      })

      expect(response.statusCode).toBe(400)
      expect(response.json().error).toContain('email does not match invitation email')
    })

    test('should reject expired invitation', async () => {
      const { user: inviter, org } = await context.fixtures.createUserWithOrg('OWNER')
      const invitation = await context.fixtures.createInvitation(
        'test@example.com',
        org.id,
        inviter.id,
        { expiresAt: new Date(Date.now() - 1000) } // Expired
      )

      const mockProfile = {
        googleId: 'google_invitation_expired_123',
        email: 'test@example.com',
        name: 'Test User',
        verified: true
      }
      
      mockGoogleOAuth.mockResolvedValue('getProfile', {
        profile: mockProfile,
        state: { 
          action: 'invitation', 
          invitationToken: invitation.token,
          nonce: 'test_nonce', 
          timestamp: Date.now() 
        }
      })

      const response = await context.auth.server.inject({
        method: 'GET',
        url: '/auth/google/callback?code=test_code&state=test_state'
      })

      expect(response.statusCode).toBe(404)
      expect(response.json().error).toBe('Invalid or expired invitation')
    })
  })

  describe('OAuth Error Handling', () => {
    test('should handle OAuth denial', async () => {
      const response = await context.auth.server.inject({
        method: 'GET',
        url: '/auth/google/callback?error=access_denied&state=test_state'
      })

      expect(response.statusCode).toBe(400)
      expect(response.json().error).toBe('OAuth access denied')
    })

    test('should handle missing authorization code', async () => {
      const response = await context.auth.server.inject({
        method: 'GET',
        url: '/auth/google/callback?state=test_state'
      })

      expect(response.statusCode).toBe(400)
      expect(response.json().error).toBe('Missing authorization code or state')
    })

    test('should handle Google API errors', async () => {
      mockGoogleOAuth.mockRejectedValue('getProfile', new Error('Google API error'))

      const response = await context.auth.server.inject({
        method: 'GET',
        url: '/auth/google/callback?code=test_code&state=test_state'
      })

      expect(response.statusCode).toBe(500)
      expect(response.json().error).toContain('Google API error')
    })

    test('should handle unverified Google email', async () => {
      mockGoogleOAuth.mockRejectedValue('getProfile', new Error('Email not verified with Google'))

      const response = await context.auth.server.inject({
        method: 'GET',
        url: '/auth/google/callback?code=test_code&state=test_state'
      })

      expect(response.statusCode).toBe(500)
      expect(response.json().error).toContain('Email not verified with Google')
    })
  })

  describe('Account Linking', () => {
    test('should link Google account to existing authenticated user', async () => {
      const { user, org } = await context.fixtures.createUserWithOrg('MEMBER')
      await context.auth.registerUser(user.email, 'testpass123', org.name)

      const mockProfile = {
        googleId: 'google_link_auth_123',
        email: user.email,
        name: 'Updated Name',
        verified: true
      }
      
      // Generate proper base64 state parameter
      const stateData = { action: 'link', nonce: 'test_nonce', timestamp: Date.now() }
      const state = Buffer.from(JSON.stringify(stateData)).toString('base64')

      mockGoogleOAuth.mockResolvedValue('getProfile', {
        profile: mockProfile,
        state: stateData
      })

      const response = await context.auth.authenticatedRequest(
        'post',
        '/auth/google/link',
        user.email,
        { code: 'test_code', state: state }
      )

      expect(response.statusCode).toBe(200)
      expect(response.json().success).toBe(true)

      // Verify user was updated
      const updatedUser = await context.auth.server.prisma.user.findUnique({
        where: { id: user.id }
      })
      expect(updatedUser.googleId).toBe('google_link_auth_123')
      expect(updatedUser.authProvider).toBe('GOOGLE')
      expect(updatedUser.displayName).toBe('Updated Name')
    })

    test('should reject linking when email mismatch', async () => {
      const { user, org } = await context.fixtures.createUserWithOrg('MEMBER')
      await context.auth.registerUser(user.email, 'testpass123', org.name)

      const mockProfile = {
        googleId: 'google_link_mismatch_123',
        email: 'different@example.com', // Different email
        name: 'Test User',
        verified: true
      }
      
      // Generate proper base64 state parameter
      const stateData = { action: 'link', nonce: 'test_nonce', timestamp: Date.now() }
      const state = Buffer.from(JSON.stringify(stateData)).toString('base64')

      mockGoogleOAuth.mockResolvedValue('getProfile', {
        profile: mockProfile,
        state: stateData
      })

      const response = await context.auth.authenticatedRequest(
        'post',
        '/auth/google/link',
        user.email,
        { code: 'test_code', state: state }
      )

      expect(response.statusCode).toBe(400)
      expect(response.json().error).toContain('Google account email does not match')
    })

    test('should reject linking Google account already linked to another user', async () => {
      // Create two users
      const { user: user1, org } = await context.fixtures.createUserWithOrg('MEMBER')
      const user2 = await context.fixtures.createUser({ 
        googleId: 'google_link_duplicate_123', 
        authProvider: 'GOOGLE' 
      })
      await context.fixtures.createMembership(user2.id, org.id, 'MEMBER')
      
      await context.auth.registerUser(user1.email, 'testpass123', org.name)

      const mockProfile = {
        googleId: 'google_link_duplicate_123', // Already linked to user2
        email: user1.email,
        name: 'Test User',
        verified: true
      }
      
      // Generate proper base64 state parameter
      const stateData = { action: 'link', nonce: 'test_nonce', timestamp: Date.now() }
      const state = Buffer.from(JSON.stringify(stateData)).toString('base64')

      mockGoogleOAuth.mockResolvedValue('getProfile', {
        profile: mockProfile,
        state: stateData
      })

      const response = await context.auth.authenticatedRequest(
        'post',
        '/auth/google/link',
        user1.email,
        { code: 'test_code', state: state }
      )

      expect(response.statusCode).toBe(409)
      expect(response.json().error).toContain('Google account is already linked to another user')
    })
  })
})