import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import request from 'supertest'
import { setupTestServer, teardownTestServer, cleanDatabase } from '../setup/testServer.js'

describe('Google OAuth', () => {
  let app, prisma

  beforeAll(async () => {
    const setup = await setupTestServer()
    app = setup.app
    prisma = setup.prisma
  })

  afterAll(async () => {
    await teardownTestServer()
  })

  beforeEach(async () => {
    await cleanDatabase()
  })

  describe('GET /auth/google', () => {
    it('should redirect to Google OAuth', async () => {
      const response = await request(app.server)
        .get('/auth/google')
        .expect(302)

      expect(response.headers.location).toMatch(/^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth/)
      expect(response.headers.location).toContain('scope=profile%20email')
      expect(response.headers.location).toContain('response_type=code')
    })
  })

  describe('User Registration and Login Workflow', () => {
    it('should prevent Google user from logging in with password', async () => {
      // Create a Google user directly in database
      await prisma.user.create({
        data: {
          email: 'googleuser@example.com',
          googleId: 'google123456',
          displayName: 'Google User',
          authProvider: 'GOOGLE'
        }
      })

      // Try to login with password
      const loginData = {
        email: 'googleuser@example.com',
        password: 'somepassword'
      }

      const response = await request(app.server)
        .post('/auth/login')
        .send(loginData)
        .expect(401)

      expect(response.body).toMatchObject({
        message: 'Unauthorized'
      })
    })

    it('should prevent password user from registering with same email as Google user', async () => {
      // Create a Google user first
      await prisma.user.create({
        data: {
          email: 'user@example.com',
          googleId: 'google123456',
          displayName: 'Google User',
          authProvider: 'GOOGLE'
        }
      })

      // Try to register with password using same email
      const registrationData = {
        email: 'user@example.com',
        password: 'securePassword123',
        displayName: 'Password User'
      }

      const response = await request(app.server)
        .post('/auth/register')
        .send(registrationData)
        .expect(409)

      expect(response.body).toMatchObject({
        error: 'User already exists'
      })
    })

    it('should ensure proper separation between auth providers', async () => {
      // Create both types of users with different emails
      const passwordUser = await prisma.user.create({
        data: {
          email: 'password@example.com',
          passwordHash: '$2b$12$test.hash',
          displayName: 'Password User',
          authProvider: 'PASSWORD'
        }
      })

      const googleUser = await prisma.user.create({
        data: {
          email: 'google@example.com',
          googleId: 'google123456',
          displayName: 'Google User',
          authProvider: 'GOOGLE'
        }
      })

      // Verify they have different auth providers
      expect(passwordUser.authProvider).toBe('PASSWORD')
      expect(passwordUser.googleId).toBeNull()
      expect(passwordUser.passwordHash).toBeTruthy()

      expect(googleUser.authProvider).toBe('GOOGLE')
      expect(googleUser.googleId).toBeTruthy()
      expect(googleUser.passwordHash).toBeNull()
    })
  })

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app.server)
        .get('/health')
        .expect(200)

      expect(response.body).toMatchObject({
        status: 'ok'
      })
      expect(response.body.timestamp).toBeTruthy()
    })
  })
})