import { test, describe, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert';
import { buildTestContext } from '../utils/builders.js';

describe('CORS', () => {
  let ctx;

  beforeEach(async () => {
    ctx = await buildTestContext();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  test('allows PATCH preflight requests from the app origin', async () => {
    const response = await ctx.fastify.inject({
      method: 'OPTIONS',
      url: '/orgs/019ddfd1-317d-7cff-9c2c-3698761af509/members/019e0c00-36fb-7851-9c35-4e26d5c1e39b',
      headers: {
        origin: 'http://localhost:5173',
        'access-control-request-method': 'PATCH',
        'access-control-request-headers': 'content-type,authorization'
      }
    });

    assert.strictEqual(response.statusCode, 204);
    assert.match(response.headers['access-control-allow-methods'], /PATCH/);
  });
});
