import Fastify from 'fastify';
import { Readable } from 'node:stream';
import fastifyEnv from '@fastify/env';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { getPrisma, disconnectPrisma } from './lib/prisma.js';
import { swaggerConfig, swaggerUiConfig } from './openapi/config.js';
import { healthCheckSchema } from './openapi/health.js';
import authPlugin from './plugins/auth.js';
import testAuthPlugin from './plugins/testAuth.js';
import supabasePlugin from './plugins/supabase.js';
import mailerPlugin from './plugins/mailer.js';
import auditPlugin from './plugins/audit.js';
import authRoutes from './routes/auth.js';
import configRoutes from './routes/config.js';
import environmentRoutes from './routes/environments.js';
import appRoutes from './routes/apps.js';
import parameterRoutes from './routes/parameters.js';
import parameterValueRoutes from './routes/parameterValues.js';
import orgRoutes from './routes/orgs.js';
import invitationRoutes from './routes/invitations.js';
import accessKeyRoutes from './routes/accessKeys.js';
import billingRoutes from './routes/billing.js';
import cliAuthRoutes from './routes/cliAuth.js';
import v1ConfigRoutes from './routes/v1Config.js';
import { startSubscriber, stopSubscriber } from './realtime/supabaseSubscriber.js';
import { envSchema } from './config.js';

/**
 * Build and configure Fastify application
 * @param {Object} options - Configuration options
 * @param {boolean} options.logger - Enable logger (default: true, disable for tests)
 * @returns {FastifyInstance} Configured Fastify instance
 */
export function buildApp(options = {}) {
  const { logger = true, testMode = false } = options;

  const fastify = Fastify({
    logger: logger ? {
      level: process.env.LOG_LEVEL || 'info', // verrà sovrascritto da fastify.config dopo la validazione
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname'
        }
      }
    } : false,
    routerOptions: {
      ignoreTrailingSlash: true
    }
  });

  // Validate required env vars at startup — server won't start if any are missing
  fastify.register(fastifyEnv, { schema: envSchema, dotenv: true });

  fastify.addHook('preParsing', async (request, _reply, payload) => {
    if (request.method !== 'POST' || request.url.split('?')[0] !== '/webhooks/paddle') {
      return payload;
    }

    const chunks = [];
    for await (const chunk of payload) {
      chunks.push(Buffer.from(chunk));
    }
    const rawBody = Buffer.concat(chunks);
    request.rawBody = rawBody.toString('utf8');
    return Readable.from(rawBody);
  });

  fastify.register(cors, {
    origin: (origin, callback) => {
      const allowed = process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',')
        : ['http://localhost:5173', 'http://localhost:5174'];
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global rate limit — permissive default, tightened per-route where needed
  fastify.register(rateLimit, {
    global: true,
    max: 200,
    timeWindow: '1 minute'
  });

  // Decorate Fastify with Prisma singleton
  const prisma = getPrisma();
  fastify.decorate('prisma', prisma);

  fastify.register(supabasePlugin);
  fastify.register(mailerPlugin);
  fastify.register(testMode ? testAuthPlugin : authPlugin);
  fastify.register(auditPlugin);

  // Register Swagger documentation
  fastify.register(swagger, swaggerConfig);

  // Register Swagger UI
  fastify.register(swaggerUi, swaggerUiConfig);

  // Health check
  fastify.get('/health', { schema: healthCheckSchema }, async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Register routes
  // Auth routes - no prefix (no org context)
  fastify.register(authRoutes);
  fastify.register(invitationRoutes);
  fastify.register(accessKeyRoutes);
  fastify.register(billingRoutes);
  fastify.register(cliAuthRoutes);

  // SDK-facing v1 routes — org resolved from token, no /orgs/:orgId prefix
  fastify.register(v1ConfigRoutes, { prefix: '/v1' });

  // Org-scoped routes - all use /orgs/:orgId prefix
  fastify.register(configRoutes, { prefix: '/orgs/:orgId' });
  fastify.register(environmentRoutes, { prefix: '/orgs/:orgId' });
  fastify.register(appRoutes, { prefix: '/orgs/:orgId' });
  fastify.register(parameterRoutes, { prefix: '/orgs/:orgId' });
  fastify.register(parameterValueRoutes, { prefix: '/orgs/:orgId' });
  fastify.register(orgRoutes, { prefix: '/orgs/:orgId' });

  // Global error handler
  fastify.setErrorHandler((error, _request, reply) => {
    fastify.log.error(error);
    reply.code(error.statusCode || 500).send({
      error: error.name || 'Internal Server Error',
      message: error.message,
      statusCode: error.statusCode || 500
    });
  });

  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    fastify.log.info('Disconnecting Prisma...');
    await disconnectPrisma();
    await stopSubscriber();
  });

  return fastify;
}

// Start server (only when file is executed directly, not when imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  const start = async () => {
    const app = buildApp();
    try {
      await app.listen({ port: 3000, host: '0.0.0.0' });
      app.log.info('SafeConfig API server running on http://localhost:3000');

      // Start Supabase Realtime subscriber after server is up
      startSubscriber(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
      app.log.info('Supabase Realtime subscriber started');
    } catch (err) {
      app.log.error(err);
      process.exit(1);
    }
  };

  start();
}
