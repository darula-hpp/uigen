import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IgnoreHandler } from '../ignore-handler.js';
import type { AnnotationContext, AdapterUtils } from '../../types.js';
import type { OpenAPIV3 } from 'openapi-types';
import type { UIGenApp, Operation } from '../../../../ir/types.js';

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
});
