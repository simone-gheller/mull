import { PrismaClient } from '../generated/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';

let prisma;

export function getPrisma() {
  if (!prisma) {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

    // Configure Prisma logging: exclude 'error' in test mode to avoid noise from expected errors
    const logLevels = process.env.LOG_LEVEL === 'debug'
      ? ['query', 'info', 'warn', 'error']
      : ['warn'];

    prisma = new PrismaClient({
      adapter,
      log: logLevels
    });
  }
  return prisma;
}

export async function disconnectPrisma() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}