import { describe, it, expect, beforeEach } from 'vitest';
import type { OpenAPIV3 } from 'openapi-types';
import { Resource_Extractor } from '../resource-extractor.js';
import type { AdapterUtils } from '../annotations/index.js';
import { AnnotationHandlerRegistry } from '../annotations/index.js';
import { ViewHintClassifier } from '../view-hint-classifier.js';
import { RelationshipDetector } from '../relationship-detector.js';
import { PaginationDetector } from '../pagination-detector.js';
import { SchemaProcessor } from '../schema-processor.js';

describe('Resource_Extractor', () => {
  let extractor: Resource_Extractor;
  let mockSpec: OpenAPIV3.Document;
  let mockAdapterUtils: AdapterUtils;
  let mockAnnotationRegistry: AnnotationHandlerRegistry;
  let mockViewHintClassifier: ViewHintClassifier;
  let mockRelationshipDetector: RelationshipDetector;
  let mockPaginationDetector: PaginationDetector;
  let mockSchemaProcessor: SchemaProcessor;

  beforeEach(() => {
    mockSpec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {}
    };

    mockAdapterUtils = {
      humanize: (str: string) => str,
      resolveRef: () => null,
      logError: () => {},
      logWarning: () => {}
    } as AdapterUtils;

    mockAnnotationRegistry = new AnnotationHandlerRegistry(mockAdapterUtils);
    mockViewHintClassifier = new ViewHintClassifier();
    mockRelationshipDetector = new RelationshipDetector(mockAdapterUtils);
    mockPaginationDetector = new PaginationDetector();
    mockSchemaProcessor = new SchemaProcessor(mockSpec, mockAdapterUtils);

    extractor = new Resource_Extractor(
      mockSpec,
      mockAdapterUtils,
      mockAnnotationRegistry,
      mockViewHintClassifier,
      mockRelationshipDetector,
      mockPaginationDetector,
      mockSchemaProcessor
    );
  });

  describe('inferResourceName', () => {
    // Helper to access private method for testing
    const inferResourceName = (path: string): string | null => {
      return (extractor as any).inferResourceName(path);
    };

    describe('basic path inference', () => {
      it('should infer resource name from simple path', () => {
        expect(inferResourceName('/Services')).toBe('Services');
      });

      it('should infer resource name from path with parameter', () => {
        expect(inferResourceName('/Services/{sid}')).toBe('Services');
      });

      it('should infer resource name from nested path', () => {
        expect(inferResourceName('/api/Services')).toBe('Services');
      });
    });

    describe('version prefix handling (Requirement 2.3, 7.1-7.6)', () => {
      it('should skip v1 version prefix', () => {
        expect(inferResourceName('/v1/Services')).toBe('Services');
      });

      it('should skip v2 version prefix', () => {
        expect(inferResourceName('/v2/users')).toBe('users');
      });

      it('should skip v3 version prefix', () => {
        expect(inferResourceName('/v3/products')).toBe('products');
      });

      it('should skip version prefix with path parameter', () => {
        expect(inferResourceName('/v1/Services/{sid}')).toBe('Services');
      });

      it('should skip version prefix in nested path', () => {
        expect(inferResourceName('/api/v3/users')).toBe('users');
      });

      it('should handle case-insensitive version prefix (V1)', () => {
        expect(inferResourceName('/V1/Services')).toBe('Services');
      });

      it('should handle case-insensitive version prefix (V2)', () => {
        expect(inferResourceName('/V2/users')).toBe('users');
      });
    });

    describe('path parameter filtering (Requirement 2.4)', () => {
      it('should filter out path parameter segments', () => {
        expect(inferResourceName('/{id}/items')).toBe('items');
      });

      it('should filter out multiple path parameters', () => {
        expect(inferResourceName('/{userId}/posts/{postId}')).toBe('posts');
      });

      it('should return null when only path parameters exist', () => {
        expect(inferResourceName('/{id}')).toBe(null);
      });

      it('should return null when only path parameters exist after version', () => {
        expect(inferResourceName('/v1/{id}')).toBe(null);
      });
    });

    describe('sub-resource handling (Requirement 2.2, 8.1-8.4)', () => {
      it('should use deepest static segment for sub-resources', () => {
        expect(inferResourceName('/v1/Services/{sid}/AlphaSenders')).toBe('AlphaSenders');
      });

      it('should use deepest static segment with parameter at end', () => {
        expect(inferResourceName('/v1/Services/{sid}/AlphaSenders/{id}')).toBe('AlphaSenders');
      });

      it('should handle deeply nested sub-resources', () => {
        expect(inferResourceName('/v1/Services/{sid}/AlphaSenders/{aid}/Messages')).toBe('Messages');
      });

      it('should handle sub-resources without version prefix', () => {
        expect(inferResourceName('/Services/{sid}/AlphaSenders')).toBe('AlphaSenders');
      });
    });

    describe('edge cases (Requirement 2.9)', () => {
      it('should return null for empty path', () => {
        expect(inferResourceName('')).toBe(null);
      });

      it('should return null for root path', () => {
        expect(inferResourceName('/')).toBe(null);
      });

      it('should return null when no static segments remain', () => {
        expect(inferResourceName('/{id}/{otherId}')).toBe(null);
      });

      it('should handle path with trailing slash', () => {
        expect(inferResourceName('/v1/Services/')).toBe('Services');
      });

      it('should handle path with multiple slashes', () => {
        expect(inferResourceName('/v1//Services')).toBe('Services');
      });
    });

    describe('requirement validation', () => {
      // Requirement 2.5: WHEN a path is /v1/Services, THE Resource_Extractor SHALL infer the resource name as "Services"
      it('validates Requirement 2.5', () => {
        expect(inferResourceName('/v1/Services')).toBe('Services');
      });

      // Requirement 2.6: WHEN a path is /v1/Services/{sid}, THE Resource_Extractor SHALL infer the resource name as "Services"
      it('validates Requirement 2.6', () => {
        expect(inferResourceName('/v1/Services/{sid}')).toBe('Services');
      });

      // Requirement 2.7: WHEN a path is /v1/Services/{sid}/AlphaSenders, THE Resource_Extractor SHALL infer the resource name as "AlphaSenders"
      it('validates Requirement 2.7', () => {
        expect(inferResourceName('/v1/Services/{sid}/AlphaSenders')).toBe('AlphaSenders');
      });

      // Requirement 2.8: WHEN a path is /v1/Services/{sid}/AlphaSenders/{sid}, THE Resource_Extractor SHALL infer the resource name as "AlphaSenders"
      it('validates Requirement 2.8', () => {
        expect(inferResourceName('/v1/Services/{sid}/AlphaSenders/{sid}')).toBe('AlphaSenders');
      });

      // Requirement 2.9: WHEN a path has no static segments, THE Resource_Extractor SHALL return null
      it('validates Requirement 2.9', () => {
        expect(inferResourceName('/{id}')).toBe(null);
        expect(inferResourceName('/{id}/{otherId}')).toBe(null);
      });
    });
  });
});
