import { IStorageStrategy } from './IStorageStrategy';

/**
 * Session storage implementation using browser sessionStorage API
 * Requirement 2: Implement Session Storage Strategy
 */
export class SessionStorageStrategy implements IStorageStrategy {
  /**
   * Store value in sessionStorage with JSON serialization
   * Requirements 2.2, 2.6: Store in sessionStorage with JSON serialization
   * @param key - Storage key
   * @param value - Value to store
   */
  save(key: string, value: unknown): void {
    try {
      // Requirement 1.4: Serialize complex values to strings
      const serialized = JSON.stringify(value);
      // Requirement 2.2: Store in browser sessionStorage
      sessionStorage.setItem(key, serialized);
    } catch (error) {
      // Requirement 2.5: Log errors and continue (graceful degradation)
      console.error(`SessionStorage save failed for key "${key}":`, error);
    }
  }

  /**
   * Load value from sessionStorage with JSON deserialization
   * Requirements 2.3, 1.5: Retrieve from sessionStorage and deserialize
   * @param key - Storage key
   * @returns The stored value or null if not found or on error
   */
  load(key: string): unknown | null {
    try {
      // Requirement 2.3: Retrieve from browser sessionStorage
      const serialized = sessionStorage.getItem(key);
      if (serialized === null) {
        return null;
      }
      // Requirement 1.5: Deserialize strings back to original types
      return JSON.parse(serialized);
    } catch (error) {
      // Requirement 2.5: Log errors and return null for load operations
      console.error(`SessionStorage load failed for key "${key}":`, error);
      return null;
    }
  }

  /**
   * Remove value from sessionStorage
   * Requirement 2.4: Delete from sessionStorage
   * @param key - Storage key
   */
  remove(key: string): void {
    try {
      // Requirement 2.4: Delete value from browser sessionStorage
      sessionStorage.removeItem(key);
    } catch (error) {
      // Requirement 2.5: Log errors and continue
      console.error(`SessionStorage remove failed for key "${key}":`, error);
    }
  }
}
