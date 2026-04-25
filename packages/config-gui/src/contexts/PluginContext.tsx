/**
 * Plugin Context Provider
 * 
 * Manages plugin initialization and provides plugin context to the app
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { pluginRegistry } from '../lib/plugin-registry.js';
import { loadPlugins, getPluginConfigFromEnv } from '../lib/plugin-loader.js';
import { useAppContext } from './AppContext.js';
import type { PluginContext } from '../types/plugins.js';

/**
 * Plugin context value
 */
interface PluginContextValue {
  /**
   * Whether plugins have been initialized
   */
  initialized: boolean;
  
  /**
   * Plugin context for use in components
   */
  context: PluginContext;
  
  /**
   * Number of registered plugins
   */
  pluginCount: number;
}

/**
 * React Context for plugin system
 */
const PluginContextReact = createContext<PluginContextValue | undefined>(undefined);

/**
 * Props for PluginProvider
 */
export interface PluginProviderProps {
  children: ReactNode;
  
  /**
   * Skip automatic plugin loading
   * Useful for testing or manual plugin management
   */
  skipAutoLoad?: boolean;
}

/**
 * Provider component for plugin system
 * 
 * Handles:
 * - Loading plugins based on environment
 * - Initializing plugins with app context
 * - Providing plugin context to child components
 */
export function PluginProvider({ children, skipAutoLoad = false }: PluginProviderProps) {
  const { state, actions } = useAppContext();
  const [initialized, setInitialized] = useState(false);
  const [pluginCount, setPluginCount] = useState(0);
  
  // Create plugin context
  const pluginContext: PluginContext = {
    state,
    actions,
    // User and team context would be populated by auth plugins
    user: undefined,
    team: undefined
  };
  
  // Load and initialize plugins on mount
  useEffect(() => {
    if (skipAutoLoad) {
      setInitialized(true);
      return;
    }
    
    const initializePlugins = async () => {
      try {
        // Load plugins based on environment
        const config = getPluginConfigFromEnv();
        await loadPlugins(config);
        
        // Initialize all loaded plugins
        await pluginRegistry.initialize(pluginContext);
        
        setPluginCount(pluginRegistry.getAll().length);
        setInitialized(true);
        
        console.log('[PluginProvider] Plugins initialized successfully');
      } catch (error) {
        console.error('[PluginProvider] Failed to initialize plugins:', error);
        // Don't block app startup if plugins fail to load
        setInitialized(true);
      }
    };
    
    initializePlugins();
  }, [skipAutoLoad]);
  
  // Listen for plugin registry events
  useEffect(() => {
    const handlePluginEvent = (event: import('../types/plugins.js').PluginEvent) => {
      switch (event.type) {
        case 'plugin:registered':
          setPluginCount(prev => prev + 1);
          break;
        case 'plugin:unregistered':
          setPluginCount(prev => prev - 1);
          break;
        case 'plugin:error':
          console.error(`[PluginProvider] Plugin error in "${event.pluginName}":`, event.error);
          break;
      }
    };
    
    pluginRegistry.addEventListener(handlePluginEvent);
    
    return () => {
      pluginRegistry.removeEventListener(handlePluginEvent);
    };
  }, []);
  
  const value: PluginContextValue = {
    initialized,
    context: pluginContext,
    pluginCount
  };
  
  return (
    <PluginContextReact.Provider value={value}>
      {children}
    </PluginContextReact.Provider>
  );
}

/**
 * Hook to access plugin context
 * 
 * @returns Plugin context value
 * @throws Error if used outside PluginProvider
 */
export function usePluginContext(): PluginContextValue {
  const context = useContext(PluginContextReact);
  
  if (!context) {
    throw new Error('usePluginContext must be used within PluginProvider');
  }
  
  return context;
}
