import type { AnnotationHandler, AnnotationContext } from '../types.js';

/**
 * Metadata interface for annotation handlers.
 */
interface AnnotationMetadata {
  name: string;
  description: string;
  targetType: 'field' | 'operation' | 'resource' | ('field' | 'operation' | 'resource')[];
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
 * Handler for x-uigen-label annotation.
 * Applies custom labels to schema properties and objects.
 * 
 * Precedence: property label > $ref target label > humanized key
 * 
 * Requirements: 5.1-5.6
 */
export class LabelHandler implements AnnotationHandler<string> {
  public readonly name = 'x-uigen-label';

  public static readonly metadata: AnnotationMetadata = {
    name: 'x-uigen-label',
    description: 'Applies custom labels to schema properties, objects, operations, and resources',
    targetType: ['field', 'operation', 'resource'],
    parameterSchema: {
      type: 'string'
    },
    examples: [
      {
        description: 'Custom label for email field',
        value: 'Email Address'
      },
      {
        description: 'Custom label for role field',
        value: 'User Role'
      },
      {
        description: 'Custom label for operation',
        value: 'User Login'
      },
      {
        description: 'Custom label for resource',
        value: 'My Profile'
      }
    ]
  };
  
  /**
   * Extract the x-uigen-label annotation value from the spec element.
   * Only accepts non-empty strings.
   * 
   * @param context - The annotation context containing the spec element
   * @returns The string value or undefined if not present or invalid type
   */
  extract(context: AnnotationContext): string | undefined {
    const element = context.element as any;
    const annotation = element['x-uigen-label'];
    
    // Only accept non-empty strings
    if (typeof annotation === 'string' && annotation.trim() !== '') {
      return annotation;
    }
    
    return undefined;
  }
  
  /**
   * Validate that the annotation value is a non-empty string.
   * Logs a warning for invalid values.
   * 
   * @param value - The extracted annotation value
   * @returns true if valid (non-empty string), false otherwise
   */
  validate(value: string): boolean {
    if (typeof value !== 'string') {
      console.warn(`x-uigen-label must be a string, found ${typeof value}`);
      return false;
    }
    
    if (value.trim() === '') {
      console.warn('x-uigen-label must be a non-empty string');
      return false;
    }
    
    return true;
  }
  
  /**
   * Apply the label annotation by setting the label on the schema node or resource.
   * 
   * For single-operation resources: Apply operation label to both operation AND resource
   * Example: `GET:/api/v1/auth/me` with `x-uigen-label: My Profile` → resource shows "My Profile"
   * 
   * For multi-operation resources: Apply operation labels ONLY to operations
   * Example: `DELETE:/api/v1/templates/{id}` with `x-uigen-label: Delete Template` → resource still shows "Templates"
   * 
   * For explicit resource labels: Apply when path has no HTTP method prefix
   * Example: `/api/v1/templates` with `x-uigen-label: Document Templates` → resource shows "Document Templates"
   * 
   * Note: Single-operation resource label inheritance happens in post-processing after all operations are added.
   * 
   * @param value - The validated string value
   * @param context - The annotation context
   */
  apply(value: string, context: AnnotationContext): void {
    // Apply label to schema node (for fields and operations)
    if (context.schemaNode) {
      context.schemaNode.label = value;
    }
    
    // Apply label to operation summary (for operation-level annotations)
    if (context.operation) {
      context.operation.summary = value;
    }
    
    // Determine if this is an operation-level annotation
    // Operation-level if:
    // 1. context.method is present (processing an operation), OR
    // 2. path starts with HTTP method prefix (from config annotations)
    const httpMethods = ['GET:', 'POST:', 'PUT:', 'PATCH:', 'DELETE:'];
    const isOperationLevel = context.method || httpMethods.some(method => context.path.startsWith(method));
    
    // Apply label to resource only for explicit resource-level annotations
    // (no method prefix, no context.method, path starts with '/')
    // Single-operation resource label inheritance is handled in post-processing
    if (context.resource && !isOperationLevel && context.path.startsWith('/')) {
      context.resource.label = value;
    }
  }
}
