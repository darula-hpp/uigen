import { useNavigate } from 'react-router-dom';
import { useApiCall } from '@/hooks/useApiCall';
import { Button } from '@/components/ui/button';
import { getAuthCredentials } from '@/lib/auth';
import { getSelectedServer } from '@/lib/server';
import type { UIGenApp, Resource } from '@uigen-dev/core';
import { Database, ArrowRight, CheckCircle2, XCircle, Server } from 'lucide-react';

interface DashboardViewProps {
  config: UIGenApp;
}

/**
 * Dashboard landing page component
 * Implements Requirements 13.1-13.6
 */
export function DashboardView({ config }: DashboardViewProps) {
  const navigate = useNavigate();
  
  // Requirement 13.5: Display authentication status
  const authCredentials = getAuthCredentials();
  const isAuthenticated = !!authCredentials;
  
  // Requirement 13.6: Display current server environment
  const selectedServer = getSelectedServer();
  const currentServer = config.servers.find(s => s.url === selectedServer) || config.servers[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{config.meta.title}</h1>
        {config.meta.description && (
          <p className="text-muted-foreground mt-2">{config.meta.description}</p>
        )}
        <p className="text-sm text-muted-foreground mt-1">Version {config.meta.version}</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Requirement 13.5: Display authentication status */}
        <div className="p-4 border rounded-lg bg-card">
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-amber-600" />
            )}
            <div>
              <h3 className="font-semibold text-sm">Authentication</h3>
              <p className="text-sm text-muted-foreground">
                {isAuthenticated ? (
                  <span className="text-green-600">Authenticated</span>
                ) : (
                  <span className="text-amber-600">Not authenticated</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Requirement 13.6: Display current server environment */}
        {currentServer && (
          <div className="p-4 border rounded-lg bg-card">
            <div className="flex items-center gap-3">
              <Server className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-semibold text-sm">Server Environment</h3>
                <p className="text-sm text-muted-foreground">
                  {currentServer.description || currentServer.url}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Resource Cards */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Resources</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Requirement 13.1, 13.2: Display card for each resource with name and description */}
          {config.resources.map((resource) => (
            <ResourceCard key={resource.slug} resource={resource} navigate={navigate} />
          ))}
        </div>
      </div>
    </div>
  );
}

interface ResourceCardProps {
  resource: Resource;
  navigate: (path: string) => void;
}

function ResourceCard({ resource, navigate }: ResourceCardProps) {
  // Find list operation for this resource
  const listOp = resource.operations.find(op => op.viewHint === 'list' || op.viewHint === 'search');
  
  // Check if this is a sub-resource (has path parameters)
  const isSubResource = listOp?.path.includes('{') ?? false;
  
  // Requirement 13.2: Show record count when list operation exists
  // Skip fetching for sub-resources (they require parent context)
  const { data, isLoading } = useApiCall({
    operation: listOp,
    queryParams: listOp ? { limit: '1' } : {},
    enabled: !!listOp && !isSubResource,
  });

  // Extract count from response
  const recordCount = data ? (
    data.total ?? 
    data.count ?? 
    (Array.isArray(data) ? data.length : (data.items?.length ?? data.data?.length ?? 0))
  ) : 0;

  // Check if resource has any operations
  const hasListView = resource.operations.some(op => op.viewHint === 'list' || op.viewHint === 'search');

  return (
    <div
      className="p-6 border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer group"
      onClick={() => navigate(`/${resource.slug}`)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Database className="h-5 w-5" />
          </div>
          <div>
            {/* Requirement 13.1: Display resource name */}
            <h3 className="text-lg font-semibold">{resource.name}</h3>
            {/* Requirement 13.2: Show record count when list operation exists */}
            {listOp && (
              <p className="text-sm text-muted-foreground">
                {isSubResource ? (
                  <span className="text-xs">Sub-resource</span>
                ) : isLoading ? (
                  <span className="inline-block w-12 h-4 bg-muted animate-pulse rounded" />
                ) : (
                  <span>{recordCount} record{recordCount !== 1 ? 's' : ''}</span>
                )}
              </p>
            )}
          </div>
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>

      {/* Requirement 13.1: Display resource description */}
      {resource.schema.description && (
        <p className="text-sm text-muted-foreground mb-4">
          {resource.schema.description}
        </p>
      )}

      {/* Requirement 13.3: Provide navigation links to list views */}
      <div className="flex gap-2 flex-wrap">
        {hasListView && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/${resource.slug}`);
            }}
          >
            View List
          </Button>
        )}
        {resource.operations.some(op => op.viewHint === 'create') && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/${resource.slug}/new`);
            }}
          >
            Create New
          </Button>
        )}
        {resource.operations.some(op => op.viewHint === 'search') && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/${resource.slug}/search`);
            }}
          >
            Search
          </Button>
        )}
      </div>
    </div>
  );
}
