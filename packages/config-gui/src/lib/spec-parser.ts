import type { UIGenApp, Resource, Operation, SchemaNode, HttpMethod, FieldType, FileMetadata } from '@uigen-dev/core';

/**
 * Represents the hierarchical structure of a spec for the visual editor
 */
export interface SpecStructure {
  resources: ResourceNode[];
}

/**
 * Represents a resource in the visual editor tree
 */
export interface ResourceNode {
  name: string;
  slug: string;
  uigenId: string;
  description?: string;
  operations: OperationNode[];
  fields: FieldNode[];
  annotations: Record<string, unknown>;
}

/**
 * Represents an operation in the visual editor tree
 */
export interface OperationNode {
  id: string;
  uigenId: string;
  method: HttpMethod;
  path: string;
  summary?: string;
  description?: string;
  annotations: Record<string, unknown>;
}

/**
 * Represents a field in the visual editor tree
 */
export interface FieldNode {
  key: string;
  label: string;
  type: FieldType;
  format?: string;
  path: string; // e.g., "User.email"
  required: boolean;
  description?: string;
  fileMetadata?: FileMetadata;
  children?: FieldNode[];
  annotations: Record<string, unknown>;
}

/**
 * Parses a UIGenApp (IR) and extracts the structure needed for the visual editor.
 * 
 * The SpecParser builds a hierarchical tree structure from the IR that includes:
 * - Resources with their operations and fields
 * - Existing annotations on each element
 * - Nested field structures for object types
 * 
 * This structure is used by the visual editor to display the spec and allow
 * users to configure annotations visually.
 * 
 * Requirements: 6.1, 6.2
 * 
 * Usage:
 * ```typescript
 * const parser = new SpecParser();
 * const structure = parser.parse(uigenApp);
 * ```
 */
export class SpecParser {
  /**
   * Parse a UIGenApp and extract the hierarchical structure for the visual editor.
   * 
   * @param app - The UIGenApp (IR) to parse
   * @returns The hierarchical spec structure
   */
  parse(app: UIGenApp): SpecStructure {
    const resources = app.resources.map(resource => this.parseResource(resource));
    
    return {
      resources
    };
  }
  
  /**
   * Parse a resource and extract its operations, fields, and annotations.
   * 
   * @param resource - The resource to parse
   * @returns The resource node for the visual editor
   */
  private parseResource(resource: Resource): ResourceNode {
    // Extract operations
    const operations = resource.operations.map(op => this.parseOperation(op));
    
    // Extract fields from schema
    // Use the actual schema name from OpenAPI spec if available, otherwise fallback to capitalized slug
    const schemaName = resource.schemaName || (resource.slug.charAt(0).toUpperCase() + resource.slug.slice(1));
    const fields = this.parseFields(resource.schema, schemaName);
    
    // Extract resource-level annotations
    const annotations = this.extractAnnotations(resource.schema as unknown as Record<string, unknown>);
    
    return {
      name: resource.name,
      slug: resource.slug,
      uigenId: resource.uigenId,
      description: resource.description,
      operations,
      fields,
      annotations
    };
  }
  
  /**
   * Parse an operation and extract its annotations.
   * 
   * @param operation - The operation to parse
   * @returns The operation node for the visual editor
   */
  private parseOperation(operation: Operation): OperationNode {
    // Extract operation-level annotations
    // Operations can have annotations like x-uigen-login
    const annotations: Record<string, unknown> = {};
    
    // Check for any x-uigen-* properties on the operation object
    for (const [key, value] of Object.entries(operation)) {
      if (key.startsWith('x-uigen-')) {
        annotations[key] = value;
      }
    }
    
    return {
      id: operation.id,
      uigenId: operation.uigenId,
      method: operation.method,
      path: operation.path,
      summary: operation.summary,
      description: operation.description,
      annotations
    };
  }
  
  /**
   * Parse fields from a schema node and build the field tree.
   * 
   * @param schema - The schema node to parse
   * @param schemaName - The actual OpenAPI schema name (e.g., "Template" not "templates")
   * @param parentPath - The path of the parent field (for nested fields)
   * @returns Array of field nodes
   */
  private parseFields(
    schema: SchemaNode,
    schemaName: string,
    parentPath?: string
  ): FieldNode[] {
    const fields: FieldNode[] = [];
    
    // If schema has children (object type), parse them
    if (schema.children && schema.children.length > 0) {
      for (const child of schema.children) {
        const field = this.parseField(child, schemaName, parentPath);
        fields.push(field);
      }
    }
    
    return fields;
  }
  
  /**
   * Parse a single field from a schema node.
   * 
   * @param schema - The schema node representing the field
   * @param schemaName - The actual OpenAPI schema name (e.g., "Template" not "templates")
   * @param parentPath - The path of the parent field (for nested fields)
   * @returns The field node
   */
  private parseField(
    schema: SchemaNode,
    schemaName: string,
    parentPath?: string
  ): FieldNode {
    // Build the field path (e.g., "User.email" or "User.address.street")
    // Use the actual schema name from OpenAPI spec
    const path = parentPath 
      ? `${parentPath}.${schema.key}`
      : `${schemaName}.${schema.key}`;
    
    // Extract field-level annotations
    const annotations = this.extractAnnotations(schema as unknown as Record<string, unknown>);
    
    // Parse nested fields for object types
    let children: FieldNode[] | undefined;
    if (schema.type === 'object' && schema.children && schema.children.length > 0) {
      children = schema.children.map(child => 
        this.parseField(child, schemaName, path)
      );
    }
    
    // Parse array item fields
    if (schema.type === 'array' && schema.items) {
      // For arrays, we create a virtual child representing the array items
      const itemField = this.parseField(
        { ...schema.items, key: 'items' },
        schemaName,
        path
      );
      children = [itemField];
    }
    
    return {
      key: schema.key,
      label: schema.label,
      type: schema.type,
      format: schema.format,
      path,
      required: schema.required,
      description: schema.description,
      fileMetadata: schema.fileMetadata,
      children,
      annotations
    };
  }
  
  /**
   * Extract x-uigen-* annotations from a schema node or operation.
   * 
   * Annotations are stored as properties on the schema/operation object
   * with keys starting with 'x-uigen-'.
   * 
   * @param obj - The object to extract annotations from
   * @returns Map of annotation names to their values
   */
  private extractAnnotations(obj: Record<string, unknown>): Record<string, unknown> {
    const annotations: Record<string, unknown> = {};
    
    // Look for properties starting with 'x-uigen-'
    for (const [key, value] of Object.entries(obj)) {
      if (key.startsWith('x-uigen-')) {
        annotations[key] = value;
      }
    }
    
    // Special handling for refConfig (x-uigen-ref annotation)
    if ('refConfig' in obj && obj.refConfig) {
      annotations['x-uigen-ref'] = obj.refConfig;
    }
    
    return annotations;
  }
}
