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
 * Write the config file
 * 
 * Requirements: 24.1, 24.2, 24.3, 24.4
 * 
 * This function preserves YAML comments and formatting by:
 * 1. Reading the existing file content if it exists
 * 2. Parsing both old and new configs
 * 3. Performing selective updates only on changed values
 * 4. Preserving the original YAML structure and comments
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
    
    let yamlContent: string;
    
    // If file exists, try to preserve formatting and comments
    if (existsSync(configPath)) {
      const existingContent = readFileSync(configPath, 'utf-8');
      const existingConfig = parseYaml(existingContent) as ConfigFile;
      
      // Check if configs are deeply equal (no changes)
      if (isDeepEqual(existingConfig, config)) {
        // No changes, don't write (preserves file exactly as-is)
        // Requirements: 24.1
        return;
      }
      
      // Perform selective update to preserve comments and formatting
      // Requirements: 24.3
      yamlContent = updateYamlSelectively(existingContent, existingConfig, config);
    } else {
      // New file, generate fresh YAML
      yamlContent = stringifyYaml(config, {
        indent: 2,
        lineWidth: 120,
        noRefs: true
      });
    }
    
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
 * Update YAML content selectively to preserve comments and formatting
 * Requirements: 24.3
 * 
 * Strategy:
 * - For simple value changes, replace the value in-place using regex
 * - For added/removed keys, regenerate only that section
 * - Preserve all comments and whitespace where possible
 */
function updateYamlSelectively(
  existingContent: string,
  existingConfig: ConfigFile,
  newConfig: ConfigFile
): string {
  let updatedContent = existingContent;
  
  // Update version if changed
  if (existingConfig.version !== newConfig.version) {
    updatedContent = updatedContent.replace(
      /^version:\s*.+$/m,
      `version: ${JSON.stringify(newConfig.version)}`
    );
  }
  
  // Update enabled section
  updatedContent = updateYamlSection(
    updatedContent,
    'enabled',
    existingConfig.enabled,
    newConfig.enabled
  );
  
  // Update defaults section
  updatedContent = updateYamlSection(
    updatedContent,
    'defaults',
    existingConfig.defaults,
    newConfig.defaults
  );
  
  // Update annotations section
  updatedContent = updateYamlSection(
    updatedContent,
    'annotations',
    existingConfig.annotations,
    newConfig.annotations
  );
  
  return updatedContent;
}

/**
 * Update a specific section of YAML content
 * Requirements: 24.3
 */
function updateYamlSection(
  content: string,
  sectionName: string,
  oldSection: Record<string, any>,
  newSection: Record<string, any>
): string {
  // If sections are deeply equal, no update needed
  if (isDeepEqual(oldSection, newSection)) {
    return content;
  }
  
  // Find the section in the content
  const sectionRegex = new RegExp(`^${sectionName}:\\s*(?:\\{\\})?\\s*$`, 'm');
  const match = content.match(sectionRegex);
  
  if (!match) {
    // Section doesn't exist, append it
    const newSectionYaml = stringifyYaml({ [sectionName]: newSection }, {
      indent: 2,
      lineWidth: 120,
      noRefs: true
    });
    return content.trimEnd() + '\n' + newSectionYaml;
  }
  
  // Check if section is empty (e.g., "annotations: {}")
  const isEmptySection = match[0].includes('{}');
  
  // Find the start and end of the section
  const sectionStart = match.index!;
  const lines = content.split('\n');
  let currentLine = content.substring(0, sectionStart).split('\n').length - 1;
  
  // Find where the section ends (next top-level key or end of file)
  let sectionEnd = content.length;
  for (let i = currentLine + 1; i < lines.length; i++) {
    const line = lines[i];
    // Top-level key (no indentation) marks end of section
    if (line.match(/^[a-zA-Z]/)) {
      sectionEnd = lines.slice(0, i).join('\n').length;
      break;
    }
  }
  
  // If section was empty and now has content, replace the entire section
  if (isEmptySection && Object.keys(newSection).length > 0) {
    const newSectionYaml = stringifyYaml({ [sectionName]: newSection }, {
      indent: 2,
      lineWidth: 120,
      noRefs: true
    });
    return content.substring(0, sectionStart) + newSectionYaml + content.substring(sectionEnd);
  }
  
  // Extract the section content
  const sectionContent = content.substring(sectionStart, sectionEnd);
  
  // Update individual keys within the section
  let updatedSection = sectionContent;
  
  // Handle added, removed, and modified keys
  const oldKeys = Object.keys(oldSection);
  const newKeys = Object.keys(newSection);
  
  // Remove deleted keys
  for (const key of oldKeys) {
    if (!(key in newSection)) {
      // Find and remove this key and its nested content
      const lines = updatedSection.split('\n');
      const escapedKey = escapeRegex(key);
      const keyLineIndex = lines.findIndex(line => line.match(new RegExp(`^  ${escapedKey}:`)));
      
      if (keyLineIndex !== -1) {
        // Find the end of this key's content
        let endIndex = keyLineIndex + 1;
        while (endIndex < lines.length && (lines[endIndex].startsWith('    ') || lines[endIndex].trim() === '')) {
          endIndex++;
        }
        
        // Remove the key and its content
        lines.splice(keyLineIndex, endIndex - keyLineIndex);
        updatedSection = lines.join('\n');
      }
    }
  }
  
  // Update modified keys and add new keys
  for (const key of newKeys) {
    const newValue = newSection[key];
    const oldValue = oldSection[key];
    
    if (key in oldSection && !isDeepEqual(oldValue, newValue)) {
      // Key exists but value changed - update in place
      updatedSection = updateKeyValue(updatedSection, key, newValue);
    } else if (!(key in oldSection)) {
      // New key - append to section
      const keyYaml = stringifyYaml({ [key]: newValue }, {
        indent: 2,
        lineWidth: 120,
        noRefs: true
      });
      // Add proper indentation (2 spaces for section content)
      const indentedKeyYaml = keyYaml.split('\n')
        .filter(line => line.trim() !== '') // Remove empty lines
        .map(line => line ? '  ' + line : line)
        .join('\n');
      updatedSection = updatedSection.trimEnd() + '\n' + indentedKeyYaml;
    }
  }
  
  // Replace the section in the original content
  return content.substring(0, sectionStart) + updatedSection + content.substring(sectionEnd);
}

/**
 * Update a specific key's value in YAML content
 * Requirements: 24.3
 */
function updateKeyValue(content: string, key: string, newValue: any): string {
  const escapedKey = escapeRegex(key);
  
  // Find the key and its nested content
  // Handle both quoted and unquoted keys
  const lines = content.split('\n');
  const keyLineIndex = lines.findIndex(line => 
    line.match(new RegExp(`^  ${escapedKey}:`)) ||
    line.match(new RegExp(`^  "${escapedKey}":`)) ||
    line.match(new RegExp(`^  '${escapedKey}':`))
  );
  
  if (keyLineIndex === -1) {
    // Key not found, append it
    const keyYaml = stringifyYaml({ [key]: newValue }, {
      indent: 2,
      lineWidth: 120,
      noRefs: true
    });
    const indentedKeyYaml = keyYaml.split('\n')
      .filter(line => line.trim() !== '') // Remove empty lines
      .map(line => line ? '  ' + line : line)
      .join('\n');
    return content.trimEnd() + '\n' + indentedKeyYaml;
  }
  
  // Find the end of this key's content (next key at same level or end of section)
  let endIndex = keyLineIndex + 1;
  while (endIndex < lines.length && (lines[endIndex].startsWith('    ') || lines[endIndex].trim() === '')) {
    endIndex++;
  }
  
  // Generate new YAML for this key
  const keyYaml = stringifyYaml({ [key]: newValue }, {
    indent: 2,
    lineWidth: 120,
    noRefs: true
  });
  
  // Add proper indentation (2 spaces for section content)
  const indentedKeyYaml = keyYaml.split('\n')
    .filter(line => line.trim() !== '') // Remove empty lines from generated YAML
    .map(line => line ? '  ' + line : line)
    .join('\n');
  
  // Replace the key and its content
  lines.splice(keyLineIndex, endIndex - keyLineIndex, indentedKeyYaml);
  return lines.join('\n');
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
