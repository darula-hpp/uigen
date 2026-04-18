import { memo, useCallback } from 'react';
import type { ElementType, IgnoreState } from '../../../types/index.js';
import { AnnotationBadge } from './AnnotationBadge.js';

/**
 * Props for IgnoreToggle component
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8
 */
export interface IgnoreToggleProps {
  /** Path of the element in the spec (e.g., "components.schemas.User.properties.email") */
  elementPath: string;
  
  /** Type of the element being toggled */
  elementType: ElementType;
  
  /** Current ignore state including explicit, effective, and source information */
  ignoreState: IgnoreState;
  
  /** Whether the toggle is disabled (e.g., when parent is ignored and no override exists) */
  disabled: boolean;
  
  /** Callback when toggle value changes */
  onChange: (value: boolean) => void;
}

/**
 * IgnoreToggle component displays a toggle switch for x-uigen-ignore annotation.
 * 
 * Features:
 * - Toggle switch with current state display (on/off)
 * - Disabled state handling for pruned children
 * - Visual feedback with color coding
 * - Accessibility support with ARIA attributes
 * - Annotation badge showing source (Explicit/Inherited/Override)
 * - Memoized to prevent unnecessary re-renders (Requirements: 23.1, 23.4)
 * 
 * The component follows the same toggle pattern as ThemeToggle and OperationNode
 * for consistency across the config-gui interface.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 23.1, 23.4
 * 
 * Usage:
 * ```tsx
 * <IgnoreToggle
 *   elementPath="components.schemas.User.properties.email"
 *   elementType="property"
 *   ignoreState={state}
 *   disabled={false}
 *   onChange={(value) => handleIgnoreChange(value)}
 * />
 * ```
 */
export const IgnoreToggle = memo(function IgnoreToggle({
  elementPath,
  elementType,
  ignoreState,
  disabled,
  onChange
}: IgnoreToggleProps) {
  const isIgnored = ignoreState.effective;
  
  // Extract element name from path for display
  const elementName = getElementName(elementPath);
  
  // Handle toggle click - memoized to prevent recreation on every render
  // Requirements: 23.1, 23.4
  const handleToggle = useCallback(() => {
    if (disabled) return;
    onChange(!isIgnored);
  }, [disabled, isIgnored, onChange]);
  
  return (
    <div className="flex items-center gap-2" data-testid="ignore-toggle-container">
      {/* Toggle switch */}
      <button
        role="switch"
        aria-checked={isIgnored}
        aria-label={`Toggle ignore for ${elementName}`}
        aria-describedby={`${elementPath}-tooltip`}
        onClick={handleToggle}
        disabled={disabled}
        className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-400 dark:focus:ring-offset-gray-800 ${
          disabled
            ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed opacity-50'
            : isIgnored
            ? 'bg-red-400 dark:bg-red-500'
            : 'bg-green-400 dark:bg-green-500'
        }`}
        title={
          disabled
            ? 'Cannot toggle: parent is ignored'
            : isIgnored
            ? `Include ${elementName} in generated UI`
            : `Ignore ${elementName} in generated UI`
        }
        data-testid="ignore-toggle-switch"
      >
        <span
          className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
            isIgnored ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
      
      {/* State label */}
      <span
        className={`text-xs font-medium ${
          disabled
            ? 'text-gray-400 dark:text-gray-500'
            : isIgnored
            ? 'text-red-600 dark:text-red-400'
            : 'text-green-600 dark:text-green-400'
        }`}
        data-testid="ignore-toggle-label"
      >
        {isIgnored ? 'ignored' : 'active'}
      </span>
      
      {/* Annotation badge */}
      <AnnotationBadge
        ignoreState={ignoreState}
        elementName={elementName}
      />
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  // Only re-render if these specific props change
  // Requirements: 23.1, 23.4
  return (
    prevProps.elementPath === nextProps.elementPath &&
    prevProps.ignoreState.effective === nextProps.ignoreState.effective &&
    prevProps.ignoreState.source === nextProps.ignoreState.source &&
    prevProps.ignoreState.isOverride === nextProps.ignoreState.isOverride &&
    prevProps.disabled === nextProps.disabled
  );
});

// --- Helper Functions ---

/**
 * Extract the element name from its path
 * 
 * Examples:
 * - "components.schemas.User.properties.email" -> "email"
 * - "paths./users.get" -> "get"
 * - "components.schemas.User" -> "User"
 */
function getElementName(path: string): string {
  const parts = path.split('.');
  return parts[parts.length - 1] || path;
}
