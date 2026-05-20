import { useMemo, memo } from 'react';
import type { ReactNode } from 'react';
import type { LayoutMetadata, ResponsiveColumns } from '@uigen-dev/core';
import type { LayoutStrategy } from '@/lib/layout-registry';
import { AppShell } from '../AppShell';
import { useApp } from '@/contexts/AppContext';

/**
 * Dashboard grid layout strategy
 * Implements Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 15.1, 15.4, 15.5
 */
export class DashboardGridLayoutStrategy implements LayoutStrategy {
  type = 'dashboard-grid' as const;

  render(children: ReactNode, metadata?: LayoutMetadata): ReactNode {
    return <DashboardGridLayoutComponent metadata={metadata}>{children}</DashboardGridLayoutComponent>;
  }

  validate(metadata?: LayoutMetadata): boolean {
    if (!metadata) return true;

    if (metadata.columns) {
      const cols = metadata.columns as ResponsiveColumns;
      for (const [key, value] of Object.entries(cols)) {
        if (typeof value !== 'number' || value < 1) {
          console.warn(`[DashboardGridLayout] Invalid columns.${key}: must be a positive integer`);
          return false;
        }
      }
    }

    if (metadata.gap !== undefined) {
      if (typeof metadata.gap !== 'number' || metadata.gap < 0) {
        console.warn('[DashboardGridLayout] Invalid gap: must be a non-negative number');
        return false;
      }
    }

    return true;
  }

  getDefaults(): LayoutMetadata {
    return {
      columns: {
        mobile: 1,
        tablet: 2,
        desktop: 3
      },
      gap: 24
    };
  }
}

interface DashboardGridLayoutComponentProps {
  children: ReactNode;
  metadata?: LayoutMetadata;
}

const DashboardGridLayoutComponent = memo(function DashboardGridLayoutComponent({
  children,
  metadata,
}: DashboardGridLayoutComponentProps) {
  const { config } = useApp();

  const columns = useMemo(
    () => (metadata?.columns as ResponsiveColumns) ?? { mobile: 1, tablet: 2, desktop: 3 },
    [metadata?.columns]
  );

  const gap = useMemo(() => metadata?.gap ?? 24, [metadata?.gap]);
  const sidebarWidth = config.layoutConfig?.metadata?.sidebarWidth ?? 256;

  const gridStyles = useMemo(() => ({
    '--grid-gap': `${gap}px`,
    '--grid-columns-mobile': columns.mobile,
    '--grid-columns-tablet': columns.tablet,
    '--grid-columns-desktop': columns.desktop,
  } as React.CSSProperties), [gap, columns.mobile, columns.tablet, columns.desktop]);

  return (
    <AppShell sidebarWidth={sidebarWidth} mainInnerClassName="">
      <div
        className="dashboard-grid-container container mx-auto p-6 transition-all duration-300 ease-in-out"
        style={gridStyles}
      >
        <style>{`
          .dashboard-grid-container {
            display: grid;
            gap: var(--grid-gap);
            grid-template-columns: repeat(var(--grid-columns-mobile), 1fr);
          }
          @media (min-width: 768px) {
            .dashboard-grid-container {
              grid-template-columns: repeat(var(--grid-columns-tablet), 1fr);
            }
          }
          @media (min-width: 1024px) {
            .dashboard-grid-container {
              grid-template-columns: repeat(var(--grid-columns-desktop), 1fr);
            }
          }
        `}</style>
        {children}
      </div>
    </AppShell>
  );
});
