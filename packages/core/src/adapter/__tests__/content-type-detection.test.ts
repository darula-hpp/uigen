import { describe, it, expect } from 'vitest';
import { OpenAPI3Adapter } from '../openapi3.js';
import type { OpenAPIV3 } from 'openapi-types';

/**
 * Unit tests for content type detection in OpenAPI3Adapter
 * Tests Requirements 16.1, 16.2, 16.3, 16.4
 */

describe('OpenAPI3Adapter - Content Type Detection', () => {
  describe('File Field Detection (Requirement 16.1)', () => {
    it('should set requestContentType to multipart/form-data when request body contains a file field', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/upload': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        avatar: {
                          type: 'string',
                          format: 'binary'
                        }
                      }
                    }
                  }
                }
              },
              responses: { '201': { description: 'Created' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const operation = result.resources[0].operations[0];
      expect(operation.requestContentType).toBe('multipart/form-data');
    });

    it('should not set multipart/form-data for operations without file fields', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        name: {
                          type: 'string'
                        },
                        email: {
                          type: 'string'
                        }
                      }
                    }
                  }
                }
              },
              responses: { '201': { description: 'Created' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const operation = result.resources[0].operations[0];
      expect(operation.requestContentType).toBe('application/json');
    });
  });

  describe('Nested File Field Detection (Requirement 16.2)', () => {
    it('should detect file fields in nested objects', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        name: {
                          type: 'string'
                        },
                        profile: {
                          type: 'object',
                          properties: {
                            avatar: {
                              type: 'string',
                              format: 'binary'
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              responses: { '201': { description: 'Created' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const operation = result.resources[0].operations[0];
      expect(operation.requestContentType).toBe('multipart/form-data');
    });

    it('should detect file fields in arrays', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/documents': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        title: {
                          type: 'string'
                        },
                        attachments: {
                          type: 'array',
                          items: {
                            type: 'string',
                            format: 'binary'
                          }
                        }
                      }
                    }
                  }
                }
              },
              responses: { '201': { description: 'Created' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const operation = result.resources[0].operations[0];
      expect(operation.requestContentType).toBe('multipart/form-data');
    });

    it('should detect file fields deeply nested in objects', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/posts': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        title: {
                          type: 'string'
                        },
                        metadata: {
                          type: 'object',
                          properties: {
                            author: {
                              type: 'object',
                              properties: {
                                photo: {
                                  type: 'string',
                                  format: 'binary'
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
              responses: { '201': { description: 'Created' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const operation = result.resources[0].operations[0];
      expect(operation.requestContentType).toBe('multipart/form-data');
    });
  });

  describe('Explicit Content Type Preservation (Requirement 16.3)', () => {
    it('should preserve explicit multipart/form-data from spec', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/upload': {
            post: {
              requestBody: {
                content: {
                  'multipart/form-data': {
                    schema: {
                      type: 'object',
                      properties: {
                        name: {
                          type: 'string'
                        },
                        file: {
                          type: 'string',
                          format: 'binary'
                        }
                      }
                    }
                  }
                }
              },
              responses: { '201': { description: 'Created' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const operation = result.resources[0].operations[0];
      expect(operation.requestContentType).toBe('multipart/form-data');
    });

    it('should preserve multipart/form-data even without file fields', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/form': {
            post: {
              requestBody: {
                content: {
                  'multipart/form-data': {
                    schema: {
                      type: 'object',
                      properties: {
                        name: {
                          type: 'string'
                        },
                        email: {
                          type: 'string'
                        }
                      }
                    }
                  }
                }
              },
              responses: { '201': { description: 'Created' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const operation = result.resources[0].operations[0];
      expect(operation.requestContentType).toBe('multipart/form-data');
    });
  });

  describe('Multiple Content Types (Requirement 16.4)', () => {
    it('should prefer multipart/form-data when multiple content types are available and file fields are present', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/upload': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        avatar: {
                          type: 'string',
                          format: 'binary'
                        }
                      }
                    }
                  },
                  'multipart/form-data': {
                    schema: {
                      type: 'object',
                      properties: {
                        avatar: {
                          type: 'string',
                          format: 'binary'
                        }
                      }
                    }
                  }
                }
              },
              responses: { '201': { description: 'Created' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const operation = result.resources[0].operations[0];
      expect(operation.requestContentType).toBe('multipart/form-data');
    });

    it('should use application/json when multiple content types are available but no file fields', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        name: {
                          type: 'string'
                        }
                      }
                    }
                  },
                  'application/x-www-form-urlencoded': {
                    schema: {
                      type: 'object',
                      properties: {
                        name: {
                          type: 'string'
                        }
                      }
                    }
                  }
                }
              },
              responses: { '201': { description: 'Created' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const operation = result.resources[0].operations[0];
      expect(operation.requestContentType).toBe('application/json');
    });
  });

  describe('Edge Cases', () => {
    it('should handle operations without request body', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              responses: { '200': { description: 'OK' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const operation = result.resources[0].operations[0];
      expect(operation.requestContentType).toBeUndefined();
    });

    it('should handle empty request body schema', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {}
                    }
                  }
                }
              },
              responses: { '201': { description: 'Created' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const operation = result.resources[0].operations[0];
      expect(operation.requestContentType).toBe('application/json');
    });

    it('should handle mixed file and non-file fields', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        name: {
                          type: 'string'
                        },
                        email: {
                          type: 'string'
                        },
                        avatar: {
                          type: 'string',
                          format: 'binary'
                        },
                        age: {
                          type: 'integer'
                        }
                      }
                    }
                  }
                }
              },
              responses: { '201': { description: 'Created' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const operation = result.resources[0].operations[0];
      expect(operation.requestContentType).toBe('multipart/form-data');
    });
  });
});
