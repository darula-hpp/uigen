import React, { useState } from 'react';
import type { ResourceNode } from '../../lib/spec-parser';
import type { RefLinkConfig } from './RefLinkTypes';

/**
 * Props for the RefLinkEditPanel component
 */
export interface RefLinkEditPanelProps {
  /** The ref link configuration being edited */
  refLink: RefLinkConfig;
  /** Target resource node */
  targetResource: ResourceNode;
  /** Handler called when user saves changes */
  onUpdate: (config: RefLinkConfig) => void;
  /** Handler called when user confirms deletion */
  onDelete: () => void;
  /** Handler called when user closes the panel */
  onClose: () => void;
}

/**
 * RefLinkEditPanel - Panel for editing or deleting existing ref link
 * 
 * Displays when a user clicks on an existing ref link line. Allows them to
 * edit the valueField and labelField or delete the ref link entirely.
 * 
 * Features:
 * - Read-only display of source field path and target resource name
 * - Dropdowns for valueField and labelField pre-populated with current values
 * - Required field validation with asterisks
 * - Field existence validation
 * - Inline error messages for validation failures
 * - Delete button with confirmation dialog
 * - Save/Delete/Cancel buttons
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 8.1, 8.2, 8.3, 8.4, 8.5, 15.4, 15.5
 * 
 * @param props - Component props
 * @returns RefLinkEditPanel component
 */
export const RefLinkEditPanel: React.FC<RefLinkEditPanelProps> = ({
  refLink,
  targetResource,
  onUpdate,
  onDelete,
  onClose,
}) => {
  const [valueField, setValueField] = useState(refLink.valueField);
  const [labelField, setLabelField] = useState(refLink.labelField);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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
      onUpdate({
        ...refLink,
        valueField,
        labelField,
      });
    }
  };

  /**
   * Handle delete confirmation
   */
  const handleDeleteConfirm = () => {
    onDelete();
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
      data-testid="ref-link-edit-panel"
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Edit Ref Link
      </h3>

      {/* Source field (read-only) */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Source Field
        </label>
        <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-400 font-mono">
          {refLink.fieldPath}
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

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div
          className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded"
          data-testid="delete-confirmation"
        >
          <p className="text-sm text-red-800 dark:text-red-200 mb-3">
            Are you sure you want to delete this ref link? This action cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleDeleteConfirm}
              className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              data-testid="confirm-delete-button"
            >
              Delete
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
              data-testid="cancel-delete-button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 justify-between">
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 border border-red-300 dark:border-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-500"
          data-testid="delete-button"
          disabled={showDeleteConfirm}
        >
          Delete
        </button>
        <div className="flex gap-2">
          <button
            onClick={onClose}
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
    </div>
  );
};
