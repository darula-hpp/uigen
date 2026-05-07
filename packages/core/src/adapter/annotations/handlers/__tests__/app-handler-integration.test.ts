import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OpenAPI3Adapter } from '../../../openapi3.js';
import { AnnotationHandlerRegistry } from '../../registry.js';
import { AppHandler } from '../app-handler.js';
import type { OpenAPIV3 } from 'openapi-types';

/**
 * Integration tests for AppHandler with full adapter flow.
 * 
 * Tests verify:
 * - Handler is registered in registry
 * - Handler is invoked during document traversal
 * - appConfig is persisted in IR
 * 
 * Task: 5.3 - Write integration test for handler registration
 */
describe('AppHandler - Integration Tests', () => {
  let registry: AnnotationHandlerRegistry;

  beforeEach(() => {
    registry = AnnotationHandlerRegistry.getInstance();
    registry.clear();
    registry.register(new AppHandler());
  });

  afterEach(() => {
    registry.clear();
  });

  describe('Handler registration in registry', () => {
    it('should register AppHandler in the annotation registry', () => {
      const handler = registry.get('x-uigen-app');
      
      expect(handler).toBeDefined();
      expect(handler?.name).toBe('x-uigen-app');
    });

    it('should be included in getAll() handlers list', () => {
      const allHandlers = registry.getAll();
      const appHandler = allHandlers.find(h => h.name === 'x-uigen-app');
      
      expect(appHandler).toBeDefined();
      expect(appHandler).toBeInstanceOf(AppHandler);
    });

    it('should allow handler to be retrieved after registration', () => {
      registry.clear();
      
      const newHandler = new AppHandler();
      registry.register(newHandler);
      
      const retrieved = registry.get('x-uigen-app');
      expect(retrieved).toBe(newHandler);
    });
  });

  describe('Handler invocation during document traversal', () => {
    it('should invoke handler when x-uigen-app annotation is present at document level', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        'x-uigen-app': {
          name: 'My Application',
          icon: '/.uigen/assets/logo.svg'
        } as any,
        paths: {
          '/users': {
            get: {
              summary: 'List users',
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            name: { type: 'string' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Verify handler was invoked and appConfig was set
      expect(result.appConfig).toBeDefined();
      expect(result.appConfig?.name).toBe('My Application');
      expect(result.appConfig?.icon).toBe('/.uigen/assets/logo.svg');
    });

    it('should not invoke handler when x-uigen-app annotation is absent', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              summary: 'List users',
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Verify appConfig is not set when annotation is absent
      expect(result.appConfig).toBeUndefined();
    });

    it('should handle annotation with name only', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        'x-uigen-app': {
          name: 'My Application'
        } as any,
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.appConfig).toBeDefined();
      expect(result.appConfig?.name).toBe('My Application');
      expect(result.appConfig?.icon).toBeUndefined();
    });

    it('should handle annotation with icon only', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        'x-uigen-app': {
          icon: '/.uigen/assets/logo.svg'
        } as any,
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.appConfig).toBeDefined();
      expect(result.appConfig?.name).toBeUndefined();
      expect(result.appConfig?.icon).toBe('/.uigen/assets/logo.svg');
    });

    it('should handle empty annotation object (all fields optional)', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        'x-uigen-app': {} as any,
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.appConfig).toBeDefined();
      expect(result.appConfig?.name).toBeUndefined();
      expect(result.appConfig?.icon).toBeUndefined();
    });

    it('should preserve unknown fields for forward compatibility', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        'x-uigen-app': {
          name: 'My Application',
          icon: '/.uigen/assets/logo.svg',
          customField: 'value',
          futureFeature: { nested: 'data' }
        } as any,
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      expect(result.appConfig).toBeDefined();
      expect(result.appConfig?.name).toBe('My Application');
      expect(result.appConfig?.icon).toBe('/.uigen/assets/logo.svg');
      expect((result.appConfig as any).customField).toBe('value');
      expect((result.appConfig as any).futureFeature).toEqual({ nested: 'data' });
    });
  });

  describe('appConfig persistence in IR', () => {
    it('should persist appConfig in IR with correct structure', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        'x-uigen-app': {
          name: 'My Application',
          icon: '/.uigen/assets/logo.svg'
        } as any,
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Verify IR structure
      expect(result).toBeDefined();
      expect(result.appConfig).toBeDefined();
      expect(typeof result.appConfig).toBe('object');
      expect(result.appConfig?.name).toBe('My Application');
      expect(result.appConfig?.icon).toBe('/.uigen/assets/logo.svg');
    });

    it('should persist appConfig alongside other IR properties', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        'x-uigen-app': {
          name: 'My Application',
          icon: '/.uigen/assets/logo.svg'
        } as any,
        paths: {
          '/users': {
            get: {
              summary: 'List users',
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            name: { type: 'string' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Verify appConfig coexists with other IR properties
      expect(result.appConfig).toBeDefined();
      expect(result.resources).toBeDefined();
      expect(result.resources.length).toBeGreaterThan(0);
      expect(result.appConfig?.name).toBe('My Application');
    });

    it('should handle multiple resources with appConfig', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        'x-uigen-app': {
          name: 'My Application',
          icon: '/.uigen/assets/logo.svg'
        } as any,
        paths: {
          '/users': {
            get: {
              summary: 'List users',
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '/posts': {
            get: {
              summary: 'List posts',
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Verify appConfig is set once at document level
      expect(result.appConfig).toBeDefined();
      expect(result.appConfig?.name).toBe('My Application');
      expect(result.resources.length).toBe(2);
    });
  });

  describe('Invalid annotation handling', () => {
    it('should not set appConfig when annotation is invalid type (string)', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        'x-uigen-app': 'invalid' as any,
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Invalid annotation should be ignored
      expect(result.appConfig).toBeUndefined();
    });

    it('should not set appConfig when annotation is invalid type (boolean)', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        'x-uigen-app': true as any,
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Invalid annotation should be ignored
      expect(result.appConfig).toBeUndefined();
    });

    it('should not set appConfig when annotation is null', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        'x-uigen-app': null as any,
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Null annotation should be ignored
      expect(result.appConfig).toBeUndefined();
    });

    it('should not set appConfig when annotation is array', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        'x-uigen-app': [] as any,
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Array annotation should be ignored
      expect(result.appConfig).toBeUndefined();
    });

    it('should set appConfig even with invalid field values (lenient validation)', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        'x-uigen-app': {
          name: '',  // Empty string (invalid but lenient)
          icon: 123  // Wrong type (invalid but lenient)
        } as any,
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Lenient validation: appConfig is set even with invalid field values
      expect(result.appConfig).toBeDefined();
      expect(result.appConfig?.name).toBe('');
      expect((result.appConfig as any).icon).toBe(123);
    });
  });

  describe('End-to-end integration', () => {
    it('should produce correct IR for React components to consume', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { 
          title: 'Test API', 
          version: '1.0.0',
          description: 'A test API'
        },
        'x-uigen-app': {
          name: 'My Application',
          icon: '/.uigen/assets/logo.svg'
        } as any,
        paths: {
          '/users': {
            get: {
              summary: 'List users',
              responses: {
                '200': {
                  description: 'User list',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'array',
                        items: {
                          type: 'object',
                          required: ['id', 'email'],
                          properties: {
                            id: { type: 'string' },
                            email: { type: 'string', format: 'email' },
                            name: { type: 'string' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Verify complete IR structure for React consumption
      expect(result).toBeDefined();
      expect(result.appConfig).toBeDefined();
      expect(result.appConfig?.name).toBe('My Application');
      expect(result.appConfig?.icon).toBe('/.uigen/assets/logo.svg');
      
      // Verify meta information is also present
      expect(result.meta).toBeDefined();
      expect(result.meta.title).toBe('Test API');
      expect(result.meta.version).toBe('1.0.0');
      
      // Verify resources are parsed correctly
      expect(result.resources).toBeDefined();
      expect(result.resources.length).toBeGreaterThan(0);
      
      const usersResource = result.resources.find(r => r.slug === 'users');
      expect(usersResource).toBeDefined();
      expect(usersResource?.operations).toBeDefined();
    });

    it('should work with other annotations (x-uigen-label)', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        'x-uigen-app': {
          name: 'My Application',
          icon: '/.uigen/assets/logo.svg'
        } as any,
        paths: {
          '/users': {
            get: {
              summary: 'List users',
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            name: {
                              type: 'string',
                              'x-uigen-label': 'Full Name'
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Verify appConfig is set
      expect(result.appConfig).toBeDefined();
      expect(result.appConfig?.name).toBe('My Application');
      
      // Verify other annotations work alongside x-uigen-app
      const usersResource = result.resources.find(r => r.slug === 'users');
      expect(usersResource).toBeDefined();
      
      const getOp = usersResource?.operations.find(op => op.method === 'GET');
      const responseSchema = getOp?.responses['200']?.schema;
      const itemSchema = responseSchema?.items;
      const nameField = itemSchema?.children?.find(f => f.key === 'name');
      
      // Field-level x-uigen-label should work
      expect(nameField?.label).toBe('Full Name');
    });

    it('should handle complex spec with multiple resources', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        'x-uigen-app': {
          name: 'My Application',
          icon: '/.uigen/assets/logo.svg',
          customMetadata: 'preserved'
        } as any,
        paths: {
          '/users': {
            get: {
              summary: 'List users',
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            name: { type: 'string' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '/posts': {
            get: {
              summary: 'List posts',
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            title: { type: 'string' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      // Verify appConfig is processed at document level with all fields
      expect(result.appConfig).toBeDefined();
      expect(result.appConfig?.name).toBe('My Application');
      expect(result.appConfig?.icon).toBe('/.uigen/assets/logo.svg');
      expect((result.appConfig as any).customMetadata).toBe('preserved');
      
      // Verify resources are parsed correctly alongside appConfig
      expect(result.resources).toBeDefined();
      expect(result.resources.length).toBe(2);
      
      const usersResource = result.resources.find(r => r.slug === 'users');
      const postsResource = result.resources.find(r => r.slug === 'posts');
      
      expect(usersResource).toBeDefined();
      expect(postsResource).toBeDefined();
      
      // Verify appConfig doesn't interfere with resource parsing
      expect(usersResource?.operations).toBeDefined();
      expect(postsResource?.operations).toBeDefined();
    });
  });
});
