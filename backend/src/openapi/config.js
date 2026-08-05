/**
 * OpenAPI/Swagger configuration
 * Main configuration object for @fastify/swagger
 */

export const swaggerConfig = {
  openapi: {
    info: {
      title: 'vextis API',
      description: 'Envelope-encrypted configuration management for apps, environments, and parameters — this spec backs docs.vextis.io/api.',
      version: '1.0.0'
    },
    servers: [
      {
        url: 'https://api.vextis.io',
        description: 'Production'
      },
      {
        url: 'http://localhost:3000',
        description: 'Local development'
      }
    ],
    tags: [
      { name: 'health', description: 'Health check' },
      { name: 'auth', description: 'Authentication and user management' },
      { name: 'orgs', description: 'Organization management and membership' },
      { name: 'apps', description: 'Application management (hierarchical)' },
      { name: 'environments', description: 'Environment management' },
      { name: 'parameters', description: 'Configuration parameter templates' },
      { name: 'parameter-values', description: 'Encrypted parameter values per environment' },
      { name: 'config', description: 'Configuration rendering with inheritance' },
      { name: 'access-keys', description: 'Personal access tokens and organization service tokens' },
      { name: 'invites', description: 'Organization invitations' },
      { name: 'cli', description: 'CLI device authorization flow' },
      { name: 'billing', description: 'Organization billing and plan management' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Supabase JWT (dashboard sessions), or a vextis_pat_* / vextis_st_* access key — all sent as Authorization: Bearer <token>.'
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
