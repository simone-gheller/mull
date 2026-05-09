ALTER TABLE "parameter_values"
  ADD COLUMN "is_set" BOOLEAN NOT NULL DEFAULT false;

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
  pv.is_set,
  ahe.priority,
  a.name as source_app_name,
  a.id as source_app_id
FROM app_hierarchy_expanded ahe
JOIN parameters p ON p.app_id = ahe.ancestor_app_id
JOIN parameter_values pv ON pv.parameter_id = p.id
JOIN apps a ON a.id = ahe.ancestor_app_id
WHERE pv.is_set = true
ORDER BY ahe.app_id, ahe.org_id, pv.environment_id, p.key, ahe.priority DESC;
