/**
 * Unit tests for layout preferences persistence
 * Tests Requirements 10.1, 10.2, 10.3, 10.4, 10.5
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  saveLayoutPreferences,
  loadLayoutPreferences,
  clearLayoutPreferences,
  updateLayoutPreferences,
  type LayoutPreferences,
} from '../layout-preferences';

describe('Layout Preferences Persistence', () => {
  const testAppId = 'test-app';
  const storageKey = `uigen_layout_prefs_${testAppId}`;
  
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });
  
  afterEach(() => {
    // Clean up after each test
    localStorage.clear();
  });

  /**
   * Requirement 10.1: Store layout preferences in localStorage
   */
  describe('saveLayoutPreferences', () => {
    it('should save preferences to localStorage', () => {
      const prefs: LayoutPreferences = {
        sidebarCollapsed: true,
        selectedLayoutType: 'sidebar',
      };
      
      saveLayoutPreferences(testAppId, prefs);
      
      const stored = localStorage.getItem(storageKey);
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toEqual(prefs);
    });

    it('should save preferences with metadata', () => {
      const prefs: LayoutPreferences = {
        sidebarCollapsed: false,
        selectedLayoutType: 'centered',
        metadata: {
          customSetting: 'value',
          numericSetting: 42,
        },
      };
      
      saveLayoutPreferences(testAppId, prefs);
      
      const stored = localStorage.getItem(storageKey);
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toEqual(prefs);
    });

    it('should overwrite existing preferences', () => {
      const prefs1: LayoutPreferences = {
        sidebarCollapsed: true,
      };
      const prefs2: LayoutPreferences = {
        sidebarCollapsed: false,
        selectedLayoutType: 'dashboard-grid',
      };
      
      saveLayoutPreferences(testAppId, prefs1);
      saveLayoutPreferences(testAppId, prefs2);
      
      const stored = localStorage.getItem(storageKey);
      expect(JSON.parse(stored!)).toEqual(prefs2);
    });

    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage.setItem to throw an error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = () => {
        throw new Error('Storage quota exceeded');
      };
      
      // Should not throw
      expect(() => {
        saveLayoutPreferences(testAppId, { sidebarCollapsed: true });
      }).not.toThrow();
      
      // Restore original
      localStorage.setItem = originalSetItem;
    });
  });

  /**
   * Requirement 10.2: Restore layout preferences on application load
   */
  describe('loadLayoutPreferences', () => {
    it('should load preferences from localStorage', () => {
      const prefs: LayoutPreferences = {
        sidebarCollapsed: true,
        selectedLayoutType: 'sidebar',
      };
      
      localStorage.setItem(storageKey, JSON.stringify(prefs));
      
      const loaded = loadLayoutPreferences(testAppId);
      expect(loaded).toEqual(prefs);
    });

    it('should return undefined when no preferences exist', () => {
      const loaded = loadLayoutPreferences(testAppId);
      expect(loaded).toBeUndefined();
    });

    it('should return undefined for invalid JSON', () => {
      localStorage.setItem(storageKey, 'invalid json{');
      
      const loaded = loadLayoutPreferences(testAppId);
      expect(loaded).toBeUndefined();
    });

    it('should return undefined for non-object preferences', () => {
      localStorage.setItem(storageKey, JSON.stringify('string value'));
      
      const loaded = loadLayoutPreferences(testAppId);
      expect(loaded).toBeUndefined();
    });

    it('should return undefined for null preferences', () => {
      localStorage.setItem(storageKey, JSON.stringify(null));
      
      const loaded = loadLayoutPreferences(testAppId);
      expect(loaded).toBeUndefined();
    });

    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage.getItem to throw an error
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = () => {
        throw new Error('Storage access denied');
      };
      
      const loaded = loadLayoutPreferences(testAppId);
      expect(loaded).toBeUndefined();
      
      // Restore original
      localStorage.getItem = originalGetItem;
    });
  });

  /**
   * Requirement 10.5: Preferences scoped per application
   */
  describe('Application scoping', () => {
    it('should scope preferences per application', () => {
      const app1Id = 'app1';
      const app2Id = 'app2';
      
      const prefs1: LayoutPreferences = {
        sidebarCollapsed: true,
      };
      const prefs2: LayoutPreferences = {
        sidebarCollapsed: false,
      };
      
      saveLayoutPreferences(app1Id, prefs1);
      saveLayoutPreferences(app2Id, prefs2);
      
      const loaded1 = loadLayoutPreferences(app1Id);
      const loaded2 = loadLayoutPreferences(app2Id);
      
      expect(loaded1).toEqual(prefs1);
      expect(loaded2).toEqual(prefs2);
      expect(loaded1).not.toEqual(loaded2);
    });

    it('should not interfere with other app preferences', () => {
      const app1Id = 'app1';
      const app2Id = 'app2';
      
      saveLayoutPreferences(app1Id, { sidebarCollapsed: true });
      saveLayoutPreferences(app2Id, { sidebarCollapsed: false });
      
      clearLayoutPreferences(app1Id);
      
      expect(loadLayoutPreferences(app1Id)).toBeUndefined();
      expect(loadLayoutPreferences(app2Id)).toEqual({ sidebarCollapsed: false });
    });
  });

  /**
   * Requirement 10.3: Store sidebar collapse state
   */
  describe('Sidebar collapse state', () => {
    it('should store sidebar collapsed state', () => {
      saveLayoutPreferences(testAppId, { sidebarCollapsed: true });
      
      const loaded = loadLayoutPreferences(testAppId);
      expect(loaded?.sidebarCollapsed).toBe(true);
    });

    it('should store sidebar expanded state', () => {
      saveLayoutPreferences(testAppId, { sidebarCollapsed: false });
      
      const loaded = loadLayoutPreferences(testAppId);
      expect(loaded?.sidebarCollapsed).toBe(false);
    });
  });

  /**
   * Requirement 10.4: Store selected layout type
   */
  describe('Selected layout type', () => {
    it('should store selected layout type', () => {
      saveLayoutPreferences(testAppId, { selectedLayoutType: 'centered' });
      
      const loaded = loadLayoutPreferences(testAppId);
      expect(loaded?.selectedLayoutType).toBe('centered');
    });

    it('should store custom layout type', () => {
      saveLayoutPreferences(testAppId, { selectedLayoutType: 'custom-layout' as any });
      
      const loaded = loadLayoutPreferences(testAppId);
      expect(loaded?.selectedLayoutType).toBe('custom-layout');
    });
  });

  /**
   * Clear preferences functionality
   */
  describe('clearLayoutPreferences', () => {
    it('should clear preferences from localStorage', () => {
      saveLayoutPreferences(testAppId, { sidebarCollapsed: true });
      
      expect(loadLayoutPreferences(testAppId)).toBeTruthy();
      
      clearLayoutPreferences(testAppId);
      
      expect(loadLayoutPreferences(testAppId)).toBeUndefined();
    });

    it('should not throw when clearing non-existent preferences', () => {
      expect(() => {
        clearLayoutPreferences(testAppId);
      }).not.toThrow();
    });

    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage.removeItem to throw an error
      const originalRemoveItem = localStorage.removeItem;
      localStorage.removeItem = () => {
        throw new Error('Storage access denied');
      };
      
      expect(() => {
        clearLayoutPreferences(testAppId);
      }).not.toThrow();
      
      // Restore original
      localStorage.removeItem = originalRemoveItem;
    });
  });

  /**
   * Update preferences functionality
   */
  describe('updateLayoutPreferences', () => {
    it('should update existing preferences', () => {
      saveLayoutPreferences(testAppId, {
        sidebarCollapsed: true,
        selectedLayoutType: 'sidebar',
      });
      
      updateLayoutPreferences(testAppId, {
        sidebarCollapsed: false,
      });
      
      const loaded = loadLayoutPreferences(testAppId);
      expect(loaded).toEqual({
        sidebarCollapsed: false,
        selectedLayoutType: 'sidebar',
      });
    });

    it('should create preferences if none exist', () => {
      updateLayoutPreferences(testAppId, {
        sidebarCollapsed: true,
      });
      
      const loaded = loadLayoutPreferences(testAppId);
      expect(loaded).toEqual({
        sidebarCollapsed: true,
      });
    });

    it('should merge multiple updates', () => {
      updateLayoutPreferences(testAppId, {
        sidebarCollapsed: true,
      });
      
      updateLayoutPreferences(testAppId, {
        selectedLayoutType: 'centered',
      });
      
      const loaded = loadLayoutPreferences(testAppId);
      expect(loaded).toEqual({
        sidebarCollapsed: true,
        selectedLayoutType: 'centered',
      });
    });

    it('should update metadata', () => {
      saveLayoutPreferences(testAppId, {
        sidebarCollapsed: true,
        metadata: {
          setting1: 'value1',
        },
      });
      
      updateLayoutPreferences(testAppId, {
        metadata: {
          setting2: 'value2',
        },
      });
      
      const loaded = loadLayoutPreferences(testAppId);
      expect(loaded).toEqual({
        sidebarCollapsed: true,
        metadata: {
          setting2: 'value2',
        },
      });
    });
  });

  /**
   * Round-trip persistence
   */
  describe('Round-trip persistence', () => {
    it('should preserve all preference fields through save and load', () => {
      const prefs: LayoutPreferences = {
        sidebarCollapsed: true,
        selectedLayoutType: 'dashboard-grid',
        metadata: {
          customField: 'value',
          nestedObject: {
            key: 'value',
          },
          arrayField: [1, 2, 3],
        },
      };
      
      saveLayoutPreferences(testAppId, prefs);
      const loaded = loadLayoutPreferences(testAppId);
      
      expect(loaded).toEqual(prefs);
    });

    it('should handle empty preferences object', () => {
      const prefs: LayoutPreferences = {};
      
      saveLayoutPreferences(testAppId, prefs);
      const loaded = loadLayoutPreferences(testAppId);
      
      expect(loaded).toEqual(prefs);
    });
  });
});
