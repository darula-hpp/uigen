import { useRef, useState, useCallback, useEffect } from 'react';
import type { RelationshipConfig } from '@uigen-dev/core';
import type { ResourceNode } from '../../types/index.js';
import { ResourceNodeCard } from './ResourceNode.js';
import { EdgeOverlay } from './EdgeOverlay.js';

export interface GraphCanvasProps {
  resources: ResourceNode[];
  relationships: RelationshipConfig[];
  onEdgeInitiated: (source: string, target: string) => void;
  onEdgeSelect: (rel: RelationshipConfig) => void;
}

interface PendingLine {
  sourceSlug: string;
  x1: number; y1: number; // port origin (container-relative)
  x2: number; y2: number; // current cursor position
}

/**
 * GraphCanvas — connector-port interaction model.
 *
 * Each card has a small dot on its right edge (the "port").
 * The user mousedowns on a port, drags a rubber-band line across the canvas,
 * and releases on another card to create a relationship.
 * Cards themselves do not move.
 */
export function GraphCanvas({ resources, relationships, onEdgeInitiated, onEdgeSelect }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefsRef = useRef<Map<string, HTMLElement>>(new Map());
  const [pending, setPending] = useState<PendingLine | null>(null);
  const [highlightedSlug, setHighlightedSlug] = useState<string | null>(null);

  const outgoingCount = useCallback(
    (slug: string) => relationships.filter(r => r.source === slug).length,
    [relationships]
  );

  function registerNodeRef(slug: string, el: HTMLElement | null) {
    if (el) nodeRefsRef.current.set(slug, el);
    else nodeRefsRef.current.delete(slug);
  }

  /** Convert a viewport-relative point to container-relative */
  function toContainerCoords(clientX: number, clientY: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: clientX, y: clientY };
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function handlePortMouseDown(sourceSlug: string, e: React.MouseEvent) {
    e.preventDefault();
    const srcEl = nodeRefsRef.current.get(sourceSlug);
    if (!srcEl || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const srcRect = srcEl.getBoundingClientRect();
    const x1 = srcRect.right - containerRect.left;
    const y1 = srcRect.top + srcRect.height / 2 - containerRect.top;

    setPending({ sourceSlug, x1, y1, x2: x1, y2: y1 });
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!pending) return;
    const { x, y } = toContainerCoords(e.clientX, e.clientY);
    setPending(p => p ? { ...p, x2: x, y2: y } : null);

    // Highlight whichever card the cursor is over
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const card = el?.closest('[data-slug]') as HTMLElement | null;
    setHighlightedSlug(card?.dataset.slug ?? null);
  }, [pending]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!pending) return;

    const el = document.elementFromPoint(e.clientX, e.clientY);
    const card = el?.closest('[data-slug]') as HTMLElement | null;
    const targetSlug = card?.dataset.slug;

    if (targetSlug && targetSlug !== pending.sourceSlug) {
      onEdgeInitiated(pending.sourceSlug, targetSlug);
    }

    setPending(null);
    setHighlightedSlug(null);
  }, [pending, onEdgeInitiated]);

  // Attach global listeners only while dragging
  useEffect(() => {
    if (!pending) return;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [pending, handleMouseMove, handleMouseUp]);

  if (resources.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-64 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg"
        data-testid="graph-canvas-empty"
      >
        <div className="text-center">
          <svg className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
          <p className="text-sm text-gray-400 dark:text-gray-500">No resources found in the loaded spec.</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Load a spec with resources to start declaring relationships.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative min-h-64 select-none"
      style={{ cursor: pending ? 'crosshair' : 'default' }}
      data-testid="graph-canvas"
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 p-6 pb-10">
        {resources.map(resource => (
          <div key={resource.slug} ref={el => registerNodeRef(resource.slug, el)}>
            <ResourceNodeCard
              resource={resource}
              relationshipCount={outgoingCount(resource.slug)}
              isHighlighted={highlightedSlug === resource.slug && pending !== null && pending.sourceSlug !== resource.slug}
              onPortMouseDown={handlePortMouseDown}
              onCardMouseUp={() => {/* handled globally */}}
            />
          </div>
        ))}
      </div>

      <EdgeOverlay
        relationships={relationships}
        nodeRefsRef={nodeRefsRef}
        containerRef={containerRef}
        pendingLine={pending ? { x1: pending.x1, y1: pending.y1, x2: pending.x2, y2: pending.y2 } : null}
        onEdgeSelect={onEdgeSelect}
      />
    </div>
  );
}
