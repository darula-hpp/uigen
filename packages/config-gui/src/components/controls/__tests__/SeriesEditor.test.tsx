import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SeriesEditor } from '../SeriesEditor.js';
import type { SeriesConfig } from '@uigen-dev/core';

describe('SeriesEditor', () => {
  const mockSeries: SeriesConfig = {
    field: 'revenue',
    label: 'Revenue',
    color: '#4CAF50'
  };

  describe('Field Name Rendering', () => {
    it('renders field name as read-only', () => {
      render(
        <SeriesEditor
          field="revenue"
          series={mockSeries}
          onChange={vi.fn()}
          index={0}
        />
      );
      
      expect(screen.getByText('revenue')).toBeInTheDocument();
    });
    
    it('displays series index in header', () => {
      render(
        <SeriesEditor
          field="revenue"
          series={mockSeries}
          onChange={vi.fn()}
          index={0}
        />
      );
      
      expect(screen.getByText('Series 1:')).toBeInTheDocument();
    });
    
    it('displays correct series index for multiple series', () => {
      render(
        <SeriesEditor
          field="profit"
          series={{ field: 'profit', label: 'Profit' }}
          onChange={vi.fn()}
          index={2}
        />
      );
      
      expect(screen.getByText('Series 3:')).toBeInTheDocument();
    });
  });

  describe('Label Input Updates', () => {
    it('renders label input with current value', () => {
      render(
        <SeriesEditor
          field="revenue"
          series={mockSeries}
          onChange={vi.fn()}
          index={0}
        />
      );
      
      const labelInput = screen.getByLabelText('Label for series 1') as HTMLInputElement;
      expect(labelInput).toBeInTheDocument();
      expect(labelInput.value).toBe('Revenue');
    });
    
    it('uses field name as default label when label is not set', () => {
      render(
        <SeriesEditor
          field="revenue"
          series={{ field: 'revenue' }}
          onChange={vi.fn()}
          index={0}
        />
      );
      
      const labelInput = screen.getByLabelText('Label for series 1') as HTMLInputElement;
      expect(labelInput.value).toBe('revenue');
    });
    
    it('calls onChange with updated label when label input changes', () => {
      const onChange = vi.fn();
      render(
        <SeriesEditor
          field="revenue"
          series={mockSeries}
          onChange={onChange}
          index={0}
        />
      );
      
      const labelInput = screen.getByLabelText('Label for series 1');
      fireEvent.change(labelInput, { target: { value: 'Total Revenue' } });
      
      expect(onChange).toHaveBeenCalledWith({
        field: 'revenue',
        label: 'Total Revenue',
        color: '#4CAF50'
      });
    });
    
    it('preserves other series properties when updating label', () => {
      const onChange = vi.fn();
      const seriesWithType: SeriesConfig = {
        field: 'revenue',
        label: 'Revenue',
        color: '#4CAF50',
        type: 'bar'
      };
      
      render(
        <SeriesEditor
          field="revenue"
          series={seriesWithType}
          onChange={onChange}
          index={0}
        />
      );
      
      const labelInput = screen.getByLabelText('Label for series 1');
      fireEvent.change(labelInput, { target: { value: 'New Label' } });
      
      expect(onChange).toHaveBeenCalledWith({
        field: 'revenue',
        label: 'New Label',
        color: '#4CAF50',
        type: 'bar'
      });
    });
  });

  describe('Color Picker Updates', () => {
    it('renders color picker with current color', () => {
      render(
        <SeriesEditor
          field="revenue"
          series={mockSeries}
          onChange={vi.fn()}
          index={0}
        />
      );
      
      const colorInput = screen.getByLabelText('Color for series 1') as HTMLInputElement;
      expect(colorInput).toBeInTheDocument();
      expect(colorInput.value).toBe('#4caf50'); // Browsers normalize hex colors to lowercase
    });
    
    it('uses default color when color is not set', () => {
      render(
        <SeriesEditor
          field="revenue"
          series={{ field: 'revenue' }}
          onChange={vi.fn()}
          index={0}
        />
      );
      
      const colorInput = screen.getByLabelText('Color for series 1') as HTMLInputElement;
      expect(colorInput.value).toBe('#4caf50'); // Default color for index 0
    });
    
    it('uses different default colors for different indices', () => {
      const { rerender } = render(
        <SeriesEditor
          field="revenue"
          series={{ field: 'revenue' }}
          onChange={vi.fn()}
          index={0}
        />
      );
      
      const colorInput0 = screen.getByLabelText('Color for series 1') as HTMLInputElement;
      expect(colorInput0.value).toBe('#4caf50'); // Green
      
      rerender(
        <SeriesEditor
          field="profit"
          series={{ field: 'profit' }}
          onChange={vi.fn()}
          index={1}
        />
      );
      
      const colorInput1 = screen.getByLabelText('Color for series 2') as HTMLInputElement;
      expect(colorInput1.value).toBe('#2196f3'); // Blue
    });
    
    it('calls onChange with updated color when color picker changes', () => {
      const onChange = vi.fn();
      render(
        <SeriesEditor
          field="revenue"
          series={mockSeries}
          onChange={onChange}
          index={0}
        />
      );
      
      const colorInput = screen.getByLabelText('Color for series 1');
      fireEvent.change(colorInput, { target: { value: '#FF5722' } });
      
      expect(onChange).toHaveBeenCalledWith({
        field: 'revenue',
        label: 'Revenue',
        color: '#ff5722' // Browsers normalize hex colors to lowercase
      });
    });
    
    it('renders color hex input with current color', () => {
      render(
        <SeriesEditor
          field="revenue"
          series={mockSeries}
          onChange={vi.fn()}
          index={0}
        />
      );
      
      const hexInput = screen.getByLabelText('Color hex value for series 1') as HTMLInputElement;
      expect(hexInput).toBeInTheDocument();
      expect(hexInput.value).toBe('#4CAF50');
    });
    
    it('calls onChange when hex input changes', () => {
      const onChange = vi.fn();
      render(
        <SeriesEditor
          field="revenue"
          series={mockSeries}
          onChange={onChange}
          index={0}
        />
      );
      
      const hexInput = screen.getByLabelText('Color hex value for series 1');
      fireEvent.change(hexInput, { target: { value: '#FF5722' } });
      
      expect(onChange).toHaveBeenCalledWith({
        field: 'revenue',
        label: 'Revenue',
        color: '#FF5722'
      });
    });
    
    it('preserves other series properties when updating color', () => {
      const onChange = vi.fn();
      const seriesWithType: SeriesConfig = {
        field: 'revenue',
        label: 'Revenue',
        color: '#4CAF50',
        type: 'line'
      };
      
      render(
        <SeriesEditor
          field="revenue"
          series={seriesWithType}
          onChange={onChange}
          index={0}
        />
      );
      
      const colorInput = screen.getByLabelText('Color for series 1');
      fireEvent.change(colorInput, { target: { value: '#FF5722' } });
      
      expect(onChange).toHaveBeenCalledWith({
        field: 'revenue',
        label: 'Revenue',
        color: '#ff5722', // Browsers normalize hex colors to lowercase
        type: 'line'
      });
    });
  });

  describe('onChange Callback', () => {
    it('calls onChange with complete series config', () => {
      const onChange = vi.fn();
      render(
        <SeriesEditor
          field="revenue"
          series={mockSeries}
          onChange={onChange}
          index={0}
        />
      );
      
      const labelInput = screen.getByLabelText('Label for series 1');
      fireEvent.change(labelInput, { target: { value: 'Updated Label' } });
      
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
        field: 'revenue',
        label: 'Updated Label',
        color: '#4CAF50'
      }));
    });
    
    it('does not call onChange on initial render', () => {
      const onChange = vi.fn();
      render(
        <SeriesEditor
          field="revenue"
          series={mockSeries}
          onChange={onChange}
          index={0}
        />
      );
      
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper labels for all inputs', () => {
      render(
        <SeriesEditor
          field="revenue"
          series={mockSeries}
          onChange={vi.fn()}
          index={0}
        />
      );
      
      expect(screen.getByLabelText('Label for series 1')).toBeInTheDocument();
      expect(screen.getByLabelText('Color for series 1')).toBeInTheDocument();
      expect(screen.getByLabelText('Color hex value for series 1')).toBeInTheDocument();
    });
    
    it('uses correct aria-label for different indices', () => {
      render(
        <SeriesEditor
          field="profit"
          series={{ field: 'profit', label: 'Profit' }}
          onChange={vi.fn()}
          index={2}
        />
      );
      
      expect(screen.getByLabelText('Label for series 3')).toBeInTheDocument();
      expect(screen.getByLabelText('Color for series 3')).toBeInTheDocument();
      expect(screen.getByLabelText('Color hex value for series 3')).toBeInTheDocument();
    });
    
    it('has proper id attributes for inputs', () => {
      render(
        <SeriesEditor
          field="revenue"
          series={mockSeries}
          onChange={vi.fn()}
          index={0}
        />
      );
      
      const labelInput = screen.getByLabelText('Label for series 1');
      expect(labelInput).toHaveAttribute('id', 'series-0-label');
      
      const colorInput = screen.getByLabelText('Color for series 1');
      expect(colorInput).toHaveAttribute('id', 'series-0-color');
    });
  });

  describe('Visual Layout', () => {
    it('renders all components in correct order', () => {
      render(
        <SeriesEditor
          field="revenue"
          series={mockSeries}
          onChange={vi.fn()}
          index={0}
        />
      );
      
      // Check that series header appears first
      const seriesHeader = screen.getByText('Series 1:');
      expect(seriesHeader).toBeInTheDocument();
      
      // Check that label section appears
      expect(screen.getByText('Label')).toBeInTheDocument();
      
      // Check that color section appears
      expect(screen.getByText('Color')).toBeInTheDocument();
    });
    
    it('displays field name in monospace font', () => {
      render(
        <SeriesEditor
          field="revenue"
          series={mockSeries}
          onChange={vi.fn()}
          index={0}
        />
      );
      
      const fieldName = screen.getByText('revenue');
      expect(fieldName).toHaveClass('font-mono');
    });
  });

  describe('Default Color Cycling', () => {
    it('cycles through default colors for indices beyond palette size', () => {
      // Test that index 10 uses the same color as index 0 (cycling)
      const { rerender } = render(
        <SeriesEditor
          field="field0"
          series={{ field: 'field0' }}
          onChange={vi.fn()}
          index={0}
        />
      );
      
      const colorInput0 = screen.getByLabelText('Color for series 1') as HTMLInputElement;
      const color0 = colorInput0.value;
      
      rerender(
        <SeriesEditor
          field="field10"
          series={{ field: 'field10' }}
          onChange={vi.fn()}
          index={10}
        />
      );
      
      const colorInput10 = screen.getByLabelText('Color for series 11') as HTMLInputElement;
      expect(colorInput10.value).toBe(color0); // Should cycle back to first color
    });
  });

  describe('Edge Cases', () => {
    it('handles empty label gracefully', () => {
      const onChange = vi.fn();
      render(
        <SeriesEditor
          field="revenue"
          series={{ field: 'revenue', label: '' }}
          onChange={onChange}
          index={0}
        />
      );
      
      const labelInput = screen.getByLabelText('Label for series 1') as HTMLInputElement;
      // When label is empty string, component uses field name as default
      expect(labelInput.value).toBe('revenue');
    });
    
    it('handles series with only field property', () => {
      render(
        <SeriesEditor
          field="revenue"
          series={{ field: 'revenue' }}
          onChange={vi.fn()}
          index={0}
        />
      );
      
      const labelInput = screen.getByLabelText('Label for series 1') as HTMLInputElement;
      expect(labelInput.value).toBe('revenue');
      
      const colorInput = screen.getByLabelText('Color for series 1') as HTMLInputElement;
      expect(colorInput.value).toBe('#4caf50');
    });
    
    it('handles field names with special characters', () => {
      render(
        <SeriesEditor
          field="total_revenue_2024"
          series={{ field: 'total_revenue_2024' }}
          onChange={vi.fn()}
          index={0}
        />
      );
      
      expect(screen.getByText('total_revenue_2024')).toBeInTheDocument();
    });
  });
});
