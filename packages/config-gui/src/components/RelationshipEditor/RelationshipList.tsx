import { useState } from 'react';
import type { RelationshipConfig } from '@uigen-dev/core';

/**
 * Props for RelationshipList component
 */
export interface RelationshipListProps {
  relationships: RelationshipConfig[];
  onEdgeSelect: (rel: RelationshipConfig) => void;
  onDelete: (rel: RelationshipConfig) => void;
  onClearAll: () => void;
}

/**
 * RelationshipList renders a scrollable list of all declared relationships.
 * Each row has edit (select) and delete controls.
 * A "Clear All" action is provided with a confirmation dialog.
 *
 * Requirements: 6.1, 6.3, 6.5
 */
export function RelationshipList({
  relationships,
  onEdgeSelect,
  onDelete,
  onClearAll
}: RelationshipListProps) {
  const [confirmingClearAll, setConfirmingClearAll] = useState(false);

  function handleClearAll() {
    setConfirmingClearAll(false);
    onClearAll();
  }

  return (
    <div className="flex flex-col h-full" data-testid="relationship-list">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Relationships
          {relationships.length > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
              ({relationships.length})
            </span>
          )}
        </h3>

        {relationships.length > 0 && !confirmingClearAll && (
          <button
            onClick={() => setConfirmingClearAll(true)}
            className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
            data-testid="clear-all-button"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Clear All confirmation */}
      {confirmingClearAll && (
        <div
          className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md flex-shrink-0"
          data-testid="clear-all-confirm"
        >
          <p className="text-xs text-red-700 dark:text-red-300 mb-2 font-medium">
            Remove all {relationships.length} relationship{relationships.length !== 1 ? 's' : ''}?
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleClearAll}
              className="px-2 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
              data-testid="clear-all-confirm-button"
            >
              Remove All
            </button>
            <button
              onClick={() => setConfirmingClearAll(false)}
              className="px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              data-testid="clear-all-cancel-button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {relationships.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 italic text-center py-6">
          No relationships declared yet. Drag one resource node onto another to create one.
        </p>
      ) : (
        <ul className="space-y-2 overflow-y-auto flex-1" data-testid="relationship-rows">
          {relationships.map((rel, idx) => (
            <RelationshipRow
              key={`${rel.source}-${rel.target}-${rel.path}-${idx}`}
              relationship={rel}
              onSelect={() => onEdgeSelect(rel)}
              onDelete={() => onDelete(rel)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

// --- Sub-component ---

interface RelationshipRowProps {
  relationship: RelationshipConfig;
  onSelect: () => void;
  onDelete: () => void;
}

function RelationshipRow({ relationship, onSelect, onDelete }: RelationshipRowProps) {
  return (
    <li
      className="flex items-start gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-700 transition-colors group"
      data-testid="relationship-row"
    >
      {/* Row content (clickable to select/edit) */}
      <button
        onClick={onSelect}
        className="flex-1 text-left min-w-0"
        aria-label={`Edit relationship from ${relationship.source} to ${relationship.target}`}
        data-testid={`relationship-row-select-${relationship.source}-${relationship.target}`}
      >
        <div className="flex items-center gap-1 text-xs mb-0.5">
          <span className="font-mono text-blue-600 dark:text-blue-400 truncate">
            {relationship.source}
          </span>
          <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
          <span className="font-mono text-blue-600 dark:text-blue-400 truncate">
            {relationship.target}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
          {relationship.path}
        </p>
        {relationship.label && (
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
            {relationship.label}
          </p>
        )}
      </button>

      {/* Delete button */}
      <button
        onClick={e => {
          e.stopPropagation();
          onDelete();
        }}
        className="flex-shrink-0 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
        aria-label={`Delete relationship from ${relationship.source} to ${relationship.target}`}
        data-testid={`relationship-row-delete-${relationship.source}-${relationship.target}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </li>
  );
}
