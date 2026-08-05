import { uuidV7Param } from '../schemas/common.js';
import { errorResponse } from './common.js';

/**
 * GET /parameters/:appId/values - List all parameter values for an app
 */
export const getParameterValuesSchema = {
  description: 'Get all parameter values for an app',
  tags: ['parameter-values'],
  params: {
    type: 'object',
    required: ['orgId', 'appId'],
    properties: {
      orgId: uuidV7Param('Organization ID'),
      appId: uuidV7Param('App ID'),
    }
  },
  response: {
    200: {
      description: 'Parameter values grouped by environment',
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          environmentId: {
            type: 'string',
            format: 'uuid',
            description: 'Environment ID'
          },
          values: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid', description: 'Parameter value ID' },
                parameterId: { type: 'string', format: 'uuid', description: 'Parameter ID' },
                parameterKey: { type: 'string', description: 'Parameter key' },
                isSet: { type: 'boolean', description: 'True when the local value is set' },
                value: {
                  anyOf: [{ type: 'string' }, { type: 'null' }],
                  description: 'Parameter value, null when unset or redacted'
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
  description: 'Get a single parameter value by ID',
  tags: ['parameter-values'],
  params: {
    type: 'object',
    required: ['orgId', 'id'],
    properties: {
      orgId: uuidV7Param('Organization ID'),
      id: uuidV7Param('Parameter value ID'),
    }
  },
  response: {
    200: {
      description: 'Parameter value found',
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
  description: 'Update a parameter value',
  tags: ['parameter-values'],
  params: {
    type: 'object',
    required: ['orgId', 'id'],
    properties: {
      orgId: uuidV7Param('Organization ID'),
      id: uuidV7Param('Parameter value ID'),
    }
  },
  body: {
    type: 'object',
    required: ['value'],
    properties: {
      value: {
        type: 'string',
        description: 'New value for the parameter'
      }
    }
  },
  response: {
    200: {
      description: 'Parameter value updated',
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
  description: 'Get the encrypted history of a parameter value, without plaintext',
  tags: ['parameter-values'],
  params: {
    type: 'object',
    required: ['orgId', 'id'],
    properties: {
      orgId: uuidV7Param('Organization ID'),
      id: uuidV7Param('Parameter value ID'),
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
  description: 'Reveal a historical version of a parameter value',
  tags: ['parameter-values'],
  params: {
    type: 'object',
    required: ['orgId', 'id', 'versionId'],
    properties: {
      orgId: uuidV7Param('Organization ID'),
      id: uuidV7Param('Parameter value ID'),
      versionId: uuidV7Param('Historical version ID'),
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
  description: 'Roll back a parameter value to a historical version',
  tags: ['parameter-values'],
  params: {
    type: 'object',
    required: ['orgId', 'id'],
    properties: {
      orgId: uuidV7Param('Organization ID'),
      id: uuidV7Param('Parameter value ID'),
    }
  },
  body: {
    type: 'object',
    required: ['versionId'],
    properties: {
      versionId: uuidV7Param('Historical version ID')
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
