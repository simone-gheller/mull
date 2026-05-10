import crypto from 'node:crypto';

const ALG = 'AES-256-GCM';
const GCM_IV_BYTES = 12;
const KEY_BYTES = 32;

let cachedKeyring = null;

function requireBuffer(value, name) {
  if (!value) {
    throw new Error(`Missing encrypted field: ${name}`);
  }
  return Buffer.from(value);
}

function readField(record, camelName, snakeName = camelName) {
  return record[camelName] ?? record[snakeName];
}

function getKekVersion() {
  const raw = process.env.KEK_VERSION || '1';
  const version = Number.parseInt(raw, 10);
  if (!Number.isInteger(version) || version < 1) {
    throw new Error('KEK_VERSION must be a positive integer');
  }
  return version;
}

export function getKeyring() {
  if (cachedKeyring) return cachedKeyring;

  const masterKeyHex = process.env.MASTER_KEY_HEX;
  if (!masterKeyHex) {
    throw new Error('MASTER_KEY_HEX is required for parameter value encryption');
  }

  const currentVersion = getKekVersion();
  const currentKey = Buffer.from(masterKeyHex, 'hex');
  if (currentKey.length !== KEY_BYTES) {
    throw new Error('MASTER_KEY_HEX must decode to exactly 32 bytes');
  }

  cachedKeyring = {
    currentVersion,
    keys: new Map([[currentVersion, currentKey]])
  };
  return cachedKeyring;
}

export function resetKeyringForTests() {
  cachedKeyring = null;
}

function valueAad({ parameterValueId, parameterId, environmentId }) {
  return Buffer.from(`parameter_value:v1:${parameterValueId}:${parameterId}:${environmentId}`, 'utf8');
}

function dekAad({ parameterValueId, parameterId, environmentId, kekVersion }) {
  return Buffer.from(`parameter_value_dek:v1:${parameterValueId}:${parameterId}:${environmentId}:kek:${kekVersion}`, 'utf8');
}

function versionValueAad({ parameterValueVersionId, parameterValueId, parameterId, environmentId }) {
  return Buffer.from(
    `parameter_value_version:v1:${parameterValueVersionId}:${parameterValueId}:${parameterId}:${environmentId}`,
    'utf8'
  );
}

function versionDekAad({ parameterValueVersionId, parameterValueId, parameterId, environmentId, kekVersion }) {
  return Buffer.from(
    `parameter_value_version_dek:v1:${parameterValueVersionId}:${parameterValueId}:${parameterId}:${environmentId}:kek:${kekVersion}`,
    'utf8'
  );
}

function encryptGcm({ plaintext, key, aad }) {
  const iv = crypto.randomBytes(GCM_IV_BYTES);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { ciphertext, iv, tag };
}

function decryptGcm({ ciphertext, key, iv, tag, aad }) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAAD(aad);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export function encryptParameterValue({ value, parameterValueId, parameterId, environmentId }) {
  const keyring = getKeyring();
  const kekVersion = keyring.currentVersion;
  const kek = keyring.keys.get(kekVersion);
  const dek = crypto.randomBytes(KEY_BYTES);

  const valueEncrypted = encryptGcm({
    plaintext: Buffer.from(value ?? '', 'utf8'),
    key: dek,
    aad: valueAad({ parameterValueId, parameterId, environmentId })
  });

  const dekEncrypted = encryptGcm({
    plaintext: dek,
    key: kek,
    aad: dekAad({ parameterValueId, parameterId, environmentId, kekVersion })
  });

  return {
    valueCiphertext: valueEncrypted.ciphertext,
    valueIv: valueEncrypted.iv,
    valueTag: valueEncrypted.tag,
    dekCiphertext: dekEncrypted.ciphertext,
    dekIv: dekEncrypted.iv,
    dekTag: dekEncrypted.tag,
    kekVersion,
    encryptionAlg: ALG,
    encryptedAt: new Date()
  };
}

export function encryptParameterValueVersion({
  value,
  parameterValueVersionId,
  parameterValueId,
  parameterId,
  environmentId
}) {
  const keyring = getKeyring();
  const kekVersion = keyring.currentVersion;
  const kek = keyring.keys.get(kekVersion);
  const dek = crypto.randomBytes(KEY_BYTES);

  const valueEncrypted = encryptGcm({
    plaintext: Buffer.from(value ?? '', 'utf8'),
    key: dek,
    aad: versionValueAad({ parameterValueVersionId, parameterValueId, parameterId, environmentId })
  });

  const dekEncrypted = encryptGcm({
    plaintext: dek,
    key: kek,
    aad: versionDekAad({ parameterValueVersionId, parameterValueId, parameterId, environmentId, kekVersion })
  });

  return {
    valueCiphertext: valueEncrypted.ciphertext,
    valueIv: valueEncrypted.iv,
    valueTag: valueEncrypted.tag,
    dekCiphertext: dekEncrypted.ciphertext,
    dekIv: dekEncrypted.iv,
    dekTag: dekEncrypted.tag,
    kekVersion,
    encryptionAlg: ALG,
    encryptedAt: new Date()
  };
}

export function decryptParameterValue(record) {
  const parameterValueId = readField(record, 'id', 'parameter_value_id');
  const parameterId = readField(record, 'parameterId', 'parameter_id');
  const environmentId = readField(record, 'environmentId', 'environment_id');
  const kekVersion = readField(record, 'kekVersion', 'kek_version');
  const encryptionAlg = readField(record, 'encryptionAlg', 'encryption_alg') ?? ALG;

  if (encryptionAlg !== ALG) {
    throw new Error(`Unsupported encryption algorithm: ${encryptionAlg}`);
  }
  if (!parameterValueId || !parameterId || !environmentId) {
    throw new Error('Encrypted parameter value is missing identity fields');
  }
  if (!Number.isInteger(kekVersion) || kekVersion < 1) {
    throw new Error('Encrypted parameter value is missing a valid KEK version');
  }

  const keyring = getKeyring();
  const kek = keyring.keys.get(kekVersion);
  if (!kek) {
    throw new Error(`No KEK available for version ${kekVersion}`);
  }

  const dek = decryptGcm({
    ciphertext: requireBuffer(readField(record, 'dekCiphertext', 'dek_ciphertext'), 'dekCiphertext'),
    iv: requireBuffer(readField(record, 'dekIv', 'dek_iv'), 'dekIv'),
    tag: requireBuffer(readField(record, 'dekTag', 'dek_tag'), 'dekTag'),
    key: kek,
    aad: dekAad({ parameterValueId, parameterId, environmentId, kekVersion })
  });

  const plaintext = decryptGcm({
    ciphertext: requireBuffer(readField(record, 'valueCiphertext', 'value_ciphertext'), 'valueCiphertext'),
    iv: requireBuffer(readField(record, 'valueIv', 'value_iv'), 'valueIv'),
    tag: requireBuffer(readField(record, 'valueTag', 'value_tag'), 'valueTag'),
    key: dek,
    aad: valueAad({ parameterValueId, parameterId, environmentId })
  });

  return plaintext.toString('utf8');
}

export function decryptParameterValueVersion(record) {
  const parameterValueVersionId = readField(record, 'id');
  const parameterValueId = readField(record, 'parameterValueId', 'parameter_value_id');
  const parameterId = readField(record, 'parameterId', 'parameter_id');
  const environmentId = readField(record, 'environmentId', 'environment_id');
  const kekVersion = readField(record, 'kekVersion', 'kek_version');
  const encryptionAlg = readField(record, 'encryptionAlg', 'encryption_alg') ?? ALG;

  if (encryptionAlg !== ALG) {
    throw new Error(`Unsupported encryption algorithm: ${encryptionAlg}`);
  }
  if (!parameterValueVersionId || !parameterValueId || !parameterId || !environmentId) {
    throw new Error('Encrypted parameter value version is missing identity fields');
  }
  if (!Number.isInteger(kekVersion) || kekVersion < 1) {
    throw new Error('Encrypted parameter value version is missing a valid KEK version');
  }

  const keyring = getKeyring();
  const kek = keyring.keys.get(kekVersion);
  if (!kek) {
    throw new Error(`No KEK available for version ${kekVersion}`);
  }

  const dek = decryptGcm({
    ciphertext: requireBuffer(readField(record, 'dekCiphertext', 'dek_ciphertext'), 'dekCiphertext'),
    iv: requireBuffer(readField(record, 'dekIv', 'dek_iv'), 'dekIv'),
    tag: requireBuffer(readField(record, 'dekTag', 'dek_tag'), 'dekTag'),
    key: kek,
    aad: versionDekAad({ parameterValueVersionId, parameterValueId, parameterId, environmentId, kekVersion })
  });

  const plaintext = decryptGcm({
    ciphertext: requireBuffer(readField(record, 'valueCiphertext', 'value_ciphertext'), 'valueCiphertext'),
    iv: requireBuffer(readField(record, 'valueIv', 'value_iv'), 'valueIv'),
    tag: requireBuffer(readField(record, 'valueTag', 'value_tag'), 'valueTag'),
    key: dek,
    aad: versionValueAad({ parameterValueVersionId, parameterValueId, parameterId, environmentId })
  });

  return plaintext.toString('utf8');
}

export function encryptedParameterValueData({ value, parameterValueId, parameterId, environmentId }) {
  return encryptParameterValue({ value, parameterValueId, parameterId, environmentId });
}

export function encryptedParameterValueVersionData({
  value,
  parameterValueVersionId,
  parameterValueId,
  parameterId,
  environmentId
}) {
  return encryptParameterValueVersion({
    value,
    parameterValueVersionId,
    parameterValueId,
    parameterId,
    environmentId
  });
}
