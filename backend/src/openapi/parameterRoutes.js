/**
 * OpenAPI schemas for parameter routes
 */
import { errorResponse } from './common.js';
import { orgIdSchema, orgIdQuerySchema, UUID_V7_PATTERN } from '../schemas/common.js';

export const listParametersSchema = {
  tags: ['parameters'],
  summary: 'List parameters for an app',
  description: 'Get all configuration parameter templates for a specific app',
  headers: orgIdSchema,
  querystring: {
    allOf: [
      orgIdQuerySchema,
      {
        type: 'object',
        required: ['appId'],
        properties: {
          appId: {
            type: 'string',
            pattern: UUID_V7_PATTERN,
            format: 'uuid',
            description: 'Application UUID v7'
          }
        }
      }
    ]
  },
  security: [{ orgId: [] }],
  response: {
    200: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Parameter ID' },
          appId: { type: 'string', description: 'Application ID' },
          key: { type: 'string', description: 'Parameter key/name' }
        }
      }
    },
    400: errorResponse,
    403: errorResponse,
    404: errorResponse,
    500: errorResponse
  }
};

export const createParameterSchema = {
  tags: ['parameters'],
  summary: 'Create a new parameter',
  description: 'Create a new configuration parameter template with empty values for all environments',
  body: {
    type: 'object',
    required: ['appId', 'key'],
    properties: {
      appId: {
        type: 'string',
        pattern: UUID_V7_PATTERN,
        format: 'uuid',
        description: 'Application UUID v7'
      },
      key: {
        type: 'string',
        minLength: 1,
        description: 'Parameter key/name (unique within app)'
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
        id: { type: 'string', description: 'Parameter ID' },
        appId: { type: 'string', description: 'Application ID' },
        key: { type: 'string', description: 'Parameter key/name' }
      }
    },
    400: errorResponse,
    403: errorResponse,
    404: errorResponse,
    409: errorResponse,
    500: errorResponse
  }
};
