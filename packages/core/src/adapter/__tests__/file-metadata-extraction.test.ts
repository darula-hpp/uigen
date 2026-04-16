import { describe, it, expect } from 'vitest';
import { OpenAPI3Adapter } from '../openapi3.js';
import type { OpenAPIV3 } from 'openapi-types';

/**
 * Unit tests for file metadata extraction in OpenAPI3Adapter
 * Tests Requirements 1.1, 1.2, 1.3, 1.4, 1.5
 */

describe('OpenAPI3Adapter - File Metadata Extraction', () => {
  describe('Binary Format Detection (Requirement 1.1)', () => {
    it('should map type: string with format: binary to type: file', () => {
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
      const fileField = operation.requestBody?.children?.find(c => c.key === 'file');
      
      expect(fileField).toBeDefined();
      expect(fileField?.type).toBe('file');
    });

    it('should not map non-binary string fields to file type', () => {
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
      const nameField = operation.requestBody?.children?.find(c => c.key === 'name');
      
      expect(nameField).toBeDefined();
      expect(nameField?.type).toBe('string');
      expect(nameField?.fileMetadata).toBeUndefined();
    });
  });

  describe('ContentMediaType Extraction (Requirement 1.2)', () => {
    it('should extract contentMediaType as allowed MIME type', () => {
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
                        avatar: {
                          type: 'string',
                          format: 'binary',
                          contentMediaType: 'image/png'
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
      const avatarField = operation.requestBody?.children?.find(c => c.key === 'avatar');
      
      expect(avatarField).toBeDefined();
      expect(avatarField?.type).toBe('file');
      expect(avatarField?.fileMetadata).toBeDefined();
      expect(avatarField?.fileMetadata?.allowedMimeTypes).toContain('image/png');
    });
  });

  describe('x-uigen-file-types Extension (Requirement 1.3)', () => {
    it('should extract x-uigen-file-types as allowed MIME types', () => {
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
                        document: {
                          type: 'string',
                          format: 'binary',
                          'x-uigen-file-types': ['application/pdf', 'application/msword']
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
      const documentField = operation.requestBody?.children?.find(c => c.key === 'document');
      
      expect(documentField).toBeDefined();
      expect(documentField?.type).toBe('file');
      expect(documentField?.fileMetadata).toBeDefined();
      expect(documentField?.fileMetadata?.allowedMimeTypes).toEqual(['application/pdf', 'application/msword']);
    });

    it('should combine contentMediaType and x-uigen-file-types', () => {
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
                        image: {
                          type: 'string',
                          format: 'binary',
                          contentMediaType: 'image/png',
                          'x-uigen-file-types': ['image/jpeg', 'image/webp']
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
      const imageField = operation.requestBody?.children?.find(c => c.key === 'image');
      
      expect(imageField).toBeDefined();
      expect(imageField?.type).toBe('file');
      expect(imageField?.fileMetadata).toBeDefined();
      expect(imageField?.fileMetadata?.allowedMimeTypes).toContain('image/jpeg');
      expect(imageField?.fileMetadata?.allowedMimeTypes).toContain('image/webp');
      expect(imageField?.fileMetadata?.allowedMimeTypes).toContain('image/png');
    });
  });

  describe('x-uigen-max-file-size Extension (Requirement 1.4)', () => {
    it('should extract x-uigen-max-file-size as size limit', () => {
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
                        video: {
                          type: 'string',
                          format: 'binary',
                          'x-uigen-max-file-size': 104857600 // 100MB
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
      const videoField = operation.requestBody?.children?.find(c => c.key === 'video');
      
      expect(videoField).toBeDefined();
      expect(videoField?.type).toBe('file');
      expect(videoField?.fileMetadata).toBeDefined();
      expect(videoField?.fileMetadata?.maxSizeBytes).toBe(104857600);
    });

    it('should use default size limit when x-uigen-max-file-size is not specified', () => {
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
      const fileField = operation.requestBody?.children?.find(c => c.key === 'file');
      
      expect(fileField).toBeDefined();
      expect(fileField?.type).toBe('file');
      expect(fileField?.fileMetadata).toBeDefined();
      expect(fileField?.fileMetadata?.maxSizeBytes).toBe(10 * 1024 * 1024); // 10MB default
    });
  });

  describe('Array Schema Detection (Requirement 1.5)', () => {
    it('should detect array of binary files and set multiple: true', () => {
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
                        attachments: {
                          type: 'array',
                          items: {
                            type: 'string',
                            format: 'binary',
                            'x-uigen-file-types': ['application/pdf']
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
      const attachmentsField = operation.requestBody?.children?.find(c => c.key === 'attachments');
      
      expect(attachmentsField).toBeDefined();
      expect(attachmentsField?.type).toBe('array');
      expect(attachmentsField?.items).toBeDefined();
      expect(attachmentsField?.items?.type).toBe('file');
      expect(attachmentsField?.items?.fileMetadata).toBeDefined();
      expect(attachmentsField?.items?.fileMetadata?.multiple).toBe(true);
    });
  });

  describe('HTML Accept Attribute Generation', () => {
    it('should generate accept attribute from allowed MIME types', () => {
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
                        image: {
                          type: 'string',
                          format: 'binary',
                          'x-uigen-file-types': ['image/png', 'image/jpeg', 'image/webp']
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
      const imageField = operation.requestBody?.children?.find(c => c.key === 'image');
      
      expect(imageField).toBeDefined();
      expect(imageField?.fileMetadata).toBeDefined();
      expect(imageField?.fileMetadata?.accept).toBe('image/png,image/jpeg,image/webp');
    });

    it('should default to */* when no MIME types specified', () => {
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
      const fileField = operation.requestBody?.children?.find(c => c.key === 'file');
      
      expect(fileField).toBeDefined();
      expect(fileField?.fileMetadata).toBeDefined();
      expect(fileField?.fileMetadata?.accept).toBe('*/*');
      expect(fileField?.fileMetadata?.allowedMimeTypes).toEqual(['*/*']);
    });
  });

  describe('Metadata Absence Handling (Requirement 2.6)', () => {
    it('should set fileMetadata to undefined for non-binary fields', () => {
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
      const nameField = operation.requestBody?.children?.find(c => c.key === 'name');
      const ageField = operation.requestBody?.children?.find(c => c.key === 'age');
      
      expect(nameField).toBeDefined();
      expect(nameField?.fileMetadata).toBeUndefined();
      expect(ageField).toBeDefined();
      expect(ageField?.fileMetadata).toBeUndefined();
    });
  });
});
