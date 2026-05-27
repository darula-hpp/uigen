import { describe, expect, it } from 'vitest';
import {
  CHART_DOT_HIDE_THRESHOLD,
  resolveChartAnimationActive,
  resolveChartDotVisible,
} from '../chart-display-props';

describe('chart-display-props', () => {
  it('disables animation by default and respects options.animate', () => {
    expect(resolveChartAnimationActive()).toBe(false);
    expect(resolveChartAnimationActive({ animate: true })).toBe(true);
    expect(resolveChartAnimationActive({ animate: false })).toBe(false);
  });

  it('hides dots for dense series unless options.showDots overrides', () => {
    expect(CHART_DOT_HIDE_THRESHOLD).toBe(24);
    expect(resolveChartDotVisible(10)).toBe(true);
    expect(resolveChartDotVisible(25)).toBe(false);
    expect(resolveChartDotVisible(25, { showDots: true })).toBe(true);
    expect(resolveChartDotVisible(10, { showDots: false })).toBe(false);
  });
});
