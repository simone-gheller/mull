import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  decryptParameterValue,
  decryptParameterValueVersion,
  encryptParameterValueVersion,
  encryptParameterValue,
  resetKeyringForTests
} from '../../src/crypto/envelope.js';

const KEY = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';
const BASE = {
  parameterValueVersionId: '01900000-0000-7000-8000-000000000004',
  parameterValueId: '01900000-0000-7000-8000-000000000001',
  parameterId: '01900000-0000-7000-8000-000000000002',
  environmentId: '01900000-0000-7000-8000-000000000003'
};

function encryptedRecord(value = 'hello') {
  const encrypted = encryptParameterValue({ value, ...BASE });
  return {
    id: BASE.parameterValueId,
    parameterId: BASE.parameterId,
    environmentId: BASE.environmentId,
    ...encrypted
  };
}

function encryptedVersionRecord(value = 'hello') {
  const encrypted = encryptParameterValueVersion({ value, ...BASE });
  return {
    id: BASE.parameterValueVersionId,
    parameterValueId: BASE.parameterValueId,
    parameterId: BASE.parameterId,
    environmentId: BASE.environmentId,
    ...encrypted
  };
}

describe('envelope encryption', () => {
  beforeEach(() => {
    process.env.MASTER_KEY_HEX = KEY;
    process.env.KEK_VERSION = '1';
    resetKeyringForTests();
  });

  test('roundtrips plaintext values', () => {
    const record = encryptedRecord('secret-api-key');
    assert.strictEqual(decryptParameterValue(record), 'secret-api-key');
  });

  test('roundtrips empty string at the crypto layer', () => {
    const record = encryptedRecord('');
    assert.strictEqual(decryptParameterValue(record), '');
  });

  test('fails when ciphertext is tampered', () => {
    const record = encryptedRecord('secret-api-key');
    record.valueCiphertext = Buffer.from(record.valueCiphertext);
    record.valueCiphertext[0] = record.valueCiphertext[0] ^ 1;
    assert.throws(() => decryptParameterValue(record));
  });

  test('fails when row identity changes', () => {
    const record = encryptedRecord('secret-api-key');
    record.environmentId = '01900000-0000-7000-8000-000000000099';
    assert.throws(() => decryptParameterValue(record));
  });

  test('roundtrips historical parameter value versions', () => {
    const record = encryptedVersionRecord('previous-secret');
    assert.strictEqual(decryptParameterValueVersion(record), 'previous-secret');
  });

  test('fails when version identity changes', () => {
    const record = encryptedVersionRecord('previous-secret');
    record.parameterValueId = '01900000-0000-7000-8000-000000000099';
    assert.throws(() => decryptParameterValueVersion(record));
  });
});
