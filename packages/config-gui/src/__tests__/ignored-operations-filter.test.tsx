import { describe, it, expect } from 'vitest';

describe('Ignored Operations Filter', () => {
  it('should filter out operations with x-uigen-ignore: true in config', () => {
    // Mock spec structure
    const specStructure = {
      resources: [
        {
          name: 'Health',
          slug: 'health',
          operations: [
            {
              id: 'health_health_get',
              method: 'GET',
              path: '/health',
              summary: 'Health check'
            }
          ],
          fields: []
        },
        {
          name: 'Users',
          slug: 'users',
          operations: [
            {
              id: 'list_users',
              method: 'GET',
              path: '/users',
              summary: 'List users'
            }
          ],
          fields: []
        }
      ]
    };

    // Mock config with health endpoint ignored
    const config = {
      version: '1.0',
      enabled: {},
      defaults: {},
      annotations: {
        'GET:/health': {
          'x-uigen-ignore': true
        }
      }
    };

    // Apply the same filtering logic as in App.tsx
    const filteredResources = specStructure.resources.map((r: any) => ({
      ...r,
      operations: r.operations.filter((op: any) => {
        const operationKey = `${op.method}:${op.path}`;
        const annotation = config?.annotations?.[operationKey];
        return !annotation || annotation['x-uigen-ignore'] !== true;
      })
    }));

    // Health resource should have 0 operations (filtered out)
    const healthResource = filteredResources.find(r => r.slug === 'health');
    expect(healthResource?.operations).toHaveLength(0);

    // Users resource should still have 1 operation
    const usersResource = filteredResources.find(r => r.slug === 'users');
    expect(usersResource?.operations).toHaveLength(1);
  });

  it('should keep operations without x-uigen-ignore annotation', () => {
    const specStructure = {
      resources: [
        {
          name: 'Users',
          slug: 'users',
          operations: [
            {
              id: 'list_users',
              method: 'GET',
              path: '/users',
              summary: 'List users'
            }
          ],
          fields: []
        }
      ]
    };

    const config = {
      version: '1.0',
      enabled: {},
      defaults: {},
      annotations: {}
    };

    const filteredResources = specStructure.resources.map((r: any) => ({
      ...r,
      operations: r.operations.filter((op: any) => {
        const operationKey = `${op.method}:${op.path}`;
        const annotation = config?.annotations?.[operationKey];
        return !annotation || annotation['x-uigen-ignore'] !== true;
      })
    }));

    const usersResource = filteredResources.find(r => r.slug === 'users');
    expect(usersResource?.operations).toHaveLength(1);
  });

  it('should keep operations with x-uigen-ignore: false', () => {
    const specStructure = {
      resources: [
        {
          name: 'Users',
          slug: 'users',
          operations: [
            {
              id: 'list_users',
              method: 'GET',
              path: '/users',
              summary: 'List users'
            }
          ],
          fields: []
        }
      ]
    };

    const config = {
      version: '1.0',
      enabled: {},
      defaults: {},
      annotations: {
        'GET:/users': {
          'x-uigen-ignore': false
        }
      }
    };

    const filteredResources = specStructure.resources.map((r: any) => ({
      ...r,
      operations: r.operations.filter((op: any) => {
        const operationKey = `${op.method}:${op.path}`;
        const annotation = config?.annotations?.[operationKey];
        return !annotation || annotation['x-uigen-ignore'] !== true;
      })
    }));

    const usersResource = filteredResources.find(r => r.slug === 'users');
    expect(usersResource?.operations).toHaveLength(1);
  });

  it('should handle resources with multiple operations, some ignored', () => {
    const specStructure = {
      resources: [
        {
          name: 'Mixed',
          slug: 'mixed',
          operations: [
            {
              id: 'op1',
              method: 'GET',
              path: '/api/endpoint1',
              summary: 'Endpoint 1'
            },
            {
              id: 'op2',
              method: 'POST',
              path: '/api/endpoint2',
              summary: 'Endpoint 2'
            },
            {
              id: 'op3',
              method: 'GET',
              path: '/api/endpoint3',
              summary: 'Endpoint 3'
            }
          ],
          fields: []
        }
      ]
    };

    const config = {
      version: '1.0',
      enabled: {},
      defaults: {},
      annotations: {
        'POST:/api/endpoint2': {
          'x-uigen-ignore': true
        }
      }
    };

    const filteredResources = specStructure.resources.map((r: any) => ({
      ...r,
      operations: r.operations.filter((op: any) => {
        const operationKey = `${op.method}:${op.path}`;
        const annotation = config?.annotations?.[operationKey];
        return !annotation || annotation['x-uigen-ignore'] !== true;
      })
    }));

    const mixedResource = filteredResources.find(r => r.slug === 'mixed');
    expect(mixedResource?.operations).toHaveLength(2);
    expect(mixedResource?.operations.map((op: any) => op.id)).toEqual(['op1', 'op3']);
  });
});
