import { describe, it, expect } from 'vitest';
import { OpenAPI3Adapter } from '../openapi3';
import type { OpenAPIV3 } from 'openapi-types';

describe('OpenAPI3Adapter - File Type Extraction', () => {
  describe('fileType population for binary format fields', () => {
    it('should populate fileType as image for image MIME types', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/upload': {
            post: {
              operationId: 'uploadImage',
              requestBody: {
                content: {
                  'multipart/form-data': {
                    schema: {
                      type: 'object',
                      properties: {
                        image: {
                          type: 'string',
                          format: 'binary',
                          'x-uigen-file-types': ['image/png', 'image/jpeg']
                        }
                      }
                    }
                  }
                }
              },
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();
      
      const resource = app.resources[0];
      const operation = resource.operations[0];
      const imageField = operation.requestBody?.children?.find(c => c.key === 'image');
      
      expect(imageField?.fileMetadata?.fileType).toBe('image');
      expect(imageField?.fileMetadata?.allowedMimeTypes).toEqual(['image/png', 'image/jpeg']);
    });

    it('should populate fileType as document for document MIME types', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/upload': {
            post: {
              operationId: 'uploadDocument',
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
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();
      
      const resource = app.resources[0];
      const operation = resource.operations[0];
      const docField = operation.requestBody?.children?.find(c => c.key === 'document');
      
      expect(docField?.fileMetadata?.fileType).toBe('document');
    });

    it('should populate fileType as video for video MIME types', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/upload': {
            post: {
              operationId: 'uploadVideo',
              requestBody: {
                content: {
                  'multipart/form-data': {
                    schema: {
                      type: 'object',
                      properties: {
                        video: {
                          type: 'string',
                          format: 'binary',
                          'x-uigen-file-types': ['video/mp4', 'video/mpeg']
                        }
                      }
                    }
                  }
                }
              },
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();
      
      const resource = app.resources[0];
      const operation = resource.operations[0];
      const videoField = operation.requestBody?.children?.find(c => c.key === 'video');
      
      expect(videoField?.fileMetadata?.fileType).toBe('video');
    });

    it('should populate fileType as audio for audio MIME types', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/upload': {
            post: {
              operationId: 'uploadAudio',
              requestBody: {
                content: {
                  'multipart/form-data': {
                    schema: {
                      type: 'object',
                      properties: {
                        audio: {
                          type: 'string',
                          format: 'binary',
                          'x-uigen-file-types': ['audio/mpeg', 'audio/wav']
                        }
                      }
                    }
                  }
                }
              },
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();
      
      const resource = app.resources[0];
      const operation = resource.operations[0];
      const audioField = operation.requestBody?.children?.find(c => c.key === 'audio');
      
      expect(audioField?.fileMetadata?.fileType).toBe('audio');
    });

    it('should populate fileType as generic for mixed MIME types', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/upload': {
            post: {
              operationId: 'uploadFile',
              requestBody: {
                content: {
                  'multipart/form-data': {
                    schema: {
                      type: 'object',
                      properties: {
                        file: {
                          type: 'string',
                          format: 'binary',
                          'x-uigen-file-types': ['image/png', 'application/pdf']
                        }
                      }
                    }
                  }
                }
              },
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();
      
      const resource = app.resources[0];
      const operation = resource.operations[0];
      const fileField = operation.requestBody?.children?.find(c => c.key === 'file');
      
      expect(fileField?.fileMetadata?.fileType).toBe('generic');
    });

    it('should default to generic when no MIME types specified', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/upload': {
            post: {
              operationId: 'uploadFile',
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
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();
      
      const resource = app.resources[0];
      const operation = resource.operations[0];
      const fileField = operation.requestBody?.children?.find(c => c.key === 'file');
      
      expect(fileField?.fileMetadata?.fileType).toBe('generic');
      expect(fileField?.fileMetadata?.allowedMimeTypes).toEqual(['*/*']);
    });
  });

  describe('contentMediaType extraction', () => {
    it('should extract fileType from contentMediaType', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/upload': {
            post: {
              operationId: 'uploadImage',
              requestBody: {
                content: {
                  'multipart/form-data': {
                    schema: {
                      type: 'object',
                      properties: {
                        image: {
                          type: 'string',
                          format: 'binary',
                          contentMediaType: 'image/jpeg'
                        }
                      }
                    }
                  }
                }
              },
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();
      
      const resource = app.resources[0];
      const operation = resource.operations[0];
      const imageField = operation.requestBody?.children?.find(c => c.key === 'image');
      
      expect(imageField?.fileMetadata?.fileType).toBe('image');
      expect(imageField?.fileMetadata?.allowedMimeTypes).toContain('image/jpeg');
    });
  });

  describe('array schema file type propagation', () => {
    it('should propagate fileType to array items schema', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/upload': {
            post: {
              operationId: 'uploadImages',
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
                            'x-uigen-file-types': ['image/png', 'image/jpeg']
                          }
                        }
                      }
                    }
                  }
                }
              },
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();
      
      const resource = app.resources[0];
      const operation = resource.operations[0];
      const imagesField = operation.requestBody?.children?.find(c => c.key === 'images');
      
      expect(imagesField?.type).toBe('array');
      expect(imagesField?.items?.fileMetadata?.fileType).toBe('image');
      expect(imagesField?.items?.fileMetadata?.multiple).toBe(true);
    });
  });

  describe('nested object schema file type detection', () => {
    it('should detect fileType in nested object schemas', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/upload': {
            post: {
              operationId: 'uploadProfile',
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
                              'x-uigen-file-types': ['image/png']
                            }
                          }
                        }
                      }
                    }
                  }
                }
              },
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();
      
      const resource = app.resources[0];
      const operation = resource.operations[0];
      const profileField = operation.requestBody?.children?.find(c => c.key === 'profile');
      const avatarField = profileField?.children?.find(c => c.key === 'avatar');
      
      expect(avatarField?.fileMetadata?.fileType).toBe('image');
    });
  });
});
