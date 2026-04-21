import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ResizeObserver is not available in jsdom -- provide a no-op stub
beforeAll(() => {
  if (typeof window.ResizeObserver === 'undefined') {
    window.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  // elementFromPoint is not implemented in jsdom
  if (!document.elementFromPoint) {
    document.elementFromPoint = () => null;
  }
});
import { GraphCanvas } from '../GraphCanvas.js';
import { ResourceNodeCard } from '../ResourceNode.js';
import { RelationshipForm } from '../RelationshipForm.js';
import { RelationshipList } from '../RelationshipList.js';
import { EdgeDetail } from '../EdgeDetail.js';
import { RelationshipEditor } from '../RelationshipEditor.js';
import type { ResourceNode } from '../../../types/index.js';
import type { RelationshipConfig } from '@uigen-dev/core';

// --- Fixtures ---

function makeResource(slug: string, name?: string): ResourceNode {
  return {
    name: name ?? slug,
    slug,
    uigenId: `uigen-${slug}`,
    operations: [],
    fields: [],
    annotations: {}
  };
}

const usersResource = makeResource('users', 'Users');
const ordersResource = makeResource('orders', 'Orders');
const tagsResource = makeResource('tags', 'Tags');

const sampleRelationship: RelationshipConfig = {
  source: 'users',
  target: 'orders',
  path: '/users/{id}/orders',
  label: 'User Orders'
};

// --- GraphCanvas tests ---

describe('GraphCanvas', () => {
  it('renders one ResourceNode per resource', () => {
    render(
      <GraphCanvas
        resources={[usersResource, ordersResource, tagsResource]}
        relationships={[]}
        onEdgeInitiated={vi.fn()}
        onEdgeSelect={vi.fn()}
      />
    );

    expect(screen.getByTestId('resource-node-users')).toBeInTheDocument();
    expect(screen.getByTestId('resource-node-orders')).toBeInTheDocument();
    expect(screen.getByTestId('resource-node-tags')).toBeInTheDocument();
  });

  it('renders empty-state when no resources', () => {
    render(
      <GraphCanvas
        resources={[]}
        relationships={[]}
        onEdgeInitiated={vi.fn()}
        onEdgeSelect={vi.fn()}
      />
    );

    expect(screen.getByTestId('graph-canvas-empty')).toBeInTheDocument();
    expect(screen.getByText(/No resources found/i)).toBeInTheDocument();
  });

  it('does not render empty-state when resources are present', () => {
    render(
      <GraphCanvas
        resources={[usersResource]}
        relationships={[]}
        onEdgeInitiated={vi.fn()}
        onEdgeSelect={vi.fn()}
      />
    );

    expect(screen.queryByTestId('graph-canvas-empty')).not.toBeInTheDocument();
  });
});

// --- ResourceNodeCard tests ---

describe('ResourceNodeCard', () => {
  it('renders the resource name and slug', () => {
    render(
      <ResourceNodeCard
        resource={usersResource}
        relationshipCount={0}
        isHighlighted={false}
        onPortMouseDown={vi.fn()}
        onCardMouseDown={vi.fn()}
      />
    );
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('users')).toBeInTheDocument();
  });

  it('shows relationship count badge when count > 0', () => {
    render(
      <ResourceNodeCard
        resource={usersResource}
        relationshipCount={3}
        isHighlighted={false}
        onPortMouseDown={vi.fn()}
        onCardMouseDown={vi.fn()}
      />
    );
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('applies highlight class when isHighlighted is true', () => {
    render(
      <ResourceNodeCard
        resource={usersResource}
        relationshipCount={0}
        isHighlighted={true}
        onPortMouseDown={vi.fn()}
        onCardMouseDown={vi.fn()}
      />
    );
    const node = screen.getByTestId('resource-node-users');
    expect(node.className).toContain('border-indigo-400');
  });

  it('calls onPortMouseDown when the port dot is mousedown-ed', () => {
    const onPortMouseDown = vi.fn();
    render(
      <ResourceNodeCard
        resource={usersResource}
        relationshipCount={0}
        isHighlighted={false}
        onPortMouseDown={onPortMouseDown}
        onCardMouseDown={vi.fn()}
      />
    );
    fireEvent.mouseDown(screen.getByTestId('port-users'));
    expect(onPortMouseDown).toHaveBeenCalledWith('users', expect.any(Object));
  });

  it('calls onCardMouseDown when the card body is mousedown-ed', () => {
    const onCardMouseDown = vi.fn();
    render(
      <ResourceNodeCard
        resource={usersResource}
        relationshipCount={0}
        isHighlighted={false}
        onPortMouseDown={vi.fn()}
        onCardMouseDown={onCardMouseDown}
      />
    );
    fireEvent.mouseDown(screen.getByTestId('resource-node-users'));
    expect(onCardMouseDown).toHaveBeenCalledWith('users', expect.any(Object));
  });

  it('renders a connector port', () => {
    render(
      <ResourceNodeCard
        resource={usersResource}
        relationshipCount={0}
        isHighlighted={false}
        onPortMouseDown={vi.fn()}
        onCardMouseDown={vi.fn()}
      />
    );
    expect(screen.getByTestId('port-users')).toBeInTheDocument();
  });
});

// --- GraphCanvas connector interaction ---

describe('GraphCanvas connector interaction', () => {
  it('does not fire onEdgeInitiated when source === target', () => {
    const onEdgeInitiated = vi.fn();
    render(
      <GraphCanvas
        resources={[usersResource, ordersResource]}
        relationships={[]}
        onEdgeInitiated={onEdgeInitiated}
        onEdgeSelect={vi.fn()}
      />
    );
    // Mousedown on users port, mouseup on users card — self-connection rejected
    fireEvent.mouseDown(screen.getByTestId('port-users'));
    fireEvent.mouseUp(screen.getByTestId('resource-node-users'));
    expect(onEdgeInitiated).not.toHaveBeenCalled();
  });

  it('renders one ResourceNode per resource', () => {
    render(
      <GraphCanvas
        resources={[usersResource, ordersResource, tagsResource]}
        relationships={[]}
        onEdgeInitiated={vi.fn()}
        onEdgeSelect={vi.fn()}
      />
    );
    expect(screen.getByTestId('resource-node-users')).toBeInTheDocument();
    expect(screen.getByTestId('resource-node-orders')).toBeInTheDocument();
    expect(screen.getByTestId('resource-node-tags')).toBeInTheDocument();
  });

  it('renders empty-state when no resources', () => {
    render(
      <GraphCanvas
        resources={[]}
        relationships={[]}
        onEdgeInitiated={vi.fn()}
        onEdgeSelect={vi.fn()}
      />
    );
    expect(screen.getByTestId('graph-canvas-empty')).toBeInTheDocument();
  });
});

// --- RelationshipForm tests ---

describe('RelationshipForm', () => {
  // All tests below pass no specOperationPaths, so the form shows the
  // manual text input immediately (no candidates to pick from).

  it('shows validation error when path is empty', () => {
    render(
      <RelationshipForm
        sourceSlug="users"
        targetSlug="orders"
        existingRelationships={[]}
        specOperationPaths={[]}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('rel-form-confirm'));

    expect(screen.getByTestId('rel-path-error')).toBeInTheDocument();
    expect(screen.getByText('Select or enter a path')).toBeInTheDocument();
  });

  it('shows validation error when path does not start with /', () => {
    render(
      <RelationshipForm
        sourceSlug="users"
        targetSlug="orders"
        existingRelationships={[]}
        specOperationPaths={[]}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    fireEvent.change(screen.getByTestId('rel-path-input'), {
      target: { value: 'users/orders' }
    });
    fireEvent.click(screen.getByTestId('rel-form-confirm'));

    expect(screen.getByText('Path must start with /')).toBeInTheDocument();
  });

  it('rejects duplicate (source, target, path) triplet', () => {
    const existing: RelationshipConfig[] = [
      { source: 'users', target: 'orders', path: '/users/{id}/orders' }
    ];

    render(
      <RelationshipForm
        sourceSlug="users"
        targetSlug="orders"
        existingRelationships={existing}
        specOperationPaths={[]}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    fireEvent.change(screen.getByTestId('rel-path-input'), {
      target: { value: '/users/{id}/orders' }
    });
    fireEvent.click(screen.getByTestId('rel-form-confirm'));

    expect(screen.getByTestId('rel-path-error')).toBeInTheDocument();
    expect(screen.getByText(/already exists/i)).toBeInTheDocument();
  });

  it('calls onConfirm with correct RelationshipConfig on valid submit', () => {
    const onConfirm = vi.fn();

    render(
      <RelationshipForm
        sourceSlug="users"
        targetSlug="orders"
        existingRelationships={[]}
        specOperationPaths={[]}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    fireEvent.change(screen.getByTestId('rel-path-input'), {
      target: { value: '/users/{id}/orders' }
    });
    fireEvent.change(screen.getByTestId('rel-label-input'), {
      target: { value: 'User Orders' }
    });
    fireEvent.click(screen.getByTestId('rel-form-confirm'));

    expect(onConfirm).toHaveBeenCalledWith({
      source: 'users',
      target: 'orders',
      path: '/users/{id}/orders',
      type: 'hasMany', // Auto-derived from path
      label: 'User Orders'
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn();

    render(
      <RelationshipForm
        sourceSlug="users"
        targetSlug="orders"
        existingRelationships={[]}
        specOperationPaths={[]}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByTestId('rel-form-cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows candidate paths from the spec as selectable buttons', () => {
    render(
      <RelationshipForm
        sourceSlug="users"
        targetSlug="orders"
        existingRelationships={[]}
        specOperationPaths={['/users/{id}/orders', '/users/{id}/orders/{orderId}']}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByTestId('path-candidate-/users/{id}/orders')).toBeInTheDocument();
    expect(screen.getByTestId('path-candidate-/users/{id}/orders/{orderId}')).toBeInTheDocument();
    // Manual input is hidden when candidates exist
    expect(screen.queryByTestId('rel-path-input')).not.toBeInTheDocument();
  });

  it('confirms with the selected candidate path', () => {
    const onConfirm = vi.fn();

    render(
      <RelationshipForm
        sourceSlug="users"
        targetSlug="orders"
        existingRelationships={[]}
        specOperationPaths={['/users/{id}/orders']}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    // First candidate is pre-selected; just confirm
    fireEvent.click(screen.getByTestId('rel-form-confirm'));

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ 
        path: '/users/{id}/orders',
        type: 'hasMany' // Auto-derived from path
      })
    );
  });

  it('includes TypeSelector component in the form', () => {
    render(
      <RelationshipForm
        sourceSlug="users"
        targetSlug="orders"
        existingRelationships={[]}
        specOperationPaths={[]}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByTestId('type-selector')).toBeInTheDocument();
    expect(screen.getByTestId('type-selector-dropdown')).toBeInTheDocument();
  });

  it('auto-recommends type based on path input', () => {
    render(
      <RelationshipForm
        sourceSlug="users"
        targetSlug="orders"
        existingRelationships={[]}
        specOperationPaths={[]}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    // Enter a hasMany path pattern
    fireEvent.change(screen.getByTestId('rel-path-input'), {
      target: { value: '/users/{id}/orders' }
    });

    // Type selector should auto-select hasMany
    const dropdown = screen.getByTestId('type-selector-dropdown') as HTMLSelectElement;
    expect(dropdown.value).toBe('hasMany');
  });

  it('allows user to override recommended type', () => {
    const onConfirm = vi.fn();

    render(
      <RelationshipForm
        sourceSlug="users"
        targetSlug="orders"
        existingRelationships={[]}
        specOperationPaths={[]}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    // Enter a hasMany path pattern
    fireEvent.change(screen.getByTestId('rel-path-input'), {
      target: { value: '/users/{id}/orders' }
    });

    // Override to belongsTo
    fireEvent.change(screen.getByTestId('type-selector-dropdown'), {
      target: { value: 'belongsTo' }
    });

    fireEvent.click(screen.getByTestId('rel-form-confirm'));

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ 
        type: 'belongsTo' // User override
      })
    );
  });

  it('shows warning when type does not match path pattern', () => {
    render(
      <RelationshipForm
        sourceSlug="users"
        targetSlug="orders"
        existingRelationships={[]}
        specOperationPaths={[]}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    // Enter a hasMany path pattern
    fireEvent.change(screen.getByTestId('rel-path-input'), {
      target: { value: '/users/{id}/orders' }
    });

    // Override to belongsTo
    fireEvent.change(screen.getByTestId('type-selector-dropdown'), {
      target: { value: 'belongsTo' }
    });

    // Warning should appear
    expect(screen.getByTestId('type-warning')).toBeInTheDocument();
    expect(screen.getByText(/doesn't match path pattern/i)).toBeInTheDocument();
  });
});

// --- RelationshipList tests ---

describe('RelationshipList', () => {
  it('renders one row per declared relationship', () => {
    const rels: RelationshipConfig[] = [
      { source: 'users', target: 'orders', path: '/users/{id}/orders' },
      { source: 'projects', target: 'tags', path: '/projects/{id}/tags' }
    ];

    render(
      <RelationshipList
        relationships={rels}
        onEdgeSelect={vi.fn()}
        onDelete={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    const rows = screen.getAllByTestId('relationship-row');
    expect(rows).toHaveLength(2);
  });

  it('renders empty state when no relationships', () => {
    render(
      <RelationshipList
        relationships={[]}
        onEdgeSelect={vi.fn()}
        onDelete={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    expect(screen.queryAllByTestId('relationship-row')).toHaveLength(0);
    expect(screen.getByText(/No relationships declared/i)).toBeInTheDocument();
  });

  it('fires onEdgeSelect when a row is clicked', () => {
    const onEdgeSelect = vi.fn();

    render(
      <RelationshipList
        relationships={[sampleRelationship]}
        onEdgeSelect={onEdgeSelect}
        onDelete={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('relationship-row-select-users-orders'));
    expect(onEdgeSelect).toHaveBeenCalledWith(sampleRelationship);
  });

  it('shows Clear All button when relationships exist', () => {
    render(
      <RelationshipList
        relationships={[sampleRelationship]}
        onEdgeSelect={vi.fn()}
        onDelete={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    expect(screen.getByTestId('clear-all-button')).toBeInTheDocument();
  });

  it('shows confirmation dialog when Clear All is clicked', () => {
    render(
      <RelationshipList
        relationships={[sampleRelationship]}
        onEdgeSelect={vi.fn()}
        onDelete={vi.fn()}
        onClearAll={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('clear-all-button'));
    expect(screen.getByTestId('clear-all-confirm')).toBeInTheDocument();
  });

  it('calls onClearAll after confirmation', () => {
    const onClearAll = vi.fn();

    render(
      <RelationshipList
        relationships={[sampleRelationship]}
        onEdgeSelect={vi.fn()}
        onDelete={vi.fn()}
        onClearAll={onClearAll}
      />
    );

    fireEvent.click(screen.getByTestId('clear-all-button'));
    fireEvent.click(screen.getByTestId('clear-all-confirm-button'));

    expect(onClearAll).toHaveBeenCalled();
  });
});

// --- EdgeDetail tests ---

describe('EdgeDetail', () => {
  it('calls onUpdate with modified path on confirm', () => {
    const onUpdate = vi.fn();

    render(
      <EdgeDetail
        relationship={sampleRelationship}
        existingRelationships={[sampleRelationship]}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const pathInput = screen.getByTestId('edge-path-input') as HTMLInputElement;
    fireEvent.change(pathInput, { target: { value: '/users/{id}/orders/new' } });
    fireEvent.click(screen.getByTestId('edge-detail-confirm'));

    expect(onUpdate).toHaveBeenCalledWith({
      source: 'users',
      target: 'orders',
      path: '/users/{id}/orders/new',
      type: 'hasMany', // Type is auto-derived from path
      label: 'User Orders'
    });
  });

  it('shows validation error when path is cleared', () => {
    render(
      <EdgeDetail
        relationship={sampleRelationship}
        existingRelationships={[sampleRelationship]}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const pathInput = screen.getByTestId('edge-path-input');
    fireEvent.change(pathInput, { target: { value: '' } });
    fireEvent.click(screen.getByTestId('edge-detail-confirm'));

    expect(screen.getByTestId('edge-path-error')).toBeInTheDocument();
  });

  it('shows delete confirmation before calling onDelete', () => {
    const onDelete = vi.fn();

    render(
      <EdgeDetail
        relationship={sampleRelationship}
        existingRelationships={[sampleRelationship]}
        onUpdate={vi.fn()}
        onDelete={onDelete}
        onClose={vi.fn()}
      />
    );

    // First click shows confirmation
    fireEvent.click(screen.getByTestId('edge-detail-delete'));
    expect(screen.getByTestId('edge-delete-confirm')).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();

    // Second click confirms
    fireEvent.click(screen.getByTestId('edge-delete-confirm'));
    expect(onDelete).toHaveBeenCalled();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();

    render(
      <EdgeDetail
        relationship={sampleRelationship}
        existingRelationships={[sampleRelationship]}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByTestId('edge-detail-close'));
    expect(onClose).toHaveBeenCalled();
  });
});

// --- Migration tests (Task 11) ---

describe('Migration functionality', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows migration banner when relationships have no type field', () => {
    const implicitRels: RelationshipConfig[] = [
      { source: 'users', target: 'orders', path: '/users/{id}/orders' },
      { source: 'projects', target: 'tags', path: '/projects/{id}/tags' }
    ];

    render(
      <RelationshipEditor
        resources={[usersResource, ordersResource]}
        relationships={implicitRels}
        specOperationPaths={[]}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByTestId('migration-banner')).toBeInTheDocument();
    expect(screen.getByTestId('migration-count')).toHaveTextContent('2');
  });

  it('does not show migration banner when all relationships have explicit types', () => {
    const explicitRels: RelationshipConfig[] = [
      { source: 'users', target: 'orders', path: '/users/{id}/orders', type: 'hasMany' },
      { source: 'projects', target: 'tags', path: '/projects/{id}/tags', type: 'manyToMany' }
    ];

    render(
      <RelationshipEditor
        resources={[usersResource, ordersResource]}
        relationships={explicitRels}
        specOperationPaths={[]}
        onSave={vi.fn()}
      />
    );

    expect(screen.queryByTestId('migration-banner')).not.toBeInTheDocument();
  });

  it('shows migration banner when some relationships have no type', () => {
    const mixedRels: RelationshipConfig[] = [
      { source: 'users', target: 'orders', path: '/users/{id}/orders', type: 'hasMany' },
      { source: 'projects', target: 'tags', path: '/projects/{id}/tags' } // No type
    ];

    render(
      <RelationshipEditor
        resources={[usersResource, ordersResource]}
        relationships={mixedRels}
        specOperationPaths={[]}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByTestId('migration-banner')).toBeInTheDocument();
    expect(screen.getByTestId('migration-count')).toHaveTextContent('1');
  });

  it('migrates relationships when "Migrate Now" is clicked', () => {
    const onSave = vi.fn();
    const implicitRels: RelationshipConfig[] = [
      { source: 'users', target: 'orders', path: '/users/{id}/orders' },
      { source: 'orders', target: 'users', path: '/users/{id}/orders' }
    ];

    render(
      <RelationshipEditor
        resources={[usersResource, ordersResource]}
        relationships={implicitRels}
        specOperationPaths={[]}
        onSave={onSave}
      />
    );

    fireEvent.click(screen.getByTestId('migration-migrate-button'));

    expect(onSave).toHaveBeenCalledWith([
      { source: 'users', target: 'orders', path: '/users/{id}/orders', type: 'hasMany' },
      { source: 'orders', target: 'users', path: '/users/{id}/orders', type: 'belongsTo' }
    ]);
  });

  it('preserves existing types during migration', () => {
    const onSave = vi.fn();
    const mixedRels: RelationshipConfig[] = [
      { source: 'users', target: 'orders', path: '/users/{id}/orders', type: 'manyToMany' }, // Already has type
      { source: 'projects', target: 'tags', path: '/projects/{id}/tags' } // No type
    ];

    render(
      <RelationshipEditor
        resources={[usersResource, ordersResource]}
        relationships={mixedRels}
        specOperationPaths={[]}
        onSave={onSave}
      />
    );

    fireEvent.click(screen.getByTestId('migration-migrate-button'));

    expect(onSave).toHaveBeenCalledWith([
      { source: 'users', target: 'orders', path: '/users/{id}/orders', type: 'manyToMany' }, // Preserved
      { source: 'projects', target: 'tags', path: '/projects/{id}/tags', type: 'hasMany' } // Derived
    ]);
  });

  it('preserves all other relationship fields during migration', () => {
    const onSave = vi.fn();
    const implicitRels: RelationshipConfig[] = [
      { 
        source: 'users', 
        target: 'orders', 
        path: '/users/{id}/orders',
        label: 'User Orders',
        description: 'All orders for a user'
      }
    ];

    render(
      <RelationshipEditor
        resources={[usersResource, ordersResource]}
        relationships={implicitRels}
        specOperationPaths={[]}
        onSave={onSave}
      />
    );

    fireEvent.click(screen.getByTestId('migration-migrate-button'));

    expect(onSave).toHaveBeenCalledWith([
      { 
        source: 'users', 
        target: 'orders', 
        path: '/users/{id}/orders',
        type: 'hasMany',
        label: 'User Orders',
        description: 'All orders for a user'
      }
    ]);
  });

  it('hides banner after dismissal', () => {
    const implicitRels: RelationshipConfig[] = [
      { source: 'users', target: 'orders', path: '/users/{id}/orders' }
    ];

    render(
      <RelationshipEditor
        resources={[usersResource, ordersResource]}
        relationships={implicitRels}
        specOperationPaths={[]}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByTestId('migration-banner')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('migration-dismiss-button'));

    expect(screen.queryByTestId('migration-banner')).not.toBeInTheDocument();
  });
});
