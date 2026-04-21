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

describe('Reconciler - relationships pass-through', () => {
  it('valid relationships are included in ReconciledSpec.relationships', () => {
    const config: ConfigFile = {
      version: '1.0',
      enabled: {},
      defaults: {},
      annotations: {},
      relationships: [
        { source: 'users', target: 'orders', path: '/users/{id}/orders' },
        { source: 'projects', target: 'tags', path: '/projects/{id}/tags', label: 'Tags' },
      ],
    };

    const reconciler = new Reconciler({ logLevel: 'error' });
    const result = reconciler.reconcile(minimalSpec, config);

    expect(result.relationships).toHaveLength(2);
    expect(result.relationships[0].source).toBe('users');
    expect(result.relationships[1].label).toBe('Tags');
  });

  it('valid relationships are NOT injected into the spec object', () => {
    const config: ConfigFile = {
      version: '1.0',
      enabled: {},
      defaults: {},
      annotations: {},
      relationships: [{ source: 'users', target: 'orders', path: '/users/{id}/orders' }],
    };

    const reconciler = new Reconciler({ logLevel: 'error' });
    const result = reconciler.reconcile(minimalSpec, config);

    const specStr = JSON.stringify(result.spec);
    expect(specStr).not.toContain('"relationships"');
    expect(specStr).not.toContain('"source"');
  });

  it('absent relationships key produces empty relationships array', () => {
    const config: ConfigFile = {
      version: '1.0',
      enabled: {},
      defaults: {},
      annotations: {},
    };

    const reconciler = new Reconciler({ logLevel: 'error' });
    const result = reconciler.reconcile(minimalSpec, config);

    expect(result.relationships).toEqual([]);
  });

  it('empty relationships array produces empty relationships array', () => {
    const config: ConfigFile = {
      version: '1.0',
      enabled: {},
      defaults: {},
      annotations: {},
      relationships: [],
    };

    const reconciler = new Reconciler({ logLevel: 'error' });
    const result = reconciler.reconcile(minimalSpec, config);

    expect(result.relationships).toEqual([]);
  });

  it('self-relationship produces a warning and is excluded from relationships', () => {
    const config: ConfigFile = {
      version: '1.0',
      enabled: {},
      defaults: {},
      annotations: {},
      relationships: [{ source: 'users', target: 'users', path: '/users/{id}/users' }],
    };

    const reconciler = new Reconciler({ logLevel: 'error' });
    const result = reconciler.reconcile(minimalSpec, config);

    expect(result.relationships).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0].message).toContain('self-relationship');
  });

  it('duplicate (source, target, path) triplet produces a warning and is excluded', () => {
    const config: ConfigFile = {
      version: '1.0',
      enabled: {},
      defaults: {},
      annotations: {},
      relationships: [
        { source: 'users', target: 'orders', path: '/users/{id}/orders' },
        { source: 'users', target: 'orders', path: '/users/{id}/orders' },
      ],
    };

    const reconciler = new Reconciler({ logLevel: 'error' });
    const result = reconciler.reconcile(minimalSpec, config);

    // Only the first entry is valid; the duplicate is rejected
    expect(result.relationships).toHaveLength(1);
    expect(result.warnings.length).toBeGreaterThan(0);
    // Check that at least one warning contains 'duplicate'
    const hasDuplicateWarning = result.warnings.some(w => w.message.includes('duplicate'));
    expect(hasDuplicateWarning).toBe(true);
  });

  it('entry missing required field produces a warning and is excluded', () => {
    const config: ConfigFile = {
      version: '1.0',
      enabled: {},
      defaults: {},
      annotations: {},
      relationships: [{ source: '', target: 'orders', path: '/users/{id}/orders' }],
    };

    const reconciler = new Reconciler({ logLevel: 'error' });
    const result = reconciler.reconcile(minimalSpec, config);

    expect(result.relationships).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0].message).toContain('"source"');
  });

  it('path not starting with / produces a warning and is excluded', () => {
    const config: ConfigFile = {
      version: '1.0',
      enabled: {},
      defaults: {},
      annotations: {},
      relationships: [{ source: 'users', target: 'orders', path: 'users/{id}/orders' }],
    };

    const reconciler = new Reconciler({ logLevel: 'error' });
    const result = reconciler.reconcile(minimalSpec, config);

    expect(result.relationships).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
