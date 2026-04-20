import type { AnnotationHandler, AnnotationContext } from '../types.js';

/**
 * Metadata interface for annotation handlers.
 */
interface AnnotationMetadata {
  name: string;
  description: string;
  targetType: 'field' | 'operation' | 'resource';
  applicableWhen?: {
    type?: string;
  };
  parameterSchema: {
    type: 'object' | 'string' | 'boolean' | 'number' | 'array';
    minimum?: number;
    description?: string;
  };
  examples: Array<{ description: string; value: unknown }>;
}

/**
 * Handler for x-uigen-max-file-size annotation.
 * Applies maximum file size restriction to file upload fields.
 * 
 * This handler extracts a number (in bytes) and validates it's a positive finite number.
 * The FileMetadataVisitor will extract and apply this value to the SchemaNode's
 * fileMetadata.maxSizeBytes property during schema processing.
 */
export class MaxFileSizeHandler implements AnnotationHandler<number> {
  public readonly name = 'x-uigen-max-file-size';

  public static readonly metadata: AnnotationMetadata = {
    name: 'x-uigen-max-file-size',
    description: 'Maximum file size in bytes',
    targetType: 'field',
    applicableWhen: {
      type: 'file'
    },
    parameterSchema: {
      type: 'number',
      minimum: 1,
      description: 'Maximum file size in bytes (e.g., 5242880 for 5MB)'
    },
    examples: [
      { description: '5MB', value: 5242880 },
      { description: '10MB', value: 10485760 },
      { description: '100MB', value: 104857600 }
    ]
  };
  
  /**
   * Extract the x-uigen-max-file-size annotation value from the spec element.
   * Only accepts numbers.
   * 
   * @param context - The annotation context containing the spec element
   * @returns The maximum file size in bytes or undefined if not present or invalid type
   */
  extract(context: AnnotationContext): number | undefined {
    const element = context.element as any;
    const annotation = element['x-uigen-max-file-size'];
    
    // Only accept numbers
    if (typeof annotation === 'number') {
      return annotation;
    }
    
    return undefined;
  }
  
  /**
   * Validate that the annotation value is a positive, finite number.
   * Logs warnings for invalid values.
   * 
   * @param value - The extracted annotation value
   * @returns true if valid, false otherwise
   */
  validate(value: number): boolean {
    if (typeof value !== 'number') {
      console.warn(`x-uigen-max-file-size must be a number, got ${typeof value}`);
      return false;
    }
    
    if (value <= 0) {
      console.warn('x-uigen-max-file-size must be positive');
      return false;
    }
    
    if (!Number.isFinite(value)) {
      console.warn('x-uigen-max-file-size must be finite');
      return false;
    }
    
    return true;
  }
  
  /**
   * Apply the max file size annotation.
   * 
   * Note: This handler validates the annotation but does NOT set values on the SchemaNode.
   * The FileMetadataVisitor will extract and apply x-uigen-max-file-size during schema
   * processing. This ensures proper precedence and merging behavior.
   * 
   * @param value - The validated maximum file size in bytes
   * @param context - The annotation context
   */
  apply(value: number, context: AnnotationContext): void {
    // Validation only - FileMetadataVisitor handles extraction
    // This ensures x-uigen-max-file-size is properly applied to fileMetadata
  }
}
