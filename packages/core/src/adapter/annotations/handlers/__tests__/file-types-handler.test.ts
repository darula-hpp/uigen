import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FileTypesHandler } from '../file-types-handler.js';
import type { AnnotationContext, AdapterUtils } from '../../types.js';
import type { OpenAPIV3 } from 'openapi-types';
import type { UIGenApp, SchemaNode } from '../../../../ir/types.js';

describe('FileTypesHandler', () => {
  let handler: FileTypesHandler;
  let mockUtils: AdapterUtils;
  let mockIR: UIGenApp;
  
  beforeEach(() => {
    handler = new FileTypesHandler();
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
      expect(handler.name).toBe('x-uigen-file-types');
    });
  });
  
  describe('metadata', () => {
    it('should have correct metadata structure', () => {
      expect(FileTypesHandler.metadata).toEqual({
        name: 'x-uigen-file-types',
        description: 'Array of allowed MIME types for file uploads',
        targetType: 'field',
        applicableWhen: {
          type: 'file'
        },
        parameterSchema: {
          type: 'array',
          items: {
            type: 'string',
            pattern: '^[a-z*]+/[a-z0-9\\-\\+\\.\\*]+$'
          },
          description: 'MIME types (e.g., image/jpeg, application/pdf, image/*)'
        },
        examples: expect.arrayContaining([
          expect.objectContaining({
            description: expect.any(String),
            value: expect.any(Array)
          })
        ])
      });
    });
  });
  
  describe('extract', () => {
    it('should extract valid array of MIME types', () => {
      const element: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary',
        'x-uigen-file-types': ['image/jpeg', 'image/png']
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: 'avatar',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toEqual(['image/jpeg', 'image/png']);
    });
    
    it('should extract array with wildcard MIME types', () => {
      const element: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary',
        'x-uigen-file-types': ['image/*', 'video/*']
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: 'media',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toEqual(['image/*', 'video/*']);
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
    
    it('should return undefined for non-array value', () => {
      const element: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'binary',
        'x-uigen-file-types': 'image/jpeg'
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
        'x-uigen-file-types': null
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
        'x-uigen-file-types': { types: ['image/jpeg'] }
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
    it('should return true for valid array of MIME types', () => {
      const result = handler.validate(['image/jpeg', 'image/png', 'image/webp']);
      expect(result).toBe(true);
    });
    
    it('should return true for array with wildcard MIME types', () => {
      const result = handler.validate(['image/*', 'video/*', 'audio/*']);
      expect(result).toBe(true);
    });
    
    it('should return true for complex MIME types', () => {
      const result = handler.validate([
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/pdf',
        'text/plain'
      ]);
      expect(result).toBe(true);
    });
    
    it('should return true for all files wildcard', () => {
      const result = handler.validate(['*/*']);
      expect(result).toBe(true);
    });
    
    it('should return false and warn for non-array value', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = handler.validate('image/jpeg' as any);
      
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'x-uigen-file-types must be an array, got string'
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should return false and warn for empty array', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = handler.validate([]);
      
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'x-uigen-file-types cannot be empty'
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should return false and warn for array with non-string items', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = handler.validate(['image/jpeg', 123, 'image/png'] as any);
      
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'x-uigen-file-types items must be strings, got number'
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should return false and warn for invalid MIME type pattern', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = handler.validate(['image/jpeg', 'invalid-mime-type', 'image/png']);
      
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Invalid MIME type: invalid-mime-type'
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should return false and warn for MIME type without slash', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = handler.validate(['image/jpeg', 'jpeg', 'image/png']);
      
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Invalid MIME type: jpeg'
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should return false and warn for MIME type with invalid characters', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = handler.validate(['image/jpeg', 'image/@invalid', 'image/png']);
      
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Invalid MIME type: image/@invalid'
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should return false and warn for null value', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = handler.validate(null as any);
      
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'x-uigen-file-types must be an array, got object'
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should return false and warn for undefined value', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = handler.validate(undefined as any);
      
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'x-uigen-file-types must be an array, got undefined'
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
      expect(() => handler.apply(['image/jpeg', 'image/png'], context)).not.toThrow();
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
      
      expect(() => handler.apply(['image/jpeg'], context)).not.toThrow();
    });
  });
});
