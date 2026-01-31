/**
 * Common validation schemas
 * Reusable JSON Schema definitions for Fastify routes
 */

/**
 * Schema for validating orgId from header or query param
 * Accepts either X-Org-Id header or ?orgId query parameter
 * Value must be a numeric string matching pattern ^[0-9]+$
 */
export const orgIdSchema = {
  anyOf: [
    {
      type: 'object',
      properties: {
        'x-org-id': { type: 'string', pattern: '^[0-9]+$' }
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
    orgId: { type: 'string', pattern: '^[0-9]+$' }
  }
};