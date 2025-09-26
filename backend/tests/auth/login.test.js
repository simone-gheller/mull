import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import request from 'supertest'
import bcrypt from 'bcrypt'
import { setupTestServer, teardownTestServer, cleanDatabase } from '../setup/testServer.js'

describe('User Login', () => {
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

  describe('POST /auth/login', () => {
    it('should login with valid email and password', async () => {
      // Create a password user
      const passwordHash = await bcrypt.hash('securePassword123', 12)
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash,
          displayName: 'Test User',
          authProvider: 'PASSWORD'
        }
      })

      const loginData = {
        email: 'test@example.com',
        password: 'securePassword123'
      }

      const response = await request(app.server)
        .post('/auth/login')
        .send(loginData)
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          authProvider: 'PASSWORD'
        }
      })

      // Check that a session cookie was set
      const cookies = response.headers['set-cookie']
      expect(cookies).toBeDefined()
      expect(cookies.some(cookie => cookie.includes('connect.sid'))).toBe(true)
    })

    it('should return error for non-existent user', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
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

    it('should return error for wrong password', async () => {
      // Create a password user
      const passwordHash = await bcrypt.hash('correctPassword', 12)
      await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash,
          displayName: 'Test User',
          authProvider: 'PASSWORD'
        }
      })

      const loginData = {
        email: 'test@example.com',
        password: 'wrongPassword'
      }

      const response = await request(app.server)
        .post('/auth/login')
        .send(loginData)
        .expect(401)

      expect(response.body).toMatchObject({
        message: 'Unauthorized'
      })
    })

    it('should return error when trying to login with password for Google user', async () => {
      // Create a Google user
      await prisma.user.create({
        data: {
          email: 'googleuser@example.com',
          googleId: 'google123',
          displayName: 'Google User',
          authProvider: 'GOOGLE'
        }
      })

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

    it('should return error if user has no password hash', async () => {
      // Create a user without password hash
      await prisma.user.create({
        data: {
          email: 'test@example.com',
          displayName: 'Test User',
          authProvider: 'PASSWORD'
        }
      })

      const loginData = {
        email: 'test@example.com',
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
  })
})