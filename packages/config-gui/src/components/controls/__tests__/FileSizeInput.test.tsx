import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileSizeInput } from '../FileSizeInput.js';

describe('FileSizeInput', () => {
  describe('Rendering', () => {
    it('renders with label and description', () => {
      render(
        <FileSizeInput
          value={5242880}
          onChange={vi.fn()}
          label="Maximum File Size"
          description="Set the maximum allowed file size"
        />
      );
      
      expect(screen.getByText('Maximum File Size')).toBeInTheDocument();
      expect(screen.getByText('Set the maximum allowed file size')).toBeInTheDocument();
    });
    
    it('renders required indicator when required prop is true', () => {
      render(
        <FileSizeInput
          value={5242880}
          onChange={vi.fn()}
          label="Maximum File Size"
          required
        />
      );
      
      expect(screen.getByText('*')).toBeInTheDocument();
    });
    
    it('renders number input and unit selector', () => {
      render(
        <FileSizeInput
          value={5242880}
          onChange={vi.fn()}
          label="Maximum File Size"
        />
      );
      
      const numberInput = screen.getByLabelText('Maximum File Size value');
      const unitSelector = screen.getByLabelText('Size unit');
      
      expect(numberInput).toBeInTheDocument();
      expect(unitSelector).toBeInTheDocument();
    });
  });
  
  describe('Unit Conversion on Mount', () => {
    it('converts bytes to MB and displays correctly', () => {
      render(
        <FileSizeInput
          value={5242880} // 5 MB
          onChange={vi.fn()}
          label="Maximum File Size"
        />
      );
      
      const input = screen.getByLabelText('Maximum File Size value') as HTMLInputElement;
      const select = screen.getByLabelText('Size unit') as HTMLSelectElement;
      
      expect(input.value).toBe('5');
      expect(select.value).toBe('MB');
    });
    
    it('converts bytes to GB for large values', () => {
      render(
        <FileSizeInput
          value={1073741824} // 1 GB
          onChange={vi.fn()}
          label="Maximum File Size"
        />
      );
      
      const input = screen.getByLabelText('Maximum File Size value') as HTMLInputElement;
      const select = screen.getByLabelText('Size unit') as HTMLSelectElement;
      
      expect(input.value).toBe('1');
      expect(select.value).toBe('GB');
    });
    
    it('converts bytes to KB for small values', () => {
      render(
        <FileSizeInput
          value={102400} // 100 KB
          onChange={vi.fn()}
          label="Maximum File Size"
        />
      );
      
      const input = screen.getByLabelText('Maximum File Size value') as HTMLInputElement;
      const select = screen.getByLabelText('Size unit') as HTMLSelectElement;
      
      expect(input.value).toBe('100');
      expect(select.value).toBe('KB');
    });
    
    it('uses B unit for very small values', () => {
      render(
        <FileSizeInput
          value={500} // 500 B
          onChange={vi.fn()}
          label="Maximum File Size"
        />
      );
      
      const input = screen.getByLabelText('Maximum File Size value') as HTMLInputElement;
      const select = screen.getByLabelText('Size unit') as HTMLSelectElement;
      
      expect(input.value).toBe('500');
      expect(select.value).toBe('B');
    });
    
    it('defaults to 5 MB when value is 0', () => {
      render(
        <FileSizeInput
          value={0}
          onChange={vi.fn()}
          label="Maximum File Size"
        />
      );
      
      const input = screen.getByLabelText('Maximum File Size value') as HTMLInputElement;
      const select = screen.getByLabelText('Size unit') as HTMLSelectElement;
      
      expect(input.value).toBe('5');
      expect(select.value).toBe('MB');
    });
  });
  
  describe('Value Changes', () => {
    it('calls onChange with correct bytes when value changes', () => {
      const onChange = vi.fn();
      render(
        <FileSizeInput
          value={5242880}
          onChange={onChange}
          label="Maximum File Size"
        />
      );
      
      const input = screen.getByLabelText('Maximum File Size value');
      fireEvent.change(input, { target: { value: '10' } });
      
      // 10 MB = 10485760 bytes
      expect(onChange).toHaveBeenCalledWith(10485760);
    });
    
    it('accepts decimal values', () => {
      const onChange = vi.fn();
      render(
        <FileSizeInput
          value={5242880}
          onChange={onChange}
          label="Maximum File Size"
        />
      );
      
      const input = screen.getByLabelText('Maximum File Size value');
      fireEvent.change(input, { target: { value: '2.5' } });
      
      // 2.5 MB = 2621440 bytes
      expect(onChange).toHaveBeenCalledWith(2621440);
    });
    
    it('does not call onChange when value is invalid', () => {
      const onChange = vi.fn();
      render(
        <FileSizeInput
          value={5242880}
          onChange={onChange}
          label="Maximum File Size"
        />
      );
      
      const input = screen.getByLabelText('Maximum File Size value');
      fireEvent.change(input, { target: { value: 'invalid' } });
      
      expect(onChange).not.toHaveBeenCalled();
    });
  });
  
  describe('Unit Changes', () => {
    it('converts display value when unit changes', () => {
      const onChange = vi.fn();
      render(
        <FileSizeInput
          value={5242880} // 5 MB
          onChange={onChange}
          label="Maximum File Size"
        />
      );
      
      const input = screen.getByLabelText('Maximum File Size value') as HTMLInputElement;
      const select = screen.getByLabelText('Size unit');
      
      // Initial: 5 MB
      expect(input.value).toBe('5');
      
      // Change to KB
      fireEvent.change(select, { target: { value: 'KB' } });
      
      // Should convert 5 MB to 5120 KB
      expect(input.value).toBe('5120');
    });
    
    it('converts display value from MB to GB', () => {
      const onChange = vi.fn();
      render(
        <FileSizeInput
          value={5242880000} // 5000 MB
          onChange={onChange}
          label="Maximum File Size"
        />
      );
      
      const input = screen.getByLabelText('Maximum File Size value') as HTMLInputElement;
      const select = screen.getByLabelText('Size unit');
      
      // Initial: should be in GB (4.88...)
      expect(select.value).toBe('GB');
      
      // Change to MB
      fireEvent.change(select, { target: { value: 'MB' } });
      
      // Should show value in MB
      const displayValue = parseFloat(input.value);
      expect(displayValue).toBeCloseTo(5000, 0);
    });
  });
  
  describe('Validation', () => {
    it('shows error for negative values', () => {
      render(
        <FileSizeInput
          value={5242880}
          onChange={vi.fn()}
          label="Maximum File Size"
        />
      );
      
      const input = screen.getByLabelText('Maximum File Size value');
      fireEvent.change(input, { target: { value: '-5' } });
      
      expect(screen.getByText('File size must be positive')).toBeInTheDocument();
    });
    
    it('shows error for zero value', () => {
      render(
        <FileSizeInput
          value={5242880}
          onChange={vi.fn()}
          label="Maximum File Size"
        />
      );
      
      const input = screen.getByLabelText('Maximum File Size value');
      fireEvent.change(input, { target: { value: '0' } });
      
      expect(screen.getByText('File size must be positive')).toBeInTheDocument();
    });
    
    it('shows error for non-numeric values', () => {
      render(
        <FileSizeInput
          value={5242880}
          onChange={vi.fn()}
          label="Maximum File Size"
        />
      );
      
      const input = screen.getByLabelText('Maximum File Size value');
      fireEvent.change(input, { target: { value: 'abc' } });
      
      expect(screen.getByText('Please enter a valid number')).toBeInTheDocument();
    });
    
    it('shows error when value exceeds max', () => {
      render(
        <FileSizeInput
          value={5242880}
          onChange={vi.fn()}
          label="Maximum File Size"
          max={10485760} // 10 MB max
        />
      );
      
      const input = screen.getByLabelText('Maximum File Size value');
      fireEvent.change(input, { target: { value: '20' } }); // 20 MB
      
      expect(screen.getByText(/must not exceed/)).toBeInTheDocument();
    });
    
    it('shows error when value is below min', () => {
      render(
        <FileSizeInput
          value={5242880}
          onChange={vi.fn()}
          label="Maximum File Size"
          min={1048576} // 1 MB min
        />
      );
      
      const input = screen.getByLabelText('Maximum File Size value');
      
      // Change to KB unit first
      const select = screen.getByLabelText('Size unit');
      fireEvent.change(select, { target: { value: 'KB' } });
      
      // Now enter 500 KB (below 1 MB min)
      fireEvent.change(input, { target: { value: '500' } });
      
      expect(screen.getByText(/must be at least/)).toBeInTheDocument();
    });
  });
  
  describe('Formatted Display', () => {
    it('shows formatted byte value below input', () => {
      render(
        <FileSizeInput
          value={5242880}
          onChange={vi.fn()}
          label="Maximum File Size"
        />
      );
      
      expect(screen.getByText(/5,242,880 bytes/)).toBeInTheDocument();
      expect(screen.getByText(/5.00 MB/)).toBeInTheDocument();
    });
    
    it('updates formatted display when value changes', () => {
      render(
        <FileSizeInput
          value={5242880}
          onChange={vi.fn()}
          label="Maximum File Size"
        />
      );
      
      const input = screen.getByLabelText('Maximum File Size value');
      fireEvent.change(input, { target: { value: '10' } });
      
      expect(screen.getByText(/10,485,760 bytes/)).toBeInTheDocument();
      expect(screen.getByText(/10.00 MB/)).toBeInTheDocument();
    });
    
    it('does not show formatted display when there is an error', () => {
      render(
        <FileSizeInput
          value={5242880}
          onChange={vi.fn()}
          label="Maximum File Size"
        />
      );
      
      const input = screen.getByLabelText('Maximum File Size value');
      fireEvent.change(input, { target: { value: '-5' } });
      
      expect(screen.queryByText(/bytes/)).not.toBeInTheDocument();
    });
  });
  
  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(
        <FileSizeInput
          value={5242880}
          onChange={vi.fn()}
          label="Maximum File Size"
          id="test-input"
        />
      );
      
      const input = screen.getByLabelText('Maximum File Size value');
      const select = screen.getByLabelText('Size unit');
      
      expect(input).toHaveAttribute('aria-label', 'Maximum File Size value');
      expect(select).toHaveAttribute('aria-label', 'Size unit');
    });
    
    it('sets aria-invalid when there is an error', () => {
      render(
        <FileSizeInput
          value={5242880}
          onChange={vi.fn()}
          label="Maximum File Size"
        />
      );
      
      const input = screen.getByLabelText('Maximum File Size value');
      fireEvent.change(input, { target: { value: '-5' } });
      
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });
    
    it('associates error message with input via aria-describedby', () => {
      render(
        <FileSizeInput
          value={5242880}
          onChange={vi.fn()}
          label="Maximum File Size"
          id="test-input"
        />
      );
      
      const input = screen.getByLabelText('Maximum File Size value');
      fireEvent.change(input, { target: { value: '-5' } });
      
      expect(input).toHaveAttribute('aria-describedby', 'test-input-error');
      expect(screen.getByRole('alert')).toHaveAttribute('id', 'test-input-error');
    });
    
    it('associates byte display with input via aria-describedby when no error', () => {
      render(
        <FileSizeInput
          value={5242880}
          onChange={vi.fn()}
          label="Maximum File Size"
          id="test-input"
        />
      );
      
      const input = screen.getByLabelText('Maximum File Size value');
      expect(input).toHaveAttribute('aria-describedby', 'test-input-bytes');
    });
  });
  
  describe('Edge Cases', () => {
    it('handles very large numbers', () => {
      const onChange = vi.fn();
      render(
        <FileSizeInput
          value={1099511627776} // 1 TB
          onChange={onChange}
          label="Maximum File Size"
        />
      );
      
      const input = screen.getByLabelText('Maximum File Size value') as HTMLInputElement;
      const select = screen.getByLabelText('Size unit') as HTMLSelectElement;
      
      // Should display in GB (1024 GB)
      expect(select.value).toBe('GB');
      expect(input.value).toBe('1024');
    });
    
    it('handles fractional KB values', () => {
      const onChange = vi.fn();
      render(
        <FileSizeInput
          value={1536} // 1.5 KB
          onChange={onChange}
          label="Maximum File Size"
        />
      );
      
      const input = screen.getByLabelText('Maximum File Size value') as HTMLInputElement;
      const select = screen.getByLabelText('Size unit') as HTMLSelectElement;
      
      expect(select.value).toBe('KB');
      expect(parseFloat(input.value)).toBeCloseTo(1.5, 1);
    });
    
    it('handles unit change with fractional values', () => {
      render(
        <FileSizeInput
          value={1536} // 1.5 KB
          onChange={vi.fn()}
          label="Maximum File Size"
        />
      );
      
      const input = screen.getByLabelText('Maximum File Size value') as HTMLInputElement;
      const select = screen.getByLabelText('Size unit');
      
      // Change to B
      fireEvent.change(select, { target: { value: 'B' } });
      
      expect(input.value).toBe('1536');
    });
  });
});
