import { describe, it, expect } from 'vitest';
import type { Operation } from '@uigen-dev/core';
import { resolveActionResultFields } from '../resolve-action-result-fields';

const baseOperation: Operation = {
  id: 'create_sensor_reading',
  method: 'POST',
  path: '/api/v1/sensors/{sensor_id}/readings',
  summary: 'Take Reading',
  parameters: [],
  responses: {
    '201': {
      description: 'Created',
      schema: {
        type: 'object',
        key: 'Reading',
        label: 'Reading',
        required: false,
        children: [
          { type: 'integer', key: 'id', label: 'ID', required: true },
          { type: 'number', key: 'value', label: 'Reading Value', required: true },
          { type: 'string', key: 'unit', label: 'Unit', required: false },
          { type: 'string', key: 'recorded_at', label: 'Recorded At', required: false, format: 'date-time' },
        ],
      },
    },
  },
  viewHint: 'action',
};

describe('resolveActionResultFields', () => {
  it('uses response schema fields when available', () => {
    const fields = resolveActionResultFields(baseOperation, {
      id: 10,
      value: 36.1,
      unit: 'C',
      recorded_at: '2026-05-20T14:38:21Z',
    });

    expect(fields.map((field) => field.key)).toEqual(['id', 'value', 'unit', 'recorded_at']);
    expect(fields.find((field) => field.key === 'value')?.label).toBe('Reading Value');
  });

  it('falls back to response payload keys when schema children are empty', () => {
    const operation: Operation = {
      ...baseOperation,
      responses: {
        '200': {
          description: 'OK',
          schema: {
            type: 'object',
            key: 'Result',
            label: 'Result',
            required: false,
            children: [],
          },
        },
      },
    };

    const fields = resolveActionResultFields(operation, {
      status: 'accepted',
      job_id: 'abc-123',
    });

    expect(fields.map((field) => field.key)).toEqual(['status', 'job_id']);
  });
});
