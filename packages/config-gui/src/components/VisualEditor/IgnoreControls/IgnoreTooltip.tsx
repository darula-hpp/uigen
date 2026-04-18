import { useState, useEffect, useRef } from 'react';
import type { IgnoreState } from '../../../types/index.js';

/**
 * Props for IgnoreTooltip component
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
export interface IgnoreTooltipProps {
  /** Current ignore state including explicit, effective, and source information */
  ignoreState: IgnoreState;
  
  /** Element name for contextual messages */
  elementName: string;
  
  /** Whether this is a toggle switch (shows pruning behavior explanation) */
  isToggleSwitch?: boolean;
  
  /** Children element that triggers the tooltip on hover */
  children: React.ReactNode;
}

/**
 * IgnoreTooltip component provides rich contextual information on hover.
 * 
 * Features:
 * - 300ms hover delay before showing tooltip
 * - Contextual messages for explicit ignores
 * - Contextual messages for inherited state with parent name
 * - Contextual messages for overrides
 * - Pruning behavior explanation for toggle switches
 * - Accessible with proper ARIA attributes
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 * 
 * Usage:
 * ```tsx
 * <IgnoreTooltip
 *   ignoreState={state}
 *   elementName="email"
 *   isToggleSwitch={true}
 * >
 *   <button>Toggle</button>
 * </IgnoreTooltip>
 * ```
 */
export function IgnoreTooltip({
  ignoreState,
  elementName,
  isToggleSwitch = false,
  children
}: IgnoreTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Handle mouse enter with 300ms delay
  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, 300);
  };
  
  // Handle mouse leave
  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  // Get tooltip message based on ignore state
  const message = getTooltipMessage(ignoreState, elementName, isToggleSwitch);
  
  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-testid="ignore-tooltip-container"
    >
      {children}
      
      {isVisible && (
        <div
          role="tooltip"
          className="absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 dark:bg-gray-700 rounded-lg shadow-lg whitespace-normal max-w-xs bottom-full left-1/2 transform -translate-x-1/2 mb-2"
          data-testid="ignore-tooltip"
        >
          {message}
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
            <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
          </div>
        </div>
      )}
    </div>
  );
}

// --- Helper Functions ---

/**
 * Get tooltip message based on ignore state
 * 
 * Requirements: 4.2, 4.3, 4.4, 4.5
 */
function getTooltipMessage(
  ignoreState: IgnoreState,
  elementName: string,
  isToggleSwitch: boolean
): string {
  // Override message (Requirement 4.4)
  if (ignoreState.isOverride && ignoreState.inheritedFrom) {
    const parentName = getElementName(ignoreState.inheritedFrom);
    return `Included despite parent ${parentName} being ignored (override)`;
  }
  
  // Explicit ignore message (Requirement 4.2)
  if (ignoreState.source === 'explicit' && ignoreState.effective === true) {
    const baseMessage = 'Explicitly ignored by annotation on this element';
    
    // Add pruning behavior explanation for toggle switches (Requirement 4.5)
    if (isToggleSwitch) {
      return `${baseMessage}. Ignoring this element will also exclude all nested children from processing`;
    }
    
    return baseMessage;
  }
  
  // Inherited ignore message (Requirement 4.3)
  if (ignoreState.source === 'inherited' && ignoreState.inheritedFrom) {
    const parentName = getElementName(ignoreState.inheritedFrom);
    return `Ignored because parent ${parentName} is ignored`;
  }
  
  // Active state with pruning explanation for toggle switches (Requirement 4.5)
  if (isToggleSwitch && ignoreState.effective === false) {
    return 'Ignoring this element will also exclude all nested children from processing';
  }
  
  // Default message for active elements
  if (ignoreState.effective === false) {
    return `${elementName} is included in the generated UI`;
  }
  
  // Fallback message
  return `${elementName} is ignored`;
}

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
