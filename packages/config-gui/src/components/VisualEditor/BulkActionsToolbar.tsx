import { useCallback } from 'react';
import { useSelection } from '../../contexts/SelectionContext.js';
import { useAppContext } from '../../hooks/useAppContext.js';
import type { ConfigFile } from '@uigen-dev/core';

/**
 * Props for BulkActionsToolbar component
 */
export interface BulkActionsToolbarProps {
  onBulkAction?: (action: 'ignore' | 'include', paths: string[]) => void;
}

/**
 * BulkActionsToolbar - Toolbar for bulk operations on selected elements
 * 
 * Displays when multiple elements are selected and provides:
 * - "Ignore All" button to set x-uigen-ignore: true on all selected
 * - "Include All" button to set x-uigen-ignore: false on all selected
 * - Selection count display
 * - Clear selection button
 * 
 * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5
 */
export function BulkActionsToolbar({ onBulkAction }: BulkActionsToolbarProps) {
  const { state: selectionState, actions: selectionActions } = useSelection();
  const { state: appState, actions: appActions } = useAppContext();

  const selectionCount = selectionActions.getSelectionCount();
  const selectedPaths = selectionActions.getSelectedPaths();

  /**
   * Handle "Ignore All" action
   */
  const handleIgnoreAll = useCallback(() => {
    if (!appState.config) return;

    const newConfig: ConfigFile = {
      ...appState.config,
      annotations: {
        ...appState.config.annotations
      }
    };

    // Set x-uigen-ignore: true for all selected paths
    selectedPaths.forEach(path => {
      if (!newConfig.annotations[path]) {
        newConfig.annotations[path] = {};
      }
      newConfig.annotations[path]['x-uigen-ignore'] = true;
    });

    appActions.saveConfig(newConfig);
    
    if (onBulkAction) {
      onBulkAction('ignore', selectedPaths);
    }
  }, [appState.config, selectedPaths, appActions, onBulkAction]);

  /**
   * Handle "Include All" action
   */
  const handleIncludeAll = useCallback(() => {
    if (!appState.config) return;

    const newConfig: ConfigFile = {
      ...appState.config,
      annotations: {
        ...appState.config.annotations
      }
    };

    // Set x-uigen-ignore: false for all selected paths
    selectedPaths.forEach(path => {
      if (!newConfig.annotations[path]) {
        newConfig.annotations[path] = {};
      }
      newConfig.annotations[path]['x-uigen-ignore'] = false;
    });

    appActions.saveConfig(newConfig);
    
    if (onBulkAction) {
      onBulkAction('include', selectedPaths);
    }
  }, [appState.config, selectedPaths, appActions, onBulkAction]);

  /**
   * Handle clear selection
   */
  const handleClearSelection = useCallback(() => {
    selectionActions.clearSelection();
  }, [selectionActions]);

  // Don't render if no selection
  if (selectionCount === 0) {
    return null;
  }

  return (
    <div
      className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center gap-4 z-50"
      data-testid="bulk-actions-toolbar"
    >
      {/* Selection count */}
      <div className="flex items-center gap-2">
        <svg
          className="w-5 h-5 text-blue-600 dark:text-blue-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {selectionCount} selected
        </span>
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleIgnoreAll}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 rounded-md transition-colors flex items-center gap-2"
          data-testid="ignore-all-button"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
            />
          </svg>
          Ignore All
        </button>

        <button
          onClick={handleIncludeAll}
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 rounded-md transition-colors flex items-center gap-2"
          data-testid="include-all-button"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          Include All
        </button>
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

      {/* Clear selection button */}
      <button
        onClick={handleClearSelection}
        className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
        data-testid="clear-selection-button"
        aria-label="Clear selection"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}
