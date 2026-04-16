import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import type { Resource } from '@uigen-dev/core';

interface ActionSelectionViewProps {
  resource: Resource;
}

export function ActionSelectionView({ resource }: ActionSelectionViewProps) {
  const navigate = useNavigate();
  
  // Get all create and action operations
  const createOps = resource.operations.filter(op => op.viewHint === 'create');
  const actionOps = resource.operations.filter(op => op.viewHint === 'action');
  const allOps = [...createOps, ...actionOps];
  
  if (allOps.length === 0) {
    return (
      <div className="p-4 text-muted-foreground">
        No create operations available for {resource.name}
      </div>
    );
  }

  // If only one operation, show it directly
  if (allOps.length === 1) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">{resource.name}</h2>
        <p className="text-muted-foreground">{allOps[0].summary}</p>
        <Button onClick={() => navigate(`/${resource.slug}/new?operation=${allOps[0].id}`)}>
          {allOps[0].summary || 'Create'}
        </Button>
      </div>
    );
  }

  // Multiple operations - show selection
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{resource.name}</h2>
        <p className="text-muted-foreground mt-1">Select an action to perform</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allOps.map((op) => (
          <div
            key={op.id}
            className="p-6 border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer"
            onClick={() => navigate(`/${resource.slug}/new?operation=${op.id}`)}
          >
            <h3 className="text-lg font-semibold mb-2">{op.summary || op.id}</h3>
            {op.description && (
              <p className="text-sm text-muted-foreground">{op.description}</p>
            )}
            <Button className="mt-4 w-full" variant="outline">
              Proceed
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
