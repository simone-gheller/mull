import { getTestContext } from './setup/testHelpers.js'

describe('Google OAuth Basic Routes', () => {
  let context

  beforeAll(async () => {
    context = await getTestContext()
  })

  beforeEach(async () => {
    await context.cleanup()
  })

  describe('OAuth Route Validation', () => {
    test('should accept valid action parameters', async () => {
      const response = await context.auth.server.inject({
        method: 'GET',
        url: '/auth/google?action=login'
      })

      // Should either redirect (302) or error due to missing credentials (500)
      expect([302, 500]).toContain(response.statusCode)
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

    test('should accept invitation action with token', async () => {
      const response = await context.auth.server.inject({
        method: 'GET',
        url: '/auth/google?action=invitation&invitation_token=test_token'
      })

      // Should either redirect (302) or error due to missing credentials (500)
      expect([302, 500]).toContain(response.statusCode)
    })
  })

  describe('OAuth Callback Error Handling', () => {
    test('should handle OAuth denial', async () => {
      const response = await context.auth.server.inject({
        method: 'GET',
        url: '/auth/google/callback?error=access_denied&state=test_state'
      })

      expect(response.statusCode).toBe(400)
      expect(response.json().error).toBe('OAuth access denied')
      expect(response.json().details).toBe('access_denied')
    })

    test('should handle missing authorization code', async () => {
      const response = await context.auth.server.inject({
        method: 'GET',
        url: '/auth/google/callback?state=test_state'
      })

      expect(response.statusCode).toBe(400)
      expect(response.json().error).toBe('Missing authorization code or state')
    })

    test('should handle missing state parameter', async () => {
      const response = await context.auth.server.inject({
        method: 'GET',
        url: '/auth/google/callback?code=test_code'
      })

      expect(response.statusCode).toBe(400)
      expect(response.json().error).toBe('Missing authorization code or state')
    })
  })

  describe('User Model Integration', () => {
    test('should create Google user with correct schema fields', async () => {
      const googleUser = await context.fixtures.createUser({
        email: 'google@example.com',
        authProvider: 'GOOGLE',
        googleId: 'google_123456',
        displayName: 'Google User',
        passwordHash: null
      })

      expect(googleUser.authProvider).toBe('GOOGLE')
      expect(googleUser.googleId).toBe('google_123456')
      expect(googleUser.displayName).toBe('Google User')
      expect(googleUser.passwordHash).toBeNull()
    })

    test('should create password user with correct schema fields', async () => {
      const passwordUser = await context.fixtures.createUser({
        email: 'password@example.com',
        authProvider: 'PASSWORD'
      })

      expect(passwordUser.authProvider).toBe('PASSWORD')
      expect(passwordUser.googleId).toBeNull()
      expect(passwordUser.passwordHash).toBeTruthy()
    })

    test('should handle unique constraint on googleId', async () => {
      const googleId = 'unique_google_123'
      
      // Create first user
      await context.fixtures.createUser({
        email: 'user1@example.com',
        authProvider: 'GOOGLE',
        googleId
      })

      // Try to create second user with same googleId
      await expect(context.fixtures.createUser({
        email: 'user2@example.com',
        authProvider: 'GOOGLE',
        googleId
      })).rejects.toThrow()
    })
  })

  describe('Google Account Linking Endpoint', () => {
    test('should require authentication for account linking', async () => {
      const response = await context.auth.server.inject({
        method: 'POST',
        url: '/auth/google/link',
        payload: { code: 'test_code', state: 'test_state' }
      })

      expect(response.statusCode).toBe(401)
    })

    test('should validate required parameters', async () => {
      const { user, org } = await context.fixtures.createUserWithOrg('MEMBER')
      await context.auth.registerUser(user.email, 'testpass123', org.name)

      const response = await context.auth.authenticatedRequest(
        'post',
        '/auth/google/link',
        user.email
      ).send({ code: 'test_code' }) // Missing state


      expect(response.statusCode).toBe(400)
      expect(response.body.error).toBe('Missing authorization code or state')
    })
  })

  describe('Database Session Integration', () => {
    test('should create session with authProvider field', async () => {
      const user = await context.fixtures.createUser({
        authProvider: 'GOOGLE',
        googleId: 'google_123'
      })

      const session = await context.fixtures.createSession(user.id, 'WEB', {
        authProvider: 'GOOGLE'
      })

      expect(session.authProvider).toBe('GOOGLE')
      expect(session.userId).toBe(user.id)
    })
  })
})