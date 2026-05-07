import type { AnnotationHandler, AnnotationContext } from '../types.js';
import type { DateTimeConfig } from '../../../ir/types.js';

/**
 * Valid dayjs format tokens for validation
 */
const VALID_TOKENS = [
  'YYYY', 'YY', 'MM', 'M', 'DD', 'D',
  'HH', 'H', 'hh', 'h', 'mm', 'm',
  'ss', 's', 'SSS', 'SS', 'S',
  'A', 'a', 'Z', 'ZZ'
];

/**
 * Valid separators in format patterns
 */
const VALID_SEPARATORS = ['-', '/', ':', ' ', 'T', '.'];

/**
 * Internal shape of the raw x-uigen-datetime annotation before validation.
 */
interface DateTimeAnnotation {
  format: string;
  timezone?: string;
}

/**
 * Handler for x-uigen-datetime annotation.
 * Configures datetime field formatting and input controls.
 * 
 * Requirements: 1.1-1.4, 2.1-2.5, 3.1-3.5, 5.1-5.5, 6.1-6.5, 7.1-7.4
 */
export class DateTimeHandler implements AnnotationHandler<DateTimeAnnotation> {
  public readonly name = 'x-uigen-datetime';

  /**
   * Metadata for the x-uigen-datetime annotation
   */
  public static readonly metadata = {
    name: 'x-uigen-datetime',
    description: 'Configures datetime field formatting and input controls using dayjs format patterns',
    targetType: 'field' as const,
    applicableWhen: {
      type: 'string'
    },
    parameterSchema: {
      type: 'string | object' as const,
      properties: {
        format: {
          type: 'string',
          description: 'Dayjs format pattern (e.g., YYYY-MM-DD, HH:mm:ss, YYYY-MM-DD HH:mm:ss)'
        },
        timezone: {
          type: 'string',
          description: 'IANA timezone identifier (e.g., America/New_York, Europe/London)'
        }
      },
      required: ['format']
    },
    examples: [
      {
        description: 'Simple date format (string shorthand)',
        value: 'YYYY-MM-DD'
      },
      {
        description: 'Date and time format',
        value: {
          format: 'YYYY-MM-DD HH:mm:ss'
        }
      },
      {
        description: 'Date with timezone',
        value: {
          format: 'YYYY-MM-DD',
          timezone: 'America/New_York'
        }
      },
      {
        description: 'Time only format',
        value: {
          format: 'HH:mm:ss'
        }
      },
      {
        description: 'Custom datetime format with timezone',
        value: {
          format: 'DD/MM/YYYY hh:mm A',
          timezone: 'Europe/London'
        }
      }
    ]
  };

  /**
   * Extract the x-uigen-datetime annotation value from the spec element.
   * Accepts both string format (simple format pattern) and object format (with format and timezone).
   * 
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
   * 
   * @param context - The annotation context containing the spec element
   * @returns The raw annotation object or undefined if absent/invalid type
   */
  extract(context: AnnotationContext): DateTimeAnnotation | undefined {
    try {
      const element = context.element as any;
      const annotation = element['x-uigen-datetime'];

      if (annotation === undefined) {
        return undefined;
      }

      // Handle string format (simple format pattern)
      if (typeof annotation === 'string') {
        return {
          format: annotation
        };
      }

      // Handle object format (with format and optional timezone)
      if (typeof annotation === 'object' && annotation !== null && !Array.isArray(annotation)) {
        return annotation as DateTimeAnnotation;
      }

      // Invalid type - log warning and return undefined
      context.utils.logWarning(
        `x-uigen-datetime at ${context.path} must be a string or object, found ${
          annotation === null ? 'null' : Array.isArray(annotation) ? 'array' : typeof annotation
        }`
      );
      return undefined;
    } catch (error) {
      context.utils.logWarning(`x-uigen-datetime at ${context.path}: extraction error - ${error}`);
      return undefined;
    }
  }

  /**
   * Validate that the annotation has a valid format pattern.
   * 
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
   * 
   * @param value - The extracted annotation object
   * @returns true if valid, false otherwise (never throws)
   */
  validate(value: DateTimeAnnotation): boolean {
    try {
      // Validate format is a non-empty string
      if (!value.format || typeof value.format !== 'string' || value.format.trim() === '') {
        console.warn('x-uigen-datetime: format is required and must be a non-empty string');
        return false;
      }

      // Validate format pattern contains at least one valid token
      if (!this.validateFormatPattern(value.format)) {
        console.warn(`x-uigen-datetime: invalid format pattern "${value.format}"`);
        return false;
      }

      // Validate timezone if provided
      if (value.timezone !== undefined) {
        if (typeof value.timezone !== 'string' || value.timezone.trim() === '') {
          console.warn('x-uigen-datetime: timezone must be a non-empty string');
          return false;
        }
      }

      return true;
    } catch (error) {
      console.warn(`x-uigen-datetime: validation error - ${error}`);
      return false;
    }
  }

  /**
   * Validate format pattern contains at least one valid dayjs token.
   * 
   * Requirements: 3.2, 3.4, 3.5
   * 
   * @param format - The format pattern to validate
   * @returns true if valid, false otherwise
   */
  private validateFormatPattern(format: string): boolean {
    // Check if format contains at least one valid token
    const hasValidToken = VALID_TOKENS.some(token => format.includes(token));
    
    if (!hasValidToken) {
      return false;
    }

    // Check if format contains only valid tokens and separators
    // Remove all valid tokens and separators, check if anything remains
    let remaining = format;
    
    // Remove valid tokens
    for (const token of VALID_TOKENS) {
      remaining = remaining.split(token).join('');
    }
    
    // Remove valid separators
    for (const separator of VALID_SEPARATORS) {
      remaining = remaining.split(separator).join('');
    }
    
    // If anything remains, it's an invalid character
    if (remaining.length > 0) {
      return false;
    }

    return true;
  }

  /**
   * Detect appropriate input control type based on format pattern.
   * 
   * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
   * 
   * @param format - The format pattern
   * @returns The input control type
   */
  private detectInputType(format: string): 'date' | 'time' | 'datetime-local' {
    const hasDate = /YYYY|YY|MM|M|DD|D/.test(format);
    const hasTime = /HH|H|hh|h|mm|m|ss|s/.test(format);
    
    if (hasDate && hasTime) {
      return 'datetime-local';
    }
    
    if (hasTime) {
      return 'time';
    }
    
    return 'date';
  }

  /**
   * Apply the datetime annotation by setting dateTimeConfig on the schema node.
   * 
   * Requirements: 5.1, 5.2, 5.3, 5.4, 7.1, 7.2, 7.3, 7.4
   * 
   * @param value - The validated annotation object
   * @param context - The annotation context
   */
  apply(value: DateTimeAnnotation, context: AnnotationContext): void {
    try {
      // Validate schema node exists
      if (!context.schemaNode) {
        context.utils.logWarning(`x-uigen-datetime at ${context.path}: schema node not found`);
        return;
      }

      // Validate field type is string
      if (context.schemaNode.type !== 'string') {
        context.utils.logWarning(
          `x-uigen-datetime at ${context.path} can only be applied to string fields, found type "${context.schemaNode.type}"`
        );
        return;
      }

      // Detect input control type
      const inputType = this.detectInputType(value.format);

      // Set dateTimeConfig on schema node
      context.schemaNode.dateTimeConfig = {
        format: value.format,
        timezone: value.timezone,
        inputType
      };
    } catch (error) {
      context.utils.logWarning(`x-uigen-datetime at ${context.path}: apply error - ${error}`);
    }
  }
}
