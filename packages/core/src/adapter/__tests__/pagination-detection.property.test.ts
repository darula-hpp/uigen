import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { PaginationDetector } from '../pagination-detector.js';
import type { Parameter } from '../../ir/types.js';

/**
 * Property-Based Tests for Pagination Detection
 * 
 * **Property 8: Pagination Strategy Detection**
 * **Validates: Requirements 6.1-6.3**
 * 
 * These tests verify that pagination detection behaves correctly across
 * a wide range of randomly generated parameter combinations.
 */

describe('Pagination Detection - Property-Based Tests', () => {
  /**
   * **Property 8: Pagination Strategy Detection - Offset**
   * **Validates: Requirements 6.1**
   * 
   * For any operation with query parameters named "limit" and "offset",
   * the detector should identify offset pagination style.
   */
  it('should detect offset pagination when limit and offset params exist', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('limit', 'Limit', 'LIMIT'),
        fc.constantFrom('offset', 'Offset', 'OFFSET'),
        fc.array(
          fc.record({
            name: fc.constantFrom('sort', 'filter', 'search', 'include'),
            in: fc.constantFrom('query', 'header') as fc.Arbitrary<'query' | 'header'>,
            required: fc.boolean()
          }),
          { maxLength: 5 }
        ),
        (limitName, offsetName, otherParams) => {
          const parameters: Parameter[] = [
            {
              name: limitName,
              in: 'query',
              required: false,
              schema: { type: 'integer', key: 'limit', label: 'Limit', required: false }
            },
            {
              name: offsetName,
              in: 'query',
              required: false,
              schema: { type: 'integer', key: 'offset', label: 'Offset', required: false }
            },
            ...otherParams.map(p => ({
              name: p.name,
              in: p.in as 'query' | 'header',
              required: p.required,
              schema: { type: 'string' as const, key: p.name, label: p.name, required: p.required }
            }))
          ];
          
          const detector = new PaginationDetector();
          const result = detector.detect(parameters);
          
          expect(result).not.toBeNull();
          expect(result?.style).toBe('offset');
          expect(result?.params).toHaveProperty('limit');
          expect(result?.params).toHaveProperty('offset');
          // Should preserve original case
          expect(result?.params.limit).toBe(limitName);
          expect(result?.params.offset).toBe(offsetName);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Property 8: Pagination Strategy Detection - Cursor**
   * **Validates: Requirements 6.2**
   * 
   * For any operation with a query parameter named "cursor" or "next",
   * the detector should identify cursor pagination style.
   */
  it('should detect cursor pagination when cursor param exists', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('cursor', 'Cursor', 'CURSOR'),
        fc.array(
          fc.record({
            name: fc.constantFrom('sort', 'filter', 'search'),
            in: fc.constantFrom('query', 'header') as fc.Arbitrary<'query' | 'header'>,
            required: fc.boolean()
          }),
          { maxLength: 5 }
        ),
        (cursorName, otherParams) => {
          const parameters: Parameter[] = [
            {
              name: cursorName,
              in: 'query',
              required: false,
              schema: { type: 'string', key: 'cursor', label: 'Cursor', required: false }
            },
            ...otherParams.map(p => ({
              name: p.name,
              in: p.in as 'query' | 'header',
              required: p.required,
              schema: { type: 'string' as const, key: p.name, label: p.name, required: p.required }
            }))
          ];
          
          const detector = new PaginationDetector();
          const result = detector.detect(parameters);
          
          expect(result).not.toBeNull();
          expect(result?.style).toBe('cursor');
          expect(result?.params).toHaveProperty('cursor');
          expect(result?.params.cursor).toBe(cursorName);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Property 8: Pagination Strategy Detection - Cursor (next)**
   * **Validates: Requirements 6.2**
   */
  it('should detect cursor pagination when next param exists', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('next', 'Next', 'NEXT'),
        fc.array(
          fc.record({
            name: fc.constantFrom('sort', 'filter'),
            in: fc.constantFrom('query', 'header') as fc.Arbitrary<'query' | 'header'>,
            required: fc.boolean()
          }),
          { maxLength: 3 }
        ),
        (nextName, otherParams) => {
          const parameters: Parameter[] = [
            {
              name: nextName,
              in: 'query',
              required: false,
              schema: { type: 'string', key: 'next', label: 'Next', required: false }
            },
            ...otherParams.map(p => ({
              name: p.name,
              in: p.in as 'query' | 'header',
              required: p.required,
              schema: { type: 'string' as const, key: p.name, label: p.name, required: p.required }
            }))
          ];
          
          const detector = new PaginationDetector();
          const result = detector.detect(parameters);
          
          expect(result).not.toBeNull();
          expect(result?.style).toBe('cursor');
          expect(result?.params).toHaveProperty('cursor');
          expect(result?.params.cursor).toBe(nextName);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Property 8: Pagination Strategy Detection - Page**
   * **Validates: Requirements 6.3**
   * 
   * For any operation with query parameters named "page" and "pageSize" (or variations),
   * the detector should identify page-based pagination style.
   */
  it('should detect page pagination when page and pageSize params exist', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('page', 'Page', 'PAGE'),
        fc.constantFrom('pageSize', 'pagesize', 'PageSize', 'PAGESIZE'),
        fc.array(
          fc.record({
            name: fc.constantFrom('sort', 'filter'),
            in: fc.constantFrom('query', 'header') as fc.Arbitrary<'query' | 'header'>,
            required: fc.boolean()
          }),
          { maxLength: 3 }
        ),
        (pageName, pageSizeName, otherParams) => {
          const parameters: Parameter[] = [
            {
              name: pageName,
              in: 'query',
              required: false,
              schema: { type: 'integer', key: 'page', label: 'Page', required: false }
            },
            {
              name: pageSizeName,
              in: 'query',
              required: false,
              schema: { type: 'integer', key: 'pageSize', label: 'Page Size', required: false }
            },
            ...otherParams.map(p => ({
              name: p.name,
              in: p.in as 'query' | 'header',
              required: p.required,
              schema: { type: 'string' as const, key: p.name, label: p.name, required: p.required }
            }))
          ];
          
          const detector = new PaginationDetector();
          const result = detector.detect(parameters);
          
          expect(result).not.toBeNull();
          expect(result?.style).toBe('page');
          expect(result?.params).toHaveProperty('page');
          expect(result?.params).toHaveProperty('pageSize');
          expect(result?.params.page).toBe(pageName);
          expect(result?.params.pageSize).toBe(pageSizeName);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Property 8: Pagination Strategy Detection - Page (per_page)**
   * **Validates: Requirements 6.3**
   */
  it('should detect page pagination with per_page variation', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('page', 'Page'),
        fc.constantFrom('per_page', 'Per_Page', 'PER_PAGE'),
        (pageName, perPageName) => {
          const parameters: Parameter[] = [
            {
              name: pageName,
              in: 'query',
              required: false,
              schema: { type: 'integer', key: 'page', label: 'Page', required: false }
            },
            {
              name: perPageName,
              in: 'query',
              required: false,
              schema: { type: 'integer', key: 'per_page', label: 'Per Page', required: false }
            }
          ];
          
          const detector = new PaginationDetector();
          const result = detector.detect(parameters);
          
          expect(result).not.toBeNull();
          expect(result?.style).toBe('page');
          expect(result?.params.pageSize).toBe(perPageName);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Property 8: Pagination Strategy Detection - Page (perpage)**
   * **Validates: Requirements 6.3**
   */
  it('should detect page pagination with perpage variation', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('page', 'Page'),
        fc.constantFrom('perpage', 'perPage', 'PerPage'),
        (pageName, perPageName) => {
          const parameters: Parameter[] = [
            {
              name: pageName,
              in: 'query',
              required: false,
              schema: { type: 'integer', key: 'page', label: 'Page', required: false }
            },
            {
              name: perPageName,
              in: 'query',
              required: false,
              schema: { type: 'integer', key: 'perpage', label: 'Per Page', required: false }
            }
          ];
          
          const detector = new PaginationDetector();
          const result = detector.detect(parameters);
          
          expect(result).not.toBeNull();
          expect(result?.style).toBe('page');
          expect(result?.params.pageSize).toBe(perPageName);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 6.4, 6.5**
   * 
   * Property: Should return null when no pagination parameters are detected.
   */
  it('should return null when no pagination params exist', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.constantFrom('sort', 'filter', 'search', 'include', 'fields', 'expand'),
            in: fc.constantFrom('query', 'header', 'path') as fc.Arbitrary<'query' | 'header' | 'path'>,
            required: fc.boolean()
          }),
          { minLength: 0, maxLength: 10 }
        ),
        (params) => {
          const parameters: Parameter[] = params.map(p => ({
            name: p.name,
            in: p.in as 'query' | 'header' | 'path',
            required: p.required,
            schema: { type: 'string' as const, key: p.name, label: p.name, required: p.required }
          }));
          
          const detector = new PaginationDetector();
          const result = detector.detect(parameters);
          
          expect(result).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 6.4, 6.5**
   * 
   * Property: Should return null when only partial pagination params exist.
   */
  it('should return null when only limit exists without offset', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('limit', 'Limit'),
        fc.array(
          fc.record({
            name: fc.constantFrom('sort', 'filter'),
            in: fc.constantFrom('query') as fc.Arbitrary<'query'>,
            required: fc.boolean()
          }),
          { maxLength: 3 }
        ),
        (limitName, otherParams) => {
          const parameters: Parameter[] = [
            {
              name: limitName,
              in: 'query',
              required: false,
              schema: { type: 'integer', key: 'limit', label: 'Limit', required: false }
            },
            ...otherParams.map(p => ({
              name: p.name,
              in: p.in,
              required: p.required,
              schema: { type: 'string' as const, key: p.name, label: p.name, required: p.required }
            }))
          ];
          
          const detector = new PaginationDetector();
          const result = detector.detect(parameters);
          
          // Should return null because offset is missing
          expect(result).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 6.4, 6.5**
   * 
   * Property: Should return null when only page exists without pageSize.
   */
  it('should return null when only page exists without pageSize', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('page', 'Page'),
        fc.array(
          fc.record({
            name: fc.constantFrom('sort', 'filter'),
            in: fc.constantFrom('query') as fc.Arbitrary<'query'>,
            required: fc.boolean()
          }),
          { maxLength: 3 }
        ),
        (pageName, otherParams) => {
          const parameters: Parameter[] = [
            {
              name: pageName,
              in: 'query',
              required: false,
              schema: { type: 'integer', key: 'page', label: 'Page', required: false }
            },
            ...otherParams.map(p => ({
              name: p.name,
              in: p.in,
              required: p.required,
              schema: { type: 'string' as const, key: p.name, label: p.name, required: p.required }
            }))
          ];
          
          const detector = new PaginationDetector();
          const result = detector.detect(parameters);
          
          // Should return null because pageSize is missing
          expect(result).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 6.1**
   * 
   * Property: Offset pagination should take precedence over other styles.
   */
  it('should prioritize offset pagination when multiple styles detected', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('limit', 'Limit'),
        fc.constantFrom('offset', 'Offset'),
        fc.constantFrom('cursor', 'page'),
        (limitName, offsetName, otherPaginationParam) => {
          const parameters: Parameter[] = [
            {
              name: limitName,
              in: 'query',
              required: false,
              schema: { type: 'integer', key: 'limit', label: 'Limit', required: false }
            },
            {
              name: offsetName,
              in: 'query',
              required: false,
              schema: { type: 'integer', key: 'offset', label: 'Offset', required: false }
            },
            {
              name: otherPaginationParam,
              in: 'query',
              required: false,
              schema: { type: 'string', key: otherPaginationParam, label: otherPaginationParam, required: false }
            }
          ];
          
          const detector = new PaginationDetector();
          const result = detector.detect(parameters);
          
          // Should detect offset pagination (takes precedence)
          expect(result).not.toBeNull();
          expect(result?.style).toBe('offset');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 6.2**
   * 
   * Property: Cursor pagination should take precedence over page pagination.
   */
  it('should prioritize cursor pagination over page pagination', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('cursor', 'Cursor'),
        fc.constantFrom('page', 'Page'),
        fc.constantFrom('pageSize', 'per_page'),
        (cursorName, pageName, pageSizeName) => {
          const parameters: Parameter[] = [
            {
              name: cursorName,
              in: 'query',
              required: false,
              schema: { type: 'string', key: 'cursor', label: 'Cursor', required: false }
            },
            {
              name: pageName,
              in: 'query',
              required: false,
              schema: { type: 'integer', key: 'page', label: 'Page', required: false }
            },
            {
              name: pageSizeName,
              in: 'query',
              required: false,
              schema: { type: 'integer', key: 'pageSize', label: 'Page Size', required: false }
            }
          ];
          
          const detector = new PaginationDetector();
          const result = detector.detect(parameters);
          
          // Should detect cursor pagination (takes precedence)
          expect(result).not.toBeNull();
          expect(result?.style).toBe('cursor');
        }
      ),
      { numRuns: 100 }
    );
  });
});
