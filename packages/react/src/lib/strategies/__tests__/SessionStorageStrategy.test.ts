import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { SessionStorageStrategy } from '../SessionStorageStrategy';

// Ensure sessionStorage is available in test environment
beforeAll(() => {
  if (typeof sessionStorage === 'undefined') {
    const sessionStorageMock = (() => {
      let store: Record<string, string> = {};

      return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
          store[key] = value;
        },
        removeItem: (key: string) => {
          delete store[key];
        },
        clear: () => {
          store = {};
        },
        get length() {
          return Object.keys(store).length;
        },
        key: (index: number) => {
          const keys = Object.keys(store);
          return keys[index] || null;
        },
      };
    })();

    Object.defineProperty(globalThis, 'sessionStorage', {
      value: sessionStorageMock,
      writable: true,
    });
  }
});

describe('SessionStorageStrategy', () => {
  let strategy: SessionStorageStrategy;

  beforeEach(() => {
    strategy = new SessionStorageStrategy();
    sessionStorage.clear();
  });

  describe('save', () => {
    it('should store string values in sessionStorage - Requirement 2.2', () => {
      strategy.save('test-key', 'test-value');
      expect(sessionStorage.getItem('test-key')).toBe('"test-value"');
    });

    it('should serialize objects with JSON - Requirement 2.6', () => {
      const obj = { name: 'test', value: 123 };
      strategy.save('test-obj', obj);
      const stored = sessionStorage.getItem('test-obj');
      expect(stored).toBe(JSON.stringify(obj));
    });

    it('should serialize arrays with JSON - Requirement 1.4', () => {
      const arr = [1, 2, 3];
      strategy.save('test-arr', arr);
      const stored = sessionStorage.getItem('test-arr');
      expect(stored).toBe(JSON.stringify(arr));
    });

    it('should handle null values', () => {
      strategy.save('test-null', null);
      expect(sessionStorage.getItem('test-null')).toBe('null');
    });

    it('should log errors and continue on storage failure - Requirement 2.5', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const setItemSpy = vi.spyOn(sessionStorage, 'setItem').mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      strategy.save('test-key', 'value');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('SessionStorage save failed'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
      setItemSpy.mockRestore();
    });
  });

  describe('load', () => {
    it('should retrieve and deserialize values from sessionStorage - Requirement 2.3', () => {
      sessionStorage.setItem('test-key', '"test-value"');
      const result = strategy.load('test-key');
      expect(result).toBe('test-value');
    });

    it('should deserialize objects - Requirement 1.5', () => {
      const obj = { name: 'test', value: 123 };
      sessionStorage.setItem('test-obj', JSON.stringify(obj));
      const result = strategy.load('test-obj');
      expect(result).toEqual(obj);
    });

    it('should deserialize arrays - Requirement 1.5', () => {
      const arr = [1, 2, 3];
      sessionStorage.setItem('test-arr', JSON.stringify(arr));
      const result = strategy.load('test-arr');
      expect(result).toEqual(arr);
    });

    it('should return null for missing keys - Requirement 1.2', () => {
      const result = strategy.load('non-existent-key');
      expect(result).toBeNull();
    });

    it('should return null and log error for invalid JSON - Requirement 2.5', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      sessionStorage.setItem('invalid-json', '{invalid json}');

      const result = strategy.load('invalid-json');

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('SessionStorage load failed'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle storage access errors gracefully - Requirement 2.5', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const getItemSpy = vi.spyOn(sessionStorage, 'getItem').mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      const result = strategy.load('test-key');

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('SessionStorage load failed'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
      getItemSpy.mockRestore();
    });
  });

  describe('remove', () => {
    it('should delete values from sessionStorage - Requirement 2.4', () => {
      sessionStorage.setItem('test-key', '"test-value"');
      strategy.remove('test-key');
      expect(sessionStorage.getItem('test-key')).toBeNull();
    });

    it('should handle removing non-existent keys', () => {
      expect(() => strategy.remove('non-existent-key')).not.toThrow();
    });

    it('should log errors and continue on removal failure - Requirement 2.5', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const removeItemSpy = vi.spyOn(sessionStorage, 'removeItem').mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      strategy.remove('test-key');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('SessionStorage remove failed'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
      removeItemSpy.mockRestore();
    });
  });

  describe('IStorageStrategy interface compliance', () => {
    it('should implement save method - Requirement 1.1', () => {
      expect(typeof strategy.save).toBe('function');
    });

    it('should implement load method - Requirement 1.2', () => {
      expect(typeof strategy.load).toBe('function');
    });

    it('should implement remove method - Requirement 1.3', () => {
      expect(typeof strategy.remove).toBe('function');
    });
  });

  describe('round-trip serialization', () => {
    it('should preserve complex objects through save/load cycle', () => {
      const complex = {
        string: 'value',
        number: 42,
        boolean: true,
        null: null,
        array: [1, 2, 3],
        nested: { a: 1, b: 2 },
      };

      strategy.save('complex', complex);
      const result = strategy.load('complex');

      expect(result).toEqual(complex);
    });

    it('should preserve primitive types through save/load cycle', () => {
      const primitives = [
        ['string', 'hello'],
        ['number', 123],
        ['boolean', true],
        ['null', null],
      ];

      primitives.forEach(([key, value]) => {
        strategy.save(key as string, value);
        const result = strategy.load(key as string);
        expect(result).toEqual(value);
      });
    });
  });
});
