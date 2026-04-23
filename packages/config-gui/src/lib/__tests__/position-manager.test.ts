import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PositionManager } from '../position-manager.js';
import type { NodePosition } from '@uigen-dev/core';
import type { LayoutStrategy } from '../layout-strategy.js';
import type { PositionPersistenceAdapter } from '../position-persistence-adapter.js';

/**
 * Unit tests for PositionManager
 * 
 * Requirements: 5.2, 7.1, 7.3, 8.1, 8.2
 */

describe('PositionManager', () => {
  const WORLD_BOUNDS = { width: 8000, height: 8000 };

  // Mock adapter
  let mockAdapter: PositionPersistenceAdapter;
  let mockStrategy: LayoutStrategy;
  let savedPositions: Record<string, NodePosition>;

  beforeEach(() => {
    // Reset saved positions
    savedPositions = {};

    // Create mock adapter
    mockAdapter = {
      load: vi.fn(async () => savedPositions),
      save: vi.fn(async (positions: Record<string, NodePosition>) => {
        savedPositions = { ...positions };
      })
    };

    // Create mock strategy
    mockStrategy = {
      calculatePosition: vi.fn((
        slug: string,
        existingPositions: Record<string, NodePosition>,
        cardDimensions: { width: number; height: number }
      ) => {
        // Simple mock: place cards in a horizontal line
        const count = Object.keys(existingPositions).length;
        return { x: 48 + count * 216, y: 48 };
      })
    };
  });

  const createManager = () => new PositionManager(mockAdapter, mockStrategy, WORLD_BOUNDS);

  describe('getPosition()', () => {
    it('should return saved position when available', async () => {
      const manager = createManager();
      savedPositions = {
        users: { x: 100, y: 200 }
      };

      const position = await manager.getPosition('users', ['users']);

      expect(position).toEqual({ x: 100, y: 200 });
      expect(mockAdapter.load).toHaveBeenCalledTimes(1);
      expect(mockStrategy.calculatePosition).not.toHaveBeenCalled();
    });

    it('should calculate default when position missing', async () => {
      const manager = createManager();
      savedPositions = {
        users: { x: 48, y: 48 }
      };

      const position = await manager.getPosition('orders', ['users', 'orders']);

      expect(position).toEqual({ x: 264, y: 48 }); // Mock strategy places at x: 48 + 1 * 216
      expect(mockAdapter.load).toHaveBeenCalledTimes(1);
      expect(mockStrategy.calculatePosition).toHaveBeenCalledWith(
        'orders',
        savedPositions,
        { width: 160, height: 80 }
      );
    });

    it('should validate saved position before returning', async () => {
      const manager = createManager();
      savedPositions = {
        users: { x: -100, y: 9000 } // Out of bounds
      };

      const position = await manager.getPosition('users', ['users']);

      // Should be clamped to valid bounds
      expect(position).toEqual({ x: 0, y: 8000 });
    });

    it('should handle empty saved positions', async () => {
      const manager = createManager();
      savedPositions = {};

      const position = await manager.getPosition('users', ['users']);

      expect(position).toEqual({ x: 48, y: 48 }); // Mock strategy places at x: 48 + 0 * 216
      expect(mockStrategy.calculatePosition).toHaveBeenCalled();
    });

    it('should handle non-numeric saved coordinates', async () => {
      const manager = createManager();
      savedPositions = {
        users: { x: NaN, y: Infinity } as NodePosition
      };

      const position = await manager.getPosition('users', ['users']);

      // NaN replaced with 0, Infinity clamped to world bounds
      expect(position).toEqual({ x: 0, y: 8000 });
    });
  });

  describe('setPosition()', () => {
    it('should validate and save position', async () => {
      const manager = createManager();
      savedPositions = {};

      await manager.setPosition('users', { x: 100, y: 200 });

      expect(mockAdapter.save).toHaveBeenCalledWith({
        users: { x: 100, y: 200 }
      });
    });

    it('should clamp out-of-bounds x coordinate', async () => {
      const manager = createManager();
      savedPositions = {};

      await manager.setPosition('users', { x: 9000, y: 200 });

      expect(mockAdapter.save).toHaveBeenCalledWith({
        users: { x: 8000, y: 200 } // Clamped to world bounds
      });
    });

    it('should clamp out-of-bounds y coordinate', async () => {
      const manager = createManager();
      savedPositions = {};

      await manager.setPosition('users', { x: 100, y: -500 });

      expect(mockAdapter.save).toHaveBeenCalledWith({
        users: { x: 100, y: 0 } // Clamped to world bounds
      });
    });

    it('should clamp both coordinates when out of bounds', async () => {
      const manager = createManager();
      savedPositions = {};

      await manager.setPosition('users', { x: -100, y: 10000 });

      expect(mockAdapter.save).toHaveBeenCalledWith({
        users: { x: 0, y: 8000 } // Both clamped
      });
    });

    it('should handle non-numeric x coordinate', async () => {
      const manager = createManager();
      savedPositions = {};

      await manager.setPosition('users', { x: NaN, y: 200 });

      expect(mockAdapter.save).toHaveBeenCalledWith({
        users: { x: 0, y: 200 } // NaN replaced with 0
      });
    });

    it('should handle non-numeric y coordinate', async () => {
      const manager = createManager();
      savedPositions = {};

      await manager.setPosition('users', { x: 100, y: Infinity });

      expect(mockAdapter.save).toHaveBeenCalledWith({
        users: { x: 100, y: 8000 } // Infinity clamped to max
      });
    });

    it('should handle both coordinates as non-numeric', async () => {
      const manager = createManager();
      savedPositions = {};

      await manager.setPosition('users', { x: NaN, y: NaN });

      expect(mockAdapter.save).toHaveBeenCalledWith({
        users: { x: 0, y: 0 } // Both replaced with 0
      });
    });

    it('should preserve existing positions when adding new one', async () => {
      const manager = createManager();
      savedPositions = {
        users: { x: 48, y: 48 },
        orders: { x: 264, y: 48 }
      };

      await manager.setPosition('products', { x: 480, y: 48 });

      expect(mockAdapter.save).toHaveBeenCalledWith({
        users: { x: 48, y: 48 },
        orders: { x: 264, y: 48 },
        products: { x: 480, y: 48 }
      });
    });

    it('should update existing position', async () => {
      const manager = createManager();
      savedPositions = {
        users: { x: 48, y: 48 },
        orders: { x: 264, y: 48 }
      };

      await manager.setPosition('users', { x: 100, y: 200 });

      expect(mockAdapter.save).toHaveBeenCalledWith({
        users: { x: 100, y: 200 },
        orders: { x: 264, y: 48 }
      });
    });
  });

  describe('getAllPositions()', () => {
    it('should return all saved positions', async () => {
      const manager = createManager();
      savedPositions = {
        users: { x: 48, y: 48 },
        orders: { x: 264, y: 48 },
        products: { x: 480, y: 48 }
      };

      const positions = await manager.getAllPositions();

      expect(positions).toEqual(savedPositions);
      expect(mockAdapter.load).toHaveBeenCalledTimes(1);
    });

    it('should return empty object when no positions saved', async () => {
      const manager = createManager();
      savedPositions = {};

      const positions = await manager.getAllPositions();

      expect(positions).toEqual({});
    });
  });

  describe('calculateDefaultPosition()', () => {
    it('should delegate to layout strategy', () => {
      const manager = createManager();
      const existingPositions = {
        users: { x: 48, y: 48 }
      };

      const position = manager.calculateDefaultPosition('orders', existingPositions);

      expect(mockStrategy.calculatePosition).toHaveBeenCalledWith(
        'orders',
        existingPositions,
        { width: 160, height: 80 }
      );
      expect(position).toEqual({ x: 264, y: 48 });
    });

    it('should work with empty existing positions', () => {
      const manager = createManager();

      const position = manager.calculateDefaultPosition('users', {});

      expect(mockStrategy.calculatePosition).toHaveBeenCalledWith(
        'users',
        {},
        { width: 160, height: 80 }
      );
      expect(position).toEqual({ x: 48, y: 48 });
    });

    it('should use standard card dimensions', () => {
      const manager = createManager();
      const existingPositions = { users: { x: 48, y: 48 } };

      manager.calculateDefaultPosition('orders', existingPositions);

      expect(mockStrategy.calculatePosition).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        { width: 160, height: 80 }
      );
    });
  });

  describe('validatePosition()', () => {
    it('should return valid position unchanged', () => {
      const manager = createManager();
      const position = { x: 100, y: 200 };

      const validated = manager.validatePosition(position);

      expect(validated).toEqual({ x: 100, y: 200 });
    });

    it('should clamp negative x to 0', () => {
      const manager = createManager();
      const position = { x: -100, y: 200 };

      const validated = manager.validatePosition(position);

      expect(validated).toEqual({ x: 0, y: 200 });
    });

    it('should clamp negative y to 0', () => {
      const manager = createManager();
      const position = { x: 100, y: -50 };

      const validated = manager.validatePosition(position);

      expect(validated).toEqual({ x: 100, y: 0 });
    });

    it('should clamp x exceeding world width', () => {
      const manager = createManager();
      const position = { x: 9000, y: 200 };

      const validated = manager.validatePosition(position);

      expect(validated).toEqual({ x: 8000, y: 200 });
    });

    it('should clamp y exceeding world height', () => {
      const manager = createManager();
      const position = { x: 100, y: 10000 };

      const validated = manager.validatePosition(position);

      expect(validated).toEqual({ x: 100, y: 8000 });
    });

    it('should clamp both coordinates when out of bounds', () => {
      const manager = createManager();
      const position = { x: -100, y: 9000 };

      const validated = manager.validatePosition(position);

      expect(validated).toEqual({ x: 0, y: 8000 });
    });

    it('should handle NaN x coordinate', () => {
      const manager = createManager();
      const position = { x: NaN, y: 200 };

      const validated = manager.validatePosition(position);

      expect(validated).toEqual({ x: 0, y: 200 });
    });

    it('should handle NaN y coordinate', () => {
      const manager = createManager();
      const position = { x: 100, y: NaN };

      const validated = manager.validatePosition(position);

      expect(validated).toEqual({ x: 100, y: 0 });
    });

    it('should handle Infinity x coordinate', () => {
      const manager = createManager();
      const position = { x: Infinity, y: 200 };

      const validated = manager.validatePosition(position);

      expect(validated).toEqual({ x: 8000, y: 200 });
    });

    it('should handle -Infinity y coordinate', () => {
      const manager = createManager();
      const position = { x: 100, y: -Infinity };

      const validated = manager.validatePosition(position);

      expect(validated).toEqual({ x: 100, y: 0 });
    });

    it('should handle both coordinates as NaN', () => {
      const manager = createManager();
      const position = { x: NaN, y: NaN };

      const validated = manager.validatePosition(position);

      expect(validated).toEqual({ x: 0, y: 0 });
    });

    it('should accept position at exact world bounds', () => {
      const manager = createManager();
      const position = { x: 8000, y: 8000 };

      const validated = manager.validatePosition(position);

      expect(validated).toEqual({ x: 8000, y: 8000 });
    });

    it('should accept position at origin', () => {
      const manager = createManager();
      const position = { x: 0, y: 0 };

      const validated = manager.validatePosition(position);

      expect(validated).toEqual({ x: 0, y: 0 });
    });

    it('should handle string coordinates by treating as NaN', () => {
      const manager = createManager();
      const position = { x: '100' as any, y: '200' as any };

      const validated = manager.validatePosition(position);

      // Strings are not numbers, should be treated as invalid
      expect(validated).toEqual({ x: 0, y: 0 });
    });
  });

  describe('cleanupOrphanedPositions()', () => {
    it('should remove positions for deleted resources', async () => {
      const manager = createManager();
      savedPositions = {
        users: { x: 48, y: 48 },
        orders: { x: 264, y: 48 },
        products: { x: 480, y: 48 },
        deleted: { x: 696, y: 48 }
      };

      await manager.cleanupOrphanedPositions(['users', 'orders', 'products']);

      expect(mockAdapter.save).toHaveBeenCalledWith({
        users: { x: 48, y: 48 },
        orders: { x: 264, y: 48 },
        products: { x: 480, y: 48 }
      });
    });

    it('should preserve all positions when no orphans', async () => {
      const manager = createManager();
      savedPositions = {
        users: { x: 48, y: 48 },
        orders: { x: 264, y: 48 }
      };

      await manager.cleanupOrphanedPositions(['users', 'orders']);

      // Should not call save when no orphans found
      expect(mockAdapter.save).not.toHaveBeenCalled();
    });

    it('should handle empty current slugs list', async () => {
      const manager = createManager();
      savedPositions = {
        users: { x: 48, y: 48 },
        orders: { x: 264, y: 48 }
      };

      await manager.cleanupOrphanedPositions([]);

      // All positions should be removed
      expect(mockAdapter.save).toHaveBeenCalledWith({});
    });

    it('should handle empty saved positions', async () => {
      const manager = createManager();
      savedPositions = {};

      await manager.cleanupOrphanedPositions(['users', 'orders']);

      // Should not call save when no positions exist
      expect(mockAdapter.save).not.toHaveBeenCalled();
    });

    it('should remove multiple orphaned positions', async () => {
      const manager = createManager();
      savedPositions = {
        users: { x: 48, y: 48 },
        deleted1: { x: 264, y: 48 },
        deleted2: { x: 480, y: 48 },
        orders: { x: 696, y: 48 },
        deleted3: { x: 48, y: 184 }
      };

      await manager.cleanupOrphanedPositions(['users', 'orders']);

      expect(mockAdapter.save).toHaveBeenCalledWith({
        users: { x: 48, y: 48 },
        orders: { x: 696, y: 48 }
      });
    });

    it('should handle case where all positions are orphaned', async () => {
      const manager = createManager();
      savedPositions = {
        deleted1: { x: 48, y: 48 },
        deleted2: { x: 264, y: 48 }
      };

      await manager.cleanupOrphanedPositions(['users', 'orders']);

      expect(mockAdapter.save).toHaveBeenCalledWith({});
    });

    it('should be case-sensitive when matching slugs', async () => {
      const manager = createManager();
      savedPositions = {
        Users: { x: 48, y: 48 },
        users: { x: 264, y: 48 }
      };

      await manager.cleanupOrphanedPositions(['users']);

      // Should only keep exact match
      expect(mockAdapter.save).toHaveBeenCalledWith({
        users: { x: 264, y: 48 }
      });
    });
  });

  describe('initializePositions()', () => {
    it('should load saved positions and calculate defaults for new resources', async () => {
      const manager = createManager();
      savedPositions = {
        users: { x: 48, y: 48 },
        orders: { x: 264, y: 48 }
      };

      const positions = await manager.initializePositions(['users', 'orders', 'products']);

      expect(positions.size).toBe(3);
      expect(positions.get('users')).toEqual({ x: 48, y: 48 });
      expect(positions.get('orders')).toEqual({ x: 264, y: 48 });
      expect(positions.get('products')).toEqual({ x: 480, y: 48 }); // Calculated by mock strategy
    });

    it('should validate saved positions', async () => {
      const manager = createManager();
      savedPositions = {
        users: { x: -100, y: 9000 }, // Out of bounds
        orders: { x: 264, y: 48 }
      };

      const positions = await manager.initializePositions(['users', 'orders']);

      expect(positions.get('users')).toEqual({ x: 0, y: 8000 }); // Clamped
      expect(positions.get('orders')).toEqual({ x: 264, y: 48 });
    });

    it('should handle all new resources', async () => {
      const manager = createManager();
      savedPositions = {};

      const positions = await manager.initializePositions(['users', 'orders', 'products']);

      expect(positions.size).toBe(3);
      expect(mockStrategy.calculatePosition).toHaveBeenCalledTimes(3);
    });

    it('should handle all saved resources', async () => {
      const manager = createManager();
      savedPositions = {
        users: { x: 48, y: 48 },
        orders: { x: 264, y: 48 },
        products: { x: 480, y: 48 }
      };

      const positions = await manager.initializePositions(['users', 'orders', 'products']);

      expect(positions.size).toBe(3);
      expect(mockStrategy.calculatePosition).not.toHaveBeenCalled();
    });

    it('should handle empty slugs list', async () => {
      const manager = createManager();
      savedPositions = {
        users: { x: 48, y: 48 }
      };

      const positions = await manager.initializePositions([]);

      expect(positions.size).toBe(0);
    });

    it('should maintain order of slugs in result', async () => {
      const manager = createManager();
      savedPositions = {};

      const slugs = ['products', 'users', 'orders'];
      const positions = await manager.initializePositions(slugs);

      const keys = Array.from(positions.keys());
      expect(keys).toEqual(slugs);
    });

    it('should pass existing positions to strategy for each new resource', async () => {
      const manager = createManager();
      savedPositions = {
        users: { x: 48, y: 48 }
      };

      await manager.initializePositions(['users', 'orders', 'products']);

      // Verify strategy was called twice (for 'orders' and 'products')
      expect(mockStrategy.calculatePosition).toHaveBeenCalledTimes(2);
      
      // First call should include saved 'users' position
      const firstCall = (mockStrategy.calculatePosition as any).mock.calls[0];
      expect(firstCall[0]).toBe('orders');
      expect(firstCall[1]).toHaveProperty('users');
      expect(firstCall[1].users).toEqual({ x: 48, y: 48 });
      
      // Second call should include saved 'users' and calculated 'orders'
      const secondCall = (mockStrategy.calculatePosition as any).mock.calls[1];
      expect(secondCall[0]).toBe('products');
      expect(secondCall[1]).toHaveProperty('users');
      expect(secondCall[1]).toHaveProperty('orders');
    });

    it('should handle mixed saved and new resources in any order', async () => {
      const manager = createManager();
      savedPositions = {
        orders: { x: 264, y: 48 },
        categories: { x: 696, y: 48 }
      };

      const positions = await manager.initializePositions([
        'users',      // new
        'orders',     // saved
        'products',   // new
        'categories'  // saved
      ]);

      expect(positions.size).toBe(4);
      expect(positions.get('orders')).toEqual({ x: 264, y: 48 });
      expect(positions.get('categories')).toEqual({ x: 696, y: 48 });
      expect(positions.get('users')).toBeDefined();
      expect(positions.get('products')).toBeDefined();
    });

    it('should handle non-numeric saved coordinates', async () => {
      const manager = createManager();
      savedPositions = {
        users: { x: NaN, y: Infinity } as NodePosition
      };

      const positions = await manager.initializePositions(['users']);

      expect(positions.get('users')).toEqual({ x: 0, y: 8000 }); // Validated
    });
  });

  describe('edge cases', () => {
    it('should handle adapter load failure gracefully', async () => {
      const manager = createManager();
      mockAdapter.load = vi.fn(async () => {
        throw new Error('Load failed');
      });

      await expect(manager.getAllPositions()).rejects.toThrow('Load failed');
    });

    it('should handle adapter save failure gracefully', async () => {
      const manager = createManager();
      mockAdapter.save = vi.fn(async () => {
        throw new Error('Save failed');
      });

      await expect(manager.setPosition('users', { x: 100, y: 200 })).rejects.toThrow('Save failed');
    });

    it('should handle strategy returning out-of-bounds position', async () => {
      const manager = createManager();
      mockStrategy.calculatePosition = vi.fn(() => ({ x: 9000, y: 10000 }));
      savedPositions = {};

      const position = await manager.getPosition('users', ['users']);

      // Strategy result is not validated by getPosition, only saved positions are
      expect(position).toEqual({ x: 9000, y: 10000 });
    });

    it('should handle duplicate slugs in initializePositions', async () => {
      const manager = createManager();
      savedPositions = {
        users: { x: 48, y: 48 }
      };

      const positions = await manager.initializePositions(['users', 'users', 'orders']);

      // Should handle duplicates gracefully (Map will deduplicate)
      expect(positions.size).toBe(2);
      expect(positions.get('users')).toEqual({ x: 48, y: 48 });
    });

    it('should handle very large number of positions', async () => {
      const manager = createManager();
      const largeSavedPositions: Record<string, NodePosition> = {};
      const slugs: string[] = [];

      for (let i = 0; i < 100; i++) {
        const slug = `resource${i}`;
        slugs.push(slug);
        largeSavedPositions[slug] = { x: i * 10, y: i * 10 };
      }

      savedPositions = largeSavedPositions;

      const positions = await manager.initializePositions(slugs);

      expect(positions.size).toBe(100);
    });

    it('should handle position at exact boundary values', async () => {
      const manager = createManager();

      const validated1 = manager.validatePosition({ x: 0, y: 0 });
      expect(validated1).toEqual({ x: 0, y: 0 });

      const validated2 = manager.validatePosition({ x: 8000, y: 8000 });
      expect(validated2).toEqual({ x: 8000, y: 8000 });

      const validated3 = manager.validatePosition({ x: 0, y: 8000 });
      expect(validated3).toEqual({ x: 0, y: 8000 });

      const validated4 = manager.validatePosition({ x: 8000, y: 0 });
      expect(validated4).toEqual({ x: 8000, y: 0 });
    });
  });

  describe('resetToDefault()', () => {
    it('should clear all saved positions and return default grid layout', async () => {
      const manager = createManager();
      savedPositions = {
        users: { x: 100, y: 200 },
        orders: { x: 300, y: 400 },
        products: { x: 500, y: 600 }
      };

      const positions = await manager.resetToDefault(['users', 'orders', 'products']);

      // Should have cleared saved positions
      expect(mockAdapter.save).toHaveBeenCalledWith({});

      // Should return default positions calculated by strategy
      expect(positions.size).toBe(3);
      expect(positions.get('users')).toEqual({ x: 48, y: 48 });
      expect(positions.get('orders')).toEqual({ x: 264, y: 48 });
      expect(positions.get('products')).toEqual({ x: 480, y: 48 });
    });

    it('should calculate positions for all resources in order', async () => {
      // Create a fresh mock strategy for this test
      const callHistory: Array<{ slug: string; existingCount: number }> = [];
      const freshMockStrategy: LayoutStrategy = {
        calculatePosition: vi.fn((
          slug: string,
          existingPositions: Record<string, NodePosition>,
          cardDimensions: { width: number; height: number }
        ) => {
          // Capture the state at call time
          callHistory.push({ slug, existingCount: Object.keys(existingPositions).length });
          // Simple mock: place cards in a horizontal line
          const count = Object.keys(existingPositions).length;
          return { x: 48 + count * 216, y: 48 };
        })
      };
      
      savedPositions = {};  // Start with no saved positions
      const manager = new PositionManager(mockAdapter, freshMockStrategy, WORLD_BOUNDS);

      const positions = await manager.resetToDefault(['users', 'orders', 'products']);

      // Should call strategy for each resource
      expect(freshMockStrategy.calculatePosition).toHaveBeenCalledTimes(3);
      
      // Verify order and incremental position building using captured history
      expect(callHistory[0]).toEqual({ slug: 'users', existingCount: 0 });
      expect(callHistory[1]).toEqual({ slug: 'orders', existingCount: 1 });
      expect(callHistory[2]).toEqual({ slug: 'products', existingCount: 2 });
    });

    it('should handle empty slugs list', async () => {
      const manager = createManager();
      savedPositions = {
        users: { x: 100, y: 200 }
      };

      const positions = await manager.resetToDefault([]);

      // Should clear saved positions
      expect(mockAdapter.save).toHaveBeenCalledWith({});
      
      // Should return empty map
      expect(positions.size).toBe(0);
    });

    it('should handle single resource', async () => {
      const manager = createManager();
      savedPositions = {
        users: { x: 100, y: 200 }
      };

      const positions = await manager.resetToDefault(['users']);

      expect(mockAdapter.save).toHaveBeenCalledWith({});
      expect(positions.size).toBe(1);
      expect(positions.get('users')).toEqual({ x: 48, y: 48 });
    });

    it('should work when no positions were previously saved', async () => {
      const manager = createManager();
      savedPositions = {};

      const positions = await manager.resetToDefault(['users', 'orders']);

      expect(mockAdapter.save).toHaveBeenCalledWith({});
      expect(positions.size).toBe(2);
    });

    it('should handle adapter save failure', async () => {
      const manager = createManager();
      savedPositions = {
        users: { x: 100, y: 200 }
      };
      mockAdapter.save = vi.fn(async () => {
        throw new Error('Save failed');
      });

      await expect(manager.resetToDefault(['users', 'orders'])).rejects.toThrow('Save failed');
    });

    it('should return positions in same order as input slugs', async () => {
      const manager = createManager();
      savedPositions = {};

      const slugs = ['products', 'users', 'orders', 'categories'];
      const positions = await manager.resetToDefault(slugs);

      const keys = Array.from(positions.keys());
      expect(keys).toEqual(slugs);
    });

    it('should handle duplicate slugs', async () => {
      const manager = createManager();
      savedPositions = {};

      const positions = await manager.resetToDefault(['users', 'users', 'orders']);

      // Map will deduplicate
      expect(positions.size).toBe(2);
      expect(positions.has('users')).toBe(true);
      expect(positions.has('orders')).toBe(true);
    });

    it('should use standard card dimensions for layout calculation', async () => {
      const manager = createManager();
      savedPositions = {};

      await manager.resetToDefault(['users', 'orders']);

      // Verify strategy was called with correct card dimensions
      expect(mockStrategy.calculatePosition).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        { width: 160, height: 80 }
      );
    });
  });
});
