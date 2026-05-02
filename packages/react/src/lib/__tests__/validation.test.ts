import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validateRequired,
  validatePattern,
  validateUsername,
  validateLength,
  validateRange,
  validateField,
  formatValidationErrors,
  validateFields,
  type FieldSchema,
} from '../validation';

describe('validateEmail', () => {
  it('should validate correct email formats - Requirement 5.1', () => {
    expect(validateEmail('user@example.com').isValid).toBe(true);
    expect(validateEmail('test.user@example.com').isValid).toBe(true);
    expect(validateEmail('user+tag@example.co.uk').isValid).toBe(true);
    expect(validateEmail('user_name@example-domain.com').isValid).toBe(true);
  });

  it('should reject invalid email formats - Requirement 5.1', () => {
    const result1 = validateEmail('invalid-email');
    expect(result1.isValid).toBe(false);
    expect(result1.error).toBe('Please enter a valid email address');

    const result2 = validateEmail('user@');
    expect(result2.isValid).toBe(false);

    const result3 = validateEmail('@example.com');
    expect(result3.isValid).toBe(false);

    const result4 = validateEmail('user @example.com');
    expect(result4.isValid).toBe(false);
  });

  it('should handle empty strings as valid - Requirement 5.1', () => {
    expect(validateEmail('').isValid).toBe(true);
    expect(validateEmail('   ').isValid).toBe(true);
  });

  it('should trim whitespace before validation', () => {
    expect(validateEmail('  user@example.com  ').isValid).toBe(true);
  });

  it('should handle special characters in local part', () => {
    expect(validateEmail('user.name+tag@example.com').isValid).toBe(true);
    expect(validateEmail('user!name@example.com').isValid).toBe(true);
    expect(validateEmail('user#name@example.com').isValid).toBe(true);
  });

  it('should validate domain with multiple subdomains', () => {
    expect(validateEmail('user@mail.example.co.uk').isValid).toBe(true);
    expect(validateEmail('user@subdomain.example.com').isValid).toBe(true);
  });
});

describe('validateRequired', () => {
  it('should validate non-empty values as valid - Requirement 5.2', () => {
    expect(validateRequired('value').isValid).toBe(true);
    expect(validateRequired('0').isValid).toBe(true);
    expect(validateRequired(0).isValid).toBe(true);
    expect(validateRequired(false).isValid).toBe(true);
    expect(validateRequired(['item']).isValid).toBe(true);
  });

  it('should validate empty values as invalid - Requirement 5.2', () => {
    const result1 = validateRequired('');
    expect(result1.isValid).toBe(false);
    expect(result1.error).toBe('This field is required');

    const result2 = validateRequired('   ');
    expect(result2.isValid).toBe(false);

    const result3 = validateRequired(null);
    expect(result3.isValid).toBe(false);

    const result4 = validateRequired(undefined);
    expect(result4.isValid).toBe(false);

    const result5 = validateRequired([]);
    expect(result5.isValid).toBe(false);
  });

  it('should provide clear error message - Requirement 5.6', () => {
    const result = validateRequired('');
    expect(result.error).toBe('This field is required');
  });
});

describe('validatePattern', () => {
  it('should validate strings matching the pattern - Requirement 5.3', () => {
    expect(validatePattern('abc123', /^[a-z0-9]+$/).isValid).toBe(true);
    expect(validatePattern('test_user', /^[a-z_]+$/).isValid).toBe(true);
  });

  it('should reject strings not matching the pattern - Requirement 5.3', () => {
    const result = validatePattern('abc-123', /^[a-z0-9]+$/);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Invalid format');
  });

  it('should accept string patterns', () => {
    expect(validatePattern('abc123', '^[a-z0-9]+$').isValid).toBe(true);
  });

  it('should use custom error message when provided - Requirement 5.6', () => {
    const result = validatePattern('abc-123', /^[a-z0-9]+$/, 'Only letters and numbers allowed');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Only letters and numbers allowed');
  });

  it('should handle empty strings as valid', () => {
    expect(validatePattern('', /^[a-z]+$/).isValid).toBe(true);
    expect(validatePattern('   ', /^[a-z]+$/).isValid).toBe(true);
  });
});

describe('validateUsername', () => {
  it('should validate usernames with alphanumeric and underscores - Requirement 5.3', () => {
    expect(validateUsername('user123').isValid).toBe(true);
    expect(validateUsername('test_user').isValid).toBe(true);
    expect(validateUsername('User_Name_123').isValid).toBe(true);
    expect(validateUsername('_underscore').isValid).toBe(true);
  });

  it('should reject usernames with invalid characters - Requirement 5.3', () => {
    const result1 = validateUsername('user-name');
    expect(result1.isValid).toBe(false);
    expect(result1.error).toBe('Username must contain only letters, numbers, and underscores');

    const result2 = validateUsername('user name');
    expect(result2.isValid).toBe(false);

    const result3 = validateUsername('user@name');
    expect(result3.isValid).toBe(false);

    const result4 = validateUsername('user.name');
    expect(result4.isValid).toBe(false);
  });

  it('should handle empty strings as valid', () => {
    expect(validateUsername('').isValid).toBe(true);
  });

  it('should provide clear error message - Requirement 5.6', () => {
    const result = validateUsername('user-name');
    expect(result.error).toBe('Username must contain only letters, numbers, and underscores');
  });
});

describe('validateLength', () => {
  it('should validate strings within length constraints', () => {
    expect(validateLength('test', 2, 10).isValid).toBe(true);
    expect(validateLength('ab', 2, 10).isValid).toBe(true);
    expect(validateLength('abcdefghij', 2, 10).isValid).toBe(true);
  });

  it('should reject strings shorter than minLength', () => {
    const result = validateLength('a', 3);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Must be at least 3 characters');
  });

  it('should reject strings longer than maxLength', () => {
    const result = validateLength('abcdefghijk', undefined, 10);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Must be no more than 10 characters');
  });

  it('should handle singular character in error message', () => {
    const result = validateLength('a', 2);
    expect(result.error).toBe('Must be at least 2 characters');
    
    const result2 = validateLength('ab', undefined, 1);
    expect(result2.error).toBe('Must be no more than 1 character');
  });

  it('should handle empty strings as valid', () => {
    expect(validateLength('', 3, 10).isValid).toBe(true);
  });

  it('should validate with only minLength', () => {
    expect(validateLength('test', 2).isValid).toBe(true);
    expect(validateLength('a', 2).isValid).toBe(false);
  });

  it('should validate with only maxLength', () => {
    expect(validateLength('test', undefined, 10).isValid).toBe(true);
    expect(validateLength('verylongstring', undefined, 5).isValid).toBe(false);
  });
});

describe('validateRange', () => {
  it('should validate numbers within range', () => {
    expect(validateRange(5, 0, 10).isValid).toBe(true);
    expect(validateRange(0, 0, 10).isValid).toBe(true);
    expect(validateRange(10, 0, 10).isValid).toBe(true);
  });

  it('should reject numbers below minimum', () => {
    const result = validateRange(-1, 0);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Must be at least 0');
  });

  it('should reject numbers above maximum', () => {
    const result = validateRange(11, undefined, 10);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Must be no more than 10');
  });

  it('should reject NaN values', () => {
    const result = validateRange(NaN);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Must be a valid number');
  });

  it('should validate with only minimum', () => {
    expect(validateRange(5, 0).isValid).toBe(true);
    expect(validateRange(-1, 0).isValid).toBe(false);
  });

  it('should validate with only maximum', () => {
    expect(validateRange(5, undefined, 10).isValid).toBe(true);
    expect(validateRange(11, undefined, 10).isValid).toBe(false);
  });

  it('should handle negative ranges', () => {
    expect(validateRange(-5, -10, 0).isValid).toBe(true);
    expect(validateRange(-11, -10, 0).isValid).toBe(false);
  });
});

describe('validateField', () => {
  it('should validate required fields - Requirement 5.2', () => {
    const schema: FieldSchema = { required: true };
    
    expect(validateField('value', schema).isValid).toBe(true);
    
    const result = validateField('', schema);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('This field is required');
  });

  it('should validate email format fields - Requirement 5.1', () => {
    const schema: FieldSchema = { type: 'string', format: 'email' };
    
    expect(validateField('user@example.com', schema).isValid).toBe(true);
    
    const result = validateField('invalid-email', schema);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Please enter a valid email address');
  });

  it('should validate pattern fields - Requirement 5.3', () => {
    const schema: FieldSchema = { type: 'string', pattern: '^[a-zA-Z0-9_]+$' };
    
    expect(validateField('user_123', schema).isValid).toBe(true);
    
    const result = validateField('user-name', schema);
    expect(result.isValid).toBe(false);
  });

  it('should validate string length constraints', () => {
    const schema: FieldSchema = { type: 'string', minLength: 3, maxLength: 10 };
    
    expect(validateField('test', schema).isValid).toBe(true);
    
    const result1 = validateField('ab', schema);
    expect(result1.isValid).toBe(false);
    expect(result1.error).toContain('at least 3');
    
    const result2 = validateField('verylongstring', schema);
    expect(result2.isValid).toBe(false);
    expect(result2.error).toContain('no more than 10');
  });

  it('should validate number range constraints', () => {
    const schema: FieldSchema = { type: 'number', minimum: 0, maximum: 100 };
    
    expect(validateField(50, schema).isValid).toBe(true);
    
    const result1 = validateField(-1, schema);
    expect(result1.isValid).toBe(false);
    expect(result1.error).toContain('at least 0');
    
    const result2 = validateField(101, schema);
    expect(result2.isValid).toBe(false);
    expect(result2.error).toContain('no more than 100');
  });

  it('should allow empty values for non-required fields', () => {
    const schema: FieldSchema = { type: 'string', format: 'email' };
    
    expect(validateField('', schema).isValid).toBe(true);
    expect(validateField(null, schema).isValid).toBe(true);
    expect(validateField(undefined, schema).isValid).toBe(true);
  });

  it('should validate multiple constraints together', () => {
    const schema: FieldSchema = {
      type: 'string',
      required: true,
      minLength: 3,
      maxLength: 50,
      pattern: '^[a-zA-Z0-9_]+$'
    };
    
    expect(validateField('user_123', schema).isValid).toBe(true);
    
    // Required check fails first
    expect(validateField('', schema).isValid).toBe(false);
    
    // Length check
    expect(validateField('ab', schema).isValid).toBe(false);
    
    // Pattern check
    expect(validateField('user-name', schema).isValid).toBe(false);
  });

  it('should handle integer type', () => {
    const schema: FieldSchema = { type: 'integer', minimum: 1, maximum: 10 };
    
    expect(validateField(5, schema).isValid).toBe(true);
    expect(validateField(0, schema).isValid).toBe(false);
    expect(validateField(11, schema).isValid).toBe(false);
  });
});

describe('formatValidationErrors', () => {
  it('should format single field error - Requirement 5.6', () => {
    const errors = { email: 'Please enter a valid email address' };
    const formatted = formatValidationErrors(errors);
    expect(formatted).toBe('email: Please enter a valid email address');
  });

  it('should format multiple field errors - Requirement 5.6', () => {
    const errors = {
      email: 'Please enter a valid email address',
      username: 'Username must contain only letters, numbers, and underscores'
    };
    const formatted = formatValidationErrors(errors);
    expect(formatted).toContain('email: Please enter a valid email address');
    expect(formatted).toContain('username: Username must contain only letters, numbers, and underscores');
    expect(formatted).toContain(', ');
  });

  it('should return default message for empty errors', () => {
    const formatted = formatValidationErrors({});
    expect(formatted).toBe('Validation failed');
  });

  it('should handle special characters in field names', () => {
    const errors = { 'user.email': 'Invalid email' };
    const formatted = formatValidationErrors(errors);
    expect(formatted).toBe('user.email: Invalid email');
  });
});

describe('validateFields', () => {
  it('should validate multiple fields at once', () => {
    const data = {
      username: 'user_123',
      email: 'user@example.com',
      age: 25
    };
    
    const schemas = {
      username: { type: 'string', required: true, pattern: '^[a-zA-Z0-9_]+$' } as FieldSchema,
      email: { type: 'string', required: true, format: 'email' } as FieldSchema,
      age: { type: 'number', minimum: 18, maximum: 100 } as FieldSchema
    };
    
    const errors = validateFields(data, schemas);
    expect(Object.keys(errors).length).toBe(0);
  });

  it('should return errors for invalid fields', () => {
    const data = {
      username: 'user-name',
      email: 'invalid-email',
      age: 15
    };
    
    const schemas = {
      username: { type: 'string', required: true, pattern: '^[a-zA-Z0-9_]+$' } as FieldSchema,
      email: { type: 'string', required: true, format: 'email' } as FieldSchema,
      age: { type: 'number', minimum: 18, maximum: 100 } as FieldSchema
    };
    
    const errors = validateFields(data, schemas);
    expect(Object.keys(errors).length).toBe(3);
    expect(errors.username).toBeDefined();
    expect(errors.email).toBe('Please enter a valid email address');
    expect(errors.age).toContain('at least 18');
  });

  it('should only return fields with errors', () => {
    const data = {
      username: 'user_123',
      email: 'invalid-email'
    };
    
    const schemas = {
      username: { type: 'string', required: true, pattern: '^[a-zA-Z0-9_]+$' } as FieldSchema,
      email: { type: 'string', required: true, format: 'email' } as FieldSchema
    };
    
    const errors = validateFields(data, schemas);
    expect(Object.keys(errors).length).toBe(1);
    expect(errors.username).toBeUndefined();
    expect(errors.email).toBe('Please enter a valid email address');
  });

  it('should handle empty data object', () => {
    const data = {};
    const schemas = {
      username: { type: 'string', required: true } as FieldSchema
    };
    
    const errors = validateFields(data, schemas);
    expect(errors.username).toBe('This field is required');
  });

  it('should handle empty schemas object', () => {
    const data = { username: 'test' };
    const schemas = {};
    
    const errors = validateFields(data, schemas);
    expect(Object.keys(errors).length).toBe(0);
  });
});
