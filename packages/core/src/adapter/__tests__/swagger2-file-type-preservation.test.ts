import { describe, it, expect } from 'vitest';
import { Swagger2Adapter } from '../swagger2';
import type { OpenAPIV2 } from 'openapi-types';

describe('Swagger2Adapter - File Type Preservation', () => {
  describe('file type preservation during Swagger 2.0 to OpenAPI 3.x conversion', () => {
    it('should preserve and detect image file type from x-uigen-file-types', () => {
      const spec: OpenAPIV2.Document = {
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/upload': {
            post: {
              operationId: 'uploadImage',
              consumes: ['multipart/form-data'],
              parameters: [
                {
                  name: 'image',
                  in: 'formData',
                  type: 'file',
                  'x-uigen-file-types': ['image/png', 'image/jpeg']
                } as any
              ],
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(spec);
      const app = adapter.adapt();
      
      const resource = app.resources[0];
      const operation = resource.operations[0];
      const imageField = operation.requestBody?.children?.find(c => c.key === 'image');
      
      expect(imageField?.fileMetadata?.fileType).toBe('image');
      expect(imageField?.fileMetadata?.allowedMimeTypes).toEqual(['image/png', 'image/jpeg']);
    });

    it('should preserve and detect document file type', () => {
      const spec: OpenAPIV2.Document = {
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/upload': {
            post: {
              operationId: 'uploadDocument',
              consumes: ['multipart/form-data'],
              parameters: [
                {
                  name: 'document',
                  in: 'formData',
                  type: 'file',
                  'x-uigen-file-types': ['application/pdf', 'application/msword']
                } as any
              ],
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(spec);
      const app = adapter.adapt();
      
      const resource = app.resources[0];
      const operation = resource.operations[0];
      const docField = operation.requestBody?.children?.find(c => c.key === 'document');
      
      expect(docField?.fileMetadata?.fileType).toBe('document');
    });

    it('should preserve and detect video file type', () => {
      const spec: OpenAPIV2.Document = {
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/upload': {
            post: {
              operationId: 'uploadVideo',
              consumes: ['multipart/form-data'],
              parameters: [
                {
                  name: 'video',
                  in: 'formData',
                  type: 'file',
                  'x-uigen-file-types': ['video/mp4']
                } as any
              ],
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(spec);
      const app = adapter.adapt();
      
      const resource = app.resources[0];
      const operation = resource.operations[0];
      const videoField = operation.requestBody?.children?.find(c => c.key === 'video');
      
      expect(videoField?.fileMetadata?.fileType).toBe('video');
    });

    it('should preserve and detect generic file type for mixed categories', () => {
      const spec: OpenAPIV2.Document = {
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/upload': {
            post: {
              operationId: 'uploadFile',
              consumes: ['multipart/form-data'],
              parameters: [
                {
                  name: 'file',
                  in: 'formData',
                  type: 'file',
                  'x-uigen-file-types': ['image/png', 'application/pdf']
                } as any
              ],
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(spec);
      const app = adapter.adapt();
      
      const resource = app.resources[0];
      const operation = resource.operations[0];
      const fileField = operation.requestBody?.children?.find(c => c.key === 'file');
      
      expect(fileField?.fileMetadata?.fileType).toBe('generic');
    });
  });

  describe('formData parameter file type detection', () => {
    it('should detect file type from formData parameters', () => {
      const spec: OpenAPIV2.Document = {
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/upload': {
            post: {
              operationId: 'uploadImage',
              consumes: ['multipart/form-data'],
              parameters: [
                {
                  name: 'avatar',
                  in: 'formData',
                  type: 'file',
                  'x-uigen-file-types': ['image/png', 'image/jpeg', 'image/webp']
                } as any
              ],
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(spec);
      const app = adapter.adapt();
      
      const resource = app.resources[0];
      const operation = resource.operations[0];
      const avatarField = operation.requestBody?.children?.find(c => c.key === 'avatar');
      
      expect(avatarField?.fileMetadata?.fileType).toBe('image');
      expect(avatarField?.fileMetadata?.allowedMimeTypes).toEqual(['image/png', 'image/jpeg', 'image/webp']);
    });

    it('should default to generic when no file types specified', () => {
      const spec: OpenAPIV2.Document = {
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/upload': {
            post: {
              operationId: 'uploadFile',
              consumes: ['multipart/form-data'],
              parameters: [
                {
                  name: 'file',
                  in: 'formData',
                  type: 'file'
                }
              ],
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(spec);
      const app = adapter.adapt();
      
      const resource = app.resources[0];
      const operation = resource.operations[0];
      const fileField = operation.requestBody?.children?.find(c => c.key === 'file');
      
      expect(fileField?.fileMetadata?.fileType).toBe('generic');
      expect(fileField?.fileMetadata?.allowedMimeTypes).toEqual(['*/*']);
    });
  });

  describe('file metadata extension preservation', () => {
    it('should preserve x-uigen-max-file-size extension', () => {
      const spec: OpenAPIV2.Document = {
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/upload': {
            post: {
              operationId: 'uploadImage',
              consumes: ['multipart/form-data'],
              parameters: [
                {
                  name: 'image',
                  in: 'formData',
                  type: 'file',
                  'x-uigen-file-types': ['image/png'],
                  'x-uigen-max-file-size': 5242880
                } as any
              ],
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(spec);
      const app = adapter.adapt();
      
      const resource = app.resources[0];
      const operation = resource.operations[0];
      const imageField = operation.requestBody?.children?.find(c => c.key === 'image');
      
      expect(imageField?.fileMetadata?.maxSizeBytes).toBe(5242880);
      expect(imageField?.fileMetadata?.fileType).toBe('image');
    });

    it('should preserve contentMediaType extension', () => {
      const spec: OpenAPIV2.Document = {
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/upload': {
            post: {
              operationId: 'uploadImage',
              consumes: ['multipart/form-data'],
              parameters: [
                {
                  name: 'image',
                  in: 'formData',
                  type: 'file',
                  contentMediaType: 'image/jpeg'
                } as any
              ],
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(spec);
      const app = adapter.adapt();
      
      const resource = app.resources[0];
      const operation = resource.operations[0];
      const imageField = operation.requestBody?.children?.find(c => c.key === 'image');
      
      expect(imageField?.fileMetadata?.fileType).toBe('image');
      expect(imageField?.fileMetadata?.allowedMimeTypes).toContain('image/jpeg');
    });
  });

  describe('equivalence with OpenAPI3Adapter', () => {
    it('should produce identical results for equivalent schemas', () => {
      const swagger2Spec: OpenAPIV2.Document = {
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/upload': {
            post: {
              operationId: 'uploadImage',
              consumes: ['multipart/form-data'],
              parameters: [
                {
                  name: 'image',
                  in: 'formData',
                  type: 'file',
                  'x-uigen-file-types': ['image/png', 'image/jpeg']
                } as any
              ],
              responses: { '200': { description: 'Success' } }
            }
          }
        }
      };

      const swagger2Adapter = new Swagger2Adapter(swagger2Spec);
      const swagger2App = swagger2Adapter.adapt();
      
      const swagger2Resource = swagger2App.resources[0];
      const swagger2Operation = swagger2Resource.operations[0];
      const swagger2ImageField = swagger2Operation.requestBody?.children?.find(c => c.key === 'image');
      
      expect(swagger2ImageField?.fileMetadata?.fileType).toBe('image');
      expect(swagger2ImageField?.fileMetadata?.allowedMimeTypes).toEqual(['image/png', 'image/jpeg']);
    });
  });
});
