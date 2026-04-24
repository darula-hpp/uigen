import React, { useState } from 'react';
import type { ResourceNode } from '../../lib/spec-parser';
import type { RefLinkConfig } from './RefLinkTypes';

/**
 * Props for the RefLinkConfigForm component
 */
export interface RefLinkConfigFormProps {
  /** Path to the source field (e.g., "users.departmentId") */
  fieldPath: string;
  /** Target resource to link to */
  targetResource: ResourceNode;
  /** Handler called when user confirms the configuration */
  onConfirm: (config: RefLinkConfig) => void;
  /** Handler called when user cancels the configuration */
  onCancel: () => void;
}

/**
 * RefLinkConfigForm - Form for configuring new ref link after connection
 * 
 * Displays after a user completes a drag-to-connect operation. Allows them to
 * configure which fields from the target resource to use as valueField and labelField.
 * 
 * Features:
 * - Read-only display of source field path and target resource name
 * - Dropdowns for valueField and labelField (populated with target resource fields)
 * - Required field validation with asterisks
 * - Field existence validation
 * - Inline error messages for validation failures
 * - Save/Cancel buttons
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 15.4, 15.5
 * 
 * @param props - Component props
 * @returns RefLinkConfigForm component
 */
export const RefLinkConfigForm: React.FC<RefLinkConfigFormProps> = ({
  fieldPath,
  targetResource,
  onConfirm,
  onCancel,
}) => {
  const [valueField, setValueField] = useState('');
  const [labelField, setLabelField] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Extract field paths from target resource for dropdown options
  const targetFields = targetResource.fields.map((field) => field.path);

  /**
   * Validate the form fields
   * @returns true if valid, false otherwise
   */
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Check required fields
    if (!valueField) {
      errors.valueField = 'Value field is required';
    } else if (!targetFields.includes(valueField)) {
      errors.valueField = `Field "${valueField}" does not exist in target resource`;
    }

    if (!labelField) {
      errors.labelField = 'Label field is required';
    } else if (!targetFields.includes(labelField)) {
      errors.labelField = `Field "${labelField}" does not exist in target resource`;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSave = () => {
    if (validateForm()) {
      onConfirm({
        fieldPath,
        resource: targetResource.slug,
        valueField,
        labelField,
      });
    }
  };

  /**
   * Handle field change and clear validation error
   */
  const handleValueFieldChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setValueField(e.target.value);
    // Clear error when user makes a change
    if (validationErrors.valueField) {
      setValidationErrors((prev) => {
        const { valueField, ...rest } = prev;
        return rest;
      });
    }
  };

  /**
   * Handle field change and clear validation error
   */
  const handleLabelFieldChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLabelField(e.target.value);
    // Clear error when user makes a change
    if (validationErrors.labelField) {
      setValidationErrors((prev) => {
        const { labelField, ...rest } = prev;
        return rest;
      });
    }
  };

  return (
    <div
      className="absolute top-4 right-4 z-50 w-80 rounded-lg border-2 border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 p-4 shadow-xl"
      data-testid="ref-link-config-form"
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Configure Ref Link
      </h3>

      {/* Source field (read-only) */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Source Field
        </label>
        <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-400 font-mono">
          {fieldPath}
        </div>
      </div>

      {/* Target resource (read-only) */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Target Resource
        </label>
        <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-400">
          {targetResource.name}
        </div>
      </div>

      {/* Value field dropdown */}
      <div className="mb-4">
        <label
          htmlFor="value-field"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Value Field <span className="text-red-500">*</span>
        </label>
        <select
          id="value-field"
          value={valueField}
          onChange={handleValueFieldChange}
          className={[
            'w-full px-3 py-2 rounded border text-sm',
            'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
            validationErrors.valueField
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500',
            'focus:outline-none focus:ring-2',
          ].join(' ')}
          aria-required="true"
          aria-invalid={!!validationErrors.valueField}
          data-testid="value-field-select"
        >
          <option value="">Select a field...</option>
          {targetFields.map((field) => (
            <option key={field} value={field}>
              {field}
            </option>
          ))}
        </select>
        {validationErrors.valueField && (
          <p
            className="mt-1 text-sm text-red-600 dark:text-red-400"
            role="alert"
            data-testid="value-field-error"
          >
            ⚠ {validationErrors.valueField}
          </p>
        )}
      </div>

      {/* Label field dropdown */}
      <div className="mb-4">
        <label
          htmlFor="label-field"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Label Field <span className="text-red-500">*</span>
        </label>
        <select
          id="label-field"
          value={labelField}
          onChange={handleLabelFieldChange}
          className={[
            'w-full px-3 py-2 rounded border text-sm',
            'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
            validationErrors.labelField
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500',
            'focus:outline-none focus:ring-2',
          ].join(' ')}
          aria-required="true"
          aria-invalid={!!validationErrors.labelField}
          data-testid="label-field-select"
        >
          <option value="">Select a field...</option>
          {targetFields.map((field) => (
            <option key={field} value={field}>
              {field}
            </option>
          ))}
        </select>
        {validationErrors.labelField && (
          <p
            className="mt-1 text-sm text-red-600 dark:text-red-400"
            role="alert"
            data-testid="label-field-error"
          >
            ⚠ {validationErrors.labelField}
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          data-testid="cancel-button"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          data-testid="save-button"
        >
          Save
        </button>
      </div>
    </div>
  );
};
