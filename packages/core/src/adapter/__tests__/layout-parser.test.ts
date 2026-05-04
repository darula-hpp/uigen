import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LayoutParser } from '../layout-parser.js';
import type { OpenAPIV3 } from 'openapi-types';

/**
 * Unit Tests for LayoutParser
 * 
 * **Validates: Requirements 12.1, 12.2, 12.3, 12.4**
 * 
 * These tests verify layout configuration parsing from x-uigen-layout annotations.
 */

describe('LayoutParser', () => {
  let parser: LayoutParser;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    parser = new LayoutParser();
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('parseDocumentLayout', () => {
    /**
     * **Validates: Requirements 12.1**
     */
    it('should parse valid document-level layout configuration', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
        'x-uigen-layout': {
          type: 'sidebar',
          metadata: {
            sidebarWidth: 250,
            sidebarCollapsible: true
          }
        }
      } as any;

      const result = parser.parseDocumentLayout(spec);

      expect(result).toEqual({
        type: 'sidebar',
        metadata: {
          sidebarWidth: 250,
          sidebarCollapsible: true
        }
      });
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    /**
     * **Validates: Requirements 12.1**
     */
    it('should return undefined when x-uigen-layout is not present', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {}
      };

      const result = parser.parseDocumentLayout(spec);

      expect(result).toBeUndefined();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    /**
     * **Validates: Requirements 12.3**
     */
    it('should parse layout configuration with only type field', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
        'x-uigen-layout': {
          type: 'centered'
        }
      } as any;

      const result = parser.parseDocumentLayout(spec);

      expect(result).toEqual({
        type: 'centered',
        metadata: undefined
      });
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    /**
     * **Validates: Requirements 12.4**
     */
    it('should warn and return undefined when x-uigen-layout is not an object', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
        'x-uigen-layout': 'sidebar'
      } as any;

      const result = parser.parseDocumentLayout(spec);

      expect(result).toBeUndefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[LayoutParser] Invalid x-uigen-layout at document: must be an object'
      );
    });

    /**
     * **Validates: Requirements 12.4**
     */
    it('should warn and return undefined when x-uigen-layout is null', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
        'x-uigen-layout': null
      } as any;

      const result = parser.parseDocumentLayout(spec);

      expect(result).toBeUndefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[LayoutParser] Invalid x-uigen-layout at document: must be an object'
      );
    });

    /**
     * **Validates: Requirements 12.4**
     */
    it('should warn and return undefined when type field is missing', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
        'x-uigen-layout': {
          metadata: {
            sidebarWidth: 250
          }
        }
      } as any;

      const result = parser.parseDocumentLayout(spec);

      expect(result).toBeUndefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[LayoutParser] Invalid x-uigen-layout at document: missing or invalid \'type\' field'
      );
    });

    /**
     * **Validates: Requirements 12.4**
     */
    it('should warn and return undefined when type field is not a string', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
        'x-uigen-layout': {
          type: 123
        }
      } as any;

      const result = parser.parseDocumentLayout(spec);

      expect(result).toBeUndefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[LayoutParser] Invalid x-uigen-layout at document: missing or invalid \'type\' field'
      );
    });

    /**
     * **Validates: Requirements 12.4**
     */
    it('should warn and return config with type when metadata is not an object', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
        'x-uigen-layout': {
          type: 'sidebar',
          metadata: 'invalid'
        }
      } as any;

      const result = parser.parseDocumentLayout(spec);

      expect(result).toEqual({
        type: 'sidebar'
      });
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[LayoutParser] Invalid x-uigen-layout at document: \'metadata\' must be an object'
      );
    });

    /**
     * **Validates: Requirements 12.1**
     */
    it('should parse custom layout types', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
        'x-uigen-layout': {
          type: 'custom-layout',
          metadata: {
            customOption: 'value'
          }
        }
      } as any;

      const result = parser.parseDocumentLayout(spec);

      expect(result).toEqual({
        type: 'custom-layout',
        metadata: {
          customOption: 'value'
        }
      });
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    /**
     * **Validates: Requirements 12.1**
     */
    it('should parse dashboard-grid layout with responsive columns', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
        'x-uigen-layout': {
          type: 'dashboard-grid',
          metadata: {
            columns: {
              mobile: 1,
              tablet: 2,
              desktop: 3
            },
            gap: 16
          }
        }
      } as any;

      const result = parser.parseDocumentLayout(spec);

      expect(result).toEqual({
        type: 'dashboard-grid',
        metadata: {
          columns: {
            mobile: 1,
            tablet: 2,
            desktop: 3
          },
          gap: 16
        }
      });
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('parseOperationLayout', () => {
    /**
     * **Validates: Requirements 12.2**
     */
    it('should parse valid operation-level layout configuration', () => {
      const operation: OpenAPIV3.OperationObject = {
        responses: {},
        'x-uigen-layout': {
          type: 'centered',
          metadata: {
            maxWidth: 600,
            verticalCenter: true
          }
        }
      } as any;

      const result = parser.parseOperationLayout(operation, '/users', 'GET');

      expect(result).toEqual({
        type: 'centered',
        metadata: {
          maxWidth: 600,
          verticalCenter: true
        }
      });
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    /**
     * **Validates: Requirements 12.2**
     */
    it('should return undefined when x-uigen-layout is not present', () => {
      const operation: OpenAPIV3.OperationObject = {
        responses: {}
      };

      const result = parser.parseOperationLayout(operation, '/users', 'GET');

      expect(result).toBeUndefined();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    /**
     * **Validates: Requirements 12.3**
     */
    it('should parse layout configuration with only type field', () => {
      const operation: OpenAPIV3.OperationObject = {
        responses: {},
        'x-uigen-layout': {
          type: 'sidebar'
        }
      } as any;

      const result = parser.parseOperationLayout(operation, '/users/{id}', 'PUT');

      expect(result).toEqual({
        type: 'sidebar',
        metadata: undefined
      });
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    /**
     * **Validates: Requirements 12.4**
     */
    it('should warn with operation context when x-uigen-layout is not an object', () => {
      const operation: OpenAPIV3.OperationObject = {
        responses: {},
        'x-uigen-layout': 'centered'
      } as any;

      const result = parser.parseOperationLayout(operation, '/auth/login', 'POST');

      expect(result).toBeUndefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[LayoutParser] Invalid x-uigen-layout at POST:/auth/login: must be an object'
      );
    });

    /**
     * **Validates: Requirements 12.4**
     */
    it('should warn with operation context when type field is missing', () => {
      const operation: OpenAPIV3.OperationObject = {
        responses: {},
        'x-uigen-layout': {
          metadata: {
            maxWidth: 600
          }
        }
      } as any;

      const result = parser.parseOperationLayout(operation, '/auth/signup', 'POST');

      expect(result).toBeUndefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[LayoutParser] Invalid x-uigen-layout at POST:/auth/signup: missing or invalid \'type\' field'
      );
    });

    /**
     * **Validates: Requirements 12.4**
     */
    it('should warn with operation context when metadata is not an object', () => {
      const operation: OpenAPIV3.OperationObject = {
        responses: {},
        'x-uigen-layout': {
          type: 'centered',
          metadata: 'invalid'
        }
      } as any;

      const result = parser.parseOperationLayout(operation, '/dashboard', 'GET');

      expect(result).toEqual({
        type: 'centered'
      });
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[LayoutParser] Invalid x-uigen-layout at GET:/dashboard: \'metadata\' must be an object'
      );
    });

    /**
     * **Validates: Requirements 12.2**
     */
    it('should parse layout for different HTTP methods', () => {
      const operation: OpenAPIV3.OperationObject = {
        responses: {},
        'x-uigen-layout': {
          type: 'sidebar'
        }
      } as any;

      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
      
      for (const method of methods) {
        const result = parser.parseOperationLayout(operation, '/users', method);
        expect(result).toEqual({
          type: 'sidebar',
          metadata: undefined
        });
      }

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    /**
     * **Validates: Requirements 12.2**
     */
    it('should parse layout for operations with path parameters', () => {
      const operation: OpenAPIV3.OperationObject = {
        responses: {},
        'x-uigen-layout': {
          type: 'centered',
          metadata: {
            showHeader: false
          }
        }
      } as any;

      const result = parser.parseOperationLayout(operation, '/users/{id}/profile', 'GET');

      expect(result).toEqual({
        type: 'centered',
        metadata: {
          showHeader: false
        }
      });
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    /**
     * **Validates: Requirements 12.2**
     */
    it('should handle complex metadata structures', () => {
      const operation: OpenAPIV3.OperationObject = {
        responses: {},
        'x-uigen-layout': {
          type: 'dashboard-grid',
          metadata: {
            columns: {
              mobile: 1,
              tablet: 2,
              desktop: 4
            },
            gap: 20,
            breakpoints: {
              mobile: 640,
              tablet: 768,
              desktop: 1024
            },
            customProperty: {
              nested: {
                value: 'test'
              }
            }
          }
        }
      } as any;

      const result = parser.parseOperationLayout(operation, '/dashboard', 'GET');

      expect(result).toEqual({
        type: 'dashboard-grid',
        metadata: {
          columns: {
            mobile: 1,
            tablet: 2,
            desktop: 4
          },
          gap: 20,
          breakpoints: {
            mobile: 640,
            tablet: 768,
            desktop: 1024
          },
          customProperty: {
            nested: {
              value: 'test'
            }
          }
        }
      });
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    /**
     * **Validates: Requirements 12.4**
     */
    it('should handle empty type string', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
        'x-uigen-layout': {
          type: ''
        }
      } as any;

      const result = parser.parseDocumentLayout(spec);

      expect(result).toBeUndefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[LayoutParser] Invalid x-uigen-layout at document: missing or invalid \'type\' field'
      );
    });

    /**
     * **Validates: Requirements 12.4**
     */
    it('should handle array as x-uigen-layout', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
        'x-uigen-layout': ['sidebar']
      } as any;

      const result = parser.parseDocumentLayout(spec);

      expect(result).toBeUndefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[LayoutParser] Invalid x-uigen-layout at document: must be an object'
      );
    });

    /**
     * **Validates: Requirements 12.4**
     */
    it('should handle number as x-uigen-layout', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
        'x-uigen-layout': 123
      } as any;

      const result = parser.parseDocumentLayout(spec);

      expect(result).toBeUndefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[LayoutParser] Invalid x-uigen-layout at document: must be an object'
      );
    });

    /**
     * **Validates: Requirements 12.4**
     */
    it('should handle boolean as metadata', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
        'x-uigen-layout': {
          type: 'sidebar',
          metadata: true
        }
      } as any;

      const result = parser.parseDocumentLayout(spec);

      expect(result).toEqual({
        type: 'sidebar'
      });
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[LayoutParser] Invalid x-uigen-layout at document: \'metadata\' must be an object'
      );
    });

    /**
     * **Validates: Requirements 12.4**
     */
    it('should handle null as metadata', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
        'x-uigen-layout': {
          type: 'sidebar',
          metadata: null
        }
      } as any;

      const result = parser.parseDocumentLayout(spec);

      expect(result).toEqual({
        type: 'sidebar'
      });
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[LayoutParser] Invalid x-uigen-layout at document: \'metadata\' must be an object'
      );
    });

    /**
     * **Validates: Requirements 12.3**
     */
    it('should handle empty metadata object', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
        'x-uigen-layout': {
          type: 'sidebar',
          metadata: {}
        }
      } as any;

      const result = parser.parseDocumentLayout(spec);

      expect(result).toEqual({
        type: 'sidebar',
        metadata: {}
      });
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    /**
     * **Validates: Requirements 12.1**
     */
    it('should preserve all metadata properties', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
        'x-uigen-layout': {
          type: 'sidebar',
          metadata: {
            sidebarWidth: 300,
            sidebarCollapsible: true,
            sidebarDefaultCollapsed: false,
            customProp1: 'value1',
            customProp2: 42,
            customProp3: true,
            customProp4: {
              nested: 'value'
            }
          }
        }
      } as any;

      const result = parser.parseDocumentLayout(spec);

      expect(result).toEqual({
        type: 'sidebar',
        metadata: {
          sidebarWidth: 300,
          sidebarCollapsible: true,
          sidebarDefaultCollapsed: false,
          customProp1: 'value1',
          customProp2: 42,
          customProp3: true,
          customProp4: {
            nested: 'value'
          }
        }
      });
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    /**
     * **Validates: Requirements 12.2**
     */
    it('should handle special characters in path', () => {
      const operation: OpenAPIV3.OperationObject = {
        responses: {},
        'x-uigen-layout': {
          type: 'centered'
        }
      } as any;

      const result = parser.parseOperationLayout(
        operation,
        '/api/v1/users/{user-id}/posts/{post_id}',
        'GET'
      );

      expect(result).toEqual({
        type: 'centered',
        metadata: undefined
      });
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });
});
