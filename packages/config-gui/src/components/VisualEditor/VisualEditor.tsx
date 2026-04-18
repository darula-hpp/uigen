import { useState } from 'react';
import { FieldNode } from './FieldNode.js';
import { OperationNode } from './OperationNode.js';
import { RefLinkCanvas } from './RefLinkCanvas.js';
import type { SpecStructure, ResourceNode } from '../../types/index.js';

/**
 * Props for VisualEditor component
 */
export interface VisualEditorProps {
  structure: SpecStructure | null;
}

/**
 * VisualEditor is the main component that integrates all visual editor sub-components.
 *
 * Features:
 * - Displays spec structure in a tree view (SpecTree)
 * - Provides interactive annotation controls for fields (FieldNode)
 * - Provides interactive annotation controls for operations (OperationNode)
 * - Enables drag-and-drop ref linking (RefLinkCanvas)
 * - Handles annotation deletion via visual controls
 * - Saves all changes to config file immediately
 *
 * The visual editor is organized into three main sections:
 * 1. Spec Structure - Tree view with inline annotation controls
 * 2. Ref Link Manager - Drag-and-drop interface for x-uigen-ref
 * 3. Help Text - Instructions for using the visual editor
 *
 * Requirements: 6.8, 6.10
 *
 * Usage:
 * ```tsx
 * <VisualEditor structure={specStructure} />
 * ```
 */
export function VisualEditor({ structure }: VisualEditorProps) {
  const [activeTab, setActiveTab] = useState<'structure' | 'refs'>('structure');

  if (!structure) {
    return (
      <div className="bg-white shadow rounded-lg p-8">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No spec loaded</h3>
          <p className="mt-1 text-sm text-gray-500">
            Load a spec file to start configuring annotations visually.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="visual-editor">
      {/* Tab Navigation */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px" aria-label="Visual editor tabs">
            <button
              onClick={() => setActiveTab('structure')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'structure'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              aria-current={activeTab === 'structure' ? 'page' : undefined}
              data-testid="structure-tab"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
                Spec Structure
              </div>
            </button>
            <button
              onClick={() => setActiveTab('refs')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'refs'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              aria-current={activeTab === 'refs' ? 'page' : undefined}
              data-testid="refs-tab"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
                Ref Links
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'structure' && (
            <StructureView structure={structure} />
          )}
          {activeTab === 'refs' && (
            <RefsView structure={structure} />
          )}
        </div>
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">
          Visual Editor Tips
        </h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span>
              <strong>Labels:</strong> Click on a field's label badge or "+ label" button to edit inline
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span>
              <strong>Ignore:</strong> Toggle the switch next to a field to add/remove x-uigen-ignore
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span>
              <strong>Login:</strong> Toggle the switch next to an operation to mark it as the login endpoint
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span>
              <strong>Ref Links:</strong> Switch to the "Ref Links" tab, then drag a field onto a resource to create a reference
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}

/**
 * StructureView displays the spec structure with inline annotation controls
 */
interface StructureViewProps {
  structure: SpecStructure;
}

function StructureView({ structure }: StructureViewProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          API Resources
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Configure annotations directly on fields and operations below. Changes are saved immediately.
        </p>
      </div>

      <div className="space-y-4">
        {structure.resources.map(resource => (
          <ResourceSection key={resource.slug} resource={resource} />
        ))}
      </div>
    </div>
  );
}

/**
 * ResourceSection displays a single resource with its operations and fields
 */
interface ResourceSectionProps {
  resource: ResourceNode;
}

function ResourceSection({ resource }: ResourceSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="text-gray-400">
          {isExpanded ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </span>
        <span className="text-blue-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
        </span>
        <span className="flex-1 font-semibold text-gray-900">{resource.name}</span>
        <span className="text-xs text-gray-500">
          {resource.operations.length} operation{resource.operations.length !== 1 ? 's' : ''}, {resource.fields.length} field{resource.fields.length !== 1 ? 's' : ''}
        </span>
      </button>

      {isExpanded && (
        <div className="p-4 space-y-6">
          {resource.description && (
            <p className="text-sm text-gray-600">{resource.description}</p>
          )}

          {/* Operations */}
          {resource.operations.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Operations</h4>
              <div className="space-y-2">
                {resource.operations.map(operation => (
                  <OperationNode key={operation.id} operation={operation} />
                ))}
              </div>
            </div>
          )}

          {/* Fields */}
          {resource.fields.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Fields</h4>
              <div className="space-y-1">
                {resource.fields.map(field => (
                  <FieldNode key={field.path} field={field} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * RefsView displays the ref link management interface
 */
interface RefsViewProps {
  structure: SpecStructure;
}

function RefsView({ structure }: RefsViewProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Reference Link Manager
        </h3>
        <p className="text-sm text-gray-600">
          Create x-uigen-ref annotations by dragging fields from the "Spec Structure" tab onto resources below.
          Ref links enable select/autocomplete widgets that pull data from related resources.
        </p>
      </div>

      <RefLinkCanvas structure={structure} />
    </div>
  );
}
