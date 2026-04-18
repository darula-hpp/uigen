import { useState, useEffect } from 'react';
import { useAppContext } from '../hooks/useAppContext.js';
import { ControlFactory } from '../lib/control-factory.js';
import type { AnnotationMetadata } from '../types/index.js';

/**
 * Props for AnnotationForm component
 */
interface AnnotationFormProps {
  annotation: AnnotationMetadata;
}

/**
 * AnnotationForm component generates dynamic forms for annotation default values
 * 
 * Features:
 * - Generates form controls based on parameter schema using ControlFactory
 * - Validates inputs against parameter schema
 * - Displays inline error messages for validation failures
 * - Saves default values to config file on form submit
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */
export function AnnotationForm({ annotation }: AnnotationFormProps) {
  const { state, actions } = useAppContext();
  const { config } = state;
  const controlFactory = new ControlFactory();
  
  // Generate controls from annotation metadata
  const controls = controlFactory.generateControls(annotation);
  
  // Initialize form values from config defaults
  const [formValues, setFormValues] = useState<Record<string, unknown>>(() => {
    return config?.defaults?.[annotation.name] || {};
  });
  
  // Track validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Track if form has been submitted
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Update form values when config changes
  useEffect(() => {
    if (config?.defaults?.[annotation.name]) {
      setFormValues(config.defaults[annotation.name] as Record<string, unknown>);
    }
  }, [config, annotation.name]);
  
  /**
   * Validate a single field value
   */
  const validateField = (fieldName: string, value: unknown): string | null => {
    const control = controls[fieldName];
    if (!control) return null;
    
    // Check required validation
    if (control.required && (value === undefined || value === null || value === '')) {
      return `${control.label} is required`;
    }
    
    // Check validation rules
    if (control.validation) {
      for (const rule of control.validation) {
        if (rule.type === 'required' && (value === undefined || value === null || value === '')) {
          return rule.message;
        }
      }
    }
    
    return null;
  };
  
  /**
   * Validate all form fields
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    for (const [fieldName, control] of Object.entries(controls)) {
      const value = formValues[fieldName];
      const error = validateField(fieldName, value);
      
      if (error) {
        newErrors[fieldName] = error;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  /**
   * Handle field value change
   */
  const handleFieldChange = (fieldName: string, value: unknown) => {
    setFormValues(prev => ({
      ...prev,
      [fieldName]: value
    }));
    
    // Clear error for this field
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };
  
  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!config) return;
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Update config with new defaults
      const updatedConfig = {
        ...config,
        defaults: {
          ...config.defaults,
          [annotation.name]: formValues
        }
      };
      
      await actions.saveConfig(updatedConfig);
    } catch (err) {
      console.error('Failed to save defaults:', err);
      actions.setError('Failed to save default values');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  /**
   * Render a form control based on its type
   */
  const renderControl = (fieldName: string) => {
    const control = controls[fieldName];
    const value = formValues[fieldName];
    const error = errors[fieldName];
    
    return (
      <div key={fieldName} className="mb-4">
        <label htmlFor={fieldName} className="block text-sm font-medium text-gray-700 mb-1">
          {control.label}
          {control.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        
        {control.description && (
          <p className="text-xs text-gray-500 mb-2">{control.description}</p>
        )}
        
        {control.type === 'text-input' && (
          <input
            type="text"
            id={fieldName}
            value={(value as string) || ''}
            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        )}
        
        {control.type === 'number-input' && (
          <input
            type="number"
            id={fieldName}
            value={(value as number) || ''}
            onChange={(e) => handleFieldChange(fieldName, parseFloat(e.target.value))}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        )}
        
        {control.type === 'toggle' && (
          <button
            type="button"
            role="switch"
            aria-checked={!!value}
            onClick={() => handleFieldChange(fieldName, !value)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              value ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span className="sr-only">{control.label}</span>
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                value ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        )}
        
        {control.type === 'dropdown' && (
          <select
            id={fieldName}
            value={(value as string) || ''}
            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Select an option</option>
            {control.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
        
        {control.type === 'resource-selector' && (
          <input
            type="text"
            id={fieldName}
            value={(value as string) || ''}
            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
            placeholder="Enter resource name"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        )}
        
        {control.type === 'object-editor' && (
          <textarea
            id={fieldName}
            value={value ? JSON.stringify(value, null, 2) : ''}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleFieldChange(fieldName, parsed);
              } catch {
                // Invalid JSON, keep as string for now
                handleFieldChange(fieldName, e.target.value);
              }
            }}
            rows={4}
            className={`w-full px-3 py-2 border rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        )}
        
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  };
  
  // If no controls, show message
  if (Object.keys(controls).length === 0) {
    return (
      <div className="text-sm text-gray-500 py-4">
        No configurable parameters for this annotation.
      </div>
    );
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Default Values for {annotation.name}
        </h3>
        
        <p className="text-sm text-gray-600 mb-6">
          Set default values that will be applied to all instances of this annotation unless overridden.
        </p>
        
        {Object.keys(controls).map(fieldName => renderControl(fieldName))}
        
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => {
              setFormValues(config?.defaults?.[annotation.name] as Record<string, unknown> || {});
              setErrors({});
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Reset
          </button>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Save Defaults'}
          </button>
        </div>
      </div>
    </form>
  );
}
