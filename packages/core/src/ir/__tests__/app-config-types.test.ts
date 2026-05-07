import { describe, it, expect } from 'vitest';
import type { AppConfig, UIGenApp } from '../types.js';

describe('AppConfig Types', () => {
  describe('AppConfig interface', () => {
    it('should allow empty object', () => {
      const config: AppConfig = {};
      expect(config).toBeDefined();
    });

    it('should allow name only', () => {
      const config: AppConfig = {
        name: 'My Application',
      };
      expect(config.name).toBe('My Application');
    });

    it('should allow icon only', () => {
      const config: AppConfig = {
        icon: '/assets/logo.svg',
      };
      expect(config.icon).toBe('/assets/logo.svg');
    });

    it('should allow both name and icon', () => {
      const config: AppConfig = {
        name: 'My Application',
        icon: '/assets/logo.svg',
      };
      expect(config.name).toBe('My Application');
      expect(config.icon).toBe('/assets/logo.svg');
    });

    it('should allow arbitrary metadata via index signature', () => {
      const config: AppConfig = {
        name: 'My Application',
        icon: '/assets/logo.svg',
        customField: 'custom value',
        anotherField: 123,
      };
      expect(config.customField).toBe('custom value');
      expect(config.anotherField).toBe(123);
    });
  });

  describe('UIGenApp interface', () => {
    it('should allow appConfig property', () => {
      const app: Partial<UIGenApp> = {
        appConfig: {
          name: 'My Application',
          icon: '/assets/logo.svg',
        },
      };
      expect(app.appConfig?.name).toBe('My Application');
      expect(app.appConfig?.icon).toBe('/assets/logo.svg');
    });

    it('should allow undefined appConfig', () => {
      const app: Partial<UIGenApp> = {
        appConfig: undefined,
      };
      expect(app.appConfig).toBeUndefined();
    });

    it('should allow missing appConfig', () => {
      const app: Partial<UIGenApp> = {};
      expect(app.appConfig).toBeUndefined();
    });
  });
});
