import { describe, it, expect } from 'vitest';
import type { ConfigFile, AnnotationMetadata } from '../index';

describe('Type definitions', () => {
  it('should define ConfigFile interface correctly', () => {
    const config: ConfigFile = {
      version: '1.0',
      enabled: { 'x-uigen-label': true },
      defaults: {},
      annotations: {}
    };
    
    expect(config.version).toBe('1.0');
    expect(config.enabled['x-uigen-label']).toBe(true);
  });

  it('should define AnnotationMetadata interface correctly', () => {
    const metadata: AnnotationMetadata = {
      name: 'x-uigen-label',
      description: 'Test annotation',
      targetType: 'field',
      parameterSchema: {
        type: 'string'
      },
      examples: []
    };
    
    expect(metadata.name).toBe('x-uigen-label');
    expect(metadata.targetType).toBe('field');
  });

  it('should support applicableWhen property with type', () => {
    const metadata: AnnotationMetadata = {
      name: 'x-uigen-file-types',
      description: 'File types annotation',
      targetType: 'field',
      parameterSchema: {
        type: 'object'
      },
      examples: [],
      applicableWhen: {
        type: 'file'
      }
    };
    
    expect(metadata.applicableWhen?.type).toBe('file');
  });

  it('should support applicableWhen property with format', () => {
    const metadata: AnnotationMetadata = {
      name: 'x-uigen-file-types',
      description: 'File types annotation',
      targetType: 'field',
      parameterSchema: {
        type: 'object'
      },
      examples: [],
      applicableWhen: {
        format: 'binary'
      }
    };
    
    expect(metadata.applicableWhen?.format).toBe('binary');
  });

  it('should support applicableWhen property with both type and format', () => {
    const metadata: AnnotationMetadata = {
      name: 'x-uigen-file-types',
      description: 'File types annotation',
      targetType: 'field',
      parameterSchema: {
        type: 'object'
      },
      examples: [],
      applicableWhen: {
        type: 'file',
        format: 'binary'
      }
    };
    
    expect(metadata.applicableWhen?.type).toBe('file');
    expect(metadata.applicableWhen?.format).toBe('binary');
  });

  it('should allow AnnotationMetadata without applicableWhen (optional)', () => {
    const metadata: AnnotationMetadata = {
      name: 'x-uigen-label',
      description: 'Label annotation',
      targetType: 'field',
      parameterSchema: {
        type: 'string'
      },
      examples: []
    };
    
    expect(metadata.applicableWhen).toBeUndefined();
  });
});
