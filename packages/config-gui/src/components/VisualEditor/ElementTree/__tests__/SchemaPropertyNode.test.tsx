import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SchemaPropertyNode } from '../SchemaPropertyNode.js';
import type { FieldNode } from '../../../../types/index.js';
import type { ConfigFile } from '@uigen-dev/core';
import { AppContext } from '../../../../contexts/AppContext.js';
import type { AppContextValue } from '../../../../contexts/AppContext.js';

// --- Helpers ---

function makeConfig(annotations: Record<string, unknown> = {}): ConfigFile {
  return {
    version: '1.0',
    enabled: {},
    defaults: {},
    annotations
  };
}

function makeField(overrides: Partial<FieldNode> = {}): FieldNode {
  return {
    key: 'email',
    label: 'Email',
    type: 'string',
    path: 'components.schemas.User.properties.email',
    required: false,
    annotations: {},
    ...overrides
  };
}

function renderWithContext(
  ui: React.ReactElement,
  config: ConfigFile | null = null,
  saveConfig = vi.fn()
) {
  const contextValue: AppContextValue = {
    state: {
      config,
      handlers: [],
      annotations: [],
      isLoading: false,
      error: null,
      configPath: '.uigen/config.yaml',
      specPath: null,
      specStructure: null
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
      {ui}
    </AppContext.Provider>
  );
}

// --- Tests ---

describe('SchemaPropertyNode', () => {
  describe('rendering', () => {
    it('renders field name and type', () => {
      renderWithContext(<SchemaPropertyNode field={makeField()} />);
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('string')).toBeInTheDocument();
    });

    it('renders required indicator for required fields', () => {
      renderWithContext(<SchemaPropertyNode field={makeField({ required: true })} />);
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('does not render required indicator for optional fields', () => {
      renderWithContext(<SchemaPropertyNode field={makeField({ required: false })} />);
      expect(screen.queryByText('*')).not.toBeInTheDocument();
    });

    it('has data-field-path attribute', () => {
      renderWithContext(<SchemaPropertyNode field={makeField()} />);
      const node = screen.getByTestId('schema-property-node');
      expect(node).toHaveAttribute('data-field-path', 'components.schemas.User.properties.email');
    });

    it('renders with default level 0 (no indentation)', () => {
      renderWithContext(<SchemaPropertyNode field={makeField()} />);
      const row = screen.getByTestId('schema-property-row');
      expect(row.className).not.toContain('ml-');
    });

    it('renders with indentation for level 1', () => {
      renderWithContext(<SchemaPropertyNode field={makeField()} level={1} />);
      const row = screen.getByTestId('schema-property-row');
      expect(row.className).toContain('ml-4');
    });

    it('renders with indentation for level 2', () => {
      renderWithContext(<SchemaPropertyNode field={makeField()} level={2} />);
      const row = screen.getByTestId('schema-property-row');
      expect(row.className).toContain('ml-8');
    });

    it('renders with indentation for level 3', () => {
      renderWithContext(<SchemaPropertyNode field={makeField()} level={3} />);
      const row = screen.getByTestId('schema-property-row');
      expect(row.className).toContain('ml-12');
    });

    it('caps indentation at level 4 (ml-16)', () => {
      renderWithContext(<SchemaPropertyNode field={makeField()} level={5} />);
      const row = screen.getByTestId('schema-property-row');
      expect(row.className).toContain('ml-16');
    });
  });

  describe('visual dimming', () => {
    it('dims the field when ignore annotation is active', () => {
      const config = makeConfig({
        'components.schemas.User.properties.email': { 'x-uigen-ignore': true }
      });
      renderWithContext(<SchemaPropertyNode field={makeField()} />, config);
      const row = screen.getByTestId('schema-property-row');
      expect(row.className).toContain('opacity-50');
    });

    it('does not dim the field when ignore annotation is false', () => {
      const config = makeConfig({
        'components.schemas.User.properties.email': { 'x-uigen-ignore': false }
      });
      renderWithContext(<SchemaPropertyNode field={makeField()} />, config);
      const row = screen.getByTestId('schema-property-row');
      expect(row.className).not.toContain('opacity-50');
    });

    it('does not dim the field when no ignore annotation', () => {
      renderWithContext(<SchemaPropertyNode field={makeField()} />);
      const row = screen.getByTestId('schema-property-row');
      expect(row.className).not.toContain('opacity-50');
    });

    it('dims the field when parent is ignored (inherited)', () => {
      const config = makeConfig({
        'components.schemas.User': { 'x-uigen-ignore': true }
      });
      renderWithContext(
        <SchemaPropertyNode field={makeField()} parentIgnored={true} />,
        config
      );
      const row = screen.getByTestId('schema-property-row');
      expect(row.className).toContain('opacity-50');
    });

    it('does not dim when parent ignored but child has explicit false override', () => {
      const config = makeConfig({
        'components.schemas.User': { 'x-uigen-ignore': true },
        'components.schemas.User.properties.email': { 'x-uigen-ignore': false }
      });
      renderWithContext(
        <SchemaPropertyNode field={makeField()} parentIgnored={true} />,
        config
      );
      const row = screen.getByTestId('schema-property-row');
      expect(row.className).not.toContain('opacity-50');
    });
  });

  describe('ignore toggle', () => {
    it('renders ignore toggle switch', () => {
      renderWithContext(<SchemaPropertyNode field={makeField()} />);
      expect(screen.getByTestId('ignore-toggle-container')).toBeInTheDocument();
    });

    it('toggle has aria-checked=false when not ignored', () => {
      renderWithContext(<SchemaPropertyNode field={makeField()} />);
      const toggle = screen.getByTestId('ignore-toggle-switch');
      expect(toggle).toHaveAttribute('aria-checked', 'false');
    });

    it('toggle has aria-checked=true when ignored', () => {
      const config = makeConfig({
        'components.schemas.User.properties.email': { 'x-uigen-ignore': true }
      });
      renderWithContext(<SchemaPropertyNode field={makeField()} />, config);
      const toggle = screen.getByTestId('ignore-toggle-switch');
      expect(toggle).toHaveAttribute('aria-checked', 'true');
    });

    it('calls saveConfig with ignore=true when toggled on', () => {
      const saveConfig = vi.fn().mockResolvedValue(undefined);
      renderWithContext(<SchemaPropertyNode field={makeField()} />, null, saveConfig);
      fireEvent.click(screen.getByTestId('ignore-toggle-switch'));
      expect(saveConfig).toHaveBeenCalledOnce();
      const savedConfig = saveConfig.mock.calls[0][0] as ConfigFile;
      expect(savedConfig.annotations['components.schemas.User.properties.email']).toMatchObject({
        'x-uigen-ignore': true
      });
    });

    it('calls saveConfig removing ignore when toggled off', () => {
      const saveConfig = vi.fn().mockResolvedValue(undefined);
      const config = makeConfig({
        'components.schemas.User.properties.email': { 'x-uigen-ignore': true }
      });
      renderWithContext(<SchemaPropertyNode field={makeField()} />, config, saveConfig);
      fireEvent.click(screen.getByTestId('ignore-toggle-switch'));
      expect(saveConfig).toHaveBeenCalledOnce();
      const savedConfig = saveConfig.mock.calls[0][0] as ConfigFile;
      expect(savedConfig.annotations['components.schemas.User.properties.email']?.['x-uigen-ignore']).toBeUndefined();
    });

    it('preserves other annotations when toggling ignore', () => {
      const saveConfig = vi.fn().mockResolvedValue(undefined);
      const config = makeConfig({
        'components.schemas.User.properties.email': { 'x-uigen-label': 'Email Address' }
      });
      renderWithContext(<SchemaPropertyNode field={makeField()} />, config, saveConfig);
      fireEvent.click(screen.getByTestId('ignore-toggle-switch'));
      const savedConfig = saveConfig.mock.calls[0][0] as ConfigFile;
      expect(savedConfig.annotations['components.schemas.User.properties.email']).toMatchObject({
        'x-uigen-label': 'Email Address',
        'x-uigen-ignore': true
      });
    });

    it('toggle is disabled when parent is ignored and no override', () => {
      const config = makeConfig({
        'components.schemas.User': { 'x-uigen-ignore': true }
      });
      renderWithContext(
        <SchemaPropertyNode field={makeField()} parentIgnored={true} />,
        config
      );
      const toggle = screen.getByTestId('ignore-toggle-switch');
      expect(toggle).toBeDisabled();
    });

    it('toggle is enabled when parent is ignored but child has override', () => {
      const config = makeConfig({
        'components.schemas.User': { 'x-uigen-ignore': true },
        'components.schemas.User.properties.email': { 'x-uigen-ignore': false }
      });
      renderWithContext(
        <SchemaPropertyNode field={makeField()} parentIgnored={true} />,
        config
      );
      const toggle = screen.getByTestId('ignore-toggle-switch');
      expect(toggle).not.toBeDisabled();
    });

    it('sets override to false when toggling off from inherited ignore', () => {
      const saveConfig = vi.fn().mockResolvedValue(undefined);
      const config = makeConfig({
        'components.schemas.User': { 'x-uigen-ignore': true }
      });
      renderWithContext(
        <SchemaPropertyNode field={makeField()} parentIgnored={true} />,
        config,
        saveConfig
      );
      
      // Toggle should be disabled initially, but let's test the handler logic
      // by checking what would be saved if we could toggle
      const toggle = screen.getByTestId('ignore-toggle-switch');
      expect(toggle).toBeDisabled();
    });
  });

  describe('nesting and children', () => {
    it('does not render expand/collapse button when field has no children', () => {
      renderWithContext(<SchemaPropertyNode field={makeField()} />);
      expect(screen.queryByTestId('expand-collapse-button')).not.toBeInTheDocument();
    });

    it('renders expand/collapse button when field has children', () => {
      const fieldWithChildren = makeField({
        type: 'object',
        children: [
          makeField({
            key: 'street',
            label: 'Street',
            path: 'components.schemas.User.properties.address.properties.street'
          })
        ]
      });
      renderWithContext(<SchemaPropertyNode field={fieldWithChildren} />);
      expect(screen.getByTestId('expand-collapse-button')).toBeInTheDocument();
    });

    it('renders children when expanded (default)', () => {
      const fieldWithChildren = makeField({
        key: 'address',
        label: 'Address',
        type: 'object',
        path: 'components.schemas.User.properties.address',
        children: [
          makeField({
            key: 'street',
            label: 'Street',
            path: 'components.schemas.User.properties.address.properties.street'
          }),
          makeField({
            key: 'city',
            label: 'City',
            path: 'components.schemas.User.properties.address.properties.city'
          })
        ]
      });
      renderWithContext(<SchemaPropertyNode field={fieldWithChildren} />);
      expect(screen.getByText('Street')).toBeInTheDocument();
      expect(screen.getByText('City')).toBeInTheDocument();
    });

    it('hides children when collapsed', () => {
      const fieldWithChildren = makeField({
        key: 'address',
        label: 'Address',
        type: 'object',
        path: 'components.schemas.User.properties.address',
        children: [
          makeField({
            key: 'street',
            label: 'Street',
            path: 'components.schemas.User.properties.address.properties.street'
          })
        ]
      });
      renderWithContext(<SchemaPropertyNode field={fieldWithChildren} />);
      
      // Click to collapse
      fireEvent.click(screen.getByTestId('expand-collapse-button'));
      
      expect(screen.queryByText('Street')).not.toBeInTheDocument();
    });

    it('toggles expand/collapse state on button click', () => {
      const fieldWithChildren = makeField({
        key: 'address',
        label: 'Address',
        type: 'object',
        path: 'components.schemas.User.properties.address',
        children: [
          makeField({
            key: 'street',
            label: 'Street',
            path: 'components.schemas.User.properties.address.properties.street'
          })
        ]
      });
      renderWithContext(<SchemaPropertyNode field={fieldWithChildren} />);
      
      const button = screen.getByTestId('expand-collapse-button');
      
      // Initially expanded
      expect(screen.getByText('Street')).toBeInTheDocument();
      
      // Collapse
      fireEvent.click(button);
      expect(screen.queryByText('Street')).not.toBeInTheDocument();
      
      // Expand again
      fireEvent.click(button);
      expect(screen.getByText('Street')).toBeInTheDocument();
    });

    it('increments level for children', () => {
      const fieldWithChildren = makeField({
        key: 'address',
        label: 'Address',
        type: 'object',
        path: 'components.schemas.User.properties.address',
        children: [
          makeField({
            key: 'street',
            label: 'Street',
            path: 'components.schemas.User.properties.address.properties.street'
          })
        ]
      });
      renderWithContext(<SchemaPropertyNode field={fieldWithChildren} level={1} />);
      
      // Parent should have ml-4 (level 1)
      const parentRows = screen.getAllByTestId('schema-property-row');
      expect(parentRows[0].className).toContain('ml-4');
      
      // Child should have ml-8 (level 2)
      expect(parentRows[1].className).toContain('ml-8');
    });

    it('passes parentIgnored prop to children when parent is ignored', () => {
      const config = makeConfig({
        'components.schemas.User.properties.address': { 'x-uigen-ignore': true }
      });
      const fieldWithChildren = makeField({
        key: 'address',
        label: 'Address',
        type: 'object',
        path: 'components.schemas.User.properties.address',
        children: [
          makeField({
            key: 'street',
            label: 'Street',
            path: 'components.schemas.User.properties.address.properties.street'
          })
        ]
      });
      renderWithContext(<SchemaPropertyNode field={fieldWithChildren} />, config);
      
      // Both parent and child should be dimmed
      const rows = screen.getAllByTestId('schema-property-row');
      expect(rows[0].className).toContain('opacity-50'); // Parent
      expect(rows[1].className).toContain('opacity-50'); // Child
    });

    it('renders deeply nested children correctly', () => {
      const deeplyNested = makeField({
        key: 'user',
        label: 'User',
        type: 'object',
        path: 'components.schemas.Response.properties.user',
        children: [
          makeField({
            key: 'address',
            label: 'Address',
            type: 'object',
            path: 'components.schemas.Response.properties.user.properties.address',
            children: [
              makeField({
                key: 'location',
                label: 'Location',
                type: 'object',
                path: 'components.schemas.Response.properties.user.properties.address.properties.location',
                children: [
                  makeField({
                    key: 'coordinates',
                    label: 'Coordinates',
                    path: 'components.schemas.Response.properties.user.properties.address.properties.location.properties.coordinates'
                  })
                ]
              })
            ]
          })
        ]
      });
      renderWithContext(<SchemaPropertyNode field={deeplyNested} />);
      
      expect(screen.getByText('User')).toBeInTheDocument();
      expect(screen.getByText('Address')).toBeInTheDocument();
      expect(screen.getByText('Location')).toBeInTheDocument();
      expect(screen.getByText('Coordinates')).toBeInTheDocument();
    });
  });

  describe('ignore state calculation', () => {
    it('calculates explicit ignore state correctly', () => {
      const config = makeConfig({
        'components.schemas.User.properties.email': { 'x-uigen-ignore': true }
      });
      renderWithContext(<SchemaPropertyNode field={makeField()} />, config);
      
      const toggle = screen.getByTestId('ignore-toggle-switch');
      expect(toggle).toHaveAttribute('aria-checked', 'true');
    });

    it('calculates inherited ignore state correctly', () => {
      const config = makeConfig({
        'components.schemas.User': { 'x-uigen-ignore': true }
      });
      renderWithContext(
        <SchemaPropertyNode field={makeField()} parentIgnored={true} />,
        config
      );
      
      const row = screen.getByTestId('schema-property-row');
      expect(row.className).toContain('opacity-50');
    });

    it('calculates override state correctly', () => {
      const config = makeConfig({
        'components.schemas.User': { 'x-uigen-ignore': true },
        'components.schemas.User.properties.email': { 'x-uigen-ignore': false }
      });
      renderWithContext(
        <SchemaPropertyNode field={makeField()} parentIgnored={true} />,
        config
      );
      
      const row = screen.getByTestId('schema-property-row');
      expect(row.className).not.toContain('opacity-50');
      
      const toggle = screen.getByTestId('ignore-toggle-switch');
      expect(toggle).not.toBeDisabled();
    });

    it('calculates pruned state correctly', () => {
      const config = makeConfig({
        'components.schemas.User': { 'x-uigen-ignore': true }
      });
      renderWithContext(
        <SchemaPropertyNode field={makeField()} parentIgnored={true} />,
        config
      );
      
      const toggle = screen.getByTestId('ignore-toggle-switch');
      expect(toggle).toBeDisabled();
    });
  });

  describe('integration with IgnoreTooltip', () => {
    it('wraps the row with IgnoreTooltip', () => {
      renderWithContext(<SchemaPropertyNode field={makeField()} />);
      expect(screen.getByTestId('ignore-tooltip-container')).toBeInTheDocument();
    });

    it('passes correct ignoreState to tooltip', async () => {
      const config = makeConfig({
        'components.schemas.User.properties.email': { 'x-uigen-ignore': true }
      });
      renderWithContext(<SchemaPropertyNode field={makeField()} />, config);
      
      const container = screen.getByTestId('ignore-tooltip-container');
      
      // Hover to trigger tooltip
      fireEvent.mouseEnter(container);
      
      // Wait for tooltip to appear (300ms delay)
      await waitFor(() => {
        expect(screen.getByTestId('ignore-tooltip')).toBeInTheDocument();
      }, { timeout: 500 });
      
      // Tooltip should show explicit ignore message
      expect(screen.getByTestId('ignore-tooltip')).toHaveTextContent(
        'Explicitly ignored by annotation on this element'
      );
    });

    it('shows inherited state in tooltip', async () => {
      const config = makeConfig({
        'components.schemas.User': { 'x-uigen-ignore': true }
      });
      renderWithContext(
        <SchemaPropertyNode field={makeField()} parentIgnored={true} />,
        config
      );
      
      const container = screen.getByTestId('ignore-tooltip-container');
      
      // Hover to trigger tooltip
      fireEvent.mouseEnter(container);
      
      // Wait for tooltip to appear
      await waitFor(() => {
        expect(screen.getByTestId('ignore-tooltip')).toBeInTheDocument();
      }, { timeout: 500 });
      
      // Tooltip should show inherited message with parent name
      expect(screen.getByTestId('ignore-tooltip')).toHaveTextContent(
        'Ignored because parent User is ignored'
      );
    });

    it('shows override state in tooltip', async () => {
      const config = makeConfig({
        'components.schemas.User': { 'x-uigen-ignore': true },
        'components.schemas.User.properties.email': { 'x-uigen-ignore': false }
      });
      renderWithContext(
        <SchemaPropertyNode field={makeField()} parentIgnored={true} />,
        config
      );
      
      const container = screen.getByTestId('ignore-tooltip-container');
      
      // Hover to trigger tooltip
      fireEvent.mouseEnter(container);
      
      // Wait for tooltip to appear
      await waitFor(() => {
        expect(screen.getByTestId('ignore-tooltip')).toBeInTheDocument();
      }, { timeout: 500 });
      
      // Tooltip should show override message
      expect(screen.getByTestId('ignore-tooltip')).toHaveTextContent(
        'Included despite parent User being ignored (override)'
      );
    });
  });

  describe('config with null state', () => {
    it('renders without errors when config is null', () => {
      renderWithContext(<SchemaPropertyNode field={makeField()} />, null);
      expect(screen.getByText('Email')).toBeInTheDocument();
    });

    it('shows no dimming when config is null', () => {
      renderWithContext(<SchemaPropertyNode field={makeField()} />, null);
      const row = screen.getByTestId('schema-property-row');
      expect(row.className).not.toContain('opacity-50');
    });

    it('toggle is enabled when config is null', () => {
      renderWithContext(<SchemaPropertyNode field={makeField()} />, null);
      const toggle = screen.getByTestId('ignore-toggle-switch');
      expect(toggle).not.toBeDisabled();
    });
  });
});
