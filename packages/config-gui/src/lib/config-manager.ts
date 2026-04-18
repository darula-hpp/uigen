import type { ConfigFile, ConfigValidationResult, ConfigValidationError } from '@uigen-dev/core';

/**
 * Options for ConfigManager
 */
export interface ConfigManagerOptions {
  /**
   * Base URL for API endpoints (default: current origin)
   */
  apiBaseUrl?: string;
  
  /**
   * Enable verbose logging
   */
  verbose?: boolean;
}

/**
 * Manages reading and writing UIGen configuration files via backend API
 * 
 * Responsibilities:
 * - Read and parse config file via API
 * - Write config file via API
 * - Validate config schema
 * - Handle API errors gracefully
 */
export class ConfigManager {
  private readonly apiBaseUrl: string;
  private readonly verbose: boolean;
  
  constructor(options: ConfigManagerOptions = {}) {
    this.apiBaseUrl = options.apiBaseUrl || '';
    this.verbose = options.verbose || false;
  }
  
  /**
   * Read and parse config file via API.
   * Returns null if file doesn't exist (not an error).
   * 
   * @returns Parsed config or null if file doesn't exist
   * @throws Error if API request fails or response cannot be parsed
   */
  public async read(): Promise<ConfigFile | null> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/config`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          if (this.verbose) {
            console.log('Config file not found');
          }
          return null;
        }
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Check if API returned null (file doesn't exist)
      if (data === null) {
        if (this.verbose) {
          console.log('Config file not found');
        }
        return null;
      }
      
      const config = data as ConfigFile;
      
      // Validate required fields
      if (!config.version) {
        console.warn('Config file missing version field, assuming version 1.0');
        config.version = '1.0';
      }
      
      if (!config.enabled || typeof config.enabled !== 'object') {
        console.warn('Config file missing or invalid "enabled" field, using empty object');
        config.enabled = {};
      }
      
      if (!config.defaults || typeof config.defaults !== 'object') {
        console.warn('Config file missing or invalid "defaults" field, using empty object');
        config.defaults = {};
      }
      
      if (!config.annotations || typeof config.annotations !== 'object') {
        console.warn('Config file missing or invalid "annotations" field, using empty object');
        config.annotations = {};
      }
      
      if (this.verbose) {
        console.log('Loaded config from API');
      }
      
      return config;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to read config file: ${errorMessage}`);
    }
  }
  
  /**
   * Write config file via API.
   * 
   * @param config - The config to write
   * @throws Error if validation fails or API request fails
   */
  public async write(config: ConfigFile): Promise<void> {
    // Validate config before writing
    const validation = this.validate(config);
    if (!validation.valid) {
      const errorMessages = validation.errors.map(e => `${e.path}: ${e.message}`).join(', ');
      throw new Error(`Config validation failed: ${errorMessages}`);
    }
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`API request failed: ${errorData.error || response.statusText}`);
      }
      
      if (this.verbose) {
        console.log('Wrote config via API');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to write config file: ${errorMessage}`);
    }
  }
  
  /**
   * Validate config file structure.
   * 
   * @param config - The config to validate
   * @returns Validation result with any errors found
   */
  public validate(config: ConfigFile): ConfigValidationResult {
    const errors: ConfigValidationError[] = [];
    
    // Validate version
    if (!config.version || typeof config.version !== 'string') {
      errors.push({
        path: 'version',
        message: 'Version must be a string',
        value: config.version
      });
    }
    
    // Validate enabled
    if (!config.enabled || typeof config.enabled !== 'object' || Array.isArray(config.enabled)) {
      errors.push({
        path: 'enabled',
        message: 'Enabled must be an object',
        value: config.enabled
      });
    } else {
      // Validate each enabled entry is a boolean
      for (const [key, value] of Object.entries(config.enabled)) {
        if (typeof value !== 'boolean') {
          errors.push({
            path: `enabled.${key}`,
            message: 'Enabled values must be boolean',
            value
          });
        }
      }
    }
    
    // Validate defaults
    if (!config.defaults || typeof config.defaults !== 'object' || Array.isArray(config.defaults)) {
      errors.push({
        path: 'defaults',
        message: 'Defaults must be an object',
        value: config.defaults
      });
    } else {
      // Validate each default entry is an object
      for (const [key, value] of Object.entries(config.defaults)) {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          errors.push({
            path: `defaults.${key}`,
            message: 'Default values must be objects',
            value
          });
        }
      }
    }
    
    // Validate annotations
    if (!config.annotations || typeof config.annotations !== 'object' || Array.isArray(config.annotations)) {
      errors.push({
        path: 'annotations',
        message: 'Annotations must be an object',
        value: config.annotations
      });
    } else {
      // Validate each annotation entry is an object
      for (const [elementPath, annotationConfig] of Object.entries(config.annotations)) {
        if (typeof annotationConfig !== 'object' || annotationConfig === null || Array.isArray(annotationConfig)) {
          errors.push({
            path: `annotations.${elementPath}`,
            message: 'Annotation configurations must be objects',
            value: annotationConfig
          });
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}
