/**
 * Browser-safe DateTime converter
 * Simplified version for React components
 */

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import customParseFormat from 'dayjs/plugin/customParseFormat';

// Configure dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

export class DateTimeConverter {
  /**
   * Convert HTML datetime-local format to ISO 8601
   * 
   * HTML datetime-local returns: YYYY-MM-DDTHH:MM (no seconds, no timezone)
   * This method converts to: YYYY-MM-DDTHH:MM:SS.sssZ (ISO 8601 with UTC timezone)
   * 
   * @param value - HTML datetime-local string (YYYY-MM-DDTHH:MM)
   * @param timezone - Optional timezone (defaults to 'local')
   * @returns ISO 8601 string or null if invalid
   */
  static htmlDateTimeLocalToISO(
    value: string,
    timezone?: string
  ): string | null {
    if (!value) return null;
    
    try {
      // Parse as local time (HTML datetime-local has no timezone)
      let date = dayjs(value);
      
      if (!date.isValid()) {
        return null;
      }
      
      // Apply timezone if specified and not 'local'
      if (timezone && timezone !== 'local') {
        date = date.tz(timezone, true); // true = keep local time
      }
      
      // Return ISO 8601 string
      return date.toISOString();
    } catch {
      return null;
    }
  }
  
  /**
   * Convert ISO 8601 to HTML datetime-local format
   * 
   * ISO 8601: YYYY-MM-DDTHH:MM:SS.sssZ (with timezone)
   * HTML datetime-local needs: YYYY-MM-DDTHH:MM (no seconds, no timezone, local time)
   * 
   * @param value - ISO 8601 string
   * @param timezone - Optional timezone (defaults to 'local')
   * @returns HTML datetime-local string or empty string if invalid
   */
  static isoToHtmlDateTimeLocal(
    value: string,
    timezone?: string
  ): string {
    if (!value) return '';
    
    try {
      let date = dayjs(value);
      
      if (!date.isValid()) {
        return '';
      }
      
      // Convert to specified timezone or local
      if (timezone && timezone !== 'local') {
        date = date.tz(timezone);
      }
      
      // Format for HTML datetime-local (YYYY-MM-DDTHH:mm)
      return date.format('YYYY-MM-DDTHH:mm');
    } catch {
      return '';
    }
  }

  /**
   * Convert from API format to display format
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
      
      if (apiFormat === 'unix') {
        date = dayjs.unix(Number(value));
      } else if (apiFormat === 'unix-ms') {
        date = dayjs(Number(value));
      } else {
        const format = apiFormat || undefined;
        date = format 
          ? dayjs(value as string, format, true) 
          : dayjs(value as string);
      }
      
      if (!date.isValid()) {
        return '';
      }
      
      if (timezone && timezone !== 'local') {
        date = date.tz(timezone);
      }
      
      return date.format(displayFormat);
    } catch {
      return '';
    }
  }
  
  /**
   * Convert from display format to API format
   */
  static toApi(
    value: string,
    displayFormat: string,
    apiFormat: string,
    timezone?: string
  ): string | number | null {
    if (!value) return null;
    
    try {
      let date = dayjs(value, displayFormat, true);
      
      if (!date.isValid()) {
        return null;
      }
      
      if (timezone && timezone !== 'local') {
        date = date.tz(timezone, true);
      }
      
      if (apiFormat === 'unix') {
        return date.unix();
      } else if (apiFormat === 'unix-ms') {
        return date.valueOf();
      } else {
        return apiFormat ? date.format(apiFormat) : date.toISOString();
      }
    } catch {
      return null;
    }
  }
}
