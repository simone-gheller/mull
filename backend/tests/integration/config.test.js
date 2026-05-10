import { test, describe, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert';
import { buildTestContext } from '../utils/builders.js';
import { encryptedParameterValueData } from '../../src/crypto/envelope.js';

describe('Config Routes', () => {
  let ctx;

  beforeEach(async () => {
    ctx = await buildTestContext();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  describe('GET /orgs/:orgId/config/:appId/:envId', () => {
    test('should render inherited config and ignore unset child overrides', async () => {
      const org = await ctx.buildOrg();
      const user = await ctx.buildUserInOrg(org);
      const rootApp = await ctx.buildApp({ orgId: org.id, name: 'Root' });
      const childApp = await ctx.buildApp({ orgId: org.id, parentId: rootApp.id, name: 'Child' });
      const env = await ctx.buildEnv({ orgId: org.id, name: 'dev' });
      const rootShared = await ctx.buildParam({ appId: rootApp.id, key: 'SHARED_KEY' });
      const childShared = await ctx.buildParam({ appId: childApp.id, key: 'SHARED_KEY' });
      const childLocal = await ctx.buildParam({ appId: childApp.id, key: 'LOCAL_KEY' });

      const setParamValue = async (parameterId, value) => {
        const parameterValue = await ctx.prisma.parameterValue.findFirst({
          where: { parameterId, environmentId: env.id }
        });
        await ctx.prisma.parameterValue.update({
          where: { id: parameterValue.id },
          data: {
            isSet: value !== '',
            ...encryptedParameterValueData({
              value,
              parameterValueId: parameterValue.id,
              parameterId,
              environmentId: env.id
            })
          }
        });
      };

      await setParamValue(rootShared.id, 'from-root');
      await setParamValue(childShared.id, '');
      await setParamValue(childLocal.id, 'from-child');

      const response = await ctx.injectAuth({
        method: 'GET',
        url: `/orgs/${org.id}/config/${childApp.id}/${env.id}`
      }, user);

      assert.strictEqual(response.statusCode, 200);
      assert.deepStrictEqual(JSON.parse(response.body), {
        LOCAL_KEY: 'from-child',
        SHARED_KEY: 'from-root',
      });
    });
  });
});
