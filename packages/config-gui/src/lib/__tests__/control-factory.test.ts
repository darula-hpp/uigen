import { describe, it, expect } from 'vitest';
import { ControlFactory } from '../control-factory.js';
import type { AnnotationMetadata, PropertySchema } from '../../types/index.js';

describe('ControlFactory', () => {
  const factory = new ControlFactory();

  describe('generateControl', () => {
    it('should generate text input for string parameter', () => {
      const schema: PropertySchema = {
        type: 'string',
        description: 'A text field',
      };

      const control = factory.generateControl('myParam', schema, 'x-uigen-test');

      expect(control.type).toBe('text-input');
      expect(control.label).toBe('My Param');
      expect(control.description).toBe('A text field');
      expect(control.required).toBe(false);
    });

    it('should generate toggle for boolean parameter', () => {
      const schema: PropertySchema = {
        type: 'boolean',
        description: 'A boolean flag',
      };

      const control = factory.generateControl('enabled', schema, 'x-uigen-test');

      expect(control.type).toBe('toggle');
      expect(control.label).toBe('Enabled');
    });

    it('should generate number input for number parameter', () => {
      const schema: PropertySchema = {
        type: 'number',
        description: 'A numeric value',
      };

      const control = factory.generateControl('count', schema, 'x-uigen-test');

      expect(control.type).toBe('number-input');
      expect(control.label).toBe('Count');
    });

    it('should generate dropdown for enum parameter', () => {
      const schema: PropertySchema = {
        type: 'enum',
        enum: ['option1', 'option2', 'option3'],
        description: 'Select an option',
      };

      const control = factory.generateControl('choice', schema, 'x-uigen-test');

      expect(control.type).toBe('dropdown');
      expect(control.options).toHaveLength(3);
      expect(control.options?.[0]).toEqual({ label: 'Option1', value: 'option1' });
    });

    it('should generate dropdown for string with enum values', () => {
      const schema: PropertySchema = {
        type: 'string',
        enum: ['small', 'medium', 'large'],
      };

      const control = factory.generateControl('size', schema, 'x-uigen-test');

      expect(control.type).toBe('dropdown');
      expect(control.options).toHaveLength(3);
    });

    it('should generate resource selector for x-uigen-ref resource parameter', () => {
      const schema: PropertySchema = {
        type: 'string',
        description: 'Target resource name',
      };

      const control = factory.generateControl('resource', schema, 'x-uigen-ref');

      expect(control.type).toBe('resource-selector');
    });

    it('should generate text input for x-uigen-label', () => {
      const schema: PropertySchema = {
        type: 'string',
        description: 'Custom label',
      };

      const control = factory.generateControl('label', schema, 'x-uigen-label');

      expect(control.type).toBe('text-input');
    });

    it('should generate toggle for x-uigen-ignore', () => {
      const schema: PropertySchema = {
        type: 'boolean',
      };

      const control = factory.generateControl('ignore', schema, 'x-uigen-ignore');

      expect(control.type).toBe('toggle');
    });

    it('should generate resource selector for object with resource property', () => {
      const schema: PropertySchema = {
        type: 'object',
        properties: {
          resource: { type: 'string' },
          valueField: { type: 'string' },
        },
      };

      const control = factory.generateControl('ref', schema, 'x-uigen-test');

      expect(control.type).toBe('resource-selector');
    });

    it('should generate object editor for generic object', () => {
      const schema: PropertySchema = {
        type: 'object',
        properties: {
          foo: { type: 'string' },
          bar: { type: 'number' },
        },
      };

      const control = factory.generateControl('config', schema, 'x-uigen-test');

      expect(control.type).toBe('object-editor');
    });

    it('should generate object editor for array parameter', () => {
      const schema: PropertySchema = {
        type: 'array',
        items: { type: 'string' },
        description: 'List of values',
      };

      const control = factory.generateControl('items', schema, 'x-uigen-test');

      expect(control.type).toBe('object-editor');
      expect(control.label).toBe('Items');
      expect(control.description).toBe('List of values');
    });

    it('should format camelCase parameter names to Title Case', () => {
      const schema: PropertySchema = { type: 'string' };

      const control = factory.generateControl('myLongParameterName', schema, 'x-uigen-test');

      expect(control.label).toBe('My Long Parameter Name');
    });

    it('should format snake_case parameter names to Title Case', () => {
      const schema: PropertySchema = { type: 'string' };

      const control = factory.generateControl('my_parameter_name', schema, 'x-uigen-test');

      expect(control.label).toBe('My Parameter Name');
    });
  });

  describe('generateControls', () => {
    it('should generate controls for all parameters in object schema', () => {
      const metadata: AnnotationMetadata = {
        name: 'x-uigen-ref',
        description: 'Reference annotation',
        targetType: 'field',
        parameterSchema: {
          type: 'object',
          properties: {
            resource: { type: 'string', description: 'Target resource' },
            valueField: { type: 'string', description: 'Value field' },
            labelField: { type: 'string', description: 'Label field' },
          },
          required: ['resource', 'valueField'],
        },
        examples: [],
      };

      const controls = factory.generateControls(metadata);

      expect(Object.keys(controls)).toHaveLength(3);
      expect(controls.resource.type).toBe('resource-selector');
      expect(controls.valueField.type).toBe('text-input');
      expect(controls.labelField.type).toBe('text-input');
    });

    it('should mark required parameters', () => {
      const metadata: AnnotationMetadata = {
        name: 'x-uigen-test',
        description: 'Test annotation',
        targetType: 'field',
        parameterSchema: {
          type: 'object',
          properties: {
            required_param: { type: 'string' },
            optional_param: { type: 'string' },
          },
          required: ['required_param'],
        },
        examples: [],
      };

      const controls = factory.generateControls(metadata);

      expect(controls.required_param.required).toBe(true);
      expect(controls.required_param.validation).toHaveLength(1);
      expect(controls.required_param.validation?.[0].type).toBe('required');
      expect(controls.optional_param.required).toBe(false);
    });

    it('should handle simple string-type annotations', () => {
      const metadata: AnnotationMetadata = {
        name: 'x-uigen-label',
        description: 'Label annotation',
        targetType: 'field',
        parameterSchema: {
          type: 'string',
        },
        examples: [],
      };

      const controls = factory.generateControls(metadata);

      expect(Object.keys(controls)).toHaveLength(1);
      expect(controls.value.type).toBe('text-input');
    });

    it('should handle simple boolean-type annotations', () => {
      const metadata: AnnotationMetadata = {
        name: 'x-uigen-ignore',
        description: 'Ignore annotation',
        targetType: 'field',
        parameterSchema: {
          type: 'boolean',
        },
        examples: [],
      };

      const controls = factory.generateControls(metadata);

      expect(Object.keys(controls)).toHaveLength(1);
      expect(controls.value.type).toBe('toggle');
    });

    it('should handle annotation with no properties', () => {
      const metadata: AnnotationMetadata = {
        name: 'x-uigen-test',
        description: 'Test annotation',
        targetType: 'field',
        parameterSchema: {
          type: 'object',
        },
        examples: [],
      };

      const controls = factory.generateControls(metadata);

      expect(Object.keys(controls)).toHaveLength(0);
    });

    it('should generate controls with descriptions from schema', () => {
      const metadata: AnnotationMetadata = {
        name: 'x-uigen-test',
        description: 'Test annotation',
        targetType: 'field',
        parameterSchema: {
          type: 'object',
          properties: {
            param1: { type: 'string', description: 'First parameter' },
            param2: { type: 'number', description: 'Second parameter' },
          },
        },
        examples: [],
      };

      const controls = factory.generateControls(metadata);

      expect(controls.param1.description).toBe('First parameter');
      expect(controls.param2.description).toBe('Second parameter');
    });
  });
});
