/**
 * Example plugin demonstrating the plugin system
 * 
 * This is a reference implementation showing how to create plugins.
 * Copy this file to create your own plugins.
 * 
 * For SaaS/Enterprise plugins, create them in:
 * - src/plugins/saas/
 * - src/plugins/enterprise/
 * 
 * These directories are gitignored to keep proprietary code separate.
 */

import type { UIGenPlugin, CustomTabProps } from '../types/plugins.js';

/**
 * Example header action component
 */
function ExampleHeaderAction({ context }: { context: import('../types/plugins.js').PluginContext }) {
  const handleClick = () => {
    console.log('Example plugin action clicked!');
    console.log('Current config:', context.state.config);
  };
  
  return null; // Replace with actual JSX when building UI
}

/**
 * Example custom tab component
 */
function ExampleTab({ context }: CustomTabProps) {
  const handleTestError = () => {
    context.actions.setError('This is a test error from the example plugin');
  };
  
  const handleClearError = () => {
    context.actions.clearError();
  };
  
  return null; // Replace with actual JSX when building UI
}

/**
 * Example plugin implementation
 */
export const examplePlugin: UIGenPlugin = {
  name: 'example-plugin',
  version: '1.0.0',
  description: 'Example plugin demonstrating the plugin system',
  author: 'UIGen Team',
  
  /**
   * Initialize plugin
   */
  onInit: async (context) => {
    console.log('[ExamplePlugin] Initializing...');
    console.log('[ExamplePlugin] Config version:', context.state.config?.version);
    console.log('[ExamplePlugin] Spec path:', context.state.specPath);
  },
  
  /**
   * Cleanup when plugin is unloaded
   */
  onDestroy: async () => {
    console.log('[ExamplePlugin] Cleaning up...');
  },
  
  /**
   * Intercept config loading
   */
  onConfigLoad: async (config, context) => {
    console.log('[ExamplePlugin] Config loaded:', config.version);
    
    // You can modify the config here
    // For example, add plugin-specific metadata
    return {
      ...config,
      // Note: metadata field would need to be added to ConfigFile type
      // This is just an example
    };
  },
  
  /**
   * Intercept config saving
   */
  onConfigSave: async (config, context) => {
    console.log('[ExamplePlugin] Config being saved:', config.version);
    
    // You can add metadata before saving
    return {
      ...config,
      // Note: metadata field would need to be added to ConfigFile type
      // This is just an example
    };
  },
  
  /**
   * React to tab changes
   */
  onTabChange: async (tabId, context) => {
    console.log('[ExamplePlugin] Tab changed to:', tabId);
  },
  
  /**
   * UI components
   */
  components: {
    // Add action button to header
    headerActions: ExampleHeaderAction,
    
    // Add custom tab
    customTabs: [
      {
        id: 'example',
        label: 'Example',
        component: ExampleTab,
        order: 100 // Appears after built-in tabs
      }
    ]
  },
  
  /**
   * API middleware
   */
  apiMiddleware: {
    // Intercept requests
    beforeRequest: async (url, options) => {
      console.log('[ExamplePlugin] API request:', url);
      
      // You can add headers, modify options, etc.
      return {
        ...options,
        headers: {
          ...options.headers,
          'X-Example-Plugin': 'true'
        }
      };
    },
    
    // Intercept responses
    afterResponse: async (response) => {
      console.log('[ExamplePlugin] API response:', response.status);
      return response;
    },
    
    // Handle errors
    onError: async (error, url) => {
      console.error('[ExamplePlugin] API error:', error.message, 'URL:', url);
      // Return false to allow default error handling
      return false;
    }
  },
  
  /**
   * Plugin configuration
   */
  config: {
    enabled: true,
    logLevel: 'info'
  }
};
