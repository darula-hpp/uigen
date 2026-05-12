import { describe, it, expect } from 'vitest';
import { createInjectionScript } from '../injector.js';

describe('createInjectionScript', () => {
  it('should create injection script with empty code', () => {
    const script = createInjectionScript({
      code: '',
      mode: 'development',
    });

    expect(script).toContain('window.__UIGEN_OVERRIDES__');
    expect(script).toContain('"code":""');
    expect(script).toContain('"mode":"development"');
    expect(script).toMatch(/^<script>.*<\/script>$/);
  });

  it('should create injection script with simple code', () => {
    const code = '(function() { console.log("test"); })()';
    const script = createInjectionScript({
      code,
      mode: 'production',
    });

    expect(script).toContain('window.__UIGEN_OVERRIDES__');
    expect(script).toContain('"mode":"production"');
    expect(script).toMatch(/^<script>.*<\/script>$/);
  });

  it('should escape backslashes in code', () => {
    const code = 'const path = "C:\\\\Users\\\\test"';
    const script = createInjectionScript({
      code,
      mode: 'development',
    });

    // JSON.stringify will handle the escaping
    expect(script).toContain('window.__UIGEN_OVERRIDES__');
    
    // Parse the injected object to verify it's valid
    const match = script.match(/window\.__UIGEN_OVERRIDES__ = (.+);<\/script>$/);
    expect(match).toBeTruthy();
    
    if (match) {
      const parsed = JSON.parse(match[1]);
      expect(parsed.code).toBe(code);
    }
  });

  it('should escape backticks in code', () => {
    const code = 'const str = `template ${literal}`';
    const script = createInjectionScript({
      code,
      mode: 'development',
    });

    expect(script).toContain('window.__UIGEN_OVERRIDES__');
    
    // Parse the injected object to verify it's valid
    const match = script.match(/window\.__UIGEN_OVERRIDES__ = (.+);<\/script>$/);
    expect(match).toBeTruthy();
    
    if (match) {
      const parsed = JSON.parse(match[1]);
      expect(parsed.code).toBe(code);
    }
  });

  it('should escape dollar signs in code', () => {
    const code = 'const price = "$100"';
    const script = createInjectionScript({
      code,
      mode: 'development',
    });

    expect(script).toContain('window.__UIGEN_OVERRIDES__');
    
    // Parse the injected object to verify it's valid
    const match = script.match(/window\.__UIGEN_OVERRIDES__ = (.+);<\/script>$/);
    expect(match).toBeTruthy();
    
    if (match) {
      const parsed = JSON.parse(match[1]);
      expect(parsed.code).toBe(code);
    }
  });

  it('should handle complex JavaScript code', () => {
    const code = `
      (function() {
        const overrides = [
          {
            targetId: 'users.list',
            component: function({ resource }) {
              return React.createElement('div', null, 'Custom View');
            }
          }
        ];
        return overrides;
      })()
    `;
    
    const script = createInjectionScript({
      code,
      mode: 'production',
    });

    expect(script).toContain('window.__UIGEN_OVERRIDES__');
    expect(script).toContain('"mode":"production"');
    
    // Parse the injected object to verify it's valid JSON
    const match = script.match(/window\.__UIGEN_OVERRIDES__ = (.+);<\/script>$/);
    expect(match).toBeTruthy();
    
    if (match) {
      const parsed = JSON.parse(match[1]);
      expect(parsed.code).toBe(code);
      expect(parsed.mode).toBe('production');
    }
  });

  it('should handle code with quotes', () => {
    const code = `const str = "Hello 'World'"; const str2 = 'Hello "World"';`;
    const script = createInjectionScript({
      code,
      mode: 'development',
    });

    expect(script).toContain('window.__UIGEN_OVERRIDES__');
    
    // Parse the injected object to verify it's valid
    const match = script.match(/window\.__UIGEN_OVERRIDES__ = (.+);<\/script>$/);
    expect(match).toBeTruthy();
    
    if (match) {
      const parsed = JSON.parse(match[1]);
      expect(parsed.code).toBe(code);
    }
  });

  it('should handle code with newlines', () => {
    const code = 'line1\nline2\nline3';
    const script = createInjectionScript({
      code,
      mode: 'development',
    });

    expect(script).toContain('window.__UIGEN_OVERRIDES__');
    
    // Parse the injected object to verify it's valid
    const match = script.match(/window\.__UIGEN_OVERRIDES__ = (.+);<\/script>$/);
    expect(match).toBeTruthy();
    
    if (match) {
      const parsed = JSON.parse(match[1]);
      expect(parsed.code).toBe(code);
    }
  });

  it('should produce valid JavaScript that can be executed', () => {
    const code = 'console.log("test")';
    const script = createInjectionScript({
      code,
      mode: 'development',
    });

    // Simulate browser execution
    const window: any = {};
    eval(script.replace('<script>', '').replace('</script>', ''));

    expect(window.__UIGEN_OVERRIDES__).toBeDefined();
    expect(window.__UIGEN_OVERRIDES__.code).toBe(code);
    expect(window.__UIGEN_OVERRIDES__.mode).toBe('development');
  });

  it('should handle development mode', () => {
    const script = createInjectionScript({
      code: 'test',
      mode: 'development',
    });

    expect(script).toContain('"mode":"development"');
  });

  it('should handle production mode', () => {
    const script = createInjectionScript({
      code: 'test',
      mode: 'production',
    });

    expect(script).toContain('"mode":"production"');
  });

  it('should create consistent output for same input', () => {
    const options = {
      code: 'const x = 1;',
      mode: 'development' as const,
    };

    const script1 = createInjectionScript(options);
    const script2 = createInjectionScript(options);

    expect(script1).toBe(script2);
  });

  it('should handle minified production code', () => {
    const code = '!function(){const e=[{targetId:"users.list",component:function({resource:e}){return React.createElement("div",null,"Custom")}}];return e}()';
    const script = createInjectionScript({
      code,
      mode: 'production',
    });

    expect(script).toContain('window.__UIGEN_OVERRIDES__');
    
    // Parse the injected object to verify it's valid
    const match = script.match(/window\.__UIGEN_OVERRIDES__ = (.+);<\/script>$/);
    expect(match).toBeTruthy();
    
    if (match) {
      const parsed = JSON.parse(match[1]);
      expect(parsed.code).toBe(code);
      expect(parsed.mode).toBe('production');
    }
  });

  it('should handle code with HTML-like content', () => {
    const code = 'const html = "<div>Test</div>";';
    const script = createInjectionScript({
      code,
      mode: 'development',
    });

    expect(script).toContain('window.__UIGEN_OVERRIDES__');
    
    // Parse the injected object to verify it's valid
    const match = script.match(/window\.__UIGEN_OVERRIDES__ = (.+);<\/script>$/);
    expect(match).toBeTruthy();
    
    if (match) {
      const parsed = JSON.parse(match[1]);
      // The code should have HTML characters escaped
      expect(parsed.code).toContain('\\u003cdiv\\u003e');
      expect(parsed.code).toContain('\\u003c/div\\u003e');
    }
  });

  it('should handle code with regex patterns', () => {
    const code = 'const regex = /test\\d+/g;';
    const script = createInjectionScript({
      code,
      mode: 'development',
    });

    expect(script).toContain('window.__UIGEN_OVERRIDES__');
    
    // Parse the injected object to verify it's valid
    const match = script.match(/window\.__UIGEN_OVERRIDES__ = (.+);<\/script>$/);
    expect(match).toBeTruthy();
    
    if (match) {
      const parsed = JSON.parse(match[1]);
      expect(parsed.code).toBe(code);
    }
  });

  it('should handle code with unicode characters', () => {
    const code = 'const emoji = "👍"; const chinese = "你好";';
    const script = createInjectionScript({
      code,
      mode: 'development',
    });

    expect(script).toContain('window.__UIGEN_OVERRIDES__');
    
    // Parse the injected object to verify it's valid
    const match = script.match(/window\.__UIGEN_OVERRIDES__ = (.+);<\/script>$/);
    expect(match).toBeTruthy();
    
    if (match) {
      const parsed = JSON.parse(match[1]);
      expect(parsed.code).toBe(code);
    }
  });

  describe('injection safety', () => {
    it('should handle empty code gracefully', () => {
      const script = createInjectionScript({
        code: '',
        mode: 'development',
      });

      expect(script).toContain('window.__UIGEN_OVERRIDES__');
      expect(script).toContain('"code":""');
      
      // Verify it's valid JavaScript
      const window: any = {};
      eval(script.replace('<script>', '').replace('</script>', ''));
      expect(window.__UIGEN_OVERRIDES__.code).toBe('');
    });

    it('should handle null-like values in code', () => {
      const code = 'const x = null; const y = undefined;';
      const script = createInjectionScript({
        code,
        mode: 'development',
      });

      expect(script).toContain('window.__UIGEN_OVERRIDES__');
      
      // Verify it's valid JavaScript
      const window: any = {};
      eval(script.replace('<script>', '').replace('</script>', ''));
      expect(window.__UIGEN_OVERRIDES__.code).toBe(code);
    });

    it('should produce valid JSON that can be parsed', () => {
      const code = 'const test = "value";';
      const script = createInjectionScript({
        code,
        mode: 'production',
      });

      const match = script.match(/window\.__UIGEN_OVERRIDES__ = (.+);<\/script>$/);
      expect(match).toBeTruthy();
      
      if (match) {
        // Should not throw
        const parsed = JSON.parse(match[1]);
        expect(parsed).toHaveProperty('code');
        expect(parsed).toHaveProperty('mode');
      }
    });

    it('should escape all special characters correctly', () => {
      const code = 'const str = "test\\n\\t\\r"; const path = "C:\\\\Users"; const tpl = `${var}`;';
      const script = createInjectionScript({
        code,
        mode: 'development',
      });

      // Verify it's valid JavaScript that can be executed
      const window: any = {};
      expect(() => {
        eval(script.replace('<script>', '').replace('</script>', ''));
      }).not.toThrow();

      expect(window.__UIGEN_OVERRIDES__.code).toBe(code);
    });

    it('should not allow script injection', () => {
      const maliciousCode = '</script><script>alert("XSS")</script><script>';
      const script = createInjectionScript({
        code: maliciousCode,
        mode: 'development',
      });

      // The malicious code should be escaped and not create additional script tags
      // Our implementation escapes < and > to prevent breaking out of the script tag
      expect(script).not.toContain('</script><script>alert');
      expect(script).toContain('\\\\u003c/script\\\\u003e\\\\u003cscript\\\\u003e');
      
      // Verify the code is properly escaped in the JSON
      const match = script.match(/window\.__UIGEN_OVERRIDES__ = (.+);<\/script>$/);
      expect(match).toBeTruthy();
      
      if (match) {
        const parsed = JSON.parse(match[1]);
        // The parsed code should have the escaped version
        expect(parsed.code).toContain('\\u003c/script\\u003e');
        expect(parsed.code).not.toContain('</script><script>');
      }
    });

    it('should handle very long code strings', () => {
      const longCode = 'const x = "' + 'a'.repeat(10000) + '";';
      const script = createInjectionScript({
        code: longCode,
        mode: 'production',
      });

      expect(script).toContain('window.__UIGEN_OVERRIDES__');
      
      // Verify it's valid
      const match = script.match(/window\.__UIGEN_OVERRIDES__ = (.+);<\/script>$/);
      expect(match).toBeTruthy();
      
      if (match) {
        const parsed = JSON.parse(match[1]);
        expect(parsed.code).toBe(longCode);
      }
    });

    it('should handle code with CDATA-like content', () => {
      const code = 'const xml = "<![CDATA[test]]>";';
      const script = createInjectionScript({
        code,
        mode: 'development',
      });

      expect(script).toContain('window.__UIGEN_OVERRIDES__');
      
      // Verify it's valid JavaScript
      const window: any = {};
      expect(() => {
        eval(script.replace('<script>', '').replace('</script>', ''));
      }).not.toThrow();

      // The < and > should be escaped
      const match = script.match(/window\.__UIGEN_OVERRIDES__ = (.+);<\/script>$/);
      if (match) {
        const parsed = JSON.parse(match[1]);
        expect(parsed.code).toContain('\\u003c');
        expect(parsed.code).toContain('\\u003e');
      }
    });

    it('should handle code with comment-like content', () => {
      const code = '// comment\n/* block comment */\nconst x = 1;';
      const script = createInjectionScript({
        code,
        mode: 'development',
      });

      expect(script).toContain('window.__UIGEN_OVERRIDES__');
      
      // Verify it's valid JavaScript
      const window: any = {};
      eval(script.replace('<script>', '').replace('</script>', ''));
      expect(window.__UIGEN_OVERRIDES__.code).toBe(code);
    });

    it('should handle code with script-like strings', () => {
      const code = 'const html = "<script>alert(1)</script>";';
      const script = createInjectionScript({
        code,
        mode: 'development',
      });

      // Should not create actual script tags in the output
      // The < and > should be escaped
      const scriptTagCount = (script.match(/<script>/g) || []).length;
      expect(scriptTagCount).toBe(1); // Only the wrapper script tag
      
      // Verify the malicious script tag is escaped
      const match = script.match(/window\.__UIGEN_OVERRIDES__ = (.+);<\/script>$/);
      if (match) {
        const parsed = JSON.parse(match[1]);
        expect(parsed.code).toContain('\\u003cscript\\u003e');
        expect(parsed.code).toContain('\\u003c/script\\u003e');
      }
    });

    it('should ensure output is always valid JavaScript', () => {
      const testCases = [
        { code: '', expectEscaped: false },
        { code: 'const x = 1;', expectEscaped: false },
        { code: 'function test() { return "value"; }', expectEscaped: false },
        { code: '(() => { console.log("arrow"); })()', expectEscaped: true }, // Contains >
        { code: 'const obj = { key: "value", nested: { deep: true } };', expectEscaped: false },
      ];

      testCases.forEach(({ code, expectEscaped }) => {
        const script = createInjectionScript({
          code,
          mode: 'development',
        });

        // Should not throw when executed
        const window: any = {};
        expect(() => {
          eval(script.replace('<script>', '').replace('</script>', ''));
        }).not.toThrow();

        expect(window.__UIGEN_OVERRIDES__).toBeDefined();
        
        // If the code contains <, >, or &, they will be escaped
        if (expectEscaped) {
          // The code will have escaped characters
          expect(window.__UIGEN_OVERRIDES__.code).toContain('\\u003');
        } else {
          expect(window.__UIGEN_OVERRIDES__.code).toBe(code);
        }
      });
    });

    it('should throw error for null code', () => {
      expect(() => {
        createInjectionScript({
          code: null as any,
          mode: 'development',
        });
      }).toThrow('[UIGen] Invalid code provided for injection');
    });

    it('should throw error for undefined code', () => {
      expect(() => {
        createInjectionScript({
          code: undefined as any,
          mode: 'development',
        });
      }).toThrow('[UIGen] Invalid code provided for injection');
    });

    it('should throw error for non-string code', () => {
      expect(() => {
        createInjectionScript({
          code: 123 as any,
          mode: 'development',
        });
      }).toThrow('[UIGen] Invalid code provided for injection');

      expect(() => {
        createInjectionScript({
          code: {} as any,
          mode: 'development',
        });
      }).toThrow('[UIGen] Invalid code provided for injection');

      expect(() => {
        createInjectionScript({
          code: [] as any,
          mode: 'development',
        });
      }).toThrow('[UIGen] Invalid code provided for injection');
    });

    it('should handle all safety requirements together', () => {
      // Test case that combines all safety requirements:
      // 1. Empty code handling
      // 2. Special character escaping
      // 3. Valid JavaScript output
      
      const testCases = [
        {
          name: 'empty code',
          code: '',
          shouldContainEscaped: false,
        },
        {
          name: 'code with HTML tags',
          code: 'const html = "<div>Test</div>";',
          shouldContainEscaped: true,
        },
        {
          name: 'code with script injection attempt',
          code: '</script><script>alert("XSS")</script><script>',
          shouldContainEscaped: true,
        },
        {
          name: 'code with ampersands',
          code: 'const query = "a=1&b=2&c=3";',
          shouldContainEscaped: false, // Only & is escaped, not < or >
        },
        {
          name: 'complex real-world code',
          code: `
            (function() {
              const overrides = [{
                targetId: 'users.list',
                component: ({ resource }) => {
                  return React.createElement('div', null, 'Custom View');
                }
              }];
              return overrides;
            })()
          `,
          shouldContainEscaped: true, // Contains >
        },
      ];

      testCases.forEach(({ name, code, shouldContainEscaped }) => {
        const script = createInjectionScript({
          code,
          mode: 'production',
        });

        // 1. Should produce valid HTML script tag
        expect(script).toMatch(/^<script>.*<\/script>$/);

        // 2. Should contain the window object assignment
        expect(script).toContain('window.__UIGEN_OVERRIDES__');

        // 3. Should be valid JavaScript that can be executed
        const window: any = {};
        expect(() => {
          eval(script.replace('<script>', '').replace('</script>', ''));
        }).not.toThrow(`Failed for test case: ${name}`);

        // 4. Should have the correct structure
        expect(window.__UIGEN_OVERRIDES__).toBeDefined();
        expect(window.__UIGEN_OVERRIDES__).toHaveProperty('code');
        expect(window.__UIGEN_OVERRIDES__).toHaveProperty('mode');
        expect(window.__UIGEN_OVERRIDES__.mode).toBe('production');

        // 5. Should escape special characters if present
        if (shouldContainEscaped) {
          // Check for escaped < or > characters
          expect(window.__UIGEN_OVERRIDES__.code).toMatch(/\\u003[ce]/);
        }

        // 6. Should not allow breaking out of script tag
        const scriptTagCount = (script.match(/<script>/g) || []).length;
        expect(scriptTagCount).toBe(1); // Only the wrapper script tag
      });
    });
  });
});
