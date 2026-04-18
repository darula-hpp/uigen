import { useState } from 'react';
import { useAppContext } from '../../../contexts/AppContext.js';
import { IgnoreToggle } from '../IgnoreControls/IgnoreToggle.js';
import { IgnoreTooltip } from '../IgnoreControls/IgnoreTooltip.js';
import { IgnoreStateCalculator } from '../../../types/index.js';
import { buildAnnotationsMap, buildUpdatedAnnotations } from './shared-utils.js';

/**
 * ParameterNode Component
 * 
 * Renders OpenAPI/Swagger parameters with ignore support and type grouping.
 * 
 * @example
 * ```tsx
 * const parameters: ParameterInfo[] = [
 *   {
 *     name: 'limit',
 *     type: 'query',
 *     dataType: 'integer',
 *     location: 'operation-level',
 *     path: 'paths./users.get.parameters.query.limit',
 *     required: false
 *   },
 *   {
 *     name: 'userId',
 *     type: 'path',
 *     dataType: 'string',
 *     location: 'path-level',
 *     path: 'paths./users/{userId}.parameters.path.userId',
 *     required: true
 *   }
 * ];
 * 
 * <ParameterNode 
 *   parameters={parameters}
 *   groupByType={true}
 *   showLocation={true}
 * />
 * ```
 * 
 * Requirements: 1.3, 11.1, 11.2, 11.3, 11.4, 11.5
 */

/**
 * Parameter type for grouping
 */
export type ParameterType = 'query' | 'path' | 'header' | 'cookie';

/**
 * Parameter location (path-level or operation-level)
 */
export type ParameterLocation = 'path-level' | 'operation-level';

/**
 * Individual parameter information
 */
export interface ParameterInfo {
  /** Parameter name (e.g., "limit", "userId") */
  name: string;
  /** Parameter type (query, path, header, cookie) */
  type: ParameterType;
  /** Data type (string, integer, boolean, etc.) */
  dataType: string;
  /** Location where parameter is defined */
  location: ParameterLocation;
  /** Full path to the parameter (e.g., "paths./users.get.parameters.query.limit") */
  path: string;
  /** Whether the parameter is required */
  required?: boolean;
  /** Description of the parameter */
  description?: string;
}

/**
 * Props for ParameterNode component
 *
 * Requirements: 1.3, 11.1, 11.2, 11.3, 11.4, 11.5
 */
export interface ParameterNodeProps {
  /** Array of parameters to display */
  parameters: ParameterInfo[];
  /** Whether to group parameters by type (default: true) */
  groupByType?: boolean;
  /** Whether to show the location badge (default: true) */
  showLocation?: boolean;
}

/**
 * ParameterNode renders parameters with ignore support and type grouping.
 *
 * Features:
 * - Display parameter name, type (query/path/header/cookie), and data type
 * - Show location badge: "path-level" or "operation-level"
 * - IgnoreToggle integration with proper state calculation
 * - Visual dimming (opacity-50) when ignored
 * - Group parameters by type with collapsible sections
 * - Handle inheritance from path-level to operation-level
 * - Support overrides at operation level
 * - Integration with IgnoreTooltip
 *
 * Requirements: 1.3, 11.1, 11.2, 11.3, 11.4, 11.5
 */
export function ParameterNode({
  parameters,
  groupByType = true,
  showLocation = true
}: ParameterNodeProps) {
  const { state, actions } = useAppContext();
  const [expandedGroups, setExpandedGroups] = useState<Set<ParameterType>>(
    new Set(['query', 'path', 'header', 'cookie'])
  );

  // Build annotations map
  const annotations = buildAnnotationsMap(state.config);
  const calculator = new IgnoreStateCalculator();

  // Group parameters by type if enabled
  const groupedParameters = groupByType
    ? groupParametersByType(parameters)
    : { all: parameters };

  // Toggle group expansion
  const toggleGroup = (type: ParameterType) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  // Handle ignore change for a parameter
  const handleIgnoreChange = (parameter: ParameterInfo, value: boolean) => {
    if (value === true) {
      const updated = buildUpdatedAnnotations(
        state.config,
        parameter.path,
        'x-uigen-ignore',
        true
      );
      actions.saveConfig(updated);
    } else {
      // Check if this is an override scenario
      const isPruned = calculator.isPruned(parameter.path, annotations);
      const newValue = isPruned ? false : undefined;
      const updated = buildUpdatedAnnotations(
        state.config,
        parameter.path,
        'x-uigen-ignore',
        newValue
      );
      actions.saveConfig(updated);
    }
  };

  // Render a single parameter
  const renderParameter = (parameter: ParameterInfo) => {
    const ignoreState = calculator.calculateState(
      parameter.path,
      'parameter',
      annotations
    );
    const isPruned = calculator.isPruned(parameter.path, annotations);
    const isDisabled = isPruned && !ignoreState.isOverride;
    const isEffectivelyIgnored = ignoreState.effective;

    return (
      <div
        key={parameter.path}
        data-testid="parameter-item"
        data-parameter-path={parameter.path}
      >
        <IgnoreTooltip
          ignoreState={ignoreState}
          elementName={parameter.name}
          isToggleSwitch={false}
        >
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
              isEffectivelyIgnored ? 'opacity-50' : ''
            }`}
            data-testid="parameter-row"
          >
            {/* Parameter icon */}
            <svg
              className="w-4 h-4 text-indigo-500 dark:text-indigo-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>

            {/* Parameter name */}
            <span className="text-sm font-medium text-gray-900 dark:text-white flex-shrink-0">
              {parameter.name}
              {parameter.required && (
                <span className="text-red-500 ml-1" aria-label="required">
                  *
                </span>
              )}
            </span>

            {/* Parameter type badge (query/path/header/cookie) */}
            <span
              className={`text-xs px-2 py-0.5 rounded font-mono flex-shrink-0 ${getParameterTypeBadgeClass(
                parameter.type
              )}`}
              data-testid="parameter-type-badge"
            >
              {parameter.type}
            </span>

            {/* Data type */}
            <span className="text-xs text-gray-400 dark:text-gray-500 font-mono flex-shrink-0">
              {parameter.dataType}
            </span>

            {/* Location badge */}
            {showLocation && (
              <span
                className={`text-xs px-2 py-0.5 rounded font-medium flex-shrink-0 ${getLocationBadgeClass(
                  parameter.location
                )}`}
                data-testid="location-badge"
              >
                {parameter.location}
              </span>
            )}

            {/* Ignore toggle */}
            <div className="ml-auto flex-shrink-0">
              <IgnoreToggle
                elementPath={parameter.path}
                elementType="parameter"
                ignoreState={ignoreState}
                disabled={isDisabled}
                onChange={value => handleIgnoreChange(parameter, value)}
              />
            </div>
          </div>
        </IgnoreTooltip>
      </div>
    );
  };

  // Render grouped parameters
  if (groupByType && Object.keys(groupedParameters).length > 1) {
    return (
      <div data-testid="parameter-node-grouped">
        {(Object.entries(groupedParameters) as [ParameterType, ParameterInfo[]][]).map(
          ([type, params]) => {
            if (params.length === 0) return null;

            const isExpanded = expandedGroups.has(type);
            const groupLabel = getParameterTypeLabel(type);

            return (
              <div key={type} className="mb-2" data-testid={`parameter-group-${type}`}>
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(type)}
                  className="flex items-center gap-2 px-3 py-2 w-full text-left rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label={
                    isExpanded
                      ? `Collapse ${groupLabel}`
                      : `Expand ${groupLabel}`
                  }
                  data-testid={`parameter-group-${type}-header`}
                >
                  {/* Expand/collapse icon */}
                  <svg
                    className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0"
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

                  {/* Group label */}
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {groupLabel}
                  </span>

                  {/* Count badge */}
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                    {params.length}
                  </span>
                </button>

                {/* Group parameters */}
                {isExpanded && (
                  <div className="ml-4 mt-1 space-y-1" data-testid="parameter-group-items">
                    {params.map(param => renderParameter(param))}
                  </div>
                )}
              </div>
            );
          }
        )}
      </div>
    );
  }

  // Render ungrouped parameters
  return (
    <div data-testid="parameter-node-ungrouped" className="space-y-1">
      {parameters.map(param => renderParameter(param))}
    </div>
  );
}

// --- Helper Functions ---

/**
 * Group parameters by type
 */
function groupParametersByType(
  parameters: ParameterInfo[]
): Record<ParameterType, ParameterInfo[]> {
  const groups: Record<ParameterType, ParameterInfo[]> = {
    query: [],
    path: [],
    header: [],
    cookie: []
  };

  for (const param of parameters) {
    groups[param.type].push(param);
  }

  return groups;
}

/**
 * Get CSS class for parameter type badge
 */
function getParameterTypeBadgeClass(type: ParameterType): string {
  switch (type) {
    case 'query':
      return 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300';
    case 'path':
      return 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300';
    case 'header':
      return 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300';
    case 'cookie':
      return 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300';
    default:
      return 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300';
  }
}

/**
 * Get CSS class for location badge
 */
function getLocationBadgeClass(location: ParameterLocation): string {
  switch (location) {
    case 'path-level':
      return 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300';
    case 'operation-level':
      return 'bg-teal-100 dark:bg-teal-900 text-teal-700 dark:teal-green-300';
    default:
      return 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300';
  }
}

/**
 * Get human-readable label for parameter type
 */
function getParameterTypeLabel(type: ParameterType): string {
  switch (type) {
    case 'query':
      return 'Query Parameters';
    case 'path':
      return 'Path Parameters';
    case 'header':
      return 'Header Parameters';
    case 'cookie':
      return 'Cookie Parameters';
    default:
      return 'Parameters';
  }
}
