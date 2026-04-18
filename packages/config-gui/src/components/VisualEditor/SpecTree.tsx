import { useState } from 'react';
import type { SpecStructure, ResourceNode, OperationNode, FieldNode } from '../../types/index.js';

/**
 * Props for SpecTree component
 */
interface SpecTreeProps {
  structure: SpecStructure;
  onNodeSelect?: (path: string, type: 'resource' | 'operation' | 'field') => void;
}

/**
 * SpecTree component displays the hierarchical structure of the API spec
 * 
 * Features:
 * - Tree view of resources, operations, and fields
 * - Expand/collapse functionality for tree nodes
 * - Visual indicators for applied annotations
 * - Displays annotation badges on nodes with annotations
 * 
 * Requirements: 6.1, 6.9
 * 
 * Usage:
 * ```tsx
 * <SpecTree structure={specStructure} onNodeSelect={handleNodeSelect} />
 * ```
 */
export function SpecTree({ structure, onNodeSelect }: SpecTreeProps) {
  if (!structure || structure.resources.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No resources found in spec</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">API Spec Structure</h3>
      </div>
      
      <div className="p-4">
        <div className="space-y-2">
          {structure.resources.map((resource) => (
            <ResourceTreeNode
              key={resource.slug}
              resource={resource}
              onNodeSelect={onNodeSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Props for ResourceTreeNode component
 */
interface ResourceTreeNodeProps {
  resource: ResourceNode;
  onNodeSelect?: (path: string, type: 'resource' | 'operation' | 'field') => void;
}

/**
 * ResourceTreeNode displays a single resource with its operations and fields
 */
function ResourceTreeNode({ resource, onNodeSelect }: ResourceTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasAnnotations = Object.keys(resource.annotations).length > 0;
  
  const handleClick = () => {
    setIsExpanded(!isExpanded);
    onNodeSelect?.(resource.slug, 'resource');
  };
  
  return (
    <div className="border border-gray-200 rounded-md">
      <button
        onClick={handleClick}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-gray-400">
          {isExpanded ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </span>
        
        <span className="flex-shrink-0 text-blue-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </span>
        
        <span className="flex-1 font-medium text-gray-900">{resource.name}</span>
        
        {hasAnnotations && (
          <AnnotationIndicator count={Object.keys(resource.annotations).length} />
        )}
      </button>
      
      {isExpanded && (
        <div className="pl-6 pr-3 pb-2">
          {resource.description && (
            <p className="text-sm text-gray-600 mb-3 ml-6">{resource.description}</p>
          )}
          
          {resource.operations.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 ml-6">
                Operations
              </div>
              <div className="space-y-1">
                {resource.operations.map((operation) => (
                  <OperationTreeNode
                    key={operation.id}
                    operation={operation}
                    onNodeSelect={onNodeSelect}
                  />
                ))}
              </div>
            </div>
          )}
          
          {resource.fields.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 ml-6">
                Fields
              </div>
              <div className="space-y-1">
                {resource.fields.map((field) => (
                  <FieldTreeNode
                    key={field.path}
                    field={field}
                    level={0}
                    onNodeSelect={onNodeSelect}
                  />
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
 * Props for OperationTreeNode component
 */
interface OperationTreeNodeProps {
  operation: OperationNode;
  onNodeSelect?: (path: string, type: 'resource' | 'operation' | 'field') => void;
}

/**
 * OperationTreeNode displays a single operation
 */
function OperationTreeNode({ operation, onNodeSelect }: OperationTreeNodeProps) {
  const hasAnnotations = Object.keys(operation.annotations).length > 0;
  
  const handleClick = () => {
    onNodeSelect?.(`${operation.method}:${operation.path}`, 'operation');
  };
  
  // Method color mapping
  const methodColors: Record<string, string> = {
    GET: 'bg-green-100 text-green-800',
    POST: 'bg-blue-100 text-blue-800',
    PUT: 'bg-yellow-100 text-yellow-800',
    PATCH: 'bg-orange-100 text-orange-800',
    DELETE: 'bg-red-100 text-red-800'
  };
  
  const methodColor = methodColors[operation.method] || 'bg-gray-100 text-gray-800';
  
  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 rounded transition-colors ml-6"
    >
      <span className={`px-2 py-0.5 text-xs font-semibold rounded ${methodColor}`}>
        {operation.method}
      </span>
      
      <span className="flex-1 text-sm text-gray-700 font-mono">{operation.path}</span>
      
      {operation.summary && (
        <span className="text-xs text-gray-500 truncate max-w-xs">{operation.summary}</span>
      )}
      
      {hasAnnotations && (
        <AnnotationIndicator count={Object.keys(operation.annotations).length} />
      )}
    </button>
  );
}

/**
 * Props for FieldTreeNode component
 */
interface FieldTreeNodeProps {
  field: FieldNode;
  level: number;
  onNodeSelect?: (path: string, type: 'resource' | 'operation' | 'field') => void;
}

/**
 * FieldTreeNode displays a single field with optional nested children
 */
function FieldTreeNode({ field, level, onNodeSelect }: FieldTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = field.children && field.children.length > 0;
  const hasAnnotations = Object.keys(field.annotations).length > 0;
  
  const handleClick = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
    onNodeSelect?.(field.path, 'field');
  };
  
  // Type icon mapping
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'string':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
        );
      case 'number':
      case 'integer':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
          </svg>
        );
      case 'boolean':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'object':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
        );
      case 'array':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        );
    }
  };
  
  const indentClass = `ml-${level * 4 + 6}`;
  
  return (
    <div>
      <button
        onClick={handleClick}
        className={`w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-50 rounded transition-colors ${indentClass}`}
      >
        {hasChildren && (
          <span className="text-gray-400">
            {isExpanded ? (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </span>
        )}
        
        {!hasChildren && <span className="w-3" />}
        
        <span className="text-gray-500">
          {getTypeIcon(field.type)}
        </span>
        
        <span className="flex-1 text-sm text-gray-900">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </span>
        
        <span className="text-xs text-gray-400 font-mono">{field.type}</span>
        
        {hasAnnotations && (
          <AnnotationIndicator count={Object.keys(field.annotations).length} />
        )}
      </button>
      
      {isExpanded && hasChildren && (
        <div className="space-y-1">
          {field.children!.map((child) => (
            <FieldTreeNode
              key={child.path}
              field={child}
              level={level + 1}
              onNodeSelect={onNodeSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Props for AnnotationIndicator component
 */
interface AnnotationIndicatorProps {
  count: number;
}

/**
 * AnnotationIndicator displays a badge showing the number of annotations
 */
function AnnotationIndicator({ count }: AnnotationIndicatorProps) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
      {count}
    </span>
  );
}
