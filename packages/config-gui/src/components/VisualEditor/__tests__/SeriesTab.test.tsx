import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SeriesTab } from '../SeriesTab.js';
import type { SeriesConfig } from '@uigen-dev/core';
import type { FieldOption } from '../../../lib/chart-utils.js';

describe('SeriesTab', () => {
  const mockFields: FieldOption[] = [
    { value: 'revenue', label: 'Revenue', type: 'number' },
    { value: 'expenses', label: 'Expenses', type: 'number' },
    { value: 'profit', label: 'Profit', type: 'number' }
  ];

  describe('Single Series Editor Rendering', () => {
    it('renders single series editor when yAxis is string', () => {
      const mockSeries: SeriesConfig[] = [
        { field: 'revenue', label: 'Revenue' }
      ];

      render(
        <SeriesTab
          yAxis="revenue"
          series={mockSeries}
          onSeriesChange={vi.fn()}
          fields={mockFields}
        />
      );

      expect(screen.getByText('Series 1:')).toBeInTheDocument();
      expect(screen.getByText('revenue')).toBeInTheDocument();
    });

    it('renders label input for single series', () => {
      const mockSeries: SeriesConfig[] = [
        { field: 'revenue', label: 'Revenue' }
      ];

      render(
        <SeriesTab
          yAxis="revenue"
          series={mockSeries}
          onSeriesChange={vi.fn()}
          fields={mockFields}
        />
      );

      const labelInput = screen.getByLabelText('Label for series 1') as HTMLInputElement;
      expect(labelInput).toBeInTheDocument();
      expect(labelInput.value).toBe('Revenue');
    });

    it('renders color picker for single series', () => {
      const mockSeries: SeriesConfig[] = [
        { field: 'revenue', label: 'Revenue', color: '#4CAF50' }
      ];

      render(
        <SeriesTab
          yAxis="revenue"
          series={mockSeries}
          onSeriesChange={vi.fn()}
          fields={mockFields}
        />
      );

      const colorInput = screen.getByLabelText('Color for series 1') as HTMLInputElement;
      expect(colorInput).toBeInTheDocument();
      expect(colorInput.value).toBe('#4caf50');
    });
  });

  describe('Multiple Series Editors Rendering', () => {
    it('renders multiple series editors when yAxis is array', () => {
      const mockSeries: SeriesConfig[] = [
        { field: 'revenue', label: 'Revenue' },
        { field: 'expenses', label: 'Expenses' }
      ];

      render(
        <SeriesTab
          yAxis={['revenue', 'expenses']}
          series={mockSeries}
          onSeriesChange={vi.fn()}
          fields={mockFields}
        />
      );

      expect(screen.getByText('Series 1:')).toBeInTheDocument();
      expect(screen.getByText('Series 2:')).toBeInTheDocument();
      expect(screen.getByText('revenue')).toBeInTheDocument();
      expect(screen.getByText('expenses')).toBeInTheDocument();
    });

    it('renders correct number of series editors for array yAxis', () => {
      const mockSeries: SeriesConfig[] = [
        { field: 'revenue', label: 'Revenue' },
        { field: 'expenses', label: 'Expenses' },
        { field: 'profit', label: 'Profit' }
      ];

      render(
        <SeriesTab
          yAxis={['revenue', 'expenses', 'profit']}
          series={mockSeries}
          onSeriesChange={vi.fn()}
          fields={mockFields}
        />
      );

      expect(screen.getByText('Series 1:')).toBeInTheDocument();
      expect(screen.getByText('Series 2:')).toBeInTheDocument();
      expect(screen.getByText('Series 3:')).toBeInTheDocument();
    });

    it('renders each series with correct field name', () => {
      const mockSeries: SeriesConfig[] = [
        { field: 'revenue', label: 'Revenue' },
        { field: 'expenses', label: 'Expenses' }
      ];

      render(
        <SeriesTab
          yAxis={['revenue', 'expenses']}
          series={mockSeries}
          onSeriesChange={vi.fn()}
          fields={mockFields}
        />
      );

      expect(screen.getByText('revenue')).toBeInTheDocument();
      expect(screen.getByText('expenses')).toBeInTheDocument();
    });
  });

  describe('Series Customization Tracking', () => {
    it('marks series as customized when user changes label', () => {
      const onSeriesChange = vi.fn();
      const mockSeries: SeriesConfig[] = [
        { field: 'revenue', label: 'Revenue' }
      ];

      render(
        <SeriesTab
          yAxis="revenue"
          series={mockSeries}
          onSeriesChange={onSeriesChange}
          fields={mockFields}
        />
      );

      const labelInput = screen.getByLabelText('Label for series 1');
      fireEvent.change(labelInput, { target: { value: 'Total Revenue' } });

      expect(onSeriesChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'revenue',
            label: 'Total Revenue'
          })
        ]),
        true // customized flag
      );
    });

    it('marks series as customized when user changes color', () => {
      const onSeriesChange = vi.fn();
      const mockSeries: SeriesConfig[] = [
        { field: 'revenue', label: 'Revenue', color: '#4CAF50' }
      ];

      render(
        <SeriesTab
          yAxis="revenue"
          series={mockSeries}
          onSeriesChange={onSeriesChange}
          fields={mockFields}
        />
      );

      const colorInput = screen.getByLabelText('Color for series 1');
      fireEvent.change(colorInput, { target: { value: '#FF5722' } });

      expect(onSeriesChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'revenue',
            color: '#ff5722'
          })
        ]),
        true // customized flag
      );
    });

    it('shows customization status message after user makes changes', () => {
      const mockSeries: SeriesConfig[] = [
        { field: 'revenue', label: 'Revenue' }
      ];

      render(
        <SeriesTab
          yAxis="revenue"
          series={mockSeries}
          onSeriesChange={vi.fn()}
          fields={mockFields}
        />
      );

      // Initially no customization message
      expect(screen.queryByText(/Series customized/)).not.toBeInTheDocument();

      // Make a change
      const labelInput = screen.getByLabelText('Label for series 1');
      fireEvent.change(labelInput, { target: { value: 'New Label' } });

      // Customization message should appear
      expect(screen.getByText(/Series customized/)).toBeInTheDocument();
    });
  });

  describe('Series Change Handling', () => {
    it('calls onSeriesChange with updated series when label changes', () => {
      const onSeriesChange = vi.fn();
      const mockSeries: SeriesConfig[] = [
        { field: 'revenue', label: 'Revenue' }
      ];

      render(
        <SeriesTab
          yAxis="revenue"
          series={mockSeries}
          onSeriesChange={onSeriesChange}
          fields={mockFields}
        />
      );

      const labelInput = screen.getByLabelText('Label for series 1');
      fireEvent.change(labelInput, { target: { value: 'Updated Revenue' } });

      expect(onSeriesChange).toHaveBeenCalledWith(
        [{ field: 'revenue', label: 'Updated Revenue' }],
        true
      );
    });

    it('calls onSeriesChange with updated series when color changes', () => {
      const onSeriesChange = vi.fn();
      const mockSeries: SeriesConfig[] = [
        { field: 'revenue', label: 'Revenue', color: '#4CAF50' }
      ];

      render(
        <SeriesTab
          yAxis="revenue"
          series={mockSeries}
          onSeriesChange={onSeriesChange}
          fields={mockFields}
        />
      );

      const colorInput = screen.getByLabelText('Color for series 1');
      fireEvent.change(colorInput, { target: { value: '#2196F3' } });

      expect(onSeriesChange).toHaveBeenCalledWith(
        [{ field: 'revenue', label: 'Revenue', color: '#2196f3' }],
        true
      );
    });

    it('updates correct series when multiple series exist', () => {
      const onSeriesChange = vi.fn();
      const mockSeries: SeriesConfig[] = [
        { field: 'revenue', label: 'Revenue' },
        { field: 'expenses', label: 'Expenses' }
      ];

      render(
        <SeriesTab
          yAxis={['revenue', 'expenses']}
          series={mockSeries}
          onSeriesChange={onSeriesChange}
          fields={mockFields}
        />
      );

      // Update second series
      const labelInput = screen.getByLabelText('Label for series 2');
      fireEvent.change(labelInput, { target: { value: 'Total Expenses' } });

      expect(onSeriesChange).toHaveBeenCalledWith(
        [
          { field: 'revenue', label: 'Revenue' },
          { field: 'expenses', label: 'Total Expenses' }
        ],
        true
      );
    });

    it('preserves other series when updating one series', () => {
      const onSeriesChange = vi.fn();
      const mockSeries: SeriesConfig[] = [
        { field: 'revenue', label: 'Revenue', color: '#4CAF50' },
        { field: 'expenses', label: 'Expenses', color: '#2196F3' }
      ];

      render(
        <SeriesTab
          yAxis={['revenue', 'expenses']}
          series={mockSeries}
          onSeriesChange={onSeriesChange}
          fields={mockFields}
        />
      );

      // Update first series label
      const labelInput = screen.getByLabelText('Label for series 1');
      fireEvent.change(labelInput, { target: { value: 'New Revenue' } });

      expect(onSeriesChange).toHaveBeenCalledWith(
        [
          { field: 'revenue', label: 'New Revenue', color: '#4CAF50' },
          { field: 'expenses', label: 'Expenses', color: '#2196F3' }
        ],
        true
      );
    });
  });

  describe('No yAxis Selected', () => {
    it('shows info message when yAxis is empty string', () => {
      render(
        <SeriesTab
          yAxis=""
          series={[]}
          onSeriesChange={vi.fn()}
          fields={mockFields}
        />
      );

      expect(screen.getByText(/Select Y-axis field/)).toBeInTheDocument();
    });

    it('shows info message when yAxis is empty array', () => {
      render(
        <SeriesTab
          yAxis={[]}
          series={[]}
          onSeriesChange={vi.fn()}
          fields={mockFields}
        />
      );

      expect(screen.getByText(/Select Y-axis field/)).toBeInTheDocument();
    });

    it('does not render series editors when no yAxis selected', () => {
      render(
        <SeriesTab
          yAxis=""
          series={[]}
          onSeriesChange={vi.fn()}
          fields={mockFields}
        />
      );

      expect(screen.queryByText('Series 1:')).not.toBeInTheDocument();
    });
  });

  describe('Info Messages', () => {
    it('displays info message about customization', () => {
      const mockSeries: SeriesConfig[] = [
        { field: 'revenue', label: 'Revenue' }
      ];

      render(
        <SeriesTab
          yAxis="revenue"
          series={mockSeries}
          onSeriesChange={vi.fn()}
          fields={mockFields}
        />
      );

      expect(screen.getByText(/Customize the appearance of your chart series/)).toBeInTheDocument();
    });

    it('displays info about automatic generation', () => {
      const mockSeries: SeriesConfig[] = [
        { field: 'revenue', label: 'Revenue' }
      ];

      render(
        <SeriesTab
          yAxis="revenue"
          series={mockSeries}
          onSeriesChange={vi.fn()}
          fields={mockFields}
        />
      );

      expect(screen.getByText(/default labels and colors will be generated automatically/)).toBeInTheDocument();
    });
  });

  describe('Default Series Generation', () => {
    it('generates default series when series is empty', () => {
      const onSeriesChange = vi.fn();

      render(
        <SeriesTab
          yAxis="revenue"
          series={[]}
          onSeriesChange={onSeriesChange}
          fields={mockFields}
        />
      );

      // Should call onSeriesChange with generated default series
      expect(onSeriesChange).toHaveBeenCalledWith(
        [{ field: 'revenue', label: 'Revenue' }],
        false // not customized
      );
    });

    it('generates default series for multiple yAxis fields', () => {
      const onSeriesChange = vi.fn();

      render(
        <SeriesTab
          yAxis={['revenue', 'expenses']}
          series={[]}
          onSeriesChange={onSeriesChange}
          fields={mockFields}
        />
      );

      expect(onSeriesChange).toHaveBeenCalledWith(
        [
          { field: 'revenue', label: 'Revenue' },
          { field: 'expenses', label: 'Expenses' }
        ],
        false
      );
    });

    it('regenerates series when yAxis changes', () => {
      const onSeriesChange = vi.fn();
      const mockSeries: SeriesConfig[] = [
        { field: 'revenue', label: 'Revenue' }
      ];

      const { rerender } = render(
        <SeriesTab
          yAxis="revenue"
          series={mockSeries}
          onSeriesChange={onSeriesChange}
          fields={mockFields}
        />
      );

      onSeriesChange.mockClear();

      // Change yAxis
      rerender(
        <SeriesTab
          yAxis="expenses"
          series={mockSeries}
          onSeriesChange={onSeriesChange}
          fields={mockFields}
        />
      );

      // Should regenerate series for new yAxis
      expect(onSeriesChange).toHaveBeenCalledWith(
        [{ field: 'expenses', label: 'Expenses' }],
        false
      );
    });
  });

  describe('Edge Cases', () => {
    it('handles series with missing field in fields array', () => {
      const mockSeries: SeriesConfig[] = [
        { field: 'unknown_field', label: 'Unknown' }
      ];

      render(
        <SeriesTab
          yAxis="unknown_field"
          series={mockSeries}
          onSeriesChange={vi.fn()}
          fields={mockFields}
        />
      );

      // Should still render the series editor
      expect(screen.getByText('Series 1:')).toBeInTheDocument();
      expect(screen.getByText('unknown_field')).toBeInTheDocument();
    });

    it('handles empty fields array', () => {
      const mockSeries: SeriesConfig[] = [
        { field: 'revenue', label: 'Revenue' }
      ];

      render(
        <SeriesTab
          yAxis="revenue"
          series={mockSeries}
          onSeriesChange={vi.fn()}
          fields={[]}
        />
      );

      // Should still render series editor
      expect(screen.getByText('Series 1:')).toBeInTheDocument();
    });

    it('handles series config without label', () => {
      const mockSeries: SeriesConfig[] = [
        { field: 'revenue' }
      ];

      render(
        <SeriesTab
          yAxis="revenue"
          series={mockSeries}
          onSeriesChange={vi.fn()}
          fields={mockFields}
        />
      );

      const labelInput = screen.getByLabelText('Label for series 1') as HTMLInputElement;
      // Should use field name as default (SeriesEditor uses series.label || field)
      expect(labelInput.value).toBe('revenue');
    });
  });

  describe('Accessibility', () => {
    it('renders series editors with proper labels', () => {
      const mockSeries: SeriesConfig[] = [
        { field: 'revenue', label: 'Revenue' }
      ];

      render(
        <SeriesTab
          yAxis="revenue"
          series={mockSeries}
          onSeriesChange={vi.fn()}
          fields={mockFields}
        />
      );

      expect(screen.getByLabelText('Label for series 1')).toBeInTheDocument();
      expect(screen.getByLabelText('Color for series 1')).toBeInTheDocument();
    });

    it('renders multiple series with unique labels', () => {
      const mockSeries: SeriesConfig[] = [
        { field: 'revenue', label: 'Revenue' },
        { field: 'expenses', label: 'Expenses' }
      ];

      render(
        <SeriesTab
          yAxis={['revenue', 'expenses']}
          series={mockSeries}
          onSeriesChange={vi.fn()}
          fields={mockFields}
        />
      );

      expect(screen.getByLabelText('Label for series 1')).toBeInTheDocument();
      expect(screen.getByLabelText('Label for series 2')).toBeInTheDocument();
      expect(screen.getByLabelText('Color for series 1')).toBeInTheDocument();
      expect(screen.getByLabelText('Color for series 2')).toBeInTheDocument();
    });
  });
});
