export const PARAMETER_VALUE_VERSION_LIMITS = {
  STARTER: 5,
  PRO: 50,
  ENTERPRISE: null
};

export function getParameterValueVersionLimit(orgPlan = 'STARTER') {
  if (Object.hasOwn(PARAMETER_VALUE_VERSION_LIMITS, orgPlan)) {
    return PARAMETER_VALUE_VERSION_LIMITS[orgPlan];
  }
  return PARAMETER_VALUE_VERSION_LIMITS.STARTER;
}
