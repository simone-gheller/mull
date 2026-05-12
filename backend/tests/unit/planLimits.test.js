import test from 'node:test';
import assert from 'node:assert/strict';
import { getAuditExpiresAt, getAuditRetentionDays, getParameterValueVersionLimit, getPlanLimits } from '../../src/lib/planLimits.js';

test('audit retention follows product plan defaults', () => {
  assert.equal(getAuditRetentionDays('FREE'), 7);
  assert.equal(getAuditRetentionDays('TEAM'), 90);
  assert.equal(getAuditRetentionDays('BUSINESS'), 365);
  assert.equal(getAuditRetentionDays('ENTERPRISE'), null);
  assert.equal(getAuditRetentionDays('UNKNOWN'), 7);
});

test('plan limits follow pricing tier defaults', () => {
  assert.equal(getPlanLimits('FREE').members, 3);
  assert.equal(getPlanLimits('TEAM').members, 5);
  assert.equal(getPlanLimits('BUSINESS').members, 15);
  assert.equal(getPlanLimits('ENTERPRISE').members, null);
  assert.equal(getPlanLimits('UNKNOWN').members, 3);
  assert.equal(getParameterValueVersionLimit('FREE'), 5);
  assert.equal(getParameterValueVersionLimit('TEAM'), 50);
  assert.equal(getParameterValueVersionLimit('BUSINESS'), 250);
});

test('audit expiration is calculated at event creation time', () => {
  const now = new Date('2026-05-10T12:00:00.000Z');

  assert.equal(getAuditExpiresAt('FREE', now).toISOString(), '2026-05-17T12:00:00.000Z');
  assert.equal(getAuditExpiresAt('TEAM', now).toISOString(), '2026-08-08T12:00:00.000Z');
  assert.equal(getAuditExpiresAt('BUSINESS', now).toISOString(), '2027-05-10T12:00:00.000Z');
  assert.equal(getAuditExpiresAt('ENTERPRISE', now), null);
});
