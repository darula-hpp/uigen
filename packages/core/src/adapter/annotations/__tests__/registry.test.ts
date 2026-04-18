import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnnotationHandlerRegistry } from '../registry.js';
import type { AnnotationHandler, AnnotationContext } from '../types.js';
import type { UIGenApp } from '../../../ir/types.js';

describe('AnnotationHandlerRegistry', () => {
  let registry: AnnotationHandlerRegistry;

  beforeEach(() => {
    registry = AnnotationHandlerRegistry.getInstance();
    registry.clear();
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = AnnotationHandlerRegistry.getInstance();
      const instance2 = AnnotationHandlerRegistry.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('registration', () => {
    it('should register a single handler', () => {
      const handler = createMockHandler('x-test-annotation');
      registry.register(handler);
      
      const retrieved = registry.get('x-test-annotation');
      expect(retrieved).toBe(handler);
    });

    it('should register multiple handlers', () => {
      const handler1 = createMockHandler('x-test-1');
      const handler2 = createMockHandler('x-test-2');
      
      registry.register(handler1);
      registry.register(handler2);
      
      expect(registry.get('x-test-1')).toBe(handler1);
      expect(registry.get('x-test-2')).toBe(handler2);
    });

    it('should warn and overwrite on duplicate registration', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const handler1 = createMockHandler('x-test-annotation');
      const handler2 = createMockHandler('x-test-annotation');
      
      registry.register(handler1);
      registry.register(handler2);
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Handler for annotation "x-test-annotation" already registered. Overwriting.'
      );
      expect(registry.get('x-test-annotation')).toBe(handler2);
      
      consoleWarnSpy.mockRestore();
    });

    it('should allow override of existing handler', () => {
      const handler1 = createMockHandler('x-test-annotation');
      const handler2 = createMockHandler('x-test-annotation');
      
      registry.register(handler1);
      registry.register(handler2);
      
      const retrieved = registry.get('x-test-annotation');
      expect(retrieved).toBe(handler2);
      expect(retrieved).not.toBe(handler1);
    });
  });

  describe('retrieval', () => {
    it('should retrieve existing handler', () => {
      const handler = createMockHandler('x-test-annotation');
      registry.register(handler);
      
      const retrieved = registry.get('x-test-annotation');
      expect(retrieved).toBe(handler);
    });

    it('should return undefined for non-existing handler', () => {
      const retrieved = registry.get('x-non-existent');
      expect(retrieved).toBeUndefined();
    });

    it('should have O(1) performance for retrieval', () => {
      // Register many handlers
      for (let i = 0; i < 1000; i++) {
        registry.register(createMockHandler(`x-test-${i}`));
      }
      
      // Retrieval should be fast (O(1))
      const start = performance.now();
      registry.get('x-test-500');
      const end = performance.now();
      
      // Should complete in less than 1ms (generous threshold for O(1))
      expect(end - start).toBeLessThan(1);
    });
  });

  describe('processAnnotations execution order', () => {
    it('should execute ignore handler first', () => {
      const executionOrder: string[] = [];
      
      const ignoreHandler = createMockHandler('x-uigen-ignore', () => {
        executionOrder.push('ignore');
      });
      const labelHandler = createMockHandler('x-uigen-label', () => {
        executionOrder.push('label');
      });
      const loginHandler = createMockHandler('x-uigen-login', () => {
        executionOrder.push('login');
      });
      
      registry.register(labelHandler);
      registry.register(loginHandler);
      registry.register(ignoreHandler);
      
      const context = createMockContext({
        'x-uigen-ignore': true,
        'x-uigen-label': 'Test',
        'x-uigen-login': true
      });
      
      registry.processAnnotations(context);
      
      expect(executionOrder[0]).toBe('ignore');
    });

    it('should execute login handler second', () => {
      const executionOrder: string[] = [];
      
      const ignoreHandler = createMockHandler('x-uigen-ignore', () => {
        executionOrder.push('ignore');
      });
      const labelHandler = createMockHandler('x-uigen-label', () => {
        executionOrder.push('label');
      });
      const loginHandler = createMockHandler('x-uigen-login', () => {
        executionOrder.push('login');
      });
      
      registry.register(labelHandler);
      registry.register(loginHandler);
      registry.register(ignoreHandler);
      
      const context = createMockContext({
        'x-uigen-ignore': true,
        'x-uigen-label': 'Test',
        'x-uigen-login': true
      });
      
      registry.processAnnotations(context);
      
      expect(executionOrder[1]).toBe('login');
    });

    it('should execute label handler third', () => {
      const executionOrder: string[] = [];
      
      const ignoreHandler = createMockHandler('x-uigen-ignore', () => {
        executionOrder.push('ignore');
      });
      const labelHandler = createMockHandler('x-uigen-label', () => {
        executionOrder.push('label');
      });
      const loginHandler = createMockHandler('x-uigen-login', () => {
        executionOrder.push('login');
      });
      
      registry.register(labelHandler);
      registry.register(loginHandler);
      registry.register(ignoreHandler);
      
      const context = createMockContext({
        'x-uigen-ignore': true,
        'x-uigen-label': 'Test',
        'x-uigen-login': true
      });
      
      registry.processAnnotations(context);
      
      expect(executionOrder[2]).toBe('label');
    });
  });

  describe('error handling', () => {
    it('should handle handler throwing during extract', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const handler = createMockHandler('x-test-annotation');
      handler.extract = () => {
        throw new Error('Extract failed');
      };
      
      registry.register(handler);
      const context = createMockContext({ 'x-test-annotation': 'value' });
      
      // Should not throw
      expect(() => registry.processAnnotations(context)).not.toThrow();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error executing handler "x-test-annotation":',
        'Extract failed'
      );
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle handler throwing during validate', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const handler = createMockHandler('x-test-annotation');
      handler.validate = () => {
        throw new Error('Validate failed');
      };
      
      registry.register(handler);
      const context = createMockContext({ 'x-test-annotation': 'value' });
      
      // Should not throw
      expect(() => registry.processAnnotations(context)).not.toThrow();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error executing handler "x-test-annotation":',
        'Validate failed'
      );
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle handler throwing during apply', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const handler = createMockHandler('x-test-annotation');
      handler.apply = () => {
        throw new Error('Apply failed');
      };
      
      registry.register(handler);
      const context = createMockContext({ 'x-test-annotation': 'value' });
      
      // Should not throw
      expect(() => registry.processAnnotations(context)).not.toThrow();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error executing handler "x-test-annotation":',
        'Apply failed'
      );
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('clear', () => {
    it('should clear all registered handlers', () => {
      const handler1 = createMockHandler('x-test-1');
      const handler2 = createMockHandler('x-test-2');
      
      registry.register(handler1);
      registry.register(handler2);
      
      expect(registry.get('x-test-1')).toBe(handler1);
      expect(registry.get('x-test-2')).toBe(handler2);
      
      registry.clear();
      
      expect(registry.get('x-test-1')).toBeUndefined();
      expect(registry.get('x-test-2')).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return all registered handlers', () => {
      const handler1 = createMockHandler('x-test-1');
      const handler2 = createMockHandler('x-test-2');
      
      registry.register(handler1);
      registry.register(handler2);
      
      const all = registry.getAll();
      expect(all).toHaveLength(2);
      expect(all).toContain(handler1);
      expect(all).toContain(handler2);
    });

    it('should return empty array when no handlers registered', () => {
      const all = registry.getAll();
      expect(all).toHaveLength(0);
    });
  });
  
  describe('config loader integration and precedence', () => {
    it('should skip disabled annotations even if present in spec', () => {
      const handler = createMockHandler('x-uigen-label');
      const applySpy = vi.spyOn(handler, 'apply');
      
      registry.register(handler);
      
      // Create mock config loader that disables the annotation
      const mockConfigLoader = {
        isAnnotationDisabled: vi.fn(() => true),
        getAnnotationConfig: vi.fn(() => undefined)
      } as any;
      
      registry.setConfigLoader(mockConfigLoader);
      
      const context = createMockContext({ 'x-uigen-label': 'Test Label' });
      registry.processAnnotations(context);
      
      // Handler should not be applied
      expect(applySpy).not.toHaveBeenCalled();
      expect(mockConfigLoader.isAnnotationDisabled).toHaveBeenCalledWith('x-uigen-label');
    });
    
    it('should use spec value when both spec and config have values', () => {
      const handler = createMockHandler('x-uigen-label');
      const applySpy = vi.spyOn(handler, 'apply');
      
      registry.register(handler);
      
      // Create mock config loader with default value
      const mockConfigLoader = {
        isAnnotationDisabled: vi.fn(() => false),
        getAnnotationConfig: vi.fn(() => 'Config Label')
      } as any;
      
      registry.setConfigLoader(mockConfigLoader);
      
      const context = createMockContext({ 'x-uigen-label': 'Spec Label' });
      registry.processAnnotations(context);
      
      // Should use spec value (precedence)
      expect(applySpy).toHaveBeenCalledWith('Spec Label', context);
    });
    
    it('should use config value when only config has value', () => {
      const handler = createMockHandler('x-uigen-label');
      const applySpy = vi.spyOn(handler, 'apply');
      
      registry.register(handler);
      
      // Create mock config loader with default value
      const mockConfigLoader = {
        isAnnotationDisabled: vi.fn(() => false),
        getAnnotationConfig: vi.fn(() => 'Config Label')
      } as any;
      
      registry.setConfigLoader(mockConfigLoader);
      
      const context = createMockContext({}); // No spec value
      registry.processAnnotations(context);
      
      // Should use config value
      expect(applySpy).toHaveBeenCalledWith('Config Label', context);
    });
    
    it('should use spec value when only spec has value', () => {
      const handler = createMockHandler('x-uigen-label');
      const applySpy = vi.spyOn(handler, 'apply');
      
      registry.register(handler);
      
      // Create mock config loader with no value
      const mockConfigLoader = {
        isAnnotationDisabled: vi.fn(() => false),
        getAnnotationConfig: vi.fn(() => undefined)
      } as any;
      
      registry.setConfigLoader(mockConfigLoader);
      
      const context = createMockContext({ 'x-uigen-label': 'Spec Label' });
      registry.processAnnotations(context);
      
      // Should use spec value
      expect(applySpy).toHaveBeenCalledWith('Spec Label', context);
    });
    
    it('should not apply when neither spec nor config has value', () => {
      const handler = createMockHandler('x-uigen-label');
      const applySpy = vi.spyOn(handler, 'apply');
      
      registry.register(handler);
      
      // Create mock config loader with no value
      const mockConfigLoader = {
        isAnnotationDisabled: vi.fn(() => false),
        getAnnotationConfig: vi.fn(() => undefined)
      } as any;
      
      registry.setConfigLoader(mockConfigLoader);
      
      const context = createMockContext({}); // No spec value
      registry.processAnnotations(context);
      
      // Should not apply
      expect(applySpy).not.toHaveBeenCalled();
    });
    
    it('should work without config loader (backward compatibility)', () => {
      const handler = createMockHandler('x-uigen-label');
      const applySpy = vi.spyOn(handler, 'apply');
      
      registry.register(handler);
      // No config loader set
      
      const context = createMockContext({ 'x-uigen-label': 'Spec Label' });
      registry.processAnnotations(context);
      
      // Should use spec value normally
      expect(applySpy).toHaveBeenCalledWith('Spec Label', context);
    });
  });
});

// Helper functions
function createMockHandler(name: string, onApply?: () => void): AnnotationHandler {
  return {
    name,
    extract: (context: AnnotationContext) => {
      return (context.element as any)[name];
    },
    validate: () => true,
    apply: () => {
      if (onApply) onApply();
    }
  };
}

function createMockContext(element: any): AnnotationContext {
  const mockIR: UIGenApp = {
    meta: { title: 'Test API', version: '1.0.0' },
    resources: [],
    auth: { schemes: [], globalRequired: false },
    dashboard: { enabled: true, widgets: [] },
    servers: [{ url: 'http://localhost:3000' }]
  };

  return {
    element,
    path: '/test',
    utils: {
      humanize: (str: string) => str,
      resolveRef: () => null,
      logError: () => {},
      logWarning: () => {}
    },
    ir: mockIR
  };
}
