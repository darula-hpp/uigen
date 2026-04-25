import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FieldRow } from '../FieldRow';
import type { FieldNode } from '../../../lib/spec-parser';

describe('FieldRow', () => {
  const mockField: FieldNode = {
    key: 'email',
    label: 'Email Address',
    type: 'string',
    format: 'email',
    path: 'User.email',
    required: true,
    annotations: {},
  };

  const mockOnPortMouseDown = vi.fn();

  it('renders field label correctly', () => {
    render(
      <FieldRow
        field={mockField}
        resourceSlug="users"
        onPortMouseDown={mockOnPortMouseDown}
      />
    );

    expect(screen.getByText('Email Address')).toBeInTheDocument();
  });

  it('renders field type badge correctly', () => {
    render(
      <FieldRow
        field={mockField}
        resourceSlug="users"
        onPortMouseDown={mockOnPortMouseDown}
      />
    );

    expect(screen.getByText('string')).toBeInTheDocument();
  });

  it('renders ConnectionPort with correct fieldPath', () => {
    render(
      <FieldRow
        field={mockField}
        resourceSlug="users"
        onPortMouseDown={mockOnPortMouseDown}
      />
    );

    const port = screen.getByRole('button', { name: /Connect from User\.email/i });
    expect(port).toBeInTheDocument();
  });

  it('applies hover background effect', () => {
    const { container } = render(
      <FieldRow
        field={mockField}
        resourceSlug="users"
        onPortMouseDown={mockOnPortMouseDown}
      />
    );

    const fieldRow = container.firstChild as HTMLElement;
    expect(fieldRow).toHaveClass('hover:bg-gray-50');
    expect(fieldRow).toHaveClass('dark:hover:bg-gray-700');
  });

  it('propagates port mousedown event to handler', async () => {
    const user = userEvent.setup();
    render(
      <FieldRow
        field={mockField}
        resourceSlug="users"
        onPortMouseDown={mockOnPortMouseDown}
      />
    );

    const port = screen.getByRole('button', { name: /Connect from User\.email/i });
    await user.pointer({ keys: '[MouseLeft>]', target: port });

    expect(mockOnPortMouseDown).toHaveBeenCalledWith(
      'User.email',
      expect.any(Object)
    );
  });

  it('uses flexbox layout for proper alignment', () => {
    const { container } = render(
      <FieldRow
        field={mockField}
        resourceSlug="users"
        onPortMouseDown={mockOnPortMouseDown}
      />
    );

    const fieldRow = container.firstChild as HTMLElement;
    expect(fieldRow).toHaveClass('flex');
    expect(fieldRow).toHaveClass('items-center');
    expect(fieldRow).toHaveClass('gap-2');
  });

  it('renders different field types correctly', () => {
    const numberField: FieldNode = {
      key: 'age',
      label: 'Age',
      type: 'number',
      path: 'User.age',
      required: false,
      annotations: {},
    };

    render(
      <FieldRow
        field={numberField}
        resourceSlug="users"
        onPortMouseDown={mockOnPortMouseDown}
      />
    );

    expect(screen.getByText('Age')).toBeInTheDocument();
    expect(screen.getByText('number')).toBeInTheDocument();
  });

  it('handles long field labels with truncation', () => {
    const longLabelField: FieldNode = {
      key: 'veryLongFieldName',
      label: 'This is a very long field label that should be truncated',
      type: 'string',
      path: 'User.veryLongFieldName',
      required: false,
      annotations: {},
    };

    const { container } = render(
      <FieldRow
        field={longLabelField}
        resourceSlug="users"
        onPortMouseDown={mockOnPortMouseDown}
      />
    );

    const label = screen.getByText('This is a very long field label that should be truncated');
    expect(label).toHaveClass('truncate');
  });

  it('applies compact row styling', () => {
    const { container } = render(
      <FieldRow
        field={mockField}
        resourceSlug="users"
        onPortMouseDown={mockOnPortMouseDown}
      />
    );

    const fieldRow = container.firstChild as HTMLElement;
    expect(fieldRow).toHaveClass('px-2');
    expect(fieldRow).toHaveClass('py-1.5');
    expect(fieldRow).toHaveClass('text-sm');
  });
});
