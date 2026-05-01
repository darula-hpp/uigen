import { useEffect } from 'react';
import type { ChartType } from '@uigen-dev/core';
import { FieldDropdown } from '../controls/FieldDropdown.js';
import { FieldMultiSelect } from '../controls/FieldMultiSelect.js';
import type { FieldOption } from '../../lib/chart-utils.js';
import { getSmartDefaults, VALID_CHART_TYPES } from '../../lib/chart-utils.js';

/**
 * Props for BasicTab component
 */
export interface BasicTabProps {
  /** Available fields from array item schema */
  fields: FieldOption[];
  
  /** Current chart type */
  chartType: ChartType;
  
  /** Current xAxis field */
  xAxis: string;
  
  /** Current yAxis field(s) */
  yAxis: string | string[];
  
  /** Callback when chart type changes */
  onChartTypeChange: (type: ChartType) => void;
  
  /** Callback when xAxis changes */
  onXAxisChange: (field: string) => void;
  
  /** Callback when yAxis changes */
  onYAxisChange: (field: string | string[]) => void;
  
  /** Validation errors */
  errors: Record<string, string>;
  
  /** Whether this is initial mount (for applying smart defaults) */
  isInitialMount?: boolean;
}

/**
 * Get icon for chart type
 */
function getChartTypeIcon(type: ChartType): string {
  switch (type) {
    case 'line':
      return '📈';
    case 'bar':
      return '📊';
    case 'pie':
      return '🥧';
    case 'scatter':
      return '⚫';
    case 'area':
      return '📉';
    case 'radar':
      return '🎯';
    case 'donut':
      return '🍩';
    default:
      return '📊';
  }
}

/**
 * Get display label for chart type
 */
function getChartTypeLabel(type: ChartType): string {
  switch (type) {
    case 'line':
      return 'Line';
    case 'bar':
      return 'Bar';
    case 'pie':
      return 'Pie';
    case 'scatter':
      return 'Scatter';
    case 'area':
      return 'Area';
    case 'radar':
      return 'Radar';
    case 'donut':
      return 'Donut';
    default:
      return type;
  }
}

/**
 * BasicTab component for essential chart configuration.
 * 
 * Features:
 * - Chart type dropdown with all chart types
 * - xAxis field dropdown
 * - yAxis field multi-select (supports single and multiple selection)
 * - Smart defaults applied on mount
 * - Validation error display
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 11.1, 11.2, 11.3, 11.4
 */
export function BasicTab({
  fields,
  chartType,
  xAxis,
  yAxis,
  onChartTypeChange,
  onXAxisChange,
  onYAxisChange,
  errors,
  isInitialMount = false
}: BasicTabProps) {
  // Apply smart defaults on initial mount
  useEffect(() => {
    if (isInitialMount && fields.length > 0) {
      const defaults = getSmartDefaults(fields);
      
      // Only apply defaults if values are not already set
      if (!chartType && defaults.chartType) {
        onChartTypeChange(defaults.chartType);
      }
      
      if (!xAxis && defaults.xAxis) {
        onXAxisChange(defaults.xAxis);
      }
      
      if (!yAxis && defaults.yAxis) {
        onYAxisChange(defaults.yAxis);
      }
    }
  }, [isInitialMount, fields, chartType, xAxis, yAxis, onChartTypeChange, onXAxisChange, onYAxisChange]);
  
  const hasFields = fields.length > 0;
  
  return (
    <div className="space-y-6">
      {/* Chart Type Dropdown */}
      <div className="space-y-2">
        <label 
          htmlFor="chart-type" 
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Chart Type
          <span className="text-red-500 ml-1">*</span>
        </label>
        
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Select the type of chart visualization
        </p>
        
        <select
          id="chart-type"
          value={chartType}
          onChange={(e) => onChartTypeChange(e.target.value as ChartType)}
          aria-label="Chart Type"
          aria-required="true"
          aria-invalid={!!errors.chartType}
          aria-describedby={errors.chartType ? 'chart-type-error' : undefined}
          className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.chartType ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
          }`}
        >
          {!chartType && (
            <option value="">Select chart type</option>
          )}
          
          {VALID_CHART_TYPES.map((type) => (
            <option key={type} value={type}>
              {getChartTypeIcon(type)} {getChartTypeLabel(type)}
            </option>
          ))}
        </select>
        
        {errors.chartType && (
          <p id="chart-type-error" className="text-sm text-red-600 dark:text-red-400" role="alert">
            {errors.chartType}
          </p>
        )}
      </div>
      
      {/* X-Axis Field Dropdown */}
      <FieldDropdown
        id="x-axis"
        fields={fields}
        value={xAxis}
        onChange={onXAxisChange}
        label="X-Axis Field"
        description="Field to use for the horizontal axis (typically time or categories)"
        required
        error={errors.xAxis}
      />
      
      {/* Y-Axis Field Multi-Select */}
      <FieldMultiSelect
        id="y-axis"
        fields={fields}
        value={yAxis}
        onChange={onYAxisChange}
        label="Y-Axis Field(s)"
        description="Field(s) to use for the vertical axis (typically numeric values)"
        required
        allowSingle
        error={errors.yAxis}
      />
      
      {/* Warning when no fields available */}
      {!hasFields && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            ⚠️ Array items must be objects with fields to configure charts. The selected array field does not have a valid object schema.
          </p>
        </div>
      )}
    </div>
  );
}
