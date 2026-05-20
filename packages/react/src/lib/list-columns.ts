import type { Operation, Resource, SchemaNode } from '@uigen-dev/core';

const VISIBLE_COLUMN_LIMIT = 6;

type IgnorableSchemaNode = SchemaNode & { __shouldIgnore?: boolean };

function isVisibleField(node: SchemaNode): boolean {
  return !(node as IgnorableSchemaNode).__shouldIgnore;
}

function columnsFromArrayItems(items?: SchemaNode): SchemaNode[] {
  return (items?.children ?? []).filter(isVisibleField);
}

/**
 * Resolve list/search table columns from the resource schema, falling back to the
 * list operation's 200 response array item schema when resource schema is empty.
 */
export function resolveListColumns(resource: Resource, listOp?: Operation): SchemaNode[] {
  const resourceColumns = (resource.schema.children ?? []).filter(isVisibleField);
  if (resourceColumns.length > 0) {
    return resourceColumns.slice(0, VISIBLE_COLUMN_LIMIT);
  }

  const responseSchema = listOp?.responses?.['200']?.schema;
  if (!responseSchema) {
    return [];
  }

  switch (responseSchema.type) {
    case 'array':
      return columnsFromArrayItems(responseSchema.items).slice(0, VISIBLE_COLUMN_LIMIT);
    default: {
      const nestedArray = responseSchema.children?.find(
        (child) => child.type === 'array' && child.items?.children?.length
      );
      if (nestedArray?.items) {
        return columnsFromArrayItems(nestedArray.items).slice(0, VISIBLE_COLUMN_LIMIT);
      }
      return [];
    }
  }
}

export function resolveListChartConfig(resource: Resource, listOp?: Operation) {
  const responseSchema = listOp?.responses?.['200']?.schema;

  return (
    resource.schema.chartConfig ??
    responseSchema?.chartConfig ??
    responseSchema?.items?.chartConfig
  );
}
