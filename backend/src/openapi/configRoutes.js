/**
 * OpenAPI schemas for config routes
 */
import { errorResponse } from './common.js';
import { uuidV7Param } from '../schemas/common.js';

export const getConfigSchema = {
  tags: ['config'],
  summary: 'Get configuration for app and environment',
  description: 'Returns flat key-value configuration with hierarchical inheritance from parent apps',
  params: {
    type: 'object',
    required: ['orgId', 'appId', 'envId'],
    properties: {
      orgId: uuidV7Param('Organization ID'),
      appId: uuidV7Param('Application UUID v7'),
      envId: uuidV7Param('Environment UUID v7'),
    }
  },
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
