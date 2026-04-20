import { useState, useCallback, useRef, useEffect } from 'react';
import type { ConfigFile } from '@uigen-dev/core';
import { useAppContext } from '../../contexts/AppContext.js';
import type { AnnotationMetadata } from '../../types/index.js';
import { MultiSelect } from '../controls/MultiSelect.js';
import { FileSizeInput } from '../controls/FileSizeInput.js';
import { MIME_TYPE_OPTIONS } from '../../lib/mime-types.js';

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
  /** Field information for applicability filtering (optional, for fields only) */
  fieldInfo?: {
    type: string;
    format?: string;
  };
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
 * - Uses dynamic annotation metadata from AppContext
 * - Filters annotations based on field type using applicableWhen rules
 */
export function AnnotationEditor({
  elementPath,
  elementType,
  currentAnnotations,
  onAnnotationsChange,
  fieldInfo
}: AnnotationEditorProps) {
  const { state } = useAppContext();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingAnnotation, setEditingAnnotation] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showStringModal, setShowStringModal] = useState(false);
  const [pendingStringAnnotation, setPendingStringAnnotation] = useState<AnnotationMeta | null>(null);
  const [showObjectModal, setShowObjectModal] = useState(false);
  const [pendingObjectAnnotation, setPendingObjectAnnotation] = useState<AnnotationMeta | null>(null);
  const [objectValue, setObjectValue] = useState<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const modalInputRef = useRef<HTMLInputElement>(null);
  const [dropdownFlipped, setDropdownFlipped] = useState(false);
  
  // Convert AnnotationMetadata to AnnotationMeta format
  const convertToAnnotationMeta = (metadata: AnnotationMetadata): AnnotationMeta => {
    // Determine value type from parameterSchema
    let valueType: 'boolean' | 'string' | 'object' = 'boolean';
    if (metadata.parameterSchema) {
      const schemaType = metadata.parameterSchema.type;
      if (schemaType === 'string') {
        valueType = 'string';
      } else if (schemaType === 'object' || schemaType === 'array' || schemaType === 'number') {
        valueType = 'object'; // Treat array and number as object (needs custom modal)
      } else if (schemaType === 'boolean') {
        valueType = 'boolean';
      }
    }
    
    // Map targetType to applicableTo array
    const applicableTo: ('field' | 'operation' | 'resource')[] = [];
    if (metadata.targetType === 'field') applicableTo.push('field');
    if (metadata.targetType === 'operation') applicableTo.push('operation');
    if (metadata.targetType === 'resource') applicableTo.push('resource');
    
    return {
      name: metadata.name,
      label: metadata.name.replace('x-uigen-', '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      description: metadata.description,
      valueType,
      applicableTo
    };
  };
  
  // Get all available annotations from AppContext
  const allAnnotations = state.annotations
    .filter(ann => ann.name !== 'x-uigen-ref'); // Exclude x-uigen-ref (has its own section)
  
  // Filter annotations based on field type if fieldInfo is provided
  const fieldTypeFilteredAnnotations = fieldInfo && elementType === 'field'
    ? allAnnotations.filter(ann => {
        // If annotation has no applicability rules, it applies to all fields
        if (!ann.applicableWhen) {
          return true;
        }
        
        const { type, format } = ann.applicableWhen;
        
        // Check type match (if specified)
        if (type !== undefined && fieldInfo.type !== type) {
          return false;
        }
        
        // Check format match (if specified)
        if (format !== undefined && fieldInfo.format !== format) {
          return false;
        }
        
        // All specified rules matched
        return true;
      })
    : allAnnotations;
  
  // Convert to AnnotationMeta format
  const AVAILABLE_ANNOTATIONS = fieldTypeFilteredAnnotations.map(convertToAnnotationMeta);
  
  // Check if element is ignored
  const isIgnored = Boolean(currentAnnotations['x-uigen-ignore']);
  
  // Get applicable annotations for this element type (field/operation/resource)
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
  
  // Calculate dropdown position to avoid overflow
  useEffect(() => {
    if (isDropdownOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const dropdownHeight = 300; // Approximate max height of dropdown
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      // Flip upward if not enough space below and more space above
      setDropdownFlipped(spaceBelow < dropdownHeight && spaceAbove > spaceBelow);
    }
  }, [isDropdownOpen]);
  
  // Get dropdown position for fixed positioning
  const getDropdownStyle = (): React.CSSProperties => {
    if (!dropdownRef.current) return {};
    
    const rect = dropdownRef.current.getBoundingClientRect();
    
    if (dropdownFlipped) {
      return {
        position: 'fixed',
        bottom: `${window.innerHeight - rect.top + 4}px`,
        right: `${window.innerWidth - rect.right}px`,
      };
    } else {
      return {
        position: 'fixed',
        top: `${rect.bottom + 4}px`,
        right: `${window.innerWidth - rect.right}px`,
      };
    }
  };
  
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
    } else if (annotation.valueType === 'object') {
      // For object/array/number annotations, show custom modal
      setPendingObjectAnnotation(annotation);
      
      // Get the annotation metadata to determine the type
      const metadata = state.annotations.find(ann => ann.name === annotation.name);
      
      // Initialize with default value based on type
      if (metadata?.parameterSchema) {
        const schemaType = metadata.parameterSchema.type;
        if (schemaType === 'array') {
          setObjectValue([]);
        } else if (schemaType === 'number') {
          setObjectValue(5242880); // Default 5MB
        } else {
          setObjectValue({});
        }
      } else {
        setObjectValue({});
      }
      
      setShowObjectModal(true);
      setIsDropdownOpen(false);
      setSearchQuery('');
    }
  }, [currentAnnotations, onAnnotationsChange, state.annotations]);
  
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
  
  // Handle editing an object annotation
  const handleEditObjectAnnotation = useCallback((annotationName: string, currentValue: any) => {
    const meta = getAnnotationMeta(annotationName);
    if (meta) {
      setPendingObjectAnnotation(meta);
      setObjectValue(currentValue);
      setShowObjectModal(true);
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
  
  // Handle saving object annotation from modal
  const handleSaveObjectAnnotation = useCallback(() => {
    if (!pendingObjectAnnotation) return;
    
    const newAnnotations = { ...currentAnnotations };
    
    // Validate and save based on type
    if (objectValue !== null && objectValue !== undefined) {
      newAnnotations[pendingObjectAnnotation.name] = objectValue;
    } else {
      delete newAnnotations[pendingObjectAnnotation.name];
    }
    
    onAnnotationsChange(newAnnotations);
    setShowObjectModal(false);
    setPendingObjectAnnotation(null);
    setObjectValue(null);
  }, [currentAnnotations, pendingObjectAnnotation, objectValue, onAnnotationsChange]);
  
  // Handle canceling object annotation modal
  const handleCancelObjectAnnotation = useCallback(() => {
    setShowObjectModal(false);
    setPendingObjectAnnotation(null);
    setObjectValue(null);
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
        
        if (meta.valueType === 'object') {
          // Format display value based on type
          let displayValue = '';
          if (Array.isArray(value)) {
            displayValue = `${value.length} selected`;
          } else if (typeof value === 'number') {
            // Format bytes for file size
            const formatBytes = (bytes: number) => {
              if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
              if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
              if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
              return `${bytes} B`;
            };
            displayValue = formatBytes(value);
          } else {
            displayValue = 'configured';
          }
          
          return (
            <button
              key={name}
              onClick={() => handleEditObjectAnnotation(name, value)}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
              title={`${meta.description} (click to edit)`}
              aria-label={`Edit ${meta.label}`}
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {meta.label}: {displayValue}
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
          <div 
            style={getDropdownStyle()}
            className="w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-[9999]"
          >
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
      
      {/* Object annotation modal (for array/number types) */}
      {showObjectModal && pendingObjectAnnotation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-[500px] max-w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {pendingObjectAnnotation.label}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {pendingObjectAnnotation.description}
            </p>
            
            {/* Render appropriate control based on annotation type */}
            {(() => {
              const metadata = state.annotations.find(ann => ann.name === pendingObjectAnnotation.name);
              
              if (!metadata) return null;
              
              const schemaType = metadata.parameterSchema?.type;
              
              // File types (array of MIME types)
              if (schemaType === 'array' && pendingObjectAnnotation.name === 'x-uigen-file-types') {
                return (
                  <MultiSelect
                    value={objectValue || []}
                    onChange={setObjectValue}
                    options={MIME_TYPE_OPTIONS}
                    label="Allowed MIME Types"
                    description="Select the file types that users can upload"
                    placeholder="Select MIME types..."
                  />
                );
              }
              
              // Max file size (number in bytes)
              if (schemaType === 'number' && pendingObjectAnnotation.name === 'x-uigen-max-file-size') {
                return (
                  <FileSizeInput
                    value={objectValue || 5242880}
                    onChange={setObjectValue}
                    label="Maximum File Size"
                    description="Set the maximum allowed file size for uploads"
                    min={1}
                    max={1073741824} // 1 GB
                  />
                );
              }
              
              // Generic fallback for other object types
              return (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Custom editor not available for this annotation type.
                </div>
              );
            })()}
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={handleCancelObjectAnnotation}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveObjectAnnotation}
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
