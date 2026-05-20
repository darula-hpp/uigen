import { describe, it, expect } from 'vitest';
import type { SchemaNode } from '@uigen-dev/core';
import {
  partitionFieldsByDisplayMode,
  resolveFieldDisplayMode,
  resolveMetricSuffix,
} from '../field-display-mode';

const field = (overrides: Partial<SchemaNode>): SchemaNode => ({
  type: 'string',
  key: 'field',
  label: 'Field',
  required: false,
  ...overrides,
});

describe('resolveFieldDisplayMode', () => {
  it('treats measurement numbers as metrics', () => {
    expect(resolveFieldDisplayMode(field({ type: 'number', key: 'value', label: 'Value' }))).toBe('metric');
    expect(resolveFieldDisplayMode(field({ type: 'integer', key: 'count', label: 'Count' }))).toBe('metric');
  });

  it('keeps identifiers as default rows', () => {
    expect(resolveFieldDisplayMode(field({ type: 'integer', key: 'id', label: 'ID' }))).toBe('default');
    expect(resolveFieldDisplayMode(field({ type: 'integer', key: 'sensor_id', label: 'Sensor' }))).toBe('default');
  });

  it('treats booleans and enums as badges', () => {
    expect(resolveFieldDisplayMode(field({ type: 'boolean', key: 'enabled', label: 'Enabled' }))).toBe('badge');
    expect(
      resolveFieldDisplayMode(
        field({ type: 'enum', key: 'status', label: 'Status', enumValues: ['on', 'off'] })
      )
    ).toBe('badge');
  });
});

describe('partitionFieldsByDisplayMode', () => {
  it('groups fields by display mode', () => {
    const fields = [
      field({ type: 'number', key: 'value', label: 'Value' }),
      field({ type: 'string', key: 'name', label: 'Name' }),
      field({ type: 'boolean', key: 'enabled', label: 'Enabled' }),
    ];

    const grouped = partitionFieldsByDisplayMode(fields);
    expect(grouped.metricFields.map((item) => item.key)).toEqual(['value']);
    expect(grouped.defaultFields.map((item) => item.key)).toEqual(['name']);
    expect(grouped.badgeFields.map((item) => item.key)).toEqual(['enabled']);
  });
});

describe('resolveMetricSuffix', () => {
  it('uses sibling unit data for measurement fields', () => {
    const data = { value: 36.1, unit: 'C' };
    expect(resolveMetricSuffix(field({ type: 'number', key: 'value', label: 'Value' }), data)).toBe('C');
    expect(resolveMetricSuffix(field({ type: 'number', key: 'min_value', label: 'Minimum Value' }), data)).toBe('C');
    expect(resolveMetricSuffix(field({ type: 'integer', key: 'id', label: 'ID' }), data)).toBeUndefined();
  });
});
