import { useState } from 'react';
import { useAppContext } from '../../../contexts/AppContext.js';
import { IgnoreToggle } from '../IgnoreControls/IgnoreToggle.js';
import { IgnoreTooltip } from '../IgnoreControls/IgnoreTooltip.js';
import { IgnoreStateCalculator } from '../../../types/index.js';
import { buildAnnotationsMap, buildUpdatedAnnotations } from './shared-utils.js';

/**
 * ResponseNode Component
 * 
 * Renders OpenAPI/Swagger responses with ignore support and visual indicators.
 * 
 * @example
 * ```tsx
 * const response: ResponseInfo = {
 *   path: 'paths./users.get.responses.200',
 *   statusCode: '200',
 *   description: 'Successful response',
 *   contentType: 'application/json',
 *   schemaRef: '#/components/schemas/User'
 * };
 * 
 * <ResponseNode 
 *   response={response}
 *   showSchema={true}
 * />
 * ```
 * 
 * Requirements: 1.5, 13.1, 13.2, 13.3, 13.4, 13.5
 */

/**
 * Response information
 */
export interface ResponseInfo {
  /** Full path to the response (e.g., "paths./users.get.responses.200") */
  path: string;
  /** HTTP status code (e.g., "200", "404", "500") */
  statusCode: string;
  /** Response description */
  description?: string;
  /** Content type (e.g., "application/json", "application/xml") */
  contentType?: string;
  /** Schema reference if using $ref (e.g., "#/components/schemas/User") */
  schemaRef?: string;
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
 * Props for ResponseNode component
 *
 * Requirements: 1.5, 13.1, 13.2, 13.3, 13.4, 13.5
 */
export interface ResponseNodeProps {
  /** Response information to display */
  response: ResponseInfo;
  /** Whether to show schema properties (default: true) */
  showSchema?: boolean;
}

/**
 * ResponseNode renders responses with ignore support and visual indicators.
 *
 * Features:
 * - Display response status code (e.g., "200", "404", "500")
 * - Show status code description (e.g., "OK", "Not Found", "Internal Server Error")
 * - Display content type (e.g., "application/json")
 * - Show schema reference if using $ref
 * - IgnoreToggle integration with proper state calculation for each response
 * - Visual dimming (opacity-50) when ignored
 * - Expand/collapse for schema properties
 * - "No Output" badge indicator (can be used by parent OperationNode)
 * - Integration with IgnoreTooltip
 * - Handle multiple responses with different status codes
 *
 * Requirements: 1.5, 13.1, 13.2, 13.3, 13.4, 13.5
 */
export function ResponseNode({
  response,
  showSchema = true
}: ResponseNodeProps) {
  const { state, actions } = useAppContext();
  const [isExpanded, setIsExpanded] = useState(true);

  // Build annotations map
  const annotations = buildAnnotationsMap(state.config);
  const calculator = new IgnoreStateCalculator();

  // Calculate ignore state for response
  const ignoreState = calculator.calculateState(
    response.path,
    'response',
    annotations
  );
  const isPruned = calculator.isPruned(response.path, annotations);
  const isDisabled = isPruned && !ignoreState.isOverride;
  const isEffectivelyIgnored = ignoreState.effective;

  // Check if referenced schema is ignored
  const referencedSchemaIgnored = checkReferencedSchemaIgnored(
    response.schemaRef,
    annotations,
    calculator
  );

  // Handle ignore change for response
  const handleIgnoreChange = (value: boolean) => {
    if (value === true) {
      const updated = buildUpdatedAnnotations(
        state.config,
        response.path,
        'x-uigen-ignore',
        true
      );
      actions.saveConfig(updated);
    } else {
      // Check if this is an override scenario
      const isPruned = calculator.isPruned(response.path, annotations);
      const newValue = isPruned ? false : undefined;
      const updated = buildUpdatedAnnotations(
        state.config,
        response.path,
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
  const schemaName = response.schemaRef
    ? getSchemaNameFromRef(response.schemaRef)
    : undefined;

  // Get status code description
  const statusDescription = getStatusCodeDescription(response.statusCode);

  // Get status code color
  const statusColor = getStatusCodeColor(response.statusCode);

  return (
    <div
      data-testid="response-node"
      data-response-path={response.path}
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
        elementName={`Response ${response.statusCode}`}
        isToggleSwitch={false}
      >
        <div
          className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-t-lg"
          data-testid="response-header"
        >
          {/* Response icon */}
          <svg
            className="w-5 h-5 text-green-500 dark:text-green-400 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>

          {/* Response label and status code */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                Response
              </span>

              {/* Status code badge */}
              <span
                className={`text-xs px-2 py-0.5 rounded font-mono ${statusColor}`}
                data-testid="status-code-badge"
                title={statusDescription}
              >
                {response.statusCode}
              </span>

              {/* Status description */}
              {statusDescription && (
                <span
                  className="text-xs text-gray-500 dark:text-gray-400"
                  data-testid="status-description"
                >
                  {statusDescription}
                </span>
              )}

              {/* Content type badge */}
              {response.contentType && (
                <span
                  className="text-xs px-2 py-0.5 rounded font-mono bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                  data-testid="content-type-badge"
                >
                  {response.contentType}
                </span>
              )}

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
            {response.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {response.description}
              </p>
            )}
          </div>

          {/* Expand/collapse button (only if has properties) */}
          {showSchema && response.properties && response.properties.length > 0 && (
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
              elementPath={response.path}
              elementType="response"
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
        response.properties &&
        response.properties.length > 0 && (
          <div
            className="px-4 py-3 space-y-2 border-t border-gray-200 dark:border-gray-700"
            data-testid="schema-properties"
          >
            {response.properties.map(property => (
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
 * Get "No Output" badge component for use in OperationNode
 * 
 * This can be used by parent components to display a badge when all responses are ignored.
 * 
 * Requirements: 13.1
 */
export function NoOutputBadge() {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200"
      data-testid="no-output-badge"
      title="All responses are ignored - no output view will be generated"
    >
      No Output
    </span>
  );
}

// --- Helper Functions ---

/**
 * Check if a referenced schema is ignored
 * 
 * Requirements: 13.3
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

/**
 * Get human-readable description for HTTP status code
 * 
 * Requirements: 13.1
 */
function getStatusCodeDescription(statusCode: string): string {
  const descriptions: Record<string, string> = {
    // 2xx Success
    '200': 'OK',
    '201': 'Created',
    '202': 'Accepted',
    '204': 'No Content',
    // 3xx Redirection
    '301': 'Moved Permanently',
    '302': 'Found',
    '304': 'Not Modified',
    // 4xx Client Errors
    '400': 'Bad Request',
    '401': 'Unauthorized',
    '403': 'Forbidden',
    '404': 'Not Found',
    '409': 'Conflict',
    '422': 'Unprocessable Entity',
    '429': 'Too Many Requests',
    // 5xx Server Errors
    '500': 'Internal Server Error',
    '502': 'Bad Gateway',
    '503': 'Service Unavailable',
    '504': 'Gateway Timeout'
  };

  return descriptions[statusCode] || '';
}

/**
 * Get color classes for HTTP status code badge
 * 
 * Requirements: 13.1
 */
function getStatusCodeColor(statusCode: string): string {
  const code = parseInt(statusCode, 10);

  if (code >= 200 && code < 300) {
    // Success - green
    return 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300';
  } else if (code >= 300 && code < 400) {
    // Redirection - blue
    return 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300';
  } else if (code >= 400 && code < 500) {
    // Client error - amber
    return 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300';
  } else if (code >= 500) {
    // Server error - red
    return 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300';
  }

  // Default - gray
  return 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300';
}
