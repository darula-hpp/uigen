import type { AnnotationHandler, AnnotationContext } from '../types.js';

/**
 * Metadata interface for annotation handlers.
 */
interface AnnotationMetadata {
  name: string;
  description: string;
  targetType: 'field' | 'operation' | 'resource' | 'parameter' | 'requestBody' | 'response';
  parameterSchema: {
    type: 'object' | 'string' | 'boolean' | 'number';
    properties?: Record<string, {
      type: 'string' | 'boolean' | 'number' | 'object' | 'array' | 'enum';
      description?: string;
      enum?: string[];
      items?: any;
      properties?: Record<string, any>;
    }>;
    required?: string[];
  };
  examples: Array<{ description: string; value: unknown }>;
}

/**
 * Handler for x-uigen-ignore annotation.
 * Filters elements from the IR based on boolean annotation values.
 * 
 * Supports all spec element types:
 * - field: Schema properties
 * - operation: HTTP operations (GET, POST, etc.)
 * - resource: Path items
 * - parameter: Query, path, header, and cookie parameters
 * - requestBody: Request body schemas
 * - response: Response schemas
 * 
 * Precedence: property > schema > parameter > operation > path
 * 
 * Requirements: 6.1, 6.2
 */
export class IgnoreHandler implements AnnotationHandler<boolean> {
  public readonly name = 'x-uigen-ignore';

  public static readonly metadata: AnnotationMetadata = {
    name: 'x-uigen-ignore',
    description: 'Filters elements from the IR. Supports: schema properties, operations, path items, parameters, request bodies, and responses.',
    targetType: 'field',
    parameterSchema: {
      type: 'boolean'
    },
    examples: [
      {
        description: 'Ignore internal operations',
        value: true
      },
      {
        description: 'Explicitly include operation',
        value: false
      },
      {
        description: 'Ignore sensitive schema property',
        value: true
      },
      {
        description: 'Ignore debug parameter',
        value: true
      },
      {
        description: 'Ignore internal request body',
        value: true
      },
      {
        description: 'Ignore internal response',
        value: true
      }
    ]
  };
  
  /**
   * Extract the x-uigen-ignore annotation value from the spec element.
   * Only accepts boolean values.
   * 
   * Handles all spec element types:
   * - Schema objects (in components/schemas)
   * - Schema properties (nested within schemas)
   * - Parameters (query, path, header, cookie)
   * - Request body objects
   * - Response objects
   * - Operations (GET, POST, etc.)
   * - Path items
   * 
   * Implements precedence rules (Requirements 7.1-7.4):
   * - Child annotation overrides parent annotation (most specific wins)
   * - Precedence hierarchy: property > schema > parameter > operation > path
   * - Explicit false at child level overrides true at parent level (Req 7.3)
   * - Explicit true at child level overrides false at parent level (Req 7.4)
   * - When child annotation is undefined, falls back to parent annotation
   * 
   * Examples:
   * - Child: false, Parent: true → Result: false (child overrides)
   * - Child: true, Parent: false → Result: true (child overrides)
   * - Child: undefined, Parent: true → Result: true (inherits from parent)
   * - Child: undefined, Parent: undefined → Result: undefined (default: include)
   * 
   * @param context - The annotation context containing the spec element
   * @returns The boolean value or undefined if not present or invalid type
   * 
   * Requirements: 6.2, 6.3, 7.1, 7.2, 7.3, 7.4
   */
  extract(context: AnnotationContext): boolean | undefined {
    const element = context.element as any;
    const annotation = element['x-uigen-ignore'];
    
    // Check current element first (most specific)
    if (typeof annotation === 'boolean') {
      return annotation;
    }
    
    // Log warning for non-boolean values at current level
    if (annotation !== undefined) {
      console.warn(`x-uigen-ignore must be a boolean, found ${typeof annotation} at ${this.getElementPath(context)}`);
    }
    
    // Check parent element if no annotation at current level (precedence rule)
    // This handles:
    // - Operations inheriting from path items
    // - Schema properties inheriting from parent schemas
    // - Parameters inheriting from path-level parameters
    if (context.parent && annotation === undefined) {
      const parentAnnotation = (context.parent as any)['x-uigen-ignore'];
      if (typeof parentAnnotation === 'boolean') {
        return parentAnnotation;
      }
      // Log warning for non-boolean parent values
      if (parentAnnotation !== undefined) {
        console.warn(`x-uigen-ignore must be a boolean, found ${typeof parentAnnotation} at parent of ${this.getElementPath(context)}`);
      }
    }
    
    return undefined;
  }
  
  /**
   * Get a human-readable path for the current element (for logging).
   * Provides element-type-specific descriptions for better debugging.
   * 
   * @param context - The annotation context
   * @returns A string describing the element location and type
   * 
   * Requirements: 6.5, 8.1
   */
  private getElementPath(context: AnnotationContext): string {
    const element = context.element as any;
    
    // Schema node context (property) - check first as it's most specific
    if (context.schemaNode) {
      return `schema property '${context.schemaNode.key}'`;
    }
    
    // Parameter context - check before operation/path as parameters have name/in
    if (element.name && element.in) {
      return `parameter '${element.name}' (${element.in}) at ${context.path || 'unknown path'}`;
    }
    
    // Request body context - check before operation as request bodies have content
    if (element.content && context.method && !element.description) {
      return `request body for ${context.method.toUpperCase()} ${context.path}`;
    }
    
    // Response context - check before operation as responses have description + content
    if (element.description && element.content && !element.name) {
      return `response for ${context.method ? context.method.toUpperCase() + ' ' : ''}${context.path || 'unknown path'}`;
    }
    
    // Operation context
    if (context.method && context.path) {
      return `operation ${context.method.toUpperCase()} ${context.path}`;
    }
    
    // Schema object context (in components/schemas) - check before path item
    if ((element.type || element.properties || element.allOf || element.oneOf || element.anyOf) && !context.method) {
      return `schema object at ${context.path || 'unknown path'}`;
    }
    
    // Path item context
    if (context.path && !context.method) {
      return `path item ${context.path}`;
    }
    
    // Fallback
    return `element at ${context.path || 'unknown location'}`;
  }
  
  /**
   * Validate that the annotation value is a boolean.
   * Logs a warning for non-boolean values.
   * 
   * @param value - The extracted annotation value
   * @returns true if valid (boolean), false otherwise
   */
  validate(value: boolean): boolean {
    if (typeof value !== 'boolean') {
      console.warn(`x-uigen-ignore must be a boolean, found ${typeof value}`);
      return false;
    }
    return true;
  }
  
  /**
   * Apply the ignore annotation by marking elements with __shouldIgnore flag.
   * Only marks elements when value is true (ignore).
   * 
   * Handles all element types:
   * - Operations: marked for removal from resources
   * - Schema nodes: marked for filtering from parent schemas
   * - Parameters: marked for filtering from operation parameters
   * - Request bodies: marked for exclusion from operations
   * - Responses: marked for filtering from operation responses
   * 
   * @param value - The validated boolean value
   * @param context - The annotation context
   * 
   * Requirements: 6.4
   */
  apply(value: boolean, context: AnnotationContext): void {
    if (!value) {
      return; // x-uigen-ignore: false means include (no action needed)
    }
    
    // Mark operation for removal
    if (context.operation) {
      // Set a flag that will be checked during resource extraction
      (context.operation as any).__shouldIgnore = true;
    }
    
    // Mark schema node for filtering
    if (context.schemaNode) {
      // Set a flag that will be checked during schema processing
      (context.schemaNode as any).__shouldIgnore = true;
    }
    
    // Mark the element itself for filtering
    // This handles parameters, request bodies, and responses
    (context.element as any).__shouldIgnore = true;
  }
}
