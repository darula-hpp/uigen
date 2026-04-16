/**
 * File Upload Strategy System Types
 * 
 * This module defines the core interfaces for the file upload strategy pattern.
 * Strategies handle validation, preview generation, and file type-specific logic.
 */

import type { ComponentType } from 'react';

/**
 * Result of file validation
 */
export interface ValidationResult {
  /** Whether validation passed */
  success: boolean;
  /** Array of error messages for validation failures */
  errors: string[];
  /** Array of warning messages for non-critical issues */
  warnings: string[];
}

/**
 * Props for file preview components
 */
export interface PreviewProps {
  /** The file to preview */
  file: File;
  /** Callback to remove the file */
  onRemove: () => void;
}

/**
 * Strategy interface for handling file uploads
 * 
 * Each strategy implements type-specific validation rules,
 * preview components, and file handling logic.
 */
export interface FileUploadStrategy {
  /**
   * Validate a file against strategy rules
   * @param file - The file to validate
   * @param maxSizeBytes - Optional override for max size
   * @returns Validation result with success status and error messages
   */
  validate(file: File, maxSizeBytes?: number): ValidationResult;

  /**
   * Get the preview component for this file type
   * @returns React component that renders file preview
   */
  getPreviewComponent(): ComponentType<PreviewProps>;

  /**
   * Get supported MIME types for this strategy
   * @returns Array of MIME type patterns (e.g., ["image/*", "image/png"])
   */
  getSupportedMimeTypes(): string[];

  /**
   * Get default maximum file size in bytes
   * @returns Maximum file size in bytes
   */
  getMaxFileSize(): number;

  /**
   * Format file size to human-readable string
   * @param bytes - File size in bytes
   * @returns Formatted string (e.g., "5.2 MB")
   */
  formatFileSize(bytes: number): string;
}
