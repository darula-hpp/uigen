import { memo, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { LayoutMetadata } from '@uigen-dev/core';
import type { LayoutStrategy } from '@/lib/layout-registry';
import { ThemeToggle } from '../../ThemeToggle';
import { Link } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { resolveDashboardPath } from '@/lib/navigation-paths';
import { AppShell } from '../AppShell';
import { cn } from '@/lib/utils';

/**
 * Centered layout strategy for authentication pages and narrow content views.
 * When the app already uses the sidebar shell globally, this strategy keeps
 * TopBar/sidebar chrome and only constrains the main content width.
 */
export class CenteredLayoutStrategy implements LayoutStrategy {
  type = 'centered' as const;
  
  render(children: ReactNode, metadata?: LayoutMetadata): ReactNode {
    return <CenteredLayoutComponent metadata={metadata}>{children}</CenteredLayoutComponent>;
  }
  
  validate(metadata?: LayoutMetadata): boolean {
    if (!metadata) return true;
    
    if (metadata.maxWidth !== undefined) {
      if (typeof metadata.maxWidth !== 'number' || metadata.maxWidth <= 0) {
        console.warn('[CenteredLayout] Invalid maxWidth: must be a positive number');
        return false;
      }
    }
    
    return true;
  }
  
  getDefaults(): LayoutMetadata {
    return {
      maxWidth: 480,
      showHeader: true,
      verticalCenter: true
    };
  }
}

interface CenteredLayoutComponentProps {
  children: ReactNode;
  metadata?: LayoutMetadata;
}

const CenteredLayoutComponent = memo(function CenteredLayoutComponent({
  children,
  metadata,
}: CenteredLayoutComponentProps) {
  const { config } = useApp();
  const dashboardPath = resolveDashboardPath(config.landingPageConfig?.enabled === true);
  const usesSidebarShell = config.layoutConfig?.type === 'sidebar';

  const maxWidth = useMemo(() => metadata?.maxWidth ?? 480, [metadata?.maxWidth]);
  const showHeader = useMemo(() => metadata?.showHeader ?? true, [metadata?.showHeader]);
  const verticalCenter = useMemo(() => metadata?.verticalCenter ?? true, [metadata?.verticalCenter]);
  const sidebarWidth = config.layoutConfig?.metadata?.sidebarWidth ?? 256;

  const containerStyles = useMemo(() => ({
    '--max-width': `${maxWidth}px`,
  } as React.CSSProperties), [maxWidth]);

  if (usesSidebarShell) {
    return (
      <AppShell sidebarWidth={sidebarWidth} mainInnerClassName="">
        <div
          className={cn(
            'centered-layout-content mx-auto w-full px-4 py-6',
            verticalCenter ? 'min-h-full flex items-center justify-center' : 'pt-2',
          )}
          style={{ maxWidth }}
        >
          {children}
        </div>
      </AppShell>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {showHeader && (
        <header role="banner" className="border-b bg-card transition-all duration-300 ease-in-out">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link
              to={dashboardPath}
              className="text-xl font-bold hover:opacity-80 transition-opacity cursor-pointer no-underline"
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              {config.appConfig?.name || config.meta.title}
            </Link>
            <ThemeToggle />
          </div>
        </header>
      )}

      <main
        role="main"
        className={cn(
          'centered-layout-main flex-1 flex justify-center p-4 transition-all duration-300 ease-in-out',
          verticalCenter ? 'items-center' : 'items-start pt-16',
        )}
        style={containerStyles}
      >
        <style>{`
          .centered-layout-main > .centered-layout-content {
            width: 100%;
            max-width: var(--max-width);
            transition: all 300ms ease-in-out;
          }
        `}</style>
        <div className="centered-layout-content">
          {children}
        </div>
      </main>
    </div>
  );
});
