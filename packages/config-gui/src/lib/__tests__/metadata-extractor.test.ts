import { describe, it, expect } from 'vitest';
import { MetadataExtractor } from '../metadata-extractor.js';
import type { AnnotationHandler } from '@uigen-dev/core';
import type { AnnotationMetadata } from '../../types/index.js';

describe('MetadataExtractor', () => {
  const extractor = new MetadataExtractor();

  describe('extract', () => {
    it('should extract metadata from handler with static metadata property', () => {
      const mockMetadata: AnnotationMetadata = {
        name: 'x-uigen-test',
        description: 'Test annotation',
        targetType: 'field',
        parameterSchema: {
          type: 'string'
        },
        examples: [
          { description: 'Example', value: 'test' }
        ]
      };

      class TestHandler implements AnnotationHandler<string> {
        public readonly name = 'x-uigen-test';
        public static readonly metadata = mockMetadata;

        extract() { return undefined; }
        validate() { return true; }
        apply() { }
      }

      const handler = new TestHandler();
      const result = extractor.extract(handler);

      expect(result).toEqual(mockMetadata);
    });

    it('should fall back to runtime inspection for handlers without metadata', () => {
      class NoMetadataHandler implements AnnotationHandler<string> {
        public readonly name = 'x-uigen-custom';

        extract() { return undefined; }
        validate() { return true; }
        apply() { }
      }

      const handler = new NoMetadataHandler();
      const result = extractor.extract(handler);

      expect(result.name).toBe('x-uigen-custom');
      expect(result.description).toBe('Handler for x-uigen-custom annotation');
      expect(result.targetType).toBe('field');
      expect(result.parameterSchema).toEqual({ type: 'string' });
      expect(result.examples).toEqual([]);
    });

    it('should infer operation target type for login-related annotations', () => {
      class LoginHandler implements AnnotationHandler<boolean> {
        public readonly name = 'x-uigen-login';

        extract() { return undefined; }
        validate() { return true; }
        apply() { }
      }

      const handler = new LoginHandler();
      const result = extractor.extract(handler);

      expect(result.targetType).toBe('operation');
    });

    it('should infer resource target type for ignore annotations', () => {
      class IgnoreHandler implements AnnotationHandler<boolean> {
        public readonly name = 'x-uigen-ignore';

        extract() { return undefined; }
        validate() { return true; }
        apply() { }
      }

      const handler = new IgnoreHandler();
      const result = extractor.extract(handler);

      expect(result.targetType).toBe('resource');
    });
  });

  describe('extractAll', () => {
    it('should extract metadata from all handlers', () => {
      const metadata1: AnnotationMetadata = {
        name: 'x-uigen-label',
        description: 'Label annotation',
        targetType: 'field',
        parameterSchema: { type: 'string' },
        examples: []
      };

      const metadata2: AnnotationMetadata = {
        name: 'x-uigen-ref',
        description: 'Reference annotation',
        targetType: 'field',
        parameterSchema: {
          type: 'object',
          properties: {
            resource: { type: 'string', description: 'Resource name' }
          },
          required: ['resource']
        },
        examples: []
      };

      class Handler1 implements AnnotationHandler<string> {
        public readonly name = 'x-uigen-label';
        public static readonly metadata = metadata1;

        extract() { return undefined; }
        validate() { return true; }
        apply() { }
      }

      class Handler2 implements AnnotationHandler<object> {
        public readonly name = 'x-uigen-ref';
        public static readonly metadata = metadata2;

        extract() { return undefined; }
        validate() { return true; }
        apply() { }
      }

      const handlers = [new Handler1(), new Handler2()];
      const results = extractor.extractAll(handlers);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual(metadata1);
      expect(results[1]).toEqual(metadata2);
    });

    it('should handle empty handler array', () => {
      const results = extractor.extractAll([]);
      expect(results).toEqual([]);
    });

    it('should handle mix of handlers with and without metadata', () => {
      const metadata: AnnotationMetadata = {
        name: 'x-uigen-with-meta',
        description: 'Has metadata',
        targetType: 'field',
        parameterSchema: { type: 'string' },
        examples: []
      };

      class WithMetadata implements AnnotationHandler<string> {
        public readonly name = 'x-uigen-with-meta';
        public static readonly metadata = metadata;

        extract() { return undefined; }
        validate() { return true; }
        apply() { }
      }

      class WithoutMetadata implements AnnotationHandler<string> {
        public readonly name = 'x-uigen-without-meta';

        extract() { return undefined; }
        validate() { return true; }
        apply() { }
      }

      const handlers = [new WithMetadata(), new WithoutMetadata()];
      const results = extractor.extractAll(handlers);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual(metadata);
      expect(results[1].name).toBe('x-uigen-without-meta');
      expect(results[1].description).toBe('Handler for x-uigen-without-meta annotation');
    });
  });
});
