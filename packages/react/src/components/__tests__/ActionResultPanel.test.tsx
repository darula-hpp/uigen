import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Operation } from '@uigen-dev/core';
import { ActionResultPanel } from '../ActionResultPanel';

const operation: Operation = {
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
          { type: 'number', key: 'value', label: 'Reading Value', required: true },
          { type: 'string', key: 'unit', label: 'Unit', required: false },
        ],
      },
    },
  },
  viewHint: 'action',
};

describe('ActionResultPanel', () => {
  it('renders structured action response fields', () => {
    render(
      <ActionResultPanel
        operation={operation}
        data={{ value: 36.145, unit: 'C' }}
      />
    );

    expect(screen.getByRole('region', { name: 'Take Reading result' })).toBeInTheDocument();
    expect(screen.getByText('Take Reading result')).toBeInTheDocument();
    expect(screen.getByText('Latest response returned by this action.')).toBeInTheDocument();
    expect(screen.getByText('Reading Value')).toBeInTheDocument();
    expect(screen.getByText('36.15')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.queryByText('Unit')).not.toBeInTheDocument();
  });
});
