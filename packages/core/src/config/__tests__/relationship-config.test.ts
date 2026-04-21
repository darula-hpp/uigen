import { describe, it, expect } from 'vitest';
import type { RelationshipConfig, ConfigFile } from '../types.js';

describe('RelationshipConfig', () => {
  it('accepts a valid entry with all required fields', () => {
    const rel: RelationshipConfig = {
      source: 'users',
      target: 'orders',
      path: '/users/{id}/orders',
    };

    expect(rel.source).toBe('users');
    expect(rel.target).toBe('orders');
    expect(rel.path).toBe('/users/{id}/orders');
    expect(rel.label).toBeUndefined();
  });

  it('accepts an optional label field', () => {
    const rel: RelationshipConfig = {
      source: 'users',
      target: 'orders',
      path: '/users/{id}/orders',
      label: 'User Orders',
    };

    expect(rel.label).toBe('User Orders');
  });
});

describe('ConfigFile with relationships', () => {
  it('treats absent relationships key as equivalent to empty array', () => {
    const config: ConfigFile = {
      version: '1.0',
      enabled: {},
      defaults: {},
      annotations: {},
    };

    // relationships is optional; absence is valid
    expect(config.relationships).toBeUndefined();
    const resolved = config.relationships ?? [];
    expect(resolved).toHaveLength(0);
  });

  it('accepts a relationships array with valid entries', () => {
    const config: ConfigFile = {
      version: '1.0',
      enabled: {},
      defaults: {},
      annotations: {},
      relationships: [
        { source: 'users', target: 'orders', path: '/users/{id}/orders' },
        { source: 'projects', target: 'tags', path: '/projects/{id}/tags', label: 'Project Tags' },
      ],
    };

    expect(config.relationships).toHaveLength(2);
    expect(config.relationships![0].source).toBe('users');
    expect(config.relationships![1].label).toBe('Project Tags');
  });

  it('accepts an empty relationships array', () => {
    const config: ConfigFile = {
      version: '1.0',
      enabled: {},
      defaults: {},
      annotations: {},
      relationships: [],
    };

    expect(config.relationships).toHaveLength(0);
  });
});

describe('RelationshipConfig validation helpers', () => {
  /**
   * Simulates the validation logic that the reconciler will enforce.
   * These tests document the expected error messages for missing fields.
   */
  function validateEntry(
    entry: Partial<RelationshipConfig>,
    index: number
  ): string[] {
    const errors: string[] = [];
    if (!entry.source) errors.push(`relationships[${index}]: missing required field "source"`);
    if (!entry.target) errors.push(`relationships[${index}]: missing required field "target"`);
    if (!entry.path) errors.push(`relationships[${index}]: missing required field "path"`);
    return errors;
  }

  it('returns a descriptive error identifying missing source field and entry index', () => {
    const errors = validateEntry({ target: 'orders', path: '/users/{id}/orders' }, 0);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('"source"');
    expect(errors[0]).toContain('0');
  });

  it('returns a descriptive error identifying missing target field and entry index', () => {
    const errors = validateEntry({ source: 'users', path: '/users/{id}/orders' }, 2);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('"target"');
    expect(errors[0]).toContain('2');
  });

  it('returns a descriptive error identifying missing path field and entry index', () => {
    const errors = validateEntry({ source: 'users', target: 'orders' }, 1);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('"path"');
    expect(errors[0]).toContain('1');
  });

  it('returns no errors for a fully valid entry', () => {
    const errors = validateEntry({ source: 'users', target: 'orders', path: '/users/{id}/orders' }, 0);
    expect(errors).toHaveLength(0);
  });
});
