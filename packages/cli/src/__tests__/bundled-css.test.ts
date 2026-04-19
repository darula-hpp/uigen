import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Bundled CSS', () => {
  it('should have base-styles.css bundled in dist/assets', () => {
    // In tests, __dirname points to packages/cli/src/__tests__
    // We need to go up to packages/cli, then into dist/assets
    const bundledCSSPath = resolve(__dirname, '../../dist/assets/base-styles.css');
    expect(existsSync(bundledCSSPath), `File not found at: ${bundledCSSPath}`).toBe(true);
  });

  it('should contain valid CSS content', () => {
    const bundledCSSPath = resolve(__dirname, '../../dist/assets/base-styles.css');
    const content = readFileSync(bundledCSSPath, 'utf-8');
    
    // Check for key CSS content
    expect(content).toContain('@import \'tailwindcss\'');
    expect(content).toContain('@theme');
    expect(content).toContain('--background');
    expect(content).toContain('--foreground');
  });

  it('should match the React package source CSS', () => {
    const bundledCSSPath = resolve(__dirname, '../../dist/assets/base-styles.css');
    const sourceCSSPath = resolve(__dirname, '../../../../react/src/index.css');
    
    // Only run this test if source is available (development environment)
    if (existsSync(sourceCSSPath)) {
      const bundledContent = readFileSync(bundledCSSPath, 'utf-8');
      const sourceContent = readFileSync(sourceCSSPath, 'utf-8');
      
      expect(bundledContent).toBe(sourceContent);
    }
  });
});
