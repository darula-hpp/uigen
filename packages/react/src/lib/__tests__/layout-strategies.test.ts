import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LayoutRegistry } from '../layout-registry';
import { registerLayoutStrategies } from '../layout-strategies';

describe('registerLayoutStrategies', () => {
  let registry: LayoutRegistry;

  beforeEach(() => {
    registry = LayoutRegistry.getInstance();
    registry.clear();
  });

  it('should register all built-in layout strategies', () => {
    registerLayoutStrategies();

    const registeredTypes = registry.getRegisteredTypes();

    expect(registeredTypes).toContain('sidebar');
    expect(registeredTypes).toContain('centered');
    expect(registeredTypes).toContain('dashboard-grid');
    expect(registeredTypes).toHaveLength(3);
  });

  it('should set sidebar as the default layout type', () => {
    registerLayoutStrategies();

    // Request a non-existent type to verify fallback to default
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fallbackStrategy = registry.get('nonexistent' as any);

    expect(fallbackStrategy.type).toBe('sidebar');

    consoleErrorSpy.mockRestore();
  });

  it('should register SidebarLayoutStrategy correctly', () => {
    registerLayoutStrategies();

    const strategy = registry.get('sidebar');

    expect(strategy.type).toBe('sidebar');
    expect(typeof strategy.render).toBe('function');
    expect(typeof strategy.validate).toBe('function');
    expect(typeof strategy.getDefaults).toBe('function');
  });

  it('should register CenteredLayoutStrategy correctly', () => {
    registerLayoutStrategies();

    const strategy = registry.get('centered');

    expect(strategy.type).toBe('centered');
    expect(typeof strategy.render).toBe('function');
    expect(typeof strategy.validate).toBe('function');
    expect(typeof strategy.getDefaults).toBe('function');
  });

  it('should register DashboardGridLayoutStrategy correctly', () => {
    registerLayoutStrategies();

    const strategy = registry.get('dashboard-grid');

    expect(strategy.type).toBe('dashboard-grid');
    expect(typeof strategy.render).toBe('function');
    expect(typeof strategy.validate).toBe('function');
    expect(typeof strategy.getDefaults).toBe('function');
  });

  it('should be idempotent - safe to call multiple times', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    registerLayoutStrategies();
    registerLayoutStrategies();
    registerLayoutStrategies();

    const registeredTypes = registry.getRegisteredTypes();

    // Should still have exactly 3 strategies
    expect(registeredTypes).toHaveLength(3);
    expect(registeredTypes).toContain('sidebar');
    expect(registeredTypes).toContain('centered');
    expect(registeredTypes).toContain('dashboard-grid');

    // Should have warned about overwriting
    expect(consoleWarnSpy).toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
  });

  it('should return correct defaults for SidebarLayoutStrategy', () => {
    registerLayoutStrategies();

    const strategy = registry.get('sidebar');
    const defaults = strategy.getDefaults();

    expect(defaults).toEqual({
      sidebarWidth: 256,
      sidebarCollapsible: true,
      sidebarDefaultCollapsed: false
    });
  });

  it('should return correct defaults for CenteredLayoutStrategy', () => {
    registerLayoutStrategies();

    const strategy = registry.get('centered');
    const defaults = strategy.getDefaults();

    expect(defaults).toEqual({
      maxWidth: 480,
      showHeader: true,
      verticalCenter: true
    });
  });

  it('should return correct defaults for DashboardGridLayoutStrategy', () => {
    registerLayoutStrategies();

    const strategy = registry.get('dashboard-grid');
    const defaults = strategy.getDefaults();

    expect(defaults).toEqual({
      columns: {
        mobile: 1,
        tablet: 2,
        desktop: 3
      },
      gap: 24
    });
  });
});
