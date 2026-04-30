import type { AnnotationHandler, AnnotationContext } from '../types.js';
import type { ChartConfig, ChartType, SeriesConfig } from '../../../ir/types.js';

/**
 * Valid chart types supported by the annotation
 */
const VALID_CHART_TYPES: ChartType[] = [
  'line',
  'bar',
  'pie',
  'scatter',
  'area',
  'radar',
  'donut'
];

/**
 * Internal shape of the raw x-uigen-chart annotation before validation.
 */
interface ChartAnnotation {
  chartType: string;
  xAxis: string;
  yAxis: string | string[];
  series?: Array<{
    field: string;
    label?: string;
    color?: string;
    type?: string;
  }>;
  labels?: string;
  options?: Record<string, unknown>;
}

/**
 * Metadata interface for annotation handlers.
 */
interface AnnotationMetadata {
  name: string;
  description: string;
  targetType: 'field' | 'operation' | 'resource';
  applicableWhen?: {
    type?: string;
  };
  parameterSchema: {
    type: 'object' | 'string' | 'boolean' | 'number';
    properties?: Record<string, {
      type: 'string' | 'boolean' | 'number' | 'object' | 'array' | 'enum' | string[];
      description?: string;
      enum?: string[];
      items?: any;
      properties?: Record<string, any>;
    }>;
    required?: string[];
  };
  examples: Array<{ description: string; value: unknown }>;
}

/**
 * Handler for x-uigen-chart annotation.
 * Configures data visualization as charts for array fields.
 * 
 * Requirements: 1.1-1.5, 2.1-2.5, 3.1-3.8, 4.1-4.5, 5.1-5.7, 6.1-6.5, 7.1-7.5, 8.1-8.4, 9.1-9.5, 10.1-10.4, 11.1-11.5, 12.1-12.5, 13.1-13.5, 14.1-14.5, 15.1-15.5
 */
export class ChartHandler implements AnnotationHandler<ChartAnnotation> {
  public readonly name = 'x-uigen-chart';

  public static readonly metadata: AnnotationMetadata = {
    name: 'x-uigen-chart',
    description: 'Configures data visualization as charts for array fields',
    targetType: 'field',
    applicableWhen: {
      type: 'array'
    },
    parameterSchema: {
      type: 'object',
      properties: {
        chartType: {
          type: 'enum',
          enum: ['line', 'bar', 'pie', 'scatter', 'area', 'radar', 'donut'],
          description: 'Type of chart to render'
        },
        xAxis: {
          type: 'string',
          description: 'Field name for x-axis'
        },
        yAxis: {
          type: ['string', 'array'],
          description: 'Field name(s) for y-axis'
        },
        series: {
          type: 'array',
          description: 'Configuration for multiple data series',
          items: {
            type: 'object',
            properties: {
              field: { type: 'string' },
              label: { type: 'string' },
              color: { type: 'string' },
              type: { type: 'enum', enum: ['line', 'bar', 'pie', 'scatter', 'area', 'radar', 'donut'] }
            }
          }
        },
        labels: {
          type: 'string',
          description: 'Field name for data point labels'
        },
        options: {
          type: 'object',
          description: 'Chart display and behavior options'
        }
      },
      required: ['chartType', 'xAxis', 'yAxis']
    },
    examples: [
      {
        description: 'Line chart for time-series data',
        value: {
          chartType: 'line',
          xAxis: 'date',
          yAxis: 'value',
          options: { title: 'Sales Over Time' }
        }
      },
      {
        description: 'Multi-series bar chart',
        value: {
          chartType: 'bar',
          xAxis: 'month',
          yAxis: ['revenue', 'expenses'],
          series: [
            { field: 'revenue', label: 'Revenue', color: '#4CAF50' },
            { field: 'expenses', label: 'Expenses', color: '#F44336' }
          ]
        }
      },
      {
        description: 'Pie chart with custom labels',
        value: {
          chartType: 'pie',
          xAxis: 'category',
          yAxis: 'amount',
          labels: 'categoryName'
        }
      }
    ]
  };

  /**
   * Extract the x-uigen-chart annotation value from the spec element.
   * Only accepts plain objects (not null, not arrays).
   * 
   * @param context - The annotation context containing the spec element
   * @returns The raw annotation object or undefined if absent/invalid type
   */
  extract(context: AnnotationContext): ChartAnnotation | undefined {
    try {
      const element = context.element as any;
      const annotation = element['x-uigen-chart'];

      if (annotation === undefined) {
        return undefined;
      }

      if (typeof annotation !== 'object' || annotation === null || Array.isArray(annotation)) {
        context.utils.logWarning(
          `x-uigen-chart at ${context.path} must be a plain object, found ${
            annotation === null ? 'null' : Array.isArray(annotation) ? 'array' : typeof annotation
          }`
        );
        return undefined;
      }

      return annotation as ChartAnnotation;
    } catch (error) {
      context.utils.logWarning(`x-uigen-chart at ${context.path}: extraction error - ${error}`);
      return undefined;
    }
  }

  /**
   * Validate that the annotation has all required fields and valid values.
   * 
   * @param value - The extracted annotation object
   * @returns true if valid, false otherwise (never throws)
   */
  validate(value: ChartAnnotation): boolean {
    try {
      // Validate chartType
      if (!value.chartType || typeof value.chartType !== 'string') {
        console.warn('x-uigen-chart: chartType is required and must be a string');
        return false;
      }

      if (!VALID_CHART_TYPES.includes(value.chartType as ChartType)) {
        console.warn(
          `x-uigen-chart: chartType must be one of: ${VALID_CHART_TYPES.join(', ')}, got "${value.chartType}"`
        );
        return false;
      }

      // Validate xAxis
      if (!value.xAxis || typeof value.xAxis !== 'string' || value.xAxis.trim() === '') {
        console.warn('x-uigen-chart: xAxis is required and must be a non-empty string');
        return false;
      }

      // Validate yAxis
      if (!value.yAxis) {
        console.warn('x-uigen-chart: yAxis is required and must be a non-empty string or array of strings');
        return false;
      }

      if (typeof value.yAxis === 'string') {
        if (value.yAxis.trim() === '') {
          console.warn('x-uigen-chart: yAxis must be a non-empty string');
          return false;
        }
      } else if (Array.isArray(value.yAxis)) {
        if (value.yAxis.length === 0) {
          console.warn('x-uigen-chart: yAxis array cannot be empty');
          return false;
        }
        for (const field of value.yAxis) {
          if (typeof field !== 'string' || field.trim() === '') {
            console.warn('x-uigen-chart: yAxis array items must be non-empty strings');
            return false;
          }
        }
      } else {
        console.warn('x-uigen-chart: yAxis must be a non-empty string or array of strings');
        return false;
      }

      // Validate series (if provided)
      if (value.series !== undefined) {
        if (!Array.isArray(value.series)) {
          console.warn('x-uigen-chart: series must be an array of objects');
          return false;
        }
        for (let i = 0; i < value.series.length; i++) {
          const seriesItem = value.series[i];
          if (typeof seriesItem !== 'object' || seriesItem === null) {
            console.warn(`x-uigen-chart: series[${i}] must be an object`);
            return false;
          }
          if (typeof seriesItem.field !== 'string' || seriesItem.field.trim() === '') {
            console.warn(`x-uigen-chart: series[${i}] must have a non-empty 'field' property`);
            return false;
          }
        }
      }

      // Validate labels (if provided)
      if (value.labels !== undefined) {
        if (typeof value.labels !== 'string' || value.labels.trim() === '') {
          console.warn('x-uigen-chart: labels must be a non-empty string');
          return false;
        }
      }

      // Validate options (if provided)
      if (value.options !== undefined) {
        if (typeof value.options !== 'object' || value.options === null || Array.isArray(value.options)) {
          console.warn('x-uigen-chart: options must be a plain object');
          return false;
        }
      }

      return true;
    } catch (error) {
      console.warn(`x-uigen-chart: validation error - ${error}`);
      return false;
    }
  }

  /**
   * Apply the chart annotation by setting chartConfig on the schema node.
   * 
   * @param value - The validated annotation object
   * @param context - The annotation context
   */
  apply(value: ChartAnnotation, context: AnnotationContext): void {
    try {
      // Validate array field type requirement
      if (!context.schemaNode) {
        context.utils.logWarning(`x-uigen-chart at ${context.path}: schema node not found`);
        return;
      }

      if (context.schemaNode.type !== 'array') {
        context.utils.logWarning(
          `x-uigen-chart at ${context.path} can only be applied to array fields, found type "${context.schemaNode.type}"`
        );
        return;
      }

      // Validate array items are objects (not primitives)
      if (!context.schemaNode.items || context.schemaNode.items.type !== 'object') {
        context.utils.logWarning(
          `x-uigen-chart at ${context.path} requires array items to be objects, not primitives`
        );
        return;
      }

      // Validate field references
      const itemsSchema = context.schemaNode.items;
      if (itemsSchema.children) {
        // Validate xAxis field exists
        const xAxisField = itemsSchema.children.find(child => child.key === value.xAxis);
        if (!xAxisField) {
          context.utils.logWarning(
            `x-uigen-chart at ${context.path}: xAxis field "${value.xAxis}" not found in array items schema`
          );
        }

        // Validate yAxis fields exist
        const yAxisFields = Array.isArray(value.yAxis) ? value.yAxis : [value.yAxis];
        for (const field of yAxisFields) {
          const yAxisField = itemsSchema.children.find(child => child.key === field);
          if (!yAxisField) {
            context.utils.logWarning(
              `x-uigen-chart at ${context.path}: yAxis field "${field}" not found in array items schema`
            );
          }
        }

        // Validate labels field exists (if provided)
        if (value.labels) {
          const labelsField = itemsSchema.children.find(child => child.key === value.labels);
          if (!labelsField) {
            context.utils.logWarning(
              `x-uigen-chart at ${context.path}: labels field "${value.labels}" not found in array items schema`
            );
          }
        }
      }

      // Auto-generate series if yAxis is array and series not provided
      let series = value.series;
      if (Array.isArray(value.yAxis) && !series) {
        series = value.yAxis.map(field => ({
          field,
          label: context.utils.humanize(field)
        }));
      }

      // Set chartConfig on schema node
      context.schemaNode.chartConfig = {
        chartType: value.chartType as ChartType,
        xAxis: value.xAxis,
        yAxis: value.yAxis,
        series: series as SeriesConfig[] | undefined,
        labels: value.labels,
        options: value.options
      };
    } catch (error) {
      context.utils.logWarning(`x-uigen-chart at ${context.path}: apply error - ${error}`);
    }
  }
}
