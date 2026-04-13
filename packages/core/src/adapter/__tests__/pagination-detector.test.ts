import { describe, it, expect } from 'vitest';
import { PaginationDetector } from '../pagination-detector.js';
import type { Parameter } from '../../ir/types.js';

/**
 * Unit Tests for PaginationDetector
 * 
 * **Validates: Requirements 6.1-6.5**
 * 
 * These tests verify specific scenarios and edge cases for pagination detection.
 */

describe('PaginationDetector', () => {
  describe('detect - offset pagination', () => {
    /**
     * **Validates: Requirements 6.1, 6.4**
     */
    it('should detect offset pagination with limit and offset params', () => {
      const parameters: Parameter[] = [
        {
          name: 'limit',
          in: 'query',
          required: false,
          schema: { type: 'integer', key: 'limit', label: 'Limit', required: false }
        },
        {
          name: 'offset',
          in: 'query',
          required: false,
          schema: { type: 'integer', key: 'offset', label: 'Offset', required: false }
        }
      ];

      const detector = new PaginationDetector();
      const result = detector.detect(parameters);

      expect(result).toEqual({
        style: 'offset',
        params: {
          limit: 'limit',
          offset: 'offset'
        }
      });
    });

    /**
     * **Validates: Requirements 6.1**
     */
    it('should preserve case of parameter names', () => {
      const parameters: Parameter[] = [
        {
          name: 'Limit',
          in: 'query',
          required: false,
          schema: { type: 'integer', key: 'limit', label: 'Limit', required: false }
        },
        {
          name: 'Offset',
          in: 'query',
          required: false,
          schema: { type: 'integer', key: 'offset', label: 'Offset', required: false }
        }
      ];

      const detector = new PaginationDetector();
      const result = detector.detect(parameters);

      expect(result?.params.limit).toBe('Limit');
      expect(result?.params.offset).toBe('Offset');
    });

    /**
     * **Validates: Requirements 6.1**
     */
    it('should detect offset pagination with additional params', () => {
      const parameters: Parameter[] = [
        {
          name: 'limit',
          in: 'query',
          required: false,
          schema: { type: 'integer', key: 'limit', label: 'Limit', required: false }
        },
        {
          name: 'offset',
          in: 'query',
          required: false,
          schema: { type: 'integer', key: 'offset', label: 'Offset', required: false }
        },
        {
          name: 'sort',
          in: 'query',
          required: false,
          schema: { type: 'string', key: 'sort', label: 'Sort', required: false }
        },
        {
          name: 'filter',
          in: 'query',
          required: false,
          schema: { type: 'string', key: 'filter', label: 'Filter', required: false }
        }
      ];

      const detector = new PaginationDetector();
      const result = detector.detect(parameters);

      expect(result?.style).toBe('offset');
    });

    /**
     * **Validates: Requirements 6.5**
     */
    it('should return null when only limit exists', () => {
      const parameters: Parameter[] = [
        {
          name: 'limit',
          in: 'query',
          required: false,
          schema: { type: 'integer', key: 'limit', label: 'Limit', required: false }
        }
      ];

      const detector = new PaginationDetector();
      const result = detector.detect(parameters);

      expect(result).toBeNull();
    });

    /**
     * **Validates: Requirements 6.5**
     */
    it('should return null when only offset exists', () => {
      const parameters: Parameter[] = [
        {
          name: 'offset',
          in: 'query',
          required: false,
          schema: { type: 'integer', key: 'offset', label: 'Offset', required: false }
        }
      ];

      const detector = new PaginationDetector();
      const result = detector.detect(parameters);

      expect(result).toBeNull();
    });
  });

  describe('detect - cursor pagination', () => {
    /**
     * **Validates: Requirements 6.2, 6.4**
     */
    it('should detect cursor pagination with cursor param', () => {
      const parameters: Parameter[] = [
        {
          name: 'cursor',
          in: 'query',
          required: false,
          schema: { type: 'string', key: 'cursor', label: 'Cursor', required: false }
        }
      ];

      const detector = new PaginationDetector();
      const result = detector.detect(parameters);

      expect(result).toEqual({
        style: 'cursor',
        params: {
          cursor: 'cursor'
        }
      });
    });

    /**
     * **Validates: Requirements 6.2, 6.4**
     */
    it('should detect cursor pagination with next param', () => {
      const parameters: Parameter[] = [
        {
          name: 'next',
          in: 'query',
          required: false,
          schema: { type: 'string', key: 'next', label: 'Next', required: false }
        }
      ];

      const detector = new PaginationDetector();
      const result = detector.detect(parameters);

      expect(result).toEqual({
        style: 'cursor',
        params: {
          cursor: 'next'
        }
      });
    });

    /**
     * **Validates: Requirements 6.2**
     */
    it('should preserve case of cursor parameter name', () => {
      const parameters: Parameter[] = [
        {
          name: 'Cursor',
          in: 'query',
          required: false,
          schema: { type: 'string', key: 'cursor', label: 'Cursor', required: false }
        }
      ];

      const detector = new PaginationDetector();
      const result = detector.detect(parameters);

      expect(result?.params.cursor).toBe('Cursor');
    });

    /**
     * **Validates: Requirements 6.2**
     */
    it('should detect cursor pagination with additional params', () => {
      const parameters: Parameter[] = [
        {
          name: 'cursor',
          in: 'query',
          required: false,
          schema: { type: 'string', key: 'cursor', label: 'Cursor', required: false }
        },
        {
          name: 'limit',
          in: 'query',
          required: false,
          schema: { type: 'integer', key: 'limit', label: 'Limit', required: false }
        },
        {
          name: 'sort',
          in: 'query',
          required: false,
          schema: { type: 'string', key: 'sort', label: 'Sort', required: false }
        }
      ];

      const detector = new PaginationDetector();
      const result = detector.detect(parameters);

      expect(result?.style).toBe('cursor');
    });
  });

  describe('detect - page pagination', () => {
    /**
     * **Validates: Requirements 6.3, 6.4**
     */
    it('should detect page pagination with page and pageSize params', () => {
      const parameters: Parameter[] = [
        {
          name: 'page',
          in: 'query',
          required: false,
          schema: { type: 'integer', key: 'page', label: 'Page', required: false }
        },
        {
          name: 'pageSize',
          in: 'query',
          required: false,
          schema: { type: 'integer', key: 'pageSize', label: 'Page Size', required: false }
        }
      ];

      const detector = new PaginationDetector();
      const result = detector.detect(parameters);

      expect(result).toEqual({
        style: 'page',
        params: {
          page: 'page',
          pageSize: 'pageSize'
        }
      });
    });

    /**
     * **Validates: Requirements 6.3, 6.4**
     */
    it('should detect page pagination with page and per_page params', () => {
      const parameters: Parameter[] = [
        {
          name: 'page',
          in: 'query',
          required: false,
          schema: { type: 'integer', key: 'page', label: 'Page', required: false }
        },
        {
          name: 'per_page',
          in: 'query',
          required: false,
          schema: { type: 'integer', key: 'per_page', label: 'Per Page', required: false }
        }
      ];

      const detector = new PaginationDetector();
      const result = detector.detect(parameters);

      expect(result).toEqual({
        style: 'page',
        params: {
          page: 'page',
          pageSize: 'per_page'
        }
      });
    });

    /**
     * **Validates: Requirements 6.3, 6.4**
     */
    it('should detect page pagination with page and perpage params', () => {
      const parameters: Parameter[] = [
        {
          name: 'page',
          in: 'query',
          required: false,
          schema: { type: 'integer', key: 'page', label: 'Page', required: false }
        },
        {
          name: 'perpage',
          in: 'query',
          required: false,
          schema: { type: 'integer', key: 'perpage', label: 'Per Page', required: false }
        }
      ];

      const detector = new PaginationDetector();
      const result = detector.detect(parameters);

      expect(result).toEqual({
        style: 'page',
        params: {
          page: 'page',
          pageSize: 'perpage'
        }
      });
    });

    /**
     * **Validates: Requirements 6.3**
     */
    it('should preserve case of page parameter names', () => {
      const parameters: Parameter[] = [
        {
          name: 'Page',
          in: 'query',
          required: false,
          schema: { type: 'integer', key: 'page', label: 'Page', required: false }
        },
        {
          name: 'PageSize',
          in: 'query',
          required: false,
          schema: { type: 'integer', key: 'pageSize', label: 'Page Size', required: false }
        }
      ];

      const detector = new PaginationDetector();
      const result = detector.detect(parameters);

      expect(result?.params.page).toBe('Page');
      expect(result?.params.pageSize).toBe('PageSize');
    });

    /**
     * **Validates: Requirements 6.3**
     */
    it('should detect page pagination with additional params', () => {
      const parameters: Parameter[] = [
        {
          name: 'page',
          in: 'query',
          required: false,
          schema: { type: 'integer', key: 'page', label: 'Page', required: false }
        },
        {
          name: 'pageSize',
          in: 'query',
          required: false,
          schema: { type: 'integer', key: 'pageSize', label: 'Page Size', required: false }
        },
        {
          name: 'sort',
          in: 'query',
          required: false,
          schema: { type: 'string', key: 'sort', label: 'Sort', required: false }
        }
      ];

      const detector = new PaginationDetector();
      const result = detector.detect(parameters);

      expect(result?.style).toBe('page');
    });

    /**
     * **Validates: Requirements 6.5**
     */
    it('should return null when only page exists without pageSize', () => {
      const parameters: Parameter[] = [
        {
          name: 'page',
          in: 'query',
          required: false,
          schema: { type: 'integer', key: 'page', label: 'Page', required: false }
        }
      ];

      const detector = new PaginationDetector();
      const result = detector.detect(parameters);

      expect(result).toBeNull();
    });

    /**
     * **Validates: Requirements 6.5**
     */
    it('should return null when page exists with unrecognized size param', () => {
      const parameters: Parameter[] = [
        {
          name: 'page',
          in: 'query',
          required: false,
          schema: { type: 'integer', key: 'page', label: 'Page', required: false }
        },
        {
          name: 'size',
          in: 'query',
          required: false,
          schema: { type: 'integer', key: 'size', label: 'Size', required: false }
        }
      ];

      const detector = new PaginationDetector();
      const result = detector.detect(parameters);

      expect(result).toBeNull();
    });
  });

  describe('detect - no pagination', () => {
    /**
     * **Validates: Requirements 6.5**
     */
    it('should return null when no pagination params exist', () => {
      const parameters: Parameter[] = [
        {
          name: 'sort',
          in: 'query',
          required: false,
          schema: { type: 'string', key: 'sort', label: 'Sort', required: false }
        },
        {
          name: 'filter',
          in: 'query',
          required: false,
          schema: { type: 'string', key: 'filter', label: 'Filter', required: false }
        }
      ];

      const detector = new PaginationDetector();
      const result = detector.detect(parameters);

      expect(result).toBeNull();
    });

    /**
     * **Validates: Requirements 6.5**
     */
    it('should return null for empty parameters array', () => {
      const parameters: Parameter[] = [];

      const detector = new PaginationDetector();
      const result = detector.detect(parameters);

      expect(result).toBeNull();
    });
  });

  describe('detect - precedence', () => {
    /**
     * **Validates: Requirements 6.1**
     */
    it('should prioritize offset pagination over cursor', () => {
      const parameters: Parameter[] = [
        {
          name: 'limit',
          in: 'query',
          required: false,
          schema: { type: 'integer', key: 'limit', label: 'Limit', required: false }
        },
        {
          name: 'offset',
          in: 'query',
          required: false,
          schema: { type: 'integer', key: 'offset', label: 'Offset', required: false }
        },
        {
          name: 'cursor',
          in: 'query',
          required: false,
          schema: { type: 'string', key: 'cursor', label: 'Cursor', required: false }
        }
      ];

      const detector = new PaginationDetector();
      const result = detector.detect(parameters);

      expect(result?.style).toBe('offset');
    });

    /**
     * **Validates: Requirements 6.1**
     */
    it('should prioritize offset pagination over page', () => {
      const parameters: Parameter[] = [
        {
          name: 'limit',
          in: 'query',
          required: false,
          schema: { type: 'integer', key: 'limit', label: 'Limit', required: false }
        },
        {
          name: 'offset',
          in: 'query',
          required: false,
          schema: { type: 'integer', key: 'offset', label: 'Offset', required: false }
        },
        {
          name: 'page',
          in: 'query',
          required: false,
          schema: { type: 'integer', key: 'page', label: 'Page', required: false }
        },
        {
          name: 'pageSize',
          in: 'query',
          required: false,
          schema: { type: 'integer', key: 'pageSize', label: 'Page Size', required: false }
        }
      ];

      const detector = new PaginationDetector();
      const result = detector.detect(parameters);

      expect(result?.style).toBe('offset');
    });

    /**
     * **Validates: Requirements 6.2**
     */
    it('should prioritize cursor pagination over page', () => {
      const parameters: Parameter[] = [
        {
          name: 'cursor',
          in: 'query',
          required: false,
          schema: { type: 'string', key: 'cursor', label: 'Cursor', required: false }
        },
        {
          name: 'page',
          in: 'query',
          required: false,
          schema: { type: 'integer', key: 'page', label: 'Page', required: false }
        },
        {
          name: 'pageSize',
          in: 'query',
          required: false,
          schema: { type: 'integer', key: 'pageSize', label: 'Page Size', required: false }
        }
      ];

      const detector = new PaginationDetector();
      const result = detector.detect(parameters);

      expect(result?.style).toBe('cursor');
    });

    /**
     * **Validates: Requirements 6.2**
     */
    it('should prefer cursor over next when both exist', () => {
      const parameters: Parameter[] = [
        {
          name: 'cursor',
          in: 'query',
          required: false,
          schema: { type: 'string', key: 'cursor', label: 'Cursor', required: false }
        },
        {
          name: 'next',
          in: 'query',
          required: false,
          schema: { type: 'string', key: 'next', label: 'Next', required: false }
        }
      ];

      const detector = new PaginationDetector();
      const result = detector.detect(parameters);

      expect(result?.style).toBe('cursor');
      expect(result?.params.cursor).toBe('cursor');
    });
  });

  describe('detect - case insensitivity', () => {
    /**
     * **Validates: Requirements 6.1**
     */
    it('should detect offset pagination with mixed case', () => {
      const parameters: Parameter[] = [
        {
          name: 'LIMIT',
          in: 'query',
          required: false,
          schema: { type: 'integer', key: 'limit', label: 'Limit', required: false }
        },
        {
          name: 'OFFSET',
          in: 'query',
          required: false,
          schema: { type: 'integer', key: 'offset', label: 'Offset', required: false }
        }
      ];

      const detector = new PaginationDetector();
      const result = detector.detect(parameters);

      expect(result?.style).toBe('offset');
      expect(result?.params.limit).toBe('LIMIT');
      expect(result?.params.offset).toBe('OFFSET');
    });

    /**
     * **Validates: Requirements 6.2**
     */
    it('should detect cursor pagination with mixed case', () => {
      const parameters: Parameter[] = [
        {
          name: 'CURSOR',
          in: 'query',
          required: false,
          schema: { type: 'string', key: 'cursor', label: 'Cursor', required: false }
        }
      ];

      const detector = new PaginationDetector();
      const result = detector.detect(parameters);

      expect(result?.style).toBe('cursor');
      expect(result?.params.cursor).toBe('CURSOR');
    });

    /**
     * **Validates: Requirements 6.3**
     */
    it('should detect page pagination with mixed case', () => {
      const parameters: Parameter[] = [
        {
          name: 'PAGE',
          in: 'query',
          required: false,
          schema: { type: 'integer', key: 'page', label: 'Page', required: false }
        },
        {
          name: 'PER_PAGE',
          in: 'query',
          required: false,
          schema: { type: 'integer', key: 'per_page', label: 'Per Page', required: false }
        }
      ];

      const detector = new PaginationDetector();
      const result = detector.detect(parameters);

      expect(result?.style).toBe('page');
      expect(result?.params.page).toBe('PAGE');
      expect(result?.params.pageSize).toBe('PER_PAGE');
    });
  });
});
