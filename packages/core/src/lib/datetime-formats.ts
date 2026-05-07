/**
 * Common datetime format patterns
 * 
 * Provides a library of commonly used datetime format patterns for dayjs.
 * These constants can be used with DateTimeFormatter and DateTimeParser
 * to ensure consistent formatting across the application.
 * 
 * @example
 * import { DateTimeFormats } from './lib/datetime-formats';
 * import { DateTimeFormatter } from './lib/datetime-formatter';
 * 
 * const formatted = DateTimeFormatter.format(
 *   new Date(),
 *   DateTimeFormats.US_DATE
 * );
 */

export const DateTimeFormats = {
  // ISO formats
  ISO_DATE: 'YYYY-MM-DD',
  ISO_DATETIME: 'YYYY-MM-DDTHH:mm:ss',
  ISO_DATETIME_TZ: 'YYYY-MM-DDTHH:mm:ssZ',
  
  // US formats
  US_DATE: 'MM/DD/YYYY',
  US_DATE_SHORT: 'M/D/YY',
  US_DATETIME: 'MM/DD/YYYY hh:mm A',
  
  // EU formats
  EU_DATE: 'DD/MM/YYYY',
  EU_DATE_SHORT: 'D/M/YY',
  EU_DATETIME: 'DD/MM/YYYY HH:mm',
  
  // Time formats
  TIME_24H: 'HH:mm',
  TIME_24H_SECONDS: 'HH:mm:ss',
  TIME_12H: 'hh:mm A',
  TIME_12H_SECONDS: 'hh:mm:ss A',
  
  // Display formats
  DISPLAY_DATE: 'MMM DD, YYYY',
  DISPLAY_DATETIME: 'MMM DD, YYYY HH:mm',
  DISPLAY_FULL: 'MMMM DD, YYYY hh:mm A',
} as const;

export type DateTimeFormatKey = keyof typeof DateTimeFormats;
