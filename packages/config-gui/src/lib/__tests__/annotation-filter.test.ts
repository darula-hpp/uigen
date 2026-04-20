import { describe, it, expect } from 'vitest';
import { getApplicableAnnotations } from '../annotation-filter.js';
import type { FieldNode } from '../spec-parser.js';
import type { AnnotationMetadata } from '../../types/index.js';

describe('getApplicableAnnotations', () => {
  // Helper to create a field node with minimal required properties
  const createField = (type: string, format?: string): FieldNode => ({
    key: 'testField',
    label: 'Test Field',
    type: type as any,
    format,
    path: 'Test.testField',
    required: false,
    annotations: {}
  });

  // Helper to create an annotation with minimal required properties
  const createAnnotation = (
    name: string,
    applicableWhen?: { type?: string; format?: string }
  ): AnnotationMetadata => ({
    name,
    description: `${name} annotation`,
    targetType: 'field',
    parameterSchema: { type: 'string' },
    examples: [],
    applicableWhen: applicableWhen as any
  });

  describe('annotations with no applicability rules', () => {
    it('should return annotations with no applicableWhen for any field', () => {
      const field = createField('string');
      const annotations = [
        createAnnotation('x-uigen-label'),
        createAnnotation('x-uigen-placeholder')
      ];

      const result = getApplicableAnnotations(field, annotations);

      expect(result).toHaveLength(2);
      expect(result).toEqual(annotations);
    });

    it('should return annotations with undefined applicableWhen for file fields', () => {
      const field = createField('file');
      const annotations = [
        createAnnotation('x-uigen-label'),
        createAnnotation('x-uigen-description')
      ];

      const result = getApplicableAnnotations(field, annotations);

      expect(result).toHaveLength(2);
      expect(result).toEqual(annotations);
    });
  });

  describe('filtering by type', () => {
    it('should return annotations matching field type', () => {
      const field = createField('file');
      const annotations = [
        createAnnotation('x-uigen-file-types', { type: 'file' }),
        createAnnotation('x-uigen-max-file-size', { type: 'file' }),
        createAnnotation('x-uigen-label')
      ];

      const result = getApplicableAnnotations(field, annotations);

      expect(result).toHaveLength(3);
      expect(result.map(a => a.name)).toEqual([
        'x-uigen-file-types',
        'x-uigen-max-file-size',
        'x-uigen-label'
      ]);
    });

    it('should exclude annotations not matching field type', () => {
      const field = createField('string');
      const annotations = [
        createAnnotation('x-uigen-file-types', { type: 'file' }),
        createAnnotation('x-uigen-max-file-size', { type: 'file' }),
        createAnnotation('x-uigen-label')
      ];

      const result = getApplicableAnnotations(field, annotations);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('x-uigen-label');
    });

    it('should handle multiple different type requirements', () => {
      const field = createField('number');
      const annotations = [
        createAnnotation('x-uigen-file-types', { type: 'file' }),
        createAnnotation('x-uigen-min', { type: 'number' }),
        createAnnotation('x-uigen-max', { type: 'number' }),
        createAnnotation('x-uigen-label')
      ];

      const result = getApplicableAnnotations(field, annotations);

      expect(result).toHaveLength(3);
      expect(result.map(a => a.name)).toEqual([
        'x-uigen-min',
        'x-uigen-max',
        'x-uigen-label'
      ]);
    });
  });

  describe('filtering by format', () => {
    it('should return annotations matching field format', () => {
      const field = createField('string', 'binary');
      const annotations = [
        createAnnotation('x-uigen-file-types', { format: 'binary' }),
        createAnnotation('x-uigen-label')
      ];

      const result = getApplicableAnnotations(field, annotations);

      expect(result).toHaveLength(2);
      expect(result.map(a => a.name)).toEqual([
        'x-uigen-file-types',
        'x-uigen-label'
      ]);
    });

    it('should exclude annotations not matching field format', () => {
      const field = createField('string', 'email');
      const annotations = [
        createAnnotation('x-uigen-file-types', { format: 'binary' }),
        createAnnotation('x-uigen-label')
      ];

      const result = getApplicableAnnotations(field, annotations);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('x-uigen-label');
    });

    it('should handle fields with undefined format', () => {
      const field = createField('string', undefined);
      const annotations = [
        createAnnotation('x-uigen-file-types', { format: 'binary' }),
        createAnnotation('x-uigen-label')
      ];

      const result = getApplicableAnnotations(field, annotations);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('x-uigen-label');
    });

    it('should handle annotations requiring format when field has no format', () => {
      const field = createField('string');
      const annotations = [
        createAnnotation('x-uigen-date-format', { format: 'date' }),
        createAnnotation('x-uigen-time-format', { format: 'time' })
      ];

      const result = getApplicableAnnotations(field, annotations);

      expect(result).toHaveLength(0);
    });
  });

  describe('filtering by both type and format', () => {
    it('should return annotations matching both type and format', () => {
      const field = createField('string', 'binary');
      const annotations = [
        createAnnotation('x-uigen-file-types', { type: 'string', format: 'binary' }),
        createAnnotation('x-uigen-label')
      ];

      const result = getApplicableAnnotations(field, annotations);

      expect(result).toHaveLength(2);
      expect(result.map(a => a.name)).toEqual([
        'x-uigen-file-types',
        'x-uigen-label'
      ]);
    });

    it('should exclude annotations when type matches but format does not', () => {
      const field = createField('string', 'email');
      const annotations = [
        createAnnotation('x-uigen-file-types', { type: 'string', format: 'binary' }),
        createAnnotation('x-uigen-label')
      ];

      const result = getApplicableAnnotations(field, annotations);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('x-uigen-label');
    });

    it('should exclude annotations when format matches but type does not', () => {
      const field = createField('number', 'binary');
      const annotations = [
        createAnnotation('x-uigen-file-types', { type: 'string', format: 'binary' }),
        createAnnotation('x-uigen-label')
      ];

      const result = getApplicableAnnotations(field, annotations);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('x-uigen-label');
    });

    it('should exclude annotations when neither type nor format match', () => {
      const field = createField('number', 'int32');
      const annotations = [
        createAnnotation('x-uigen-file-types', { type: 'string', format: 'binary' }),
        createAnnotation('x-uigen-label')
      ];

      const result = getApplicableAnnotations(field, annotations);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('x-uigen-label');
    });
  });

  describe('real-world scenarios', () => {
    it('should filter file metadata annotations for file type fields', () => {
      const fileField = createField('file');
      const annotations = [
        createAnnotation('x-uigen-file-types', { type: 'file' }),
        createAnnotation('x-uigen-max-file-size', { type: 'file' }),
        createAnnotation('x-uigen-label'),
        createAnnotation('x-uigen-description'),
        createAnnotation('x-uigen-placeholder')
      ];

      const result = getApplicableAnnotations(fileField, annotations);

      expect(result).toHaveLength(5);
      expect(result.map(a => a.name)).toContain('x-uigen-file-types');
      expect(result.map(a => a.name)).toContain('x-uigen-max-file-size');
    });

    it('should filter file metadata annotations for binary format fields', () => {
      const binaryField = createField('string', 'binary');
      const annotations = [
        createAnnotation('x-uigen-file-types', { format: 'binary' }),
        createAnnotation('x-uigen-max-file-size', { format: 'binary' }),
        createAnnotation('x-uigen-label'),
        createAnnotation('x-uigen-description')
      ];

      const result = getApplicableAnnotations(binaryField, annotations);

      expect(result).toHaveLength(4);
      expect(result.map(a => a.name)).toContain('x-uigen-file-types');
      expect(result.map(a => a.name)).toContain('x-uigen-max-file-size');
    });

    it('should exclude file metadata annotations for non-file fields', () => {
      const stringField = createField('string');
      const annotations = [
        createAnnotation('x-uigen-file-types', { type: 'file' }),
        createAnnotation('x-uigen-max-file-size', { type: 'file' }),
        createAnnotation('x-uigen-label'),
        createAnnotation('x-uigen-placeholder')
      ];

      const result = getApplicableAnnotations(stringField, annotations);

      expect(result).toHaveLength(2);
      expect(result.map(a => a.name)).not.toContain('x-uigen-file-types');
      expect(result.map(a => a.name)).not.toContain('x-uigen-max-file-size');
      expect(result.map(a => a.name)).toContain('x-uigen-label');
      expect(result.map(a => a.name)).toContain('x-uigen-placeholder');
    });

    it('should handle mixed annotation types correctly', () => {
      const numberField = createField('number', 'int32');
      const annotations = [
        createAnnotation('x-uigen-file-types', { type: 'file' }),
        createAnnotation('x-uigen-min', { type: 'number' }),
        createAnnotation('x-uigen-max', { type: 'number' }),
        createAnnotation('x-uigen-date-format', { format: 'date' }),
        createAnnotation('x-uigen-label')
      ];

      const result = getApplicableAnnotations(numberField, annotations);

      expect(result).toHaveLength(3);
      expect(result.map(a => a.name)).toEqual([
        'x-uigen-min',
        'x-uigen-max',
        'x-uigen-label'
      ]);
    });
  });

  describe('edge cases', () => {
    it('should handle empty annotations array', () => {
      const field = createField('string');
      const annotations: AnnotationMetadata[] = [];

      const result = getApplicableAnnotations(field, annotations);

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('should handle field with all annotations having no rules', () => {
      const field = createField('string');
      const annotations = [
        createAnnotation('x-uigen-label'),
        createAnnotation('x-uigen-description'),
        createAnnotation('x-uigen-placeholder')
      ];

      const result = getApplicableAnnotations(field, annotations);

      expect(result).toHaveLength(3);
      expect(result).toEqual(annotations);
    });

    it('should handle field with all annotations having rules that do not match', () => {
      const field = createField('string');
      const annotations = [
        createAnnotation('x-uigen-file-types', { type: 'file' }),
        createAnnotation('x-uigen-max-file-size', { type: 'file' }),
        createAnnotation('x-uigen-min', { type: 'number' })
      ];

      const result = getApplicableAnnotations(field, annotations);

      expect(result).toHaveLength(0);
    });

    it('should not mutate the original annotations array', () => {
      const field = createField('string');
      const annotations = [
        createAnnotation('x-uigen-file-types', { type: 'file' }),
        createAnnotation('x-uigen-label')
      ];
      const originalLength = annotations.length;

      getApplicableAnnotations(field, annotations);

      expect(annotations).toHaveLength(originalLength);
    });

    it('should handle annotations with empty applicableWhen object', () => {
      const field = createField('string');
      const annotations = [
        createAnnotation('x-uigen-label', {})
      ];

      const result = getApplicableAnnotations(field, annotations);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('x-uigen-label');
    });
  });
});
