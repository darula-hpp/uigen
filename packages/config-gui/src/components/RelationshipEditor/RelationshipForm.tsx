import { useState, useMemo, useEffect } from 'react';
import type { RelationshipConfig } from '@uigen-dev/core';
import { TypeSelector } from './TypeSelector.js';
import { deriveTypeFromPath } from '../../lib/relationship-type-deriver.js';

export interface RelationshipFormProps {
  sourceSlug: string;
  targetSlug: string;
  existingRelationships: RelationshipConfig[];
  /** All operation paths from the loaded spec */
  specOperationPaths: string[];
  onConfirm: (rel: RelationshipConfig) => void;
  onCancel: () => void;
}

/**
 * Scan the spec's operation paths and return every path that involves
 * both slugs in a sub-resource pattern, e.g.:
 *   /users/{id}/orders
 *   /orders/{id}/users
 */
function findCandidatePaths(paths: string[], source: string, target: string): string[] {
  const seen = new Set<string>();
  const results: string[] = [];

  for (const p of paths) {
    if (seen.has(p)) continue;
    const lower = p.toLowerCase();
    const hasSource = lower.includes(`/${source.toLowerCase()}/`) || lower.startsWith(`/${source.toLowerCase()}`);
    const hasTarget = lower.includes(`/${target.toLowerCase()}/`) || lower.endsWith(`/${target.toLowerCase()}`);
    if (hasSource && hasTarget) {
      seen.add(p);
      results.push(p);
    }
  }

  return results;
}

/**
 * RelationshipForm is shown after a drag-and-drop edge initiation.
 *
 * When the spec contains paths that involve both resources, they are shown
 * as a selectable list so the user never has to type a path manually.
 * A "custom path" option is always available as a fallback.
 */
export function RelationshipForm({
  sourceSlug,
  targetSlug,
  existingRelationships,
  specOperationPaths,
  onConfirm,
  onCancel,
}: RelationshipFormProps) {
  const candidates = useMemo(
    () => findCandidatePaths(specOperationPaths, sourceSlug, targetSlug),
    [specOperationPaths, sourceSlug, targetSlug]
  );

  // Start with the first candidate selected, or empty for manual entry
  const [selectedPath, setSelectedPath] = useState<string>(candidates[0] ?? '');
  const [customPath, setCustomPath] = useState('');
  const [useCustom, setUseCustom] = useState(candidates.length === 0);
  const [label, setLabel] = useState('');
  const [pathError, setPathError] = useState<string | null>(null);
  
  // Type selection state
  const [selectedType, setSelectedType] = useState<'hasMany' | 'belongsTo' | 'manyToMany'>('hasMany');

  const activePath = useCustom ? customPath.trim() : selectedPath;

  // Auto-recommend type based on path input
  useEffect(() => {
    if (activePath) {
      const recommendedType = deriveTypeFromPath(activePath, sourceSlug, targetSlug);
      setSelectedType(recommendedType);
    }
  }, [activePath, sourceSlug, targetSlug]);

  // Calculate recommended type for TypeSelector
  const recommendedType = activePath ? deriveTypeFromPath(activePath, sourceSlug, targetSlug) : undefined;

  function validate(): string | null {
    if (!activePath) return 'Select or enter a path';
    if (!activePath.startsWith('/')) return 'Path must start with /';
    if (sourceSlug === targetSlug) return 'Source and target must be different resources';
    if (!selectedType) return 'Select a relationship type';

    const isDuplicate = existingRelationships.some(
      r => r.source === sourceSlug && r.target === targetSlug && r.path === activePath
    );
    if (isDuplicate) return `This relationship already exists`;

    return null;
  }

  function handleConfirm() {
    const error = validate();
    if (error) { setPathError(error); return; }

    onConfirm({
      source: sourceSlug,
      target: targetSlug,
      path: activePath,
      type: selectedType,
      ...(label.trim() ? { label: label.trim() } : {}),
    });
  }

  return (
    <div
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm"
      data-testid="relationship-form"
    >
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">New Relationship</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        <span className="font-mono text-indigo-600 dark:text-indigo-400">{sourceSlug}</span>
        <span className="mx-1 text-gray-400">to</span>
        <span className="font-mono text-indigo-600 dark:text-indigo-400">{targetSlug}</span>
      </p>

      {/* Path selection */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          API Path <span className="text-red-500">*</span>
        </label>

        {candidates.length > 0 && !useCustom ? (
          <>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
              These paths from your spec connect both resources. Pick one:
            </p>
            <ul className="space-y-1 mb-2">
              {candidates.map(p => (
                <li key={p}>
                  <button
                    type="button"
                    onClick={() => { setSelectedPath(p); setPathError(null); }}
                    className={[
                      'w-full text-left px-3 py-2 rounded-md text-xs font-mono transition-colors',
                      selectedPath === p
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300'
                        : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-600',
                    ].join(' ')}
                    data-testid={`path-candidate-${p}`}
                  >
                    {p}
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => { setUseCustom(true); setPathError(null); }}
              className="text-xs text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 underline"
            >
              Enter a custom path instead
            </button>
          </>
        ) : (
          <>
            {candidates.length > 0 && (
              <button
                type="button"
                onClick={() => { setUseCustom(false); setPathError(null); }}
                className="text-xs text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 underline mb-2 block"
              >
                Back to suggested paths
              </button>
            )}
            <input
              id="rel-path"
              type="text"
              value={customPath}
              onChange={e => { setCustomPath(e.target.value); setPathError(null); }}
              placeholder={`/${sourceSlug}/{id}/${targetSlug}`}
              className={[
                'w-full text-sm border rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono',
                pathError ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-600',
              ].join(' ')}
              data-testid="rel-path-input"
            />
            {candidates.length === 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                No matching paths found in the spec. Enter the route that links these two resources.
              </p>
            )}
          </>
        )}

        {pathError && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1" data-testid="rel-path-error">
            {pathError}
          </p>
        )}
      </div>

      {/* Type selector */}
      <div className="mb-3">
        <TypeSelector
          value={selectedType}
          onChange={setSelectedType}
          recommendedType={recommendedType}
        />
      </div>

      {/* Optional label */}
      <div className="mb-4">
        <label htmlFor="rel-label" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Label <span className="text-gray-400">(optional)</span>
        </label>
        <input
          id="rel-label"
          type="text"
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="e.g. User Orders"
          className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          data-testid="rel-label-input"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleConfirm}
          className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 dark:bg-indigo-500 rounded hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
          data-testid="rel-form-confirm"
        >
          Add Relationship
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          data-testid="rel-form-cancel"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
