import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginHandler } from '../login-handler.js';
import type { AnnotationContext, AdapterUtils } from '../../types.js';
import type { OpenAPIV3 } from 'openapi-types';
import type { UIGenApp, Operation } from '../../../../ir/types.js';

describe('LoginHandler', () => {
  let handler: LoginHandler;
  let mockUtils: AdapterUtils;
  let mockIR: UIGenApp;
  
  beforeEach(() => {
    handler = new LoginHandler();
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
      expect(handler.name).toBe('x-uigen-login');
    });
  });
  
  describe('extract', () => {
    it('should extract true boolean value', () => {
      const element: OpenAPIV3.OperationObject = {
        'x-uigen-login': true,
        responses: {}
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: '/auth/login',
        method: 'post',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBe(true);
    });
    
    it('should extract false boolean value', () => {
      const element: OpenAPIV3.OperationObject = {
        'x-uigen-login': false,
        responses: {}
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: '/auth/login',
        method: 'post',
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
        path: '/auth/login',
        method: 'post',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBeUndefined();
    });
    
    it('should return undefined for string value', () => {
      const element: OpenAPIV3.OperationObject = {
        'x-uigen-login': 'true',
        responses: {}
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: '/auth/login',
        method: 'post',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBeUndefined();
    });
    
    it('should return undefined for number value', () => {
      const element: OpenAPIV3.OperationObject = {
        'x-uigen-login': 1,
        responses: {}
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: '/auth/login',
        method: 'post',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBeUndefined();
    });
    
    it('should return undefined for null value', () => {
      const element: OpenAPIV3.OperationObject = {
        'x-uigen-login': null,
        responses: {}
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: '/auth/login',
        method: 'post',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBeUndefined();
    });
    
    it('should return undefined for undefined value', () => {
      const element: OpenAPIV3.OperationObject = {
        'x-uigen-login': undefined,
        responses: {}
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: '/auth/login',
        method: 'post',
        utils: mockUtils,
        ir: mockIR
      };
      
      const result = handler.extract(context);
      expect(result).toBeUndefined();
    });
    
    it('should return undefined for object value', () => {
      const element: OpenAPIV3.OperationObject = {
        'x-uigen-login': { enabled: true },
        responses: {}
      } as any;
      
      const context: AnnotationContext = {
        element,
        path: '/auth/login',
        method: 'post',
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
    
    it('should return false for string value', () => {
      const result = handler.validate('true' as any);
      expect(result).toBe(false);
    });
    
    it('should return false for number value', () => {
      const result = handler.validate(1 as any);
      expect(result).toBe(false);
    });
    
    it('should return false for null value', () => {
      const result = handler.validate(null as any);
      expect(result).toBe(false);
    });
    
    it('should return false for undefined value', () => {
      const result = handler.validate(undefined as any);
      expect(result).toBe(false);
    });
  });
  
  describe('apply', () => {
    it('should mark operation with __loginAnnotation flag when value is true', () => {
      const mockOperation: Operation = {
        method: 'POST',
        path: '/auth/login',
        id: 'login',
        uigenId: 'login',
        parameters: [],
        requestBody: null,
        responses: {},
        viewHint: 'create'
      } as any;
      
      const element: OpenAPIV3.OperationObject = {
        responses: {}
      };
      
      const context: AnnotationContext = {
        element,
        path: '/auth/login',
        method: 'post',
        utils: mockUtils,
        ir: mockIR,
        operation: mockOperation
      };
      
      handler.apply(true, context);
      
      expect((mockOperation as any).__loginAnnotation).toBe(true);
    });
    
    it('should mark operation with __loginAnnotation flag when value is false', () => {
      const mockOperation: Operation = {
        method: 'POST',
        path: '/auth/login',
        id: 'login',
        uigenId: 'login',
        parameters: [],
        requestBody: null,
        responses: {},
        viewHint: 'create'
      } as any;
      
      const element: OpenAPIV3.OperationObject = {
        responses: {}
      };
      
      const context: AnnotationContext = {
        element,
        path: '/auth/login',
        method: 'post',
        utils: mockUtils,
        ir: mockIR,
        operation: mockOperation
      };
      
      handler.apply(false, context);
      
      expect((mockOperation as any).__loginAnnotation).toBe(false);
    });
    
    it('should not throw when operation is undefined', () => {
      const element: OpenAPIV3.OperationObject = {
        responses: {}
      };
      
      const context: AnnotationContext = {
        element,
        path: '/auth/login',
        method: 'post',
        utils: mockUtils,
        ir: mockIR
      };
      
      expect(() => handler.apply(true, context)).not.toThrow();
    });
    
    it('should handle multiple operations independently', () => {
      const mockOperation1: Operation = {
        method: 'POST',
        path: '/auth/login',
        id: 'login',
        uigenId: 'login',
        parameters: [],
        requestBody: null,
        responses: {},
        viewHint: 'create'
      } as any;
      
      const mockOperation2: Operation = {
        method: 'POST',
        path: '/user/login',
        id: 'userLogin',
        uigenId: 'userLogin',
        parameters: [],
        requestBody: null,
        responses: {},
        viewHint: 'create'
      } as any;
      
      const context1: AnnotationContext = {
        element: { responses: {} },
        path: '/auth/login',
        method: 'post',
        utils: mockUtils,
        ir: mockIR,
        operation: mockOperation1
      };
      
      const context2: AnnotationContext = {
        element: { responses: {} },
        path: '/user/login',
        method: 'post',
        utils: mockUtils,
        ir: mockIR,
        operation: mockOperation2
      };
      
      handler.apply(true, context1);
      handler.apply(false, context2);
      
      expect((mockOperation1 as any).__loginAnnotation).toBe(true);
      expect((mockOperation2 as any).__loginAnnotation).toBe(false);
    });
    
    it('should support explicit inclusion (true)', () => {
      const mockOperation: Operation = {
        method: 'POST',
        path: '/api/authenticate',
        id: 'authenticate',
        uigenId: 'authenticate',
        parameters: [],
        requestBody: null,
        responses: {},
        viewHint: 'create'
      } as any;
      
      const context: AnnotationContext = {
        element: { responses: {} },
        path: '/api/authenticate',
        method: 'post',
        utils: mockUtils,
        ir: mockIR,
        operation: mockOperation
      };
      
      handler.apply(true, context);
      
      expect((mockOperation as any).__loginAnnotation).toBe(true);
    });
    
    it('should support explicit exclusion (false)', () => {
      const mockOperation: Operation = {
        method: 'POST',
        path: '/user/login',
        id: 'userLogin',
        uigenId: 'userLogin',
        parameters: [],
        requestBody: null,
        responses: {},
        viewHint: 'create'
      } as any;
      
      const context: AnnotationContext = {
        element: { responses: {} },
        path: '/user/login',
        method: 'post',
        utils: mockUtils,
        ir: mockIR,
        operation: mockOperation
      };
      
      handler.apply(false, context);
      
      expect((mockOperation as any).__loginAnnotation).toBe(false);
    });
  });
});
