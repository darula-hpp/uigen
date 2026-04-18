/**
 * Debounce utility for batching rapid function calls
 * 
 * Creates a debounced version of a function that delays invoking the function
 * until after the specified delay has elapsed since the last time it was invoked.
 * 
 * Requirements: 23.3
 * 
 * @param func - The function to debounce
 * @param delay - The delay in milliseconds (default: 500ms)
 * @returns A debounced version of the function
 * 
 * Usage:
 * ```typescript
 * const debouncedSave = debounce((data) => saveToFile(data), 500);
 * debouncedSave(data1); // Scheduled
 * debouncedSave(data2); // Cancels previous, schedules new
 * debouncedSave(data3); // Cancels previous, schedules new
 * // Only data3 is saved after 500ms
 * ```
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number = 500
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function debounced(...args: Parameters<T>) {
    // Clear existing timeout
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    // Schedule new timeout
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Debounce utility with immediate execution option
 * 
 * Similar to debounce, but can execute the function immediately on the first call
 * and then debounce subsequent calls.
 * 
 * @param func - The function to debounce
 * @param delay - The delay in milliseconds
 * @param immediate - If true, execute immediately on first call
 * @returns A debounced version of the function
 */
export function debounceWithImmediate<T extends (...args: any[]) => any>(
  func: T,
  delay: number = 500,
  immediate: boolean = false
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function debounced(...args: Parameters<T>) {
    const callNow = immediate && timeoutId === null;

    // Clear existing timeout
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    // Schedule new timeout
    timeoutId = setTimeout(() => {
      if (!immediate) {
        func(...args);
      }
      timeoutId = null;
    }, delay);

    // Execute immediately if requested
    if (callNow) {
      func(...args);
    }
  };
}
