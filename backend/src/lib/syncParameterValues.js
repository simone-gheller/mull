import { getPrisma } from './prisma.js';

/**
 * Sync ParameterValues for a newly created Environment
 * Creates empty ParameterValue entries for all existing parameters in the organization
 *
 * @param {string|BigInt} environmentId - Environment ID
 * @param {string|BigInt} orgId - Organization ID
 * @returns {Promise<number>} Number of ParameterValues created
 */
export async function syncEnvironmentParameterValues(environmentId, orgId) {
  const prisma = getPrisma();
  const envIdBigInt = BigInt(environmentId);
  const orgIdBigInt = BigInt(orgId);

  // Get all parameters for all apps in this organization
  const parameters = await prisma.parameter.findMany({
    where: {
      app: {
        orgId: orgIdBigInt
      }
    },
    select: { id: true }
  });

  // If no parameters exist, nothing to sync
  if (parameters.length === 0) {
    return 0;
  }

  // Create ParameterValue for each parameter with empty string
  await prisma.parameterValue.createMany({
    data: parameters.map(param => ({
      parameterId: param.id,
      environmentId: envIdBigInt,
      value: ''
    })),
    skipDuplicates: true // In case some values already exist
  });

  return parameters.length;
}

/**
 * Sync ParameterValues for a newly created Parameter
 * Creates empty ParameterValue entries for all existing environments in the organization
 *
 * @param {string|BigInt} parameterId - Parameter ID
 * @param {string|BigInt} orgId - Organization ID
 * @returns {Promise<number>} Number of ParameterValues created
 */
export async function syncParameterEnvironmentValues(parameterId, orgId) {
  const prisma = getPrisma();
  const paramIdBigInt = BigInt(parameterId);
  const orgIdBigInt = BigInt(orgId);

  // Get all environments for this organization
  const environments = await prisma.environment.findMany({
    where: { orgId: orgIdBigInt },
    select: { id: true }
  });

  // If no environments exist, nothing to sync
  if (environments.length === 0) {
    return 0;
  }

  // Create ParameterValue for each environment with empty string
  await prisma.parameterValue.createMany({
    data: environments.map(env => ({
      parameterId: paramIdBigInt,
      environmentId: env.id,
      value: ''
    })),
    skipDuplicates: true // In case some values already exist
  });

  return environments.length;
}
