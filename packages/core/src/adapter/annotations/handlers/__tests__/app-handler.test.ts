import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppHandler } from '../app-handler.js';
import type { AnnotationContext, AdapterUtils } from '../../types.js';
import type { UIGenApp } from '../../../../ir/types.js';

describe('AppHandler', () => {
  let handler: AppHandler;
  let mockUtils: AdapterUtils;
  let mockIR: UIGenApp;

  beforeEach(() => {
    handler = new AppHandler();
    mockUtils = {
      humanize: vi.fn((str: string) => str.charAt(0).toUpperCase() + str.slice(1)),
      resolveRef: vi.fn(),
      logError: vi.fn(),
      logWarning: vi.fn()
    };
    mockIR = {
      resources: [],
      parsingErrors: []
    } as UIGenApp;
  });

  describe('name', () => {
    it('should have the correct annotation name', () => {
      expect(handler.name).toBe('x-uigen-app');
    });
  });

  describe('metadata', () => {
    it('should expose static metadata property', () => {
      expect(AppHandler.metadata).toBeDefined();
    });

    it('should have correct name in metadata', () => {
      expect(AppHandler.metadata.name).toBe('x-uigen-app');
    });

    it('should have targetType "document" in metadata', () => {
      expect(AppHandler.metadata.targetType).toBe('document');
    });

    it('should have complete parameterSchema in metadata', () => {
      expect(AppHandler.metadata.parameterSchema).toBeDefined();
      expect(AppHandler.metadata.parameterSchema.properties).toBeDefined();
      expect(AppHandler.metadata.parameterSchema.properties?.name).toBeDefined();
      expect(AppHandler.metadata.parameterSchema.properties?.icon).toBeDefined();
    });

    it('should have at least 2 examples in metadata', () => {
      expect(AppHandler.metadata.examples).toBeDefined();
      expect(AppHandler.metadata.examples.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('validate', () => {
    describe('name field validation', () => {
      it('should return true when name is not provided (optional field)', () => {
        const annotation = { icon: '/.uigen/assets/logo.svg' };
        const result = handler.validate(annotation);
        expect(result).toBe(true);
        expect(mockUtils.logWarning).not.toHaveBeenCalled();
      });

      it('should return true when name is a valid non-empty string', () => {
        const annotation = { name: 'My Application' };
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        const result = handler.validate(annotation, context);
        expect(result).toBe(true);
        expect(mockUtils.logWarning).not.toHaveBeenCalled();
      });

      it('should log warning when name is an empty string', () => {
        const annotation = { name: '' };
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        const result = handler.validate(annotation, context);
        expect(result).toBe(true); // Still returns true (lenient validation)
        expect(mockUtils.logWarning).toHaveBeenCalledWith(
          'x-uigen-app: name must be a non-empty string'
        );
      });

      it('should log warning when name is a whitespace-only string', () => {
        const annotation = { name: '   ' };
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        const result = handler.validate(annotation, context);
        expect(result).toBe(true); // Still returns true (lenient validation)
        expect(mockUtils.logWarning).toHaveBeenCalledWith(
          'x-uigen-app: name must be a non-empty string'
        );
      });

      it('should log warning when name is a number', () => {
        const annotation = { name: 123 as any };
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        const result = handler.validate(annotation, context);
        expect(result).toBe(true); // Still returns true (lenient validation)
        expect(mockUtils.logWarning).toHaveBeenCalledWith(
          'x-uigen-app: name must be a non-empty string'
        );
      });

      it('should log warning when name is a boolean', () => {
        const annotation = { name: true as any };
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        const result = handler.validate(annotation, context);
        expect(result).toBe(true); // Still returns true (lenient validation)
        expect(mockUtils.logWarning).toHaveBeenCalledWith(
          'x-uigen-app: name must be a non-empty string'
        );
      });

      it('should log warning when name is an object', () => {
        const annotation = { name: { nested: 'value' } as any };
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        const result = handler.validate(annotation, context);
        expect(result).toBe(true); // Still returns true (lenient validation)
        expect(mockUtils.logWarning).toHaveBeenCalledWith(
          'x-uigen-app: name must be a non-empty string'
        );
      });

      it('should log warning when name is an array', () => {
        const annotation = { name: ['value'] as any };
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        const result = handler.validate(annotation, context);
        expect(result).toBe(true); // Still returns true (lenient validation)
        expect(mockUtils.logWarning).toHaveBeenCalledWith(
          'x-uigen-app: name must be a non-empty string'
        );
      });

      it('should log warning when name is null', () => {
        const annotation = { name: null as any };
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        const result = handler.validate(annotation, context);
        expect(result).toBe(true); // Still returns true (lenient validation)
        expect(mockUtils.logWarning).toHaveBeenCalledWith(
          'x-uigen-app: name must be a non-empty string'
        );
      });

      it('should use console.warn when context is not provided', () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const annotation = { name: '' };

        const result = handler.validate(annotation);
        expect(result).toBe(true);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-app: name must be a non-empty string'
        );

        consoleWarnSpy.mockRestore();
      });

      it('should handle validation errors gracefully', () => {
        const annotation = { name: '' }; // Invalid name to trigger logging
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: {
            ...mockUtils,
            logWarning: vi.fn(() => {
              throw new Error('Logging failed');
            })
          },
          ir: mockIR
        };

        // Should not throw, should return false
        const result = handler.validate(annotation, context);
        expect(result).toBe(false);
      });
    });

    describe('icon field validation', () => {
      it('should return true when icon is not provided (optional field)', () => {
        const annotation = { name: 'My Application' };
        const result = handler.validate(annotation);
        expect(result).toBe(true);
        expect(mockUtils.logWarning).not.toHaveBeenCalled();
      });

      it('should return true when icon is a valid non-empty string', () => {
        const annotation = { icon: '/.uigen/assets/logo.svg' };
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        const result = handler.validate(annotation, context);
        expect(result).toBe(true);
        expect(mockUtils.logWarning).not.toHaveBeenCalled();
      });

      it('should log warning when icon is an empty string', () => {
        const annotation = { icon: '' };
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        const result = handler.validate(annotation, context);
        expect(result).toBe(true); // Still returns true (lenient validation)
        expect(mockUtils.logWarning).toHaveBeenCalledWith(
          'x-uigen-app: icon must be a non-empty string'
        );
      });

      it('should log warning when icon is a whitespace-only string', () => {
        const annotation = { icon: '   ' };
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        const result = handler.validate(annotation, context);
        expect(result).toBe(true); // Still returns true (lenient validation)
        expect(mockUtils.logWarning).toHaveBeenCalledWith(
          'x-uigen-app: icon must be a non-empty string'
        );
      });

      it('should log warning when icon is a number', () => {
        const annotation = { icon: 123 as any };
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        const result = handler.validate(annotation, context);
        expect(result).toBe(true); // Still returns true (lenient validation)
        expect(mockUtils.logWarning).toHaveBeenCalledWith(
          'x-uigen-app: icon must be a non-empty string'
        );
      });

      it('should log warning when icon is a boolean', () => {
        const annotation = { icon: true as any };
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        const result = handler.validate(annotation, context);
        expect(result).toBe(true); // Still returns true (lenient validation)
        expect(mockUtils.logWarning).toHaveBeenCalledWith(
          'x-uigen-app: icon must be a non-empty string'
        );
      });

      it('should log warning when icon is an object', () => {
        const annotation = { icon: { nested: 'value' } as any };
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        const result = handler.validate(annotation, context);
        expect(result).toBe(true); // Still returns true (lenient validation)
        expect(mockUtils.logWarning).toHaveBeenCalledWith(
          'x-uigen-app: icon must be a non-empty string'
        );
      });

      it('should log warning when icon is an array', () => {
        const annotation = { icon: ['value'] as any };
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        const result = handler.validate(annotation, context);
        expect(result).toBe(true); // Still returns true (lenient validation)
        expect(mockUtils.logWarning).toHaveBeenCalledWith(
          'x-uigen-app: icon must be a non-empty string'
        );
      });

      it('should log warning when icon is null', () => {
        const annotation = { icon: null as any };
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        const result = handler.validate(annotation, context);
        expect(result).toBe(true); // Still returns true (lenient validation)
        expect(mockUtils.logWarning).toHaveBeenCalledWith(
          'x-uigen-app: icon must be a non-empty string'
        );
      });

      it('should use console.warn when context is not provided', () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const annotation = { icon: '' };

        const result = handler.validate(annotation);
        expect(result).toBe(true);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-app: icon must be a non-empty string'
        );

        consoleWarnSpy.mockRestore();
      });

      it('should validate both name and icon fields together', () => {
        const annotation = { name: 'My Application', icon: '/.uigen/assets/logo.svg' };
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        const result = handler.validate(annotation, context);
        expect(result).toBe(true);
        expect(mockUtils.logWarning).not.toHaveBeenCalled();
      });

      it('should log warnings for both invalid name and icon', () => {
        const annotation = { name: '', icon: '' };
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        const result = handler.validate(annotation, context);
        expect(result).toBe(true); // Still returns true (lenient validation)
        expect(mockUtils.logWarning).toHaveBeenCalledTimes(2);
        expect(mockUtils.logWarning).toHaveBeenCalledWith(
          'x-uigen-app: name must be a non-empty string'
        );
        expect(mockUtils.logWarning).toHaveBeenCalledWith(
          'x-uigen-app: icon must be a non-empty string'
        );
      });
    });

    describe('color/theme field rejection', () => {
      it('should log warning for primaryColor field', () => {
        const annotation = { name: 'My App', primaryColor: '#007bff' };
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        const result = handler.validate(annotation, context);
        expect(result).toBe(true);
        expect(mockUtils.logWarning).toHaveBeenCalledWith(
          'x-uigen-app: primaryColor field is not supported. Use .uigen/theme.css for styling and colors'
        );
      });

      it('should log warning for secondaryColor field', () => {
        const annotation = { name: 'My App', secondaryColor: '#6c757d' };
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        const result = handler.validate(annotation, context);
        expect(result).toBe(true);
        expect(mockUtils.logWarning).toHaveBeenCalledWith(
          'x-uigen-app: secondaryColor field is not supported. Use .uigen/theme.css for styling and colors'
        );
      });

      it('should log warning for accentColor field', () => {
        const annotation = { name: 'My App', accentColor: '#ff5733' };
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        const result = handler.validate(annotation, context);
        expect(result).toBe(true);
        expect(mockUtils.logWarning).toHaveBeenCalledWith(
          'x-uigen-app: accentColor field is not supported. Use .uigen/theme.css for styling and colors'
        );
      });

      it('should log warning for backgroundColor field', () => {
        const annotation = { name: 'My App', backgroundColor: '#ffffff' };
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        const result = handler.validate(annotation, context);
        expect(result).toBe(true);
        expect(mockUtils.logWarning).toHaveBeenCalledWith(
          'x-uigen-app: backgroundColor field is not supported. Use .uigen/theme.css for styling and colors'
        );
      });

      it('should log warning for textColor field', () => {
        const annotation = { name: 'My App', textColor: '#000000' };
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        const result = handler.validate(annotation, context);
        expect(result).toBe(true);
        expect(mockUtils.logWarning).toHaveBeenCalledWith(
          'x-uigen-app: textColor field is not supported. Use .uigen/theme.css for styling and colors'
        );
      });

      it('should log warning for color field', () => {
        const annotation = { name: 'My App', color: '#007bff' };
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        const result = handler.validate(annotation, context);
        expect(result).toBe(true);
        expect(mockUtils.logWarning).toHaveBeenCalledWith(
          'x-uigen-app: color field is not supported. Use .uigen/theme.css for styling and colors'
        );
      });

      it('should log warning for colors field', () => {
        const annotation = { name: 'My App', colors: { primary: '#007bff' } };
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        const result = handler.validate(annotation, context);
        expect(result).toBe(true);
        expect(mockUtils.logWarning).toHaveBeenCalledWith(
          'x-uigen-app: colors field is not supported. Use .uigen/theme.css for styling and colors'
        );
      });

      it('should log warning for theme field', () => {
        const annotation = { name: 'My App', theme: 'dark' };
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        const result = handler.validate(annotation, context);
        expect(result).toBe(true);
        expect(mockUtils.logWarning).toHaveBeenCalledWith(
          'x-uigen-app: theme field is not supported. Use .uigen/theme.css for styling and themes'
        );
      });

      it('should log warning for darkMode field', () => {
        const annotation = { name: 'My App', darkMode: true };
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        const result = handler.validate(annotation, context);
        expect(result).toBe(true);
        expect(mockUtils.logWarning).toHaveBeenCalledWith(
          'x-uigen-app: darkMode field is not supported. Use .uigen/theme.css for styling and themes'
        );
      });

      it('should log warning for lightMode field', () => {
        const annotation = { name: 'My App', lightMode: true };
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        const result = handler.validate(annotation, context);
        expect(result).toBe(true);
        expect(mockUtils.logWarning).toHaveBeenCalledWith(
          'x-uigen-app: lightMode field is not supported. Use .uigen/theme.css for styling and themes'
        );
      });

      it('should log warning for themeMode field', () => {
        const annotation = { name: 'My App', themeMode: 'auto' };
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        const result = handler.validate(annotation, context);
        expect(result).toBe(true);
        expect(mockUtils.logWarning).toHaveBeenCalledWith(
          'x-uigen-app: themeMode field is not supported. Use .uigen/theme.css for styling and themes'
        );
      });

      it('should log warning for colorScheme field', () => {
        const annotation = { name: 'My App', colorScheme: 'light' };
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        const result = handler.validate(annotation, context);
        expect(result).toBe(true);
        expect(mockUtils.logWarning).toHaveBeenCalledWith(
          'x-uigen-app: colorScheme field is not supported. Use .uigen/theme.css for styling and themes'
        );
      });

      it('should log multiple warnings for multiple color/theme fields', () => {
        const annotation = { 
          name: 'My App', 
          primaryColor: '#007bff',
          theme: 'dark',
          darkMode: true
        };
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        const result = handler.validate(annotation, context);
        expect(result).toBe(true);
        expect(mockUtils.logWarning).toHaveBeenCalledTimes(3);
        expect(mockUtils.logWarning).toHaveBeenCalledWith(
          'x-uigen-app: primaryColor field is not supported. Use .uigen/theme.css for styling and colors'
        );
        expect(mockUtils.logWarning).toHaveBeenCalledWith(
          'x-uigen-app: theme field is not supported. Use .uigen/theme.css for styling and themes'
        );
        expect(mockUtils.logWarning).toHaveBeenCalledWith(
          'x-uigen-app: darkMode field is not supported. Use .uigen/theme.css for styling and themes'
        );
      });

      it('should use console.warn for color fields when context is not provided', () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const annotation = { name: 'My App', primaryColor: '#007bff' };

        const result = handler.validate(annotation);
        expect(result).toBe(true);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-app: primaryColor field is not supported. Use .uigen/theme.css for styling and colors'
        );

        consoleWarnSpy.mockRestore();
      });

      it('should use console.warn for theme fields when context is not provided', () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const annotation = { name: 'My App', theme: 'dark' };

        const result = handler.validate(annotation);
        expect(result).toBe(true);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-app: theme field is not supported. Use .uigen/theme.css for styling and themes'
        );

        consoleWarnSpy.mockRestore();
      });

      it('should continue processing valid fields even when color/theme fields present', () => {
        const annotation = { 
          name: 'My App',
          icon: '/.uigen/assets/logo.svg',
          primaryColor: '#007bff',
          theme: 'dark'
        };
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        const result = handler.validate(annotation, context);
        expect(result).toBe(true);
        // Should log warnings for color/theme fields but still return true
        expect(mockUtils.logWarning).toHaveBeenCalledTimes(2);
      });
    });

    describe('extensibility handling (unknown fields)', () => {
      it('should log info message for single unknown field', () => {
        const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
        const annotation = { 
          name: 'My App',
          customField: 'value'
        };
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        const result = handler.validate(annotation, context);
        expect(result).toBe(true);
        expect(consoleInfoSpy).toHaveBeenCalledWith(
          'x-uigen-app: unknown field "customField" will be preserved for forward compatibility'
        );
        expect(mockUtils.logWarning).not.toHaveBeenCalled();

        consoleInfoSpy.mockRestore();
      });

      it('should log info messages for multiple unknown fields', () => {
        const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
        const annotation = { 
          name: 'My App',
          customField1: 'value1',
          customField2: 'value2',
          futureFeature: { nested: 'data' }
        };
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        const result = handler.validate(annotation, context);
        expect(result).toBe(true);
        expect(consoleInfoSpy).toHaveBeenCalledWith(
          'x-uigen-app: unknown field "customField1" will be preserved for forward compatibility'
        );
        expect(consoleInfoSpy).toHaveBeenCalledWith(
          'x-uigen-app: unknown field "customField2" will be preserved for forward compatibility'
        );
        expect(consoleInfoSpy).toHaveBeenCalledWith(
          'x-uigen-app: unknown field "futureFeature" will be preserved for forward compatibility'
        );
        expect(mockUtils.logWarning).not.toHaveBeenCalled();

        consoleInfoSpy.mockRestore();
      });

      it('should not log info for known fields (name, icon)', () => {
        const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
        const annotation = { 
          name: 'My App',
          icon: '/.uigen/assets/logo.svg'
        };
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        const result = handler.validate(annotation, context);
        expect(result).toBe(true);
        expect(consoleInfoSpy).not.toHaveBeenCalled();
        expect(mockUtils.logWarning).not.toHaveBeenCalled();

        consoleInfoSpy.mockRestore();
      });

      it('should not log info for color/theme fields (already handled with warnings)', () => {
        const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
        const annotation = { 
          name: 'My App',
          primaryColor: '#007bff',
          theme: 'dark'
        };
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        const result = handler.validate(annotation, context);
        expect(result).toBe(true);
        // Should log warnings for color/theme fields, not info
        expect(mockUtils.logWarning).toHaveBeenCalledTimes(2);
        expect(consoleInfoSpy).not.toHaveBeenCalled();

        consoleInfoSpy.mockRestore();
      });

      it('should handle mix of known, unknown, and color/theme fields', () => {
        const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
        const annotation = { 
          name: 'My App',
          icon: '/.uigen/assets/logo.svg',
          customField: 'value',
          primaryColor: '#007bff',
          futureFeature: true
        };
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        const result = handler.validate(annotation, context);
        expect(result).toBe(true);
        // Should log warning for color field
        expect(mockUtils.logWarning).toHaveBeenCalledTimes(1);
        expect(mockUtils.logWarning).toHaveBeenCalledWith(
          'x-uigen-app: primaryColor field is not supported. Use .uigen/theme.css for styling and colors'
        );
        // Should log info for unknown fields
        expect(consoleInfoSpy).toHaveBeenCalledWith(
          'x-uigen-app: unknown field "customField" will be preserved for forward compatibility'
        );
        expect(consoleInfoSpy).toHaveBeenCalledWith(
          'x-uigen-app: unknown field "futureFeature" will be preserved for forward compatibility'
        );

        consoleInfoSpy.mockRestore();
      });

      it('should allow empty object with no fields', () => {
        const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
        const annotation = {};
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        const result = handler.validate(annotation, context);
        expect(result).toBe(true);
        expect(consoleInfoSpy).not.toHaveBeenCalled();
        expect(mockUtils.logWarning).not.toHaveBeenCalled();

        consoleInfoSpy.mockRestore();
      });

      it('should preserve unknown fields for forward compatibility', () => {
        const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
        const annotation = { 
          name: 'My App',
          version: '2.0',
          metadata: { key: 'value' },
          experimental: true
        };
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        const result = handler.validate(annotation, context);
        expect(result).toBe(true);
        // Unknown fields should be logged but validation should pass
        expect(consoleInfoSpy).toHaveBeenCalledTimes(3);
        expect(mockUtils.logWarning).not.toHaveBeenCalled();

        consoleInfoSpy.mockRestore();
      });
    });
  });

  describe('extract', () => {
    it('should return undefined when annotation is absent', () => {
      const context: AnnotationContext = {
        element: { openapi: '3.0.0' },
        path: 'document',
        utils: mockUtils,
        ir: mockIR
      };

      expect(handler.extract(context)).toBeUndefined();
    });

    it('should return undefined and log warning for null annotation', () => {
      const context: AnnotationContext = {
        element: { openapi: '3.0.0', 'x-uigen-app': null } as any,
        path: 'document',
        utils: mockUtils,
        ir: mockIR
      };

      const result = handler.extract(context);
      expect(result).toBeUndefined();
      expect(mockUtils.logWarning).toHaveBeenCalledWith(
        expect.stringContaining('x-uigen-app at document must be a plain object, found null')
      );
    });

    it('should return undefined and log warning for array annotation', () => {
      const context: AnnotationContext = {
        element: { openapi: '3.0.0', 'x-uigen-app': [] } as any,
        path: 'document',
        utils: mockUtils,
        ir: mockIR
      };

      const result = handler.extract(context);
      expect(result).toBeUndefined();
      expect(mockUtils.logWarning).toHaveBeenCalledWith(
        expect.stringContaining('x-uigen-app at document must be a plain object, found array')
      );
    });

    it('should return undefined and log warning for string annotation', () => {
      const context: AnnotationContext = {
        element: { openapi: '3.0.0', 'x-uigen-app': 'invalid' } as any,
        path: 'document',
        utils: mockUtils,
        ir: mockIR
      };

      const result = handler.extract(context);
      expect(result).toBeUndefined();
      expect(mockUtils.logWarning).toHaveBeenCalledWith(
        expect.stringContaining('x-uigen-app at document must be a plain object, found string')
      );
    });

    it('should return undefined and log warning for number annotation', () => {
      const context: AnnotationContext = {
        element: { openapi: '3.0.0', 'x-uigen-app': 123 } as any,
        path: 'document',
        utils: mockUtils,
        ir: mockIR
      };

      const result = handler.extract(context);
      expect(result).toBeUndefined();
      expect(mockUtils.logWarning).toHaveBeenCalledWith(
        expect.stringContaining('x-uigen-app at document must be a plain object, found number')
      );
    });

    it('should return undefined and log warning for boolean annotation', () => {
      const context: AnnotationContext = {
        element: { openapi: '3.0.0', 'x-uigen-app': true } as any,
        path: 'document',
        utils: mockUtils,
        ir: mockIR
      };

      const result = handler.extract(context);
      expect(result).toBeUndefined();
      expect(mockUtils.logWarning).toHaveBeenCalledWith(
        expect.stringContaining('x-uigen-app at document must be a plain object, found boolean')
      );
    });

    it('should extract valid app annotation object with name only', () => {
      const annotation = {
        name: 'My Application'
      };

      const context: AnnotationContext = {
        element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
        path: 'document',
        utils: mockUtils,
        ir: mockIR
      };

      const result = handler.extract(context);
      expect(result).toEqual(annotation);
      expect(mockUtils.logWarning).not.toHaveBeenCalled();
    });

    it('should extract valid app annotation object with icon only', () => {
      const annotation = {
        icon: '/.uigen/assets/logo.svg'
      };

      const context: AnnotationContext = {
        element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
        path: 'document',
        utils: mockUtils,
        ir: mockIR
      };

      const result = handler.extract(context);
      expect(result).toEqual(annotation);
      expect(mockUtils.logWarning).not.toHaveBeenCalled();
    });

    it('should extract valid app annotation object with both name and icon', () => {
      const annotation = {
        name: 'My Application',
        icon: '/.uigen/assets/logo.svg'
      };

      const context: AnnotationContext = {
        element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
        path: 'document',
        utils: mockUtils,
        ir: mockIR
      };

      const result = handler.extract(context);
      expect(result).toEqual(annotation);
      expect(mockUtils.logWarning).not.toHaveBeenCalled();
    });

    it('should extract empty app annotation object (all fields optional)', () => {
      const annotation = {};

      const context: AnnotationContext = {
        element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
        path: 'document',
        utils: mockUtils,
        ir: mockIR
      };

      const result = handler.extract(context);
      expect(result).toEqual(annotation);
      expect(mockUtils.logWarning).not.toHaveBeenCalled();
    });

    it('should extract app annotation with unknown fields (forward compatibility)', () => {
      const annotation = {
        name: 'My Application',
        icon: '/.uigen/assets/logo.svg',
        customField: 'value',
        futureFeature: { nested: 'data' }
      };

      const context: AnnotationContext = {
        element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
        path: 'document',
        utils: mockUtils,
        ir: mockIR
      };

      const result = handler.extract(context);
      expect(result).toEqual(annotation);
      expect(mockUtils.logWarning).not.toHaveBeenCalled();
    });

    it('should handle extraction errors gracefully', () => {
      const context: AnnotationContext = {
        element: null as any,
        path: 'document',
        utils: mockUtils,
        ir: mockIR
      };

      const result = handler.extract(context);
      expect(result).toBeUndefined();
      expect(mockUtils.logWarning).toHaveBeenCalledWith(
        expect.stringContaining('x-uigen-app at document: extraction error')
      );
    });
  });

  describe('apply', () => {
    describe('document-level application', () => {
      it('should store appConfig in IR when applied at document level', () => {
        const annotation = {
          name: 'My Application',
          icon: '/.uigen/assets/logo.svg'
        };

        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        handler.apply(annotation, context);

        expect(mockIR.appConfig).toBeDefined();
        expect(mockIR.appConfig?.name).toBe('My Application');
        expect(mockIR.appConfig?.icon).toBe('/.uigen/assets/logo.svg');
        expect(mockUtils.logWarning).not.toHaveBeenCalled();
      });

      it('should store appConfig with name only', () => {
        const annotation = {
          name: 'My Application'
        };

        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        handler.apply(annotation, context);

        expect(mockIR.appConfig).toBeDefined();
        expect(mockIR.appConfig?.name).toBe('My Application');
        expect(mockIR.appConfig?.icon).toBeUndefined();
        expect(mockUtils.logWarning).not.toHaveBeenCalled();
      });

      it('should store appConfig with icon only', () => {
        const annotation = {
          icon: '/.uigen/assets/logo.svg'
        };

        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        handler.apply(annotation, context);

        expect(mockIR.appConfig).toBeDefined();
        expect(mockIR.appConfig?.name).toBeUndefined();
        expect(mockIR.appConfig?.icon).toBe('/.uigen/assets/logo.svg');
        expect(mockUtils.logWarning).not.toHaveBeenCalled();
      });

      it('should store empty appConfig when no fields provided', () => {
        const annotation = {};

        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        handler.apply(annotation, context);

        expect(mockIR.appConfig).toBeDefined();
        expect(mockIR.appConfig?.name).toBeUndefined();
        expect(mockIR.appConfig?.icon).toBeUndefined();
        expect(mockUtils.logWarning).not.toHaveBeenCalled();
      });

      it('should preserve unknown fields in appConfig for extensibility', () => {
        const annotation = {
          name: 'My Application',
          icon: '/.uigen/assets/logo.svg',
          customField: 'value',
          futureFeature: { nested: 'data' }
        };

        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        handler.apply(annotation, context);

        expect(mockIR.appConfig).toBeDefined();
        expect(mockIR.appConfig?.name).toBe('My Application');
        expect(mockIR.appConfig?.icon).toBe('/.uigen/assets/logo.svg');
        expect((mockIR.appConfig as any).customField).toBe('value');
        expect((mockIR.appConfig as any).futureFeature).toEqual({ nested: 'data' });
        expect(mockUtils.logWarning).not.toHaveBeenCalled();
      });
    });

    describe('wrong context level handling', () => {
      it('should log warning and skip when applied at operation level', () => {
        const annotation = {
          name: 'My Application'
        };

        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: '/paths/users/get',
          operation: { method: 'GET', path: '/users' } as any,
          utils: mockUtils,
          ir: mockIR
        };

        handler.apply(annotation, context);

        expect(mockIR.appConfig).toBeUndefined();
        expect(mockUtils.logWarning).toHaveBeenCalledWith(
          'x-uigen-app at /paths/users/get: can only be applied at document level, not at operation level'
        );
      });

      it('should log warning and skip when applied at field level', () => {
        const annotation = {
          name: 'My Application'
        };

        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: '/components/schemas/User/properties/name',
          schemaNode: { type: 'string', key: 'name', label: 'Name', required: false } as any,
          utils: mockUtils,
          ir: mockIR
        };

        handler.apply(annotation, context);

        expect(mockIR.appConfig).toBeUndefined();
        expect(mockUtils.logWarning).toHaveBeenCalledWith(
          'x-uigen-app at /components/schemas/User/properties/name: can only be applied at document level, not at field level'
        );
      });

      it('should log generic warning when applied at non-document level without operation or schema', () => {
        const annotation = {
          name: 'My Application'
        };

        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: '/paths/users',
          resource: { name: 'User', slug: 'users' } as any,
          utils: mockUtils,
          ir: mockIR
        };

        handler.apply(annotation, context);

        expect(mockIR.appConfig).toBeUndefined();
        expect(mockUtils.logWarning).toHaveBeenCalledWith(
          'x-uigen-app at /paths/users: can only be applied at document level'
        );
      });
    });

    describe('multiple annotations handling', () => {
      it('should use first annotation and log warning when multiple present', () => {
        const firstAnnotation = {
          name: 'First Application',
          icon: '/first-icon.svg'
        };

        const secondAnnotation = {
          name: 'Second Application',
          icon: '/second-icon.svg'
        };

        const context1: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': firstAnnotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        const context2: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': secondAnnotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        // Apply first annotation
        handler.apply(firstAnnotation, context1);
        expect(mockIR.appConfig?.name).toBe('First Application');
        expect(mockIR.appConfig?.icon).toBe('/first-icon.svg');
        expect(mockUtils.logWarning).not.toHaveBeenCalled();

        // Try to apply second annotation
        handler.apply(secondAnnotation, context2);
        expect(mockIR.appConfig?.name).toBe('First Application'); // Should still be first
        expect(mockIR.appConfig?.icon).toBe('/first-icon.svg'); // Should still be first
        expect(mockUtils.logWarning).toHaveBeenCalledWith(
          'x-uigen-app at document: multiple app annotations found at document level, using first annotation'
        );
      });
    });

    describe('error handling', () => {
      it('should handle apply errors gracefully', () => {
        const annotation = {
          name: 'My Application'
        };

        // Create a context that will cause an error when trying to set appConfig
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: null as any // This will cause an error
        };

        // Should not throw, should log warning
        expect(() => handler.apply(annotation, context)).not.toThrow();
        expect(mockUtils.logWarning).toHaveBeenCalledWith(
          expect.stringContaining('x-uigen-app at document: apply error')
        );
      });

      it('should catch and log errors during apply', () => {
        const annotation = {
          name: 'My Application'
        };

        // Create a context that will cause an error when trying to set appConfig
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-app': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: null as any // This will cause an error when trying to set appConfig
        };

        handler.apply(annotation, context);

        expect(mockUtils.logWarning).toHaveBeenCalledWith(
          expect.stringContaining('x-uigen-app at document: apply error')
        );
      });
    });
  });
});
