import { describe, it, expect } from 'vitest';
import { OpenAPI3Adapter } from '../openapi3.js';
import type { OpenAPIV3 } from 'openapi-types';

/**
 * Unit Tests for Validation Rule Extraction
 * 
 * **Validates: Requirements 3.7, 34.1-34.9**
 * 
 * These tests verify that validation constraints from OpenAPI schemas
 * are correctly extracted and converted to ValidationRule objects in the IR.
 */

describe('Validation Rule Extraction', () => {
  describe('String Validation Constraints', () => {
    it('should extract minLength constraint', () => {
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
                        username: {
                          type: 'string',
                          minLength: 3
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

      const usernameField = result.resources[0].operations[0].requestBody?.children?.find(
        c => c.key === 'username'
      );

      expect(usernameField?.validations).toBeDefined();
      const minLengthRule = usernameField?.validations?.find(v => v.type === 'minLength');
      expect(minLengthRule).toBeDefined();
      expect(minLengthRule?.value).toBe(3);
      expect(minLengthRule?.message).toBeDefined();
    });

    it('should extract maxLength constraint', () => {
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
                        bio: {
                          type: 'string',
                          maxLength: 500
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

      const bioField = result.resources[0].operations[0].requestBody?.children?.find(
        c => c.key === 'bio'
      );

      expect(bioField?.validations).toBeDefined();
      const maxLengthRule = bioField?.validations?.find(v => v.type === 'maxLength');
      expect(maxLengthRule).toBeDefined();
      expect(maxLengthRule?.value).toBe(500);
      expect(maxLengthRule?.message).toBeDefined();
    });

    it('should extract pattern constraint', () => {
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
                        phone: {
                          type: 'string',
                          pattern: '^\\+?[1-9]\\d{1,14}$'
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

      const phoneField = result.resources[0].operations[0].requestBody?.children?.find(
        c => c.key === 'phone'
      );

      expect(phoneField?.validations).toBeDefined();
      const patternRule = phoneField?.validations?.find(v => v.type === 'pattern');
      expect(patternRule).toBeDefined();
      expect(patternRule?.value).toBe('^\\+?[1-9]\\d{1,14}$');
      expect(patternRule?.message).toBeDefined();
    });

    it('should extract both minLength and maxLength', () => {
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
                        password: {
                          type: 'string',
                          minLength: 8,
                          maxLength: 128
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

      const passwordField = result.resources[0].operations[0].requestBody?.children?.find(
        c => c.key === 'password'
      );

      expect(passwordField?.validations).toHaveLength(2);
      expect(passwordField?.validations?.find(v => v.type === 'minLength')).toBeDefined();
      expect(passwordField?.validations?.find(v => v.type === 'maxLength')).toBeDefined();
    });
  });

  describe('Number Validation Constraints', () => {
    it('should extract minimum constraint', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/products': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        price: {
                          type: 'number',
                          minimum: 0
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

      const priceField = result.resources[0].operations[0].requestBody?.children?.find(
        c => c.key === 'price'
      );

      expect(priceField?.validations).toBeDefined();
      const minimumRule = priceField?.validations?.find(v => v.type === 'minimum');
      expect(minimumRule).toBeDefined();
      expect(minimumRule?.value).toBe(0);
      expect(minimumRule?.message).toBeDefined();
    });

    it('should extract maximum constraint', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/products': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        quantity: {
                          type: 'integer',
                          maximum: 1000
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

      const quantityField = result.resources[0].operations[0].requestBody?.children?.find(
        c => c.key === 'quantity'
      );

      expect(quantityField?.validations).toBeDefined();
      const maximumRule = quantityField?.validations?.find(v => v.type === 'maximum');
      expect(maximumRule).toBeDefined();
      expect(maximumRule?.value).toBe(1000);
      expect(maximumRule?.message).toBeDefined();
    });

    it('should extract both minimum and maximum', () => {
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
                        age: {
                          type: 'integer',
                          minimum: 18,
                          maximum: 120
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

      const ageField = result.resources[0].operations[0].requestBody?.children?.find(
        c => c.key === 'age'
      );

      expect(ageField?.validations).toHaveLength(2);
      expect(ageField?.validations?.find(v => v.type === 'minimum')).toBeDefined();
      expect(ageField?.validations?.find(v => v.type === 'maximum')).toBeDefined();
    });
  });

  describe('Array Validation Constraints', () => {
    it('should extract minItems constraint', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/posts': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        tags: {
                          type: 'array',
                          items: { type: 'string' },
                          minItems: 1
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

      const tagsField = result.resources[0].operations[0].requestBody?.children?.find(
        c => c.key === 'tags'
      );

      expect(tagsField?.validations).toBeDefined();
      const minItemsRule = tagsField?.validations?.find(v => v.type === 'minItems');
      expect(minItemsRule).toBeDefined();
      expect(minItemsRule?.value).toBe(1);
      expect(minItemsRule?.message).toBeDefined();
    });

    it('should extract maxItems constraint', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/posts': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        categories: {
                          type: 'array',
                          items: { type: 'string' },
                          maxItems: 5
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

      const categoriesField = result.resources[0].operations[0].requestBody?.children?.find(
        c => c.key === 'categories'
      );

      expect(categoriesField?.validations).toBeDefined();
      const maxItemsRule = categoriesField?.validations?.find(v => v.type === 'maxItems');
      expect(maxItemsRule).toBeDefined();
      expect(maxItemsRule?.value).toBe(5);
      expect(maxItemsRule?.message).toBeDefined();
    });

    it('should extract both minItems and maxItems', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/surveys': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        options: {
                          type: 'array',
                          items: { type: 'string' },
                          minItems: 2,
                          maxItems: 10
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

      const optionsField = result.resources[0].operations[0].requestBody?.children?.find(
        c => c.key === 'options'
      );

      expect(optionsField?.validations).toHaveLength(2);
      expect(optionsField?.validations?.find(v => v.type === 'minItems')).toBeDefined();
      expect(optionsField?.validations?.find(v => v.type === 'maxItems')).toBeDefined();
    });
  });

  describe('Format Validation Constraints', () => {
    it('should extract email format constraint', () => {
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
                        email: {
                          type: 'string',
                          format: 'email'
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

      const emailField = result.resources[0].operations[0].requestBody?.children?.find(
        c => c.key === 'email'
      );

      expect(emailField?.validations).toBeDefined();
      const emailRule = emailField?.validations?.find(v => v.type === 'email');
      expect(emailRule).toBeDefined();
      expect(emailRule?.message).toBeDefined();
    });

    it('should extract uri format constraint', () => {
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
                        website: {
                          type: 'string',
                          format: 'uri'
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

      const websiteField = result.resources[0].operations[0].requestBody?.children?.find(
        c => c.key === 'website'
      );

      expect(websiteField?.validations).toBeDefined();
      const urlRule = websiteField?.validations?.find(v => v.type === 'url');
      expect(urlRule).toBeDefined();
      expect(urlRule?.message).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle schema with no validation constraints', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/items': {
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

      const nameField = result.resources[0].operations[0].requestBody?.children?.find(
        c => c.key === 'name'
      );

      expect(nameField?.validations).toEqual([]);
    });

    it('should handle multiple validation constraints on a single field', () => {
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
                        username: {
                          type: 'string',
                          minLength: 3,
                          maxLength: 20,
                          pattern: '^[a-zA-Z0-9_]+$'
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

      const usernameField = result.resources[0].operations[0].requestBody?.children?.find(
        c => c.key === 'username'
      );

      expect(usernameField?.validations).toHaveLength(3);
      expect(usernameField?.validations?.find(v => v.type === 'minLength')).toBeDefined();
      expect(usernameField?.validations?.find(v => v.type === 'maxLength')).toBeDefined();
      expect(usernameField?.validations?.find(v => v.type === 'pattern')).toBeDefined();
    });

    it('should handle minimum value of 0', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/products': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        discount: {
                          type: 'number',
                          minimum: 0
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

      const discountField = result.resources[0].operations[0].requestBody?.children?.find(
        c => c.key === 'discount'
      );

      const minimumRule = discountField?.validations?.find(v => v.type === 'minimum');
      expect(minimumRule).toBeDefined();
      expect(minimumRule?.value).toBe(0);
    });

    it('should handle nested object validation constraints', () => {
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
                        profile: {
                          type: 'object',
                          properties: {
                            bio: {
                              type: 'string',
                              maxLength: 500
                            },
                            age: {
                              type: 'integer',
                              minimum: 13,
                              maximum: 120
                            }
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

      const profileField = result.resources[0].operations[0].requestBody?.children?.find(
        c => c.key === 'profile'
      );

      const bioField = profileField?.children?.find(c => c.key === 'bio');
      expect(bioField?.validations?.find(v => v.type === 'maxLength')).toBeDefined();

      const ageField = profileField?.children?.find(c => c.key === 'age');
      expect(ageField?.validations?.find(v => v.type === 'minimum')).toBeDefined();
      expect(ageField?.validations?.find(v => v.type === 'maximum')).toBeDefined();
    });

    it('should handle validation constraints in response schemas', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/users/{id}': {
            get: {
              parameters: [
                { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
              ],
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          email: {
                            type: 'string',
                            format: 'email'
                          },
                          age: {
                            type: 'integer',
                            minimum: 0
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

      const responseSchema = result.resources[0].operations[0].responses['200'].schema;
      
      const emailField = responseSchema?.children?.find(c => c.key === 'email');
      expect(emailField?.validations?.find(v => v.type === 'email')).toBeDefined();

      const ageField = responseSchema?.children?.find(c => c.key === 'age');
      expect(ageField?.validations?.find(v => v.type === 'minimum')).toBeDefined();
    });
  });
});
