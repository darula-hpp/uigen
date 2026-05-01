#!/usr/bin/env node

/**
 * Script to export all registered annotations with their metadata to JSON.
 * This generates a comprehensive reference of available annotations with examples.
 * 
 * Usage: pnpm run export:annotations
 * Output: annotations.json in the project root
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { IgnoreHandler } from '../adapter/annotations/handlers/ignore-handler.js';
import { LabelHandler } from '../adapter/annotations/handlers/label-handler.js';
import { RefHandler } from '../adapter/annotations/handlers/ref-handler.js';
import { LoginHandler } from '../adapter/annotations/handlers/login-handler.js';
import { PasswordResetHandler } from '../adapter/annotations/handlers/password-reset-handler.js';
import { SignUpHandler } from '../adapter/annotations/handlers/sign-up-handler.js';
import { ActiveServerHandler } from '../adapter/annotations/handlers/active-server-handler.js';
import { FileTypesHandler } from '../adapter/annotations/handlers/file-types-handler.js';
import { MaxFileSizeHandler } from '../adapter/annotations/handlers/max-file-size-handler.js';
import { ChartHandler } from '../adapter/annotations/handlers/chart-handler.js';

/**
 * Interface for annotation metadata
 */
interface AnnotationMetadata {
  name: string;
  description: string;
  targetType: string | string[];
  applicableWhen?: {
    type?: string;
  };
  parameterSchema: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
  examples: Array<{ description: string; value: unknown }>;
}

/**
 * All handler classes that have metadata
 */
const handlerClasses = [
  IgnoreHandler,
  LabelHandler,
  RefHandler,
  LoginHandler,
  PasswordResetHandler,
  SignUpHandler,
  ActiveServerHandler,
  FileTypesHandler,
  MaxFileSizeHandler,
  ChartHandler
];

/**
 * Extract metadata from all handlers
 */
function extractAnnotationsMetadata(): AnnotationMetadata[] {
  const annotations: AnnotationMetadata[] = [];

  for (const HandlerClass of handlerClasses) {
    // Access the static metadata property
    const metadata = (HandlerClass as any).metadata;
    
    if (metadata) {
      annotations.push(metadata);
    } else {
      console.warn(`Warning: ${HandlerClass.name} does not have metadata property`);
    }
  }

  return annotations;
}

/**
 * Main execution
 */
function main() {
  try {
    console.log('Extracting annotation metadata...');
    
    const annotations = extractAnnotationsMetadata();
    
    // Sort by name for consistent output
    annotations.sort((a, b) => a.name.localeCompare(b.name));
    
    // Create output object with metadata
    const output = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      totalAnnotations: annotations.length,
      annotations
    };
    
    // Write to file in project root
    const outputPath = resolve(process.cwd(), 'annotations.json');
    writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
    
    console.log(`✓ Successfully exported ${annotations.length} annotations to ${outputPath}`);
    console.log('\nAnnotations exported:');
    annotations.forEach(ann => {
      console.log(`  - ${ann.name} (${Array.isArray(ann.targetType) ? ann.targetType.join(', ') : ann.targetType})`);
    });
  } catch (error) {
    console.error('Error exporting annotations:', error);
    process.exit(1);
  }
}

main();
