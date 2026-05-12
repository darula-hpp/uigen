/**
 * Asset loading module
 * Handles CSS, overrides, and other assets
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import pc from 'picocolors';
import { discoverOverrides, transpileOverrides, validateOverrides, createInjectionScript } from '../overrides/index.js';

export class AssetLoader {
  /**
   * Load theme CSS content from .uigen/theme.css
   */
  loadCSS(specDir: string, verbose: boolean): string {
    const themePath = resolve(specDir, '.uigen/theme.css');
    
    if (existsSync(themePath)) {
      if (verbose) {
        console.log(pc.gray(`Loading custom theme from ${themePath}`));
      }
      return readFileSync(themePath, 'utf-8');
    }
    
    if (verbose) {
      console.log(pc.gray('No custom theme found, using base styles only'));
    }
    return '';
  }
  
  /**
   * Process override files from src/ directory
   */
  async processOverrides(
    specDir: string,
    mode: 'development' | 'production',
    verbose: boolean
  ): Promise<string> {
    try {
      const srcDir = resolve(specDir, 'src');
      
      if (verbose) {
        console.log(pc.gray(`Processing overrides from ${srcDir}...`));
      }
      
      // Discover override files
      const files = await discoverOverrides({ srcDir, verbose });
      
      if (files.length === 0) {
        if (verbose) {
          console.log(pc.gray('No override files found'));
        }
        return createInjectionScript({ code: '', mode });
      }
      
      if (verbose) {
        console.log(pc.gray(`Found ${files.length} override file(s)`));
      }
      
      // Transpile override files
      const transpileResult = await transpileOverrides({ files, mode, verbose });
      
      if (transpileResult.errors.length > 0) {
        console.warn(pc.yellow(`⚠ Override transpilation errors (${transpileResult.errors.length}):`));
        for (const error of transpileResult.errors) {
          console.warn(pc.yellow(`  ${error.filePath}: ${error.message}`));
        }
      }
      
      if (!transpileResult.code || transpileResult.code.trim() === '') {
        console.warn(pc.yellow('⚠ Override transpilation failed, continuing without overrides'));
        return createInjectionScript({ code: '', mode });
      }
      
      // Validate override definitions
      const validationResult = validateOverrides({ code: transpileResult.code, files, verbose });
      
      if (validationResult.errors.length > 0) {
        console.warn(pc.yellow(`⚠ Override validation errors (${validationResult.errors.length}):`));
        for (const error of validationResult.errors) {
          console.warn(pc.yellow(`  ${error.filePath}: ${error.message}`));
        }
      }
      
      if (validationResult.warnings.length > 0 && verbose) {
        console.warn(pc.yellow(`⚠ Override validation warnings (${validationResult.warnings.length}):`));
        for (const warning of validationResult.warnings) {
          console.warn(pc.yellow(`  ${warning.filePath}: ${warning.message}`));
        }
      }
      
      // Create injection script
      const injectionScript = createInjectionScript({ code: transpileResult.code, mode });
      
      if (verbose) {
        console.log(pc.green(`✓ Override processing complete`));
      }
      
      return injectionScript;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(pc.yellow(`⚠ Override processing failed: ${errorMessage}`));
      console.warn(pc.yellow('  Continuing without overrides...'));
      return createInjectionScript({ code: '', mode });
    }
  }
}
