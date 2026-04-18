import { useState } from 'react';
import type { ConfigFile } from '@uigen-dev/core';
import { useAppContext } from '../../../contexts/AppContext.js';
import { IgnoreToggle } from '../IgnoreControls/IgnoreToggle.js';
import { IgnoreTooltip } from '../IgnoreControls/IgnoreTooltip.js';
import { IgnoreStateCalculator } from '../../../types/index.js';
import { buildAnnotationsMap, buildUpdatedAnnotations } from './shared-utils.js';

/**
 * Props for SchemaObjectNode component
 *
 * Requirements: 1.2, 14.1, 14.2, 14.3, 14.4, 14.5
 */
export interface SchemaObjectNodeProps {
  /** Schema name (e.g., "User", "Product") */
  schemaName: string;
  /** Full path to the schema (e.g., "components.schemas.User") */
  schemaPath: string;
  /** Schema properties/fields */
  properties?: Array<{
    key: string;
    label: string;
    type: string;
    path: string;
    required: boolean;
  }>;
  /** Operations that reference this schema in request bodies */
  referencedInRequestBodies?: Array<{
    operationId: string;
    method: string;
    path: string;
  }>;
  /** Operations that reference this schema in responses */
  referencedInResponses?: Array<{
    operationId: string;
    method: string;
    path: string;
    statusCode: string;
  }>;
  /** Properties that reference this schema via $ref */
  referencedInProperties?: Array<{
    propertyPath: string;
    propertyName: string;
  }>;
}

/**
 * SchemaObjectNode renders a schema object with ignore support and reference tracking.
 *
 * Features:
 * - Display schema name (e.g., "User", "Product")
 * - Show location badge: "components/schemas"
 * - IgnoreToggle integration with proper state calculation
 * - Visual dimming (opacity-50) when ignored
 * - Reference tracking panel showing:
 *   - Operations using this schema in request bodies
 *   - Operations using this schema in responses
 *   - Properties using this schema via $ref
 *   - Count of affected elements
 * - Expand/collapse for schema properties
 * - Integration with IgnoreTooltip
 *
 * Requirements: 1.2, 14.1, 14.2, 14.3, 14.4, 14.5
 */
export function SchemaObjectNode({
  schemaName,
  schemaPath,
  properties = [],
  referencedInRequestBodies = [],
  referencedInResponses = [],
  referencedInProperties = []
}: SchemaObjectNodeProps) {
  const { state, actions } = useAppContext();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showReferences, setShowReferences] = useState(false);

  const hasProperties = properties.length > 0;
  const hasReferences = 
    referencedInRequestBodies.length > 0 || 
    referencedInResponses.length > 0 || 
    referencedInProperties.length > 0;

  // Build annotations map and compute ignore state
  const annotations = buildAnnotationsMap(state.config);
  const calculator = new IgnoreStateCalculator();
  const ignoreState = calculator.calculateState(schemaPath, 'schema', annotations);
  const isPruned = calculator.isPruned(schemaPath, annotations);

  // The toggle is disabled when pruned and no explicit override
  const isDisabled = isPruned && !ignoreState.isOverride;

  // Effective ignore: either explicitly ignored or inherited from parent
  const isEffectivelyIgnored = ignoreState.effective;

  // Calculate total affected elements
  const totalAffectedElements = 
    referencedInRequestBodies.length + 
    referencedInResponses.length + 
    referencedInProperties.length;

  // --- Handlers ---

  function handleIgnoreChange(value: boolean) {
    if (value === true) {
      const updated = buildUpdatedAnnotations(state.config, schemaPath, 'x-uigen-ignore', true);
      actions.saveConfig(updated);
    } else {
      // Remove the annotation (or set to false if it's an override)
      const newValue = isPruned ? false : undefined;
      const updated = buildUpdatedAnnotations(state.config, schemaPath, 'x-uigen-ignore', newValue);
      actions.saveConfig(updated);
    }
  }

  return (
    <div data-testid="schema-object-node" data-schema-path={schemaPath}>
      <IgnoreTooltip
        ignoreState={ignoreState}
        elementName={schemaName}
        isToggleSwitch={false}
      >
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${isEffectivelyIgnored ? 'opacity-50' : ''}`}
          data-testid="schema-object-row"
        >
          {/* Expand/collapse button for properties */}
          {hasProperties ? (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-400 dark:text-gray-500 flex-shrink-0 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label={isExpanded ? `Collapse ${schemaName} properties` : `Expand ${schemaName} properties`}
              data-testid="expand-collapse-button"
            >
              {isExpanded ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          ) : (
            <span className="w-4 flex-shrink-0" />
          )}

          {/* Schema icon */}
          <svg 
            className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
          </svg>

          {/* Schema name */}
          <span className="text-sm font-medium text-gray-900 dark:text-white flex-shrink-0">
            {schemaName}
          </span>

          {/* Location badge */}
          <span 
            className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-mono flex-shrink-0"
            data-testid="location-badge"
          >
            components/schemas
          </span>

          {/* Reference count badge (if has references) */}
          {hasReferences && (
            <button
              onClick={() => setShowReferences(!showReferences)}
              className="text-xs px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 font-medium flex-shrink-0 hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
              data-testid="reference-count-badge"
              aria-label={`${totalAffectedElements} references`}
            >
              {totalAffectedElements} ref{totalAffectedElements !== 1 ? 's' : ''}
            </button>
          )}

          {/* Ignore toggle */}
          <div className="ml-auto flex-shrink-0">
            <IgnoreToggle
              elementPath={schemaPath}
              elementType="schema"
              ignoreState={ignoreState}
              disabled={isDisabled}
              onChange={handleIgnoreChange}
            />
          </div>
        </div>
      </IgnoreTooltip>

      {/* Properties section (expanded) */}
      {hasProperties && isExpanded && (
        <div className="ml-6 mt-1 space-y-1" data-testid="schema-properties">
          {properties.map(property => (
            <div
              key={property.path}
              className={`flex items-center gap-2 px-3 py-1 rounded text-sm ${isEffectivelyIgnored ? 'opacity-50' : ''}`}
              data-testid="schema-property-item"
            >
              <span className="text-gray-700 dark:text-gray-300">
                {property.label}
                {property.required && (
                  <span className="text-red-500 ml-1" aria-label="required">*</span>
                )}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                {property.type}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* References panel (expanded) */}
      {hasReferences && showReferences && (
        <div 
          className={`ml-6 mt-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 ${isEffectivelyIgnored ? 'opacity-50' : ''}`}
          data-testid="references-panel"
        >
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
            References ({totalAffectedElements})
          </div>

          {/* Request bodies */}
          {referencedInRequestBodies.length > 0 && (
            <div className="mb-3" data-testid="request-body-references">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Request Bodies ({referencedInRequestBodies.length})
              </div>
              <div className="space-y-1">
                {referencedInRequestBodies.map((ref, index) => (
                  <div 
                    key={`${ref.operationId}-${index}`}
                    className="text-xs text-gray-700 dark:text-gray-300 pl-2"
                  >
                    <span className="font-mono text-blue-600 dark:text-blue-400 uppercase">
                      {ref.method}
                    </span>
                    {' '}
                    <span className="font-mono">{ref.path}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Responses */}
          {referencedInResponses.length > 0 && (
            <div className="mb-3" data-testid="response-references">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Responses ({referencedInResponses.length})
              </div>
              <div className="space-y-1">
                {referencedInResponses.map((ref, index) => (
                  <div 
                    key={`${ref.operationId}-${ref.statusCode}-${index}`}
                    className="text-xs text-gray-700 dark:text-gray-300 pl-2"
                  >
                    <span className="font-mono text-blue-600 dark:text-blue-400 uppercase">
                      {ref.method}
                    </span>
                    {' '}
                    <span className="font-mono">{ref.path}</span>
                    {' '}
                    <span className="text-green-600 dark:text-green-400">({ref.statusCode})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Properties */}
          {referencedInProperties.length > 0 && (
            <div data-testid="property-references">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Properties ({referencedInProperties.length})
              </div>
              <div className="space-y-1">
                {referencedInProperties.map((ref, index) => (
                  <div 
                    key={`${ref.propertyPath}-${index}`}
                    className="text-xs text-gray-700 dark:text-gray-300 pl-2 font-mono"
                  >
                    {ref.propertyName}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
