import React from 'react';
import { ShieldCheck } from 'lucide-react';

/**
 * OverrideButton Component
 * 
 * Displays an "Override" button for children of ignored parents, allowing users
 * to explicitly include a child element even when its parent is ignored.
 * 
 * Requirements: 3.3, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5
 */

export interface OverrideButtonProps {
  /** Path of the element in the spec */
  elementPath: string;
  
  /** Name of the element for display */
  elementName: string;
  
  /** Name of the parent element causing the inherited ignore state */
  parentName: string;
  
  /** Whether the element currently has an override annotation */
  hasOverride: boolean;
  
  /** Callback when override button is clicked */
  onOverride: () => void;
}

/**
 * OverrideButton component allows users to override parent-level ignore annotations.
 * 
 * Features:
 * - Displays "Override" button for children of ignored parents
 * - Sets x-uigen-ignore: false when clicked
 * - Shows visual feedback with icon and color
 * - Provides clear tooltip explaining the action
 * - Accessible with keyboard support
 * 
 * Requirements: 3.3, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5
 * 
 * Usage:
 * ```tsx
 * <OverrideButton
 *   elementPath="components.schemas.User.properties.email"
 *   elementName="email"
 *   parentName="User"
 *   hasOverride={false}
 *   onOverride={() => handleOverride()}
 * />
 * ```
 */
export function OverrideButton({
  elementPath,
  elementName,
  parentName,
  hasOverride,
  onOverride
}: OverrideButtonProps) {
  const handleClick = () => {
    onOverride();
  };
  
  return (
    <button
      onClick={handleClick}
      className={`
        inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium
        transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1
        ${
          hasOverride
            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 focus:ring-blue-400'
            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 focus:ring-gray-400'
        }
      `}
      title={
        hasOverride
          ? `Remove override for ${elementName} (will inherit ignored state from ${parentName})`
          : `Override parent ignore and include ${elementName} in generated UI`
      }
      aria-label={
        hasOverride
          ? `Remove override for ${elementName}`
          : `Override parent ignore for ${elementName}`
      }
      data-testid="override-button"
      data-element-path={elementPath}
    >
      <ShieldCheck className="w-3 h-3" />
      <span>{hasOverride ? 'Remove Override' : 'Override'}</span>
    </button>
  );
}
