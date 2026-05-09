import dotenv from 'dotenv';
import { join } from 'path';
import { PrismaClient } from '../src/generated/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { uuidv7 } from 'uuidv7';
import { encryptedParameterValueData } from '../src/crypto/envelope.js';

dotenv.config({ path: join(import.meta.dirname, '..', '.env') });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function encryptedValue({ parameterId, environmentId, value }) {
  const id = uuidv7();
  return {
    id,
    parameterId,
    environmentId,
    isSet: value !== '',
    ...encryptedParameterValueData({
      value,
      parameterValueId: id,
      parameterId,
      environmentId
    })
  };
}

async function main() {
  console.log('🌱 Starting seed...\n');

  // Clean up existing data
  await prisma.parameterValue.deleteMany();
  await prisma.parameter.deleteMany();
  await prisma.app.deleteMany();
  await prisma.environment.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // ============================================
  // Org 1: Startup (flat structure)
  // ============================================
  const startup = await prisma.organization.create({
    data: { id: uuidv7(), name: 'Startup Inc' }
  });
  console.log(`✅ Created org: ${startup.name} (id=${startup.id})`);

  const startupEnvs = await Promise.all([
    prisma.environment.create({ data: { id: uuidv7(), orgId: startup.id, name: 'development' } }),
    prisma.environment.create({ data: { id: uuidv7(), orgId: startup.id, name: 'production' } })
  ]);
  console.log(`   - Created ${startupEnvs.length} environments`);

  // 2 app flat (no hierarchy)
  const startupApp1 = await prisma.app.create({
    data: { id: uuidv7(), orgId: startup.id, name: 'web-app', parentId: null }
  });
  const startupApp2 = await prisma.app.create({
    data: { id: uuidv7(), orgId: startup.id, name: 'mobile-app', parentId: null }
  });
  console.log(`   - Created ${2} apps (no hierarchy)\n`);

  // ============================================
  // ORG 2: Mid-size (2 levels hierarchy)
  // ============================================
  const midCo = await prisma.organization.create({
    data: { id: uuidv7(), name: 'MidSize Corp' }
  });
  console.log(`✅ Created org: ${midCo.name} (id=${midCo.id})`);

  const midCoEnvs = await Promise.all([
    prisma.environment.create({ data: { id: uuidv7(), orgId: midCo.id, name: 'dev' } }),
    prisma.environment.create({ data: { id: uuidv7(), orgId: midCo.id, name: 'staging' } }),
    prisma.environment.create({ data: { id: uuidv7(), orgId: midCo.id, name: 'prod' } })
  ]);
  console.log(`   - Created ${midCoEnvs.length} environments`);

  // Root app
  const backend = await prisma.app.create({
    data: { id: uuidv7(), orgId: midCo.id, name: 'backend', parentId: null }
  });
  console.log(`   - Created root app: ${backend.name}`);

  // Children
  const authService = await prisma.app.create({
    data: {
      id: uuidv7(),
      orgId: midCo.id,
      name: 'auth-service',
      parentId: backend.id,
      ancestors: [backend.id],
      depth: 1
    }
  });
  const apiService = await prisma.app.create({
    data: {
      id: uuidv7(),
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
    data: { id: uuidv7(), appId: backend.id, key: 'DB_HOST' }
  });
  await prisma.parameterValue.createMany({
    data: [
      encryptedValue({ parameterId: dbHostParam.id, environmentId: midCoEnvs[0].id, value: 'localhost' }),
      encryptedValue({ parameterId: dbHostParam.id, environmentId: midCoEnvs[1].id, value: 'staging.db.example.com' }),
      encryptedValue({ parameterId: dbHostParam.id, environmentId: midCoEnvs[2].id, value: 'prod.db.example.com' })
    ]
  });

  // Override in auth-service
  const authDbParam = await prisma.parameter.create({
    data: { id: uuidv7(), appId: authService.id, key: 'DB_HOST' }
  });
  await prisma.parameterValue.create({
    data: encryptedValue({ parameterId: authDbParam.id, environmentId: midCoEnvs[2].id, value: 'auth-prod.db.example.com' })
  });
  console.log(`   - Created parameters with inheritance (DB_HOST)\n`);

  // ============================================
  // ORG 3: Enterprise (deep hierarchy)
  // ============================================
  const enterprise = await prisma.organization.create({
    data: { id: uuidv7(), name: 'Enterprise Ltd' }
  });
  console.log(`✅ Created org: ${enterprise.name} (id=${enterprise.id})`);

  const entEnvs = await Promise.all([
    prisma.environment.create({ data: { id: uuidv7(), orgId: enterprise.id, name: 'dev' } }),
    prisma.environment.create({ data: { id: uuidv7(), orgId: enterprise.id, name: 'qa' } }),
    prisma.environment.create({ data: { id: uuidv7(), orgId: enterprise.id, name: 'staging' } }),
    prisma.environment.create({ data: { id: uuidv7(), orgId: enterprise.id, name: 'prod' } })
  ]);
  console.log(`   - Created ${entEnvs.length} environments`);

  // Multilevel hierarchy: root -> platform -> microservices -> services
  const root = await prisma.app.create({
    data: { id: uuidv7(), orgId: enterprise.id, name: 'root', parentId: null }
  });

  const platform = await prisma.app.create({
    data: {
      id: uuidv7(),
      orgId: enterprise.id,
      name: 'platform',
      parentId: root.id,
      ancestors: [root.id],
      depth: 1
    }
  });

  const microservices = await prisma.app.create({
    data: {
      id: uuidv7(),
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
        id: uuidv7(),
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
    data: { id: uuidv7(), appId: root.id, key: 'LOG_LEVEL' }
  });
  await prisma.parameterValue.createMany({
    data: [
      encryptedValue({ parameterId: logLevelRoot.id, environmentId: entEnvs[0].id, value: 'debug' }),
      encryptedValue({ parameterId: logLevelRoot.id, environmentId: entEnvs[3].id, value: 'error' })
    ]
  });

  // Override in payment-service
  const logLevelPayment = await prisma.parameter.create({
    data: { id: uuidv7(), appId: services[2].id, key: 'LOG_LEVEL' }
  });
  await prisma.parameterValue.create({
    data: encryptedValue({ parameterId: logLevelPayment.id, environmentId: entEnvs[3].id, value: 'warn' })
  });

  // Override in platform
  const apiTimeout = await prisma.parameter.create({
    data: { id: uuidv7(), appId: platform.id, key: 'API_TIMEOUT' }
  });
  await prisma.parameterValue.createMany({
    data: [
      encryptedValue({ parameterId: apiTimeout.id, environmentId: entEnvs[0].id, value: '5000' }),
      encryptedValue({ parameterId: apiTimeout.id, environmentId: entEnvs[3].id, value: '30000' })
    ]
  });

  console.log(`   - Created parameters with deep inheritance (LOG_LEVEL, API_TIMEOUT)\n`);

  // ============================================
  // ORG 4: Empty Org (edge case)
  // ============================================
  const empty = await prisma.organization.create({
    data: { id: uuidv7(), name: 'Empty Org' }
  });
  console.log(`✅ Created org: ${empty.name} (id=${empty.id})`);
  console.log(`   - No apps, no environments (edge case)\n`);

  // ============================================
  // USERS
  // ============================================
  const testUser = await prisma.user.create({
    data: {
      id: uuidv7(),
      supabaseId: 'test-supabase-id-001',
      email: 'test@safeconfig.dev',
      displayName: 'Test User'
    }
  });
  await prisma.userOrganization.create({
    data: { userId: testUser.id, orgId: startup.id, role: 'USER' }
  });
  console.log(`✅ Created test user: ${testUser.email} (org: ${startup.name})`);

  const adminUser = await prisma.user.create({
    data: {
      id: uuidv7(),
      supabaseId: 'admin-supabase-id-001',
      email: 'admin@safeconfig.dev',
      displayName: 'Admin User'
    }
  });
  await prisma.userOrganization.create({
    data: { userId: adminUser.id, orgId: midCo.id, role: 'ADMIN' }
  });
  console.log(`✅ Created admin user: ${adminUser.email} (org: ${midCo.name})`);

  const ownerUser = await prisma.user.create({
    data: {
      id: uuidv7(),
      supabaseId: 'owner-supabase-id-001',
      email: 'owner@safeconfig.dev',
      displayName: 'Owner User'
    }
  });
  await prisma.userOrganization.create({
    data: { userId: ownerUser.id, orgId: enterprise.id, role: 'OWNER' }
  });
  console.log(`✅ Created owner user: ${ownerUser.email} (org: ${enterprise.name})\n`);

  // ============================================
  // SUMMARY
  // ============================================
  const stats = {
    organizations: await prisma.organization.count(),
    users: await prisma.user.count(),
    apps: await prisma.app.count(),
    environments: await prisma.environment.count(),
    parameters: await prisma.parameter.count(),
    parameterValues: await prisma.parameterValue.count()
  };

  console.log('📊 Seed completed! Summary:');
  console.log(`   - Organizations: ${stats.organizations}`);
  console.log(`   - Users: ${stats.users}`);
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
