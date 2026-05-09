# Envelope Encryption Implementation Plan

Date: 2026-05-09

## Goal

Implement server-side envelope encryption for parameter values.

The immediate security goal is that a database dump must not contain plaintext configuration values. The backend remains trusted and is allowed to decrypt values after authentication and authorization.

This is encryption at rest, not end-to-end encryption.

Implementation status: completed locally. The plaintext `parameter_values.value` column has been dropped after backfill, and encrypted fields are now non-null.

## Non-Goals For V1

1. No client-side encryption.
2. No per-user keys.
3. No HSM/KMS-only implementation in the first pass.
4. No searchable encrypted values.
5. No deterministic encryption.
6. No plaintext checksum or plaintext hash.

## Design Decisions

1. Use envelope encryption.
   - Each parameter value gets a random DEK.
   - The value is encrypted with the DEK.
   - The DEK is encrypted/wrapped with the active KEK.

2. Use `AES-256-GCM`.
   - Value encryption stores ciphertext, IV, and auth tag.
   - DEK wrapping also stores ciphertext, IV, and auth tag.

3. Keep inheritance resolution in PostgreSQL.
   - The `config_inheritance` view remains responsible for resolving the winning parameter value.
   - The view must stop returning plaintext `value`.
   - The view returns encrypted fields for the already-resolved winning rows.

4. Decrypt only in the backend.
   - PostgreSQL performs joins, ranking, and filtering.
   - Node decrypts the final resolved rows in memory.
   - Avoid N query inheritance resolution in Node.

5. Use Additional Authenticated Data.
   - AAD binds ciphertext to its row context.
   - Suggested value AAD:
     `parameter_value:v1:{parameterValueId}:{parameterId}:{environmentId}`
   - Suggested DEK AAD:
     `parameter_value_dek:v1:{parameterValueId}:{parameterId}:{environmentId}:kek:{kekVersion}`

6. V1 key source is environment/secret-manager compatible.
   - Local development can use `.env`.
   - Production should use a provider secret manager or encrypted deployment secret.
   - Code should expose a small keyring abstraction so KMS can replace env-backed keys later.

## Key Management

### Local Development

Generate a 32-byte key:

```bash
openssl rand -hex 32
```

Store locally:

```env
MASTER_KEY_HEX=<64 hex chars>
KEK_VERSION=1
```

Never commit the key.

### Production V1

Use one of:

1. Cloud provider encrypted env/secrets.
2. AWS Secrets Manager / SSM Parameter Store.
3. GCP Secret Manager.
4. Doppler or 1Password Secrets Automation.

The app can receive `MASTER_KEY_HEX` at boot for V1, but the crypto module should treat it as a keyring entry, not as a global singleton assumption.

### Future KMS Design

Later options:

1. Use KMS to decrypt/cache a KEK at boot.
2. Use KMS to wrap/unwrap DEKs directly, with cache to avoid one remote KMS call per value.

## Schema Plan

Add encrypted columns to `ParameterValue`.

Temporary migration state:

```prisma
model ParameterValue {
  id            String @id @db.Uuid
  parameterId   String @map("parameter_id") @db.Uuid
  environmentId String @map("environment_id") @db.Uuid

  // Temporary during migration only.
  value String? @db.Text

  valueCiphertext Bytes? @map("value_ciphertext")
  valueIv         Bytes? @map("value_iv")
  valueTag        Bytes? @map("value_tag")

  dekCiphertext Bytes? @map("dek_ciphertext")
  dekIv         Bytes? @map("dek_iv")
  dekTag        Bytes? @map("dek_tag")

  kekVersion    Int?      @map("kek_version")
  encryptionAlg String?   @map("encryption_alg")
  encryptedAt   DateTime? @map("encrypted_at")
}
```

Final state after backfill and verification:

```prisma
model ParameterValue {
  id            String @id @db.Uuid
  parameterId   String @map("parameter_id") @db.Uuid
  environmentId String @map("environment_id") @db.Uuid

  valueCiphertext Bytes @map("value_ciphertext")
  valueIv         Bytes @map("value_iv")
  valueTag        Bytes @map("value_tag")

  dekCiphertext Bytes @map("dek_ciphertext")
  dekIv         Bytes @map("dek_iv")
  dekTag        Bytes @map("dek_tag")

  kekVersion    Int      @map("kek_version")
  encryptionAlg String   @default("AES-256-GCM") @map("encryption_alg")
  encryptedAt   DateTime @map("encrypted_at")
}
```

## View Plan

Keep `config_inheritance`, but update its selected columns.

Current behavior:

```sql
SELECT key, value, priority, source_app_name, source_app_id
```

Target behavior:

```sql
SELECT
  key,
  priority,
  source_app_name,
  source_app_id,
  parameter_value_id,
  parameter_id,
  environment_id,
  value_ciphertext,
  value_iv,
  value_tag,
  dek_ciphertext,
  dek_iv,
  dek_tag,
  kek_version,
  encryption_alg
```

The view must still return one winning row per resolved parameter key for `{orgId, appId, envId}`.

## Implementation Phases

### Phase 1: Crypto Module

Create `backend/src/crypto/envelope.js`.

Functions:

1. `getKeyring()`
2. `encryptParameterValue({ value, parameterValueId, parameterId, environmentId })`
3. `decryptParameterValue(record)`
4. `wrapDek({ dek, kekVersion, aad })`
5. `unwrapDek(record)`
6. `assertEncryptedRecord(record)`

Requirements:

1. Validate `MASTER_KEY_HEX` is exactly 32 bytes.
2. Validate `KEK_VERSION` is a positive integer.
3. Use `crypto.randomBytes(12)` for GCM IVs.
4. Use a fresh DEK per encryption.
5. Never log plaintext, DEKs, KEKs, ciphertext, IVs, or tags.

### Phase 2: Schema Migration

1. Add nullable encrypted columns.
2. Keep existing plaintext `value`.
3. Regenerate Prisma client.
4. Do not switch application reads yet.

### Phase 3: Backfill Script

Create a backend script, for example:

```txt
backend/scripts/backfill-parameter-value-encryption.js
```

Status: completed and removed after the final migration. Recreate only if another legacy plaintext environment needs a one-off migration.

Behavior:

1. Find rows where encrypted columns are null.
2. Encrypt current `value ?? ''`.
3. Write encrypted columns.
4. Process in batches.
5. Be idempotent.
6. Print counts only, no values.

### Phase 4: Switch Writes

Update all write paths to write encrypted values:

1. `PUT /orgs/:orgId/parameters/values/:id`
2. `syncParameterEnvironmentValues`
3. `syncEnvironmentParameterValues`
4. seed data
5. any override creation path that creates parameter values

During this phase, writes may optionally keep plaintext `value` for rollback until read switch is verified.

### Phase 5: Switch Reads

Update read paths:

1. `GET /parameters/:appId/values`
2. `GET /parameters/values/:id`
3. `POST /parameters/override` response values
4. any frontend-facing path expecting `value`

Rules:

1. Check authorization before decrypting.
2. If caller cannot read the value, return `null` or masked response without decrypting.
3. Preserve current response shape where possible.

### Phase 6: Update Config View And Rendering

1. Update `config_inheritance` view to return encrypted fields for winning rows.
2. Update `GET /config/:appId/:envId`.
3. Query the view once.
4. Decrypt each returned row in Node.
5. Return the flat config object.

Important:

Do not move inheritance resolution into Node unless profiling later proves the view is a bottleneck.

### Phase 7: Remove Plaintext Column

Only after:

1. Backfill has completed.
2. Reads use encrypted fields.
3. Writes use encrypted fields.
4. Tests pass.
5. Manual smoke test verifies config rendering.

Then:

1. Drop `value`.
2. Make encrypted columns non-null.
3. Keep `kekVersion`, `encryptionAlg`, `encryptedAt`.

## Tests

### Unit Tests

Crypto:

1. Encrypt/decrypt roundtrip.
2. Empty string roundtrip.
3. Unicode value roundtrip.
4. Tampered ciphertext fails.
5. Tampered value tag fails.
6. Tampered DEK ciphertext fails.
7. Wrong AAD fails.
8. Missing KEK version fails clearly.
9. Wrong master key fails.

### Integration Tests

Parameter values:

1. `PUT` stores no plaintext in DB.
2. `GET` returns plaintext only for authorized callers.
3. `USER` cannot read secret values.
4. `ADMIN` can read secret values.
5. Non-secret value behavior remains backward compatible.

Config rendering:

1. `/config/:appId/:envId` returns inherited config correctly.
2. Child override wins over parent.
3. Empty local override behavior is explicit and tested.
4. Cross-org access remains forbidden.
5. DB rows do not contain plaintext after config updates.

Migration:

1. Backfill encrypts legacy rows.
2. Backfill is idempotent.
3. Mixed old/new rows can be read during transition if needed.

## Rollout Plan

1. Land crypto module and tests.
2. Land schema migration with nullable encrypted columns.
3. Run migration locally.
4. Run backfill locally.
5. Switch writes.
6. Switch reads.
7. Update config view and config route.
8. Verify frontend flows.
9. Drop plaintext column in a second migration.

## Operational Notes

1. Back up database before production backfill.
2. Keep old KEKs available forever, or until every row has been rewrapped.
3. Never rotate by deleting the old key first.
4. Add metrics later:
   - decrypt failures
   - rows missing encryption metadata
   - config render latency
   - config rows decrypted per request

## Open Questions

1. Resolved: empty string means the value is intentionally empty.
2. Resolved: `USER` can update and edit non-secret parameter values.
3. Deferred: `/config` service-token auth is not part of this encryption feature.
4. Deferred: audit/release sequencing is out of scope for this implementation pass.
5. Resolved for now: local development uses `.env` keys. Production key management remains a later operational decision.
