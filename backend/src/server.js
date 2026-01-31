import Fastify from 'fastify';
import dotenv from 'dotenv';
import { getPrisma, disconnectPrisma } from './lib/prisma.js';
import configRoutes from './routes/config.js';
import environmentRoutes from './routes/environments.js';
import appRoutes from './routes/apps.js';

dotenv.config();

/**
 * Build and configure Fastify application
 * @param {Object} options - Configuration options
 * @param {boolean} options.logger - Enable logger (default: true, disable for tests)
 * @returns {FastifyInstance} Configured Fastify instance
 */
export function buildApp(options = {}) {
  const { logger = true } = options;

  const fastify = Fastify({
    logger: logger ? {
      level: process.env.LOG_LEVEL || 'info',
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

  // Decorate Fastify with Prisma singleton
  const prisma = getPrisma();
  fastify.decorate('prisma', prisma);

  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Register routes
  fastify.register(configRoutes);
  fastify.register(environmentRoutes);
  fastify.register(appRoutes);

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
    } catch (err) {
      app.log.error(err);
      process.exit(1);
    }
  };

  start();
}
