import type { AnnotationHandler, AnnotationContext } from '../types.js';

/**
 * List of valid special timezone values
 */
const SPECIAL_TIMEZONES = ['local', 'utc', 'UTC'];

/**
 * Handler for x-uigen-datetime-tz annotation.
 * Configures timezone for datetime field display and conversion.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */
export class DateTimeTimezoneHandler implements AnnotationHandler<string> {
  public readonly name = 'x-uigen-datetime-tz';

  /**
   * Extract the x-uigen-datetime-tz annotation value from the spec element.
   * Accepts only non-empty string values representing timezone identifiers.
   * 
   * Requirements: 4.1, 4.2
   * 
   * @param context - The annotation context containing the spec element
   * @returns The timezone string or undefined if absent/invalid type
   */
  extract(context: AnnotationContext): string | undefined {
    try {
      const element = context.element as any;
      const annotation = element['x-uigen-datetime-tz'];

      if (annotation === undefined) {
        return undefined;
      }

      // Only accept non-empty strings
      if (typeof annotation === 'string' && annotation.trim() !== '') {
        return annotation.trim();
      }

      // Invalid type - log warning and return undefined
      context.utils.logWarning(
        `x-uigen-datetime-tz at ${context.path} must be a non-empty string, found ${
          annotation === null ? 'null' : Array.isArray(annotation) ? 'array' : typeof annotation
        }`
      );
      return undefined;
    } catch (error) {
      context.utils.logWarning(`x-uigen-datetime-tz at ${context.path}: extraction error - ${error}`);
      return undefined;
    }
  }

  /**
   * Validate that the timezone is a valid IANA timezone identifier or special value.
   * Accepts: IANA timezone identifiers (e.g., "America/New_York"), "local", "utc", "UTC"
   * 
   * Requirements: 4.2, 4.3, 4.4, 4.5
   * 
   * @param value - The extracted timezone string
   * @returns true if valid, false otherwise (never throws)
   */
  validate(value: string): boolean {
    try {
      // Validate is a non-empty string
      if (!value || typeof value !== 'string' || value.trim() === '') {
        console.warn('x-uigen-datetime-tz: timezone must be a non-empty string');
        return false;
      }

      // Accept special timezone values
      if (SPECIAL_TIMEZONES.includes(value)) {
        return true;
      }

      // Validate IANA timezone identifier
      // Use a simple heuristic: IANA timezones typically contain a slash (e.g., "America/New_York")
      // or are well-known abbreviations (e.g., "EST", "PST")
      // For more robust validation, we would need to check against the full IANA database
      // but that would require runtime timezone data which is provided by dayjs-timezone plugin
      
      // Basic validation: check if it looks like a valid timezone format
      // IANA timezones are typically: Continent/City or Region/City
      const isIANAFormat = /^[A-Za-z]+\/[A-Za-z_]+$/.test(value) || /^[A-Z]{3,4}$/.test(value);
      
      if (!isIANAFormat) {
        console.warn(`x-uigen-datetime-tz: invalid timezone format "${value}". Expected IANA timezone identifier (e.g., "America/New_York") or special value ("local", "utc", "UTC")`);
        return false;
      }

      return true;
    } catch (error) {
      console.warn(`x-uigen-datetime-tz: validation error - ${error}`);
      return false;
    }
  }

  /**
   * Apply the timezone annotation by setting or merging with dateTimeConfig on the schema node.
   * If dateTimeConfig exists, merge timezone into it.
   * If dateTimeConfig doesn't exist, create it with timezone and default values.
   * 
   * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
   * 
   * @param value - The validated timezone string
   * @param context - The annotation context
   */
  apply(value: string, context: AnnotationContext): void {
    try {
      // Validate schema node exists
      if (!context.schemaNode) {
        context.utils.logWarning(`x-uigen-datetime-tz at ${context.path}: schema node not found`);
        return;
      }

      // Validate field type is string
      if (context.schemaNode.type !== 'string') {
        context.utils.logWarning(
          `x-uigen-datetime-tz at ${context.path} can only be applied to string fields, found type "${context.schemaNode.type}"`
        );
        return;
      }

      // Check if dateTimeConfig already exists
      if (context.schemaNode.dateTimeConfig) {
        // Merge timezone into existing config
        context.schemaNode.dateTimeConfig.timezone = value;
      } else {
        // Create new dateTimeConfig with timezone and defaults
        // Default format and inputType when creating from timezone-only annotation
        context.schemaNode.dateTimeConfig = {
          format: 'MMM DD, YYYY', // Default display format
          timezone: value,
          inputType: 'date' // Default to date input
        };
      }
    } catch (error) {
      context.utils.logWarning(`x-uigen-datetime-tz at ${context.path}: apply error - ${error}`);
    }
  }
}
