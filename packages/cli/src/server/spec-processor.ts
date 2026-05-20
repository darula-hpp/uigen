/**
 * Spec processing module
 * Handles loading, parsing, and reconciling OpenAPI specs
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { parseSpec, AnnotationHandlerRegistry, Reconciler } from '@uigen-dev/core';
import { ConfigLoader } from '@uigen-dev/core/config';
import { load as parseYaml } from 'js-yaml';
import pc from 'picocolors';
import type { UIGenApp } from '@uigen-dev/core';
import { resolveSpecSource } from './spec-source.js';

export interface SpecProcessorOptions {
  specPath: string;
  verbose: boolean;
}

export interface SpecProcessorResult {
  ir: UIGenApp;
  specDir: string;
}

export class SpecProcessor {
  async process(options: SpecProcessorOptions): Promise<SpecProcessorResult> {
    const { specPath, verbose } = options;
    const specSource = resolveSpecSource(specPath);
    const specDir = specSource.specDir;

    // Load environment variables
    await this.loadEnvironment(specDir, verbose);
    
    // Load and apply config
    const config = await this.loadConfig(specDir, verbose);
    
    // Parse spec
    if (specSource.kind === 'url') {
      console.log(pc.gray(`Reading spec from URL: ${specSource.display}`));
    } else {
      console.log(pc.gray(`Reading spec: ${specSource.display}`));
    }
    const specContent = await specSource.loadContent();
    
    let rawSpec: any;
    try {
      rawSpec = parseYaml(specContent);
    } catch {
      rawSpec = JSON.parse(specContent);
    }
    
    // Apply reconciliation if config exists
    const reconciledSpec = config 
      ? await this.reconcileSpec(rawSpec, config, verbose)
      : rawSpec;
    
    // Parse to IR
    const reconciledSpecContent = JSON.stringify(reconciledSpec);
    const ir = await parseSpec(reconciledSpecContent);
    
    console.log(pc.green(`✓ Parsed spec: ${ir.meta.title} v${ir.meta.version}`));
    console.log(pc.gray(`  Resources: ${ir.resources.map(r => r.name).join(', ')}\n`));
    
    // Save IR
    await this.saveIR(specDir, ir, verbose);
    
    return { ir, specDir };
  }
  
  private async loadEnvironment(specDir: string, verbose: boolean): Promise<void> {
    const { config: dotenvConfig } = await import('dotenv');
    const envPath = resolve(specDir, '.env');
    
    if (existsSync(envPath)) {
      dotenvConfig({ path: envPath });
      if (verbose) {
        console.log(pc.gray(`Loaded environment variables from ${envPath}\n`));
      }
    } else if (verbose) {
      console.log(pc.gray(`No .env file found at ${envPath}\n`));
    }
  }
  
  private async loadConfig(specDir: string, verbose: boolean): Promise<any> {
    const configPath = resolve(specDir, '.uigen/config.yaml');
    const configLoader = new ConfigLoader({ configPath, verbose });
    const config = configLoader.load();
    
    if (config) {
      console.log(pc.gray(`Loading annotation config from ${configPath}`));
      
      const registry = AnnotationHandlerRegistry.getInstance();
      configLoader.applyToRegistry(config, registry);
      registry.setConfigLoader(configLoader);
      
      if (verbose) {
        const disabledAnnotations = Object.entries(config.enabled)
          .filter(([_, enabled]) => !enabled)
          .map(([name]) => name);
        
        if (disabledAnnotations.length > 0) {
          console.log(pc.gray(`  Disabled annotations: ${disabledAnnotations.join(', ')}`));
        }
        
        const annotationsWithDefaults = Object.keys(config.defaults);
        if (annotationsWithDefaults.length > 0) {
          console.log(pc.gray(`  Annotations with defaults: ${annotationsWithDefaults.join(', ')}`));
        }
      }
      
      console.log(pc.green('✓ Config loaded\n'));
    } else if (verbose) {
      console.log(pc.gray('No config file found, using default annotation settings\n'));
    }
    
    return config;
  }
  
  private async reconcileSpec(rawSpec: any, config: any, verbose: boolean): Promise<any> {
    try {
      const reconciler = new Reconciler({
        logLevel: verbose ? 'debug' : 'info',
        validateOutput: true,
        strictMode: false,
      });
      
      const result = reconciler.reconcile(rawSpec, config);
      
      if (verbose) {
        console.log(pc.gray(`  Applied ${result.appliedAnnotations} annotation(s) from config`));
        
        if (result.warnings.length > 0) {
          console.log(pc.yellow(`  Warnings: ${result.warnings.length}`));
          for (const warning of result.warnings) {
            console.log(pc.yellow(`    - ${warning.message}`));
            if (warning.suggestion) {
              console.log(pc.gray(`      ${warning.suggestion}`));
            }
          }
        }
      }
      
      console.log(pc.green('✓ Reconciliation complete\n'));
      return result.spec;
    } catch (error) {
      console.error(pc.red('✗ Reconciliation failed:'), error instanceof Error ? error.message : error);
      throw error;
    }
  }
  
  private async saveIR(specDir: string, ir: UIGenApp, verbose: boolean): Promise<void> {
    const buildDir = resolve(specDir, '.uigen/build');
    try {
      mkdirSync(buildDir, { recursive: true });
      const irPath = resolve(buildDir, 'app.uigen.json');
      writeFileSync(irPath, JSON.stringify(ir, null, 2), 'utf-8');
      if (verbose) {
        console.log(pc.gray(`Saved IR to ${irPath}\n`));
      }
    } catch (error) {
      console.error(pc.yellow(`⚠ Failed to save IR: ${error instanceof Error ? error.message : error}`));
    }
  }
}
