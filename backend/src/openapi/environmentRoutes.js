/**
 * OpenAPI schemas for environment routes
 */
import { errorResponse } from './common.js';
import { orgIdSchema, orgIdQuerySchema } from '../schemas/common.js';

export const listEnvironmentsSchema = {
  tags: ['environments'],
  summary: 'List all environments',
  description: 'Get all environments for an organization',
  headers: orgIdSchema,
  querystring: orgIdQuerySchema,
  security: [{ orgId: [] }],
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Environment ID' },
          orgId: { type: 'string', description: 'Organization ID' },
          name: { type: 'string', description: 'Environment name' }
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
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        description: 'Environment name (unique within organization)'
      }
    }
  },
  headers: orgIdSchema,
  querystring: orgIdQuerySchema,
  security: [{ orgId: [] }],
  response: {
    201: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Environment ID' },
        orgId: { type: 'string', description: 'Organization ID' },
        name: { type: 'string', description: 'Environment name' }
      }
    },
    400: errorResponse,
    404: errorResponse,
    409: errorResponse,
    500: errorResponse
  }
};
