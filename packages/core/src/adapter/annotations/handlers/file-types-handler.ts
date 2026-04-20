import type { AnnotationHandler, AnnotationContext } from '../types.js';
import type { FileMetadata } from '../../../ir/types.js';

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
    items?: {
      type: string;
      pattern?: string;
    };
    description?: string;
  };
  examples: Array<{ description: string; value: unknown }>;
}

/**
 * Handler for x-uigen-file-types annotation.
 * Applies allowed MIME types to file upload fields.
 * 
 * This handler extracts an array of MIME type strings and applies them
 * to the SchemaNode's fileMetadata.allowedMimeTypes property.
 */
export class FileTypesHandler implements AnnotationHandler<string[]> {
  public readonly name = 'x-uigen-file-types';

  public static readonly metadata: AnnotationMetadata = {
    name: 'x-uigen-file-types',
    description: 'Array of allowed MIME types for file uploads',
    targetType: 'field',
    applicableWhen: {
      type: 'file'
    },
    parameterSchema: {
      type: 'array',
      items: {
        type: 'string',
        pattern: '^[a-z*]+/[a-z0-9\\-\\+\\.\\*]+$'
      },
      description: 'MIME types (e.g., image/jpeg, application/pdf, image/*)'
    },
    examples: [
      {
        description: 'Accept only images',
        value: ['image/jpeg', 'image/png', 'image/webp']
      },
      {
        description: 'Accept all images',
        value: ['image/*']
      },
      {
        description: 'Accept PDFs and Word documents',
        value: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      }
    ]
  };
  
  /**
   * Extract the x-uigen-file-types annotation value from the spec element.
   * Only accepts arrays of strings.
   * 
   * @param context - The annotation context containing the spec element
   * @returns The array of MIME types or undefined if not present or invalid type
   */
  extract(context: AnnotationContext): string[] | undefined {
    const element = context.element as any;
    const annotation = element['x-uigen-file-types'];
    
    // Only accept arrays
    if (Array.isArray(annotation)) {
      return annotation;
    }
    
    return undefined;
  }
  
  /**
   * Validate that the annotation value is a non-empty array of valid MIME type strings.
   * Logs warnings for invalid values.
   * 
   * @param value - The extracted annotation value
   * @returns true if valid, false otherwise
   */
  validate(value: string[]): boolean {
    if (!Array.isArray(value)) {
      console.warn(`x-uigen-file-types must be an array, got ${typeof value}`);
      return false;
    }
    
    if (value.length === 0) {
      console.warn('x-uigen-file-types cannot be empty');
      return false;
    }
    
    for (const item of value) {
      if (typeof item !== 'string') {
        console.warn(`x-uigen-file-types items must be strings, got ${typeof item}`);
        return false;
      }
      
      // Basic MIME type validation (allows wildcards like */*, image/*, etc.)
      const mimePattern = /^[a-z*]+\/[a-z0-9\-\+\.\*]+$/i;
      if (!mimePattern.test(item)) {
        console.warn(`Invalid MIME type: ${item}`);
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Apply the file types annotation.
   * 
   * Note: This handler validates the annotation but does NOT set values on the SchemaNode.
   * The FileMetadataVisitor will extract and merge x-uigen-file-types with contentMediaType
   * during schema processing. This ensures proper precedence and merging behavior.
   * 
   * @param value - The validated array of MIME types
   * @param context - The annotation context
   */
  apply(value: string[], context: AnnotationContext): void {
    // Validation only - FileMetadataVisitor handles extraction
    // This ensures x-uigen-file-types and contentMediaType are properly merged
  }
}
