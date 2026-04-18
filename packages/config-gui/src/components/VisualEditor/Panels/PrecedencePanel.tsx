import React from 'react';
import { ChevronRight, CheckCircle, XCircle, Circle } from 'lucide-react';

/**
 * PrecedencePanel Component
 * 
 * Displays the annotation hierarchy for a selected element, showing which
 * annotation level is active based on precedence rules.
 * 
 * Precedence order: property > schema > parameter > operation > path
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

export interface AnnotationLevel {
  level: 'property' | 'schema' | 'parameter' | 'operation' | 'path';
  path: string;
  annotation: boolean | undefined;
  isActive: boolean; // Whether this level determines the effective state
  displayName: string;
}

export interface ElementInfo {
  path: string;
  type: 'property' | 'schema' | 'parameter' | 'requestBody' | 'response' | 'operation' | 'path';
  name: string;
}

export interface PrecedencePanelProps {
  selectedElement: ElementInfo | null;
  annotationHierarchy: AnnotationLevel[];
  onNavigate?: (path: string) => void;
}

export function PrecedencePanel({
  selectedElement,
  annotationHierarchy,
  onNavigate
}: PrecedencePanelProps) {
  if (!selectedElement) {
    return (
      <div
        data-testid="precedence-panel-empty"
        className="p-4 text-sm text-gray-500 dark:text-gray-400"
      >
        Select an element to view its annotation precedence
      </div>
    );
  }

  const hasAnyAnnotations = annotationHierarchy.some(
    level => level.annotation !== undefined
  );

  return (
    <div
      data-testid="precedence-panel"
      className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
    >
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Annotation Precedence
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          {selectedElement.name}
        </p>
      </div>

      {!hasAnyAnnotations ? (
        <div
          data-testid="precedence-default-message"
          className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md"
        >
          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
          <span className="text-sm text-green-800 dark:text-green-200">
            Default: Included (no annotations)
          </span>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Precedence order (highest to lowest):
          </div>
          {annotationHierarchy.map((level, index) => (
            <PrecedenceLevelRow
              key={level.path}
              level={level}
              isFirst={index === 0}
              isLast={index === annotationHierarchy.length - 1}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface PrecedenceLevelRowProps {
  level: AnnotationLevel;
  isFirst: boolean;
  isLast: boolean;
  onNavigate?: (path: string) => void;
}

function PrecedenceLevelRow({
  level,
  isFirst,
  isLast,
  onNavigate
}: PrecedenceLevelRowProps) {
  const hasAnnotation = level.annotation !== undefined;
  const isIgnored = level.annotation === true;
  const isIncluded = level.annotation === false;

  const handleClick = () => {
    if (onNavigate && hasAnnotation) {
      onNavigate(level.path);
    }
  };

  return (
    <div
      data-testid="precedence-level-row"
      data-level={level.level}
      data-active={level.isActive}
      className={`
        flex items-center gap-3 p-3 rounded-md border transition-all
        ${
          level.isActive
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 shadow-sm'
            : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700'
        }
        ${hasAnnotation && onNavigate ? 'cursor-pointer hover:shadow-md' : ''}
      `}
      onClick={handleClick}
      role={hasAnnotation && onNavigate ? 'button' : undefined}
      tabIndex={hasAnnotation && onNavigate ? 0 : undefined}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && hasAnnotation && onNavigate) {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Level indicator */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div
          className={`
            flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold flex-shrink-0
            ${
              level.isActive
                ? 'bg-blue-600 dark:bg-blue-500 text-white'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
            }
          `}
        >
          {isFirst ? '1' : isLast ? String(5) : String(2 + (level.level === 'schema' ? 0 : level.level === 'parameter' ? 1 : 2))}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
            {level.displayName}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {level.path}
          </div>
        </div>
      </div>

      {/* Annotation value */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {hasAnnotation ? (
          <>
            {isIgnored ? (
              <>
                <XCircle
                  className="w-4 h-4 text-red-600 dark:text-red-400"
                  data-testid="annotation-ignored-icon"
                />
                <span
                  className="text-sm font-medium text-red-700 dark:text-red-300"
                  data-testid="annotation-value"
                >
                  Ignored
                </span>
              </>
            ) : (
              <>
                <CheckCircle
                  className="w-4 h-4 text-green-600 dark:text-green-400"
                  data-testid="annotation-included-icon"
                />
                <span
                  className="text-sm font-medium text-green-700 dark:text-green-300"
                  data-testid="annotation-value"
                >
                  Included
                </span>
              </>
            )}
          </>
        ) : (
          <>
            <Circle
              className="w-4 h-4 text-gray-400 dark:text-gray-500"
              data-testid="annotation-undefined-icon"
            />
            <span
              className="text-sm text-gray-500 dark:text-gray-400"
              data-testid="annotation-value"
            >
              No annotation
            </span>
          </>
        )}

        {hasAnnotation && onNavigate && (
          <ChevronRight
            className="w-4 h-4 text-gray-400 dark:text-gray-500"
            data-testid="navigate-icon"
          />
        )}
      </div>

      {/* Active indicator */}
      {level.isActive && (
        <div
          data-testid="active-indicator"
          className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 dark:bg-blue-500 rounded-l-md"
          aria-label="Active annotation level"
        />
      )}
    </div>
  );
}
