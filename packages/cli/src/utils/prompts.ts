import { existsSync } from 'fs';
import { resolve } from 'path';
import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import pc from 'picocolors';

interface PromptConfig {
  name: string;
  dir: string;
  spec?: string;
  autoAnnotate: boolean;
  git: boolean;
}

export async function promptForOptions(
  projectName: string | undefined,
  options: any
): Promise<PromptConfig> {
  const rl = readline.createInterface({ input, output });

  try {
    // Prompt for project name
    const name = projectName || await rl.question(
      pc.cyan('? ') + 'What is your project name? ' + pc.gray('(my-uigen-project) ')
    ) || 'my-uigen-project';

    const dir = options.dir || name;

    // Prompt for spec file
    const hasSpec = await rl.question(
      pc.cyan('? ') + 'Do you have an OpenAPI spec? ' + pc.gray('(Y/n) ')
    );
    
    let spec: string | undefined;
    let autoAnnotate = false;
    
    if (!hasSpec || hasSpec.toLowerCase() === 'y' || hasSpec.toLowerCase() === 'yes') {
      spec = await rl.question(
        pc.cyan('? ') + 'Path to your OpenAPI spec: ' + pc.gray('(openapi.yaml) ')
      ) || 'openapi.yaml';
      
      // Validate spec exists
      const specPath = resolve(process.cwd(), spec);
      if (!existsSync(specPath)) {
        console.log(pc.yellow(`⚠ Warning: Spec file '${spec}' not found`));
        const proceed = await rl.question(
          pc.cyan('? ') + 'Continue without spec? ' + pc.gray('(Y/n) ')
        );
        
        if (proceed && proceed.toLowerCase() === 'n') {
          console.log(pc.gray('\nCancelled\n'));
          process.exit(0);
        }
        spec = undefined;
      } else {
        // Prompt for auto-annotation
        const shouldAutoAnnotate = await rl.question(
          pc.cyan('? ') + 'Auto-annotate your spec? ' + pc.gray('(Y/n) ') + '\n' +
          pc.gray('  This will automatically detect and apply annotations like login endpoints, file uploads, etc.\n  ')
        );
        
        autoAnnotate = !shouldAutoAnnotate || 
                      shouldAutoAnnotate.toLowerCase() === 'y' || 
                      shouldAutoAnnotate.toLowerCase() === 'yes';
      }
    }

    // Prompt for git initialization
    const shouldInitGit = await rl.question(
      pc.cyan('? ') + 'Initialize git repository? ' + pc.gray('(Y/n) ')
    );
    
    const git = !shouldInitGit || 
                shouldInitGit.toLowerCase() === 'y' || 
                shouldInitGit.toLowerCase() === 'yes';

    // Confirmation
    console.log();
    console.log(pc.cyan('Configuration:'));
    console.log(pc.gray(`  ✓ Project name: ${name}`));
    if (spec) console.log(pc.gray(`  ✓ OpenAPI spec: ${spec}`));
    if (spec && autoAnnotate) console.log(pc.gray('  ✓ Auto-annotate: Yes'));
    console.log(pc.gray(`  ✓ Git repository: ${git ? 'Yes' : 'No'}`));
    console.log();

    const confirm = await rl.question(
      pc.cyan('? ') + 'Create project? ' + pc.gray('(Y/n) ')
    );

    if (confirm && confirm.toLowerCase() === 'n') {
      console.log(pc.gray('\nCancelled\n'));
      process.exit(0);
    }

    return { name, dir, spec, autoAnnotate, git };
  } finally {
    rl.close();
  }
}
