import type { ChartConfig } from '@uigen-dev/core';

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
  chartConfig: ChartConfig
): any[] {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return [];
  }

  return data.map(item => {
    const transformed: Record<string, any> = {};
    
    // Add x-axis value
    transformed[chartConfig.xAxis] = item[chartConfig.xAxis];
    
    // Add y-axis value(s)
    if (Array.isArray(chartConfig.yAxis)) {
      chartConfig.yAxis.forEach(field => {
        transformed[field] = item[field];
      });
    } else {
      transformed[chartConfig.yAxis] = item[chartConfig.yAxis];
    }
    
    // Add labels if specified
    if (chartConfig.labels) {
      transformed._label = item[chartConfig.labels];
    }
    
    return transformed;
  });
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
