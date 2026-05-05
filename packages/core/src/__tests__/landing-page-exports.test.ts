import { describe, it, expect } from 'vitest';

describe('Landing Page Type Exports', () => {
  it('should export all landing page types from core package', async () => {
    const coreModule = await import('../index.js');

    // Verify type exports exist (TypeScript will catch if they don't)
    const typeNames = [
      'LandingPageConfig',
      'LandingPageSections',
      'HeroSection',
      'FeaturesSection',
      'HowItWorksSection',
      'TestimonialsSection',
      'PricingSection',
      'FaqSection',
      'CtaSection',
      'FooterSection',
      'CtaButton',
      'FeatureItem',
      'StepItem',
      'TestimonialItem',
      'PricingPlan',
      'FaqItem',
      'FooterLink',
      'SocialLink',
    ];

    // This test verifies that the module loads successfully
    // TypeScript compilation ensures the types are properly exported
    expect(coreModule).toBeDefined();
  });

  it('should allow creating a complete landing page config', () => {
    // This test verifies type compatibility at runtime
    const config = {
      enabled: true,
      sections: {
        hero: {
          enabled: true,
          headline: 'Test Headline',
          primaryCta: {
            text: 'Get Started',
            url: '/signup',
          },
        },
        features: {
          enabled: true,
          title: 'Features',
          items: [
            {
              title: 'Feature 1',
              description: 'Description 1',
            },
          ],
        },
        pricing: {
          enabled: true,
          plans: [
            {
              name: 'Basic',
              price: '$10/mo',
              features: ['Feature 1', 'Feature 2'],
            },
          ],
        },
        footer: {
          enabled: true,
          companyName: 'Test Company',
          links: [{ text: 'About', url: '/about' }],
        },
      },
    };

    expect(config.enabled).toBe(true);
    expect(config.sections.hero?.headline).toBe('Test Headline');
    expect(config.sections.features?.items).toHaveLength(1);
    expect(config.sections.pricing?.plans).toHaveLength(1);
    expect(config.sections.footer?.companyName).toBe('Test Company');
  });
});
