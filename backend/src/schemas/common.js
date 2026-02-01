/**
 * Common validation schemas
 * Reusable JSON Schema definitions for Fastify routes
 */

/**
 * UUID v7 validation pattern
 * Format: 8-4-7-4-12 hexadecimal characters with dashes
 * Version 7 is timestamp-based and sortable
 */
export const UUID_V7_PATTERN = '^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

/**
 * Schema for validating orgId from header or query param
 * Accepts either X-Org-Id header or ?orgId query parameter
 * Value must be a valid UUID v7
 */
export const orgIdSchema = {
  anyOf: [
    {
      type: 'object',
      properties: {
        'x-org-id': {
          type: 'string',
          pattern: UUID_V7_PATTERN,
          description: 'Organization UUID v7'
        }
      },
      required: ['x-org-id']
    },
    {
      type: 'object',
      properties: {}
    }
  ]
};

/**
 * Schema for orgId in query string
 */
export const orgIdQuerySchema = {
  type: 'object',
  properties: {
    orgId: {
      type: 'string',
      pattern: UUID_V7_PATTERN,
      description: 'Organization UUID v7'
    }
  }
};