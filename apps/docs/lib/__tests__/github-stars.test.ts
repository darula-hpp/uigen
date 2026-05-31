import { describe, it, expect } from 'vitest';
import { formatStarCount } from '../github-stars';

describe('formatStarCount', () => {
  it('formats counts below 1k as plain numbers', () => {
    expect(formatStarCount(0)).toBe('0');
    expect(formatStarCount(42)).toBe('42');
    expect(formatStarCount(999)).toBe('999');
  });

  it('formats thousands with k suffix', () => {
    expect(formatStarCount(1_200)).toBe('1.2k');
    expect(formatStarCount(10_500)).toBe('11k');
  });

  it('formats millions with M suffix', () => {
    expect(formatStarCount(1_500_000)).toBe('1.5M');
    expect(formatStarCount(12_000_000)).toBe('12M');
  });
});
