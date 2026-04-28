import { UUID_V7_PATTERN } from '../schemas/common.js';
import { errorResponse } from './common.js';

/**
 * GET /parameters/:appId/values - List all parameter values for an app
 */
export const getParameterValuesSchema = {
  description: 'Recupera tutti i parameter values per un app',
  tags: ['ParameterValues'],
  params: {
    type: 'object',
    required: ['orgId', 'appId'],
    properties: {
      orgId: {
        type: 'string',
        pattern: UUID_V7_PATTERN,
        format: 'uuid',
        description: 'Organization ID'
      },
      appId: {
        type: 'string',
        pattern: UUID_V7_PATTERN,
        description: 'ID dell\'app'
      }
    }
  },
  response: {
    200: {
      description: 'Parameter values raggruppati per environment',
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          environmentId: {
            type: 'string',
            format: 'uuid',
            description: 'ID dell\'environment'
          },
          values: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid', description: 'ID del parameter value' },
                parameterId: { type: 'string', format: 'uuid', description: 'ID del parametro' },
                parameterKey: { type: 'string', description: 'Chiave del parametro' },
                value: { type: 'string', description: 'Valore del parametro' }
              }
            }
          }
        }
      }
    },
    400: errorResponse,
    404: errorResponse,
    403: errorResponse
  }
};

/**
 * GET /parameters/values/:id - Get a single parameter value by ID
 */
export const getParameterValueByIdSchema = {
  description: 'Recupera un parameter value specifico per ID',
  tags: ['ParameterValues'],
  params: {
    type: 'object',
    required: ['orgId', 'id'],
    properties: {
      orgId: {
        type: 'string',
        pattern: UUID_V7_PATTERN,
        format: 'uuid',
        description: 'Organization ID'
      },
      id: {
        type: 'string',
        pattern: UUID_V7_PATTERN,
        description: 'ID del parameter value'
      }
    }
  },
  response: {
    200: {
      description: 'Parameter value trovato',
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        parameterId: { type: 'string', format: 'uuid' },
        environmentId: { type: 'string', format: 'uuid' },
        value: { type: 'string' },
        parameter: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            key: { type: 'string' },
            appId: { type: 'string', format: 'uuid' }
          }
        },
        environment: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            orgId: { type: 'string', format: 'uuid' }
          }
        }
      }
    },
    404: errorResponse,
    403: errorResponse
  }
};

/**
 * PUT /parameters/values/:id - Update a parameter value
 */
export const updateParameterValueSchema = {
  description: 'Aggiorna il valore di un parameter value',
  tags: ['ParameterValues'],
  params: {
    type: 'object',
    required: ['orgId', 'id'],
    properties: {
      orgId: {
        type: 'string',
        pattern: UUID_V7_PATTERN,
        format: 'uuid',
        description: 'Organization ID'
      },
      id: {
        type: 'string',
        pattern: UUID_V7_PATTERN,
        description: 'ID del parameter value'
      }
    }
  },
  body: {
    type: 'object',
    required: ['value'],
    properties: {
      value: {
        type: 'string',
        description: 'Nuovo valore del parametro'
      }
    }
  },
  response: {
    200: {
      description: 'Parameter value aggiornato',
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        parameterId: { type: 'string', format: 'uuid' },
        environmentId: { type: 'string', format: 'uuid' },
        value: { type: 'string' }
      }
    },
    400: errorResponse,
    404: errorResponse,
    403: errorResponse
  }
};
