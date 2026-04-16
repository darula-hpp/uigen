import { describe, it, expect } from 'vitest';
import { Swagger2Adapter } from '../swagger2.js';

/**
 * Unit tests for content type detection in Swagger2Adapter
 * Tests Requirement 16.5: Apply same content type detection rules as OpenAPI3 adapter
 */

describe('Swagger2Adapter - Content Type Detection', () => {
  describe('FormData File Parameter Detection (Requirement 16.5)', () => {
    it('should set requestContentType to multipart/form-data when formData contains file parameter', () => {
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
        }
      };

      const adapter = new Swagger2Adapter(swagger2Spec as any);
      const ir = adapter.adapt();

      const operation = ir.resources[0].operations[0];
      expect(operation.requestContentType).toBe('multipart/form-data');
    });

    it('should set requestContentType to multipart/form-data when formData contains mixed file and non-file parameters', () => {
      const swagger2Spec = {
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/upload': {
            post: {
              consumes: ['multipart/form-data'],
              parameters: [
                {
                  name: 'name',
                  in: 'formData',
                  type: 'string',
                  description: 'User name'
                },
                {
                  name: 'avatar',
                  in: 'formData',
                  type: 'file',
                  description: 'Avatar image'
                },
                {
                  name: 'email',
                  in: 'formData',
                  type: 'string',
                  description: 'User email'
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

      const operation = ir.resources[0].operations[0];
      expect(operation.requestContentType).toBe('multipart/form-data');
    });

    it('should use application/x-www-form-urlencoded when formData has no file parameters', () => {
      const swagger2Spec = {
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              consumes: ['application/x-www-form-urlencoded'],
              parameters: [
                {
                  name: 'name',
                  in: 'formData',
                  type: 'string',
                  description: 'User name'
                },
                {
                  name: 'email',
                  in: 'formData',
                  type: 'string',
                  description: 'User email'
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

      const operation = ir.resources[0].operations[0];
      expect(operation.requestContentType).toBe('application/x-www-form-urlencoded');
    });

    it('should set requestContentType to multipart/form-data for multiple file uploads', () => {
      const swagger2Spec = {
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/documents': {
            post: {
              consumes: ['multipart/form-data'],
              parameters: [
                {
                  name: 'document1',
                  in: 'formData',
                  type: 'file',
                  description: 'First document'
                },
                {
                  name: 'document2',
                  in: 'formData',
                  type: 'file',
                  description: 'Second document'
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

      const operation = ir.resources[0].operations[0];
      expect(operation.requestContentType).toBe('multipart/form-data');
    });
  });

  describe('Body Parameter with File Fields (Requirement 16.5)', () => {
    it('should detect file fields in body parameter schema and set multipart/form-data', () => {
      const swagger2Spec = {
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/upload': {
            post: {
              consumes: ['application/json'],
              parameters: [
                {
                  name: 'body',
                  in: 'body',
                  schema: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string'
                      },
                      avatar: {
                        type: 'string',
                        format: 'binary'
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

      const operation = ir.resources[0].operations[0];
      expect(operation.requestContentType).toBe('multipart/form-data');
    });

    it('should detect nested file fields in body parameter schema', () => {
      const swagger2Spec = {
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              consumes: ['application/json'],
              parameters: [
                {
                  name: 'body',
                  in: 'body',
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

      const operation = ir.resources[0].operations[0];
      expect(operation.requestContentType).toBe('multipart/form-data');
    });

    it('should detect file fields in array items', () => {
      const swagger2Spec = {
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/documents': {
            post: {
              consumes: ['application/json'],
              parameters: [
                {
                  name: 'body',
                  in: 'body',
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

      const operation = ir.resources[0].operations[0];
      expect(operation.requestContentType).toBe('multipart/form-data');
    });

    it('should use application/json when body has no file fields', () => {
      const swagger2Spec = {
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            post: {
              consumes: ['application/json'],
              parameters: [
                {
                  name: 'body',
                  in: 'body',
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

      const operation = ir.resources[0].operations[0];
      expect(operation.requestContentType).toBe('application/json');
    });
  });

  describe('Edge Cases', () => {
    it('should handle operations without parameters', () => {
      const swagger2Spec = {
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              responses: {
                '200': { description: 'OK' }
              }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(swagger2Spec as any);
      const ir = adapter.adapt();

      const operation = ir.resources[0].operations[0];
      expect(operation.requestContentType).toBeUndefined();
    });

    it('should handle operations with only query parameters', () => {
      const swagger2Spec = {
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              parameters: [
                {
                  name: 'limit',
                  in: 'query',
                  type: 'integer'
                },
                {
                  name: 'offset',
                  in: 'query',
                  type: 'integer'
                }
              ],
              responses: {
                '200': { description: 'OK' }
              }
            }
          }
        }
      };

      const adapter = new Swagger2Adapter(swagger2Spec as any);
      const ir = adapter.adapt();

      const operation = ir.resources[0].operations[0];
      expect(operation.requestContentType).toBeUndefined();
    });
  });
});
