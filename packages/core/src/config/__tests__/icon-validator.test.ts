/**
 * Unit tests for Icon Validator
 */

import { describe, it, expect } from 'vitest';
import { IconValidator, iconValidator } from '../icon-validator.js';

describe('IconValidator', () => {
  const validator = new IconValidator();

  describe('validate', () => {
    describe('valid icon references', () => {
      it('should validate lucide icon reference', () => {
        expect(validator.validate('lucide:FileText')).toBe(true);
      });

      it('should validate heroicons icon reference', () => {
        expect(validator.validate('heroicons:CpuChip')).toBe(true);
      });

      it('should validate react-icons icon reference', () => {
        expect(validator.validate('react-icons:FaHome')).toBe(true);
      });

      it('should validate icon names with hyphens', () => {
        expect(validator.validate('lucide:arrow-right')).toBe(true);
        expect(validator.validate('heroicons:arrow-down')).toBe(true);
      });

      it('should validate icon names with underscores', () => {
        expect(validator.validate('lucide:file_text')).toBe(true);
        expect(validator.validate('react-icons:Fa_Home')).toBe(true);
      });

      it('should validate icon names with numbers', () => {
        expect(validator.validate('lucide:Icon24')).toBe(true);
        expect(validator.validate('heroicons:Icon2')).toBe(true);
      });

      it('should validate mixed case icon names', () => {
        expect(validator.validate('lucide:FileText')).toBe(true);
        expect(validator.validate('lucide:filetext')).toBe(true);
        expect(validator.validate('lucide:FILETEXT')).toBe(true);
      });

      it('should be case-insensitive for library identifier', () => {
        expect(validator.validate('Lucide:FileText')).toBe(true);
        expect(validator.validate('LUCIDE:FileText')).toBe(true);
        expect(validator.validate('LuCiDe:FileText')).toBe(true);
        expect(validator.validate('HEROICONS:CpuChip')).toBe(true);
        expect(validator.validate('React-Icons:FaHome')).toBe(true);
      });
    });

    describe('invalid icon references', () => {
      it('should reject empty string', () => {
        expect(validator.validate('')).toBe(false);
      });

      it('should reject null', () => {
        expect(validator.validate(null as any)).toBe(false);
      });

      it('should reject undefined', () => {
        expect(validator.validate(undefined as any)).toBe(false);
      });

      it('should reject non-string values', () => {
        expect(validator.validate(123 as any)).toBe(false);
        expect(validator.validate({} as any)).toBe(false);
        expect(validator.validate([] as any)).toBe(false);
      });

      it('should reject icon reference without colon', () => {
        expect(validator.validate('lucideFileText')).toBe(false);
        expect(validator.validate('FileText')).toBe(false);
      });

      it('should reject icon reference with unknown library', () => {
        expect(validator.validate('fontawesome:FaHome')).toBe(false);
        expect(validator.validate('material:MdHome')).toBe(false);
        expect(validator.validate('unknown:Icon')).toBe(false);
      });

      it('should reject icon reference with empty library', () => {
        expect(validator.validate(':FileText')).toBe(false);
      });

      it('should reject icon reference with empty icon name', () => {
        expect(validator.validate('lucide:')).toBe(false);
        expect(validator.validate('heroicons:')).toBe(false);
      });

      it('should reject icon reference with whitespace-only icon name', () => {
        expect(validator.validate('lucide:   ')).toBe(false);
        expect(validator.validate('heroicons: ')).toBe(false);
      });

      it('should reject icon names with spaces', () => {
        expect(validator.validate('lucide:File Text')).toBe(false);
        expect(validator.validate('heroicons:Cpu Chip')).toBe(false);
      });

      it('should reject icon names with special characters', () => {
        expect(validator.validate('lucide:File@Text')).toBe(false);
        expect(validator.validate('heroicons:Cpu#Chip')).toBe(false);
        expect(validator.validate('react-icons:Fa$Home')).toBe(false);
        expect(validator.validate('lucide:File.Text')).toBe(false);
      });

      it('should reject icon reference with multiple colons', () => {
        expect(validator.validate('lucide:File:Text')).toBe(false);
      });
    });
  });

  describe('suggest', () => {
    describe('empty or invalid input', () => {
      it('should suggest format for empty string', () => {
        const suggestions = validator.suggest('');
        expect(suggestions).toContain('Icon reference must be a non-empty string');
        expect(suggestions).toContain('Use format: "library:iconName"');
        expect(suggestions).toContain('Example: "lucide:FileText"');
      });

      it('should suggest format for null', () => {
        const suggestions = validator.suggest(null as any);
        expect(suggestions).toContain('Icon reference must be a non-empty string');
        expect(suggestions).toContain('Use format: "library:iconName"');
      });

      it('should suggest format for undefined', () => {
        const suggestions = validator.suggest(undefined as any);
        expect(suggestions).toContain('Icon reference must be a non-empty string');
      });
    });

    describe('missing colon separator', () => {
      it('should suggest format for icon reference without colon', () => {
        const suggestions = validator.suggest('lucideFileText');
        expect(suggestions).toContain('Invalid format: missing colon separator');
        expect(suggestions).toContain('Use format: "library:iconName"');
        expect(suggestions).toContain('Example: "lucide:FileText"');
      });

      it('should suggest format for plain icon name', () => {
        const suggestions = validator.suggest('FileText');
        expect(suggestions).toContain('Invalid format: missing colon separator');
      });
    });

    describe('unknown library', () => {
      it('should suggest valid libraries for unknown library', () => {
        const suggestions = validator.suggest('fontawesome:FaHome');
        expect(suggestions).toContain('Unknown library "fontawesome"');
        expect(suggestions).toContain('Valid libraries: lucide, heroicons, react-icons');
        expect(suggestions).toContain('Example: "lucide:FileText"');
      });

      it('should suggest valid libraries for material library', () => {
        const suggestions = validator.suggest('material:MdHome');
        expect(suggestions).toContain('Unknown library "material"');
        expect(suggestions).toContain('Valid libraries: lucide, heroicons, react-icons');
      });

      it('should handle case-insensitive library names in suggestions', () => {
        const suggestions = validator.suggest('FONTAWESOME:FaHome');
        expect(suggestions).toContain('Unknown library "fontawesome"');
      });
    });

    describe('empty icon name', () => {
      it('should suggest icon name for lucide library', () => {
        const suggestions = validator.suggest('lucide:');
        expect(suggestions).toContain('Icon name cannot be empty');
        expect(suggestions).toContain('Use format: "lucide:iconName"');
        expect(suggestions).toContain('Example: "lucide:FileText"');
      });

      it('should suggest icon name for heroicons library', () => {
        const suggestions = validator.suggest('heroicons:');
        expect(suggestions).toContain('Icon name cannot be empty');
        expect(suggestions).toContain('Use format: "heroicons:iconName"');
      });

      it('should suggest icon name for react-icons library', () => {
        const suggestions = validator.suggest('react-icons:');
        expect(suggestions).toContain('Icon name cannot be empty');
        expect(suggestions).toContain('Use format: "react-icons:iconName"');
      });

      it('should suggest icon name for whitespace-only icon name', () => {
        const suggestions = validator.suggest('lucide:   ');
        expect(suggestions).toContain('Icon name cannot be empty');
      });
    });

    describe('invalid characters in icon name', () => {
      it('should suggest valid characters for icon name with spaces', () => {
        const suggestions = validator.suggest('lucide:File Text');
        expect(suggestions).toContain('Icon name contains invalid characters');
        expect(suggestions).toContain('Icon name must contain only letters, numbers, hyphens, and underscores');
        expect(suggestions).toContain('Example: "lucide:FileText"');
      });

      it('should suggest valid characters for icon name with special characters', () => {
        const suggestions = validator.suggest('heroicons:Cpu@Chip');
        expect(suggestions).toContain('Icon name contains invalid characters');
        expect(suggestions).toContain('Icon name must contain only letters, numbers, hyphens, and underscores');
      });

      it('should suggest valid characters for icon name with dots', () => {
        const suggestions = validator.suggest('react-icons:Fa.Home');
        expect(suggestions).toContain('Icon name contains invalid characters');
      });
    });

    describe('valid format but potentially non-existent icon', () => {
      it('should provide helpful message for valid format', () => {
        // This tests the edge case where format is valid but might not pass regex
        // In practice, this branch is hard to reach, but we test it for completeness
        const suggestions = validator.suggest('lucide:FileText');
        // Since this is actually valid, suggestions should indicate format is valid
        expect(suggestions.length).toBeGreaterThan(0);
      });
    });

    describe('suggestion array properties', () => {
      it('should return array of strings', () => {
        const suggestions = validator.suggest('invalid');
        expect(Array.isArray(suggestions)).toBe(true);
        suggestions.forEach(suggestion => {
          expect(typeof suggestion).toBe('string');
        });
      });

      it('should return non-empty array for invalid input', () => {
        const suggestions = validator.suggest('invalid');
        expect(suggestions.length).toBeGreaterThan(0);
      });

      it('should return multiple suggestions', () => {
        const suggestions = validator.suggest('fontawesome:FaHome');
        expect(suggestions.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('singleton instance', () => {
    it('should export singleton iconValidator instance', () => {
      expect(iconValidator).toBeInstanceOf(IconValidator);
    });

    it('should validate using singleton instance', () => {
      expect(iconValidator.validate('lucide:FileText')).toBe(true);
      expect(iconValidator.validate('invalid')).toBe(false);
    });

    it('should suggest using singleton instance', () => {
      const suggestions = iconValidator.suggest('invalid');
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle very long icon names', () => {
      const longIconName = 'a'.repeat(1000);
      expect(validator.validate(`lucide:${longIconName}`)).toBe(true);
    });

    it('should handle icon names with consecutive hyphens', () => {
      expect(validator.validate('lucide:arrow--right')).toBe(true);
    });

    it('should handle icon names with consecutive underscores', () => {
      expect(validator.validate('lucide:file__text')).toBe(true);
    });

    it('should handle icon names starting with number', () => {
      expect(validator.validate('lucide:24Icon')).toBe(true);
    });

    it('should handle icon names starting with hyphen', () => {
      expect(validator.validate('lucide:-icon')).toBe(true);
    });

    it('should handle icon names starting with underscore', () => {
      expect(validator.validate('lucide:_icon')).toBe(true);
    });

    it('should handle library name with different casing variations', () => {
      expect(validator.validate('lUcIdE:FileText')).toBe(true);
      expect(validator.validate('hErOiCoNs:CpuChip')).toBe(true);
      expect(validator.validate('rEaCt-IcOnS:FaHome')).toBe(true);
    });
  });

  describe('integration scenarios', () => {
    it('should validate and suggest for common migration scenarios', () => {
      // Emoji to icon reference migration
      expect(validator.validate('📄')).toBe(false);
      const suggestions = validator.suggest('📄');
      expect(suggestions).toContain('Invalid format: missing colon separator');
    });

    it('should validate common icon references', () => {
      const commonIcons = [
        'lucide:FileText',
        'lucide:Bot',
        'lucide:PenTool',
        'lucide:Download',
        'lucide:Calendar',
        'lucide:Lock',
        'heroicons:CpuChipIcon',
        'heroicons:DocumentTextIcon',
        'heroicons:UserIcon',
        'react-icons:FaHome',
        'react-icons:FaUser',
        'react-icons:FaCog',
      ];

      commonIcons.forEach(icon => {
        expect(validator.validate(icon)).toBe(true);
      });
    });

    it('should reject common mistakes', () => {
      const commonMistakes = [
        'lucide-FileText', // hyphen instead of colon
        'lucide/FileText', // slash instead of colon
        'lucide.FileText', // dot instead of colon
        'lucide FileText', // space instead of colon
        'lucide::FileText', // double colon
        'fontawesome:FaHome', // wrong library
        'fa:FaHome', // abbreviated library
      ];

      commonMistakes.forEach(icon => {
        expect(validator.validate(icon)).toBe(false);
      });
    });
  });
});
