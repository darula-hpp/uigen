/**
 * Plugin system type definitions for UIGen Config GUI
 * 
 * Allows extending the config GUI with custom functionality without forking.
 * Useful for SaaS-specific features like user management, team collaboration,
 * usage tracking, etc.
 */

import type { ReactNode, ComponentType } from 'react';
import type { ConfigFile } from '@uigen-dev/core';
import type { AppState, AppActions } from '../contexts/AppContext.js';

/**
 * Context provided to plugins during initialization and lifecycle hooks
 */
export interface PluginContext {
  /**
   * Current application state
   */
  state: AppState;
  
  /**
   * Application actions for state management
   */
  actions: AppActions;
  
  /**
   * User context (for SaaS features)
   * Optional - only available when authentication is enabled
   */
  user?: {
    id: string;
    email: string;
    name?: string;
    permissions: string[];
    subscription?: 'free' | 'pro' | 'enterprise';
    metadata?: Record<string, unknown>;
  };
  
  /**
   * Team context (for SaaS features)
   * Optional - only available when team features are enabled
   */
  team?: {
    id: string;
    name: string;
    members: Array<{
      id: string;
      email: string;
      role: 'owner' | 'admin' | 'member';
    }>;
    metadata?: Record<string, unknown>;
  };
}

/**
 * Props passed to header action components
 */
export interface HeaderActionsProps {
  context: PluginContext;
}

/**
 * Props passed to annotation form extension components
 */
export interface AnnotationFormExtrasProps {
  context: PluginContext;
  annotationName: string;
}

/**
 * Props passed to settings panel components
 */
export interface SettingsPanelProps {
  context: PluginContext;
}

/**
 * Props passed to custom tab components
 */
export interface CustomTabProps {
  context: PluginContext;
}

/**
 * Custom tab definition
 */
export interface CustomTab {
  /**
   * Unique identifier for the tab
   */
  id: string;
  
  /**
   * Display label for the tab
   */
  label: string;
  
  /**
   * Icon component (optional)
   */
  icon?: ComponentType;
  
  /**
   * Tab content component
   */
  component: ComponentType<CustomTabProps>;
  
  /**
   * Whether the tab should be disabled
   * Can be a boolean or a function that receives context
   */
  disabled?: boolean | ((context: PluginContext) => boolean);
  
  /**
   * Order/position of the tab (lower numbers appear first)
   */
  order?: number;
}

/**
 * UI component extensions provided by plugins
 */
export interface PluginComponents {
  /**
   * Additional actions to display in the header
   * (e.g., user menu, notifications, team switcher)
   */
  headerActions?: ComponentType<HeaderActionsProps>;
  
  /**
   * Additional fields/controls to add to annotation forms
   * (e.g., permission controls, audit info)
   */
  annotationFormExtras?: ComponentType<AnnotationFormExtrasProps>;
  
  /**
   * Settings panel for plugin-specific configuration
   */
  settingsPanel?: ComponentType<SettingsPanelProps>;
  
  /**
   * Custom tabs to add to the main navigation
   * (e.g., team management, usage metrics, billing)
   */
  customTabs?: CustomTab[];
}

/**
 * API middleware hooks for intercepting requests/responses
 */
export interface PluginApiMiddleware {
  /**
   * Intercept and modify requests before they are sent
   * Useful for adding authentication headers, team context, etc.
   */
  beforeRequest?: (url: string, options: RequestInit) => RequestInit | Promise<RequestInit>;
  
  /**
   * Intercept and process responses after they are received
   * Useful for error handling, logging, analytics, etc.
   */
  afterResponse?: (response: Response) => Response | Promise<Response>;
  
  /**
   * Handle API errors
   * Return true to prevent default error handling
   */
  onError?: (error: Error, url: string) => boolean | Promise<boolean>;
}

/**
 * Main plugin interface
 */
export interface UIGenPlugin {
  /**
   * Unique plugin identifier
   */
  name: string;
  
  /**
   * Plugin version (semver)
   */
  version: string;
  
  /**
   * Human-readable plugin description
   */
  description?: string;
  
  /**
   * Plugin author/maintainer
   */
  author?: string;
  
  /**
   * Initialize plugin when app starts
   * Called once during app initialization
   */
  onInit?: (context: PluginContext) => void | Promise<void>;
  
  /**
   * Called when plugin is being unloaded/disabled
   * Use for cleanup (e.g., removing event listeners, clearing timers)
   */
  onDestroy?: () => void | Promise<void>;
  
  /**
   * Intercept config loading
   * Can modify or enrich the loaded config
   */
  onConfigLoad?: (config: ConfigFile, context: PluginContext) => ConfigFile | Promise<ConfigFile>;
  
  /**
   * Intercept config saving
   * Can add metadata, validate, or transform the config before saving
   */
  onConfigSave?: (config: ConfigFile, context: PluginContext) => ConfigFile | Promise<ConfigFile>;
  
  /**
   * Called when the active tab changes
   */
  onTabChange?: (tabId: string, context: PluginContext) => void | Promise<void>;
  
  /**
   * UI component extensions
   */
  components?: PluginComponents;
  
  /**
   * API middleware for request/response interception
   */
  apiMiddleware?: PluginApiMiddleware;
  
  /**
   * Custom configuration for the plugin
   * Can be used to store plugin-specific settings
   */
  config?: Record<string, unknown>;
}

/**
 * Plugin registry events
 */
export type PluginEvent = 
  | { type: 'plugin:registered'; plugin: UIGenPlugin }
  | { type: 'plugin:unregistered'; pluginName: string }
  | { type: 'plugin:error'; pluginName: string; error: Error };

/**
 * Plugin event listener
 */
export type PluginEventListener = (event: PluginEvent) => void;
