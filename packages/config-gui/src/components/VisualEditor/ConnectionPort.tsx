import React, { useRef, useEffect } from 'react';

/**
 * Props for the ConnectionPort component
 */
export interface ConnectionPortProps {
  /** Path to the field this port connects from (e.g., "users.departmentId") */
  fieldPath: string;
  /** Handler called when user initiates a connection drag */
  onMouseDown: (fieldPath: string, e: React.MouseEvent) => void;
  /** Optional callback to register the port element for line positioning */
  onRegisterRef?: (fieldPath: string, el: HTMLElement | null) => void;
}

/**
 * ConnectionPort - Visual connection point for field-to-resource links
 * 
 * Renders a small circular port indicator on the right edge of field rows.
 * Users can click and drag from this port to create ref links to resource cards.
 * 
 * Features:
 * - 12px circular dot with indigo color
 * - Scales to 16px on hover with smooth animation
 * - Crosshair cursor to indicate drag-to-connect functionality
 * - White border for contrast against dark backgrounds
 * 
 * @param props - Component props
 * @returns ConnectionPort component
 */
export const ConnectionPort: React.FC<ConnectionPortProps> = ({
  fieldPath,
  onMouseDown,
  onRegisterRef,
}) => {
  const portRef = useRef<HTMLDivElement>(null);

  // Register the port element when it mounts/unmounts
  useEffect(() => {
    if (onRegisterRef && portRef.current) {
      onRegisterRef(fieldPath, portRef.current);
      return () => {
        onRegisterRef(fieldPath, null);
      };
    }
  }, [fieldPath, onRegisterRef]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering parent handlers
    onMouseDown(fieldPath, e);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Support Enter and Space keys to activate connection
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      e.stopPropagation();
      // Create a synthetic mouse event for consistency with drag behavior
      const syntheticEvent = {
        ...e,
        clientX: 0,
        clientY: 0,
        button: 0,
      } as unknown as React.MouseEvent;
      onMouseDown(fieldPath, syntheticEvent);
    }
  };

  return (
    <div
      ref={portRef}
      className="w-3 h-3 rounded-full bg-indigo-400 border-2 border-white dark:border-gray-800 cursor-crosshair hover:bg-indigo-600 hover:scale-125 transition-all duration-150 flex-shrink-0"
      onMouseDown={handleMouseDown}
      onKeyDown={handleKeyDown}
      aria-label={`Connect from ${fieldPath}`}
      role="button"
      tabIndex={0}
    />
  );
};
