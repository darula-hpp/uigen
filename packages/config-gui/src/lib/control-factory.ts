import type { AnnotationMetadata, PropertySchema } from '../types/index.js';
import { MIME_TYPE_OPTIONS } from './mime-types.js';

/**
 * Types of visual controls that can be generated for annotation parameters
 */
export type ControlType =
  | 'text-input'
  | 'number-input'
  | 'toggle'
  | 'dropdown'
  | 'resource-selector'
  | 'field-selector'
  | 'drag-drop-link'
  | 'object-editor'
  | 'multi-select'
  | 'file-size-input';

/**
 * Validation rule for a control
 */
export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom';
  value?: unknown;
  message: string;
}

/**
 * Configuration for a generated control
 */
export interface ControlConfig {
  type: ControlType;
  label: string;
  description?: string;
  required: boolean;
  validation?: ValidationRule[];
  options?: Array<{ label: string; value: string }>;
}

/**
 * Factory class for generating appropriate visual controls based on annotation parameter schemas
 */
export class ControlFactory {
  /**
   * Generate control config from parameter schema
   * 
   * @param paramName - Name of the parameter
   * @param paramSchema - Schema definition for the parameter
   * @param annotationName - Name of the annotation (for special case handling)
   * @returns Control configuration
   */
  generateControl(
    paramName: string,
    paramSchema: PropertySchema,
    annotationName: string
  ): ControlConfig {
    const baseConfig: Omit<ControlConfig, 'type'> = {
      label: this.formatLabel(paramName),
      description: paramSchema.description,
      required: false,
      validation: [],
    };

    // Handle special cases based on annotation name and parameter name
    if (annotationName === 'x-uigen-ref' && paramName === 'resource') {
      return {
        ...baseConfig,
        type: 'resource-selector',
      };
    }

    if (annotationName === 'x-uigen-label') {
      return {
        ...baseConfig,
        type: 'text-input',
      };
    }

    if (annotationName === 'x-uigen-ignore') {
      return {
        ...baseConfig,
        type: 'toggle',
      };
    }

    // Handle file metadata annotations
    if (annotationName === 'x-uigen-file-types') {
      return {
        ...baseConfig,
        type: 'multi-select',
        options: MIME_TYPE_OPTIONS.map(opt => ({
          label: opt.label,
          value: opt.value,
        })),
      };
    }

    if (annotationName === 'x-uigen-max-file-size') {
      return {
        ...baseConfig,
        type: 'file-size-input',
      };
    }

    // Handle schema-based control generation
    switch (paramSchema.type) {
      case 'string':
        if (paramSchema.enum) {
          return {
            ...baseConfig,
            type: 'dropdown',
            options: paramSchema.enum.map((value) => ({
              label: this.formatLabel(value),
              value,
            })),
          };
        }
        return {
          ...baseConfig,
          type: 'text-input',
        };

      case 'boolean':
        return {
          ...baseConfig,
          type: 'toggle',
        };

      case 'number':
        return {
          ...baseConfig,
          type: 'number-input',
        };

      case 'enum':
        return {
          ...baseConfig,
          type: 'dropdown',
          options: paramSchema.enum?.map((value) => ({
            label: this.formatLabel(value),
            value,
          })) || [],
        };

      case 'object':
        // Check if this is a reference object (has 'resource' property)
        if (paramSchema.properties?.resource) {
          return {
            ...baseConfig,
            type: 'resource-selector',
          };
        }
        return {
          ...baseConfig,
          type: 'object-editor',
        };

      case 'array':
        // Check if array has enum items (multi-select case)
        if (paramSchema.items?.enum) {
          return {
            ...baseConfig,
            type: 'multi-select',
            options: paramSchema.items.enum.map((value) => ({
              label: this.formatLabel(value),
              value,
            })),
          };
        }
        // For arrays without enum, use object-editor as a generic fallback
        return {
          ...baseConfig,
          type: 'object-editor',
        };

      default:
        return {
          ...baseConfig,
          type: 'text-input',
        };
    }
  }

  /**
   * Generate controls for all parameters in an annotation
   * 
   * @param annotationMetadata - Metadata for the annotation
   * @returns Map of parameter names to control configurations
   */
  generateControls(
    annotationMetadata: AnnotationMetadata
  ): Record<string, ControlConfig> {
    const controls: Record<string, ControlConfig> = {};
    const { parameterSchema, name: annotationName } = annotationMetadata;

    // Handle object-type parameter schemas with properties
    if (parameterSchema.type === 'object' && parameterSchema.properties) {
      for (const [paramName, paramSchema] of Object.entries(parameterSchema.properties)) {
        const control = this.generateControl(paramName, paramSchema, annotationName);
        
        // Mark as required if in the required array
        if (parameterSchema.required?.includes(paramName)) {
          control.required = true;
          control.validation = control.validation || [];
          control.validation.push({
            type: 'required',
            message: `${control.label} is required`,
          });
        }

        controls[paramName] = control;
      }
    } else if (parameterSchema.type === 'string') {
      // Handle simple string-type annotations (like x-uigen-label)
      controls['value'] = this.generateControl('value', parameterSchema as PropertySchema, annotationName);
    } else if (parameterSchema.type === 'boolean') {
      // Handle simple boolean-type annotations (like x-uigen-ignore)
      controls['value'] = this.generateControl('value', parameterSchema as PropertySchema, annotationName);
    }

    return controls;
  }

  /**
   * Format a parameter name or enum value into a human-readable label
   * 
   * @param name - Raw name to format
   * @returns Formatted label
   */
  private formatLabel(name: string): string {
    // Convert camelCase or snake_case to Title Case
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .trim()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
