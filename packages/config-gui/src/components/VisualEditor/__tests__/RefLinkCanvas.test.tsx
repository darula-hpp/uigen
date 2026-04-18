import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RefLinkCanvas } from '../RefLinkCanvas.js';
import type { SpecStructure } from '../../../types/index.js';
import type { ConfigFile } from '@uigen-dev/core';
import { AppContext } from '../../../contexts/AppContext.js';
import type { AppContextValue } from '../../../contexts/AppContext.js';

// --- Test fixtures ---

const mockStructure: SpecStructure = {
  resources: [
    {
      name: 'User',
      slug: 'User',
      uigenId: 'user-resource',
      operations: [],
      fields: [
        { key: 'id', label: 'ID', type: 'string', path: 'User.id', required: true, annotations: {} },
        { key: 'email', label: 'Email', type: 'string', path: 'User.email', required: true, annotations: {} },
        { key: 'roleId', label: 'Role ID', type: 'string', path: 'User.roleId', required: false, annotations: {} }
      ],
      annotations: {}
    },
    {
      name: 'Role',
      slug: 'Role',
      uigenId: 'role-resource',
      operations: [],
      fields: [
        { key: 'id', label: 'ID', type: 'string', path: 'Role.id', required: true, annotations: {} },
        { key: 'name', label: 'Name', type: 'string', path: 'Role.name', required: true, annotations: {} }
      ],
      annotations: {}
    }
  ]
};

const emptyConfig: ConfigFile = {
  version: '1.0',
  enabled: {},
  defaults: {},
  annotations: {}
};

const configWithRefLink: ConfigFile = {
  version: '1.0',
  enabled: {},
  defaults: {},
  annotations: {
    'User.roleId': {
      'x-uigen-ref': {
        resource: 'Role',
        valueField: 'id',
        labelField: 'name'
      }
    }
  }
};

// --- Helper to render with context ---

function renderWithContext(
  config: ConfigFile,
  saveConfig = vi.fn()
) {
  const contextValue: AppContextValue = {
    state: {
      config,
      handlers: [],
      annotations: [],
      isLoading: false,
      error: null,
      configPath: '.uigen/config.yaml'
    },
    actions: {
      loadConfig: vi.fn(),
      saveConfig,
      updateConfig: vi.fn(),
      setError: vi.fn(),
      clearError: vi.fn()
    }
  };

  return render(
    <AppContext.Provider value={contextValue}>
      <RefLinkCanvas structure={mockStructure} />
    </AppContext.Provider>
  );
}

// --- Tests ---

describe('RefLinkCanvas', () => {
  describe('rendering', () => {
    it('renders the canvas container', () => {
      renderWithContext(emptyConfig);
      expect(screen.getByTestId('ref-link-canvas')).toBeInTheDocument();
    });

    it('shows empty state when no ref links exist', () => {
      renderWithContext(emptyConfig);
      expect(screen.getByText(/No ref links configured/i)).toBeInTheDocument();
    });

    it('renders resource drop zones for each resource', () => {
      renderWithContext(emptyConfig);
      expect(screen.getByTestId('resource-drop-zone-User')).toBeInTheDocument();
      expect(screen.getByTestId('resource-drop-zone-Role')).toBeInTheDocument();
    });

    it('displays resource names in drop zones', () => {
      renderWithContext(emptyConfig);
      expect(screen.getByText('User')).toBeInTheDocument();
      expect(screen.getByText('Role')).toBeInTheDocument();
    });

    it('shows field pills inside resource drop zones', () => {
      renderWithContext(emptyConfig);
      // User resource fields - 'id' appears in both User and Role, use getAllByText
      expect(screen.getAllByText('id').length).toBeGreaterThan(0);
      expect(screen.getByText('email')).toBeInTheDocument();
    });
  });

  describe('existing ref links', () => {
    it('displays existing ref links', () => {
      renderWithContext(configWithRefLink);
      expect(screen.getByTestId('ref-links-list')).toBeInTheDocument();
      expect(screen.getByTestId('ref-link-item')).toBeInTheDocument();
    });

    it('shows field path, resource, valueField and labelField for each link', () => {
      renderWithContext(configWithRefLink);
      expect(screen.getByText('User.roleId')).toBeInTheDocument();
      // Role appears as resource name in the link
      const roleTexts = screen.getAllByText('Role');
      expect(roleTexts.length).toBeGreaterThan(0);
    });

    it('shows delete button for each existing link', () => {
      renderWithContext(configWithRefLink);
      expect(screen.getByTestId('delete-ref-link')).toBeInTheDocument();
    });

    it('calls saveConfig with ref removed when delete is clicked', () => {
      const saveConfig = vi.fn();
      renderWithContext(configWithRefLink, saveConfig);

      fireEvent.click(screen.getByTestId('delete-ref-link'));

      expect(saveConfig).toHaveBeenCalledOnce();
      const savedConfig = saveConfig.mock.calls[0][0] as ConfigFile;
      expect(savedConfig.annotations['User.roleId']).toBeUndefined();
    });

    it('does not show links for resources that no longer exist in structure', () => {
      const configWithOrphanLink: ConfigFile = {
        ...emptyConfig,
        annotations: {
          'User.roleId': {
            'x-uigen-ref': {
              resource: 'NonExistentResource',
              valueField: 'id',
              labelField: 'name'
            }
          }
        }
      };
      renderWithContext(configWithOrphanLink);
      expect(screen.queryByTestId('ref-links-list')).not.toBeInTheDocument();
      expect(screen.getByText(/No ref links configured/i)).toBeInTheDocument();
    });
  });

  describe('drag and drop', () => {
    it('shows drag-over highlight when dragging over a resource', () => {
      renderWithContext(emptyConfig);
      const roleDropZone = screen.getByTestId('resource-drop-zone-Role');

      fireEvent.dragOver(roleDropZone, {
        dataTransfer: { getData: () => 'User.roleId', dropEffect: '' }
      });

      expect(roleDropZone).toHaveClass('border-blue-400');
    });

    it('removes drag-over highlight on drag leave', () => {
      renderWithContext(emptyConfig);
      const roleDropZone = screen.getByTestId('resource-drop-zone-Role');

      fireEvent.dragOver(roleDropZone, {
        dataTransfer: { getData: () => 'User.roleId', dropEffect: '' }
      });
      fireEvent.dragLeave(roleDropZone);

      expect(roleDropZone).not.toHaveClass('border-blue-400');
    });

    it('opens pending link form after a valid drop', () => {
      renderWithContext(emptyConfig);
      const roleDropZone = screen.getByTestId('resource-drop-zone-Role');

      fireEvent.drop(roleDropZone, {
        dataTransfer: { getData: () => 'User.roleId' }
      });

      expect(screen.getByTestId('pending-link-form')).toBeInTheDocument();
    });

    it('shows the field path and target resource in the pending form', () => {
      renderWithContext(emptyConfig);
      const roleDropZone = screen.getByTestId('resource-drop-zone-Role');

      fireEvent.drop(roleDropZone, {
        dataTransfer: { getData: () => 'User.roleId' }
      });

      expect(screen.getByText('User.roleId')).toBeInTheDocument();
    });

    it('does not open form when dropping a field onto its own resource', () => {
      renderWithContext(emptyConfig);
      const userDropZone = screen.getByTestId('resource-drop-zone-User');

      fireEvent.drop(userDropZone, {
        dataTransfer: { getData: () => 'User.email' }
      });

      expect(screen.queryByTestId('pending-link-form')).not.toBeInTheDocument();
    });

    it('does not open form when drop has no field path', () => {
      renderWithContext(emptyConfig);
      const roleDropZone = screen.getByTestId('resource-drop-zone-Role');

      fireEvent.drop(roleDropZone, {
        dataTransfer: { getData: () => '' }
      });

      expect(screen.queryByTestId('pending-link-form')).not.toBeInTheDocument();
    });
  });

  describe('pending link form', () => {
    beforeEach(() => {
      renderWithContext(emptyConfig);
      const roleDropZone = screen.getByTestId('resource-drop-zone-Role');
      fireEvent.drop(roleDropZone, {
        dataTransfer: { getData: () => 'User.roleId' }
      });
    });

    it('renders valueField and labelField selects', () => {
      expect(screen.getByTestId('value-field-select')).toBeInTheDocument();
      expect(screen.getByTestId('label-field-select')).toBeInTheDocument();
    });

    it('populates selects with target resource fields', () => {
      const valueSelect = screen.getByTestId('value-field-select');
      expect(valueSelect).toContainHTML('id');
      expect(valueSelect).toContainHTML('name');
    });

    it('shows validation error when confirming with empty valueField', () => {
      fireEvent.click(screen.getByTestId('confirm-link-button'));
      expect(screen.getByTestId('value-field-error')).toBeInTheDocument();
    });

    it('shows validation error when confirming with empty labelField', () => {
      // Select valueField but leave labelField empty
      fireEvent.change(screen.getByTestId('value-field-select'), { target: { value: 'id' } });
      fireEvent.click(screen.getByTestId('confirm-link-button'));
      expect(screen.getByTestId('label-field-error')).toBeInTheDocument();
    });

    it('closes the form when cancel is clicked', () => {
      fireEvent.click(screen.getByTestId('cancel-link-button'));
      expect(screen.queryByTestId('pending-link-form')).not.toBeInTheDocument();
    });

    it('calls saveConfig with correct ref annotation on confirm', () => {
      // The beforeEach already rendered with a default saveConfig mock.
      // We need a fresh render with a tracked saveConfig - use a container.
      const saveConfig = vi.fn();
      const contextValue: AppContextValue = {
        state: {
          config: emptyConfig,
          handlers: [],
          annotations: [],
          isLoading: false,
          error: null,
          configPath: '.uigen/config.yaml'
        },
        actions: {
          loadConfig: vi.fn(),
          saveConfig,
          updateConfig: vi.fn(),
          setError: vi.fn(),
          clearError: vi.fn()
        }
      };

      const container = document.createElement('div');
      document.body.appendChild(container);

      const { unmount } = render(
        <AppContext.Provider value={contextValue}>
          <RefLinkCanvas structure={mockStructure} />
        </AppContext.Provider>,
        { container }
      );

      const { getByTestId } = { getByTestId: (id: string) => container.querySelector(`[data-testid="${id}"]`) as HTMLElement };

      fireEvent.drop(getByTestId('resource-drop-zone-Role'), {
        dataTransfer: { getData: () => 'User.roleId' }
      });

      fireEvent.change(getByTestId('value-field-select'), { target: { value: 'id' } });
      fireEvent.change(getByTestId('label-field-select'), { target: { value: 'name' } });
      fireEvent.click(getByTestId('confirm-link-button'));

      expect(saveConfig).toHaveBeenCalledOnce();
      const savedConfig = saveConfig.mock.calls[0][0] as ConfigFile;
      expect(savedConfig.annotations['User.roleId']).toEqual({
        'x-uigen-ref': {
          resource: 'Role',
          valueField: 'id',
          labelField: 'name'
        }
      });

      unmount();
      document.body.removeChild(container);
    });

    it('closes the form after successful save', () => {
      const saveConfig = vi.fn();
      const contextValue: AppContextValue = {
        state: {
          config: emptyConfig,
          handlers: [],
          annotations: [],
          isLoading: false,
          error: null,
          configPath: '.uigen/config.yaml'
        },
        actions: {
          loadConfig: vi.fn(),
          saveConfig,
          updateConfig: vi.fn(),
          setError: vi.fn(),
          clearError: vi.fn()
        }
      };

      const container = document.createElement('div');
      document.body.appendChild(container);

      const { unmount } = render(
        <AppContext.Provider value={contextValue}>
          <RefLinkCanvas structure={mockStructure} />
        </AppContext.Provider>,
        { container }
      );

      const getEl = (id: string) => container.querySelector(`[data-testid="${id}"]`) as HTMLElement;

      fireEvent.drop(getEl('resource-drop-zone-Role'), {
        dataTransfer: { getData: () => 'User.roleId' }
      });

      fireEvent.change(getEl('value-field-select'), { target: { value: 'id' } });
      fireEvent.change(getEl('label-field-select'), { target: { value: 'name' } });
      fireEvent.click(getEl('confirm-link-button'));

      expect(container.querySelector('[data-testid="pending-link-form"]')).not.toBeInTheDocument();

      unmount();
      document.body.removeChild(container);
    });
  });

  describe('validation', () => {
    it('clears validation error when user selects a valid field', () => {
      renderWithContext(emptyConfig);
      const roleDropZone = screen.getByTestId('resource-drop-zone-Role');
      fireEvent.drop(roleDropZone, {
        dataTransfer: { getData: () => 'User.roleId' }
      });

      // Trigger validation error
      fireEvent.click(screen.getByTestId('confirm-link-button'));
      expect(screen.getByTestId('value-field-error')).toBeInTheDocument();

      // Fix the error
      fireEvent.change(screen.getByTestId('value-field-select'), { target: { value: 'id' } });
      expect(screen.queryByTestId('value-field-error')).not.toBeInTheDocument();
    });
  });
});
