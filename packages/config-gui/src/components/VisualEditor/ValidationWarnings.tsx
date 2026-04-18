/**
 * ValidationWarnings Component
 * 
 * Displays validation warnings and errors for ignore configurations:
 * - All operations ignored in a resource
 * - All properties ignored in a schema
 * - Circular references in schema $ref chains
 * 
 * Provides actionable navigation to fix issues.
 * 
 * Requirements: 20.1, 20.2, 20.3, 20.5
 */

import { AlertTriangle, XCircle, ChevronRight } from 'lucide-react';
import type { ValidationWarning } from '../../lib/validation-engine.js';

export interface ValidationWarningsProps {
  warnings: ValidationWarning[];
  onNavigate: (path: string) => void;
}

export function ValidationWarnings({ warnings, onNavigate }: ValidationWarningsProps) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 bg-yellow-50 dark:bg-yellow-900/20">
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
          <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
          <span>Configuration Warnings ({warnings.length})</span>
        </div>

        <div className="space-y-2">
          {warnings.map((warning, index) => (
            <ValidationWarningItem
              key={`${warning.path}-${index}`}
              warning={warning}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface ValidationWarningItemProps {
  warning: ValidationWarning;
  onNavigate: (path: string) => void;
}

function ValidationWarningItem({ warning, onNavigate }: ValidationWarningItemProps) {
  const Icon = warning.severity === 'error' ? XCircle : AlertTriangle;
  const colorClass = warning.severity === 'error'
    ? 'text-red-600 dark:text-red-400'
    : 'text-yellow-600 dark:text-yellow-400';

  return (
    <div
      className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
      data-testid={`validation-warning-${warning.type}`}
    >
      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${colorClass}`} />

      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 dark:text-white">
          {warning.message}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {warning.elementName}
        </p>
      </div>

      <button
        onClick={() => onNavigate(warning.path)}
        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
        data-testid={`validation-action-${warning.type}`}
      >
        {warning.actionLabel}
        <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
}
