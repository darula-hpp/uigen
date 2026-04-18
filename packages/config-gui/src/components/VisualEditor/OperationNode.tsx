import { useEffect, useRef, memo, useCallback } from 'react';
import type { OperationNode as OperationNodeType } from '../../types/index.js';
import type { ConfigFile } from '@uigen-dev/core';
import { useAppContext } from '../../contexts/AppContext.js';
import { useKeyboardNavigation } from '../../contexts/KeyboardNavigationContext.js';
import { NoInputFormBadge } from './ElementTree/RequestBodyNode.js';
import { NoOutputBadge } from './ElementTree/ResponseNode.js';
import { buildAnnotationsMap } from './ElementTree/shared-utils.js';
import { IgnoreStateCalculator } from '../../lib/ignore-state-calculator.js';

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
 * - "No Input Form" badge when request body is ignored
 * - "No Output" badge when all responses are ignored
 * - Keyboard navigation support with focus indicator
 * - ARIA labels for accessibility
 * - Memoized to prevent unnecessary re-renders (Requirements: 23.1, 23.4)
 *
 * Annotation changes are saved immediately to the config file via AppContext.
 *
 * Requirements: 1.6, 6.7, 6.9, 12.1, 13.1, 21.2, 21.4, 22.1, 23.1, 23.4
 *
 * Usage:
 * ```tsx
 * <OperationNode operation={operation} />
 * ```
 */
export const OperationNode = memo(function OperationNode({ operation }: OperationNodeProps) {
  const { state, actions } = useAppContext();
  const { state: navState } = useKeyboardNavigation();
  const nodeRef = useRef<HTMLDivElement>(null);

  const operationPath = `${operation.method}:${operation.path}`;
  const currentAnnotations = getOperationAnnotations(state.config, operationPath);
  const isLoginOperation = Boolean(currentAnnotations['x-uigen-login']);

  // Check if this operation is focused
  // Requirements: 21.2, 21.4
  const isFocused = navState.focusedPath === operationPath;

  // Scroll into view when focused
  useEffect(() => {
    if (isFocused && nodeRef.current) {
      nodeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isFocused]);

  // Build annotations map for ignore state calculation
  const annotations = buildAnnotationsMap(state.config);
  const calculator = new IgnoreStateCalculator();

  // Check if request body is ignored
  // Path format: paths./auth/login.post.requestBody
  // Note: operation.path already starts with '/', so we get 'paths./auth/login.post.requestBody'
  const requestBodyPath = `paths.${operation.path}.${operation.method.toLowerCase()}.requestBody`;
  
  // Simple direct check: does the request body have an explicit ignore annotation?
  const requestBodyExplicitIgnore = annotations.get(requestBodyPath);
  
  // Also check if the operation itself is ignored (using operation format: POST:/auth/login)
  // The calculator doesn't know about the operation format, so we need to check it separately
  const operationIgnored = Boolean(
    (getOperationAnnotations(state.config, operationPath)['x-uigen-ignore'])
  );
  
  // Request body is ignored if:
  // 1. It has an explicit ignore annotation (true), OR
  // 2. The operation is ignored AND the request body doesn't have an explicit override (false)
  const isRequestBodyIgnored = requestBodyExplicitIgnore === true || 
    (operationIgnored && requestBodyExplicitIgnore !== false);

  // Check if all responses are ignored
  // We need to check common response status codes
  const commonStatusCodes = ['200', '201', '204', '400', '401', '403', '404', '500'];
  const responsePaths = commonStatusCodes.map(
    code => `paths.${operation.path}.${operation.method.toLowerCase()}.responses.${code}`
  );
  
  // Check if at least one response exists and all existing responses are ignored
  const responseStates = responsePaths.map(path => ({
    path,
    state: calculator.calculateState(path, 'response', annotations)
  }));
  
  // A response "exists" if it has an explicit annotation
  // If any response has an annotation, check if all annotated responses are ignored
  const annotatedResponses = responseStates.filter(({ path }) => annotations.has(path));
  
  // All responses are ignored if:
  // 1. There are annotated responses and all of them are ignored, OR
  // 2. The operation is ignored and there are no explicit response annotations (all responses inherit the ignore state)
  const hasAnyNonIgnoredResponse = annotatedResponses.some(({ state }) => !state.effective);
  const allResponsesIgnored = (annotatedResponses.length > 0 && !hasAnyNonIgnoredResponse) || 
    (operationIgnored && annotatedResponses.length === 0);

  // --- Handlers ---

  const handleLoginToggle = useCallback(() => {
    const newValue = !isLoginOperation ? true : undefined;
    const updated = buildUpdatedAnnotations(state.config, operationPath, 'x-uigen-login', newValue);
    actions.saveConfig(updated);
  }, [isLoginOperation, state.config, operationPath, actions]);

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
      ref={nodeRef}
      className={`flex items-center gap-2 px-3 py-2 rounded transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${
        isFocused ? 'ring-2 ring-blue-500 ring-inset bg-blue-50 dark:bg-blue-900/20' : ''
      }`}
      data-operation-path={operationPath}
      data-testid="operation-node"
      role="group"
      aria-label={`Operation: ${operation.method} ${operation.path}${operation.summary ? ` - ${operation.summary}` : ''}`}
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
        {/* "No Input Form" badge (if request body is ignored) */}
        {isRequestBodyIgnored && <NoInputFormBadge />}

        {/* "No Output" badge (if all responses are ignored) */}
        {allResponsesIgnored && <NoOutputBadge />}

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
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  // Only re-render if operation path, method, or annotations change
  // Requirements: 23.1, 23.4
  return (
    prevProps.operation.id === nextProps.operation.id &&
    prevProps.operation.method === nextProps.operation.method &&
    prevProps.operation.path === nextProps.operation.path &&
    prevProps.operation.summary === nextProps.operation.summary &&
    JSON.stringify(prevProps.operation.annotations) === JSON.stringify(nextProps.operation.annotations)
  );
});

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
