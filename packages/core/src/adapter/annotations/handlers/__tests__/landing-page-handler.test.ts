import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LandingPageHandler } from '../landing-page-handler.js';
import type { AnnotationContext, AdapterUtils } from '../../types.js';
import type { UIGenApp } from '../../../../ir/types.js';

describe('LandingPageHandler', () => {
  let handler: LandingPageHandler;
  let mockUtils: AdapterUtils;
  let mockIR: UIGenApp;

  beforeEach(() => {
    handler = new LandingPageHandler();
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
      expect(handler.name).toBe('x-uigen-landing-page');
    });
  });

  describe('metadata', () => {
    it('should expose static metadata property', () => {
      expect(LandingPageHandler.metadata).toBeDefined();
    });

    it('should have correct name in metadata', () => {
      expect(LandingPageHandler.metadata.name).toBe('x-uigen-landing-page');
    });

    it('should have targetType "document" in metadata', () => {
      expect(LandingPageHandler.metadata.targetType).toBe('document');
    });

    it('should have complete parameterSchema in metadata', () => {
      expect(LandingPageHandler.metadata.parameterSchema).toBeDefined();
      expect(LandingPageHandler.metadata.parameterSchema.properties).toBeDefined();
      expect(LandingPageHandler.metadata.parameterSchema.properties?.enabled).toBeDefined();
      expect(LandingPageHandler.metadata.parameterSchema.properties?.sections).toBeDefined();
    });

    it('should have at least 2 examples in metadata', () => {
      expect(LandingPageHandler.metadata.examples).toBeDefined();
      expect(LandingPageHandler.metadata.examples.length).toBeGreaterThanOrEqual(2);
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
        element: { openapi: '3.0.0', 'x-uigen-landing-page': null } as any,
        path: 'document',
        utils: mockUtils,
        ir: mockIR
      };

      const result = handler.extract(context);
      expect(result).toBeUndefined();
      expect(mockUtils.logWarning).toHaveBeenCalledWith(
        expect.stringContaining('x-uigen-landing-page at document must be a plain object, found null')
      );
    });

    it('should return undefined and log warning for array annotation', () => {
      const context: AnnotationContext = {
        element: { openapi: '3.0.0', 'x-uigen-landing-page': [] } as any,
        path: 'document',
        utils: mockUtils,
        ir: mockIR
      };

      const result = handler.extract(context);
      expect(result).toBeUndefined();
      expect(mockUtils.logWarning).toHaveBeenCalledWith(
        expect.stringContaining('x-uigen-landing-page at document must be a plain object, found array')
      );
    });

    it('should return undefined and log warning for string annotation', () => {
      const context: AnnotationContext = {
        element: { openapi: '3.0.0', 'x-uigen-landing-page': 'invalid' } as any,
        path: 'document',
        utils: mockUtils,
        ir: mockIR
      };

      const result = handler.extract(context);
      expect(result).toBeUndefined();
      expect(mockUtils.logWarning).toHaveBeenCalledWith(
        expect.stringContaining('x-uigen-landing-page at document must be a plain object, found string')
      );
    });

    it('should return undefined and log warning for number annotation', () => {
      const context: AnnotationContext = {
        element: { openapi: '3.0.0', 'x-uigen-landing-page': 123 } as any,
        path: 'document',
        utils: mockUtils,
        ir: mockIR
      };

      const result = handler.extract(context);
      expect(result).toBeUndefined();
      expect(mockUtils.logWarning).toHaveBeenCalledWith(
        expect.stringContaining('x-uigen-landing-page at document must be a plain object, found number')
      );
    });

    it('should return undefined and log warning for boolean annotation', () => {
      const context: AnnotationContext = {
        element: { openapi: '3.0.0', 'x-uigen-landing-page': true } as any,
        path: 'document',
        utils: mockUtils,
        ir: mockIR
      };

      const result = handler.extract(context);
      expect(result).toBeUndefined();
      expect(mockUtils.logWarning).toHaveBeenCalledWith(
        expect.stringContaining('x-uigen-landing-page at document must be a plain object, found boolean')
      );
    });

    it('should extract valid landing page annotation object', () => {
      const annotation = {
        enabled: true,
        sections: {
          hero: {
            enabled: true,
            headline: 'Welcome to Our App',
            primaryCta: {
              text: 'Get Started',
              url: '/signup'
            }
          }
        }
      };

      const context: AnnotationContext = {
        element: { openapi: '3.0.0', 'x-uigen-landing-page': annotation } as any,
        path: 'document',
        utils: mockUtils,
        ir: mockIR
      };

      expect(handler.extract(context)).toEqual(annotation);
    });

    it('should extract minimal valid annotation', () => {
      const annotation = {
        enabled: false,
        sections: {}
      };

      const context: AnnotationContext = {
        element: { openapi: '3.0.0', 'x-uigen-landing-page': annotation } as any,
        path: 'document',
        utils: mockUtils,
        ir: mockIR
      };

      expect(handler.extract(context)).toEqual(annotation);
    });

    it('should extract complete annotation with all sections', () => {
      const annotation = {
        enabled: true,
        sections: {
          hero: {
            enabled: true,
            headline: 'Transform Your Workflow',
            subheadline: 'The all-in-one platform',
            primaryCta: { text: 'Start Free Trial', url: '/signup' },
            secondaryCta: { text: 'Watch Demo', url: '/demo' }
          },
          features: {
            enabled: true,
            title: 'Powerful Features',
            items: [
              { title: 'Feature 1', description: 'Description 1', icon: 'icon1' }
            ]
          },
          howItWorks: {
            enabled: true,
            title: 'How It Works',
            steps: [
              { title: 'Step 1', description: 'Description 1', stepNumber: 1 }
            ]
          },
          testimonials: {
            enabled: true,
            title: 'What Our Customers Say',
            items: [
              { quote: 'Great product!', author: 'John Doe', rating: 5 }
            ]
          },
          pricing: {
            enabled: true,
            title: 'Simple Pricing',
            plans: [
              { name: 'Starter', price: '$9/month', features: ['Feature 1'], ctaText: 'Start Free', ctaUrl: '/signup' }
            ]
          },
          faq: {
            enabled: true,
            title: 'Frequently Asked Questions',
            items: [
              { question: 'What is this?', answer: 'This is a product.' }
            ]
          },
          cta: {
            enabled: true,
            headline: 'Ready to get started?',
            primaryCta: { text: 'Sign Up Now', url: '/signup' }
          },
          footer: {
            enabled: true,
            companyName: 'Acme Inc',
            links: [{ text: 'About', url: '/about' }],
            copyrightText: '© 2024 Acme Inc'
          }
        }
      };

      const context: AnnotationContext = {
        element: { openapi: '3.0.0', 'x-uigen-landing-page': annotation } as any,
        path: 'document',
        utils: mockUtils,
        ir: mockIR
      };

      expect(handler.extract(context)).toEqual(annotation);
    });

    it('should handle extraction errors gracefully', () => {
      const context: AnnotationContext = {
        element: {
          get 'x-uigen-landing-page'() {
            throw new Error('Extraction error');
          }
        } as any,
        path: 'document',
        utils: mockUtils,
        ir: mockIR
      };

      const result = handler.extract(context);
      expect(result).toBeUndefined();
      expect(mockUtils.logWarning).toHaveBeenCalledWith(
        expect.stringContaining('extraction error')
      );
    });
  });

  describe('validate', () => {
    describe('top-level validation (enabled and sections fields)', () => {
      it('should return false when enabled field is missing', () => {
        const annotation = {
          sections: {}
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: enabled field is required'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when enabled field is null', () => {
        const annotation = {
          enabled: null,
          sections: {}
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: enabled field is required'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when enabled field is not a boolean (string)', () => {
        const annotation = {
          enabled: 'true',
          sections: {}
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: enabled field must be a boolean'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when enabled field is not a boolean (number)', () => {
        const annotation = {
          enabled: 1,
          sections: {}
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: enabled field must be a boolean'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when sections field is missing', () => {
        const annotation = {
          enabled: true
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: sections field is required'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when sections field is null', () => {
        const annotation = {
          enabled: true,
          sections: null
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: sections field is required'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when sections field is not an object (array)', () => {
        const annotation = {
          enabled: true,
          sections: []
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: sections field must be a plain object'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when sections field is not an object (string)', () => {
        const annotation = {
          enabled: true,
          sections: 'invalid'
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: sections field must be a plain object'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return true for valid minimal annotation with enabled=true', () => {
        const annotation = {
          enabled: true,
          sections: {}
        };

        const result = handler.validate(annotation);
        expect(result).toBe(true);
      });

      it('should return true for valid minimal annotation with enabled=false', () => {
        const annotation = {
          enabled: false,
          sections: {}
        };

        const result = handler.validate(annotation);
        expect(result).toBe(true);
      });

      it('should return true for valid annotation with sections', () => {
        const annotation = {
          enabled: true,
          sections: {
            hero: {
              enabled: true,
              headline: 'Welcome'
            }
          }
        };

        const result = handler.validate(annotation);
        expect(result).toBe(true);
      });

      it('should handle validation errors gracefully', () => {
        const annotation = {
          get enabled() {
            throw new Error('Validation error');
          },
          sections: {}
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('validation error')
        );
        consoleWarnSpy.mockRestore();
      });
    });

    describe('hero section validation', () => {
      it('should return false when hero.enabled is missing', () => {
        const annotation = {
          enabled: true,
          sections: {
            hero: {
              headline: 'Welcome'
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: hero.enabled field is required'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when hero.enabled is null', () => {
        const annotation = {
          enabled: true,
          sections: {
            hero: {
              enabled: null,
              headline: 'Welcome'
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: hero.enabled field is required'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when hero.enabled is not a boolean', () => {
        const annotation = {
          enabled: true,
          sections: {
            hero: {
              enabled: 'true',
              headline: 'Welcome'
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: hero.enabled must be a boolean'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when hero.headline is not a string', () => {
        const annotation = {
          enabled: true,
          sections: {
            hero: {
              enabled: true,
              headline: 123
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: hero.headline must be a string'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when hero.headline is an empty string', () => {
        const annotation = {
          enabled: true,
          sections: {
            hero: {
              enabled: true,
              headline: '   '
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: hero.headline must be a non-empty string'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when hero.subheadline is not a string', () => {
        const annotation = {
          enabled: true,
          sections: {
            hero: {
              enabled: true,
              subheadline: 456
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: hero.subheadline must be a string'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when hero.subheadline is an empty string', () => {
        const annotation = {
          enabled: true,
          sections: {
            hero: {
              enabled: true,
              subheadline: '   '
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: hero.subheadline must be a non-empty string'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when hero.primaryCta is not an object', () => {
        const annotation = {
          enabled: true,
          sections: {
            hero: {
              enabled: true,
              primaryCta: 'invalid'
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: hero.primaryCta must be an object'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when hero.primaryCta is null', () => {
        const annotation = {
          enabled: true,
          sections: {
            hero: {
              enabled: true,
              primaryCta: null
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: hero.primaryCta must be an object'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when hero.primaryCta is an array', () => {
        const annotation = {
          enabled: true,
          sections: {
            hero: {
              enabled: true,
              primaryCta: []
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: hero.primaryCta must be an object'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when hero.primaryCta is missing text field', () => {
        const annotation = {
          enabled: true,
          sections: {
            hero: {
              enabled: true,
              primaryCta: {
                url: '/signup'
              }
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: hero.primaryCta must have a text field'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when hero.primaryCta.text is empty', () => {
        const annotation = {
          enabled: true,
          sections: {
            hero: {
              enabled: true,
              primaryCta: {
                text: '   ',
                url: '/signup'
              }
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: hero.primaryCta.text must be a non-empty string'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when hero.primaryCta is missing url field', () => {
        const annotation = {
          enabled: true,
          sections: {
            hero: {
              enabled: true,
              primaryCta: {
                text: 'Get Started'
              }
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: hero.primaryCta must have a url field'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when hero.primaryCta.url is empty', () => {
        const annotation = {
          enabled: true,
          sections: {
            hero: {
              enabled: true,
              primaryCta: {
                text: 'Get Started',
                url: '   '
              }
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: hero.primaryCta.url must be a non-empty string'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when hero.secondaryCta is missing text field', () => {
        const annotation = {
          enabled: true,
          sections: {
            hero: {
              enabled: true,
              secondaryCta: {
                url: '/demo'
              }
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: hero.secondaryCta must have a text field'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when hero.secondaryCta is missing url field', () => {
        const annotation = {
          enabled: true,
          sections: {
            hero: {
              enabled: true,
              secondaryCta: {
                text: 'Watch Demo'
              }
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: hero.secondaryCta must have a url field'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when hero.backgroundImage is not a string', () => {
        const annotation = {
          enabled: true,
          sections: {
            hero: {
              enabled: true,
              backgroundImage: 123
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: hero.backgroundImage must be a string'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return true for valid hero section with only enabled field', () => {
        const annotation = {
          enabled: true,
          sections: {
            hero: {
              enabled: true
            }
          }
        };

        const result = handler.validate(annotation);
        expect(result).toBe(true);
      });

      it('should return true for valid hero section with headline', () => {
        const annotation = {
          enabled: true,
          sections: {
            hero: {
              enabled: true,
              headline: 'Welcome to Our App'
            }
          }
        };

        const result = handler.validate(annotation);
        expect(result).toBe(true);
      });

      it('should return true for valid hero section with headline and subheadline', () => {
        const annotation = {
          enabled: true,
          sections: {
            hero: {
              enabled: true,
              headline: 'Welcome to Our App',
              subheadline: 'The best app ever'
            }
          }
        };

        const result = handler.validate(annotation);
        expect(result).toBe(true);
      });

      it('should return true for valid hero section with primaryCta', () => {
        const annotation = {
          enabled: true,
          sections: {
            hero: {
              enabled: true,
              primaryCta: {
                text: 'Get Started',
                url: '/signup'
              }
            }
          }
        };

        const result = handler.validate(annotation);
        expect(result).toBe(true);
      });

      it('should return true for valid hero section with primaryCta and secondaryCta', () => {
        const annotation = {
          enabled: true,
          sections: {
            hero: {
              enabled: true,
              primaryCta: {
                text: 'Get Started',
                url: '/signup'
              },
              secondaryCta: {
                text: 'Watch Demo',
                url: '/demo'
              }
            }
          }
        };

        const result = handler.validate(annotation);
        expect(result).toBe(true);
      });

      it('should return true for valid hero section with backgroundImage', () => {
        const annotation = {
          enabled: true,
          sections: {
            hero: {
              enabled: true,
              backgroundImage: '/images/hero-bg.jpg'
            }
          }
        };

        const result = handler.validate(annotation);
        expect(result).toBe(true);
      });

      it('should return true for complete valid hero section', () => {
        const annotation = {
          enabled: true,
          sections: {
            hero: {
              enabled: true,
              headline: 'Transform Your Workflow',
              subheadline: 'The all-in-one platform for modern teams',
              primaryCta: {
                text: 'Start Free Trial',
                url: '/signup'
              },
              secondaryCta: {
                text: 'Watch Demo',
                url: '/demo'
              },
              backgroundImage: '/images/hero-bg.jpg'
            }
          }
        };

        const result = handler.validate(annotation);
        expect(result).toBe(true);
      });

      it('should return true when hero section is disabled', () => {
        const annotation = {
          enabled: true,
          sections: {
            hero: {
              enabled: false,
              headline: 'This should not matter'
            }
          }
        };

        const result = handler.validate(annotation);
        expect(result).toBe(true);
      });

      it('should return true when hero section is not present', () => {
        const annotation = {
          enabled: true,
          sections: {}
        };

        const result = handler.validate(annotation);
        expect(result).toBe(true);
      });
    });

    describe('features section validation', () => {
      it('should return false when features.enabled is missing', () => {
        const annotation = {
          enabled: true,
          sections: {
            features: {
              title: 'Features'
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: features.enabled field is required'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when features.enabled is null', () => {
        const annotation = {
          enabled: true,
          sections: {
            features: {
              enabled: null,
              title: 'Features'
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: features.enabled field is required'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when features.enabled is not a boolean', () => {
        const annotation = {
          enabled: true,
          sections: {
            features: {
              enabled: 'true',
              title: 'Features'
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: features.enabled must be a boolean'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when features.title is not a string', () => {
        const annotation = {
          enabled: true,
          sections: {
            features: {
              enabled: true,
              title: 123
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: features.title must be a string'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when features.items is not an array', () => {
        const annotation = {
          enabled: true,
          sections: {
            features: {
              enabled: true,
              items: 'invalid'
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: features.items must be an array'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should log warning when features.items is an empty array', () => {
        const annotation = {
          enabled: true,
          sections: {
            features: {
              enabled: true,
              items: []
            }
          }
        };

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(true);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: features.items is an empty array'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when feature item is not an object', () => {
        const annotation = {
          enabled: true,
          sections: {
            features: {
              enabled: true,
              items: ['invalid']
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: features.items[0] must be an object'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when feature item is null', () => {
        const annotation = {
          enabled: true,
          sections: {
            features: {
              enabled: true,
              items: [null]
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: features.items[0] must be an object'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when feature item is an array', () => {
        const annotation = {
          enabled: true,
          sections: {
            features: {
              enabled: true,
              items: [[]]
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: features.items[0] must be an object'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when feature item is missing title field', () => {
        const annotation = {
          enabled: true,
          sections: {
            features: {
              enabled: true,
              items: [
                {
                  description: 'Feature description'
                }
              ]
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: features.items[0] must have a title field'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when feature item title is null', () => {
        const annotation = {
          enabled: true,
          sections: {
            features: {
              enabled: true,
              items: [
                {
                  title: null,
                  description: 'Feature description'
                }
              ]
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: features.items[0] must have a title field'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when feature item title is not a string', () => {
        const annotation = {
          enabled: true,
          sections: {
            features: {
              enabled: true,
              items: [
                {
                  title: 123,
                  description: 'Feature description'
                }
              ]
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: features.items[0].title must be a non-empty string'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when feature item title is empty', () => {
        const annotation = {
          enabled: true,
          sections: {
            features: {
              enabled: true,
              items: [
                {
                  title: '   ',
                  description: 'Feature description'
                }
              ]
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: features.items[0].title must be a non-empty string'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when feature item is missing description field', () => {
        const annotation = {
          enabled: true,
          sections: {
            features: {
              enabled: true,
              items: [
                {
                  title: 'Feature Title'
                }
              ]
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: features.items[0] must have a description field'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when feature item description is null', () => {
        const annotation = {
          enabled: true,
          sections: {
            features: {
              enabled: true,
              items: [
                {
                  title: 'Feature Title',
                  description: null
                }
              ]
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: features.items[0] must have a description field'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when feature item description is not a string', () => {
        const annotation = {
          enabled: true,
          sections: {
            features: {
              enabled: true,
              items: [
                {
                  title: 'Feature Title',
                  description: 456
                }
              ]
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: features.items[0].description must be a non-empty string'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when feature item description is empty', () => {
        const annotation = {
          enabled: true,
          sections: {
            features: {
              enabled: true,
              items: [
                {
                  title: 'Feature Title',
                  description: '   '
                }
              ]
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: features.items[0].description must be a non-empty string'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when feature item icon is not a string', () => {
        const annotation = {
          enabled: true,
          sections: {
            features: {
              enabled: true,
              items: [
                {
                  title: 'Feature Title',
                  description: 'Feature description',
                  icon: 123
                }
              ]
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: features.items[0].icon must be a string'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when feature item image is not a string', () => {
        const annotation = {
          enabled: true,
          sections: {
            features: {
              enabled: true,
              items: [
                {
                  title: 'Feature Title',
                  description: 'Feature description',
                  image: 456
                }
              ]
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: features.items[0].image must be a string'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return true for valid features section with only enabled field', () => {
        const annotation = {
          enabled: true,
          sections: {
            features: {
              enabled: true
            }
          }
        };

        const result = handler.validate(annotation);
        expect(result).toBe(true);
      });

      it('should return true for valid features section with title', () => {
        const annotation = {
          enabled: true,
          sections: {
            features: {
              enabled: true,
              title: 'Powerful Features'
            }
          }
        };

        const result = handler.validate(annotation);
        expect(result).toBe(true);
      });

      it('should return true for valid features section with minimal feature item', () => {
        const annotation = {
          enabled: true,
          sections: {
            features: {
              enabled: true,
              items: [
                {
                  title: 'Feature Title',
                  description: 'Feature description'
                }
              ]
            }
          }
        };

        const result = handler.validate(annotation);
        expect(result).toBe(true);
      });

      it('should return true for valid features section with feature item including icon', () => {
        const annotation = {
          enabled: true,
          sections: {
            features: {
              enabled: true,
              items: [
                {
                  title: 'Feature Title',
                  description: 'Feature description',
                  icon: 'users'
                }
              ]
            }
          }
        };

        const result = handler.validate(annotation);
        expect(result).toBe(true);
      });

      it('should return true for valid features section with feature item including image', () => {
        const annotation = {
          enabled: true,
          sections: {
            features: {
              enabled: true,
              items: [
                {
                  title: 'Feature Title',
                  description: 'Feature description',
                  image: '/images/feature.jpg'
                }
              ]
            }
          }
        };

        const result = handler.validate(annotation);
        expect(result).toBe(true);
      });

      it('should return true for valid features section with complete feature item', () => {
        const annotation = {
          enabled: true,
          sections: {
            features: {
              enabled: true,
              items: [
                {
                  title: 'Feature Title',
                  description: 'Feature description',
                  icon: 'users',
                  image: '/images/feature.jpg'
                }
              ]
            }
          }
        };

        const result = handler.validate(annotation);
        expect(result).toBe(true);
      });

      it('should return true for valid features section with multiple feature items', () => {
        const annotation = {
          enabled: true,
          sections: {
            features: {
              enabled: true,
              title: 'Powerful Features',
              items: [
                {
                  title: 'Real-time Collaboration',
                  description: 'Work together seamlessly',
                  icon: 'users'
                },
                {
                  title: 'Advanced Analytics',
                  description: 'Data-driven insights',
                  icon: 'bar-chart'
                },
                {
                  title: 'Secure Storage',
                  description: 'Your data is safe with us',
                  icon: 'lock',
                  image: '/images/security.jpg'
                }
              ]
            }
          }
        };

        const result = handler.validate(annotation);
        expect(result).toBe(true);
      });

      it('should return false when second feature item is invalid', () => {
        const annotation = {
          enabled: true,
          sections: {
            features: {
              enabled: true,
              items: [
                {
                  title: 'Feature 1',
                  description: 'Description 1'
                },
                {
                  title: 'Feature 2'
                  // missing description
                }
              ]
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: features.items[1] must have a description field'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return true when features section is disabled', () => {
        const annotation = {
          enabled: true,
          sections: {
            features: {
              enabled: false,
              items: 'this should not matter'
            }
          }
        };

        const result = handler.validate(annotation);
        expect(result).toBe(true);
      });

      it('should return true when features section is not present', () => {
        const annotation = {
          enabled: true,
          sections: {}
        };

        const result = handler.validate(annotation);
        expect(result).toBe(true);
      });
    });

    describe('howItWorks section validation', () => {
      it('should return false when howItWorks.enabled is missing', () => {
        const annotation = {
          enabled: true,
          sections: {
            howItWorks: {
              title: 'How It Works'
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: howItWorks.enabled field is required'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when howItWorks.enabled is not a boolean', () => {
        const annotation = {
          enabled: true,
          sections: {
            howItWorks: {
              enabled: 'true'
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: howItWorks.enabled must be a boolean'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when howItWorks.title is not a string', () => {
        const annotation = {
          enabled: true,
          sections: {
            howItWorks: {
              enabled: true,
              title: 123
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: howItWorks.title must be a string'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when howItWorks.steps is not an array', () => {
        const annotation = {
          enabled: true,
          sections: {
            howItWorks: {
              enabled: true,
              steps: 'invalid'
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: howItWorks.steps must be an array'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should log warning when howItWorks.steps is an empty array', () => {
        const annotation = {
          enabled: true,
          sections: {
            howItWorks: {
              enabled: true,
              steps: []
            }
          }
        };

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(true);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: howItWorks.steps is an empty array'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when step is missing title field', () => {
        const annotation = {
          enabled: true,
          sections: {
            howItWorks: {
              enabled: true,
              steps: [
                {
                  description: 'Step description'
                }
              ]
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: howItWorks.steps[0] must have a title field'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when step is missing description field', () => {
        const annotation = {
          enabled: true,
          sections: {
            howItWorks: {
              enabled: true,
              steps: [
                {
                  title: 'Step Title'
                }
              ]
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: howItWorks.steps[0] must have a description field'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when step.stepNumber is not a number', () => {
        const annotation = {
          enabled: true,
          sections: {
            howItWorks: {
              enabled: true,
              steps: [
                {
                  title: 'Step Title',
                  description: 'Step description',
                  stepNumber: '1'
                }
              ]
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: howItWorks.steps[0].stepNumber must be a number'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return false when step.image is not a string', () => {
        const annotation = {
          enabled: true,
          sections: {
            howItWorks: {
              enabled: true,
              steps: [
                {
                  title: 'Step Title',
                  description: 'Step description',
                  image: 123
                }
              ]
            }
          }
        } as any;

        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const result = handler.validate(annotation);

        expect(result).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: howItWorks.steps[0].image must be a string'
        );
        consoleWarnSpy.mockRestore();
      });

      it('should return true for valid howItWorks section with minimal step', () => {
        const annotation = {
          enabled: true,
          sections: {
            howItWorks: {
              enabled: true,
              steps: [
                {
                  title: 'Step Title',
                  description: 'Step description'
                }
              ]
            }
          }
        };

        const result = handler.validate(annotation);
        expect(result).toBe(true);
      });

      it('should return true for valid howItWorks section with complete step', () => {
        const annotation = {
          enabled: true,
          sections: {
            howItWorks: {
              enabled: true,
              title: 'How It Works',
              steps: [
                {
                  title: 'Step Title',
                  description: 'Step description',
                  stepNumber: 1,
                  image: '/images/step1.jpg'
                }
              ]
            }
          }
        };

        const result = handler.validate(annotation);
        expect(result).toBe(true);
      });

      it('should return true when howItWorks section is disabled', () => {
        const annotation = {
          enabled: true,
          sections: {
            howItWorks: {
              enabled: false
            }
          }
        };

        const result = handler.validate(annotation);
        expect(result).toBe(true);
      });
    });
  });

  describe('apply', () => {
    describe('document-level application', () => {
      it('should set landingPageConfig on IR for valid annotation at document level', () => {
        const annotation = {
          enabled: true,
          sections: {
            hero: {
              enabled: true,
              headline: 'Welcome to Our App'
            }
          }
        };

        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-landing-page': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        handler.apply(annotation, context);

        expect(mockIR.landingPageConfig).toBeDefined();
        expect(mockIR.landingPageConfig?.enabled).toBe(true);
        expect(mockIR.landingPageConfig?.sections.hero).toBeDefined();
        expect(mockIR.landingPageConfig?.sections.hero?.enabled).toBe(true);
        expect(mockIR.landingPageConfig?.sections.hero?.headline).toBe('Welcome to Our App');
      });

      it('should preserve all section metadata when storing in IR', () => {
        const annotation = {
          enabled: true,
          sections: {
            hero: {
              enabled: true,
              headline: 'Welcome',
              subheadline: 'Subheadline',
              primaryCta: {
                text: 'Get Started',
                url: '/signup'
              },
              backgroundImage: '/bg.jpg'
            },
            features: {
              enabled: true,
              title: 'Features',
              items: [
                {
                  title: 'Feature 1',
                  description: 'Description 1',
                  icon: 'icon1'
                }
              ]
            }
          }
        };

        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-landing-page': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        handler.apply(annotation, context);

        expect(mockIR.landingPageConfig).toEqual(annotation);
      });

      it('should preserve unknown section types for extensibility', () => {
        const annotation = {
          enabled: true,
          sections: {
            hero: {
              enabled: true,
              headline: 'Welcome'
            },
            customSection: {
              enabled: true,
              customField: 'custom value'
            }
          }
        } as any;

        const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-landing-page': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        handler.apply(annotation, context);

        expect(mockIR.landingPageConfig).toBeDefined();
        expect((mockIR.landingPageConfig?.sections as any).customSection).toBeDefined();
        expect((mockIR.landingPageConfig?.sections as any).customSection.customField).toBe('custom value');
        expect(consoleInfoSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: unknown section type "customSection" will be preserved for extensibility'
        );
        consoleInfoSpy.mockRestore();
      });

      it('should log info for multiple unknown section types', () => {
        const annotation = {
          enabled: true,
          sections: {
            customSection1: {
              enabled: true
            },
            customSection2: {
              enabled: true
            }
          }
        } as any;

        const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-landing-page': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        handler.apply(annotation, context);

        expect(consoleInfoSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: unknown section type "customSection1" will be preserved for extensibility'
        );
        expect(consoleInfoSpy).toHaveBeenCalledWith(
          'x-uigen-landing-page: unknown section type "customSection2" will be preserved for extensibility'
        );
        consoleInfoSpy.mockRestore();
      });
    });

    describe('wrong context level warnings', () => {
      it('should log warning when applied at operation level', () => {
        const annotation = {
          enabled: true,
          sections: {
            hero: {
              enabled: true
            }
          }
        };

        const mockOperation: Operation = {
          id: 'getUsers',
          uigenId: 'get-users',
          method: 'GET',
          path: '/users',
          parameters: [],
          responses: {},
          viewHint: 'list'
        };

        const context: AnnotationContext = {
          element: { operationId: 'getUsers', 'x-uigen-landing-page': annotation } as any,
          path: '/users',
          method: 'GET',
          utils: mockUtils,
          ir: mockIR,
          operation: mockOperation
        };

        handler.apply(annotation, context);

        expect(mockUtils.logWarning).toHaveBeenCalledWith(
          'x-uigen-landing-page at /users: can only be applied at document level, not at operation level'
        );
        expect(mockIR.landingPageConfig).toBeUndefined();
      });

      it('should log warning when applied at field level', () => {
        const annotation = {
          enabled: true,
          sections: {
            hero: {
              enabled: true
            }
          }
        };

        const mockSchemaNode: SchemaNode = {
          type: 'string',
          key: 'name',
          label: 'Name',
          required: true
        };

        const context: AnnotationContext = {
          element: { type: 'string', 'x-uigen-landing-page': annotation } as any,
          path: '/components/schemas/User/properties/name',
          utils: mockUtils,
          ir: mockIR,
          schemaNode: mockSchemaNode
        };

        handler.apply(annotation, context);

        expect(mockUtils.logWarning).toHaveBeenCalledWith(
          'x-uigen-landing-page at /components/schemas/User/properties/name: can only be applied at document level, not at field level'
        );
        expect(mockIR.landingPageConfig).toBeUndefined();
      });

      it('should log generic warning for other wrong context levels', () => {
        const annotation = {
          enabled: true,
          sections: {
            hero: {
              enabled: true
            }
          }
        };

        const context: AnnotationContext = {
          element: { 'x-uigen-landing-page': annotation } as any,
          path: '/paths/users',
          utils: mockUtils,
          ir: mockIR
        };

        handler.apply(annotation, context);

        expect(mockUtils.logWarning).toHaveBeenCalledWith(
          'x-uigen-landing-page at /paths/users: can only be applied at document level'
        );
        expect(mockIR.landingPageConfig).toBeUndefined();
      });
    });

    describe('multiple annotations handling', () => {
      it('should use first annotation and log warning when multiple present at document level', () => {
        const firstAnnotation = {
          enabled: true,
          sections: {
            hero: {
              enabled: true,
              headline: 'First Annotation'
            }
          }
        };

        const secondAnnotation = {
          enabled: true,
          sections: {
            hero: {
              enabled: true,
              headline: 'Second Annotation'
            }
          }
        };

        const context1: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-landing-page': firstAnnotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        const context2: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-landing-page': secondAnnotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        // Apply first annotation
        handler.apply(firstAnnotation, context1);
        expect(mockIR.landingPageConfig?.sections.hero?.headline).toBe('First Annotation');

        // Try to apply second annotation
        handler.apply(secondAnnotation, context2);

        // Should still have first annotation
        expect(mockIR.landingPageConfig?.sections.hero?.headline).toBe('First Annotation');
        expect(mockUtils.logWarning).toHaveBeenCalledWith(
          'x-uigen-landing-page at document: multiple landing page annotations found at document level, using first annotation'
        );
      });
    });

    describe('error handling', () => {
      it('should handle apply errors gracefully', () => {
        const annotation = {
          enabled: true,
          sections: {
            hero: {
              enabled: true
            }
          }
        };

        const faultyIR = {
          get landingPageConfig() {
            throw new Error('Apply error');
          },
          set landingPageConfig(value: any) {
            throw new Error('Apply error');
          }
        } as any;

        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-landing-page': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: faultyIR
        };

        handler.apply(annotation, context);

        expect(mockUtils.logWarning).toHaveBeenCalledWith(
          expect.stringContaining('apply error')
        );
      });
    });

    describe('round-trip property', () => {
      it('should preserve configuration through parse-serialize-parse cycle', () => {
        const annotation = {
          enabled: true,
          sections: {
            hero: {
              enabled: true,
              headline: 'Welcome',
              subheadline: 'Subheadline',
              primaryCta: {
                text: 'Get Started',
                url: '/signup'
              },
              secondaryCta: {
                text: 'Learn More',
                url: '/about'
              },
              backgroundImage: '/bg.jpg'
            },
            features: {
              enabled: true,
              title: 'Features',
              items: [
                {
                  title: 'Feature 1',
                  description: 'Description 1',
                  icon: 'icon1',
                  image: '/img1.jpg'
                },
                {
                  title: 'Feature 2',
                  description: 'Description 2'
                }
              ]
            },
            pricing: {
              enabled: true,
              title: 'Pricing',
              plans: [
                {
                  name: 'Starter',
                  price: '$9/month',
                  features: ['Feature 1', 'Feature 2'],
                  highlighted: true,
                  ctaText: 'Start Free',
                  ctaUrl: '/signup'
                }
              ]
            }
          }
        };

        const context: AnnotationContext = {
          element: { openapi: '3.0.0', 'x-uigen-landing-page': annotation } as any,
          path: 'document',
          utils: mockUtils,
          ir: mockIR
        };

        handler.apply(annotation, context);

        // Simulate serialization and deserialization
        const serialized = JSON.stringify(mockIR.landingPageConfig);
        const deserialized = JSON.parse(serialized);

        expect(deserialized).toEqual(annotation);
      });
    });
  });
});
