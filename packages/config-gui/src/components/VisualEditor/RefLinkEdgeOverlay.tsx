import { useEffect, useLayoutEffect, useState, useCallback } from 'react';
import type { RefLinkConfig } from './RefLinkTypes';

interface EdgeLine {
  refLink: RefLinkConfig;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface NodePosition {
  x: number;
  y: number;
}

export interface RefLinkEdgeOverlayProps {
  /** Existing ref link configurations to render as solid lines */
  refLinks: RefLinkConfig[];
  /** Map of field paths to their DOM elements (for source positions) */
  fieldRefsRef: React.MutableRefObject<Map<string, HTMLElement>>;
  /** Map of resource slugs to their DOM elements (for target positions) */
  resourceRefsRef: React.MutableRefObject<Map<string, HTMLElement>>;
  /** Container element for coordinate calculations */
  containerRef: React.RefObject<HTMLElement>;
  /** Current positions of resource cards */
  positions: Map<string, NodePosition>;
  /** Live rubber-band line while the user is dragging from a port */
  pendingLine: { x1: number; y1: number; x2: number; y2: number } | null;
  /** Handler called when user clicks on a ref link line */
  onRefLinkSelect: (refLink: RefLinkConfig) => void;
}

/**
 * Get the position of a field port (right edge, vertical center) relative to the container
 */
function fieldPortPosition(el: HTMLElement, containerRect: DOMRect): { x: number; y: number } {
  const r = el.getBoundingClientRect();
  return {
    x: r.right - containerRect.left,
    y: r.top + r.height / 2 - containerRect.top,
  };
}

/**
 * Get the position of a resource card's left edge (vertical center) relative to the container
 */
function resourcePortPosition(el: HTMLElement, containerRect: DOMRect): { x: number; y: number } {
  const r = el.getBoundingClientRect();
  return {
    x: r.left - containerRect.left,
    y: r.top + r.height / 2 - containerRect.top,
  };
}

/**
 * Shorten a line segment by `pad` px at each end
 */
function shortenLine(x1: number, y1: number, x2: number, y2: number, pad: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  return {
    x1: x1 + ux * pad,
    y1: y1 + uy * pad,
    x2: x2 - ux * pad,
    y2: y2 - uy * pad,
  };
}

/**
 * RefLinkEdgeOverlay - SVG overlay for rendering connection lines
 * 
 * Renders connection lines from field ports to resource cards for x-uigen-ref annotations.
 * Displays solid green lines for existing ref links and a dashed light blue line for
 * pending connections during drag operations.
 * 
 * Features:
 * - Calculates line positions from field port refs to resource card refs
 * - Solid green lines (#10b981) for existing ref links
 * - Dashed light blue line (#60a5fa) for pending connection
 * - Arrow markers at target end
 * - Label pills at midpoint showing field path
 * - 14px stroke width for click hit area (invisible)
 * - Resize observer to update on window resize
 * - Gracefully handles missing resources (skips rendering)
 * 
 * Requirements: 4.2, 4.7, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 * 
 * @param props - Component props
 * @returns RefLinkEdgeOverlay component
 */
export function RefLinkEdgeOverlay({
  refLinks,
  fieldRefsRef,
  resourceRefsRef,
  containerRef,
  positions,
  pendingLine,
  onRefLinkSelect,
}: RefLinkEdgeOverlayProps) {
  const [lines, setLines] = useState<EdgeLine[]>([]);
  const [dims, setDims] = useState({ width: 0, height: 0 });

  const recalculate = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    setDims({ width: containerRect.width, height: containerRect.height });

    const computed: EdgeLine[] = [];
    for (const refLink of refLinks) {
      // Get field port element (source)
      const fieldEl = fieldRefsRef.current.get(refLink.fieldPath);
      // Get resource card element (target)
      const resourceEl = resourceRefsRef.current.get(refLink.resource);

      // Skip rendering if source field or target resource is missing
      if (!fieldEl || !resourceEl) {
        continue;
      }

      const src = fieldPortPosition(fieldEl, containerRect);
      const tgt = resourcePortPosition(resourceEl, containerRect);
      computed.push({
        refLink,
        x1: src.x,
        y1: src.y,
        x2: tgt.x,
        y2: tgt.y,
      });
    }
    setLines(computed);
  }, [refLinks, fieldRefsRef, resourceRefsRef, containerRef, positions]);

  // Recalculate on mount and when dependencies change
  useLayoutEffect(() => {
    recalculate();
  }, [recalculate]);

  // Recalculate on container resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const obs = new ResizeObserver(recalculate);
    obs.observe(container);
    return () => obs.disconnect();
  }, [containerRef, recalculate]);

  // Recalculate on window resize
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
      data-testid="ref-link-edge-overlay"
    >
      <defs>
        {/* Arrow marker for existing ref links (green) */}
        <marker
          id="arrow-ref-link"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#10b981" />
        </marker>

        {/* Arrow marker for pending connection (light blue) */}
        <marker
          id="arrow-pending-ref"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#60a5fa" />
        </marker>

        {/* Glow effect for lines */}
        <filter id="ref-link-glow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Existing ref link lines (solid green) */}
      {lines.map((line, idx) => {
        const key = `${line.refLink.fieldPath}-${line.refLink.resource}-${idx}`;
        const label = line.refLink.fieldPath;
        const s = shortenLine(line.x1, line.y1, line.x2, line.y2, 6);
        const midX = (s.x1 + s.x2) / 2;
        const midY = (s.y1 + s.y2) / 2;
        const labelW = Math.min(label.length * 6.5, 200);

        return (
          <g key={key} data-testid={`ref-link-line-${line.refLink.fieldPath}`}>
            {/* Hit area for click detection (14px stroke width) */}
            <line
              x1={s.x1}
              y1={s.y1}
              x2={s.x2}
              y2={s.y2}
              stroke="transparent"
              strokeWidth={14}
              style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
              onClick={() => onRefLinkSelect(line.refLink)}
              aria-label={`Ref link: ${line.refLink.fieldPath} to ${line.refLink.resource}`}
            />
            {/* Visible line (solid green) */}
            <line
              x1={s.x1}
              y1={s.y1}
              x2={s.x2}
              y2={s.y2}
              stroke="#10b981"
              strokeWidth={2}
              markerEnd="url(#arrow-ref-link)"
              filter="url(#ref-link-glow)"
              style={{ pointerEvents: 'none' }}
            />
            {/* Label pill at midpoint */}
            <g
              transform={`translate(${midX},${midY - 14})`}
              style={{ pointerEvents: 'none' }}
            >
              <rect
                x={-labelW / 2}
                y={-8}
                width={labelW}
                height={16}
                rx={4}
                fill="white"
                stroke="#10b981"
                strokeWidth={1}
                opacity={0.93}
              />
              <text
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={10}
                fill="#059669"
                fontFamily="ui-monospace,monospace"
              >
                {label.length > 30 ? label.slice(0, 28) + '…' : label}
              </text>
            </g>
          </g>
        );
      })}

      {/* Pending connection line (dashed light blue) */}
      {pendingLine && (
        <line
          x1={pendingLine.x1}
          y1={pendingLine.y1}
          x2={pendingLine.x2}
          y2={pendingLine.y2}
          stroke="#60a5fa"
          strokeWidth={2}
          strokeDasharray="6 3"
          markerEnd="url(#arrow-pending-ref)"
          style={{ pointerEvents: 'none' }}
        />
      )}
    </svg>
  );
}
