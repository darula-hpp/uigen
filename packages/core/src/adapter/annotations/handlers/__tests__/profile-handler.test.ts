import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfileHandler } from '../profile-handler.js';
import type { AnnotationContext, AdapterUtils } from '../../types.js';
import type { OpenAPIV3 } from 'openapi-types';
import type { UIGenApp, Resource, SchemaNode } from '../../../../ir/types.js';

describe('ProfileHandler', () => {
  let handler: ProfileHandler;
  let mockUtils: AdapterUtils;
  let mockIR: UIGenApp;
  
  beforeEach(() => {
    handler = new ProfileHandler();
    mockUtils = {
      humanize: vi.fn((str: string) => str.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())),
      resolveRef: vi.fn(),
      logError: vi.fn(),
      logWarning: vi.fn()
    };
    mockIR = {
      meta: { title: 'Test', version: '1.0.0' },
      resources: [],
      auth: { schemes: [], globalRequired: false },
      dashboard: { enabled: true, widgets: [] },
      servers: [],
      parsingErrors: []
    } as UIGenApp;
  });
  
  describe('name', () => {
    it('should have the correct annotation name', () => {
      expect(handler.name).toBe('x-uigen-profile');
    });
  });
  
  describe('extract', () => {
    it('should extract true value', () => {
      const element: OpenAPIV3.OperationObject = {
        responses: {},
        'x-uigen-profile': true
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: '/api/v1/users/me',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBe(true);
    });
    
    it('should extract false value', () => {
      const element: OpenAPIV3.OperationObject = {
        responses: {},
        'x-uigen-profile': false
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: '/api/v1/users/me',
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
        path: '/api/v1/users/me',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBeUndefined();
    });
    
    it('should return undefined for string value', () => {
      const element: OpenAPIV3.OperationObject = {
        responses: {},
        'x-uigen-profile': 'yes'
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: '/api/v1/users/me',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBeUndefined();
    });
    
    it('should return undefined for number value', () => {
      const element: OpenAPIV3.OperationObject = {
        responses: {},
        'x-uigen-profile': 1
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: '/api/v1/users/me',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBeUndefined();
    });
    
    it('should return undefined for null value', () => {
      const element: OpenAPIV3.OperationObject = {
        responses: {},
        'x-uigen-profile': null
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: '/api/v1/users/me',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBeUndefined();
    });
    
    it('should return undefined for object value', () => {
      const element: OpenAPIV3.OperationObject = {
        responses: {},
        'x-uigen-profile': { enabled: true }
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: '/api/v1/users/me',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBeUndefined();
    });
    
    it('should return undefined for array value', () => {
      const element: OpenAPIV3.OperationObject = {
        responses: {},
        'x-uigen-profile': [true]
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: '/api/v1/users/me',
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
      
      const result = handler.validate('yes' as any);
      
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'x-uigen-profile must be a boolean, found string'
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should return false and warn for number value', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = handler.validate(1 as any);
      
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'x-uigen-profile must be a boolean, found number'
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should return false and warn for null value', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = handler.validate(null as any);
      
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'x-uigen-profile must be a boolean, found object'
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should return false and warn for undefined value', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = handler.validate(undefined as any);
      
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'x-uigen-profile must be a boolean, found undefined'
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should return false and warn for object value', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = handler.validate({ enabled: true } as any);
      
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'x-uigen-profile must be a boolean, found object'
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should return false and warn for array value', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = handler.validate([true] as any);
      
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'x-uigen-profile must be a boolean, found object'
      );
      
      consoleWarnSpy.mockRestore();
    });
  });
  
  describe('apply', () => {
    it('should set __profileAnnotation to true on resource', () => {
      const mockResource: Partial<Resource> = {
        name: 'Me',
        slug: 'me',
        uigenId: 'me',
        operations: [],
        schema: {} as SchemaNode,
        relationships: []
      };
      
      const element: OpenAPIV3.OperationObject = {
        responses: {}
      };
      
      const context: AnnotationContext = {
        element,
        path: '/api/v1/users/me',
        utils: mockUtils,
        ir: mockIR,
        resource: mockResource as Resource
      };
      
      handler.apply(true, context);
      
      expect((mockResource as any).__profileAnnotation).toBe(true);
    });
    
    it('should set __profileAnnotation to false on resource', () => {
      const mockResource: Partial<Resource> = {
        name: 'Admin',
        slug: 'admin',
        uigenId: 'admin',
        operations: [],
        schema: {} as SchemaNode,
        relationships: []
      };
      
      const element: OpenAPIV3.OperationObject = {
        responses: {}
      };
      
      const context: AnnotationContext = {
        element,
        path: '/api/v1/admin/profile',
        utils: mockUtils,
        ir: mockIR,
        resource: mockResource as Resource
      };
      
      handler.apply(false, context);
      
      expect((mockResource as any).__profileAnnotation).toBe(false);
    });
    
    it('should override existing __profileAnnotation value', () => {
      const mockResource: Partial<Resource> = {
        name: 'Me',
        slug: 'me',
        uigenId: 'me',
        operations: [],
        schema: {} as SchemaNode,
        relationships: [],
        __profileAnnotation: false
      };
      
      const element: OpenAPIV3.OperationObject = {
        responses: {}
      };
      
      const context: AnnotationContext = {
        element,
        path: '/api/v1/users/me',
        utils: mockUtils,
        ir: mockIR,
        resource: mockResource as Resource
      };
      
      handler.apply(true, context);
      
      expect((mockResource as any).__profileAnnotation).toBe(true);
    });
    
    it('should not throw when resource is undefined', () => {
      const element: OpenAPIV3.OperationObject = {
        responses: {}
      };
      
      const context: AnnotationContext = {
        element,
        path: '/api/v1/users/me',
        utils: mockUtils,
        ir: mockIR
      };
      
      expect(() => handler.apply(true, context)).not.toThrow();
    });
    
    it('should handle multiple resources independently', () => {
      const mockResource1: Partial<Resource> = {
        name: 'Me',
        slug: 'me',
        uigenId: 'me',
        operations: [],
        schema: {} as SchemaNode,
        relationships: []
      };
      
      const mockResource2: Partial<Resource> = {
        name: 'Admin',
        slug: 'admin',
        uigenId: 'admin',
        operations: [],
        schema: {} as SchemaNode,
        relationships: []
      };
      
      const context1: AnnotationContext = {
        element: { responses: {} },
        path: '/api/v1/users/me',
        utils: mockUtils,
        ir: mockIR,
        resource: mockResource1 as Resource
      };
      
      const context2: AnnotationContext = {
        element: { responses: {} },
        path: '/api/v1/admin/profile',
        utils: mockUtils,
        ir: mockIR,
        resource: mockResource2 as Resource
      };
      
      handler.apply(true, context1);
      handler.apply(false, context2);
      
      expect((mockResource1 as any).__profileAnnotation).toBe(true);
      expect((mockResource2 as any).__profileAnnotation).toBe(false);
    });
    
    it('should only apply to resources, not operations or fields', () => {
      const mockSchemaNode: SchemaNode = {
        type: 'string',
        key: 'fieldName',
        label: 'Field Name',
        required: false
      };
      
      const element: OpenAPIV3.SchemaObject = {
        type: 'string'
      };
      
      const context: AnnotationContext = {
        element,
        path: 'fieldName',
        utils: mockUtils,
        ir: mockIR,
        schemaNode: mockSchemaNode
      };
      
      handler.apply(true, context);
      
      expect((mockSchemaNode as any).__profileAnnotation).toBeUndefined();
    });
  });
  
  describe('metadata', () => {
    it('should have correct metadata', () => {
      const metadata = ProfileHandler.metadata;
      
      expect(metadata.name).toBe('x-uigen-profile');
      expect(metadata.description).toBe('Marks a resource as a profile resource for specialized rendering');
      expect(metadata.targetType).toBe('resource');
      expect(metadata.parameterSchema.type).toBe('boolean');
      expect(metadata.examples).toHaveLength(2);
      expect(metadata.examples[0].value).toBe(true);
      expect(metadata.examples[1].value).toBe(false);
    });
  });
});
