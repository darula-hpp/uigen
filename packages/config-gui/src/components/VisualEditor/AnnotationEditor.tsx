import { useState, useCallback, useRef, useEffect } from 'react';
import type { ConfigFile } from '@uigen-dev/core';

/**
 * Annotation metadata describing available annotations
 */
interface AnnotationMeta {
  name: string;
  label: string;
  description: string;
  valueType: 'boolean' | 'string' | 'object';
  applicableTo: ('field' | 'operation' | 'resource')[];
}

/**
 * Available annotations (excluding x-uigen-ref which has its own section)
 */
const AVAILABLE_ANNOTATIONS: AnnotationMeta[] = [
  {
    name: 'x-uigen-ignore',
    label: 'Ignore',
    description: 'Exclude from generated UI',
    valueType: 'boolean',
    applicableTo: ['field', 'operation', 'resource']
  },
  {
    name: 'x-uigen-label',
    label: 'Label',
    description: 'Override display label',
    valueType: 'string',
    applicableTo: ['field', 'operation', 'resource']
  },
  {
    name: 'x-uigen-id',
    label: 'ID',
    description: 'Stable identifier for overrides',
    valueType: 'string',
    applicableTo: ['operation', 'resource']
  },
  {
    name: 'x-uigen-login',
    label: 'Login',
    description: 'Mark as login endpoint',
    valueType: 'boolean',
    applicableTo: ['operation']
  },
  {
    name: 'x-uigen-sign-up',
    label: 'Sign Up',
    description: 'Mark as sign-up endpoint',
    valueType: 'boolean',
    applicableTo: ['operation']
  },
  {
    name: 'x-uigen-password-reset',
    label: 'Password Reset',
    description: 'Mark as password reset endpoint',
    valueType: 'boolean',
    applicableTo: ['operation']
  },
  {
    name: 'x-uigen-token-path',
    label: 'Token Path',
    description: 'Path to token in login response',
    valueType: 'string',
    applicableTo: ['operation']
  }
];

/**
 * Props for AnnotationEditor
 */
export interface AnnotationEditorProps {
  /** Element path in the spec */
  elementPath: string;
  /** Element type (field, operation, or resource) */
  elementType: 'field' | 'operation' | 'resource';
  /** Current annotations for this element */
  currentAnnotations: Record<string, unknown>;
  /** Callback when annotations change */
  onAnnotationsChange: (annotations: Record<string, unknown>) => void;
}

/**
 * AnnotationEditor component for managing all annotations on an element
 * 
 * Features:
 * - Shows applied annotations as badges
 * - "+ Add annotation" button with searchable dropdown
 * - Click badge to edit (string) or remove (boolean)
 * - Disables add button when x-uigen-ignore is set
 * - Filters dropdown to show only applicable and not-yet-added annotations
 */
export function AnnotationEditor({
  elementPath,
  elementType,
  currentAnnotations,
  onAnnotationsChange
}: AnnotationEditorProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingAnnotation, setEditingAnnotation] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showStringModal, setShowStringModal] = useState(false);
  const [pendingStringAnnotation, setPendingStringAnnotation] = useState<AnnotationMeta | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const modalInputRef = useRef<HTMLInputElement>(null);
  
  // Check if element is ignored
  const isIgnored = Boolean(currentAnnotations['x-uigen-ignore']);
  
  // Get applicable annotations for this element type
  const applicableAnnotations = AVAILABLE_ANNOTATIONS.filter(
    ann => ann.applicableTo.includes(elementType)
  );
  
  // Get annotations that are not yet applied
  const availableAnnotations = applicableAnnotations.filter(
    ann => !(ann.name in currentAnnotations)
  );
  
  // Filter available annotations by search query
  const filteredAnnotations = availableAnnotations.filter(ann =>
    ann.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ann.description.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setSearchQuery('');
      }
    }
    
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);
  
  // Focus search input when dropdown opens
  useEffect(() => {
    if (isDropdownOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isDropdownOpen]);
  
  // Focus modal input when modal opens
  useEffect(() => {
    if (showStringModal && modalInputRef.current) {
      modalInputRef.current.focus();
    }
  }, [showStringModal]);
  
  // Handle adding an annotation
  const handleAddAnnotation = useCallback((annotation: AnnotationMeta) => {
    if (annotation.valueType === 'boolean') {
      const newAnnotations = { ...currentAnnotations };
      newAnnotations[annotation.name] = true;
      onAnnotationsChange(newAnnotations);
      setIsDropdownOpen(false);
      setSearchQuery('');
    } else if (annotation.valueType === 'string') {
      // For string annotations, show modal
      setPendingStringAnnotation(annotation);
      setEditValue('');
      setShowStringModal(true);
      setIsDropdownOpen(false);
      setSearchQuery('');
    }
  }, [currentAnnotations, onAnnotationsChange]);
  
  // Handle removing an annotation
  const handleRemoveAnnotation = useCallback((annotationName: string) => {
    const newAnnotations = { ...currentAnnotations };
    delete newAnnotations[annotationName];
    onAnnotationsChange(newAnnotations);
  }, [currentAnnotations, onAnnotationsChange]);
  
  // Handle editing a string annotation
  const handleEditAnnotation = useCallback((annotationName: string, currentValue: string) => {
    const meta = getAnnotationMeta(annotationName);
    if (meta) {
      setPendingStringAnnotation(meta);
      setEditValue(currentValue);
      setShowStringModal(true);
    }
  }, []);
  
  // Handle saving string annotation from modal
  const handleSaveStringAnnotation = useCallback(() => {
    if (!pendingStringAnnotation) return;
    
    const newAnnotations = { ...currentAnnotations };
    const trimmed = editValue.trim();
    
    if (trimmed) {
      newAnnotations[pendingStringAnnotation.name] = trimmed;
    } else {
      delete newAnnotations[pendingStringAnnotation.name];
    }
    
    onAnnotationsChange(newAnnotations);
    setShowStringModal(false);
    setPendingStringAnnotation(null);
    setEditValue('');
  }, [currentAnnotations, pendingStringAnnotation, editValue, onAnnotationsChange]);
  
  // Handle canceling string annotation modal
  const handleCancelStringAnnotation = useCallback(() => {
    setShowStringModal(false);
    setPendingStringAnnotation(null);
    setEditValue('');
  }, []);
  
  // Get annotation metadata by name
  const getAnnotationMeta = (name: string) => 
    AVAILABLE_ANNOTATIONS.find(ann => ann.name === name);
  
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Applied annotation badges */}
      {Object.entries(currentAnnotations).map(([name, value]) => {
        const meta = getAnnotationMeta(name);
        if (!meta) return null;
        
        // Show badge (no inline editing)
        if (meta.valueType === 'boolean') {
          return (
            <button
              key={name}
              onClick={() => handleRemoveAnnotation(name)}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors group"
              title={`${meta.description} (click to remove)`}
              aria-label={`Remove ${meta.label}`}
            >
              {meta.label}
              <svg className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          );
        }
        
        if (meta.valueType === 'string') {
          return (
            <button
              key={name}
              onClick={() => handleEditAnnotation(name, String(value))}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
              title={`${meta.description}: ${value} (click to edit)`}
              aria-label={`Edit ${meta.label}: ${value}`}
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              {meta.label}: {String(value)}
            </button>
          );
        }
        
        return null;
      })}
      
      {/* Add annotation button with dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          disabled={isIgnored && availableAnnotations.some(a => a.name !== 'x-uigen-ignore')}
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
            isIgnored && availableAnnotations.some(a => a.name !== 'x-uigen-ignore')
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          title={isIgnored ? 'Remove x-uigen-ignore to add other annotations' : 'Add annotation'}
          aria-label="Add annotation"
        >
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add
        </button>
        
        {/* Dropdown menu */}
        {isDropdownOpen && (
          <div className="absolute top-full right-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
            {/* Search input */}
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search annotations..."
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            {/* Annotation list */}
            <div className="max-h-64 overflow-y-auto">
              {filteredAnnotations.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                  {searchQuery ? 'No annotations found' : 'All annotations applied'}
                </div>
              ) : (
                filteredAnnotations.map(annotation => (
                  <button
                    key={annotation.name}
                    onClick={() => handleAddAnnotation(annotation)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {annotation.label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {annotation.description}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* String annotation modal */}
      {showStringModal && pendingStringAnnotation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-96 max-w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {pendingStringAnnotation.label}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {pendingStringAnnotation.description}
            </p>
            
            <input
              ref={modalInputRef}
              type="text"
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSaveStringAnnotation();
                if (e.key === 'Escape') handleCancelStringAnnotation();
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
              placeholder={`Enter ${pendingStringAnnotation.label.toLowerCase()}...`}
              aria-label={`${pendingStringAnnotation.label} value`}
            />
            
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancelStringAnnotation}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStringAnnotation}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
