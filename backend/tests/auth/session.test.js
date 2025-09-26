import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import request from 'supertest'
import bcrypt from 'bcrypt'
import { setupTestServer, teardownTestServer, cleanDatabase } from '../setup/testServer.js'

describe('Session Management', () => {
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

  describe('GET /auth/me', () => {
    it('should return user info when authenticated', async () => {
      // Register and login a user
      const userData = {
        email: 'test@example.com',
        password: 'securePassword123',
        displayName: 'Test User'
      }

      const loginResponse = await request(app.server)
        .post('/auth/register')
        .send(userData)
        .expect(200)

      const cookies = loginResponse.headers['set-cookie']

      // Test authenticated route
      const response = await request(app.server)
        .get('/auth/me')
        .set('Cookie', cookies)
        .expect(200)

      expect(response.body).toMatchObject({
        user: {
          email: userData.email,
          displayName: userData.displayName,
          authProvider: 'PASSWORD'
        }
      })
    })

    it('should return 401 when not authenticated', async () => {
      const response = await request(app.server)
        .get('/auth/me')
        .expect(401)

      expect(response.body).toMatchObject({
        error: 'Not authenticated'
      })
    })

    it('should maintain session across requests', async () => {
      // Register and login a user
      const userData = {
        email: 'test@example.com',
        password: 'securePassword123',
        displayName: 'Test User'
      }

      const loginResponse = await request(app.server)
        .post('/auth/register')
        .send(userData)
        .expect(200)

      const cookies = loginResponse.headers['set-cookie']

      // First request
      await request(app.server)
        .get('/auth/me')
        .set('Cookie', cookies)
        .expect(200)

      // Second request with same cookie should still work
      const response = await request(app.server)
        .get('/auth/me')
        .set('Cookie', cookies)
        .expect(200)

      expect(response.body).toMatchObject({
        user: {
          email: userData.email,
          displayName: userData.displayName,
          authProvider: 'PASSWORD'
        }
      })
    })
  })

  describe('POST /auth/logout', () => {
    it('should logout authenticated user', async () => {
      // Register and login a user
      const userData = {
        email: 'test@example.com',
        password: 'securePassword123',
        displayName: 'Test User'
      }

      const loginResponse = await request(app.server)
        .post('/auth/register')
        .send(userData)
        .expect(200)

      const cookies = loginResponse.headers['set-cookie']

      // Verify user is authenticated
      await request(app.server)
        .get('/auth/me')
        .set('Cookie', cookies)
        .expect(200)

      // Logout
      const logoutResponse = await request(app.server)
        .post('/auth/logout')
        .set('Cookie', cookies)
        .expect(200)

      expect(logoutResponse.body).toMatchObject({
        success: true,
        message: 'Logged out successfully'
      })

      // Verify user is no longer authenticated
      await request(app.server)
        .get('/auth/me')
        .set('Cookie', cookies)
        .expect(401)
    })

    it('should return 401 when not authenticated', async () => {
      const response = await request(app.server)
        .post('/auth/logout')
        .expect(401)

      expect(response.body).toMatchObject({
        error: 'Not authenticated'
      })
    })
  })

  describe('Session Persistence', () => {
    it('should store sessions in PostgreSQL', async () => {
      // Register a user
      const userData = {
        email: 'test@example.com',
        password: 'securePassword123',
        displayName: 'Test User'
      }

      await request(app.server)
        .post('/auth/register')
        .send(userData)
        .expect(200)

      // Check that session was stored in database
      const sessionCount = await prisma.session.count()
      expect(sessionCount).toBe(1)

      const session = await prisma.session.findFirst()
      expect(session).toBeTruthy()
      expect(session.sessionData).toBeTruthy()
      expect(session.expiresAt).toBeTruthy()
    })

    it('should clean up expired sessions on access', async () => {
      // Create an expired session manually
      const expiredSession = await prisma.session.create({
        data: {
          sid: 'expired-session-id',
          sessionData: { test: 'data' },
          expiresAt: new Date(Date.now() - 1000) // Expired 1 second ago
        }
      })

      // Try to access the expired session (this should clean it up)
      const store = app.sessionStore
      const result = await store.get('expired-session-id')
      
      expect(result).toBeNull()

      // Verify session was deleted from database
      const foundSession = await prisma.session.findUnique({
        where: { sid: 'expired-session-id' }
      })
      expect(foundSession).toBeNull()
    })
  })
})