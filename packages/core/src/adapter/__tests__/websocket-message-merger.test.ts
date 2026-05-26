import { describe, it, expect } from 'vitest';
import { WebSocketMessageMerger } from '../websocket-message-merger.js';

describe('WebSocketMessageMerger', () => {
  describe('merge replace', () => {
    it('replaces current data with incoming payload', () => {
      const result = WebSocketMessageMerger.merge(
        { uptime: 1 },
        { uptime: 2, pins: [] },
        { mode: 'replace' }
      );
      expect(result).toEqual({ uptime: 2, pins: [] });
    });
  });

  describe('merge append', () => {
    it('appends a single object to appendField array', () => {
      const result = WebSocketMessageMerger.merge(
        { readings: [{ id: 1 }] },
        { id: 2 },
        { mode: 'append', appendField: 'readings' }
      );
      expect(result).toEqual({ readings: [{ id: 1 }, { id: 2 }] });
    });

    it('appends an array of items', () => {
      const result = WebSocketMessageMerger.merge(
        { data: { readings: [{ id: 1 }] } },
        [{ id: 2 }, { id: 3 }],
        { mode: 'append', appendField: 'data.readings' }
      );
      expect(result).toEqual({ data: { readings: [{ id: 1 }, { id: 2 }, { id: 3 }] } });
    });

    it('returns current when incoming is empty', () => {
      const current = { readings: [{ id: 1 }] };
      const result = WebSocketMessageMerger.merge(current, null, {
        mode: 'append',
        appendField: 'readings'
      });
      expect(result).toBe(current);
    });
  });
});
