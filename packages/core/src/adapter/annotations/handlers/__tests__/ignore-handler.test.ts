import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IgnoreHandler } from '../ignore-handler.js';
import type { AnnotationContext, AdapterUtils } from '../../types.js';
import type { OpenAPIV3 } from 'openapi-types';
import type { UIGenApp, Operation, SchemaNode } from '../../../../ir/types.js';

describe('IgnoreHandler', () => {
  let handler: IgnoreHandler;
  let mockUtils: AdapterUtils;
  let mockIR: UIGenApp;
  
  beforeEach(() => {
    handler = new IgnoreHandler();
    mockUtils = {
      humanize: vi.fn((str: string) => str),
      resolveRef: vi.fn(),
      logError: vi.fn(),
      logWarning: vi.fn()
    };
    mockIR = {
      resources: [],
      parsingErrors: []
    } as UIGenApp;
  });
  
  describe('name', () => {
    it('should have the correct annotation name', () => {
      expect(handler.name).toBe('x-uigen-ignore');
    });
  });
  
  describe('extract', () => {
    it('should extract true boolean value', () => {
      const element: OpenAPIV3.OperationObject = {
        'x-uigen-ignore': true,
        responses: {}
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: '/test',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBe(true);
    });
    
    it('should extract false boolean value', () => {
      const element: OpenAPIV3.OperationObject = {
        'x-uigen-ignore': false,
        responses: {}
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: '/test',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBe(false);
    });
    
    it('should return undefined for missing annotation', () => {
      const element: OpenAPIV3.OperationObject = {
        responses: {}
      };
      
      const context: AnnotationContext = {
        element,
        path: '/test',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBeUndefined();
    });
    
    it('should return undefined for string value', () => {
      const element: OpenAPIV3.OperationObject = {
        'x-uigen-ignore': 'true',
        responses: {}
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: '/test',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBeUndefined();
    });
    
    it('should return undefined for number value', () => {
      const element: OpenAPIV3.OperationObject = {
        'x-uigen-ignore': 1,
        responses: {}
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: '/test',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBeUndefined();
    });
    
    it('should return undefined for null value', () => {
      const element: OpenAPIV3.OperationObject = {
        'x-uigen-ignore': null,
        responses: {}
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: '/test',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBeUndefined();
    });
    
    it('should return undefined for undefined value', () => {
      const element: OpenAPIV3.OperationObject = {
        'x-uigen-ignore': undefined,
        responses: {}
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: '/test',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBeUndefined();
    });
    
    it('should use operation-level annotation over path-level', () => {
      const element: OpenAPIV3.OperationObject = {
        'x-uigen-ignore': false,
        responses: {}
      } as any;
      
      const parent: OpenAPIV3.PathItemObject = {
        'x-uigen-ignore': true
      } as any;
      
      const context: AnnotationContext = {
        element,
        parent,
        path: '/test',
        method: 'get',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBe(false); // Operation-level takes precedence
    });
    
    it('should fall back to path-level annotation when operation-level is missing', () => {
      const element: OpenAPIV3.OperationObject = {
        responses: {}
      };
      
      const parent: OpenAPIV3.PathItemObject = {
        'x-uigen-ignore': true
      } as any;
      
      const context: AnnotationContext = {
        element,
        parent,
        path: '/test',
        method: 'get',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBe(true); // Falls back to path-level
    });
    
    it('should return undefined when both operation and path annotations are missing', () => {
      const element: OpenAPIV3.OperationObject = {
        responses: {}
      };
      
      const parent: OpenAPIV3.PathItemObject = {};
      
      const context: AnnotationContext = {
        element,
        parent,
        path: '/test',
        method: 'get',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBeUndefined();
    });
  });
  
  describe('validate', () => {
    it('should return true for boolean true', () => {
      const result = handler.validate(true);
      expect(result).toBe(true);
    });
    
    it('should return true for boolean false', () => {
      const result = handler.validate(false);
      expect(result).toBe(true);
    });
    
    it('should return false and warn for string value', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = handler.validate('true' as any);
      
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'x-uigen-ignore must be a boolean, found string'
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should return false and warn for number value', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = handler.validate(1 as any);
      
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'x-uigen-ignore must be a boolean, found number'
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should return false and warn for null value', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = handler.validate(null as any);
      
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'x-uigen-ignore must be a boolean, found object'
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should return false and warn for undefined value', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = handler.validate(undefined as any);
      
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'x-uigen-ignore must be a boolean, found undefined'
      );
      
      consoleWarnSpy.mockRestore();
    });
  });
  
  describe('apply', () => {
    it('should mark operation with __shouldIgnore flag when value is true', () => {
      const mockOperation: Operation = {
        method: 'get',
        path: '/test',
        operationId: 'test',
        summary: 'Test',
        parameters: [],
        requestBody: null,
        responses: {}
      } as any;
      
      const element: OpenAPIV3.OperationObject = {
        responses: {}
      };
      
      const context: AnnotationContext = {
        element,
        path: '/test',
        method: 'get',
        utils: mockUtils,
        ir: mockIR,
        operation: mockOperation
      };
      
      handler.apply(true, context);
      
      expect((mockOperation as any).__shouldIgnore).toBe(true);
    });
    
    it('should not mark operation when value is false', () => {
      const mockOperation: Operation = {
        method: 'get',
        path: '/test',
        operationId: 'test',
        summary: 'Test',
        parameters: [],
        requestBody: null,
        responses: {}
      } as any;
      
      const element: OpenAPIV3.OperationObject = {
        responses: {}
      };
      
      const context: AnnotationContext = {
        element,
        path: '/test',
        method: 'get',
        utils: mockUtils,
        ir: mockIR,
        operation: mockOperation
      };
      
      handler.apply(false, context);
      
      expect((mockOperation as any).__shouldIgnore).toBeUndefined();
    });
    
    it('should not throw when operation is undefined', () => {
      const element: OpenAPIV3.OperationObject = {
        responses: {}
      };
      
      const context: AnnotationContext = {
        element,
        path: '/test',
        utils: mockUtils,
        ir: mockIR
      };
      
      expect(() => handler.apply(true, context)).not.toThrow();
    });
    
    it('should handle multiple operations independently', () => {
      const mockOperation1: Operation = {
        method: 'get',
        path: '/test1',
        operationId: 'test1',
        summary: 'Test 1',
        parameters: [],
        requestBody: null,
        responses: {}
      } as any;
      
      const mockOperation2: Operation = {
        method: 'post',
        path: '/test2',
        operationId: 'test2',
        summary: 'Test 2',
        parameters: [],
        requestBody: null,
        responses: {}
      } as any;
      
      const context1: AnnotationContext = {
        element: { responses: {} },
        path: '/test1',
        method: 'get',
        utils: mockUtils,
        ir: mockIR,
        operation: mockOperation1
      };
      
      const context2: AnnotationContext = {
        element: { responses: {} },
        path: '/test2',
        method: 'post',
        utils: mockUtils,
        ir: mockIR,
        operation: mockOperation2
      };
      
      handler.apply(true, context1);
      handler.apply(false, context2);
      
      expect((mockOperation1 as any).__shouldIgnore).toBe(true);
      expect((mockOperation2 as any).__shouldIgnore).toBeUndefined();
    });
  });
  
  describe('extract - schema contexts', () => {
    it('should extract x-uigen-ignore from schema property', () => {
      const element: OpenAPIV3.SchemaObject = {
        type: 'string',
        'x-uigen-ignore': true
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: 'password',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBe(true);
    });
    
    it('should extract x-uigen-ignore from schema object', () => {
      const element: OpenAPIV3.SchemaObject = {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' }
        },
        'x-uigen-ignore': true
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: 'InternalSchema',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBe(true);
    });
    
    it('should inherit x-uigen-ignore from parent schema', () => {
      const element: OpenAPIV3.SchemaObject = {
        type: 'string'
      };
      
      const parent: OpenAPIV3.SchemaObject = {
        type: 'object',
        'x-uigen-ignore': true
      } as any;
      
      const context: AnnotationContext = {
        element,
        parent,
        path: 'nestedProperty',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBe(true);
    });
    
    it('should override parent schema ignore with child false', () => {
      const element: OpenAPIV3.SchemaObject = {
        type: 'string',
        'x-uigen-ignore': false
      } as any;
      
      const parent: OpenAPIV3.SchemaObject = {
        type: 'object',
        'x-uigen-ignore': true
      } as any;
      
      const context: AnnotationContext = {
        element,
        parent,
        path: 'explicitlyIncluded',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBe(false); // Child overrides parent
    });
  });
  
  describe('extract - parameter contexts', () => {
    it('should extract x-uigen-ignore from parameter', () => {
      const element: OpenAPIV3.ParameterObject = {
        name: 'debug',
        in: 'query',
        schema: { type: 'boolean' },
        'x-uigen-ignore': true
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: '/users',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBe(true);
    });
    
    it('should inherit x-uigen-ignore from path-level parameter', () => {
      const element: OpenAPIV3.ParameterObject = {
        name: 'apiKey',
        in: 'header',
        schema: { type: 'string' }
      };
      
      const parent: OpenAPIV3.PathItemObject = {
        'x-uigen-ignore': true
      } as any;
      
      const context: AnnotationContext = {
        element,
        parent,
        path: '/users',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBe(true);
    });
  });
  
  describe('precedence rules - Requirements 7.1-7.4', () => {
    describe('child overrides parent - explicit false over true', () => {
      it('should include child when child has false and parent has true (operation over path)', () => {
        const element: OpenAPIV3.OperationObject = {
          'x-uigen-ignore': false,
          responses: {}
        } as any;
        
        const parent: OpenAPIV3.PathItemObject = {
          'x-uigen-ignore': true
        } as any;
        
        const context: AnnotationContext = {
          element,
          parent,
          path: '/test',
          method: 'get',
          utils: mockUtils,
          ir: mockIR
        };
        
        const result = handler.extract(context);
        expect(result).toBe(false); // Child false overrides parent true
      });
      
      it('should include child when child has false and parent has true (property over schema)', () => {
        const element: OpenAPIV3.SchemaObject = {
          type: 'string',
          'x-uigen-ignore': false
        } as any;
        
        const parent: OpenAPIV3.SchemaObject = {
          type: 'object',
          'x-uigen-ignore': true
        } as any;
        
        const context: AnnotationContext = {
          element,
          parent,
          path: 'explicitlyIncluded',
          utils: mockUtils,
          ir: mockIR
        };
        
        const result = handler.extract(context);
        expect(result).toBe(false); // Child false overrides parent true
      });
    });
    
    describe('child overrides parent - explicit true over false', () => {
      it('should exclude child when child has true and parent has false (operation over path)', () => {
        const element: OpenAPIV3.OperationObject = {
          'x-uigen-ignore': true,
          responses: {}
        } as any;
        
        const parent: OpenAPIV3.PathItemObject = {
          'x-uigen-ignore': false
        } as any;
        
        const context: AnnotationContext = {
          element,
          parent,
          path: '/test',
          method: 'get',
          utils: mockUtils,
          ir: mockIR
        };
        
        const result = handler.extract(context);
        expect(result).toBe(true); // Child true overrides parent false
      });
      
      it('should exclude child when child has true and parent has false (property over schema)', () => {
        const element: OpenAPIV3.SchemaObject = {
          type: 'string',
          'x-uigen-ignore': true
        } as any;
        
        const parent: OpenAPIV3.SchemaObject = {
          type: 'object',
          'x-uigen-ignore': false
        } as any;
        
        const context: AnnotationContext = {
          element,
          parent,
          path: 'explicitlyExcluded',
          utils: mockUtils,
          ir: mockIR
        };
        
        const result = handler.extract(context);
        expect(result).toBe(true); // Child true overrides parent false
      });
    });
    
    describe('child overrides parent - explicit true over true', () => {
      it('should exclude child when both child and parent have true', () => {
        const element: OpenAPIV3.OperationObject = {
          'x-uigen-ignore': true,
          responses: {}
        } as any;
        
        const parent: OpenAPIV3.PathItemObject = {
          'x-uigen-ignore': true
        } as any;
        
        const context: AnnotationContext = {
          element,
          parent,
          path: '/test',
          method: 'get',
          utils: mockUtils,
          ir: mockIR
        };
        
        const result = handler.extract(context);
        expect(result).toBe(true); // Child true (same as parent)
      });
    });
    
    describe('child overrides parent - explicit false over false', () => {
      it('should include child when both child and parent have false', () => {
        const element: OpenAPIV3.OperationObject = {
          'x-uigen-ignore': false,
          responses: {}
        } as any;
        
        const parent: OpenAPIV3.PathItemObject = {
          'x-uigen-ignore': false
        } as any;
        
        const context: AnnotationContext = {
          element,
          parent,
          path: '/test',
          method: 'get',
          utils: mockUtils,
          ir: mockIR
        };
        
        const result = handler.extract(context);
        expect(result).toBe(false); // Child false (same as parent)
      });
    });
    
    describe('parent fallback when child is undefined', () => {
      it('should use parent true when child is undefined', () => {
        const element: OpenAPIV3.OperationObject = {
          responses: {}
        };
        
        const parent: OpenAPIV3.PathItemObject = {
          'x-uigen-ignore': true
        } as any;
        
        const context: AnnotationContext = {
          element,
          parent,
          path: '/test',
          method: 'get',
          utils: mockUtils,
          ir: mockIR
        };
        
        const result = handler.extract(context);
        expect(result).toBe(true); // Falls back to parent true
      });
      
      it('should use parent false when child is undefined', () => {
        const element: OpenAPIV3.OperationObject = {
          responses: {}
        };
        
        const parent: OpenAPIV3.PathItemObject = {
          'x-uigen-ignore': false
        } as any;
        
        const context: AnnotationContext = {
          element,
          parent,
          path: '/test',
          method: 'get',
          utils: mockUtils,
          ir: mockIR
        };
        
        const result = handler.extract(context);
        expect(result).toBe(false); // Falls back to parent false
      });
    });
    
    describe('most specific annotation wins', () => {
      it('should prioritize child annotation regardless of parent value', () => {
        // Test case 1: child false, parent true
        const element1: OpenAPIV3.SchemaObject = {
          type: 'string',
          'x-uigen-ignore': false
        } as any;
        
        const parent1: OpenAPIV3.SchemaObject = {
          type: 'object',
          'x-uigen-ignore': true
        } as any;
        
        const context1: AnnotationContext = {
          element: element1,
          parent: parent1,
          path: 'property1',
          utils: mockUtils,
          ir: mockIR
        };
        
        expect(handler.extract(context1)).toBe(false);
        
        // Test case 2: child true, parent false
        const element2: OpenAPIV3.SchemaObject = {
          type: 'string',
          'x-uigen-ignore': true
        } as any;
        
        const parent2: OpenAPIV3.SchemaObject = {
          type: 'object',
          'x-uigen-ignore': false
        } as any;
        
        const context2: AnnotationContext = {
          element: element2,
          parent: parent2,
          path: 'property2',
          utils: mockUtils,
          ir: mockIR
        };
        
        expect(handler.extract(context2)).toBe(true);
      });
    });
  });
  
  describe('extract - request/response contexts', () => {
    it('should extract x-uigen-ignore from request body', () => {
      const element: OpenAPIV3.RequestBodyObject = {
        content: {
          'application/json': {
            schema: { type: 'object' }
          }
        },
        'x-uigen-ignore': true
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: '/internal/sync',
        method: 'post',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBe(true);
    });
    
    it('should extract x-uigen-ignore from response', () => {
      const element: OpenAPIV3.ResponseObject = {
        description: 'Internal response',
        content: {
          'application/json': {
            schema: { type: 'object' }
          }
        },
        'x-uigen-ignore': true
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: '/users',
        method: 'get',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBe(true);
    });
  });
  
  describe('apply - schema contexts', () => {
    it('should mark schema node with __shouldIgnore flag when value is true', () => {
      const mockSchemaNode: SchemaNode = {
        type: 'string',
        key: 'password',
        label: 'Password',
        required: false
      };
      
      const element: OpenAPIV3.SchemaObject = {
        type: 'string'
      };
      
      const context: AnnotationContext = {
        element,
        path: 'password',
        utils: mockUtils,
        ir: mockIR,
        schemaNode: mockSchemaNode
      };
      
      handler.apply(true, context);
      
      expect((mockSchemaNode as any).__shouldIgnore).toBe(true);
    });
    
    it('should mark element with __shouldIgnore flag for parameters', () => {
      const element: OpenAPIV3.ParameterObject = {
        name: 'debug',
        in: 'query',
        schema: { type: 'boolean' }
      };
      
      const context: AnnotationContext = {
        element,
        path: '/users',
        utils: mockUtils,
        ir: mockIR
      };
      
      handler.apply(true, context);
      
      expect((element as any).__shouldIgnore).toBe(true);
    });
    
    it('should mark element with __shouldIgnore flag for request bodies', () => {
      const element: OpenAPIV3.RequestBodyObject = {
        content: {
          'application/json': {
            schema: { type: 'object' }
          }
        }
      };
      
      const context: AnnotationContext = {
        element,
        path: '/internal/sync',
        method: 'POST',
        utils: mockUtils,
        ir: mockIR
      };
      
      handler.apply(true, context);
      
      expect((element as any).__shouldIgnore).toBe(true);
    });
    
    it('should mark element with __shouldIgnore flag for responses', () => {
      const element: OpenAPIV3.ResponseObject = {
        description: 'Internal response',
        content: {
          'application/json': {
            schema: { type: 'object' }
          }
        }
      };
      
      const context: AnnotationContext = {
        element,
        path: '/users',
        method: 'GET',
        utils: mockUtils,
        ir: mockIR
      };
      
      handler.apply(true, context);
      
      expect((element as any).__shouldIgnore).toBe(true);
    });
  });
  
  describe('validation messages - element-type-specific (Requirements 6.5, 8.1)', () => {
    it('should log element-type-specific warning for invalid operation annotation', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const element: OpenAPIV3.OperationObject = {
        'x-uigen-ignore': 'true',
        responses: {}
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: '/users',
        method: 'GET',
        utils: mockUtils,
        ir: mockIR
      };
      
      handler.extract(context);
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'x-uigen-ignore must be a boolean, found string at operation GET /users'
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should log element-type-specific warning for invalid path item annotation', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const element: OpenAPIV3.PathItemObject = {
        'x-uigen-ignore': 123
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: '/users',
        utils: mockUtils,
        ir: mockIR
      };
      
      handler.extract(context);
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'x-uigen-ignore must be a boolean, found number at path item /users'
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should log element-type-specific warning for invalid schema property annotation', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const mockSchemaNode: SchemaNode = {
        type: 'string',
        key: 'password',
        label: 'Password',
        required: false
      };
      
      const element: OpenAPIV3.SchemaObject = {
        type: 'string',
        'x-uigen-ignore': 'yes'
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: 'password',
        utils: mockUtils,
        ir: mockIR,
        schemaNode: mockSchemaNode
      };
      
      handler.extract(context);
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "x-uigen-ignore must be a boolean, found string at schema property 'password'"
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should log element-type-specific warning for invalid parameter annotation', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const element: OpenAPIV3.ParameterObject = {
        name: 'debug',
        in: 'query',
        schema: { type: 'boolean' },
        'x-uigen-ignore': 1
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: '/users',
        utils: mockUtils,
        ir: mockIR
      };
      
      handler.extract(context);
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "x-uigen-ignore must be a boolean, found number at parameter 'debug' (query) at /users"
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should log element-type-specific warning for invalid request body annotation', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const element: OpenAPIV3.RequestBodyObject = {
        content: {
          'application/json': {
            schema: { type: 'object' }
          }
        },
        'x-uigen-ignore': 'false'
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: '/internal/sync',
        method: 'POST',
        utils: mockUtils,
        ir: mockIR
      };
      
      handler.extract(context);
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'x-uigen-ignore must be a boolean, found string at request body for POST /internal/sync'
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should log element-type-specific warning for invalid response annotation', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const element: OpenAPIV3.ResponseObject = {
        description: 'Internal response',
        content: {
          'application/json': {
            schema: { type: 'object' }
          }
        },
        'x-uigen-ignore': null
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: '/users',
        method: 'GET',
        utils: mockUtils,
        ir: mockIR
      };
      
      handler.extract(context);
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'x-uigen-ignore must be a boolean, found object at response for GET /users'
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should log element-type-specific warning for invalid schema object annotation', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const element: OpenAPIV3.SchemaObject = {
        type: 'object',
        properties: {
          id: { type: 'integer' }
        },
        'x-uigen-ignore': []
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: 'User',
        utils: mockUtils,
        ir: mockIR
      };
      
      handler.extract(context);
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'x-uigen-ignore must be a boolean, found object at schema object at User'
      );
      
      consoleWarnSpy.mockRestore();
    });
  });
});
