// Pure helpers for rendering the bundled OpenAPI spec (src/content/openapi.json) — no $ref
// resolution needed, @fastify/swagger inlines every schema for this API.

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'];

// One group per declared tag, in spec order, each with its matching operations — mirrors the
// grouping the backend already encodes via each route's `tags:`.
export function groupOperations(spec) {
  const byTag = new Map((spec.tags ?? []).map(t => [t.name, { tag: t.name, description: t.description, operations: [] }]));

  for (const [path, methods] of Object.entries(spec.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const operation = methods[method];
      if (!operation) continue;
      for (const tag of operation.tags ?? []) {
        const group = byTag.get(tag);
        if (group) group.operations.push({ method, path, ...operation });
      }
    }
  }

  return [...byTag.values()].filter(g => g.operations.length > 0);
}

export function getOperation(spec, method, path) {
  return spec.paths?.[path]?.[method.toLowerCase()];
}

export function operationKey(method, path) {
  return `${method.toUpperCase()} ${path}`;
}

// Short, figurative names ("List apps", "Get app") for the sidebar — only 13 of 58 operations
// have a hand-written `summary` in the spec, and those vary in style, so every operation gets a
// curated label here instead of relying on that field. Keyed by operationKey().
const OPERATION_LABELS = {
  'POST /auth/login-discovery': 'Check SSO for email',
  'GET /auth/me': 'Get current user',
  'PATCH /auth/me': 'Update current user',
  'GET /auth/whoami': 'Whoami',
  'POST /orgs': 'Create organization',
  'POST /auth/admin/example': 'Admin example',
  'GET /invites/{token}': 'Preview invite',
  'POST /invites/accept': 'Accept invite',
  'GET /auth/access-keys': 'List personal tokens',
  'POST /auth/access-keys': 'Create personal token',
  'DELETE /auth/access-keys/{keyId}': 'Revoke personal token',
  'GET /orgs/{orgId}/access-keys': 'List service tokens',
  'POST /orgs/{orgId}/access-keys': 'Create service token',
  'DELETE /orgs/{orgId}/access-keys/{keyId}': 'Revoke service token',
  'GET /orgs/{orgId}/billing': 'Get billing',
  'POST /orgs/{orgId}/billing/checkout': 'Start checkout',
  'POST /orgs/{orgId}/billing/portal': 'Open billing portal',
  'POST /webhooks/paddle': 'Paddle webhook',
  'GET /cli/device-code/{id}': 'Get device code',
  'POST /cli/device-code': 'Start device login',
  'GET /cli/device-code/{id}/status': 'Poll device code',
  'POST /cli/device-code/{id}/approve': 'Approve device login',
  'GET /orgs/{orgId}/config/{appId}/{envId}': 'Get rendered config',
  'GET /orgs/{orgId}/environments': 'List environments',
  'POST /orgs/{orgId}/environments': 'Create environment',
  'PATCH /orgs/{orgId}/environments/{envId}': 'Rename environment',
  'DELETE /orgs/{orgId}/environments/{envId}': 'Delete environment',
  'GET /orgs/{orgId}/apps': 'List apps',
  'POST /orgs/{orgId}/apps': 'Create app',
  'GET /orgs/{orgId}/apps/{appId}': 'Get app',
  'PATCH /orgs/{orgId}/apps/{appId}': 'Rename app',
  'DELETE /orgs/{orgId}/apps/{appId}': 'Delete app',
  'GET /orgs/{orgId}/parameters/resolved': 'Resolve parameters',
  'POST /orgs/{orgId}/parameters/override': 'Create override',
  'GET /orgs/{orgId}/parameters': 'List parameters',
  'POST /orgs/{orgId}/parameters': 'Create parameter',
  'POST /orgs/{orgId}/exports/parameters': 'Export parameters',
  'GET /orgs/{orgId}/parameters/{appId}/values': 'List parameter values',
  'GET /orgs/{orgId}/parameters/values/{id}/history': 'Get value history',
  'GET /orgs/{orgId}/parameters/values/{id}/history/{versionId}': 'Get value version',
  'POST /orgs/{orgId}/parameters/values/{id}/rollback': 'Roll back value',
  'GET /orgs/{orgId}/parameters/values/{id}': 'Get parameter value',
  'PUT /orgs/{orgId}/parameters/values/{id}': 'Update parameter value',
  'GET /orgs/{orgId}': 'Get organization',
  'PATCH /orgs/{orgId}': 'Update organization',
  'GET /orgs/{orgId}/sso': 'Get SSO config',
  'PATCH /orgs/{orgId}/sso': 'Update SSO config',
  'GET /orgs/{orgId}/members': 'List members',
  'GET /orgs/{orgId}/roles': 'List roles',
  'POST /orgs/{orgId}/roles': 'Create role',
  'PATCH /orgs/{orgId}/roles/{roleId}': 'Update role',
  'DELETE /orgs/{orgId}/roles/{roleId}': 'Delete role',
  'PATCH /orgs/{orgId}/members/{userId}': 'Update member',
  'DELETE /orgs/{orgId}/members/{userId}': 'Remove member',
  'GET /orgs/{orgId}/invites': 'List invites',
  'POST /orgs/{orgId}/invites': 'Create invite',
  'DELETE /orgs/{orgId}/invites/{inviteId}': 'Revoke invite',
  'GET /orgs/{orgId}/audit-events': 'List audit events',
};

// Fallback for any operation not in OPERATION_LABELS (e.g. a route added after this map was
// written) — mechanical but reasonable: verb from the method + the last static path segment.
function fallbackLabel(method, path) {
  const segments = path.split('/').filter(Boolean).filter(s => !s.startsWith('{'));
  const noun = segments[segments.length - 1]?.replace(/-/g, ' ') ?? 'resource';
  const verb = { get: 'Get', post: 'Create', put: 'Update', patch: 'Update', delete: 'Delete' }[method.toLowerCase()] ?? method;
  return `${verb} ${noun}`;
}

export function operationLabel(method, path) {
  return OPERATION_LABELS[operationKey(method, path)] ?? fallbackLabel(method, path);
}

// Flattens a JSON-schema object's top-level properties into rows for a display table.
export function schemaProperties(schema) {
  if (!schema || schema.type !== 'object' || !schema.properties) return [];
  const required = new Set(schema.required ?? []);
  return Object.entries(schema.properties).map(([name, propSchema]) => ({
    name,
    type: describeType(propSchema),
    required: required.has(name),
    description: propSchema.description ?? '',
  }));
}

function describeType(schema) {
  if (!schema) return 'any';
  if (schema.enum) return schema.enum.map(v => JSON.stringify(v)).join(' | ');
  if (schema.type === 'array') return `${describeType(schema.items)}[]`;
  if (Array.isArray(schema.type)) return schema.type.join(' | ');
  return schema.format ? `${schema.type} (${schema.format})` : (schema.type ?? 'any');
}

// Builds a plausible example value from a JSON schema — clearly a generated placeholder
// (recognizable format-based stand-ins), not a claim about real data.
export function exampleFromSchema(schema, depth = 0) {
  if (!schema || depth > 4) return null;
  if (schema.example !== undefined) return schema.example;
  if (schema.enum?.length) return schema.enum[0];

  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  switch (type) {
    case 'object': {
      if (!schema.properties) return {};
      const out = {};
      for (const [name, propSchema] of Object.entries(schema.properties)) {
        out[name] = exampleFromSchema(propSchema, depth + 1);
      }
      return out;
    }
    case 'array':
      return [exampleFromSchema(schema.items, depth + 1)];
    case 'boolean':
      return true;
    case 'integer':
    case 'number':
      return 0;
    case 'string':
      if (schema.format === 'uuid') return '018f2c3a-7b1e-7c3d-9a2e-4f5b6c7d8e9f';
      if (schema.format === 'email') return 'user@example.com';
      if (schema.format === 'date-time') return '2026-01-01T00:00:00.000Z';
      return schema.pattern ? '...' : 'string';
    default:
      return null;
  }
}

// Converts an operation's `parameters` array (path/query entries) into SchemaTable rows.
export function parameterRows(parameters, location) {
  return (parameters ?? [])
    .filter(p => p.in === location)
    .map(p => ({
      name: p.name,
      type: describeType(p.schema),
      required: !!p.required,
      description: p.description ?? '',
    }));
}

// Response body schema for the first documented "successful-looking" status code, if any.
export function primaryResponseSchema(operation) {
  const codes = Object.keys(operation.responses ?? {}).sort();
  const code = codes.find(c => c.startsWith('2')) ?? codes[0];
  const schema = operation.responses?.[code]?.content?.['application/json']?.schema;
  return { code, schema };
}

export function buildCurl({ serverUrl, method, path, operation }) {
  const pathParams = (operation.parameters ?? []).filter(p => p.in === 'path');
  const queryParams = (operation.parameters ?? []).filter(p => p.in === 'query');

  let resolvedPath = path;
  for (const param of pathParams) {
    resolvedPath = resolvedPath.replace(`{${param.name}}`, `<${param.name}>`);
  }
  const query = queryParams.length
    ? '?' + queryParams.map(p => `${p.name}=<${p.name}>`).join('&')
    : '';

  const lines = [`curl -X ${method.toUpperCase()} ${serverUrl}${resolvedPath}${query} \\`];
  lines.push(`  -H "Authorization: Bearer $VEXTIS_TOKEN"`);

  const bodySchema = operation.requestBody?.content?.['application/json']?.schema;
  if (bodySchema) {
    lines[lines.length - 1] += ' \\';
    lines.push(`  -H "Content-Type: application/json" \\`);
    lines.push(`  -d '${JSON.stringify(exampleFromSchema(bodySchema), null, 2)}'`);
  }

  return lines.join('\n');
}
