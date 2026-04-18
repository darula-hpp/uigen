/**
 * ConcurrentModificationDialog Component
 * 
 * Displays a warning when the config file has been modified externally.
 * Provides options: Reload (discard local changes) or Keep my changes (overwrite file).
 * 
 * Requirements: 24.5
 */

import { AlertTriangle, RefreshCw, Save } from 'lucide-react';

export interface ConcurrentModificationDialogProps {
  isOpen: boolean;
  onReload: () => void;
  onKeepChanges: () => void;
  onClose: () => void;
}

export function ConcurrentModificationDialog({
  isOpen,
  onReload,
  onKeepChanges,
  onClose
}: ConcurrentModificationDialogProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="concurrent-modification-dialog-title"
      data-testid="concurrent-modification-dialog"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-start gap-3 p-6 border-b border-gray-200 dark:border-gray-700">
          <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h2
              id="concurrent-modification-dialog-title"
              className="text-lg font-semibold text-gray-900 dark:text-white"
            >
              Configuration File Modified
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            The configuration file was modified externally. Your local changes may conflict with the external changes.
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-3">
            Choose an option:
          </p>
          <ul className="text-sm text-gray-700 dark:text-gray-300 mt-2 space-y-1 list-disc list-inside">
            <li><strong>Reload:</strong> Discard your local changes and reload from file</li>
            <li><strong>Keep my changes:</strong> Overwrite the file with your local changes</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-700 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
            data-testid="cancel-button"
          >
            Cancel
          </button>
          <button
            onClick={onReload}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded transition-colors"
            data-testid="reload-button"
          >
            <RefreshCw className="w-4 h-4" />
            Reload
          </button>
          <button
            onClick={onKeepChanges}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded transition-colors"
            data-testid="keep-changes-button"
          >
            <Save className="w-4 h-4" />
            Keep my changes
          </button>
        </div>
      </div>
    </div>
  );
}
