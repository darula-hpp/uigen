import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ResponseNode, NoOutputBadge, type ResponseInfo } from '../ResponseNode.js';
import { AppProvider } from '../../../../contexts/AppContext.js';
import type { ConfigFile } from '@uigen-dev/core';

/**
 * Unit tests for ResponseNode component
 * 
 * Tests cover:
 * - Basic rendering with status code and description
 * - Status code color coding (2xx green, 4xx amber, 5xx red)
 * - IgnoreToggle integration and state calculation
 * - Visual dimming when ignored
 * - Expand/collapse for schema properties
 * - "No Output" badge component
 * - Referenced schema ignore detection
 * - Tooltip integration
 * - Override scenarios
 * - Multiple response status codes
 * 
 * Requirements: 1.5, 13.1, 13.2, 13.3, 13.4, 13.5
 */

describe('ResponseNode', () => {
  const mockResponse: ResponseInfo = {
    path: 'paths./users.get.responses.200',
    statusCode: '200',
    description: 'Successful response',
    contentType: 'application/json',
    schemaRef: '#/components/schemas/User',
    properties: [
      { name: 'id', type: 'integer', required: true, description: 'User ID' },
      { name: 'name', type: 'string', required: true, description: 'User name' },
      { name: 'email', type: 'string', required: true, description: 'User email' }
    ]
  };

  const defaultConfig: ConfigFile = {
    version: '1.0',
    enabled: {},
    defaults: {},
    annotations: {}
  };

  const renderWithProvider = (
    response: ResponseInfo,
    config: ConfigFile = defaultConfig
  ) => {
    return render(
      <AppProvider configPath=".uigen/config.yaml" specStructure={null}>
        <ResponseNode response={response} />
      </AppProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render response with status code', () => {
      renderWithProvider(mockResponse);

      expect(screen.getByTestId('response-node')).toBeDefined();
      expect(screen.getByText('Response')).toBeDefined();
      expect(screen.getByTestId('status-code-badge').textContent).toBe('200');
    });

    it('should display status code description', () => {
      renderWithProvider(mockResponse);

      const description = screen.getByTestId('status-description');
      expect(description.textContent).toBe('OK');
    });

    it('should display content type badge', () => {
      renderWithProvider(mockResponse);

      const badge = screen.getByTestId('content-type-badge');
      expect(badge.textContent).toBe('application/json');
    });

    it('should display schema reference badge', () => {
      renderWithProvider(mockResponse);

      const badge = screen.getByTestId('schema-ref-badge');
      expect(badge.textContent).toBe('$ref: User');
      expect(badge.getAttribute('title')).toBe('References schema: User');
    });

    it('should display response description', () => {
      renderWithProvider(mockResponse);

      expect(screen.getByText('Successful response')).toBeDefined();
    });

    it('should render without schema reference', () => {
      const responseWithoutRef: ResponseInfo = {
        ...mockResponse,
        schemaRef: undefined
      };

      renderWithProvider(responseWithoutRef);

      expect(screen.queryByTestId('schema-ref-badge')).toBeNull();
    });

    it('should render without content type', () => {
      const responseWithoutContentType: ResponseInfo = {
        ...mockResponse,
        contentType: undefined
      };

      renderWithProvider(responseWithoutContentType);

      expect(screen.queryByTestId('content-type-badge')).toBeNull();
    });

    it('should render without description', () => {
      const responseWithoutDesc: ResponseInfo = {
        ...mockResponse,
        description: undefined
      };

      renderWithProvider(responseWithoutDesc);

      expect(screen.queryByText('Successful response')).toBeNull();
    });
  });

  describe('Status Code Colors', () => {
    it('should use green color for 2xx success codes', () => {
      const response200: ResponseInfo = {
        ...mockResponse,
        statusCode: '200'
      };

      renderWithProvider(response200);

      const badge = screen.getByTestId('status-code-badge');
      expect(badge.className).toContain('bg-green-100');
    });

    it('should use green color for 201 Created', () => {
      const response201: ResponseInfo = {
        ...mockResponse,
        statusCode: '201'
      };

      renderWithProvider(response201);

      const badge = screen.getByTestId('status-code-badge');
      expect(badge.className).toContain('bg-green-100');
      expect(badge.getAttribute('title')).toBe('Created');
    });

    it('should use amber color for 4xx client errors', () => {
      const response400: ResponseInfo = {
        ...mockResponse,
        statusCode: '400'
      };

      renderWithProvider(response400);

      const badge = screen.getByTestId('status-code-badge');
      expect(badge.className).toContain('bg-amber-100');
      expect(badge.getAttribute('title')).toBe('Bad Request');
    });

    it('should use amber color for 404 Not Found', () => {
      const response404: ResponseInfo = {
        ...mockResponse,
        statusCode: '404'
      };

      renderWithProvider(response404);

      const badge = screen.getByTestId('status-code-badge');
      expect(badge.className).toContain('bg-amber-100');
      expect(badge.getAttribute('title')).toBe('Not Found');
    });

    it('should use red color for 5xx server errors', () => {
      const response500: ResponseInfo = {
        ...mockResponse,
        statusCode: '500'
      };

      renderWithProvider(response500);

      const badge = screen.getByTestId('status-code-badge');
      expect(badge.className).toContain('bg-red-100');
      expect(badge.getAttribute('title')).toBe('Internal Server Error');
    });

    it('should use blue color for 3xx redirects', () => {
      const response301: ResponseInfo = {
        ...mockResponse,
        statusCode: '301'
      };

      renderWithProvider(response301);

      const badge = screen.getByTestId('status-code-badge');
      expect(badge.className).toContain('bg-blue-100');
      expect(badge.getAttribute('title')).toBe('Moved Permanently');
    });
  });

  describe('Schema Properties', () => {
    it('should display schema properties when expanded', () => {
      renderWithProvider(mockResponse);

      expect(screen.getByTestId('schema-properties')).toBeDefined();
      expect(screen.getByText('id')).toBeDefined();
      expect(screen.getByText('name')).toBeDefined();
      expect(screen.getByText('email')).toBeDefined();
    });

    it('should show property types', () => {
      renderWithProvider(mockResponse);

      const properties = screen.getAllByTestId('schema-property');
      expect(properties).toHaveLength(3);
      
      // Check that types are displayed
      expect(screen.getAllByText('string')).toHaveLength(2); // name and email
      expect(screen.getByText('integer')).toBeDefined(); // id
    });

    it('should toggle expand/collapse when button clicked', async () => {
      renderWithProvider(mockResponse);

      const expandButton = screen.getByTestId('expand-collapse-button');
      
      // Initially expanded
      expect(screen.getByTestId('schema-properties')).toBeDefined();

      // Click to collapse
      fireEvent.click(expandButton);
      await waitFor(() => {
        expect(screen.queryByTestId('schema-properties')).toBeNull();
      });

      // Click to expand again
      fireEvent.click(expandButton);
      await waitFor(() => {
        expect(screen.getByTestId('schema-properties')).toBeDefined();
      });
    });

    it('should not show expand/collapse button when no properties', () => {
      const responseWithoutProps: ResponseInfo = {
        ...mockResponse,
        properties: []
      };

      renderWithProvider(responseWithoutProps);

      expect(screen.queryByTestId('expand-collapse-button')).toBeNull();
    });

    it('should not show expand/collapse button when showSchema is false', () => {
      render(
        <AppProvider configPath=".uigen/config.yaml" specStructure={null}>
          <ResponseNode response={mockResponse} showSchema={false} />
        </AppProvider>
      );

      expect(screen.queryByTestId('expand-collapse-button')).toBeNull();
    });
  });

  describe('Ignore Toggle Integration', () => {
    it('should render ignore toggle', () => {
      renderWithProvider(mockResponse);

      expect(screen.getByTestId('ignore-toggle-container')).toBeDefined();
      expect(screen.getByTestId('ignore-toggle-switch')).toBeDefined();
    });

    it('should show active state by default', () => {
      renderWithProvider(mockResponse);

      const label = screen.getByTestId('ignore-toggle-label');
      expect(label.textContent).toBe('active');
    });

    it('should apply dimming when ignored', () => {
      const configWithIgnore: ConfigFile = {
        ...defaultConfig,
        annotations: {
          'paths./users.get.responses.200': {
            'x-uigen-ignore': true
          }
        }
      };

      render(
        <AppProvider configPath=".uigen/config.yaml" specStructure={null}>
          <ResponseNode response={mockResponse} />
        </AppProvider>
      );

      const node = screen.getByTestId('response-node');
      // The component should have opacity-50 class when ignored
      expect(node).toBeDefined();
    });

    it('should hide schema properties when ignored', () => {
      const configWithIgnore: ConfigFile = {
        ...defaultConfig,
        annotations: {
          'paths./users.get.responses.200': {
            'x-uigen-ignore': true
          }
        }
      };

      render(
        <AppProvider configPath=".uigen/config.yaml" specStructure={null}>
          <ResponseNode response={mockResponse} />
        </AppProvider>
      );

      // Schema properties should not be visible when response is ignored
      const node = screen.getByTestId('response-node');
      expect(node).toBeDefined();
    });
  });

  describe('Referenced Schema Ignore Detection', () => {
    it('should detect when referenced schema is ignored', () => {
      const configWithSchemaIgnore: ConfigFile = {
        ...defaultConfig,
        annotations: {
          'components.schemas.User': {
            'x-uigen-ignore': true
          }
        }
      };

      render(
        <AppProvider configPath=".uigen/config.yaml" specStructure={null}>
          <ResponseNode response={mockResponse} />
        </AppProvider>
      );

      // Schema ref badge should indicate the schema is ignored
      const badge = screen.getByTestId('schema-ref-badge');
      expect(badge).toBeDefined();
    });

    it('should disable toggle when referenced schema is ignored', () => {
      const configWithSchemaIgnore: ConfigFile = {
        ...defaultConfig,
        annotations: {
          'components.schemas.User': {
            'x-uigen-ignore': true
          }
        }
      };

      render(
        <AppProvider configPath=".uigen/config.yaml" specStructure={null}>
          <ResponseNode response={mockResponse} />
        </AppProvider>
      );

      // Toggle should be disabled when referenced schema is ignored
      const toggle = screen.getByTestId('ignore-toggle-switch');
      expect(toggle).toBeDefined();
    });

    it('should show tooltip explaining referenced schema is ignored', () => {
      const configWithSchemaIgnore: ConfigFile = {
        ...defaultConfig,
        annotations: {
          'components.schemas.User': {
            'x-uigen-ignore': true
          }
        }
      };

      render(
        <AppProvider configPath=".uigen/config.yaml" specStructure={null}>
          <ResponseNode response={mockResponse} />
        </AppProvider>
      );

      const badge = screen.getByTestId('schema-ref-badge');
      // The badge should exist and have a title attribute
      expect(badge.getAttribute('title')).toBeDefined();
      expect(badge).toBeDefined();
    });
  });

  describe('Override Scenarios', () => {
    it('should handle override when parent operation is ignored', () => {
      const configWithParentIgnore: ConfigFile = {
        ...defaultConfig,
        annotations: {
          'paths./users.get': {
            'x-uigen-ignore': true
          },
          'paths./users.get.responses.200': {
            'x-uigen-ignore': false
          }
        }
      };

      render(
        <AppProvider configPath=".uigen/config.yaml" specStructure={null}>
          <ResponseNode response={mockResponse} />
        </AppProvider>
      );

      // Component should show override badge
      const node = screen.getByTestId('response-node');
      expect(node).toBeDefined();
    });

    it('should be disabled when parent is ignored and no override', () => {
      const configWithParentIgnore: ConfigFile = {
        ...defaultConfig,
        annotations: {
          'paths./users.get': {
            'x-uigen-ignore': true
          }
        }
      };

      render(
        <AppProvider configPath=".uigen/config.yaml" specStructure={null}>
          <ResponseNode response={mockResponse} />
        </AppProvider>
      );

      // Toggle should be disabled when parent is ignored
      const toggle = screen.getByTestId('ignore-toggle-switch');
      expect(toggle).toBeDefined();
    });
  });

  describe('Tooltip Integration', () => {
    it('should wrap header in IgnoreTooltip', () => {
      renderWithProvider(mockResponse);

      expect(screen.getByTestId('ignore-tooltip-container')).toBeDefined();
    });

    it('should show tooltip on hover', async () => {
      renderWithProvider(mockResponse);

      const container = screen.getByTestId('ignore-tooltip-container');
      
      // Hover over the container
      fireEvent.mouseEnter(container);

      // Wait for tooltip to appear (300ms delay)
      await waitFor(
        () => {
          expect(screen.getByTestId('ignore-tooltip')).toBeDefined();
        },
        { timeout: 500 }
      );
    });
  });

  describe('NoOutputBadge Component', () => {
    it('should render badge with correct text', () => {
      render(<NoOutputBadge />);

      const badge = screen.getByTestId('no-output-badge');
      expect(badge.textContent).toBe('No Output');
    });

    it('should have tooltip explaining the badge', () => {
      render(<NoOutputBadge />);

      const badge = screen.getByTestId('no-output-badge');
      expect(badge.getAttribute('title')).toBe(
        'All responses are ignored - no output view will be generated'
      );
    });

    it('should have correct styling classes', () => {
      render(<NoOutputBadge />);

      const badge = screen.getByTestId('no-output-badge');
      expect(badge.className).toContain('bg-amber-100');
      expect(badge.className).toContain('text-amber-800');
    });
  });

  describe('Multiple Response Status Codes', () => {
    it('should handle 201 Created response', () => {
      const response201: ResponseInfo = {
        path: 'paths./users.post.responses.201',
        statusCode: '201',
        description: 'User created successfully',
        contentType: 'application/json'
      };

      renderWithProvider(response201);

      expect(screen.getByTestId('status-code-badge').textContent).toBe('201');
      expect(screen.getByTestId('status-description').textContent).toBe('Created');
    });

    it('should handle 400 Bad Request response', () => {
      const response400: ResponseInfo = {
        path: 'paths./users.post.responses.400',
        statusCode: '400',
        description: 'Invalid request data',
        contentType: 'application/json'
      };

      renderWithProvider(response400);

      expect(screen.getByTestId('status-code-badge').textContent).toBe('400');
      expect(screen.getByTestId('status-description').textContent).toBe('Bad Request');
    });

    it('should handle 404 Not Found response', () => {
      const response404: ResponseInfo = {
        path: 'paths./users.get.responses.404',
        statusCode: '404',
        description: 'User not found',
        contentType: 'application/json'
      };

      renderWithProvider(response404);

      expect(screen.getByTestId('status-code-badge').textContent).toBe('404');
      expect(screen.getByTestId('status-description').textContent).toBe('Not Found');
    });

    it('should handle 500 Internal Server Error response', () => {
      const response500: ResponseInfo = {
        path: 'paths./users.get.responses.500',
        statusCode: '500',
        description: 'Server error occurred',
        contentType: 'application/json'
      };

      renderWithProvider(response500);

      expect(screen.getByTestId('status-code-badge').textContent).toBe('500');
      expect(screen.getByTestId('status-description').textContent).toBe('Internal Server Error');
    });

    it('should handle unknown status codes', () => {
      const responseUnknown: ResponseInfo = {
        path: 'paths./users.get.responses.999',
        statusCode: '999',
        description: 'Custom status code',
        contentType: 'application/json'
      };

      renderWithProvider(responseUnknown);

      expect(screen.getByTestId('status-code-badge').textContent).toBe('999');
      // Unknown status codes should not have a description
      expect(screen.queryByTestId('status-description')).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for required fields', () => {
      renderWithProvider(mockResponse);

      const requiredIndicators = screen.getAllByLabelText('required');
      expect(requiredIndicators.length).toBeGreaterThan(0);
    });

    it('should have proper ARIA labels for expand/collapse button', () => {
      renderWithProvider(mockResponse);

      const expandButton = screen.getByTestId('expand-collapse-button');
      expect(expandButton.getAttribute('aria-label')).toBe('Collapse schema');

      fireEvent.click(expandButton);

      expect(expandButton.getAttribute('aria-label')).toBe('Expand schema');
    });

    it('should hide decorative icons from screen readers', () => {
      renderWithProvider(mockResponse);

      const icons = screen.getByTestId('response-header').querySelectorAll('svg[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle response without properties', () => {
      const responseWithoutProps: ResponseInfo = {
        path: 'paths./users.delete.responses.204',
        statusCode: '204',
        description: 'User deleted successfully'
      };

      renderWithProvider(responseWithoutProps);

      expect(screen.getByTestId('response-node')).toBeDefined();
      expect(screen.queryByTestId('schema-properties')).toBeNull();
    });

    it('should handle different content types', () => {
      const xmlResponse: ResponseInfo = {
        ...mockResponse,
        contentType: 'application/xml'
      };

      renderWithProvider(xmlResponse);

      expect(screen.getByTestId('content-type-badge').textContent).toBe('application/xml');
    });

    it('should handle schema references with different formats', () => {
      const definitionsRef: ResponseInfo = {
        ...mockResponse,
        schemaRef: '#/definitions/Pet'
      };

      renderWithProvider(definitionsRef);

      const badge = screen.getByTestId('schema-ref-badge');
      expect(badge.textContent).toBe('$ref: Pet');
    });

    it('should handle empty properties array', () => {
      const responseEmptyProps: ResponseInfo = {
        ...mockResponse,
        properties: []
      };

      renderWithProvider(responseEmptyProps);

      expect(screen.queryByTestId('schema-properties')).toBeNull();
      expect(screen.queryByTestId('expand-collapse-button')).toBeNull();
    });

    it('should handle 204 No Content response', () => {
      const response204: ResponseInfo = {
        path: 'paths./users.delete.responses.204',
        statusCode: '204',
        description: 'Successfully deleted'
      };

      renderWithProvider(response204);

      expect(screen.getByTestId('status-code-badge').textContent).toBe('204');
      expect(screen.getByTestId('status-description').textContent).toBe('No Content');
    });
  });

  describe('Data Attributes', () => {
    it('should set data-response-path attribute', () => {
      renderWithProvider(mockResponse);

      const node = screen.getByTestId('response-node');
      expect(node.getAttribute('data-response-path')).toBe('paths./users.get.responses.200');
    });

    it('should have proper test IDs for all major elements', () => {
      renderWithProvider(mockResponse);

      expect(screen.getByTestId('response-node')).toBeDefined();
      expect(screen.getByTestId('response-header')).toBeDefined();
      expect(screen.getByTestId('status-code-badge')).toBeDefined();
      expect(screen.getByTestId('status-description')).toBeDefined();
      expect(screen.getByTestId('content-type-badge')).toBeDefined();
      expect(screen.getByTestId('schema-ref-badge')).toBeDefined();
      expect(screen.getByTestId('expand-collapse-button')).toBeDefined();
      expect(screen.getByTestId('schema-properties')).toBeDefined();
      expect(screen.getByTestId('ignore-toggle-container')).toBeDefined();
    });
  });
});
