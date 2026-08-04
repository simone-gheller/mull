// Kept in sync with ACCESS_KEY_SCOPES in backend/src/lib/accessKeys.js.
export const TOKEN_SCOPES = [
  ['config:read', 'Read resolved config responses.'],
  ['config:reveal', 'Reveal plaintext values when allowed.'],
  ['config:write', 'Write config values.'],
  ['parameters:read', 'List parameter metadata.'],
  ['parameters:write', 'Create or update parameter values.'],
  ['parameters:delete', 'Delete parameter definitions.'],
  ['apps:read', 'List apps.'],
  ['apps:manage', 'Create, update, and delete apps.'],
  ['environments:read', 'List environments.'],
  ['environments:manage', 'Create, update, and delete environments.'],
];

export const TOKEN_FORMATS = [
  ['vextis_pat_<keyId>_<secret>', 'Personal access token — created and owned by a user.'],
  ['vextis_st_<keyId>_<secret>', 'Organization service token — scoped credential for CI/CD and automation.'],
];
