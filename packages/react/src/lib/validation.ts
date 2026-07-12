/**
 * Validation utilities for form fields
 * 
 * This module provides generic validation functions that work with any OpenAPI spec.
 * Validation rules are derived from OpenAPI schema properties (format, pattern, minLength, etc.)
 * rather than being hardcoded for specific fields.
 */

/**
 * Validation result type
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Field schema interface matching OpenAPI schema properties
 */
export interface FieldSchema {
  type?: string;
  format?: string;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  required?: boolean;
  minimum?: number;
  maximum?: number;
}

/**
 * Validates email format using RFC 5322 compliant regex
 * 
 * @param value - The email string to validate
 * @returns ValidationResult with isValid flag and optional error message
 */
export function validateEmail(value: string): ValidationResult {
  if (!value || value.trim() === '') {
    return { isValid: true }; // Empty is valid (use validateRequired separately)
  }

  // RFC 5322 compliant email regex (simplified but robust)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  const isValid = emailRegex.test(value.trim());
  
  return {
    isValid,
    error: isValid ? undefined : 'Please enter a valid email address'
  };
}

/**
 * Validates that a required field has a value
 * 
 * @param value - The value to check
 * @returns ValidationResult with isValid flag and optional error message
 */
export function validateRequired(value: unknown): ValidationResult {
  const isEmpty = value === null || 
                  value === undefined || 
                  (typeof value === 'string' && value.trim() === '') ||
                  (Array.isArray(value) && value.length === 0);
  
  return {
    isValid: !isEmpty,
    error: isEmpty ? 'This field is required' : undefined
  };
}

/**
 * Validates a string against a regex pattern
 * 
 * @param value - The string to validate
 * @param pattern - The regex pattern to match against
 * @param errorMessage - Custom error message (optional)
 * @returns ValidationResult with isValid flag and optional error message
 */
export function validatePattern(
  value: string, 
  pattern: string | RegExp,
  errorMessage?: string
): ValidationResult {
  if (!value || value.trim() === '') {
    return { isValid: true }; // Empty is valid (use validateRequired separately)
  }

  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  const isValid = regex.test(value);
  
  return {
    isValid,
    error: isValid ? undefined : (errorMessage || 'Invalid format')
  };
}

/**
 * Validates username pattern (alphanumeric and underscores only)
 * This is a convenience wrapper around validatePattern for common username validation
 * 
 * @param value - The username string to validate
 * @returns ValidationResult with isValid flag and optional error message
 */
export function validateUsername(value: string): ValidationResult {
  if (!value || value.trim() === '') {
    return { isValid: true }; // Empty is valid (use validateRequired separately)
  }

  return validatePattern(
    value,
    /^[a-zA-Z0-9_]+$/,
    'Username must contain only letters, numbers, and underscores'
  );
}

/**
 * Validates string length constraints
 * 
 * @param value - The string to validate
 * @param minLength - Minimum length (optional)
 * @param maxLength - Maximum length (optional)
 * @returns ValidationResult with isValid flag and optional error message
 */
export function validateLength(
  value: string,
  minLength?: number,
  maxLength?: number
): ValidationResult {
  if (!value || value.trim() === '') {
    return { isValid: true }; // Empty is valid (use validateRequired separately)
  }

  const length = value.length;

  if (minLength !== undefined && length < minLength) {
    return {
      isValid: false,
      error: `Must be at least ${minLength} character${minLength !== 1 ? 's' : ''}`
    };
  }

  if (maxLength !== undefined && length > maxLength) {
    return {
      isValid: false,
      error: `Must be no more than ${maxLength} character${maxLength !== 1 ? 's' : ''}`
    };
  }

  return { isValid: true };
}

/**
 * Validates numeric range constraints
 * 
 * @param value - The number to validate
 * @param minimum - Minimum value (optional)
 * @param maximum - Maximum value (optional)
 * @returns ValidationResult with isValid flag and optional error message
 */
export function validateRange(
  value: number,
  minimum?: number,
  maximum?: number
): ValidationResult {
  if (isNaN(value)) {
    return {
      isValid: false,
      error: 'Must be a valid number'
    };
  }

  if (minimum !== undefined && value < minimum) {
    return {
      isValid: false,
      error: `Must be at least ${minimum}`
    };
  }

  if (maximum !== undefined && value > maximum) {
    return {
      isValid: false,
      error: `Must be no more than ${maximum}`
    };
  }

  return { isValid: true };
}

/**
 * Generic field validator that applies validation rules based on OpenAPI schema
 * This is the main validation function that should be used for form fields
 * 
 * @param value - The value to validate
 * @param schema - The field schema with validation rules
 * @returns ValidationResult with isValid flag and optional error message
 */
export function validateField(value: unknown, schema: FieldSchema): ValidationResult {
  // Check required first
  if (schema.required) {
    const requiredResult = validateRequired(value);
    if (!requiredResult.isValid) {
      return requiredResult;
    }
  }

  // If value is empty and not required, it's valid
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    return { isValid: true };
  }

  const stringValue = String(value);

  // Validate email format
  if (schema.format === 'email') {
    const emailResult = validateEmail(stringValue);
    if (!emailResult.isValid) {
      return emailResult;
    }
  }

  // Validate pattern
  if (schema.pattern) {
    const patternResult = validatePattern(stringValue, schema.pattern);
    if (!patternResult.isValid) {
      return patternResult;
    }
  }

  // Validate length for strings
  if (schema.type === 'string' && (schema.minLength !== undefined || schema.maxLength !== undefined)) {
    const lengthResult = validateLength(stringValue, schema.minLength, schema.maxLength);
    if (!lengthResult.isValid) {
      return lengthResult;
    }
  }

  // Validate range for numbers
  if ((schema.type === 'number' || schema.type === 'integer') && (schema.minimum !== undefined || schema.maximum !== undefined)) {
    const numValue = Number(value);
    const rangeResult = validateRange(numValue, schema.minimum, schema.maximum);
    if (!rangeResult.isValid) {
      return rangeResult;
    }
  }

  return { isValid: true };
}

/**
 * Formats validation errors into user-friendly messages
 * Handles both single field errors and multiple field errors
 * 
 * @param errors - Record of field names to error messages
 * @returns Formatted error message string
 */
export function formatValidationErrors(errors: Record<string, string>): string {
  const errorMessages = Object.entries(errors)
    .map(([field, message]) => `${field}: ${message}`)
    .join(', ');
  
  return errorMessages || 'Validation failed';
}

/**
 * Validates multiple fields at once
 * 
 * @param data - Record of field names to values
 * @param schemas - Record of field names to schemas
 * @returns Record of field names to error messages (only includes fields with errors)
 */
export function validateFields(
  data: Record<string, unknown>,
  schemas: Record<string, FieldSchema>
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const [fieldName, schema] of Object.entries(schemas)) {
    const value = data[fieldName];
    const result = validateField(value, schema);
    
    if (!result.isValid && result.error) {
      errors[fieldName] = result.error;
    }
  }

  return errors;
}
