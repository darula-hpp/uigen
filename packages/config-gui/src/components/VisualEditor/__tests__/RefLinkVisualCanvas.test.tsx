import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { RefLinkVisualCanvas } from '../RefLinkVisualCanvas';
import type { SpecStructure } from '../../../types/index';
import type { ConfigFile } from '@uigen-dev/core';
import type { RefLinkConfig } from '../RefLinkTypes';
import { useAppContext } from '../../../contexts/AppContext';

// Mock useAppContext to control state without a real AppProvider or API calls
vi.mock('../../../contexts/AppContext', () => ({
  useAppContext: vi.fn(),
}));

// Capture callbacks from child component mocks so tests can invoke them directly
let capturedOnConnectionInitiated: ((fieldPath: string, targetSlug: string) => void) | null = null;
let capturedOnRefLinkSelect: ((refLink: RefLinkConfig) => void) | null = null;
let capturedRefLinks: RefLinkConfig[] = [];

vi.mock('../RefLinkGraphCanvas', () => ({
  RefLinkGraphCanvas: vi.fn((props) => {
    capturedOnConnectionInitiated = props.onConnectionInitiated;
    capturedOnRefLinkSelect = props.onRefLinkSelect;
    capturedRefLinks = props.refLinks;
    return (
      <div data-testid="ref-link-graph-canvas">
        {props.refLinks.map((link: RefLinkConfig) => (
          <div key={link.fieldPath} data-testid={`ref-link-${link.fieldPath}`}>
            {link.fieldPath}
          </div>
        ))}
      </div>
    );
  }),
}));

let capturedConfigFormProps: {
  fieldPath: string;
  targetResource: { slug: string; name: string };
  onConfirm: (config: RefLinkConfig) => void;
  onCancel: () => void;
} | null = null;

vi.mock('../RefLinkConfigForm', () => ({
  RefLinkConfigForm: vi.fn((props) => {
    capturedConfigFormProps = props;
    return (
      <div data-testid="ref-link-config-form">
        <span data-testid="config-form-field-path">{props.fieldPath}</span>
        <span data-testid="config-form-target-slug">{props.targetResource.slug}</span>
      </div>
    );
  }),
}));

let capturedEditPanelProps: {
  refLink: RefLinkConfig;
  targetResource: { slug: string; name: string };
  onUpdate: (config: RefLinkConfig) => void;
  onDelete: () => void;
  onClose: () => void;
} | null = null;

vi.mock('../RefLinkEditPanel', () => ({
  RefLinkEditPanel: vi.fn((props) => {
    capturedEditPanelProps = props;
    return (
      <div data-testid="ref-link-edit-panel">
        <span data-testid="edit-panel-field-path">{props.refLink.fieldPath}</span>
        <span data-testid="edit-panel-resource">{props.refLink.resource}</span>
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

describe('RefLinkVisualCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnConnectionInitiated = null;
    capturedOnRefLinkSelect = null;
    capturedRefLinks = [];
    capturedConfigFormProps = null;
    capturedEditPanelProps = null;
    setupAppContext(makeConfig());
  });

  // ---- Ref link extraction from config.annotations ----

  describe('Ref link extraction from config.annotations', () => {
    it('extracts ref links from config.annotations and passes them to RefLinkGraphCanvas', () => {
      const config = makeConfig({
        'users.departmentId': {
          'x-uigen-ref': {
            resource: 'departments',
            valueField: 'departments.id',
            labelField: 'departments.name',
          },
        },
      });
      setupAppContext(config);

      render(<RefLinkVisualCanvas structure={mockStructure} />);

      expect(capturedRefLinks).toHaveLength(1);
      expect(capturedRefLinks[0]).toEqual({
        fieldPath: 'users.departmentId',
        resource: 'departments',
        valueField: 'departments.id',
        labelField: 'departments.name',
      });
    });

    it('extracts multiple ref links from config.annotations', () => {
      const config = makeConfig({
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
      setupAppContext(config);

      render(<RefLinkVisualCanvas structure={mockStructure} />);

      expect(capturedRefLinks).toHaveLength(2);
    });

    it('returns empty ref links when config has no annotations', () => {
      setupAppContext(makeConfig({}));

      render(<RefLinkVisualCanvas structure={mockStructure} />);

      expect(capturedRefLinks).toHaveLength(0);
    });

    it('returns empty ref links when config is null', () => {
      setupAppContext(null);

      render(<RefLinkVisualCanvas structure={mockStructure} />);

      expect(capturedRefLinks).toHaveLength(0);
    });

    it('skips annotations without x-uigen-ref', () => {
      const config = makeConfig({
        'users.id': {
          'x-uigen-label': 'User ID',
        },
      });
      setupAppContext(config);

      render(<RefLinkVisualCanvas structure={mockStructure} />);

      expect(capturedRefLinks).toHaveLength(0);
    });

    it('skips incomplete x-uigen-ref annotations missing required fields', () => {
      const config = makeConfig({
        'users.departmentId': {
          'x-uigen-ref': {
            resource: 'departments',
            // Missing valueField and labelField
          },
        },
      });
      setupAppContext(config);

      render(<RefLinkVisualCanvas structure={mockStructure} />);

      expect(capturedRefLinks).toHaveLength(0);
    });

    it('renders ref link items in the canvas for each extracted ref link', () => {
      const config = makeConfig({
        'users.departmentId': {
          'x-uigen-ref': {
            resource: 'departments',
            valueField: 'departments.id',
            labelField: 'departments.name',
          },
        },
      });
      setupAppContext(config);

      render(<RefLinkVisualCanvas structure={mockStructure} />);

      expect(screen.getByTestId('ref-link-users.departmentId')).toBeInTheDocument();
    });
  });

  // ---- Panel state management ----

  describe('Panel state management', () => {
    it('renders no panel by default', () => {
      render(<RefLinkVisualCanvas structure={mockStructure} />);

      expect(screen.queryByTestId('ref-link-config-form')).not.toBeInTheDocument();
      expect(screen.queryByTestId('ref-link-edit-panel')).not.toBeInTheDocument();
    });

    it('renders the canvas regardless of panel state', () => {
      render(<RefLinkVisualCanvas structure={mockStructure} />);

      expect(screen.getByTestId('ref-link-visual-canvas')).toBeInTheDocument();
      expect(screen.getByTestId('ref-link-graph-canvas')).toBeInTheDocument();
    });
  });

  // ---- Config form opening on connection initiated ----

  describe('Config form opening on connection initiated', () => {
    it('opens config form when connection is initiated', () => {
      render(<RefLinkVisualCanvas structure={mockStructure} />);

      act(() => {
        capturedOnConnectionInitiated!('users.departmentId', 'departments');
      });

      expect(screen.getByTestId('ref-link-config-form')).toBeInTheDocument();
    });

    it('passes correct fieldPath to config form', () => {
      render(<RefLinkVisualCanvas structure={mockStructure} />);

      act(() => {
        capturedOnConnectionInitiated!('users.departmentId', 'departments');
      });

      expect(screen.getByTestId('config-form-field-path')).toHaveTextContent('users.departmentId');
    });

    it('passes correct target resource to config form', () => {
      render(<RefLinkVisualCanvas structure={mockStructure} />);

      act(() => {
        capturedOnConnectionInitiated!('users.departmentId', 'departments');
      });

      expect(screen.getByTestId('config-form-target-slug')).toHaveTextContent('departments');
    });

    it('does not open config form when target resource does not exist', () => {
      render(<RefLinkVisualCanvas structure={mockStructure} />);

      act(() => {
        capturedOnConnectionInitiated!('users.departmentId', 'nonexistent-resource');
      });

      expect(screen.queryByTestId('ref-link-config-form')).not.toBeInTheDocument();
    });

    it('closes config form when cancel is invoked', () => {
      render(<RefLinkVisualCanvas structure={mockStructure} />);

      act(() => {
        capturedOnConnectionInitiated!('users.departmentId', 'departments');
      });

      expect(screen.getByTestId('ref-link-config-form')).toBeInTheDocument();

      act(() => {
        capturedConfigFormProps!.onCancel();
      });

      expect(screen.queryByTestId('ref-link-config-form')).not.toBeInTheDocument();
    });
  });

  // ---- Ref link creation in config.annotations ----

  describe('Ref link creation in config.annotations', () => {
    it('saves new ref link to config.annotations when connection is confirmed', async () => {
      const baseConfig = makeConfig({});
      mockSaveConfig.mockResolvedValue(undefined);
      setupAppContext(baseConfig);

      render(<RefLinkVisualCanvas structure={mockStructure} />);

      act(() => {
        capturedOnConnectionInitiated!('users.departmentId', 'departments');
      });

      await act(async () => {
        capturedConfigFormProps!.onConfirm({
          fieldPath: 'users.departmentId',
          resource: 'departments',
          valueField: 'departments.id',
          labelField: 'departments.name',
        });
      });

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

    it('closes config form after successful ref link creation', async () => {
      mockSaveConfig.mockResolvedValue(undefined);

      render(<RefLinkVisualCanvas structure={mockStructure} />);

      act(() => {
        capturedOnConnectionInitiated!('users.departmentId', 'departments');
      });

      expect(screen.getByTestId('ref-link-config-form')).toBeInTheDocument();

      await act(async () => {
        capturedConfigFormProps!.onConfirm({
          fieldPath: 'users.departmentId',
          resource: 'departments',
          valueField: 'departments.id',
          labelField: 'departments.name',
        });
      });

      expect(screen.queryByTestId('ref-link-config-form')).not.toBeInTheDocument();
    });

    it('preserves existing annotations when adding a new ref link', async () => {
      const baseConfig = makeConfig({
        'users.id': { 'x-uigen-label': 'User ID' },
      });
      mockSaveConfig.mockResolvedValue(undefined);
      setupAppContext(baseConfig);

      render(<RefLinkVisualCanvas structure={mockStructure} />);

      act(() => {
        capturedOnConnectionInitiated!('users.departmentId', 'departments');
      });

      await act(async () => {
        capturedConfigFormProps!.onConfirm({
          fieldPath: 'users.departmentId',
          resource: 'departments',
          valueField: 'departments.id',
          labelField: 'departments.name',
        });
      });

      const savedConfig = mockSaveConfig.mock.calls[0][0] as ConfigFile;
      expect(savedConfig.annotations['users.id']).toEqual({ 'x-uigen-label': 'User ID' });
    });

    it('does not call saveConfig when config is null', async () => {
      setupAppContext(null);

      render(<RefLinkVisualCanvas structure={mockStructure} />);

      act(() => {
        capturedOnConnectionInitiated!('users.departmentId', 'departments');
      });

      await act(async () => {
        capturedConfigFormProps?.onConfirm({
          fieldPath: 'users.departmentId',
          resource: 'departments',
          valueField: 'departments.id',
          labelField: 'departments.name',
        });
      });

      expect(mockSaveConfig).not.toHaveBeenCalled();
    });
  });

  // ---- Edit panel opening on line selection ----

  describe('Edit panel opening on line selection', () => {
    const existingRefLink: RefLinkConfig = {
      fieldPath: 'users.departmentId',
      resource: 'departments',
      valueField: 'departments.id',
      labelField: 'departments.name',
    };

    it('opens edit panel when a ref link line is selected', () => {
      render(<RefLinkVisualCanvas structure={mockStructure} />);

      act(() => {
        capturedOnRefLinkSelect!(existingRefLink);
      });

      expect(screen.getByTestId('ref-link-edit-panel')).toBeInTheDocument();
    });

    it('passes correct ref link data to edit panel', () => {
      render(<RefLinkVisualCanvas structure={mockStructure} />);

      act(() => {
        capturedOnRefLinkSelect!(existingRefLink);
      });

      expect(screen.getByTestId('edit-panel-field-path')).toHaveTextContent('users.departmentId');
      expect(screen.getByTestId('edit-panel-resource')).toHaveTextContent('departments');
    });

    it('passes correct target resource to edit panel', () => {
      render(<RefLinkVisualCanvas structure={mockStructure} />);

      act(() => {
        capturedOnRefLinkSelect!(existingRefLink);
      });

      expect(capturedEditPanelProps!.targetResource.slug).toBe('departments');
    });

    it('does not open edit panel when target resource does not exist', () => {
      const orphanedRefLink: RefLinkConfig = {
        fieldPath: 'users.departmentId',
        resource: 'nonexistent-resource',
        valueField: 'id',
        labelField: 'name',
      };

      render(<RefLinkVisualCanvas structure={mockStructure} />);

      act(() => {
        capturedOnRefLinkSelect!(orphanedRefLink);
      });

      expect(screen.queryByTestId('ref-link-edit-panel')).not.toBeInTheDocument();
    });

    it('closes edit panel when close is invoked', () => {
      render(<RefLinkVisualCanvas structure={mockStructure} />);

      act(() => {
        capturedOnRefLinkSelect!(existingRefLink);
      });

      expect(screen.getByTestId('ref-link-edit-panel')).toBeInTheDocument();

      act(() => {
        capturedEditPanelProps!.onClose();
      });

      expect(screen.queryByTestId('ref-link-edit-panel')).not.toBeInTheDocument();
    });
  });

  // ---- Ref link update in config.annotations ----

  describe('Ref link update in config.annotations', () => {
    const existingRefLink: RefLinkConfig = {
      fieldPath: 'users.departmentId',
      resource: 'departments',
      valueField: 'departments.id',
      labelField: 'departments.name',
    };

    it('updates ref link in config.annotations when edit panel saves', async () => {
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

      act(() => {
        capturedOnRefLinkSelect!(existingRefLink);
      });

      await act(async () => {
        capturedEditPanelProps!.onUpdate({
          fieldPath: 'users.departmentId',
          resource: 'departments',
          valueField: 'departments.name',
          labelField: 'departments.id',
        });
      });

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

    it('closes edit panel after successful update', async () => {
      mockSaveConfig.mockResolvedValue(undefined);

      render(<RefLinkVisualCanvas structure={mockStructure} />);

      act(() => {
        capturedOnRefLinkSelect!(existingRefLink);
      });

      expect(screen.getByTestId('ref-link-edit-panel')).toBeInTheDocument();

      await act(async () => {
        capturedEditPanelProps!.onUpdate({
          ...existingRefLink,
          valueField: 'departments.name',
        });
      });

      expect(screen.queryByTestId('ref-link-edit-panel')).not.toBeInTheDocument();
    });

    it('preserves other annotations on the same field when updating a ref link', async () => {
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

      act(() => {
        capturedOnRefLinkSelect!(existingRefLink);
      });

      await act(async () => {
        capturedEditPanelProps!.onUpdate({
          ...existingRefLink,
          valueField: 'departments.name',
        });
      });

      const savedConfig = mockSaveConfig.mock.calls[0][0] as ConfigFile;
      expect(savedConfig.annotations['users.departmentId']['x-uigen-label']).toBe('Department');
    });

    it('does not call saveConfig when config is null during update', async () => {
      setupAppContext(null);

      render(<RefLinkVisualCanvas structure={mockStructure} />);

      act(() => {
        capturedOnRefLinkSelect!(existingRefLink);
      });

      await act(async () => {
        capturedEditPanelProps?.onUpdate({ ...existingRefLink, valueField: 'departments.name' });
      });

      expect(mockSaveConfig).not.toHaveBeenCalled();
    });
  });

  // ---- Ref link deletion from config.annotations ----

  describe('Ref link deletion from config.annotations', () => {
    const existingRefLink: RefLinkConfig = {
      fieldPath: 'users.departmentId',
      resource: 'departments',
      valueField: 'departments.id',
      labelField: 'departments.name',
    };

    it('removes x-uigen-ref from config.annotations when delete is confirmed', async () => {
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

      act(() => {
        capturedOnRefLinkSelect!(existingRefLink);
      });

      await act(async () => {
        capturedEditPanelProps!.onDelete();
      });

      const savedConfig = mockSaveConfig.mock.calls[0][0] as ConfigFile;
      expect(savedConfig.annotations['users.departmentId']).toBeUndefined();
    });

    it('removes entire field entry when no other annotations remain after deletion', async () => {
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

      act(() => {
        capturedOnRefLinkSelect!(existingRefLink);
      });

      await act(async () => {
        capturedEditPanelProps!.onDelete();
      });

      const savedConfig = mockSaveConfig.mock.calls[0][0] as ConfigFile;
      expect(Object.keys(savedConfig.annotations)).not.toContain('users.departmentId');
    });

    it('preserves other annotations on the same field when deleting x-uigen-ref', async () => {
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

      act(() => {
        capturedOnRefLinkSelect!(existingRefLink);
      });

      await act(async () => {
        capturedEditPanelProps!.onDelete();
      });

      const savedConfig = mockSaveConfig.mock.calls[0][0] as ConfigFile;
      expect(savedConfig.annotations['users.departmentId']).toEqual({
        'x-uigen-label': 'Department',
      });
      expect(savedConfig.annotations['users.departmentId']['x-uigen-ref']).toBeUndefined();
    });

    it('closes edit panel after successful deletion', async () => {
      mockSaveConfig.mockResolvedValue(undefined);

      render(<RefLinkVisualCanvas structure={mockStructure} />);

      act(() => {
        capturedOnRefLinkSelect!(existingRefLink);
      });

      expect(screen.getByTestId('ref-link-edit-panel')).toBeInTheDocument();

      await act(async () => {
        capturedEditPanelProps!.onDelete();
      });

      expect(screen.queryByTestId('ref-link-edit-panel')).not.toBeInTheDocument();
    });

    it('preserves annotations for other fields when deleting a ref link', async () => {
      const baseConfig = makeConfig({
        'users.departmentId': {
          'x-uigen-ref': {
            resource: 'departments',
            valueField: 'departments.id',
            labelField: 'departments.name',
          },
        },
        'users.id': {
          'x-uigen-label': 'User ID',
        },
      });
      mockSaveConfig.mockResolvedValue(undefined);
      setupAppContext(baseConfig);

      render(<RefLinkVisualCanvas structure={mockStructure} />);

      act(() => {
        capturedOnRefLinkSelect!(existingRefLink);
      });

      await act(async () => {
        capturedEditPanelProps!.onDelete();
      });

      const savedConfig = mockSaveConfig.mock.calls[0][0] as ConfigFile;
      expect(savedConfig.annotations['users.id']).toEqual({ 'x-uigen-label': 'User ID' });
    });
  });
});
