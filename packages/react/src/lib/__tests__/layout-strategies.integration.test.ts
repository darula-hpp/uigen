import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LayoutRegistry } from '../layout-registry';

/**
 * Integration test to verify layout strategies are registered on module load
 * This simulates what happens when App.tsx is imported
 */
describe('Layout Strategies Integration', () => {
  let registry: LayoutRegistry;

  beforeEach(() => {
    registry = LayoutRegistry.getInstance();
  });

  it('should have all strategies registered after importing App', async () => {
    // Import App which triggers registerLayoutStrategies()
    await import('../../App');

    const registeredTypes = registry.getRegisteredTypes();

    expect(registeredTypes).toContain('sidebar');
    expect(registeredTypes).toContain('centered');
    expect(registeredTypes).toContain('dashboard-grid');
  });

  it('should have sidebar set as default after importing App', async () => {
    await import('../../App');

    // Request a non-existent type to verify fallback to default
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fallbackStrategy = registry.get('nonexistent' as any);

    expect(fallbackStrategy.type).toBe('sidebar');

    consoleErrorSpy.mockRestore();
  });

  it('should be able to retrieve and use SidebarLayoutStrategy', async () => {
    await import('../../App');

    const strategy = registry.get('sidebar');

    expect(strategy.type).toBe('sidebar');
    expect(strategy.validate()).toBe(true);
    expect(strategy.getDefaults()).toEqual({
      sidebarWidth: 256,
      sidebarCollapsible: true,
      sidebarDefaultCollapsed: false
    });
  });

  it('should be able to retrieve and use CenteredLayoutStrategy', async () => {
    await import('../../App');

    const strategy = registry.get('centered');

    expect(strategy.type).toBe('centered');
    expect(strategy.validate()).toBe(true);
    expect(strategy.getDefaults()).toEqual({
      maxWidth: 480,
      showHeader: true,
      verticalCenter: true
    });
  });

  it('should be able to retrieve and use DashboardGridLayoutStrategy', async () => {
    await import('../../App');

    const strategy = registry.get('dashboard-grid');

    expect(strategy.type).toBe('dashboard-grid');
    expect(strategy.validate()).toBe(true);
    expect(strategy.getDefaults()).toEqual({
      columns: {
        mobile: 1,
        tablet: 2,
        desktop: 3
      },
      gap: 24
    });
  });
});
