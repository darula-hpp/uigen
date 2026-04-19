import { describe, it, expect, beforeEach } from 'vitest';
import { StrategyRegistry } from '../StrategyRegistry';
import { GenericUploadStrategy } from '../strategies/GenericUploadStrategy';
import { ImageUploadStrategy } from '../strategies/ImageUploadStrategy';
import { DocumentUploadStrategy } from '../strategies/DocumentUploadStrategy';
import { VideoUploadStrategy } from '../strategies/VideoUploadStrategy';

describe('StrategyRegistry - Category-Based Lookup', () => {
  let registry: StrategyRegistry;

  beforeEach(() => {
    registry = StrategyRegistry.getInstance();
    registry.clear();
  });

  describe('registerForCategory', () => {
    it('should register strategy for image category', () => {
      const imageStrategy = new ImageUploadStrategy();
      registry.registerForCategory('image', imageStrategy);

      const result = registry.getStrategy('image');
      expect(result).toBe(imageStrategy);
    });

    it('should register strategy for document category', () => {
      const docStrategy = new DocumentUploadStrategy();
      registry.registerForCategory('document', docStrategy);

      const result = registry.getStrategy('document');
      expect(result).toBe(docStrategy);
    });

    it('should register strategy for video category', () => {
      const videoStrategy = new VideoUploadStrategy();
      registry.registerForCategory('video', videoStrategy);

      const result = registry.getStrategy('video');
      expect(result).toBe(videoStrategy);
    });

    it('should register strategy for audio category', () => {
      const audioStrategy = new GenericUploadStrategy();
      registry.registerForCategory('audio', audioStrategy);

      const result = registry.getStrategy('audio');
      expect(result).toBe(audioStrategy);
    });

    it('should register strategy for generic category', () => {
      const genericStrategy = new GenericUploadStrategy();
      registry.registerForCategory('generic', genericStrategy);

      const result = registry.getStrategy('generic');
      expect(result).toBe(genericStrategy);
    });
  });

  describe('getStrategy with category', () => {
    beforeEach(() => {
      registry.registerForCategory('image', new ImageUploadStrategy());
      registry.registerForCategory('document', new DocumentUploadStrategy());
      registry.registerForCategory('video', new VideoUploadStrategy());
      registry.registerForCategory('generic', new GenericUploadStrategy());
    });

    it('should return image strategy for image category', () => {
      const strategy = registry.getStrategy('image');
      expect(strategy).toBeInstanceOf(ImageUploadStrategy);
    });

    it('should return document strategy for document category', () => {
      const strategy = registry.getStrategy('document');
      expect(strategy).toBeInstanceOf(DocumentUploadStrategy);
    });

    it('should return video strategy for video category', () => {
      const strategy = registry.getStrategy('video');
      expect(strategy).toBeInstanceOf(VideoUploadStrategy);
    });

    it('should return generic strategy for audio category when not registered', () => {
      const strategy = registry.getStrategy('audio');
      expect(strategy).toBeInstanceOf(GenericUploadStrategy);
    });

    it('should return generic strategy for generic category', () => {
      const strategy = registry.getStrategy('generic');
      expect(strategy).toBeInstanceOf(GenericUploadStrategy);
    });
  });

  describe('fallback to generic strategy', () => {
    it('should fall back to generic when category not found', () => {
      const genericStrategy = new GenericUploadStrategy();
      registry.registerForCategory('generic', genericStrategy);

      const result = registry.getStrategy('audio');
      expect(result).toBe(genericStrategy);
    });

    it('should fall back to generic for unregistered categories', () => {
      registry.registerForCategory('image', new ImageUploadStrategy());
      registry.registerForCategory('generic', new GenericUploadStrategy());

      const result = registry.getStrategy('document');
      expect(result).toBeInstanceOf(GenericUploadStrategy);
    });
  });

  describe('error handling', () => {
    it('should throw error when generic strategy is missing', () => {
      registry.registerForCategory('image', new ImageUploadStrategy());

      expect(() => registry.getStrategy('document')).toThrow(
        'No generic fallback strategy registered'
      );
    });

    it('should throw error when no strategies registered', () => {
      expect(() => registry.getStrategy('image')).toThrow(
        'No generic fallback strategy registered'
      );
    });

    it('should throw error with helpful message', () => {
      expect(() => registry.getStrategy('generic')).toThrow(
        'Register a strategy for "generic" file type'
      );
    });
  });

  describe('strategy registration', () => {
    it('should allow overriding existing category registration', () => {
      const strategy1 = new ImageUploadStrategy();
      const strategy2 = new ImageUploadStrategy();

      registry.registerForCategory('image', strategy1);
      registry.registerForCategory('image', strategy2);

      const result = registry.getStrategy('image');
      expect(result).toBe(strategy2);
    });

    it('should maintain separate registrations for different categories', () => {
      const imageStrategy = new ImageUploadStrategy();
      const docStrategy = new DocumentUploadStrategy();
      const genericStrategy = new GenericUploadStrategy();

      registry.registerForCategory('image', imageStrategy);
      registry.registerForCategory('document', docStrategy);
      registry.registerForCategory('generic', genericStrategy);

      expect(registry.getStrategy('image')).toBe(imageStrategy);
      expect(registry.getStrategy('document')).toBe(docStrategy);
      expect(registry.getStrategy('generic')).toBe(genericStrategy);
    });
  });

  describe('clear', () => {
    it('should clear all registered strategies', () => {
      registry.registerForCategory('image', new ImageUploadStrategy());
      registry.registerForCategory('generic', new GenericUploadStrategy());

      registry.clear();

      expect(() => registry.getStrategy('image')).toThrow();
    });
  });
});
