-- Finalize parameter value encryption.
-- This migration assumes backfill has populated encrypted fields for every row.
ALTER TABLE "parameter_values"
  ALTER COLUMN "value_ciphertext" SET NOT NULL,
  ALTER COLUMN "value_iv" SET NOT NULL,
  ALTER COLUMN "value_tag" SET NOT NULL,
  ALTER COLUMN "dek_ciphertext" SET NOT NULL,
  ALTER COLUMN "dek_iv" SET NOT NULL,
  ALTER COLUMN "dek_tag" SET NOT NULL,
  ALTER COLUMN "kek_version" SET NOT NULL,
  ALTER COLUMN "encryption_alg" SET NOT NULL,
  ALTER COLUMN "encrypted_at" SET NOT NULL,
  DROP COLUMN "value";
