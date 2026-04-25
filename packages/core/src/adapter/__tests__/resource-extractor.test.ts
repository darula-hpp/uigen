import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { OpenAPIV3 } from 'openapi-types';
import { Resource_Extractor } from '../resource-extractor.js';
import type { AdapterUtils } from '../annotations/index.js';
import { AnnotationHandlerRegistry } from '../annotations/index.js';
import { ViewHintClassifier } from '../view-hint-classifier.js';
import { RelationshipDetector } from '../relationship-detector.js';
import { PaginationDetector } from '../pagination-detector.js';
import { SchemaProcessor } from '../schema-processor.js';
import type { RelationshipConfig } from '../../config/types.js';
import type { Operation, UIGenApp } from '../../ir/types.js';

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
      it('should group nested resources under parent resource', () => {
        // /Services/{id}/AlphaSenders should be grouped under Services, not AlphaSenders
        // This prevents Association schemas from polluting child resources
        expect(inferResourceName('/v1/Services/{sid}/AlphaSenders')).toBe('Services');
      });

      it('should group nested resources with parameter at end under parent', () => {
        expect(inferResourceName('/v1/Services/{sid}/AlphaSenders/{id}')).toBe('Services');
      });

      it('should handle deeply nested sub-resources', () => {
        // Deeply nested paths should still group under the first parent
        expect(inferResourceName('/v1/Services/{sid}/AlphaSenders/{aid}/Messages')).toBe('Services');
      });

      it('should handle sub-resources without version prefix', () => {
        expect(inferResourceName('/Services/{sid}/AlphaSenders')).toBe('Services');
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

      // Requirement 2.7: WHEN a path is /v1/Services/{sid}/AlphaSenders, THE Resource_Extractor SHALL group under parent "Services"
      // Updated: Nested resources should be grouped under parent to prevent schema pollution
      it('validates Requirement 2.7', () => {
        expect(inferResourceName('/v1/Services/{sid}/AlphaSenders')).toBe('Services');
      });

      // Requirement 2.8: WHEN a path is /v1/Services/{sid}/AlphaSenders/{sid}, THE Resource_Extractor SHALL group under parent "Services"
      // Updated: Nested resources should be grouped under parent to prevent schema pollution
      it('validates Requirement 2.8', () => {
        expect(inferResourceName('/v1/Services/{sid}/AlphaSenders/{sid}')).toBe('Services');
      });

      // Requirement 2.9: WHEN a path has no static segments, THE Resource_Extractor SHALL return null
      it('validates Requirement 2.9', () => {
        expect(inferResourceName('/{id}')).toBe(null);
        expect(inferResourceName('/{id}/{otherId}')).toBe(null);
      });
    });
  });

  describe('explicit relationship type handling', () => {
    let mockIR: UIGenApp;
    let consoleWarnSpy: any;

    beforeEach(() => {
      // Setup a basic spec with paths
      mockSpec.paths = {
        '/users': {
          get: {
            operationId: 'getUsers',
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: { type: 'object', properties: {} }
                    }
                  }
                }
              }
            }
          }
        },
        '/users/{id}/orders': {
          get: {
            operationId: 'getUserOrders',
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: { type: 'object', properties: {} }
                    }
                  }
                }
              }
            }
          }
        },
        '/orders': {
          get: {
            operationId: 'getOrders',
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: { type: 'object', properties: {} }
                    }
                  }
                }
              }
            }
          }
        }
      };

      mockIR = {
        appName: 'Test App',
        resources: [],
        authStrategy: { type: 'none' }
      };

      extractor = new Resource_Extractor(
        mockSpec,
        mockAdapterUtils,
        mockAnnotationRegistry,
        mockViewHintClassifier,
        mockRelationshipDetector,
        mockPaginationDetector,
        mockSchemaProcessor
      );

      extractor.setCurrentIR(mockIR);

      // Spy on console.warn
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleWarnSpy.mockRestore();
    });

    it('should use explicit type directly when present', () => {
      const configRelationships: RelationshipConfig[] = [
        {
          source: 'users',
          target: 'orders',
          path: '/users/{id}/orders',
          type: 'hasMany'
        }
      ];

      const mockAdaptOperation = (method: string, path: string, operation: OpenAPIV3.OperationObject): Operation => ({
        id: operation.operationId || `${method}_${path}`,
        method: method as any,
        path,
        summary: operation.summary || '',
        description: operation.description || '',
        parameters: [],
        responses: {},
        viewHint: 'list'
      });

      const resources = extractor.extractResources(mockAdaptOperation, configRelationships);

      const userResource = resources.find(r => r.slug === 'users');
      expect(userResource).toBeDefined();
      expect(userResource!.relationships).toHaveLength(1);
      expect(userResource!.relationships[0].type).toBe('hasMany');
      expect(userResource!.relationships[0].target).toBe('orders');

      // Should NOT log deprecation warning when explicit type is present
      expect(consoleWarnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('missing explicit type')
      );
    });

    it('should fall back to path-based derivation when type is missing', () => {
      const configRelationships: RelationshipConfig[] = [
        {
          source: 'users',
          target: 'orders',
          path: '/users/{id}/orders'
          // type field is missing
        }
      ];

      const mockAdaptOperation = (method: string, path: string, operation: OpenAPIV3.OperationObject): Operation => ({
        id: operation.operationId || `${method}_${path}`,
        method: method as any,
        path,
        summary: operation.summary || '',
        description: operation.description || '',
        parameters: [],
        responses: {},
        viewHint: 'list'
      });

      const resources = extractor.extractResources(mockAdaptOperation, configRelationships);

      const userResource = resources.find(r => r.slug === 'users');
      expect(userResource).toBeDefined();
      expect(userResource!.relationships).toHaveLength(1);
      // Should derive hasMany from path pattern /users/{id}/orders
      expect(userResource!.relationships[0].type).toBe('hasMany');
      expect(userResource!.relationships[0].target).toBe('orders');

      // Should log deprecation warning when type is missing
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Resource_Extractor] Relationship users -> orders missing explicit type')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Deriving from path. Consider adding an explicit type field.')
      );
    });

    it('should use explicit belongsTo type', () => {
      const configRelationships: RelationshipConfig[] = [
        {
          source: 'orders',
          target: 'users',
          path: '/users/{id}/orders',
          type: 'belongsTo'
        }
      ];

      const mockAdaptOperation = (method: string, path: string, operation: OpenAPIV3.OperationObject): Operation => ({
        id: operation.operationId || `${method}_${path}`,
        method: method as any,
        path,
        summary: operation.summary || '',
        description: operation.description || '',
        parameters: [],
        responses: {},
        viewHint: 'list'
      });

      const resources = extractor.extractResources(mockAdaptOperation, configRelationships);

      const orderResource = resources.find(r => r.slug === 'orders');
      expect(orderResource).toBeDefined();
      expect(orderResource!.relationships).toHaveLength(1);
      expect(orderResource!.relationships[0].type).toBe('belongsTo');
      expect(orderResource!.relationships[0].target).toBe('users');

      // Should NOT log deprecation warning
      expect(consoleWarnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('missing explicit type')
      );
    });

    it('should use explicit manyToMany type', () => {
      const configRelationships: RelationshipConfig[] = [
        {
          source: 'users',
          target: 'orders',
          path: '/users/{id}/orders',
          type: 'manyToMany'
        }
      ];

      const mockAdaptOperation = (method: string, path: string, operation: OpenAPIV3.OperationObject): Operation => ({
        id: operation.operationId || `${method}_${path}`,
        method: method as any,
        path,
        summary: operation.summary || '',
        description: operation.description || '',
        parameters: [],
        responses: {},
        viewHint: 'list'
      });

      const resources = extractor.extractResources(mockAdaptOperation, configRelationships);

      const userResource = resources.find(r => r.slug === 'users');
      expect(userResource).toBeDefined();
      expect(userResource!.relationships).toHaveLength(1);
      expect(userResource!.relationships[0].type).toBe('manyToMany');
      expect(userResource!.relationships[0].target).toBe('orders');

      // Should NOT log deprecation warning
      expect(consoleWarnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('missing explicit type')
      );
    });

    it('should not apply path-based derivation when explicit type is present', () => {
      // Path pattern suggests hasMany, but explicit type is belongsTo
      const configRelationships: RelationshipConfig[] = [
        {
          source: 'users',
          target: 'orders',
          path: '/users/{id}/orders',
          type: 'belongsTo' // Explicit type overrides path pattern
        }
      ];

      const mockAdaptOperation = (method: string, path: string, operation: OpenAPIV3.OperationObject): Operation => ({
        id: operation.operationId || `${method}_${path}`,
        method: method as any,
        path,
        summary: operation.summary || '',
        description: operation.description || '',
        parameters: [],
        responses: {},
        viewHint: 'list'
      });

      const resources = extractor.extractResources(mockAdaptOperation, configRelationships);

      const userResource = resources.find(r => r.slug === 'users');
      expect(userResource).toBeDefined();
      expect(userResource!.relationships).toHaveLength(1);
      // Should use explicit type, not derived type
      expect(userResource!.relationships[0].type).toBe('belongsTo');
      expect(userResource!.relationships[0].target).toBe('orders');

      // Should NOT log deprecation warning
      expect(consoleWarnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('missing explicit type')
      );
    });

    it('should handle multiple relationships with mixed explicit and missing types', () => {
      mockSpec.paths['/users/{id}/posts'] = {
        get: {
          operationId: 'getUserPosts',
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { type: 'object', properties: {} }
                  }
                }
              }
            }
          }
        }
      };

      mockSpec.paths['/posts'] = {
        get: {
          operationId: 'getPosts',
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { type: 'object', properties: {} }
                  }
                }
              }
            }
          }
        }
      };

      const configRelationships: RelationshipConfig[] = [
        {
          source: 'users',
          target: 'orders',
          path: '/users/{id}/orders',
          type: 'hasMany' // Explicit type
        },
        {
          source: 'users',
          target: 'posts',
          path: '/users/{id}/posts'
          // Missing type - should derive
        }
      ];

      const mockAdaptOperation = (method: string, path: string, operation: OpenAPIV3.OperationObject): Operation => ({
        id: operation.operationId || `${method}_${path}`,
        method: method as any,
        path,
        summary: operation.summary || '',
        description: operation.description || '',
        parameters: [],
        responses: {},
        viewHint: 'list'
      });

      const resources = extractor.extractResources(mockAdaptOperation, configRelationships);

      const userResource = resources.find(r => r.slug === 'users');
      expect(userResource).toBeDefined();
      expect(userResource!.relationships).toHaveLength(2);

      const ordersRel = userResource!.relationships.find(r => r.target === 'orders');
      expect(ordersRel).toBeDefined();
      expect(ordersRel!.type).toBe('hasMany');

      const postsRel = userResource!.relationships.find(r => r.target === 'posts');
      expect(postsRel).toBeDefined();
      expect(postsRel!.type).toBe('hasMany'); // Derived from path

      // Should log deprecation warning only for the relationship without explicit type
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Resource_Extractor] Relationship users -> posts missing explicit type')
      );
      expect(consoleWarnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('users -> orders')
      );
    });
  });
});
