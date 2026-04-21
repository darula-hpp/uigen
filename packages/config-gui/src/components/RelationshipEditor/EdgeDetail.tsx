import { useState } from 'react';
import type { RelationshipConfig } from '@uigen-dev/core';

/**
 * Props for EdgeDetail component
 */
export interface EdgeDetailProps {
  relationship: RelationshipConfig;
  existingRelationships: RelationshipConfig[];
  onUpdate: (updated: RelationshipConfig) => void;
  onDelete: () => void;
  onClose: () => void;
}

/**
 * EdgeDetail is an inline editable panel for a selected relationship edge.
 * It shows the current path and label, allows editing, and provides
 * confirm/delete/close actions.
 *
 * Requirements: 6.1, 6.2, 6.3
 */
export function EdgeDetail({
  relationship,
  existingRelationships,
  onUpdate,
  onDelete,
  onClose
}: EdgeDetailProps) {
  const [path, setPath] = useState(relationship.path);
  const [label, setLabel] = useState(relationship.label ?? '');
  const [pathError, setPathError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function validate(): string | null {
    const trimmed = path.trim();

    if (!trimmed) {
      return 'Path is required';
    }

    if (!trimmed.startsWith('/')) {
      return 'Path must start with /';
    }

    // Check for duplicate, excluding the current relationship itself
    const isDuplicate = existingRelationships.some(
      r =>
        r.source === relationship.source &&
        r.target === relationship.target &&
        r.path === trimmed &&
        r.path !== relationship.path
    );

    if (isDuplicate) {
      return `A relationship with path "${trimmed}" already exists for this pair`;
    }

    return null;
  }

  function handleConfirm() {
    const error = validate();
    if (error) {
      setPathError(error);
      return;
    }

    const updated: RelationshipConfig = {
      source: relationship.source,
      target: relationship.target,
      path: path.trim(),
      ...(label.trim() ? { label: label.trim() } : {})
    };

    onUpdate(updated);
  }

  function handlePathChange(value: string) {
    setPath(value);
    if (pathError) setPathError(null);
  }

  return (
    <div
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm"
      data-testid="edge-detail"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Edit Relationship
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Close edge detail"
          data-testid="edge-detail-close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Source / Target (read-only) */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        <span className="font-mono text-blue-600 dark:text-blue-400">{relationship.source}</span>
        <span className="mx-1 text-gray-400">to</span>
        <span className="font-mono text-blue-600 dark:text-blue-400">{relationship.target}</span>
      </p>

      {/* Path input */}
      <div className="mb-3">
        <label
          htmlFor="edge-path"
          className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          API Path <span className="text-red-500">*</span>
        </label>
        <input
          id="edge-path"
          type="text"
          value={path}
          onChange={e => handlePathChange(e.target.value)}
          className={`w-full text-sm border rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono ${
            pathError
              ? 'border-red-400 dark:border-red-500'
              : 'border-gray-300 dark:border-gray-600'
          }`}
          data-testid="edge-path-input"
          aria-describedby={pathError ? 'edge-path-error' : undefined}
        />
        {pathError && (
          <p
            id="edge-path-error"
            className="text-xs text-red-600 dark:text-red-400 mt-1"
            data-testid="edge-path-error"
          >
            {pathError}
          </p>
        )}
      </div>

      {/* Label input */}
      <div className="mb-4">
        <label
          htmlFor="edge-label"
          className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Label <span className="text-gray-400">(optional)</span>
        </label>
        <input
          id="edge-label"
          type="text"
          value={label}
          onChange={e => setLabel(e.target.value)}
          className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          data-testid="edge-label-input"
        />
      </div>

      {/* Actions */}
      {confirmingDelete ? (
        <div className="space-y-2">
          <p className="text-xs text-red-600 dark:text-red-400 font-medium">
            Delete this relationship?
          </p>
          <div className="flex gap-2">
            <button
              onClick={onDelete}
              className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 dark:bg-red-500 rounded hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
              data-testid="edge-delete-confirm"
            >
              Delete
            </button>
            <button
              onClick={() => setConfirmingDelete(false)}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              data-testid="edge-delete-cancel"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 rounded hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            data-testid="edge-detail-confirm"
          >
            Save
          </button>
          <button
            onClick={() => setConfirmingDelete(true)}
            className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 bg-white dark:bg-gray-700 border border-red-300 dark:border-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            data-testid="edge-detail-delete"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
