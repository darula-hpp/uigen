import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { registerInjectedOverrides } from '../registration';
import { overrideRegistry } from '../registry';

describe('registerInjectedOverrides', () => {
  // Store original window object
  let originalWindow: any;
  
  beforeEach(() => {
    // Clear registry before each test
    overrideRegistry.clear();
    
    // Store original window
    originalWindow = global.window;
    
    // Mock window object
    global.window = {
      __UIGEN_OVERRIDES__: undefined,
    } as any;
  });

  afterEach(() => {
    // Restore original window
    global.window = originalWindow;
  });

  it('should do nothing when window is undefined', () => {
    // Remove window
    const tempWindow = global.window;
    (global as any).window = undefined;
    
    // Should not throw
    expect(() => registerInjectedOverrides()).not.toThrow();
    
    // Restore window
    global.window = tempWindow;
  });

  it('should do nothing when __UIGEN_OVERRIDES__ is undefined', () => {
    registerInjectedOverrides();
    
    // Registry should be empty
    expect(overrideRegistry.getAllTargetIds()).toEqual([]);
  });

  it('should do nothing when code is empty', () => {
    global.window.__UIGEN_OVERRIDES__ = {
      code: '',
      mode: 'development',
    };
    
    registerInjectedOverrides();
    
    // Registry should be empty
    expect(overrideRegistry.getAllTargetIds()).toEqual([]);
  });

  it('should register a single override from valid code', () => {
    // Create code that returns an array of overrides
    const code = `
      (function() {
        return [{
          targetId: 'users.list',
          component: function() { return null; }
        }];
      })()
    `;
    
    global.window.__UIGEN_OVERRIDES__ = {
      code,
      mode: 'development',
    };
    
    // Spy on console.log
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    registerInjectedOverrides();
    
    // Should register the override
    expect(overrideRegistry.has('users.list')).toBe(true);
    expect(overrideRegistry.getAllTargetIds()).toEqual(['users.list']);
    
    // Should log success
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Registered 1 override'));
    
    logSpy.mockRestore();
  });

  it('should register multiple overrides from valid code', () => {
    const code = `
      (function() {
        return [
          {
            targetId: 'users.list',
            component: function() { return null; }
          },
          {
            targetId: 'users.detail',
            render: function() { return null; }
          },
          {
            targetId: 'users.create',
            useHooks: function() { return {}; }
          }
        ];
      })()
    `;
    
    global.window.__UIGEN_OVERRIDES__ = {
      code,
      mode: 'development',
    };
    
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    registerInjectedOverrides();
    
    // Should register all overrides
    expect(overrideRegistry.has('users.list')).toBe(true);
    expect(overrideRegistry.has('users.detail')).toBe(true);
    expect(overrideRegistry.has('users.create')).toBe(true);
    expect(overrideRegistry.getAllTargetIds()).toHaveLength(3);
    
    // Should log success
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Registered 3 override'));
    
    logSpy.mockRestore();
  });

  it('should skip invalid overrides (missing targetId)', () => {
    const code = `
      (function() {
        return [
          {
            targetId: 'users.list',
            component: function() { return null; }
          },
          {
            // Missing targetId
            component: function() { return null; }
          }
        ];
      })()
    `;
    
    global.window.__UIGEN_OVERRIDES__ = {
      code,
      mode: 'development',
    };
    
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    registerInjectedOverrides();
    
    // Should register only the valid override
    expect(overrideRegistry.has('users.list')).toBe(true);
    expect(overrideRegistry.getAllTargetIds()).toHaveLength(1);
    
    // Should warn about invalid override
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Skipping invalid override'),
      expect.anything()
    );
    
    // Should log success with failure count
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Registered 1 override(s) (1 failed)'));
    
    warnSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('should skip invalid overrides (missing override mode)', () => {
    const code = `
      (function() {
        return [
          {
            targetId: 'users.list',
            component: function() { return null; }
          },
          {
            targetId: 'users.detail'
            // Missing component, render, and useHooks
          }
        ];
      })()
    `;
    
    global.window.__UIGEN_OVERRIDES__ = {
      code,
      mode: 'development',
    };
    
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    registerInjectedOverrides();
    
    // Should register only the valid override
    expect(overrideRegistry.has('users.list')).toBe(true);
    expect(overrideRegistry.getAllTargetIds()).toHaveLength(1);
    
    // Should warn about invalid override
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Skipping invalid override'),
      expect.anything()
    );
    
    warnSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('should handle code execution errors gracefully', () => {
    const code = `
      (function() {
        throw new Error('Test error');
      })()
    `;
    
    global.window.__UIGEN_OVERRIDES__ = {
      code,
      mode: 'development',
    };
    
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Should not throw
    expect(() => registerInjectedOverrides()).not.toThrow();
    
    // Should log error
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to load overrides'),
      expect.anything()
    );
    
    // Registry should be empty
    expect(overrideRegistry.getAllTargetIds()).toEqual([]);
    
    errorSpy.mockRestore();
  });

  it('should handle invalid return type (not an array)', () => {
    const code = `
      (function() {
        return { targetId: 'users.list', component: function() {} };
      })()
    `;
    
    global.window.__UIGEN_OVERRIDES__ = {
      code,
      mode: 'development',
    };
    
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    registerInjectedOverrides();
    
    // Should log error about invalid format
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid override format: expected array'),
      expect.anything()
    );
    
    // Registry should be empty
    expect(overrideRegistry.getAllTargetIds()).toEqual([]);
    
    errorSpy.mockRestore();
  });

  it('should handle empty array result', () => {
    const code = `
      (function() {
        return [];
      })()
    `;
    
    global.window.__UIGEN_OVERRIDES__ = {
      code,
      mode: 'development',
    };
    
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    registerInjectedOverrides();
    
    // Should log that no overrides were found
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('No overrides found'));
    
    // Registry should be empty
    expect(overrideRegistry.getAllTargetIds()).toEqual([]);
    
    logSpy.mockRestore();
  });

  it('should handle registration errors for individual overrides', () => {
    const code = `
      (function() {
        return [
          {
            targetId: 'users.list',
            component: function() { return null; }
          },
          {
            targetId: 'users.detail',
            component: function() { return null; }
          }
        ];
      })()
    `;
    
    global.window.__UIGEN_OVERRIDES__ = {
      code,
      mode: 'development',
    };
    
    // Mock registry.register to throw for the second override
    const originalRegister = overrideRegistry.register.bind(overrideRegistry);
    let callCount = 0;
    overrideRegistry.register = vi.fn((def) => {
      callCount++;
      if (callCount === 2) {
        throw new Error('Test registration error');
      }
      originalRegister(def);
    });
    
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    registerInjectedOverrides();
    
    // Should register the first override
    expect(overrideRegistry.has('users.list')).toBe(true);
    
    // Should log error for the second override
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to register override for users.detail'),
      expect.anything()
    );
    
    // Should log success with failure count
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Registered 1 override(s) (1 failed)'));
    
    errorSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('should log code preview in development mode on error', () => {
    const code = `
      (function() {
        throw new Error('Test error');
      })()
    `;
    
    global.window.__UIGEN_OVERRIDES__ = {
      code,
      mode: 'development',
    };
    
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    registerInjectedOverrides();
    
    // Should log code preview
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Injected code preview'),
      expect.stringContaining('function')
    );
    
    errorSpy.mockRestore();
  });

  it('should not log code preview in production mode on error', () => {
    const code = `
      (function() {
        throw new Error('Test error');
      })()
    `;
    
    global.window.__UIGEN_OVERRIDES__ = {
      code,
      mode: 'production',
    };
    
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    registerInjectedOverrides();
    
    // Should log error but not code preview
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to load overrides'),
      expect.anything()
    );
    
    // Should not log code preview
    const calls = errorSpy.mock.calls;
    const hasCodePreview = calls.some(call => 
      call.some(arg => typeof arg === 'string' && arg.includes('Injected code preview'))
    );
    expect(hasCodePreview).toBe(false);
    
    errorSpy.mockRestore();
  });

  it('should try alternative execution approach if first approach fails', () => {
    // Code that is not a valid expression but sets a global variable
    const code = `
      window.__UIGEN_OVERRIDE_EXPORTS__ = [{
        targetId: 'users.list',
        component: function() { return null; }
      }];
    `;
    
    global.window.__UIGEN_OVERRIDES__ = {
      code,
      mode: 'development',
    };
    
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    registerInjectedOverrides();
    
    // Should warn about trying alternative approach
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to execute override code as expression')
    );
    
    // Should register the override
    expect(overrideRegistry.has('users.list')).toBe(true);
    
    // Should log success
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Registered 1 override'));
    
    warnSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('should validate override has component, render, or useHooks', () => {
    const code = `
      (function() {
        return [
          {
            targetId: 'users.list',
            component: function() { return null; }
          },
          {
            targetId: 'users.detail',
            render: function() { return null; }
          },
          {
            targetId: 'users.create',
            useHooks: function() { return {}; }
          }
        ];
      })()
    `;
    
    global.window.__UIGEN_OVERRIDES__ = {
      code,
      mode: 'development',
    };
    
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    registerInjectedOverrides();
    
    // All three should be registered
    expect(overrideRegistry.has('users.list')).toBe(true);
    expect(overrideRegistry.has('users.detail')).toBe(true);
    expect(overrideRegistry.has('users.create')).toBe(true);
    
    logSpy.mockRestore();
  });
});
