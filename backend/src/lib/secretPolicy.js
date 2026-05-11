export const ROLE_ORDER = ['USER', 'ADMIN', 'OWNER'];

export function roleAtLeast(role, minimumRole) {
  const roleIndex = ROLE_ORDER.indexOf(role);
  const minimumIndex = ROLE_ORDER.indexOf(minimumRole);
  return roleIndex !== -1 && minimumIndex !== -1 && roleIndex >= minimumIndex;
}

export function canReadSecret(role) {
  return roleAtLeast(role, 'ADMIN');
}

export function canWriteConfig(role) {
  return roleAtLeast(role, 'ADMIN');
}

export function isSecretValue({ parameter, environment } = {}) {
  return Boolean(parameter?.isSecret || environment?.isSecret);
}

export function canReadParameterValue(role, parameterValue) {
  return !isSecretValue(parameterValue) || canReadSecret(role);
}

export function canWriteParameterValue(role, parameterValue) {
  return canWriteConfig(role) && canReadParameterValue(role, parameterValue);
}

export function describeValueAccess(role, parameterValue) {
  const secret = isSecretValue(parameterValue);
  const canRead = canReadParameterValue(role, parameterValue);
  return {
    isSecret: secret,
    canRead,
    canWrite: canWriteParameterValue(role, parameterValue),
    stateWhenSet: canRead ? 'set' : 'redacted'
  };
}

export function secretForbiddenResponse() {
  return {
    error: 'Forbidden',
    message: 'Requires ADMIN or higher',
    statusCode: 403
  };
}
