/**
 * Property 21: Date Parsing Round Trip
 * Validates: Requirements 48.1, 48.4, 48.5
 * 
 * This property test verifies that date parsing and formatting operations
 * are reversible - parsing a formatted date should yield the original date.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { parseDate, formatDateForInput, formatDateTimeForInput } from '../formatting';

describe('Property 21: Date Parsing Round Trip', () => {
  it('should preserve date when parsing formatted date string (YYYY-MM-DD)', () => {
    fc.assert(
      fc.property(
        // Generate valid dates between 1970 and 2100
        fc.date({ min: new Date('1970-01-01'), max: new Date('2100-12-31') })
          .filter(d => !isNaN(d.getTime())), // Filter out invalid dates
        (originalDate) => {
          // Format the date for input (YYYY-MM-DD)
          const formatted = formatDateForInput(originalDate);
          
          // Parse it back
          const parsed = parseDate(formatted);
          
          // Should successfully parse
          expect(parsed).not.toBeNull();
          
          if (parsed) {
            // The date components should match (ignoring time)
            expect(parsed.getFullYear()).toBe(originalDate.getFullYear());
            expect(parsed.getMonth()).toBe(originalDate.getMonth());
            expect(parsed.getDate()).toBe(originalDate.getDate());
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve date-time when parsing formatted date-time string (YYYY-MM-DDTHH:mm)', () => {
    fc.assert(
      fc.property(
        // Generate valid dates between 1970 and 2100
        fc.date({ min: new Date('1970-01-01'), max: new Date('2100-12-31') })
          .filter(d => !isNaN(d.getTime())), // Filter out invalid dates
        (originalDate) => {
          // Format the date-time for input (YYYY-MM-DDTHH:mm)
          const formatted = formatDateTimeForInput(originalDate);
          
          // Parse it back
          const parsed = parseDate(formatted);
          
          // Should successfully parse
          expect(parsed).not.toBeNull();
          
          if (parsed) {
            // The date and time components should match (ignoring seconds and milliseconds)
            expect(parsed.getFullYear()).toBe(originalDate.getFullYear());
            expect(parsed.getMonth()).toBe(originalDate.getMonth());
            expect(parsed.getDate()).toBe(originalDate.getDate());
            expect(parsed.getHours()).toBe(originalDate.getHours());
            expect(parsed.getMinutes()).toBe(originalDate.getMinutes());
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle ISO 8601 date strings correctly', () => {
    fc.assert(
      fc.property(
        // Generate valid dates between 1970 and 2100
        fc.date({ min: new Date('1970-01-01'), max: new Date('2100-12-31') })
          .filter(d => !isNaN(d.getTime())), // Filter out invalid dates
        (originalDate) => {
          // Convert to ISO string
          const isoString = originalDate.toISOString();
          
          // Parse it
          const parsed = parseDate(isoString);
          
          // Should successfully parse
          expect(parsed).not.toBeNull();
          
          if (parsed) {
            // Should match the original date (within millisecond precision)
            expect(Math.abs(parsed.getTime() - originalDate.getTime())).toBeLessThan(1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return null for invalid date strings', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary strings that are likely invalid dates
        fc.string().filter(s => {
          // Filter out strings that might accidentally be valid dates
          const parsed = new Date(s);
          return isNaN(parsed.getTime());
        }),
        (invalidDateString) => {
          const result = parseDate(invalidDateString);
          expect(result).toBeNull();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle edge case dates correctly', () => {
    const edgeCases = [
      new Date('1970-01-01T00:00:00.000Z'), // Unix epoch
      new Date('2000-01-01T00:00:00.000Z'), // Y2K
      new Date('2038-01-19T03:14:07.000Z'), // Unix 32-bit overflow
      new Date('2100-12-31T23:59:59.999Z'), // Far future
    ];

    edgeCases.forEach(date => {
      // Test date format round trip
      const dateFormatted = formatDateForInput(date);
      const dateParsed = parseDate(dateFormatted);
      expect(dateParsed).not.toBeNull();
      if (dateParsed) {
        expect(dateParsed.getFullYear()).toBe(date.getFullYear());
        expect(dateParsed.getMonth()).toBe(date.getMonth());
        expect(dateParsed.getDate()).toBe(date.getDate());
      }

      // Test date-time format round trip
      const dateTimeFormatted = formatDateTimeForInput(date);
      const dateTimeParsed = parseDate(dateTimeFormatted);
      expect(dateTimeParsed).not.toBeNull();
      if (dateTimeParsed) {
        expect(dateTimeParsed.getFullYear()).toBe(date.getFullYear());
        expect(dateTimeParsed.getMonth()).toBe(date.getMonth());
        expect(dateTimeParsed.getDate()).toBe(date.getDate());
        expect(dateTimeParsed.getHours()).toBe(date.getHours());
        expect(dateTimeParsed.getMinutes()).toBe(date.getMinutes());
      }
    });
  });

  it('should handle timezone conversions consistently', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('1970-01-01'), max: new Date('2100-12-31') })
          .filter(d => !isNaN(d.getTime())), // Filter out invalid dates
        (date) => {
          // Format for input uses local timezone
          const formatted = formatDateTimeForInput(date);
          const parsed = parseDate(formatted);
          
          expect(parsed).not.toBeNull();
          
          if (parsed) {
            // When formatting and parsing in the same timezone,
            // the local date/time components should match
            expect(parsed.getFullYear()).toBe(date.getFullYear());
            expect(parsed.getMonth()).toBe(date.getMonth());
            expect(parsed.getDate()).toBe(date.getDate());
            expect(parsed.getHours()).toBe(date.getHours());
            expect(parsed.getMinutes()).toBe(date.getMinutes());
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
