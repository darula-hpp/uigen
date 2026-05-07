/**
 * Tests for DateTimeParser service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DateTimeParser } from '../datetime-parser';

describe('DateTimeParser', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('parse()', () => {
    it('should parse valid date strings with various formats', () => {
      const result1 = DateTimeParser.parse('2021-01-15', 'YYYY-MM-DD');
      expect(result1).toBeInstanceOf(Date);
      expect(result1?.getFullYear()).toBe(2021);
      expect(result1?.getMonth()).toBe(0); // January is 0
      expect(result1?.getDate()).toBe(15);

      const result2 = DateTimeParser.parse('01/15/2021', 'MM/DD/YYYY');
      expect(result2).toBeInstanceOf(Date);
      expect(result2?.getFullYear()).toBe(2021);
      expect(result2?.getMonth()).toBe(0);
      expect(result2?.getDate()).toBe(15);

      const result3 = DateTimeParser.parse('15-01-2021', 'DD-MM-YYYY');
      expect(result3).toBeInstanceOf(Date);
      expect(result3?.getFullYear()).toBe(2021);
      expect(result3?.getMonth()).toBe(0);
      expect(result3?.getDate()).toBe(15);
    });

    it('should parse valid datetime strings with timezone', () => {
      const result = DateTimeParser.parse('2021-01-15 10:30', 'YYYY-MM-DD HH:mm', 'America/New_York');
      
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2021);
      expect(result?.getMonth()).toBe(0);
      expect(result?.getDate()).toBe(15);
    });

    it('should parse valid time-only strings', () => {
      const result1 = DateTimeParser.parse('14:30', 'HH:mm');
      expect(result1).toBeInstanceOf(Date);
      expect(result1?.getHours()).toBe(14);
      expect(result1?.getMinutes()).toBe(30);

      const result2 = DateTimeParser.parse('02:30 PM', 'hh:mm A');
      expect(result2).toBeInstanceOf(Date);
      expect(result2?.getHours()).toBe(14);
      expect(result2?.getMinutes()).toBe(30);

      const result3 = DateTimeParser.parse('14:30:45', 'HH:mm:ss');
      expect(result3).toBeInstanceOf(Date);
      expect(result3?.getHours()).toBe(14);
      expect(result3?.getMinutes()).toBe(30);
      expect(result3?.getSeconds()).toBe(45);
    });

    it('should return null for invalid input', () => {
      const result1 = DateTimeParser.parse('invalid-date', 'YYYY-MM-DD');
      expect(result1).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalled();

      const result2 = DateTimeParser.parse('2021-13-01', 'YYYY-MM-DD'); // Invalid month
      expect(result2).toBeNull();

      const result3 = DateTimeParser.parse('2021-02-30', 'YYYY-MM-DD'); // Invalid day
      expect(result3).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = DateTimeParser.parse('', 'YYYY-MM-DD');
      expect(result).toBeNull();
    });

    it('should return null for empty format', () => {
      const result = DateTimeParser.parse('2021-01-15', '');
      expect(result).toBeNull();
    });

    it('should handle timezone-aware parsing', () => {
      const result1 = DateTimeParser.parse('2021-01-15 10:30', 'YYYY-MM-DD HH:mm', 'America/New_York');
      expect(result1).toBeInstanceOf(Date);

      const result2 = DateTimeParser.parse('2021-01-15 10:30', 'YYYY-MM-DD HH:mm', 'Europe/London');
      expect(result2).toBeInstanceOf(Date);

      const result3 = DateTimeParser.parse('2021-01-15 10:30', 'YYYY-MM-DD HH:mm', 'Asia/Tokyo');
      expect(result3).toBeInstanceOf(Date);
    });

    it('should preserve timezone when parsing with timezone', () => {
      const nyResult = DateTimeParser.parse('2021-01-15 10:30', 'YYYY-MM-DD HH:mm', 'America/New_York');
      const utcResult = DateTimeParser.parse('2021-01-15 10:30', 'YYYY-MM-DD HH:mm', 'UTC');
      
      // Both should be valid dates
      expect(nyResult).toBeInstanceOf(Date);
      expect(utcResult).toBeInstanceOf(Date);
      
      // They should represent different moments in time
      expect(nyResult?.getTime()).not.toBe(utcResult?.getTime());
    });

    it('should use strict parsing mode', () => {
      // Strict mode should reject dates that don't match the format exactly
      const result = DateTimeParser.parse('2021-1-5', 'YYYY-MM-DD'); // Missing leading zeros
      expect(result).toBeNull();
    });

    it('should log warning when parsing fails', () => {
      DateTimeParser.parse('invalid', 'YYYY-MM-DD');
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse value')
      );
    });
  });

  describe('toISO()', () => {
    it('should convert Date to ISO string correctly', () => {
      const date = new Date('2021-01-15T10:30:00Z');
      const iso = DateTimeParser.toISO(date);
      
      expect(iso).toBe('2021-01-15T10:30:00.000Z');
    });

    it('should handle dates with milliseconds', () => {
      const date = new Date('2021-01-15T10:30:00.123Z');
      const iso = DateTimeParser.toISO(date);
      
      expect(iso).toBe('2021-01-15T10:30:00.123Z');
    });

    it('should convert local dates to ISO format', () => {
      const date = new Date(2021, 0, 15, 10, 30, 0); // Local time
      const iso = DateTimeParser.toISO(date);
      
      // Should be a valid ISO string
      expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });
});
