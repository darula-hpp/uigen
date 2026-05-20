const PRESET_DURATIONS_MS: Record<string, number> = {
  last_24h: 24 * 60 * 60 * 1000,
  last_7d: 7 * 24 * 60 * 60 * 1000,
  last_30d: 30 * 24 * 60 * 60 * 1000,
  last_90d: 90 * 24 * 60 * 60 * 1000,
};

const PRESET_LABELS: Record<string, string> = {
  last_24h: 'Last 24 hours',
  last_7d: 'Last 7 days',
  last_30d: 'Last 30 days',
  last_90d: 'Last 90 days',
};

export interface ChartDateTimeRange {
  start: string;
  end: string;
}

/**
 * Resolves datetime-range preset keys to ISO start/end timestamps.
 */
export class ChartDateTimePresets {
  static isPreset(value: string): boolean {
    return value in PRESET_DURATIONS_MS;
  }

  static resolve(value: string, now: Date = new Date()): ChartDateTimeRange {
    const duration = PRESET_DURATIONS_MS[value];
    if (duration == null) {
      return {
        start: value,
        end: now.toISOString(),
      };
    }

    return {
      start: new Date(now.getTime() - duration).toISOString(),
      end: now.toISOString(),
    };
  }

  static getLabel(preset: string): string {
    return PRESET_LABELS[preset] ?? preset.replace(/_/g, ' ');
  }

  static getPresetOptions(presets: string[]): Array<{ value: string; label: string }> {
    return presets.map((preset) => ({
      value: preset,
      label: ChartDateTimePresets.getLabel(preset),
    }));
  }
}
