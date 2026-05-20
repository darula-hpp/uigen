import { describe, it, expect } from 'vitest';
import type { Operation, Resource } from '../../ir/types.js';
import { ListFieldResolver } from '../list-field-resolver.js';

const listOpWithArrayResponse: Operation = {
  method: 'GET',
  path: '/readings',
  viewHint: 'list',
  responses: {
    '200': {
      schema: {
        type: 'array',
        key: 'readings',
        label: 'Readings',
        required: false,
        items: {
          type: 'object',
          key: 'Reading',
          label: 'Reading',
          required: false,
          children: [
            { type: 'number', key: 'value', label: 'Value', required: true },
            { type: 'string', key: 'unit', label: 'Unit', required: false },
          ],
        },
      },
    },
  },
};

const listOpWithObjectResponse: Operation = {
  method: 'GET',
  path: '/config',
  viewHint: 'list',
  responses: {
    '200': {
      schema: {
        type: 'object',
        key: 'BoardConfig',
        label: 'Board Config',
        required: false,
        children: [
          { type: 'string', key: 'hostname', label: 'Hostname', required: true },
          { type: 'number', key: 'telemetry_interval_ms', label: 'Telemetry Interval', required: false },
        ],
      },
    },
  },
};

const resourceWithSchema: Resource = {
  name: 'readings',
  label: 'Readings',
  path: '/readings',
  schema: {
    type: 'object',
    key: 'Reading',
    label: 'Reading',
    required: false,
    children: [
      { type: 'number', key: 'value', label: 'Value', required: true },
      { type: 'string', key: 'unit', label: 'Unit', required: false },
    ],
  },
  operations: [],
};

const resourceWithoutSchema: Resource = {
  name: 'config',
  label: 'Config',
  path: '/config',
  schema: {
    type: 'object',
    key: 'BoardConfig',
    label: 'Board Config',
    required: false,
    children: [],
  },
  operations: [],
};

describe('ListFieldResolver', () => {
  describe('resolveFields', () => {
    it('prefers resource schema children over response schema', () => {
      const fields = ListFieldResolver.resolveFields(resourceWithSchema, listOpWithArrayResponse);
      expect(fields.map((field) => field.key)).toEqual(['value', 'unit']);
    });

    it('falls back to array item fields from list response schema', () => {
      const fields = ListFieldResolver.resolveFields(resourceWithoutSchema, listOpWithArrayResponse);
      expect(fields.map((field) => field.key)).toEqual(['value', 'unit']);
    });

    it('resolves object response schema fields for singleton lists', () => {
      const fields = ListFieldResolver.resolveFields(resourceWithoutSchema, listOpWithObjectResponse);
      expect(fields.map((field) => field.key)).toEqual(['hostname', 'telemetry_interval_ms']);
    });

    it('filters ignored schema fields', () => {
      const resource: Resource = {
        ...resourceWithSchema,
        schema: {
          ...resourceWithSchema.schema,
          children: [
            { type: 'number', key: 'value', label: 'Value', required: true },
            { type: 'string', key: 'internal_id', label: 'Internal ID', required: false, __shouldIgnore: true },
          ],
        },
      };

      const fields = ListFieldResolver.resolveFields(resource, listOpWithArrayResponse);
      expect(fields.map((field) => field.key)).toEqual(['value']);
    });
  });

  describe('isSingletonResponse', () => {
    it('returns true when list response schema is an object', () => {
      expect(ListFieldResolver.isSingletonResponse(listOpWithObjectResponse)).toBe(true);
    });

    it('returns false when list response schema is an array', () => {
      expect(ListFieldResolver.isSingletonResponse(listOpWithArrayResponse)).toBe(false);
    });

    it('returns false when list operation is missing', () => {
      expect(ListFieldResolver.isSingletonResponse(undefined)).toBe(false);
    });
  });

  describe('resolveColumns', () => {
    it('limits visible columns to the default limit', () => {
      const resource: Resource = {
        ...resourceWithSchema,
        schema: {
          ...resourceWithSchema.schema,
          children: Array.from({ length: 10 }, (_, index) => ({
            type: 'string' as const,
            key: `field_${index}`,
            label: `Field ${index}`,
            required: false,
          })),
        },
      };

      const columns = ListFieldResolver.resolveColumns(resource, listOpWithArrayResponse);
      expect(columns).toHaveLength(6);
      expect(columns.map((column) => column.key)).toEqual([
        'field_0',
        'field_1',
        'field_2',
        'field_3',
        'field_4',
        'field_5',
      ]);
    });
  });

  describe('resolveChartConfig', () => {
    it('prefers resource schema chart config', () => {
      const chartConfig = { type: 'line' as const, xKey: 'timestamp', yKey: 'value' };
      const resource: Resource = {
        ...resourceWithSchema,
        schema: {
          ...resourceWithSchema.schema,
          chartConfig,
        },
      };

      expect(ListFieldResolver.resolveChartConfig(resource, listOpWithArrayResponse)).toBe(chartConfig);
    });

    it('falls back to response schema chart config', () => {
      const chartConfig = { type: 'bar' as const, xKey: 'label', yKey: 'count' };
      const listOp: Operation = {
        ...listOpWithArrayResponse,
        responses: {
          '200': {
            schema: {
              ...listOpWithArrayResponse.responses['200']!.schema!,
              chartConfig,
            },
          },
        },
      };

      expect(ListFieldResolver.resolveChartConfig(resourceWithoutSchema, listOp)).toBe(chartConfig);
    });
  });

  describe('resolveItemSchema', () => {
    it('returns array item schema for list responses', () => {
      expect(ListFieldResolver.resolveItemSchema(listOpWithArrayResponse)).toBe(
        listOpWithArrayResponse.responses['200']?.schema?.items,
      );
    });
  });
});
