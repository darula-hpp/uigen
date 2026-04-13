import type { UIGenApp } from '@uigen/core';
import { Button } from '../ui/button';
import { ServerSelector } from '../ServerSelector';
import { ThemeToggle } from '../ThemeToggle';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useApiCall } from '@/hooks/useApiCall';
import { clearAuthCredentials } from '@/lib/auth';

interface TopBarProps {
  config: UIGenApp;
  onMenuClick: () => void;
}

/**
 * Top bar component with app title, server selector, auth status, and theme toggle
 * Implements Requirements 30.1-30.6, 54.1-54.6
 */
export function TopBar({ config, onMenuClick }: TopBarProps) {
  const navigate = useNavigate();
  const [showServerSelector, setShowServerSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Requirement 54.6: Debounce input to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Requirement 54.2: Search all resources with search operations
  const searchableResources = useMemo(() => {
    return config.resources.filter(resource => 
      resource.operations.some(op => op.viewHint === 'search' || op.viewHint === 'list')
    );
  }, [config.resources]);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowResults(value.length > 0);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setDebouncedQuery('');
    setShowResults(false);
  };

  // Requirement 54.5: Navigate to detail view when clicking a result
  const handleResultClick = (resourceSlug: string, itemId: string) => {
    navigate(`/${resourceSlug}/${itemId}`);
    handleClearSearch();
  };

  return (
    <header className="h-16 border-b bg-card flex items-center px-4 gap-4">
      {/* Requirement 30.1: Display app title */}
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="sm"
        className="md:hidden"
        onClick={onMenuClick}
      >
        ☰
      </Button>

      {/* App title and version - Requirement 30.1, 30.2 */}
      <div className="flex-shrink-0">
        <h1 className="text-lg font-bold">{config.meta.title}</h1>
        <p className="text-xs text-muted-foreground">{config.meta.version}</p>
      </div>

      {/* Requirement 54.1: Global search input in top bar */}
      {searchableResources.length > 0 && (
        <div className="flex-1 max-w-md relative" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search across all resources..."
              className="w-full h-9 pl-10 pr-10 border rounded-md bg-background text-sm"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Requirement 54.3: Display results grouped by resource */}
          {showResults && debouncedQuery && (
            <GlobalSearchResults
              resources={searchableResources}
              query={debouncedQuery}
              onResultClick={handleResultClick}
            />
          )}
        </div>
      )}

      {/* Right side controls — pushed to far right */}
      <div className="ml-auto flex items-center gap-2">
        {/* Requirement 30.3: Render server selector */}
        {config.servers.length > 1 && (
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowServerSelector(!showServerSelector)}
            >
              Server
            </Button>
            {showServerSelector && (
              <div className="absolute right-0 top-full mt-2 bg-card border rounded-md shadow-lg p-4 min-w-[250px] z-50">
                <ServerSelector servers={config.servers} />
              </div>
            )}
          </div>
        )}

        {/* Auth: show logout button when auth is configured */}
        {config.auth.schemes.length > 0 || (config.auth.loginEndpoints?.length ?? 0) > 0 ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              clearAuthCredentials();
              sessionStorage.removeItem('uigen_auth');
              navigate('/login');
            }}
          >
            Logout
          </Button>
        ) : null}

        {/* Requirement 30.5: Render theme toggle */}
        <ThemeToggle />
      </div>
    </header>
  );
}

/**
 * Global search results component
 * Implements Requirements 54.2-54.5
 */
interface GlobalSearchResultsProps {
  resources: Array<{ name: string; slug: string; operations: any[]; schema: any }>;
  query: string;
  onResultClick: (resourceSlug: string, itemId: string) => void;
}

function GlobalSearchResults({ resources, query, onResultClick }: GlobalSearchResultsProps) {
  return (
    <div className="absolute top-full mt-2 w-full bg-card border rounded-md shadow-lg max-h-[400px] overflow-y-auto z-50">
      {resources.map(resource => (
        <ResourceSearchResults
          key={resource.slug}
          resource={resource}
          query={query}
          onResultClick={onResultClick}
        />
      ))}
    </div>
  );
}

/**
 * Search results for a single resource
 * Implements Requirements 54.2-54.5
 */
interface ResourceSearchResultsProps {
  resource: { name: string; slug: string; operations: any[]; schema: any };
  query: string;
  onResultClick: (resourceSlug: string, itemId: string) => void;
}

function ResourceSearchResults({ resource, query, onResultClick }: ResourceSearchResultsProps) {
  // Find search or list operation
  const searchOp = resource.operations.find(op => op.viewHint === 'search' || op.viewHint === 'list');
  
  if (!searchOp) return null;

  // Build query params for search
  const queryParams: Record<string, string> = {};
  
  // Try to find a text search parameter
  const searchParam = searchOp.parameters?.find((p: any) => 
    p.in === 'query' && 
    (p.name.toLowerCase().includes('search') || 
     p.name.toLowerCase().includes('query') || 
     p.name.toLowerCase().includes('q') ||
     p.name.toLowerCase().includes('name') ||
     p.name.toLowerCase().includes('title'))
  );
  
  if (searchParam) {
    queryParams[searchParam.name] = query;
  }

  // Use the API call hook
  const { data, isLoading } = useApiCall({
    operation: searchOp,
    queryParams,
    enabled: query.length > 0
  });

  // Extract items from response
  const items = useMemo(() => {
    if (!data) return [];
    const itemsArray = Array.isArray(data) ? data : data?.items || data?.data || [];
    // Limit to first 5 results per resource
    return itemsArray.slice(0, 5);
  }, [data]);

  // Don't render if no results
  if (!isLoading && items.length === 0) return null;

  // Get display field (first string field or 'name' or 'title')
  const displayField = useMemo(() => {
    const fields = resource.schema.children || [];
    const nameField = fields.find((f: any) => f.key === 'name' || f.key === 'title');
    if (nameField) return nameField.key;
    const firstStringField = fields.find((f: any) => f.type === 'string');
    return firstStringField?.key || 'id';
  }, [resource.schema]);

  return (
    <div className="border-b last:border-b-0">
      <div className="px-4 py-2 bg-muted/50 font-semibold text-sm">
        {/* Requirement 54.3, 54.4: Display resource name and match count */}
        {resource.name} {!isLoading && `(${items.length})`}
      </div>
      {isLoading ? (
        <div className="px-4 py-3 text-sm text-muted-foreground">Loading...</div>
      ) : (
        <div>
          {items.map((item: any, idx: number) => (
            <button
              key={item.id || idx}
              onClick={() => onResultClick(resource.slug, item.id)}
              className="w-full px-4 py-2 text-left hover:bg-muted/50 text-sm flex justify-between items-center"
            >
              <span className="truncate">{item[displayField] || item.id || 'Unnamed'}</span>
              {item.id && <span className="text-xs text-muted-foreground ml-2">#{item.id}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

