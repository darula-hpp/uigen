import React from 'react';
import { ExternalLink, FileText, ArrowRight, AlertCircle } from 'lucide-react';

/**
 * ReferencesPanel Component
 * 
 * Displays all operations and properties that reference a selected schema object.
 * Shows the impact of ignoring a schema by listing affected elements.
 * 
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
 */

export interface SchemaReference {
  type: 'requestBody' | 'response' | 'property';
  path: string;
  displayName: string;
  statusCode?: string; // For responses
  method?: string; // For operations
  isIgnored: boolean;
}

export interface ReferencesPanelProps {
  selectedSchema: {
    path: string;
    name: string;
  } | null;
  references: SchemaReference[];
  onNavigate?: (path: string) => void;
}

export function ReferencesPanel({
  selectedSchema,
  references,
  onNavigate
}: ReferencesPanelProps) {
  if (!selectedSchema) {
    return (
      <div
        data-testid="references-panel-empty"
        className="p-4 text-sm text-gray-500 dark:text-gray-400"
      >
        Select a schema to view its references
      </div>
    );
  }

  const requestBodyRefs = references.filter(ref => ref.type === 'requestBody');
  const responseRefs = references.filter(ref => ref.type === 'response');
  const propertyRefs = references.filter(ref => ref.type === 'property');

  const totalOperations = requestBodyRefs.length + responseRefs.length;
  const totalProperties = propertyRefs.length;

  const hasReferences = references.length > 0;

  return (
    <div
      data-testid="references-panel"
      className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
    >
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Schema References
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          {selectedSchema.name}
        </p>
      </div>

      {/* Impact Summary */}
      <div
        data-testid="impact-summary"
        className={`
          flex items-center gap-2 p-3 rounded-md border mb-4
          ${
            hasReferences
              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
              : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700'
          }
        `}
      >
        {hasReferences ? (
          <>
            <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <span className="text-sm text-blue-800 dark:text-blue-200">
              <span data-testid="operations-count" className="font-semibold">
                {totalOperations}
              </span>{' '}
              {totalOperations === 1 ? 'operation' : 'operations'} and{' '}
              <span data-testid="properties-count" className="font-semibold">
                {totalProperties}
              </span>{' '}
              {totalProperties === 1 ? 'property' : 'properties'} will be affected
            </span>
          </>
        ) : (
          <>
            <FileText className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              No references found
            </span>
          </>
        )}
      </div>

      {hasReferences && (
        <div className="space-y-4">
          {/* Request Body References */}
          {requestBodyRefs.length > 0 && (
            <ReferenceSection
              title="Request Bodies"
              icon={<ArrowRight className="w-4 h-4" />}
              references={requestBodyRefs}
              onNavigate={onNavigate}
            />
          )}

          {/* Response References */}
          {responseRefs.length > 0 && (
            <ReferenceSection
              title="Responses"
              icon={<ArrowRight className="w-4 h-4" />}
              references={responseRefs}
              onNavigate={onNavigate}
            />
          )}

          {/* Property References */}
          {propertyRefs.length > 0 && (
            <ReferenceSection
              title="Properties"
              icon={<ExternalLink className="w-4 h-4" />}
              references={propertyRefs}
              onNavigate={onNavigate}
            />
          )}
        </div>
      )}
    </div>
  );
}

interface ReferenceSectionProps {
  title: string;
  icon: React.ReactNode;
  references: SchemaReference[];
  onNavigate?: (path: string) => void;
}

function ReferenceSection({
  title,
  icon,
  references,
  onNavigate
}: ReferenceSectionProps) {
  return (
    <div data-testid={`reference-section-${title.toLowerCase().replace(' ', '-')}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className="text-gray-600 dark:text-gray-400">{icon}</div>
        <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          {title}
        </h4>
        <span
          data-testid={`${title.toLowerCase().replace(' ', '-')}-count`}
          className="text-xs text-gray-500 dark:text-gray-400"
        >
          ({references.length})
        </span>
      </div>

      <div className="space-y-1">
        {references.map((ref, index) => (
          <ReferenceItem
            key={`${ref.path}-${index}`}
            reference={ref}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}

interface ReferenceItemProps {
  reference: SchemaReference;
  onNavigate?: (path: string) => void;
}

function ReferenceItem({ reference, onNavigate }: ReferenceItemProps) {
  const handleClick = () => {
    if (onNavigate) {
      onNavigate(reference.path);
    }
  };

  return (
    <div
      data-testid="reference-item"
      data-reference-path={reference.path}
      data-reference-type={reference.type}
      className={`
        flex items-center justify-between p-2 rounded border transition-all
        ${
          reference.isIgnored
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 opacity-60'
            : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700'
        }
        ${onNavigate ? 'cursor-pointer hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700' : ''}
      `}
      onClick={handleClick}
      role={onNavigate ? 'button' : undefined}
      tabIndex={onNavigate ? 0 : undefined}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onNavigate) {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`
              text-sm font-medium truncate
              ${
                reference.isIgnored
                  ? 'text-red-700 dark:text-red-300'
                  : 'text-gray-900 dark:text-gray-100'
              }
            `}
            data-testid="reference-name"
          >
            {reference.displayName}
          </span>

          {reference.method && (
            <span
              data-testid="reference-method"
              className={`
                text-xs px-1.5 py-0.5 rounded font-semibold uppercase
                ${getMethodColor(reference.method)}
              `}
            >
              {reference.method}
            </span>
          )}

          {reference.statusCode && (
            <span
              data-testid="reference-status-code"
              className={`
                text-xs px-1.5 py-0.5 rounded font-semibold
                ${getStatusCodeColor(reference.statusCode)}
              `}
            >
              {reference.statusCode}
            </span>
          )}
        </div>

        <div
          className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5"
          data-testid="reference-path"
        >
          {reference.path}
        </div>
      </div>

      {onNavigate && (
        <ExternalLink
          className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 ml-2"
          data-testid="navigate-icon"
        />
      )}

      {reference.isIgnored && (
        <div
          data-testid="ignored-indicator"
          className="absolute left-0 top-0 bottom-0 w-1 bg-red-600 dark:bg-red-500 rounded-l"
          aria-label="Reference is ignored"
        />
      )}
    </div>
  );
}

function getMethodColor(method: string): string {
  const colors: Record<string, string> = {
    GET: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    POST: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    PUT: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    PATCH: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
  };

  return colors[method.toUpperCase()] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
}

function getStatusCodeColor(statusCode: string): string {
  const code = parseInt(statusCode, 10);

  if (code >= 200 && code < 300) {
    return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
  } else if (code >= 300 && code < 400) {
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
  } else if (code >= 400 && code < 500) {
    return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
  } else if (code >= 500) {
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
  }

  return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
}
