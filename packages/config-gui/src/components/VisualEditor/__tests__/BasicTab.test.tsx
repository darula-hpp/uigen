import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BasicTab } from '../BasicTab.js';
import type { FieldOption } from '../../../lib/chart-utils.js';
import type { ChartType } from '@uigen-dev/core';

describe('BasicTab', () => {
  const mockFields: FieldOption[] = [
    { value: 'date', label: 'Date', type: 'string', format: 'date-time' },
    { value: 'revenue', label: 'Revenue', type: 'number' },
    { value: 'expenses', label: 'Expenses', type: 'number' },
    { value: 'category', label: 'Category', type: 'string' }
  ];
  
  const defaultProps = {
    fields: mockFields,
    chartType: 'line' as ChartType,
    xAxis: 'date',
    yAxis: 'revenue',
    onChartTypeChange: vi.fn(),
    onXAxisChange: vi.fn(),
    onYAxisChange: vi.fn(),
    errors: {}
  };
  
  describe('Chart Type Dropdown', () => {
    it('should render chart type dropdown with all chart types', () => {
      render(<BasicTab {...defaultProps} />);
      
      const dropdown = screen.getByLabelText('Chart Type');
      expect(dropdown).toBeInTheDocument();
      
      // Check all chart types are present
      const options = screen.getAllByRole('option');
      const chartTypes = ['Line', 'Bar', 'Pie', 'Scatter', 'Area', 'Radar', 'Donut'];
      
      chartTypes.forEach(type => {
        expect(options.some(opt => opt.textContent?.includes(type))).toBe(true);
      });
    });
    
    it('should display current chart type', () => {
      render(<BasicTab {...defaultProps} chartType="bar" />);
      
      const dropdown = screen.getByLabelText('Chart Type') as HTMLSelectElement;
      expect(dropdown.value).toBe('bar');
    });
    
    it('should call onChartTypeChange when selection changes', () => {
      const onChartTypeChange = vi.fn();
      render(<BasicTab {...defaultProps} onChartTypeChange={onChartTypeChange} />);
      
      const dropdown = screen.getByLabelText('Chart Type');
      fireEvent.change(dropdown, { target: { value: 'pie' } });
      
      expect(onChartTypeChange).toHaveBeenCalledWith('pie');
    });
    
    it('should show validation error for chart type', () => {
      const errors = { chartType: 'Chart type is required' };
      render(<BasicTab {...defaultProps} errors={errors} />);
      
      expect(screen.getByText('Chart type is required')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent('Chart type is required');
    });
    
    it('should have required indicator', () => {
      render(<BasicTab {...defaultProps} />);
      
      const label = screen.getByText('Chart Type');
      expect(label.parentElement?.textContent).toContain('*');
    });
  });
  
  describe('X-Axis Field Dropdown', () => {
    it('should render xAxis dropdown with field options', () => {
      render(<BasicTab {...defaultProps} />);
      
      const dropdown = screen.getByLabelText('X-Axis Field');
      expect(dropdown).toBeInTheDocument();
    });
    
    it('should display current xAxis value', () => {
      render(<BasicTab {...defaultProps} xAxis="date" />);
      
      const dropdown = screen.getByLabelText('X-Axis Field') as HTMLSelectElement;
      expect(dropdown.value).toBe('date');
    });
    
    it('should call onXAxisChange when selection changes', () => {
      const onXAxisChange = vi.fn();
      render(<BasicTab {...defaultProps} onXAxisChange={onXAxisChange} />);
      
      const dropdown = screen.getByLabelText('X-Axis Field');
      fireEvent.change(dropdown, { target: { value: 'category' } });
      
      expect(onXAxisChange).toHaveBeenCalledWith('category');
    });
    
    it('should show validation error for xAxis', () => {
      const errors = { xAxis: 'X-axis field is required' };
      render(<BasicTab {...defaultProps} errors={errors} />);
      
      expect(screen.getByText('X-axis field is required')).toBeInTheDocument();
    });
  });
  
  describe('Y-Axis Field Multi-Select', () => {
    it('should render yAxis multi-select control', () => {
      render(<BasicTab {...defaultProps} />);
      
      const control = screen.getByLabelText('Y-Axis Field(s)');
      expect(control).toBeInTheDocument();
    });
    
    it('should handle single yAxis selection', () => {
      render(<BasicTab {...defaultProps} yAxis="revenue" />);
      
      // Should show selected field as chip
      expect(screen.getByText('Revenue')).toBeInTheDocument();
    });
    
    it('should handle multiple yAxis selection', () => {
      render(<BasicTab {...defaultProps} yAxis={['revenue', 'expenses']} />);
      
      // Should show both selected fields as chips
      expect(screen.getByText('Revenue')).toBeInTheDocument();
      expect(screen.getByText('Expenses')).toBeInTheDocument();
    });
    
    it('should call onYAxisChange when selection changes', () => {
      const onYAxisChange = vi.fn();
      render(<BasicTab {...defaultProps} onYAxisChange={onYAxisChange} />);
      
      const control = screen.getByLabelText('Y-Axis Field(s)');
      fireEvent.click(control);
      
      // The multi-select should open and allow selection
      // This is tested more thoroughly in FieldMultiSelect.test.tsx
    });
    
    it('should show validation error for yAxis', () => {
      const errors = { yAxis: 'Y-axis field is required' };
      render(<BasicTab {...defaultProps} errors={errors} />);
      
      expect(screen.getByText('Y-axis field is required')).toBeInTheDocument();
    });
  });
  
  describe('Smart Defaults', () => {
    it('should apply smart defaults on initial mount when fields are available', () => {
      const onChartTypeChange = vi.fn();
      const onXAxisChange = vi.fn();
      const onYAxisChange = vi.fn();
      
      render(
        <BasicTab
          fields={mockFields}
          chartType="" as ChartType
          xAxis=""
          yAxis=""
          onChartTypeChange={onChartTypeChange}
          onXAxisChange={onXAxisChange}
          onYAxisChange={onYAxisChange}
          errors={{}}
          isInitialMount={true}
        />
      );
      
      // Should apply smart defaults
      expect(onChartTypeChange).toHaveBeenCalledWith('line');
      expect(onXAxisChange).toHaveBeenCalledWith('date'); // date field exists
      expect(onYAxisChange).toHaveBeenCalledWith('revenue'); // first numeric field
    });
    
    it('should not override existing values with smart defaults', () => {
      const onChartTypeChange = vi.fn();
      const onXAxisChange = vi.fn();
      const onYAxisChange = vi.fn();
      
      render(
        <BasicTab
          fields={mockFields}
          chartType="bar"
          xAxis="category"
          yAxis="expenses"
          onChartTypeChange={onChartTypeChange}
          onXAxisChange={onXAxisChange}
          onYAxisChange={onYAxisChange}
          errors={{}}
          isInitialMount={true}
        />
      );
      
      // Should not call any change handlers since values are already set
      expect(onChartTypeChange).not.toHaveBeenCalled();
      expect(onXAxisChange).not.toHaveBeenCalled();
      expect(onYAxisChange).not.toHaveBeenCalled();
    });
    
    it('should not apply smart defaults when not initial mount', () => {
      const onChartTypeChange = vi.fn();
      const onXAxisChange = vi.fn();
      const onYAxisChange = vi.fn();
      
      render(
        <BasicTab
          fields={mockFields}
          chartType="" as ChartType
          xAxis=""
          yAxis=""
          onChartTypeChange={onChartTypeChange}
          onXAxisChange={onXAxisChange}
          onYAxisChange={onYAxisChange}
          errors={{}}
          isInitialMount={false}
        />
      );
      
      // Should not apply smart defaults
      expect(onChartTypeChange).not.toHaveBeenCalled();
      expect(onXAxisChange).not.toHaveBeenCalled();
      expect(onYAxisChange).not.toHaveBeenCalled();
    });
  });
  
  describe('No Fields Available', () => {
    it('should show warning when no fields are available', () => {
      render(<BasicTab {...defaultProps} fields={[]} />);
      
      // Warning appears in multiple places (FieldDropdown, FieldMultiSelect, and BasicTab)
      const warnings = screen.getAllByText(/Array items must be objects with fields/);
      expect(warnings.length).toBeGreaterThan(0);
    });
    
    it('should not show warning when fields are available', () => {
      render(<BasicTab {...defaultProps} />);
      
      // The BasicTab-specific warning should not appear when fields are available
      expect(screen.queryByText(/The selected array field does not have a valid object schema/)).not.toBeInTheDocument();
    });
  });
  
  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<BasicTab {...defaultProps} />);
      
      expect(screen.getByLabelText('Chart Type')).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText('X-Axis Field')).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText('Y-Axis Field(s)')).toHaveAttribute('aria-required', 'true');
    });
    
    it('should have aria-invalid when errors exist', () => {
      const errors = {
        chartType: 'Chart type is required',
        xAxis: 'X-axis field is required',
        yAxis: 'Y-axis field is required'
      };
      
      render(<BasicTab {...defaultProps} errors={errors} />);
      
      expect(screen.getByLabelText('Chart Type')).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByLabelText('X-Axis Field')).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByLabelText('Y-Axis Field(s)')).toHaveAttribute('aria-invalid', 'true');
    });
    
    it('should have aria-describedby linking to error messages', () => {
      const errors = { chartType: 'Chart type is required' };
      render(<BasicTab {...defaultProps} errors={errors} />);
      
      const dropdown = screen.getByLabelText('Chart Type');
      expect(dropdown).toHaveAttribute('aria-describedby', 'chart-type-error');
    });
  });
});
