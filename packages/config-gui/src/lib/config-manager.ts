import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { load as parseYaml, dump as stringifyYaml } from 'js-yaml';
import type { ConfigFile, ConfigValidationResult, ConfigValidationError } from '@uigen-dev/core';

/**
 * Options for ConfigManager
 */
export interface ConfigManagerOptions {
  /**
   * Path to config file (default: .uigen/config.yaml)
   */
  configPath?: string;
  
  /**
   * Enable verbose logging
   */
  verbose?: boolean;
}

/**
 * Manages reading and writing UIGen configuration files
 * 
 * Responsibilities:
 * - Read and parse config file
 * - Write config file atomically (temp file + rename)
 * - Validate config schema
 * - Handle file system errors gracefully
 */
export class ConfigManager {
  private readonly configPath: string;
  private readonly verbose: boolean;
  
  constructor(options: ConfigManagerOptions = {}) {
    this.configPath = options.configPath || '.uigen/config.yaml';
    this.verbose = options.verbose || false;
  }
  
  /**
   * Read and parse config file.
   * Returns null if file doesn't exist (not an error).
   * 
   * @returns Parsed config or null if file doesn't exist
   * @throws Error if file exists but cannot be parsed
   */
  public read(): ConfigFile | null {
    const fullPath = resolve(process.cwd(), this.configPath);
    
    // Check if file exists
    if (!existsSync(fullPath)) {
      if (this.verbose) {
        console.log(`Config file not found at ${fullPath}`);
      }
      return null;
    }
    
    try {
      // Read file
      const fileContent = readFileSync(fullPath, 'utf-8');
      
      // Parse YAML
      const parsed = parseYaml(fileContent);
      
      // Validate structure
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Config file must contain a valid YAML object');
      }
      
      // Cast to ConfigFile
      const config = parsed as ConfigFile;
      
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
        console.log(`Loaded config from ${fullPath}`);
      }
      
      return config;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to read config file: ${errorMessage}`);
    }
  }
  
  /**
   * Write config file atomically using temp file + rename strategy.
   * Creates parent directory if it doesn't exist.
   * 
   * @param config - The config to write
   * @throws Error if validation fails or file cannot be written
   */
  public write(config: ConfigFile): void {
    // Validate config before writing
    const validation = this.validate(config);
    if (!validation.valid) {
      const errorMessages = validation.errors.map(e => `${e.path}: ${e.message}`).join(', ');
      throw new Error(`Config validation failed: ${errorMessages}`);
    }
    
    const fullPath = resolve(process.cwd(), this.configPath);
    const tempPath = `${fullPath}.tmp`;
    
    try {
      // Ensure parent directory exists
      const dir = dirname(fullPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      
      // Convert config to YAML
      const yamlContent = stringifyYaml(config, {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
        sortKeys: false
      });
      
      // Write to temp file
      writeFileSync(tempPath, yamlContent, 'utf-8');
      
      // Atomic rename
      renameSync(tempPath, fullPath);
      
      if (this.verbose) {
        console.log(`Wrote config to ${fullPath}`);
      }
    } catch (error) {
      // Clean up temp file if it exists
      try {
        if (existsSync(tempPath)) {
          unlinkSync(tempPath);
        }
      } catch {
        // Ignore cleanup errors
      }
      
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
