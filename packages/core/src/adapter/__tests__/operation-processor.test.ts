import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Operation_Processor } from '../operation-processor.js';
import { ViewHintClassifier } from '../view-hint-classifier.js';
import { Parameter_Processor } from '../parameter-processor.js';
import { Body_Processor } from '../body-processor.js';
import { AnnotationHandlerRegistry } from '../annotations/registry.js';
import type { AdapterUtils } from '../annotations/index.js';
import type { OpenAPIV3 } from 'openapi-types';

describe('Operation_Processor', () => {
  let processor: Operation_Processor;
  let viewHintClassifier: ViewHintClassifier;
  let parameterProcessor: Parameter_Processor;
  let bodyProcessor: Body_Processor;
  let annotationRegistry: AnnotationHandlerRegistry;
  let adapterUtils: AdapterUtils;

  beforeEach(() => {
    viewHintClassifier = new ViewHintClassifier();
    annotationRegistry = AnnotationHandlerRegistry.getInstance();
    
    adapterUtils = {
      humanize: (str: string) => str.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').trim(),
      resolveRef: vi.fn(),
      logError: vi.fn(),
      logWarning: vi.fn()
    };

    // Create minimal spec for processors
    const minimalSpec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {}
    };

    // Mock SchemaProcessor for Parameter_Processor and Body_Processor
    const mockSchemaProcessor = {
      processSchema: vi.fn((key: string) => ({
        type: 'object' as const,
        key,
        label: key,
        required: false,
        children: []
      })),
      shouldIgnoreSchema: vi.fn(() => false),
      setCurrentIR: vi.fn()
    };

    // Mock FileMetadataVisitor for Body_Processor
    const mockFileMetadataVisitor = {
      hasFileFields: vi.fn(() => false),
      visit: vi.fn()
    };

    parameterProcessor = new Parameter_Processor(
      minimalSpec,
      adapterUtils,
      mockSchemaProcessor as any,
      annotationRegistry
    );

    bodyProcessor = new Body_Processor(
      minimalSpec,
      adapterUtils,
      mockSchemaProcessor as any,
      annotationRegistry,
      mockFileMetadataVisitor as any
    );

    processor = new Operation_Processor(
      viewHintClassifier,
      parameterProcessor,
      bodyProcessor,
      annotationRegistry,
      adapterUtils
    );
  });

  describe('extractIgnoreAnnotation', () => {
    it('should extract x-uigen-ignore: true', () => {
      const operation: OpenAPIV3.OperationObject = {
        responses: {},
        'x-uigen-ignore': true
      } as any;

      const pathItem: OpenAPIV3.PathItemObject = {};

      const result = processor.processOperation('GET', '/test', operation, pathItem);
      expect(result).toBeUndefined();
    });

    it('should extract x-uigen-ignore: false', () => {
      const operation: OpenAPIV3.OperationObject = {
        responses: {},
        'x-uigen-ignore': false
      } as any;

      const pathItem: OpenAPIV3.PathItemObject = {};

      const result = processor.processOperation('GET', '/test', operation, pathItem);
      expect(result).toBeDefined();
      expect(result?.id).toBe('get__test');
    });

    it('should return undefined for absent x-uigen-ignore', () => {
      const operation: OpenAPIV3.OperationObject = {
        responses: {}
      };

      const result = processor.processOperation('GET', '/test', operation);
      expect(result).toBeDefined();
    });

    it('should log warning for non-boolean x-uigen-ignore (string)', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const operation: OpenAPIV3.OperationObject = {
        responses: {},
        'x-uigen-ignore': 'yes'
      } as any;

      const pathItem: OpenAPIV3.PathItemObject = {};

      const result = processor.processOperation('GET', '/test', operation, pathItem);
      expect(result).toBeDefined(); // Treated as undefined, so operation is processed
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('x-uigen-ignore must be a boolean')
      );
      
      consoleWarnSpy.mockRestore();
    });

    it('should log warning for non-boolean x-uigen-ignore (number)', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const operation: OpenAPIV3.OperationObject = {
        responses: {},
        'x-uigen-ignore': 1
      } as any;

      const pathItem: OpenAPIV3.PathItemObject = {};

      const result = processor.processOperation('GET', '/test', operation, pathItem);
      expect(result).toBeDefined(); // Treated as undefined, so operation is processed
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('x-uigen-ignore must be a boolean')
      );
      
      consoleWarnSpy.mockRestore();
    });

    it('should log warning for non-boolean x-uigen-ignore (object)', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const operation: OpenAPIV3.OperationObject = {
        responses: {},
        'x-uigen-ignore': { value: true }
      } as any;

      const pathItem: OpenAPIV3.PathItemObject = {};

      const result = processor.processOperation('GET', '/test', operation, pathItem);
      expect(result).toBeDefined(); // Treated as undefined, so operation is processed
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('x-uigen-ignore must be a boolean')
      );
      
      consoleWarnSpy.mockRestore();
    });

    it('should handle null x-uigen-ignore', () => {
      const operation: OpenAPIV3.OperationObject = {
        responses: {},
        'x-uigen-ignore': null
      } as any;

      const result = processor.processOperation('GET', '/test', operation);
      expect(result).toBeDefined(); // null is treated as undefined
    });

    it('should handle empty string x-uigen-ignore', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const operation: OpenAPIV3.OperationObject = {
        responses: {},
        'x-uigen-ignore': ''
      } as any;

      const pathItem: OpenAPIV3.PathItemObject = {};

      const result = processor.processOperation('GET', '/test', operation, pathItem);
      expect(result).toBeDefined(); // Empty string is treated as undefined
      expect(consoleWarnSpy).toHaveBeenCalled();
      
      consoleWarnSpy.mockRestore();
    });

    it('should handle numeric zero x-uigen-ignore', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const operation: OpenAPIV3.OperationObject = {
        responses: {},
        'x-uigen-ignore': 0
      } as any;

      const pathItem: OpenAPIV3.PathItemObject = {};

      const result = processor.processOperation('GET', '/test', operation, pathItem);
      expect(result).toBeDefined(); // 0 is treated as undefined
      expect(consoleWarnSpy).toHaveBeenCalled();
      
      consoleWarnSpy.mockRestore();
    });
  });

  describe('shouldIgnoreOperation (annotation precedence)', () => {
    it('should ignore when operation-level x-uigen-ignore is true', () => {
      const operation: OpenAPIV3.OperationObject = {
        responses: {},
        'x-uigen-ignore': true
      } as any;

      const pathItem: OpenAPIV3.PathItemObject = {
        'x-uigen-ignore': false
      } as any;

      const result = processor.processOperation('GET', '/test', operation, pathItem);
      expect(result).toBeUndefined();
    });

    it('should process when operation-level x-uigen-ignore is false (overrides path-level true)', () => {
      const operation: OpenAPIV3.OperationObject = {
        responses: {},
        'x-uigen-ignore': false
      } as any;

      const pathItem: OpenAPIV3.PathItemObject = {
        'x-uigen-ignore': true
      } as any;

      const result = processor.processOperation('GET', '/test', operation, pathItem);
      expect(result).toBeDefined();
    });

    it('should ignore when path-level x-uigen-ignore is true and operation-level is undefined', () => {
      const operation: OpenAPIV3.OperationObject = {
        responses: {}
      };

      const pathItem: OpenAPIV3.PathItemObject = {
        'x-uigen-ignore': true
      } as any;

      const result = processor.processOperation('GET', '/test', operation, pathItem);
      expect(result).toBeUndefined();
    });

    it('should process when path-level x-uigen-ignore is false and operation-level is undefined', () => {
      const operation: OpenAPIV3.OperationObject = {
        responses: {}
      };

      const pathItem: OpenAPIV3.PathItemObject = {
        'x-uigen-ignore': false
      } as any;

      const result = processor.processOperation('GET', '/test', operation, pathItem);
      expect(result).toBeDefined();
    });

    it('should process when both operation-level and path-level x-uigen-ignore are undefined', () => {
      const operation: OpenAPIV3.OperationObject = {
        responses: {}
      };

      const pathItem: OpenAPIV3.PathItemObject = {};

      const result = processor.processOperation('GET', '/test', operation, pathItem);
      expect(result).toBeDefined();
    });

    it('should test all precedence rule combinations', () => {
      // Operation true, Path true → ignore
      let result = processor.processOperation(
        'GET',
        '/test',
        { responses: {}, 'x-uigen-ignore': true } as any,
        { 'x-uigen-ignore': true } as any
      );
      expect(result).toBeUndefined();

      // Operation true, Path false → ignore
      result = processor.processOperation(
        'GET',
        '/test',
        { responses: {}, 'x-uigen-ignore': true } as any,
        { 'x-uigen-ignore': false } as any
      );
      expect(result).toBeUndefined();

      // Operation false, Path true → process (override)
      result = processor.processOperation(
        'GET',
        '/test',
        { responses: {}, 'x-uigen-ignore': false } as any,
        { 'x-uigen-ignore': true } as any
      );
      expect(result).toBeDefined();

      // Operation false, Path false → process
      result = processor.processOperation(
        'GET',
        '/test',
        { responses: {}, 'x-uigen-ignore': false } as any,
        { 'x-uigen-ignore': false } as any
      );
      expect(result).toBeDefined();
    });
  });

  describe('extractOperationId', () => {
    it('should extract existing operationId', () => {
      const operation: OpenAPIV3.OperationObject = {
        operationId: 'listUsers',
        responses: {}
      };

      const result = processor.processOperation('GET', '/users', operation);
      expect(result?.id).toBe('listUsers');
    });

    it('should generate ID for GET method', () => {
      const operation: OpenAPIV3.OperationObject = {
        responses: {}
      };

      const result = processor.processOperation('GET', '/users', operation);
      expect(result?.id).toBe('get__users');
    });

    it('should generate ID for POST method', () => {
      const operation: OpenAPIV3.OperationObject = {
        responses: {}
      };

      const result = processor.processOperation('POST', '/users', operation);
      expect(result?.id).toBe('post__users');
    });

    it('should generate ID for PUT method', () => {
      const operation: OpenAPIV3.OperationObject = {
        responses: {}
      };

      const result = processor.processOperation('PUT', '/users/{id}', operation);
      expect(result?.id).toBe('put__users_{id}');
    });

    it('should generate ID for PATCH method', () => {
      const operation: OpenAPIV3.OperationObject = {
        responses: {}
      };

      const result = processor.processOperation('PATCH', '/users/{id}', operation);
      expect(result?.id).toBe('patch__users_{id}');
    });

    it('should generate ID for DELETE method', () => {
      const operation: OpenAPIV3.OperationObject = {
        responses: {}
      };

      const result = processor.processOperation('DELETE', '/users/{id}', operation);
      expect(result?.id).toBe('delete__users_{id}');
    });

    it('should generate ID with various paths', () => {
      let result = processor.processOperation('GET', '/api/v1/users', { responses: {} });
      expect(result?.id).toBe('get__api_v1_users');

      result = processor.processOperation('GET', '/users/{id}/posts', { responses: {} });
      expect(result?.id).toBe('get__users_{id}_posts');
    });

    it('should handle empty operationId string', () => {
      const operation: OpenAPIV3.OperationObject = {
        operationId: '',
        responses: {}
      };

      const result = processor.processOperation('GET', '/users', operation);
      // Empty string is falsy, so it should generate an ID
      expect(result?.id).toBe('get__users');
    });
  });

  describe('extractUigenId', () => {
    it('should extract x-uigen-id when present', () => {
      const operation: OpenAPIV3.OperationObject = {
        operationId: 'listUsers',
        responses: {},
        'x-uigen-id': 'custom-list-users'
      } as any;

      const result = processor.processOperation('GET', '/users', operation);
      expect(result?.uigenId).toBe('custom-list-users');
    });

    it('should fall back to operationId when x-uigen-id absent', () => {
      const operation: OpenAPIV3.OperationObject = {
        operationId: 'listUsers',
        responses: {}
      };

      const result = processor.processOperation('GET', '/users', operation);
      expect(result?.uigenId).toBe('listUsers');
    });

    it('should handle empty x-uigen-id string', () => {
      const operation: OpenAPIV3.OperationObject = {
        operationId: 'listUsers',
        responses: {},
        'x-uigen-id': ''
      } as any;

      const result = processor.processOperation('GET', '/users', operation);
      expect(result?.uigenId).toBe('listUsers');
    });

    it('should handle numeric x-uigen-id', () => {
      const operation: OpenAPIV3.OperationObject = {
        operationId: 'listUsers',
        responses: {},
        'x-uigen-id': 123
      } as any;

      const result = processor.processOperation('GET', '/users', operation);
      expect(result?.uigenId).toBe('123');
    });

    it('should handle x-uigen-id with special characters', () => {
      const operation: OpenAPIV3.OperationObject = {
        operationId: 'listUsers',
        responses: {},
        'x-uigen-id': 'custom-list_users.v2'
      } as any;

      const result = processor.processOperation('GET', '/users', operation);
      expect(result?.uigenId).toBe('custom-list_users.v2');
    });
  });

  describe('extractSecurityRequirements', () => {
    it('should extract single security requirement', () => {
      const operation: OpenAPIV3.OperationObject = {
        responses: {},
        security: [{ bearerAuth: [] }]
      };

      const result = processor.processOperation('GET', '/users', operation);
      expect(result?.security).toEqual([{ name: 'bearerAuth', scopes: [] }]);
    });

    it('should extract multiple security requirements', () => {
      const operation: OpenAPIV3.OperationObject = {
        responses: {},
        security: [
          { bearerAuth: ['read', 'write'] },
          { apiKey: [] }
        ]
      };

      const result = processor.processOperation('GET', '/users', operation);
      expect(result?.security).toEqual([
        { name: 'bearerAuth', scopes: ['read', 'write'] },
        { name: 'apiKey', scopes: [] }
      ]);
    });

    it('should extract security scopes', () => {
      const operation: OpenAPIV3.OperationObject = {
        responses: {},
        security: [{ oauth2: ['read:users', 'write:users'] }]
      };

      const result = processor.processOperation('GET', '/users', operation);
      expect(result?.security).toEqual([
        { name: 'oauth2', scopes: ['read:users', 'write:users'] }
      ]);
    });

    it('should handle empty security array', () => {
      const operation: OpenAPIV3.OperationObject = {
        responses: {},
        security: []
      };

      const result = processor.processOperation('GET', '/users', operation);
      expect(result?.security).toEqual([]);
    });

    it('should handle undefined security', () => {
      const operation: OpenAPIV3.OperationObject = {
        responses: {}
      };

      const result = processor.processOperation('GET', '/users', operation);
      expect(result?.security).toBeUndefined();
    });
  });

  describe('determineRequestContentType', () => {
    it('should determine content type for request body with file fields', () => {
      const mockFileMetadataVisitor = {
        hasFileFields: vi.fn(() => true),
        visit: vi.fn()
      };

      const mockSchemaProcessor = {
        processSchema: vi.fn((key: string) => ({
          type: 'object' as const,
          key,
          label: key,
          required: false,
          children: [],
          fileMetadata: { isFile: true }
        })),
        shouldIgnoreSchema: vi.fn(() => false),
        setCurrentIR: vi.fn()
      };

      const minimalSpec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {}
      };

      const bodyProcessorWithFiles = new Body_Processor(
        minimalSpec,
        adapterUtils,
        mockSchemaProcessor as any,
        annotationRegistry,
        mockFileMetadataVisitor as any
      );

      const processorWithFiles = new Operation_Processor(
        viewHintClassifier,
        parameterProcessor,
        bodyProcessorWithFiles,
        annotationRegistry,
        adapterUtils
      );

      const operation: OpenAPIV3.OperationObject = {
        responses: {},
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } }
            },
            'multipart/form-data': {
              schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } }
            }
          }
        }
      };

      const result = processorWithFiles.processOperation('POST', '/upload', operation);
      expect(result?.requestContentType).toBe('multipart/form-data');
    });

    it('should determine content type for request body without file fields', () => {
      const operation: OpenAPIV3.OperationObject = {
        responses: {},
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object', properties: { name: { type: 'string' } } }
            }
          }
        }
      };

      const result = processor.processOperation('POST', '/users', operation);
      expect(result?.requestContentType).toBe('application/json');
    });

    it('should handle operation with no request body', () => {
      const operation: OpenAPIV3.OperationObject = {
        responses: {}
      };

      const result = processor.processOperation('GET', '/users', operation);
      expect(result?.requestContentType).toBeUndefined();
    });

    it('should handle request body with no content', () => {
      const operation: OpenAPIV3.OperationObject = {
        responses: {},
        requestBody: {
          description: 'Request body'
        }
      };

      const result = processor.processOperation('POST', '/users', operation);
      expect(result?.requestContentType).toBeUndefined();
    });
  });

  describe('processOperation (integration tests)', () => {
    it('should process operation with all fields present', () => {
      const operation: OpenAPIV3.OperationObject = {
        operationId: 'createUser',
        summary: 'Create a new user',
        description: 'Creates a new user in the system',
        parameters: [
          {
            name: 'api_version',
            in: 'query',
            schema: { type: 'string' }
          }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'User created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' }
                  }
                }
              }
            }
          }
        },
        security: [{ bearerAuth: ['write:users'] }],
        'x-uigen-id': 'custom-create-user'
      } as any;

      const result = processor.processOperation('POST', '/users', operation);

      expect(result).toBeDefined();
      expect(result?.id).toBe('createUser');
      expect(result?.uigenId).toBe('custom-create-user');
      expect(result?.method).toBe('POST');
      expect(result?.path).toBe('/users');
      expect(result?.summary).toBe('Create a new user');
      expect(result?.description).toBe('Creates a new user in the system');
      expect(result?.parameters).toHaveLength(1);
      expect(result?.requestBody).toBeDefined();
      expect(result?.requestContentType).toBe('application/json');
      expect(result?.responses).toBeDefined();
      expect(result?.viewHint).toBe('create');
      expect(result?.security).toEqual([{ name: 'bearerAuth', scopes: ['write:users'] }]);
    });

    it('should process operation with minimal fields', () => {
      const operation: OpenAPIV3.OperationObject = {
        responses: {}
      };

      const result = processor.processOperation('GET', '/health', operation);

      expect(result).toBeDefined();
      expect(result?.id).toBe('get__health');
      expect(result?.uigenId).toBe('get__health');
      expect(result?.method).toBe('GET');
      expect(result?.path).toBe('/health');
      expect(result?.summary).toBeUndefined();
      expect(result?.description).toBeUndefined();
      expect(result?.parameters).toEqual([]);
      expect(result?.requestBody).toBeUndefined();
      expect(result?.requestContentType).toBeUndefined();
      expect(result?.responses).toBeDefined();
      expect(result?.viewHint).toBe('list'); // GET /health is classified as list
      expect(result?.security).toBeUndefined();
    });

    it('should process operation with parameters', () => {
      const operation: OpenAPIV3.OperationObject = {
        operationId: 'getUser',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          },
          {
            name: 'include',
            in: 'query',
            schema: { type: 'string' }
          }
        ],
        responses: {}
      };

      const pathItem: OpenAPIV3.PathItemObject = {
        parameters: [
          {
            name: 'api_version',
            in: 'header',
            schema: { type: 'string' }
          }
        ]
      };

      const result = processor.processOperation('GET', '/users/{id}', operation, pathItem);

      expect(result).toBeDefined();
      expect(result?.parameters).toHaveLength(3); // operation params + path params
      expect(result?.viewHint).toBe('search'); // Has query params, so classified as search
    });

    it('should process operation with request body', () => {
      const operation: OpenAPIV3.OperationObject = {
        operationId: 'updateUser',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {}
      };

      const result = processor.processOperation('PUT', '/users/{id}', operation);

      expect(result).toBeDefined();
      expect(result?.requestBody).toBeDefined();
      expect(result?.requestContentType).toBe('application/json');
      expect(result?.viewHint).toBe('update');
    });

    it('should process operation with responses', () => {
      const operation: OpenAPIV3.OperationObject = {
        operationId: 'listUsers',
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' }
                    }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Not found'
          }
        }
      };

      const result = processor.processOperation('GET', '/users', operation);

      expect(result).toBeDefined();
      expect(result?.responses).toBeDefined();
      expect(Object.keys(result?.responses || {})).toContain('200');
      expect(result?.viewHint).toBe('list');
    });

    it('should process operation with security requirements', () => {
      const operation: OpenAPIV3.OperationObject = {
        operationId: 'deleteUser',
        security: [
          { bearerAuth: ['write:users', 'delete:users'] },
          { apiKey: [] }
        ],
        responses: {}
      };

      const result = processor.processOperation('DELETE', '/users/{id}', operation);

      expect(result).toBeDefined();
      expect(result?.security).toEqual([
        { name: 'bearerAuth', scopes: ['write:users', 'delete:users'] },
        { name: 'apiKey', scopes: [] }
      ]);
      expect(result?.viewHint).toBe('delete');
    });

    it('should process operation with no security requirements', () => {
      const operation: OpenAPIV3.OperationObject = {
        operationId: 'publicEndpoint',
        responses: {}
      };

      const result = processor.processOperation('GET', '/public', operation);

      expect(result).toBeDefined();
      expect(result?.security).toBeUndefined();
    });

    it('should process operation with file upload (multipart/form-data)', () => {
      const mockFileMetadataVisitor = {
        hasFileFields: vi.fn(() => true),
        visit: vi.fn()
      };

      const mockSchemaProcessor = {
        processSchema: vi.fn((key: string) => ({
          type: 'object' as const,
          key,
          label: key,
          required: false,
          children: [],
          fileMetadata: { isFile: true }
        })),
        shouldIgnoreSchema: vi.fn(() => false),
        setCurrentIR: vi.fn()
      };

      const minimalSpec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {}
      };

      const bodyProcessorWithFiles = new Body_Processor(
        minimalSpec,
        adapterUtils,
        mockSchemaProcessor as any,
        annotationRegistry,
        mockFileMetadataVisitor as any
      );

      const processorWithFiles = new Operation_Processor(
        viewHintClassifier,
        parameterProcessor,
        bodyProcessorWithFiles,
        annotationRegistry,
        adapterUtils
      );

      const operation: OpenAPIV3.OperationObject = {
        operationId: 'uploadFile',
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: { type: 'string', format: 'binary' },
                  description: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {}
      };

      const result = processorWithFiles.processOperation('POST', '/upload', operation);

      expect(result).toBeDefined();
      expect(result?.requestContentType).toBe('multipart/form-data');
    });

    it('should classify various view hints correctly', () => {
      // List view
      let result = processor.processOperation('GET', '/users', { operationId: 'listUsers', responses: {} });
      expect(result?.viewHint).toBe('list');

      // Detail view
      result = processor.processOperation('GET', '/users/{id}', { operationId: 'getUser', responses: {} });
      expect(result?.viewHint).toBe('detail');

      // Create view
      result = processor.processOperation('POST', '/users', { operationId: 'createUser', responses: {} });
      expect(result?.viewHint).toBe('create');

      // Update view
      result = processor.processOperation('PUT', '/users/{id}', { operationId: 'updateUser', responses: {} });
      expect(result?.viewHint).toBe('update');

      // Delete view
      result = processor.processOperation('DELETE', '/users/{id}', { operationId: 'deleteUser', responses: {} });
      expect(result?.viewHint).toBe('delete');

      // Search view (with query params)
      result = processor.processOperation('GET', '/users', {
        operationId: 'searchUsers',
        parameters: [{ name: 'q', in: 'query', schema: { type: 'string' } }],
        responses: {}
      });
      expect(result?.viewHint).toBe('search');

      // Action view (non-CRUD)
      result = processor.processOperation('POST', '/users/{id}/activate', { operationId: 'activateUser', responses: {} });
      expect(result?.viewHint).toBe('action');
    });

    it('should handle empty operations (no params, no body, no responses)', () => {
      const operation: OpenAPIV3.OperationObject = {
        responses: {}
      };

      const result = processor.processOperation('GET', '/ping', operation);

      expect(result).toBeDefined();
      expect(result?.parameters).toEqual([]);
      expect(result?.requestBody).toBeUndefined();
      expect(result?.requestContentType).toBeUndefined();
      expect(result?.responses).toBeDefined();
      expect(result?.security).toBeUndefined();
    });

    it('should extract requestBodySchemaName from request body with $ref', () => {
      // Mock the body processor to return a schema name
      const mockFileMetadataVisitor = {
        hasFileFields: vi.fn(() => false),
        visit: vi.fn()
      };

      const mockSchemaProcessor = {
        processSchema: vi.fn((key: string) => ({
          type: 'object' as const,
          key,
          label: key,
          required: false,
          children: []
        })),
        shouldIgnoreSchema: vi.fn(() => false),
        setCurrentIR: vi.fn()
      };

      const minimalSpec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
        components: {
          schemas: {
            'Body_create_meeting_api_v1_meetings_post': {
              type: 'object',
              properties: {
                title: { type: 'string' },
                recording: { type: 'string', format: 'binary' }
              }
            }
          }
        }
      };

      const bodyProcessorWithSchemaName = new Body_Processor(
        minimalSpec,
        adapterUtils,
        mockSchemaProcessor as any,
        annotationRegistry,
        mockFileMetadataVisitor as any
      );

      const processorWithSchemaName = new Operation_Processor(
        viewHintClassifier,
        parameterProcessor,
        bodyProcessorWithSchemaName,
        annotationRegistry,
        adapterUtils
      );

      const operation: OpenAPIV3.OperationObject = {
        operationId: 'createMeeting',
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                $ref: '#/components/schemas/Body_create_meeting_api_v1_meetings_post'
              }
            }
          }
        },
        responses: {}
      };

      const result = processorWithSchemaName.processOperation('POST', '/api/v1/meetings', operation);

      expect(result).toBeDefined();
      expect(result?.requestBody).toBeDefined();
      expect(result?.requestBodySchemaName).toBe('Body_create_meeting_api_v1_meetings_post');
    });

    it('should have undefined requestBodySchemaName for inline schemas', () => {
      const operation: OpenAPIV3.OperationObject = {
        operationId: 'createUser',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {}
      };

      const result = processor.processOperation('POST', '/users', operation);

      expect(result).toBeDefined();
      expect(result?.requestBody).toBeDefined();
      expect(result?.requestBodySchemaName).toBeUndefined();
    });
  });
});
