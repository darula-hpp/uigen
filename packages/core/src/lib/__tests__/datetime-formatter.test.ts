/**
 * Tests for DateTimeFormatter service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DateTimeFormatter } from '../datetime-formatter';

describe('DateTimeFormatter', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('format()', () => {
    it('should format Date objects with various format patterns', () => {
      const date = new Date('2021-01-15T10:30:00Z');
      
      expect(DateTimeFormatter.format(date, 'YYYY-MM-DD')).toBe('2021-01-15');
      expect(DateTimeFormatter.format(date, 'MM/DD/YYYY')).toBe('01/15/2021');
      expect(DateTimeFormatter.format(date, 'DD/MM/YYYY')).toBe('15/01/2021');
      expect(DateTimeFormatter.format(date, 'YYYY-MM-DD HH:mm:ss')).toContain('2021-01-15');
    });

    it('should format ISO strings with various format patterns', () => {
      const isoString = '2021-01-15T10:30:00Z';
      
      expect(DateTimeFormatter.format(isoString, 'YYYY-MM-DD')).toBe('2021-01-15');
      expect(DateTimeFormatter.format(isoString, 'MM/DD/YYYY')).toBe('01/15/2021');
      expect(DateTimeFormatter.format(isoString, 'DD-MM-YYYY')).toBe('15-01-2021');
      expect(DateTimeFormatter.format(isoString, 'MMM DD, YYYY')).toBe('Jan 15, 2021');
    });

    it('should return empty string for null', () => {
      expect(DateTimeFormatter.format(null, 'YYYY-MM-DD')).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(DateTimeFormatter.format(undefined, 'YYYY-MM-DD')).toBe('');
    });

    it('should return empty string for invalid date and log warning', () => {
      const result = DateTimeFormatter.format('invalid-date', 'YYYY-MM-DD');
      
      expect(result).toBe('');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid date value')
      );
    });

    it('should handle timezone conversion for multiple IANA timezones', () => {
      const utcDate = '2021-01-15T10:30:00Z';
      
      // New York is UTC-5 in January (EST)
      const nyFormatted = DateTimeFormatter.format(utcDate, 'YYYY-MM-DD HH:mm', 'America/New_York');
      expect(nyFormatted).toBe('2021-01-15 05:30');
      
      // London is UTC+0 in January (GMT)
      const londonFormatted = DateTimeFormatter.format(utcDate, 'YYYY-MM-DD HH:mm', 'Europe/London');
      expect(londonFormatted).toBe('2021-01-15 10:30');
      
      // Tokyo is UTC+9
      const tokyoFormatted = DateTimeFormatter.format(utcDate, 'YYYY-MM-DD HH:mm', 'Asia/Tokyo');
      expect(tokyoFormatted).toBe('2021-01-15 19:30');
    });

    it('should handle local timezone when timezone is "local"', () => {
      const date = '2021-01-15T10:30:00Z';
      const result = DateTimeFormatter.format(date, 'YYYY-MM-DD HH:mm', 'local');
      
      // Should return a valid formatted string (exact value depends on system timezone)
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    });

    it('should handle local timezone when timezone is not specified', () => {
      const date = '2021-01-15T10:30:00Z';
      const result = DateTimeFormatter.format(date, 'YYYY-MM-DD HH:mm');
      
      // Should return a valid formatted string (exact value depends on system timezone)
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    });

    it('should log warning for errors during formatting', () => {
      // Force an error by passing an object that dayjs can't parse
      const invalidValue = { invalid: 'object' } as any;
      const result = DateTimeFormatter.format(invalidValue, 'YYYY-MM-DD');
      
      expect(result).toBe('');
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should format time-only patterns', () => {
      const date = '2021-01-15T14:30:45Z';
      
      expect(DateTimeFormatter.format(date, 'HH:mm')).toContain(':');
      expect(DateTimeFormatter.format(date, 'HH:mm:ss')).toMatch(/\d{2}:\d{2}:\d{2}/);
      expect(DateTimeFormatter.format(date, 'hh:mm A')).toMatch(/\d{2}:\d{2} (AM|PM)/);
    });

    it('should format datetime with timezone indicator', () => {
      const date = '2021-01-15T10:30:00Z';
      
      const formatted = DateTimeFormatter.format(date, 'YYYY-MM-DD HH:mm Z', 'America/New_York');
      expect(formatted).toContain('-05:00'); // EST offset
    });

    it('should handle edge case dates', () => {
      // Leap year
      expect(DateTimeFormatter.format('2020-02-29T00:00:00Z', 'YYYY-MM-DD')).toBe('2020-02-29');
      
      // Year boundary - format in UTC to avoid timezone issues
      const utcFormatter = (date: string, format: string) => {
        return DateTimeFormatter.format(date, format, 'UTC');
      };
      expect(utcFormatter('2020-12-31T23:59:59Z', 'YYYY-MM-DD HH:mm:ss')).toContain('2020-12-31');
      expect(utcFormatter('2021-01-01T00:00:00Z', 'YYYY-MM-DD HH:mm:ss')).toContain('2021-01-01');
    });
  });
});
