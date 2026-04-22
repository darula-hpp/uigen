/**
 * Integration tests for GraphCanvas position persistence
 * 
 * Tests the integration between GraphCanvas, PositionManager, and the persistence adapter
 * to ensure positions are correctly loaded, saved, and managed.
 * 
 * Requirements: 2.1, 3.1, 7.1, 10.1, 10.3
 */

import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GraphCanvas } from '../GraphCanvas.js';
import type { ResourceNode } from '../../../types/index.js';
import type { ConfigFile, NodePosition } from '@uigen-dev/core';

// ResizeObserver is not available in jsdom -- provide a no-op stub
beforeAll(() => {
  if (typeof window.ResizeObserver === 'undefined') {
    window.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  // elementFromPoint is not implemented in jsdom
  if (!document.elementFromPoint) {
    document.elementFromPoint = () => null;
  }
});

// --- Fixtures ---

function makeResource(slug: string, name?: string): ResourceNode {
  return {
    name: name ?? slug,
    slug,
    uigenId: `uigen-${slug}`,
    operations: [],
    fields: [],
    annotations: {}
  };
}

const usersResource = makeResource('users', 'Users');
const ordersResource = makeResource('orders', 'Orders');
const productsResource = makeResource('products', 'Products');

// --- Tests ---

describe('GraphCanvas Position Persistence', () => {
  let mockLoadConfig: ReturnType<typeof vi.fn>;
  let mockSaveConfig: ReturnType<typeof vi.fn>;
  let savedConfig: ConfigFile;

  beforeEach(() => {
    // Initialize with empty config
    savedConfig = {
      version: '1.0',
      enabled: {},
      defaults: {},
      annotations: {},
      relationships: []
    };

    mockLoadConfig = vi.fn().mockImplementation(() => Promise.resolve(savedConfig));
    mockSaveConfig = vi.fn().mockImplementation((config: ConfigFile) => {
      savedConfig = config;
      return Promise.resolve();
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Position Loading (Requirement 3.1)', () => {
    it('loads saved positions on mount', async () => {
      // Setup: config with saved positions
      savedConfig = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {},
        canvasLayout: {
          positions: {
            users: { x: 100, y: 200 },
            orders: { x: 300, y: 400 }
          }
        }
      };

      render(
        <GraphCanvas
          resources={[usersResource, ordersResource]}
          relationships={[]}
          onEdgeInitiated={vi.fn()}
          onEdgeSelect={vi.fn()}
          loadConfig={mockLoadConfig}
          saveConfig={mockSaveConfig}
        />
      );

      // Wait for positions to load
      await waitFor(() => {
        expect(mockLoadConfig).toHaveBeenCalled();
      });

      // Verify cards are rendered (positions are applied via style)
      expect(screen.getByTestId('resource-node-users')).toBeInTheDocument();
      expect(screen.getByTestId('resource-node-orders')).toBeInTheDocument();
    });

    it('calculates default positions for resources without saved positions', async () => {
      // Setup: config with only one saved position
      savedConfig = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {},
        canvasLayout: {
          positions: {
            users: { x: 100, y: 200 }
          }
        }
      };

      render(
        <GraphCanvas
          resources={[usersResource, ordersResource, productsResource]}
          relationships={[]}
          onEdgeInitiated={vi.fn()}
          onEdgeSelect={vi.fn()}
          loadConfig={mockLoadConfig}
          saveConfig={mockSaveConfig}
        />
      );

      await waitFor(() => {
        expect(mockLoadConfig).toHaveBeenCalled();
      });

      // All resources should be rendered
      expect(screen.getByTestId('resource-node-users')).toBeInTheDocument();
      expect(screen.getByTestId('resource-node-orders')).toBeInTheDocument();
      expect(screen.getByTestId('resource-node-products')).toBeInTheDocument();
    });

    it('handles missing canvasLayout field gracefully', async () => {
      // Config without canvasLayout
      savedConfig = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {}
      };

      render(
        <GraphCanvas
          resources={[usersResource, ordersResource]}
          relationships={[]}
          onEdgeInitiated={vi.fn()}
          onEdgeSelect={vi.fn()}
          loadConfig={mockLoadConfig}
          saveConfig={mockSaveConfig}
        />
      );

      await waitFor(() => {
        expect(mockLoadConfig).toHaveBeenCalled();
      });

      // Should render with default positions
      expect(screen.getByTestId('resource-node-users')).toBeInTheDocument();
      expect(screen.getByTestId('resource-node-orders')).toBeInTheDocument();
    });
  });

  describe('Position Saving (Requirement 2.1)', () => {
    it('saves position after card drag', async () => {
      render(
        <GraphCanvas
          resources={[usersResource]}
          relationships={[]}
          onEdgeInitiated={vi.fn()}
          onEdgeSelect={vi.fn()}
          loadConfig={mockLoadConfig}
          saveConfig={mockSaveConfig}
        />
      );

      await waitFor(() => {
        expect(mockLoadConfig).toHaveBeenCalled();
      });

      const card = screen.getByTestId('resource-node-users');

      // Simulate drag
      fireEvent.mouseDown(card, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(window, { clientX: 200, clientY: 200 });
      fireEvent.mouseUp(window, { clientX: 200, clientY: 200 });

      // Wait for debounced save (500ms + buffer)
      await waitFor(
        () => {
          expect(mockSaveConfig).toHaveBeenCalled();
        },
        { timeout: 1000 }
      );

      // Verify config was saved with positions
      expect(savedConfig.canvasLayout).toBeDefined();
      expect(savedConfig.canvasLayout?.positions).toBeDefined();
    });

    it('displays save indicator during save', async () => {
      render(
        <GraphCanvas
          resources={[usersResource]}
          relationships={[]}
          onEdgeInitiated={vi.fn()}
          onEdgeSelect={vi.fn()}
          loadConfig={mockLoadConfig}
          saveConfig={mockSaveConfig}
        />
      );

      await waitFor(() => {
        expect(mockLoadConfig).toHaveBeenCalled();
      });

      const card = screen.getByTestId('resource-node-users');

      // Simulate drag
      fireEvent.mouseDown(card, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(window, { clientX: 200, clientY: 200 });
      fireEvent.mouseUp(window, { clientX: 200, clientY: 200 });

      // Save indicator should appear
      await waitFor(() => {
        expect(screen.getByTestId('save-indicator')).toBeInTheDocument();
      });

      // Should show "Saving layout..." text
      expect(screen.getByText('Saving layout...')).toBeInTheDocument();
    });

    it('hides save indicator after successful save', async () => {
      render(
        <GraphCanvas
          resources={[usersResource]}
          relationships={[]}
          onEdgeInitiated={vi.fn()}
          onEdgeSelect={vi.fn()}
          loadConfig={mockLoadConfig}
          saveConfig={mockSaveConfig}
        />
      );

      await waitFor(() => {
        expect(mockLoadConfig).toHaveBeenCalled();
      });

      const card = screen.getByTestId('resource-node-users');

      // Simulate drag
      fireEvent.mouseDown(card, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(window, { clientX: 200, clientY: 200 });
      fireEvent.mouseUp(window, { clientX: 200, clientY: 200 });

      // Wait for save to complete
      await waitFor(
        () => {
          expect(mockSaveConfig).toHaveBeenCalled();
        },
        { timeout: 1000 }
      );

      // Indicator should show "Saved"
      await waitFor(() => {
        expect(screen.getByText('Saved')).toBeInTheDocument();
      });

      // Indicator should disappear after 1 second
      await waitFor(
        () => {
          expect(screen.queryByTestId('save-indicator')).not.toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });
  });

  describe('Error Handling (Requirement 10.3)', () => {
    it('displays error notification on save failure', async () => {
      // Create a custom adapter that throws errors
      const failingLoadConfig = vi.fn().mockResolvedValue({
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {}
      });
      const failingSaveConfig = vi.fn().mockRejectedValue(new Error('Network error'));

      render(
        <GraphCanvas
          resources={[usersResource]}
          relationships={[]}
          onEdgeInitiated={vi.fn()}
          onEdgeSelect={vi.fn()}
          loadConfig={failingLoadConfig}
          saveConfig={failingSaveConfig}
        />
      );

      await waitFor(() => {
        expect(failingLoadConfig).toHaveBeenCalled();
      });

      const card = screen.getByTestId('resource-node-users');

      // Simulate drag
      fireEvent.mouseDown(card, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(window, { clientX: 200, clientY: 200 });
      fireEvent.mouseUp(window, { clientX: 200, clientY: 200 });

      // Error notification should appear (wait longer for debounce + error)
      await waitFor(
        () => {
          expect(screen.getByTestId('error-notification')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      expect(screen.getByText('Failed to save layout')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    it('shows retry button in error notification', async () => {
      const failingLoadConfig = vi.fn().mockResolvedValue({
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {}
      });
      const failingSaveConfig = vi.fn().mockRejectedValue(new Error('Network error'));

      render(
        <GraphCanvas
          resources={[usersResource]}
          relationships={[]}
          onEdgeInitiated={vi.fn()}
          onEdgeSelect={vi.fn()}
          loadConfig={failingLoadConfig}
          saveConfig={failingSaveConfig}
        />
      );

      await waitFor(() => {
        expect(failingLoadConfig).toHaveBeenCalled();
      });

      const card = screen.getByTestId('resource-node-users');

      // Simulate drag
      fireEvent.mouseDown(card, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(window, { clientX: 200, clientY: 200 });
      fireEvent.mouseUp(window, { clientX: 200, clientY: 200 });

      await waitFor(
        () => {
          expect(screen.getByTestId('error-notification')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Retry button should be present
      expect(screen.getByTestId('retry-button')).toBeInTheDocument();
      expect(screen.getByText(/Retry \(3 attempts remaining\)/)).toBeInTheDocument();
    });

    it('retries save when retry button is clicked', async () => {
      const failingLoadConfig = vi.fn().mockResolvedValue({
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {}
      });
      // First calls fail, then succeed
      const failingSaveConfig = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(undefined);

      render(
        <GraphCanvas
          resources={[usersResource]}
          relationships={[]}
          onEdgeInitiated={vi.fn()}
          onEdgeSelect={vi.fn()}
          loadConfig={failingLoadConfig}
          saveConfig={failingSaveConfig}
        />
      );

      await waitFor(() => {
        expect(failingLoadConfig).toHaveBeenCalled();
      });

      const card = screen.getByTestId('resource-node-users');

      // Simulate drag
      fireEvent.mouseDown(card, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(window, { clientX: 200, clientY: 200 });
      fireEvent.mouseUp(window, { clientX: 200, clientY: 200 });

      await waitFor(
        () => {
          expect(screen.getByTestId('error-notification')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Click retry
      fireEvent.click(screen.getByTestId('retry-button'));

      // Should show saving indicator
      await waitFor(() => {
        expect(screen.getByText('Saving layout...')).toBeInTheDocument();
      });

      // Should eventually show success
      await waitFor(
        () => {
          expect(screen.getByText('Saved')).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('limits retries to 3 attempts', async () => {
      const failingLoadConfig = vi.fn().mockResolvedValue({
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {}
      });
      // All saves fail
      const failingSaveConfig = vi.fn().mockRejectedValue(new Error('Network error'));

      render(
        <GraphCanvas
          resources={[usersResource]}
          relationships={[]}
          onEdgeInitiated={vi.fn()}
          onEdgeSelect={vi.fn()}
          loadConfig={failingLoadConfig}
          saveConfig={failingSaveConfig}
        />
      );

      await waitFor(() => {
        expect(failingLoadConfig).toHaveBeenCalled();
      });

      const card = screen.getByTestId('resource-node-users');

      // Simulate drag
      fireEvent.mouseDown(card, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(window, { clientX: 200, clientY: 200 });
      fireEvent.mouseUp(window, { clientX: 200, clientY: 200 });

      await waitFor(
        () => {
          expect(screen.getByTestId('error-notification')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Retry 3 times
      for (let i = 0; i < 3; i++) {
        const retryButton = screen.queryByTestId('retry-button');
        if (retryButton) {
          fireEvent.click(retryButton);
          // Wait for the retry to process
          await waitFor(
            () => {
              expect(screen.getByTestId('error-notification')).toBeInTheDocument();
            },
            { timeout: 2000 }
          );
        }
      }

      // After 3 retries, should show max retries message
      await waitFor(() => {
        expect(screen.getByText('Maximum retries reached')).toBeInTheDocument();
      });

      // Retry button should not be present
      expect(screen.queryByTestId('retry-button')).not.toBeInTheDocument();
    });

    it('allows dismissing error notification', async () => {
      const failingLoadConfig = vi.fn().mockResolvedValue({
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {}
      });
      const failingSaveConfig = vi.fn().mockRejectedValue(new Error('Network error'));

      render(
        <GraphCanvas
          resources={[usersResource]}
          relationships={[]}
          onEdgeInitiated={vi.fn()}
          onEdgeSelect={vi.fn()}
          loadConfig={failingLoadConfig}
          saveConfig={failingSaveConfig}
        />
      );

      await waitFor(() => {
        expect(failingLoadConfig).toHaveBeenCalled();
      });

      const card = screen.getByTestId('resource-node-users');

      // Simulate drag
      fireEvent.mouseDown(card, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(window, { clientX: 200, clientY: 200 });
      fireEvent.mouseUp(window, { clientX: 200, clientY: 200 });

      await waitFor(
        () => {
          expect(screen.getByTestId('error-notification')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Click dismiss button
      fireEvent.click(screen.getByTestId('dismiss-error-button'));

      // Error notification should disappear
      expect(screen.queryByTestId('error-notification')).not.toBeInTheDocument();
    });
  });

  describe('Orphaned Position Cleanup (Requirement 7.1)', () => {
    it('cleans up positions for removed resources', async () => {
      // Setup: config with positions for 3 resources
      savedConfig = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {},
        canvasLayout: {
          positions: {
            users: { x: 100, y: 200 },
            orders: { x: 300, y: 400 },
            products: { x: 500, y: 600 }
          }
        }
      };

      const { rerender } = render(
        <GraphCanvas
          resources={[usersResource, ordersResource, productsResource]}
          relationships={[]}
          onEdgeInitiated={vi.fn()}
          onEdgeSelect={vi.fn()}
          loadConfig={mockLoadConfig}
          saveConfig={mockSaveConfig}
        />
      );

      await waitFor(() => {
        expect(mockLoadConfig).toHaveBeenCalled();
      });

      // Remove products resource
      rerender(
        <GraphCanvas
          resources={[usersResource, ordersResource]}
          relationships={[]}
          onEdgeInitiated={vi.fn()}
          onEdgeSelect={vi.fn()}
          loadConfig={mockLoadConfig}
          saveConfig={mockSaveConfig}
        />
      );

      // Wait for cleanup to trigger
      await waitFor(
        () => {
          expect(mockSaveConfig).toHaveBeenCalled();
        },
        { timeout: 1000 }
      );

      // Verify products position was removed
      expect(savedConfig.canvasLayout?.positions).toBeDefined();
      expect(savedConfig.canvasLayout?.positions?.products).toBeUndefined();
      expect(savedConfig.canvasLayout?.positions?.users).toBeDefined();
      expect(savedConfig.canvasLayout?.positions?.orders).toBeDefined();
    });
  });

  describe('Position Update on Drag (Requirement 10.1)', () => {
    it('updates position in local state during drag', async () => {
      render(
        <GraphCanvas
          resources={[usersResource]}
          relationships={[]}
          onEdgeInitiated={vi.fn()}
          onEdgeSelect={vi.fn()}
          loadConfig={mockLoadConfig}
          saveConfig={mockSaveConfig}
        />
      );

      await waitFor(() => {
        expect(mockLoadConfig).toHaveBeenCalled();
      });

      const card = screen.getByTestId('resource-node-users');

      // Simulate drag with significant movement
      fireEvent.mouseDown(card, { clientX: 100, clientY: 100 });
      
      // Move significantly
      fireEvent.mouseMove(window, { clientX: 300, clientY: 300 });

      // Card should still be in the document during drag
      expect(screen.getByTestId('resource-node-users')).toBeInTheDocument();

      fireEvent.mouseUp(window, { clientX: 300, clientY: 300 });

      // Card should still be in the document after drag
      expect(screen.getByTestId('resource-node-users')).toBeInTheDocument();
    });
  });

  describe('Reset Layout Functionality (Requirements 11.1, 11.2, 11.3)', () => {
    it('displays reset layout button', async () => {
      render(
        <GraphCanvas
          resources={[usersResource, ordersResource]}
          relationships={[]}
          onEdgeInitiated={vi.fn()}
          onEdgeSelect={vi.fn()}
          loadConfig={mockLoadConfig}
          saveConfig={mockSaveConfig}
        />
      );

      await waitFor(() => {
        expect(mockLoadConfig).toHaveBeenCalled();
      });

      // Reset button should be visible
      expect(screen.getByTestId('reset-layout-button')).toBeInTheDocument();
      expect(screen.getByText('Reset Layout')).toBeInTheDocument();
    });

    it('shows confirmation dialog when reset button is clicked', async () => {
      render(
        <GraphCanvas
          resources={[usersResource, ordersResource]}
          relationships={[]}
          onEdgeInitiated={vi.fn()}
          onEdgeSelect={vi.fn()}
          loadConfig={mockLoadConfig}
          saveConfig={mockSaveConfig}
        />
      );

      await waitFor(() => {
        expect(mockLoadConfig).toHaveBeenCalled();
      });

      // Click reset button
      fireEvent.click(screen.getByTestId('reset-layout-button'));

      // Confirmation dialog should appear
      await waitFor(() => {
        expect(screen.getByTestId('reset-confirmation-dialog')).toBeInTheDocument();
      });

      expect(screen.getByText('Reset all card positions to default grid layout?')).toBeInTheDocument();
      expect(screen.getByTestId('reset-cancel-button')).toBeInTheDocument();
      expect(screen.getByTestId('reset-confirm-button')).toBeInTheDocument();
    });

    it('closes confirmation dialog when cancel is clicked', async () => {
      render(
        <GraphCanvas
          resources={[usersResource, ordersResource]}
          relationships={[]}
          onEdgeInitiated={vi.fn()}
          onEdgeSelect={vi.fn()}
          loadConfig={mockLoadConfig}
          saveConfig={mockSaveConfig}
        />
      );

      await waitFor(() => {
        expect(mockLoadConfig).toHaveBeenCalled();
      });

      // Click reset button
      fireEvent.click(screen.getByTestId('reset-layout-button'));

      await waitFor(() => {
        expect(screen.getByTestId('reset-confirmation-dialog')).toBeInTheDocument();
      });

      // Click cancel
      fireEvent.click(screen.getByTestId('reset-cancel-button'));

      // Dialog should disappear
      expect(screen.queryByTestId('reset-confirmation-dialog')).not.toBeInTheDocument();
    });

    it('resets positions to default grid when confirmed', async () => {
      // Setup: config with custom positions
      savedConfig = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {},
        canvasLayout: {
          positions: {
            users: { x: 500, y: 600 },
            orders: { x: 700, y: 800 }
          }
        }
      };

      render(
        <GraphCanvas
          resources={[usersResource, ordersResource]}
          relationships={[]}
          onEdgeInitiated={vi.fn()}
          onEdgeSelect={vi.fn()}
          loadConfig={mockLoadConfig}
          saveConfig={mockSaveConfig}
        />
      );

      await waitFor(() => {
        expect(mockLoadConfig).toHaveBeenCalled();
      });

      // Click reset button
      fireEvent.click(screen.getByTestId('reset-layout-button'));

      await waitFor(() => {
        expect(screen.getByTestId('reset-confirmation-dialog')).toBeInTheDocument();
      });

      // Click confirm
      fireEvent.click(screen.getByTestId('reset-confirm-button'));

      // Wait for reset to complete
      await waitFor(
        () => {
          expect(mockSaveConfig).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );

      // Verify positions were cleared (empty object saved)
      expect(savedConfig.canvasLayout?.positions).toEqual({});
    });

    it('shows success message after reset completes', async () => {
      savedConfig = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {},
        canvasLayout: {
          positions: {
            users: { x: 500, y: 600 }
          }
        }
      };

      render(
        <GraphCanvas
          resources={[usersResource]}
          relationships={[]}
          onEdgeInitiated={vi.fn()}
          onEdgeSelect={vi.fn()}
          loadConfig={mockLoadConfig}
          saveConfig={mockSaveConfig}
        />
      );

      await waitFor(() => {
        expect(mockLoadConfig).toHaveBeenCalled();
      });

      // Click reset button
      fireEvent.click(screen.getByTestId('reset-layout-button'));

      await waitFor(() => {
        expect(screen.getByTestId('reset-confirmation-dialog')).toBeInTheDocument();
      });

      // Click confirm
      fireEvent.click(screen.getByTestId('reset-confirm-button'));

      // Wait for success message
      await waitFor(
        () => {
          expect(screen.getByText('Saved')).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('disables reset button during reset operation', async () => {
      render(
        <GraphCanvas
          resources={[usersResource]}
          relationships={[]}
          onEdgeInitiated={vi.fn()}
          onEdgeSelect={vi.fn()}
          loadConfig={mockLoadConfig}
          saveConfig={mockSaveConfig}
        />
      );

      await waitFor(() => {
        expect(mockLoadConfig).toHaveBeenCalled();
      });

      const resetButton = screen.getByTestId('reset-layout-button');

      // Click reset button
      fireEvent.click(resetButton);

      await waitFor(() => {
        expect(screen.getByTestId('reset-confirmation-dialog')).toBeInTheDocument();
      });

      // Click confirm
      fireEvent.click(screen.getByTestId('reset-confirm-button'));

      // Button should be disabled during reset
      await waitFor(() => {
        expect(resetButton).toBeDisabled();
      });
    });

    it('applies animation transition during reset', async () => {
      savedConfig = {
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {},
        canvasLayout: {
          positions: {
            users: { x: 500, y: 600 }
          }
        }
      };

      render(
        <GraphCanvas
          resources={[usersResource]}
          relationships={[]}
          onEdgeInitiated={vi.fn()}
          onEdgeSelect={vi.fn()}
          loadConfig={mockLoadConfig}
          saveConfig={mockSaveConfig}
        />
      );

      await waitFor(() => {
        expect(mockLoadConfig).toHaveBeenCalled();
      });

      // Click reset button
      fireEvent.click(screen.getByTestId('reset-layout-button'));

      await waitFor(() => {
        expect(screen.getByTestId('reset-confirmation-dialog')).toBeInTheDocument();
      });

      // Click confirm
      fireEvent.click(screen.getByTestId('reset-confirm-button'));

      // Card should have transition style applied
      await waitFor(() => {
        const card = screen.getByTestId('resource-node-users').parentElement;
        expect(card?.style.transition).toContain('300ms');
      });
    });

    it('handles reset error gracefully', async () => {
      const failingLoadConfig = vi.fn().mockResolvedValue({
        version: '1.0',
        enabled: {},
        defaults: {},
        annotations: {},
        canvasLayout: {
          positions: {
            users: { x: 500, y: 600 }
          }
        }
      });
      const failingSaveConfig = vi.fn().mockRejectedValue(new Error('Save failed'));

      render(
        <GraphCanvas
          resources={[usersResource]}
          relationships={[]}
          onEdgeInitiated={vi.fn()}
          onEdgeSelect={vi.fn()}
          loadConfig={failingLoadConfig}
          saveConfig={failingSaveConfig}
        />
      );

      await waitFor(() => {
        expect(failingLoadConfig).toHaveBeenCalled();
      });

      // Click reset button
      fireEvent.click(screen.getByTestId('reset-layout-button'));

      await waitFor(() => {
        expect(screen.getByTestId('reset-confirmation-dialog')).toBeInTheDocument();
      });

      // Click confirm
      fireEvent.click(screen.getByTestId('reset-confirm-button'));

      // Error notification should appear
      await waitFor(
        () => {
          expect(screen.getByTestId('error-notification')).toBeInTheDocument();
        },
        { timeout: 1000 }
      );

      expect(screen.getByText('Failed to save layout')).toBeInTheDocument();
    });
  });
});

