import React from 'react';
import { HelpCircle } from 'lucide-react';

/**
 * Props for the FallbackIcon component
 */
export interface FallbackIconProps {
  /** Icon size in pixels (default: 24) */
  size?: number | string;
  
  /** CSS class name */
  className?: string;
  
  /** Icon color */
  color?: string;
  
  /** Accessibility label */
  ariaLabel?: string;
}

/**
 * FallbackIcon component
 * 
 * Renders a default fallback icon (circle with question mark) when icon resolution fails.
 * Uses Lucide's HelpCircle icon for consistency with the icon library system.
 * 
 * @param props - FallbackIcon props
 * @returns React component rendering a fallback icon
 */
export const FallbackIcon: React.FC<FallbackIconProps> = ({
  size = 24,
  className = '',
  color,
  ariaLabel,
}) => {
  // Build style object for color if provided
  const style = color ? { color } : undefined;
  
  // Build accessibility attributes
  const accessibilityProps: {
    'aria-label'?: string;
    'aria-hidden'?: boolean;
    role?: string;
  } = {};
  
  if (ariaLabel) {
    // Semantic icon: provide aria-label and role="img"
    accessibilityProps['aria-label'] = ariaLabel;
    accessibilityProps.role = 'img';
  } else {
    // Decorative icon: hide from screen readers
    accessibilityProps['aria-hidden'] = true;
  }
  
  return (
    <HelpCircle
      size={size}
      className={className}
      style={style}
      {...accessibilityProps}
    />
  );
};
