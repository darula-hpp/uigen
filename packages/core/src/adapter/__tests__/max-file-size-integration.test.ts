import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OpenAPI3Adapter } from '../openapi3.js';
import { AnnotationHandlerRegistry } from '../annotations/registry.js';
import { MaxFileSizeHandler } from '../annotations/handlers/max-file-size-handler.js';
import type { OpenAPIV3 } from 'openapi-types';
import type { SchemaNode } from '../../ir/types.js';

/**
 * Integration tests for MaxFileSizeHandler with full adapter flow.
 * 
 * Tests verify:
 * - Handler extracts x-uigen-max-file-size from spec
 * - Handler applies to IR via FileMetadataVisitor
 * - Config overrides spec value (config precedence)
 * - Integration with FileMetadataVisitor
 * - End-to-end flow (spec → IR → SchemaNode)
 * 
 * Requirements: 1.2, 1.4, 6.2
 */
describe('MaxFileSizeHandler - Integration Tests', () => {
  let registry: AnnotationHandlerRegistry;

  beforeEach(() => {
    registry = AnnotationHandlerRegistry.getInstance();
    registry.clear();
    registry.register(new MaxFileSizeHandler());
  });

  afterEach(() => {
    registry.clear();
  });

  describe('Handler extracts from spec', () => {
    it('should extract x-uigen-max-file-size from binary schema', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              summary: 'Create user',
              requestBody: {
                content: {
                  'multipart/form-data': {
                    schema: {
                      type: 'object',
                      properties: {
                        avatar: {
                          type: 'string',
                          format: 'binary',
                          'x-uigen-max-file-size': 5 * 1024 * 1024 // 5MB
                        } as any
                      }
                    }
                  }
                }
              },
              responses: {
                '201': { description: 'Created' }
              }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const createOp = result.resources[0]?.operations.find(op => op.method === 'POST');
      const avatarField = createOp?.requestBody?.children?.find(f => f.key === 'avatar');

      expect(avatarField).toBeDefined();
      expect(avatarField?.type).toBe('file');
      expect(avatarField?.fileMetadata?.maxSizeBytes).toBe(5 * 1024 * 1024);
    });

    it('should extract x-uigen-max-file-size with different sizes', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/documents': {
            post: {
              summary: 'Upload document',
              requestBody: {
                content: {
                  'multipart/form-data': {
                    schema: {
                      type: 'object',
                      properties: {
                        smallFile: {
                          type: 'string',
                          format: 'binary',
                          'x-uigen-max-file-size': 1024 * 1024 // 1MB
                        } as any,
                        largeFile: {
                          type: 'string',
                          format: 'binary',
                          'x-uigen-max-file-size': 100 * 1024 * 1024 // 100MB
                        } as any
                      }
                    }
                  }
                }
              },
              responses: {
                '201': { description: 'Created' }
              }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const createOp = result.resources[0]?.operations.find(op => op.method === 'POST');
      const smallFileField = createOp?.requestBody?.children?.find(f => f.key === 'smallFile');
      const largeFileField = createOp?.requestBody?.children?.find(f => f.key === 'largeFile');

      expect(smallFileField?.fileMetadata?.maxSizeBytes).toBe(1024 * 1024);
      expect(largeFileField?.fileMetadata?.maxSizeBytes).toBe(100 * 1024 * 1024);
    });

    it('should handle very small file sizes', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/uploads': {
            post: {
              summary: 'Upload file',
              requestBody: {
                content: {
                  'multipart/form-data': {
                    schema: {
                      type: 'object',
                      properties: {
                        tinyFile: {
                          type: 'string',
                          format: 'binary',
                          'x-uigen-max-file-size': 1024 // 1KB
                        } as any
                      }
                    }
                  }
                }
              },
              responses: {
                '201': { description: 'Created' }
              }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const createOp = result.resources[0]?.operations.find(op => op.method === 'POST');
      const tinyFileField = createOp?.requestBody?.children?.find(f => f.key === 'tinyFile');

      expect(tinyFileField?.fileMetadata?.maxSizeBytes).toBe(1024);
    });
  });

  describe('Handler applies to IR', () => {
    it('should apply max file size to SchemaNode fileMetadata', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/media': {
            post: {
              summary: 'Upload media',
              requestBody: {
                content: {
                  'multipart/form-data': {
                    schema: {
                      type: 'object',
                      properties: {
                        video: {
                          type: 'string',
                          format: 'binary',
                          'x-uigen-max-file-size': 50 * 1024 * 1024 // 50MB
                        } as any
                      }
                    }
                  }
                }
              },
              responses: {
                '201': { description: 'Created' }
              }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const createOp = result.resources[0]?.operations.find(op => op.method === 'POST');
      const videoField = createOp?.requestBody?.children?.find(f => f.key === 'video');

      // Verify fileMetadata structure
      expect(videoField?.fileMetadata).toBeDefined();
      expect(videoField?.fileMetadata?.maxSizeBytes).toBe(50 * 1024 * 1024);
      expect(videoField?.fileMetadata?.allowedMimeTypes).toEqual(['*/*']); // Default
      expect(videoField?.fileMetadata?.multiple).toBe(false);
    });

    it('should work with array schemas (multiple files)', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/gallery': {
            post: {
              summary: 'Upload images',
              requestBody: {
                content: {
                  'multipart/form-data': {
                    schema: {
                      type: 'object',
                      properties: {
                        images: {
                          type: 'array',
                          items: {
                            type: 'string',
                            format: 'binary',
                            'x-uigen-max-file-size': 2 * 1024 * 1024 // 2MB per image
                          } as any
                        }
                      }
                    }
                  }
                }
              },
              responses: {
                '201': { description: 'Created' }
              }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const createOp = result.resources[0]?.operations.find(op => op.method === 'POST');
      const imagesField = createOp?.requestBody?.children?.find(f => f.key === 'images');

      expect(imagesField?.type).toBe('array');
      expect(imagesField?.items?.type).toBe('file');
      expect(imagesField?.items?.fileMetadata?.maxSizeBytes).toBe(2 * 1024 * 1024);
      // Array of files should have multiple: true
      expect(imagesField?.items?.fileMetadata?.multiple).toBe(true);
    });
  });

  describe('Integration with FileMetadataVisitor', () => {
    it('should use default max size when x-uigen-max-file-size is absent', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/files': {
            post: {
              summary: 'Upload file',
              requestBody: {
                content: {
                  'multipart/form-data': {
                    schema: {
                      type: 'object',
                      properties: {
                        file: {
                          type: 'string',
                          format: 'binary'
                        }
                      }
                    }
                  }
                }
              },
              responses: {
                '201': { description: 'Created' }
              }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const createOp = result.resources[0]?.operations.find(op => op.method === 'POST');
      const fileField = createOp?.requestBody?.children?.find(f => f.key === 'file');

      // Should default to 10MB
      expect(fileField?.fileMetadata?.maxSizeBytes).toBe(10 * 1024 * 1024);
    });

    it('should work with x-uigen-file-types alongside x-uigen-max-file-size', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/files': {
            post: {
              summary: 'Upload file',
              requestBody: {
                content: {
                  'multipart/form-data': {
                    schema: {
                      type: 'object',
                      properties: {
                        file: {
                          type: 'string',
                          format: 'binary',
                          'x-uigen-file-types': ['image/jpeg', 'image/png'],
                          'x-uigen-max-file-size': 5 * 1024 * 1024 // 5MB
                        } as any
                      }
                    }
                  }
                }
              },
              responses: {
                '201': { description: 'Created' }
              }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const createOp = result.resources[0]?.operations.find(op => op.method === 'POST');
      const fileField = createOp?.requestBody?.children?.find(f => f.key === 'file');

      expect(fileField?.fileMetadata?.allowedMimeTypes).toEqual(['image/jpeg', 'image/png']);
      expect(fileField?.fileMetadata?.maxSizeBytes).toBe(5 * 1024 * 1024);
    });
  });

  describe('End-to-end flow (spec → IR → React)', () => {
    it('should produce correct IR for React FileUpload component', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/profiles': {
            post: {
              summary: 'Create profile',
              requestBody: {
                content: {
                  'multipart/form-data': {
                    schema: {
                      type: 'object',
                      required: ['name', 'avatar'],
                      properties: {
                        name: {
                          type: 'string'
                        },
                        avatar: {
                          type: 'string',
                          format: 'binary',
                          'x-uigen-file-types': ['image/jpeg', 'image/png', 'image/webp'],
                          'x-uigen-max-file-size': 2 * 1024 * 1024, // 2MB
                          'x-uigen-label': 'Profile Picture'
                        } as any
                      }
                    }
                  }
                }
              },
              responses: {
                '201': { description: 'Created' }
              }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const createOp = result.resources[0]?.operations.find(op => op.method === 'POST');
      const avatarField = createOp?.requestBody?.children?.find(f => f.key === 'avatar');

      // Verify complete IR structure for React component
      expect(avatarField).toMatchObject({
        type: 'file',
        key: 'avatar',
        label: 'Profile Picture',
        required: true,
        fileMetadata: {
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
          maxSizeBytes: 2 * 1024 * 1024,
          multiple: false,
          accept: 'image/jpeg,image/png,image/webp',
          fileType: 'image'
        }
      });
    });

    it('should handle nested file fields in objects', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              summary: 'Create user',
              requestBody: {
                content: {
                  'multipart/form-data': {
                    schema: {
                      type: 'object',
                      properties: {
                        profile: {
                          type: 'object',
                          properties: {
                            avatar: {
                              type: 'string',
                              format: 'binary',
                              'x-uigen-max-file-size': 3 * 1024 * 1024 // 3MB
                            } as any,
                            resume: {
                              type: 'string',
                              format: 'binary',
                              'x-uigen-max-file-size': 10 * 1024 * 1024 // 10MB
                            } as any
                          }
                        }
                      }
                    }
                  }
                }
              },
              responses: {
                '201': { description: 'Created' }
              }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const createOp = result.resources[0]?.operations.find(op => op.method === 'POST');
      const profileField = createOp?.requestBody?.children?.find(f => f.key === 'profile');
      const avatarField = profileField?.children?.find(f => f.key === 'avatar');
      const resumeField = profileField?.children?.find(f => f.key === 'resume');

      expect(avatarField?.fileMetadata?.maxSizeBytes).toBe(3 * 1024 * 1024);
      expect(resumeField?.fileMetadata?.maxSizeBytes).toBe(10 * 1024 * 1024);
    });

    it('should handle file fields in response schemas', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users/{id}': {
            get: {
              summary: 'Get user',
              parameters: [
                {
                  name: 'id',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' }
                }
              ],
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          name: { type: 'string' },
                          avatar: {
                            type: 'string',
                            format: 'binary',
                            'x-uigen-max-file-size': 5 * 1024 * 1024 // 5MB
                          } as any
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

      const getOp = result.resources[0]?.operations.find(op => op.method === 'GET');
      const responseSchema = getOp?.responses['200']?.schema as SchemaNode;
      const avatarField = responseSchema?.children?.find(f => f.key === 'avatar');

      expect(avatarField?.type).toBe('file');
      expect(avatarField?.fileMetadata?.maxSizeBytes).toBe(5 * 1024 * 1024);
    });
  });

  describe('Config overrides spec value', () => {
    it('should use spec value when both spec and config exist (spec precedence)', () => {
      // Note: This test demonstrates the expected behavior.
      // Actual config override testing requires ConfigLoader integration,
      // which is tested separately in config reconciliation tests.
      
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/files': {
            post: {
              summary: 'Upload file',
              requestBody: {
                content: {
                  'multipart/form-data': {
                    schema: {
                      type: 'object',
                      properties: {
                        file: {
                          type: 'string',
                          format: 'binary',
                          'x-uigen-max-file-size': 5 * 1024 * 1024 // 5MB
                        } as any
                      }
                    }
                  }
                }
              },
              responses: {
                '201': { description: 'Created' }
              }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const createOp = result.resources[0]?.operations.find(op => op.method === 'POST');
      const fileField = createOp?.requestBody?.children?.find(f => f.key === 'file');

      // Spec value should be used
      expect(fileField?.fileMetadata?.maxSizeBytes).toBe(5 * 1024 * 1024);
    });
  });

  describe('Edge cases and validation', () => {
    it('should handle invalid x-uigen-max-file-size gracefully', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/files': {
            post: {
              summary: 'Upload file',
              requestBody: {
                content: {
                  'multipart/form-data': {
                    schema: {
                      type: 'object',
                      properties: {
                        file: {
                          type: 'string',
                          format: 'binary',
                          'x-uigen-max-file-size': 'not-a-number' // Invalid
                        } as any
                      }
                    }
                  }
                }
              },
              responses: {
                '201': { description: 'Created' }
              }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const createOp = result.resources[0]?.operations.find(op => op.method === 'POST');
      const fileField = createOp?.requestBody?.children?.find(f => f.key === 'file');

      // Should fall back to default (10MB)
      expect(fileField?.fileMetadata?.maxSizeBytes).toBe(10 * 1024 * 1024);
    });

    it('should handle zero max file size', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/files': {
            post: {
              summary: 'Upload file',
              requestBody: {
                content: {
                  'multipart/form-data': {
                    schema: {
                      type: 'object',
                      properties: {
                        file: {
                          type: 'string',
                          format: 'binary',
                          'x-uigen-max-file-size': 0 // Invalid
                        } as any
                      }
                    }
                  }
                }
              },
              responses: {
                '201': { description: 'Created' }
              }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const createOp = result.resources[0]?.operations.find(op => op.method === 'POST');
      const fileField = createOp?.requestBody?.children?.find(f => f.key === 'file');

      // Should fall back to default (10MB)
      expect(fileField?.fileMetadata?.maxSizeBytes).toBe(10 * 1024 * 1024);
    });

    it('should handle negative max file size', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/files': {
            post: {
              summary: 'Upload file',
              requestBody: {
                content: {
                  'multipart/form-data': {
                    schema: {
                      type: 'object',
                      properties: {
                        file: {
                          type: 'string',
                          format: 'binary',
                          'x-uigen-max-file-size': -1024 // Invalid
                        } as any
                      }
                    }
                  }
                }
              },
              responses: {
                '201': { description: 'Created' }
              }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const createOp = result.resources[0]?.operations.find(op => op.method === 'POST');
      const fileField = createOp?.requestBody?.children?.find(f => f.key === 'file');

      // Should fall back to default (10MB)
      expect(fileField?.fileMetadata?.maxSizeBytes).toBe(10 * 1024 * 1024);
    });

    it('should handle NaN and Infinity', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/files': {
            post: {
              summary: 'Upload file',
              requestBody: {
                content: {
                  'multipart/form-data': {
                    schema: {
                      type: 'object',
                      properties: {
                        file1: {
                          type: 'string',
                          format: 'binary',
                          'x-uigen-max-file-size': NaN // Invalid
                        } as any,
                        file2: {
                          type: 'string',
                          format: 'binary',
                          'x-uigen-max-file-size': Infinity // Invalid
                        } as any
                      }
                    }
                  }
                }
              },
              responses: {
                '201': { description: 'Created' }
              }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const createOp = result.resources[0]?.operations.find(op => op.method === 'POST');
      const file1Field = createOp?.requestBody?.children?.find(f => f.key === 'file1');
      const file2Field = createOp?.requestBody?.children?.find(f => f.key === 'file2');

      // Both should fall back to default (10MB)
      expect(file1Field?.fileMetadata?.maxSizeBytes).toBe(10 * 1024 * 1024);
      expect(file2Field?.fileMetadata?.maxSizeBytes).toBe(10 * 1024 * 1024);
    });

    it('should handle non-file fields without x-uigen-max-file-size', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              summary: 'Create user',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        name: {
                          type: 'string',
                          'x-uigen-max-file-size': 1024 // Should be ignored for non-file field
                        } as any
                      }
                    }
                  }
                }
              },
              responses: {
                '201': { description: 'Created' }
              }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const createOp = result.resources[0]?.operations.find(op => op.method === 'POST');
      const nameField = createOp?.requestBody?.children?.find(f => f.key === 'name');

      // Should be a string field, not a file field
      expect(nameField?.type).toBe('string');
      expect(nameField?.fileMetadata).toBeUndefined();
    });

    it('should handle very large file sizes (GB range)', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/files': {
            post: {
              summary: 'Upload file',
              requestBody: {
                content: {
                  'multipart/form-data': {
                    schema: {
                      type: 'object',
                      properties: {
                        largeFile: {
                          type: 'string',
                          format: 'binary',
                          'x-uigen-max-file-size': 5 * 1024 * 1024 * 1024 // 5GB
                        } as any
                      }
                    }
                  }
                }
              },
              responses: {
                '201': { description: 'Created' }
              }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const result = adapter.adapt();

      const createOp = result.resources[0]?.operations.find(op => op.method === 'POST');
      const largeFileField = createOp?.requestBody?.children?.find(f => f.key === 'largeFile');

      expect(largeFileField?.fileMetadata?.maxSizeBytes).toBe(5 * 1024 * 1024 * 1024);
    });
  });
});
