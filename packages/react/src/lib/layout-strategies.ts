import { LayoutRegistry } from './layout-registry';
import { SidebarLayoutStrategy } from '@/components/layout/strategies/SidebarLayoutStrategy';
import { CenteredLayoutStrategy } from '@/components/layout/strategies/CenteredLayoutStrategy';
import { DashboardGridLayoutStrategy } from '@/components/layout/strategies/DashboardGridLayoutStrategy';

/**
 * Register all built-in layout strategies
 * Called on application initialization
 * Implements Requirements 2.1, 2.2, 2.5
 * 
 * This function is idempotent - safe to call multiple times
 */
export function registerLayoutStrategies(): void {
  const registry = LayoutRegistry.getInstance();
  
  // Register built-in strategies
  registry.register(new SidebarLayoutStrategy());
  registry.register(new CenteredLayoutStrategy());
  registry.register(new DashboardGridLayoutStrategy());
  
  // Set sidebar as default
  registry.setDefault('sidebar');
}
