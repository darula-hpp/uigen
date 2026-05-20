import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { SchemaNode } from '@uigen-dev/core';
import { ReadOnlyDataSection } from '../ReadOnlyDataSection';

const fields: SchemaNode[] = [
  { type: 'string', key: 'name', label: 'Name', required: true },
  { type: 'number', key: 'value', label: 'Value', required: true },
];

describe('ReadOnlyDataSection', () => {
  it('renders a titled section without description by default', () => {
    render(
      <ReadOnlyDataSection
        title="Sensor Details"
        fields={fields}
        data={{ name: 'CPU Temperature', value: 36.1, unit: 'C' }}
      />
    );

    expect(screen.getByRole('region', { name: 'Sensor Details' })).toBeInTheDocument();
    expect(screen.getByText('Sensor Details')).toBeInTheDocument();
    expect(screen.getByText('CPU Temperature')).toBeInTheDocument();
  });

  it('renders an optional description when provided', () => {
    render(
      <ReadOnlyDataSection
        title="Sensor Details"
        description="Current configuration"
        fields={fields}
        data={{ name: 'CPU Temperature', value: 36.1, unit: 'C' }}
      />
    );

    expect(screen.getByText('Current configuration')).toBeInTheDocument();
  });

  it('uses the action-result variant styling hook', () => {
    render(
      <ReadOnlyDataSection
        title="Take Reading result"
        variant="action-result"
        fields={fields}
        data={{ name: 'Reading', value: 36.1, unit: 'C' }}
      />
    );

    const section = screen.getByRole('region', { name: 'Take Reading result' });
    expect(section.className).toContain('border-primary/30');
    expect(section.className).toContain('bg-primary/5');
  });
});
