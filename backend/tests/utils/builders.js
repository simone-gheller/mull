/**
 * Test Data Builders for SafeConfig
 * Provides isolated, self-contained test data creation with automatic cleanup tracking
 *
 * Usage:
 *   let ctx;
 *   beforeEach(async () => { ctx = await buildTestContext(); });
 *   afterEach(async () => { await ctx.cleanup(); });
 *
 *   test('scenario', async () => {
 *     const org = await ctx.buildOrg();
 *     const app = await ctx.buildApp({ orgId: org.id });
 *     // ... test logic
 *   });
 */

import { uuidv7 } from 'uuidv7';
import { buildApp as buildFastifyApp } from '../../src/server.js';
import { syncParameterEnvironmentValues } from '../../src/lib/syncParameterValues.js';
import { encryptedParameterValueData } from '../../src/crypto/envelope.js';

/**
 * Generate unique identifier for test resources
 * @returns {string}
 */
function uniqueId() {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).slice(2, 7);
  return `${timestamp}-${randomStr}`;
}

/**
 * Build isolated test context with Fastify instance and cleanup tracking
 * @returns {Promise<TestContext>}
 *
 * @example
 * let ctx;
 * beforeEach(async () => { ctx = await buildTestContext(); });
 * afterEach(async () => { await ctx.cleanup(); });
 *
 * test('scenario', async () => {
 *   const org = await ctx.buildOrg();
 *   const app = await ctx.buildApp({ orgId: org.id });
 *   // test logic
 * });
 */
export async function buildTestContext() {
  const fastify = buildFastifyApp({ logger: false, testMode: true });
  await fastify.ready();

  const prisma = fastify.prisma;
  const createdIds = {
    orgs: [],
    apps: [],
    envs: [],
    params: [],
    paramValues: [],
    users: []
  };

  const context = {
    fastify,
    prisma,
    createdIds,

    /**
     * Track created resource for cleanup
     * @param {string} type - Resource type ('orgs', 'apps', 'envs', 'params', 'paramValues')
     * @param {string} id - Resource ID (UUID string)
     */
    track(type, id) {
      this.createdIds[type].push(id);
    },

    /**
     * Build unique organization
     * @param {Object} overrides - Optional field overrides
     * @param {string} [overrides.name] - Organization name
     * @param {string} [overrides.plan] - Organization plan
     * @returns {Promise<{id: string, name: string}>}
     */
    async buildOrg(overrides = {}) {
      const name = overrides.name || `test-org-${uniqueId()}`;

      const org = await prisma.organization.create({
        data: {
          id: uuidv7(),
          name,
          ...(overrides.plan ? { plan: overrides.plan } : {})
        },
        select: { id: true, name: true, plan: true }
      });

      // Auto-track
      this.track('orgs', org.id);

      return org;
    },

    /**
     * Build app with optional parent hierarchy
     * @param {Object} options
     * @param {string} options.orgId - Required: Organization ID
     * @param {string} [options.parentId] - Optional: Parent app ID
     * @param {string} [options.name] - Optional: App name
     * @returns {Promise<{id: string, orgId: string, parentId: string|null, name: string, ancestors: string[], depth: number}>}
     */
    async buildApp(options = {}) {
      const { orgId, parentId, name } = options;

      if (!orgId) {
        throw new Error('buildApp requires orgId');
      }

      const appName = name || `test-app-${uniqueId()}`;

      let ancestors = [];
      let depth = 0;

      // If parent provided, fetch hierarchy info
      if (parentId) {
        const parent = await prisma.app.findUnique({
          where: { id: parentId },
          select: { id: true, ancestors: true, depth: true, orgId: true }
        });

        if (!parent) {
          throw new Error(`Parent app ${parentId} not found`);
        }

        if (parent.orgId !== orgId) {
          throw new Error(`Parent app belongs to different org`);
        }

        ancestors = [...parent.ancestors, parent.id];
        depth = parent.depth + 1;
      }

      const app = await prisma.app.create({
        data: {
          id: uuidv7(),
          orgId: orgId,
          name: appName,
          parentId: parentId || null,
          ancestors,
          depth
        },
        select: {
          id: true,
          orgId: true,
          parentId: true,
          name: true,
          ancestors: true,
          depth: true
        }
      });

      // Auto-track
      this.track('apps', app.id);

      return app;
    },

    /**
     * Build environment
     * NOTE: ParameterValue sync is triggered by the route handler, not by this builder
     *
     * @param {Object} options
     * @param {string} options.orgId - Required: Organization ID
     * @param {string} [options.name] - Optional: Environment name
     * @returns {Promise<{id: string, orgId: string, name: string}>}
     */
    async buildEnv(options = {}) {
      const { orgId, name } = options;

      if (!orgId) {
        throw new Error('buildEnv requires orgId');
      }

      const envName = name || `test-env-${uniqueId()}`;

      const env = await prisma.environment.create({
        data: {
          id: uuidv7(),
          orgId: orgId,
          name: envName
        },
        select: {
          id: true,
          orgId: true,
          name: true
        }
      });

      // Auto-track
      this.track('envs', env.id);

      return env;
    },

    /**
     * Build parameter
     * Automatically syncs parameter values for all environments in the organization
     *
     * @param {Object} options
     * @param {string} options.appId - Required: App ID
     * @param {string} [options.key] - Optional: Parameter key
     * @returns {Promise<{id: string, appId: string, key: string}>}
     */
    async buildParam(options = {}) {
      const { appId, key } = options;

      if (!appId) {
        throw new Error('buildParam requires appId');
      }

      const paramKey = key || `TEST_PARAM_${uniqueId().toUpperCase().replace(/-/g, '_')}`;

      const param = await prisma.parameter.create({
        data: {
          id: uuidv7(),
          appId: appId,
          key: paramKey
        },
        select: {
          id: true,
          appId: true,
          key: true
        }
      });

      // Auto-track
      this.track('params', param.id);

      // Get orgId from app to sync parameter values
      const app = await prisma.app.findUnique({
        where: { id: appId },
        select: { orgId: true }
      });

      if (app) {
        // Sync parameter values for all environments in this organization
        await syncParameterEnvironmentValues(param.id, app.orgId);
      }

      return param;
    },

    /**
     * Build parameter value
     * @param {Object} options
     * @param {string} options.parameterId - Required: Parameter ID
     * @param {string} options.environmentId - Required: Environment ID
     * @param {string} [options.value] - Optional: Value (defaults to empty string)
     * @returns {Promise<{id: string, parameterId: string, environmentId: string, value: string}>}
     */
    async buildParamValue(options = {}) {
      const { parameterId, environmentId, value = '' } = options;

      if (!parameterId || !environmentId) {
        throw new Error('buildParamValue requires parameterId and environmentId');
      }

      const id = uuidv7();
      const paramValue = await prisma.parameterValue.create({
        data: {
          id,
          parameterId: parameterId,
          environmentId: environmentId,
          isSet: value !== '',
          ...encryptedParameterValueData({
            value,
            parameterValueId: id,
            parameterId,
            environmentId
          })
        },
        select: {
          id: true,
          parameterId: true,
          environmentId: true
        }
      });

      // Auto-track
      this.track('paramValues', paramValue.id);

      return { ...paramValue, value };
    },

    /**
     * Build complete isolated organization with app and environment
     * @returns {Promise<{org: Object, app: Object, env: Object}>}
     */
    async buildOrgWithAppAndEnv() {
      const org = await this.buildOrg();
      const app = await this.buildApp({ orgId: org.id });
      const env = await this.buildEnv({ orgId: org.id });

      return { org, app, env };
    },

    /**
     * Build app hierarchy (parent + children)
     * @param {Object} options
     * @param {string} options.orgId - Required: Organization ID
     * @param {number} [options.childCount=2] - Number of children to create
     * @returns {Promise<{parent: Object, children: Object[]}>}
     */
    async buildAppHierarchy(options = {}) {
      const { orgId, childCount = 2 } = options;

      const parent = await this.buildApp({ orgId });

      const children = [];
      for (let i = 0; i < childCount; i++) {
        const child = await this.buildApp({ orgId, parentId: parent.id });
        children.push(child);
      }

      return { parent, children };
    },

    /**
     * Build user (minimal, no org membership)
     * @param {Object} overrides - Optional field overrides
     * @param {string} [overrides.email] - User email
     * @param {string} [overrides.supabaseId] - Supabase user ID
     * @param {string} [overrides.displayName] - Display name
     * @returns {Promise<{id: string, supabaseId: string, email: string, displayName: string|null}>}
     */
    async buildUser(overrides = {}) {
      const email = overrides.email || `user-${uniqueId()}@test.com`;
      const supabaseId = overrides.supabaseId || `supabase-${uuidv7()}`;

      const user = await prisma.user.create({
        data: {
          id: uuidv7(),
          supabaseId,
          email,
          displayName: overrides.displayName || null
        },
        select: { id: true, supabaseId: true, email: true, displayName: true }
      });

      this.track('users', user.id);
      return user;
    },

    /**
     * Add user to org with a role
     * @param {Object} options
     * @param {string} options.userId
     * @param {string} options.orgId
     * @param {string} [options.role] - 'USER' | 'ADMIN' | 'OWNER' (default: 'OWNER')
     */
    async buildOrgMembership({ userId, orgId, role = 'OWNER' }) {
      await prisma.userOrganization.create({ data: { userId, orgId, role } });
    },

    /**
     * Build user + add them to an org in one call
     * @param {Object} org - Org object with id
     * @param {Object} [options]
     * @param {string} [options.role] - 'USER' | 'ADMIN' | 'OWNER' (default: 'OWNER')
     * @param {Object} [options.userOverrides] - overrides for buildUser
     * @returns {Promise<{id: string, supabaseId: string, email: string, displayName: string|null}>}
     */
    async buildUserInOrg(org, { role = 'OWNER', ...userOverrides } = {}) {
      const user = await this.buildUser(userOverrides);
      await this.buildOrgMembership({ userId: user.id, orgId: org.id, role });
      return user;
    },

    /**
     * Inject authenticated request using testMode x-test-user-id header
     * @param {Object} options - Inject options (method, url, headers, body, etc.)
     * @param {Object} user - User object with id
     * @returns {Promise} Response from inject
     */
    async injectAuth(options, user) {
      return await this.fastify.inject({
        ...options,
        headers: {
          ...options.headers,
          'x-test-user-id': user.id
        }
      });
    },

    /**
     * Cleanup all created resources and close Fastify
     * Deletes organizations (cascade handles children)
     */
    async cleanup() {
      try {
        // Delete orgs - Prisma cascade handles children
        // (Apps, Environments, Parameters, ParameterValues, memberships, and invites all have onDelete: Cascade)
        if (createdIds.orgs.length > 0) {
          await prisma.organization.deleteMany({
            where: { id: { in: createdIds.orgs } }
          });
        }

        if (createdIds.users?.length > 0) {
          await prisma.user.deleteMany({
            where: { id: { in: createdIds.users } }
          });
        }
      } finally {
        await fastify.close();
      }
    }
  };

  return context;
}
