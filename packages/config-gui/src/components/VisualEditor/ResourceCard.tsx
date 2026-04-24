import React, { memo } from 'react';
import { FieldRow } from './FieldRow';
import type { ResourceNode } from '../../lib/spec-parser';

/**
 * Props for the ResourceCard component
 */
export interface ResourceCardProps {
  /** The resource to display */
  resource: ResourceNode;
  /** Whether the card is currently expanded to show fields */
  isExpanded: boolean;
  /** Whether the card is highlighted (during connection drag) */
  isHighlighted: boolean;
  /** Handler called when user toggles expand/collapse */
  onToggleExpand: (slug: string) => void;
  /** Handler called when user initiates card drag */
  onCardMouseDown: (slug: string, e: React.MouseEvent) => void;
  /** Handler called when user initiates connection drag from a field port */
  onPortMouseDown: (fieldPath: string, e: React.MouseEvent) => void;
  /** Optional callback to register port elements for line positioning */
  onRegisterPortRef?: (fieldPath: string, el: HTMLElement | null) => void;
}

/**
 * ResourceCard - Draggable card representing a resource with expandable field list
 * 
 * Displays resource information in a header section with expand/collapse functionality.
 * When expanded, shows all fields with connection ports for creating ref links.
 * 
 * Features:
 * - Resource name, slug, and field count badge in header
 * - Expand/collapse toggle button with smooth animation
 * - Draggable by header to reposition on canvas
 * - Highlight styling when hovered during connection drag
 * - Renders FieldRow components when expanded
 * - 200px width to accommodate field list
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.3
 * 
 * @param props - Component props
 * @returns ResourceCard component
 */
const ResourceCardComponent: React.FC<ResourceCardProps> = ({
  resource,
  isExpanded,
  isHighlighted,
  onToggleExpand,
  onCardMouseDown,
  onPortMouseDown,
  onRegisterPortRef,
}) => {
  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    // Only initiate drag if clicking on the header itself, not the toggle button
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    onCardMouseDown(resource.slug, e);
  };

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering card drag
    onToggleExpand(resource.slug);
  };

  const handleToggleKeyDown = (e: React.KeyboardEvent) => {
    // Support Space key for expand/collapse (Enter is handled by button default behavior)
    if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      e.stopPropagation();
      onToggleExpand(resource.slug);
    }
  };

  const fieldCount = resource.fields.length;

  return (
    <div
      className={[
        'relative rounded-xl border-2 select-none transition-all duration-200 bg-white dark:bg-gray-800',
        'w-[200px]', // Fixed width to accommodate field list
        isHighlighted
          ? 'border-indigo-400 shadow-xl ring-2 ring-indigo-300 dark:ring-indigo-700'
          : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md',
      ].join(' ')}
      data-testid={`resource-card-${resource.slug}`}
      data-slug={resource.slug}
      aria-label={`Resource: ${resource.name}`}
    >
      {/* Header - draggable area */}
      <div
        className="p-3 cursor-grab active:cursor-grabbing"
        onMouseDown={handleHeaderMouseDown}
      >
        {/* Field count badge */}
        {fieldCount > 0 && (
          <span
            className="absolute -top-2 -right-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-indigo-500 rounded-full shadow"
            aria-label={`${fieldCount} field${fieldCount !== 1 ? 's' : ''}`}
          >
            {fieldCount}
          </span>
        )}

        {/* Icon + name + expand toggle */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-indigo-500 dark:text-indigo-400 flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
          </span>
          <span className="font-semibold text-sm text-gray-900 dark:text-white truncate flex-1">
            {resource.name}
          </span>
          {/* Expand/collapse toggle button */}
          <button
            onClick={handleToggleClick}
            onKeyDown={handleToggleKeyDown}
            className="flex-shrink-0 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={isExpanded ? 'Collapse fields' : 'Expand fields'}
            aria-expanded={isExpanded}
          >
            <svg
              className={`w-3 h-3 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Slug */}
        <p className="text-xs text-gray-400 dark:text-gray-500 font-mono truncate">
          {resource.slug}
        </p>
      </div>

      {/* Expandable field list */}
      <div
        className="overflow-hidden transition-all duration-200 ease-out"
        style={{
          maxHeight: isExpanded ? `${fieldCount * 36 + 16}px` : '0px', // Approximate height: 36px per field + padding
        }}
      >
        <div className="px-2 pb-2 space-y-0.5">
          {resource.fields.map((field) => (
            <FieldRow
              key={field.path}
              field={field}
              resourceSlug={resource.slug}
              onPortMouseDown={onPortMouseDown}
              onRegisterPortRef={onRegisterPortRef}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Memoized ResourceCard with custom comparison function
 * 
 * Only re-renders when:
 * - resource.slug changes (different resource)
 * - isExpanded changes (expand/collapse state)
 * - isHighlighted changes (hover state during connection drag)
 * 
 * Does NOT re-render when:
 * - Parent component re-renders
 * - Other cards are being dragged
 * - Callback functions change
 */
export const ResourceCard = memo(ResourceCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.resource.slug === nextProps.resource.slug &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.isHighlighted === nextProps.isHighlighted
  );
});
