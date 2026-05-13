import { describe, it, expect, beforeEach, vi } from 'vitest';
import { iconResolver, ICON_REF_REGEX } from '../icon-resolver';
import type { IconComponentProps } from '../icon-resolver';

describe('IconResolver', () => {
  beforeEach(() => {
    // Clear cache before each test
    iconResolver.clearCache();
    
    // Clear console spies
    vi.clearAllMocks();
  });

  describe('isValidFormat', () => {
    it('should return true for valid Lucide icon reference', () => {
      expect(iconResolver.isValidFormat('lucide:FileText')).toBe(true);
    });

    it('should return true for valid Heroicons icon reference', () => {
      expect(iconResolver.isValidFormat('heroicons:CpuChipIcon')).toBe(true);
    });

    it('should return true for valid React Icons reference', () => {
      expect(iconResolver.isValidFormat('react-icons:FaHome')).toBe(true);
    });

    it('should return true for icon names with hyphens', () => {
      expect(iconResolver.isValidFormat('lucide:arrow-right')).toBe(true);
    });

    it('should return true for icon names with underscores', () => {
      expect(iconResolver.isValidFormat('lucide:file_text')).toBe(true);
    });

    it('should return true for case-insensitive library names', () => {
      expect(iconResolver.isValidFormat('LUCIDE:FileText')).toBe(true);
      expect(iconResolver.isValidFormat('Heroicons:CpuChipIcon')).toBe(true);
      expect(iconResolver.isValidFormat('React-Icons:FaHome')).toBe(true);
    });

    it('should return false for invalid format without colon', () => {
      expect(iconResolver.isValidFormat('lucideFileText')).toBe(false);
    });

    it('should return false for invalid format with multiple colons', () => {
      expect(iconResolver.isValidFormat('lucide:File:Text')).toBe(false);
    });

    it('should return false for empty library name', () => {
      expect(iconResolver.isValidFormat(':FileText')).toBe(false);
    });

    it('should return false for empty icon name', () => {
      expect(iconResolver.isValidFormat('lucide:')).toBe(false);
    });

    it('should return false for unsupported library', () => {
      expect(iconResolver.isValidFormat('fontawesome:FaHome')).toBe(false);
    });

    it('should return false for icon names with spaces', () => {
      expect(iconResolver.isValidFormat('lucide:File Text')).toBe(false);
    });

    it('should return false for icon names with special characters', () => {
      expect(iconResolver.isValidFormat('lucide:File@Text')).toBe(false);
      expect(iconResolver.isValidFormat('lucide:File.Text')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(iconResolver.isValidFormat('')).toBe(false);
    });
  });

  describe('parse', () => {
    it('should parse valid Lucide icon reference', () => {
      const result = iconResolver.parse('lucide:FileText');
      expect(result).toEqual({
        library: 'lucide',
        iconName: 'FileText',
      });
    });

    it('should parse valid Heroicons icon reference', () => {
      const result = iconResolver.parse('heroicons:CpuChipIcon');
      expect(result).toEqual({
        library: 'heroicons',
        iconName: 'CpuChipIcon',
      });
    });

    it('should parse valid React Icons reference', () => {
      const result = iconResolver.parse('react-icons:FaHome');
      expect(result).toEqual({
        library: 'react-icons',
        iconName: 'FaHome',
      });
    });

    it('should normalize library name to lowercase', () => {
      const result = iconResolver.parse('LUCIDE:FileText');
      expect(result?.library).toBe('lucide');
    });

    it('should preserve icon name case sensitivity', () => {
      const result = iconResolver.parse('lucide:FileText');
      expect(result?.iconName).toBe('FileText');
      
      const result2 = iconResolver.parse('lucide:filetext');
      expect(result2?.iconName).toBe('filetext');
    });

    it('should parse icon names with hyphens', () => {
      const result = iconResolver.parse('lucide:arrow-right');
      expect(result?.iconName).toBe('arrow-right');
    });

    it('should parse icon names with underscores', () => {
      const result = iconResolver.parse('lucide:file_text');
      expect(result?.iconName).toBe('file_text');
    });

    it('should return null for invalid format', () => {
      expect(iconResolver.parse('lucideFileText')).toBeNull();
      expect(iconResolver.parse('lucide-FileText')).toBeNull();
      expect(iconResolver.parse('')).toBeNull();
    });

    it('should return null for empty library name', () => {
      expect(iconResolver.parse(':FileText')).toBeNull();
    });

    it('should return null for empty icon name', () => {
      expect(iconResolver.parse('lucide:')).toBeNull();
    });

    it('should return null for unsupported library', () => {
      expect(iconResolver.parse('fontawesome:FaHome')).toBeNull();
    });
  });

  describe('resolve', () => {
    it('should resolve valid Lucide icon', async () => {
      const component = await iconResolver.resolve('lucide:FileText');
      expect(component).not.toBeNull();
      // React components can be functions or objects (forwardRef, memo, etc.)
      expect(['function', 'object']).toContain(typeof component);
    });

    it('should resolve valid Heroicons icon', async () => {
      const component = await iconResolver.resolve('heroicons:HomeIcon');
      expect(component).not.toBeNull();
      // React components can be functions or objects (forwardRef, memo, etc.)
      expect(['function', 'object']).toContain(typeof component);
    });

    it('should resolve valid React Icons icon', async () => {
      const component = await iconResolver.resolve('react-icons:FaHome');
      expect(component).not.toBeNull();
      expect(typeof component).toBe('function');
    });

    it('should return null and log warning for invalid format', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const component = await iconResolver.resolve('lucideFileText');
      
      expect(component).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid icon reference format')
      );
      
      warnSpy.mockRestore();
    });

    it('should return null and log warning for unknown library', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // fontawesome is not a supported library, so parse will fail and return null
      const component = await iconResolver.resolve('fontawesome:FaHome');
      
      expect(component).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid icon reference format')
      );
      
      warnSpy.mockRestore();
    });

    it('should return null and log error for unknown Lucide icon name', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const component = await iconResolver.resolve('lucide:NonExistentIcon123');
      
      expect(component).toBeNull();
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Icon "NonExistentIcon123" not found in library "lucide"')
      );
      
      errorSpy.mockRestore();
    });

    it('should return null and log error for unknown Heroicons icon name', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const component = await iconResolver.resolve('heroicons:NonExistentIcon123');
      
      expect(component).toBeNull();
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Icon "NonExistentIcon123" not found in library "heroicons"')
      );
      
      errorSpy.mockRestore();
    });

    it('should return null and log error for unknown React Icons icon name', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const component = await iconResolver.resolve('react-icons:XxNonExistent');
      
      expect(component).toBeNull();
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Icon "XxNonExistent" not found in library "react-icons"')
      );
      
      errorSpy.mockRestore();
    });

    it('should handle case-insensitive library matching', async () => {
      const component1 = await iconResolver.resolve('LUCIDE:FileText');
      const component2 = await iconResolver.resolve('lucide:FileText');
      
      expect(component1).not.toBeNull();
      expect(component2).not.toBeNull();
      expect(component1).toBe(component2); // Should be same cached component
    });

    it('should handle case-sensitive icon name matching', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // FileText exists, but filetext does not
      const component1 = await iconResolver.resolve('lucide:FileText');
      const component2 = await iconResolver.resolve('lucide:filetext');
      
      expect(component1).not.toBeNull();
      expect(component2).toBeNull();
      
      errorSpy.mockRestore();
    });
  });

  describe('caching', () => {
    it('should cache resolved icon components', async () => {
      // First resolution
      const component1 = await iconResolver.resolve('lucide:FileText');
      
      // Second resolution should return cached component
      const component2 = await iconResolver.resolve('lucide:FileText');
      
      expect(component1).toBe(component2);
    });

    it('should return cached component on cache hit', async () => {
      // Resolve once to populate cache
      const component1 = await iconResolver.resolve('lucide:FileText');
      
      // Resolve again - should use cache (same reference)
      const component2 = await iconResolver.resolve('lucide:FileText');
      
      expect(component1).not.toBeNull();
      expect(component2).not.toBeNull();
      // Should be the exact same cached instance
      expect(component1).toBe(component2);
    });

    it('should trigger dynamic import on cache miss', async () => {
      // Clear cache to ensure miss
      iconResolver.clearCache();
      
      // First resolution should trigger import
      const component = await iconResolver.resolve('lucide:Home');
      
      expect(component).not.toBeNull();
    });

    it('should cache different icons separately', async () => {
      const component1 = await iconResolver.resolve('lucide:FileText');
      const component2 = await iconResolver.resolve('lucide:Home');
      
      expect(component1).not.toBeNull();
      expect(component2).not.toBeNull();
      expect(component1).not.toBe(component2);
    });

    it('should cache icons from different libraries separately', async () => {
      const lucideComponent = await iconResolver.resolve('lucide:HomeIcon');
      const heroiconsComponent = await iconResolver.resolve('heroicons:HomeIcon');
      
      expect(lucideComponent).not.toBeNull();
      expect(heroiconsComponent).not.toBeNull();
      // These should be different components from different libraries
      expect(lucideComponent).not.toBe(heroiconsComponent);
    });

    it('should not cache failed resolutions', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // First failed resolution
      const component1 = await iconResolver.resolve('lucide:NonExistent');
      expect(component1).toBeNull();
      
      // Second failed resolution should also return null
      const component2 = await iconResolver.resolve('lucide:NonExistent');
      expect(component2).toBeNull();
      
      // Error should be logged twice (not cached)
      expect(errorSpy).toHaveBeenCalledTimes(2);
      
      errorSpy.mockRestore();
    });
  });

  describe('clearCache', () => {
    it('should remove all cached icons', async () => {
      // Populate cache
      await iconResolver.resolve('lucide:FileText');
      await iconResolver.resolve('lucide:Home');
      await iconResolver.resolve('heroicons:HomeIcon');
      
      // Clear cache
      iconResolver.clearCache();
      
      // Resolve again - should trigger new imports
      const component = await iconResolver.resolve('lucide:FileText');
      expect(component).not.toBeNull();
    });

    it('should allow re-caching after clear', async () => {
      // Populate cache
      const component1 = await iconResolver.resolve('lucide:FileText');
      
      // Clear cache
      iconResolver.clearCache();
      
      // Resolve again - should cache again
      const component2 = await iconResolver.resolve('lucide:FileText');
      const component3 = await iconResolver.resolve('lucide:FileText');
      
      expect(component2).toBe(component3);
    });
  });

  describe('ICON_REF_REGEX', () => {
    it('should match valid icon references', () => {
      expect(ICON_REF_REGEX.test('lucide:FileText')).toBe(true);
      expect(ICON_REF_REGEX.test('heroicons:CpuChipIcon')).toBe(true);
      expect(ICON_REF_REGEX.test('react-icons:FaHome')).toBe(true);
    });

    it('should match case-insensitive library names', () => {
      expect(ICON_REF_REGEX.test('LUCIDE:FileText')).toBe(true);
      expect(ICON_REF_REGEX.test('Heroicons:CpuChipIcon')).toBe(true);
    });

    it('should match icon names with hyphens and underscores', () => {
      expect(ICON_REF_REGEX.test('lucide:arrow-right')).toBe(true);
      expect(ICON_REF_REGEX.test('lucide:file_text')).toBe(true);
      expect(ICON_REF_REGEX.test('lucide:arrow-right-up')).toBe(true);
    });

    it('should not match invalid formats', () => {
      expect(ICON_REF_REGEX.test('lucideFileText')).toBe(false);
      expect(ICON_REF_REGEX.test('lucide-FileText')).toBe(false);
      expect(ICON_REF_REGEX.test(':FileText')).toBe(false);
      expect(ICON_REF_REGEX.test('lucide:')).toBe(false);
      expect(ICON_REF_REGEX.test('')).toBe(false);
    });

    it('should not match unsupported libraries', () => {
      expect(ICON_REF_REGEX.test('fontawesome:FaHome')).toBe(false);
      expect(ICON_REF_REGEX.test('material:MdHome')).toBe(false);
    });

    it('should not match icon names with special characters', () => {
      expect(ICON_REF_REGEX.test('lucide:File@Text')).toBe(false);
      expect(ICON_REF_REGEX.test('lucide:File.Text')).toBe(false);
      expect(ICON_REF_REGEX.test('lucide:File Text')).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle import failures gracefully', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Try to resolve with invalid prefix for react-icons
      const component = await iconResolver.resolve('react-icons:InvalidPrefix');
      
      expect(component).toBeNull();
      expect(errorSpy).toHaveBeenCalled();
      
      errorSpy.mockRestore();
    });

    it('should not throw exceptions on resolution failure', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      await expect(
        iconResolver.resolve('lucide:NonExistent')
      ).resolves.toBeNull();
      
      await expect(
        iconResolver.resolve('invalid:format')
      ).resolves.toBeNull();
      
      errorSpy.mockRestore();
    });

    it('should log descriptive error messages', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      await iconResolver.resolve('lucide:NonExistent');
      
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Icon "NonExistent" not found')
      );
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('library "lucide"')
      );
      
      errorSpy.mockRestore();
    });
  });

  describe('library-specific behavior', () => {
    it('should resolve Lucide icons from lucide-react package', async () => {
      const component = await iconResolver.resolve('lucide:FileText');
      expect(component).not.toBeNull();
      // React components can be functions or objects (forwardRef, memo, etc.)
      expect(['function', 'object']).toContain(typeof component);
    });

    it('should resolve Heroicons from @heroicons/react/24/outline', async () => {
      const component = await iconResolver.resolve('heroicons:HomeIcon');
      expect(component).not.toBeNull();
      // React components can be functions or objects (forwardRef, memo, etc.)
      expect(['function', 'object']).toContain(typeof component);
    });

    it('should resolve React Icons with correct prefix extraction', async () => {
      // FaHome should extract "fa" prefix
      const component = await iconResolver.resolve('react-icons:FaHome');
      expect(component).not.toBeNull();
      expect(typeof component).toBe('function');
    });

    it('should handle React Icons with different prefixes', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // MdHome should extract "md" prefix
      const mdComponent = await iconResolver.resolve('react-icons:MdHome');
      expect(mdComponent).not.toBeNull();
      
      // BiHome should extract "bi" prefix
      const biComponent = await iconResolver.resolve('react-icons:BiHome');
      expect(biComponent).not.toBeNull();
      
      errorSpy.mockRestore();
    });
  });
});
