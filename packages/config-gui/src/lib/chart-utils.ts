/**
 * Utility functions for chart configuration
 * 
 * This module provides utilities for:
 * - Extracting field options from array item schemas
 * - Validating chart configurations
 * - Generating smart defaults
 * - Serializing chart configurations
 */

import type { ChartConfig, ChartType, SeriesConfig, ChartOptions, FieldType, SchemaNode } from '@uigen-dev/core';

/**
 * Field option extracted from schema
 */
export interface FieldOption {
  /** Field key/name */
  value: string;
  /** Human-readable label */
  label: string;
  /** Field type for smart defaults */
  type: FieldType;
  /** Field format (e.g., 'date-time') */
  format?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * JSON validation result
 */
export interface JsonValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Valid chart types
 */
export const VALID_CHART_TYPES: ChartType[] = [
  'line',
  'bar',
  'pie',
  'scatter',
  'area',
  'radar',
  'donut'
];

/**
 * Error messages for validation
 */
export const ERROR_MESSAGES = {
  CHART_TYPE_REQUIRED: 'Chart type is required',
  X_AXIS_REQUIRED: 'X-axis field is required',
  Y_AXIS_REQUIRED: 'Y-axis field is required',
  X_AXIS_INVALID: 'X-axis field does not exist in schema',
  Y_AXIS_INVALID: 'Y-axis field does not exist in schema',
  NO_FIELDS_AVAILABLE: 'Array items must be objects with fields to configure charts',
  INVALID_JSON: 'Invalid JSON syntax',
  OPTIONS_NOT_OBJECT: 'Options must be a JSON object'
} as const;

/**
 * Extract field options from array item schema
 * 
 * Requirements: 3.8, 6.1, 6.2
 * 
 * @param arrayItemSchema - The schema node representing array items
 * @returns Array of field options, empty if schema has no children
 */
export function extractFields(arrayItemSchema: SchemaNode | null | undefined): FieldOption[] {
  if (!arrayItemSchema || arrayItemSchema.type !== 'object' || !arrayItemSchema.children) {
    return [];
  }
  
  return arrayItemSchema.children.map(child => ({
    value: child.key,
    label: child.label,
    type: child.type,
    format: child.format
  }));
}

/**
 * Validate chart configuration
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4
 * 
 * @param config - The chart configuration to validate
 * @param availableFields - Available field options from schema
 * @returns Validation result with any errors found
 */
export function validateChartConfig(
  config: Partial<ChartConfig>,
  availableFields: FieldOption[]
): ValidationResult {
  const errors: Record<string, string> = {};
  const fieldValues = availableFields.map(f => f.value);
  
  // Validate chart type
  if (!config.chartType) {
    errors.chartType = ERROR_MESSAGES.CHART_TYPE_REQUIRED;
  } else if (!VALID_CHART_TYPES.includes(config.chartType)) {
    errors.chartType = `Chart type must be one of: ${VALID_CHART_TYPES.join(', ')}`;
  }
  
  // Validate xAxis
  if (!config.xAxis) {
    errors.xAxis = ERROR_MESSAGES.X_AXIS_REQUIRED;
  } else if (!fieldValues.includes(config.xAxis)) {
    errors.xAxis = ERROR_MESSAGES.X_AXIS_INVALID;
  }
  
  // Validate yAxis
  if (!config.yAxis) {
    errors.yAxis = ERROR_MESSAGES.Y_AXIS_REQUIRED;
  } else {
    // Handle both string and array
    const yAxisFields = Array.isArray(config.yAxis) ? config.yAxis : [config.yAxis];
    
    if (yAxisFields.length === 0) {
      errors.yAxis = ERROR_MESSAGES.Y_AXIS_REQUIRED;
    } else {
      // Check all yAxis fields exist
      const invalidFields = yAxisFields.filter(field => !fieldValues.includes(field));
      if (invalidFields.length > 0) {
        errors.yAxis = ERROR_MESSAGES.Y_AXIS_INVALID;
      }
    }
  }
  
  // Validate series if provided
  if (config.series && Array.isArray(config.series)) {
    config.series.forEach((series, index) => {
      if (!series.field) {
        errors[`series.${index}.field`] = 'Series field is required';
      } else if (!fieldValues.includes(series.field)) {
        errors[`series.${index}.field`] = 'Series field does not exist in schema';
      }
    });
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Get smart defaults for chart configuration
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4
 * 
 * @param availableFields - Available field options from schema
 * @returns Partial chart configuration with smart defaults
 */
export function getSmartDefaults(availableFields: FieldOption[]): Partial<ChartConfig> {
  if (availableFields.length === 0) {
    return {
      chartType: 'line'
    };
  }
  
  // Default chart type
  const chartType: ChartType = 'line';
  
  // Find date field for xAxis (prefer date type or date-time format)
  const dateField = availableFields.find(
    f => f.type === 'date' || (f.type === 'string' && (f.format === 'date-time' || f.format === 'date'))
  );
  
  // Default xAxis: date field if available, otherwise first field
  const xAxis = dateField ? dateField.value : availableFields[0].value;
  
  // Find numeric fields for yAxis
  const numericFields = availableFields.filter(
    f => f.type === 'number' || f.type === 'integer'
  );
  
  // Default yAxis: first numeric field if available, otherwise first field
  let yAxis: string;
  if (numericFields.length > 0) {
    yAxis = numericFields[0].value;
  } else {
    // Use first field as yAxis
    yAxis = availableFields[0].value;
  }
  
  return {
    chartType,
    xAxis,
    yAxis
  };
}

/**
 * Serialize chart configuration for persistence
 * 
 * Omits optional properties that are not customized:
 * - series: omitted if not customized (auto-generated by core)
 * - options: omitted if empty or null
 * - labels: omitted if not set
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4
 * 
 * @param config - The chart configuration to serialize
 * @param seriesCustomized - Whether series have been customized by user
 * @returns Serialized chart configuration
 */
export function serializeChartConfig(
  config: ChartConfig,
  seriesCustomized: boolean
): ChartConfig {
  const serialized: ChartConfig = {
    chartType: config.chartType,
    xAxis: config.xAxis,
    yAxis: config.yAxis
  };
  
  // Include series only if customized
  if (seriesCustomized && config.series && config.series.length > 0) {
    serialized.series = config.series;
  }
  
  // Include labels if set
  if (config.labels) {
    serialized.labels = config.labels;
  }
  
  // Include options if not empty
  if (config.options && Object.keys(config.options).length > 0) {
    serialized.options = config.options;
  }
  
  return serialized;
}

/**
 * Generate default series configuration from yAxis fields
 * 
 * @param yAxisFields - Array of yAxis field names
 * @param availableFields - Available field options from schema
 * @returns Array of series configurations with default labels
 */
export function generateDefaultSeries(
  yAxisFields: string[],
  availableFields: FieldOption[]
): SeriesConfig[] {
  return yAxisFields.map(field => {
    const fieldOption = availableFields.find(f => f.value === field);
    return {
      field,
      label: fieldOption ? fieldOption.label : field
    };
  });
}

/**
 * Validate JSON string for chart options
 * 
 * @param jsonString - JSON string to validate
 * @returns Validation result with error message if invalid
 */
export function validateOptionsJson(jsonString: string): JsonValidationResult {
  // Empty or whitespace-only strings are valid (no options)
  const trimmed = jsonString.trim();
  if (trimmed === '') {
    return { valid: true };
  }
  
  try {
    const parsed = JSON.parse(trimmed);
    
    // Options must be an object, not array, null, string, or number
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {
        valid: false,
        error: ERROR_MESSAGES.OPTIONS_NOT_OBJECT
      };
    }
    
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: ERROR_MESSAGES.INVALID_JSON
    };
  }
}

/**
 * Parse JSON string to chart options object
 * 
 * @param jsonString - JSON string to parse
 * @returns Parsed options object or undefined if invalid/empty
 */
export function parseOptionsJson(jsonString: string): ChartOptions | undefined {
  const trimmed = jsonString.trim();
  if (trimmed === '') {
    return undefined;
  }
  
  try {
    const parsed = JSON.parse(trimmed);
    
    // Only return if it's a valid object
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as ChartOptions;
    }
    
    return undefined;
  } catch (error) {
    return undefined;
  }
}
