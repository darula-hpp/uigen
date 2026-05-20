import { useState, useEffect, useRef, memo, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { Breadcrumb } from './Breadcrumb';
import { useApp } from '@/contexts/AppContext';

interface AppShellProps {
  children: ReactNode;
  sidebarWidth?: number;
  mainClassName?: string;
  mainInnerClassName?: string;
}

/**
 * Shared application shell with a width-constrained sidebar column and main content area.
 * Mobile drawer behavior is handled on the sidebar panel wrapper, not the Sidebar itself,
 * so desktop layouts never use fixed viewport-wide positioning.
 */
export const AppShell = memo(function AppShell({
  children,
  sidebarWidth = 256,
  mainClassName,
  mainInnerClassName = 'container mx-auto p-6',
}: AppShellProps) {
  const { config } = useApp();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const mainContentRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!mobileSidebarOpen && mainContentRef.current) {
      mainContentRef.current.focus();
    }
  }, [mobileSidebarOpen]);

  const layoutStyles = {
    '--app-shell-sidebar-width': `${sidebarWidth}px`,
  } as React.CSSProperties;

  const closeMobileSidebar = () => setMobileSidebarOpen(false);
  const toggleMobileSidebar = () => setMobileSidebarOpen((open) => !open);

  return (
    <div className="flex h-screen overflow-hidden" style={layoutStyles}>
      <style>{`
        .app-shell-sidebar-panel {
          width: var(--app-shell-sidebar-width);
          flex-shrink: 0;
          height: 100%;
        }

        @media (max-width: 767px) {
          .app-shell-sidebar-panel {
            position: fixed;
            top: 0;
            bottom: 0;
            left: 0;
            width: 256px;
            z-index: 50;
            transition: transform 0.3s ease-in-out;
          }

          .app-shell-sidebar-panel.is-mobile-closed {
            transform: translateX(-100%);
          }
        }

        @media (min-width: 768px) {
          .app-shell-sidebar-panel {
            position: relative;
            transform: translateX(0) !important;
          }
        }
      `}</style>

      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {mobileSidebarOpen ? 'Navigation menu opened' : ''}
      </div>

      <div
        className={cn(
          'app-shell-sidebar-panel',
          !mobileSidebarOpen && 'is-mobile-closed'
        )}
      >
        <Sidebar config={config} onClose={closeMobileSidebar} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar config={config} onMenuClick={toggleMobileSidebar} />
        <Breadcrumb config={config} />

        <main
          ref={mainContentRef}
          role="main"
          tabIndex={-1}
          className={cn('min-w-0 flex-1 overflow-auto focus:outline-none', mainClassName)}
        >
          {mainInnerClassName ? (
            <div className={mainInnerClassName}>{children}</div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
});
