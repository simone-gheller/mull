/**
 * OpenAPI schemas for health check endpoint
 */

export const healthCheckSchema = {
  tags: ['health'],
  description: 'Health check endpoint',
  response: {
    200: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        timestamp: { type: 'string' }
      }
    }
  }
};
