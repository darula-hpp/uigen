import type { ChartConfig, ChartPreparedViewModel } from '@uigen-dev/core';
import { ChartDataPipeline, type ChartPipelineOptions } from '@uigen-dev/core';

/**
 * Transform API response data for chart rendering.
 * Maps data to format expected by Recharts.
 * 
 * @param data - Array of data objects from API response
 * @param chartConfig - Chart configuration from IR
 * @returns Transformed data ready for Recharts
 */
export function transformChartData(
  data: any[],
  chartConfig: ChartConfig,
  options?: ChartPipelineOptions,
): any[] {
  return prepareChartViewModel(data, chartConfig, options).points;
}

export function prepareChartViewModel(
  data: any[],
  chartConfig: ChartConfig,
  options?: ChartPipelineOptions,
): ChartPreparedViewModel {
  return ChartDataPipeline.prepare(data, chartConfig, options);
}

/**
 * Get Y-axis fields as an array.
 * Normalizes single field or array of fields.
 * 
 * @param chartConfig - Chart configuration from IR
 * @returns Array of y-axis field names
 */
export function getYAxisFields(chartConfig: ChartConfig): string[] {
  return Array.isArray(chartConfig.yAxis) 
    ? chartConfig.yAxis 
    : [chartConfig.yAxis];
}

/**
 * Generate default colors for chart series.
 * Uses a predefined color palette.
 * 
 * @param count - Number of colors needed
 * @returns Array of color hex codes
 */
export function generateChartColors(count: number): string[] {
  const palette = [
    '#8884d8', // Blue
    '#82ca9d', // Green
    '#ffc658', // Yellow
    '#ff7c7c', // Red
    '#a28fd0', // Purple
    '#f4a261', // Orange
    '#2a9d8f', // Teal
    '#e76f51', // Coral
  ];
  
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    colors.push(palette[i % palette.length]);
  }
  
  return colors;
}

/**
 * Get series configuration with default colors.
 * If series is not defined in config, generates from yAxis fields.
 * 
 * @param chartConfig - Chart configuration from IR
 * @returns Array of series configurations with colors
 */
export function getSeriesConfig(chartConfig: ChartConfig): Array<{
  field: string;
  label: string;
  color: string;
}> {
  const yAxisFields = getYAxisFields(chartConfig);
  
  // If series is explicitly defined, use it
  if (chartConfig.series && chartConfig.series.length > 0) {
    return chartConfig.series.map((series, index) => ({
      field: series.field,
      label: series.label || humanize(series.field),
      color: series.color || generateChartColors(chartConfig.series!.length)[index],
    }));
  }
  
  // Otherwise, generate from yAxis fields
  const colors = generateChartColors(yAxisFields.length);
  return yAxisFields.map((field, index) => ({
    field,
    label: humanize(field),
    color: colors[index],
  }));
}

/**
 * Convert snake_case or camelCase to Title Case.
 * 
 * @param str - String to humanize
 * @returns Humanized string
 */
function humanize(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/[_-]/g, ' ') // Replace underscores and hyphens with spaces
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
