/**
 * Tests for dayjs initialization module
 * 
 * Verifies that dayjs is properly configured with all required plugins
 */

import { describe, it, expect } from 'vitest';
import dayjs from '../dayjs';

describe('dayjs initialization', () => {
  it('should have utc plugin loaded', () => {
    const date = dayjs('2021-01-15T10:30:00Z');
    expect(date.utc).toBeDefined();
    expect(typeof date.utc).toBe('function');
    
    const utcDate = date.utc();
    expect(utcDate.isValid()).toBe(true);
  });

  it('should have timezone plugin loaded', () => {
    const date = dayjs('2021-01-15T10:30:00Z');
    expect(date.tz).toBeDefined();
    expect(typeof date.tz).toBe('function');
    
    // Test timezone conversion
    const nyDate = date.tz('America/New_York');
    expect(nyDate.isValid()).toBe(true);
  });

  it('should have customParseFormat plugin loaded', () => {
    // Test strict parsing with custom format
    const date = dayjs('01/15/2021', 'MM/DD/YYYY', true);
    expect(date.isValid()).toBe(true);
    expect(date.year()).toBe(2021);
    expect(date.month()).toBe(0); // January is 0
    expect(date.date()).toBe(15);
  });

  it('should reject invalid dates with strict parsing', () => {
    // Strict parsing should reject invalid dates
    const invalidDate = dayjs('invalid', 'MM/DD/YYYY', true);
    expect(invalidDate.isValid()).toBe(false);
  });

  it('should support timezone conversion', () => {
    const utcDate = dayjs.utc('2021-01-15T10:30:00Z');
    const nyDate = utcDate.tz('America/New_York');
    
    // New York is UTC-5 in January (EST)
    expect(nyDate.hour()).toBe(5); // 10:30 UTC = 05:30 EST
    expect(nyDate.minute()).toBe(30);
  });

  it('should support custom format parsing with timezone', () => {
    const date = dayjs.tz('2021-01-15 10:30', 'YYYY-MM-DD HH:mm', 'America/New_York');
    expect(date.isValid()).toBe(true);
    expect(date.year()).toBe(2021);
    expect(date.month()).toBe(0);
    expect(date.date()).toBe(15);
    expect(date.hour()).toBe(10);
    expect(date.minute()).toBe(30);
  });

  it('should format dates correctly', () => {
    const date = dayjs.utc('2021-01-15T10:30:00Z');
    
    expect(date.format('YYYY-MM-DD')).toBe('2021-01-15');
    expect(date.format('MM/DD/YYYY')).toBe('01/15/2021');
    expect(date.format('DD/MM/YYYY')).toBe('15/01/2021');
    expect(date.format('HH:mm:ss')).toBe('10:30:00');
  });

  it('should handle UTC operations', () => {
    const localDate = dayjs('2021-01-15T10:30:00');
    const utcDate = localDate.utc();
    
    expect(utcDate.isValid()).toBe(true);
    expect(utcDate.format()).toContain('Z'); // UTC dates end with Z
  });
});
