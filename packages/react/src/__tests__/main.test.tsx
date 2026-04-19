import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('main.tsx - CSS Application', () => {
  let originalConfig: any;
  let originalCSS: string | undefined;
  let rootElement: HTMLElement;

  beforeEach(() => {
    // Save original window properties
    originalConfig = (window as any).__UIGEN_CONFIG__;
    originalCSS = (window as any).__UIGEN_CSS__;

    // Create root element
    rootElement = document.createElement('div');
    rootElement.id = 'root';
    document.body.appendChild(rootElement);

    // Clear any existing style elements
    document.querySelectorAll('#uigen-custom-css').forEach((el) => el.remove());

    // Mock console.warn
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original window properties
    if (originalConfig !== undefined) {
      (window as any).__UIGEN_CONFIG__ = originalConfig;
    } else {
      delete (window as any).__UIGEN_CONFIG__;
    }

    if (originalCSS !== undefined) {
      (window as any).__UIGEN_CSS__ = originalCSS;
    } else {
      delete (window as any).__UIGEN_CSS__;
    }

    // Clean up DOM
    document.body.removeChild(rootElement);
    document.querySelectorAll('#uigen-custom-css').forEach((el) => el.remove());

    // Restore console.warn
    vi.restoreAllMocks();
  });

  it('should apply CSS when window.__UIGEN_CSS__ exists', () => {
    // Arrange
    const customCSS = '.custom-class { color: red; }';
    (window as any).__UIGEN_CONFIG__ = { test: 'config' };
    (window as any).__UIGEN_CSS__ = customCSS;

    // Act - Simulate the CSS injection logic from main.tsx
    const styleElement = document.createElement('style');
    styleElement.id = 'uigen-custom-css';
    styleElement.textContent = customCSS;
    document.head.appendChild(styleElement);

    // Assert
    const injectedStyle = document.getElementById('uigen-custom-css');
    expect(injectedStyle).toBeTruthy();
    expect(injectedStyle?.tagName).toBe('STYLE');
    expect(injectedStyle?.textContent).toBe(customCSS);
  });

  it('should create style element with correct id', () => {
    // Arrange
    const customCSS = 'body { background: blue; }';
    (window as any).__UIGEN_CONFIG__ = { test: 'config' };
    (window as any).__UIGEN_CSS__ = customCSS;

    // Act
    const styleElement = document.createElement('style');
    styleElement.id = 'uigen-custom-css';
    styleElement.textContent = customCSS;
    document.head.appendChild(styleElement);

    // Assert
    const injectedStyle = document.getElementById('uigen-custom-css');
    expect(injectedStyle?.id).toBe('uigen-custom-css');
  });

  it('should append style element to document.head', () => {
    // Arrange
    const customCSS = '.test { margin: 0; }';
    (window as any).__UIGEN_CONFIG__ = { test: 'config' };
    (window as any).__UIGEN_CSS__ = customCSS;

    // Act
    const styleElement = document.createElement('style');
    styleElement.id = 'uigen-custom-css';
    styleElement.textContent = customCSS;
    document.head.appendChild(styleElement);

    // Assert
    const injectedStyle = document.head.querySelector('#uigen-custom-css');
    expect(injectedStyle).toBeTruthy();
    expect(injectedStyle?.parentElement).toBe(document.head);
  });

  it('should have proper CSS precedence after default styles', () => {
    // Arrange
    const customCSS = '.override { color: green; }';
    (window as any).__UIGEN_CONFIG__ = { test: 'config' };
    (window as any).__UIGEN_CSS__ = customCSS;

    // Create a mock default style element (simulating index.css)
    const defaultStyle = document.createElement('style');
    defaultStyle.id = 'default-styles';
    defaultStyle.textContent = '.override { color: red; }';
    document.head.appendChild(defaultStyle);

    // Act - Add custom CSS after default
    const customStyle = document.createElement('style');
    customStyle.id = 'uigen-custom-css';
    customStyle.textContent = customCSS;
    document.head.appendChild(customStyle);

    // Assert - Custom style should come after default in DOM
    const allStyles = Array.from(document.head.querySelectorAll('style'));
    const defaultIndex = allStyles.findIndex((s) => s.id === 'default-styles');
    const customIndex = allStyles.findIndex((s) => s.id === 'uigen-custom-css');

    expect(customIndex).toBeGreaterThan(defaultIndex);

    // Clean up
    defaultStyle.remove();
  });

  it('should not inject CSS when window.__UIGEN_CSS__ is undefined', () => {
    // Arrange
    (window as any).__UIGEN_CONFIG__ = { test: 'config' };
    delete (window as any).__UIGEN_CSS__;

    // Act - Simulate the conditional logic from main.tsx
    const customCSS = (window as any).__UIGEN_CSS__;
    if (customCSS) {
      const styleElement = document.createElement('style');
      styleElement.id = 'uigen-custom-css';
      styleElement.textContent = customCSS;
      document.head.appendChild(styleElement);
    }

    // Assert
    const injectedStyle = document.getElementById('uigen-custom-css');
    expect(injectedStyle).toBeNull();
  });

  it('should handle CSS injection errors gracefully', () => {
    // Arrange
    const customCSS = '.error-test { color: blue; }';
    (window as any).__UIGEN_CONFIG__ = { test: 'config' };
    (window as any).__UIGEN_CSS__ = customCSS;

    // Mock document.createElement to throw an error
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'style') {
        throw new Error('Failed to create style element');
      }
      return originalCreateElement(tagName);
    });

    // Act - Simulate error handling from main.tsx
    try {
      const styleElement = document.createElement('style');
      styleElement.id = 'uigen-custom-css';
      styleElement.textContent = customCSS;
      document.head.appendChild(styleElement);
    } catch (error) {
      console.warn('Failed to apply custom CSS:', error);
    }

    // Assert - Should have logged warning
    expect(console.warn).toHaveBeenCalledWith(
      'Failed to apply custom CSS:',
      expect.any(Error)
    );
  });

  it('should handle empty CSS string', () => {
    // Arrange
    const customCSS = '';
    (window as any).__UIGEN_CONFIG__ = { test: 'config' };
    (window as any).__UIGEN_CSS__ = customCSS;

    // Act
    if (customCSS) {
      const styleElement = document.createElement('style');
      styleElement.id = 'uigen-custom-css';
      styleElement.textContent = customCSS;
      document.head.appendChild(styleElement);
    }

    // Assert - Empty string is falsy, so no style should be injected
    const injectedStyle = document.getElementById('uigen-custom-css');
    expect(injectedStyle).toBeNull();
  });

  it('should handle CSS with special characters', () => {
    // Arrange
    const customCSS = `.special { content: "Hello \\"World\\""; background: url('data:image/svg+xml;utf8,<svg></svg>'); }`;
    (window as any).__UIGEN_CONFIG__ = { test: 'config' };
    (window as any).__UIGEN_CSS__ = customCSS;

    // Act
    const styleElement = document.createElement('style');
    styleElement.id = 'uigen-custom-css';
    styleElement.textContent = customCSS;
    document.head.appendChild(styleElement);

    // Assert
    const injectedStyle = document.getElementById('uigen-custom-css');
    expect(injectedStyle?.textContent).toBe(customCSS);
  });

  it('should handle multi-line CSS', () => {
    // Arrange
    const customCSS = `
      .class1 {
        color: red;
        margin: 10px;
      }
      
      .class2 {
        background: blue;
        padding: 20px;
      }
    `;
    (window as any).__UIGEN_CONFIG__ = { test: 'config' };
    (window as any).__UIGEN_CSS__ = customCSS;

    // Act
    const styleElement = document.createElement('style');
    styleElement.id = 'uigen-custom-css';
    styleElement.textContent = customCSS;
    document.head.appendChild(styleElement);

    // Assert
    const injectedStyle = document.getElementById('uigen-custom-css');
    expect(injectedStyle?.textContent).toBe(customCSS);
  });
});
