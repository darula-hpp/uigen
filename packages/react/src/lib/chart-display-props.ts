/** Hide per-point dots above this count unless options.showDots overrides. */
export const CHART_DOT_HIDE_THRESHOLD = 24;

export function resolveChartAnimationActive(
  options?: Record<string, unknown>,
): boolean {
  if (options?.animate === true) {
    return true;
  }

  if (options?.animate === false) {
    return false;
  }

  return false;
}

export function resolveChartDotVisible(
  pointCount: number,
  options?: Record<string, unknown>,
): boolean {
  if (options?.showDots === true) {
    return true;
  }

  if (options?.showDots === false) {
    return false;
  }

  return pointCount <= CHART_DOT_HIDE_THRESHOLD;
}
