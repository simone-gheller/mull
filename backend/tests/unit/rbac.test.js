import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canRevealConfig,
  canWriteConfig,
  hasPermission,
  roleAtLeast,
  SYSTEM_ROLES,
  validatePermissions
} from '../../src/lib/rbac.js';

const developerAuth = {
  credentialType: 'SUPABASE_JWT',
  permissions: SYSTEM_ROLES.DEVELOPER.permissions,
  scopes: []
};

const adminAuth = {
  credentialType: 'SUPABASE_JWT',
  permissions: SYSTEM_ROLES.ADMIN.permissions,
  scopes: []
};

const protectedProd = { id: 'env_prod', tier: 'PRODUCTION', protected: true };
const staging = { id: 'env_staging', tier: 'STAGING', protected: false };

test('role hierarchy keeps system role ordering', () => {
  assert.equal(roleAtLeast('OWNER', 'ADMIN'), true);
  assert.equal(roleAtLeast('ADMIN', 'DEVELOPER'), true);
  assert.equal(roleAtLeast('DEVELOPER', 'ADMIN'), false);
  assert.equal(roleAtLeast('VIEWER', 'DEVELOPER'), false);
});

test('permission matcher honors environment protection conditions', () => {
  assert.equal(canRevealConfig({ auth: developerAuth }, { environment: staging }), true);
  assert.equal(canWriteConfig({ auth: developerAuth }, { environment: staging }), true);
  assert.equal(canRevealConfig({ auth: developerAuth }, { environment: protectedProd }), false);
  assert.equal(canWriteConfig({ auth: developerAuth }, { environment: protectedProd }), false);
  assert.equal(canRevealConfig({ auth: adminAuth }, { environment: protectedProd }), true);
});

test('access key scopes are direct and do not inherit role permissions', () => {
  const auth = {
    credentialType: 'ACCESS_KEY',
    scopes: ['config:read'],
    permissions: SYSTEM_ROLES.OWNER.permissions
  };
  assert.equal(hasPermission(auth, 'config:read'), true);
  assert.equal(hasPermission(auth, 'config:write'), false);
});

test('personal access keys are limited by both token scope and user role permissions', () => {
  const auth = {
    credentialType: 'ACCESS_KEY',
    identityType: 'USER',
    scopes: ['config:reveal', 'config:write'],
    permissions: SYSTEM_ROLES.DEVELOPER.permissions
  };

  assert.equal(canRevealConfig({ auth }, { environment: staging }), true);
  assert.equal(canWriteConfig({ auth }, { environment: protectedProd }), false);
});

test('custom role permissions validate scope names', () => {
  assert.deepEqual(validatePermissions([{ scope: 'config:read' }]), [{ scope: 'config:read' }]);
  assert.throws(() => validatePermissions([{ scope: 'made:up' }]), /Invalid scope/);
});
