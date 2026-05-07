import type { AnnotationHandler, AnnotationContext } from '../types.js';
import type { AppConfig } from '../../../ir/types.js';

/**
 * Internal shape of the raw x-uigen-app annotation before validation.
 */
interface AppAnnotation {
  name?: string;
  icon?: string;
  [key: string]: unknown;
}

/**
 * Metadata interface for annotation handlers.
 */
interface AnnotationMetadata {
  name: string;
  description: string;
  targetType: 'field' | 'operation' | 'resource' | 'document' | string[];
  parameterSchema: {
    type: 'object' | 'string' | 'boolean' | 'number';
    properties?: Record<string, {
      type: 'string' | 'boolean' | 'number' | 'object' | 'array' | 'enum' | string[];
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
 * Handler for x-uigen-app annotation.
 * Configures application metadata such as name and icon.
 * 
 * Can be applied at:
 * - Document level (global app configuration)
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */
export class AppHandler implements AnnotationHandler<AppAnnotation> {
  public readonly name = 'x-uigen-app';

  public static readonly metadata: AnnotationMetadata = {
    name: 'x-uigen-app',
    description: 'Configures application metadata such as name and icon. Applied at document level for global configuration.',
    targetType: 'document',
    parameterSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Custom application name (overrides OpenAPI title)'
        },
        icon: {
          type: 'string',
          description: 'Application icon URL or path (used for favicon and header)'
        }
      },
      required: []
    },
    examples: [
      {
        description: 'Minimal app configuration with name only',
        value: {
          name: 'My Application'
        }
      },
      {
        description: 'Complete app configuration with name and icon',
        value: {
          name: 'My Application',
          icon: '/.uigen/assets/logo.svg'
        }
      },
      {
        description: 'Empty configuration (all fields optional)',
        value: {}
      }
    ]
  };

  /**
   * Extract the x-uigen-app annotation value from the spec element.
   * Only accepts plain objects (not null, not arrays).
   * 
   * @param context - The annotation context containing the spec element
   * @returns The raw annotation object or undefined if absent/invalid type
   */
  extract(context: AnnotationContext): AppAnnotation | undefined {
    try {
      const element = context.element as any;
      const annotation = element['x-uigen-app'];

      if (annotation === undefined) {
        return undefined;
      }

      if (typeof annotation !== 'object' || annotation === null || Array.isArray(annotation)) {
        context.utils.logWarning(
          `x-uigen-app at ${context.path} must be a plain object, found ${
            annotation === null ? 'null' : Array.isArray(annotation) ? 'array' : typeof annotation
          }`
        );
        return undefined;
      }

      return annotation as AppAnnotation;
    } catch (error) {
      context.utils.logWarning(`x-uigen-app at ${context.path}: extraction error - ${error}`);
      return undefined;
    }
  }

  /**
   * Validate that the annotation has valid field values.
   * All fields are optional, but if provided must meet validation rules.
   * 
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 11.1, 11.2, 13.1, 13.2, 13.3
   * 
   * @param value - The extracted annotation object
   * @param context - The annotation context (for logging)
   * @returns true if valid, false otherwise (never throws)
   */
  validate(value: AppAnnotation, context?: AnnotationContext): boolean {
    try {
      let isValid = true;

      // Validate name field (if provided) - Requirements 2.1, 2.2, 2.3, 2.4, 2.5
      if (value.name !== undefined) {
        // Requirement 2.1: Validate name is string type when provided
        if (typeof value.name !== 'string') {
          const message = 'x-uigen-app: name must be a non-empty string';
          if (context) {
            context.utils.logWarning(message);
          } else {
            console.warn(message);
          }
          // Requirement 2.4: Log warning for non-string type and ignore value
          // Continue processing, don't fail validation
        } else if (value.name.trim() === '') {
          // Requirement 2.2: Validate name is non-empty string
          // Requirement 2.3: Log warning for empty string and ignore value
          const message = 'x-uigen-app: name must be a non-empty string';
          if (context) {
            context.utils.logWarning(message);
          } else {
            console.warn(message);
          }
          // Continue processing, don't fail validation
        }
      }
      // Requirement 2.5: Allow missing name field (optional) - handled by if check

      // Validate icon field (if provided) - Requirements 3.1, 3.2, 3.3, 3.4
      if (value.icon !== undefined) {
        // Requirement 3.1: Validate icon is string type when provided
        if (typeof value.icon !== 'string') {
          const message = 'x-uigen-app: icon must be a non-empty string';
          if (context) {
            context.utils.logWarning(message);
          } else {
            console.warn(message);
          }
          // Requirement 3.4: Log warning for non-string type and ignore value
          // Continue processing, don't fail validation
        } else if (value.icon.trim() === '') {
          // Requirement 3.2: Validate icon is non-empty string
          // Requirement 3.3: Log warning for empty string and ignore value
          const message = 'x-uigen-app: icon must be a non-empty string';
          if (context) {
            context.utils.logWarning(message);
          } else {
            console.warn(message);
          }
          // Continue processing, don't fail validation
        }
      }
      // Requirement 3.5 (implied): Allow missing icon field (optional) - handled by if check

      // Detect and reject color/theme fields - Requirements 13.1, 13.2, 13.3
      const colorFields = ['primaryColor', 'secondaryColor', 'accentColor', 'backgroundColor', 'textColor', 'color', 'colors'];
      const themeFields = ['theme', 'darkMode', 'lightMode', 'themeMode', 'colorScheme'];
      
      // Check for color-related fields
      for (const field of colorFields) {
        if (value[field] !== undefined) {
          const message = `x-uigen-app: ${field} field is not supported. Use .uigen/theme.css for styling and colors`;
          if (context) {
            context.utils.logWarning(message);
          } else {
            console.warn(message);
          }
          // Ignore the field, continue processing
        }
      }

      // Check for theme-related fields
      for (const field of themeFields) {
        if (value[field] !== undefined) {
          const message = `x-uigen-app: ${field} field is not supported. Use .uigen/theme.css for styling and themes`;
          if (context) {
            context.utils.logWarning(message);
          } else {
            console.warn(message);
          }
          // Ignore the field, continue processing
        }
      }

      // Detect unknown fields for extensibility - Requirements 7.2, 7.3, 7.4, 14.1, 14.2, 14.3, 14.4
      const knownFields = ['name', 'icon'];
      const allColorFields = [...colorFields, ...themeFields];
      
      for (const field in value) {
        // Skip known fields and color/theme fields (already handled above)
        if (!knownFields.includes(field) && !allColorFields.includes(field)) {
          // Requirement 7.3: Log info message for unknown fields (not warning)
          // Requirement 14.4: Log info messages (not warnings) for unknown fields
          console.info(`x-uigen-app: unknown field "${field}" will be preserved for forward compatibility`);
          // Requirement 7.2: Allow unknown fields without validation errors
          // Requirement 7.4: Preserve unknown fields in configuration
          // Requirement 14.1: Use extensible object structure that allows new fields
          // Requirement 14.2: Preserve unknown fields for forward compatibility
          // Requirement 14.3: Allow arbitrary metadata
          // Fields are preserved automatically via the [key: string]: unknown index signature
        }
      }

      // Requirement 11.2: Never throw exceptions during validation (fail gracefully)
      // Requirement 11.1: Continue processing even when individual fields are invalid
      return isValid;
    } catch (error) {
      // Requirement 11.2: Never throw exceptions - catch and return false
      const message = `x-uigen-app: validation error - ${error}`;
      try {
        if (context) {
          context.utils.logWarning(message);
        } else {
          console.warn(message);
        }
      } catch {
        // Even logging the error failed, use console as last resort
        console.warn(message);
      }
      return false;
    }
  }

  /**
   * Apply the app annotation by setting appConfig on the IR.
   * Only applies at document level.
   * 
   * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
   * 
   * @param value - The validated annotation object
   * @param context - The annotation context
   */
  apply(value: AppAnnotation, context: AnnotationContext): void {
    try {
      // Check if applied at document level (Requirement 4.1, 4.2)
      // Document-level is when path is 'document' and there's no operation/resource context
      const isDocumentLevel = context.path === 'document' && !context.operation && !context.resource;

      if (!isDocumentLevel) {
        // Log warning for wrong context level (Requirement 4.3, 4.4)
        if (context.operation) {
          context.utils.logWarning(
            `x-uigen-app at ${context.path}: can only be applied at document level, not at operation level`
          );
        } else if (context.schemaNode) {
          context.utils.logWarning(
            `x-uigen-app at ${context.path}: can only be applied at document level, not at field level`
          );
        } else {
          context.utils.logWarning(
            `x-uigen-app at ${context.path}: can only be applied at document level`
          );
        }
        return;
      }

      // Handle multiple annotations at document level - first wins (Requirement 4.6)
      if (context.ir.appConfig) {
        context.utils.logWarning(
          `x-uigen-app at ${context.path}: multiple app annotations found at document level, using first annotation`
        );
        return;
      }

      // Store configuration in IR (Requirement 4.2, 4.5)
      // Preserve all metadata fields including unknown fields for extensibility
      context.ir.appConfig = {
        name: value.name,
        icon: value.icon,
        ...value // Preserve all fields including unknown ones
      };
    } catch (error) {
      context.utils.logWarning(`x-uigen-app at ${context.path}: apply error - ${error}`);
    }
  }
}
