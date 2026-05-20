import { Link, useLocation } from 'react-router-dom';
import type { UIGenApp, Resource } from '@uigen-dev/core';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { filterAuthResources } from '@/lib/auth-resources';
import { findProfileResource, filterProfileResources } from '@/lib/profile-resources';
import { User } from 'lucide-react';

interface SidebarProps {
  config: UIGenApp;
  onClose?: () => void;
}

/**
 * Determine if a resource is a sub-resource (its list op has unresolved path params).
 * Returns the parent slug if it's a sub-resource, null otherwise.
 */
function getParentSlug(resource: Resource, allResources: Resource[]): string | null {
  const listOp = resource.operations.find(op => op.viewHint === 'list' || op.viewHint === 'search');
  if (!listOp || !listOp.path.includes('{')) return null;

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
export function Sidebar({ config, onClose }: SidebarProps) {
  const location = useLocation();

  const authFilteredResources = filterAuthResources(config.resources, config);
  const visibleResources = filterProfileResources(authFilteredResources);

  const detailMatch = location.pathname.match(/^\/([^/]+)\/([^/]+)$/);
  const currentParentSlug = detailMatch?.[1];
  const currentParentId = detailMatch?.[2];

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

  const topLevelResources = visibleResources.filter(r => !subResourceSlugs.has(r.slug));

  return (
    <aside
      role="navigation"
      aria-label="Main navigation"
      className="flex h-full w-full flex-col border-r bg-card"
    >
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center">
          {config.appConfig?.icon && (
            <img
              src={config.appConfig.icon}
              alt={config.appConfig?.name || config.meta.title}
              className="h-10 w-10 object-contain"
            />
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden"
          onClick={onClose}
          aria-label="Close navigation menu"
        >
          ✕
        </Button>
      </div>

      <nav className="flex-1 space-y-1 overflow-auto p-4" aria-label="Resources">
        {topLevelResources.map(resource => {
          const isActive = location.pathname.startsWith(`/${resource.slug}`);
          const children = childrenByParent.get(resource.slug) || [];
          const showChildren = currentParentSlug === resource.slug && !!currentParentId;

          return (
            <div key={resource.slug}>
              <Link
                to={`/${resource.slug}`}
                onClick={onClose}
                className={cn(
                  'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                {resource.label || resource.name}
              </Link>

              {showChildren && children.length > 0 && (
                <div className="ml-4 mt-1 space-y-1 border-l pl-3">
                  {children.map(child => {
                    const isChildActive = location.pathname.startsWith(`/${child.slug}`);

                    return (
                      <Link
                        key={child.slug}
                        to={`/${child.slug}?parentId=${currentParentId}`}
                        onClick={onClose}
                        className={cn(
                          'block rounded-md px-3 py-1.5 text-sm transition-colors',
                          isChildActive
                            ? 'bg-primary/20 font-medium text-primary'
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

      {findProfileResource(config) && (
        <div className="border-t p-4">
          <Link
            to="/profile"
            onClick={onClose}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              location.pathname === '/profile'
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <User className="h-4 w-4" />
            Profile
          </Link>
        </div>
      )}
    </aside>
  );
}
