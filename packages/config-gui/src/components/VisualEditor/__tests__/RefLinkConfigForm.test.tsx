import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RefLinkConfigForm } from '../RefLinkConfigForm';
import type { ResourceNode } from '../../../lib/spec-parser';

describe('RefLinkConfigForm', () => {
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

  const defaultProps = {
    fieldPath: 'User.departmentId',
    targetResource: mockTargetResource,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it('should render the form with source field and target resource', () => {
    render(<RefLinkConfigForm {...defaultProps} />);

    expect(screen.getByText('Configure Ref Link')).toBeInTheDocument();
    expect(screen.getByText('User.departmentId')).toBeInTheDocument();
    expect(screen.getByText('Departments')).toBeInTheDocument();
  });

  it('should display source field path as read-only', () => {
    render(<RefLinkConfigForm {...defaultProps} />);

    const sourceFieldDiv = screen.getByText('User.departmentId');
    expect(sourceFieldDiv).toHaveClass('bg-gray-100');
    expect(sourceFieldDiv.tagName).toBe('DIV');
  });

  it('should display target resource name as read-only', () => {
    render(<RefLinkConfigForm {...defaultProps} />);

    const targetResourceDiv = screen.getByText('Departments');
    expect(targetResourceDiv).toHaveClass('bg-gray-100');
    expect(targetResourceDiv.tagName).toBe('DIV');
  });

  it('should populate valueField dropdown with target resource fields', () => {
    render(<RefLinkConfigForm {...defaultProps} />);

    const valueFieldSelect = screen.getByTestId('value-field-select') as HTMLSelectElement;
    const options = Array.from(valueFieldSelect.options).map((opt) => opt.value);

    expect(options).toContain('Department.id');
    expect(options).toContain('Department.name');
    expect(options).toContain('Department.code');
  });

  it('should populate labelField dropdown with target resource fields', () => {
    render(<RefLinkConfigForm {...defaultProps} />);

    const labelFieldSelect = screen.getByTestId('label-field-select') as HTMLSelectElement;
    const options = Array.from(labelFieldSelect.options).map((opt) => opt.value);

    expect(options).toContain('Department.id');
    expect(options).toContain('Department.name');
    expect(options).toContain('Department.code');
  });

  it('should mark valueField and labelField as required with asterisks', () => {
    render(<RefLinkConfigForm {...defaultProps} />);

    const valueFieldLabel = screen.getByText('Value Field');
    const labelFieldLabel = screen.getByText('Label Field');

    expect(valueFieldLabel.parentElement?.textContent).toContain('*');
    expect(labelFieldLabel.parentElement?.textContent).toContain('*');
  });

  it('should display validation error when saving without selecting valueField', () => {
    render(<RefLinkConfigForm {...defaultProps} />);

    const saveButton = screen.getByTestId('save-button');
    fireEvent.click(saveButton);

    expect(screen.getByTestId('value-field-error')).toHaveTextContent('Value field is required');
    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  it('should display validation error when saving without selecting labelField', () => {
    render(<RefLinkConfigForm {...defaultProps} />);

    const saveButton = screen.getByTestId('save-button');
    fireEvent.click(saveButton);

    expect(screen.getByTestId('label-field-error')).toHaveTextContent('Label field is required');
    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  it('should display both validation errors when saving without selecting any fields', () => {
    render(<RefLinkConfigForm {...defaultProps} />);

    const saveButton = screen.getByTestId('save-button');
    fireEvent.click(saveButton);

    expect(screen.getByTestId('value-field-error')).toBeInTheDocument();
    expect(screen.getByTestId('label-field-error')).toBeInTheDocument();
    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  it('should clear validation error when user selects a valueField', () => {
    render(<RefLinkConfigForm {...defaultProps} />);

    const saveButton = screen.getByTestId('save-button');
    fireEvent.click(saveButton);

    expect(screen.getByTestId('value-field-error')).toBeInTheDocument();

    const valueFieldSelect = screen.getByTestId('value-field-select');
    fireEvent.change(valueFieldSelect, { target: { value: 'Department.id' } });

    expect(screen.queryByTestId('value-field-error')).not.toBeInTheDocument();
  });

  it('should clear validation error when user selects a labelField', () => {
    render(<RefLinkConfigForm {...defaultProps} />);

    const saveButton = screen.getByTestId('save-button');
    fireEvent.click(saveButton);

    expect(screen.getByTestId('label-field-error')).toBeInTheDocument();

    const labelFieldSelect = screen.getByTestId('label-field-select');
    fireEvent.change(labelFieldSelect, { target: { value: 'Department.name' } });

    expect(screen.queryByTestId('label-field-error')).not.toBeInTheDocument();
  });

  it('should call onConfirm with RefLinkConfig when saving with valid selections', () => {
    const onConfirm = vi.fn();
    render(<RefLinkConfigForm {...defaultProps} onConfirm={onConfirm} />);

    const valueFieldSelect = screen.getByTestId('value-field-select');
    const labelFieldSelect = screen.getByTestId('label-field-select');
    const saveButton = screen.getByTestId('save-button');

    fireEvent.change(valueFieldSelect, { target: { value: 'Department.id' } });
    fireEvent.change(labelFieldSelect, { target: { value: 'Department.name' } });
    fireEvent.click(saveButton);

    expect(onConfirm).toHaveBeenCalledWith({
      fieldPath: 'User.departmentId',
      resource: 'departments',
      valueField: 'Department.id',
      labelField: 'Department.name',
    });
  });

  it('should call onCancel when Cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<RefLinkConfigForm {...defaultProps} onCancel={onCancel} />);

    const cancelButton = screen.getByTestId('cancel-button');
    fireEvent.click(cancelButton);

    expect(onCancel).toHaveBeenCalled();
  });

  it('should not call onConfirm when Cancel button is clicked', () => {
    const onConfirm = vi.fn();
    render(<RefLinkConfigForm {...defaultProps} onConfirm={onConfirm} />);

    const cancelButton = screen.getByTestId('cancel-button');
    fireEvent.click(cancelButton);

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('should validate that only fields from target resource can be selected', () => {
    render(<RefLinkConfigForm {...defaultProps} />);

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

    // Select valid fields and verify save works
    fireEvent.change(valueFieldSelect, { target: { value: 'Department.id' } });
    fireEvent.change(labelFieldSelect, { target: { value: 'Department.name' } });

    const saveButton = screen.getByTestId('save-button');
    fireEvent.click(saveButton);

    expect(defaultProps.onConfirm).toHaveBeenCalled();
  });

  it('should have proper ARIA attributes for accessibility', () => {
    render(<RefLinkConfigForm {...defaultProps} />);

    const valueFieldSelect = screen.getByTestId('value-field-select');
    const labelFieldSelect = screen.getByTestId('label-field-select');

    expect(valueFieldSelect).toHaveAttribute('aria-required', 'true');
    expect(labelFieldSelect).toHaveAttribute('aria-required', 'true');
  });

  it('should set aria-invalid when validation fails', () => {
    render(<RefLinkConfigForm {...defaultProps} />);

    const saveButton = screen.getByTestId('save-button');
    fireEvent.click(saveButton);

    const valueFieldSelect = screen.getByTestId('value-field-select');
    const labelFieldSelect = screen.getByTestId('label-field-select');

    expect(valueFieldSelect).toHaveAttribute('aria-invalid', 'true');
    expect(labelFieldSelect).toHaveAttribute('aria-invalid', 'true');
  });

  it('should display error messages with role="alert" for screen readers', () => {
    render(<RefLinkConfigForm {...defaultProps} />);

    const saveButton = screen.getByTestId('save-button');
    fireEvent.click(saveButton);

    const valueFieldError = screen.getByTestId('value-field-error');
    const labelFieldError = screen.getByTestId('label-field-error');

    expect(valueFieldError).toHaveAttribute('role', 'alert');
    expect(labelFieldError).toHaveAttribute('role', 'alert');
  });
});
