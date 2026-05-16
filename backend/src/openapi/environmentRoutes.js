/**
 * OpenAPI schemas for environment routes
 */
import { errorResponse } from './common.js';
import { uuidV7Param } from '../schemas/common.js';

export const listEnvironmentsSchema = {
  tags: ['environments'],
  summary: 'List all environments',
  description: 'Get all environments for an organization',
  params: {
    type: 'object',
    required: ['orgId'],
    properties: {
      orgId: uuidV7Param('Organization ID'),
    }
  },
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Environment ID' },
          orgId: { type: 'string', description: 'Organization ID' },
          name: { type: 'string', description: 'Environment name' },
          tier: { type: 'string', enum: ['DEVELOPMENT', 'STAGING', 'PRODUCTION', 'CUSTOM'] },
          protected: { type: 'boolean', description: 'Whether writes and reveals require protected-environment permission' }
        }
      }
    },
    400: errorResponse,
    500: errorResponse
  }
};

export const createEnvironmentSchema = {
  tags: ['environments'],
  summary: 'Create a new environment',
  description: 'Create a new environment (e.g., development, staging, production)',
  params: {
    type: 'object',
    required: ['orgId'],
    properties: {
      orgId: uuidV7Param('Organization ID'),
    }
  },
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 32,
        description: 'Environment name (unique within organization)'
      },
      tier: { type: 'string', enum: ['DEVELOPMENT', 'STAGING', 'PRODUCTION', 'CUSTOM'], default: 'CUSTOM' },
      protected: { type: 'boolean', description: 'Whether writes and reveals require protected-environment permission' }
    }
  },
  response: {
    201: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Environment ID' },
        orgId: { type: 'string', description: 'Organization ID' },
        name: { type: 'string', description: 'Environment name' },
        tier: { type: 'string', enum: ['DEVELOPMENT', 'STAGING', 'PRODUCTION', 'CUSTOM'] },
        protected: { type: 'boolean' }
      }
    },
    400: errorResponse,
    404: errorResponse,
    409: errorResponse,
    500: errorResponse
  }
};

export const deleteEnvironmentSchema = {
  tags: ['environments'],
  summary: 'Delete environment',
  description: 'Delete an environment and its parameter values',
  params: {
    type: 'object',
    required: ['orgId', 'envId'],
    properties: {
      orgId: uuidV7Param('Organization ID'),
      envId: uuidV7Param('Environment ID'),
    },
  },
  response: {
    204: { type: 'null' },
    400: errorResponse,
    403: errorResponse,
    404: errorResponse,
    500: errorResponse,
  },
};
