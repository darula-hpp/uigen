import { useState, useRef } from 'react';
import type { FieldNode as FieldNodeType } from '../../types/index.js';
import type { ConfigFile } from '@uigen-dev/core';
import { useAppContext } from '../../contexts/AppContext.js';

/**
 * Props for FieldNode component
 */
interface FieldNodeProps {
  field: FieldNodeType;
  /** Called when a drag starts from this field (for x-uigen-ref linking) */
  onDragStart?: (fieldPath: string, event: React.DragEvent) => void;
}

/**
 * FieldNode component displays a single field with inline annotation controls.
 *
 * Features:
 * - Annotation badges for all applied annotations
 * - Inline text input for x-uigen-label (click badge or "Add label" to edit)
 * - Toggle switch for x-uigen-ignore
 * - Draggable for x-uigen-ref linking (drag source for RefLinkCanvas)
 *
 * Annotation changes are saved immediately to the config file via AppContext.
 *
 * Requirements: 6.5, 6.6, 6.9
 *
 * Usage:
 * ```tsx
 * <FieldNode field={field} onDragStart={handleDragStart} />
 * ```
 */
export function FieldNode({ field, onDragStart }: FieldNodeProps) {
  const { state, actions } = useAppContext();
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState('');
  const labelInputRef = useRef<HTMLInputElement>(null);

  const currentAnnotations = getFieldAnnotations(state.config, field.path);
  const currentLabel = currentAnnotations['x-uigen-label'] as string | undefined;
  const isIgnored = Boolean(currentAnnotations['x-uigen-ignore']);
  const hasRef = Boolean(currentAnnotations['x-uigen-ref']);

  // --- Handlers ---

  function handleLabelBadgeClick() {
    setLabelDraft(currentLabel ?? '');
    setIsEditingLabel(true);
    // Focus after render
    setTimeout(() => labelInputRef.current?.focus(), 0);
  }

  function handleLabelSave() {
    const trimmed = labelDraft.trim();
    const updated = buildUpdatedAnnotations(state.config, field.path, 'x-uigen-label', trimmed || undefined);
    actions.saveConfig(updated);
    setIsEditingLabel(false);
  }

  function handleLabelKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleLabelSave();
    if (e.key === 'Escape') setIsEditingLabel(false);
  }

  function handleIgnoreToggle() {
    const newValue = !isIgnored ? true : undefined;
    const updated = buildUpdatedAnnotations(state.config, field.path, 'x-uigen-ignore', newValue);
    actions.saveConfig(updated);
  }

  function handleDragStart(e: React.DragEvent) {
    // dataTransfer may be unavailable in test environments (jsdom)
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', field.path);
      e.dataTransfer.effectAllowed = 'link';
    }
    onDragStart?.(field.path, e);
  }

  // --- Render ---

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${isIgnored ? 'opacity-50' : ''}`}
      draggable
      onDragStart={handleDragStart}
      data-field-path={field.path}
      data-testid="field-node"
    >
      {/* Drag handle icon */}
      <span
        className="text-gray-300 dark:text-gray-600 cursor-grab active:cursor-grabbing flex-shrink-0"
        title="Drag to create x-uigen-ref link"
        aria-label="Drag to link field"
      >
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 6a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm8-16a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </span>

      {/* Field name */}
      <span className="text-sm text-gray-900 dark:text-white flex-shrink-0">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </span>

      {/* Field type */}
      <span className="text-xs text-gray-400 dark:text-gray-500 font-mono flex-shrink-0">{field.type}</span>

      {/* Annotation badges / controls */}
      <div className="flex items-center gap-1.5 flex-wrap ml-auto">
        {/* x-uigen-ref badge */}
        {hasRef && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            ref
          </span>
        )}

        {/* x-uigen-label: inline edit or badge */}
        {isEditingLabel ? (
          <input
            ref={labelInputRef}
            type="text"
            value={labelDraft}
            onChange={e => setLabelDraft(e.target.value)}
            onBlur={handleLabelSave}
            onKeyDown={handleLabelKeyDown}
            className="px-2 py-0.5 text-xs border border-blue-400 dark:border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-32 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter label..."
            aria-label="Edit x-uigen-label value"
            data-testid="label-input"
          />
        ) : currentLabel ? (
          <button
            onClick={handleLabelBadgeClick}
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
            title="Click to edit label"
            aria-label={`Edit label: ${currentLabel}`}
            data-testid="label-badge"
          >
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            {currentLabel}
          </button>
        ) : (
          <button
            onClick={handleLabelBadgeClick}
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-green-100 dark:hover:bg-green-900 hover:text-green-700 dark:hover:text-green-300 transition-colors"
            title="Add x-uigen-label"
            aria-label="Add label annotation"
            data-testid="add-label-button"
          >
            + label
          </button>
        )}

        {/* x-uigen-ignore toggle */}
        <button
          role="switch"
          aria-checked={isIgnored}
          onClick={handleIgnoreToggle}
          className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-orange-400 dark:focus:ring-offset-gray-800 ${
            isIgnored ? 'bg-orange-400 dark:bg-orange-500' : 'bg-gray-200 dark:bg-gray-600'
          }`}
          title={isIgnored ? 'Remove x-uigen-ignore' : 'Add x-uigen-ignore'}
          aria-label={isIgnored ? 'Disable ignore annotation' : 'Enable ignore annotation'}
          data-testid="ignore-toggle"
        >
          <span
            className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
              isIgnored ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
        {isIgnored && (
          <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">ignored</span>
        )}
      </div>
    </div>
  );
}

// --- Helpers ---

/**
 * Get the current annotations for a field from the config file.
 */
function getFieldAnnotations(
  config: ConfigFile | null,
  fieldPath: string
): Record<string, unknown> {
  if (!config?.annotations) return {};
  return (config.annotations[fieldPath] as Record<string, unknown>) ?? {};
}

/**
 * Build an updated ConfigFile with a single annotation value changed for a field.
 * Passing `undefined` as value removes the annotation key.
 */
function buildUpdatedAnnotations(
  config: ConfigFile | null,
  fieldPath: string,
  annotationName: string,
  value: unknown
): ConfigFile {
  const base: ConfigFile = config ?? {
    version: '1.0',
    enabled: {},
    defaults: {},
    annotations: {}
  };

  const existingFieldAnnotations: Record<string, unknown> = {
    ...((base.annotations[fieldPath] as Record<string, unknown>) ?? {})
  };

  if (value === undefined) {
    delete existingFieldAnnotations[annotationName];
  } else {
    existingFieldAnnotations[annotationName] = value;
  }

  const updatedAnnotations = { ...base.annotations };
  if (Object.keys(existingFieldAnnotations).length === 0) {
    delete updatedAnnotations[fieldPath];
  } else {
    updatedAnnotations[fieldPath] = existingFieldAnnotations;
  }

  return {
    ...base,
    annotations: updatedAnnotations
  };
}
