import { uuidv7 } from 'uuidv7';
import { getPrisma } from './prisma.js';

/**
 * Sync ParameterValues for a newly created Environment
 * Creates empty ParameterValue entries for all existing parameters in the organization
 *
 * @param {string} environmentId - Environment UUID
 * @param {string} orgId - Organization UUID
 * @returns {Promise<number>} Number of ParameterValues created
 */
export async function syncEnvironmentParameterValues(environmentId, orgId) {
  const prisma = getPrisma();

  // Get all parameters for all apps in this organization
  const parameters = await prisma.parameter.findMany({
    where: {
      app: {
        orgId: orgId
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
      id: uuidv7(),
      parameterId: param.id,
      environmentId: environmentId,
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
 * @param {string} parameterId - Parameter UUID
 * @param {string} orgId - Organization UUID
 * @returns {Promise<number>} Number of ParameterValues created
 */
export async function syncParameterEnvironmentValues(parameterId, orgId) {
  const prisma = getPrisma();

  // Get all environments for this organization
  const environments = await prisma.environment.findMany({
    where: { orgId: orgId },
    select: { id: true }
  });

  // If no environments exist, nothing to sync
  if (environments.length === 0) {
    return 0;
  }

  // Create ParameterValue for each environment with empty string
  await prisma.parameterValue.createMany({
    data: environments.map(env => ({
      id: uuidv7(),
      parameterId: parameterId,
      environmentId: env.id,
      value: ''
    })),
    skipDuplicates: true // In case some values already exist
  });

  return environments.length;
}
