import { useState, useRef, useEffect } from 'react';
import type { FieldOption } from '../../lib/chart-utils.js';

/**
 * Props for FieldMultiSelect component
 */
export interface FieldMultiSelectProps {
  /** Available fields from array item schema */
  fields: FieldOption[];
  /** Currently selected fields (array for multiple, single string for single mode) */
  value: string | string[];
  /** Callback when selection changes */
  onChange: (fields: string | string[]) => void;
  /** Label for the control */
  label: string;
  /** Optional description text */
  description?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Validation error message */
  error?: string;
  /** Whether to allow single selection mode */
  allowSingle?: boolean;
  /** ID for the control */
  id?: string;
}

/**
 * Get icon for field type
 */
function getFieldTypeIcon(type: string): string {
  switch (type) {
    case 'string':
      return '📝';
    case 'number':
    case 'integer':
      return '🔢';
    case 'boolean':
      return '✓';
    case 'date':
      return '📅';
    case 'array':
      return '📋';
    case 'object':
      return '📦';
    default:
      return '•';
  }
}

/**
 * FieldMultiSelect component for selecting single or multiple fields from array item schema.
 * 
 * Features:
 * - Checkbox list in dropdown
 * - Selected fields shown as chips
 * - Toggle between single/multiple selection modes
 * - Chip removal on click
 * - Validation error display
 * - Accessible with proper labels and ARIA attributes
 * 
 * Requirements: 3.4, 3.5, 3.6, 3.7
 */
export function FieldMultiSelect({
  fields,
  value,
  onChange,
  label,
  description,
  required = false,
  error,
  allowSingle = true,
  id = 'field-multi-select'
}: FieldMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSingleMode, setIsSingleMode] = useState(typeof value === 'string');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const hasFields = fields.length > 0;
  
  // Normalize value to array for internal use
  const selectedFields = Array.isArray(value) ? value : (value ? [value] : []);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);
  
  /**
   * Handle field selection toggle
   */
  const handleFieldToggle = (fieldValue: string, checked: boolean) => {
    if (isSingleMode) {
      // Single mode: replace selection
      onChange(fieldValue);
      setIsOpen(false);
    } else {
      // Multiple mode: toggle selection based on checked state
      const newSelection = checked
        ? [...selectedFields, fieldValue]
        : selectedFields.filter(f => f !== fieldValue);
      onChange(newSelection);
    }
  };
  
  /**
   * Handle chip removal
   */
  const handleChipRemove = (fieldValue: string) => {
    if (isSingleMode) {
      onChange('');
    } else {
      const newSelection = selectedFields.filter(f => f !== fieldValue);
      onChange(newSelection);
    }
  };
  
  /**
   * Handle mode toggle
   */
  const handleModeToggle = () => {
    const newMode = !isSingleMode;
    setIsSingleMode(newMode);
    
    if (newMode) {
      // Switching to single mode: keep only first selection
      onChange(selectedFields.length > 0 ? selectedFields[0] : '');
    } else {
      // Switching to multiple mode: convert string to array
      onChange(selectedFields);
    }
  };
  
  /**
   * Get field label by value
   */
  const getFieldLabel = (fieldValue: string): string => {
    const field = fields.find(f => f.value === fieldValue);
    return field ? field.label : fieldValue;
  };
  
  /**
   * Get field type by value
   */
  const getFieldType = (fieldValue: string): string => {
    const field = fields.find(f => f.value === fieldValue);
    return field ? field.type : '';
  };
  
  return (
    <div className="space-y-2 relative" ref={dropdownRef}>
      <div className="flex items-center justify-between">
        <label 
          htmlFor={id} 
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        
        {allowSingle && hasFields && (
          <button
            type="button"
            onClick={handleModeToggle}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            aria-label={`Switch to ${isSingleMode ? 'multiple' : 'single'} selection mode`}
          >
            {isSingleMode ? 'Enable Multiple' : 'Single Only'}
          </button>
        )}
      </div>
      
      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      )}
      
      {/* Selected chips */}
      {selectedFields.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedFields.map(fieldValue => (
            <div
              key={fieldValue}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm"
            >
              <span>{getFieldTypeIcon(getFieldType(fieldValue))}</span>
              <span>{getFieldLabel(fieldValue)}</span>
              <button
                type="button"
                onClick={() => handleChipRemove(fieldValue)}
                className="ml-1 hover:text-blue-600 dark:hover:text-blue-400"
                aria-label={`Remove ${getFieldLabel(fieldValue)}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Dropdown trigger */}
      <button
        type="button"
        id={id}
        onClick={() => setIsOpen(!isOpen)}
        disabled={!hasFields}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={label}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
          error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
        }`}
      >
        {!hasFields && 'No fields available'}
        {hasFields && selectedFields.length === 0 && 'Select field(s)'}
        {hasFields && selectedFields.length > 0 && (
          <span className="text-gray-500 dark:text-gray-400">
            {selectedFields.length} field{selectedFields.length !== 1 ? 's' : ''} selected
          </span>
        )}
      </button>
      
      {/* Dropdown menu */}
      {isOpen && hasFields && (
        <div
          className="absolute z-10 mt-1 w-full max-h-60 overflow-auto bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg"
          role="listbox"
          aria-label={`${label} options`}
        >
          {fields.map(field => {
            const isSelected = selectedFields.includes(field.value);
            
            return (
              <label
                key={field.value}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => handleFieldToggle(field.value, e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  aria-label={field.label}
                />
                <span className="flex-1 text-sm text-gray-900 dark:text-white">
                  {getFieldTypeIcon(field.type)} {field.label}
                </span>
              </label>
            );
          })}
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      
      {/* Warning when no fields available */}
      {!hasFields && (
        <p className="text-sm text-amber-600 dark:text-amber-400" role="alert">
          Array items must be objects with fields to configure charts
        </p>
      )}
    </div>
  );
}
