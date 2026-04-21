import { useState } from 'react';
import type { RelationshipConfig } from '@uigen-dev/core';
import type { ResourceNode } from '../../types/index.js';
import { GraphCanvas } from './GraphCanvas.js';
import { RelationshipList } from './RelationshipList.js';
import { RelationshipForm } from './RelationshipForm.js';
import { EdgeDetail } from './EdgeDetail.js';

/**
 * Panel state for the right column overlay
 */
type PanelState =
  | { type: 'none' }
  | { type: 'form'; sourceSlug: string; targetSlug: string }
  | { type: 'detail'; relationship: RelationshipConfig };

/**
 * Props for RelationshipEditor component
 */
export interface RelationshipEditorProps {
  resources: ResourceNode[] | null;
  relationships: RelationshipConfig[];
  specOperationPaths: string[];
  onSave: (relationships: RelationshipConfig[]) => void;
}

/**
 * RelationshipEditor is the top-level component for the Relationships tab.
 *
 * Layout:
 * - Left 70%: GraphCanvas (resource nodes + SVG edge overlay)
 * - Right 30%: RelationshipList + overlay panel (RelationshipForm or EdgeDetail)
 *
 * When resources is null (spec not loaded), a disabled state is shown.
 *
 * Requirements: 3.2, 3.3, 3.4, 3.5
 */
export function RelationshipEditor({
  resources,
  relationships,
  specOperationPaths,
  onSave
}: RelationshipEditorProps) {
  const [panel, setPanel] = useState<PanelState>({ type: 'none' });

  // --- Callbacks ---

  function handleEdgeInitiated(sourceSlug: string, targetSlug: string) {
    setPanel({ type: 'form', sourceSlug, targetSlug });
  }

  function handleEdgeSelect(rel: RelationshipConfig) {
    setPanel({ type: 'detail', relationship: rel });
  }

  function handleFormConfirm(rel: RelationshipConfig) {
    onSave([...relationships, rel]);
    setPanel({ type: 'none' });
  }

  function handleFormCancel() {
    setPanel({ type: 'none' });
  }

  function handleEdgeUpdate(updated: RelationshipConfig) {
    if (panel.type !== 'detail') return;
    const original = panel.relationship;

    const next = relationships.map(r =>
      r.source === original.source &&
      r.target === original.target &&
      r.path === original.path
        ? updated
        : r
    );

    onSave(next);
    setPanel({ type: 'none' });
  }

  function handleEdgeDelete() {
    if (panel.type !== 'detail') return;
    const original = panel.relationship;

    const next = relationships.filter(
      r => !(r.source === original.source && r.target === original.target && r.path === original.path)
    );

    onSave(next);
    setPanel({ type: 'none' });
  }

  function handleListDelete(rel: RelationshipConfig) {
    const next = relationships.filter(
      r => !(r.source === rel.source && r.target === rel.target && r.path === rel.path)
    );
    onSave(next);

    // Close panel if the deleted edge was selected
    if (
      panel.type === 'detail' &&
      panel.relationship.source === rel.source &&
      panel.relationship.target === rel.target &&
      panel.relationship.path === rel.path
    ) {
      setPanel({ type: 'none' });
    }
  }

  function handleClearAll() {
    onSave([]);
    setPanel({ type: 'none' });
  }

  // --- Disabled state ---

  if (!resources) {
    return (
      <div
        className="flex items-center justify-center h-64 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg"
        data-testid="relationship-editor-disabled"
      >
        <div className="text-center">
          <svg className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            No spec loaded
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Load an OpenAPI spec to start declaring relationships between resources.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-screen" data-testid="relationship-editor">
      {/* Canvas — takes all available width minus the side panel */}
      <div className="flex-1 min-w-0">
        <GraphCanvas
          resources={resources}
          relationships={relationships}
          onEdgeInitiated={handleEdgeInitiated}
          onEdgeSelect={handleEdgeSelect}
        />
      </div>

      {/* Right side panel — fixed width, scrollable */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-3 p-3 border-l border-gray-200 dark:border-gray-700 overflow-y-auto" style={{ height: '100vh' }}>
        {/* Overlay panel */}
        {panel.type === 'form' && (
          <RelationshipForm
            sourceSlug={panel.sourceSlug}
            targetSlug={panel.targetSlug}
            existingRelationships={relationships}
            specOperationPaths={specOperationPaths}
            onConfirm={handleFormConfirm}
            onCancel={handleFormCancel}
          />
        )}

        {panel.type === 'detail' && (
          <EdgeDetail
            relationship={panel.relationship}
            existingRelationships={relationships}
            onUpdate={handleEdgeUpdate}
            onDelete={handleEdgeDelete}
            onClose={() => setPanel({ type: 'none' })}
          />
        )}

        {/* Relationship list */}
        <RelationshipList
          relationships={relationships}
          onEdgeSelect={handleEdgeSelect}
          onDelete={handleListDelete}
          onClearAll={handleClearAll}
        />
      </div>
    </div>
  );
}
