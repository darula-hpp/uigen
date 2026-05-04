import { describe, it, expect } from 'vitest';
import { OpenAPI3Adapter } from '../openapi3.js';
import type { OpenAPIV3 } from 'openapi-types';

/**
 * Integration Tests for Layout System
 * 
 * **Validates: Requirements 12.1, 12.2, 12.5**
 * 
 * These tests verify that the OpenAPI3Adapter correctly integrates with LayoutParser
 * to extract layout configuration from OpenAPI specs and populate the IR.
 */

describe('Layout System Integration', () => {
  describe('Document-level layout configuration', () => {
    /**
     * **Validates: Requirements 12.1**
     */
    it('should extract document-level layout configuration into UIGenApp.layoutConfig', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
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
                            id: { type: 'integer' },
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
        },
        'x-uigen-layout': {
          type: 'sidebar',
          metadata: {
            sidebarWidth: 250,
            sidebarCollapsible: true
          }
        }
      } as any;

      const adapter = new OpenAPI3Adapter(spec);
      const ir = adapter.adapt();

      expect(ir.layoutConfig).toEqual({
        type: 'sidebar',
        metadata: {
          sidebarWidth: 250,
          sidebarCollapsible: true
        }
      });
    });

    /**
     * **Validates: Requirements 12.1**
     */
    it('should set layoutConfig to undefined when no x-uigen-layout is present', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              responses: {
                '200': {
                  description: 'Success'
                }
              }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const ir = adapter.adapt();

      expect(ir.layoutConfig).toBeUndefined();
    });

    /**
     * **Validates: Requirements 12.1**
     */
    it('should extract centered layout configuration', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Auth API', version: '1.0.0' },
        paths: {
          '/auth/login': {
            post: {
              responses: {
                '200': {
                  description: 'Success'
                }
              }
            }
          }
        },
        'x-uigen-layout': {
          type: 'centered',
          metadata: {
            maxWidth: 600,
            verticalCenter: true,
            showHeader: false
          }
        }
      } as any;

      const adapter = new OpenAPI3Adapter(spec);
      const ir = adapter.adapt();

      expect(ir.layoutConfig).toEqual({
        type: 'centered',
        metadata: {
          maxWidth: 600,
          verticalCenter: true,
          showHeader: false
        }
      });
    });

    /**
     * **Validates: Requirements 12.1**
     */
    it('should extract dashboard-grid layout configuration', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Dashboard API', version: '1.0.0' },
        paths: {
          '/dashboard': {
            get: {
              responses: {
                '200': {
                  description: 'Success'
                }
              }
            }
          }
        },
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

      const adapter = new OpenAPI3Adapter(spec);
      const ir = adapter.adapt();

      expect(ir.layoutConfig).toEqual({
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
    });
  });

  describe('Operation-level layout overrides', () => {
    /**
     * **Validates: Requirements 12.2, 12.5**
     */
    it('should extract operation-level layout override into Resource.layoutOverride', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
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
                            id: { type: 'integer' },
                            name: { type: 'string' }
                          }
                        }
                      }
                    }
                  }
                }
              },
              'x-uigen-layout': {
                type: 'centered',
                metadata: {
                  maxWidth: 800
                }
              }
            }
          }
        },
        'x-uigen-layout': {
          type: 'sidebar'
        }
      } as any;

      const adapter = new OpenAPI3Adapter(spec);
      const ir = adapter.adapt();

      // Document-level layout should be set
      expect(ir.layoutConfig).toEqual({
        type: 'sidebar',
        metadata: undefined
      });

      // Resource should have layout override
      const usersResource = ir.resources.find(r => r.slug === 'users');
      expect(usersResource).toBeDefined();
      expect(usersResource?.layoutOverride).toEqual({
        type: 'centered',
        metadata: {
          maxWidth: 800
        }
      });
    });

    /**
     * **Validates: Requirements 12.2, 12.5**
     */
    it('should apply first operation layout override when multiple operations exist', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
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
                            id: { type: 'integer' },
                            name: { type: 'string' }
                          }
                        }
                      }
                    }
                  }
                }
              },
              'x-uigen-layout': {
                type: 'centered',
                metadata: {
                  maxWidth: 800
                }
              }
            },
            post: {
              requestBody: {
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
              },
              responses: {
                '201': {
                  description: 'Created'
                }
              },
              'x-uigen-layout': {
                type: 'sidebar',
                metadata: {
                  sidebarWidth: 300
                }
              }
            }
          }
        }
      } as any;

      const adapter = new OpenAPI3Adapter(spec);
      const ir = adapter.adapt();

      const usersResource = ir.resources.find(r => r.slug === 'users');
      expect(usersResource).toBeDefined();
      
      // Should use the first operation's layout override (GET)
      expect(usersResource?.layoutOverride).toEqual({
        type: 'centered',
        metadata: {
          maxWidth: 800
        }
      });
    });

    /**
     * **Validates: Requirements 12.2, 12.5**
     */
    it('should not set layoutOverride when no operation has x-uigen-layout', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
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
                            id: { type: 'integer' },
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
        },
        'x-uigen-layout': {
          type: 'sidebar'
        }
      } as any;

      const adapter = new OpenAPI3Adapter(spec);
      const ir = adapter.adapt();

      const usersResource = ir.resources.find(r => r.slug === 'users');
      expect(usersResource).toBeDefined();
      expect(usersResource?.layoutOverride).toBeUndefined();
    });

    /**
     * **Validates: Requirements 12.2, 12.5**
     */
    it('should handle multiple resources with different layout overrides', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
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
                            id: { type: 'integer' },
                            name: { type: 'string' }
                          }
                        }
                      }
                    }
                  }
                }
              },
              'x-uigen-layout': {
                type: 'sidebar',
                metadata: {
                  sidebarWidth: 250
                }
              }
            }
          },
          '/products': {
            get: {
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
                            id: { type: 'integer' },
                            title: { type: 'string' }
                          }
                        }
                      }
                    }
                  }
                }
              },
              'x-uigen-layout': {
                type: 'dashboard-grid',
                metadata: {
                  columns: {
                    desktop: 4
                  }
                }
              }
            }
          }
        },
        'x-uigen-layout': {
          type: 'centered'
        }
      } as any;

      const adapter = new OpenAPI3Adapter(spec);
      const ir = adapter.adapt();

      const usersResource = ir.resources.find(r => r.slug === 'users');
      expect(usersResource?.layoutOverride).toEqual({
        type: 'sidebar',
        metadata: {
          sidebarWidth: 250
        }
      });

      const productsResource = ir.resources.find(r => r.slug === 'products');
      expect(productsResource?.layoutOverride).toEqual({
        type: 'dashboard-grid',
        metadata: {
          columns: {
            desktop: 4
          }
        }
      });
    });
  });

  describe('Layout configuration validation', () => {
    /**
     * **Validates: Requirements 12.1**
     */
    it('should handle invalid document-level layout gracefully', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              responses: {
                '200': {
                  description: 'Success'
                }
              }
            }
          }
        },
        'x-uigen-layout': 'invalid'
      } as any;

      const adapter = new OpenAPI3Adapter(spec);
      const ir = adapter.adapt();

      // Should set layoutConfig to undefined for invalid config
      expect(ir.layoutConfig).toBeUndefined();
    });

    /**
     * **Validates: Requirements 12.2**
     */
    it('should handle invalid operation-level layout gracefully', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
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
                            id: { type: 'integer' },
                            name: { type: 'string' }
                          }
                        }
                      }
                    }
                  }
                }
              },
              'x-uigen-layout': 'invalid'
            }
          }
        }
      } as any;

      const adapter = new OpenAPI3Adapter(spec);
      const ir = adapter.adapt();

      const usersResource = ir.resources.find(r => r.slug === 'users');
      expect(usersResource).toBeDefined();
      
      // Should not set layoutOverride for invalid config
      expect(usersResource?.layoutOverride).toBeUndefined();
    });
  });

  describe('Complex scenarios', () => {
    /**
     * **Validates: Requirements 12.1, 12.2, 12.5**
     */
    it('should handle spec with both document and operation layouts', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Complex API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
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
                            id: { type: 'integer' },
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
          '/auth/login': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        username: { type: 'string' },
                        password: { type: 'string' }
                      }
                    }
                  }
                }
              },
              responses: {
                '200': {
                  description: 'Success'
                }
              },
              'x-uigen-layout': {
                type: 'centered',
                metadata: {
                  maxWidth: 400,
                  verticalCenter: true
                }
              }
            }
          }
        },
        'x-uigen-layout': {
          type: 'sidebar',
          metadata: {
            sidebarWidth: 280,
            sidebarCollapsible: true
          }
        }
      } as any;

      const adapter = new OpenAPI3Adapter(spec);
      const ir = adapter.adapt();

      // Document-level layout
      expect(ir.layoutConfig).toEqual({
        type: 'sidebar',
        metadata: {
          sidebarWidth: 280,
          sidebarCollapsible: true
        }
      });

      // Users resource should not have override
      const usersResource = ir.resources.find(r => r.slug === 'users');
      expect(usersResource?.layoutOverride).toBeUndefined();

      // Login resource should have override (inferred from /auth/login path)
      const loginResource = ir.resources.find(r => r.slug === 'login');
      expect(loginResource?.layoutOverride).toEqual({
        type: 'centered',
        metadata: {
          maxWidth: 400,
          verticalCenter: true
        }
      });
    });

    /**
     * **Validates: Requirements 12.1**
     */
    it('should handle custom layout types', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Custom API', version: '1.0.0' },
        paths: {
          '/dashboard': {
            get: {
              responses: {
                '200': {
                  description: 'Success'
                }
              }
            }
          }
        },
        'x-uigen-layout': {
          type: 'custom-kanban-board',
          metadata: {
            swimlanes: 4,
            cardWidth: 300,
            customOption: 'value'
          }
        }
      } as any;

      const adapter = new OpenAPI3Adapter(spec);
      const ir = adapter.adapt();

      expect(ir.layoutConfig).toEqual({
        type: 'custom-kanban-board',
        metadata: {
          swimlanes: 4,
          cardWidth: 300,
          customOption: 'value'
        }
      });
    });
  });
});
