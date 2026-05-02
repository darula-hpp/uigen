import { existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import pc from 'picocolors';
import { promptForOptions } from '../utils/prompts.js';
import { scaffoldProject } from '../utils/scaffold.js';
import { initGitRepo } from '../utils/git.js';

interface InitOptions {
  spec?: string;
  git?: boolean;
  dir?: string;
  yes?: boolean;
  verbose?: boolean;
}

export async function init(projectName: string | undefined, options: InitOptions) {
  console.log(pc.cyan('✨ UIGen Project Initialization\n'));

  try {
    // Step 1: Determine project configuration
    const config = options.yes
      ? await getDefaultConfig(projectName, options)
      : await promptForOptions(projectName, options);

    // Step 2: Validate and create project directory
    const projectPath = resolve(process.cwd(), config.dir);
    
    if (existsSync(projectPath)) {
      console.error(pc.red(`✗ Error: Directory '${config.dir}' already exists`));
      console.log(pc.gray('  Choose a different name or remove the existing directory\n'));
      process.exit(1);
    }

    if (options.verbose) {
      console.log(pc.gray(`Creating project: ${config.dir}`));
      console.log(pc.gray(`Project path: ${projectPath}\n`));
    } else {
      console.log(pc.gray(`Creating project: ${config.dir}\n`));
    }
    
    mkdirSync(projectPath, { recursive: true });

    // Step 3: Scaffold project structure
    await scaffoldProject(projectPath, config, options.verbose);

    // Step 4: Initialize git repository
    if (config.git) {
      console.log(pc.gray('Initializing git repository...\n'));
      const gitResult = await initGitRepo(projectPath, options.verbose);
      
      if (gitResult.success) {
        console.log(pc.green('✓ Git repository initialized\n'));
      } else if (gitResult.warning) {
        console.log(pc.yellow(`⚠ ${gitResult.warning}\n`));
      }
    }

    // Step 5: Display success message
    displaySuccessMessage(config, projectPath);

  } catch (error) {
    console.error(pc.red('✗ Error:'), error instanceof Error ? error.message : error);
    if (options.verbose && error instanceof Error && error.stack) {
      console.error(pc.gray(error.stack));
    }
    process.exit(1);
  }
}

async function getDefaultConfig(projectName: string | undefined, options: InitOptions) {
  return {
    name: projectName || 'my-uigen-project',
    dir: options.dir || projectName || 'my-uigen-project',
    spec: options.spec,
    git: options.git !== false,
  };
}

function displaySuccessMessage(config: any, projectPath: string) {
  console.log(pc.green(`✨ Created UIGen project: ${config.name}\n`));
  
  console.log(pc.gray('📁 Project structure:'));
  if (config.git) {
    console.log(pc.gray('   ├── .git/'));
  }
  console.log(pc.gray('   ├── .gitignore'));
  console.log(pc.gray('   ├── .agents/skills/'));
  console.log(pc.gray('   ├── .uigen/'));
  console.log(pc.gray('   │   ├── config.yaml'));
  console.log(pc.gray('   │   ├── base-styles.css'));
  console.log(pc.gray('   │   └── theme.css'));
  console.log(pc.gray('   ├── openapi.yaml'));
  console.log(pc.gray('   ├── annotations.json'));
  console.log(pc.gray('   └── README.md\n'));
  
  if (config.git) {
    console.log(pc.green('✓ Git repository initialized'));
  }
  console.log(pc.green('✓ AI agent skills installed'));
  console.log(pc.green('✓ Base styles copied'));
  console.log(pc.green('✓ Configuration scaffolded\n'));
  
  console.log(pc.cyan('🚀 Next steps:\n'));
  console.log(pc.gray(`   cd ${config.dir}`));
  
  if (config.spec) {
    console.log(pc.gray('   uigen serve openapi.yaml'));
    console.log(pc.gray('\n   # To auto-annotate your spec with AI:'));
    console.log(pc.gray('   # Use the auto-annotate skill with your AI agent (Kiro, Claude, etc.)'));
    console.log(pc.gray('   # The skill is in .agents/skills/auto-annotate.md\n'));
  } else {
    console.log(pc.gray('   # Add your OpenAPI spec to openapi.yaml'));
    console.log(pc.gray('   uigen serve openapi.yaml\n'));
  }
  
  console.log(pc.gray('📚 Learn more: https://uigen.dev/docs/getting-started\n'));
}
