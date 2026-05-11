import { existsSync, mkdirSync, cpSync, rmSync } from 'fs';
import { resolve } from 'path';
import pc from 'picocolors';

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
      console.log(pc.gray('   └── annotations.json'));
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
