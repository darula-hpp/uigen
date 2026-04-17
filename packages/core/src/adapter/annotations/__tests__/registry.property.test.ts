import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { AnnotationHandlerRegistry } from '../registry.js';
import type { AnnotationHandler, AnnotationContext } from '../types.js';
import type { UIGenApp } from '../../../ir/types.js';

/**
 * Property-Based Tests for AnnotationHandlerRegistry
 * 
 * These tests validate universal correctness properties across random inputs
 * using fast-check with minimum 100 iterations per property.
 */

describe('AnnotationHandlerRegistry: Property-Based Tests', () => {
  let registry: AnnotationHandlerRegistry;

  beforeEach(() => {
    registry = AnnotationHandlerRegistry.getInstance();
    registry.clear();
  });

  /**
   * Property 1: Registration idempotence
   * Registering the same handler twice results in single registration
   * **Validates: Requirements 1.5**
   */
  describe('Property 1: Registration idempotence', () => {
    it('should result in single registration when handler registered multiple times', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).map(s => `x-${s.replace(/[^a-z-]/gi, '')}`),
          fc.integer({ min: 2, max: 10 }),
          (handlerName, registrationCount) => {
            registry.clear();
            
            const handler = createMockHandler(handlerName);
            
            // Register the same handler multiple times
            for (let i = 0; i < registrationCount; i++) {
              registry.register(handler);
            }
            
            // Should only have one registration
            const retrieved = registry.get(handlerName);
            expect(retrieved).toBe(handler);
            
            // getAll should return exactly one handler
            const all = registry.getAll();
            const matchingHandlers = all.filter(h => h.name === handlerName);
            expect(matchingHandlers).toHaveLength(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should overwrite previous handler when registering with same name', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).map(s => `x-${s.replace(/[^a-z-]/gi, '')}`),
          (handlerName) => {
            registry.clear();
            
            const handler1 = createMockHandler(handlerName);
            const handler2 = createMockHandler(handlerName);
            
            registry.register(handler1);
            registry.register(handler2);
            
            // Should retrieve the second handler
            const retrieved = registry.get(handlerName);
            expect(retrieved).toBe(handler2);
            expect(retrieved).not.toBe(handler1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 2: Retrieval consistency
   * get(name) always returns the last registered handler for that name
   * **Validates: Requirements 1.2, 1.3**
   */
  describe('Property 2: Retrieval consistency', () => {
    it('should always return the last registered handler for a given name', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.string({ minLength: 1, maxLength: 50 }).map(s => `x-${s.replace(/[^a-z-]/gi, '')}`),
            { minLength: 1, maxLength: 20 }
          ),
          (handlerNames) => {
            registry.clear();
            
            // Create a map to track the last handler for each name
            const lastHandlers = new Map<string, AnnotationHandler>();
            
            // Register handlers (some names may repeat)
            for (const name of handlerNames) {
              const handler = createMockHandler(name);
              registry.register(handler);
              lastHandlers.set(name, handler);
            }
            
            // Verify that get() returns the last registered handler for each name
            for (const [name, expectedHandler] of lastHandlers.entries()) {
              const retrieved = registry.get(name);
              expect(retrieved).toBe(expectedHandler);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return undefined for non-existent handlers', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.string({ minLength: 1, maxLength: 50 }).map(s => `x-${s.replace(/[^a-z-]/gi, '')}`),
            { minLength: 1, maxLength: 20 }
          ),
          fc.string({ minLength: 1, maxLength: 50 }).map(s => `x-nonexistent-${s.replace(/[^a-z-]/gi, '')}`),
          (registeredNames, nonExistentName) => {
            registry.clear();
            
            // Register handlers
            for (const name of registeredNames) {
              registry.register(createMockHandler(name));
            }
            
            // Ensure nonExistentName is not in registeredNames
            if (!registeredNames.includes(nonExistentName)) {
              const retrieved = registry.get(nonExistentName);
              expect(retrieved).toBeUndefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 3: Processing order invariant
   * Priority handlers always execute before non-priority handlers
   * **Validates: Requirements 7.3**
   */
  describe('Property 3: Processing order invariant', () => {
    it('should always execute priority handlers before non-priority handlers', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.string({ minLength: 1, maxLength: 50 }).map(s => `x-custom-${s.replace(/[^a-z-]/gi, '')}`),
            { minLength: 1, maxLength: 10 }
          ),
          (customHandlerNames) => {
            registry.clear();
            
            const executionOrder: string[] = [];
            
            // Register priority handlers (ignore, login, label)
            const ignoreHandler = createMockHandler('x-uigen-ignore', () => {
              executionOrder.push('x-uigen-ignore');
            });
            const loginHandler = createMockHandler('x-uigen-login', () => {
              executionOrder.push('x-uigen-login');
            });
            const labelHandler = createMockHandler('x-uigen-label', () => {
              executionOrder.push('x-uigen-label');
            });
            
            // Register custom handlers
            const customHandlers = customHandlerNames.map(name => {
              return createMockHandler(name, () => {
                executionOrder.push(name);
              });
            });
            
            // Register in random order
            const allHandlers = [ignoreHandler, loginHandler, labelHandler, ...customHandlers];
            const shuffled = fc.sample(fc.shuffledSubarray(allHandlers, { minLength: allHandlers.length, maxLength: allHandlers.length }), 1)[0];
            
            for (const handler of shuffled) {
              registry.register(handler);
            }
            
            // Create context with all annotations present
            const element: any = {
              'x-uigen-ignore': true,
              'x-uigen-login': true,
              'x-uigen-label': 'Test'
            };
            for (const name of customHandlerNames) {
              element[name] = true;
            }
            
            const context = createMockContext(element);
            
            // Process annotations
            registry.processAnnotations(context);
            
            // Verify priority handlers executed first
            const ignoreIndex = executionOrder.indexOf('x-uigen-ignore');
            const loginIndex = executionOrder.indexOf('x-uigen-login');
            const labelIndex = executionOrder.indexOf('x-uigen-label');
            
            // Find the first custom handler index
            let firstCustomIndex = executionOrder.length;
            for (const name of customHandlerNames) {
              const index = executionOrder.indexOf(name);
              if (index !== -1 && index < firstCustomIndex) {
                firstCustomIndex = index;
              }
            }
            
            // Priority handlers should execute before any custom handler
            if (ignoreIndex !== -1 && firstCustomIndex < executionOrder.length) {
              expect(ignoreIndex).toBeLessThan(firstCustomIndex);
            }
            if (loginIndex !== -1 && firstCustomIndex < executionOrder.length) {
              expect(loginIndex).toBeLessThan(firstCustomIndex);
            }
            if (labelIndex !== -1 && firstCustomIndex < executionOrder.length) {
              expect(labelIndex).toBeLessThan(firstCustomIndex);
            }
            
            // Verify specific order: ignore → login → label
            if (ignoreIndex !== -1 && loginIndex !== -1) {
              expect(ignoreIndex).toBeLessThan(loginIndex);
            }
            if (loginIndex !== -1 && labelIndex !== -1) {
              expect(loginIndex).toBeLessThan(labelIndex);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain priority order regardless of registration order', () => {
      fc.assert(
        fc.property(
          fc.shuffledSubarray([0, 1, 2], { minLength: 3, maxLength: 3 }),
          (registrationOrder) => {
            registry.clear();
            
            const executionOrder: string[] = [];
            const priorityHandlers = [
              createMockHandler('x-uigen-ignore', () => executionOrder.push('ignore')),
              createMockHandler('x-uigen-login', () => executionOrder.push('login')),
              createMockHandler('x-uigen-label', () => executionOrder.push('label'))
            ];
            
            // Register in the specified order (which is a permutation of [0,1,2])
            for (const index of registrationOrder) {
              registry.register(priorityHandlers[index]);
            }
            
            const context = createMockContext({
              'x-uigen-ignore': true,
              'x-uigen-login': true,
              'x-uigen-label': 'Test'
            });
            
            registry.processAnnotations(context);
            
            // Verify execution order is always ignore → login → label
            const expectedOrder = ['ignore', 'login', 'label'];
            const actualOrder = executionOrder.filter(name => expectedOrder.includes(name));
            expect(actualOrder).toEqual(expectedOrder);
          }
        ),
        { numRuns: 100 }
      );
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
