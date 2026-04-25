/**
 * Plugin loader utility
 * 
 * Handles dynamic loading of plugins based on environment configuration
 */

import { pluginRegistry } from './plugin-registry.js';
import type { UIGenPlugin } from '../types/plugins.js';

/**
 * Plugin loader configuration
 */
export interface PluginLoaderConfig {
  /**
   * Edition of the app (oss, saas, enterprise, etc.)
   */
  edition?: string;
  
  /**
   * Explicitly enabled plugins
   */
  enabledPlugins?: string[];
  
  /**
   * Explicitly disabled plugins
   */
  disabledPlugins?: string[];
  
  /**
   * Custom plugin loader function
   * Allows for dynamic plugin loading based on custom logic
   */
  customLoader?: () => Promise<UIGenPlugin[]>;
}

/**
 * Load plugins based on configuration
 * 
 * @param config - Plugin loader configuration
 */
export async function loadPlugins(config: PluginLoaderConfig = {}): Promise<void> {
  const {
    edition = import.meta.env.VITE_EDITION || 'oss',
    enabledPlugins = [],
    disabledPlugins = [],
    customLoader
  } = config;
  
  console.log(`[PluginLoader] Loading plugins for edition: ${edition}`);
  
  // If custom loader is provided, use it
  if (customLoader) {
    try {
      const plugins = await customLoader();
      for (const plugin of plugins) {
        if (!disabledPlugins.includes(plugin.name)) {
          pluginRegistry.register(plugin);
        }
      }
      return;
    } catch (error) {
      console.error('[PluginLoader] Error loading plugins from custom loader:', error);
      return;
    }
  }
  
  // Load plugins based on edition
  switch (edition) {
    case 'oss':
      // OSS edition: no plugins by default
      console.log('[PluginLoader] OSS edition - no plugins loaded');
      break;
      
    case 'saas':
      // SaaS edition: load SaaS plugins
      await loadSaaSPlugins(disabledPlugins);
      break;
      
    case 'enterprise':
      // Enterprise edition: load enterprise plugins
      await loadEnterprisePlugins(disabledPlugins);
      break;
      
    default:
      console.warn(`[PluginLoader] Unknown edition: ${edition}`);
  }
  
  // Load explicitly enabled plugins
  for (const pluginName of enabledPlugins) {
    if (!disabledPlugins.includes(pluginName)) {
      await loadPluginByName(pluginName);
    }
  }
}

/**
 * Load SaaS-specific plugins
 * 
 * @param disabledPlugins - List of disabled plugin names
 */
async function loadSaaSPlugins(disabledPlugins: string[]): Promise<void> {
  try {
    // Dynamically import SaaS plugins
    // This will only work if the plugins directory exists
    const module = await import('../plugins/saas/index.js').catch(() => null);
    
    if (!module || !module.saasPlugins) {
      console.log('[PluginLoader] No SaaS plugins found (this is normal for OSS builds)');
      return;
    }
    
    const { saasPlugins } = module;
    
    for (const plugin of saasPlugins) {
      if (!disabledPlugins.includes(plugin.name)) {
        pluginRegistry.register(plugin);
      }
    }
    
    console.log(`[PluginLoader] Loaded ${saasPlugins.length} SaaS plugin(s)`);
  } catch (error) {
    // Silently fail if plugins don't exist
    // This is expected in OSS builds
    console.log('[PluginLoader] No SaaS plugins found (this is normal for OSS builds)');
  }
}

/**
 * Load enterprise-specific plugins
 * 
 * @param disabledPlugins - List of disabled plugin names
 */
async function loadEnterprisePlugins(disabledPlugins: string[]): Promise<void> {
  try {
    // Dynamically import enterprise plugins
    const module = await import('../plugins/enterprise/index.js').catch(() => null);
    
    if (!module || !module.enterprisePlugins) {
      console.log('[PluginLoader] No enterprise plugins found');
      return;
    }
    
    const { enterprisePlugins } = module;
    
    for (const plugin of enterprisePlugins) {
      if (!disabledPlugins.includes(plugin.name)) {
        pluginRegistry.register(plugin);
      }
    }
    
    console.log(`[PluginLoader] Loaded ${enterprisePlugins.length} enterprise plugin(s)`);
  } catch (error) {
    console.log('[PluginLoader] No enterprise plugins found');
  }
}

/**
 * Load a specific plugin by name
 * 
 * @param pluginName - Name of the plugin to load
 */
async function loadPluginByName(pluginName: string): Promise<void> {
  try {
    // Try to dynamically import the plugin
    const module = await import(`../plugins/${pluginName}/index.js`);
    
    if (module.default) {
      pluginRegistry.register(module.default);
      console.log(`[PluginLoader] Loaded plugin: ${pluginName}`);
    } else {
      console.warn(`[PluginLoader] Plugin "${pluginName}" does not export a default plugin`);
    }
  } catch (error) {
    console.error(`[PluginLoader] Failed to load plugin "${pluginName}":`, error);
  }
}

/**
 * Get plugin loader configuration from environment variables
 * 
 * @returns Plugin loader configuration
 */
export function getPluginConfigFromEnv(): PluginLoaderConfig {
  return {
    edition: import.meta.env.VITE_EDITION,
    enabledPlugins: import.meta.env.VITE_ENABLED_PLUGINS?.split(',').map((s: string) => s.trim()).filter(Boolean),
    disabledPlugins: import.meta.env.VITE_DISABLED_PLUGINS?.split(',').map((s: string) => s.trim()).filter(Boolean)
  };
}
