import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { SelectionProvider, useSelection } from '../../../contexts/SelectionContext.js';
import { AppProvider } from '../../../contexts/AppContext.js';
import { BulkActionsToolbar } from '../BulkActionsToolbar.js';
import { ClearOverridesButton } from '../ClearOverridesButton.js';
import { UndoRedoToolbar } from '../UndoRedoToolbar.js';
import { useUndoRedo } from '../../../hooks/useUndoRedo.js';
import type { ConfigFile } from '@uigen-dev/core';

/**
 * Integration tests for bulk operations and undo/redo
 * 
 * Tests:
 * - Multi-select functionality (Ctrl+Click, Shift+Click)
 * - Bulk actions (Ignore All, Include All)
 * - Clear All Overrides workflow
 * - Undo/Redo for single and bulk actions
 * - Keyboard shortcuts (Ctrl+Z, Ctrl+Y)
 * 
 * Requirements: 9.1-9.5, 15.1-15.5, 16.1-16.5
 */

describe('Bulk Operations and Undo/Redo Integration', () => {
  const mockConfig: ConfigFile = {
    version: '1.0',
    enabled: {},
    defaults: {},
    annotations: {}
  };

  const mockSaveConfig = vi.fn();

  beforeEach(() => {
    mockSaveConfig.mockClear();
  });

  describe('Multi-Select Functionality (Requirement 16.1)', () => {
    it('should toggle individual selection with Ctrl+Click', () => {
      const TestComponent = () => {
        const { actions, state } = useSelection();
        
        return (
          <div>
            <button
              data-testid="element-1"
              onClick={(e) => actions.toggleSelection('path1', e.ctrlKey)}
            >
              Element 1
            </button>
            <button
              data-testid="element-2"
              onClick={(e) => actions.toggleSelection('path2', e.ctrlKey)}
            >
              Element 2
            </button>
            <div data-testid="selection-count">{actions.getSelectionCount()}</div>
          </div>
        );
      };

      render(
        <SelectionProvider>
          <TestComponent />
        </SelectionProvider>
      );

      // Regular click selects only one
      fireEvent.click(screen.getByTestId('element-1'));
      expect(screen.getByTestId('selection-count')).toHaveTextContent('1');

      // Ctrl+Click adds to selection
      fireEvent.click(screen.getByTestId('element-2'), { ctrlKey: true });
      expect(screen.getByTestId('selection-count')).toHaveTextContent('2');

      // Ctrl+Click again removes from selection
      fireEvent.click(screen.getByTestId('element-1'), { ctrlKey: true });
      expect(screen.getByTestId('selection-count')).toHaveTextContent('1');
    });

    it('should select range with Shift+Click', () => {
      const TestComponent = () => {
        const { actions, state } = useSelection();
        const allPaths = ['path1', 'path2', 'path3', 'path4'];
        
        return (
          <div>
            {allPaths.map((path, index) => (
              <button
                key={path}
                data-testid={`element-${index + 1}`}
                onClick={(e) => {
                  if (e.shiftKey && state.lastSelectedPath) {
                    actions.selectRange(state.lastSelectedPath, path, allPaths);
                  } else {
                    actions.toggleSelection(path, e.ctrlKey);
                  }
                }}
              >
                Element {index + 1}
              </button>
            ))}
            <div data-testid="selection-count">{actions.getSelectionCount()}</div>
          </div>
        );
      };

      render(
        <SelectionProvider>
          <TestComponent />
        </SelectionProvider>
      );

      // Click first element
      fireEvent.click(screen.getByTestId('element-1'));
      expect(screen.getByTestId('selection-count')).toHaveTextContent('1');

      // Shift+Click fourth element selects range
      fireEvent.click(screen.getByTestId('element-4'), { shiftKey: true });
      expect(screen.getByTestId('selection-count')).toHaveTextContent('4');
    });

    it('should clear selection', () => {
      const TestComponent = () => {
        const { actions } = useSelection();
        
        return (
          <div>
            <button
              data-testid="element-1"
              onClick={(e) => actions.toggleSelection('path1', e.ctrlKey)}
            >
              Element 1
            </button>
            <button
              data-testid="clear-button"
              onClick={() => actions.clearSelection()}
            >
              Clear
            </button>
            <div data-testid="selection-count">{actions.getSelectionCount()}</div>
          </div>
        );
      };

      render(
        <SelectionProvider>
          <TestComponent />
        </SelectionProvider>
      );

      fireEvent.click(screen.getByTestId('element-1'));
      expect(screen.getByTestId('selection-count')).toHaveTextContent('1');

      fireEvent.click(screen.getByTestId('clear-button'));
      expect(screen.getByTestId('selection-count')).toHaveTextContent('0');
    });
  });

  describe('BulkActionsToolbar (Requirements 16.2, 16.3, 16.4)', () => {
    it('should not render when no selection', () => {
      render(
        <AppProvider configPath=".uigen/config.yaml" specStructure={null}>
          <SelectionProvider>
            <BulkActionsToolbar />
          </SelectionProvider>
        </AppProvider>
      );

      expect(screen.queryByTestId('bulk-actions-toolbar')).not.toBeInTheDocument();
    });

    it('should render when elements are selected', () => {
      const TestComponent = () => {
        const { actions } = useSelection();
        
        // Select elements on mount
        React.useEffect(() => {
          actions.toggleSelection('path1', true);
          actions.toggleSelection('path2', true);
        }, []);
        
        return <BulkActionsToolbar />;
      };

      render(
        <AppProvider configPath=".uigen/config.yaml" specStructure={null}>
          <SelectionProvider>
            <TestComponent />
          </SelectionProvider>
        </AppProvider>
      );

      expect(screen.getByTestId('bulk-actions-toolbar')).toBeInTheDocument();
      expect(screen.getByText('2 selected')).toBeInTheDocument();
    });

    it('should call onBulkAction when Ignore All is clicked', async () => {
      const onBulkAction = vi.fn();
      
      const TestComponent = () => {
        const { actions } = useSelection();
        
        React.useEffect(() => {
          actions.toggleSelection('path1', true);
          actions.toggleSelection('path2', true);
        }, []);
        
        return <BulkActionsToolbar onBulkAction={onBulkAction} />;
      };

      render(
        <AppProvider configPath=".uigen/config.yaml" specStructure={null}>
          <SelectionProvider>
            <TestComponent />
          </SelectionProvider>
        </AppProvider>
      );

      const ignoreAllButton = screen.getByTestId('ignore-all-button');
      fireEvent.click(ignoreAllButton);

      await waitFor(() => {
        expect(onBulkAction).toHaveBeenCalledWith('ignore', ['path1', 'path2']);
      });
    });

    it('should call onBulkAction when Include All is clicked', async () => {
      const onBulkAction = vi.fn();
      
      const TestComponent = () => {
        const { actions } = useSelection();
        
        React.useEffect(() => {
          actions.toggleSelection('path1', true);
          actions.toggleSelection('path2', true);
        }, []);
        
        return <BulkActionsToolbar onBulkAction={onBulkAction} />;
      };

      render(
        <AppProvider configPath=".uigen/config.yaml" specStructure={null}>
          <SelectionProvider>
            <TestComponent />
          </SelectionProvider>
        </AppProvider>
      );

      const includeAllButton = screen.getByTestId('include-all-button');
      fireEvent.click(includeAllButton);

      await waitFor(() => {
        expect(onBulkAction).toHaveBeenCalledWith('include', ['path1', 'path2']);
      });
    });

    it('should clear selection when clear button is clicked', () => {
      const TestComponent = () => {
        const { actions } = useSelection();
        
        React.useEffect(() => {
          actions.toggleSelection('path1', true);
          actions.toggleSelection('path2', true);
        }, []);
        
        return (
          <div>
            <BulkActionsToolbar />
            <div data-testid="selection-count">{actions.getSelectionCount()}</div>
          </div>
        );
      };

      render(
        <AppProvider configPath=".uigen/config.yaml" specStructure={null}>
          <SelectionProvider>
            <TestComponent />
          </SelectionProvider>
        </AppProvider>
      );

      expect(screen.getByTestId('selection-count')).toHaveTextContent('2');

      const clearButton = screen.getByTestId('clear-selection-button');
      fireEvent.click(clearButton);

      expect(screen.getByTestId('selection-count')).toHaveTextContent('0');
    });
  });

  describe('ClearOverridesButton (Requirements 9.1-9.5)', () => {
    it('should not render when no overrides', () => {
      render(
        <AppProvider configPath=".uigen/config.yaml" specStructure={null}>
          <ClearOverridesButton
            parentPath="components.schemas.User"
            childOverrides={[]}
          />
        </AppProvider>
      );

      expect(screen.queryByTestId('clear-overrides-button')).not.toBeInTheDocument();
    });

    it('should render with override count', () => {
      render(
        <AppProvider configPath=".uigen/config.yaml" specStructure={null}>
          <ClearOverridesButton
            parentPath="components.schemas.User"
            childOverrides={['path1', 'path2', 'path3']}
          />
        </AppProvider>
      );

      expect(screen.getByTestId('clear-overrides-button')).toBeInTheDocument();
      expect(screen.getByText('Clear All Overrides (3)')).toBeInTheDocument();
    });

    it('should show confirmation dialog when clicked', () => {
      render(
        <AppProvider configPath=".uigen/config.yaml" specStructure={null}>
          <ClearOverridesButton
            parentPath="components.schemas.User"
            childOverrides={['path1', 'path2']}
          />
        </AppProvider>
      );

      const button = screen.getByTestId('clear-overrides-button');
      fireEvent.click(button);

      expect(screen.getByTestId('clear-overrides-dialog')).toBeInTheDocument();
      expect(screen.getByText(/This will remove 2 override annotation/)).toBeInTheDocument();
    });

    it('should cancel when cancel button is clicked', () => {
      render(
        <AppProvider configPath=".uigen/config.yaml" specStructure={null}>
          <ClearOverridesButton
            parentPath="components.schemas.User"
            childOverrides={['path1', 'path2']}
          />
        </AppProvider>
      );

      fireEvent.click(screen.getByTestId('clear-overrides-button'));
      expect(screen.getByTestId('clear-overrides-dialog')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('cancel-clear-button'));
      expect(screen.queryByTestId('clear-overrides-dialog')).not.toBeInTheDocument();
    });

    it('should call onClear when confirmed', async () => {
      const onClear = vi.fn();

      render(
        <AppProvider configPath=".uigen/config.yaml" specStructure={null}>
          <ClearOverridesButton
            parentPath="components.schemas.User"
            childOverrides={['path1', 'path2']}
            onClear={onClear}
          />
        </AppProvider>
      );

      fireEvent.click(screen.getByTestId('clear-overrides-button'));
      fireEvent.click(screen.getByTestId('confirm-clear-button'));

      await waitFor(() => {
        expect(onClear).toHaveBeenCalled();
      });
    });
  });

  describe('UndoRedoToolbar (Requirements 15.1-15.5)', () => {
    it('should render undo and redo buttons', () => {
      render(
        <AppProvider configPath=".uigen/config.yaml" specStructure={null}>
          <UndoRedoToolbar />
        </AppProvider>
      );

      expect(screen.getByTestId('undo-button')).toBeInTheDocument();
      expect(screen.getByTestId('redo-button')).toBeInTheDocument();
    });

    it('should disable buttons when no actions available', () => {
      render(
        <AppProvider configPath=".uigen/config.yaml" specStructure={null}>
          <UndoRedoToolbar />
        </AppProvider>
      );

      expect(screen.getByTestId('undo-button')).toBeDisabled();
      expect(screen.getByTestId('redo-button')).toBeDisabled();
    });

    it('should show correct keyboard shortcuts in tooltips', () => {
      render(
        <AppProvider configPath=".uigen/config.yaml" specStructure={null}>
          <UndoRedoToolbar />
        </AppProvider>
      );

      const undoButton = screen.getByTestId('undo-button');
      const redoButton = screen.getByTestId('redo-button');

      // Check for keyboard shortcuts in title attribute
      expect(undoButton.getAttribute('title')).toMatch(/Ctrl\+Z|⌘Z/);
      expect(redoButton.getAttribute('title')).toMatch(/Ctrl\+Y|⌘⇧Z/);
    });
  });

  describe('Undo/Redo Integration', () => {
    it('should enable undo after action is pushed', () => {
      const TestComponent = () => {
        const { pushAction, canUndo } = useUndoRedo();
        
        const handleAction = () => {
          pushAction({
            type: 'toggle',
            timestamp: Date.now(),
            changes: [
              { path: 'path1', before: undefined, after: true }
            ]
          });
        };
        
        return (
          <div>
            <button data-testid="action-button" onClick={handleAction}>
              Do Action
            </button>
            <div data-testid="can-undo">{canUndo ? 'yes' : 'no'}</div>
          </div>
        );
      };

      render(
        <AppProvider configPath=".uigen/config.yaml" specStructure={null}>
          <TestComponent />
        </AppProvider>
      );

      expect(screen.getByTestId('can-undo')).toHaveTextContent('no');

      fireEvent.click(screen.getByTestId('action-button'));

      expect(screen.getByTestId('can-undo')).toHaveTextContent('yes');
    });

    it('should enable redo after undo', () => {
      const TestComponent = () => {
        const { pushAction, undo, canRedo } = useUndoRedo();
        
        const handleAction = () => {
          pushAction({
            type: 'toggle',
            timestamp: Date.now(),
            changes: [
              { path: 'path1', before: undefined, after: true }
            ]
          });
        };
        
        return (
          <div>
            <button data-testid="action-button" onClick={handleAction}>
              Do Action
            </button>
            <button data-testid="undo-button" onClick={undo}>
              Undo
            </button>
            <div data-testid="can-redo">{canRedo ? 'yes' : 'no'}</div>
          </div>
        );
      };

      render(
        <AppProvider configPath=".uigen/config.yaml" specStructure={null}>
          <TestComponent />
        </AppProvider>
      );

      expect(screen.getByTestId('can-redo')).toHaveTextContent('no');

      fireEvent.click(screen.getByTestId('action-button'));
      fireEvent.click(screen.getByTestId('undo-button'));

      expect(screen.getByTestId('can-redo')).toHaveTextContent('yes');
    });

    it('should handle bulk action as single undo/redo', () => {
      const TestComponent = () => {
        const { pushAction, undo, redo, canUndo, canRedo } = useUndoRedo();
        
        const handleBulkAction = () => {
          pushAction({
            type: 'bulk',
            timestamp: Date.now(),
            changes: [
              { path: 'path1', before: undefined, after: true },
              { path: 'path2', before: undefined, after: true },
              { path: 'path3', before: undefined, after: true }
            ],
            description: 'Ignore all selected'
          });
        };
        
        return (
          <div>
            <button data-testid="bulk-action-button" onClick={handleBulkAction}>
              Bulk Action
            </button>
            <button data-testid="undo-button" onClick={undo}>
              Undo
            </button>
            <button data-testid="redo-button" onClick={redo}>
              Redo
            </button>
            <div data-testid="can-undo">{canUndo ? 'yes' : 'no'}</div>
            <div data-testid="can-redo">{canRedo ? 'yes' : 'no'}</div>
          </div>
        );
      };

      render(
        <AppProvider configPath=".uigen/config.yaml" specStructure={null}>
          <TestComponent />
        </AppProvider>
      );

      // Perform bulk action
      fireEvent.click(screen.getByTestId('bulk-action-button'));
      expect(screen.getByTestId('can-undo')).toHaveTextContent('yes');

      // Undo should revert all changes at once
      fireEvent.click(screen.getByTestId('undo-button'));
      expect(screen.getByTestId('can-undo')).toHaveTextContent('no');
      expect(screen.getByTestId('can-redo')).toHaveTextContent('yes');

      // Redo should reapply all changes at once
      fireEvent.click(screen.getByTestId('redo-button'));
      expect(screen.getByTestId('can-undo')).toHaveTextContent('yes');
      expect(screen.getByTestId('can-redo')).toHaveTextContent('no');
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should trigger undo on Ctrl+Z', () => {
      const TestComponent = () => {
        const { pushAction, canUndo, canRedo } = useUndoRedo();
        
        React.useEffect(() => {
          pushAction({
            type: 'toggle',
            timestamp: Date.now(),
            changes: [{ path: 'path1', before: undefined, after: true }]
          });
        }, []);
        
        return (
          <div>
            <div data-testid="can-undo">{canUndo ? 'yes' : 'no'}</div>
            <div data-testid="can-redo">{canRedo ? 'yes' : 'no'}</div>
          </div>
        );
      };

      render(
        <AppProvider configPath=".uigen/config.yaml" specStructure={null}>
          <TestComponent />
        </AppProvider>
      );

      expect(screen.getByTestId('can-undo')).toHaveTextContent('yes');

      // Simulate Ctrl+Z
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });

      expect(screen.getByTestId('can-undo')).toHaveTextContent('no');
      expect(screen.getByTestId('can-redo')).toHaveTextContent('yes');
    });

    it('should trigger redo on Ctrl+Y', () => {
      const TestComponent = () => {
        const { pushAction, undo, canUndo, canRedo } = useUndoRedo();
        
        React.useEffect(() => {
          pushAction({
            type: 'toggle',
            timestamp: Date.now(),
            changes: [{ path: 'path1', before: undefined, after: true }]
          });
          undo();
        }, []);
        
        return (
          <div>
            <div data-testid="can-undo">{canUndo ? 'yes' : 'no'}</div>
            <div data-testid="can-redo">{canRedo ? 'yes' : 'no'}</div>
          </div>
        );
      };

      render(
        <AppProvider configPath=".uigen/config.yaml" specStructure={null}>
          <TestComponent />
        </AppProvider>
      );

      expect(screen.getByTestId('can-redo')).toHaveTextContent('yes');

      // Simulate Ctrl+Y
      fireEvent.keyDown(window, { key: 'y', ctrlKey: true });

      expect(screen.getByTestId('can-undo')).toHaveTextContent('yes');
      expect(screen.getByTestId('can-redo')).toHaveTextContent('no');
    });
  });
});
