import { describe, it, expect } from 'vitest';
import { DetailStreamHighlight } from '../detail-stream-highlight.js';

describe('DetailStreamHighlight', () => {
  it('uses chart xAxis when provided', () => {
    const latest = DetailStreamHighlight.pick(
      [
        { recorded_at: '2026-05-26T10:00:00Z', value: 1 },
        { recorded_at: '2026-05-26T11:00:00Z', value: 2 }
      ],
      undefined,
      'recorded_at'
    );

    expect(latest?.value).toBe(2);
  });
});
