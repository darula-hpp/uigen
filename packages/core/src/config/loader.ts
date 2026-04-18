import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { load as parseYaml } from 'js-yaml';
import type { ConfigFile } from './types.js';
import type { AnnotationHandlerRegistry } from '../adapter/annotations/registry.js';

/**
 * Options for ConfigLoader
 */
export interface ConfigLoaderOptions {
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
 * Loads and applies UIGen configuration from .uigen/config.yaml
 * 
 * Responsibilities:
 * - Read and parse config file
 * - Validate config schema
 * - Disable handlers for disabled annotations
 * - Store defaults for injection during processing
 * - Provide annotation config lookup
 */
export class ConfigLoader {
  private readonly configPath: string;
  private readonly verbose: boolean;
  private config: ConfigFile | null = null;
  
  constructor(options: ConfigLoaderOptions = {}) {
    this.configPath = options.configPath || '.uigen/config.yaml';
    this.verbose = options.verbose || false;
  }
  
  /**
   * Load and parse config file.
   * Returns null if file doesn't exist (not an error).
   * 
   * @returns Parsed config or null if file doesn't exist
   * @throws Error if file exists but cannot be parsed
   */
  public load(): ConfigFile | null {
    const fullPath = resolve(process.cwd(), this.configPath);
    
    // Check if file exists
    if (!existsSync(fullPath)) {
      if (this.verbose) {
        console.log(`Config file not found at ${fullPath}, using defaults`);
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
      
      // Cast to ConfigFile (basic validation)
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
      
      this.config = config;
      
      if (this.verbose) {
        console.log(`Loaded config from ${fullPath}`);
      }
      
      return config;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load config file: ${errorMessage}`);
    }
  }
  
  /**
   * Apply config to annotation registry.
   * - Disables handlers for disabled annotations
   * - Stores defaults for injection during processing
   * 
   * @param config - The config to apply
   * @param registry - The annotation handler registry
   */
  public applyToRegistry(config: ConfigFile, registry: AnnotationHandlerRegistry): void {
    const allHandlers = registry.getAll();
    const registeredNames = new Set(allHandlers.map(h => h.name));
    
    // Check for unknown annotations in config
    const configuredAnnotations = new Set([
      ...Object.keys(config.enabled),
      ...Object.keys(config.defaults)
    ]);
    
    for (const name of configuredAnnotations) {
      if (!registeredNames.has(name)) {
        console.warn(`Config contains unknown annotation "${name}" - it will be ignored`);
      }
    }
    
    // Store config for later use
    this.config = config;
    
    if (this.verbose) {
      const disabledCount = Object.entries(config.enabled)
        .filter(([_, enabled]) => !enabled)
        .length;
      const defaultsCount = Object.keys(config.defaults).length;
      
      console.log(`Applied config: ${disabledCount} annotations disabled, ${defaultsCount} with defaults`);
    }
  }
  
  /**
   * Get annotation config for a specific element path.
   * Merges defaults with element-specific config.
   * 
   * @param elementPath - The element path (e.g., "User.email", "POST:/auth/login")
   * @param annotationName - The annotation name (e.g., "x-uigen-label")
   * @returns The merged config or undefined if not configured
   */
  public getAnnotationConfig(elementPath: string, annotationName: string): unknown | undefined {
    if (!this.config) {
      return undefined;
    }
    
    // Check if annotation is disabled
    if (this.config.enabled[annotationName] === false) {
      if (this.verbose) {
        console.log(`[Config] Annotation "${annotationName}" is disabled, skipping for ${elementPath}`);
      }
      return undefined;
    }
    
    // Get defaults for this annotation
    const defaults = this.config.defaults[annotationName] || {};
    
    // Get element-specific config
    const elementConfig = this.config.annotations[elementPath]?.[annotationName];
    
    // If no element-specific config and no defaults, return undefined
    if (elementConfig === undefined && Object.keys(defaults).length === 0) {
      return undefined;
    }
    
    // Merge defaults with element-specific config (element config takes precedence)
    if (typeof elementConfig === 'object' && elementConfig !== null && !Array.isArray(elementConfig)) {
      return { ...defaults, ...elementConfig };
    }
    
    // Return element config if present, otherwise defaults
    return elementConfig !== undefined ? elementConfig : defaults;
  }
  
  /**
   * Check if an annotation is disabled in the config.
   * 
   * @param annotationName - The annotation name (e.g., "x-uigen-label")
   * @returns true if the annotation is explicitly disabled, false otherwise
   */
  public isAnnotationDisabled(annotationName: string): boolean {
    if (!this.config) {
      return false;
    }
    return this.config.enabled[annotationName] === false;
  }
}
