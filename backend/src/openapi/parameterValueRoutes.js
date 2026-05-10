import { uuidV7Param } from '../schemas/common.js';
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
      orgId: uuidV7Param('Organization ID'),
      appId: uuidV7Param('ID dell\'app'),
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
                isSet: { type: 'boolean', description: 'True quando il valore locale e impostato' },
                value: {
                  anyOf: [{ type: 'string' }, { type: 'null' }],
                  description: 'Valore del parametro, null quando unset o redatto'
                }
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
      orgId: uuidV7Param('Organization ID'),
      id: uuidV7Param('ID del parameter value'),
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
        isSet: { type: 'boolean' },
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
      orgId: uuidV7Param('Organization ID'),
      id: uuidV7Param('ID del parameter value'),
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
        isSet: { type: 'boolean' },
        value: { type: 'string' }
      }
    },
    400: errorResponse,
    404: errorResponse,
    403: errorResponse
  }
};

export const getParameterValueHistorySchema = {
  description: 'Recupera la history cifrata di un parameter value senza plaintext',
  tags: ['ParameterValues'],
  params: {
    type: 'object',
    required: ['orgId', 'id'],
    properties: {
      orgId: uuidV7Param('Organization ID'),
      id: uuidV7Param('ID del parameter value'),
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              parameterValueId: { type: 'string', format: 'uuid' },
              parameterId: { type: 'string', format: 'uuid' },
              environmentId: { type: 'string', format: 'uuid' },
              versionNumber: { type: 'integer' },
              changeType: { type: 'string' },
              rolledBackFromVersionId: { anyOf: [{ type: 'string', format: 'uuid' }, { type: 'null' }] },
              isSet: { type: 'boolean' },
              createdAt: { type: 'string' },
              createdBy: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  email: { type: 'string' },
                  displayName: { anyOf: [{ type: 'string' }, { type: 'null' }] }
                }
              },
              parameter: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  key: { type: 'string' }
                }
              },
              environment: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  name: { type: 'string' }
                }
              }
            }
          }
        }
      }
    },
    404: errorResponse,
    403: errorResponse
  }
};

export const revealParameterValueVersionSchema = {
  description: 'Rivela una versione storica di un parameter value',
  tags: ['ParameterValues'],
  params: {
    type: 'object',
    required: ['orgId', 'id', 'versionId'],
    properties: {
      orgId: uuidV7Param('Organization ID'),
      id: uuidV7Param('ID del parameter value'),
      versionId: uuidV7Param('ID della versione storica'),
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        parameterValueId: { type: 'string', format: 'uuid' },
        versionNumber: { type: 'integer' },
        isSet: { type: 'boolean' },
        value: { type: 'string' }
      }
    },
    404: errorResponse,
    403: errorResponse
  }
};

export const rollbackParameterValueSchema = {
  description: 'Ripristina un parameter value da una versione storica',
  tags: ['ParameterValues'],
  params: {
    type: 'object',
    required: ['orgId', 'id'],
    properties: {
      orgId: uuidV7Param('Organization ID'),
      id: uuidV7Param('ID del parameter value'),
    }
  },
  body: {
    type: 'object',
    required: ['versionId'],
    properties: {
      versionId: uuidV7Param('ID della versione storica')
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        parameterId: { type: 'string', format: 'uuid' },
        environmentId: { type: 'string', format: 'uuid' },
        isSet: { type: 'boolean' },
        value: { type: 'string' }
      }
    },
    400: errorResponse,
    404: errorResponse,
    403: errorResponse
  }
};
