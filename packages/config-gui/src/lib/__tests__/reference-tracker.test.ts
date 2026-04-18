import { describe, it, expect } from 'vitest';
import { findSchemaReferences, type SpecStructure } from '../reference-tracker.js';
import type { ConfigFile } from '@uigen-dev/core';

/**
 * Unit tests for reference-tracker utility
 * 
 * Tests the logic for finding all references to a schema in an OpenAPI spec
 */

describe('reference-tracker', () => {
  const mockSpec: SpecStructure = {
    paths: {
      '/users': {
        post: {
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/User'
                }
              }
            }
          },
          responses: {
            '201': {
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/User'
                  }
                }
              }
            }
          }
        },
        get: {
          responses: {
            '200': {
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/User'
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/users/{id}': {
        get: {
          responses: {
            '200': {
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/User'
                  }
                }
              }
            },
            '404': {
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            }
          }
        }
      }
    },
    components: {
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' }
          }
        },
        Profile: {
          type: 'object',
          properties: {
            user: {
              $ref: '#/components/schemas/User'
            },
            bio: { type: 'string' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        }
      }
    }
  };

  describe('findSchemaReferences', () => {
    it('should find request body references', () => {
      const references = findSchemaReferences(
        'components.schemas.User',
        mockSpec,
        null
      );

      const requestBodyRefs = references.filter(ref => ref.type === 'requestBody');
      expect(requestBodyRefs).toHaveLength(1);
      expect(requestBodyRefs[0].path).toBe('paths./users.post.requestBody');
      expect(requestBodyRefs[0].displayName).toBe('POST /users');
      expect(requestBodyRefs[0].method).toBe('POST');
    });

    it('should find response references', () => {
      const references = findSchemaReferences(
        'components.schemas.User',
        mockSpec,
        null
      );

      const responseRefs = references.filter(ref => ref.type === 'response');
      expect(responseRefs).toHaveLength(3);

      // Check specific responses
      const postResponse = responseRefs.find(ref => ref.path.includes('post'));
      expect(postResponse).toBeDefined();
      expect(postResponse?.statusCode).toBe('201');

      const getResponse = responseRefs.find(ref => ref.path === 'paths./users.get.responses.200');
      expect(getResponse).toBeDefined();
      expect(getResponse?.statusCode).toBe('200');
    });

    it('should find property references', () => {
      const references = findSchemaReferences(
        'components.schemas.User',
        mockSpec,
        null
      );

      const propertyRefs = references.filter(ref => ref.type === 'property');
      expect(propertyRefs).toHaveLength(1);
      expect(propertyRefs[0].path).toBe('components.schemas.Profile.properties.user');
      expect(propertyRefs[0].displayName).toBe('Profile.user');
    });

    it('should find references in array items', () => {
      const references = findSchemaReferences(
        'components.schemas.User',
        mockSpec,
        null
      );

      // The GET /users endpoint returns an array of Users
      const arrayResponse = references.find(
        ref => ref.path === 'paths./users.get.responses.200'
      );
      expect(arrayResponse).toBeDefined();
    });

    it('should return empty array for schema with no references', () => {
      const references = findSchemaReferences(
        'components.schemas.Error',
        mockSpec,
        null
      );

      // Error schema is only used in 404 response, not referenced elsewhere
      const errorRefs = references.filter(ref => ref.type !== 'response' || !ref.path.includes('404'));
      expect(errorRefs).toHaveLength(0);
    });

    it('should return empty array for non-existent schema', () => {
      const references = findSchemaReferences(
        'components.schemas.NonExistent',
        mockSpec,
        null
      );

      expect(references).toHaveLength(0);
    });

    it('should return empty array for invalid schema path', () => {
      const references = findSchemaReferences(
        'invalid.path',
        mockSpec,
        null
      );

      expect(references).toHaveLength(0);
    });

    it('should return empty array when spec has no paths', () => {
      const emptySpec: SpecStructure = {
        components: {
          schemas: {
            User: {
              type: 'object',
              properties: {}
            }
          }
        }
      };

      const references = findSchemaReferences(
        'components.schemas.User',
        emptySpec,
        null
      );

      expect(references).toHaveLength(0);
    });
  });

  describe('Ignore state detection', () => {
    it('should mark references as ignored when they have x-uigen-ignore annotation', () => {
      const config: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'paths./users.post.requestBody': {
            'x-uigen-ignore': true
          }
        }
      };

      const references = findSchemaReferences(
        'components.schemas.User',
        mockSpec,
        config
      );

      const requestBodyRef = references.find(ref => ref.type === 'requestBody');
      expect(requestBodyRef?.isIgnored).toBe(true);
    });

    it('should mark references as ignored when parent path is ignored', () => {
      const config: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'paths./users.post': {
            'x-uigen-ignore': true
          }
        }
      };

      const references = findSchemaReferences(
        'components.schemas.User',
        mockSpec,
        config
      );

      const requestBodyRef = references.find(ref => ref.type === 'requestBody');
      expect(requestBodyRef?.isIgnored).toBe(true);
    });

    it('should not mark references as ignored when they are active', () => {
      const config: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {}
      };

      const references = findSchemaReferences(
        'components.schemas.User',
        mockSpec,
        config
      );

      references.forEach(ref => {
        expect(ref.isIgnored).toBe(false);
      });
    });

    it('should handle null config', () => {
      const references = findSchemaReferences(
        'components.schemas.User',
        mockSpec,
        null
      );

      references.forEach(ref => {
        expect(ref.isIgnored).toBe(false);
      });
    });
  });

  describe('HTTP method detection', () => {
    it('should correctly identify HTTP methods', () => {
      const references = findSchemaReferences(
        'components.schemas.User',
        mockSpec,
        null
      );

      const postRef = references.find(ref => ref.path.includes('post'));
      expect(postRef?.method).toBe('POST');

      const getRef = references.find(ref => ref.path.includes('.get.'));
      expect(getRef?.method).toBe('GET');
    });

    it('should handle all HTTP methods', () => {
      const specWithAllMethods: SpecStructure = {
        paths: {
          '/resource': {
            get: {
              responses: {
                '200': {
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/Resource' }
                    }
                  }
                }
              }
            },
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Resource' }
                  }
                }
              }
            },
            put: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Resource' }
                  }
                }
              }
            },
            patch: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Resource' }
                  }
                }
              }
            },
            delete: {
              responses: {
                '204': {
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/Resource' }
                    }
                  }
                }
              }
            }
          }
        },
        components: {
          schemas: {
            Resource: {
              type: 'object',
              properties: {}
            }
          }
        }
      };

      const references = findSchemaReferences(
        'components.schemas.Resource',
        specWithAllMethods,
        null
      );

      const methods = references.map(ref => ref.method).filter(Boolean);
      expect(methods).toContain('GET');
      expect(methods).toContain('POST');
      expect(methods).toContain('PUT');
      expect(methods).toContain('PATCH');
      expect(methods).toContain('DELETE');
    });
  });

  describe('Nested schema references', () => {
    it('should find references in nested properties', () => {
      const specWithNested: SpecStructure = {
        paths: {},
        components: {
          schemas: {
            User: {
              type: 'object',
              properties: {}
            },
            Company: {
              type: 'object',
              properties: {
                owner: {
                  $ref: '#/components/schemas/User'
                },
                employees: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/User'
                  }
                }
              }
            }
          }
        }
      };

      const references = findSchemaReferences(
        'components.schemas.User',
        specWithNested,
        null
      );

      const propertyRefs = references.filter(ref => ref.type === 'property');
      expect(propertyRefs).toHaveLength(2);
      expect(propertyRefs.some(ref => ref.path.includes('owner'))).toBe(true);
      expect(propertyRefs.some(ref => ref.path.includes('employees'))).toBe(true);
    });

    it('should find references in composition keywords (allOf, oneOf, anyOf)', () => {
      const specWithComposition: SpecStructure = {
        paths: {
          '/items': {
            get: {
              responses: {
                '200': {
                  content: {
                    'application/json': {
                      schema: {
                        allOf: [
                          { $ref: '#/components/schemas/Base' },
                          { type: 'object', properties: { extra: { type: 'string' } } }
                        ]
                      }
                    }
                  }
                }
              }
            }
          }
        },
        components: {
          schemas: {
            Base: {
              type: 'object',
              properties: {}
            }
          }
        }
      };

      const references = findSchemaReferences(
        'components.schemas.Base',
        specWithComposition,
        null
      );

      expect(references).toHaveLength(1);
      expect(references[0].type).toBe('response');
    });
  });
});
