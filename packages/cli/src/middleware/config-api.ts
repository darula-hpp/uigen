import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
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
 * POST /api/config
 * Write the config file
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
    
    // Write config file
    const yamlContent = stringifyYaml(config, {
      indent: 2,
      lineWidth: 120,
      noRefs: true
    });
    
    writeFileSync(configPath, yamlContent, 'utf-8');
  } catch (error) {
    console.error('Error writing config file:', error);
    throw new Error(`Failed to write config file: ${error instanceof Error ? error.message : String(error)}`);
  }
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
      targetType: 'field', // Default, should be overridden by handler metadata
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
