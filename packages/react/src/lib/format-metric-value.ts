import type { SchemaNode } from '@uigen-dev/core';
import { formatFieldValue } from '@/lib/format-field-value';

export function formatMetricValue(value: unknown, field: SchemaNode): string {
  if (value === null || value === undefined) {
    return '-';
  }

  const num = Number(value);
  if (Number.isNaN(num)) {
    return formatFieldValue(value, field);
  }

  if (field.type === 'integer') {
    return num.toLocaleString('en-US');
  }

  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
