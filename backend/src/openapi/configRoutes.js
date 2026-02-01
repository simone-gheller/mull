/**
 * OpenAPI schemas for config routes
 */
import { errorResponse } from './common.js';
import { UUID_V7_PATTERN } from '../schemas/common.js';

export const getConfigSchema = {
  tags: ['config'],
  summary: 'Get configuration for app and environment',
  description: 'Returns flat key-value configuration with hierarchical inheritance from parent apps',
  params: {
    type: 'object',
    required: ['appId', 'envId'],
    properties: {
      appId: {
        type: 'string',
        pattern: UUID_V7_PATTERN,
        format: 'uuid',
        description: 'Application UUID v7'
      },
      envId: {
        type: 'string',
        pattern: UUID_V7_PATTERN,
        format: 'uuid',
        description: 'Environment UUID v7'
      }
    }
  },
  querystring: {
    type: 'object',
    properties: {
      orgId: {
        type: 'string',
        pattern: UUID_V7_PATTERN,
        format: 'uuid',
        description: 'Organization UUID v7 (alternative to header)'
      }
    }
  },
  headers: {
    type: 'object',
    properties: {
      'x-org-id': {
        type: 'string',
        description: 'Organization ID'
      }
    }
  },
  security: [{ orgId: [] }],
  response: {
    200: {
      type: 'object',
      description: 'Flat key-value configuration object',
      additionalProperties: { type: 'string' }
    },
    400: errorResponse,
    403: errorResponse,
    404: errorResponse,
    500: errorResponse
  }
};
