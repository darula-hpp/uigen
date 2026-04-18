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
});
