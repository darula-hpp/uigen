import React, { useState, useEffect } from 'react';
import { iconResolver } from '../lib/icon-resolver';
import type { IconComponentProps } from '../lib/icon-resolver';
import { FallbackIcon } from './FallbackIcon';

/**
 * Props for the Icon component
 */
export interface IconProps {
  /** Icon reference string (e.g., "lucide:FileText") or emoji */
  icon: string;
  
  /** Icon size in pixels (default: 24) */
  size?: number | string;
  
  /** CSS class name */
  className?: string;
  
  /** Icon color */
  color?: string;
  
  /** Accessibility label */
  ariaLabel?: string;
  
  /** Additional props passed to icon component */
  [key: string]: unknown;
}

/**
 * Singleton IconResolver instance
 * Created outside component to ensure single instance across all Icon components
 */
const resolver = iconResolver;

/**
 * Icon component
 * 
 * Reusable component that resolves icon references to React components.
 * Supports icon references in the format "library:iconName" (e.g., "lucide:FileText").
 * 
 * Features:
 * - Dynamic icon resolution from multiple libraries (Lucide, Heroicons, React Icons)
 * - Automatic caching for performance
 * - Graceful fallback for invalid icon references
 * - Accessibility support with aria-label
 * - Customizable size, color, and className
 * 
 * @param props - Icon props
 * @returns React component rendering the resolved icon or fallback
 */
export const Icon: React.FC<IconProps> = ({
  icon,
  size = 24,
  className = 'uigen-icon',
  color,
  ariaLabel,
  ...rest
}) => {
  // State for resolved icon component
  const [resolvedIcon, setResolvedIcon] = useState<React.ComponentType<IconComponentProps> | null>(null);
  
  // State for loading status
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Effect to resolve icon when icon prop changes
  useEffect(() => {
    // Track if component is mounted to prevent state updates after unmount
    let isMounted = true;

    // Reset state when icon changes
    setIsLoading(true);
    setResolvedIcon(null);

    // Async function to resolve icon
    const resolveIcon = async () => {
      try {
        // Call resolver to resolve icon reference
        const component = await resolver.resolve(icon);
        
        // Only update state if component is still mounted
        if (isMounted) {
          // Set resolved icon (null will trigger fallback in rendering logic)
          setResolvedIcon(component);
          // Set loading to false after resolution completes
          setIsLoading(false);
        }
      } catch (error) {
        // Handle errors gracefully - set resolvedIcon to null (will trigger fallback)
        console.error(`Error resolving icon "${icon}":`, error);
        if (isMounted) {
          setResolvedIcon(null);
          setIsLoading(false);
        }
      }
    };

    // Start icon resolution
    resolveIcon();

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, [icon]); // Depend on icon prop - re-run when icon changes

  // Rendering logic
  
  // Return null if icon prop is null or undefined
  if (!icon) {
    return null;
  }
  
  // Show loading state while isLoading is true (simple approach: return null)
  // Could be replaced with a loading indicator if desired
  if (isLoading) {
    return null;
  }
  
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
  
  // Render FallbackIcon when resolvedIcon is null (resolution failed)
  if (!resolvedIcon) {
    return (
      <FallbackIcon
        size={size}
        className={className}
        color={color}
        ariaLabel={ariaLabel}
      />
    );
  }
  
  // Render resolved icon component when available
  const ResolvedIconComponent = resolvedIcon;
  
  return (
    <ResolvedIconComponent
      size={size}
      className={className}
      color={color || 'currentColor'}
      {...accessibilityProps}
      {...rest}
    />
  );
};
