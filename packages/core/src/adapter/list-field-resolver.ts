import type { ChartConfig, Operation, Resource, SchemaNode } from '../ir/types.js';
import { SchemaFieldFilter } from './schema-field-filter.js';

const DEFAULT_VISIBLE_COLUMN_LIMIT = 6;

/**
 * Resolves list/search display fields, columns, and chart config from IR schemas.
 */
export class ListFieldResolver {
  static resolveFields(resource: Resource, listOp?: Operation): SchemaNode[] {
    const resourceFields = (resource.schema.children ?? []).filter(SchemaFieldFilter.isVisible);
    if (resourceFields.length > 0) {
      return resourceFields;
    }

    return ListFieldResolver.fieldsFromResponseSchema(listOp?.responses?.['200']?.schema);
  }

  static isSingletonResponse(listOp?: Operation): boolean {
    return listOp?.responses?.['200']?.schema?.type === 'object';
  }

  static resolveColumns(
    resource: Resource,
    listOp?: Operation,
    columnLimit = DEFAULT_VISIBLE_COLUMN_LIMIT,
  ): SchemaNode[] {
    return ListFieldResolver.resolveFields(resource, listOp).slice(0, columnLimit);
  }

  static resolveChartConfig(resource: Resource, listOp?: Operation): ChartConfig | undefined {
    const responseSchema = listOp?.responses?.['200']?.schema;

    return (
      resource.schema.chartConfig ??
      responseSchema?.chartConfig ??
      responseSchema?.items?.chartConfig
    );
  }

  static resolveItemSchema(listOp?: Operation): SchemaNode | undefined {
    const responseSchema = listOp?.responses?.['200']?.schema;
    if (!responseSchema) {
      return undefined;
    }

    switch (responseSchema.type) {
      case 'array':
        return responseSchema.items;
      case 'object':
        return responseSchema;
      default:
        return responseSchema.items;
    }
  }

  private static fieldsFromArrayItems(items?: SchemaNode): SchemaNode[] {
    return (items?.children ?? []).filter(SchemaFieldFilter.isVisible);
  }

  private static fieldsFromResponseSchema(responseSchema?: SchemaNode): SchemaNode[] {
    if (!responseSchema) {
      return [];
    }

    switch (responseSchema.type) {
      case 'array':
        return ListFieldResolver.fieldsFromArrayItems(responseSchema.items);
      case 'object':
        return (responseSchema.children ?? []).filter(SchemaFieldFilter.isVisible);
      default: {
        const nestedArray = responseSchema.children?.find(
          (child) => child.type === 'array' && child.items?.children?.length
        );
        if (nestedArray?.items) {
          return ListFieldResolver.fieldsFromArrayItems(nestedArray.items);
        }
        return [];
      }
    }
  }
}
