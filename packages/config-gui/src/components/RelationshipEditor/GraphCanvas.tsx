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

interface NodePosition { x: number; y: number; }

interface PendingLine {
  sourceSlug: string;
  /** world-space coordinates */
  x1: number; y1: number;
  x2: number; y2: number;
}

type DragMode =
  | { kind: 'card'; slug: string; startMouseX: number; startMouseY: number; startNodeX: number; startNodeY: number }
  | { kind: 'pan';  startMouseX: number; startMouseY: number; startPanX: number; startPanY: number };

const CARD_W = 160;
const CARD_H = 80;
const WORLD_W = 8000;
const WORLD_H = 8000;
const COLS = 4;
const GAP = 56;
const PAD = 48;

function initialPositions(resources: ResourceNode[]): Map<string, NodePosition> {
  const map = new Map<string, NodePosition>();
  resources.forEach((r, i) => {
    map.set(r.slug, {
      x: PAD + (i % COLS) * (CARD_W + GAP),
      y: PAD + Math.floor(i / COLS) * (CARD_H + GAP),
    });
  });
  return map;
}

export function GraphCanvas({ resources, relationships, onEdgeInitiated, onEdgeSelect }: GraphCanvasProps) {
  // The viewport element (fixed size, clips the world)
  const viewportRef = useRef<HTMLDivElement>(null);
  // The world element (large, panned via transform)
  const worldRef = useRef<HTMLDivElement>(null);
  const nodeRefsRef = useRef<Map<string, HTMLElement>>(new Map());

  const [positions, setPositions] = useState<Map<string, NodePosition>>(() => initialPositions(resources));
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Re-initialise when resource list changes
  const prevSlugsRef = useRef<string>('');
  useEffect(() => {
    const key = resources.map(r => r.slug).join(',');
    if (key !== prevSlugsRef.current) {
      prevSlugsRef.current = key;
      setPositions(initialPositions(resources));
    }
  }, [resources]);

  const [pending, setPending] = useState<PendingLine | null>(null);
  const [drag, setDrag] = useState<DragMode | null>(null);
  const [highlightedSlug, setHighlightedSlug] = useState<string | null>(null);

  const outgoingCount = useCallback(
    (slug: string) => relationships.filter(r => r.source === slug).length,
    [relationships]
  );

  function registerNodeRef(slug: string, el: HTMLElement | null) {
    if (el) nodeRefsRef.current.set(slug, el);
    else nodeRefsRef.current.delete(slug);
  }

  /** Convert viewport-relative client coords to world coords */
  function toWorld(clientX: number, clientY: number) {
    const vr = viewportRef.current?.getBoundingClientRect();
    if (!vr) return { x: clientX, y: clientY };
    return { x: clientX - vr.left - pan.x, y: clientY - vr.top - pan.y };
  }

  // ── Port drag ─────────────────────────────────────────────────────────────

  function handlePortMouseDown(sourceSlug: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const srcEl = nodeRefsRef.current.get(sourceSlug);
    if (!srcEl || !worldRef.current) return;
    const worldRect = worldRef.current.getBoundingClientRect();
    const srcRect = srcEl.getBoundingClientRect();
    // Port is on the right-center of the card, in world space
    const x1 = srcRect.right - worldRect.left;
    const y1 = srcRect.top + srcRect.height / 2 - worldRect.top;
    setPending({ sourceSlug, x1, y1, x2: x1, y2: y1 });
  }

  // ── Card drag ─────────────────────────────────────────────────────────────

  function handleCardMouseDown(slug: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const pos = positions.get(slug);
    if (!pos) return;
    setDrag({ kind: 'card', slug, startMouseX: e.clientX, startMouseY: e.clientY, startNodeX: pos.x, startNodeY: pos.y });
  }

  // ── Canvas pan ────────────────────────────────────────────────────────────

  function handleCanvasMouseDown(e: React.MouseEvent) {
    // Only pan on left-click directly on the canvas background
    if (e.target !== viewportRef.current && e.target !== worldRef.current) return;
    e.preventDefault();
    setDrag({ kind: 'pan', startMouseX: e.clientX, startMouseY: e.clientY, startPanX: pan.x, startPanY: pan.y });
  }

  // ── Global move / up ──────────────────────────────────────────────────────

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (pending) {
      const w = toWorld(e.clientX, e.clientY);
      setPending(p => p ? { ...p, x2: w.x, y2: w.y } : null);

      const el = document.elementFromPoint(e.clientX, e.clientY);
      const card = el?.closest('[data-slug]') as HTMLElement | null;
      setHighlightedSlug(card?.dataset.slug ?? null);
    }

    if (drag?.kind === 'card') {
      const dx = e.clientX - drag.startMouseX;
      const dy = e.clientY - drag.startMouseY;
      setPositions(prev => {
        const next = new Map(prev);
        next.set(drag.slug, {
          x: Math.max(0, drag.startNodeX + dx),
          y: Math.max(0, drag.startNodeY + dy),
        });
        return next;
      });
    }

    if (drag?.kind === 'pan') {
      const dx = e.clientX - drag.startMouseX;
      const dy = e.clientY - drag.startMouseY;
      setPan({
        x: drag.startPanX + dx,
        y: drag.startPanY + dy,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, drag]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (pending) {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const card = el?.closest('[data-slug]') as HTMLElement | null;
      const targetSlug = card?.dataset.slug;
      if (targetSlug && targetSlug !== pending.sourceSlug) {
        onEdgeInitiated(pending.sourceSlug, targetSlug);
      }
      setPending(null);
      setHighlightedSlug(null);
    }
    setDrag(null);
  }, [pending, onEdgeInitiated]);

  useEffect(() => {
    if (!pending && !drag) return;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [pending, drag, handleMouseMove, handleMouseUp]);

  // ── Cursor ────────────────────────────────────────────────────────────────

  let cursor = 'default';
  if (pending) cursor = 'crosshair';
  else if (drag?.kind === 'pan') cursor = 'grabbing';
  else if (drag?.kind === 'card') cursor = 'grabbing';

  if (resources.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700"
        style={{ height: 480 }}
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
      ref={viewportRef}
      className="relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
      style={{ height: '100%', minHeight: 600, cursor }}
      onMouseDown={handleCanvasMouseDown}
      data-testid="graph-canvas"
    >
      {/* Panned world */}
      <div
        ref={worldRef}
        style={{
          position: 'absolute',
          width: WORLD_W,
          height: WORLD_H,
          transform: `translate(${pan.x}px, ${pan.y}px)`,
          willChange: 'transform',
        }}
      >
        {/* Dot-grid background */}
        <svg
          className="absolute inset-0 pointer-events-none opacity-25"
          width={WORLD_W}
          height={WORLD_H}
          aria-hidden="true"
        >
          <defs>
            <pattern id="dot-grid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="#94a3b8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dot-grid)" />
        </svg>

        {/* Cards */}
        {resources.map(resource => {
          const pos = positions.get(resource.slug) ?? { x: 0, y: 0 };
          return (
            <div
              key={resource.slug}
              ref={el => registerNodeRef(resource.slug, el)}
              style={{
                position: 'absolute',
                left: pos.x,
                top: pos.y,
                width: CARD_W,
                zIndex: drag?.kind === 'card' && drag.slug === resource.slug ? 20 : 10,
              }}
            >
              <ResourceNodeCard
                resource={resource}
                relationshipCount={outgoingCount(resource.slug)}
                isHighlighted={
                  highlightedSlug === resource.slug &&
                  pending !== null &&
                  pending.sourceSlug !== resource.slug
                }
                onPortMouseDown={handlePortMouseDown}
                onCardMouseDown={handleCardMouseDown}
              />
            </div>
          );
        })}

        {/* SVG edge overlay — covers the whole world so lines are always correct */}
        <EdgeOverlay
          relationships={relationships}
          nodeRefsRef={nodeRefsRef}
          containerRef={worldRef}
          positions={positions}
          pendingLine={pending ? { x1: pending.x1, y1: pending.y1, x2: pending.x2, y2: pending.y2 } : null}
          onEdgeSelect={onEdgeSelect}
        />
      </div>

      {/* Pan hint */}
      <div className="absolute bottom-2 right-3 text-xs text-gray-400 dark:text-gray-600 pointer-events-none select-none">
        drag canvas to pan
      </div>
    </div>
  );
}
