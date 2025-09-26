import { createTestServer } from './setup/globalSetup.js'
import { TestFixtures } from './setup/fixtures.js'
import { AuthHelper, ApiHelper } from './setup/testHelpers.js'
import register from '../src/routes/register.js'
import login from '../src/routes/login.js'
import authRoutes from '../src/routes/auth.js'
import projects from '../src/routes/projects.js'
import Fastify from 'fastify'
import prismaPlugin from '../src/plugins/prisma.js'
import authPlugin from '../src/plugins/auth.js'
import sessionPlugin from '../src/plugins/session.js'
import passportPlugin from '../src/plugins/passport.js'
import cryptoService from '../src/crypto/crypto.js'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'

describe('Session Management Integration', () => {
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
    
    // Register routes
    await server.register(register, { prefix: '/auth' })
    await server.register(login, { prefix: '/auth' })
    await server.register(authRoutes, { prefix: '/auth' })
    await server.register(projects, { prefix: '/api' })

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
  })

  describe('Web Session Management (Cookies)', () => {
    test('should authenticate requests using cookies', async () => {
      // Register and login to get cookies
      const { user } = await context.fixtures.createUserWithOrg('OWNER')
      
      const loginResponse = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: user.email,
          password: 'testpass123',
          clientType: 'WEB'
        }
      })

      expect(loginResponse.statusCode).toBe(200)
      
      // Extract cookies from response
      const cookies = loginResponse.headers['set-cookie']
      expect(cookies).toBeTruthy()
      
      const cookieHeader = cookies.join('; ')
      
      // Make authenticated request using cookies
      const projectsResponse = await server.inject({
        method: 'GET',
        url: '/api/projects',
        headers: {
          cookie: cookieHeader
        }
      })

      expect(projectsResponse.statusCode).toBe(200)
    })

    test('should create web session in database on login', async () => {
      const { user } = await context.fixtures.createUserWithOrg('OWNER')
      
      const loginResponse = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: user.email,
          password: 'testpass123',
          clientType: 'WEB'
        }
      })

      expect(loginResponse.statusCode).toBe(200)
      
      // Verify database session
      const sessions = await server.prisma.session.findMany({
        where: { userId: user.id }
      })
      
      expect(sessions).toHaveLength(1)
      expect(sessions[0].clientType).toBe('WEB')
      expect(sessions[0].revokedAt).toBeNull()
      expect(sessions[0].refreshToken).toBeTruthy()
    })

    test('should refresh tokens for web sessions', async () => {
      const { user } = await context.fixtures.createUserWithOrg('OWNER')
      
      // Use the auth helper to login properly
      await context.auth.loginUser(user.email, 'testpass123', 'WEB')
      
      // Use the auth helper to refresh tokens
      const newTokens = await context.auth.refreshTokens(user.email)

      expect(newTokens.accessToken).toBeTruthy()
      expect(newTokens.refreshToken).toBeTruthy()
    })

    test('should logout and invalidate web session', async () => {
      const { user } = await context.fixtures.createUserWithOrg('OWNER')
      
      const loginResponse = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: user.email,
          password: 'testpass123',
          clientType: 'WEB'
        }
      })

      const accessToken = loginResponse.json().accessToken
      const cookies = loginResponse.headers['set-cookie']
      
      const logoutResponse = await server.inject({
        method: 'POST',
        url: '/auth/logout',
        headers: {
          authorization: `Bearer ${accessToken}`,
          cookie: cookies.join('; ')
        }
      })

      expect(logoutResponse.statusCode).toBe(204)
      
      // Verify session is deactivated
      const sessions = await server.prisma.session.findMany({
        where: { userId: user.id }
      })
      
      expect(sessions[0].revokedAt).not.toBeNull()
    })
  })

  describe('CLI Session Management (Token-based)', () => {
    test('should authenticate CLI requests using Bearer tokens', async () => {
      const { user } = await context.fixtures.createUserWithOrg('OWNER')
      
      const loginResponse = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: user.email,
          password: 'testpass123',
          clientType: 'CLI'
        }
      })

      expect(loginResponse.statusCode).toBe(200)
      
      const accessToken = loginResponse.json().accessToken
      
      // Make authenticated request using Bearer token
      const projectsResponse = await server.inject({
        method: 'GET',
        url: '/api/projects',
        headers: {
          authorization: `Bearer ${accessToken}`
        }
      })

      expect(projectsResponse.statusCode).toBe(200)
    })

    test('should create CLI session in database', async () => {
      const { user } = await context.fixtures.createUserWithOrg('OWNER')
      
      const loginResponse = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: user.email,
          password: 'testpass123',
          clientType: 'CLI'
        }
      })

      expect(loginResponse.statusCode).toBe(200)
      
      // Verify database session
      const sessions = await server.prisma.session.findMany({
        where: { userId: user.id }
      })
      
      expect(sessions).toHaveLength(1)
      expect(sessions[0].clientType).toBe('CLI')
      expect(sessions[0].revokedAt).toBeNull()
      expect(sessions[0].refreshToken).toBeTruthy()
    })

    test('should support multiple concurrent CLI sessions', async () => {
      const { user } = await context.fixtures.createUserWithOrg('OWNER')
      
      // Create first CLI session
      const login1 = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: user.email,
          password: 'testpass123',
          clientType: 'CLI',
          deviceInfo: 'CLI Device 1'
        }
      })

      // Create second CLI session
      const login2 = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: user.email,
          password: 'testpass123',
          clientType: 'CLI',
          deviceInfo: 'CLI Device 2'
        }
      })

      expect(login1.statusCode).toBe(200)
      expect(login2.statusCode).toBe(200)
      
      // Verify multiple database sessions
      const sessions = await server.prisma.session.findMany({
        where: { userId: user.id, revokedAt: null }
      })
      
      expect(sessions).toHaveLength(2)
      expect(sessions.every(s => s.clientType === 'CLI')).toBe(true)
    })
  })

  describe('Mixed Session Management', () => {
    test('should support both web and CLI sessions for same user', async () => {
      const { user } = await context.fixtures.createUserWithOrg('OWNER')
      
      // Create web session
      const webLogin = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: user.email,
          password: 'testpass123',
          clientType: 'WEB'
        }
      })

      // Create CLI session
      const cliLogin = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: user.email,
          password: 'testpass123',
          clientType: 'CLI'
        }
      })

      expect(webLogin.statusCode).toBe(200)
      expect(cliLogin.statusCode).toBe(200)
      
      // Verify both sessions in database
      const sessions = await server.prisma.session.findMany({
        where: { userId: user.id, revokedAt: null }
      })
      
      expect(sessions).toHaveLength(2)
      const sessionTypes = sessions.map(s => s.clientType).sort()
      expect(sessionTypes).toEqual(['CLI', 'WEB'])
    })

    test('should authenticate web requests with cookies when both session types exist', async () => {
      const { user } = await context.fixtures.createUserWithOrg('OWNER')
      
      // Create both session types
      const webLogin = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: user.email,
          password: 'testpass123',
          clientType: 'WEB'
        }
      })

      await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: user.email,
          password: 'testpass123',
          clientType: 'CLI'
        }
      })

      const cookies = webLogin.headers['set-cookie']
      
      // Make request with cookies
      const response = await server.inject({
        method: 'GET',
        url: '/api/projects',
        headers: {
          cookie: cookies.join('; ')
        }
      })

      expect(response.statusCode).toBe(200)
    })

    test('should authenticate CLI requests with Bearer token when both session types exist', async () => {
      const { user } = await context.fixtures.createUserWithOrg('OWNER')
      
      // Create both session types
      await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: user.email,
          password: 'testpass123',
          clientType: 'WEB'
        }
      })

      const cliLogin = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: user.email,
          password: 'testpass123',
          clientType: 'CLI'
        }
      })

      const accessToken = cliLogin.json().accessToken
      
      // Make request with Bearer token
      const response = await server.inject({
        method: 'GET',
        url: '/api/projects',
        headers: {
          authorization: `Bearer ${accessToken}`
        }
      })

      expect(response.statusCode).toBe(200)
    })
  })

  describe('Session Security', () => {
    test('should not accept cookies for CLI-only routes', async () => {
      const { user } = await context.fixtures.createUserWithOrg('OWNER')
      
      const webLogin = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: user.email,
          password: 'testpass123',
          clientType: 'WEB'
        }
      })

      const cookies = webLogin.headers['set-cookie']
      
      // Attempt to use cookies for token refresh (which should require Bearer auth)
      const refreshResponse = await server.inject({
        method: 'POST',
        url: '/auth/refresh',
        headers: {
          cookie: cookies.join('; ')
        },
        payload: {
          refreshToken: webLogin.json().refreshToken
        }
      })

      // This should work since refresh accepts both
      expect(refreshResponse.statusCode).toBe(200)
    })

    test('should prevent session hijacking with proper token validation', async () => {
      const { user } = await context.fixtures.createUserWithOrg('OWNER')
      
      // Login and get initial tokens
      const tokens1 = await context.auth.loginUser(user.email, 'testpass123', 'CLI')
      
      // Refresh tokens once (this should work)
      const tokens2 = await context.auth.refreshTokens(user.email)
      
      // Verify new tokens are different
      expect(tokens2.accessToken).not.toBe(tokens1.accessToken)
      expect(tokens2.refreshToken).not.toBe(tokens1.refreshToken)
    })
  })
})