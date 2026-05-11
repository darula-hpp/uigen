import React from 'react';
import type { OAuthProvider } from '@uigen-dev/core';
import { getProviderMetadata } from '@/lib/oauth-providers';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { cn } from '@/lib/utils';

/**
 * Props for OAuthButton component
 */
export interface OAuthButtonProps {
  /** OAuth provider configuration */
  provider: OAuthProvider;
  /** Callback invoked when button is clicked */
  onInitiate: (provider: OAuthProvider) => void;
  /** Whether the button is in loading state */
  loading?: boolean;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * OAuthButton component with provider-specific styling
 * 
 * Renders a button for OAuth authentication with:
 * - Provider-specific brand colors
 * - Provider logo (SVG, minimum 20px × 20px)
 * - Provider display name (e.g., "Continue with Google")
 * - Height 44px and consistent styling
 * - Loading spinner when loading prop is true
 * - Disabled state when disabled prop is true
 * - Support for light and dark theme variants
 * - WCAG AA contrast ratios
 * 
 * Requirements:
 * - 5.1: Render OAuth provider buttons
 * - 5.2: Provider-specific styling
 * - 5.5: Loading and disabled states
 * - 9.1-9.9: Provider branding and accessibility
 */
export function OAuthButton({
  provider,
  onInitiate,
  loading = false,
  disabled = false,
  className
}: OAuthButtonProps) {
  const metadata = getProviderMetadata(provider.provider);

  if (!metadata) {
    console.error(`Unknown OAuth provider: ${provider.provider}`);
    return null;
  }

  const handleClick = () => {
    if (!loading && !disabled) {
      onInitiate(provider);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      className={cn(
        // Base styles
        'relative flex items-center justify-center gap-3 w-full h-[44px] rounded-md',
        'text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        // Disabled state
        'disabled:pointer-events-none disabled:opacity-50',
        // Provider-specific colors with proper contrast
        'border border-input',
        className
      )}
      style={{
        backgroundColor: 'var(--oauth-button-bg, hsl(var(--background)))',
        color: 'var(--oauth-button-text, hsl(var(--foreground)))',
        '--oauth-button-bg': metadata.brandColor,
        '--oauth-button-text': getContrastColor(metadata.brandColor),
      } as React.CSSProperties}
      aria-label={`Continue with ${metadata.displayName}`}
      data-provider={provider.provider}
    >
      {/* Provider Logo */}
      {!loading && (
        <img
          src={metadata.logoUrl}
          alt={`${metadata.displayName} logo`}
          className="h-5 w-5 flex-shrink-0"
          style={{
            filter: shouldInvertLogo(metadata.brandColor) ? 'invert(1)' : 'none'
          }}
        />
      )}

      {/* Loading Spinner */}
      {loading && (
        <div className="absolute left-4">
          <LoadingSpinner size="sm" />
        </div>
      )}

      {/* Button Text */}
      <span className={cn(loading && 'opacity-70')}>
        Continue with {metadata.displayName}
      </span>
    </button>
  );
}

/**
 * Determine text color based on background color for WCAG AA contrast
 * @param bgColor Background color in hex format
 * @returns 'white' or 'black' for optimal contrast
 */
function getContrastColor(bgColor: string): string {
  // Remove # if present
  const hex = bgColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Calculate relative luminance (WCAG formula)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return white for dark backgrounds, black for light backgrounds
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

/**
 * Determine if logo should be inverted based on background color
 * @param bgColor Background color in hex format
 * @returns true if logo should be inverted
 */
function shouldInvertLogo(bgColor: string): boolean {
  // Remove # if present
  const hex = bgColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Invert logo for dark backgrounds
  return luminance < 0.5;
}
