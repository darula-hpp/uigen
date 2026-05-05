import { Navigate } from 'react-router-dom';
import type { UIGenApp } from '@uigen-dev/core';

interface LandingPageViewProps {
  config: UIGenApp;
}

/**
 * Landing page container component
 * Implements Requirements 17.1, 17.2, 17.3, 17.4
 * 
 * Renders the landing page with enabled sections in order.
 * Redirects to /dashboard if landing page is disabled.
 */
export function LandingPageView({ config }: LandingPageViewProps) {
  const landingConfig = config.landingPageConfig;

  // Requirement 17.1: Redirect to /dashboard if landing page disabled
  if (!landingConfig?.enabled) {
    return <Navigate to="/dashboard" replace />;
  }

  const sections = landingConfig.sections;

  return (
    <div className="landing-page" data-testid="landing-page">
      {/* Requirement 17.3, 17.4: Render enabled sections in order */}
      
      {/* Hero Section */}
      {sections.hero?.enabled && (
        <div data-testid="hero-section" className="hero-section">
          <h1>{sections.hero.headline || config.meta.title}</h1>
          {sections.hero.subheadline && <p>{sections.hero.subheadline}</p>}
          {sections.hero.primaryCta && (
            <a href={sections.hero.primaryCta.url} data-testid="hero-primary-cta">
              {sections.hero.primaryCta.text}
            </a>
          )}
          {sections.hero.secondaryCta && (
            <a href={sections.hero.secondaryCta.url} data-testid="hero-secondary-cta">
              {sections.hero.secondaryCta.text}
            </a>
          )}
        </div>
      )}

      {/* Features Section */}
      {sections.features?.enabled && (
        <div data-testid="features-section" className="features-section">
          {sections.features.title && <h2>{sections.features.title}</h2>}
          {sections.features.items && sections.features.items.length > 0 && (
            <div className="features-grid">
              {sections.features.items.map((item, index) => (
                <div key={index} data-testid={`feature-item-${index}`} className="feature-item">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  {item.icon && <span data-testid={`feature-icon-${index}`}>{item.icon}</span>}
                  {item.image && <img src={item.image} alt={item.title} data-testid={`feature-image-${index}`} />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* How It Works Section */}
      {sections.howItWorks?.enabled && (
        <div data-testid="how-it-works-section" className="how-it-works-section">
          {sections.howItWorks.title && <h2>{sections.howItWorks.title}</h2>}
          {sections.howItWorks.steps && sections.howItWorks.steps.length > 0 && (
            <div className="steps-container">
              {sections.howItWorks.steps.map((step, index) => (
                <div key={index} data-testid={`step-item-${index}`} className="step-item">
                  <span className="step-number">{step.stepNumber || index + 1}</span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                  {step.image && <img src={step.image} alt={step.title} data-testid={`step-image-${index}`} />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Testimonials Section */}
      {sections.testimonials?.enabled && (
        <div data-testid="testimonials-section" className="testimonials-section">
          {sections.testimonials.title && <h2>{sections.testimonials.title}</h2>}
          {sections.testimonials.items && sections.testimonials.items.length > 0 && (
            <div className="testimonials-grid">
              {sections.testimonials.items.map((item, index) => (
                <div key={index} data-testid={`testimonial-item-${index}`} className="testimonial-item">
                  <blockquote>{item.quote}</blockquote>
                  <p className="author">{item.author}</p>
                  {item.authorTitle && <p className="author-title">{item.authorTitle}</p>}
                  {item.authorImage && <img src={item.authorImage} alt={item.author} data-testid={`testimonial-image-${index}`} />}
                  {item.rating && (
                    <div data-testid={`testimonial-rating-${index}`} className="rating">
                      {Array.from({ length: item.rating }, (_, i) => (
                        <span key={i}>★</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pricing Section */}
      {sections.pricing?.enabled && (
        <div data-testid="pricing-section" className="pricing-section">
          {sections.pricing.title && <h2>{sections.pricing.title}</h2>}
          {sections.pricing.plans && sections.pricing.plans.length > 0 && (
            <div className="pricing-grid">
              {sections.pricing.plans.map((plan, index) => (
                <div 
                  key={index} 
                  data-testid={`pricing-plan-${index}`} 
                  className={`pricing-plan ${plan.highlighted ? 'highlighted' : ''}`}
                >
                  <h3>{plan.name}</h3>
                  <p className="price">{plan.price}</p>
                  <ul className="features-list">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex}>{feature}</li>
                    ))}
                  </ul>
                  {plan.ctaText && plan.ctaUrl && (
                    <a href={plan.ctaUrl} data-testid={`pricing-cta-${index}`}>
                      {plan.ctaText}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FAQ Section */}
      {sections.faq?.enabled && (
        <div data-testid="faq-section" className="faq-section">
          {sections.faq.title && <h2>{sections.faq.title}</h2>}
          {sections.faq.items && sections.faq.items.length > 0 && (
            <div className="faq-list">
              {sections.faq.items.map((item, index) => (
                <div key={index} data-testid={`faq-item-${index}`} className="faq-item">
                  <h3 className="question">{item.question}</h3>
                  <p className="answer">{item.answer}</p>
                  {item.category && <span className="category">{item.category}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CTA Section */}
      {sections.cta?.enabled && (
        <div data-testid="cta-section" className="cta-section">
          {sections.cta.headline && <h2>{sections.cta.headline}</h2>}
          {sections.cta.subheadline && <p>{sections.cta.subheadline}</p>}
          {sections.cta.primaryCta && (
            <a href={sections.cta.primaryCta.url} data-testid="cta-primary-cta">
              {sections.cta.primaryCta.text}
            </a>
          )}
          {sections.cta.secondaryCta && (
            <a href={sections.cta.secondaryCta.url} data-testid="cta-secondary-cta">
              {sections.cta.secondaryCta.text}
            </a>
          )}
        </div>
      )}

      {/* Footer Section */}
      {sections.footer?.enabled && (
        <div data-testid="footer-section" className="footer-section">
          {sections.footer.companyName && <p className="company-name">{sections.footer.companyName}</p>}
          {sections.footer.links && sections.footer.links.length > 0 && (
            <nav className="footer-links">
              {sections.footer.links.map((link, index) => (
                <a key={index} href={link.url} data-testid={`footer-link-${index}`}>
                  {link.text}
                </a>
              ))}
            </nav>
          )}
          {sections.footer.socialLinks && sections.footer.socialLinks.length > 0 && (
            <div className="social-links">
              {sections.footer.socialLinks.map((link, index) => (
                <a key={index} href={link.url} data-testid={`social-link-${index}`}>
                  {link.platform}
                </a>
              ))}
            </div>
          )}
          {sections.footer.copyrightText && <p className="copyright">{sections.footer.copyrightText}</p>}
          {sections.footer.legalLinks && sections.footer.legalLinks.length > 0 && (
            <nav className="legal-links">
              {sections.footer.legalLinks.map((link, index) => (
                <a key={index} href={link.url} data-testid={`legal-link-${index}`}>
                  {link.text}
                </a>
              ))}
            </nav>
          )}
        </div>
      )}
    </div>
  );
}
