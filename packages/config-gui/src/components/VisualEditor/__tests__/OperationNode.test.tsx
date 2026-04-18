import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OperationNode } from '../OperationNode.js';
import { AppContext } from '../../../contexts/AppContext.js';
import { KeyboardNavigationProvider } from '../../../contexts/KeyboardNavigationContext.js';
import type { OperationNode as OperationNodeType } from '../../../types/index.js';
import type { ConfigFile } from '@uigen-dev/core';

describe('OperationNode', () => {
  const mockOperation: OperationNodeType = {
    id: 'op-1',
    uigenId: 'uigen-op-1',
    method: 'POST',
    path: '/auth/login',
    summary: 'User login',
    annotations: {}
  };

  const createMockContext = (config: ConfigFile | null = null) => ({
    state: {
      config,
      annotations: [],
      specStructure: null,
      specPath: null,
      configPath: '.uigen/config.yaml',
      handlers: [],
      isLoading: false,
      error: null
    },
    actions: {
      saveConfig: vi.fn(),
      loadConfig: vi.fn(),
      updateConfig: vi.fn(),
      setError: vi.fn(),
      clearError: vi.fn()
    }
  });

  const renderWithContext = (operation: OperationNodeType, config: ConfigFile | null = null) => {
    const mockContext = createMockContext(config);
    return {
      ...render(
        <AppContext.Provider value={mockContext}>
          <KeyboardNavigationProvider>
            <OperationNode operation={operation} />
          </KeyboardNavigationProvider>
        </AppContext.Provider>
      ),
      mockContext
    };
  };

  describe('Display', () => {
    it('should render operation with method and path', () => {
      renderWithContext(mockOperation);

      expect(screen.getByText('POST')).toBeInTheDocument();
      expect(screen.getByText('/auth/login')).toBeInTheDocument();
    });

    it('should render operation summary when provided', () => {
      renderWithContext(mockOperation);

      expect(screen.getByText('User login')).toBeInTheDocument();
    });

    it('should not render summary when not provided', () => {
      const operationWithoutSummary: OperationNodeType = {
        ...mockOperation,
        summary: undefined
      };

      renderWithContext(operationWithoutSummary);

      expect(screen.queryByText('User login')).not.toBeInTheDocument();
    });

    it('should apply correct color for POST method', () => {
      renderWithContext(mockOperation);

      const methodBadge = screen.getByText('POST');
      expect(methodBadge).toHaveClass('bg-blue-100', 'text-blue-800');
    });

    it('should apply correct color for GET method', () => {
      const getOperation: OperationNodeType = {
        ...mockOperation,
        method: 'GET',
        path: '/users'
      };

      renderWithContext(getOperation);

      const methodBadge = screen.getByText('GET');
      expect(methodBadge).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('should apply correct color for DELETE method', () => {
      const deleteOperation: OperationNodeType = {
        ...mockOperation,
        method: 'DELETE',
        path: '/users/1'
      };

      renderWithContext(deleteOperation);

      const methodBadge = screen.getByText('DELETE');
      expect(methodBadge).toHaveClass('bg-red-100', 'text-red-800');
    });

    it('should set data-operation-path attribute', () => {
      renderWithContext(mockOperation);

      const node = screen.getByTestId('operation-node');
      expect(node).toHaveAttribute('data-operation-path', 'POST:/auth/login');
    });
  });

  describe('x-uigen-login annotation', () => {
    it('should not show login badge when annotation is not set', () => {
      renderWithContext(mockOperation);

      expect(screen.queryByTestId('login-badge')).not.toBeInTheDocument();
    });

    it('should show login badge when annotation is set in config', () => {
      const config: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'POST:/auth/login': {
            'x-uigen-login': true
          }
        }
      };

      renderWithContext(mockOperation, config);

      expect(screen.getByTestId('login-badge')).toBeInTheDocument();
      const loginTexts = screen.getAllByText('login');
      expect(loginTexts.length).toBeGreaterThan(0);
    });

    it('should toggle login annotation on when clicked', async () => {
      const user = userEvent.setup();
      const { mockContext } = renderWithContext(mockOperation);

      const toggle = screen.getByTestId('login-toggle');
      await user.click(toggle);

      expect(mockContext.actions.saveConfig).toHaveBeenCalledWith({
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'POST:/auth/login': {
            'x-uigen-login': true
          }
        }
      });
    });

    it('should toggle login annotation off when clicked', async () => {
      const user = userEvent.setup();
      const config: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'POST:/auth/login': {
            'x-uigen-login': true
          }
        }
      };

      const { mockContext } = renderWithContext(mockOperation, config);

      const toggle = screen.getByTestId('login-toggle');
      await user.click(toggle);

      expect(mockContext.actions.saveConfig).toHaveBeenCalledWith({
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {}
      });
    });

    it('should have correct aria attributes for login toggle', () => {
      renderWithContext(mockOperation);

      const toggle = screen.getByTestId('login-toggle');
      expect(toggle).toHaveAttribute('role', 'switch');
      expect(toggle).toHaveAttribute('aria-checked', 'false');
      expect(toggle).toHaveAttribute('aria-label', 'Enable login annotation');
    });

    it('should update aria-checked when login is enabled', () => {
      const config: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'POST:/auth/login': {
            'x-uigen-login': true
          }
        }
      };

      renderWithContext(mockOperation, config);

      const toggle = screen.getByTestId('login-toggle');
      expect(toggle).toHaveAttribute('aria-checked', 'true');
      expect(toggle).toHaveAttribute('aria-label', 'Disable login annotation');
    });

    it('should preserve other annotations when toggling login', async () => {
      const user = userEvent.setup();
      const config: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'POST:/auth/login': {
            'x-uigen-custom': 'value'
          }
        }
      };

      const { mockContext } = renderWithContext(mockOperation, config);

      const toggle = screen.getByTestId('login-toggle');
      await user.click(toggle);

      expect(mockContext.actions.saveConfig).toHaveBeenCalledWith({
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'POST:/auth/login': {
            'x-uigen-custom': 'value',
            'x-uigen-login': true
          }
        }
      });
    });
  });

  describe('Multiple operations', () => {
    it('should handle different operation paths independently', async () => {
      const user = userEvent.setup();
      const operation1: OperationNodeType = {
        id: 'op-1',
        uigenId: 'uigen-op-1',
        method: 'POST',
        path: '/auth/login',
        annotations: {}
      };

      const operation2: OperationNodeType = {
        id: 'op-2',
        uigenId: 'uigen-op-2',
        method: 'POST',
        path: '/auth/logout',
        annotations: {}
      };

      const config: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {
          'POST:/auth/login': {
            'x-uigen-login': true
          }
        }
      };

      const mockContext = createMockContext(config);

      const { rerender } = render(
        <AppContext.Provider value={mockContext}>
          <KeyboardNavigationProvider>
            <OperationNode operation={operation1} />
            <OperationNode operation={operation2} />
          </KeyboardNavigationProvider>
        </AppContext.Provider>
      );

      // First operation should have login badge
      const nodes = screen.getAllByTestId('operation-node');
      expect(nodes[0]).toHaveAttribute('data-operation-path', 'POST:/auth/login');
      expect(nodes[1]).toHaveAttribute('data-operation-path', 'POST:/auth/logout');

      const badges = screen.queryAllByTestId('login-badge');
      expect(badges).toHaveLength(1);
    });
  });

  describe('Edge cases', () => {
    it('should handle null config gracefully', () => {
      renderWithContext(mockOperation, null);

      expect(screen.getByTestId('operation-node')).toBeInTheDocument();
      expect(screen.queryByTestId('login-badge')).not.toBeInTheDocument();
    });

    it('should handle empty annotations object', () => {
      const config: ConfigFile = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {}
      };

      renderWithContext(mockOperation, config);

      expect(screen.queryByTestId('login-badge')).not.toBeInTheDocument();
    });

    it('should handle operation with no summary', () => {
      const operationNoSummary: OperationNodeType = {
        id: 'op-1',
        uigenId: 'uigen-op-1',
        method: 'GET',
        path: '/users',
        annotations: {}
      };

      renderWithContext(operationNoSummary);

      expect(screen.getByText('GET')).toBeInTheDocument();
      expect(screen.getByText('/users')).toBeInTheDocument();
    });
  });

  describe('Ignore state badges', () => {
    describe('No Input Form badge', () => {
      it('should not show "No Input Form" badge when request body is not ignored', () => {
        renderWithContext(mockOperation);

        expect(screen.queryByTestId('no-input-form-badge')).not.toBeInTheDocument();
      });

      it('should show "No Input Form" badge when request body is explicitly ignored', () => {
        const config: ConfigFile = {
          version: '1.0',
          enabled: {},
          defaults: {},
          annotations: {
            'paths./auth/login.post.requestBody': {
              'x-uigen-ignore': true
            }
          }
        };

        renderWithContext(mockOperation, config);

        expect(screen.getByTestId('no-input-form-badge')).toBeInTheDocument();
        expect(screen.getByText('No Input Form')).toBeInTheDocument();
      });

      it('should show "No Input Form" badge when request body is inherited as ignored', () => {
        const config: ConfigFile = {
          version: '1.0',
          enabled: {},
          defaults: {},
          annotations: {
            'POST:/auth/login': {
              'x-uigen-ignore': true
            }
          }
        };

        renderWithContext(mockOperation, config);

        expect(screen.getByTestId('no-input-form-badge')).toBeInTheDocument();
      });

      it('should not show "No Input Form" badge when request body has override to false', () => {
        const config: ConfigFile = {
          version: '1.0',
          enabled: {},
          defaults: {},
          annotations: {
            'POST:/auth/login': {
              'x-uigen-ignore': true
            },
            'paths./auth/login.post.requestBody': {
              'x-uigen-ignore': false
            }
          }
        };

        renderWithContext(mockOperation, config);

        expect(screen.queryByTestId('no-input-form-badge')).not.toBeInTheDocument();
      });
    });

    describe('No Output badge', () => {
      it('should not show "No Output" badge when no responses are ignored', () => {
        renderWithContext(mockOperation);

        expect(screen.queryByTestId('no-output-badge')).not.toBeInTheDocument();
      });

      it('should not show "No Output" badge when no response annotations exist', () => {
        const config: ConfigFile = {
          version: '1.0',
          enabled: {},
          defaults: {},
          annotations: {}
        };

        renderWithContext(mockOperation, config);

        expect(screen.queryByTestId('no-output-badge')).not.toBeInTheDocument();
      });

      it('should show "No Output" badge when all annotated responses are ignored', () => {
        const config: ConfigFile = {
          version: '1.0',
          enabled: {},
          defaults: {},
          annotations: {
            'paths./auth/login.post.responses.200': {
              'x-uigen-ignore': true
            },
            'paths./auth/login.post.responses.401': {
              'x-uigen-ignore': true
            }
          }
        };

        renderWithContext(mockOperation, config);

        expect(screen.getByTestId('no-output-badge')).toBeInTheDocument();
        expect(screen.getByText('No Output')).toBeInTheDocument();
      });

      it('should not show "No Output" badge when some responses are not ignored', () => {
        const config: ConfigFile = {
          version: '1.0',
          enabled: {},
          defaults: {},
          annotations: {
            'paths./auth/login.post.responses.200': {
              'x-uigen-ignore': true
            },
            'paths./auth/login.post.responses.401': {
              'x-uigen-ignore': false
            }
          }
        };

        renderWithContext(mockOperation, config);

        expect(screen.queryByTestId('no-output-badge')).not.toBeInTheDocument();
      });

      it('should not show "No Output" badge when only one response is annotated and not ignored', () => {
        const config: ConfigFile = {
          version: '1.0',
          enabled: {},
          defaults: {},
          annotations: {
            'paths./auth/login.post.responses.200': {
              'x-uigen-ignore': false
            }
          }
        };

        renderWithContext(mockOperation, config);

        expect(screen.queryByTestId('no-output-badge')).not.toBeInTheDocument();
      });
    });

    describe('Combined badges', () => {
      it('should show both "No Input Form" and "No Output" badges when both are ignored', () => {
        const config: ConfigFile = {
          version: '1.0',
          enabled: {},
          defaults: {},
          annotations: {
            'paths./auth/login.post.requestBody': {
              'x-uigen-ignore': true
            },
            'paths./auth/login.post.responses.200': {
              'x-uigen-ignore': true
            }
          }
        };

        renderWithContext(mockOperation, config);

        expect(screen.getByTestId('no-input-form-badge')).toBeInTheDocument();
        expect(screen.getByTestId('no-output-badge')).toBeInTheDocument();
      });

      it('should show all badges including login badge when all are active', () => {
        const config: ConfigFile = {
          version: '1.0',
          enabled: {},
          defaults: {},
          annotations: {
            'POST:/auth/login': {
              'x-uigen-login': true
            },
            'paths./auth/login.post.requestBody': {
              'x-uigen-ignore': true
            },
            'paths./auth/login.post.responses.200': {
              'x-uigen-ignore': true
            }
          }
        };

        renderWithContext(mockOperation, config);

        expect(screen.getByTestId('no-input-form-badge')).toBeInTheDocument();
        expect(screen.getByTestId('no-output-badge')).toBeInTheDocument();
        expect(screen.getByTestId('login-badge')).toBeInTheDocument();
      });
    });
  });
});
