import Fastify from 'fastify';
import dotenv from 'dotenv';
import { getPrisma, disconnectPrisma } from './lib/prisma.js';
import configRoutes from './routes/config.js';

dotenv.config();

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname'
      }
    }
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

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    fastify.log.info('SafeConfig API server running on http://localhost:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
