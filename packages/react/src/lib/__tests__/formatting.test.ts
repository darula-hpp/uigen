import { describe, it, expect } from 'vitest';
import {
  parseDate,
  formatDate,
  formatDateTime,
  formatDateForInput,
  formatDateTimeForInput,
  formatNumber,
  formatCurrency,
  formatPercentage,
} from '../formatting';

describe('Date Formatting', () => {
  it('should parse ISO 8601 date strings - Requirement 48.1', () => {
    const date = parseDate('2024-01-15T10:30:00Z');
    expect(date).toBeInstanceOf(Date);
    expect(date?.getFullYear()).toBe(2024);
  });

  it('should return null for invalid date strings', () => {
    expect(parseDate('invalid')).toBeNull();
    expect(parseDate('')).toBeNull();
  });

  it('should format dates as "MMM DD, YYYY" - Requirement 48.2', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    const formatted = formatDate(date);
    expect(formatted).toMatch(/Jan \d{1,2}, 2024/);
  });

  it('should format date-times with timezone - Requirement 48.3', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    const formatted = formatDateTime(date);
    expect(formatted).toContain('2024');
    expect(formatted).toContain('Jan');
    expect(formatted).toMatch(/\d{1,2}:\d{2}/); // Time
  });

  it('should format date for input (YYYY-MM-DD) - Requirement 48.4', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    const formatted = formatDateForInput(date);
    expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(formatted).toContain('2024');
  });

  it('should format date-time for input - Requirement 48.5', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    const formatted = formatDateTimeForInput(date);
    expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(formatted).toContain('2024');
  });

  it('should handle string inputs for formatting', () => {
    const formatted = formatDate('2024-01-15T10:30:00Z');
    expect(formatted).toMatch(/Jan \d{1,2}, 2024/);
  });

  it('should return empty string for invalid dates', () => {
    expect(formatDate('invalid')).toBe('');
    expect(formatDateTime('invalid')).toBe('');
    expect(formatDateForInput('invalid')).toBe('');
  });
});

describe('Number Formatting', () => {
  it('should format numbers with thousand separators - Requirement 49.1', () => {
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(1000000)).toBe('1,000,000');
    expect(formatNumber(1234.56, 2)).toBe('1,234.56');
  });

  it('should format currency - Requirement 49.2', () => {
    expect(formatCurrency(1234.56)).toContain('1,234.56');
    expect(formatCurrency(1234.56)).toContain('$');
    expect(formatCurrency(1000, 'EUR')).toContain('1,000');
  });

  it('should format percentages - Requirement 49.3', () => {
    expect(formatPercentage(0.1234)).toBe('12%');
    expect(formatPercentage(0.1234, 2)).toBe('12.34%');
    expect(formatPercentage(1)).toBe('100%');
  });

  it('should handle invalid numbers', () => {
    expect(formatNumber(NaN)).toBe('');
    expect(formatCurrency(NaN)).toBe('');
    expect(formatPercentage(NaN)).toBe('');
  });

  it('should format zero correctly', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatCurrency(0)).toContain('0.00');
    expect(formatPercentage(0)).toBe('0%');
  });

  it('should format negative numbers', () => {
    expect(formatNumber(-1000)).toBe('-1,000');
    expect(formatCurrency(-100)).toContain('-');
    expect(formatPercentage(-0.5)).toBe('-50%');
  });
});
