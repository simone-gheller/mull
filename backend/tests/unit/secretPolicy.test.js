import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canReadParameterValue,
  canWriteParameterValue,
  describeValueAccess,
  isSecretValue,
  roleAtLeast,
} from '../../src/lib/secretPolicy.js';

const plainValue = {
  parameter: { isSecret: false },
  environment: { isSecret: false },
};

const secretParameterValue = {
  parameter: { isSecret: true },
  environment: { isSecret: false },
};

const secretEnvironmentValue = {
  parameter: { isSecret: false },
  environment: { isSecret: true },
};

test('role hierarchy is centralized', () => {
  assert.equal(roleAtLeast('OWNER', 'ADMIN'), true);
  assert.equal(roleAtLeast('ADMIN', 'ADMIN'), true);
  assert.equal(roleAtLeast('USER', 'ADMIN'), false);
  assert.equal(roleAtLeast('UNKNOWN', 'ADMIN'), false);
  assert.equal(roleAtLeast('ADMIN', 'UNKNOWN'), false);
});

test('secret value classification includes parameter and environment secrecy', () => {
  assert.equal(isSecretValue(plainValue), false);
  assert.equal(isSecretValue(secretParameterValue), true);
  assert.equal(isSecretValue(secretEnvironmentValue), true);
});

test('read policy redacts secret values for USER and allows ADMIN+', () => {
  assert.equal(canReadParameterValue('USER', plainValue), true);
  assert.equal(canReadParameterValue('USER', secretParameterValue), false);
  assert.equal(canReadParameterValue('ADMIN', secretParameterValue), true);
  assert.equal(canReadParameterValue('OWNER', secretEnvironmentValue), true);
});

test('write policy requires ADMIN+ and secret read permission', () => {
  assert.equal(canWriteParameterValue('USER', plainValue), false);
  assert.equal(canWriteParameterValue('ADMIN', plainValue), true);
  assert.equal(canWriteParameterValue('ADMIN', secretParameterValue), true);
  assert.equal(canWriteParameterValue('OWNER', secretEnvironmentValue), true);
});

test('access description provides frontend-safe state hints', () => {
  assert.deepEqual(describeValueAccess('USER', secretParameterValue), {
    isSecret: true,
    canRead: false,
    canWrite: false,
    stateWhenSet: 'redacted'
  });

  assert.deepEqual(describeValueAccess('ADMIN', secretParameterValue), {
    isSecret: true,
    canRead: true,
    canWrite: true,
    stateWhenSet: 'set'
  });
});
