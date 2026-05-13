import React from 'react';

/**
 * Props interface for icon components from various libraries
 */
export interface IconComponentProps {
  size?: number | string;
  className?: string;
  color?: string;
  strokeWidth?: number;
  [key: string]: unknown;
}

/**
 * Icon reference validation regex
 * Format: library:iconName
 * - library: lucide, heroicons, or react-icons (case-insensitive)
 * - iconName: alphanumeric, hyphens, underscores (case-sensitive)
 */
export const ICON_REF_REGEX = /^(lucide|heroicons|react-icons):[\w-]+$/i;

/**
 * Icon resolver interface for converting icon references to React components
 */
export interface IconResolver {
  /**
   * Resolves an icon reference to a React component
   * @param iconRef Icon reference string (e.g., "lucide:FileText")
   * @returns Promise resolving to React component or null
   */
  resolve(iconRef: string): Promise<React.ComponentType<IconComponentProps> | null>;

  /**
   * Checks if an icon reference is valid format
   * @param iconRef Icon reference string
   * @returns true if valid format
   */
  isValidFormat(iconRef: string): boolean;

  /**
   * Parses icon reference into library and icon name
   * @param iconRef Icon reference string
   * @returns Parsed components or null
   */
  parse(iconRef: string): { library: string; iconName: string } | null;

  /**
   * Clears the icon cache
   */
  clearCache(): void;
}

/**
 * In-memory cache for resolved icon components
 * Key: full icon reference string (e.g., "lucide:FileText")
 * Value: resolved React component
 */
const iconCache = new Map<string, React.ComponentType<IconComponentProps>>();

/**
 * Library-specific icon resolvers
 */
const libraryResolvers: Record<
  string,
  (iconName: string) => Promise<React.ComponentType<IconComponentProps> | null>
> = {
  lucide: async (iconName: string) => {
    try {
      const module = await import('lucide-react');
      const IconComponent = (module as Record<string, unknown>)[iconName];
      // React components can be functions or objects (forwardRef, memo, etc.)
      if (IconComponent && (typeof IconComponent === 'function' || typeof IconComponent === 'object')) {
        return IconComponent as React.ComponentType<IconComponentProps>;
      }
      return null;
    } catch (error) {
      console.error(`Failed to import Lucide icon "${iconName}":`, error);
      return null;
    }
  },

  heroicons: async (iconName: string) => {
    try {
      // Default to outline style (24x24)
      const module = await import('@heroicons/react/24/outline');
      const IconComponent = (module as Record<string, unknown>)[iconName];
      // React components can be functions or objects (forwardRef, memo, etc.)
      if (IconComponent && (typeof IconComponent === 'function' || typeof IconComponent === 'object')) {
        return IconComponent as React.ComponentType<IconComponentProps>;
      }
      return null;
    } catch (error) {
      console.error(`Failed to import Heroicons icon "${iconName}":`, error);
      return null;
    }
  },

  'react-icons': async (iconName: string) => {
    try {
      // Extract prefix (e.g., "Fa" from "FaHome")
      const prefix = iconName.substring(0, 2).toLowerCase();
      const module = await import(`react-icons/${prefix}`);
      const IconComponent = (module as Record<string, unknown>)[iconName];
      if (IconComponent && typeof IconComponent === 'function') {
        return IconComponent as React.ComponentType<IconComponentProps>;
      }
      return null;
    } catch (error) {
      console.error(`Failed to import React Icons icon "${iconName}":`, error);
      return null;
    }
  },
};

/**
 * Default icon resolver implementation
 */
class DefaultIconResolver implements IconResolver {
  /**
   * Checks if an icon reference matches the valid format
   */
  isValidFormat(iconRef: string): boolean {
    return ICON_REF_REGEX.test(iconRef);
  }

  /**
   * Parses an icon reference into library and icon name components
   */
  parse(iconRef: string): { library: string; iconName: string } | null {
    if (!this.isValidFormat(iconRef)) {
      return null;
    }

    const match = iconRef.match(ICON_REF_REGEX);
    if (!match) {
      return null;
    }

    const [library, ...rest] = iconRef.split(':');
    const iconName = rest.join(':'); // Handle edge case of colons in icon name

    return {
      library: library.toLowerCase(), // Case-insensitive library matching
      iconName: iconName, // Case-sensitive icon name
    };
  }

  /**
   * Resolves an icon reference to a React component
   */
  async resolve(iconRef: string): Promise<React.ComponentType<IconComponentProps> | null> {
    // Check cache first
    const cached = iconCache.get(iconRef);
    if (cached) {
      return cached;
    }

    // Parse icon reference
    const parsed = this.parse(iconRef);
    if (!parsed) {
      console.warn(
        `Invalid icon reference format: "${iconRef}". Expected format: "library:iconName"`
      );
      return null;
    }

    const { library, iconName } = parsed;

    // Check if library is supported
    const resolver = libraryResolvers[library];
    if (!resolver) {
      console.error(
        `Unknown icon library: "${library}". Supported libraries: lucide, heroicons, react-icons`
      );
      return null;
    }

    // Resolve icon component
    try {
      const component = await resolver(iconName);
      if (!component) {
        console.error(
          `Icon "${iconName}" not found in library "${library}". Please check the icon name.`
        );
        return null;
      }

      // Cache the resolved component
      iconCache.set(iconRef, component);
      return component;
    } catch (error) {
      console.error(`Failed to resolve icon "${iconRef}":`, error);
      return null;
    }
  }

  /**
   * Clears all cached icon components
   */
  clearCache(): void {
    iconCache.clear();
  }
}

/**
 * Singleton instance of the icon resolver
 */
export const iconResolver: IconResolver = new DefaultIconResolver();
