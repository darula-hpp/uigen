import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ParameterNode, type ParameterInfo } from '../ParameterNode.js';
import { AppContext } from '../../../../contexts/AppContext.js';
import type { ConfigFile } from '@uigen-dev/core';

/**
 * Unit tests for ParameterNode component
 *
 * Requirements: 1.3, 11.1, 11.2, 11.3, 11.4, 11.5
 */

// Mock data
const mockQueryParameter: ParameterInfo = {
  name: 'limit',
  type: 'query',
  dataType: 'integer',
  location: 'operation-level',
  path: 'paths./users.get.parameters.query.limit',
  required: false,
  description: 'Maximum number of results'
};

const mockPathParameter: ParameterInfo = {
  name: 'userId',
  type: 'path',
  dataType: 'string',
  location: 'path-level',
  path: 'paths./users/{userId}.parameters.path.userId',
  required: true,
  description: 'User identifier'
};

const mockHeaderParameter: ParameterInfo = {
  name: 'Authorization',
  type: 'header',
  dataType: 'string',
  location: 'operation-level',
  path: 'paths./users.get.parameters.header.Authorization',
  required: true,
  description: 'Bearer token'
};

const mockCookieParameter: ParameterInfo = {
  name: 'sessionId',
  type: 'cookie',
  dataType: 'string',
  location: 'operation-level',
  path: 'paths./users.get.parameters.cookie.sessionId',
  required: false,
  description: 'Session identifier'
};

const mockParameters: ParameterInfo[] = [
  mockQueryParameter,
  mockPathParameter,
  mockHeaderParameter,
  mockCookieParameter
];

// Helper to create mock context
function createMockContext(config: ConfigFile | null = null) {
  const saveConfig = vi.fn();
  return {
    state: {
      config: config || {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {}
      },
      specFile: null,
      specStructure: null,
      loading: false,
      error: null
    },
    actions: {
      saveConfig,
      loadSpec: vi.fn(),
      loadConfig: vi.fn()
    }
  };
}

// Helper to render with context
function renderWithContext(
  ui: React.ReactElement,
  contextValue = createMockContext()
) {
  return {
    ...render(<AppContext.Provider value={contextValue}>{ui}</AppContext.Provider>),
    contextValue
  };
}

describe('ParameterNode', () => {
  describe('Basic Rendering', () => {
    it('should render ungrouped parameters when groupByType is false', () => {
      renderWithContext(
        <ParameterNode parameters={mockParameters} groupByType={false} />
      );

      // All parameters should be visible
      expect(screen.getByText('limit')).toBeInTheDocument();
      expect(screen.getByText('userId')).toBeInTheDocument();
      expect(screen.getByText('Authorization')).toBeInTheDocument();
      expect(screen.getByText('sessionId')).toBeInTheDocument();

      // Should not have group headers
      expect(screen.queryByText('Query Parameters')).not.toBeInTheDocument();
    });

    it('should render grouped parameters by default', () => {
      renderWithContext(<ParameterNode parameters={mockParameters} />);

      // Group headers should be visible
      expect(screen.getByText('Query Parameters')).toBeInTheDocument();
      expect(screen.getByText('Path Parameters')).toBeInTheDocument();
      expect(screen.getByText('Header Parameters')).toBeInTheDocument();
      expect(screen.getByText('Cookie Parameters')).toBeInTheDocument();
    });

    it('should display parameter name, type, and data type', () => {
      renderWithContext(
        <ParameterNode parameters={[mockQueryParameter]} groupByType={false} />
      );

      expect(screen.getByText('limit')).toBeInTheDocument();
      expect(screen.getByText('query')).toBeInTheDocument();
      expect(screen.getByText('integer')).toBeInTheDocument();
    });

    it('should display required indicator for required parameters', () => {
      renderWithContext(
        <ParameterNode parameters={[mockPathParameter]} groupByType={false} />
      );

      const requiredIndicator = screen.getByLabelText('required');
      expect(requiredIndicator).toBeInTheDocument();
      expect(requiredIndicator).toHaveTextContent('*');
    });

    it('should not display required indicator for optional parameters', () => {
      renderWithContext(
        <ParameterNode parameters={[mockQueryParameter]} groupByType={false} />
      );

      expect(screen.queryByLabelText('required')).not.toBeInTheDocument();
    });

    it('should display location badge when showLocation is true', () => {
      renderWithContext(
        <ParameterNode
          parameters={[mockQueryParameter]}
          groupByType={false}
          showLocation={true}
        />
      );

      expect(screen.getByText('operation-level')).toBeInTheDocument();
    });

    it('should not display location badge when showLocation is false', () => {
      renderWithContext(
        <ParameterNode
          parameters={[mockQueryParameter]}
          groupByType={false}
          showLocation={false}
        />
      );

      expect(screen.queryByText('operation-level')).not.toBeInTheDocument();
    });
  });

  describe('Parameter Type Grouping (Requirement 11.1)', () => {
    it('should group parameters by type', () => {
      renderWithContext(<ParameterNode parameters={mockParameters} />);

      // Check all group containers exist
      expect(screen.getByTestId('parameter-group-query')).toBeInTheDocument();
      expect(screen.getByTestId('parameter-group-path')).toBeInTheDocument();
      expect(screen.getByTestId('parameter-group-header')).toBeInTheDocument();
      expect(screen.getByTestId('parameter-group-cookie')).toBeInTheDocument();
    });

    it('should display count badge for each group', () => {
      renderWithContext(<ParameterNode parameters={mockParameters} />);

      const queryHeader = screen.getByTestId('parameter-group-query');
      expect(within(queryHeader).getByText('1')).toBeInTheDocument();
    });

    it('should expand/collapse groups on click', () => {
      renderWithContext(<ParameterNode parameters={mockParameters} />);

      // Initially expanded - parameter should be visible
      expect(screen.getByText('limit')).toBeInTheDocument();

      // Click to collapse
      const queryHeader = screen.getByTestId('parameter-group-query-header');
      fireEvent.click(queryHeader);

      // Parameter should be hidden
      expect(screen.queryByText('limit')).not.toBeInTheDocument();

      // Click to expand again
      fireEvent.click(queryHeader);

      // Parameter should be visible again
      expect(screen.getByText('limit')).toBeInTheDocument();
    });

    it('should not render empty groups', () => {
      renderWithContext(<ParameterNode parameters={[mockQueryParameter]} />);

      // Only query group should exist
      expect(screen.getByTestId('parameter-group-query')).toBeInTheDocument();

      // Other groups should not exist (they won't be rendered if empty)
      expect(screen.queryByTestId('parameter-group-path')).not.toBeInTheDocument();
      expect(screen.queryByTestId('parameter-group-header')).not.toBeInTheDocument();
      expect(screen.queryByTestId('parameter-group-cookie')).not.toBeInTheDocument();
    });
  });

  describe('Parameter Type Badges (Requirement 11.4)', () => {
    it('should display correct badge color for query parameters', () => {
      renderWithContext(
        <ParameterNode parameters={[mockQueryParameter]} groupByType={false} />
      );

      const badge = screen.getByTestId('parameter-type-badge');
      expect(badge).toHaveClass('bg-blue-100');
      expect(badge).toHaveTextContent('query');
    });

    it('should display correct badge color for path parameters', () => {
      renderWithContext(
        <ParameterNode parameters={[mockPathParameter]} groupByType={false} />
      );

      const badge = screen.getByTestId('parameter-type-badge');
      expect(badge).toHaveClass('bg-green-100');
      expect(badge).toHaveTextContent('path');
    });

    it('should display correct badge color for header parameters', () => {
      renderWithContext(
        <ParameterNode parameters={[mockHeaderParameter]} groupByType={false} />
      );

      const badge = screen.getByTestId('parameter-type-badge');
      expect(badge).toHaveClass('bg-purple-100');
      expect(badge).toHaveTextContent('header');
    });

    it('should display correct badge color for cookie parameters', () => {
      renderWithContext(
        <ParameterNode parameters={[mockCookieParameter]} groupByType={false} />
      );

      const badge = screen.getByTestId('parameter-type-badge');
      expect(badge).toHaveClass('bg-amber-100');
      expect(badge).toHaveTextContent('cookie');
    });
  });

  describe('Location Badges (Requirement 11.4)', () => {
    it('should display path-level badge with correct styling', () => {
      renderWithContext(
        <ParameterNode parameters={[mockPathParameter]} groupByType={false} />
      );

      const badge = screen.getByTestId('location-badge');
      expect(badge).toHaveClass('bg-indigo-100');
      expect(badge).toHaveTextContent('path-level');
    });

    it('should display operation-level badge with correct styling', () => {
      renderWithContext(
        <ParameterNode parameters={[mockQueryParameter]} groupByType={false} />
      );

      const badge = screen.getByTestId('location-badge');
      expect(badge).toHaveClass('bg-teal-100');
      expect(badge).toHaveTextContent('operation-level');
    });
  });

  describe('Ignore Toggle Integration (Requirement 1.3)', () => {
    it('should render ignore toggle for each parameter', () => {
      renderWithContext(
        <ParameterNode parameters={[mockQueryParameter]} groupByType={false} />
      );

      const toggle = screen.getByTestId('ignore-toggle-switch');
      expect(toggle).toBeInTheDocument();
    });

    it('should call saveConfig when toggle is clicked', () => {
      const context = createMockContext();
      renderWithContext(
        <ParameterNode parameters={[mockQueryParameter]} groupByType={false} />,
        context
      );

      const toggle = screen.getByTestId('ignore-toggle-switch');
      fireEvent.click(toggle);

      expect(context.actions.saveConfig).toHaveBeenCalled();
    });

    it('should set x-uigen-ignore to true when toggling to ignored', () => {
      const context = createMockContext();
      renderWithContext(
        <ParameterNode parameters={[mockQueryParameter]} groupByType={false} />,
        context
      );

      const toggle = screen.getByTestId('ignore-toggle-switch');
      fireEvent.click(toggle);

      const savedConfig = context.actions.saveConfig.mock.calls[0][0];
      expect(
        savedConfig.annotations['paths./users.get.parameters.query.limit']
      ).toEqual({
        'x-uigen-ignore': true
      });
    });

    it('should remove annotation when toggling from ignored to active', () => {
      const configWithIgnore: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'paths./users.get.parameters.query.limit': {
            'x-uigen-ignore': true
          }
        }
      };

      const context = createMockContext(configWithIgnore);
      renderWithContext(
        <ParameterNode parameters={[mockQueryParameter]} groupByType={false} />,
        context
      );

      const toggle = screen.getByTestId('ignore-toggle-switch');
      fireEvent.click(toggle);

      const savedConfig = context.actions.saveConfig.mock.calls[0][0];
      expect(
        savedConfig.annotations['paths./users.get.parameters.query.limit']
      ).toBeUndefined();
    });
  });

  describe('Visual Dimming (Requirement 2.1, 2.2)', () => {
    it('should apply opacity-50 when parameter is ignored', () => {
      const configWithIgnore: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'paths./users.get.parameters.query.limit': {
            'x-uigen-ignore': true
          }
        }
      };

      renderWithContext(
        <ParameterNode parameters={[mockQueryParameter]} groupByType={false} />,
        createMockContext(configWithIgnore)
      );

      const row = screen.getByTestId('parameter-row');
      expect(row).toHaveClass('opacity-50');
    });

    it('should not apply opacity when parameter is active', () => {
      renderWithContext(
        <ParameterNode parameters={[mockQueryParameter]} groupByType={false} />
      );

      const row = screen.getByTestId('parameter-row');
      expect(row).not.toHaveClass('opacity-50');
    });
  });

  describe('Path-Level Inheritance (Requirement 11.2, 11.3)', () => {
    it('should inherit ignore state from path-level parameter', () => {
      const configWithPathIgnore: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'paths./users/{userId}.parameters.path.userId': {
            'x-uigen-ignore': true
          }
        }
      };

      renderWithContext(
        <ParameterNode parameters={[mockPathParameter]} groupByType={false} />,
        createMockContext(configWithPathIgnore)
      );

      const row = screen.getByTestId('parameter-row');
      expect(row).toHaveClass('opacity-50');
    });

    it('should display explicit badge when parameter has direct annotation', () => {
      const configWithPathIgnore: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'paths./users/{userId}.parameters.path.userId': {
            'x-uigen-ignore': true
          }
        }
      };

      renderWithContext(
        <ParameterNode parameters={[mockPathParameter]} groupByType={false} />,
        createMockContext(configWithPathIgnore)
      );

      // Badge should show explicit state since annotation is directly on the parameter
      const badge = screen.getByTestId('annotation-badge');
      expect(badge).toHaveTextContent('Explicit');
    });
  });

  describe('Operation-Level Overrides (Requirement 11.5)', () => {
    it('should support override at operation level', () => {
      const configWithOverride: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'paths./users.get': {
            'x-uigen-ignore': true
          },
          'paths./users.get.parameters.query.limit': {
            'x-uigen-ignore': false
          }
        }
      };

      renderWithContext(
        <ParameterNode parameters={[mockQueryParameter]} groupByType={false} />,
        createMockContext(configWithOverride)
      );

      // Parameter should be active (not dimmed) due to override
      const row = screen.getByTestId('parameter-row');
      expect(row).not.toHaveClass('opacity-50');

      // Should display override badge
      const badge = screen.getByTestId('annotation-badge');
      expect(badge).toHaveTextContent('Override');
    });

    it('should allow toggling override annotation', () => {
      const configWithOverride: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'paths./users.get': {
            'x-uigen-ignore': true
          },
          'paths./users.get.parameters.query.limit': {
            'x-uigen-ignore': false
          }
        }
      };

      const context = createMockContext(configWithOverride);
      renderWithContext(
        <ParameterNode parameters={[mockQueryParameter]} groupByType={false} />,
        context
      );

      // Toggle to ignored
      const toggle = screen.getByTestId('ignore-toggle-switch');
      fireEvent.click(toggle);

      const savedConfig = context.actions.saveConfig.mock.calls[0][0];
      expect(
        savedConfig.annotations['paths./users.get.parameters.query.limit']
      ).toEqual({
        'x-uigen-ignore': true
      });
    });
  });

  describe('Tooltip Integration', () => {
    it('should wrap parameters in IgnoreTooltip', () => {
      renderWithContext(
        <ParameterNode parameters={[mockQueryParameter]} groupByType={false} />
      );

      const tooltipContainer = screen.getByTestId('ignore-tooltip-container');
      expect(tooltipContainer).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label for expand/collapse buttons', () => {
      renderWithContext(<ParameterNode parameters={mockParameters} />);

      const queryHeader = screen.getByTestId('parameter-group-query-header');
      expect(queryHeader).toHaveAttribute(
        'aria-label',
        'Collapse Query Parameters'
      );
    });

    it('should have proper aria-label for required indicator', () => {
      renderWithContext(
        <ParameterNode parameters={[mockPathParameter]} groupByType={false} />
      );

      const requiredIndicator = screen.getByLabelText('required');
      expect(requiredIndicator).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty parameters array', () => {
      renderWithContext(<ParameterNode parameters={[]} />);

      // Should not crash and should render empty container
      expect(screen.getByTestId('parameter-node-grouped')).toBeInTheDocument();
    });

    it('should handle parameters with missing optional fields', () => {
      const minimalParameter: ParameterInfo = {
        name: 'test',
        type: 'query',
        dataType: 'string',
        location: 'operation-level',
        path: 'paths./test.get.parameters.query.test'
      };

      renderWithContext(
        <ParameterNode parameters={[minimalParameter]} groupByType={false} />
      );

      expect(screen.getByText('test')).toBeInTheDocument();
    });

    it('should handle multiple parameters of the same type', () => {
      const multipleQueryParams: ParameterInfo[] = [
        {
          name: 'limit',
          type: 'query',
          dataType: 'integer',
          location: 'operation-level',
          path: 'paths./users.get.parameters.query.limit'
        },
        {
          name: 'offset',
          type: 'query',
          dataType: 'integer',
          location: 'operation-level',
          path: 'paths./users.get.parameters.query.offset'
        },
        {
          name: 'sort',
          type: 'query',
          dataType: 'string',
          location: 'operation-level',
          path: 'paths./users.get.parameters.query.sort'
        }
      ];

      renderWithContext(<ParameterNode parameters={multipleQueryParams} />);

      const queryGroup = screen.getByTestId('parameter-group-query');
      expect(within(queryGroup).getByText('3')).toBeInTheDocument();

      expect(screen.getByText('limit')).toBeInTheDocument();
      expect(screen.getByText('offset')).toBeInTheDocument();
      expect(screen.getByText('sort')).toBeInTheDocument();
    });
  });
});
