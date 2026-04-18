import { useState } from 'react';
import type { AnnotationMetadata } from '../types/index.js';

/**
 * Props for HelpPanel component
 */
export interface HelpPanelProps {
  /** Annotation metadata for displaying help */
  annotations: AnnotationMetadata[];
  /** Whether the panel is initially open */
  initiallyOpen?: boolean;
}

/**
 * HelpPanel displays annotation descriptions, parameter meanings, and getting started guide.
 *
 * Features:
 * - Display annotation descriptions and parameter meanings
 * - Show tooltips on hover for form fields
 * - Include "Getting Started" guide
 * - Collapsible sections for better organization
 *
 * Requirements: 15.3, 15.4, 15.5
 *
 * Usage:
 * ```tsx
 * <HelpPanel annotations={annotationMetadata} />
 * ```
 */
export function HelpPanel({ annotations, initiallyOpen = false }: HelpPanelProps) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const [activeSection, setActiveSection] = useState<'getting-started' | 'annotations'>('getting-started');

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden" data-testid="help-panel">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
        aria-expanded={isOpen}
        data-testid="help-panel-toggle"
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200">Help & Documentation</h3>
        </div>
        <svg
          className={`w-5 h-5 text-blue-600 dark:text-blue-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content */}
      {isOpen && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
            <button
              onClick={() => setActiveSection('getting-started')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeSection === 'getting-started'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-white dark:bg-gray-800'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
              data-testid="getting-started-tab"
            >
              Getting Started
            </button>
            <button
              onClick={() => setActiveSection('annotations')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeSection === 'annotations'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-white dark:bg-gray-800'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
              data-testid="annotations-tab"
            >
              Annotations Reference
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-4">
            {activeSection === 'getting-started' && (
              <GettingStartedGuide />
            )}
            {activeSection === 'annotations' && (
              <AnnotationsReference annotations={annotations} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Getting Started Guide section
 */
function GettingStartedGuide() {
  return (
    <div className="space-y-4 text-sm" data-testid="getting-started-guide">
      <div>
        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Welcome to UIGen Config GUI</h4>
        <p className="text-gray-700 dark:text-gray-300">
          This tool helps you configure UIGen annotations visually without editing YAML files manually.
          All changes are saved automatically to <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">. uigen/config.yaml</code>.
        </p>
      </div>

      <div>
        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Quick Start</h4>
        <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
          <li>
            <strong>Enable/Disable Annotations:</strong> Use the toggle switches in the annotation list to control which annotations are active.
          </li>
          <li>
            <strong>Set Default Values:</strong> Click on an annotation to configure default parameter values that apply globally.
          </li>
          <li>
            <strong>Visual Editor:</strong> Use the visual editor to configure annotations on specific fields, operations, or resources.
          </li>
          <li>
            <strong>Preview:</strong> Check the preview panel to see how your changes affect the generated UI.
          </li>
        </ol>
      </div>

      <div>
        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Visual Editor Tips</h4>
        <ul className="space-y-2 text-gray-700 dark:text-gray-300">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
            <span>
              <strong>Labels:</strong> Click on a field's label badge or "+ label" button to edit inline
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
            <span>
              <strong>Ignore:</strong> Toggle the switch next to a field to add/remove x-uigen-ignore
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
            <span>
              <strong>Ref Links:</strong> Drag a field onto a resource to create a reference link
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
            <span>
              <strong>Login:</strong> Toggle the switch next to an operation to mark it as the login endpoint
            </span>
          </li>
        </ul>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3">
        <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Configuration Precedence
        </h4>
        <p className="text-sm text-blue-800 dark:text-blue-300">
          Explicit annotations in your spec file override config defaults. Disabled annotations are skipped even if present in the spec.
        </p>
      </div>
    </div>
  );
}

/**
 * Annotations Reference section
 */
interface AnnotationsReferenceProps {
  annotations: AnnotationMetadata[];
}

function AnnotationsReference({ annotations }: AnnotationsReferenceProps) {
  const [expandedAnnotation, setExpandedAnnotation] = useState<string | null>(null);

  return (
    <div className="space-y-3" data-testid="annotations-reference">
      {annotations.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">No annotations available</p>
      ) : (
        annotations.map(annotation => (
          <div
            key={annotation.name}
            className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
            data-testid={`annotation-help-${annotation.name}`}
          >
            <button
              onClick={() => setExpandedAnnotation(
                expandedAnnotation === annotation.name ? null : annotation.name
              )}
              className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono text-blue-600 dark:text-blue-400">{annotation.name}</code>
                <span className="text-xs text-gray-500 dark:text-gray-400">{annotation.targetType}</span>
              </div>
              <svg
                className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ${
                  expandedAnnotation === annotation.name ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expandedAnnotation === annotation.name && (
              <div className="px-3 py-2 space-y-2 text-sm">
                <p className="text-gray-700 dark:text-gray-300">{annotation.description}</p>

                {annotation.parameterSchema && annotation.parameterSchema.properties && (
                  <div>
                    <h5 className="font-semibold text-gray-900 dark:text-white mb-1">Parameters:</h5>
                    <dl className="space-y-2">
                      {Object.entries(annotation.parameterSchema.properties).map(([paramName, paramSchema]) => (
                        <div key={paramName} className="ml-2">
                          <dt className="font-mono text-xs text-blue-600 dark:text-blue-400">
                            {paramName}
                            {annotation.parameterSchema.required?.includes(paramName) && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                            <span className="text-gray-500 dark:text-gray-400 ml-2">({paramSchema.type})</span>
                          </dt>
                          {paramSchema.description && (
                            <dd className="text-gray-600 dark:text-gray-400 text-xs ml-4 mt-0.5">
                              {paramSchema.description}
                            </dd>
                          )}
                        </div>
                      ))}
                    </dl>
                  </div>
                )}

                {annotation.examples && annotation.examples.length > 0 && (
                  <div>
                    <h5 className="font-semibold text-gray-900 dark:text-white mb-1">Examples:</h5>
                    {annotation.examples.map((example, index) => (
                      <div key={index} className="mb-2">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{example.description}</p>
                        <pre className="bg-gray-100 dark:bg-gray-800 rounded p-2 text-xs overflow-x-auto">
                          <code>{JSON.stringify(example.value, null, 2)}</code>
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
