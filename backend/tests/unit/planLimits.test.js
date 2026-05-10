import test from 'node:test';
import assert from 'node:assert/strict';
import { getAuditExpiresAt, getAuditRetentionDays } from '../../src/lib/planLimits.js';

test('audit retention follows product plan defaults', () => {
  assert.equal(getAuditRetentionDays('HOBBY'), 7);
  assert.equal(getAuditRetentionDays('STARTER'), 30);
  assert.equal(getAuditRetentionDays('PRO'), 90);
  assert.equal(getAuditRetentionDays('ENTERPRISE'), null);
  assert.equal(getAuditRetentionDays('UNKNOWN'), 30);
});

test('audit expiration is calculated at event creation time', () => {
  const now = new Date('2026-05-10T12:00:00.000Z');

  assert.equal(getAuditExpiresAt('STARTER', now).toISOString(), '2026-06-09T12:00:00.000Z');
  assert.equal(getAuditExpiresAt('PRO', now).toISOString(), '2026-08-08T12:00:00.000Z');
  assert.equal(getAuditExpiresAt('ENTERPRISE', now), null);
});
