import { writeFileSync, mkdirSync, copyFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import pc from 'picocolors';
import { 
  getConfigTemplate, 
  getThemeTemplate, 
  getGitignoreTemplate, 
  getReadmeTemplate,
  getExampleSpecTemplate 
} from '../templates/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ScaffoldConfig {
  name: string;
  spec?: string;
}

export async function scaffoldProject(
  projectPath: string,
  config: ScaffoldConfig,
  verbose?: boolean
): Promise<void> {
  // Create directory structure
  const dirs = [
    '.agents/skills',
    '.uigen',
  ];

  for (const dir of dirs) {
    const dirPath = resolve(projectPath, dir);
    mkdirSync(dirPath, { recursive: true });
    if (verbose) {
      console.log(pc.gray(`  Created ${dir}/`));
    }
  }

  // Copy skills
  await copySkills(projectPath, verbose);

  // Copy annotations.json
  await copyAnnotationsJson(projectPath, verbose);

  // Copy base-styles.css
  await copyBaseStyles(projectPath, verbose);

  // Create config.yaml
  const configPath = resolve(projectPath, '.uigen/config.yaml');
  writeFileSync(configPath, getConfigTemplate(), 'utf-8');
  if (verbose) {
    console.log(pc.gray('  Created .uigen/config.yaml'));
  }

  // Create theme.css
  const themePath = resolve(projectPath, '.uigen/theme.css');
  writeFileSync(themePath, getThemeTemplate(), 'utf-8');
  if (verbose) {
    console.log(pc.gray('  Created .uigen/theme.css'));
  }

  // Create or copy OpenAPI spec
  const specPath = resolve(projectPath, 'openapi.yaml');
  if (config.spec) {
    const sourceSpecPath = resolve(process.cwd(), config.spec);
    copyFileSync(sourceSpecPath, specPath);
    if (verbose) {
      console.log(pc.gray(`  Copied ${config.spec} to openapi.yaml`));
    }
  } else {
    writeFileSync(specPath, getExampleSpecTemplate(), 'utf-8');
    if (verbose) {
      console.log(pc.gray('  Created example openapi.yaml'));
    }
  }

  // Create .gitignore
  const gitignorePath = resolve(projectPath, '.gitignore');
  writeFileSync(gitignorePath, getGitignoreTemplate(), 'utf-8');
  if (verbose) {
    console.log(pc.gray('  Created .gitignore'));
  }

  // Create README.md
  const readmePath = resolve(projectPath, 'README.md');
  writeFileSync(readmePath, getReadmeTemplate(config.name), 'utf-8');
  if (verbose) {
    console.log(pc.gray('  Created README.md'));
  }

  console.log(pc.green('\n✓ Project structure created'));
}

async function copySkills(projectPath: string, verbose?: boolean): Promise<void> {
  // Skills are bundled in dist/skills/ after build
  const skillsSource = resolve(__dirname, '../skills');
  const skillsTarget = resolve(projectPath, '.agents/skills');

  if (!existsSync(skillsSource)) {
    if (verbose) {
      console.log(pc.yellow('  Warning: Skills directory not found, skipping'));
    }
    return;
  }

  // Copy all .md files from skills directory
  const files = readdirSync(skillsSource);
  for (const file of files) {
    const sourcePath = join(skillsSource, file);
    const stat = statSync(sourcePath);
    
    if (stat.isFile() && file.endsWith('.md')) {
      const targetPath = join(skillsTarget, file);
      copyFileSync(sourcePath, targetPath);
      if (verbose) {
        console.log(pc.gray(`  Copied skill: ${file}`));
      }
    }
  }
}

async function copyAnnotationsJson(projectPath: string, verbose?: boolean): Promise<void> {
  // annotations.json is bundled in dist/ after build
  const annotationsSource = resolve(__dirname, '../annotations.json');
  const annotationsTarget = resolve(projectPath, 'annotations.json');

  if (!existsSync(annotationsSource)) {
    if (verbose) {
      console.log(pc.yellow('  Warning: annotations.json not found, skipping'));
    }
    return;
  }

  copyFileSync(annotationsSource, annotationsTarget);
  if (verbose) {
    console.log(pc.gray('  Copied annotations.json'));
  }
}

async function copyBaseStyles(projectPath: string, verbose?: boolean): Promise<void> {
  // base-styles.css is bundled in dist/assets/ after build
  const baseStylesSource = resolve(__dirname, '../assets/base-styles.css');
  const baseStylesTarget = resolve(projectPath, '.uigen/base-styles.css');

  if (!existsSync(baseStylesSource)) {
    if (verbose) {
      console.log(pc.yellow('  Warning: base-styles.css not found, skipping'));
    }
    return;
  }

  copyFileSync(baseStylesSource, baseStylesTarget);
  if (verbose) {
    console.log(pc.gray('  Copied base-styles.css'));
  }
}
