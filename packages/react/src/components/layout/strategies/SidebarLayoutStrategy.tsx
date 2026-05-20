import { memo } from 'react';
import type { ReactNode } from 'react';
import type { LayoutMetadata } from '@uigen-dev/core';
import type { LayoutStrategy } from '@/lib/layout-registry';
import { AppShell } from '../AppShell';

/**
 * Sidebar layout strategy implementation
 * Implements Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 15.1
 */
export class SidebarLayoutStrategy implements LayoutStrategy {
  type = 'sidebar' as const;

  render(children: ReactNode, metadata?: LayoutMetadata): ReactNode {
    return <SidebarLayoutComponent metadata={metadata}>{children}</SidebarLayoutComponent>;
  }

  validate(metadata?: LayoutMetadata): boolean {
    if (!metadata) return true;

    if (metadata.sidebarWidth !== undefined) {
      if (typeof metadata.sidebarWidth !== 'number' || metadata.sidebarWidth <= 0) {
        console.warn('[SidebarLayout] Invalid sidebarWidth: must be a positive number');
        return false;
      }
    }

    return true;
  }

  getDefaults(): LayoutMetadata {
    return {
      sidebarWidth: 256,
      sidebarCollapsible: true,
      sidebarDefaultCollapsed: false
    };
  }
}

interface SidebarLayoutComponentProps {
  children: ReactNode;
  metadata?: LayoutMetadata;
}

const SidebarLayoutComponent = memo(function SidebarLayoutComponent({
  children,
  metadata,
}: SidebarLayoutComponentProps) {
  const sidebarWidth = metadata?.sidebarWidth ?? 256;

  return <AppShell sidebarWidth={sidebarWidth}>{children}</AppShell>;
});
