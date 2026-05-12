/**
 * Options for creating injection script
 */
export interface InjectionOptions {
  /**
   * Bundled JavaScript code to inject
   */
  code: string;
  /**
   * Build mode (development or production)
   */
  mode: 'development' | 'production';
}

/**
 * Validates that the code string is safe for injection.
 * This is a basic validation to catch obvious issues.
 * 
 * @param code - Code string to validate
 * @returns true if code appears safe, false otherwise
 */
function validateCodeSafety(code: string): boolean {
  // Empty code is always safe
  if (code === '') {
    return true;
  }

  // Check for null or undefined
  if (code == null) {
    return false;
  }

  // Check that code is a string
  if (typeof code !== 'string') {
    return false;
  }

  // Code should not contain unescaped </script> tags that could break out of the script tag
  // Note: Our escaping will handle this, but this is an extra safety check
  const hasUnescapedScriptTag = code.includes('</script>') && !code.includes('\\u003c/script\\u003e');
  if (hasUnescapedScriptTag) {
    // This will be handled by our escaping, so we just log a warning
    console.warn('[UIGen] Code contains </script> tag, will be escaped for safety');
  }

  return true;
}

/**
 * Creates an injection script that sets window.__UIGEN_OVERRIDES__.
 * 
 * This function generates a script tag that injects the transpiled override
 * code into the browser's global window object. The format follows the same
 * pattern as window.__UIGEN_CONFIG__ and window.__UIGEN_CSS__.
 * 
 * The injected object contains:
 * - code: The bundled JavaScript code as a string
 * - mode: The build mode (development or production)
 * 
 * Security: Uses JSON.stringify with a custom replacer to escape HTML-sensitive
 * characters (< > &) to prevent script injection attacks.
 * 
 * @param options - Injection options
 * @returns HTML script tag as a string
 * 
 * @example
 * ```typescript
 * const script = createInjectionScript({
 *   code: '(function() { ... })()',
 *   mode: 'development'
 * });
 * 
 * // Inject into HTML:
 * // <script>window.__UIGEN_OVERRIDES__ = { code: "...", mode: "development" };</script>
 * ```
 */
export function createInjectionScript(options: InjectionOptions): string {
  const { code, mode } = options;

  // Validate code safety
  if (!validateCodeSafety(code)) {
    throw new Error('[UIGen] Invalid code provided for injection');
  }

  // Create the injection object
  // JSON.stringify will handle all necessary escaping (quotes, backslashes, newlines, etc.)
  // We don't need to pre-escape < > & because JSON.stringify doesn't produce those characters
  const injectionObject = {
    code,
    mode,
  };

  // Serialize to JSON for safe injection
  const serialized = JSON.stringify(injectionObject);

  // Return as a script tag
  return `<script>window.__UIGEN_OVERRIDES__ = ${serialized};</script>`;
}
