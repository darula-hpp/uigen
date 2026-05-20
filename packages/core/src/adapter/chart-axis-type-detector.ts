import type { ChartAxisType, SchemaNode } from '../ir/types.js';

const ISO_DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

/**
 * Detects the semantic type of a chart x-axis from schema metadata and sample values.
 */
export class ChartAxisTypeDetector {
  static detect(xAxisField: string, itemSchema?: SchemaNode, sampleValues: unknown[] = []): ChartAxisType {
    const fieldNode = itemSchema?.children?.find((child) => child.key === xAxisField);

    if (fieldNode?.format === 'date-time' || fieldNode?.format === 'date' || fieldNode?.dateTimeConfig) {
      return 'time';
    }

    if (fieldNode?.type === 'number' || fieldNode?.type === 'integer') {
      return 'number';
    }

    const typedValues = sampleValues.filter((value) => value != null && value !== '');
    if (typedValues.length === 0) {
      return 'category';
    }

    if (typedValues.every((value) => ChartAxisTypeDetector.isNumericValue(value))) {
      return 'number';
    }

    if (typedValues.every((value) => ChartAxisTypeDetector.isTimeValue(value))) {
      return 'time';
    }

    return 'category';
  }

  private static isNumericValue(value: unknown): boolean {
    if (typeof value === 'number') {
      return Number.isFinite(value);
    }

    if (typeof value === 'string' && value.trim() !== '') {
      return Number.isFinite(Number(value));
    }

    return false;
  }

  private static isTimeValue(value: unknown): boolean {
    if (value instanceof Date) {
      return !Number.isNaN(value.getTime());
    }

    if (typeof value !== 'string') {
      return false;
    }

    if (!ISO_DATE_PATTERN.test(value.trim())) {
      return false;
    }

    return !Number.isNaN(Date.parse(value));
  }
}
