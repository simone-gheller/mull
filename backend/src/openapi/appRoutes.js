/**
 * OpenAPI schemas for app routes
 */
import { errorResponse } from './common.js';
import { uuidV7Param } from '../schemas/common.js';

export const listAppsSchema = {
  tags: ['apps'],
  summary: 'List all apps',
  description: 'Get all apps for an organization with hierarchy information',
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
          id: { type: 'string', description: 'App ID' },
          orgId: { type: 'string', description: 'Organization ID' },
          parentId: { type: ['string', 'null'], description: 'Parent app ID (null for root apps)' },
          name: { type: 'string', description: 'App name' },
          ancestors: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of ancestor app IDs'
          },
          depth: { type: 'number', description: 'Hierarchy depth (0 for root apps)' },
          _count: {
            type: 'object',
            properties: {
              parameters: { type: 'number' }
            }
          }
        }
      }
    },
    400: errorResponse,
    500: errorResponse
  }
};

export const createAppSchema = {
  tags: ['apps'],
  summary: 'Create a new app',
  description: 'Create a new app, optionally as a child of an existing app',
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
        description: 'App name (unique within organization)'
      },
      parentId: uuidV7Param('Optional parent app UUID v7 for hierarchical structure'),
    }
  },
  response: {
    201: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'App ID' },
        orgId: { type: 'string', description: 'Organization ID' },
        parentId: { type: ['string', 'null'], description: 'Parent app ID' },
        name: { type: 'string', description: 'App name' },
        ancestors: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of ancestor app IDs'
        },
        depth: { type: 'number', description: 'Hierarchy depth' }
      }
    },
    400: errorResponse,
    403: errorResponse,
    404: errorResponse,
    409: errorResponse,
    500: errorResponse
  }
};
