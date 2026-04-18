import type { OperationNode as OperationNodeType } from '../../types/index.js';
import type { ConfigFile } from '@uigen-dev/core';
import { useAppContext } from '../../contexts/AppContext.js';

/**
 * Props for OperationNode component
 */
interface OperationNodeProps {
  operation: OperationNodeType;
}

/**
 * OperationNode component displays a single operation with annotation controls.
 *
 * Features:
 * - Displays operation method and path
 * - Toggle for x-uigen-login annotation
 * - Login badge for operations with x-uigen-login
 * - Method-specific color coding
 *
 * Annotation changes are saved immediately to the config file via AppContext.
 *
 * Requirements: 6.7, 6.9
 *
 * Usage:
 * ```tsx
 * <OperationNode operation={operation} />
 * ```
 */
export function OperationNode({ operation }: OperationNodeProps) {
  const { state, actions } = useAppContext();

  const operationPath = `${operation.method}:${operation.path}`;
  const currentAnnotations = getOperationAnnotations(state.config, operationPath);
  const isLoginOperation = Boolean(currentAnnotations['x-uigen-login']);

  // --- Handlers ---

  function handleLoginToggle() {
    const newValue = !isLoginOperation ? true : undefined;
    const updated = buildUpdatedAnnotations(state.config, operationPath, 'x-uigen-login', newValue);
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

  // --- Render ---

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
      data-operation-path={operationPath}
      data-testid="operation-node"
    >
      {/* HTTP Method badge */}
      <span className={`px-2 py-0.5 text-xs font-semibold rounded flex-shrink-0 ${methodColor}`}>
        {operation.method}
      </span>

      {/* Operation path */}
      <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 font-mono">{operation.path}</span>

      {/* Summary (if available) */}
      {operation.summary && (
        <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs flex-shrink-0">
          {operation.summary}
        </span>
      )}

      {/* Annotation controls */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* x-uigen-login badge (if active) */}
        {isLoginOperation && (
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200"
            data-testid="login-badge"
          >
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
              />
            </svg>
            login
          </span>
        )}

        {/* x-uigen-login toggle */}
        <button
          role="switch"
          aria-checked={isLoginOperation}
          onClick={handleLoginToggle}
          className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-400 dark:focus:ring-offset-gray-800 ${
            isLoginOperation ? 'bg-indigo-400 dark:bg-indigo-500' : 'bg-gray-200 dark:bg-gray-600'
          }`}
          title={isLoginOperation ? 'Remove x-uigen-login' : 'Mark as login operation'}
          aria-label={isLoginOperation ? 'Disable login annotation' : 'Enable login annotation'}
          data-testid="login-toggle"
        >
          <span
            className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
              isLoginOperation ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
        {isLoginOperation && (
          <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">login</span>
        )}
      </div>
    </div>
  );
}

// --- Helpers ---

/**
 * Get the current annotations for an operation from the config file.
 */
function getOperationAnnotations(
  config: ConfigFile | null,
  operationPath: string
): Record<string, unknown> {
  if (!config?.annotations) return {};
  return (config.annotations[operationPath] as Record<string, unknown>) ?? {};
}

/**
 * Build an updated ConfigFile with a single annotation value changed for an operation.
 * Passing `undefined` as value removes the annotation key.
 */
function buildUpdatedAnnotations(
  config: ConfigFile | null,
  operationPath: string,
  annotationName: string,
  value: unknown
): ConfigFile {
  const base: ConfigFile = config ?? {
    version: '1.0',
    enabled: {},
    defaults: {},
    annotations: {}
  };

  const existingOperationAnnotations: Record<string, unknown> = {
    ...((base.annotations[operationPath] as Record<string, unknown>) ?? {})
  };

  if (value === undefined) {
    delete existingOperationAnnotations[annotationName];
  } else {
    existingOperationAnnotations[annotationName] = value;
  }

  const updatedAnnotations = { ...base.annotations };
  if (Object.keys(existingOperationAnnotations).length === 0) {
    delete updatedAnnotations[operationPath];
  } else {
    updatedAnnotations[operationPath] = existingOperationAnnotations;
  }

  return {
    ...base,
    annotations: updatedAnnotations
  };
}
