# x-uigen-landing-page

The `x-uigen-landing-page` annotation enables automatic landing page generation for UIGen applications. Configure marketing landing pages with common sections like hero, features, pricing, testimonials, and CTAs using declarative YAML configuration.

## Overview

Landing pages are essential for SaaS applications, providing a public-facing entry point that showcases your product before users sign up. The `x-uigen-landing-page` annotation allows you to define a complete landing page structure directly in your OpenAPI specification or config file.

**Key Features:**
- 8 pre-built section types (hero, features, how-it-works, testimonials, pricing, FAQ, CTA, footer)
- Granular enable/disable controls per section
- Automatic routing integration (landing page at `/`, dashboard at `/dashboard`)
- Theme-aware styling compatible with `.uigen/theme.css`
- AI-powered content generation from your API spec
- Extensible metadata pattern for future section types

## Basic Usage

Add the annotation at the document root level of your OpenAPI spec:

```yaml
openapi: 3.0.0
info:
  title: My SaaS App
  version: 1.0.0
x-uigen-landing-page:
  enabled: true
  sections:
    hero:
      enabled: true
      headline: "Welcome to My SaaS App"
      subheadline: "The all-in-one platform for modern teams"
      primaryCta:
        text: "Get Started"
        url: "/signup"
      secondaryCta:
        text: "Learn More"
        url: "#features"
```

## Configuration Structure

### Top-Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `enabled` | boolean | Yes | Master toggle for landing page generation |
| `sections` | object | Yes | Container for all section configurations |

### Section Types

All sections follow a common pattern with an `enabled` field and section-specific configuration:

#### Hero Section

The hero section is the first thing visitors see. It typically includes a headline, subheadline, and call-to-action buttons.

```yaml
hero:
  enabled: true
  headline: "Transform Your Workflow"
  subheadline: "The all-in-one platform for modern teams"
  primaryCta:
    text: "Start Free Trial"
    url: "/signup"
  secondaryCta:
    text: "Watch Demo"
    url: "/demo"
  backgroundImage: "/images/hero-bg.jpg"  # Optional
```

**Fields:**
- `enabled` (boolean, required): Enable/disable this section
- `headline` (string, optional): Main headline text (defaults to app title if omitted)
- `subheadline` (string, optional): Supporting text below headline
- `primaryCta` (object, optional): Primary call-to-action button
  - `text` (string, required): Button text
  - `url` (string, required): Button destination URL
- `secondaryCta` (object, optional): Secondary call-to-action button
  - `text` (string, required): Button text
  - `url` (string, required): Button destination URL
- `backgroundImage` (string, optional): URL to background image

#### Features Section

Showcase your product's key capabilities with a grid of feature items.

```yaml
features:
  enabled: true
  title: "Powerful Features"
  items:
    - title: "Real-time Collaboration"
      description: "Work together seamlessly with your team"
      icon: "users"
      image: "/images/collaboration.png"
    - title: "Advanced Analytics"
      description: "Data-driven insights at your fingertips"
      icon: "bar-chart"
    - title: "Secure by Default"
      description: "Enterprise-grade security built in"
      icon: "shield"
```

**Fields:**
- `enabled` (boolean, required): Enable/disable this section
- `title` (string, optional): Section heading
- `items` (array, optional): List of feature items
  - `title` (string, required): Feature name
  - `description` (string, required): Feature description
  - `icon` (string, optional): Icon identifier
  - `image` (string, optional): Feature image URL

#### How It Works Section

Explain your user journey with sequential steps.

```yaml
howItWorks:
  enabled: true
  title: "How It Works"
  steps:
    - title: "Sign Up"
      description: "Create your account in seconds"
      stepNumber: 1
      image: "/images/step1.png"
    - title: "Configure"
      description: "Set up your workspace and preferences"
      stepNumber: 2
      image: "/images/step2.png"
    - title: "Launch"
      description: "Start collaborating with your team"
      stepNumber: 3
      image: "/images/step3.png"
```

**Fields:**
- `enabled` (boolean, required): Enable/disable this section
- `title` (string, optional): Section heading
- `steps` (array, optional): List of steps
  - `title` (string, required): Step name
  - `description` (string, required): Step description
  - `stepNumber` (number, optional): Custom step number (auto-numbered if omitted)
  - `image` (string, optional): Step illustration URL

#### Testimonials Section

Build trust with customer testimonials and reviews.

```yaml
testimonials:
  enabled: true
  title: "What Our Customers Say"
  items:
    - quote: "This product transformed how our team works together."
      author: "Jane Smith"
      authorTitle: "CEO, Acme Corp"
      authorImage: "/images/jane.jpg"
      rating: 5
    - quote: "Best investment we made this year."
      author: "John Doe"
      authorTitle: "CTO, Tech Startup"
      rating: 5
```

**Fields:**
- `enabled` (boolean, required): Enable/disable this section
- `title` (string, optional): Section heading
- `items` (array, optional): List of testimonials
  - `quote` (string, required): Testimonial text
  - `author` (string, required): Customer name
  - `authorTitle` (string, optional): Customer job title
  - `authorImage` (string, optional): Customer photo URL
  - `rating` (number, optional): Star rating (1-5)

#### Pricing Section

Present your pricing tiers and plans.

```yaml
pricing:
  enabled: true
  title: "Simple, Transparent Pricing"
  plans:
    - name: "Starter"
      price: "$9/month"
      features:
        - "Up to 10 users"
        - "Basic features"
        - "Email support"
      ctaText: "Start Free"
      ctaUrl: "/signup?plan=starter"
    - name: "Pro"
      price: "$29/month"
      features:
        - "Unlimited users"
        - "All features"
        - "Priority support"
        - "Advanced analytics"
      highlighted: true
      ctaText: "Start Free"
      ctaUrl: "/signup?plan=pro"
    - name: "Enterprise"
      price: "Custom"
      features:
        - "Custom user limits"
        - "Dedicated support"
        - "SLA guarantee"
        - "Custom integrations"
      ctaText: "Contact Sales"
      ctaUrl: "/contact"
```

**Fields:**
- `enabled` (boolean, required): Enable/disable this section
- `title` (string, optional): Section heading
- `plans` (array, optional): List of pricing plans
  - `name` (string, required): Plan name
  - `price` (string, required): Price display text
  - `features` (array of strings, required): List of included features
  - `highlighted` (boolean, optional): Highlight this plan (e.g., "Most Popular")
  - `ctaText` (string, optional): Custom button text
  - `ctaUrl` (string, optional): Custom button URL

#### FAQ Section

Address common questions proactively.

```yaml
faq:
  enabled: true
  title: "Frequently Asked Questions"
  items:
    - question: "How does the free trial work?"
      answer: "You get 14 days of full access to all Pro features, no credit card required."
      category: "Billing"
    - question: "Can I cancel anytime?"
      answer: "Yes, you can cancel your subscription at any time with no penalties."
      category: "Billing"
    - question: "Do you offer refunds?"
      answer: "We offer a 30-day money-back guarantee if you're not satisfied."
      category: "Billing"
```

**Fields:**
- `enabled` (boolean, required): Enable/disable this section
- `title` (string, optional): Section heading
- `items` (array, optional): List of FAQ items
  - `question` (string, required): Question text
  - `answer` (string, required): Answer text
  - `category` (string, optional): Category for grouping

#### CTA Section

Drive conversions with strategic call-to-action sections.

```yaml
cta:
  enabled: true
  headline: "Ready to Get Started?"
  subheadline: "Join thousands of teams already using our platform"
  primaryCta:
    text: "Start Free Trial"
    url: "/signup"
  secondaryCta:
    text: "Schedule Demo"
    url: "/demo"
  backgroundStyle: "gradient"
  backgroundImage: "/images/cta-bg.jpg"
```

**Fields:**
- `enabled` (boolean, required): Enable/disable this section
- `headline` (string, optional): Main CTA headline
- `subheadline` (string, optional): Supporting text
- `primaryCta` (object, optional): Primary button
  - `text` (string, required): Button text
  - `url` (string, required): Button URL
- `secondaryCta` (object, optional): Secondary button
  - `text` (string, required): Button text
  - `url` (string, required): Button URL
- `backgroundStyle` (string, optional): Background style (solid, gradient, image)
- `backgroundImage` (string, optional): Background image URL

#### Footer Section

Provide navigation, legal links, and company information.

```yaml
footer:
  enabled: true
  companyName: "Acme Inc"
  links:
    - text: "About"
      url: "/about"
    - text: "Blog"
      url: "/blog"
    - text: "Contact"
      url: "/contact"
  socialLinks:
    - platform: "Twitter"
      url: "https://twitter.com/acme"
    - platform: "LinkedIn"
      url: "https://linkedin.com/company/acme"
    - platform: "GitHub"
      url: "https://github.com/acme"
  copyrightText: "© 2026 Acme Inc. All rights reserved."
  legalLinks:
    - text: "Privacy Policy"
      url: "/privacy"
    - text: "Terms of Service"
      url: "/terms"
```

**Fields:**
- `enabled` (boolean, required): Enable/disable this section
- `companyName` (string, optional): Company name display
- `links` (array, optional): Navigation links
  - `text` (string, required): Link text
  - `url` (string, required): Link URL
- `socialLinks` (array, optional): Social media links
  - `platform` (string, required): Platform name
  - `url` (string, required): Profile URL
- `copyrightText` (string, optional): Copyright notice
- `legalLinks` (array, optional): Legal/compliance links
  - `text` (string, required): Link text
  - `url` (string, required): Link URL

## Complete Example

Here's a complete landing page configuration with all sections:

```yaml
x-uigen-landing-page:
  enabled: true
  sections:
    hero:
      enabled: true
      headline: "Transform Your Workflow"
      subheadline: "The all-in-one platform for modern teams"
      primaryCta:
        text: "Start Free Trial"
        url: "/signup"
      secondaryCta:
        text: "Watch Demo"
        url: "/demo"
    
    features:
      enabled: true
      title: "Everything You Need"
      items:
        - title: "Real-time Collaboration"
          description: "Work together seamlessly"
          icon: "users"
        - title: "Advanced Analytics"
          description: "Data-driven insights"
          icon: "bar-chart"
        - title: "Secure by Default"
          description: "Enterprise-grade security"
          icon: "shield"
    
    howItWorks:
      enabled: true
      title: "How It Works"
      steps:
        - title: "Sign Up"
          description: "Create your account in seconds"
        - title: "Configure"
          description: "Set up your workspace"
        - title: "Launch"
          description: "Start collaborating"
    
    testimonials:
      enabled: true
      title: "What Our Customers Say"
      items:
        - quote: "This product transformed our team."
          author: "Jane Smith"
          authorTitle: "CEO, Acme Corp"
          rating: 5
    
    pricing:
      enabled: true
      title: "Simple Pricing"
      plans:
        - name: "Starter"
          price: "$9/month"
          features:
            - "Up to 10 users"
            - "Basic features"
            - "Email support"
          ctaText: "Start Free"
          ctaUrl: "/signup?plan=starter"
        - name: "Pro"
          price: "$29/month"
          features:
            - "Unlimited users"
            - "All features"
            - "Priority support"
          highlighted: true
          ctaText: "Start Free"
          ctaUrl: "/signup?plan=pro"
    
    faq:
      enabled: true
      title: "FAQ"
      items:
        - question: "How does the free trial work?"
          answer: "14 days of full access, no credit card required."
        - question: "Can I cancel anytime?"
          answer: "Yes, cancel anytime with no penalties."
    
    cta:
      enabled: true
      headline: "Ready to Get Started?"
      subheadline: "Join thousands of teams already using our platform"
      primaryCta:
        text: "Start Free Trial"
        url: "/signup"
    
    footer:
      enabled: true
      companyName: "Acme Inc"
      links:
        - text: "About"
          url: "/about"
        - text: "Contact"
          url: "/contact"
      socialLinks:
        - platform: "Twitter"
          url: "https://twitter.com/acme"
      copyrightText: "© 2026 Acme Inc"
      legalLinks:
        - text: "Privacy"
          url: "/privacy"
        - text: "Terms"
          url: "/terms"
```

## Routing Behavior

When `x-uigen-landing-page` is enabled:
- Landing page appears at `/` (root route)
- Dashboard moves to `/dashboard`
- All other routes remain unchanged
- Landing page is public (no authentication required)

When disabled or not configured:
- Dashboard remains at `/` (backward compatible)
- No landing page route is created

## Styling and Theming

Landing page sections automatically inherit your theme from `.uigen/theme.css`. All sections use semantic CSS classes that respect your theme's color scheme, typography, and spacing.

**CSS Classes:**
- `.landing-page` - Container for entire landing page
- `.hero-section`, `.features-section`, etc. - Section containers
- `.feature-item`, `.testimonial-item`, etc. - Item containers

You can customize landing page styles by adding rules to your theme file:

```css
/* .uigen/theme.css */
.hero-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.features-section {
  background-color: var(--background);
}

.pricing-plan.highlighted {
  border: 2px solid var(--primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
```

## Config File Support

You can also define landing page configuration in `.uigen/config.yaml`:

```yaml
# .uigen/config.yaml
annotations:
  x-uigen-landing-page:
    enabled: true
    sections:
      hero:
        enabled: true
        headline: "Welcome"
        primaryCta:
          text: "Get Started"
          url: "/signup"
```

**Precedence:** Spec annotations override config file values. This allows you to:
- Define defaults in config file
- Override specific sections in spec
- Disable landing page per environment

## AI Content Generation

Use the `generate-landing-page-content` skill to automatically generate landing page content from your OpenAPI spec:

```bash
# In your AI assistant
"Generate landing page content for my OpenAPI spec"
```

The AI will analyze your:
- API title and description → Hero section
- Resources and operations → Features section
- Operation flow → How It Works section
- Common patterns → FAQ section

You can then customize the generated content to match your brand voice.

## Validation Rules

The annotation handler validates all configuration at build time:

**Required Fields:**
- `enabled` must be a boolean
- `sections` must be an object
- Each section must have an `enabled` boolean

**Type Validation:**
- Strings must be non-empty where required
- Arrays must contain valid objects
- CTAs must have both `text` and `url`
- Ratings must be 1-5 range

**Warnings (non-blocking):**
- Empty arrays (e.g., `features.items: []`)
- Ratings outside 1-5 range
- Unknown section types (preserved for extensibility)

## Best Practices

1. **Start Simple**: Begin with just hero and features sections, add more as needed
2. **Use AI Generation**: Let AI create initial content, then refine it
3. **Test CTAs**: Ensure all CTA URLs are correct and lead to the right pages
4. **Optimize Images**: Use optimized images for faster load times
5. **Mobile First**: Test on mobile devices - landing pages are often first viewed on mobile
6. **A/B Test**: Try different headlines and CTAs to optimize conversions
7. **Keep It Focused**: Don't enable all sections - choose what's most relevant for your audience

## Troubleshooting

**Landing page not appearing:**
- Check `enabled: true` is set
- Verify annotation is at document root level (not operation/field level)
- Check browser console for validation warnings

**Sections not rendering:**
- Verify each section has `enabled: true`
- Check for validation errors in build output
- Ensure required fields are present (e.g., CTA text and url)

**Styling issues:**
- Check `.uigen/theme.css` is loaded
- Inspect CSS classes in browser dev tools
- Verify custom styles don't conflict with theme

**Routing conflicts:**
- Landing page always takes precedence at `/`
- Dashboard automatically moves to `/dashboard`
- Check for custom route overrides in your code

## Related Annotations

- [`x-uigen-layout`](./x-uigen-layout.md) - Configure page layout and navigation
- [`x-uigen-label`](./x-uigen-label.md) - Customize field labels and descriptions
- [`x-uigen-profile`](./x-uigen-profile.md) - Configure user profile management

## See Also

- [Creating Landing Pages Tutorial](../guides/creating-landing-pages.md)
- [Styling UIGen Apps](../blog/customizing-your-theme.md)
- [Authentication Integration](../authentication/overview.md)
