import type { AnnotationHandler, AnnotationContext } from '../types.js';
import type { LandingPageConfig } from '../../../ir/types.js';

/**
 * Internal shape of the raw x-uigen-landing-page annotation before validation.
 */
interface LandingPageAnnotation {
  enabled: boolean;
  sections: {
    hero?: {
      enabled: boolean;
      headline?: string;
      subheadline?: string;
      primaryCta?: {
        text: string;
        url: string;
      };
      secondaryCta?: {
        text: string;
        url: string;
      };
      backgroundImage?: string;
    };
    features?: {
      enabled: boolean;
      title?: string;
      items?: Array<{
        title: string;
        description: string;
        icon?: string;
        image?: string;
      }>;
    };
    howItWorks?: {
      enabled: boolean;
      title?: string;
      steps?: Array<{
        title: string;
        description: string;
        stepNumber?: number;
        image?: string;
      }>;
    };
    testimonials?: {
      enabled: boolean;
      title?: string;
      items?: Array<{
        quote: string;
        author: string;
        authorTitle?: string;
        authorImage?: string;
        rating?: number;
      }>;
    };
    pricing?: {
      enabled: boolean;
      title?: string;
      plans?: Array<{
        name: string;
        price: string;
        features: string[];
        highlighted?: boolean;
        ctaText?: string;
        ctaUrl?: string;
      }>;
    };
    faq?: {
      enabled: boolean;
      title?: string;
      items?: Array<{
        question: string;
        answer: string;
        category?: string;
      }>;
    };
    cta?: {
      enabled: boolean;
      headline?: string;
      subheadline?: string;
      primaryCta?: {
        text: string;
        url: string;
      };
      secondaryCta?: {
        text: string;
        url: string;
      };
      backgroundStyle?: string;
      backgroundImage?: string;
    };
    footer?: {
      enabled: boolean;
      companyName?: string;
      links?: Array<{
        text: string;
        url: string;
      }>;
      socialLinks?: Array<{
        platform: string;
        url: string;
      }>;
      copyrightText?: string;
      legalLinks?: Array<{
        text: string;
        url: string;
      }>;
    };
  };
}

/**
 * Metadata interface for annotation handlers.
 */
interface AnnotationMetadata {
  name: string;
  description: string;
  targetType: 'field' | 'operation' | 'resource' | 'document' | string[];
  parameterSchema: {
    type: 'object' | 'string' | 'boolean' | 'number';
    properties?: Record<string, any>;
    required?: string[];
  };
  examples: Array<{ description: string; value: unknown }>;
}

/**
 * Handler for x-uigen-landing-page annotation.
 * Configures landing page generation for UIGen applications.
 * 
 * Requirements: 14.1, 14.2, 14.3, 14.4
 */
export class LandingPageHandler implements AnnotationHandler<LandingPageAnnotation> {
  public readonly name = 'x-uigen-landing-page';

  public static readonly metadata: AnnotationMetadata = {
    name: 'x-uigen-landing-page',
    description: 'Configures landing page generation with sections like hero, features, pricing, testimonials, and CTAs',
    targetType: 'document',
    parameterSchema: {
      type: 'object',
      properties: {
        enabled: {
          type: 'boolean',
          description: 'Master toggle for landing page generation'
        },
        sections: {
          type: 'object',
          description: 'Configuration for landing page sections',
          properties: {
            hero: {
              type: 'object',
              description: 'Hero section configuration'
            },
            features: {
              type: 'object',
              description: 'Features section configuration'
            },
            howItWorks: {
              type: 'object',
              description: 'How it works section configuration'
            },
            testimonials: {
              type: 'object',
              description: 'Testimonials section configuration'
            },
            pricing: {
              type: 'object',
              description: 'Pricing section configuration'
            },
            faq: {
              type: 'object',
              description: 'FAQ section configuration'
            },
            cta: {
              type: 'object',
              description: 'Call-to-action section configuration'
            },
            footer: {
              type: 'object',
              description: 'Footer section configuration'
            }
          }
        }
      },
      required: ['enabled', 'sections']
    },
    examples: [
      {
        description: 'Minimal landing page with hero section',
        value: {
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
        }
      },
      {
        description: 'Complete landing page with multiple sections',
        value: {
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
              }
            },
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
                }
              ]
            },
            pricing: {
              enabled: true,
              title: 'Simple Pricing',
              plans: [
                {
                  name: 'Starter',
                  price: '$9/month',
                  features: ['Up to 10 users', 'Basic features', 'Email support'],
                  ctaText: 'Start Free',
                  ctaUrl: '/signup?plan=starter'
                }
              ]
            }
          }
        }
      }
    ]
  };

  /**
   * Extract the x-uigen-landing-page annotation value from the spec element.
   * Only accepts plain objects (not null, not arrays).
   * 
   * @param context - The annotation context containing the spec element
   * @returns The raw annotation object or undefined if absent/invalid type
   */
  extract(context: AnnotationContext): LandingPageAnnotation | undefined {
    try {
      const element = context.element as any;
      const annotation = element['x-uigen-landing-page'];

      if (annotation === undefined) {
        return undefined;
      }

      if (typeof annotation !== 'object' || annotation === null || Array.isArray(annotation)) {
        context.utils.logWarning(
          `x-uigen-landing-page at ${context.path} must be a plain object, found ${
            annotation === null ? 'null' : Array.isArray(annotation) ? 'array' : typeof annotation
          }`
        );
        return undefined;
      }

      return annotation as LandingPageAnnotation;
    } catch (error) {
      context.utils.logWarning(`x-uigen-landing-page at ${context.path}: extraction error - ${error}`);
      return undefined;
    }
  }

  /**
   * Validate that the annotation has all required fields and valid values.
   * 
   * @param value - The extracted annotation object
   * @returns true if valid, false otherwise (never throws)
   */
  validate(value: LandingPageAnnotation): boolean {
    try {
      // Validate enabled field (required, must be boolean)
      if (value.enabled === undefined || value.enabled === null) {
        console.warn('x-uigen-landing-page: enabled field is required');
        return false;
      }

      if (typeof value.enabled !== 'boolean') {
        console.warn('x-uigen-landing-page: enabled field must be a boolean');
        return false;
      }

      // Validate sections field (required, must be plain object)
      if (value.sections === undefined || value.sections === null) {
        console.warn('x-uigen-landing-page: sections field is required');
        return false;
      }

      if (typeof value.sections !== 'object' || Array.isArray(value.sections)) {
        console.warn('x-uigen-landing-page: sections field must be a plain object');
        return false;
      }

      // Validate hero section (if present)
      if (value.sections.hero !== undefined) {
        if (!this.validateHeroSection(value.sections.hero)) {
          return false;
        }
      }

      // Validate features section (if present)
      if (value.sections.features !== undefined) {
        if (!this.validateFeaturesSection(value.sections.features)) {
          return false;
        }
      }

      // Validate howItWorks section (if present)
      if (value.sections.howItWorks !== undefined) {
        if (!this.validateHowItWorksSection(value.sections.howItWorks)) {
          return false;
        }
      }

      // Validate testimonials section (if present)
      if (value.sections.testimonials !== undefined) {
        if (!this.validateTestimonialsSection(value.sections.testimonials)) {
          return false;
        }
      }

      // Validate pricing section (if present)
      if (value.sections.pricing !== undefined) {
        if (!this.validatePricingSection(value.sections.pricing)) {
          return false;
        }
      }

      // Validate faq section (if present)
      if (value.sections.faq !== undefined) {
        if (!this.validateFaqSection(value.sections.faq)) {
          return false;
        }
      }

      // Validate cta section (if present)
      if (value.sections.cta !== undefined) {
        if (!this.validateCtaSection(value.sections.cta)) {
          return false;
        }
      }

      // Validate footer section (if present)
      if (value.sections.footer !== undefined) {
        if (!this.validateFooterSection(value.sections.footer)) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.warn(`x-uigen-landing-page: validation error - ${error}`);
      return false;
    }
  }

  /**
   * Validate hero section configuration.
   * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
   * 
   * @param hero - The hero section configuration
   * @returns true if valid, false otherwise
   */
  private validateHeroSection(hero: any): boolean {
    // Validate hero.enabled is boolean when section present (Requirement 4.1)
    if (hero.enabled === undefined || hero.enabled === null) {
      console.warn('x-uigen-landing-page: hero.enabled field is required');
      return false;
    }

    if (typeof hero.enabled !== 'boolean') {
      console.warn('x-uigen-landing-page: hero.enabled must be a boolean');
      return false;
    }

    // Validate hero.headline is non-empty string (if provided) (Requirement 4.2)
    if (hero.headline !== undefined) {
      if (typeof hero.headline !== 'string') {
        console.warn('x-uigen-landing-page: hero.headline must be a string');
        return false;
      }
      if (hero.headline.trim() === '') {
        console.warn('x-uigen-landing-page: hero.headline must be a non-empty string');
        return false;
      }
    }

    // Validate hero.subheadline is non-empty string (if provided) (Requirement 4.3)
    if (hero.subheadline !== undefined) {
      if (typeof hero.subheadline !== 'string') {
        console.warn('x-uigen-landing-page: hero.subheadline must be a string');
        return false;
      }
      if (hero.subheadline.trim() === '') {
        console.warn('x-uigen-landing-page: hero.subheadline must be a non-empty string');
        return false;
      }
    }

    // Validate hero.primaryCta has text and url fields (if provided) (Requirement 4.4)
    if (hero.primaryCta !== undefined) {
      if (!this.validateCtaButton(hero.primaryCta, 'hero.primaryCta')) {
        return false;
      }
    }

    // Validate hero.secondaryCta has text and url fields (if provided) (Requirement 4.5)
    if (hero.secondaryCta !== undefined) {
      if (!this.validateCtaButton(hero.secondaryCta, 'hero.secondaryCta')) {
        return false;
      }
    }

    // Validate hero.backgroundImage is string (if provided) (Requirement 4.6)
    if (hero.backgroundImage !== undefined) {
      if (typeof hero.backgroundImage !== 'string') {
        console.warn('x-uigen-landing-page: hero.backgroundImage must be a string');
        return false;
      }
    }

    return true;
  }

  /**
   * Validate features section configuration.
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
   * 
   * @param features - The features section configuration
   * @returns true if valid, false otherwise
   */
  private validateFeaturesSection(features: any): boolean {
    // Validate features.enabled is boolean when section present (Requirement 5.1)
    if (features.enabled === undefined || features.enabled === null) {
      console.warn('x-uigen-landing-page: features.enabled field is required');
      return false;
    }

    if (typeof features.enabled !== 'boolean') {
      console.warn('x-uigen-landing-page: features.enabled must be a boolean');
      return false;
    }

    // Skip further validation if section is disabled
    if (!features.enabled) {
      return true;
    }

    // Validate features.title is string (if provided) (Requirement 5.2)
    if (features.title !== undefined) {
      if (typeof features.title !== 'string') {
        console.warn('x-uigen-landing-page: features.title must be a string');
        return false;
      }
    }

    // Validate features.items is array (if provided) (Requirement 5.3)
    if (features.items !== undefined) {
      if (!Array.isArray(features.items)) {
        console.warn('x-uigen-landing-page: features.items must be an array');
        return false;
      }

      // Log warning for empty features.items array (Requirement 5.6)
      if (features.items.length === 0) {
        console.warn('x-uigen-landing-page: features.items is an empty array');
      }

      // Validate each feature item has title and description fields (Requirement 5.4)
      for (let i = 0; i < features.items.length; i++) {
        const item = features.items[i];

        if (typeof item !== 'object' || item === null || Array.isArray(item)) {
          console.warn(`x-uigen-landing-page: features.items[${i}] must be an object`);
          return false;
        }

        // Validate title field is required
        if (item.title === undefined || item.title === null) {
          console.warn(`x-uigen-landing-page: features.items[${i}] must have a title field`);
          return false;
        }

        if (typeof item.title !== 'string' || item.title.trim() === '') {
          console.warn(`x-uigen-landing-page: features.items[${i}].title must be a non-empty string`);
          return false;
        }

        // Validate description field is required
        if (item.description === undefined || item.description === null) {
          console.warn(`x-uigen-landing-page: features.items[${i}] must have a description field`);
          return false;
        }

        if (typeof item.description !== 'string' || item.description.trim() === '') {
          console.warn(`x-uigen-landing-page: features.items[${i}].description must be a non-empty string`);
          return false;
        }

        // Validate icon field is string (if provided) (Requirement 5.5)
        if (item.icon !== undefined) {
          if (typeof item.icon !== 'string') {
            console.warn(`x-uigen-landing-page: features.items[${i}].icon must be a string`);
            return false;
          }
        }

        // Validate image field is string (if provided) (Requirement 5.5)
        if (item.image !== undefined) {
          if (typeof item.image !== 'string') {
            console.warn(`x-uigen-landing-page: features.items[${i}].image must be a string`);
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * Validate howItWorks section configuration.
   * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
   * 
   * @param howItWorks - The howItWorks section configuration
   * @returns true if valid, false otherwise
   */
  private validateHowItWorksSection(howItWorks: any): boolean {
    // Validate howItWorks.enabled is boolean when section present (Requirement 6.1)
    if (howItWorks.enabled === undefined || howItWorks.enabled === null) {
      console.warn('x-uigen-landing-page: howItWorks.enabled field is required');
      return false;
    }

    if (typeof howItWorks.enabled !== 'boolean') {
      console.warn('x-uigen-landing-page: howItWorks.enabled must be a boolean');
      return false;
    }

    // Skip further validation if section is disabled
    if (!howItWorks.enabled) {
      return true;
    }

    // Validate howItWorks.title is string (if provided) (Requirement 6.2)
    if (howItWorks.title !== undefined) {
      if (typeof howItWorks.title !== 'string') {
        console.warn('x-uigen-landing-page: howItWorks.title must be a string');
        return false;
      }
    }

    // Validate howItWorks.steps is array (if provided) (Requirement 6.3)
    if (howItWorks.steps !== undefined) {
      if (!Array.isArray(howItWorks.steps)) {
        console.warn('x-uigen-landing-page: howItWorks.steps must be an array');
        return false;
      }

      // Log warning for empty howItWorks.steps array (Requirement 6.6)
      if (howItWorks.steps.length === 0) {
        console.warn('x-uigen-landing-page: howItWorks.steps is an empty array');
      }

      // Validate each step has title and description fields (Requirement 6.4)
      for (let i = 0; i < howItWorks.steps.length; i++) {
        const step = howItWorks.steps[i];

        if (typeof step !== 'object' || step === null || Array.isArray(step)) {
          console.warn(`x-uigen-landing-page: howItWorks.steps[${i}] must be an object`);
          return false;
        }

        // Validate title field is required
        if (step.title === undefined || step.title === null) {
          console.warn(`x-uigen-landing-page: howItWorks.steps[${i}] must have a title field`);
          return false;
        }

        if (typeof step.title !== 'string' || step.title.trim() === '') {
          console.warn(`x-uigen-landing-page: howItWorks.steps[${i}].title must be a non-empty string`);
          return false;
        }

        // Validate description field is required
        if (step.description === undefined || step.description === null) {
          console.warn(`x-uigen-landing-page: howItWorks.steps[${i}] must have a description field`);
          return false;
        }

        if (typeof step.description !== 'string' || step.description.trim() === '') {
          console.warn(`x-uigen-landing-page: howItWorks.steps[${i}].description must be a non-empty string`);
          return false;
        }

        // Validate stepNumber field is number (if provided) (Requirement 6.5)
        if (step.stepNumber !== undefined) {
          if (typeof step.stepNumber !== 'number') {
            console.warn(`x-uigen-landing-page: howItWorks.steps[${i}].stepNumber must be a number`);
            return false;
          }
        }

        // Validate image field is string (if provided) (Requirement 6.5)
        if (step.image !== undefined) {
          if (typeof step.image !== 'string') {
            console.warn(`x-uigen-landing-page: howItWorks.steps[${i}].image must be a string`);
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * Validate testimonials section configuration.
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
   * 
   * @param testimonials - The testimonials section configuration
   * @returns true if valid, false otherwise
   */
  private validateTestimonialsSection(testimonials: any): boolean {
    // Validate testimonials.enabled is boolean when section present (Requirement 7.1)
    if (testimonials.enabled === undefined || testimonials.enabled === null) {
      console.warn('x-uigen-landing-page: testimonials.enabled field is required');
      return false;
    }

    if (typeof testimonials.enabled !== 'boolean') {
      console.warn('x-uigen-landing-page: testimonials.enabled must be a boolean');
      return false;
    }

    // Skip further validation if section is disabled
    if (!testimonials.enabled) {
      return true;
    }

    // Validate testimonials.title is string (if provided)
    if (testimonials.title !== undefined) {
      if (typeof testimonials.title !== 'string') {
        console.warn('x-uigen-landing-page: testimonials.title must be a string');
        return false;
      }
    }

    // Validate testimonials.items is array (if provided) (Requirement 7.2)
    if (testimonials.items !== undefined) {
      if (!Array.isArray(testimonials.items)) {
        console.warn('x-uigen-landing-page: testimonials.items must be an array');
        return false;
      }

      // Log warning for empty testimonials.items array
      if (testimonials.items.length === 0) {
        console.warn('x-uigen-landing-page: testimonials.items is an empty array');
      }

      // Validate each testimonial has quote and author fields (Requirement 7.3)
      for (let i = 0; i < testimonials.items.length; i++) {
        const item = testimonials.items[i];

        if (typeof item !== 'object' || item === null || Array.isArray(item)) {
          console.warn(`x-uigen-landing-page: testimonials.items[${i}] must be an object`);
          return false;
        }

        // Validate quote field is required
        if (item.quote === undefined || item.quote === null) {
          console.warn(`x-uigen-landing-page: testimonials.items[${i}] must have a quote field`);
          return false;
        }

        if (typeof item.quote !== 'string' || item.quote.trim() === '') {
          console.warn(`x-uigen-landing-page: testimonials.items[${i}].quote must be a non-empty string`);
          return false;
        }

        // Validate author field is required
        if (item.author === undefined || item.author === null) {
          console.warn(`x-uigen-landing-page: testimonials.items[${i}] must have an author field`);
          return false;
        }

        if (typeof item.author !== 'string' || item.author.trim() === '') {
          console.warn(`x-uigen-landing-page: testimonials.items[${i}].author must be a non-empty string`);
          return false;
        }

        // Validate authorTitle field is string (if provided) (Requirement 7.4)
        if (item.authorTitle !== undefined) {
          if (typeof item.authorTitle !== 'string') {
            console.warn(`x-uigen-landing-page: testimonials.items[${i}].authorTitle must be a string`);
            return false;
          }
        }

        // Validate authorImage field is string (if provided) (Requirement 7.4)
        if (item.authorImage !== undefined) {
          if (typeof item.authorImage !== 'string') {
            console.warn(`x-uigen-landing-page: testimonials.items[${i}].authorImage must be a string`);
            return false;
          }
        }

        // Validate rating field is 1-5 range (if provided) (Requirement 7.5, 7.6)
        if (item.rating !== undefined) {
          if (typeof item.rating !== 'number') {
            console.warn(`x-uigen-landing-page: testimonials.items[${i}].rating must be a number`);
            return false;
          }

          if (item.rating < 1 || item.rating > 5) {
            console.warn(`x-uigen-landing-page: testimonials.items[${i}].rating must be between 1 and 5`);
          }
        }
      }
    }

    return true;
  }

  /**
   * Validate pricing section configuration.
   * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
   * 
   * @param pricing - The pricing section configuration
   * @returns true if valid, false otherwise
   */
  private validatePricingSection(pricing: any): boolean {
    // Validate pricing.enabled is boolean when section present (Requirement 8.1)
    if (pricing.enabled === undefined || pricing.enabled === null) {
      console.warn('x-uigen-landing-page: pricing.enabled field is required');
      return false;
    }

    if (typeof pricing.enabled !== 'boolean') {
      console.warn('x-uigen-landing-page: pricing.enabled must be a boolean');
      return false;
    }

    // Skip further validation if section is disabled
    if (!pricing.enabled) {
      return true;
    }

    // Validate pricing.title is string (if provided)
    if (pricing.title !== undefined) {
      if (typeof pricing.title !== 'string') {
        console.warn('x-uigen-landing-page: pricing.title must be a string');
        return false;
      }
    }

    // Validate pricing.plans is array (if provided) (Requirement 8.2)
    if (pricing.plans !== undefined) {
      if (!Array.isArray(pricing.plans)) {
        console.warn('x-uigen-landing-page: pricing.plans must be an array');
        return false;
      }

      // Log warning for empty pricing.plans array (Requirement 8.6)
      if (pricing.plans.length === 0) {
        console.warn('x-uigen-landing-page: pricing.plans is an empty array');
      }

      // Validate each plan has name, price, and features fields (Requirement 8.3)
      for (let i = 0; i < pricing.plans.length; i++) {
        const plan = pricing.plans[i];

        if (typeof plan !== 'object' || plan === null || Array.isArray(plan)) {
          console.warn(`x-uigen-landing-page: pricing.plans[${i}] must be an object`);
          return false;
        }

        // Validate name field is required
        if (plan.name === undefined || plan.name === null) {
          console.warn(`x-uigen-landing-page: pricing.plans[${i}] must have a name field`);
          return false;
        }

        if (typeof plan.name !== 'string' || plan.name.trim() === '') {
          console.warn(`x-uigen-landing-page: pricing.plans[${i}].name must be a non-empty string`);
          return false;
        }

        // Validate price field is required
        if (plan.price === undefined || plan.price === null) {
          console.warn(`x-uigen-landing-page: pricing.plans[${i}] must have a price field`);
          return false;
        }

        if (typeof plan.price !== 'string' || plan.price.trim() === '') {
          console.warn(`x-uigen-landing-page: pricing.plans[${i}].price must be a non-empty string`);
          return false;
        }

        // Validate features field is required and is array of strings (Requirement 8.4)
        if (plan.features === undefined || plan.features === null) {
          console.warn(`x-uigen-landing-page: pricing.plans[${i}] must have a features field`);
          return false;
        }

        if (!Array.isArray(plan.features)) {
          console.warn(`x-uigen-landing-page: pricing.plans[${i}].features must be an array`);
          return false;
        }

        for (let j = 0; j < plan.features.length; j++) {
          if (typeof plan.features[j] !== 'string') {
            console.warn(`x-uigen-landing-page: pricing.plans[${i}].features[${j}] must be a string`);
            return false;
          }
        }

        // Validate highlighted field is boolean (if provided) (Requirement 8.5)
        if (plan.highlighted !== undefined) {
          if (typeof plan.highlighted !== 'boolean') {
            console.warn(`x-uigen-landing-page: pricing.plans[${i}].highlighted must be a boolean`);
            return false;
          }
        }

        // Validate ctaText field is string (if provided) (Requirement 8.5)
        if (plan.ctaText !== undefined) {
          if (typeof plan.ctaText !== 'string') {
            console.warn(`x-uigen-landing-page: pricing.plans[${i}].ctaText must be a string`);
            return false;
          }
        }

        // Validate ctaUrl field is string (if provided) (Requirement 8.5)
        if (plan.ctaUrl !== undefined) {
          if (typeof plan.ctaUrl !== 'string') {
            console.warn(`x-uigen-landing-page: pricing.plans[${i}].ctaUrl must be a string`);
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * Validate faq section configuration.
   * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
   * 
   * @param faq - The faq section configuration
   * @returns true if valid, false otherwise
   */
  private validateFaqSection(faq: any): boolean {
    // Validate faq.enabled is boolean when section present (Requirement 9.1)
    if (faq.enabled === undefined || faq.enabled === null) {
      console.warn('x-uigen-landing-page: faq.enabled field is required');
      return false;
    }

    if (typeof faq.enabled !== 'boolean') {
      console.warn('x-uigen-landing-page: faq.enabled must be a boolean');
      return false;
    }

    // Skip further validation if section is disabled
    if (!faq.enabled) {
      return true;
    }

    // Validate faq.title is string (if provided)
    if (faq.title !== undefined) {
      if (typeof faq.title !== 'string') {
        console.warn('x-uigen-landing-page: faq.title must be a string');
        return false;
      }
    }

    // Validate faq.items is array (if provided) (Requirement 9.2)
    if (faq.items !== undefined) {
      if (!Array.isArray(faq.items)) {
        console.warn('x-uigen-landing-page: faq.items must be an array');
        return false;
      }

      // Log warning for empty faq.items array (Requirement 9.6)
      if (faq.items.length === 0) {
        console.warn('x-uigen-landing-page: faq.items is an empty array');
      }

      // Validate each FAQ item has question and answer fields (Requirement 9.3, 9.4)
      for (let i = 0; i < faq.items.length; i++) {
        const item = faq.items[i];

        if (typeof item !== 'object' || item === null || Array.isArray(item)) {
          console.warn(`x-uigen-landing-page: faq.items[${i}] must be an object`);
          return false;
        }

        // Validate question field is required and non-empty string
        if (item.question === undefined || item.question === null) {
          console.warn(`x-uigen-landing-page: faq.items[${i}] must have a question field`);
          return false;
        }

        if (typeof item.question !== 'string' || item.question.trim() === '') {
          console.warn(`x-uigen-landing-page: faq.items[${i}].question must be a non-empty string`);
          return false;
        }

        // Validate answer field is required and non-empty string
        if (item.answer === undefined || item.answer === null) {
          console.warn(`x-uigen-landing-page: faq.items[${i}] must have an answer field`);
          return false;
        }

        if (typeof item.answer !== 'string' || item.answer.trim() === '') {
          console.warn(`x-uigen-landing-page: faq.items[${i}].answer must be a non-empty string`);
          return false;
        }

        // Validate category field is string (if provided) (Requirement 9.5)
        if (item.category !== undefined) {
          if (typeof item.category !== 'string') {
            console.warn(`x-uigen-landing-page: faq.items[${i}].category must be a string`);
            return false;
          }
        }
      }
    }

    return true;
  }

  /**
   * Validate cta section configuration.
   * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
   * 
   * @param cta - The cta section configuration
   * @returns true if valid, false otherwise
   */
  private validateCtaSection(cta: any): boolean {
    // Validate cta.enabled is boolean when section present (Requirement 10.1)
    if (cta.enabled === undefined || cta.enabled === null) {
      console.warn('x-uigen-landing-page: cta.enabled field is required');
      return false;
    }

    if (typeof cta.enabled !== 'boolean') {
      console.warn('x-uigen-landing-page: cta.enabled must be a boolean');
      return false;
    }

    // Skip further validation if section is disabled
    if (!cta.enabled) {
      return true;
    }

    // Validate cta.headline is non-empty string (if provided) (Requirement 10.4)
    if (cta.headline !== undefined) {
      if (typeof cta.headline !== 'string') {
        console.warn('x-uigen-landing-page: cta.headline must be a string');
        return false;
      }

      if (cta.headline.trim() === '') {
        console.warn('x-uigen-landing-page: cta.headline must be a non-empty string');
        return false;
      }
    }

    // Validate cta.subheadline is string (if provided)
    if (cta.subheadline !== undefined) {
      if (typeof cta.subheadline !== 'string') {
        console.warn('x-uigen-landing-page: cta.subheadline must be a string');
        return false;
      }
    }

    // Validate cta.primaryCta has text and url fields (if provided) (Requirement 10.2)
    if (cta.primaryCta !== undefined) {
      if (!this.validateCtaButton(cta.primaryCta, 'cta.primaryCta')) {
        return false;
      }
    }

    // Validate cta.secondaryCta has text and url fields (if provided) (Requirement 10.3)
    if (cta.secondaryCta !== undefined) {
      if (!this.validateCtaButton(cta.secondaryCta, 'cta.secondaryCta')) {
        return false;
      }
    }

    // Validate cta.backgroundStyle is string (if provided) (Requirement 10.5)
    if (cta.backgroundStyle !== undefined) {
      if (typeof cta.backgroundStyle !== 'string') {
        console.warn('x-uigen-landing-page: cta.backgroundStyle must be a string');
        return false;
      }
    }

    // Validate cta.backgroundImage is string (if provided) (Requirement 10.6)
    if (cta.backgroundImage !== undefined) {
      if (typeof cta.backgroundImage !== 'string') {
        console.warn('x-uigen-landing-page: cta.backgroundImage must be a string');
        return false;
      }
    }

    return true;
  }

  /**
   * Validate footer section configuration.
   * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6
   * 
   * @param footer - The footer section configuration
   * @returns true if valid, false otherwise
   */
  private validateFooterSection(footer: any): boolean {
    // Validate footer.enabled is boolean when section present (Requirement 11.1)
    if (footer.enabled === undefined || footer.enabled === null) {
      console.warn('x-uigen-landing-page: footer.enabled field is required');
      return false;
    }

    if (typeof footer.enabled !== 'boolean') {
      console.warn('x-uigen-landing-page: footer.enabled must be a boolean');
      return false;
    }

    // Skip further validation if section is disabled
    if (!footer.enabled) {
      return true;
    }

    // Validate footer.companyName is string (if provided)
    if (footer.companyName !== undefined) {
      if (typeof footer.companyName !== 'string') {
        console.warn('x-uigen-landing-page: footer.companyName must be a string');
        return false;
      }
    }

    // Validate footer.links is array (if provided) (Requirement 11.2)
    if (footer.links !== undefined) {
      if (!Array.isArray(footer.links)) {
        console.warn('x-uigen-landing-page: footer.links must be an array');
        return false;
      }

      // Validate each link has text and url fields (Requirement 11.3)
      for (let i = 0; i < footer.links.length; i++) {
        const link = footer.links[i];

        if (typeof link !== 'object' || link === null || Array.isArray(link)) {
          console.warn(`x-uigen-landing-page: footer.links[${i}] must be an object`);
          return false;
        }

        if (link.text === undefined || link.text === null) {
          console.warn(`x-uigen-landing-page: footer.links[${i}] must have a text field`);
          return false;
        }

        if (typeof link.text !== 'string' || link.text.trim() === '') {
          console.warn(`x-uigen-landing-page: footer.links[${i}].text must be a non-empty string`);
          return false;
        }

        if (link.url === undefined || link.url === null) {
          console.warn(`x-uigen-landing-page: footer.links[${i}] must have a url field`);
          return false;
        }

        if (typeof link.url !== 'string' || link.url.trim() === '') {
          console.warn(`x-uigen-landing-page: footer.links[${i}].url must be a non-empty string`);
          return false;
        }
      }
    }

    // Validate footer.socialLinks is array of objects with platform and url (if provided) (Requirement 11.4)
    if (footer.socialLinks !== undefined) {
      if (!Array.isArray(footer.socialLinks)) {
        console.warn('x-uigen-landing-page: footer.socialLinks must be an array');
        return false;
      }

      for (let i = 0; i < footer.socialLinks.length; i++) {
        const socialLink = footer.socialLinks[i];

        if (typeof socialLink !== 'object' || socialLink === null || Array.isArray(socialLink)) {
          console.warn(`x-uigen-landing-page: footer.socialLinks[${i}] must be an object`);
          return false;
        }

        if (socialLink.platform === undefined || socialLink.platform === null) {
          console.warn(`x-uigen-landing-page: footer.socialLinks[${i}] must have a platform field`);
          return false;
        }

        if (typeof socialLink.platform !== 'string' || socialLink.platform.trim() === '') {
          console.warn(`x-uigen-landing-page: footer.socialLinks[${i}].platform must be a non-empty string`);
          return false;
        }

        if (socialLink.url === undefined || socialLink.url === null) {
          console.warn(`x-uigen-landing-page: footer.socialLinks[${i}] must have a url field`);
          return false;
        }

        if (typeof socialLink.url !== 'string' || socialLink.url.trim() === '') {
          console.warn(`x-uigen-landing-page: footer.socialLinks[${i}].url must be a non-empty string`);
          return false;
        }
      }
    }

    // Validate footer.copyrightText is string (if provided) (Requirement 11.5)
    if (footer.copyrightText !== undefined) {
      if (typeof footer.copyrightText !== 'string') {
        console.warn('x-uigen-landing-page: footer.copyrightText must be a string');
        return false;
      }
    }

    // Validate footer.legalLinks is array (if provided) (Requirement 11.6)
    if (footer.legalLinks !== undefined) {
      if (!Array.isArray(footer.legalLinks)) {
        console.warn('x-uigen-landing-page: footer.legalLinks must be an array');
        return false;
      }

      for (let i = 0; i < footer.legalLinks.length; i++) {
        const legalLink = footer.legalLinks[i];

        if (typeof legalLink !== 'object' || legalLink === null || Array.isArray(legalLink)) {
          console.warn(`x-uigen-landing-page: footer.legalLinks[${i}] must be an object`);
          return false;
        }

        if (legalLink.text === undefined || legalLink.text === null) {
          console.warn(`x-uigen-landing-page: footer.legalLinks[${i}] must have a text field`);
          return false;
        }

        if (typeof legalLink.text !== 'string' || legalLink.text.trim() === '') {
          console.warn(`x-uigen-landing-page: footer.legalLinks[${i}].text must be a non-empty string`);
          return false;
        }

        if (legalLink.url === undefined || legalLink.url === null) {
          console.warn(`x-uigen-landing-page: footer.legalLinks[${i}] must have a url field`);
          return false;
        }

        if (typeof legalLink.url !== 'string' || legalLink.url.trim() === '') {
          console.warn(`x-uigen-landing-page: footer.legalLinks[${i}].url must be a non-empty string`);
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Validate CTA button has required text and url fields.
   * 
   * @param cta - The CTA button object
   * @param fieldName - The field name for error messages
   * @returns true if valid, false otherwise
   */
  private validateCtaButton(cta: any, fieldName: string): boolean {
    if (typeof cta !== 'object' || cta === null || Array.isArray(cta)) {
      console.warn(`x-uigen-landing-page: ${fieldName} must be an object`);
      return false;
    }

    if (cta.text === undefined || cta.text === null) {
      console.warn(`x-uigen-landing-page: ${fieldName} must have a text field`);
      return false;
    }

    if (typeof cta.text !== 'string' || cta.text.trim() === '') {
      console.warn(`x-uigen-landing-page: ${fieldName}.text must be a non-empty string`);
      return false;
    }

    if (cta.url === undefined || cta.url === null) {
      console.warn(`x-uigen-landing-page: ${fieldName} must have a url field`);
      return false;
    }

    if (typeof cta.url !== 'string' || cta.url.trim() === '') {
      console.warn(`x-uigen-landing-page: ${fieldName}.url must be a non-empty string`);
      return false;
    }

    return true;
  }

  /**
   * Apply the landing page annotation by setting landingPageConfig on the IR.
   * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
   * 
   * @param value - The validated annotation object
   * @param context - The annotation context
   */
  apply(value: LandingPageAnnotation, context: AnnotationContext): void {
    try {
      // Check if applied at document level (Requirement 13.1, 13.2)
      // Document-level is when path is 'document' and there's no operation/resource context
      const isDocumentLevel = context.path === 'document' && !context.operation && !context.resource;

      if (!isDocumentLevel) {
        // Log warning for wrong context level (Requirement 13.3, 13.4)
        if (context.operation) {
          context.utils.logWarning(
            `x-uigen-landing-page at ${context.path}: can only be applied at document level, not at operation level`
          );
        } else if (context.schemaNode) {
          context.utils.logWarning(
            `x-uigen-landing-page at ${context.path}: can only be applied at document level, not at field level`
          );
        } else {
          context.utils.logWarning(
            `x-uigen-landing-page at ${context.path}: can only be applied at document level`
          );
        }
        return;
      }

      // Handle multiple annotations at document level - first wins (Requirement 13.6)
      if (context.ir.landingPageConfig) {
        context.utils.logWarning(
          `x-uigen-landing-page at ${context.path}: multiple landing page annotations found at document level, using first annotation`
        );
        return;
      }

      // Log info for unknown section types (Requirement 12.2, 12.3)
      const knownSectionTypes = ['hero', 'features', 'howItWorks', 'testimonials', 'pricing', 'faq', 'cta', 'footer'];
      const sectionKeys = Object.keys(value.sections);
      for (const sectionKey of sectionKeys) {
        if (!knownSectionTypes.includes(sectionKey)) {
          console.info(`x-uigen-landing-page: unknown section type "${sectionKey}" will be preserved for extensibility`);
        }
      }

      // Store configuration in IR (Requirement 13.2, 12.4, 12.5)
      // Preserve all metadata fields including unknown section types
      context.ir.landingPageConfig = {
        enabled: value.enabled,
        sections: value.sections as any // Preserve all sections including unknown types
      };
    } catch (error) {
      context.utils.logWarning(`x-uigen-landing-page at ${context.path}: apply error - ${error}`);
    }
  }
}
