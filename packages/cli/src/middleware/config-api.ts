import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { dirname, resolve } from 'path';
import { load as parseYaml, dump as stringifyYaml } from 'js-yaml';
import type { ConfigFile, AnnotationHandler } from '@uigen-dev/core';
import { parseSpec, AnnotationHandlerRegistry } from '@uigen-dev/core';

/**
 * API handlers for the config GUI backend
 * 
 * These endpoints allow the browser-based config GUI to:
 * - Read and write config files
 * - Parse OpenAPI specs
 * - Get annotation metadata
 */

const CONFIG_PATH = '.uigen/config.yaml';

/**
 * GET /api/config
 * Read the config file
 */
export function handleGetConfig(specDir: string): ConfigFile | null {
  const configPath = resolve(specDir, CONFIG_PATH);
  
  if (!existsSync(configPath)) {
    return null;
  }
  
  try {
    const content = readFileSync(configPath, 'utf-8');
    const config = parseYaml(content) as ConfigFile;
    
    // Ensure config has required structure
    if (!config.version) {
      config.version = '1.0';
    }
    if (!config.enabled) {
      config.enabled = {};
    }
    if (!config.defaults) {
      config.defaults = {};
    }
    if (!config.annotations) {
      config.annotations = {};
    }
    
    return config;
  } catch (error) {
    console.error('Error reading config file:', error);
    throw new Error(`Failed to read config file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * GET /api/config/modified-time
 * Get the last modification time of the config file
 * Requirements: 24.5
 */
export function handleGetConfigModifiedTime(specDir: string): number | null {
  const configPath = resolve(specDir, CONFIG_PATH);
  
  if (!existsSync(configPath)) {
    return null;
  }
  
  try {
    const stats = statSync(configPath);
    return stats.mtimeMs;
  } catch (error) {
    console.error('Error getting config file modification time:', error);
    return null;
  }
}

/**
 * POST /api/config
 * Write the config file to .uigen/config.yaml
 * 
 * Requirements: 24.1, 24.2, 24.4
 * 
 * This function writes the config to .uigen/config.yaml as a clean YAML file.
 * We don't preserve comments since this is a generated config file.
 */
export function handleSaveConfig(specDir: string, config: ConfigFile): void {
  const configPath = resolve(specDir, CONFIG_PATH);
  const configDir = dirname(configPath);
  
  // Ensure .uigen directory exists
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
  
  try {
    // Validate config structure
    if (!config.version) {
      config.version = '1.0';
    }
    if (!config.enabled) {
      config.enabled = {};
    }
    if (!config.defaults) {
      config.defaults = {};
    }
    if (!config.annotations) {
      config.annotations = {};
    }
    
    // If file exists, check if configs are deeply equal (no changes)
    if (existsSync(configPath)) {
      const existingContent = readFileSync(configPath, 'utf-8');
      const existingConfig = parseYaml(existingContent) as ConfigFile;
      
      if (isDeepEqual(existingConfig, config)) {
        // No changes, don't write
        // Requirements: 24.1
        return;
      }
    }
    
    // Generate clean YAML
    const yamlContent = stringifyYaml(config, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
      sortKeys: false
    });
    
    writeFileSync(configPath, yamlContent, 'utf-8');
  } catch (error) {
    console.error('Error writing config file:', error);
    throw new Error(`Failed to write config file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Deep equality check for config objects
 * Requirements: 24.1
 */
function isDeepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 === null || obj2 === null) {
    return false;
  }
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!isDeepEqual(obj1[key], obj2[key])) return false;
  }
  
  return true;
}

/**
 * GET /api/spec
 * Parse the OpenAPI spec and return the structure
 */
export async function handleGetSpec(specPath: string): Promise<any> {
  try {
    // Read the spec file
    const content = readFileSync(specPath, 'utf-8');
    
    // Parse the spec content
    const app = await parseSpec(content);
    return app;
  } catch (error) {
    console.error('Error parsing spec:', error);
    throw new Error(`Failed to parse spec: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * GET /api/annotations
 * Get metadata for all registered annotations
 */
export function handleGetAnnotations(): any[] {
  const registry = AnnotationHandlerRegistry.getInstance();
  const handlers = registry.getAll();
  
  return handlers.map((handler: AnnotationHandler) => {
    // Check if handler has static metadata property
    const HandlerClass = handler.constructor as any;
    if (HandlerClass.metadata) {
      return HandlerClass.metadata;
    }
    
    // Fallback: extract basic metadata from handler
    return {
      name: handler.name,
      description: `Annotation handler for ${handler.name}`,
      targetType: 'field',
      parameterSchema: {
        type: 'object',
        properties: {}
      },
      examples: []
    };
  });
}

/**
 * Create API middleware for Vite dev server
 */
export function createApiMiddleware(specPath: string, specDir: string) {
  return async (req: any, res: any, next: any) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    
    // Handle CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.statusCode = 200;
      res.end();
      return;
    }
    
    try {
      // GET /api/config
      if (url.pathname === '/api/config' && req.method === 'GET') {
        const config = handleGetConfig(specDir);
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify(config));
        return;
      }
      
      // GET /api/config/modified-time
      if (url.pathname === '/api/config/modified-time' && req.method === 'GET') {
        const modifiedTime = handleGetConfigModifiedTime(specDir);
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify({ modifiedTime }));
        return;
      }
      
      // POST /api/config
      if (url.pathname === '/api/config' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: Buffer) => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            const config = JSON.parse(body) as ConfigFile;
            handleSaveConfig(specDir, config);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true }));
          } catch (error) {
            res.statusCode = 400;
            res.end(JSON.stringify({ 
              error: error instanceof Error ? error.message : String(error) 
            }));
          }
        });
        return;
      }
      
      // GET /api/spec
      if (url.pathname === '/api/spec' && req.method === 'GET') {
        const spec = await handleGetSpec(specPath);
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify(spec));
        return;
      }
      
      // GET /api/annotations
      if (url.pathname === '/api/annotations' && req.method === 'GET') {
        const annotations = handleGetAnnotations();
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify(annotations));
        return;
      }
      
      // Not an API route, continue to next middleware
      next();
    } catch (error) {
      console.error('API error:', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ 
        error: error instanceof Error ? error.message : String(error) 
      }));
    }
  };
}
