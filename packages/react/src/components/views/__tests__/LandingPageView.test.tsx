import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LandingPageView } from '../LandingPageView';
import type { UIGenApp } from '@uigen-dev/core';

// Helper to create a minimal config
const createConfig = (landingPageConfig?: UIGenApp['landingPageConfig']): UIGenApp => ({
  meta: {
    title: 'Test App',
    version: '1.0.0',
    description: 'Test application',
  },
  resources: [],
  auth: {
    schemes: [],
    globalRequired: false,
  },
  dashboard: {
    enabled: true,
    widgets: [],
  },
  servers: [],
  landingPageConfig,
});

describe('LandingPageView', () => {
  describe('Redirect behavior', () => {
    it('should redirect to /dashboard when landing page is disabled', () => {
      const config = createConfig({
        enabled: false,
        sections: {},
      });

      render(
        <BrowserRouter>
          <LandingPageView config={config} />
        </BrowserRouter>
      );

      // Should not render landing page
      expect(screen.queryByTestId('landing-page')).not.toBeInTheDocument();
    });

    it('should redirect to /dashboard when landingPageConfig is undefined', () => {
      const config = createConfig(undefined);

      render(
        <BrowserRouter>
          <LandingPageView config={config} />
        </BrowserRouter>
      );

      // Should not render landing page
      expect(screen.queryByTestId('landing-page')).not.toBeInTheDocument();
    });

    it('should redirect to /dashboard when landingPageConfig is null', () => {
      const config = createConfig(null as any);

      render(
        <BrowserRouter>
          <LandingPageView config={config} />
        </BrowserRouter>
      );

      // Should not render landing page
      expect(screen.queryByTestId('landing-page')).not.toBeInTheDocument();
    });
  });

  describe('Section rendering', () => {
    it('should render landing page when enabled', () => {
      const config = createConfig({
        enabled: true,
        sections: {},
      });

      render(
        <BrowserRouter>
          <LandingPageView config={config} />
        </BrowserRouter>
      );

      expect(screen.getByTestId('landing-page')).toBeInTheDocument();
    });

    it('should render hero section when enabled', () => {
      const config = createConfig({
        enabled: true,
        sections: {
          hero: {
            enabled: true,
            headline: 'Welcome to Test App',
            subheadline: 'The best app ever',
            primaryCta: {
              text: 'Get Started',
              url: '/signup',
            },
            secondaryCta: {
              text: 'Learn More',
              url: '/about',
            },
          },
        },
      });

      render(
        <BrowserRouter>
          <LandingPageView config={config} />
        </BrowserRouter>
      );

      expect(screen.getByTestId('hero-section')).toBeInTheDocument();
      expect(screen.getByText('Welcome to Test App')).toBeInTheDocument();
      expect(screen.getByText('The best app ever')).toBeInTheDocument();
      expect(screen.getByTestId('hero-primary-cta')).toHaveAttribute('href', '/signup');
      expect(screen.getByTestId('hero-secondary-cta')).toHaveAttribute('href', '/about');
    });

    it('should use app title as fallback for hero headline', () => {
      const config = createConfig({
        enabled: true,
        sections: {
          hero: {
            enabled: true,
          },
        },
      });

      render(
        <BrowserRouter>
          <LandingPageView config={config} />
        </BrowserRouter>
      );

      expect(screen.getByText('Test App')).toBeInTheDocument();
    });

    it('should render features section when enabled', () => {
      const config = createConfig({
        enabled: true,
        sections: {
          features: {
            enabled: true,
            title: 'Amazing Features',
            items: [
              {
                title: 'Feature 1',
                description: 'Description 1',
                icon: 'icon1',
              },
              {
                title: 'Feature 2',
                description: 'Description 2',
                image: '/feature2.png',
              },
            ],
          },
        },
      });

      render(
        <BrowserRouter>
          <LandingPageView config={config} />
        </BrowserRouter>
      );

      expect(screen.getByTestId('features-section')).toBeInTheDocument();
      expect(screen.getByText('Amazing Features')).toBeInTheDocument();
      expect(screen.getByTestId('feature-item-0')).toBeInTheDocument();
      expect(screen.getByTestId('feature-item-1')).toBeInTheDocument();
      expect(screen.getByText('Feature 1')).toBeInTheDocument();
      expect(screen.getByText('Description 1')).toBeInTheDocument();
      expect(screen.getByTestId('feature-icon-0')).toHaveTextContent('icon1');
      expect(screen.getByTestId('feature-image-1')).toHaveAttribute('src', '/feature2.png');
    });

    it('should render how it works section when enabled', () => {
      const config = createConfig({
        enabled: true,
        sections: {
          howItWorks: {
            enabled: true,
            title: 'How It Works',
            steps: [
              {
                title: 'Step 1',
                description: 'First step',
                stepNumber: 1,
              },
              {
                title: 'Step 2',
                description: 'Second step',
                image: '/step2.png',
              },
            ],
          },
        },
      });

      render(
        <BrowserRouter>
          <LandingPageView config={config} />
        </BrowserRouter>
      );

      expect(screen.getByTestId('how-it-works-section')).toBeInTheDocument();
      expect(screen.getByText('How It Works')).toBeInTheDocument();
      expect(screen.getByTestId('step-item-0')).toBeInTheDocument();
      expect(screen.getByTestId('step-item-1')).toBeInTheDocument();
      expect(screen.getByText('Step 1')).toBeInTheDocument();
      expect(screen.getByText('First step')).toBeInTheDocument();
      expect(screen.getByTestId('step-image-1')).toHaveAttribute('src', '/step2.png');
    });

    it('should render testimonials section when enabled', () => {
      const config = createConfig({
        enabled: true,
        sections: {
          testimonials: {
            enabled: true,
            title: 'What Our Users Say',
            items: [
              {
                quote: 'Great app!',
                author: 'John Doe',
                authorTitle: 'CEO',
                authorImage: '/john.png',
                rating: 5,
              },
              {
                quote: 'Love it!',
                author: 'Jane Smith',
              },
            ],
          },
        },
      });

      render(
        <BrowserRouter>
          <LandingPageView config={config} />
        </BrowserRouter>
      );

      expect(screen.getByTestId('testimonials-section')).toBeInTheDocument();
      expect(screen.getByText('What Our Users Say')).toBeInTheDocument();
      expect(screen.getByTestId('testimonial-item-0')).toBeInTheDocument();
      expect(screen.getByTestId('testimonial-item-1')).toBeInTheDocument();
      expect(screen.getByText('Great app!')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('CEO')).toBeInTheDocument();
      expect(screen.getByTestId('testimonial-image-0')).toHaveAttribute('src', '/john.png');
      expect(screen.getByTestId('testimonial-rating-0')).toBeInTheDocument();
    });

    it('should render pricing section when enabled', () => {
      const config = createConfig({
        enabled: true,
        sections: {
          pricing: {
            enabled: true,
            title: 'Pricing Plans',
            plans: [
              {
                name: 'Basic',
                price: '$9/month',
                features: ['Feature 1', 'Feature 2'],
                ctaText: 'Get Started',
                ctaUrl: '/signup?plan=basic',
              },
              {
                name: 'Pro',
                price: '$29/month',
                features: ['All Basic features', 'Feature 3', 'Feature 4'],
                highlighted: true,
                ctaText: 'Get Started',
                ctaUrl: '/signup?plan=pro',
              },
            ],
          },
        },
      });

      render(
        <BrowserRouter>
          <LandingPageView config={config} />
        </BrowserRouter>
      );

      expect(screen.getByTestId('pricing-section')).toBeInTheDocument();
      expect(screen.getByText('Pricing Plans')).toBeInTheDocument();
      expect(screen.getByTestId('pricing-plan-0')).toBeInTheDocument();
      expect(screen.getByTestId('pricing-plan-1')).toBeInTheDocument();
      expect(screen.getByText('Basic')).toBeInTheDocument();
      expect(screen.getByText('$9/month')).toBeInTheDocument();
      expect(screen.getByText('Feature 1')).toBeInTheDocument();
      expect(screen.getByTestId('pricing-cta-0')).toHaveAttribute('href', '/signup?plan=basic');
      expect(screen.getByTestId('pricing-plan-1')).toHaveClass('highlighted');
    });

    it('should render faq section when enabled', () => {
      const config = createConfig({
        enabled: true,
        sections: {
          faq: {
            enabled: true,
            title: 'Frequently Asked Questions',
            items: [
              {
                question: 'What is this?',
                answer: 'This is a test app',
                category: 'General',
              },
              {
                question: 'How much does it cost?',
                answer: 'It is free',
              },
            ],
          },
        },
      });

      render(
        <BrowserRouter>
          <LandingPageView config={config} />
        </BrowserRouter>
      );

      expect(screen.getByTestId('faq-section')).toBeInTheDocument();
      expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument();
      expect(screen.getByTestId('faq-item-0')).toBeInTheDocument();
      expect(screen.getByTestId('faq-item-1')).toBeInTheDocument();
      expect(screen.getByText('What is this?')).toBeInTheDocument();
      expect(screen.getByText('This is a test app')).toBeInTheDocument();
      expect(screen.getByText('General')).toBeInTheDocument();
    });

    it('should render cta section when enabled', () => {
      const config = createConfig({
        enabled: true,
        sections: {
          cta: {
            enabled: true,
            headline: 'Ready to get started?',
            subheadline: 'Join thousands of users today',
            primaryCta: {
              text: 'Sign Up Now',
              url: '/signup',
            },
            secondaryCta: {
              text: 'Contact Sales',
              url: '/contact',
            },
          },
        },
      });

      render(
        <BrowserRouter>
          <LandingPageView config={config} />
        </BrowserRouter>
      );

      expect(screen.getByTestId('cta-section')).toBeInTheDocument();
      expect(screen.getByText('Ready to get started?')).toBeInTheDocument();
      expect(screen.getByText('Join thousands of users today')).toBeInTheDocument();
      expect(screen.getByTestId('cta-primary-cta')).toHaveAttribute('href', '/signup');
      expect(screen.getByTestId('cta-secondary-cta')).toHaveAttribute('href', '/contact');
    });

    it('should render footer section when enabled', () => {
      const config = createConfig({
        enabled: true,
        sections: {
          footer: {
            enabled: true,
            companyName: 'Test Company',
            links: [
              { text: 'About', url: '/about' },
              { text: 'Contact', url: '/contact' },
            ],
            socialLinks: [
              { platform: 'Twitter', url: 'https://twitter.com/test' },
              { platform: 'LinkedIn', url: 'https://linkedin.com/company/test' },
            ],
            copyrightText: '© 2024 Test Company',
            legalLinks: [
              { text: 'Privacy Policy', url: '/privacy' },
              { text: 'Terms of Service', url: '/terms' },
            ],
          },
        },
      });

      render(
        <BrowserRouter>
          <LandingPageView config={config} />
        </BrowserRouter>
      );

      expect(screen.getByTestId('footer-section')).toBeInTheDocument();
      expect(screen.getByText('Test Company')).toBeInTheDocument();
      expect(screen.getByTestId('footer-link-0')).toHaveAttribute('href', '/about');
      expect(screen.getByTestId('footer-link-1')).toHaveAttribute('href', '/contact');
      expect(screen.getByTestId('social-link-0')).toHaveAttribute('href', 'https://twitter.com/test');
      expect(screen.getByTestId('social-link-1')).toHaveAttribute('href', 'https://linkedin.com/company/test');
      expect(screen.getByText('© 2024 Test Company')).toBeInTheDocument();
      expect(screen.getByTestId('legal-link-0')).toHaveAttribute('href', '/privacy');
      expect(screen.getByTestId('legal-link-1')).toHaveAttribute('href', '/terms');
    });
  });

  describe('Conditional rendering', () => {
    it('should skip disabled sections', () => {
      const config = createConfig({
        enabled: true,
        sections: {
          hero: {
            enabled: true,
            headline: 'Welcome',
          },
          features: {
            enabled: false,
            title: 'Features',
            items: [],
          },
          pricing: {
            enabled: true,
            title: 'Pricing',
            plans: [],
          },
        },
      });

      render(
        <BrowserRouter>
          <LandingPageView config={config} />
        </BrowserRouter>
      );

      expect(screen.getByTestId('hero-section')).toBeInTheDocument();
      expect(screen.queryByTestId('features-section')).not.toBeInTheDocument();
      expect(screen.getByTestId('pricing-section')).toBeInTheDocument();
    });

    it('should handle missing optional sections gracefully', () => {
      const config = createConfig({
        enabled: true,
        sections: {
          hero: {
            enabled: true,
            headline: 'Welcome',
          },
          // Other sections not defined
        },
      });

      render(
        <BrowserRouter>
          <LandingPageView config={config} />
        </BrowserRouter>
      );

      expect(screen.getByTestId('hero-section')).toBeInTheDocument();
      expect(screen.queryByTestId('features-section')).not.toBeInTheDocument();
      expect(screen.queryByTestId('how-it-works-section')).not.toBeInTheDocument();
      expect(screen.queryByTestId('testimonials-section')).not.toBeInTheDocument();
      expect(screen.queryByTestId('pricing-section')).not.toBeInTheDocument();
      expect(screen.queryByTestId('faq-section')).not.toBeInTheDocument();
      expect(screen.queryByTestId('cta-section')).not.toBeInTheDocument();
      expect(screen.queryByTestId('footer-section')).not.toBeInTheDocument();
    });

    it('should handle empty arrays gracefully', () => {
      const config = createConfig({
        enabled: true,
        sections: {
          features: {
            enabled: true,
            title: 'Features',
            items: [],
          },
          pricing: {
            enabled: true,
            title: 'Pricing',
            plans: [],
          },
        },
      });

      render(
        <BrowserRouter>
          <LandingPageView config={config} />
        </BrowserRouter>
      );

      expect(screen.getByTestId('features-section')).toBeInTheDocument();
      expect(screen.getByText('Features')).toBeInTheDocument();
      expect(screen.queryByTestId('feature-item-0')).not.toBeInTheDocument();

      expect(screen.getByTestId('pricing-section')).toBeInTheDocument();
      expect(screen.getByText('Pricing')).toBeInTheDocument();
      expect(screen.queryByTestId('pricing-plan-0')).not.toBeInTheDocument();
    });

    it('should handle missing optional fields in sections', () => {
      const config = createConfig({
        enabled: true,
        sections: {
          hero: {
            enabled: true,
            headline: 'Welcome',
            // No subheadline, no CTAs
          },
          features: {
            enabled: true,
            // No title
            items: [
              {
                title: 'Feature 1',
                description: 'Description 1',
                // No icon, no image
              },
            ],
          },
        },
      });

      render(
        <BrowserRouter>
          <LandingPageView config={config} />
        </BrowserRouter>
      );

      expect(screen.getByTestId('hero-section')).toBeInTheDocument();
      expect(screen.getByText('Welcome')).toBeInTheDocument();
      expect(screen.queryByTestId('hero-primary-cta')).not.toBeInTheDocument();
      expect(screen.queryByTestId('hero-secondary-cta')).not.toBeInTheDocument();

      expect(screen.getByTestId('features-section')).toBeInTheDocument();
      expect(screen.getByTestId('feature-item-0')).toBeInTheDocument();
      expect(screen.queryByTestId('feature-icon-0')).not.toBeInTheDocument();
      expect(screen.queryByTestId('feature-image-0')).not.toBeInTheDocument();
    });
  });

  describe('Section ordering', () => {
    it('should render sections in the correct order', () => {
      const config = createConfig({
        enabled: true,
        sections: {
          hero: { enabled: true, headline: 'Hero' },
          features: { enabled: true, title: 'Features', items: [] },
          howItWorks: { enabled: true, title: 'How It Works', steps: [] },
          testimonials: { enabled: true, title: 'Testimonials', items: [] },
          pricing: { enabled: true, title: 'Pricing', plans: [] },
          faq: { enabled: true, title: 'FAQ', items: [] },
          cta: { enabled: true, headline: 'CTA' },
          footer: { enabled: true, companyName: 'Footer' },
        },
      });

      const { container } = render(
        <BrowserRouter>
          <LandingPageView config={config} />
        </BrowserRouter>
      );

      const sections = container.querySelectorAll('[data-testid$="-section"]');
      expect(sections).toHaveLength(8);
      expect(sections[0]).toHaveAttribute('data-testid', 'hero-section');
      expect(sections[1]).toHaveAttribute('data-testid', 'features-section');
      expect(sections[2]).toHaveAttribute('data-testid', 'how-it-works-section');
      expect(sections[3]).toHaveAttribute('data-testid', 'testimonials-section');
      expect(sections[4]).toHaveAttribute('data-testid', 'pricing-section');
      expect(sections[5]).toHaveAttribute('data-testid', 'faq-section');
      expect(sections[6]).toHaveAttribute('data-testid', 'cta-section');
      expect(sections[7]).toHaveAttribute('data-testid', 'footer-section');
    });
  });
});
