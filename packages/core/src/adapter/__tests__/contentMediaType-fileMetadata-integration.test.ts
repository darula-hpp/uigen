import { describe, it, expect } from 'vitest';
import { OpenAPI3Adapter } from '../openapi3.js';
import type { OpenAPIV3 } from 'openapi-types';

describe('contentMediaType File Metadata Integration', () => {
  describe('contentMediaType without format: binary', () => {
    it('should extract fileMetadata from schema with contentMediaType only', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/upload': {
            post: {
              operationId: 'upload',
              requestBody: {
                content: {
                  'multipart/form-data': {
                    schema: {
                      type: 'object',
                      properties: {
                        file: {
                          type: 'string',
                          contentMediaType: 'application/octet-stream'
                        }
                      }
                    }
                  }
                }
              },
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

      const uploadOp = ir.resources[0].operations[0];
      const fileField = uploadOp.requestBody?.children?.find(f => f.key === 'file');

      expect(fileField).toBeDefined();
      expect(fileField?.type).toBe('file');
      expect(fileField?.fileMetadata).toBeDefined();
      expect(fileField?.fileMetadata?.allowedMimeTypes).toEqual(['application/octet-stream']);
      expect(fileField?.fileMetadata?.maxSizeBytes).toBe(10 * 1024 * 1024);
      expect(fileField?.fileMetadata?.fileType).toBe('generic');
    });

    it('should extract fileMetadata from anyOf schema with contentMediaType', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/meetings': {
            post: {
              operationId: 'createMeeting',
              requestBody: {
                content: {
                  'multipart/form-data': {
                    schema: {
                      type: 'object',
                      properties: {
                        recording: {
                          anyOf: [
                            {
                              type: 'string',
                              contentMediaType: 'application/octet-stream'
                            },
                            {
                              type: 'null'
                            }
                          ]
                        }
                      }
                    }
                  }
                }
              },
              responses: {
                '201': {
                  description: 'Created'
                }
              }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const ir = adapter.adapt();

      const createOp = ir.resources[0].operations[0];
      const recordingField = createOp.requestBody?.children?.find(f => f.key === 'recording');

      expect(recordingField).toBeDefined();
      expect(recordingField?.type).toBe('file');
      expect(recordingField?.fileMetadata).toBeDefined();
      expect(recordingField?.fileMetadata?.allowedMimeTypes).toEqual(['application/octet-stream']);
      expect(recordingField?.fileMetadata?.maxSizeBytes).toBe(10 * 1024 * 1024);
      expect(recordingField?.fileMetadata?.fileType).toBe('generic');
    });

    it('should extract fileMetadata for image contentMediaType', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/upload': {
            post: {
              operationId: 'upload',
              requestBody: {
                content: {
                  'multipart/form-data': {
                    schema: {
                      type: 'object',
                      properties: {
                        avatar: {
                          type: 'string',
                          contentMediaType: 'image/png'
                        }
                      }
                    }
                  }
                }
              },
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

      const uploadOp = ir.resources[0].operations[0];
      const avatarField = uploadOp.requestBody?.children?.find(f => f.key === 'avatar');

      expect(avatarField).toBeDefined();
      expect(avatarField?.type).toBe('file');
      expect(avatarField?.fileMetadata).toBeDefined();
      expect(avatarField?.fileMetadata?.allowedMimeTypes).toEqual(['image/png']);
      expect(avatarField?.fileMetadata?.fileType).toBe('image');
    });

    it('should merge contentMediaType with x-uigen-file-types', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/upload': {
            post: {
              operationId: 'upload',
              requestBody: {
                content: {
                  'multipart/form-data': {
                    schema: {
                      type: 'object',
                      properties: {
                        document: {
                          type: 'string',
                          contentMediaType: 'application/pdf',
                          'x-uigen-file-types': ['application/msword']
                        }
                      }
                    }
                  }
                }
              },
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

      const uploadOp = ir.resources[0].operations[0];
      const documentField = uploadOp.requestBody?.children?.find(f => f.key === 'document');

      expect(documentField).toBeDefined();
      expect(documentField?.type).toBe('file');
      expect(documentField?.fileMetadata).toBeDefined();
      expect(documentField?.fileMetadata?.allowedMimeTypes).toContain('application/pdf');
      expect(documentField?.fileMetadata?.allowedMimeTypes).toContain('application/msword');
      expect(documentField?.fileMetadata?.fileType).toBe('document');
    });

    it('should respect x-uigen-max-file-size with contentMediaType', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/upload': {
            post: {
              operationId: 'upload',
              requestBody: {
                content: {
                  'multipart/form-data': {
                    schema: {
                      type: 'object',
                      properties: {
                        video: {
                          type: 'string',
                          contentMediaType: 'video/mp4',
                          'x-uigen-max-file-size': 50 * 1024 * 1024 // 50MB
                        }
                      }
                    }
                  }
                }
              },
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

      const uploadOp = ir.resources[0].operations[0];
      const videoField = uploadOp.requestBody?.children?.find(f => f.key === 'video');

      expect(videoField).toBeDefined();
      expect(videoField?.type).toBe('file');
      expect(videoField?.fileMetadata).toBeDefined();
      expect(videoField?.fileMetadata?.maxSizeBytes).toBe(50 * 1024 * 1024);
      expect(videoField?.fileMetadata?.fileType).toBe('video');
    });
  });

  describe('backward compatibility with format: binary', () => {
    it('should still extract fileMetadata from format: binary', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/upload': {
            post: {
              operationId: 'upload',
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

      const uploadOp = ir.resources[0].operations[0];
      const fileField = uploadOp.requestBody?.children?.find(f => f.key === 'file');

      expect(fileField).toBeDefined();
      expect(fileField?.type).toBe('file');
      expect(fileField?.fileMetadata).toBeDefined();
      expect(fileField?.fileMetadata?.allowedMimeTypes).toEqual(['*/*']);
    });

    it('should extract fileMetadata from format: binary with contentMediaType', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/upload': {
            post: {
              operationId: 'upload',
              requestBody: {
                content: {
                  'multipart/form-data': {
                    schema: {
                      type: 'object',
                      properties: {
                        file: {
                          type: 'string',
                          format: 'binary',
                          contentMediaType: 'image/jpeg'
                        }
                      }
                    }
                  }
                }
              },
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

      const uploadOp = ir.resources[0].operations[0];
      const fileField = uploadOp.requestBody?.children?.find(f => f.key === 'file');

      expect(fileField).toBeDefined();
      expect(fileField?.type).toBe('file');
      expect(fileField?.fileMetadata).toBeDefined();
      expect(fileField?.fileMetadata?.allowedMimeTypes).toEqual(['image/jpeg']);
      expect(fileField?.fileMetadata?.fileType).toBe('image');
    });
  });

  describe('edge cases', () => {
    it('should not extract fileMetadata for empty contentMediaType', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/test': {
            post: {
              operationId: 'test',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        field: {
                          type: 'string',
                          contentMediaType: ''
                        }
                      }
                    }
                  }
                }
              },
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

      const testOp = ir.resources[0].operations[0];
      const field = testOp.requestBody?.children?.find(f => f.key === 'field');

      expect(field).toBeDefined();
      expect(field?.type).toBe('string');
      expect(field?.fileMetadata).toBeUndefined();
    });

    it('should not extract fileMetadata for whitespace-only contentMediaType', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/test': {
            post: {
              operationId: 'test',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        field: {
                          type: 'string',
                          contentMediaType: '   '
                        }
                      }
                    }
                  }
                }
              },
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

      const testOp = ir.resources[0].operations[0];
      const field = testOp.requestBody?.children?.find(f => f.key === 'field');

      expect(field).toBeDefined();
      expect(field?.type).toBe('string');
      expect(field?.fileMetadata).toBeUndefined();
    });
  });
});
