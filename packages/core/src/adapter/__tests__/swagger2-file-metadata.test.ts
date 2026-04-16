import { describe, it, expect } from 'vitest';
import { Swagger2Adapter } from '../swagger2.js';

/**
 * Unit tests for file metadata extraction in Swagger2Adapter
 * Tests Requirement 1.6: Apply same file type detection rules as OpenAPI3 adapter
 */

describe('Swagger2Adapter - File Metadata Extraction', () => {
  describe('Binary Format Detection and Metadata Preservation', () => {
    it('should preserve contentMediaType extension during conversion', () => {
      const swagger2Spec = {
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/upload': {
            post: {
              consumes: ['multipart/form-data'],
              parameters: [
                {
                  name: 'file',
                  in: 'formData',
                  type: 'file',
                  description: 'File to upload'
                }
              ],
              responses: {
                '201': { description: 'Created' }
              }
            }
          }
        },
        definitions: {
          FileUpload: {
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
      };

      const adapter = new Swagger2Adapter(swagger2Spec as any);
      const openapi3Spec = (adapter as any).convertToOpenAPI3();

      // Verify contentMediaType was preserved
      const avatarSchema = openapi3Spec.components.schemas.FileUpload.properties.avatar;
      expect(avatarSchema.format).toBe('binary');
      expect(avatarSchema.contentMediaType).toBe('image/png');
    });

    it('should preserve x-uigen-file-types extension during conversion', () => {
      const swagger2Spec = {
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
        definitions: {
          DocumentUpload: {
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
      };

      const adapter = new Swagger2Adapter(swagger2Spec as any);
      const openapi3Spec = (adapter as any).convertToOpenAPI3();

      // Verify x-uigen-file-types was preserved
      const documentSchema = openapi3Spec.components.schemas.DocumentUpload.properties.document;
      expect(documentSchema.format).toBe('binary');
      expect(documentSchema['x-uigen-file-types']).toEqual(['application/pdf', 'application/msword']);
    });

    it('should preserve x-uigen-max-file-size extension during conversion', () => {
      const swagger2Spec = {
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
        definitions: {
          VideoUpload: {
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
      };

      const adapter = new Swagger2Adapter(swagger2Spec as any);
      const openapi3Spec = (adapter as any).convertToOpenAPI3();

      // Verify x-uigen-max-file-size was preserved
      const videoSchema = openapi3Spec.components.schemas.VideoUpload.properties.video;
      expect(videoSchema.format).toBe('binary');
      expect(videoSchema['x-uigen-max-file-size']).toBe(104857600);
    });

    it('should preserve all file metadata extensions together', () => {
      const swagger2Spec = {
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
        definitions: {
          CompleteFileUpload: {
            type: 'object',
            properties: {
              file: {
                type: 'string',
                format: 'binary',
                contentMediaType: 'image/jpeg',
                'x-uigen-file-types': ['image/jpeg', 'image/png', 'image/webp'],
                'x-uigen-max-file-size': 5242880 // 5MB
              }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(swagger2Spec as any);
      const openapi3Spec = (adapter as any).convertToOpenAPI3();

      // Verify all extensions were preserved
      const fileSchema = openapi3Spec.components.schemas.CompleteFileUpload.properties.file;
      expect(fileSchema.format).toBe('binary');
      expect(fileSchema.contentMediaType).toBe('image/jpeg');
      expect(fileSchema['x-uigen-file-types']).toEqual(['image/jpeg', 'image/png', 'image/webp']);
      expect(fileSchema['x-uigen-max-file-size']).toBe(5242880);
    });

    it('should not add extensions to non-binary fields', () => {
      const swagger2Spec = {
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
        definitions: {
          User: {
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
      };

      const adapter = new Swagger2Adapter(swagger2Spec as any);
      const openapi3Spec = (adapter as any).convertToOpenAPI3();

      // Verify no file metadata extensions were added
      const nameSchema = openapi3Spec.components.schemas.User.properties.name;
      const ageSchema = openapi3Spec.components.schemas.User.properties.age;
      
      expect(nameSchema.contentMediaType).toBeUndefined();
      expect(nameSchema['x-uigen-file-types']).toBeUndefined();
      expect(nameSchema['x-uigen-max-file-size']).toBeUndefined();
      
      expect(ageSchema.contentMediaType).toBeUndefined();
      expect(ageSchema['x-uigen-file-types']).toBeUndefined();
      expect(ageSchema['x-uigen-max-file-size']).toBeUndefined();
    });

    it('should handle array schemas with binary items', () => {
      const swagger2Spec = {
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
        definitions: {
          MultiFileUpload: {
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
      };

      const adapter = new Swagger2Adapter(swagger2Spec as any);
      const openapi3Spec = (adapter as any).convertToOpenAPI3();

      // Verify array items preserve file metadata
      const attachmentsSchema = openapi3Spec.components.schemas.MultiFileUpload.properties.attachments;
      expect(attachmentsSchema.type).toBe('array');
      expect(attachmentsSchema.items.format).toBe('binary');
      expect(attachmentsSchema.items['x-uigen-file-types']).toEqual(['application/pdf']);
    });
  });

  describe('End-to-End File Metadata Flow', () => {
    it('should convert Swagger2 file metadata to IR through OpenAPI3Adapter', () => {
      const swagger2Spec = {
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/upload': {
            post: {
              consumes: ['multipart/form-data'],
              parameters: [
                {
                  name: 'body',
                  in: 'body',
                  schema: {
                    type: 'object',
                    properties: {
                      avatar: {
                        type: 'string',
                        format: 'binary',
                        contentMediaType: 'image/png',
                        'x-uigen-file-types': ['image/png', 'image/jpeg'],
                        'x-uigen-max-file-size': 5242880
                      }
                    }
                  }
                }
              ],
              responses: {
                '201': { description: 'Created' }
              }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(swagger2Spec as any);
      const ir = adapter.adapt();

      // Verify the IR contains file metadata
      const operation = ir.resources[0]?.operations[0];
      expect(operation).toBeDefined();
      
      const avatarField = operation?.requestBody?.children?.find(c => c.key === 'avatar');
      expect(avatarField).toBeDefined();
      expect(avatarField?.type).toBe('file');
      expect(avatarField?.fileMetadata).toBeDefined();
      expect(avatarField?.fileMetadata?.allowedMimeTypes).toContain('image/png');
      expect(avatarField?.fileMetadata?.allowedMimeTypes).toContain('image/jpeg');
      expect(avatarField?.fileMetadata?.maxSizeBytes).toBe(5242880);
    });
  });
});
