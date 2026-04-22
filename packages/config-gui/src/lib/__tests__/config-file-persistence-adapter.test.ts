/**
 * Unit tests for ConfigFilePersistenceAdapter
 * 
 * Tests cover:
 * - Loading positions from config file
 * - Saving positions with debouncing
 * - Preserving other config fields
 * - Error handling
 * - Pan persistence
 * 
 * Requirements: 2.4, 6.1, 9.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConfigFilePersistenceAdapter } from '../config-file-persistence-adapter';
import type { ConfigFile, NodePosition } from '@uigen-dev/core';

describe('ConfigFilePersistenceAdapter', () => {
  let loadConfig: ReturnType<typeof vi.fn<[], Promise<ConfigFile>>>;
  let saveConfig: ReturnType<typeof vi.fn<[ConfigFile], Promise<void>>>;
  let adapter: ConfigFilePersistenceAdapter;

  const mockConfig: ConfigFile = {
    version: '1.0',
    enabled: { 'x-uigen-label': true },
    defaults: {},
    annotations: {},
    relationships: [
      { source: 'users', target: 'orders', path: '/users/{id}/orders' }
    ]
  };

  beforeEach(() => {
    loadConfig = vi.fn().mockResolvedValue(mockConfig);
    saveConfig = vi.fn().mockResolvedValue(undefined);
    adapter = new ConfigFilePersistenceAdapter(loadConfig, saveConfig, 50); // Short debounce for tests
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('load()', () => {
    it('should return empty object when canvasLayout is missing', async () => {
      const positions = await adapter.load();
      
      expect(positions).toEqual({});
      expect(loadConfig).toHaveBeenCalledTimes(1);
    });

    it('should return saved positions when canvasLayout exists', async () => {
      const configWithPositions: ConfigFile = {
        ...mockConfig,
        canvasLayout: {
          positions: {
            users: { x: 48, y: 48 },
            orders: { x: 264, y: 48 }
          }
        }
      };
      loadConfig.mockResolvedValue(configWithPositions);

      const positions = await adapter.load();

      expect(positions).toEqual({
        users: { x: 48, y: 48 },
        orders: { x: 264, y: 48 }
      });
    });

    it('should return empty object and log warning on load error', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      loadConfig.mockRejectedValue(new Error('File not found'));

      const positions = await adapter.load();

      expect(positions).toEqual({});
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to load canvas positions:',
        expect.any(Error)
      );
      
      consoleWarnSpy.mockRestore();
    });

    it('should handle corrupted config gracefully', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      loadConfig.mockRejectedValue(new Error('YAML parse error'));

      const positions = await adapter.load();

      expect(positions).toEqual({});
      expect(consoleWarnSpy).toHaveBeenCalled();
      
      consoleWarnSpy.mockRestore();
    });
  });

  describe('save()', () => {
    it('should debounce multiple rapid calls', async () => {
      const positions1: Record<string, NodePosition> = { users: { x: 48, y: 48 } };
      const positions2: Record<string, NodePosition> = { users: { x: 100, y: 100 } };
      const positions3: Record<string, NodePosition> = { users: { x: 200, y: 200 } };

      // Make three rapid calls
      await adapter.save(positions1);
      await adapter.save(positions2);
      await adapter.save(positions3);

      // Should not have saved yet (debounced)
      expect(saveConfig).not.toHaveBeenCalled();

      // Fast-forward time past debounce delay
      vi.advanceTimersByTime(50);

      // Wait for async operations
      await vi.runAllTimersAsync();

      // Should have saved only once with the last positions
      expect(saveConfig).toHaveBeenCalledTimes(1);
      expect(saveConfig).toHaveBeenCalledWith({
        ...mockConfig,
        canvasLayout: {
          positions: positions3
        }
      });
    });

    it('should preserve other config fields when saving positions', async () => {
      const positions: Record<string, NodePosition> = {
        users: { x: 48, y: 48 },
        orders: { x: 264, y: 48 }
      };

      await adapter.save(positions);
      vi.advanceTimersByTime(50);
      await vi.runAllTimersAsync();

      expect(saveConfig).toHaveBeenCalledWith({
        version: '1.0',
        enabled: { 'x-uigen-label': true },
        defaults: {},
        annotations: {},
        relationships: [
          { source: 'users', target: 'orders', path: '/users/{id}/orders' }
        ],
        canvasLayout: {
          positions
        }
      });
    });

    it('should preserve existing pan when saving positions', async () => {
      const configWithPan: ConfigFile = {
        ...mockConfig,
        canvasLayout: {
          positions: { users: { x: 48, y: 48 } },
          pan: { x: -100, y: -50 }
        }
      };
      loadConfig.mockResolvedValue(configWithPan);

      const newPositions: Record<string, NodePosition> = {
        users: { x: 100, y: 100 },
        orders: { x: 264, y: 48 }
      };

      await adapter.save(newPositions);
      vi.advanceTimersByTime(50);
      await vi.runAllTimersAsync();

      expect(saveConfig).toHaveBeenCalledWith({
        ...mockConfig,
        canvasLayout: {
          positions: newPositions,
          pan: { x: -100, y: -50 }
        }
      });
    });

    it('should log error on save failure', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const saveError = new Error('Write failed');
      saveConfig.mockRejectedValue(saveError);

      const positions: Record<string, NodePosition> = { users: { x: 48, y: 48 } };

      await adapter.save(positions);
      vi.advanceTimersByTime(50);

      // Wait for async operations (error is logged but not thrown from debounced wrapper)
      await vi.runAllTimersAsync();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to save canvas positions:',
        saveError
      );
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('savePan()', () => {
    it('should save pan offset to config', async () => {
      const pan = { x: -100, y: -50 };

      await adapter.savePan(pan);

      expect(saveConfig).toHaveBeenCalledWith({
        ...mockConfig,
        canvasLayout: {
          positions: {},
          pan
        }
      });
    });

    it('should preserve existing positions when saving pan', async () => {
      const configWithPositions: ConfigFile = {
        ...mockConfig,
        canvasLayout: {
          positions: {
            users: { x: 48, y: 48 },
            orders: { x: 264, y: 48 }
          }
        }
      };
      loadConfig.mockResolvedValue(configWithPositions);

      const pan = { x: -100, y: -50 };
      await adapter.savePan(pan);

      expect(saveConfig).toHaveBeenCalledWith({
        ...mockConfig,
        canvasLayout: {
          positions: {
            users: { x: 48, y: 48 },
            orders: { x: 264, y: 48 }
          },
          pan
        }
      });
    });

    it('should log error and throw on savePan failure', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const saveError = new Error('Write failed');
      saveConfig.mockRejectedValue(saveError);

      const pan = { x: -100, y: -50 };

      await expect(adapter.savePan(pan)).rejects.toThrow('Write failed');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to save canvas pan:',
        saveError
      );
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('loadPan()', () => {
    it('should return null when pan is not saved', async () => {
      const pan = await adapter.loadPan();

      expect(pan).toBeNull();
      expect(loadConfig).toHaveBeenCalledTimes(1);
    });

    it('should return saved pan offset when it exists', async () => {
      const configWithPan: ConfigFile = {
        ...mockConfig,
        canvasLayout: {
          positions: {},
          pan: { x: -100, y: -50 }
        }
      };
      loadConfig.mockResolvedValue(configWithPan);

      const pan = await adapter.loadPan();

      expect(pan).toEqual({ x: -100, y: -50 });
    });

    it('should return null and log warning on load error', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      loadConfig.mockRejectedValue(new Error('File not found'));

      const pan = await adapter.loadPan();

      expect(pan).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to load canvas pan:',
        expect.any(Error)
      );
      
      consoleWarnSpy.mockRestore();
    });
  });

  describe('debouncing behavior', () => {
    it('should batch multiple position updates within debounce window', async () => {
      const updates = [
        { users: { x: 10, y: 10 } },
        { users: { x: 20, y: 20 } },
        { users: { x: 30, y: 30 } },
        { users: { x: 40, y: 40 } }
      ];

      // Simulate rapid updates
      for (const update of updates) {
        await adapter.save(update);
        vi.advanceTimersByTime(10); // Advance less than debounce delay
      }

      // Should not have saved yet
      expect(saveConfig).not.toHaveBeenCalled();

      // Fast-forward past debounce delay
      vi.advanceTimersByTime(50);
      await vi.runAllTimersAsync();

      // Should have saved only once with the last update
      expect(saveConfig).toHaveBeenCalledTimes(1);
      expect(saveConfig).toHaveBeenCalledWith({
        ...mockConfig,
        canvasLayout: {
          positions: updates[updates.length - 1]
        }
      });
    });

    it('should allow multiple saves if separated by debounce delay', async () => {
      const positions1: Record<string, NodePosition> = { users: { x: 48, y: 48 } };
      const positions2: Record<string, NodePosition> = { orders: { x: 264, y: 48 } };

      // First save
      await adapter.save(positions1);
      vi.advanceTimersByTime(50);
      await vi.runAllTimersAsync();

      expect(saveConfig).toHaveBeenCalledTimes(1);

      // Second save after debounce delay
      await adapter.save(positions2);
      vi.advanceTimersByTime(50);
      await vi.runAllTimersAsync();

      expect(saveConfig).toHaveBeenCalledTimes(2);
    });
  });
});
