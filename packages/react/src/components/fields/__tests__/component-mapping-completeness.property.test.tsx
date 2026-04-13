import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { componentRegistry, registerDefaultComponents } from '../index';
import type { FieldType } from '@uigen/core';

/**
 * Property 9: Component Mapping Completeness
 * **Validates: Requirements 33.1-33.11**
 * 
 * This property verifies that all field types defined in the IR have
 * corresponding React components registered in the ComponentRegistry.
 */
describe('Property 9: Component Mapping Completeness', () => {
  beforeEach(() => {
    registerDefaultComponents();
  });

  it('should have components registered for all field types', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<FieldType>(
          'string',
          'number',
          'integer',
          'boolean',
          'object',
          'array',
          'enum',
          'date',
          'file'
        ),
        (fieldType) => {
          // Property: Every field type must have a registered component
          const hasComponent = componentRegistry.hasComponent(fieldType);
          
          expect(hasComponent).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have components for string format variations', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'string:date',
          'string:date-time',
          'string:email',
          'string:uri',
          'string:url',
          'string:password'
        ),
        (formatKey) => {
          // Property: String format variations should resolve to appropriate components
          const schema = {
            type: 'string' as FieldType,
            key: 'test',
            label: 'Test',
            required: false,
            format: formatKey.split(':')[1],
          };
          
          // Should not throw when getting component
          expect(() => componentRegistry.getFieldComponent(schema)).not.toThrow();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should return a component for any schema node', () => {
    fc.assert(
      fc.property(
        fc.record({
          type: fc.constantFrom<FieldType>(
            'string',
            'number',
            'integer',
            'boolean',
            'object',
            'array',
            'enum',
            'date',
            'file'
          ),
          key: fc.string({ minLength: 1, maxLength: 20 }),
          label: fc.string({ minLength: 1, maxLength: 50 }),
          required: fc.boolean(),
          format: fc.option(
            fc.constantFrom('date', 'date-time', 'email', 'uri', 'url', 'password'),
            { nil: undefined }
          ),
        }),
        (schema) => {
          // Property: getFieldComponent should never throw for valid schema nodes
          expect(() => componentRegistry.getFieldComponent(schema)).not.toThrow();
          
          // Property: getFieldComponent should always return a component
          const component = componentRegistry.getFieldComponent(schema);
          expect(component).toBeDefined();
          expect(typeof component).toBe('function');
        }
      ),
      { numRuns: 200 }
    );
  });

  it('should handle unknown types by falling back to default', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).filter(
          (s) => !['string', 'number', 'integer', 'boolean', 'object', 'array', 'enum', 'date', 'file'].includes(s)
        ),
        (unknownType) => {
          const schema = {
            type: unknownType as FieldType,
            key: 'test',
            label: 'Test',
            required: false,
          };
          
          // Property: Unknown types should fall back to a default component (TextField)
          expect(() => componentRegistry.getFieldComponent(schema)).not.toThrow();
          const component = componentRegistry.getFieldComponent(schema);
          expect(component).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain consistent component mapping across multiple calls', () => {
    fc.assert(
      fc.property(
        fc.record({
          type: fc.constantFrom<FieldType>('string', 'number', 'boolean', 'enum'),
          key: fc.string({ minLength: 1 }),
          label: fc.string({ minLength: 1 }),
          required: fc.boolean(),
        }),
        (schema) => {
          // Property: Multiple calls with same schema should return same component
          const component1 = componentRegistry.getFieldComponent(schema);
          const component2 = componentRegistry.getFieldComponent(schema);
          
          expect(component1).toBe(component2);
        }
      ),
      { numRuns: 100 }
    );
  });
});
