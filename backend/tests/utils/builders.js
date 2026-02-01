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

import { buildApp as buildFastifyApp } from '../../src/server.js';

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
  const fastify = buildFastifyApp({ logger: false });
  await fastify.ready();

  const prisma = fastify.prisma;
  const createdIds = {
    orgs: [],
    apps: [],
    envs: [],
    params: [],
    paramValues: []
  };

  const context = {
    fastify,
    prisma,
    createdIds,

    /**
     * Track created resource for cleanup
     * @param {string} type - Resource type ('orgs', 'apps', 'envs', 'params', 'paramValues')
     * @param {string} id - Resource ID
     */
    track(type, id) {
      this.createdIds[type].push(BigInt(id));
    },

    /**
     * Build unique organization
     * @param {Object} overrides - Optional field overrides
     * @param {string} [overrides.name] - Organization name
     * @returns {Promise<{id: string, name: string}>}
     */
    async buildOrg(overrides = {}) {
      const name = overrides.name || `test-org-${uniqueId()}`;

      const org = await prisma.organization.create({
        data: { name },
        select: { id: true, name: true }
      });

      const result = {
        id: org.id.toString(),
        name: org.name
      };

      // Auto-track
      this.track('orgs', result.id);

      return result;
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
          where: { id: BigInt(parentId) },
          select: { id: true, ancestors: true, depth: true, orgId: true }
        });

        if (!parent) {
          throw new Error(`Parent app ${parentId} not found`);
        }

        if (parent.orgId.toString() !== orgId.toString()) {
          throw new Error(`Parent app belongs to different org`);
        }

        ancestors = [...parent.ancestors, parent.id];
        depth = parent.depth + 1;
      }

      const app = await prisma.app.create({
        data: {
          orgId: BigInt(orgId),
          name: appName,
          parentId: parentId ? BigInt(parentId) : null,
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

      const result = {
        id: app.id.toString(),
        orgId: app.orgId.toString(),
        parentId: app.parentId?.toString() || null,
        name: app.name,
        ancestors: app.ancestors.map(id => id.toString()),
        depth: app.depth
      };

      // Auto-track
      this.track('apps', result.id);

      return result;
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
          orgId: BigInt(orgId),
          name: envName
        },
        select: {
          id: true,
          orgId: true,
          name: true
        }
      });

      const result = {
        id: env.id.toString(),
        orgId: env.orgId.toString(),
        name: env.name
      };

      // Auto-track
      this.track('envs', result.id);

      return result;
    },

    /**
     * Build parameter
     * NOTE: ParameterValue sync is triggered by the route handler, not by this builder
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
          appId: BigInt(appId),
          key: paramKey
        },
        select: {
          id: true,
          appId: true,
          key: true
        }
      });

      const result = {
        id: param.id.toString(),
        appId: param.appId.toString(),
        key: param.key
      };

      // Auto-track
      this.track('params', result.id);

      return result;
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

      const paramValue = await prisma.parameterValue.create({
        data: {
          parameterId: BigInt(parameterId),
          environmentId: BigInt(environmentId),
          value
        },
        select: {
          id: true,
          parameterId: true,
          environmentId: true,
          value: true
        }
      });

      const result = {
        id: paramValue.id.toString(),
        parameterId: paramValue.parameterId.toString(),
        environmentId: paramValue.environmentId.toString(),
        value: paramValue.value
      };

      // Auto-track
      this.track('paramValues', result.id);

      return result;
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
     * Cleanup all created resources and close Fastify
     * Deletes organizations (cascade handles children)
     */
    async cleanup() {
      try {
        // Delete orgs only - Prisma cascade handles children
        // (Apps, Environments, Parameters, ParameterValues all have onDelete: Cascade)
        if (createdIds.orgs.length > 0) {
          await prisma.organization.deleteMany({
            where: { id: { in: createdIds.orgs } }
          });
        }
      } finally {
        await fastify.close();
      }
    }
  };

  return context;
}