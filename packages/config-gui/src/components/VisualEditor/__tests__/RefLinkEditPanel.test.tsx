import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RefLinkEditPanel } from '../RefLinkEditPanel';
import type { ResourceNode } from '../../../lib/spec-parser';
import type { RefLinkConfig } from '../RefLinkTypes';

describe('RefLinkEditPanel', () => {
  const mockTargetResource: ResourceNode = {
    name: 'Departments',
    slug: 'departments',
    uigenId: 'departments-id',
    operations: [],
    fields: [
      {
        key: 'id',
        label: 'ID',
        type: 'string',
        path: 'Department.id',
        required: true,
        annotations: {},
      },
      {
        key: 'name',
        label: 'Name',
        type: 'string',
        path: 'Department.name',
        required: true,
        annotations: {},
      },
      {
        key: 'code',
        label: 'Code',
        type: 'string',
        path: 'Department.code',
        required: false,
        annotations: {},
      },
    ],
    annotations: {},
  };

  const mockRefLink: RefLinkConfig = {
    fieldPath: 'User.departmentId',
    resource: 'departments',
    valueField: 'Department.id',
    labelField: 'Department.name',
  };

  const defaultProps = {
    refLink: mockRefLink,
    targetResource: mockTargetResource,
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
    onClose: vi.fn(),
  };

  it('should render the panel with current configuration', () => {
    render(<RefLinkEditPanel {...defaultProps} />);

    expect(screen.getByText('Edit Ref Link')).toBeInTheDocument();
    expect(screen.getByText('User.departmentId')).toBeInTheDocument();
    expect(screen.getByText('Departments')).toBeInTheDocument();
  });

  it('should display source field path as read-only', () => {
    render(<RefLinkEditPanel {...defaultProps} />);

    const sourceFieldDiv = screen.getByText('User.departmentId');
    expect(sourceFieldDiv).toHaveClass('bg-gray-100');
    expect(sourceFieldDiv.tagName).toBe('DIV');
  });

  it('should display target resource name as read-only', () => {
    render(<RefLinkEditPanel {...defaultProps} />);

    const targetResourceDiv = screen.getByText('Departments');
    expect(targetResourceDiv).toHaveClass('bg-gray-100');
    expect(targetResourceDiv.tagName).toBe('DIV');
  });

  it('should pre-populate valueField dropdown with current value', () => {
    render(<RefLinkEditPanel {...defaultProps} />);

    const valueFieldSelect = screen.getByTestId('value-field-select') as HTMLSelectElement;
    expect(valueFieldSelect.value).toBe('Department.id');
  });

  it('should pre-populate labelField dropdown with current value', () => {
    render(<RefLinkEditPanel {...defaultProps} />);

    const labelFieldSelect = screen.getByTestId('label-field-select') as HTMLSelectElement;
    expect(labelFieldSelect.value).toBe('Department.name');
  });

  it('should populate valueField dropdown with target resource fields', () => {
    render(<RefLinkEditPanel {...defaultProps} />);

    const valueFieldSelect = screen.getByTestId('value-field-select') as HTMLSelectElement;
    const options = Array.from(valueFieldSelect.options).map((opt) => opt.value);

    expect(options).toContain('Department.id');
    expect(options).toContain('Department.name');
    expect(options).toContain('Department.code');
  });

  it('should populate labelField dropdown with target resource fields', () => {
    render(<RefLinkEditPanel {...defaultProps} />);

    const labelFieldSelect = screen.getByTestId('label-field-select') as HTMLSelectElement;
    const options = Array.from(labelFieldSelect.options).map((opt) => opt.value);

    expect(options).toContain('Department.id');
    expect(options).toContain('Department.name');
    expect(options).toContain('Department.code');
  });

  it('should mark valueField and labelField as required with asterisks', () => {
    render(<RefLinkEditPanel {...defaultProps} />);

    const valueFieldLabel = screen.getByText('Value Field');
    const labelFieldLabel = screen.getByText('Label Field');

    expect(valueFieldLabel.parentElement?.textContent).toContain('*');
    expect(labelFieldLabel.parentElement?.textContent).toContain('*');
  });

  it('should call onUpdate with updated RefLinkConfig when saving with valid changes', () => {
    const onUpdate = vi.fn();
    render(<RefLinkEditPanel {...defaultProps} onUpdate={onUpdate} />);

    const valueFieldSelect = screen.getByTestId('value-field-select');
    const labelFieldSelect = screen.getByTestId('label-field-select');
    const saveButton = screen.getByTestId('save-button');

    fireEvent.change(valueFieldSelect, { target: { value: 'Department.code' } });
    fireEvent.change(labelFieldSelect, { target: { value: 'Department.code' } });
    fireEvent.click(saveButton);

    expect(onUpdate).toHaveBeenCalledWith({
      fieldPath: 'User.departmentId',
      resource: 'departments',
      valueField: 'Department.code',
      labelField: 'Department.code',
    });
  });

  it('should call onClose when Cancel button is clicked', () => {
    const onClose = vi.fn();
    render(<RefLinkEditPanel {...defaultProps} onClose={onClose} />);

    const cancelButton = screen.getByTestId('cancel-button');
    fireEvent.click(cancelButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('should not call onUpdate when Cancel button is clicked', () => {
    const onUpdate = vi.fn();
    render(<RefLinkEditPanel {...defaultProps} onUpdate={onUpdate} />);

    const cancelButton = screen.getByTestId('cancel-button');
    fireEvent.click(cancelButton);

    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('should show delete confirmation dialog when Delete button is clicked', () => {
    render(<RefLinkEditPanel {...defaultProps} />);

    const deleteButton = screen.getByTestId('delete-button');
    fireEvent.click(deleteButton);

    expect(screen.getByTestId('delete-confirmation')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete this ref link/)).toBeInTheDocument();
  });

  it('should call onDelete when deletion is confirmed', () => {
    const onDelete = vi.fn();
    render(<RefLinkEditPanel {...defaultProps} onDelete={onDelete} />);

    const deleteButton = screen.getByTestId('delete-button');
    fireEvent.click(deleteButton);

    const confirmDeleteButton = screen.getByTestId('confirm-delete-button');
    fireEvent.click(confirmDeleteButton);

    expect(onDelete).toHaveBeenCalled();
  });

  it('should hide delete confirmation dialog when cancel is clicked', () => {
    render(<RefLinkEditPanel {...defaultProps} />);

    const deleteButton = screen.getByTestId('delete-button');
    fireEvent.click(deleteButton);

    expect(screen.getByTestId('delete-confirmation')).toBeInTheDocument();

    const cancelDeleteButton = screen.getByTestId('cancel-delete-button');
    fireEvent.click(cancelDeleteButton);

    expect(screen.queryByTestId('delete-confirmation')).not.toBeInTheDocument();
  });

  it('should not call onDelete when deletion is cancelled', () => {
    const onDelete = vi.fn();
    render(<RefLinkEditPanel {...defaultProps} onDelete={onDelete} />);

    const deleteButton = screen.getByTestId('delete-button');
    fireEvent.click(deleteButton);

    const cancelDeleteButton = screen.getByTestId('cancel-delete-button');
    fireEvent.click(cancelDeleteButton);

    expect(onDelete).not.toHaveBeenCalled();
  });

  it('should disable Delete button when confirmation dialog is shown', () => {
    render(<RefLinkEditPanel {...defaultProps} />);

    const deleteButton = screen.getByTestId('delete-button') as HTMLButtonElement;
    expect(deleteButton.disabled).toBe(false);

    fireEvent.click(deleteButton);

    expect(deleteButton.disabled).toBe(true);
  });

  it('should display validation error when saving without selecting valueField', () => {
    render(<RefLinkEditPanel {...defaultProps} />);

    const valueFieldSelect = screen.getByTestId('value-field-select');
    fireEvent.change(valueFieldSelect, { target: { value: '' } });

    const saveButton = screen.getByTestId('save-button');
    fireEvent.click(saveButton);

    expect(screen.getByTestId('value-field-error')).toHaveTextContent('Value field is required');
    expect(defaultProps.onUpdate).not.toHaveBeenCalled();
  });

  it('should display validation error when saving without selecting labelField', () => {
    render(<RefLinkEditPanel {...defaultProps} />);

    const labelFieldSelect = screen.getByTestId('label-field-select');
    fireEvent.change(labelFieldSelect, { target: { value: '' } });

    const saveButton = screen.getByTestId('save-button');
    fireEvent.click(saveButton);

    expect(screen.getByTestId('label-field-error')).toHaveTextContent('Label field is required');
    expect(defaultProps.onUpdate).not.toHaveBeenCalled();
  });

  it('should display both validation errors when saving without selecting any fields', () => {
    render(<RefLinkEditPanel {...defaultProps} />);

    const valueFieldSelect = screen.getByTestId('value-field-select');
    const labelFieldSelect = screen.getByTestId('label-field-select');
    fireEvent.change(valueFieldSelect, { target: { value: '' } });
    fireEvent.change(labelFieldSelect, { target: { value: '' } });

    const saveButton = screen.getByTestId('save-button');
    fireEvent.click(saveButton);

    expect(screen.getByTestId('value-field-error')).toBeInTheDocument();
    expect(screen.getByTestId('label-field-error')).toBeInTheDocument();
    expect(defaultProps.onUpdate).not.toHaveBeenCalled();
  });

  it('should clear validation error when user selects a valueField', () => {
    render(<RefLinkEditPanel {...defaultProps} />);

    const valueFieldSelect = screen.getByTestId('value-field-select');
    fireEvent.change(valueFieldSelect, { target: { value: '' } });

    const saveButton = screen.getByTestId('save-button');
    fireEvent.click(saveButton);

    expect(screen.getByTestId('value-field-error')).toBeInTheDocument();

    fireEvent.change(valueFieldSelect, { target: { value: 'Department.id' } });

    expect(screen.queryByTestId('value-field-error')).not.toBeInTheDocument();
  });

  it('should clear validation error when user selects a labelField', () => {
    render(<RefLinkEditPanel {...defaultProps} />);

    const labelFieldSelect = screen.getByTestId('label-field-select');
    fireEvent.change(labelFieldSelect, { target: { value: '' } });

    const saveButton = screen.getByTestId('save-button');
    fireEvent.click(saveButton);

    expect(screen.getByTestId('label-field-error')).toBeInTheDocument();

    fireEvent.change(labelFieldSelect, { target: { value: 'Department.name' } });

    expect(screen.queryByTestId('label-field-error')).not.toBeInTheDocument();
  });

  it('should validate that only fields from target resource can be selected', () => {
    render(<RefLinkEditPanel {...defaultProps} />);

    const valueFieldSelect = screen.getByTestId('value-field-select') as HTMLSelectElement;
    const labelFieldSelect = screen.getByTestId('label-field-select') as HTMLSelectElement;

    // Verify that only target resource fields are available in dropdowns
    const valueOptions = Array.from(valueFieldSelect.options)
      .map((opt) => opt.value)
      .filter((val) => val !== ''); // Exclude empty option

    const labelOptions = Array.from(labelFieldSelect.options)
      .map((opt) => opt.value)
      .filter((val) => val !== ''); // Exclude empty option

    // All options should be from the target resource
    expect(valueOptions).toEqual(['Department.id', 'Department.name', 'Department.code']);
    expect(labelOptions).toEqual(['Department.id', 'Department.name', 'Department.code']);
  });

  it('should have proper ARIA attributes for accessibility', () => {
    render(<RefLinkEditPanel {...defaultProps} />);

    const valueFieldSelect = screen.getByTestId('value-field-select');
    const labelFieldSelect = screen.getByTestId('label-field-select');

    expect(valueFieldSelect).toHaveAttribute('aria-required', 'true');
    expect(labelFieldSelect).toHaveAttribute('aria-required', 'true');
  });

  it('should set aria-invalid when validation fails', () => {
    render(<RefLinkEditPanel {...defaultProps} />);

    const valueFieldSelect = screen.getByTestId('value-field-select');
    const labelFieldSelect = screen.getByTestId('label-field-select');
    fireEvent.change(valueFieldSelect, { target: { value: '' } });
    fireEvent.change(labelFieldSelect, { target: { value: '' } });

    const saveButton = screen.getByTestId('save-button');
    fireEvent.click(saveButton);

    expect(valueFieldSelect).toHaveAttribute('aria-invalid', 'true');
    expect(labelFieldSelect).toHaveAttribute('aria-invalid', 'true');
  });

  it('should display error messages with role="alert" for screen readers', () => {
    render(<RefLinkEditPanel {...defaultProps} />);

    const valueFieldSelect = screen.getByTestId('value-field-select');
    const labelFieldSelect = screen.getByTestId('label-field-select');
    fireEvent.change(valueFieldSelect, { target: { value: '' } });
    fireEvent.change(labelFieldSelect, { target: { value: '' } });

    const saveButton = screen.getByTestId('save-button');
    fireEvent.click(saveButton);

    const valueFieldError = screen.getByTestId('value-field-error');
    const labelFieldError = screen.getByTestId('label-field-error');

    expect(valueFieldError).toHaveAttribute('role', 'alert');
    expect(labelFieldError).toHaveAttribute('role', 'alert');
  });

  it('should allow saving without changes (same values)', () => {
    const onUpdate = vi.fn();
    render(<RefLinkEditPanel {...defaultProps} onUpdate={onUpdate} />);

    const saveButton = screen.getByTestId('save-button');
    fireEvent.click(saveButton);

    expect(onUpdate).toHaveBeenCalledWith({
      fieldPath: 'User.departmentId',
      resource: 'departments',
      valueField: 'Department.id',
      labelField: 'Department.name',
    });
  });
});
