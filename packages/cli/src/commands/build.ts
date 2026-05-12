import { existsSync, mkdirSync, cpSync, rmSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import pc from 'picocolors';
import { discoverOverrides, transpileOverrides, validateOverrides } from '../overrides/index.js';

interface BuildOptions {
  output?: string;
  clean?: boolean;
  verbose?: boolean;
}

export async function build(spec: string, options: BuildOptions) {
  console.log(pc.cyan('🔨 UIGen Build\n'));

  try {
    const cwd = process.cwd();
    const uigenDir = resolve(cwd, '.uigen');
    const outputDir = options.output ? resolve(cwd, options.output) : resolve(cwd, 'build');

    // Validate .uigen directory exists
    if (!existsSync(uigenDir)) {
      console.error(pc.red('✗ Error: .uigen directory not found'));
      console.log(pc.gray('  Run "uigen init" first to create the project structure\n'));
      process.exit(1);
    }

    // Validate spec file exists
    const specPath = resolve(cwd, spec);
    if (!existsSync(specPath)) {
      console.error(pc.red(`✗ Error: Spec file not found: ${spec}`));
      console.log(pc.gray('  Provide a valid path to your OpenAPI spec file\n'));
      process.exit(1);
    }

    if (options.verbose) {
      console.log(pc.gray(`Source: ${uigenDir}`));
      console.log(pc.gray(`Target: ${outputDir}`));
      console.log(pc.gray(`Spec: ${specPath}\n`));
    }

    // Clean output directory if requested
    if (options.clean && existsSync(outputDir)) {
      if (options.verbose) {
        console.log(pc.gray('Cleaning output directory...'));
      }
      rmSync(outputDir, { recursive: true, force: true });
      console.log(pc.green('✓ Cleaned output directory\n'));
    }

    // Create output directory
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
      if (options.verbose) {
        console.log(pc.gray('Created output directory\n'));
      }
    }

    // Copy .uigen directory to build folder
    console.log(pc.gray('Copying .uigen directory...'));
    const targetUigenDir = resolve(outputDir, '.uigen');
    
    cpSync(uigenDir, targetUigenDir, { 
      recursive: true,
      force: true,
      errorOnExist: false
    });

    console.log(pc.green('✓ Copied .uigen directory'));

    // Copy spec file to build folder
    console.log(pc.gray('Copying OpenAPI spec...'));
    const targetSpecPath = resolve(outputDir, 'openapi.yaml');
    
    cpSync(specPath, targetSpecPath, {
      force: true
    });

    console.log(pc.green('✓ Copied OpenAPI spec'));

    // Copy annotations.json if it exists
    const annotationsPath = resolve(cwd, 'annotations.json');
    if (existsSync(annotationsPath)) {
      console.log(pc.gray('Copying annotations.json...'));
      const targetAnnotationsPath = resolve(outputDir, 'annotations.json');
      
      cpSync(annotationsPath, targetAnnotationsPath, {
        force: true
      });

      console.log(pc.green('✓ Copied annotations.json'));
    }

    // Process and bundle override files (Task 6.1, 6.2)
    const specDir = dirname(specPath);
    const srcDir = resolve(specDir, 'src');
    
    if (existsSync(srcDir)) {
      console.log(pc.gray('Processing override files...'));
      
      try {
        // Discover override files
        const files = await discoverOverrides({
          srcDir,
          verbose: options.verbose ?? false,
        });
        
        if (files.length > 0) {
          if (options.verbose) {
            console.log(pc.gray(`  Found ${files.length} override file(s)`));
          }
          
          // Transpile with production settings (minified, no source maps)
          const transpileResult = await transpileOverrides({
            files,
            mode: 'production',
            verbose: options.verbose ?? false,
          });
          
          // Log errors (non-fatal)
          if (transpileResult.errors.length > 0) {
            console.warn(pc.yellow(`  ⚠ Transpilation errors (${transpileResult.errors.length}):`));
            for (const error of transpileResult.errors) {
              console.warn(pc.yellow(`    ${error.filePath}: ${error.message}`));
            }
          }
          
          // Validate overrides
          if (transpileResult.code && transpileResult.code.trim() !== '') {
            const validationResult = validateOverrides({
              code: transpileResult.code,
              files,
              verbose: options.verbose ?? false,
            });
            
            // Log validation errors (non-fatal)
            if (validationResult.errors.length > 0) {
              console.warn(pc.yellow(`  ⚠ Validation errors (${validationResult.errors.length}):`));
              for (const error of validationResult.errors) {
                console.warn(pc.yellow(`    ${error.filePath}: ${error.message}`));
              }
            }
            
            // Save bundled overrides to build output
            const overridesOutputPath = resolve(outputDir, 'overrides.bundle.js');
            writeFileSync(overridesOutputPath, transpileResult.code, 'utf-8');
            
            // Log bundle size
            const bundleSize = Buffer.byteLength(transpileResult.code, 'utf-8');
            const bundleSizeKB = (bundleSize / 1024).toFixed(2);
            
            console.log(pc.green(`✓ Bundled overrides (${bundleSizeKB} KB)`));
            
            if (options.verbose) {
              console.log(pc.gray(`  Output: ${overridesOutputPath}`));
            }
          } else {
            console.warn(pc.yellow('  ⚠ Override transpilation failed, skipping'));
          }
        } else {
          if (options.verbose) {
            console.log(pc.gray('  No override files found'));
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(pc.yellow(`  ⚠ Override processing failed: ${errorMessage}`));
        console.warn(pc.yellow('  Continuing without overrides...'));
      }
    } else if (options.verbose) {
      console.log(pc.gray('No src/ directory found, skipping overrides'));
    }

    // Display success message
    console.log(pc.green(`\n✨ Build complete!\n`));
    console.log(pc.gray('📁 Build output:'));
    console.log(pc.gray(`   ${outputDir}/`));
    console.log(pc.gray('   ├── .uigen/'));
    console.log(pc.gray('   │   ├── config.yaml'));
    console.log(pc.gray('   │   ├── base-styles.css'));
    console.log(pc.gray('   │   ├── theme.css'));
    console.log(pc.gray('   │   └── assets/'));
    console.log(pc.gray('   ├── openapi.yaml'));
    if (existsSync(annotationsPath)) {
      console.log(pc.gray('   ├── annotations.json'));
    }
    if (existsSync(resolve(outputDir, 'overrides.bundle.js'))) {
      console.log(pc.gray('   └── overrides.bundle.js'));
    }
    console.log();

    console.log(pc.cyan('🚀 Next steps:\n'));
    console.log(pc.gray(`   cd ${options.output || 'build'}`));
    console.log(pc.gray('   uigen serve openapi.yaml\n'));

  } catch (error) {
    console.error(pc.red('✗ Build failed:'), error instanceof Error ? error.message : error);
    if (options.verbose && error instanceof Error && error.stack) {
      console.error(pc.gray(error.stack));
    }
    process.exit(1);
  }
}
