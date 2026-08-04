// Kept in sync with backend/src/lib/rbac.js SYSTEM_ROLES / SCOPES.
export const SYSTEM_ROLES = [
  ['OWNER', 'Full organization ownership, including billing and deletion.'],
  ['ADMIN', 'Operational administration without billing or organization deletion.'],
  ['DEVELOPER', 'Can work with app config, but cannot reveal or write protected environments.'],
  ['VIEWER', 'Read-only access to metadata and non-protected config values.'],
];

export const ROLE_SCOPES = [
  ['org:read', 'View organization details.'],
  ['org:update / org:delete', 'Update org settings, or delete the organization (Owner only).'],
  ['billing:manage', 'Manage billing and plan (Owner only).'],
  ['members:read / members:manage', 'View or manage organization members.'],
  ['roles:read / roles:manage', 'View or manage custom roles.'],
  ['audit:read', 'Read audit log events.'],
  ['apps:read / apps:manage', 'View or manage apps.'],
  ['environments:read / environments:manage', 'View or manage environments.'],
  ['parameters:read / parameters:write / parameters:delete', 'View, write, or delete parameter definitions.'],
  ['config:read / config:reveal / config:write', 'Read resolved config, reveal plaintext, or write values — reveal/write can be conditioned on environment protection tier.'],
  ['access_keys:read / access_keys:manage', 'View or manage personal and organization access keys.'],
];
