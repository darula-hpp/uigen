/**
 * Unit tests for Spec Validator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Validator } from '../../validator';
import type { OpenAPIV3 } from 'openapi-types';
import type { Swagger2Document } from '../../types';

describe('Validator', () => {
  let validator: Validator;

  beforeEach(() => {
    validator = new Validator();
  });

  describe('Valid OpenAPI 3.x Specs', () => {
    it('should validate a minimal valid OpenAPI 3.x spec', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
      };

      const result = validator.validate(spec);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a complete OpenAPI 3.x spec', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
          description: 'A test API',
        },
        paths: {
          '/users': {
            get: {
              summary: 'Get users',
              responses: {
                '200': {
                  description: 'Success',
                },
              },
            },
          },
        },
        components: {
          schemas: {
            User: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
              },
            },
          },
        },
      };

      const result = validator.validate(spec);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Valid Swagger 2.0 Specs', () => {
    it('should validate a minimal valid Swagger 2.0 spec', () => {
      const spec: Swagger2Document = {
        swagger: '2.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
      };

      const result = validator.validate(spec);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a complete Swagger 2.0 spec', () => {
      const spec: Swagger2Document = {
        swagger: '2.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {
          '/users': {
            get: {
              summary: 'Get users',
              responses: {
                '200': {
                  description: 'Success',
                },
              },
            },
          },
        },
        definitions: {
          User: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
            },
          },
        },
      };

      const result = validator.validate(spec);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Missing Required Fields', () => {
    it('should detect missing openapi/swagger version', () => {
      const spec = {
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
      } as unknown as OpenAPIV3.Document;

      const result = validator.validate(spec);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: '',
        message: 'Missing required field: openapi or swagger version',
        severity: 'error',
      });
    });

    it('should detect missing info', () => {
      const spec = {
        openapi: '3.0.0',
        paths: {},
      } as unknown as OpenAPIV3.Document;

      const result = validator.validate(spec);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: 'info',
        message: 'Missing required field: info',
        severity: 'error',
      });
    });

    it('should detect missing info.title', () => {
      const spec = {
        openapi: '3.0.0',
        info: {
          version: '1.0.0',
        },
        paths: {},
      } as unknown as OpenAPIV3.Document;

      const result = validator.validate(spec);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: 'info.title',
        message: 'Missing required field: info.title',
        severity: 'error',
      });
    });

    it('should detect missing info.version', () => {
      const spec = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
        },
        paths: {},
      } as unknown as OpenAPIV3.Document;

      const result = validator.validate(spec);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: 'info.version',
        message: 'Missing required field: info.version',
        severity: 'error',
      });
    });

    it('should detect missing paths', () => {
      const spec = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
      } as unknown as OpenAPIV3.Document;

      const result = validator.validate(spec);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: 'paths',
        message: 'Missing required field: paths',
        severity: 'error',
      });
    });
  });

  describe('$ref Integrity', () => {
    it('should validate valid $ref references', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {
          '/users': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/User',
                    },
                  },
                },
              },
              responses: {},
            },
          },
        },
        components: {
          schemas: {
            User: {
              type: 'object',
              properties: {
                id: { type: 'string' },
              },
            },
          },
        },
      };

      const result = validator.validate(spec);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect broken $ref references', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {
          '/users': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/NonExistent',
                    },
                  },
                },
              },
              responses: {},
            },
          },
        },
        components: {
          schemas: {},
        },
      };

      const result = validator.validate(spec);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('Broken $ref reference');
      expect(result.errors[0].message).toContain('#/components/schemas/NonExistent');
    });

    it('should detect multiple broken $ref references', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {
          '/users': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/User',
                    },
                  },
                },
              },
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        $ref: '#/components/schemas/Response',
                      },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {},
        },
      };

      const result = validator.validate(spec);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(2);
    });

    it('should validate nested $ref references', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {},
        components: {
          schemas: {
            Address: {
              type: 'object',
              properties: {
                street: { type: 'string' },
              },
            },
            User: {
              type: 'object',
              properties: {
                address: {
                  $ref: '#/components/schemas/Address',
                },
              },
            },
          },
        },
      };

      const result = validator.validate(spec);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Validation Error Paths', () => {
    it('should include paths in validation errors', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {
          '/users': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/User',
                    },
                  },
                },
              },
              responses: {},
            },
          },
        },
        components: {
          schemas: {},
        },
      };

      const result = validator.validate(spec);

      expect(result.valid).toBe(false);
      expect(result.errors[0].path).toBeTruthy();
    });
  });
});
