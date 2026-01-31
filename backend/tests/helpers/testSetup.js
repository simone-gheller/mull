import { buildApp } from '../../src/server.js';

/**
 * Setup test application and get a valid organization ID for testing
 * Ensures the organization has at least one app and one environment
 * @returns {Promise<{app: FastifyInstance, testOrgId: string}>}
 */
export async function setupTestApp() {
  const app = buildApp({ logger: false });
  await app.ready();

  // Find an organization that has at least one app and one environment
  const org = await app.prisma.organization.findFirst({
    where: {
      apps: {
        some: {}
      },
      environments: {
        some: {}
      }
    }
  });

  if (!org) {
    throw new Error(
      'Database should have at least one organization with apps and environments. Run npm run db:seed first.'
    );
  }

  const testOrgId = org.id.toString();

  return { app, testOrgId };
}
