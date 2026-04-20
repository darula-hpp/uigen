import { useState, useEffect } from 'react';
import { toBytes, fromBytes, formatBytes, selectDefaultUnit, type Unit } from '../../lib/file-size-utils.js';

/**
 * Props for FileSizeInput component
 */
export interface FileSizeInputProps {
  /** Current value in bytes */
  value: number;
  /** Callback when value changes (always in bytes) */
  onChange: (bytes: number) => void;
  /** Label for the input */
  label: string;
  /** Optional description text */
  description?: string;
  /** Minimum allowed value in bytes */
  min?: number;
  /** Maximum allowed value in bytes */
  max?: number;
  /** Whether the field is required */
  required?: boolean;
  /** ID for the input element */
  id?: string;
}

/**
 * FileSizeInput component provides a user-friendly interface for entering file sizes.
 * 
 * Features:
 * - Number input for value with decimal support
 * - Unit selector dropdown (B, KB, MB, GB)
 * - Automatic conversion between display value and bytes
 * - Shows formatted byte value below input
 * - Validation for positive, finite numbers
 * - Accessible with proper labels and ARIA attributes
 * 
 * The component stores values in bytes but displays them in user-friendly units.
 * When the component mounts, it automatically selects the most appropriate unit
 * based on the byte value.
 * 
 * Requirements: 4.1
 */
export function FileSizeInput({
  value,
  onChange,
  label,
  description,
  min = 1,
  max,
  required = false,
  id = 'file-size-input'
}: FileSizeInputProps) {
  // State for display value and selected unit
  const [displayValue, setDisplayValue] = useState<string>('');
  const [unit, setUnit] = useState<Unit>('MB');
  const [error, setError] = useState<string>('');
  
  // Initialize display value and unit from bytes on mount or when value changes externally
  useEffect(() => {
    if (value > 0) {
      const defaultUnit = selectDefaultUnit(value) as Unit;
      setUnit(defaultUnit);
      setDisplayValue(fromBytes(value, defaultUnit).toString());
    } else {
      // Default to 5 MB if no value
      setUnit('MB');
      setDisplayValue('5');
    }
  }, [value]);
  
  /**
   * Validate the current display value
   */
  const validateValue = (numValue: number, currentUnit: Unit): string => {
    if (isNaN(numValue)) {
      return 'Please enter a valid number';
    }
    
    if (!isFinite(numValue)) {
      return 'File size must be finite';
    }
    
    if (numValue <= 0) {
      return 'File size must be positive';
    }
    
    const bytes = toBytes(numValue, currentUnit);
    
    if (bytes < min) {
      return `File size must be at least ${formatBytes(min)}`;
    }
    
    if (max && bytes > max) {
      return `File size must not exceed ${formatBytes(max)}`;
    }
    
    return '';
  };
  
  /**
   * Handle display value change
   */
  const handleValueChange = (newValue: string) => {
    setDisplayValue(newValue);
    
    // Parse and validate
    const numValue = parseFloat(newValue);
    const validationError = validateValue(numValue, unit);
    
    if (validationError) {
      setError(validationError);
      return;
    }
    
    // Clear error and convert to bytes
    setError('');
    const bytes = toBytes(numValue, unit);
    onChange(bytes);
  };
  
  /**
   * Handle unit change
   */
  const handleUnitChange = (newUnit: string) => {
    const typedUnit = newUnit as Unit;
    setUnit(typedUnit);
    
    // Convert current display value to new unit
    const numValue = parseFloat(displayValue);
    if (!isNaN(numValue) && isFinite(numValue)) {
      const bytes = toBytes(numValue, unit);
      const newDisplayValue = fromBytes(bytes, typedUnit);
      setDisplayValue(newDisplayValue.toString());
      
      // Validate with new unit
      const validationError = validateValue(newDisplayValue, typedUnit);
      setError(validationError);
    }
  };
  
  // Calculate current bytes for display
  const currentBytes = (() => {
    const numValue = parseFloat(displayValue);
    if (isNaN(numValue) || !isFinite(numValue) || numValue <= 0) {
      return 0;
    }
    return toBytes(numValue, unit);
  })();
  
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      )}
      
      <div className="flex gap-2">
        {/* Number input */}
        <input
          type="number"
          id={id}
          value={displayValue}
          onChange={(e) => handleValueChange(e.target.value)}
          step="any"
          min="0"
          aria-label={`${label} value`}
          aria-describedby={error ? `${id}-error` : `${id}-bytes`}
          aria-invalid={!!error}
          className={`flex-1 px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
          }`}
        />
        
        {/* Unit selector */}
        <select
          value={unit}
          onChange={(e) => handleUnitChange(e.target.value)}
          aria-label="Size unit"
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="B">B</option>
          <option value="KB">KB</option>
          <option value="MB">MB</option>
          <option value="GB">GB</option>
        </select>
      </div>
      
      {/* Error message */}
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      
      {/* Formatted byte display */}
      {!error && currentBytes > 0 && (
        <p id={`${id}-bytes`} className="text-xs text-gray-500 dark:text-gray-400">
          = {currentBytes.toLocaleString()} bytes ({formatBytes(currentBytes)})
        </p>
      )}
    </div>
  );
}
