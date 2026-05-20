import type { UIGenApp } from '@uigen-dev/core';
import { AppProvider } from '@/contexts/AppContext';
import { AppShell } from './AppShell';

interface LayoutProps {
  config: UIGenApp;
  children: React.ReactNode;
}

/**
 * Legacy layout shell. Prefer LayoutContainer + layout strategies for new code.
 */
export function Layout({ config, children }: LayoutProps) {
  return (
    <AppProvider config={config}>
      <AppShell>{children}</AppShell>
    </AppProvider>
  );
}
