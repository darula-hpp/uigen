import type { AnnotationHandler, AnnotationContext } from '../types.js';
import type { OverrideConfig } from '../../../ir/types.js';

/**
 * Metadata interface for annotation handlers.
 */
interface AnnotationMetadata {
  name: string;
  description: string;
  targetType: 'field' | 'operation' | 'resource';
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
 * Handler for x-uigen-override annotation.
 * Provides structured override configuration with identification and enablement control.
 * 
 * Structure:
 * - id: string (required) - Stable identifier matching targetId in override files
 * - enabled: boolean (optional, defaults to true) - Whether the override is active
 * 
 * Can be applied at:
 * - Operation level: Marks the specific operation for override
 * - Resource level (path): Marks all operations under that path for override
 */
export class OverrideHandler implements AnnotationHandler<OverrideConfig> {
  public readonly name = 'x-uigen-override';

  public static readonly metadata: AnnotationMetadata = {
    name: 'x-uigen-override',
    description: 'Provides structured override configuration with identification and enablement control. Replaces the legacy x-uigen-id annotation.',
    targetType: 'operation',
    parameterSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Stable identifier for the override (matches targetId in override files)'
        },
        enabled: {
          type: 'boolean',
          description: 'Whether this override is enabled (defaults to true if omitted)'
        }
      },
      required: ['id']
    },
    examples: [
      {
        description: 'Enable override with custom ID',
        value: { id: 'custom-profile', enabled: true }
      },
      {
        description: 'Override with ID only (enabled defaults to true)',
        value: { id: 'users-list' }
      },
      {
        description: 'Disabled override (annotation present but inactive)',
        value: { id: 'meetings-detail', enabled: false }
      }
    ]
  };
  
  /**
   * Extract the x-uigen-override annotation value from the spec element.
   * Validates the structure and returns an OverrideConfig object.
   * 
   * @param context - The annotation context containing the spec element
   * @returns The OverrideConfig object or undefined if not present or invalid
   */
  extract(context: AnnotationContext): OverrideConfig | undefined {
    const element = context.element as any;
    const annotation = element['x-uigen-override'];
    
    // Annotation must be present
    if (!annotation) {
      return undefined;
    }
    
    // Annotation must be an object
    if (typeof annotation !== 'object' || annotation === null) {
      console.warn(`x-uigen-override must be an object, found ${typeof annotation}`);
      return undefined;
    }
    
    // id property is required and must be a non-empty string
    if (typeof annotation.id !== 'string' || annotation.id.trim() === '') {
      console.warn('x-uigen-override must have a non-empty "id" property');
      return undefined;
    }
    
    // enabled property is optional and defaults to true
    const enabled = typeof annotation.enabled === 'boolean' ? annotation.enabled : true;
    
    return {
      id: annotation.id.trim(),
      enabled,
    };
  }
  
  /**
   * Validate that the annotation value has the correct structure.
   * Checks that id is a non-empty string and enabled is a boolean.
   * 
   * @param value - The extracted annotation value
   * @returns true if valid, false otherwise
   */
  validate(value: OverrideConfig): boolean {
    // Validate id is a non-empty string
    if (typeof value.id !== 'string' || value.id.trim() === '') {
      console.warn('x-uigen-override.id must be a non-empty string');
      return false;
    }
    
    // Validate enabled is a boolean
    if (typeof value.enabled !== 'boolean') {
      console.warn(`x-uigen-override.enabled must be a boolean, found ${typeof value.enabled}`);
      return false;
    }
    
    return true;
  }
  
  /**
   * Apply the override annotation by setting the override property on the resource or operation.
   * 
   * Can be applied at:
   * - Operation level: Sets override on the specific operation
   * - Resource level (path): Sets override on the resource (applies to all operations)
   * 
   * @param value - The validated OverrideConfig value
   * @param context - The annotation context
   */
  apply(value: OverrideConfig, context: AnnotationContext): void {
    // If applied at operation level, set on the operation
    if (context.operation) {
      context.operation.override = value;
      return;
    }
    
    // If applied at resource level (path), set on the resource
    if (context.resource) {
      context.resource.override = value;
      return;
    }
    
    // No valid context - cannot apply
    console.warn('x-uigen-override annotation found but no operation or resource context available');
  }
}
