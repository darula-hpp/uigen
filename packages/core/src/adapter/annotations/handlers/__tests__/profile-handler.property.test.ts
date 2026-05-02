import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { ProfileHandler } from '../profile-handler.js';
import type { AnnotationContext, AdapterUtils } from '../../types.js';
import type { UIGenApp, Resource } from '../../../../ir/types.js';

// Helper function to create mock context
function makeContext(value: any, resource?: Resource): AnnotationContext {
  const mockUtils: AdapterUtils = {
    humanize: vi.fn((str: string) => str.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())),
    resolveRef: vi.fn(),
    logError: vi.fn(),
    logWarning: vi.fn()
  };
  
  const mockIR: UIGenApp = {
    meta: { title: 'Test', version: '1.0.0' },
    resources: [],
    auth: { schemes: [], globalRequired: false },
    dashboard: { enabled: true, widgets: [] },
    servers: [],
    parsingErrors: []
  } as UIGenApp;

  const element = {
    responses: {},
    'x-uigen-profile': value
  } as any;

  return {
    element,
    path: '/api/v1/users/me',
    utils: mockUtils,
    ir: mockIR,
    resource
  };
}

describe('ProfileHandler - Property-Based Tests', () => {
  const handler = new ProfileHandler();

  // Feature: x-uigen-profile, Property 1: Boolean Value Acceptance
  it('Property 1: Boolean Value Acceptance', () => {
    /**
     * **Validates: Requirements 1.2**
     * 
     * For any boolean value (true or false), the ProfileHandler SHALL successfully 
     * extract and validate the value without errors.
     */
    fc.assert(
      fc.property(
        fc.boolean(),
        (value) => {
          const context = makeContext(value);
          
          // Extract the value
          const extracted = handler.extract(context);
          
          // Validate the extracted value
          const isValid = handler.validate(extracted!);
          
          // Assertions
          expect(extracted).toBe(value);
          expect(isValid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: x-uigen-profile, Property 2: Type Validation with Error Handling
  it('Property 2: Type Validation with Error Handling', () => {
    /**
     * **Validates: Requirements 1.6, 1.7**
     * 
     * For any non-boolean value (string, number, object, array, null), the ProfileHandler 
     * SHALL reject the value during validation, log an appropriate warning message, and return false.
     */
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string(),
          fc.integer(),
          fc.object(),
          fc.array(fc.anything()),
          fc.constant(null)
        ),
        (value) => {
          // Spy on console.warn to verify warning is logged
          const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
          
          // Validate the non-boolean value
          const isValid = handler.validate(value as any);
          
          // Assertions
          expect(isValid).toBe(false);
          expect(consoleWarnSpy).toHaveBeenCalled();
          expect(consoleWarnSpy).toHaveBeenCalledWith(
            expect.stringContaining('x-uigen-profile must be a boolean')
          );
          
          // Cleanup
          consoleWarnSpy.mockRestore();
        }
      ),
      { numRuns: 100 }
    );
  });
});
