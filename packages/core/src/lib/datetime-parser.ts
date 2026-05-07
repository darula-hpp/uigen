/**
 * DateTimeParser service
 * 
 * Provides static methods for parsing datetime strings using dayjs.
 * Handles timezone-aware parsing and provides consistent error handling.
 * 
 * @example
 * import { DateTimeParser } from './lib/datetime-parser';
 * 
 * const date = DateTimeParser.parse('01/15/2021', 'MM/DD/YYYY');
 * const iso = DateTimeParser.toISO(date);
 */

import dayjs from './dayjs.js';

export class DateTimeParser {
  /**
   * Parse a date string using the specified format pattern and timezone
   * 
   * @param value - Input string from user
   * @param format - dayjs format pattern for parsing
   * @param timezone - Optional IANA timezone identifier or 'local'
   * @returns Date object or null if invalid
   */
  static parse(
    value: string,
    format: string,
    timezone?: string
  ): Date | null {
    // Handle empty values
    if (!value || !format) return null;
    
    try {
      // Parse with strict mode enabled (third parameter = true)
      let date = dayjs(value, format, true);
      
      // Validate the parsed date
      if (!date.isValid()) {
        console.warn(`DateTimeParser: Failed to parse value "${value}" with format "${format}"`);
        return null;
      }
      
      // Apply timezone if specified
      if (timezone && timezone !== 'local') {
        date = date.tz(timezone, true);
      }
      
      // Convert to JavaScript Date object
      return date.toDate();
    } catch (error) {
      console.warn(`DateTimeParser: Error parsing value "${value}"`, error);
      return null;
    }
  }
  
  /**
   * Convert a Date object to ISO string for API submission
   * 
   * @param date - Date object to convert
   * @returns ISO 8601 string
   * @deprecated Use DateTimeApiConverter.toApi() instead for API format conversion
   */
  static toISO(date: Date): string {
    return dayjs(date).toISOString();
  }
}
