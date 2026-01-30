-- CreateView: config_inheritance
-- Resolves configuration parameters with hierarchical inheritance
-- Child parameter values override parent values based on priority (higher = more specific)

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
  p.key,
  pv.value,
  ahe.priority,
  a.name as source_app_name,
  a.id as source_app_id
FROM app_hierarchy_expanded ahe
JOIN parameters p ON p.app_id = ahe.ancestor_app_id
JOIN parameter_values pv ON pv.parameter_id = p.id
JOIN apps a ON a.id = ahe.ancestor_app_id
ORDER BY ahe.app_id, ahe.org_id, pv.environment_id, p.key, ahe.priority DESC;