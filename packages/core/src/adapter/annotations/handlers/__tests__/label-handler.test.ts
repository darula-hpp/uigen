import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LabelHandler } from '../label-handler.js';
import type { AnnotationContext, AdapterUtils } from '../../types.js';
import type { OpenAPIV3 } from 'openapi-types';
import type { UIGenApp, SchemaNode } from '../../../../ir/types.js';

describe('LabelHandler', () => {
  let handler: LabelHandler;
  let mockUtils: AdapterUtils;
  let mockIR: UIGenApp;
  
  beforeEach(() => {
    handler = new LabelHandler();
    mockUtils = {
      humanize: vi.fn((str: string) => str.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())),
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
      expect(handler.name).toBe('x-uigen-label');
    });
  });
  
  describe('extract', () => {
    it('should extract valid string value', () => {
      const element: OpenAPIV3.SchemaObject = {
        type: 'string',
        'x-uigen-label': 'Custom Label'
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: 'fieldName',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBe('Custom Label');
    });
    
    it('should extract string with special characters', () => {
      const element: OpenAPIV3.SchemaObject = {
        type: 'string',
        'x-uigen-label': 'User ID (Primary)'
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: 'userId',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBe('User ID (Primary)');
    });
    
    it('should return undefined for missing annotation', () => {
      const element: OpenAPIV3.SchemaObject = {
        type: 'string'
      };
      
      const context: AnnotationContext = {
        element,
        path: 'fieldName',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBeUndefined();
    });
    
    it('should return undefined for empty string', () => {
      const element: OpenAPIV3.SchemaObject = {
        type: 'string',
        'x-uigen-label': ''
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: 'fieldName',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBeUndefined();
    });
    
    it('should return undefined for whitespace-only string', () => {
      const element: OpenAPIV3.SchemaObject = {
        type: 'string',
        'x-uigen-label': '   '
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: 'fieldName',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBeUndefined();
    });
    
    it('should return undefined for number value', () => {
      const element: OpenAPIV3.SchemaObject = {
        type: 'string',
        'x-uigen-label': 123
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: 'fieldName',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBeUndefined();
    });
    
    it('should return undefined for boolean value', () => {
      const element: OpenAPIV3.SchemaObject = {
        type: 'string',
        'x-uigen-label': true
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: 'fieldName',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBeUndefined();
    });
    
    it('should return undefined for null value', () => {
      const element: OpenAPIV3.SchemaObject = {
        type: 'string',
        'x-uigen-label': null
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: 'fieldName',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBeUndefined();
    });
    
    it('should return undefined for object value', () => {
      const element: OpenAPIV3.SchemaObject = {
        type: 'string',
        'x-uigen-label': { label: 'Custom' }
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: 'fieldName',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBeUndefined();
    });
    
    it('should extract label from $ref property', () => {
      const element: OpenAPIV3.ReferenceObject = {
        $ref: '#/components/schemas/User',
        'x-uigen-label': 'User Profile'
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: 'user',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBe('User Profile');
    });
  });
  
  describe('validate', () => {
    it('should return true for valid non-empty string', () => {
      const result = handler.validate('Custom Label');
      expect(result).toBe(true);
    });
    
    it('should return true for string with whitespace', () => {
      const result = handler.validate('  Custom Label  ');
      expect(result).toBe(true);
    });
    
    it('should return false and warn for empty string', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = handler.validate('');
      
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'x-uigen-label must be a non-empty string'
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should return false and warn for whitespace-only string', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = handler.validate('   ');
      
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'x-uigen-label must be a non-empty string'
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should return false and warn for number value', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = handler.validate(123 as any);
      
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'x-uigen-label must be a string, found number'
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should return false and warn for boolean value', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = handler.validate(true as any);
      
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'x-uigen-label must be a string, found boolean'
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should return false and warn for null value', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = handler.validate(null as any);
      
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'x-uigen-label must be a string, found object'
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should return false and warn for undefined value', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = handler.validate(undefined as any);
      
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'x-uigen-label must be a string, found undefined'
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should return false and warn for object value', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = handler.validate({ label: 'Custom' } as any);
      
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'x-uigen-label must be a string, found object'
      );
      
      consoleWarnSpy.mockRestore();
    });
  });
  
  describe('apply', () => {
    it('should set label on schema node', () => {
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
      
      handler.apply('Custom Label', context);
      
      expect(mockSchemaNode.label).toBe('Custom Label');
    });
    
    it('should override existing label on schema node', () => {
      const mockSchemaNode: SchemaNode = {
        type: 'string',
        key: 'fieldName',
        label: 'Old Label',
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
      
      handler.apply('New Label', context);
      
      expect(mockSchemaNode.label).toBe('New Label');
    });
    
    it('should not throw when schema node is undefined', () => {
      const element: OpenAPIV3.SchemaObject = {
        type: 'string'
      };
      
      const context: AnnotationContext = {
        element,
        path: 'fieldName',
        utils: mockUtils,
        ir: mockIR
      };
      
      expect(() => handler.apply('Custom Label', context)).not.toThrow();
    });
    
    it('should handle labels with special characters', () => {
      const mockSchemaNode: SchemaNode = {
        type: 'string',
        key: 'userId',
        label: 'User Id',
        required: false
      };
      
      const element: OpenAPIV3.SchemaObject = {
        type: 'string'
      };
      
      const context: AnnotationContext = {
        element,
        path: 'userId',
        utils: mockUtils,
        ir: mockIR,
        schemaNode: mockSchemaNode
      };
      
      handler.apply('User ID (Primary Key)', context);
      
      expect(mockSchemaNode.label).toBe('User ID (Primary Key)');
    });
    
    it('should handle multiple schema nodes independently', () => {
      const mockSchemaNode1: SchemaNode = {
        type: 'string',
        key: 'firstName',
        label: 'First Name',
        required: false
      };
      
      const mockSchemaNode2: SchemaNode = {
        type: 'string',
        key: 'lastName',
        label: 'Last Name',
        required: false
      };
      
      const context1: AnnotationContext = {
        element: { type: 'string' },
        path: 'firstName',
        utils: mockUtils,
        ir: mockIR,
        schemaNode: mockSchemaNode1
      };
      
      const context2: AnnotationContext = {
        element: { type: 'string' },
        path: 'lastName',
        utils: mockUtils,
        ir: mockIR,
        schemaNode: mockSchemaNode2
      };
      
      handler.apply('Given Name', context1);
      handler.apply('Family Name', context2);
      
      expect(mockSchemaNode1.label).toBe('Given Name');
      expect(mockSchemaNode2.label).toBe('Family Name');
    });
  });

  describe('apply - resource level', () => {
    it('should set label on resource when path is a base path without HTTP method and no method in context', () => {
      const mockResource = {
        name: 'Templates',
        slug: 'templates',
        uigenId: 'templates',
        operations: [],
        schema: {} as SchemaNode,
        relationships: []
      };
      
      const element: OpenAPIV3.OperationObject = {
        responses: {}
      };
      
      const context: AnnotationContext = {
        element,
        path: '/api/v1/templates',
        utils: mockUtils,
        ir: mockIR,
        resource: mockResource
      };
      
      handler.apply('Document Templates', context);
      
      expect(mockResource.label).toBe('Document Templates');
    });
    
    it('should set label on resource for single-operation resource when context.method is present', () => {
      const mockResource = {
        name: 'Me',
        slug: 'me',
        uigenId: 'me',
        operations: [{ id: 'get_me', method: 'GET' as any }],
        schema: {} as SchemaNode,
        relationships: []
      };
      
      const element: OpenAPIV3.OperationObject = {
        responses: {}
      };
      
      const context: AnnotationContext = {
        element,
        path: '/api/v1/auth/me',
        method: 'GET' as any,
        utils: mockUtils,
        ir: mockIR,
        resource: mockResource
      };
      
      handler.apply('My Profile', context);
      
      expect(mockResource.label).toBe('My Profile');
    });
    
    it('should NOT set label on resource for multi-operation resource when context.method is present', () => {
      const mockResource = {
        name: 'Templates',
        slug: 'templates',
        uigenId: 'templates',
        operations: [
          { id: 'post_templates', method: 'POST' as any },
          { id: 'get_templates', method: 'GET' as any },
          { id: 'delete_template', method: 'DELETE' as any }
        ],
        schema: {} as SchemaNode,
        relationships: []
      };
      
      const element: OpenAPIV3.OperationObject = {
        responses: {}
      };
      
      const context: AnnotationContext = {
        element,
        path: '/api/v1/templates/{id}',
        method: 'DELETE' as any,
        utils: mockUtils,
        ir: mockIR,
        resource: mockResource
      };
      
      handler.apply('Delete Template', context);
      
      expect(mockResource.label).toBeUndefined();
    });
    
    it('should NOT set label on resource when path has HTTP method prefix for multi-operation resource', () => {
      const mockResource = {
        name: 'Templates',
        slug: 'templates',
        uigenId: 'templates',
        operations: [
          { id: 'post_templates', method: 'POST' as any },
          { id: 'delete_template', method: 'DELETE' as any }
        ],
        schema: {} as SchemaNode,
        relationships: []
      };
      
      const element: OpenAPIV3.OperationObject = {
        responses: {}
      };
      
      const context: AnnotationContext = {
        element,
        path: 'DELETE:/api/v1/templates/{id}',
        utils: mockUtils,
        ir: mockIR,
        resource: mockResource
      };
      
      handler.apply('Delete Template', context);
      
      expect(mockResource.label).toBeUndefined();
    });
    
    it('should set label on resource when path has HTTP method prefix for single-operation resource', () => {
      const mockResource = {
        name: 'Me',
        slug: 'me',
        uigenId: 'me',
        operations: [{ id: 'get_me', method: 'GET' as any }],
        schema: {} as SchemaNode,
        relationships: []
      };
      
      const element: OpenAPIV3.OperationObject = {
        responses: {}
      };
      
      const context: AnnotationContext = {
        element,
        path: 'GET:/api/v1/auth/me',
        utils: mockUtils,
        ir: mockIR,
        resource: mockResource
      };
      
      handler.apply('My Profile', context);
      
      expect(mockResource.label).toBe('My Profile');
    });
    
    it('should handle all HTTP methods correctly for multi-operation resources', () => {
      const methods = ['GET:', 'POST:', 'PUT:', 'PATCH:', 'DELETE:'];
      
      for (const method of methods) {
        const mockResource = {
          name: 'Templates',
          slug: 'templates',
          uigenId: 'templates',
          operations: [
            { id: 'op1', method: 'GET' as any },
            { id: 'op2', method: 'POST' as any }
          ],
          schema: {} as SchemaNode,
          relationships: []
        };
        
        const context: AnnotationContext = {
          element: { responses: {} },
          path: `${method}/api/v1/templates`,
          utils: mockUtils,
          ir: mockIR,
          resource: mockResource
        };
        
        handler.apply('Some Label', context);
        
        expect(mockResource.label).toBeUndefined();
      }
    });
    
    it('should override existing resource label', () => {
      const mockResource = {
        name: 'Templates',
        slug: 'templates',
        uigenId: 'templates',
        label: 'Old Label',
        operations: [],
        schema: {} as SchemaNode,
        relationships: []
      };
      
      const element: OpenAPIV3.OperationObject = {
        responses: {}
      };
      
      const context: AnnotationContext = {
        element,
        path: '/api/v1/templates',
        utils: mockUtils,
        ir: mockIR,
        resource: mockResource
      };
      
      handler.apply('Document Templates', context);
      
      expect(mockResource.label).toBe('Document Templates');
    });
    
    it('should not throw when resource is undefined', () => {
      const element: OpenAPIV3.OperationObject = {
        responses: {}
      };
      
      const context: AnnotationContext = {
        element,
        path: '/api/v1/templates',
        utils: mockUtils,
        ir: mockIR
      };
      
      expect(() => handler.apply('Document Templates', context)).not.toThrow();
    });
    
    it('should set schema node label but NOT resource label for multi-operation resource when method is present', () => {
      const mockSchemaNode: SchemaNode = {
        type: 'string',
        key: 'fieldName',
        label: 'Field Name',
        required: false
      };
      
      const mockResource = {
        name: 'Templates',
        slug: 'templates',
        uigenId: 'templates',
        operations: [
          { id: 'post_templates', method: 'POST' as any },
          { id: 'get_templates', method: 'GET' as any }
        ],
        schema: {} as SchemaNode,
        relationships: []
      };
      
      const element: OpenAPIV3.OperationObject = {
        responses: {}
      };
      
      const context: AnnotationContext = {
        element,
        path: '/api/v1/templates',
        method: 'POST' as any,
        utils: mockUtils,
        ir: mockIR,
        schemaNode: mockSchemaNode,
        resource: mockResource
      };
      
      handler.apply('Upload Template', context);
      
      expect(mockSchemaNode.label).toBe('Upload Template');
      expect(mockResource.label).toBeUndefined();
    });
    
    it('should set both schema node and resource labels for single-operation resource when method is present', () => {
      const mockSchemaNode: SchemaNode = {
        type: 'string',
        key: 'fieldName',
        label: 'Field Name',
        required: false
      };
      
      const mockResource = {
        name: 'Me',
        slug: 'me',
        uigenId: 'me',
        operations: [{ id: 'get_me', method: 'GET' as any }],
        schema: {} as SchemaNode,
        relationships: []
      };
      
      const element: OpenAPIV3.OperationObject = {
        responses: {}
      };
      
      const context: AnnotationContext = {
        element,
        path: '/api/v1/auth/me',
        method: 'GET' as any,
        utils: mockUtils,
        ir: mockIR,
        schemaNode: mockSchemaNode,
        resource: mockResource
      };
      
      handler.apply('My Profile', context);
      
      expect(mockSchemaNode.label).toBe('My Profile');
      expect(mockResource.label).toBe('My Profile');
    });
  });
});
