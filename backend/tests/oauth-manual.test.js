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
import sessionPlugin from '../src/plugins/session.js'
import passportPlugin from '../src/plugins/passport.js'
import cryptoService from '../src/crypto/crypto.js'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'

// Mock Google OAuth responses
const mockFetch = {
  tokenResponse: null,
  profileResponse: null,
  
  reset() {
    this.tokenResponse = null
    this.profileResponse = null
  },
  
  setTokenResponse(data) {
    this.tokenResponse = {
      ok: true,
      json: async () => data,
      text: async () => JSON.stringify(data)
    }
  },
  
  setTokenError(error) {
    this.tokenResponse = {
      ok: false,
      text: async () => error
    }
  },
  
  setProfileResponse(data) {
    this.profileResponse = {
      ok: true,
      json: async () => data
    }
  },
  
  setProfileError(error) {
    this.profileResponse = {
      ok: false,
      text: async () => error
    }
  }
}

// Mock fetch globally
global.fetch = async (url, options) => {
  if (url === 'https://oauth2.googleapis.com/token') {
    return mockFetch.tokenResponse || {
      ok: false,
      text: async () => 'Mock not configured'
    }
  }
  
  if (url === 'https://www.googleapis.com/oauth2/v1/userinfo') {
    return mockFetch.profileResponse || {
      ok: false,
      text: async () => 'Mock not configured'
    }
  }
  
  throw new Error(`Unmocked fetch call to ${url}`)
}

describe('Manual OAuth Implementation', () => {
  let context
  let server

  beforeAll(async () => {
    // Create a complete test server with all plugins
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

    // Register CORS
    await server.register(cors, {
      origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174'],
      credentials: true
    })

    // Register cookie support
    await server.register(cookie, {
      secret: process.env.MASTER_KEY_HEX || 'fallback-secret-for-cookies',
      parseOptions: {}
    })

    // Register plugins in correct order
    await server.register(prismaPlugin)
    await server.register(sessionPlugin)
    await server.register(passportPlugin)
    await server.register(authPlugin)
    
    // Register all auth routes
    await server.register(register, { prefix: '/auth' })
    await server.register(login, { prefix: '/auth' })
    await server.register(authRoutes, { prefix: '/auth' })
    await server.register(invitations, { prefix: '/auth' })
    await server.register(googleAuth, { prefix: '/auth' })

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
    
    context = { auth, fixtures, api, server }
  })

  afterAll(async () => {
    if (server) {
      await server.close()
    }
  })

  beforeEach(async () => {
    await context.fixtures.cleanup()
    mockFetch.reset()
  })

  describe('OAuth Initiation', () => {
    test('should redirect to Google OAuth', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/auth/google'
      })

      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toContain('https://accounts.google.com/o/oauth2/auth')
      expect(response.headers.location).toContain('client_id=')
      expect(response.headers.location).toContain('redirect_uri=')
      expect(response.headers.location).toContain('scope=')
      expect(response.headers.location).toContain('response_type=code')
      expect(response.headers.location).toContain('state=')
    })

    test('should use configured redirect URI', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/auth/google'
      })

      expect(response.statusCode).toBe(302)
      const location = response.headers.location
      const redirectUri = new URL(location).searchParams.get('redirect_uri')
      expect(redirectUri).toBe('http://localhost:3000/auth/google/callback')
    })
  })

  describe('OAuth Callback - Success Flow', () => {
    test('should create new user with Google OAuth', async () => {
      // Mock successful token exchange
      mockFetch.setTokenResponse({
        access_token: 'mock_access_token',
        refresh_token: 'mock_refresh_token',
        id_token: 'mock_id_token'
      })

      // Mock successful profile fetch
      mockFetch.setProfileResponse({
        id: 'google_user_123',
        email: 'newuser@company.com',
        name: 'New Test User'
      })

      const response = await server.inject({
        method: 'GET',
        url: '/auth/google/callback?code=test_auth_code&state=test_state'
      })

      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toContain('http://localhost:5174/oauth/callback')
      
      // Parse user data from redirect URL
      const redirectUrl = new URL(response.headers.location)
      const userData = JSON.parse(decodeURIComponent(redirectUrl.searchParams.get('user')))
      
      expect(userData.email).toBe('newuser@company.com')
      expect(userData.displayName).toBe('New Test User')
      expect(userData.authProvider).toBe('GOOGLE')
      expect(userData.organizations).toHaveLength(1)
      expect(userData.organizations[0].role).toBe('OWNER')
      expect(userData.organizations[0].name).toBe('company Organization')

      // Verify user was created in database
      const user = await server.prisma.user.findUnique({
        where: { email: 'newuser@company.com' },
        include: {
          memberships: {
            include: { organization: true }
          }
        }
      })
      expect(user).toBeTruthy()
      expect(user.googleId).toBe('google_user_123')
      expect(user.authProvider).toBe('GOOGLE')
    })

    test('should login existing Google user', async () => {
      // Create existing user
      const existingUser = await context.fixtures.createUser({
        email: 'existing@example.com',
        googleId: 'google_existing_123',
        authProvider: 'GOOGLE',
        displayName: 'Existing User'
      })
      const org = await context.fixtures.createOrganization()
      await context.fixtures.createMembership(existingUser.id, org.id, 'MEMBER')

      // Mock OAuth responses
      mockFetch.setTokenResponse({
        access_token: 'mock_access_token'
      })

      mockFetch.setProfileResponse({
        id: 'google_existing_123',
        email: 'existing@example.com',
        name: 'Existing User'
      })

      const response = await server.inject({
        method: 'GET',
        url: '/auth/google/callback?code=test_auth_code&state=test_state'
      })

      expect(response.statusCode).toBe(302)
      
      const redirectUrl = new URL(response.headers.location)
      const userData = JSON.parse(decodeURIComponent(redirectUrl.searchParams.get('user')))
      
      expect(userData.email).toBe('existing@example.com')
      expect(userData.authProvider).toBe('GOOGLE')
      expect(userData.organizations).toHaveLength(1)
    })

    test('should set both cookies and database session', async () => {
      mockFetch.setTokenResponse({
        access_token: 'mock_access_token'
      })

      mockFetch.setProfileResponse({
        id: 'google_session_123',
        email: 'sessiontest@example.com',
        name: 'Session Test User'
      })

      const response = await server.inject({
        method: 'GET',
        url: '/auth/google/callback?code=test_auth_code&state=test_state'
      })

      expect(response.statusCode).toBe(302)
      
      // Check that cookies were set
      expect(response.headers['set-cookie']).toBeTruthy()
      const cookies = response.headers['set-cookie']
      const accessTokenCookie = cookies.find(c => c.startsWith('accessToken='))
      const refreshTokenCookie = cookies.find(c => c.startsWith('refreshToken='))
      
      expect(accessTokenCookie).toBeTruthy()
      expect(refreshTokenCookie).toBeTruthy()
      
      // Verify cookies have correct attributes
      expect(accessTokenCookie).toContain('HttpOnly')
      expect(accessTokenCookie).toContain('SameSite=Lax')
      expect(refreshTokenCookie).toContain('HttpOnly')
      expect(refreshTokenCookie).toContain('SameSite=Lax')

      // Verify database session was created
      const user = await server.prisma.user.findUnique({
        where: { email: 'sessiontest@example.com' }
      })
      const sessions = await server.prisma.session.findMany({
        where: { userId: user.id }
      })
      
      expect(sessions).toHaveLength(1)
      expect(sessions[0].clientType).toBe('WEB')
      expect(sessions[0].authProvider).toBe('GOOGLE')
      expect(sessions[0].revokedAt).toBeNull()
    })
  })

  describe('OAuth Callback - Error Handling', () => {
    test('should handle OAuth error response', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/auth/google/callback?error=access_denied&error_description=User%20denied%20access'
      })

      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toContain('http://localhost:5174/login?error=')
      expect(decodeURIComponent(response.headers.location)).toContain('access_denied')
    })

    test('should handle missing authorization code', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/auth/google/callback?state=test_state'
      })

      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toContain('http://localhost:5174/login?error=')
      expect(decodeURIComponent(response.headers.location)).toContain('Authorization code not received')
    })

    test('should handle token exchange failure', async () => {
      mockFetch.setTokenError('invalid_grant')

      const response = await server.inject({
        method: 'GET',
        url: '/auth/google/callback?code=invalid_code&state=test_state'
      })

      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toContain('http://localhost:5174/login?error=')
      expect(decodeURIComponent(response.headers.location)).toContain('Token exchange failed')
    })

    test('should handle profile fetch failure', async () => {
      mockFetch.setTokenResponse({
        access_token: 'mock_access_token'
      })
      
      mockFetch.setProfileError('Profile fetch failed')

      const response = await server.inject({
        method: 'GET',
        url: '/auth/google/callback?code=test_code&state=test_state'
      })

      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toContain('http://localhost:5174/login?error=')
      expect(decodeURIComponent(response.headers.location)).toContain('Profile fetch failed')
    })

    test('should handle existing user with different auth provider', async () => {
      // Create user with password auth
      await context.fixtures.createUser({
        email: 'conflict@example.com',
        authProvider: 'PASSWORD'
      })

      mockFetch.setTokenResponse({
        access_token: 'mock_access_token'
      })

      mockFetch.setProfileResponse({
        id: 'google_conflict_123',
        email: 'conflict@example.com',
        name: 'Conflict User'
      })

      const response = await server.inject({
        method: 'GET',
        url: '/auth/google/callback?code=test_code&state=test_state'
      })

      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toContain('http://localhost:5174/login?error=')
      expect(decodeURIComponent(response.headers.location)).toContain('An account with this email already exists')
    })
  })

  describe('Session Management Integration', () => {
    test('should create CLI-compatible database session alongside web cookies', async () => {
      mockFetch.setTokenResponse({
        access_token: 'mock_access_token'
      })

      mockFetch.setProfileResponse({
        id: 'google_cli_123',
        email: 'clitest@example.com',
        name: 'CLI Test User'
      })

      const response = await server.inject({
        method: 'GET',
        url: '/auth/google/callback?code=test_code&state=test_state'
      })

      expect(response.statusCode).toBe(302)

      // Verify both web and CLI sessions are supported
      const user = await server.prisma.user.findUnique({
        where: { email: 'clitest@example.com' }
      })
      
      const session = await server.prisma.session.findFirst({
        where: { userId: user.id }
      })
      
      expect(session).toBeTruthy()
      expect(session.clientType).toBe('WEB')
      expect(session.authProvider).toBe('GOOGLE')
      
      // The refresh token should be usable for CLI sessions
      expect(session.refreshToken).toBeTruthy()
      expect(session.refreshToken.length).toBeGreaterThan(0)
    })
  })
})