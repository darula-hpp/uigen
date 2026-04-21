import { describe, it, expect, vi } from 'vitest';
import { OpenAPI3Adapter } from '../openapi3.js';
import type { OpenAPIV3 } from 'openapi-types';
import type { RelationshipConfig } from '../../config/types.js';

const specWithUsersAndOrders: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: { title: 'Test API', version: '1.0.0' },
  paths: {
    '/users': {
      get: { summary: 'List users', responses: { '200': { description: 'OK' } } },
      post: { summary: 'Create user', responses: { '201': { description: 'Created' } } },
    },
    '/users/{id}': {
      get: { summary: 'Get user', responses: { '200': { description: 'OK' } } },
    },
    '/orders': {
      get: { summary: 'List orders', responses: { '200': { description: 'OK' } } },
      post: { summary: 'Create order', responses: { '201': { description: 'Created' } } },
    },
    '/orders/{id}': {
      get: { summary: 'Get order', responses: { '200': { description: 'OK' } } },
    },
    '/users/{id}/orders': {
      get: { summary: 'List user orders', responses: { '200': { description: 'OK' } } },
    },
  },
};

describe('Resource_Extractor - config-driven relationships', () => {
  it('non-existent target slug logs a warning and omits the relationship', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const configRelationships: RelationshipConfig[] = [
      { source: 'users', target: 'nonexistent', path: '/users/{id}/nonexistent' },
    ];

    const adapter = new OpenAPI3Adapter(specWithUsersAndOrders);
    const ir = adapter.adapt(configRelationships);

    const usersResource = ir.resources.find((r) => r.slug === 'users');
    expect(usersResource).toBeDefined();
    expect(usersResource!.relationships).toHaveLength(0);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('nonexistent')
    );

    warnSpy.mockRestore();
  });

  it('valid config relationships are mapped to IR relationships', () => {
    const configRelationships: RelationshipConfig[] = [
      { source: 'users', target: 'orders', path: '/users/{id}/orders' },
    ];

    const adapter = new OpenAPI3Adapter(specWithUsersAndOrders);
    const ir = adapter.adapt(configRelationships);

    const usersResource = ir.resources.find((r) => r.slug === 'users');
    expect(usersResource).toBeDefined();
    expect(usersResource!.relationships).toHaveLength(1);
    expect(usersResource!.relationships[0].target).toBe('orders');
    expect(usersResource!.relationships[0].type).toBe('hasMany');
    expect(usersResource!.relationships[0].path).toBe('/users/{id}/orders');
  });

  it('empty configRelationships falls back to heuristic detection', () => {
    const adapterWithConfig = new OpenAPI3Adapter(specWithUsersAndOrders);
    const irWithEmpty = adapterWithConfig.adapt([]);

    const adapterNoConfig = new OpenAPI3Adapter(specWithUsersAndOrders);
    const irNoConfig = adapterNoConfig.adapt();

    const usersWithEmpty = irWithEmpty.resources.find((r) => r.slug === 'users');
    const usersNoConfig = irNoConfig.resources.find((r) => r.slug === 'users');

    expect(JSON.stringify(usersWithEmpty?.relationships)).toBe(
      JSON.stringify(usersNoConfig?.relationships)
    );
  });

  it('config relationships bypass heuristic detection entirely', () => {
    // Provide a config relationship that differs from what heuristics would detect
    const configRelationships: RelationshipConfig[] = [
      { source: 'orders', target: 'users', path: '/orders/{id}/users' },
    ];

    const adapter = new OpenAPI3Adapter(specWithUsersAndOrders);
    const ir = adapter.adapt(configRelationships);

    const ordersResource = ir.resources.find((r) => r.slug === 'orders');
    expect(ordersResource).toBeDefined();
    // Only the config-declared relationship should be present
    expect(ordersResource!.relationships).toHaveLength(1);
    expect(ordersResource!.relationships[0].target).toBe('users');
    // /orders/{id}/users matches /{sourceSlug}/{id}/{targetSlug} -> hasMany
    expect(ordersResource!.relationships[0].type).toBe('hasMany');
  });

  it('isReadOnly is false when write operations exist on the path', () => {
    const specWithWriteOp: OpenAPIV3.Document = {
      ...specWithUsersAndOrders,
      paths: {
        ...specWithUsersAndOrders.paths,
        '/users/{id}/orders': {
          get: { summary: 'List', responses: { '200': { description: 'OK' } } },
          post: { summary: 'Create', responses: { '201': { description: 'Created' } } },
        },
      },
    };

    const configRelationships: RelationshipConfig[] = [
      { source: 'users', target: 'orders', path: '/users/{id}/orders' },
    ];

    const adapter = new OpenAPI3Adapter(specWithWriteOp);
    const ir = adapter.adapt(configRelationships);

    const usersResource = ir.resources.find((r) => r.slug === 'users');
    expect(usersResource!.relationships[0].isReadOnly).toBe(false);
  });

  it('isReadOnly is true when no write operations exist on the path', () => {
    const configRelationships: RelationshipConfig[] = [
      { source: 'users', target: 'orders', path: '/users/{id}/orders' },
    ];

    // specWithUsersAndOrders has only GET on /users/{id}/orders
    const adapter = new OpenAPI3Adapter(specWithUsersAndOrders);
    const ir = adapter.adapt(configRelationships);

    const usersResource = ir.resources.find((r) => r.slug === 'users');
    expect(usersResource!.relationships[0].isReadOnly).toBe(true);
  });
});
