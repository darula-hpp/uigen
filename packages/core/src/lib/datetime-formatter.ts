/**
 * DateTimeFormatter service
 * 
 * Provides static methods for formatting datetime values using dayjs.
 * Handles timezone conversions and provides consistent error handling.
 * 
 * @example
 * import { DateTimeFormatter } from './lib/datetime-formatter';
 * 
 * const formatted = DateTimeFormatter.format(
 *   new Date(),
 *   'YYYY-MM-DD',
 *   'America/New_York'
 * );
 */

import dayjs from './dayjs.js';

export class DateTimeFormatter {
  /**
   * Format a date value using the specified format pattern and timezone
   * 
   * @param value - Date object or ISO string to format
   * @param format - dayjs format pattern (e.g., 'YYYY-MM-DD', 'MM/DD/YYYY HH:mm')
   * @param timezone - Optional IANA timezone identifier or 'local'
   * @returns Formatted string or empty string if invalid
   */
  static format(
    value: Date | string | null | undefined,
    format: string,
    timezone?: string
  ): string {
    // Handle null/undefined values
    if (!value) return '';
    
    try {
      // Parse the input value
      let date = dayjs(value);
      
      // Validate the parsed date
      if (!date.isValid()) {
        console.warn(`DateTimeFormatter: Invalid date value "${value}"`);
        return '';
      }
      
      // Apply timezone conversion if specified
      if (timezone && timezone !== 'local') {
        date = date.tz(timezone);
      }
      
      // Format and return
      return date.format(format);
    } catch (error) {
      console.warn(`DateTimeFormatter: Failed to format value "${value}"`, error);
      return '';
    }
  }
}
