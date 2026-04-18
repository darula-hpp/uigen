import type { OperationNode } from '../../../types/index.js';
import type { ConfigFile } from '@uigen-dev/core';
import { useAppContext } from '../../../contexts/AppContext.js';
import { AnnotationEditor } from '../AnnotationEditor.js';

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

  // Get current annotations for this operation
  const currentAnnotations = (state.config?.annotations?.[operationPath] as Record<string, unknown>) || {};
  
  // Check if element is ignored
  const isIgnored = Boolean(currentAnnotations['x-uigen-ignore']);

  const elementName = `${operation.method} ${operation.path}`;

  // --- Handlers ---

  function handleAnnotationsChange(newAnnotations: Record<string, unknown>) {
    const updated: ConfigFile = {
      ...state.config!,
      annotations: {
        ...state.config!.annotations,
        [operationPath]: newAnnotations
      }
    };
    
    // Remove empty annotation objects
    if (Object.keys(newAnnotations).length === 0) {
      delete updated.annotations[operationPath];
    }
    
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
      className={`flex items-center gap-2 px-3 py-2 rounded transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${isIgnored ? 'opacity-50' : ''}`}
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

      {/* Annotation editor */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <AnnotationEditor
          elementPath={operationPath}
          elementType="operation"
          currentAnnotations={currentAnnotations}
          onAnnotationsChange={handleAnnotationsChange}
        />
      </div>
    </div>
  );
}
