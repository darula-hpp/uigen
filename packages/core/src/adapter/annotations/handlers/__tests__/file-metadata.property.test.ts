import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { FileTypesHandler } from '../file-types-handler.js';
import { MaxFileSizeHandler } from '../max-file-size-handler.js';

/**
 * Property-Based Tests for File Metadata Handlers
 * 
 * These tests use fast-check to generate random inputs and verify
 * that the handlers behave correctly across a wide range of scenarios.
 * 
 * Requirements: 6.4
 */
describe('File Metadata Handlers - Property-Based Tests', () => {
  describe('FileTypesHandler', () => {
    const handler = new FileTypesHandler();

    /**
     * Property 1: MIME type validation with random strings
     * 
     * Tests that the handler correctly validates MIME type patterns
     * and rejects invalid formats.
     */
    it('should validate MIME type format correctly', () => {
      // Valid MIME type pattern: type/subtype (e.g., image/jpeg, application/pdf)
      const validMimeTypeArb = fc.tuple(
        fc.stringMatching(/^[a-z*]+$/),
        fc.stringMatching(/^[a-z0-9\-\+\.\*]+$/)
      ).map(([type, subtype]) => `${type}/${subtype}`);

      fc.assert(
        fc.property(fc.array(validMimeTypeArb, { minLength: 1 }), (mimeTypes) => {
          const result = handler.validate(mimeTypes);
          expect(result).toBe(true);
        })
      );
    });

    it('should reject invalid MIME type patterns', () => {
      // Invalid patterns: missing slash, invalid characters, etc.
      const invalidMimeTypeArb = fc.oneof(
        fc.string().filter(s => !s.includes('/')), // No slash
        fc.string().filter(s => s.includes(' ')), // Contains space
        fc.constant(''), // Empty string
        fc.constant('/'), // Just slash
        fc.constant('type/'), // Missing subtype
        fc.constant('/subtype') // Missing type
      );

      fc.assert(
        fc.property(fc.array(invalidMimeTypeArb, { minLength: 1 }), (mimeTypes) => {
          const result = handler.validate(mimeTypes);
          expect(result).toBe(false);
        })
      );
    });

    /**
     * Property 2: Array operations
     * 
     * Tests that the handler correctly handles array operations
     * like adding and removing MIME types.
     */
    it('should handle array operations correctly', () => {
      const mimeTypeArb = fc.constantFrom(
        'image/jpeg',
        'image/png',
        'application/pdf',
        'video/mp4',
        'audio/mpeg'
      );

      fc.assert(
        fc.property(
          fc.array(mimeTypeArb, { minLength: 1, maxLength: 10 }),
          (mimeTypes) => {
            // Test that validation works for any subset
            const result = handler.validate(mimeTypes);
            expect(result).toBe(true);

            // Test that empty array is rejected
            expect(handler.validate([])).toBe(false);

            // Test that adding duplicates still validates
            const withDuplicates = [...mimeTypes, ...mimeTypes];
            expect(handler.validate(withDuplicates)).toBe(true);
          }
        )
      );
    });

    /**
     * Property 3: Handler idempotency
     * 
     * Tests that extracting and validating the same value multiple times
     * produces consistent results.
     */
    it('should be idempotent', () => {
      const mimeTypesArb = fc.array(
        fc.constantFrom('image/jpeg', 'image/png', 'application/pdf'),
        { minLength: 1, maxLength: 5 }
      );

      fc.assert(
        fc.property(mimeTypesArb, (mimeTypes) => {
          const context = {
            element: { 'x-uigen-file-types': mimeTypes },
            path: 'test',
            spec: {}
          };

          // Extract multiple times
          const extracted1 = handler.extract(context as any);
          const extracted2 = handler.extract(context as any);

          // Should return the same value
          expect(extracted1).toEqual(extracted2);

          // Validate multiple times
          if (extracted1) {
            const valid1 = handler.validate(extracted1);
            const valid2 = handler.validate(extracted1);
            expect(valid1).toBe(valid2);
          }
        })
      );
    });

    it('should reject non-array values', () => {
      const nonArrayArb = fc.oneof(
        fc.string(),
        fc.integer(),
        fc.boolean(),
        fc.object(),
        fc.constant(null),
        fc.constant(undefined)
      );

      fc.assert(
        fc.property(nonArrayArb, (value) => {
          const result = handler.validate(value as any);
          expect(result).toBe(false);
        })
      );
    });

    it('should reject arrays with non-string items', () => {
      const mixedArrayArb = fc.array(
        fc.oneof(
          fc.string(),
          fc.integer(),
          fc.boolean(),
          fc.constant(null)
        ),
        { minLength: 1 }
      ).filter(arr => arr.some(item => typeof item !== 'string'));

      fc.assert(
        fc.property(mixedArrayArb, (value) => {
          const result = handler.validate(value as any);
          expect(result).toBe(false);
        })
      );
    });
  });

  describe('MaxFileSizeHandler', () => {
    const handler = new MaxFileSizeHandler();

    /**
     * Property 1: File size validation with random numbers
     * 
     * Tests that the handler correctly validates positive finite numbers
     * and rejects invalid values.
     */
    it('should validate positive finite numbers', () => {
      // Generate positive finite numbers
      const positiveSizeArb = fc.integer({ min: 1, max: 1073741824 }); // 1 byte to 1GB

      fc.assert(
        fc.property(positiveSizeArb, (size) => {
          const result = handler.validate(size);
          expect(result).toBe(true);
        })
      );
    });

    it('should reject zero and negative numbers', () => {
      const invalidSizeArb = fc.oneof(
        fc.constant(0),
        fc.integer({ max: -1 })
      );

      fc.assert(
        fc.property(invalidSizeArb, (size) => {
          const result = handler.validate(size);
          expect(result).toBe(false);
        })
      );
    });

    it('should reject non-finite numbers', () => {
      const nonFiniteArb = fc.constantFrom(
        Infinity,
        -Infinity,
        NaN
      );

      fc.assert(
        fc.property(nonFiniteArb, (value) => {
          const result = handler.validate(value);
          expect(result).toBe(false);
        })
      );
    });

    it('should reject non-number values', () => {
      const nonNumberArb = fc.oneof(
        fc.string(),
        fc.boolean(),
        fc.array(fc.anything()),
        fc.object(),
        fc.constant(null),
        fc.constant(undefined)
      );

      fc.assert(
        fc.property(nonNumberArb, (value) => {
          const result = handler.validate(value as any);
          expect(result).toBe(false);
        })
      );
    });

    /**
     * Property 2: Handler idempotency
     * 
     * Tests that extracting and validating the same value multiple times
     * produces consistent results.
     */
    it('should be idempotent', () => {
      const sizeArb = fc.integer({ min: 1, max: 104857600 }); // 1 byte to 100MB

      fc.assert(
        fc.property(sizeArb, (size) => {
          const context = {
            element: { 'x-uigen-max-file-size': size },
            path: 'test',
            spec: {}
          };

          // Extract multiple times
          const extracted1 = handler.extract(context as any);
          const extracted2 = handler.extract(context as any);

          // Should return the same value
          expect(extracted1).toEqual(extracted2);

          // Validate multiple times
          if (extracted1 !== undefined) {
            const valid1 = handler.validate(extracted1);
            const valid2 = handler.validate(extracted1);
            expect(valid1).toBe(valid2);
          }
        })
      );
    });

    /**
     * Property 3: Common file size values
     * 
     * Tests that common file size values (1MB, 5MB, 10MB, etc.) are always valid.
     */
    it('should accept common file size values', () => {
      const commonSizes = [
        1048576,      // 1MB
        5242880,      // 5MB
        10485760,     // 10MB
        52428800,     // 50MB
        104857600,    // 100MB
        1073741824    // 1GB
      ];

      commonSizes.forEach(size => {
        expect(handler.validate(size)).toBe(true);
      });
    });

    /**
     * Property 4: Boundary values
     * 
     * Tests that boundary values are handled correctly.
     */
    it('should handle boundary values correctly', () => {
      // Minimum valid value
      expect(handler.validate(1)).toBe(true);

      // Just below minimum
      expect(handler.validate(0)).toBe(false);

      // Very large but valid value
      expect(handler.validate(Number.MAX_SAFE_INTEGER)).toBe(true);

      // Infinity (invalid)
      expect(handler.validate(Infinity)).toBe(false);
    });
  });

  describe('Cross-handler properties', () => {
    const fileTypesHandler = new FileTypesHandler();
    const maxFileSizeHandler = new MaxFileSizeHandler();

    /**
     * Property: Handlers should work independently
     * 
     * Tests that the two handlers don't interfere with each other.
     */
    it('should work independently without interference', () => {
      const mimeTypesArb = fc.array(
        fc.constantFrom('image/jpeg', 'image/png', 'application/pdf'),
        { minLength: 1, maxLength: 5 }
      );
      const sizeArb = fc.integer({ min: 1, max: 104857600 });

      fc.assert(
        fc.property(mimeTypesArb, sizeArb, (mimeTypes, size) => {
          // Validate file types
          const fileTypesValid = fileTypesHandler.validate(mimeTypes);
          expect(fileTypesValid).toBe(true);

          // Validate file size
          const sizeValid = maxFileSizeHandler.validate(size);
          expect(sizeValid).toBe(true);

          // Both should remain valid
          expect(fileTypesHandler.validate(mimeTypes)).toBe(true);
          expect(maxFileSizeHandler.validate(size)).toBe(true);
        })
      );
    });
  });
});
