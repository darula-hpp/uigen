/**
 * Dayjs initialization module
 * 
 * This module configures dayjs with all required plugins for datetime operations
 * across the UIGen core package. It extends dayjs with:
 * - utc: UTC timezone support
 * - timezone: IANA timezone support
 * - customParseFormat: Custom format parsing support
 * 
 * Import this configured instance instead of importing dayjs directly
 * to ensure all plugins are available.
 * 
 * @example
 * import dayjs from './lib/dayjs';
 * 
 * const formatted = dayjs().format('YYYY-MM-DD');
 * const inTimezone = dayjs().tz('America/New_York');
 */

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';

// Extend dayjs with all required plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

// Export the configured dayjs instance
export default dayjs;
