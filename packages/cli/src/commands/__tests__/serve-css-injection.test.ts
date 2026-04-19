import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Integration tests for CSS injection in the serve command
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 *
 * These tests verify that:
 * - loadCSS returns custom CSS when .uigen/index.css exists (6.1, 6.2)
 * - loadCSS falls back to default CSS when custom doesn't exist (6.1, 6.3)
 * - HTML injection includes window.__UIGEN_CSS__ script tag in dev mode (6.4, 6.5)
 * - HTML injection includes window.__UIGEN_CSS__ script tag in static mode (6.4, 6.5)
 * - CSS content with special characters is properly escaped via JSON.stringify (6.4)
 */

// ---------------------------------------------------------------------------
// Inline implementation of loadCSS (mirrors serve.ts logic) for unit testing
// without importing the full serve module (which starts a server on import).
// ---------------------------------------------------------------------------
function loadCSS(specDir: string, rendererRoot: string): string {
  const customCSSPath = resolve(specDir, '.uigen/index.css');
  const defaultCSSPath = resolve(rendererRoot, 'src/index.css');

  if (existsSync(customCSSPath)) {
    return readFileSync(customCSSPath, 'utf-8');
  }

  if (existsSync(defaultCSSPath)) {
    return readFileSync(defaultCSSPath, 'utf-8');
  }

  return '';
}

// ---------------------------------------------------------------------------
// HTML injection helpers (mirrors serve.ts logic for both modes)
// ---------------------------------------------------------------------------
function injectCSSIntoHtml(html: string, cssContent: string): string {
  if (!cssContent) return html;
  return html.replace(
    '</head>',
    `<script>window.__UIGEN_CSS__ = ${JSON.stringify(cssContent)};</script></head>`
  );
}

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------
const testDir = resolve(__dirname, '__test-css-injection-temp__');
const specDir = resolve(testDir, 'spec');
const rendererRoot = resolve(testDir, 'renderer');

beforeEach(() => {
  mkdirSync(resolve(specDir, '.uigen'), { recursive: true });
  mkdirSync(resolve(rendererRoot, 'src'), { recursive: true });
});

afterEach(() => {
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// loadCSS tests
// ---------------------------------------------------------------------------
describe('loadCSS', () => {
  describe('Requirement 6.1, 6.2 - Custom CSS file exists', () => {
    it('returns custom CSS content when .uigen/index.css exists', () => {
      const customCSS = '.custom { color: red; }';
      writeFileSync(resolve(specDir, '.uigen/index.css'), customCSS, 'utf-8');
      writeFileSync(resolve(rendererRoot, 'src/index.css'), '.default { color: blue; }', 'utf-8');

      const result = loadCSS(specDir, rendererRoot);

      expect(result).toBe(customCSS);
    });

    it('prefers custom CSS over default CSS when both exist', () => {
      const customCSS = '/* custom */\nbody { background: #fff; }';
      const defaultCSS = '/* default */\nbody { background: #000; }';
      writeFileSync(resolve(specDir, '.uigen/index.css'), customCSS, 'utf-8');
      writeFileSync(resolve(rendererRoot, 'src/index.css'), defaultCSS, 'utf-8');

      const result = loadCSS(specDir, rendererRoot);

      expect(result).toBe(customCSS);
      expect(result).not.toBe(defaultCSS);
    });
  });

  describe('Requirement 6.1, 6.3 - Custom CSS file does not exist', () => {
    it('falls back to default CSS when .uigen/index.css does not exist', () => {
      const defaultCSS = '/* default */\nbody { margin: 0; }';
      writeFileSync(resolve(rendererRoot, 'src/index.css'), defaultCSS, 'utf-8');
      // No custom CSS file created

      const result = loadCSS(specDir, rendererRoot);

      expect(result).toBe(defaultCSS);
    });

    it('returns empty string when neither custom nor default CSS exists', () => {
      // No CSS files created at all

      const result = loadCSS(specDir, rendererRoot);

      expect(result).toBe('');
    });
  });
});

// ---------------------------------------------------------------------------
// HTML injection tests (dev mode - Vite transformIndexHtml)
// ---------------------------------------------------------------------------
describe('HTML injection - dev mode (Vite transformIndexHtml)', () => {
  const baseHtml = `<!DOCTYPE html>
<html>
  <head>
    <title>UIGen</title>
  </head>
  <body><div id="root"></div></body>
</html>`;

  describe('Requirement 6.4, 6.5 - CSS script tag injection', () => {
    it('injects window.__UIGEN_CSS__ script tag before </head>', () => {
      const cssContent = 'body { color: red; }';

      const result = injectCSSIntoHtml(baseHtml, cssContent);

      expect(result).toContain('window.__UIGEN_CSS__');
      expect(result).toContain('<script>window.__UIGEN_CSS__');
      // Script tag must appear before </head>
      const scriptIndex = result.indexOf('<script>window.__UIGEN_CSS__');
      const headCloseIndex = result.indexOf('</head>');
      expect(scriptIndex).toBeLessThan(headCloseIndex);
    });

    it('does not inject CSS script tag when CSS content is empty', () => {
      const result = injectCSSIntoHtml(baseHtml, '');

      expect(result).not.toContain('window.__UIGEN_CSS__');
      expect(result).toBe(baseHtml);
    });

    it('CSS value in script tag matches the original CSS content', () => {
      const cssContent = '.btn { padding: 8px 16px; }';

      const result = injectCSSIntoHtml(baseHtml, cssContent);

      // JSON.stringify wraps the string in quotes and escapes it
      expect(result).toContain(JSON.stringify(cssContent));
    });
  });

  describe('Requirement 6.4 - CSS content escaping', () => {
    // Helper: extract the JSON-encoded CSS value from the injected script tag.
    // The script tag looks like: <script>window.__UIGEN_CSS__ = "...";</script>
    // We extract everything between the first `= ` and the closing `;</script>`.
    function extractCSSValue(html: string): string {
      const marker = 'window.__UIGEN_CSS__ = ';
      const start = html.indexOf(marker) + marker.length;
      const end = html.indexOf(';</script>', start);
      return html.slice(start, end);
    }

    it('properly escapes backticks in CSS content', () => {
      const cssContent = '.foo::before { content: "`tick`"; }';

      const result = injectCSSIntoHtml(baseHtml, cssContent);

      expect(result).toContain('window.__UIGEN_CSS__');
      const parsed = JSON.parse(extractCSSValue(result));
      expect(parsed).toBe(cssContent);
    });

    it('properly escapes backslashes in CSS content', () => {
      const cssContent = '.foo { content: "\\\\"; }';

      const result = injectCSSIntoHtml(baseHtml, cssContent);

      expect(result).toContain('window.__UIGEN_CSS__');
      const parsed = JSON.parse(extractCSSValue(result));
      expect(parsed).toBe(cssContent);
    });

    it('properly escapes double quotes in CSS content', () => {
      const cssContent = '.foo { content: "hello \\"world\\""; }';

      const result = injectCSSIntoHtml(baseHtml, cssContent);

      expect(result).toContain('window.__UIGEN_CSS__');
      const parsed = JSON.parse(extractCSSValue(result));
      expect(parsed).toBe(cssContent);
    });

    it('properly escapes newlines in CSS content', () => {
      const cssContent = 'body {\n  color: red;\n  margin: 0;\n}';

      const result = injectCSSIntoHtml(baseHtml, cssContent);

      expect(result).toContain('window.__UIGEN_CSS__');
      const parsed = JSON.parse(extractCSSValue(result));
      expect(parsed).toBe(cssContent);
    });
  });
});

// ---------------------------------------------------------------------------
// HTML injection tests (static mode - HTTP server)
// ---------------------------------------------------------------------------
describe('HTML injection - static mode (HTTP server)', () => {
  const baseHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>UIGen App</title>
  </head>
  <body><div id="root"></div></body>
</html>`;

  describe('Requirement 6.4, 6.5 - CSS script tag injection', () => {
    it('injects window.__UIGEN_CSS__ script tag before </head>', () => {
      const cssContent = '.container { max-width: 1200px; }';

      const result = injectCSSIntoHtml(baseHtml, cssContent);

      expect(result).toContain('window.__UIGEN_CSS__');
      const scriptIndex = result.indexOf('<script>window.__UIGEN_CSS__');
      const headCloseIndex = result.indexOf('</head>');
      expect(scriptIndex).toBeLessThan(headCloseIndex);
    });

    it('does not inject CSS script tag when CSS content is empty', () => {
      const result = injectCSSIntoHtml(baseHtml, '');

      expect(result).not.toContain('window.__UIGEN_CSS__');
    });

    it('CSS value in script tag is valid JSON-encoded string', () => {
      const cssContent = 'h1 { font-size: 2rem; }';

      const result = injectCSSIntoHtml(baseHtml, cssContent);

      const marker = 'window.__UIGEN_CSS__ = ';
      const start = result.indexOf(marker) + marker.length;
      const end = result.indexOf(';</script>', start);
      const jsonValue = result.slice(start, end);
      const parsed = JSON.parse(jsonValue);
      expect(parsed).toBe(cssContent);
    });
  });

  describe('Requirement 6.2, 6.3 - CSS loaded from correct file in static mode', () => {
    it('uses custom CSS file content when it exists', () => {
      const customCSS = '/* custom static */\n.app { font-family: sans-serif; }';
      writeFileSync(resolve(specDir, '.uigen/index.css'), customCSS, 'utf-8');

      const cssContent = loadCSS(specDir, rendererRoot);
      const result = injectCSSIntoHtml(baseHtml, cssContent);

      expect(result).toContain(JSON.stringify(customCSS));
    });

    it('uses default CSS file content when custom does not exist', () => {
      const defaultCSS = '/* default static */\n* { box-sizing: border-box; }';
      writeFileSync(resolve(rendererRoot, 'src/index.css'), defaultCSS, 'utf-8');

      const cssContent = loadCSS(specDir, rendererRoot);
      const result = injectCSSIntoHtml(baseHtml, cssContent);

      expect(result).toContain(JSON.stringify(defaultCSS));
    });
  });
});
