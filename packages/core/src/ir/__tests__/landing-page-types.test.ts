import { describe, it, expect } from 'vitest';
import type {
  LandingPageConfig,
  LandingPageSections,
  HeroSection,
  FeaturesSection,
  HowItWorksSection,
  TestimonialsSection,
  PricingSection,
  FaqSection,
  CtaSection,
  FooterSection,
  CtaButton,
  FeatureItem,
  StepItem,
  TestimonialItem,
  PricingPlan,
  FaqItem,
  FooterLink,
  SocialLink,
  UIGenApp,
} from '../types.js';

describe('Landing Page Type Definitions', () => {
  it('should allow valid LandingPageConfig', () => {
    const config: LandingPageConfig = {
      enabled: true,
      sections: {
        hero: {
          enabled: true,
          headline: 'Welcome',
          subheadline: 'Get started today',
          primaryCta: {
            text: 'Sign Up',
            url: '/signup',
          },
        },
      },
    };

    expect(config.enabled).toBe(true);
    expect(config.sections.hero?.headline).toBe('Welcome');
  });

  it('should allow HeroSection with all optional fields', () => {
    const hero: HeroSection = {
      enabled: true,
      headline: 'Transform Your Workflow',
      subheadline: 'The all-in-one platform',
      primaryCta: {
        text: 'Get Started',
        url: '/signup',
      },
      secondaryCta: {
        text: 'Learn More',
        url: '/about',
      },
      backgroundImage: '/hero-bg.jpg',
    };

    expect(hero.enabled).toBe(true);
    expect(hero.primaryCta?.text).toBe('Get Started');
    expect(hero.secondaryCta?.url).toBe('/about');
  });

  it('should allow FeaturesSection with feature items', () => {
    const features: FeaturesSection = {
      enabled: true,
      title: 'Key Features',
      items: [
        {
          title: 'Fast',
          description: 'Lightning fast performance',
          icon: 'zap',
        },
        {
          title: 'Secure',
          description: 'Enterprise-grade security',
          icon: 'shield',
          image: '/secure.png',
        },
      ],
    };

    expect(features.items).toHaveLength(2);
    expect(features.items?.[0].title).toBe('Fast');
  });

  it('should allow HowItWorksSection with steps', () => {
    const howItWorks: HowItWorksSection = {
      enabled: true,
      title: 'How It Works',
      steps: [
        {
          title: 'Sign Up',
          description: 'Create your account',
          stepNumber: 1,
        },
        {
          title: 'Configure',
          description: 'Set up your preferences',
          stepNumber: 2,
          image: '/step2.png',
        },
      ],
    };

    expect(howItWorks.steps).toHaveLength(2);
    expect(howItWorks.steps?.[0].stepNumber).toBe(1);
  });

  it('should allow TestimonialsSection with testimonial items', () => {
    const testimonials: TestimonialsSection = {
      enabled: true,
      title: 'What Our Customers Say',
      items: [
        {
          quote: 'This product changed my life!',
          author: 'John Doe',
          authorTitle: 'CEO, Acme Inc',
          authorImage: '/john.jpg',
          rating: 5,
        },
      ],
    };

    expect(testimonials.items?.[0].rating).toBe(5);
    expect(testimonials.items?.[0].author).toBe('John Doe');
  });

  it('should allow PricingSection with pricing plans', () => {
    const pricing: PricingSection = {
      enabled: true,
      title: 'Simple Pricing',
      plans: [
        {
          name: 'Starter',
          price: '$9/month',
          features: ['Feature 1', 'Feature 2'],
          ctaText: 'Get Started',
          ctaUrl: '/signup?plan=starter',
        },
        {
          name: 'Pro',
          price: '$29/month',
          features: ['All Starter features', 'Feature 3', 'Feature 4'],
          highlighted: true,
          ctaText: 'Get Started',
          ctaUrl: '/signup?plan=pro',
        },
      ],
    };

    expect(pricing.plans).toHaveLength(2);
    expect(pricing.plans?.[1].highlighted).toBe(true);
  });

  it('should allow FaqSection with FAQ items', () => {
    const faq: FaqSection = {
      enabled: true,
      title: 'Frequently Asked Questions',
      items: [
        {
          question: 'How does it work?',
          answer: 'It works great!',
          category: 'General',
        },
        {
          question: 'What is the pricing?',
          answer: 'See our pricing page.',
        },
      ],
    };

    expect(faq.items).toHaveLength(2);
    expect(faq.items?.[0].category).toBe('General');
  });

  it('should allow CtaSection with background options', () => {
    const cta: CtaSection = {
      enabled: true,
      headline: 'Ready to get started?',
      subheadline: 'Join thousands of happy customers',
      primaryCta: {
        text: 'Start Free Trial',
        url: '/signup',
      },
      secondaryCta: {
        text: 'Contact Sales',
        url: '/contact',
      },
      backgroundStyle: 'gradient',
      backgroundImage: '/cta-bg.jpg',
    };

    expect(cta.backgroundStyle).toBe('gradient');
    expect(cta.primaryCta?.text).toBe('Start Free Trial');
  });

  it('should allow FooterSection with links and social links', () => {
    const footer: FooterSection = {
      enabled: true,
      companyName: 'Acme Inc',
      links: [
        { text: 'About', url: '/about' },
        { text: 'Contact', url: '/contact' },
      ],
      socialLinks: [
        { platform: 'twitter', url: 'https://twitter.com/acme' },
        { platform: 'github', url: 'https://github.com/acme' },
      ],
      copyrightText: '© 2024 Acme Inc. All rights reserved.',
      legalLinks: [
        { text: 'Privacy Policy', url: '/privacy' },
        { text: 'Terms of Service', url: '/terms' },
      ],
    };

    expect(footer.companyName).toBe('Acme Inc');
    expect(footer.links).toHaveLength(2);
    expect(footer.socialLinks).toHaveLength(2);
    expect(footer.legalLinks).toHaveLength(2);
  });

  it('should allow UIGenApp with landingPageConfig', () => {
    const app: Partial<UIGenApp> = {
      landingPageConfig: {
        enabled: true,
        sections: {
          hero: {
            enabled: true,
            headline: 'Welcome',
          },
          features: {
            enabled: true,
            items: [],
          },
        },
      },
    };

    expect(app.landingPageConfig?.enabled).toBe(true);
    expect(app.landingPageConfig?.sections.hero?.headline).toBe('Welcome');
  });

  it('should allow LandingPageConfig with all sections', () => {
    const config: LandingPageConfig = {
      enabled: true,
      sections: {
        hero: { enabled: true },
        features: { enabled: true },
        howItWorks: { enabled: true },
        testimonials: { enabled: true },
        pricing: { enabled: true },
        faq: { enabled: true },
        cta: { enabled: true },
        footer: { enabled: true },
      },
    };

    expect(config.sections.hero?.enabled).toBe(true);
    expect(config.sections.features?.enabled).toBe(true);
    expect(config.sections.howItWorks?.enabled).toBe(true);
    expect(config.sections.testimonials?.enabled).toBe(true);
    expect(config.sections.pricing?.enabled).toBe(true);
    expect(config.sections.faq?.enabled).toBe(true);
    expect(config.sections.cta?.enabled).toBe(true);
    expect(config.sections.footer?.enabled).toBe(true);
  });

  it('should allow empty sections object', () => {
    const config: LandingPageConfig = {
      enabled: false,
      sections: {},
    };

    expect(config.enabled).toBe(false);
    expect(config.sections).toEqual({});
  });

  it('should allow shared types to be used independently', () => {
    const button: CtaButton = {
      text: 'Click Me',
      url: '/action',
    };

    const feature: FeatureItem = {
      title: 'Feature',
      description: 'Description',
    };

    const step: StepItem = {
      title: 'Step',
      description: 'Description',
    };

    const testimonial: TestimonialItem = {
      quote: 'Great!',
      author: 'Jane',
    };

    const plan: PricingPlan = {
      name: 'Basic',
      price: '$10',
      features: ['Feature 1'],
    };

    const faqItem: FaqItem = {
      question: 'Q?',
      answer: 'A.',
    };

    const link: FooterLink = {
      text: 'Link',
      url: '/link',
    };

    const social: SocialLink = {
      platform: 'twitter',
      url: 'https://twitter.com',
    };

    expect(button.text).toBe('Click Me');
    expect(feature.title).toBe('Feature');
    expect(step.title).toBe('Step');
    expect(testimonial.author).toBe('Jane');
    expect(plan.name).toBe('Basic');
    expect(faqItem.question).toBe('Q?');
    expect(link.text).toBe('Link');
    expect(social.platform).toBe('twitter');
  });
});
