import type { OpenAPIV3 } from 'openapi-types';
import type { SchemaNode, UIGenApp } from '../ir/types.js';
import { SchemaResolver } from './schema-resolver.js';
import { DefaultTypeMappingVisitor } from './visitors/type-mapping-visitor.js';
import { DefaultValidationExtractionVisitor } from './visitors/validation-extraction-visitor.js';
import { DefaultFileMetadataVisitor } from './visitors/file-metadata-visitor.js';
import { DefaultReferenceResolutionVisitor } from './visitors/reference-resolution-visitor.js';
import { DefaultSchemaNodeFactory } from './factories/schema-node-factory.js';
import { AnnotationHandlerRegistry, createSchemaContext } from './annotations/index.js';
import type { AdapterUtils } from './annotations/index.js';

/**
 * Processes OpenAPI schemas and converts them to UIGen's SchemaNode IR.
 *
 * Uses Visitor pattern for schema traversal and Factory pattern for node creation.
 * Integrates with AnnotationHandlerRegistry for vendor extension processing.
 *
 * Orchestrates the following components:
 * - DefaultTypeMappingVisitor: Maps OpenAPI types to IR types
 * - DefaultValidationExtractionVisitor: Extracts validation rules
 * - DefaultFileMetadataVisitor: Extracts file upload metadata
 * - DefaultReferenceResolutionVisitor: Resolves $ref references
 * - DefaultSchemaNodeFactory: Creates typed schema nodes
 *
 * @example
 * const processor = new SchemaProcessor(document, adapterUtils, annotationRegistry);
 * processor.setCurrentIR(ir);
 * const schemaNode = processor.processSchema('user', userSchema);
 */
export class SchemaProcessor {
  private document: OpenAPIV3.Document;
  private adapterUtils: AdapterUtils;
  private annotationRegistry: AnnotationHandlerRegistry;
  private resolver: SchemaResolver;
  private typeMappingVisitor: DefaultTypeMappingVisitor;
  private validationVisitor: DefaultValidationExtractionVisitor;
  private fileMetadataVisitor: DefaultFileMetadataVisitor;
  private referenceVisitor: DefaultReferenceResolutionVisitor;
  private factory: DefaultSchemaNodeFactory;
  private currentIR?: UIGenApp;

  /**
   * Creates a new SchemaProcessor instance.
   *
   * @param document - The OpenAPI 3.x document being processed
   * @param adapterUtils - Utility methods (humanize, resolveRef, logError, logWarning)
   * @param annotationRegistry - Registry for processing vendor extensions (x-uigen-*)
   */
  constructor(
    document: OpenAPIV3.Document,
    adapterUtils: AdapterUtils,
    annotationRegistry: AnnotationHandlerRegistry
  ) {
    this.document = document;
    this.adapterUtils = adapterUtils;
    this.annotationRegistry = annotationRegistry;

    // Create SchemaResolver with processSchema as the adaptSchema callback
    this.resolver = new SchemaResolver(this.document, this.processSchema.bind(this));

    // Instantiate visitors
    this.typeMappingVisitor = new DefaultTypeMappingVisitor();
    this.validationVisitor = new DefaultValidationExtractionVisitor();
    this.fileMetadataVisitor = new DefaultFileMetadataVisitor();
    this.referenceVisitor = new DefaultReferenceResolutionVisitor(this.resolver);

    // Instantiate factory with processSchema callback and humanize helper
    this.factory = new DefaultSchemaNodeFactory(
      this.typeMappingVisitor,
      this.validationVisitor,
      this.fileMetadataVisitor,
      this.processSchema.bind(this),
      adapterUtils.humanize
    );
  }

  /**
   * Set the current IR being built.
   *
   * The annotation registry needs a UIGenApp IR object. This method allows
   * the OpenAPI3Adapter to pass the IR after it has been initialized in adapt().
   *
   * @param ir - The UIGenApp IR object currently being built
   */
  setCurrentIR(ir: UIGenApp): void {
    this.currentIR = ir;
  }

  /**
   * Process an OpenAPI schema and convert it to a SchemaNode.
   *
   * This is the main entry point for schema processing. It replicates the
   * exact behavior of OpenAPI3Adapter.adaptSchema() while delegating to
   * visitors and factories for specific operations.
   *
   * Handles:
   * - Null/undefined schemas (returns placeholder)
   * - $ref schemas (resolves reference, applies annotations)
   * - Enum schemas (creates enum node)
   * - Object schemas (creates object node with children)
   * - Array schemas (creates array node with items)
   * - File schemas (creates file node with metadata)
   * - Date schemas (creates date node)
   * - Primitive schemas (creates string/number/integer/boolean node)
   *
   * @param key - The property key name
   * @param schema - The OpenAPI schema object or reference
   * @param visited - Set of visited $ref paths for circular reference detection
   * @param parentSchema - Optional parent schema for annotation precedence
   * @returns The processed SchemaNode
   */
  processSchema(
    key: string,
    schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
    visited: Set<string> = new Set(),
    parentSchema?: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject
  ): SchemaNode {
    if (!schema) return this.createPlaceholderNode(key);

    // Handle $ref schemas
    if ('$ref' in schema) {
      const resolved = this.referenceVisitor.resolveReference(schema.$ref, visited);
      if (!resolved) {
        const placeholder = this.createPlaceholderNode(key);
        // Check if the $ref itself has x-uigen-ignore annotation
        if (this.shouldIgnoreSchema(schema)) {
          (placeholder as any).__shouldIgnore = true;
        }
        return placeholder;
      }

      // Check if the $ref itself has x-uigen-ignore annotation
      // Note: We check the schema (the $ref object), not the resolved schema
      if (this.shouldIgnoreSchema(schema)) {
        const placeholder = this.createPlaceholderNode(key);
        (placeholder as any).__shouldIgnore = true;
        return placeholder;
      }

      const node = { ...resolved, key, label: this.resolveLabel(key, schema, resolved) };

      // Process annotations using the registry for $ref properties
      if (this.currentIR) {
        const context = createSchemaContext(
          schema,
          key,
          this.adapterUtils,
          this.currentIR,
          parentSchema,
          node
        );
        this.annotationRegistry.processAnnotations(context);
      }

      return node;
    }

    // Handle anyOf schemas - unwrap and use first non-null option
    const unwrappedSchema = this.unwrapAnyOf(schema as OpenAPIV3.SchemaObject);

    // Determine the IR type using the type mapping visitor
    const type = this.typeMappingVisitor.mapType(unwrappedSchema.type, unwrappedSchema.format, unwrappedSchema);

    // Resolve the label (checks x-uigen-label first, then humanized key)
    const label = this.resolveLabel(key, schema);

    // Create node using appropriate factory method
    let node: SchemaNode;

    // Enum takes precedence over type-based routing
    if (unwrappedSchema.enum) {
      node = this.factory.createEnumNode(key, unwrappedSchema);
    } else {
      // Route based on type
      node = this.createNodeByType(key, unwrappedSchema, type, visited);
    }

    // Override label with resolved label
    node.label = label;

    // Process annotations using the registry
    if (this.currentIR) {
      const context = createSchemaContext(
        schema,
        key,
        this.adapterUtils,
        this.currentIR,
        parentSchema,
        node
      );
      this.annotationRegistry.processAnnotations(context);
    }

    return node;
  }

  /**
   * Determine if a schema should be ignored based on x-uigen-ignore annotations.
   *
   * Precedence rules:
   * - Element-level x-uigen-ignore: true → ignore
   * - Element-level x-uigen-ignore: false → include (overrides parent)
   * - Parent-level x-uigen-ignore: true → ignore
   * - Parent-level x-uigen-ignore: false → include
   * - Neither has annotation → include (default)
   *
   * Logs warnings for non-boolean x-uigen-ignore values.
   *
   * @param schema - The schema object to check
   * @param parent - Optional parent schema for precedence checking
   * @returns true if the schema should be ignored, false otherwise
   */
  shouldIgnoreSchema(
    schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
    parent?: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject
  ): boolean {
    // Check element-level annotation first (highest precedence)
    const schemaAnnotation = (schema as any)['x-uigen-ignore'];

    if (typeof schemaAnnotation === 'boolean') {
      return schemaAnnotation;
    }

    if (schemaAnnotation !== undefined) {
      console.warn(`x-uigen-ignore must be a boolean, found ${typeof schemaAnnotation}`);
    }

    // Check parent-level annotation if present
    if (parent) {
      const parentAnnotation = (parent as any)['x-uigen-ignore'];

      if (typeof parentAnnotation === 'boolean') {
        return parentAnnotation;
      }

      if (parentAnnotation !== undefined) {
        console.warn(`x-uigen-ignore must be a boolean, found ${typeof parentAnnotation}`);
      }
    }

    // Default: do not ignore
    return false;
  }

  /**
   * Resolve the label for a schema node.
   *
   * Label resolution precedence:
   * 1. x-uigen-label vendor extension (highest priority)
   * 2. Resolved target label for $ref schemas (when it differs from humanized key)
   * 3. Humanized key name (fallback)
   *
   * @param key - The property key name
   * @param schema - The schema object (may contain x-uigen-label)
   * @param resolvedTarget - Optional resolved $ref target node
   * @returns A non-empty label string
   */
  resolveLabel(key: string, schema: object, resolvedTarget?: SchemaNode): string {
    const ext = (schema as Record<string, unknown>)['x-uigen-label'];
    if (typeof ext === 'string' && ext.trim() !== '') return ext;
    if (resolvedTarget && resolvedTarget.label !== this.adapterUtils.humanize(resolvedTarget.key)) {
      return resolvedTarget.label;
    }
    return this.adapterUtils.humanize(key);
  }

  /**
   * Unwrap anyOf schemas by selecting the first non-null option.
   * 
   * This handles nullable fields defined with anyOf:
   * ```yaml
   * anyOf:
   *   - type: string
   *     contentMediaType: application/octet-stream
   *   - type: 'null'
   * ```
   * 
   * Returns the first schema that is not a null type.
   * If no anyOf is present, returns the original schema.
   * 
   * @param schema - The OpenAPI schema object
   * @returns The unwrapped schema or original schema
   */
  private unwrapAnyOf(schema: OpenAPIV3.SchemaObject): OpenAPIV3.SchemaObject {
    // Check if schema has anyOf
    if (!schema.anyOf || !Array.isArray(schema.anyOf)) {
      return schema;
    }

    // Find the first non-null schema in anyOf
    for (const option of schema.anyOf) {
      // Skip $ref options for now (would need resolution)
      if ('$ref' in option) {
        continue;
      }

      const schemaOption = option as OpenAPIV3.SchemaObject;
      
      // Skip null types (check as any since TypeScript doesn't recognize 'null' as valid type)
      if ((schemaOption as any).type === 'null') {
        continue;
      }

      // Found a non-null option - merge it with parent schema properties
      // This preserves any properties defined at the parent level
      return {
        ...schema,
        ...schemaOption,
        // Remove anyOf from the merged schema to avoid infinite recursion
        anyOf: undefined
      };
    }

    // If all options were null or $ref, return original schema
    return schema;
  }

  /**
   * Create a schema node based on its type.
   *
   * Routes to the appropriate factory method based on the IR type.
   * Uses a switch statement for cleaner, more maintainable code.
   *
   * @param key - The property key name
   * @param schema - The OpenAPI schema object
   * @param type - The IR type (from type mapping visitor)
   * @param visited - Set of visited $ref paths for circular reference detection
   * @returns The created SchemaNode
   */
  private createNodeByType(
    key: string,
    schema: OpenAPIV3.SchemaObject,
    type: SchemaNode['type'],
    visited: Set<string>
  ): SchemaNode {
    switch (type) {
      case 'object':
        return this.factory.createObjectNode(key, schema, visited);
      case 'array':
        return this.factory.createArrayNode(key, schema, visited);
      case 'file':
        return this.factory.createFileNode(key, schema);
      case 'date':
        return this.factory.createDateNode(key, schema);
      case 'string':
      case 'number':
      case 'integer':
      case 'boolean':
        return this.factory.createPrimitiveNode(key, schema, type);
      default:
        // Fallback to string for unknown types
        return this.factory.createPrimitiveNode(key, schema, 'string');
    }
  }

  /**
   * Create a placeholder schema node for unresolvable or circular references.
   *
   * @param key - The property key name
   * @returns A minimal SchemaNode with type 'object' and empty children
   */
  private createPlaceholderNode(key: string): SchemaNode {
    return {
      type: 'object',
      key,
      label: this.adapterUtils.humanize(key),
      required: false,
      children: []
    };
  }
}
