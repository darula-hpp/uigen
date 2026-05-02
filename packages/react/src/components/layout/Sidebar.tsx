import { Link, useLocation, useParams, useMatch } from 'react-router-dom';
import type { UIGenApp, Resource } from '@uigen-dev/core';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { useState } from 'react';
import { filterAuthResources } from '@/lib/auth-resources';

interface SidebarProps {
  config: UIGenApp;
  isOpen: boolean;
  onClose?: () => void;
}

/**
 * Determine if a resource is a sub-resource (its list op has unresolved path params).
 * Returns the parent slug if it's a sub-resource, null otherwise.
 */
function getParentSlug(resource: Resource, allResources: Resource[]): string | null {
  const listOp = resource.operations.find(op => op.viewHint === 'list' || op.viewHint === 'search');
  if (!listOp || !listOp.path.includes('{')) return null;

  // Extract the path segment before the first {param} — that's the parent resource
  // e.g. /v1/Services/{ServiceSid}/AlphaSenders → parent is "Services"
  const segments = listOp.path.split('/').filter(Boolean);
  const firstParamIndex = segments.findIndex(s => s.startsWith('{'));
  if (firstParamIndex <= 0) return null;

  const parentSegment = segments[firstParamIndex - 1];
  const parent = allResources.find(r => r.slug === parentSegment);
  return parent?.slug || null;
}

/**
 * Sidebar navigation component
 * Implements Requirements 60.1-60.6
 */
export function Sidebar({ config, isOpen, onClose }: SidebarProps) {
  const location = useLocation();

  // Filter out auth resources (login, signup, password reset)
  const visibleResources = filterAuthResources(config.resources, config);

  // Detect if we're on a parent detail page — extract the current resource slug and ID
  // e.g. /Services/MG123 → parentSlug=Services, parentId=MG123
  const detailMatch = location.pathname.match(/^\/([^/]+)\/([^/]+)$/);
  const currentParentSlug = detailMatch?.[1];
  const currentParentId = detailMatch?.[2];

  // Build parent→children map
  const childrenByParent = new Map<string, Resource[]>();
  const subResourceSlugs = new Set<string>();

  for (const resource of visibleResources) {
    const parentSlug = getParentSlug(resource, visibleResources);
    if (parentSlug) {
      subResourceSlugs.add(resource.slug);
      if (!childrenByParent.has(parentSlug)) childrenByParent.set(parentSlug, []);
      childrenByParent.get(parentSlug)!.push(resource);
    }
  }

  // Top-level resources (not sub-resources)
  const topLevelResources = visibleResources.filter(r => !subResourceSlugs.has(r.slug));

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          'fixed md:static inset-y-0 left-0 z-50 w-64 bg-card border-r flex flex-col transition-transform duration-300',
          'md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{config.meta.title}</h1>
          </div>
          <Button variant="ghost" size="sm" className="md:hidden" onClick={onClose}>✕</Button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1 flex-1 overflow-auto">
          {topLevelResources.map(resource => {
            const isActive = location.pathname.startsWith(`/${resource.slug}`);
            const children = childrenByParent.get(resource.slug) || [];
            // Show children only when viewing a detail page of this parent
            const showChildren = currentParentSlug === resource.slug && !!currentParentId;

            return (
              <div key={resource.slug}>
                <Link
                  to={`/${resource.slug}`}
                  onClick={onClose}
                  className={cn(
                    'block px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  {resource.label || resource.name}
                </Link>

                {/* Child resources — only shown when on a parent detail page */}
                {showChildren && children.length > 0 && (
                  <div className="ml-4 mt-1 space-y-1 border-l pl-3">
                    {children.map(child => {
                      // Build the child URL with the parent ID injected into the API path
                      // We route to /{childSlug}?parentId={id} so ListView can use it
                      const isChildActive = location.pathname.startsWith(`/${child.slug}`);

                      return (
                        <Link
                          key={child.slug}
                          to={`/${child.slug}?parentId=${currentParentId}`}
                          onClick={onClose}
                          className={cn(
                            'block px-3 py-1.5 rounded-md text-sm transition-colors',
                            isChildActive
                              ? 'bg-primary/20 text-primary font-medium'
                              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                          )}
                        >
                          {child.label || child.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
