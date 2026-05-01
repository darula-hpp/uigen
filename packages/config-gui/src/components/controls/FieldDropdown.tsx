import type { FieldOption } from '../../lib/chart-utils.js';

/**
 * Props for FieldDropdown component
 */
export interface FieldDropdownProps {
  /** Available fields from array item schema */
  fields: FieldOption[];
  /** Currently selected field value */
  value: string;
  /** Callback when selection changes */
  onChange: (field: string) => void;
  /** Label for the dropdown */
  label: string;
  /** Optional description text */
  description?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Validation error message */
  error?: string;
  /** ID for the select element */
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
 * FieldDropdown component for selecting a single field from array item schema.
 * 
 * Features:
 * - Dropdown populated with field options
 * - Field type icons next to labels
 * - Validation error display
 * - Disabled state when no fields available
 * - Accessible with proper labels and ARIA attributes
 * 
 * Requirements: 3.3, 3.8, 6.1, 6.2
 */
export function FieldDropdown({
  fields,
  value,
  onChange,
  label,
  description,
  required = false,
  error,
  id = 'field-dropdown'
}: FieldDropdownProps) {
  const hasFields = fields.length > 0;
  const isDisabled = !hasFields;
  
  return (
    <div className="space-y-2">
      <label 
        htmlFor={id} 
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      )}
      
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isDisabled}
        aria-label={label}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
          error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
        }`}
      >
        {!hasFields && (
          <option value="">No fields available</option>
        )}
        
        {hasFields && !value && (
          <option value="">Select a field</option>
        )}
        
        {fields.map((field) => (
          <option key={field.value} value={field.value}>
            {getFieldTypeIcon(field.type)} {field.label}
          </option>
        ))}
      </select>
      
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
