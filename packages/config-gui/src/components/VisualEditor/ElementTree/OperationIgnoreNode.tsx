import type { OperationNode } from '../../../types/index.js';
import type { ConfigFile } from '@uigen-dev/core';
import { useAppContext } from '../../../contexts/AppContext.js';
import { IgnoreToggle } from '../IgnoreControls/IgnoreToggle.js';
import { IgnoreTooltip } from '../IgnoreControls/IgnoreTooltip.js';
import { IgnoreStateCalculator } from '../../../types/index.js';
import { buildAnnotationsMap, buildUpdatedAnnotations } from './shared-utils.js';

/**
 * Props for OperationIgnoreNode component
 *
 * Requirements: 1.6, 2.1, 2.2, 12.1, 13.1
 */
export interface OperationIgnoreNodeProps {
  operation: OperationNode;
}

/**
 * OperationIgnoreNode extends the operation display with x-uigen-ignore support.
 *
 * This is a NEW component separate from OperationNode (which handles x-uigen-login).
 * It adds ignore toggle and visual indicators for ignored request/response.
 *
 * Features:
 * - Method badge, path, summary (same as OperationNode)
 * - IgnoreToggle for x-uigen-ignore on the operation
 * - "No Input Form" badge when request body is ignored
 * - "No Output" badge when all responses are ignored
 * - Visual dimming when operation is ignored
 *
 * Requirements: 1.6, 2.1, 2.2, 12.1, 13.1
 */
export function OperationIgnoreNode({ operation }: OperationIgnoreNodeProps) {
  const { state, actions } = useAppContext();

  const operationPath = `${operation.method}:${operation.path}`;

  // Build annotations map and compute ignore state
  const annotations = buildAnnotationsMap(state.config);
  const calculator = new IgnoreStateCalculator();
  const ignoreState = calculator.calculateState(operationPath, 'operation', annotations);

  const isEffectivelyIgnored = ignoreState.effective;

  // Check for "No Input Form" badge: request body is ignored
  const requestBodyPath = `${operationPath}.requestBody`;
  const requestBodyAnnotations = getAnnotationRecord(state.config, requestBodyPath);
  const isRequestBodyIgnored = requestBodyAnnotations['x-uigen-ignore'] === true;

  // Check for "No Output" badge: all responses are ignored (placeholder check)
  const responsesPath = `${operationPath}.responses`;
  const responsesAnnotations = getAnnotationRecord(state.config, responsesPath);
  const areAllResponsesIgnored = responsesAnnotations['x-uigen-ignore'] === true;

  // --- Handlers ---

  function handleIgnoreChange(value: boolean) {
    const newValue = value === true ? true : undefined;
    const updated = buildUpdatedAnnotations(state.config, operationPath, 'x-uigen-ignore', newValue);
    actions.saveConfig(updated);
  }

  // --- Method color mapping ---
  const methodColors: Record<string, string> = {
    GET: 'bg-green-100 text-green-800',
    POST: 'bg-blue-100 text-blue-800',
    PUT: 'bg-yellow-100 text-yellow-800',
    PATCH: 'bg-orange-100 text-orange-800',
    DELETE: 'bg-red-100 text-red-800'
  };

  const methodColor = methodColors[operation.method] || 'bg-gray-100 text-gray-800';

  const elementName = `${operation.method} ${operation.path}`;

  // --- Render ---

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${isEffectivelyIgnored ? 'opacity-50' : ''}`}
      data-operation-path={operationPath}
      data-testid="operation-ignore-node"
    >
      {/* HTTP Method badge */}
      <span className={`px-2 py-0.5 text-xs font-semibold rounded flex-shrink-0 ${methodColor}`}>
        {operation.method}
      </span>

      {/* Operation path */}
      <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 font-mono">
        {operation.path}
      </span>

      {/* Summary (if available) */}
      {operation.summary && (
        <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs flex-shrink-0">
          {operation.summary}
        </span>
      )}

      {/* Badges and controls */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* "No Input Form" badge when request body is ignored */}
        {isRequestBodyIgnored && (
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200"
            data-testid="no-input-form-badge"
          >
            No Input Form
          </span>
        )}

        {/* "No Output" badge when all responses are ignored */}
        {areAllResponsesIgnored && (
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
            data-testid="no-output-badge"
          >
            No Output
          </span>
        )}

        {/* x-uigen-ignore toggle */}
        <IgnoreTooltip
          ignoreState={ignoreState}
          elementName={elementName}
          isToggleSwitch={true}
        >
          <IgnoreToggle
            elementPath={operationPath}
            elementType="operation"
            ignoreState={ignoreState}
            disabled={false}
            onChange={handleIgnoreChange}
          />
        </IgnoreTooltip>
      </div>
    </div>
  );
}

// --- Helpers ---

/**
 * Get annotation record for a given path from config.
 */
function getAnnotationRecord(
  config: ConfigFile | null,
  path: string
): Record<string, unknown> {
  if (!config?.annotations) return {};
  return (config.annotations[path] as Record<string, unknown>) ?? {};
}
