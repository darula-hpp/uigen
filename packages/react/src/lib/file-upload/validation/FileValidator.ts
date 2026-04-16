/**
 * File Validation Utilities
 * 
 * Provides validation functions for file uploads including size,
 * MIME type, and extension consistency checks.
 */

import { formatFileSize } from '../utils/formatFileSize';
import type { ValidationResult } from '../types';

/**
 * Validate file size against a maximum limit
 * 
 * @param file - File to validate
 * @param maxSizeBytes - Maximum allowed size in bytes
 * @returns Validation result with formatted error message if size exceeds limit
 */
export function validateFileSize(
  file: File,
  maxSizeBytes: number
): ValidationResult {
  const errors: string[] = [];

  if (file.size === 0) {
    errors.push('File is empty');
  } else if (file.size > maxSizeBytes) {
    errors.push(
      `File size exceeds maximum of ${formatFileSize(maxSizeBytes)}`
    );
  }

  return {
    success: errors.length === 0,
    errors,
    warnings: [],
  };
}

/**
 * Validate file MIME type against allowed types
 * 
 * @param file - File to validate
 * @param allowedMimeTypes - Array of allowed MIME types
 * @returns Validation result with error message if type not allowed
 */
export function validateMimeType(
  file: File,
  allowedMimeTypes: string[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Handle missing MIME type
  if (!file.type) {
    warnings.push('File type could not be determined');
    return {
      success: true,
      errors,
      warnings,
    };
  }

  // Check if MIME type is in allowed list
  const isAllowed = allowedMimeTypes.some((allowedType) => {
    // Handle wildcard patterns (e.g., "image/*")
    if (allowedType.endsWith('/*')) {
      const category = allowedType.split('/')[0];
      return file.type.startsWith(`${category}/`);
    }
    // Exact match
    return file.type === allowedType;
  });

  if (!isAllowed) {
    errors.push(
      `File type not allowed. Accepted types: ${allowedMimeTypes.join(', ')}`
    );
  }

  return {
    success: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get expected file extensions for a MIME type
 * 
 * @param mimeType - MIME type to check
 * @returns Array of expected file extensions (without dot)
 */
function getExpectedExtensions(mimeType: string): string[] {
  const extensionMap: Record<string, string[]> = {
    // Images
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/gif': ['gif'],
    'image/webp': ['webp'],
    'image/svg+xml': ['svg'],
    // Documents
    'application/pdf': ['pdf'],
    'application/msword': ['doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
      'docx',
    ],
    'text/plain': ['txt'],
    'application/rtf': ['rtf'],
    // Videos
    'video/mp4': ['mp4'],
    'video/webm': ['webm'],
    'video/ogg': ['ogv', 'ogg'],
    'video/quicktime': ['mov'],
  };

  return extensionMap[mimeType] || [];
}

/**
 * Validate that file extension matches MIME type
 * 
 * Returns a warning (not an error) if extension doesn't match,
 * as the MIME type is more reliable than the extension.
 * 
 * @param file - File to validate
 * @returns Validation result with warning if extension doesn't match
 */
export function validateExtensionConsistency(file: File): ValidationResult {
  const warnings: string[] = [];

  // Extract extension from filename
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !file.type) {
    return {
      success: true,
      errors: [],
      warnings,
    };
  }

  // Check if extension matches expected extensions for MIME type
  const expectedExtensions = getExpectedExtensions(file.type);
  if (expectedExtensions.length > 0 && !expectedExtensions.includes(extension)) {
    warnings.push('File extension may not match file type');
  }

  return {
    success: true,
    errors: [],
    warnings,
  };
}

/**
 * Validate a file with all validation rules
 * 
 * Combines size, MIME type, and extension validation.
 * 
 * @param file - File to validate
 * @param maxSizeBytes - Maximum allowed size in bytes
 * @param allowedMimeTypes - Array of allowed MIME types
 * @returns Combined validation result
 */
export function validateFile(
  file: File,
  maxSizeBytes: number,
  allowedMimeTypes: string[]
): ValidationResult {
  const sizeResult = validateFileSize(file, maxSizeBytes);
  const mimeResult = validateMimeType(file, allowedMimeTypes);
  const extensionResult = validateExtensionConsistency(file);

  return {
    success: sizeResult.success && mimeResult.success,
    errors: [...sizeResult.errors, ...mimeResult.errors],
    warnings: [
      ...sizeResult.warnings,
      ...mimeResult.warnings,
      ...extensionResult.warnings,
    ],
  };
}
