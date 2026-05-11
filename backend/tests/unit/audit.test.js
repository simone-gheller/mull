import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { httpFailureTarget, resolveHttpFailureOrgId } from '../../src/plugins/audit.js';

const ORG_ID = '019ddfd1-317d-7cff-9c2c-3698761af500';

describe('audit HTTP failure helpers', () => {
  test('does not fall back to the first user organization', () => {
    const orgId = resolveHttpFailureOrgId({
      url: '/auth/access-keys',
      params: {},
      body: { name: 'missing org id' },
      auth: { identityType: 'USER', orgId: null },
      user: { organizations: [{ id: ORG_ID }] }
    });

    assert.equal(orgId, null);
  });

  test('uses explicit tenant context from params, org paths, body, or service tokens', () => {
    const user = { organizations: [{ id: ORG_ID }] };

    assert.equal(resolveHttpFailureOrgId({
      url: '/anything',
      params: { orgId: ORG_ID },
      auth: { identityType: 'USER', orgId: null },
      user
    }), ORG_ID);

    assert.equal(resolveHttpFailureOrgId({
      url: `/orgs/${ORG_ID}/invites/019ddfd1-317d-7cff-9c2c-3698761af510?token=secret`,
      params: {},
      auth: { identityType: 'USER', orgId: null },
      user
    }), ORG_ID);

    assert.equal(resolveHttpFailureOrgId({
      url: '/auth/access-keys',
      params: {},
      body: { orgId: ORG_ID },
      auth: { identityType: 'USER', orgId: null },
      user
    }), ORG_ID);

    assert.equal(resolveHttpFailureOrgId({
      url: '/orgs/019ddfd1-317d-7cff-9c2c-3698761af510/apps',
      params: {},
      auth: { identityType: 'SERVICE', orgId: ORG_ID },
      user
    }), ORG_ID);
  });

  test('normalizes HTTP failure targets to route labels and path-only metadata', () => {
    const target = httpFailureTarget({
      method: 'POST',
      url: `/orgs/${ORG_ID}/invites?token=secret`,
      routeOptions: { url: '/orgs/:orgId/invites' }
    });

    assert.deepEqual(target, {
      route: '/orgs/:orgId/invites',
      path: `/orgs/${ORG_ID}/invites`,
      label: 'POST /orgs/:orgId/invites'
    });
  });
});
