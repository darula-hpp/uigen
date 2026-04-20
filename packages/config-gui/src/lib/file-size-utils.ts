/**
 * Unit conversion utilities for file size handling in the config GUI.
 * 
 * These utilities support converting between bytes and human-readable units (B, KB, MB, GB),
 * formatting byte values for display, and selecting appropriate default units.
 * 
 * Used by the FileSizeInput component to provide a user-friendly interface for
 * configuring x-uigen-max-file-size annotations.
 */

/**
 * Supported file size units with their byte multipliers.
 * Uses binary (base-1024) units as is standard for file sizes.
 */
export const UNITS = {
  B: 1,
  KB: 1024,
  MB: 1024 * 1024,
  GB: 1024 * 1024 * 1024,
} as const;

export type Unit = keyof typeof UNITS;

/**
 * Converts a value in a specific unit to bytes.
 * 
 * @param value - The numeric value to convert
 * @param unit - The unit of the value (B, KB, MB, or GB)
 * @returns The equivalent value in bytes
 * 
 * @example
 * ```typescript
 * toBytes(5, 'MB');  // 5242880
 * toBytes(1, 'GB');  // 1073741824
 * toBytes(100, 'KB'); // 102400
 * toBytes(500, 'B');  // 500
 * ```
 */
export function toBytes(value: number, unit: string): number {
  const multiplier = UNITS[unit as Unit];
  if (multiplier === undefined) {
    throw new Error(`Invalid unit: ${unit}. Must be one of: B, KB, MB, GB`);
  }
  return value * multiplier;
}

/**
 * Converts a byte value to a specific unit.
 * 
 * @param bytes - The value in bytes to convert
 * @param unit - The target unit (B, KB, MB, or GB)
 * @returns The equivalent value in the target unit
 * 
 * @example
 * ```typescript
 * fromBytes(5242880, 'MB');  // 5
 * fromBytes(1073741824, 'GB'); // 1
 * fromBytes(102400, 'KB'); // 100
 * fromBytes(500, 'B');  // 500
 * ```
 */
export function fromBytes(bytes: number, unit: string): number {
  const multiplier = UNITS[unit as Unit];
  if (multiplier === undefined) {
    throw new Error(`Invalid unit: ${unit}. Must be one of: B, KB, MB, GB`);
  }
  return bytes / multiplier;
}

/**
 * Formats a byte value as a human-readable string with appropriate unit.
 * Automatically selects the most appropriate unit and formats with 2 decimal places
 * for fractional values.
 * 
 * @param bytes - The value in bytes to format
 * @returns A formatted string with value and unit (e.g., "5.00 MB", "1.50 GB")
 * 
 * @example
 * ```typescript
 * formatBytes(5242880);      // "5.00 MB"
 * formatBytes(1073741824);   // "1.00 GB"
 * formatBytes(102400);       // "100.00 KB"
 * formatBytes(500);          // "500 B"
 * formatBytes(1536);         // "1.50 KB"
 * ```
 */
export function formatBytes(bytes: number): string {
  if (bytes >= UNITS.GB) {
    return `${(bytes / UNITS.GB).toFixed(2)} GB`;
  }
  if (bytes >= UNITS.MB) {
    return `${(bytes / UNITS.MB).toFixed(2)} MB`;
  }
  if (bytes >= UNITS.KB) {
    return `${(bytes / UNITS.KB).toFixed(2)} KB`;
  }
  return `${bytes} B`;
}

/**
 * Selects the most appropriate default unit for a given byte value.
 * Chooses the largest unit where the value is >= 1.
 * 
 * @param bytes - The value in bytes
 * @returns The most appropriate unit (B, KB, MB, or GB)
 * 
 * @example
 * ```typescript
 * selectDefaultUnit(5242880);      // "MB" (5 MB)
 * selectDefaultUnit(1073741824);   // "GB" (1 GB)
 * selectDefaultUnit(102400);       // "KB" (100 KB)
 * selectDefaultUnit(500);          // "B"  (500 B)
 * selectDefaultUnit(1536);         // "KB" (1.5 KB)
 * ```
 */
export function selectDefaultUnit(bytes: number): string {
  if (bytes >= UNITS.GB) {
    return 'GB';
  }
  if (bytes >= UNITS.MB) {
    return 'MB';
  }
  if (bytes >= UNITS.KB) {
    return 'KB';
  }
  return 'B';
}
