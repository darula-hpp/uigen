/**
 * React hooks for working with the plugin system
 */

import { useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext.js';
import { pluginRegistry } from '../lib/plugin-registry.js';
import type { PluginContext, CustomTab } from '../types/plugins.js';

/**
 * Hook to get the plugin context
 * Combines app state/actions with user/team context
 * 
 * @returns Plugin context object
 */
export function usePluginContext(): PluginContext {
  const { state, actions } = useAppContext();
  
  return useMemo(() => ({
    state,
    actions,
    // User and team context would be populated by auth plugins
    // For now, these are undefined in the base system
    user: undefined,
    team: undefined
  }), [state, actions]);
}

/**
 * Hook to get all registered plugins
 * 
 * @returns Array of all plugins and context
 */
export function usePlugins() {
  const context = usePluginContext();
  
  return useMemo(() => ({
    plugins: pluginRegistry.getAll(),
    context
  }), [context]);
}

/**
 * Hook to get components from a specific plugin slot
 * 
 * @param slot - Component slot name
 * @returns Array of components for that slot
 */
export function usePluginComponents<K extends keyof NonNullable<import('../types/plugins.js').UIGenPlugin['components']>>(
  slot: K
) {
  const context = usePluginContext();
  
  return useMemo(() => ({
    components: pluginRegistry.getComponents(slot),
    context
  }), [slot, context]);
}

/**
 * Hook to get custom tabs from all plugins
 * 
 * @returns Array of custom tabs, sorted by order
 */
export function useCustomTabs() {
  const context = usePluginContext();
  
  return useMemo(() => {
    const tabs = pluginRegistry.getCustomTabs();
    
    // Filter out disabled tabs
    return tabs.filter(tab => {
      if (typeof tab.disabled === 'function') {
        return !tab.disabled(context);
      }
      return !tab.disabled;
    });
  }, [context]);
}

/**
 * Hook to check if a specific plugin is registered
 * 
 * @param pluginName - Name of the plugin
 * @returns true if plugin is registered
 */
export function useHasPlugin(pluginName: string): boolean {
  return useMemo(() => pluginRegistry.has(pluginName), [pluginName]);
}

/**
 * Hook to get plugin registry statistics
 * Useful for debugging and admin panels
 * 
 * @returns Plugin registry stats
 */
export function usePluginStats() {
  return useMemo(() => pluginRegistry.getStats(), []);
}
