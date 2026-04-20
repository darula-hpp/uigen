import type { OpenAPIV3 } from 'openapi-types';
import type { SchemaNode } from '../../ir/types.js';

/**
 * Maps OpenAPI types to UIGen IR types.
 * 
 * Handles format-based type detection (date, binary) and contentMediaType.
 * Implements the Visitor pattern for type mapping operations.
 * 
 * Requirements: 2.1-2.12
 */
export interface TypeMappingVisitor {
  /**
   * Visit a string schema and determine its IR type.
   * Handles date formats and binary formats.
   * 
   * @param schema - OpenAPI schema object with type: 'string'
   * @returns IR type ('string', 'date', or 'file')
   */
  visitString(schema: OpenAPIV3.SchemaObject): 'string' | 'date' | 'file';

  /**
   * Visit a number schema and determine its IR type.
   * 
   * @param schema - OpenAPI schema object with type: 'number'
   * @returns IR type ('number')
   */
  visitNumber(schema: OpenAPIV3.SchemaObject): 'number';

  /**
   * Visit an integer schema and determine its IR type.
   * 
   * @param schema - OpenAPI schema object with type: 'integer'
   * @returns IR type ('integer')
   */
  visitInteger(schema: OpenAPIV3.SchemaObject): 'integer';

  /**
   * Visit a boolean schema and determine its IR type.
   * 
   * @param schema - OpenAPI schema object with type: 'boolean'
   * @returns IR type ('boolean')
   */
  visitBoolean(schema: OpenAPIV3.SchemaObject): 'boolean';

  /**
   * Visit an object schema and determine its IR type.
   * 
   * @param schema - OpenAPI schema object with type: 'object'
   * @returns IR type ('object')
   */
  visitObject(schema: OpenAPIV3.SchemaObject): 'object';

  /**
   * Visit an array schema and determine its IR type.
   * 
   * @param schema - OpenAPI schema object with type: 'array'
   * @returns IR type ('array')
   */
  visitArray(schema: OpenAPIV3.SchemaObject): 'array';

  /**
   * Map OpenAPI type and format to UIGen IR type.
   * 
   * Type mapping rules:
   * - format: 'date' | 'date-time' → 'date'
   * - format: 'binary' → 'file'
   * - contentMediaType: any non-empty value → 'file'
   * - type: 'string' → 'string'
   * - type: 'number' → 'number'
   * - type: 'integer' → 'integer'
   * - type: 'boolean' → 'boolean'
   * - type: 'object' → 'object'
   * - type: 'array' → 'array'
   * - Default → 'string'
   * 
   * @param type - OpenAPI type (string, number, integer, boolean, object, array)
   * @param format - OpenAPI format (date, date-time, binary, email, uri)
   * @param schema - Full schema object for additional context
   * @returns IR type
   */
  mapType(
    type: string | undefined,
    format: string | undefined,
    schema?: OpenAPIV3.SchemaObject
  ): SchemaNode['type'];
}

/**
 * Default implementation of TypeMappingVisitor.
 * Preserves all existing type mapping behavior from OpenAPI3Adapter.
 */
export class DefaultTypeMappingVisitor implements TypeMappingVisitor {
  visitString(schema: OpenAPIV3.SchemaObject): 'string' | 'date' | 'file' {
    // Check format for date types
    if (schema.format === 'date' || schema.format === 'date-time') {
      return 'date';
    }

    // Check format for binary types
    if (schema.format === 'binary') {
      return 'file';
    }

    // Check contentMediaType for file types (any non-empty contentMediaType indicates a file)
    const contentMediaType = (schema as any).contentMediaType;
    if (contentMediaType && typeof contentMediaType === 'string' && contentMediaType.trim() !== '') {
      return 'file';
    }

    return 'string';
  }

  visitNumber(_schema: OpenAPIV3.SchemaObject): 'number' {
    return 'number';
  }

  visitInteger(_schema: OpenAPIV3.SchemaObject): 'integer' {
    return 'integer';
  }

  visitBoolean(_schema: OpenAPIV3.SchemaObject): 'boolean' {
    return 'boolean';
  }

  visitObject(_schema: OpenAPIV3.SchemaObject): 'object' {
    return 'object';
  }

  visitArray(_schema: OpenAPIV3.SchemaObject): 'array' {
    return 'array';
  }

  mapType(
    type: string | undefined,
    format: string | undefined,
    schema?: OpenAPIV3.SchemaObject
  ): SchemaNode['type'] {
    // Handle format-based type detection first
    if (format === 'date' || format === 'date-time') {
      return 'date';
    }

    if (format === 'binary') {
      return 'file';
    }

    // Check contentMediaType for file types (any non-empty contentMediaType indicates a file)
    if (schema) {
      const contentMediaType = (schema as any).contentMediaType;
      if (contentMediaType && typeof contentMediaType === 'string' && contentMediaType.trim() !== '') {
        return 'file';
      }
    }

    // Map OpenAPI types to IR types
    switch (type) {
      case 'string':
        return schema ? this.visitString(schema) : 'string';
      case 'number':
        return 'number';
      case 'integer':
        return 'integer';
      case 'boolean':
        return 'boolean';
      case 'object':
        return 'object';
      case 'array':
        return 'array';
      default:
        // Default to string for unknown types
        return 'string';
    }
  }
}
