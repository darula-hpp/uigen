import { describe, it, expect } from 'vitest';
import {
  UNITS,
  toBytes,
  fromBytes,
  formatBytes,
  selectDefaultUnit,
} from '../file-size-utils.js';

describe('UNITS constant', () => {
  it('exports correct byte multipliers', () => {
    expect(UNITS.B).toBe(1);
    expect(UNITS.KB).toBe(1024);
    expect(UNITS.MB).toBe(1024 * 1024);
    expect(UNITS.GB).toBe(1024 * 1024 * 1024);
  });
});

describe('toBytes', () => {
  it('converts bytes to bytes', () => {
    expect(toBytes(500, 'B')).toBe(500);
    expect(toBytes(1, 'B')).toBe(1);
    expect(toBytes(0, 'B')).toBe(0);
  });

  it('converts kilobytes to bytes', () => {
    expect(toBytes(1, 'KB')).toBe(1024);
    expect(toBytes(2, 'KB')).toBe(2048);
    expect(toBytes(100, 'KB')).toBe(102400);
  });

  it('converts megabytes to bytes', () => {
    expect(toBytes(1, 'MB')).toBe(1048576);
    expect(toBytes(5, 'MB')).toBe(5242880);
    expect(toBytes(10, 'MB')).toBe(10485760);
  });

  it('converts gigabytes to bytes', () => {
    expect(toBytes(1, 'GB')).toBe(1073741824);
    expect(toBytes(2, 'GB')).toBe(2147483648);
  });

  it('handles fractional values', () => {
    expect(toBytes(1.5, 'KB')).toBe(1536);
    expect(toBytes(2.5, 'MB')).toBe(2621440);
    expect(toBytes(0.5, 'GB')).toBe(536870912);
  });

  it('throws error for invalid unit', () => {
    expect(() => toBytes(5, 'TB')).toThrow('Invalid unit: TB');
    expect(() => toBytes(5, 'invalid')).toThrow('Invalid unit: invalid');
    expect(() => toBytes(5, '')).toThrow('Invalid unit: ');
  });
});

describe('fromBytes', () => {
  it('converts bytes to bytes', () => {
    expect(fromBytes(500, 'B')).toBe(500);
    expect(fromBytes(1, 'B')).toBe(1);
    expect(fromBytes(0, 'B')).toBe(0);
  });

  it('converts bytes to kilobytes', () => {
    expect(fromBytes(1024, 'KB')).toBe(1);
    expect(fromBytes(2048, 'KB')).toBe(2);
    expect(fromBytes(102400, 'KB')).toBe(100);
  });

  it('converts bytes to megabytes', () => {
    expect(fromBytes(1048576, 'MB')).toBe(1);
    expect(fromBytes(5242880, 'MB')).toBe(5);
    expect(fromBytes(10485760, 'MB')).toBe(10);
  });

  it('converts bytes to gigabytes', () => {
    expect(fromBytes(1073741824, 'GB')).toBe(1);
    expect(fromBytes(2147483648, 'GB')).toBe(2);
  });

  it('handles fractional results', () => {
    expect(fromBytes(1536, 'KB')).toBe(1.5);
    expect(fromBytes(2621440, 'MB')).toBe(2.5);
    expect(fromBytes(536870912, 'GB')).toBe(0.5);
  });

  it('throws error for invalid unit', () => {
    expect(() => fromBytes(5000, 'TB')).toThrow('Invalid unit: TB');
    expect(() => fromBytes(5000, 'invalid')).toThrow('Invalid unit: invalid');
    expect(() => fromBytes(5000, '')).toThrow('Invalid unit: ');
  });
});

describe('formatBytes', () => {
  it('formats bytes correctly', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(500)).toBe('500 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('formats kilobytes correctly', () => {
    expect(formatBytes(1024)).toBe('1.00 KB');
    expect(formatBytes(1536)).toBe('1.50 KB');
    expect(formatBytes(102400)).toBe('100.00 KB');
  });

  it('formats megabytes correctly', () => {
    expect(formatBytes(1048576)).toBe('1.00 MB');
    expect(formatBytes(5242880)).toBe('5.00 MB');
    expect(formatBytes(10485760)).toBe('10.00 MB');
  });

  it('formats gigabytes correctly', () => {
    expect(formatBytes(1073741824)).toBe('1.00 GB');
    expect(formatBytes(2147483648)).toBe('2.00 GB');
    expect(formatBytes(5368709120)).toBe('5.00 GB');
  });

  it('formats fractional values with 2 decimal places', () => {
    expect(formatBytes(1536)).toBe('1.50 KB');
    expect(formatBytes(2621440)).toBe('2.50 MB');
    expect(formatBytes(1610612736)).toBe('1.50 GB');
  });

  it('uses the largest appropriate unit', () => {
    expect(formatBytes(1073741824 + 536870912)).toBe('1.50 GB'); // 1.5 GB
    expect(formatBytes(1048576 + 524288)).toBe('1.50 MB'); // 1.5 MB
    expect(formatBytes(1024 + 512)).toBe('1.50 KB'); // 1.5 KB
  });

  it('handles edge cases at unit boundaries', () => {
    expect(formatBytes(1023)).toBe('1023 B');
    expect(formatBytes(1024)).toBe('1.00 KB');
    expect(formatBytes(1048575)).toBe('1024.00 KB');
    expect(formatBytes(1048576)).toBe('1.00 MB');
    expect(formatBytes(1073741823)).toBe('1024.00 MB');
    expect(formatBytes(1073741824)).toBe('1.00 GB');
  });
});

describe('selectDefaultUnit', () => {
  it('selects B for values less than 1 KB', () => {
    expect(selectDefaultUnit(0)).toBe('B');
    expect(selectDefaultUnit(500)).toBe('B');
    expect(selectDefaultUnit(1023)).toBe('B');
  });

  it('selects KB for values between 1 KB and 1 MB', () => {
    expect(selectDefaultUnit(1024)).toBe('KB');
    expect(selectDefaultUnit(1536)).toBe('KB');
    expect(selectDefaultUnit(102400)).toBe('KB');
    expect(selectDefaultUnit(1048575)).toBe('KB');
  });

  it('selects MB for values between 1 MB and 1 GB', () => {
    expect(selectDefaultUnit(1048576)).toBe('MB');
    expect(selectDefaultUnit(5242880)).toBe('MB');
    expect(selectDefaultUnit(10485760)).toBe('MB');
    expect(selectDefaultUnit(1073741823)).toBe('MB');
  });

  it('selects GB for values 1 GB and above', () => {
    expect(selectDefaultUnit(1073741824)).toBe('GB');
    expect(selectDefaultUnit(2147483648)).toBe('GB');
    expect(selectDefaultUnit(5368709120)).toBe('GB');
  });

  it('handles edge cases at unit boundaries', () => {
    expect(selectDefaultUnit(1023)).toBe('B');
    expect(selectDefaultUnit(1024)).toBe('KB');
    expect(selectDefaultUnit(1048575)).toBe('KB');
    expect(selectDefaultUnit(1048576)).toBe('MB');
    expect(selectDefaultUnit(1073741823)).toBe('MB');
    expect(selectDefaultUnit(1073741824)).toBe('GB');
  });
});

describe('round-trip conversions', () => {
  it('converts to bytes and back to original unit', () => {
    expect(fromBytes(toBytes(5, 'MB'), 'MB')).toBe(5);
    expect(fromBytes(toBytes(100, 'KB'), 'KB')).toBe(100);
    expect(fromBytes(toBytes(2, 'GB'), 'GB')).toBe(2);
    expect(fromBytes(toBytes(500, 'B'), 'B')).toBe(500);
  });

  it('handles fractional round-trip conversions', () => {
    expect(fromBytes(toBytes(1.5, 'MB'), 'MB')).toBe(1.5);
    expect(fromBytes(toBytes(2.5, 'KB'), 'KB')).toBe(2.5);
    expect(fromBytes(toBytes(0.5, 'GB'), 'GB')).toBe(0.5);
  });
});

describe('integration scenarios', () => {
  it('handles common file size limits', () => {
    // 5MB limit
    const fiveMB = toBytes(5, 'MB');
    expect(fiveMB).toBe(5242880);
    expect(formatBytes(fiveMB)).toBe('5.00 MB');
    expect(selectDefaultUnit(fiveMB)).toBe('MB');

    // 10MB limit
    const tenMB = toBytes(10, 'MB');
    expect(tenMB).toBe(10485760);
    expect(formatBytes(tenMB)).toBe('10.00 MB');
    expect(selectDefaultUnit(tenMB)).toBe('MB');

    // 100MB limit
    const hundredMB = toBytes(100, 'MB');
    expect(hundredMB).toBe(104857600);
    expect(formatBytes(hundredMB)).toBe('100.00 MB');
    expect(selectDefaultUnit(hundredMB)).toBe('MB');

    // 1GB limit
    const oneGB = toBytes(1, 'GB');
    expect(oneGB).toBe(1073741824);
    expect(formatBytes(oneGB)).toBe('1.00 GB');
    expect(selectDefaultUnit(oneGB)).toBe('GB');
  });

  it('handles user input workflow', () => {
    // User enters "5" with unit "MB"
    const userValue = 5;
    const userUnit = 'MB';
    const bytes = toBytes(userValue, userUnit);
    
    // Store as bytes
    expect(bytes).toBe(5242880);
    
    // Display back to user
    expect(formatBytes(bytes)).toBe('5.00 MB');
    expect(fromBytes(bytes, userUnit)).toBe(5);
  });

  it('handles unit switching workflow', () => {
    // User has 5MB, switches to KB
    const originalBytes = toBytes(5, 'MB');
    const inKB = fromBytes(originalBytes, 'KB');
    expect(inKB).toBe(5120);
    
    // User has 1GB, switches to MB
    const gbBytes = toBytes(1, 'GB');
    const inMB = fromBytes(gbBytes, 'MB');
    expect(inMB).toBe(1024);
  });
});
