import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { SchemaNode } from '@uigen-dev/core';
import { ReadOnlyFieldsLayout } from '../ReadOnlyFieldsLayout';

const fields: SchemaNode[] = [
  { type: 'number', key: 'value', label: 'Reading Value', required: true },
  { type: 'string', key: 'unit', label: 'Unit', required: false },
  { type: 'string', key: 'name', label: 'Sensor Name', required: true },
  { type: 'integer', key: 'id', label: 'ID', required: true },
  { type: 'boolean', key: 'enabled', label: 'Enabled', required: false },
];

describe('ReadOnlyFieldsLayout', () => {
  it('renders numeric fields as metric cards and other fields as detail rows', () => {
    render(
      <ReadOnlyFieldsLayout
        fields={fields}
        data={{
          value: 36.145,
          unit: 'C',
          name: 'Internal CPU Temperature',
          id: 1,
          enabled: true,
        }}
      />
    );

    expect(screen.getByText('Reading Value')).toBeInTheDocument();
    expect(screen.getByText('36.15')).toBeInTheDocument();
    expect(screen.queryByText('Unit')).not.toBeInTheDocument();
    expect(screen.getByText('Sensor Name')).toBeInTheDocument();
    expect(screen.getByText('Internal CPU Temperature')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
  });
});
