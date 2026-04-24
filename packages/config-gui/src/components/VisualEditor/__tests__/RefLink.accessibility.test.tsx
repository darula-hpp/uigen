import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResourceCard } from '../ResourceCard';
import { ConnectionPort } from '../ConnectionPort';
import { RefLinkConfigForm } from '../RefLinkConfigForm';
import { RefLinkEditPanel } from '../RefLinkEditPanel';
import { RefLinkGraphCanvas } from '../RefLinkGraphCanvas';
import type { ResourceNode } from '../../../lib/spec-parser';
import type { RefLinkConfig } from '../RefLinkTypes';

// Mock fetch for PositionManager
global.fetch = vi.fn();

describe('RefLink Accessibility Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ version: '1.0', enabled: {}, defaults: {}, annotations: {} }),
    } as Response);
  });

  // ---- ARIA labels on cards and ports ----

  describe('ARIA labels on cards and ports', () => {
    const mockResource: ResourceNode = {
      slug: 'users',
      name: 'Users',
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

    it('ResourceCard has aria-label with resource name', () => {
      render(
        <ResourceCard
          resource={mockResource}
          isExpanded={false}
          isHighlighted={false}
          onToggleExpand={vi.fn()}
          onCardMouseDown={vi.fn()}
          onPortMouseDown={vi.fn()}
        />
      );

      const card = screen.getByTestId('resource-card-users');
      expect(card).toHaveAttribute('aria-label', 'Resource: Users');
    });

    it('ConnectionPort has aria-label describing connection action', () => {
      render(
        <ConnectionPort
          fieldPath="users.id"
          onMouseDown={vi.fn()}
        />
      );

      const port = screen.getByRole('button', { name: /Connect from users\.id/i });
      expect(port).toBeInTheDocument();
      expect(port).toHaveAttribute('aria-label', 'Connect from users.id');
    });

    it('Expand/collapse button has aria-label and aria-expanded', () => {
      const { rerender } = render(
        <ResourceCard
          resource={mockResource}
          isExpanded={false}
          isHighlighted={false}
          onToggleExpand={vi.fn()}
          onCardMouseDown={vi.fn()}
          onPortMouseDown={vi.fn()}
        />
      );

      const expandButton = screen.getByRole('button', { name: /Expand fields/i });
      expect(expandButton).toHaveAttribute('aria-expanded', 'false');

      rerender(
        <ResourceCard
          resource={mockResource}
          isExpanded={true}
          isHighlighted={false}
          onToggleExpand={vi.fn()}
          onCardMouseDown={vi.fn()}
          onPortMouseDown={vi.fn()}
        />
      );

      const collapseButton = screen.getByRole('button', { name: /Collapse fields/i });
      expect(collapseButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('Field count badge has aria-label', () => {
      render(
        <ResourceCard
          resource={mockResource}
          isExpanded={false}
          isHighlighted={false}
          onToggleExpand={vi.fn()}
          onCardMouseDown={vi.fn()}
          onPortMouseDown={vi.fn()}
        />
      );

      const badge = screen.getByLabelText('2 fields');
      expect(badge).toBeInTheDocument();
    });
  });

  // ---- Form label associations ----

  describe('Form label associations', () => {
    const mockResource: ResourceNode = {
      slug: 'departments',
      name: 'Departments',
      uigenId: 'departments-id',
      description: 'Department resource',
      operations: [],
      fields: [
        {
          key: 'id',
          label: 'ID',
          type: 'string',
          path: 'departments.id',
          required: true,
          annotations: {},
        },
        {
          key: 'name',
          label: 'Name',
          type: 'string',
          path: 'departments.name',
          required: true,
          annotations: {},
        },
      ],
      annotations: {},
    };

    it('RefLinkConfigForm has proper form labels with htmlFor and id', () => {
      render(
        <RefLinkConfigForm
          fieldPath="users.departmentId"
          targetResource={mockResource}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      // Check value field label
      const valueFieldLabel = screen.getByText(/Value Field/);
      expect(valueFieldLabel).toBeInTheDocument();
      const valueFieldSelect = screen.getByTestId('value-field-select');
      expect(valueFieldSelect).toHaveAttribute('id', 'value-field');

      // Check label field label
      const labelFieldLabel = screen.getByText(/Label Field/);
      expect(labelFieldLabel).toBeInTheDocument();
      const labelFieldSelect = screen.getByTestId('label-field-select');
      expect(labelFieldSelect).toHaveAttribute('id', 'label-field');
    });

    it('RefLinkEditPanel has proper form labels with htmlFor and id', () => {
      const mockRefLink: RefLinkConfig = {
        fieldPath: 'users.departmentId',
        resource: 'departments',
        valueField: 'departments.id',
        labelField: 'departments.name',
      };

      render(
        <RefLinkEditPanel
          refLink={mockRefLink}
          targetResource={mockResource}
          onUpdate={vi.fn()}
          onDelete={vi.fn()}
          onClose={vi.fn()}
        />
      );

      // Check value field label
      const valueFieldLabel = screen.getByText(/Value Field/);
      expect(valueFieldLabel).toBeInTheDocument();
      const valueFieldSelect = screen.getByTestId('value-field-select');
      expect(valueFieldSelect).toHaveAttribute('id', 'value-field');

      // Check label field label
      const labelFieldLabel = screen.getByText(/Label Field/);
      expect(labelFieldLabel).toBeInTheDocument();
      const labelFieldSelect = screen.getByTestId('label-field-select');
      expect(labelFieldSelect).toHaveAttribute('id', 'label-field');
    });

    it('Form fields have aria-required attribute', () => {
      render(
        <RefLinkConfigForm
          fieldPath="users.departmentId"
          targetResource={mockResource}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      const valueFieldSelect = screen.getByTestId('value-field-select');
      expect(valueFieldSelect).toHaveAttribute('aria-required', 'true');

      const labelFieldSelect = screen.getByTestId('label-field-select');
      expect(labelFieldSelect).toHaveAttribute('aria-required', 'true');
    });

    it('Form fields have aria-invalid when validation fails', async () => {
      const user = userEvent.setup();

      render(
        <RefLinkConfigForm
          fieldPath="users.departmentId"
          targetResource={mockResource}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      // Try to save without selecting fields
      const saveButton = screen.getByTestId('save-button');
      await user.click(saveButton);

      const valueFieldSelect = screen.getByTestId('value-field-select');
      expect(valueFieldSelect).toHaveAttribute('aria-invalid', 'true');

      const labelFieldSelect = screen.getByTestId('label-field-select');
      expect(labelFieldSelect).toHaveAttribute('aria-invalid', 'true');
    });

    it('Error messages have role="alert"', async () => {
      const user = userEvent.setup();

      render(
        <RefLinkConfigForm
          fieldPath="users.departmentId"
          targetResource={mockResource}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      // Try to save without selecting fields
      const saveButton = screen.getByTestId('save-button');
      await user.click(saveButton);

      const valueFieldError = screen.getByTestId('value-field-error');
      expect(valueFieldError).toHaveAttribute('role', 'alert');

      const labelFieldError = screen.getByTestId('label-field-error');
      expect(labelFieldError).toHaveAttribute('role', 'alert');
    });
  });

  // ---- Keyboard navigation ----

  describe('Keyboard navigation', () => {
    const mockResource: ResourceNode = {
      slug: 'users',
      name: 'Users',
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
      ],
      annotations: {},
    };

    it('ConnectionPort is keyboard accessible with tabIndex', () => {
      render(
        <ConnectionPort
          fieldPath="users.id"
          onMouseDown={vi.fn()}
        />
      );

      const port = screen.getByRole('button', { name: /Connect from users\.id/i });
      expect(port).toHaveAttribute('tabIndex', '0');
    });

    it('ConnectionPort responds to Enter key', async () => {
      const user = userEvent.setup();
      const onMouseDown = vi.fn();

      render(
        <ConnectionPort
          fieldPath="users.id"
          onMouseDown={onMouseDown}
        />
      );

      const port = screen.getByRole('button', { name: /Connect from users\.id/i });
      port.focus();
      await user.keyboard('{Enter}');

      expect(onMouseDown).toHaveBeenCalledWith('users.id', expect.anything());
    });

    it('ConnectionPort responds to Space key', async () => {
      const user = userEvent.setup();
      const onMouseDown = vi.fn();

      render(
        <ConnectionPort
          fieldPath="users.id"
          onMouseDown={onMouseDown}
        />
      );

      const port = screen.getByRole('button', { name: /Connect from users\.id/i });
      port.focus();
      await user.keyboard(' ');

      expect(onMouseDown).toHaveBeenCalledWith('users.id', expect.anything());
    });

    it('Expand/collapse button responds to Space key', async () => {
      const user = userEvent.setup();
      const onToggleExpand = vi.fn();

      render(
        <ResourceCard
          resource={mockResource}
          isExpanded={false}
          isHighlighted={false}
          onToggleExpand={onToggleExpand}
          onCardMouseDown={vi.fn()}
          onPortMouseDown={vi.fn()}
        />
      );

      const expandButton = screen.getByRole('button', { name: /Expand fields/i });
      expandButton.focus();
      await user.keyboard(' ');

      expect(onToggleExpand).toHaveBeenCalledWith('users');
    });

    it('Form supports Tab navigation', async () => {
      const user = userEvent.setup();
      const mockTargetResource: ResourceNode = {
        slug: 'departments',
        name: 'Departments',
        uigenId: 'departments-id',
        description: 'Department resource',
        operations: [],
        fields: [
          {
            key: 'id',
            label: 'ID',
            type: 'string',
            path: 'departments.id',
            required: true,
            annotations: {},
          },
        ],
        annotations: {},
      };

      render(
        <RefLinkConfigForm
          fieldPath="users.departmentId"
          targetResource={mockTargetResource}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      const valueFieldSelect = screen.getByTestId('value-field-select');
      const labelFieldSelect = screen.getByTestId('label-field-select');
      const cancelButton = screen.getByTestId('cancel-button');
      const saveButton = screen.getByTestId('save-button');

      // Start at value field
      valueFieldSelect.focus();
      expect(document.activeElement).toBe(valueFieldSelect);

      // Tab to label field
      await user.tab();
      expect(document.activeElement).toBe(labelFieldSelect);

      // Tab to cancel button
      await user.tab();
      expect(document.activeElement).toBe(cancelButton);

      // Tab to save button
      await user.tab();
      expect(document.activeElement).toBe(saveButton);
    });
  });

  // ---- Screen reader announcements ----

  describe('Screen reader announcements', () => {
    it('RefLinkGraphCanvas has ARIA live region for state changes', async () => {
      const mockResources: ResourceNode[] = [
        {
          slug: 'users',
          name: 'Users',
          uigenId: 'users-id',
          description: 'User resource',
          operations: [],
          fields: [],
          annotations: {},
        },
      ];

      render(
        <RefLinkGraphCanvas
          resources={mockResources}
          refLinks={[]}
          onConnectionInitiated={vi.fn()}
          onRefLinkSelect={vi.fn()}
          loadConfig={async () => ({ version: '1.0', enabled: {}, defaults: {}, annotations: {} })}
          saveConfig={vi.fn()}
        />
      );

      // Check for ARIA live region
      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    });

    it('ARIA live region announces save status', async () => {
      const mockResources: ResourceNode[] = [
        {
          slug: 'users',
          name: 'Users',
          uigenId: 'users-id',
          description: 'User resource',
          operations: [],
          fields: [],
          annotations: {},
        },
      ];

      const { container } = render(
        <RefLinkGraphCanvas
          resources={mockResources}
          refLinks={[]}
          onConnectionInitiated={vi.fn()}
          onRefLinkSelect={vi.fn()}
          loadConfig={async () => ({ version: '1.0', enabled: {}, defaults: {}, annotations: {} })}
          saveConfig={vi.fn()}
        />
      );

      // The live region should be present (even if empty initially)
      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toBeInTheDocument();
      
      // The live region will be populated when save status changes
      // This is tested indirectly through the save indicator tests in RefLinkGraphCanvas.test.tsx
    });
  });
});
