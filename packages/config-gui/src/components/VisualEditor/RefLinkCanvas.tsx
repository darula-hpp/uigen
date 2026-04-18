import { useState } from 'react';
import type { SpecStructure, ResourceNode, FieldNode } from '../../types/index.js';
import type { ConfigFile } from '@uigen-dev/core';
import { useAppContext } from '../../contexts/AppContext.js';

/**
 * Props for RefLinkCanvas component
 */
export interface RefLinkCanvasProps {
  structure: SpecStructure;
}

/**
 * Represents a pending link being configured after a drop
 */
interface PendingLink {
  fieldPath: string;
  targetResource: ResourceNode;
  valueField: string;
  labelField: string;
}

/**
 * Represents an existing x-uigen-ref link extracted from config
 */
interface RefLink {
  fieldPath: string;
  resource: string;
  valueField: string;
  labelField: string;
}

/**
 * RefLinkCanvas provides a list-based UI for creating and managing x-uigen-ref
 * annotations via drag-and-drop.
 *
 * Features:
 * - Drag a field row onto a resource drop zone to initiate a ref link
 * - After drop, an inline form prompts for valueField and labelField
 * - Validates that the target resource and specified fields exist
 * - Displays all existing ref links as a visual list
 * - Saves ref config to config.annotations[fieldPath]['x-uigen-ref']
 * - Allows deleting existing ref links
 *
 * Requirements: 6.3, 6.4, 6.8, 6.9
 *
 * Usage:
 * ```tsx
 * <RefLinkCanvas structure={specStructure} />
 * ```
 */
export function RefLinkCanvas({ structure }: RefLinkCanvasProps) {
  const { state, actions } = useAppContext();
  const [pendingLink, setPendingLink] = useState<PendingLink | null>(null);
  const [dragOverResource, setDragOverResource] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const existingLinks = extractRefLinks(state.config, structure);

  // --- Drag handlers ---

  function handleDragOver(e: React.DragEvent, resourceSlug: string) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'link';
    }
    setDragOverResource(resourceSlug);
  }

  function handleDragLeave() {
    setDragOverResource(null);
  }

  function handleDrop(e: React.DragEvent, targetResource: ResourceNode) {
    e.preventDefault();
    setDragOverResource(null);

    const fieldPath = e.dataTransfer?.getData('text/plain') ?? '';
    if (!fieldPath) return;

    // Don't allow linking a field to its own resource
    const fieldResourceSlug = fieldPath.split('.')[0];
    if (fieldResourceSlug === targetResource.slug) return;

    // Open the inline form to configure valueField and labelField
    setPendingLink({
      fieldPath,
      targetResource,
      valueField: '',
      labelField: ''
    });
    setValidationErrors({});
  }

  // --- Pending link form handlers ---

  function handlePendingChange(field: 'valueField' | 'labelField', value: string) {
    if (!pendingLink) return;
    setPendingLink({ ...pendingLink, [field]: value });
    // Clear error for this field on change
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function handleConfirmLink() {
    if (!pendingLink) return;

    const errors = validatePendingLink(pendingLink);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    const refValue = {
      resource: pendingLink.targetResource.slug,
      valueField: pendingLink.valueField.trim(),
      labelField: pendingLink.labelField.trim()
    };

    const updated = buildUpdatedAnnotations(
      state.config,
      pendingLink.fieldPath,
      'x-uigen-ref',
      refValue
    );

    actions.saveConfig(updated);
    setPendingLink(null);
    setValidationErrors({});
  }

  function handleCancelLink() {
    setPendingLink(null);
    setValidationErrors({});
  }

  // --- Delete existing link ---

  function handleDeleteLink(fieldPath: string) {
    const updated = buildUpdatedAnnotations(state.config, fieldPath, 'x-uigen-ref', undefined);
    actions.saveConfig(updated);
  }

  // --- Render ---

  return (
    <div className="space-y-6" data-testid="ref-link-canvas">
      {/* Existing links */}
      <section>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">
          Existing Ref Links
        </h4>
        {existingLinks.length === 0 ? (
          <p className="text-sm text-gray-400 italic">
            No ref links configured. Drag a field onto a resource below to create one.
          </p>
        ) : (
          <ul className="space-y-2" data-testid="ref-links-list">
            {existingLinks.map(link => (
              <li
                key={link.fieldPath}
                className="flex items-center gap-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-md"
                data-testid="ref-link-item"
              >
                <span className="text-blue-600 flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </span>
                <span className="flex-1 text-sm">
                  <span className="font-mono text-gray-800">{link.fieldPath}</span>
                  <span className="text-gray-500 mx-2">→</span>
                  <span className="font-medium text-blue-700">{link.resource}</span>
                  <span className="text-gray-400 text-xs ml-2">
                    (value: <span className="font-mono">{link.valueField}</span>,
                    label: <span className="font-mono">{link.labelField}</span>)
                  </span>
                </span>
                <button
                  onClick={() => handleDeleteLink(link.fieldPath)}
                  className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                  aria-label={`Remove ref link for ${link.fieldPath}`}
                  data-testid="delete-ref-link"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Pending link form */}
      {pendingLink && (
        <section
          className="border border-yellow-300 bg-yellow-50 rounded-md p-4"
          data-testid="pending-link-form"
        >
          <h4 className="text-sm font-semibold text-gray-800 mb-3">
            Configure Ref Link: <span className="font-mono text-blue-700">{pendingLink.fieldPath}</span>
            <span className="text-gray-500 mx-2">→</span>
            <span className="font-medium text-blue-700">{pendingLink.targetResource.slug}</span>
          </h4>

          <div className="space-y-3">
            <div>
              <label
                htmlFor="ref-value-field"
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                Value Field <span className="text-red-500">*</span>
              </label>
              <select
                id="ref-value-field"
                value={pendingLink.valueField}
                onChange={e => handlePendingChange('valueField', e.target.value)}
                className={`w-full text-sm border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  validationErrors.valueField ? 'border-red-400' : 'border-gray-300'
                }`}
                data-testid="value-field-select"
              >
                <option value="">Select a field...</option>
                {pendingLink.targetResource.fields.map(f => (
                  <option key={f.path} value={f.key}>{f.label} ({f.key})</option>
                ))}
              </select>
              {validationErrors.valueField && (
                <p className="text-xs text-red-600 mt-1" data-testid="value-field-error">
                  {validationErrors.valueField}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="ref-label-field"
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                Label Field <span className="text-red-500">*</span>
              </label>
              <select
                id="ref-label-field"
                value={pendingLink.labelField}
                onChange={e => handlePendingChange('labelField', e.target.value)}
                className={`w-full text-sm border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  validationErrors.labelField ? 'border-red-400' : 'border-gray-300'
                }`}
                data-testid="label-field-select"
              >
                <option value="">Select a field...</option>
                {pendingLink.targetResource.fields.map(f => (
                  <option key={f.path} value={f.key}>{f.label} ({f.key})</option>
                ))}
              </select>
              {validationErrors.labelField && (
                <p className="text-xs text-red-600 mt-1" data-testid="label-field-error">
                  {validationErrors.labelField}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleConfirmLink}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
              data-testid="confirm-link-button"
            >
              Save Link
            </button>
            <button
              onClick={handleCancelLink}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              data-testid="cancel-link-button"
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {/* Resource drop zones */}
      <section>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">
          Resources (drop a field here to create a ref link)
        </h4>
        <div className="space-y-2">
          {structure.resources.map(resource => (
            <ResourceDropZone
              key={resource.slug}
              resource={resource}
              isDragOver={dragOverResource === resource.slug}
              onDragOver={e => handleDragOver(e, resource.slug)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, resource)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

// --- Sub-components ---

interface ResourceDropZoneProps {
  resource: ResourceNode;
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}

function ResourceDropZone({
  resource,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop
}: ResourceDropZoneProps) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`border-2 border-dashed rounded-md px-4 py-3 transition-colors ${
        isDragOver
          ? 'border-blue-400 bg-blue-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
      data-testid={`resource-drop-zone-${resource.slug}`}
      aria-label={`Drop zone for ${resource.name} resource`}
    >
      <div className="flex items-center gap-2">
        <span className="text-blue-500 flex-shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </span>
        <span className="font-medium text-gray-800 text-sm">{resource.name}</span>
        <span className="text-xs text-gray-400 ml-auto">
          {resource.fields.length} field{resource.fields.length !== 1 ? 's' : ''}
        </span>
      </div>

      {resource.fields.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {resource.fields.map(field => (
            <FieldPill key={field.path} field={field} />
          ))}
        </div>
      )}

      {isDragOver && (
        <p className="text-xs text-blue-600 mt-2 font-medium">
          Drop to link to {resource.name}
        </p>
      )}
    </div>
  );
}

interface FieldPillProps {
  field: FieldNode;
}

function FieldPill({ field }: FieldPillProps) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600 font-mono">
      {field.key}
      <span className="ml-1 text-gray-400">{field.type}</span>
    </span>
  );
}

// --- Helpers ---

/**
 * Extract all existing x-uigen-ref links from the config file.
 */
function extractRefLinks(config: ConfigFile | null, structure: SpecStructure): RefLink[] {
  if (!config?.annotations) return [];

  const links: RefLink[] = [];

  for (const [fieldPath, annotationConfig] of Object.entries(config.annotations)) {
    const annotations = annotationConfig as Record<string, unknown>;
    const ref = annotations['x-uigen-ref'];
    if (!ref || typeof ref !== 'object') continue;

    const refObj = ref as Record<string, unknown>;
    if (
      typeof refObj.resource === 'string' &&
      typeof refObj.valueField === 'string' &&
      typeof refObj.labelField === 'string'
    ) {
      // Validate the target resource still exists in the structure
      const resourceExists = structure.resources.some(r => r.slug === refObj.resource);
      if (resourceExists) {
        links.push({
          fieldPath,
          resource: refObj.resource,
          valueField: refObj.valueField,
          labelField: refObj.labelField
        });
      }
    }
  }

  return links;
}

/**
 * Validate a pending link before saving.
 * Returns a map of field name to error message.
 */
function validatePendingLink(pending: PendingLink): Record<string, string> {
  const errors: Record<string, string> = {};

  const trimmedValue = pending.valueField.trim();
  const trimmedLabel = pending.labelField.trim();

  if (!trimmedValue) {
    errors.valueField = 'Value field is required';
  } else {
    const fieldExists = pending.targetResource.fields.some(f => f.key === trimmedValue);
    if (!fieldExists) {
      errors.valueField = `Field "${trimmedValue}" does not exist in ${pending.targetResource.slug}`;
    }
  }

  if (!trimmedLabel) {
    errors.labelField = 'Label field is required';
  } else {
    const fieldExists = pending.targetResource.fields.some(f => f.key === trimmedLabel);
    if (!fieldExists) {
      errors.labelField = `Field "${trimmedLabel}" does not exist in ${pending.targetResource.slug}`;
    }
  }

  return errors;
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
