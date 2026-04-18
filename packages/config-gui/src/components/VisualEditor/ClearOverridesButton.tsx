import { useState, useCallback } from 'react';
import { useAppContext } from '../../hooks/useAppContext.js';
import type { ConfigFile } from '@uigen-dev/core';

/**
 * Props for ClearOverridesButton component
 */
export interface ClearOverridesButtonProps {
  parentPath: string;
  childOverrides: string[];
  onClear?: () => void;
}

/**
 * ClearOverridesButton - Button to clear all override annotations for children
 * 
 * Displays a button that:
 * - Shows confirmation dialog with count of overrides
 * - Removes all x-uigen-ignore: false annotations from children
 * - Updates all affected children to show inherited state
 * - Saves changes atomically to config file
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */
export function ClearOverridesButton({ parentPath, childOverrides, onClear }: ClearOverridesButtonProps) {
  const { state: appState, actions: appActions } = useAppContext();
  const [showConfirmation, setShowConfirmation] = useState(false);

  /**
   * Handle clear overrides action
   */
  const handleClearOverrides = useCallback(() => {
    if (!appState.config) return;

    const newConfig: ConfigFile = {
      ...appState.config,
      annotations: {
        ...appState.config.annotations
      }
    };

    // Remove x-uigen-ignore: false annotations from all child overrides
    childOverrides.forEach(path => {
      if (newConfig.annotations[path]) {
        delete newConfig.annotations[path]['x-uigen-ignore'];
        
        // If no other annotations exist for this path, remove the path entry
        if (Object.keys(newConfig.annotations[path]).length === 0) {
          delete newConfig.annotations[path];
        }
      }
    });

    appActions.saveConfig(newConfig);
    setShowConfirmation(false);
    
    if (onClear) {
      onClear();
    }
  }, [appState.config, childOverrides, appActions, onClear]);

  // Don't render if no overrides
  if (childOverrides.length === 0) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setShowConfirmation(true)}
        className="px-3 py-1.5 text-xs font-medium text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-md transition-colors flex items-center gap-1.5"
        data-testid="clear-overrides-button"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
        Clear All Overrides ({childOverrides.length})
      </button>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          data-testid="clear-overrides-dialog"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <svg
                    className="w-6 h-6 text-orange-600 dark:text-orange-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Clear All Overrides?
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    This will remove {childOverrides.length} override annotation{childOverrides.length !== 1 ? 's' : ''} from children of <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">{parentPath}</span>.
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    All affected children will revert to inherited state (dimmed if parent is ignored).
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex items-center justify-end gap-3 rounded-b-lg">
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-colors"
                data-testid="cancel-clear-button"
              >
                Cancel
              </button>
              <button
                onClick={handleClearOverrides}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800 rounded-md transition-colors"
                data-testid="confirm-clear-button"
              >
                Clear Overrides
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
