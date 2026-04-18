import { memo } from 'react';
import type { SpecStructure } from '../../types/index.js';

/**
 * Props for VirtualizedTree component
 * 
 * Requirements: 23.1, 23.2, 23.5
 */
export interface VirtualizedTreeProps {
  structure: SpecStructure;
  itemHeight?: number;
  height?: number;
  onNodeSelect?: (path: string, type: 'resource' | 'operation' | 'field') => void;
}

/**
 * VirtualizedTree component for rendering large spec structures efficiently.
 * 
 * TODO: Implement virtualization with react-window
 * For now, this is a placeholder that renders a simple message.
 * 
 * Requirements: 23.1, 23.2, 23.5
 */
export const VirtualizedTree = memo(function VirtualizedTree({
  structure
}: VirtualizedTreeProps) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden p-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Virtualized Tree (Coming Soon)
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Virtualization for large specs with {structure.resources.length} resources is being implemented.
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
          For now, use the regular tree view in the Visual Editor.
        </p>
      </div>
    </div>
  );
});
