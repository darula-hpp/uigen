import { useState } from 'react';
import { useAppContext } from '../../../contexts/AppContext.js';
import { IgnoreToggle } from '../IgnoreControls/IgnoreToggle.js';
import { IgnoreTooltip } from '../IgnoreControls/IgnoreTooltip.js';
import { IgnoreStateCalculator } from '../../../types/index.js';
import { buildAnnotationsMap, buildUpdatedAnnotations } from './shared-utils.js';

/**
 * RequestBodyNode Component
 * 
 * Renders OpenAPI/Swagger request bodies with ignore support and visual indicators.
 * 
 * @example
 * ```tsx
 * const requestBody: RequestBodyInfo = {
 *   path: 'paths./users.post.requestBody',
 *   contentType: 'application/json',
 *   schemaRef: '#/components/schemas/User',
 *   required: true,
 *   description: 'User object to create'
 * };
 * 
 * <RequestBodyNode 
 *   requestBody={requestBody}
 *   showSchema={true}
 * />
 * ```
 * 
 * Requirements: 1.4, 12.1, 12.2, 12.3, 12.4, 12.5
 */

/**
 * Request body information
 */
export interface RequestBodyInfo {
  /** Full path to the request body (e.g., "paths./users.post.requestBody") */
  path: string;
  /** Content type (e.g., "application/json", "application/xml") */
  contentType: string;
  /** Schema reference if using $ref (e.g., "#/components/schemas/User") */
  schemaRef?: string;
  /** Whether the request body is required */
  required?: boolean;
  /** Description of the request body */
  description?: string;
  /** Schema properties (if inline schema) */
  properties?: SchemaProperty[];
}

/**
 * Schema property information
 */
export interface SchemaProperty {
  /** Property name */
  name: string;
  /** Property type (string, integer, boolean, etc.) */
  type: string;
  /** Whether the property is required */
  required?: boolean;
  /** Property description */
  description?: string;
}

/**
 * Props for RequestBodyNode component
 *
 * Requirements: 1.4, 12.1, 12.2, 12.3, 12.4, 12.5
 */
export interface RequestBodyNodeProps {
  /** Request body information to display */
  requestBody: RequestBodyInfo;
  /** Whether to show schema properties (default: true) */
  showSchema?: boolean;
}

/**
 * RequestBodyNode renders request bodies with ignore support and visual indicators.
 *
 * Features:
 * - Display request body content type (e.g., "application/json")
 * - Show schema reference if using $ref
 * - IgnoreToggle integration with proper state calculation
 * - Visual dimming (opacity-50) when ignored
 * - Expand/collapse for schema properties
 * - "No Input Form" badge indicator (can be used by parent OperationNode)
 * - Integration with IgnoreTooltip
 * - Handle $ref schema references with appropriate tooltips
 * - Display toggle switch prominently in operation details panel
 *
 * Requirements: 1.4, 12.1, 12.2, 12.3, 12.4, 12.5
 */
export function RequestBodyNode({
  requestBody,
  showSchema = true
}: RequestBodyNodeProps) {
  const { state, actions } = useAppContext();
  const [isExpanded, setIsExpanded] = useState(true);

  // Build annotations map
  const annotations = buildAnnotationsMap(state.config);
  const calculator = new IgnoreStateCalculator();

  // Calculate ignore state for request body
  const ignoreState = calculator.calculateState(
    requestBody.path,
    'requestBody',
    annotations
  );
  const isPruned = calculator.isPruned(requestBody.path, annotations);
  const isDisabled = isPruned && !ignoreState.isOverride;
  const isEffectivelyIgnored = ignoreState.effective;

  // Check if referenced schema is ignored
  const referencedSchemaIgnored = checkReferencedSchemaIgnored(
    requestBody.schemaRef,
    annotations,
    calculator
  );

  // Handle ignore change for request body
  const handleIgnoreChange = (value: boolean) => {
    if (value === true) {
      const updated = buildUpdatedAnnotations(
        state.config,
        requestBody.path,
        'x-uigen-ignore',
        true
      );
      actions.saveConfig(updated);
    } else {
      // Check if this is an override scenario
      const isPruned = calculator.isPruned(requestBody.path, annotations);
      const newValue = isPruned ? false : undefined;
      const updated = buildUpdatedAnnotations(
        state.config,
        requestBody.path,
        'x-uigen-ignore',
        newValue
      );
      actions.saveConfig(updated);
    }
  };

  // Toggle expand/collapse
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Get schema name from $ref
  const schemaName = requestBody.schemaRef
    ? getSchemaNameFromRef(requestBody.schemaRef)
    : undefined;

  return (
    <div
      data-testid="request-body-node"
      data-request-body-path={requestBody.path}
      className={`border border-gray-200 dark:border-gray-700 rounded-lg ${
        isEffectivelyIgnored ? 'opacity-50' : ''
      }`}
    >
      <IgnoreTooltip
        ignoreState={
          referencedSchemaIgnored.isIgnored
            ? {
                ...ignoreState,
                effective: true,
                source: 'inherited',
                inheritedFrom: referencedSchemaIgnored.schemaPath
              }
            : ignoreState
        }
        elementName="Request Body"
        isToggleSwitch={false}
      >
        <div
          className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-t-lg"
          data-testid="request-body-header"
        >
          {/* Request body icon */}
          <svg
            className="w-5 h-5 text-blue-500 dark:text-blue-400 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>

          {/* Request body label */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                Request Body
                {requestBody.required && (
                  <span className="text-red-500 ml-1" aria-label="required">
                    *
                  </span>
                )}
              </span>

              {/* Content type badge */}
              <span
                className="text-xs px-2 py-0.5 rounded font-mono bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                data-testid="content-type-badge"
              >
                {requestBody.contentType}
              </span>

              {/* Schema reference badge */}
              {schemaName && (
                <span
                  className={`text-xs px-2 py-0.5 rounded font-mono ${
                    referencedSchemaIgnored.isIgnored
                      ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                      : 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
                  }`}
                  data-testid="schema-ref-badge"
                  title={
                    referencedSchemaIgnored.isIgnored
                      ? `Referenced schema ${schemaName} is ignored`
                      : `References schema: ${schemaName}`
                  }
                >
                  $ref: {schemaName}
                </span>
              )}
            </div>

            {/* Description */}
            {requestBody.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {requestBody.description}
              </p>
            )}
          </div>

          {/* Expand/collapse button (only if has properties) */}
          {showSchema && requestBody.properties && requestBody.properties.length > 0 && (
            <button
              onClick={toggleExpanded}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label={isExpanded ? 'Collapse schema' : 'Expand schema'}
              data-testid="expand-collapse-button"
            >
              <svg
                className="w-4 h-4 text-gray-500 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isExpanded ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                )}
              </svg>
            </button>
          )}

          {/* Ignore toggle */}
          <div className="flex-shrink-0">
            <IgnoreToggle
              elementPath={requestBody.path}
              elementType="requestBody"
              ignoreState={ignoreState}
              disabled={isDisabled || referencedSchemaIgnored.isIgnored}
              onChange={handleIgnoreChange}
            />
          </div>
        </div>
      </IgnoreTooltip>

      {/* Schema properties (if expanded and not ignored) */}
      {showSchema &&
        isExpanded &&
        !isEffectivelyIgnored &&
        requestBody.properties &&
        requestBody.properties.length > 0 && (
          <div
            className="px-4 py-3 space-y-2 border-t border-gray-200 dark:border-gray-700"
            data-testid="schema-properties"
          >
            {requestBody.properties.map(property => (
              <div
                key={property.name}
                className="flex items-center gap-2 text-sm"
                data-testid="schema-property"
              >
                <svg
                  className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {property.name}
                  {property.required && (
                    <span className="text-red-500 ml-1" aria-label="required">
                      *
                    </span>
                  )}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                  {property.type}
                </span>
                {property.description && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {property.description}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

/**
 * Get "No Input Form" badge component for use in OperationNode
 * 
 * This can be used by parent components to display a badge when request body is ignored.
 * 
 * Requirements: 12.1
 */
export function NoInputFormBadge() {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200"
      data-testid="no-input-form-badge"
      title="Request body is ignored - no input form will be generated"
    >
      No Input Form
    </span>
  );
}

// --- Helper Functions ---

/**
 * Check if a referenced schema is ignored
 * 
 * Requirements: 12.3
 */
function checkReferencedSchemaIgnored(
  schemaRef: string | undefined,
  annotations: Map<string, boolean>,
  calculator: IgnoreStateCalculator
): { isIgnored: boolean; schemaPath?: string } {
  if (!schemaRef) {
    return { isIgnored: false };
  }

  // Convert $ref to path format
  // Example: "#/components/schemas/User" -> "components.schemas.User"
  const schemaPath = schemaRef
    .replace(/^#\//, '')
    .replace(/\//g, '.');

  // Calculate ignore state for the referenced schema
  const schemaIgnoreState = calculator.calculateState(
    schemaPath,
    'schema',
    annotations
  );

  return {
    isIgnored: schemaIgnoreState.effective,
    schemaPath: schemaIgnoreState.effective ? schemaPath : undefined
  };
}

/**
 * Extract schema name from $ref
 * 
 * Examples:
 * - "#/components/schemas/User" -> "User"
 * - "#/definitions/Pet" -> "Pet"
 */
function getSchemaNameFromRef(ref: string): string {
  const parts = ref.split('/');
  return parts[parts.length - 1] || ref;
}
