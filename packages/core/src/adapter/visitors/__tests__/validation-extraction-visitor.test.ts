import { describe, it, expect } from 'vitest';
import { DefaultValidationExtractionVisitor } from '../validation-extraction-visitor.js';
import type { OpenAPIV3 } from 'openapi-types';

/**
 * Unit tests for ValidationExtractionVisitor
 * 
 * Requirements: 3.1-3.12
 */
describe('DefaultValidationExtractionVisitor', () => {
  const visitor = new DefaultValidationExtractionVisitor();

  describe('extractValidations', () => {
    it('should extract minLength validation', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        minLength: 5
      };
      const validations = visitor.extractValidations(schema);
      expect(validations).toHaveLength(1);
      expect(validations[0]).toEqual({
        type: 'minLength',
        value: 5,
        message: 'Must be at least 5 characters'
      });
    });

    it('should extract maxLength validation', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        maxLength: 100
      };
      const validations = visitor.extractValidations(schema);
      expect(validations).toHaveLength(1);
      expect(validations[0]).toEqual({
        type: 'maxLength',
        value: 100,
        message: 'Must be at most 100 characters'
      });
    });

    it('should extract pattern validation', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        pattern: '^[a-z]+$'
      };
      const validations = visitor.extractValidations(schema);
      expect(validations).toHaveLength(1);
      expect(validations[0]).toEqual({
        type: 'pattern',
        value: '^[a-z]+$',
        message: 'Must match pattern: ^[a-z]+$'
      });
    });

    it('should extract minimum validation', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'number',
        minimum: 0
      };
      const validations = visitor.extractValidations(schema);
      expect(validations).toHaveLength(1);
      expect(validations[0]).toEqual({
        type: 'minimum',
        value: 0,
        message: 'Must be at least 0'
      });
    });

    it('should extract maximum validation', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'number',
        maximum: 100
      };
      const validations = visitor.extractValidations(schema);
      expect(validations).toHaveLength(1);
      expect(validations[0]).toEqual({
        type: 'maximum',
        value: 100,
        message: 'Must be at most 100'
      });
    });

    it('should extract minItems validation', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'array',
        minItems: 1
      };
      const validations = visitor.extractValidations(schema);
      expect(validations).toHaveLength(1);
      expect(validations[0]).toEqual({
        type: 'minItems',
        value: 1,
        message: 'Must have at least 1 item'
      });
    });

    it('should extract minItems validation with plural message', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'array',
        minItems: 2
      };
      const validations = visitor.extractValidations(schema);
      expect(validations).toHaveLength(1);
      expect(validations[0]).toEqual({
        type: 'minItems',
        value: 2,
        message: 'Must have at least 2 items'
      });
    });

    it('should extract maxItems validation', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'array',
        maxItems: 10
      };
      const validations = visitor.extractValidations(schema);
      expect(validations).toHaveLength(1);
      expect(validations[0]).toEqual({
        type: 'maxItems',
        value: 10,
        message: 'Must have at most 10 items'
      });
    });

    it('should extract maxItems validation with singular message', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'array',
        maxItems: 1
      };
      const validations = visitor.extractValidations(schema);
      expect(validations).toHaveLength(1);
      expect(validations[0]).toEqual({
        type: 'maxItems',
        value: 1,
        message: 'Must have at most 1 item'
      });
    });

    it('should extract email validation', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'email'
      };
      const validations = visitor.extractValidations(schema);
      expect(validations).toHaveLength(1);
      expect(validations[0]).toEqual({
        type: 'email',
        value: '',
        message: 'Must be a valid email address'
      });
    });

    it('should extract url validation', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        format: 'uri'
      };
      const validations = visitor.extractValidations(schema);
      expect(validations).toHaveLength(1);
      expect(validations[0]).toEqual({
        type: 'url',
        value: '',
        message: 'Must be a valid URL'
      });
    });

    it('should extract multiple validations', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        minLength: 5,
        maxLength: 100,
        pattern: '^[a-z]+$',
        format: 'email'
      };
      const validations = visitor.extractValidations(schema);
      expect(validations).toHaveLength(4);
      expect(validations[0].type).toBe('minLength');
      expect(validations[1].type).toBe('maxLength');
      expect(validations[2].type).toBe('pattern');
      expect(validations[3].type).toBe('email');
    });

    it('should extract all numeric validations', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'number',
        minimum: 0,
        maximum: 100
      };
      const validations = visitor.extractValidations(schema);
      expect(validations).toHaveLength(2);
      expect(validations[0].type).toBe('minimum');
      expect(validations[1].type).toBe('maximum');
    });

    it('should extract all array validations', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'array',
        minItems: 1,
        maxItems: 10
      };
      const validations = visitor.extractValidations(schema);
      expect(validations).toHaveLength(2);
      expect(validations[0].type).toBe('minItems');
      expect(validations[1].type).toBe('maxItems');
    });

    it('should return empty array for schema without validations', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string'
      };
      const validations = visitor.extractValidations(schema);
      expect(validations).toHaveLength(0);
    });

    it('should handle minimum value of 0', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'number',
        minimum: 0
      };
      const validations = visitor.extractValidations(schema);
      expect(validations).toHaveLength(1);
      expect(validations[0]).toEqual({
        type: 'minimum',
        value: 0,
        message: 'Must be at least 0'
      });
    });

    it('should handle minLength value of 0', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        minLength: 0
      };
      const validations = visitor.extractValidations(schema);
      expect(validations).toHaveLength(1);
      expect(validations[0]).toEqual({
        type: 'minLength',
        value: 0,
        message: 'Must be at least 0 characters'
      });
    });

    it('should handle minItems value of 0', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'array',
        minItems: 0
      };
      const validations = visitor.extractValidations(schema);
      expect(validations).toHaveLength(1);
      expect(validations[0]).toEqual({
        type: 'minItems',
        value: 0,
        message: 'Must have at least 0 items'
      });
    });

    it('should not extract validation for undefined values', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        minLength: undefined,
        maxLength: undefined
      };
      const validations = visitor.extractValidations(schema);
      expect(validations).toHaveLength(0);
    });

    it('should handle complex schema with all validation types', () => {
      const schema: OpenAPIV3.SchemaObject = {
        type: 'string',
        minLength: 1,
        maxLength: 255,
        pattern: '^[A-Za-z0-9]+$',
        format: 'email'
      };
      const validations = visitor.extractValidations(schema);
      expect(validations).toHaveLength(4);
      
      const types = validations.map(v => v.type);
      expect(types).toContain('minLength');
      expect(types).toContain('maxLength');
      expect(types).toContain('pattern');
      expect(types).toContain('email');
    });
  });
});
