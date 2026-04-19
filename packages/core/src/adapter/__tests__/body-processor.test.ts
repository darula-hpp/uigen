import { describe, it, expect, beforeEach } from 'vitest';
import { Body_Processor } from '../body-processor.js';
import type { OpenAPIV3 } from 'openapi-types';
import type { AdapterUtils } from '../annotations/index.js';
import { SchemaProcessor } from '../schema-processor.js';
import { AnnotationHandlerRegistry } from '../annotations/registry.js';
import { DefaultFileMetadataVisitor } from '../visitors/file-metadata-visitor.js';

describe('Body_Processor', () => {
  let bodyProcessor: Body_Processor;
  let mockDocument: OpenAPIV3.Document;
  let mockAdapterUtils: AdapterUtils;
  let mockSchemaProcessor: SchemaProcessor;
  let mockAnnotationRegistry: AnnotationHandlerRegistry;
  let mockFileMetadataVisitor: DefaultFileMetadataVisitor;

  beforeEach(() => {
    mockDocument = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
      components: {
        requestBodies: {},
        responses: {},
        schemas: {}
      }
    };

    mockAdapterUtils = {
      humanize: (str: string) => str,
      resolveRef: (ref: string) => null,
      logError: () => {},
      logWarning: () => {}
    };

    mockAnnotationRegistry = AnnotationHandlerRegistry.getInstance();
    mockSchemaProcessor = new SchemaProcessor(mockDocument, mockAdapterUtils, mockAnnotationRegistry);
    mockFileMetadataVisitor = new DefaultFileMetadataVisitor();

    bodyProcessor = new Body_Processor(
      mockDocument,
      mockAdapterUtils,
      mockSchemaProcessor,
      mockAnnotationRegistry,
      mockFileMetadataVisitor
    );
  });

  describe('processRequestBody', () => {
    it('should process inline request body with schema', () => {
      const requestBody: OpenAPIV3.RequestBodyObject = {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' }
              }
            }
          }
        }
      };

      const result = bodyProcessor.processRequestBody(requestBody);
      expect(result).toBeDefined();
      expect(result?.type).toBe('object');
    });

    it('should return undefined for request body with x-uigen-ignore: true', () => {
      const requestBody: any = {
        'x-uigen-ignore': true,
        content: {
          'application/json': {
            schema: { type: 'object' }
          }
        }
      };

      const result = bodyProcessor.processRequestBody(requestBody);
      expect(result).toBeUndefined();
    });

    it('should return undefined for request body with no content', () => {
      const requestBody: OpenAPIV3.RequestBodyObject = {
        content: {}
      };

      const result = bodyProcessor.processRequestBody(requestBody);
      expect(result).toBeUndefined();
    });
  });

  describe('processResponses', () => {
    it('should process multiple responses with different status codes', () => {
      const responses: OpenAPIV3.ResponsesObject = {
        '200': {
          description: 'Success',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: { type: 'string' }
                }
              }
            }
          }
        },
        '404': {
          description: 'Not found'
        }
      };

      const result = bodyProcessor.processResponses(responses);
      expect(result['200']).toBeDefined();
      expect(result['200'].description).toBe('Success');
      expect(result['200'].schema).toBeDefined();
      expect(result['404']).toBeDefined();
      expect(result['404'].description).toBe('Not found');
      expect(result['404'].schema).toBeUndefined();
    });

    it('should skip response with x-uigen-ignore: true', () => {
      const responses: OpenAPIV3.ResponsesObject = {
        '200': {
          description: 'Success',
          'x-uigen-ignore': true,
          content: {
            'application/json': {
              schema: { type: 'object' }
            }
          }
        } as any
      };

      const result = bodyProcessor.processResponses(responses);
      expect(result['200']).toBeUndefined();
    });

    it('should return empty object for invalid ResponsesObject', () => {
      const result = bodyProcessor.processResponses(null as any);
      expect(result).toEqual({});
    });
  });

  describe('determineRequestContentType', () => {
    it('should prefer application/json when available', () => {
      const content = {
        'application/json': { schema: { type: 'object' } },
        'text/plain': { schema: { type: 'string' } }
      };

      const result = bodyProcessor.determineRequestContentType(content, undefined);
      expect(result).toBe('application/json');
    });

    it('should prefer multipart/form-data when file fields are present', () => {
      const content = {
        'application/json': { schema: { type: 'object' } },
        'multipart/form-data': { schema: { type: 'object' } }
      };

      const schema: any = {
        key: 'body',
        type: 'object',
        fileMetadata: { isFile: true }
      };

      const result = bodyProcessor.determineRequestContentType(content, schema);
      expect(result).toBe('multipart/form-data');
    });

    it('should return undefined for undefined content', () => {
      const result = bodyProcessor.determineRequestContentType(undefined, undefined);
      expect(result).toBeUndefined();
    });
  });

  describe('hasFileFields', () => {
    it('should return false for schema without file fields', () => {
      const schema: any = {
        key: 'body',
        type: 'object'
      };

      const result = bodyProcessor.hasFileFields(schema);
      expect(result).toBe(false);
    });
  });
});
