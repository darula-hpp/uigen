import { describe, it, expect } from 'vitest';
import type { Operation, Resource } from '@uigen-dev/core';
import { resolveListChartConfig, resolveListColumns } from '../list-columns';

const listOpWithArrayResponse: Operation = {
  method: 'GET',
  path: '/readings',
  viewHint: 'list',
  responses: {
    '200': {
      schema: {
        type: 'array',
        key: 'Readings',
        label: 'Readings',
        required: false,
        items: {
          type: 'object',
          key: 'Reading',
          label: 'Reading',
          required: false,
          children: [
            { type: 'string', key: 'sensor_id', label: 'Sensor', required: true },
            { type: 'number', key: 'value', label: 'Value', required: true },
            { type: 'string', key: 'unit', label: 'Unit', required: false },
          ],
          chartConfig: {
            type: 'line',
            xKey: 'sensor_id',
            yKey: 'value',
          },
        },
      },
    },
  },
};

describe('resolveListColumns', () => {
  it('prefers resource schema children when present', () => {
    const resource: Resource = {
      name: 'Sensors',
      slug: 'sensors',
      operations: [],
      schema: {
        type: 'object',
        key: 'Sensor',
        label: 'Sensor',
        required: false,
        children: [
          { type: 'string', key: 'id', label: 'ID', required: true },
          { type: 'string', key: 'name', label: 'Name', required: true },
        ],
      },
      relationships: [],
    };

    const columns = resolveListColumns(resource, listOpWithArrayResponse);
    expect(columns.map((column) => column.key)).toEqual(['id', 'name']);
  });

  it('falls back to list operation array item schema when resource schema is empty', () => {
    const resource: Resource = {
      name: 'Readings',
      slug: 'readings',
      operations: [listOpWithArrayResponse],
      schema: {
        type: 'object',
        key: 'Reading',
        label: 'Reading',
        required: false,
        children: [],
      },
      relationships: [],
    };

    const columns = resolveListColumns(resource, listOpWithArrayResponse);
    expect(columns.map((column) => column.key)).toEqual(['sensor_id', 'value', 'unit']);
  });

  it('ignores fields marked with __shouldIgnore', () => {
    const resource: Resource = {
      name: 'Readings',
      slug: 'readings',
      operations: [listOpWithArrayResponse],
      schema: {
        type: 'object',
        key: 'Reading',
        label: 'Reading',
        required: false,
        children: [],
      },
      relationships: [],
    };

    const opWithHiddenField: Operation = {
      ...listOpWithArrayResponse,
      responses: {
        '200': {
          schema: {
            type: 'array',
            key: 'Readings',
            label: 'Readings',
            required: false,
            items: {
              type: 'object',
              key: 'Reading',
              label: 'Reading',
              required: false,
              children: [
                { type: 'string', key: 'sensor_id', label: 'Sensor', required: true },
                { type: 'string', key: 'internal', label: 'Internal', required: false, __shouldIgnore: true },
              ],
            },
          },
        },
      },
    };

    const columns = resolveListColumns(resource, opWithHiddenField);
    expect(columns.map((column) => column.key)).toEqual(['sensor_id']);
  });
});

describe('resolveListChartConfig', () => {
  it('prefers resource schema chart config', () => {
    const resource: Resource = {
      name: 'Readings',
      slug: 'readings',
      operations: [listOpWithArrayResponse],
      schema: {
        type: 'object',
        key: 'Reading',
        label: 'Reading',
        required: false,
        chartConfig: {
          type: 'bar',
          xKey: 'sensor_id',
          yKey: 'value',
        },
      },
      relationships: [],
    };

    expect(resolveListChartConfig(resource, listOpWithArrayResponse)).toEqual({
      type: 'bar',
      xKey: 'sensor_id',
      yKey: 'value',
    });
  });

  it('falls back to list response item chart config', () => {
    const resource: Resource = {
      name: 'Readings',
      slug: 'readings',
      operations: [listOpWithArrayResponse],
      schema: {
        type: 'object',
        key: 'Reading',
        label: 'Reading',
        required: false,
      },
      relationships: [],
    };

    expect(resolveListChartConfig(resource, listOpWithArrayResponse)).toEqual({
      type: 'line',
      xKey: 'sensor_id',
      yKey: 'value',
    });
  });
});
