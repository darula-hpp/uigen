import { describe, it, expect } from 'vitest';
import type { AnnotationHandler, AnnotationContext } from '../types.js';
import type { UIGenApp } from '../../../ir/types.js';

describe('AnnotationHandler Interface', () => {
  describe('interface contract', () => {
    it('should define required methods', () => {
      // Create a mock handler to verify the interface contract
      const mockHandler: AnnotationHandler<string> = {
        name: 'x-test-annotation',
        extract: (context: AnnotationContext) => {
          return (context.element as any)['x-test-annotation'];
        },
        validate: (value: string) => {
          return typeof value === 'string';
        },
        apply: (value: string, context: AnnotationContext) => {
          // Mock application logic
        }
      };

      expect(mockHandler.name).toBe('x-test-annotation');
      expect(typeof mockHandler.extract).toBe('function');
      expect(typeof mockHandler.validate).toBe('function');
      expect(typeof mockHandler.apply).toBe('function');
    });

    it('should allow extract to return undefined', () => {
      const mockHandler: AnnotationHandler<string> = {
        name: 'x-test-annotation',
        extract: () => undefined,
        validate: () => true,
        apply: () => {}
      };

      const mockContext = createMockContext({});
      const result = mockHandler.extract(mockContext);
      expect(result).toBeUndefined();
    });

    it('should allow validate to return boolean', () => {
      const mockHandler: AnnotationHandler<string> = {
        name: 'x-test-annotation',
        extract: () => 'test',
        validate: (value) => typeof value === 'string',
        apply: () => {}
      };

      expect(mockHandler.validate('test')).toBe(true);
      expect(mockHandler.validate(123 as any)).toBe(false);
    });

    it('should allow apply to modify context', () => {
      let applied = false;
      const mockHandler: AnnotationHandler<string> = {
        name: 'x-test-annotation',
        extract: () => 'test',
        validate: () => true,
        apply: () => {
          applied = true;
        }
      };

      const mockContext = createMockContext({});
      mockHandler.apply('test', mockContext);
      expect(applied).toBe(true);
    });
  });

  describe('AnnotationContext type', () => {
    it('should provide access to element', () => {
      const element = { 'x-test': 'value' };
      const context = createMockContext(element);
      expect(context.element).toBe(element);
    });

    it('should provide access to path', () => {
      const context = createMockContext({}, '/users/{id}');
      expect(context.path).toBe('/users/{id}');
    });

    it('should provide access to method when present', () => {
      const context = createMockContext({}, '/users', 'GET');
      expect(context.method).toBe('GET');
    });

    it('should provide access to utils', () => {
      const context = createMockContext({});
      expect(context.utils).toBeDefined();
      expect(typeof context.utils.humanize).toBe('function');
      expect(typeof context.utils.resolveRef).toBe('function');
      expect(typeof context.utils.logError).toBe('function');
      expect(typeof context.utils.logWarning).toBe('function');
    });

    it('should provide access to IR', () => {
      const context = createMockContext({});
      expect(context.ir).toBeDefined();
      expect(context.ir.meta).toBeDefined();
      expect(context.ir.resources).toBeDefined();
    });

    it('should allow optional parent', () => {
      const parent = { 'x-parent': 'value' };
      const context = createMockContext({}, '/users', undefined, parent);
      expect(context.parent).toBe(parent);
    });

    it('should allow optional resource', () => {
      const context = createMockContext({});
      expect(context.resource).toBeUndefined();
    });

    it('should allow optional operation', () => {
      const context = createMockContext({});
      expect(context.operation).toBeUndefined();
    });

    it('should allow optional schemaNode', () => {
      const context = createMockContext({});
      expect(context.schemaNode).toBeUndefined();
    });
  });
});

// Helper function to create mock context
function createMockContext(
  element: any,
  path: string = '/test',
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  parent?: any
): AnnotationContext {
  const mockIR: UIGenApp = {
    meta: { title: 'Test API', version: '1.0.0' },
    resources: [],
    auth: { schemes: [], globalRequired: false },
    dashboard: { enabled: true, widgets: [] },
    servers: [{ url: 'http://localhost:3000' }]
  };

  return {
    element,
    path,
    method,
    parent,
    utils: {
      humanize: (str: string) => str,
      resolveRef: () => null,
      logError: () => {},
      logWarning: () => {}
    },
    ir: mockIR
  };
}
