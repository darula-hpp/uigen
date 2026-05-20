import type { SchemaNode } from '@uigen-dev/core';

export type FieldDisplayMode = 'metric' | 'badge' | 'default';

type DisplayHintSchemaNode = SchemaNode & {
  displayHint?: FieldDisplayMode;
};

/**
 * Resolve how a read-only field should be rendered.
 * Numbers default to metric cards; identifiers and foreign keys stay inline.
 */
export function resolveFieldDisplayMode(field: SchemaNode): FieldDisplayMode {
  const explicitHint = (field as DisplayHintSchemaNode).displayHint;
  if (explicitHint) {
    return explicitHint;
  }

  if (field.type === 'boolean') {
    return 'badge';
  }

  if (field.type === 'enum' && field.enumValues && field.enumValues.length > 0) {
    return 'badge';
  }

  if (field.type === 'number' || field.type === 'integer') {
    if (field.key === 'id' || field.key.endsWith('_id')) {
      return 'default';
    }
    return 'metric';
  }

  return 'default';
}

export function partitionFieldsByDisplayMode(fields: SchemaNode[]) {
  const metricFields: SchemaNode[] = [];
  const badgeFields: SchemaNode[] = [];
  const defaultFields: SchemaNode[] = [];

  for (const field of fields) {
    switch (resolveFieldDisplayMode(field)) {
      case 'metric':
        metricFields.push(field);
        break;
      case 'badge':
        badgeFields.push(field);
        break;
      default:
        defaultFields.push(field);
        break;
    }
  }

  return { metricFields, badgeFields, defaultFields };
}

/**
 * Resolve a unit suffix for measurement-style numeric fields from sibling payload data.
 */
export function resolveMetricSuffix(field: SchemaNode, data: Record<string, unknown>): string | undefined {
  const unit = data.unit;
  if (typeof unit !== 'string' || unit.length === 0) {
    return undefined;
  }

  if (field.key === 'value' || field.key.endsWith('_value')) {
    return unit;
  }

  if (field.key.includes('min') || field.key.includes('max') || field.key.includes('threshold')) {
    return unit;
  }

  return undefined;
}
