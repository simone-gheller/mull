export const SCOPES = [
  'org:read',
  'org:update',
  'org:delete',
  'billing:manage',
  'members:read',
  'members:manage',
  'roles:read',
  'roles:manage',
  'audit:read',
  'apps:read',
  'apps:manage',
  'environments:read',
  'environments:manage',
  'parameters:read',
  'parameters:write',
  'parameters:delete',
  'config:read',
  'config:reveal',
  'config:write',
  'access_keys:read',
  'access_keys:manage'
];

export const SYSTEM_ROLE_KEYS = ['OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER'];
export const ROLE_ORDER = ['VIEWER', 'DEVELOPER', 'ADMIN', 'OWNER'];

const allScopes = SCOPES.map(scope => ({ scope }));

const nonProtectedConfigConditions = {
  environmentProtected: false,
  environmentTiers: ['DEVELOPMENT', 'STAGING', 'CUSTOM']
};

export const SYSTEM_ROLES = {
  OWNER: {
    key: 'OWNER',
    name: 'Owner',
    description: 'Full organization ownership, including billing and deletion.',
    permissions: allScopes
  },
  ADMIN: {
    key: 'ADMIN',
    name: 'Admin',
    description: 'Operational administration without billing or organization deletion.',
    permissions: [
      'org:read',
      'org:update',
      'members:read',
      'members:manage',
      'roles:read',
      'roles:manage',
      'audit:read',
      'apps:read',
      'apps:manage',
      'environments:read',
      'environments:manage',
      'parameters:read',
      'parameters:write',
      'parameters:delete',
      'config:read',
      'config:reveal',
      'config:write',
      'access_keys:read',
      'access_keys:manage'
    ].map(scope => ({ scope }))
  },
  DEVELOPER: {
    key: 'DEVELOPER',
    name: 'Developer',
    description: 'Can work with app config, but cannot reveal or write protected environments.',
    permissions: [
      { scope: 'org:read' },
      { scope: 'apps:read' },
      { scope: 'environments:read' },
      { scope: 'parameters:read' },
      { scope: 'parameters:write' },
      { scope: 'config:read' },
      { scope: 'config:reveal', conditions: nonProtectedConfigConditions },
      { scope: 'config:write', conditions: nonProtectedConfigConditions }
    ]
  },
  VIEWER: {
    key: 'VIEWER',
    name: 'Viewer',
    description: 'Read-only access to metadata and non-protected config values.',
    permissions: [
      { scope: 'org:read' },
      { scope: 'apps:read' },
      { scope: 'environments:read' },
      { scope: 'parameters:read' },
      { scope: 'config:read' },
      { scope: 'config:reveal', conditions: nonProtectedConfigConditions }
    ]
  }
};

export function normalizePermissions(permissions) {
  if (!Array.isArray(permissions)) return [];
  return permissions
    .filter(permission => permission && typeof permission.scope === 'string')
    .map(permission => ({
      scope: permission.scope,
      ...(permission.conditions && typeof permission.conditions === 'object'
        ? { conditions: permission.conditions }
        : {})
    }));
}

export function validatePermissions(permissions) {
  const normalized = normalizePermissions(permissions);
  if (normalized.length !== permissions?.length) {
    throw new Error('Invalid permission shape');
  }
  const invalid = normalized.find(permission => !SCOPES.includes(permission.scope));
  if (invalid) throw new Error(`Invalid scope: ${invalid.scope}`);
  return normalized;
}

export function roleToAuthFields(role) {
  if (!role) {
    return {
      roleId: null,
      roleKey: null,
      roleName: null,
      permissions: []
    };
  }
  return {
    roleId: role.id,
    roleKey: role.key,
    roleName: role.name,
    permissions: normalizePermissions(role.permissions)
  };
}

export function permissionMatchesContext(permission, context = {}) {
  const conditions = permission.conditions;
  if (!conditions) return true;

  if (
    conditions.environmentProtected !== undefined &&
    context.environmentProtected !== conditions.environmentProtected
  ) {
    return false;
  }

  if (
    Array.isArray(conditions.environmentTiers) &&
    conditions.environmentTiers.length > 0 &&
    !conditions.environmentTiers.includes(context.environmentTier)
  ) {
    return false;
  }

  if (
    Array.isArray(conditions.environmentIds) &&
    conditions.environmentIds.length > 0 &&
    !conditions.environmentIds.includes(context.environmentId)
  ) {
    return false;
  }

  return true;
}

export function hasPermission(auth, scope, context = {}) {
  if (!auth) return false;
  if (auth.scopes?.includes('*')) return true;

  if (auth.credentialType === 'ACCESS_KEY') {
    return auth.scopes?.includes(scope) ?? false;
  }

  return normalizePermissions(auth.permissions).some(permission =>
    permission.scope === scope && permissionMatchesContext(permission, context)
  );
}

export function canRevealConfig(request, { environment } = {}) {
  return hasConfigPermission(request.auth, 'config:reveal', environmentToContext(environment));
}

export function canWriteConfig(request, { environment } = {}) {
  return hasConfigPermission(request.auth, 'config:write', environmentToContext(environment));
}

export function canManageRole(request) {
  return hasPermission(request.auth, 'roles:manage');
}

export function environmentToContext(environment) {
  if (!environment) return {};
  return {
    environmentId: environment.id,
    environmentTier: environment.tier,
    environmentProtected: environment.protected
  };
}

export function isPaidPlan(plan) {
  return plan === 'TEAM' || plan === 'BUSINESS' || plan === 'ENTERPRISE';
}

export function roleAtLeast(roleKey, minimumRoleKey) {
  const roleIndex = ROLE_ORDER.indexOf(roleKey);
  const minimumIndex = ROLE_ORDER.indexOf(minimumRoleKey);
  return roleIndex !== -1 && minimumIndex !== -1 && roleIndex >= minimumIndex;
}

function hasConfigPermission(auth, scope, context) {
  if (auth?.credentialType === 'ACCESS_KEY' && auth.identityType === 'USER') {
    const roleAuth = { ...auth, credentialType: 'SUPABASE_JWT', scopes: [] };
    return (auth.scopes?.includes('*') || auth.scopes?.includes(scope)) && hasPermission(roleAuth, scope, context);
  }
  return hasPermission(auth, scope, context);
}
