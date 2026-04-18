import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SchemaObjectNode } from '../SchemaObjectNode.js';
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

describe('SchemaObjectNode', () => {
  describe('rendering', () => {
    it('renders schema name', () => {
      renderWithContext(
        <SchemaObjectNode
          schemaName="User"
          schemaPath="components.schemas.User"
        />
      );
      expect(screen.getByText('User')).toBeInTheDocument();
    });

    it('renders location badge', () => {
      renderWithContext(
        <SchemaObjectNode
          schemaName="User"
          schemaPath="components.schemas.User"
        />
      );
      expect(screen.getByTestId('location-badge')).toHaveTextContent('components/schemas');
    });

    it('renders schema icon', () => {
      renderWithContext(
        <SchemaObjectNode
          schemaName="User"
          schemaPath="components.schemas.User"
        />
      );
      const row = screen.getByTestId('schema-object-row');
      expect(row.querySelector('svg')).toBeInTheDocument();
    });

    it('has data-schema-path attribute', () => {
      renderWithContext(
        <SchemaObjectNode
          schemaName="User"
          schemaPath="components.schemas.User"
        />
      );
      const node = screen.getByTestId('schema-object-node');
      expect(node).toHaveAttribute('data-schema-path', 'components.schemas.User');
    });

    it('does not render expand button when no properties', () => {
      renderWithContext(
        <SchemaObjectNode
          schemaName="User"
          schemaPath="components.schemas.User"
        />
      );
      expect(screen.queryByTestId('expand-collapse-button')).not.toBeInTheDocument();
    });

    it('renders expand button when has properties', () => {
      renderWithContext(
        <SchemaObjectNode
          schemaName="User"
          schemaPath="components.schemas.User"
          properties={[
            { key: 'email', label: 'Email', type: 'string', path: 'components.schemas.User.properties.email', required: true }
          ]}
        />
      );
      expect(screen.getByTestId('expand-collapse-button')).toBeInTheDocument();
    });

    it('does not render reference count badge when no references', () => {
      renderWithContext(
        <SchemaObjectNode
          schemaName="User"
          schemaPath="components.schemas.User"
        />
      );
      expect(screen.queryByTestId('reference-count-badge')).not.toBeInTheDocument();
    });

    it('renders reference count badge when has references', () => {
      renderWithContext(
        <SchemaObjectNode
          schemaName="User"
          schemaPath="components.schemas.User"
          referencedInRequestBodies={[
            { operationId: 'createUser', method: 'POST', path: '/users' }
          ]}
        />
      );
      expect(screen.getByTestId('reference-count-badge')).toHaveTextContent('1 ref');
    });

    it('renders plural reference count badge', () => {
      renderWithContext(
        <SchemaObjectNode
          schemaName="User"
          schemaPath="components.schemas.User"
          referencedInRequestBodies={[
            { operationId: 'createUser', method: 'POST', path: '/users' }
          ]}
          referencedInResponses={[
            { operationId: 'getUser', method: 'GET', path: '/users/{id}', statusCode: '200' }
          ]}
        />
      );
      expect(screen.getByTestId('reference-count-badge')).toHaveTextContent('2 refs');
    });
  });

  describe('visual dimming', () => {
    it('dims the schema when ignore annotation is active', () => {
      const config = makeConfig({
        'components.schemas.User': { 'x-uigen-ignore': true }
      });
      renderWithContext(
        <SchemaObjectNode
          schemaName="User"
          schemaPath="components.schemas.User"
        />,
        config
      );
      const row = screen.getByTestId('schema-object-row');
      expect(row.className).toContain('opacity-50');
    });

    it('does not dim the schema when ignore annotation is false', () => {
      const config = makeConfig({
        'components.schemas.User': { 'x-uigen-ignore': false }
      });
      renderWithContext(
        <SchemaObjectNode
          schemaName="User"
          schemaPath="components.schemas.User"
        />,
        config
      );
      const row = screen.getByTestId('schema-object-row');
      expect(row.className).not.toContain('opacity-50');
    });

    it('does not dim the schema when no ignore annotation', () => {
      renderWithContext(
        <SchemaObjectNode
          schemaName="User"
          schemaPath="components.schemas.User"
        />
      );
      const row = screen.getByTestId('schema-object-row');
      expect(row.className).not.toContain('opacity-50');
    });
  });

  describe('ignore toggle', () => {
    it('renders ignore toggle switch', () => {
      renderWithContext(
        <SchemaObjectNode
          schemaName="User"
          schemaPath="components.schemas.User"
        />
      );
      expect(screen.getByTestId('ignore-toggle-container')).toBeInTheDocument();
    });

    it('toggle has aria-checked=false when not ignored', () => {
      renderWithContext(
        <SchemaObjectNode
          schemaName="User"
          schemaPath="components.schemas.User"
        />
      );
      const toggle = screen.getByTestId('ignore-toggle-switch');
      expect(toggle).toHaveAttribute('aria-checked', 'false');
    });

    it('toggle has aria-checked=true when ignored', () => {
      const config = makeConfig({
        'components.schemas.User': { 'x-uigen-ignore': true }
      });
      renderWithContext(
        <SchemaObjectNode
          schemaName="User"
          schemaPath="components.schemas.User"
        />,
        config
      );
      const toggle = screen.getByTestId('ignore-toggle-switch');
      expect(toggle).toHaveAttribute('aria-checked', 'true');
    });

    it('calls saveConfig with ignore=true when toggled on', () => {
      const saveConfig = vi.fn().mockResolvedValue(undefined);
      renderWithContext(
        <SchemaObjectNode
          schemaName="User"
          schemaPath="components.schemas.User"
        />,
        null,
        saveConfig
      );
      fireEvent.click(screen.getByTestId('ignore-toggle-switch'));
      expect(saveConfig).toHaveBeenCalledOnce();
      const savedConfig = saveConfig.mock.calls[0][0] as ConfigFile;
      expect(savedConfig.annotations['components.schemas.User']).toMatchObject({
        'x-uigen-ignore': true
      });
    });

    it('calls saveConfig removing ignore when toggled off', () => {
      const saveConfig = vi.fn().mockResolvedValue(undefined);
      const config = makeConfig({
        'components.schemas.User': { 'x-uigen-ignore': true }
      });
      renderWithContext(
        <SchemaObjectNode
          schemaName="User"
          schemaPath="components.schemas.User"
        />,
        config,
        saveConfig
      );
      fireEvent.click(screen.getByTestId('ignore-toggle-switch'));
      expect(saveConfig).toHaveBeenCalledOnce();
      const savedConfig = saveConfig.mock.calls[0][0] as ConfigFile;
      expect(savedConfig.annotations['components.schemas.User']?.['x-uigen-ignore']).toBeUndefined();
    });

    it('preserves other annotations when toggling ignore', () => {
      const saveConfig = vi.fn().mockResolvedValue(undefined);
      const config = makeConfig({
        'components.schemas.User': { 'x-uigen-label': 'User Schema' }
      });
      renderWithContext(
        <SchemaObjectNode
          schemaName="User"
          schemaPath="components.schemas.User"
        />,
        config,
        saveConfig
      );
      fireEvent.click(screen.getByTestId('ignore-toggle-switch'));
      const savedConfig = saveConfig.mock.calls[0][0] as ConfigFile;
      expect(savedConfig.annotations['components.schemas.User']).toMatchObject({
        'x-uigen-label': 'User Schema',
        'x-uigen-ignore': true
      });
    });
  });

  describe('properties expansion', () => {
    it('does not show properties by default', () => {
      renderWithContext(
        <SchemaObjectNode
          schemaName="User"
          schemaPath="components.schemas.User"
          properties={[
            { key: 'email', label: 'Email', type: 'string', path: 'components.schemas.User.properties.email', required: true }
          ]}
        />
      );
      expect(screen.queryByTestId('schema-properties')).not.toBeInTheDocument();
    });

    it('shows properties when expanded', () => {
      renderWithContext(
        <SchemaObjectNode
          schemaName="User"
          schemaPath="components.schemas.User"
          properties={[
            { key: 'email', label: 'Email', type: 'string', path: 'components.schemas.User.properties.email', required: true }
          ]}
        />
      );
      fireEvent.click(screen.getByTestId('expand-collapse-button'));
      expect(screen.getByTestId('schema-properties')).toBeInTheDocument();
    });

    it('renders property details', () => {
      renderWithContext(
        <SchemaObjectNode
          schemaName="User"
          schemaPath="components.schemas.User"
          properties={[
            { key: 'email', label: 'Email', type: 'string', path: 'components.schemas.User.properties.email', required: true },
            { key: 'name', label: 'Name', type: 'number', path: 'components.schemas.User.properties.name', required: false }
          ]}
        />
      );
      fireEvent.click(screen.getByTestId('expand-collapse-button'));
      
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('string')).toBeInTheDocument();
      expect(screen.getByText('number')).toBeInTheDocument();
    });

    it('shows required indicator for required properties', () => {
      renderWithContext(
        <SchemaObjectNode
          schemaName="User"
          schemaPath="components.schemas.User"
          properties={[
            { key: 'email', label: 'Email', type: 'string', path: 'components.schemas.User.properties.email', required: true }
          ]}
        />
      );
      fireEvent.click(screen.getByTestId('expand-collapse-button'));
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('toggles properties visibility on button click', () => {
      renderWithContext(
        <SchemaObjectNode
          schemaName="User"
          schemaPath="components.schemas.User"
          properties={[
            { key: 'email', label: 'Email', type: 'string', path: 'components.schemas.User.properties.email', required: true }
          ]}
        />
      );
      
      const button = screen.getByTestId('expand-collapse-button');
      
      // Initially collapsed
      expect(screen.queryByTestId('schema-properties')).not.toBeInTheDocument();
      
      // Expand
      fireEvent.click(button);
      expect(screen.getByTestId('schema-properties')).toBeInTheDocument();
      
      // Collapse again
      fireEvent.click(button);
      expect(screen.queryByTestId('schema-properties')).not.toBeInTheDocument();
    });

    it('dims properties when schema is ignored', () => {
      const config = makeConfig({
        'components.schemas.User': { 'x-uigen-ignore': true }
      });
      renderWithContext(
        <SchemaObjectNode
          schemaName="User"
          schemaPath="components.schemas.User"
          properties={[
            { key: 'email', label: 'Email', type: 'string', path: 'components.schemas.User.properties.email', required: true }
          ]}
        />,
        config
      );
      fireEvent.click(screen.getByTestId('expand-collapse-button'));
      
      const propertyItems = screen.getAllByTestId('schema-property-item');
      expect(propertyItems[0].className).toContain('opacity-50');
    });
  });

  describe('references panel', () => {
    it('does not show references panel by default', () => {
      renderWithContext(
        <SchemaObjectNode
          schemaName="User"
          schemaPath="components.schemas.User"
          referencedInRequestBodies={[
            { operationId: 'createUser', method: 'POST', path: '/users' }
          ]}
        />
      );
      expect(screen.queryByTestId('references-panel')).not.toBeInTheDocument();
    });

    it('shows references panel when reference badge clicked', () => {
      renderWithContext(
        <SchemaObjectNode
          schemaName="User"
          schemaPath="components.schemas.User"
          referencedInRequestBodies={[
            { operationId: 'createUser', method: 'POST', path: '/users' }
          ]}
        />
      );
      fireEvent.click(screen.getByTestId('reference-count-badge'));
      expect(screen.getByTestId('references-panel')).toBeInTheDocument();
    });

    it('displays total reference count in panel header', () => {
      renderWithContext(
        <SchemaObjectNode
          schemaName="User"
          schemaPath="components.schemas.User"
          referencedInRequestBodies={[
            { operationId: 'createUser', method: 'POST', path: '/users' }
          ]}
          referencedInResponses={[
            { operationId: 'getUser', method: 'GET', path: '/users/{id}', statusCode: '200' }
          ]}
        />
      );
      fireEvent.click(screen.getByTestId('reference-count-badge'));
      expect(screen.getByText('References (2)')).toBeInTheDocument();
    });

    it('renders request body references', () => {
      renderWithContext(
        <SchemaObjectNode
          schemaName="User"
          schemaPath="components.schemas.User"
          referencedInRequestBodies={[
            { operationId: 'createUser', method: 'POST', path: '/users' },
            { operationId: 'updateUser', method: 'PUT', path: '/users/{id}' }
          ]}
        />
      );
      fireEvent.click(screen.getByTestId('reference-count-badge'));
      
      const requestBodyRefs = screen.getByTestId('request-body-references');
      expect(requestBodyRefs).toHaveTextContent('Request Bodies (2)');
      expect(requestBodyRefs).toHaveTextContent('POST');
      expect(requestBodyRefs).toHaveTextContent('/users');
      expect(requestBodyRefs).toHaveTextContent('PUT');
      expect(requestBodyRefs).toHaveTextContent('/users/{id}');
    });

    it('renders response references', () => {
      renderWithContext(
        <SchemaObjectNode
          schemaName="User"
          schemaPath="components.schemas.User"
          referencedInResponses={[
            { operationId: 'getUser', method: 'GET', path: '/users/{id}', statusCode: '200' },
            { operationId: 'listUsers', method: 'GET', path: '/users', statusCode: '200' }
          ]}
        />
      );
      fireEvent.click(screen.getByTestId('reference-count-badge'));
      
      const responseRefs = screen.getByTestId('response-references');
      expect(responseRefs).toHaveTextContent('Responses (2)');
      expect(responseRefs).toHaveTextContent('GET');
      expect(responseRefs).toHaveTextContent('/users/{id}');
      expect(responseRefs).toHaveTextContent('(200)');
      expect(responseRefs).toHaveTextContent('/users');
    });

    it('renders property references', () => {
      renderWithContext(
        <SchemaObjectNode
          schemaName="User"
          schemaPath="components.schemas.User"
          referencedInProperties={[
            { propertyPath: 'components.schemas.Post.properties.author', propertyName: 'author' },
            { propertyPath: 'components.schemas.Comment.properties.user', propertyName: 'user' }
          ]}
        />
      );
      fireEvent.click(screen.getByTestId('reference-count-badge'));
      
      const propertyRefs = screen.getByTestId('property-references');
      expect(propertyRefs).toHaveTextContent('Properties (2)');
      expect(propertyRefs).toHaveTextContent('author');
      expect(propertyRefs).toHaveTextContent('user');
    });

    it('renders all reference types together', () => {
      renderWithContext(
        <SchemaObjectNode
          schemaName="User"
          schemaPath="components.schemas.User"
          referencedInRequestBodies={[
            { operationId: 'createUser', method: 'POST', path: '/users' }
          ]}
          referencedInResponses={[
            { operationId: 'getUser', method: 'GET', path: '/users/{id}', statusCode: '200' }
          ]}
          referencedInProperties={[
            { propertyPath: 'components.schemas.Post.properties.author', propertyName: 'author' }
          ]}
        />
      );
      fireEvent.click(screen.getByTestId('reference-count-badge'));
      
      expect(screen.getByTestId('request-body-references')).toBeInTheDocument();
      expect(screen.getByTestId('response-references')).toBeInTheDocument();
      expect(screen.getByTestId('property-references')).toBeInTheDocument();
    });

    it('toggles references panel visibility on badge click', () => {
      renderWithContext(
        <SchemaObjectNode
          schemaName="User"
          schemaPath="components.schemas.User"
          referencedInRequestBodies={[
            { operationId: 'createUser', method: 'POST', path: '/users' }
          ]}
        />
      );
      
      const badge = screen.getByTestId('reference-count-badge');
      
      // Initially hidden
      expect(screen.queryByTestId('references-panel')).not.toBeInTheDocument();
      
      // Show
      fireEvent.click(badge);
      expect(screen.getByTestId('references-panel')).toBeInTheDocument();
      
      // Hide again
      fireEvent.click(badge);
      expect(screen.queryByTestId('references-panel')).not.toBeInTheDocument();
    });

    it('dims references panel when schema is ignored', () => {
      const config = makeConfig({
        'components.schemas.User': { 'x-uigen-ignore': true }
      });
      renderWithContext(
        <SchemaObjectNode
          schemaName="User"
          schemaPath="components.schemas.User"
          referencedInRequestBodies={[
            { operationId: 'createUser', method: 'POST', path: '/users' }
          ]}
        />,
        config
      );
      fireEvent.click(screen.getByTestId('reference-count-badge'));
      
      const panel = screen.getByTestId('references-panel');
      expect(panel.className).toContain('opacity-50');
    });
  });

  describe('integration with IgnoreTooltip', () => {
    it('wraps the row with IgnoreTooltip', () => {
      renderWithContext(
        <SchemaObjectNode
          schemaName="User"
          schemaPath="components.schemas.User"
        />
      );
      expect(screen.getByTestId('ignore-tooltip-container')).toBeInTheDocument();
    });

    it('passes correct ignoreState to tooltip', async () => {
      const config = makeConfig({
        'components.schemas.User': { 'x-uigen-ignore': true }
      });
      renderWithContext(
        <SchemaObjectNode
          schemaName="User"
          schemaPath="components.schemas.User"
        />,
        config
      );
      
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
  });

  describe('config with null state', () => {
    it('renders without errors when config is null', () => {
      renderWithContext(
        <SchemaObjectNode
          schemaName="User"
          schemaPath="components.schemas.User"
        />,
        null
      );
      expect(screen.getByText('User')).toBeInTheDocument();
    });

    it('shows no dimming when config is null', () => {
      renderWithContext(
        <SchemaObjectNode
          schemaName="User"
          schemaPath="components.schemas.User"
        />,
        null
      );
      const row = screen.getByTestId('schema-object-row');
      expect(row.className).not.toContain('opacity-50');
    });

    it('toggle is enabled when config is null', () => {
      renderWithContext(
        <SchemaObjectNode
          schemaName="User"
          schemaPath="components.schemas.User"
        />,
        null
      );
      const toggle = screen.getByTestId('ignore-toggle-switch');
      expect(toggle).not.toBeDisabled();
    });
  });

  describe('edge cases', () => {
    it('handles empty properties array', () => {
      renderWithContext(
        <SchemaObjectNode
          schemaName="User"
          schemaPath="components.schemas.User"
          properties={[]}
        />
      );
      expect(screen.queryByTestId('expand-collapse-button')).not.toBeInTheDocument();
    });

    it('handles empty references arrays', () => {
      renderWithContext(
        <SchemaObjectNode
          schemaName="User"
          schemaPath="components.schemas.User"
          referencedInRequestBodies={[]}
          referencedInResponses={[]}
          referencedInProperties={[]}
        />
      );
      expect(screen.queryByTestId('reference-count-badge')).not.toBeInTheDocument();
    });

    it('handles schema with only request body references', () => {
      renderWithContext(
        <SchemaObjectNode
          schemaName="User"
          schemaPath="components.schemas.User"
          referencedInRequestBodies={[
            { operationId: 'createUser', method: 'POST', path: '/users' }
          ]}
        />
      );
      fireEvent.click(screen.getByTestId('reference-count-badge'));
      
      expect(screen.getByTestId('request-body-references')).toBeInTheDocument();
      expect(screen.queryByTestId('response-references')).not.toBeInTheDocument();
      expect(screen.queryByTestId('property-references')).not.toBeInTheDocument();
    });

    it('handles schema with only response references', () => {
      renderWithContext(
        <SchemaObjectNode
          schemaName="User"
          schemaPath="components.schemas.User"
          referencedInResponses={[
            { operationId: 'getUser', method: 'GET', path: '/users/{id}', statusCode: '200' }
          ]}
        />
      );
      fireEvent.click(screen.getByTestId('reference-count-badge'));
      
      expect(screen.queryByTestId('request-body-references')).not.toBeInTheDocument();
      expect(screen.getByTestId('response-references')).toBeInTheDocument();
      expect(screen.queryByTestId('property-references')).not.toBeInTheDocument();
    });

    it('handles schema with only property references', () => {
      renderWithContext(
        <SchemaObjectNode
          schemaName="User"
          schemaPath="components.schemas.User"
          referencedInProperties={[
            { propertyPath: 'components.schemas.Post.properties.author', propertyName: 'author' }
          ]}
        />
      );
      fireEvent.click(screen.getByTestId('reference-count-badge'));
      
      expect(screen.queryByTestId('request-body-references')).not.toBeInTheDocument();
      expect(screen.queryByTestId('response-references')).not.toBeInTheDocument();
      expect(screen.getByTestId('property-references')).toBeInTheDocument();
    });
  });
});
