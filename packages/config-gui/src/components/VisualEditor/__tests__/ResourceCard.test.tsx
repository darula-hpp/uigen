import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResourceCard } from '../ResourceCard';
import type { ResourceNode } from '../../../lib/spec-parser';

describe('ResourceCard', () => {
  const mockResource: ResourceNode = {
    name: 'Users',
    slug: 'users',
    uigenId: 'users-id',
    description: 'User resource',
    operations: [],
    fields: [
      {
        key: 'id',
        label: 'ID',
        type: 'string',
        path: 'users.id',
        required: true,
        annotations: {},
      },
      {
        key: 'email',
        label: 'Email',
        type: 'string',
        format: 'email',
        path: 'users.email',
        required: true,
        annotations: {},
      },
      {
        key: 'name',
        label: 'Name',
        type: 'string',
        path: 'users.name',
        required: false,
        annotations: {},
      },
    ],
    annotations: {},
  };

  const mockOnToggleExpand = vi.fn();
  const mockOnCardMouseDown = vi.fn();
  const mockOnPortMouseDown = vi.fn();

  it('renders resource name in header', () => {
    render(
      <ResourceCard
        resource={mockResource}
        isExpanded={false}
        isHighlighted={false}
        onToggleExpand={mockOnToggleExpand}
        onCardMouseDown={mockOnCardMouseDown}
        onPortMouseDown={mockOnPortMouseDown}
      />
    );

    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  it('renders resource slug in header', () => {
    render(
      <ResourceCard
        resource={mockResource}
        isExpanded={false}
        isHighlighted={false}
        onToggleExpand={mockOnToggleExpand}
        onCardMouseDown={mockOnCardMouseDown}
        onPortMouseDown={mockOnPortMouseDown}
      />
    );

    expect(screen.getByText('users')).toBeInTheDocument();
  });

  it('displays field count badge when fields exist', () => {
    render(
      <ResourceCard
        resource={mockResource}
        isExpanded={false}
        isHighlighted={false}
        onToggleExpand={mockOnToggleExpand}
        onCardMouseDown={mockOnCardMouseDown}
        onPortMouseDown={mockOnPortMouseDown}
      />
    );

    const badge = screen.getByLabelText('3 fields');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('3');
  });

  it('does not display field count badge when no fields', () => {
    const resourceWithNoFields: ResourceNode = {
      ...mockResource,
      fields: [],
    };

    render(
      <ResourceCard
        resource={resourceWithNoFields}
        isExpanded={false}
        isHighlighted={false}
        onToggleExpand={mockOnToggleExpand}
        onCardMouseDown={mockOnCardMouseDown}
        onPortMouseDown={mockOnPortMouseDown}
      />
    );

    expect(screen.queryByLabelText(/\d+ field/)).not.toBeInTheDocument();
  });

  it('renders expand/collapse toggle button', () => {
    render(
      <ResourceCard
        resource={mockResource}
        isExpanded={false}
        isHighlighted={false}
        onToggleExpand={mockOnToggleExpand}
        onCardMouseDown={mockOnCardMouseDown}
        onPortMouseDown={mockOnPortMouseDown}
      />
    );

    const toggleButton = screen.getByRole('button', { name: 'Expand fields' });
    expect(toggleButton).toBeInTheDocument();
  });

  it('calls onToggleExpand when toggle button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ResourceCard
        resource={mockResource}
        isExpanded={false}
        isHighlighted={false}
        onToggleExpand={mockOnToggleExpand}
        onCardMouseDown={mockOnCardMouseDown}
        onPortMouseDown={mockOnPortMouseDown}
      />
    );

    const toggleButton = screen.getByRole('button', { name: 'Expand fields' });
    await user.click(toggleButton);

    expect(mockOnToggleExpand).toHaveBeenCalledWith('users');
  });

  it('updates toggle button label when expanded', () => {
    render(
      <ResourceCard
        resource={mockResource}
        isExpanded={true}
        isHighlighted={false}
        onToggleExpand={mockOnToggleExpand}
        onCardMouseDown={mockOnCardMouseDown}
        onPortMouseDown={mockOnPortMouseDown}
      />
    );

    const toggleButton = screen.getByRole('button', { name: 'Collapse fields' });
    expect(toggleButton).toBeInTheDocument();
  });

  it('renders field list when expanded', () => {
    render(
      <ResourceCard
        resource={mockResource}
        isExpanded={true}
        isHighlighted={false}
        onToggleExpand={mockOnToggleExpand}
        onCardMouseDown={mockOnCardMouseDown}
        onPortMouseDown={mockOnPortMouseDown}
      />
    );

    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
  });

  it('does not render field list when collapsed', () => {
    const { container } = render(
      <ResourceCard
        resource={mockResource}
        isExpanded={false}
        isHighlighted={false}
        onToggleExpand={mockOnToggleExpand}
        onCardMouseDown={mockOnCardMouseDown}
        onPortMouseDown={mockOnPortMouseDown}
      />
    );

    // Field list container should have max-height: 0 when collapsed
    const fieldListContainer = container.querySelector('.overflow-hidden');
    expect(fieldListContainer).toHaveStyle({ maxHeight: '0px' });
  });

  it('applies highlight styling when isHighlighted is true', () => {
    render(
      <ResourceCard
        resource={mockResource}
        isExpanded={false}
        isHighlighted={true}
        onToggleExpand={mockOnToggleExpand}
        onCardMouseDown={mockOnCardMouseDown}
        onPortMouseDown={mockOnPortMouseDown}
      />
    );

    const card = screen.getByTestId('resource-card-users');
    expect(card).toHaveClass('border-indigo-400');
    expect(card).toHaveClass('shadow-xl');
    expect(card).toHaveClass('ring-2');
    expect(card).toHaveClass('ring-indigo-300');
  });

  it('applies default styling when not highlighted', () => {
    render(
      <ResourceCard
        resource={mockResource}
        isExpanded={false}
        isHighlighted={false}
        onToggleExpand={mockOnToggleExpand}
        onCardMouseDown={mockOnCardMouseDown}
        onPortMouseDown={mockOnPortMouseDown}
      />
    );

    const card = screen.getByTestId('resource-card-users');
    expect(card).toHaveClass('border-gray-200');
    expect(card).toHaveClass('hover:border-indigo-300');
  });

  it('calls onCardMouseDown when header is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ResourceCard
        resource={mockResource}
        isExpanded={false}
        isHighlighted={false}
        onToggleExpand={mockOnToggleExpand}
        onCardMouseDown={mockOnCardMouseDown}
        onPortMouseDown={mockOnPortMouseDown}
      />
    );

    // Click on the resource name (part of the header)
    const resourceName = screen.getByText('Users');
    await user.pointer({ keys: '[MouseLeft>]', target: resourceName });

    expect(mockOnCardMouseDown).toHaveBeenCalledWith('users', expect.any(Object));
  });

  it('does not call onCardMouseDown when toggle button is clicked', async () => {
    const user = userEvent.setup();
    mockOnCardMouseDown.mockClear();

    render(
      <ResourceCard
        resource={mockResource}
        isExpanded={false}
        isHighlighted={false}
        onToggleExpand={mockOnToggleExpand}
        onCardMouseDown={mockOnCardMouseDown}
        onPortMouseDown={mockOnPortMouseDown}
      />
    );

    const toggleButton = screen.getByRole('button', { name: 'Expand fields' });
    await user.click(toggleButton);

    expect(mockOnCardMouseDown).not.toHaveBeenCalled();
  });

  it('has grab cursor on header', () => {
    const { container } = render(
      <ResourceCard
        resource={mockResource}
        isExpanded={false}
        isHighlighted={false}
        onToggleExpand={mockOnToggleExpand}
        onCardMouseDown={mockOnCardMouseDown}
        onPortMouseDown={mockOnPortMouseDown}
      />
    );

    const header = container.querySelector('.cursor-grab');
    expect(header).toBeInTheDocument();
  });

  it('has fixed width of 200px', () => {
    render(
      <ResourceCard
        resource={mockResource}
        isExpanded={false}
        isHighlighted={false}
        onToggleExpand={mockOnToggleExpand}
        onCardMouseDown={mockOnCardMouseDown}
        onPortMouseDown={mockOnPortMouseDown}
      />
    );

    const card = screen.getByTestId('resource-card-users');
    expect(card).toHaveClass('w-[200px]');
  });

  it('has proper ARIA label', () => {
    render(
      <ResourceCard
        resource={mockResource}
        isExpanded={false}
        isHighlighted={false}
        onToggleExpand={mockOnToggleExpand}
        onCardMouseDown={mockOnCardMouseDown}
        onPortMouseDown={mockOnPortMouseDown}
      />
    );

    const card = screen.getByLabelText('Resource: Users');
    expect(card).toBeInTheDocument();
  });

  it('propagates onPortMouseDown to FieldRow components', async () => {
    const user = userEvent.setup();
    render(
      <ResourceCard
        resource={mockResource}
        isExpanded={true}
        isHighlighted={false}
        onToggleExpand={mockOnToggleExpand}
        onCardMouseDown={mockOnCardMouseDown}
        onPortMouseDown={mockOnPortMouseDown}
      />
    );

    const port = screen.getByRole('button', { name: /Connect from users\.id/i });
    await user.pointer({ keys: '[MouseLeft>]', target: port });

    expect(mockOnPortMouseDown).toHaveBeenCalledWith('users.id', expect.any(Object));
  });

  it('rotates toggle icon when expanded', () => {
    const { container } = render(
      <ResourceCard
        resource={mockResource}
        isExpanded={true}
        isHighlighted={false}
        onToggleExpand={mockOnToggleExpand}
        onCardMouseDown={mockOnCardMouseDown}
        onPortMouseDown={mockOnPortMouseDown}
      />
    );

    const toggleIcon = container.querySelector('.rotate-180');
    expect(toggleIcon).toBeInTheDocument();
  });

  it('does not rotate toggle icon when collapsed', () => {
    const { container } = render(
      <ResourceCard
        resource={mockResource}
        isExpanded={false}
        isHighlighted={false}
        onToggleExpand={mockOnToggleExpand}
        onCardMouseDown={mockOnCardMouseDown}
        onPortMouseDown={mockOnPortMouseDown}
      />
    );

    const toggleIcon = container.querySelector('.rotate-180');
    expect(toggleIcon).not.toBeInTheDocument();
  });
});
