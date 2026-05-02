import { useState, useEffect, useRef } from 'react';
import type { SchemaNode } from '@uigen-dev/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, X } from 'lucide-react';
import { validateField, type FieldSchema } from '@/lib/validation';

/**
 * Props interface for ProfileEditForm component
 */
export interface ProfileEditFormProps {
  fields: SchemaNode[];                           // Schema fields to render
  data: Record<string, unknown>;                  // Current profile data
  errors?: Record<string, string>;                // Server-side validation errors
  onSave: (data: Record<string, unknown>) => void; // Save callback
  onCancel: () => void;                           // Cancel callback
  isLoading?: boolean;                            // Loading state during submission
}

/**
 * Get appropriate input type for a field based on its schema
 * Requirement 3.6: Use appropriate input types for each field
 */
function getInputType(field: SchemaNode): string {
  if (field.format === 'email') return 'email';
  if (field.format === 'uri' || field.format === 'url') return 'url';
  if (field.format === 'date') return 'date';
  if (field.format === 'date-time') return 'datetime-local';
  if (field.type === 'number' || field.type === 'integer') return 'number';
  if (field.type === 'boolean') return 'checkbox';
  return 'text';
}

/**
 * Convert SchemaNode to FieldSchema for validation
 */
function schemaNodeToFieldSchema(node: SchemaNode): FieldSchema {
  const schema: FieldSchema = {
    type: node.type,
    format: node.format,
    required: node.required,
  };

  // Extract validation rules from validations array
  if (node.validations) {
    for (const rule of node.validations) {
      switch (rule.type) {
        case 'pattern':
          schema.pattern = String(rule.value);
          break;
        case 'minLength':
          schema.minLength = Number(rule.value);
          break;
        case 'maxLength':
          schema.maxLength = Number(rule.value);
          break;
        case 'minimum':
          schema.minimum = Number(rule.value);
          break;
        case 'maximum':
          schema.maximum = Number(rule.value);
          break;
      }
    }
  }

  // Also check for direct properties (for backward compatibility with tests)
  // TypeScript doesn't know about these properties, so we use type assertion
  const nodeAny = node as any;
  if (nodeAny.pattern !== undefined) schema.pattern = String(nodeAny.pattern);
  if (nodeAny.minLength !== undefined) schema.minLength = Number(nodeAny.minLength);
  if (nodeAny.maxLength !== undefined) schema.maxLength = Number(nodeAny.maxLength);
  if (nodeAny.minimum !== undefined) schema.minimum = Number(nodeAny.minimum);
  if (nodeAny.maximum !== undefined) schema.maximum = Number(nodeAny.maximum);

  return schema;
}

/**
 * ProfileEditForm component - renders editable form fields with validation
 * 
 * This component provides an inline editing experience for profile data.
 * It dynamically renders form inputs based on the schema, validates user input
 * in real-time, and displays validation errors.
 * 
 * Requirements:
 * - 3.5: Display form inputs with current values pre-filled
 * - 3.6: Use appropriate input types for each field
 * - 5.1: Validate email format
 * - 5.2: Validate required fields
 * - 5.3: Display field-specific error messages
 * - 5.4: Prevent form submission when validation errors exist
 * - 5.5: Clear errors when user corrects invalid input
 * - 7.2: ARIA labels for buttons
 * - 7.5: Semantic HTML elements (form, label, input)
 */
export function ProfileEditForm({
  fields,
  data,
  errors: serverErrors = {},
  onSave,
  onCancel,
  isLoading = false,
}: ProfileEditFormProps) {
  // Form state - Requirement 3.5: Pre-filled values
  const [formData, setFormData] = useState<Record<string, unknown>>(data);
  
  // Client-side validation errors - Requirement 5.3
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // Ref for form element to handle keyboard events
  const formRef = useRef<HTMLFormElement>(null);
  
  // Ref for first editable field - Requirement 7.4: Focus management
  const firstFieldRef = useRef<HTMLInputElement>(null);

  /**
   * Handle field value change
   * Requirement 5.5: Clear errors when user corrects invalid input
   */
  const handleChange = (key: string, value: unknown, field: SchemaNode) => {
    // Update form data
    setFormData(prev => ({ ...prev, [key]: value }));

    // Validate field in real-time
    const fieldSchema = schemaNodeToFieldSchema(field);
    const result = validateField(value, fieldSchema);

    // Update validation errors
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      if (result.isValid) {
        delete newErrors[key]; // Clear error if valid
      } else if (result.error) {
        newErrors[key] = result.error; // Set error if invalid
      }
      return newErrors;
    });
  };

  /**
   * Handle form submission
   * Requirement 5.4: Prevent form submission when validation errors exist
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check if there are any validation errors
    const hasErrors = Object.keys(validationErrors).length > 0;
    if (hasErrors) {
      return; // Prevent submission
    }

    // Call onSave callback with form data
    onSave(formData);
  };

  /**
   * Focus management: Move focus to first field when component mounts
   * Requirement 7.4: Maintain focus management when entering edit mode
   */
  useEffect(() => {
    if (firstFieldRef.current) {
      firstFieldRef.current.focus();
    }
  }, []);

  /**
   * Handle Escape key to cancel edit mode
   * Requirement 7.1: Support Escape key to cancel edit mode
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        e.preventDefault();
        onCancel();
      }
    };

    // Add event listener to document
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCancel, isLoading]);

  // Combine client-side and server-side errors
  const allErrors = { ...validationErrors, ...serverErrors };
  
  // Check if Save button should be disabled
  const hasValidationErrors = Object.keys(validationErrors).length > 0;

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      {fields.map((field, index) => {
        // Skip read-only fields
        if (field.readOnly) return null;

        const inputType = getInputType(field);
        const fieldError = allErrors[field.key];
        const fieldValue = formData[field.key];
        const isFirstField = index === 0;

        return (
          <div key={field.key} className="space-y-2">
            {/* Field Label */}
            <Label htmlFor={field.key}>
              {field.label || field.key}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>

            {/* Input Field - Requirement 3.6: Appropriate input types */}
            <Input
              ref={isFirstField ? firstFieldRef : undefined}
              id={field.key}
              type={inputType}
              value={String(fieldValue ?? '')}
              onChange={(e) => handleChange(field.key, e.target.value, field)}
              className={fieldError ? 'border-destructive' : ''}
              disabled={isLoading}
              aria-invalid={!!fieldError}
              aria-describedby={fieldError ? `${field.key}-error` : undefined}
            />

            {/* Field Description */}
            {field.description && !fieldError && (
              <p className="text-xs text-muted-foreground">{field.description}</p>
            )}

            {/* Error Message - Requirement 5.3: Display field-specific errors */}
            {fieldError && (
              <p 
                id={`${field.key}-error`}
                className="text-xs text-destructive"
                role="alert"
              >
                {fieldError}
              </p>
            )}
          </div>
        );
      })}

      {/* Form Actions - Requirement 3.3: Save and Cancel buttons */}
      <div className="flex gap-2 pt-2">
        <Button
          type="submit"
          size="sm"
          className="gap-2"
          disabled={hasValidationErrors || isLoading}
          aria-label="Save profile changes"
        >
          <Save className="w-4 h-4" />
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isLoading}
          className="gap-2"
          aria-label="Cancel editing"
        >
          <X className="w-4 h-4" />
          Cancel
        </Button>
      </div>
    </form>
  );
}
