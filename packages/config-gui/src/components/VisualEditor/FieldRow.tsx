import React, { memo } from 'react';
import { ConnectionPort } from './ConnectionPort';
import type { FieldNode } from '../../lib/spec-parser';

/**
 * Props for the FieldRow component
 */
export interface FieldRowProps {
  /** The field to display */
  field: FieldNode;
  /** Slug of the parent resource */
  resourceSlug: string;
  /** Handler called when user initiates a connection drag from the port */
  onPortMouseDown: (fieldPath: string, e: React.MouseEvent) => void;
  /** Optional callback to register the port element for line positioning */
  onRegisterPortRef?: (fieldPath: string, el: HTMLElement | null) => void;
}

/**
 * FieldRow - Individual field row with connection port
 * 
 * Displays a single field within an expanded resource card, showing the field
 * label and type badge in a compact row layout. Includes a ConnectionPort on
 * the right edge for creating ref links to other resources.
 * 
 * Features:
 * - Compact row layout with flexbox alignment
 * - Field label and type badge display
 * - ConnectionPort for drag-to-connect functionality
 * - Hover background effect for visual feedback
 * - Proper spacing and alignment of elements
 * 
 * Requirements: 2.3, 2.4, 3.1, 3.6
 * 
 * @param props - Component props
 * @returns FieldRow component
 */
const FieldRowComponent: React.FC<FieldRowProps> = ({
  field,
  resourceSlug,
  onPortMouseDown,
  onRegisterPortRef,
}) => {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
      {/* Field label */}
      <span className="flex-1 truncate text-gray-700 dark:text-gray-300">
        {field.label}
      </span>
      
      {/* Type badge */}
      <span className="px-2 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 font-mono flex-shrink-0">
        {field.type}
      </span>
      
      {/* Connection port */}
      <ConnectionPort
        fieldPath={field.path}
        onMouseDown={onPortMouseDown}
        onRegisterRef={onRegisterPortRef}
      />
    </div>
  );
};

/**
 * Memoized FieldRow with path comparison
 * 
 * Only re-renders when:
 * - field.path changes (different field)
 * 
 * Does NOT re-render when:
 * - Parent component re-renders
 * - Other fields are being interacted with
 * - Callback functions change
 */
export const FieldRow = memo(FieldRowComponent, (prevProps, nextProps) => {
  return prevProps.field.path === nextProps.field.path;
});
