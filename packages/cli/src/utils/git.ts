import { exec } from 'child_process';
import { promisify } from 'util';
import pc from 'picocolors';

const execAsync = promisify(exec);

export interface GitResult {
  success: boolean;
  warning?: string;
}

/**
 * Initialize a git repository in the specified directory
 * @param projectPath - Absolute path to the project directory
 * @param verbose - Whether to show detailed output
 * @returns Result object with success status and optional warning message
 */
export async function initGitRepo(projectPath: string, verbose?: boolean): Promise<GitResult> {
  try {
    // Check if git is installed
    try {
      await execAsync('git --version');
    } catch {
      return {
        success: false,
        warning: 'Git not found, skipping repository initialization. Install git to enable version control.'
      };
    }

    // Initialize git repository
    await execAsync('git init', { cwd: projectPath });
    
    if (verbose) {
      console.log(pc.gray('  Initialized git repository'));
    }

    // Configure git for this repository if user config is missing
    try {
      await execAsync('git config user.name', { cwd: projectPath });
    } catch {
      // Set default user config for this repo only
      await execAsync('git config user.name "UIGen Init"', { cwd: projectPath });
      await execAsync('git config user.email "init@uigen.dev"', { cwd: projectPath });
    }

    // Create initial commit
    await execAsync('git add .', { cwd: projectPath });
    await execAsync('git commit -m "Initial commit from uigen init"', { cwd: projectPath });
    
    if (verbose) {
      console.log(pc.gray('  Created initial commit'));
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      warning: `Git initialization failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
