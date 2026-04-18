import { useAppContext } from '../hooks/useAppContext.js';
import type { AnnotationMetadata } from '../types/index.js';

/**
 * Props for AnnotationList component
 */
export interface AnnotationListProps {
  /** Called when an annotation is selected */
  onAnnotationSelect?: (annotationName: string) => void;
}

/**
 * AnnotationList component displays all registered annotations with toggle switches
 * 
 * Features:
 * - Groups annotations by target type (field-level, operation-level, resource-level)
 * - Shows annotation description and examples
 * - Toggle switches to enable/disable annotations
 * - Persists state immediately on toggle
 * - Supports annotation selection for configuration
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.5, 3.5
 */
export function AnnotationList({ onAnnotationSelect }: AnnotationListProps = {}) {
  const { state, actions } = useAppContext();
  const { annotations, config, isLoading } = state;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Loading annotations...</div>
      </div>
    );
  }
  
  if (annotations.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No annotations registered</p>
      </div>
    );
  }
  
  // Group annotations by target type
  const groupedAnnotations = annotations.reduce((acc, annotation) => {
    const category = annotation.targetType;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(annotation);
    return acc;
  }, {} as Record<string, AnnotationMetadata[]>);
  
  // Category display names
  const categoryNames: Record<string, string> = {
    field: 'Field-Level Annotations',
    operation: 'Operation-Level Annotations',
    resource: 'Resource-Level Annotations'
  };
  
  /**
   * Handle toggle switch change
   * Persists state immediately to config file
   */
  const handleToggle = async (annotationName: string, enabled: boolean) => {
    if (!config) return;
    
    const updatedConfig = {
      ...config,
      enabled: {
        ...config.enabled,
        [annotationName]: enabled
      }
    };
    
    try {
      await actions.saveConfig(updatedConfig);
    } catch (err) {
      console.error('Failed to save config:', err);
    }
  };
  
  return (
    <div className="space-y-6">
      {Object.entries(groupedAnnotations).map(([category, categoryAnnotations]) => (
        <div key={category} className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {categoryNames[category] || category}
            </h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {categoryAnnotations.map((annotation) => {
              const isEnabled = config?.enabled?.[annotation.name] ?? true;
              
              return (
                <AnnotationItem
                  key={annotation.name}
                  annotation={annotation}
                  enabled={isEnabled}
                  onToggle={handleToggle}
                  onSelect={onAnnotationSelect}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Individual annotation item with toggle and details
 */
interface AnnotationItemProps {
  annotation: AnnotationMetadata;
  enabled: boolean;
  onToggle: (name: string, enabled: boolean) => void;
  onSelect?: (name: string) => void;
}

function AnnotationItem({ annotation, enabled, onToggle, onSelect }: AnnotationItemProps) {
  const [showExamples, setShowExamples] = React.useState(false);
  
  return (
    <div className="px-6 py-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="text-base font-medium text-gray-900">
              {annotation.name}
            </h4>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          
          <p className="text-sm text-gray-600 mb-3">
            {annotation.description}
          </p>
          
          {annotation.examples && annotation.examples.length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setShowExamples(!showExamples)}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                {showExamples ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    Hide examples
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    Show examples ({annotation.examples.length})
                  </>
                )}
              </button>
              
              {showExamples && (
                <div className="mt-3 space-y-2">
                  {annotation.examples.map((example, index) => (
                    <div key={index} className="bg-gray-50 rounded-md p-3">
                      <p className="text-xs font-medium text-gray-700 mb-1">
                        {example.description}
                      </p>
                      <pre className="text-xs text-gray-600 overflow-x-auto">
                        {JSON.stringify(example.value, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="ml-4 flex-shrink-0">
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => onToggle(annotation.name, !enabled)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              enabled ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span className="sr-only">
              {enabled ? 'Disable' : 'Enable'} {annotation.name}
            </span>
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

// Import React for useState
import React from 'react';
