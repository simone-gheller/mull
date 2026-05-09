-- Add encrypted parameter value storage while keeping plaintext value for migration/backfill.
ALTER TABLE "parameter_values"
  ALTER COLUMN "value" DROP NOT NULL,
  ADD COLUMN "value_ciphertext" BYTEA,
  ADD COLUMN "value_iv" BYTEA,
  ADD COLUMN "value_tag" BYTEA,
  ADD COLUMN "dek_ciphertext" BYTEA,
  ADD COLUMN "dek_iv" BYTEA,
  ADD COLUMN "dek_tag" BYTEA,
  ADD COLUMN "kek_version" INTEGER,
  ADD COLUMN "encryption_alg" TEXT DEFAULT 'AES-256-GCM',
  ADD COLUMN "encrypted_at" TIMESTAMP(3);

-- Keep inheritance resolution in PostgreSQL, but return encrypted fields.
DROP VIEW IF EXISTS config_inheritance;

CREATE VIEW config_inheritance AS
WITH app_hierarchy_expanded AS (
  SELECT
    a.id as app_id,
    a.org_id,
    unnest(a.ancestors || a.id) as ancestor_app_id,
    generate_subscripts(a.ancestors || a.id, 1) as priority
  FROM apps a
)
SELECT DISTINCT ON (ahe.app_id, ahe.org_id, pv.environment_id, p.key)
  ahe.app_id,
  ahe.org_id,
  pv.environment_id,
  p.id as parameter_id,
  pv.id as parameter_value_id,
  p.key,
  pv.value_ciphertext,
  pv.value_iv,
  pv.value_tag,
  pv.dek_ciphertext,
  pv.dek_iv,
  pv.dek_tag,
  pv.kek_version,
  pv.encryption_alg,
  ahe.priority,
  a.name as source_app_name,
  a.id as source_app_id
FROM app_hierarchy_expanded ahe
JOIN parameters p ON p.app_id = ahe.ancestor_app_id
JOIN parameter_values pv ON pv.parameter_id = p.id
JOIN apps a ON a.id = ahe.ancestor_app_id
ORDER BY ahe.app_id, ahe.org_id, pv.environment_id, p.key, ahe.priority DESC;
