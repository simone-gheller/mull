export const PARAMETER_VALUE_VERSION_LIMITS = {
  FREE: 5,
  TEAM: 50,
  BUSINESS: 250,
  ENTERPRISE: null
};

export const AUDIT_RETENTION_DAYS = {
  FREE: 7,
  TEAM: 90,
  BUSINESS: 365,
  ENTERPRISE: null,
};

export const PLAN_LIMITS = {
  FREE: {
    members: 3,
    apps: 3,
    environments: 5,
    parameterValues: 100,
    serviceTokens: 5,
    auditRetentionDays: 7,
    parameterValueVersions: 5,
    customRoles: false
  },
  TEAM: {
    members: 5,
    extraMemberPriceUsd: 8,
    apps: 25,
    environments: null,
    parameterValues: 2500,
    serviceTokens: 50,
    auditRetentionDays: 90,
    parameterValueVersions: 50,
    customRoles: true
  },
  BUSINESS: {
    members: 15,
    extraMemberPriceUsd: 6,
    apps: 100,
    environments: null,
    parameterValues: 25000,
    serviceTokens: 250,
    auditRetentionDays: 365,
    parameterValueVersions: 250,
    customRoles: true
  },
  ENTERPRISE: {
    members: null,
    apps: null,
    environments: null,
    parameterValues: null,
    serviceTokens: null,
    auditRetentionDays: null,
    parameterValueVersions: null,
    customRoles: true
  }
};

export function normalizePlan(orgPlan = 'FREE') {
  if (Object.hasOwn(PLAN_LIMITS, orgPlan)) return orgPlan;
  return 'FREE';
}

export function getPlanLimits(orgPlan = 'FREE') {
  return PLAN_LIMITS[normalizePlan(orgPlan)];
}

export function getParameterValueVersionLimit(orgPlan = 'FREE') {
  orgPlan = normalizePlan(orgPlan);
  if (Object.hasOwn(PARAMETER_VALUE_VERSION_LIMITS, orgPlan)) {
    return PARAMETER_VALUE_VERSION_LIMITS[orgPlan];
  }
  return PARAMETER_VALUE_VERSION_LIMITS.FREE;
}

export function getAuditRetentionDays(orgPlan = 'FREE') {
  orgPlan = normalizePlan(orgPlan);
  if (Object.hasOwn(AUDIT_RETENTION_DAYS, orgPlan)) {
    return AUDIT_RETENTION_DAYS[orgPlan];
  }
  return AUDIT_RETENTION_DAYS.FREE;
}

export function getAuditExpiresAt(orgPlan = 'FREE', now = new Date()) {
  const days = getAuditRetentionDays(orgPlan);
  if (days === null) return null;
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}
