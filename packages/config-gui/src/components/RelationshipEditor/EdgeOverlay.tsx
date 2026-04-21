import { useEffect, useLayoutEffect, useState, useCallback } from 'react';
import type { RelationshipConfig } from '@uigen-dev/core';

interface EdgeLine {
  rel: RelationshipConfig;
  x1: number; y1: number;
  x2: number; y2: number;
}

interface NodePosition { x: number; y: number; }

export interface EdgeOverlayProps {
  relationships: RelationshipConfig[];
  nodeRefsRef: React.MutableRefObject<Map<string, HTMLElement>>;
  containerRef: React.RefObject<HTMLElement | null>;
  positions: Map<string, NodePosition>;
  /** Live rubber-band line while the user is dragging a connector */
  pendingLine: { x1: number; y1: number; x2: number; y2: number } | null;
  onEdgeSelect: (rel: RelationshipConfig) => void;
}

/** Get the right-center port position of a node element relative to the container */
function portPosition(el: HTMLElement, containerRect: DOMRect): { x: number; y: number } {
  const r = el.getBoundingClientRect();
  return {
    x: r.right - containerRect.left,
    y: r.top + r.height / 2 - containerRect.top,
  };
}

/** Shorten a line segment by `pad` px at each end */
function shortenLine(x1: number, y1: number, x2: number, y2: number, pad: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  return { x1: x1 + ux * pad, y1: y1 + uy * pad, x2: x2 - ux * pad, y2: y2 - uy * pad };
}

export function EdgeOverlay({ relationships, nodeRefsRef, containerRef, positions, pendingLine, onEdgeSelect }: EdgeOverlayProps) {
  const [lines, setLines] = useState<EdgeLine[]>([]);
  const [dims, setDims] = useState({ width: 0, height: 0 });

  const recalculate = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    setDims({ width: containerRect.width, height: containerRect.height });

    const computed: EdgeLine[] = [];
    for (const rel of relationships) {
      const srcEl = nodeRefsRef.current.get(rel.source);
      const tgtEl = nodeRefsRef.current.get(rel.target);
      if (!srcEl || !tgtEl) continue;
      const src = portPosition(srcEl, containerRect);
      const tgt = portPosition(tgtEl, containerRect);
      computed.push({ rel, x1: src.x, y1: src.y, x2: tgt.x, y2: tgt.y });
    }
    setLines(computed);
  }, [relationships, nodeRefsRef, containerRef, positions]);

  useLayoutEffect(() => { recalculate(); }, [recalculate]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const obs = new ResizeObserver(recalculate);
    obs.observe(container);
    return () => obs.disconnect();
  }, [containerRef, recalculate]);

  useEffect(() => {
    window.addEventListener('resize', recalculate);
    return () => window.removeEventListener('resize', recalculate);
  }, [recalculate]);

  return (
    <svg
      className="absolute inset-0 overflow-visible"
      width={dims.width}
      height={dims.height}
      viewBox={`0 0 ${dims.width} ${dims.height}`}
      style={{ pointerEvents: 'none' }}
      aria-hidden="true"
      data-testid="edge-overlay"
    >
      <defs>
        <marker id="arrow-end" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" />
        </marker>
        <marker id="arrow-pending" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#a5b4fc" />
        </marker>
        <filter id="edge-glow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Committed edges */}
      {lines.map((line, idx) => {
        const key = `${line.rel.source}-${line.rel.target}-${idx}`;
        const label = line.rel.label ?? line.rel.path;
        const s = shortenLine(line.x1, line.y1, line.x2, line.y2, 6);
        const midX = (s.x1 + s.x2) / 2;
        const midY = (s.y1 + s.y2) / 2;
        const labelW = Math.min(label.length * 6.5, 180);

        return (
          <g key={key} data-testid={`edge-line-${line.rel.source}-${line.rel.target}`}>
            {/* Hit area */}
            <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
              stroke="transparent" strokeWidth={14}
              style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
              onClick={() => onEdgeSelect(line.rel)}
              aria-label={`Relationship: ${line.rel.source} to ${line.rel.target}`}
            />
            {/* Visible line */}
            <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
              stroke="#6366f1" strokeWidth={2}
              markerEnd="url(#arrow-end)"
              filter="url(#edge-glow)"
              style={{ pointerEvents: 'none' }}
            />
            {/* Label pill */}
            <g transform={`translate(${midX},${midY - 14})`} style={{ pointerEvents: 'none' }}>
              <rect x={-labelW / 2} y={-8} width={labelW} height={16} rx={4}
                fill="white" stroke="#6366f1" strokeWidth={1} opacity={0.93} />
              <text textAnchor="middle" dominantBaseline="middle"
                fontSize={10} fill="#4f46e5" fontFamily="ui-monospace,monospace">
                {label.length > 26 ? label.slice(0, 24) + '…' : label}
              </text>
            </g>
          </g>
        );
      })}

      {/* Rubber-band line while dragging */}
      {pendingLine && (
        <line
          x1={pendingLine.x1} y1={pendingLine.y1}
          x2={pendingLine.x2} y2={pendingLine.y2}
          stroke="#a5b4fc" strokeWidth={2} strokeDasharray="6 3"
          markerEnd="url(#arrow-pending)"
          style={{ pointerEvents: 'none' }}
        />
      )}
    </svg>
  );
}
