import { describe, it, expect, vi } from 'vitest';
import { Parameter_Processor } from '../parameter-processor.js';
import type { OpenAPIV3 } from 'openapi-types';
import type { AdapterUtils } from '../annotations/index.js';
import type { SchemaProcessor } from '../schema-processor.js';
import type { AnnotationHandlerRegistry } from '../annotations/registry.js';

/**
 * Unit tests for Parameter_Processor
 *
 * Requirements: 16.6
 */

describe('Parameter_Processor', () => {
  const createMockAdapterUtils = (): AdapterUtils => ({
    humanize: (str: string) => str.replace(/([A-Z])/g, ' $1').trim(),
    resolveRef: vi.fn(() => null),
    logError: vi.fn(),
    logWarning: vi.fn()
  });

  const createMockSchemaProcessor = (): SchemaProcessor => ({
    processSchema: vi.fn(),
    shouldIgnoreSchema: vi.fn(),
    resolveLabel: vi.fn(),
    setCurrentIR: vi.fn()
  } as any);

  const createMockAnnotationRegistry = (): AnnotationHandlerRegistry => ({
    processAnnotations: vi.fn()
  } as any);

  const createMinimalDocument = (): OpenAPIV3.Document => ({
    openapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    paths: {},
    components: { parameters: {} }
  });

  describe('constructor', () => {
    it('accepts all required dependencies', () => {
      const spec = createMinimalDocument();
      const adapterUtils = createMockAdapterUtils();
      const schemaProcessor = createMockSchemaProcessor();
      const annotationRegistry = createMockAnnotationRegistry();

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      expect(processor).toBeDefined();
      expect(processor).toBeInstanceOf(Parameter_Processor);
    });

    it('accepts OpenAPIV3.Document as first parameter', () => {
      const spec = createMinimalDocument();
      const adapterUtils = createMockAdapterUtils();
      const schemaProcessor = createMockSchemaProcessor();
      const annotationRegistry = createMockAnnotationRegistry();

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      expect(processor).toBeDefined();
    });

    it('accepts AdapterUtils as second parameter', () => {
      const spec = createMinimalDocument();
      const adapterUtils = createMockAdapterUtils();
      const schemaProcessor = createMockSchemaProcessor();
      const annotationRegistry = createMockAnnotationRegistry();

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      expect(processor).toBeDefined();
    });

    it('accepts SchemaProcessor as third parameter', () => {
      const spec = createMinimalDocument();
      const adapterUtils = createMockAdapterUtils();
      const schemaProcessor = createMockSchemaProcessor();
      const annotationRegistry = createMockAnnotationRegistry();

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      expect(processor).toBeDefined();
    });

    it('accepts AnnotationHandlerRegistry as fourth parameter', () => {
      const spec = createMinimalDocument();
      const adapterUtils = createMockAdapterUtils();
      const schemaProcessor = createMockSchemaProcessor();
      const annotationRegistry = createMockAnnotationRegistry();

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      expect(processor).toBeDefined();
    });
  });

  describe('processParameters method', () => {
    it('exists as a public method', () => {
      const spec = createMinimalDocument();
      const adapterUtils = createMockAdapterUtils();
      const schemaProcessor = createMockSchemaProcessor();
      const annotationRegistry = createMockAnnotationRegistry();

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      expect(processor.processParameters).toBeDefined();
      expect(typeof processor.processParameters).toBe('function');
    });

    it('accepts operation parameters as first argument', () => {
      const spec = createMinimalDocument();
      const adapterUtils = createMockAdapterUtils();
      const schemaProcessor = createMockSchemaProcessor();
      const annotationRegistry = createMockAnnotationRegistry();

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      const operationParams: OpenAPIV3.ParameterObject[] = [];
      
      expect(() => processor.processParameters(operationParams)).not.toThrow();
    });

    it('accepts path parameters as optional second argument', () => {
      const spec = createMinimalDocument();
      const adapterUtils = createMockAdapterUtils();
      const schemaProcessor = createMockSchemaProcessor();
      const annotationRegistry = createMockAnnotationRegistry();

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      const operationParams: OpenAPIV3.ParameterObject[] = [];
      const pathParams: OpenAPIV3.ParameterObject[] = [];
      
      expect(() => processor.processParameters(operationParams, pathParams)).not.toThrow();
    });

    it('returns an array', () => {
      const spec = createMinimalDocument();
      const adapterUtils = createMockAdapterUtils();
      const schemaProcessor = createMockSchemaProcessor();
      const annotationRegistry = createMockAnnotationRegistry();

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      const result = processor.processParameters([]);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('parameter key generation', () => {
    /**
     * Tests for Requirement 11.4: Parameter key generation for path parameters
     * Tests parameter key generation indirectly through processParameters()
     * by verifying that parameters with the same name but different locations
     * are both included (treated as separate parameters).
     */
    it('treats parameters with same name but different locations as separate (userId:path vs userId:query)', () => {
      const spec = createMinimalDocument();
      const adapterUtils = createMockAdapterUtils();
      const schemaProcessor = createMockSchemaProcessor();
      schemaProcessor.processSchema = vi.fn(() => ({
        type: 'text',
        key: 'userId',
        label: 'User Id',
        required: false,
        children: []
      } as any));
      const annotationRegistry = createMockAnnotationRegistry();

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      const pathParams: OpenAPIV3.ParameterObject[] = [
        {
          name: 'userId',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ];

      const operationParams: OpenAPIV3.ParameterObject[] = [
        {
          name: 'userId',
          in: 'query',
          required: false,
          schema: { type: 'string' }
        }
      ];

      const result = processor.processParameters(operationParams, pathParams);

      // Both parameters should be included because they have different locations
      expect(result).toHaveLength(2);
      
      // Find path parameter
      const pathParam = result.find(p => p.in === 'path');
      expect(pathParam).toBeDefined();
      expect(pathParam?.name).toBe('userId');
      expect(pathParam?.required).toBe(true);

      // Find query parameter
      const queryParam = result.find(p => p.in === 'query');
      expect(queryParam).toBeDefined();
      expect(queryParam?.name).toBe('userId');
      expect(queryParam?.required).toBe(false);
    });

    /**
     * Tests for Requirement 11.5: Parameter key generation for query parameters
     * Tests that query parameters are correctly identified by their key (name:query)
     */
    it('correctly identifies query parameters (limit:query)', () => {
      const spec = createMinimalDocument();
      const adapterUtils = createMockAdapterUtils();
      const schemaProcessor = createMockSchemaProcessor();
      schemaProcessor.processSchema = vi.fn(() => ({
        type: 'number',
        key: 'limit',
        label: 'Limit',
        required: false,
        children: []
      } as any));
      const annotationRegistry = createMockAnnotationRegistry();

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      const pathParams: OpenAPIV3.ParameterObject[] = [
        {
          name: 'limit',
          in: 'query',
          required: false,
          schema: { type: 'integer' }
        }
      ];

      const operationParams: OpenAPIV3.ParameterObject[] = [
        {
          name: 'limit',
          in: 'query',
          required: true,
          schema: { type: 'integer', minimum: 1 }
        }
      ];

      const result = processor.processParameters(operationParams, pathParams);

      // Only operation-level parameter should be included (same name AND location)
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('limit');
      expect(result[0].in).toBe('query');
      expect(result[0].required).toBe(true); // Operation-level value
    });

    /**
     * Tests for Requirement 11.4: Parameter key generation for header parameters
     * Tests that header parameters are correctly identified by their key (name:header)
     */
    it('correctly identifies header parameters (Authorization:header)', () => {
      const spec = createMinimalDocument();
      const adapterUtils = createMockAdapterUtils();
      const schemaProcessor = createMockSchemaProcessor();
      schemaProcessor.processSchema = vi.fn(() => ({
        type: 'text',
        key: 'Authorization',
        label: 'Authorization',
        required: false,
        children: []
      } as any));
      const annotationRegistry = createMockAnnotationRegistry();

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      const pathParams: OpenAPIV3.ParameterObject[] = [
        {
          name: 'Authorization',
          in: 'header',
          required: false,
          schema: { type: 'string' }
        }
      ];

      const operationParams: OpenAPIV3.ParameterObject[] = [
        {
          name: 'Authorization',
          in: 'header',
          required: true,
          schema: { type: 'string' }
        }
      ];

      const result = processor.processParameters(operationParams, pathParams);

      // Only operation-level parameter should be included (same name AND location)
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Authorization');
      expect(result[0].in).toBe('header');
      expect(result[0].required).toBe(true); // Operation-level value
    });

    /**
     * Tests for Requirement 11.4: Parameter key generation for cookie parameters
     * Tests that cookie parameters are correctly identified by their key (name:cookie)
     */
    it('correctly identifies cookie parameters (session:cookie)', () => {
      const spec = createMinimalDocument();
      const adapterUtils = createMockAdapterUtils();
      const schemaProcessor = createMockSchemaProcessor();
      schemaProcessor.processSchema = vi.fn(() => ({
        type: 'text',
        key: 'session',
        label: 'Session',
        required: false,
        children: []
      } as any));
      const annotationRegistry = createMockAnnotationRegistry();

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      const pathParams: OpenAPIV3.ParameterObject[] = [
        {
          name: 'session',
          in: 'cookie',
          required: false,
          schema: { type: 'string' }
        }
      ];

      const operationParams: OpenAPIV3.ParameterObject[] = [
        {
          name: 'session',
          in: 'cookie',
          required: true,
          schema: { type: 'string' }
        }
      ];

      const result = processor.processParameters(operationParams, pathParams);

      // Only operation-level parameter should be included (same name AND location)
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('session');
      expect(result[0].in).toBe('cookie');
      expect(result[0].required).toBe(true); // Operation-level value
    });

    /**
     * Tests for Requirement 11.6: Parameters with different keys are treated as separate
     * Tests that parameters with same name but different locations both appear in output
     */
    it('includes both parameters when they have different locations (different keys)', () => {
      const spec = createMinimalDocument();
      const adapterUtils = createMockAdapterUtils();
      const schemaProcessor = createMockSchemaProcessor();
      schemaProcessor.processSchema = vi.fn(() => ({
        type: 'text',
        key: 'id',
        label: 'Id',
        required: false,
        children: []
      } as any));
      const annotationRegistry = createMockAnnotationRegistry();

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      const operationParams: OpenAPIV3.ParameterObject[] = [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        },
        {
          name: 'id',
          in: 'query',
          required: false,
          schema: { type: 'string' }
        },
        {
          name: 'id',
          in: 'header',
          required: false,
          schema: { type: 'string' }
        }
      ];

      const result = processor.processParameters(operationParams);

      // All three parameters should be included (different locations = different keys)
      expect(result).toHaveLength(3);
      
      const locations = result.map(p => p.in).sort();
      expect(locations).toEqual(['header', 'path', 'query']);
      
      // All should have the same name
      expect(result.every(p => p.name === 'id')).toBe(true);
    });

    /**
     * Tests for Requirement 11.2: Parameter keys used for conflict detection
     * Tests that operation-level parameters override path-level when they have the same key
     */
    it('uses parameter keys for conflict detection (operation overrides path with same key)', () => {
      const spec = createMinimalDocument();
      const adapterUtils = createMockAdapterUtils();
      const schemaProcessor = createMockSchemaProcessor();
      schemaProcessor.processSchema = vi.fn(() => ({
        type: 'text',
        key: 'filter',
        label: 'Filter',
        required: false,
        children: []
      } as any));
      const annotationRegistry = createMockAnnotationRegistry();

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      const pathParams: OpenAPIV3.ParameterObject[] = [
        {
          name: 'filter',
          in: 'query',
          required: false,
          description: 'Path-level filter',
          schema: { type: 'string' }
        }
      ];

      const operationParams: OpenAPIV3.ParameterObject[] = [
        {
          name: 'filter',
          in: 'query',
          required: true,
          description: 'Operation-level filter',
          schema: { type: 'string' }
        }
      ];

      const result = processor.processParameters(operationParams, pathParams);

      // Only one parameter (operation-level overrides path-level)
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('filter');
      expect(result[0].in).toBe('query');
      expect(result[0].description).toBe('Operation-level filter');
      expect(result[0].required).toBe(true);
    });
  });

  describe('parameter merging', () => {
    /**
     * Tests for Requirement 15.1: Operation-level parameters override path-level parameters
     * Tests that when operation and path have same name and location, operation wins
     */
    it('operation-level parameters override path-level parameters (same name and location)', () => {
      const spec = createMinimalDocument();
      const adapterUtils = createMockAdapterUtils();
      const schemaProcessor = createMockSchemaProcessor();
      schemaProcessor.processSchema = vi.fn(() => ({
        type: 'text',
        key: 'apiKey',
        label: 'Api Key',
        required: false,
        children: []
      } as any));
      const annotationRegistry = createMockAnnotationRegistry();

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      const pathParams: OpenAPIV3.ParameterObject[] = [
        {
          name: 'apiKey',
          in: 'header',
          required: false,
          description: 'Path-level API key',
          schema: { type: 'string' }
        }
      ];

      const operationParams: OpenAPIV3.ParameterObject[] = [
        {
          name: 'apiKey',
          in: 'header',
          required: true,
          description: 'Operation-level API key',
          schema: { type: 'string' }
        }
      ];

      const result = processor.processParameters(operationParams, pathParams);

      // Only one parameter should be returned (operation overrides path)
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('apiKey');
      expect(result[0].in).toBe('header');
      expect(result[0].required).toBe(true); // Operation-level value
      expect(result[0].description).toBe('Operation-level API key'); // Operation-level value
    });

    /**
     * Tests for Requirement 15.2: Parameters with same name but different locations
     * Tests that both parameters are included when locations differ
     */
    it('parameters with same name but different locations (both included)', () => {
      const spec = createMinimalDocument();
      const adapterUtils = createMockAdapterUtils();
      const schemaProcessor = createMockSchemaProcessor();
      schemaProcessor.processSchema = vi.fn(() => ({
        type: 'text',
        key: 'id',
        label: 'Id',
        required: false,
        children: []
      } as any));
      const annotationRegistry = createMockAnnotationRegistry();

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      const pathParams: OpenAPIV3.ParameterObject[] = [
        {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Resource ID in path',
          schema: { type: 'string' }
        }
      ];

      const operationParams: OpenAPIV3.ParameterObject[] = [
        {
          name: 'id',
          in: 'query',
          required: false,
          description: 'Filter ID in query',
          schema: { type: 'string' }
        }
      ];

      const result = processor.processParameters(operationParams, pathParams);

      // Both parameters should be included (different locations)
      expect(result).toHaveLength(2);
      
      const pathParam = result.find(p => p.in === 'path');
      expect(pathParam).toBeDefined();
      expect(pathParam?.name).toBe('id');
      expect(pathParam?.required).toBe(true);
      expect(pathParam?.description).toBe('Resource ID in path');

      const queryParam = result.find(p => p.in === 'query');
      expect(queryParam).toBeDefined();
      expect(queryParam?.name).toBe('id');
      expect(queryParam?.required).toBe(false);
      expect(queryParam?.description).toBe('Filter ID in query');
    });

    /**
     * Tests for Requirement 15.3: Parameters with different names
     * Tests that all parameters are included when names differ
     */
    it('parameters with different names (both included)', () => {
      const spec = createMinimalDocument();
      const adapterUtils = createMockAdapterUtils();
      const schemaProcessor = createMockSchemaProcessor();
      schemaProcessor.processSchema = vi.fn((key: string) => ({
        type: 'text',
        key,
        label: key,
        required: false,
        children: []
      } as any));
      const annotationRegistry = createMockAnnotationRegistry();

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      const pathParams: OpenAPIV3.ParameterObject[] = [
        {
          name: 'userId',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ];

      const operationParams: OpenAPIV3.ParameterObject[] = [
        {
          name: 'limit',
          in: 'query',
          required: false,
          schema: { type: 'integer' }
        }
      ];

      const result = processor.processParameters(operationParams, pathParams);

      // Both parameters should be included (different names)
      expect(result).toHaveLength(2);
      
      const userIdParam = result.find(p => p.name === 'userId');
      expect(userIdParam).toBeDefined();
      expect(userIdParam?.in).toBe('path');
      expect(userIdParam?.required).toBe(true);

      const limitParam = result.find(p => p.name === 'limit');
      expect(limitParam).toBeDefined();
      expect(limitParam?.in).toBe('query');
      expect(limitParam?.required).toBe(false);
    });

    /**
     * Tests for Requirement 15.4: Empty operation parameters
     * Tests that path parameters are used when operation parameters are empty
     */
    it('empty operation parameters (use path parameters)', () => {
      const spec = createMinimalDocument();
      const adapterUtils = createMockAdapterUtils();
      const schemaProcessor = createMockSchemaProcessor();
      schemaProcessor.processSchema = vi.fn(() => ({
        type: 'text',
        key: 'userId',
        label: 'User Id',
        required: false,
        children: []
      } as any));
      const annotationRegistry = createMockAnnotationRegistry();

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      const pathParams: OpenAPIV3.ParameterObject[] = [
        {
          name: 'userId',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }
      ];

      const operationParams: OpenAPIV3.ParameterObject[] = [];

      const result = processor.processParameters(operationParams, pathParams);

      // Path parameter should be included
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('userId');
      expect(result[0].in).toBe('path');
      expect(result[0].required).toBe(true);
    });

    /**
     * Tests for Requirement 15.5: Empty path parameters
     * Tests that operation parameters are used when path parameters are empty
     */
    it('empty path parameters (use operation parameters)', () => {
      const spec = createMinimalDocument();
      const adapterUtils = createMockAdapterUtils();
      const schemaProcessor = createMockSchemaProcessor();
      schemaProcessor.processSchema = vi.fn(() => ({
        type: 'text',
        key: 'limit',
        label: 'Limit',
        required: false,
        children: []
      } as any));
      const annotationRegistry = createMockAnnotationRegistry();

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      const pathParams: OpenAPIV3.ParameterObject[] = [];

      const operationParams: OpenAPIV3.ParameterObject[] = [
        {
          name: 'limit',
          in: 'query',
          required: false,
          schema: { type: 'integer' }
        }
      ];

      const result = processor.processParameters(operationParams, pathParams);

      // Operation parameter should be included
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('limit');
      expect(result[0].in).toBe('query');
      expect(result[0].required).toBe(false);
    });

    /**
     * Tests for Requirement 15.6, 15.7, 23.6: Parameter order preservation
     * Tests that path-level parameters come first, then operation-level parameters
     */
    it('parameter order preservation (path-level first, then operation-level)', () => {
      const spec = createMinimalDocument();
      const adapterUtils = createMockAdapterUtils();
      const schemaProcessor = createMockSchemaProcessor();
      schemaProcessor.processSchema = vi.fn((key: string) => ({
        type: 'text',
        key,
        label: key,
        required: false,
        children: []
      } as any));
      const annotationRegistry = createMockAnnotationRegistry();

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      const pathParams: OpenAPIV3.ParameterObject[] = [
        {
          name: 'pathParam1',
          in: 'query',
          required: false,
          schema: { type: 'string' }
        },
        {
          name: 'pathParam2',
          in: 'query',
          required: false,
          schema: { type: 'string' }
        }
      ];

      const operationParams: OpenAPIV3.ParameterObject[] = [
        {
          name: 'opParam1',
          in: 'query',
          required: false,
          schema: { type: 'string' }
        },
        {
          name: 'opParam2',
          in: 'query',
          required: false,
          schema: { type: 'string' }
        }
      ];

      const result = processor.processParameters(operationParams, pathParams);

      // All parameters should be included
      expect(result).toHaveLength(4);
      
      // Check order: path parameters first, then operation parameters
      expect(result[0].name).toBe('pathParam1');
      expect(result[1].name).toBe('pathParam2');
      expect(result[2].name).toBe('opParam1');
      expect(result[3].name).toBe('opParam2');
    });

    /**
     * Tests for Requirement 23.1-23.5: Complex merging scenario
     * Tests merging with multiple parameters, some overriding, some not
     */
    it('complex merging scenario with overrides and additions', () => {
      const spec = createMinimalDocument();
      const adapterUtils = createMockAdapterUtils();
      const schemaProcessor = createMockSchemaProcessor();
      schemaProcessor.processSchema = vi.fn((key: string) => ({
        type: 'text',
        key,
        label: key,
        required: false,
        children: []
      } as any));
      const annotationRegistry = createMockAnnotationRegistry();

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      const pathParams: OpenAPIV3.ParameterObject[] = [
        {
          name: 'userId',
          in: 'path',
          required: true,
          description: 'Path-level userId',
          schema: { type: 'string' }
        },
        {
          name: 'limit',
          in: 'query',
          required: false,
          description: 'Path-level limit',
          schema: { type: 'integer' }
        },
        {
          name: 'offset',
          in: 'query',
          required: false,
          description: 'Path-level offset',
          schema: { type: 'integer' }
        }
      ];

      const operationParams: OpenAPIV3.ParameterObject[] = [
        {
          name: 'limit',
          in: 'query',
          required: true,
          description: 'Operation-level limit',
          schema: { type: 'integer', minimum: 1 }
        },
        {
          name: 'filter',
          in: 'query',
          required: false,
          description: 'Operation-level filter',
          schema: { type: 'string' }
        }
      ];

      const result = processor.processParameters(operationParams, pathParams);

      // Should have 4 parameters: userId (path), offset (path), limit (operation), filter (operation)
      expect(result).toHaveLength(4);
      
      // Check userId from path (not overridden)
      const userIdParam = result.find(p => p.name === 'userId');
      expect(userIdParam).toBeDefined();
      expect(userIdParam?.description).toBe('Path-level userId');
      
      // Check offset from path (not overridden)
      const offsetParam = result.find(p => p.name === 'offset');
      expect(offsetParam).toBeDefined();
      expect(offsetParam?.description).toBe('Path-level offset');
      
      // Check limit from operation (overrides path)
      const limitParam = result.find(p => p.name === 'limit');
      expect(limitParam).toBeDefined();
      expect(limitParam?.description).toBe('Operation-level limit');
      expect(limitParam?.required).toBe(true); // Operation-level value
      
      // Check filter from operation (new parameter)
      const filterParam = result.find(p => p.name === 'filter');
      expect(filterParam).toBeDefined();
      expect(filterParam?.description).toBe('Operation-level filter');
      
      // Check order: path params first (userId, offset), then operation params (limit, filter)
      expect(result[0].name).toBe('userId');
      expect(result[1].name).toBe('offset');
      expect(result[2].name).toBe('limit');
      expect(result[3].name).toBe('filter');
    });
  });

  describe('reference resolution', () => {
    /**
     * Tests for Requirement 2.7: Valid OpenAPI 3.x references
     * Tests for Requirement 22.2: Handle missing parameter references gracefully
     */
    it('resolves valid OpenAPI 3.x references (#/components/parameters/UserId)', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {},
        components: {
          parameters: {
            UserId: {
              name: 'userId',
              in: 'path',
              required: true,
              schema: { type: 'string' }
            }
          }
        }
      };

      const adapterUtils = createMockAdapterUtils();
      const schemaProcessor = createMockSchemaProcessor();
      schemaProcessor.processSchema = vi.fn(() => ({
        type: 'string',
        key: 'userId',
        label: 'User Id',
        required: true,
        children: []
      }));
      const annotationRegistry = createMockAnnotationRegistry();

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      const operationParams: OpenAPIV3.ReferenceObject[] = [
        { $ref: '#/components/parameters/UserId' }
      ];

      const result = processor.processParameters(operationParams);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('userId');
      expect(result[0].in).toBe('path');
      expect(result[0].required).toBe(true);
    });

    /**
     * Tests for Requirement 2.8: Valid Swagger 2.0 references
     * Tests for Requirement 22.5: Handle malformed $ref paths gracefully
     */
    it('resolves valid Swagger 2.0 references (#/parameters/UserId)', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {},
        parameters: {
          UserId: {
            name: 'userId',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        }
      } as any;

      const adapterUtils = createMockAdapterUtils();
      const schemaProcessor = createMockSchemaProcessor();
      schemaProcessor.processSchema = vi.fn(() => ({
        type: 'string',
        key: 'userId',
        label: 'User Id',
        required: true,
        children: []
      }));
      const annotationRegistry = createMockAnnotationRegistry();

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      const operationParams: OpenAPIV3.ReferenceObject[] = [
        { $ref: '#/parameters/UserId' }
      ];

      const result = processor.processParameters(operationParams);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('userId');
      expect(result[0].in).toBe('path');
      expect(result[0].required).toBe(true);
    });

    /**
     * Tests for Requirement 22.2: Handle missing parameter references gracefully
     * Tests for Requirement 22.6: Continue processing other parameters
     */
    it('returns empty array for invalid references (return null)', () => {
      const spec = createMinimalDocument();
      const adapterUtils = createMockAdapterUtils();
      const schemaProcessor = createMockSchemaProcessor();
      const annotationRegistry = createMockAnnotationRegistry();

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      const operationParams: OpenAPIV3.ReferenceObject[] = [
        { $ref: '#/components/parameters/NonExistent' }
      ];

      const result = processor.processParameters(operationParams);

      expect(result).toHaveLength(0);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Could not resolve parameter reference: #/components/parameters/NonExistent'
      );

      consoleWarnSpy.mockRestore();
    });

    /**
     * Tests for Requirement 22.5: Handle malformed $ref paths gracefully
     * Tests for Requirement 22.7: Log warnings for unresolvable references
     */
    it('returns empty array for malformed references (return null)', () => {
      const spec = createMinimalDocument();
      const adapterUtils = createMockAdapterUtils();
      const schemaProcessor = createMockSchemaProcessor();
      const annotationRegistry = createMockAnnotationRegistry();

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      const operationParams: OpenAPIV3.ReferenceObject[] = [
        { $ref: 'invalid/reference/format' }
      ];

      const result = processor.processParameters(operationParams);

      expect(result).toHaveLength(0);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Invalid parameter reference format: invalid/reference/format'
      );

      consoleWarnSpy.mockRestore();
    });

    /**
     * Tests for Requirement 22.7: Log warnings for unresolvable references
     */
    it('logs warning for unresolvable references', () => {
      const spec = createMinimalDocument();
      const adapterUtils = createMockAdapterUtils();
      const schemaProcessor = createMockSchemaProcessor();
      const annotationRegistry = createMockAnnotationRegistry();

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      const operationParams: OpenAPIV3.ReferenceObject[] = [
        { $ref: '#/components/parameters/DoesNotExist' }
      ];

      processor.processParameters(operationParams);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Could not resolve parameter reference: #/components/parameters/DoesNotExist'
      );

      consoleWarnSpy.mockRestore();
    });

    /**
     * Tests for Requirement 22.6: Continue processing other parameters
     */
    it('continues processing other parameters when one reference fails', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {},
        components: {
          parameters: {
            ValidParam: {
              name: 'validParam',
              in: 'query',
              required: false,
              schema: { type: 'string' }
            }
          }
        }
      };

      const adapterUtils = createMockAdapterUtils();
      const schemaProcessor = createMockSchemaProcessor();
      schemaProcessor.processSchema = vi.fn(() => ({
        type: 'string',
        key: 'validParam',
        label: 'Valid Param',
        required: false,
        children: []
      }));
      const annotationRegistry = createMockAnnotationRegistry();

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      const operationParams: (OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject)[] = [
        { $ref: '#/components/parameters/InvalidParam' },
        { $ref: '#/components/parameters/ValidParam' }
      ];

      const result = processor.processParameters(operationParams);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('validParam');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Could not resolve parameter reference: #/components/parameters/InvalidParam'
      );

      consoleWarnSpy.mockRestore();
    });

    /**
     * Tests for Requirement 2.7: Resolve references from #/components/parameters/ParameterName
     */
    it('resolves nested component references correctly', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {},
        components: {
          parameters: {
            Limit: {
              name: 'limit',
              in: 'query',
              required: false,
              schema: { type: 'integer', minimum: 1, maximum: 100 }
            }
          }
        }
      };

      const adapterUtils = createMockAdapterUtils();
      const schemaProcessor = createMockSchemaProcessor();
      schemaProcessor.processSchema = vi.fn(() => ({
        type: 'integer',
        key: 'limit',
        label: 'Limit',
        required: false,
        children: []
      }));
      const annotationRegistry = createMockAnnotationRegistry();

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      const operationParams: OpenAPIV3.ReferenceObject[] = [
        { $ref: '#/components/parameters/Limit' }
      ];

      const result = processor.processParameters(operationParams);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('limit');
      expect(result[0].in).toBe('query');
      expect(result[0].required).toBe(false);
    });
  });

  describe('parameter filtering', () => {
    /**
     * Tests for Requirement 4.7: Operation-level x-uigen-ignore: true (exclude parameter)
     */
    it('excludes parameter with operation-level x-uigen-ignore: true', () => {
      const spec = createMinimalDocument();
      const adapterUtils = createMockAdapterUtils();
      const schemaProcessor = createMockSchemaProcessor();
      const annotationRegistry = createMockAnnotationRegistry();

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      const operationParams: OpenAPIV3.ParameterObject[] = [
        {
          name: 'apiKey',
          in: 'header',
          required: false,
          schema: { type: 'string' },
          'x-uigen-ignore': true
        } as any
      ];

      const result = processor.processParameters(operationParams);

      expect(result).toHaveLength(0);
    });

    /**
     * Tests for Requirement 4.8: Operation-level x-uigen-ignore: false (include parameter)
     */
    it('includes parameter with operation-level x-uigen-ignore: false', () => {
      const spec = createMinimalDocument();
      const adapterUtils = createMockAdapterUtils();
      const schemaProcessor = createMockSchemaProcessor();
      schemaProcessor.processSchema = vi.fn(() => ({
        type: 'text',
        key: 'apiKey',
        label: 'Api Key',
        required: false,
        children: []
      } as any));
      const annotationRegistry = createMockAnnotationRegistry();

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      const operationParams: OpenAPIV3.ParameterObject[] = [
        {
          name: 'apiKey',
          in: 'header',
          required: false,
          schema: { type: 'string' },
          'x-uigen-ignore': false
        } as any
      ];

      const result = processor.processParameters(operationParams);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('apiKey');
    });

    /**
     * Tests for Requirement 4.2: Path-level x-uigen-ignore: true (exclude when no operation-level)
     */
    it('excludes parameter with path-level x-uigen-ignore: true when no operation-level annotation', () => {
      const spec = createMinimalDocument();
      const adapterUtils = createMockAdapterUtils();
      const schemaProcessor = createMockSchemaProcessor();
      const annotationRegistry = createMockAnnotationRegistry();

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      const pathParams: OpenAPIV3.ParameterObject[] = [
        {
          name: 'apiKey',
          in: 'header',
          required: false,
          schema: { type: 'string' },
          'x-uigen-ignore': true
        } as any
      ];

      const operationParams: OpenAPIV3.ParameterObject[] = [];

      const result = processor.processParameters(operationParams, pathParams);

      expect(result).toHaveLength(0);
    });

    /**
     * Tests for Requirement 4.3: Path-level x-uigen-ignore: false (include when no operation-level)
     */
    it('includes parameter with path-level x-uigen-ignore: false when no operation-level annotation', () => {
      const spec = createMinimalDocument();
      const adapterUtils = createMockAdapterUtils();
      const schemaProcessor = createMockSchemaProcessor();
      schemaProcessor.processSchema = vi.fn(() => ({
        type: 'text',
        key: 'apiKey',
        label: 'Api Key',
        required: false,
        children: []
      } as any));
      const annotationRegistry = createMockAnnotationRegistry();

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      const pathParams: OpenAPIV3.ParameterObject[] = [
        {
          name: 'apiKey',
          in: 'header',
          required: false,
          schema: { type: 'string' },
          'x-uigen-ignore': false
        } as any
      ];

      const operationParams: OpenAPIV3.ParameterObject[] = [];

      const result = processor.processParameters(operationParams, pathParams);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('apiKey');
    });

    /**
     * Tests for Requirement 5.4: Operation-level x-uigen-ignore: false overrides path-level true
     */
    it('operation-level x-uigen-ignore: false overrides path-level true (include parameter)', () => {
      const spec = createMinimalDocument();
      const adapterUtils = createMockAdapterUtils();
      const schemaProcessor = createMockSchemaProcessor();
      schemaProcessor.processSchema = vi.fn(() => ({
        type: 'text',
        key: 'apiKey',
        label: 'Api Key',
        required: false,
        children: []
      } as any));
      const annotationRegistry = createMockAnnotationRegistry();

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      const pathParams: OpenAPIV3.ParameterObject[] = [
        {
          name: 'apiKey',
          in: 'header',
          required: false,
          schema: { type: 'string' },
          'x-uigen-ignore': true
        } as any
      ];

      const operationParams: OpenAPIV3.ParameterObject[] = [
        {
          name: 'apiKey',
          in: 'header',
          required: false,
          schema: { type: 'string' },
          'x-uigen-ignore': false
        } as any
      ];

      const result = processor.processParameters(operationParams, pathParams);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('apiKey');
    });

    /**
     * Tests for Requirement 5.5: Operation-level x-uigen-ignore: true overrides path-level false
     */
    it('operation-level x-uigen-ignore: true overrides path-level false (exclude parameter)', () => {
      const spec = createMinimalDocument();
      const adapterUtils = createMockAdapterUtils();
      const schemaProcessor = createMockSchemaProcessor();
      const annotationRegistry = createMockAnnotationRegistry();

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      const pathParams: OpenAPIV3.ParameterObject[] = [
        {
          name: 'apiKey',
          in: 'header',
          required: false,
          schema: { type: 'string' },
          'x-uigen-ignore': false
        } as any
      ];

      const operationParams: OpenAPIV3.ParameterObject[] = [
        {
          name: 'apiKey',
          in: 'header',
          required: false,
          schema: { type: 'string' },
          'x-uigen-ignore': true
        } as any
      ];

      const result = processor.processParameters(operationParams, pathParams);

      expect(result).toHaveLength(0);
    });

    /**
     * Tests for Requirement 4.5, 4.6: Invalid annotation values (log warning, treat as undefined)
     */
    it('logs warning for non-boolean x-uigen-ignore value and treats as undefined', () => {
      const spec = createMinimalDocument();
      const adapterUtils = createMockAdapterUtils();
      const schemaProcessor = createMockSchemaProcessor();
      schemaProcessor.processSchema = vi.fn(() => ({
        type: 'text',
        key: 'apiKey',
        label: 'Api Key',
        required: false,
        children: []
      } as any));
      const annotationRegistry = createMockAnnotationRegistry();

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      const operationParams: OpenAPIV3.ParameterObject[] = [
        {
          name: 'apiKey',
          in: 'header',
          required: false,
          schema: { type: 'string' },
          'x-uigen-ignore': 'yes' as any
        } as any
      ];

      const result = processor.processParameters(operationParams);

      expect(result).toHaveLength(1); // Treated as undefined, so included
      expect(result[0].name).toBe('apiKey');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'x-uigen-ignore must be a boolean, found string'
      );

      consoleWarnSpy.mockRestore();
    });

    /**
     * Tests for Requirement 5.7: Parameters with different locations (no precedence)
     */
    it('parameters with same name but different locations have no precedence (both included)', () => {
      const spec = createMinimalDocument();
      const adapterUtils = createMockAdapterUtils();
      const schemaProcessor = createMockSchemaProcessor();
      schemaProcessor.processSchema = vi.fn(() => ({
        type: 'text',
        key: 'id',
        label: 'Id',
        required: false,
        children: []
      } as any));
      const annotationRegistry = createMockAnnotationRegistry();

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      const pathParams: OpenAPIV3.ParameterObject[] = [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          'x-uigen-ignore': true
        } as any
      ];

      const operationParams: OpenAPIV3.ParameterObject[] = [
        {
          name: 'id',
          in: 'query',
          required: false,
          schema: { type: 'string' },
          'x-uigen-ignore': false
        } as any
      ];

      const result = processor.processParameters(operationParams, pathParams);

      // Path parameter is excluded (x-uigen-ignore: true)
      // Query parameter is included (x-uigen-ignore: false)
      // No precedence because different locations
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('id');
      expect(result[0].in).toBe('query');
    });

    /**
     * Tests for Requirement 4.9: No annotation (include parameter by default)
     */
    it('includes parameter with no x-uigen-ignore annotation by default', () => {
      const spec = createMinimalDocument();
      const adapterUtils = createMockAdapterUtils();
      const schemaProcessor = createMockSchemaProcessor();
      schemaProcessor.processSchema = vi.fn(() => ({
        type: 'text',
        key: 'apiKey',
        label: 'Api Key',
        required: false,
        children: []
      } as any));
      const annotationRegistry = createMockAnnotationRegistry();

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      const operationParams: OpenAPIV3.ParameterObject[] = [
        {
          name: 'apiKey',
          in: 'header',
          required: false,
          schema: { type: 'string' }
        }
      ];

      const result = processor.processParameters(operationParams);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('apiKey');
    });

    /**
     * Tests for Requirement 5.6: Operation-level with no annotation checks path-level
     */
    it('operation-level parameter with no annotation falls back to path-level annotation', () => {
      const spec = createMinimalDocument();
      const adapterUtils = createMockAdapterUtils();
      const schemaProcessor = createMockSchemaProcessor();
      const annotationRegistry = createMockAnnotationRegistry();

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      const pathParams: OpenAPIV3.ParameterObject[] = [
        {
          name: 'apiKey',
          in: 'header',
          required: false,
          schema: { type: 'string' },
          'x-uigen-ignore': true
        } as any
      ];

      const operationParams: OpenAPIV3.ParameterObject[] = [
        {
          name: 'apiKey',
          in: 'header',
          required: false,
          schema: { type: 'string' }
          // No x-uigen-ignore annotation
        }
      ];

      const result = processor.processParameters(operationParams, pathParams);

      // Should fall back to path-level annotation (true), so excluded
      expect(result).toHaveLength(0);
    });
  });

  describe('parameter schema conversion', () => {
    /**
     * Tests for Requirement 6.2: Schema conversion delegation to SchemaProcessor
     */
    it('delegates schema conversion to SchemaProcessor.processSchema()', () => {
      const spec = createMinimalDocument();
      const adapterUtils = createMockAdapterUtils();
      const schemaProcessor = createMockSchemaProcessor();
      const processSchemaspy = vi.fn(() => ({
        type: 'text',
        key: 'userId',
        label: 'User Id',
        required: false,
        children: []
      } as any));
      schemaProcessor.processSchema = processSchemaspy;
      const annotationRegistry = createMockAnnotationRegistry();

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      const operationParams: OpenAPIV3.ParameterObject[] = [
        {
          name: 'userId',
          in: 'path',
          required: true,
          schema: { type: 'string', minLength: 1 }
        }
      ];

      const result = processor.processParameters(operationParams);

      expect(result).toHaveLength(1);
      expect(processSchemaspy).toHaveBeenCalledWith('userId', { type: 'string', minLength: 1 });
      expect(result[0].schema).toEqual({
        type: 'text',
        key: 'userId',
        label: 'User Id',
        required: false,
        children: []
      });
    });

    /**
     * Tests for Requirement 6.4, 24.6: Placeholder schema creation for missing schemas
     */
    it('creates placeholder schema for parameters without schema property', () => {
      const spec = createMinimalDocument();
      const adapterUtils = createMockAdapterUtils();
      adapterUtils.humanize = vi.fn((str: string) => str.replace(/([A-Z])/g, ' $1').trim());
      const schemaProcessor = createMockSchemaProcessor();
      const annotationRegistry = createMockAnnotationRegistry();

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      const operationParams: OpenAPIV3.ParameterObject[] = [
        {
          name: 'apiKey',
          in: 'header',
          required: false
          // No schema property
        } as any
      ];

      const result = processor.processParameters(operationParams);

      expect(result).toHaveLength(1);
      expect(result[0].schema).toEqual({
        type: 'object',
        key: 'apiKey',
        label: 'api Key',
        required: false,
        children: []
      });
      expect(adapterUtils.humanize).toHaveBeenCalledWith('apiKey');
    });

    /**
     * Tests for Requirement 6.7, 24.7: Schema metadata preservation
     */
    it('preserves schema metadata (description, format, validations)', () => {
      const spec = createMinimalDocument();
      const adapterUtils = createMockAdapterUtils();
      const schemaProcessor = createMockSchemaProcessor();
      schemaProcessor.processSchema = vi.fn(() => ({
        type: 'text',
        key: 'email',
        label: 'Email',
        required: false,
        format: 'email',
        description: 'User email address',
        children: []
      } as any));
      const annotationRegistry = createMockAnnotationRegistry();

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      const operationParams: OpenAPIV3.ParameterObject[] = [
        {
          name: 'email',
          in: 'query',
          required: false,
          description: 'User email address',
          schema: { type: 'string', format: 'email' }
        }
      ];

      const result = processor.processParameters(operationParams);

      expect(result).toHaveLength(1);
      expect(result[0].schema.format).toBe('email');
      expect(result[0].schema.description).toBe('User email address');
    });

    /**
     * Tests for Requirement 24.3: Handle parameters with null schemas
     */
    it('creates placeholder schema for parameters with null schema', () => {
      const spec = createMinimalDocument();
      const adapterUtils = createMockAdapterUtils();
      adapterUtils.humanize = vi.fn((str: string) => str.replace(/([A-Z])/g, ' $1').trim());
      const schemaProcessor = createMockSchemaProcessor();
      const annotationRegistry = createMockAnnotationRegistry();

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      const operationParams: OpenAPIV3.ParameterObject[] = [
        {
          name: 'token',
          in: 'header',
          required: false,
          schema: null as any
        }
      ];

      const result = processor.processParameters(operationParams);

      expect(result).toHaveLength(1);
      expect(result[0].schema).toEqual({
        type: 'object',
        key: 'token',
        label: 'token',
        required: false,
        children: []
      });
    });

    /**
     * Tests for Requirement 24.4: Handle parameters with undefined schemas
     */
    it('creates placeholder schema for parameters with undefined schema', () => {
      const spec = createMinimalDocument();
      const adapterUtils = createMockAdapterUtils();
      adapterUtils.humanize = vi.fn((str: string) => str.replace(/([A-Z])/g, ' $1').trim());
      const schemaProcessor = createMockSchemaProcessor();
      const annotationRegistry = createMockAnnotationRegistry();

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      const operationParams: OpenAPIV3.ParameterObject[] = [
        {
          name: 'authorization',
          in: 'header',
          required: false,
          schema: undefined as any
        }
      ];

      const result = processor.processParameters(operationParams);

      expect(result).toHaveLength(1);
      expect(result[0].schema).toEqual({
        type: 'object',
        key: 'authorization',
        label: 'authorization',
        required: false,
        children: []
      });
    });

    /**
     * Tests for Requirement 24.5: Handle parameters with empty schema objects
     */
    it('delegates empty schema objects to SchemaProcessor', () => {
      const spec = createMinimalDocument();
      const adapterUtils = createMockAdapterUtils();
      const schemaProcessor = createMockSchemaProcessor();
      const processSchemaspy = vi.fn(() => ({
        type: 'object',
        key: 'data',
        label: 'Data',
        required: false,
        children: []
      } as any));
      schemaProcessor.processSchema = processSchemaspy;
      const annotationRegistry = createMockAnnotationRegistry();

      const processor = new Parameter_Processor(
        spec,
        adapterUtils,
        schemaProcessor,
        annotationRegistry
      );

      const operationParams: OpenAPIV3.ParameterObject[] = [
        {
          name: 'data',
          in: 'query',
          required: false,
          schema: {} as any
        }
      ];

      const result = processor.processParameters(operationParams);

      expect(result).toHaveLength(1);
      expect(processSchemaspy).toHaveBeenCalledWith('data', {});
      expect(result[0].schema.type).toBe('object');
    });
  });
});
