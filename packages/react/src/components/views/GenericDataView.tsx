import React from 'react';

interface GenericDataViewProps {
  data: Record<string, any>;
  showWarning?: boolean;
}

/**
 * GenericDataView component that displays data as a key-value table
 * Used when response schema is missing
 * Implements Requirement 25.1, 25.2: Graceful degradation for missing schemas
 */
export function GenericDataView({ data, showWarning = true }: GenericDataViewProps) {
  const entries = Object.entries(data);

  return (
    <div className="space-y-4">
      {/* Warning banner (Requirement 25.2) */}
      {showWarning && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <svg
            className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-yellow-800">Schema Missing</h4>
            <p className="text-sm text-yellow-700 mt-1">
              The response schema is not defined in the API specification. Displaying raw data.
            </p>
          </div>
        </div>
      )}

      {/* Generic key-value table (Requirement 25.1) */}
      <div className="border rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-1/3">
                Field
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Value
              </th>
            </tr>
          </thead>
          <tbody className="bg-background divide-y divide-border">
            {entries.map(([key, value]) => (
              <tr key={key}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {key}
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {formatValue(value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Format a value for display in the generic table
 */
function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  return String(value);
}

interface MissingSchemaMessageProps {
  operationType: 'create' | 'edit' | 'parameter';
}

/**
 * MissingSchemaMessage component that displays a message when schema is missing
 * Implements Requirement 25.3, 25.4, 25.5
 */
export function MissingSchemaMessage({ operationType }: MissingSchemaMessageProps) {
  const messages = {
    create: {
      title: 'Cannot Create Resource',
      description: 'The request body schema is not defined in the API specification. This operation cannot be performed.',
    },
    edit: {
      title: 'Cannot Edit Resource',
      description: 'The request body schema is not defined in the API specification. This operation cannot be performed.',
    },
    parameter: {
      title: 'Schema Information Missing',
      description: 'Parameter schema is not defined. Using text input with no validation.',
    },
  };

  const message = messages[operationType];

  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <div className="max-w-md w-full bg-muted/50 border rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg
              className="h-6 w-6 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">{message.title}</h3>
            <p className="text-sm text-muted-foreground">{message.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
