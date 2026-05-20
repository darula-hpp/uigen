import type { SchemaNode } from '@uigen-dev/core';

/**
 * Format a schema field value for read-only display in detail and action result views.
 */
export function formatFieldValue(value: unknown, field: SchemaNode): string {
  if (value === null || value === undefined) return '-';

  if (field.type === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (field.type === 'date' || field.format === 'date') {
    try {
      const date = new Date(value as string);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return String(value);
    }
  }

  if (field.format === 'date-time') {
    try {
      const date = new Date(value as string);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      });
    } catch {
      return String(value);
    }
  }

  if (field.type === 'number' || field.type === 'integer') {
    const num = Number(value);
    if (!isNaN(num)) {
      return num.toLocaleString('en-US');
    }
  }

  if (field.type === 'enum' && field.enumValues) {
    return String(value);
  }

  if (field.type === 'array' && Array.isArray(value)) {
    if (value.length === 0) return 'None';
    return value
      .map((entry) =>
        formatFieldValue(entry, field.items || { type: 'string', key: '', label: '', required: false })
      )
      .join(', ');
  }

  if (field.type === 'object' && typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}
