import type { OpenAPIV3 } from 'openapi-types';
import type { SchemaNode } from '../../ir/types.js';
import type { DefaultTypeMappingVisitor } from '../visitors/type-mapping-visitor.js';
import type { DefaultValidationExtractionVisitor } from '../visitors/validation-extraction-visitor.js';
import type { DefaultFileMetadataVisitor } from '../visitors/file-metadata-visitor.js';

/**
 * Callback type for recursive schema processing.
 * Used by the factory to delegate child/items processing back to the Schema_Processor.
 *
 * @param key - Property key name
 * @param schema - OpenAPI schema object or reference
 * @param visited - Set of visited $ref paths for circular reference detection
 * @param parentSchema - Optional parent schema for annotation precedence
 * @returns Processed SchemaNode
 */
export type ProcessSchemaFn = (
  key: string,
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
  visited: Set<string>,
  parentSchema?: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject
) => SchemaNode;

/**
 * Creates different types of schema nodes from OpenAPI schema objects.
 *
 * Implements the Factory pattern for schema node creation, encapsulating
 * the creation logic for each node type (object, array, primitive, enum,
 * file, date, placeholder).
 *
 * Delegates recursive child/items processing back to the Schema_Processor
 * via the processSchema callback to keep concerns separated.
 *
 * Requirements: 6.1-6.12
 */
export interface SchemaNodeFactory {
  /**
   * Create an object schema node with recursively processed child properties.
   *
   * @param key - Property key name
   * @param schema - OpenAPI schema object with type: 'object'
   * @param visited - Set of visited $ref paths for circular reference detection
   * @returns SchemaNode with type 'object' and populated children
   */
  createObjectNode(
    key: string,
    schema: OpenAPIV3.SchemaObject,
    visited: Set<string>
  ): SchemaNode;

  /**
   * Create an array schema node with recursively processed items.
   *
   * Also handles the multiple-file-upload case where items have format: 'binary'.
   *
   * @param key - Property key name
   * @param schema - OpenAPI schema object with type: 'array'
   * @param visited - Set of visited $ref paths for circular reference detection
   * @returns SchemaNode with type 'array' and populated items
   */
  createArrayNode(
    key: string,
    schema: OpenAPIV3.SchemaObject,
    visited: Set<string>
  ): SchemaNode;

  /**
   * Create a primitive schema node (string, number, integer, or boolean).
   *
   * @param key - Property key name
   * @param schema - OpenAPI schema object
   * @param type - The resolved IR primitive type
   * @returns SchemaNode with the given primitive type
   */
  createPrimitiveNode(
    key: string,
    schema: OpenAPIV3.SchemaObject,
    type: 'string' | 'number' | 'integer' | 'boolean'
  ): SchemaNode;

  /**
   * Create an enum schema node with extracted enum values.
   *
   * @param key - Property key name
   * @param schema - OpenAPI schema object with an enum array
   * @returns SchemaNode with type 'enum' and enumValues populated
   */
  createEnumNode(
    key: string,
    schema: OpenAPIV3.SchemaObject
  ): SchemaNode;

  /**
   * Create a file schema node with extracted file metadata.
   *
   * @param key - Property key name
   * @param schema - OpenAPI schema object with format: 'binary'
   * @returns SchemaNode with type 'file' and fileMetadata populated
   */
  createFileNode(
    key: string,
    schema: OpenAPIV3.SchemaObject
  ): SchemaNode;

  /**
   * Create a date schema node.
   *
   * @param key - Property key name
   * @param schema - OpenAPI schema object with format: 'date' or 'date-time'
   * @returns SchemaNode with type 'date'
   */
  createDateNode(
    key: string,
    schema: OpenAPIV3.SchemaObject
  ): SchemaNode;

  /**
   * Create a placeholder schema node for circular references or unresolvable refs.
   *
   * @param key - Property key name
   * @returns Minimal SchemaNode with type 'object' and empty children
   */
  createPlaceholderNode(key: string): SchemaNode;
}

/**
 * Default implementation of SchemaNodeFactory.
 * Preserves all existing schema node creation behavior from OpenAPI3Adapter.
 */
export class DefaultSchemaNodeFactory implements SchemaNodeFactory {
  private typeMappingVisitor: DefaultTypeMappingVisitor;
  private validationVisitor: DefaultValidationExtractionVisitor;
  private fileMetadataVisitor: DefaultFileMetadataVisitor;
  private processSchema: ProcessSchemaFn;
  private humanize: (str: string) => string;

  /**
   * @param typeMappingVisitor - Visitor for mapping OpenAPI types to IR types
   * @param validationVisitor - Visitor for extracting validation rules
   * @param fileMetadataVisitor - Visitor for extracting file metadata
   * @param processSchema - Callback to the Schema_Processor for recursive processing
   * @param humanize - Helper to convert keys to human-readable labels
   */
  constructor(
    typeMappingVisitor: DefaultTypeMappingVisitor,
    validationVisitor: DefaultValidationExtractionVisitor,
    fileMetadataVisitor: DefaultFileMetadataVisitor,
    processSchema: ProcessSchemaFn,
    humanize: (str: string) => string
  ) {
    this.typeMappingVisitor = typeMappingVisitor;
    this.validationVisitor = validationVisitor;
    this.fileMetadataVisitor = fileMetadataVisitor;
    this.processSchema = processSchema;
    this.humanize = humanize;
  }

  createObjectNode(
    key: string,
    schema: OpenAPIV3.SchemaObject,
    visited: Set<string>
  ): SchemaNode {
    const node: SchemaNode = {
      type: 'object',
      key,
      label: this.humanize(key),
      required: false,
      description: schema.description,
      default: schema.default,
      children: []
    };

    if (schema.properties) {
      // Process all properties so annotations can mark them (including ignored ones)
      node.children = Object.entries(schema.properties).map(([k, v]) =>
        this.processSchema(k, v as OpenAPIV3.SchemaObject, visited, schema)
      );

      // Propagate parent-level x-uigen-ignore: true to children without explicit annotations
      const schemaIgnoreAnnotation = (schema as any)['x-uigen-ignore'];
      if (schemaIgnoreAnnotation === true && node.children) {
        for (const child of node.children) {
          const childSchema = (schema.properties as any)[child.key];
          const childIgnoreAnnotation = (childSchema as any)?.['x-uigen-ignore'];
          if (childIgnoreAnnotation === undefined) {
            (child as any).__shouldIgnore = true;
          }
        }
      }

      // Mark required children
      if (schema.required) {
        schema.required.forEach(reqKey => {
          const child = node.children?.find(c => c.key === reqKey);
          if (child) child.required = true;
        });
      }
    }

    this.applyCommonMetadata(node, schema);
    return node;
  }

  createArrayNode(
    key: string,
    schema: OpenAPIV3.SchemaObject,
    visited: Set<string>
  ): SchemaNode {
    const node: SchemaNode = {
      type: 'array',
      key,
      label: this.humanize(key),
      required: false,
      description: schema.description,
      default: schema.default
    };

    if ('items' in schema && schema.items) {
      node.items = this.processSchema('item', schema.items as OpenAPIV3.SchemaObject, visited, schema);

      // Detect array of binary files for multiple file upload
      const itemsSchema = schema.items as OpenAPIV3.SchemaObject;
      if (itemsSchema && itemsSchema.format === 'binary' && node.items) {
        const itemFileMetadata = this.fileMetadataVisitor.extractFileMetadata(itemsSchema);
        if (itemFileMetadata) {
          node.items.fileMetadata = { ...itemFileMetadata, multiple: true };
        }
      }
    }

    this.applyCommonMetadata(node, schema);
    return node;
  }

  createPrimitiveNode(
    key: string,
    schema: OpenAPIV3.SchemaObject,
    type: 'string' | 'number' | 'integer' | 'boolean'
  ): SchemaNode {
    const node: SchemaNode = {
      type,
      key,
      label: this.humanize(key),
      required: false,
      description: schema.description,
      default: schema.default
    };

    this.applyCommonMetadata(node, schema);
    return node;
  }

  createEnumNode(
    key: string,
    schema: OpenAPIV3.SchemaObject
  ): SchemaNode {
    const node: SchemaNode = {
      type: 'enum',
      key,
      label: this.humanize(key),
      required: false,
      description: schema.description,
      default: schema.default,
      enumValues: schema.enum as string[]
    };

    this.applyCommonMetadata(node, schema);
    return node;
  }

  createFileNode(
    key: string,
    schema: OpenAPIV3.SchemaObject
  ): SchemaNode {
    const node: SchemaNode = {
      type: 'file',
      key,
      label: this.humanize(key),
      required: false,
      description: schema.description,
      default: schema.default,
      fileMetadata: this.fileMetadataVisitor.extractFileMetadata(schema)
    };

    this.applyCommonMetadata(node, schema);
    return node;
  }

  createDateNode(
    key: string,
    schema: OpenAPIV3.SchemaObject
  ): SchemaNode {
    const node: SchemaNode = {
      type: 'date',
      key,
      label: this.humanize(key),
      required: false,
      description: schema.description,
      default: schema.default
    };

    this.applyCommonMetadata(node, schema);
    return node;
  }

  createPlaceholderNode(key: string): SchemaNode {
    return {
      type: 'object',
      key,
      label: this.humanize(key),
      required: false,
      children: []
    };
  }

  /**
   * Apply common metadata fields to a schema node.
   * Preserves format, readOnly, writeOnly, nullable, deprecated, and validations.
   *
   * @param node - The schema node to update in place
   * @param schema - The source OpenAPI schema object
   */
  private applyCommonMetadata(node: SchemaNode, schema: OpenAPIV3.SchemaObject): void {
    node.validations = this.validationVisitor.extractValidations(schema);
    node.format = schema.format;
    node.readOnly = schema.readOnly;
    node.writeOnly = schema.writeOnly;
    node.nullable = schema.nullable;
    node.deprecated = schema.deprecated;
  }
}
