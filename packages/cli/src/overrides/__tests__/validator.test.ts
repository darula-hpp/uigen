import { describe, it, expect, beforeEach } from 'vitest';
import { validateOverrides } from '../validator.js';
import type { DiscoveredOverride } from '../discovery.js';

describe('validateOverrides', () => {
  let testFiles: DiscoveredOverride[];

  beforeEach(() => {
    testFiles = [
      { filePath: '/test/override1.tsx', relativePath: 'override1.tsx' },
      { filePath: '/test/override2.tsx', relativePath: 'override2.tsx' },
    ];
  });

  it('should return valid result for empty code', () => {
    const result = validateOverrides({
      code: '',
      files: [],
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.duplicates.size).toBe(0);
  });

  it('should validate a single valid override with component', () => {
    const code = `
      (() => {
        return {
          targetId: 'users.list',
          component: () => ({ type: 'div', props: { children: 'Custom' } })
        };
      })()
    `;

    const result = validateOverrides({
      code,
      files: [testFiles[0]],
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('should validate a single valid override with render', () => {
    const code = `
      (() => {
        return {
          targetId: 'users.list',
          render: (props) => ({ type: 'div', props: { children: 'Custom' } })
        };
      })()
    `;

    const result = validateOverrides({
      code,
      files: [testFiles[0]],
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should validate a single valid override with useHooks', () => {
    const code = `
      (() => {
        return {
          targetId: 'users.list',
          useHooks: (props) => ({ customData: 'value' })
        };
      })()
    `;

    const result = validateOverrides({
      code,
      files: [testFiles[0]],
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should validate override with multiple modes', () => {
    const code = `
      (() => {
        return {
          targetId: 'users.list',
          component: () => ({ type: 'div' }),
          render: (props) => ({ type: 'span' }),
          useHooks: (props) => ({})
        };
      })()
    `;

    const result = validateOverrides({
      code,
      files: [testFiles[0]],
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should validate array of overrides', () => {
    const code = `
      (() => {
        return [
          {
            targetId: 'users.list',
            component: () => ({ type: 'div' })
          },
          {
            targetId: 'users.detail',
            render: (props) => ({ type: 'span' })
          }
        ];
      })()
    `;

    const result = validateOverrides({
      code,
      files: testFiles,
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should fail validation when targetId is missing', () => {
    const code = `
      (() => {
        return {
          component: () => ({ type: 'div' })
        };
      })()
    `;

    const result = validateOverrides({
      code,
      files: [testFiles[0]],
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].message).toContain('targetId');
    expect(result.errors[0].filePath).toBe(testFiles[0].filePath);
  });

  it('should fail validation when targetId is not a string', () => {
    const code = `
      (() => {
        return {
          targetId: 123,
          component: () => ({ type: 'div' })
        };
      })()
    `;

    const result = validateOverrides({
      code,
      files: [testFiles[0]],
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].message).toContain('string');
    expect(result.errors[0].targetId).toBe('123');
  });

  it('should fail validation when no override mode is present', () => {
    const code = `
      (() => {
        return {
          targetId: 'users.list'
        };
      })()
    `;

    const result = validateOverrides({
      code,
      files: [testFiles[0]],
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].message).toContain('component, render, useHooks');
    expect(result.errors[0].targetId).toBe('users.list');
  });

  it('should fail validation when override modes are undefined', () => {
    const code = `
      (() => {
        return {
          targetId: 'users.list',
          component: undefined,
          render: undefined,
          useHooks: undefined
        };
      })()
    `;

    const result = validateOverrides({
      code,
      files: [testFiles[0]],
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].message).toContain('component, render, useHooks');
  });

  it('should fail validation when override is not an object', () => {
    const code = `
      (() => {
        return "not an object";
      })()
    `;

    const result = validateOverrides({
      code,
      files: [testFiles[0]],
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].message).toContain('Invalid override format');
  });

  it('should fail validation when override is null', () => {
    const code = `
      (() => {
        return null;
      })()
    `;

    const result = validateOverrides({
      code,
      files: [testFiles[0]],
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBe(1);
  });

  it('should fail validation when code execution fails', () => {
    const code = `
      (() => {
        throw new Error('Execution failed');
      })()
    `;

    const result = validateOverrides({
      code,
      files: [testFiles[0]],
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].message).toContain('Failed to execute');
  });

  it('should detect duplicate targetIds', () => {
    const code = `
      (() => {
        return [
          {
            targetId: 'users.list',
            component: () => ({ type: 'div' })
          },
          {
            targetId: 'users.list',
            component: () => ({ type: 'span' })
          }
        ];
      })()
    `;

    const result = validateOverrides({
      code,
      files: testFiles,
    });

    expect(result.valid).toBe(true); // Still valid, just a warning
    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0].message).toContain('Duplicate targetId');
    expect(result.warnings[0].targetId).toBe('users.list');
    expect(result.duplicates.size).toBe(1);
    expect(result.duplicates.get('users.list')).toEqual([
      testFiles[0].filePath,
      testFiles[1].filePath,
    ]);
  });

  it('should detect multiple duplicate targetIds', () => {
    const code = `
      (() => {
        return [
          { targetId: 'users.list', component: () => ({}) },
          { targetId: 'users.list', component: () => ({}) },
          { targetId: 'users.detail', component: () => ({}) },
          { targetId: 'users.detail', component: () => ({}) }
        ];
      })()
    `;

    const files = [
      { filePath: '/test/file1.tsx', relativePath: 'file1.tsx' },
      { filePath: '/test/file2.tsx', relativePath: 'file2.tsx' },
      { filePath: '/test/file3.tsx', relativePath: 'file3.tsx' },
      { filePath: '/test/file4.tsx', relativePath: 'file4.tsx' },
    ];

    const result = validateOverrides({
      code,
      files,
    });

    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBe(2);
    expect(result.duplicates.size).toBe(2);
    expect(result.duplicates.has('users.list')).toBe(true);
    expect(result.duplicates.has('users.detail')).toBe(true);
  });

  it('should handle mixed valid and invalid overrides', () => {
    const code = `
      (() => {
        return [
          {
            targetId: 'users.list',
            component: () => ({ type: 'div' })
          },
          {
            // Missing targetId
            component: () => ({ type: 'span' })
          },
          {
            targetId: 'users.detail',
            // Missing override modes
          }
        ];
      })()
    `;

    const files = [
      { filePath: '/test/file1.tsx', relativePath: 'file1.tsx' },
      { filePath: '/test/file2.tsx', relativePath: 'file2.tsx' },
      { filePath: '/test/file3.tsx', relativePath: 'file3.tsx' },
    ];

    const result = validateOverrides({
      code,
      files,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBe(2);
    expect(result.errors[0].message).toContain('targetId');
    expect(result.errors[1].message).toContain('component, render, useHooks');
  });

  it('should not log when verbose is false', () => {
    const code = `
      (() => {
        return {
          targetId: 'users.list',
          component: () => ({ type: 'div' })
        };
      })()
    `;

    // Capture console.log
    const originalLog = console.log;
    let logCalled = false;
    console.log = () => { logCalled = true; };

    validateOverrides({
      code,
      files: [testFiles[0]],
      verbose: false,
    });

    console.log = originalLog;
    expect(logCalled).toBe(false);
  });

  it('should log when verbose is true', () => {
    const code = `
      (() => {
        return {
          targetId: 'users.list',
          component: () => ({ type: 'div' })
        };
      })()
    `;

    // Capture console.log
    const originalLog = console.log;
    const logs: string[] = [];
    console.log = (msg: string) => { logs.push(msg); };

    validateOverrides({
      code,
      files: [testFiles[0]],
      verbose: true,
    });

    console.log = originalLog;
    expect(logs.some(log => log.includes('Validating'))).toBe(true);
    expect(logs.some(log => log.includes('Validation complete'))).toBe(true);
  });

  it('should log errors in verbose mode', () => {
    const code = `
      (() => {
        return {
          targetId: 'users.list'
          // Missing override modes
        };
      })()
    `;

    // Capture console.error
    const originalError = console.error;
    const errors: string[] = [];
    console.error = (...args: any[]) => { errors.push(args.join(' ')); };

    validateOverrides({
      code,
      files: [testFiles[0]],
      verbose: true,
    });

    console.error = originalError;
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(err => err.includes('UIGen Overrides'))).toBe(true);
  });

  it('should log warnings in verbose mode', () => {
    const code = `
      (() => {
        return [
          {
            targetId: 'users.list',
            component: () => ({ type: 'div' })
          },
          {
            targetId: 'users.list',
            component: () => ({ type: 'span' })
          }
        ];
      })()
    `;

    // Capture console.warn
    const originalWarn = console.warn;
    const warnings: string[] = [];
    console.warn = (...args: any[]) => { warnings.push(args.join(' ')); };

    validateOverrides({
      code,
      files: testFiles,
      verbose: true,
    });

    console.warn = originalWarn;
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings.some(warn => warn.includes('Duplicate targetId'))).toBe(true);
  });

  it('should handle override with null value', () => {
    const code = `
      (() => {
        return [
          {
            targetId: 'users.list',
            component: () => ({ type: 'div' })
          },
          null
        ];
      })()
    `;

    const result = validateOverrides({
      code,
      files: testFiles,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].message).toContain('object');
  });

  it('should handle empty array of overrides', () => {
    const code = `
      (() => {
        return [];
      })()
    `;

    const result = validateOverrides({
      code,
      files: [],
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should validate override with extra properties', () => {
    const code = `
      (() => {
        return {
          targetId: 'users.list',
          component: () => ({ type: 'div' }),
          extraProp: 'value',
          anotherProp: 123
        };
      })()
    `;

    const result = validateOverrides({
      code,
      files: [testFiles[0]],
    });

    // Extra properties should not cause validation to fail
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should handle complex targetId strings', () => {
    const code = `
      (() => {
        return [
          {
            targetId: 'users.list.paginated',
            component: () => ({ type: 'div' })
          },
          {
            targetId: 'auth.login.oauth.google',
            component: () => ({ type: 'div' })
          },
          {
            targetId: 'api-v2.users',
            component: () => ({ type: 'div' })
          }
        ];
      })()
    `;

    const files = [
      { filePath: '/test/file1.tsx', relativePath: 'file1.tsx' },
      { filePath: '/test/file2.tsx', relativePath: 'file2.tsx' },
      { filePath: '/test/file3.tsx', relativePath: 'file3.tsx' },
    ];

    const result = validateOverrides({
      code,
      files,
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should provide descriptive error messages', () => {
    const code = `
      (() => {
        return {
          targetId: 'users.list'
        };
      })()
    `;

    const result = validateOverrides({
      code,
      files: [testFiles[0]],
    });

    expect(result.errors[0].message).toBe(
      'Override must have at least one of: component, render, useHooks'
    );
    expect(result.errors[0].filePath).toBe(testFiles[0].filePath);
    expect(result.errors[0].targetId).toBe('users.list');
  });

  it('should handle code with syntax that eval cannot execute', () => {
    const code = 'this is not valid javascript';

    const result = validateOverrides({
      code,
      files: [testFiles[0]],
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].message).toContain('Failed to execute');
  });
});
