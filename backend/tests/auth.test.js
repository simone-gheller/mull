import { getTestContext } from './setup/testHelpers.js'

describe('Authentication & Authorization', () => {
  let context

  beforeAll(async () => {
    context = await getTestContext()
  })

  beforeEach(async () => {
    // Clean up any previous test data
    await context.cleanup()
  })

  describe('User Registration', () => {
    test('should register a new user with organization', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'securepass123',
        orgName: 'New Test Org'
      }

      const tokens = await context.auth.registerUser(
        userData.email, 
        userData.password, 
        userData.orgName
      )

      expect(tokens).toHaveProperty('accessToken')
      expect(tokens).toHaveProperty('refreshToken')
      expect(tokens).toHaveProperty('user')
      expect(tokens.user.email).toBe(userData.email)
      expect(tokens.user.organizations).toHaveLength(1)
      expect(tokens.user.organizations[0].name).toBe(userData.orgName)
      expect(tokens.user.organizations[0].role).toBe('OWNER')
    })

    test('should fail to register user with existing email', async () => {
      const email = 'duplicate@example.com'
      
      // Register first user
      await context.auth.registerUser(email, 'pass1', 'org-1')

      // Try to register second user with same email
      const response = await context.auth.server.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email,
          password: 'pass2',
          orgName: 'Org 2'
        }
      })

      expect(response.statusCode).toBe(409)
      expect(response.json().error).toContain('già registrata')
    })
  })

  describe('User Login', () => {
    beforeEach(async () => {
      // Create a user for login tests
      await context.auth.registerUser('logintest@example.com', 'testpass123', 'test-org')
    })

    test('should login with valid credentials', async () => {
      const tokens = await context.auth.loginUser('logintest@example.com', 'testpass123')

      expect(tokens).toHaveProperty('accessToken')
      expect(tokens).toHaveProperty('refreshToken')
      expect(tokens.user.email).toBe('logintest@example.com')
    })

    test('should fail login with invalid credentials', async () => {
      const response = await context.auth.server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'logintest@example.com',
          password: 'wrongpassword'
        }
      })

      expect(response.statusCode).toBe(401)
      expect(response.json().error).toBe('Invalid credentials')
    })

    test('should support different client types', async () => {
      const webTokens = await context.auth.loginUser('logintest@example.com', 'testpass123', 'WEB')
      const cliTokens = await context.auth.loginUser('logintest@example.com', 'testpass123', 'CLI')

      expect(webTokens.accessToken).toBeDefined()
      expect(cliTokens.accessToken).toBeDefined()
      expect(webTokens.accessToken).not.toBe(cliTokens.accessToken)
    })
  })

  describe('Token Management', () => {
    beforeEach(async () => {
      await context.auth.registerUser('tokentest@example.com', 'testpass123', 'Token Test Org')
    })

    test('should refresh tokens', async () => {
      const originalTokens = await context.auth.loginUser('tokentest@example.com', 'testpass123')
      const newTokens = await context.auth.refreshTokens('tokentest@example.com')

      expect(newTokens.accessToken).not.toBe(originalTokens.accessToken)
      expect(newTokens.refreshToken).not.toBe(originalTokens.refreshToken)
    })

    test('should fail to refresh with invalid token', async () => {
      const response = await context.auth.server.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: {
          refreshToken: 'invalid-refresh-token'
        }
      })

      expect(response.statusCode).toBe(401)
      expect(response.json().error).toBe('Invalid or expired refresh token')
    })

    test('should return existing session when already authenticated user visits login', async () => {
      const email = 'relogintest@example.com'
      const password = 'testpass123'
      
      // Register user
      await context.auth.registerUser(email, password, 'Relogin Test Org')
      
      // First login
      const firstLogin = await context.auth.loginUser(email, password)
      expect(firstLogin.accessToken).toBeDefined()
      expect(firstLogin.refreshToken).toBeDefined()
      
      // Check initial session count
      const initialSessionsResponse = await context.auth.authenticatedRequest('get', '/auth/sessions', email)
      const initialSessions = initialSessionsResponse.body.sessions
      expect(initialSessions.length).toBeGreaterThan(0)
      const initialSessionCount = initialSessions.length
      
      // Second login attempt with authentication header (should return same session)
      const secondLoginResponse = await context.auth.server.inject({
        method: 'POST',
        url: '/auth/login',
        headers: {
          Authorization: `Bearer ${firstLogin.accessToken}`,
          'Content-Type': 'application/json'
        },
        payload: {
          email,
          password,
          clientType: 'WEB'
        }
      })
      
      expect(secondLoginResponse.statusCode).toBe(200)
      const secondLogin = secondLoginResponse.json()
      
      // Should return the SAME access token (existing session)
      expect(secondLogin.accessToken).toBe(firstLogin.accessToken)
      expect(secondLogin.refreshToken).toBeNull() // Should not expose refresh token
      expect(secondLogin.user.email).toBe(email)
      
      // Check that NO new session was created
      const finalSessionsResponse = await context.auth.authenticatedRequest('get', '/auth/sessions', email)
      const finalSessions = finalSessionsResponse.body.sessions
      expect(finalSessions.length).toBe(initialSessionCount) // Same count, no new session
      
      // Verify the session is still active and working
      const testResponse = await context.auth.server.inject({
        method: 'GET',
        url: '/auth/sessions',
        headers: {
          Authorization: `Bearer ${firstLogin.accessToken}`
        }
      })
      expect(testResponse.statusCode).toBe(200)
    })

    test('should create new session when unauthenticated user logs in', async () => {
      const email = 'newlogintest@example.com'
      const password = 'testpass123'
      
      // Register user
      await context.auth.registerUser(email, password, 'New Login Test Org')
      
      // Login without authentication header (normal login)
      const loginResponse = await context.auth.server.inject({
        method: 'POST',
        url: '/auth/login',
        headers: {
          'Content-Type': 'application/json'
        },
        payload: {
          email,
          password,
          clientType: 'WEB'
        }
      })
      
      expect(loginResponse.statusCode).toBe(200)
      const loginData = loginResponse.json()
      
      expect(loginData.accessToken).toBeDefined()
      expect(loginData.refreshToken).toBeDefined()
      expect(loginData.user.email).toBe(email)
    })

    test('should create new session when invalid token is provided', async () => {
      const email = 'invalidtokentest@example.com'
      const password = 'testpass123'
      
      // Register user
      await context.auth.registerUser(email, password, 'Invalid Token Test Org')
      
      // Login with invalid token (should proceed with normal login)
      const loginResponse = await context.auth.server.inject({
        method: 'POST',
        url: '/auth/login',
        headers: {
          Authorization: 'Bearer invalid-jwt-token',
          'Content-Type': 'application/json'
        },
        payload: {
          email,
          password,
          clientType: 'WEB'
        }
      })
      
      expect(loginResponse.statusCode).toBe(200)
      const loginData = loginResponse.json()
      
      // Should create a new session since the token was invalid
      expect(loginData.accessToken).toBeDefined()
      expect(loginData.refreshToken).toBeDefined()
      expect(loginData.user.email).toBe(email)
    })

    test('should logout and invalidate session', async () => {
      await context.auth.loginUser('tokentest@example.com', 'testpass123')
      await context.auth.logoutUser('tokentest@example.com')

      // Try to use token after logout - should fail
      const tokens = context.auth.getTokens('tokentest@example.com')
      expect(tokens).toBeUndefined()
    })
  })

  describe('Protected Routes', () => {
    beforeEach(async () => {
      await context.auth.registerUser('protectedtest@example.com', 'testpass123', 'Protected Test Org')
    })

    test('should access protected routes with valid token', async () => {
      const response = await context.api.getProjects('protectedtest@example.com')
      expect(response.statusCode).toBe(200)
    })

    test('should deny access without token', async () => {
      const response = await context.auth.server.inject({
        method: 'GET',
        url: '/api/projects'
      })

      expect(response.statusCode).toBe(401)
    })

    test('should deny access with invalid token', async () => {
      const response = await context.auth.server.inject({
        method: 'GET',
        url: '/api/projects',
        headers: {
          authorization: 'Bearer invalid-token'
        }
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('Session Management', () => {
    beforeEach(async () => {
      await context.auth.registerUser('sessiontest@example.com', 'testpass123', 'Session Test Org')
    })

    test('should list user sessions', async () => {
      // Create multiple sessions
      await context.auth.loginUser('sessiontest@example.com', 'testpass123', 'WEB')
      await context.auth.loginUser('sessiontest@example.com', 'testpass123', 'CLI')

      const response = await context.auth.authenticatedRequest('get', '/auth/sessions', 'sessiontest@example.com')
      expect(response.statusCode).toBe(200)
      
      const sessions = response.body.sessions
      expect(Array.isArray(sessions)).toBe(true)
      expect(sessions.length).toBeGreaterThan(0)
    })

    test('should revoke all sessions', async () => {
      await context.auth.loginUser('sessiontest@example.com', 'testpass123')
      
      const response = await context.auth.authenticatedRequest('delete', '/auth/sessions', 'sessiontest@example.com')
      expect(response.statusCode).toBe(204)
    })
  })
})