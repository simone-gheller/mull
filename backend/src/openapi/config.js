/**
 * OpenAPI/Swagger configuration
 * Main configuration object for @fastify/swagger
 */

export const swaggerConfig = {
  openapi: {
    info: {
      title: 'SafeConfig API',
      description: 'Secure configuration management system with hierarchical apps and environments',
      version: '1.0.0'
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    tags: [
      { name: 'health', description: 'Health check' },
      { name: 'apps', description: 'Application management (hierarchical)' },
      { name: 'environments', description: 'Environment management' },
      { name: 'parameters', description: 'Configuration parameter templates' },
      { name: 'config', description: 'Configuration rendering with inheritance' }
    ],
    components: {
      securitySchemes: {
        orgId: {
          type: 'apiKey',
          name: 'x-org-id',
          in: 'header',
          description: 'Organization ID for multi-tenancy'
        }
      }
    }
  }
};

export const swaggerUiConfig = {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true
  },
  staticCSP: true
};
