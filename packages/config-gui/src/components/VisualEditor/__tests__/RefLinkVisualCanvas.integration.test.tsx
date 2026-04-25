import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RefLinkVisualCanvas } from '../RefLinkVisualCanvas';
import type { SpecStructure } from '../../../types/index';
import type { ConfigFile } from '@uigen-dev/core';
import { useAppContext } from '../../../contexts/AppContext';

// Mock useAppContext
vi.mock('../../../contexts/AppContext', () => ({
  useAppContext: vi.fn(),
}));

// Mock child components to simplify integration testing
// We'll test the full workflow by simulating user interactions
let capturedOnConnectionInitiated: ((fieldPath: string, targetSlug: string) => void) | null = null;
let capturedOnRefLinkSelect: ((refLink: any) => void) | null = null;

vi.mock('../RefLinkGraphCanvas', () => ({
  RefLinkGraphCanvas: vi.fn((props) => {
    capturedOnConnectionInitiated = props.onConnectionInitiated;
    capturedOnRefLinkSelect = props.onRefLinkSelect;
    return (
      <div data-testid="ref-link-graph-canvas">
        <button
          data-testid="simulate-connection"
          onClick={() => props.onConnectionInitiated('users.departmentId', 'departments')}
        >
          Simulate Connection
        </button>
        {props.refLinks.map((link: any) => (
          <button
            key={link.fieldPath}
            data-testid={`select-link-${link.fieldPath}`}
            onClick={() => props.onRefLinkSelect(link)}
          >
            {link.fieldPath}
          </button>
        ))}
      </div>
    );
  }),
}));

let capturedConfigFormProps: any = null;

vi.mock('../RefLinkConfigForm', () => ({
  RefLinkConfigForm: vi.fn((props) => {
    capturedConfigFormProps = props;
    return (
      <div data-testid="ref-link-config-form">
        <span data-testid="config-form-field">{props.fieldPath}</span>
        <span data-testid="config-form-target">{props.targetResource.slug}</span>
        <button
          data-testid="config-form-save"
          onClick={() =>
            props.onConfirm({
              fieldPath: props.fieldPath,
              resource: props.targetResource.slug,
              valueField: 'departments.id',
              labelField: 'departments.name',
            })
          }
        >
          Save
        </button>
        <button data-testid="config-form-cancel" onClick={props.onCancel}>
          Cancel
        </button>
      </div>
    );
  }),
}));

let capturedEditPanelProps: any = null;

vi.mock('../RefLinkEditPanel', () => ({
  RefLinkEditPanel: vi.fn((props) => {
    capturedEditPanelProps = props;
    return (
      <div data-testid="ref-link-edit-panel">
        <span data-testid="edit-panel-field">{props.refLink.fieldPath}</span>
        <button
          data-testid="edit-panel-update"
          onClick={() =>
            props.onUpdate({
              ...props.refLink,
              valueField: 'departments.name',
              labelField: 'departments.id',
            })
          }
        >
          Update
        </button>
        <button data-testid="edit-panel-delete" onClick={props.onDelete}>
          Delete
        </button>
        <button data-testid="edit-panel-close" onClick={props.onClose}>
          Close
        </button>
      </div>
    );
  }),
}));

// Test fixtures
const mockStructure: SpecStructure = {
  resources: [
    {
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
          key: 'departmentId',
          label: 'Department ID',
          type: 'string',
          path: 'users.departmentId',
          required: false,
          annotations: {},
        },
      ],
      annotations: {},
    },
    {
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
    },
  ],
};

function makeConfig(annotations: ConfigFile['annotations'] = {}): ConfigFile {
  return { version: '1.0', enabled: {}, defaults: {}, annotations };
}

const mockSaveConfig = vi.fn();

function setupAppContext(config: ConfigFile | null) {
  vi.mocked(useAppContext).mockReturnValue({
    state: {
      config,
      handlers: [],
      annotations: [],
      isLoading: false,
      error: null,
      configPath: '.uigen/config.yaml',
      specPath: null,
      specStructure: mockStructure,
    },
    actions: {
      loadConfig: vi.fn(),
      saveConfig: mockSaveConfig,
      saveConfigImmediate: vi.fn(),
      updateConfig: vi.fn(),
      setError: vi.fn(),
      clearError: vi.fn(),
    },
  });
}

describe('RefLinkVisualCanvas Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnConnectionInitiated = null;
    capturedOnRefLinkSelect = null;
    capturedConfigFormProps = null;
    capturedEditPanelProps = null;
    setupAppContext(makeConfig());
  });

  // ---- End-to-end ref link creation workflow ----

  describe('End-to-end ref link creation workflow', () => {
    it('completes full workflow: connection initiated → config form → save → ref link created', async () => {
      const baseConfig = makeConfig({});
      mockSaveConfig.mockResolvedValue(undefined);
      setupAppContext(baseConfig);

      render(<RefLinkVisualCanvas structure={mockStructure} />);

      // Step 1: User initiates connection by dragging from port to resource
      const simulateButton = screen.getByTestId('simulate-connection');
      await userEvent.click(simulateButton);

      // Step 2: Config form opens
      expect(screen.getByTestId('ref-link-config-form')).toBeInTheDocument();
      expect(screen.getByTestId('config-form-field')).toHaveTextContent('users.departmentId');
      expect(screen.getByTestId('config-form-target')).toHaveTextContent('departments');

      // Step 3: User configures and saves
      const saveButton = screen.getByTestId('config-form-save');
      await userEvent.click(saveButton);

      // Step 4: Verify config was saved with correct annotation
      await waitFor(() => {
        expect(mockSaveConfig).toHaveBeenCalledWith(
          expect.objectContaining({
            annotations: expect.objectContaining({
              'users.departmentId': expect.objectContaining({
                'x-uigen-ref': {
                  resource: 'departments',
                  valueField: 'departments.id',
                  labelField: 'departments.name',
                },
              }),
            }),
          })
        );
      });

      // Step 5: Config form closes
      expect(screen.queryByTestId('ref-link-config-form')).not.toBeInTheDocument();
    });

    it('cancels ref link creation when user clicks cancel', async () => {
      render(<RefLinkVisualCanvas structure={mockStructure} />);

      // Initiate connection
      const simulateButton = screen.getByTestId('simulate-connection');
      await userEvent.click(simulateButton);

      expect(screen.getByTestId('ref-link-config-form')).toBeInTheDocument();

      // Cancel
      const cancelButton = screen.getByTestId('config-form-cancel');
      await userEvent.click(cancelButton);

      // Form closes without saving
      expect(screen.queryByTestId('ref-link-config-form')).not.toBeInTheDocument();
      expect(mockSaveConfig).not.toHaveBeenCalled();
    });

    it('does not open config form when target resource does not exist', async () => {
      render(<RefLinkVisualCanvas structure={mockStructure} />);

      // Simulate connection to non-existent resource
      act(() => {
        capturedOnConnectionInitiated!('users.departmentId', 'nonexistent');
      });

      // Form should not open
      expect(screen.queryByTestId('ref-link-config-form')).not.toBeInTheDocument();
    });
  });

  // ---- End-to-end ref link editing workflow ----

  describe('End-to-end ref link editing workflow', () => {
    it('completes full workflow: select link → edit panel → update → ref link updated', async () => {
      const baseConfig = makeConfig({
        'users.departmentId': {
          'x-uigen-ref': {
            resource: 'departments',
            valueField: 'departments.id',
            labelField: 'departments.name',
          },
        },
      });
      mockSaveConfig.mockResolvedValue(undefined);
      setupAppContext(baseConfig);

      render(<RefLinkVisualCanvas structure={mockStructure} />);

      // Step 1: User selects existing ref link
      const selectButton = screen.getByTestId('select-link-users.departmentId');
      await userEvent.click(selectButton);

      // Step 2: Edit panel opens
      expect(screen.getByTestId('ref-link-edit-panel')).toBeInTheDocument();
      expect(screen.getByTestId('edit-panel-field')).toHaveTextContent('users.departmentId');

      // Step 3: User updates and saves
      const updateButton = screen.getByTestId('edit-panel-update');
      await userEvent.click(updateButton);

      // Step 4: Verify config was updated
      await waitFor(() => {
        expect(mockSaveConfig).toHaveBeenCalledWith(
          expect.objectContaining({
            annotations: expect.objectContaining({
              'users.departmentId': expect.objectContaining({
                'x-uigen-ref': {
                  resource: 'departments',
                  valueField: 'departments.name',
                  labelField: 'departments.id',
                },
              }),
            }),
          })
        );
      });

      // Step 5: Edit panel closes
      expect(screen.queryByTestId('ref-link-edit-panel')).not.toBeInTheDocument();
    });

    it('closes edit panel when user clicks close without saving', async () => {
      const baseConfig = makeConfig({
        'users.departmentId': {
          'x-uigen-ref': {
            resource: 'departments',
            valueField: 'departments.id',
            labelField: 'departments.name',
          },
        },
      });
      setupAppContext(baseConfig);

      render(<RefLinkVisualCanvas structure={mockStructure} />);

      // Select link
      const selectButton = screen.getByTestId('select-link-users.departmentId');
      await userEvent.click(selectButton);

      expect(screen.getByTestId('ref-link-edit-panel')).toBeInTheDocument();

      // Close without saving
      const closeButton = screen.getByTestId('edit-panel-close');
      await userEvent.click(closeButton);

      // Panel closes without saving
      expect(screen.queryByTestId('ref-link-edit-panel')).not.toBeInTheDocument();
      expect(mockSaveConfig).not.toHaveBeenCalled();
    });
  });

  // ---- End-to-end ref link deletion workflow ----

  describe('End-to-end ref link deletion workflow', () => {
    it('completes full workflow: select link → edit panel → delete → ref link removed', async () => {
      const baseConfig = makeConfig({
        'users.departmentId': {
          'x-uigen-ref': {
            resource: 'departments',
            valueField: 'departments.id',
            labelField: 'departments.name',
          },
        },
      });
      mockSaveConfig.mockResolvedValue(undefined);
      setupAppContext(baseConfig);

      render(<RefLinkVisualCanvas structure={mockStructure} />);

      // Step 1: User selects existing ref link
      const selectButton = screen.getByTestId('select-link-users.departmentId');
      await userEvent.click(selectButton);

      // Step 2: Edit panel opens
      expect(screen.getByTestId('ref-link-edit-panel')).toBeInTheDocument();

      // Step 3: User deletes
      const deleteButton = screen.getByTestId('edit-panel-delete');
      await userEvent.click(deleteButton);

      // Step 4: Verify ref link was removed from config
      await waitFor(() => {
        const savedConfig = mockSaveConfig.mock.calls[0][0] as ConfigFile;
        expect(savedConfig.annotations['users.departmentId']).toBeUndefined();
      });

      // Step 5: Edit panel closes
      expect(screen.queryByTestId('ref-link-edit-panel')).not.toBeInTheDocument();
    });

    it('preserves other annotations when deleting ref link', async () => {
      const baseConfig = makeConfig({
        'users.departmentId': {
          'x-uigen-ref': {
            resource: 'departments',
            valueField: 'departments.id',
            labelField: 'departments.name',
          },
          'x-uigen-label': 'Department',
        },
      });
      mockSaveConfig.mockResolvedValue(undefined);
      setupAppContext(baseConfig);

      render(<RefLinkVisualCanvas structure={mockStructure} />);

      // Select and delete
      const selectButton = screen.getByTestId('select-link-users.departmentId');
      await userEvent.click(selectButton);

      const deleteButton = screen.getByTestId('edit-panel-delete');
      await userEvent.click(deleteButton);

      // Verify other annotations preserved
      await waitFor(() => {
        const savedConfig = mockSaveConfig.mock.calls[0][0] as ConfigFile;
        expect(savedConfig.annotations['users.departmentId']).toEqual({
          'x-uigen-label': 'Department',
        });
        expect(savedConfig.annotations['users.departmentId']['x-uigen-ref']).toBeUndefined();
      });
    });
  });

  // ---- Position persistence across component remounts ----

  describe('Position persistence across component remounts', () => {
    it('RefLinkGraphCanvas receives loadConfig and saveConfig props for position persistence', () => {
      render(<RefLinkVisualCanvas structure={mockStructure} />);

      // The canvas component is rendered and will handle position persistence internally
      // This is tested in detail in RefLinkGraphCanvas.test.tsx
      expect(screen.getByTestId('ref-link-graph-canvas')).toBeInTheDocument();
    });
  });

  // ---- Reset layout workflow ----

  describe('Reset layout workflow', () => {
    it('RefLinkGraphCanvas handles reset layout internally', () => {
      // This is tested in RefLinkGraphCanvas.test.tsx
      // Integration test just verifies the component renders
      render(<RefLinkVisualCanvas structure={mockStructure} />);
      expect(screen.getByTestId('ref-link-graph-canvas')).toBeInTheDocument();
    });
  });

  // ---- Backward compatibility with existing configs ----

  describe('Backward compatibility with existing configs', () => {
    it('correctly extracts and displays existing x-uigen-ref annotations', () => {
      const existingConfig = makeConfig({
        'users.departmentId': {
          'x-uigen-ref': {
            resource: 'departments',
            valueField: 'departments.id',
            labelField: 'departments.name',
          },
        },
      });
      setupAppContext(existingConfig);

      render(<RefLinkVisualCanvas structure={mockStructure} />);

      // Verify ref link is displayed
      expect(screen.getByTestId('select-link-users.departmentId')).toBeInTheDocument();
    });

    it('handles multiple existing ref links', () => {
      const existingConfig = makeConfig({
        'users.departmentId': {
          'x-uigen-ref': {
            resource: 'departments',
            valueField: 'departments.id',
            labelField: 'departments.name',
          },
        },
        'users.id': {
          'x-uigen-ref': {
            resource: 'users',
            valueField: 'users.id',
            labelField: 'users.id',
          },
        },
      });
      setupAppContext(existingConfig);

      render(<RefLinkVisualCanvas structure={mockStructure} />);

      // Verify both ref links are displayed
      expect(screen.getByTestId('select-link-users.departmentId')).toBeInTheDocument();
      expect(screen.getByTestId('select-link-users.id')).toBeInTheDocument();
    });

    it('handles config with no ref links', () => {
      const emptyConfig = makeConfig({});
      setupAppContext(emptyConfig);

      render(<RefLinkVisualCanvas structure={mockStructure} />);

      // Canvas renders but no ref links displayed
      expect(screen.getByTestId('ref-link-graph-canvas')).toBeInTheDocument();
      expect(screen.queryByTestId(/^select-link-/)).not.toBeInTheDocument();
    });

    it('handles null config gracefully', () => {
      setupAppContext(null);

      render(<RefLinkVisualCanvas structure={mockStructure} />);

      // Canvas renders but no ref links displayed
      expect(screen.getByTestId('ref-link-graph-canvas')).toBeInTheDocument();
      expect(screen.queryByTestId(/^select-link-/)).not.toBeInTheDocument();
    });

    it('skips incomplete ref link annotations', () => {
      const incompleteConfig = makeConfig({
        'users.departmentId': {
          'x-uigen-ref': {
            resource: 'departments',
            // Missing valueField and labelField
          },
        },
      });
      setupAppContext(incompleteConfig);

      render(<RefLinkVisualCanvas structure={mockStructure} />);

      // Incomplete ref link is not displayed
      expect(screen.queryByTestId('select-link-users.departmentId')).not.toBeInTheDocument();
    });
  });

  // ---- Complex workflows ----

  describe('Complex workflows', () => {
    it('handles creating multiple ref links in sequence', async () => {
      const baseConfig = makeConfig({});
      mockSaveConfig.mockResolvedValue(undefined);
      setupAppContext(baseConfig);

      render(<RefLinkVisualCanvas structure={mockStructure} />);

      // Create first ref link
      const simulateButton = screen.getByTestId('simulate-connection');
      await userEvent.click(simulateButton);
      const saveButton1 = screen.getByTestId('config-form-save');
      await userEvent.click(saveButton1);

      await waitFor(() => {
        expect(mockSaveConfig).toHaveBeenCalledTimes(1);
      });

      // Create second ref link (simulate another connection)
      act(() => {
        capturedOnConnectionInitiated!('users.id', 'users');
      });

      await waitFor(() => {
        expect(screen.getByTestId('ref-link-config-form')).toBeInTheDocument();
      });

      const saveButton2 = screen.getByTestId('config-form-save');
      await userEvent.click(saveButton2);

      await waitFor(() => {
        expect(mockSaveConfig).toHaveBeenCalledTimes(2);
      });
    });

    it('handles switching between config form and edit panel', async () => {
      const baseConfig = makeConfig({
        'users.departmentId': {
          'x-uigen-ref': {
            resource: 'departments',
            valueField: 'departments.id',
            labelField: 'departments.name',
          },
        },
      });
      mockSaveConfig.mockResolvedValue(undefined);
      setupAppContext(baseConfig);

      render(<RefLinkVisualCanvas structure={mockStructure} />);

      // Open edit panel
      const selectButton = screen.getByTestId('select-link-users.departmentId');
      await userEvent.click(selectButton);
      expect(screen.getByTestId('ref-link-edit-panel')).toBeInTheDocument();

      // Close edit panel
      const closeButton = screen.getByTestId('edit-panel-close');
      await userEvent.click(closeButton);
      expect(screen.queryByTestId('ref-link-edit-panel')).not.toBeInTheDocument();

      // Open config form
      const simulateButton = screen.getByTestId('simulate-connection');
      await userEvent.click(simulateButton);
      expect(screen.getByTestId('ref-link-config-form')).toBeInTheDocument();

      // Cancel config form
      const cancelButton = screen.getByTestId('config-form-cancel');
      await userEvent.click(cancelButton);
      expect(screen.queryByTestId('ref-link-config-form')).not.toBeInTheDocument();
    });
  });
});
