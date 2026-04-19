import { describe, it, expect } from 'vitest';
import { Swagger2Adapter } from '../swagger2.js';

/**
 * Test suite for Task 5.1: Verify Swagger2Adapter preserves path structures during conversion
 * 
 * Requirements: 5.2, 5.4
 * 
 * This test verifies that the Swagger2Adapter correctly preserves:
 * 1. Path structures (including many-to-many patterns like /resource/{id}/library)
 * 2. Path parameters are correctly converted to OpenAPI 3.x format
 * 3. Operation types (GET, POST, DELETE) are preserved
 */
describe('Swagger2Adapter - Path Structure Preservation (Task 5.1)', () => {
  describe('Path structure preservation', () => {
    it('should preserve simple collection paths', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/meetings': {
            get: {
              operationId: 'listMeetings',
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(spec as any);
      const ir = adapter.adapt();

      expect(ir.resources).toHaveLength(1);
      expect(ir.resources[0].slug).toBe('meetings');
      expect(ir.resources[0].operations).toHaveLength(1);
      expect(ir.resources[0].operations[0].path).toBe('/meetings');
    });

    it('should preserve detail paths with path parameters', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/meetings/{meetingId}': {
            get: {
              operationId: 'getMeeting',
              parameters: [
                { name: 'meetingId', in: 'path', required: true, type: 'string' }
              ],
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(spec as any);
      const ir = adapter.adapt();

      expect(ir.resources).toHaveLength(1);
      expect(ir.resources[0].operations).toHaveLength(1);
      expect(ir.resources[0].operations[0].path).toBe('/meetings/{meetingId}');
      
      const pathParams = ir.resources[0].operations[0].parameters.filter(p => p.in === 'path');
      expect(pathParams).toHaveLength(1);
      expect(pathParams[0].name).toBe('meetingId');
    });

    it('should preserve many-to-many association paths', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/meetings/{meetingId}/templates': {
            get: {
              operationId: 'listMeetingTemplates',
              parameters: [
                { name: 'meetingId', in: 'path', required: true, type: 'string' }
              ],
              responses: {
                '200': {
                  description: 'Success',
                  schema: {
                    type: 'array',
                    items: { $ref: '#/definitions/Template' }
                  }
                }
              }
            },
            post: {
              operationId: 'addTemplateToMeeting',
              parameters: [
                { name: 'meetingId', in: 'path', required: true, type: 'string' },
                {
                  name: 'body',
                  in: 'body',
                  schema: {
                    type: 'object',
                    properties: {
                      templateId: { type: 'string' }
                    }
                  }
                }
              ],
              responses: { '201': { description: 'Created' } }
            }
          },
          '/meetings/{meetingId}/templates/{templateId}': {
            delete: {
              operationId: 'removeTemplateFromMeeting',
              parameters: [
                { name: 'meetingId', in: 'path', required: true, type: 'string' },
                { name: 'templateId', in: 'path', required: true, type: 'string' }
              ],
              responses: { '204': { description: 'Deleted' } }
            }
          }
        },
        definitions: {
          Template: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(spec as any);
      const ir = adapter.adapt();

      // The operations are grouped by their response schema (templates)
      // So all template-related operations will be under the templates resource
      const templatesResource = ir.resources.find(r => r.slug === 'templates');
      expect(templatesResource).toBeDefined();

      // Verify association operations are present
      const listTemplatesOp = templatesResource?.operations.find(
        op => op.path === '/meetings/{meetingId}/templates' && op.method === 'GET'
      );
      const addTemplateOp = templatesResource?.operations.find(
        op => op.path === '/meetings/{meetingId}/templates' && op.method === 'POST'
      );
      const removeTemplateOp = templatesResource?.operations.find(
        op => op.path === '/meetings/{meetingId}/templates/{templateId}' && op.method === 'DELETE'
      );

      expect(listTemplatesOp).toBeDefined();
      expect(addTemplateOp).toBeDefined();
      expect(removeTemplateOp).toBeDefined();

      // Verify path parameters are preserved
      const listPathParams = listTemplatesOp?.parameters.filter(p => p.in === 'path') || [];
      expect(listPathParams).toHaveLength(1);
      expect(listPathParams[0].name).toBe('meetingId');

      const addPathParams = addTemplateOp?.parameters.filter(p => p.in === 'path') || [];
      expect(addPathParams).toHaveLength(1);
      expect(addPathParams[0].name).toBe('meetingId');

      const removePathParams = removeTemplateOp?.parameters.filter(p => p.in === 'path') || [];
      expect(removePathParams).toHaveLength(2);
      expect(removePathParams.map(p => p.name)).toContain('meetingId');
      expect(removePathParams.map(p => p.name)).toContain('templateId');
    });

    it('should preserve nested resource paths', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/organizations/{orgId}/projects/{projectId}/tasks': {
            get: {
              operationId: 'listProjectTasks',
              parameters: [
                { name: 'orgId', in: 'path', required: true, type: 'string' },
                { name: 'projectId', in: 'path', required: true, type: 'string' }
              ],
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(spec as any);
      const ir = adapter.adapt();

      // Find the operation
      const operation = ir.resources
        .flatMap(r => r.operations)
        .find(op => op.path === '/organizations/{orgId}/projects/{projectId}/tasks');

      expect(operation).toBeDefined();
      const pathParams = operation?.parameters.filter(p => p.in === 'path') || [];
      expect(pathParams).toHaveLength(2);
      expect(pathParams.map(p => p.name)).toContain('orgId');
      expect(pathParams.map(p => p.name)).toContain('projectId');
    });
  });

  describe('Path parameter conversion', () => {
    it('should convert path parameters to OpenAPI 3.x format', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/users/{userId}': {
            get: {
              operationId: 'getUser',
              parameters: [
                {
                  name: 'userId',
                  in: 'path',
                  required: true,
                  type: 'string',
                  description: 'The user ID'
                }
              ],
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(spec as any);
      const ir = adapter.adapt();

      const operation = ir.resources[0].operations[0];
      const pathParams = operation.parameters.filter(p => p.in === 'path');
      expect(pathParams).toHaveLength(1);
      expect(pathParams[0].name).toBe('userId');
      expect(pathParams[0].schema.type).toBe('string');
      expect(pathParams[0].required).toBe(true);
      expect(pathParams[0].description).toBe('The user ID');
    });

    it('should handle path parameters with format', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/items/{itemId}': {
            get: {
              operationId: 'getItem',
              parameters: [
                {
                  name: 'itemId',
                  in: 'path',
                  required: true,
                  type: 'integer',
                  format: 'int64'
                }
              ],
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(spec as any);
      const ir = adapter.adapt();

      const operation = ir.resources[0].operations[0];
      const pathParams = operation.parameters.filter(p => p.in === 'path');
      expect(pathParams).toHaveLength(1);
      expect(pathParams[0].name).toBe('itemId');
      expect(pathParams[0].schema.type).toBe('integer');
      expect(pathParams[0].schema.format).toBe('int64');
    });

    it('should handle multiple path parameters', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/users/{userId}/posts/{postId}': {
            get: {
              operationId: 'getUserPost',
              parameters: [
                { name: 'userId', in: 'path', required: true, type: 'string' },
                { name: 'postId', in: 'path', required: true, type: 'integer' }
              ],
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(spec as any);
      const ir = adapter.adapt();

      const operation = ir.resources[0].operations[0];
      const pathParams = operation.parameters.filter(p => p.in === 'path');
      expect(pathParams).toHaveLength(2);
      
      const userIdParam = pathParams.find(p => p.name === 'userId');
      const postIdParam = pathParams.find(p => p.name === 'postId');
      
      expect(userIdParam).toBeDefined();
      expect(userIdParam?.schema.type).toBe('string');
      expect(postIdParam).toBeDefined();
      expect(postIdParam?.schema.type).toBe('integer');
    });

    it('should handle path-level parameters', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/resources/{resourceId}': {
            parameters: [
              { name: 'resourceId', in: 'path', required: true, type: 'string' }
            ],
            get: {
              operationId: 'getResource',
              responses: { '200': { description: 'Success' } }
            },
            put: {
              operationId: 'updateResource',
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(spec as any);
      const ir = adapter.adapt();

      // Both operations should inherit the path-level parameter
      const getOp = ir.resources[0].operations.find(op => op.method === 'GET');
      const putOp = ir.resources[0].operations.find(op => op.method === 'PUT');

      const getPathParams = getOp?.parameters.filter(p => p.in === 'path') || [];
      expect(getPathParams).toHaveLength(1);
      expect(getPathParams[0].name).toBe('resourceId');
      
      const putPathParams = putOp?.parameters.filter(p => p.in === 'path') || [];
      expect(putPathParams).toHaveLength(1);
      expect(putPathParams[0].name).toBe('resourceId');
    });
  });

  describe('Operation type preservation', () => {
    it('should preserve GET operations', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/items': {
            get: {
              operationId: 'listItems',
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(spec as any);
      const ir = adapter.adapt();

      expect(ir.resources[0].operations).toHaveLength(1);
      expect(ir.resources[0].operations[0].method).toBe('GET');
      expect(ir.resources[0].operations[0].viewHint).toBe('list');
    });

    it('should preserve POST operations', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/items': {
            post: {
              operationId: 'createItem',
              responses: { '201': { description: 'Created' } }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(spec as any);
      const ir = adapter.adapt();

      expect(ir.resources[0].operations).toHaveLength(1);
      expect(ir.resources[0].operations[0].method).toBe('POST');
      expect(ir.resources[0].operations[0].viewHint).toBe('create');
    });

    it('should preserve DELETE operations', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/items/{id}': {
            delete: {
              operationId: 'deleteItem',
              parameters: [
                { name: 'id', in: 'path', required: true, type: 'string' }
              ],
              responses: { '204': { description: 'Deleted' } }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(spec as any);
      const ir = adapter.adapt();

      expect(ir.resources[0].operations).toHaveLength(1);
      expect(ir.resources[0].operations[0].method).toBe('DELETE');
      expect(ir.resources[0].operations[0].viewHint).toBe('delete');
    });

    it('should preserve PUT operations', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/items/{id}': {
            put: {
              operationId: 'updateItem',
              parameters: [
                { name: 'id', in: 'path', required: true, type: 'string' }
              ],
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(spec as any);
      const ir = adapter.adapt();

      expect(ir.resources[0].operations).toHaveLength(1);
      expect(ir.resources[0].operations[0].method).toBe('PUT');
      expect(ir.resources[0].operations[0].viewHint).toBe('update');
    });

    it('should preserve PATCH operations', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/items/{id}': {
            patch: {
              operationId: 'patchItem',
              parameters: [
                { name: 'id', in: 'path', required: true, type: 'string' }
              ],
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(spec as any);
      const ir = adapter.adapt();

      expect(ir.resources[0].operations).toHaveLength(1);
      expect(ir.resources[0].operations[0].method).toBe('PATCH');
    });

    it('should preserve all operations on the same path', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/items/{id}': {
            get: {
              operationId: 'getItem',
              parameters: [
                { name: 'id', in: 'path', required: true, type: 'string' }
              ],
              responses: { '200': { description: 'Success' } }
            },
            put: {
              operationId: 'updateItem',
              parameters: [
                { name: 'id', in: 'path', required: true, type: 'string' }
              ],
              responses: { '200': { description: 'Success' } }
            },
            delete: {
              operationId: 'deleteItem',
              parameters: [
                { name: 'id', in: 'path', required: true, type: 'string' }
              ],
              responses: { '204': { description: 'Deleted' } }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(spec as any);
      const ir = adapter.adapt();

      expect(ir.resources[0].operations).toHaveLength(3);
      
      const methods = ir.resources[0].operations.map(op => op.method);
      expect(methods).toContain('GET');
      expect(methods).toContain('PUT');
      expect(methods).toContain('DELETE');
      
      // All operations should have the same path
      ir.resources[0].operations.forEach(op => {
        expect(op.path).toBe('/items/{id}');
      });
    });
  });

  describe('Complex path scenarios for many-to-many detection', () => {
    it('should preserve paths for library resource pattern', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/templates': {
            get: {
              operationId: 'listTemplates',
              responses: {
                '200': {
                  description: 'Success',
                  schema: {
                    type: 'array',
                    items: { $ref: '#/definitions/Template' }
                  }
                }
              }
            },
            post: {
              operationId: 'createTemplate',
              responses: { '201': { description: 'Created' } }
            }
          },
          '/templates/{id}': {
            get: {
              operationId: 'getTemplate',
              parameters: [
                { name: 'id', in: 'path', required: true, type: 'string' }
              ],
              responses: { '200': { description: 'Success' } }
            }
          },
          '/meetings/{meetingId}/templates': {
            get: {
              operationId: 'listMeetingTemplates',
              parameters: [
                { name: 'meetingId', in: 'path', required: true, type: 'string' }
              ],
              responses: { '200': { description: 'Success' } }
            },
            post: {
              operationId: 'addTemplateToMeeting',
              parameters: [
                { name: 'meetingId', in: 'path', required: true, type: 'string' }
              ],
              responses: { '201': { description: 'Created' } }
            }
          }
        },
        definitions: {
          Template: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(spec as any);
      const ir = adapter.adapt();

      // Verify templates resource has standalone endpoints
      const templatesResource = ir.resources.find(r => r.slug === 'templates');
      expect(templatesResource).toBeDefined();
      
      const templatesOps = templatesResource?.operations || [];
      expect(templatesOps.some(op => op.path === '/templates' && op.method === 'GET')).toBe(true);
      expect(templatesOps.some(op => op.path === '/templates' && op.method === 'POST')).toBe(true);
      expect(templatesOps.some(op => op.path === '/templates/{id}' && op.method === 'GET')).toBe(true);

      // Verify association endpoints are also present (grouped under templates resource)
      expect(templatesOps.some(op => op.path === '/meetings/{meetingId}/templates' && op.method === 'GET')).toBe(true);
      expect(templatesOps.some(op => op.path === '/meetings/{meetingId}/templates' && op.method === 'POST')).toBe(true);
    });

    it('should preserve read-only association paths', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/orders/{orderId}/products': {
            get: {
              operationId: 'listOrderProducts',
              parameters: [
                { name: 'orderId', in: 'path', required: true, type: 'string' }
              ],
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(spec as any);
      const ir = adapter.adapt();

      const operation = ir.resources
        .flatMap(r => r.operations)
        .find(op => op.path === '/orders/{orderId}/products');

      expect(operation).toBeDefined();
      expect(operation?.method).toBe('GET');
      const pathParams = operation?.parameters.filter(p => p.in === 'path') || [];
      expect(pathParams).toHaveLength(1);
      expect(pathParams[0].name).toBe('orderId');
    });
  });
});
