/**
 * Tests for AnnotationConfig type definition
 */

import { describe, it, expect } from 'vitest';
import type { AnnotationConfig, ConfigFile } from '../types.js';

describe('AnnotationConfig type', () => {
  it('should allow x-uigen-profile as boolean', () => {
    const config: AnnotationConfig = {
      'x-uigen-profile': true
    };
    
    expect(config['x-uigen-profile']).toBe(true);
  });
  
  it('should allow x-uigen-profile to be undefined', () => {
    const config: AnnotationConfig = {
      'x-uigen-label': 'Test'
    };
    
    expect(config['x-uigen-profile']).toBeUndefined();
  });
  
  it('should allow multiple annotations together', () => {
    const config: AnnotationConfig = {
      'x-uigen-profile': true,
      'x-uigen-label': 'Profile',
      'x-uigen-ignore': false
    };
    
    expect(config['x-uigen-profile']).toBe(true);
    expect(config['x-uigen-label']).toBe('Profile');
    expect(config['x-uigen-ignore']).toBe(false);
  });
  
  it('should allow custom annotations via index signature', () => {
    const config: AnnotationConfig = {
      'x-uigen-profile': true,
      'x-custom-annotation': 'custom value'
    };
    
    expect(config['x-custom-annotation']).toBe('custom value');
  });
  
  it('should work in ConfigFile annotations field', () => {
    const configFile: ConfigFile = {
      version: '1.0',
      enabled: {},
      defaults: {},
      annotations: {
        '/api/users/me': {
          'x-uigen-profile': true,
          'x-uigen-label': 'My Profile'
        },
        '/api/admin/profile': {
          'x-uigen-profile': false
        }
      }
    };
    
    expect(configFile.annotations['/api/users/me']?.['x-uigen-profile']).toBe(true);
    expect(configFile.annotations['/api/users/me']?.['x-uigen-label']).toBe('My Profile');
    expect(configFile.annotations['/api/admin/profile']?.['x-uigen-profile']).toBe(false);
  });
  
  it('should maintain backward compatibility with Record<string, unknown>', () => {
    // This test ensures that code expecting Record<string, unknown> still works
    const annotations: Record<string, Record<string, unknown>> = {
      '/api/users': {
        'x-uigen-profile': true,
        'x-uigen-label': 'Users'
      }
    };
    
    // Should be assignable to ConfigFile annotations
    const configFile: ConfigFile = {
      version: '1.0',
      enabled: {},
      defaults: {},
      annotations: annotations as Record<string, AnnotationConfig>
    };
    
    expect(configFile.annotations['/api/users']?.['x-uigen-profile']).toBe(true);
  });
});
