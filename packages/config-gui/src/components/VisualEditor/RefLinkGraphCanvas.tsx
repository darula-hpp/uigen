import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import type { ConfigFile } from '@uigen-dev/core';
import type { ResourceNode } from '../../lib/spec-parser';
import type { RefLinkConfig, DragMode, PendingLine } from './RefLinkTypes';
import { ResourceCard } from './ResourceCard';
import { RefLinkEdgeOverlay } from './RefLinkEdgeOverlay';
import { PositionManager } from '../../lib/position-manager';
import { GridLayoutStrategy } from '../../lib/layout-strategy';
import { ConfigFilePersistenceAdapter } from '../../lib/config-file-persistence-adapter';

export interface RefLinkGraphCanvasProps {
  resources: ResourceNode[];
  refLinks: RefLinkConfig[];
  onConnectionInitiated: (fieldPath: string, targetSlug: string) => void;
  onRefLinkSelect: (refLink: RefLinkConfig) => void;
  loadConfig: () => Promise<ConfigFile>;
  saveConfig: (config: ConfigFile) => Promise<void>;
}

interface NodePosition {
  x: number;
  y: number;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type ResetState = 'idle' | 'confirming' | 'resetting';

const CARD_W = 200; // Wider than relationship cards to accommodate field list
const CARD_H = 600; // Large enough for expanded cards with many fields (approx 15 fields)
const WORLD_W = 8000;
const WORLD_H = 8000;
const COLS = 3; // Reduced columns to give more horizontal space
const GAP = 120; // Large gap to prevent overlap when cards are expanded
const PAD = 48;

/**
 * RefLinkGraphCanvas - Canvas component for visual ref link editor
 * 
 * Renders resource cards on a pannable canvas with drag-to-connect functionality
 * for creating x-uigen-ref annotations. Reuses infrastructure from RelationshipEditor
 * including PositionManager, GridLayoutStrategy, and EdgeOverlay patterns.
 * 
 * Features:
 * - Pannable canvas with dot-grid background
 * - Draggable resource cards with position persistence
 * - Drag from field ports to resource cards to create connections
 * - Visual connection lines for existing ref links
 * - Reset layout functionality
 * - Save indicators and error notifications
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 9.1, 12.6
 * 
 * @param props - Component props
 * @returns RefLinkGraphCanvas component
 */
export function RefLinkGraphCanvas({
  resources,
  refLinks,
  onConnectionInitiated,
  onRefLinkSelect,
  loadConfig,
  saveConfig,
}: RefLinkGraphCanvasProps) {
  // The viewport element (fixed size, clips the world)
  const viewportRef = useRef<HTMLDivElement>(null);
  // The world element (large, panned via transform)
  const worldRef = useRef<HTMLDivElement>(null);
  // Refs to resource card DOM elements (for line positioning)
  const resourceRefsRef = useRef<Map<string, HTMLElement>>(new Map());
  // Refs to field port DOM elements (for line positioning)
  const fieldRefsRef = useRef<Map<string, HTMLElement>>(new Map());

  // Create PositionManager instance with separate config key for ref link positions
  const positionManagerRef = useRef<PositionManager | null>(null);
  if (!positionManagerRef.current) {
    // Use ConfigFilePersistenceAdapter but with a custom config key
    // We'll need to modify the adapter to support custom keys
    // For now, we'll use the same adapter pattern as RelationshipEditor
    const adapter = new ConfigFilePersistenceAdapter(loadConfig, saveConfig);
    const layoutStrategy = new GridLayoutStrategy(
      CARD_W,
      CARD_H,
      GAP,
      PAD,
      COLS,
      { width: WORLD_W, height: WORLD_H }
    );
    positionManagerRef.current = new PositionManager(
      adapter,
      layoutStrategy,
      { width: WORLD_W, height: WORLD_H }
    );
  }

  // State management
  const [positions, setPositions] = useState<Map<string, NodePosition>>(new Map());
  // Initialize with all resource slugs so cards are expanded by default
  const [expandedCards, setExpandedCards] = useState<Set<string>>(() => 
    new Set(resources.map(r => r.slug))
  );
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<DragMode | null>(null);
  const [pending, setPending] = useState<PendingLine | null>(null);
  const [highlightedSlug, setHighlightedSlug] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [resetState, setResetState] = useState<ResetState>('idle');
  const [isAnimating, setIsAnimating] = useState(false);

  // Ref to hold current positions for event handlers (avoids stale closures)
  const positionsRef = useRef(positions);
  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  // Load positions on mount and when resource list changes
  // Memoize resource slugs to avoid unnecessary recalculations
  const resourceSlugs = useMemo(() => resources.map((r) => r.slug), [resources]);

  // Track previous resource slugs to detect changes
  const prevResourceSlugsRef = useRef<string>('');

  useEffect(() => {
    const key = resourceSlugs.join(',');

    // Only load if resource list has changed
    if (key === prevResourceSlugsRef.current) {
      return;
    }

    prevResourceSlugsRef.current = key;

    const loadPositions = async () => {
      try {
        const positionManager = positionManagerRef.current;
        if (!positionManager) {
          console.warn('PositionManager not initialized');
          return;
        }

        // Clean up orphaned positions
        await positionManager.cleanupOrphanedPositions(resourceSlugs);

        // Initialize positions for all resources
        const loadedPositions = await positionManager.initializePositions(resourceSlugs);
        setPositions(loadedPositions);
      } catch (error) {
        console.error('Failed to load positions:', error);
        // Fallback to empty map - positions will be calculated on demand
        setPositions(new Map());
      }
    };

    loadPositions();
  }, [resourceSlugs]);

  // Register resource card ref
  function registerResourceRef(slug: string, el: HTMLElement | null) {
    if (el) resourceRefsRef.current.set(slug, el);
    else resourceRefsRef.current.delete(slug);
  }

  // Register field port ref
  function registerFieldRef(fieldPath: string, el: HTMLElement | null) {
    if (el) fieldRefsRef.current.set(fieldPath, el);
    else fieldRefsRef.current.delete(fieldPath);
  }

  /** Convert viewport-relative client coords to world coords */
  function toWorld(clientX: number, clientY: number) {
    const vr = viewportRef.current?.getBoundingClientRect();
    if (!vr) return { x: clientX, y: clientY };
    return { x: clientX - vr.left - pan.x, y: clientY - vr.top - pan.y };
  }

  // ── Port drag (connection creation) ───────────────────────────────────────

  function handlePortMouseDown(fieldPath: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    // Get the port element position
    const portEl = fieldRefsRef.current.get(fieldPath);
    if (!portEl || !worldRef.current) return;

    const worldRect = worldRef.current.getBoundingClientRect();
    const portRect = portEl.getBoundingClientRect();

    // Port is on the right-center of the field row, in world space
    const x1 = portRect.right - worldRect.left;
    const y1 = portRect.top + portRect.height / 2 - worldRect.top;

    setPending({ fieldPath, x1, y1, x2: x1, y2: y1 });
  }

  // ── Card drag ─────────────────────────────────────────────────────────────

  function handleCardMouseDown(slug: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    // Use ref to get current position (avoids stale closure)
    const pos = positionsRef.current.get(slug);
    if (!pos) {
      return;
    }

    setDrag({
      kind: 'card',
      slug,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startNodeX: pos.x,
      startNodeY: pos.y,
    });
  }

  // ── Canvas pan ────────────────────────────────────────────────────────────

  function handleCanvasMouseDown(e: React.MouseEvent) {
    // Only pan on left-click directly on the canvas background
    if (e.target !== viewportRef.current && e.target !== worldRef.current) return;
    e.preventDefault();
    setDrag({
      kind: 'pan',
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
    });
  }

  // ── Toggle expand/collapse ────────────────────────────────────────────────

  const handleToggleExpand = useCallback((slug: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  }, []);

  // ── Global move / up ──────────────────────────────────────────────────────

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (pending) {
        const vr = viewportRef.current?.getBoundingClientRect();
        if (vr) {
          const w = { x: e.clientX - vr.left - pan.x, y: e.clientY - vr.top - pan.y };
          setPending((p) => (p ? { ...p, x2: w.x, y2: w.y } : null));
        }

        const el = document.elementFromPoint(e.clientX, e.clientY);
        const card = el?.closest('[data-slug]') as HTMLElement | null;
        setHighlightedSlug(card?.dataset.slug ?? null);
      }

      if (drag?.kind === 'card') {
        const dx = e.clientX - drag.startMouseX;
        const dy = e.clientY - drag.startMouseY;
        setPositions((prev) => {
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
    },
    [pending, drag, pan]
  );

  const handleMouseUp = useCallback(
    async (e: MouseEvent) => {
      if (pending) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const card = el?.closest('[data-slug]') as HTMLElement | null;
        const targetSlug = card?.dataset.slug;

        // Extract source resource slug from field path (e.g., "users.departmentId" -> "users")
        const sourceSlug = pending.fieldPath.split('.')[0];

        // Prevent self-connections
        if (targetSlug && targetSlug !== sourceSlug) {
          onConnectionInitiated(pending.fieldPath, targetSlug);
        }

        setPending(null);
        setHighlightedSlug(null);
      }

      // Save position after card drag
      if (drag?.kind === 'card') {
        const positionManager = positionManagerRef.current;
        if (positionManager) {
          // Use ref to get current position (avoids stale closure)
          const newPosition = positionsRef.current.get(drag.slug);
          if (newPosition) {
            try {
              // Set saving status
              setSaveStatus('saving');
              setSaveError(null);

              await positionManager.setPosition(drag.slug, newPosition);

              // Set saved status
              setSaveStatus('saved');

              // Auto-hide indicator after 1 second
              setTimeout(() => {
                setSaveStatus('idle');
              }, 1000);

              // Reset retry count on success
              setRetryCount(0);
            } catch (error) {
              console.error('Failed to save position:', error);
              setSaveStatus('error');
              setSaveError(error instanceof Error ? error.message : 'Failed to save layout');
            }
          }
        }
      }

      setDrag(null);
    },
    [pending, onConnectionInitiated, drag]
  );

  // Retry save handler
  const handleRetrySave = useCallback(async () => {
    // Limit retries to 3 attempts
    if (retryCount >= 3) {
      setSaveError('Maximum retry attempts reached. Please try again later.');
      return;
    }

    const positionManager = positionManagerRef.current;
    if (!positionManager) return;

    try {
      setSaveStatus('saving');
      setSaveError(null);
      setRetryCount((prev) => prev + 1);

      // Save all current positions using ref
      const allPositions: Record<string, NodePosition> = {};
      positionsRef.current.forEach((pos, slug) => {
        allPositions[slug] = pos;
      });

      // Use the adapter's save method directly
      const adapter = new ConfigFilePersistenceAdapter(loadConfig, saveConfig);
      await adapter.save(allPositions);

      setSaveStatus('saved');
      setTimeout(() => {
        setSaveStatus('idle');
      }, 1000);

      // Reset retry count on success
      setRetryCount(0);
    } catch (error) {
      console.error('Retry save failed:', error);
      setSaveStatus('error');
      setSaveError(error instanceof Error ? error.message : 'Failed to save layout');
    }
  }, [retryCount, loadConfig, saveConfig]);

  // Reset layout handler
  const handleResetLayout = useCallback(async () => {
    const positionManager = positionManagerRef.current;
    if (!positionManager) return;

    try {
      setResetState('resetting');
      setIsAnimating(true);

      // Reset to default positions
      const defaultPositions = await positionManager.resetToDefault(resourceSlugs);

      // Update positions state with animation
      setPositions(defaultPositions);

      // Wait for animation to complete
      setTimeout(() => {
        setIsAnimating(false);
        setResetState('idle');

        // Show success message
        setSaveStatus('saved');
        setTimeout(() => {
          setSaveStatus('idle');
        }, 1000);
      }, 300);
    } catch (error) {
      console.error('Failed to reset layout:', error);
      setResetState('idle');
      setIsAnimating(false);
      setSaveStatus('error');
      setSaveError(error instanceof Error ? error.message : 'Failed to reset layout');
    }
  }, [resourceSlugs]);

  const handleResetClick = useCallback(() => {
    setResetState('confirming');
  }, []);

  const handleResetConfirm = useCallback(() => {
    setResetState('idle');
    handleResetLayout();
  }, [handleResetLayout]);

  const handleResetCancel = useCallback(() => {
    setResetState('idle');
  }, []);

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
        data-testid="ref-link-graph-canvas-empty"
      >
        <div className="text-center">
          <svg
            className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
            />
          </svg>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            No resources found in the loaded spec.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Load a spec with resources to start creating ref links.
          </p>
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
      data-testid="ref-link-graph-canvas"
    >
      {/* ARIA live region for state change announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {saveStatus === 'saving' && 'Saving layout...'}
        {saveStatus === 'saved' && 'Layout saved'}
        {saveStatus === 'error' && `Failed to save layout: ${saveError || 'Unknown error'}`}
        {resetState === 'resetting' && 'Resetting layout...'}
      </div>

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
            <pattern id="dot-grid-reflink" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="1" fill="#94a3b8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dot-grid-reflink)" />
        </svg>

        {/* Resource Cards */}
        {resources.map((resource) => {
          const pos = positions.get(resource.slug);
          // Skip rendering if position not loaded yet
          if (!pos) {
            return null;
          }

          return (
            <div
              key={resource.slug}
              ref={(el) => registerResourceRef(resource.slug, el)}
              style={{
                position: 'absolute',
                left: pos.x,
                top: pos.y,
                width: CARD_W,
                zIndex: drag?.kind === 'card' && drag.slug === resource.slug ? 20 : 10,
                transition: isAnimating ? 'left 300ms ease-out, top 300ms ease-out' : 'none',
              }}
            >
              <ResourceCard
                resource={resource}
                isExpanded={expandedCards.has(resource.slug)}
                isHighlighted={
                  highlightedSlug === resource.slug &&
                  pending !== null &&
                  !pending.fieldPath.startsWith(resource.slug + '.')
                }
                onToggleExpand={handleToggleExpand}
                onCardMouseDown={handleCardMouseDown}
                onPortMouseDown={handlePortMouseDown}
                onRegisterPortRef={registerFieldRef}
              />
            </div>
          );
        })}

        {/* SVG edge overlay for connection lines */}
        <RefLinkEdgeOverlay
          refLinks={refLinks}
          fieldRefsRef={fieldRefsRef}
          resourceRefsRef={resourceRefsRef}
          containerRef={worldRef as React.RefObject<HTMLElement>}
          positions={positions}
          pendingLine={pending ? { x1: pending.x1, y1: pending.y1, x2: pending.x2, y2: pending.y2 } : null}
          onRefLinkSelect={onRefLinkSelect}
        />
      </div>

      {/* Reset Layout button */}
      <button
        onClick={handleResetClick}
        disabled={resetState === 'resetting' || isAnimating}
        className="absolute top-3 right-3 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        data-testid="reset-layout-button"
        title="Reset all card positions to default grid layout"
      >
        <svg
          className="w-3 h-3"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        Reset Layout
      </button>

      {/* Confirmation dialog */}
      {resetState === 'confirming' && (
        <div
          className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          data-testid="reset-confirmation-dialog"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Reset Layout
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Reset all card positions to default grid layout?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleResetCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                data-testid="reset-cancel-button"
              >
                Cancel
              </button>
              <button
                onClick={handleResetConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                data-testid="reset-confirm-button"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pan hint */}
      <div className="absolute bottom-2 right-3 text-xs text-gray-400 dark:text-gray-600 pointer-events-none select-none">
        drag canvas to pan
      </div>

      {/* Save indicator */}
      {saveStatus === 'saving' && (
        <div
          className="absolute bottom-2 left-3 px-3 py-1.5 bg-blue-500 text-white text-xs rounded-md shadow-md flex items-center gap-2"
          data-testid="save-indicator"
        >
          <svg
            className="animate-spin h-3 w-3"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Saving layout...
        </div>
      )}

      {saveStatus === 'saved' && (
        <div
          className="absolute bottom-2 left-3 px-3 py-1.5 bg-green-500 text-white text-xs rounded-md shadow-md flex items-center gap-2"
          data-testid="save-indicator"
        >
          <svg
            className="h-3 w-3"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Saved
        </div>
      )}

      {/* Error notification */}
      {saveStatus === 'error' && (
        <div
          className="absolute bottom-2 left-3 px-3 py-2 bg-red-500 text-white text-xs rounded-md shadow-lg max-w-xs"
          data-testid="error-notification"
        >
          <div className="flex items-start gap-2">
            <svg
              className="h-4 w-4 flex-shrink-0 mt-0.5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <div className="font-medium mb-1">Failed to save layout</div>
              {saveError && <div className="text-xs opacity-90 mb-2">{saveError}</div>}
              {retryCount < 3 ? (
                <button
                  onClick={handleRetrySave}
                  className="text-xs font-medium underline hover:no-underline"
                  data-testid="retry-button"
                >
                  Retry ({3 - retryCount} attempts remaining)
                </button>
              ) : (
                <div className="text-xs opacity-90">Maximum retries reached</div>
              )}
            </div>
            <button
              onClick={() => setSaveStatus('idle')}
              className="flex-shrink-0 hover:opacity-75"
              aria-label="Dismiss error"
              data-testid="dismiss-error-button"
            >
              <svg
                className="h-3 w-3"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
