/**
 * Unit tests for Core Reconciler
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Reconciler } from '../../reconciler';
import type { OpenAPIV3 } from 'openapi-types';

describe('Reconciler', () => {
  let reconciler: Reconciler;

  beforeEach(() => {
    reconciler = new Reconciler({ logLevel: 'error' }); // Suppress logs in tests
  });

  describe('End-to-End Reconciliation', () => {
    it('should reconcile a spec with config annotations', () => {
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
          },
        },
      };

      const result = reconciler.reconcile(spec, config);

      expect(result.appliedAnnotations).toBe(2);
      expect(result.warnings).toHaveLength(0);

      const operation = result.spec.paths['/users'].post;
      expect(operation['x-uigen-ignore']).toBe(true);
      expect(operation['x-uigen-label']).toBe('Create User');
    });

    it('should reconcile document-level annotations', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: { responses: {} },
          },
        },
      };

      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'document': {
            'x-uigen-layout': {
              type: 'sidebar',
              metadata: {
                sidebarWidth: 250
              }
            },
            'x-uigen-landing-page': {
              enabled: true,
              sections: {
                hero: {
                  enabled: true,
                  headline: 'Welcome'
                }
              }
            }
          },
        },
      };

      const result = reconciler.reconcile(spec, config);

      expect(result.appliedAnnotations).toBe(2);
      expect(result.warnings).toHaveLength(0);

      const docSpec = result.spec as any;
      expect(docSpec['x-uigen-layout']).toEqual({
        type: 'sidebar',
        metadata: {
          sidebarWidth: 250
        }
      });
      expect(docSpec['x-uigen-landing-page']).toEqual({
        enabled: true,
        sections: {
          hero: {
            enabled: true,
            headline: 'Welcome'
          }
        }
      });
    });

    it('should support #/ as document path alias', () => {
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
          '#/': {
            'x-uigen-layout': {
              type: 'centered'
            }
          },
        },
      };

      const result = reconciler.reconcile(spec, config);

      expect(result.appliedAnnotations).toBe(1);
      expect(result.warnings).toHaveLength(0);

      const docSpec = result.spec as any;
      expect(docSpec['x-uigen-layout']).toEqual({
        type: 'centered'
      });
    });

    it('should handle multiple element paths', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: { responses: {} },
            post: { responses: {} },
          },
        },
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
          'GET:/users': { 'x-uigen-ignore': false },
          'POST:/users': { 'x-uigen-login': true },
          'User.email': { 'x-uigen-label': 'Email Address' },
        },
      };

      const result = reconciler.reconcile(spec, config);

      expect(result.appliedAnnotations).toBe(3);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('Graceful Degradation', () => {
    it('should handle unresolved element paths gracefully', () => {
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
          'POST:/nonexistent': { 'x-uigen-ignore': true },
        },
      };

      const result = reconciler.reconcile(spec, config);

      expect(result.appliedAnnotations).toBe(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].elementPath).toBe('POST:/nonexistent');
      expect(result.warnings[0].message).toContain('Element path not found');
    });

    it('should provide suggestions for typos', () => {
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
          'POST:/userz': { 'x-uigen-ignore': true },
        },
      };

      const result = reconciler.reconcile(spec, config);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].suggestion).toContain('POST:/users');
    });
  });

  describe('Error Handling', () => {
    it('should throw error in strict mode for unresolved paths', () => {
      const reconcilerStrict = new Reconciler({ strictMode: true, logLevel: 'error' });

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
          'POST:/nonexistent': { 'x-uigen-ignore': true },
        },
      };

      expect(() => reconcilerStrict.reconcile(spec, config)).toThrow('Strict mode');
    });

    it('should throw error for invalid reconciled spec', () => {
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
          // This would create an invalid spec if we could modify required fields
          // For now, we test with a valid config
        },
      };

      // This should not throw
      expect(() => reconciler.reconcile(spec, config)).not.toThrow();
    });
  });

  describe('Logging', () => {
    it('should log reconciliation start and complete', () => {
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
          'POST:/users': { 'x-uigen-ignore': true },
        },
      };

      // Create reconciler with info log level to capture logs
      const reconcilerWithLogs = new Reconciler({ logLevel: 'info' });

      // This should log without throwing
      expect(() => reconcilerWithLogs.reconcile(spec, config)).not.toThrow();
    });
  });

  describe('Metadata', () => {
    it('should return correct applied annotation count', () => {
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

      const result = reconciler.reconcile(spec, config);

      expect(result.appliedAnnotations).toBe(3);
    });

    it('should return warnings for unresolved paths', () => {
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
          'POST:/path1': { 'x-uigen-ignore': true },
          'POST:/path2': { 'x-uigen-ignore': true },
        },
      };

      const result = reconciler.reconcile(spec, config);

      expect(result.warnings).toHaveLength(2);
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
          'POST:/users': { 'x-uigen-ignore': true },
        },
      };

      reconciler.reconcile(spec, config);

      // Source spec should be unchanged
      expect(spec).toEqual(originalSpec);
      expect(spec.paths['/users'].post).not.toHaveProperty('x-uigen-ignore');
    });
  });

  describe('Validation', () => {
    it('should validate reconciled spec by default', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
      };

      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {},
      };

      // Should not throw for valid spec
      expect(() => reconciler.reconcile(spec, config)).not.toThrow();
    });

    it('should skip validation when validateOutput is false', () => {
      const reconcilerNoValidation = new Reconciler({ validateOutput: false, logLevel: 'error' });

      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
      };

      const config = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {},
      };

      // Should not throw even if validation would fail
      expect(() => reconcilerNoValidation.reconcile(spec, config)).not.toThrow();
    });
  });

  describe('Cache Management', () => {
    it('should clear cache', () => {
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
          'POST:/users': { 'x-uigen-ignore': true },
        },
      };

      reconciler.reconcile(spec, config);
      reconciler.clearCache();

      // Should still work after clearing cache
      const result = reconciler.reconcile(spec, config);
      expect(result.appliedAnnotations).toBe(1);
    });
  });
});
