/**
 * Layout Preferences Persistence Utilities
 * 
 * Provides utilities for saving and loading layout preferences to/from localStorage.
 * Preferences are scoped per application to avoid conflicts.
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */

import type { LayoutType } from '@uigen-dev/core';

/**
 * Layout preferences structure
 */
export interface LayoutPreferences {
  /** Whether the sidebar is collapsed */
  sidebarCollapsed?: boolean;
  
  /** Selected layout type (if user-configurable) */
  selectedLayoutType?: LayoutType;
  
  /** Custom layout metadata preferences */
  metadata?: Record<string, unknown>;
}

/**
 * Generate storage key scoped to the application
 */
function getStorageKey(appId: string): string {
  return `uigen_layout_prefs_${appId}`;
}

/**
 * Save layout preferences to localStorage
 * 
 * @param appId - Application identifier (e.g., app title or unique ID)
 * @param preferences - Layout preferences to save
 * 
 * @example
 * ```typescript
 * saveLayoutPreferences('my-app', {
 *   sidebarCollapsed: true,
 *   selectedLayoutType: 'sidebar'
 * });
 * ```
 */
export function saveLayoutPreferences(
  appId: string,
  preferences: LayoutPreferences
): void {
  try {
    const key = getStorageKey(appId);
    const serialized = JSON.stringify(preferences);
    localStorage.setItem(key, serialized);
  } catch (error) {
    console.warn('[LayoutPreferences] Failed to save preferences:', error);
  }
}

/**
 * Load layout preferences from localStorage
 * 
 * @param appId - Application identifier (e.g., app title or unique ID)
 * @returns Layout preferences or undefined if not found or invalid
 * 
 * @example
 * ```typescript
 * const prefs = loadLayoutPreferences('my-app');
 * if (prefs) {
 *   console.log('Sidebar collapsed:', prefs.sidebarCollapsed);
 * }
 * ```
 */
export function loadLayoutPreferences(
  appId: string
): LayoutPreferences | undefined {
  try {
    const key = getStorageKey(appId);
    const serialized = localStorage.getItem(key);
    
    if (!serialized) {
      return undefined;
    }
    
    const parsed = JSON.parse(serialized);
    
    // Validate structure
    if (typeof parsed !== 'object' || parsed === null) {
      console.warn('[LayoutPreferences] Invalid preferences structure');
      return undefined;
    }
    
    return parsed as LayoutPreferences;
  } catch (error) {
    console.warn('[LayoutPreferences] Failed to load preferences:', error);
    return undefined;
  }
}

/**
 * Clear layout preferences from localStorage
 * 
 * @param appId - Application identifier (e.g., app title or unique ID)
 * 
 * @example
 * ```typescript
 * clearLayoutPreferences('my-app');
 * ```
 */
export function clearLayoutPreferences(appId: string): void {
  try {
    const key = getStorageKey(appId);
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('[LayoutPreferences] Failed to clear preferences:', error);
  }
}

/**
 * Update specific layout preference fields
 * 
 * @param appId - Application identifier
 * @param updates - Partial preferences to update
 * 
 * @example
 * ```typescript
 * updateLayoutPreferences('my-app', {
 *   sidebarCollapsed: false
 * });
 * ```
 */
export function updateLayoutPreferences(
  appId: string,
  updates: Partial<LayoutPreferences>
): void {
  const existing = loadLayoutPreferences(appId) || {};
  const merged = { ...existing, ...updates };
  saveLayoutPreferences(appId, merged);
}
