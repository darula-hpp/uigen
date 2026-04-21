import type { ResourceNode } from '../../types/index.js';

export interface ResourceNodeCardProps {
  resource: ResourceNode;
  relationshipCount: number;
  isHighlighted: boolean;
  /** Called when the user starts dragging the connector port */
  onPortMouseDown: (slug: string, e: React.MouseEvent) => void;
  /** Called when the user releases over this card */
  onCardMouseUp: (slug: string) => void;
}

/**
 * ResourceNodeCard — a static card with a connector port dot on the right edge.
 * Cards do NOT move. Relationships are drawn by dragging from the port dot.
 */
export function ResourceNodeCard({
  resource,
  relationshipCount,
  isHighlighted,
  onPortMouseDown,
  onCardMouseUp,
}: ResourceNodeCardProps) {
  return (
    <div
      className={[
        'relative rounded-xl border-2 p-4 select-none transition-all duration-150 bg-white dark:bg-gray-800',
        isHighlighted
          ? 'border-indigo-400 shadow-xl ring-2 ring-indigo-300 dark:ring-indigo-700'
          : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md',
      ].join(' ')}
      onMouseUp={() => onCardMouseUp(resource.slug)}
      data-testid={`resource-node-${resource.slug}`}
      data-slug={resource.slug}
      aria-label={`Resource: ${resource.name}`}
    >
      {/* Relationship count badge */}
      {relationshipCount > 0 && (
        <span
          className="absolute -top-2 -right-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-indigo-500 rounded-full shadow"
          aria-label={`${relationshipCount} relationship${relationshipCount !== 1 ? 's' : ''}`}
        >
          {relationshipCount}
        </span>
      )}

      {/* Icon + name */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-indigo-500 dark:text-indigo-400 flex-shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </span>
        <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
          {resource.name}
        </span>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 font-mono truncate">{resource.slug}</p>

      {/* Connector port — right-center dot */}
      <div
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 rounded-full bg-indigo-400 border-2 border-white dark:border-gray-800 cursor-crosshair hover:bg-indigo-600 hover:scale-125 transition-transform z-10"
        onMouseDown={e => { e.stopPropagation(); onPortMouseDown(resource.slug, e); }}
        aria-label={`Connect from ${resource.name}`}
        data-testid={`port-${resource.slug}`}
      />
    </div>
  );
}
