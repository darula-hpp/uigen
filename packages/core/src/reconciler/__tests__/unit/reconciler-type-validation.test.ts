import { describe, it, expect } from 'vitest';
import { Reconciler } from '../../reconciler.js';
import type { ConfigFile } from '../../../config/types.js';
import type { OpenAPIV3 } from 'openapi-types';

const minimalSpec: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: { title: 'Test API', version: '1.0.0' },
  paths: {
    '/users': {
      get: { summary: 'List users', responses: { '200': { description: 'OK' } } },
    },
  },
};

describe('Reconciler - relationship type validation', () => {
  it('accepts relationship with valid hasMany type', () => {
    const config: ConfigFile = {
      version: '1.0',
      enabled: {},
      defaults: {},
      annotations: {},
      relationships: [
        { source: 'users', target: 'orders', path: '/users/{id}/orders', type: 'hasMany' },
      ],
    };

    const reconciler = new Reconciler({ logLevel: 'error' });
    const result = reconciler.reconcile(minimalSpec, config);

    expect(result.relationships).toHaveLength(1);
    expect(result.relationships[0].type).toBe('hasMany');
    expect(result.warnings).toHaveLength(0);
  });

  it('accepts relationship with valid belongsTo type', () => {
    const config: ConfigFile = {
      version: '1.0',
      enabled: {},
      defaults: {},
      annotations: {},
      relationships: [
        { source: 'orders', target: 'users', path: '/users/{id}/orders', type: 'belongsTo' },
      ],
    };

    const reconciler = new Reconciler({ logLevel: 'error' });
    const result = reconciler.reconcile(minimalSpec, config);

    expect(result.relationships).toHaveLength(1);
    expect(result.relationships[0].type).toBe('belongsTo');
    expect(result.warnings).toHaveLength(0);
  });

  it('accepts relationship with valid manyToMany type', () => {
    const config: ConfigFile = {
      version: '1.0',
      enabled: {},
      defaults: {},
      annotations: {},
      relationships: [
        { source: 'meetings', target: 'templates', path: '/meetings/{id}/templates', type: 'manyToMany' },
      ],
    };

    const reconciler = new Reconciler({ logLevel: 'error' });
    const result = reconciler.reconcile(minimalSpec, config);

    expect(result.relationships).toHaveLength(1);
    expect(result.relationships[0].type).toBe('manyToMany');
    expect(result.warnings).toHaveLength(0);
  });

  it('produces warning for missing type field but includes relationship', () => {
    const config: ConfigFile = {
      version: '1.0',
      enabled: {},
      defaults: {},
      annotations: {},
      relationships: [
        { source: 'users', target: 'orders', path: '/users/{id}/orders' },
      ],
    };

    const reconciler = new Reconciler({ logLevel: 'error' });
    const result = reconciler.reconcile(minimalSpec, config);

    expect(result.relationships).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].message).toContain('Missing type field');
    expect(result.warnings[0].message).toContain('Type will be derived from path');
    expect(result.warnings[0].elementPath).toBe('relationships[0]');
  });

  it('produces error for invalid type and excludes relationship', () => {
    const config: ConfigFile = {
      version: '1.0',
      enabled: {},
      defaults: {},
      annotations: {},
      relationships: [
        { source: 'users', target: 'orders', path: '/users/{id}/orders', type: 'invalidType' as any },
      ],
    };

    const reconciler = new Reconciler({ logLevel: 'error' });
    const result = reconciler.reconcile(minimalSpec, config);

    expect(result.relationships).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].message).toContain('Invalid relationship type');
    expect(result.warnings[0].message).toContain('invalidType');
    expect(result.warnings[0].message).toContain('Must be one of: hasMany, belongsTo, manyToMany');
  });

  it('validates multiple relationships with different type scenarios', () => {
    const config: ConfigFile = {
      version: '1.0',
      enabled: {},
      defaults: {},
      annotations: {},
      relationships: [
        { source: 'users', target: 'orders', path: '/users/{id}/orders', type: 'hasMany' },
        { source: 'orders', target: 'items', path: '/orders/{id}/items' },
        { source: 'meetings', target: 'templates', path: '/meetings/{id}/templates', type: 'badType' as any },
        { source: 'projects', target: 'tags', path: '/projects/{id}/tags', type: 'manyToMany' },
      ],
    };

    const reconciler = new Reconciler({ logLevel: 'error' });
    const result = reconciler.reconcile(minimalSpec, config);

    // Valid: hasMany (index 0), missing type (index 1), manyToMany (index 3)
    // Invalid: badType (index 2)
    expect(result.relationships).toHaveLength(3);
    expect(result.relationships[0].type).toBe('hasMany');
    expect(result.relationships[1].type).toBeUndefined();
    expect(result.relationships[2].type).toBe('manyToMany');

    // Warnings: missing type (index 1), invalid type (index 2)
    expect(result.warnings).toHaveLength(2);
    
    const missingTypeWarning = result.warnings.find(w => w.message.includes('Missing type field'));
    expect(missingTypeWarning).toBeDefined();
    expect(missingTypeWarning?.elementPath).toBe('relationships[1]');
    
    const invalidTypeWarning = result.warnings.find(w => w.message.includes('Invalid relationship type'));
    expect(invalidTypeWarning).toBeDefined();
    expect(invalidTypeWarning?.elementPath).toBe('relationships[2]');
  });

  it('type validation does not interfere with other validations', () => {
    const config: ConfigFile = {
      version: '1.0',
      enabled: {},
      defaults: {},
      annotations: {},
      relationships: [
        { source: 'users', target: 'users', path: '/users/{id}/users', type: 'hasMany' },
        { source: 'orders', target: 'items', path: '/orders/{id}/items', type: 'invalidType' as any },
      ],
    };

    const reconciler = new Reconciler({ logLevel: 'error' });
    const result = reconciler.reconcile(minimalSpec, config);

    expect(result.relationships).toHaveLength(0);
    expect(result.warnings).toHaveLength(2);
    
    const selfRelWarning = result.warnings.find(w => w.message.includes('self-relationship'));
    expect(selfRelWarning).toBeDefined();
    
    const invalidTypeWarning = result.warnings.find(w => w.message.includes('Invalid relationship type'));
    expect(invalidTypeWarning).toBeDefined();
  });

  it('preserves type field in output relationships', () => {
    const config: ConfigFile = {
      version: '1.0',
      enabled: {},
      defaults: {},
      annotations: {},
      relationships: [
        { source: 'users', target: 'orders', path: '/users/{id}/orders', type: 'hasMany', label: 'User Orders' },
        { source: 'meetings', target: 'templates', path: '/meetings/{id}/templates', type: 'manyToMany' },
      ],
    };

    const reconciler = new Reconciler({ logLevel: 'error' });
    const result = reconciler.reconcile(minimalSpec, config);

    expect(result.relationships).toHaveLength(2);
    expect(result.relationships[0]).toEqual({
      source: 'users',
      target: 'orders',
      path: '/users/{id}/orders',
      type: 'hasMany',
      label: 'User Orders',
    });
    expect(result.relationships[1]).toEqual({
      source: 'meetings',
      target: 'templates',
      path: '/meetings/{id}/templates',
      type: 'manyToMany',
    });
  });
});
