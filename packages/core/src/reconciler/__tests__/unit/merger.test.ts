/**
 * Unit tests for Annotation Merger
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnnotationMerger } from '../../merger';
import { ElementPathResolver } from '../../path-resolver';
import type { OpenAPIV3 } from 'openapi-types';
import type { Logger } from '../../types';

describe('AnnotationMerger', () => {
  let merger: AnnotationMerger;
  let resolver: ElementPathResolver;
  let mockLogger: Logger;

  beforeEach(() => {
    resolver = new ElementPathResolver();
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    merger = new AnnotationMerger(mockLogger);
  });

  describe('Config Precedence', () => {
    it('should override spec annotations with config annotations', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              'x-uigen-ignore': false,
              responses: {},
            },
          },
        },
      };

      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'POST:/users': {
            'x-uigen-ignore': true,
          },
        },
      };

      const result = merger.merge(spec, config, resolver);

      expect(result.appliedCount).toBe(1);
      expect(result.skippedPaths).toHaveLength(0);

      const operation = result.modifiedSpec.paths['/users'].post;
      expect(operation['x-uigen-ignore']).toBe(true);
    });

    it('should preserve spec annotations not in config', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              'x-uigen-ignore': false,
              'x-uigen-label': 'Create User',
              responses: {},
            },
          },
        },
      };

      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'POST:/users': {
            'x-uigen-ignore': true,
          },
        },
      };

      const result = merger.merge(spec, config, resolver);

      const operation = result.modifiedSpec.paths['/users'].post;
      expect(operation['x-uigen-ignore']).toBe(true);
      expect(operation['x-uigen-label']).toBe('Create User');
    });
  });

  describe('Annotation Removal', () => {
    it('should remove annotation when config value is null', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              'x-uigen-ignore': true,
              responses: {},
            },
          },
        },
      };

      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'POST:/users': {
            'x-uigen-ignore': null,
          },
        },
      };

      const result = merger.merge(spec, config, resolver);

      const operation = result.modifiedSpec.paths['/users'].post;
      expect(operation).not.toHaveProperty('x-uigen-ignore');
    });

    it('should distinguish null from false', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              'x-uigen-ignore': true,
              responses: {},
            },
          },
        },
      };

      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'POST:/users': {
            'x-uigen-ignore': false,
          },
        },
      };

      const result = merger.merge(spec, config, resolver);

      const operation = result.modifiedSpec.paths['/users'].post;
      expect(operation['x-uigen-ignore']).toBe(false);
    });
  });

  describe('Deterministic Ordering', () => {
    it('should apply annotations in alphabetical order', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: { responses: {} },
          },
        },
      };

      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'POST:/users': {
            'x-uigen-z-last': 'last',
            'x-uigen-a-first': 'first',
            'x-uigen-m-middle': 'middle',
          },
        },
      };

      const result = merger.merge(spec, config, resolver);

      // Verify debug logs are in alphabetical order
      expect(mockLogger.debug).toHaveBeenNthCalledWith(1, 'Applied x-uigen-a-first to POST:/users');
      expect(mockLogger.debug).toHaveBeenNthCalledWith(2, 'Applied x-uigen-m-middle to POST:/users');
      expect(mockLogger.debug).toHaveBeenNthCalledWith(3, 'Applied x-uigen-z-last to POST:/users');
    });

    it('should process element paths in alphabetical order', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: { responses: {} },
            get: { responses: {} },
          },
        },
      };

      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'POST:/users': { 'x-uigen-ignore': true },
          'GET:/users': { 'x-uigen-ignore': true },
        },
      };

      const result = merger.merge(spec, config, resolver);

      // GET should be processed before POST (alphabetical)
      const debugCalls = (mockLogger.debug as ReturnType<typeof vi.fn>).mock.calls;
      const firstCall = debugCalls[0][0];
      expect(firstCall).toContain('GET:/users');
    });
  });

  describe('Generic Annotation Handling', () => {
    it('should handle arbitrary x-uigen-* annotations', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: { responses: {} },
          },
        },
      };

      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'POST:/users': {
            'x-uigen-custom-annotation': 'custom-value',
            'x-uigen-another-one': { nested: 'object' },
            'x-uigen-future-annotation': [1, 2, 3],
          },
        },
      };

      const result = merger.merge(spec, config, resolver);

      expect(result.appliedCount).toBe(3);

      const operation = result.modifiedSpec.paths['/users'].post;
      expect(operation['x-uigen-custom-annotation']).toBe('custom-value');
      expect(operation['x-uigen-another-one']).toEqual({ nested: 'object' });
      expect(operation['x-uigen-future-annotation']).toEqual([1, 2, 3]);
    });
  });

  describe('Schema Property Annotations', () => {
    it('should apply annotations to schema properties', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
        components: {
          schemas: {
            User: {
              type: 'object',
              properties: {
                email: { type: 'string' },
              },
            },
          },
        },
      };

      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'User.email': {
            'x-uigen-label': 'Email Address',
          },
        },
      };

      const result = merger.merge(spec, config, resolver);

      expect(result.appliedCount).toBe(1);

      const emailProperty = result.modifiedSpec.components?.schemas?.User.properties.email;
      expect(emailProperty['x-uigen-label']).toBe('Email Address');
    });
  });

  describe('Error Handling', () => {
    it('should skip unresolved element paths', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
      };

      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'POST:/nonexistent': {
            'x-uigen-ignore': true,
          },
        },
      };

      const result = merger.merge(spec, config, resolver);

      expect(result.appliedCount).toBe(0);
      expect(result.skippedPaths).toContain('POST:/nonexistent');
      expect(mockLogger.warn).toHaveBeenCalledWith('Element path not found: POST:/nonexistent');
    });

    it('should continue processing after skipping invalid paths', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: { responses: {} },
          },
        },
      };

      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'POST:/nonexistent': { 'x-uigen-ignore': true },
          'POST:/users': { 'x-uigen-ignore': true },
        },
      };

      const result = merger.merge(spec, config, resolver);

      expect(result.appliedCount).toBe(1);
      expect(result.skippedPaths).toHaveLength(1);

      const operation = result.modifiedSpec.paths['/users'].post;
      expect(operation['x-uigen-ignore']).toBe(true);
    });
  });

  describe('Source Spec Non-Mutation', () => {
    it('should not mutate the source spec', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: { responses: {} },
          },
        },
      };

      const originalSpec = JSON.parse(JSON.stringify(spec));

      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'POST:/users': {
            'x-uigen-ignore': true,
          },
        },
      };

      merger.merge(spec, config, resolver);

      // Source spec should be unchanged
      expect(spec).toEqual(originalSpec);
      expect(spec.paths['/users'].post).not.toHaveProperty('x-uigen-ignore');
    });
  });

  describe('Multiple Annotations', () => {
    it('should apply multiple annotations to the same element', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: { responses: {} },
          },
        },
      };

      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'POST:/users': {
            'x-uigen-ignore': true,
            'x-uigen-label': 'Create User',
            'x-uigen-login': true,
          },
        },
      };

      const result = merger.merge(spec, config, resolver);

      expect(result.appliedCount).toBe(3);

      const operation = result.modifiedSpec.paths['/users'].post;
      expect(operation['x-uigen-ignore']).toBe(true);
      expect(operation['x-uigen-label']).toBe('Create User');
      expect(operation['x-uigen-login']).toBe(true);
    });
  });
});
