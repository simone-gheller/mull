export const PARAMETER_VALUE_VERSION_LIMITS = {
  STARTER: 5,
  PRO: 50,
  ENTERPRISE: null
};

export const AUDIT_RETENTION_DAYS = {
  HOBBY: 7,
  STARTER: 30,
  PRO: 90,
  TEAM: 90,
  ENTERPRISE: null,
  GROWTH: null
};

export function getParameterValueVersionLimit(orgPlan = 'STARTER') {
  if (Object.hasOwn(PARAMETER_VALUE_VERSION_LIMITS, orgPlan)) {
    return PARAMETER_VALUE_VERSION_LIMITS[orgPlan];
  }
  return PARAMETER_VALUE_VERSION_LIMITS.STARTER;
}

export function getAuditRetentionDays(orgPlan = 'STARTER') {
  if (Object.hasOwn(AUDIT_RETENTION_DAYS, orgPlan)) {
    return AUDIT_RETENTION_DAYS[orgPlan];
  }
  return AUDIT_RETENTION_DAYS.STARTER;
}

export function getAuditExpiresAt(orgPlan = 'STARTER', now = new Date()) {
  const days = getAuditRetentionDays(orgPlan);
  if (days === null) return null;
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}
