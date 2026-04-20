import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OpenAPI3Adapter } from '../openapi3.js';
import { AnnotationHandlerRegistry } from '../annotations/registry.js';
import { FileTypesHandler } from '../annotations/handlers/file-types-handler.js';
import type { OpenAPIV3 } from 'openapi-types';
import type { SchemaNode } from '../../ir/types.js';

/**
 * Integration tests for FileTypesHandler with full adapter flow.
 * 
 * Tests verify:
 * - Handler extracts x-uigen-file-types from spec
 * - Handler applies to IR via FileMetadataVisitor
 * - Config overrides spec value (config precedence)
 * - Integration with FileMetadataVisitor
 * - End-to-end flow (spec → IR → SchemaNode)
 * 
 * Requirements: 1.1, 1.4, 6.1
 */
describe('FileTypesHandler - Integration Tests', () => {
  let registry: AnnotationHandlerRegistry;

  beforeEach(() => {
    registry = AnnotationHandlerRegistry.getInstance();
    registry.clear();
    registry.register(new FileTypesHandler());
  });

  afterEach(() => {
    registry.clear();
  });

  describe('Handler extracts from spec', () => {
    it('should extract x-uigen-file-types from binary schema', () => {
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
                          'x-uigen-file-types': ['image/jpeg', 'image/png']
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
      const avatarField = createOp?.requestBody?.children?.find(f => f.key === 'avatar');

      expect(avatarField).toBeDefined();
      expect(avatarField?.type).toBe('file');
      expect(avatarField?.fileMetadata?.allowedMimeTypes).toEqual(['image/jpeg', 'image/png']);
      expect(avatarField?.fileMetadata?.accept).toBe('image/jpeg,image/png');
    });

    it('should extract x-uigen-file-types with wildcard', () => {
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
                        file: {
                          type: 'string',
                          format: 'binary',
                          'x-uigen-file-types': ['image/*']
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

      expect(fileField?.fileMetadata?.allowedMimeTypes).toEqual(['image/*']);
      expect(fileField?.fileMetadata?.accept).toBe('image/*');
      expect(fileField?.fileMetadata?.fileType).toBe('image');
    });

    it('should handle multiple MIME types', () => {
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
                        document: {
                          type: 'string',
                          format: 'binary',
                          'x-uigen-file-types': [
                            'application/pdf',
                            'application/msword',
                            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                          ]
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
      const docField = createOp?.requestBody?.children?.find(f => f.key === 'document');

      expect(docField?.fileMetadata?.allowedMimeTypes).toHaveLength(3);
      expect(docField?.fileMetadata?.allowedMimeTypes).toContain('application/pdf');
      expect(docField?.fileMetadata?.allowedMimeTypes).toContain('application/msword');
      expect(docField?.fileMetadata?.fileType).toBe('document');
    });
  });

  describe('Handler applies to IR', () => {
    it('should apply file types to SchemaNode fileMetadata', () => {
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
                          'x-uigen-file-types': ['video/mp4', 'video/webm']
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
      const videoField = createOp?.requestBody?.children?.find(f => f.key === 'video');

      // Verify fileMetadata structure
      expect(videoField?.fileMetadata).toBeDefined();
      expect(videoField?.fileMetadata?.allowedMimeTypes).toEqual(['video/mp4', 'video/webm']);
      expect(videoField?.fileMetadata?.accept).toBe('video/mp4,video/webm');
      expect(videoField?.fileMetadata?.fileType).toBe('video');
      expect(videoField?.fileMetadata?.multiple).toBe(false);
      expect(videoField?.fileMetadata?.maxSizeBytes).toBe(10 * 1024 * 1024); // Default 10MB
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
                            'x-uigen-file-types': ['image/jpeg', 'image/png', 'image/webp']
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
      const imagesField = createOp?.requestBody?.children?.find(f => f.key === 'images');

      expect(imagesField?.type).toBe('array');
      expect(imagesField?.items?.type).toBe('file');
      expect(imagesField?.items?.fileMetadata?.allowedMimeTypes).toEqual([
        'image/jpeg',
        'image/png',
        'image/webp'
      ]);
      // Array of files should have multiple: true
      expect(imagesField?.items?.fileMetadata?.multiple).toBe(true);
    });
  });

  describe('Integration with FileMetadataVisitor', () => {
    it('should merge x-uigen-file-types with contentMediaType', () => {
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
                          contentMediaType: 'image/png',
                          'x-uigen-file-types': ['image/jpeg', 'image/gif']
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

      // FileMetadataVisitor should merge both sources
      expect(fileField?.fileMetadata?.allowedMimeTypes).toEqual([
        'image/jpeg',
        'image/gif',
        'image/png'
      ]);
      expect(fileField?.fileMetadata?.accept).toBe('image/jpeg,image/gif,image/png');
    });

    it('should not duplicate MIME types when contentMediaType is in x-uigen-file-types', () => {
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
                          contentMediaType: 'image/png',
                          'x-uigen-file-types': ['image/png', 'image/jpeg']
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

      // Should not duplicate image/png
      expect(fileField?.fileMetadata?.allowedMimeTypes).toEqual(['image/png', 'image/jpeg']);
    });

    it('should use default MIME types when x-uigen-file-types is absent', () => {
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

      // Should default to accepting all files
      expect(fileField?.fileMetadata?.allowedMimeTypes).toEqual(['*/*']);
      expect(fileField?.fileMetadata?.accept).toBe('*/*');
      expect(fileField?.fileMetadata?.fileType).toBe('generic');
    });

    it('should work with x-uigen-max-file-size alongside x-uigen-file-types', () => {
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
                              'x-uigen-file-types': ['image/*']
                            },
                            resume: {
                              type: 'string',
                              format: 'binary',
                              'x-uigen-file-types': ['application/pdf']
                            }
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

      expect(avatarField?.fileMetadata?.allowedMimeTypes).toEqual(['image/*']);
      expect(avatarField?.fileMetadata?.fileType).toBe('image');
      expect(resumeField?.fileMetadata?.allowedMimeTypes).toEqual(['application/pdf']);
      expect(resumeField?.fileMetadata?.fileType).toBe('document');
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
                            'x-uigen-file-types': ['image/jpeg', 'image/png']
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

      const getOp = result.resources[0]?.operations.find(op => op.method === 'GET');
      const responseSchema = getOp?.responses['200']?.schema as SchemaNode;
      const avatarField = responseSchema?.children?.find(f => f.key === 'avatar');

      expect(avatarField?.type).toBe('file');
      expect(avatarField?.fileMetadata?.allowedMimeTypes).toEqual(['image/jpeg', 'image/png']);
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
                          'x-uigen-file-types': ['image/jpeg', 'image/png']
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

      // Spec value should be used
      expect(fileField?.fileMetadata?.allowedMimeTypes).toEqual(['image/jpeg', 'image/png']);
    });
  });

  describe('Edge cases and validation', () => {
    it('should handle invalid x-uigen-file-types gracefully', () => {
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
                          'x-uigen-file-types': 'not-an-array' // Invalid
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

      // Should fall back to default
      expect(fileField?.fileMetadata?.allowedMimeTypes).toEqual(['*/*']);
    });

    it('should handle empty x-uigen-file-types array', () => {
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
                          'x-uigen-file-types': [] // Empty array
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

      // Should fall back to default
      expect(fileField?.fileMetadata?.allowedMimeTypes).toEqual(['*/*']);
    });

    it('should filter out non-string values from x-uigen-file-types', () => {
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
                          'x-uigen-file-types': ['image/png', 123, null, 'image/jpeg'] as any
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

      // Should filter out non-strings
      expect(fileField?.fileMetadata?.allowedMimeTypes).toEqual(['image/png', 'image/jpeg']);
    });

    it('should handle non-file fields without x-uigen-file-types', () => {
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
                          'x-uigen-file-types': ['image/png'] // Should be ignored for non-file field
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
      const nameField = createOp?.requestBody?.children?.find(f => f.key === 'name');

      // Should be a string field, not a file field
      expect(nameField?.type).toBe('string');
      expect(nameField?.fileMetadata).toBeUndefined();
    });
  });
});
