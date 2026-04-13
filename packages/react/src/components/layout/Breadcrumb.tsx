import { Link, useLocation, useParams } from 'react-router-dom';
import type { UIGenApp } from '@uigen-dev/core';
import { cn } from '@/lib/utils';

interface BreadcrumbProps {
  config: UIGenApp;
}

/**
 * Breadcrumb navigation component
 * Implements Requirements 59.1-59.5
 */
export function Breadcrumb({ config }: BreadcrumbProps) {
  const location = useLocation();
  const params = useParams();

  // Parse the current path to build breadcrumbs
  const pathSegments = location.pathname.split('/').filter(Boolean);
  
  if (pathSegments.length === 0) {
    return null;
  }

  // Find the current resource
  const resourceSlug = pathSegments[0];
  const resource = config.resources.find(r => r.slug === resourceSlug);

  if (!resource) {
    return null;
  }

  // Build breadcrumb items
  const breadcrumbs: Array<{ label: string; path: string; isActive: boolean }> = [
    { label: 'Home', path: '/', isActive: false }
  ];

  // Add resource (list view)
  breadcrumbs.push({
    label: truncateName(resource.name),
    path: `/${resource.slug}`,
    isActive: pathSegments.length === 1
  });

  // Add detail/edit/new views
  if (pathSegments.length > 1) {
    const action = pathSegments[1];
    
    if (action === 'new') {
      breadcrumbs.push({
        label: 'New',
        path: `/${resource.slug}/new`,
        isActive: true
      });
    } else if (params.id) {
      // Detail view
      breadcrumbs.push({
        label: truncateName(`${resource.name} #${params.id}`),
        path: `/${resource.slug}/${params.id}`,
        isActive: pathSegments.length === 2
      });

      // Edit view
      if (pathSegments[2] === 'edit') {
        breadcrumbs.push({
          label: 'Edit',
          path: `/${resource.slug}/${params.id}/edit`,
          isActive: true
        });
      }
    }
  }

  return (
    // Requirement 59.1: Render breadcrumbs below the top bar
    <nav className="h-10 border-b bg-muted/30 flex items-center px-4 text-sm">
      {/* Requirement 59.2: Display navigation path */}
      <ol className="flex items-center gap-2">
        {breadcrumbs.map((crumb, index) => (
          <li key={crumb.path} className="flex items-center gap-2">
            {index > 0 && <span className="text-muted-foreground">/</span>}
            {/* Requirement 59.3: Support clicking breadcrumbs to navigate */}
            {crumb.isActive ? (
              // Requirement 59.4: Highlight current page
              <span className={cn('font-medium text-foreground')}>
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.path}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * Requirement 59.5: Truncate long names with ellipsis
 */
function truncateName(name: string, maxLength: number = 30): string {
  if (name.length <= maxLength) {
    return name;
  }
  return name.substring(0, maxLength - 3) + '...';
}
