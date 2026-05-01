import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FieldDropdown } from '../FieldDropdown.js';
import type { FieldOption } from '../../../lib/chart-utils.js';

describe('FieldDropdown', () => {
  const mockFields: FieldOption[] = [
    { value: 'id', label: 'ID', type: 'number' },
    { value: 'name', label: 'Name', type: 'string' },
    { value: 'createdAt', label: 'Created At', type: 'string', format: 'date-time' },
    { value: 'isActive', label: 'Is Active', type: 'boolean' },
    { value: 'count', label: 'Count', type: 'integer' }
  ];

  describe('Rendering', () => {
    it('renders with label and description', () => {
      render(
        <FieldDropdown
          fields={mockFields}
          value="name"
          onChange={vi.fn()}
          label="X-Axis Field"
          description="Select the field for the x-axis"
        />
      );
      
      expect(screen.getByText('X-Axis Field')).toBeInTheDocument();
      expect(screen.getByText('Select the field for the x-axis')).toBeInTheDocument();
    });
    
    it('renders required indicator when required prop is true', () => {
      render(
        <FieldDropdown
          fields={mockFields}
          value="name"
          onChange={vi.fn()}
          label="X-Axis Field"
          required
        />
      );
      
      expect(screen.getByText('*')).toBeInTheDocument();
    });
    
    it('renders select element with available fields', () => {
      render(
        <FieldDropdown
          fields={mockFields}
          value="name"
          onChange={vi.fn()}
          label="X-Axis Field"
        />
      );
      
      const select = screen.getByLabelText('X-Axis Field') as HTMLSelectElement;
      expect(select).toBeInTheDocument();
      
      // Check that all fields are rendered as options
      mockFields.forEach(field => {
        expect(screen.getByText(new RegExp(field.label))).toBeInTheDocument();
      });
    });
    
    it('displays field type icons next to labels', () => {
      render(
        <FieldDropdown
          fields={mockFields}
          value="name"
          onChange={vi.fn()}
          label="X-Axis Field"
        />
      );
      
      // Check that options contain icons (emojis)
      const select = screen.getByLabelText('X-Axis Field') as HTMLSelectElement;
      const options = Array.from(select.options);
      
      // Find the "Name" option and check it has an icon
      const nameOption = options.find(opt => opt.value === 'name');
      expect(nameOption?.textContent).toMatch(/📝.*Name/);
      
      // Find the "ID" option and check it has a number icon
      const idOption = options.find(opt => opt.value === 'id');
      expect(idOption?.textContent).toMatch(/🔢.*ID/);
    });
    
    it('shows selected value', () => {
      render(
        <FieldDropdown
          fields={mockFields}
          value="name"
          onChange={vi.fn()}
          label="X-Axis Field"
        />
      );
      
      const select = screen.getByLabelText('X-Axis Field') as HTMLSelectElement;
      expect(select.value).toBe('name');
    });
    
    it('shows "Select a field" option when no value is selected', () => {
      render(
        <FieldDropdown
          fields={mockFields}
          value=""
          onChange={vi.fn()}
          label="X-Axis Field"
        />
      );
      
      expect(screen.getByText('Select a field')).toBeInTheDocument();
    });
  });

  describe('Selection Changes', () => {
    it('calls onChange with selected field value', () => {
      const onChange = vi.fn();
      render(
        <FieldDropdown
          fields={mockFields}
          value="name"
          onChange={onChange}
          label="X-Axis Field"
        />
      );
      
      const select = screen.getByLabelText('X-Axis Field');
      fireEvent.change(select, { target: { value: 'id' } });
      
      expect(onChange).toHaveBeenCalledWith('id');
    });
    
    it('calls onChange when selecting from empty value', () => {
      const onChange = vi.fn();
      render(
        <FieldDropdown
          fields={mockFields}
          value=""
          onChange={onChange}
          label="X-Axis Field"
        />
      );
      
      const select = screen.getByLabelText('X-Axis Field');
      fireEvent.change(select, { target: { value: 'createdAt' } });
      
      expect(onChange).toHaveBeenCalledWith('createdAt');
    });
  });

  describe('Validation Error Display', () => {
    it('displays validation error message', () => {
      render(
        <FieldDropdown
          fields={mockFields}
          value=""
          onChange={vi.fn()}
          label="X-Axis Field"
          error="X-axis field is required"
        />
      );
      
      expect(screen.getByText('X-axis field is required')).toBeInTheDocument();
    });
    
    it('applies error styling when error is present', () => {
      render(
        <FieldDropdown
          fields={mockFields}
          value=""
          onChange={vi.fn()}
          label="X-Axis Field"
          error="X-axis field is required"
          id="test-field"
        />
      );
      
      const select = screen.getByLabelText('X-Axis Field');
      expect(select).toHaveClass('border-red-500');
    });
    
    it('does not show error message when error prop is undefined', () => {
      render(
        <FieldDropdown
          fields={mockFields}
          value="name"
          onChange={vi.fn()}
          label="X-Axis Field"
        />
      );
      
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('disables select when no fields are available', () => {
      render(
        <FieldDropdown
          fields={[]}
          value=""
          onChange={vi.fn()}
          label="X-Axis Field"
        />
      );
      
      const select = screen.getByLabelText('X-Axis Field');
      expect(select).toBeDisabled();
    });
    
    it('shows "No fields available" option when fields array is empty', () => {
      render(
        <FieldDropdown
          fields={[]}
          value=""
          onChange={vi.fn()}
          label="X-Axis Field"
        />
      );
      
      expect(screen.getByText('No fields available')).toBeInTheDocument();
    });
    
    it('shows warning message when no fields are available', () => {
      render(
        <FieldDropdown
          fields={[]}
          value=""
          onChange={vi.fn()}
          label="X-Axis Field"
        />
      );
      
      expect(screen.getByText('Array items must be objects with fields to configure charts')).toBeInTheDocument();
    });
    
    it('does not disable select when fields are available', () => {
      render(
        <FieldDropdown
          fields={mockFields}
          value="name"
          onChange={vi.fn()}
          label="X-Axis Field"
        />
      );
      
      const select = screen.getByLabelText('X-Axis Field');
      expect(select).not.toBeDisabled();
    });
    
    it('does not show warning when fields are available', () => {
      render(
        <FieldDropdown
          fields={mockFields}
          value="name"
          onChange={vi.fn()}
          label="X-Axis Field"
        />
      );
      
      expect(screen.queryByText('Array items must be objects with fields to configure charts')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(
        <FieldDropdown
          fields={mockFields}
          value="name"
          onChange={vi.fn()}
          label="X-Axis Field"
          id="test-field"
        />
      );
      
      const select = screen.getByLabelText('X-Axis Field');
      expect(select).toHaveAttribute('aria-label', 'X-Axis Field');
    });
    
    it('sets aria-required when required prop is true', () => {
      render(
        <FieldDropdown
          fields={mockFields}
          value="name"
          onChange={vi.fn()}
          label="X-Axis Field"
          required
        />
      );
      
      const select = screen.getByLabelText('X-Axis Field');
      expect(select).toHaveAttribute('aria-required', 'true');
    });
    
    it('sets aria-invalid when there is an error', () => {
      render(
        <FieldDropdown
          fields={mockFields}
          value=""
          onChange={vi.fn()}
          label="X-Axis Field"
          error="X-axis field is required"
        />
      );
      
      const select = screen.getByLabelText('X-Axis Field');
      expect(select).toHaveAttribute('aria-invalid', 'true');
    });
    
    it('associates error message with select via aria-describedby', () => {
      render(
        <FieldDropdown
          fields={mockFields}
          value=""
          onChange={vi.fn()}
          label="X-Axis Field"
          error="X-axis field is required"
          id="test-field"
        />
      );
      
      const select = screen.getByLabelText('X-Axis Field');
      expect(select).toHaveAttribute('aria-describedby', 'test-field-error');
      
      const errorElement = screen.getByText('X-axis field is required');
      expect(errorElement).toHaveAttribute('id', 'test-field-error');
    });
    
    it('error message has role="alert"', () => {
      render(
        <FieldDropdown
          fields={mockFields}
          value=""
          onChange={vi.fn()}
          label="X-Axis Field"
          error="X-axis field is required"
        />
      );
      
      const errorElement = screen.getByText('X-axis field is required');
      expect(errorElement).toHaveAttribute('role', 'alert');
    });
  });

  describe('Field Type Icons', () => {
    it('shows correct icon for string fields', () => {
      render(
        <FieldDropdown
          fields={[{ value: 'name', label: 'Name', type: 'string' }]}
          value="name"
          onChange={vi.fn()}
          label="Field"
        />
      );
      
      const select = screen.getByLabelText('Field') as HTMLSelectElement;
      const option = select.options[0];
      expect(option.textContent).toMatch(/📝/);
    });
    
    it('shows correct icon for number fields', () => {
      render(
        <FieldDropdown
          fields={[{ value: 'count', label: 'Count', type: 'number' }]}
          value="count"
          onChange={vi.fn()}
          label="Field"
        />
      );
      
      const select = screen.getByLabelText('Field') as HTMLSelectElement;
      const option = select.options[0];
      expect(option.textContent).toMatch(/🔢/);
    });
    
    it('shows correct icon for integer fields', () => {
      render(
        <FieldDropdown
          fields={[{ value: 'id', label: 'ID', type: 'integer' }]}
          value="id"
          onChange={vi.fn()}
          label="Field"
        />
      );
      
      const select = screen.getByLabelText('Field') as HTMLSelectElement;
      const option = select.options[0];
      expect(option.textContent).toMatch(/🔢/);
    });
    
    it('shows correct icon for boolean fields', () => {
      render(
        <FieldDropdown
          fields={[{ value: 'active', label: 'Active', type: 'boolean' }]}
          value="active"
          onChange={vi.fn()}
          label="Field"
        />
      );
      
      const select = screen.getByLabelText('Field') as HTMLSelectElement;
      const option = select.options[0];
      expect(option.textContent).toMatch(/✓/);
    });
    
    it('shows correct icon for date fields', () => {
      render(
        <FieldDropdown
          fields={[{ value: 'created', label: 'Created', type: 'date' }]}
          value="created"
          onChange={vi.fn()}
          label="Field"
        />
      );
      
      const select = screen.getByLabelText('Field') as HTMLSelectElement;
      const option = select.options[0];
      expect(option.textContent).toMatch(/📅/);
    });
    
    it('shows correct icon for array fields', () => {
      render(
        <FieldDropdown
          fields={[{ value: 'items', label: 'Items', type: 'array' }]}
          value="items"
          onChange={vi.fn()}
          label="Field"
        />
      );
      
      const select = screen.getByLabelText('Field') as HTMLSelectElement;
      const option = select.options[0];
      expect(option.textContent).toMatch(/📋/);
    });
    
    it('shows correct icon for object fields', () => {
      render(
        <FieldDropdown
          fields={[{ value: 'data', label: 'Data', type: 'object' }]}
          value="data"
          onChange={vi.fn()}
          label="Field"
        />
      );
      
      const select = screen.getByLabelText('Field') as HTMLSelectElement;
      const option = select.options[0];
      expect(option.textContent).toMatch(/📦/);
    });
  });

  describe('Custom ID', () => {
    it('uses custom id when provided', () => {
      render(
        <FieldDropdown
          fields={mockFields}
          value="name"
          onChange={vi.fn()}
          label="X-Axis Field"
          id="custom-field-id"
        />
      );
      
      const select = screen.getByLabelText('X-Axis Field');
      expect(select).toHaveAttribute('id', 'custom-field-id');
    });
    
    it('uses default id when not provided', () => {
      render(
        <FieldDropdown
          fields={mockFields}
          value="name"
          onChange={vi.fn()}
          label="X-Axis Field"
        />
      );
      
      const select = screen.getByLabelText('X-Axis Field');
      expect(select).toHaveAttribute('id', 'field-dropdown');
    });
  });
});
