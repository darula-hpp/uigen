import type { Operation, SchemaNode } from '@uigen-dev/core';
import { SchemaFieldFilter } from '@uigen-dev/core';

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function fieldsFromData(data: Record<string, unknown>): SchemaNode[] {
  return Object.keys(data).map((key) => ({
    type: 'string',
    key,
    label: humanizeKey(key),
    required: false,
  }));
}

export function resolveActionResponseSchema(operation: Operation): SchemaNode | undefined {
  return (
    operation.responses['201']?.schema
    ?? operation.responses['200']?.schema
    ?? operation.responses['2XX']?.schema
  );
}

function resolveListItemSchema(schema: SchemaNode | undefined): SchemaNode | undefined {
  if (!schema) {
    return undefined;
  }

  if (schema.type === 'array' && schema.items) {
    return schema.items;
  }

  return schema;
}

/**
 * Resolve display fields for an action response using the operation schema,
 * falling back to keys present in the response payload.
 */
export function resolveActionResultFields(
  operation: Operation,
  data: unknown
): SchemaNode[] {
  const responseSchema = resolveListItemSchema(resolveActionResponseSchema(operation));
  const schemaFields = (responseSchema?.children ?? []).filter(SchemaFieldFilter.isVisible);

  if (schemaFields.length > 0) {
    return schemaFields;
  }

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return fieldsFromData(data as Record<string, unknown>);
  }

  return [];
}
