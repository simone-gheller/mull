import dotenv from 'dotenv';
import { join } from 'path';
import { PrismaClient } from '../src/generated/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';

dotenv.config({ path: join(import.meta.dirname, '..', '.env') });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting seed...\n');

  // Clean up existing data
  await prisma.parameterValue.deleteMany();
  await prisma.parameter.deleteMany();
  await prisma.app.deleteMany();
  await prisma.environment.deleteMany();
  await prisma.organization.deleteMany();

  // ============================================
  // Org 1: Startup (flat structure)
  // ============================================
  const startup = await prisma.organization.create({
    data: { name: 'Startup Inc' }
  });
  console.log(`✅ Created org: ${startup.name} (id=${startup.id})`);

  const startupEnvs = await Promise.all([
    prisma.environment.create({ data: { orgId: startup.id, name: 'development' } }),
    prisma.environment.create({ data: { orgId: startup.id, name: 'production' } })
  ]);
  console.log(`   - Created ${startupEnvs.length} environments`);

  // 2 app flat (no hierarchy)
  const startupApp1 = await prisma.app.create({
    data: { orgId: startup.id, name: 'web-app', parentId: null }
  });
  const startupApp2 = await prisma.app.create({
    data: { orgId: startup.id, name: 'mobile-app', parentId: null }
  });
  console.log(`   - Created ${2} apps (no hierarchy)\n`);

  // ============================================
  // ORG 2: Mid-size (2 levels hierarchy)
  // ============================================
  const midCo = await prisma.organization.create({
    data: { name: 'MidSize Corp' }
  });
  console.log(`✅ Created org: ${midCo.name} (id=${midCo.id})`);

  const midCoEnvs = await Promise.all([
    prisma.environment.create({ data: { orgId: midCo.id, name: 'dev' } }),
    prisma.environment.create({ data: { orgId: midCo.id, name: 'staging' } }),
    prisma.environment.create({ data: { orgId: midCo.id, name: 'prod' } })
  ]);
  console.log(`   - Created ${midCoEnvs.length} environments`);

  // Root app
  const backend = await prisma.app.create({
    data: { orgId: midCo.id, name: 'backend', parentId: null }
  });
  console.log(`   - Created root app: ${backend.name}`);

  // Children
  const authService = await prisma.app.create({
    data: {
      orgId: midCo.id,
      name: 'auth-service',
      parentId: backend.id,
      ancestors: [backend.id],
      depth: 1
    }
  });
  const apiService = await prisma.app.create({
    data: {
      orgId: midCo.id,
      name: 'api-service',
      parentId: backend.id,
      ancestors: [backend.id],
      depth: 1
    }
  });
  console.log(`   - Created 2 child apps under ${backend.name}`);

  // Parameters with inheritance
  const dbHostParam = await prisma.parameter.create({
    data: { appId: backend.id, key: 'DB_HOST' }
  });
  await prisma.parameterValue.createMany({
    data: [
      { parameterId: dbHostParam.id, environmentId: midCoEnvs[0].id, value: 'localhost' },
      { parameterId: dbHostParam.id, environmentId: midCoEnvs[1].id, value: 'staging.db.example.com' },
      { parameterId: dbHostParam.id, environmentId: midCoEnvs[2].id, value: 'prod.db.example.com' }
    ]
  });

  // Override in auth-service
  const authDbParam = await prisma.parameter.create({
    data: { appId: authService.id, key: 'DB_HOST' }
  });
  await prisma.parameterValue.create({
    data: { parameterId: authDbParam.id, environmentId: midCoEnvs[2].id, value: 'auth-prod.db.example.com' }
  });
  console.log(`   - Created parameters with inheritance (DB_HOST)\n`);

  // ============================================
  // ORG 3: Enterprise (deep hierarchy)
  // ============================================
  const enterprise = await prisma.organization.create({
    data: { name: 'Enterprise Ltd' }
  });
  console.log(`✅ Created org: ${enterprise.name} (id=${enterprise.id})`);

  const entEnvs = await Promise.all([
    prisma.environment.create({ data: { orgId: enterprise.id, name: 'dev' } }),
    prisma.environment.create({ data: { orgId: enterprise.id, name: 'qa' } }),
    prisma.environment.create({ data: { orgId: enterprise.id, name: 'staging' } }),
    prisma.environment.create({ data: { orgId: enterprise.id, name: 'prod' } })
  ]);
  console.log(`   - Created ${entEnvs.length} environments`);

  // Multilevel hierarchy: root -> platform -> microservices -> services
  const root = await prisma.app.create({
    data: { orgId: enterprise.id, name: 'root', parentId: null }
  });

  const platform = await prisma.app.create({
    data: {
      orgId: enterprise.id,
      name: 'platform',
      parentId: root.id,
      ancestors: [root.id],
      depth: 1
    }
  });

  const microservices = await prisma.app.create({
    data: {
      orgId: enterprise.id,
      name: 'microservices',
      parentId: platform.id,
      ancestors: [root.id, platform.id],
      depth: 2
    }
  });

  const services = [];
  for (const serviceName of ['user-service', 'order-service', 'payment-service', 'notification-service']) {
    const service = await prisma.app.create({
      data: {
        orgId: enterprise.id,
        name: serviceName,
        parentId: microservices.id,
        ancestors: [root.id, platform.id, microservices.id],
        depth: 3
      }
    });
    services.push(service);
  }
  console.log(`   - Created hierarchy: root -> platform -> microservices -> 4 services (4 levels deep)`);
  
  // Parameters with deep inheritance
  const logLevelRoot = await prisma.parameter.create({
    data: { appId: root.id, key: 'LOG_LEVEL' }
  });
  await prisma.parameterValue.createMany({
    data: [
      { parameterId: logLevelRoot.id, environmentId: entEnvs[0].id, value: 'debug' },
      { parameterId: logLevelRoot.id, environmentId: entEnvs[3].id, value: 'error' }
    ]
  });

  // Override in payment-service
  const logLevelPayment = await prisma.parameter.create({
    data: { appId: services[2].id, key: 'LOG_LEVEL' }
  });
  await prisma.parameterValue.create({
    data: { parameterId: logLevelPayment.id, environmentId: entEnvs[3].id, value: 'warn' }
  });

  // Override in platform
  const apiTimeout = await prisma.parameter.create({
    data: { appId: platform.id, key: 'API_TIMEOUT' }
  });
  await prisma.parameterValue.createMany({
    data: [
      { parameterId: apiTimeout.id, environmentId: entEnvs[0].id, value: '5000' },
      { parameterId: apiTimeout.id, environmentId: entEnvs[3].id, value: '30000' }
    ]
  });

  console.log(`   - Created parameters with deep inheritance (LOG_LEVEL, API_TIMEOUT)\n`);

  // ============================================
  // ORG 4: Empty Org (edge case)
  // ============================================
  const empty = await prisma.organization.create({
    data: { name: 'Empty Org' }
  });
  console.log(`✅ Created org: ${empty.name} (id=${empty.id})`);
  console.log(`   - No apps, no environments (edge case)\n`);

  // ============================================
  // SUMMARY
  // ============================================
  const stats = {
    organizations: await prisma.organization.count(),
    apps: await prisma.app.count(),
    environments: await prisma.environment.count(),
    parameters: await prisma.parameter.count(),
    parameterValues: await prisma.parameterValue.count()
  };

  console.log('📊 Seed completed! Summary:');
  console.log(`   - Organizations: ${stats.organizations}`);
  console.log(`   - Apps: ${stats.apps}`);
  console.log(`   - Environments: ${stats.environments}`);
  console.log(`   - Parameters: ${stats.parameters}`);
  console.log(`   - Parameter Values: ${stats.parameterValues}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
