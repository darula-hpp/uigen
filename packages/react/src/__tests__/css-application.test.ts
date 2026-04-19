import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Integration tests for CSS application logic (from main.tsx).
 *
 * We extract and test the CSS injection logic directly since main.tsx
 * is a side-effectful entry point that can't be imported in tests.
 */

// Mirrors the CSS injection logic in main.tsx
function applyCustomCSS(css: string | undefined): void {
  if (!css) return;
  try {
    const styleElement = document.createElement('style');
    styleElement.id = 'uigen-custom-css';
    styleElement.textContent = css;
    document.head.appendChild(styleElement);
  } catch (error) {
    console.warn('Failed to apply custom CSS:', error);
  }
}

describe('CSS application logic', () => {
  beforeEach(() => {
    // Clean up any injected style elements between tests
    document.querySelectorAll('#uigen-custom-css').forEach(el => el.remove());
  });

  afterEach(() => {
    document.querySelectorAll('#uigen-custom-css').forEach(el => el.remove());
  });

  it('injects a style element when __UIGEN_CSS__ is present', () => {
    const css = 'body { background: red; }';
    applyCustomCSS(css);

    const styleEl = document.getElementById('uigen-custom-css');
    expect(styleEl).not.toBeNull();
  });

  it('creates the style element with id "uigen-custom-css"', () => {
    applyCustomCSS('h1 { color: blue; }');

    const styleEl = document.getElementById('uigen-custom-css');
    expect(styleEl?.id).toBe('uigen-custom-css');
  });

  it('sets the style element textContent to the CSS string', () => {
    const css = '.foo { margin: 0; }';
    applyCustomCSS(css);

    const styleEl = document.getElementById('uigen-custom-css');
    expect(styleEl?.textContent).toBe(css);
  });

  it('appends the style element to document.head', () => {
    applyCustomCSS('p { font-size: 16px; }');

    const styleEl = document.getElementById('uigen-custom-css');
    expect(document.head.contains(styleEl)).toBe(true);
  });

  it('does nothing when CSS is undefined', () => {
    applyCustomCSS(undefined);

    const styleEl = document.getElementById('uigen-custom-css');
    expect(styleEl).toBeNull();
  });

  it('does nothing when CSS is an empty string', () => {
    applyCustomCSS('');

    const styleEl = document.getElementById('uigen-custom-css');
    expect(styleEl).toBeNull();
  });

  it('custom CSS is appended after existing head content (proper precedence)', () => {
    // Simulate a default stylesheet already in head
    const defaultStyle = document.createElement('style');
    defaultStyle.id = 'default-styles';
    defaultStyle.textContent = 'body { color: black; }';
    document.head.appendChild(defaultStyle);

    applyCustomCSS('body { color: white; }');

    const headChildren = Array.from(document.head.children);
    const defaultIdx = headChildren.findIndex(el => el.id === 'default-styles');
    const customIdx = headChildren.findIndex(el => el.id === 'uigen-custom-css');

    expect(customIdx).toBeGreaterThan(defaultIdx);

    // Cleanup
    defaultStyle.remove();
  });

  it('continues gracefully when appendChild throws', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const appendChildSpy = vi
      .spyOn(document.head, 'appendChild')
      .mockImplementationOnce(() => {
        throw new Error('DOM error');
      });

    // Should not throw
    expect(() => applyCustomCSS('body {}')).not.toThrow();
    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to apply custom CSS:',
      expect.any(Error)
    );

    warnSpy.mockRestore();
    appendChildSpy.mockRestore();
  });
});
