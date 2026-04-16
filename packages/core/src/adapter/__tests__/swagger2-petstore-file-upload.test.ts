import { describe, it, expect } from 'vitest';
import { Swagger2Adapter } from '../swagger2.js';
import type { OpenAPIV2 } from 'openapi-types';

describe('Swagger2Adapter - Petstore File Upload', () => {
  it('should detect file upload in /pet/{petId}/uploadImage endpoint', () => {
    const swagger2Spec: OpenAPIV2.Document = {
      swagger: '2.0',
      info: {
        title: 'Petstore',
        version: '1.0.0'
      },
      paths: {
        '/pet/{petId}/uploadImage': {
          post: {
            operationId: 'uploadFile',
            summary: 'uploads an image',
            consumes: ['multipart/form-data'],
            parameters: [
              {
                name: 'petId',
                in: 'path',
                required: true,
                type: 'integer',
                format: 'int64'
              },
              {
                name: 'additionalMetadata',
                in: 'formData',
                description: 'Additional data to pass to server',
                required: false,
                type: 'string'
              },
              {
                name: 'file',
                in: 'formData',
                description: 'file to upload',
                required: false,
                type: 'file'
              }
            ],
            responses: {
              '200': {
                description: 'successful operation'
              }
            }
          }
        }
      }
    };

    const adapter = new Swagger2Adapter(swagger2Spec as any);
    const ir = adapter.adapt();

    // Find the uploadImage operation
    const uploadResource = ir.resources.find(r => r.name === 'UploadImage');
    expect(uploadResource).toBeDefined();

    const uploadOp = uploadResource?.operations.find(op => op.method === 'POST');
    expect(uploadOp).toBeDefined();
    expect(uploadOp?.requestContentType).toBe('multipart/form-data');

    // Check that the file field is properly detected in requestBody.children
    const fileField = uploadOp?.requestBody?.children?.find(child => child.key === 'file');
    expect(fileField).toBeDefined();
    expect(fileField?.type).toBe('file');
    expect(fileField?.label).toBe('File');
    expect(fileField?.fileMetadata).toBeDefined();
    expect(fileField?.fileMetadata?.allowedMimeTypes).toEqual(['*/*']);
    expect(fileField?.fileMetadata?.multiple).toBe(false);

    // Check that additionalMetadata is also present
    const metadataField = uploadOp?.requestBody?.children?.find(child => child.key === 'additionalMetadata');
    expect(metadataField).toBeDefined();
    expect(metadataField?.type).toBe('string');
  });

  it('should convert Swagger2 file type to OpenAPI3 binary format', () => {
    const swagger2Spec: OpenAPIV2.Document = {
      swagger: '2.0',
      info: {
        title: 'Test',
        version: '1.0.0'
      },
      paths: {
        '/upload': {
          post: {
            operationId: 'upload',
            consumes: ['multipart/form-data'],
            parameters: [
              {
                name: 'document',
                in: 'formData',
                type: 'file',
                required: true
              }
            ],
            responses: {
              '200': {
                description: 'success'
              }
            }
          }
        }
      }
    };

    const adapter = new Swagger2Adapter(swagger2Spec as any);
    const ir = adapter.adapt();

    const uploadOp = ir.resources[0]?.operations[0];
    const documentField = uploadOp?.requestBody?.children?.find(child => child.key === 'document');

    // The file type should be detected in the IR
    expect(documentField?.type).toBe('file');
    expect(documentField?.fileMetadata).toBeDefined();
    expect(documentField?.fileMetadata?.allowedMimeTypes).toEqual(['*/*']);
    expect(documentField?.fileMetadata?.multiple).toBe(false);
  });
});
