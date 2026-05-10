/**
 * OpenAPI schemas for parameter routes
 */
import { errorResponse } from './common.js';
import { uuidV7Param } from '../schemas/common.js';

export const resolvedParametersSchema = {
  tags: ['parameters'],
  summary: 'Resolve parameters for an app',
  description: 'Get parameter definitions with inheritance and optional effective value for one environment',
  params: {
    type: 'object',
    required: ['orgId'],
    properties: {
      orgId: uuidV7Param('Organization ID'),
    },
  },
  querystring: {
    type: 'object',
    required: ['appId'],
    properties: {
      appId: uuidV7Param('Application UUID v7'),
      environmentId: uuidV7Param('Environment UUID v7'),
    },
  },
  response: {
    200: { type: 'object', additionalProperties: true },
    400: errorResponse,
    403: errorResponse,
    404: errorResponse,
    500: errorResponse,
  },
};

export const createParameterOverrideSchema = {
  tags: ['parameters'],
  summary: 'Create or retrieve an override parameter',
  description: 'Create or retrieve a local override parameter in a child app',
  params: {
    type: 'object',
    required: ['orgId'],
    properties: {
      orgId: uuidV7Param('Organization ID'),
    },
  },
  body: {
    type: 'object',
    required: ['key', 'appId'],
    properties: {
      key: {
        type: 'string',
        minLength: 1,
        description: 'Parameter key/name',
      },
      appId: uuidV7Param('Application UUID v7'),
      description: {
        type: 'string',
        description: 'Optional human-readable description',
      },
    },
  },
  response: {
    200: { type: 'object', additionalProperties: true },
    400: errorResponse,
    403: errorResponse,
    404: errorResponse,
    500: errorResponse,
  },
};

export const listParametersSchema = {
  tags: ['parameters'],
  summary: 'List parameters for an app',
  description: 'Get all configuration parameter templates for a specific app',
  params: {
    type: 'object',
    required: ['orgId'],
    properties: {
      orgId: uuidV7Param('Organization ID'),
    }
  },
  querystring: {
    type: 'object',
    required: ['appId'],
    properties: {
      appId: uuidV7Param('Application UUID v7'),
    }
  },
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
  params: {
    type: 'object',
    required: ['orgId'],
    properties: {
      orgId: uuidV7Param('Organization ID'),
    }
  },
  body: {
    type: 'object',
    required: ['appId', 'key'],
    properties: {
      appId: uuidV7Param('Application UUID v7'),
      key: {
        type: 'string',
        minLength: 1,
        description: 'Parameter key/name (unique within app)'
      },
      description: {
        type: 'string',
        description: 'Optional human-readable description'
      }
    }
  },
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
