import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import request from 'supertest'
import { setupTestServer, teardownTestServer, cleanDatabase } from '../setup/testServer.js'

describe('User Registration', () => {
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

  describe('POST /auth/register', () => {
    it('should register a new user with email and password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'securePassword123',
        displayName: 'Test User'
      }

      const response = await request(app.server)
        .post('/auth/register')
        .send(userData)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        user: {
          email: userData.email,
          displayName: userData.displayName,
          authProvider: 'PASSWORD'
        }
      })

      // Verify user was created in database
      const user = await prisma.user.findUnique({
        where: { email: userData.email }
      })

      expect(user).toBeTruthy()
      expect(user.authProvider).toBe('PASSWORD')
      expect(user.passwordHash).toBeTruthy()
      expect(user.googleId).toBeNull()
    })

    it('should return error if email already exists', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'securePassword123',
        displayName: 'Test User'
      }

      // Create user first
      await request(app.server)
        .post('/auth/register')
        .send(userData)
        .expect(200)

      // Try to register same email again
      const response = await request(app.server)
        .post('/auth/register')
        .send(userData)
        .expect(409)

      expect(response.body).toMatchObject({
        error: 'User already exists'
      })
    })

    it('should return error if email is missing', async () => {
      const userData = {
        password: 'securePassword123',
        displayName: 'Test User'
      }

      const response = await request(app.server)
        .post('/auth/register')
        .send(userData)
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'Email and password are required'
      })
    })

    it('should return error if password is missing', async () => {
      const userData = {
        email: 'test@example.com',
        displayName: 'Test User'
      }

      const response = await request(app.server)
        .post('/auth/register')
        .send(userData)
        .expect(400)

      expect(response.body).toMatchObject({
        error: 'Email and password are required'
      })
    })

    it('should work without displayName', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'securePassword123'
      }

      const response = await request(app.server)
        .post('/auth/register')
        .send(userData)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        user: {
          email: userData.email,
          authProvider: 'PASSWORD'
        }
      })
    })

    it('should create a session after registration', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'securePassword123',
        displayName: 'Test User'
      }

      const response = await request(app.server)
        .post('/auth/register')
        .send(userData)
        .expect(200)

      // Check that a session cookie was set
      const cookies = response.headers['set-cookie']
      expect(cookies).toBeDefined()
      expect(cookies.some(cookie => cookie.includes('connect.sid'))).toBe(true)
    })
  })
})