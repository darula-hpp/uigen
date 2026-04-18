import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FieldNode } from '../FieldNode.js';
import type { FieldNode as FieldNodeType } from '../../../types/index.js';
import type { ConfigFile } from '@uigen-dev/core';
import { AppContext } from '../../../contexts/AppContext.js';
import type { AppContextValue } from '../../../contexts/AppContext.js';
import { KeyboardNavigationProvider } from '../../../contexts/KeyboardNavigationContext.js';

// --- Helpers ---

function makeConfig(annotations: Record<string, unknown> = {}): ConfigFile {
  return {
    version: '1.0',
    enabled: {},
    defaults: {},
    annotations
  };
}

function makeField(overrides: Partial<FieldNodeType> = {}): FieldNodeType {
  return {
    key: 'email',
    label: 'Email',
    type: 'string',
    path: 'User.email',
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
      <KeyboardNavigationProvider>
        {ui}
      </KeyboardNavigationProvider>
    </AppContext.Provider>
  );
}

// --- Tests ---

describe('FieldNode', () => {
  describe('rendering', () => {
    it('renders field label and type', () => {
      renderWithContext(<FieldNode field={makeField()} />);
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('string')).toBeInTheDocument();
    });

    it('renders required indicator for required fields', () => {
      renderWithContext(<FieldNode field={makeField({ required: true })} />);
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('does not render required indicator for optional fields', () => {
      renderWithContext(<FieldNode field={makeField({ required: false })} />);
      expect(screen.queryByText('*')).not.toBeInTheDocument();
    });

    it('is draggable', () => {
      renderWithContext(<FieldNode field={makeField()} />);
      const node = screen.getByTestId('field-node');
      expect(node).toHaveAttribute('draggable', 'true');
    });

    it('has data-field-path attribute', () => {
      renderWithContext(<FieldNode field={makeField()} />);
      const node = screen.getByTestId('field-node');
      expect(node).toHaveAttribute('data-field-path', 'User.email');
    });
  });

  describe('annotation badges', () => {
    it('shows x-uigen-ref badge when ref annotation is present in config', () => {
      const config = makeConfig({
        'User.email': { 'x-uigen-ref': { resource: 'Role', valueField: 'id', labelField: 'name' } }
      });
      renderWithContext(<FieldNode field={makeField()} />, config);
      expect(screen.getByText('ref')).toBeInTheDocument();
    });

    it('does not show ref badge when no ref annotation', () => {
      renderWithContext(<FieldNode field={makeField()} />);
      expect(screen.queryByText('ref')).not.toBeInTheDocument();
    });

    it('shows label badge with current label value when label annotation is present', () => {
      const config = makeConfig({ 'User.email': { 'x-uigen-label': 'Email Address' } });
      renderWithContext(<FieldNode field={makeField()} />, config);
      expect(screen.getByTestId('label-badge')).toBeInTheDocument();
      expect(screen.getByText('Email Address')).toBeInTheDocument();
    });

    it('shows "add label" button when no label annotation', () => {
      renderWithContext(<FieldNode field={makeField()} />);
      expect(screen.getByTestId('add-label-button')).toBeInTheDocument();
    });

    it('dims the field when ignore annotation is active', () => {
      const config = makeConfig({ 'User.email': { 'x-uigen-ignore': true } });
      renderWithContext(<FieldNode field={makeField()} />, config);
      const node = screen.getByTestId('field-node');
      expect(node.className).toContain('opacity-50');
    });

    it('shows "ignored" text when ignore is active', () => {
      const config = makeConfig({ 'User.email': { 'x-uigen-ignore': true } });
      renderWithContext(<FieldNode field={makeField()} />, config);
      expect(screen.getByText('ignored')).toBeInTheDocument();
    });
  });

  describe('x-uigen-label inline editing', () => {
    it('shows input when "add label" button is clicked', () => {
      renderWithContext(<FieldNode field={makeField()} />);
      fireEvent.click(screen.getByTestId('add-label-button'));
      expect(screen.getByTestId('label-input')).toBeInTheDocument();
    });

    it('shows input when existing label badge is clicked', () => {
      const config = makeConfig({ 'User.email': { 'x-uigen-label': 'Email Address' } });
      renderWithContext(<FieldNode field={makeField()} />, config);
      fireEvent.click(screen.getByTestId('label-badge'));
      expect(screen.getByTestId('label-input')).toBeInTheDocument();
    });

    it('pre-fills input with existing label value', () => {
      const config = makeConfig({ 'User.email': { 'x-uigen-label': 'Email Address' } });
      renderWithContext(<FieldNode field={makeField()} />, config);
      fireEvent.click(screen.getByTestId('label-badge'));
      const input = screen.getByTestId('label-input') as HTMLInputElement;
      expect(input.value).toBe('Email Address');
    });

    it('saves label on Enter key and calls saveConfig', () => {
      const saveConfig = vi.fn().mockResolvedValue(undefined);
      renderWithContext(<FieldNode field={makeField()} />, null, saveConfig);
      fireEvent.click(screen.getByTestId('add-label-button'));
      const input = screen.getByTestId('label-input');
      fireEvent.change(input, { target: { value: 'My Label' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(saveConfig).toHaveBeenCalledOnce();
      const savedConfig = saveConfig.mock.calls[0][0] as ConfigFile;
      expect(savedConfig.annotations['User.email']).toMatchObject({ 'x-uigen-label': 'My Label' });
    });

    it('saves label on blur and calls saveConfig', () => {
      const saveConfig = vi.fn().mockResolvedValue(undefined);
      renderWithContext(<FieldNode field={makeField()} />, null, saveConfig);
      fireEvent.click(screen.getByTestId('add-label-button'));
      const input = screen.getByTestId('label-input');
      fireEvent.change(input, { target: { value: 'Blurred Label' } });
      fireEvent.blur(input);
      expect(saveConfig).toHaveBeenCalledOnce();
    });

    it('cancels editing on Escape key without saving', () => {
      const saveConfig = vi.fn();
      renderWithContext(<FieldNode field={makeField()} />, null, saveConfig);
      fireEvent.click(screen.getByTestId('add-label-button'));
      const input = screen.getByTestId('label-input');
      fireEvent.keyDown(input, { key: 'Escape' });
      expect(saveConfig).not.toHaveBeenCalled();
      expect(screen.queryByTestId('label-input')).not.toBeInTheDocument();
    });

    it('removes label annotation when saved with empty string', () => {
      const saveConfig = vi.fn().mockResolvedValue(undefined);
      const config = makeConfig({ 'User.email': { 'x-uigen-label': 'Old Label' } });
      renderWithContext(<FieldNode field={makeField()} />, config, saveConfig);
      fireEvent.click(screen.getByTestId('label-badge'));
      const input = screen.getByTestId('label-input');
      fireEvent.change(input, { target: { value: '' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      const savedConfig = saveConfig.mock.calls[0][0] as ConfigFile;
      // Empty label should remove the annotation key
      expect(savedConfig.annotations['User.email']?.['x-uigen-label']).toBeUndefined();
    });
  });

  describe('x-uigen-ignore toggle', () => {
    it('renders ignore toggle switch', () => {
      renderWithContext(<FieldNode field={makeField()} />);
      expect(screen.getByTestId('ignore-toggle')).toBeInTheDocument();
    });

    it('toggle has aria-checked=false when not ignored', () => {
      renderWithContext(<FieldNode field={makeField()} />);
      const toggle = screen.getByTestId('ignore-toggle');
      expect(toggle).toHaveAttribute('aria-checked', 'false');
    });

    it('toggle has aria-checked=true when ignored', () => {
      const config = makeConfig({ 'User.email': { 'x-uigen-ignore': true } });
      renderWithContext(<FieldNode field={makeField()} />, config);
      const toggle = screen.getByTestId('ignore-toggle');
      expect(toggle).toHaveAttribute('aria-checked', 'true');
    });

    it('calls saveConfig with ignore=true when toggled on', () => {
      const saveConfig = vi.fn().mockResolvedValue(undefined);
      renderWithContext(<FieldNode field={makeField()} />, null, saveConfig);
      fireEvent.click(screen.getByTestId('ignore-toggle'));
      expect(saveConfig).toHaveBeenCalledOnce();
      const savedConfig = saveConfig.mock.calls[0][0] as ConfigFile;
      expect(savedConfig.annotations['User.email']).toMatchObject({ 'x-uigen-ignore': true });
    });

    it('calls saveConfig removing ignore when toggled off', () => {
      const saveConfig = vi.fn().mockResolvedValue(undefined);
      const config = makeConfig({ 'User.email': { 'x-uigen-ignore': true } });
      renderWithContext(<FieldNode field={makeField()} />, config, saveConfig);
      fireEvent.click(screen.getByTestId('ignore-toggle'));
      expect(saveConfig).toHaveBeenCalledOnce();
      const savedConfig = saveConfig.mock.calls[0][0] as ConfigFile;
      expect(savedConfig.annotations['User.email']?.['x-uigen-ignore']).toBeUndefined();
    });

    it('preserves other annotations when toggling ignore', () => {
      const saveConfig = vi.fn().mockResolvedValue(undefined);
      const config = makeConfig({ 'User.email': { 'x-uigen-label': 'My Label' } });
      renderWithContext(<FieldNode field={makeField()} />, config, saveConfig);
      fireEvent.click(screen.getByTestId('ignore-toggle'));
      const savedConfig = saveConfig.mock.calls[0][0] as ConfigFile;
      expect(savedConfig.annotations['User.email']).toMatchObject({
        'x-uigen-label': 'My Label',
        'x-uigen-ignore': true
      });
    });
  });

  describe('x-uigen-ref drag support', () => {
    it('calls onDragStart with field path when drag starts', () => {
      const onDragStart = vi.fn();
      renderWithContext(<FieldNode field={makeField()} onDragStart={onDragStart} />);
      const node = screen.getByTestId('field-node');
      fireEvent.dragStart(node);
      expect(onDragStart).toHaveBeenCalledWith('User.email', expect.any(Object));
    });

    it('does not throw when onDragStart is not provided', () => {
      renderWithContext(<FieldNode field={makeField()} />);
      const node = screen.getByTestId('field-node');
      expect(() => fireEvent.dragStart(node)).not.toThrow();
    });
  });

  describe('config with null state', () => {
    it('renders without errors when config is null', () => {
      renderWithContext(<FieldNode field={makeField()} />, null);
      expect(screen.getByText('Email')).toBeInTheDocument();
    });

    it('shows no annotation badges when config is null', () => {
      renderWithContext(<FieldNode field={makeField()} />, null);
      expect(screen.queryByText('ref')).not.toBeInTheDocument();
      expect(screen.queryByTestId('label-badge')).not.toBeInTheDocument();
    });
  });
});
