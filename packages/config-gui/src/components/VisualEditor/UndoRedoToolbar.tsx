import { useUndoRedo } from '../../hooks/useUndoRedo.js';

/**
 * UndoRedoToolbar - Toolbar with undo/redo buttons
 * 
 * Displays:
 * - Undo button (disabled when no actions to undo)
 * - Redo button (disabled when no actions to redo)
 * - Keyboard shortcut hints in tooltips
 * 
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */
export function UndoRedoToolbar() {
  const { undo, redo, canUndo, canRedo } = useUndoRedo();

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const undoShortcut = isMac ? '⌘Z' : 'Ctrl+Z';
  const redoShortcut = isMac ? '⌘⇧Z' : 'Ctrl+Y';

  return (
    <div
      className="flex items-center gap-2"
      data-testid="undo-redo-toolbar"
    >
      {/* Undo button */}
      <button
        onClick={undo}
        disabled={!canUndo}
        className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:disabled:hover:bg-transparent flex items-center gap-2"
        data-testid="undo-button"
        title={`Undo (${undoShortcut})`}
        aria-label={`Undo (${undoShortcut})`}
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
            d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
          />
        </svg>
        <span className="hidden sm:inline">Undo</span>
      </button>

      {/* Redo button */}
      <button
        onClick={redo}
        disabled={!canRedo}
        className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:disabled:hover:bg-transparent flex items-center gap-2"
        data-testid="redo-button"
        title={`Redo (${redoShortcut})`}
        aria-label={`Redo (${redoShortcut})`}
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
            d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6"
          />
        </svg>
        <span className="hidden sm:inline">Redo</span>
      </button>
    </div>
  );
}
