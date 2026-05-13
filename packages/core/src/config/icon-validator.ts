/**
 * Icon Validator Module
 * 
 * Validates icon references in config files and provides suggestions for invalid icons.
 * Icon references use the format "library:iconName" where library is one of:
 * - lucide
 * - heroicons
 * - react-icons
 * 
 * @example
 * ```typescript
 * const validator = new IconValidator();
 * const isValid = validator.validate('lucide:FileText');
 * const suggestions = validator.suggest('lucide:FileTxt');
 * ```
 */

/**
 * Icon reference validation regex pattern
 * Format: library:iconName
 * - library: case-insensitive, one of: lucide, heroicons, react-icons
 * - iconName: case-sensitive, alphanumeric with hyphens and underscores
 */
const ICON_REF_REGEX = /^(lucide|heroicons|react-icons):[\w-]+$/i;

/**
 * Supported icon libraries
 */
const SUPPORTED_LIBRARIES = ['lucide', 'heroicons', 'react-icons'] as const;

/**
 * Type for supported icon library identifiers
 */
export type IconLibrary = typeof SUPPORTED_LIBRARIES[number];

/**
 * Interface for the IconValidator
 */
export interface IIconValidator {
  /**
   * Validates an icon reference string
   * @param icon Icon reference to validate (e.g., "lucide:FileText")
   * @returns true if valid format, false otherwise
   */
  validate(icon: string): boolean;

  /**
   * Provides suggestions for invalid icon references
   * @param icon Invalid icon reference
   * @returns Array of suggestion strings
   */
  suggest(icon: string): string[];
}

/**
 * IconValidator implementation
 * 
 * Validates icon references and provides helpful suggestions for invalid references.
 */
export class IconValidator implements IIconValidator {
  /**
   * Validates an icon reference string
   * 
   * Checks if the icon reference matches the expected format "library:iconName"
   * and validates that the library is one of the supported libraries.
   * 
   * @param icon Icon reference to validate (e.g., "lucide:FileText")
   * @returns true if valid format, false otherwise
   * 
   * @example
   * ```typescript
   * const validator = new IconValidator();
   * validator.validate('lucide:FileText'); // true
   * validator.validate('invalid'); // false
   * validator.validate('unknown:Icon'); // false
   * ```
   */
  validate(icon: string): boolean {
    if (!icon || typeof icon !== 'string') {
      return false;
    }

    // Check if format matches the regex pattern
    if (!ICON_REF_REGEX.test(icon)) {
      return false;
    }

    // Extract library identifier
    const colonIndex = icon.indexOf(':');
    if (colonIndex === -1) {
      return false;
    }

    const library = icon.substring(0, colonIndex).toLowerCase();
    const iconName = icon.substring(colonIndex + 1);

    // Validate library is supported
    if (!SUPPORTED_LIBRARIES.includes(library as IconLibrary)) {
      return false;
    }

    // Validate icon name is not empty
    if (!iconName || iconName.trim().length === 0) {
      return false;
    }

    return true;
  }

  /**
   * Provides suggestions for invalid icon references
   * 
   * Analyzes the invalid icon reference and provides helpful suggestions:
   * - If format is invalid, suggests correct format examples
   * - If library is unknown, suggests valid libraries
   * - Returns array of suggestion strings
   * 
   * @param icon Invalid icon reference
   * @returns Array of suggestion strings
   * 
   * @example
   * ```typescript
   * const validator = new IconValidator();
   * validator.suggest('invalid'); 
   * // ['Use format: "library:iconName"', 'Example: "lucide:FileText"']
   * 
   * validator.suggest('unknown:Icon');
   * // ['Unknown library "unknown"', 'Valid libraries: lucide, heroicons, react-icons']
   * ```
   */
  suggest(icon: string): string[] {
    const suggestions: string[] = [];

    if (!icon || typeof icon !== 'string') {
      suggestions.push('Icon reference must be a non-empty string');
      suggestions.push('Use format: "library:iconName"');
      suggestions.push('Example: "lucide:FileText"');
      return suggestions;
    }

    // Check if it contains a colon
    if (!icon.includes(':')) {
      suggestions.push('Invalid format: missing colon separator');
      suggestions.push('Use format: "library:iconName"');
      suggestions.push('Example: "lucide:FileText"');
      return suggestions;
    }

    const colonIndex = icon.indexOf(':');
    const library = icon.substring(0, colonIndex).toLowerCase();
    const iconName = icon.substring(colonIndex + 1);

    // Check if library is valid
    if (!SUPPORTED_LIBRARIES.includes(library as IconLibrary)) {
      suggestions.push(`Unknown library "${library}"`);
      suggestions.push(`Valid libraries: ${SUPPORTED_LIBRARIES.join(', ')}`);
      suggestions.push('Example: "lucide:FileText"');
      return suggestions;
    }

    // Check if icon name is empty
    if (!iconName || iconName.trim().length === 0) {
      suggestions.push('Icon name cannot be empty');
      suggestions.push(`Use format: "${library}:iconName"`);
      suggestions.push(`Example: "${library}:FileText"`);
      return suggestions;
    }

    // Check if icon name contains invalid characters
    if (!/^[\w-]+$/.test(iconName)) {
      suggestions.push('Icon name contains invalid characters');
      suggestions.push('Icon name must contain only letters, numbers, hyphens, and underscores');
      suggestions.push(`Example: "${library}:FileText"`);
      return suggestions;
    }

    // If we get here, the format is valid but might not match regex for other reasons
    suggestions.push('Icon reference format appears valid');
    suggestions.push('Check that the icon name exists in the specified library');
    suggestions.push(`Example: "${library}:FileText"`);
    return suggestions;
  }
}

/**
 * Singleton instance of IconValidator
 * 
 * Use this instance for icon validation throughout the application.
 * 
 * @example
 * ```typescript
 * import { iconValidator } from './icon-validator';
 * 
 * if (iconValidator.validate('lucide:FileText')) {
 *   console.log('Valid icon reference');
 * } else {
 *   const suggestions = iconValidator.suggest('lucide:FileText');
 *   console.log('Suggestions:', suggestions);
 * }
 * ```
 */
export const iconValidator = new IconValidator();
