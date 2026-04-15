import { describe, it, expect } from 'vitest';
import type { OpenAPIV3 } from 'openapi-types';
import { OpenAPI3Adapter } from '../openapi3.js';

describe('Task 1: extractLoginAnnotation Helper Method', () => {
  describe('extractLoginAnnotation method behavior (via reflection)', () => {
    it('should exist as a private method on OpenAPI3Adapter', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      
      // Verify the method exists
      expect(typeof (adapter as any).extractLoginAnnotation).toBe('function');
    });

    it('should return true for x-uigen-login: true', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const operation: OpenAPIV3.OperationObject = {
        'x-uigen-login': true,
        responses: {}
      } as any;

      const result = (adapter as any).extractLoginAnnotation(operation);
      expect(result).toBe(true);
    });

    it('should return false for x-uigen-login: false', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const operation: OpenAPIV3.OperationObject = {
        'x-uigen-login': false,
        responses: {}
      } as any;

      const result = (adapter as any).extractLoginAnnotation(operation);
      expect(result).toBe(false);
    });

    it('should return undefined for string value', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const operation: OpenAPIV3.OperationObject = {
        'x-uigen-login': 'yes',
        responses: {}
      } as any;

      const result = (adapter as any).extractLoginAnnotation(operation);
      expect(result).toBeUndefined();
    });

    it('should return undefined for number value', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const operation: OpenAPIV3.OperationObject = {
        'x-uigen-login': 1,
        responses: {}
      } as any;

      const result = (adapter as any).extractLoginAnnotation(operation);
      expect(result).toBeUndefined();
    });

    it('should return undefined for object value', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const operation: OpenAPIV3.OperationObject = {
        'x-uigen-login': { enabled: true },
        responses: {}
      } as any;

      const result = (adapter as any).extractLoginAnnotation(operation);
      expect(result).toBeUndefined();
    });

    it('should return undefined for array value', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const operation: OpenAPIV3.OperationObject = {
        'x-uigen-login': [true],
        responses: {}
      } as any;

      const result = (adapter as any).extractLoginAnnotation(operation);
      expect(result).toBeUndefined();
    });

    it('should return undefined for null value', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const operation: OpenAPIV3.OperationObject = {
        'x-uigen-login': null,
        responses: {}
      } as any;

      const result = (adapter as any).extractLoginAnnotation(operation);
      expect(result).toBeUndefined();
    });

    it('should return undefined when annotation is absent', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const operation: OpenAPIV3.OperationObject = {
        responses: {}
      };

      const result = (adapter as any).extractLoginAnnotation(operation);
      expect(result).toBeUndefined();
    });
  });
});

describe('Task 2.1: buildLoginEndpoint Private Method', () => {
  describe('buildLoginEndpoint method behavior (via reflection)', () => {
    it('should exist as a private method on OpenAPI3Adapter', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      
      // Verify the method exists
      expect(typeof (adapter as any).buildLoginEndpoint).toBe('function');
    });

    it('should extract request body schema from operation', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const operation: OpenAPIV3.OperationObject = {
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  username: { type: 'string' },
                  password: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      };

      const result = (adapter as any).buildLoginEndpoint('/api/login', operation);
      
      expect(result).toBeDefined();
      expect(result.path).toBe('/api/login');
      expect(result.method).toBe('POST');
      expect(result.requestBodySchema).toBeDefined();
      expect(result.requestBodySchema.type).toBe('object');
      expect(result.tokenPath).toBe('token');
    });

    it('should detect token path from response', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const operation: OpenAPIV3.OperationObject = {
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  username: { type: 'string' },
                  password: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    accessToken: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      };

      const result = (adapter as any).buildLoginEndpoint('/api/login', operation);
      
      expect(result.tokenPath).toBe('accessToken');
    });

    it('should extract summary as description', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const operation: OpenAPIV3.OperationObject = {
        summary: 'User login endpoint',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  username: { type: 'string' },
                  password: { type: 'string' }
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
      };

      const result = (adapter as any).buildLoginEndpoint('/api/login', operation);
      
      expect(result.description).toBe('User login endpoint');
    });

    it('should extract description when summary is absent', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const operation: OpenAPIV3.OperationObject = {
        description: 'Authenticate user with credentials',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  username: { type: 'string' },
                  password: { type: 'string' }
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
      };

      const result = (adapter as any).buildLoginEndpoint('/api/login', operation);
      
      expect(result.description).toBe('Authenticate user with credentials');
    });

    it('should handle operation without request body', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const operation: OpenAPIV3.OperationObject = {
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      };

      const result = (adapter as any).buildLoginEndpoint('/api/login', operation);
      
      expect(result).toBeDefined();
      expect(result.path).toBe('/api/login');
      expect(result.method).toBe('POST');
      expect(result.tokenPath).toBe('token');
    });

    it('should default token path to "token" when not found in response', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {}
      };

      const adapter = new OpenAPI3Adapter(spec);
      const operation: OpenAPIV3.OperationObject = {
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  username: { type: 'string' },
                  password: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' }
                  }
                }
              }
            }
          }
        }
      };

      const result = (adapter as any).buildLoginEndpoint('/api/login', operation);
      
      expect(result.tokenPath).toBe('token');
    });
  });

  describe('Task 2.2: buildLoginEndpoint Edge Cases', () => {
    describe('Token path detection with various response schemas (Req 5.1, 5.2, 5.3, 5.4)', () => {
      it('should detect access_token field', () => {
        const spec: OpenAPIV3.Document = {
          openapi: '3.0.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {}
        };

        const adapter = new OpenAPI3Adapter(spec);
        const operation: OpenAPIV3.OperationObject = {
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      access_token: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        };

        const result = (adapter as any).buildLoginEndpoint('/api/login', operation);
        expect(result.tokenPath).toBe('access_token');
      });

      it('should detect bearerToken field', () => {
        const spec: OpenAPIV3.Document = {
          openapi: '3.0.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {}
        };

        const adapter = new OpenAPI3Adapter(spec);
        const operation: OpenAPIV3.OperationObject = {
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      bearerToken: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        };

        const result = (adapter as any).buildLoginEndpoint('/api/login', operation);
        expect(result.tokenPath).toBe('bearerToken');
      });

      it('should detect nested token path (data.token)', () => {
        const spec: OpenAPIV3.Document = {
          openapi: '3.0.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {}
        };

        const adapter = new OpenAPI3Adapter(spec);
        const operation: OpenAPIV3.OperationObject = {
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'object',
                        properties: {
                          token: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        };

        const result = (adapter as any).buildLoginEndpoint('/api/login', operation);
        expect(result.tokenPath).toBe('data.token');
      });

      it('should detect nested token path (auth.accessToken)', () => {
        const spec: OpenAPIV3.Document = {
          openapi: '3.0.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {}
        };

        const adapter = new OpenAPI3Adapter(spec);
        const operation: OpenAPIV3.OperationObject = {
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      auth: {
                        type: 'object',
                        properties: {
                          accessToken: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        };

        const result = (adapter as any).buildLoginEndpoint('/api/login', operation);
        expect(result.tokenPath).toBe('auth.accessToken');
      });

      it('should detect token from 201 response', () => {
        const spec: OpenAPIV3.Document = {
          openapi: '3.0.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {}
        };

        const adapter = new OpenAPI3Adapter(spec);
        const operation: OpenAPIV3.OperationObject = {
          responses: {
            '201': {
              description: 'Created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      token: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        };

        const result = (adapter as any).buildLoginEndpoint('/api/login', operation);
        expect(result.tokenPath).toBe('token');
      });

      it('should default to "token" when response has no content', () => {
        const spec: OpenAPIV3.Document = {
          openapi: '3.0.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {}
        };

        const adapter = new OpenAPI3Adapter(spec);
        const operation: OpenAPIV3.OperationObject = {
          responses: {
            '200': {
              description: 'Success'
            }
          }
        };

        const result = (adapter as any).buildLoginEndpoint('/api/login', operation);
        expect(result.tokenPath).toBe('token');
      });

      it('should default to "token" when response has no schema', () => {
        const spec: OpenAPIV3.Document = {
          openapi: '3.0.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {}
        };

        const adapter = new OpenAPI3Adapter(spec);
        const operation: OpenAPIV3.OperationObject = {
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/json': {}
              }
            }
          }
        };

        const result = (adapter as any).buildLoginEndpoint('/api/login', operation);
        expect(result.tokenPath).toBe('token');
      });

      it('should prefer 200 response over 201 when both exist', () => {
        const spec: OpenAPIV3.Document = {
          openapi: '3.0.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {}
        };

        const adapter = new OpenAPI3Adapter(spec);
        const operation: OpenAPIV3.OperationObject = {
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      accessToken: { type: 'string' }
                    }
                  }
                }
              }
            },
            '201': {
              description: 'Created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      token: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        };

        const result = (adapter as any).buildLoginEndpoint('/api/login', operation);
        expect(result.tokenPath).toBe('accessToken');
      });
    });

    describe('Metadata extraction edge cases (Req 6.1, 6.2, 6.3, 6.4)', () => {
      it('should prefer summary over description when both present', () => {
        const spec: OpenAPIV3.Document = {
          openapi: '3.0.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {}
        };

        const adapter = new OpenAPI3Adapter(spec);
        const operation: OpenAPIV3.OperationObject = {
          summary: 'Login endpoint',
          description: 'This is a detailed description of the login endpoint',
          responses: {
            '200': {
              description: 'Success'
            }
          }
        };

        const result = (adapter as any).buildLoginEndpoint('/api/auth/login', operation);
        expect(result.description).toBe('Login endpoint');
      });

      it('should have undefined description when neither summary nor description present', () => {
        const spec: OpenAPIV3.Document = {
          openapi: '3.0.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {}
        };

        const adapter = new OpenAPI3Adapter(spec);
        const operation: OpenAPIV3.OperationObject = {
          responses: {
            '200': {
              description: 'Success'
            }
          }
        };

        const result = (adapter as any).buildLoginEndpoint('/api/login', operation);
        expect(result.description).toBeUndefined();
      });

      it('should always set method to POST', () => {
        const spec: OpenAPIV3.Document = {
          openapi: '3.0.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {}
        };

        const adapter = new OpenAPI3Adapter(spec);
        const operation: OpenAPIV3.OperationObject = {
          responses: {
            '200': {
              description: 'Success'
            }
          }
        };

        const result = (adapter as any).buildLoginEndpoint('/any/path', operation);
        expect(result.method).toBe('POST');
      });

      it('should preserve the exact path provided', () => {
        const spec: OpenAPIV3.Document = {
          openapi: '3.0.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {}
        };

        const adapter = new OpenAPI3Adapter(spec);
        const operation: OpenAPIV3.OperationObject = {
          responses: {
            '200': {
              description: 'Success'
            }
          }
        };

        const testPaths = [
          '/api/v1/auth/login',
          '/login',
          '/auth/signin',
          '/api/authenticate'
        ];

        testPaths.forEach(path => {
          const result = (adapter as any).buildLoginEndpoint(path, operation);
          expect(result.path).toBe(path);
        });
      });
    });

    describe('Request body schema extraction edge cases (Req 4.1, 4.2)', () => {
      it('should extract schema when requestBody has multiple content types', () => {
        const spec: OpenAPIV3.Document = {
          openapi: '3.0.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {}
        };

        const adapter = new OpenAPI3Adapter(spec);
        const operation: OpenAPIV3.OperationObject = {
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    username: { type: 'string' },
                    password: { type: 'string' }
                  }
                }
              },
              'application/x-www-form-urlencoded': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { type: 'string' },
                    pass: { type: 'string' }
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
        };

        const result = (adapter as any).buildLoginEndpoint('/api/login', operation);
        expect(result.requestBodySchema).toBeDefined();
        expect(result.requestBodySchema.type).toBe('object');
      });

      it('should handle requestBody with empty content', () => {
        const spec: OpenAPIV3.Document = {
          openapi: '3.0.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {}
        };

        const adapter = new OpenAPI3Adapter(spec);
        const operation: OpenAPIV3.OperationObject = {
          requestBody: {
            content: {}
          },
          responses: {
            '200': {
              description: 'Success'
            }
          }
        };

        const result = (adapter as any).buildLoginEndpoint('/api/login', operation);
        expect(result).toBeDefined();
        expect(result.path).toBe('/api/login');
      });

      it('should handle requestBody with content but no schema', () => {
        const spec: OpenAPIV3.Document = {
          openapi: '3.0.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {}
        };

        const adapter = new OpenAPI3Adapter(spec);
        const operation: OpenAPIV3.OperationObject = {
          requestBody: {
            content: {
              'application/json': {}
            }
          },
          responses: {
            '200': {
              description: 'Success'
            }
          }
        };

        const result = (adapter as any).buildLoginEndpoint('/api/login', operation);
        expect(result).toBeDefined();
        expect(result.path).toBe('/api/login');
      });

      it('should extract complex nested request body schema', () => {
        const spec: OpenAPIV3.Document = {
          openapi: '3.0.0',
          info: { title: 'Test', version: '1.0.0' },
          paths: {}
        };

        const adapter = new OpenAPI3Adapter(spec);
        const operation: OpenAPIV3.OperationObject = {
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    credentials: {
                      type: 'object',
                      properties: {
                        username: { type: 'string' },
                        password: { type: 'string' }
                      },
                      required: ['username', 'password']
                    },
                    rememberMe: { type: 'boolean' }
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
        };

        const result = (adapter as any).buildLoginEndpoint('/api/login', operation);
        expect(result.requestBodySchema).toBeDefined();
        expect(result.requestBodySchema.type).toBe('object');
      });
    });
  });
});

describe('Task 3.2: Annotation Extraction in detectLoginEndpoints', () => {
  describe('Boolean value extraction (Req 1.1, 1.2)', () => {
    it('should extract endpoint with x-uigen-login: true', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/api/authenticate': {
            post: {
              'x-uigen-login': true,
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        username: { type: 'string' },
                        password: { type: 'string' }
                      }
                    }
                  }
                }
              },
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          token: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            } as any
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();

      expect(app.auth.loginEndpoints).toHaveLength(1);
      expect(app.auth.loginEndpoints![0].path).toBe('/api/authenticate');
    });

    it('should not extract endpoint with x-uigen-login: false even if it matches auto-detection', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/auth/login': {
            post: {
              'x-uigen-login': false,
              summary: 'User login',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        username: { type: 'string' },
                        password: { type: 'string' }
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
            } as any
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();

      expect(app.auth.loginEndpoints).toHaveLength(0);
    });
  });

  describe('Non-boolean value rejection (Req 1.3)', () => {
    it('should reject number value and fall back to auto-detection', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/auth/login': {
            post: {
              'x-uigen-login': 1,
              summary: 'User login',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        username: { type: 'string' },
                        password: { type: 'string' }
                      }
                    }
                  }
                }
              },
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          token: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            } as any
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();

      // Should be auto-detected despite invalid annotation
      expect(app.auth.loginEndpoints).toHaveLength(1);
      expect(app.auth.loginEndpoints![0].path).toBe('/auth/login');
    });

    it('should reject string value and fall back to auto-detection', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/auth/login': {
            post: {
              'x-uigen-login': 'yes',
              summary: 'User login',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        username: { type: 'string' },
                        password: { type: 'string' }
                      }
                    }
                  }
                }
              },
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          token: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            } as any
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();

      // Should be auto-detected despite invalid annotation
      expect(app.auth.loginEndpoints).toHaveLength(1);
      expect(app.auth.loginEndpoints![0].path).toBe('/auth/login');
    });

    it('should reject object value and fall back to auto-detection', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/auth/login': {
            post: {
              'x-uigen-login': { enabled: true },
              summary: 'User login',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        username: { type: 'string' },
                        password: { type: 'string' }
                      }
                    }
                  }
                }
              },
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          token: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            } as any
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();

      // Should be auto-detected despite invalid annotation
      expect(app.auth.loginEndpoints).toHaveLength(1);
      expect(app.auth.loginEndpoints![0].path).toBe('/auth/login');
    });

    it('should reject array value and fall back to auto-detection', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/auth/login': {
            post: {
              'x-uigen-login': [true],
              summary: 'User login',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        username: { type: 'string' },
                        password: { type: 'string' }
                      }
                    }
                  }
                }
              },
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          token: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            } as any
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();

      // Should be auto-detected despite invalid annotation
      expect(app.auth.loginEndpoints).toHaveLength(1);
      expect(app.auth.loginEndpoints![0].path).toBe('/auth/login');
    });

    it('should reject null value and fall back to auto-detection', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/auth/login': {
            post: {
              'x-uigen-login': null,
              summary: 'User login',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        username: { type: 'string' },
                        password: { type: 'string' }
                      }
                    }
                  }
                }
              },
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          token: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            } as any
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();

      // Should be auto-detected despite invalid annotation
      expect(app.auth.loginEndpoints).toHaveLength(1);
      expect(app.auth.loginEndpoints![0].path).toBe('/auth/login');
    });
  });

  describe('Multiple annotated endpoints extraction (Req 1.5)', () => {
    it('should extract all endpoints with x-uigen-login: true', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/auth/login/username': {
            post: {
              'x-uigen-login': true,
              summary: 'Login with username',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        username: { type: 'string' },
                        password: { type: 'string' }
                      }
                    }
                  }
                }
              },
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          token: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            } as any
          },
          '/auth/login/email': {
            post: {
              'x-uigen-login': true,
              summary: 'Login with email',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        email: { type: 'string' },
                        password: { type: 'string' }
                      }
                    }
                  }
                }
              },
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          token: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            } as any
          },
          '/auth/login/phone': {
            post: {
              'x-uigen-login': true,
              summary: 'Login with phone',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        phone: { type: 'string' },
                        otp: { type: 'string' }
                      }
                    }
                  }
                }
              },
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          token: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            } as any
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();

      expect(app.auth.loginEndpoints).toHaveLength(3);
      expect(app.auth.loginEndpoints![0].path).toBe('/auth/login/username');
      expect(app.auth.loginEndpoints![1].path).toBe('/auth/login/email');
      expect(app.auth.loginEndpoints![2].path).toBe('/auth/login/phone');
    });

    it('should extract 5 annotated endpoints', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/auth/method1': {
            post: {
              'x-uigen-login': true,
              responses: { '200': { description: 'Success' } }
            } as any
          },
          '/auth/method2': {
            post: {
              'x-uigen-login': true,
              responses: { '200': { description: 'Success' } }
            } as any
          },
          '/auth/method3': {
            post: {
              'x-uigen-login': true,
              responses: { '200': { description: 'Success' } }
            } as any
          },
          '/auth/method4': {
            post: {
              'x-uigen-login': true,
              responses: { '200': { description: 'Success' } }
            } as any
          },
          '/auth/method5': {
            post: {
              'x-uigen-login': true,
              responses: { '200': { description: 'Success' } }
            } as any
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();

      expect(app.auth.loginEndpoints).toHaveLength(5);
    });
  });

  describe('Annotated + auto-detected endpoint ordering (Req 2.1)', () => {
    it('should place annotated endpoints before auto-detected ones', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/api/authenticate': {
            post: {
              'x-uigen-login': true,
              summary: 'Custom authentication endpoint',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        user: { type: 'string' },
                        pass: { type: 'string' }
                      }
                    }
                  }
                }
              },
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          token: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            } as any
          },
          '/auth/login': {
            post: {
              summary: 'Standard login endpoint',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        username: { type: 'string' },
                        password: { type: 'string' }
                      }
                    }
                  }
                }
              },
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          accessToken: { type: 'string' }
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
      const app = adapter.adapt();

      expect(app.auth.loginEndpoints).toHaveLength(2);
      
      // Annotated endpoint should come first
      expect(app.auth.loginEndpoints![0].path).toBe('/api/authenticate');
      expect(app.auth.loginEndpoints![0].description).toBe('Custom authentication endpoint');
      
      // Auto-detected endpoint should come second
      expect(app.auth.loginEndpoints![1].path).toBe('/auth/login');
      expect(app.auth.loginEndpoints![1].description).toBe('Standard login endpoint');
    });

    it('should place multiple annotated endpoints before multiple auto-detected ones', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/api/custom1': {
            post: {
              'x-uigen-login': true,
              summary: 'Custom 1',
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          token: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            } as any
          },
          '/auth/login': {
            post: {
              summary: 'Auto-detected 1',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        username: { type: 'string' },
                        password: { type: 'string' }
                      }
                    }
                  }
                }
              },
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          token: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '/api/custom2': {
            post: {
              'x-uigen-login': true,
              summary: 'Custom 2',
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          token: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            } as any
          },
          '/auth/signin': {
            post: {
              summary: 'Auto-detected 2',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        email: { type: 'string' },
                        password: { type: 'string' }
                      }
                    }
                  }
                }
              },
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          token: { type: 'string' }
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
      const app = adapter.adapt();

      expect(app.auth.loginEndpoints).toHaveLength(4);
      
      // First two should be annotated
      expect(app.auth.loginEndpoints![0].path).toBe('/api/custom1');
      expect(app.auth.loginEndpoints![1].path).toBe('/api/custom2');
      
      // Last two should be auto-detected
      expect(app.auth.loginEndpoints![2].path).toBe('/auth/login');
      expect(app.auth.loginEndpoints![3].path).toBe('/auth/signin');
    });
  });

  describe('Explicit exclusion with x-uigen-login: false (Req 2.3)', () => {
    it('should exclude endpoint with x-uigen-login: false that matches path pattern', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/auth/login': {
            post: {
              'x-uigen-login': false,
              summary: 'This is NOT a login endpoint',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        username: { type: 'string' },
                        password: { type: 'string' }
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
            } as any
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();

      expect(app.auth.loginEndpoints).toHaveLength(0);
    });

    it('should exclude endpoint with x-uigen-login: false that matches description', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/api/auth': {
            post: {
              'x-uigen-login': false,
              summary: 'User login and authentication',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        username: { type: 'string' },
                        password: { type: 'string' }
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
            } as any
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();

      expect(app.auth.loginEndpoints).toHaveLength(0);
    });

    it('should exclude endpoint with x-uigen-login: false that has credential fields', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/api/session': {
            post: {
              'x-uigen-login': false,
              summary: 'Create session',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        username: { type: 'string' },
                        password: { type: 'string' }
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
            } as any
          }
        }
      };

      const adapter = new OpenAPI3Adapter(spec);
      const app = adapter.adapt();

      expect(app.auth.loginEndpoints).toHaveLength(0);
    });
  });

  describe('Backward compatibility (Req 2.4, 8.1)', () => {
    it('should maintain auto-detection when no annotations are present', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/auth/login': {
            post: {
              summary: 'User login',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        username: { type: 'string' },
                        password: { type: 'string' }
                      }
                    }
                  }
                }
              },
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          token: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '/api/signin': {
            post: {
              summary: 'Sign in to the application',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        email: { type: 'string' },
                        password: { type: 'string' }
                      }
                    }
                  }
                }
              },
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          accessToken: { type: 'string' }
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
      const app = adapter.adapt();

      // Both endpoints should be auto-detected
      expect(app.auth.loginEndpoints).toHaveLength(2);
      expect(app.auth.loginEndpoints!.map(e => e.path)).toContain('/auth/login');
      expect(app.auth.loginEndpoints!.map(e => e.path)).toContain('/api/signin');
    });

    it('should auto-detect by path pattern when no annotations present', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/login': {
            post: {
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          token: { type: 'string' }
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
      const app = adapter.adapt();

      expect(app.auth.loginEndpoints).toHaveLength(1);
      expect(app.auth.loginEndpoints![0].path).toBe('/login');
    });

    it('should auto-detect by description keywords when no annotations present', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/api/auth': {
            post: {
              summary: 'Authenticate user credentials',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        username: { type: 'string' },
                        password: { type: 'string' }
                      }
                    }
                  }
                }
              },
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          token: { type: 'string' }
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
      const app = adapter.adapt();

      expect(app.auth.loginEndpoints).toHaveLength(1);
      expect(app.auth.loginEndpoints![0].path).toBe('/api/auth');
    });

    it('should auto-detect by credential fields when no annotations present', () => {
      const spec: OpenAPIV3.Document = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
        paths: {
          '/api/session': {
            post: {
              summary: 'Create session',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        username: { type: 'string' },
                        password: { type: 'string' }
                      }
                    }
                  }
                }
              },
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          token: { type: 'string' }
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
      const app = adapter.adapt();

      expect(app.auth.loginEndpoints).toHaveLength(1);
      expect(app.auth.loginEndpoints![0].path).toBe('/api/session');
    });
  });
});
