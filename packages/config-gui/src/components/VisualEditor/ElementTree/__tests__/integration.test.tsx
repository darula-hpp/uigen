import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { SchemaPropertyNode } from '../SchemaPropertyNode.js';
import { ParameterNode, type ParameterInfo } from '../ParameterNode.js';
import { RequestBodyNode, type RequestBodyInfo } from '../RequestBodyNode.js';
import { ResponseNode, type ResponseInfo } from '../ResponseNode.js';
import { OperationNode } from '../../OperationNode.js';
import { AppContext } from '../../../../contexts/AppContext.js';
import type { AppContextValue } from '../../../../contexts/AppContext.js';
import type { FieldNode, OperationNode as OperationNodeType } from '../../../../types/index.js';
import type { ConfigFile } from '@uigen-dev/core';

/**
 * Integration tests for Element Tree Nodes
 * 
 * These tests verify that:
 * - Components work together correctly
 * - State changes propagate properly
 * - Ignore states cascade correctly
 * - Badges display based on child component states
 * 
 * Requirements: 1.1-1.6, 10.1-10.5, 11.1-11.5, 12.1-12.5, 13.1-13.5
 */

// --- Helpers ---

function makeConfig(annotations: Record<string, Record<string, unknown>> = {}): ConfigFile {
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

describe('Element Tree Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Schema Property Nesting (Requirement 10.1-10.5)', () => {
    it('should render nested schema properties with proper indentation', () => {
      const nestedField: FieldNode = {
        key: 'address',
        label: 'Address',
        type: 'object',
        path: 'components.schemas.User.properties.address',
        required: false,
        annotations: {},
        children: [
          {
            key: 'street',
            label: 'Street',
            type: 'string',
            path: 'components.schemas.User.properties.address.properties.street',
            required: true,
            annotations: {}
          },
          {
            key: 'city',
            label: 'City',
            type: 'string',
            path: 'components.schemas.User.properties.address.properties.city',
            required: true,
            annotations: {}
          }
        ]
      };

      renderWithContext(<SchemaPropertyNode field={nestedField} />);

      // Parent should be visible
      expect(screen.getByText('Address')).toBeInTheDocument();

      // Children should be visible
      expect(screen.getByText('Street')).toBeInTheDocument();
      expect(screen.getByText('City')).toBeInTheDocument();

      // Check indentation levels
      const rows = screen.getAllByTestId('schema-property-row');
      expect(rows[0].className).not.toContain('ml-'); // Parent at level 0
      expect(rows[1].className).toContain('ml-4'); // Child at level 1
      expect(rows[2].className).toContain('ml-4'); // Child at level 1
    });

    it('should propagate ignore state from parent to children', () => {
      const config = makeConfig({
        'components.schemas.User.properties.address': { 'x-uigen-ignore': true }
      });

      const nestedField: FieldNode = {
        key: 'address',
        label: 'Address',
        type: 'object',
        path: 'components.schemas.User.properties.address',
        required: false,
        annotations: {},
        children: [
          {
            key: 'street',
            label: 'Street',
            type: 'string',
            path: 'components.schemas.User.properties.address.properties.street',
            required: true,
            annotations: {}
          }
        ]
      };

      renderWithContext(<SchemaPropertyNode field={nestedField} />, config);

      // Both parent and child should be dimmed
      const rows = screen.getAllByTestId('schema-property-row');
      expect(rows[0].className).toContain('opacity-50'); // Parent
      expect(rows[1].className).toContain('opacity-50'); // Child
    });

    it('should allow child override when parent is ignored', () => {
      const config = makeConfig({
        'components.schemas.User.properties.address': { 'x-uigen-ignore': true },
        'components.schemas.User.properties.address.properties.street': { 'x-uigen-ignore': false }
      });

      const nestedField: FieldNode = {
        key: 'address',
        label: 'Address',
        type: 'object',
        path: 'components.schemas.User.properties.address',
        required: false,
        annotations: {},
        children: [
          {
            key: 'street',
            label: 'Street',
            type: 'string',
            path: 'components.schemas.User.properties.address.properties.street',
            required: true,
            annotations: {}
          }
        ]
      };

      renderWithContext(<SchemaPropertyNode field={nestedField} />, config);

      const rows = screen.getAllByTestId('schema-property-row');
      expect(rows[0].className).toContain('opacity-50'); // Parent dimmed
      expect(rows[1].className).not.toContain('opacity-50'); // Child not dimmed (override)
    });

    it('should toggle nested properties at any level', async () => {
      const saveConfig = vi.fn().mockResolvedValue(undefined);

      const nestedField: FieldNode = {
        key: 'address',
        label: 'Address',
        type: 'object',
        path: 'components.schemas.User.properties.address',
        required: false,
        annotations: {},
        children: [
          {
            key: 'street',
            label: 'Street',
            type: 'string',
            path: 'components.schemas.User.properties.address.properties.street',
            required: true,
            annotations: {}
          }
        ]
      };

      renderWithContext(<SchemaPropertyNode field={nestedField} />, null, saveConfig);

      // Toggle the child property
      const toggles = screen.getAllByTestId('ignore-toggle-switch');
      fireEvent.click(toggles[1]); // Click child toggle

      expect(saveConfig).toHaveBeenCalledOnce();
      const savedConfig = saveConfig.mock.calls[0][0] as ConfigFile;
      expect(savedConfig.annotations['components.schemas.User.properties.address.properties.street']).toMatchObject({
        'x-uigen-ignore': true
      });
    });
  });

  describe('Parameter Type Grouping and Inheritance (Requirement 11.1-11.5)', () => {
    it('should group parameters by type', () => {
      const parameters: ParameterInfo[] = [
        {
          name: 'limit',
          type: 'query',
          dataType: 'integer',
          location: 'operation-level',
          path: 'paths./users.get.parameters.query.limit'
        },
        {
          name: 'userId',
          type: 'path',
          dataType: 'string',
          location: 'path-level',
          path: 'paths./users/{userId}.parameters.path.userId',
          required: true
        },
        {
          name: 'Authorization',
          type: 'header',
          dataType: 'string',
          location: 'operation-level',
          path: 'paths./users.get.parameters.header.Authorization',
          required: true
        }
      ];

      renderWithContext(<ParameterNode parameters={parameters} />);

      // All groups should be present
      expect(screen.getByTestId('parameter-group-query')).toBeInTheDocument();
      expect(screen.getByTestId('parameter-group-path')).toBeInTheDocument();
      expect(screen.getByTestId('parameter-group-header')).toBeInTheDocument();

      // Parameters should be visible
      expect(screen.getByText('limit')).toBeInTheDocument();
      expect(screen.getByText('userId')).toBeInTheDocument();
      expect(screen.getByText('Authorization')).toBeInTheDocument();
    });

    it('should handle path-level parameter inheritance', () => {
      const config = makeConfig({
        'paths./users/{userId}.parameters.path.userId': { 'x-uigen-ignore': true }
      });

      const parameters: ParameterInfo[] = [
        {
          name: 'userId',
          type: 'path',
          dataType: 'string',
          location: 'path-level',
          path: 'paths./users/{userId}.parameters.path.userId',
          required: true
        }
      ];

      renderWithContext(<ParameterNode parameters={parameters} groupByType={false} />, config);

      // Parameter should be dimmed
      const row = screen.getByTestId('parameter-row');
      expect(row.className).toContain('opacity-50');
    });

    it('should support operation-level overrides', () => {
      const config = makeConfig({
        'paths./users.get': { 'x-uigen-ignore': true },
        'paths./users.get.parameters.query.limit': { 'x-uigen-ignore': false }
      });

      const parameters: ParameterInfo[] = [
        {
          name: 'limit',
          type: 'query',
          dataType: 'integer',
          location: 'operation-level',
          path: 'paths./users.get.parameters.query.limit'
        }
      ];

      renderWithContext(<ParameterNode parameters={parameters} groupByType={false} />, config);

      // Parameter should not be dimmed (override)
      const row = screen.getByTestId('parameter-row');
      expect(row.className).not.toContain('opacity-50');
    });
  });

  describe('Request Body and Operation Badge Integration (Requirement 12.1-12.5)', () => {
    it('should display "No Input Form" badge on operation when request body is ignored', () => {
      const config = makeConfig({
        'paths./users.post.requestBody': { 'x-uigen-ignore': true }
      });

      const operation: OperationNodeType = {
        id: 'op-1',
        uigenId: 'uigen-op-1',
        method: 'POST',
        path: '/users',
        annotations: {}
      };

      renderWithContext(<OperationNode operation={operation} />, config);

      expect(screen.getByTestId('no-input-form-badge')).toBeInTheDocument();
      expect(screen.getByText('No Input Form')).toBeInTheDocument();
    });

    it('should not display badge when request body is active', () => {
      const operation: OperationNodeType = {
        id: 'op-1',
        uigenId: 'uigen-op-1',
        method: 'POST',
        path: '/users',
        annotations: {}
      };

      renderWithContext(<OperationNode operation={operation} />);

      expect(screen.queryByTestId('no-input-form-badge')).not.toBeInTheDocument();
    });

    it('should dim request body when ignored', () => {
      const config = makeConfig({
        'paths./users.post.requestBody': { 'x-uigen-ignore': true }
      });

      const requestBody: RequestBodyInfo = {
        path: 'paths./users.post.requestBody',
        contentType: 'application/json',
        required: true
      };

      renderWithContext(<RequestBodyNode requestBody={requestBody} />, config);

      const node = screen.getByTestId('request-body-node');
      expect(node.className).toContain('opacity-50');
    });

    it('should hide schema properties when request body is ignored', () => {
      const config = makeConfig({
        'paths./users.post.requestBody': { 'x-uigen-ignore': true }
      });

      const requestBody: RequestBodyInfo = {
        path: 'paths./users.post.requestBody',
        contentType: 'application/json',
        required: true,
        properties: [
          { name: 'name', type: 'string', required: true }
        ]
      };

      renderWithContext(<RequestBodyNode requestBody={requestBody} />, config);

      // Schema properties should not be visible
      expect(screen.queryByTestId('schema-properties')).not.toBeInTheDocument();
    });
  });

  describe('Response and Operation Badge Integration (Requirement 13.1-13.5)', () => {
    it('should display "No Output" badge on operation when all responses are ignored', () => {
      const config = makeConfig({
        'paths./users.get.responses.200': { 'x-uigen-ignore': true },
        'paths./users.get.responses.404': { 'x-uigen-ignore': true }
      });

      const operation: OperationNodeType = {
        id: 'op-1',
        uigenId: 'uigen-op-1',
        method: 'GET',
        path: '/users',
        annotations: {}
      };

      renderWithContext(<OperationNode operation={operation} />, config);

      expect(screen.getByTestId('no-output-badge')).toBeInTheDocument();
      expect(screen.getByText('No Output')).toBeInTheDocument();
    });

    it('should not display badge when some responses are active', () => {
      const config = makeConfig({
        'paths./users.get.responses.200': { 'x-uigen-ignore': false },
        'paths./users.get.responses.404': { 'x-uigen-ignore': true }
      });

      const operation: OperationNodeType = {
        id: 'op-1',
        uigenId: 'uigen-op-1',
        method: 'GET',
        path: '/users',
        annotations: {}
      };

      renderWithContext(<OperationNode operation={operation} />, config);

      expect(screen.queryByTestId('no-output-badge')).not.toBeInTheDocument();
    });

    it('should dim response when ignored', () => {
      const config = makeConfig({
        'paths./users.get.responses.200': { 'x-uigen-ignore': true }
      });

      const response: ResponseInfo = {
        path: 'paths./users.get.responses.200',
        statusCode: '200',
        contentType: 'application/json'
      };

      renderWithContext(<ResponseNode response={response} />, config);

      const node = screen.getByTestId('response-node');
      expect(node.className).toContain('opacity-50');
    });

    it('should hide schema properties when response is ignored', () => {
      const config = makeConfig({
        'paths./users.get.responses.200': { 'x-uigen-ignore': true }
      });

      const response: ResponseInfo = {
        path: 'paths./users.get.responses.200',
        statusCode: '200',
        contentType: 'application/json',
        properties: [
          { name: 'id', type: 'integer', required: true }
        ]
      };

      renderWithContext(<ResponseNode response={response} />, config);

      // Schema properties should not be visible
      expect(screen.queryByTestId('schema-properties')).not.toBeInTheDocument();
    });

    it('should display both badges when request body and all responses are ignored', () => {
      const config = makeConfig({
        'paths./users.post.requestBody': { 'x-uigen-ignore': true },
        'paths./users.post.responses.200': { 'x-uigen-ignore': true },
        'paths./users.post.responses.400': { 'x-uigen-ignore': true }
      });

      const operation: OperationNodeType = {
        id: 'op-1',
        uigenId: 'uigen-op-1',
        method: 'POST',
        path: '/users',
        annotations: {}
      };

      renderWithContext(<OperationNode operation={operation} />, config);

      expect(screen.getByTestId('no-input-form-badge')).toBeInTheDocument();
      expect(screen.getByTestId('no-output-badge')).toBeInTheDocument();
    });
  });

  describe('Cross-Component State Propagation', () => {
    it('should update operation badges when request body state changes', async () => {
      const saveConfig = vi.fn().mockResolvedValue(undefined);

      const operation: OperationNodeType = {
        id: 'op-1',
        uigenId: 'uigen-op-1',
        method: 'POST',
        path: '/users',
        annotations: {}
      };

      const requestBody: RequestBodyInfo = {
        path: 'paths./users.post.requestBody',
        contentType: 'application/json',
        required: true
      };

      const { rerender } = renderWithContext(
        <>
          <OperationNode operation={operation} />
          <RequestBodyNode requestBody={requestBody} />
        </>,
        null,
        saveConfig
      );

      // Initially no badge
      expect(screen.queryByTestId('no-input-form-badge')).not.toBeInTheDocument();

      // Toggle request body to ignored
      const toggle = screen.getByTestId('ignore-toggle-switch');
      fireEvent.click(toggle);

      // Simulate config update
      const newConfig = makeConfig({
        'paths./users.post.requestBody': { 'x-uigen-ignore': true }
      });

      rerender(
        <AppContext.Provider value={{
          state: {
            config: newConfig,
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
        }}>
          <OperationNode operation={operation} />
          <RequestBodyNode requestBody={requestBody} />
        </AppContext.Provider>
      );

      // Badge should now appear
      expect(screen.getByTestId('no-input-form-badge')).toBeInTheDocument();
    });

    it('should handle complex nesting with multiple levels', () => {
      const config = makeConfig({
        'components.schemas.User': { 'x-uigen-ignore': true },
        'components.schemas.User.properties.address': { 'x-uigen-ignore': false },
        'components.schemas.User.properties.address.properties.street': { 'x-uigen-ignore': true }
      });

      const deeplyNested: FieldNode = {
        key: 'user',
        label: 'User',
        type: 'object',
        path: 'components.schemas.User',
        required: false,
        annotations: {},
        children: [
          {
            key: 'address',
            label: 'Address',
            type: 'object',
            path: 'components.schemas.User.properties.address',
            required: false,
            annotations: {},
            children: [
              {
                key: 'street',
                label: 'Street',
                type: 'string',
                path: 'components.schemas.User.properties.address.properties.street',
                required: true,
                annotations: {}
              }
            ]
          }
        ]
      };

      renderWithContext(<SchemaPropertyNode field={deeplyNested} />, config);

      const rows = screen.getAllByTestId('schema-property-row');
      
      // User (ignored)
      expect(rows[0].className).toContain('opacity-50');
      
      // Address (override to false, so not dimmed)
      expect(rows[1].className).not.toContain('opacity-50');
      
      // Street (explicitly ignored)
      expect(rows[2].className).toContain('opacity-50');
    });
  });

  describe('Referenced Schema Ignore Detection', () => {
    it('should detect when request body references an ignored schema', () => {
      const config = makeConfig({
        'components.schemas.User': { 'x-uigen-ignore': true }
      });

      const requestBody: RequestBodyInfo = {
        path: 'paths./users.post.requestBody',
        contentType: 'application/json',
        schemaRef: '#/components/schemas/User',
        required: true
      };

      renderWithContext(<RequestBodyNode requestBody={requestBody} />, config);

      // Schema ref badge should indicate the schema is ignored
      const badge = screen.getByTestId('schema-ref-badge');
      expect(badge.className).toContain('bg-red-100'); // Red indicates ignored
    });

    it('should detect when response references an ignored schema', () => {
      const config = makeConfig({
        'components.schemas.User': { 'x-uigen-ignore': true }
      });

      const response: ResponseInfo = {
        path: 'paths./users.get.responses.200',
        statusCode: '200',
        contentType: 'application/json',
        schemaRef: '#/components/schemas/User'
      };

      renderWithContext(<ResponseNode response={response} />, config);

      // Schema ref badge should indicate the schema is ignored
      const badge = screen.getByTestId('schema-ref-badge');
      expect(badge.className).toContain('bg-red-100'); // Red indicates ignored
    });
  });
});
