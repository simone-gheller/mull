/**
 * Common OpenAPI schemas and reusable components
 */

export const errorResponse = {
  type: 'object',
  properties: {
    error: { type: 'string' },
    message: { type: 'string' },
    statusCode: { type: 'number' }
  }
};
