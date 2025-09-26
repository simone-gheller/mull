import bcrypt from 'bcrypt'
import { PrismaClient } from '@prisma/client'
import Fastify from 'fastify'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import fastifyCors from '@fastify/cors'
import fastifyOauth2 from '@fastify/oauth2'
import fastifyRateLimit from '@fastify/rate-limit'
import fastifyCsrf from '@fastify/csrf-protection'
import { RedisSessionStore } from './lib/RedisSessionStore.js'

const prisma = new PrismaClient()

const buildFastify = (options = {}) => {
  const fastify = Fastify({ 
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname'
        }
      }
    },
    ...options
  })

  // Helper function to regenerate session after authentication
  const regenerateSession = (request, userData) => {
    return new Promise((resolve, reject) => {
      request.session.regenerate((err) => {
        if (err) {
          fastify.log.error('Session regeneration failed:', err)
          return reject(err)
        }
        request.session.set('user', userData)
        fastify.log.info('Session regenerated for user:', userData.email)
        resolve()
      })
    })
  }

  const setup = async () => {
    // Register plugins
    await fastify.register(fastifyCookie)
    await fastify.register(fastifyCors, {
      origin: true,
      credentials: true
    })
    
    await fastify.register(fastifyRateLimit, {
      max: 5, // 5 requests per window
      timeWindow: '1 minute',
      skipSuccessfulRequests: false,
      keyGenerator: (request) => {
        return request.ip
      }
    })
    
    await fastify.register(fastifyOauth2, {
      name: 'googleOAuth2',
      scope: ['profile', 'email'],
      credentials: {
        client: {
          id: process.env.GOOGLE_CLIENT_ID || 'your-google-client-id',
          secret: process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret'
        },
        auth: fastifyOauth2.GOOGLE_CONFIGURATION
      },
      startRedirectPath: '/auth/google',
      callbackUri: 'http://localhost:3000/auth/google/callback'
    })

    const redisStore = new RedisSessionStore({
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      cacheMax: 1000, // Maximum sessions in LRU cache
      cacheTtl: 5 * 60 * 1000, // Cache TTL: 5 minutes
      fastifyInstance: fastify.log
    })
    
    await fastify.register(fastifySession, {
      secret: process.env.SESSION_SECRET || 'session-secret-key-change-me-please', //min 32 chars
      store: redisStore,
      cookie: {
        secure: false, // Set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true,
        sameSite: 'lax',
        domain: process.env.COOKIE_DOMAIN || 'localhost'
      },
      saveUninitialized: false,
      resave: false
    })
    await fastify.register(fastifyCsrf, {
      sessionPlugin: '@fastify/session',
      cookieOpts: {
        signed: false,
        httpOnly: true, // Allow frontend JS to read the token
        sameSite: 'lax',
        secure: false // Set to true in production with HTTPS
      },
      getToken: (request) => {
        return request.headers['x-csrf-token']
      }
    })
    
    fastify.decorate('prisma', prisma)

    // Routes
    fastify.post('/auth/register', { 
      preHandler: [fastify.rateLimit(), fastify.csrfProtection] 
    }, async (request, reply) => {
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
        const sessionUser = { 
          id: user.id, 
          email: user.email, 
          displayName: user.displayName, 
          authProvider: user.authProvider 
        }
        
        // Regenerate session to prevent session fixation
        await regenerateSession(request, sessionUser)
        fastify.log.info('User session created after registration')
        return reply.send({
          success: true,
          user: sessionUser
        })
      } catch (error) {
        fastify.log.error(error, 'Registration error:')
        return reply.code(500).send({ error: 'Registration failed' })
      }
    })
    
    fastify.post('/auth/login', { 
      preHandler: [fastify.rateLimit(), fastify.csrfProtection] 
    }, async (request, reply) => {
      const { email, password } = request.body

      if (!email || !password) {
        return reply.code(400).send({ error: 'Email and password are required' })
      }

      try {
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) {
          return reply.code(401).send({ error: 'Invalid credentials' })
        }

        const isValidPassword = await bcrypt.compare(password, user.passwordHash)
        if (!isValidPassword) {
          return reply.code(401).send({ error: 'Invalid credentials' })
        }
        sessionUser = { 
          id: user.id, 
          email: user.email, 
          displayName: user.displayName, 
          authProvider: user.authProvider 
        }
        // Regenerate session to prevent session fixation
        await regenerateSession(request, sessionUser)

        return reply.send({
          success: true,
          user: sessionUser
        })
      } catch (error) {
        fastify.log.error('Login error:', error)
        return reply.code(500).send({ error: 'Login failed' })
      }
    })

    fastify.get('/auth/google/callback', async function (request, reply) {
      try {
        const result = await this.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);

        const fetchResult = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: 'Bearer ' + result.token.access_token }
        });

        if (!fetchResult.ok) {
          return reply.code(500).send('Failed to fetch user info');
        }

        const data = await fetchResult.json();

        let user = await prisma.user.findUnique({ where: { email: data.email } });
        if (user) {
          if (user.authProvider === 'PASSWORD') {
            throw new Error('User already exists with this email');
          }
        } else {
          user = await prisma.user.create({
            data: {
              email: data.email,
              displayName: data.name,
              authProvider: 'GOOGLE'
            }
          });
          fastify.log.info('Created new user from Google OAuth2:', user.email);
        }
        // Regenerate session to prevent session fixation
        await regenerateSession(request, user)
        fastify.log.info('User session created after Google OAuth2 login')
        return reply.send({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            authProvider: user.authProvider
          }
        })
      } catch (err) {
        request.log.error(err);
        return reply.code(500).send(err);
      }
    });

    fastify.get('/auth/logout', (request, reply) => {
      const user = request.session.user
      if (!user) {
        return reply.code(401).send({ error: 'Not authenticated' })
      }

      request.session.destroy((err) => {
        if (err) {
          fastify.log.error('Session destroy error:', err)
          return reply.code(500).send({ error: 'Logout failed' })
        }
        reply.clearCookie('sessionId')
        return reply.send({ success: true, message: 'Logged out successfully' })
      })
    })

    fastify.get('/auth/me', { 
      preHandler: [fastify.csrfProtection] 
    }, async (request, reply) => {
      if (!request.session.user) {
        return reply.code(401).send({ error: 'Not authenticated' })
      }
      const user = request.session.user
      return reply.send({
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          authProvider: user.authProvider
        }
      })
    })

    // CSRF token endpoint for frontend
    fastify.get('/csrf-token', async (request, reply) => {
      const token = reply.generateCsrf()
      return { csrfToken: token }
    })

    fastify.get('/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() }
    })

    return fastify
  }

  return setup()
}

const start = async () => {
  try {
    const app = await buildFastify()
    await app.listen({ port: 3000, host: '0.0.0.0' })
    app.log.info('Server running on http://localhost:3000')
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

const gracefulShutdown = async (app) => {
  try {
    if (app) {
      // Disconnect Redis store
      if (app.redisStore) {
        await app.redisStore.disconnect()
      }
      await app.close()
    }
    await prisma.$disconnect()
    process.exit(0)
  } catch (err) {
    console.error('Error during shutdown:', err)
    process.exit(1)
  }
}

export default buildFastify
export { start, gracefulShutdown }

start()
process.on('SIGINT', () => gracefulShutdown())
process.on('SIGTERM', () => gracefulShutdown())
