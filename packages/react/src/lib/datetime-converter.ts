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
