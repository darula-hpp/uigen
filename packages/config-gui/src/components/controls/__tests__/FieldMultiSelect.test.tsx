import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FieldMultiSelect } from '../FieldMultiSelect.js';
import type { FieldOption } from '../../../lib/chart-utils.js';

describe('FieldMultiSelect', () => {
  const mockFields: FieldOption[] = [
    { value: 'id', label: 'ID', type: 'number' },
    { value: 'name', label: 'Name', type: 'string' },
    { value: 'revenue', label: 'Revenue', type: 'number' },
    { value: 'createdAt', label: 'Created At', type: 'string', format: 'date-time' },
    { value: 'isActive', label: 'Is Active', type: 'boolean' }
  ];

  describe('Rendering', () => {
    it('renders with label and description', () => {
      render(
        <FieldMultiSelect
          fields={mockFields}
          value={[]}
          onChange={vi.fn()}
          label="Y-Axis Fields"
          description="Select one or more fields for the y-axis"
        />
      );
      
      expect(screen.getByText('Y-Axis Fields')).toBeInTheDocument();
      expect(screen.getByText('Select one or more fields for the y-axis')).toBeInTheDocument();
    });
    
    it('renders required indicator when required prop is true', () => {
      render(
        <FieldMultiSelect
          fields={mockFields}
          value={[]}
          onChange={vi.fn()}
          label="Y-Axis Fields"
          required
        />
      );
      
      expect(screen.getByText('*')).toBeInTheDocument();
    });
    
    it('shows mode toggle button when allowSingle is true', () => {
      render(
        <FieldMultiSelect
          fields={mockFields}
          value={[]}
          onChange={vi.fn()}
          label="Y-Axis Fields"
          allowSingle
        />
      );
      
      // Empty array initializes in multiple mode, so button shows "Single Only"
      expect(screen.getByText('Single Only')).toBeInTheDocument();
    });
    
    it('does not show mode toggle when allowSingle is false', () => {
      render(
        <FieldMultiSelect
          fields={mockFields}
          value={[]}
          onChange={vi.fn()}
          label="Y-Axis Fields"
          allowSingle={false}
        />
      );
      
      expect(screen.queryByText('Enable Multiple')).not.toBeInTheDocument();
      expect(screen.queryByText('Single Only')).not.toBeInTheDocument();
    });
    
    it('shows "Select field(s)" when no fields are selected', () => {
      render(
        <FieldMultiSelect
          fields={mockFields}
          value={[]}
          onChange={vi.fn()}
          label="Y-Axis Fields"
        />
      );
      
      expect(screen.getByText('Select field(s)')).toBeInTheDocument();
    });
    
    it('shows count of selected fields in button', () => {
      render(
        <FieldMultiSelect
          fields={mockFields}
          value={['revenue', 'id']}
          onChange={vi.fn()}
          label="Y-Axis Fields"
        />
      );
      
      expect(screen.getByText('2 fields selected')).toBeInTheDocument();
    });
    
    it('shows singular "field" when one field is selected', () => {
      render(
        <FieldMultiSelect
          fields={mockFields}
          value={['revenue']}
          onChange={vi.fn()}
          label="Y-Axis Fields"
        />
      );
      
      expect(screen.getByText('1 field selected')).toBeInTheDocument();
    });
  });

  describe('Single Selection Mode', () => {
    it('initializes in single mode when value is a string', () => {
      render(
        <FieldMultiSelect
          fields={mockFields}
          value="revenue"
          onChange={vi.fn()}
          label="Y-Axis Fields"
        />
      );
      
      expect(screen.getByText('Enable Multiple')).toBeInTheDocument();
    });
    
    it('displays single selected field as chip', () => {
      render(
        <FieldMultiSelect
          fields={mockFields}
          value="revenue"
          onChange={vi.fn()}
          label="Y-Axis Fields"
        />
      );
      
      expect(screen.getByText('Revenue')).toBeInTheDocument();
    });
    
    it('replaces selection when clicking another field in single mode', () => {
      const onChange = vi.fn();
      render(
        <FieldMultiSelect
          fields={mockFields}
          value="revenue"
          onChange={onChange}
          label="Y-Axis Fields"
        />
      );
      
      // Open dropdown
      const button = screen.getByRole('button', { name: 'Y-Axis Fields' });
      fireEvent.click(button);
      
      // Click on "ID" label to select it
      const idLabel = screen.getByLabelText('ID').closest('label');
      if (idLabel) {
        fireEvent.click(idLabel);
      }
      
      expect(onChange).toHaveBeenCalledWith('id');
    });
    
    it('closes dropdown after selection in single mode', () => {
      render(
        <FieldMultiSelect
          fields={mockFields}
          value="revenue"
          onChange={vi.fn()}
          label="Y-Axis Fields"
        />
      );
      
      // Open dropdown
      const button = screen.getByRole('button', { name: 'Y-Axis Fields' });
      fireEvent.click(button);
      
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      
      // Click on "ID" label to select it
      const idLabel = screen.getByLabelText('ID').closest('label');
      if (idLabel) {
        fireEvent.click(idLabel);
      }
      
      // Dropdown should close
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('Multiple Selection Mode', () => {
    it('initializes in multiple mode when value is an array', () => {
      render(
        <FieldMultiSelect
          fields={mockFields}
          value={['revenue', 'id']}
          onChange={vi.fn()}
          label="Y-Axis Fields"
        />
      );
      
      expect(screen.getByText('Single Only')).toBeInTheDocument();
    });
    
    it('displays multiple selected fields as chips', () => {
      render(
        <FieldMultiSelect
          fields={mockFields}
          value={['revenue', 'id']}
          onChange={vi.fn()}
          label="Y-Axis Fields"
        />
      );
      
      expect(screen.getByText('Revenue')).toBeInTheDocument();
      expect(screen.getByText('ID')).toBeInTheDocument();
    });
    
    it('adds field to selection when clicking unchecked field', () => {
      const onChange = vi.fn();
      render(
        <FieldMultiSelect
          fields={mockFields}
          value={['revenue']}
          onChange={onChange}
          label="Y-Axis Fields"
        />
      );
      
      // Open dropdown
      const button = screen.getByRole('button', { name: 'Y-Axis Fields' });
      fireEvent.click(button);
      
      // Click on "ID" checkbox
      const idCheckbox = screen.getByLabelText('ID') as HTMLInputElement;
      fireEvent.click(idCheckbox);
      
      expect(onChange).toHaveBeenCalledWith(['revenue', 'id']);
    });
    
    it('removes field from selection when clicking checked field', () => {
      const onChange = vi.fn();
      render(
        <FieldMultiSelect
          fields={mockFields}
          value={['revenue', 'id']}
          onChange={onChange}
          label="Y-Axis Fields"
        />
      );
      
      // Open dropdown
      const button = screen.getByRole('button', { name: 'Y-Axis Fields' });
      fireEvent.click(button);
      
      // Click on "Revenue" checkbox to uncheck
      const revenueCheckbox = screen.getByLabelText('Revenue') as HTMLInputElement;
      fireEvent.click(revenueCheckbox);
      
      expect(onChange).toHaveBeenCalledWith(['id']);
    });
    
    it('keeps dropdown open after selection in multiple mode', () => {
      render(
        <FieldMultiSelect
          fields={mockFields}
          value={['revenue']}
          onChange={vi.fn()}
          label="Y-Axis Fields"
        />
      );
      
      // Open dropdown
      const button = screen.getByRole('button', { name: 'Y-Axis Fields' });
      fireEvent.click(button);
      
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      
      // Click on "ID" checkbox
      const idCheckbox = screen.getByLabelText('ID');
      fireEvent.change(idCheckbox, { target: { checked: true } });
      
      // Dropdown should remain open
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
  });

  describe('Chip Display and Removal', () => {
    it('displays field type icons in chips', () => {
      render(
        <FieldMultiSelect
          fields={mockFields}
          value={['revenue', 'name']}
          onChange={vi.fn()}
          label="Y-Axis Fields"
        />
      );
      
      // Check for number icon (🔢) and string icon (📝)
      const chips = screen.getAllByRole('button', { name: /Remove/ });
      expect(chips.length).toBe(2);
    });
    
    it('removes field when clicking chip remove button', () => {
      const onChange = vi.fn();
      render(
        <FieldMultiSelect
          fields={mockFields}
          value={['revenue', 'id']}
          onChange={onChange}
          label="Y-Axis Fields"
        />
      );
      
      // Click remove button for "Revenue"
      const removeButton = screen.getByRole('button', { name: 'Remove Revenue' });
      fireEvent.click(removeButton);
      
      expect(onChange).toHaveBeenCalledWith(['id']);
    });
    
    it('removes field in single mode when clicking chip remove button', () => {
      const onChange = vi.fn();
      render(
        <FieldMultiSelect
          fields={mockFields}
          value="revenue"
          onChange={onChange}
          label="Y-Axis Fields"
        />
      );
      
      // Click remove button
      const removeButton = screen.getByRole('button', { name: 'Remove Revenue' });
      fireEvent.click(removeButton);
      
      expect(onChange).toHaveBeenCalledWith('');
    });
  });

  describe('Mode Toggle', () => {
    it('switches from single to multiple mode', () => {
      const onChange = vi.fn();
      render(
        <FieldMultiSelect
          fields={mockFields}
          value="revenue"
          onChange={onChange}
          label="Y-Axis Fields"
        />
      );
      
      // Click mode toggle
      const toggleButton = screen.getByText('Enable Multiple');
      fireEvent.click(toggleButton);
      
      // Should call onChange with array
      expect(onChange).toHaveBeenCalledWith(['revenue']);
      
      // Button text should change
      expect(screen.getByText('Single Only')).toBeInTheDocument();
    });
    
    it('switches from multiple to single mode keeping first selection', () => {
      const onChange = vi.fn();
      render(
        <FieldMultiSelect
          fields={mockFields}
          value={['revenue', 'id']}
          onChange={onChange}
          label="Y-Axis Fields"
        />
      );
      
      // Click mode toggle
      const toggleButton = screen.getByText('Single Only');
      fireEvent.click(toggleButton);
      
      // Should call onChange with first field as string
      expect(onChange).toHaveBeenCalledWith('revenue');
      
      // Button text should change
      expect(screen.getByText('Enable Multiple')).toBeInTheDocument();
    });
    
    it('switches to single mode with empty string when no selections', () => {
      const onChange = vi.fn();
      render(
        <FieldMultiSelect
          fields={mockFields}
          value={[]}
          onChange={onChange}
          label="Y-Axis Fields"
        />
      );
      
      // Click mode toggle
      const toggleButton = screen.getByText('Single Only');
      fireEvent.click(toggleButton);
      
      expect(onChange).toHaveBeenCalledWith('');
    });
  });

  describe('Dropdown Interaction', () => {
    it('opens dropdown when clicking button', () => {
      render(
        <FieldMultiSelect
          fields={mockFields}
          value={[]}
          onChange={vi.fn()}
          label="Y-Axis Fields"
        />
      );
      
      const button = screen.getByRole('button', { name: 'Y-Axis Fields' });
      fireEvent.click(button);
      
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
    
    it('closes dropdown when clicking button again', () => {
      render(
        <FieldMultiSelect
          fields={mockFields}
          value={[]}
          onChange={vi.fn()}
          label="Y-Axis Fields"
        />
      );
      
      const button = screen.getByRole('button', { name: 'Y-Axis Fields' });
      
      // Open
      fireEvent.click(button);
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      
      // Close
      fireEvent.click(button);
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
    
    it('closes dropdown when clicking outside', async () => {
      render(
        <div>
          <div data-testid="outside">Outside</div>
          <FieldMultiSelect
            fields={mockFields}
            value={[]}
            onChange={vi.fn()}
            label="Y-Axis Fields"
          />
        </div>
      );
      
      const button = screen.getByRole('button', { name: 'Y-Axis Fields' });
      fireEvent.click(button);
      
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      
      // Click outside
      const outside = screen.getByTestId('outside');
      fireEvent.mouseDown(outside);
      
      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });
    
    it('displays all fields in dropdown', () => {
      render(
        <FieldMultiSelect
          fields={mockFields}
          value={[]}
          onChange={vi.fn()}
          label="Y-Axis Fields"
        />
      );
      
      const button = screen.getByRole('button', { name: 'Y-Axis Fields' });
      fireEvent.click(button);
      
      mockFields.forEach(field => {
        expect(screen.getByLabelText(field.label)).toBeInTheDocument();
      });
    });
    
    it('shows checked state for selected fields', () => {
      render(
        <FieldMultiSelect
          fields={mockFields}
          value={['revenue', 'id']}
          onChange={vi.fn()}
          label="Y-Axis Fields"
        />
      );
      
      const button = screen.getByRole('button', { name: 'Y-Axis Fields' });
      fireEvent.click(button);
      
      const revenueCheckbox = screen.getByLabelText('Revenue') as HTMLInputElement;
      const idCheckbox = screen.getByLabelText('ID') as HTMLInputElement;
      const nameCheckbox = screen.getByLabelText('Name') as HTMLInputElement;
      
      expect(revenueCheckbox.checked).toBe(true);
      expect(idCheckbox.checked).toBe(true);
      expect(nameCheckbox.checked).toBe(false);
    });
  });

  describe('Validation Error Display', () => {
    it('displays validation error message', () => {
      render(
        <FieldMultiSelect
          fields={mockFields}
          value={[]}
          onChange={vi.fn()}
          label="Y-Axis Fields"
          error="Y-axis field is required"
        />
      );
      
      expect(screen.getByText('Y-axis field is required')).toBeInTheDocument();
    });
    
    it('applies error styling when error is present', () => {
      render(
        <FieldMultiSelect
          fields={mockFields}
          value={[]}
          onChange={vi.fn()}
          label="Y-Axis Fields"
          error="Y-axis field is required"
          id="test-field"
        />
      );
      
      const button = screen.getByRole('button', { name: 'Y-Axis Fields' });
      expect(button).toHaveClass('border-red-500');
    });
  });

  describe('Disabled State', () => {
    it('disables button when no fields are available', () => {
      render(
        <FieldMultiSelect
          fields={[]}
          value={[]}
          onChange={vi.fn()}
          label="Y-Axis Fields"
        />
      );
      
      const button = screen.getByRole('button', { name: 'Y-Axis Fields' });
      expect(button).toBeDisabled();
    });
    
    it('shows "No fields available" when fields array is empty', () => {
      render(
        <FieldMultiSelect
          fields={[]}
          value={[]}
          onChange={vi.fn()}
          label="Y-Axis Fields"
        />
      );
      
      expect(screen.getByText('No fields available')).toBeInTheDocument();
    });
    
    it('shows warning message when no fields are available', () => {
      render(
        <FieldMultiSelect
          fields={[]}
          value={[]}
          onChange={vi.fn()}
          label="Y-Axis Fields"
        />
      );
      
      expect(screen.getByText('Array items must be objects with fields to configure charts')).toBeInTheDocument();
    });
    
    it('does not show mode toggle when no fields are available', () => {
      render(
        <FieldMultiSelect
          fields={[]}
          value={[]}
          onChange={vi.fn()}
          label="Y-Axis Fields"
          allowSingle
        />
      );
      
      expect(screen.queryByText('Enable Multiple')).not.toBeInTheDocument();
      expect(screen.queryByText('Single Only')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(
        <FieldMultiSelect
          fields={mockFields}
          value={[]}
          onChange={vi.fn()}
          label="Y-Axis Fields"
          id="test-field"
        />
      );
      
      const button = screen.getByRole('button', { name: 'Y-Axis Fields' });
      expect(button).toHaveAttribute('aria-label', 'Y-Axis Fields');
    });
    
    it('sets aria-required when required prop is true', () => {
      render(
        <FieldMultiSelect
          fields={mockFields}
          value={[]}
          onChange={vi.fn()}
          label="Y-Axis Fields"
          required
        />
      );
      
      const button = screen.getByRole('button', { name: 'Y-Axis Fields' });
      expect(button).toHaveAttribute('aria-required', 'true');
    });
    
    it('sets aria-invalid when there is an error', () => {
      render(
        <FieldMultiSelect
          fields={mockFields}
          value={[]}
          onChange={vi.fn()}
          label="Y-Axis Fields"
          error="Y-axis field is required"
        />
      );
      
      const button = screen.getByRole('button', { name: 'Y-Axis Fields' });
      expect(button).toHaveAttribute('aria-invalid', 'true');
    });
    
    it('sets aria-haspopup and aria-expanded', () => {
      render(
        <FieldMultiSelect
          fields={mockFields}
          value={[]}
          onChange={vi.fn()}
          label="Y-Axis Fields"
        />
      );
      
      const button = screen.getByRole('button', { name: 'Y-Axis Fields' });
      expect(button).toHaveAttribute('aria-haspopup', 'listbox');
      expect(button).toHaveAttribute('aria-expanded', 'false');
      
      // Open dropdown
      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });
    
    it('associates error message with button via aria-describedby', () => {
      render(
        <FieldMultiSelect
          fields={mockFields}
          value={[]}
          onChange={vi.fn()}
          label="Y-Axis Fields"
          error="Y-axis field is required"
          id="test-field"
        />
      );
      
      const button = screen.getByRole('button', { name: 'Y-Axis Fields' });
      expect(button).toHaveAttribute('aria-describedby', 'test-field-error');
      
      const errorElement = screen.getByText('Y-axis field is required');
      expect(errorElement).toHaveAttribute('id', 'test-field-error');
    });
    
    it('error message has role="alert"', () => {
      render(
        <FieldMultiSelect
          fields={mockFields}
          value={[]}
          onChange={vi.fn()}
          label="Y-Axis Fields"
          error="Y-axis field is required"
        />
      );
      
      const errorElement = screen.getByText('Y-axis field is required');
      expect(errorElement).toHaveAttribute('role', 'alert');
    });
    
    it('dropdown has role="listbox"', () => {
      render(
        <FieldMultiSelect
          fields={mockFields}
          value={[]}
          onChange={vi.fn()}
          label="Y-Axis Fields"
        />
      );
      
      const button = screen.getByRole('button', { name: 'Y-Axis Fields' });
      fireEvent.click(button);
      
      const dropdown = screen.getByRole('listbox');
      expect(dropdown).toHaveAttribute('aria-label', 'Y-Axis Fields options');
    });
  });

  describe('Custom ID', () => {
    it('uses custom id when provided', () => {
      render(
        <FieldMultiSelect
          fields={mockFields}
          value={[]}
          onChange={vi.fn()}
          label="Y-Axis Fields"
          id="custom-field-id"
        />
      );
      
      const button = screen.getByRole('button', { name: 'Y-Axis Fields' });
      expect(button).toHaveAttribute('id', 'custom-field-id');
    });
    
    it('uses default id when not provided', () => {
      render(
        <FieldMultiSelect
          fields={mockFields}
          value={[]}
          onChange={vi.fn()}
          label="Y-Axis Fields"
        />
      );
      
      const button = screen.getByRole('button', { name: 'Y-Axis Fields' });
      expect(button).toHaveAttribute('id', 'field-multi-select');
    });
  });
});
