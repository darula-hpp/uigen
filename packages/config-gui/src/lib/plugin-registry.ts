/**
 * Plugin Registry for managing UIGen Config GUI plugins
 * 
 * Provides a centralized system for:
 * - Registering and unregistering plugins
 * - Executing plugin lifecycle hooks
 * - Accessing plugin components
 * - Managing plugin events
 */

import type { 
  UIGenPlugin, 
  PluginContext, 
  PluginEvent, 
  PluginEventListener,
  CustomTab
} from '../types/plugins.js';
import type { ConfigFile } from '@uigen-dev/core';

/**
 * Singleton registry for managing plugins
 */
class PluginRegistry {
  private plugins: Map<string, UIGenPlugin> = new Map();
  private eventListeners: Set<PluginEventListener> = new Set();
  private initialized = false;
  
  /**
   * Register a plugin
   * 
   * @param plugin - Plugin to register
   * @throws Error if plugin with same name already exists
   */
  register(plugin: UIGenPlugin): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already registered`);
    }
    
    this.plugins.set(plugin.name, plugin);
    this.emit({ type: 'plugin:registered', plugin });
    
    console.log(`[PluginRegistry] Registered plugin: ${plugin.name} v${plugin.version}`);
  }
  
  /**
   * Unregister a plugin
   * 
   * @param pluginName - Name of plugin to unregister
   * @returns true if plugin was unregistered, false if not found
   */
  async unregister(pluginName: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginName);
    
    if (!plugin) {
      return false;
    }
    
    // Call onDestroy hook if it exists
    try {
      if (plugin.onDestroy) {
        await plugin.onDestroy();
      }
    } catch (error) {
      console.error(`[PluginRegistry] Error destroying plugin "${pluginName}":`, error);
      this.emit({ 
        type: 'plugin:error', 
        pluginName, 
        error: error instanceof Error ? error : new Error(String(error))
      });
    }
    
    this.plugins.delete(pluginName);
    this.emit({ type: 'plugin:unregistered', pluginName });
    
    console.log(`[PluginRegistry] Unregistered plugin: ${pluginName}`);
    return true;
  }
  
  /**
   * Get a specific plugin by name
   * 
   * @param name - Plugin name
   * @returns Plugin or undefined if not found
   */
  get(name: string): UIGenPlugin | undefined {
    return this.plugins.get(name);
  }
  
  /**
   * Get all registered plugins
   * 
   * @returns Array of all plugins
   */
  getAll(): UIGenPlugin[] {
    return Array.from(this.plugins.values());
  }
  
  /**
   * Check if a plugin is registered
   * 
   * @param name - Plugin name
   * @returns true if plugin is registered
   */
  has(name: string): boolean {
    return this.plugins.has(name);
  }
  
  /**
   * Get all components of a specific type from all plugins
   * 
   * @param slot - Component slot name
   * @returns Array of components
   */
  getComponents<K extends keyof NonNullable<UIGenPlugin['components']>>(
    slot: K
  ): NonNullable<NonNullable<UIGenPlugin['components']>[K]>[] {
    return this.getAll()
      .map(p => p.components?.[slot])
      .filter((component): component is NonNullable<NonNullable<UIGenPlugin['components']>[K]> => 
        component !== undefined && component !== null
      );
  }
  
  /**
   * Get all custom tabs from all plugins, sorted by order
   * 
   * @returns Array of custom tabs sorted by order
   */
  getCustomTabs(): CustomTab[] {
    const tabs = this.getAll()
      .flatMap(p => p.components?.customTabs ?? []);
    
    // Sort by order (lower numbers first), then by label
    return tabs.sort((a, b) => {
      const orderA = a.order ?? 999;
      const orderB = b.order ?? 999;
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      return a.label.localeCompare(b.label);
    });
  }
  
  /**
   * Initialize all plugins
   * Should be called once during app startup
   * 
   * @param context - Plugin context
   */
  async initialize(context: PluginContext): Promise<void> {
    if (this.initialized) {
      console.warn('[PluginRegistry] Already initialized');
      return;
    }
    
    console.log(`[PluginRegistry] Initializing ${this.plugins.size} plugin(s)...`);
    
    for (const plugin of this.getAll()) {
      if (plugin.onInit) {
        try {
          await plugin.onInit(context);
          console.log(`[PluginRegistry] Initialized plugin: ${plugin.name}`);
        } catch (error) {
          console.error(`[PluginRegistry] Error initializing plugin "${plugin.name}":`, error);
          this.emit({ 
            type: 'plugin:error', 
            pluginName: plugin.name, 
            error: error instanceof Error ? error : new Error(String(error))
          });
        }
      }
    }
    
    this.initialized = true;
  }
  
  /**
   * Execute a lifecycle hook on all plugins
   * 
   * @param hookName - Name of the hook to execute
   * @param context - Plugin context
   * @param args - Additional arguments
   */
  async executeHook<K extends keyof UIGenPlugin>(
    hookName: K,
    context: PluginContext,
    ...args: unknown[]
  ): Promise<void> {
    for (const plugin of this.getAll()) {
      const hook = plugin[hookName];
      
      if (typeof hook === 'function') {
        try {
          await (hook as Function)(context, ...args);
        } catch (error) {
          console.error(`[PluginRegistry] Error executing hook "${String(hookName)}" on plugin "${plugin.name}":`, error);
          this.emit({ 
            type: 'plugin:error', 
            pluginName: plugin.name, 
            error: error instanceof Error ? error : new Error(String(error))
          });
        }
      }
    }
  }
  
  /**
   * Execute onConfigLoad hooks on all plugins
   * Plugins can modify or enrich the loaded config
   * 
   * @param config - Loaded config
   * @param context - Plugin context
   * @returns Modified config
   */
  async executeConfigLoadHooks(config: ConfigFile, context: PluginContext): Promise<ConfigFile> {
    let modifiedConfig = config;
    
    for (const plugin of this.getAll()) {
      if (plugin.onConfigLoad) {
        try {
          modifiedConfig = await plugin.onConfigLoad(modifiedConfig, context);
        } catch (error) {
          console.error(`[PluginRegistry] Error executing onConfigLoad on plugin "${plugin.name}":`, error);
          this.emit({ 
            type: 'plugin:error', 
            pluginName: plugin.name, 
            error: error instanceof Error ? error : new Error(String(error))
          });
        }
      }
    }
    
    return modifiedConfig;
  }
  
  /**
   * Execute onConfigSave hooks on all plugins
   * Plugins can add metadata or transform the config before saving
   * 
   * @param config - Config to save
   * @param context - Plugin context
   * @returns Modified config
   */
  async executeConfigSaveHooks(config: ConfigFile, context: PluginContext): Promise<ConfigFile> {
    let modifiedConfig = config;
    
    for (const plugin of this.getAll()) {
      if (plugin.onConfigSave) {
        try {
          modifiedConfig = await plugin.onConfigSave(modifiedConfig, context);
        } catch (error) {
          console.error(`[PluginRegistry] Error executing onConfigSave on plugin "${plugin.name}":`, error);
          this.emit({ 
            type: 'plugin:error', 
            pluginName: plugin.name, 
            error: error instanceof Error ? error : new Error(String(error))
          });
        }
      }
    }
    
    return modifiedConfig;
  }
  
  /**
   * Execute onTabChange hooks on all plugins
   * 
   * @param tabId - ID of the new active tab
   * @param context - Plugin context
   */
  async executeTabChangeHooks(tabId: string, context: PluginContext): Promise<void> {
    for (const plugin of this.getAll()) {
      if (plugin.onTabChange) {
        try {
          await plugin.onTabChange(tabId, context);
        } catch (error) {
          console.error(`[PluginRegistry] Error executing onTabChange on plugin "${plugin.name}":`, error);
          this.emit({ 
            type: 'plugin:error', 
            pluginName: plugin.name, 
            error: error instanceof Error ? error : new Error(String(error))
          });
        }
      }
    }
  }
  
  /**
   * Execute API middleware beforeRequest hooks
   * 
   * @param url - Request URL
   * @param options - Request options
   * @returns Modified request options
   */
  async executeBeforeRequestHooks(url: string, options: RequestInit): Promise<RequestInit> {
    let modifiedOptions = options;
    
    for (const plugin of this.getAll()) {
      if (plugin.apiMiddleware?.beforeRequest) {
        try {
          modifiedOptions = await plugin.apiMiddleware.beforeRequest(url, modifiedOptions);
        } catch (error) {
          console.error(`[PluginRegistry] Error executing beforeRequest on plugin "${plugin.name}":`, error);
          this.emit({ 
            type: 'plugin:error', 
            pluginName: plugin.name, 
            error: error instanceof Error ? error : new Error(String(error))
          });
        }
      }
    }
    
    return modifiedOptions;
  }
  
  /**
   * Execute API middleware afterResponse hooks
   * 
   * @param response - Response object
   * @returns Modified response
   */
  async executeAfterResponseHooks(response: Response): Promise<Response> {
    let modifiedResponse = response;
    
    for (const plugin of this.getAll()) {
      if (plugin.apiMiddleware?.afterResponse) {
        try {
          modifiedResponse = await plugin.apiMiddleware.afterResponse(modifiedResponse);
        } catch (error) {
          console.error(`[PluginRegistry] Error executing afterResponse on plugin "${plugin.name}":`, error);
          this.emit({ 
            type: 'plugin:error', 
            pluginName: plugin.name, 
            error: error instanceof Error ? error : new Error(String(error))
          });
        }
      }
    }
    
    return modifiedResponse;
  }
  
  /**
   * Execute API middleware onError hooks
   * 
   * @param error - Error object
   * @param url - Request URL
   * @returns true if error was handled by a plugin
   */
  async executeErrorHooks(error: Error, url: string): Promise<boolean> {
    for (const plugin of this.getAll()) {
      if (plugin.apiMiddleware?.onError) {
        try {
          const handled = await plugin.apiMiddleware.onError(error, url);
          if (handled) {
            return true;
          }
        } catch (hookError) {
          console.error(`[PluginRegistry] Error executing onError on plugin "${plugin.name}":`, hookError);
          this.emit({ 
            type: 'plugin:error', 
            pluginName: plugin.name, 
            error: hookError instanceof Error ? hookError : new Error(String(hookError))
          });
        }
      }
    }
    
    return false;
  }
  
  /**
   * Add an event listener
   * 
   * @param listener - Event listener function
   */
  addEventListener(listener: PluginEventListener): void {
    this.eventListeners.add(listener);
  }
  
  /**
   * Remove an event listener
   * 
   * @param listener - Event listener function
   */
  removeEventListener(listener: PluginEventListener): void {
    this.eventListeners.delete(listener);
  }
  
  /**
   * Emit an event to all listeners
   * 
   * @param event - Event to emit
   */
  private emit(event: PluginEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('[PluginRegistry] Error in event listener:', error);
      }
    }
  }
  
  /**
   * Clear all plugins and reset registry
   * Useful for testing
   */
  async clear(): Promise<void> {
    const pluginNames = Array.from(this.plugins.keys());
    
    for (const name of pluginNames) {
      await this.unregister(name);
    }
    
    this.initialized = false;
    this.eventListeners.clear();
  }
  
  /**
   * Get registry statistics
   */
  getStats() {
    return {
      totalPlugins: this.plugins.size,
      initialized: this.initialized,
      plugins: this.getAll().map(p => ({
        name: p.name,
        version: p.version,
        description: p.description,
        hasComponents: !!p.components,
        hasApiMiddleware: !!p.apiMiddleware,
        customTabsCount: p.components?.customTabs?.length ?? 0
      }))
    };
  }
}

/**
 * Singleton instance of the plugin registry
 */
export const pluginRegistry = new PluginRegistry();
