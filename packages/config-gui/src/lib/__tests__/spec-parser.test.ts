import { describe, it, expect } from 'vitest';
import { SpecParser } from '../spec-parser.js';
import type { UIGenApp, Operation, SchemaNode } from '@uigen-dev/core';

describe('SpecParser', () => {
  const parser = new SpecParser();
  
  describe('parse', () => {
    it('should parse a simple spec with one resource', () => {
      const app: UIGenApp = {
        meta: { title: 'Test API', version: '1.0' },
        resources: [
          {
            name: 'User',
            slug: 'user',
            uigenId: 'user',
            operations: [],
            schema: {
              type: 'object',
              key: 'User',
              label: 'User',
              required: false,
              children: [
                {
                  type: 'string',
                  key: 'email',
                  label: 'Email',
                  required: true
                }
              ]
            },
            relationships: []
          }
        ],
        auth: { schemes: [], globalRequired: false },
        dashboard: { enabled: false, widgets: [] },
        servers: []
      };
      
      const result = parser.parse(app);
      
      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].name).toBe('User');
      expect(result.resources[0].slug).toBe('user');
      expect(result.resources[0].fields).toHaveLength(1);
      expect(result.resources[0].fields[0].key).toBe('email');
      expect(result.resources[0].fields[0].path).toBe('user.email');
    });
    
    it('should extract operations from resources', () => {
      const operation: Operation = {
        id: 'getUsers',
        uigenId: 'getUsers',
        method: 'GET',
        path: '/users',
        summary: 'Get all users',
        parameters: [],
        responses: {},
        viewHint: 'list'
      };
      
      const app: UIGenApp = {
        meta: { title: 'Test API', version: '1.0' },
        resources: [
          {
            name: 'User',
            slug: 'user',
            uigenId: 'user',
            operations: [operation],
            schema: {
              type: 'object',
              key: 'User',
              label: 'User',
              required: false,
              children: []
            },
            relationships: []
          }
        ],
        auth: { schemes: [], globalRequired: false },
        dashboard: { enabled: false, widgets: [] },
        servers: []
      };
      
      const result = parser.parse(app);
      
      expect(result.resources[0].operations).toHaveLength(1);
      expect(result.resources[0].operations[0].id).toBe('getUsers');
      expect(result.resources[0].operations[0].method).toBe('GET');
      expect(result.resources[0].operations[0].path).toBe('/users');
    });
    
    it('should extract nested fields from object types', () => {
      const app: UIGenApp = {
        meta: { title: 'Test API', version: '1.0' },
        resources: [
          {
            name: 'User',
            slug: 'user',
            uigenId: 'user',
            operations: [],
            schema: {
              type: 'object',
              key: 'User',
              label: 'User',
              required: false,
              children: [
                {
                  type: 'object',
                  key: 'address',
                  label: 'Address',
                  required: false,
                  children: [
                    {
                      type: 'string',
                      key: 'street',
                      label: 'Street',
                      required: true
                    },
                    {
                      type: 'string',
                      key: 'city',
                      label: 'City',
                      required: true
                    }
                  ]
                }
              ]
            },
            relationships: []
          }
        ],
        auth: { schemes: [], globalRequired: false },
        dashboard: { enabled: false, widgets: [] },
        servers: []
      };
      
      const result = parser.parse(app);
      
      expect(result.resources[0].fields).toHaveLength(1);
      expect(result.resources[0].fields[0].key).toBe('address');
      expect(result.resources[0].fields[0].children).toHaveLength(2);
      expect(result.resources[0].fields[0].children![0].key).toBe('street');
      expect(result.resources[0].fields[0].children![0].path).toBe('user.address.street');
      expect(result.resources[0].fields[0].children![1].key).toBe('city');
      expect(result.resources[0].fields[0].children![1].path).toBe('user.address.city');
    });
    
    it('should extract x-uigen-ref annotations from refConfig', () => {
      const app: UIGenApp = {
        meta: { title: 'Test API', version: '1.0' },
        resources: [
          {
            name: 'User',
            slug: 'user',
            uigenId: 'user',
            operations: [],
            schema: {
              type: 'object',
              key: 'User',
              label: 'User',
              required: false,
              children: [
                {
                  type: 'string',
                  key: 'roleId',
                  label: 'Role',
                  required: true,
                  refConfig: {
                    resource: 'Role',
                    valueField: 'id',
                    labelField: 'name',
                    filter: {}
                  }
                }
              ]
            },
            relationships: []
          }
        ],
        auth: { schemes: [], globalRequired: false },
        dashboard: { enabled: false, widgets: [] },
        servers: []
      };
      
      const result = parser.parse(app);
      
      expect(result.resources[0].fields[0].annotations['x-uigen-ref']).toEqual({
        resource: 'Role',
        valueField: 'id',
        labelField: 'name',
        filter: {}
      });
    });
    
    it('should extract x-uigen-label annotations', () => {
      const app: UIGenApp = {
        meta: { title: 'Test API', version: '1.0' },
        resources: [
          {
            name: 'User',
            slug: 'user',
            uigenId: 'user',
            operations: [],
            schema: {
              type: 'object',
              key: 'User',
              label: 'User',
              required: false,
              children: [
                {
                  type: 'string',
                  key: 'email',
                  label: 'Email Address',
                  required: true,
                  'x-uigen-label': 'Email Address'
                } as SchemaNode
              ]
            },
            relationships: []
          }
        ],
        auth: { schemes: [], globalRequired: false },
        dashboard: { enabled: false, widgets: [] },
        servers: []
      };
      
      const result = parser.parse(app);
      
      expect(result.resources[0].fields[0].annotations['x-uigen-label']).toBe('Email Address');
    });
    
    it('should extract x-uigen-ignore annotations from resources', () => {
      const app: UIGenApp = {
        meta: { title: 'Test API', version: '1.0' },
        resources: [
          {
            name: 'InternalLog',
            slug: 'internallog',
            uigenId: 'internallog',
            operations: [],
            schema: {
              type: 'object',
              key: 'InternalLog',
              label: 'Internal Log',
              required: false,
              children: [],
              'x-uigen-ignore': true
            } as SchemaNode,
            relationships: []
          }
        ],
        auth: { schemes: [], globalRequired: false },
        dashboard: { enabled: false, widgets: [] },
        servers: []
      };
      
      const result = parser.parse(app);
      
      expect(result.resources[0].annotations['x-uigen-ignore']).toBe(true);
    });
    
    it('should extract x-uigen-login annotations from operations', () => {
      const operation = {
        id: 'login',
        uigenId: 'login',
        method: 'POST' as const,
        path: '/auth/login',
        summary: 'Login',
        parameters: [],
        responses: {},
        viewHint: 'action' as const,
        'x-uigen-login': true
      };
      
      const app: UIGenApp = {
        meta: { title: 'Test API', version: '1.0' },
        resources: [
          {
            name: 'Auth',
            slug: 'auth',
            uigenId: 'auth',
            operations: [operation],
            schema: {
              type: 'object',
              key: 'Auth',
              label: 'Auth',
              required: false,
              children: []
            },
            relationships: []
          }
        ],
        auth: { schemes: [], globalRequired: false },
        dashboard: { enabled: false, widgets: [] },
        servers: []
      };
      
      const result = parser.parse(app);
      
      expect(result.resources[0].operations[0].annotations['x-uigen-login']).toBe(true);
    });
    
    it('should handle array fields with items', () => {
      const app: UIGenApp = {
        meta: { title: 'Test API', version: '1.0' },
        resources: [
          {
            name: 'User',
            slug: 'user',
            uigenId: 'user',
            operations: [],
            schema: {
              type: 'object',
              key: 'User',
              label: 'User',
              required: false,
              children: [
                {
                  type: 'array',
                  key: 'tags',
                  label: 'Tags',
                  required: false,
                  items: {
                    type: 'string',
                    key: 'tag',
                    label: 'Tag',
                    required: false
                  }
                }
              ]
            },
            relationships: []
          }
        ],
        auth: { schemes: [], globalRequired: false },
        dashboard: { enabled: false, widgets: [] },
        servers: []
      };
      
      const result = parser.parse(app);
      
      expect(result.resources[0].fields[0].type).toBe('array');
      expect(result.resources[0].fields[0].children).toHaveLength(1);
      expect(result.resources[0].fields[0].children![0].key).toBe('items');
      expect(result.resources[0].fields[0].children![0].type).toBe('string');
    });
    
    it('should handle multiple resources', () => {
      const app: UIGenApp = {
        meta: { title: 'Test API', version: '1.0' },
        resources: [
          {
            name: 'User',
            slug: 'user',
            uigenId: 'user',
            operations: [],
            schema: {
              type: 'object',
              key: 'User',
              label: 'User',
              required: false,
              children: []
            },
            relationships: []
          },
          {
            name: 'Role',
            slug: 'role',
            uigenId: 'role',
            operations: [],
            schema: {
              type: 'object',
              key: 'Role',
              label: 'Role',
              required: false,
              children: []
            },
            relationships: []
          }
        ],
        auth: { schemes: [], globalRequired: false },
        dashboard: { enabled: false, widgets: [] },
        servers: []
      };
      
      const result = parser.parse(app);
      
      expect(result.resources).toHaveLength(2);
      expect(result.resources[0].name).toBe('User');
      expect(result.resources[1].name).toBe('Role');
    });
    
    it('should preserve resource description', () => {
      const app: UIGenApp = {
        meta: { title: 'Test API', version: '1.0' },
        resources: [
          {
            name: 'User',
            slug: 'user',
            uigenId: 'user',
            description: 'User resource for managing users',
            operations: [],
            schema: {
              type: 'object',
              key: 'User',
              label: 'User',
              required: false,
              children: []
            },
            relationships: []
          }
        ],
        auth: { schemes: [], globalRequired: false },
        dashboard: { enabled: false, widgets: [] },
        servers: []
      };
      
      const result = parser.parse(app);
      
      expect(result.resources[0].description).toBe('User resource for managing users');
    });
    
    it('should preserve field description', () => {
      const app: UIGenApp = {
        meta: { title: 'Test API', version: '1.0' },
        resources: [
          {
            name: 'User',
            slug: 'user',
            uigenId: 'user',
            operations: [],
            schema: {
              type: 'object',
              key: 'User',
              label: 'User',
              required: false,
              children: [
                {
                  type: 'string',
                  key: 'email',
                  label: 'Email',
                  required: true,
                  description: 'User email address'
                }
              ]
            },
            relationships: []
          }
        ],
        auth: { schemes: [], globalRequired: false },
        dashboard: { enabled: false, widgets: [] },
        servers: []
      };
      
      const result = parser.parse(app);
      
      expect(result.resources[0].fields[0].description).toBe('User email address');
    });
    
    it('should capture format for fields', () => {
      const app: UIGenApp = {
        meta: { title: 'Test API', version: '1.0' },
        resources: [
          {
            name: 'User',
            slug: 'user',
            uigenId: 'user',
            operations: [],
            schema: {
              type: 'object',
              key: 'User',
              label: 'User',
              required: false,
              children: [
                {
                  type: 'string',
                  key: 'avatar',
                  label: 'Avatar',
                  required: false,
                  format: 'binary'
                }
              ]
            },
            relationships: []
          }
        ],
        auth: { schemes: [], globalRequired: false },
        dashboard: { enabled: false, widgets: [] },
        servers: []
      };
      
      const result = parser.parse(app);
      
      expect(result.resources[0].fields[0].format).toBe('binary');
    });
    
    it('should capture fileMetadata when present', () => {
      const app: UIGenApp = {
        meta: { title: 'Test API', version: '1.0' },
        resources: [
          {
            name: 'User',
            slug: 'user',
            uigenId: 'user',
            operations: [],
            schema: {
              type: 'object',
              key: 'User',
              label: 'User',
              required: false,
              children: [
                {
                  type: 'file',
                  key: 'avatar',
                  label: 'Avatar',
                  required: false,
                  fileMetadata: {
                    allowedMimeTypes: ['image/jpeg', 'image/png'],
                    maxSizeBytes: 5242880,
                    multiple: false,
                    accept: 'image/jpeg,image/png',
                    fileType: 'image'
                  }
                }
              ]
            },
            relationships: []
          }
        ],
        auth: { schemes: [], globalRequired: false },
        dashboard: { enabled: false, widgets: [] },
        servers: []
      };
      
      const result = parser.parse(app);
      
      expect(result.resources[0].fields[0].fileMetadata).toEqual({
        allowedMimeTypes: ['image/jpeg', 'image/png'],
        maxSizeBytes: 5242880,
        multiple: false,
        accept: 'image/jpeg,image/png',
        fileType: 'image'
      });
    });
    
    it('should handle fields without format or fileMetadata', () => {
      const app: UIGenApp = {
        meta: { title: 'Test API', version: '1.0' },
        resources: [
          {
            name: 'User',
            slug: 'user',
            uigenId: 'user',
            operations: [],
            schema: {
              type: 'object',
              key: 'User',
              label: 'User',
              required: false,
              children: [
                {
                  type: 'string',
                  key: 'name',
                  label: 'Name',
                  required: true
                }
              ]
            },
            relationships: []
          }
        ],
        auth: { schemes: [], globalRequired: false },
        dashboard: { enabled: false, widgets: [] },
        servers: []
      };
      
      const result = parser.parse(app);
      
      expect(result.resources[0].fields[0].format).toBeUndefined();
      expect(result.resources[0].fields[0].fileMetadata).toBeUndefined();
    });
  });
});
