import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import request from 'supertest'
import Fastify from 'fastify'
import { PrismaClient } from '@prisma/client'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import bcrypt from 'bcrypt'

process.env.NODE_ENV = 'test'

describe('Complete Authentication System', () => {
  let app
  let prisma

  beforeAll(async () => {
    prisma = new PrismaClient()
    
    app = Fastify({ logger: false })
    
    // Register plugins
    await app.register(fastifyCookie)
    await app.register(fastifySession, {
      secret: 'test-secret-key-for-session-management-change-in-production',
      cookie: {
        secure: false,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true,
        sameSite: 'lax'
      },
      saveUninitialized: false,
      resave: false
    })

    app.decorate('prisma', prisma)

    // Authentication helper
    const requireAuth = async (request, reply) => {
      if (!request.session.user) {
        reply.code(401).send({ error: 'Not authenticated' })
        return
      }
      request.user = request.session.user
    }

    // Routes
    app.post('/auth/register', async (request, reply) => {
      const { email, password, displayName } = request.body

      if (!email || !password) {
        return reply.code(400).send({ error: 'Email and password are required' })
      }

      try {
        const existingUser = await prisma.user.findUnique({ where: { email } })
        if (existingUser) {
          return reply.code(409).send({ error: 'User already exists' })
        }

        const passwordHash = await bcrypt.hash(password, 12)
        const user = await prisma.user.create({
          data: { email, passwordHash, displayName, authProvider: 'PASSWORD' }
        })

        request.session.user = {
          id: user.id, email: user.email, displayName: user.displayName, authProvider: user.authProvider
        }

        return reply.send({
          success: true,
          user: { id: user.id, email: user.email, displayName: user.displayName, authProvider: user.authProvider }
        })
      } catch (error) {
        return reply.code(500).send({ error: 'Registration failed' })
      }
    })

    app.post('/auth/login', async (request, reply) => {
      const { email, password } = request.body

      if (!email || !password) {
        return reply.code(400).send({ error: 'Email and password are required' })
      }

      try {
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) {
          return reply.code(401).send({ error: 'Invalid credentials' })
        }

        if (user.authProvider === 'GOOGLE') {
          return reply.code(401).send({ error: 'Please use Google login for this account' })
        }

        if (!user.passwordHash) {
          return reply.code(401).send({ error: 'Password not set for this account' })
        }

        const isValidPassword = await bcrypt.compare(password, user.passwordHash)
        if (!isValidPassword) {
          return reply.code(401).send({ error: 'Invalid credentials' })
        }

        request.session.user = {
          id: user.id, email: user.email, displayName: user.displayName, authProvider: user.authProvider
        }

        return reply.send({
          success: true,
          user: { id: user.id, email: user.email, displayName: user.displayName, authProvider: user.authProvider }
        })
      } catch (error) {
        return reply.code(500).send({ error: 'Login failed' })
      }
    })

    app.post('/auth/logout', async (request, reply) => {
      if (!request.session.user) {
        return reply.code(401).send({ error: 'Not authenticated' })
      }

      request.session.destroy((err) => {
        if (err) {
          return reply.code(500).send({ error: 'Logout failed' })
        }
        reply.clearCookie('connect.sid')
        return reply.send({ success: true, message: 'Logged out successfully' })
      })
    })

    app.get('/auth/me', { preHandler: requireAuth }, async (request, reply) => {
      return reply.send({
        user: {
          id: request.user.id, email: request.user.email,
          displayName: request.user.displayName, authProvider: request.user.authProvider
        }
      })
    })

    app.get('/health', async (request, reply) => {
      return { status: 'ok', timestamp: new Date().toISOString() }
    })

    await app.ready()
  })

  afterAll(async () => {
    if (app) {
      await app.close()
    }
    if (prisma) {
      await prisma.$disconnect()
    }
  })

  beforeEach(async () => {
    await prisma.$transaction([
      prisma.session.deleteMany(),
      prisma.user.deleteMany()
    ])
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

  describe('User Registration', () => {
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

      const user = await prisma.user.findUnique({ where: { email: userData.email } })
      expect(user).toBeTruthy()
      expect(user.authProvider).toBe('PASSWORD')
      expect(user.passwordHash).toBeTruthy()
    })

    it('should return error if email already exists', async () => {
      const userData = { email: 'test@example.com', password: 'securePassword123' }

      await request(app.server).post('/auth/register').send(userData).expect(200)

      const response = await request(app.server)
        .post('/auth/register')
        .send(userData)
        .expect(409)

      expect(response.body).toMatchObject({ error: 'User already exists' })
    })

    it('should return error if email is missing', async () => {
      const response = await request(app.server)
        .post('/auth/register')
        .send({ password: 'securePassword123' })
        .expect(400)

      expect(response.body).toMatchObject({ error: 'Email and password are required' })
    })
  })

  describe('User Login', () => {
    it('should login with valid email and password', async () => {
      const passwordHash = await bcrypt.hash('securePassword123', 12)
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          passwordHash,
          displayName: 'Test User',
          authProvider: 'PASSWORD'
        }
      })

      const response = await request(app.server)
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'securePassword123' })
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

      const cookies = response.headers['set-cookie']
      expect(cookies).toBeDefined()
      // Session cookie might have different name in @fastify/session
      expect(cookies.some(cookie => cookie.includes('sessionId') || cookie.includes('session'))).toBe(true)
    })

    it('should return error for non-existent user', async () => {
      const response = await request(app.server)
        .post('/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'somepassword' })
        .expect(401)

      expect(response.body).toMatchObject({ error: 'Invalid credentials' })
    })

    it('should return error when trying to login with password for Google user', async () => {
      await prisma.user.create({
        data: {
          email: 'googleuser@example.com',
          googleId: 'google123',
          displayName: 'Google User',
          authProvider: 'GOOGLE'
        }
      })

      const response = await request(app.server)
        .post('/auth/login')
        .send({ email: 'googleuser@example.com', password: 'somepassword' })
        .expect(401)

      expect(response.body).toMatchObject({ error: 'Please use Google login for this account' })
    })
  })

  describe('Session Management', () => {
    it('should return user info when authenticated', async () => {
      const userData = { email: 'test@example.com', password: 'securePassword123', displayName: 'Test User' }

      const loginResponse = await request(app.server)
        .post('/auth/register')
        .send(userData)
        .expect(200)

      const cookies = loginResponse.headers['set-cookie']

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

      expect(response.body).toMatchObject({ error: 'Not authenticated' })
    })

    it('should logout authenticated user', async () => {
      const userData = { email: 'test@example.com', password: 'securePassword123' }

      const loginResponse = await request(app.server)
        .post('/auth/register')
        .send(userData)
        .expect(200)

      const cookies = loginResponse.headers['set-cookie']

      await request(app.server)
        .get('/auth/me')
        .set('Cookie', cookies)
        .expect(200)

      const logoutResponse = await request(app.server)
        .post('/auth/logout')
        .set('Cookie', cookies)
        .expect(200)

      expect(logoutResponse.body).toMatchObject({
        success: true,
        message: 'Logged out successfully'
      })

      await request(app.server)
        .get('/auth/me')
        .set('Cookie', cookies)
        .expect(401)
    })
  })

  describe('Auth Provider Separation', () => {
    it('should ensure proper separation between auth providers', async () => {
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

      expect(passwordUser.authProvider).toBe('PASSWORD')
      expect(passwordUser.googleId).toBeNull()
      expect(passwordUser.passwordHash).toBeTruthy()

      expect(googleUser.authProvider).toBe('GOOGLE')
      expect(googleUser.googleId).toBeTruthy()
      expect(googleUser.passwordHash).toBeNull()
    })
  })
})