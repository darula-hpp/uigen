/**
 * DateTimeApiConverter service
 * 
 * Provides bidirectional conversion between API formats and display formats.
 * Handles Unix timestamps (seconds and milliseconds) and custom dayjs patterns.
 * 
 * @example
 * import { DateTimeApiConverter } from './lib/datetime-api-converter';
 * 
 * // Convert from API to display
 * const display = DateTimeApiConverter.fromApi(
 *   1609459200,
 *   'unix',
 *   'MMM DD, YYYY',
 *   'America/New_York'
 * );
 * 
 * // Convert from display to API
 * const api = DateTimeApiConverter.toApi(
 *   'Jan 01, 2021',
 *   'MMM DD, YYYY',
 *   'unix',
 *   'America/New_York'
 * );
 */

import dayjs from './dayjs.js';

export class DateTimeApiConverter {
  /**
   * Convert from API format to display format
   * 
   * @param value - Value from API (string or number for Unix timestamps)
   * @param apiFormat - Format the API uses ('unix', 'unix-ms', or dayjs pattern)
   * @param displayFormat - Format for user display
   * @param timezone - Optional timezone for display
   * @returns Formatted display string or empty string if invalid
   */
  static fromApi(
    value: string | number | null | undefined,
    apiFormat: string,
    displayFormat: string,
    timezone?: string
  ): string {
    if (value === null || value === undefined) return '';
    
    try {
      let date: dayjs.Dayjs;
      
      // Handle Unix timestamps
      if (apiFormat === 'unix') {
        // Unix timestamp in seconds
        if (typeof value !== 'number') {
          const parsed = parseFloat(value as string);
          if (isNaN(parsed)) {
            console.warn(`DateTimeApiConverter.fromApi: Invalid Unix timestamp "${value}"`);
            return '';
          }
          value = parsed;
        }
        
        // Validate timestamp range
        if (!this.isValidUnixTimestamp(value as number, false)) {
          console.warn(`DateTimeApiConverter.fromApi: Unix timestamp ${value} is outside reasonable range`);
        }
        
        date = dayjs.unix(value as number);
      } else if (apiFormat === 'unix-ms') {
        // Unix timestamp in milliseconds
        if (typeof value !== 'number') {
          const parsed = parseFloat(value as string);
          if (isNaN(parsed)) {
            console.warn(`DateTimeApiConverter.fromApi: Invalid Unix timestamp "${value}"`);
            return '';
          }
          value = parsed;
        }
        
        // Validate timestamp range
        if (!this.isValidUnixTimestamp(value as number, true)) {
          console.warn(`DateTimeApiConverter.fromApi: Unix timestamp ${value} is outside reasonable range`);
        }
        
        date = dayjs(value as number);
      } else {
        // Custom format pattern or ISO 8601 (default)
        const format = apiFormat || undefined; // undefined = ISO 8601
        date = format 
          ? dayjs(value as string, format, true) 
          : dayjs(value as string);
      }
      
      if (!date.isValid()) {
        console.warn(`DateTimeApiConverter.fromApi: Invalid date value "${value}" with API format "${apiFormat}"`);
        return '';
      }
      
      // Apply timezone conversion for display
      if (timezone && timezone !== 'local') {
        date = date.tz(timezone);
      }
      
      return date.format(displayFormat);
    } catch (error) {
      console.warn(
        `DateTimeApiConverter.fromApi: Failed to convert value "${value}" from API format "${apiFormat}"`,
        error
      );
      return '';
    }
  }
  
  /**
   * Convert from display format to API format
   * 
   * @param value - Display value string
   * @param displayFormat - Format used for display
   * @param apiFormat - Format the API expects ('unix', 'unix-ms', or dayjs pattern)
   * @param timezone - Optional timezone from display
   * @returns API-formatted value (string or number) or null if invalid
   */
  static toApi(
    value: string,
    displayFormat: string,
    apiFormat: string,
    timezone?: string
  ): string | number | null {
    if (!value) return null;
    
    try {
      // Parse display value
      let date = dayjs(value, displayFormat, true);
      
      if (!date.isValid()) {
        console.warn(`DateTimeApiConverter.toApi: Failed to parse display value "${value}" with format "${displayFormat}"`);
        return null;
      }
      
      // Apply timezone if specified
      if (timezone && timezone !== 'local') {
        date = date.tz(timezone, true);
      }
      
      // Convert to API format
      if (apiFormat === 'unix') {
        // Unix timestamp in seconds
        const timestamp = date.unix();
        if (!this.isValidUnixTimestamp(timestamp, false)) {
          console.warn(`DateTimeApiConverter.toApi: Generated Unix timestamp ${timestamp} is outside reasonable range`);
        }
        return timestamp;
      } else if (apiFormat === 'unix-ms') {
        // Unix timestamp in milliseconds
        const timestamp = date.valueOf();
        if (!this.isValidUnixTimestamp(timestamp, true)) {
          console.warn(`DateTimeApiConverter.toApi: Generated Unix timestamp ${timestamp} is outside reasonable range`);
        }
        return timestamp;
      } else {
        // Custom format pattern or ISO 8601 (default)
        return apiFormat ? date.format(apiFormat) : date.toISOString();
      }
    } catch (error) {
      console.warn(
        `DateTimeApiConverter.toApi: Failed to convert value "${value}" to API format "${apiFormat}"`,
        error
      );
      return null;
    }
  }
  
  /**
   * Validate Unix timestamp is within reasonable range
   * 
   * @param timestamp - Unix timestamp (seconds or milliseconds)
   * @param isMilliseconds - Whether timestamp is in milliseconds
   * @returns true if valid, false otherwise
   */
  static isValidUnixTimestamp(
    timestamp: number,
    isMilliseconds: boolean = false
  ): boolean {
    // Reasonable date range: 1970-01-01 to 2100-01-01
    const minTimestamp = 0;
    const maxTimestamp = isMilliseconds ? 4102444800000 : 4102444800;
    
    return timestamp >= minTimestamp && timestamp <= maxTimestamp;
  }
}
