import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MaxFileSizeHandler } from '../max-file-size-handler.js';
import type { AnnotationContext, AdapterUtils } from '../../types.js';
import type { OpenAPIV3 } from 'openapi-types';
import type { UIGenApp, SchemaNode } from '../../../../ir/types.js';

describe('MaxFileSizeHandler', () => {
  let handler: MaxFileSizeHandler;
  let mockUtils: AdapterUtils;
  let mockIR: UIGenApp;
  
  beforeEach(() => {
    handler = new MaxFileSizeHandler();
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
      expect(handler.name).toBe('x-uigen-max-file-size');
    });
  });
  
  describe('metadata', () => {
    it('should have correct metadata structure', () => {
      expect(MaxFileSizeHandler.metadata).toEqual({
        name: 'x-uigen-max-file-size',
        description: 'Maximum file size in bytes',
        targetType: 'field',
        applicableWhen: {
          type: 'file'
        },
        parameterSchema: {
          type: 'number',
          minimum: 1,
          description: 'Maximum file size in bytes (e.g., 5242880 for 5MB)'
        },
        examples: expect.arrayContaining([
          expect.objectContaining({
            description: expect.any(String),
            value: expect.any(Number)
          })
        ])
      });
    });
    
    it('should have examples with correct byte values', () => {
      const examples = MaxFileSizeHandler.metadata.examples;
      
      // 5MB = 5 * 1024 * 1024 = 5242880
      expect(examples).toContainEqual({ description: '5MB', value: 5242880 });
      
      // 10MB = 10 * 1024 * 1024 = 10485760
      expect(examples).toContainEqual({ description: '10MB', value: 10485760 });
      
      // 100MB = 100 * 1024 * 1024 = 104857600
      expect(examples).toContainEqual({ description: '100MB', value: 104857600 });
    });
  });
  
  describe('extract', () => {
    it('should extract valid number', () => {
      const element: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary',
        'x-uigen-max-file-size': 5242880
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: 'avatar',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBe(5242880);
    });
    
    it('should extract zero (even though validation will reject it)', () => {
      const element: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary',
        'x-uigen-max-file-size': 0
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: 'file',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBe(0);
    });
    
    it('should extract large number', () => {
      const element: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary',
        'x-uigen-max-file-size': 1073741824 // 1GB
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: 'video',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBe(1073741824);
    });
    
    it('should return undefined for missing annotation', () => {
      const element: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary'
      };
      
      const context: AnnotationContext = {
        element,
        path: 'file',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBeUndefined();
    });
    
    it('should return undefined for string value', () => {
      const element: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary',
        'x-uigen-max-file-size': '5242880'
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: 'avatar',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBeUndefined();
    });
    
    it('should return undefined for null value', () => {
      const element: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary',
        'x-uigen-max-file-size': null
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: 'file',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBeUndefined();
    });
    
    it('should return undefined for object value', () => {
      const element: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary',
        'x-uigen-max-file-size': { size: 5242880 }
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: 'file',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBeUndefined();
    });
    
    it('should return undefined for array value', () => {
      const element: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary',
        'x-uigen-max-file-size': [5242880]
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: 'file',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBeUndefined();
    });
  });
  
  describe('validate', () => {
    it('should return true for positive number', () => {
      const result = handler.validate(5242880);
      expect(result).toBe(true);
    });
    
    it('should return true for small positive number', () => {
      const result = handler.validate(1);
      expect(result).toBe(true);
    });
    
    it('should return true for large positive number', () => {
      const result = handler.validate(10737418240); // 10GB
      expect(result).toBe(true);
    });
    
    it('should return true for decimal number', () => {
      const result = handler.validate(5242880.5);
      expect(result).toBe(true);
    });
    
    it('should return false and warn for zero', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = handler.validate(0);
      
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'x-uigen-max-file-size must be positive'
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should return false and warn for negative number', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = handler.validate(-5242880);
      
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'x-uigen-max-file-size must be positive'
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should return false and warn for NaN', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = handler.validate(NaN);
      
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'x-uigen-max-file-size must be finite'
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should return false and warn for Infinity', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = handler.validate(Infinity);
      
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'x-uigen-max-file-size must be finite'
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should return false and warn for negative Infinity', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = handler.validate(-Infinity);
      
      expect(result).toBe(false);
      // -Infinity is caught by the <= 0 check first
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'x-uigen-max-file-size must be positive'
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should return false and warn for string value', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = handler.validate('5242880' as any);
      
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'x-uigen-max-file-size must be a number, got string'
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should return false and warn for null value', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = handler.validate(null as any);
      
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'x-uigen-max-file-size must be a number, got object'
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should return false and warn for undefined value', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = handler.validate(undefined as any);
      
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'x-uigen-max-file-size must be a number, got undefined'
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should return false and warn for object value', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = handler.validate({ size: 5242880 } as any);
      
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'x-uigen-max-file-size must be a number, got object'
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should return false and warn for array value', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = handler.validate([5242880] as any);
      
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'x-uigen-max-file-size must be a number, got object'
      );
      
      consoleWarnSpy.mockRestore();
    });
  });
  
  describe('apply', () => {
    it('should not throw when called (validation only)', () => {
      const mockSchemaNode: SchemaNode = {
        type: 'file',
        key: 'avatar',
        label: 'Avatar',
        required: false
      };
      
      const element: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary'
      };
      
      const context: AnnotationContext = {
        element,
        path: 'avatar',
        utils: mockUtils,
        ir: mockIR,
        schemaNode: mockSchemaNode
      };
      
      // Handler validates but doesn't apply - FileMetadataVisitor handles extraction
      expect(() => handler.apply(5242880, context)).not.toThrow();
    });
    
    it('should not throw when schema node is undefined', () => {
      const element: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary'
      };
      
      const context: AnnotationContext = {
        element,
        path: 'file',
        utils: mockUtils,
        ir: mockIR
      };
      
      expect(() => handler.apply(10485760, context)).not.toThrow();
    });
    
    it('should not throw for large file size', () => {
      const mockSchemaNode: SchemaNode = {
        type: 'file',
        key: 'video',
        label: 'Video',
        required: false
      };
      
      const element: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary'
      };
      
      const context: AnnotationContext = {
        element,
        path: 'video',
        utils: mockUtils,
        ir: mockIR,
        schemaNode: mockSchemaNode
      };
      
      expect(() => handler.apply(1073741824, context)).not.toThrow();
    });
  });
});
