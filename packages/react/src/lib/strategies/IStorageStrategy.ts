/**
 * Storage strategy interface for persisting authentication data
 * Requirement 1: Define Storage Strategy Interface
 */
export interface IStorageStrategy {
  /**
   * Save a value to storage
   * Requirement 1.1: Define save method
   * @param key - Storage key
   * @param value - Value to store (will be serialized)
   */
  save(key: string, value: unknown): void;

  /**
   * Load a value from storage
   * Requirement 1.2: Define load method
   * @param key - Storage key
   * @returns The stored value or null if key doesn't exist or operation fails
   */
  load(key: string): unknown | null;

  /**
   * Remove a value from storage
   * Requirement 1.3: Define remove method
   * @param key - Storage key
   */
  remove(key: string): void;
}
